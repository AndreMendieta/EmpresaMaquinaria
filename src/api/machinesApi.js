import client from './client';

export async function getMachines() {
  const res = await client.get('/machines');
  return {...res, maquinas: res?.maquinas || res?.maquinarias || []};
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
