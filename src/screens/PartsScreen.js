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
import { getParts } from '../api/partsApi';
import HeaderBar from '../components/HeaderBar';
import CustomInput from '../components/CustomInput';
import Badge from '../components/Badge';
import { COLORS } from '../constants/colors';

const FILTERS = ['todas', 'borrador', 'pendiente', 'validada', 'rechazada'];

const PartsScreen = ({
  onBack,
  onSelectPart,
  onOpenReview,
  onCreateHose,
  onCreateLathePart,
  onCreateCylinder,
}) => {
  const { role } = useAuth();
  const isSupervisorOrAdmin = role === 'admin' || role === 'supervisor';

  const [parts, setParts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState('todas');
  const [search, setSearch] = useState('');

  const loadParts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getParts();
      setParts(res.piezas || []);
    } catch (err) {
      console.error('Error cargando piezas:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadParts();
  }, [loadParts]);

  const pendingCount = parts.filter((p) => p.estado_validacion === 'pendiente').length;

  const filtered = parts.filter((p) => {
    const matchesFilter =
      activeFilter === 'todas' || p.estado_validacion === activeFilter;
    const text = (p.codigo + ' ' + p.nombre + ' ' + (p.tipo || '')).toLowerCase();
    const matchesSearch = text.includes(search.trim().toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <SafeAreaView style={styles.container}>
      <HeaderBar
        title="Piezas Técnicas"
        role={role}
        onBack={onBack}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Banner de revisión para Supervisores si hay piezas pendientes */}
        {isSupervisorOrAdmin && pendingCount > 0 ? (
          <TouchableOpacity
            style={styles.reviewBanner}
            activeOpacity={0.85}
            onPress={() => onOpenReview && onOpenReview()}>
            <Text style={styles.reviewBannerTitle}>
              🔔 {pendingCount} {pendingCount === 1 ? 'Pieza pendiente' : 'Piezas pendientes'} de revisión
            </Text>
            <Text style={styles.reviewBannerAction}>Abrir Bandeja de Aprobación →</Text>
          </TouchableOpacity>
        ) : null}

        {/* Accesos de creación rápida de piezas por subtipo */}
        <Text style={styles.sectionHeader}>CREAR NUEVA FICHA TÉCNICA</Text>
        <View style={styles.createRow}>
          <TouchableOpacity
            style={styles.createBtn}
            onPress={() => onCreateHose && onCreateHose()}>
            <Text style={styles.createBtnText}>+ Manguera</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.createBtn}
            onPress={() => onCreateLathePart && onCreateLathePart()}>
            <Text style={styles.createBtnText}>+ Torno</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.createBtn}
            onPress={() => onCreateCylinder && onCreateCylinder()}>
            <Text style={styles.createBtnText}>+ Cilindro</Text>
          </TouchableOpacity>
        </View>

        {/* Buscador y filtros */}
        <CustomInput
          placeholder="Buscar pieza por código o nombre..."
          value={search}
          onChangeText={setSearch}
        />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterChip, activeFilter === f && styles.filterChipActive]}
              onPress={() => setActiveFilter(f)}>
              <Text
                style={[
                  styles.filterChipText,
                  activeFilter === f && styles.filterChipTextActive,
                ]}>
                {f.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {loading ? (
          <ActivityIndicator size="small" color={COLORS.orange} style={styles.loader} />
        ) : filtered.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No hay piezas con el filtro seleccionado.</Text>
          </View>
        ) : (
          <View style={styles.listContainer}>
            {filtered.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.partCard}
                activeOpacity={0.7}
                onPress={() => onSelectPart && onSelectPart(item)}>
                <View style={styles.cardTop}>
                  <View style={styles.flex1}>
                    <View style={styles.codeRow}>
                      <Text style={styles.codeText}>[{item.codigo}]</Text>
                      <Badge status={item.estado_validacion || 'borrador'} />
                    </View>
                    <Text style={styles.nameText}>{item.nombre}</Text>
                    <Text style={styles.typeText}>Tipo: {item.tipo?.toUpperCase()}</Text>
                  </View>
                  <Text style={styles.arrowText}>Ver →</Text>
                </View>
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
  reviewBanner: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reviewBannerTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#F59E0B',
  },
  reviewBannerAction: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.orange,
  },
  sectionHeader: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.silver,
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  createRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  createBtn: {
    flex: 1,
    backgroundColor: COLORS.surface2,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  createBtnText: {
    color: COLORS.orange,
    fontSize: 12,
    fontWeight: '700',
  },
  filterScroll: {
    marginBottom: 14,
  },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface2,
    marginRight: 6,
  },
  filterChipActive: {
    borderColor: COLORS.orange,
    backgroundColor: 'rgba(255, 106, 0, 0.15)',
  },
  filterChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  filterChipTextActive: {
    color: COLORS.orange,
  },
  emptyCard: {
    backgroundColor: COLORS.surface,
    padding: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  listContainer: {
    gap: 8,
  },
  partCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 12,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  codeText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.silver,
    fontFamily: 'monospace',
  },
  nameText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  typeText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  arrowText: {
    color: COLORS.orange,
    fontSize: 12,
    fontWeight: '700',
  },
});

export default PartsScreen;
