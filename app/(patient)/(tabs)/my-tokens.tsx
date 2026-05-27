import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../../../lib/api';
import { useAuth } from '../../../context/AuthContext';
import { Token, TokenStatus } from '../../../types';
import Loading from '../../../components/ui/Loading';
import EmptyState from '../../../components/ui/EmptyState';
import { COLORS, FONTS, RADIUS, SHADOW, SPACING } from '../../../constants/theme';

function todayStr() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

function formatApptDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const date = new Date(y, m - 1, d);
  return `${days[date.getDay()]}, ${d} ${months[m - 1]}`;
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

const STATUS_CONFIG: Record<TokenStatus, { icon: string; color: string; label: string }> = {
  waiting: { icon: '⏳', color: COLORS.warning, label: 'Waiting' },
  called: { icon: '📣', color: COLORS.primary, label: 'Your Turn' },
  completed: { icon: '✅', color: COLORS.success, label: 'Done' },
  cancelled: { icon: '❌', color: COLORS.error, label: 'Cancelled' },
};

type TabType = 'active' | 'history';

export default function MyTokensScreen() {
  const { appUser } = useAuth();
  const router = useRouter();

  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabType>('active');
  const [refreshing, setRefreshing] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await api.get<Token[]>('/tokens/my');
      setTokens(data);
    } catch { } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    pollRef.current = setInterval(load, 5000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [load]);

  const activeTokens = tokens.filter(t => t.status === 'waiting' || t.status === 'called');
  const historyTokens = tokens.filter(t => t.status === 'completed' || t.status === 'cancelled');
  const displayed = tab === 'active' ? activeTokens : historyTokens;

  if (loading) return <Loading message="Loading tokens…" />;

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>My Tokens</Text>
      </View>

      <View style={styles.tabs}>
        {([['active', 'Active', activeTokens.length], ['history', 'History', historyTokens.length]] as const).map(([key, label, count]) => (
          <TouchableOpacity
            key={key}
            onPress={() => setTab(key)}
            style={[styles.tab, tab === key && styles.tabActive]}
          >
            <Text style={[styles.tabText, tab === key && styles.tabTextActive]}>
              {label} {count > 0 && `(${count})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={COLORS.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {displayed.length === 0 ? (
          <EmptyState
            icon={tab === 'active' ? '🎟️' : '📋'}
            title={tab === 'active' ? 'No active tokens' : 'No past tokens'}
            message={tab === 'active' ? 'Book a token from any hospital to see it here.' : 'Your completed and cancelled tokens will appear here.'}
            action={tab === 'active' ? { label: 'Find Hospitals', onPress: () => router.push('/(patient)/search') } : undefined}
          />
        ) : (
          displayed.map(token => {
            const sc = STATUS_CONFIG[token.status];
            return (
              <TouchableOpacity
                key={token.id}
                style={[styles.card, SHADOW.sm, token.status === 'called' && styles.cardCalled]}
                onPress={() => router.push(`/(patient)/token/${token.id}`)}
              >
                <View style={[styles.tokenBadge, { backgroundColor: sc.color + '18' }]}>
                  <Text style={styles.tokenIcon}>{sc.icon}</Text>
                  <Text style={[styles.tokenNum, { color: sc.color }]}>#{token.tokenNumber}</Text>
                </View>
                <View style={styles.info}>
                  <Text style={styles.hospName}>{token.hospitalName}</Text>
                  <Text style={styles.deptName}>{token.deptName}</Text>
                  {token.appointmentDate && token.appointmentDate !== todayStr() ? (
                    <Text style={styles.apptDate}>📅 {formatApptDate(token.appointmentDate)}</Text>
                  ) : (
                    <Text style={styles.date}>{formatDate(token.createdAt)}</Text>
                  )}
                </View>
                <View style={styles.right}>
                  <View style={[styles.statusPill, { backgroundColor: sc.color + '18' }]}>
                    <Text style={[styles.statusText, { color: sc.color }]}>{sc.label}</Text>
                  </View>
                  <Text style={styles.chevron}>›</Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  header: { padding: SPACING.lg, paddingTop: SPACING.xl + 10, backgroundColor: COLORS.primary },
  title: { ...FONTS.bold, fontSize: 24, color: COLORS.white },
  tabs: { flexDirection: 'row', backgroundColor: COLORS.primary, borderBottomWidth: 0 },
  tab: { flex: 1, paddingVertical: SPACING.md, alignItems: 'center', borderBottomWidth: 3, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: COLORS.white },
  tabText: { ...FONTS.medium, fontSize: 14, color: COLORS.white + '88' },
  tabTextActive: { color: COLORS.white, ...FONTS.semibold },
  list: { padding: SPACING.lg, gap: SPACING.sm, paddingBottom: SPACING.xxl, flexGrow: 1 },
  card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.md, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border, borderLeftWidth: 4, borderLeftColor: COLORS.primaryMid },
  cardCalled: { borderColor: COLORS.primary, borderWidth: 2, borderLeftWidth: 5, borderLeftColor: COLORS.primary },
  tokenBadge: { width: 60, height: 60, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center', marginRight: SPACING.md },
  tokenIcon: { fontSize: 18 },
  tokenNum: { ...FONTS.bold, fontSize: 16 },
  info: { flex: 1 },
  hospName: { ...FONTS.semibold, fontSize: 14, color: COLORS.text },
  deptName: { ...FONTS.regular, fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  date: { ...FONTS.regular, fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  apptDate: { ...FONTS.medium, fontSize: 11, color: COLORS.primary, marginTop: 2 },
  right: { alignItems: 'flex-end', gap: SPACING.xs },
  statusPill: { borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { ...FONTS.medium, fontSize: 11 },
  chevron: { fontSize: 20, color: COLORS.textMuted },
});
