import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../auth/useAuth';
import { updatePart } from '../api/partsApi';
import HeaderBar from '../components/HeaderBar';
import CustomInput from '../components/CustomInput';
import AttachmentPicker from '../components/AttachmentPicker';
import PrimaryButton from '../components/PrimaryButton';
import SubtypeFormHose from '../components/SubtypeFormHose';
import SubtypeFormLathe from '../components/SubtypeFormLathe';
import SubtypeFormCylinder from '../components/SubtypeFormCylinder';
import { photosToItems, itemsToPhotos } from '../utils/attachments';
import { COLORS } from '../constants/colors';

const SUBTYPE_FORMS = {
  manguera: SubtypeFormHose,
  torno: SubtypeFormLathe,
  cilindro: SubtypeFormCylinder,
};

const EditPartScreen = ({ part, onBack, onSaved }) => {
  const { role } = useAuth();
  const [nombre, setNombre] = useState(part?.nombre || '');
  const [descripcion, setDescripcion] = useState(part?.descripcion || '');
  const [fotos, setFotos] = useState(photosToItems(part?.fotos));
  const [subtipo, setSubtipo] = useState(part?.subtipo || {});
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const SubtypeForm = SUBTYPE_FORMS[part?.tipo];

  const handleSave = async () => {
    setErrorMsg('');
    if (!nombre.trim()) {
      setErrorMsg('El nombre de la pieza es obligatorio.');
      return;
    }
    setLoading(true);
    try {
      const res = await updatePart(part.id, {
        nombre,
        descripcion,
        fotos: itemsToPhotos(fotos),
        subtipo,
      });
      Alert.alert('Pieza actualizada', 'Los cambios se guardaron correctamente.');
      if (onSaved) onSaved({ ...part, ...res.pieza, subtipo });
    } catch (err) {
      setErrorMsg(err.message || 'No se pudo guardar la pieza.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <HeaderBar title="Editar Pieza" role={role} onBack={onBack} />

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {errorMsg ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.code}>[{part?.codigo}] · {part?.tipo?.toUpperCase()}</Text>

          <CustomInput label="Nombre Descriptivo *" value={nombre} onChangeText={setNombre} />

          {SubtypeForm ? (
            <>
              <Text style={styles.sectionLabel}>ESPECIFICACIONES TÉCNICAS:</Text>
              <SubtypeForm data={subtipo} onChange={setSubtipo} />
            </>
          ) : null}

          <AttachmentPicker label="Fotografías de la pieza" items={fotos} onChange={setFotos} />

          <CustomInput
            label="Notas de Taller / Instalación"
            value={descripcion}
            onChangeText={setDescripcion}
            multiline
            numberOfLines={3}
          />

          <PrimaryButton title="Guardar Cambios" onPress={handleSave} loading={loading} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { padding: 16, paddingBottom: 32 },
  card: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 18,
  },
  code: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.orange,
    marginBottom: 10,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.silver,
    letterSpacing: 0.6,
    marginBottom: 6,
    marginTop: 6,
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

export default EditPartScreen;
