import React, { useState } from 'react';
import { Alert, View } from 'react-native';
import { Host, ContextMenu, Button, RNHostView } from '@expo/ui/swift-ui';
import { partnerOf, usePeople, type Person } from '@/lib/people';
import type { Habit } from '@/store/tasksStore';

// Native iOS context menu (long press) around a habit row. Replaces the old
// custom bottom sheet; the rules are the same: only the owner can change a
// habit (the server enforces this too) and deleting asks for confirmation.
export function HabitContextMenu({
  habit,
  me,
  onEdit,
  onDelete,
  children,
}: {
  habit: Habit;
  me: Person;
  onEdit: (habit: Habit) => void;
  onDelete: (habit: Habit) => void;
  children: React.ReactElement;
}) {
  const people = usePeople();
  const [width, setWidth] = useState(0);

  const isPendingInvite = habit.status === 'pending';
  const canManage = habit.owner === 'both' || habit.owner === me;
  if (!canManage) return children;

  const partnerName = people[partnerOf(me)].name;
  const confirmDelete = () => {
    Alert.alert(
      isPendingInvite ? 'Cancel invite?' : 'Delete habit?',
      isPendingInvite
        ? `${partnerName} won't see "${habit.name}" anymore.`
        : `"${habit.name}" and its history will be removed${habit.owner === 'both' ? ` for both you and ${partnerName}` : ''}.`,
      [
        { text: 'Keep', style: 'cancel' },
        { text: isPendingInvite ? 'Cancel invite' : 'Delete', style: 'destructive', onPress: () => onDelete(habit) },
      ],
    );
  };

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ width: '100%' }}>
      {width === 0 ? (
        children
      ) : (
        <Host matchContents={{ vertical: true }} style={{ width }}>
          <ContextMenu>
            <ContextMenu.Items>
              {!isPendingInvite && <Button label="Edit" systemImage="pencil" onPress={() => onEdit(habit)} />}
              <Button
                label={isPendingInvite ? 'Cancel invite' : 'Delete'}
                systemImage="trash"
                role="destructive"
                onPress={confirmDelete}
              />
            </ContextMenu.Items>
            <ContextMenu.Trigger>
              <RNHostView matchContents>
                <View style={{ width }}>{children}</View>
              </RNHostView>
            </ContextMenu.Trigger>
          </ContextMenu>
        </Host>
      )}
    </View>
  );
}
