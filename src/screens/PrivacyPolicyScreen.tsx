import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@/context/ThemeContext';

export default function PrivacyPolicyScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.bgSecondary }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Text style={[s.title, { color: colors.text1 }]}>{t('legal.privacyTitle')}</Text>
        <Text style={[s.meta, { color: colors.text3 }]}>{t('legal.privacyLastUpdated')}</Text>

        <View style={[s.card, { backgroundColor: colors.bgCard }]}>
          <Text style={[s.paragraph, { color: colors.text1 }]}>{t('legal.privacyIntro')}</Text>
          <Text style={[s.paragraph, { color: colors.text1 }]}>{t('legal.privacyNoData')}</Text>
          <Text style={[s.paragraph, { color: colors.text1 }]}>{t('legal.privacyNotifications')}</Text>
          <Text style={[s.paragraph, { color: colors.text1 }]}>{t('legal.privacyNoAnalytics')}</Text>
          <Text style={[s.paragraph, { color: colors.text1 }]}>
            {t('legal.privacyContact')}{' '}
            <Text style={[s.link, { color: colors.teal }]}>fovereapp@gmail.com</Text>.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  meta: {
    fontSize: 13,
    marginBottom: 16,
  },
  card: {
    borderRadius: 18,
    padding: 16,
  },
  paragraph: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 12,
  },
  link: {
    fontWeight: '600',
  },
});

