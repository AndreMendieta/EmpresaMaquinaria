import client from './client';

export async function getMachines() {
  return client.get('/machines');
}

export async function getMachineById(id) {
  return client.get(`/machines/${id}`);
}

export async function createMachine({
  empresaClienteId,
  codigo,
  nombre,
  tipo,
  numeroSerie,
  urlManual,
  descripcion,
}) {
  return client.post('/machines', {
    empresaClienteId: empresaClienteId || null,
    codigo: codigo.trim().toUpperCase(),
    nombre: nombre.trim(),
    tipo: tipo.trim(),
    numeroSerie: numeroSerie?.trim() || null,
    urlManual: urlManual?.trim() || null,
    descripcion: descripcion?.trim() || null,
  });
}

export async function updateMachine(id, data) {
  return client.patch(`/machines/${id}`, data);
}
