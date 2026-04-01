import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import { RegisterScreen } from '../screens/RegisterScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { DashboardScreen } from '../screens/DashboardScreen';
import { TasksScreen } from '../screens/TasksScreen';
import { VaultScreen } from '../screens/VaultScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { CreateTaskScreen } from '../screens/CreateTaskScreen';
import { FocusTimerScreen } from '../screens/FocusTimerScreen';
import { TaskDetailsScreen } from '../screens/TaskDetailsScreen';
import { InvoiceBuilderScreen } from '../screens/InvoiceBuilderScreen';
import { NotificationCenterScreen } from '../screens/NotificationCenterScreen';
import { useERIStore } from '../store/useERIStore';
import { COLORS } from '../constants/theme';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const MainTabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarStyle: {
        backgroundColor: COLORS.surface,
        borderTopColor: COLORS.border,
        paddingBottom: 8,
        paddingTop: 8,
        height: 65,
      },
      tabBarActiveTintColor: COLORS.primary,
      tabBarInactiveTintColor: COLORS.textMuted,
      tabBarIcon: ({ focused, color, size }) => {
        let iconName: keyof typeof Ionicons.glyphMap = 'home';
        if (route.name === 'Home') iconName = focused ? 'home' : 'home-outline';
        else if (route.name === 'Tasks') iconName = focused ? 'list' : 'list-outline';
        else if (route.name === 'Vault') iconName = focused ? 'folder' : 'folder-outline';
        else if (route.name === 'Profile') iconName = focused ? 'person' : 'person-outline';
        return <Ionicons name={iconName} size={size} color={color} />;
      },
    })}
  >
    <Tab.Screen name="Home" component={DashboardScreen} options={{ title: 'Home' }} />
    <Tab.Screen name="Tasks" component={TasksScreen} options={{ title: 'Tasks' }} />
    <Tab.Screen name="Vault" component={VaultScreen} options={{ title: 'Vault' }} />
    <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
  </Tab.Navigator>
);

export const AppNavigator = () => {
  const user = useERIStore((state) => state.user);

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <>
            <Stack.Screen name="MainTabs" component={MainTabs} />
            <Stack.Screen name="CreateTask" component={CreateTaskScreen} options={{ presentation: 'modal' }} />
            <Stack.Screen name="FocusTimer" component={FocusTimerScreen} options={{ presentation: 'fullScreenModal' }} />
            <Stack.Screen name="TaskDetails" component={TaskDetailsScreen} options={{ presentation: 'modal' }} />
            <Stack.Screen name="InvoiceBuilder" component={InvoiceBuilderScreen} options={{ presentation: 'modal' }} />
            <Stack.Screen name="NotificationCenter" component={NotificationCenterScreen} options={{ presentation: 'modal' }} />
          </>
        ) : (
          <>
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Onboarding" component={OnboardingScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};