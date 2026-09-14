/**
 * Native-stack header items: compact wrappers + label styles so iOS bar buttons
 * stay content-sized (avoids stretched “Done” pills) and text stays centered.
 */
import { Platform, type TextStyle, type ViewStyle } from 'react-native';

/** Keeps the bar-button slot from growing and stretching the system chrome. */
export const navHeaderItemWrap: ViewStyle = {
  flexGrow: 0,
  flexShrink: 0,
};

export const navHeaderBarPressable: ViewStyle = {
  paddingHorizontal: 15,
  paddingVertical: 7,
  justifyContent: 'center',
  alignItems: 'center',
  alignSelf: 'flex-start',
};

const labelTextBase: TextStyle = {
  fontSize: 17,
  lineHeight: 17,
  textAlign: 'center',
  fontWeight: '400',
  includeFontPadding: false,
};

export const navHeaderLabelText: TextStyle = {
  ...labelTextBase,
  ...Platform.select({
    android: { textAlignVertical: 'center' as const },
    default: {},
  }),
};
