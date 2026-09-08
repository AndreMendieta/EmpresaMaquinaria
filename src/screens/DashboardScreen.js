import React, {useState, useEffect, useCallback} from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';

import CustomInput from '../components/CustomInput';
import PrimaryButton from '../components/PrimaryButton';
import {getUsers, createUser, updateUser} from '../services/userService';
import {COLORS} from '../constants/colors';

const ROLE_CONFIG = {
  admin: {
    label: 'ADMINISTRADOR',
    color: COLORS.roleAdmin,
    bgColor: 'rgba(255, 106, 0, 0.15)',
  },
  supervisor: {
    label: 'SUPERVISOR',
    color: COLORS.roleSupervisor,
    bgColor: 'rgba(56, 189, 248, 0.15)',
  },
  tecnico: {
    label: 'TÉCNICO',
    color: COLORS.roleTecnico,
    bgColor: 'rgba(16, 185, 129, 0.15)',
  },
};

const DashboardScreen = ({user, token, onLogout}) => {
  const [usersList, setUsersList] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Modal para crear usuario (Solo Admin)
  const [modalVisible, setModalVisible] = useState(false);
  const [newNombre, setNewNombre] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRol, setNewRol] = useState('tecnico');
  const [modalError, setModalError] = useState('');
  const [creatingUser, setCreatingUser] = useState(false);

  const roleInfo = ROLE_CONFIG[user.rol] || {
    label: user.rol.toUpperCase(),
    color: COLORS.primary,
    bgColor: 'rgba(255, 106, 0, 0.15)',
  };

  const isRoleAdmin = user.rol === 'admin';
  const isRoleSupervisor = user.rol === 'supervisor';

  const fetchUsers = useCallback(async () => {
    if (!isRoleAdmin && !isRoleSupervisor) return;
    setLoadingUsers(true);
    try {
      const res = await getUsers(token);
      if (res.ok) {
        setUsersList(res.usuarios);
      }
    } catch (err) {
      console.error('Error cargando usuarios:', err);
    } finally {
      setLoadingUsers(false);
    }
  }, [isRoleAdmin, isRoleSupervisor, token]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleCreateUser = async () => {
    setModalError('');
    if (!newNombre.trim() || !newEmail.trim() || !newPassword.trim()) {
      setModalError('Todos los campos son requeridos.');
      return;
    }
    if (newPassword.length < 6) {
      setModalError('La contraseña debe tener mínimo 6 caracteres.');
      return;
    }

    setCreatingUser(true);
    try {
      const res = await createUser(token, {
        nombre: newNombre.trim(),
        email: newEmail.trim(),
        password: newPassword,
        rol: newRol,
      });

      if (res.ok) {
        setModalVisible(false);
        setNewNombre('');
        setNewEmail('');
        setNewPassword('');
        setNewRol('tecnico');
        fetchUsers();
      }
    } catch (err) {
      setModalError(err.message || 'Error al crear usuario.');
    } finally {
      setCreatingUser(false);
    }
  };

  const handleToggleActive = async (targetUser) => {
    if (targetUser.id === user.id) {
      Alert.alert('Acción no permitida', 'No puedes desactivar tu propia cuenta.');
      return;
    }

    try {
      const res = await updateUser(token, targetUser.id, {
        activo: !targetUser.activo,
      });
      if (res.ok) {
        fetchUsers();
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'No se pudo actualizar el estado.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header superior */}
      <View style={styles.header}>
        <View style={styles.headerBrandContainer}>
          <Text style={styles.brandTitle}>
            Hydro<Text style={styles.titleOrange}>Tech</Text>
          </Text>
          <Text style={styles.empresaSubtitle}>
            {user.empresa?.nombre || 'Mi Empresa'} ({user.empresa?.codigo || '---'})
          </Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
          <Text style={styles.logoutText}>Salir</Text>
        </TouchableOpacity>
      </View>

      {/* Tarjeta de Perfil y Rol */}
      <View style={styles.profileCard}>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{user.nombre}</Text>
          <Text style={styles.profileEmail}>{user.email}</Text>
        </View>
        <View style={[styles.roleBadge, {backgroundColor: roleInfo.bgColor}]}>
          <Text style={[styles.roleText, {color: roleInfo.color}]}>
            {roleInfo.label}
          </Text>
        </View>
      </View>

      {/* Panel específico según Rol */}
      {user.rol === 'tecnico' && (
        <View style={styles.infoCard}>
          <Text style={styles.sectionTitle}>Módulo Técnico • Fluidos & Maquinaria</Text>
          <Text style={styles.sectionDescription}>
            Bienvenido al panel técnico operativo. Registro de mantenimiento de mangueras,
            racores, bombas y circuitos hidráulicos.
          </Text>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>0</Text>
            <Text style={styles.statLabel}>Mantenimientos asignados</Text>
          </View>
        </View>
      )}

      {user.rol === 'supervisor' && (
        <View style={styles.supervisorContainer}>
          <View style={styles.infoCard}>
            <Text style={styles.sectionTitle}>Módulo de Supervisión</Text>
            <Text style={styles.sectionDescription}>
              Monitoreo y asignación de maquinaria y líneas de presión a los técnicos.
            </Text>
          </View>
          <Text style={styles.supervisorTeamTitle}>
            Equipo de la Empresa
          </Text>
        </View>
      )}

      {/* Gestión de Usuarios (Admin y visualización para Supervisor) */}
      {(isRoleAdmin || isRoleSupervisor) && (
        <View style={styles.usersSection}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>
              {isRoleAdmin ? 'Gestión de Personal' : 'Colaboradores'}
            </Text>
            {isRoleAdmin && (
              <TouchableOpacity
                style={styles.addUserButton}
                onPress={() => {
                  setModalError('');
                  setModalVisible(true);
                }}>
                <Text style={styles.addUserButtonText}>+ Nuevo Usuario</Text>
              </TouchableOpacity>
            )}
          </View>

          {loadingUsers ? (
            <ActivityIndicator size="small" color={COLORS.orange} style={styles.usersLoader} />
          ) : (
            <FlatList
              data={usersList}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={styles.usersListContent}
              ListEmptyComponent={
                <Text style={styles.emptyText}>No hay otros usuarios registrados.</Text>
              }
              renderItem={({item}) => {
                const itemRole = ROLE_CONFIG[item.rol] || {
                  label: item.rol.toUpperCase(),
                  color: COLORS.textSecondary,
                  bgColor: 'rgba(255, 255, 255, 0.08)',
                };
                return (
                  <View style={styles.userItem}>
                    <View style={styles.userItemDetails}>
                      <Text style={styles.userName}>{item.nombre}</Text>
                      <Text style={styles.userEmail}>{item.email}</Text>
                      <View style={styles.userMetaRow}>
                        <View
                          style={[
                            styles.miniBadge,
                            {backgroundColor: itemRole.bgColor},
                          ]}>
                          <Text
                            style={[
                              styles.miniBadgeText,
                              {color: itemRole.color},
                            ]}>
                            {itemRole.label}
                          </Text>
                        </View>
                        <Text
                          style={[
                            styles.statusText,
                            {color: item.activo ? COLORS.success : COLORS.danger},
                          ]}>
                          {item.activo ? '• Activo' : '• Inactivo'}
                        </Text>
                      </View>
                    </View>

                    {/* Acciones de Admin */}
                    {isRoleAdmin && item.id !== user.id && (
                      <TouchableOpacity
                        style={[
                          styles.toggleButton,
                          item.activo ? styles.deactivateButton : styles.activateButton,
                        ]}
                        onPress={() => handleToggleActive(item)}>
                        <Text
                          style={[
                            styles.toggleButtonText,
                            item.activo ? styles.textDanger : styles.textSuccess,
                          ]}>
                          {item.activo ? 'Desactivar' : 'Activar'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              }}
            />
          )}
        </View>
      )}

      {/* Modal para Crear Usuario (Solo Admin) */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={styles.modalTitle}>Crear Nuevo Usuario</Text>
              <Text style={styles.modalSubtitle}>
                El nuevo colaborador quedará asignado a {user.empresa?.nombre}.
              </Text>

              <CustomInput
                placeholder="Nombre completo"
                value={newNombre}
                onChangeText={setNewNombre}
              />

              <CustomInput
                placeholder="Correo electrónico"
                value={newEmail}
                onChangeText={setNewEmail}
                keyboardType="email-address"
              />

              <CustomInput
                placeholder="Contraseña temporal (mín. 6)"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
              />

              {/* Selector de Rol */}
              <Text style={styles.selectorLabel}>Selecciona el Rol:</Text>
              <View style={styles.roleSelectorRow}>
                {['tecnico', 'supervisor', 'admin'].map((rolKey) => {
                  const conf = ROLE_CONFIG[rolKey];
                  const selected = newRol === rolKey;
                  return (
                    <TouchableOpacity
                      key={rolKey}
                      style={[
                        styles.roleSelectOption,
                        selected && [{borderColor: conf.color, backgroundColor: conf.bgColor}],
                      ]}
                      onPress={() => setNewRol(rolKey)}>
                      <Text
                        style={[
                          styles.roleSelectText,
                          selected && [{color: conf.color}, styles.roleSelectTextActive],
                        ]}>
                        {conf.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {modalError ? (
                <View style={styles.modalErrorContainer}>
                  <Text style={styles.errorText}>{modalError}</Text>
                </View>
              ) : null}

              {creatingUser ? (
                <ActivityIndicator
                  size="large"
                  color={COLORS.orange}
                  style={styles.modalLoader}
                />
              ) : (
                <PrimaryButton
                  title="Crear Usuario"
                  onPress={handleCreateUser}
                />
              )}

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerBrandContainer: {
    flex: 1,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  titleOrange: {
    color: COLORS.orange,
  },
  empresaSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
    marginTop: 1,
  },
  logoutButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  logoutText: {
    color: COLORS.danger,
    fontWeight: '700',
    fontSize: 12,
  },
  profileCard: {
    margin: 16,
    padding: 16,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  profileEmail: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  roleBadge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  roleText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  infoCard: {
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 16,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  sectionDescription: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 6,
    lineHeight: 18,
  },
  statBox: {
    marginTop: 14,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  statNumber: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.roleTecnico,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  supervisorContainer: {
    marginBottom: 5,
  },
  supervisorTeamTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginHorizontal: 20,
    marginTop: 15,
  },
  usersSection: {
    flex: 1,
    marginHorizontal: 16,
    marginTop: 6,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  addUserButton: {
    backgroundColor: COLORS.orange,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addUserButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  usersLoader: {
    margin: 20,
  },
  usersListContent: {
    paddingBottom: 20,
  },
  userItem: {
    backgroundColor: COLORS.surface,
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  userItemDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  userEmail: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  userMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  miniBadge: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 5,
    marginRight: 8,
  },
  miniBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  toggleButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
  },
  deactivateButton: {
    borderColor: 'rgba(239, 68, 68, 0.4)',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  activateButton: {
    borderColor: 'rgba(16, 185, 129, 0.4)',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  toggleButtonText: {
    fontSize: 11,
    fontWeight: '700',
  },
  textDanger: {
    color: COLORS.danger,
  },
  textSuccess: {
    color: COLORS.success,
  },
  emptyText: {
    textAlign: 'center',
    color: COLORS.textSecondary,
    marginTop: 20,
    fontSize: 13,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 24,
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 18,
    marginTop: 4,
  },
  selectorLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  roleSelectorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  roleSelectOption: {
    flex: 1,
    marginHorizontal: 3,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    backgroundColor: COLORS.surface2,
  },
  roleSelectText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  roleSelectTextActive: {
    fontWeight: '700',
  },
  modalLoader: {
    marginTop: 15,
  },
  cancelButton: {
    marginTop: 12,
    alignItems: 'center',
    paddingVertical: 10,
  },
  cancelButtonText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  modalErrorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 12,
  },
  errorText: {
    color: COLORS.danger,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '500',
  },
});

export default DashboardScreen;
