async function registrarAuditoria(client, { empresaId, usuarioId, accion, entidad, entidadId, detalle }) {
  await client.query(
    `INSERT INTO auditoria (empresa_id, usuario_id, accion, entidad, entidad_id, detalle)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [empresaId, usuarioId || null, accion, entidad, entidadId || null, detalle ? JSON.stringify(detalle) : null]
  );
}

module.exports = { registrarAuditoria };
