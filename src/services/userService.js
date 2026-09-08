// src/services/userService.js
import api from './api';

/**
 * Obtiene la lista de usuarios de la empresa del usuario autenticado.
 * Requiere rol 'admin' o 'supervisor'.
 */
export async function getUsers(token) {
  const data = await api.get('/users', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data; // { ok, usuarios: [...] }
}

/**
 * Crea un nuevo usuario en la empresa con rol ('admin', 'supervisor' o 'tecnico').
 * Requiere rol 'admin'.
 */
export async function createUser(token, { nombre, email, password, rol }) {
  const data = await api.post(
    '/users',
    { nombre, email, password, rol },
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return data; // { ok, message, usuario }
}

/**
 * Actualiza el rol o el estado (activo/inactivo) de un usuario.
 * Requiere rol 'admin'.
 */
export async function updateUser(token, userId, updateData) {
  const data = await api.patch(`/users/${userId}`, updateData, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data; // { ok, message, usuario }
}
