// src/services/api.js
// Ajusta esta URL cuando despliegues el backend en otra máquina o entorno.
// Para preview/local en tu PC usa localhost; para Android emulator usa 10.0.2.2.
const API_URL = 'http://localhost:3000/api';

class ApiError extends Error {
  constructor(message, status, data = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
    Object.assign(this, data);
  }
}

async function request(path, options = {}) {
  const controller = new AbortController();
  const timeoutMs = options.timeout ?? 15000;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${API_URL}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
      signal: controller.signal,
      ...options,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new ApiError(data.message || 'Ocurrió un error inesperado.', response.status, data);
    }

    return data;
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new ApiError('La petición tardó demasiado. Verifica tu conexión e inténtalo de nuevo.', 408, {
        timeout: true,
      });
    }

    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(error?.message || 'Ocurrió un error inesperado.', 500, {});
  } finally {
    clearTimeout(timeoutId);
  }
}

export default {
  post: (path, body, options) =>
    request(path, { method: 'POST', body: JSON.stringify(body), ...options }),
  get: (path, options) => request(path, { method: 'GET', ...options }),
  patch: (path, body, options) =>
    request(path, { method: 'PATCH', body: JSON.stringify(body), ...options }),
};

export { ApiError };
