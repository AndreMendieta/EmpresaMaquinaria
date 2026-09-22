import React, { useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { useAuth } from '../auth/useAuth';
import { approvePart, rejectPart } from '../api/partsApi';
import HeaderBar from '../components/HeaderBar';
import Badge from '../components/Badge';
import ForbiddenNotice from '../components/ForbiddenNotice';
import { COLORS } from '../constants/colors';

const PartReviewScreen = ({ part, onBack, onReviewCompleted }) => {
  const { role } = useAuth();
  const isSupervisorOrAdmin = role === 'admin' || role === 'supervisor';

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [forbidden, setForbidden] = useState(!isSupervisorOrAdmin);

  const handleApprove = async () => {
    setErrorMsg('');
    setLoading(true);
    try {
      await approvePart(part.id);
      Alert.alert('Pieza Aprobada', 'La pieza ha sido validada oficialmente.');
      if (onReviewCompleted) onReviewCompleted();
    } catch (err) {
      if (err.isForbidden) {
        setForbidden(true);
      } else {
        setErrorMsg(err.message || 'Error al aprobar la pieza.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    setErrorMsg('');
    setLoading(true);
    try {
      await rejectPart(part.id);
      Alert.alert('Pieza Devuelta', 'La pieza ha sido marcada como rechazada.');
      if (onReviewCompleted) onReviewCompleted();
    } catch (err) {
      if (err.isForbidden) {
        setForbidden(true);
      } else {
        setErrorMsg(err.message || 'Error al rechazar la pieza.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <HeaderBar
        title="Validación de Pieza"
        role={role}
        onBack={onBack}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {forbidden ? (
          <ForbiddenNotice message="Solo supervisores y administradores tienen permisos para validar o rechazar piezas técnicas." />
        ) : null}

        {errorMsg ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        ) : null}

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.flex1}>
              <Text style={styles.code}>[{part?.codigo}]</Text>
              <Text style={styles.name}>{part?.nombre}</Text>
              <Text style={styles.type}>TIPO: {part?.tipo?.toUpperCase()}</Text>
            </View>
            <Badge status={part?.estado_validacion || 'pendiente'} />
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>📋 REVISIÓN TÉCNICA DE CONTROL DE CALIDAD</Text>
            <Text style={styles.infoText}>
              Como supervisor, debes verificar que las medidas, fotos y especificaciones cumplan con el manual de la maquinaria antes de certificar la pieza.
            </Text>
          </View>

          {part?.descripcion ? (
            <View style={styles.sectionBox}>
              <Text style={styles.boxLabel}>NOTAS DEL TÉCNICO:</Text>
              <Text style={styles.boxValue}>{part.descripcion}</Text>
            </View>
          ) : null}

          {/* Botones de decisión */}
          <View style={styles.buttonGroup}>
            <TouchableOpacity
              style={[styles.btn, styles.btnApprove]}
              onPress={handleApprove}
              disabled={loading || forbidden}>
              <Text style={styles.btnText}>✅ Aprobar y Validar Pieza</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btn, styles.btnReject]}
              onPress={handleReject}
              disabled={loading || forbidden}>
              <Text style={styles.btnText}>❌ Rechazar / Devolver a Técnico</Text>
            </TouchableOpacity>
          </View>
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
  flex1: {
    flex: 1,
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
  card: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 18,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  code: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.orange,
    fontFamily: 'monospace',
  },
  name: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  type: {
    fontSize: 11,
    color: COLORS.silver,
    fontWeight: '700',
    marginTop: 2,
  },
  infoBox: {
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#38BDF8',
    marginBottom: 2,
  },
  infoText: {
    fontSize: 12,
    color: COLORS.textPrimary,
    lineHeight: 16,
  },
  sectionBox: {
    backgroundColor: COLORS.surface2,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    marginBottom: 14,
  },
  boxLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.silver,
    marginBottom: 4,
  },
  boxValue: {
    fontSize: 13,
    color: COLORS.textPrimary,
    lineHeight: 18,
  },
  buttonGroup: {
    gap: 10,
    marginTop: 10,
  },
  btn: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnApprove: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderWidth: 1,
    borderColor: COLORS.success,
  },
  btnReject: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderWidth: 1,
    borderColor: COLORS.danger,
  },
  btnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
});

export default PartReviewScreen;
