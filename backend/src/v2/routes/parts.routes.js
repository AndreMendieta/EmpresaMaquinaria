const express = require('express');
const pool = require('../../db/pool');
const auth = require('../middlewares/auth');
const requireRole = require('../middlewares/requireRole');
const requireCompanyScope = require('../middlewares/requireCompanyScope');
const {registrarAuditoria} = require('../utils/audit');
const {crearNotificacion} = require('../utils/notifications');

const router = express.Router();
router.use(auth);

router.get('/', async (req, res) => {
  const {rows} = await pool.query(
    `SELECT * FROM piezas_multiempresa
     WHERE empresa_prestadora_id = $1 ORDER BY creado_en DESC`,
    [req.user.service_company_id]
  );
  return res.json({ok: true, piezas: rows});
});

router.post('/', async (req, res) => {
  const client = await pool.connect();
  try {
    const {maquinariaId, codigo, nombre, tipo, descripcion, fotos = [], subtipo = {}} = req.body;
    if (!maquinariaId || !codigo || !nombre || !tipo) return res.status(400).json({error: 'maquinariaId, codigo, nombre y tipo son obligatorios'});
    if (!['manguera', 'torno', 'cilindro'].includes(tipo)) return res.status(400).json({error: 'Tipo de pieza inválido'});

    await client.query('BEGIN');
    const machine = await client.query(
      `SELECT id FROM maquinarias_multiempresa WHERE id = $1 AND empresa_prestadora_id = $2`,
      [maquinariaId, req.user.service_company_id]
    );
    if (!machine.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({error: 'Maquinaria no encontrada en la empresa'});
    }

    const part = await client.query(
      `INSERT INTO piezas_multiempresa
       (empresa_prestadora_id, maquinaria_id, codigo, nombre, tipo, descripcion, fotos, estado_validacion, creado_por)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'borrador',$8) RETURNING *`,
      [req.user.service_company_id, maquinariaId, codigo.trim(), nombre.trim(), tipo, descripcion || null, Array.isArray(fotos) ? fotos : [], req.user.id]
    );
    const pieza = part.rows[0];

    const subtypeTables = {manguera: 'piezas_manguera', torno: 'piezas_torno', cilindro: 'piezas_cilindro'};
    const subtypeColumns = {
      manguera: ['diametro_interior', 'diametro_exterior', 'longitud', 'presion_trabajo', 'tipo_conexion', 'material'],
      torno: ['diametro', 'longitud', 'rosca', 'material', 'tolerancia'],
      cilindro: ['diametro_camisa', 'diametro_vastago', 'carrera', 'presion_trabajo', 'tipo_sello'],
    };
    const columns = subtypeColumns[tipo];
    const values = [pieza.id, req.user.service_company_id, ...columns.map((column) => subtipo[column] || null)];
    const placeholders = values.map((_, index) => `$${index + 1}`).join(',');
    await client.query(
      `INSERT INTO ${subtypeTables[tipo]} (pieza_id, empresa_prestadora_id, ${columns.join(', ')}) VALUES (${placeholders})`,
      values
    );
    await client.query('COMMIT');

    await registrarAuditoria({empresaPrestadoraId: req.user.service_company_id, usuarioId: req.user.id, accion: 'crear', entidad: 'pieza', entidadId: pieza.id, detalle: {tipo, estado: 'borrador'}});
    return res.status(201).json({ok: true, pieza});
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creando pieza v2:', error);
    return res.status(500).json({error: 'No se pudo crear la pieza'});
  } finally {
    client.release();
  }
});

router.patch('/:id/submit', requireCompanyScope('pieza_id'), async (req, res) => {
  const {rows} = await pool.query(
    `UPDATE piezas_multiempresa SET estado_validacion = 'pendiente', actualizado_en = NOW()
     WHERE id = $1 AND empresa_prestadora_id = $2 AND creado_por = $3 AND estado_validacion = 'borrador'
     RETURNING *`,
    [req.params.id, req.user.service_company_id, req.user.id]
  );
  if (!rows.length) return res.status(404).json({error: 'Pieza borrador no encontrada o no pertenece al usuario'});
  await registrarAuditoria({empresaPrestadoraId: req.user.service_company_id, usuarioId: req.user.id, accion: 'modificar', entidad: 'pieza', entidadId: rows[0].id, detalle: {estado: 'pendiente'}});
  return res.json({ok: true, pieza: rows[0]});
});

async function resolverPieza(req, res, estado) {
  const {rows} = await pool.query(
    `UPDATE piezas_multiempresa SET estado_validacion = $1, actualizado_en = NOW()
     WHERE id = $2 AND empresa_prestadora_id = $3 AND creado_por <> $4 AND estado_validacion = 'pendiente'
     RETURNING *`,
    [estado, req.params.id, req.user.service_company_id, req.user.id]
  );
  if (!rows.length) return res.status(403).json({error: 'No puedes resolver tu propia pieza o la pieza no está pendiente'});
  await crearNotificacion({
    empresaPrestadoraId: req.user.service_company_id,
    usuarioId: rows[0].creado_por,
    piezaId: rows[0].id,
    titulo: estado === 'validada' ? 'Pieza aprobada' : 'Pieza devuelta',
    mensaje: `La pieza ${rows[0].codigo} fue ${estado === 'validada' ? 'aprobada' : 'rechazada'} por un supervisor.`,
  });
  await registrarAuditoria({empresaPrestadoraId: req.user.service_company_id, usuarioId: req.user.id, accion: 'modificar', entidad: 'pieza', entidadId: rows[0].id, detalle: {estado: estado === 'validada' ? 'aprobada' : 'rechazada'}});
  return res.json({ok: true, pieza: rows[0]});
}

router.post('/:id/approve', requireRole('admin', 'supervisor'), requireCompanyScope('pieza_id'), (req, res) => resolverPieza(req, res, 'validada'));
router.post('/:id/reject', requireRole('admin', 'supervisor'), requireCompanyScope('pieza_id'), (req, res) => resolverPieza(req, res, 'rechazada'));

module.exports = router;
