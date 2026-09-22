const express = require('express');
const pool = require('../../db/pool');
const auth = require('../middlewares/auth');
const requireCompanyScope = require('../middlewares/requireCompanyScope');

const router = express.Router();
router.use(auth);

router.get('/', async (req, res) => {
  const {rows} = await pool.query(
    `SELECT * FROM notificaciones_multiempresa
     WHERE empresa_prestadora_id = $1 AND (usuario_id IS NULL OR usuario_id = $2)
     ORDER BY creado_en DESC`,
    [req.user.service_company_id, req.user.id]
  );
  return res.json({ok: true, notificaciones: rows});
});

router.patch('/:id/read', async (req, res) => {
  const {rows} = await pool.query(
    `UPDATE notificaciones_multiempresa SET leida_en = NOW()
     WHERE id = $1 AND empresa_prestadora_id = $2 AND (usuario_id IS NULL OR usuario_id = $3)
     RETURNING *`,
    [req.params.id, req.user.service_company_id, req.user.id]
  );
  if (!rows.length) return res.status(404).json({error: 'Notificación no encontrada'});
  return res.json({ok: true, notificacion: rows[0]});
});

module.exports = router;
