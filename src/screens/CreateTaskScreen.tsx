import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as SQLite from 'expo-sqlite';
import { ERIScreen } from '../components/ERIScreen';
import { ERIText } from '../components/ERIText';
import { ERIInput } from '../components/ERIInput';
import { ERIButton } from '../components/ERIButton';
import { COLORS, SPACING } from '../constants/theme';
import { useERIStore } from '../store/useERIStore';

const db = SQLite.openDatabaseSync('eri_local.db');

export const CreateTaskScreen = () => {
  const navigation = useNavigation<any>();
  const user = useERIStore((state) => state.user);
  
  const [clientName, setClientName] = useState('');
  const [projectTitle, setProjectTitle] = useState('');
  const [budget, setBudget] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    if (!clientName || !projectTitle) {
      Alert.alert('Error', 'Client Name and Project Title are required!');
      return;
    }

    setIsLoading(true);
    try {
      const id = Date.now().toString();
      const now = Math.floor(Date.now() / 1000);
      const userId = user?.id || 'temp-id';
      const numericBudget = budget ? parseFloat(budget) : 0;

      await db.runAsync(
        `INSERT INTO tasks (id, user_id, client_name, project_title, budget, status, sort_order, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, userId, clientName, projectTitle, numericBudget, 'active', 0, now, now]
      );
      
      setIsLoading(false);
      navigation.goBack();
    } catch (error) {
      setIsLoading(false);
      Alert.alert('Error', 'Failed to save new task.');
    }
  };

  return (
    <ERIScreen style={styles.container}>
      <View style={styles.header}>
        <ERIText variant="h2" color={COLORS.primary}>New Task</ERIText>
        <ERIText variant="body2" color={COLORS.textMuted}>
          Enter your client order details.
        </ERIText>
      </View>

      <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
        <ERIInput
          label="Project Title *"
          placeholder="e.g., Book Cover Illustration"
          value={projectTitle}
          onChangeText={setProjectTitle}
        />
        <ERIInput
          label="Client Name *"
          placeholder="e.g., John Doe"
          value={clientName}
          onChangeText={setClientName}
        />
        <ERIInput
          label="Budget / Price"
          placeholder="e.g., 1500000"
          value={budget}
          onChangeText={setBudget}
          keyboardType="numeric"
        />
      </ScrollView>

      <View style={styles.footer}>
        <ERIButton 
          title="Cancel" 
          variant="ghost" 
          onPress={() => navigation.goBack()} 
          style={styles.cancelButton}
          fullWidth={false}
        />
        <ERIButton 
          title="Save Task" 
          onPress={handleSave} 
          isLoading={isLoading}
          style={styles.saveButton}
          fullWidth={false}
        />
      </View>
    </ERIScreen>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { marginTop: SPACING.md, marginBottom: SPACING.lg },
  form: { flex: 1 },
  footer: { flexDirection: 'row', justifyContent: 'flex-end', paddingBottom: SPACING.xl, paddingTop: SPACING.md, gap: SPACING.md },
  cancelButton: { flex: 1 },
  saveButton: { flex: 2 },
});
