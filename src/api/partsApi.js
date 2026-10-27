import client from './client';

export async function getParts() {
  return client.get('/parts');
}

export async function createPart({
  maquinariaId,
  codigo,
  nombre,
  tipo,
  descripcion,
  fotos = [],
  subtipo = {},
}) {
  return client.post('/parts', {
    maquinariaId,
    codigo: codigo.trim().toUpperCase(),
    nombre: nombre.trim(),
    tipo, // 'manguera' | 'torno' | 'cilindro'
    descripcion: descripcion?.trim() || null,
    fotos,
    subtipo,
  });
}

export async function submitPart(id) {
  return client.patch(`/parts/${id}/submit`);
}

export async function approvePart(id) {
  return client.post(`/parts/${id}/approve`);
}

export async function rejectPart(id) {
  return client.post(`/parts/${id}/reject`);
}
