// src/services/api.js
//
// Cambia esta URL cuando despliegues el backend en producción:
// const API_URL = 'https://empresamaquinaria-api.onrender.com/api';
//
// Para desarrollo local con el emulador de Android, 10.0.2.2 apunta
// al "localhost" de tu computador (no uses "localhost" directamente).
const API_URL = 'http://10.0.2.2:3000/api';

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || 'Ocurrió un error inesperado.');
  }

  return data;
}

export default {
  post: (path, body, options) =>
    request(path, { method: 'POST', body: JSON.stringify(body), ...options }),
  get: (path, options) => request(path, { method: 'GET', ...options }),
  patch: (path, body, options) =>
    request(path, { method: 'PATCH', body: JSON.stringify(body), ...options }),
};
