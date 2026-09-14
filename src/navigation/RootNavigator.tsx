import React, { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import type { RootStackParamList } from './types';

import { HeaderBackButton } from '@/components/HeaderBackButton';
import { useTheme } from '@/context/ThemeContext';
import { useSettingsStore } from '@/store/settingsStore';
import TabNavigator from './TabNavigator';
import WizardNavigator from './WizardNavigator';
import HabitDetailScreen from '@/screens/HabitDetailScreen';
import DeletedHabitsScreen from '@/screens/DeletedHabitsScreen';
import ActiveHabitsAnalyticsScreen from '@/screens/ActiveHabitsAnalyticsScreen';
import ByHabitAnalyticsScreen from '@/screens/ByHabitAnalyticsScreen';
import NotificationSettingsScreen from '@/screens/NotificationSettingsScreen';
import HabitRemindersScreen from '@/screens/HabitRemindersScreen';
import HabitReminderEditScreen from '@/screens/HabitReminderEditScreen';
import PrivacyPolicyScreen from '@/screens/PrivacyPolicyScreen';
import TermsOfServiceScreen from '@/screens/TermsOfServiceScreen';
import HabitsScoringScreen from '@/screens/HabitsScoringScreen';
import OnboardingWelcome from '@/screens/onboarding/OnboardingWelcome';
import OnboardingSwipeTutorial from '@/screens/onboarding/OnboardingSwipeTutorial';
import Onboarding5 from '@/screens/onboarding/Onboarding5';
import { navigationRef } from './navigationRef';

function OnboardingWelcomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList, 'OnboardingWelcome'>>();
  return <OnboardingWelcome onContinue={() => navigation.navigate('OnboardingSwipeTutorial')} />;
}

const Stack = createNativeStackNavigator<RootStackParamList>();

const androidCenterHeaderTitle =
  Platform.OS === 'android' ? { headerTitleAlign: 'center' as const } : {};

