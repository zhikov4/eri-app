import React, { useState } from 'react';
import { View, StyleSheet, FlatList, Image, TouchableOpacity, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ERIScreen } from '../components/ERIScreen';
import { ERIText } from '../components/ERIText';
import { ERIButton } from '../components/ERIButton';
import { COLORS, SPACING, RADIUS } from '../constants/theme';

export const VaultScreen = () => {
  const [activeTab, setActiveTab] = useState<'personal' | 'archived'>('personal');
  const [files, setFiles] = useState<{ uri: string }[]>([]); 

  // Mock storage values based on ERI Documentation (Free Tier = 500MB)
  const storageUsed = 120; 
  const storageLimit = 500; 
  const storagePct = (storageUsed / storageLimit) * 100;

  const handleUpload = async () => {
    if (storagePct >= 95) {
      Alert.alert('Storage Full', 'You have reached 95% of your storage limit. Please upgrade or delete some files.');
      return;
    }

    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert('Permission Required', 'ERI needs access to your gallery to upload references!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setFiles((prevFiles) => [{ uri: result.assets[0].uri }, ...prevFiles]);
    }
  };

  const renderFileItem = ({ item }: { item: { uri: string } }) => (
    <TouchableOpacity style={styles.imageCard}>
      <Image source={{ uri: item.uri }} style={styles.image} resizeMode="cover" />
    </TouchableOpacity>
  );

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
            renderItem={renderFileItem}
            numColumns={2}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContainer}
            columnWrapperStyle={styles.rowWrapper}
          />
        )}
      </View>

      <View style={styles.footer}>
        <ERIButton 
          title="+ Upload File" 
          onPress={handleUpload} 
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
  listContainer: { paddingBottom: SPACING.xl },
  rowWrapper: { justifyContent: 'space-between', marginBottom: SPACING.md },
  imageCard: {
    width: '48%',
    aspectRatio: 1,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    backgroundColor: COLORS.surfaceHighlight,
  },
  image: { width: '100%', height: '100%' },
  footer: { paddingBottom: SPACING.xl },
});
