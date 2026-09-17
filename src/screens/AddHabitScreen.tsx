import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NavigationProp, RouteProp } from '@react-navigation/native';
import Svg, { Path } from 'react-native-svg';
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
import { ScreenHeader } from '@/components/ScreenHeader';

type Mode = 'single' | 'shared';

const PRESETS: Array<{ emoji: string; label: string; time: string }> = [
  { emoji: '💧', label: 'Drink water', time: 'All day' },
  { emoji: '🧘', label: 'Meditate', time: 'Morning' },
  { emoji: '🚶', label: 'Evening walk', time: 'Evening' },
  { emoji: '📖', label: 'Read', time: 'Evening' },
  { emoji: '🏋️', label: 'Workout', time: 'Morning' },
  { emoji: '🥗', label: 'Eat vegetables', time: 'All day' },
  { emoji: '😴', label: 'Sleep early', time: 'Evening' },
  { emoji: '🙏', label: 'Gratitude journal', time: 'Evening' },
  { emoji: '🧹', label: 'Tidy up', time: 'Evening' },
  { emoji: '🚭', label: 'No smoking', time: 'All day' },
  { emoji: '🧴', label: 'Skincare', time: 'Evening' },
  { emoji: '🚿', label: 'Cold shower', time: 'Morning' },
  { emoji: '🦷', label: 'Floss', time: 'Evening' },
  { emoji: '💊', label: 'Take vitamins', time: 'Morning' },
  { emoji: '🏃', label: 'Morning run', time: 'Morning' },
  { emoji: '📵', label: 'No phone in bed', time: 'Evening' },
  { emoji: '💰', label: 'Budget check-in', time: 'Afternoon' },
  { emoji: '🗣️', label: 'Practice language', time: 'Afternoon' },
  { emoji: '📞', label: 'Call family', time: 'Afternoon' },
  { emoji: '✍️', label: 'Journal', time: 'Evening' },
];

const ICONS = ['⭐', '💧', '🧘', '🚶', '📖', '🏋️', '🥗', '😴', '🙏', '🧹', '🚭', '🧴', '🚿', '🦷', '💊', '🏃', '📵', '💰', '🗣️', '📞', '✍️', '🍳', '🎸', '🧠', '☀️', '🌙', '🐶', '💻', '🎨', '🧺'];

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
  index,
  scrollX,
  selected,
  onPress,
}: {
  item: (typeof PRESETS)[number];
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
        <Text style={[s.presetLabel, selected && s.presetLabelSelected]} numberOfLines={2}>{item.label}</Text>
      </Pressable>
    </Animated.View>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function PersonIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <Path d="M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
    </Svg>
  );
}

function PeopleIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <Path d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
      <Path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <Path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </Svg>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function AddHabitScreen() {
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
  const [timeChoice, setTimeChoice] = useState<string>(() => {
    const t = editing?.time ?? 'All day';
    return TIMES.includes(t) ? t : 'All day';
  });

  const scrollX = useSharedValue(MIDDLE_START * SNAP);
  const carouselRef = React.useRef<{ scrollToOffset: (p: { offset: number; animated?: boolean }) => void }>(null);
  const onCarouselScroll = useAnimatedScrollHandler({ onScroll: (e) => { scrollX.value = e.contentOffset.x; } });
  useEffect(() => {
    carouselRef.current?.scrollToOffset({ offset: MIDDLE_START * SNAP, animated: false });
  }, []);

  const time = timeChoice;
  const canSubmit = name.trim().length > 0;

  const handlePreset = (preset: (typeof PRESETS)[number], index: number) => {
    haptic.tap();
    setName(preset.label);
    setIcon(preset.emoji);
    setTimeChoice(preset.time);
    carouselRef.current?.scrollToOffset({ offset: index * SNAP, animated: true });
  };

  const close = () => navigation.goBack();

  const handleSubmit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;

    if (isEdit && editing) {
      updateHabit(editing.id, { name: trimmed, icon, time });
      haptic.success();
      close();
      return;
    }

    if (mode === 'shared') {
      addHabit({ name: trimmed, time, icon, owner: 'both' });
      haptic.success();
      Alert.alert(
        'Invite sent 💌',
        partner.joined
          ? `${partnerName} will find "${trimmed}" in their mailbox. It shows as pending on your Home until they accept.`
          : `"${trimmed}" will be waiting in your partner's mailbox as soon as they join with your invite code (Settings → Household).`,
        [{ text: 'OK', onPress: close }],
      );
      return;
    }

    addHabit({ name: trimmed, time, icon, owner: 'me' });
    haptic.success();
    close();
  };

  const handleDelete = () => {
    if (!editing) return;
    Alert.alert('Delete habit?', `"${editing.name}" and its history will be removed.`, [
      { text: 'Keep', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { haptic.warning(); removeHabit(editing.id); close(); } },
    ]);
  };

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScreenHeader title={isEdit ? 'Edit Habit' : 'New Habit'} variant="close" />

        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {/* Who */}
          <Text style={s.sectionLabel}>Who is this for</Text>
          {isEdit ? (
            <View style={s.staticWho}>
              {mode === 'shared' ? <PeopleIcon color={S.ink900} /> : <PersonIcon color={S.ink900} />}
              <Text style={s.staticWhoText}>{mode === 'shared' ? `Together with ${partnerName}` : 'Just you'}</Text>
              <Text style={s.staticWhoHint}>Can't be changed</Text>
            </View>
          ) : (
            <View style={s.modeRow}>
              <Pressable onPress={() => { haptic.tap(); setMode('single'); }} style={[s.modeOption, mode === 'single' && s.modeOptionActive]}>
                <PersonIcon color={mode === 'single' ? '#FFFFFF' : S.ink900} />
                <Text style={[s.modeLabel, mode === 'single' && s.modeLabelActive]}>Just me</Text>
              </Pressable>
              <Pressable onPress={() => { haptic.tap(); setMode('shared'); }} style={[s.modeOption, mode === 'shared' && s.modeOptionActive]}>
                <PeopleIcon color={mode === 'shared' ? '#FFFFFF' : S.ink900} />
                <Text style={[s.modeLabel, mode === 'shared' && s.modeLabelActive]}>With {partnerName}</Text>
              </Pressable>
            </View>
          )}

          {/* Quick pick */}
          <Text style={s.sectionLabel}>Quick pick</Text>
          <View style={s.carouselBleed}>
            <Animated.FlatList
              ref={carouselRef}
              data={LOOPED}
              horizontal
              keyExtractor={(item, index) => `${item.label}-${index}`}
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
                <PresetCard item={item} index={index} scrollX={scrollX} selected={name === item.label} onPress={() => handlePreset(item, index)} />
              )}
            />
          </View>

          {/* Details */}
          <Text style={s.sectionLabel}>Details</Text>
          <View style={s.card}>
            <Text style={s.fieldLabel}>Name</Text>
            <View style={s.nameRow}>
              <View style={s.nameIcon}>
                <Text style={s.nameIconText}>{icon}</Text>
              </View>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="e.g. Morning stretch"
                placeholderTextColor={S.muted}
                style={[s.input, { flex: 1 }]}
                returnKeyType="done"
                maxLength={40}
              />
            </View>

            <Text style={[s.fieldLabel, { marginTop: 18 }]}>Icon</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.iconRow} keyboardShouldPersistTaps="handled">
              {ICONS.map((emoji) => {
                const selected = emoji === icon;
                return (
                  <Pressable key={emoji} onPress={() => { haptic.tap(); setIcon(emoji); }} style={[s.iconChip, selected && s.iconChipSelected]}>
                    <Text style={s.iconChipText}>{emoji}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <Text style={[s.fieldLabel, { marginTop: 18 }]}>When</Text>
            <View style={s.timeRow}>
              {TIMES.map((t) => {
                const selected = timeChoice === t;
                return (
                  <Pressable
                    key={t}
                    onPress={() => { haptic.tap(); setTimeChoice(t); }}
                    style={[s.timeOption, selected && s.timeOptionSelected]}
                  >
                    <Text style={[s.timeOptionText, selected && s.timeOptionTextSelected]} numberOfLines={1} adjustsFontSizeToFit>
                      {t}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {mode === 'shared' && !isEdit && (
            <Text style={s.note}>
              {partnerName} gets an invite in her mailbox. The habit shows as pending on your Home until she accepts — then you both need to complete it each day for it to count.
            </Text>
          )}

          {isEdit && (
            <Pressable onPress={handleDelete} style={({ pressed }) => [s.deleteLink, pressed && { opacity: 0.6 }]}>
              <Text style={s.deleteLinkText}>Delete habit</Text>
            </Pressable>
          )}
        </ScrollView>

        <View style={s.footer}>
          <Pressable
            onPress={handleSubmit}
            disabled={!canSubmit}
            style={({ pressed }) => [s.submit, !canSubmit && s.submitDisabled, pressed && canSubmit && { opacity: 0.9 }]}
          >
            <Text style={s.submitText}>{isEdit ? 'Save changes' : mode === 'shared' ? `Invite ${partnerName}` : 'Add habit'}</Text>
          </Pressable>
        </View>
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
  modeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modeOption: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
    backgroundColor: S.card,
    borderRadius: 16,
    paddingVertical: 16,
    ...cardShadow,
  },
  modeOptionActive: {
    backgroundColor: S.accent,
  },
  modeLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: S.ink900,
  },
  modeLabelActive: {
    color: '#FFFFFF',
  },
  staticWho: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: S.card,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    ...cardShadow,
  },
  staticWhoText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: S.ink900,
  },
  staticWhoHint: {
    fontSize: 12,
    color: S.muted,
  },
  carouselBleed: {
    marginHorizontal: -SCREEN_PADDING,
  },
  presetCard: {
    height: 148,
    alignItems: 'center',
    gap: 10,
    backgroundColor: S.card,
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 8,
    ...cardShadow,
  },
  presetCardSelected: {
    backgroundColor: S.accent,
  },
  presetIconWrap: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: S.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetIconWrapSelected: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  presetIconEmoji: {
    fontSize: 27,
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
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
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
  iconRow: {
    gap: 8,
    paddingVertical: 2,
  },
  iconChip: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: S.bg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  iconChipSelected: {
    borderColor: S.accent,
    backgroundColor: S.accentSoft,
  },
  iconChipText: {
    fontSize: 20,
  },
  timeRow: {
    flexDirection: 'row',
    gap: 4,
    backgroundColor: S.bg,
    borderRadius: 12,
    padding: 4,
  },
  timeOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 9,
    borderRadius: 9,
  },
  timeOptionSelected: {
    backgroundColor: S.ink900,
  },
  timeOptionText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: S.ink700,
  },
  timeOptionTextSelected: {
    color: '#FFFFFF',
  },
  note: {
    marginTop: 14,
    paddingHorizontal: 4,
    fontSize: 13,
    lineHeight: 19,
    color: S.ink500,
  },
  deleteLink: {
    alignSelf: 'center',
    marginTop: 22,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  deleteLinkText: {
    fontSize: 14,
    fontWeight: '700',
    color: S.danger,
  },
  footer: {
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: 8,
    paddingBottom: 10,
  },
  submit: {
    backgroundColor: S.accent,
    borderRadius: 16,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitDisabled: {
    opacity: 0.4,
  },
  submitText: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: '#FFFFFF',
  },
});