export default function RootNavigator() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  /** Native push (default) reads cleaner than cross-fade for full-screen steps; match surface so edges don’t flash during slide. */
  const onboardingScreenOptions = {
    headerShown: false,
    contentStyle: { backgroundColor: colors.bgCard },
  };
  const hasCompletedOnboarding = useSettingsStore(s => s.hasCompletedOnboarding);
  const prevOnboardingComplete = useRef<boolean | null>(null);

  // When onboarding flips to complete mid-session, reset root stack to Tabs.
  useEffect(() => {
    const prev = prevOnboardingComplete.current;
    prevOnboardingComplete.current = hasCompletedOnboarding;

    if (!hasCompletedOnboarding || prev !== false) return;

    const resetToTabs = () => {
      if (!navigationRef.isReady()) return;
      navigationRef.reset({ index: 0, routes: [{ name: 'Tabs' }] });
    };

    resetToTabs();
    const timeoutId = setTimeout(resetToTabs, 0);
    return () => clearTimeout(timeoutId);
  }, [hasCompletedOnboarding]);

  return (
    <Stack.Navigator
      initialRouteName={hasCompletedOnboarding ? 'Tabs' : 'OnboardingWelcome'}
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bgSecondary },
      }}
    >
      {/* Main tabs — always the base of the stack */}
      <Stack.Screen name="Tabs" component={TabNavigator} />

      {/* Habit detail — pushed over a tab */}
      <Stack.Screen
        name="HabitDetail"
        component={HabitDetailScreen}
        options={({ navigation }) => ({
          headerShown: true,
          headerTintColor: colors.teal,
          headerStyle: { backgroundColor: colors.bgSecondary },
          headerShadowVisible: false,
          headerTitle: '',
          headerBackVisible: false,
          ...androidCenterHeaderTitle,
          headerLeft: () =>
            navigation.canGoBack() ? (
              <HeaderBackButton onPress={() => navigation.goBack()} />
            ) : null,
        })}
      />

      {/* New habit wizard — presented as a modal card */}
      <Stack.Screen
        name="NewHabit"
        component={WizardNavigator}
        options={{ presentation: 'modal' }}
      />

      {/* Edit habit wizard — same wizard, presented as a modal card */}
      <Stack.Screen
        name="EditHabit"
        component={WizardNavigator}
        options={{ presentation: 'modal' }}
      />

      {/* Global notification / reminder settings */}
      <Stack.Screen
        name="Notifications"
        component={NotificationSettingsScreen}
        options={({ navigation }) => ({
          headerShown: true,
          headerTintColor: colors.teal,
          headerStyle: { backgroundColor: colors.bgSecondary },
          headerShadowVisible: false,
          headerTitle: t('nav.notifications'),
          headerBackVisible: false,
          ...androidCenterHeaderTitle,
          headerLeft: () =>
            navigation.canGoBack() ? (
              <HeaderBackButton onPress={() => navigation.goBack()} />
            ) : null,
        })}
      />

      {/* Per-habit reminder times */}
      <Stack.Screen
        name="HabitReminders"
        component={HabitRemindersScreen}
        options={({ navigation }) => ({
          headerShown: true,
          headerTintColor: colors.teal,
          headerStyle: { backgroundColor: colors.bgSecondary },
          headerShadowVisible: false,
          headerTitle: t('nav.habitReminders'),
          headerBackVisible: false,
          ...androidCenterHeaderTitle,
          headerLeft: () =>
            navigation.canGoBack() ? (
              <HeaderBackButton onPress={() => navigation.goBack()} />
            ) : null,
        })}
      />
      <Stack.Screen
        name="HabitReminderEdit"
        component={HabitReminderEditScreen}
        options={({ navigation }) => ({
          headerShown: true,
          headerTintColor: colors.teal,
          headerStyle: { backgroundColor: colors.bgSecondary },
          headerShadowVisible: false,
          headerTitle: t('wizard.reminderTime'),
          headerBackVisible: false,
          ...androidCenterHeaderTitle,
          headerLeft: () =>
            navigation.canGoBack() ? (
              <HeaderBackButton onPress={() => navigation.goBack()} />
            ) : null,
        })}
      />

      {/* Deleted habits list */}
      <Stack.Screen
        name="DeletedHabits"
        component={DeletedHabitsScreen}
        options={({ navigation }) => ({
          headerShown: true,
          headerTintColor: colors.teal,
          headerStyle: { backgroundColor: colors.bgSecondary },
          headerShadowVisible: false,
          headerTitle: t('nav.deletedHabits'),
          headerBackVisible: false,
          ...androidCenterHeaderTitle,
          headerLeft: () =>
            navigation.canGoBack() ? (
              <HeaderBackButton onPress={() => navigation.goBack()} />
            ) : null,
        })}
      />
      <Stack.Screen
        name="ActiveHabitsAnalytics"
        component={ActiveHabitsAnalyticsScreen}
        options={({ navigation }) => ({
          headerShown: true,
          headerTintColor: colors.teal,
          headerStyle: { backgroundColor: colors.bgSecondary },
          headerShadowVisible: false,
          headerTitle: t('nav.activeHabitsAnalytics'),
          headerBackVisible: false,
          ...androidCenterHeaderTitle,
          headerLeft: () =>
            navigation.canGoBack() ? (
              <HeaderBackButton onPress={() => navigation.goBack()} />
            ) : null,
        })}
      />
      <Stack.Screen
        name="ByHabitAnalytics"
        component={ByHabitAnalyticsScreen}
        options={({ navigation }) => ({
          headerShown: true,
          headerTintColor: colors.teal,
          headerStyle: { backgroundColor: colors.bgSecondary },
          headerShadowVisible: false,
          headerTitle: t('nav.byHabitAnalytics'),
          headerBackVisible: false,
          ...androidCenterHeaderTitle,
          headerLeft: () =>
            navigation.canGoBack() ? (
              <HeaderBackButton onPress={() => navigation.goBack()} />
            ) : null,
        })}
      />

      {/* Legal */}
      <Stack.Screen
        name="PrivacyPolicy"
        component={PrivacyPolicyScreen}
        options={({ navigation }) => ({
          headerShown: true,
          headerTintColor: colors.teal,
          headerStyle: { backgroundColor: colors.bgSecondary },
          headerShadowVisible: false,
          headerTitle: t('nav.privacyPolicy'),
          headerBackVisible: false,
          ...androidCenterHeaderTitle,
          headerLeft: () =>
            navigation.canGoBack() ? (
              <HeaderBackButton onPress={() => navigation.goBack()} />
            ) : null,
        })}
      />
      <Stack.Screen
        name="TermsOfService"
        component={TermsOfServiceScreen}
        options={({ navigation }) => ({
          headerShown: true,
          headerTintColor: colors.teal,
          headerStyle: { backgroundColor: colors.bgSecondary },
          headerShadowVisible: false,
          headerTitle: t('nav.termsOfService'),
          headerBackVisible: false,
          ...androidCenterHeaderTitle,
          headerLeft: () =>
            navigation.canGoBack() ? (
              <HeaderBackButton onPress={() => navigation.goBack()} />
            ) : null,
        })}
      />
      <Stack.Screen
        name="HabitsScoring"
        component={HabitsScoringScreen}
        options={({ navigation }) => ({
          headerShown: true,
          headerTintColor: colors.teal,
          headerStyle: { backgroundColor: colors.bgSecondary },
          headerShadowVisible: false,
          headerTitle: t('habitsScoring.title'),
          headerBackVisible: false,
          ...androidCenterHeaderTitle,
          headerLeft: () =>
            navigation.canGoBack() ? (
              <HeaderBackButton onPress={() => navigation.goBack()} />
            ) : null,
        })}
      />

      <Stack.Screen name="OnboardingWelcome" component={OnboardingWelcomeScreen} options={onboardingScreenOptions} />
      <Stack.Screen name="OnboardingSwipeTutorial" component={OnboardingSwipeTutorial} options={{ ...onboardingScreenOptions, animation: 'none' as const }} />
      <Stack.Screen name="Onboarding5" component={Onboarding5} options={{ ...onboardingScreenOptions, animation: 'none' as const }} />
    </Stack.Navigator>
  );
}
