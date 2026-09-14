import React, { useLayoutEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { WizardStackParamList } from '@/navigation/types';
import { useTheme } from '@/context/ThemeContext';
import { useWizardStore } from '@/store/wizardStore';
import {
  navHeaderBarPressable,
  navHeaderItemWrap,
  navHeaderLabelText,
} from '@/lib/navigationHeaderStyles';

type Props = NativeStackScreenProps<WizardStackParamList, 'Description'>;

export default function DescriptionStep({ navigation }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const description = useWizardStore((s) => s.description);
  const setDescription = useWizardStore((s) => s.setDescription);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: t('wizard.description'),
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
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={s.container}>
          <Text style={[s.helper, { color: colors.text2 }]}>
            {t('wizard.descriptionHelper')}
          </Text>

          <View style={[s.inputCard, { backgroundColor: colors.bgCard }]}>
            <TextInput
              style={[s.input, { color: colors.text1 }]}
              value={description}
              onChangeText={setDescription}
              placeholder={t('wizard.descriptionPlaceholderShort')}
              placeholderTextColor={colors.text4}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              maxLength={500}
            />
          </View>

          <Text style={[s.counter, { color: colors.text4 }]}>{description.length} / 500</Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },

  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  helper: {
    fontSize: 15,
    marginBottom: 16,
    paddingLeft: 4,
  },
  inputCard: {
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  input: {
    fontSize: 17,
    minHeight: 120,
    paddingVertical: 4,
  },
  counter: {
    fontSize: 13,
    textAlign: 'right',
    marginTop: 8,
    paddingRight: 4,
  },
});
