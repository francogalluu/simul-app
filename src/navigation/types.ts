// ─── Root stack (sits above tabs: modals + pushed detail screens) ─────────────
export type RootStackParamList = {
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
