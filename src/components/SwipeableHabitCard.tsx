import React, { useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, Platform } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Trash2 } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/context/ThemeContext';
import { HabitCard } from './HabitCard';
import type { Habit } from '@/types/habit';

interface SwipeableHabitCardProps {
  habit: Habit;
  currentValue: number;
  isCompleted: boolean;
  /** Controls whether right swipe action should display/act as undo */
  showUndoAction?: boolean;
  readOnly: boolean;
  onPress: () => void;
  /** Called when the swipe action is confirmed — caller decides logEntry vs deleteEntry */
  onComplete: () => void;
  /** Called when user confirms delete after swiping right and tapping Delete */
  onDelete?: () => void;
  /** Called when user chooses "Pause" instead of delete — caller should archive the habit */
  onPause?: () => void;
  /** Compact layout (smaller card for home compact view) */
  compact?: boolean;
}

function RightActions({ showUndoAction, colors, t }: { showUndoAction: boolean; colors: { teal: string; danger: string; white: string }; t: (key: string) => string }) {
  return (
    <View style={[s.rightAction, { backgroundColor: colors.teal }, showUndoAction && [s.rightActionUndo, { backgroundColor: colors.danger }]]}>
      <Text style={[s.actionText, { color: colors.white }]}>{showUndoAction ? t('common.undo') : t('common.done')}</Text>
    </View>
  );
}

function LeftActions({ onDelete, colors, t }: { onDelete: () => void; colors: { danger: string; white: string }; t: (key: string) => string }) {
  return (
    <View style={[s.leftAction, { backgroundColor: colors.danger }]}>
      <Pressable
        onPress={onDelete}
        style={({ pressed }) => [s.deleteBtn, pressed && { opacity: 0.8 }]}
        accessibilityRole="button"
        accessibilityLabel={t('alerts.deleteHabitTitle')}
      >
        <Trash2 size={22} color={colors.white} strokeWidth={2} />
        <Text style={[s.actionText, { color: colors.white }]}>{t('common.delete')}</Text>
      </Pressable>
    </View>
  );
}

export function SwipeableHabitCard({
  habit,
  currentValue,
  isCompleted,
  showUndoAction = isCompleted,
  readOnly,
  onPress,
  onComplete,
  onDelete,
  onPause,
  compact = false,
}: SwipeableHabitCardProps) {
  const { colors } = useTheme();
  const swipeRef = useRef<Swipeable>(null);
  const pendingActionRef = useRef<'complete' | 'undo' | null>(null);

  const handleRightOpen = () => {
    pendingActionRef.current = showUndoAction ? 'undo' : 'complete';
    swipeRef.current?.close();
  };

  const handleSwipeClose = () => {
    if (!pendingActionRef.current) return;
    pendingActionRef.current = null;
    onComplete();
  };

  const { t } = useTranslation();
  const showDeleteAlert = () => {
    swipeRef.current?.close();
    const buttons: Array<{ text: string; style?: 'cancel' | 'destructive' | 'default'; onPress?: () => void }> = [
      { text: t('common.cancel'), style: 'cancel' },
    ];
    if (onPause) {
      buttons.push({ text: t('common.pause'), onPress: () => onPause() });
    }
    // "Delete" is a soft-delete: hide from Home from today onward, keep history.
    buttons.push({ text: t('common.delete'), style: 'destructive', onPress: () => onDelete?.() });
    Alert.alert(
      t('alerts.deleteHabitTitle'),
      t('alerts.deleteHabitMessage', { name: habit.name }) + (onPause ? t('alerts.deleteHabitMessageWithPause') : ''),
      buttons
    );
  };

  const handleLeftOpen = () => {
    showDeleteAlert();
  };

  return (
    <Swipeable
      ref={swipeRef}
      renderRightActions={() => <RightActions showUndoAction={showUndoAction} colors={colors} t={t} />}
      renderLeftActions={onDelete ? () => <LeftActions onDelete={showDeleteAlert} colors={colors} t={t} /> : undefined}
      onSwipeableLeftOpen={onDelete ? handleLeftOpen : undefined}
      onSwipeableRightOpen={handleRightOpen}
      onSwipeableClose={handleSwipeClose}
      rightThreshold={42}
      leftThreshold={40}
      overshootRight={false}
      overshootLeft={false}
      enabled={!readOnly}
      containerStyle={
        Platform.OS === 'android'
          ? [s.swipeContainer, { overflow: 'hidden' as const }]
          : s.swipeContainer
      }
      childrenContainerStyle={[
        Platform.OS === 'android' ? { overflow: 'hidden' as const } : null,
        s.swipeChildren,
        compact && s.swipeChildrenCompact,
      ]}
    >
      <HabitCard
        habit={habit}
        currentValue={currentValue}
        isCompleted={isCompleted}
        readOnly={readOnly}
        onPress={onPress}
        compact={compact}
      />
    </Swipeable>
  );
}

const s = StyleSheet.create({
  swipeContainer: {
    overflow: 'visible',
  },
  swipeChildren: {
    overflow: 'visible',
  },
  swipeChildrenCompact: {
    marginBottom: 4,
  },
  rightAction: {
    width: 90,
    marginBottom: 12,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  rightActionUndo: {},
  actionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  leftAction: {
    width: 90,
    marginBottom: 12,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  deleteBtn: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
});
