import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, FONTS, SPACING } from '../../constants/theme';
import Button from './Button';

interface Props {
  icon?: string;
  title: string;
  message?: string;
  action?: { label: string; onPress: () => void };
}

export default function EmptyState({ icon = '📭', title, message, action }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.title}>{title}</Text>
      {message && <Text style={styles.message}>{message}</Text>}
      {action && (
        <Button label={action.label} onPress={action.onPress} style={styles.btn} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xxl },
  icon: { fontSize: 48, marginBottom: SPACING.md },
  title: { ...FONTS.bold, fontSize: 18, color: COLORS.text, textAlign: 'center', marginBottom: SPACING.sm },
  message: { ...FONTS.regular, fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22 },
  btn: { marginTop: SPACING.lg, paddingHorizontal: SPACING.xl },
});
