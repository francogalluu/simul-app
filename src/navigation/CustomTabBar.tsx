import React from 'react';
import { View, Pressable, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useTheme } from '@/context/ThemeContext';

const TAB_BAR_HEIGHT = 56;

export function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const tabBarBg = isDark ? colors.bgCard : '#FFFFFF';

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: tabBarBg,
          borderTopColor: colors.separator,
          paddingBottom: insets.bottom,
        },
      ]}
    >
      <View style={styles.tabRow}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              style={styles.tabItem}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
            >
              {options.tabBarIcon?.({
                focused: isFocused,
                color: isFocused ? colors.teal : colors.text4,
                size: 24,
              })}
              <Text
                style={[
                  styles.tabLabel,
                  { color: isFocused ? colors.teal : colors.text4 },
                ]}
              >
                {typeof options.tabBarLabel === 'string'
                  ? options.tabBarLabel
                  : route.name}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
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
    fontWeight: '500',
  },
});
