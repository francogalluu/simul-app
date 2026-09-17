import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from './types';

import TabNavigator from './TabNavigator';
import AddHabitScreen from '@/screens/AddHabitScreen';
import AddGoalScreen from '@/screens/AddGoalScreen';
import MailboxScreen from '@/screens/MailboxScreen';
import AchievementsScreen from '@/screens/AchievementsScreen';
import { S } from '@/lib/simulTheme';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: S.bg },
      }}
    >
      <Stack.Screen name="Tabs" component={TabNavigator} />
      <Stack.Screen name="AddHabit" component={AddHabitScreen} options={{ presentation: 'modal' }} />
      <Stack.Screen name="AddGoal" component={AddGoalScreen} options={{ presentation: 'modal' }} />
      <Stack.Screen name="Mailbox" component={MailboxScreen} />
      <Stack.Screen name="Achievements" component={AchievementsScreen} />
    </Stack.Navigator>
  );
}
