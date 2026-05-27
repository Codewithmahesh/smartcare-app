import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { api } from '../../../lib/api';
import { useAuth } from '../../../context/AuthContext';
import { Hospital, City, Token } from '../../../types';
import Loading from '../../../components/ui/Loading';
import { COLORS, FONTS, RADIUS, SHADOW, SPACING } from '../../../constants/theme';

const SYMPTOMS = [
  { label: 'Fever', icon: '🌡️' }, { label: 'Cold & Cough', icon: '🤧' },
  { label: 'Headache', icon: '🤕' }, { label: 'Chest Pain', icon: '💔' },
  { label: 'Stomach Pain', icon: '😣' }, { label: 'Back Pain', icon: '🔙' },
  { label: 'Joint Pain', icon: '🦵' }, { label: 'Eye Problem', icon: '👁️' },
  { label: 'Ear Problem', icon: '👂' }, { label: 'Skin Issue', icon: '🩹' },
  { label: 'Breathing Difficulty', icon: '😮‍💨' }, { label: 'Vomiting', icon: '🤢' },
  { label: 'Diarrhea', icon: '🏃' }, { label: 'Dizziness', icon: '😵' },
  { label: 'High BP', icon: '💉' }, { label: 'Diabetes', icon: '🩺' },
  { label: 'Pregnancy', icon: '🤰' }, { label: 'Child Health', icon: '👶' },
  { label: 'Dental Pain', icon: '🦷' }, { label: 'Anxiety', icon: '😰' },
  { label: 'Allergy', icon: '🌿' }, { label: 'Injury', icon: '🩼' },
  { label: 'Kidney Issue', icon: '🫘' }, { label: 'Heart Problem', icon: '❤️' },
  { label: 'Cancer Screening', icon: '🔬' },
];

