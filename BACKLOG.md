# Simul — Backlog

Running list of decisions made, work deferred, and things not to forget. Update as we go.

## Naming / identity cleanup (leftover from the fovere-app fork)

Renamed so far: `app.json` (name/slug/bundle id), `package.json` name, `eas.json` (dropped Fovere's App Store Connect app id + EAS project id since those belong to that app, not this one).

All Fovere code, screens, i18n strings and storage keys are gone (see git history if anything's ever needed). What's left:
- `assets/icon.png` / `assets/Splash.png` are still Fovere's teal "F(v.)" artwork — needs real Simul art; the splash screen shows it on every launch.
- No EAS project / App Store Connect app exists yet for Simul — will need `eas init` (or equivalent) and a new App Store Connect record before any real build/submit.
- Privacy policy / terms screens were deleted with the rest; they'll need writing fresh (with a real contact address) before any store submission.

## Backend (Supabase — wired in)

Project **Simul** (org "Fran Galu", ref `kwlrybcpkpvasiwgrzvc`, us-east-1, free tier). Schema lives in `supabase/migrations/` — the first draft schema (households/tasks/…) had real holes (anyone could join any household without the code, self-referencing RLS, partner could tick your boxes) and was replaced while still empty.

- **Auth:** passwordless. The default Supabase email (no custom SMTP) only has a link, so the app handles it as a PKCE deep link (`simul://auth-callback`, `exp://…/--/auth-callback` in Expo Go): the link only works on the phone that requested it; token-in-URL links are ignored. Code entry also works once a custom template includes `{{ .Token }}` (needs SMTP). Redirect URLs `simul://**` and `exp://**` must be allow-listed in Auth → URL Configuration. **Supabase rejects any redirect whose host is an IP address** (falls back to Site URL localhost:3000), so testing sign-in links in Expo Go needs `npx expo start --tunnel` (exp://….exp.direct); dev/prod builds use simul:// and are unaffected. Session tokens in Keychain/Keystore via chunked `expo-secure-store` (`src/lib/secureStorage.ts`), cleared on reinstall. Sign-out is device-local.
- **Households:** exactly two people. Created/joined only via RPCs (`create_household`, `join_household` — 8-char CSPRNG code, 10 attempts/hour rate limit, 2-member cap), `leave_household` (deletes your personal habits + check-ins, rotates the code), `regenerate_invite_code`, `respond_to_invite`, `delete_account` (store requirement). Slots: 'A' = creator, 'S' = joiner (`src/lib/people.ts` → `useMe`/`usePeople`); avatars are coloured initials now.
- **Security model:** RLS on everything, anon role has no grants, column-level GRANTs so status/owner/household can't be changed directly, helpers in non-exposed `private` schema. Verified with a rolled-back SQL attack suite and a 31-check end-to-end test against the live API (both passing, test users removed).
- **Sync:** `tasksStore` is Supabase-backed with optimistic writes (UUIDs generated on device), per-habit/day serialized completion writes, Realtime subscriptions, full resync on reconnect/foreground. Realtime DELETE events can't be filtered and skip RLS, so every table's PK is a random uuid (nothing meaningful leaks) and unknown ids are ignored.
- **Config:** `.env` (gitignored) holds URL + *publishable* key; `.env.example` is tracked. `src/lib/supabase.ts` refuses to start with a secret/service_role key.

## Avatar upload (photo picker, color, storage)

Onboarding and Settings let each person set a profile photo and pick their own color (/, , public 'avatars' Storage bucket with owner-only write RLS). Upload path:  with  → decode via  → upload the resulting  directly. **Never** read the picked file back off disk (, , etc.) to build the upload body — that's what Supabase's own React Native docs warn against, and concretely broke the library picker (not the camera) in Expo Go here, since a library pick's temp file wasn't reliably readable from JS while a camera capture's was.

**Real bug this surfaced, now fixed:**  flashed  on every re-check, even when the answer ("still no household") hadn't changed. 's app-foreground listener re-runs  on every background→foreground transition, and opening the system photo picker triggers exactly that transition. The  flash swapped 's rendered screen to a splash and back, unmounting  and wiping its in-progress avatar/name/color state — the upload itself always succeeded (confirmed via Storage — files were there the whole time), only the on-screen result was lost. Fixed by keeping  unchanged when a re-check's answer is already settled (has a household, or confidently doesn't). Worth remembering for any future onboarding-flow bug: check whether  is remounting the screen before suspecting the feature itself.

## Avatar upload (photo picker, color, storage)

Onboarding and Settings let each person set a profile photo and pick their own color (`household_members.color`/`avatar_path`, `supabase/migrations/20260917000000_profile_avatar_color.sql`, public 'avatars' Storage bucket with owner-only write RLS). Upload path: `ImagePicker` with `base64: true` → decode via `base64-arraybuffer` → upload the resulting `ArrayBuffer` directly. **Never** read the picked file back off disk (`fetch(asset.uri)`, `expo-file-system`, etc.) to build the upload body — that's what Supabase's own React Native docs warn against, and concretely broke the library picker (not the camera) in Expo Go here, since a library pick's temp file wasn't reliably readable from JS while a camera capture's was.

**Real bug this surfaced, now fixed:** `householdStore.load()` flashed `status: 'loading'` on every re-check, even when the answer ("still no household") hadn't changed. `useSessionSync`'s app-foreground listener re-runs `load()` on every background→foreground transition, and opening the system photo picker triggers exactly that transition. The `'loading'` flash swapped `RootNavigator`'s rendered screen to a splash and back, unmounting `OnboardingScreen` and wiping its in-progress avatar/name/color state — the upload itself always succeeded (confirmed via Storage — files were there the whole time), only the on-screen result was lost. Fixed by keeping `status` unchanged when a re-check's answer is already settled (has a household, or confidently doesn't). Worth remembering for any future onboarding-flow bug: check whether `RootNavigator` is remounting the screen before suspecting the feature itself.

## Dev-only fast sign-in (skips email rate limits)

Two persistent test accounts seeded directly in `auth.users` — `dev-a@simul.test` / `dev-b@simul.test`, password `dev-only-not-a-real-password-8823` — for testing the partner flow (invite/accept/shared habits/realtime) without burning Supabase's default-sender limit (2 emails/hour, shared across the whole project). `AuthScreen` shows a "DEV ONLY" row with two buttons that call `useAuthStore().devSignIn('a' | 'b')` — plain `signInWithPassword`, same auth path as a real user, just skipping the inbox. Gated by `__DEV__`; not part of what a real user is shown or what an App Store review sees (Metro replaces `__DEV__` with a literal and the bundler drops the dead branch in a production/release build). Sign each into a different phone/simulator (or Settings → Sign out and switch) to test both sides.

Still to do on the dashboard / later:
- Custom SMTP (Resend, Postmark…) before real users — the built-in sender is heavily rate-limited and dev-only.
- EAS builds need the two `EXPO_PUBLIC_SUPABASE_*` vars set as EAS environment variables.
- Goals are still device-local (tab hidden). Profile photos (Storage) not built.

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
