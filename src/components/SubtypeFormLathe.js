import React from 'react';
import { View, StyleSheet } from 'react-native';
import CustomInput from './CustomInput';

const SubtypeFormLathe = ({ data, onChange }) => {
  const handleChange = (key, val) => {
    onChange({ ...data, [key]: val });
  };

  return (
    <View style={styles.container}>
      <CustomInput
        label="Diámetro Exterior / Mecanizado"
        placeholder="ej: 45 mm"
        value={data.diametro || ''}
        onChangeText={(text) => handleChange('diametro', text)}
      />
      <CustomInput
        label="Longitud Total"
        placeholder="ej: 250 mm"
        value={data.longitud || ''}
        onChangeText={(text) => handleChange('longitud', text)}
      />
      <CustomInput
        label="Paso / Tipo de Rosca"
        placeholder="ej: M30 x 2.0 / 1-1/4 NPT"
        value={data.rosca || ''}
        onChangeText={(text) => handleChange('rosca', text)}
      />
      <CustomInput
        label="Material del Metal"
        placeholder="ej: Acero SAE 4140 Bonificado / Bronce SAE 64"
        value={data.material || ''}
        onChangeText={(text) => handleChange('material', text)}
      />
      <CustomInput
        label="Tolerancia Mecánica"
        placeholder="ej: h7 (+0 / -0.025 mm)"
        value={data.tolerancia || ''}
        onChangeText={(text) => handleChange('tolerancia', text)}
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
