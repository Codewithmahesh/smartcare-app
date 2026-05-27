import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { api } from '../../../lib/api';
import { useAuth } from '../../../context/AuthContext';
import { City, Prescription } from '../../../types';
import { getHealthInsights, HealthInsight } from '../../../lib/gemini';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';
import { COLORS, FONTS, RADIUS, SPACING, SHADOW } from '../../../constants/theme';

export default function ProfileScreen() {
  const { appUser, logout, refreshUser } = useAuth();
  const router = useRouter();

  const [cities, setCities] = useState<City[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [insight, setInsight] = useState<HealthInsight | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);

  const [form, setForm] = useState({
    name: appUser?.name ?? '',
    phone: appUser?.phone ?? '',
    cityId: appUser?.cityId ?? '',
  });

  const load = useCallback(async () => {
    try {
      const [c, rx] = await Promise.all([
        api.get<City[]>('/cities', false),
        api.get<Prescription[]>('/prescriptions/my'),
      ]);
      setCities(c);
      setPrescriptions(rx);

      if (rx.length > 0 && !insight) {
        setInsightLoading(true);
        const diagnoses = rx.map(p => p.diagnosis).filter(Boolean);
        const meds = rx.flatMap(p => p.medicines.map(m => m.name)).filter(Boolean);
        getHealthInsights(diagnoses, meds, rx.length)
          .then(setInsight)
          .finally(() => setInsightLoading(false));
      }
    } catch { } finally {
      setDataLoaded(true);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function saveProfile() {
    if (!form.name.trim()) { Alert.alert('Validation', 'Name is required'); return; }
    setSaving(true);
    try {
      await api.put('/auth/me', { name: form.name.trim(), phone: form.phone.trim(), cityId: form.cityId });
      await refreshUser();
      setEditing(false);
    } catch { Alert.alert('Error', 'Failed to update profile.'); }
    finally { setSaving(false); }
  }

  async function handleLogout() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: async () => { await logout(); router.replace('/(auth)/login'); } },
    ]);
  }

  const userCity = cities.find(c => c.id === appUser?.cityId);
  const recentRx = prescriptions.slice(0, 3);
  const healthColor = { good: COLORS.success, moderate: COLORS.warning, 'needs-attention': COLORS.error }[insight?.overallHealth ?? 'moderate'];

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.root} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* Header */}
        <View style={styles.headerBg}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{appUser?.name?.[0]?.toUpperCase() ?? '?'}</Text>
          </View>
          <Text style={styles.userName}>{appUser?.name}</Text>
          <Text style={styles.userSub}>{appUser?.email}</Text>
          {userCity && <View style={styles.cityPill}><Text style={styles.cityPillText}>📍 {userCity.name}</Text></View>}
        </View>

        {/* AI Health Card */}
        <View style={[styles.section, SHADOW.sm]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🤖 AI Health Overview</Text>
            {insight && (
              <View style={[styles.healthBadge, { backgroundColor: healthColor + '20' }]}>
                <Text style={[styles.healthBadgeText, { color: healthColor }]}>
                  {insight.overallHealth === 'good' ? '✓ Good' : insight.overallHealth === 'moderate' ? '~ Moderate' : '! Needs Attention'}
                </Text>
              </View>
            )}
          </View>

          {insightLoading ? (
            <View style={styles.insightLoading}>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text style={styles.insightLoadingText}>Analysing your health history…</Text>
            </View>
          ) : insight ? (
            <>
              <Text style={styles.insightSummary}>{insight.summary}</Text>

              <Text style={styles.insightSubTitle}>💡 Tips for you</Text>
              {insight.tips.map((tip, i) => (
                <View key={i} style={styles.tipRow}>
                  <View style={styles.tipDot} />
                  <Text style={styles.tipText}>{tip}</Text>
                </View>
              ))}

              <Text style={[styles.insightSubTitle, { marginTop: SPACING.md }]}>⚠️ Watch out for</Text>
              {insight.watchOut.map((w, i) => (
                <View key={i} style={styles.tipRow}>
                  <View style={[styles.tipDot, { backgroundColor: COLORS.warning }]} />
                  <Text style={styles.tipText}>{w}</Text>
                </View>
              ))}
            </>
          ) : prescriptions.length === 0 ? (
            <Text style={styles.noDataText}>Book your first appointment to get personalised AI health insights here.</Text>
          ) : null}
        </View>

        {/* Prescriptions */}
        {prescriptions.length > 0 && (
          <View style={[styles.section, SHADOW.sm]}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>💊 Recent Prescriptions</Text>
              <Text style={styles.rxCount}>{prescriptions.length} total</Text>
            </View>
            {recentRx.map(rx => (
              <TouchableOpacity
                key={rx.id}
                style={styles.rxCard}
                onPress={() => router.push(`/(patient)/token/${rx.tokenId}`)}
              >
                <View style={styles.rxLeft}>
                  <Text style={styles.rxDiagnosis}>{rx.diagnosis}</Text>
                  <Text style={styles.rxHosp}>{rx.medicines.length} medicine{rx.medicines.length !== 1 ? 's' : ''} · {formatDate(rx.createdAt)}</Text>
                  {rx.bedAssigned && <Text style={styles.rxBed}>🛏️ Bed {rx.bedAssigned} assigned</Text>}
                </View>
                <Text style={styles.rxArrow}>›</Text>
              </TouchableOpacity>
            ))}
            {prescriptions.length > 3 && (
              <Text style={styles.moreRx}>+{prescriptions.length - 3} more in My Tokens history</Text>
            )}
          </View>
        )}

        {/* Profile Edit */}
        <View style={[styles.section, SHADOW.sm]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>👤 Account</Text>
            {!editing && (
              <TouchableOpacity onPress={() => { setEditing(true); setForm({ name: appUser?.name ?? '', phone: appUser?.phone ?? '', cityId: appUser?.cityId ?? '' }); }}>
                <Text style={styles.editLink}>Edit</Text>
              </TouchableOpacity>
            )}
          </View>

          {editing ? (
            <>
              <Input label="Full Name" value={form.name} onChangeText={v => setForm(p => ({ ...p, name: v }))} placeholder="Your full name" />
              <Input label="Phone Number" value={form.phone} onChangeText={v => setForm(p => ({ ...p, phone: v }))} placeholder="+91 XXXXX XXXXX" keyboardType="phone-pad" />
              <Text style={styles.fieldLabel}>Your City</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: SPACING.md }}>
                {cities.filter(c => c.isLive).map(c => (
                  <TouchableOpacity
                    key={c.id}
                    onPress={() => setForm(p => ({ ...p, cityId: c.id }))}
                    style={[styles.cityChip, form.cityId === c.id && styles.cityChipActive]}
                  >
                    <Text style={[styles.cityChipText, form.cityId === c.id && styles.cityChipTextActive]}>{c.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
                <Button label="Cancel" onPress={() => setEditing(false)} variant="outline" style={{ flex: 1 }} />
                <Button label="Save" onPress={saveProfile} loading={saving} style={{ flex: 1 }} />
              </View>
            </>
          ) : (
            <>
              <InfoRow icon="✉️" label="Email" value={appUser?.email ?? ''} />
              {appUser?.phone ? <InfoRow icon="📱" label="Phone" value={appUser.phone} /> : null}
              <InfoRow icon="🏙️" label="City" value={userCity?.name ?? 'Not set'} />
              <InfoRow icon="🎟️" label="Total Visits" value={`${prescriptions.length} visit${prescriptions.length !== 1 ? 's' : ''}`} />
            </>
          )}
        </View>

        {/* Coming Soon Cities */}
        {cities.filter(c => !c.isLive).length > 0 && (
          <View style={[styles.section, SHADOW.sm]}>
            <Text style={styles.sectionTitle}>🚀 SmartCare Coming Soon</Text>
            <Text style={styles.waitlistSub}>Join the waitlist to be notified when we launch in your city.</Text>
            {cities.filter(c => !c.isLive).map(city => (
              <View key={city.id} style={styles.waitlistRow}>
                <View>
                  <Text style={styles.cityName}>{city.name}</Text>
                  <Text style={styles.stateName}>{city.state}</Text>
                </View>
                <Button
                  label="Join Waitlist"
                  onPress={async () => {
                    try {
                      await api.post(`/waitlist/${city.id}`, { name: appUser?.name, email: appUser?.email, phone: appUser?.phone ?? '' });
                      Alert.alert('Joined!', "We'll notify you when SmartCare launches there.");
                    } catch { Alert.alert('Error', 'Failed to join waitlist.'); }
                  }}
                  size="sm"
                />
              </View>
            ))}
          </View>
        )}

        <Button label="Sign Out" onPress={handleLogout} variant="danger" style={styles.logoutBtn} />
        <View style={{ height: SPACING.xxl }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoIcon}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingBottom: SPACING.xxl },
  headerBg: { backgroundColor: COLORS.primary, alignItems: 'center', paddingTop: SPACING.xl + 16, paddingBottom: SPACING.xl + 8, paddingHorizontal: SPACING.lg },
  avatar: { width: 80, height: 80, borderRadius: RADIUS.full, backgroundColor: COLORS.white + '30', alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.md, borderWidth: 3, borderColor: COLORS.white + '60' },
  avatarText: { ...FONTS.bold, fontSize: 32, color: COLORS.white },
  userName: { ...FONTS.bold, fontSize: 22, color: COLORS.white },
  userSub: { ...FONTS.regular, fontSize: 13, color: COLORS.white + 'BB', marginTop: 4 },
  cityPill: { backgroundColor: COLORS.white + '20', borderRadius: RADIUS.full, paddingHorizontal: 12, paddingVertical: 4, marginTop: SPACING.sm },
  cityPillText: { ...FONTS.medium, fontSize: 12, color: COLORS.white },
  section: { backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, margin: SPACING.lg, marginBottom: 0, padding: SPACING.lg, borderWidth: 1, borderColor: COLORS.border },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  sectionTitle: { ...FONTS.semibold, fontSize: 15, color: COLORS.text },
  editLink: { ...FONTS.medium, fontSize: 14, color: COLORS.primary },
  healthBadge: { borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 3 },
  healthBadgeText: { ...FONTS.bold, fontSize: 11 },
  insightLoading: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingVertical: SPACING.md },
  insightLoadingText: { ...FONTS.regular, fontSize: 13, color: COLORS.textSecondary },
  insightSummary: { ...FONTS.regular, fontSize: 14, color: COLORS.text, lineHeight: 22, marginBottom: SPACING.md },
  insightSubTitle: { ...FONTS.semibold, fontSize: 13, color: COLORS.text, marginBottom: SPACING.sm },
  tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm, marginBottom: 6 },
  tipDot: { width: 7, height: 7, borderRadius: RADIUS.full, backgroundColor: COLORS.primary, marginTop: 5, flexShrink: 0 },
  tipText: { ...FONTS.regular, fontSize: 13, color: COLORS.textSecondary, flex: 1, lineHeight: 20 },
  noDataText: { ...FONTS.regular, fontSize: 13, color: COLORS.textSecondary, lineHeight: 20 },
  rxCard: { flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.md, borderTopWidth: 1, borderTopColor: COLORS.border },
  rxLeft: { flex: 1 },
  rxDiagnosis: { ...FONTS.semibold, fontSize: 14, color: COLORS.text },
  rxHosp: { ...FONTS.regular, fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  rxBed: { ...FONTS.regular, fontSize: 11, color: COLORS.primary, marginTop: 2 },
  rxArrow: { fontSize: 20, color: COLORS.textMuted, marginLeft: SPACING.sm },
  rxCount: { ...FONTS.regular, fontSize: 12, color: COLORS.textSecondary },
  moreRx: { ...FONTS.regular, fontSize: 12, color: COLORS.textMuted, marginTop: SPACING.sm, textAlign: 'center' },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.sm, gap: SPACING.md, borderTopWidth: 1, borderTopColor: COLORS.border },
  infoIcon: { fontSize: 20, width: 28 },
  infoLabel: { ...FONTS.regular, fontSize: 11, color: COLORS.textMuted },
  infoValue: { ...FONTS.medium, fontSize: 14, color: COLORS.text, marginTop: 2 },
  fieldLabel: { ...FONTS.medium, fontSize: 13, color: COLORS.text, marginBottom: SPACING.sm, marginTop: SPACING.sm },
  cityChip: { borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.full, paddingHorizontal: 14, paddingVertical: 6, marginRight: SPACING.sm },
  cityChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  cityChipText: { ...FONTS.medium, fontSize: 13, color: COLORS.text },
  cityChipTextActive: { color: COLORS.white },
  waitlistSub: { ...FONTS.regular, fontSize: 13, color: COLORS.textSecondary, marginBottom: SPACING.md, lineHeight: 20 },
  waitlistRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: SPACING.sm, borderTopWidth: 1, borderTopColor: COLORS.border },
  cityName: { ...FONTS.medium, fontSize: 14, color: COLORS.text },
  stateName: { ...FONTS.regular, fontSize: 12, color: COLORS.textSecondary },
  logoutBtn: { margin: SPACING.lg, marginBottom: 0 },
});
