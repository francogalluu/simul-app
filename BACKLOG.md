# Simul — Backlog

Running list of decisions made, work deferred, and things not to forget. Update as we go.

## Naming / identity cleanup (leftover from the fovere-app fork)

Renamed so far: `app.json` (name/slug/bundle id), `package.json` name, `eas.json` (dropped Fovere's App Store Connect app id + EAS project id since those belong to that app, not this one).

Still says "Fovere" and needs updating once we're back in app-code mode:
- `src/i18n/en.json` / `es.json` — home title, notification strings, onboarding `welcomeDefinition` ("(v.) to cherish and nurture" → something for "simul"), privacy policy + terms of service body text
- `src/screens/onboarding/OnboardingWelcome.tsx` — hardcoded "Fovere" title text
- `src/store/habitStore.ts` / `settingsStore.ts` — persisted storage keys `fovere-habits` / `fovere-settings`
- `src/lib/tokens.ts` — stray comment mentioning Fovere
- `src/i18n/index.ts` — stray comment mentioning Fovere
- Contact email placeholder `fovereapp@gmail.com` in `PrivacyPolicyScreen.tsx` / `TermsOfServiceScreen.tsx` — needs a real address for Simul, not guessed
- Asset filenames still say Fovere: `assets/Fovere Icon.png`, `src/__tests__/Fovere Logo.png` — also means the actual app icon/splash are still Fovere's, will need new art at some point
- No EAS project / App Store Connect app exists yet for Simul — will need `eas init` (or equivalent) and a new App Store Connect record before any real build/submit

## Product decisions needed before backend wiring

The current screens (from Fovere) are single-user. Before wiring sync, need to decide what "shared" actually looks like on screen:
- Joint calendar/grid (both people's tasks visible together, like the Sprout reference artifact) vs. each person's own list with shared visibility?
- Per-task ownership (color/avatar per person) — confirmed we want this conceptually, not yet designed in UI
- What happens to Fovere's existing solo features that don't make sense for two people (streaks computed per-person vs per-pair, analytics screens, etc.)

Decided already:
- Auth: magic link (email), via Supabase Auth
- Pairing: invite code (one person creates, other joins with a 6-character code)

## Backend (provisioned, not yet wired into the app)

Supabase project **Simul** created (org "Fran Galu", ref `kwlrybcpkpvasiwgrzvc`, region us-east-1, free tier).

Schema live: `households`, `household_members`, `habits`, `tasks`, `completions` — all RLS-locked per household, realtime enabled on all of them. Join-by-code handled via `join_household_by_code(code, display_name)` RPC (security definer, restricted to authenticated users).

Not done yet — deliberately deferred until the UI/product shape above is settled:
- Installing `@supabase/supabase-js` + `react-native-url-polyfill`
- `src/lib/supabase.ts` client setup
- `.env` / `.env.example` with project URL + anon key
- Magic-link sign-in screen + create/join-household onboarding screens
- Swapping `habitStore.ts` / `settingsStore.ts` from AsyncStorage-only to Supabase-backed + realtime subscriptions
- Auth gate in navigation (`App.tsx` / `RootNavigator`)

## Naming history (for context, not action items)

App was going to be named after the reference habit-tracker artifact "Sprout" before landing on **Simul** (Latin, "together, at the same time" — no existing app collisions found at the time of choosing).
