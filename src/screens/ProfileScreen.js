import React, { useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../auth/useAuth';
import HeaderBar from '../components/HeaderBar';
import { COLORS } from '../constants/colors';

const ProfileScreen = ({ onBack }) => {
  const { user, role, serviceCompanyId, logout, refreshSession } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [msg, setMsg] = useState('');

  const handleRefresh = async () => {
    setRefreshing(true);
    setMsg('');
    try {
      await refreshSession();
      setMsg('Sesión sincronizada exitosamente con el servidor.');
    } catch {
      setMsg('No se pudo sincronizar la sesión.');
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <HeaderBar title="Mi Perfil" role={role} onBack={onBack} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {msg ? (
          <View style={styles.msgBox}>
            <Text style={styles.msgText}>{msg}</Text>
          </View>
        ) : null}

        {/* Tarjeta de Identidad */}
        <View style={styles.avatarCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitial}>
              {(user?.nombre_completo || user?.nombre || 'U').charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.userName}>
            {user?.nombre_completo || user?.nombre || 'Usuario Conectado'}
          </Text>
          <Text style={styles.userEmail}>{user?.correo || user?.email || 'Sin correo'}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>{(role || 'invitado').toUpperCase()}</Text>
          </View>
        </View>

        {/* Datos Corporativos Multiempresa */}
        <View style={styles.infoCard}>
          <Text style={styles.sectionTitle}>Alcance de Empresa (Multiempresa)</Text>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>ID Empresa Prestadora:</Text>
            <Text style={styles.rowValue}>#{serviceCompanyId || '1'}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Empresa Activa:</Text>
            <Text style={styles.rowValue}>HydroTech S.A.S.</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Nivel de Privilegios:</Text>
            <Text style={styles.rowValue}>
              {role === 'admin'
                ? 'Administrador General'
                : role === 'supervisor'
                ? 'Supervisor de Taller / Calidad'
                : 'Técnico Especialista de Campo'}
            </Text>
          </View>
        </View>

        {/* Acciones de Sesión */}
        <View style={styles.actionCard}>
          <Text style={styles.sectionTitle}>Acciones de Cuenta</Text>

          <TouchableOpacity
            style={styles.btnSecondary}
            disabled={refreshing}
            onPress={handleRefresh}>
            {refreshing ? (
              <ActivityIndicator size="small" color={COLORS.textPrimary} />
            ) : (
              <Text style={styles.btnSecondaryText}>Sincronizar Credenciales</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.btnLogout}
            onPress={logout}>
            <Text style={styles.btnLogoutText}>Cerrar Sesión Segura</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.versionFooter}>
          <Text style={styles.versionText}>HydroTech Mobile v2.0 • Arquitectura Multiempresa</Text>
          <Text style={styles.versionSubtext}>Seguridad JWT + Scope por Empresa Prestadora</Text>
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
    gap: 16,
  },
  msgBox: {
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.35)',
    borderRadius: 8,
    padding: 10,
  },
  msgText: {
    color: '#38BDF8',
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '600',
  },
  avatarCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  avatarCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255, 106, 0, 0.15)',
    borderWidth: 2,
    borderColor: COLORS.orange,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarInitial: {
    color: COLORS.orange,
    fontSize: 28,
    fontWeight: '800',
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  userEmail: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  roleBadge: {
    backgroundColor: COLORS.orange,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 10,
  },
  roleBadgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '800',
  },
  infoCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.orange,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  rowLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  rowValue: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  actionCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 16,
    gap: 10,
  },
  btnSecondary: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnSecondaryText: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  btnLogout: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: COLORS.danger,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnLogoutText: {
    color: COLORS.danger,
    fontSize: 13,
    fontWeight: '700',
  },
  versionFooter: {
    alignItems: 'center',
    marginTop: 12,
  },
  versionText: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  versionSubtext: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 2,
  },
});

export default ProfileScreen;
