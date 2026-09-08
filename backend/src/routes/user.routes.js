const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../db/pool');
const { verifyToken, requireRoles } = require('../middlewares/auth.middleware');

const router = express.Router();

const ROLES_PERMITIDOS = ['admin', 'supervisor', 'tecnico'];

const isValidEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

// Todas las rutas de este router requieren que el usuario esté autenticado
router.use(verifyToken);

/**
 * GET /api/users
 * Lista todos los usuarios pertenecientes a la empresa del solicitante.
 * Permitido para: 'admin' y 'supervisor'.
 */
router.get('/', requireRoles('admin', 'supervisor'), async (req, res) => {
  try {
    const query = `
      SELECT id, nombre, email, rol, activo, creado_en
      FROM usuarios
      WHERE empresa_id = $1
      ORDER BY creado_en DESC
    `;
    const { rows } = await pool.query(query, [req.user.empresaId]);

    return res.json({
      ok: true,
      usuarios: rows,
    });
  } catch (error) {
    console.error('Error en GET /api/users:', error);
    return res.status(500).json({
      ok: false,
      message: 'Error al obtener la lista de usuarios.',
    });
  }
});

/**
 * POST /api/users
 * Permite a un administrador crear un nuevo usuario dentro de su empresa,
 * asignándole rol de 'admin', 'supervisor' o 'tecnico'.
 * Permitido exclusivamente para: 'admin'.
 */
router.post('/', requireRoles('admin'), async (req, res) => {
  try {
    const { nombre, email, password, rol = 'tecnico' } = req.body;

    if (!nombre || !email || !password) {
      return res.status(400).json({
        ok: false,
        message: 'Nombre, correo electrónico y contraseña son obligatorios.',
      });
    }

    const cleanNombre = nombre.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanRol = rol.trim().toLowerCase();

    if (!ROLES_PERMITIDOS.includes(cleanRol)) {
      return res.status(400).json({
        ok: false,
        message: `El rol "${cleanRol}" no es válido. Debe ser uno de: ${ROLES_PERMITIDOS.join(', ')}.`,
      });
    }

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

    // Verificar si el correo ya existe en esta empresa
    const existing = await pool.query(
      'SELECT id FROM usuarios WHERE empresa_id = $1 AND LOWER(email) = $2 LIMIT 1',
      [req.user.empresaId, cleanEmail]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({
        ok: false,
        message: 'Ya existe un usuario con este correo electrónico en tu empresa.',
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const insertResult = await pool.query(
      `INSERT INTO usuarios (empresa_id, nombre, email, password_hash, rol, activo)
       VALUES ($1, $2, $3, $4, $5, TRUE)
       RETURNING id, nombre, email, rol, activo, creado_en`,
      [req.user.empresaId, cleanNombre, cleanEmail, passwordHash, cleanRol]
    );

    const nuevoUsuario = insertResult.rows[0];

    return res.status(201).json({
      ok: true,
      message: `Usuario creado exitosamente con rol "${cleanRol}".`,
      usuario: nuevoUsuario,
    });
  } catch (error) {
    console.error('Error en POST /api/users:', error);
    return res.status(500).json({
      ok: false,
      message: 'Error al registrar el nuevo usuario.',
    });
  }
});

/**
 * PATCH /api/users/:id
 * Actualiza el rol o el estado (activo/inactivo) de un usuario de la empresa.
 * Permitido exclusivamente para: 'admin'.
 */
router.patch('/:id', requireRoles('admin'), async (req, res) => {
  try {
    const targetUserId = parseInt(req.params.id, 10);
    const { rol, activo } = req.body;

    if (isNaN(targetUserId)) {
      return res.status(400).json({ ok: false, message: 'ID de usuario inválido.' });
    }

    // Evitar que el administrador se auto-desactive o se quite el rol de admin por accidente
    if (targetUserId === req.user.userId && activo === false) {
      return res.status(400).json({
        ok: false,
        message: 'No puedes desactivar tu propia cuenta de administrador.',
      });
    }

    // Verificar existencia del usuario dentro de la misma empresa
    const userResult = await pool.query(
      'SELECT id, rol, activo FROM usuarios WHERE id = $1 AND empresa_id = $2',
      [targetUserId, req.user.empresaId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        ok: false,
        message: 'Usuario no encontrado en tu empresa.',
      });
    }

    const updates = [];
    const values = [targetUserId, req.user.empresaId];

    if (rol !== undefined) {
      const cleanRol = rol.trim().toLowerCase();
      if (!ROLES_PERMITIDOS.includes(cleanRol)) {
        return res.status(400).json({
          ok: false,
          message: `El rol "${cleanRol}" no es válido. Debe ser uno de: ${ROLES_PERMITIDOS.join(', ')}.`,
        });
      }
      values.push(cleanRol);
      updates.push(`rol = $${values.length}`);
    }

    if (activo !== undefined) {
      values.push(Boolean(activo));
      updates.push(`activo = $${values.length}`);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        ok: false,
        message: 'No se enviaron campos válidos para actualizar (rol, activo).',
      });
    }

    const updateQuery = `
      UPDATE usuarios
      SET ${updates.join(', ')}
      WHERE id = $1 AND empresa_id = $2
      RETURNING id, nombre, email, rol, activo, creado_en
    `;

    const result = await pool.query(updateQuery, values);

    return res.json({
      ok: true,
      message: 'Usuario actualizado exitosamente.',
      usuario: result.rows[0],
    });
  } catch (error) {
    console.error('Error en PATCH /api/users/:id:', error);
    return res.status(500).json({
      ok: false,
      message: 'Error al actualizar el usuario.',
    });
  }
});

module.exports = router;
