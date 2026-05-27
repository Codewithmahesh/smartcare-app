import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, RefreshControl,
} from 'react-native';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { Token, Department, QueueStatus } from '../../types';
import Loading from '../../components/ui/Loading';
import EmptyState from '../../components/ui/EmptyState';
import Button from '../../components/ui/Button';
import { COLORS, FONTS, RADIUS, SHADOW, SPACING } from '../../constants/theme';

export default function QueueScreen() {
  const { appUser, role, logout } = useAuth();

  function confirmLogout() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  }

  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDept, setSelectedDept] = useState<Department | null>(null);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [queueStatus, setQueueStatus] = useState<QueueStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const hospitalId = appUser?.hospitalId ?? '';

  const loadQueue = useCallback(async (dept: Department | null) => {
    if (!hospitalId || !dept) return;
    try {
      const [toks, q] = await Promise.all([
        api.get<Token[]>(`/tokens/hospital/${hospitalId}/dept/${dept.id}`),
        api.get<QueueStatus>(`/queue/${hospitalId}/${dept.id}`, false),
      ]);
      setTokens(toks.filter(t => t.status === 'waiting').sort((a, b) => a.tokenNumber - b.tokenNumber));
      setQueueStatus(q);
    } catch { }
  }, [hospitalId]);

  useEffect(() => {
    if (!hospitalId) return;
    (async () => {
      try {
        const depts = await api.get<Department[]>(`/hospitals/${hospitalId}/departments`);
        setDepartments(depts);
        const initial = appUser?.deptId ? (depts.find(d => d.id === appUser.deptId) ?? depts[0]) : depts[0];
        setSelectedDept(initial ?? null);
        if (initial) await loadQueue(initial);
      } catch { } finally {
        setLoading(false);
      }
    })();
  }, [hospitalId]);

  useEffect(() => {
    if (!selectedDept) return;
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => loadQueue(selectedDept), 5000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [selectedDept, loadQueue]);

  async function callNext() {
    if (!tokens.length) { Alert.alert('Queue Empty', 'No more patients in the queue.'); return; }
    if (!selectedDept) return;
    setActionLoading(true);
    try {
      await api.post(`/queue/${hospitalId}/${selectedDept.id}/next`, {});
      await loadQueue(selectedDept);
    } catch { Alert.alert('Error', 'Failed to call next token.'); }
    finally { setActionLoading(false); }
  }

  async function skipToken(token: Token) {
    Alert.alert('Skip Patient', `Move token #${token.tokenNumber} to end of queue?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Skip', style: 'destructive',
        onPress: async () => {
          try {
            await api.put(`/tokens/${token.id}/status`, { status: 'cancelled' });
            if (selectedDept) await loadQueue(selectedDept);
          } catch { Alert.alert('Error', 'Failed to skip token.'); }
        },
      },
    ]);
  }

  async function toggleQueue() {
    if (!selectedDept) return;
    try {
      await api.put(`/queue/${hospitalId}/${selectedDept.id}`, { isOpen: !queueStatus?.isOpen });
      await loadQueue(selectedDept);
    } catch { Alert.alert('Error', 'Failed to update queue status.'); }
  }

  if (loading) return <Loading message="Loading queue…" />;

  const isOpen = queueStatus?.isOpen ?? false;

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Queue</Text>
          {selectedDept && <Text style={styles.headerDept}>{selectedDept.name}</Text>}
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            onPress={toggleQueue}
            style={[styles.statusBtn, isOpen ? styles.statusBtnOpen : styles.statusBtnClosed]}
          >
            <View style={[styles.statusDot, { backgroundColor: isOpen ? COLORS.success : COLORS.error }]} />
            <Text style={[styles.statusBtnText, { color: isOpen ? COLORS.success : COLORS.error }]}>
              {isOpen ? 'Open' : 'Closed'}
            </Text>
          </TouchableOpacity>
          {role === 'staff' && (
            <TouchableOpacity onPress={confirmLogout} style={styles.logoutBtn}>
              <Text style={styles.logoutText}>Sign Out</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Department tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.deptScroll}
        contentContainerStyle={styles.deptScrollContent}
      >
        {departments.map(d => (
          <TouchableOpacity
            key={d.id}
            onPress={() => { setSelectedDept(d); loadQueue(d); }}
            style={[styles.deptChip, selectedDept?.id === d.id && styles.deptChipActive]}
          >
            <Text style={[styles.deptChipText, selectedDept?.id === d.id && styles.deptChipTextActive]}>
              {d.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, SHADOW.xs]}>
          <Text style={styles.statVal}>{queueStatus?.currentToken ?? '—'}</Text>
          <Text style={styles.statLabel}>Now Serving</Text>
        </View>
        <View style={[styles.statCard, SHADOW.xs, styles.statCardAccent]}>
          <Text style={[styles.statVal, { color: COLORS.warning }]}>{tokens.length}</Text>
          <Text style={styles.statLabel}>Waiting</Text>
        </View>
        <View style={[styles.statCard, SHADOW.xs]}>
          <Text style={[styles.statVal, { color: COLORS.info }]}>
            {queueStatus?.estimatedWaitMinutes ?? 0}
          </Text>
          <Text style={styles.statLabel}>Est. Wait (min)</Text>
        </View>
      </View>

      {/* Call Next button */}
      <View style={styles.actionRow}>
        <Button
          label="📣  Call Next Patient"
          onPress={callNext}
          loading={actionLoading}
          disabled={!isOpen || tokens.length === 0}
          style={styles.callBtn}
          size="lg"
        />
      </View>

      {/* Token list */}
      <ScrollView
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      >
        {tokens.length === 0 ? (
          <EmptyState icon="✅" title="Queue is empty" message="No patients waiting right now." />
        ) : (
          tokens.map((token, i) => (
            <View
              key={token.id}
              style={[
                styles.tokenCard,
                SHADOW.sm,
                i === 0 && styles.nextCard,
              ]}
            >
              <View style={[styles.tokenNumWrap, i === 0 && styles.tokenNumWrapNext]}>
                <Text style={[styles.tokenNum, i === 0 && { color: COLORS.primary }]}>
                  #{token.tokenNumber}
                </Text>
                {i === 0 && (
                  <View style={styles.nextBadge}>
                    <Text style={styles.nextBadgeText}>NEXT</Text>
                  </View>
                )}
              </View>

              <View style={styles.tokenInfo}>
                <Text style={styles.patName}>{token.userName}</Text>
                <Text style={styles.patDept}>{token.deptName}</Text>
                <Text style={styles.patTime}>{formatTime(token.createdAt)}</Text>
              </View>

              <TouchableOpacity
                onPress={() => skipToken(token)}
                style={styles.skipBtn}
              >
                <Text style={styles.skipText}>Skip</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
    padding: SPACING.lg, paddingTop: SPACING.xxl + 10,
    backgroundColor: COLORS.primary,
  },
  headerTitle: { ...FONTS.bold, fontSize: 24, color: COLORS.white },
  headerDept: { ...FONTS.regular, fontSize: 13, color: COLORS.white + 'BB', marginTop: 2 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingBottom: 2 },
  statusBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  statusBtnOpen: { backgroundColor: COLORS.success + '20', borderColor: COLORS.success + '50' },
  statusBtnClosed: { backgroundColor: COLORS.error + '20', borderColor: COLORS.error + '50' },
  statusDot: { width: 7, height: 7, borderRadius: 3.5 },
  statusBtnText: { ...FONTS.semibold, fontSize: 13 },
  logoutBtn: {
    backgroundColor: COLORS.white + '15', borderRadius: RADIUS.sm,
    paddingHorizontal: 10, paddingVertical: 7,
    borderWidth: 1, borderColor: COLORS.white + '30',
  },
  logoutText: { ...FONTS.medium, fontSize: 12, color: COLORS.white + 'CC' },

  deptScroll: { backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  deptScrollContent: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, gap: SPACING.sm },
  deptChip: {
    borderWidth: 1.5, borderColor: COLORS.border,
    borderRadius: RADIUS.full, paddingHorizontal: 16, paddingVertical: 7,
    backgroundColor: COLORS.surface,
  },
  deptChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  deptChipText: { ...FONTS.medium, fontSize: 13, color: COLORS.textSecondary },
  deptChipTextActive: { color: COLORS.white },

  statsRow: {
    flexDirection: 'row', padding: SPACING.md, gap: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  statCard: {
    flex: 1, backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.lg, padding: SPACING.md,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.border,
    minHeight: 72,
  },
  statCardAccent: {
    backgroundColor: COLORS.warning + '10',
    borderColor: COLORS.warning + '40',
  },
  statVal: { ...FONTS.bold, fontSize: 28, color: COLORS.text },
  statLabel: { ...FONTS.regular, fontSize: 11, color: COLORS.textSecondary, marginTop: 2, textAlign: 'center' },

  actionRow: { padding: SPACING.md, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  callBtn: { width: '100%' },

  list: { padding: SPACING.lg, gap: SPACING.sm, paddingBottom: SPACING.xxl, flexGrow: 1 },
  tokenCard: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    padding: SPACING.md, flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  nextCard: { borderColor: COLORS.primary, borderWidth: 2, borderLeftWidth: 4 },
  tokenNumWrap: {
    alignItems: 'center', justifyContent: 'center',
    width: 60, gap: 4,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md, paddingVertical: SPACING.sm,
    marginRight: SPACING.md,
  },
  tokenNumWrapNext: { backgroundColor: COLORS.primaryLight },
  tokenNum: { ...FONTS.bold, fontSize: 20, color: COLORS.textSecondary },
  nextBadge: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.xs,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  nextBadgeText: { ...FONTS.bold, fontSize: 8, color: COLORS.white, letterSpacing: 0.5 },
  tokenInfo: { flex: 1 },
  patName: { ...FONTS.semibold, fontSize: 14, color: COLORS.text },
  patDept: { ...FONTS.regular, fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  patTime: { ...FONTS.regular, fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  skipBtn: {
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.error + '12',
    borderWidth: 1, borderColor: COLORS.error + '30',
  },
  skipText: { ...FONTS.semibold, fontSize: 13, color: COLORS.error },
});
