import React from 'react';
import { View, Pressable, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { Plus } from 'lucide-react-native';
import { S } from '@/lib/simulTheme';
import { haptic } from '@/lib/haptics';
import type { RootStackParamList } from './types';

const TAB_BAR_HEIGHT = 56;

export function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const rootNavigation = useNavigation<NavigationProp<RootStackParamList>>();
  const addIndex = state.routes.length - 1; // slot the Add button in before the last tab (Settings)

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <View style={styles.tabRow}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;
          const color = isFocused ? S.accentDeep : S.muted;

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
          };

          return (
            <React.Fragment key={route.key}>
              {index === addIndex && (
                <Pressable
                  onPress={() => {
                    haptic.tap();
                    rootNavigation.navigate('AddHabit');
                  }}
                  style={styles.tabItem}
                  accessibilityRole="button"
                  accessibilityLabel="Add habit"
                >
                  <View style={styles.addCircle}>
                    <Plus color="#FFFFFF" size={22} strokeWidth={2.6} />
                  </View>
                  <Text style={[styles.tabLabel, { color: S.muted }]}>Add</Text>
                </Pressable>
              )}
              <Pressable
                onPress={onPress}
                style={styles.tabItem}
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
              >
                {options.tabBarIcon?.({ focused: isFocused, color, size: 24 })}
                <Text style={[styles.tabLabel, { color }]}>
                  {typeof options.tabBarLabel === 'string' ? options.tabBarLabel : route.name}
                </Text>
              </Pressable>
            </React.Fragment>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: S.card,
    borderTopWidth: 1,
    borderTopColor: S.lineSoft,
  },
  tabRow: {
    flexDirection: 'row',
    height: TAB_BAR_HEIGHT,
    alignItems: 'center',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: TAB_BAR_HEIGHT,
    gap: 2,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  addCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: S.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
