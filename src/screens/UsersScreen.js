import React, { useState, useEffect, useCallback } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useAuth } from '../auth/useAuth';
import { getUsers, createUser, updateUser } from '../api/usersApi';
import HeaderBar from '../components/HeaderBar';
import CustomInput from '../components/CustomInput';
import CustomButton from '../components/CustomButton';
import Badge from '../components/Badge';
import ForbiddenNotice from '../components/ForbiddenNotice';
import { COLORS } from '../constants/colors';

const ROLES = [
  { key: 'tecnico', label: 'Técnico' },
  { key: 'supervisor', label: 'Supervisor' },
  { key: 'admin', label: 'Administrador' },
];

const UsersScreen = ({ onBack }) => {
  const { role } = useAuth();
  const isAdmin = role === 'admin';

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [forbidden, setForbidden] = useState(!isAdmin);

  // Modal Crear Usuario
  const [modalVisible, setModalVisible] = useState(false);
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [nuevoRol, setNuevoRol] = useState('tecnico');
  const [creating, setCreating] = useState(false);

  const loadUsers = useCallback(async () => {
    if (!isAdmin) {
      setForbidden(true);
      return;
    }
    setLoading(true);
    setErrorMsg('');
    setForbidden(false);
    try {
      const res = await getUsers();
      setUsers(res.usuarios || []);
    } catch (err) {
      if (err.isForbidden) {
        setForbidden(true);
      } else {
        setErrorMsg(err.message || 'Error al cargar los usuarios.');
      }
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleCreateUser = async () => {
    if (!nombre.trim() || !correo.trim() || !password.trim()) {
      setErrorMsg('Nombre, correo y contraseña son obligatorios.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('La contraseña debe tener mínimo 6 caracteres.');
      return;
    }

    setCreating(true);
    setErrorMsg('');
    try {
      await createUser({
        nombreCompleto: nombre,
        correo,
        password,
        rol: nuevoRol,
      });
      setModalVisible(false);
      setNombre('');
      setCorreo('');
      setPassword('');
      setNuevoRol('tecnico');
      loadUsers();
    } catch (err) {
      if (err.isForbidden) {
        setForbidden(true);
        setModalVisible(false);
      } else {
        setErrorMsg(err.message || 'No se pudo crear el usuario.');
      }
    } finally {
      setCreating(false);
    }
  };

  const handleToggleActive = async (targetUser) => {
    try {
      await updateUser(targetUser.id, { activo: !targetUser.activo });
      setUsers((prev) =>
        prev.map((u) => (u.id === targetUser.id ? { ...u, activo: !targetUser.activo } : u))
      );
    } catch (err) {
      if (err.isForbidden) {
        setForbidden(true);
      } else {
        setErrorMsg(err.message || 'Error al cambiar estado del usuario.');
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <HeaderBar
        title="Gestión de Usuarios"
        role={role}
        onBack={onBack}
        onRightAction={isAdmin ? () => setModalVisible(true) : null}
        rightActionLabel={isAdmin ? '+ Nuevo Usuario' : null}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {forbidden ? (
          <ForbiddenNotice message="Solo los administradores del sistema tienen autorización para gestionar la plantilla de usuarios y sus credenciales." />
        ) : null}

        {errorMsg ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        ) : null}

        {!forbidden && loading ? (
          <ActivityIndicator size="small" color={COLORS.orange} style={styles.loader} />
        ) : !forbidden && users.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>👥 Sin usuarios adicionales</Text>
            <Text style={styles.emptyText}>
              Aún no hay colaboradores registrados para esta empresa prestadora.
            </Text>
          </View>
        ) : !forbidden ? (
          <View style={styles.listContainer}>
            {users.map((item) => (
              <View key={item.id} style={styles.cardItem}>
                <View style={styles.cardHeader}>
                  <View style={styles.flex1}>
                    <Text style={styles.nameText}>{item.nombre_completo}</Text>
                    <Text style={styles.emailText}>{item.correo}</Text>
                    <View style={styles.roleTag}>
                      <Text style={styles.roleTagText}>{item.rol.toUpperCase()}</Text>
                    </View>
                  </View>
                  <Badge status={item.activo ? 'activa' : 'inactiva'} />
                </View>

                <View style={styles.cardFooter}>
                  <Text style={styles.dateText}>
                    Alta: {item.creado_en ? new Date(item.creado_en).toLocaleDateString('es-CO') : 'Reciente'}
                  </Text>
                  <TouchableOpacity
                    style={styles.btnToggle}
                    onPress={() => handleToggleActive(item)}>
                    <Text style={styles.btnToggleText}>
                      {item.activo ? 'Desactivar' : 'Activar'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>

      {/* Modal Crear Usuario */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Registrar Nuevo Usuario</Text>

            <CustomInput
              label="Nombre Completo *"
              placeholder="Ej: Carlos Ramírez"
              value={nombre}
              onChangeText={setNombre}
            />

            <CustomInput
              label="Correo Electrónico *"
              placeholder="carlos@empresa.com"
              value={correo}
              onChangeText={setCorreo}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <CustomInput
              label="Contraseña Provisional (mín. 6) *"
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <Text style={styles.fieldLabel}>Rol en el Sistema</Text>
            <View style={styles.rolesRow}>
              {ROLES.map((r) => {
                const isSel = nuevoRol === r.key;
                return (
                  <TouchableOpacity
                    key={r.key}
                    style={[styles.roleBtn, isSel && styles.roleBtnSelected]}
                    onPress={() => setNuevoRol(r.key)}>
                    <Text style={[styles.roleBtnText, isSel && styles.roleBtnTextSelected]}>
                      {r.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.btnCancel}
                onPress={() => setModalVisible(false)}>
                <Text style={styles.btnCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <CustomButton
                title={creating ? 'Guardando...' : 'Crear Usuario'}
                onPress={handleCreateUser}
                loading={creating}
              />
            </View>
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
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  flex1: {
    flex: 1,
  },
  loader: {
    marginVertical: 20,
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '600',
  },
  emptyCard: {
    backgroundColor: COLORS.surface,
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.warning,
    marginBottom: 4,
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    textAlign: 'center',
  },
  listContainer: {
    gap: 10,
  },
  cardItem: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  nameText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  emailText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  roleTag: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 106, 0, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 6,
  },
  roleTagText: {
    color: COLORS.orange,
    fontSize: 10,
    fontWeight: '800',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  dateText: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  btnToggle: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  btnToggleText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    padding: 16,
  },
  modalBox: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 18,
    maxHeight: '85%',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: 10,
    marginBottom: 6,
  },
  rolesRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  roleBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  roleBtnSelected: {
    borderColor: COLORS.orange,
    backgroundColor: 'rgba(255, 106, 0, 0.15)',
  },
  roleBtnText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  roleBtnTextSelected: {
    color: COLORS.orange,
    fontWeight: '700',
  },
  modalButtons: {
    marginTop: 10,
    gap: 8,
  },
  btnCancel: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  btnCancelText: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
});

export default UsersScreen;
