import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../auth/useAuth';
import HeaderBar from '../components/HeaderBar';
import Avatar from '../components/Avatar';
import Icon from '../components/Icon';
import { uploadFile } from '../api/filesApi';
import { updateMyPhoto, updateCompanyLogo } from '../api/authApi';
import { pickSingleImage } from '../utils/pickImage';
import { COLORS } from '../constants/colors';

const ProfileScreen = ({ onBack }) => {
  const { user, role, serviceCompanyId, logout, refreshSession, updateUser } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [savingImage, setSavingImage] = useState(false);
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

  // target: 'photo' (foto de perfil) | 'logo' (logo de la empresa, solo admin)
  const saveImage = async (target, source) => {
    setMsg('');
    setSavingImage(true);
    try {
      let url = null;
      if (source !== 'remove') {
        const file = await pickSingleImage(source);
        if (!file) return;
        url = (await uploadFile(file)).url;
      }
      const res = target === 'logo' ? await updateCompanyLogo(url) : await updateMyPhoto(url);
      await updateUser(res.usuario);
      setMsg(target === 'logo' ? 'Logo de la empresa actualizado.' : 'Foto de perfil actualizada.');
    } catch (err) {
      setMsg(err.message || 'No se pudo guardar la imagen.');
    } finally {
      setSavingImage(false);
    }
  };

  const chooseImage = (target) => {
    const current = target === 'logo' ? user?.empresa_logo_url : user?.foto_url;
    const buttons = [
      { text: 'Tomar foto', onPress: () => saveImage(target, 'camera') },
      { text: 'Elegir de la galería', onPress: () => saveImage(target, 'gallery') },
    ];
    if (current) {
      buttons.push({ text: 'Quitar', style: 'destructive', onPress: () => saveImage(target, 'remove') });
    }
    buttons.push({ text: 'Cancelar', style: 'cancel' });
    Alert.alert(target === 'logo' ? 'Logo de la empresa' : 'Foto de perfil', 'Selecciona una opción', buttons);
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
          <TouchableOpacity
            style={styles.avatarWrap}
            onPress={() => chooseImage('photo')}
            disabled={savingImage}>
            <Avatar uri={user?.foto_url} name={user?.nombre_completo || user?.nombre} size={96} />
            <View style={styles.cameraBadge}>
              {savingImage ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Icon name="camera" size={16} color="#FFF" />
              )}
            </View>
          </TouchableOpacity>
          <Text style={styles.avatarHint}>Toca para cambiar tu foto</Text>
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

          <View style={styles.companyRow}>
            <Avatar uri={user?.empresa_logo_url} name={user?.empresa_nombre} size={64} square />
            <View style={styles.companyInfo}>
              <Text style={styles.companyName}>{user?.empresa_nombre || 'Mi empresa'}</Text>
              <Text style={styles.avatarHint}>Este logo aparece en el encabezado de los reportes PDF.</Text>
              {role === 'admin' ? (
                <TouchableOpacity
                  style={styles.logoBtn}
                  onPress={() => chooseImage('logo')}
                  disabled={savingImage}>
                  <Icon name="gallery" size={16} color={COLORS.orange} />
                  <Text style={styles.logoBtnText}>
                    {user?.empresa_logo_url ? 'Cambiar logo' : 'Subir logo'}
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>ID Empresa Prestadora:</Text>
            <Text style={styles.rowValue}>#{serviceCompanyId || '1'}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Empresa Activa:</Text>
            <Text style={styles.rowValue}>{user?.empresa_nombre || 'HydroTech S.A.S.'}</Text>
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
    borderLeftWidth: 4,
    borderLeftColor: COLORS.orange,
    borderRadius: 4,
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
  avatarWrap: {
    marginBottom: 6,
  },
  cameraBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.orange,
    borderWidth: 2,
    borderColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarHint: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginBottom: 8,
  },
  companyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingBottom: 12,
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  companyInfo: {
    flex: 1,
  },
  companyName: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  logoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    minHeight: 38,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.orange,
  },
  logoBtnText: {
    color: COLORS.orange,
    fontSize: 13,
    fontWeight: '700',
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
