import React, {useState} from 'react';
import {ActivityIndicator, Alert, Image, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {launchImageLibrary} from 'react-native-image-picker';
import CustomInput from '../components/CustomInput';
import PrimaryButton from '../components/PrimaryButton';
import {createPieza, uploadPiezaFoto} from '../services/piezaService';
import {COLORS} from '../constants/colors';

const TIPOS = ['Manguera', 'Racor', 'Acople', 'Válvula'];

const PiezaFormScreen = ({user, token, maquina, onBack, onLogout, onSaved}) => {
  const [codigo, setCodigo] = useState('');
  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState('Manguera');
  const [longitud, setLongitud] = useState('');
  const [diametro, setDiametro] = useState('');
  const [presion, setPresion] = useState('');
  const [rosca, setRosca] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [photo, setPhoto] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const choosePhoto = async () => {
    const result = await launchImageLibrary({mediaType: 'photo', selectionLimit: 1});
    if (!result.didCancel && !result.errorCode && result.assets?.[0]) {
      setPhoto(result.assets[0]);
    } else if (result.errorMessage) {
      setError(result.errorMessage);
    }
  };

  const save = async () => {
    setError('');
    if (!codigo.trim() || !nombre.trim()) {
      setError('El código y el nombre son obligatorios.');
      return;
    }

    setSaving(true);
    try {
      const medidas = {};
      if (longitud.trim()) medidas.longitud = longitud.trim();
      if (diametro.trim()) medidas.diametro = diametro.trim();
      if (presion.trim()) medidas.presion_psi = presion.trim();
      if (rosca.trim()) medidas.rosca = rosca.trim();

      const response = await createPieza(token, {
        maquinaId: maquina.id,
        codigo: codigo.trim(),
        nombre: nombre.trim(),
        tipo,
        medidas,
        descripcion: descripcion.trim(),
        fotos: [],
      });

      if (photo && response.pieza?.id) {
        await uploadPiezaFoto(token, response.pieza.id, photo);
      }

      Alert.alert('Ficha registrada', 'La pieza fue guardada y enviada a validación.', [{text: 'Continuar', onPress: onSaved}]);
    } catch (requestError) {
      setError(requestError.message || 'No se pudo registrar la pieza.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}><Text style={styles.back}>Atrás</Text></TouchableOpacity>
        <Text style={styles.brand}>Nueva ficha de pieza</Text>
        <TouchableOpacity onPress={onLogout}><Text style={styles.logout}>Salir</Text></TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.subtitle}>Asociada a {maquina.nombre} [{maquina.codigo}]</Text>
        <CustomInput placeholder="Código de pieza" value={codigo} onChangeText={setCodigo} />
        <CustomInput placeholder="Nombre de pieza" value={nombre} onChangeText={setNombre} />
        <Text style={styles.label}>Tipo de componente</Text>
        <View style={styles.typeRow}>
          {TIPOS.map((item) => (
            <TouchableOpacity key={item} onPress={() => setTipo(item)} style={[styles.typeOption, tipo === item && styles.typeSelected]}>
              <Text style={[styles.typeText, tipo === item && styles.typeTextSelected]}>{item}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.label}>Medidas y especificaciones</Text>
        <CustomInput placeholder="Longitud" value={longitud} onChangeText={setLongitud} />
        <CustomInput placeholder="Diámetro interior" value={diametro} onChangeText={setDiametro} />
        <CustomInput placeholder="Presión de trabajo" value={presion} onChangeText={setPresion} />
        <CustomInput placeholder="Rosca o acople" value={rosca} onChangeText={setRosca} />
        <CustomInput placeholder="Descripción" value={descripcion} onChangeText={setDescripcion} />
        <TouchableOpacity style={styles.photoButton} onPress={choosePhoto}>
          <Text style={styles.photoButtonText}>{photo ? 'Cambiar foto' : 'Seleccionar foto'}</Text>
        </TouchableOpacity>
        {photo?.uri ? <Image source={{uri: photo.uri}} style={styles.preview} /> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {saving ? <ActivityIndicator color={COLORS.orange} style={styles.loader} /> : <PrimaryButton title="Guardar ficha" onPress={save} />}
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
  subtitle: {color: COLORS.textSecondary, fontSize: 13, marginBottom: 15},
  label: {color: COLORS.silver, fontWeight: '700', fontSize: 12, marginBottom: 7, marginTop: 7, textTransform: 'uppercase'},
  typeRow: {flexDirection: 'row', marginBottom: 12},
  typeOption: {flex: 1, paddingVertical: 9, marginHorizontal: 2, alignItems: 'center', borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface},
  typeSelected: {borderColor: COLORS.orange, backgroundColor: 'rgba(255,106,0,0.15)'},
  typeText: {fontSize: 10, color: COLORS.textSecondary, fontWeight: '600'},
  typeTextSelected: {color: COLORS.orange, fontWeight: '800'},
  photoButton: {padding: 13, borderRadius: 9, borderWidth: 1, borderColor: COLORS.orange, alignItems: 'center', marginVertical: 10},
  photoButtonText: {color: COLORS.orange, fontWeight: '700'},
  preview: {height: 170, borderRadius: 10, marginBottom: 12, backgroundColor: COLORS.surface},
  error: {color: COLORS.danger, fontSize: 13, marginBottom: 12},
  loader: {margin: 18},
});

export default PiezaFormScreen;
