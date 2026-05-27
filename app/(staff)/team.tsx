import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Modal, Alert,
  TouchableOpacity,
} from 'react-native';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { StaffMember, Department } from '../../types';
import Loading from '../../components/ui/Loading';
import EmptyState from '../../components/ui/EmptyState';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { COLORS, FONTS, RADIUS, SHADOW, SPACING } from '../../constants/theme';

interface NewCredentials { name: string; email: string; password: string }

export default function TeamScreen() {
  const { appUser } = useAuth();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [credentials, setCredentials] = useState<NewCredentials | null>(null);

  const [form, setForm] = useState({ name: '', email: '', role: 'staff' as 'staff' | 'hospital_admin', deptId: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [editTarget, setEditTarget] = useState<StaffMember | null>(null);
  const [editForm, setEditForm] = useState({ name: '', role: 'staff' as 'staff' | 'hospital_admin', deptId: '' });
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editSaving, setEditSaving] = useState(false);

  const hospitalId = appUser?.hospitalId ?? '';

  const load = useCallback(async () => {
    if (!hospitalId) return;
    try {
      const [staffList, depts] = await Promise.all([
        api.get<StaffMember[]>(`/staff/${hospitalId}`),
        api.get<Department[]>(`/hospitals/${hospitalId}/departments`),
      ]);
      setStaff(staffList);
      setDepartments(depts);
    } catch { } finally {
      setLoading(false);
    }
  }, [hospitalId]);

  useEffect(() => { load(); }, [load]);

  function validate() {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Name required';
    if (!form.email.trim()) e.email = 'Email required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Invalid email';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function generatePassword() {
    const c = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#';
    return Array.from({ length: 10 }, () => c[Math.floor(Math.random() * c.length)]).join('');
  }

  async function addStaff() {
    if (!validate()) return;
    setSaving(true);
    try {
      const password = generatePassword();
      const member = await api.post<StaffMember>('/staff', {
        name: form.name.trim(),
        email: form.email.trim(),
        password,
        role: form.role,
        hospitalId,
        deptId: form.deptId || null,
      });
      setStaff(prev => [...prev, member]);
      setCredentials({ name: form.name.trim(), email: form.email.trim(), password });
      setModalVisible(false);
      setForm({ name: '', email: '', role: 'staff', deptId: '' });
    } catch (err: any) {
      const msg = err.message?.includes('already registered')
        ? 'An account with this email already exists.'
        : 'Failed to add staff member.';
      Alert.alert('Error', msg);
    } finally { setSaving(false); }
  }

  function openEdit(member: StaffMember) {
    setEditTarget(member);
    setEditForm({ name: member.name, role: member.role as 'staff' | 'hospital_admin', deptId: member.deptId ?? '' });
    setEditModalVisible(true);
  }

  async function saveEdit() {
    if (!editTarget) return;
    setEditSaving(true);
    try {
      const updated = await api.put<StaffMember>(`/staff/${editTarget.uid}`, {
        name: editForm.name.trim(),
        role: editForm.role,
        deptId: editForm.deptId || null,
      });
      setStaff(prev => prev.map(s => s.uid === editTarget.uid ? { ...s, ...updated } : s));
      setEditModalVisible(false);
    } catch {
      Alert.alert('Error', 'Failed to update staff member.');
    } finally {
      setEditSaving(false);
    }
  }

  async function removeStaff(member: StaffMember) {
    if (member.uid === appUser?.uid) { Alert.alert('Error', 'You cannot remove yourself.'); return; }
    Alert.alert('Remove Staff', `Remove ${member.name} from the team?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/staff/${member.uid}`);
            setStaff(prev => prev.filter(s => s.uid !== member.uid));
          } catch { Alert.alert('Error', 'Failed to remove staff member.'); }
        },
      },
    ]);
  }

  if (loading) return <Loading message="Loading team…" />;

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>Team</Text>
        <Button label="+ Add Staff" onPress={() => setModalVisible(true)} size="sm" />
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {staff.length === 0 ? (
          <EmptyState icon="👥" title="No staff yet" message="Add your first team member." />
        ) : (
          staff.map(member => (
            <View key={member.uid} style={[styles.card, SHADOW.sm]}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{member.name?.[0]?.toUpperCase() ?? '?'}</Text>
              </View>
              <View style={styles.info}>
                <View style={styles.nameRow}>
                  <Text style={styles.memberName}>{member.name}</Text>
                  {member.isFirstLogin && (
                    <View style={styles.firstLoginBadge}>
                      <Text style={styles.firstLoginText}>Pending Login</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.memberEmail}>{member.email}</Text>
                <View style={[styles.rolePill, member.role === 'hospital_admin' && styles.adminPill]}>
                  <Text style={[styles.roleText, member.role === 'hospital_admin' && styles.adminText]}>
                    {member.role === 'hospital_admin' ? 'Admin' : 'Staff'}
                  </Text>
                </View>
              </View>
              <View style={styles.cardActions}>
                <TouchableOpacity onPress={() => openEdit(member)} style={styles.editBtn}>
                  <Text style={styles.editText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => removeStaff(member)} style={styles.removeBtn}>
                  <Text style={styles.removeText}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Add Staff Member</Text>
            <Input label="Full Name *" value={form.name} onChangeText={v => setForm(p => ({ ...p, name: v }))} placeholder="Dr. Name or Staff Name" error={errors.name} />
            <Input label="Email *" value={form.email} onChangeText={v => setForm(p => ({ ...p, email: v }))} placeholder="staff@hospital.com" keyboardType="email-address" error={errors.email} />

            <Text style={styles.fieldLabel}>Role</Text>
            <View style={styles.roleRow}>
              {(['staff', 'hospital_admin'] as const).map(r => (
                <TouchableOpacity key={r} onPress={() => setForm(p => ({ ...p, role: r }))} style={[styles.roleOption, form.role === r && styles.roleOptionActive]}>
                  <Text style={[styles.roleOptionText, form.role === r && styles.roleOptionTextActive]}>
                    {r === 'hospital_admin' ? 'Admin' : 'Staff'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {departments.length > 0 && (
              <>
                <Text style={styles.fieldLabel}>Department (optional)</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.deptRow}>
                  {[{ id: '', name: 'All Depts' }, ...departments].map(d => (
                    <TouchableOpacity key={d.id} onPress={() => setForm(p => ({ ...p, deptId: d.id }))} style={[styles.deptChip, form.deptId === d.id && styles.deptChipActive]}>
                      <Text style={[styles.deptChipText, form.deptId === d.id && styles.deptChipTextActive]}>{d.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}

            <View style={styles.modalBtns}>
              <Button label="Cancel" onPress={() => setModalVisible(false)} variant="outline" style={styles.halfBtn} />
              <Button label="Add" onPress={addStaff} loading={saving} style={styles.halfBtn} />
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Staff Modal */}
      <Modal visible={editModalVisible} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Edit Staff Member</Text>
            <Input
              label="Full Name"
              value={editForm.name}
              onChangeText={v => setEditForm(p => ({ ...p, name: v }))}
              placeholder="Name"
            />
            <Text style={styles.fieldLabel}>Role</Text>
            <View style={styles.roleRow}>
              {(['staff', 'hospital_admin'] as const).map(r => (
                <TouchableOpacity key={r} onPress={() => setEditForm(p => ({ ...p, role: r }))} style={[styles.roleOption, editForm.role === r && styles.roleOptionActive]}>
                  <Text style={[styles.roleOptionText, editForm.role === r && styles.roleOptionTextActive]}>
                    {r === 'hospital_admin' ? 'Admin' : 'Staff'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {departments.length > 0 && (
              <>
                <Text style={styles.fieldLabel}>Department (optional)</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.deptRow}>
                  {[{ id: '', name: 'All Depts' }, ...departments].map(d => (
                    <TouchableOpacity key={d.id} onPress={() => setEditForm(p => ({ ...p, deptId: d.id }))} style={[styles.deptChip, editForm.deptId === d.id && styles.deptChipActive]}>
                      <Text style={[styles.deptChipText, editForm.deptId === d.id && styles.deptChipTextActive]}>{d.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}
            <View style={styles.modalBtns}>
              <Button label="Cancel" onPress={() => setEditModalVisible(false)} variant="outline" style={styles.halfBtn} />
              <Button label="Save" onPress={saveEdit} loading={editSaving} style={styles.halfBtn} />
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={!!credentials} animationType="fade" transparent>
        <View style={styles.overlay}>
          <View style={styles.credCard}>
            <Text style={styles.credTitle}>✅ Staff Added!</Text>
            <Text style={styles.credSub}>Share these credentials with {credentials?.name}.</Text>
            <View style={styles.credBox}>
              <Text style={styles.credLabel}>EMAIL</Text>
              <Text style={styles.credVal}>{credentials?.email}</Text>
              <Text style={styles.credLabel}>TEMP PASSWORD</Text>
              <Text style={[styles.credVal, { color: COLORS.primary, ...FONTS.bold, fontSize: 18, letterSpacing: 1 }]}>{credentials?.password}</Text>
            </View>
            <Button label="Done" onPress={() => setCredentials(null)} style={{ marginTop: SPACING.lg }} />
          </View>
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
  card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.md, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  avatar: { width: 44, height: 44, borderRadius: RADIUS.full, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center', marginRight: SPACING.md },
  avatarText: { ...FONTS.bold, fontSize: 18, color: COLORS.primary },
  info: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  memberName: { ...FONTS.semibold, fontSize: 15, color: COLORS.text },
  firstLoginBadge: { backgroundColor: COLORS.warning + '20', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  firstLoginText: { ...FONTS.medium, fontSize: 10, color: COLORS.warning },
  memberEmail: { ...FONTS.regular, fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  rolePill: { alignSelf: 'flex-start', backgroundColor: COLORS.border, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2, marginTop: 6 },
  adminPill: { backgroundColor: COLORS.primaryLight },
  roleText: { ...FONTS.medium, fontSize: 11, color: COLORS.textSecondary },
  adminText: { color: COLORS.primary },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  editBtn: { backgroundColor: COLORS.primaryLight, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5 },
  editText: { ...FONTS.semibold, fontSize: 12, color: COLORS.primary },
  removeBtn: { padding: SPACING.sm },
  removeText: { ...FONTS.bold, fontSize: 16, color: COLORS.textMuted },
  overlay: { flex: 1, backgroundColor: COLORS.overlay, justifyContent: 'flex-end' },
  modal: { backgroundColor: COLORS.surface, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, padding: SPACING.xl, paddingBottom: 40 },
  modalTitle: { ...FONTS.bold, fontSize: 20, color: COLORS.text, marginBottom: SPACING.lg },
  fieldLabel: { ...FONTS.medium, fontSize: 13, color: COLORS.text, marginBottom: SPACING.sm },
  roleRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md },
  roleOption: { flex: 1, padding: SPACING.md, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: COLORS.border, alignItems: 'center' },
  roleOptionActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  roleOptionText: { ...FONTS.medium, fontSize: 14, color: COLORS.text },
  roleOptionTextActive: { color: COLORS.white },
  deptRow: { marginBottom: SPACING.md },
  deptChip: { borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.full, paddingHorizontal: 14, paddingVertical: 6, marginRight: SPACING.sm },
  deptChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  deptChipText: { ...FONTS.medium, fontSize: 12, color: COLORS.text },
  deptChipTextActive: { color: COLORS.white },
  modalBtns: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.sm },
  halfBtn: { flex: 1 },
  credCard: { backgroundColor: COLORS.surface, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, padding: SPACING.xl, paddingBottom: 40 },
  credTitle: { ...FONTS.bold, fontSize: 20, color: COLORS.text, marginBottom: 8 },
  credSub: { ...FONTS.regular, fontSize: 13, color: COLORS.textSecondary, marginBottom: SPACING.lg },
  credBox: { backgroundColor: COLORS.background, borderRadius: RADIUS.md, padding: SPACING.md },
  credLabel: { ...FONTS.medium, fontSize: 11, color: COLORS.textMuted, marginTop: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  credVal: { ...FONTS.semibold, fontSize: 15, color: COLORS.text, marginTop: 2 },
});
