import api from './api';

export async function getMaquinas(token, query = '') {
  const path = query && query.trim()
    ? `/maquinas?query=${encodeURIComponent(query.trim())}`
    : '/maquinas';

  return api.get(path, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function getMaquinaById(token, id) {
  return api.get(`/maquinas/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function createMaquina(token, { codigo, nombre, tipo, manualUrl, descripcion, confirmarDuplicado }) {
  return api.post(
    '/maquinas',
    { codigo, nombre, tipo, manualUrl, descripcion, confirmarDuplicado },
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
}
