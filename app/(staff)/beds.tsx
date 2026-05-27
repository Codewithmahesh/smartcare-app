import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Modal, Alert,
  TouchableOpacity, TextInput,
} from 'react-native';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { HospitalBeds, BedType, Admission, Prescription } from '../../types';
import Loading from '../../components/ui/Loading';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { COLORS, FONTS, RADIUS, SHADOW, SPACING } from '../../constants/theme';

type ModalMode = 'admit' | 'discharge' | 'allocate' | null;
type Tab = 'beds' | 'requests';

interface AdmitForm {
  name: string;
  age: string;
  contactType: 'phone' | 'email';
  contact: string;
  bedNumber: string;
}

export default function BedsScreen() {
  const { appUser } = useAuth();
  const [tab, setTab] = useState<Tab>('beds');
  const [beds, setBeds] = useState<HospitalBeds | null>(null);
  const [requests, setRequests] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ type: BedType; mode: ModalMode; request?: Prescription } | null>(null);
  const [saving, setSaving] = useState(false);

  const [admitForm, setAdmitForm] = useState<AdmitForm>({
    name: '', age: '', contactType: 'phone', contact: '', bedNumber: '',
  });
  const [admitErrors, setAdmitErrors] = useState<Partial<AdmitForm>>({});
  const [dischargeSearch, setDischargeSearch] = useState('');

  const hospitalId = appUser?.hospitalId ?? '';

  const load = useCallback(async () => {
    if (!hospitalId) return;
    try {
      const [b, reqs] = await Promise.all([
        api.get<HospitalBeds>(`/hospitals/${hospitalId}/beds`),
        api.get<Prescription[]>(`/prescriptions/hospital/${hospitalId}/bed-requests`),
      ]);
      setBeds(b);
      setRequests(reqs);
    } catch { } finally {
      setLoading(false);
    }
  }, [hospitalId]);

  useEffect(() => { load(); }, [load]);

  function openAdmit(type: BedType) {
    setAdmitForm({ name: '', age: '', contactType: 'phone', contact: '', bedNumber: '' });
    setAdmitErrors({});
    setModal({ type, mode: 'admit' });
  }

  function openDischarge(type: BedType) {
    setDischargeSearch('');
    setModal({ type, mode: 'discharge' });
  }

  function openAllocate(req: Prescription) {
    setAdmitForm({
      name: req.patientName ?? '',
      age: '',
      contactType: req.patientContact?.includes('@') ? 'email' : 'phone',
      contact: req.patientContact ?? '',
      bedNumber: '',
    });
    setAdmitErrors({});
    setModal({ type: req.bedType ?? 'general', mode: 'allocate', request: req });
  }

  async function allocateBed() {
    if (!modal?.request || !beds) return;
    if (!validateAdmit()) return;

    const existing = beds[modal.type].admissions.find(
      a => a.bedNumber.toLowerCase() === admitForm.bedNumber.trim().toLowerCase()
    );
    if (existing) {
      Alert.alert('Bed Occupied', `Bed ${admitForm.bedNumber} is already occupied by ${existing.name}.`);
      return;
    }

    const b = beds[modal.type];
    if (b.occupied >= b.total) {
      Alert.alert('No Beds Available', `All ${modal.type} beds are currently full.`);
      return;
    }

    setSaving(true);
    try {
      const newAdmission = {
        name: admitForm.name.trim(),
        age: Number(admitForm.age),
        contact: admitForm.contact.trim(),
        contactType: admitForm.contactType,
        bedNumber: admitForm.bedNumber.trim(),
      };
      const newBeds: HospitalBeds = {
        ...beds,
        [modal.type]: {
          ...b,
          occupied: b.occupied + 1,
          admissions: [...b.admissions, newAdmission],
        },
      };
      await Promise.all([
        api.put(`/hospitals/${hospitalId}/beds`, newBeds),
        api.put(`/prescriptions/${modal.request.id}/allocate-bed`, { bedNumber: admitForm.bedNumber.trim() }),
      ]);
      setBeds(newBeds);
      setRequests(prev => prev.filter(r => r.id !== modal.request!.id));
      setModal(null);
    } catch {
      Alert.alert('Error', 'Failed to allocate bed.');
    } finally {
      setSaving(false);
    }
  }

  function validateAdmit(): boolean {
    const e: Partial<AdmitForm> = {};
    if (!admitForm.name.trim()) e.name = 'Patient name is required';
    if (!admitForm.age.trim() || isNaN(Number(admitForm.age)) || Number(admitForm.age) <= 0)
      e.age = 'Valid age is required';
    if (!admitForm.contact.trim()) {
      e.contact = `${admitForm.contactType === 'phone' ? 'Phone number' : 'Email'} is required`;
    } else if (admitForm.contactType === 'phone' && !/^\d{10}$/.test(admitForm.contact.replace(/\s/g, ''))) {
      e.contact = 'Enter a valid 10-digit phone number';
    } else if (admitForm.contactType === 'email' && !/\S+@\S+\.\S+/.test(admitForm.contact)) {
      e.contact = 'Enter a valid email address';
    }
    if (!admitForm.bedNumber.trim()) e.bedNumber = 'Bed number is required';
    setAdmitErrors(e);
    return Object.keys(e).length === 0;
  }

  async function admitPatient() {
    if (!modal || !beds) return;
    if (!validateAdmit()) return;

    const existing = beds[modal.type].admissions.find(
      a => a.bedNumber.toLowerCase() === admitForm.bedNumber.trim().toLowerCase()
    );
    if (existing) {
      Alert.alert('Bed Occupied', `Bed ${admitForm.bedNumber} is already occupied by ${existing.name}.`);
      return;
    }

    const b = beds[modal.type];
    if (b.occupied >= b.total) {
      Alert.alert('No Beds Available', `All ${modal.type} beds are currently full.`);
      return;
    }

    setSaving(true);
    try {
      const newAdmission = {
        name: admitForm.name.trim(),
        age: Number(admitForm.age),
        contact: admitForm.contact.trim(),
        contactType: admitForm.contactType,
        bedNumber: admitForm.bedNumber.trim(),
      };
      const newBeds: HospitalBeds = {
        ...beds,
        [modal.type]: {
          ...b,
          occupied: b.occupied + 1,
          admissions: [...b.admissions, newAdmission],
        },
      };
      await api.put(`/hospitals/${hospitalId}/beds`, newBeds);
      setBeds(newBeds);
      setModal(null);
    } catch {
      Alert.alert('Error', 'Failed to admit patient.');
    } finally {
      setSaving(false);
    }
  }

  async function dischargePatient(admission: Admission) {
    if (!modal || !beds) return;
    Alert.alert(
      'Confirm Discharge',
      `Discharge ${admission.name} from Bed ${admission.bedNumber}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Discharge', style: 'destructive',
          onPress: async () => {
            setSaving(true);
            try {
              const b = beds[modal.type];
              const newBeds: HospitalBeds = {
                ...beds,
                [modal.type]: {
                  ...b,
                  occupied: Math.max(0, b.occupied - 1),
                  admissions: b.admissions.filter(a => a._id !== admission._id),
                },
              };
              await api.put(`/hospitals/${hospitalId}/beds`, newBeds);
              setBeds(newBeds);
              setModal(null);
            } catch {
              Alert.alert('Error', 'Failed to discharge patient.');
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  }

  if (loading) return <Loading message="Loading bed status…" />;

  const bedTypes: { key: BedType; label: string; icon: string; color: string }[] = [
    { key: 'general', label: 'General Ward', icon: '🛏️', color: COLORS.primary },
    { key: 'icu', label: 'ICU', icon: '💉', color: COLORS.error },
    { key: 'emergency', label: 'Emergency', icon: '🚨', color: COLORS.warning },
  ];

  const currentAdmissions = modal ? beds?.[modal.type].admissions ?? [] : [];
  const filtered = dischargeSearch.trim()
    ? currentAdmissions.filter(a =>
        a.name.toLowerCase().includes(dischargeSearch.toLowerCase()) ||
        a.contact.includes(dischargeSearch) ||
        a.bedNumber.toLowerCase().includes(dischargeSearch.toLowerCase())
      )
    : currentAdmissions;

  const bedTypeLabel: Record<BedType, string> = { general: 'General Ward', icu: 'ICU', emergency: 'Emergency' };

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>Bed Management</Text>
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tabBtn, tab === 'beds' && styles.tabBtnActive]}
            onPress={() => setTab('beds')}
          >
            <Text style={[styles.tabText, tab === 'beds' && styles.tabTextActive]}>Beds</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, tab === 'requests' && styles.tabBtnActive]}
            onPress={() => setTab('requests')}
          >
            <Text style={[styles.tabText, tab === 'requests' && styles.tabTextActive]}>
              Requests{requests.length > 0 ? ` (${requests.length})` : ''}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {tab === 'beds' ? (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {bedTypes.map(({ key, label, icon, color }) => {
            const b = beds?.[key] ?? { total: 0, occupied: 0, admissions: [] };
            const available = b.total - b.occupied;
            const pct = b.total > 0 ? b.occupied / b.total : 0;

            return (
              <View key={key} style={[styles.card, SHADOW.md]}>
                <View style={styles.cardTop}>
                  <View style={[styles.iconBox, { backgroundColor: color + '18' }]}>
                    <Text style={styles.icon}>{icon}</Text>
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={styles.bedType}>{label}</Text>
                    <Text style={[styles.available, { color: available > 0 ? COLORS.success : COLORS.error }]}>
                      {available} available
                    </Text>
                  </View>
                  <View style={styles.counts}>
                    <Text style={[styles.countVal, { color }]}>{b.occupied}</Text>
                    <Text style={styles.countSlash}>/</Text>
                    <Text style={styles.countTotal}>{b.total}</Text>
                  </View>
                </View>

                <View style={styles.progressBg}>
                  <View style={[styles.progressFill, { width: `${pct * 100}%`, backgroundColor: pct > 0.9 ? COLORS.error : pct > 0.7 ? COLORS.warning : color }]} />
                </View>
                <Text style={styles.pctText}>{Math.round(pct * 100)}% occupied</Text>

                <View style={styles.btnRow}>
                  <Button label="Admit Patient" onPress={() => openAdmit(key)} size="sm" style={styles.halfBtn} disabled={available === 0} />
                  <Button label="Discharge" onPress={() => openDischarge(key)} size="sm" variant="outline" style={styles.halfBtn} disabled={b.occupied === 0} />
                </View>
              </View>
            );
          })}
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {requests.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyIcon}>🛏️</Text>
              <Text style={styles.emptyTitle}>No Pending Requests</Text>
              <Text style={styles.emptyMsg}>Bed requests from prescriptions will appear here.</Text>
            </View>
          ) : (
            requests.map(req => {
              const typeColors: Record<BedType, string> = { general: COLORS.primary, icu: COLORS.error, emergency: COLORS.warning };
              const typeIcons: Record<BedType, string> = { general: '🛏️', icu: '💉', emergency: '🚨' };
              const bType = req.bedType ?? 'general';
              return (
                <View key={req.id} style={[styles.card, SHADOW.sm]}>
                  <View style={styles.cardTop}>
                    <View style={[styles.iconBox, { backgroundColor: typeColors[bType] + '18' }]}>
                      <Text style={styles.icon}>{typeIcons[bType]}</Text>
                    </View>
                    <View style={styles.cardInfo}>
                      <Text style={styles.bedType}>{req.patientName ?? 'Unknown Patient'}</Text>
                      <Text style={styles.available}>{bedTypeLabel[bType]}</Text>
                      {req.patientContact ? (
                        <Text style={styles.reqContact}>
                          {req.patientContact.includes('@') ? '📧' : '📱'} {req.patientContact}
                        </Text>
                      ) : null}
                    </View>
                    <View style={[styles.typeBadge, { backgroundColor: typeColors[bType] + '18', borderColor: typeColors[bType] }]}>
                      <Text style={[styles.typeBadgeText, { color: typeColors[bType] }]}>{bType.toUpperCase()}</Text>
                    </View>
                  </View>
                  <Text style={styles.reqTime}>Requested {formatDate(req.createdAt)}</Text>
                  <Button
                    label="Allocate Bed"
                    onPress={() => openAllocate(req)}
                    size="sm"
                    style={{ marginTop: SPACING.sm }}
                    disabled={(beds?.[bType].total ?? 0) - (beds?.[bType].occupied ?? 0) === 0}
                  />
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {/* Admit Modal */}
      <Modal visible={modal?.mode === 'admit'} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.modalBox}>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.modalTitle}>🛏️ Admit Patient</Text>
              <Text style={styles.modalSub}>{bedTypes.find(b => b.key === modal?.type)?.label}</Text>

              <Input label="Patient Name *" value={admitForm.name} onChangeText={v => setAdmitForm(p => ({ ...p, name: v }))} placeholder="Full name" error={admitErrors.name} />
              <Input label="Age *" value={admitForm.age} onChangeText={v => setAdmitForm(p => ({ ...p, age: v }))} placeholder="e.g. 35" keyboardType="number-pad" error={admitErrors.age} />
              <Input label="Bed Number *" value={admitForm.bedNumber} onChangeText={v => setAdmitForm(p => ({ ...p, bedNumber: v }))} placeholder="e.g. G-12" error={admitErrors.bedNumber} />

              <Text style={styles.fieldLabel}>Contact Type *</Text>
              <View style={styles.toggleRow}>
                {(['phone', 'email'] as const).map(t => (
                  <TouchableOpacity
                    key={t}
                    onPress={() => setAdmitForm(p => ({ ...p, contactType: t, contact: '' }))}
                    style={[styles.toggleBtn, admitForm.contactType === t && styles.toggleBtnActive]}
                  >
                    <Text style={[styles.toggleText, admitForm.contactType === t && styles.toggleTextActive]}>
                      {t === 'phone' ? '📱 Phone' : '📧 Email'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Input
                label={admitForm.contactType === 'phone' ? 'Phone Number *' : 'Email Address *'}
                value={admitForm.contact}
                onChangeText={v => setAdmitForm(p => ({ ...p, contact: v }))}
                placeholder={admitForm.contactType === 'phone' ? '10-digit number' : 'patient@example.com'}
                keyboardType={admitForm.contactType === 'phone' ? 'phone-pad' : 'email-address'}
                autoCapitalize="none"
                error={admitErrors.contact}
              />

              <View style={styles.modalBtns}>
                <Button label="Cancel" onPress={() => setModal(null)} variant="outline" style={styles.halfBtn} />
                <Button label="Admit" onPress={admitPatient} loading={saving} style={styles.halfBtn} />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Allocate Modal */}
      <Modal visible={modal?.mode === 'allocate'} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.modalBox}>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.modalTitle}>🛏️ Allocate Bed</Text>
              <Text style={styles.modalSub}>
                {modal?.request ? `Patient: ${modal.request.patientName ?? '—'} · ${bedTypeLabel[modal.type ?? 'general']}` : ''}
              </Text>

              <Input label="Patient Name *" value={admitForm.name} onChangeText={v => setAdmitForm(p => ({ ...p, name: v }))} placeholder="Full name" error={admitErrors.name} />
              <Input label="Age *" value={admitForm.age} onChangeText={v => setAdmitForm(p => ({ ...p, age: v }))} placeholder="e.g. 35" keyboardType="number-pad" error={admitErrors.age} />
              <Input label="Bed Number *" value={admitForm.bedNumber} onChangeText={v => setAdmitForm(p => ({ ...p, bedNumber: v }))} placeholder="e.g. G-12" error={admitErrors.bedNumber} />

              <Text style={styles.fieldLabel}>Contact Type *</Text>
              <View style={styles.toggleRow}>
                {(['phone', 'email'] as const).map(t => (
                  <TouchableOpacity
                    key={t}
                    onPress={() => setAdmitForm(p => ({ ...p, contactType: t, contact: p.contact }))}
                    style={[styles.toggleBtn, admitForm.contactType === t && styles.toggleBtnActive]}
                  >
                    <Text style={[styles.toggleText, admitForm.contactType === t && styles.toggleTextActive]}>
                      {t === 'phone' ? '📱 Phone' : '📧 Email'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Input
                label={admitForm.contactType === 'phone' ? 'Phone Number *' : 'Email Address *'}
                value={admitForm.contact}
                onChangeText={v => setAdmitForm(p => ({ ...p, contact: v }))}
                placeholder={admitForm.contactType === 'phone' ? '10-digit number' : 'patient@example.com'}
                keyboardType={admitForm.contactType === 'phone' ? 'phone-pad' : 'email-address'}
                autoCapitalize="none"
                error={admitErrors.contact}
              />

              <View style={styles.modalBtns}>
                <Button label="Cancel" onPress={() => setModal(null)} variant="outline" style={styles.halfBtn} />
                <Button label="Allocate" onPress={allocateBed} loading={saving} style={styles.halfBtn} />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Discharge Modal */}
      <Modal visible={modal?.mode === 'discharge'} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>✅ Discharge Patient</Text>
            <Text style={styles.modalSub}>{bedTypes.find(b => b.key === modal?.type)?.label} — {currentAdmissions.length} admitted</Text>

            <View style={styles.searchBox}>
              <Text style={styles.searchIcon}>🔍</Text>
              <TextInput
                style={styles.searchInput}
                value={dischargeSearch}
                onChangeText={setDischargeSearch}
                placeholder="Search by name, phone/email or bed no."
                placeholderTextColor={COLORS.textMuted}
              />
            </View>

            <ScrollView style={styles.admissionList} showsVerticalScrollIndicator={false}>
              {filtered.length === 0 ? (
                <Text style={styles.emptyText}>
                  {dischargeSearch ? 'No patients match your search.' : 'No admitted patients.'}
                </Text>
              ) : (
                filtered.map(a => (
                  <TouchableOpacity key={a._id} style={[styles.admissionCard, SHADOW.sm]} onPress={() => dischargePatient(a)}>
                    <View style={styles.admissionLeft}>
                      <View style={styles.bedBadge}>
                        <Text style={styles.bedBadgeText}>{a.bedNumber}</Text>
                      </View>
                      <View>
                        <Text style={styles.admName}>{a.name}</Text>
                        <Text style={styles.admDetail}>Age {a.age} · {a.contactType === 'phone' ? '📱' : '📧'} {a.contact}</Text>
                        <Text style={styles.admTime}>Admitted {formatDate(a.admittedAt)}</Text>
                      </View>
                    </View>
                    <Text style={styles.dischargeArrow}>Discharge →</Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>

            <Button label="Cancel" onPress={() => setModal(null)} variant="outline" style={{ marginTop: SPACING.md }} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  header: { padding: SPACING.lg, paddingTop: SPACING.xl + 10, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  title: { ...FONTS.bold, fontSize: 22, color: COLORS.text },
  content: { padding: SPACING.lg, gap: SPACING.md, paddingBottom: SPACING.xxl },
  card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.lg, borderWidth: 1, borderColor: COLORS.border },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md },
  iconBox: { width: 48, height: 48, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center', marginRight: SPACING.md },
  icon: { fontSize: 24 },
  cardInfo: { flex: 1 },
  bedType: { ...FONTS.semibold, fontSize: 16, color: COLORS.text },
  available: { ...FONTS.medium, fontSize: 13, marginTop: 2 },
  counts: { flexDirection: 'row', alignItems: 'baseline' },
  countVal: { ...FONTS.bold, fontSize: 28 },
  countSlash: { ...FONTS.regular, fontSize: 18, color: COLORS.textMuted, marginHorizontal: 2 },
  countTotal: { ...FONTS.regular, fontSize: 18, color: COLORS.textSecondary },
  progressBg: { height: 8, backgroundColor: COLORS.border, borderRadius: RADIUS.full, marginBottom: 6, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: RADIUS.full },
  pctText: { ...FONTS.regular, fontSize: 12, color: COLORS.textMuted, marginBottom: SPACING.md },
  btnRow: { flexDirection: 'row', gap: SPACING.sm },
  halfBtn: { flex: 1 },
  overlay: { flex: 1, backgroundColor: COLORS.overlay, justifyContent: 'flex-end' },
  modalBox: { backgroundColor: COLORS.surface, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, padding: SPACING.xl, paddingBottom: 40, maxHeight: '90%' },
  modalTitle: { ...FONTS.bold, fontSize: 20, color: COLORS.text, marginBottom: 4 },
  modalSub: { ...FONTS.regular, fontSize: 13, color: COLORS.textSecondary, marginBottom: SPACING.lg },
  fieldLabel: { ...FONTS.medium, fontSize: 13, color: COLORS.text, marginBottom: SPACING.sm, marginTop: SPACING.sm },
  toggleRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md },
  toggleBtn: { flex: 1, paddingVertical: SPACING.sm, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: COLORS.border, alignItems: 'center' },
  toggleBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  toggleText: { ...FONTS.medium, fontSize: 14, color: COLORS.text },
  toggleTextActive: { color: COLORS.white },
  modalBtns: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.md },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.background, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: SPACING.md, marginBottom: SPACING.md, gap: SPACING.sm },
  searchIcon: { fontSize: 16 },
  searchInput: { flex: 1, height: 42, ...FONTS.regular, fontSize: 14, color: COLORS.text },
  admissionList: { maxHeight: 320 },
  emptyText: { ...FONTS.regular, fontSize: 14, color: COLORS.textMuted, textAlign: 'center', paddingVertical: SPACING.xl },
  admissionCard: { backgroundColor: COLORS.background, borderRadius: RADIUS.md, padding: SPACING.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.sm, borderWidth: 1, borderColor: COLORS.border },
  admissionLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, flex: 1 },
  bedBadge: { backgroundColor: COLORS.primary, borderRadius: RADIUS.sm, paddingHorizontal: 10, paddingVertical: 4, minWidth: 44, alignItems: 'center' },
  bedBadgeText: { ...FONTS.bold, fontSize: 13, color: COLORS.white },
  admName: { ...FONTS.semibold, fontSize: 14, color: COLORS.text },
  admDetail: { ...FONTS.regular, fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  admTime: { ...FONTS.regular, fontSize: 11, color: COLORS.textMuted, marginTop: 1 },
  dischargeArrow: { ...FONTS.medium, fontSize: 12, color: COLORS.error },
  tabRow: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.md },
  tabBtn: { flex: 1, paddingVertical: SPACING.sm, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: COLORS.border, alignItems: 'center' },
  tabBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  tabText: { ...FONTS.medium, fontSize: 14, color: COLORS.textSecondary },
  tabTextActive: { color: COLORS.white },
  emptyBox: { alignItems: 'center', paddingVertical: SPACING.xxl },
  emptyIcon: { fontSize: 48, marginBottom: SPACING.md },
  emptyTitle: { ...FONTS.semibold, fontSize: 16, color: COLORS.text, marginBottom: 4 },
  emptyMsg: { ...FONTS.regular, fontSize: 13, color: COLORS.textSecondary, textAlign: 'center' },
  reqContact: { ...FONTS.regular, fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  reqTime: { ...FONTS.regular, fontSize: 11, color: COLORS.textMuted, marginTop: 4 },
  typeBadge: { borderRadius: RADIUS.sm, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3 },
  typeBadgeText: { ...FONTS.bold, fontSize: 10 },
});
