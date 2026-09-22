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
import { submitPart } from '../api/partsApi';
import HeaderBar from '../components/HeaderBar';
import Badge from '../components/Badge';
import PrimaryButton from '../components/PrimaryButton';
import { COLORS } from '../constants/colors';

const PartDetailScreen = ({ part, onBack, onNavigateReview }) => {
  const { role } = useAuth();
  const isSupervisorOrAdmin = role === 'admin' || role === 'supervisor';
  const [submitting, setSubmitting] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(part?.estado_validacion || 'borrador');

  const handleSubmitReview = async () => {
    setSubmitting(true);
    try {
      await submitPart(part.id);
      setCurrentStatus('pendiente');
      Alert.alert('Enviada', 'La ficha técnica ha sido enviada a revisión del supervisor.');
    } catch (err) {
      Alert.alert('Error', err.message || 'No se pudo enviar la pieza a revisión.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <HeaderBar
        title="Ficha Técnica de Pieza"
        role={role}
        onBack={onBack}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.flex1}>
              <Text style={styles.code}>[{part?.codigo}]</Text>
              <Text style={styles.name}>{part?.nombre}</Text>
              <Text style={styles.type}>TIPO: {part?.tipo?.toUpperCase()}</Text>
            </View>
            <Badge status={currentStatus} />
          </View>

          {part?.descripcion ? (
            <View style={styles.sectionBox}>
              <Text style={styles.boxLabel}>DESCRIPCIÓN Y NOTAS:</Text>
              <Text style={styles.boxValue}>{part.descripcion}</Text>
            </View>
          ) : null}

          {/* Fotos adjuntas */}
          <View style={styles.sectionBox}>
            <Text style={styles.boxLabel}>EVIDENCIAS FOTOGRÁFICAS:</Text>
            {part?.fotos && part.fotos.length > 0 ? (
              part.fotos.map((f, i) => (
                <Text key={i} style={styles.photoLink}>
                  📷 Foto #{i + 1}: {f}
                </Text>
              ))
            ) : (
              <Text style={styles.emptyPhotoText}>Sin fotografías adjuntas.</Text>
            )}
          </View>

          {/* Acciones según estado y rol */}
          {currentStatus === 'borrador' ? (
            <View style={styles.actionContainer}>
              <Text style={styles.actionHint}>
                Esta pieza está en modo borrador. Cuando termines de cargar los datos técnicos, envíala al supervisor.
              </Text>
              <PrimaryButton
                title="Enviar Ficha a Revisión"
                onPress={handleSubmitReview}
                loading={submitting}
              />
            </View>
          ) : null}

          {currentStatus === 'pendiente' && isSupervisorOrAdmin ? (
            <View style={styles.actionContainer}>
              <Text style={styles.actionHint}>
                Esta pieza está pendiente de aprobación por el equipo de supervisión.
              </Text>
              <PrimaryButton
                title="Evaluar y Resolver Pieza (Aprobar/Rechazar)"
                onPress={() => onNavigateReview && onNavigateReview(part)}
              />
            </View>
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
  },
  flex1: {
    flex: 1,
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
  sectionBox: {
    backgroundColor: COLORS.surface2,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    marginTop: 10,
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
  photoLink: {
    fontSize: 12,
    color: COLORS.orange,
    marginTop: 2,
  },
  emptyPhotoText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  actionContainer: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  actionHint: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 8,
    lineHeight: 16,
    textAlign: 'center',
  },
});

export default PartDetailScreen;
