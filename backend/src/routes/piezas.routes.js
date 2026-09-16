const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const pool = require('../db/pool');
const { verifyToken, requireRoles } = require('../middlewares/auth.middleware');
const { registrarAuditoria } = require('../utils/audit');

const router = express.Router();

const uploadDirectory = path.join(__dirname, '../../uploads/piezas');
fs.mkdirSync(uploadDirectory, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDirectory,
    filename: (req, file, callback) => {
      const extension = path.extname(file.originalname).toLowerCase();
      callback(null, `${crypto.randomUUID()}${extension}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, callback) => {
    if (!file.mimetype.startsWith('image/')) {
      return callback(new Error('Solo se permiten archivos de imagen.'));
    }
    callback(null, true);
  },
});

router.use(verifyToken);

/**
 * GET /api/piezas
 * Consulta piezas registradas, filtrando opcionalmente por máquina o búsqueda por texto.
 * Query params: ?maquinaId=1&query=manguera
 */
router.get('/', async (req, res) => {
  try {
    const { maquinaId, query } = req.query;
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(req.query.pageSize, 10) || 20, 1), 100);
    const offset = (page - 1) * pageSize;
    let sql = `
      SELECT p.id, p.maquina_id, p.codigo, p.nombre, p.tipo, p.medidas, p.descripcion,
             p.fotos, p.estado_validacion, p.creado_en,
             m.nombre AS maquina_nombre, m.codigo AS maquina_codigo,
             u.nombre AS creado_por_nombre
      FROM piezas p
      JOIN maquinarias m ON m.id = p.maquina_id
      LEFT JOIN usuarios u ON u.id = p.creado_por
      WHERE p.empresa_id = $1
    `;
    const params = [req.user.empresaId];

    if (maquinaId) {
      params.push(parseInt(maquinaId, 10));
      sql += ` AND p.maquina_id = $${params.length}`;
    }

    if (query && query.trim()) {
      params.push(`%${query.trim()}%`);
      sql += ` AND (p.nombre ILIKE $${params.length} OR p.codigo ILIKE $${params.length} OR p.tipo ILIKE $${params.length})`;
    }

    const countSql = sql.replace(
      /SELECT[\s\S]*?FROM piezas p/,
      'SELECT COUNT(*)::int AS total FROM piezas p'
    ).replace(/LEFT JOIN usuarios u ON u.id = p.creado_por\s*/, '');
    sql += ` ORDER BY p.creado_en DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;

    const [partsResult, countResult] = await Promise.all([
      pool.query(sql, [...params, pageSize, offset]),
      pool.query(countSql, params),
    ]);
    const total = countResult.rows[0].total;

    return res.json({
      ok: true,
      piezas: partsResult.rows,
      pagination: {page, pageSize, total, totalPages: Math.ceil(total / pageSize)},
    });
  } catch (error) {
    console.error('Error en GET /api/piezas:', error);
    return res.status(500).json({
      ok: false,
      message: 'Error al consultar las piezas.',
    });
  }
});

/**
 * GET /api/piezas/:id
 * Ficha completa de una pieza (HU-014 Criterio 3: Ficha completa sin duplicar).
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query(
      `SELECT p.id, p.maquina_id, p.codigo, p.nombre, p.tipo, p.medidas, p.descripcion,
              p.fotos, p.estado_validacion, p.creado_en,
              m.nombre AS maquina_nombre, m.codigo AS maquina_codigo, m.manual_url AS maquina_manual_url,
              u.nombre AS creado_por_nombre
       FROM piezas p
       JOIN maquinarias m ON m.id = p.maquina_id
       LEFT JOIN usuarios u ON u.id = p.creado_por
       WHERE p.id = $1 AND p.empresa_id = $2`,
      [id, req.user.empresaId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        ok: false,
        message: 'Pieza no encontrada en esta empresa.',
      });
    }

    return res.json({
      ok: true,
      pieza: rows[0],
    });
  } catch (error) {
    console.error('Error en GET /api/piezas/:id:', error);
    return res.status(500).json({
      ok: false,
      message: 'Error al consultar el detalle de la pieza.',
    });
  }
});

/**
 * POST /api/piezas (HU-014 - Registro de pieza sobre máquina autorizada)
 * Accesible para: técnico, supervisor, admin.
 * Body: { maquinaId, codigo, nombre, tipo, medidas, descripcion, fotos }
 */
