import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Pressable,
  Text,
  StyleSheet,
  Modal,
  Animated,
  Easing,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Plus, Sprout, CircleSlash, ChevronRight, X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';
import { useHabitStore } from '@/store';
import { useSettingsStore } from '@/store/settingsStore';
import { isToday } from '@/lib/dates';
import type { RootStackParamList } from './types';

const PLUS_SIZE = 60;
const PLUS_RING_BORDER = 4;
const RING_SIZE = PLUS_SIZE + PLUS_RING_BORDER * 2;
const TAB_BAR_HEIGHT = 56;
const PLUS_RAISE = RING_SIZE * 0.45;

export function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const rootNavigation = useNavigation<NavigationProp<RootStackParamList>>();
  const haptic = Boolean(useSettingsStore(s => s.hapticFeedback));
  const selectedDate = useHabitStore(s => s.selectedDate);
  const canAddHabitOnSelectedDay = isToday(selectedDate);
  const tabBarBg = isDark ? colors.bgCard : '#FFFFFF';

  const [addSheetVisible, setAddSheetVisible] = useState(false);
  const addSheetSlide = useRef(new Animated.Value(300)).current;

  useEffect(() => {
    if (addSheetVisible) {
      addSheetSlide.setValue(300);
      Animated.timing(addSheetSlide, {
        toValue: 0,
        duration: 120,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }).start();
    }
  }, [addSheetVisible, addSheetSlide]);

  const openAddSheet = useCallback(() => {
    if (haptic) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setAddSheetVisible(true);
  }, [haptic]);

  const closeAddSheet = useCallback(() => {
    Animated.timing(addSheetSlide, {
      toValue: 300,
      duration: 80,
      useNativeDriver: true,
      easing: Easing.in(Easing.cubic),
    }).start(() => setAddSheetVisible(false));
  }, [addSheetSlide]);

  const handleBuildHabit = useCallback(() => {
    closeAddSheet();
    rootNavigation.navigate('NewHabit', { screen: 'HabitSource', params: { goalType: 'build' } });
  }, [closeAddSheet, rootNavigation]);

  const handleBreakHabit = useCallback(() => {
    closeAddSheet();
    rootNavigation.navigate('NewHabit', { screen: 'HabitSource', params: { goalType: 'break' } });
  }, [closeAddSheet, rootNavigation]);

  const middleIndex = Math.floor(state.routes.length / 2);

  return (
    <>
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
        {/* Plus button -- absolutely positioned, floats above the bar via overflow */}
        <View style={styles.plusAnchor} pointerEvents="box-none">
          <View style={[styles.plusRing, { backgroundColor: tabBarBg }]}>
            <Pressable
              onPress={openAddSheet}
              style={({ pressed }) => [
                styles.plusButton,
                { backgroundColor: colors.teal },
                pressed && styles.plusButtonPressed,
              ]}
              accessibilityLabel={t('home.newHabit')}
            >
              <Plus size={28} color={colors.white} strokeWidth={2.5} />
            </Pressable>
          </View>
        </View>

        {/* Tab items row */}
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
              <React.Fragment key={route.key}>
                {index === middleIndex && <View style={styles.plusSpacer} />}
                <Pressable
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
              </React.Fragment>
            );
          })}
        </View>
      </View>

      <Modal
        visible={addSheetVisible}
        transparent
        animationType="none"
        onRequestClose={closeAddSheet}
      >
        <View style={styles.sheetBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeAddSheet} />
          <Animated.View
            style={[
              styles.sheetCard,
              {
                backgroundColor: colors.bgCard,
                paddingBottom: Math.max(insets.bottom, 16),
                transform: [{ translateY: addSheetSlide }],
              },
            ]}
          >
            <View style={styles.sheetHandleRow}>
              <View style={[styles.sheetHandle, { backgroundColor: colors.separator }]} />
            </View>

            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: colors.text1 }]}>
                {t('home.newHabit')}
              </Text>
              <Pressable
                onPress={closeAddSheet}
                hitSlop={12}
                style={({ pressed }) => [
                  styles.sheetCloseBtn,
                  { backgroundColor: colors.bgSecondary },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <X size={16} color={colors.text2} strokeWidth={2.5} />
              </Pressable>
            </View>

            <View style={styles.sheetOptions}>
              {canAddHabitOnSelectedDay ? (
                <>
                  <Pressable
                    onPress={handleBuildHabit}
                    style={({ pressed }) => [
                      styles.sheetOption,
                      { backgroundColor: pressed ? colors.bgSecondary : colors.bgCard },
                    ]}
                  >
                    <View
                      style={[styles.sheetIconWrap, { backgroundColor: colors.successSoft }]}
                    >
                      <Sprout size={24} color={colors.success} strokeWidth={2} />
                    </View>
                    <View style={styles.sheetOptionTextWrap}>
                      <Text style={[styles.sheetOptionText, { color: colors.text1 }]}>
                        {t('home.buildGoodHabit')}
                      </Text>
                      <Text style={[styles.sheetOptionDesc, { color: colors.text2 }]}>
                        {t('home.buildGoodHabitDesc')}
                      </Text>
                    </View>
                    <ChevronRight size={18} color={colors.chevron} strokeWidth={2} />
                  </Pressable>

                  <View style={[styles.sheetDivider, { backgroundColor: colors.separator }]} />

                  <Pressable
                    onPress={handleBreakHabit}
                    style={({ pressed }) => [
                      styles.sheetOption,
                      { backgroundColor: pressed ? colors.bgSecondary : colors.bgCard },
                    ]}
                  >
                    <View
                      style={[styles.sheetIconWrap, { backgroundColor: colors.dangerSoft }]}
                    >
                      <CircleSlash size={24} color={colors.danger} strokeWidth={2} />
                    </View>
                    <View style={styles.sheetOptionTextWrap}>
                      <Text style={[styles.sheetOptionText, { color: colors.text1 }]}>
                        {t('home.breakBadHabit')}
                      </Text>
                      <Text style={[styles.sheetOptionDesc, { color: colors.text2 }]}>
                        {t('home.breakBadHabitDesc')}
                      </Text>
                    </View>
                    <ChevronRight size={18} color={colors.chevron} strokeWidth={2} />
                  </Pressable>
                </>
              ) : (
                <>
                  <View style={[styles.sheetOption, styles.sheetOptionStatic]}>
                    <View
                      style={[styles.sheetIconWrap, { backgroundColor: colors.successSoft }]}
                    >
                      <Sprout size={24} color={colors.success} strokeWidth={2} />
                    </View>
                    <View style={styles.sheetOptionTextWrap}>
                      <Text style={[styles.sheetOptionText, { color: colors.text1 }]}>
                        {t('home.addHabitWrongDayBuildTitle')}
                      </Text>
                      <Text style={[styles.sheetOptionDesc, { color: colors.text2 }]}>
                        {t('home.addHabitWrongDayBuildDesc')}
                      </Text>
                    </View>
                    <View style={styles.sheetChevronSpacer} />
                  </View>

                  <View style={[styles.sheetDivider, { backgroundColor: colors.separator }]} />

                  <View style={[styles.sheetOption, styles.sheetOptionStatic]}>
                    <View
                      style={[styles.sheetIconWrap, { backgroundColor: colors.dangerSoft }]}
                    >
                      <CircleSlash size={24} color={colors.danger} strokeWidth={2} />
                    </View>
                    <View style={styles.sheetOptionTextWrap}>
                      <Text style={[styles.sheetOptionText, { color: colors.text1 }]}>
                        {t('home.addHabitWrongDayBreakTitle')}
                      </Text>
                      <Text style={[styles.sheetOptionDesc, { color: colors.text2 }]}>
                        {t('home.addHabitWrongDayBreakDesc')}
                      </Text>
                    </View>
                    <View style={styles.sheetChevronSpacer} />
                  </View>
                </>
              )}
            </View>
          </Animated.View>
        </View>
      </Modal>
    </>
  );
}

