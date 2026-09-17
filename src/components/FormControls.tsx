import React, { forwardRef } from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator, StyleSheet, type TextInputProps } from 'react-native';
import { S, softShadow } from '@/lib/simulTheme';

export const TextField = forwardRef<TextInput, TextInputProps & { label: string }>(function TextField(
  { label, style, ...props },
  ref,
) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput ref={ref} placeholderTextColor={S.muted} style={[styles.input, style]} {...props} />
    </View>
  );
});

export function PrimaryButton({
  label,
  onPress,
  loading,
  disabled,
  variant = 'primary',
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'link';
}) {
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      onPress={onPress}
      disabled={inactive}
      style={({ pressed }) => [
        variant === 'primary' && styles.primary,
        variant === 'secondary' && styles.secondary,
        variant === 'link' && styles.link,
        inactive && variant !== 'link' && { opacity: 0.5 },
        pressed && { opacity: 0.8 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#FFFFFF' : S.accentDeep} />
      ) : (
        <Text style={[styles.text, variant !== 'primary' && styles.textAlt, variant === 'link' && inactive && { color: S.muted }]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

export function ErrorText({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <Text accessibilityLiveRegion="polite" style={styles.error}>
      {message}
    </Text>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: 8,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: S.tertiary,
  },
  input: {
    backgroundColor: S.card,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: S.ink900,
    borderWidth: 1,
    borderColor: S.lineSoft,
    ...softShadow,
  },
  primary: {
    backgroundColor: S.accent,
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  secondary: {
    backgroundColor: S.card,
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    borderWidth: 1,
    borderColor: S.line,
  },
  link: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  text: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  textAlt: {
    color: S.accentDeep,
  },
  error: {
    fontSize: 13,
    lineHeight: 18,
    color: S.danger,
  },
});
