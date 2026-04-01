import { getDatabase } from '../database';
import * as FileSystem from 'expo-file-system';

export interface VaultFolder {
  id: string;
  user_id: string;
  type: 'personal' | 'task_active' | 'task_archived';
  task_id: string | null;
  name: string;
  tags_json: string;
  sort_order: number;
  archived_at: number | null;
  drive_folder_id: string | null;
  created_at: number;
  updated_at: number;
}

export interface VaultFile {
  id: string;
  folder_id: string;
  user_id: string;
  name: string;
  file_type: 'image' | 'pdf' | 'video' | 'other';
  local_path: string | null;
  remote_url: string | null;
  file_size_bytes: number | null;
  width_px: number | null;
  height_px: number | null;
  thumbnail_path: string | null;
  is_pinned: number;
  source_folder_id: string | null;
  drive_file_id: string | null;
  created_at: number;
  synced_at: number | null;
}

export const createTaskVaultFolder = async (userId: string, taskId: string, taskName: string): Promise<string> => {
  const db = await getDatabase();
  const folderId = Math.random().toString(36).substr(2, 9);
  const now = Math.floor(Date.now() / 1000);
  
  await db.runAsync(
    `INSERT INTO vault_folders (id, user_id, type, task_id, name, tags_json, sort_order, created_at, updated_at)
     VALUES (?, ?, 'task_active', ?, ?, '[]', 0, ?, ?)`,
    [folderId, userId, taskId, taskName, now, now]
  );
  
  return folderId;
};

export const getUserVaultFolders = async (userId: string): Promise<VaultFolder[]> => {
  const db = await getDatabase();
  return await db.getAllAsync<VaultFolder>(
    `SELECT * FROM vault_folders WHERE user_id = ? ORDER BY type, sort_order, created_at DESC`,
    [userId]
  );
};

export const getFolderFiles = async (folderId: string): Promise<VaultFile[]> => {
  const db = await getDatabase();
  return await db.getAllAsync<VaultFile>(
    `SELECT * FROM vault_files WHERE folder_id = ? ORDER BY created_at DESC`,
    [folderId]
  );
};

export const saveFile = async (
  userId: string,
  folderId: string,
  fileInfo: {
    name: string;
    file_type: string;
    local_path: string;
    file_size_bytes: number;
    width_px?: number;
    height_px?: number;
  }
): Promise<string> => {
  const db = await getDatabase();
  const fileId = Math.random().toString(36).substr(2, 9);
  const now = Math.floor(Date.now() / 1000);
  
  await db.runAsync(
    `INSERT INTO vault_files (id, folder_id, user_id, name, file_type, local_path, file_size_bytes, width_px, height_px, is_pinned, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
    [
      fileId, folderId, userId, fileInfo.name, fileInfo.file_type,
      fileInfo.local_path, fileInfo.file_size_bytes,
      fileInfo.width_px || null, fileInfo.height_px || null, now
    ]
  );
  
  return fileId;
};

export const getUserStorageUsage = async (userId: string): Promise<{ used: number; limit: number }> => {
  const db = await getDatabase();
  const result = await db.getFirstAsync<{ total: number }>(
    `SELECT SUM(file_size_bytes) as total FROM vault_files WHERE user_id = ?`,
    [userId]
  );
  
  const used = result?.total || 0;
  const limit = 500 * 1024 * 1024; // 500MB for free tier
  
  return { used, limit };
};

export const deleteFile = async (fileId: string, userId: string): Promise<void> => {
  const db = await getDatabase();
  
  // Get file path first
  const file = await db.getFirstAsync<VaultFile>(
    `SELECT local_path FROM vault_files WHERE id = ? AND user_id = ?`,
    [fileId, userId]
  );
  
  if (file?.local_path) {
    try {
      await FileSystem.deleteAsync(file.local_path);
    } catch (e) {
      console.warn('Could not delete physical file:', e);
    }
  }
  
  await db.runAsync(
    `DELETE FROM vault_files WHERE id = ? AND user_id = ?`,
    [fileId, userId]
  );
};