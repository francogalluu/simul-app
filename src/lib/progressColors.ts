/**
 * Global Progress State Variable System
 *
 * Progress / State tokens for unified color mapping across the entire app.
 * All progress indicators must reference these tokens.
 *
 * USAGE RULES:
 * DO: Always use getProgressColor(percentage) for dynamic progress
 * DO: Use PROGRESS_COLORS.HIGH for static 100% completed states
 * DON'T: Hardcode progress colors anywhere in components
 * DON'T: Create new color logic - extend this file instead
 */

export const PROGRESS_COLORS = {
  NONE: '#E5E5E7',    // 0%
  LOW: '#DC2626',     // 1–29%
  MID_LOW: '#EA580C', // 30–49%
  MID: '#D97706',     // 50–69%
  HIGH: '#34C759',    // 70–100%
} as const;

export const getProgressColor = (percentage: number): string => {
  if (percentage >= 70) return PROGRESS_COLORS.HIGH;
  if (percentage >= 50) return PROGRESS_COLORS.MID;
  if (percentage >= 30) return PROGRESS_COLORS.MID_LOW;
  if (percentage > 0) return PROGRESS_COLORS.LOW;
  return PROGRESS_COLORS.NONE;
};
