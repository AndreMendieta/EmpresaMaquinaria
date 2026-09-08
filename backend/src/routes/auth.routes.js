const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db/pool');
const { verifyToken } = require('../middlewares/auth.middleware');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = '8h';

// Helper de validación de email
const isValidEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

/**
 * POST /api/auth/register-company
 * Registra una NUEVA empresa y su usuario inicial con rol 'admin'.
 * Body: { companyCode, companyName, userName, email, password }
 */
router.post('/register-company', async (req, res) => {
  const client = await pool.connect();
  try {
    const { companyCode, companyName, userName, email, password } = req.body;

    if (!companyCode || !companyName || !userName || !email || !password) {
      return res.status(400).json({
        ok: false,
        message: 'Todos los campos son obligatorios.',
      });
    }

    const cleanCompanyCode = companyCode.trim().toUpperCase();
    const cleanCompanyName = companyName.trim();
    const cleanUserName = userName.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!isValidEmail(cleanEmail)) {
      return res.status(400).json({
        ok: false,
        message: 'El formato del correo electrónico no es válido.',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        ok: false,
        message: 'La contraseña debe tener al menos 6 caracteres.',
      });
    }

    // Verificar si el código de empresa ya existe
    const existingEmpresa = await client.query(
      'SELECT id FROM empresas WHERE codigo = $1 LIMIT 1',
      [cleanCompanyCode]
    );

    if (existingEmpresa.rows.length > 0) {
      return res.status(400).json({
        ok: false,
        message: `El código de empresa "${cleanCompanyCode}" ya está en uso. Por favor elige otro.`,
      });
    }

    await client.query('BEGIN');

    // 1. Insertar empresa
    const insertEmpresaResult = await client.query(
      `INSERT INTO empresas (codigo, nombre)
       VALUES ($1, $2)
       RETURNING id, codigo, nombre`,
      [cleanCompanyCode, cleanCompanyName]
    );
    const nuevaEmpresa = insertEmpresaResult.rows[0];

    // 2. Hashear contraseña
    const passwordHash = await bcrypt.hash(password, 10);

    // 3. Insertar usuario admin
    const insertUsuarioResult = await client.query(
      `INSERT INTO usuarios (empresa_id, nombre, email, password_hash, rol)
       VALUES ($1, $2, $3, $4, 'admin')
       RETURNING id, nombre, email, rol, activo, creado_en`,
      [nuevaEmpresa.id, cleanUserName, cleanEmail, passwordHash]
    );
    const nuevoUsuario = insertUsuarioResult.rows[0];

    await client.query('COMMIT');

    // 4. Generar JWT
    const token = jwt.sign(
      {
        userId: nuevoUsuario.id,
        empresaId: nuevaEmpresa.id,
        rol: nuevoUsuario.rol,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return res.status(201).json({
      ok: true,
      message: 'Empresa y administrador registrados exitosamente.',
      token,
      usuario: {
        id: nuevoUsuario.id,
        nombre: nuevoUsuario.nombre,
        email: nuevoUsuario.email,
        rol: nuevoUsuario.rol,
        empresa: {
          id: nuevaEmpresa.id,
          codigo: nuevaEmpresa.codigo,
          nombre: nuevaEmpresa.nombre,
        },
      },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error en /register-company:', error);
    return res.status(500).json({
      ok: false,
      message: 'Error interno al registrar la empresa.',
    });
  } finally {
    client.release();
  }
});

/**
 * POST /api/auth/register-user
 * Auto-registro de un nuevo usuario en una empresa existente usando su código.
 * Asigna por defecto el rol 'tecnico'.
 * Body: { companyCode, userName, email, password }
 */
router.post('/register-user', async (req, res) => {
  try {
    const { companyCode, userName, email, password } = req.body;

    if (!companyCode || !userName || !email || !password) {
      return res.status(400).json({
        ok: false,
        message: 'Todos los campos son obligatorios.',
      });
    }

    const cleanCompanyCode = companyCode.trim().toUpperCase();
    const cleanUserName = userName.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!isValidEmail(cleanEmail)) {
      return res.status(400).json({
        ok: false,
        message: 'El formato del correo electrónico no es válido.',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        ok: false,
        message: 'La contraseña debe tener al menos 6 caracteres.',
      });
    }

    // 1. Buscar la empresa
    const empresaResult = await pool.query(
      'SELECT id, codigo, nombre FROM empresas WHERE codigo = $1 LIMIT 1',
      [cleanCompanyCode]
    );

    if (empresaResult.rows.length === 0) {
      return res.status(404).json({
        ok: false,
        message: `No se encontró ninguna empresa con el código "${cleanCompanyCode}".`,
      });
    }

    const empresa = empresaResult.rows[0];

    // 2. Verificar que el correo no esté registrado en esa misma empresa
    const existingUser = await pool.query(
      'SELECT id FROM usuarios WHERE empresa_id = $1 AND LOWER(email) = $2 LIMIT 1',
      [empresa.id, cleanEmail]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        ok: false,
        message: 'Ya existe un usuario registrado con este correo en esta empresa.',
      });
    }

    // 3. Hashear contraseña
    const passwordHash = await bcrypt.hash(password, 10);

    // 4. Insertar con rol por defecto 'tecnico'
    const insertResult = await pool.query(
      `INSERT INTO usuarios (empresa_id, nombre, email, password_hash, rol)
       VALUES ($1, $2, $3, $4, 'tecnico')
       RETURNING id, nombre, email, rol, activo, creado_en`,
      [empresa.id, cleanUserName, cleanEmail, passwordHash]
    );

    const nuevoUsuario = insertResult.rows[0];

    // 5. Generar JWT
    const token = jwt.sign(
      {
        userId: nuevoUsuario.id,
        empresaId: empresa.id,
        rol: nuevoUsuario.rol,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return res.status(201).json({
      ok: true,
      message: 'Usuario registrado exitosamente con rol técnico.',
      token,
      usuario: {
        id: nuevoUsuario.id,
        nombre: nuevoUsuario.nombre,
        email: nuevoUsuario.email,
        rol: nuevoUsuario.rol,
        empresa: {
          id: empresa.id,
          codigo: empresa.codigo,
          nombre: empresa.nombre,
        },
      },
    });
  } catch (error) {
    console.error('Error en /register-user:', error);
    return res.status(500).json({
      ok: false,
      message: 'Error interno al registrar el usuario.',
    });
  }
});

/**
 * POST /api/auth/login
 * body: { companyCode, email, password }
 */
router.post('/login', async (req, res) => {
  try {
    const { companyCode, email, password } = req.body;

    if (!companyCode || !email || !password) {
      return res.status(400).json({
        ok: false,
        message: 'Código de empresa, correo y contraseña son obligatorios.',
      });
    }

    const cleanCompanyCode = companyCode.trim().toUpperCase();
    const cleanEmail = email.trim().toLowerCase();

    const query = `
      SELECT u.id, u.nombre, u.email, u.password_hash, u.rol, u.activo,
             e.id AS empresa_id, e.codigo AS empresa_codigo, e.nombre AS empresa_nombre
      FROM usuarios u
      JOIN empresas e ON e.id = u.empresa_id
      WHERE e.codigo = $1 AND LOWER(u.email) = $2
      LIMIT 1
    `;
    const { rows } = await pool.query(query, [cleanCompanyCode, cleanEmail]);

    if (rows.length === 0) {
      return res.status(401).json({
        ok: false,
        message: 'Credenciales inválidas.',
      });
    }

    const usuario = rows[0];

    if (!usuario.activo) {
      return res.status(403).json({
        ok: false,
        message: 'Este usuario está inactivo. Contacta al administrador.',
      });
    }

    const passwordValida = await bcrypt.compare(password, usuario.password_hash);

    if (!passwordValida) {
      return res.status(401).json({
        ok: false,
        message: 'Credenciales inválidas.',
      });
    }

    const token = jwt.sign(
      {
        userId: usuario.id,
        empresaId: usuario.empresa_id,
        rol: usuario.rol,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return res.json({
      ok: true,
      token,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
        empresa: {
          id: usuario.empresa_id,
          codigo: usuario.empresa_codigo,
          nombre: usuario.empresa_nombre,
        },
      },
    });
  } catch (error) {
    console.error('Error en /login:', error);
    return res.status(500).json({
      ok: false,
      message: 'Error interno del servidor.',
    });
  }
});

/**
 * GET /api/auth/me
 * Requiere token JWT
 */
router.get('/me', verifyToken, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT u.id, u.nombre, u.email, u.rol, u.activo,
              e.id AS empresa_id, e.codigo AS empresa_codigo, e.nombre AS empresa_nombre
       FROM usuarios u
       JOIN empresas e ON e.id = u.empresa_id
       WHERE u.id = $1`,
      [req.user.userId]
    );

    if (rows.length === 0) {
      return res.status(401).json({ ok: false, message: 'Usuario no encontrado.' });
    }

    const row = rows[0];
    return res.json({
      ok: true,
      usuario: {
        id: row.id,
        nombre: row.nombre,
        email: row.email,
        rol: row.rol,
        activo: row.activo,
        empresa: {
          id: row.empresa_id,
          codigo: row.empresa_codigo,
          nombre: row.empresa_nombre,
        },
      },
    });
  } catch (error) {
    console.error('Error en /me:', error);
    return res.status(500).json({ ok: false, message: 'Error interno del servidor.' });
  }
});

module.exports = router;
