import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import Svg, { Circle } from 'react-native-svg';

import { useTheme } from '@/context/ThemeContext';
import { getProgressColor } from '@/lib/progressColors';
import type { Palette } from '@/lib/theme';
import type { RootStackParamList } from '@/navigation/types';

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

type RouteProps = RouteProp<RootStackParamList, 'ByHabitAnalytics'>;

export default function ByHabitAnalyticsScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const route = useRoute<RouteProps>();
  const { items, title } = route.params;

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.bgSecondary }]} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[s.description, { color: colors.text2 }]}>
          {title} · {t('analytics.byHabitListDescription')}
        </Text>

        {items.length === 0 ? (
          <View style={s.emptyWrap}>
            <Text style={[s.emptyText, { color: colors.text2 }]}>{t('analytics.noData')}</Text>
          </View>
        ) : (
          items.map((item, index) => {
            const pctColor = getProgressColor(item.pct);
            return (
              <View key={item.id} style={[s.card, { backgroundColor: colors.bgCard }]}>
                <View style={s.rankBadge}>
                  <Text style={[s.rankText, { color: colors.text2 }]}>{index + 1}</Text>
                </View>

                <View style={s.mainCol}>
                  <View style={s.nameRow}>
                    <Text style={s.habitIcon}>{item.icon}</Text>
                    <Text style={[s.habitName, { color: colors.text1 }]} numberOfLines={1}>
                      {item.name}
                    </Text>
                  </View>
                  <Text style={[s.measureLabel, { color: colors.text2 }]}>{item.label}</Text>
                  <View style={[s.barTrack, { backgroundColor: colors.ring }]}>
                    <View
                      style={[
                        s.barFill,
                        { width: `${item.pct}%` as `${number}%`, backgroundColor: pctColor },
                      ]}
                    />
                  </View>
                </View>

                <View style={s.statsCol}>
                  <View style={[s.divider, { backgroundColor: colors.separator }]} />
                  <View style={s.ringWrap}>
                    <MiniRing pct={item.pct} colors={colors} />
                    <Text style={[s.ringLabel, { color: pctColor }]}>{item.pct}%</Text>
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

  description: { fontSize: 13, fontWeight: '500', lineHeight: 19, marginBottom: 6 },

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

  mainCol: { flex: 1, minWidth: 0, gap: 4 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  habitIcon: { fontSize: 18 },
  habitName: { fontSize: 15, fontWeight: '700', flex: 1 },
  measureLabel: { fontSize: 12, fontWeight: '600' },

  barTrack: { height: 5, borderRadius: 3, overflow: 'hidden', marginTop: 4 },
  barFill: { height: '100%', borderRadius: 3 },

  statsCol: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingLeft: 4 },
  divider: { width: StyleSheet.hairlineWidth, height: 32 },
  ringWrap: { alignItems: 'center', gap: 2 },
  ringLabel: { fontSize: 11, fontWeight: '800' },
});
