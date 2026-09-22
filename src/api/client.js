// src/api/client.js
import { getSession, clearSession } from '../auth/session';

let onSessionExpiredCallback = null;

export function setOnSessionExpired(callback) {
  onSessionExpiredCallback = callback;
}

const getBaseUrl = () => {
  const isAndroid = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);
  const isWeb = typeof window !== 'undefined' && window.location && window.location.protocol;

  if (isAndroid) {
    return 'http://10.0.2.2:3000/api/v2';
  }
  if (isWeb) {
    return 'http://localhost:3000/api/v2';
  }
  return 'http://localhost:3000/api/v2';
};

const BASE_URL = getBaseUrl();

export class ApiError extends Error {
  constructor(message, status, data = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
    this.isForbidden = status === 403;
    this.isUnauthorized = status === 401;
    this.isNotFound = status === 404;
  }
}

let inMemoryToken = null;

export function setClientToken(token) {
  inMemoryToken = token;
}

async function resolveToken(explicitToken) {
  if (explicitToken) return explicitToken;
  if (inMemoryToken) return inMemoryToken;
  const session = await getSession();
  return session?.token || null;
}

async function request(path, options = {}) {
  const controller = new AbortController();
  const timeoutMs = options.timeout ?? 15000;
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const token = await resolveToken(options.token);
  const isMultipart = typeof FormData !== 'undefined' && options.body instanceof FormData;

  const headers = {
    ...(isMultipart ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  try {
    const response = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      if (response.status === 401) {
        await clearSession();
        setClientToken(null);
        if (onSessionExpiredCallback) {
          onSessionExpiredCallback();
        }
      }

      let message = data.error || data.message || 'Error en la solicitud.';
      if (response.status === 403) {
        message = data.error || 'No tienes permisos para realizar esta acción (403 Prohibido).';
      }

      throw new ApiError(message, response.status, data);
    }

    return data;
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new ApiError('La solicitud superó el tiempo de espera. Revisa tu conexión.', 408, {
        timeout: true,
      });
    }
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(error?.message || 'Error de conexión con el servidor.', 500, {});
  } finally {
    clearTimeout(timer);
  }
}

const client = {
  get: (path, options = {}) => request(path, { method: 'GET', ...options }),
  post: (path, body, options = {}) =>
    request(path, { method: 'POST', body: JSON.stringify(body), ...options }),
  patch: (path, body, options = {}) =>
    request(path, { method: 'PATCH', body: JSON.stringify(body), ...options }),
  delete: (path, options = {}) => request(path, { method: 'DELETE', ...options }),
  upload: (path, formData, options = {}) =>
    request(path, {
      method: 'POST',
      body: formData,
      ...options,
    }),
};

export default client;
