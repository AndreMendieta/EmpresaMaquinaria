const express = require('express');
const pool = require('../../db/pool');
const auth = require('../middlewares/auth');
const requireRole = require('../middlewares/requireRole');
const {registrarAuditoria} = require('../utils/audit');

const router = express.Router();
router.use(auth);

router.get('/', async (req, res) => {
  const {rows} = await pool.query(
    `SELECT * FROM empresas_clientes
     WHERE empresa_prestadora_id = $1 ORDER BY creado_en DESC`,
    [req.user.service_company_id]
  );
  return res.json({ok: true, empresas_clientes: rows});
});

router.post('/', requireRole('admin'), async (req, res) => {
  try {
    const {razonSocial, nombreComercial, identificacionFiscal, correo, telefono, direccion} = req.body;
    if (!razonSocial) return res.status(400).json({error: 'razonSocial es obligatorio'});
    const {rows} = await pool.query(
      `INSERT INTO empresas_clientes
        (empresa_prestadora_id, razon_social, nombre_comercial, identificacion_fiscal, correo, telefono, direccion)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [req.user.service_company_id, razonSocial.trim(), nombreComercial || null, identificacionFiscal || null, correo || null, telefono || null, direccion || null]
    );
    await registrarAuditoria({empresaPrestadoraId: req.user.service_company_id, usuarioId: req.user.id, accion: 'crear', entidad: 'empresa_cliente', entidadId: rows[0].id});
    return res.status(201).json({ok: true, empresa_cliente: rows[0]});
  } catch (error) {
    console.error('Error creando empresa cliente v2:', error);
    return res.status(500).json({error: 'No se pudo crear la empresa cliente'});
  }
});

router.patch('/:id', requireRole('admin'), async (req, res) => {
  try {
    const fields = {razonSocial: 'razon_social', nombreComercial: 'nombre_comercial', identificacionFiscal: 'identificacion_fiscal', correo: 'correo', telefono: 'telefono', direccion: 'direccion', activa: 'activa'};
    const updates = [];
    const values = [req.params.id, req.user.service_company_id];
    for (const [input, column] of Object.entries(fields)) {
      if (req.body[input] !== undefined) {
        values.push(req.body[input]);
        updates.push(`${column} = $${values.length}`);
      }
    }
    if (!updates.length) return res.status(400).json({error: 'No hay campos para actualizar'});
    updates.push('actualizado_en = NOW()');
    const {rows} = await pool.query(
      `UPDATE empresas_clientes SET ${updates.join(', ')}
       WHERE id = $1 AND empresa_prestadora_id = $2 RETURNING *`,
      values
    );
    if (!rows.length) return res.status(404).json({error: 'Empresa cliente no encontrada'});
    await registrarAuditoria({empresaPrestadoraId: req.user.service_company_id, usuarioId: req.user.id, accion: 'modificar', entidad: 'empresa_cliente', entidadId: rows[0].id, detalle: {campos: Object.keys(req.body)}});
    return res.json({ok: true, empresa_cliente: rows[0]});
  } catch (error) {
    console.error('Error actualizando empresa cliente v2:', error);
    return res.status(500).json({error: 'No se pudo actualizar la empresa cliente'});
  }
});

router.delete('/:id', requireRole('admin'), async (req, res) => {
  const {rows} = await pool.query(
    `UPDATE empresas_clientes SET activa = FALSE, actualizado_en = NOW()
     WHERE id = $1 AND empresa_prestadora_id = $2 RETURNING id`,
    [req.params.id, req.user.service_company_id]
  );
  if (!rows.length) return res.status(404).json({error: 'Empresa cliente no encontrada'});
  await registrarAuditoria({empresaPrestadoraId: req.user.service_company_id, usuarioId: req.user.id, accion: 'eliminar', entidad: 'empresa_cliente', entidadId: rows[0].id});
  return res.json({ok: true, message: 'Empresa cliente desactivada'});
});

module.exports = router;
