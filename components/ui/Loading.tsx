import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { COLORS, FONTS } from '../../constants/theme';

interface Props {
  message?: string;
  fullscreen?: boolean;
}

export default function Loading({ message, fullscreen = true }: Props) {
  return (
    <View style={[styles.container, fullscreen && styles.fullscreen]}>
      <ActivityIndicator size="large" color={COLORS.primary} />
      {message && <Text style={styles.text}>{message}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', padding: 24 },
  fullscreen: { flex: 1, backgroundColor: COLORS.background },
  text: { marginTop: 12, color: COLORS.textSecondary, ...FONTS.medium, fontSize: 14 },
});
