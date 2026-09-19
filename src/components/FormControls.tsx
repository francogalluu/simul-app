import React, { forwardRef } from 'react';
import { View, TextInput, Pressable, ActivityIndicator, Platform, StyleSheet, type TextInputProps } from 'react-native';
import { Text } from '@/components/AppText';
import { S, softShadow } from '@/lib/simulTheme';
import { NativeButton, NativeTextField, type NativeTextFieldHandle } from '@/components/NativeControls';

type TextFieldProps = TextInputProps & {
  label: string;
  /** Big, bold, centered text with wide letter spacing (for codes). */
  code?: boolean;
};

const IOS_CONTENT_TYPES = ['emailAddress', 'oneTimeCode', 'givenName', 'name'] as const;

/** Labelled text input: a SwiftUI TextField on iOS, a plain TextInput elsewhere. */
export const TextField = forwardRef<NativeTextFieldHandle, TextFieldProps>(function TextField(
  { label, style, code, ...props },
  ref,
) {
  if (Platform.OS === 'ios') {
    const contentType = IOS_CONTENT_TYPES.find((t) => t === props.textContentType);
    return (
      <View style={styles.field}>
        <Text style={styles.label}>{label}</Text>
        <NativeTextField
          ref={ref}
          value={props.value ?? ''}
          onChangeText={props.onChangeText ?? (() => {})}
          placeholder={props.placeholder}
          maxLength={props.maxLength}
          keyboardType={props.keyboardType === 'email-address' ? 'email-address' : props.keyboardType === 'number-pad' ? 'number-pad' : 'default'}
          autoCapitalize={props.autoCapitalize}
          autoCorrect={props.autoCorrect}
          textContentType={contentType}
          returnKeyType={props.returnKeyType === 'done' || props.returnKeyType === 'go' || props.returnKeyType === 'next' || props.returnKeyType === 'send' || props.returnKeyType === 'search' ? props.returnKeyType : undefined}
          onSubmitEditing={props.onSubmitEditing ? () => props.onSubmitEditing?.({} as never) : undefined}
          code={code}
        />
      </View>
    );
  }
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        ref={ref as unknown as React.Ref<TextInput>}
        placeholderTextColor={S.muted}
        style={[styles.input, code && styles.codeInput, style]}
        {...props}
      />
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
  if (Platform.OS === 'ios') {
    return <NativeButton label={label} onPress={onPress} loading={loading} disabled={disabled} variant={variant} />;
  }
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
  codeInput: {
    fontSize: 24,
    letterSpacing: 8,
    textAlign: 'center',
    fontWeight: '700',
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
