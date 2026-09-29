const pool = require('../../db/pool');

async function registrarAuditoria({
  empresaPrestadoraId,
  usuarioId,
  accion,
  entidad,
  entidadId,
  detalle,
}) {
  await pool.query(
    `INSERT INTO registros_auditoria
      (empresa_prestadora_id, usuario_id, accion, entidad, entidad_id, detalle)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      empresaPrestadoraId,
      usuarioId || null,
      accion,
      entidad,
      entidadId || null,
      detalle ? JSON.stringify(detalle) : null,
    ]
  );
}

module.exports = {registrarAuditoria};
