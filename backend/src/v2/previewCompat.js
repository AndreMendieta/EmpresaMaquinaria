const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db/pool');
const auth = require('./middlewares/auth');
const requireRole = require('./middlewares/requireRole');
const {registrarAuditoria} = require('./utils/audit');

const router = express.Router();

function tokenFor(user) {
  return jwt.sign(
    {user_id: user.id, service_company_id: user.empresa_prestadora_id, role: user.rol},
    process.env.JWT_SECRET,
    {expiresIn: '8h'}
  );
}

router.post('/auth/login', async (req, res) => {
  try {
    const {companyCode, email, password} = req.body;
    const result = await pool.query(
      `SELECT u.id, u.empresa_prestadora_id, u.nombre_completo, u.correo, u.clave_hash, u.rol, u.activo,
              e.nombre_comercial AS codigo_empresa, e.razon_social AS nombre_empresa
       FROM usuarios_multiempresa u
       JOIN empresas_prestadoras e ON e.id = u.empresa_prestadora_id
       WHERE (e.nombre_comercial = $1 OR e.id::text = $1) AND LOWER(u.correo) = LOWER($2)
       LIMIT 1`,
      [String(companyCode || '').trim(), String(email || '').trim()]
    );
    const user = result.rows[0];
    if (!user || !user.activo || !(await bcrypt.compare(password || '', user.clave_hash))) {
      return res.status(401).json({message: 'Credenciales inválidas.'});
    }
    return res.json({
      ok: true,
      token: tokenFor(user),
      usuario: {
        id: user.id,
        nombre: user.nombre_completo,
        email: user.correo,
        rol: user.rol,
        empresa: {codigo: user.codigo_empresa, nombre: user.nombre_empresa},
      },
    });
  } catch (error) {
    console.error('Error en compatibilidad de login del preview:', error);
    return res.status(500).json({message: 'No se pudo iniciar sesión.'});
  }
});

