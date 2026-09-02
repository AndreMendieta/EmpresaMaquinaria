const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db/pool');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = '8h';

/**
 * POST /api/auth/login
 * body: { companyCode, email, password }
 *
 * 1. Busca el usuario por código de empresa + email (consulta SQL parametrizada)
 * 2. Compara el password contra el hash guardado (bcrypt)
 * 3. Si es válido, devuelve un JWT
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

    // Consulta parametrizada: $1, $2 -> evita inyección SQL
    const query = `
      SELECT u.id, u.nombre, u.email, u.password_hash, u.rol, u.activo,
             e.id AS empresa_id, e.nombre AS empresa_nombre
      FROM usuarios u
      JOIN empresas e ON e.id = u.empresa_id
      WHERE e.codigo = $1 AND u.email = $2
      LIMIT 1
    `;
    const { rows } = await pool.query(query, [companyCode, email]);

    // Mensaje genérico si no existe, para no revelar cuál dato falló
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
      { expiresIn: JWT_EXPIRES_IN },
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
 * Requiere header: Authorization: Bearer <token>
 * Sirve para VERIFICAR que un token siga siendo válido
 * (por ejemplo al abrir la app de nuevo).
 */
router.get('/me', async (req, res) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ ok: false, message: 'Token no enviado.' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);

    const { rows } = await pool.query(
      `SELECT u.id, u.nombre, u.email, u.rol, e.nombre AS empresa_nombre
       FROM usuarios u
       JOIN empresas e ON e.id = u.empresa_id
       WHERE u.id = $1`,
      [payload.userId],
    );

    if (rows.length === 0) {
      return res.status(401).json({ ok: false, message: 'Usuario no encontrado.' });
    }

    return res.json({ ok: true, usuario: rows[0] });
  } catch (error) {
    return res.status(401).json({ ok: false, message: 'Token inválido o expirado.' });
  }
});

module.exports = router;
