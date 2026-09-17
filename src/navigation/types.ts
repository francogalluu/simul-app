// ─── Root stack (sits above tabs: modals + pushed detail screens) ─────────────
export type RootStackParamList = {
  // Signed out / signed in without a household. Only one of these groups is mounted at a time.
  Auth: undefined;
  Onboarding: undefined;
  NotificationsPrompt: undefined;
  Tabs: undefined;
  AddHabit: { habitId?: string } | undefined;
  // Goals tab is hidden for now (not deleted — GoalsScreen/AddGoalScreen/goalsStore
  // are all still here, just unreachable from the tab bar). AddGoal stays
  // registered so it doesn't dangle, even though nothing currently navigates to it.
  AddGoal: { goalId?: string } | undefined;
  Mailbox: undefined;
  Achievements: undefined;
};

// ─── Bottom tab navigator ─────────────────────────────────────────────────────
export type TabParamList = {
  Home: undefined;
  Settings: undefined;
};
