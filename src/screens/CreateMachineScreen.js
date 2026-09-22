import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useAuth } from '../auth/useAuth';
import { createMachine } from '../api/machinesApi';
import { getClientCompanies } from '../api/clientCompaniesApi';
import HeaderBar from '../components/HeaderBar';
import CustomInput from '../components/CustomInput';
import PrimaryButton from '../components/PrimaryButton';
import ForbiddenNotice from '../components/ForbiddenNotice';
import { COLORS } from '../constants/colors';

const CreateMachineScreen = ({ onBack, onMachineCreated, initialClientCompany }) => {
  const { role } = useAuth();
  const isSupervisorOrAdmin = role === 'admin' || role === 'supervisor';

  const [companies, setCompanies] = useState([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState(initialClientCompany?.id || null);
  const [codigo, setCodigo] = useState('');
  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState('');
  const [numeroSerie, setNumeroSerie] = useState('');
  const [urlManual, setUrlManual] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    const loadCompanies = async () => {
      try {
        const res = await getClientCompanies();
        setCompanies(res.empresas_clientes || []);
      } catch (err) {
        console.error('Error cargando empresas clientes en form máquina:', err);
      }
    };
    loadCompanies();
  }, []);

  const handleSubmit = async () => {
    setErrorMsg('');
    setForbidden(false);

    if (!codigo.trim() || !nombre.trim() || !tipo.trim()) {
      setErrorMsg('El código, nombre y tipo de maquinaria son obligatorios.');
      return;
    }

    setLoading(true);
    try {
      const res = await createMachine({
        empresaClienteId: selectedCompanyId,
        codigo,
        nombre,
        tipo,
        numeroSerie,
        urlManual,
        descripcion,
      });
      if (onMachineCreated) {
        onMachineCreated(res.maquinaria);
      }
    } catch (err) {
      if (err.isForbidden) {
        setForbidden(true);
      } else {
        setErrorMsg(err.message || 'No se pudo registrar la maquinaria.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <HeaderBar
        title="Registrar Máquina"
        role={role}
        onBack={onBack}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {!isSupervisorOrAdmin ? (
          <ForbiddenNotice message="Solo supervisores y administradores tienen permisos para registrar maquinaria autorizada (HU-015)." />
        ) : null}

        {forbidden ? (
          <ForbiddenNotice message="El servidor denegó la creación de maquinaria (403 Prohibido)." />
        ) : null}

        {errorMsg ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.sectionLabel}>EMPRESA CLIENTE ASOCIADA:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
            <TouchableOpacity
              style={[styles.chip, !selectedCompanyId && styles.chipActive]}
              onPress={() => setSelectedCompanyId(null)}>
              <Text style={[styles.chipText, !selectedCompanyId && styles.chipTextActive]}>
                Flota Interna (Ninguna)
              </Text>
            </TouchableOpacity>
            {companies.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={[styles.chip, selectedCompanyId === c.id && styles.chipActive]}
                onPress={() => setSelectedCompanyId(c.id)}>
                <Text style={[styles.chipText, selectedCompanyId === c.id && styles.chipTextActive]}>
                  {c.razon_social}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <CustomInput
            label="Código de Equipo *"
            placeholder="ej: CAT-320D"
            value={codigo}
            onChangeText={setCodigo}
            autoCapitalize="characters"
          />

          <CustomInput
            label="Nombre o Modelo *"
            placeholder="ej: Excavadora Hidráulica CAT 320D"
            value={nombre}
            onChangeText={setNombre}
          />

          <CustomInput
            label="Tipo de Maquinaria *"
            placeholder="ej: Excavadora, Prensa, Cargador, Rodillo"
            value={tipo}
            onChangeText={setTipo}
          />

          <CustomInput
            label="Número de Serie"
            placeholder="ej: CAT0320DHX12345"
            value={numeroSerie}
            onChangeText={setNumeroSerie}
          />

          <CustomInput
            label="URL del Manual Técnico Oficial (En Línea)"
            placeholder="https://cat.com/manuals/320d-service.pdf"
            value={urlManual}
            onChangeText={setUrlManual}
            keyboardType="url"
            autoCapitalize="none"
          />

          <CustomInput
            label="Descripción del Circuito Hidráulico"
            placeholder="Presiones nominales, bombas principales y notas de taller..."
            value={descripcion}
            onChangeText={setDescripcion}
            multiline
            numberOfLines={3}
          />

          <PrimaryButton
            title="Registrar Maquinaria en Flota"
            onPress={handleSubmit}
            loading={loading}
            disabled={!isSupervisorOrAdmin}
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
    marginBottom: 8,
  },
  chipsScroll: {
    marginBottom: 16,
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

export default CreateMachineScreen;
