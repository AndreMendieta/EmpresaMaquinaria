import React from 'react';
import { View, StyleSheet } from 'react-native';
import CustomInput from './CustomInput';
import AttachmentPicker from './AttachmentPicker';
import { parseAttachments, serializeAttachments } from '../utils/attachments';

const SubtypeFormHose = ({ data, onChange }) => {
  const handleChange = (key, val) => {
    onChange({ ...data, [key]: val });
  };

  return (
    <View style={styles.container}>
      <CustomInput
        label="Diámetro"
        placeholder="ej: 3/4 pulg (19 mm)"
        value={data.diametro || data.diametro_interior || ''}
        onChangeText={(text) => handleChange('diametro', text)}
      />
      <CustomInput
        label="Longitud"
        placeholder="ej: 1200 mm"
        value={data.longitud || ''}
        onChangeText={(text) => handleChange('longitud', text)}
      />
      <CustomInput
        label="Presión"
        placeholder="ej: 5000 PSI (345 bar)"
        value={data.presion || data.presion_trabajo || ''}
        onChangeText={(text) => handleChange('presion', text)}
      />
      <CustomInput
        label="Terminales"
        placeholder="ej: JIC 3/4 Hembra Giratoria 90°"
        value={data.terminales || data.tipo_conexion || ''}
        onChangeText={(text) => handleChange('terminales', text)}
      />
      <AttachmentPicker
        label="Evidencia"
        allowFiles
        items={parseAttachments(data.evidencia)}
        onChange={(items) => handleChange('evidencia', serializeAttachments(items))}
      />
      <CustomInput
        label="Adicionales"
        placeholder="ej: protección, radio de curvatura, observaciones"
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

export default SubtypeFormHose;
