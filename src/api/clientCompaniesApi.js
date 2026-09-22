import client from './client';

export async function getClientCompanies() {
  return client.get('/client-companies');
}

export async function createClientCompany({
  razonSocial,
  nombreComercial,
  identificacionFiscal,
  correo,
  telefono,
  direccion,
}) {
  return client.post('/client-companies', {
    razonSocial: razonSocial.trim(),
    nombreComercial: nombreComercial?.trim() || null,
    identificacionFiscal: identificacionFiscal?.trim() || null,
    correo: correo?.trim().toLowerCase() || null,
    telefono: telefono?.trim() || null,
    direccion: direccion?.trim() || null,
  });
}

export async function updateClientCompany(id, data) {
  return client.patch(`/client-companies/${id}`, data);
}

export async function deleteClientCompany(id) {
  return client.delete(`/client-companies/${id}`);
}
