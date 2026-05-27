import React, { useState } from 'react';
import { View, TextInput, Text, TouchableOpacity, StyleSheet, TextInputProps } from 'react-native';
import { COLORS, FONTS, RADIUS, SPACING } from '../../constants/theme';

interface Props extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  secureToggle?: boolean;
  icon?: React.ReactNode;
}

export default function Input({ label, error, hint, secureToggle, icon, style, ...props }: Props) {
  const [show, setShow] = useState(false);
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.wrapper}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[
        styles.row,
        focused ? styles.focusedBorder : styles.normalBorder,
        error ? styles.errorBorder : undefined,
      ]}>
        {icon && <View style={styles.icon}>{icon}</View>}
        <TextInput
          style={[styles.input, icon ? styles.inputPadded : undefined]}
          placeholderTextColor={COLORS.textMuted}
          secureTextEntry={secureToggle ? !show : props.secureTextEntry}
          autoCapitalize="none"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...props}
        />
        {secureToggle && (
          <TouchableOpacity onPress={() => setShow(v => !v)} style={styles.toggle}>
            <Text style={styles.toggleText}>{show ? 'Hide' : 'Show'}</Text>
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
      {hint && !error && <Text style={styles.hint}>{hint}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: SPACING.md },
  label: { ...FONTS.semibold, fontSize: 13, color: COLORS.text, marginBottom: 7 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
  },
  normalBorder: { borderColor: COLORS.border },
  focusedBorder: { borderColor: COLORS.primary, backgroundColor: COLORS.white },
  errorBorder: { borderColor: COLORS.error },
  input: {
    flex: 1,
    paddingVertical: 13,
    paddingHorizontal: SPACING.md,
    ...FONTS.regular,
    fontSize: 15,
    color: COLORS.text,
  },
  inputPadded: { paddingLeft: 0 },
  icon: { paddingLeft: SPACING.md },
  toggle: { paddingHorizontal: SPACING.md, paddingVertical: 13 },
  toggleText: { ...FONTS.semibold, fontSize: 13, color: COLORS.primary },
  error: { ...FONTS.regular, fontSize: 12, color: COLORS.error, marginTop: 5 },
  hint: { ...FONTS.regular, fontSize: 12, color: COLORS.textMuted, marginTop: 5 },
});
