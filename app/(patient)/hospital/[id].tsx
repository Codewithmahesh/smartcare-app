import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, Alert, Linking,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '../../../lib/api';
import { useAuth } from '../../../context/AuthContext';
import { Hospital, Department, HospitalBeds, Token, QueueStatus } from '../../../types';
import Loading from '../../../components/ui/Loading';
import Button from '../../../components/ui/Button';
import { COLORS, FONTS, RADIUS, SHADOW, SPACING } from '../../../constants/theme';

function todayStr() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

function getNext7Days() {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const dateStr = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    return {
      date: dateStr,
      label: {
        day: i === 0 ? 'Today' : days[d.getDay()],
        date: `${d.getDate()} ${months[d.getMonth()]}`,
      },
    };
  });
}

function formatApptDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const date = new Date(y, m - 1, d);
  return `${days[date.getDay()]}, ${d} ${months[m - 1]} ${y}`;
}

interface DeptWithQueue extends Department {
  queue: QueueStatus | null;
}

export default function HospitalDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { appUser } = useAuth();
  const router = useRouter();

  const [hospital, setHospital] = useState<Hospital | null>(null);
  const [depts, setDepts] = useState<DeptWithQueue[]>([]);
  const [beds, setBeds] = useState<HospitalBeds | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDept, setSelectedDept] = useState<DeptWithQueue | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr());
  const [booking, setBooking] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadQueues = useCallback(async (departments: Department[]) => {
    const updated = await Promise.all(
      departments.map(async d => {
        try {
          const q = await api.get<QueueStatus>(`/queue/${id}/${d.id}`, false);
          return { ...d, queue: q };
        } catch {
          return { ...d, queue: null };
        }
      })
    );
    setDepts(updated);
  }, [id]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const [h, departments, b] = await Promise.all([
          api.get<Hospital>(`/hospitals/${id}`, false),
          api.get<Department[]>(`/hospitals/${id}/departments`, false),
          api.get<HospitalBeds>(`/hospitals/${id}/beds`, false),
        ]);
        setHospital(h);
        setBeds(b);
        await loadQueues(departments);
      } catch { } finally {
        setLoading(false);
      }
    })();

    pollRef.current = setInterval(async () => {
      const departments = await api.get<Department[]>(`/hospitals/${id}/departments`, false).catch(() => []);
      if (departments.length > 0) loadQueues(departments);
      api.get<HospitalBeds>(`/hospitals/${id}/beds`, false).then(setBeds).catch(() => {});
    }, 8000);

    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [id, loadQueues]);

  async function bookToken() {
    if (!selectedDept || !appUser || !hospital) return;
    setBooking(true);
    try {
      const token = await api.post<Token>('/tokens', {
        hospitalId: id,
        hospitalName: hospital.name,
        deptId: selectedDept.id,
        deptName: selectedDept.name,
        appointmentDate: selectedDate,
      });
      setSelectedDept(null);
      router.push(`/(patient)/token/${token.id}`);
    } catch (err: any) {
      Alert.alert('Booking Failed', err.message ?? 'Could not book token. Please try again.');
    } finally {
      setBooking(false);
    }
  }

  if (loading || !hospital) return <Loading message="Loading hospital…" />;

  const totalAvailable = beds
    ? (beds.general.total - beds.general.occupied) +
      (beds.icu.total - beds.icu.occupied) +
      (beds.emergency.total - beds.emergency.occupied)
    : null;

  const openDepts = depts.filter(d => d.queue?.isOpen !== false);

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{hospital.name}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Hero */}
        <View style={[styles.heroCard, SHADOW.md]}>
          <View style={styles.heroTop}>
            <View style={styles.heroIcon}><Text style={{ fontSize: 36 }}>🏥</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.hospName}>{hospital.name}</Text>
              <Text style={styles.address}>📍 {hospital.address}</Text>
              {hospital.phone && (
                <TouchableOpacity onPress={() => Linking.openURL(`tel:${hospital.phone}`)}>
                  <Text style={styles.phone}>📞 {hospital.phone}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
          <View style={styles.specRow}>
            {hospital.specialties.map(s => (
              <View key={s} style={styles.specChip}>
                <Text style={styles.specText}>{s}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, SHADOW.sm]}>
            <Text style={styles.statVal}>{depts.length}</Text>
            <Text style={styles.statLbl}>Departments</Text>
          </View>
          <View style={[styles.statCard, SHADOW.sm]}>
            <Text style={[styles.statVal, { color: openDepts.length > 0 ? COLORS.success : COLORS.error }]}>
              {openDepts.length}
            </Text>
            <Text style={styles.statLbl}>Open Now</Text>
          </View>
          <View style={[styles.statCard, SHADOW.sm]}>
            <Text style={[styles.statVal, { color: (totalAvailable ?? 0) > 0 ? COLORS.success : COLORS.error }]}>
              {totalAvailable ?? '–'}
            </Text>
            <Text style={styles.statLbl}>Beds Free</Text>
          </View>
        </View>

        {/* Departments with live queue */}
        <Text style={styles.sectionTitle}>Departments & Queue Status</Text>
        {depts.length === 0 ? (
          <Text style={styles.noData}>No departments listed yet.</Text>
        ) : (
          depts.map(dept => {
            const q = dept.queue;
            const isOpen = q?.isOpen !== false;
            const waiting = q?.totalWaiting ?? 0;
            const waitMin = q?.estimatedWaitMinutes ?? 0;

            return (
              <View key={dept.id} style={[styles.deptCard, SHADOW.sm, !isOpen && styles.deptCardClosed]}>
                <View style={styles.deptTop}>
                  <View style={styles.deptLeft}>
                    <View style={styles.deptIconBox}>
                      <Text style={{ fontSize: 20 }}>{specialtyIcon(dept.specialty)}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.deptName}>{dept.name}</Text>
                      <Text style={styles.deptSpec}>{dept.specialty}</Text>
                      {dept.doctorName ? <Text style={styles.deptDoc}>Dr. {dept.doctorName}</Text> : null}
                    </View>
                  </View>
                  <View style={[styles.statusPill, { backgroundColor: isOpen ? COLORS.success + '18' : COLORS.error + '18' }]}>
                    <Text style={[styles.statusPillText, { color: isOpen ? COLORS.success : COLORS.error }]}>
                      {isOpen ? '● Open' : '● Closed'}
                    </Text>
                  </View>
                </View>

                {isOpen && (
                  <View style={styles.queueRow}>
                    <View style={styles.queueStat}>
                      <Text style={styles.queueVal}>{waiting}</Text>
                      <Text style={styles.queueLbl}>Waiting</Text>
                    </View>
                    <View style={styles.queueDivider} />
                    <View style={styles.queueStat}>
                      <Text style={styles.queueVal}>{q?.currentToken ?? 0}</Text>
                      <Text style={styles.queueLbl}>Now Serving</Text>
                    </View>
                    <View style={styles.queueDivider} />
                    <View style={styles.queueStat}>
                      <Text style={[styles.queueVal, { color: waitMin > 30 ? COLORS.warning : COLORS.success }]}>
                        ~{waitMin}m
                      </Text>
                      <Text style={styles.queueLbl}>Est. Wait</Text>
                    </View>
                    <Button
                      label="Book Token"
                      onPress={() => { setSelectedDept(dept); setSelectedDate(todayStr()); }}
                      size="sm"
                      style={styles.bookBtn}
                    />
                  </View>
                )}

                {!isOpen && (
                  <Text style={styles.closedMsg}>This department is currently closed. Check back later.</Text>
                )}
              </View>
            );
          })
        )}

        {/* Bed Availability */}
        {beds && (
          <>
            <Text style={styles.sectionTitle}>Live Bed Availability</Text>
            <View style={styles.bedsRow}>
              {(['general', 'icu', 'emergency'] as const).map(type => {
                const b = beds[type];
                const avail = b.total - b.occupied;
                const icons = { general: '🛏️', icu: '💉', emergency: '🚨' };
                return (
                  <View key={type} style={[styles.bedCard, SHADOW.sm]}>
                    <Text style={styles.bedIcon}>{icons[type]}</Text>
                    <Text style={[styles.bedAvail, { color: avail > 0 ? COLORS.success : COLORS.error }]}>{avail}</Text>
                    <Text style={styles.bedType}>{type.charAt(0).toUpperCase() + type.slice(1)}</Text>
                    <Text style={styles.bedTotal}>of {b.total}</Text>
                  </View>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>

      {/* Booking Confirmation Modal */}
      <Modal visible={!!selectedDept} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Confirm Booking</Text>

            {selectedDept && (
              <>
                <View style={styles.modalDeptCard}>
                  <Text style={styles.modalDeptName}>{selectedDept.name}</Text>
                  <Text style={styles.modalHospName}>{hospital.name}</Text>
                  {selectedDept.doctorName ? <Text style={styles.modalDoc}>Dr. {selectedDept.doctorName}</Text> : null}
                </View>

                <Text style={styles.dateLabel}>Select Date</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateScroll}>
                  {getNext7Days().map(({ date, label }) => (
                    <TouchableOpacity
                      key={date}
                      onPress={() => setSelectedDate(date)}
                      style={[styles.dateChip, selectedDate === date && styles.dateChipActive]}
                    >
                      <Text style={[styles.dateChipDay, selectedDate === date && styles.dateChipTextActive]}>{label.day}</Text>
                      <Text style={[styles.dateChipDate, selectedDate === date && styles.dateChipTextActive]}>{label.date}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {selectedDate === todayStr() && selectedDept.queue && (
                  <View style={styles.modalQueueRow}>
                    <View style={styles.modalQueueStat}>
                      <Text style={styles.modalQueueVal}>{selectedDept.queue.totalWaiting}</Text>
                      <Text style={styles.modalQueueLbl}>Ahead of you</Text>
                    </View>
                    <View style={styles.queueDivider} />
                    <View style={styles.modalQueueStat}>
                      <Text style={styles.modalQueueVal}>~{selectedDept.queue.estimatedWaitMinutes}m</Text>
                      <Text style={styles.modalQueueLbl}>Est. Wait</Text>
                    </View>
                    <View style={styles.queueDivider} />
                    <View style={styles.modalQueueStat}>
                      <Text style={styles.modalQueueVal}>#{selectedDept.queue.currentToken}</Text>
                      <Text style={styles.modalQueueLbl}>Now Serving</Text>
                    </View>
                  </View>
                )}

                <View style={styles.infoBox}>
                  {selectedDate === todayStr() ? (
                    <>
                      <Text style={styles.infoItem}>✅ You'll join today's live queue</Text>
                      <Text style={styles.infoItem}>📱 Track your position in real time</Text>
                      <Text style={styles.infoItem}>📍 Arrive at the hospital before your turn</Text>
                    </>
                  ) : (
                    <>
                      <Text style={styles.infoItem}>📅 Appointment on {formatApptDate(selectedDate)}</Text>
                      <Text style={styles.infoItem}>✅ Your token will be active on that day</Text>
                      <Text style={styles.infoItem}>📍 Arrive at the hospital on the scheduled date</Text>
                    </>
                  )}
                </View>
              </>
            )}

            <View style={styles.modalBtns}>
              <Button label="Cancel" onPress={() => setSelectedDept(null)} variant="outline" style={styles.halfBtn} />
              <Button label="Confirm Booking" onPress={bookToken} loading={booking} style={styles.halfBtn} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function specialtyIcon(specialty: string): string {
  const s = specialty?.toLowerCase() ?? '';
  if (s.includes('cardio') || s.includes('heart')) return '❤️';
  if (s.includes('ortho') || s.includes('bone')) return '🦴';
  if (s.includes('neuro') || s.includes('brain')) return '🧠';
  if (s.includes('pedia') || s.includes('child')) return '👶';
  if (s.includes('gyne') || s.includes('obste')) return '🤰';
  if (s.includes('derm') || s.includes('skin')) return '🩹';
  if (s.includes('eye') || s.includes('opth')) return '👁️';
  if (s.includes('ent') || s.includes('ear')) return '👂';
  if (s.includes('dental') || s.includes('teeth')) return '🦷';
  if (s.includes('pulmo') || s.includes('lung') || s.includes('chest')) return '🫁';
  if (s.includes('gastro') || s.includes('stomach')) return '🫃';
  if (s.includes('urol') || s.includes('kidney')) return '🫘';
  if (s.includes('psychi') || s.includes('mental')) return '🧘';
  if (s.includes('oncol') || s.includes('cancer')) return '🔬';
  if (s.includes('emerg')) return '🚨';
  return '🏥';
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', padding: SPACING.lg, paddingTop: SPACING.xl + 10, backgroundColor: COLORS.primary, gap: SPACING.sm },
  back: { padding: 4 },
  backText: { fontSize: 28, color: COLORS.white, lineHeight: 28 },
  headerTitle: { ...FONTS.semibold, fontSize: 18, color: COLORS.white, flex: 1 },
  content: { padding: SPACING.lg, paddingBottom: SPACING.xxl, gap: SPACING.md },
  heroCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: SPACING.lg, borderWidth: 1, borderColor: COLORS.border },
  heroTop: { flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.md },
  heroIcon: { width: 60, height: 60, borderRadius: RADIUS.lg, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  hospName: { ...FONTS.bold, fontSize: 17, color: COLORS.text },
  address: { ...FONTS.regular, fontSize: 12, color: COLORS.textSecondary, marginTop: 4, lineHeight: 18 },
  phone: { ...FONTS.medium, fontSize: 13, color: COLORS.primary, marginTop: 4 },
  specRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  specChip: { backgroundColor: COLORS.primaryLight, borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 3 },
  specText: { ...FONTS.medium, fontSize: 11, color: COLORS.primary },
  statsRow: { flexDirection: 'row', gap: SPACING.sm },
  statCard: { flex: 1, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.md, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  statVal: { ...FONTS.bold, fontSize: 26, color: COLORS.text },
  statLbl: { ...FONTS.regular, fontSize: 11, color: COLORS.textSecondary, marginTop: 2, textAlign: 'center' },
  sectionTitle: { ...FONTS.semibold, fontSize: 15, color: COLORS.text, marginTop: SPACING.sm },
  noData: { ...FONTS.regular, fontSize: 13, color: COLORS.textSecondary },
  deptCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border },
  deptCardClosed: { opacity: 0.6 },
  deptTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: SPACING.sm },
  deptLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, flex: 1 },
  deptIconBox: { width: 44, height: 44, borderRadius: RADIUS.md, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  deptName: { ...FONTS.semibold, fontSize: 14, color: COLORS.text },
  deptSpec: { ...FONTS.regular, fontSize: 12, color: COLORS.primary, marginTop: 2 },
  deptDoc: { ...FONTS.regular, fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  statusPill: { borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 3, flexShrink: 0 },
  statusPillText: { ...FONTS.semibold, fontSize: 11 },
  queueRow: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: SPACING.sm, gap: SPACING.sm },
  queueStat: { alignItems: 'center', flex: 1 },
  queueVal: { ...FONTS.bold, fontSize: 18, color: COLORS.text },
  queueLbl: { ...FONTS.regular, fontSize: 10, color: COLORS.textSecondary, marginTop: 1, textAlign: 'center' },
  queueDivider: { width: 1, height: 32, backgroundColor: COLORS.border },
  bookBtn: { marginLeft: SPACING.sm },
  closedMsg: { ...FONTS.regular, fontSize: 12, color: COLORS.textMuted, fontStyle: 'italic', borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: SPACING.sm },
  bedsRow: { flexDirection: 'row', gap: SPACING.sm },
  bedCard: { flex: 1, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.md, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  bedIcon: { fontSize: 20, marginBottom: 4 },
  bedAvail: { ...FONTS.bold, fontSize: 24 },
  bedType: { ...FONTS.medium, fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  bedTotal: { ...FONTS.regular, fontSize: 10, color: COLORS.textMuted },
  overlay: { flex: 1, backgroundColor: COLORS.overlay, justifyContent: 'flex-end' },
  modal: { backgroundColor: COLORS.surface, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, padding: SPACING.xl, paddingBottom: 40 },
  modalTitle: { ...FONTS.bold, fontSize: 20, color: COLORS.text, marginBottom: SPACING.md },
  modalDeptCard: { backgroundColor: COLORS.primaryLight, borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.md },
  modalDeptName: { ...FONTS.bold, fontSize: 16, color: COLORS.primary },
  modalHospName: { ...FONTS.regular, fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  modalDoc: { ...FONTS.medium, fontSize: 13, color: COLORS.text, marginTop: 4 },
  modalQueueRow: { flexDirection: 'row', backgroundColor: COLORS.background, borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.md, justifyContent: 'space-around' },
  modalQueueStat: { alignItems: 'center', flex: 1 },
  modalQueueVal: { ...FONTS.bold, fontSize: 22, color: COLORS.text },
  modalQueueLbl: { ...FONTS.regular, fontSize: 11, color: COLORS.textSecondary, marginTop: 2, textAlign: 'center' },
  infoBox: { gap: 8, marginBottom: SPACING.lg },
  infoItem: { ...FONTS.regular, fontSize: 13, color: COLORS.text },
  modalBtns: { flexDirection: 'row', gap: SPACING.sm },
  halfBtn: { flex: 1 },
  dateLabel: { ...FONTS.medium, fontSize: 13, color: COLORS.text, marginBottom: SPACING.sm },
  dateScroll: { marginBottom: SPACING.md },
  dateChip: { alignItems: 'center', borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 8, marginRight: SPACING.sm, minWidth: 64, backgroundColor: COLORS.background },
  dateChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  dateChipDay: { ...FONTS.semibold, fontSize: 12, color: COLORS.text },
  dateChipDate: { ...FONTS.regular, fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  dateChipTextActive: { color: COLORS.white },
});
