import React from 'react';
import { createNativeBottomTabNavigator } from '@react-navigation/bottom-tabs/unstable';
import type { NavigationProp } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import type { RootStackParamList, TabParamList } from './types';
import { S } from '@/lib/simulTheme';
import { haptic } from '@/lib/haptics';

import HomeScreen from '@/screens/HomeScreen';
import SettingsScreen from '@/screens/SettingsScreen';

const Tab = createNativeBottomTabNavigator<TabParamList>();

// Native tabs can't hold a plain action button, so "Add" is a tab that can never be
// selected (tabBarSelectionEnabled: false): pressing it just opens the AddHabit modal.
const AddPlaceholder = () => null;

export default function TabNavigator() {
  const { t } = useTranslation();
  const rootNavigation = useNavigation<NavigationProp<RootStackParamList>>();
  const tap = () => haptic.tap();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: S.accentDeep,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: t('tabs.home'),
          tabBarIcon: ({ focused }) => ({ type: 'sfSymbol', name: focused ? 'house.fill' : 'house' }),
        }}
        listeners={{ tabPress: tap }}
      />
      <Tab.Screen
        name="Add"
        component={AddPlaceholder}
        options={{
          tabBarLabel: t('tabs.add', { defaultValue: 'Add' }),
          tabBarIcon: { type: 'sfSymbol', name: 'plus.circle.fill' },
          tabBarSelectionEnabled: false,
        }}
        listeners={{
          tabPress: () => {
            tap();
            rootNavigation.navigate('AddHabit');
          },
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: t('tabs.settings'),
          tabBarIcon: ({ focused }) => ({ type: 'sfSymbol', name: focused ? 'gearshape.fill' : 'gearshape' }),
        }}
        listeners={{ tabPress: tap }}
      />
    </Tab.Navigator>
  );
}
