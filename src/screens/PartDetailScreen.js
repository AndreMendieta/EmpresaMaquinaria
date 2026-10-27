import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Image,
  Linking,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../auth/useAuth';
import { submitPart } from '../api/partsApi';
import HeaderBar from '../components/HeaderBar';
import Badge from '../components/Badge';
import Icon from '../components/Icon';
import PrimaryButton from '../components/PrimaryButton';
import { resolveFileUrl } from '../api/client';
import { parseAttachments, isImageItem } from '../utils/attachments';
import { COLORS } from '../constants/colors';

const HIDDEN_SPEC_KEYS = new Set([
  'id', 'pieza_id', 'empresa_prestadora_id', 'creado_en', 'actualizado_en', 'planos', 'evidencia',
]);

const specLabel = (key) => key.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());

const PartDetailScreen = ({ part, onBack, onNavigateReview, onEdit }) => {
  const { role, user } = useAuth();
  const isSupervisorOrAdmin = role === 'admin' || role === 'supervisor';
  const [submitting, setSubmitting] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(part?.estado_validacion || 'borrador');
  const canEdit =
    Boolean(onEdit && part?.tipo) &&
    (isSupervisorOrAdmin ||
      (part?.creado_por === user?.id && ['borrador', 'rechazada'].includes(currentStatus)));
  const specs = Object.entries(part?.subtipo || {}).filter(
    ([key, value]) => !HIDDEN_SPEC_KEYS.has(key) && value !== null && value !== ''
  );

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

          {canEdit ? (
            <TouchableOpacity style={styles.editBtn} onPress={() => onEdit(part)}>
              <Icon name="edit" size={18} color={COLORS.orange} />
              <Text style={styles.editBtnText}>Editar pieza</Text>
            </TouchableOpacity>
          ) : null}

          {part?.descripcion ? (
            <View style={styles.sectionBox}>
              <Text style={styles.boxLabel}>DESCRIPCIÓN Y NOTAS:</Text>
              <Text style={styles.boxValue}>{part.descripcion}</Text>
            </View>
          ) : null}

          {specs.length > 0 ? (
            <View style={styles.sectionBox}>
              <Text style={styles.boxLabel}>ESPECIFICACIONES TÉCNICAS:</Text>
              {specs.map(([key, value]) => (
                <View key={key} style={styles.specRow}>
                  <Text style={styles.specKey}>{specLabel(key)}</Text>
                  <Text style={styles.specValue}>{String(value)}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {/* Fotos adjuntas */}
          <View style={styles.sectionBox}>
            <Text style={styles.boxLabel}>EVIDENCIAS FOTOGRÁFICAS:</Text>
            {part?.fotos && part.fotos.length > 0 ? (
              part.fotos.map((f, i) => (
                <TouchableOpacity key={i} onPress={() => Linking.openURL(resolveFileUrl(f))}>
                  <Image source={{ uri: resolveFileUrl(f) }} style={styles.photo} resizeMode="cover" />
                </TouchableOpacity>
              ))
            ) : (
              <Text style={styles.emptyPhotoText}>Sin fotografías adjuntas.</Text>
            )}
          </View>

          {['planos', 'evidencia'].map((campo) => {
            const items = parseAttachments(part?.subtipo?.[campo] || part?.[campo]);
            if (items.length === 0) return null;
            return (
              <View key={campo} style={styles.sectionBox}>
                <Text style={styles.boxLabel}>{campo === 'planos' ? 'PLANOS:' : 'EVIDENCIA:'}</Text>
                {items.map((item, i) =>
                  isImageItem(item) ? (
                    <TouchableOpacity key={i} onPress={() => Linking.openURL(resolveFileUrl(item.url))}>
                      <Image source={{ uri: resolveFileUrl(item.url) }} style={styles.photo} resizeMode="cover" />
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity key={i} style={styles.fileRow} onPress={() => Linking.openURL(resolveFileUrl(item.url))}>
                      <Icon name="file" size={18} color={COLORS.orange} />
                      <Text style={styles.photoLink}>{item.name}</Text>
                    </TouchableOpacity>
                  )
                )}
              </View>
            );
          })}

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
  photo: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    marginBottom: 10,
    backgroundColor: COLORS.surface2,
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
    fontSize: 13,
    color: COLORS.orange,
    flexShrink: 1,
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.orange,
    marginBottom: 4,
  },
  editBtnText: {
    color: COLORS.orange,
    fontSize: 14,
    fontWeight: '800',
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  specKey: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  specValue: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
    flexShrink: 1,
    textAlign: 'right',
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
