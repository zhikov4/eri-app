import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getDatabase } from '../db/database';
import { useERIStore } from '../store/useERIStore';
import { COLORS, SPACING, RADIUS, TYPOGRAPHY } from '../constants/theme';

type Task = {
  id: string;
  client_name: string;
  project_title: string;
  platform: string;
  status: string;
  progress_pct: number;
  deadline: number | null;
  budget: number | null;
  currency: string;
  created_at: number;
};

type Props = { navigation: any };

export const TasksScreen = ({ navigation }: Props) => {
  const user = useERIStore((state) => state.user);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'urgent' | 'pending'>('all');

  const loadTasks = async () => {
    if (!user?.id) return;
    try {
      const db = await getDatabase();
      let query = `SELECT * FROM tasks WHERE user_id = ? AND pool = 'active'`;
      const params: any[] = [user.id];

      if (filter === 'urgent') {
        query += ` AND (status = 'urgent' OR priority >= 2)`;
      } else if (filter === 'active') {
        query += ` AND status = 'active'`;
      } else if (filter === 'pending') {
        query += ` AND status = 'pending'`;
      }

      query += ` ORDER BY created_at DESC`;

      const result = await db.getAllAsync<Task>(query, params);
      setTasks(result);
    } catch (e: any) {
      console.error('Load tasks error:', e);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadTasks();
    }, [user?.id, filter])
  );

  const getPlatformColor = (platform: string) => {
    switch (platform) {
      case 'fiverr': return COLORS.fiverr;
      case 'vgen': return COLORS.vgen;
      default: return COLORS.direct;
    }
  };

  const formatBudget = (budget: number | null, currency: string) => {
    if (!budget) return '—';
    if (currency === 'IDR') return `Rp ${budget.toLocaleString('id-ID')}`;
    return `$${budget.toFixed(2)}`;
  };

  const formatDeadline = (deadline: number | null) => {
    if (!deadline) return null;
    const date = new Date(deadline * 1000);
    const now = new Date();
    const diff = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return { text: 'Overdue', color: COLORS.danger };
    if (diff === 0) return { text: 'Due today', color: COLORS.danger };
    if (diff === 1) return { text: 'Due tomorrow', color: COLORS.warning };
    if (diff <= 3) return { text: `${diff} days left`, color: COLORS.warning };
    return { text: `${diff} days left`, color: COLORS.textMuted };
  };

  const filters = [
    { key: 'all', label: 'All' },
    { key: 'active', label: 'Active' },
    { key: 'urgent', label: 'Urgent' },
    { key: 'pending', label: 'Pending' },
  ];

  const renderTask = ({ item }: { item: Task }) => {
    const deadline = formatDeadline(item.deadline);
    const platformColor = getPlatformColor(item.platform);

    return (
      <TouchableOpacity
        style={styles.taskCard}
        onPress={() => navigation.navigate('TaskDetails', { taskId: item.id })}
        activeOpacity={0.75}
      >
        <View style={styles.taskHeader}>
          <View style={[styles.platformBadge, { backgroundColor: platformColor + '22', borderColor: platformColor + '55' }]}>
            <Text style={[styles.platformText, { color: platformColor }]}>
              {item.platform.toUpperCase()}
            </Text>
          </View>
          {deadline && (
            <Text style={[styles.deadlineText, { color: deadline.color }]}>
              {deadline.text}
            </Text>
          )}
        </View>

        <Text style={styles.clientName}>{item.client_name}</Text>
        <Text style={styles.projectTitle} numberOfLines={1}>{item.project_title}</Text>

        <View style={styles.taskFooter}>
          <Text style={styles.budgetText}>{formatBudget(item.budget, item.currency)}</Text>
          <View style={styles.progressRow}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${item.progress_pct}%` }]} />
            </View>
            <Text style={styles.progressText}>{item.progress_pct}%</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Working List</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => navigation.navigate('CreateTask')}
        >
          <Text style={styles.addBtnText}>+ New Task</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Chips */}
      <View style={styles.filterRow}>
        {filters.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterChip, filter === f.key ? styles.filterChipActive : null]}
            onPress={() => setFilter(f.key as any)}
          >
            <Text style={[styles.filterChipText, filter === f.key ? styles.filterChipTextActive : null]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Task List */}
      <FlatList
        data={tasks}
        keyExtractor={(item) => item.id}
        renderItem={renderTask}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={loadTasks}
            tintColor={COLORS.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🎨</Text>
            <Text style={styles.emptyTitle}>No tasks yet</Text>
            <Text style={styles.emptyDesc}>Tap "+ New Task" to add your first project.</Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => navigation.navigate('CreateTask')}
            >
              <Text style={styles.emptyBtnText}>Create First Task</Text>
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
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingTop: 60,
    paddingBottom: SPACING.md,
  },
  title: {
    ...TYPOGRAPHY.h2,
    color: COLORS.text,
  },
  addBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.round,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  addBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    gap: 8,
    marginBottom: SPACING.md,
  },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: RADIUS.round,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterChipActive: {
    backgroundColor: COLORS.primaryDim,
    borderColor: COLORS.primary,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  filterChipTextActive: {
    color: COLORS.primary,
  },
  listContent: {
    padding: SPACING.md,
    gap: 12,
    paddingBottom: 100,
  },
  taskCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  platformBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.round,
    borderWidth: 1,
  },
  platformText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  deadlineText: {
    fontSize: 12,
    fontWeight: '600',
  },
  clientName: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginBottom: 2,
  },
  projectTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  taskFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  budgetText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.accent,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  progressBar: {
    width: 80,
    height: 4,
    backgroundColor: COLORS.surfaceHighlight,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
  progressText: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
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
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
  },
  emptyDesc: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    paddingHorizontal: SPACING.xl,
  },
  emptyBtn: {
    marginTop: SPACING.md,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  emptyBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});