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
import { getTechnicians } from '../api/usersApi';
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
  const [technicians, setTechnicians] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(false);

  // Form Fields principales
  const [selectedCompanyId, setSelectedCompanyId] = useState(null);
  const [selectedMachineId, setSelectedMachineId] = useState(null);
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [prioridad, setPrioridad] = useState('normal');
  const [selectedTechId, setSelectedTechId] = useState(null);

  // Evidencias iniciales
  const [evidencias, setEvidencias] = useState([]);
  const [evidenciaUrl, setEvidenciaUrl] = useState('');
  const [evidenciaDesc, setEvidenciaDesc] = useState('');
  const [evidenciaEtapa, setEvidenciaEtapa] = useState('antes');

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
        const [compRes, machRes, techRes] = await Promise.all([
          getClientCompanies(),
          getMachines(),
          getTechnicians().catch(() => ({ tecnicos: [] })),
        ]);
        setCompanies(compRes.empresas_clientes || []);
        setMachines(machRes.maquinas || []);
        setTechnicians(techRes.tecnicos || []);
      } catch (err) {
        if (err.isForbidden) {
          setForbidden(true);
        } else {
          setErrorMsg('Error al cargar datos auxiliares del taller.');
        }
      } finally {
        setLoadingOptions(false);
      }
    };

    loadData();
  }, [isSupervisorOrAdmin]);

  const handleAddEvidencia = () => {
    if (!evidenciaDesc.trim() && !evidenciaUrl.trim()) return;

    const nueva = {
      id: `evi_${Date.now()}`,
      url: evidenciaUrl.trim() || null,
      descripcion: evidenciaDesc.trim(),
      etapa: evidenciaEtapa,
      creado_en: new Date().toISOString(),
    };

    setEvidencias((prev) => [...prev, nueva]);
    setEvidenciaUrl('');
    setEvidenciaDesc('');
  };

  const handleRemoveEvidencia = (id) => {
    setEvidencias((prev) => prev.filter((e) => e.id !== id));
  };

  const handleSave = async () => {
    if (!titulo.trim()) {
      setErrorMsg('El título o labor de la orden es obligatorio.');
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
        asignadaA: selectedTechId,
        evidencias,
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

  // Filtrar máquinas por la empresa cliente seleccionada (si aplica)
  const filteredMachines = selectedCompanyId
    ? machines.filter((m) => m.empresa_cliente_id === selectedCompanyId)
    : machines;

  return (
    <SafeAreaView style={styles.container}>
      <HeaderBar title="Nueva Orden de Trabajo" role={role} onBack={onBack} />

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {forbidden ? (
          <ForbiddenNotice message="Solo supervisores y administradores pueden crear órdenes de servicio." />
        ) : null}

        {errorMsg ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        ) : null}

        <View style={styles.formCard}>
          {/* 1. Empresa Cliente */}
          <Text style={styles.sectionTitle}>1. Empresa Cliente</Text>
          <Text style={styles.fieldHint}>Selecciona el cliente solicitante del servicio:</Text>

          {loadingOptions ? (
            <ActivityIndicator size="small" color={COLORS.orange} style={styles.mv12} />
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
              <TouchableOpacity
                style={[styles.chip, !selectedCompanyId && styles.chipSelected]}
                onPress={() => setSelectedCompanyId(null)}>
                <Text style={[styles.chipText, !selectedCompanyId && styles.chipTextSelected]}>
                  Sin Cliente Directo
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
                      🏢 {c.razon_social || c.nombre_comercial || c.nombre}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {/* 2. Máquina Asociada */}
          <Text style={[styles.sectionTitle, styles.mt16]}>2. Máquina Asociada</Text>
          <Text style={styles.fieldHint}>Equipo sobre el cual se ejecutará la orden:</Text>

          {loadingOptions ? (
            <ActivityIndicator size="small" color={COLORS.orange} style={styles.mv12} />
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
              <TouchableOpacity
                style={[styles.chip, !selectedMachineId && styles.chipSelected]}
                onPress={() => setSelectedMachineId(null)}>
                <Text style={[styles.chipText, !selectedMachineId && styles.chipTextSelected]}>
                  Sin máquina asociada
                </Text>
              </TouchableOpacity>
              {(filteredMachines.length > 0 ? filteredMachines : machines).map((m) => {
                const isSel = selectedMachineId === m.id;
                return (
                  <TouchableOpacity
                    key={m.id}
                    style={[styles.chip, isSel && styles.chipSelected]}
                    onPress={() => setSelectedMachineId(m.id)}>
                    <Text style={[styles.chipText, isSel && styles.chipTextSelected]}>
                      🚜 [{m.codigo}] {m.nombre}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {/* 3. Descripción del Trabajo */}
          <Text style={[styles.sectionTitle, styles.mt16]}>3. Descripción del Trabajo</Text>

          <CustomInput
            label="Título de la Orden *"
            placeholder="Ej: Cambio de Sellos y Empaquetadura Cilindro Levante"
            value={titulo}
            onChangeText={setTitulo}
          />

          <CustomInput
            label="Descripción Detallada del Trabajo"
            placeholder="Especifica síntomas de falla, medidas, repuestos a fabricar o procedimientos requeridos..."
            value={descripcion}
            onChangeText={setDescripcion}
            multiline
            numberOfLines={4}
          />

          {/* 4. Prioridad */}
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

          {/* 5. Técnico Asignado */}
          <Text style={[styles.sectionTitle, styles.mt16]}>5. Técnico Asignado</Text>
          <Text style={styles.fieldHint}>Responsable técnico que ejecutará la labor:</Text>

          {loadingOptions ? (
            <ActivityIndicator size="small" color={COLORS.orange} style={styles.mv12} />
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
              <TouchableOpacity
                style={[styles.chip, !selectedTechId && styles.chipSelected]}
                onPress={() => setSelectedTechId(null)}>
                <Text style={[styles.chipText, !selectedTechId && styles.chipTextSelected]}>
                  Por Asignar (Pendiente)
                </Text>
              </TouchableOpacity>
              {technicians.map((t) => {
                const isSel = selectedTechId === t.id;
                return (
                  <TouchableOpacity
                    key={t.id}
                    style={[styles.chip, isSel && styles.chipSelected]}
                    onPress={() => setSelectedTechId(t.id)}>
                    <Text style={[styles.chipText, isSel && styles.chipTextSelected]}>
                      👷 {t.nombre_completo}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {/* 6. Evidencias del Trabajo (Iniciales) */}
          <Text style={[styles.sectionTitle, styles.mt16]}>6. Evidencias del Trabajo Realizado (Iniciales)</Text>
          <Text style={styles.fieldHint}>
            Adjunta fotos o notas del estado de recepción o falla inicial:
          </Text>

          {/* Listado de evidencias añadidas */}
          {evidencias.length > 0 ? (
            <View style={styles.evidenciasList}>
              {evidencias.map((item, index) => (
                <View key={item.id || index} style={styles.evidenciaCard}>
                  <View style={styles.evidenciaHeader}>
                    <Text style={styles.evidenciaEtapa}>
                      {item.etapa === 'antes' ? '🟡 Estado Inicial / Recepción' : '🔵 Proceso'}
                    </Text>
                    <TouchableOpacity onPress={() => handleRemoveEvidencia(item.id)}>
                      <Text style={styles.evidenciaRemove}>✕ Eliminar</Text>
                    </TouchableOpacity>
                  </View>
                  {item.url ? (
                    <Text style={styles.evidenciaUrl} numberOfLines={1}>
                      🔗 {item.url}
                    </Text>
                  ) : null}
                  <Text style={styles.evidenciaDesc}>{item.descripcion}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {/* Formulario rápido para agregar evidencia */}
          <View style={styles.newEvidenciaBox}>
            <View style={styles.etapaRow}>
              <TouchableOpacity
                style={[styles.etapaChip, evidenciaEtapa === 'antes' && styles.etapaChipActive]}
                onPress={() => setEvidenciaEtapa('antes')}>
                <Text style={[styles.etapaText, evidenciaEtapa === 'antes' && styles.etapaTextActive]}>
                  Antes (Falla)
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.etapaChip, evidenciaEtapa === 'durante' && styles.etapaChipActive]}
                onPress={() => setEvidenciaEtapa('durante')}>
                <Text style={[styles.etapaText, evidenciaEtapa === 'durante' && styles.etapaTextActive]}>
                  Durante (Trabajo)
                </Text>
              </TouchableOpacity>
            </View>

            <CustomInput
              placeholder="Enlace o URL de foto de evidencia (opcional)..."
              value={evidenciaUrl}
              onChangeText={setEvidenciaUrl}
              autoCapitalize="none"
            />
            <CustomInput
              placeholder="Descripción de la evidencia o condición encontrada..."
              value={evidenciaDesc}
              onChangeText={setEvidenciaDesc}
            />

            <TouchableOpacity style={styles.btnAddEvidencia} onPress={handleAddEvidencia}>
              <Text style={styles.btnAddEvidenciaText}>+ Adjuntar Evidencia</Text>
            </TouchableOpacity>
          </View>

          {/* Botón Guardar */}
          <View style={styles.actionButtons}>
            <CustomButton
              title={saving ? 'Creando Orden...' : 'Crear y Publicar Orden de Trabajo'}
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
    marginBottom: 4,
  },
  fieldHint: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginBottom: 8,
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
    paddingVertical: 8,
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
  evidenciasList: {
    gap: 8,
    marginBottom: 12,
  },
  evidenciaCard: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 10,
  },
  evidenciaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  evidenciaEtapa: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.orange,
  },
  evidenciaRemove: {
    fontSize: 11,
    color: COLORS.danger,
    fontWeight: '600',
  },
  evidenciaUrl: {
    fontSize: 11,
    color: '#38BDF8',
    marginBottom: 4,
  },
  evidenciaDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 16,
  },
  newEvidenciaBox: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 10,
    marginTop: 4,
  },
  etapaRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  etapaChip: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  etapaChipActive: {
    borderColor: COLORS.orange,
    backgroundColor: 'rgba(255, 106, 0, 0.15)',
  },
  etapaText: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  etapaTextActive: {
    color: COLORS.orange,
    fontWeight: '700',
  },
  btnAddEvidencia: {
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 106, 0, 0.15)',
    borderWidth: 1,
    borderColor: COLORS.orange,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 4,
  },
  btnAddEvidenciaText: {
    color: COLORS.orange,
    fontSize: 12,
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
