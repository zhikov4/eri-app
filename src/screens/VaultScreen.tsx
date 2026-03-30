import React, { useState } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { ERIScreen } from '../components/ERIScreen';
import { ERIText } from '../components/ERIText';
import { ERIButton } from '../components/ERIButton';
import { COLORS, SPACING, RADIUS } from '../constants/theme';

export const VaultScreen = () => {
  const [activeTab, setActiveTab] = useState<'personal' | 'archived'>('personal');
  const [files, setFiles] = useState<any[]>([]); 

  // Mock storage values untuk preview UI
  const storageUsed = 120; 
  const storageLimit = 500; 
  const storagePct = (storageUsed / storageLimit) * 100;

  return (
    <ERIScreen style={styles.container}>
      <View style={styles.header}>
        <ERIText variant="h1" color={COLORS.primary}>Global Vault</ERIText>
        <ERIText variant="body1" color={COLORS.textMuted}>
          Your personal collection and task archives.
        </ERIText>
      </View>

      <View style={styles.storageCard}>
        <View style={styles.storageHeader}>
          <ERIText variant="h3" color={COLORS.text}>Storage (Free Tier)</ERIText>
          <ERIText variant="body2" color={COLORS.textMuted}>{storageUsed}MB / {storageLimit}MB</ERIText>
        </View>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${storagePct}%` }]} />
        </View>
        <ERIText variant="caption" color={COLORS.textMuted} style={styles.storageHint}>
          Alert at 80%. Soft block at 95%.
        </ERIText>
      </View>

      <View style={styles.tabContainer}>
        <ERIButton 
          title="Personal" 
          variant={activeTab === 'personal' ? 'primary' : 'ghost'} 
          onPress={() => setActiveTab('personal')}
          style={styles.tabButton}
          fullWidth={false}
        />
        <ERIButton 
          title="Task Archives" 
          variant={activeTab === 'archived' ? 'primary' : 'ghost'} 
          onPress={() => setActiveTab('archived')}
          style={styles.tabButton}
          fullWidth={false}
        />
      </View>

      <View style={styles.content}>
        {files.length === 0 ? (
          <View style={styles.emptyContainer}>
            <ERIText variant="body1" color={COLORS.textMuted} align="center">
              No files yet in your {activeTab === 'personal' ? 'Personal' : 'Archived'} vault.
            </ERIText>
          </View>
        ) : (
          <FlatList
            data={files}
            keyExtractor={(item, index) => index.toString()}
            renderItem={() => null}
          />
        )}
      </View>

      <View style={styles.footer}>
        <ERIButton 
          title="+ Upload File" 
          onPress={() => {}} 
        />
      </View>
    </ERIScreen>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'space-between' },
  header: { marginTop: SPACING.xl, marginBottom: SPACING.md },
  storageCard: {
    backgroundColor: COLORS.surfaceHighlight,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.lg,
  },
  storageHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.sm },
  progressBarBg: { height: 8, backgroundColor: COLORS.surface, borderRadius: RADIUS.round, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: COLORS.primary },
  storageHint: { marginTop: SPACING.xs },
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
  footer: { paddingBottom: SPACING.xl },
});
