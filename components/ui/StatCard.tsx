import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, FONTS, RADIUS, SHADOW, SPACING } from '../../constants/theme';

interface Props {
  label: string;
  value: string | number;
  icon?: string;
  color?: string;
  sub?: string;
}

export default function StatCard({ label, value, icon, color = COLORS.primary, sub }: Props) {
  return (
    <View style={[styles.card, SHADOW.sm]}>
      <View style={[styles.iconBox, { backgroundColor: color + '18' }]}>
        <Text style={styles.icon}>{icon ?? '📊'}</Text>
      </View>
      <Text style={[styles.value, { color }]}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
      {sub && <Text style={styles.sub}>{sub}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    flex: 1,
    minWidth: 140,
  },
  iconBox: { width: 44, height: 44, borderRadius: RADIUS.full, alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.sm },
  icon: { fontSize: 20 },
  value: { ...FONTS.bold, fontSize: 28, lineHeight: 32 },
  label: { ...FONTS.medium, fontSize: 12, color: COLORS.textSecondary, marginTop: 2, textAlign: 'center' },
  sub: { ...FONTS.regular, fontSize: 11, color: COLORS.textMuted, marginTop: 2, textAlign: 'center' },
});
