/**
 * Ref for restarting the Home screen's progress ring animation.
 * TabNavigator calls it whenever the Home tab is pressed.
 * HomeScreen registers a function that bumps an internal animation key.
 */
export const homeHeroAnimationRef: { current: (() => void) | null } = { current: null };

