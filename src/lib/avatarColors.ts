/** Curated palette for profile colors — picked for contrast with white initials text. */
export const AVATAR_COLORS = [
  '#D9739E', // rose
  '#6F9BC7', // sky
  '#6BB290', // sage (app accent)
  '#F2A65A', // amber
  '#9B7EDE', // violet
  '#4FB0B0', // teal
  '#E2725B', // terracotta
  '#5C7AEA', // indigo
] as const;

export const randomAvatarColor = () => AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
