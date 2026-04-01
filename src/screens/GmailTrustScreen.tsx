import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
} from 'react-native';
import { COLORS, SPACING, RADIUS, TYPOGRAPHY } from '../constants/theme';

type Props = {
  onAccept: () => void;
  onDecline: () => void;
};

export const GmailTrustScreen = ({ onAccept, onDecline }: Props) => {
  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.icon}>📧</Text>
        <Text style={styles.title}>Connect Gmail (Optional)</Text>
        
        <Text style={styles.description}>
          ERI can read emails from Fiverr and VGen to automatically create tasks and track orders.
        </Text>
        
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>🔒 Privacy First</Text>
          <Text style={styles.infoText}>
            • ERI only reads emails from: {'\n'}
            <Text style={styles.highlight}>noreply@fiverr.com</Text> and {'\n'}
            <Text style={styles.highlight}>notifications@vgen.co</Text>
          </Text>
          <Text style={styles.infoText}>
            • We NEVER read your personal emails
          </Text>
          <Text style={styles.infoText}>
            • Your data stays private and secure
          </Text>
          <Text style={styles.infoText}>
            • You can disconnect anytime in Settings
          </Text>
        </View>
        
        <View style={styles.warningCard}>
          <Text style={styles.warningTitle}>⚠️ Without Gmail</Text>
          <Text style={styles.warningText}>
            You can still use all ERI features manually. You'll just need to:
          </Text>
          <Text style={styles.warningText}>• Create tasks manually</Text>
          <Text style={styles.warningText}>• Track orders yourself</Text>
        </View>
        
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.declineButton} onPress={onDecline}>
            <Text style={styles.declineButtonText}>Skip for now</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.acceptButton} onPress={onAccept}>
            <Text style={styles.acceptButtonText}>Continue with Gmail</Text>
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity onPress={() => Linking.openURL('https://eri.app/privacy')}>
          <Text style={styles.privacyLink}>Privacy Policy</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background || '#F9FAFB',
  },
  scrollContent: {
    flexGrow: 1,
    padding: SPACING?.xl || 32,
    justifyContent: 'center',
  },
  icon: {
    fontSize: 64,
    textAlign: 'center',
    marginBottom: SPACING?.lg || 24,
  },
  title: {
    ...TYPOGRAPHY?.h1 || { fontSize: 28, fontWeight: '700' },
    color: COLORS.text || '#111827',
    textAlign: 'center',
    marginBottom: SPACING?.md || 16,
  },
  description: {
    fontSize: 16,
    color: COLORS.textMuted || '#6B7280',
    textAlign: 'center',
    marginBottom: SPACING?.lg || 24,
    lineHeight: 24,
  },
  infoCard: {
    backgroundColor: COLORS.primaryDim || '#EEF2FF',
    borderRadius: RADIUS?.lg || 12,
    padding: SPACING?.lg || 24,
    marginBottom: SPACING?.md || 16,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.primary || '#6366F1',
    marginBottom: SPACING?.sm || 12,
  },
  infoText: {
    fontSize: 14,
    color: COLORS.text || '#111827',
    marginBottom: SPACING?.xs || 8,
    lineHeight: 20,
  },
  highlight: {
    fontWeight: '600',
    color: COLORS.primary || '#6366F1',
  },
  warningCard: {
    backgroundColor: COLORS.warningDim || '#FEF3C7',
    borderRadius: RADIUS?.lg || 12,
    padding: SPACING?.lg || 24,
    marginBottom: SPACING?.lg || 24,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.warning || '#F59E0B',
    marginBottom: SPACING?.sm || 12,
  },
  warningText: {
    fontSize: 13,
    color: COLORS.textMuted || '#6B7280',
    marginBottom: SPACING?.xs || 4,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: SPACING?.sm || 12,
    marginBottom: SPACING?.md || 16,
  },
  acceptButton: {
    flex: 2,
    backgroundColor: COLORS.primary || '#6366F1',
    paddingVertical: SPACING?.md || 16,
    borderRadius: RADIUS?.md || 8,
    alignItems: 'center',
  },
  acceptButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  declineButton: {
    flex: 1,
    backgroundColor: COLORS.surfaceHighlight || '#F3F4F6',
    paddingVertical: SPACING?.md || 16,
    borderRadius: RADIUS?.md || 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border || '#E5E7EB',
  },
  declineButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textMuted || '#6B7280',
  },
  privacyLink: {
    textAlign: 'center',
    fontSize: 12,
    color: COLORS.primary || '#6366F1',
    marginTop: SPACING?.md || 16,
  },
});