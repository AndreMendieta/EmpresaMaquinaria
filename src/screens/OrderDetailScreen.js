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
import {
  getOrderById,
  assignOrder,
  updateOrderProgress,
  updateOrder,
  addOrderEvidence,
} from '../api/ordersApi';
import { getTechnicians } from '../api/usersApi';
import HeaderBar from '../components/HeaderBar';
import Badge from '../components/Badge';
import CustomInput from '../components/CustomInput';
import CustomButton from '../components/CustomButton';
import ForbiddenNotice from '../components/ForbiddenNotice';
import { COLORS } from '../constants/colors';

const ETAPAS = [
  { key: 'antes', label: '🟡 Antes / Diagnóstico', color: '#F59E0B' },
  { key: 'durante', label: '🔵 Durante / Intervención', color: '#38BDF8' },
  { key: 'despues', label: '🟢 Después / Finalizado', color: '#10B981' },
];

const OrderDetailScreen = ({ order, onBack, onOrderUpdated }) => {
  const { role, user } = useAuth();
  const isSupervisorOrAdmin = role === 'admin' || role === 'supervisor';

  const [currentOrder, setCurrentOrder] = useState(order || {});
  const [loadingAction, setLoadingAction] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [forbidden, setForbidden] = useState(false);

  // Lista de técnicos para asignación (supervisores/admin)
  const [technicians, setTechnicians] = useState([]);
  const [modalAssignVisible, setModalAssignVisible] = useState(false);
  const [modalEditVisible, setModalEditVisible] = useState(false);
  const [editTitle, setEditTitle] = useState(order?.titulo || '');
  const [editDescription, setEditDescription] = useState(order?.descripcion || '');
  const [editPriority, setEditPriority] = useState(order?.prioridad || 'normal');

  // Modal para agregar evidencia técnica
  const [modalEvidenceVisible, setModalEvidenceVisible] = useState(false);
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [evidenceDesc, setEvidenceDesc] = useState('');
  const [evidenceEtapa, setEvidenceEtapa] = useState('despues');
  const [savingEvidence, setSavingEvidence] = useState(false);

  // Cargar datos completos y frescos de la orden
  const loadOrderDetails = useCallback(async () => {
    if (!currentOrder?.id) return;
    try {
      const res = await getOrderById(currentOrder.id);
      if (res.orden) {
        setCurrentOrder(res.orden);
        if (onOrderUpdated) onOrderUpdated(res.orden);
      }
    } catch {
      // Usar datos locales si falla get individual
    }
  }, [currentOrder?.id, onOrderUpdated]);

  useEffect(() => {
    loadOrderDetails();
    if (isSupervisorOrAdmin) {
      getTechnicians()
        .then((res) => setTechnicians(res.tecnicos || []))
        .catch(() => {});
    }
  }, [loadOrderDetails, isSupervisorOrAdmin]);

  const isAssignedToMe =
    currentOrder.asignada_a &&
    user &&
    String(currentOrder.asignada_a) === String(user.id);

  const handleEditOrder = async () => {
    if (!editTitle.trim()) {
      setErrorMsg('El título de la orden es obligatorio.');
      return;
    }
    setLoadingAction(true);
    setErrorMsg('');
    try {
      const res = await updateOrder(currentOrder.id, {
        titulo: editTitle,
        descripcion: editDescription,
        prioridad: editPriority,
      });
      setCurrentOrder(res.orden);
      setModalEditVisible(false);
      setSuccessMsg('Orden modificada correctamente.');
      if (onOrderUpdated) onOrderUpdated(res.orden);
    } catch (err) {
      setErrorMsg(err.message || 'No se pudo modificar la orden.');
    } finally {
      setLoadingAction(false);
    }
  };

  // 1. Cambio de estado de la orden
  const handleProgress = async (nuevoEstado) => {
    setLoadingAction(true);
    setErrorMsg('');
    setSuccessMsg('');
    setForbidden(false);
    try {
      const res = await updateOrderProgress(currentOrder.id, nuevoEstado);
      setCurrentOrder(res.orden);
      setSuccessMsg(`Estado actualizado exitosamente a "${nuevoEstado.replace('_', ' ')}".`);
      if (onOrderUpdated) onOrderUpdated(res.orden);
    } catch (err) {
      if (err.isForbidden) {
        setForbidden(true);
      } else {
        setErrorMsg(err.message || 'No se pudo actualizar el estado de la orden.');
      }
    } finally {
      setLoadingAction(false);
    }
  };

  // 2. Asignación de técnico
  const handleAssignTechnician = async (techId) => {
    setLoadingAction(true);
    setErrorMsg('');
    setSuccessMsg('');
    setModalAssignVisible(false);
    try {
      const res = await assignOrder(currentOrder.id, techId);
      setCurrentOrder(res.orden);
      setSuccessMsg('Técnico asignado correctamente a la orden.');
      if (onOrderUpdated) onOrderUpdated(res.orden);
    } catch (err) {
      if (err.isForbidden) {
        setForbidden(true);
      } else {
        setErrorMsg(err.message || 'No se pudo asignar el técnico.');
      }
    } finally {
      setLoadingAction(false);
    }
  };

  // 3. Agregar Evidencia del trabajo realizado
  const handleAddEvidence = async () => {
    if (!evidenceDesc.trim() && !evidenceUrl.trim()) {
      setErrorMsg('Debes ingresar al menos una descripción o un enlace fotográfico.');
      return;
    }

    setSavingEvidence(true);
    setErrorMsg('');
    try {
      const res = await addOrderEvidence(currentOrder.id, {
        url: evidenceUrl,
        descripcion: evidenceDesc,
        etapa: evidenceEtapa,
      });

      setCurrentOrder(res.orden);
      setSuccessMsg('Evidencia técnica registrada satisfactoriamente.');
      setModalEvidenceVisible(false);
      setEvidenceUrl('');
      setEvidenceDesc('');
      setEvidenceEtapa('despues');
      if (onOrderUpdated) onOrderUpdated(res.orden);
    } catch (err) {
      if (err.isForbidden) {
        setForbidden(true);
        setModalEvidenceVisible(false);
      } else {
        setErrorMsg(err.message || 'No se pudo guardar la evidencia.');
      }
    } finally {
      setSavingEvidence(false);
    }
  };

  const evidencias = Array.isArray(currentOrder.evidencias) ? currentOrder.evidencias : [];

  return (
    <SafeAreaView style={styles.container}>
      <HeaderBar
        title={currentOrder.numero_orden || 'Detalle de Orden'}
        role={role}
        onBack={onBack}
        onRightAction={loadOrderDetails}
        rightActionLabel="Refrescar"
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {forbidden ? (
          <ForbiddenNotice message="No tienes permisos para realizar operaciones sobre esta orden de servicio." />
        ) : null}

        {errorMsg ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        ) : null}

        {successMsg ? (
          <View style={styles.successBox}>
            <Text style={styles.successText}>{successMsg}</Text>
          </View>
        ) : null}

        {/* ======================================================== */}
        {/* RESUMEN DE LOS 7 DATOS PRINCIPALES DE LA ORDEN DE TRABAJO */}
        {/* ======================================================== */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.flex1}>
              <Text style={styles.codeText}>[{currentOrder.numero_orden}]</Text>
              <Text style={styles.titleText}>{currentOrder.titulo}</Text>
            </View>
            <Badge status={currentOrder.estado || 'abierta'} />
          </View>

          <View style={styles.divider} />

          {/* 1. Empresa Cliente */}
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Empresa Cliente:</Text>
            <Text style={styles.infoValue}>
              {currentOrder.cliente_nombre || (currentOrder.empresa_cliente_id ? `Cliente #${currentOrder.empresa_cliente_id}` : 'Sin cliente directo')}
            </Text>
          </View>

          {/* 2. Máquina Asociada */}
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Máquina Asociada:</Text>
            <Text style={styles.infoValue}>
              {currentOrder.maquina_codigo ? `[${currentOrder.maquina_codigo}] ${currentOrder.maquina_nombre || ''}` : currentOrder.maquina_nombre || 'Sin máquina'}
            </Text>
          </View>

          {/* 4. Prioridad */}
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Prioridad:</Text>
            <Text
              style={[
                styles.infoValue,
                {
                  color:
                    currentOrder.prioridad === 'urgente'
                      ? COLORS.danger
                      : currentOrder.prioridad === 'alta'
                      ? COLORS.orange
                      : COLORS.textPrimary,
                },
              ]}>
              {(currentOrder.prioridad || 'normal').toUpperCase()}
            </Text>
          </View>

          {/* 5. Técnico Asignado */}
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Técnico Asignado:</Text>
            <View style={styles.techAssignRow}>
              <Text style={[styles.infoValue, { color: currentOrder.tecnico_nombre ? COLORS.orange : COLORS.textMuted }]}>
                {currentOrder.tecnico_nombre
                  ? `👷 ${currentOrder.tecnico_nombre}`
                  : currentOrder.asignada_a
                  ? `Usuario #${currentOrder.asignada_a}`
                  : 'Sin técnico asignado'}
              </Text>
              {isSupervisorOrAdmin ? (
                <TouchableOpacity
                  style={styles.btnChangeTech}
                  onPress={() => setModalAssignVisible(true)}>
                  <Text style={styles.btnChangeTechText}>Cambiar</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          {/* 6. Fechas y Estado */}
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Fecha Creación:</Text>
            <Text style={styles.infoValue}>
              {currentOrder.creado_en ? new Date(currentOrder.creado_en).toLocaleString('es-CO') : 'Reciente'}
            </Text>
          </View>

          {currentOrder.completada_en ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Fecha Completada:</Text>
              <Text style={[styles.infoValue, { color: COLORS.success }]}>
                {new Date(currentOrder.completada_en).toLocaleString('es-CO')}
              </Text>
            </View>
          ) : null}

          {/* 3. Descripción del Trabajo */}
          {currentOrder.descripcion ? (
            <View style={styles.descSection}>
              <Text style={styles.descLabel}>Descripción del Trabajo Solicitado:</Text>
              <Text style={styles.descContent}>{currentOrder.descripcion}</Text>
            </View>
          ) : null}
          {isSupervisorOrAdmin ? (
            <TouchableOpacity
              style={styles.btnAddEvidenceTrigger}
              onPress={() => {
                setEditTitle(currentOrder.titulo || '');
                setEditDescription(currentOrder.descripcion || '');
                setEditPriority(currentOrder.prioridad || 'normal');
                setModalEditVisible(true);
              }}>
              <Text style={styles.btnAddEvidenceTriggerText}>Modificar orden</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* ======================================================== */}
        {/* 7. EVIDENCIAS DEL TRABAJO REALIZADO                       */}
        {/* ======================================================== */}
        <View style={styles.card}>
          <View style={styles.evidenceSectionHeader}>
            <View>
              <Text style={styles.cardSectionTitle}>📷 Evidencias del Trabajo Realizado</Text>
              <Text style={styles.evidenceSubtitle}>
                Registro fotográfico y reportes técnicos de antes, durante y después.
              </Text>
            </View>
            <TouchableOpacity
              style={styles.btnAddEvidenceTrigger}
              onPress={() => setModalEvidenceVisible(true)}>
              <Text style={styles.btnAddEvidenceTriggerText}>+ Evidencia</Text>
            </TouchableOpacity>
          </View>

          {evidencias.length === 0 ? (
            <View style={styles.emptyEvidenciasBox}>
              <Text style={styles.emptyEvidenciasText}>
                Aún no se han adjuntado evidencias fotográficas o notas de inspección técnica para esta orden.
              </Text>
              <TouchableOpacity
                style={styles.btnFirstEvidence}
                onPress={() => setModalEvidenceVisible(true)}>
                <Text style={styles.btnFirstEvidenceText}>+ Registrar Primera Evidencia</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.evidenciasGrid}>
              {evidencias.map((evi, idx) => {
                const etapaInfo = ETAPAS.find((e) => e.key === evi.etapa) || ETAPAS[1];
                return (
                  <View key={evi.id || idx} style={styles.evidenceItem}>
                    <View style={styles.evidenceItemHeader}>
                      <View style={[styles.etapaBadge, { borderColor: etapaInfo.color }]}>
                        <Text style={[styles.etapaBadgeText, { color: etapaInfo.color }]}>
                          {etapaInfo.label}
                        </Text>
                      </View>
                      <Text style={styles.evidenceDate}>
                        {evi.creado_en ? new Date(evi.creado_en).toLocaleDateString('es-CO') : 'Reciente'}
                      </Text>
                    </View>

                    {evi.url ? (
                      <View style={styles.evidenceUrlContainer}>
                        <Text style={styles.evidenceUrlLabel}>Foto / Archivo:</Text>
                        <Text style={styles.evidenceUrlLink} numberOfLines={1}>
                          🔗 {evi.url}
                        </Text>
                      </View>
                    ) : null}

                    <Text style={styles.evidenceItemDesc}>{evi.descripcion}</Text>

                    {evi.autor_nombre ? (
                      <Text style={styles.evidenceAuthor}>Registrado por: {evi.autor_nombre}</Text>
                    ) : null}
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* ======================================================== */}
        {/* PANEL DE CONTROL DE ESTADO OPERATIVO                     */}
        {/* ======================================================== */}
        <View style={styles.card}>
          <Text style={styles.cardSectionTitle}>Control del Estado de la Orden</Text>

          {/* Si soy el técnico asignado */}
          {isAssignedToMe && currentOrder.estado !== 'completada' ? (
            <View style={styles.actionBlock}>
              <Text style={styles.actionNotice}>
                Esta orden está asignada a tu usuario. Actualiza el estado según tu avance técnico:
              </Text>

              {currentOrder.estado === 'abierta' ? (
                <CustomButton
                  title="▶ Iniciar Trabajo (En Progreso)"
                  onPress={() => handleProgress('en_progreso')}
                  loading={loadingAction}
                />
              ) : null}

              {currentOrder.estado === 'en_progreso' ? (
                <TouchableOpacity
                  style={styles.btnComplete}
                  disabled={loadingAction}
                  onPress={() => handleProgress('completada')}>
                  <Text style={styles.btnCompleteText}>✓ Finalizar y Completar Orden de Trabajo</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}

          {/* Supervisor / Admin: controles universales de estado */}
          {isSupervisorOrAdmin ? (
            <View style={styles.adminStatusRow}>
              {currentOrder.estado !== 'en_progreso' && currentOrder.estado !== 'completada' ? (
                <TouchableOpacity
                  style={styles.btnStatusOption}
                  disabled={loadingAction}
                  onPress={() => handleProgress('en_progreso')}>
                  <Text style={styles.btnStatusOptionText}>Marcar En Progreso</Text>
                </TouchableOpacity>
              ) : null}

              {currentOrder.estado !== 'completada' ? (
                <TouchableOpacity
                  style={[styles.btnStatusOption, styles.btnStatusComplete]}
                  disabled={loadingAction}
                  onPress={() => handleProgress('completada')}>
                  <Text style={[styles.btnStatusOptionText, styles.btnStatusCompleteText]}>
                    Completar Orden
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.btnStatusOption}
                  disabled={loadingAction}
                  onPress={() => handleProgress('en_progreso')}>
                  <Text style={styles.btnStatusOptionText}>Reabrir Orden</Text>
                </TouchableOpacity>
              )}

              {currentOrder.estado !== 'cancelada' ? (
                <TouchableOpacity
                  style={[styles.btnStatusOption, styles.btnStatusCancel]}
                  disabled={loadingAction}
                  onPress={() => handleProgress('cancelada')}>
                  <Text style={[styles.btnStatusOptionText, styles.btnStatusCancelText]}>
                    Cancelar
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}

          {currentOrder.estado === 'completada' ? (
            <View style={styles.completedBanner}>
              <Text style={styles.completedTitle}>✓ Orden de Trabajo Finalizada</Text>
              <Text style={styles.completedSubtitle}>
                Las labores y evidencias técnicas han sido concluidas y auditadas.
              </Text>
            </View>
          ) : null}

          {loadingAction ? (
            <ActivityIndicator size="small" color={COLORS.orange} style={styles.mt12} />
          ) : null}
        </View>
      </ScrollView>

      <Modal visible={modalEditVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Modificar Orden</Text>
            <CustomInput label="Título" value={editTitle} onChangeText={setEditTitle} />
            <CustomInput label="Descripción" value={editDescription} onChangeText={setEditDescription} multiline numberOfLines={3} />
            <Text style={styles.modalSubtitle}>Prioridad</Text>
            <View style={styles.modalStageRow}>
              {['baja', 'normal', 'alta', 'urgente'].map((priority) => (
                <TouchableOpacity key={priority} style={[styles.modalEtapaChip, editPriority === priority && styles.modalEtapaChipSelected]} onPress={() => setEditPriority(priority)}>
                  <Text style={styles.modalEtapaChipText}>{priority.toUpperCase()}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.btnModalCancel} onPress={() => setModalEditVisible(false)}>
                <Text style={styles.btnModalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <CustomButton title="Guardar" onPress={handleEditOrder} loading={loadingAction} />
            </View>
          </View>
        </View>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL: AGREGAR EVIDENCIA DEL TRABAJO REALIZADO           */}
      {/* ======================================================== */}
      <Modal visible={modalEvidenceVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Adjuntar Evidencia Técnica</Text>
            <Text style={styles.modalSubtitle}>
              Registra evidencias de la condición del equipo o del trabajo ejecutado:
            </Text>

            <Text style={styles.fieldLabel}>Etapa de la Evidencia:</Text>
            <View style={styles.etapasRow}>
              {ETAPAS.map((et) => {
                const isSel = evidenceEtapa === et.key;
                return (
                  <TouchableOpacity
                    key={et.key}
                    style={[styles.modalEtapaChip, isSel && styles.modalEtapaChipSelected]}
                    onPress={() => setEvidenceEtapa(et.key)}>
                    <Text style={[styles.modalEtapaChipText, isSel && styles.modalEtapaChipTextSelected]}>
                      {et.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <CustomInput
              label="URL o Enlace de la Fotografía (opcional)"
              placeholder="https://servidor.com/evidencias/foto.jpg"
              value={evidenceUrl}
              onChangeText={setEvidenceUrl}
              autoCapitalize="none"
            />

            <CustomInput
              label="Descripción o Reporte Técnico *"
              placeholder="Detalla lo observado o ejecutado (ej: Sellos nuevos montados, prueba hidrostática a 3000 PSI sin fugas)..."
              value={evidenceDesc}
              onChangeText={setEvidenceDesc}
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.btnModalCancel}
                onPress={() => setModalEvidenceVisible(false)}>
                <Text style={styles.btnModalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <CustomButton
                title={savingEvidence ? 'Guardando...' : 'Registrar Evidencia'}
                onPress={handleAddEvidence}
                loading={savingEvidence}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL: ASIGNAR / REASIGNAR TÉCNICO                       */}
      {/* ======================================================== */}
      <Modal visible={modalAssignVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Asignar Técnico de Trabajo</Text>
            <Text style={styles.modalSubtitle}>
              Selecciona el especialista responsable de la orden:
            </Text>

            <ScrollView style={styles.techListScroll}>
              <TouchableOpacity
                style={styles.techOptionItem}
                onPress={() => handleAssignTechnician(null)}>
                <Text style={styles.techOptionName}>Sin asignar (Dejar libre)</Text>
              </TouchableOpacity>
              {technicians.map((t) => {
                const isCurrent = currentOrder.asignada_a === t.id;
                return (
                  <TouchableOpacity
                    key={t.id}
                    style={[styles.techOptionItem, isCurrent && styles.techOptionItemSelected]}
                    onPress={() => handleAssignTechnician(t.id)}>
                    <Text style={[styles.techOptionName, isCurrent && styles.techOptionNameSelected]}>
                      👷 {t.nombre_completo}
                    </Text>
                    <Text style={styles.techOptionEmail}>{t.correo}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              style={styles.btnModalCancel}
              onPress={() => setModalAssignVisible(false)}>
              <Text style={styles.btnModalCancelText}>Cerrar</Text>
            </TouchableOpacity>
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
    gap: 16,
  },
  flex1: {
    flex: 1,
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    borderRadius: 8,
    padding: 10,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '600',
  },
  successBox: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)',
    borderRadius: 8,
    padding: 10,
  },
  successText: {
    color: COLORS.success,
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '600',
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  codeText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.orange,
    fontFamily: 'monospace',
  },
  titleText: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
  },
  infoLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  infoValue: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  techAssignRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  btnChangeTech: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(255, 106, 0, 0.12)',
    borderWidth: 1,
    borderColor: COLORS.orange,
    borderRadius: 4,
  },
  btnChangeTechText: {
    fontSize: 10,
    color: COLORS.orange,
    fontWeight: '700',
  },
  descSection: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  descLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  descContent: {
    fontSize: 13,
    color: COLORS.textPrimary,
    lineHeight: 19,
  },
  cardSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  evidenceSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  evidenceSubtitle: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  btnAddEvidenceTrigger: {
    backgroundColor: 'rgba(255, 106, 0, 0.15)',
    borderWidth: 1,
    borderColor: COLORS.orange,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  btnAddEvidenceTriggerText: {
    color: COLORS.orange,
    fontSize: 12,
    fontWeight: '700',
  },
  emptyEvidenciasBox: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    alignItems: 'center',
  },
  emptyEvidenciasText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 10,
  },
  btnFirstEvidence: {
    backgroundColor: COLORS.orange,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  btnFirstEvidenceText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  evidenciasGrid: {
    gap: 10,
  },
  evidenceItem: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
  },
  evidenceItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  etapaBadge: {
    borderWidth: 1,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  etapaBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  evidenceDate: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  evidenceUrlContainer: {
    marginBottom: 6,
  },
  evidenceUrlLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  evidenceUrlLink: {
    fontSize: 11,
    color: '#38BDF8',
    fontWeight: '600',
  },
  evidenceItemDesc: {
    fontSize: 13,
    color: COLORS.textPrimary,
    lineHeight: 18,
  },
  evidenceAuthor: {
    fontSize: 10,
    color: COLORS.silver,
    marginTop: 6,
    fontStyle: 'italic',
  },
  actionBlock: {
    gap: 10,
    marginTop: 10,
  },
  actionNotice: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  btnComplete: {
    backgroundColor: COLORS.success,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnCompleteText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '800',
  },
  adminStatusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  btnStatusOption: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnStatusOptionText: {
    fontSize: 12,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  btnStatusComplete: {
    borderColor: COLORS.success,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  btnStatusCompleteText: {
    color: COLORS.success,
    fontWeight: '700',
  },
  btnStatusCancel: {
    borderColor: COLORS.danger,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  btnStatusCancelText: {
    color: COLORS.danger,
    fontWeight: '700',
  },
  completedBanner: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  completedTitle: {
    color: COLORS.success,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  completedSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 12,
    textAlign: 'center',
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
  },
  modalSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  etapasRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  modalEtapaChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  modalEtapaChipSelected: {
    borderColor: COLORS.orange,
    backgroundColor: 'rgba(255, 106, 0, 0.15)',
  },
  modalEtapaChipText: {
    fontSize: 10,
    color: COLORS.textSecondary,
    fontWeight: '600',
    textAlign: 'center',
  },
  modalEtapaChipTextSelected: {
    color: COLORS.orange,
    fontWeight: '700',
  },
  modalActions: {
    marginTop: 14,
    gap: 8,
  },
  btnModalCancel: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  btnModalCancelText: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  techListScroll: {
    maxHeight: 250,
    marginVertical: 10,
  },
  techOptionItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 8,
  },
  techOptionItemSelected: {
    borderColor: COLORS.orange,
    backgroundColor: 'rgba(255, 106, 0, 0.12)',
  },
  techOptionName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  techOptionNameSelected: {
    color: COLORS.orange,
  },
  techOptionEmail: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  mt12: {
    marginTop: 12,
  },
});

export default OrderDetailScreen;
