const pool = require('../../db/pool');

const RECURSOS = {
  empresa_cliente_id: {
    table: 'empresas_clientes',
    idColumn: 'id',
  },
  maquinaria_id: {
    table: 'maquinarias_multiempresa',
    idColumn: 'id',
  },
  pieza_id: {
    table: 'piezas_multiempresa',
    idColumn: 'id',
  },
  orden_id: {
    table: 'ordenes_servicio',
    idColumn: 'id',
  },
};

function requireCompanyScope(resourceKey, source = 'params') {
  return async (req, res, next) => {
    const resource = RECURSOS[resourceKey];
    const resourceId = req[source]?.[resourceKey]
      || (source === 'params' ? req.params?.id : null)
      || req.body?.[resourceKey]
      || req.query?.[resourceKey];

    if (!resource || !resourceId) {
      return res.status(400).json({error: 'Recurso o identificador no proporcionado'});
    }

    try {
      const {rows} = await pool.query(
        `SELECT 1 FROM ${resource.table}
         WHERE ${resource.idColumn} = $1 AND empresa_prestadora_id = $2
         LIMIT 1`,
        [resourceId, req.user.service_company_id]
      );

      if (rows.length === 0) {
        return res.status(404).json({error: 'Recurso no encontrado en la empresa'});
      }
      next();
    } catch (error) {
      console.error('Error validando alcance de empresa:', error);
      return res.status(500).json({error: 'No se pudo validar el alcance de empresa'});
    }
  };
}

module.exports = requireCompanyScope;
