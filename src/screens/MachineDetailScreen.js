import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Linking,
} from 'react-native';
import Alert from '../utils/alert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../auth/useAuth';
import { getParts } from '../api/partsApi';
import { updateMachine } from '../api/machinesApi';
import HeaderBar from '../components/HeaderBar';
import Badge from '../components/Badge';
import CustomInput from '../components/CustomInput';
import PrimaryButton from '../components/PrimaryButton';
import { COLORS } from '../constants/colors';

const MachineDetailScreen = ({
  machine,
  onBack,
  onSelectPart,
  onCreateHose,
  onCreateLathePart,
  onCreateCylinder,
  onMachineUpdated,
}) => {
  const { role } = useAuth();
  const canEdit = role === 'admin' || role === 'supervisor';
  const [currentMachine, setCurrentMachine] = useState(machine);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [form, setForm] = useState({});
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

  const startEditing = () => {
    setErrorMsg('');
    setForm({
      nombre: currentMachine.nombre || '',
      tipo: currentMachine.tipo || '',
      numeroSerie: currentMachine.numero_serie || '',
      urlManual: currentMachine.url_manual || currentMachine.manual_url || '',
      descripcion: currentMachine.descripcion || '',
    });
    setEditing(true);
  };

  const handleSave = async () => {
    setErrorMsg('');
    if (!form.nombre.trim() || !form.tipo.trim()) {
      setErrorMsg('El nombre y el tipo de maquinaria son obligatorios.');
      return;
    }
    setSaving(true);
    try {
      const res = await updateMachine(currentMachine.id, form);
      setCurrentMachine(res.maquinaria);
      if (onMachineUpdated) onMachineUpdated(res.maquinaria);
      setEditing(false);
      Alert.alert('Maquinaria actualizada', 'Los cambios se guardaron correctamente.');
    } catch (err) {
      setErrorMsg(err.message || 'No se pudo actualizar la maquinaria.');
    } finally {
      setSaving(false);
    }
  };

  const manualUrl = currentMachine?.url_manual || currentMachine?.manual_url;

  return (
    <SafeAreaView style={styles.container}>
      <HeaderBar
        title="Ficha de Equipo"
        role={role}
        onBack={onBack}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}
        {editing ? (
          <View style={styles.card}>
            <CustomInput label="Nombre o Modelo *" value={form.nombre}
              onChangeText={(value) => setForm((prev) => ({ ...prev, nombre: value }))} />
            <CustomInput label="Tipo de Maquinaria *" value={form.tipo}
              onChangeText={(value) => setForm((prev) => ({ ...prev, tipo: value }))} />
            <CustomInput label="Número de Serie" value={form.numeroSerie}
              onChangeText={(value) => setForm((prev) => ({ ...prev, numeroSerie: value }))} />
            <CustomInput label="URL del Manual Técnico" value={form.urlManual} keyboardType="url"
              onChangeText={(value) => setForm((prev) => ({ ...prev, urlManual: value }))} />
            <CustomInput label="Descripción" value={form.descripcion} multiline
              onChangeText={(value) => setForm((prev) => ({ ...prev, descripcion: value }))} />
            <PrimaryButton title="Guardar cambios" onPress={handleSave} loading={saving} />
            <TouchableOpacity style={styles.manualButton} disabled={saving} accessibilityRole="button"
              onPress={() => { setEditing(false); setErrorMsg(''); }}>
              <Text style={styles.manualButtonText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        ) : null}
        {/* Tarjeta del Equipo */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.flex1}>
              <Text style={styles.code}>[{currentMachine?.codigo}]</Text>
              <Text style={styles.name}>{currentMachine?.nombre}</Text>
              <Text style={styles.type}>
                {currentMachine?.tipo} • N° Serie: {currentMachine?.numero_serie || 'No registrado'}
              </Text>
            </View>
            <Badge status={currentMachine?.estado || 'activa'} />
          </View>

          {currentMachine?.descripcion ? (
            <Text style={styles.desc}>{currentMachine.descripcion}</Text>
          ) : null}

          {canEdit && !editing ? (
            <TouchableOpacity style={styles.manualButton} accessibilityRole="button" onPress={startEditing}>
              <Text style={styles.manualButtonText}>Editar maquinaria</Text>
            </TouchableOpacity>
          ) : null}
          {/* Enlace Manual Técnico HU-014 */}
          {manualUrl ? (
            <TouchableOpacity
              style={styles.manualButton}
              onPress={() => handleOpenManual(manualUrl)}>
              <Text style={styles.manualButtonText}>
                Consultar Manual Técnico en Línea
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
            onPress={() => onCreateHose && onCreateHose(currentMachine)}>
            <Text style={styles.typeLabel}>Manguera</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.typeBtn}
            onPress={() => onCreateLathePart && onCreateLathePart(currentMachine)}>
            <Text style={styles.typeLabel}>Torno / Eje</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.typeBtn}
            onPress={() => onCreateCylinder && onCreateCylinder(currentMachine)}>
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
  errorText: {
    color: COLORS.danger,
    marginBottom: 12,
    fontWeight: '600',
  },
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
