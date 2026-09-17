import React from 'react';
import { View, Pressable, Modal, StyleSheet, Alert } from 'react-native';
import { Text } from '@/components/AppText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { partnerOf, usePeople, type Person } from '@/lib/people';
import { S, fonts } from '@/lib/simulTheme';
import type { Habit } from '@/store/tasksStore';

export function HabitActionSheet({
  habit,
  me,
  onClose,
  onEdit,
  onDelete,
}: {
  habit: Habit | null;
  me: Person;
  onClose: () => void;
  onEdit: (habit: Habit) => void;
  onDelete: (habit: Habit) => void;
}) {
  const insets = useSafeAreaInsets();
  const people = usePeople();
  if (!habit) return null;

  const isPendingInvite = habit.status === 'pending';
  const partnerName = people[partnerOf(me)].name;
  // Your partner's personal habits are view-only (the server enforces this too).
  const canManage = habit.owner === 'both' || habit.owner === me;

  const confirmDelete = () => {
    Alert.alert(
      isPendingInvite ? 'Cancel invite?' : 'Delete habit?',
      isPendingInvite
        ? `${partnerName} won't see "${habit.name}" anymore.`
        : `"${habit.name}" and its history will be removed${habit.owner === 'both' ? ` for both you and ${partnerName}` : ''}.`,
      [
        { text: 'Keep', style: 'cancel' },
        { text: isPendingInvite ? 'Cancel invite' : 'Delete', style: 'destructive', onPress: () => { onDelete(habit); onClose(); } },
      ],
    );
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={styles.handle} />
          <View style={styles.headerRow}>
            <View style={styles.iconWrap}>
              <Text style={styles.icon}>{habit.icon}</Text>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.title} numberOfLines={1}>{habit.name}</Text>
              <Text style={styles.subtitle}>
                {habit.owner === 'both' ? `Together with ${partnerName}` : habit.owner === me ? 'Just you' : `${people[habit.owner].name}'s habit`}
                {' • '}{habit.time}
              </Text>
            </View>
          </View>

          {canManage && !isPendingInvite && (
            <Pressable onPress={() => { onClose(); onEdit(habit); }} style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}>
              <Text style={styles.optionText}>Edit</Text>
            </Pressable>
          )}
          {canManage && <Pressable onPress={confirmDelete} style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}>
            <Text style={[styles.optionText, { color: S.danger }]}>{isPendingInvite ? 'Cancel invite' : 'Delete'}</Text>
          </Pressable>}
          <Pressable onPress={onClose} style={({ pressed }) => [styles.option, styles.cancel, pressed && styles.optionPressed]}>
            <Text style={[styles.optionText, { color: S.ink600 }]}>Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(20, 18, 16, 0.42)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: S.card,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 18,
    paddingTop: 10,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: S.line,
    marginBottom: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 4,
    paddingBottom: 14,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: S.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 22,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 17,
    color: S.ink900,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: S.tertiary,
    marginTop: 2,
  },
  option: {
    paddingVertical: 15,
    alignItems: 'center',
    borderRadius: 14,
    backgroundColor: S.bg,
    marginTop: 8,
  },
  optionPressed: {
    opacity: 0.7,
  },
  optionText: {
    fontSize: 16,
    fontWeight: '700',
    color: S.ink900,
  },
  cancel: {
    backgroundColor: 'transparent',
  },
});
