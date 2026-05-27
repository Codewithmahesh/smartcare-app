import React, { useState } from 'react';
import {
  View, Text, StyleSheet, KeyboardAvoidingView, Platform,
  ScrollView, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { COLORS, FONTS, RADIUS, SPACING, SHADOW } from '../../constants/theme';

interface Rule {
  label: string;
  test: (p: string) => boolean;
}

const RULES: Rule[] = [
  { label: 'At least 8 characters', test: p => p.length >= 8 },
  { label: 'One uppercase letter (A–Z)', test: p => /[A-Z]/.test(p) },
  { label: 'One number (0–9)', test: p => /[0-9]/.test(p) },
];

export default function ChangePasswordScreen() {
  const { changePassword, appUser } = useAuth();
  const router = useRouter();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmError, setConfirmError] = useState('');

  const allRulesMet = RULES.every(r => r.test(password));
  const passwordsMatch = password.length > 0 && confirm === password;

  async function handleChange() {
    if (!allRulesMet) return;
    if (password !== confirm) { setConfirmError('Passwords do not match'); return; }
    setConfirmError('');
    setLoading(true);
    try {
      await changePassword(password);
      Alert.alert('Password Changed', 'Your password has been set successfully.', [
        { text: 'Continue', onPress: () => router.replace('/') },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to change password. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.lock}>🔐</Text>
          <Text style={styles.title}>Set Your Password</Text>
          <Text style={styles.subtitle}>
            Hello, {appUser?.name ?? 'there'}! This is your first login.{'\n'}
            Please set a secure password to continue.
          </Text>
        </View>

        <View style={[styles.card, SHADOW.md]}>
          <Input
            label="New Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Create a strong password"
            secureToggle
          />

          <View style={styles.rules}>
            {RULES.map(rule => {
              const met = rule.test(password);
              const idle = password.length === 0;
              return (
                <View key={rule.label} style={styles.ruleRow}>
                  <View style={[styles.ruleIcon, idle ? styles.iconIdle : met ? styles.iconGreen : styles.iconRed]}>
                    <Text style={styles.ruleIconText}>{idle ? '–' : met ? '✓' : '✗'}</Text>
                  </View>
                  <Text style={[styles.ruleLabel, idle ? styles.labelIdle : met ? styles.labelGreen : styles.labelRed]}>
                    {rule.label}
                  </Text>
                </View>
              );
            })}
          </View>

          <Input
            label="Confirm Password"
            value={confirm}
            onChangeText={v => { setConfirm(v); setConfirmError(''); }}
            placeholder="Re-enter your password"
            secureToggle
            error={confirmError}
          />

          {confirm.length > 0 && (
            <View style={styles.matchRow}>
              <View style={[styles.ruleIcon, passwordsMatch ? styles.iconGreen : styles.iconRed]}>
                <Text style={styles.ruleIconText}>{passwordsMatch ? '✓' : '✗'}</Text>
              </View>
              <Text style={[styles.ruleLabel, passwordsMatch ? styles.labelGreen : styles.labelRed]}>
                Passwords match
              </Text>
            </View>
          )}

          <Button
            label="Set Password & Continue"
            onPress={handleChange}
            loading={loading}
            size="lg"
            style={{ marginTop: SPACING.lg }}
            disabled={!allRulesMet || !passwordsMatch}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  scroll: { flexGrow: 1, padding: SPACING.xl, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: SPACING.xl },
  lock: { fontSize: 48, marginBottom: SPACING.md },
  title: { ...FONTS.bold, fontSize: 24, color: COLORS.text, textAlign: 'center' },
  subtitle: { ...FONTS.regular, fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', marginTop: 8, lineHeight: 22 },
  card: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.xl,
    padding: SPACING.xl, borderWidth: 1, borderColor: COLORS.border,
  },
  rules: { marginTop: SPACING.sm, marginBottom: SPACING.lg, gap: 10 },
  ruleRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  matchRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginTop: SPACING.sm },
  ruleIcon: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  iconIdle: { backgroundColor: COLORS.border },
  iconGreen: { backgroundColor: COLORS.success },
  iconRed: { backgroundColor: COLORS.error },
  ruleIconText: { color: COLORS.white, fontSize: 12, fontWeight: '700' },
  ruleLabel: { ...FONTS.regular, fontSize: 13 },
  labelIdle: { color: COLORS.textMuted },
  labelGreen: { color: COLORS.success },
  labelRed: { color: COLORS.error },
});
