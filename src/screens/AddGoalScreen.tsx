import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NavigationProp, RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '@/navigation/types';
import { useGoalsStore } from '@/store/goalsStore';
import { partnerOf, useMe, usePeople } from '@/lib/people';
import { addMonths, today } from '@/lib/dates';
import { haptic } from '@/lib/haptics';
import { S, fonts, cardShadow, SCREEN_PADDING } from '@/lib/simulTheme';
import { ScreenHeader } from '@/components/ScreenHeader';

const ICONS = ['🎯', '📚', '💰', '🏃', '✈️', '🏠', '🎓', '🧘', '🍳', '🎸', '💪', '🌍', '🚴', '🎨', '💼', '❤️'];

const DEADLINES: Array<{ label: string; months: number | null }> = [
  { label: 'No deadline', months: null },
  { label: '3 months', months: 3 },
  { label: '6 months', months: 6 },
  { label: '1 year', months: 12 },
];

export default function AddGoalScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'AddGoal'>>();
  const goalId = route.params?.goalId;

  const me = useMe();
  const partnerName = usePeople()[partnerOf(me)].name;
  const goals = useGoalsStore((st) => st.goals);
  const addGoal = useGoalsStore((st) => st.addGoal);
  const updateGoal = useGoalsStore((st) => st.updateGoal);
  const editing = useMemo(() => goals.find((g) => g.id === goalId), [goals, goalId]);
  const isEdit = Boolean(editing);

  const [title, setTitle] = useState(editing?.title ?? '');
  const [icon, setIcon] = useState(editing?.icon ?? '🎯');
  const [target, setTarget] = useState(editing ? String(editing.target) : '');
  const [unit, setUnit] = useState(editing?.unit ?? '');
  const [shared, setShared] = useState(editing?.shared ?? false);
  const [deadlineIdx, setDeadlineIdx] = useState(editing?.deadline ? -1 : 0);

  const targetNum = Number.parseInt(target, 10);
  const canSubmit = title.trim().length > 0 && Number.isFinite(targetNum) && targetNum > 0 && unit.trim().length > 0;

  const handleSubmit = () => {
    if (!canSubmit) return;
    const months = deadlineIdx >= 0 ? DEADLINES[deadlineIdx].months : null;
    const deadline = deadlineIdx === -1 ? editing?.deadline : months ? addMonths(today(), months) : undefined;
    const draft = { title: title.trim(), icon, target: targetNum, unit: unit.trim(), shared, deadline };
    if (isEdit && editing) updateGoal(editing.id, draft);
    else addGoal(draft);
    haptic.success();
    navigation.goBack();
  };

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScreenHeader title={isEdit ? 'Edit Goal' : 'New Goal'} variant="close" />
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Text style={s.sectionLabel}>Who is this for</Text>
          <View style={s.modeRow}>
            <Pressable onPress={() => { haptic.tap(); setShared(false); }} style={[s.modeOption, !shared && s.modeOptionActive]}>
              <Text style={[s.modeLabel, !shared && s.modeLabelActive]}>Just me</Text>
            </Pressable>
            <Pressable onPress={() => { haptic.tap(); setShared(true); }} style={[s.modeOption, shared && s.modeOptionActive]}>
              <Text style={[s.modeLabel, shared && s.modeLabelActive]}>With {partnerName}</Text>
            </Pressable>
          </View>

          <Text style={s.sectionLabel}>The goal</Text>
          <View style={s.card}>
            <Text style={s.fieldLabel}>Title</Text>
            <View style={s.nameRow}>
              <View style={s.nameIcon}>
                <Text style={s.nameIconText}>{icon}</Text>
              </View>
              <TextInput value={title} onChangeText={setTitle} placeholder="e.g. Read 12 books" placeholderTextColor={S.muted} style={[s.input, { flex: 1 }]} maxLength={48} />
            </View>

            <Text style={[s.fieldLabel, { marginTop: 18 }]}>Icon</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.iconRow} keyboardShouldPersistTaps="handled">
              {ICONS.map((emoji) => (
                <Pressable key={emoji} onPress={() => { haptic.tap(); setIcon(emoji); }} style={[s.iconChip, emoji === icon && s.iconChipSelected]}>
                  <Text style={s.iconChipText}>{emoji}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <View style={s.twoCol}>
              <View style={{ flex: 1 }}>
                <Text style={s.fieldLabel}>Target</Text>
                <TextInput value={target} onChangeText={(v) => setTarget(v.replace(/[^0-9]/g, ''))} placeholder="12" placeholderTextColor={S.muted} keyboardType="number-pad" style={s.input} maxLength={6} />
              </View>
              <View style={{ flex: 1.6 }}>
                <Text style={s.fieldLabel}>Unit</Text>
                <TextInput value={unit} onChangeText={setUnit} placeholder="books, km, sessions…" placeholderTextColor={S.muted} style={s.input} maxLength={20} />
              </View>
            </View>

            <Text style={[s.fieldLabel, { marginTop: 18 }]}>Deadline</Text>
            <View style={s.chipRow}>
              {DEADLINES.map((d, i) => (
                <Pressable key={d.label} onPress={() => { haptic.tap(); setDeadlineIdx(i); }} style={[s.chip, deadlineIdx === i && s.chipSelected]}>
                  <Text style={[s.chipText, deadlineIdx === i && s.chipTextSelected]}>{d.label}</Text>
                </Pressable>
              ))}
              {deadlineIdx === -1 && (
                <View style={[s.chip, s.chipSelected]}>
                  <Text style={s.chipTextSelected}>Keep current</Text>
                </View>
              )}
            </View>
          </View>
        </ScrollView>

        <View style={s.footer}>
          <Pressable onPress={handleSubmit} disabled={!canSubmit} style={({ pressed }) => [s.submit, !canSubmit && s.submitDisabled, pressed && canSubmit && { opacity: 0.9 }]}>
            <Text style={s.submitText}>{isEdit ? 'Save changes' : 'Add goal'}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: S.bg },
  scroll: { paddingHorizontal: SCREEN_PADDING, paddingBottom: 12 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: S.tertiary,
    marginTop: 20,
    marginBottom: 10,
  },
  modeRow: { flexDirection: 'row', gap: 10 },
  modeOption: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: S.card,
    borderRadius: 16,
    paddingVertical: 15,
    ...cardShadow,
  },
  modeOptionActive: { backgroundColor: S.accent },
  modeLabel: { fontSize: 13, fontWeight: '700', color: S.ink900 },
  modeLabelActive: { color: '#FFFFFF' },
  card: { backgroundColor: S.card, borderRadius: 20, padding: 18, ...cardShadow },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: S.ink700, marginBottom: 8 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  nameIcon: { width: 46, height: 46, borderRadius: 23, backgroundColor: S.bg, alignItems: 'center', justifyContent: 'center' },
  nameIconText: { fontSize: 22 },
  input: {
    backgroundColor: S.bg,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: S.ink900,
  },
  iconRow: { gap: 8, paddingVertical: 2 },
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
  iconChipSelected: { borderColor: S.accent, backgroundColor: S.accentSoft },
  iconChipText: { fontSize: 20 },
  twoCol: { flexDirection: 'row', gap: 10, marginTop: 18 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, backgroundColor: S.bg },
  chipSelected: { backgroundColor: S.ink900 },
  chipText: { fontSize: 13, fontWeight: '700', color: S.ink700 },
  chipTextSelected: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  footer: { paddingHorizontal: SCREEN_PADDING, paddingTop: 8, paddingBottom: 10 },
  submit: { backgroundColor: S.accent, borderRadius: 16, height: 56, alignItems: 'center', justifyContent: 'center' },
  submitDisabled: { opacity: 0.4 },
  submitText: { fontFamily: fonts.bold, fontSize: 16, color: '#FFFFFF' },
});
