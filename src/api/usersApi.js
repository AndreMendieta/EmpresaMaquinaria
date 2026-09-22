import client from './client';

export async function getUsers() {
  return client.get('/users');
}

export async function createUser({
  empresaClienteId,
  nombreCompleto,
  correo,
  password,
  rol,
}) {
  return client.post('/users', {
    empresaClienteId: empresaClienteId || null,
    nombreCompleto: nombreCompleto.trim(),
    correo: correo.trim().toLowerCase(),
    password,
    rol,
  });
}

export async function updateUser(id, data) {
  return client.patch(`/users/${id}`, data);
}
