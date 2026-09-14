import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import Svg, { Circle } from 'react-native-svg';
import { format } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useHabitStore } from '@/store';
import { useSettingsStore } from '@/store/settingsStore';
import { useTheme } from '@/context/ThemeContext';
import { today, datesInRange, addDays, toLocalDateString, getWeekDates, getShortDayLabels, getDateLocale } from '@/lib/dates';
import { getDaySummary } from '@/lib/daySummary';
import { getHabitCurrentValue, dailyCompletedCount, isHabitActiveOnDate } from '@/lib/aggregates';
import { getHabitUnitLabel } from '@/lib/habitUnitLabel';
import { getProgressColor } from '@/lib/progressColors';
import { BarChartWithTooltip, type ChartBar } from '@/components/charts/BarChartWithTooltip';
import { ScoreRing } from '@/components/ScoreRing';
import type { Palette } from '@/lib/theme';

// ─── Monthly day cell (unified number + ring) ───────────────────────────────

const MONTH_CELL = 44;
const MONTH_RING_R = 15.5;
const MONTH_TRACK_STROKE = 2;
const MONTH_PROGRESS_STROKE = 2.75;

function MonthlyCalendarDayCell({
  dayNum,
  completionPct,
  habitTotal,
  isToday,
  isFuture,
  colors,
}: {
  dayNum: number;
  completionPct: number;
  habitTotal: number;
  isToday: boolean;
  isFuture: boolean;
  colors: Palette;
}) {
  const c = MONTH_CELL / 2;
  const ringCirc = 2 * Math.PI * MONTH_RING_R;
  const hasHabits = habitTotal > 0;
  const trackColor = colors.ring;

  if (isFuture) {
    return (
      <View style={s.monthDayHit}>
        <Text style={[s.monthDayNumFuture, { color: colors.text4 }]}>{dayNum}</Text>
      </View>
    );
  }

  if (isToday) {
    return (
      <View style={s.monthDayHit}>
        <View style={s.monthDayStack}>
          <Svg
            width={MONTH_CELL}
            height={MONTH_CELL}
            viewBox={`0 0 ${MONTH_CELL} ${MONTH_CELL}`}
            style={{ transform: [{ rotate: '-90deg' }] }}
          >
            <Circle cx={c} cy={c} r={c - 0.5} fill={colors.teal} />
            {hasHabits && completionPct < 100 && (
              <Circle
                cx={c}
                cy={c}
                r={MONTH_RING_R}
                fill="none"
                stroke="rgba(255,255,255,0.42)"
                strokeWidth={MONTH_PROGRESS_STROKE}
                strokeLinecap="round"
                strokeDasharray={ringCirc}
                strokeDashoffset={ringCirc * (1 - completionPct / 100)}
              />
            )}
          </Svg>
          <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
            <View style={s.monthDayNumCenter}>
              <Text style={[s.monthDayNumToday, { color: colors.white }]}>{dayNum}</Text>
            </View>
          </View>
        </View>
      </View>
    );
  }

  if (!hasHabits) {
    return (
      <View style={s.monthDayHit}>
        <Text style={[s.monthDayNumEmpty, { color: colors.text3 }]}>{dayNum}</Text>
      </View>
    );
  }

  const progressColor = getProgressColor(completionPct);

  return (
    <View style={s.monthDayHit}>
      <View style={s.monthDayStack}>
        <Svg
          width={MONTH_CELL}
          height={MONTH_CELL}
          viewBox={`0 0 ${MONTH_CELL} ${MONTH_CELL}`}
          style={{ transform: [{ rotate: '-90deg' }] }}
        >
          <Circle
            cx={c}
            cy={c}
            r={MONTH_RING_R}
            fill="none"
            stroke={trackColor}
            strokeWidth={MONTH_TRACK_STROKE}
            opacity={0.5}
          />
          {completionPct > 0 && (
            <Circle
              cx={c}
              cy={c}
              r={MONTH_RING_R}
              fill="none"
              stroke={progressColor}
              strokeWidth={MONTH_PROGRESS_STROKE}
              strokeLinecap="round"
              strokeDasharray={ringCirc}
              strokeDashoffset={ringCirc * (1 - completionPct / 100)}
            />
          )}
        </Svg>
        <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
          <View style={s.monthDayNumCenter}>
            <Text style={[s.monthDayNum, { color: colors.text1 }]}>{dayNum}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isoDate(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function formatMonthDay(dateKey: string, locale: ReturnType<typeof getDateLocale>): string {
  const d = new Date(dateKey + 'T00:00:00');
  return format(d, 'MMM d', { locale });
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CalendarScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const locale = getDateLocale();
  const rawHabits = useHabitStore(s => s.habits);
  const entries   = useHabitStore(s => s.entries);
  const weekStartsOn = useSettingsStore(s => s.weekStartsOn);

  const todayStr = today();

  const habits = useMemo(() => {
    const seen = new Set<string>();
    return rawHabits.filter(h => {
      if (!isHabitActiveOnDate(h, todayStr) || seen.has(h.id)) return false;
      seen.add(h.id);
      return true;
    });
  }, [rawHabits, todayStr]);

  /** Weekly calendar bars/stats exclude monthly habits; monthly view still uses full `rawHabits`. */
  const habitsForWeeklyCalendar = useMemo(
    () => rawHabits.filter(h => h.frequency !== 'monthly'),
    [rawHabits],
  );

  const todayDate = new Date(todayStr + 'T00:00:00');

  const [view, setView] = useState<'monthly' | 'weekly' | 'yearly'>('monthly');
  const [yearlySubView, setYearlySubView] = useState<'entire' | 'byMonth'>('byMonth');
  const [yearlyYear, setYearlyYear] = useState(() => todayDate.getFullYear());

  const [currentMonth, setCurrentMonth] = useState(
    () => new Date(todayDate.getFullYear(), todayDate.getMonth(), 1),
  );

  const [weekStart, setWeekStart] = useState(() => {
    const ws = useSettingsStore.getState().weekStartsOn;
    const startStr = getWeekDates(todayStr, ws)[0];
    return new Date(startStr + 'T00:00:00');
  });

  useEffect(() => {
    const startStr = getWeekDates(todayStr, weekStartsOn)[0];
    setWeekStart(new Date(startStr + 'T00:00:00'));
  }, [weekStartsOn]);

  // ── Monthly calendar cells ────────────────────────────────────────────────

  const monthDays = useMemo(() => {
    const y = currentMonth.getFullYear();
    const m = currentMonth.getMonth();
    const nativeFirstDow = new Date(y, m, 1).getDay(); // 0 = Sun
    const total          = new Date(y, m + 1, 0).getDate();

    // Align the first day of the month with the user's preferred week start.
    const leadingEmpty =
      weekStartsOn === 0
        ? nativeFirstDow
        : (nativeFirstDow - 1 + 7) % 7; // 0 when Monday, 6 when Sunday

    const cells: (string | null)[] = [];
    for (let i = 0; i < leadingEmpty; i++) cells.push(null);
    for (let d = 1; d <= total; d++) cells.push(isoDate(y, m, d));
    return cells;
  }, [currentMonth, weekStartsOn]);

  const monthLabel = format(currentMonth, 'MMMM yyyy', { locale });

  const monthStats = useMemo(() => {
    const y = currentMonth.getFullYear();
    const m = currentMonth.getMonth();
    const from   = isoDate(y, m, 1);
    const lastD  = new Date(y, m + 1, 0).getDate();
    const to     = isoDate(y, m, lastD);
    const dates  = datesInRange(from, todayStr < to ? todayStr : to);
    if (dates.length === 0) return { pct: 0, completed: 0, total: 0 };
    const scores    = dates.map(d => getDaySummary(rawHabits, entries, d, weekStartsOn).completionPct);
    const completed = scores.filter(v => v === 100).length;
    const pct       = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    return { pct, completed, total: dates.length };
  }, [currentMonth, rawHabits, entries, todayStr, weekStartsOn]);

  // ── Weekly bar data ───────────────────────────────────────────────────────

  const weekEnd = useMemo(() => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 6);
    return d;
  }, [weekStart]);

  const weekStartStr = toLocalDateString(weekStart);

  const weekChartBars = useMemo((): ChartBar[] => {
    const labels = getShortDayLabels(weekStartsOn, locale);
    const dates = Array.from({ length: 7 }, (_, i) => addDays(weekStartStr, i));
    return dates.map((dateStr, i) => {
      const pct =
        dateStr <= todayStr
          ? getDaySummary(habitsForWeeklyCalendar, entries, dateStr, weekStartsOn).completionPct
          : 0;
      const { completed, total } = dailyCompletedCount(
        habitsForWeeklyCalendar,
        entries,
        dateStr,
        weekStartsOn,
      );
      return {
        key: dateStr,
        label: labels[i],
        percent: pct,
        completed,
        target: total,
      };
    });
  }, [weekStartStr, habitsForWeeklyCalendar, entries, todayStr, weekStartsOn, locale]);

  const weekDays = useMemo(() => {
    const labels = getShortDayLabels(weekStartsOn, locale);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      const dateStr = toLocalDateString(d);
      return {
        label:      labels[i],
        dateStr,
        completion:
          dateStr <= todayStr
            ? getDaySummary(habitsForWeeklyCalendar, entries, dateStr, weekStartsOn).completionPct
            : 0,
        isFuture:   dateStr > todayStr,
        isToday:    dateStr === todayStr,
      };
    });
  }, [weekStart, habitsForWeeklyCalendar, entries, todayStr, weekStartsOn, locale]);

  const weekStats = useMemo(() => {
    const past = weekDays.filter(d => !d.isFuture);
    if (past.length === 0) return { pct: 0, completed: 0, total: 0 };
    const completed = past.filter(d => d.completion === 100).length;
    const pct       = Math.round(past.reduce((a, b) => a + b.completion, 0) / past.length);
    return { pct, completed, total: past.length };
  }, [weekDays]);

  const weekLabel = useMemo(() => {
    const s = weekStart;
    const e = weekEnd;
    if (s.getMonth() === e.getMonth()) {
      return `${format(s, 'MMM', { locale })} ${s.getDate()} – ${e.getDate()}, ${s.getFullYear()}`;
    }
    return `${format(s, 'MMM', { locale })} ${s.getDate()} – ${format(e, 'MMM', { locale })} ${e.getDate()}, ${s.getFullYear()}`;
  }, [weekStart, weekEnd, locale]);


  // ── Yearly pixel data ─────────────────────────────────────────────────────

  const yearlyData = useMemo(() => {
    if (view !== 'yearly') return { grid: [] as number[][], monthGrids: [] as { label: string; cells: { day: number; pct: number }[] }[] };

    const y = yearlyYear;
    // grid[day-1][month-0..11] = completionPct (0–100), -1 if day doesn't exist
    const grid: number[][] = [];
    for (let d = 0; d < 31; d++) {
      const row: number[] = [];
      for (let m = 0; m < 12; m++) {
        const daysInMonth = new Date(y, m + 1, 0).getDate();
        if (d >= daysInMonth) {
          row.push(-1);
        } else {
          const dateStr = isoDate(y, m, d + 1);
          if (dateStr > todayStr) {
            row.push(-2); // future
          } else {
            row.push(getDaySummary(rawHabits, entries, dateStr, weekStartsOn).completionPct);
          }
        }
      }
      grid.push(row);
    }

    // month grids for "by month" view
    const shortMonths = Array.from({ length: 12 }, (_, i) =>
      format(new Date(y, i, 1), 'MMM', { locale }),
    );

    const monthGrids = Array.from({ length: 12 }, (_, m) => {
      const daysInMonth = new Date(y, m + 1, 0).getDate();
      const nativeFirstDow = new Date(y, m, 1).getDay();
      const leadingEmpty = weekStartsOn === 0 ? nativeFirstDow : (nativeFirstDow - 1 + 7) % 7;

      const cells: { day: number; pct: number }[] = [];
      for (let i = 0; i < leadingEmpty; i++) cells.push({ day: 0, pct: -1 });
      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = isoDate(y, m, d);
        if (dateStr > todayStr) {
          cells.push({ day: d, pct: -2 });
        } else {
          cells.push({ day: d, pct: getDaySummary(rawHabits, entries, dateStr, weekStartsOn).completionPct });
        }
      }
      return { label: shortMonths[m], cells };
    });

    return { grid, monthGrids };
  }, [view, yearlyYear, rawHabits, entries, todayStr, weekStartsOn, locale]);

  // ── Habit breakdown ───────────────────────────────────────────────────────

  const habitBreakdown = useMemo(() => {
    const y = currentMonth.getFullYear();
    const m = currentMonth.getMonth();

    let dates: string[];
    if (view === 'monthly') {
      const from  = isoDate(y, m, 1);
      const lastD = new Date(y, m + 1, 0).getDate();
      const to    = isoDate(y, m, lastD);
      dates = datesInRange(from, todayStr < to ? todayStr : to);
    } else {
      dates = weekDays.filter(d => !d.isFuture).map(d => d.dateStr);
    }

    const breakdownHabits =
      view === 'weekly' ? habits.filter(h => h.frequency !== 'monthly') : habits;

    return breakdownHabits.map(habit => {
      let value = '';
      if (habit.kind === 'boolean') {
        const count = dates.filter(d => getHabitCurrentValue(habit, entries, d, weekStartsOn) >= habit.target).length;
        value = `${count} time${count !== 1 ? 's' : ''}`;
      } else {
        const sum = dates.reduce((acc, d) => {
          const e = entries.find(en => en.id === `${habit.id}_${d}`);
          return acc + (e?.value ?? 0);
        }, 0);
        const u = getHabitUnitLabel(habit, t);
        value = `${sum}${u ? ' ' + u : ''}`;
      }
      return { id: habit.id, icon: habit.icon, name: habit.name, value };
    });
  }, [habits, entries, view, currentMonth, weekDays, todayStr, weekStartsOn, t]);

  // ── Month navigation ──────────────────────────────────────────────────────

  const monthIndex    = currentMonth.getFullYear() * 12 + currentMonth.getMonth();
  const todayMonthIdx = todayDate.getFullYear() * 12 + todayDate.getMonth();
  const canPrevMonth  = monthIndex > todayMonthIdx - 12;
  const canNextMonth  = monthIndex < todayMonthIdx;
  const weekEndStr    = toLocalDateString(weekEnd);

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.bgHome }]} edges={['top']}>
      {/* ── Header ────────────────────────────────────────────────────── */}
      <View style={s.header}>
        <Text style={[s.headerTitle, { color: colors.text1 }]}>{t('calendar.title')}</Text>

        {/* Segmented control */}
        <View style={[s.seg, { backgroundColor: colors.separatorLight }]}>
          {(['weekly', 'monthly', 'yearly'] as const).map(v => (
            <Pressable
              key={v}
              onPress={() => setView(v)}
              style={[s.segBtn, view === v && [s.segBtnActive, { backgroundColor: colors.bgCard }]]}
            >
              <Text style={[s.segBtnText, { color: colors.text3 }, view === v && { color: colors.teal }]}>
                {v === 'weekly' ? t('calendar.weekly') : v === 'monthly' ? t('calendar.monthly') : t('calendar.yearly')}
              </Text>
            </Pressable>
          ))}
        </View>

      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Period navigation — inside ScrollView so tooltip can overlap it */}
        {view !== 'yearly' && <View style={s.periodNav}>
          <Pressable
            onPress={() => {
              if (view === 'monthly') {
                if (!canPrevMonth) return;
                const m = new Date(currentMonth);
                m.setMonth(m.getMonth() - 1);
                setCurrentMonth(m);
              } else {
                const d = new Date(weekStart);
                d.setDate(d.getDate() - 7);
                setWeekStart(d);
              }
            }}
            style={s.navBtn}
            disabled={view === 'monthly' && !canPrevMonth}
          >
            <ChevronLeft
              size={20}
              strokeWidth={2.5}
              color={(view === 'monthly' && !canPrevMonth) ? colors.chevron : colors.teal}
            />
          </Pressable>

          <Text style={[s.periodLabel, { color: colors.text1 }]}>
            {view === 'monthly' ? monthLabel : weekLabel}
          </Text>

          <Pressable
            onPress={() => {
              if (view === 'monthly') {
                if (!canNextMonth) return;
                const m = new Date(currentMonth);
                m.setMonth(m.getMonth() + 1);
                setCurrentMonth(m);
              } else {
                const d = new Date(weekStart);
                d.setDate(d.getDate() + 7);
                if (toLocalDateString(d) <= todayStr) setWeekStart(d);
              }
            }}
            style={s.navBtn}
            disabled={(view === 'monthly' && !canNextMonth) || (view === 'weekly' && weekEndStr >= todayStr)}
          >
            <ChevronRight
              size={20}
              strokeWidth={2.5}
              color={
                (view === 'monthly' && !canNextMonth) || (view === 'weekly' && weekEndStr >= todayStr)
                  ? colors.chevron
                  : colors.teal
              }
            />
          </Pressable>
        </View>}

        {view === 'monthly' ? (
          <>
            {/* ── Monthly calendar grid ──────────────────────────────── */}
            <View style={[s.calCard, { backgroundColor: colors.bgCard }]}>
              <View style={s.dayHeaders}>
                {getShortDayLabels(weekStartsOn, locale).map(d => (
                  <Text key={d} style={[s.dayHeader, { color: colors.text4 }]}>{d}</Text>
                ))}
              </View>
              <View style={s.calGrid}>
                {monthDays.map((dateStr, idx) => {
                  if (!dateStr) return <View key={`e-${idx}`} style={s.calCell} />;
                  const isToday = dateStr === todayStr;
                  const isFuture = dateStr > todayStr;
                  const pct = isFuture
                    ? 0
                    : getDaySummary(rawHabits, entries, dateStr, weekStartsOn).completionPct;
                  const { total: habitTotal } = dailyCompletedCount(rawHabits, entries, dateStr, weekStartsOn);
                  const dayNum = parseInt(dateStr.split('-')[2], 10);
                  return (
                    <View key={dateStr} style={s.calCell}>
                      <MonthlyCalendarDayCell
                        dayNum={dayNum}
                        completionPct={pct}
                        habitTotal={habitTotal}
                        isToday={isToday}
                        isFuture={isFuture}
                        colors={colors}
                      />
                    </View>
                  );
                })}
              </View>
            </View>

            <CompletionRingCard
              title={t('calendar.monthlyCompletion')}
              subtitle={t('calendar.daysCompleted', { completed: monthStats.completed, total: monthStats.total })}
              pct={monthStats.pct}
              animationSlot="calendar-monthly"
            />
          </>
        ) : view === 'weekly' ? (
          <>
            {/* ── Weekly bar chart (shared with Analytics) ───────────────────── */}
            <View style={[s.barCard, { backgroundColor: colors.bgCard }]}>
              <BarChartWithTooltip
                bars={weekChartBars}
                chartAreaHeight={220}
                getTooltipDateLabel={(bar) => formatMonthDay(bar.key, locale)}
                todayIndex={weekChartBars.findIndex(b => b.key === todayStr)}
                emptyMessage={t('calendar.noDataForWeek')}
              />
            </View>

            <CompletionRingCard
              title={t('calendar.weeklyCompletion')}
              subtitle={t('calendar.daysCompleted', { completed: weekStats.completed, total: weekStats.total })}
              pct={weekStats.pct}
              animationSlot="calendar-weekly"
            />
          </>
        ) : null}

        {/* ── Yearly view ────────────────────────────────────────────── */}
        {view === 'yearly' && (
          <>
            {/* Year navigation */}
            <View style={s.periodNav}>
              <Pressable
                onPress={() => setYearlyYear(y => y - 1)}
                style={s.navBtn}
                disabled={yearlyYear <= todayDate.getFullYear() - 5}
              >
                <ChevronLeft
                  size={20} strokeWidth={2.5}
                  color={yearlyYear <= todayDate.getFullYear() - 5 ? colors.chevron : colors.teal}
                />
              </Pressable>
              <Text style={[s.periodLabel, { color: colors.text1 }]}>{yearlyYear}</Text>
              <Pressable
                onPress={() => setYearlyYear(y => y + 1)}
                style={s.navBtn}
                disabled={yearlyYear >= todayDate.getFullYear()}
              >
                <ChevronRight
                  size={20} strokeWidth={2.5}
                  color={yearlyYear >= todayDate.getFullYear() ? colors.chevron : colors.teal}
                />
              </Pressable>
            </View>

            {/* Entire year / By month sub-picker */}
            <View style={[s.yearlySubSeg, { backgroundColor: colors.bgCard }]}>
              {(['entire', 'byMonth'] as const).map(sv => (
                <Pressable
                  key={sv}
                  onPress={() => setYearlySubView(sv)}
                  style={s.yearlySubBtn}
                >
                  <Text style={[
                    s.yearlySubBtnText,
                    { color: colors.text3 },
                    yearlySubView === sv && { color: colors.teal },
                  ]}>
                    {sv === 'entire' ? t('calendar.entireYear') : t('calendar.byMonth')}
                  </Text>
                  {yearlySubView === sv && <View style={[s.yearlySubUnderline, { backgroundColor: colors.teal }]} />}
                </Pressable>
              ))}
            </View>

            {yearlySubView === 'entire' ? (
              /* ── Entire-year grid: rows=days(1–31), cols=months(1–12) ─── */
              <View style={[s.yearlyCard, { backgroundColor: colors.bgCard }]}>
                {/* Month header row */}
                <View style={s.yearGridHeaderRow}>
                  <View style={s.yearGridRowLabel} />
                  {Array.from({ length: 12 }, (_, m) => (
                    <View key={m} style={s.yearGridCell}>
                      <Text style={[s.yearGridHeaderText, { color: colors.text3 }]}>{m + 1}</Text>
                    </View>
                  ))}
                </View>
                {/* Day rows */}
                {yearlyData.grid.map((row, d) => (
                  <View key={d} style={s.yearGridRow}>
                    <View style={s.yearGridRowLabel}>
                      <Text style={[s.yearGridRowLabelText, { color: colors.text3 }]}>{d + 1}</Text>
                    </View>
                    {row.map((pct, m) => (
                      <View key={m} style={s.yearGridCell}>
                        <View
                          style={[
                            s.yearDot,
                            {
                              backgroundColor:
                                pct === -1
                                  ? 'transparent'
                                  : pct === -2
                                    ? colors.ring
                                    : pct === 0
                                      ? colors.ring
                                      : getProgressColor(pct),
                              opacity: pct === -2 ? 0.4 : 1,
                            },
                          ]}
                        />
                      </View>
                    ))}
                  </View>
                ))}
              </View>
            ) : (
              /* ── By-month grid: 2-column layout of month cards ──────── */
              <View style={s.monthCardsGrid}>
                {yearlyData.monthGrids.map((mg, m) => (
                  <View key={m} style={[s.monthCard, { backgroundColor: colors.bgCard }]}>
                    <Text style={[s.monthCardLabel, { color: colors.text1 }]}>{mg.label}</Text>
                    <View style={s.monthCardDots}>
                      {mg.cells.map((cell, i) => (
                        <View key={i} style={s.monthCardDotWrap}>
                          {cell.day === 0 ? (
                            <View style={s.monthCardDotEmpty} />
                          ) : (
                            <View
                              style={[
                                s.monthCardDot,
                                {
                                  backgroundColor:
                                    cell.pct === -2
                                      ? colors.ring
                                      : cell.pct === 0
                                        ? colors.ring
                                        : getProgressColor(cell.pct),
                                  opacity: cell.pct === -2 ? 0.4 : 1,
                                },
                              ]}
                            />
                          )}
                        </View>
                      ))}
                    </View>
                  </View>
                ))}
              </View>
            )}
          </>
        )}

        {/* ── Habit breakdown ───────────────────────────────────────── */}
        {view !== 'yearly' && <Text style={[s.breakdownTitle, { color: colors.text1 }]}>
          {view === 'monthly' ? t('calendar.thisMonth') : t('calendar.thisWeek')}
        </Text>}

        {view !== 'yearly' && (habitBreakdown.length === 0 ? (
          <View style={[s.emptyCard, { backgroundColor: colors.bgCard }]}>
            <Text style={[s.emptyText, { color: colors.text2 }]}>{t('calendar.noHabitsAddOnHome')}</Text>
          </View>
        ) : (
          <View style={[s.breakdownCard, { backgroundColor: colors.bgCard }]}>
            {habitBreakdown.map((h, i) => (
              <View
                key={h.id}
                style={[s.breakdownRow, i < habitBreakdown.length - 1 && [s.breakdownBorder, { borderBottomColor: colors.separator }]]}
              >
                <View style={[s.breakdownIconWrap, { backgroundColor: colors.ring }]}>
                  <Text style={s.breakdownIcon}>{h.icon}</Text>
                </View>
                <Text style={[s.breakdownName, { color: colors.text1 }]}>{h.name}</Text>
                <Text style={[s.breakdownValue, { color: colors.text3 }]}>{h.value}</Text>
              </View>
            ))}
          </View>
        ))}

        <View style={{ height: 32 }} />
      </ScrollView>

    </SafeAreaView>
  );
}

