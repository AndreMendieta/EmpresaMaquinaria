import React, { useState, useEffect, useCallback } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useAuth } from '../auth/useAuth';
import { getClientCompanies, createClientCompany } from '../api/clientCompaniesApi';
import HeaderBar from '../components/HeaderBar';
import CustomInput from '../components/CustomInput';
import PrimaryButton from '../components/PrimaryButton';
import Badge from '../components/Badge';
import ForbiddenNotice from '../components/ForbiddenNotice';
import { COLORS } from '../constants/colors';

const ClientCompaniesScreen = ({ onBack, onSelectCompany }) => {
  const { role } = useAuth();
  const isAdmin = role === 'admin';

  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [forbidden, setForbidden] = useState(false);
  const [search, setSearch] = useState('');

  // Modal de creación (Admin)
  const [modalVisible, setModalVisible] = useState(false);
  const [razonSocial, setRazonSocial] = useState('');
  const [nombreComercial, setNombreComercial] = useState('');
  const [identificacionFiscal, setIdentificacionFiscal] = useState('');
  const [correo, setCorreo] = useState('');
  const [telefono, setTelefono] = useState('');
  const [direccion, setDireccion] = useState('');
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState('');

  const loadCompanies = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    setForbidden(false);
    try {
      const res = await getClientCompanies();
      setCompanies(res.empresas_clientes || []);
    } catch (err) {
      if (err.isForbidden) {
        setForbidden(true);
      } else {
        setErrorMsg(err.message || 'Error cargando empresas clientes.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);

  const handleCreate = async () => {
    setModalError('');
    if (!razonSocial.trim()) {
      setModalError('La razón social es obligatoria.');
      return;
    }

    setSaving(true);
    try {
      await createClientCompany({
        razonSocial,
        nombreComercial,
        identificacionFiscal,
        correo,
        telefono,
        direccion,
      });
      setModalVisible(false);
      setRazonSocial('');
      setNombreComercial('');
      setIdentificacionFiscal('');
      setCorreo('');
      setTelefono('');
      setDireccion('');
      loadCompanies();
    } catch (err) {
      setModalError(err.message || 'No se pudo crear la empresa cliente.');
    } finally {
      setSaving(false);
    }
  };

  const filtered = companies.filter((c) => {
    const text = (c.razon_social + ' ' + (c.nombre_comercial || '')).toLowerCase();
    return text.includes(search.trim().toLowerCase());
  });

  return (
    <SafeAreaView style={styles.container}>
      <HeaderBar
        title="Empresas Cliente"
        role={role}
        onBack={onBack}
        onRightAction={isAdmin ? () => setModalVisible(true) : null}
        rightActionLabel={isAdmin ? '+ Crear Empresa' : null}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {forbidden ? (
          <ForbiddenNotice message="No tienes permisos para consultar las empresas clientes." />
        ) : null}

        {errorMsg ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        ) : null}

        <CustomInput
          placeholder="Buscar empresa cliente..."
          value={search}
          onChangeText={setSearch}
        />

        {loading ? (
          <ActivityIndicator size="small" color={COLORS.orange} style={styles.loader} />
        ) : filtered.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No se encontraron empresas cliente registradas.</Text>
            {isAdmin ? (
              <TouchableOpacity
                style={styles.btnCreateEmpty}
                onPress={() => setModalVisible(true)}>
                <Text style={styles.btnCreateEmptyText}>+ Dar de Alta Empresa Cliente</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : (
          <View style={styles.listContainer}>
            {filtered.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.companyCard}
                activeOpacity={0.7}
                onPress={() => onSelectCompany && onSelectCompany(item)}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderLeft}>
                    <Text style={styles.companyTitle}>{item.razon_social}</Text>
                    {item.nombre_comercial ? (
                      <Text style={styles.companyComercial}>{item.nombre_comercial}</Text>
                    ) : null}
                  </View>
                  <Badge status={item.activa ? 'activa' : 'inactiva'} />
                </View>

                {item.identificacion_fiscal ? (
                  <Text style={styles.metaText}>NIT / RUC: {item.identificacion_fiscal}</Text>
                ) : null}
                {item.telefono ? (
                  <Text style={styles.metaText}>Teléfono: {item.telefono}</Text>
                ) : null}

                <Text style={styles.viewDetailLink}>Ver Detalle y Flota →</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Modal para Crear Empresa Cliente (Solo Admin) */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={styles.modalTitle}>Nueva Empresa Cliente</Text>
              <Text style={styles.modalSubtitle}>Registro de cliente contratante de mantenimiento.</Text>

              {modalError ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{modalError}</Text>
                </View>
              ) : null}

              <CustomInput
                label="Razón Social *"
                placeholder="ej: Minera Los Andes S.A.S."
                value={razonSocial}
                onChangeText={setRazonSocial}
              />
              <CustomInput
                label="Nombre Comercial"
                placeholder="ej: Mina Los Andes"
                value={nombreComercial}
                onChangeText={setNombreComercial}
              />
              <CustomInput
                label="Identificación Fiscal (NIT / RUC)"
                placeholder="ej: 900.123.456-7"
                value={identificacionFiscal}
                onChangeText={setIdentificacionFiscal}
              />
              <CustomInput
                label="Correo de Contacto"
                placeholder="contacto@minalosandes.com"
                value={correo}
                onChangeText={setCorreo}
                keyboardType="email-address"
              />
              <CustomInput
                label="Teléfono"
                placeholder="ej: +57 300 123 4567"
                value={telefono}
                onChangeText={setTelefono}
                keyboardType="phone-pad"
              />
              <CustomInput
                label="Dirección"
                placeholder="ej: Km 12 Vía al Llano"
                value={direccion}
                onChangeText={setDireccion}
              />

              <PrimaryButton
                title="Guardar Empresa Cliente"
                onPress={handleCreate}
                loading={saving}
              />

              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  loader: {
    marginVertical: 20,
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
  emptyCard: {
    backgroundColor: COLORS.surface,
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    textAlign: 'center',
  },
  btnCreateEmpty: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: COLORS.orange,
    borderRadius: 8,
  },
  btnCreateEmptyText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  listContainer: {
    gap: 10,
  },
  companyCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  cardHeaderLeft: {
    flex: 1,
    marginRight: 8,
  },
  companyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  companyComercial: {
    fontSize: 12,
    color: COLORS.orange,
    fontWeight: '600',
    marginTop: 1,
  },
  metaText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  viewDetailLink: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.orange,
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 20,
    maxHeight: '90%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 2,
    marginBottom: 16,
  },
  cancelBtn: {
    marginTop: 10,
    alignItems: 'center',
    paddingVertical: 8,
  },
  cancelBtnText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
});

export default ClientCompaniesScreen;
