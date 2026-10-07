const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../../db/pool');
const auth = require('../middlewares/auth');

const router = express.Router();

function crearToken(usuario) {
  return jwt.sign(
    {
      user_id: usuario.id,
      service_company_id: usuario.empresa_prestadora_id,
      role: usuario.rol,
    },
    process.env.JWT_SECRET,
    {expiresIn: '8h'}
  );
}

router.post('/register', async (req, res) => {
  const client = await pool.connect();
  try {
    const {razonSocial, nombre, correo, password, rol = 'admin'} = req.body;
    if (!razonSocial || !nombre || !correo || !password) {
      return res.status(400).json({error: 'razonSocial, nombre, correo y password son obligatorios'});
    }
    if (!['admin', 'supervisor', 'tecnico'].includes(rol) || password.length < 6) {
      return res.status(400).json({error: 'Rol o contraseña inválidos'});
    }

    await client.query('BEGIN');
    const companyResult = await client.query(
      `INSERT INTO empresas_prestadoras (razon_social, nombre_comercial)
       VALUES ($1, $2) RETURNING id, razon_social, nombre_comercial`,
      [razonSocial.trim(), nombre.trim()]
    );
    const company = companyResult.rows[0];
    const passwordHash = await bcrypt.hash(password, 10);
    const userResult = await client.query(
      `INSERT INTO usuarios_multiempresa
       (empresa_prestadora_id, nombre_completo, correo, clave_hash, rol)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, empresa_prestadora_id, nombre_completo, correo, rol`,
      [company.id, nombre.trim(), correo.trim().toLowerCase(), passwordHash, rol]
    );
    await client.query('COMMIT');

    const user = userResult.rows[0];
    return res.status(201).json({ok: true, token: crearToken(user), usuario: user, empresa: company});
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error en v2 register:', error);
    return res.status(500).json({error: 'No se pudo registrar la empresa'});
  } finally {
    client.release();
  }
});

router.post('/login', async (req, res) => {
  try {
    const {serviceCompanyId, correo, password} = req.body;
    if (!serviceCompanyId || !correo || !password) {
      return res.status(400).json({error: 'serviceCompanyId, correo y password son obligatorios'});
    }

    const result = await pool.query(
      `SELECT id, empresa_prestadora_id, nombre_completo, correo, clave_hash, rol, activo
       FROM usuarios_multiempresa
       WHERE empresa_prestadora_id = $1 AND LOWER(correo) = LOWER($2)
       LIMIT 1`,
      [serviceCompanyId, correo.trim()]
    );
    const user = result.rows[0];
    if (!user || !user.activo || !(await bcrypt.compare(password, user.clave_hash))) {
      return res.status(401).json({error: 'Credenciales inválidas'});
    }

    return res.json({
      ok: true,
      token: crearToken(user),
      usuario: {id: user.id, empresa_prestadora_id: user.empresa_prestadora_id, nombre_completo: user.nombre_completo, correo: user.correo, rol: user.rol},
    });
  } catch (error) {
    console.error('Error en v2 login:', error);
    return res.status(500).json({error: 'No se pudo iniciar sesión'});
  }
});

router.get('/me', auth, async (req, res) => {
  const result = await pool.query(
    `SELECT id, empresa_prestadora_id, nombre_completo, correo, rol, activo
     FROM usuarios_multiempresa
     WHERE id = $1 AND empresa_prestadora_id = $2`,
    [req.user.id, req.user.service_company_id]
  );
  if (result.rows.length === 0) {
    return res.status(404).json({error: 'Usuario no encontrado'});
  }
  return res.json({ok: true, usuario: result.rows[0]});
});

module.exports = router;
