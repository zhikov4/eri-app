import React, { useState, useCallback } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, LayoutAnimation, Platform, UIManager } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import * as SQLite from 'expo-sqlite';
import { ERIScreen } from '../components/ERIScreen';
import { ERIText } from '../components/ERIText';
import { ERIButton } from '../components/ERIButton';
import { COLORS, SPACING, RADIUS } from '../constants/theme';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const db = SQLite.openDatabaseSync('eri_local.db');

export const TasksScreen = () => {
  const navigation = useNavigation<any>();
  const [tasks, setTasks] = useState<any[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'active' | 'completed'>('active');

  const fetchTasks = useCallback(async () => {
    try {
      const result = await db.getAllAsync(`SELECT * FROM tasks WHERE status = '${filter}' ORDER BY created_at DESC`);
      setTasks(result);
    } catch (error) {
      console.log(error);
    }
  }, [filter]);

  useFocusEffect(
    useCallback(() => {
      fetchTasks();
    }, [fetchTasks])
  );

  const toggleExpand = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId(expandedId === id ? null : id);
  };

  const renderTaskItem = ({ item }: { item: any }) => {
    const isExpanded = expandedId === item.id;

    return (
      <TouchableOpacity 
        style={styles.taskCard} 
        onPress={() => toggleExpand(item.id)}
        activeOpacity={0.8}
      >
        <View style={styles.taskHeader}>
          <View style={styles.taskTitleContainer}>
            <ERIText variant="h3" color={COLORS.text}>{item.project_title}</ERIText>
            <ERIText variant="body2" color={COLORS.textMuted}>{item.client_name}</ERIText>
          </View>
          <ERIText variant="h3" color={COLORS.textMuted}>
            {isExpanded ? '▲' : '▼'}
          </ERIText>
        </View>

        {!isExpanded && (
          <View style={styles.taskFooterCollapsed}>
            <ERIText variant="caption" color={COLORS.primary}>Rp {item.budget}</ERIText>
            <ERIText variant="caption" color={filter === 'active' ? COLORS.success : COLORS.textMuted}>
              {filter === 'active' ? 'Active' : 'Completed'}
            </ERIText>
          </View>
        )}

        {isExpanded && (
          <View style={styles.expandedContent}>
            <View style={styles.divider} />
            
            <View style={styles.detailRow}>
              <ERIText variant="caption" color={COLORS.textMuted}>Budget</ERIText>
              <ERIText variant="body1" color={COLORS.primary}>Rp {item.budget}</ERIText>
            </View>
            
            <View style={styles.detailRow}>
              <ERIText variant="caption" color={COLORS.textMuted}>Status</ERIText>
              <ERIText variant="body1" color={filter === 'active' ? COLORS.success : COLORS.textMuted}>
                {filter === 'active' ? 'Active' : 'Completed'}
              </ERIText>
            </View>

            <View style={styles.actionRow}>
              {filter === 'active' && (
                <ERIButton 
                  title="Start Focus" 
                  variant="primary" 
                  style={styles.actionButton} 
                  fullWidth={false}
                  onPress={() => navigation.navigate('FocusTimer', { task: item })}
                />
              )}
              <ERIButton 
                title="Details" 
                variant="outline" 
                style={styles.actionButton} 
                fullWidth={false}
                onPress={() => navigation.navigate('TaskDetails', { task: item })}
              />
            </View>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <ERIScreen style={styles.container}>
      <View style={styles.header}>
        <ERIText variant="h1" color={COLORS.primary}>Your Tasks</ERIText>
        <ERIText variant="body1" color={COLORS.textMuted}>
          Track your masterpieces here!
        </ERIText>
      </View>

      <View style={styles.tabContainer}>
        <ERIButton 
          title="Active" 
          variant={filter === 'active' ? 'primary' : 'ghost'} 
          onPress={() => { setFilter('active'); setExpandedId(null); }}
          style={styles.tabButton}
          fullWidth={false}
        />
        <ERIButton 
          title="Completed" 
          variant={filter === 'completed' ? 'primary' : 'ghost'} 
          onPress={() => { setFilter('completed'); setExpandedId(null); }}
          style={styles.tabButton}
          fullWidth={false}
        />
      </View>

      <View style={styles.content}>
        {tasks.length === 0 ? (
          <View style={styles.emptyContainer}>
            <ERIText variant="body1" color={COLORS.textMuted} align="center" style={styles.emptyText}>
              {filter === 'active' 
                ? "No active tasks yet. Let's add your first project!" 
                : "No completed tasks yet. Keep up the good work!"}
            </ERIText>
          </View>
        ) : (
          <FlatList
            data={tasks}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderTaskItem}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContainer}
          />
        )}
      </View>

      <View style={styles.footer}>
        <ERIButton 
          title="+ Add New Task" 
          onPress={() => navigation.navigate('CreateTask')} 
        />
      </View>
    </ERIScreen>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'space-between' },
  header: { marginTop: SPACING.xl, marginBottom: SPACING.md },
  tabContainer: { 
    flexDirection: 'row', 
    marginBottom: SPACING.md,
    backgroundColor: COLORS.surfaceHighlight,
    borderRadius: RADIUS.md,
    padding: SPACING.xs,
  },
  tabButton: { flex: 1, paddingVertical: SPACING.sm },
  content: { flex: 1 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { marginBottom: SPACING.lg },
  listContainer: { paddingBottom: SPACING.xl },
  taskCard: { backgroundColor: COLORS.surfaceHighlight, padding: SPACING.md, borderRadius: RADIUS.md, marginBottom: SPACING.sm },
  taskHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  taskTitleContainer: { flex: 1 },
  taskFooterCollapsed: { flexDirection: 'row', justifyContent: 'space-between', marginTop: SPACING.sm },
  expandedContent: { marginTop: SPACING.md },
  divider: { height: 1, backgroundColor: COLORS.border, marginBottom: SPACING.md },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  actionRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: SPACING.sm, marginTop: SPACING.sm },
  actionButton: { paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md },
  footer: { paddingBottom: SPACING.xl },
});
