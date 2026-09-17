import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { BarChart3, Home, Settings } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import type { TabParamList } from './types';
import { CustomTabBar } from './CustomTabBar';
import { haptic } from '@/lib/haptics';

import HomeScreen from '@/screens/HomeScreen';
import StatsScreen from '@/screens/StatsScreen';
import SettingsScreen from '@/screens/SettingsScreen';

const Tab = createBottomTabNavigator<TabParamList>();

export default function TabNavigator() {
  const { t } = useTranslation();
  const listeners = () => ({ tabPress: () => haptic.tap() });

  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      // The tab bar floats over content (frosted), so screens draw underneath it.
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: 'transparent' } }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: t('tabs.home'),
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} strokeWidth={2} />,
        }}
        listeners={listeners}
      />
      <Tab.Screen
        name="Stats"
        component={StatsScreen}
        options={{
          tabBarLabel: t('tabs.stats'),
          tabBarIcon: ({ color, size }) => <BarChart3 color={color} size={size} strokeWidth={2} />,
        }}
        listeners={listeners}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: t('tabs.settings'),
          tabBarIcon: ({ color, size }) => <Settings color={color} size={size} strokeWidth={2} />,
        }}
        listeners={listeners}
      />
    </Tab.Navigator>
  );
}
