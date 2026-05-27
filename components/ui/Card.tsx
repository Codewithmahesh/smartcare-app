import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { COLORS, RADIUS, SHADOW, SPACING } from '../../constants/theme';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
  shadow?: 'sm' | 'md' | 'lg';
  padding?: number;
}

export default function Card({ children, style, shadow = 'sm', padding }: Props) {
  return (
    <View style={[styles.card, SHADOW[shadow], padding !== undefined && { padding }, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
});
