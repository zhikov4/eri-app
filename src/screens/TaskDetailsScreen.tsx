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
  Image,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getDatabase } from '../db/database';
import { TaskCompletionSheet } from '../components/TaskCompletionSheet';
import { COLORS, SPACING, RADIUS, TYPOGRAPHY } from '../constants/theme';
import { File, Directory, Paths } from 'expo-file-system';

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
  vault_folder_id: string | null;
};

type ReferenceFile = {
  id: string;
  folder_id: string;
  name: string;
  file_type: string;
  local_path: string | null;
  remote_url: string | null;
  thumbnail_path: string | null;
  file_size_bytes: number;
  created_at: number;
};

type VaultFile = {
  id: string;
  folder_id: string;
  name: string;
  file_type: string;
  local_path: string | null;
  remote_url: string | null;
  thumbnail_path: string | null;
  file_size_bytes: number;
  folder_name: string;
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
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [showVaultPicker, setShowVaultPicker] = useState(false);
  const [vaultFiles, setVaultFiles] = useState<VaultFile[]>([]);
  const [loadingVault, setLoadingVault] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());

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
         WHERE vfld.task_id = ? AND vfld.type IN ('task_active', 'task_archived')
         ORDER BY vf.created_at DESC`,
        [taskId]
      );
      setReferences(result);
    } catch (error) {
      console.error('Error loading references:', error);
    }
  };

  const loadVaultFiles = async () => {
    setLoadingVault(true);
    try {
      const db = await getDatabase();
      const result = await db.getAllAsync<VaultFile>(
        `SELECT vf.*, vfld.name as folder_name FROM vault_files vf
         JOIN vault_folders vfld ON vf.folder_id = vfld.id
         WHERE vfld.type = 'personal'
         ORDER BY vf.created_at DESC`,
        []
      );
      setVaultFiles(result);
    } catch (error) {
      console.error('Error loading vault files:', error);
      Alert.alert('Error', 'Failed to load vault files');
    } finally {
      setLoadingVault(false);
    }
  };

  const importFilesToTask = async () => {
    if (selectedFiles.size === 0) {
      Alert.alert('No Selection', 'Please select at least one file to import');
      return;
    }

    try {
      const db = await getDatabase();
      const now = Math.floor(Date.now() / 1000);
      let taskFolderId = task?.vault_folder_id;

      if (!taskFolderId) {
        taskFolderId = Math.random().toString(36).substr(2, 9);
        await db.runAsync(
          `INSERT INTO vault_folders (id, user_id, type, task_id, name, tags_json, sort_order, created_at, updated_at)
           VALUES (?, (SELECT user_id FROM tasks WHERE id = ?), 'task_active', ?, ?, '[]', 0, ?, ?)`,
          [taskFolderId, taskId, taskId, task?.project_title || 'Task References', now, now]
        );
        await db.runAsync(
          `UPDATE tasks SET vault_folder_id = ? WHERE id = ?`,
          [taskFolderId, taskId]
        );
      }

      const vaultDir = new Directory(Paths.document, 'vault');
      const taskDir = new Directory(vaultDir, taskFolderId);
      await taskDir.create({ intermediates: true, idempotent: true });

      for (const fileId of selectedFiles) {
        const sourceFile = vaultFiles.find(f => f.id === fileId);
        if (!sourceFile || !sourceFile.local_path) continue;

        const originalName = sourceFile.name;
        const ext = originalName.split('.').pop();
        const baseName = originalName.substring(0, originalName.lastIndexOf('.'));
        let fileName = originalName;
        let counter = 1;
        let destFile = new File(taskDir, fileName);
        while (await destFile.exists) {
          fileName = `${baseName}_${counter}.${ext}`;
          destFile = new File(taskDir, fileName);
          counter++;
        }

        const sourceFileObj = new File(sourceFile.local_path);
        await sourceFileObj.copy(destFile);
        if (!(await destFile.exists)) throw new Error(`Failed to copy file: ${sourceFile.name}`);
        const destInfo = await destFile.info();

        const newFileId = Math.random().toString(36).substr(2, 9);
        await db.runAsync(
          `INSERT INTO vault_files (
            id, folder_id, user_id, name, file_type, local_path, remote_url,
            file_size_bytes, width_px, height_px, thumbnail_path, is_pinned,
            source_folder_id, created_at, synced_at
          ) VALUES (?, ?, (SELECT user_id FROM tasks WHERE id = ?), ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`,
          [
            newFileId, taskFolderId, taskId,
            fileName, sourceFile.file_type, destFile.uri, sourceFile.remote_url,
            destInfo.size || sourceFile.file_size_bytes, null, null, sourceFile.thumbnail_path,
            sourceFile.folder_id, now, null
          ]
        );
      }

      Alert.alert(
        'Success',
        `${selectedFiles.size} file(s) imported to task references`,
        [{ text: 'OK', onPress: () => {
          setShowVaultPicker(false);
          setSelectedFiles(new Set());
          loadReferences();
        }}]
      );
    } catch (error) {
      console.error('Error importing files:', error);
      Alert.alert('Error', 'Failed to import files');
    }
  };

  const toggleFileSelection = (fileId: string) => {
    const newSelection = new Set(selectedFiles);
    if (newSelection.has(fileId)) newSelection.delete(fileId);
    else newSelection.add(fileId);
    setSelectedFiles(newSelection);
  };

  const handleCompleteTask = async (tags: string[]) => {
    if (!task) return;
    try {
      setCompleting(true);
      const db = await getDatabase();
      await db.runAsync(
        `UPDATE tasks SET status = 'completed', completed_at = ?, pool = 'archived' WHERE id = ?`,
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
        `UPDATE vault_folders SET type = 'task_archived', archived_at = ? WHERE task_id = ? AND type = 'task_active'`,
        [Math.floor(Date.now() / 1000), task.id]
      );
      Alert.alert(
        'Task Completed!',
        `"${task.project_title}" has been moved to archive. You can view and reactivate it in the Vault.`,
        [{ text: 'OK', onPress: () => { setShowCompletionSheet(false); navigation.goBack(); } }]
      );
    } catch (error) {
      console.error('Error completing task:', error);
      Alert.alert('Error', 'Failed to complete task');
    } finally {
      setCompleting(false);
    }
  };

  const deleteReference = async (fileId: string) => {
    Alert.alert(
      'Delete Reference',
      'Remove this file from task references?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const db = await getDatabase();
              const file = await db.getFirstAsync<ReferenceFile>(`SELECT local_path FROM vault_files WHERE id = ?`, [fileId]);
              if (file?.local_path) {
                const fileToDelete = new File(file.local_path);
                if (fileToDelete.exists) await fileToDelete.delete();
              }
              await db.runAsync(`DELETE FROM vault_files WHERE id = ?`, [fileId]);
              await loadReferences();
              Alert.alert('Success', 'Reference removed');
            } catch (error) {
              console.error('Error deleting reference:', error);
              Alert.alert('Error', 'Failed to delete reference');
            }
          },
        },
      ]
    );
  };

  const formatBudget = () => {
    if (!task?.budget) return '—';
    if (task.currency === 'IDR') return `Rp ${task.budget.toLocaleString('id-ID')}`;
    return `$${task.budget.toFixed(2)}`;
  };

  const formatDate = (timestamp: number | null) => {
    if (!timestamp) return 'Not set';
    return new Date(timestamp * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const formatFileSize = (bytes: number): string => {
    if (!bytes) return 'Unknown';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getStatusColor = () => {
    switch (task?.status) {
      case 'urgent': return '#EF4444';
      case 'active': return '#10B981';
      case 'pending': return '#F59E0B';
      case 'completed': return '#6366F1';
      default: return '#6B7280';
    }
  };

  const canCreateInvoice = () => task?.platform === 'direct' || task?.platform === 'manual';

  const openFile = async (file: ReferenceFile) => {
    if (file.file_type === 'image' && file.local_path) {
      try {
        const fileObj = new File(file.local_path);
        if (fileObj.exists) {
          setSelectedImage(file.local_path);
          setImageModalVisible(true);
        } else {
          Alert.alert(
            'File Not Found',
            'This file may have been moved or deleted. Would you like to remove this reference?',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Remove', style: 'destructive', onPress: () => deleteReference(file.id) },
            ]
          );
        }
      } catch (error) {
        console.error('Error opening file:', error);
        Alert.alert('Error', 'Could not open file');
      }
    } else {
      Alert.alert('File', `${file.name}\n\nSize: ${formatFileSize(file.file_size_bytes)}`);
    }
  };

  const renderReferenceItem = ({ item }: { item: ReferenceFile }) => (
    <TouchableOpacity style={styles.referenceItem} onPress={() => openFile(item)} onLongPress={() => deleteReference(item.id)} activeOpacity={0.7}>
      <View style={styles.referenceThumbnail}>
        {item.file_type === 'image' ? (
          <Text style={styles.referenceIcon}>🖼️</Text>
        ) : (
          <Text style={styles.referenceIcon}>📄</Text>
        )}
      </View>
      <View style={styles.referenceInfo}>
        <Text style={styles.referenceName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.referenceType}>{item.file_type.toUpperCase()} • {formatFileSize(item.file_size_bytes)}</Text>
      </View>
      <TouchableOpacity onPress={() => deleteReference(item.id)} style={styles.referenceDelete}>
        <Ionicons name="trash-outline" size={20} color="#EF4444" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderVaultFileItem = ({ item }: { item: VaultFile }) => (
    <TouchableOpacity style={[styles.vaultFileItem, selectedFiles.has(item.id) && styles.vaultFileItemSelected]} onPress={() => toggleFileSelection(item.id)} activeOpacity={0.7}>
      <View style={styles.vaultFileCheckbox}>
        {selectedFiles.has(item.id) ? <Ionicons name="checkmark-circle" size={24} color="#6366F1" /> : <View style={styles.vaultFileCheckboxEmpty} />}
      </View>
      <View style={styles.vaultFileThumbnail}>
        <Text style={styles.vaultFileIcon}>{item.file_type === 'image' ? '🖼️' : '📄'}</Text>
      </View>
      <View style={styles.vaultFileInfo}>
        <Text style={styles.vaultFileName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.vaultFileMeta}>{item.folder_name} • {formatFileSize(item.file_size_bytes)}</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={{ marginTop: 12, color: '#6B7280' }}>Loading task...</Text>
      </View>
    );
  }

  if (!task) {
    return (
      <View style={styles.centered}>
        <Text style={{ fontSize: 16, color: '#6B7280' }}>Task not found</Text>
        <TouchableOpacity style={{ marginTop: 16, padding: 12, backgroundColor: '#6366F1', borderRadius: 8 }} onPress={() => navigation.goBack()}>
          <Text style={{ color: 'white' }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}><Text style={styles.backButtonText}>←</Text></TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{task.project_title}</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity style={[styles.tab, activeTab === 'brief' && styles.activeTab]} onPress={() => setActiveTab('brief')}>
          <Text style={[styles.tabText, activeTab === 'brief' && styles.activeTabText]}>Brief</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'references' && styles.activeTab]} onPress={() => setActiveTab('references')}>
          <Text style={[styles.tabText, activeTab === 'references' && styles.activeTabText]}>References ({references.length})</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {activeTab === 'brief' ? (
          <View>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Client Information</Text>
              <View style={styles.infoRow}><Text style={styles.label}>Name:</Text><Text style={styles.value}>{task.client_name}</Text></View>
              {task.client_email && <View style={styles.infoRow}><Text style={styles.label}>Email:</Text><Text style={styles.value}>{task.client_email}</Text></View>}
              {task.client_phone && <View style={styles.infoRow}><Text style={styles.label}>Phone:</Text><Text style={styles.value}>{task.client_phone}</Text></View>}
              {task.client_country && <View style={styles.infoRow}><Text style={styles.label}>Country:</Text><Text style={styles.value}>{task.client_country}</Text></View>}
            </View>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Project Details</Text>
              <View style={styles.infoRow}><Text style={styles.label}>Platform:</Text><Text style={[styles.value, styles.platformText]}>{task.platform.toUpperCase()}</Text></View>
              <View style={styles.infoRow}><Text style={styles.label}>Status:</Text><Text style={[styles.value, { color: getStatusColor(), fontWeight: '600' }]}>{task.status.toUpperCase()}</Text></View>
              <View style={styles.infoRow}><Text style={styles.label}>Budget:</Text><Text style={[styles.value, styles.budgetText]}>{formatBudget()}</Text></View>
              <View style={styles.infoRow}><Text style={styles.label}>Deadline:</Text><Text style={styles.value}>{formatDate(task.deadline)}</Text></View>
              <View style={styles.infoRow}>
                <Text style={styles.label}>Progress:</Text>
                <View style={styles.progressContainer}>
                  <View style={styles.progressBar}><View style={[styles.progressFill, { width: `${task.progress_pct}%` }]} /></View>
                  <Text style={styles.progressText}>{task.progress_pct}%</Text>
                </View>
              </View>
              <View style={styles.infoRow}><Text style={styles.label}>Revisions:</Text><Text style={styles.value}>{task.revision_count}</Text></View>
              <View style={styles.infoRow}><Text style={styles.label}>Created:</Text><Text style={styles.value}>{formatDate(task.created_at)}</Text></View>
            </View>
            {task.project_description && (
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Description</Text>
                <Text style={styles.description}>{task.project_description}</Text>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.card}>
            <View style={styles.referenceHeader}>
              <Text style={styles.sectionTitle}>Reference Files</Text>
              <TouchableOpacity style={styles.addReferenceButton} onPress={() => { loadVaultFiles(); setShowVaultPicker(true); }}>
                <Text style={styles.addReferenceText}>+ Add from Vault</Text>
              </TouchableOpacity>
            </View>
            {references.length > 0 ? (
              <FlatList data={references} renderItem={renderReferenceItem} keyExtractor={item => item.id} scrollEnabled={false} />
            ) : (
              <View style={styles.emptyReferenceState}>
                <Text style={styles.emptyReferenceIcon}>📁</Text>
                <Text style={styles.emptyReferenceTitle}>No reference files</Text>
                <Text style={styles.emptyReferenceDesc}>Add files from Global Vault to help you during work</Text>
                <TouchableOpacity style={styles.emptyReferenceButton} onPress={() => { loadVaultFiles(); setShowVaultPicker(true); }}>
                  <Text style={styles.emptyReferenceButtonText}>Browse Vault</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      <View style={styles.actionBar}>
        <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('FocusTimer', { taskId: task.id })}>
          <Text style={styles.actionButtonText}>Start Focus</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, styles.completeButton]} onPress={() => setShowCompletionSheet(true)} disabled={completing}>
          <Text style={styles.actionButtonText}>{completing ? '✓ Completing...' : '✓ Complete'}</Text>
        </TouchableOpacity>
        {canCreateInvoice() && (
          <TouchableOpacity style={[styles.actionButton, styles.invoiceButton]} onPress={() => navigation.navigate('InvoiceBuilder', { taskId: task.id })}>
            <Text style={styles.actionButtonText}>Invoice</Text>
          </TouchableOpacity>
        )}
      </View>

      <TaskCompletionSheet visible={showCompletionSheet} onClose={() => setShowCompletionSheet(false)} onComplete={handleCompleteTask} taskTitle={task.project_title} />

      <Modal visible={imageModalVisible} transparent animationType="fade" onRequestClose={() => setImageModalVisible(false)}>
        <View style={styles.imageModalOverlay}>
          <TouchableOpacity style={styles.imageModalCloseButton} onPress={() => setImageModalVisible(false)}><Text style={styles.imageModalCloseText}>✕</Text></TouchableOpacity>
          {selectedImage && <Image source={{ uri: selectedImage }} style={styles.fullscreenImage} resizeMode="contain" />}
        </View>
      </Modal>

      <Modal visible={showVaultPicker} animationType="slide" onRequestClose={() => { setShowVaultPicker(false); setSelectedFiles(new Set()); }}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => { setShowVaultPicker(false); setSelectedFiles(new Set()); }}><Text style={styles.modalCancelText}>Cancel</Text></TouchableOpacity>
            <Text style={styles.modalTitle}>Import from Vault</Text>
            <TouchableOpacity onPress={importFilesToTask}><Text style={[styles.modalDoneText, selectedFiles.size === 0 && styles.modalDoneDisabled]}>Import ({selectedFiles.size})</Text></TouchableOpacity>
          </View>
          <Text style={styles.modalSubtitle}>Select files to import (copy, not move)</Text>
          {loadingVault ? (
            <ActivityIndicator size="large" color="#6366F1" style={{ marginTop: 40 }} />
          ) : vaultFiles.length === 0 ? (
            <View style={styles.emptyVaultState}>
              <Text style={styles.emptyVaultIcon}>📂</Text>
              <Text style={styles.emptyVaultTitle}>No files in vault</Text>
              <Text style={styles.emptyVaultDesc}>Upload files to your Global Vault first</Text>
              <TouchableOpacity style={styles.emptyVaultButton} onPress={() => { setShowVaultPicker(false); navigation.navigate('Vault'); }}>
                <Text style={styles.emptyVaultButtonText}>Go to Vault</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList data={vaultFiles} renderItem={renderVaultFileItem} keyExtractor={item => item.id} contentContainerStyle={styles.vaultFileList} />
          )}
        </View>
      </Modal>
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
  referenceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  addReferenceButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#EEF2FF',
    borderRadius: 20,
  },
  addReferenceText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6366F1',
  },
  referenceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    gap: 12,
  },
  referenceThumbnail: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
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
  referenceDelete: {
    padding: 8,
  },
  emptyReferenceState: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyReferenceIcon: {
    fontSize: 48,
  },
  emptyReferenceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  emptyReferenceDesc: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  emptyReferenceButton: {
    marginTop: 16,
    backgroundColor: '#6366F1',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  emptyReferenceButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
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
  imageModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageModalCloseButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageModalCloseText: {
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  fullscreenImage: {
    width: '100%',
    height: '100%',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalCancelText: {
    fontSize: 16,
    color: '#6B7280',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  modalDoneText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6366F1',
  },
  modalDoneDisabled: {
    opacity: 0.5,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F3F4F6',
  },
  vaultFileList: {
    padding: 16,
    gap: 8,
  },
  vaultFileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  vaultFileItemSelected: {
    borderColor: '#6366F1',
    backgroundColor: '#EEF2FF',
  },
  vaultFileCheckbox: {
    width: 32,
    alignItems: 'center',
  },
  vaultFileCheckboxEmpty: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D1D5DB',
  },
  vaultFileThumbnail: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  vaultFileIcon: {
    fontSize: 24,
  },
  vaultFileInfo: {
    flex: 1,
  },
  vaultFileName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  vaultFileMeta: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  emptyVaultState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyVaultIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyVaultTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  emptyVaultDesc: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyVaultButton: {
    backgroundColor: '#6366F1',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  emptyVaultButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});