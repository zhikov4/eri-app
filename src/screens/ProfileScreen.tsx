import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getDatabase } from '../db/database';
import { useERIStore } from '../store/useERIStore';
import { COLORS, SPACING, RADIUS, TYPOGRAPHY } from '../constants/theme';

type Props = {
  navigation: any;
};

export const ProfileScreen = ({ navigation }: Props) => {
  const user = useERIStore((state) => state.user);
  const logout = useERIStore((state) => state.logout);
  const [unreadCount, setUnreadCount] = useState(0);
  const [assistantLevel, setAssistantLevel] = useState<'minimal' | 'normal' | 'active'>('normal');

  useEffect(() => {
    loadUnreadCount();
    loadAssistantLevel();
  }, []);

  const loadUnreadCount = async () => {
    if (!user?.id) return;
    try {
      const db = await getDatabase();
      // Fix: Use 'received_at' instead of 'created_at' to match schema
      const result = await db.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0`,
        [user.id]
      );
      setUnreadCount(result?.count || 0);
    } catch (error) {
      console.error('Error loading unread count:', error);
    }
  };

  const loadAssistantLevel = async () => {
    if (!user?.id) return;
    try {
      const db = await getDatabase();
      const result = await db.getFirstAsync<{ assistant_level: string }>(
        `SELECT assistant_level FROM users WHERE id = ?`,
        [user.id]
      );
      if (result?.assistant_level) {
        setAssistantLevel(result.assistant_level as any);
      }
    } catch (error) {
      console.error('Error loading assistant level:', error);
    }
  };

  const updateAssistantLevel = async (level: 'minimal' | 'normal' | 'active') => {
    if (!user?.id) return;
    try {
      const db = await getDatabase();
      await db.runAsync(
        `UPDATE users SET assistant_level = ? WHERE id = ?`,
        [level, user.id]
      );
      setAssistantLevel(level);
      Alert.alert('Success', `Assistant level set to ${level}`);
    } catch (error) {
      console.error('Error updating assistant level:', error);
      Alert.alert('Error', 'Failed to update assistant level');
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: () => logout(),
        },
      ]
    );
  };

  const handleMenuPress = (route: string) => {
    Alert.alert('Coming Soon', `The ${route} screen will be available in the next update.`);
  };

  const menuSections = [
    {
      title: 'Account',
      items: [
        { icon: 'person-outline', label: 'Profile Info', subtitle: user?.email, route: 'ProfileInfo' },
        { icon: 'card-outline', label: 'Subscription', subtitle: user?.tier === 'pro' ? 'Pro Plan' : user?.tier === 'studio' ? 'Studio Plan' : 'Free Plan', route: 'Subscription' },
      ],
    },
    {
      title: 'Preferences',
      items: [
        { icon: 'notifications-outline', label: 'Notifications', subtitle: `${unreadCount} unread`, route: 'NotificationCenter', badge: unreadCount },
        { icon: 'chatbubbles-outline', label: 'Assistant Level', subtitle: assistantLevel, route: null, isSwitch: true },
        { icon: 'globe-outline', label: 'Language', subtitle: 'English', route: 'Language' },
        { icon: 'cash-outline', label: 'Currency', subtitle: 'IDR', route: 'Currency' },
      ],
    },
    {
      title: 'Support',
      items: [
        { icon: 'help-circle-outline', label: 'Help Center', subtitle: 'FAQs and guides', route: 'Help' },
        { icon: 'chatbubble-outline', label: 'Contact Us', subtitle: 'support@eri.app', route: 'Contact' },
        { icon: 'document-text-outline', label: 'Privacy Policy', subtitle: 'Read our privacy policy', route: 'Privacy' },
      ],
    },
    {
      title: 'Account Actions',
      items: [
        { icon: 'log-out-outline', label: 'Logout', subtitle: 'Sign out of your account', route: null, isLogout: true },
      ],
    },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* User Info Card */}
        <View style={styles.userCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.display_name?.charAt(0)?.toUpperCase() || 'U'}
            </Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user?.display_name || 'User'}</Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
            <View style={styles.tierBadge}>
              <Text style={styles.tierText}>
                {user?.tier === 'pro' ? '⭐ Pro Plan' : user?.tier === 'studio' ? '🎨 Studio Plan' : '✨ Free Plan'}
              </Text>
            </View>
          </View>
        </View>

        {/* Menu Sections */}
        {menuSections.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.items.map((item, itemIndex) => (
              <TouchableOpacity
                key={itemIndex}
                style={styles.menuItem}
                onPress={() => {
                  if (item.isLogout) {
                    handleLogout();
                  } else if (item.route === 'NotificationCenter') {
                    navigation.navigate('NotificationCenter');
                  } else if (item.route) {
                    handleMenuPress(item.route);
                  }
                }}
                activeOpacity={0.7}
              >
                <View style={styles.menuIcon}>
                  <Ionicons name={item.icon as any} size={24} color={COLORS.primary} />
                </View>
                <View style={styles.menuTextContainer}>
                  <Text style={styles.menuTitle}>{item.label}</Text>
                  <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                </View>
                {item.isSwitch ? (
                  <View style={styles.switchContainer}>
                    {['minimal', 'normal', 'active'].map((level) => (
                      <TouchableOpacity
                        key={level}
                        style={[
                          styles.levelButton,
                          assistantLevel === level && styles.levelButtonActive,
                        ]}
                        onPress={() => updateAssistantLevel(level as any)}
                      >
                        <Text
                          style={[
                            styles.levelButtonText,
                            assistantLevel === level && styles.levelButtonTextActive,
                          ]}
                        >
                          {level.charAt(0).toUpperCase() + level.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : item.badge ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {item.badge > 99 ? '99+' : item.badge}
                    </Text>
                  </View>
                ) : (
                  <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        ))}

        <Text style={styles.versionText}>ERI App v1.0.0</Text>
        <View style={styles.bottomSpacer} />
      </ScrollView>
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
    paddingBottom: SPACING?.md || 16,
    paddingHorizontal: SPACING?.md || 16,
    backgroundColor: COLORS.surface || '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border || '#E5E7EB',
  },
  headerTitle: {
    ...TYPOGRAPHY?.h1 || { fontSize: 28, fontWeight: '700' },
    color: COLORS.text || '#111827',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  userCard: {
    flexDirection: 'row',
    margin: SPACING?.md || 16,
    padding: SPACING?.md || 16,
    backgroundColor: COLORS.surface || '#FFFFFF',
    borderRadius: RADIUS?.lg || 12,
    borderWidth: 1,
    borderColor: COLORS.border || '#E5E7EB',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary || '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING?.md || 16,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  userInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text || '#111827',
    marginBottom: SPACING?.xs || 4,
  },
  userEmail: {
    fontSize: 14,
    color: COLORS.textMuted || '#6B7280',
    marginBottom: SPACING?.xs || 8,
  },
  tierBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.primaryDim || '#EEF2FF',
    paddingHorizontal: SPACING?.sm || 12,
    paddingVertical: SPACING?.xs || 4,
    borderRadius: RADIUS?.round || 20,
  },
  tierText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary || '#6366F1',
  },
  section: {
    marginTop: SPACING?.md || 16,
    marginHorizontal: SPACING?.md || 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMuted || '#6B7280',
    marginBottom: SPACING?.sm || 12,
    textTransform: 'uppercase',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface || '#FFFFFF',
    borderRadius: RADIUS?.md || 8,
    padding: SPACING?.md || 16,
    marginBottom: SPACING?.xs || 8,
    borderWidth: 1,
    borderColor: COLORS.border || '#E5E7EB',
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primaryDim || '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING?.sm || 12,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text || '#111827',
  },
  menuSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted || '#6B7280',
    marginTop: 2,
  },
  switchContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  levelButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS?.round || 20,
    backgroundColor: COLORS.surfaceHighlight || '#F3F4F6',
  },
  levelButtonActive: {
    backgroundColor: COLORS.primary || '#6366F1',
  },
  levelButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted || '#6B7280',
  },
  levelButtonTextActive: {
    color: '#FFFFFF',
  },
  badge: {
    backgroundColor: COLORS.danger || '#EF4444',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    marginRight: SPACING?.xs || 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  versionText: {
    textAlign: 'center',
    fontSize: 12,
    color: COLORS.textMuted || '#6B7280',
    marginTop: SPACING?.xl || 32,
  },
  bottomSpacer: {
    height: 40,
  },
});