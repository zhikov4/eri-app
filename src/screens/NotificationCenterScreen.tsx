import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getDatabase } from '../db/database';
import { useERIStore } from '../store/useERIStore';
import { COLORS, SPACING, RADIUS, TYPOGRAPHY } from '../constants/theme';

type Notification = {
  id: string;
  source: 'fiverr' | 'vgen' | 'gmail' | 'assistant' | 'system';
  type: string;
  title: string;
  body: string;
  raw_email_id: string | null;
  related_task_id: string | null;
  related_invoice_id: string | null;
  is_read: number;
  received_at: number;  // Changed from created_at to received_at to match schema
};

type Props = {
  navigation: any;
};

export const NotificationCenterScreen = ({ navigation }: Props) => {
  const user = useERIStore((state) => state.user);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [parsingEmails, setParsingEmails] = useState(false);

  const loadNotifications = async () => {
    if (!user?.id) return;
    try {
      const db = await getDatabase();
      // FIXED: Use 'received_at' instead of 'created_at' to match database schema
      const result = await db.getAllAsync<Notification>(
        `SELECT * FROM notifications WHERE user_id = ? ORDER BY received_at DESC LIMIT 100`,
        [user.id]
      );
      setNotifications(result);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const refreshEmails = async () => {
    if (!user?.id || parsingEmails) return;
    
    setParsingEmails(true);
    try {
      // TODO: Implement actual Gmail API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      Alert.alert('Refresh Complete', 'Email parsing will be available with Gmail connection');
    } catch (error) {
      console.error('Error refreshing emails:', error);
      Alert.alert('Error', 'Failed to parse emails');
    } finally {
      setParsingEmails(false);
      await loadNotifications();
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const db = await getDatabase();
      await db.runAsync(
        `UPDATE notifications SET is_read = 1 WHERE id = ?`,
        [notificationId]
      );
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, is_read: 1 } : n)
      );
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const createTaskFromNotification = async (notification: Notification) => {
    Alert.alert(
      'Create Task',
      `Create task from "${notification.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Create',
          onPress: () => {
            navigation.navigate('CreateTask', {
              prefilled: {
                platform: notification.source === 'fiverr' ? 'fiverr' : 'vgen',
                project_title: notification.title,
                client_name: notification.body.substring(0, 50),
              },
            });
            markAsRead(notification.id);
          },
        },
      ]
    );
  };

  // FIXED: Use received_at instead of created_at
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = diff / (1000 * 60 * 60);
    
    if (hours < 1) return `${Math.floor(diff / (1000 * 60))}m ago`;
    if (hours < 24) return `${Math.floor(hours)}h ago`;
    return date.toLocaleDateString();
  };

  const getIcon = (source: string, type: string) => {
    if (source === 'fiverr') return '🎯';
    if (source === 'vgen') return '🎨';
    if (type === 'new_order') return '🆕';
    if (type === 'revision') return '🔄';
    if (type === 'message') return '💬';
    if (type === 'payment') return '💰';
    if (type === 'deadline_alert') return '⏰';
    if (type === 'assistant_reminder') return '🤖';
    return '📧';
  };

  const renderNotification = ({ item }: { item: Notification }) => (
    <TouchableOpacity
      style={[styles.notificationCard, !item.is_read && styles.unreadCard]}
      onPress={() => markAsRead(item.id)}
      onLongPress={() => createTaskFromNotification(item)}
      activeOpacity={0.7}
    >
      <View style={styles.notificationIcon}>
        <Text style={styles.iconText}>{getIcon(item.source, item.type)}</Text>
      </View>
      
      <View style={styles.notificationContent}>
        <View style={styles.notificationHeader}>
          <Text style={[styles.notificationTitle, !item.is_read && styles.unreadText]}>
            {item.title}
          </Text>
          <Text style={styles.notificationTime}>{formatDate(item.received_at)}</Text>
        </View>
        <Text style={styles.notificationBody} numberOfLines={2}>
          {item.body}
        </Text>
        <View style={styles.notificationFooter}>
          <Text style={styles.notificationSource}>
            {item.source === 'assistant' ? '🤖 Assistant' : item.source.toUpperCase()}
          </Text>
          {item.type === 'new_order' && (
            <TouchableOpacity
              style={styles.createTaskButton}
              onPress={() => createTaskFromNotification(item)}
            >
              <Text style={styles.createTaskButtonText}>+ Create Task</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  useFocusEffect(
    useCallback(() => {
      loadNotifications();
    }, [user?.id])
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
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
        <Text style={styles.headerTitle}>Notifications</Text>
        <TouchableOpacity onPress={refreshEmails} style={styles.refreshButton} disabled={parsingEmails}>
          <Text style={styles.refreshButtonText}>
            {parsingEmails ? '⟳' : '↻'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Info Banner */}
      <View style={styles.infoBanner}>
        <Text style={styles.infoBannerText}>
          💡 Long press any notification to create a task
        </Text>
      </View>

      {/* Notification List */}
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={renderNotification}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refreshEmails}
            tintColor={COLORS.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🔔</Text>
            <Text style={styles.emptyTitle}>No notifications</Text>
            <Text style={styles.emptyDesc}>
              Connect Gmail to get notifications from Fiverr and VGen
            </Text>
            <TouchableOpacity
              style={styles.connectButton}
              onPress={() => Alert.alert('Coming Soon', 'Gmail connection will be available in the next update.')}
            >
              <Text style={styles.connectButtonText}>Connect Gmail</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background || '#F9FAFB',
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
  refreshButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  refreshButtonText: {
    fontSize: 24,
    color: COLORS.primary || '#6366F1',
  },
  infoBanner: {
    backgroundColor: COLORS.primaryDim || '#EEF2FF',
    paddingVertical: SPACING?.sm || 12,
    paddingHorizontal: SPACING?.md || 16,
    alignItems: 'center',
  },
  infoBannerText: {
    fontSize: 12,
    color: COLORS.primary || '#6366F1',
  },
  listContent: {
    padding: SPACING?.md || 16,
    gap: 12,
  },
  notificationCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface || '#FFFFFF',
    borderRadius: RADIUS?.lg || 12,
    padding: SPACING?.md || 16,
    borderWidth: 1,
    borderColor: COLORS.border || '#E5E7EB',
  },
  unreadCard: {
    backgroundColor: COLORS.primaryDim || '#EEF2FF',
    borderColor: COLORS.primary || '#6366F1',
  },
  notificationIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.surfaceHighlight || '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING?.sm || 12,
  },
  iconText: {
    fontSize: 24,
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING?.xs || 8,
  },
  notificationTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text || '#111827',
    flex: 1,
  },
  unreadText: {
    color: COLORS.primary || '#6366F1',
  },
  notificationTime: {
    fontSize: 11,
    color: COLORS.textMuted || '#6B7280',
  },
  notificationBody: {
    fontSize: 13,
    color: COLORS.textMuted || '#6B7280',
    lineHeight: 18,
    marginBottom: SPACING?.xs || 8,
  },
  notificationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  notificationSource: {
    fontSize: 10,
    color: COLORS.textMuted || '#6B7280',
    textTransform: 'uppercase',
  },
  createTaskButton: {
    backgroundColor: COLORS.primary || '#6366F1',
    paddingHorizontal: SPACING?.sm || 12,
    paddingVertical: SPACING?.xs || 6,
    borderRadius: RADIUS?.round || 20,
  },
  createTaskButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 80,
    gap: 8,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  emptyTitle: {
    ...TYPOGRAPHY?.h3 || { fontSize: 20, fontWeight: '600' },
    color: COLORS.text || '#111827',
  },
  emptyDesc: {
    fontSize: 14,
    color: COLORS.textMuted || '#6B7280',
    textAlign: 'center',
    paddingHorizontal: SPACING?.xl || 32,
  },
  connectButton: {
    marginTop: SPACING?.md || 16,
    backgroundColor: COLORS.primary || '#6366F1',
    borderRadius: RADIUS?.md || 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  connectButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});