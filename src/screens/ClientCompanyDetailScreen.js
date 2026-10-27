import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../auth/useAuth';
import { updateClientCompany, deleteClientCompany } from '../api/clientCompaniesApi';
import { getMachines } from '../api/machinesApi';
import HeaderBar from '../components/HeaderBar';
import Badge from '../components/Badge';
import ForbiddenNotice from '../components/ForbiddenNotice';
import CustomInput from '../components/CustomInput';
import PrimaryButton from '../components/PrimaryButton';
import Icon from '../components/Icon';
import { COLORS } from '../constants/colors';

const ClientCompanyDetailScreen = ({ company, onBack, onSelectMachine, onAddMachine }) => {
  const { role } = useAuth();
  const isAdmin = role === 'admin';
  const isSupervisorOrAdmin = role === 'admin' || role === 'supervisor';

  const [machines, setMachines] = useState([]);
  const [loadingMachines, setLoadingMachines] = useState(false);
  const [statusActive, setStatusActive] = useState(company?.activa ?? true);
  const [actionError, setActionError] = useState('');
  const [forbidden, setForbidden] = useState(false);
  const [info, setInfo] = useState(company || {});
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({});

  const startEditing = () => {
    setActionError('');
    setForm({
      razonSocial: info.razon_social || '',
      nombreComercial: info.nombre_comercial || '',
      identificacionFiscal: info.identificacion_fiscal || '',
      correo: info.correo || '',
      telefono: info.telefono || '',
      direccion: info.direccion || '',
    });
    setEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!form.razonSocial.trim()) {
      setActionError('La razón social es obligatoria.');
      return;
    }
    setSaving(true);
    setActionError('');
    try {
      const res = await updateClientCompany(company.id, {
        razonSocial: form.razonSocial.trim(),
        nombreComercial: form.nombreComercial.trim() || null,
        identificacionFiscal: form.identificacionFiscal.trim() || null,
        correo: form.correo.trim() || null,
        telefono: form.telefono.trim() || null,
        direccion: form.direccion.trim() || null,
      });
      setInfo(res.empresa_cliente || res.empresa || { ...info, ...res });
      setEditing(false);
      Alert.alert('Éxito', 'Datos de la empresa actualizados.');
    } catch (err) {
      if (err.isForbidden) {
        setForbidden(true);
      } else {
        setActionError(err.message || 'No se pudo actualizar la empresa.');
      }
    } finally {
      setSaving(false);
    }
  };

  const loadCompanyMachines = useCallback(async () => {
    setLoadingMachines(true);
    try {
      const res = await getMachines();
      const all = res.maquinas || [];
      const companyMachines = all.filter((m) => m.empresa_cliente_id === company?.id);
      setMachines(companyMachines);
    } catch (err) {
      console.error('Error cargando máquinas de empresa cliente:', err);
    } finally {
      setLoadingMachines(false);
    }
  }, [company?.id]);

  useEffect(() => {
    loadCompanyMachines();
  }, [loadCompanyMachines]);

  const handleToggleStatus = async () => {
    if (!isAdmin) {
      setForbidden(true);
      return;
    }
    setActionError('');
    try {
      if (statusActive) {
        await deleteClientCompany(company.id);
        setStatusActive(false);
      } else {
        await updateClientCompany(company.id, { activa: true });
        setStatusActive(true);
      }
      Alert.alert('Éxito', `Empresa ${statusActive ? 'desactivada' : 'activada'} correctamente.`);
    } catch (err) {
      if (err.isForbidden) {
        setForbidden(true);
      } else {
        setActionError(err.message || 'Error al modificar estado de la empresa cliente.');
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <HeaderBar
        title="Detalle de Cliente"
        role={role}
        onBack={onBack}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {forbidden ? (
          <ForbiddenNotice message="Solo los administradores pueden modificar o desactivar empresas clientes." />
        ) : null}

        {actionError ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{actionError}</Text>
          </View>
        ) : null}

        {/* Ficha Principal de Empresa Cliente */}
        <View style={styles.detailCard}>
          <View style={styles.cardHeader}>
            <View style={styles.flex1}>
              <Text style={styles.title}>{info.razon_social}</Text>
              {info.nombre_comercial ? (
                <Text style={styles.comercial}>{info.nombre_comercial}</Text>
              ) : null}
            </View>
            <Badge status={statusActive ? 'activa' : 'inactiva'} />
          </View>

          {editing ? (
            <View>
              <CustomInput label="Razón social *" value={form.razonSocial} onChangeText={(v) => setForm({ ...form, razonSocial: v })} />
              <CustomInput label="Nombre comercial" value={form.nombreComercial} onChangeText={(v) => setForm({ ...form, nombreComercial: v })} />
              <CustomInput label="Identificación fiscal (NIT)" value={form.identificacionFiscal} onChangeText={(v) => setForm({ ...form, identificacionFiscal: v })} />
              <CustomInput label="Correo" value={form.correo} onChangeText={(v) => setForm({ ...form, correo: v })} autoCapitalize="none" keyboardType="email-address" />
              <CustomInput label="Teléfono" value={form.telefono} onChangeText={(v) => setForm({ ...form, telefono: v })} keyboardType="phone-pad" />
              <CustomInput label="Dirección" value={form.direccion} onChangeText={(v) => setForm({ ...form, direccion: v })} />
              <PrimaryButton title="Guardar cambios" onPress={handleSaveEdit} loading={saving} />
              <TouchableOpacity style={styles.cancelEditBtn} onPress={() => setEditing(false)} disabled={saving}>
                <Text style={styles.cancelEditText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Identificación Fiscal:</Text>
                <Text style={styles.fieldValue}>{info.identificacion_fiscal || 'Sin registrar'}</Text>
              </View>
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Correo de Contacto:</Text>
                <Text style={styles.fieldValue}>{info.correo || 'Sin registrar'}</Text>
              </View>
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Teléfono:</Text>
                <Text style={styles.fieldValue}>{info.telefono || 'Sin registrar'}</Text>
              </View>
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Dirección:</Text>
                <Text style={styles.fieldValue}>{info.direccion || 'Sin registrar'}</Text>
              </View>

              {isAdmin ? (
                <TouchableOpacity style={styles.editBtn} onPress={startEditing}>
                  <Icon name="edit" size={20} color={COLORS.orange} />
                  <Text style={styles.editBtnText}>Editar datos de la empresa</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          )}

          {isAdmin && !editing ? (
            <TouchableOpacity
              style={[styles.statusToggleBtn, statusActive ? styles.btnDanger : styles.btnSuccess]}
              onPress={handleToggleStatus}>
              <Text style={styles.statusToggleBtnText}>
                {statusActive ? 'Desactivar Empresa Cliente' : 'Reactivar Empresa Cliente'}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Sección de Maquinaria Asociada a este Cliente */}
        <View style={styles.sectionHeaderRow}>
          <View>
            <Text style={styles.sectionTitle}>Flota / Equipos Asignados</Text>
            <Text style={styles.sectionSubtitle}>
              Maquinarias registradas para este cliente contratante.
            </Text>
          </View>
          {isSupervisorOrAdmin ? (
            <TouchableOpacity
              style={styles.btnAddMachine}
              onPress={() => onAddMachine && onAddMachine(company, (machine) => {
                setMachines((current) => [machine, ...current]);
              })}>
              <Text style={styles.btnAddMachineText}>+ Asignar Máquina</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {loadingMachines ? (
          <ActivityIndicator size="small" color={COLORS.orange} style={styles.loader} />
        ) : machines.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No hay maquinarias registradas para esta empresa cliente.</Text>
          </View>
        ) : (
          <View style={styles.machineList}>
            {machines.map((m) => (
              <TouchableOpacity
                key={m.id}
                style={styles.machineItem}
                activeOpacity={0.7}
                onPress={() => onSelectMachine && onSelectMachine(m)}>
                <View style={styles.flex1}>
                  <Text style={styles.machineCode}>[{m.codigo}]</Text>
                  <Text style={styles.machineName}>{m.nombre}</Text>
                  <Text style={styles.machineType}>{m.tipo} • Serie: {m.numero_serie || 'S/N'}</Text>
                </View>
                <Text style={styles.viewLink}>Ver →</Text>
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
  editBtn: {
    minHeight: 48,
    marginTop: 14,
    borderWidth: 1,
    borderColor: COLORS.orange,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  editBtnText: { color: COLORS.orange, fontSize: 15, fontWeight: '700' },
  cancelEditBtn: { minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  cancelEditText: { color: COLORS.textSecondary, fontSize: 14, fontWeight: '600' },
  loader: {
    marginVertical: 14,
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
  },
  detailCard: {
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
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  comercial: {
    fontSize: 13,
    color: COLORS.orange,
    fontWeight: '600',
    marginTop: 2,
  },
  fieldRow: {
    marginBottom: 8,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.silver,
    textTransform: 'uppercase',
  },
  fieldValue: {
    fontSize: 13,
    color: COLORS.textPrimary,
    marginTop: 1,
  },
  statusToggleBtn: {
    marginTop: 14,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnDanger: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  btnSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  statusToggleBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  sectionSubtitle: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  btnAddMachine: {
    backgroundColor: COLORS.orange,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  btnAddMachineText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
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
  machineList: {
    gap: 8,
  },
  machineItem: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  machineCode: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.orange,
    fontFamily: 'monospace',
  },
  machineName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 1,
  },
  machineType: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  viewLink: {
    color: COLORS.orange,
    fontSize: 12,
    fontWeight: '700',
  },
});

export default ClientCompanyDetailScreen;
