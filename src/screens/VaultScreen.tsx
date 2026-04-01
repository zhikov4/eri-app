import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { File, Directory, Paths } from 'expo-file-system';
import { useFocusEffect } from '@react-navigation/native';
import { getDatabase } from '../db/database';
import { useERIStore } from '../store/useERIStore';
import {
  getUserVaultFolders,
  getFolderFiles,
  saveFile,
  deleteFile,
  getUserStorageUsage,
  VaultFolder,
  VaultFile,
} from '../db/queries/vault';
import { COLORS, SPACING, RADIUS, TYPOGRAPHY } from '../constants/theme';

type PoolType = 'personal' | 'task_active' | 'task_archived';
type Task = {
  id: string;
  project_title: string;
  client_name: string;
  status: string;
  completed_at: number | null;
  created_at: number;
};

const DEFAULT_PERSONAL_FOLDER_NAME = 'Personal';

export const VaultScreen = () => {
  const user = useERIStore((state) => state.user);
  const [folders, setFolders] = useState<VaultFolder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<VaultFolder | null>(null);
  const [files, setFiles] = useState<VaultFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [storageUsed, setStorageUsed] = useState(0);
  const [storageLimit] = useState(500 * 1024 * 1024);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [archivedTasks, setArchivedTasks] = useState<Task[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageModalVisible, setImageModalVisible] = useState(false);

  const ensurePersonalFolder = async () => {
    if (!user?.id) return null;
    const db = await getDatabase();
    const existing = await db.getFirstAsync<{ id: string }>(
      `SELECT id FROM vault_folders WHERE user_id = ? AND type = 'personal' AND name = ?`,
      [user.id, DEFAULT_PERSONAL_FOLDER_NAME]
    );
    if (existing) return existing.id;

    const folderId = Math.random().toString(36).substr(2, 9);
    const now = Math.floor(Date.now() / 1000);
    await db.runAsync(
      `INSERT INTO vault_folders (id, user_id, type, name, tags_json, sort_order, created_at, updated_at)
       VALUES (?, ?, 'personal', ?, '[]', 0, ?, ?)`,
      [folderId, user.id, DEFAULT_PERSONAL_FOLDER_NAME, now, now]
    );
    const vaultDir = new Directory(Paths.document, 'vault');
    const folderDir = new Directory(vaultDir, folderId);
    await folderDir.create({ intermediates: true, idempotent: true });
    return folderId;
  };

  const loadArchivedTasks = async () => {
    if (!user?.id) return;
    try {
      const db = await getDatabase();
      const result = await db.getAllAsync<Task>(
        `SELECT id, project_title, client_name, status, completed_at, created_at
         FROM tasks WHERE user_id = ? AND pool = 'archived'
         ORDER BY completed_at DESC`,
        [user.id]
      );
      setArchivedTasks(result);
    } catch (error) {
      console.error('Error loading archived tasks:', error);
    }
  };

  const loadData = async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      await ensurePersonalFolder();
      const vaultFolders = await getUserVaultFolders(user.id);
      setFolders(vaultFolders);
      const { used } = await getUserStorageUsage(user.id);
      setStorageUsed(used);
      if (selectedFolder) {
        const folderFiles = await getFolderFiles(selectedFolder.id);
        setFiles(folderFiles);
      }
      await loadArchivedTasks();
    } catch (error) {
      console.error('Error loading vault:', error);
      Alert.alert('Error', 'Failed to load vault data');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [user?.id, selectedFolder])
  );

  const checkStorageLimit = (fileSize: number): boolean => {
    const usageAfter = storageUsed + fileSize;
    const usagePercent = (usageAfter / storageLimit) * 100;
    if (usageAfter > storageLimit) {
      Alert.alert(
        'Storage Limit Reached',
        `You have reached your ${Math.floor(storageLimit / 1024 / 1024)}MB storage limit. Please delete some files or upgrade to Pro for unlimited storage.`
      );
      return false;
    }
    if (usagePercent >= 95) {
      Alert.alert(
        'Storage Almost Full',
        `You're at ${Math.floor(usagePercent)}% of your storage. Please delete some files to continue uploading.`
      );
      return false;
    }
    if (usagePercent >= 80) {
      Alert.alert(
        'Storage Warning',
        `You're at ${Math.floor(usagePercent)}% of your storage. Consider deleting unused files.`
      );
    }
    return true;
  };

  const pickAndUploadFile = async () => {
    if (!user?.id) return;
    let targetFolderId: string;
    if (selectedFolder) {
      targetFolderId = selectedFolder.id;
    } else {
      const defaultId = await ensurePersonalFolder();
      if (!defaultId) {
        Alert.alert('Error', 'Could not create personal folder');
        return;
      }
      targetFolderId = defaultId;
      await loadData();
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsEditing: false,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      let fileSize = 0;
      try {
        const tempFile = new File(asset.uri);
        const info = await tempFile.info();
        fileSize = info.size || 0;
      } catch (e) {
        console.warn('Could not get file size:', e);
      }
      if (!checkStorageLimit(fileSize)) return;

      const vaultDir = new Directory(Paths.document, 'vault');
      const folderDir = new Directory(vaultDir, targetFolderId);
      await folderDir.create({ intermediates: true, idempotent: true });

      const originalName = asset.fileName || `file_${Date.now()}`;
      const ext = originalName.split('.').pop();
      const baseName = originalName.substring(0, originalName.lastIndexOf('.'));
      let fileName = originalName;
      let counter = 1;
      let destFile = new File(folderDir, fileName);
      while (await destFile.exists) {
        fileName = `${baseName}_${counter}.${ext}`;
        destFile = new File(folderDir, fileName);
        counter++;
      }

      const sourceFile = new File(asset.uri);
      await sourceFile.copy(destFile);
      const destInfo = await destFile.info();

      await saveFile(user.id, targetFolderId, {
        name: fileName,
        file_type: asset.type === 'video' ? 'video' : 'image',
        local_path: destFile.uri,
        file_size_bytes: destInfo.size || fileSize,
        width_px: asset.width,
        height_px: asset.height,
      });
      await loadData();
      Alert.alert('Success', 'File uploaded to vault');
    }
  };

  const handleDeleteFile = async (file: VaultFile) => {
    Alert.alert(
      'Delete File',
      `Are you sure you want to delete "${file.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!user?.id) return;
            if (file.local_path) {
              try {
                const fileToDelete = new File(file.local_path);
                if (fileToDelete.exists) {
                  await fileToDelete.delete();
                }
              } catch (e) {
                console.warn('Could not delete physical file:', e);
              }
            }
            await deleteFile(file.id, user.id);
            await loadData();
          },
        },
      ]
    );
  };

  const createNewFolder = async () => {
    if (!user?.id || !newFolderName.trim()) return;
    const db = await getDatabase();
    const folderId = Math.random().toString(36).substr(2, 9);
    const now = Math.floor(Date.now() / 1000);
    await db.runAsync(
      `INSERT INTO vault_folders (id, user_id, type, name, tags_json, sort_order, created_at, updated_at)
       VALUES (?, ?, 'personal', ?, '[]', 0, ?, ?)`,
      [folderId, user.id, newFolderName.trim(), now, now]
    );
    const vaultDir = new Directory(Paths.document, 'vault');
    const newFolderDir = new Directory(vaultDir, folderId);
    await newFolderDir.create({ intermediates: true, idempotent: true });
    setNewFolderName('');
    setShowNewFolderModal(false);
    await loadData();
  };

  const reactivateTask = async (taskId: string) => {
    Alert.alert(
      'Reactivate Task',
      'This task will be moved back to your working list. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reactivate',
          onPress: async () => {
            try {
              const db = await getDatabase();
              await db.runAsync(
                `UPDATE tasks SET status = 'active', pool = 'active', completed_at = NULL WHERE id = ?`,
                [taskId]
              );
              // Also move vault folder back to task_active
              await db.runAsync(
                `UPDATE vault_folders SET type = 'task_active', archived_at = NULL WHERE task_id = ? AND type = 'task_archived'`,
                [taskId]
              );
              await loadData();
              Alert.alert('Success', 'Task reactivated and moved to Working List');
            } catch (error) {
              console.error('Error reactivating task:', error);
              Alert.alert('Error', 'Failed to reactivate task');
            }
          },
        },
      ]
    );
  };

  const formatFileSize = (bytes: number): string => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const renderFolder = ({ item }: { item: VaultFolder }) => (
    <TouchableOpacity
      style={[styles.folderCard, selectedFolder?.id === item.id && styles.folderCardSelected]}
      onPress={() => setSelectedFolder(item)}
    >
      <Text style={styles.folderIcon}>
        {item.type === 'personal' ? '📁' : item.type === 'task_active' ? '🎨' : '📦'}
      </Text>
      <Text style={styles.folderName} numberOfLines={1}>{item.name}</Text>
      <Text style={styles.folderType}>
        {item.type === 'personal' ? 'Personal' : item.type === 'task_active' ? 'Active Task' : 'Archived'}
      </Text>
    </TouchableOpacity>
  );

  const renderFile = ({ item }: { item: VaultFile }) => (
    <TouchableOpacity
      style={styles.fileCard}
      onPress={async () => {
        if (item.file_type === 'image' && item.local_path) {
          try {
            const fileObj = new File(item.local_path);
            if (fileObj.exists) {
              setSelectedImage(item.local_path);
              setImageModalVisible(true);
            } else {
              Alert.alert('File Not Found', 'The file no longer exists on device.');
            }
          } catch (error) {
            console.error('Error opening image:', error);
            Alert.alert('Error', 'Could not open file');
          }
        } else {
          Alert.alert('File', `${item.name}\nSize: ${formatFileSize(item.file_size_bytes || 0)}`);
        }
      }}
      onLongPress={() => handleDeleteFile(item)}
    >
      <Text style={styles.fileIcon}>
        {item.file_type === 'image' ? '🖼️' : item.file_type === 'video' ? '🎬' : '📄'}
      </Text>
      <View style={styles.fileInfo}>
        <Text style={styles.fileName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.fileSize}>{formatFileSize(item.file_size_bytes || 0)}</Text>
      </View>
      <TouchableOpacity onPress={() => handleDeleteFile(item)} style={styles.deleteButton}>
        <Ionicons name="trash-outline" size={20} color={COLORS.danger || '#EF4444'} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderArchivedTask = ({ item }: { item: Task }) => (
    <TouchableOpacity style={styles.archivedTaskCard} onPress={() => reactivateTask(item.id)}>
      <View style={styles.archivedTaskIcon}>
        <Text style={styles.archivedTaskIconText}>📄</Text>
      </View>
      <View style={styles.archivedTaskInfo}>
        <Text style={styles.archivedTaskTitle} numberOfLines={1}>{item.project_title}</Text>
        <Text style={styles.archivedTaskClient}>{item.client_name}</Text>
        <Text style={styles.archivedTaskDate}>
          Completed: {new Date((item.completed_at || item.created_at) * 1000).toLocaleDateString()}
        </Text>
      </View>
      <Ionicons name="refresh-outline" size={20} color={COLORS.primary} />
    </TouchableOpacity>
  );

  const storagePercent = (storageUsed / storageLimit) * 100;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Global Vault</Text>
      </View>

      {/* Storage Indicator */}
      <View style={styles.storageCard}>
        <View style={styles.storageHeader}>
          <Text style={styles.storageTitle}>Storage Used</Text>
          <Text style={styles.storageText}>
            {formatFileSize(storageUsed)} / {formatFileSize(storageLimit)}
          </Text>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${Math.min(storagePercent, 100)}%` }]} />
        </View>
        {storagePercent >= 80 && (
          <Text style={styles.storageWarning}>
            ⚠️ {storagePercent >= 95 ? 'Storage almost full!' : 'Storage running low'}
          </Text>
        )}
      </View>

      {/* Upload button */}
      <TouchableOpacity style={styles.uploadButton} onPress={pickAndUploadFile}>
        <Ionicons name="cloud-upload-outline" size={20} color="#FFFFFF" />
        <Text style={styles.uploadButtonText}>Upload to {selectedFolder ? selectedFolder.name : 'Personal'}</Text>
      </TouchableOpacity>

      {/* Personal Folders Section */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Personal Folders</Text>
        <TouchableOpacity onPress={() => setShowNewFolderModal(true)}>
          <Text style={styles.addButton}>+ New Folder</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={folders.filter(f => f.type === 'personal')}
        horizontal
        showsHorizontalScrollIndicator={false}
        renderItem={renderFolder}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.folderList}
        ListEmptyComponent={<Text style={styles.emptyText}>No personal folders. Create one!</Text>}
      />

      {/* Task Folders Section */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Task Folders</Text>
      </View>

      <FlatList
        data={folders.filter(f => f.type === 'task_active')}
        horizontal
        showsHorizontalScrollIndicator={false}
        renderItem={renderFolder}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.folderList}
        ListEmptyComponent={<Text style={styles.emptyText}>No active task folders</Text>}
      />

      {/* Files in selected folder */}
      {selectedFolder && (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{selectedFolder.name}</Text>
          </View>
          <FlatList
            data={files}
            renderItem={renderFile}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.fileList}
            ListEmptyComponent={<Text style={styles.emptyText}>No files in this folder</Text>}
          />
        </>
      )}

      {/* Archived Tasks Section */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Archived Tasks</Text>
        <Text style={styles.sectionSubtitle}>Tap to reactivate</Text>
      </View>

      <FlatList
        data={archivedTasks}
        renderItem={renderArchivedTask}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.archivedList}
        ListEmptyComponent={<Text style={styles.emptyText}>No archived tasks</Text>}
      />

      {/* New Folder Modal */}
      <Modal visible={showNewFolderModal} transparent animationType="slide" onRequestClose={() => setShowNewFolderModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create New Folder</Text>
            <TextInput
              style={styles.input}
              placeholder="Folder name"
              placeholderTextColor={COLORS.textMuted}
              value={newFolderName}
              onChangeText={setNewFolderName}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setShowNewFolderModal(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.createButton]} onPress={createNewFolder}>
                <Text style={styles.createButtonText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Image Modal */}
      <Modal visible={imageModalVisible} transparent animationType="fade" onRequestClose={() => setImageModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalCloseButton} onPress={() => setImageModalVisible(false)}>
            <Text style={styles.modalCloseText}>✕</Text>
          </TouchableOpacity>
          {selectedImage && <Image source={{ uri: selectedImage }} style={styles.fullscreenImage} resizeMode="contain" />}
        </View>
      </Modal>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: { fontSize: 28, fontWeight: '700', color: '#111827' },
  storageCard: {
    margin: 16,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  storageHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  storageTitle: { fontSize: 14, fontWeight: '600', color: '#111827' },
  storageText: { fontSize: 12, color: '#6B7280' },
  progressBar: { height: 6, backgroundColor: '#F3F4F6', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#6366F1', borderRadius: 3 },
  storageWarning: { marginTop: 8, fontSize: 12, color: '#F59E0B' },
  uploadButton: {
    flexDirection: 'row',
    backgroundColor: '#6366F1',
    marginHorizontal: 16,
    marginBottom: 16,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  uploadButtonText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#111827' },
  sectionSubtitle: { fontSize: 12, color: '#6B7280' },
  addButton: { fontSize: 14, fontWeight: '600', color: '#6366F1' },
  folderList: { paddingHorizontal: 16, gap: 12, paddingBottom: 8 },
  folderCard: {
    width: 120,
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    marginRight: 12,
  },
  folderCardSelected: { borderColor: '#6366F1', backgroundColor: '#EEF2FF' },
  folderIcon: { fontSize: 32, marginBottom: 8 },
  folderName: { fontSize: 14, fontWeight: '600', color: '#111827', textAlign: 'center' },
  folderType: { fontSize: 10, color: '#6B7280', marginTop: 4 },
  fileList: { padding: 16, gap: 8 },
  fileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  fileIcon: { fontSize: 28, marginRight: 12 },
  fileInfo: { flex: 1 },
  fileName: { fontSize: 14, fontWeight: '500', color: '#111827' },
  fileSize: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  deleteButton: { padding: 8 },
  archivedList: { padding: 16, gap: 12, paddingBottom: 40 },
  archivedTaskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  archivedTaskIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  archivedTaskIconText: { fontSize: 24 },
  archivedTaskInfo: { flex: 1 },
  archivedTaskTitle: { fontSize: 16, fontWeight: '600', color: '#111827' },
  archivedTaskClient: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  archivedTaskDate: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  emptyText: { textAlign: 'center', color: '#6B7280', paddingVertical: 40 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '80%', backgroundColor: '#FFFFFF', borderRadius: 12, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 16 },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
    marginBottom: 16,
  },
  modalButtons: { flexDirection: 'row', gap: 12 },
  modalButton: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  cancelButton: { backgroundColor: '#F3F4F6' },
  cancelButtonText: { color: '#6B7280', fontWeight: '600' },
  createButton: { backgroundColor: '#6366F1' },
  createButtonText: { color: '#FFFFFF', fontWeight: '600' },
  modalCloseButton: {
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
  modalCloseText: { fontSize: 20, color: '#FFFFFF', fontWeight: '600' },
  fullscreenImage: { width: '100%', height: '100%' },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
});