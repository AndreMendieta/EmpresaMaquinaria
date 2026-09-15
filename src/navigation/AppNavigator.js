import React, {useEffect, useState} from 'react';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import DashboardScreen from '../screens/DashboardScreen';
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
        if (session?.token && session?.user) {
          setCurrentUser(session.user);
          setToken(session.token);
          setCurrentScreen('dashboard');
        }
      } catch (error) {
        console.warn('No se pudo restaurar la sesión:', error);
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
