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
    `SELECT * FROM ordenes_servicio WHERE empresa_prestadora_id = $1 ORDER BY creado_en DESC`,
    [req.user.service_company_id]
  );
  return res.json({ok: true, ordenes: rows});
});

router.post('/', requireRole('admin', 'supervisor'), async (req, res) => {
  try {
    const {empresaClienteId, maquinariaId, titulo, descripcion, prioridad = 'normal', asignadaA} = req.body;
    if (!titulo) return res.status(400).json({error: 'titulo es obligatorio'});
    const numeroOrden = `OT-${Date.now()}`;
    const {rows} = await pool.query(
      `INSERT INTO ordenes_servicio
       (empresa_prestadora_id, empresa_cliente_id, maquinaria_id, solicitada_por, asignada_a, numero_orden, titulo, descripcion, prioridad)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [req.user.service_company_id, empresaClienteId || null, maquinariaId || null, req.user.id, asignadaA || null, numeroOrden, titulo.trim(), descripcion || null, prioridad]
    );
    await registrarAuditoria({empresaPrestadoraId: req.user.service_company_id, usuarioId: req.user.id, accion: 'crear', entidad: 'orden', entidadId: rows[0].id});
    return res.status(201).json({ok: true, orden: rows[0]});
  } catch (error) {
    console.error('Error creando orden v2:', error);
    return res.status(500).json({error: 'No se pudo crear la orden'});
  }
});

router.patch('/:id/assign', requireRole('admin', 'supervisor'), requireCompanyScope('orden_id'), async (req, res) => {
  const {rows} = await pool.query(
    `UPDATE ordenes_servicio SET asignada_a = $1, estado = 'en_progreso', actualizado_en = NOW()
     WHERE id = $2 AND empresa_prestadora_id = $3 RETURNING *`,
    [req.body.usuarioId, req.params.id, req.user.service_company_id]
  );
  if (!rows.length) return res.status(404).json({error: 'Orden no encontrada'});
  await crearNotificacion({
    empresaPrestadoraId: req.user.service_company_id,
    usuarioId: req.body.usuarioId,
    ordenId: rows[0].id,
    titulo: 'Nueva orden asignada',
    mensaje: `La orden ${rows[0].numero_orden} fue asignada para atención.`,
  });
  await registrarAuditoria({empresaPrestadoraId: req.user.service_company_id, usuarioId: req.user.id, accion: 'modificar', entidad: 'orden', entidadId: rows[0].id, detalle: {asignadaA: req.body.usuarioId}});
  return res.json({ok: true, orden: rows[0]});
});

router.patch('/:id/progress', requireCompanyScope('orden_id'), async (req, res) => {
  const {estado} = req.body;
  if (!['en_progreso', 'completada'].includes(estado)) return res.status(400).json({error: 'Estado de avance inválido'});
  const {rows} = await pool.query(
    `UPDATE ordenes_servicio SET estado = $1, completada_en = CASE WHEN $1 = 'completada' THEN NOW() ELSE completada_en END, actualizado_en = NOW()
     WHERE id = $2 AND empresa_prestadora_id = $3 AND asignada_a = $4 RETURNING *`,
    [estado, req.params.id, req.user.service_company_id, req.user.id]
  );
  if (!rows.length) return res.status(403).json({error: 'Solo puedes actualizar órdenes asignadas a ti'});
  await registrarAuditoria({empresaPrestadoraId: req.user.service_company_id, usuarioId: req.user.id, accion: 'modificar', entidad: 'orden', entidadId: rows[0].id, detalle: {estado}});
  return res.json({ok: true, orden: rows[0]});
});

module.exports = router;
