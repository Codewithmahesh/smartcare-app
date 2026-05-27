import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet, ViewStyle, View } from 'react-native';
import { COLORS, FONTS, RADIUS, SHADOW } from '../../constants/theme';

interface Props {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'outline' | 'danger' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  size?: 'sm' | 'md' | 'lg';
  icon?: string;
}

export default function Button({ label, onPress, variant = 'primary', loading, disabled, style, size = 'md', icon }: Props) {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      style={[
        styles.base,
        styles[variant],
        styles[`size_${size}`],
        variant === 'primary' && !isDisabled && SHADOW.sm,
        isDisabled && styles.disabled,
        style,
      ]}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator size="small" color={variant === 'outline' || variant === 'ghost' ? COLORS.primary : '#fff'} />
      ) : (
        <View style={styles.inner}>
          {icon ? <Text style={[styles.icon, styles[`textSize_${size}`]]}>{icon} </Text> : null}
          <Text style={[styles.text, styles[`text_${variant}`], styles[`textSize_${size}`]]}>{label}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: RADIUS.lg, alignItems: 'center', justifyContent: 'center' },
  inner: { flexDirection: 'row', alignItems: 'center' },
  icon: { },
  primary: { backgroundColor: COLORS.primary },
  outline: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: COLORS.primary },
  danger: { backgroundColor: COLORS.error },
  ghost: { backgroundColor: 'transparent' },
  disabled: { opacity: 0.45 },
  size_sm: { paddingVertical: 8, paddingHorizontal: 16 },
  size_md: { paddingVertical: 14, paddingHorizontal: 22 },
  size_lg: { paddingVertical: 16, paddingHorizontal: 28 },
  text: { ...FONTS.semibold, letterSpacing: 0.2 },
  text_primary: { color: '#fff' },
  text_outline: { color: COLORS.primary },
  text_danger: { color: '#fff' },
  text_ghost: { color: COLORS.primary },
  textSize_sm: { fontSize: 13 },
  textSize_md: { fontSize: 15 },
  textSize_lg: { fontSize: 16 },
});