export default function HomeScreen() {
  const { appUser } = useAuth();
  const router = useRouter();
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [activeToken, setActiveToken] = useState<Token | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);

  const load = useCallback(async () => {
    try {
      const [h, c, tokens] = await Promise.all([
        api.get<Hospital[]>('/hospitals?isActive=true', false),
        api.get<City[]>('/cities', false),
        api.get<Token[]>('/tokens/my'),
      ]);
      setHospitals(h);
      setCities(c);
      const active = tokens.find(t => t.status === 'waiting' || t.status === 'called') ?? null;
      setActiveToken(active);
    } catch { } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  function toggleSymptom(s: string) {
    setSelectedSymptoms(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  }

  const userCity = cities.find(c => c.id === appUser?.cityId);
  const cityHospitals = appUser?.cityId
    ? hospitals.filter(h => h.cityId === appUser.cityId)
    : hospitals;
  const displayedHospitals = cityHospitals.slice(0, 5);

  if (loading) return <Loading message="Loading…" />;

  return (
    <View style={styles.root}>
      {/* Top header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.greeting}>Good day 👋</Text>
          <Text style={styles.username}>{appUser?.name?.split(' ')[0] ?? 'there'}</Text>
          <View style={styles.locationRow}>
            <Text style={styles.locationDot}>●</Text>
            <Text style={styles.location}>{userCity ? userCity.name : 'Set city in Profile'}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => router.push('/(patient)/profile')} style={styles.avatarBtn}>
          <Text style={styles.avatarText}>{appUser?.name?.[0]?.toUpperCase() ?? '?'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(); }}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* Search bar */}
        <TouchableOpacity
          style={styles.searchBar}
          onPress={() => router.push('/(patient)/search')}
          activeOpacity={0.85}
        >
          <Text style={styles.searchIcon}>🔍</Text>
          <Text style={styles.searchPlaceholder}>Search hospitals or specialties…</Text>
        </TouchableOpacity>

        {/* Active token banner */}
        {activeToken && (
          <TouchableOpacity
            style={[
              styles.tokenBanner,
              activeToken.status === 'called' ? styles.tokenBannerCalled : styles.tokenBannerWaiting,
            ]}
            onPress={() => router.push(`/(patient)/token/${activeToken.id}`)}
            activeOpacity={0.85}
          >
            <View style={[
              styles.tokenBannerIconWrap,
              { backgroundColor: (activeToken.status === 'called' ? COLORS.primary : COLORS.warning) + '30' },
            ]}>
              <Text style={styles.tokenBannerIcon}>
                {activeToken.status === 'called' ? '📣' : '⏳'}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.tokenBannerTitle}>
                {activeToken.status === 'called' ? "It's your turn!" : `Token #${activeToken.tokenNumber} — In Queue`}
              </Text>
              <Text style={styles.tokenBannerSub}>
                {activeToken.hospitalName} · {activeToken.deptName}
              </Text>
            </View>
            <Text style={styles.tokenBannerArrow}>›</Text>
          </TouchableOpacity>
        )}

        {/* Symptom section */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>What brings you in today?</Text>
          {selectedSymptoms.length > 0 && (
            <TouchableOpacity onPress={() => setSelectedSymptoms([])}>
              <Text style={styles.clearText}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.symptomGrid}>
          {SYMPTOMS.map(s => (
            <TouchableOpacity
              key={s.label}
              onPress={() => toggleSymptom(s.label)}
              style={[styles.symptomChip, selectedSymptoms.includes(s.label) && styles.symptomChipActive]}
              activeOpacity={0.75}
            >
              <Text style={styles.symptomIcon}>{s.icon}</Text>
              <Text style={[styles.symptomText, selectedSymptoms.includes(s.label) && styles.symptomTextActive]}>
                {s.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {selectedSymptoms.length > 0 && (
          <TouchableOpacity
            style={styles.findBtn}
            onPress={() => router.push({ pathname: '/(patient)/search', params: { symptoms: selectedSymptoms.join(',') } })}
            activeOpacity={0.85}
          >
            <Text style={styles.findBtnText}>
              Find Hospitals for {selectedSymptoms.length} symptom{selectedSymptoms.length > 1 ? 's' : ''} →
            </Text>
          </TouchableOpacity>
        )}

        {/* Hospitals section */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>
            {userCity ? `Hospitals in ${userCity.name}` : 'Hospitals Near You'}
          </Text>
          {cityHospitals.length > 0 && (
            <Text style={styles.sectionCount}>{cityHospitals.length} total</Text>
          )}
        </View>

        {displayedHospitals.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>🏥</Text>
            <Text style={styles.emptyTitle}>
              {appUser?.cityId ? 'No hospitals in your city yet.' : 'Set your city in Profile.'}
            </Text>
          </View>
        ) : (
          displayedHospitals.map(h => {
            const city = cities.find(c => c.id === h.cityId);
            return (
              <TouchableOpacity
                key={h.id}
                style={[styles.hospCard, SHADOW.sm]}
                onPress={() => router.push(`/(patient)/hospital/${h.id}`)}
                activeOpacity={0.8}
              >
                <View style={styles.hospIconBox}>
                  <Text style={{ fontSize: 26 }}>🏥</Text>
                </View>
                <View style={styles.hospInfo}>
                  <Text style={styles.hospName} numberOfLines={1}>{h.name}</Text>
                  <View style={styles.hospMetaRow}>
                    {city && <Text style={styles.hospCity}>📍 {city.name}</Text>}
                    {h.specialties.length > 0 && (
                      <Text style={styles.hospDeptCount}> · {h.specialties.length} dept{h.specialties.length !== 1 ? 's' : ''}</Text>
                    )}
                  </View>
                  {h.specialties.length > 0 && (
                    <View style={styles.specRow}>
                      {h.specialties.slice(0, 2).map(s => (
                        <View key={s} style={styles.specChip}>
                          <Text style={styles.specText}>{s}</Text>
                        </View>
                      ))}
                      {h.specialties.length > 2 && (
                        <View style={styles.specChip}>
                          <Text style={styles.specText}>+{h.specialties.length - 2}</Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>
                <View style={styles.hospChevron}>
                  <Text style={styles.hospChevronText}>›</Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}

        {cityHospitals.length > 5 && (
          <TouchableOpacity
            onPress={() => router.push('/(patient)/search')}
            style={styles.viewAll}
            activeOpacity={0.7}
          >
            <Text style={styles.viewAllText}>View all {cityHospitals.length} hospitals →</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: SPACING.xl }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xxl + 10,
    paddingBottom: SPACING.lg,
    backgroundColor: COLORS.primary,
  },
  headerLeft: { flex: 1 },
  greeting: { ...FONTS.regular, fontSize: 13, color: COLORS.white + 'AA' },
  username: { ...FONTS.bold, fontSize: 24, color: COLORS.white, marginTop: 2 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  locationDot: { fontSize: 8, color: COLORS.primaryMid },
  location: { ...FONTS.regular, fontSize: 12, color: COLORS.white + 'CC' },
  avatarBtn: {
    width: 44, height: 44, borderRadius: RADIUS.full,
    backgroundColor: COLORS.white + '25',
    borderWidth: 2, borderColor: COLORS.white + '40',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { ...FONTS.bold, fontSize: 18, color: COLORS.white },

  content: { padding: SPACING.lg, paddingBottom: SPACING.xxl },

  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    paddingVertical: 14, paddingHorizontal: SPACING.md,
    marginBottom: SPACING.lg,
    borderWidth: 1.5, borderColor: COLORS.border,
  },
  searchIcon: { fontSize: 16 },
  searchPlaceholder: { ...FONTS.regular, fontSize: 14, color: COLORS.textMuted, flex: 1 },

  tokenBanner: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: RADIUS.lg, padding: SPACING.md,
    marginBottom: SPACING.lg, borderWidth: 1.5, gap: SPACING.sm,
  },
  tokenBannerWaiting: {
    backgroundColor: COLORS.warning + '12',
    borderColor: COLORS.warning + '60',
  },
  tokenBannerCalled: {
    backgroundColor: COLORS.primary + '12',
    borderColor: COLORS.primary,
  },
  tokenBannerIconWrap: {
    width: 42, height: 42, borderRadius: RADIUS.md,
    alignItems: 'center', justifyContent: 'center',
  },
  tokenBannerIcon: { fontSize: 20 },
  tokenBannerTitle: { ...FONTS.semibold, fontSize: 14, color: COLORS.text },
  tokenBannerSub: { ...FONTS.regular, fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  tokenBannerArrow: { fontSize: 22, color: COLORS.textMuted },

  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  sectionTitle: { ...FONTS.semibold, fontSize: 16, color: COLORS.text },
  sectionCount: { ...FONTS.regular, fontSize: 12, color: COLORS.textMuted },
  clearText: { ...FONTS.medium, fontSize: 13, color: COLORS.primary },

  symptomGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.md },
  symptomChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderWidth: 1.5, borderColor: COLORS.border,
    borderRadius: RADIUS.full, paddingHorizontal: 12, paddingVertical: 7,
    backgroundColor: COLORS.surface,
  },
  symptomChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  symptomIcon: { fontSize: 14 },
  symptomText: { ...FONTS.medium, fontSize: 12, color: COLORS.text },
  symptomTextActive: { color: COLORS.white },

  findBtn: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.lg,
    padding: SPACING.md, alignItems: 'center', marginBottom: SPACING.xl,
  },
  findBtnText: { ...FONTS.semibold, fontSize: 15, color: COLORS.white },

  emptyCard: {
    alignItems: 'center', paddingVertical: SPACING.xxl,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border,
  },
  emptyIcon: { fontSize: 40, marginBottom: SPACING.md },
  emptyTitle: { ...FONTS.regular, fontSize: 14, color: COLORS.textSecondary, textAlign: 'center' },

  hospCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    flexDirection: 'row', alignItems: 'center',
    marginBottom: SPACING.sm,
    borderWidth: 1, borderColor: COLORS.border,
    borderLeftWidth: 4, borderLeftColor: COLORS.primary,
    overflow: 'hidden',
  },
  hospIconBox: {
    width: 52, height: 52, borderRadius: RADIUS.md,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center', justifyContent: 'center',
    marginRight: SPACING.md,
    flexShrink: 0,
  },
  hospInfo: { flex: 1, minWidth: 0 },
  hospName: { ...FONTS.semibold, fontSize: 15, color: COLORS.text },
  hospMetaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
  hospCity: { ...FONTS.regular, fontSize: 12, color: COLORS.primary },
  hospDeptCount: { ...FONTS.regular, fontSize: 12, color: COLORS.textSecondary },
  specRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 5 },
  specChip: {
    backgroundColor: COLORS.primaryLight, borderRadius: RADIUS.xs,
    paddingHorizontal: 7, paddingVertical: 2,
  },
  specText: { ...FONTS.regular, fontSize: 10, color: COLORS.primary },

  hospChevron: {
    width: 28, height: 28, borderRadius: RADIUS.full,
    backgroundColor: COLORS.background,
    alignItems: 'center', justifyContent: 'center',
    marginLeft: SPACING.sm, flexShrink: 0,
  },
  hospChevronText: { fontSize: 18, color: COLORS.textSecondary, lineHeight: 22 },

  viewAll: {
    alignItems: 'center', paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg, backgroundColor: COLORS.primaryLight,
    marginTop: SPACING.sm,
    borderWidth: 1, borderColor: COLORS.primaryMid,
  },
  viewAllText: { ...FONTS.semibold, fontSize: 14, color: COLORS.primary },
});
