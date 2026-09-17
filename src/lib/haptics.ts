import * as Haptics from 'expo-haptics';
import { useSettingsStore } from '@/store/settingsStore';

const enabled = () => useSettingsStore.getState().hapticFeedback;

export const haptic = {
  tap: () => { if (enabled()) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); },
  medium: () => { if (enabled()) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); },
  success: () => { if (enabled()) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); },
  warning: () => { if (enabled()) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); },
};
