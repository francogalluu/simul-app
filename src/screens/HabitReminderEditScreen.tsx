import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Platform, ScrollView, Modal, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import DateTimePicker from '@react-native-community/datetimepicker';
import { ChevronDown } from 'lucide-react-native';
import type { RootStackParamList } from '@/navigation/types';
import { useTheme } from '@/context/ThemeContext';
import { useHabitStore } from '@/store';

type Route = RouteProp<RootStackParamList, 'HabitReminderEdit'>;
type Nav = NativeStackNavigationProp<RootStackParamList, 'HabitReminderEdit'>;

const WEEKDAY_KEYS = ['weekdaySun', 'weekdayMon', 'weekdayTue', 'weekdayWed', 'weekdayThu', 'weekdayFri', 'weekdaySat'] as const;

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function parseTime(hhmm: string): { h: number; m: number } {
  const [hStr, mStr] = hhmm.split(':');
  const h = Number.parseInt(hStr, 10);
  const m = Number.parseInt(mStr, 10);
  return {
    h: Number.isNaN(h) ? 8 : h,
    m: Number.isNaN(m) ? 0 : m,
  };
}

/** Format day of month as ordinal: 1 → "1st", 2 → "2nd", 31 → "31st". */
function dayOrdinal(day: number): string {
  if (day >= 11 && day <= 13) return `${day}th`;
  const last = day % 10;
  if (last === 1) return `${day}st`;
  if (last === 2) return `${day}nd`;
  if (last === 3) return `${day}rd`;
  return `${day}th`;
}

