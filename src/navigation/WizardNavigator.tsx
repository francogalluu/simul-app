import React, { useMemo } from 'react';
import { Platform } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import type { RootStackParamList, WizardStackParamList } from './types';

import { HeaderBackButton } from '@/components/HeaderBackButton';
import { useTheme } from '@/context/ThemeContext';
import HabitSourceStep from '@/screens/wizard/HabitSourceStep';
import HabitTypeStep from '@/screens/wizard/HabitTypeStep';
import HabitIconStep from '@/screens/wizard/HabitIconStep';
import DescriptionStep from '@/screens/wizard/DescriptionStep';
import FrequencyStep from '@/screens/wizard/FrequencyStep';
import MeasureByStep from '@/screens/wizard/MeasureByStep';
import TargetStep from '@/screens/wizard/TargetStep';
import ReminderStep from '@/screens/wizard/ReminderStep';

const Stack = createNativeStackNavigator<WizardStackParamList>();

type Props = NativeStackScreenProps<RootStackParamList, 'NewHabit' | 'EditHabit'>;

function habitSourceInitialParams(route: Props['route']): WizardStackParamList['HabitSource'] | undefined {
  if (route.name !== 'NewHabit') return undefined;
  const p = route.params;
  if (p && typeof p === 'object' && 'screen' in p && p.screen === 'HabitSource') {
    return (p as { params?: WizardStackParamList['HabitSource'] }).params;
  }
  return undefined;
}

export default function WizardNavigator({ route }: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const habitSourceParams = useMemo(() => habitSourceInitialParams(route), [route]);

  return (
    <Stack.Navigator
      initialRouteName="HabitSource"
      screenOptions={({ navigation, route }) => ({
        headerShown: true,
        headerTintColor: colors.teal,
        headerStyle: { backgroundColor: colors.bgSecondary },
        headerShadowVisible: false,
        headerTitleStyle: { fontWeight: '600', color: colors.text1 },
        contentStyle: { backgroundColor: colors.bgSecondary },
        ...(Platform.OS === 'android' ? { headerTitleAlign: 'center' as const } : {}),
        ...(route.name !== 'HabitSource' && route.name !== 'HabitType'
          ? {
              headerBackVisible: false,
              headerLeft: () =>
                navigation.canGoBack() ? (
                  <HeaderBackButton onPress={() => navigation.goBack()} />
                ) : null,
            }
          : {}),
      })}
    >
      <Stack.Screen
        name="HabitSource"
        component={HabitSourceStep}
        initialParams={habitSourceParams}
        options={{ title: t('wizard.addNewHabit') }}
      />
      <Stack.Screen
        name="HabitType"
        component={HabitTypeStep}
        options={{ title: t('wizard.newHabit') }}
      />
      <Stack.Screen
        name="HabitIcon"
        component={HabitIconStep}
        options={{ title: t('wizard.icon') }}
      />
      <Stack.Screen
        name="Description"
        component={DescriptionStep}
        options={{ title: t('wizard.description') }}
      />
      <Stack.Screen
        name="Frequency"
        component={FrequencyStep}
        options={{
          title: t('wizard.frequency'),
          headerBackVisible: false,
          headerLeft: () => null,
        }}
      />
      <Stack.Screen
        name="MeasureBy"
        component={MeasureByStep}
        options={{ title: t('wizard.measureBy') }}
      />
      <Stack.Screen
        name="Target"
        component={TargetStep}
        options={{ title: t('wizard.target') }}
      />
      <Stack.Screen
        name="Reminder"
        component={ReminderStep}
        options={{ title: t('wizard.reminder') }}
      />
    </Stack.Navigator>
  );
}
