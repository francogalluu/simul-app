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
