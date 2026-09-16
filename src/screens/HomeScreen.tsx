import React from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import { CoupleStreakHeader } from '@/components/CoupleStreakHeader';

export default function HomeScreen() {
  return (
    <SafeAreaView style={s.safe}>
      <CoupleStreakHeader />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F2F2F5',
  },
});
