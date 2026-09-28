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
        label="Medida de camisa"
        placeholder="ej: 100 mm"
        value={data.camisa || data.diametro_camisa || ''}
        onChangeText={(text) => handleChange('camisa', text)}
      />
      <CustomInput
        label="Medida de vástago"
        placeholder="ej: 50 mm"
        value={data.vastago || data.diametro_vastago || ''}
        onChangeText={(text) => handleChange('vastago', text)}
      />
      <CustomInput
        label="Medida de tapa"
        placeholder="ej: 120 mm"
        value={data.medida_tapa || ''}
        onChangeText={(text) => handleChange('medida_tapa', text)}
      />
      <CustomInput
        label="Medida de pistón"
        placeholder="ej: 95 mm"
        value={data.medida_piston || ''}
        onChangeText={(text) => handleChange('medida_piston', text)}
      />
      <CustomInput
        label="Empaques"
        placeholder="ej: kit de sellos NBR"
        value={data.empaques || data.tipo_sello || ''}
        onChangeText={(text) => handleChange('empaques', text)}
      />
      <CustomInput
        label="Ojo"
        placeholder="ej: diámetro y ancho del ojo"
        value={data.ojo || ''}
        onChangeText={(text) => handleChange('ojo', text)}
      />
      <CustomInput
        label="Pasadores"
        placeholder="ej: diámetro, longitud y tipo"
        value={data.pasadores || ''}
        onChangeText={(text) => handleChange('pasadores', text)}
      />
      <CustomInput
        label="Recorrido de salida"
        placeholder="ej: 800 mm"
        value={data.recorrido_salida || data.carrera || ''}
        onChangeText={(text) => handleChange('recorrido_salida', text)}
      />
      <CustomInput
        label="Medida de racores de llenado"
        placeholder="ej: 1/2 NPT"
        value={data.racores_llenado || ''}
        onChangeText={(text) => handleChange('racores_llenado', text)}
      />
      <CustomInput
        label="Presión de trabajo (PSI / Bar)"
        placeholder="ej: 3000 PSI (210 bar)"
        value={data.presion_trabajo || ''}
        onChangeText={(text) => handleChange('presion_trabajo', text)}
      />
      <CustomInput
        label="Adicionales"
        placeholder="ej: observaciones, daños o acabados"
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

export default SubtypeFormCylinder;
