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

---

# Second video: editorial promo (1920×1080, 30 fps, 38 s)

A separate, minimal "editorial" film: off-white background, Lora headlines, Nunito labels, a flat iPhone with the real app screens, and the two photo avatars. It lives in its own files and does not touch `SimulPromo` / `SimulPromoES`. English first; the Spanish composition (`SimulEditorialES`) is added once the English video is approved (its copy is already drafted in the copy file).

## Render
```bash
npm install
npm run editorial:assets   # face crops + app screens with the photo avatars (needs Python 3 + Pillow)
npm run editorial:render   # -> out/simul-editorial-en.mp4
npm run editorial:stills   # -> out/keyframes-editorial-en/*.png (one or two per scene)
npm run editorial:sheets   # -> out/review/sheets/ed-en-sheet-*.jpg (every 5th frame, for review)
COMP=SimulEditorial node scripts/keyframes.mjs out/review 1 258 264 270   # full-size stills of given frames
```
`remotion studio src/index.ts` previews it (composition `SimulEditorial`). If Remotion cannot download its own browser, point it at a local Chrome: `--browser-executable=/path/to/chrome` for `remotion render`, `BROWSER_EXECUTABLE=/path/to/chrome` for the two scripts.

## Where things live
| What | File |
|---|---|
| All on-screen text per language, plus copy-dependent sizes | `src/lib/editorialCopy.ts` |
| Timeline (`TE`), sound-cue frames (`CUE`), palette, fonts, safe area | `src/editorial/theme.ts` |
| The five scenes and the shared avatar pair | `src/editorial/Scenes.tsx` |
| Headline mask reveal, avatar, iPhone frame, screenshot helpers | `src/editorial/ui.tsx` |
| Camera drift, music and sound-effect cue sheet | `src/SimulEditorial.tsx` |
| Review contact sheet | `src/EditorialSheet.tsx` |
| Avatar crops and screen overlays | `scripts/make_editorial_assets.py` |

Text stays within x 230–1690 and y 130–880; the camera only zooms 1.5% over the whole video.

## What is real and what is drawn
- The phone shows the real demo-mode captures (`public/screens/home.png`, `proof-review.png`). **Avatars: overlay route.** The captures were taken with initial circles (T / E); `scripts/make_editorial_assets.py` places the circular photos exactly over those circles (the app shows a member's photo in place of the initial) and writes `public/screens/editorial/en-home.png` and `en-proof.png`. Once the demo mode can show the photos itself, re-capture and replace those two files.
- Animated overlays on the captures: the "Read 20 pages" row gets the app's own checked box (copied from "Morning run"), the strikethrough and the "2/2" count; the mailbox badge pulses once; a tap ripple on Approve; the chip changes to the app's "Approved" chip (label and colours from `ProofCard.tsx`). The large green check over the photo is a film overlay, not app UI.
- The demo captures show "Read 20 pages" as Thomas's own habit on Home and as the shared photo habit in the Proof scene; the film joins the two into one flow.

## Study scene (scene 4)
Source: Jackson SE, Steptoe A, Wardle J. "The Influence of Partner's Behavior on Health Behavior Change: The English Longitudinal Study of Ageing." JAMA Internal Medicine, 2015. 3,722 married or cohabiting adults. Among people whose partner became physically active, about two in three also became active (67% of men, 66% of women); when the partner stayed inactive, about one in four did (26% of men, 24% of women). The rows show 8 of 12 and 3 of 12 pairs. It is an observational study: the wording says "usually follows", never "causes", Simul is not part of it, and the smoking figures are not used.

## Assets & licenses (editorial promo)
- **Profile photos** (`public/avatars/thomas.jpg`, `emily.jpg` and the `*-face.jpg` crops made from them): Pexels photos 16120642 (Thomas) and 16105527 (Emily), Pexels License (free commercial use, no attribution required). Cropped to the face; no logo is readable.
- **App screens** (`public/screens/…`): real simulator captures of Simul in its demo mode (sample data, no Supabase), from the `store-screenshots` branch. The proof photo in them is the app's bundled demo image (`assets/demo/reading.png` on that branch).
- **App icon** (`public/icon.png`): Simul's own icon.
- **Sound effect**: "Clean Minimal Pop" by DRAGON-STUDIO, Pixabay Content License — https://pixabay.com/sound-effects/clean-minimal-pop-467466/ (first 0.16 s of silence skipped). Used on four beats only.
- **Tap and confirmation chime** (`public/sfx/tap.wav`, `check.wav`): synthesized by `scripts/make_sfx.py`, no third-party samples.
- **Music**: not chosen yet (`MUSIC` in `src/SimulEditorial.tsx` is `null`); the track and its license go here once picked.
- **Fonts**: Lora and Nunito, SIL Open Font License, loaded with `@remotion/google-fonts`.
- **Remotion** 4.0.538: free for individuals and companies with up to 3 employees (remotion.dev/license).
