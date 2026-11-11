# Simul — promo video (1920×1080, 30 fps, 40 s, English + Spanish)

Built with [Remotion](https://www.remotion.dev) (React → video). Everything is code, so text, timing and layout are editable.

## Deliverables
- `out/simul-promo.mp4` / `out/simul-promo-es.mp4` — final videos (H.264 + AAC)
- `out/keyframes/` / `out/keyframes-es/` — one or two key frames per scene (PNG, full size)
- `src/`, `public/`, `scripts/` — source

## Edit & render
```bash
npm install
npm run studio     # live preview / scrubbing in the browser
npm run render     # -> out/simul-promo.mp4      (English)
npm run render:es  # -> out/simul-promo-es.mp4   (Spanish)
npm run stills     # -> out/keyframes/*.png
npm run stills:es  # -> out/keyframes-es/*.png
node scripts/sheets.mjs 5 0 1200 es   # review contact sheets -> out/review/sheets
```

## Where things live
| What | File |
|---|---|
| All on-screen text, per language (+ small layout tweaks) | `src/lib/copy.ts` |
| Scene timing (all frames) | `src/lib/theme.ts` → `T` |
| Colors, fonts, safe margins | `src/lib/theme.ts` |
| Hook + idea scenes | `src/scenes/Scenes12.tsx` |
| App demo (check → photo → approve) | `src/scenes/Scene3.tsx` |
| Study bars + closing card | `src/scenes/Scenes45.tsx` |
| Couple (vector) + their poses through the story | `src/components/Character.tsx`, `src/components/Cast.tsx` |
| Paper board, sticker border, tape, torn notes | `src/components/Paper.tsx` |
| Music + sound-effect cue sheet | `src/SimulPromo.tsx` |

Safe area: text stays within x 230–1690 and y 130–880 (design px), leaving the bottom ~170 px clear for player controls; the camera drift is capped at a 2% zoom.

## Assets & licenses
- **App screens** (`public/screens/home.png`, `proof-review.png`, `es-01-home.png`, `es-06-proof-review.png`, `reading-photo.png`): real simulator captures of Simul in its demo mode (sample data "Thomas & Emily", no Supabase), from the `store-screenshots` branch. The only edits are animated overlays: the "Read 20 pages" row reuses the app's own checked box from "Morning run" plus the strikethrough.
- **Music**: "Acoustic Folk" by PaulYudin, Pixabay Content License (free commercial use, no attribution required) — https://pixabay.com/music/upbeat-acoustic-folk-160684/. Note: the track is registered with YouTube Content ID, so a YouTube upload may get an automatic claim (not an issue on LinkedIn).
- **Entrance sound**: "Clean Minimal Pop" by DRAGON-STUDIO, Pixabay Content License — https://pixabay.com/sound-effects/clean-minimal-pop-467466/
- **Tap + approval ding** (`public/sfx/tap.wav`, `check.wav`): synthesized by `scripts/make_sfx.py`.
- **Fonts**: Lora, Nunito, Caveat — SIL Open Font License (loaded via `@remotion/google-fonts`).
- **Characters / icons**: original vector shapes drawn in code.
- **Remotion**: free for individuals and companies with up to 3 employees (see remotion.dev/license).

## Study wording
Spanish: "¿Quiénes cumplieron (o casi) sus metas?", "70%+ · Compartieron cada semana con un amigo", "menos de la mitad · Solo lo pensaron".

Scene 4 says "Who met or nearly met their goals?", with bars labelled "70%+" (shared progress weekly with a friend) and "under half" (only thought about it), and the source "Gail Matthews, Dominican University of California". The bars are deliberately not to scale.
