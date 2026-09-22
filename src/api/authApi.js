import client from './client';

export async function login({ serviceCompanyId = 1, correo, email, password }) {
  const cleanEmail = (correo || email || '').trim().toLowerCase();
  return client.post('/auth/login', {
    serviceCompanyId: String(serviceCompanyId).trim(),
    correo: cleanEmail,
    password,
  });
}

export async function register({ razonSocialEmpresa, nombreCompleto, correo, password, rol = 'admin' }) {
  return client.post('/auth/register', {
    razonSocial: (razonSocialEmpresa || '').trim(),
    nombre: (nombreCompleto || '').trim(),
    correo: (correo || '').trim().toLowerCase(),
    password,
    rol,
  });
}

export async function getMe() {
  return client.get('/auth/me');
}
