import React, {useCallback, useEffect, useState} from 'react';
import {ActivityIndicator, Alert, FlatList, SafeAreaView, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {getNotificaciones, marcarNotificacionLeida, validarPieza} from '../services/piezaService';
import {COLORS} from '../constants/colors';

const NotificacionesScreen = ({user, token, onBack, onLogout}) => {
  const [notificaciones, setNotificaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionId, setActionId] = useState(null);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await getNotificaciones(token);
      setNotificaciones(response.notificaciones || []);
    } catch (requestError) {
      setError(requestError.message || 'No se pudieron cargar las notificaciones.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const validate = async (item) => {
    setActionId(item.id);
    try {
      await validarPieza(token, item.pieza_id, 'validada');
      await marcarNotificacionLeida(token, item.id);
      loadNotifications();
    } catch (requestError) {
      Alert.alert('Error', requestError.message || 'No se pudo validar la pieza.');
    } finally {
      setActionId(null);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}><Text style={styles.back}>Atrás</Text></TouchableOpacity>
        <Text style={styles.brand}>Notificaciones</Text>
        <TouchableOpacity onPress={onLogout}><Text style={styles.logout}>Salir</Text></TouchableOpacity>
      </View>
      <FlatList
        contentContainerStyle={styles.content}
        data={notificaciones}
        keyExtractor={(item) => String(item.id)}
        ListHeaderComponent={(
          <View>
            <Text style={styles.title}>Bandeja de validación</Text>
            <Text style={styles.subtitle}>Revisa las fichas registradas por los técnicos.</Text>
            {loading && <ActivityIndicator color={COLORS.orange} style={styles.loader} />}
            {error ? <View style={styles.errorBox}><Text style={styles.error}>{error}</Text><TouchableOpacity onPress={loadNotifications}><Text style={styles.retry}>Reintentar</Text></TouchableOpacity></View> : null}
          </View>
        )}
        ListEmptyComponent={!loading && !error ? <Text style={styles.empty}>No hay notificaciones pendientes.</Text> : null}
        renderItem={({item}) => {
          const validated = item.estado_validacion === 'validada';
          return (
            <View key={item.id} style={styles.card}>
              <Text style={styles.message}>{item.mensaje}</Text>
              <Text style={styles.meta}>Equipo: {item.maquina_nombre || 'No disponible'}</Text>
              <Text style={styles.meta}>Técnico: {item.tecnico_nombre || 'Operador'}</Text>
              <View style={styles.actionRow}>
                {validated ? <Text style={styles.approved}>Aprobada</Text> : (
                  <TouchableOpacity style={styles.validateButton} disabled={actionId === item.id} onPress={() => validate(item)}>
                    {actionId === item.id ? <ActivityIndicator color={COLORS.success} /> : <Text style={styles.validateText}>Validar pieza</Text>}
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: COLORS.background},
  header: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border},
  brand: {fontSize: 16, color: COLORS.textPrimary, fontWeight: '800'},
  back: {color: COLORS.orange, fontWeight: '700'},
  logout: {color: COLORS.danger, fontWeight: '700'},
  content: {padding: 16, paddingBottom: 40},
  title: {fontSize: 24, color: COLORS.textPrimary, fontWeight: '800'},
  subtitle: {color: COLORS.textSecondary, marginTop: 4, marginBottom: 16},
  loader: {margin: 20},
  card: {backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 13, marginBottom: 10},
  message: {color: COLORS.textPrimary, fontSize: 14, fontWeight: '700', lineHeight: 19},
  meta: {color: COLORS.textSecondary, fontSize: 12, marginTop: 5},
  actionRow: {alignItems: 'flex-end', marginTop: 10},
  validateButton: {paddingVertical: 8, paddingHorizontal: 11, borderRadius: 7, borderWidth: 1, borderColor: 'rgba(16,185,129,0.5)', backgroundColor: 'rgba(16,185,129,0.12)'},
  validateText: {color: COLORS.success, fontWeight: '700', fontSize: 12},
  approved: {color: COLORS.success, fontWeight: '800'},
  empty: {color: COLORS.textSecondary, textAlign: 'center', marginTop: 30},
  errorBox: {backgroundColor: 'rgba(239,68,68,0.12)', padding: 12, borderRadius: 9},
  error: {color: COLORS.danger, marginBottom: 8},
  retry: {color: COLORS.orange, fontWeight: '700'},
});

export default NotificacionesScreen;
