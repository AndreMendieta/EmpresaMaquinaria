import React, {useEffect, useState} from 'react';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import DashboardScreen from '../screens/DashboardScreen';
import {verifyToken} from '../services/authService';
import {getSession, saveSession, clearSession} from '../services/session';

const AppNavigator = () => {
  const [currentScreen, setCurrentScreen] = useState('login');
  const [currentUser, setCurrentUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loadingSession, setLoadingSession] = useState(true);

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const session = await getSession();

        if (!session?.token) {
          return;
        }

        const data = await verifyToken(session.token);
        const user = data?.usuario || session.user;

        if (user) {
          setCurrentUser(user);
          setToken(session.token);
          setCurrentScreen('dashboard');
        } else {
          await clearSession();
          setCurrentScreen('login');
        }
      } catch (error) {
        console.warn('No se pudo restaurar la sesión:', error);
        await clearSession();
        setCurrentScreen('login');
      } finally {
        setLoadingSession(false);
      }
    };

    restoreSession();
  }, []);

  const handleAuthSuccess = async (userData, authToken) => {
    setCurrentUser(userData);
    setToken(authToken);
    await saveSession({user: userData, token: authToken});
    setCurrentScreen('dashboard');
  };

  const handleLogout = async () => {
    setCurrentUser(null);
    setToken(null);
    await clearSession();
    setCurrentScreen('login');
  };

  if (loadingSession) {
    return null;
  }

  if (currentScreen === 'dashboard' && currentUser) {
    return (
      <DashboardScreen
        user={currentUser}
        token={token}
        onLogout={handleLogout}
      />
    );
  }

  if (currentScreen === 'register') {
    return (
      <RegisterScreen
        onNavigateToLogin={() => setCurrentScreen('login')}
        onRegisterSuccess={handleAuthSuccess}
      />
    );
  }

  return (
    <LoginScreen
      onNavigateToRegister={() => setCurrentScreen('register')}
      onLoginSuccess={handleAuthSuccess}
    />
  );
};

export default AppNavigator;
