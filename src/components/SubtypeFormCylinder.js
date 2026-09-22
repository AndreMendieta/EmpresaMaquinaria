import React from 'react';
import { View, StyleSheet } from 'react-native';
import CustomInput from './CustomInput';

const SubtypeFormCylinder = ({ data, onChange }) => {
  const handleChange = (key, val) => {
    onChange({ ...data, [key]: val });
  };

  return (
    <View style={styles.container}>
      <CustomInput
        label="Diámetro Interior de Camisa (Tubo)"
        placeholder="ej: 100 mm"
        value={data.diametro_camisa || ''}
        onChangeText={(text) => handleChange('diametro_camisa', text)}
      />
      <CustomInput
        label="Diámetro del Vástago (Eje cromado)"
        placeholder="ej: 50 mm"
        value={data.diametro_vastago || ''}
        onChangeText={(text) => handleChange('diametro_vastago', text)}
      />
      <CustomInput
        label="Carrera del Cilindro"
        placeholder="ej: 800 mm"
        value={data.carrera || ''}
        onChangeText={(text) => handleChange('carrera', text)}
      />
      <CustomInput
        label="Presión de Trabajo (PSI / Bar)"
        placeholder="ej: 3000 PSI (210 bar)"
        value={data.presion_trabajo || ''}
        onChangeText={(text) => handleChange('presion_trabajo', text)}
      />
      <CustomInput
        label="Kit de Sellos / Empaquetadura"
        placeholder="ej: PolyPack NBR + Guías de teflón + Limpiador"
        value={data.tipo_sello || ''}
        onChangeText={(text) => handleChange('tipo_sello', text)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
  },
});

export default SubtypeFormCylinder;
