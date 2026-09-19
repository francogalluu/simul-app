import React from 'react';
import { StyleSheet } from 'react-native';
import { Button, ColorPicker, Host, Picker, ProgressView, ShareLink, Text as SwiftText, Toggle } from '@expo/ui/swift-ui';
import { buttonStyle, controlSize, font, frame, labelsHidden, lineLimit, pickerStyle, tag, tint } from '@expo/ui/swift-ui/modifiers';
import { S } from '@/lib/simulTheme';

// Real SwiftUI controls (via @expo/ui), tinted with the app's greens.

export function NativeToggle({ value, onChange }: { value: boolean; onChange: (next: boolean) => void }) {
  return (
    <Host matchContents={{ horizontal: true }} style={styles.control} seedColor={S.accent}>
      <Toggle isOn={value} onIsOnChange={onChange} />
    </Host>
  );
}

type Option<T> = { value: T; label: string };

// The native picker also reports its initial value when it mounts, which can overwrite a
// saved setting that hasn't finished loading yet, so only react to real changes.
function useChangeOnly<T>(value: T, onChange: (next: T) => void) {
  return (next: T) => {
    if (next !== value) onChange(next);
  };
}

/** Picker that opens as a native iOS menu; sits on the right of a settings row. */
export function NativeMenuPicker<T extends string | number>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (next: T) => void;
  options: Option<T>[];
}) {
  const handleChange = useChangeOnly(value, onChange);
  return (
    <Host matchContents={{ horizontal: true }} style={styles.control} seedColor={S.accentDeep}>
      <Picker selection={value} onSelectionChange={handleChange} modifiers={[pickerStyle('menu'), labelsHidden()]}>
        {options.map((o) => (
          <SwiftText key={String(o.value)} modifiers={[tag(o.value)]}>
            {o.label}
          </SwiftText>
        ))}
      </Picker>
    </Host>
  );
}

/** Native iOS segmented control that fills the available width. */
export function NativeSegmented<T extends string | number>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (next: T) => void;
  options: Option<T>[];
}) {
  const handleChange = useChangeOnly(value, onChange);
  return (
    <Host matchContents={{ vertical: true }} style={styles.segmented} seedColor={S.accentDeep}>
      <Picker selection={value} onSelectionChange={handleChange} modifiers={[pickerStyle('segmented'), labelsHidden()]}>
        {options.map((o) => (
          <SwiftText key={String(o.value)} modifiers={[tag(o.value)]}>
            {o.label}
          </SwiftText>
        ))}
      </Picker>
    </Host>
  );
}

/** Native SwiftUI linear progress bar (value 0..1), tinted with `color`. */
export function NativeProgress({ value, color = S.accent }: { value: number; color?: string }) {
  return (
    <Host matchContents={{ vertical: true }} style={styles.progress} seedColor={color}>
      <ProgressView value={Math.min(1, Math.max(0, value))} />
    </Host>
  );
}

/** Native iOS share sheet trigger, drawn as a prominent SwiftUI button. */
export function NativeShareButton({ label, message, subject }: { label: string; message: string; subject?: string }) {
  return (
    <Host matchContents={{ vertical: true }} style={styles.fill}>
      <ShareLink
        item={message}
        subject={subject}
        message={message}
        modifiers={[buttonStyle('borderedProminent'), controlSize('regular'), tint(S.accent)]}
      >
        <SwiftText modifiers={[font({ size: 14, weight: 'semibold' }), frame({ maxWidth: 10000 }), lineLimit(1)]}>{label}</SwiftText>
      </ShareLink>
    </Host>
  );
}

/** Native bordered SwiftUI button, to sit next to NativeShareButton. */
export function NativeSecondaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Host matchContents={{ vertical: true }} style={styles.fill}>
      <Button
        onPress={onPress}
        modifiers={[buttonStyle('bordered'), controlSize('regular'), tint(S.accentDeep)]}
      >
        <SwiftText modifiers={[font({ size: 14, weight: 'semibold' }), frame({ maxWidth: 10000 }), lineLimit(1)]}>{label}</SwiftText>
      </Button>
    </Host>
  );
}

/** Native iOS color picker (opens the system color sheet). Reports `#RRGGBB`. */
export function NativeColorPicker({ value, onChange }: { value: string; onChange: (hex: string) => void }) {
  const handleChange = useChangeOnly(value.toLowerCase(), (hex: string) => onChange(hex.slice(0, 7)));
  return (
    <Host matchContents style={styles.colorPicker}>
      <ColorPicker selection={value} supportsOpacity={false} onSelectionChange={(hex: string) => handleChange(hex.slice(0, 7).toLowerCase())} />
    </Host>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  colorPicker: {
    width: 44,
    height: 44,
  },
  progress: {
    alignSelf: 'stretch',
  },
  // Fixed height so a SwiftUI control is centered in a row like the RN labels are.
  control: {
    height: 34,
  },
  segmented: {
    alignSelf: 'stretch',
  },
});
