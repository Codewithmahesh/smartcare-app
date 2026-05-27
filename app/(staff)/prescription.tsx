import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Modal, Alert,
  TouchableOpacity, KeyboardAvoidingView, Platform, Switch,
} from 'react-native';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { Token, Medicine, BedType } from '../../types';
import Loading from '../../components/ui/Loading';
import EmptyState from '../../components/ui/EmptyState';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { COLORS, FONTS, RADIUS, SHADOW, SPACING } from '../../constants/theme';

export default function PrescriptionScreen() {
  const { appUser } = useAuth();
  const [calledTokens, setCalledTokens] = useState<Token[]>([]);
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [diagnosis, setDiagnosis] = useState('');
  const [bedRestDays, setBedRestDays] = useState('0');
  const [bedRequired, setBedRequired] = useState(false);
  const [bedType, setBedType] = useState<BedType>('general');
  const [medicines, setMedicines] = useState<Medicine[]>([
    { name: '', dosage: '', duration: '', instructions: '' },
  ]);

  const hospitalId = appUser?.hospitalId ?? '';

  const load = useCallback(async () => {
    if (!hospitalId) return;
    try {
      const deptId = appUser?.deptId;
      const tokens = await api.get<Token[]>(
        deptId
          ? `/tokens/hospital/${hospitalId}/dept/${deptId}`
          : `/tokens/hospital/${hospitalId}/dept/all`
      );
      setCalledTokens((tokens ?? []).filter(t => t.status === 'called'));
    } catch { } finally {
      setLoading(false);
    }
  }, [hospitalId, appUser?.deptId]);

  useEffect(() => {
    load();
    pollRef.current = setInterval(load, 5000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [load]);

  function updateMed(index: number, field: keyof Medicine, value: string) {
    setMedicines(prev => prev.map((m, i) => i === index ? { ...m, [field]: value } : m));
  }

  function addMedicine() {
    setMedicines(prev => [...prev, { name: '', dosage: '', duration: '', instructions: '' }]);
  }

  function removeMedicine(index: number) {
    setMedicines(prev => prev.filter((_, i) => i !== index));
  }

  function resetForm() {
    setDiagnosis('');
    setBedRestDays('0');
    setBedRequired(false);
    setBedType('general');
    setMedicines([{ name: '', dosage: '', duration: '', instructions: '' }]);
  }

  async function savePrescription() {
    if (!selectedToken) return;
    if (!diagnosis.trim()) { Alert.alert('Validation', 'Please enter a diagnosis.'); return; }
    const validMeds = medicines.filter(m => m.name.trim());
    if (validMeds.length === 0) { Alert.alert('Validation', 'Add at least one medicine.'); return; }

    setSaving(true);
    try {
      await api.post('/prescriptions', {
        tokenId: selectedToken.id,
        userId: selectedToken.userId,
        hospitalId,
        deptId: selectedToken.deptId,
        medicines: validMeds,
        bedRestDays: parseInt(bedRestDays) || 0,
        diagnosis: diagnosis.trim(),
        patientName: selectedToken.userName,
        patientContact: selectedToken.userPhone ?? '',
        bedRequired,
        bedType: bedRequired ? bedType : null,
        bedStatus: 'pending',
      });

      await api.put(`/tokens/${selectedToken.id}/status`, { status: 'completed' });

      Alert.alert('Saved', 'Prescription saved and token completed.', [
        { text: 'OK', onPress: () => { setSelectedToken(null); resetForm(); load(); } },
      ]);
    } catch { Alert.alert('Error', 'Failed to save prescription.'); }
    finally { setSaving(false); }
  }

  if (loading) return <Loading message="Loading patients…" />;

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>Prescriptions</Text>
        <Text style={styles.sub}>{calledTokens.length} patient{calledTokens.length !== 1 ? 's' : ''} called</Text>
      </View>

      {calledTokens.length === 0 ? (
        <EmptyState icon="💊" title="No called patients" message="Call the next patient from the Queue screen." />
      ) : (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {calledTokens.map(token => (
            <TouchableOpacity key={token.id} style={[styles.card, SHADOW.sm]} onPress={() => { setSelectedToken(token); resetForm(); }}>
              <View style={styles.tokenBadge}>
                <Text style={styles.tokenNum}>#{token.tokenNumber}</Text>
              </View>
              <View style={styles.info}>
                <Text style={styles.patName}>{token.userName}</Text>
                <Text style={styles.deptName}>{token.deptName}</Text>
                <Text style={styles.calledAt}>Called {token.calledAt ? formatTime(token.calledAt) : '-'}</Text>
              </View>
              <Text style={styles.arrow}>→</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <Modal visible={!!selectedToken} animationType="slide" transparent>
        <View style={styles.overlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ width: '100%' }}>
            <View style={styles.modal}>
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <Text style={styles.modalTitle}>💊 Prescription</Text>
                <Text style={styles.modalPatient}>Patient: {selectedToken?.userName} — Token #{selectedToken?.tokenNumber}</Text>

                <Input label="Diagnosis *" value={diagnosis} onChangeText={setDiagnosis} placeholder="e.g. Viral fever, Hypertension" />

                <Text style={styles.sectionLabel}>Medicines</Text>
                {medicines.map((med, i) => (
                  <View key={i} style={styles.medBlock}>
                    <View style={styles.medHeader}>
                      <Text style={styles.medNum}>Medicine {i + 1}</Text>
                      {medicines.length > 1 && (
                        <TouchableOpacity onPress={() => removeMedicine(i)}>
                          <Text style={styles.removeText}>Remove</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                    <Input label="Medicine Name" value={med.name} onChangeText={v => updateMed(i, 'name', v)} placeholder="e.g. Paracetamol 500mg" />
                    <View style={styles.row}>
                      <View style={{ flex: 1 }}>
                        <Input label="Dosage" value={med.dosage} onChangeText={v => updateMed(i, 'dosage', v)} placeholder="e.g. 1-0-1" />
                      </View>
                      <View style={{ width: SPACING.sm }} />
                      <View style={{ flex: 1 }}>
                        <Input label="Duration" value={med.duration} onChangeText={v => updateMed(i, 'duration', v)} placeholder="e.g. 5 days" />
                      </View>
                    </View>
                    <Input label="Instructions (optional)" value={med.instructions ?? ''} onChangeText={v => updateMed(i, 'instructions', v)} placeholder="e.g. Take after meals" />
                  </View>
                ))}
                <TouchableOpacity onPress={addMedicine} style={styles.addMedBtn}>
                  <Text style={styles.addMedText}>+ Add Medicine</Text>
                </TouchableOpacity>

                <Input label="Bed Rest (days)" value={bedRestDays} onChangeText={setBedRestDays} keyboardType="number-pad" placeholder="0" />

                <View style={styles.bedToggleRow}>
                  <View>
                    <Text style={styles.sectionLabel}>Bed Admission Required?</Text>
                    <Text style={styles.bedToggleSub}>Staff will allocate a bed from the Beds screen</Text>
                  </View>
                  <Switch
                    value={bedRequired}
                    onValueChange={setBedRequired}
                    trackColor={{ true: COLORS.primary, false: COLORS.border }}
                    thumbColor={COLORS.white}
                  />
                </View>

                {bedRequired && (
                  <>
                    <Text style={styles.sectionLabel}>Bed Type</Text>
                    <View style={styles.bedTypeRow}>
                      {([
                        { key: 'general', label: '🛏️ General' },
                        { key: 'icu', label: '💉 ICU' },
                        { key: 'emergency', label: '🚨 Emergency' },
                      ] as { key: BedType; label: string }[]).map(b => (
                        <TouchableOpacity
                          key={b.key}
                          onPress={() => setBedType(b.key)}
                          style={[styles.bedTypeBtn, bedType === b.key && styles.bedTypeBtnActive]}
                        >
                          <Text style={[styles.bedTypeBtnText, bedType === b.key && styles.bedTypeBtnTextActive]}>
                            {b.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </>
                )}

                <View style={styles.modalBtns}>
                  <Button label="Cancel" onPress={() => setSelectedToken(null)} variant="outline" style={styles.halfBtn} />
                  <Button label="Save & Complete" onPress={savePrescription} loading={saving} style={styles.halfBtn} />
                </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  header: { padding: SPACING.lg, paddingTop: SPACING.xl + 10, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  title: { ...FONTS.bold, fontSize: 22, color: COLORS.text },
  sub: { ...FONTS.regular, fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  list: { padding: SPACING.lg, gap: SPACING.sm, paddingBottom: SPACING.xxl },
  card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.md, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  tokenBadge: { width: 52, height: 52, borderRadius: RADIUS.md, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center', marginRight: SPACING.md },
  tokenNum: { ...FONTS.bold, fontSize: 18, color: COLORS.primary },
  info: { flex: 1 },
  patName: { ...FONTS.semibold, fontSize: 15, color: COLORS.text },
  deptName: { ...FONTS.regular, fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  calledAt: { ...FONTS.regular, fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  arrow: { ...FONTS.bold, fontSize: 18, color: COLORS.textMuted },
  overlay: { flex: 1, backgroundColor: COLORS.overlay, justifyContent: 'flex-end' },
  modal: { backgroundColor: COLORS.surface, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, padding: SPACING.xl, paddingBottom: 40, maxHeight: '92%' },
  modalTitle: { ...FONTS.bold, fontSize: 20, color: COLORS.text, marginBottom: 4 },
  modalPatient: { ...FONTS.regular, fontSize: 13, color: COLORS.textSecondary, marginBottom: SPACING.lg },
  sectionLabel: { ...FONTS.semibold, fontSize: 13, color: COLORS.text, marginBottom: SPACING.sm, marginTop: 4 },
  medBlock: { backgroundColor: COLORS.background, borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm },
  medHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  medNum: { ...FONTS.semibold, fontSize: 13, color: COLORS.primary },
  removeText: { ...FONTS.medium, fontSize: 13, color: COLORS.error },
  row: { flexDirection: 'row' },
  addMedBtn: { marginBottom: SPACING.lg },
  addMedText: { ...FONTS.medium, fontSize: 14, color: COLORS.primary },
  bedToggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.background, borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm },
  bedToggleSub: { ...FONTS.regular, fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  bedTypeRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md },
  bedTypeBtn: { flex: 1, paddingVertical: SPACING.sm, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: COLORS.border, alignItems: 'center' },
  bedTypeBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  bedTypeBtnText: { ...FONTS.medium, fontSize: 12, color: COLORS.text },
  bedTypeBtnTextActive: { color: COLORS.white },
  modalBtns: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.sm },
  halfBtn: { flex: 1 },
});
