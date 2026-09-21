import React, { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { View, TextInput, Pressable, ScrollView, FlatList, StyleSheet, Alert, KeyboardAvoidingView, Platform, useWindowDimensions } from 'react-native';
import { Text } from '@/components/AppText';
import { useKindTranslation } from '@/lib/kind';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NavigationProp, RouteProp } from '@react-navigation/native';
import Animated, {
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  interpolate,
  Extrapolation,
  type SharedValue,
} from 'react-native-reanimated';
import type { RootStackParamList } from '@/navigation/types';
import { useTasksStore } from '@/store/tasksStore';
import { partnerOf, useMe, usePeople } from '@/lib/people';
import { haptic } from '@/lib/haptics';
import { S, fonts, cardShadow, SCREEN_PADDING } from '@/lib/simulTheme';
import { NativeDaySelector, NativeSegmented, NativeToggle, useNativeConfirm } from '@/components/NativeControls';
import { useSettingsStore } from '@/store/settingsStore';
import { getDateLocale } from '@/lib/dates';
import { EVERY_DAY, summarizeDays, toggleDay, weekdayOrder } from '@/lib/weekdays';
import { i18n } from '@/i18n';

type Mode = 'single' | 'shared';

const PRESETS: Array<{ emoji: string; key: string; time: string }> = [
  { emoji: '💧', key: 'drinkWater', time: 'All day' },
  { emoji: '🧘', key: 'meditate', time: 'Morning' },
  { emoji: '🚶', key: 'eveningWalk', time: 'Evening' },
  { emoji: '📖', key: 'read', time: 'Evening' },
  { emoji: '🏋️', key: 'workout', time: 'Morning' },
  { emoji: '🥗', key: 'eatVegetables', time: 'All day' },
  { emoji: '😴', key: 'sleepEarly', time: 'Evening' },
  { emoji: '🙏', key: 'gratitudeJournal', time: 'Evening' },
  { emoji: '🧹', key: 'tidyUp', time: 'Evening' },
  { emoji: '🚭', key: 'noSmoking', time: 'All day' },
  { emoji: '🧴', key: 'skincare', time: 'Evening' },
  { emoji: '🚿', key: 'coldShower', time: 'Morning' },
  { emoji: '🦷', key: 'floss', time: 'Evening' },
  { emoji: '💊', key: 'takeVitamins', time: 'Morning' },
  { emoji: '🏃', key: 'morningRun', time: 'Morning' },
  { emoji: '📵', key: 'noPhoneInBed', time: 'Evening' },
  { emoji: '💰', key: 'budgetCheckIn', time: 'Afternoon' },
  { emoji: '🗣️', key: 'practiceLanguage', time: 'Afternoon' },
  { emoji: '📞', key: 'callFamily', time: 'Afternoon' },
  { emoji: '✍️', key: 'journal', time: 'Evening' },
];

// Narrower than the default so the four header buttons leave room for the title.
const HEADER_ITEM_WIDTH = 34;

const TIMES = ['Morning', 'Afternoon', 'Evening', 'All day'];

// ─── Preset carousel ──────────────────────────────────────────────────────────

const ITEM_WIDTH = 124;
const ITEM_GAP = 12;
const SNAP = ITEM_WIDTH + ITEM_GAP;
const LOOP_COPIES = 40;
const LOOPED = Array.from({ length: PRESETS.length * LOOP_COPIES }, (_, i) => PRESETS[i % PRESETS.length]);
const MIDDLE_START = Math.floor(LOOP_COPIES / 2) * PRESETS.length;

