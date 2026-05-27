import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, KeyboardAvoidingView,
  Platform, ScrollView, TouchableOpacity, Alert, StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { City } from '../../types';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { COLORS, FONTS, RADIUS, SPACING, SHADOW } from '../../constants/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function RegisterScreen() {
  const { refreshUser } = useAuth();
  const router = useRouter();
  const [cities, setCities] = useState<City[]>([]);
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '', phone: '', cityId: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get<City[]>('/cities', false).then(c => setCities(c.filter(x => x.isLive))).catch(() => {});
  }, []);

  function validate() {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.email.trim()) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Enter a valid email';
    if (!form.password) e.password = 'Password is required';
    else if (form.password.length < 6) e.password = 'At least 6 characters';
    if (form.password !== form.confirm) e.confirm = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleRegister() {
    if (!validate()) return;
    setLoading(true);
    try {
      const { token } = await api.post<{ token: string; user: any }>('/auth/signup', {
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        phone: form.phone.trim(),
        cityId: form.cityId || undefined,
      }, false);
      await AsyncStorage.setItem('auth_token', token);
      await refreshUser();
      router.replace('/');
    } catch (err: any) {
      const msg = err.code === 'auth/email-already-in-use'
        ? 'An account with this email already exists.'
        : err.message ?? 'Registration failed. Please try again.';
      Alert.alert('Registration Failed', msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.dec1} />
          <View style={styles.dec2} />
          <View style={styles.logoWrap}>
            <Text style={styles.logoIcon}>🏥</Text>
          </View>
          <Text style={styles.brand}>SmartCare</Text>
          <Text style={styles.tagline}>Your health journey starts here</Text>
        </View>

        {/* Form card */}
        <View style={[styles.card, SHADOW.lg]}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join to book appointments and track your health</Text>

          <Input
            label="Full Name *"
            value={form.name}
            onChangeText={v => setForm(p => ({ ...p, name: v }))}
            placeholder="Your full name"
            error={errors.name}
          />
          <Input
            label="Email *"
            value={form.email}
            onChangeText={v => setForm(p => ({ ...p, email: v }))}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            error={errors.email}
          />
          <Input
            label="Password *"
            value={form.password}
            onChangeText={v => setForm(p => ({ ...p, password: v }))}
            placeholder="Minimum 6 characters"
            secureToggle
            error={errors.password}
          />
          <Input
            label="Confirm Password *"
            value={form.confirm}
            onChangeText={v => setForm(p => ({ ...p, confirm: v }))}
            placeholder="Re-enter password"
            secureToggle
            error={errors.confirm}
          />
          <Input
            label="Phone (optional)"
            value={form.phone}
            onChangeText={v => setForm(p => ({ ...p, phone: v }))}
            placeholder="+91 XXXXX XXXXX"
            keyboardType="phone-pad"
          />

          {cities.length > 0 && (
            <>
              <Text style={styles.cityLabel}>Your City <Text style={styles.cityLabelOpt}>(optional)</Text></Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.cityScroll} contentContainerStyle={styles.cityScrollContent}>
                {cities.map(c => (
                  <TouchableOpacity
                    key={c.id}
                    onPress={() => setForm(p => ({ ...p, cityId: p.cityId === c.id ? '' : c.id }))}
                    style={[styles.cityChip, form.cityId === c.id && styles.cityChipActive]}
                  >
                    <Text style={[styles.cityChipText, form.cityId === c.id && styles.cityChipTextActive]}>
                      {c.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          )}

          <Button
            label="Create Account"
            onPress={handleRegister}
            loading={loading}
            size="lg"
            style={styles.btn}
          />

          <TouchableOpacity onPress={() => router.replace('/(auth)/login')} style={styles.loginRow}>
            <Text style={styles.loginText}>
              Already have an account?{' '}
              <Text style={styles.loginLink}>Sign In</Text>
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: SPACING.xl }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.primary },
  scroll: { flexGrow: 1 },

  hero: {
    alignItems: 'center',
    paddingTop: 56,
    paddingBottom: 32,
    overflow: 'hidden',
  },
  dec1: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    backgroundColor: COLORS.white, opacity: 0.06,
    top: -60, right: -50,
  },
  dec2: {
    position: 'absolute', width: 120, height: 120, borderRadius: 60,
    backgroundColor: COLORS.white, opacity: 0.07,
    bottom: 0, left: -30,
  },
  logoWrap: {
    width: 72, height: 72, borderRadius: RADIUS.xl,
    backgroundColor: COLORS.white + '22',
    borderWidth: 2, borderColor: COLORS.white + '44',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  logoIcon: { fontSize: 34 },
  brand: { ...FONTS.bold, fontSize: 28, color: COLORS.white, letterSpacing: -0.5 },
  tagline: { ...FONTS.regular, fontSize: 13, color: COLORS.white + 'BB', marginTop: 5 },

  card: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: SPACING.xl,
    paddingBottom: SPACING.xxl,
    flex: 1,
  },
  title: { ...FONTS.bold, fontSize: 22, color: COLORS.text, marginBottom: 4 },
  subtitle: { ...FONTS.regular, fontSize: 13, color: COLORS.textSecondary, marginBottom: SPACING.xl, lineHeight: 20 },

  cityLabel: { ...FONTS.semibold, fontSize: 13, color: COLORS.text, marginTop: SPACING.sm, marginBottom: SPACING.sm },
  cityLabelOpt: { ...FONTS.regular, color: COLORS.textMuted },
  cityScroll: { marginBottom: SPACING.md },
  cityScrollContent: { paddingRight: SPACING.md, gap: SPACING.sm },
  cityChip: {
    borderWidth: 1.5, borderColor: COLORS.border,
    borderRadius: RADIUS.full,
    paddingHorizontal: 14, paddingVertical: 7,
  },
  cityChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  cityChipText: { ...FONTS.medium, fontSize: 13, color: COLORS.text },
  cityChipTextActive: { color: COLORS.white },

  btn: { marginTop: SPACING.md },
  loginRow: { marginTop: SPACING.lg, alignItems: 'center' },
  loginText: { ...FONTS.regular, fontSize: 14, color: COLORS.textSecondary },
  loginLink: { ...FONTS.semibold, color: COLORS.primary },
});
