const express = require('express');
const pool = require('../../db/pool');
const auth = require('../middlewares/auth');
const requireRole = require('../middlewares/requireRole');
const requireCompanyScope = require('../middlewares/requireCompanyScope');
const { registrarAuditoria } = require('../utils/audit');
const { crearNotificacion } = require('../utils/notifications');

const router = express.Router();
router.use(auth);

// Asegurar que la columna evidencias exista en la base de datos
(async function ensureEvidenciasColumn() {
  try {
    await pool.query(`
      ALTER TABLE ordenes_servicio 
      ADD COLUMN IF NOT EXISTS evidencias JSONB NOT NULL DEFAULT '[]'::jsonb;
    `);
  } catch (e) {
    console.warn('Aviso: no se pudo verificar columna evidencias en ordenes_servicio:', e.message);
  }
})();

const BASE_ORDER_QUERY = `
  SELECT 
    o.*,
    COALESCE(o.evidencias, '[]'::jsonb) AS evidencias,
    COALESCE(ec.razon_social, ec.nombre_comercial) AS cliente_nombre,
    mm.nombre AS maquina_nombre,
    mm.codigo AS maquina_codigo,
    u_asig.nombre_completo AS tecnico_nombre,
    u_asig.correo AS tecnico_correo,
    u_solic.nombre_completo AS solicitante_nombre
  FROM ordenes_servicio o
  LEFT JOIN empresas_clientes ec 
    ON ec.empresa_prestadora_id = o.empresa_prestadora_id AND ec.id = o.empresa_cliente_id
  LEFT JOIN maquinarias_multiempresa mm 
    ON mm.empresa_prestadora_id = o.empresa_prestadora_id AND mm.id = o.maquinaria_id
  LEFT JOIN usuarios_multiempresa u_asig 
    ON u_asig.empresa_prestadora_id = o.empresa_prestadora_id AND u_asig.id = o.asignada_a
  LEFT JOIN usuarios_multiempresa u_solic 
    ON u_solic.empresa_prestadora_id = o.empresa_prestadora_id AND u_solic.id = o.solicitada_por
`;

// Listar todas las órdenes con detalles de cliente, máquina y técnico
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `${BASE_ORDER_QUERY} WHERE o.empresa_prestadora_id = $1 ORDER BY o.creado_en DESC`,
      [req.user.service_company_id]
    );
    return res.json({ ok: true, ordenes: rows });
  } catch (error) {
    console.error('Error listando órdenes:', error);
    return res.status(500).json({ error: 'Error al consultar las órdenes de trabajo' });
  }
});

