// src/services/api.js
// URL dinámica según el entorno:
// - Browsers y preview local: http://localhost:3000/api
// - Android Emulator: http://10.0.2.2:3000/api
// - Dispositivo real en la misma red: http://<TU_IP_LOCAL>:3000/api
import {clearSession} from './session';

let sessionExpiredHandler = null;

export function setSessionExpiredHandler(handler) {
  sessionExpiredHandler = handler;
  return () => {
    if (sessionExpiredHandler === handler) {
      sessionExpiredHandler = null;
    }
  };
}

const getApiUrl = () => {
  const isAndroid = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);
  const isWeb = typeof window !== 'undefined' && window.location && window.location.protocol;

  if (isAndroid) {
    return 'http://10.0.2.2:3000/api';
  }

  if (isWeb) {
    return 'http://localhost:3000/api';
  }

  return 'http://localhost:3000/api';
};

const API_URL = getApiUrl();

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
    const isMultipart = typeof FormData !== 'undefined' && options.body instanceof FormData;
    const response = await fetch(`${API_URL}${path}`, {
      headers: isMultipart
        ? {...(options.headers || {})}
        : {'Content-Type': 'application/json', ...(options.headers || {})},
      signal: controller.signal,
      ...options,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      if (response.status === 401) {
        await clearSession();
        if (sessionExpiredHandler) {
          sessionExpiredHandler();
        }
      }
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
  upload: (path, formData, options = {}) =>
    request(path, {
      method: 'POST',
      body: formData,
      ...options,
      headers: {
        ...(options.headers || {}),
      },
    }),
};

export { ApiError };
