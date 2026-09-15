import React, {useState, useEffect, useCallback} from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Alert,
  ScrollView,
  TextInput,
  Linking,
} from 'react-native';

import CustomInput from '../components/CustomInput';
import PrimaryButton from '../components/PrimaryButton';
import {getUsers, createUser, updateUser} from '../services/userService';
import {getMaquinas, createMaquina} from '../services/maquinaService';
import {getPiezas, createPieza, validarPieza, getNotificaciones} from '../services/piezaService';
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
  // --- Estados de Gestión de Usuarios (Admin) ---
  const [usersList, setUsersList] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [modalUserVisible, setModalUserVisible] = useState(false);
  const [newNombre, setNewNombre] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRol, setNewRol] = useState('tecnico');
  const [modalUserError, setModalUserError] = useState('');
  const [creatingUser, setCreatingUser] = useState(false);

  // --- Estados de Maquinaria (HU-014 / HU-015) ---
  const [maquinasList, setMaquinasList] = useState([]);
  const [searchMaquina, setSearchMaquina] = useState('');
  const [selectedMaquina, setSelectedMaquina] = useState(null);
  const [loadingMaquinas, setLoadingMaquinas] = useState(false);

  // Modal Crear Maquinaria (Supervisor / Admin - HU-015)
  const [modalMaquinaVisible, setModalMaquinaVisible] = useState(false);
  const [newMaqCodigo, setNewMaqCodigo] = useState('');
  const [newMaqNombre, setNewMaqNombre] = useState('');
  const [newMaqTipo, setNewMaqTipo] = useState('');
  const [newMaqManual, setNewMaqManual] = useState('');
  const [newMaqDesc, setNewMaqDesc] = useState('');
  const [savingMaquina, setSavingMaquina] = useState(false);
  const [modalMaqError, setModalMaqError] = useState('');

  // --- Estados de Piezas (HU-014) ---
  const [piezasList, setPiezasList] = useState([]);
  const [searchPieza, setSearchPieza] = useState('');
  const [loadingPiezas, setLoadingPiezas] = useState(false);
  const [selectedPiezaModal, setSelectedPiezaModal] = useState(null);

  // Modal Crear Pieza (Técnico - HU-014)
  const [modalPiezaVisible, setModalPiezaVisible] = useState(false);
  const [newPiezaCodigo, setNewPiezaCodigo] = useState('');
  const [newPiezaNombre, setNewPiezaNombre] = useState('');
  const [newPiezaTipo, setNewPiezaTipo] = useState('Manguera');
  const [medidaLongitud, setMedidaLongitud] = useState('');
  const [medidaDiametro, setMedidaDiametro] = useState('');
  const [medidaPresion, setMedidaPresion] = useState('');
  const [medidaRosca, setMedidaRosca] = useState('');
  const [newPiezaDesc, setNewPiezaDesc] = useState('');
  const [newPiezaFoto, setNewPiezaFoto] = useState('');
  const [savingPieza, setSavingPieza] = useState(false);
  const [modalPiezaError, setModalPiezaError] = useState('');

  // --- Estados de Notificaciones (Supervisor) ---
  const [notificacionesList, setNotificacionesList] = useState([]);
  const [loadingNotif, setLoadingNotif] = useState(false);

  const isRoleAdmin = user.rol === 'admin';
  const isRoleSupervisor = user.rol === 'supervisor';
  const isRoleTecnico = user.rol === 'tecnico';

  const roleInfo = ROLE_CONFIG[user.rol] || {
    label: user.rol.toUpperCase(),
    color: COLORS.primary,
    bgColor: 'rgba(255, 106, 0, 0.15)',
  };

  // --- Cargas de datos ---
  const fetchUsers = useCallback(async () => {
    if (!isRoleAdmin && !isRoleSupervisor) return;
    setLoadingUsers(true);
    try {
      const res = await getUsers(token);
      if (res.ok) setUsersList(res.usuarios);
    } catch (err) {
      console.error('Error cargando usuarios:', err);
    } finally {
      setLoadingUsers(false);
    }
  }, [isRoleAdmin, isRoleSupervisor, token]);

  const fetchMaquinas = useCallback(async (query = '') => {
    setLoadingMaquinas(true);
    try {
      const res = await getMaquinas(token, query);
      if (res.ok) setMaquinasList(res.maquinas);
    } catch (err) {
      console.error('Error cargando máquinas:', err);
    } finally {
      setLoadingMaquinas(false);
    }
  }, [token]);

  const fetchPiezas = useCallback(async (maquinaId, query = '') => {
    if (!maquinaId) return;
    setLoadingPiezas(true);
    try {
      const res = await getPiezas(token, {maquinaId, query});
      if (res.ok) setPiezasList(res.piezas);
    } catch (err) {
      console.error('Error cargando piezas:', err);
    } finally {
      setLoadingPiezas(false);
    }
  }, [token]);

  const fetchNotificaciones = useCallback(async () => {
    if (!isRoleSupervisor && !isRoleAdmin) return;
    setLoadingNotif(true);
    try {
      const res = await getNotificaciones(token);
      if (res.ok) setNotificacionesList(res.notificaciones);
    } catch (err) {
      console.error('Error cargando notificaciones:', err);
    } finally {
      setLoadingNotif(false);
    }
  }, [isRoleSupervisor, isRoleAdmin, token]);

  useEffect(() => {
    fetchUsers();
    fetchMaquinas();
    fetchNotificaciones();
  }, [fetchUsers, fetchMaquinas, fetchNotificaciones]);

  useEffect(() => {
    if (selectedMaquina) {
      fetchPiezas(selectedMaquina.id, searchPieza);
    }
  }, [selectedMaquina, searchPieza, fetchPiezas]);

  // --- Acciones Técnico (HU-014) ---
  const handleOpenManual = (url) => {
    if (!url) {
      Alert.alert('Manual no disponible', 'Esta máquina no tiene una guía técnica asociada.');
      return;
    }
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'No se pudo abrir el enlace del manual técnico.');
    });
  };

  const handleCreatePieza = async () => {
    setModalPiezaError('');
    if (!selectedMaquina) {
      setModalPiezaError('Debes seleccionar una máquina primero.');
      return;
    }
    if (!newPiezaCodigo.trim() || !newPiezaNombre.trim()) {
      setModalPiezaError('El código y nombre de la pieza son obligatorios.');
      return;
    }

    setSavingPieza(true);
    try {
      const medidasObj = {};
      if (medidaLongitud.trim()) medidasObj.longitud = medidaLongitud.trim();
      if (medidaDiametro.trim()) medidasObj.diametro = medidaDiametro.trim();
      if (medidaPresion.trim()) medidasObj.presion_psi = medidaPresion.trim();
      if (medidaRosca.trim()) medidasObj.rosca = medidaRosca.trim();

      const fotosArr = newPiezaFoto.trim() ? [newPiezaFoto.trim()] : [];

      const res = await createPieza(token, {
        maquinaId: selectedMaquina.id,
        codigo: newPiezaCodigo.trim(),
        nombre: newPiezaNombre.trim(),
        tipo: newPiezaTipo,
        medidas: medidasObj,
        descripcion: newPiezaDesc.trim(),
        fotos: fotosArr,
      });

      if (res.ok) {
        Alert.alert(
          'Ficha Registrada',
          'La pieza ha sido guardada y asociada al equipo. Se ha notificado al supervisor para su validación.'
        );
        setModalPiezaVisible(false);
        setNewPiezaCodigo('');
        setNewPiezaNombre('');
        setMedidaLongitud('');
        setMedidaDiametro('');
        setMedidaPresion('');
        setMedidaRosca('');
        setNewPiezaDesc('');
        setNewPiezaFoto('');
        fetchPiezas(selectedMaquina.id);
        fetchNotificaciones();
      }
    } catch (err) {
      setModalPiezaError(err.message || 'Error al guardar la pieza.');
    } finally {
      setSavingPieza(false);
    }
  };

  // --- Acciones Supervisor (HU-015) ---
  const handleCreateMaquina = async (confirmarDuplicado = false) => {
    setModalMaqError('');
    if (!newMaqCodigo.trim() || !newMaqNombre.trim() || !newMaqTipo.trim()) {
      setModalMaqError('Código, nombre y tipo de maquinaria son requeridos.');
      return;
    }

    setSavingMaquina(true);
    try {
      const res = await createMaquina(token, {
        codigo: newMaqCodigo.trim(),
        nombre: newMaqNombre.trim(),
        tipo: newMaqTipo.trim(),
        manualUrl: newMaqManual.trim(),
        descripcion: newMaqDesc.trim(),
        confirmarDuplicado,
      });

      if (res.ok) {
        Alert.alert('Éxito', 'Maquinaria registrada y disponible para los técnicos.');
        setModalMaquinaVisible(false);
        setNewMaqCodigo('');
        setNewMaqNombre('');
        setNewMaqTipo('');
        setNewMaqManual('');
        setNewMaqDesc('');
        fetchMaquinas();
      }
    } catch (err) {
      if (err.advertenciaDuplicado) {
        Alert.alert(
          'Máquina Duplicada',
          err.message,
          [
            {text: 'Cancelar', style: 'cancel'},
            {
              text: 'Confirmar y Registrar',
              onPress: () => handleCreateMaquina(true),
            },
          ]
        );
      } else {
        setModalMaqError(err.message || 'Error al registrar la máquina.');
      }
    } finally {
      setSavingMaquina(false);
    }
  };

  const handleValidarPieza = async (piezaId, estado) => {
    try {
      const res = await validarPieza(token, piezaId, estado);
      if (res.ok) {
        Alert.alert('Estado actualizado', `Pieza marcada como ${estado}.`);
        fetchNotificaciones();
        if (selectedMaquina) fetchPiezas(selectedMaquina.id);
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'No se pudo actualizar el estado de validación.');
    }
  };

  // --- Acciones Admin (Usuarios) ---
  const handleCreateUser = async () => {
    setModalUserError('');
    if (!newNombre.trim() || !newEmail.trim() || !newPassword.trim()) {
      setModalUserError('Todos los campos son requeridos.');
      return;
    }
    if (newPassword.length < 6) {
      setModalUserError('La contraseña debe tener mínimo 6 caracteres.');
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
        setModalUserVisible(false);
        setNewNombre('');
        setNewEmail('');
        setNewPassword('');
        setNewRol('tecnico');
        fetchUsers();
      }
    } catch (err) {
      setModalUserError(err.message || 'Error al crear usuario.');
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
      const res = await updateUser(token, targetUser.id, {activo: !targetUser.activo});
      if (res.ok) fetchUsers();
    } catch (err) {
      Alert.alert('Error', err.message || 'No se pudo actualizar el estado.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header Superior */}
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

      <ScrollView contentContainerStyle={styles.scrollMain}>
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

        {/* ========================================================================= */}
        {/* MÓDULO 1: SELECCIÓN Y CONSULTA DE MAQUINARIA (HU-014 Paso 1 / HU-015)     */}
        {/* ========================================================================= */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.sectionTitle}>Maquinaria Autorizada</Text>
              <Text style={styles.sectionSubtitle}>
                {isRoleTecnico
                  ? 'Selecciona la máquina registrada para consultar o registrar piezas.'
                  : 'Equipos registrados disponibles para los técnicos.'}
              </Text>
            </View>
            {(isRoleSupervisor || isRoleAdmin) && (
              <TouchableOpacity
                style={styles.actionBtnOrange}
                onPress={() => {
                  setModalMaqError('');
                  setModalMaquinaVisible(true);
                }}>
                <Text style={styles.actionBtnText}>+ Nueva Máquina</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Buscador de Máquina */}
          <View style={styles.searchBox}>
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar máquina por nombre o código (ej: CAT-320)..."
              placeholderTextColor={COLORS.textSecondary}
              value={searchMaquina}
              onChangeText={(text) => {
                setSearchMaquina(text);
                fetchMaquinas(text);
              }}
            />
          </View>

          {/* Máquina actualmente seleccionada */}
          {selectedMaquina ? (
            <View style={styles.selectedMachineCard}>
              <View style={styles.selectedMachineHeader}>
                <View style={styles.flex1}>
                  <Text style={styles.selectedMachineCode}>[{selectedMaquina.codigo}]</Text>
                  <Text style={styles.selectedMachineName}>{selectedMaquina.nombre}</Text>
                  <Text style={styles.selectedMachineType}>{selectedMaquina.tipo}</Text>
                </View>
                <TouchableOpacity
                  style={styles.changeMachineBtn}
                  onPress={() => setSelectedMaquina(null)}>
                  <Text style={styles.changeMachineText}>Cambiar</Text>
                </TouchableOpacity>
              </View>

              {/* HU-014 Paso 3: Guía técnica / Manual técnico en línea */}
              {selectedMaquina.manual_url ? (
                <TouchableOpacity
                  style={styles.manualButton}
                  onPress={() => handleOpenManual(selectedMaquina.manual_url)}>
                  <Text style={styles.manualButtonText}>📖 Consultar Manual Técnico en Línea</Text>
                </TouchableOpacity>
              ) : (
                <Text style={styles.noManualText}>Sin manual técnico en línea enlazado.</Text>
              )}
            </View>
          ) : (
            // Lista de máquinas disponibles
            <View>
              {loadingMaquinas ? (
                <ActivityIndicator size="small" color={COLORS.orange} style={styles.loaderMargin15} />
              ) : maquinasList.length === 0 ? (
                // HU-014 Escenario 2: Máquina no registrada
                <View style={styles.alertNoticeBox}>
                  <Text style={styles.alertNoticeTitle}>⚠️ Máquina no registrada</Text>
                  <Text style={styles.alertNoticeText}>
                    La máquina buscada no se encuentra en el sistema. Debe ser dada de alta previamente por un supervisor antes de registrar o intervenir piezas.
                  </Text>
                </View>
              ) : (
                <View style={styles.machineListGrid}>
                  {maquinasList.map((m) => (
                    <TouchableOpacity
                      key={m.id}
                      style={styles.machineItemCard}
                      onPress={() => setSelectedMaquina(m)}>
                      <View style={styles.flex1}>
                        <Text style={styles.machineItemCode}>{m.codigo}</Text>
                        <Text style={styles.machineItemName}>{m.nombre}</Text>
                        <Text style={styles.machineItemType}>{m.tipo} • {m.total_piezas || 0} piezas</Text>
                      </View>
                      <Text style={styles.selectMachineArrow}>Seleccionar →</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          )}
        </View>

        {/* ========================================================================= */}
        {/* MÓDULO 2: GESTIÓN DE PIEZAS DE LA MÁQUINA SELECCIONADA (HU-014)          */}
        {/* ========================================================================= */}
        {selectedMaquina && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={styles.sectionTitle}>
                  Piezas de {selectedMaquina.codigo}
                </Text>
                <Text style={styles.sectionSubtitle}>
                  Consulta de piezas existentes o registro de nueva ficha técnica.
                </Text>
              </View>
              <TouchableOpacity
                style={styles.actionBtnOrange}
                onPress={() => {
                  setModalPiezaError('');
                  setModalPiezaVisible(true);
                }}>
                <Text style={styles.actionBtnText}>+ Nueva Pieza</Text>
              </TouchableOpacity>
            </View>

            {/* Buscador de piezas existentes */}
            <View style={styles.searchBox}>
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar pieza por código o nombre en este equipo..."
                placeholderTextColor={COLORS.textSecondary}
                value={searchPieza}
                onChangeText={setSearchPieza}
              />
            </View>

            {loadingPiezas ? (
              <ActivityIndicator size="small" color={COLORS.orange} style={styles.loaderMargin15} />
            ) : piezasList.length === 0 ? (
              <View style={styles.emptyPartBox}>
                <Text style={styles.emptyPartText}>
                  No hay piezas registradas con este criterio en esta máquina.
                </Text>
                <TouchableOpacity
                  style={[styles.actionBtnOrange, styles.centerMargin10]}
                  onPress={() => setModalPiezaVisible(true)}>
                  <Text style={styles.actionBtnText}>Registrar Nueva Ficha de Pieza</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View>
                {piezasList.map((p) => {
                  const isValidada = p.estado_validacion === 'validada';
                  return (
                    <TouchableOpacity
                      key={p.id}
                      style={styles.piezaItemCard}
                      onPress={() => setSelectedPiezaModal(p)}>
                      <View style={styles.flex1}>
                        <View style={styles.rowAlignCenter}>
                          <Text style={styles.piezaItemCode}>[{p.codigo}]</Text>
                          <View
                            style={[
                              styles.validationBadge,
                              isValidada ? styles.badgeValidada : styles.badgePendiente,
                            ]}>
                            <Text
                              style={[
                                styles.validationBadgeText,
                                isValidada ? styles.textSuccess : styles.textWarning,
                              ]}>
                              {isValidada ? 'VALIDADA' : 'PENDIENTE'}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.piezaItemName}>{p.nombre}</Text>
                        <Text style={styles.piezaItemTipo}>Tipo: {p.tipo}</Text>
                      </View>
                      <Text style={styles.viewSheetText}>Ver Ficha →</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* ========================================================================= */}
        {/* MÓDULO 3: BANDEJA DE SUPERVISIÓN Y ALERTAS (SUPERVISOR / ADMIN)           */}
        {/* ========================================================================= */}
        {(isRoleSupervisor || isRoleAdmin) && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Bandeja de Validación de Piezas</Text>
            <Text style={styles.sectionSubtitle}>
              Alertas de componentes técnicos registrados por los técnicos pendientes de aprobación.
            </Text>

            {loadingNotif ? (
              <ActivityIndicator size="small" color={COLORS.orange} style={styles.loaderMargin15} />
            ) : notificacionesList.length === 0 ? (
              <Text style={styles.emptyText}>No hay alertas o piezas pendientes de validación.</Text>
            ) : (
              <View>
                {notificacionesList.map((n) => {
                  const isValidada = n.estado_validacion === 'validada';
                  return (
                    <View key={n.id} style={styles.notifCard}>
                      <View style={styles.flex1}>
                        <Text style={styles.notifMessage}>{n.mensaje}</Text>
                        <Text style={styles.notifMeta}>
                          Equipo: {n.maquina_nombre} • Técnico: {n.tecnico_nombre || 'Operador'}
                        </Text>
                      </View>
                      <View style={styles.notifActionRow}>
                        {!isValidada ? (
                          <TouchableOpacity
                            style={styles.validateButton}
                            onPress={() => handleValidarPieza(n.pieza_id, 'validada')}>
                            <Text style={styles.validateButtonText}>Validar Pieza</Text>
                          </TouchableOpacity>
                        ) : (
                          <View style={styles.badgeValidada}>
                            <Text style={styles.textSuccess}>Aprobada</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* ========================================================================= */}
        {/* MÓDULO 4: GESTIÓN DE PERSONAL (SOLO ADMIN)                                */}
        {/* ========================================================================= */}
        {isRoleAdmin && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={styles.sectionTitle}>Gestión de Personal</Text>
                <Text style={styles.sectionSubtitle}>Administración de colaboradores de la empresa.</Text>
              </View>
              <TouchableOpacity
                style={styles.actionBtnOrange}
                onPress={() => {
                  setModalUserError('');
                  setModalUserVisible(true);
                }}>
                <Text style={styles.actionBtnText}>+ Nuevo Usuario</Text>
              </TouchableOpacity>
            </View>

            {loadingUsers ? (
              <ActivityIndicator size="small" color={COLORS.orange} style={styles.loaderMargin15} />
            ) : (
              usersList.map((item) => {
                const itemRole = ROLE_CONFIG[item.rol] || {
                  label: item.rol.toUpperCase(),
                  color: COLORS.textSecondary,
                  bgColor: 'rgba(255, 255, 255, 0.08)',
                };
                return (
                  <View key={item.id} style={styles.userItem}>
                    <View style={styles.userItemDetails}>
                      <Text style={styles.userName}>{item.nombre}</Text>
                      <Text style={styles.userEmail}>{item.email}</Text>
                      <View style={styles.userMetaRow}>
                        <View style={[styles.miniBadge, {backgroundColor: itemRole.bgColor}]}>
                          <Text style={[styles.miniBadgeText, {color: itemRole.color}]}>
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
                    {item.id !== user.id && (
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
              })
            )}
          </View>
        )}
      </ScrollView>

      {/* ========================================================================= */}
      {/* MODAL HU-014 Criterio 3: CONSULTA DE FICHA COMPLETA DE PIEZA EXISTENTE    */}
      {/* ========================================================================= */}
      <Modal visible={!!selectedPiezaModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {selectedPiezaModal && (
              <ScrollView keyboardShouldPersistTaps="handled">
                <Text style={styles.modalTitle}>Ficha Técnica de Componente</Text>
                <Text style={styles.modalSubtitle}>
                  Equipo: {selectedPiezaModal.maquina_nombre || selectedMaquina?.nombre}
                </Text>

                <View style={styles.detailBox}>
                  <Text style={styles.detailLabel}>Código:</Text>
                  <Text style={styles.detailValueBold}>{selectedPiezaModal.codigo}</Text>

                  <Text style={styles.detailLabel}>Nombre de la Pieza:</Text>
                  <Text style={styles.detailValue}>{selectedPiezaModal.nombre}</Text>

                  <Text style={styles.detailLabel}>Tipo:</Text>
                  <Text style={styles.detailValue}>{selectedPiezaModal.tipo}</Text>

                  <Text style={styles.detailLabel}>Estado de Validación:</Text>
                  <View style={styles.badgeRow}>
                    <View
                      style={[
                        styles.validationBadge,
                        selectedPiezaModal.estado_validacion === 'validada'
                          ? styles.badgeValidada
                          : styles.badgePendiente,
                      ]}>
                      <Text
                        style={[
                          styles.validationBadgeText,
                          selectedPiezaModal.estado_validacion === 'validada'
                            ? styles.textSuccess
                            : styles.textWarning,
                        ]}>
                        {selectedPiezaModal.estado_validacion.toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.detailLabel}>Medidas Técnicas:</Text>
                  {selectedPiezaModal.medidas && Object.keys(selectedPiezaModal.medidas).length > 0 ? (
                    Object.entries(selectedPiezaModal.medidas).map(([k, v]) => (
                      <Text key={k} style={styles.subDetailText}>
                        • <Text style={styles.textBold}>{k}:</Text> {v}
                      </Text>
                    ))
                  ) : (
                    <Text style={styles.subDetailText}>Sin medidas específicas registradas.</Text>
                  )}

                  <Text style={styles.detailLabel}>Descripción:</Text>
                  <Text style={styles.detailValue}>
                    {selectedPiezaModal.descripcion || 'Sin descripción adicional.'}
                  </Text>

                  <Text style={styles.detailLabel}>Evidencias / Fotos:</Text>
                  {selectedPiezaModal.fotos && selectedPiezaModal.fotos.length > 0 ? (
                    selectedPiezaModal.fotos.map((f, i) => (
                      <Text key={i} style={styles.subDetailText}>
                        📷 Foto {i + 1}: {f}
                      </Text>
                    ))
                  ) : (
                    <Text style={styles.subDetailText}>Sin fotos adjuntas.</Text>
                  )}
                </View>

                <View style={styles.alreadyExistsBanner}>
                  <Text style={styles.alreadyExistsBannerText}>
                    ℹ️ Esta pieza ya está documentada. No se permite duplicar el registro.
                  </Text>
                </View>

                <TouchableOpacity
                  style={[styles.cancelButton, styles.marginTop15]}
                  onPress={() => setSelectedPiezaModal(null)}>
                  <Text style={styles.cancelButtonText}>Cerrar Ficha</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL HU-014: REGISTRO DE NUEVA PIEZA POR EL TÉCNICO                      */}
      {/* ========================================================================= */}
      <Modal visible={modalPiezaVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={styles.modalTitle}>Nueva Ficha de Pieza</Text>
              <Text style={styles.modalSubtitle}>
                Asociada a: {selectedMaquina?.nombre} [{selectedMaquina?.codigo}]
              </Text>

              <CustomInput
                placeholder="Código de la pieza (ej: MANG-4SP-02)"
                value={newPiezaCodigo}
                onChangeText={setNewPiezaCodigo}
              />

              <CustomInput
                placeholder="Nombre de la pieza (ej: Manguera 3/4)"
                value={newPiezaNombre}
                onChangeText={setNewPiezaNombre}
              />

              <Text style={styles.selectorLabel}>Tipo de Componente:</Text>
              <View style={styles.roleSelectorRow}>
                {['Manguera', 'Racor', 'Acople', 'Válvula'].map((tipo) => (
                  <TouchableOpacity
                    key={tipo}
                    style={[
                      styles.roleSelectOption,
                      newPiezaTipo === tipo && styles.roleSelectOptionActive,
                    ]}
                    onPress={() => setNewPiezaTipo(tipo)}>
                    <Text
                      style={[
                        styles.roleSelectText,
                        newPiezaTipo === tipo && styles.roleSelectTextActive,
                      ]}>
                      {tipo}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.selectorLabel}>Medidas y Especificaciones:</Text>
              <CustomInput
                placeholder="Longitud (ej: 120 cm)"
                value={medidaLongitud}
                onChangeText={setMedidaLongitud}
              />
              <CustomInput
                placeholder="Diámetro Interior (ej: 3/4 pulg)"
                value={medidaDiametro}
                onChangeText={setMedidaDiametro}
              />
              <CustomInput
                placeholder="Presión de trabajo (ej: 5000 PSI)"
                value={medidaPresion}
                onChangeText={setMedidaPresion}
              />
              <CustomInput
                placeholder="Tipo de rosca / acople (ej: JIC Macho 1-1/16)"
                value={medidaRosca}
                onChangeText={setMedidaRosca}
              />

              <CustomInput
                placeholder="Evidencia fotográfica (URL de foto)"
                value={newPiezaFoto}
                onChangeText={setNewPiezaFoto}
              />

              <CustomInput
                placeholder="Observaciones de instalación / fabricación"
                value={newPiezaDesc}
                onChangeText={setNewPiezaDesc}
              />

              {modalPiezaError ? (
                <View style={styles.modalErrorContainer}>
                  <Text style={styles.errorText}>{modalPiezaError}</Text>
                </View>
              ) : null}

              {savingPieza ? (
                <ActivityIndicator size="large" color={COLORS.orange} style={styles.loaderMargin10} />
              ) : (
                <PrimaryButton
                  title="Guardar Ficha y Notificar"
                  onPress={handleCreatePieza}
                />
              )}

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setModalPiezaVisible(false)}>
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL HU-015: REGISTRO DE MAQUINARIA (SUPERVISOR / ADMIN)                 */}
      {/* ========================================================================= */}
      <Modal visible={modalMaquinaVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={styles.modalTitle}>Registrar Nueva Maquinaria</Text>
              <Text style={styles.modalSubtitle}>
                Poner equipo a disposición de los técnicos.
              </Text>

              <CustomInput
                placeholder="Código de la máquina (ej: CAT-320D)"
                value={newMaqCodigo}
                onChangeText={setNewMaqCodigo}
              />

              <CustomInput
                placeholder="Nombre del equipo (ej: Excavadora Hidráulica CAT)"
                value={newMaqNombre}
                onChangeText={setNewMaqNombre}
              />

              <CustomInput
                placeholder="Tipo de maquinaria (ej: Excavadora, Prensa)"
                value={newMaqTipo}
                onChangeText={setNewMaqTipo}
              />

              <CustomInput
                placeholder="URL del manual técnico en línea (guía del fabricante)"
                value={newMaqManual}
                onChangeText={setNewMaqManual}
              />

              <CustomInput
                placeholder="Descripción del sistema hidráulico"
                value={newMaqDesc}
                onChangeText={setNewMaqDesc}
              />

              {modalMaqError ? (
                <View style={styles.modalErrorContainer}>
                  <Text style={styles.errorText}>{modalMaqError}</Text>
                </View>
              ) : null}

              {savingMaquina ? (
                <ActivityIndicator size="large" color={COLORS.orange} style={styles.loaderMargin10} />
              ) : (
                <PrimaryButton
                  title="Registrar Maquinaria"
                  onPress={() => handleCreateMaquina(false)}
                />
              )}

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setModalMaquinaVisible(false)}>
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL CREAR USUARIO (SOLO ADMIN)                                          */}
      {/* ========================================================================= */}
      <Modal visible={modalUserVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={styles.modalTitle}>Crear Nuevo Usuario</Text>
              <Text style={styles.modalSubtitle}>
                Asignado a {user.empresa?.nombre}.
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

              {modalUserError ? (
                <View style={styles.modalErrorContainer}>
                  <Text style={styles.errorText}>{modalUserError}</Text>
                </View>
              ) : null}

              {creatingUser ? (
                <ActivityIndicator size="large" color={COLORS.orange} style={styles.loaderMargin10} />
              ) : (
                <PrimaryButton
                  title="Crear Usuario"
                  onPress={handleCreateUser}
                />
              )}

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setModalUserVisible(false)}>
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
  scrollMain: {
    paddingBottom: 40,
  },
  flex1: {
    flex: 1,
  },
  rowAlignCenter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    marginTop: 4,
    marginBottom: 10,
  },
  textBold: {
    fontWeight: '700',
  },
  loaderMargin15: {
    marginVertical: 15,
  },
  loaderMargin10: {
    marginTop: 10,
  },
  marginTop15: {
    marginTop: 15,
  },
  centerMargin10: {
    alignSelf: 'center',
    marginTop: 10,
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
  sectionContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
    maxWidth: 240,
  },
  actionBtnOrange: {
    backgroundColor: COLORS.orange,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  actionBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  searchBox: {
    marginBottom: 12,
  },
  searchInput: {
    height: 44,
    backgroundColor: COLORS.surface2,
    borderRadius: 8,
    paddingHorizontal: 14,
    color: COLORS.textPrimary,
    fontSize: 13,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  machineListGrid: {
    marginTop: 4,
  },
  machineItemCard: {
    backgroundColor: COLORS.surface2,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  machineItemCode: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.orange,
  },
  machineItemName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  machineItemType: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  selectMachineArrow: {
    color: COLORS.orange,
    fontSize: 12,
    fontWeight: '700',
  },
  selectedMachineCard: {
    backgroundColor: COLORS.surface2,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.orange,
    marginTop: 4,
  },
  selectedMachineHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  selectedMachineCode: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.orange,
  },
  selectedMachineName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  selectedMachineType: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  changeMachineBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  changeMachineText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  manualButton: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 106, 0, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 106, 0, 0.4)',
    alignItems: 'center',
  },
  manualButtonText: {
    color: COLORS.orange,
    fontSize: 12,
    fontWeight: '700',
  },
  noManualText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 8,
    fontStyle: 'italic',
  },
  alertNoticeBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    borderRadius: 10,
    padding: 14,
    marginVertical: 6,
  },
  alertNoticeTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.danger,
    marginBottom: 4,
  },
  alertNoticeText: {
    fontSize: 12,
    color: COLORS.textPrimary,
    lineHeight: 18,
  },
  emptyPartBox: {
    backgroundColor: COLORS.surface2,
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginVertical: 6,
  },
  emptyPartText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  piezaItemCard: {
    backgroundColor: COLORS.surface2,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  piezaItemCode: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginRight: 8,
  },
  piezaItemName: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  piezaItemTipo: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  viewSheetText: {
    color: COLORS.orange,
    fontSize: 12,
    fontWeight: '700',
  },
  validationBadge: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  badgeValidada: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  badgePendiente: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  validationBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  textSuccess: {
    color: COLORS.success,
  },
  textWarning: {
    color: COLORS.warning,
  },
  textDanger: {
    color: COLORS.danger,
  },
  notifCard: {
    backgroundColor: COLORS.surface2,
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  notifMessage: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
    lineHeight: 18,
  },
  notifMeta: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  notifActionRow: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  validateButton: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  validateButtonText: {
    color: COLORS.success,
    fontSize: 12,
    fontWeight: '700',
  },
  userItem: {
    backgroundColor: COLORS.surface2,
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
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
    marginTop: 4,
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
  emptyText: {
    textAlign: 'center',
    color: COLORS.textSecondary,
    marginVertical: 14,
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 22,
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
    marginTop: 4,
  },
  detailBox: {
    backgroundColor: COLORS.surface2,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.silver,
    textTransform: 'uppercase',
    marginTop: 8,
  },
  detailValueBold: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.orange,
    marginTop: 2,
  },
  detailValue: {
    fontSize: 13,
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  subDetailText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 3,
  },
  alreadyExistsBanner: {
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    borderRadius: 8,
    padding: 10,
    marginTop: 4,
  },
  alreadyExistsBannerText: {
    fontSize: 12,
    color: '#38BDF8',
    textAlign: 'center',
    fontWeight: '600',
  },
  selectorLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.silver,
    marginBottom: 6,
    marginTop: 6,
    textTransform: 'uppercase',
  },
  roleSelectorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
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
  roleSelectOptionActive: {
    borderColor: COLORS.orange,
    backgroundColor: 'rgba(255, 106, 0, 0.15)',
  },
  roleSelectText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  roleSelectTextActive: {
    color: COLORS.orange,
    fontWeight: '700',
  },
  cancelButton: {
    marginTop: 10,
    alignItems: 'center',
    paddingVertical: 8,
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
    marginBottom: 10,
  },
  errorText: {
    color: COLORS.danger,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '500',
  },
});

export default DashboardScreen;
