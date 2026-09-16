import React, { useState } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import Svg, { Path } from 'react-native-svg';
import type { RootStackParamList } from '@/navigation/types';
import { useTasksStore } from '@/store/tasksStore';

type Mode = 'single' | 'shared';

const PRESETS: Array<{ emoji: string; label: string }> = [
  { emoji: '💧', label: 'Drink water' },
  { emoji: '🧘', label: 'Meditate' },
  { emoji: '🚶', label: 'Evening walk' },
  { emoji: '📖', label: 'Read' },
  { emoji: '🏋️', label: 'Workout' },
  { emoji: '🥗', label: 'Eat vegetables' },
  { emoji: '😴', label: 'Sleep early' },
  { emoji: '🙏', label: 'Gratitude journal' },
];

function CloseIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#262019" strokeWidth={2.4} strokeLinecap="round">
      <Path d="M6 6l12 12" />
      <Path d="M18 6L6 18" />
    </Svg>
  );
}

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

export default function AddHabitScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const addItem = useTasksStore((s) => s.addItem);

  const [mode, setMode] = useState<Mode>('single');
  const [name, setName] = useState('');
  const [time, setTime] = useState('');
  const [icon, setIcon] = useState('⭐');

  const handleClose = () => navigation.goBack();

  const handlePresetPress = (preset: { emoji: string; label: string }) => {
    setName(preset.label);
    setIcon(preset.emoji);
  };

  const handleSubmit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;

    if (mode === 'shared') {
      addItem({ name: trimmed, time: time.trim(), owner: 'both', status: 'pending', icon });
      Alert.alert(
        'Invite sent 💌',
        `Mora will see "${trimmed}" once she accepts. It'll show as pending on Home until then.`,
        [{ text: 'OK', onPress: handleClose }],
      );
      return;
    }

    addItem({ name: trimmed, time: time.trim(), owner: 'A', status: 'active', icon });
    handleClose();
  };

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={s.headerRow}>
          <Pressable accessibilityLabel="Close" onPress={handleClose} style={s.closeButton}>
            <CloseIcon />
          </Pressable>
          <Text style={s.headerTitle}>New Habit</Text>
          <View style={s.closeButton} />
        </View>

        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          {/* Single / Shared */}
          <View style={s.modeRow}>
            <Pressable
              onPress={() => setMode('single')}
              style={[s.modeOption, mode === 'single' && s.modeOptionActive]}
            >
              <PersonIcon color={mode === 'single' ? '#FFFFFF' : '#262019'} />
              <Text style={[s.modeLabel, mode === 'single' && s.modeLabelActive]}>Just me</Text>
            </Pressable>
            <Pressable
              onPress={() => setMode('shared')}
              style={[s.modeOption, mode === 'shared' && s.modeOptionActive]}
            >
              <PeopleIcon color={mode === 'shared' ? '#FFFFFF' : '#262019'} />
              <Text style={[s.modeLabel, mode === 'shared' && s.modeLabelActive]}>Shared with Mora</Text>
            </Pressable>
          </View>

          {/* Quick pick presets */}
          <Text style={s.presetsTitle}>Quick pick</Text>
          <View style={s.presetsGrid}>
            {PRESETS.map((preset) => {
              const selected = name === preset.label;
              return (
                <Pressable
                  key={preset.label}
                  onPress={() => handlePresetPress(preset)}
                  style={[s.presetCard, selected && s.presetCardSelected]}
                >
                  <View style={[s.presetIconWrap, selected && s.presetIconWrapSelected]}>
                    <Text style={s.presetIconEmoji}>{preset.emoji}</Text>
                  </View>
                  <Text style={[s.presetCardLabel, selected && s.presetCardLabelSelected]} numberOfLines={2}>
                    {preset.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Form card */}
          <View style={s.card}>
            <Text style={s.fieldLabel}>Habit name</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Morning stretch"
              placeholderTextColor="#A69C8F"
              style={s.input}
            />

            <Text style={[s.fieldLabel, { marginTop: 16 }]}>Time (optional)</Text>
            <TextInput
              value={time}
              onChangeText={setTime}
              placeholder="7:00am, or leave blank for All day"
              placeholderTextColor="#A69C8F"
              style={s.input}
            />
          </View>

          {mode === 'shared' && (
            <View style={s.noteRow}>
              <Text style={s.noteText}>
                Mora will get an invite for this habit — it shows up on her list once she accepts.
              </Text>
            </View>
          )}
        </ScrollView>

        <View style={s.footer}>
          <Pressable
            onPress={handleSubmit}
            disabled={!name.trim()}
            style={[s.submitButton, !name.trim() && s.submitButtonDisabled]}
          >
            <Text style={s.submitText}>{mode === 'shared' ? 'Send Invite' : 'Add Habit'}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const ACCENT = '#6bb290';
const INK_900 = '#262019';
const CARD_BG = '#F2F2F5';

const cardShadow = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.05,
  shadowRadius: 12,
  elevation: 2,
};

const s = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: CARD_BG,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  closeButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: 'Lora_700Bold',
    fontSize: 18,
    color: INK_900,
  },
  scroll: {
    padding: 22,
    paddingTop: 8,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modeOption: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 18,
    ...cardShadow,
  },
  modeOptionActive: {
    backgroundColor: ACCENT,
  },
  presetsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4A4238',
    marginTop: 20,
    marginBottom: 8,
  },
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  presetCard: {
    width: '31%',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 6,
    ...cardShadow,
  },
  presetCardSelected: {
    backgroundColor: ACCENT,
  },
  presetIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: CARD_BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetIconWrapSelected: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  presetIconEmoji: {
    fontSize: 20,
  },
  presetCardLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: INK_900,
    textAlign: 'center',
  },
  presetCardLabelSelected: {
    color: '#FFFFFF',
  },
  modeLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: INK_900,
  },
  modeLabelActive: {
    color: '#FFFFFF',
  },
  card: {
    marginTop: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    ...cardShadow,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4A4238',
    marginBottom: 8,
  },
  input: {
    backgroundColor: CARD_BG,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: INK_900,
  },
  noteRow: {
    marginTop: 16,
    paddingHorizontal: 4,
  },
  noteText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#7A7166',
    lineHeight: 19,
  },
  footer: {
    padding: 22,
    paddingTop: 8,
  },
  submitButton: {
    backgroundColor: ACCENT,
    borderRadius: 16,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.4,
  },
  submitText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