router.post('/', async (req, res) => {
  const client = await pool.connect();
  try {
    const { maquinaId, codigo, nombre, tipo, medidas = {}, descripcion, fotos = [] } = req.body;

    if (!maquinaId || !codigo || !nombre || !tipo) {
      return res.status(400).json({
        ok: false,
        message: 'La máquina, el código, el nombre y el tipo de componente son obligatorios.',
      });
    }

    const cleanCodigo = codigo.trim().toUpperCase();
    const cleanNombre = nombre.trim();
    const cleanTipo = tipo.trim();

    // 1. Validar que la máquina exista y pertenezca a la empresa del usuario
    const maquinaResult = await client.query(
      'SELECT id, nombre, codigo FROM maquinarias WHERE id = $1 AND empresa_id = $2 LIMIT 1',
      [maquinaId, req.user.empresaId]
    );

    if (maquinaResult.rows.length === 0) {
      return res.status(404).json({
        ok: false,
        message: 'La máquina seleccionada no existe o no está registrada por un supervisor en tu empresa.',
      });
    }

    const maquina = maquinaResult.rows[0];

    // 2. HU-014 Criterio 3: Evitar registros duplicados con mismo código en esa máquina
    const existingPart = await client.query(
      'SELECT id, nombre, codigo FROM piezas WHERE maquina_id = $1 AND UPPER(codigo) = $2 LIMIT 1',
      [maquina.id, cleanCodigo]
    );

    if (existingPart.rows.length > 0) {
      return res.status(409).json({
        ok: false,
        piezaExistenteId: existingPart.rows[0].id,
        message: `Ya existe una pieza documentada con el código "${cleanCodigo}" en esta máquina (${existingPart.rows[0].nombre}). Puedes consultar su ficha existente.`,
      });
    }

    await client.query('BEGIN');

    // 3. Insertar la pieza vinculada a la máquina
    const insertPiezaResult = await client.query(
      `INSERT INTO piezas (empresa_id, maquina_id, codigo, nombre, tipo, medidas, descripcion, fotos, creado_por)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, maquina_id, codigo, nombre, tipo, medidas, descripcion, fotos, estado_validacion, creado_en`,
      [
        req.user.empresaId,
        maquina.id,
        cleanCodigo,
        cleanNombre,
        cleanTipo,
        typeof medidas === 'object' ? JSON.stringify(medidas) : medidas,
        descripcion ? descripcion.trim() : null,
        Array.isArray(fotos) ? fotos : [],
        req.user.userId,
      ]
    );

    const nuevaPieza = insertPiezaResult.rows[0];

    // 4. HU-014 Criterio 1: Notificar automáticamente al supervisor correspondiente
    const notificacionMensaje = `Nueva pieza registrada: "${nuevaPieza.nombre}" (${nuevaPieza.codigo}) en equipo "${maquina.nombre}". Pendiente de revisión técnica.`;
    await client.query(
      `INSERT INTO notificaciones_supervisor (empresa_id, pieza_id, tecnico_id, mensaje)
       VALUES ($1, $2, $3, $4)`,
      [req.user.empresaId, nuevaPieza.id, req.user.userId, notificacionMensaje]
    );

    await registrarAuditoria(client, {
      empresaId: req.user.empresaId,
      usuarioId: req.user.userId,
      accion: 'crear',
      entidad: 'pieza',
      entidadId: nuevaPieza.id,
      detalle: { codigo: nuevaPieza.codigo, maquinaId: nuevaPieza.maquina_id },
    });

    await client.query('COMMIT');

    return res.status(201).json({
      ok: true,
      message: 'Ficha de pieza guardada con éxito y vinculada a la máquina. Se notificó al supervisor para su validación.',
      pieza: {
        ...nuevaPieza,
        maquina_nombre: maquina.nombre,
        maquina_codigo: maquina.codigo,
      },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error en POST /api/piezas:', error);
    return res.status(500).json({
      ok: false,
      message: 'Error al registrar la ficha de pieza.',
    });
  } finally {
    client.release();
  }
});

/**
 * POST /api/piezas/:id/fotos
 * Recibe una imagen en el campo multipart "foto" y la agrega a la ficha.
 */
router.post('/:id/fotos', upload.single('foto'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ ok: false, message: 'Debes adjuntar una imagen en el campo "foto".' });
    }

    const piezaResult = await pool.query(
      'SELECT id FROM piezas WHERE id = $1 AND empresa_id = $2 LIMIT 1',
      [req.params.id, req.user.empresaId]
    );

    if (piezaResult.rows.length === 0) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ ok: false, message: 'Pieza no encontrada en esta empresa.' });
    }

    const fotoUrl = `/uploads/piezas/${req.file.filename}`;
    const updateResult = await pool.query(
      `UPDATE piezas
       SET fotos = array_append(COALESCE(fotos, ARRAY[]::TEXT[]), $1)
       WHERE id = $2 AND empresa_id = $3
       RETURNING id, fotos`,
      [fotoUrl, req.params.id, req.user.empresaId]
    );

    await registrarAuditoria(pool, {
      empresaId: req.user.empresaId,
      usuarioId: req.user.userId,
      accion: 'modificar',
      entidad: 'pieza',
      entidadId: req.params.id,
      detalle: { fotoAgregada: fotoUrl },
    });

    return res.status(201).json({
      ok: true,
      message: 'Foto cargada correctamente.',
      fotoUrl,
      fotos: updateResult.rows[0].fotos,
    });
  } catch (error) {
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    console.error('Error en POST /api/piezas/:id/fotos:', error);
    return res.status(500).json({ ok: false, message: 'Error al cargar la foto.' });
  }
});

