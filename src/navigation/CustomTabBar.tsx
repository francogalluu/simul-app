import React from 'react';
import { View, Pressable, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { Text } from '@/components/AppText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { Plus } from 'lucide-react-native';
import { S } from '@/lib/simulTheme';
import { haptic } from '@/lib/haptics';
import type { RootStackParamList } from './types';

const TAB_BAR_HEIGHT = 58;

/**
 * Frosted tab bar: screens scroll underneath and show through the blur, with
 * a warm tint on top so it stays in Simul's palette rather than turning grey.
 * Screens that want content to run under it use `useTabBarInset()`.
 */
export function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const rootNavigation = useNavigation<NavigationProp<RootStackParamList>>();
  const addIndex = Math.floor(state.routes.length / 2); // the Add button sits in the middle

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <BlurView
        intensity={Platform.OS === 'ios' ? 50 : 80}
        tint="light"
        experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : undefined}
        style={StyleSheet.absoluteFill}
      />
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.tint]} />
      <View pointerEvents="none" style={styles.edge} />
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
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 252, 246, 0.4)',
  },
  tint: {
    backgroundColor: S.glassTint,
  },
  edge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: S.glassLine,
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
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: S.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: S.accentDeep,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
});

/** Bottom padding a tab screen needs so its last content clears the floating tab bar. */
export function useTabBarInset(): number {
  const insets = useSafeAreaInsets();
  return TAB_BAR_HEIGHT + insets.bottom + 16;
}
