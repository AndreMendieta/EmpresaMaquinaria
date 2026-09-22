import React, { useState, useEffect } from 'react';
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
import { createOrder } from '../api/ordersApi';
import { getClientCompanies } from '../api/clientCompaniesApi';
import { getMachines } from '../api/machinesApi';
import HeaderBar from '../components/HeaderBar';
import CustomInput from '../components/CustomInput';
import CustomButton from '../components/CustomButton';
import ForbiddenNotice from '../components/ForbiddenNotice';
import { COLORS } from '../constants/colors';

const PRIORITIES = [
  { key: 'baja', label: 'Baja' },
  { key: 'normal', label: 'Normal' },
  { key: 'alta', label: 'Alta' },
  { key: 'urgente', label: 'Urgente' },
];

const CreateOrderScreen = ({ onBack, onOrderCreated }) => {
  const { role } = useAuth();
  const isSupervisorOrAdmin = role === 'admin' || role === 'supervisor';

  const [companies, setCompanies] = useState([]);
  const [machines, setMachines] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(false);

  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [prioridad, setPrioridad] = useState('normal');
  const [selectedCompanyId, setSelectedCompanyId] = useState(null);
  const [selectedMachineId, setSelectedMachineId] = useState(null);

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    if (!isSupervisorOrAdmin) {
      setForbidden(true);
      return;
    }

    const loadData = async () => {
      setLoadingOptions(true);
      try {
        const [compRes, machRes] = await Promise.all([
          getClientCompanies(),
          getMachines(),
        ]);
        setCompanies(compRes.empresas || []);
        setMachines(machRes.maquinas || []);
      } catch (err) {
        if (err.isForbidden) {
          setForbidden(true);
        } else {
          setErrorMsg('Error al cargar clientes y máquinas de apoyo.');
        }
      } finally {
        setLoadingOptions(false);
      }
    };

    loadData();
  }, [isSupervisorOrAdmin]);

  const handleSave = async () => {
    if (!titulo.trim()) {
      setErrorMsg('El título de la orden es obligatorio.');
      return;
    }

    setSaving(true);
    setErrorMsg('');
    try {
      const res = await createOrder({
        empresaClienteId: selectedCompanyId,
        maquinariaId: selectedMachineId,
        titulo,
        descripcion,
        prioridad,
      });

      if (onOrderCreated) {
        onOrderCreated(res.orden);
      } else if (onBack) {
        onBack();
      }
    } catch (err) {
      if (err.isForbidden) {
        setForbidden(true);
      } else {
        setErrorMsg(err.message || 'No se pudo generar la orden de trabajo.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <HeaderBar title="Nueva Orden de Trabajo" role={role} onBack={onBack} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {forbidden ? (
          <ForbiddenNotice message="Solo supervisores y administradores pueden crear órdenes de servicio." />
        ) : null}

        {errorMsg ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        ) : null}

        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>1. Información del Servicio</Text>

          <CustomInput
            label="Título de la Orden *"
            placeholder="Ej: Mantenimiento Mayor Bomba Hidráulica"
            value={titulo}
            onChangeText={setTitulo}
          />

          <CustomInput
            label="Descripción del Requerimiento"
            placeholder="Detalles del síntoma o trabajo solicitado..."
            value={descripcion}
            onChangeText={setDescripcion}
            multiline
            numberOfLines={4}
          />

          <Text style={styles.fieldLabel}>Prioridad de Atención</Text>
          <View style={styles.prioRow}>
            {PRIORITIES.map((p) => {
              const active = prioridad === p.key;
              return (
                <TouchableOpacity
                  key={p.key}
                  style={[styles.prioChip, active && styles.prioChipActive]}
                  onPress={() => setPrioridad(p.key)}>
                  <Text style={[styles.prioChipText, active && styles.prioChipTextActive]}>
                    {p.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[styles.sectionTitle, styles.mt16]}>2. Vinculación de Equipo y Cliente</Text>

          {loadingOptions ? (
            <ActivityIndicator size="small" color={COLORS.orange} style={styles.mv12} />
          ) : (
            <>
              <Text style={styles.fieldLabel}>Empresa Cliente</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                <TouchableOpacity
                  style={[styles.chip, !selectedCompanyId && styles.chipSelected]}
                  onPress={() => setSelectedCompanyId(null)}>
                  <Text style={[styles.chipText, !selectedCompanyId && styles.chipTextSelected]}>
                    Ninguno
                  </Text>
                </TouchableOpacity>
                {companies.map((c) => {
                  const isSel = selectedCompanyId === c.id;
                  return (
                    <TouchableOpacity
                      key={c.id}
                      style={[styles.chip, isSel && styles.chipSelected]}
                      onPress={() => setSelectedCompanyId(c.id)}>
                      <Text style={[styles.chipText, isSel && styles.chipTextSelected]}>
                        {c.nombre}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <Text style={styles.fieldLabel}>Máquina Involucrada</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                <TouchableOpacity
                  style={[styles.chip, !selectedMachineId && styles.chipSelected]}
                  onPress={() => setSelectedMachineId(null)}>
                  <Text style={[styles.chipText, !selectedMachineId && styles.chipTextSelected]}>
                    Sin máquina
                  </Text>
                </TouchableOpacity>
                {machines.map((m) => {
                  const isSel = selectedMachineId === m.id;
                  return (
                    <TouchableOpacity
                      key={m.id}
                      style={[styles.chip, isSel && styles.chipSelected]}
                      onPress={() => setSelectedMachineId(m.id)}>
                      <Text style={[styles.chipText, isSel && styles.chipTextSelected]}>
                        [{m.codigo}] {m.nombre}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </>
          )}

          <View style={styles.actionButtons}>
            <CustomButton
              title={saving ? 'Creando Orden...' : 'Crear Orden de Servicio'}
              onPress={handleSave}
              loading={saving}
              disabled={forbidden || saving}
            />
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
  formCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.orange,
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: 10,
    marginBottom: 6,
  },
  prioRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  prioChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  prioChipActive: {
    borderColor: COLORS.orange,
    backgroundColor: 'rgba(255, 106, 0, 0.15)',
  },
  prioChipText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  prioChipTextActive: {
    color: COLORS.orange,
    fontWeight: '700',
  },
  chipScroll: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 8,
  },
  chipSelected: {
    borderColor: COLORS.orange,
    backgroundColor: 'rgba(255, 106, 0, 0.15)',
  },
  chipText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  chipTextSelected: {
    color: COLORS.orange,
    fontWeight: '700',
  },
  actionButtons: {
    marginTop: 20,
  },
  mt16: {
    marginTop: 16,
  },
  mv12: {
    marginVertical: 12,
  },
});

export default CreateOrderScreen;
