import React from 'react';
import {TextInput, StyleSheet} from 'react-native';
import {COLORS} from '../constants/colors';

const CustomInput = ({
  placeholder,
  value,
  onChangeText,
  secureTextEntry = false,
  keyboardType = 'default',
}) => {
  return (
    <TextInput
      style={styles.input}
      placeholder={placeholder}
      placeholderTextColor={COLORS.textSecondary}
      value={value}
      onChangeText={onChangeText}
      secureTextEntry={secureTextEntry}
      keyboardType={keyboardType}
      autoCapitalize="none"
    />
  );
};

const styles = StyleSheet.create({
  input: {
    height: 52,
    backgroundColor: COLORS.surface2,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 16,
    fontSize: 15,
    color: COLORS.textPrimary,
    marginBottom: 14,
  },
});

export default CustomInput;