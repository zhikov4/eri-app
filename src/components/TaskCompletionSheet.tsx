import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  FlatList,
} from 'react-native';
import { COLORS, SPACING, RADIUS, TYPOGRAPHY } from '../constants/theme';

type Props = {
  visible: boolean;
  onClose: () => void;
  onComplete: (tags: string[]) => void;
  taskTitle: string;
};

const SUGGESTED_TAGS = [
  'Illustration',
  'Character Design',
  'Logo',
  'Webtoon',
  'Mascot',
  'Background',
  'UI/UX',
  'Animation',
];

export const TaskCompletionSheet = ({ visible, onClose, onComplete, taskTitle }: Props) => {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState('');

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const addCustomTag = () => {
    if (customTag.trim() && !selectedTags.includes(customTag.trim())) {
      setSelectedTags([...selectedTags, customTag.trim()]);
      setCustomTag('');
    }
  };

  const handleComplete = () => {
    onComplete(selectedTags);
    setSelectedTags([]);
    setCustomTag('');
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          
          <Text style={styles.title}>Complete Task</Text>
          <Text style={styles.subtitle}>{taskTitle}</Text>
          
          <Text style={styles.label}>Add tags for archive (optional)</Text>
          
          {/* Suggested Tags */}
          <View style={styles.tagsContainer}>
            {SUGGESTED_TAGS.map(tag => (
              <TouchableOpacity
                key={tag}
                style={[
                  styles.tag,
                  selectedTags.includes(tag) && styles.tagSelected,
                ]}
                onPress={() => toggleTag(tag)}
              >
                <Text
                  style={[
                    styles.tagText,
                    selectedTags.includes(tag) && styles.tagTextSelected,
                  ]}
                >
                  {tag}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          
          {/* Custom Tag Input */}
          <View style={styles.customTagRow}>
            <TextInput
              style={styles.customTagInput}
              placeholder="Add custom tag..."
              placeholderTextColor={COLORS.textMuted}
              value={customTag}
              onChangeText={setCustomTag}
              onSubmitEditing={addCustomTag}
            />
            <TouchableOpacity style={styles.addTagButton} onPress={addCustomTag}>
              <Text style={styles.addTagButtonText}>+ Add</Text>
            </TouchableOpacity>
          </View>
          
          {/* Selected Tags */}
          {selectedTags.length > 0 && (
            <View style={styles.selectedContainer}>
              <Text style={styles.selectedLabel}>Selected:</Text>
              <View style={styles.selectedTags}>
                {selectedTags.map(tag => (
                  <View key={tag} style={styles.selectedTag}>
                    <Text style={styles.selectedTagText}>{tag}</Text>
                    <TouchableOpacity onPress={() => toggleTag(tag)}>
                      <Text style={styles.removeTag}>×</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>
          )}
          
          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.completeButton} onPress={handleComplete}>
              <Text style={styles.completeButtonText}>Complete Task</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.surface || '#FFFFFF',
    borderTopLeftRadius: RADIUS?.xl || 24,
    borderTopRightRadius: RADIUS?.xl || 24,
    padding: SPACING?.lg || 24,
    maxHeight: '80%',
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: COLORS.border || '#E5E7EB',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: SPACING?.lg || 24,
  },
  title: {
    ...TYPOGRAPHY?.h2 || { fontSize: 24, fontWeight: '700' },
    color: COLORS.text || '#111827',
    marginBottom: SPACING?.xs || 4,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textMuted || '#6B7280',
    marginBottom: SPACING?.lg || 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text || '#111827',
    marginBottom: SPACING?.sm || 12,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: SPACING?.md || 16,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS?.round || 20,
    backgroundColor: COLORS.surfaceHighlight || '#F3F4F6',
    borderWidth: 1,
    borderColor: COLORS.border || '#E5E7EB',
  },
  tagSelected: {
    backgroundColor: COLORS.primaryDim || '#EEF2FF',
    borderColor: COLORS.primary || '#6366F1',
  },
  tagText: {
    fontSize: 13,
    color: COLORS.textMuted || '#6B7280',
  },
  tagTextSelected: {
    color: COLORS.primary || '#6366F1',
    fontWeight: '600',
  },
  customTagRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: SPACING?.md || 16,
  },
  customTagInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border || '#E5E7EB',
    borderRadius: RADIUS?.md || 8,
    paddingHorizontal: SPACING?.sm || 12,
    paddingVertical: 8,
    fontSize: 14,
    color: COLORS.text || '#111827',
  },
  addTagButton: {
    backgroundColor: COLORS.primary || '#6366F1',
    borderRadius: RADIUS?.md || 8,
    paddingHorizontal: SPACING?.md || 16,
    justifyContent: 'center',
  },
  addTagButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
  selectedContainer: {
    marginBottom: SPACING?.lg || 24,
  },
  selectedLabel: {
    fontSize: 12,
    color: COLORS.textMuted || '#6B7280',
    marginBottom: SPACING?.xs || 8,
  },
  selectedTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryDim || '#EEF2FF',
    borderRadius: RADIUS?.round || 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 4,
  },
  selectedTagText: {
    fontSize: 12,
    color: COLORS.primary || '#6366F1',
    fontWeight: '600',
  },
  removeTag: {
    fontSize: 16,
    color: COLORS.primary || '#6366F1',
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: SPACING?.sm || 12,
    marginTop: SPACING?.sm || 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: RADIUS?.md || 8,
    backgroundColor: COLORS.surfaceHighlight || '#F3F4F6',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textMuted || '#6B7280',
  },
  completeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: RADIUS?.md || 8,
    backgroundColor: COLORS.success || '#10B981',
    alignItems: 'center',
  },
  completeButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});