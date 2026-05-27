import React, { useState } from 'react';
import {
  View, Text, StyleSheet, KeyboardAvoidingView,
  Platform, ScrollView, TouchableOpacity, Alert, StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { COLORS, FONTS, RADIUS, SPACING } from '../../constants/theme';

export default function LoginScreen() {
  const { login } = useAuth();
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ identifier?: string; password?: string }>({});

  function validate() {
    const e: typeof errors = {};
    if (!identifier.trim()) e.identifier = 'Email or phone is required';
    if (!password) e.password = 'Password is required';
    else if (password.length < 6) e.password = 'Min 6 characters';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleLogin() {
    if (!validate()) return;
    setLoading(true);
    try {
      await login(identifier.trim(), password);
      router.replace('/');
    } catch (err: any) {
      Alert.alert('Login Failed', errorMessage(err.code));
    } finally {
      setLoading(false);
    }
  }

  function errorMessage(code: string) {
    switch (code) {
      case 'auth/user-not-found': return 'No account found with this email.';
      case 'auth/wrong-password': return 'Incorrect password. Please try again.';
      case 'auth/invalid-email': return 'That email address is not valid.';
      case 'auth/too-many-requests': return 'Too many attempts. Please wait a few minutes.';
      case 'auth/network-request-failed': return 'No internet connection.';
      case 'auth/invalid-credential': return 'Incorrect email or password.';
      default: return 'Login failed. Please try again.';
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      {/* Hero */}
      <View style={styles.hero}>
        <View style={styles.dec1} />
        <View style={styles.dec2} />
        <View style={styles.dec3} />
        <View style={styles.logoWrap}>
          <Text style={styles.logoIcon}>🏥</Text>
        </View>
        <Text style={styles.brand}>SmartCare</Text>
        <Text style={styles.tagline}>Queue less. Heal more.</Text>
      </View>

      {/* Bottom sheet */}
      <ScrollView
        style={styles.sheet}
        contentContainerStyle={styles.sheetContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={styles.handle} />

        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>Sign in to your account</Text>

        <Input
          label="Email or Phone"
          value={identifier}
          onChangeText={setIdentifier}
          placeholder="you@example.com or 9876543210"
          keyboardType="email-address"
          autoCapitalize="none"
          error={errors.identifier}
        />
        <Input
          label="Password"
          value={password}
          onChangeText={setPassword}
          placeholder="Enter your password"
          secureToggle
          error={errors.password}
        />

        <TouchableOpacity
          onPress={() => router.push('/(auth)/forgot-password')}
          style={styles.forgotRow}
        >
          <Text style={styles.forgotText}>Forgot password?</Text>
        </TouchableOpacity>

        <Button
          label="Sign In"
          onPress={handleLogin}
          loading={loading}
          size="lg"
          style={styles.loginBtn}
        />

        <TouchableOpacity
          onPress={() => router.push('/(auth)/register')}
          style={styles.signupRow}
        >
          <Text style={styles.signupText}>
            New to SmartCare?{' '}
            <Text style={styles.signupLink}>Create account</Text>
          </Text>
        </TouchableOpacity>

        <View style={styles.divider}>
          <View style={styles.divLine} />
          <Text style={styles.divText}>staff & admins</Text>
          <View style={styles.divLine} />
        </View>

        <View style={styles.staffCard}>
          <Text style={styles.staffIcon}>👨‍⚕️</Text>
          <Text style={styles.staffText}>
            Hospital staff and administrators use credentials provided by their hospital.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.primary },

  hero: {
    alignItems: 'center',
    paddingTop: 64,
    paddingBottom: 36,
    overflow: 'hidden',
  },
  dec1: {
    position: 'absolute', width: 240, height: 240, borderRadius: 120,
    backgroundColor: COLORS.white, opacity: 0.06,
    top: -90, right: -70,
  },
  dec2: {
    position: 'absolute', width: 160, height: 160, borderRadius: 80,
    backgroundColor: COLORS.white, opacity: 0.05,
    bottom: -20, left: -50,
  },
  dec3: {
    position: 'absolute', width: 90, height: 90, borderRadius: 45,
    backgroundColor: COLORS.white, opacity: 0.07,
    top: 30, left: 35,
  },
  logoWrap: {
    width: 84, height: 84, borderRadius: RADIUS.xl,
    backgroundColor: COLORS.white + '22',
    borderWidth: 2, borderColor: COLORS.white + '44',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  logoIcon: { fontSize: 40 },
  brand: { ...FONTS.bold, fontSize: 32, color: COLORS.white, letterSpacing: -0.5 },
  tagline: { ...FONTS.regular, fontSize: 14, color: COLORS.white + 'BB', marginTop: 6 },

  sheet: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  sheetContent: {
    padding: SPACING.xl,
    paddingTop: SPACING.lg,
    paddingBottom: 48,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: COLORS.border,
    alignSelf: 'center',
    marginBottom: SPACING.xl,
  },
  title: { ...FONTS.bold, fontSize: 24, color: COLORS.text, marginBottom: 4 },
  subtitle: { ...FONTS.regular, fontSize: 14, color: COLORS.textSecondary, marginBottom: SPACING.xl },

  forgotRow: { alignSelf: 'flex-end', marginTop: -SPACING.sm, marginBottom: SPACING.md },
  forgotText: { ...FONTS.medium, fontSize: 13, color: COLORS.primary },
  loginBtn: { marginTop: SPACING.xs },

  signupRow: { marginTop: SPACING.lg, alignItems: 'center' },
  signupText: { ...FONTS.regular, fontSize: 14, color: COLORS.textSecondary },
  signupLink: { ...FONTS.semibold, color: COLORS.primary },

  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: SPACING.lg },
  divLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  divText: { ...FONTS.regular, fontSize: 11, color: COLORS.textMuted, marginHorizontal: SPACING.sm },

  staffCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.md, padding: SPACING.md,
    borderWidth: 1, borderColor: COLORS.border,
  },
  staffIcon: { fontSize: 20 },
  staffText: { ...FONTS.regular, fontSize: 13, color: COLORS.textSecondary, flex: 1, lineHeight: 20 },
});