function PresetCard({
  item,
  label,
  index,
  scrollX,
  selected,
  onPress,
}: {
  item: (typeof PRESETS)[number];
  label: string;
  index: number;
  scrollX: SharedValue<number>;
  selected: boolean;
  onPress: () => void;
}) {
  const center = index * SNAP;
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(scrollX.value, [center - SNAP, center, center + SNAP], [0.86, 1, 0.86], Extrapolation.CLAMP) }],
    opacity: interpolate(scrollX.value, [center - SNAP, center, center + SNAP], [0.5, 1, 0.5], Extrapolation.CLAMP),
  }));
  return (
    <Animated.View style={[{ width: ITEM_WIDTH, marginRight: ITEM_GAP }, animatedStyle]}>
      <Pressable onPress={onPress} style={[s.presetCard, selected && s.presetCardSelected]}>
        <View style={[s.presetIconWrap, selected && s.presetIconWrapSelected]}>
          <Text style={s.presetIconEmoji}>{item.emoji}</Text>
        </View>
        <Text style={[s.presetLabel, selected && s.presetLabelSelected]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function AddHabitScreen() {
  const { t } = useKindTranslation();
  const presetLabel = (preset: (typeof PRESETS)[number]) => t(`habit.presets.${preset.key}`);
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'AddHabit'>>();
  const habitId = route.params?.habitId;
  const { width: screenWidth } = useWindowDimensions();

  const me = useMe();
  const partner = usePeople()[partnerOf(me)];
  const partnerName = partner.name;
  const habits = useTasksStore((st) => st.habits);
  const addHabit = useTasksStore((st) => st.addHabit);
  const updateHabit = useTasksStore((st) => st.updateHabit);
  const removeHabit = useTasksStore((st) => st.removeHabit);
  const editing = useMemo(() => habits.find((h) => h.id === habitId), [habits, habitId]);
  const isEdit = Boolean(editing);

  const [mode, setMode] = useState<Mode>(editing?.owner === 'both' ? 'shared' : 'single');
  const [name, setName] = useState(editing?.name ?? '');
  const [icon, setIcon] = useState(editing?.icon ?? '⭐');
  const [requireProof, setRequireProof] = useState(editing?.requireProof ?? false);
  const [days, setDays] = useState(editing?.days ?? EVERY_DAY);
  const weekStartsOn = useSettingsStore((st) => st.weekStartsOn);
  const dayOrder = useMemo(() => weekdayOrder(weekStartsOn), [weekStartsOn]);
  const dayLabels = useMemo(() => {
    const loc = getDateLocale();
    return {
      letters: dayOrder.map((dow) => loc.localize.day(dow as 0 | 1 | 2 | 3 | 4 | 5 | 6, { width: 'narrow' }).toLocaleUpperCase()),
      names: dayOrder.map((dow) => loc.localize.day(dow as 0 | 1 | 2 | 3 | 4 | 5 | 6, { width: 'wide' })),
    };
    // The language can change while the app is open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayOrder, i18n.language]);
  const daysSummary = summarizeDays(days, weekStartsOn);
  const daysCaption =
    daysSummary.kind === 'custom' ? daysSummary.text : t(`habit.repeat.${daysSummary.kind}`);

  const handleToggleDay = (dow: number) => {
    const next = toggleDay(days, dow);
    // A habit has to repeat on at least one day.
    if (next === 0) { haptic.warning(); return; }
    haptic.tap();
    setDays(next);
  };
  // The icon page hands its pick back through this screen's route params.
  const pickedIcon = route.params?.icon;
  useEffect(() => {
    if (pickedIcon) setIcon(pickedIcon);
  }, [pickedIcon]);
  const [timeChoice, setTimeChoice] = useState<string>(() => {
    const saved = editing?.time ?? 'All day';
    return TIMES.includes(saved) ? saved : 'All day';
  });

  const scrollX = useSharedValue(MIDDLE_START * SNAP);
  const carouselRef = React.useRef<FlatList>(null);
  const onCarouselScroll = useAnimatedScrollHandler({ onScroll: (e) => { scrollX.value = e.contentOffset.x; } });
  useEffect(() => {
    carouselRef.current?.scrollToOffset({ offset: MIDDLE_START * SNAP, animated: false });
  }, []);

  const time = timeChoice;
  const canSubmit = name.trim().length > 0;

  const handlePreset = (preset: (typeof PRESETS)[number], index: number) => {
    haptic.tap();
    setName(presetLabel(preset));
    setIcon(preset.emoji);
    setTimeChoice(preset.time);
    carouselRef.current?.scrollToOffset({ offset: index * SNAP, animated: true });
  };

  const close = () => navigation.goBack();

  const handleSubmit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;

    if (isEdit && editing) {
      updateHabit(editing.id, { name: trimmed, icon, time, requireProof, days });
      haptic.success();
      close();
      return;
    }

    if (mode === 'shared') {
      addHabit({ name: trimmed, time, icon, owner: 'both', requireProof, days });
      haptic.success();
      Alert.alert(
        t('habit.inviteSent'),
        partner.joined
          ? t('habit.inviteSentJoined', { name: partnerName, habit: trimmed })
          : t('habit.inviteSentWaiting', { habit: trimmed }),
        [{ text: t('common.ok'), onPress: close }],
      );
      return;
    }

    addHabit({ name: trimmed, time, icon, owner: 'me', requireProof, days });
    haptic.success();
    close();
  };

  const isPendingInvite = editing?.status === 'pending';
  const { confirm, dialog } = useNativeConfirm({ top: 4, right: 96 });
  const handleDelete = () => {
    if (!editing) return;
    confirm({
      title: isPendingInvite ? t('habit.cancelInviteTitle') : t('habit.deleteTitle'),
      message: isPendingInvite
        ? t('habit.cancelInviteBody', { name: partnerName, habit: editing.name })
        : editing.owner === 'both'
          ? t('habit.deleteBodyShared', { habit: editing.name, name: partnerName })
          : t('habit.deleteBody', { habit: editing.name }),
      confirmLabel: isPendingInvite ? t('habit.cancelInvite') : t('common.delete'),
      cancelLabel: t('habit.keep'),
      onConfirm: () => { haptic.warning(); removeHabit(editing.id); close(); },
    });
  };

  // Only the owner can change a habit; both people can change a shared one (the server enforces this too).
  const canManage = !editing || editing.owner === 'both' || editing.owner === me;
  useEffect(() => {
    if (!canManage) navigation.goBack();
  }, [canManage, navigation]);

  // Native buttons in the header, top right: a tick to save (or add / invite), and a trash to
  // delete when editing.
  useLayoutEffect(() => {
    navigation.setOptions({
      unstable_headerRightItems: () => [
        ...(isEdit && editing
          ? [
              ...(editing.requireProof
                ? [
                    {
                      type: 'button' as const,
                width: HEADER_ITEM_WIDTH,
                      label: t('proofs.title'),
                      icon: { type: 'sfSymbol' as const, name: 'photo.on.rectangle' as const },
                      onPress: () => navigation.navigate('HabitProofs', { habitId: editing.id }),
                    },
                  ]
                : []),
              {
                type: 'button' as const,
                width: HEADER_ITEM_WIDTH,
                label: t('stats.title'),
                icon: { type: 'sfSymbol' as const, name: 'chart.bar.xaxis' as const },
                onPress: () => navigation.navigate('HabitStats', { habitId: editing.id }),
              },
              {
                type: 'button' as const,
                width: HEADER_ITEM_WIDTH,
                label: isPendingInvite ? t('habit.cancelInvite') : t('habit.deleteHabit'),
                icon: { type: 'sfSymbol' as const, name: 'trash' as const },
                tintColor: S.danger,
                onPress: handleDelete,
              },
            ]
          : []),
        {
          type: 'button' as const,
                width: HEADER_ITEM_WIDTH,
          label: isEdit ? t('habit.save') : mode === 'shared' ? t('habit.invite', { name: partnerName }) : t('habit.add'),
          icon: { type: 'sfSymbol' as const, name: 'checkmark' as const },
          // Plain (not prominent) so it sits inside the same glass capsule as stats and trash.
          variant: 'plain' as const,
          tintColor: S.accentDeep,
          disabled: !canSubmit,
          onPress: handleSubmit,
        },
      ],
    });
    // handleDelete/handleSubmit only depend on the values listed here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation, isEdit, isPendingInvite, canSubmit, mode, name, icon, timeChoice, requireProof, days, editing?.id, editing?.requireProof]);

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {/* Who (new habits only: the owner of an existing habit can't change) */}
          {!isEdit && (
            <>
              <Text style={s.sectionLabel}>{t('habit.who')}</Text>
              <NativeSegmented
                value={mode}
                onChange={(next: Mode) => { haptic.tap(); setMode(next); }}
                options={[
                  { value: 'single', label: t('habit.justMe') },
                  { value: 'shared', label: t('habit.withPartner', { name: partnerName }) },
                ]}
              />
            </>
          )}

          {/* Quick pick (new habits only) */}
          {!isEdit && (
            <>
              <Text style={s.sectionLabel}>{t('habit.quickPick')}</Text>
              <View style={s.carouselBleed}>
                <Animated.FlatList
                  ref={carouselRef}
                  data={LOOPED}
                  horizontal
                  keyExtractor={(item, index) => `${item.key}-${index}`}
                  showsHorizontalScrollIndicator={false}
                  snapToInterval={SNAP}
                  decelerationRate="fast"
                  disableIntervalMomentum
                  onScroll={onCarouselScroll}
                  scrollEventThrottle={16}
                  initialScrollIndex={MIDDLE_START}
                  getItemLayout={(_, index) => ({ length: SNAP, offset: SNAP * index, index })}
                  contentContainerStyle={{ paddingHorizontal: Math.max((screenWidth - ITEM_WIDTH) / 2, SCREEN_PADDING) }}
                  renderItem={({ item, index }) => (
                    <PresetCard item={item} label={presetLabel(item)} index={index} scrollX={scrollX} selected={name === presetLabel(item)} onPress={() => handlePreset(item, index)} />
                  )}
                />
              </View>
            </>
          )}

          {/* Details */}
          {!isEdit && <Text style={s.sectionLabel}>{t('habit.details')}</Text>}
          <View style={s.card}>
            <Text style={s.fieldLabel}>{t('habit.when')}</Text>
            <View style={{ marginTop: -2 }}>
              <NativeSegmented
                value={timeChoice}
                onChange={(next: string) => { haptic.tap(); setTimeChoice(next); }}
                options={TIMES.map((time) => ({ value: time, label: t(`times.${time}`) }))}
              />
            </View>

            <View style={[s.repeatHeader, { marginTop: 18 }]}>
              <Text style={s.fieldLabelInline}>{t('habit.repeat.title')}</Text>
              <Text style={s.repeatCaption}>{daysCaption}</Text>
            </View>
            <NativeDaySelector
              days={days}
              order={dayOrder}
              labels={dayLabels.letters}
              names={dayLabels.names}
              onToggle={handleToggleDay}
            />

            <Text style={[s.fieldLabel, { marginTop: 18 }]}>{t('habit.name')}</Text>
            <View style={s.nameRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('habit.pickIcon')}
                onPress={() => { haptic.tap(); navigation.navigate('IconPicker', { current: icon }); }}
                style={({ pressed }) => [s.nameIcon, pressed && { opacity: 0.7 }]}
              >
                <Text style={s.nameIconText}>{icon}</Text>
                <View style={s.nameIconBadge}>
                  <Text style={s.nameIconBadgeText}>✎</Text>
                </View>
              </Pressable>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder={t('habit.namePlaceholder')}
                placeholderTextColor={S.muted}
                style={[s.input, { flex: 1 }]}
                returnKeyType="done"
                maxLength={40}
              />
            </View>

            <View style={s.proofRow}>
              <View style={s.proofText}>
                <Text style={s.proofTitle}>{t('habit.proof.title')}</Text>
                <Text style={s.proofHint}>
                  {partner.joined || requireProof ? t('habit.proof.hint', { name: partnerName }) : t('habit.proof.needsPartner')}
                </Text>
              </View>
              <NativeToggle
                value={requireProof}
                onChange={(next) => { haptic.tap(); setRequireProof(next); }}
                disabled={!partner.joined && !requireProof}
              />
            </View>
          </View>
        </ScrollView>
        {dialog}

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: S.bg,
  },
  scroll: {
    paddingHorizontal: SCREEN_PADDING,
    paddingBottom: 12,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: S.tertiary,
    marginTop: 20,
    marginBottom: 10,
  },
  carouselBleed: {
    marginHorizontal: -SCREEN_PADDING,
  },
  presetCard: {
    height: 98,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: S.card,
    borderRadius: 18,
    paddingHorizontal: 8,
    ...cardShadow,
  },
  presetCardSelected: {
    backgroundColor: S.accent,
  },
  presetIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: S.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetIconWrapSelected: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  presetIconEmoji: {
    fontSize: 23,
  },
  presetLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: S.ink900,
    textAlign: 'center',
  },
  presetLabelSelected: {
    color: '#FFFFFF',
  },
  card: {
    backgroundColor: S.card,
    borderRadius: 20,
    padding: 18,
    ...cardShadow,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: S.ink700,
    marginBottom: 8,
  },
  repeatHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  fieldLabelInline: {
    fontSize: 13,
    fontWeight: '700',
    color: S.ink700,
  },
  repeatCaption: {
    fontSize: 13,
    color: S.tertiary,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  nameIconBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: S.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: S.card,
  },
  nameIconBadgeText: { fontSize: 10, color: '#FFFFFF', fontWeight: '800' },
  proofRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 18,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: S.line,
  },
  proofText: { flex: 1, minWidth: 0, gap: 2 },
  proofTitle: { fontSize: 15, fontWeight: '700', color: S.ink900 },
  proofHint: { fontSize: 12, lineHeight: 16, color: S.tertiary },
  nameIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: S.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameIconText: {
    fontSize: 22,
  },
  input: {
    backgroundColor: S.bg,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: S.ink900,
  },
});
