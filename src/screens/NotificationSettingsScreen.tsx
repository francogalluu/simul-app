import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  Pressable,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import * as Notifications from 'expo-notifications';
import DateTimePicker from '@react-native-community/datetimepicker';

import { useTheme } from '@/context/ThemeContext';
import { useSettingsStore } from '@/store/settingsStore';
import { scheduleAllNotifications } from '@/lib/notificationScheduler';

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function parseTime(hhmm: string): { h: number; m: number } {
  const [hStr, mStr] = hhmm.split(':');
  const h = Number.parseInt(hStr, 10);
  const m = Number.parseInt(mStr, 10);
  return {
    h: Number.isNaN(h) ? 20 : h,
    m: Number.isNaN(m) ? 0 : m,
  };
}

function formatDisplay(h: number): { h12: string; ampm: string } {
  const ampm = h < 12 ? 'AM' : 'PM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return { h12: String(h12), ampm };
}

export default function NotificationSettingsScreen() {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const {
    notificationsEnabled,
    dailyReminderEnabled,
    dailyReminderTime,
    setNotificationsEnabled,
    setDailyReminderEnabled,
    setDailyReminderTime,
  } = useSettingsStore();

  const [requestingPermission, setRequestingPermission] = useState(false);

  const { h, m } = useMemo(() => parseTime(dailyReminderTime), [dailyReminderTime]);
  const { h12, ampm } = useMemo(() => formatDisplay(h), [h]);
  const formattedTime = `${h12}:${pad(m)} ${ampm}`;
  const timeValue = useMemo(() => {
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d;
  }, [h, m]);

  const ensurePermission = async (): Promise<boolean> => {
    try {
      const existing = await Notifications.getPermissionsAsync();
      let status = existing.status;
      if (status !== 'granted') {
        const requested = await Notifications.requestPermissionsAsync();
        status = requested.status;
      }
      if (status !== 'granted') {
        Alert.alert(
          t('notifications.disabledTitle'),
          t('notifications.disabledMessage'),
        );
        return false;
      }

      // iOS does not require channels; Android does.
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Reminders',
          importance: Notifications.AndroidImportance.DEFAULT,
        });
      }

      return true;
    } catch (error) {
      console.error('[notifications] Permission error', error);
      Alert.alert(t('nav.notifications'), t('notifications.couldNotEnable'));
      return false;
    }
  };

  const handleToggleDaily = async (value: boolean) => {
    if (!value) {
      setDailyReminderEnabled(false);
      await scheduleAllNotifications();
      return;
    }

    if (requestingPermission) return;
    setRequestingPermission(true);
    const ok = await ensurePermission();
    setRequestingPermission(false);

    if (!ok) return;
    if (!notificationsEnabled) setNotificationsEnabled(true);
    setDailyReminderEnabled(true);
    await scheduleAllNotifications();
  };

  const changeTimeByMinutes = async (deltaMinutes: number) => {
    if (!dailyReminderEnabled) return;
    const total = (h * 60 + m + deltaMinutes + 24 * 60) % (24 * 60);
    const nextH = Math.floor(total / 60);
    const nextM = total % 60;
    const next = `${pad(nextH)}:${pad(nextM)}`;
    setDailyReminderTime(next);
    await scheduleAllNotifications();
  };

  const handleTimePickerChange = async (_event: unknown, date?: Date) => {
    if (!dailyReminderEnabled || !date) return;
    const nextH = date.getHours();
    const nextM = date.getMinutes();
    const next = `${pad(nextH)}:${pad(nextM)}`;
    setDailyReminderTime(next);
    await scheduleAllNotifications();
  };

  const decrementTime = () => changeTimeByMinutes(-15);
  const incrementTime = () => changeTimeByMinutes(15);

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.bgSecondary }]} edges={['bottom']}>
      <View style={s.content}>
        <Text style={[s.title, { color: colors.text1 }]}>{t('notifications.dailyReminder')}</Text>
        <Text style={[s.subtitle, { color: colors.text2 }]}>
          {t('notifications.dailyReminderSubtitle')}
        </Text>

        <View style={[s.card, { backgroundColor: colors.bgCard }]}>
          <View style={[s.row, s.rowTopBorder, { borderBottomColor: colors.separator }]}>
            <View style={s.rowText}>
              <Text style={[s.rowLabel, { color: colors.text1 }]}>{t('notifications.getDailyReminders')}</Text>
            </View>
            <Switch
              value={dailyReminderEnabled}
              onValueChange={handleToggleDaily}
              disabled={requestingPermission}
              trackColor={{ false: colors.separatorLight, true: colors.teal }}
              thumbColor={colors.white}
            />
          </View>

          {Platform.OS === 'ios' ? (
            <View style={s.iosTimeSection}>
              <View style={s.rowText}>
                <Text style={[s.rowLabel, { color: colors.text1 }]}>{t('notifications.remindMeAt')}</Text>
                <Text style={[s.timeValue, { color: colors.text2 }]}>{formattedTime}</Text>
              </View>
              <View style={[s.iosPickerWrap, !dailyReminderEnabled && s.timeControlsDisabled]}>
                {dailyReminderEnabled && (
                  <DateTimePicker
                    value={timeValue}
                    mode="time"
                    onChange={handleTimePickerChange}
                    display="spinner"
                    minuteInterval={5}
                    themeVariant={isDark ? 'dark' : 'light'}
                    style={s.iosPicker}
                  />
                )}
              </View>
            </View>
          ) : (
            <View style={s.row}>
              <View style={s.rowText}>
                <Text style={[s.rowLabel, { color: colors.text1 }]}>{t('notifications.remindMeAt')}</Text>
              </View>
              <View style={[s.timeControls, !dailyReminderEnabled && s.timeControlsDisabled]}>
                <Pressable
                  onPress={decrementTime}
                  disabled={!dailyReminderEnabled}
                  hitSlop={8}
                >
                  <Text style={[s.stepper, { color: colors.teal }]}>−</Text>
                </Pressable>
                <Text style={[s.timeValue, { color: colors.teal }]}>{formattedTime}</Text>
                <Pressable
                  onPress={incrementTime}
                  disabled={!dailyReminderEnabled}
                  hitSlop={8}
                >
                  <Text style={[s.stepper, { color: colors.teal }]}>+</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    marginBottom: 24,
  },
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
  },
  rowTopBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowText: {
    flexShrink: 1,
  },
  rowLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  timeControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iosTimeSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  iosPickerWrap: {
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  iosPicker: {
    width: '100%',
    height: 180,
  },
  timeControlsDisabled: {
    opacity: 0.5,
  },
  stepper: {
    fontSize: 20,
    fontWeight: '600',
    paddingHorizontal: 4,
  },
  timeValue: {
    fontSize: 16,
    fontWeight: '600',
  },
});

