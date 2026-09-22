const express = require('express');
const pool = require('../../db/pool');
const auth = require('../middlewares/auth');
const requireRole = require('../middlewares/requireRole');
const requireCompanyScope = require('../middlewares/requireCompanyScope');
const {registrarAuditoria} = require('../utils/audit');

const router = express.Router();
router.use(auth);

router.get('/', async (req, res) => {
  const {rows} = await pool.query(
    `SELECT * FROM maquinarias_multiempresa
     WHERE empresa_prestadora_id = $1 ORDER BY creado_en DESC`,
    [req.user.service_company_id]
  );
  return res.json({ok: true, maquinarias: rows});
});

router.get('/:id', async (req, res) => {
  const {rows} = await pool.query(
    `SELECT * FROM maquinarias_multiempresa
     WHERE id = $1 AND empresa_prestadora_id = $2`,
    [req.params.id, req.user.service_company_id]
  );
  if (!rows.length) return res.status(404).json({error: 'Maquinaria no encontrada'});
  return res.json({ok: true, maquinaria: rows[0]});
});

router.post('/', requireRole('admin', 'supervisor', 'tecnico'), async (req, res) => {
  try {
    const {empresaClienteId, codigo, nombre, tipo, numeroSerie, urlManual, descripcion} = req.body;
    if (!codigo || !nombre || !tipo) return res.status(400).json({error: 'codigo, nombre y tipo son obligatorios'});
    const {rows} = await pool.query(
      `INSERT INTO maquinarias_multiempresa
       (empresa_prestadora_id, empresa_cliente_id, codigo, nombre, tipo, numero_serie, url_manual, descripcion, creado_por)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [req.user.service_company_id, empresaClienteId || null, codigo.trim(), nombre.trim(), tipo.trim(), numeroSerie || null, urlManual || null, descripcion || null, req.user.id]
    );
    await registrarAuditoria({empresaPrestadoraId: req.user.service_company_id, usuarioId: req.user.id, accion: 'crear', entidad: 'maquinaria', entidadId: rows[0].id});
    return res.status(201).json({ok: true, maquinaria: rows[0]});
  } catch (error) {
    console.error('Error creando maquinaria v2:', error);
    return res.status(500).json({error: 'No se pudo crear la maquinaria'});
  }
});

router.patch('/:id', requireRole('admin', 'supervisor'), requireCompanyScope('maquinaria_id'), async (req, res) => {
  const updates = [];
  const values = [req.params.id, req.user.service_company_id];
  const fields = {nombre: 'nombre', tipo: 'tipo', numeroSerie: 'numero_serie', urlManual: 'url_manual', descripcion: 'descripcion', estado: 'estado'};
  for (const [input, column] of Object.entries(fields)) {
    if (req.body[input] !== undefined) { values.push(req.body[input]); updates.push(`${column} = $${values.length}`); }
  }
  if (!updates.length) return res.status(400).json({error: 'No hay campos para actualizar'});
  updates.push('actualizado_en = NOW()');
  const {rows} = await pool.query(
    `UPDATE maquinarias_multiempresa SET ${updates.join(', ')}
     WHERE id = $1 AND empresa_prestadora_id = $2 RETURNING *`, values
  );
  if (!rows.length) return res.status(404).json({error: 'Maquinaria no encontrada'});
  await registrarAuditoria({empresaPrestadoraId: req.user.service_company_id, usuarioId: req.user.id, accion: 'modificar', entidad: 'maquinaria', entidadId: rows[0].id, detalle: {campos: Object.keys(req.body)}});
  return res.json({ok: true, maquinaria: rows[0]});
});

module.exports = router;
