# Simul — Backlog

Running list of decisions made, work deferred, and things not to forget. Update as we go.

## Naming / identity cleanup (leftover from the fovere-app fork)

Renamed so far: `app.json` (name/slug/bundle id), `package.json` name, `eas.json` (dropped Fovere's App Store Connect app id + EAS project id since those belong to that app, not this one).

All Fovere code, screens, i18n strings and storage keys are gone (see git history if anything's ever needed). What's left:
- `assets/icon.png` / `assets/Splash.png` are still Fovere's teal "F(v.)" artwork — needs real Simul art; the splash screen shows it on every launch.
- No EAS project / App Store Connect app exists yet for Simul — will need `eas init` (or equivalent) and a new App Store Connect record before any real build/submit.
- Privacy policy / terms screens were deleted with the rest; they'll need writing fresh (with a real contact address) before any store submission.

## Current app shape (all local, no backend)

Two people are hardcoded: `'A'` = Franco, `'S'` = Mora (`src/lib/people.ts`, photos in `src/assets/images/couple/`). There's one account and no sync, so **"Mora's side" is simulated**: Settings → Preview → "View the app as" flips `settingsStore.perspective` and every screen re-renders from her side (her mailbox, her checkboxes, her streak). That's how the invite/accept flow and shared completion get demoed on one phone.

Data model (`src/store/tasksStore.ts`, persisted to AsyncStorage as `simul-tasks`):
- `habits[]` — `owner: 'A' | 'S' | 'both'`, `status: 'active' | 'pending'`, `createdAt`, and for invites `requestedBy`. A shared habit starts as `pending` + `requestedBy` = sender; the other person sees it in the Mailbox and Accept flips it to `active`.
- `completions[date][habitId] = { A?: true, S?: true }` — per person, per day. A shared habit only counts as done for a day when **both** are true; the Home row shows "waiting for X" / "X finished — your turn" in between.
- Streaks (`src/lib/streaks.ts`) are computed from that, not stored. Achievements (`src/lib/achievements.ts`) are computed the same way, including the secret ones.
- `goalsStore.ts` (`simul-goals`) — long-term goals, separate from habits.
- First launch seeds sample habits + ~a week of history so streaks/badges aren't all zero; Settings → Data can reset to sample or clear everything (that's how to see the empty states).

Decided already:
- Auth: magic link (email), via Supabase Auth
- Pairing: invite code (one person creates, other joins with a 6-character code)
- When the backend lands, `perspective` goes away — the signed-in user *is* `me`, and the partner is whoever else is in the household.

## Backend (provisioned, not yet wired into the app)

Supabase project **Simul** created (org "Fran Galu", ref `kwlrybcpkpvasiwgrzvc`, region us-east-1, free tier).

Schema live: `households`, `household_members`, `habits`, `tasks`, `completions` — all RLS-locked per household, realtime enabled on all of them. Join-by-code handled via `join_household_by_code(code, display_name)` RPC (security definer, restricted to authenticated users).

Not done yet — deliberately deferred until the UI/product shape above is settled:
- Installing `@supabase/supabase-js` + `react-native-url-polyfill`
- `src/lib/supabase.ts` client setup
- `.env` / `.env.example` with project URL + anon key
- Magic-link sign-in screen + create/join-household onboarding screens
- Swapping `tasksStore.ts` / `goalsStore.ts` from AsyncStorage-only to Supabase-backed + realtime subscriptions (the schema's `tasks`/`completions` tables map onto the local shape almost 1:1)
- Auth gate in navigation (`App.tsx` / `RootNavigator`)

## Dev environment — running the app

Repo: https://github.com/francogalluu/simul-app (private, direct commits to `master`, no PR workflow set up). Expo account: signed in as **gallu** — CLI (`npx expo login`) and the Expo Go app itself both need signing into on each new machine/device separately, it's not automatic.

Currently on **Expo SDK 57** (upgraded from the fovere-app fork's SDK 54) — Expo Go only ever supports the latest SDK on a given install, so if Expo Go auto-updates itself to a newer SDK in the future, the project will need `npx expo install expo@latest` + `npx expo install --fix` again (same steps as the 54→57 upgrade).

**Known fixed issue, don't reintroduce it:** `expo-notifications` throws immediately on import on Android inside Expo Go (remote push was dropped there in SDK 53+) — this was a silent console-suppressible warning in SDK 54 (hence the old `LogBox.ignoreLogs` in `androidLogBoxBootstrap.ts`, now stale/harmless) but became a hard crash in SDK 57. Fixed via `src/lib/expoGoGuard.ts`'s `notificationsUnsupported` flag + a deferred `require('expo-notifications')` instead of a static import, in `App.tsx`, `notificationScheduler.ts`, and `NotificationSettingsScreen.tsx`. **Any new file that imports `expo-notifications` must follow the same pattern** (check `notificationsUnsupported` before `require`-ing it) or Android/Expo-Go testing will break again.

### Continuing on this Windows PC

Local Android emulator is fully set up for self-driven testing (no phone needed):
- Android SDK at `C:\Android\sdk`, JDK 17 at `C:\Android\jdk17\jdk-17.0.20.1+1`, both on this Windows user's PATH permanently (`ANDROID_HOME`, `ANDROID_SDK_ROOT`, `JAVA_HOME` set via `[Environment]::SetEnvironmentVariable(...,'User')`) — a **newly opened terminal** picks these up; the Claude Code desktop app's own terminal pane needs the whole app restarted first (it caches the env it launched with).
- AVD name: `Simul_Test` (Pixel-ish, Android 14 / API 34, `google_apis` x86_64 system image). Boot it with: `emulator -avd Simul_Test -no-boot-anim -no-snapshot -gpu swiftshader_indirect`
- Expo Go 57.0.9 APK already installed on it (sideloaded from `https://github.com/expo/expo-go-releases/releases/download/Expo-Go-57.0.9/Expo-Go-57.0.9.apk` — that's how to get the matching APK again if the SDK version changes).
- To open the project on it: run `npx expo start` in a terminal, then press **`a`** (don't hand-craft the `adb am start` intent — that opens Expo Go's Home screen instead of the project and crashes for unrelated reasons, learned this the hard way).
- Screenshot anytime via `adb exec-out screencap -p > out.png`.

### Getting running on the MacBook (or any new machine)

1. Install **Xcode** (App Store) + Command Line Tools — unlocks the real iOS Simulator, which isn't possible on Windows at all. This is the main reason a Mac is worth using for this project.
2. Install **Node.js** (nvm or Homebrew — not preinstalled on macOS).
3. `git clone https://github.com/francogalluu/simul-app.git` — needs its own GitHub auth on that machine (`gh auth login` or an SSH key), separate from this PC's.
4. `npm install` inside the cloned folder.
5. `npx expo login` (same `gallu` account).
6. `npx expo start`, then press **`i`** — Expo CLI auto-installs Expo Go into the iOS Simulator itself, no manual APK hunting needed there (Apple's Simulator allows arbitrary installs, unlike the Android emulator).

What carries over automatically with no setup: the Supabase backend (cloud, tied to the Anthropic/Claude account not the device) and anything already pushed to GitHub. What does **not** carry over: this specific Claude Code session/conversation, and any of the Windows-local Android emulator state above.

## Naming history (for context, not action items)

App was going to be named after the reference habit-tracker artifact "Sprout" before landing on **Simul** (Latin, "together, at the same time" — no existing app collisions found at the time of choosing).
