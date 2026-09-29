import React from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
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
      title: 'Maquinaria y Equipos',
      desc: 'Consulta de equipos autorizados, series y manuales en línea.',
      badge: 'HU-015',
      icon: '🚜',
      visible: true,
    },
    {
      id: 'parts',
      title: 'Catálogo y Fichas de Piezas',
      desc: 'Mangueras, piezas de torno, cilindros y fichas técnicas.',
      badge: 'HU-014',
      icon: '⚙️',
      visible: true,
    },
    {
      id: 'orders',
      title: 'Órdenes de Trabajo',
      desc: 'Seguimiento de servicios de mantenimiento y asignaciones.',
      badge: 'ORD',
      icon: '📋',
      visible: true,
    },
    {
      id: 'client_companies',
      title: 'Empresas Clientes',
      desc: 'Empresas contratantes de servicios y flotas asociadas.',
      badge: 'CLIENTES',
      icon: '🏢',
      visible: true,
    },
    {
      id: 'notifications',
      title: 'Bandeja de Notificaciones',
      desc: 'Alertas de piezas por aprobar, rechazos y asignaciones.',
      badge: 'ALERTAS',
      icon: '🔔',
      visible: true,
    },
    {
      id: 'reports',
      title: 'Reportes y Métricas',
      desc: 'Indicadores de producción, estados de piezas y órdenes.',
      badge: 'MÉTRICAS',
      icon: '📊',
      visible: isAdmin || isSupervisor,
    },
    {
      id: 'users',
      title: 'Gestión de Personal',
      desc: 'Alta de colaboradores, asignación de roles y estados.',
      badge: 'ADMIN',
      icon: '👥',
      visible: isAdmin,
    },
    {
      id: 'profile',
      title: 'Mi Perfil y Configuración',
      desc: 'Detalles de la cuenta y empresa prestadora.',
      badge: 'CUENTA',
      icon: '👤',
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
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.cardIcon}>{item.icon}</Text>
                  <View style={styles.cardBadge}>
                    <Text style={styles.cardBadgeText}>{item.badge}</Text>
                  </View>
                </View>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardDesc}>{item.desc}</Text>
                <Text style={styles.cardAction}>Ingresar →</Text>
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
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.silver,
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  gridContainer: {
    gap: 12,
  },
  cardItem: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 16,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardIcon: {
    fontSize: 22,
  },
  cardBadge: {
    backgroundColor: 'rgba(255, 106, 0, 0.12)',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 106, 0, 0.3)',
  },
  cardBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.orange,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  cardDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
    lineHeight: 16,
  },
  cardAction: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.orange,
    marginTop: 10,
  },
});

export default DashboardScreen;
