import React, { useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '../auth/useAuth';
import { COLORS } from '../constants/colors';

// 20 Pantallas de Fase 4
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import DashboardScreen from '../screens/DashboardScreen';
import ClientCompaniesScreen from '../screens/ClientCompaniesScreen';
import ClientCompanyDetailScreen from '../screens/ClientCompanyDetailScreen';
import MachinesScreen from '../screens/MachinesScreen';
import MachineDetailScreen from '../screens/MachineDetailScreen';
import CreateMachineScreen from '../screens/CreateMachineScreen';
import PartsScreen from '../screens/PartsScreen';
import PartDetailScreen from '../screens/PartDetailScreen';
import PartReviewScreen from '../screens/PartReviewScreen';
import CreateHoseScreen from '../screens/CreateHoseScreen';
import CreateLathePartScreen from '../screens/CreateLathePartScreen';
import CreateCylinderScreen from '../screens/CreateCylinderScreen';
import OrdersScreen from '../screens/OrdersScreen';
import CreateOrderScreen from '../screens/CreateOrderScreen';
import OrderDetailScreen from '../screens/OrderDetailScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import ReportsScreen from '../screens/ReportsScreen';
import UsersScreen from '../screens/UsersScreen';
import ProfileScreen from '../screens/ProfileScreen';

const AppNavigator = () => {
  const { user, token, isLoading } = useAuth();

  // Historial de navegación tipo pila: [{ name, params }]
  const [navStack, setNavStack] = useState([{ name: 'dashboard', params: {} }]);

  const currentRoute = navStack[navStack.length - 1] || { name: 'dashboard', params: {} };

  const navigate = (name, params = {}) => {
    setNavStack((prev) => [...prev, { name, params }]);
  };

  const goBack = () => {
    setNavStack((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
  };

  const resetTo = (name, params = {}) => {
    setNavStack([{ name, params }]);
  };

  if (currentRoute.name === 'register' && (!user || !token)) {
    return <RegisterScreen onNavigateToLogin={() => resetTo('login')} onRegisterSuccess={() => resetTo('login')} />;
  }

  // 1. Cargando sesión persistente
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.orange} />
      </View>
    );
  }

  // 2. Si no hay sesión activa, siempre mostrar LoginScreen
  if (!user || !token) {
    return <LoginScreen onNavigateToRegister={() => resetTo('register')} onLoginSuccess={() => resetTo('dashboard')} />;
  }

  // 3. Renderizado de la pantalla activa
  switch (currentRoute.name) {
    case 'dashboard':
      return (
        <DashboardScreen
          onNavigate={(target) => navigate(target)}
        />
      );

    case 'client_companies':
      return (
        <ClientCompaniesScreen
          onBack={goBack}
          onSelectCompany={(company) => navigate('client_company_detail', { company })}
        />
      );

    case 'client_company_detail':
      return (
        <ClientCompanyDetailScreen
          company={currentRoute.params.company}
          onBack={goBack}
          onSelectMachine={(machine) => navigate('machine_detail', { machine })}
        />
      );

    case 'machines':
      return (
        <MachinesScreen
          onBack={goBack}
          onSelectMachine={(machine) => navigate('machine_detail', { machine })}
          onNavigateCreateMachine={() => navigate('create_machine')}
        />
      );

    case 'machine_detail':
      return (
        <MachineDetailScreen
          machine={currentRoute.params.machine}
          onBack={goBack}
          onSelectPart={(part) => navigate('part_detail', { part })}
          onNavigateCreateHose={(machine) => navigate('create_hose', { machine })}
          onNavigateCreateLathe={(machine) => navigate('create_lathe', { machine })}
          onNavigateCreateCylinder={(machine) => navigate('create_cylinder', { machine })}
        />
      );

    case 'create_machine':
      return (
        <CreateMachineScreen
          onBack={goBack}
          onMachineCreated={() => {
            goBack();
          }}
        />
      );

    case 'parts':
      return (
        <PartsScreen
          onBack={goBack}
          onSelectPart={(part) => navigate('part_detail', { part })}
          onNavigateReview={(part) => navigate('part_review', { part })}
          onNavigateCreateHose={() => navigate('create_hose')}
          onNavigateCreateLathe={() => navigate('create_lathe')}
          onNavigateCreateCylinder={() => navigate('create_cylinder')}
        />
      );

    case 'part_detail':
      return (
        <PartDetailScreen
          part={currentRoute.params.part}
          onBack={goBack}
          onNavigateReview={(part) => navigate('part_review', { part })}
        />
      );

    case 'part_review':
      return (
        <PartReviewScreen
          part={currentRoute.params.part}
          onBack={goBack}
          onReviewCompleted={() => {
            goBack();
          }}
        />
      );

    case 'create_hose':
      return (
        <CreateHoseScreen
          initialMachine={currentRoute.params.machine}
          onBack={goBack}
          onPartCreated={(part) => {
            navigate('part_detail', { part });
          }}
        />
      );

    case 'create_lathe':
      return (
        <CreateLathePartScreen
          initialMachine={currentRoute.params.machine}
          onBack={goBack}
          onPartCreated={(part) => {
            navigate('part_detail', { part });
          }}
        />
      );

    case 'create_cylinder':
      return (
        <CreateCylinderScreen
          initialMachine={currentRoute.params.machine}
          onBack={goBack}
          onPartCreated={(part) => {
            navigate('part_detail', { part });
          }}
        />
      );

    case 'orders':
      return (
        <OrdersScreen
          onBack={goBack}
          onSelectOrder={(order) => navigate('order_detail', { order })}
          onNavigateCreateOrder={() => navigate('create_order')}
        />
      );

    case 'create_order':
      return (
        <CreateOrderScreen
          onBack={goBack}
          onOrderCreated={(order) => navigate('order_detail', { order })}
        />
      );

    case 'order_detail':
      return (
        <OrderDetailScreen
          order={currentRoute.params.order}
          onBack={goBack}
          onOrderUpdated={(updated) => {
            currentRoute.params.order = updated;
          }}
        />
      );

    case 'notifications':
      return (
        <NotificationsScreen
          onBack={goBack}
          onNavigateOrder={(ordenId) =>
            navigate('order_detail', { order: { id: ordenId, numero_orden: `OT #${ordenId}` } })
          }
          onNavigatePart={(piezaId) =>
            navigate('part_detail', { part: { id: piezaId, codigo: `PZ #${piezaId}` } })
          }
        />
      );

    case 'reports':
      return <ReportsScreen onBack={goBack} />;

    case 'users':
      return <UsersScreen onBack={goBack} />;

    case 'profile':
      return <ProfileScreen onBack={goBack} />;

    default:
      return (
        <DashboardScreen
          onNavigate={(target) => navigate(target)}
        />
      );
  }
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default AppNavigator;
