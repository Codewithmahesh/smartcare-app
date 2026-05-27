import React, { useState } from 'react';
import {
  View, Text, StyleSheet, KeyboardAvoidingView,
  Platform, ScrollView, TouchableOpacity, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../../lib/api';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { COLORS, FONTS, RADIUS, SHADOW, SPACING } from '../../constants/theme';

type Step = 'email' | 'reset';

const RULES = [
  { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { label: 'One uppercase letter (A–Z)', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'One number (0–9)', test: (p: string) => /[0-9]/.test(p) },
];

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const allRulesMet = RULES.every(r => r.test(newPassword));
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

  async function sendCode() {
    const e: Record<string, string> = {};
    if (!email.trim()) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Enter a valid email';
    setErrors(e);
    if (Object.keys(e).length) return;

    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email: email.trim() }, false);
      setStep('reset');
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Could not send reset code. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function resetPassword() {
    const e: Record<string, string> = {};
    if (!code.trim() || code.trim().length !== 6) e.code = 'Enter the 6-digit code from your email';
    if (!newPassword) e.newPassword = 'New password is required';
    else if (newPassword.length < 6) e.newPassword = 'Password must be at least 6 characters';
    if (newPassword !== confirmPassword) e.confirmPassword = 'Passwords do not match';
    setErrors(e);
    if (Object.keys(e).length) return;

    setLoading(true);
    try {
      await api.post('/auth/reset-password', { email: email.trim(), code: code.trim(), newPassword }, false);
      Alert.alert('Password Reset', 'Your password has been updated. Please login with your new password.', [
        { text: 'Login', onPress: () => router.replace('/(auth)/login') },
      ]);
    } catch (err: any) {
      const msg = err.code === 'code_expired'
        ? 'The code has expired. Please request a new one.'
        : err.code === 'invalid_code'
        ? 'Invalid code. Please check your email and try again.'
        : err.message ?? 'Failed to reset password.';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <View style={styles.iconBox}>
            <Text style={styles.icon}>{step === 'email' ? '📧' : '🔐'}</Text>
          </View>
          <Text style={styles.title}>{step === 'email' ? 'Forgot Password' : 'Reset Password'}</Text>
          <Text style={styles.subtitle}>
            {step === 'email'
              ? 'Enter your email and we\'ll send a 6-digit reset code.'
              : `We sent a code to ${email}. Enter it below along with your new password.`}
          </Text>
        </View>

        <View style={[styles.card, SHADOW.lg]}>
          {step === 'email' ? (
            <>
              <Input
                label="Email Address"
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                keyboardType="email-address"
                error={errors.email}
                autoComplete="email"
              />
              <Button label="Send Reset Code" onPress={sendCode} loading={loading} size="lg" style={styles.btn} />
            </>
          ) : (
            <>
              <Input
                label="6-Digit Code"
                value={code}
                onChangeText={setCode}
                placeholder="123456"
                keyboardType="number-pad"
                error={errors.code}
              />
              <Input
                label="New Password"
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Create a strong password"
                secureToggle
              />
              <View style={styles.rules}>
                {RULES.map(rule => {
                  const met = rule.test(newPassword);
                  const idle = newPassword.length === 0;
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
                label="Confirm New Password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Repeat new password"
                secureToggle
              />
              {confirmPassword.length > 0 && (
                <View style={[styles.ruleRow, { marginTop: SPACING.sm }]}>
                  <View style={[styles.ruleIcon, passwordsMatch ? styles.iconGreen : styles.iconRed]}>
                    <Text style={styles.ruleIconText}>{passwordsMatch ? '✓' : '✗'}</Text>
                  </View>
                  <Text style={[styles.ruleLabel, passwordsMatch ? styles.labelGreen : styles.labelRed]}>
                    Passwords match
                  </Text>
                </View>
              )}
              <Button label="Reset Password" onPress={resetPassword} loading={loading} size="lg" style={styles.btn} disabled={!allRulesMet || !passwordsMatch} />
              <TouchableOpacity onPress={() => { setStep('email'); setCode(''); setErrors({}); }} style={styles.resendRow}>
                <Text style={styles.resendText}>Didn't get the code? <Text style={styles.resendLink}>Send again</Text></Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  scroll: { flexGrow: 1, padding: SPACING.xl, justifyContent: 'center' },
  back: { marginBottom: SPACING.xl },
  backText: { ...FONTS.medium, fontSize: 15, color: COLORS.primary },
  header: { alignItems: 'center', marginBottom: SPACING.xxl },
  iconBox: {
    width: 72, height: 72, borderRadius: RADIUS.xl,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: SPACING.md, ...SHADOW.sm,
  },
  icon: { fontSize: 32 },
  title: { ...FONTS.bold, fontSize: 26, color: COLORS.text, marginBottom: 8 },
  subtitle: { ...FONTS.regular, fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22, paddingHorizontal: SPACING.md },
  card: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.xl,
    padding: SPACING.xl, borderWidth: 1, borderColor: COLORS.border,
  },
  btn: { marginTop: SPACING.lg },
  rules: { gap: 10, marginTop: SPACING.sm, marginBottom: SPACING.md },
  ruleRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  ruleIcon: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  iconIdle: { backgroundColor: COLORS.border },
  iconGreen: { backgroundColor: COLORS.success },
  iconRed: { backgroundColor: COLORS.error },
  ruleIconText: { color: COLORS.white, fontSize: 12, fontWeight: '700' },
  ruleLabel: { ...FONTS.regular, fontSize: 13 },
  labelIdle: { color: COLORS.textMuted },
  labelGreen: { color: COLORS.success },
  labelRed: { color: COLORS.error },
  resendRow: { marginTop: SPACING.lg, alignItems: 'center' },
  resendText: { ...FONTS.regular, fontSize: 14, color: COLORS.textSecondary },
  resendLink: { color: COLORS.primary, ...FONTS.semibold },
});