router.post('/auth/register-company', async (req, res) => {
  const client = await pool.connect();
  try {
    const {companyCode, companyName, userName, email, password} = req.body;
    if (!companyCode || !companyName || !userName || !email || !password || password.length < 6) {
      return res.status(400).json({message: 'Completa todos los campos y usa una contraseña de mínimo 6 caracteres.'});
    }
    await client.query('BEGIN');
    const company = await client.query(
      `INSERT INTO empresas_prestadoras (razon_social, nombre_comercial)
       VALUES ($1, $2) RETURNING id, razon_social, nombre_comercial`,
      [companyName.trim(), companyCode.trim().toUpperCase()]
    );
    const hash = await bcrypt.hash(password, 10);
    const user = await client.query(
      `INSERT INTO usuarios_multiempresa
        (empresa_prestadora_id, nombre_completo, correo, clave_hash, rol)
       VALUES ($1, $2, LOWER($3), $4, 'admin')
       RETURNING id, empresa_prestadora_id, nombre_completo, correo, rol`,
      [company.rows[0].id, userName.trim(), email.trim(), hash]
    );
    await client.query('COMMIT');
    const createdUser = user.rows[0];
    return res.status(201).json({
      ok: true,
      token: tokenFor(createdUser),
      usuario: {
        id: createdUser.id,
        nombre: createdUser.nombre_completo,
        email: createdUser.correo,
        rol: createdUser.rol,
        empresa: {codigo: company.rows[0].nombre_comercial, nombre: company.rows[0].razon_social},
      },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.code === '23505') return res.status(400).json({message: 'El código de empresa o correo ya existe.'});
    console.error('Error registrando empresa desde preview:', error);
    return res.status(500).json({message: 'No se pudo registrar la empresa.'});
  } finally {
    client.release();
  }
});

router.use(auth);

router.get('/maquinas', async (req, res) => {
  const {rows} = await pool.query(
    `SELECT m.*, m.id::text AS id, m.id::text AS legacy_id
     FROM maquinarias_multiempresa m
     WHERE m.empresa_prestadora_id = $1
     ORDER BY m.creado_en DESC`,
    [req.user.service_company_id]
  );
  return res.json({ok: true, maquinas: rows});
});

router.post('/maquinas', requireRole('admin', 'supervisor'), async (req, res) => {
  const {codigo, nombre, tipo, manualUrl, descripcion, empresaClienteId} = req.body;
  if (!codigo || !nombre || !tipo) return res.status(400).json({message: 'El código, nombre y tipo son obligatorios.'});
  if (empresaClienteId) {
    const clientCompany = await pool.query('SELECT id FROM empresas_clientes WHERE id = $1 AND empresa_prestadora_id = $2 AND activa = TRUE', [empresaClienteId, req.user.service_company_id]);
    if (!clientCompany.rows.length) return res.status(400).json({message: 'La empresa cliente no existe o no está activa.'});
  }
  const {rows} = await pool.query(
    `INSERT INTO maquinarias_multiempresa
      (empresa_prestadora_id, empresa_cliente_id, codigo, nombre, tipo, url_manual, descripcion, creado_por)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [req.user.service_company_id, empresaClienteId || null, codigo.trim().toUpperCase(), nombre.trim(), tipo.trim(), manualUrl || null, descripcion || null, req.user.id]
  );
  return res.status(201).json({ok: true, maquinaria: rows[0]});
});

router.patch('/maquinas/:id', requireRole('admin', 'supervisor'), async (req, res) => {
  const fields = {nombre: 'nombre', tipo: 'tipo', numeroSerie: 'numero_serie', manualUrl: 'url_manual', descripcion: 'descripcion', estado: 'estado'};
  const updates = [];
  const values = [req.params.id, req.user.service_company_id];
  for (const [input, column] of Object.entries(fields)) {
    if (req.body[input] !== undefined) {
      values.push(req.body[input]);
      updates.push(`${column} = $${values.length}`);
    }
  }
  if (!updates.length) return res.status(400).json({message: 'No hay campos para modificar.'});
  updates.push('actualizado_en = NOW()');
  const {rows} = await pool.query(`UPDATE maquinarias_multiempresa SET ${updates.join(', ')} WHERE id = $1 AND empresa_prestadora_id = $2 RETURNING *`, values);
  if (!rows.length) return res.status(404).json({message: 'Máquina no encontrada.'});
  await registrarAuditoria({empresaPrestadoraId: req.user.service_company_id, usuarioId: req.user.id, accion: 'modificar', entidad: 'maquinaria', entidadId: rows[0].id, detalle: {campos: Object.keys(req.body)}});
  return res.json({ok: true, maquinaria: rows[0]});
});

router.delete('/maquinas/:id', requireRole('admin', 'supervisor'), async (req, res) => {
  const {rows} = await pool.query(`UPDATE maquinarias_multiempresa SET estado = 'inactiva', actualizado_en = NOW() WHERE id = $1 AND empresa_prestadora_id = $2 RETURNING *`, [req.params.id, req.user.service_company_id]);
  if (!rows.length) return res.status(404).json({message: 'Máquina no encontrada.'});
  await registrarAuditoria({empresaPrestadoraId: req.user.service_company_id, usuarioId: req.user.id, accion: 'eliminar', entidad: 'maquinaria', entidadId: rows[0].id});
  return res.json({ok: true, maquinaria: rows[0]});
});

router.get('/piezas', async (req, res) => {
  const params = [req.user.service_company_id];
  let where = 'WHERE p.empresa_prestadora_id = $1';
  if (req.query.maquinaId) {
    params.push(req.query.maquinaId);
    where += ` AND p.maquinaria_id = $${params.length}`;
  }
  if (req.query.query) {
    params.push(`%${req.query.query}%`);
    where += ` AND (p.nombre ILIKE $${params.length} OR p.codigo ILIKE $${params.length} OR p.tipo ILIKE $${params.length})`;
  }
  const {rows} = await pool.query(
    `SELECT p.*, p.maquinaria_id AS maquina_id, m.nombre AS maquina_nombre, m.codigo AS maquina_codigo
     FROM piezas_multiempresa p JOIN maquinarias_multiempresa m ON m.id = p.maquinaria_id
     ${where} ORDER BY p.creado_en DESC`,
    params
  );
  return res.json({ok: true, piezas: rows});
});

router.get('/piezas/:id', async (req, res) => {
  const {rows} = await pool.query(
    `SELECT p.*, p.maquinaria_id AS maquina_id, m.nombre AS maquina_nombre, m.codigo AS maquina_codigo
     FROM piezas_multiempresa p JOIN maquinarias_multiempresa m ON m.id = p.maquinaria_id
     WHERE p.id = $1 AND p.empresa_prestadora_id = $2`,
    [req.params.id, req.user.service_company_id]
  );
  if (!rows.length) return res.status(404).json({message: 'Pieza no encontrada.'});
  return res.json({ok: true, pieza: rows[0]});
});

router.post('/piezas', async (req, res) => {
  const {maquinaId, codigo, nombre, tipo, medidas = {}, descripcion, fotos = []} = req.body;
  const normalizedType = String(tipo || '').toLowerCase().includes('torno') ? 'torno' : String(tipo || '').toLowerCase().includes('cilindro') ? 'cilindro' : 'manguera';
  if (!maquinaId || !codigo || !nombre) return res.status(400).json({message: 'La máquina, código y nombre son obligatorios.'});
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const machine = await client.query('SELECT id FROM maquinarias_multiempresa WHERE id = $1 AND empresa_prestadora_id = $2', [maquinaId, req.user.service_company_id]);
    if (!machine.rows.length) return res.status(404).json({message: 'Máquina no encontrada.'});
    const inserted = await client.query(
      `INSERT INTO piezas_multiempresa (empresa_prestadora_id, maquinaria_id, codigo, nombre, tipo, descripcion, fotos, creado_por)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [req.user.service_company_id, maquinaId, codigo.trim().toUpperCase(), nombre.trim(), normalizedType, descripcion || null, Array.isArray(fotos) ? fotos : [], req.user.id]
    );
    const piece = inserted.rows[0];
    const m = (key, fallback) => medidas[key] ?? (fallback ? medidas[fallback] : null) ?? null;
    if (normalizedType === 'manguera') {
      await client.query('INSERT INTO piezas_manguera (pieza_id, empresa_prestadora_id, diametro, longitud, presion, terminales, evidencia, adicionales) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)', [piece.id, req.user.service_company_id, m('diametro'), m('longitud'), m('presion'), m('terminales'), m('evidencia'), m('adicionales')]);
    } else if (normalizedType === 'torno') {
      await client.query('INSERT INTO piezas_torno (pieza_id, empresa_prestadora_id, diametro, longitud, material, rosca, planos, evidencia, adicionales) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)', [piece.id, req.user.service_company_id, m('diametro'), m('longitud'), m('material'), m('rosca'), m('planos'), m('evidencia'), m('adicionales')]);
    } else {
      await client.query('INSERT INTO piezas_cilindro (pieza_id, empresa_prestadora_id, camisa, vastago, medida_tapa, medida_piston, empaques, ojo, pasadores, recorrido_salida, racores_llenado, adicionales) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)', [piece.id, req.user.service_company_id, m('camisa'), m('vastago'), m('tapa'), m('piston'), m('empaques'), m('ojo'), m('pasadores'), m('recorrido_salida'), m('racores_llenado'), m('adicionales')]);
    }
    await client.query('COMMIT');
    return res.status(201).json({ok: true, pieza: piece});
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.code === '23505') return res.status(409).json({message: 'Ya existe una pieza con ese código en esta máquina.'});
    console.error('Error creando pieza desde preview:', error);
    return res.status(500).json({message: 'No se pudo crear la pieza.'});
  } finally {
    client.release();
  }
});

