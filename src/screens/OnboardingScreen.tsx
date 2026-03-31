import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { getDatabase } from '../db/database';
import { useERIStore } from '../store/useERIStore';
import { COLORS, SPACING, RADIUS, TYPOGRAPHY } from '../constants/theme';

type Props = {
  navigation: any;
  route: any;
};

type Step = 1 | 2 | 3;

export const OnboardingScreen = ({ navigation, route }: Props) => {
  const { userId, displayName } = route.params || {};
  const setUser = useERIStore((state) => state.setUser);

  const [step, setStep] = useState<Step>(1);
  const [currency, setCurrency] = useState<'IDR' | 'USD'>('IDR');
  const [dailyTarget, setDailyTarget] = useState<number>(360);
  const [loading, setLoading] = useState(false);

  const dailyTargetOptions = [
    { label: '2 hours', value: 120 },
    { label: '4 hours', value: 240 },
    { label: '6 hours', value: 360 },
    { label: '8 hours', value: 480 },
  ];

  const handleFinish = async (connectGmail: boolean) => {
    setLoading(true);
    try {
      const now = Math.floor(Date.now() / 1000);
      const db = await getDatabase();

      await db.runAsync(
        `UPDATE user_settings SET default_currency = ?, daily_focus_target_minutes = ?, updated_at = ? WHERE user_id = ?`,
        [currency, dailyTarget, now, userId]
      );

      const { data } = await supabase.auth.getSession();
      const session = data.session;

      setUser({
        id: userId,
        email: session?.user?.email || '',
        displayName,
        tier: 'pro',
      });
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>ERI ✦</Text>
        <Text style={styles.welcome}>Welcome, {displayName || 'Creative'}! 👋</Text>
        <Text style={styles.subtitle}>Let's set up your workspace in 3 quick steps.</Text>
      </View>

      {/* Step Indicator */}
      <View style={styles.stepRow}>
        {[1, 2, 3].map((s) => (
          <View key={s} style={[styles.stepDot, step === s ? styles.stepDotActive : step > s ? styles.stepDotDone : null]} >
            {step > s
              ? <Text style={styles.stepDotText}>✓</Text>
              : <Text style={styles.stepDotText}>{s}</Text>}
          </View>
        ))}
      </View>

      {/* ── STEP 1: Currency ── */}
      {step === 1 && (
        <View style={styles.card}>
          <Text style={styles.stepTitle}>💰 Default Currency</Text>
          <Text style={styles.stepDesc}>
            Choose your default invoice currency. You can always override this per invoice.
          </Text>
          <View style={styles.optionRow}>
            <TouchableOpacity
              style={[styles.optionBtn, currency === 'IDR' ? styles.optionBtnActive : null]}
              onPress={() => setCurrency('IDR')}
            >
              <Text style={styles.optionFlag}>🇮🇩</Text>
              <Text style={[styles.optionLabel, currency === 'IDR' ? styles.optionLabelActive : null]}>
                IDR
              </Text>
              <Text style={styles.optionSub}>Indonesian Rupiah</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.optionBtn, currency === 'USD' ? styles.optionBtnActive : null]}
              onPress={() => setCurrency('USD')}
            >
              <Text style={styles.optionFlag}>🇺🇸</Text>
              <Text style={[styles.optionLabel, currency === 'USD' ? styles.optionLabelActive : null]}>
                USD
              </Text>
              <Text style={styles.optionSub}>US Dollar</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.nextBtn} onPress={() => setStep(2)}>
            <Text style={styles.nextBtnText}>Next →</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── STEP 2: Daily Focus Target ── */}
      {step === 2 && (
        <View style={styles.card}>
          <Text style={styles.stepTitle}>🎯 Daily Focus Target</Text>
          <Text style={styles.stepDesc}>
            How many hours do you aim to focus each day? ERI will track your progress toward this goal.
          </Text>
          <View style={styles.targetGrid}>
            {dailyTargetOptions.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.targetBtn, dailyTarget === opt.value ? styles.targetBtnActive : null]}
                onPress={() => setDailyTarget(opt.value)}
              >
                <Text style={[styles.targetLabel, dailyTarget === opt.value ? styles.targetLabelActive : null]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.navRow}>
            <TouchableOpacity style={styles.backBtn} onPress={() => setStep(1)}>
              <Text style={styles.backBtnText}>← Back</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.nextBtn} onPress={() => setStep(3)}>
              <Text style={styles.nextBtnText}>Next →</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── STEP 3: Gmail (Optional) ── */}
      {step === 3 && (
        <View style={styles.card}>
          <Text style={styles.stepTitle}>📬 Connect Gmail</Text>
          <Text style={styles.stepDesc}>
            ERI can automatically detect new orders from Fiverr & VGen by reading your Gmail.
          </Text>

          <View style={styles.trustBox}>
            <Text style={styles.trustTitle}>🔒 Privacy First</Text>
            <Text style={styles.trustItem}>✓ We only read emails from Fiverr & VGen</Text>
            <Text style={styles.trustItem}>✓ We never read your personal emails</Text>
            <Text style={styles.trustItem}>✓ You can disconnect anytime in Settings</Text>
          </View>

          <Text style={styles.optionalNote}>This is completely optional — you can skip this and connect later.</Text>

          {loading ? (
            <ActivityIndicator color={COLORS.primary} size="large" style={{ marginTop: 20 }} />
          ) : (
            <View style={styles.navRow}>
              <TouchableOpacity style={styles.skipBtn} onPress={() => handleFinish(false)}>
                <Text style={styles.skipBtnText}>Skip for now</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.nextBtn} onPress={() => handleFinish(true)}>
                <Text style={styles.nextBtnText}>Connect Gmail</Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity style={{ marginTop: 12 }} onPress={() => setStep(2)}>
            <Text style={styles.backBtnText}>← Back</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: SPACING.lg,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  logo: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 12,
  },
  welcome: {
    ...TYPOGRAPHY.h2,
    color: COLORS.text,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: 6,
    textAlign: 'center',
  },
  stepRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: SPACING.xl,
  },
  stepDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryDim,
  },
  stepDotDone: {
    borderColor: COLORS.success,
    backgroundColor: COLORS.success + '22',
  },
  stepDotText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  stepDesc: {
    fontSize: 14,
    color: COLORS.textMuted,
    lineHeight: 20,
    marginBottom: SPACING.lg,
  },
  optionRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: SPACING.lg,
  },
  optionBtn: {
    flex: 1,
    backgroundColor: COLORS.surfaceHighlight,
    borderRadius: RADIUS.lg,
    borderWidth: 2,
    borderColor: COLORS.border,
    padding: SPACING.md,
    alignItems: 'center',
  },
  optionBtnActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryDim,
  },
  optionFlag: {
    fontSize: 28,
    marginBottom: 6,
  },
  optionLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  optionLabelActive: {
    color: COLORS.primary,
  },
  optionSub: {
    fontSize: 11,
    color: COLORS.textDim,
    marginTop: 2,
  },
  targetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: SPACING.lg,
  },
  targetBtn: {
    width: '47%',
    backgroundColor: COLORS.surfaceHighlight,
    borderRadius: RADIUS.md,
    borderWidth: 2,
    borderColor: COLORS.border,
    paddingVertical: 16,
    alignItems: 'center',
  },
  targetBtnActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryDim,
  },
  targetLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  targetLabelActive: {
    color: COLORS.primary,
  },
  trustBox: {
    backgroundColor: COLORS.surfaceHighlight,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.success + '33',
  },
  trustTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.success,
    marginBottom: 8,
  },
  trustItem: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  optionalNote: {
    fontSize: 12,
    color: COLORS.textDim,
    textAlign: 'center',
    marginBottom: SPACING.lg,
    fontStyle: 'italic',
  },
  navRow: {
    flexDirection: 'row',
    gap: 10,
  },
  nextBtn: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  nextBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  backBtn: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  backBtnText: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  skipBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  skipBtnText: {
    color: COLORS.textMuted,
    fontSize: 15,
    fontWeight: '600',
  },
});