export default function HabitReminderEditScreen() {
  const { habitId } = useRoute<Route>().params;
  const navigation = useNavigation<Nav>();
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const habits = useHabitStore(s => s.habits);
  const updateHabit = useHabitStore(s => s.updateHabit);

  const habit = habits.find(h => h.id === habitId);
  const reminderTime = habit?.reminderTime ?? '08:00';
  const reminderWeekdays = habit?.reminderWeekdays?.length ? habit.reminderWeekdays : [1];
  const reminderDayOfMonth = habit?.reminderDayOfMonth ?? 1;
  const frequency = habit?.frequency ?? 'daily';
  const [dayPickerVisible, setDayPickerVisible] = useState(false);

  const { h, m } = useMemo(() => parseTime(reminderTime), [reminderTime]);
  const formattedTime = `${h === 0 ? 12 : h > 12 ? h - 12 : h}:${pad(m)} ${h < 12 ? 'AM' : 'PM'}`;
  const timeValue = useMemo(() => {
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d;
  }, [h, m]);

  const setTime = (next: string) => {
    updateHabit(habitId, { reminderTime: next });
  };

  const handleRemoveReminder = () => {
    updateHabit(habitId, { reminderTime: undefined, reminderWeekdays: undefined, reminderDayOfMonth: undefined });
    navigation.goBack();
  };

  const toggleWeekday = (weekday: number) => {
    const has = reminderWeekdays.includes(weekday);
    if (has && reminderWeekdays.length <= 1) return;
    const next = has ? reminderWeekdays.filter(w => w !== weekday) : [...reminderWeekdays, weekday].sort((a, b) => a - b);
    updateHabit(habitId, { reminderWeekdays: next });
  };

  const setDayOfMonth = (day: number) => {
    updateHabit(habitId, { reminderDayOfMonth: Math.min(31, Math.max(1, day)) });
  };

  const handleTimePickerChange = (_event: unknown, date?: Date) => {
    if (!date) return;
    const nextH = date.getHours();
    const nextM = date.getMinutes();
    setTime(`${pad(nextH)}:${pad(nextM)}`);
  };

  const changeTimeByMinutes = (deltaMinutes: number) => {
    const total = (h * 60 + m + deltaMinutes + 24 * 60) % (24 * 60);
    const nextH = Math.floor(total / 60);
    const nextM = total % 60;
    setTime(`${pad(nextH)}:${pad(nextM)}`);
  };

  if (!habit) {
    return (
      <SafeAreaView style={[s.safe, { backgroundColor: colors.bgSecondary }]} edges={['bottom']}>
        <Text style={[s.error, { color: colors.text2 }]}>{t('habitDetail.notFound')}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.bgSecondary }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <Text style={[s.title, { color: colors.text1 }]}>{habit.name}</Text>
        <Text style={[s.subtitle, { color: colors.text2 }]}>{t('notifications.remindMeAt')}</Text>

        <View style={[s.card, { backgroundColor: colors.bgCard }]}>
          {Platform.OS === 'ios' ? (
            <View style={s.iosTimeSection}>
              <Text style={[s.timeValue, { color: colors.text2 }]}>{formattedTime}</Text>
              <View style={s.iosPickerWrap}>
                <DateTimePicker
                  value={timeValue}
                  mode="time"
                  onChange={handleTimePickerChange}
                  display="spinner"
                  minuteInterval={5}
                  themeVariant={isDark ? 'dark' : 'light'}
                  style={s.iosPicker}
                />
              </View>
            </View>
          ) : (
            <View style={[s.row, { borderBottomColor: colors.separator }]}>
              <Text style={[s.timeValue, { color: colors.teal }]}>{formattedTime}</Text>
              <View style={s.timeControls}>
                <Pressable onPress={() => changeTimeByMinutes(-15)} hitSlop={8}>
                  <Text style={[s.stepper, { color: colors.teal }]}>−</Text>
                </Pressable>
                <Pressable onPress={() => changeTimeByMinutes(15)} hitSlop={8}>
                  <Text style={[s.stepper, { color: colors.teal }]}>+</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>

        {frequency === 'weekly' && (
          <View style={s.weekdaySection}>
            <Text style={[s.weekdayLabel, { color: colors.text2 }]}>{t('wizard.reminderDaysLabel')}</Text>
            <View style={[s.weekdayCard, { backgroundColor: colors.bgCard }]}>
              <View style={s.weekdayRow}>
                {WEEKDAY_KEYS.map((key, i) => {
                  const weekday = i + 1;
                  const selected = reminderWeekdays.includes(weekday);
                  return (
                    <Pressable
                      key={weekday}
                      onPress={() => toggleWeekday(weekday)}
                      style={({ pressed }) => [
                        s.weekdayChip,
                        {
                          backgroundColor: selected ? colors.teal : colors.bgSecondary,
                          borderColor: selected ? colors.teal : colors.separator,
                          opacity: pressed ? 0.85 : 1,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          s.weekdayChipText,
                          { color: selected ? colors.white : colors.text2 },
                        ]}
                      >
                        {t(`wizard.${key}`)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>
        )}

        {frequency === 'monthly' && (
          <View style={[s.monthDaySection, { borderColor: colors.separator }]}>
            <Text style={[s.monthDayLabel, { color: colors.text1 }]}>{t('wizard.reminderDayOfMonthLabel')}</Text>
            <Pressable
              onPress={() => setDayPickerVisible(true)}
              style={[s.monthDayDropdown, { backgroundColor: colors.bgCard }]}
            >
              <Text style={[s.monthDayDropdownText, { color: colors.teal }]}>
                {dayOrdinal(reminderDayOfMonth)}
              </Text>
              <ChevronDown size={20} color={colors.text2} strokeWidth={2.5} />
            </Pressable>
            <Modal
              visible={dayPickerVisible}
              transparent
              animationType="fade"
              onRequestClose={() => setDayPickerVisible(false)}
            >
              <Pressable style={s.modalOverlay} onPress={() => setDayPickerVisible(false)}>
                <Pressable style={[s.modalContent, { backgroundColor: colors.bgCard }]} onPress={() => {}}>
                  <View style={[s.modalHeader, { borderBottomColor: colors.separator }]}>
                    <Text style={[s.modalTitle, { color: colors.text1 }]}>
                      {t('wizard.reminderDayOfMonthLabel')}
                    </Text>
                  </View>
                  <FlatList
                    data={Array.from({ length: 31 }, (_, i) => i + 1)}
                    keyExtractor={(d) => String(d)}
                    style={s.dayList}
                    renderItem={({ item: day }) => (
                      <Pressable
                        onPress={() => {
                          setDayOfMonth(day);
                          setDayPickerVisible(false);
                        }}
                        style={[s.dayOption, { borderBottomColor: colors.separator }]}
                      >
                        <Text
                          style={[
                            s.dayOptionText,
                            { color: reminderDayOfMonth === day ? colors.teal : colors.text1 },
                            reminderDayOfMonth === day && s.dayOptionTextSelected,
                          ]}
                        >
                          {dayOrdinal(day)}
                        </Text>
                      </Pressable>
                    )}
                  />
                </Pressable>
              </Pressable>
            </Modal>
          </View>
        )}

        <Pressable
          onPress={handleRemoveReminder}
          style={({ pressed }) => [s.removeBtn, { borderColor: colors.danger }, pressed && { opacity: 0.7 }]}
        >
          <Text style={[s.removeBtnText, { color: colors.danger }]}>{t('habitReminders.removeReminder')}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  content: { paddingHorizontal: 24, paddingTop: 16 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 4 },
  subtitle: { fontSize: 15, marginBottom: 24 },
  error: { fontSize: 16, textAlign: 'center', padding: 24 },
  card: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  timeValue: { fontSize: 16, fontWeight: '600' },
  timeControls: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepper: { fontSize: 20, fontWeight: '600', paddingHorizontal: 4 },
  iosTimeSection: { paddingHorizontal: 16, paddingVertical: 12 },
  iosPickerWrap: {
    marginTop: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  iosPicker: { width: '100%', height: 180 },
  weekdaySection: { marginTop: 24 },
  weekdayLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  weekdayCard: {
    borderRadius: 16,
    padding: 12,
    overflow: 'hidden',
  },
  weekdayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  weekdayChip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 0,
  },
  weekdayChipText: { fontSize: 12, fontWeight: '600' },
  monthDaySection: {
    marginTop: 24,
    padding: 16,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  monthDayLabel: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  monthDayDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  monthDayDropdownText: { fontSize: 17, fontWeight: '600' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    borderRadius: 16,
    maxHeight: '70%',
    overflow: 'hidden',
  },
  modalHeader: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalTitle: { fontSize: 17, fontWeight: '600' },
  dayList: { maxHeight: 320 },
  dayOption: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  dayOptionText: { fontSize: 17 },
  dayOptionTextSelected: { fontWeight: '600' },
  removeBtn: {
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
  },
  removeBtnText: { fontSize: 16, fontWeight: '600' },
});
