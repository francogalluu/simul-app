import React from 'react';
import { StyleSheet } from 'react-native';
import { Host, Picker, Text as SwiftText, Toggle } from '@expo/ui/swift-ui';
import { labelsHidden, pickerStyle, tag } from '@expo/ui/swift-ui/modifiers';
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

const styles = StyleSheet.create({
  // Fixed height so a SwiftUI control is centered in a row like the RN labels are.
  control: {
    height: 34,
  },
  segmented: {
    alignSelf: 'stretch',
  },
});
