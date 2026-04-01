import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { getDatabase } from '../db/database';
import { TaskCompletionSheet } from '../components/TaskCompletionSheet';
import { COLORS, SPACING, RADIUS, TYPOGRAPHY } from '../constants/theme';

type Task = {
  id: string;
  client_name: string;
  client_email: string | null;
  client_phone: string | null;
  client_country: string | null;
  project_title: string;
  project_description: string | null;
  platform: string;
  status: string;
  budget: number | null;
  currency: string;
  deadline: number | null;
  progress_pct: number;
  revision_count: number;
  created_at: number;
};

type ReferenceFile = {
  id: string;
  name: string;
  file_type: string;
  local_path: string | null;
  remote_url: string | null;
};

type Props = {
  route: any;
  navigation: any;
};

export const TaskDetailsScreen = ({ route, navigation }: Props) => {
  const { taskId } = route.params;
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'brief' | 'references'>('brief');
  const [references, setReferences] = useState<ReferenceFile[]>([]);
  const [showCompletionSheet, setShowCompletionSheet] = useState(false);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    loadTaskDetails();
    loadReferences();
  }, [taskId]);

  const loadTaskDetails = async () => {
    try {
      setLoading(true);
      const db = await getDatabase();
      
      const result = await db.getFirstAsync<Task>(
        `SELECT * FROM tasks WHERE id = ?`,
        [taskId]
      );
      
      if (result) {
        setTask(result);
      } else {
        Alert.alert('Error', 'Task not found');
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error loading task details:', error);
      Alert.alert('Error', 'Failed to load task details');
    } finally {
      setLoading(false);
    }
  };

  const loadReferences = async () => {
    try {
      const db = await getDatabase();
      const result = await db.getAllAsync<ReferenceFile>(
        `SELECT vf.* FROM vault_files vf
         JOIN vault_folders vfld ON vf.folder_id = vfld.id
         WHERE vfld.task_id = ? AND vfld.type IN ('task_active', 'task_archived')`,
        [taskId]
      );
      setReferences(result);
    } catch (error) {
      console.error('Error loading references:', error);
    }
  };

  const handleCompleteTask = async (tags: string[]) => {
    if (!task) return;
    
    try {
      setCompleting(true);
      const db = await getDatabase();
      
      await db.runAsync(
        `UPDATE tasks 
         SET status = 'completed', 
             completed_at = ?,
             pool = 'archived'
         WHERE id = ?`,
        [Math.floor(Date.now() / 1000), task.id]
      );
      
      if (tags.length > 0) {
        for (const tag of tags) {
          await db.runAsync(
            `INSERT INTO task_notes (id, task_id, type, content, created_at)
             VALUES (?, ?, 'milestone', ?, ?)`,
            [Math.random().toString(36).substr(2, 9), task.id, tag, Math.floor(Date.now() / 1000)]
          );
        }
      }
      
      await db.runAsync(
        `UPDATE vault_folders 
         SET type = 'task_archived', archived_at = ?
         WHERE task_id = ? AND type = 'task_active'`,
        [Math.floor(Date.now() / 1000), task.id]
      );
      
      Alert.alert(
        'Task Completed!',
        `"${task.project_title}" has been moved to archive.`,
        [
          {
            text: 'OK',
            onPress: () => {
              setShowCompletionSheet(false);
              navigation.goBack();
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error completing task:', error);
      Alert.alert('Error', 'Failed to complete task');
    } finally {
      setCompleting(false);
    }
  };

  const formatBudget = () => {
    if (!task?.budget) return '—';
    if (task.currency === 'IDR') {
      return `Rp ${task.budget.toLocaleString('id-ID')}`;
    }
    return `$${task.budget.toFixed(2)}`;
  };

  const formatDate = (timestamp: number | null) => {
    if (!timestamp) return 'Not set';
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getStatusColor = () => {
    switch (task?.status) {
      case 'urgent':
        return '#EF4444';
      case 'active':
        return '#10B981';
      case 'pending':
        return '#F59E0B';
      case 'completed':
        return '#6366F1';
      default:
        return '#6B7280';
    }
  };

  const canCreateInvoice = () => {
    return task?.platform === 'direct' || task?.platform === 'manual';
  };

  const renderReferenceItem = ({ item }: { item: ReferenceFile }) => (
    <TouchableOpacity style={styles.referenceItem}>
      <Text style={styles.referenceIcon}>
        {item.file_type === 'image' ? '🖼️' : '📄'}
      </Text>
      <View style={styles.referenceInfo}>
        <Text style={styles.referenceName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.referenceType}>{item.file_type.toUpperCase()}</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary || '#6366F1'} />
        <Text style={{ marginTop: 12, color: '#6B7280' }}>Loading task...</Text>
      </View>
    );
  }

  if (!task) {
    return (
      <View style={styles.centered}>
        <Text style={{ fontSize: 16, color: '#6B7280' }}>Task not found</Text>
        <TouchableOpacity 
          style={{ marginTop: 16, padding: 12, backgroundColor: '#6366F1', borderRadius: 8 }}
          onPress={() => navigation.goBack()}
        >
          <Text style={{ color: 'white' }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {task.project_title}
        </Text>
        <View style={styles.placeholder} />
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'brief' && styles.activeTab]}
          onPress={() => setActiveTab('brief')}
        >
          <Text style={[styles.tabText, activeTab === 'brief' && styles.activeTabText]}>
            Brief
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'references' && styles.activeTab]}
          onPress={() => setActiveTab('references')}
        >
          <Text style={[styles.tabText, activeTab === 'references' && styles.activeTabText]}>
            References ({references.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === 'brief' ? (
          <View>
            {/* Client Info Card */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Client Information</Text>
              <View style={styles.infoRow}>
                <Text style={styles.label}>Name:</Text>
                <Text style={styles.value}>{task.client_name}</Text>
              </View>
              {task.client_email && (
                <View style={styles.infoRow}>
                  <Text style={styles.label}>Email:</Text>
                  <Text style={styles.value}>{task.client_email}</Text>
                </View>
              )}
              {task.client_phone && (
                <View style={styles.infoRow}>
                  <Text style={styles.label}>Phone:</Text>
                  <Text style={styles.value}>{task.client_phone}</Text>
                </View>
              )}
              {task.client_country && (
                <View style={styles.infoRow}>
                  <Text style={styles.label}>Country:</Text>
                  <Text style={styles.value}>{task.client_country}</Text>
                </View>
              )}
            </View>

            {/* Project Details Card */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Project Details</Text>
              <View style={styles.infoRow}>
                <Text style={styles.label}>Platform:</Text>
                <Text style={[styles.value, styles.platformText]}>
                  {task.platform.toUpperCase()}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.label}>Status:</Text>
                <Text style={[styles.value, { color: getStatusColor(), fontWeight: '600' }]}>
                  {task.status.toUpperCase()}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.label}>Budget:</Text>
                <Text style={[styles.value, styles.budgetText]}>{formatBudget()}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.label}>Deadline:</Text>
                <Text style={styles.value}>{formatDate(task.deadline)}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.label}>Progress:</Text>
                <View style={styles.progressContainer}>
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        { width: `${task.progress_pct}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.progressText}>{task.progress_pct}%</Text>
                </View>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.label}>Revisions:</Text>
                <Text style={styles.value}>{task.revision_count}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.label}>Created:</Text>
                <Text style={styles.value}>{formatDate(task.created_at)}</Text>
              </View>
            </View>

            {/* Description Card */}
            {task.project_description && (
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Description</Text>
                <Text style={styles.description}>{task.project_description}</Text>
              </View>
            )}
          </View>
        ) : (
          // References Tab
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Reference Files</Text>
            {references.length > 0 ? (
              <FlatList
                data={references}
                renderItem={renderReferenceItem}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
              />
            ) : (
              <Text style={styles.placeholderText}>
                No reference files yet. Add files from Global Vault.
              </Text>
            )}
          </View>
        )}
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actionBar}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => navigation.navigate('FocusTimer', { taskId: task.id })}
        >
          <Text style={styles.actionButtonText}>Start Focus</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.actionButton, styles.completeButton]}
          onPress={() => setShowCompletionSheet(true)}
          disabled={completing}
        >
          <Text style={styles.actionButtonText}>
            {completing ? '✓ Completing...' : '✓ Complete'}
          </Text>
        </TouchableOpacity>
        {canCreateInvoice() && (
          <TouchableOpacity 
            style={[styles.actionButton, styles.invoiceButton]}
            onPress={() => navigation.navigate('InvoiceBuilder', { taskId: task.id })}
          >
            <Text style={styles.actionButtonText}>Invoice</Text>
          </TouchableOpacity>
        )}
      </View>

      <TaskCompletionSheet
        visible={showCompletionSheet}
        onClose={() => setShowCompletionSheet(false)}
        onComplete={handleCompleteTask}
        taskTitle={task.project_title}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: 28,
    color: '#6366F1',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
  },
  placeholder: {
    width: 40,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#6366F1',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  activeTabText: {
    color: '#6366F1',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'center',
  },
  label: {
    width: 100,
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  value: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
  },
  platformText: {
    fontWeight: '600',
    color: '#6366F1',
  },
  budgetText: {
    fontWeight: '600',
    color: '#10B981',
  },
  progressContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#6366F1',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    minWidth: 40,
  },
  description: {
    fontSize: 14,
    color: '#111827',
    lineHeight: 20,
  },
  referenceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    gap: 12,
  },
  referenceIcon: {
    fontSize: 24,
  },
  referenceInfo: {
    flex: 1,
  },
  referenceName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  referenceType: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  placeholderText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    paddingVertical: 40,
  },
  actionBar: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#6366F1',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  completeButton: {
    backgroundColor: '#10B981',
  },
  invoiceButton: {
    backgroundColor: '#F59E0B',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});