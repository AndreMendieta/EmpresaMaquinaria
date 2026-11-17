import client from './client';

export async function getMachines({ strict = false } = {}) {
  const res = await client.get('/machines');
  if (strict && !Array.isArray(res?.maquinas) && !Array.isArray(res?.maquinarias)) {
    throw new Error('El servidor devolvió datos de maquinaria inválidos.');
  }
  if (strict) {
    return {...res, maquinas: Array.isArray(res.maquinas) ? res.maquinas : res.maquinarias};
  }
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

export async function updateMachine(id, { nombre, tipo, numeroSerie, urlManual, descripcion }) {
  return client.patch(`/machines/${id}`, {
    nombre: nombre.trim(),
    tipo: tipo.trim(),
    numeroSerie: numeroSerie?.trim() || null,
    urlManual: urlManual?.trim() || null,
    descripcion: descripcion?.trim() || null,
  });
}
