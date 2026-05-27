import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Modal, Alert,
  TouchableOpacity, KeyboardAvoidingView, Platform, Switch,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { api } from '../../lib/api';
import { City, Hospital } from '../../types';
import Loading from '../../components/ui/Loading';
import EmptyState from '../../components/ui/EmptyState';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Card from '../../components/ui/Card';
import { COLORS, FONTS, RADIUS, SHADOW, SPACING } from '../../constants/theme';

interface Credentials { email: string; password: string; hospitalName: string }
interface AdminForm { name: string; email: string }

const SPECIALTIES = [
  'Cardiology', 'Orthopedics', 'Neurology', 'Pediatrics', 'Gynecology',
  'Ophthalmology', 'ENT', 'Dermatology', 'Psychiatry', 'General Surgery',
  'General Medicine', 'Emergency Medicine', 'Oncology', 'Urology',
];

export default function HospitalsScreen() {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editTarget, setEditTarget] = useState<Hospital | null>(null);
  const [editForm, setEditForm] = useState({ name: '', address: '', phone: '', isActive: true });
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [credentials, setCredentials] = useState<Credentials | null>(null);
  const [addAdminTarget, setAddAdminTarget] = useState<Hospital | null>(null);
  const [adminForm, setAdminForm] = useState<AdminForm>({ name: '', email: '' });
  const [adminSaving, setAdminSaving] = useState(false);

  const [form, setForm] = useState({
    name: '', cityId: '', address: '', phone: '', email: '',
    adminEmail: '', lat: '', lng: '', specialties: [] as string[],
    departments: [{ name: '', specialty: '', doctorName: '' }],
    beds: { general: '10', icu: '5', emergency: '3' },
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    try {
      const [h, c] = await Promise.all([
        api.get<Hospital[]>('/hospitals'),
        api.get<City[]>('/cities'),
      ]);
      setHospitals(h);
      setCities(c);
    } catch { } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  function openEdit(h: Hospital) {
    setEditTarget(h);
    setEditForm({ name: h.name, address: h.address, phone: h.phone ?? '', isActive: h.isActive });
    setEditModalVisible(true);
  }

  async function saveEdit() {
    if (!editTarget) return;
    setSaving(true);
    try {
      const updated = await api.put<Hospital>(`/hospitals/${editTarget.id}`, editForm);
      setHospitals(prev => prev.map(h => h.id === editTarget.id ? updated : h));
      setEditModalVisible(false);
    } catch {
      Alert.alert('Error', 'Failed to update hospital.');
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete(h: Hospital) {
    Alert.alert(
      'Delete Hospital',
      `Delete "${h.name}"? This will also remove all its departments. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteHospital(h) },
      ]
    );
  }

  async function deleteHospital(h: Hospital) {
    try {
      await api.delete(`/hospitals/${h.id}`);
      setHospitals(prev => prev.filter(x => x.id !== h.id));
    } catch {
      Alert.alert('Error', 'Failed to delete hospital.');
    }
  }

  function toggleSpecialty(s: string) {
    setForm(p => ({
      ...p,
      specialties: p.specialties.includes(s)
        ? p.specialties.filter(x => x !== s)
        : [...p.specialties, s],
    }));
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Hospital name required';
    if (!form.cityId) e.cityId = 'Select a city';
    if (!form.address.trim()) e.address = 'Address required';
    if (!form.phone.trim()) e.phone = 'Phone required';
    if (!form.adminEmail.trim()) e.adminEmail = 'Admin email required';
    else if (!/\S+@\S+\.\S+/.test(form.adminEmail)) e.adminEmail = 'Invalid email';
    if (form.specialties.length === 0) e.specialties = 'Select at least one specialty';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function generatePassword() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#';
    return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  }

  async function registerHospital() {
    if (!validate()) return;
    setSaving(true);
    try {
      const password = generatePassword();

      // Create hospital
      const hospital = await api.post<Hospital>('/hospitals', {
        name: form.name.trim(),
        cityId: form.cityId,
        address: form.address.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        lat: parseFloat(form.lat) || 0,
        lng: parseFloat(form.lng) || 0,
        specialties: form.specialties,
        isActive: true,
        beds: {
          general: { total: parseInt(form.beds.general) || 10, occupied: 0 },
          icu: { total: parseInt(form.beds.icu) || 5, occupied: 0 },
          emergency: { total: parseInt(form.beds.emergency) || 3, occupied: 0 },
        },
      });

      // Create hospital admin account
      await api.post('/staff', {
        name: `Admin - ${form.name.trim()}`,
        email: form.adminEmail.trim(),
        password,
        role: 'hospital_admin',
        hospitalId: hospital.id,
        isFirstLogin: true,
      });

      // Create departments
      for (const dept of form.departments.filter(d => d.name.trim())) {
        await api.post(`/hospitals/${hospital.id}/departments`, {
          name: dept.name.trim(),
          specialty: dept.specialty.trim(),
          doctorName: dept.doctorName.trim(),
        });
      }

      setHospitals(prev => [...prev, hospital]);
      setCredentials({ email: form.adminEmail.trim(), password, hospitalName: form.name.trim() });
      setModalVisible(false);
      resetForm();
    } catch (err: any) {
      const msg = err.message?.includes('already registered')
        ? 'An account with this email already exists.'
        : err.message ?? 'Registration failed. Please try again.';
      Alert.alert('Registration Failed', msg);
    } finally {
      setSaving(false);
    }
  }

  async function addAdmin() {
    if (!addAdminTarget) return;
    if (!adminForm.name.trim()) { Alert.alert('Validation', 'Name is required'); return; }
    if (!adminForm.email.trim() || !/\S+@\S+\.\S+/.test(adminForm.email)) {
      Alert.alert('Validation', 'Valid email is required'); return;
    }
    setAdminSaving(true);
    try {
      const password = generatePassword();
      await api.post('/staff', {
        name: adminForm.name.trim(),
        email: adminForm.email.trim(),
        password,
        role: 'hospital_admin',
        hospitalId: addAdminTarget.id,
        isFirstLogin: true,
      });
      setHospitals(prev => prev.map(h => h.id === addAdminTarget.id ? { ...h, adminId: 'assigned' } : h));
      setAddAdminTarget(null);
      setAdminForm({ name: '', email: '' });
      setCredentials({ email: adminForm.email.trim(), password, hospitalName: addAdminTarget.name });
    } catch (err: any) {
      const msg = err.message?.includes('already registered') ? 'An account with this email already exists.' : err.message ?? 'Failed to create admin.';
      Alert.alert('Error', msg);
    } finally {
      setAdminSaving(false);
    }
  }

  function resetForm() {
    setForm({
      name: '', cityId: '', address: '', phone: '', email: '',
      adminEmail: '', lat: '', lng: '', specialties: [],
      departments: [{ name: '', specialty: '', doctorName: '' }],
      beds: { general: '10', icu: '5', emergency: '3' },
    });
    setErrors({});
  }

  if (loading) return <Loading message="Loading hospitals…" />;

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>Hospitals</Text>
        <Button label="+ Register" onPress={() => setModalVisible(true)} size="sm" />
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {hospitals.length === 0 ? (
          <EmptyState icon="🏥" title="No hospitals registered" message="Register your first hospital to get started." />
        ) : (
          hospitals.map(h => {
            const city = cities.find(c => c.id === h.cityId);
            return (
              <View key={h.id} style={[styles.card, SHADOW.sm]}>
                <View style={styles.cardTop}>
                  <View style={styles.hospIcon}>
                    <Text style={{ fontSize: 20 }}>🏥</Text>
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={styles.hospName}>{h.name}</Text>
                    <Text style={styles.hospCity}>{city?.name ?? h.cityId}</Text>
                    <Text style={styles.hospAddress} numberOfLines={1}>{h.address}</Text>
                  </View>
                  <View style={[styles.statusDot, { backgroundColor: h.isActive ? COLORS.success : COLORS.error }]} />
                </View>
                <View style={styles.specRow}>
                  {h.specialties.slice(0, 3).map(s => (
                    <View key={s} style={styles.specChip}>
                      <Text style={styles.specText}>{s}</Text>
                    </View>
                  ))}
                  {h.specialties.length > 3 && (
                    <Text style={styles.moreText}>+{h.specialties.length - 3}</Text>
                  )}
                </View>
                {!h.adminId && (
                  <View style={styles.noAdminBanner}>
                    <Text style={styles.noAdminText}>⚠️ No admin assigned</Text>
                    <TouchableOpacity
                      onPress={() => { setAddAdminTarget(h); setAdminForm({ name: '', email: '' }); }}
                      style={styles.addAdminBtn}
                    >
                      <Text style={styles.addAdminBtnText}>+ Add Admin</Text>
                    </TouchableOpacity>
                  </View>
                )}
                <View style={styles.cardActions}>
                  <TouchableOpacity onPress={() => openEdit(h)} style={styles.editBtn}>
                    <Text style={styles.editText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => confirmDelete(h)} style={styles.deleteBtn}>
                    <Text style={styles.deleteText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Credentials Modal */}
      <Modal visible={!!credentials} animationType="fade" transparent>
        <View style={styles.overlay}>
          <View style={styles.credCard}>
            <Text style={styles.credTitle}>✅ Hospital Registered!</Text>
            <Text style={styles.credSubtitle}>
              Share these credentials with the hospital admin. They will be prompted to change their password on first login.
            </Text>
            <View style={styles.credBox}>
              <Text style={styles.credLabel}>Hospital</Text>
              <Text style={styles.credValue}>{credentials?.hospitalName}</Text>
              <Text style={styles.credLabel}>Admin Email</Text>
              <Text style={styles.credValue}>{credentials?.email}</Text>
              <Text style={styles.credLabel}>Temporary Password</Text>
              <Text style={[styles.credValue, styles.password]}>{credentials?.password}</Text>
            </View>
            <Button label="Done" onPress={() => setCredentials(null)} style={{ marginTop: SPACING.lg }} />
          </View>
        </View>
      </Modal>

      {/* Edit Hospital Modal */}
      <Modal visible={editModalVisible} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.bigModal}>
            <Text style={styles.modalTitle}>Edit Hospital</Text>
            <Input label="Hospital Name" value={editForm.name} onChangeText={v => setEditForm(p => ({ ...p, name: v }))} placeholder="Hospital name" />
            <Input label="Address" value={editForm.address} onChangeText={v => setEditForm(p => ({ ...p, address: v }))} placeholder="Full address" />
            <Input label="Phone" value={editForm.phone} onChangeText={v => setEditForm(p => ({ ...p, phone: v }))} placeholder="+91 XXXXX XXXXX" keyboardType="phone-pad" />
            <View style={styles.activeRow}>
              <Text style={styles.sectionLabel}>Active</Text>
              <Switch
                value={editForm.isActive}
                onValueChange={v => setEditForm(p => ({ ...p, isActive: v }))}
                trackColor={{ true: COLORS.success, false: COLORS.border }}
                thumbColor={COLORS.white}
              />
            </View>
            <View style={styles.modalBtns}>
              <Button label="Cancel" onPress={() => setEditModalVisible(false)} variant="outline" style={styles.halfBtn} />
              <Button label="Save" onPress={saveEdit} loading={saving} style={styles.halfBtn} />
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Admin Modal */}
      <Modal visible={!!addAdminTarget} animationType="slide" transparent>
        <View style={styles.overlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ width: '100%' }}>
            <View style={styles.bigModal}>
              <Text style={styles.modalTitle}>Add Hospital Admin</Text>
              <Text style={styles.addAdminSub}>
                A temporary password will be generated and emailed to the admin automatically.
              </Text>
              <View style={styles.addAdminHospCard}>
                <Text style={styles.addAdminHospName}>{addAdminTarget?.name}</Text>
              </View>
              <Input
                label="Admin Full Name *"
                value={adminForm.name}
                onChangeText={v => setAdminForm(p => ({ ...p, name: v }))}
                placeholder="e.g. Dr. Rajesh Kumar"
              />
              <Input
                label="Admin Email *"
                value={adminForm.email}
                onChangeText={v => setAdminForm(p => ({ ...p, email: v }))}
                placeholder="admin@hospital.com"
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <View style={styles.modalBtns}>
                <Button label="Cancel" onPress={() => setAddAdminTarget(null)} variant="outline" style={styles.halfBtn} />
                <Button label="Create & Send Email" onPress={addAdmin} loading={adminSaving} style={styles.halfBtn} />
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Register Hospital Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.overlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ width: '100%' }}>
            <View style={styles.bigModal}>
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <Text style={styles.modalTitle}>Register Hospital</Text>

                <Input label="Hospital Name *" value={form.name} onChangeText={v => setForm(p => ({ ...p, name: v }))} placeholder="e.g. MGM Hospital" error={errors.name} />
                <Input label="Address *" value={form.address} onChangeText={v => setForm(p => ({ ...p, address: v }))} placeholder="Full address" error={errors.address} />
                <Input label="Phone *" value={form.phone} onChangeText={v => setForm(p => ({ ...p, phone: v }))} placeholder="+91 XXXXX XXXXX" keyboardType="phone-pad" error={errors.phone} />
                <Input label="Hospital Email" value={form.email} onChangeText={v => setForm(p => ({ ...p, email: v }))} placeholder="hospital@example.com" keyboardType="email-address" />

                <Text style={styles.sectionLabel}>Select City *</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.cityRow}>
                  {cities.map(c => (
                    <TouchableOpacity
                      key={c.id}
                      onPress={() => setForm(p => ({ ...p, cityId: c.id }))}
                      style={[styles.cityChip, form.cityId === c.id && styles.cityChipActive]}
                    >
                      <Text style={[styles.cityChipText, form.cityId === c.id && styles.cityChipTextActive]}>
                        {c.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                {errors.cityId && <Text style={styles.errText}>{errors.cityId}</Text>}

                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Input label="Latitude" value={form.lat} onChangeText={v => setForm(p => ({ ...p, lat: v }))} placeholder="e.g. 18.3523" keyboardType="decimal-pad" />
                  </View>
                  <View style={{ width: SPACING.sm }} />
                  <View style={{ flex: 1 }}>
                    <Input label="Longitude" value={form.lng} onChangeText={v => setForm(p => ({ ...p, lng: v }))} placeholder="e.g. 77.3022" keyboardType="decimal-pad" />
                  </View>
                </View>

                <Text style={styles.sectionLabel}>Specialties *</Text>
                <View style={styles.specGrid}>
                  {SPECIALTIES.map(s => (
                    <TouchableOpacity
                      key={s}
                      onPress={() => toggleSpecialty(s)}
                      style={[styles.specOption, form.specialties.includes(s) && styles.specOptionActive]}
                    >
                      <Text style={[styles.specOptionText, form.specialties.includes(s) && styles.specOptionTextActive]}>
                        {s}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {errors.specialties && <Text style={styles.errText}>{errors.specialties}</Text>}

                <Text style={styles.sectionLabel}>Bed Counts</Text>
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Input label="General" value={form.beds.general} onChangeText={v => setForm(p => ({ ...p, beds: { ...p.beds, general: v } }))} keyboardType="number-pad" />
                  </View>
                  <View style={{ width: SPACING.sm }} />
                  <View style={{ flex: 1 }}>
                    <Input label="ICU" value={form.beds.icu} onChangeText={v => setForm(p => ({ ...p, beds: { ...p.beds, icu: v } }))} keyboardType="number-pad" />
                  </View>
                  <View style={{ width: SPACING.sm }} />
                  <View style={{ flex: 1 }}>
                    <Input label="Emergency" value={form.beds.emergency} onChangeText={v => setForm(p => ({ ...p, beds: { ...p.beds, emergency: v } }))} keyboardType="number-pad" />
                  </View>
                </View>

                <Text style={styles.sectionLabel}>Admin Account *</Text>
                <Input label="Admin Email *" value={form.adminEmail} onChangeText={v => setForm(p => ({ ...p, adminEmail: v }))} placeholder="admin@hospital.com" keyboardType="email-address" error={errors.adminEmail} />
                <Text style={styles.helpText}>A temporary password will be generated and displayed after registration.</Text>

                <Text style={styles.sectionLabel}>Departments</Text>
                {form.departments.map((dept, i) => (
                  <View key={i} style={styles.deptBlock}>
                    <Text style={styles.deptNum}>Dept {i + 1}</Text>
                    <Input label="Department Name" value={dept.name} onChangeText={v => { const d = [...form.departments]; d[i].name = v; setForm(p => ({ ...p, departments: d })); }} placeholder="e.g. Cardiology OPD" />
                    <Input label="Specialty" value={dept.specialty} onChangeText={v => { const d = [...form.departments]; d[i].specialty = v; setForm(p => ({ ...p, departments: d })); }} placeholder="e.g. Cardiology" />
                    <Input label="Doctor Name" value={dept.doctorName} onChangeText={v => { const d = [...form.departments]; d[i].doctorName = v; setForm(p => ({ ...p, departments: d })); }} placeholder="Dr. Name" />
                  </View>
                ))}
                <TouchableOpacity onPress={() => setForm(p => ({ ...p, departments: [...p.departments, { name: '', specialty: '', doctorName: '' }] }))}>
                  <Text style={styles.addDept}>+ Add Department</Text>
                </TouchableOpacity>

                <View style={styles.modalBtns}>
                  <Button label="Cancel" onPress={() => { setModalVisible(false); resetForm(); }} variant="outline" style={styles.halfBtn} />
                  <Button label="Register" onPress={registerHospital} loading={saving} style={styles.halfBtn} />
                </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: SPACING.lg, paddingTop: SPACING.xl + 10, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  title: { ...FONTS.bold, fontSize: 22, color: COLORS.text },
  list: { padding: SPACING.lg, gap: SPACING.sm, paddingBottom: SPACING.xxl },
  card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.lg, borderWidth: 1, borderColor: COLORS.border },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: SPACING.sm },
  hospIcon: { width: 44, height: 44, borderRadius: RADIUS.md, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center', marginRight: SPACING.md },
  cardInfo: { flex: 1 },
  hospName: { ...FONTS.semibold, fontSize: 15, color: COLORS.text },
  hospCity: { ...FONTS.regular, fontSize: 13, color: COLORS.primary, marginTop: 2 },
  hospAddress: { ...FONTS.regular, fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  specRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  specChip: { backgroundColor: COLORS.primaryLight, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3 },
  specText: { ...FONTS.regular, fontSize: 11, color: COLORS.primary },
  moreText: { ...FONTS.regular, fontSize: 11, color: COLORS.textMuted },
  noAdminBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.warning + '15', borderRadius: RADIUS.sm, paddingHorizontal: SPACING.sm, paddingVertical: 6, marginTop: SPACING.sm, borderWidth: 1, borderColor: COLORS.warning + '40' },
  noAdminText: { ...FONTS.medium, fontSize: 12, color: COLORS.warning },
  addAdminBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.sm, paddingHorizontal: 10, paddingVertical: 4 },
  addAdminBtnText: { ...FONTS.semibold, fontSize: 12, color: COLORS.white },
  addAdminSub: { ...FONTS.regular, fontSize: 13, color: COLORS.textSecondary, marginBottom: SPACING.md, lineHeight: 20 },
  addAdminHospCard: { backgroundColor: COLORS.primaryLight, borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.md, borderWidth: 1, borderColor: COLORS.primaryMid },
  addAdminHospName: { ...FONTS.semibold, fontSize: 15, color: COLORS.primary },
  cardActions: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.sm, justifyContent: 'flex-end' },
  editBtn: { backgroundColor: COLORS.primaryLight, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 5 },
  editText: { ...FONTS.semibold, fontSize: 12, color: COLORS.primary },
  deleteBtn: { backgroundColor: COLORS.error + '15', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 5 },
  deleteText: { ...FONTS.semibold, fontSize: 12, color: COLORS.error },
  activeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: SPACING.sm },
  overlay: { flex: 1, backgroundColor: COLORS.overlay, justifyContent: 'flex-end' },
  credCard: { backgroundColor: COLORS.surface, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, padding: SPACING.xl, paddingBottom: 40 },
  credTitle: { ...FONTS.bold, fontSize: 20, color: COLORS.text, marginBottom: 8 },
  credSubtitle: { ...FONTS.regular, fontSize: 13, color: COLORS.textSecondary, marginBottom: SPACING.lg, lineHeight: 20 },
  credBox: { backgroundColor: COLORS.background, borderRadius: RADIUS.md, padding: SPACING.md },
  credLabel: { ...FONTS.medium, fontSize: 11, color: COLORS.textMuted, marginTop: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  credValue: { ...FONTS.semibold, fontSize: 15, color: COLORS.text, marginTop: 2 },
  password: { color: COLORS.primary, ...FONTS.bold, fontSize: 18, letterSpacing: 1 },
  bigModal: { backgroundColor: COLORS.surface, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, padding: SPACING.xl, paddingBottom: 40, maxHeight: '92%' },
  modalTitle: { ...FONTS.bold, fontSize: 20, color: COLORS.text, marginBottom: SPACING.lg },
  sectionLabel: { ...FONTS.semibold, fontSize: 13, color: COLORS.text, marginBottom: SPACING.sm, marginTop: SPACING.sm },
  cityRow: { marginBottom: SPACING.sm },
  cityChip: { borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.full, paddingHorizontal: 14, paddingVertical: 6, marginRight: SPACING.sm },
  cityChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  cityChipText: { ...FONTS.medium, fontSize: 13, color: COLORS.text },
  cityChipTextActive: { color: COLORS.white },
  errText: { ...FONTS.regular, fontSize: 12, color: COLORS.error, marginBottom: SPACING.sm },
  row: { flexDirection: 'row' },
  specGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.sm },
  specOption: { borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.full, paddingHorizontal: 12, paddingVertical: 5 },
  specOptionActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  specOptionText: { ...FONTS.regular, fontSize: 12, color: COLORS.text },
  specOptionTextActive: { color: COLORS.white },
  helpText: { ...FONTS.regular, fontSize: 12, color: COLORS.textSecondary, marginBottom: SPACING.md, lineHeight: 18 },
  deptBlock: { backgroundColor: COLORS.background, borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm },
  deptNum: { ...FONTS.semibold, fontSize: 13, color: COLORS.primary, marginBottom: 8 },
  addDept: { ...FONTS.medium, fontSize: 14, color: COLORS.primary, marginBottom: SPACING.lg },
  modalBtns: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.sm },
  halfBtn: { flex: 1 },
});
