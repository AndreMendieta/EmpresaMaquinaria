import React, {useEffect, useState} from 'react';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import MaquinariaListScreen from '../screens/MaquinariaListScreen';
import MaquinariaDetailScreen from '../screens/MaquinariaDetailScreen';
import PiezaFormScreen from '../screens/PiezaFormScreen';
import NotificacionesScreen from '../screens/NotificacionesScreen';
import {verifyToken} from '../services/authService';
import {getSession, saveSession, clearSession} from '../services/session';
import {setSessionExpiredHandler} from '../services/api';

const AppNavigator = () => {
  const [currentScreen, setCurrentScreen] = useState('login');
  const [currentUser, setCurrentUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [sessionMessage, setSessionMessage] = useState('');
  const [selectedMaquina, setSelectedMaquina] = useState(null);
  const [previousScreen, setPreviousScreen] = useState('maquinaria');

  useEffect(() => {
    const unregisterSessionHandler = setSessionExpiredHandler(() => {
      setCurrentUser(null);
      setToken(null);
      setSessionMessage('Tu sesión expiró, inicia sesión de nuevo.');
      setCurrentScreen('login');
    });

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
          setCurrentScreen('maquinaria');
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
    return unregisterSessionHandler;
  }, []);

  const handleAuthSuccess = async (userData, authToken) => {
    setCurrentUser(userData);
    setToken(authToken);
    await saveSession({user: userData, token: authToken});
    setSessionMessage('');
    setCurrentScreen('maquinaria');
  };

  const handleLogout = async () => {
    setCurrentUser(null);
    setToken(null);
    await clearSession();
    setSessionMessage('');
    setCurrentScreen('login');
  };

  if (loadingSession) {
    return null;
  }

  if (currentUser && currentScreen === 'maquinaria') {
    return (
      <MaquinariaListScreen
        user={currentUser}
        token={token}
        onLogout={handleLogout}
        onSelectMaquina={(maquina) => {
          setSelectedMaquina(maquina);
          setCurrentScreen('detalle');
        }}
        onOpenNotificaciones={() => setCurrentScreen('notificaciones')}
      />
    );
  }

  if (currentUser && currentScreen === 'detalle') {
    return (
      <MaquinariaDetailScreen
        user={currentUser}
        token={token}
        maquina={selectedMaquina}
        onBack={() => setCurrentScreen(previousScreen)}
        onLogout={handleLogout}
        onOpenPiezaForm={() => {
          setPreviousScreen('detalle');
          setCurrentScreen('pieza');
        }}
      />
    );
  }

  if (currentUser && currentScreen === 'pieza') {
    return (
      <PiezaFormScreen
        user={currentUser}
        token={token}
        maquina={selectedMaquina}
        onBack={() => setCurrentScreen('detalle')}
        onLogout={handleLogout}
        onSaved={() => setCurrentScreen('detalle')}
      />
    );
  }

  if (currentUser && currentScreen === 'notificaciones') {
    return (
      <NotificacionesScreen
        user={currentUser}
        token={token}
        onBack={() => setCurrentScreen('maquinaria')}
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
      initialMessage={sessionMessage}
    />
  );
};

export default AppNavigator;