// ─── Shared cards ─────────────────────────────────────────────────────────────

function CompletionRingCard({
  title, subtitle, pct, animationSlot = 'calendar',
}: {
  title: string; subtitle: string; pct: number; animationSlot?: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={[s.completionCard, { backgroundColor: colors.bgCard }]}>
      <View style={{ flex: 1 }}>
        <Text style={[s.completionTitle, { color: colors.text1 }]}>{title}</Text>
        <Text style={[s.completionSub, { color: colors.text2 }]}>{subtitle}</Text>
      </View>
      <View style={s.completionRingWrap}>
        <ScoreRing
          key={animationSlot}
          value={pct}
          size={130}
          strokeWidth={14}
          radius={50}
          animationSlot={animationSlot}
          labelStyle={[s.completionPct, { color: colors.text1 }]}
          labelStyleWhenFull={s.completionPctFull}
        />
      </View>
    </View>
  );
}


// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe:  { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 20 },

  // Header
  header: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 12 },
  headerTitle: {
    fontSize: 34, fontWeight: '700',
    letterSpacing: -0.68, marginBottom: 12,
  },

  // Segmented control
  seg: {
    flexDirection: 'row',
    borderRadius: 10, padding: 2, marginBottom: 12,
  },
  segBtn:        { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  segBtnActive:  {
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.10, shadowRadius: 3, elevation: 1,
  },
  segBtnText:    { fontSize: 15, fontWeight: '500' },
  segBtnTextActive: {},

  // Period navigation
  periodNav:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, paddingHorizontal: 8 },
  navBtn:      { padding: 8 },
  periodLabel: { fontSize: 17, fontWeight: '600' },

  // Monthly calendar
  calCard:    {
    borderRadius: 20,
    padding: 16, marginBottom: 12,
  },
  dayHeaders: { flexDirection: 'row', marginBottom: 8 },
  dayHeader:  {
    flex: 1, textAlign: 'center',
    fontSize: 12, fontWeight: '600', paddingVertical: 8,
  },
  calGrid:    { flexDirection: 'row', flexWrap: 'wrap' },
  calCell:    {
    width: `${100 / 7}%` as any,
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 2,
  },
  monthDayHit: {
    width: MONTH_CELL,
    height: MONTH_CELL,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  monthDayStack: {
    width: MONTH_CELL,
    height: MONTH_CELL,
  },
  monthDayNumCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthDayNum:      { fontSize: 15, fontWeight: '600' },
  monthDayNumToday: { fontSize: 15, fontWeight: '600' },
  monthDayNumFuture: { fontSize: 15, fontWeight: '500', opacity: 0.42 },
  monthDayNumEmpty:  { fontSize: 15, fontWeight: '500' },

  // Completion ring card
  completionCard: {
    borderRadius: 24, paddingVertical: 24, paddingHorizontal: 24,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08, shadowRadius: 40, elevation: 6,
  },
  completionTitle: {
    fontSize: 22, fontWeight: '700', marginBottom: 6, letterSpacing: -0.4,
  },
  completionSub: { fontSize: 17, lineHeight: 22 },
  completionRingWrap: {
    width: 130,
    height: 130,
    flexShrink: 0,
  },
  completionPct: {
    fontSize: 28, fontWeight: '700', letterSpacing: -0.8,
  },
  completionPctFull: {
    fontSize: 22, letterSpacing: -0.5,
  },

  // Breakdown
  breakdownTitle: {
    fontSize: 22, fontWeight: '600',
    marginTop: 16, marginBottom: 12, paddingLeft: 4,
  },
  breakdownCard:  {
    borderRadius: 16,
    overflow: 'hidden', marginBottom: 12,
  },
  breakdownRow:   {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, paddingHorizontal: 16,
  },
  breakdownBorder: { borderBottomWidth: StyleSheet.hairlineWidth },
  breakdownIconWrap: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  breakdownIcon:  { fontSize: 20 },
  breakdownName:  { flex: 1, fontSize: 15, fontWeight: '500' },
  breakdownValue: { fontSize: 15 },

  // Weekly bar chart (shared component; barCard wraps it)
  barCard: {
    borderRadius: 20, padding: 24, marginBottom: 12,
    overflow: 'visible',
    zIndex: 10,
  },

  // Empty state
  emptyCard: {
    borderRadius: 16, padding: 24, alignItems: 'center',
  },
  emptyText: { fontSize: 15, textAlign: 'center' },

  // ── Yearly view ──────────────────────────────────────────────
  yearlySubSeg: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 4,
    marginBottom: 16,
  },
  yearlySubBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
  },
  yearlySubBtnText: { fontSize: 15, fontWeight: '600' },
  yearlySubUnderline: {
    height: 2.5,
    width: 40,
    borderRadius: 2,
    marginTop: 4,
  },

  yearlyCard: {
    borderRadius: 20,
    padding: 12,
    marginBottom: 16,
  },
  yearGridHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  yearGridHeaderText: { fontSize: 9, fontWeight: '700', textAlign: 'center' },
  yearGridRow: { flexDirection: 'row', alignItems: 'center' },
  yearGridRowLabel: { width: 22, alignItems: 'flex-end', paddingRight: 4 },
  yearGridRowLabelText: { fontSize: 9, fontWeight: '600' },
  yearGridCell: {
    flex: 1,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 1.5,
  },
  yearDot: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
  },

  monthCardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  monthCard: {
    width: '47%' as any,
    borderRadius: 16,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  monthCardLabel: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  monthCardDots: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  monthCardDotWrap: {
    width: `${100 / 7}%` as any,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  monthCardDot: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
  },
  monthCardDotEmpty: {
    width: '100%',
    height: '100%',
  },
});
