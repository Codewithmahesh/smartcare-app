import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '../../../lib/api';
import { Token, QueueStatus, Prescription } from '../../../types';
import Loading from '../../../components/ui/Loading';
import Button from '../../../components/ui/Button';
import { COLORS, FONTS, RADIUS, SHADOW, SPACING } from '../../../constants/theme';

let QRCode: any = null;
try { QRCode = require('react-native-qrcode-svg').default; } catch { }

export default function TokenDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [token, setToken] = useState<Token | null>(null);
  const [queueStatus, setQueueStatus] = useState<QueueStatus | null>(null);
  const [prescription, setPrescription] = useState<Prescription | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadToken = useCallback(async () => {
    if (!id) return;
    try {
      const t = await api.get<Token>(`/tokens/${id}`);
      setToken(t);
    } catch { }
  }, [id]);

  const loadQueue = useCallback(async (t: Token) => {
    if (!t.hospitalId || !t.deptId) return;
    try {
      const q = await api.get<QueueStatus>(`/queue/${t.hospitalId}/${t.deptId}`, false);
      setQueueStatus(q);
    } catch { }
  }, []);

  useEffect(() => {
    (async () => {
      if (!id) return;
      try {
        const t = await api.get<Token>(`/tokens/${id}`);
        setToken(t);
        await loadQueue(t);
        if (t.status === 'completed') {
          try {
            const rx = await api.get<Prescription>(`/prescriptions/${t.id}`);
            setPrescription(rx);
          } catch { }
        }
      } catch { } finally {
        setLoading(false);
      }
    })();

    pollRef.current = setInterval(async () => { await loadToken(); }, 5000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [id, loadToken]);

  useEffect(() => {
    if (token) loadQueue(token);
    if (token?.status === 'completed' && !prescription) {
      api.get<Prescription>(`/prescriptions/${token.id}`)
        .then(setPrescription)
        .catch(() => {});
    }
  }, [token, loadQueue]);

  async function cancelToken() {
    Alert.alert(
      'Cancel Token',
      'Are you sure? You will lose your place in the queue.',
      [
        { text: 'Keep Token', style: 'cancel' },
        {
          text: 'Cancel Token', style: 'destructive',
          onPress: async () => {
            setCancelling(true);
            try {
              await api.put(`/tokens/${id}/status`, { status: 'cancelled' });
              router.back();
            } catch {
              Alert.alert('Error', 'Failed to cancel token. Please try again.');
            } finally { setCancelling(false); }
          },
        },
      ],
    );
  }

  if (loading) return <Loading message="Loading token…" />;
  if (!token) return <Loading message="Token not found" />;

  const statusConfig = {
    waiting: { icon: '⏳', color: COLORS.warning, label: 'In Queue', bgColor: COLORS.warning + '15' },
    called: { icon: '📣', color: COLORS.primary, label: "Your Turn!", bgColor: COLORS.primary + '15' },
    completed: { icon: '✅', color: COLORS.success, label: 'Completed', bgColor: COLORS.success + '15' },
    cancelled: { icon: '❌', color: COLORS.error, label: 'Cancelled', bgColor: COLORS.error + '15' },
  }[token.status];

  const position = queueStatus && token.status === 'waiting'
    ? Math.max(token.tokenNumber - (queueStatus.currentToken ?? 0), 0)
    : null;
  const waitMin = position !== null ? position * 10 : null;

  const qrData = JSON.stringify({
    tokenId: token.id,
    tokenNumber: token.tokenNumber,
    hospital: token.hospitalName,
    dept: token.deptName,
    patient: token.userName,
  });

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Token Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Called banner */}
        {token.status === 'called' && (
          <View style={styles.calledBanner}>
            <Text style={styles.calledBannerIcon}>📣</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.calledBannerTitle}>It's Your Turn!</Text>
              <Text style={styles.calledBannerSub}>Please proceed to the {token.deptName} counter</Text>
            </View>
          </View>
        )}

        {/* Ticket card */}
        <View style={[styles.ticket, SHADOW.md, { borderColor: statusConfig.color + '40' }]}>
          {/* Ticket top */}
          <View style={styles.ticketTop}>
            <View style={[styles.statusPill, { backgroundColor: statusConfig.bgColor }]}>
              <Text style={styles.statusIcon}>{statusConfig.icon}</Text>
              <Text style={[styles.statusLabel, { color: statusConfig.color }]}>
                {statusConfig.label}
              </Text>
            </View>

            <Text style={styles.tokenNumLabel}>TOKEN NUMBER</Text>
            <Text style={[styles.tokenNum, { color: statusConfig.color }]}>
              #{token.tokenNumber}
            </Text>

            <View style={styles.hospDeptRow}>
              <Text style={styles.hospLabel}>{token.hospitalName}</Text>
              <View style={styles.deptPill}>
                <Text style={styles.deptPillText}>{token.deptName}</Text>
              </View>
            </View>
          </View>

          {/* Ticket perforations */}
          <View style={styles.perfRow}>
            <View style={styles.perfCutLeft} />
            <View style={styles.perfLine} />
            <View style={styles.perfCutRight} />
          </View>

          {/* Ticket bottom */}
          <View style={styles.ticketBottom}>
            <TicketRow label="Patient" value={token.userName} />
            <TicketRow label="Booked At" value={formatTime(token.createdAt)} />
          </View>
        </View>

        {/* Live queue stats */}
        {token.status === 'waiting' && queueStatus && (
          <View style={[styles.queueCard, SHADOW.sm]}>
            <View style={styles.queueHeader}>
              <View style={styles.liveDot} />
              <Text style={styles.queueTitle}>Live Queue</Text>
            </View>
            <View style={styles.queueRow}>
              <View style={styles.queueStat}>
                <Text style={styles.queueVal}>{queueStatus.currentToken ?? '—'}</Text>
                <Text style={styles.queueLbl}>Now Serving</Text>
              </View>
              <View style={styles.queueDivider} />
              <View style={styles.queueStat}>
                <Text style={[styles.queueVal, { color: COLORS.primary }]}>
                  {position !== null ? (position <= 0 ? 'Next!' : position) : '—'}
                </Text>
                <Text style={styles.queueLbl}>Your Position</Text>
              </View>
              <View style={styles.queueDivider} />
              <View style={styles.queueStat}>
                <Text style={[styles.queueVal, { color: COLORS.info }]}>{waitMin ?? '—'}</Text>
                <Text style={styles.queueLbl}>Est. Wait (min)</Text>
              </View>
            </View>
          </View>
        )}

        {/* QR card */}
        <View style={[styles.qrCard, SHADOW.sm]}>
          <Text style={styles.qrTitle}>Show at Reception</Text>
          {QRCode ? (
            <View style={styles.qrBox}>
              <QRCode value={qrData} size={160} color={COLORS.text} backgroundColor="white" />
            </View>
          ) : (
            <View style={styles.qrFallback}>
              <View style={styles.qrFallbackBox}>
                <Text style={styles.qrFallbackNum}>#{token.tokenNumber}</Text>
                <Text style={styles.qrFallbackHosp}>{token.hospitalName}</Text>
              </View>
            </View>
          )}
          <Text style={styles.qrHint}>Present this at the {token.deptName} counter</Text>
        </View>

        {/* Prescription */}
        {prescription && (
          <View style={[styles.rxCard, SHADOW.sm]}>
            <View style={styles.rxHeader}>
              <Text style={styles.rxTitle}>Prescription</Text>
              <View style={styles.rxBadge}>
                <Text style={styles.rxBadgeText}>💊 Dr. Visit</Text>
              </View>
            </View>

            <View style={styles.rxSection}>
              <Text style={styles.rxSectionLabel}>Diagnosis</Text>
              <Text style={styles.rxDiagnosis}>{prescription.diagnosis}</Text>
            </View>

            {prescription.bedRestDays > 0 && (
              <View style={styles.rxInfoRow}>
                <Text style={styles.rxInfoIcon}>🛌</Text>
                <Text style={styles.rxInfoText}>
                  Bed rest for {prescription.bedRestDays} day{prescription.bedRestDays !== 1 ? 's' : ''}
                </Text>
              </View>
            )}

            {prescription.bedAssigned && (
              <View style={styles.rxInfoRow}>
                <Text style={styles.rxInfoIcon}>🏥</Text>
                <Text style={styles.rxInfoText}>
                  Bed <Text style={{ color: COLORS.primary, ...FONTS.semibold }}>{prescription.bedAssigned}</Text>
                  {' '}assigned ({prescription.bedType})
                </Text>
              </View>
            )}

            <Text style={styles.rxMedHeading}>Medicines</Text>
            {prescription.medicines.map((m, i) => (
              <View key={i} style={styles.medItem}>
                <View style={styles.medDot} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.medName}>{m.name}</Text>
                  <Text style={styles.medDetail}>{m.dosage} · {m.duration}</Text>
                  {m.instructions ? (
                    <Text style={styles.medInstr}>{m.instructions}</Text>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        )}

        {token.status === 'waiting' && (
          <Button
            label="Cancel Token"
            onPress={cancelToken}
            loading={cancelling}
            variant="danger"
            style={styles.cancelBtn}
          />
        )}
      </ScrollView>
    </View>
  );
}

function TicketRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.ticketRow}>
      <Text style={styles.ticketRowLabel}>{label}</Text>
      <Text style={styles.ticketRowValue}>{value}</Text>
    </View>
  );
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short',
  });
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: SPACING.lg, paddingTop: SPACING.xxl + 10,
    backgroundColor: COLORS.primary,
  },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 30, color: COLORS.white, lineHeight: 30 },
  headerTitle: { ...FONTS.semibold, fontSize: 18, color: COLORS.white },

  calledBanner: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg, padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  calledBannerIcon: { fontSize: 26 },
  calledBannerTitle: { ...FONTS.bold, fontSize: 16, color: COLORS.white },
  calledBannerSub: { ...FONTS.regular, fontSize: 13, color: COLORS.white + 'CC', marginTop: 2 },

  content: { padding: SPACING.lg, paddingBottom: SPACING.xxl, gap: SPACING.md },

  ticket: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  ticketTop: {
    padding: SPACING.xl,
    alignItems: 'center',
    backgroundColor: COLORS.surface,
  },
  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    borderRadius: RADIUS.full, paddingHorizontal: 14, paddingVertical: 6,
    marginBottom: SPACING.lg,
  },
  statusIcon: { fontSize: 16 },
  statusLabel: { ...FONTS.bold, fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.8 },
  tokenNumLabel: {
    ...FONTS.medium, fontSize: 11, color: COLORS.textMuted,
    letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4,
  },
  tokenNum: { ...FONTS.bold, fontSize: 72, lineHeight: 80 },
  hospDeptRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginTop: SPACING.sm },
  hospLabel: { ...FONTS.medium, fontSize: 14, color: COLORS.text },
  deptPill: {
    backgroundColor: COLORS.primaryLight, borderRadius: RADIUS.full,
    paddingHorizontal: 10, paddingVertical: 3,
  },
  deptPillText: { ...FONTS.medium, fontSize: 12, color: COLORS.primary },

  perfRow: { flexDirection: 'row', alignItems: 'center' },
  perfCutLeft: {
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: COLORS.background,
    marginLeft: -9,
  },
  perfLine: {
    flex: 1, height: 1,
    borderStyle: 'dashed', borderWidth: 1, borderColor: COLORS.border,
  },
  perfCutRight: {
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: COLORS.background,
    marginRight: -9,
  },
  ticketBottom: {
    paddingHorizontal: SPACING.xl, paddingVertical: SPACING.lg,
    gap: SPACING.sm,
  },
  ticketRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  ticketRowLabel: { ...FONTS.regular, fontSize: 13, color: COLORS.textSecondary },
  ticketRowValue: { ...FONTS.medium, fontSize: 13, color: COLORS.text },

  queueCard: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    padding: SPACING.lg, borderWidth: 1, borderColor: COLORS.border,
  },
  queueHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.md, justifyContent: 'center' },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.success },
  queueTitle: { ...FONTS.semibold, fontSize: 13, color: COLORS.text, textTransform: 'uppercase', letterSpacing: 0.5 },
  queueRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  queueStat: { alignItems: 'center', flex: 1 },
  queueVal: { ...FONTS.bold, fontSize: 30, color: COLORS.text },
  queueLbl: { ...FONTS.regular, fontSize: 11, color: COLORS.textSecondary, marginTop: 4, textAlign: 'center' },
  queueDivider: { width: 1, height: 44, backgroundColor: COLORS.border },

  qrCard: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    padding: SPACING.xl, alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  qrTitle: { ...FONTS.semibold, fontSize: 14, color: COLORS.text, marginBottom: SPACING.lg },
  qrBox: {
    padding: SPACING.md, backgroundColor: COLORS.white,
    borderRadius: RADIUS.md, marginBottom: SPACING.md,
    borderWidth: 1, borderColor: COLORS.border,
  },
  qrFallback: { paddingVertical: SPACING.xl },
  qrFallbackBox: {
    alignItems: 'center', backgroundColor: COLORS.primaryLight,
    borderRadius: RADIUS.lg, padding: SPACING.xl,
    borderWidth: 1.5, borderColor: COLORS.primaryMid,
  },
  qrFallbackNum: { ...FONTS.bold, fontSize: 42, color: COLORS.primary },
  qrFallbackHosp: { ...FONTS.regular, fontSize: 13, color: COLORS.textSecondary, marginTop: 4 },
  qrHint: { ...FONTS.regular, fontSize: 12, color: COLORS.textSecondary, textAlign: 'center' },

  rxCard: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    padding: SPACING.lg, borderWidth: 1, borderColor: COLORS.border,
  },
  rxHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  rxTitle: { ...FONTS.bold, fontSize: 16, color: COLORS.text },
  rxBadge: {
    backgroundColor: COLORS.success + '15', borderRadius: RADIUS.full,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  rxBadgeText: { ...FONTS.medium, fontSize: 12, color: COLORS.success },
  rxSection: {
    backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.md,
    padding: SPACING.md, marginBottom: SPACING.md,
  },
  rxSectionLabel: { ...FONTS.regular, fontSize: 11, color: COLORS.textMuted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  rxDiagnosis: { ...FONTS.semibold, fontSize: 15, color: COLORS.text },
  rxInfoRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    paddingVertical: SPACING.sm, borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  rxInfoIcon: { fontSize: 16 },
  rxInfoText: { ...FONTS.regular, fontSize: 13, color: COLORS.text, flex: 1 },
  rxMedHeading: {
    ...FONTS.semibold, fontSize: 13, color: COLORS.text,
    marginTop: SPACING.md, marginBottom: SPACING.sm,
    borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: SPACING.md,
  },
  medItem: {
    flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm,
    backgroundColor: COLORS.background, borderRadius: RADIUS.md,
    padding: SPACING.md, marginBottom: SPACING.sm,
  },
  medDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: COLORS.primary, marginTop: 5, flexShrink: 0,
  },
  medName: { ...FONTS.semibold, fontSize: 14, color: COLORS.text },
  medDetail: { ...FONTS.regular, fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  medInstr: { ...FONTS.regular, fontSize: 11, color: COLORS.textMuted, marginTop: 2, fontStyle: 'italic' },

  cancelBtn: { marginTop: SPACING.sm },
});
