import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { Hospital, HospitalBeds } from '../../types';
import Loading from '../../components/ui/Loading';
import { COLORS, FONTS, RADIUS, SHADOW, SPACING } from '../../constants/theme';

interface DashStats {
  bedsAvailable: number;
  bedsTotal: number;
  bedsOccupied: number;
  totalStaff: number;
}

export default function StaffDashboard() {
  const { appUser, logout } = useAuth();
  const router = useRouter();

  const [stats, setStats] = useState<DashStats>({
    bedsAvailable: 0, bedsTotal: 0, bedsOccupied: 0, totalStaff: 0,
  });
  const [hospital, setHospital] = useState<Hospital | null>(null);
  const [beds, setBeds] = useState<HospitalBeds | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const hospitalId = appUser?.hospitalId ?? '';

  const load = useCallback(async () => {
    if (!hospitalId) return;
    try {
      const [hosp, bedData, staffList] = await Promise.all([
        api.get<Hospital>(`/hospitals/${hospitalId}`),
        api.get<HospitalBeds>(`/hospitals/${hospitalId}/beds`),
        api.get<any[]>(`/staff/${hospitalId}`),
      ]);

      setHospital(hosp);
      setBeds(bedData);

      const total = bedData.general.total + bedData.icu.total + bedData.emergency.total;
      const occupied = bedData.general.occupied + bedData.icu.occupied + bedData.emergency.occupied;

      setStats({
        bedsTotal: total,
        bedsAvailable: total - occupied,
        bedsOccupied: occupied,
        totalStaff: staffList.length,
      });
    } catch { } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [hospitalId]);

  useEffect(() => { load(); }, [load]);

  function confirmLogout() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  }

  const occupancyPct = stats.bedsTotal > 0
    ? Math.round((stats.bedsOccupied / stats.bedsTotal) * 100)
    : 0;

  if (loading) return <Loading message="Loading dashboard…" />;

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); load(); }}
          tintColor={COLORS.white}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerDec1} />
        <View style={styles.headerDec2} />
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>{timeOfDay()}</Text>
            <Text style={styles.name}>{appUser?.name}</Text>
          </View>
          <View style={styles.headerRight}>
            <View style={[styles.roleBadge, appUser?.role === 'hospital_admin' && styles.adminBadge]}>
              <Text style={[styles.roleText, appUser?.role === 'hospital_admin' && styles.adminText]}>
                {appUser?.role === 'hospital_admin' ? '⭐ Admin' : '👤 Staff'}
              </Text>
            </View>
            <TouchableOpacity onPress={confirmLogout} style={styles.logoutBtn}>
              <Text style={styles.logoutText}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        </View>

        {hospital && (
          <View style={styles.hospBanner}>
            <Text style={styles.hospBannerIcon}>🏥</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.hospBannerName}>{hospital.name}</Text>
              <Text style={styles.hospBannerSub}>{hospital.specialties?.length ?? 0} specialties</Text>
            </View>
            <View style={[styles.statusDot, { backgroundColor: COLORS.success }]} />
          </View>
        )}
      </View>

      {/* Bed stats */}
      <Text style={styles.sectionTitle}>Bed Occupancy</Text>
      <View style={[styles.occupancyCard, SHADOW.sm]}>
        <View style={styles.occupancyTop}>
          <View>
            <Text style={styles.occupancyPct}>{occupancyPct}%</Text>
            <Text style={styles.occupancyLabel}>Occupied</Text>
          </View>
          <View style={styles.occupancyRight}>
            <OccupancyStat value={stats.bedsAvailable} label="Available" color={COLORS.success} />
            <OccupancyStat value={stats.bedsOccupied} label="Occupied" color={COLORS.error} />
            <OccupancyStat value={stats.bedsTotal} label="Total" color={COLORS.textSecondary} />
          </View>
        </View>
        {/* Progress bar */}
        <View style={styles.progressBg}>
          <View style={[styles.progressFill, { width: `${occupancyPct}%` as any }]} />
        </View>
      </View>

      {/* Bed type breakdown */}
      {beds && (
        <>
          <Text style={styles.sectionTitle}>By Bed Type</Text>
          <View style={styles.bedGrid}>
            <BedCard
              type="General"
              icon="🛏️"
              available={beds.general.total - beds.general.occupied}
              total={beds.general.total}
              color={COLORS.info}
            />
            <BedCard
              type="ICU"
              icon="🫀"
              available={beds.icu.total - beds.icu.occupied}
              total={beds.icu.total}
              color={COLORS.error}
            />
            <BedCard
              type="Emergency"
              icon="🚨"
              available={beds.emergency.total - beds.emergency.occupied}
              total={beds.emergency.total}
              color={COLORS.warning}
            />
          </View>
        </>
      )}

      {/* Team stat */}
      <Text style={styles.sectionTitle}>Team</Text>
      <View style={[styles.teamCard, SHADOW.sm]}>
        <View style={styles.teamIconWrap}>
          <Text style={styles.teamIcon}>👥</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.teamCount}>{stats.totalStaff}</Text>
          <Text style={styles.teamLabel}>Staff members</Text>
        </View>
        <View style={styles.teamBadge}>
          <Text style={styles.teamBadgeText}>Active</Text>
        </View>
      </View>
    </ScrollView>
  );
}

function OccupancyStat({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <View style={styles.occStat}>
      <Text style={[styles.occStatVal, { color }]}>{value}</Text>
      <Text style={styles.occStatLabel}>{label}</Text>
    </View>
  );
}

