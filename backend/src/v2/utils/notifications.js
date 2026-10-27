const pool = require('../../db/pool');

async function crearNotificacion({empresaPrestadoraId, usuarioId, ordenId, piezaId, titulo, mensaje}) {
  await pool.query(
    `INSERT INTO notificaciones_multiempresa
      (empresa_prestadora_id, usuario_id, orden_id, pieza_id, titulo, mensaje)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [empresaPrestadoraId, usuarioId || null, ordenId || null, piezaId || null, titulo, mensaje]
  );
}

module.exports = {crearNotificacion};