router.patch('/piezas/:id', requireRole('admin', 'supervisor'), async (req, res) => {
  const {nombre, descripcion, fotos, medidas = {}} = req.body;
  const updates = [];
  const values = [req.params.id, req.user.service_company_id];
  if (nombre !== undefined) { values.push(nombre.trim()); updates.push(`nombre = $${values.length}`); }
  if (descripcion !== undefined) { values.push(descripcion || null); updates.push(`descripcion = $${values.length}`); }
  if (fotos !== undefined) { values.push(Array.isArray(fotos) ? fotos : []); updates.push(`fotos = $${values.length}`); }
  updates.push('actualizado_en = NOW()');
  const {rows} = await pool.query(`UPDATE piezas_multiempresa SET ${updates.join(', ')} WHERE id = $1 AND empresa_prestadora_id = $2 RETURNING *`, values);
  if (!rows.length) return res.status(404).json({message: 'Pieza no encontrada.'});
  const subtypeTable = {manguera: 'piezas_manguera', torno: 'piezas_torno', cilindro: 'piezas_cilindro'}[rows[0].tipo];
  const subtypeColumns = {
    manguera: ['diametro', 'longitud', 'presion', 'terminales', 'evidencia', 'adicionales'],
    torno: ['diametro', 'longitud', 'material', 'rosca', 'planos', 'evidencia', 'adicionales'],
    cilindro: ['camisa', 'vastago', 'tapa', 'piston', 'empaques', 'ojo', 'pasadores', 'recorrido_salida', 'racores_llenado', 'adicionales'],
  }[rows[0].tipo];
  const subtypeUpdates = [];
  const subtypeValues = [rows[0].id, req.user.service_company_id];
  for (const column of subtypeColumns) {
    if (medidas[column] !== undefined) {
      subtypeValues.push(medidas[column] || null);
      subtypeUpdates.push(`${column === 'tapa' ? 'medida_tapa' : column === 'piston' ? 'medida_piston' : column} = $${subtypeValues.length}`);
    }
  }
  if (subtypeUpdates.length) await pool.query(`UPDATE ${subtypeTable} SET ${subtypeUpdates.join(', ')} WHERE pieza_id = $1 AND empresa_prestadora_id = $2`, subtypeValues);
  await registrarAuditoria({empresaPrestadoraId: req.user.service_company_id, usuarioId: req.user.id, accion: 'modificar', entidad: 'pieza', entidadId: rows[0].id, detalle: {campos: Object.keys(req.body)}});
  return res.json({ok: true, pieza: rows[0]});
});

