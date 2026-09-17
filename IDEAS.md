# Simul — Feature Ideas

Running list of feature ideas discussed but not yet built. Nothing here is committed to — pick one, say "build this," and it moves into BACKLOG.md as real work. Ordered roughly by how much lift each needs, not by priority.

## Quick wins — plumbing already exists

### Habit reminders
A local notification around each habit's stored time-of-day (Morning/Afternoon/Evening — already a column on `habits`). This is the one actual gap left over from this session's work: `NotificationsPromptScreen` asks for permission and stores the result (`settingsStore.notificationsPermission`), but nothing ever schedules a notification with it. Needs: `expo-notifications` scheduling (guarded by `notificationsUnsupported`, see `src/lib/notifications.ts`), a per-habit reminder toggle/time in `AddHabitScreen`, and rescheduling logic when a habit's time or active/pending status changes.

### Nudge partner
A button on a shared habit your partner hasn't completed yet ("Franco is waiting for you 🌱") that sends them a push. Needs real push notifications (Expo push tokens stored server-side, an Edge Function or small server call to trigger a push through Expo's push service) rather than just local notifications — bigger than it looks at first, because "remind myself" (local) and "notify someone else's phone" (remote/push) are different systems.

### Reaction on completion
Partner finishes a shared habit → you get a push with a 🔥/❤️/💪 you can tap back, shown as a small badge on that habit row. Same remote-push dependency as the nudge feature above; worth building together.

## Bigger swings

### Live presence
"Mora is here right now" when your partner has the app open — using Supabase Realtime's Presence API (separate from the postgres_changes subscriptions already used in `tasksStore`/`useSessionSync`). Very on-brand for an app literally named "at the same time," and a nice payoff for the realtime infrastructure already in place.

### Streak freeze / grace token
Earn one "pass" a week (or month) so a single missed day doesn't reset a shared streak. Needs a schema decision: either a stored grace-token balance per household, or make `streaks.ts`'s streak calculation grace-aware (skip up to N gap days per period). The Duolingo-style reasoning: habit trackers that punish one bad day tend to make people quit around day 20-40; a grace mechanism keeps a couple's shared streak resilient instead of a source of guilt.

### Home screen widget
Today's shared habits + streak on the phone's actual home screen, tappable to complete without opening the app. Needs native config (iOS WidgetKit target / Android App Widget), which means leaving Expo Go entirely for this feature — requires a custom dev client or EAS build either way. The most native-code-heavy idea on this list.

### Weekly view on Home
A compact view of the whole week (not just today) scrollable from the Home screen — see the shape of the week at a glance instead of only "today" plus the small calendar strip that's already there. Needs a design decision on interaction: does it replace the day-swipe gesture, sit above it, or become a separate mode/tab? Worth sketching before building, since Home's gesture space is already busy (day-swipe + pull-to-refresh).

### Stats page
A dedicated screen: completion rate comparison between the two people, per-habit streak history, maybe a "who's more consistent this month" framing. Most of the raw data already exists in `completions`/`habits` and the helpers in `streaks.ts` (`personStreak`, `togetherStreak`, `longestStreak`, `countCompletions`) — this is mostly a new screen + some new aggregation queries/helpers, not new backend plumbing. Natural home: a new tab, or reachable from Settings/Achievements.

## Small, delightful details

### Proof-of-completion photo
Optional quick photo attached to completing a shared habit (snap the plate after "cook dinner together"). Over months it becomes a shared scrapbook. Most of the hard part already exists — the avatar upload pipeline (`src/lib/avatarUpload.ts`, the `avatars` Storage bucket pattern) is directly reusable for a `habit-proofs` bucket with the same owner-scoped RLS shape.

### Weekly recap card
A Sunday summary — "You were in sync 5/7 days this week" — ideally as something shareable (an image), not just a number buried in a screen.

### Milestone moments
Beyond the existing achievement badges: let a household set their relationship-start date, and mark round numbers (100 days of a habit, one year together) with something more personal than a standard badge.

## UX — problems & opportunities

### "0 Days" reads as a failure state
A brand-new household's streak badge says "0 Days" the moment onboarding finishes, before there's been any chance to do anything. Discouraging first impression. Reframe: hide the badge until day 1, or swap the copy to something like "Start today."

### No way to pause a habit without deleting it
A habit is either active or gone — no "skip today" / "pause while traveling." Deleting loses all history, which is a heavy price for a temporary break and probably discourages people from being honest about a rough week.

### Time-of-day is a label with no teeth
"Morning / Afternoon / Evening / All day" isn't tied to an actual reminder yet (see the Reminders idea above). Once reminders exist, this is the natural place to let someone set a real time instead of a vague bucket.

### Invites are silent until someone opens Mailbox
No push when a partner sends a shared-habit invite — you only find out by noticing the badge next time you happen to open the app. For a "together" app, that moment probably deserves to feel more immediate.

### Calendar strip only shows one week
Jumping to "three weeks ago" means swiping repeatedly; no month view or date-jump. Tapping the month label could open a real month grid for fast navigation — a natural extension of the Weekly View idea above.

### Settings mixes low-stakes and destructive actions at equal visual weight
Language and haptics sit in the same weight as "delete account." Nothing's actually unsafe (confirmations exist), but the *hierarchy* doesn't match the stakes.

### Every sync failure is a blocking modal
All errors, big or small, interrupt via native `Alert.alert`. Right call for something serious, but a dropped connection on a routine habit toggle probably deserves a quieter, dismissable toast instead.

## UI — visual direction

### No dark mode, despite the plumbing existing
`settingsStore.darkMode` is a leftover flag, explicitly disconnected because "Simul screens are light-only." Given how much warmth just went into the light theme (cream background, Nunito/Lora pairing), a proper dark variant feels like the natural next visual milestone.

### Glass/blur surfaces
Leaning into the Liquid Glass look from Mural that sparked the font/background work: a frosted-glass treatment (via `expo-blur`) on the tab bar and modal sheets would carry that aesthetic interest beyond just the background gradient.

### Onboarding as one idea per screen, not one long form
Name, avatar, color, and create/join are all stacked on a single scrolling screen right now. A short swipeable sequence (you → your color → start or join) would feel more paced, especially now that the animated background already sets an "onboarding moment" tone.

### Monthly contribution heatmap
GitHub-style consistency-at-a-glance grid — the natural visual centerpiece of the Stats Page idea above. More satisfying than a plain streak number.

### Matching couple-avatar framing
Once both people have joined, a subtle shared visual treatment (linked rings, or the two avatar colors blending where they overlap) would reinforce "together" the same way the app's name does.

### Custom line icons instead of emoji for habits
Emoji rendering differs between iOS and Android. A small custom icon set (still colorful, still fun) would look more deliberate and consistent across platforms.