function BedCard({ type, icon, available, total, color }: {
  type: string; icon: string; available: number; total: number; color: string;
}) {
  const pct = total > 0 ? Math.round(((total - available) / total) * 100) : 0;
  return (
    <View style={[styles.bedCard, SHADOW.sm]}>
      <View style={[styles.bedCardAccent, { backgroundColor: color + '20' }]}>
        <Text style={styles.bedCardIcon}>{icon}</Text>
      </View>
      <Text style={styles.bedCardType}>{type}</Text>
      <Text style={[styles.bedCardCount, { color }]}>{available}</Text>
      <Text style={styles.bedCardSub}>of {total} free</Text>
      <View style={styles.bedProgressBg}>
        <View style={[styles.bedProgressFill, { width: `${pct}%` as any, backgroundColor: color }]} />
      </View>
    </View>
  );
}

function timeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning ☀️';
  if (h < 17) return 'Good Afternoon 🌤️';
  return 'Good Evening 🌙';
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingBottom: SPACING.xxl },

  header: {
    backgroundColor: COLORS.primary,
    padding: SPACING.lg,
    paddingTop: SPACING.xxl + 10,
    paddingBottom: SPACING.xl,
    overflow: 'hidden',
  },
  headerDec1: {
    position: 'absolute', width: 180, height: 180, borderRadius: 90,
    backgroundColor: COLORS.white, opacity: 0.05,
    top: -60, right: -40,
  },
  headerDec2: {
    position: 'absolute', width: 100, height: 100, borderRadius: 50,
    backgroundColor: COLORS.white, opacity: 0.06,
    bottom: 20, left: -20,
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: SPACING.lg },
  greeting: { ...FONTS.regular, fontSize: 13, color: COLORS.white + 'AA' },
  name: { ...FONTS.bold, fontSize: 22, color: COLORS.white, marginTop: 2 },
  headerRight: { alignItems: 'flex-end', gap: 8 },
  roleBadge: {
    backgroundColor: COLORS.white + '20', borderRadius: RADIUS.full,
    paddingHorizontal: 12, paddingVertical: 5,
  },
  adminBadge: { backgroundColor: COLORS.warning + '30' },
  roleText: { ...FONTS.semibold, fontSize: 12, color: COLORS.white },
  adminText: { color: COLORS.warning },
  logoutBtn: {
    backgroundColor: COLORS.white + '15', borderRadius: RADIUS.sm,
    paddingHorizontal: 12, paddingVertical: 5,
    borderWidth: 1, borderColor: COLORS.white + '30',
  },
  logoutText: { ...FONTS.medium, fontSize: 12, color: COLORS.white + 'CC' },

  hospBanner: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.white + '15', borderRadius: RADIUS.md,
    padding: SPACING.md, borderWidth: 1, borderColor: COLORS.white + '25',
  },
  hospBannerIcon: { fontSize: 22 },
  hospBannerName: { ...FONTS.semibold, fontSize: 15, color: COLORS.white },
  hospBannerSub: { ...FONTS.regular, fontSize: 12, color: COLORS.white + 'AA', marginTop: 2 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },

  sectionTitle: {
    ...FONTS.semibold, fontSize: 14, color: COLORS.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.5,
    marginHorizontal: SPACING.lg, marginTop: SPACING.lg, marginBottom: SPACING.sm,
  },

  occupancyCard: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.xl,
    marginHorizontal: SPACING.lg, padding: SPACING.lg,
    borderWidth: 1, borderColor: COLORS.border,
  },
  occupancyTop: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md },
  occupancyPct: { ...FONTS.bold, fontSize: 42, color: COLORS.text },
  occupancyLabel: { ...FONTS.regular, fontSize: 12, color: COLORS.textSecondary },
  occupancyRight: { flex: 1, flexDirection: 'row', justifyContent: 'space-around' },
  occStat: { alignItems: 'center' },
  occStatVal: { ...FONTS.bold, fontSize: 22 },
  occStatLabel: { ...FONTS.regular, fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  progressBg: { height: 8, backgroundColor: COLORS.border, borderRadius: RADIUS.full, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: RADIUS.full },

  bedGrid: {
    flexDirection: 'row', marginHorizontal: SPACING.lg, gap: SPACING.sm,
  },
  bedCard: {
    flex: 1, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    padding: SPACING.md, alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  bedCardAccent: { width: 44, height: 44, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.sm },
  bedCardIcon: { fontSize: 22 },
  bedCardType: { ...FONTS.medium, fontSize: 11, color: COLORS.textSecondary, marginBottom: 4 },
  bedCardCount: { ...FONTS.bold, fontSize: 24 },
  bedCardSub: { ...FONTS.regular, fontSize: 10, color: COLORS.textMuted, marginTop: 2, marginBottom: SPACING.sm },
  bedProgressBg: { width: '100%', height: 4, backgroundColor: COLORS.border, borderRadius: RADIUS.full, overflow: 'hidden' },
  bedProgressFill: { height: '100%', borderRadius: RADIUS.full },

  teamCard: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    marginHorizontal: SPACING.lg, padding: SPACING.md,
    borderWidth: 1, borderColor: COLORS.border,
  },
  teamIconWrap: {
    width: 52, height: 52, borderRadius: RADIUS.md,
    backgroundColor: COLORS.secondary + '15',
    alignItems: 'center', justifyContent: 'center',
  },
  teamIcon: { fontSize: 26 },
  teamCount: { ...FONTS.bold, fontSize: 28, color: COLORS.text },
  teamLabel: { ...FONTS.regular, fontSize: 12, color: COLORS.textSecondary },
  teamBadge: {
    backgroundColor: COLORS.success + '15', borderRadius: RADIUS.full,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  teamBadgeText: { ...FONTS.medium, fontSize: 12, color: COLORS.success },
});
