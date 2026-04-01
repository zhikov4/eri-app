import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { getDatabase } from '../db/database';
import { useERIStore } from '../store/useERIStore';
import { COLORS, SPACING, RADIUS, TYPOGRAPHY } from '../constants/theme';
import { createTaskVaultFolder } from '../db/queries/vault';

type Props = {
  navigation: any;
};

type PlatformType = 'fiverr' | 'vgen' | 'direct' | 'manual';

export const CreateTaskScreen = ({ navigation }: Props) => {
  const user = useERIStore((state) => state.user);
  const [loading, setLoading] = useState(false);
  
  // Form fields
  const [platform, setPlatform] = useState<PlatformType>('direct');
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientCountry, setClientCountry] = useState('');
  const [clientIg, setClientIg] = useState('');
  const [projectTitle, setProjectTitle] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [projectGoal, setProjectGoal] = useState('');
  const [budget, setBudget] = useState('');
  const [currency, setCurrency] = useState<'IDR' | 'USD'>('IDR');
  const [deadline, setDeadline] = useState('');
  const [platformOrderId, setPlatformOrderId] = useState('');

  const handleCreateTask = async () => {
    // Validation
    if (!clientName.trim()) {
      Alert.alert('Error', 'Client name is required');
      return;
    }
    if (!projectTitle.trim()) {
      Alert.alert('Error', 'Project title is required');
      return;
    }
    if (platform === 'direct' && !clientEmail.trim()) {
      Alert.alert('Error', 'Client email is required for Direct tasks');
      return;
    }

    if (!user?.id) {
      Alert.alert('Error', 'User not logged in');
      return;
    }

    setLoading(true);

    try {
      const db = await getDatabase();
      const now = Math.floor(Date.now() / 1000);
      const taskId = Math.random().toString(36).substr(2, 9);
      
      // Parse budget
      const budgetValue = budget ? parseFloat(budget) : null;
      
      // Parse deadline (if provided, assume it's days from now)
      let deadlineTimestamp = null;
      if (deadline && !isNaN(parseInt(deadline))) {
        const days = parseInt(deadline);
        deadlineTimestamp = now + (days * 24 * 60 * 60);
      }

      // Auto-detect currency based on client country
      let detectedCurrency = currency;
      if (clientCountry?.toLowerCase() === 'indonesia' || clientCountry?.toLowerCase() === 'id') {
        detectedCurrency = 'IDR';
      } else if (clientCountry && clientCountry.trim() !== '') {
        detectedCurrency = 'USD';
      }

      // Insert task
      await db.runAsync(
        `INSERT INTO tasks (
          id, user_id, platform, platform_order_id, status, pool,
          client_name, client_email, client_phone, client_country, client_ig,
          project_title, project_description, project_goal,
          budget, currency, deadline, progress_pct, priority,
          revision_count, tags_json, is_focus_active, focus_activated_at,
          last_activity_at, expiry_notif_sent, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          taskId,
          user.id,
          platform,
          platform === 'fiverr' || platform === 'vgen' ? platformOrderId || null : null,
          'active',
          'active',
          clientName.trim(),
          clientEmail.trim() || null,
          clientPhone.trim() || null,
          clientCountry.trim() || null,
          clientIg.trim() || null,
          projectTitle.trim(),
          projectDescription.trim() || null,
          projectGoal.trim() || null,
          budgetValue,
          detectedCurrency,
          deadlineTimestamp,
          0, // progress_pct
          0, // priority
          0, // revision_count
          '[]', // tags_json
          0, // is_focus_active
          null, // focus_activated_at
          null, // last_activity_at
          0, // expiry_notif_sent
          now,
          now
        ]
      );

      // Create vault folder for this task (Phase 1C)
      await createTaskVaultFolder(user.id, taskId, projectTitle.trim());

      Alert.alert(
        'Success',
        'Task created successfully!',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error: any) {
      console.error('Error creating task:', error);
      Alert.alert('Error', 'Failed to create task: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const platforms: { id: PlatformType; label: string; icon: string }[] = [
    { id: 'direct', label: 'Direct', icon: '✍️' },
    { id: 'manual', label: 'Manual', icon: '📝' },
    { id: 'fiverr', label: 'Fiverr', icon: '🎯' },
    { id: 'vgen', label: 'VGen', icon: '🎨' },
  ];

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create New Task</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Platform Selection */}
        <View style={styles.section}>
          <Text style={styles.label}>Platform <Text style={styles.required}>*</Text></Text>
          <View style={styles.platformContainer}>
            {platforms.map((p) => (
              <TouchableOpacity
                key={p.id}
                style={[
                  styles.platformOption,
                  platform === p.id && styles.platformOptionActive,
                ]}
                onPress={() => setPlatform(p.id)}
              >
                <Text style={styles.platformIcon}>{p.icon}</Text>
                <Text
                  style={[
                    styles.platformLabel,
                    platform === p.id && styles.platformLabelActive,
                  ]}
                >
                  {p.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Platform Order ID (for Fiverr/VGen) */}
        {(platform === 'fiverr' || platform === 'vgen') && (
          <View style={styles.section}>
            <Text style={styles.label}>Order ID / Reference</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., #FV-12345"
              placeholderTextColor={COLORS.textMuted}
              value={platformOrderId}
              onChangeText={setPlatformOrderId}
            />
            <Text style={styles.hint}>
              This helps you track which order this task belongs to
            </Text>
          </View>
        )}

        {/* Client Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Client Information</Text>
          
          <Text style={styles.label}>Client Name <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., John Doe"
            placeholderTextColor={COLORS.textMuted}
            value={clientName}
            onChangeText={setClientName}
          />

          <Text style={styles.label}>
            Client Email {platform === 'direct' && <Text style={styles.required}>*</Text>}
          </Text>
          <TextInput
            style={styles.input}
            placeholder="client@example.com"
            placeholderTextColor={COLORS.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
            value={clientEmail}
            onChangeText={setClientEmail}
          />

          <Text style={styles.label}>Client Phone (WhatsApp)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., +62 812 3456 7890"
            placeholderTextColor={COLORS.textMuted}
            keyboardType="phone-pad"
            value={clientPhone}
            onChangeText={setClientPhone}
          />

          <Text style={styles.label}>Client Country</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Indonesia, USA"
            placeholderTextColor={COLORS.textMuted}
            value={clientCountry}
            onChangeText={setClientCountry}
          />
          <Text style={styles.hint}>
            {clientCountry?.toLowerCase().includes('indonesia') 
              ? '✓ Currency will default to IDR, invoice in Bahasa Indonesia' 
              : clientCountry && clientCountry.trim() !== ''
              ? '✓ Currency will default to USD, invoice in English'
              : 'Country will auto-detect currency and invoice language'}
          </Text>

          <Text style={styles.label}>Instagram (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="@username"
            placeholderTextColor={COLORS.textMuted}
            value={clientIg}
            onChangeText={setClientIg}
          />
        </View>

        {/* Project Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Project Details</Text>
          
          <Text style={styles.label}>Project Title <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Character Design for Game"
            placeholderTextColor={COLORS.textMuted}
            value={projectTitle}
            onChangeText={setProjectTitle}
          />

          <Text style={styles.label}>Description / Brief</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Describe the project requirements, style preferences, etc."
            placeholderTextColor={COLORS.textMuted}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            value={projectDescription}
            onChangeText={setProjectDescription}
          />

          <Text style={styles.label}>Project Goal / Deliverables</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="What needs to be delivered? e.g., 3 character concepts, final illustration with background"
            placeholderTextColor={COLORS.textMuted}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            value={projectGoal}
            onChangeText={setProjectGoal}
          />
        </View>

        {/* Financial & Timeline */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Financial & Timeline</Text>
          
          <View style={styles.row}>
            <View style={styles.rowItem}>
              <Text style={styles.label}>Budget</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="numeric"
                value={budget}
                onChangeText={setBudget}
              />
            </View>
            <View style={styles.rowItem}>
              <Text style={styles.label}>Currency</Text>
              <View style={styles.currencyContainer}>
                <TouchableOpacity
                  style={[styles.currencyOption, currency === 'IDR' && styles.currencyOptionActive]}
                  onPress={() => setCurrency('IDR')}
                >
                  <Text style={[styles.currencyText, currency === 'IDR' && styles.currencyTextActive]}>
                    IDR
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.currencyOption, currency === 'USD' && styles.currencyOptionActive]}
                  onPress={() => setCurrency('USD')}
                >
                  <Text style={[styles.currencyText, currency === 'USD' && styles.currencyTextActive]}>
                    USD
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <Text style={styles.label}>Deadline (days from now)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., 7 (days)"
            placeholderTextColor={COLORS.textMuted}
            keyboardType="numeric"
            value={deadline}
            onChangeText={setDeadline}
          />
          <Text style={styles.hint}>
            Leave empty if no deadline. Will be shown in task list.
          </Text>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleCreateTask}
          disabled={loading}
        >
          <Text style={styles.submitButtonText}>
            {loading ? 'Creating...' : 'Create Task'}
          </Text>
        </TouchableOpacity>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background || '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: SPACING?.md || 16,
    paddingHorizontal: SPACING?.md || 16,
    backgroundColor: COLORS.surface || '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border || '#E5E7EB',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: 28,
    color: COLORS.primary || '#6366F1',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text || '#111827',
    textAlign: 'center',
  },
  placeholder: {
    width: 40,
  },
  section: {
    paddingHorizontal: SPACING?.md || 16,
    paddingVertical: SPACING?.md || 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border || '#E5E7EB',
    backgroundColor: COLORS.surface || '#FFFFFF',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text || '#111827',
    marginBottom: SPACING?.md || 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.text || '#111827',
    marginBottom: SPACING?.xs || 8,
  },
  required: {
    color: COLORS.danger || '#EF4444',
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border || '#E5E7EB',
    borderRadius: RADIUS?.md || 8,
    paddingHorizontal: SPACING?.sm || 12,
    paddingVertical: SPACING?.sm || 12,
    fontSize: 15,
    color: COLORS.text || '#111827',
    marginBottom: SPACING?.md || 16,
    backgroundColor: COLORS.background || '#FFFFFF',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: SPACING?.sm || 12,
    marginBottom: SPACING?.md || 16,
  },
  rowItem: {
    flex: 1,
  },
  platformContainer: {
    flexDirection: 'row',
    gap: SPACING?.sm || 12,
    marginBottom: SPACING?.md || 16,
  },
  platformOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING?.sm || 12,
    borderRadius: RADIUS?.md || 8,
    borderWidth: 1,
    borderColor: COLORS.border || '#E5E7EB',
    backgroundColor: COLORS.background || '#FFFFFF',
  },
  platformOptionActive: {
    borderColor: COLORS.primary || '#6366F1',
    backgroundColor: COLORS.primaryDim || '#EEF2FF',
  },
  platformIcon: {
    fontSize: 20,
    marginBottom: SPACING?.xs || 4,
  },
  platformLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textMuted || '#6B7280',
  },
  platformLabelActive: {
    color: COLORS.primary || '#6366F1',
  },
  currencyContainer: {
    flexDirection: 'row',
    gap: SPACING?.xs || 8,
  },
  currencyOption: {
    flex: 1,
    paddingVertical: SPACING?.sm || 12,
    alignItems: 'center',
    borderRadius: RADIUS?.md || 8,
    borderWidth: 1,
    borderColor: COLORS.border || '#E5E7EB',
    backgroundColor: COLORS.background || '#FFFFFF',
  },
  currencyOptionActive: {
    borderColor: COLORS.primary || '#6366F1',
    backgroundColor: COLORS.primaryDim || '#EEF2FF',
  },
  currencyText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textMuted || '#6B7280',
  },
  currencyTextActive: {
    color: COLORS.primary || '#6366F1',
  },
  hint: {
    fontSize: 11,
    color: COLORS.textMuted || '#6B7280',
    marginTop: -SPACING?.sm || -12,
    marginBottom: SPACING?.md || 16,
  },
  submitButton: {
    margin: SPACING?.md || 16,
    paddingVertical: SPACING?.md || 16,
    backgroundColor: COLORS.primary || '#6366F1',
    borderRadius: RADIUS?.lg || 12,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  bottomSpacer: {
    height: 40,
  },
});