import React from 'react';
import { View, StyleSheet } from 'react-native';
import CustomInput from './CustomInput';
import AttachmentPicker from './AttachmentPicker';
import { parseAttachments, serializeAttachments } from '../utils/attachments';

const SubtypeFormLathe = ({ data, onChange }) => {
  const handleChange = (key, val) => {
    onChange({ ...data, [key]: val });
  };

  return (
    <View style={styles.container}>
      <CustomInput
        label="Diámetro"
        placeholder="ej: 45 mm"
        value={data.diametro || ''}
        onChangeText={(text) => handleChange('diametro', text)}
      />
      <CustomInput
        label="Longitud"
        placeholder="ej: 250 mm"
        value={data.longitud || ''}
        onChangeText={(text) => handleChange('longitud', text)}
      />
      <CustomInput
        label="Tipo de Rosca"
        placeholder="ej: M30 x 2.0 / 1-1/4 NPT"
        value={data.rosca || ''}
        onChangeText={(text) => handleChange('rosca', text)}
      />
      <CustomInput
        label="Tipo de Material"
        placeholder="ej: Acero SAE 4140 Bonificado / Bronce SAE 64"
        value={data.material || ''}
        onChangeText={(text) => handleChange('material', text)}
      />
      <AttachmentPicker
        label="Planos (foto, PDF, DWG…)"
        allowFiles
        items={parseAttachments(data.planos)}
        onChange={(items) => handleChange('planos', serializeAttachments(items))}
      />
      <AttachmentPicker
        label="Evidencia"
        allowFiles
        items={parseAttachments(data.evidencia)}
        onChange={(items) => handleChange('evidencia', serializeAttachments(items))}
      />
      <CustomInput
        label="Adicionales"
        placeholder="ej: tolerancias, acabado, tratamiento térmico"
        value={data.adicionales || ''}
        onChangeText={(text) => handleChange('adicionales', text)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
  },
});

export default SubtypeFormLathe;
