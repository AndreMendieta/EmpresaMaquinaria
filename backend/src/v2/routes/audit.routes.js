const express = require('express');
const pool = require('../../db/pool');
const auth = require('../middlewares/auth');
const requireRole = require('../middlewares/requireRole');

const router = express.Router();
router.use(auth, requireRole('admin', 'supervisor'));

router.get('/', async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const pageSize = Math.min(Math.max(parseInt(req.query.pageSize, 10) || 50, 1), 100);
  const offset = (page - 1) * pageSize;
  const {rows} = await pool.query(
    `SELECT a.id, a.accion, a.entidad, a.entidad_id, a.detalle, a.creado_en,
            u.nombre_completo AS usuario_nombre, u.correo AS usuario_correo
     FROM registros_auditoria a
     LEFT JOIN usuarios_multiempresa u
       ON u.id = a.usuario_id AND u.empresa_prestadora_id = a.empresa_prestadora_id
     WHERE a.empresa_prestadora_id = $1
     ORDER BY a.creado_en DESC
     LIMIT $2 OFFSET $3`,
    [req.user.service_company_id, pageSize, offset]
  );
  return res.json({ok: true, registros: rows, pagination: {page, pageSize}});
});

module.exports = router;
