/**
 * Ref for the Home screen's "scroll to top" (scroll to today) function.
 * TabNavigator calls it when the user taps the Home tab while already on Home.
 * HomeScreen registers the function on mount and clears it on unmount.
 */
export const homeScrollToTopRef: { current: (() => void) | null } = { current: null };
