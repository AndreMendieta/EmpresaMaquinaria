const express = require('express');
const pool = require('../db/pool');
const { verifyToken, requireRoles } = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(verifyToken);

/**
 * GET /api/maquinas
 * Permite buscar y listar máquinas registradas en la empresa del usuario.
 * Accesible para: técnico, supervisor, admin (HU-014 / HU-015).
 * Query params opcionales: ?query=excavadora
 */
router.get('/', async (req, res) => {
  try {
    const { query } = req.query;
    let sql = `
      SELECT m.id, m.codigo, m.nombre, m.tipo, m.manual_url, m.descripcion,
             m.creado_en, u.nombre AS creado_por_nombre,
             (SELECT COUNT(*) FROM piezas p WHERE p.maquina_id = m.id)::int AS total_piezas
      FROM maquinarias m
      LEFT JOIN usuarios u ON u.id = m.creado_por
      WHERE m.empresa_id = $1
    `;
    const params = [req.user.empresaId];

    if (query && query.trim()) {
      params.push(`%${query.trim()}%`);
      sql += ` AND (m.nombre ILIKE $${params.length} OR m.codigo ILIKE $${params.length} OR m.tipo ILIKE $${params.length})`;
    }

    sql += ' ORDER BY m.creado_en DESC';

    const { rows } = await pool.query(sql, params);

    return res.json({
      ok: true,
      maquinas: rows,
    });
  } catch (error) {
    console.error('Error en GET /api/maquinas:', error);
    return res.status(500).json({
      ok: false,
      message: 'Error al consultar las máquinas.',
    });
  }
});

/**
 * GET /api/maquinas/:id
 * Consulta el detalle de una máquina específica y su manual técnico.
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query(
      `SELECT m.id, m.codigo, m.nombre, m.tipo, m.manual_url, m.descripcion,
              m.creado_en, u.nombre AS creado_por_nombre
       FROM maquinarias m
       LEFT JOIN usuarios u ON u.id = m.creado_por
       WHERE m.id = $1 AND m.empresa_id = $2`,
      [id, req.user.empresaId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        ok: false,
        message: 'Máquina no encontrada en esta empresa.',
      });
    }

    return res.json({
      ok: true,
      maquina: rows[0],
    });
  } catch (error) {
    console.error('Error en GET /api/maquinas/:id:', error);
    return res.status(500).json({
      ok: false,
      message: 'Error al consultar la máquina.',
    });
  }
});

/**
 * POST /api/maquinas (HU-015 - Registro de Maquinaria)
 * Exclusivo para: supervisor, admin.
 * Body: { codigo, nombre, tipo, manualUrl, descripcion, confirmarDuplicado }
 */
router.post('/', requireRoles('supervisor', 'admin'), async (req, res) => {
  try {
    const { codigo, nombre, tipo, manualUrl, descripcion, confirmarDuplicado = false } = req.body;

    if (!codigo || !nombre || !tipo) {
      return res.status(400).json({
        ok: false,
        message: 'El código, nombre y tipo de maquinaria son obligatorios.',
      });
    }

    const cleanCodigo = codigo.trim().toUpperCase();
    const cleanNombre = nombre.trim();
    const cleanTipo = tipo.trim();

    // 1. Validar código único dentro de la misma empresa
    const existingCode = await pool.query(
      'SELECT id FROM maquinarias WHERE empresa_id = $1 AND UPPER(codigo) = $2 LIMIT 1',
      [req.user.empresaId, cleanCodigo]
    );

    if (existingCode.rows.length > 0) {
      return res.status(400).json({
        ok: false,
        message: `Ya existe una máquina registrada con el código "${cleanCodigo}".`,
      });
    }

    // 2. HU-015 Criterio 2: Advertencia de máquina duplicada por nombre
    if (!confirmarDuplicado) {
      const existingName = await pool.query(
        'SELECT id, nombre, codigo FROM maquinarias WHERE empresa_id = $1 AND LOWER(nombre) = LOWER($2) LIMIT 1',
        [req.user.empresaId, cleanNombre]
      );

      if (existingName.rows.length > 0) {
        return res.status(409).json({
          ok: false,
          advertenciaDuplicado: true,
          message: `Ya existe una máquina registrada con el nombre "${cleanNombre}" (Código: ${existingName.rows[0].codigo}). Confirma si realmente es una máquina distinta.`,
        });
      }
    }

    // 3. Inserción de la máquina
    const insertResult = await pool.query(
      `INSERT INTO maquinarias (empresa_id, codigo, nombre, tipo, manual_url, descripcion, creado_por)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, codigo, nombre, tipo, manual_url, descripcion, creado_en`,
      [
        req.user.empresaId,
        cleanCodigo,
        cleanNombre,
        cleanTipo,
        manualUrl ? manualUrl.trim() : null,
        descripcion ? descripcion.trim() : null,
        req.user.userId,
      ]
    );

    return res.status(201).json({
      ok: true,
      message: 'Máquina registrada exitosamente y disponible para los técnicos.',
      maquina: insertResult.rows[0],
    });
  } catch (error) {
    console.error('Error en POST /api/maquinas:', error);
    return res.status(500).json({
      ok: false,
      message: 'Error al registrar la maquinaria.',
    });
  }
});

module.exports = router;
