import React, { useMemo } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeOut, LinearTransition } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import type { RootStackParamList } from '@/navigation/types';
import { useTasksStore, type Habit } from '@/store/tasksStore';
import { partnerOf, useMe, usePeople } from '@/lib/people';
import { Avatar } from '@/components/Avatar';
import { haptic } from '@/lib/haptics';
import { S, fonts, cardShadow, SCREEN_PADDING } from '@/lib/simulTheme';
import { ScreenHeader } from '@/components/ScreenHeader';
import { EmptyState } from '@/components/EmptyState';

export default function MailboxScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const me = useMe();
  const partner = partnerOf(me);
  const partnerName = usePeople()[partner].name;
  const habits = useTasksStore((s) => s.habits);
  const acceptInvite = useTasksStore((s) => s.acceptInvite);
  const declineInvite = useTasksStore((s) => s.declineInvite);

  const incoming = useMemo(() => habits.filter((h) => h.status === 'pending' && h.requestedBy === partner), [habits, partner]);
  const sent = useMemo(() => habits.filter((h) => h.status === 'pending' && h.requestedBy === me), [habits, me]);

  const accept = (h: Habit) => { haptic.success(); acceptInvite(h.id); };
  const decline = (h: Habit) => { haptic.warning(); declineInvite(h.id); };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title="Mailbox" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {incoming.length === 0 && sent.length === 0 ? (
          <EmptyState
            icon="📭"
            title="Nothing in your mailbox"
            body={`When ${partnerName} invites you to a shared habit, it'll show up here for you to accept.`}
            actionLabel={`Invite ${partnerName} to a habit`}
            onAction={() => navigation.navigate('AddHabit')}
          />
        ) : (
          <>
            {incoming.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>Requests for you</Text>
                {incoming.map((h) => (
                  <Animated.View key={h.id} exiting={FadeOut.duration(220)} layout={LinearTransition.springify()}>
                    <View style={styles.card}>
                      <View style={styles.fromRow}>
                        <Avatar person={partner} size={24} style={styles.fromAvatar} />
                        <Text style={styles.fromText}>
                          <Text style={styles.fromName}>{partnerName}</Text> wants to do this together
                        </Text>
                      </View>
                      <View style={styles.habitRow}>
                        <View style={styles.habitIcon}>
                          <Text style={styles.habitIconText}>{h.icon}</Text>
                        </View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={styles.habitName} numberOfLines={1}>{h.name}</Text>
                          <Text style={styles.habitMeta}>{h.time} • every day, both of you</Text>
                        </View>
                      </View>
                      <View style={styles.actions}>
                        <Pressable onPress={() => decline(h)} style={({ pressed }) => [styles.ghostButton, pressed && { opacity: 0.7 }]}>
                          <Text style={styles.ghostButtonText}>Decline</Text>
                        </Pressable>
                        <Pressable onPress={() => accept(h)} style={({ pressed }) => [styles.acceptButton, pressed && { opacity: 0.9 }]}>
                          <Text style={styles.acceptButtonText}>Accept</Text>
                        </Pressable>
                      </View>
                    </View>
                  </Animated.View>
                ))}
              </>
            )}

            {sent.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>Waiting on {partnerName}</Text>
                {sent.map((h) => (
                  <Animated.View key={h.id} exiting={FadeOut.duration(220)} layout={LinearTransition.springify()}>
                    <View style={[styles.card, styles.cardSent]}>
                      <View style={styles.habitRow}>
                        <View style={styles.habitIcon}>
                          <Text style={styles.habitIconText}>{h.icon}</Text>
                        </View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={styles.habitName} numberOfLines={1}>{h.name}</Text>
                          <Text style={[styles.habitMeta, { color: S.amber }]}>Sent • waiting for {partnerName} to accept</Text>
                        </View>
                        <Pressable onPress={() => decline(h)} hitSlop={8} style={({ pressed }) => pressed && { opacity: 0.6 }}>
                          <Text style={styles.cancelText}>Cancel</Text>
                        </Pressable>
                      </View>
                    </View>
                  </Animated.View>
                ))}
              </>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: S.bg,
  },
  scroll: {
    paddingHorizontal: SCREEN_PADDING,
    paddingBottom: 32,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: S.tertiary,
    marginTop: 18,
    marginBottom: 10,
  },
  card: {
    backgroundColor: S.card,
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    ...cardShadow,
  },
  cardSent: {
    opacity: 0.85,
  },
  fromRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  fromAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  fromText: {
    fontSize: 13,
    color: S.ink500,
    flex: 1,
  },
  fromName: {
    fontWeight: '700',
    color: S.ink900,
  },
  habitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  habitIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: S.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  habitIconText: {
    fontSize: 22,
  },
  habitName: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: S.ink900,
  },
  habitMeta: {
    fontSize: 12,
    fontWeight: '500',
    color: S.tertiary,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  ghostButton: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    backgroundColor: S.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: S.ink700,
  },
  acceptButton: {
    flex: 1.4,
    height: 46,
    borderRadius: 14,
    backgroundColor: S.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cancelText: {
    fontSize: 13,
    fontWeight: '700',
    color: S.danger,
  },
});
