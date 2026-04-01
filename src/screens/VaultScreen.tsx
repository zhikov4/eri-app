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

const POOL_ICONS: Record<PoolType, string> = {
  personal: '📁',
  task_active: '🎨',
  task_archived: '📦',
};

const POOL_TITLES: Record<PoolType, string> = {
  personal: 'Personal Collection',
  task_active: 'Active Tasks',
  task_archived: 'Completed Archive',
};

export const VaultScreen = () => {
  const user = useERIStore((state) => state.user);
  const [folders, setFolders] = useState<VaultFolder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<VaultFolder | null>(null);
  const [files, setFiles] = useState<VaultFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [storageUsed, setStorageUsed] = useState(0);
  const [storageLimit] = useState(500 * 1024 * 1024); // 500MB
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const loadData = async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const vaultFolders = await getUserVaultFolders(user.id);
      setFolders(vaultFolders);
      
      const { used } = await getUserStorageUsage(user.id);
      setStorageUsed(used);
      
      if (selectedFolder) {
        const folderFiles = await getFolderFiles(selectedFolder.id);
        setFiles(folderFiles);
      }
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
    if (!user?.id || !selectedFolder) return;
    
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsEditing: false,
      quality: 0.8,
    });
    
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      
      // Get file size using the new File API
      let fileSize = 0;
      try {
        const tempFile = new File(asset.uri);
        const info = await tempFile.info();
        fileSize = info.size || 0;
      } catch (e) {
        console.warn('Could not get file size:', e);
      }
      
      if (!checkStorageLimit(fileSize)) return;
      
      // Create destination directory using new Directory API
      const vaultDir = new Directory(Paths.document, 'vault');
      const folderDir = new Directory(vaultDir, selectedFolder.id);
      
      try {
        // Create directories if they don't exist (idempotent: true means no error if exists)
        await folderDir.create({ intermediates: true, idempotent: true });
      } catch (e) {
        console.warn('Directory creation warning:', e);
      }
      
      const fileName = asset.fileName || `file_${Date.now()}.${asset.type === 'video' ? 'mp4' : 'jpg'}`;
      const destFile = new File(folderDir, fileName);
      
      // Copy the file using the new File API
      const sourceFile = new File(asset.uri);
      await sourceFile.copy(destFile);
      
      // Get final file info
      const destInfo = await destFile.info();
      
      await saveFile(user.id, selectedFolder.id, {
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
            
            // Delete physical file using new File API
            if (file.local_path) {
              try {
                const fileToDelete = new File(file.local_path);
                if (await fileToDelete.exists()) {
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
    
    // Also create physical directory using new Directory API
    try {
      const vaultDir = new Directory(Paths.document, 'vault');
      const newFolderDir = new Directory(vaultDir, folderId);
      await newFolderDir.create({ intermediates: true, idempotent: true });
    } catch (e) {
      console.warn('Could not create physical folder:', e);
    }
    
    setNewFolderName('');
    setShowNewFolderModal(false);
    await loadData();
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const renderFolder = ({ item }: { item: VaultFolder }) => (
    <TouchableOpacity
      style={[styles.folderCard, selectedFolder?.id === item.id && styles.folderCardSelected]}
      onPress={() => setSelectedFolder(item)}
    >
      <Text style={styles.folderIcon}>{POOL_ICONS[item.type as PoolType] || '📄'}</Text>
      <Text style={styles.folderName} numberOfLines={1}>{item.name}</Text>
      <Text style={styles.folderType}>{item.type.replace('_', ' ')}</Text>
    </TouchableOpacity>
  );

  const renderFile = ({ item }: { item: VaultFile }) => (
    <TouchableOpacity
      style={styles.fileCard}
      onPress={() => {
        Alert.alert('File', `File: ${item.name}\nSize: ${formatFileSize(item.file_size_bytes || 0)}`);
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

      {/* Folders Section */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Folders</Text>
        <TouchableOpacity onPress={() => setShowNewFolderModal(true)}>
          <Text style={styles.addButton}>+ New Folder</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={folders}
        horizontal
        showsHorizontalScrollIndicator={false}
        renderItem={renderFolder}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.folderList}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No folders yet. Create your first folder!</Text>
        }
      />

      {/* Files Section */}
      {selectedFolder && (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{selectedFolder.name}</Text>
            <TouchableOpacity onPress={pickAndUploadFile}>
              <Text style={styles.addButton}>+ Upload</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={files}
            renderItem={renderFile}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.fileList}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No files in this folder. Tap + to upload.</Text>
            }
          />
        </>
      )}

      {/* New Folder Modal */}
      <Modal
        visible={showNewFolderModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowNewFolderModal(false)}
      >
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
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowNewFolderModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.createButton]}
                onPress={createNewFolder}
              >
                <Text style={styles.createButtonText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
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
  container: {
    flex: 1,
    backgroundColor: COLORS.background || '#F9FAFB',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: SPACING?.md || 16,
    paddingBottom: SPACING?.md || 16,
    backgroundColor: COLORS.surface || '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border || '#E5E7EB',
  },
  title: {
    ...TYPOGRAPHY?.h1 || { fontSize: 28, fontWeight: '700' },
    color: COLORS.text || '#111827',
  },
  storageCard: {
    margin: SPACING?.md || 16,
    padding: SPACING?.md || 16,
    backgroundColor: COLORS.surface || '#FFFFFF',
    borderRadius: RADIUS?.lg || 12,
    borderWidth: 1,
    borderColor: COLORS.border || '#E5E7EB',
  },
  storageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING?.xs || 8,
  },
  storageTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text || '#111827',
  },
  storageText: {
    fontSize: 12,
    color: COLORS.textMuted || '#6B7280',
  },
  progressBar: {
    height: 6,
    backgroundColor: COLORS.surfaceHighlight || '#F3F4F6',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary || '#6366F1',
    borderRadius: 3,
  },
  storageWarning: {
    marginTop: SPACING?.xs || 8,
    fontSize: 12,
    color: COLORS.warning || '#F59E0B',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING?.md || 16,
    marginTop: SPACING?.md || 16,
    marginBottom: SPACING?.sm || 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text || '#111827',
  },
  addButton: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary || '#6366F1',
  },
  folderList: {
    paddingHorizontal: SPACING?.md || 16,
    gap: 12,
  },
  folderCard: {
    width: 120,
    padding: SPACING?.sm || 12,
    backgroundColor: COLORS.surface || '#FFFFFF',
    borderRadius: RADIUS?.lg || 12,
    borderWidth: 1,
    borderColor: COLORS.border || '#E5E7EB',
    alignItems: 'center',
    marginRight: 12,
  },
  folderCardSelected: {
    borderColor: COLORS.primary || '#6366F1',
    backgroundColor: COLORS.primaryDim || '#EEF2FF',
  },
  folderIcon: {
    fontSize: 32,
    marginBottom: SPACING?.xs || 8,
  },
  folderName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text || '#111827',
    textAlign: 'center',
  },
  folderType: {
    fontSize: 10,
    color: COLORS.textMuted || '#6B7280',
    marginTop: 4,
  },
  fileList: {
    padding: SPACING?.md || 16,
    gap: 8,
  },
  fileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING?.sm || 12,
    backgroundColor: COLORS.surface || '#FFFFFF',
    borderRadius: RADIUS?.md || 8,
    borderWidth: 1,
    borderColor: COLORS.border || '#E5E7EB',
  },
  fileIcon: {
    fontSize: 28,
    marginRight: SPACING?.sm || 12,
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text || '#111827',
  },
  fileSize: {
    fontSize: 11,
    color: COLORS.textMuted || '#6B7280',
    marginTop: 2,
  },
  deleteButton: {
    padding: SPACING?.xs || 8,
  },
  emptyText: {
    textAlign: 'center',
    color: COLORS.textMuted || '#6B7280',
    paddingVertical: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    backgroundColor: COLORS.surface || '#FFFFFF',
    borderRadius: RADIUS?.lg || 12,
    padding: SPACING?.lg || 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text || '#111827',
    marginBottom: SPACING?.md || 16,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border || '#E5E7EB',
    borderRadius: RADIUS?.md || 8,
    paddingHorizontal: SPACING?.sm || 12,
    paddingVertical: SPACING?.sm || 12,
    fontSize: 16,
    color: COLORS.text || '#111827',
    marginBottom: SPACING?.md || 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: SPACING?.sm || 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: SPACING?.sm || 12,
    borderRadius: RADIUS?.md || 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: COLORS.surfaceHighlight || '#F3F4F6',
  },
  cancelButtonText: {
    color: COLORS.textMuted || '#6B7280',
    fontWeight: '600',
  },
  createButton: {
    backgroundColor: COLORS.primary || '#6366F1',
  },
  createButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});