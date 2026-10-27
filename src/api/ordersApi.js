import client from './client';

export async function getOrders() {
  return client.get('/orders');
}

export async function getOrderById(id) {
  return client.get(`/orders/${id}`);
}

export async function updateOrder(id, data) {
  return client.patch(`/orders/${id}`, data);
}

export async function createOrder({
  empresaClienteId,
  maquinariaId,
  titulo,
  descripcion,
  prioridad = 'normal',
  asignadaA,
  evidencias = [],
}) {
  return client.post('/orders', {
    empresaClienteId: empresaClienteId || null,
    maquinariaId: maquinariaId || null,
    titulo: titulo.trim(),
    descripcion: descripcion?.trim() || null,
    prioridad,
    asignadaA: asignadaA || null,
    evidencias,
  });
}

export async function assignOrder(id, usuarioId) {
  return client.patch(`/orders/${id}/assign`, { usuarioId });
}

export async function updateOrderProgress(id, estado) {
  return client.patch(`/orders/${id}/progress`, { estado });
}

export async function addOrderEvidence(id, { url, descripcion, etapa = 'despues' }) {
  return client.post(`/orders/${id}/evidencias`, {
    url: url?.trim() || null,
    descripcion: descripcion?.trim() || '',
    etapa,
  });
}
