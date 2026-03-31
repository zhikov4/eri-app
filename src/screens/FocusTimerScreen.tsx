import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  AppState,
  AppStateStatus,
  TextInput,
} from 'react-native';
import { getDatabase } from '../db/database';
import { useERIStore } from '../store/useERIStore';
import { COLORS, SPACING, RADIUS, TYPOGRAPHY } from '../constants/theme';
import * as Notifications from 'expo-notifications';
import { Audio } from 'expo-av';

type Props = {
  route: any;
  navigation: any;
};

type DurationOption = {
  label: string;
  minutes: number;
};

const DURATIONS: DurationOption[] = [
  { label: '25 min', minutes: 25 },
  { label: '45 min', minutes: 45 },
  { label: '60 min', minutes: 60 },
  { label: 'Custom', minutes: 0 },
];

export const FocusTimerScreen = ({ route, navigation }: Props) => {
  const { taskId } = route.params;
  const user = useERIStore((state) => state.user);
  const [task, setTask] = useState<any>(null);
  const [selectedDuration, setSelectedDuration] = useState<DurationOption>(DURATIONS[0]);
  const [customMinutes, setCustomMinutes] = useState('');
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout>();
  const soundRef = useRef<Audio.Sound>();
  const appStateRef = useRef(AppState.currentState);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    loadTask();
    setupNotifications();
    setupAudio();
    setupAppStateListener();

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      stopSilentAudio();
      // Safely remove notification listeners
      try {
        // In Expo, the method might be async or named differently
        if (Notifications.removeAllNotificationListenersAsync) {
          Notifications.removeAllNotificationListenersAsync();
        } else if (Notifications.removeAllNotificationListeners) {
          Notifications.removeAllNotificationListeners();
        }
      } catch (e) {
        console.warn('Failed to remove notification listeners', e);
      }
    };
  }, []);

  const loadTask = async () => {
    try {
      const db = await getDatabase();
      const result = await db.getFirstAsync(
        `SELECT * FROM tasks WHERE id = ?`,
        [taskId]
      );
      setTask(result);
    } catch (error) {
      console.error('Error loading task:', error);
    }
  };

  const setupNotifications = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      console.warn('Notification permissions not granted');
    }
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  };

  const setupAudio = async () => {
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
      });
    } catch (error) {
      console.error('Error setting audio mode:', error);
    }
  };

  const setupAppStateListener = () => {
    AppState.addEventListener('change', handleAppStateChange);
  };

  const handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (nextAppState === 'background' && isActive && !isPaused) {
      scheduleTimerNotification();
      startSilentAudio();
    }
    if (nextAppState === 'active' && isActive && !isPaused) {
      stopSilentAudio();
    }
    appStateRef.current = nextAppState;
  };

  const startSilentAudio = async () => {
    try {
      const { sound } = await Audio.Sound.createAsync(
        require('../../assets/silent.mp3'),
        { shouldPlay: true, isLooping: true, volume: 0.01 }
      );
      soundRef.current = sound;
    } catch (error) {
      console.error('Error starting silent audio:', error);
    }
  };

  const stopSilentAudio = async () => {
    if (soundRef.current) {
      await soundRef.current.stopAsync();
      await soundRef.current.unloadAsync();
      soundRef.current = undefined;
    }
  };

  const scheduleTimerNotification = async () => {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Focus Session Complete!',
        body: `Time's up for ${task?.project_title || 'your task'}. Take a break!`,
        sound: true,
      },
      trigger: {
        seconds: timeLeft,
      },
    });
  };

  const playCompletionSound = async () => {
    try {
      const { sound } = await Audio.Sound.createAsync(
        require('../../assets/complete.mp3')
      );
      await sound.playAsync();
      setTimeout(() => sound.unloadAsync(), 3000);
    } catch (error) {
      console.error('Error playing sound:', error);
    }
  };

  const startTimer = async () => {
    if (!user?.id) return;

    try {
      const db = await getDatabase();
      const minutes = selectedDuration.minutes || parseInt(customMinutes) || 25;
      const totalSeconds = minutes * 60;

      setTimeLeft(totalSeconds);
      setIsActive(true);
      setIsPaused(false);
      startTimeRef.current = Date.now();

      // Create focus session record with actual_minutes = 0 initially
      const newSessionId = Math.random().toString(36).substr(2, 9);
      setSessionId(newSessionId);

      await db.runAsync(
        `INSERT INTO focus_sessions (id, task_id, user_id, duration_type, duration_minutes, actual_minutes, started_at, completed)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
        [
          newSessionId,
          taskId,
          user.id,
          selectedDuration.label.toLowerCase().replace(' ', '_'),
          minutes,
          0, // Set actual_minutes to 0 initially, will update later
          Math.floor(Date.now() / 1000),
        ]
      );

      // Update task focus status
      await db.runAsync(
        `UPDATE tasks SET is_focus_active = 1, focus_activated_at = ? WHERE id = ?`,
        [Math.floor(Date.now() / 1000), taskId]
      );

      // Start countdown
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            completeSession();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (error) {
      console.error('Error starting timer:', error);
      Alert.alert('Error', 'Failed to start timer. Please check database schema.');
    }
  };

  const pauseTimer = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      setIsPaused(true);
      setIsActive(false);
      stopSilentAudio();
    }
  };

  const resumeTimer = () => {
    setIsActive(true);
    setIsPaused(false);
    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          completeSession();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const completeSession = async () => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    const endedAt = Math.floor(Date.now() / 1000);
    const actualMinutes = Math.ceil((endedAt - startTimeRef.current) / 1000 / 60);

    try {
      const db = await getDatabase();

      // Update focus session
      if (sessionId) {
        await db.runAsync(
          `UPDATE focus_sessions 
           SET actual_minutes = ?, ended_at = ?, completed = 1
           WHERE id = ?`,
          [actualMinutes, endedAt, sessionId]
        );
      }

      // Update task last activity and progress
      await db.runAsync(
        `UPDATE tasks 
         SET last_activity_at = ?, progress_pct = MIN(progress_pct + 10, 100)
         WHERE id = ?`,
        [endedAt, taskId]
      );

      // Clear focus active flag
      await db.runAsync(
        `UPDATE tasks SET is_focus_active = 0 WHERE id = ?`,
        [taskId]
      );
    } catch (error) {
      console.error('Error completing session:', error);
    }

    // Play completion sound
    await playCompletionSound();

    Alert.alert(
      'Focus Session Complete!',
      `You focused for ${actualMinutes} minutes. Great work!`,
      [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]
    );

    setIsActive(false);
    setIsPaused(false);
    setTimeLeft(0);
  };

  const cancelTimer = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    stopSilentAudio();
    Alert.alert(
      'Cancel Session',
      'Are you sure you want to cancel this focus session?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          style: 'destructive',
          onPress: () => navigation.goBack(),
        },
      ]
    );
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getDurationText = () => {
    if (selectedDuration.minutes > 0) {
      return `${selectedDuration.minutes} minutes`;
    }
    return `${customMinutes} minutes`;
  };

  if (!task) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={cancelTimer} style={styles.closeButton}>
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.taskTitle} numberOfLines={1}>
          {task.project_title}
        </Text>
        <View style={styles.placeholder} />
      </View>

      {/* Timer Display */}
      <View style={styles.timerContainer}>
        <Text style={styles.timer}>{formatTime(timeLeft)}</Text>
        {!isActive && !isPaused && timeLeft === 25 * 60 && (
          <Text style={styles.durationLabel}>Duration: {getDurationText()}</Text>
        )}
      </View>

      {/* Duration Selection (only before start) */}
      {!isActive && !isPaused && timeLeft === 25 * 60 && (
        <View style={styles.durationContainer}>
          <Text style={styles.sectionTitle}>Select Duration</Text>
          <View style={styles.durationOptions}>
            {DURATIONS.map((duration) => (
              <TouchableOpacity
                key={duration.label}
                style={[
                  styles.durationOption,
                  selectedDuration.label === duration.label && styles.durationOptionActive,
                ]}
                onPress={() => setSelectedDuration(duration)}
              >
                <Text
                  style={[
                    styles.durationOptionText,
                    selectedDuration.label === duration.label && styles.durationOptionTextActive,
                  ]}
                >
                  {duration.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {selectedDuration.label === 'Custom' && (
            <View style={styles.customInput}>
              <TextInput
                style={styles.customInputField}
                placeholder="Minutes"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="numeric"
                value={customMinutes}
                onChangeText={setCustomMinutes}
              />
            </View>
          )}
        </View>
      )}

      {/* Control Buttons */}
      <View style={styles.controls}>
        {!isActive && !isPaused && timeLeft === 25 * 60 ? (
          <TouchableOpacity
            style={[styles.controlButton, styles.startButton]}
            onPress={startTimer}
          >
            <Text style={styles.controlButtonText}>Start Focus</Text>
          </TouchableOpacity>
        ) : isActive && !isPaused ? (
          <TouchableOpacity
            style={[styles.controlButton, styles.pauseButton]}
            onPress={pauseTimer}
          >
            <Text style={styles.controlButtonText}>Pause</Text>
          </TouchableOpacity>
        ) : isPaused ? (
          <TouchableOpacity
            style={[styles.controlButton, styles.resumeButton]}
            onPress={resumeTimer}
          >
            <Text style={styles.controlButtonText}>Resume</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Quote or Tip */}
      <View style={styles.tipContainer}>
        <Text style={styles.tipText}>
          🎨 "Stay focused, one brush stroke at a time."
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background || '#F9FAFB',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: SPACING?.md || 16,
    backgroundColor: COLORS.surface || '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border || '#E5E7EB',
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 24,
    color: COLORS.textMuted || '#6B7280',
  },
  taskTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text || '#111827',
    textAlign: 'center',
  },
  placeholder: {
    width: 40,
  },
  timerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  timer: {
    fontSize: 72,
    fontWeight: '700',
    color: COLORS.primary || '#6366F1',
    fontFamily: 'monospace',
  },
  durationLabel: {
    fontSize: 14,
    color: COLORS.textMuted || '#6B7280',
    marginTop: SPACING?.sm || 12,
  },
  durationContainer: {
    padding: SPACING?.lg || 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text || '#111827',
    marginBottom: SPACING?.md || 16,
  },
  durationOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  durationOption: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: RADIUS?.round || 20,
    backgroundColor: COLORS.surfaceHighlight || '#F3F4F6',
    borderWidth: 1,
    borderColor: COLORS.border || '#E5E7EB',
  },
  durationOptionActive: {
    backgroundColor: COLORS.primaryDim || '#EEF2FF',
    borderColor: COLORS.primary || '#6366F1',
  },
  durationOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMuted || '#6B7280',
  },
  durationOptionTextActive: {
    color: COLORS.primary || '#6366F1',
  },
  customInput: {
    marginTop: SPACING?.md || 16,
    alignItems: 'center',
  },
  customInputField: {
    width: 120,
    borderWidth: 1,
    borderColor: COLORS.border || '#E5E7EB',
    borderRadius: RADIUS?.md || 8,
    paddingHorizontal: SPACING?.sm || 12,
    paddingVertical: 8,
    textAlign: 'center',
    fontSize: 16,
    color: COLORS.text || '#111827',
  },
  controls: {
    paddingHorizontal: SPACING?.lg || 24,
    marginTop: SPACING?.xl || 32,
  },
  controlButton: {
    paddingVertical: 16,
    borderRadius: RADIUS?.lg || 12,
    alignItems: 'center',
  },
  startButton: {
    backgroundColor: COLORS.primary || '#6366F1',
  },
  pauseButton: {
    backgroundColor: COLORS.warning || '#F59E0B',
  },
  resumeButton: {
    backgroundColor: COLORS.success || '#10B981',
  },
  controlButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  tipContainer: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: SPACING?.lg || 24,
  },
  tipText: {
    fontSize: 14,
    color: COLORS.textMuted || '#6B7280',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});