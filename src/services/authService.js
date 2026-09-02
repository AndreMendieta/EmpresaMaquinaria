// src/services/authService.js
import api from './api';

export async function login({ companyCode, email, password }) {
  // Lanza un Error si las credenciales son inválidas o hay problema de red;
  // LoginScreen se encarga de mostrar el mensaje.
  const data = await api.post('/auth/login', { companyCode, email, password });
  return data; // { ok, token, usuario }
}

export async function verifyToken(token) {
  const data = await api.get('/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data; // { ok, usuario }
}