// Detalle individual de una orden
router.get('/:id', requireCompanyScope('orden_id'), async (req, res) => {
  try {
    const { rows } = await pool.query(
      `${BASE_ORDER_QUERY} WHERE o.id = $1 AND o.empresa_prestadora_id = $2`,
      [req.params.id, req.user.service_company_id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Orden no encontrada' });
    return res.json({ ok: true, orden: rows[0] });
  } catch (error) {
    console.error('Error obteniendo orden:', error);
    return res.status(500).json({ error: 'Error al obtener detalle de la orden' });
  }
});

// Registrar nueva orden de trabajo con todos los campos clave
router.post('/', requireRole('admin', 'supervisor'), async (req, res) => {
  try {
    const {
      empresaClienteId,
      maquinariaId,
      titulo,
      descripcion,
      prioridad = 'normal',
      asignadaA,
      evidencias = [],
    } = req.body;

    if (!titulo || !titulo.trim()) {
      return res.status(400).json({ error: 'El título de la orden es obligatorio' });
    }

    const numeroOrden = `OT-${Date.now().toString().slice(-6)}`;
    const evidenciasJson = JSON.stringify(Array.isArray(evidencias) ? evidencias : []);

    const { rows } = await pool.query(
      `INSERT INTO ordenes_servicio
       (empresa_prestadora_id, empresa_cliente_id, maquinaria_id, solicitada_por, asignada_a, numero_orden, titulo, descripcion, prioridad, evidencias)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)
       RETURNING *`,
      [
        req.user.service_company_id,
        empresaClienteId || null,
        maquinariaId || null,
        req.user.id,
        asignadaA || null,
        numeroOrden,
        titulo.trim(),
        descripcion ? descripcion.trim() : null,
        prioridad,
        evidenciasJson,
      ]
    );

    const nuevaOrden = rows[0];

    // Si se asignó a un técnico, enviarle notificación
    if (asignadaA) {
      await crearNotificacion({
        empresaPrestadoraId: req.user.service_company_id,
        usuarioId: asignadaA,
        ordenId: nuevaOrden.id,
        titulo: 'Nueva orden asignada',
        mensaje: `Se te ha asignado la orden ${nuevaOrden.numero_orden}: "${nuevaOrden.titulo}".`,
      });
    }

    await registrarAuditoria({
      empresaPrestadoraId: req.user.service_company_id,
      usuarioId: req.user.id,
      accion: 'crear',
      entidad: 'orden',
      entidadId: nuevaOrden.id,
      detalle: { numeroOrden, prioridad, asignadaA },
    });

    // Obtener orden con joins para devolver formato completo
    const fullOrder = await pool.query(
      `${BASE_ORDER_QUERY} WHERE o.id = $1 AND o.empresa_prestadora_id = $2`,
      [nuevaOrden.id, req.user.service_company_id]
    );

    return res.status(201).json({ ok: true, orden: fullOrder.rows[0] || nuevaOrden });
  } catch (error) {
    console.error('Error creando orden v2:', error);
    return res.status(500).json({ error: 'No se pudo crear la orden de trabajo' });
  }
});

// Asignar o reasignar técnico
router.patch('/:id/assign', requireRole('admin', 'supervisor'), requireCompanyScope('orden_id'), async (req, res) => {
  try {
    const { usuarioId } = req.body;
    const { rows } = await pool.query(
      `UPDATE ordenes_servicio 
       SET asignada_a = $1, estado = CASE WHEN estado = 'abierta' THEN 'en_progreso' ELSE estado END, actualizado_en = NOW()
       WHERE id = $2 AND empresa_prestadora_id = $3 RETURNING *`,
      [usuarioId || null, req.params.id, req.user.service_company_id]
    );

    if (!rows.length) return res.status(404).json({ error: 'Orden no encontrada' });

    if (usuarioId) {
      await crearNotificacion({
        empresaPrestadoraId: req.user.service_company_id,
        usuarioId,
        ordenId: rows[0].id,
        titulo: 'Orden reasignada',
        mensaje: `La orden ${rows[0].numero_orden} ha sido asignada para tu atención.`,
      });
    }

    await registrarAuditoria({
      empresaPrestadoraId: req.user.service_company_id,
      usuarioId: req.user.id,
      accion: 'modificar',
      entidad: 'orden',
      entidadId: rows[0].id,
      detalle: { asignadaA: usuarioId },
    });

    const fullOrder = await pool.query(
      `${BASE_ORDER_QUERY} WHERE o.id = $1 AND o.empresa_prestadora_id = $2`,
      [rows[0].id, req.user.service_company_id]
    );

    return res.json({ ok: true, orden: fullOrder.rows[0] });
  } catch (error) {
    console.error('Error asignando orden:', error);
    return res.status(500).json({ error: 'Error al asignar la orden' });
  }
});

// Actualizar estado del progreso (técnico responsable o supervisores)
router.patch('/:id/progress', requireCompanyScope('orden_id'), async (req, res) => {
  try {
    const { estado } = req.body;
    const estadosValidos = ['abierta', 'en_progreso', 'completada', 'cancelada'];
    if (!estadosValidos.includes(estado)) {
      return res.status(400).json({ error: `Estado inválido. Valores permitidos: ${estadosValidos.join(', ')}` });
    }

    // Permitir a supervisores/admin o al técnico asignado
    const isSupervisorOrAdmin = ['admin', 'supervisor'].includes(req.user.role);
    const filterUserClause = isSupervisorOrAdmin ? '' : ' AND asignada_a = $4';
    const params = [estado, req.params.id, req.user.service_company_id];
    if (!isSupervisorOrAdmin) params.push(req.user.id);

    const { rows } = await pool.query(
      `UPDATE ordenes_servicio 
       SET estado = $1::varchar, 
           completada_en = CASE WHEN $1::text = 'completada' THEN NOW() ELSE completada_en END, 
           actualizado_en = NOW()
       WHERE id = $2 AND empresa_prestadora_id = $3${filterUserClause} 
       RETURNING *`,
      params
    );

    if (!rows.length) {
      return res.status(403).json({ error: 'Solo el técnico asignado o un supervisor pueden actualizar el estado de esta orden' });
    }

    await registrarAuditoria({
      empresaPrestadoraId: req.user.service_company_id,
      usuarioId: req.user.id,
      accion: 'modificar',
      entidad: 'orden',
      entidadId: rows[0].id,
      detalle: { estado },
    });

    const fullOrder = await pool.query(
      `${BASE_ORDER_QUERY} WHERE o.id = $1 AND o.empresa_prestadora_id = $2`,
      [rows[0].id, req.user.service_company_id]
    );

    return res.json({ ok: true, orden: fullOrder.rows[0] });
  } catch (error) {
    console.error('Error actualizando progreso:', error);
    return res.status(500).json({ error: 'Error al actualizar el estado de la orden' });
  }
});

// Adjuntar evidencias del trabajo realizado (fotos/notas antes, durante y después)
router.post('/:id/evidencias', requireCompanyScope('orden_id'), async (req, res) => {
  try {
    const { url, descripcion, etapa = 'despues' } = req.body;

    if (!descripcion && !url) {
      return res.status(400).json({ error: 'Debes proporcionar una descripción o una imagen/enlace de la evidencia' });
    }

    const nuevaEvidencia = {
      id: `evi_${Date.now()}`,
      url: url ? url.trim() : null,
      descripcion: descripcion ? descripcion.trim() : '',
      etapa, // 'antes', 'durante', 'despues'
      creado_por: req.user.id,
      autor_nombre: req.user.nombre_completo || req.user.nombre || 'Técnico',
      creado_en: new Date().toISOString(),
    };

    const evidenciaJson = JSON.stringify([nuevaEvidencia]);

    const { rows } = await pool.query(
      `UPDATE ordenes_servicio 
       SET evidencias = COALESCE(evidencias, '[]'::jsonb) || $1::jsonb,
           actualizado_en = NOW()
       WHERE id = $2 AND empresa_prestadora_id = $3
       RETURNING *`,
      [evidenciaJson, req.params.id, req.user.service_company_id]
    );

    if (!rows.length) return res.status(404).json({ error: 'Orden no encontrada' });

    await registrarAuditoria({
      empresaPrestadoraId: req.user.service_company_id,
      usuarioId: req.user.id,
      accion: 'modificar',
      entidad: 'orden',
      entidadId: rows[0].id,
      detalle: { tipo: 'nueva_evidencia', etapa, descripcion },
    });

    const fullOrder = await pool.query(
      `${BASE_ORDER_QUERY} WHERE o.id = $1 AND o.empresa_prestadora_id = $2`,
      [rows[0].id, req.user.service_company_id]
    );

    return res.status(201).json({ ok: true, orden: fullOrder.rows[0], evidencia: nuevaEvidencia });
  } catch (error) {
    console.error('Error registrando evidencia:', error);
    return res.status(500).json({ error: 'No se pudo guardar la evidencia técnica' });
  }
});

module.exports = router;
