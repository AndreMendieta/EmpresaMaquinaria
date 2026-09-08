// src/services/authService.js
import api from './api';

export async function login({ companyCode, email, password }) {
  const data = await api.post('/auth/login', { companyCode, email, password });
  return data; // { ok, token, usuario }
}

export async function registerCompany({ companyCode, companyName, userName, email, password }) {
  const data = await api.post('/auth/register-company', {
    companyCode,
    companyName,
    userName,
    email,
    password,
  });
  return data; // { ok, token, usuario, message }
}

export async function registerUser({ companyCode, userName, email, password }) {
  const data = await api.post('/auth/register-user', {
    companyCode,
    userName,
    email,
    password,
  });
  return data; // { ok, token, usuario, message }
}

export async function verifyToken(token) {
  const data = await api.get('/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data; // { ok, usuario }
}
