import client from './client';

export async function login({ serviceCompanyId, correo, email, password }) {
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

export async function verifyEmail({ serviceCompanyId, correo, codigo }) {
  return client.post('/auth/verify-email', {
    serviceCompanyId: serviceCompanyId ? String(serviceCompanyId).trim() : null,
    correo: (correo || '').trim().toLowerCase(),
    codigo: String(codigo || '').trim(),
  });
}

export async function resendVerification({ serviceCompanyId, correo }) {
  return client.post('/auth/resend-verification', {
    serviceCompanyId: serviceCompanyId ? String(serviceCompanyId).trim() : null,
    correo: (correo || '').trim().toLowerCase(),
  });
}

export async function forgotPassword({ serviceCompanyId, correo }) {
  return client.post('/auth/forgot-password', {
    serviceCompanyId: serviceCompanyId ? String(serviceCompanyId).trim() : null,
    correo: (correo || '').trim().toLowerCase(),
  });
}

export async function resetPassword({ serviceCompanyId, correo, codigo, nuevaPassword }) {
  return client.post('/auth/reset-password', {
    serviceCompanyId: serviceCompanyId ? String(serviceCompanyId).trim() : null,
    correo: (correo || '').trim().toLowerCase(),
    codigo: String(codigo || '').trim(),
    nuevaPassword,
  });
}

export async function recoverUser({ correo }) {
  return client.post('/auth/recover-user', {
    correo: (correo || '').trim().toLowerCase(),
  });
}

export async function getMe() {
  return client.get('/auth/me');
}
