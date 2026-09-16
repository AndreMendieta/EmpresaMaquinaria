import api from './api';

export async function getPiezas(token, { maquinaId, query } = {}) {
  const params = [];
  if (maquinaId) params.push(`maquinaId=${encodeURIComponent(maquinaId)}`);
  if (query && query.trim()) params.push(`query=${encodeURIComponent(query.trim())}`);

  const qs = params.length > 0 ? `?${params.join('&')}` : '';
  return api.get(`/piezas${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function getPiezaById(token, id) {
  return api.get(`/piezas/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function createPieza(token, { maquinaId, codigo, nombre, tipo, medidas, descripcion, fotos }) {
  return api.post(
    '/piezas',
    { maquinaId, codigo, nombre, tipo, medidas, descripcion, fotos },
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
}

export async function uploadPiezaFoto(token, piezaId, asset) {
  const formData = new FormData();
  formData.append('foto', {
    uri: asset.uri,
    type: asset.type || 'image/jpeg',
    name: asset.fileName || `pieza-${piezaId}.jpg`,
  });

  return api.upload(`/piezas/${piezaId}/fotos`, formData, {
    headers: {Authorization: `Bearer ${token}`},
  });
}

export async function validarPieza(token, id, estado) {
  return api.patch(
    `/piezas/${id}/validar`,
    { estado },
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
}

export async function getNotificaciones(token) {
  return api.get('/notificaciones', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function marcarNotificacionLeida(token, id) {
  return api.patch(`/notificaciones/${id}/leida`, {}, {
    headers: { Authorization: `Bearer ${token}` },
  });
}
