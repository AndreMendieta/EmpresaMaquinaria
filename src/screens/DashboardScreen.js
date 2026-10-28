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
import Icon from '../components/Icon';
import { COLORS } from '../constants/colors';

const DashboardScreen = ({ onNavigate }) => {
  const { user, role, serviceCompanyId, logout } = useAuth();

  const isAdmin = role === 'admin';
  const isSupervisor = role === 'supervisor';

  const menuItems = [
    {
      id: 'machines',
      icon: 'machines',
      title: 'Maquinaria y Equipos',
      desc: 'Consulta de equipos autorizados, series y manuales en línea.',
      badge: 'HU-015',
      visible: true,
    },
    {
      id: 'parts',
      icon: 'parts',
      title: 'Catálogo y Fichas de Piezas',
      desc: 'Mangueras, piezas de torno, cilindros y fichas técnicas.',
      badge: 'HU-014',
      visible: true,
    },
    {
      id: 'orders',
      icon: 'orders',
      title: 'Órdenes de Trabajo',
      desc: 'Seguimiento de servicios de mantenimiento y asignaciones.',
      badge: 'ORD',
      visible: true,
    },
    {
      id: 'client_companies',
      icon: 'client_companies',
      title: 'Empresas Clientes',
      desc: 'Empresas contratantes de servicios y flotas asociadas.',
      badge: 'CLIENTES',
      visible: true,
    },
    {
      id: 'notifications',
      icon: 'notifications',
      title: 'Bandeja de Notificaciones',
      desc: 'Alertas de piezas por aprobar, rechazos y asignaciones.',
      badge: 'ALERTAS',
      visible: true,
    },
    {
      id: 'reports',
      icon: 'reports',
      title: 'Reportes y Métricas',
      desc: 'Indicadores de producción, estados de piezas y órdenes.',
      badge: 'MÉTRICAS',
      visible: isAdmin || isSupervisor,
    },
    {
      id: 'users',
      icon: 'users',
      title: 'Gestión de Personal',
      desc: 'Alta de colaboradores, asignación de roles y estados.',
      badge: 'ADMIN',
      visible: isAdmin,
    },
    {
      id: 'profile',
      icon: 'profile',
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
                <View style={styles.iconWrap}>
                  <Icon name={item.icon} size={30} />
                </View>
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
    borderLeftWidth: 4,
    borderLeftColor: COLORS.orange,
    borderRadius: 4,
    padding: 16,
    marginBottom: 20,
  },
  welcomeGreeting: {
    fontSize: 11,
    color: COLORS.silver,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  welcomeName: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.textPrimary,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  welcomeEmail: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.orange,
    letterSpacing: 1.5,
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
    borderColor: COLORS.border,
    borderTopWidth: 3,
    borderTopColor: COLORS.orange,
    borderRadius: 4,
    padding: 14,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 106, 0, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255, 106, 0, 0.30)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  cardDesc: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },
});

export default DashboardScreen;
