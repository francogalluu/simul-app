/**
 * Design tokens — extracted from /src/app/screens (Figma Make reference).
 * Single source of truth for colors, radii, and typography sizes.
 * No logic, just constants.
 */

// ─── Colors ───────────────────────────────────────────────────────────────────

export const C = {
  // Brand
  teal: '#008080',
  tealSoft: 'rgba(0, 128, 128, 0.12)',

  // Backgrounds
  bgHome: '#FFFFFF',      // Home screen
  bgSecondary: '#F2F2F7', // Wizard, Settings, HabitDetail
  bgAnalytics: '#F9F9F9', // Analytics screen
  bgCard: '#FFFFFF',      // Cards on secondary bg

  // Text
  text1: '#1A1A1A', // Primary
  text2: '#8E8E93', // Secondary
  text3: '#666666', // Tertiary
  text4: '#999999', // Muted

  // Borders / separators
  separator: 'rgba(0, 0, 0, 0.08)',
  separatorLight: '#E5E5EA',

  // Status
  success: '#34C759',
  successSoft: 'rgba(52, 199, 89, 0.08)',
  warning: '#FF9F0A',
  warningSoft: 'rgba(255, 159, 10, 0.08)',
  danger: '#FF3B30',

  // Misc
  chevron: '#C7C7CC',
  ring: '#E5E5E5',      // Progress ring track
  ringAlt: '#E5E5E7',   // Slightly warmer track (stat cards)
} as const;

// ─── Border radii ─────────────────────────────────────────────────────────────

export const R = {
  card: 24,      // Habit card, progress card
  cardSm: 16,    // Settings card, info card
  pill: 50,      // Round buttons / badges
  badge: 12,     // Small label chips
  seg: 10,       // Segmented control
  icon: 12,      // Icon background in breakdown list
} as const;

// ─── Typography — font sizes only (weights inline per component) ──────────────

export const F = {
  screenTitle: 34,   // "Fovere", "Calendar", "Analytics", "Settings"
  sectionTitle: 22,  // "Today's Habits", "This Month", …
  cardTitle: 20,     // "Monthly completion"
  label: 17,         // Row labels, nav button text, card body
  body: 15,          // Secondary text, progress text
  caption: 13,       // UPPERCASE section sub-headers, badge text
  tiny: 11,          // Day labels in week calendar / heatmap
} as const;

// ─── Shadows ──────────────────────────────────────────────────────────────────

export const S = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  hero: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 4,
  },
} as const;
