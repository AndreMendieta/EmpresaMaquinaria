import React, { useState, useEffect, useCallback } from 'react';
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
import { getMachines } from '../api/machinesApi';
import HeaderBar from '../components/HeaderBar';
import CustomInput from '../components/CustomInput';
import Badge from '../components/Badge';
import ForbiddenNotice from '../components/ForbiddenNotice';
import { COLORS } from '../constants/colors';

const MachinesScreen = ({ onBack, onSelectMachine, onNavigateCreateMachine }) => {
  const { role } = useAuth();
  const canCreateMachine = ['admin', 'supervisor', 'tecnico'].includes(role);

  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [forbidden, setForbidden] = useState(false);
  const [search, setSearch] = useState('');

  const loadMachines = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    setForbidden(false);
    try {
      const res = await getMachines();
      setMachines(res.maquinas || []);
    } catch (err) {
      if (err.isForbidden) {
        setForbidden(true);
      } else {
        setErrorMsg(err.message || 'Error al consultar las máquinas.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMachines();
  }, [loadMachines]);

  const filtered = machines.filter((m) => {
    const text = (m.codigo + ' ' + m.nombre + ' ' + (m.tipo || '')).toLowerCase();
    return text.includes(search.trim().toLowerCase());
  });

  return (
    <SafeAreaView style={styles.container}>
      <HeaderBar
        title="Maquinaria"
        role={role}
        onBack={onBack}
        onRightAction={canCreateMachine ? onNavigateCreateMachine : null}
        rightActionLabel={canCreateMachine ? '+ Crear Máquina' : null}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {forbidden ? (
          <ForbiddenNotice message="No tienes permisos para consultar la maquinaria." />
        ) : null}

        {errorMsg ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        ) : null}

        <CustomInput
          placeholder="Buscar máquina por código, modelo o tipo..."
          value={search}
          onChangeText={setSearch}
        />

        {loading ? (
          <ActivityIndicator size="small" color={COLORS.orange} style={styles.loader} />
        ) : filtered.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>⚠️ Sin maquinaria encontrada</Text>
            <Text style={styles.emptyText}>
              No se encontraron equipos registrados con este criterio.
            </Text>
            {canCreateMachine ? (
              <TouchableOpacity
                style={styles.btnCreate}
                onPress={onNavigateCreateMachine}>
                <Text style={styles.btnCreateText}>+ Registrar Nueva Máquina</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : (
          <View style={styles.listContainer}>
            {filtered.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.cardItem}
                activeOpacity={0.7}
                onPress={() => onSelectMachine && onSelectMachine(item)}>
                <View style={styles.cardTop}>
                  <View style={styles.flex1}>
                    <Text style={styles.codeText}>[{item.codigo}]</Text>
                    <Text style={styles.nameText}>{item.nombre}</Text>
                    <Text style={styles.typeText}>{item.tipo} • Serie: {item.numero_serie || 'S/N'}</Text>
                  </View>
                  <Badge status={item.estado || 'activa'} />
                </View>

                {item.url_manual || item.manual_url ? (
                  <View style={styles.manualIndicator}>
                    <Text style={styles.manualText}>📖 Manual Oficial Enlazado</Text>
                  </View>
                ) : null}

                <Text style={styles.actionText}>Ver Ficha Técnica y Piezas →</Text>
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
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.warning,
    marginBottom: 4,
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  btnCreate: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: COLORS.orange,
    borderRadius: 8,
  },
  btnCreateText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  listContainer: {
    gap: 10,
  },
  cardItem: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 14,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  codeText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.orange,
    fontFamily: 'monospace',
  },
  nameText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  typeText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  manualIndicator: {
    marginTop: 8,
  },
  manualText: {
    fontSize: 11,
    color: '#38BDF8',
    fontWeight: '600',
  },
  actionText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.orange,
    marginTop: 8,
  },
});

export default MachinesScreen;
