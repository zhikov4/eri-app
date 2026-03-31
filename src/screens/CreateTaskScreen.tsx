import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, ActivityIndicator,
  KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { getDatabase } from '../db/database';
import { useERIStore } from '../store/useERIStore';
import { COLORS, SPACING, RADIUS, TYPOGRAPHY } from '../constants/theme';
import * as Crypto from 'expo-crypto';

type Props = { navigation: any };

export const CreateTaskScreen = ({ navigation }: Props) => {
  const user = useERIStore((state) => state.user);
  const [clientName, setClientName] = useState('');
  const [projectTitle, setProjectTitle] = useState('');
  const [platform, setPlatform] = useState<'direct' | 'fiverr' | 'vgen'>('direct');
  const [budget, setBudget] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const platforms = [
    { key: 'direct', label: 'Direct', color: COLORS.direct },
    { key: 'fiverr', label: 'Fiverr', color: COLORS.fiverr },
    { key: 'vgen', label: 'VGen', color: COLORS.vgen },
  ];

  const handleSave = async () => {
    if (!clientName.trim()) {
      Alert.alert('Required', 'Please enter client name.');
      return;
    }
    if (!projectTitle.trim()) {
      Alert.alert('Required', 'Please enter project title.');
      return;
    }
    if (!user?.id) {
      Alert.alert('Error', 'User not found. Please login again.');
      return;
    }

    setLoading(true);
    try {
      const db = await getDatabase();
      const now = Math.floor(Date.now() / 1000);
      const id = Crypto.randomUUID();

      await db.runAsync(
        `INSERT INTO tasks
          (id, user_id, platform, status, pool, client_name, project_title,
           project_description, budget, currency, progress_pct, priority,
           sort_order, revision_count, tags_json, is_focus_active,
           expiry_notif_sent, created_at, updated_at)
          VALUES (?, ?, ?, 'active', 'active', ?, ?, ?, ?, 'IDR', 0, 0, 0, 0, '[]', 0, 0, ?, ?)`,
        [id, user.id, platform, clientName.trim(), projectTitle.trim(),
         description.trim() || null, budget ? parseFloat(budget) : null, now, now]
      );

      Alert.alert('✅ Success', 'Task created!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (e: any) {
      console.error('Create task error:', e);
      Alert.alert('Error', e.message || 'Failed to save task.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.cancelBtn}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>New Task</Text>
          <TouchableOpacity onPress={handleSave} disabled={loading}>
            {loading
              ? <ActivityIndicator color={COLORS.primary} size="small" />
              : <Text style={styles.saveBtn}>Save</Text>}
          </TouchableOpacity>
        </View>

        {/* Platform */}
        <View style={styles.section}>
          <Text style={styles.label}>Platform</Text>
          <View style={styles.platformRow}>
            {platforms.map((p) => (
              <TouchableOpacity
                key={p.key}
                style={[styles.platformBtn, platform === p.key ? { backgroundColor: p.color + '33', borderColor: p.color } : null]}
                onPress={() => setPlatform(p.key as any)}
              >
                <Text style={[styles.platformLabel, platform === p.key ? { color: p.color } : null]}>
                  {p.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Client Name */}
        <View style={styles.section}>
          <Text style={styles.label}>Client Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Budi Santoso"
            placeholderTextColor={COLORS.textDim}
            value={clientName}
            onChangeText={setClientName}
          />
        </View>

        {/* Project Title */}
        <View style={styles.section}>
          <Text style={styles.label}>Project Title *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Character Design for RPG Game"
            placeholderTextColor={COLORS.textDim}
            value={projectTitle}
            onChangeText={setProjectTitle}
          />
        </View>

        {/* Budget */}
        <View style={styles.section}>
          <Text style={styles.label}>Budget (IDR)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 500000"
            placeholderTextColor={COLORS.textDim}
            value={budget}
            onChangeText={setBudget}
            keyboardType="numeric"
          />
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.label}>Brief / Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Describe the project..."
            placeholderTextColor={COLORS.textDim}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: SPACING.md,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: SPACING.lg,
  },
  title: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
  },
  cancelBtn: {
    color: COLORS.textMuted,
    fontSize: 16,
  },
  saveBtn: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '700',
  },
  section: {
    marginBottom: SPACING.md,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: 14,
    color: COLORS.text,
    fontSize: 15,
  },
  textArea: {
    height: 100,
    paddingTop: 14,
  },
  platformRow: {
    flexDirection: 'row',
    gap: 8,
  },
  platformBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    backgroundColor: COLORS.surface,
  },
  platformLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
});