import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { ERIScreen } from '../components/ERIScreen';
import { ERIText } from '../components/ERIText';
import { ERIButton } from '../components/ERIButton';
import { COLORS, SPACING } from '../constants/theme';
import { useERIStore } from '../store/useERIStore';

export const OnboardingScreen = () => {
  const setUser = useERIStore((state) => state.setUser);
  const [step, setStep] = useState(1);
  const [currency, setCurrency] = useState<'IDR' | 'USD'>('IDR');
  const [dailyTarget, setDailyTarget] = useState('4');

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      completeOnboarding();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const completeOnboarding = () => {
    setUser({
      id: 'temp-id',
      email: 'user@example.com',
      displayName: 'Illustrator',
      tier: 'free',
    });
  };

  const renderStep1 = () => (
    <View style={styles.content}>
      <ERIText variant="h2" style={styles.title}>Choose Currency</ERIText>
      <ERIText variant="body1" style={styles.subtitle} color={COLORS.textMuted}>
        This currency will be used as the default for your invoices.
      </ERIText>
      <View style={styles.optionContainer}>
        <ERIButton
          title="IDR (Rupiah)"
          variant={currency === 'IDR' ? 'primary' : 'outline'}
          onPress={() => setCurrency('IDR')}
          style={styles.optionButton}
        />
        <ERIButton
          title="USD (US Dollar)"
          variant={currency === 'USD' ? 'primary' : 'outline'}
          onPress={() => setCurrency('USD')}
          style={styles.optionButton}
        />
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.content}>
      <ERIText variant="h2" style={styles.title}>Daily Target</ERIText>
      <ERIText variant="body1" style={styles.subtitle} color={COLORS.textMuted}>
        How many hours do you want to focus every day?
      </ERIText>
      <View style={styles.optionContainer}>
        {['2', '4', '6', '8'].map((hours) => (
          <ERIButton
            key={hours}
            title={`${hours} Hours`}
            variant={dailyTarget === hours ? 'primary' : 'outline'}
            onPress={() => setDailyTarget(hours)}
            style={styles.optionButton}
          />
        ))}
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.content}>
      <ERIText variant="h2" style={styles.title}>Connect Gmail</ERIText>
      <ERIText variant="body1" style={styles.subtitle} color={COLORS.textMuted}>
        Connect your Gmail so ERI can monitor incoming orders automatically.
      </ERIText>
      <View style={styles.optionContainer}>
        <ERIButton
          title="Connect Gmail"
          variant="secondary"
          onPress={handleNext}
          style={styles.optionButton}
        />
        <ERIButton
          title="Skip This Step"
          variant="primary"
          onPress={handleNext}
          style={styles.optionButton}
        />
      </View>
    </View>
  );

  return (
    <ERIScreen style={styles.container}>
      {step === 1 && renderStep1()}
      {step === 2 && renderStep2()}
      {step === 3 && renderStep3()}
      
      <View style={styles.footer}>
        {step < 3 && (
          <ERIButton 
            title="Next" 
            onPress={handleNext} 
            style={styles.footerButton} 
          />
        )}
        {step > 1 && (
          <ERIButton 
            title="Back" 
            variant="ghost" 
            onPress={handleBack} 
          />
        )}
      </View>
    </ERIScreen>
  );
};

const styles = StyleSheet.create({
  container: { justifyContent: 'space-between' },
  content: { flex: 1, justifyContent: 'center', marginTop: SPACING.xl },
  title: { marginBottom: SPACING.sm, textAlign: 'center' },
  subtitle: { marginBottom: SPACING.xl, textAlign: 'center' },
  optionContainer: { gap: SPACING.md },
  optionButton: { marginBottom: SPACING.sm },
  footer: { paddingBottom: SPACING.xl },
  footerButton: { marginBottom: SPACING.sm },
});
