import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Text } from '@/components/AppText';
import { S, fonts, cardShadow } from '@/lib/simulTheme';

export function EmptyState({
  icon,
  title,
  body,
  actionLabel,
  onAction,
}: {
  icon: string;
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.wrap}>
      <View style={styles.iconWrap}>
        <Text style={styles.icon}>{icon}</Text>
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} style={({ pressed }) => [styles.button, pressed && { opacity: 0.85 }]}>
          <Text style={styles.buttonText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingVertical: 36,
    paddingHorizontal: 28,
  },
  iconWrap: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: S.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    ...cardShadow,
  },
  icon: {
    fontSize: 38,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 19,
    color: S.ink900,
    textAlign: 'center',
    marginBottom: 6,
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    color: S.tertiary,
    textAlign: 'center',
    maxWidth: 280,
  },
  button: {
    marginTop: 20,
    backgroundColor: S.accent,
    borderRadius: 14,
    paddingHorizontal: 22,
    paddingVertical: 12,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
