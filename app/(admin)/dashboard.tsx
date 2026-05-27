import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import Loading from '../../components/ui/Loading';
import StatCard from '../../components/ui/StatCard';
import Card from '../../components/ui/Card';
import { COLORS, FONTS, SPACING } from '../../constants/theme';

interface Stats {
  totalCities: number;
  liveCities: number;
  totalHospitals: number;
  activeHospitals: number;
  totalPatients: number;
  totalWaitlist: number;
}

export default function AdminDashboard() {
  const { appUser, logout } = useAuth();

  function confirmLogout() {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  }
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.get<Stats>('/admin/stats');
      setStats(data);
    } catch { } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <Loading message="Loading dashboard…" />;

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={COLORS.primary} />}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.topBar}>
        <View>
          <Text style={styles.greeting}>Good {timeOfDay()} 👋</Text>
          <Text style={styles.name}>{appUser?.name ?? 'Super Admin'}</Text>
        </View>
        <View style={styles.topRight}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>SUPER ADMIN</Text>
          </View>
          <TouchableOpacity onPress={confirmLogout} style={styles.logoutBtn}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Platform Overview</Text>

      <View style={styles.grid}>
        <StatCard label="Total Cities" value={stats?.totalCities ?? 0} icon="🏙️" color={COLORS.info} />
        <StatCard label="Live Cities" value={stats?.liveCities ?? 0} icon="✅" color={COLORS.success} />
      </View>
      <View style={styles.grid}>
        <StatCard label="Hospitals" value={stats?.totalHospitals ?? 0} icon="🏥" color={COLORS.primary} />
        <StatCard label="Active" value={stats?.activeHospitals ?? 0} icon="🟢" color={COLORS.success} />
      </View>
      <View style={styles.grid}>
        <StatCard label="Registered Patients" value={stats?.totalPatients ?? 0} icon="👥" color={COLORS.secondary} />
        <StatCard label="Waitlist Signups" value={stats?.totalWaitlist ?? 0} icon="📋" color={COLORS.warning} />
      </View>

      <Card style={styles.infoCard}>
        <Text style={styles.infoTitle}>🛡️ Superadmin Panel</Text>
        <Text style={styles.infoText}>
          You manage all cities, hospitals, and platform access. Use the tabs below to add cities, register hospitals, and view waitlists.
        </Text>
      </Card>
    </ScrollView>
  );
}

function timeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return 'Morning';
  if (h < 17) return 'Afternoon';
  return 'Evening';
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.lg, paddingBottom: SPACING.xxl },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.xl, marginTop: SPACING.lg },
  greeting: { ...FONTS.regular, fontSize: 13, color: COLORS.textSecondary },
  name: { ...FONTS.bold, fontSize: 20, color: COLORS.text },
  topRight: { alignItems: 'flex-end', gap: 6 },
  badge: { backgroundColor: COLORS.primaryLight, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { ...FONTS.bold, fontSize: 10, color: COLORS.primary, letterSpacing: 0.8 },
  logoutBtn: { backgroundColor: COLORS.error + '15', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  logoutText: { ...FONTS.semibold, fontSize: 12, color: COLORS.error },
  sectionTitle: { ...FONTS.semibold, fontSize: 16, color: COLORS.text, marginBottom: SPACING.md },
  grid: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.sm },
  infoCard: { marginTop: SPACING.lg },
  infoTitle: { ...FONTS.semibold, fontSize: 15, color: COLORS.text, marginBottom: 6 },
  infoText: { ...FONTS.regular, fontSize: 13, color: COLORS.textSecondary, lineHeight: 20 },
});
