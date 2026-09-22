import React from 'react';
import { View, StyleSheet } from 'react-native';
import CustomInput from './CustomInput';

const SubtypeFormHose = ({ data, onChange }) => {
  const handleChange = (key, val) => {
    onChange({ ...data, [key]: val });
  };

  return (
    <View style={styles.container}>
      <CustomInput
        label="Diámetro Interior"
        placeholder="ej: 3/4 pulg (19 mm)"
        value={data.diametro_interior || ''}
        onChangeText={(text) => handleChange('diametro_interior', text)}
      />
      <CustomInput
        label="Diámetro Exterior"
        placeholder="ej: 1.15 pulg (29 mm)"
        value={data.diametro_exterior || ''}
        onChangeText={(text) => handleChange('diametro_exterior', text)}
      />
      <CustomInput
        label="Longitud Total"
        placeholder="ej: 1200 mm"
        value={data.longitud || ''}
        onChangeText={(text) => handleChange('longitud', text)}
      />
      <CustomInput
        label="Presión de Trabajo (PSI / Bar)"
        placeholder="ej: 5000 PSI (345 bar)"
        value={data.presion_trabajo || ''}
        onChangeText={(text) => handleChange('presion_trabajo', text)}
      />
      <CustomInput
        label="Tipo de Conexión / Terminales"
        placeholder="ej: JIC 3/4 Hembra Giratoria 90°"
        value={data.tipo_conexion || ''}
        onChangeText={(text) => handleChange('tipo_conexion', text)}
      />
      <CustomInput
        label="Material / Mallas de Refuerzo"
        placeholder="ej: 4SP (4 espirales de acero)"
        value={data.material || ''}
        onChangeText={(text) => handleChange('material', text)}
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
