import React, {useCallback, useEffect, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {getPiezas} from '../services/piezaService';
import {COLORS} from '../constants/colors';

const MaquinariaDetailScreen = ({user, token, maquina, onBack, onLogout, onOpenPiezaForm}) => {
  const [piezas, setPiezas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadPiezas = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await getPiezas(token, {maquinaId: maquina.id});
      setPiezas(response.piezas || []);
    } catch (requestError) {
      setError(requestError.message || 'No se pudieron cargar las piezas.');
    } finally {
      setLoading(false);
    }
  }, [maquina.id, token]);

  useEffect(() => {
    loadPiezas();
  }, [loadPiezas]);

  const openManual = async () => {
    if (!maquina.manual_url) {
      Alert.alert('Manual no disponible', 'Esta máquina no tiene un manual enlazado.');
      return;
    }
    try {
      await Linking.openURL(maquina.manual_url);
    } catch (errorOpening) {
      Alert.alert('Error', 'No se pudo abrir el manual técnico.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}><Text style={styles.back}>Atrás</Text></TouchableOpacity>
        <Text style={styles.brand}>Detalle de maquinaria</Text>
        <TouchableOpacity onPress={onLogout}><Text style={styles.logout}>Salir</Text></TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.code}>{maquina.codigo}</Text>
        <Text style={styles.title}>{maquina.nombre}</Text>
        <Text style={styles.meta}>{maquina.tipo}</Text>
        {maquina.manual_url ? <TouchableOpacity onPress={openManual} style={styles.manual}><Text style={styles.manualText}>Consultar manual técnico</Text></TouchableOpacity> : null}

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Piezas asociadas</Text>
            <Text style={styles.sectionSubtitle}>Fichas técnicas registradas para este equipo.</Text>
          </View>
          <TouchableOpacity onPress={onOpenPiezaForm} style={styles.addButton}>
            <Text style={styles.addText}>+ Pieza</Text>
          </TouchableOpacity>
        </View>

        {loading && <ActivityIndicator color={COLORS.orange} style={styles.loader} />}
        {error ? (
          <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text><TouchableOpacity onPress={loadPiezas}><Text style={styles.retry}>Reintentar</Text></TouchableOpacity></View>
        ) : null}
        {!loading && !error && piezas.length === 0 && <Text style={styles.empty}>No hay piezas registradas para esta máquina.</Text>}
        {piezas.map((pieza) => (
          <View key={pieza.id} style={styles.piezaCard}>
            <View style={styles.piezaInfo}>
              <Text style={styles.piezaCode}>{pieza.codigo}</Text>
              <Text style={styles.piezaName}>{pieza.nombre}</Text>
              <Text style={styles.meta}>{pieza.tipo} - {pieza.estado_validacion}</Text>
              {pieza.descripcion ? <Text style={styles.description}>{pieza.descripcion}</Text> : null}
            </View>
            <View style={styles.badge}><Text style={styles.badgeText}>{pieza.estado_validacion.toUpperCase()}</Text></View>
          </View>
        ))}
      </ScrollView>
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
  code: {color: COLORS.orange, fontWeight: '800', fontSize: 12},
  title: {fontSize: 25, color: COLORS.textPrimary, fontWeight: '800', marginTop: 5},
  meta: {fontSize: 13, color: COLORS.textSecondary, marginTop: 4},
  manual: {borderWidth: 1, borderColor: COLORS.orange, padding: 11, borderRadius: 9, marginTop: 16, alignItems: 'center'},
  manualText: {color: COLORS.orange, fontWeight: '700'},
  sectionHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 28, marginBottom: 12},
  sectionTitle: {fontSize: 18, color: COLORS.textPrimary, fontWeight: '800'},
  sectionSubtitle: {fontSize: 12, color: COLORS.textSecondary, marginTop: 3},
  addButton: {backgroundColor: COLORS.orange, borderRadius: 8, padding: 9},
  addText: {color: '#fff', fontWeight: '700', fontSize: 12},
  loader: {margin: 20},
  piezaCard: {backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 13, marginBottom: 9, flexDirection: 'row', alignItems: 'flex-start'},
  piezaInfo: {flex: 1},
  piezaCode: {color: COLORS.orange, fontSize: 11, fontWeight: '800'},
  piezaName: {fontSize: 14, color: COLORS.textPrimary, fontWeight: '700', marginTop: 3},
  description: {fontSize: 12, color: COLORS.textSecondary, marginTop: 5},
  badge: {paddingVertical: 4, paddingHorizontal: 6, borderRadius: 5, backgroundColor: 'rgba(16,185,129,0.15)'},
  badgeText: {fontSize: 9, color: COLORS.success, fontWeight: '800'},
  empty: {textAlign: 'center', color: COLORS.textSecondary, marginTop: 25},
  errorBox: {backgroundColor: 'rgba(239,68,68,0.12)', borderRadius: 9, padding: 12},
  errorText: {color: COLORS.danger, marginBottom: 8},
  retry: {color: COLORS.orange, fontWeight: '700'},
});

export default MaquinariaDetailScreen;
