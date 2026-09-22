import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../constants/colors';

const ForbiddenNotice = ({ message = 'No tienes permisos para acceder o modificar este recurso (403 Prohibido).' }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔒 Acceso Restringido</Text>
      <Text style={styles.text}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    borderRadius: 10,
    padding: 14,
    marginVertical: 10,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.danger,
    marginBottom: 4,
  },
  text: {
    fontSize: 12,
    color: COLORS.textPrimary,
    lineHeight: 18,
  },
});

export default ForbiddenNotice;
