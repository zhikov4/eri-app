import React from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as SQLite from 'expo-sqlite';
import { ERIScreen } from '../components/ERIScreen';
import { ERIText } from '../components/ERIText';
import { ERIButton } from '../components/ERIButton';
import { COLORS, SPACING, RADIUS } from '../constants/theme';

const db = SQLite.openDatabaseSync('eri_local.db');

export const TaskDetailsScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const task = route.params?.task;

  const handleDelete = () => {
    Alert.alert(
      'Delete Task',
      'Are you sure you want to delete this masterpiece?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await db.runAsync('DELETE FROM tasks WHERE id = ?', [task.id]);
              navigation.goBack();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete task.');
            }
          } 
        }
      ]
    );
  };

  const handleComplete = async () => {
    try {
      await db.runAsync('UPDATE tasks SET status = ? WHERE id = ?', ['completed', task.id]);
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to update task.');
    }
  };

  if (!task) return null;

  return (
    <ERIScreen style={styles.container}>
      <View style={styles.header}>
        <ERIText variant="h2" color={COLORS.primary}>Task Details</ERIText>
      </View>

      <View style={styles.content}>
        <View style={styles.detailCard}>
          <ERIText variant="caption" color={COLORS.textMuted}>Project Title</ERIText>
          <ERIText variant="h3" color={COLORS.text} style={styles.value}>{task.project_title}</ERIText>

          <ERIText variant="caption" color={COLORS.textMuted}>Client Name</ERIText>
          <ERIText variant="body1" color={COLORS.text} style={styles.value}>{task.client_name}</ERIText>

          <ERIText variant="caption" color={COLORS.textMuted}>Budget</ERIText>
          <ERIText variant="body1" color={COLORS.success} style={styles.value}>Rp {task.budget}</ERIText>

          <ERIText variant="caption" color={COLORS.textMuted}>Status</ERIText>
          <ERIText variant="body1" color={COLORS.primary} style={styles.value}>{task.status.toUpperCase()}</ERIText>
        </View>
      </View>

      <View style={styles.footer}>
        {task.status !== 'completed' && (
          <ERIButton 
            title="Mark as Completed" 
            variant="primary" 
            onPress={handleComplete}
            style={styles.button}
          />
        )}
        <ERIButton 
          title="Delete Task" 
          variant="outline" 
          onPress={handleDelete}
          style={styles.button}
        />
        <ERIButton 
          title="Back" 
          variant="ghost" 
          onPress={() => navigation.goBack()}
          style={styles.button}
        />
      </View>
    </ERIScreen>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { marginTop: SPACING.xl, marginBottom: SPACING.lg },
  content: { flex: 1 },
  detailCard: { backgroundColor: COLORS.surfaceHighlight, padding: SPACING.lg, borderRadius: RADIUS.md },
  value: { marginBottom: SPACING.md, marginTop: SPACING.xs },
  footer: { paddingBottom: SPACING.xl },
  button: { marginBottom: SPACING.sm },
});
