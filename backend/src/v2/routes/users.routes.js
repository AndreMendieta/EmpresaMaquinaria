const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../../db/pool');
const auth = require('../middlewares/auth');
const requireRole = require('../middlewares/requireRole');
const {registrarAuditoria} = require('../utils/audit');

const router = express.Router();
router.use(auth);

router.get('/', requireRole('admin'), async (req, res) => {
  const {rows} = await pool.query(
    `SELECT id, empresa_prestadora_id, empresa_cliente_id, nombre_completo, correo, rol, activo, creado_en
     FROM usuarios_multiempresa WHERE empresa_prestadora_id = $1 ORDER BY creado_en DESC`,
    [req.user.service_company_id]
  );
  return res.json({ok: true, usuarios: rows});
});

router.post('/', requireRole('admin'), async (req, res) => {
  try {
    const {nombreCompleto, correo, password, rol = 'tecnico', empresaClienteId} = req.body;
    if (!nombreCompleto || !correo || !password) return res.status(400).json({error: 'nombreCompleto, correo y password son obligatorios'});
    if (!['admin', 'supervisor', 'tecnico'].includes(rol) || password.length < 6) return res.status(400).json({error: 'Rol o contraseña inválidos'});
    const passwordHash = await bcrypt.hash(password, 10);
    const {rows} = await pool.query(
      `INSERT INTO usuarios_multiempresa
       (empresa_prestadora_id, empresa_cliente_id, nombre_completo, correo, clave_hash, rol)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, empresa_prestadora_id, empresa_cliente_id, nombre_completo, correo, rol, activo`,
      [req.user.service_company_id, empresaClienteId || null, nombreCompleto.trim(), correo.trim().toLowerCase(), passwordHash, rol]
    );
    await registrarAuditoria({empresaPrestadoraId: req.user.service_company_id, usuarioId: req.user.id, accion: 'crear', entidad: 'usuario', entidadId: rows[0].id, detalle: {rol}});
    return res.status(201).json({ok: true, usuario: rows[0]});
  } catch (error) {
    console.error('Error creando usuario v2:', error);
    return res.status(500).json({error: 'No se pudo crear el usuario'});
  }
});

router.patch('/:id', requireRole('admin'), async (req, res) => {
  const updates = [];
  const values = [req.params.id, req.user.service_company_id];
  if (req.body.nombreCompleto !== undefined) { values.push(req.body.nombreCompleto); updates.push(`nombre_completo = $${values.length}`); }
  if (req.body.rol !== undefined && ['admin', 'supervisor', 'tecnico'].includes(req.body.rol)) { values.push(req.body.rol); updates.push(`rol = $${values.length}`); }
  if (req.body.activo !== undefined) { values.push(Boolean(req.body.activo)); updates.push(`activo = $${values.length}`); }
  if (!updates.length) return res.status(400).json({error: 'No hay campos válidos para actualizar'});
  updates.push('actualizado_en = NOW()');
  const {rows} = await pool.query(
    `UPDATE usuarios_multiempresa SET ${updates.join(', ')}
     WHERE id = $1 AND empresa_prestadora_id = $2
     RETURNING id, empresa_prestadora_id, empresa_cliente_id, nombre_completo, correo, rol, activo`, values
  );
  if (!rows.length) return res.status(404).json({error: 'Usuario no encontrado'});
  await registrarAuditoria({empresaPrestadoraId: req.user.service_company_id, usuarioId: req.user.id, accion: 'modificar', entidad: 'usuario', entidadId: rows[0].id, detalle: {campos: Object.keys(req.body)}});
  return res.json({ok: true, usuario: rows[0]});
});

module.exports = router;
