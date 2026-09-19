import React from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { Text } from '@/components/AppText';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import type { RootStackParamList } from './types';

import TabNavigator from './TabNavigator';
import AddHabitScreen from '@/screens/AddHabitScreen';
import AddGoalScreen from '@/screens/AddGoalScreen';
import MailboxScreen from '@/screens/MailboxScreen';
import AchievementsScreen from '@/screens/AchievementsScreen';
import AuthScreen from '@/screens/AuthScreen';
import OnboardingScreen from '@/screens/OnboardingScreen';
import NotificationsPromptScreen from '@/screens/NotificationsPromptScreen';
import { PrimaryButton } from '@/components/FormControls';
import { useAuthStore } from '@/store/authStore';
import { useHouseholdStore } from '@/store/householdStore';
import { useTasksStore } from '@/store/tasksStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useSessionSync } from '@/lib/useSessionSync';
import { S, fonts } from '@/lib/simulTheme';

const Stack = createNativeStackNavigator<RootStackParamList>();

// Native iOS header for pushed screens: glass back button and a large title that collapses on scroll.
const nativeLargeTitle = (title: string) => ({
  headerShown: true,
  title,
  headerBackButtonDisplayMode: 'minimal' as const,
  headerTintColor: S.ink900,
  headerShadowVisible: false,
  headerStyle: { backgroundColor: S.bg },
  headerLargeStyle: { backgroundColor: S.bg },
  headerLargeTitleEnabled: true,
  headerLargeTitleShadowVisible: false,
  headerLargeTitleStyle: { fontFamily: fonts.bold, color: S.ink900 },
  headerTitleStyle: { fontFamily: fonts.bold, color: S.ink900 },
});

function Splash() {
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={S.accent} />
    </View>
  );
}

function LoadError() {
  const { t } = useTranslation();
  const [retrying, setRetrying] = React.useState(false);
  const signOut = useAuthStore((s) => s.signOut);
  const retry = async () => {
    setRetrying(true);
    await useHouseholdStore.getState().refreshMembers();
    setRetrying(false);
  };
  return (
    <View style={[styles.center, { paddingHorizontal: 32, gap: 12 }]}>
      <Text style={styles.errorTitle}>{t('errors.loadTitle')}</Text>
      <Text style={styles.errorBody}>{t('errors.network')}</Text>
      <View style={{ alignSelf: 'stretch', marginTop: 8 }}>
        <PrimaryButton label={t('errors.retry')} onPress={retry} loading={retrying} />
        <PrimaryButton variant="link" label={t('settings.signOut')} onPress={signOut} />
      </View>
    </View>
  );
}

export default function RootNavigator() {
  useSessionSync();
  const authStatus = useAuthStore((s) => s.status);
  const householdStatus = useHouseholdStore((s) => s.status);
  const tasksStatus = useTasksStore((s) => s.status);
  const notificationsPrompted = useSettingsStore((s) => s.notificationsPrompted);

  if (authStatus === 'loading') return <Splash />;
  if (authStatus === 'signedIn') {
    if (householdStatus === 'idle' || householdStatus === 'loading') return <Splash />;
    if (householdStatus === 'error') return <LoadError />;
    // Avoid flashing the "no habits yet" empty state before the first load finishes.
    if (householdStatus === 'ready' && (tasksStatus === 'idle' || tasksStatus === 'loading')) return <Splash />;
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: S.bg },
      }}
    >
      {authStatus === 'signedOut' ? (
        <Stack.Screen name="Auth" component={AuthScreen} options={{ animationTypeForReplace: 'pop' }} />
      ) : householdStatus === 'none' ? (
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      ) : !notificationsPrompted ? (
        <Stack.Screen name="NotificationsPrompt" component={NotificationsPromptScreen} />
      ) : (
        <>
          <Stack.Screen name="Tabs" component={TabNavigator} />
          <Stack.Screen
            name="AddHabit"
            component={AddHabitScreen}
            options={({ navigation, route }) => ({
              // Native iOS sheet with a native header. One flat background colour throughout
              // (no translucent header band). Editing is a short sheet, creating a taller one.
              presentation: 'formSheet',
              sheetAllowedDetents: route.params?.habitId ? [0.46, 1] : [0.775, 1],
              sheetInitialDetentIndex: 0,
              sheetGrabberVisible: true,
              sheetExpandsWhenScrolledToEdge: true,
              contentStyle: { backgroundColor: S.bg },
              headerShown: true,
              headerTransparent: false,
              headerStyle: { backgroundColor: S.bg },
              headerShadowVisible: false,
              title: route.params?.habitId ? 'Edit Habit' : 'New Habit',
              headerTitleStyle: { fontFamily: fonts.bold, color: S.ink900 },
              unstable_headerLeftItems: () => [
                {
                  type: 'button',
                  label: 'Close',
                  icon: { type: 'sfSymbol', name: 'xmark' },
                  onPress: () => navigation.goBack(),
                },
              ],
            })}
          />
          <Stack.Screen name="AddGoal" component={AddGoalScreen} options={{ presentation: 'modal' }} />
          <Stack.Screen name="Mailbox" component={MailboxScreen} options={nativeLargeTitle('Mailbox')} />
          <Stack.Screen name="Achievements" component={AchievementsScreen} options={nativeLargeTitle('Achievements')} />
        </>
      )}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: S.bg,
  },
  errorTitle: {
    fontFamily: fonts.bold,
    fontSize: 20,
    color: S.ink900,
    textAlign: 'center',
  },
  errorBody: {
    fontSize: 14,
    lineHeight: 20,
    color: S.tertiary,
    textAlign: 'center',
  },
});
