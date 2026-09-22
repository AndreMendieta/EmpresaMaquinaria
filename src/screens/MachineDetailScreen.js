import React, { useState, useEffect, useCallback } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import { useAuth } from '../auth/useAuth';
import { getParts } from '../api/partsApi';
import HeaderBar from '../components/HeaderBar';
import Badge from '../components/Badge';
import { COLORS } from '../constants/colors';

const MachineDetailScreen = ({
  machine,
  onBack,
  onSelectPart,
  onCreateHose,
  onCreateLathePart,
  onCreateCylinder,
}) => {
  const { role } = useAuth();
  const [parts, setParts] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadParts = useCallback(async () => {
    if (!machine?.id) return;
    setLoading(true);
    try {
      const res = await getParts();
      const all = res.piezas || [];
      const machineParts = all.filter(
        (p) => p.maquinaria_id === machine.id || p.maquina_id === machine.id
      );
      setParts(machineParts);
    } catch (err) {
      console.error('Error cargando piezas del equipo:', err);
    } finally {
      setLoading(false);
    }
  }, [machine?.id]);

  useEffect(() => {
    loadParts();
  }, [loadParts]);

  const handleOpenManual = (url) => {
    if (!url) {
      Alert.alert('Manual No Disponible', 'Esta máquina no tiene una guía técnica asociada.');
      return;
    }
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'No se pudo abrir el enlace del manual técnico.');
    });
  };

  const manualUrl = machine?.url_manual || machine?.manual_url;

  return (
    <SafeAreaView style={styles.container}>
      <HeaderBar
        title="Ficha de Equipo"
        role={role}
        onBack={onBack}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Tarjeta del Equipo */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.flex1}>
              <Text style={styles.code}>[{machine?.codigo}]</Text>
              <Text style={styles.name}>{machine?.nombre}</Text>
              <Text style={styles.type}>
                {machine?.tipo} • N° Serie: {machine?.numero_serie || 'No registrado'}
              </Text>
            </View>
            <Badge status={machine?.estado || 'activa'} />
          </View>

          {machine?.descripcion ? (
            <Text style={styles.desc}>{machine.descripcion}</Text>
          ) : null}

          {/* Enlace Manual Técnico HU-014 */}
          {manualUrl ? (
            <TouchableOpacity
              style={styles.manualButton}
              onPress={() => handleOpenManual(manualUrl)}>
              <Text style={styles.manualButtonText}>
                📖 Consultar Manual Técnico en Línea
              </Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.noManualText}>Sin manual oficial enlazado.</Text>
          )}
        </View>

        {/* Acciones para agregar pieza técnica (HU-014) */}
        <Text style={styles.sectionTitle}>REGISTRAR NUEVA PIEZA TÉCNICA</Text>
        <Text style={styles.sectionSubtitle}>
          Selecciona el tipo de componente a fabricar o intervenir en este equipo:
        </Text>

        <View style={styles.typesRow}>
          <TouchableOpacity
            style={styles.typeBtn}
            onPress={() => onCreateHose && onCreateHose(machine)}>
            <Text style={styles.typeIcon}>🪢</Text>
            <Text style={styles.typeLabel}>Manguera</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.typeBtn}
            onPress={() => onCreateLathePart && onCreateLathePart(machine)}>
            <Text style={styles.typeIcon}>🔩</Text>
            <Text style={styles.typeLabel}>Torno / Eje</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.typeBtn}
            onPress={() => onCreateCylinder && onCreateCylinder(machine)}>
            <Text style={styles.typeIcon}>🧪</Text>
            <Text style={styles.typeLabel}>Cilindro</Text>
          </TouchableOpacity>
        </View>

        {/* Listado de Piezas Registradas */}
        <View style={styles.partsHeaderRow}>
          <Text style={styles.sectionTitle}>PIEZAS REGISTRADAS EN ESTE EQUIPO</Text>
          <Text style={styles.counterText}>{parts.length} piezas</Text>
        </View>

        {loading ? (
          <ActivityIndicator size="small" color={COLORS.orange} style={styles.loader} />
        ) : parts.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              Aún no hay piezas registradas para este equipo.
            </Text>
          </View>
        ) : (
          <View style={styles.partsList}>
            {parts.map((p) => (
              <TouchableOpacity
                key={p.id}
                style={styles.partItem}
                activeOpacity={0.7}
                onPress={() => onSelectPart && onSelectPart(p)}>
                <View style={styles.flex1}>
                  <View style={styles.partCodeRow}>
                    <Text style={styles.partCode}>[{p.codigo}]</Text>
                    <Badge status={p.estado_validacion || 'borrador'} />
                  </View>
                  <Text style={styles.partName}>{p.nombre}</Text>
                  <Text style={styles.partMeta}>Tipo: {p.tipo?.toUpperCase()}</Text>
                </View>
                <Text style={styles.viewPartText}>Ver Ficha →</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
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
  loader: {
    marginVertical: 14,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
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
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  desc: {
    fontSize: 12,
    color: COLORS.textPrimary,
    marginTop: 8,
    lineHeight: 18,
  },
  manualButton: {
    marginTop: 14,
    backgroundColor: 'rgba(255, 106, 0, 0.12)',
    borderWidth: 1,
    borderColor: COLORS.orange,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  manualButtonText: {
    color: COLORS.orange,
    fontSize: 13,
    fontWeight: '700',
  },
  noManualText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.silver,
    letterSpacing: 0.6,
  },
  sectionSubtitle: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
    marginBottom: 10,
  },
  typesRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  typeBtn: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  typeIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  typeLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  partsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  counterText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  emptyCard: {
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  partsList: {
    gap: 8,
  },
  partItem: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  partCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  partCode: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.silver,
    fontFamily: 'monospace',
  },
  partName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  partMeta: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  viewPartText: {
    color: COLORS.orange,
    fontSize: 11,
    fontWeight: '700',
  },
});

export default MachineDetailScreen;
