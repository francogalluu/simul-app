# Simul — Feature Ideas

Running list of feature ideas discussed but not yet built. Nothing here is committed to — pick one, say "build this," and it moves into BACKLOG.md as real work.

Everything that used to be on this list — reminders, nudges, live presence, week view, stats page, proof photos, weekly recap, milestones, pause/skip, glass surfaces, paged onboarding, the heatmap, couple-avatar framing, and the UX fixes — was built on the `feature/ideas-and-habit-sheet` branch; see the "Ideas branch" section of BACKLOG.md for what landed and the caveats.

## Still open

### Home screen widget
Today's shared habits + streak on the phone's actual home screen, tappable to complete without opening the app. Needs native config (iOS WidgetKit target / Android App Widget), which means leaving Expo Go entirely for this feature — requires a custom dev client or EAS build either way. Not started: there's no EAS project for Simul yet (see BACKLOG.md), and nothing on this list is worth breaking the Expo Go workflow for until a real build pipeline exists.

### Remote push for nudges and invites
Nudges and invite alerts currently travel over Supabase Realtime, so they only reach a partner whose app is open (or was recently). Making them land on a locked phone needs Expo push tokens stored server-side plus an Edge Function that calls Expo's push service — and Expo push tokens need an EAS project id, so this is gated on the same "set up EAS" step as the widget.
