# Working on Simul

## Don't use the Android emulator unless asked

Do not boot the emulator, start a Metro/Expo dev server, or drive the app with
`adb` to self-verify changes. Ship the code change and describe what it does
instead. Only launch the emulator when the user explicitly asks for it in
that conversation (e.g. "check this on the emulator", "does it actually
render right?").

Why: a full screenshot-driven verification loop (boot emulator, start Metro,
tap/swipe/screenshot repeatedly) burns noticeably more tokens than reading
and reasoning about the code, mostly from the volume of round trips and
screenshots accumulating in context over a session — not from any one
screenshot being large.
