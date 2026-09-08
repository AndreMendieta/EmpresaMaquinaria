import React, {useState} from 'react';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import DashboardScreen from '../screens/DashboardScreen';

/**
 * AppNavigator gestiona las transiciones de pantalla en la app:
 * - 'login'
 * - 'register'
 * - 'dashboard' (con datos del usuario y rol autenticado)
 */
const AppNavigator = () => {
  const [currentScreen, setCurrentScreen] = useState('login');
  const [currentUser, setCurrentUser] = useState(null);
  const [token, setToken] = useState(null);

  const handleAuthSuccess = (userData, authToken) => {
    setCurrentUser(userData);
    setToken(authToken);
    setCurrentScreen('dashboard');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setToken(null);
    setCurrentScreen('login');
  };

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