const shadowButton = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
  },
  android: {
    elevation: 8,
  },
}) as object;

const shadowCard = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.08,
  shadowRadius: 8,
  elevation: 3,
};

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    overflow: 'visible',
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
  plusSpacer: {
    width: RING_SIZE,
  },
  plusAnchor: {
    position: 'absolute',
    top: -PLUS_RAISE,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  plusRing: {
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadowButton,
  },
  plusButton: {
    width: PLUS_SIZE,
    height: PLUS_SIZE,
    borderRadius: PLUS_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.95 }],
  },

  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  sheetCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
      },
      android: { elevation: 12 },
    }),
  },
  sheetHandleRow: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 4,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    paddingBottom: 16,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 26,
  },
  sheetCloseBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetOptions: {
    paddingBottom: 8,
  },
  sheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
    gap: 14,
    minHeight: 64,
    borderRadius: 12,
  },
  sheetOptionStatic: {
    backgroundColor: 'transparent',
  },
  sheetChevronSpacer: {
    width: 18,
    height: 18,
  },
  sheetIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetOptionTextWrap: {
    flex: 1,
    gap: 2,
  },
  sheetOptionText: {
    fontSize: 17,
    fontWeight: '600',
    lineHeight: 22,
  },
  sheetOptionDesc: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 19,
  },
  sheetDivider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 66,
    marginVertical: 2,
  },
});
