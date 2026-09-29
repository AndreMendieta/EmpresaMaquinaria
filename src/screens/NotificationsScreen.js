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
import { getNotifications, markNotificationRead } from '../api/notificationsApi';
import HeaderBar from '../components/HeaderBar';
import ForbiddenNotice from '../components/ForbiddenNotice';
import { COLORS } from '../constants/colors';

const NotificationsScreen = ({ onBack, onNavigateOrder, onNavigatePart }) => {
  const { role } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [forbidden, setForbidden] = useState(false);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    setForbidden(false);
    try {
      const res = await getNotifications();
      setNotifications(res.notificaciones || []);
    } catch (err) {
      if (err.isForbidden) {
        setForbidden(true);
      } else {
        setErrorMsg(err.message || 'Error al cargar las notificaciones.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const handleMarkAsRead = async (item) => {
    if (item.leida_en) return;
    try {
      await markNotificationRead(item.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, leida_en: new Date().toISOString() } : n))
      );
    } catch {
      // Ignorar fallo de lectura silenciosamente
    }
  };

  const unreadCount = notifications.filter((n) => !n.leida_en).length;

  return (
    <SafeAreaView style={styles.container}>
      <HeaderBar
        title="Centro de Alertas"
        role={role}
        onBack={onBack}
        onRightAction={loadNotifications}
        rightActionLabel="Refrescar"
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {forbidden ? (
          <ForbiddenNotice message="No tienes permisos para visualizar este centro de notificaciones." />
        ) : null}

        {errorMsg ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        ) : null}

        {/* Resumen de no leídas */}
        <View style={styles.summaryBar}>
          <Text style={styles.summaryText}>
            {unreadCount > 0
              ? `Tienes ${unreadCount} notificación(es) sin leer`
              : 'Estás al día con todas las notificaciones'}
          </Text>
        </View>

        {loading ? (
          <ActivityIndicator size="small" color={COLORS.orange} style={styles.loader} />
        ) : notifications.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>🔔 Bandeja sin novedades</Text>
            <Text style={styles.emptyText}>
              No hay alertas pendientes de órdenes ni piezas en tu buzón en este momento.
            </Text>
          </View>
        ) : (
          <View style={styles.listContainer}>
            {notifications.map((item) => {
              const isUnread = !item.leida_en;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.cardItem, isUnread && styles.cardItemUnread]}
                  activeOpacity={0.7}
                  onPress={() => {
                    handleMarkAsRead(item);
                    if (item.orden_id && onNavigateOrder) {
                      onNavigateOrder(item.orden_id);
                    } else if (item.pieza_id && onNavigatePart) {
                      onNavigatePart(item.pieza_id);
                    }
                  }}>
                  <View style={styles.cardHeader}>
                    <View style={styles.iconTag}>
                      <Text style={styles.iconText}>
                        {item.orden_id ? '📋' : item.pieza_id ? '⚙️' : '🔔'}
                      </Text>
                    </View>
                    <View style={styles.flex1}>
                      <View style={styles.titleRow}>
                        <Text style={[styles.notifTitle, isUnread && styles.notifTitleBold]}>
                          {item.titulo}
                        </Text>
                        {isUnread ? <View style={styles.unreadDot} /> : null}
                      </View>
                      <Text style={styles.notifMsg}>{item.mensaje}</Text>
                      <View style={styles.footerRow}>
                        <Text style={styles.dateText}>
                          {item.creado_en ? new Date(item.creado_en).toLocaleString('es-CO') : 'Reciente'}
                        </Text>
                        {item.orden_id ? (
                          <Text style={styles.badgeText}>Ver Orden #{item.orden_id} →</Text>
                        ) : item.pieza_id ? (
                          <Text style={styles.badgeText}>Ver Pieza #{item.pieza_id} →</Text>
                        ) : null}
                      </View>
                    </View>
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
  summaryBar: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    marginBottom: 16,
  },
  summaryText: {
    fontSize: 13,
    color: COLORS.textSecondary,
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
  listContainer: {
    gap: 10,
  },
  cardItem: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 12,
  },
  cardItemUnread: {
    borderColor: 'rgba(255, 106, 0, 0.4)',
    backgroundColor: 'rgba(255, 106, 0, 0.04)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  iconTag: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 16,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  notifTitle: {
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  notifTitleBold: {
    fontWeight: '700',
    color: COLORS.orange,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.orange,
  },
  notifMsg: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  dateText: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.orange,
  },
});

export default NotificationsScreen;