router.delete('/piezas/:id', requireRole('admin', 'supervisor'), async (req, res) => {
  const {rows} = await pool.query('DELETE FROM piezas_multiempresa WHERE id = $1 AND empresa_prestadora_id = $2 RETURNING id', [req.params.id, req.user.service_company_id]);
  if (!rows.length) return res.status(404).json({message: 'Pieza no encontrada.'});
  await registrarAuditoria({empresaPrestadoraId: req.user.service_company_id, usuarioId: req.user.id, accion: 'eliminar', entidad: 'pieza', entidadId: rows[0].id});
  return res.json({ok: true, message: 'Pieza eliminada.'});
});

router.get('/users', requireRole('admin', 'supervisor'), async (req, res) => {
  const {rows} = await pool.query('SELECT id, nombre_completo AS nombre, correo AS email, rol, activo, creado_en FROM usuarios_multiempresa WHERE empresa_prestadora_id = $1 ORDER BY creado_en DESC', [req.user.service_company_id]);
  return res.json({ok: true, usuarios: rows});
});

router.post('/users', requireRole('admin'), async (req, res) => {
  const {nombre, email, password, rol = 'tecnico'} = req.body;
  if (!nombre || !email || !password || !['admin', 'supervisor', 'tecnico'].includes(rol)) {
    return res.status(400).json({message: 'Nombre, correo, contraseña y rol válido son obligatorios.'});
  }
  const hash = await bcrypt.hash(password, 10);
  try {
    const {rows} = await pool.query(
      `INSERT INTO usuarios_multiempresa
        (empresa_prestadora_id, nombre_completo, correo, clave_hash, rol)
       VALUES ($1, $2, LOWER($3), $4, $5)
       RETURNING id, nombre_completo AS nombre, correo AS email, rol, activo, creado_en`,
      [req.user.service_company_id, nombre.trim(), email.trim(), hash, rol]
    );
    return res.status(201).json({ok: true, usuario: rows[0]});
  } catch (error) {
    if (error.code === '23505') return res.status(400).json({message: 'Ya existe un usuario con ese correo.'});
    return res.status(500).json({message: 'No se pudo crear el usuario.'});
  }
});

