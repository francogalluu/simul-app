import React, { useEffect, useState } from 'react';
import { View, TextInput, Pressable, ScrollView, StyleSheet, Alert, Share, ActivityIndicator } from 'react-native';
import { Text } from '@/components/AppText';
import { ChevronRight } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Host, Picker, Text as SwiftText, Toggle } from '@expo/ui/swift-ui';
import { labelsHidden, pickerStyle, tag } from '@expo/ui/swift-ui/modifiers';
import { useSettingsStore } from '@/store/settingsStore';
import { useAuthStore } from '@/store/authStore';
import { useHouseholdStore, cleanName, MAX_NAME_LENGTH } from '@/store/householdStore';
import { i18n } from '@/i18n';
import { partnerOf, useMe, usePeople } from '@/lib/people';
import { errorMessage } from '@/lib/errors';
import { haptic } from '@/lib/haptics';
import { S, fonts, cardShadow, SCREEN_PADDING, TAB_BAR_CLEARANCE } from '@/lib/simulTheme';
import { Avatar } from '@/components/Avatar';
import { AvatarPicker, type AvatarValue } from '@/components/AvatarPicker';
import { ColorPicker } from '@/components/ColorPicker';

const formatCode = (code: string | null | undefined) => (code ? `${code.slice(0, 4)}-${code.slice(4)}` : '—');

export default function SettingsScreen() {
  const { t } = useTranslation();
  const {
    hapticFeedback, setHapticFeedback,
    weekStartsOn, setWeekStartsOn,
    language, setLanguage,
  } = useSettingsStore();
  const email = useAuthStore((s) => s.session?.user.email);
  const signOut = useAuthStore((s) => s.signOut);
  const userId = useAuthStore((s) => s.session?.user.id);
  const household = useHouseholdStore((s) => s.household);
  const rename = useHouseholdStore((s) => s.rename);
  const updateProfile = useHouseholdStore((s) => s.updateProfile);
  const regenerateInviteCode = useHouseholdStore((s) => s.regenerateInviteCode);
  const leaveHousehold = useHouseholdStore((s) => s.leaveHousehold);
  const deleteAccount = useHouseholdStore((s) => s.deleteAccount);
  const me = useMe();
  const people = usePeople();
  const myAvatarPath = useHouseholdStore((s) => s.members.find((m) => m.userId === s.userId)?.avatarPath ?? null);
  const partner = people[partnerOf(me)];

  const [nameDraft, setNameDraft] = useState(people[me].name);
  const [busy, setBusy] = useState<null | 'code' | 'leave' | 'delete'>(null);
  useEffect(() => setNameDraft(people[me].name), [people, me]);

  const changeLanguage = (next: 'en' | 'es') => {
    setLanguage(next);
    i18n.changeLanguage(next);
  };

  const saveName = async () => {
    const next = cleanName(nameDraft);
    if (!next || next === people[me].name) {
      setNameDraft(people[me].name);
      return;
    }
    const res = await rename(next);
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

  const shareCode = () => {
    if (!household?.inviteCode) return;
    haptic.tap();
    void Share.share({ message: t('settings.shareMessage', { code: formatCode(household.inviteCode) }) });
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

  return (
    // The title is the native large-title header (see TabNavigator). The ScrollView must be the
    // screen's direct child so the header can collapse as it scrolls and handle the top inset.
    <ScrollView
      style={styles.safe}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
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
        <Row
          label={t('settings.language')}
          right={
            <NativeMenuPicker
              value={language ?? 'en'}
              onChange={changeLanguage}
              options={[
                { value: 'en', label: t('settings.english') },
                { value: 'es', label: t('settings.spanish') },
              ]}
            />
          }
        />
        <Divider />
        <Row
          label={t('settings.hapticFeedback')}
          right={<NativeToggle value={hapticFeedback} onChange={setHapticFeedback} />}
        />
        <Divider />
        <Row
          label={t('settings.weekStartsOn')}
          right={
            <NativeMenuPicker
              value={weekStartsOn}
              onChange={setWeekStartsOn}
              options={[
                { value: 0, label: t('settings.sunday') },
                { value: 1, label: t('settings.monday') },
              ]}
            />
          }
          last
        />
      </View>

      <Text style={styles.sectionLabel}>{t('settings.account')}</Text>
      <View style={styles.card}>
        <Row label={t('settings.email')} value={email ?? '—'} />
        <Divider />
        <Row label={t('settings.signOut')} onPress={confirmSignOut} />
        <Divider />
        <Row label={t('settings.leave')} onPress={busy ? undefined : confirmLeave} danger busy={busy === 'leave'} />
        <Divider />
        <Row label={t('settings.deleteAccount')} onPress={busy ? undefined : confirmDelete} danger busy={busy === 'delete'} last />
      </View>

      <Text style={styles.sectionLabel}>{t('settings.about')}</Text>
      <View style={styles.card}>
        <Row label={t('settings.version')} value="1.0.0" last />
      </View>
    </ScrollView>
  );
}

// ─── Native SwiftUI controls (via @expo/ui) ───────────────────────────────────

function NativeToggle({ value, onChange }: { value: boolean; onChange: (next: boolean) => void }) {
  return (
    <Host matchContents={{ horizontal: true }} style={styles.nativeControl} seedColor={S.accent}>
      <Toggle isOn={value} onIsOnChange={onChange} />
    </Host>
  );
}

function NativeMenuPicker<T extends string | number>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (next: T) => void;
  options: { value: T; label: string }[];
}) {
  // The native picker also reports its initial value when it mounts, which can overwrite a
  // saved setting that hasn't finished loading yet, so only react to real changes.
  return (
    <Host matchContents={{ horizontal: true }} style={styles.nativeControl} seedColor={S.accentDeep}>
      <Picker
        selection={value}
        onSelectionChange={(next: T) => next !== value && onChange(next)}
        modifiers={[pickerStyle('menu'), labelsHidden()]}
      >
        {options.map((o) => (
          <SwiftText key={String(o.value)} modifiers={[tag(o.value)]}>
            {o.label}
          </SwiftText>
        ))}
      </Picker>
    </Host>
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
    paddingBottom: TAB_BAR_CLEARANCE,
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
  // Fixed height so the SwiftUI control is centered in the row like the RN labels are.
  nativeControl: {
    height: 34,
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
