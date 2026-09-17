import React, { useEffect } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, { FadeOutUp, SlideInUp, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/AppText';
import { S } from '@/lib/simulTheme';
import { useToastStore, type ToastItem } from '@/lib/toast';

/** Mount once, above the navigator. Renders whatever `toast.*()` was asked to show. */
export function ToastHost() {
  const items = useToastStore((s) => s.items);
  const insets = useSafeAreaInsets();
  if (items.length === 0) return null;
  return (
    <View pointerEvents="box-none" style={[styles.host, { top: insets.top + 8 }]}>
      {items.map((item) => (
        <ToastCard key={item.id} item={item} />
      ))}
    </View>
  );
}

const ACCENT: Record<ToastItem['kind'], string> = { info: S.accent, success: S.accentDeep, error: S.danger };
const DEFAULT_ICON: Record<ToastItem['kind'], string> = { info: '💬', success: '✓', error: '!' };

function ToastCard({ item }: { item: ToastItem }) {
  const dismiss = useToastStore((s) => s.dismiss);
  useEffect(() => {
    const t = setTimeout(() => dismiss(item.id), item.duration);
    return () => clearTimeout(t);
  }, [item.id, item.duration, dismiss]);

  return (
    <Animated.View entering={SlideInUp.springify().damping(18).stiffness(220)} exiting={FadeOutUp.duration(180)} layout={LinearTransition.springify()}>
      <Pressable
        onPress={() => {
          dismiss(item.id);
          item.onPress?.();
        }}
        style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]}
      >
        <BlurView
          intensity={Platform.OS === 'ios' ? 40 : 60}
          tint="light"
          experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : undefined}
          style={StyleSheet.absoluteFill}
        />
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.tint]} />
        <View style={[styles.iconWrap, { backgroundColor: ACCENT[item.kind] }]}>
          <Text style={styles.icon}>{item.icon ?? DEFAULT_ICON[item.kind]}</Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
          {item.body ? <Text style={styles.body} numberOfLines={2}>{item.body}</Text> : null}
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: 14,
    right: 14,
    gap: 8,
    zIndex: 1000,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 14,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: S.glassEdge,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 8,
  },
  tint: {
    backgroundColor: S.glassTintStrong,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: S.ink900,
  },
  body: {
    fontSize: 12.5,
    color: S.ink600,
    marginTop: 1,
  },
});
