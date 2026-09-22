import client from './client';

export async function getOrders() {
  return client.get('/orders');
}

export async function createOrder({
  empresaClienteId,
  maquinariaId,
  titulo,
  descripcion,
  prioridad = 'normal',
  asignadaA,
}) {
  return client.post('/orders', {
    empresaClienteId: empresaClienteId || null,
    maquinariaId: maquinariaId || null,
    titulo: titulo.trim(),
    descripcion: descripcion?.trim() || null,
    prioridad,
    asignadaA: asignadaA || null,
  });
}

export async function assignOrder(id, usuarioId) {
  return client.patch(`/orders/${id}/assign`, { usuarioId });
}

export async function updateOrderProgress(id, estado) {
  return client.patch(`/orders/${id}/progress`, { estado });
}
