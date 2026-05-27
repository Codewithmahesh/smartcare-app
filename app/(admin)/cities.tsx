import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, Alert, Switch,
} from 'react-native';
import { api } from '../../lib/api';
import { City } from '../../types';
import Loading from '../../components/ui/Loading';
import EmptyState from '../../components/ui/EmptyState';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { COLORS, FONTS, RADIUS, SHADOW, SPACING } from '../../constants/theme';

export default function CitiesScreen() {
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editTarget, setEditTarget] = useState<City | null>(null);
  const [form, setForm] = useState({ name: '', state: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    try {
      const data = await api.get<City[]>('/cities');
      setCities(data);
    } catch { } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function openAdd() {
    setEditTarget(null);
    setForm({ name: '', state: '' });
    setErrors({});
    setModalVisible(true);
  }

  function openEdit(city: City) {
    setEditTarget(city);
    setForm({ name: city.name, state: city.state });
    setErrors({});
    setModalVisible(true);
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'City name is required';
    if (!form.state.trim()) e.state = 'State is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function saveCity() {
    if (!validate()) return;
    setSaving(true);
    try {
      if (editTarget) {
        const updated = await api.put<City>(`/cities/${editTarget.id}`, {
          name: form.name.trim(), state: form.state.trim(),
        });
        setCities(prev => prev.map(c => c.id === editTarget.id ? updated : c));
      } else {
        const city = await api.post<City>('/cities', { name: form.name.trim(), state: form.state.trim(), isLive: false });
        setCities(prev => [...prev, city]);
      }
      setModalVisible(false);
    } catch {
      Alert.alert('Error', 'Failed to save city. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleLive(city: City) {
    try {
      const updated = await api.put<City>(`/cities/${city.id}`, { isLive: !city.isLive });
      setCities(prev => prev.map(c => c.id === city.id ? updated : c));
    } catch {
      Alert.alert('Error', 'Could not update city status.');
    }
  }

  function confirmDelete(city: City) {
    Alert.alert(
      'Delete City',
      `Delete "${city.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteCity(city) },
      ]
    );
  }

  async function deleteCity(city: City) {
    try {
      await api.delete(`/cities/${city.id}`);
      setCities(prev => prev.filter(c => c.id !== city.id));
    } catch {
      Alert.alert('Error', 'Failed to delete city.');
    }
  }

  if (loading) return <Loading message="Loading cities…" />;

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>Cities</Text>
        <Button label="+ Add City" onPress={openAdd} size="sm" />
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {cities.length === 0 ? (
          <EmptyState icon="🏙️" title="No cities yet" message="Add cities to start registering hospitals." />
        ) : (
          cities.map(city => (
            <View key={city.id} style={[styles.card, SHADOW.sm]}>
              <View style={styles.cityInfo}>
                <Text style={styles.cityName}>{city.name}</Text>
                <Text style={styles.cityState}>{city.state}</Text>
                {(city.waitlistCount ?? 0) > 0 && (
                  <View style={styles.waitlistBadge}>
                    <Text style={styles.waitlistText}>{city.waitlistCount} on waitlist</Text>
                  </View>
                )}
              </View>
              <View style={styles.right}>
                <View style={styles.toggle}>
                  <Text style={[styles.status, { color: city.isLive ? COLORS.success : COLORS.textMuted }]}>
                    {city.isLive ? 'Live' : 'Soon'}
                  </Text>
                  <Switch
                    value={city.isLive}
                    onValueChange={() => toggleLive(city)}
                    trackColor={{ true: COLORS.success, false: COLORS.border }}
                    thumbColor={COLORS.white}
                  />
                </View>
                <View style={styles.actions}>
                  <TouchableOpacity onPress={() => openEdit(city)} style={styles.editBtn}>
                    <Text style={styles.editText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => confirmDelete(city)} style={styles.deleteBtn}>
                    <Text style={styles.deleteText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>{editTarget ? 'Edit City' : 'Add New City'}</Text>
            <Input
              label="City Name"
              value={form.name}
              onChangeText={v => setForm(p => ({ ...p, name: v }))}
              placeholder="e.g. Nanded"
              error={errors.name}
            />
            <Input
              label="State"
              value={form.state}
              onChangeText={v => setForm(p => ({ ...p, state: v }))}
              placeholder="e.g. Maharashtra"
              error={errors.state}
            />
            <View style={styles.modalBtns}>
              <Button label="Cancel" onPress={() => setModalVisible(false)} variant="outline" style={styles.halfBtn} />
              <Button label={editTarget ? 'Save' : 'Add City'} onPress={saveCity} loading={saving} style={styles.halfBtn} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: SPACING.lg, paddingTop: SPACING.xl + 10, backgroundColor: COLORS.surface,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  title: { ...FONTS.bold, fontSize: 22, color: COLORS.text },
  list: { padding: SPACING.lg, gap: SPACING.sm, paddingBottom: SPACING.xxl },
  card: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    padding: SPACING.lg, flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', borderWidth: 1, borderColor: COLORS.border,
  },
  cityInfo: { flex: 1 },
  cityName: { ...FONTS.semibold, fontSize: 16, color: COLORS.text },
  cityState: { ...FONTS.regular, fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  waitlistBadge: {
    backgroundColor: COLORS.warning + '20', borderRadius: 4,
    paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start', marginTop: 6,
  },
  waitlistText: { ...FONTS.medium, fontSize: 11, color: COLORS.warning },
  right: { alignItems: 'flex-end', gap: SPACING.sm },
  toggle: { alignItems: 'center', gap: 4 },
  status: { ...FONTS.medium, fontSize: 11 },
  actions: { flexDirection: 'row', gap: SPACING.sm },
  editBtn: { backgroundColor: COLORS.primaryLight, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  editText: { ...FONTS.semibold, fontSize: 12, color: COLORS.primary },
  deleteBtn: { backgroundColor: COLORS.error + '15', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  deleteText: { ...FONTS.semibold, fontSize: 12, color: COLORS.error },
  overlay: { flex: 1, backgroundColor: COLORS.overlay, justifyContent: 'flex-end' },
  modal: {
    backgroundColor: COLORS.surface, borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl, padding: SPACING.xl, paddingBottom: 40,
  },
  modalTitle: { ...FONTS.bold, fontSize: 20, color: COLORS.text, marginBottom: SPACING.xl },
  modalBtns: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.sm },
  halfBtn: { flex: 1 },
});
