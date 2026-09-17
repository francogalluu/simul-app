import React, { useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { Share2 } from 'lucide-react-native';
import { format } from 'date-fns';
import { Text } from '@/components/AppText';
import { CoupleAvatars } from '@/components/CoupleAvatars';
import { getDateLocale, today } from '@/lib/dates';
import { usePeople } from '@/lib/people';
import { togetherDayComplete, weekRecap } from '@/lib/streaks';
import { haptic } from '@/lib/haptics';
import { toast } from '@/lib/toast';
import { S, fonts, cardShadow } from '@/lib/simulTheme';
import type { Completions, Habit } from '@/store/tasksStore';

/**
 * "You were in sync 5/7 days this week." Shown on Home on Sundays and always
 * on the Stats page; the card itself is what gets captured and shared as an
 * image, so it's designed to stand on its own outside the app.
 */
export function WeeklyRecapCard({
  weekDates,
  habits,
  completions,
  title = 'This week',
  compact,
}: {
  weekDates: string[];
  habits: Habit[];
  completions: Completions;
  title?: string;
  compact?: boolean;
}) {
  const people = usePeople();
  const shotRef = useRef<React.ComponentRef<typeof ViewShot>>(null);
  const [sharing, setSharing] = useState(false);
  const recap = weekRecap(habits, completions, weekDates);
  const locale = getDateLocale();
  const range = `${format(new Date(weekDates[0] + 'T00:00:00'), 'd MMM', { locale })} – ${format(new Date(weekDates[6] + 'T00:00:00'), 'd MMM', { locale })}`;

  const pct = (r: { rate: number | null }) => (r.rate === null ? '—' : `${Math.round(r.rate * 100)}%`);
  const headline = recap.syncPossibleDays > 0
    ? `In sync ${recap.inSyncDays}/${recap.syncPossibleDays} days`
    : recap.a.possible + recap.s.possible > 0
      ? 'A week of showing up'
      : 'A quiet week';
  const line = recap.syncPossibleDays > 0
    ? recap.inSyncDays === recap.syncPossibleDays
      ? 'Every shared habit, done by both of you, every day.'
      : recap.inSyncDays >= Math.ceil(recap.syncPossibleDays / 2)
        ? 'More days together than apart. Keep that going.'
        : 'Some days slipped. Next week is a fresh start.'
    : 'Add a shared habit and this becomes a together score.';

  const share = async () => {
    if (sharing) return;
    setSharing(true);
    haptic.tap();
    try {
      const uri = await shotRef.current?.capture?.();
      if (!uri) throw new Error('capture failed');
      if (!(await Sharing.isAvailableAsync())) {
        toast.info("Sharing isn't available on this device");
        return;
      }
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share your week' });
    } catch {
      toast.error("Couldn't share that", 'Try again in a moment.');
    } finally {
      setSharing(false);
    }
  };

  return (
    <View>
      <ViewShot ref={shotRef} options={{ format: 'png', quality: 1 }} style={styles.shotWrap}>
        <View style={[styles.card, compact && styles.cardCompact]}>
          <View style={styles.topRow}>
            <View>
              <Text style={styles.kicker}>{title}</Text>
              <Text style={styles.range}>{range}</Text>
            </View>
            <CoupleAvatars size={30} />
          </View>

          <Text style={styles.headline}>{headline}</Text>
          <Text style={styles.line}>{line}</Text>

          <View style={styles.daysRow}>
            {weekDates.map((d) => {
              const past = d <= today();
              const inSync = past && togetherDayComplete(habits, completions, d);
              return (
                <View key={d} style={styles.dayCol}>
                  <View style={[styles.dayDot, inSync && styles.dayDotOn, !past && styles.dayDotFuture]} />
                  <Text style={styles.dayLetter}>{format(new Date(d + 'T00:00:00'), 'EEEEE', { locale })}</Text>
                </View>
              );
            })}
          </View>

          <View style={styles.peopleRow}>
            <PersonStat name={people.A.name} color={people.A.color} value={pct(recap.a)} />
            <View style={styles.vs} />
            <PersonStat name={people.S.name} color={people.S.color} value={pct(recap.s)} right />
          </View>

          {recap.topHabit && (
            <Text style={styles.topHabit}>
              Habit of the week: {recap.topHabit.habit.icon} {recap.topHabit.habit.name}
            </Text>
          )}
          <Text style={styles.brand}>Simul</Text>
        </View>
      </ViewShot>

      <Pressable onPress={share} disabled={sharing} style={({ pressed }) => [styles.shareButton, pressed && { opacity: 0.8 }, sharing && { opacity: 0.6 }]}>
        <Share2 size={15} color={S.accentDeep} strokeWidth={2.4} />
        <Text style={styles.shareText}>{sharing ? 'Preparing…' : 'Share as image'}</Text>
      </Pressable>
    </View>
  );
}

function PersonStat({ name, color, value, right }: { name: string; color: string; value: string; right?: boolean }) {
  return (
    <View style={[styles.person, right && { alignItems: 'flex-end' }]}>
      <Text style={[styles.personName, { color }]} numberOfLines={1}>{name}</Text>
      <Text style={styles.personValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  shotWrap: {
    borderRadius: 22,
    overflow: 'hidden',
  },
  card: {
    backgroundColor: S.card,
    borderRadius: 22,
    padding: 18,
    ...cardShadow,
  },
  cardCompact: {
    padding: 16,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  kicker: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: S.tertiary,
  },
  range: {
    fontSize: 12,
    fontWeight: '600',
    color: S.ink500,
    marginTop: 2,
  },
  headline: {
    fontFamily: fonts.bold,
    fontSize: 24,
    color: S.ink900,
    marginTop: 14,
  },
  line: {
    fontSize: 13,
    lineHeight: 19,
    color: S.ink500,
    marginTop: 4,
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingHorizontal: 4,
  },
  dayCol: {
    alignItems: 'center',
    gap: 4,
  },
  dayDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: S.line,
    backgroundColor: '#FFFFFF',
  },
  dayDotOn: {
    backgroundColor: S.accent,
    borderColor: S.accent,
  },
  dayDotFuture: {
    borderStyle: 'dashed',
    borderColor: S.lineSoft,
  },
  dayLetter: {
    fontSize: 10,
    fontWeight: '800',
    color: S.muted,
  },
  peopleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    gap: 12,
  },
  person: {
    flex: 1,
  },
  personName: {
    fontSize: 12,
    fontWeight: '800',
  },
  personValue: {
    fontFamily: fonts.bold,
    fontSize: 22,
    color: S.ink900,
  },
  vs: {
    width: 1,
    height: 28,
    backgroundColor: S.lineSoft,
  },
  topHabit: {
    marginTop: 12,
    fontSize: 12.5,
    fontWeight: '600',
    color: S.ink600,
  },
  brand: {
    marginTop: 10,
    fontFamily: fonts.bold,
    fontSize: 12,
    color: S.muted,
    textAlign: 'right',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    alignSelf: 'center',
    marginTop: 10,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: S.accentSoft,
  },
  shareText: {
    fontSize: 13,
    fontWeight: '700',
    color: S.accentDeep,
  },
});
