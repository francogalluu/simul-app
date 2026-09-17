import React, { useEffect, useState } from 'react';
import { View, TextInput, Switch, Pressable, ScrollView, StyleSheet, Alert, Share, ActivityIndicator, Platform, Linking } from 'react-native';
import { Text } from '@/components/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronRight } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '@/store/settingsStore';
import { useAuthStore } from '@/store/authStore';
import { useHouseholdStore, cleanName, cleanDuoName, MAX_NAME_LENGTH, MAX_DUO_NAME_LENGTH } from '@/store/householdStore';
import { i18n } from '@/i18n';
import { partnerOf, useMe, usePeople } from '@/lib/people';
import { errorMessage } from '@/lib/errors';
import { haptic } from '@/lib/haptics';
import { getDateLocale, toLocalDateString, today } from '@/lib/dates';
import { notificationsUnsupported, requestNotificationPermission } from '@/lib/notifications';
import { useTabBarInset } from '@/navigation/CustomTabBar';
import { S, fonts, cardShadow, SCREEN_PADDING } from '@/lib/simulTheme';
import { Avatar } from '@/components/Avatar';
import { AvatarPicker, type AvatarValue } from '@/components/AvatarPicker';
import { ColorPicker } from '@/components/ColorPicker';

const formatCode = (code: string | null | undefined) => (code ? `${code.slice(0, 4)}-${code.slice(4)}` : '—');

