import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl,
} from 'react-native';
import { api } from '../../lib/api';
import { City, WaitlistEntry } from '../../types';
import Loading from '../../components/ui/Loading';
import EmptyState from '../../components/ui/EmptyState';
import { COLORS, FONTS, RADIUS, SHADOW, SPACING } from '../../constants/theme';

export default function WaitlistScreen() {
  const [cities, setCities] = useState<City[]>([]);
  const [waitlists, setWaitlists] = useState<Record<string, WaitlistEntry[]>>({});
  const [loading, setLoading] = useState(true);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadCities = useCallback(async () => {
    try {
      const cityList = await api.get<City[]>('/cities');
      setCities(cityList);
      if (cityList.length > 0 && !selectedCity) setSelectedCity(cityList[0].id);
    } catch { } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadWaitlist = useCallback(async (cityId: string) => {
    try {
      const entries = await api.get<WaitlistEntry[]>(`/waitlist/${cityId}`);
      setWaitlists(prev => ({ ...prev, [cityId]: entries }));
    } catch { }
  }, []);

  useEffect(() => { loadCities(); }, [loadCities]);

  useEffect(() => {
    if (selectedCity) loadWaitlist(selectedCity);
  }, [selectedCity, loadWaitlist]);

  const currentEntries = selectedCity ? (waitlists[selectedCity] ?? []) : [];
  const currentCity = cities.find(c => c.id === selectedCity);

  if (loading) return <Loading message="Loading waitlist…" />;

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>City Waitlists</Text>
        {currentCity && (
          <Text style={styles.count}>{currentEntries.length} signups</Text>
        )}
      </View>

      {cities.length === 0 ? (
        <EmptyState icon="📋" title="No cities yet" message="Add cities first to see waitlist signups." />
      ) : (
        <>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.tabRow}
            contentContainerStyle={styles.tabContent}
          >
            {cities.map(city => (
              <TouchableOpacity
                key={city.id}
                onPress={() => setSelectedCity(city.id)}
                style={[styles.tab, selectedCity === city.id && styles.tabActive]}
              >
                <Text style={[styles.tabText, selectedCity === city.id && styles.tabTextActive]}>
                  {city.name}
                </Text>
                {(waitlists[city.id]?.length ?? 0) > 0 && (
                  <View style={[styles.tabBadge, selectedCity === city.id && styles.tabBadgeActive]}>
                    <Text style={[styles.tabBadgeText, selectedCity === city.id && styles.tabBadgeTextActive]}>
                      {waitlists[city.id].length}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>

          <ScrollView
            contentContainerStyle={styles.list}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); if (selectedCity) loadWaitlist(selectedCity); setRefreshing(false); }} tintColor={COLORS.primary} />}
            showsVerticalScrollIndicator={false}
          >
            {currentEntries.length === 0 ? (
              <EmptyState icon="✉️" title="No signups yet" message={`No one has joined the waitlist for ${currentCity?.name ?? 'this city'} yet.`} />
            ) : (
              currentEntries.map((entry, i) => (
                <View key={entry.userId} style={[styles.card, SHADOW.sm]}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{entry.name?.[0]?.toUpperCase() ?? '?'}</Text>
                  </View>
                  <View style={styles.info}>
                    <Text style={styles.name}>{entry.name}</Text>
                    <Text style={styles.email}>{entry.email}</Text>
                    {entry.phone && <Text style={styles.phone}>{entry.phone}</Text>}
                    <Text style={styles.date}>Joined {formatDate(entry.joinedAt)}</Text>
                  </View>
                  <Text style={styles.rank}>#{i + 1}</Text>
                </View>
              ))
            )}
          </ScrollView>
        </>
      )}
    </View>
  );
}

function formatDate(ts: number) {
  if (!ts) return '';
  return new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: SPACING.lg, paddingTop: SPACING.xl + 10, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  title: { ...FONTS.bold, fontSize: 22, color: COLORS.text },
  count: { ...FONTS.medium, fontSize: 13, color: COLORS.textSecondary },
  tabRow: { backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border, maxHeight: 52 },
  tabContent: { paddingHorizontal: SPACING.lg, gap: SPACING.sm, alignItems: 'center', paddingVertical: SPACING.sm },
  tab: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 6, borderRadius: RADIUS.full, borderWidth: 1.5, borderColor: COLORS.border, gap: 6 },
  tabActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  tabText: { ...FONTS.medium, fontSize: 13, color: COLORS.text },
  tabTextActive: { color: COLORS.white },
  tabBadge: { backgroundColor: COLORS.border, borderRadius: RADIUS.full, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  tabBadgeActive: { backgroundColor: COLORS.white + '40' },
  tabBadgeText: { ...FONTS.bold, fontSize: 10, color: COLORS.text },
  tabBadgeTextActive: { color: COLORS.white },
  list: { padding: SPACING.lg, gap: SPACING.sm, paddingBottom: SPACING.xxl, flexGrow: 1 },
  card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.md, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  avatar: { width: 40, height: 40, borderRadius: RADIUS.full, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center', marginRight: SPACING.md },
  avatarText: { ...FONTS.bold, fontSize: 16, color: COLORS.primary },
  info: { flex: 1 },
  name: { ...FONTS.semibold, fontSize: 14, color: COLORS.text },
  email: { ...FONTS.regular, fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  phone: { ...FONTS.regular, fontSize: 12, color: COLORS.textSecondary },
  date: { ...FONTS.regular, fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  rank: { ...FONTS.bold, fontSize: 16, color: COLORS.textMuted },
});
