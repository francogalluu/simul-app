/**
 * TargetStep — standalone numeric target setter.
 * Still registered in WizardNavigator but in the new flow the target
 * is primarily set inside MeasureByStep. This screen stays for deep-link
 * compatibility and direct navigation if needed.
 */
import React, { useLayoutEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Minus, Plus } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { WizardStackParamList } from '@/navigation/types';
import { useTheme } from '@/context/ThemeContext';
import { useWizardStore } from '@/store/wizardStore';
import {
  navHeaderBarPressable,
  navHeaderItemWrap,
  navHeaderLabelText,
} from '@/lib/navigationHeaderStyles';

type Props = NativeStackScreenProps<WizardStackParamList, 'Target'>;

export default function TargetStep({ navigation }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { target, unit, unitKey, setTarget } = useWizardStore();
  const unitShown = (unitKey ? t(unitKey) : unit).trim();

  useLayoutEffect(() => {
    navigation.setOptions({
      title: t('wizard.target'),
      headerRight: () => (
        <View style={navHeaderItemWrap}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={8} style={navHeaderBarPressable}>
            <Text style={[navHeaderLabelText, { color: colors.teal }]}>{t('common.done')}</Text>
          </Pressable>
        </View>
      ),
    });
  }, [navigation, colors.teal, t]);

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.bgSecondary }]} edges={['bottom']}>
      <Text style={[s.helper, { color: colors.text2 }]}>{t('wizard.targetHelper')}</Text>

      <View style={[s.card, { backgroundColor: colors.bgCard }]}>
        <View style={s.stepper}>
          <Pressable
            onPress={() => setTarget(Math.max(1, target - 1))}
            style={[s.stepBtn, target <= 1 && { opacity: 0.3 }]}
            disabled={target <= 1}
          >
            <Minus size={28} color={colors.teal} strokeWidth={2.5} />
          </Pressable>

          <View style={s.valueWrap}>
            <Text style={[s.value, { color: colors.text1 }]}>{target}</Text>
            {unitShown ? <Text style={[s.unit, { color: colors.text2 }]}>{unitShown}</Text> : null}
          </View>

          <Pressable onPress={() => setTarget(target + 1)} style={s.stepBtn}>
            <Plus size={28} color={colors.teal} strokeWidth={2.5} />
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:    { flex: 1 },

  helper: {
    fontSize: 15,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  card: {
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 32,
  },
  stepBtn:   { padding: 8 },
  valueWrap: { alignItems: 'center', minWidth: 80 },
  value: {
    fontSize: 56,
    fontWeight: '700',
    letterSpacing: -1,
    lineHeight: 64,
  },
  unit: {
    fontSize: 17,
    marginTop: 4,
  },
});
