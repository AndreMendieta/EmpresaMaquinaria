import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS } from '../constants/colors';

const ROLE_LABELS = {
  admin: { label: 'ADMIN', color: COLORS.roleAdmin, bg: 'rgba(255, 106, 0, 0.15)' },
  supervisor: { label: 'SUPERVISOR', color: COLORS.roleSupervisor, bg: 'rgba(56, 189, 248, 0.15)' },
  tecnico: { label: 'TÉCNICO', color: COLORS.roleTecnico, bg: 'rgba(16, 185, 129, 0.15)' },
};

const HeaderBar = ({
  title,
  subtitle,
  role,
  onBack,
  onRightAction,
  rightActionLabel,
}) => {
  const roleInfo = ROLE_LABELS[role] || null;

  return (
    <View style={styles.header}>
      <View style={styles.leftContainer}>
        {onBack ? (
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Text style={styles.backText}>← Volver</Text>
          </TouchableOpacity>
        ) : null}
        <View>
          <Text style={styles.brandTitle}>
            Hydro<Text style={styles.titleOrange}>Tech</Text>
            {title ? <Text style={styles.pageTitle}> • {title}</Text> : null}
          </Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
      </View>

      <View style={styles.rightContainer}>
        {roleInfo ? (
          <View style={[styles.roleBadge, { backgroundColor: roleInfo.bg }]}>
            <Text style={[styles.roleText, { color: roleInfo.color }]}>
              {roleInfo.label}
            </Text>
          </View>
        ) : null}
        {onRightAction && rightActionLabel ? (
          <TouchableOpacity style={styles.actionBtn} onPress={onRightAction}>
            <Text style={styles.actionBtnText}>{rightActionLabel}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  leftContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backButton: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: COLORS.surface2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  backText: {
    color: COLORS.orange,
    fontSize: 12,
    fontWeight: '700',
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  titleOrange: {
    color: COLORS.orange,
  },
  pageTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.silver,
  },
  subtitle: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  roleBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  roleText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  actionBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: COLORS.orange,
    borderRadius: 6,
  },
  actionBtnText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },
});

export default HeaderBar;
