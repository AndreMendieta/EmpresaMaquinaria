import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../auth/useAuth';
import HeaderBar from '../components/HeaderBar';
import { COLORS } from '../constants/colors';

const DashboardScreen = ({ onNavigate }) => {
  const { user, role, serviceCompanyId, logout } = useAuth();

  const isAdmin = role === 'admin';
  const isSupervisor = role === 'supervisor';

  const menuItems = [
    {
      id: 'machines',
      icon: '🚜',
      title: 'Maquinaria y Equipos',
      desc: 'Consulta de equipos autorizados, series y manuales en línea.',
      badge: 'HU-015',
      visible: true,
    },
    {
      id: 'parts',
      icon: '🔩',
      title: 'Catálogo y Fichas de Piezas',
      desc: 'Mangueras, piezas de torno, cilindros y fichas técnicas.',
      badge: 'HU-014',
      visible: true,
    },
    {
      id: 'orders',
      icon: '📋',
      title: 'Órdenes de Trabajo',
      desc: 'Seguimiento de servicios de mantenimiento y asignaciones.',
      badge: 'ORD',
      visible: true,
    },
    {
      id: 'client_companies',
      icon: '🏢',
      title: 'Empresas Clientes',
      desc: 'Empresas contratantes de servicios y flotas asociadas.',
      badge: 'CLIENTES',
      visible: true,
    },
    {
      id: 'notifications',
      icon: '🔔',
      title: 'Bandeja de Notificaciones',
      desc: 'Alertas de piezas por aprobar, rechazos y asignaciones.',
      badge: 'ALERTAS',
      visible: true,
    },
    {
      id: 'reports',
      icon: '📊',
      title: 'Reportes y Métricas',
      desc: 'Indicadores de producción, estados de piezas y órdenes.',
      badge: 'MÉTRICAS',
      visible: isAdmin || isSupervisor,
    },
    {
      id: 'users',
      icon: '👥',
      title: 'Gestión de Personal',
      desc: 'Alta de colaboradores, asignación de roles y estados.',
      badge: 'ADMIN',
      visible: isAdmin,
    },
    {
      id: 'profile',
      icon: '👤',
      title: 'Mi Perfil y Configuración',
      desc: 'Detalles de la cuenta y empresa prestadora.',
      badge: 'CUENTA',
      visible: true,
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <HeaderBar
        title="Panel Principal"
        subtitle={`Empresa Prestadora #${serviceCompanyId || 1}`}
        role={role}
        onRightAction={logout}
        rightActionLabel="Salir"
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Tarjeta de bienvenida */}
        <View style={styles.welcomeCard}>
          <Text style={styles.welcomeGreeting}>Bienvenido al Sistema,</Text>
          <Text style={styles.welcomeName}>{user?.nombre_completo || user?.nombre || 'Colaborador'}</Text>
          <Text style={styles.welcomeEmail}>{user?.correo || user?.email}</Text>
        </View>

        {/* Sección de módulos */}
        <Text style={styles.sectionHeader}>MÓDULOS DEL SISTEMA</Text>

        <View style={styles.gridContainer}>
          {menuItems
            .filter((item) => item.visible)
            .map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.cardItem}
                activeOpacity={0.8}
                onPress={() => onNavigate(item.id)}>
                <Text style={styles.cardIcon}>{item.icon}</Text>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardDesc} numberOfLines={3}>{item.desc}</Text>
              </TouchableOpacity>
            ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  welcomeCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
  },
  welcomeGreeting: {
    fontSize: 12,
    color: COLORS.silver,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  welcomeName: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  welcomeEmail: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.silver,
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },
  cardItem: {
    width: '48%',
    minHeight: 150,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.orangeDim,
    borderRadius: 16,
    padding: 14,
  },
  cardIcon: {
    fontSize: 38,
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  cardDesc: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },
});

export default DashboardScreen;
