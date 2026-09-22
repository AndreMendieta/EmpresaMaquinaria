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
import { assignOrder, updateOrderProgress } from '../api/ordersApi';
import HeaderBar from '../components/HeaderBar';
import Badge from '../components/Badge';
import CustomButton from '../components/CustomButton';
import ForbiddenNotice from '../components/ForbiddenNotice';
import { COLORS } from '../constants/colors';

const OrderDetailScreen = ({ order, onBack, onOrderUpdated }) => {
  const { role, user } = useAuth();
  const isSupervisorOrAdmin = role === 'admin' || role === 'supervisor';

  const [currentOrder, setCurrentOrder] = useState(order || {});
  const [loadingAction, setLoadingAction] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [forbidden, setForbidden] = useState(false);

  const isAssignedToMe =
    currentOrder.asignada_a &&
    user &&
    String(currentOrder.asignada_a) === String(user.id);

  const handleProgress = async (nuevoEstado) => {
    setLoadingAction(true);
    setErrorMsg('');
    setSuccessMsg('');
    setForbidden(false);
    try {
      const res = await updateOrderProgress(currentOrder.id, nuevoEstado);
      setCurrentOrder(res.orden);
      setSuccessMsg(
        nuevoEstado === 'completada'
          ? '¡Orden marcada como completada con éxito!'
          : 'Orden actualizada a en progreso.'
      );
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

  const handleSelfAssign = async () => {
    if (!user?.id) return;
    setLoadingAction(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await assignOrder(currentOrder.id, user.id);
      setCurrentOrder(res.orden);
      setSuccessMsg('Orden asignada correctamente.');
      if (onOrderUpdated) onOrderUpdated(res.orden);
    } catch (err) {
      if (err.isForbidden) {
        setForbidden(true);
      } else {
        setErrorMsg(err.message || 'No se pudo asignar la orden.');
      }
    } finally {
      setLoadingAction(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <HeaderBar
        title={currentOrder.numero_orden || 'Detalle de Orden'}
        role={role}
        onBack={onBack}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {forbidden ? (
          <ForbiddenNotice message="No tienes permisos para realizar esta operación sobre la orden." />
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

        {/* Resumen Principal */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.flex1}>
              <Text style={styles.codeText}>[{currentOrder.numero_orden}]</Text>
              <Text style={styles.titleText}>{currentOrder.titulo}</Text>
            </View>
            <Badge status={currentOrder.estado || 'pendiente'} />
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Prioridad:</Text>
            <Text style={[styles.infoValue, { color: currentOrder.prioridad === 'urgente' ? COLORS.danger : COLORS.orange }]}>
              {(currentOrder.prioridad || 'normal').toUpperCase()}
            </Text>
          </View>

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

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Asignada a ID:</Text>
            <Text style={styles.infoValue}>
              {currentOrder.asignada_a ? `Usuario #${currentOrder.asignada_a}` : 'Sin técnico asignado'}
            </Text>
          </View>

          {currentOrder.descripcion ? (
            <View style={styles.descSection}>
              <Text style={styles.infoLabel}>Descripción del Trabajo:</Text>
              <Text style={styles.descContent}>{currentOrder.descripcion}</Text>
            </View>
          ) : null}
        </View>

        {/* Panel de Acciones Operativas */}
        <View style={styles.card}>
          <Text style={styles.cardSectionTitle}>Acciones Operativas</Text>

          {/* Supervisor / Admin: Asignar Orden */}
          {isSupervisorOrAdmin && (!currentOrder.asignada_a || currentOrder.estado === 'pendiente') ? (
            <View style={styles.actionBlock}>
              <Text style={styles.actionNotice}>
                Como supervisor o administrador, puedes asignarte o reasignar esta orden para dar inicio a la ejecución técnica.
              </Text>
              <TouchableOpacity
                style={styles.btnAssign}
                disabled={loadingAction}
                onPress={handleSelfAssign}>
                <Text style={styles.btnAssignText}>Asignarme Esta Orden</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {/* Técnico Asignado: Actualizar progreso */}
          {isAssignedToMe && currentOrder.estado !== 'completada' ? (
            <View style={styles.actionBlock}>
              <Text style={styles.actionNotice}>
                Esta orden está asignada a tu usuario. Actualiza el avance según el trabajo de campo realizado.
              </Text>
              {currentOrder.estado === 'pendiente' ? (
                <CustomButton
                  title="Marcar En Progreso"
                  onPress={() => handleProgress('en_progreso')}
                  loading={loadingAction}
                />
              ) : null}

              {currentOrder.estado === 'en_progreso' ? (
                <TouchableOpacity
                  style={styles.btnComplete}
                  disabled={loadingAction}
                  onPress={() => handleProgress('completada')}>
                  <Text style={styles.btnCompleteText}>Finalizar y Completar Orden ✓</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}

          {!isSupervisorOrAdmin && !isAssignedToMe ? (
            <Text style={styles.mutedInfo}>
              No tienes asignada esta orden de servicio. Solo el técnico responsable o un supervisor pueden alterar su progreso.
            </Text>
          ) : null}

          {currentOrder.estado === 'completada' ? (
            <View style={styles.completedBanner}>
              <Text style={styles.completedTitle}>✓ Orden Completada</Text>
              <Text style={styles.completedSubtitle}>
                Los trabajos fueron finalizados satisfactoriamente y registrados en auditoría.
              </Text>
            </View>
          ) : null}

          {loadingAction ? (
            <ActivityIndicator size="small" color={COLORS.orange} style={styles.mt12} />
          ) : null}
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
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.orange,
    fontFamily: 'monospace',
  },
  titleText: {
    fontSize: 16,
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
    paddingVertical: 4,
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
  descSection: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  descContent: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
    marginTop: 4,
  },
  cardSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 10,
  },
  actionBlock: {
    gap: 10,
  },
  actionNotice: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  btnAssign: {
    backgroundColor: 'rgba(255, 106, 0, 0.15)',
    borderWidth: 1,
    borderColor: COLORS.orange,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnAssignText: {
    color: COLORS.orange,
    fontSize: 12,
    fontWeight: '700',
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
  mutedInfo: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontStyle: 'italic',
  },
  completedBanner: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
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
  mt12: {
    marginTop: 12,
  },
});

export default OrderDetailScreen;
