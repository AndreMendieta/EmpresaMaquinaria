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
import { getOrders } from '../api/ordersApi';
import HeaderBar from '../components/HeaderBar';
import CustomInput from '../components/CustomInput';
import Badge from '../components/Badge';
import ForbiddenNotice from '../components/ForbiddenNotice';
import { COLORS } from '../constants/colors';

const FILTERS = [
  { key: 'todas', label: 'Todas' },
  { key: 'pendiente', label: 'Pendientes' },
  { key: 'en_progreso', label: 'En Progreso' },
  { key: 'completada', label: 'Completadas' },
];

const OrdersScreen = ({ onBack, onSelectOrder, onNavigateCreateOrder }) => {
  const { role, user } = useAuth();
  const isSupervisorOrAdmin = role === 'admin' || role === 'supervisor';

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [forbidden, setForbidden] = useState(false);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('todas');

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    setForbidden(false);
    try {
      const res = await getOrders();
      setOrders(res.ordenes || []);
    } catch (err) {
      if (err.isForbidden) {
        setForbidden(true);
      } else {
        setErrorMsg(err.message || 'Error al cargar las órdenes de trabajo.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const filtered = orders.filter((o) => {
    const matchesFilter =
      activeFilter === 'todas' ||
      (o.estado || 'pendiente').toLowerCase() === activeFilter.toLowerCase();

    const matchesSearch =
      (o.numero_orden + ' ' + (o.titulo || '') + ' ' + (o.descripcion || ''))
        .toLowerCase()
        .includes(search.trim().toLowerCase());

    return matchesFilter && matchesSearch;
  });

  return (
    <SafeAreaView style={styles.container}>
      <HeaderBar
        title="Órdenes de Trabajo"
        role={role}
        onBack={onBack}
        onRightAction={isSupervisorOrAdmin ? onNavigateCreateOrder : null}
        rightActionLabel={isSupervisorOrAdmin ? '+ Nueva Orden' : null}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {forbidden ? (
          <ForbiddenNotice message="No tienes permisos para visualizar las órdenes de servicio." />
        ) : null}

        {errorMsg ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        ) : null}

        <CustomInput
          placeholder="Buscar por OT-000, título o descripción..."
          value={search}
          onChangeText={setSearch}
        />

        {/* Filtros por estado */}
        <View style={styles.filterRow}>
          {FILTERS.map((f) => {
            const isActive = activeFilter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
                onPress={() => setActiveFilter(f.key)}>
                <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {loading ? (
          <ActivityIndicator size="small" color={COLORS.orange} style={styles.loader} />
        ) : filtered.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>📋 No se encontraron órdenes</Text>
            <Text style={styles.emptyText}>
              No hay órdenes de servicio que coincidan con los filtros seleccionados.
            </Text>
            {isSupervisorOrAdmin ? (
              <TouchableOpacity
                style={styles.btnCreate}
                onPress={onNavigateCreateOrder}>
                <Text style={styles.btnCreateText}>+ Crear Primera Orden</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : (
          <View style={styles.listContainer}>
            {filtered.map((item) => {
              const isAssignedToMe = item.asignada_a && user && String(item.asignada_a) === String(user.id);
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.cardItem, isAssignedToMe && styles.cardItemMine]}
                  activeOpacity={0.7}
                  onPress={() => onSelectOrder && onSelectOrder(item)}>
                  <View style={styles.cardHeader}>
                    <View style={styles.flex1}>
                      <View style={styles.codeRow}>
                        <Text style={styles.otCode}>[{item.numero_orden}]</Text>
                        {item.prioridad && item.prioridad !== 'normal' ? (
                          <View style={styles.prioTag}>
                            <Text style={styles.prioText}>{item.prioridad.toUpperCase()}</Text>
                          </View>
                        ) : null}
                        {isAssignedToMe ? (
                          <View style={styles.mineTag}>
                            <Text style={styles.mineText}>ASIGNADA A TI</Text>
                          </View>
                        ) : null}
                      </View>
                      <Text style={styles.orderTitle}>{item.titulo}</Text>
                    </View>
                    <Badge status={item.estado || 'pendiente'} />
                  </View>

                  {item.descripcion ? (
                    <Text style={styles.descText} numberOfLines={2}>
                      {item.descripcion}
                    </Text>
                  ) : null}

                  <View style={styles.footerRow}>
                    <Text style={styles.dateText}>
                      Fecha: {item.creado_en ? new Date(item.creado_en).toLocaleDateString('es-CO') : 'Reciente'}
                    </Text>
                    <Text style={styles.viewDetailText}>Ver Orden →</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
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
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterChipActive: {
    backgroundColor: 'rgba(255, 106, 0, 0.15)',
    borderColor: COLORS.orange,
  },
  filterChipText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: COLORS.orange,
    fontWeight: '700',
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
    gap: 12,
  },
  cardItem: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 14,
  },
  cardItemMine: {
    borderColor: 'rgba(255, 106, 0, 0.45)',
    backgroundColor: 'rgba(255, 106, 0, 0.03)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  otCode: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.orange,
    fontFamily: 'monospace',
  },
  prioTag: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  prioText: {
    color: COLORS.danger,
    fontSize: 10,
    fontWeight: '800',
  },
  mineTag: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  mineText: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: '800',
  },
  orderTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 4,
  },
  descText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 6,
    lineHeight: 18,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  dateText: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  viewDetailText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.orange,
  },
});

export default OrdersScreen;
