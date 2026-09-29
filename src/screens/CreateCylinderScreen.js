import React, { useState, useEffect } from 'react';
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
import { createPart } from '../api/partsApi';
import { getMachines } from '../api/machinesApi';
import HeaderBar from '../components/HeaderBar';
import CustomInput from '../components/CustomInput';
import PrimaryButton from '../components/PrimaryButton';
import SubtypeFormCylinder from '../components/SubtypeFormCylinder';
import { COLORS } from '../constants/colors';

const CreateCylinderScreen = ({ onBack, onPartCreated, initialMachine }) => {
  const { role } = useAuth();
  const [machines, setMachines] = useState([]);
  const [selectedMachineId, setSelectedMachineId] = useState(initialMachine?.id || null);
  const [codigo, setCodigo] = useState('');
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [fotoUrl, setFotoUrl] = useState('');
  const [subtipoData, setSubtipoData] = useState({
    diametro_camisa: '',
    diametro_vastago: '',
    carrera: '',
    presion_trabajo: '',
    tipo_sello: '',
  });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await getMachines();
        const list = res.maquinas || [];
        setMachines(list);
        if (!selectedMachineId && list.length > 0) {
          setSelectedMachineId(list[0].id);
        }
      } catch (err) {
        console.error('Error cargando máquinas:', err);
      }
    };
    load();
  }, [selectedMachineId]);

  const handleSubmit = async () => {
    setErrorMsg('');
    if (!selectedMachineId) {
      setErrorMsg('Debes seleccionar la maquinaria asociada a este cilindro.');
      return;
    }
    if (!codigo.trim() || !nombre.trim()) {
      setErrorMsg('El código y nombre del cilindro son obligatorios.');
      return;
    }

    setLoading(true);
    try {
      const res = await createPart({
        maquinariaId: selectedMachineId,
        codigo,
        nombre,
        tipo: 'cilindro',
        descripcion,
        fotos: fotoUrl.trim() ? [fotoUrl.trim()] : [],
        subtipo: subtipoData,
      });
      Alert.alert('Ficha Creada', 'El cilindro hidráulico ha sido guardado en borrador.');
      if (onPartCreated) onPartCreated(res.pieza);
    } catch (err) {
      setErrorMsg(err.message || 'Error al guardar el cilindro hidráulico.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <HeaderBar
        title="Crear Cilindro"
        role={role}
        onBack={onBack}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {errorMsg ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.sectionLabel}>SELECCIONA LA MAQUINARIA:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
            {machines.map((m) => (
              <TouchableOpacity
                key={m.id}
                style={[styles.chip, selectedMachineId === m.id && styles.chipActive]}
                onPress={() => setSelectedMachineId(m.id)}>
                <Text style={[styles.chipText, selectedMachineId === m.id && styles.chipTextActive]}>
                  [{m.codigo}] {m.nombre}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <CustomInput
            label="Código del Cilindro *"
            placeholder="ej: CIL-LEV-01"
            value={codigo}
            onChangeText={setCodigo}
            autoCapitalize="characters"
          />

          <CustomInput
            label="Nombre Descriptivo *"
            placeholder="ej: Cilindro de Levante Brazo Izquierdo"
            value={nombre}
            onChangeText={setNombre}
          />

          {/* Especificaciones de Cilindro */}
          <Text style={styles.sectionLabel}>DIMENSIONES Y PRESIÓN DE CILINDRO:</Text>
          <SubtypeFormCylinder data={subtipoData} onChange={setSubtipoData} />

          <CustomInput
            label="URL de Fotografía / Evidencia de Fugas"
            placeholder="https://..."
            value={fotoUrl}
            onChangeText={setFotoUrl}
            autoCapitalize="none"
          />

          <CustomInput
            label="Diagnóstico / Notas de Taller"
            placeholder="Rayaduras en vástago, ovalamiento de camisa, etc."
            value={descripcion}
            onChangeText={setDescripcion}
            multiline
            numberOfLines={3}
          />

          <PrimaryButton
            title="Guardar Ficha de Cilindro"
            onPress={handleSubmit}
            loading={loading}
          />
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
  card: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 18,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.silver,
    letterSpacing: 0.6,
    marginBottom: 6,
    marginTop: 6,
  },
  chipsScroll: {
    marginBottom: 12,
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface2,
    marginRight: 8,
  },
  chipActive: {
    borderColor: COLORS.orange,
    backgroundColor: 'rgba(255, 106, 0, 0.15)',
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  chipTextActive: {
    color: COLORS.orange,
    fontWeight: '700',
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
});

export default CreateCylinderScreen;
