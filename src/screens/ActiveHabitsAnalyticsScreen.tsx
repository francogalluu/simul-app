import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import Svg, { Circle } from 'react-native-svg';

import { useTheme } from '@/context/ThemeContext';
import { useHabitLogs } from '@/hooks/useHabitLogs';
import { useSettingsStore } from '@/store/settingsStore';
import { buildActiveHabitsLeaderboard } from '@/lib/generalAnalytics';
import { getProgressColor } from '@/lib/progressColors';
import { today } from '@/lib/dates';
import type { Palette } from '@/lib/theme';

// ─── Mini ring ────────────────────────────────────────────────────────────────

function MiniRing({ pct, colors }: { pct: number; colors: Palette }) {
  const size = 44;
  const stroke = 4;
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const fill = Math.max(0, Math.min(1, pct / 100));
  const color = getProgressColor(pct);
  return (
    <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
      <Circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke={colors.ring} strokeWidth={stroke}
      />
      <Circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circ}
        strokeDashoffset={circ * (1 - fill)}
        strokeLinecap="round"
      />
    </Svg>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ActiveHabitsAnalyticsScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { habits, entries, focusKey } = useHabitLogs();
  const weekStartsOn = useSettingsStore(s => s.weekStartsOn);
  const todayStr = today();

  const rankedHabits = useMemo(
    () => buildActiveHabitsLeaderboard(habits, entries, todayStr, weekStartsOn),
    [habits, entries, todayStr, weekStartsOn, focusKey],
  );

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.bgSecondary }]} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[s.listDescription, { color: colors.text2 }]}>
          {t('analytics.activeHabitsListDescription')}
        </Text>

        {rankedHabits.length === 0 ? (
          <View style={s.emptyWrap}>
            <Text style={[s.emptyText, { color: colors.text2 }]}>{t('analytics.noData')}</Text>
          </View>
        ) : (
          rankedHabits.map((item, index) => {
            const pctColor = getProgressColor(item.completionPct);
            return (
              <View
                key={item.habit.id}
                style={[s.card, { backgroundColor: colors.bgCard }]}
              >
                {/* Rank badge */}
                <View style={s.rankBadge}>
                  <Text style={[s.rankText, { color: colors.text2 }]}>{index + 1}</Text>
                </View>

                {/* Icon + name */}
                <View style={s.mainCol}>
                  <View style={s.nameRow}>
                    <Text style={s.habitIcon}>{item.habit.icon}</Text>
                    <Text style={[s.habitName, { color: colors.text1 }]} numberOfLines={1}>
                      {item.habit.name}
                    </Text>
                  </View>
                  {/* Progress bar */}
                  <View style={[s.barTrack, { backgroundColor: colors.ring }]}>
                    <View
                      style={[
                        s.barFill,
                        {
                          width: `${item.completionPct}%` as `${number}%`,
                          backgroundColor: pctColor,
                        },
                      ]}
                    />
                  </View>
                </View>

                {/* Stats */}
                <View style={s.statsCol}>
                  <View style={s.statRow}>
                    <Text style={[s.statValue, { color: colors.text1 }]}>{item.completedDays}</Text>
                    <Text style={[s.statLabel, { color: colors.text2 }]}>{t('analytics.daysShort')}</Text>
                  </View>
                  <View style={[s.divider, { backgroundColor: colors.separator }]} />
                  <View style={s.ringWrap}>
                    <MiniRing pct={item.completionPct} colors={colors} />
                    <Text style={[s.ringLabel, { color: pctColor }]}>{item.completionPct}%</Text>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 32, gap: 10 },

  listDescription: { fontSize: 13, fontWeight: '500', lineHeight: 19, marginBottom: 6 },

  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyText: { fontSize: 15, fontWeight: '600' },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },

  rankBadge: { width: 22, alignItems: 'center' },
  rankText: { fontSize: 13, fontWeight: '700' },

  mainCol: { flex: 1, minWidth: 0, gap: 8 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  habitIcon: { fontSize: 18 },
  habitName: { fontSize: 15, fontWeight: '700', flex: 1 },

  barTrack: {
    height: 5,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },

  statsCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingLeft: 4,
  },
  statRow: { alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: '800', lineHeight: 28, letterSpacing: -0.5 },
  statLabel: { fontSize: 10, fontWeight: '600', marginTop: 1, textTransform: 'uppercase' },

  divider: { width: StyleSheet.hairlineWidth, height: 32 },

  ringWrap: { alignItems: 'center', gap: 2 },
  ringLabel: { fontSize: 11, fontWeight: '800' },
});