router.patch('/users/:id', requireRole('admin'), async (req, res) => {
  if (req.body.activo === undefined) return res.status(400).json({message: 'El estado activo es obligatorio.'});
  const {rows} = await pool.query(
    `UPDATE usuarios_multiempresa SET activo = $1, actualizado_en = NOW()
     WHERE id = $2 AND empresa_prestadora_id = $3
     RETURNING id, nombre_completo AS nombre, correo AS email, rol, activo, creado_en`,
    [Boolean(req.body.activo), req.params.id, req.user.service_company_id]
  );
  if (!rows.length) return res.status(404).json({message: 'Usuario no encontrado.'});
  return res.json({ok: true, usuario: rows[0]});
});

router.get('/client-companies', async (req, res) => {
  const {rows} = await pool.query(
    'SELECT * FROM empresas_clientes WHERE empresa_prestadora_id = $1 ORDER BY creado_en DESC',
    [req.user.service_company_id]
  );
  return res.json({ok: true, empresas_clientes: rows});
});

router.post('/client-companies', requireRole('admin'), async (req, res) => {
  const {razonSocial, nombreComercial, identificacionFiscal, correo, telefono, direccion} = req.body;
  if (!razonSocial) return res.status(400).json({message: 'La razón social es obligatoria.'});
  try {
    const {rows} = await pool.query(
      `INSERT INTO empresas_clientes
        (empresa_prestadora_id, razon_social, nombre_comercial, identificacion_fiscal, correo, telefono, direccion)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [req.user.service_company_id, razonSocial.trim(), nombreComercial || null, identificacionFiscal || null, correo || null, telefono || null, direccion || null]
    );
    return res.status(201).json({ok: true, empresa_cliente: rows[0]});
  } catch (error) {
    if (error.code === '23505') return res.status(400).json({message: 'La empresa cliente ya existe.'});
    return res.status(500).json({message: 'No se pudo crear la empresa cliente.'});
  }
});

router.patch('/piezas/:id/validar', requireRole('admin', 'supervisor'), async (req, res) => {
  const {rows} = await pool.query(
    `UPDATE piezas_multiempresa SET estado_validacion = 'validada', actualizado_en = NOW()
     WHERE id = $1 AND empresa_prestadora_id = $2 RETURNING *`,
    [req.params.id, req.user.service_company_id]
  );
  if (!rows.length) return res.status(404).json({message: 'Pieza no encontrada.'});
  return res.json({ok: true, pieza: rows[0]});
});

router.get('/notificaciones', async (req, res) => res.json({ok: true, notificaciones: []}));

router.get('/auditoria', requireRole('admin', 'supervisor'), async (req, res) => {
  const {rows} = await pool.query(
    `SELECT a.id, a.accion, a.entidad, a.entidad_id, a.detalle, a.creado_en,
            u.nombre_completo AS usuario_nombre
     FROM registros_auditoria a
     LEFT JOIN usuarios_multiempresa u ON u.id = a.usuario_id
     WHERE a.empresa_prestadora_id = $1 ORDER BY a.creado_en DESC LIMIT 100`,
    [req.user.service_company_id]
  );
  return res.json({ok: true, registros: rows});
});

module.exports = router;
