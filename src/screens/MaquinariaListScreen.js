import React, {useCallback, useEffect, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import CustomInput from '../components/CustomInput';
import PrimaryButton from '../components/PrimaryButton';
import {getMaquinas, createMaquina} from '../services/maquinaService';
import {COLORS} from '../constants/colors';

const MaquinariaListScreen = ({user, token, onLogout, onSelectMaquina, onOpenNotificaciones}) => {
  const [maquinas, setMaquinas] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState({codigo: '', nombre: '', tipo: '', manualUrl: '', descripcion: ''});

  const canManage = user?.rol === 'admin' || user?.rol === 'supervisor';

  const loadMaquinas = useCallback(async (search = '') => {
    setLoading(true);
    setError('');
    try {
      const response = await getMaquinas(token, search);
      setMaquinas(response.maquinas || []);
    } catch (requestError) {
      setError(requestError.message || 'No se pudo cargar la maquinaria.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!user?.empresa?.id) {
      setLoading(false);
      return;
    }
    loadMaquinas();
  }, [loadMaquinas, user?.empresa?.id]);

  const updateForm = (key, value) => setForm((current) => ({...current, [key]: value}));

  const saveMaquina = async (confirmarDuplicado = false) => {
    setFormError('');
    if (!form.codigo.trim() || !form.nombre.trim() || !form.tipo.trim()) {
      setFormError('Código, nombre y tipo son obligatorios.');
      return;
    }

    setSaving(true);
    try {
      await createMaquina(token, {...form, confirmarDuplicado});
      setModalVisible(false);
      setForm({codigo: '', nombre: '', tipo: '', manualUrl: '', descripcion: ''});
      loadMaquinas(query);
    } catch (requestError) {
      if (requestError.advertenciaDuplicado) {
        Alert.alert('Máquina duplicada', requestError.message, [
          {text: 'Cancelar', style: 'cancel'},
          {text: 'Registrar de todas formas', onPress: () => saveMaquina(true)},
        ]);
      } else {
        setFormError(requestError.message || 'No se pudo registrar la máquina.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.brand}>EmpresaMaquinaria</Text>
          <Text style={styles.company}>{user.empresa?.nombre || 'Mi empresa'}</Text>
        </View>
        <TouchableOpacity onPress={onLogout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Salir</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.titleRow}>
          <View style={styles.headerText}>
            <Text style={styles.title}>Maquinaria autorizada</Text>
            <Text style={styles.subtitle}>Selecciona un equipo para consultar sus piezas.</Text>
          </View>
          {user.rol !== 'tecnico' && (
            <TouchableOpacity onPress={onOpenNotificaciones} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Alertas</Text>
            </TouchableOpacity>
          )}
        </View>

        {canManage && (
          <TouchableOpacity style={styles.primaryButton} onPress={() => setModalVisible(true)}>
            <Text style={styles.primaryButtonText}>+ Nueva máquina</Text>
          </TouchableOpacity>
        )}

        <TextInput
          style={styles.search}
          placeholder="Buscar por código, nombre o tipo"
          placeholderTextColor={COLORS.textSecondary}
          value={query}
          onChangeText={(value) => {
            setQuery(value);
            loadMaquinas(value);
          }}
        />

        {loading && <ActivityIndicator color={COLORS.orange} style={styles.loader} />}
        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={() => loadMaquinas(query)}>
              <Text style={styles.retry}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        ) : null}
        {!loading && !error && maquinas.length === 0 && (
          <Text style={styles.empty}>No hay maquinaria activa para este criterio.</Text>
        )}
        {!loading && maquinas.map((maquina) => (
          <TouchableOpacity key={maquina.id} style={styles.machineCard} onPress={() => onSelectMaquina(maquina)}>
            <View style={styles.headerText}>
              <Text style={styles.code}>{maquina.codigo}</Text>
              <Text style={styles.machineName}>{maquina.nombre}</Text>
              <Text style={styles.meta}>{maquina.tipo} - {maquina.total_piezas || 0} piezas</Text>
            </View>
            <Text style={styles.arrow}>Ver equipo</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={styles.modalTitle}>Registrar maquinaria</Text>
              {Object.entries({
                codigo: 'Código', nombre: 'Nombre', tipo: 'Tipo', manualUrl: 'URL del manual', descripcion: 'Descripción',
              }).map(([key, placeholder]) => (
                <CustomInput
                  key={key}
                  placeholder={placeholder}
                  value={form[key]}
                  onChangeText={(value) => updateForm(key, value)}
                />
              ))}
              {formError ? <Text style={styles.errorText}>{formError}</Text> : null}
              {saving ? <ActivityIndicator color={COLORS.orange} /> : <PrimaryButton title="Guardar" onPress={() => saveMaquina()} />}
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.cancel}>
                <Text style={styles.cancelText}>Cancelar</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: COLORS.background},
  content: {padding: 16, paddingBottom: 40},
  header: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border},
  headerText: {flex: 1},
  brand: {fontSize: 20, fontWeight: '800', color: COLORS.textPrimary},
  company: {fontSize: 12, color: COLORS.textSecondary, marginTop: 2},
  logoutButton: {padding: 8, borderRadius: 8, backgroundColor: 'rgba(239,68,68,0.15)'},
  logoutText: {color: COLORS.danger, fontWeight: '700'},
  titleRow: {flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14},
  title: {fontSize: 22, fontWeight: '800', color: COLORS.textPrimary},
  subtitle: {fontSize: 13, color: COLORS.textSecondary, marginTop: 4},
  primaryButton: {backgroundColor: COLORS.orange, borderRadius: 9, padding: 12, alignItems: 'center', marginBottom: 12},
  primaryButtonText: {color: '#fff', fontWeight: '700'},
  secondaryButton: {borderWidth: 1, borderColor: COLORS.orange, padding: 8, borderRadius: 8, marginLeft: 8},
  secondaryButtonText: {color: COLORS.orange, fontWeight: '700', fontSize: 12},
  search: {height: 46, borderWidth: 1, borderColor: COLORS.border, borderRadius: 9, paddingHorizontal: 14, color: COLORS.textPrimary, backgroundColor: COLORS.surface, marginBottom: 12},
  loader: {margin: 20},
  machineCard: {flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 11, padding: 14, marginBottom: 9},
  code: {fontSize: 11, color: COLORS.orange, fontWeight: '800'},
  machineName: {fontSize: 15, color: COLORS.textPrimary, fontWeight: '700', marginTop: 3},
  meta: {fontSize: 12, color: COLORS.textSecondary, marginTop: 4},
  arrow: {color: COLORS.orange, fontWeight: '700', fontSize: 12},
  empty: {textAlign: 'center', color: COLORS.textSecondary, marginTop: 30},
  errorBox: {padding: 12, borderRadius: 9, backgroundColor: 'rgba(239,68,68,0.12)', marginBottom: 12},
  errorText: {color: COLORS.danger, fontSize: 13, marginBottom: 8},
  retry: {color: COLORS.orange, fontWeight: '700'},
  overlay: {flex: 1, justifyContent: 'center', padding: 20, backgroundColor: 'rgba(0,0,0,0.75)'},
  modal: {maxHeight: '90%', backgroundColor: COLORS.surface, borderRadius: 16, padding: 20},
  modalTitle: {fontSize: 20, color: COLORS.textPrimary, fontWeight: '800', marginBottom: 14},
  cancel: {alignItems: 'center', padding: 12},
  cancelText: {color: COLORS.textSecondary, fontWeight: '700'},
});

export default MaquinariaListScreen;
