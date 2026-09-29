import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import { getSession, saveSession, clearSession } from './session';
import { login as apiLogin, getMe } from '../api/authApi';
import { setClientToken, setOnSessionExpired } from '../api/client';

export const AuthContext = createContext({
  user: null,
  role: null,
  token: null,
  serviceCompanyId: null,
  isLoading: true,
  login: async () => {},
  logout: async () => {},
  refreshSession: async () => {},
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [role, setRole] = useState(null);
  const [serviceCompanyId, setServiceCompanyId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const applySession = useCallback((userData, authToken) => {
    setUser(userData);
    setToken(authToken);
    setRole(userData?.rol || null);
    setServiceCompanyId(userData?.empresa_prestadora_id || userData?.service_company_id || null);
    setClientToken(authToken);
  }, []);

  const logout = useCallback(async () => {
    setUser(null);
    setToken(null);
    setRole(null);
    setServiceCompanyId(null);
    setClientToken(null);
    await clearSession();
  }, []);

  useEffect(() => {
    setOnSessionExpired(() => {
      logout();
    });

    const initAuth = async () => {
      try {
        const persisted = await getSession();
        if (persisted?.token && persisted?.user) {
          applySession(persisted.user, persisted.token);
          // Opcionalmente refrescar datos con el backend
          try {
            const fresh = await getMe();
            if (fresh?.ok && fresh?.usuario) {
              applySession(fresh.usuario, persisted.token);
              await saveSession({ user: fresh.usuario, token: persisted.token });
            }
          } catch {
            // Si falla la red temporalmente pero el token es válido, se mantiene la sesión persistida
          }
        }
      } catch (err) {
        console.error('Error restaurando sesión:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, [applySession, logout]);

  const login = useCallback(
    async ({ correo, password }) => {
      const res = await apiLogin({ correo, password });
      if (res?.ok && res?.usuario && res?.token) {
        applySession(res.usuario, res.token);
        await saveSession({ user: res.usuario, token: res.token });
        return res;
      }
      throw new Error(res?.error || res?.message || 'Error al iniciar sesión.');
    },
    [applySession]
  );

  const refreshSession = useCallback(async () => {
    if (!token) return;
    try {
      const res = await getMe();
      if (res?.ok && res?.usuario) {
        applySession(res.usuario, token);
        await saveSession({ user: res.usuario, token });
      }
    } catch (e) {
      console.error('Error refrescando sesión:', e);
    }
  }, [token, applySession]);

  const value = useMemo(
    () => ({
      user,
      role,
      token,
      serviceCompanyId,
      isLoading,
      login,
      logout,
      refreshSession,
    }),
    [user, role, token, serviceCompanyId, isLoading, login, logout, refreshSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
