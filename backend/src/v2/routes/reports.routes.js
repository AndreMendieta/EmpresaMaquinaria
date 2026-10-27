const express = require('express');
const pool = require('../../db/pool');
const auth = require('../middlewares/auth');
const { createCompanyReport } = require('../utils/companyReportPdf');

const router = express.Router();
router.use(auth);

// pdfkit solo admite PNG y JPEG; otros formatos se omiten y el PDF sale sin logo
async function loadCompanyBranding(companyId) {
  const {rows} = await pool.query(
    'SELECT COALESCE(nombre_comercial, razon_social) AS nombre, logo_url FROM empresas_prestadoras WHERE id = $1',
    [companyId]
  );
  const company = rows[0] || {};
  let logo = null;
  const fileId = company.logo_url && company.logo_url.split('/').pop();
  if (fileId) {
    const file = await pool.query(
      `SELECT contenido FROM archivos_multiempresa
       WHERE id::text = $1 AND empresa_prestadora_id = $2 AND tipo_mime IN ('image/png', 'image/jpeg')`,
      [fileId, companyId]
    );
    logo = file.rows[0] ? file.rows[0].contenido : null;
  }
  return {nombre: company.nombre, logo};
}

router.get('/summary', async (req, res) => {
  const params = [req.user.service_company_id];
  let orderFilter = '';
  if (req.user.role === 'tecnico') {
    params.push(req.user.id);
    orderFilter = ` AND (o.asignada_a = $${params.length} OR o.solicitada_por = $${params.length})`;
  }
  const [orders, parts, machines] = await Promise.all([
    pool.query(`SELECT estado, COUNT(*)::int AS total FROM ordenes_servicio o WHERE o.empresa_prestadora_id = $1${orderFilter} GROUP BY estado`, params),
    pool.query(`SELECT estado_validacion, COUNT(*)::int AS total FROM piezas_multiempresa p WHERE p.empresa_prestadora_id = $1${req.user.role === 'tecnico' ? ` AND p.creado_por = $2` : ''} GROUP BY estado_validacion`, params),
    pool.query(`SELECT estado, COUNT(*)::int AS total FROM maquinarias_multiempresa WHERE empresa_prestadora_id = $1 GROUP BY estado`, [req.user.service_company_id]),
  ]);
  return res.json({ok: true, reportes: {ordenes: orders.rows, piezas: parts.rows, maquinarias: machines.rows}});
});

router.get('/export.pdf', async (req, res) => {
  const companyId = req.user.service_company_id;
  const isTechnician = req.user.role === 'tecnico';
  const pieceParams = [companyId];
  const orderParams = [companyId];
  const pieceFilter = isTechnician ? ' AND p.creado_por = $2' : '';
  const orderFilter = isTechnician ? ' AND (o.asignada_a = $2 OR o.solicitada_por = $2)' : '';
  if (isTechnician) {
    pieceParams.push(req.user.id);
    orderParams.push(req.user.id);
  }

  try {
    const [machines, pieces, orders] = await Promise.all([
      pool.query(
        `SELECT m.id, m.codigo, m.nombre, m.tipo, m.numero_serie, m.estado, m.descripcion,
                COALESCE(ec.razon_social, ec.nombre_comercial) AS cliente_nombre
         FROM maquinarias_multiempresa m
         LEFT JOIN empresas_clientes ec
           ON ec.empresa_prestadora_id = m.empresa_prestadora_id AND ec.id = m.empresa_cliente_id
         WHERE m.empresa_prestadora_id = $1
         ORDER BY m.codigo`,
        [companyId]
      ),
      pool.query(
        `SELECT p.id, p.maquinaria_id, p.codigo, p.nombre, p.tipo, p.descripcion,
                p.estado_validacion,
                COALESCE(to_jsonb(h) - 'pieza_id' - 'empresa_prestadora_id', '{}'::jsonb)
                  || COALESCE(to_jsonb(t) - 'pieza_id' - 'empresa_prestadora_id', '{}'::jsonb)
                  || COALESCE(to_jsonb(c) - 'pieza_id' - 'empresa_prestadora_id', '{}'::jsonb)
                  AS especificaciones
         FROM piezas_multiempresa p
         LEFT JOIN piezas_manguera h
           ON h.empresa_prestadora_id = p.empresa_prestadora_id AND h.pieza_id = p.id
         LEFT JOIN piezas_torno t
           ON t.empresa_prestadora_id = p.empresa_prestadora_id AND t.pieza_id = p.id
         LEFT JOIN piezas_cilindro c
           ON c.empresa_prestadora_id = p.empresa_prestadora_id AND c.pieza_id = p.id
         WHERE p.empresa_prestadora_id = $1${pieceFilter}
         ORDER BY p.maquinaria_id, p.codigo`,
        pieceParams
      ),
      pool.query(
        `SELECT o.numero_orden, o.maquinaria_id, o.titulo, o.descripcion, o.estado,
                o.prioridad, o.programada_en, o.completada_en,
                COALESCE(ec.razon_social, ec.nombre_comercial) AS cliente_nombre,
                u.nombre_completo AS tecnico_nombre
         FROM ordenes_servicio o
         LEFT JOIN empresas_clientes ec
           ON ec.empresa_prestadora_id = o.empresa_prestadora_id AND ec.id = o.empresa_cliente_id
         LEFT JOIN usuarios_multiempresa u
           ON u.empresa_prestadora_id = o.empresa_prestadora_id AND u.id = o.asignada_a
         WHERE o.empresa_prestadora_id = $1${orderFilter}
         ORDER BY o.creado_en DESC`,
        orderParams
      ),
    ]);

    const filename = `hydrotech-reporte-${new Date().toISOString().slice(0, 10)}.pdf`;
    const company = await loadCompanyBranding(companyId);
    const document = createCompanyReport({
      machines: machines.rows,
      pieces: pieces.rows,
      orders: orders.rows,
      company: {nombre: company.nombre},
      logo: company.logo,
    });
    document.on('error', (error) => {
      console.error('Error generando reporte PDF:', error);
      if (res.headersSent) res.destroy(error);
      else res.status(500).json({error: 'No se pudo generar el reporte PDF'});
    });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-store');
    document.pipe(res);
  } catch (error) {
    console.error('Error consultando datos del reporte PDF:', error);
    return res.status(500).json({error: 'No se pudo generar el reporte PDF'});
  }
});

module.exports = router;