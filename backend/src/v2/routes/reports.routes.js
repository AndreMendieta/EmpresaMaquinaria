const express = require('express');
const pool = require('../../db/pool');
const auth = require('../middlewares/auth');

const router = express.Router();
router.use(auth);

router.get('/summary', async (req, res) => {
  const params = [req.user.service_company_id];
  let userFilter = '';
  if (req.user.role === 'tecnico') {
    params.push(req.user.id);
    userFilter = ` AND (o.asignada_a = $${params.length} OR p.creado_por = $${params.length})`;
  }
  const [orders, parts, machines] = await Promise.all([
    pool.query(`SELECT estado, COUNT(*)::int AS total FROM ordenes_servicio o WHERE o.empresa_prestadora_id = $1${userFilter} GROUP BY estado`, params),
    pool.query(`SELECT estado_validacion, COUNT(*)::int AS total FROM piezas_multiempresa p WHERE p.empresa_prestadora_id = $1${req.user.role === 'tecnico' ? ` AND p.creado_por = $2` : ''} GROUP BY estado_validacion`, params),
    pool.query(`SELECT estado, COUNT(*)::int AS total FROM maquinarias_multiempresa WHERE empresa_prestadora_id = $1 GROUP BY estado`, [req.user.service_company_id]),
  ]);
  return res.json({ok: true, reportes: {ordenes: orders.rows, piezas: parts.rows, maquinarias: machines.rows}});
});

module.exports = router;