/**
 * PATCH /api/piezas/:id/validar
 * Validación de pieza por el Supervisor o Administrador.
 * Permitido exclusivamente para: supervisor, admin.
 */
router.patch('/:id/validar', requireRoles('supervisor', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    if (!['validada', 'rechazada'].includes(estado)) {
      return res.status(400).json({
        ok: false,
        message: 'El estado de validación debe ser "validada" o "rechazada".',
      });
    }

    const updateResult = await pool.query(
      `UPDATE piezas
       SET estado_validacion = $1
       WHERE id = $2 AND empresa_id = $3
       RETURNING id, codigo, nombre, estado_validacion`,
      [estado, id, req.user.empresaId]
    );

    if (updateResult.rows.length === 0) {
      return res.status(404).json({
        ok: false,
        message: 'Pieza no encontrada en esta empresa.',
      });
    }

    await registrarAuditoria(pool, {
      empresaId: req.user.empresaId,
      usuarioId: req.user.userId,
      accion: 'modificar',
      entidad: 'pieza',
      entidadId: updateResult.rows[0].id,
      detalle: { estadoValidacion: estado },
    });

    return res.json({
      ok: true,
      message: `Pieza ${estado === 'validada' ? 'aprobada y validada' : 'marcada como rechazada'} exitosamente.`,
      pieza: updateResult.rows[0],
    });
  } catch (error) {
    console.error('Error en PATCH /api/piezas/:id/validar:', error);
    return res.status(500).json({
      ok: false,
      message: 'Error al actualizar el estado de validación de la pieza.',
    });
  }
});

module.exports = router;
