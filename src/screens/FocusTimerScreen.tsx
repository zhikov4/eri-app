import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ERIScreen } from '../components/ERIScreen';
import { ERIText } from '../components/ERIText';
import { ERIButton } from '../components/ERIButton';
import { COLORS, SPACING, RADIUS } from '../constants/theme';
import { useERIStore } from '../store/useERIStore';

export const FocusTimerScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const setFocusMode = useERIStore((state) => state.setFocusMode);
  
  const task = route.params?.task;
  
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 minutes default
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((time) => time - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsActive(false);
      setFocusMode(false);
      Alert.alert('Time is up!', 'Great job focusing on your masterpiece!');
    }

    return () => clearInterval(interval);
  }, [isActive, timeLeft, setFocusMode]);

  const toggleTimer = () => {
    setIsActive(!isActive);
    setFocusMode(!isActive);
  };

  const endSession = () => {
    setIsActive(false);
    setFocusMode(false);
    Alert.alert(
      'End Session',
      'Are you sure you want to end this focus session early?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'End Session', 
          style: 'destructive',
          onPress: () => navigation.goBack() 
        }
      ]
    );
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <ERIScreen style={styles.container}>
      <View style={styles.header}>
        <ERIText variant="h2" color={COLORS.primary} align="center">Focus Mode</ERIText>
        <ERIText variant="body1" color={COLORS.textMuted} align="center" style={styles.subtitle}>
          {task?.project_title || 'No Task Selected'}
        </ERIText>
      </View>

      <View style={styles.timerContainer}>
        <View style={styles.circle}>
          <ERIText variant="h1" color={COLORS.text} style={styles.timerText}>
            {formatTime(timeLeft)}
          </ERIText>
          <ERIText variant="body2" color={COLORS.textMuted}>
            Minutes Remaining
          </ERIText>
        </View>
      </View>

      <View style={styles.footer}>
        <ERIButton 
          title={isActive ? "Pause Focus" : "Start Focus"} 
          variant={isActive ? "secondary" : "primary"}
          onPress={toggleTimer}
          style={styles.actionButton}
        />
        <ERIButton 
          title="End Session" 
          variant="ghost" 
          onPress={endSession}
          style={styles.actionButton}
        />
      </View>
    </ERIScreen>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'space-between' },
  header: { marginTop: SPACING.xl, alignItems: 'center' },
  subtitle: { marginTop: SPACING.sm },
  timerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  circle: {
    width: 280,
    height: 280,
    borderRadius: 140,
    borderWidth: 4,
    borderColor: COLORS.surfaceHighlight,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
  },
  timerText: { fontSize: 64, marginBottom: SPACING.sm },
  footer: { paddingBottom: SPACING.xl, gap: SPACING.md },
  actionButton: { marginBottom: SPACING.sm },
});
