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
      manguera: ['diametro', 'longitud', 'presion', 'terminales', 'evidencia', 'adicionales'],
      torno: ['diametro', 'longitud', 'material', 'rosca', 'planos', 'evidencia', 'adicionales'],
      cilindro: ['camisa', 'vastago', 'medida_tapa', 'medida_piston', 'empaques', 'ojo', 'pasadores', 'recorrido_salida', 'racores_llenado', 'presion_trabajo', 'adicionales'],
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

router.patch('/:id', requireRole('admin', 'supervisor'), requireCompanyScope('pieza_id'), async (req, res) => {
  const client = await pool.connect();
  try {
    const {nombre, descripcion, fotos, subtipo = {}} = req.body;
    await client.query('BEGIN');
    const current = await client.query(
      `SELECT id, tipo FROM piezas_multiempresa
       WHERE id = $1 AND empresa_prestadora_id = $2`,
      [req.params.id, req.user.service_company_id]
    );
    if (!current.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({error: 'Pieza no encontrada'});
    }

    const updates = [];
    const values = [req.params.id, req.user.service_company_id];
    if (nombre !== undefined) { values.push(nombre.trim()); updates.push(`nombre = $${values.length}`); }
    if (descripcion !== undefined) { values.push(descripcion || null); updates.push(`descripcion = $${values.length}`); }
    if (fotos !== undefined) { values.push(Array.isArray(fotos) ? fotos : []); updates.push(`fotos = $${values.length}`); }
    updates.push('actualizado_en = NOW()');
    const piece = await client.query(
      `UPDATE piezas_multiempresa SET ${updates.join(', ')}
       WHERE id = $1 AND empresa_prestadora_id = $2 RETURNING *`,
      values
    );

    const subtypeTables = {manguera: 'piezas_manguera', torno: 'piezas_torno', cilindro: 'piezas_cilindro'};
    const subtypeColumns = {
      manguera: ['diametro', 'longitud', 'presion', 'terminales', 'evidencia', 'adicionales'],
      torno: ['diametro', 'longitud', 'material', 'rosca', 'planos', 'evidencia', 'adicionales'],
      cilindro: ['camisa', 'vastago', 'medida_tapa', 'medida_piston', 'empaques', 'ojo', 'pasadores', 'recorrido_salida', 'racores_llenado', 'presion_trabajo', 'adicionales'],
    };
    const type = current.rows[0].tipo;
    const subtypeUpdates = [];
    const subtypeValues = [req.params.id, req.user.service_company_id];
    for (const column of subtypeColumns[type]) {
      if (subtipo[column] !== undefined) {
        subtypeValues.push(subtipo[column] || null);
        subtypeUpdates.push(`${column} = $${subtypeValues.length}`);
      }
    }
    if (subtypeUpdates.length) {
      await client.query(
        `UPDATE ${subtypeTables[type]} SET ${subtypeUpdates.join(', ')}
         WHERE pieza_id = $1 AND empresa_prestadora_id = $2`,
        subtypeValues
      );
    }
    await client.query('COMMIT');
    await registrarAuditoria({
      empresaPrestadoraId: req.user.service_company_id,
      usuarioId: req.user.id,
      accion: 'modificar',
      entidad: 'pieza',
      entidadId: piece.rows[0].id,
      detalle: {campos: Object.keys(req.body)},
    });
    return res.json({ok: true, pieza: piece.rows[0]});
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error modificando pieza v2:', error);
    return res.status(500).json({error: 'No se pudo modificar la pieza'});
  } finally {
    client.release();
  }
});

router.delete('/:id', requireRole('admin', 'supervisor'), requireCompanyScope('pieza_id'), async (req, res) => {
  const {rows} = await pool.query(
    `DELETE FROM piezas_multiempresa
     WHERE id = $1 AND empresa_prestadora_id = $2 RETURNING id`,
    [req.params.id, req.user.service_company_id]
  );
  if (!rows.length) return res.status(404).json({error: 'Pieza no encontrada'});
  await registrarAuditoria({empresaPrestadoraId: req.user.service_company_id, usuarioId: req.user.id, accion: 'eliminar', entidad: 'pieza', entidadId: rows[0].id});
  return res.json({ok: true, message: 'Pieza eliminada'});
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