export default function SettingsScreen() {
  const { t } = useTranslation();
  const tabInset = useTabBarInset();
  const {
    hapticFeedback, setHapticFeedback,
    weekStartsOn, setWeekStartsOn,
    language, setLanguage,
    notificationsPermission, setNotificationsPermission,
  } = useSettingsStore();
  const email = useAuthStore((s) => s.session?.user.email);
  const signOut = useAuthStore((s) => s.signOut);
  const userId = useAuthStore((s) => s.session?.user.id);
  const household = useHouseholdStore((s) => s.household);
  const rename = useHouseholdStore((s) => s.rename);
  const updateProfile = useHouseholdStore((s) => s.updateProfile);
  const setAnniversary = useHouseholdStore((s) => s.setAnniversary);
  const setDuoName = useHouseholdStore((s) => s.setDuoName);
  const regenerateInviteCode = useHouseholdStore((s) => s.regenerateInviteCode);
  const leaveHousehold = useHouseholdStore((s) => s.leaveHousehold);
  const deleteAccount = useHouseholdStore((s) => s.deleteAccount);
  const me = useMe();
  const people = usePeople();
  const myAvatarPath = useHouseholdStore((s) => s.members.find((m) => m.userId === s.userId)?.avatarPath ?? null);
  const partner = people[partnerOf(me)];

  const [nameDraft, setNameDraft] = useState(people[me].name);
  const [duoNameDraft, setDuoNameDraft] = useState(household?.duoName ?? '');
  const [busy, setBusy] = useState<null | 'code' | 'leave' | 'delete'>(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  useEffect(() => setNameDraft(people[me].name), [people, me]);
  useEffect(() => setDuoNameDraft(household?.duoName ?? ''), [household?.duoName]);

  const pickWeekStart = () =>
    Alert.alert(t('alerts.weekStartsOn'), undefined, [
      { text: t('settings.sunday'), onPress: () => setWeekStartsOn(0) },
      { text: t('settings.monday'), onPress: () => setWeekStartsOn(1) },
      { text: t('common.cancel'), style: 'cancel' },
    ]);

  const pickLanguage = () =>
    Alert.alert(t('settings.language'), undefined, [
      { text: t('settings.english'), onPress: () => { setLanguage('en'); i18n.changeLanguage('en'); } },
      { text: t('settings.spanish'), onPress: () => { setLanguage('es'); i18n.changeLanguage('es'); } },
      { text: t('common.cancel'), style: 'cancel' },
    ]);

  const saveName = async () => {
    const next = cleanName(nameDraft);
    if (!next || next === people[me].name) {
      setNameDraft(people[me].name);
      return;
    }
    const res = await rename(next);
    if (res.error) Alert.alert(t('errors.syncTitle'), errorMessage(res.error));
  };

  const saveDuoName = async () => {
    const next = cleanDuoName(duoNameDraft);
    if (next === (household?.duoName ?? null)) return;
    const res = await setDuoName(next);
    if (res.error) Alert.alert(t('errors.syncTitle'), errorMessage(res.error));
  };

  const changeAvatar = async (next: AvatarValue) => {
    const res = await updateProfile({ avatarPath: next.path });
    if (res.error) Alert.alert(t('errors.syncTitle'), errorMessage(res.error));
  };

  const changeColor = async (color: string) => {
    const res = await updateProfile({ color });
    if (res.error) Alert.alert(t('errors.syncTitle'), errorMessage(res.error));
  };

  const changeAnniversary = async (date: string | null) => {
    haptic.tap();
    const res = await setAnniversary(date);
    if (res.error) Alert.alert(t('errors.syncTitle'), errorMessage(res.error));
  };

  const shareCode = () => {
    if (!household?.inviteCode) return;
    haptic.tap();
    void Share.share({ message: t('settings.shareMessage', { code: formatCode(household.inviteCode) }) });
  };

  const remindersRow = async () => {
    if (notificationsUnsupported) return;
    if (notificationsPermission === 'granted') {
      Alert.alert(t('settings.reminders'), t('settings.remindersHint'));
      return;
    }
    const result = await requestNotificationPermission();
    setNotificationsPermission(result);
    if (result === 'denied') {
      Alert.alert(t('settings.reminders'), t('settings.notificationsDenied'), [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('onboarding.openSettings'), onPress: () => void Linking.openSettings() },
      ]);
    }
  };

  // Destructive actions show errors inline via Alert and keep the button busy while running.
  const runAction = async (kind: 'code' | 'leave' | 'delete', action: () => Promise<{ error?: string }>) => {
    setBusy(kind);
    const res = await action();
    setBusy(null);
    if (res.error) Alert.alert(t('errors.syncTitle'), errorMessage(res.error));
    else haptic.success();
  };

  const confirmNewCode = () =>
    Alert.alert(t('settings.newCodeTitle'), t('settings.newCodeMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('settings.newCode'), onPress: () => runAction('code', regenerateInviteCode) },
    ]);

  const confirmSignOut = () =>
    Alert.alert(t('settings.signOut'), t('settings.signOutMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('settings.signOut'), style: 'destructive', onPress: () => { haptic.warning(); void signOut(); } },
    ]);

  const confirmLeave = () =>
    Alert.alert(t('settings.leave'), t('settings.leaveMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('settings.leave'), style: 'destructive', onPress: () => runAction('leave', leaveHousehold) },
    ]);

  const confirmDelete = () =>
    Alert.alert(t('settings.deleteAccount'), t('settings.deleteAccountMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: () => runAction('delete', deleteAccount) },
    ]);

  const anniversary = household?.anniversary ?? null;
  const anniversaryLabel = anniversary
    ? format(new Date(anniversary + 'T00:00:00'), 'd MMM yyyy', { locale: getDateLocale() })
    : t('settings.anniversaryNotSet');
  const remindersValue = notificationsUnsupported
    ? t('settings.remindersUnsupported')
    : notificationsPermission === 'granted'
      ? t('settings.remindersOn')
      : t('settings.remindersOff');

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: tabInset }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>{t('settings.title')}</Text>

        <Text style={styles.sectionLabel}>{t('settings.profile')}</Text>
        <View style={[styles.card, styles.profileCard]}>
          {userId && (
            <AvatarPicker
              userId={userId}
              value={{ path: myAvatarPath, url: people[me].avatarUrl }}
              color={people[me].color}
              initial={people[me].initial}
              size={72}
              onChange={changeAvatar}
            />
          )}
          <ColorPicker value={people[me].color} onChange={changeColor} />
        </View>

        <Text style={styles.sectionLabel}>{t('settings.household')}</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.personLeft}>
              <Avatar person={me} size={34} />
              <Text style={styles.rowLabel}>{t('settings.yourName')}</Text>
            </View>
            <TextInput
              value={nameDraft}
              onChangeText={setNameDraft}
              onEndEditing={saveName}
              onSubmitEditing={saveName}
              maxLength={MAX_NAME_LENGTH}
              returnKeyType="done"
              style={styles.nameInput}
              accessibilityLabel={t('settings.yourName')}
            />
          </View>
          <Divider />
          <View style={styles.row}>
            <View style={styles.personLeft}>
              <Avatar person={partnerOf(me)} size={34} />
              <Text style={styles.rowLabel}>{t('settings.partner')}</Text>
            </View>
            <Text style={styles.rowValue}>{partner.joined ? partner.name : t('settings.partnerNotJoined')}</Text>
          </View>
          <Divider />
          <View style={styles.row}>
            <Text style={styles.rowLabel}>{t('settings.duoName')}</Text>
            <TextInput
              value={duoNameDraft}
              onChangeText={setDuoNameDraft}
              onEndEditing={saveDuoName}
              onSubmitEditing={saveDuoName}
              placeholder={`${people.A.name} & ${people.S.name}`}
              placeholderTextColor={S.muted}
              maxLength={MAX_DUO_NAME_LENGTH}
              returnKeyType="done"
              style={styles.nameInput}
              accessibilityLabel={t('settings.duoName')}
            />
          </View>
          <Divider />
          <Row label={t('settings.anniversary')} value={anniversaryLabel} onPress={() => { haptic.tap(); setDatePickerOpen((v) => !v); }} />
          {datePickerOpen && (
            <View style={styles.datePickerBlock}>
              <DateTimePicker
                value={new Date((anniversary ?? today()) + 'T00:00:00')}
                mode="date"
                maximumDate={new Date()}
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(event, date) => {
                  if (Platform.OS !== 'ios') setDatePickerOpen(false);
                  if (event.type === 'dismissed' || !date) return;
                  void changeAnniversary(toLocalDateString(date));
                }}
              />
              <Text style={styles.hint}>{t('settings.anniversaryHint')}</Text>
              <View style={styles.inviteActions}>
                {anniversary && (
                  <Pressable onPress={() => { void changeAnniversary(null); setDatePickerOpen(false); }} style={({ pressed }) => [styles.pillButton, pressed && { opacity: 0.8 }]}>
                    <Text style={[styles.pillText, { color: S.danger }]}>{t('settings.clearDate')}</Text>
                  </Pressable>
                )}
                <Pressable onPress={() => setDatePickerOpen(false)} style={({ pressed }) => [styles.pillButton, styles.pillPrimary, pressed && { opacity: 0.8 }]}>
                  <Text style={[styles.pillText, { color: '#FFFFFF' }]}>{t('common.done')}</Text>
                </Pressable>
              </View>
            </View>
          )}

          {!partner.joined && (
            <>
              <Divider />
              <View style={styles.inviteBlock}>
                <Text style={styles.rowLabel}>{t('settings.inviteCode')}</Text>
                <Text selectable style={styles.code}>{formatCode(household?.inviteCode)}</Text>
                <Text style={styles.hint}>{t('settings.codeHint')}</Text>
                <View style={styles.inviteActions}>
                  <Pressable onPress={shareCode} style={({ pressed }) => [styles.pillButton, styles.pillPrimary, pressed && { opacity: 0.8 }]}>
                    <Text style={[styles.pillText, { color: '#FFFFFF' }]}>{t('settings.shareCode')}</Text>
                  </Pressable>
                  <Pressable onPress={confirmNewCode} disabled={busy != null} style={({ pressed }) => [styles.pillButton, pressed && { opacity: 0.8 }]}>
                    {busy === 'code' ? <ActivityIndicator color={S.accentDeep} /> : <Text style={styles.pillText}>{t('settings.newCode')}</Text>}
                  </Pressable>
                </View>
              </View>
            </>
          )}
        </View>

        <Text style={styles.sectionLabel}>{t('settings.preferences')}</Text>
        <View style={styles.card}>
          <Row label={t('settings.language')} value={language === 'es' ? t('settings.spanish') : t('settings.english')} onPress={pickLanguage} />
          <Divider />
          <Row label={t('settings.reminders')} value={remindersValue} onPress={notificationsUnsupported ? undefined : remindersRow} />
          <Divider />
          <Row
            label={t('settings.hapticFeedback')}
            right={
              <Switch
                value={hapticFeedback}
                onValueChange={setHapticFeedback}
                trackColor={{ false: S.line, true: S.accent }}
                thumbColor="#FFFFFF"
              />
            }
          />
          <Divider />
          <Row label={t('settings.weekStartsOn')} value={weekStartsOn === 0 ? t('settings.sunday') : t('settings.monday')} onPress={pickWeekStart} last />
        </View>

        <Text style={styles.sectionLabel}>{t('settings.account')}</Text>
        <View style={styles.card}>
          <Row label={t('settings.email')} value={email ?? '—'} />
          <Divider />
          <Row label={t('settings.signOut')} onPress={confirmSignOut} last />
        </View>

        <Text style={styles.sectionLabel}>{t('settings.about')}</Text>
        <View style={styles.card}>
          <Row label={t('settings.version')} value="1.0.0" last />
        </View>

        {/* Destructive actions live apart from everyday settings, at the very
            end and visibly quieter, so their weight on screen matches their stakes. */}
        <Text style={[styles.sectionLabel, { color: S.danger, marginTop: 34 }]}>{t('settings.dangerZone')}</Text>
        <Text style={styles.dangerHint}>{t('settings.dangerZoneHint')}</Text>
        <View style={styles.dangerCard}>
          <Row label={t('settings.leave')} onPress={busy ? undefined : confirmLeave} danger busy={busy === 'leave'} />
          <Divider />
          <Row label={t('settings.deleteAccount')} onPress={busy ? undefined : confirmDelete} danger busy={busy === 'delete'} last />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({
  label,
  value,
  right,
  onPress,
  danger,
  busy,
  last,
}: {
  label: string;
  value?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  danger?: boolean;
  busy?: boolean;
  last?: boolean;
}) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => [styles.row, pressed && onPress && { opacity: 0.6 }]}>
      <Text style={[styles.rowLabel, danger && { color: S.danger }]}>{label}</Text>
      <View style={styles.rowRight}>
        {value ? <Text style={styles.rowValue} numberOfLines={1}>{value}</Text> : null}
        {right ?? null}
        {busy ? <ActivityIndicator color={S.muted} /> : onPress && !right ? <ChevronRight size={18} color={S.muted} strokeWidth={2.4} /> : null}
      </View>
    </Pressable>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: S.bg,
  },
  scroll: {
    paddingHorizontal: SCREEN_PADDING,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 30,
    color: S.ink900,
    marginTop: 14,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: S.tertiary,
    marginTop: 22,
    marginBottom: 10,
  },
  card: {
    backgroundColor: S.card,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 4,
    ...cardShadow,
  },
  dangerCard: {
    backgroundColor: 'transparent',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: S.dangerSoft,
  },
  dangerHint: {
    fontSize: 12,
    color: S.tertiary,
    marginTop: -6,
    marginBottom: 10,
  },
  profileCard: {
    paddingVertical: 20,
    alignItems: 'center',
    gap: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    gap: 12,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: S.ink900,
    flexShrink: 1,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  rowValue: {
    fontSize: 14,
    color: S.tertiary,
    flexShrink: 1,
  },
  divider: {
    height: 1,
    backgroundColor: S.lineSoft,
  },
  personLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  nameInput: {
    flex: 1,
    textAlign: 'right',
    fontSize: 15,
    color: S.ink700,
    paddingVertical: 4,
  },
  datePickerBlock: {
    paddingBottom: 14,
    gap: 8,
    alignItems: 'center',
  },
  inviteBlock: {
    paddingVertical: 14,
    gap: 8,
  },
  code: {
    fontFamily: fonts.bold,
    fontSize: 30,
    letterSpacing: 3,
    color: S.ink900,
    textAlign: 'center',
    marginVertical: 4,
  },
  hint: {
    fontSize: 12,
    lineHeight: 17,
    color: S.tertiary,
    textAlign: 'center',
  },
  inviteActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
    alignSelf: 'stretch',
  },
  pillButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: S.bg,
  },
  pillPrimary: {
    backgroundColor: S.accent,
  },
  pillText: {
    fontSize: 14,
    fontWeight: '700',
    color: S.accentDeep,
  },
});
