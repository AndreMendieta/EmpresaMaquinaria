const express = require('express');
const pool = require('../db/pool');
const { verifyToken, requireRoles } = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(verifyToken, requireRoles('admin'));

/**
 * GET /api/auditoria
 * Consulta la trazabilidad de operaciones de la empresa del administrador.
 */
router.get('/', async (req, res) => {
  try {
    const { entidad, accion, limite = 100 } = req.query;
    const params = [req.user.empresaId];
    let sql = `
      SELECT a.id, a.accion, a.entidad, a.entidad_id, a.detalle, a.creado_en,
             u.id AS usuario_id, u.nombre AS usuario_nombre, u.email AS usuario_email
      FROM auditoria a
      LEFT JOIN usuarios u ON u.id = a.usuario_id
      WHERE a.empresa_id = $1
    `;

    if (entidad) {
      params.push(entidad);
      sql += ` AND a.entidad = $${params.length}`;
    }

    if (accion) {
      params.push(accion);
      sql += ` AND a.accion = $${params.length}`;
    }

    const parsedLimit = Math.min(Math.max(parseInt(limite, 10) || 100, 1), 500);
    params.push(parsedLimit);
    sql += ` ORDER BY a.creado_en DESC LIMIT $${params.length}`;

    const { rows } = await pool.query(sql, params);
    return res.json({ ok: true, auditoria: rows });
  } catch (error) {
    console.error('Error en GET /api/auditoria:', error);
    return res.status(500).json({ ok: false, message: 'Error al consultar la auditoría.' });
  }
});

module.exports = router;
