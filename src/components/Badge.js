import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../constants/colors';

const STATUS_CONFIG = {
  validada: { label: 'VALIDADA', bg: 'rgba(16, 185, 129, 0.15)', text: COLORS.success, border: 'rgba(16, 185, 129, 0.3)' },
  aprobada: { label: 'APROBADA', bg: 'rgba(16, 185, 129, 0.15)', text: COLORS.success, border: 'rgba(16, 185, 129, 0.3)' },
  pendiente: { label: 'PENDIENTE', bg: 'rgba(245, 158, 11, 0.15)', text: COLORS.warning, border: 'rgba(245, 158, 11, 0.3)' },
  borrador: { label: 'BORRADOR', bg: 'rgba(56, 189, 248, 0.15)', text: '#38BDF8', border: 'rgba(56, 189, 248, 0.3)' },
  rechazada: { label: 'RECHAZADA', bg: 'rgba(239, 68, 68, 0.15)', text: COLORS.danger, border: 'rgba(239, 68, 68, 0.3)' },
  activa: { label: 'ACTIVA', bg: 'rgba(16, 185, 129, 0.15)', text: COLORS.success, border: 'rgba(16, 185, 129, 0.3)' },
  inactiva: { label: 'INACTIVA', bg: 'rgba(107, 114, 128, 0.15)', text: '#9CA3AF', border: 'rgba(107, 114, 128, 0.3)' },
  en_progreso: { label: 'EN PROGRESO', bg: 'rgba(56, 189, 248, 0.15)', text: '#38BDF8', border: 'rgba(56, 189, 248, 0.3)' },
  completada: { label: 'COMPLETADA', bg: 'rgba(16, 185, 129, 0.15)', text: COLORS.success, border: 'rgba(16, 185, 129, 0.3)' },
};

const Badge = ({ status, label: customLabel }) => {
  const normalized = (status || '').toLowerCase();
  const config = STATUS_CONFIG[normalized] || {
    label: (customLabel || status || 'ESTADO').toUpperCase(),
    bg: 'rgba(255, 255, 255, 0.1)',
    text: COLORS.textPrimary,
    border: 'rgba(255, 255, 255, 0.2)',
  };

  return (
    <View style={[styles.badge, { backgroundColor: config.bg, borderColor: config.border }]}>
      <Text style={[styles.text, { color: config.text }]}>
        {customLabel || config.label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});

export default Badge;
