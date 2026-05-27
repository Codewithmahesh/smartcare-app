import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '../../../lib/api';
import { useAuth } from '../../../context/AuthContext';
import { Hospital, City } from '../../../types';
import { analyzeSymptoms, scoreHospital, GeminiAnalysis } from '../../../lib/gemini';
import Loading from '../../../components/ui/Loading';
import { COLORS, FONTS, RADIUS, SHADOW, SPACING } from '../../../constants/theme';

interface ScoredHospital extends Hospital {
  score: number;
  bedsAvailable: number;
  analysis?: GeminiAnalysis;
}

export default function SearchScreen() {
  const params = useLocalSearchParams<{ symptoms?: string; query?: string }>();
  const router = useRouter();
  const { appUser } = useAuth();

  const [searchText, setSearchText] = useState(params.query ?? '');
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [results, setResults] = useState<ScoredHospital[]>([]);
  const [analysis, setAnalysis] = useState<GeminiAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [showAllCities, setShowAllCities] = useState(false);

  const initialSymptoms = params.symptoms ? params.symptoms.split(',').filter(Boolean) : [];

  const load = useCallback(async () => {
    try {
      const [h, c] = await Promise.all([
        api.get<Hospital[]>('/hospitals?isActive=true', false),
        api.get<City[]>('/cities', false),
      ]);
      setHospitals(h);
      setCities(c);
    } catch { } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (hospitals.length === 0) return;
    if (initialSymptoms.length > 0) {
      runAISearch(initialSymptoms);
    } else {
      rankHospitals(hospitals, [], null);
    }
  }, [hospitals]);

  async function runAISearch(symptoms: string[]) {
    setAnalyzing(true);
    try {
      const ai = await analyzeSymptoms(symptoms);
      setAnalysis(ai);
      rankHospitals(hospitals, ai.specialties, ai);
    } catch {
      rankHospitals(hospitals, [], null);
    } finally {
      setAnalyzing(false);
    }
  }

  function filterByCity(hospList: Hospital[]) {
    if (showAllCities || !appUser?.cityId) return hospList;
    return hospList.filter(h => h.cityId === appUser.cityId);
  }

  async function rankHospitals(hospList: Hospital[], specialties: string[], ai: GeminiAnalysis | null) {
    const cityFiltered = filterByCity(hospList);
    const scored: ScoredHospital[] = cityFiltered.map(h => {
      const beds = (h as any).beds;
      const bedsAvailable = beds
        ? (beds.general.total - beds.general.occupied) +
          (beds.icu.total - beds.icu.occupied) +
          (beds.emergency.total - beds.emergency.occupied)
        : 0;
      const score = scoreHospital(h.specialties, specialties, bedsAvailable, 0);
      return { ...h, score, bedsAvailable, analysis: ai ?? undefined };
    });
    setResults(scored.sort((a, b) => b.score - a.score));
  }

  useEffect(() => {
    if (hospitals.length > 0) rankHospitals(hospitals, analysis ? analysis.specialties : [], analysis);
  }, [showAllCities, hospitals, analysis]);

  function handleSearch() {
    if (searchText.trim()) {
      const filtered = hospitals.filter(h =>
        h.name.toLowerCase().includes(searchText.toLowerCase()) ||
        h.specialties.some(s => s.toLowerCase().includes(searchText.toLowerCase()))
      );
      rankHospitals(filtered, [], null);
    } else {
      rankHospitals(hospitals, [], null);
    }
  }

  if (loading) return <Loading message="Loading hospitals…" />;

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Search hospitals, specialties…"
            placeholderTextColor={COLORS.textMuted}
            returnKeyType="search"
            onSubmitEditing={handleSearch}
            autoFocus={!initialSymptoms.length}
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => { setSearchText(''); rankHospitals(hospitals, [], null); }}>
              <Text style={styles.clearText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {appUser?.cityId && (
        <TouchableOpacity style={styles.cityToggle} onPress={() => setShowAllCities(p => !p)}>
          <Text style={styles.cityToggleText}>
            {showAllCities ? '🌐 All cities' : `📍 ${cities.find(c => c.id === appUser.cityId)?.name ?? 'Your city'}`}
          </Text>
          <Text style={styles.cityToggleSwitch}>{showAllCities ? 'Show my city only' : 'Show all cities'}</Text>
        </TouchableOpacity>
      )}

      {analyzing && (
        <View style={styles.aiBanner}>
          <ActivityIndicator size="small" color={COLORS.primary} />
          <Text style={styles.aiText}>Analysing symptoms with AI…</Text>
        </View>
      )}
      {analysis && !analyzing && (
        <View style={styles.aiResult}>
          <Text style={styles.aiLabel}>🤖 AI Analysis</Text>
          <Text style={styles.aiSummary}>{analysis.summary}</Text>
          <View style={styles.aiRow}>
            <View style={[styles.urgencyBadge, urgencyColor(analysis.urgency)]}>
              <Text style={styles.urgencyText}>{analysis.urgency.toUpperCase()} URGENCY</Text>
            </View>
            {analysis.specialties.slice(0, 2).map(s => (
              <View key={s} style={styles.specBadge}>
                <Text style={styles.specBadgeText}>{s}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        <Text style={styles.resultCount}>{results.length} hospital{results.length !== 1 ? 's' : ''} found</Text>
        {results.map((h, i) => {
          const city = cities.find(c => c.id === h.cityId);
          return (
            <TouchableOpacity
              key={h.id}
              style={[styles.card, SHADOW.sm, i === 0 && styles.topCard]}
              onPress={() => router.push(`/(patient)/hospital/${h.id}`)}
            >
              {i === 0 && analysis && (
                <View style={styles.bestBadge}>
                  <Text style={styles.bestText}>⭐ Best Match</Text>
                </View>
              )}
              <View style={styles.cardTop}>
                <View style={styles.iconBox}>
                  <Text style={{ fontSize: 22 }}>🏥</Text>
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.hospName}>{h.name}</Text>
                  <Text style={styles.hospCity}>{city?.name ?? ''}</Text>
                  <Text style={styles.hospAddress} numberOfLines={1}>{h.address}</Text>
                </View>
                <View style={styles.score}>
                  <Text style={styles.scoreVal}>{h.score}</Text>
                  <Text style={styles.scoreLbl}>score</Text>
                </View>
              </View>
              <View style={styles.cardBottom}>
                <View style={[styles.bedBadge, { backgroundColor: h.bedsAvailable > 0 ? COLORS.success + '18' : COLORS.error + '18' }]}>
                  <Text style={[styles.bedText, { color: h.bedsAvailable > 0 ? COLORS.success : COLORS.error }]}>
                    🛏️ {h.bedsAvailable} beds free
                  </Text>
                </View>
                {h.specialties.slice(0, 2).map(s => (
                  <View key={s} style={styles.specChip}>
                    <Text style={styles.specChipText}>{s}</Text>
                  </View>
                ))}
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

function urgencyColor(u: string) {
  switch (u) {
    case 'emergency': return { backgroundColor: COLORS.error + '20' };
    case 'high': return { backgroundColor: COLORS.warning + '20' };
    case 'medium': return { backgroundColor: COLORS.info + '20' };
    default: return { backgroundColor: COLORS.success + '20' };
  }
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', padding: SPACING.md, paddingTop: SPACING.xl + 10, backgroundColor: COLORS.primary, gap: SPACING.sm },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 30, color: COLORS.white, lineHeight: 30 },
  searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, borderRadius: RADIUS.lg, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, gap: SPACING.sm },
  searchIcon: { fontSize: 16 },
  searchInput: { flex: 1, ...FONTS.regular, fontSize: 14, color: COLORS.text },
  clearText: { fontSize: 14, color: COLORS.textMuted },
  aiBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primaryLight, padding: SPACING.md, gap: SPACING.sm },
  aiText: { ...FONTS.medium, fontSize: 13, color: COLORS.primary },
  aiResult: { backgroundColor: COLORS.primaryLight, padding: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  aiLabel: { ...FONTS.semibold, fontSize: 12, color: COLORS.primary, marginBottom: 4 },
  aiSummary: { ...FONTS.regular, fontSize: 13, color: COLORS.text, marginBottom: SPACING.sm },
  aiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  urgencyBadge: { borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 3 },
  urgencyText: { ...FONTS.bold, fontSize: 10, color: COLORS.text, letterSpacing: 0.5 },
  specBadge: { backgroundColor: COLORS.white, borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 3 },
  specBadgeText: { ...FONTS.medium, fontSize: 11, color: COLORS.primary },
  list: { padding: SPACING.lg, paddingBottom: SPACING.xxl },
  resultCount: { ...FONTS.medium, fontSize: 13, color: COLORS.textSecondary, marginBottom: SPACING.md },
  card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.sm, borderWidth: 1, borderColor: COLORS.border, borderLeftWidth: 4, borderLeftColor: COLORS.primaryMid },
  topCard: { borderColor: COLORS.primary, borderWidth: 2, borderLeftWidth: 5, borderLeftColor: COLORS.primary },
  bestBadge: { backgroundColor: COLORS.primary, borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 3, alignSelf: 'flex-start', marginBottom: SPACING.sm },
  bestText: { ...FONTS.bold, fontSize: 11, color: COLORS.white, letterSpacing: 0.3 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: SPACING.sm },
  iconBox: { width: 48, height: 48, borderRadius: RADIUS.md, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center', marginRight: SPACING.md },
  cardInfo: { flex: 1 },
  hospName: { ...FONTS.semibold, fontSize: 15, color: COLORS.text },
  hospCity: { ...FONTS.regular, fontSize: 12, color: COLORS.primary, marginTop: 2 },
  hospAddress: { ...FONTS.regular, fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  score: { alignItems: 'center' },
  scoreVal: { ...FONTS.bold, fontSize: 22, color: COLORS.primary },
  scoreLbl: { ...FONTS.regular, fontSize: 10, color: COLORS.textMuted },
  cardBottom: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  bedBadge: { borderRadius: RADIUS.sm, paddingHorizontal: 8, paddingVertical: 3 },
  bedText: { ...FONTS.medium, fontSize: 12 },
  specChip: { backgroundColor: COLORS.primaryLight, borderRadius: RADIUS.sm, paddingHorizontal: 8, paddingVertical: 3 },
  specChipText: { ...FONTS.regular, fontSize: 11, color: COLORS.primary },
  cityToggle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, backgroundColor: COLORS.primaryLight, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  cityToggleText: { ...FONTS.semibold, fontSize: 13, color: COLORS.primary },
  cityToggleSwitch: { ...FONTS.regular, fontSize: 12, color: COLORS.primary, textDecorationLine: 'underline' },
});
