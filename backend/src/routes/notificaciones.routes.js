const express = require('express');
const pool = require('../db/pool');
const { verifyToken, requireRoles } = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(verifyToken);

/**
 * GET /api/notificaciones
 * Permite a los supervisores y administradores ver las alertas de piezas nuevas creadas por los técnicos.
 * Permitido exclusivamente para: supervisor, admin.
 */
router.get('/', requireRoles('supervisor', 'admin'), async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT n.id, n.pieza_id, n.mensaje, n.leida, n.creado_en,
              p.codigo AS pieza_codigo, p.nombre AS pieza_nombre, p.estado_validacion,
              m.nombre AS maquina_nombre,
              u.nombre AS tecnico_nombre
       FROM notificaciones_supervisor n
       JOIN piezas p ON p.id = n.pieza_id
       JOIN maquinarias m ON m.id = p.maquina_id
       LEFT JOIN usuarios u ON u.id = n.tecnico_id
       WHERE n.empresa_id = $1
       ORDER BY n.creado_en DESC
       LIMIT 50`,
      [req.user.empresaId]
    );

    return res.json({
      ok: true,
      notificaciones: rows,
    });
  } catch (error) {
    console.error('Error en GET /api/notificaciones:', error);
    return res.status(500).json({
      ok: false,
      message: 'Error al consultar las notificaciones.',
    });
  }
});

/**
 * PATCH /api/notificaciones/:id/leida
 * Marca una notificación como revisada.
 */
router.patch('/:id/leida', requireRoles('supervisor', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `UPDATE notificaciones_supervisor
       SET leida = TRUE
       WHERE id = $1 AND empresa_id = $2
       RETURNING id, leida`,
      [id, req.user.empresaId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ ok: false, message: 'Notificación no encontrada.' });
    }

    return res.json({ ok: true, mensaje: 'Notificación marcada como leída.' });
  } catch (error) {
    console.error('Error en PATCH /api/notificaciones/:id/leida:', error);
    return res.status(500).json({ ok: false, message: 'Error al actualizar notificación.' });
  }
});

module.exports = router;
