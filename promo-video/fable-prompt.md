# Prompt: Simul promo video #2 (editorial minimal)

Paste everything below the line into a new Claude Fable session opened in `/Users/roccogalluzzo/code/simul-app`.

---

Create a new promo video for **Simul**, a habit-building app for two people that is now live on the App Store.

**Language order: English first, Spanish later.**
- Build, review and iterate on the **English version only**. Do not capture Spanish screens, write Spanish layouts or render anything in Spanish until I have approved the final English video.
- Then make the Spanish version with identical timing, in Rioplatense voseo to match the app's own Spanish UI ("Vos", "Hacé", "Mandá").
- The Spanish copy is drafted below so the layout can leave room for it. Keep all text in a per-language copy file (like `src/lib/copy.ts`) from the start, so adding Spanish later is only translation plus layout checks.

**Format:** 1920×1080, 16:9, 30 fps, 35–40 seconds.

## Step 1: storyboard first
Before building anything, show me a scene-by-scene storyboard in English (what appears, what moves, the on-screen text, and the duration of each scene), plus 2–3 still mock frames of the key scenes. Wait for my approval. Do not spend any money and do not download anything until I approve.

## What already exists (reuse it)
- `promo-video/` is a Remotion 4.0.538 project from the first promo video (a paper-collage style). Read its `README.md`.
  - Reuse its tooling: `scripts/keyframes.mjs` (stills), `scripts/sheets.mjs` with `src/ContactSheet.tsx` (contact sheets for frame-by-frame review), and the `copy.ts` per-language pattern.
  - Build this video as **new compositions** (e.g. `SimulEditorial` and `SimulEditorialES`) in new files. Leave the existing `SimulPromo` and `SimulPromoES` compositions untouched.
- **Real app screens:** the `store-screenshots` branch has a demo mode (`EXPO_PUBLIC_DEMO=1`, plus `EXPO_PUBLIC_DEMO_LANG=es` and `EXPO_PUBLIC_DEMO_SCENE=proof`).
  - It shows only sample data (Thomas & Emily) and never talks to Supabase. Its raw simulator captures are in `store-screenshots/raw/` and `raw-es/` on that branch.
  - Never sign in to a real account or show production data.
- **Profile photos (new):** `promo-video/public/avatars/thomas.jpg` and `emily.jpg` are 512×512 square face crops. The originals sit next to them.
  - Sources: Pexels photos 16120642 (Thomas) and 16105527 (Emily), under the Pexels License (free commercial use, no attribution).
  - In the existing captures, the app shows colored circles with initials (T blue `#6F9BC7`, E pink `#D9739E`). In this video, Thomas and Emily must show **these photos** instead.
  - **Preferred way:** on a new branch off `store-screenshots`, make the demo mode set the two members' avatars to the bundled photos. Members have an `avatarPath`; check how `src/components/Avatar.tsx` and `src/lib/people.ts` resolve it, and add a demo-only local-image path. Then re-capture the Home and Proof screens in the booted iOS simulator with demo mode on: English now, Spanish (`EXPO_PUBLIC_DEMO_LANG=es`) only once the English video is approved.
  - **Fallback**, only if that is not reasonably possible: overlay the circular photos exactly over the initial circles in the existing captures. Tell me which way you took.
  - Thomas's T-shirt has brand logos. Keep his avatar cropped to the face so no logo is readable.
- **Sound effect already licensed:** `promo-video/public/sfx/dragon-studio-clean-minimal-pop-467466.mp3` ("Clean Minimal Pop" by DRAGON-STUDIO, Pixabay Content License). Its first 0.16 s is silence, so trim that.

## Visual style: editorial minimal, light, modern, professional
- **Background:** flat warm off-white (Simul `bg` `#FAF6EE`), optionally with a very subtle vertical gradient to `#F6EFE4`. No paper texture, no collage, no stickers, no tape.
- **Palette** (from `src/lib/simulTheme.ts`):
  - ink `#262019`, ink500 `#7A7166`, line `#E4E1DB`
  - accent green `#6bb290`, accentDeep `#4F9B6E`
  - Thomas blue `#6F9BC7`, Emily pink `#D9739E`
  - Use color sparingly: mostly ink on off-white, with green only for progress and approval.
- **Type:**
  - **Lora** for headlines: 700 or 600 weight, large (88–120 px), tight tracking, sentence case.
  - **Nunito** for supporting lines and labels: 600–800 weight.
  - No handwritten fonts. Both fonts are under the SIL Open Font License, loaded with `@remotion/google-fonts`.
- **Layout:** generous whitespace, one idea per scene, strong left alignment or a clean center, and thin 1–2 px hairlines as structure. Think Apple, Linear or Notion launch films.
- **The phone:** a clean, realistic but flat iPhone frame (thin dark bezel, Dynamic Island) with a soft, low shadow, showing the real screenshots.
  - To focus on a detail, do a smooth camera push-in on the phone or a crisp scaled crop of the real UI. No sticker callouts.
- **Motion:**
  - Calm and precise: fades combined with 12–24 px slides, mask reveals for headlines (line by line), and gentle ease-in-out curves.
  - Every element settles in about 0.4–0.6 s. Nothing bounces, wobbles or spins.
  - Transitions: soft cross-dissolves or shared-element moves (for example, the avatar pair carries from one scene to the next).
  - A very slow camera drift, at most 1.5% zoom over the whole video.
- **Avatars:** circular photos with a 3 px ring in each person's color, shown as a slightly overlapping pair like the app's "Thomas & Emily" chip. They are the only people in the video: no illustrated characters and no other photos of people.

## Storyboard to start from (adjust timing if needed)
1. **Hook (0:00–0:04).** Headline, revealed line by line: EN "Habits are hard / to keep alone." · ES "Los hábitos cuestan / cuando estás solo." A single thin line draws under it.
2. **The idea (0:04–0:09).** The two avatars slide in from opposite sides and meet as the overlapping pair chip, labeled "Thomas & Emily". Headline: EN "Build them together." · ES "Construilos juntos."
3. **The core loop (0:09–0:22).** The phone sits on the right, with a three-step list on the left in Nunito. The active step is in ink and the others are muted ink500:
   - **Steps:** EN "1 Do your habit · 2 Send a photo · 3 Your partner approves" · ES "1 Hacé tu hábito · 2 Mandá una foto · 3 Tu pareja aprueba".
   - **3a.** Push in on the "Read 20 pages" / "Leer 20 páginas" row; its checkbox fills (reuse the app's real checked-box look).
   - **3b.** The phone switches to Emily's Proof screen with the reading photo. A small notification badge appears.
   - **3c.** A clean tap ripple on Approve / Aprobar, then a single green check mark. A clean pop on the check, and that's it.
   - Do not invent screens or features the app does not have.
4. **Why it works (0:22–0:31).** The study scene, specified below.
5. **Closing (0:31–0:38).** The Simul app icon (`promo-video/public/icon.png`) and the Lora "Simul" wordmark, the tagline EN "Build habits, together." · ES "Hábitos, juntos.", and a dark pill EN "Now on the App Store" · ES "Ya en el App Store". Hold for at least 2.5 s. No Apple logo and no URL.

## The study scene (scene 4), exact content
Source: **Jackson, Steptoe & Wardle (2015), "The Influence of Partner's Behavior on Health Behavior Change", JAMA Internal Medicine.** 3,722 married or cohabiting adults (English Longitudinal Study of Ageing). Among people whose partner became physically active, about two in three also became active (67% of men, 66% of women). Among those whose partner stayed inactive, about one in four did (26% of men, 24% of women).

- **Headline:** EN "When one partner gets moving, the other usually follows." · ES "Cuando uno de la pareja se mueve, el otro suele seguirlo."
- **Visual:** two rows of 12 small couple pairs (two overlapping circles each, neutral outline) that fill in one by one in accent green:
  - Row 1, label EN "Partner became active" · ES "Su pareja empezó a moverse": 8 of 12 fill, with "2 in 3" / "2 de cada 3" at the end of the row.
  - Row 2, label EN "Partner stayed inactive" · ES "Su pareja siguió inactiva": 3 of 12 fill, with "1 in 4" / "1 de cada 4".
- **Source line, small, in ink500:** EN "Jackson, Steptoe & Wardle, JAMA Internal Medicine (2015) · 3,722 adults in couples" · ES "Jackson, Steptoe y Wardle, JAMA Internal Medicine (2015) · 3.722 adultos en pareja".
- **Accuracy rules:**
  - It is an observational study. Say "usually follows" or "far more likely", never "causes".
  - Never imply Simul was part of the study, and never put the app UI inside this scene.
  - Do not use the study's smoking figures (sources disagree on them).
  - Do not round up beyond "2 in 3" and "1 in 4".
- It must be readable without sound in about 3 seconds.

## Sound
- No voice-over. The video must work muted, since many viewers on LinkedIn watch without sound.
- **Music:** find one light, modern, minimal instrumental track (soft piano, plucks or light electronic; not ukulele or "kids" music) under a license that allows commercial use with no attribution, such as the Pixabay Content License or CC0.
  - Before downloading, show me 2–3 options with the exact title, artist, license and link, and say whether each is registered with YouTube Content ID.
- **Sound effects:** use the Clean Minimal Pop sparingly, only on the main beats (avatars meeting, checkbox, notification, approve), at low volume. Add one soft confirmation chime on approval; synthesize it or ask me first.

## Layout rules
- All text must stay within x 230–1690 and y 130–880 in design space. That keeps the bottom ~170 px clear for player controls and accounts for the camera drift.
- No cut-off text and no overlapping elements. Spanish runs longer than English, so leave room in the English layout and size or wrap per language in the copy file, the way `copy.ts` does in the existing project.

## Quality and review
- Professional production value; take your time.
- After rendering, review the video frame by frame: contact sheets every 5 frames, plus full-resolution stills at every transition. Fix cut-off text, overlaps, jumpy motion and anything that reads poorly.
- Check that no audio clips (peak below −1 dBFS) and that the music sits under the effects.
- Use only assets that are free to use under a proper license, and list every asset and its license in the README.

## Budget
- Maximum total spend is $10, and ask me before spending anything. The expected cost is $0.
- Do not use paid voice, stock or image-generation services without asking. Do not generate images of people.

## Deliverables
**Round 1 (English):**
1. `promo-video/out/simul-editorial-en.mp4`.
2. `promo-video/out/keyframes-editorial-en/`, with one or two key frames per scene.

Iterate with me on the English version until I approve it.

**Round 2 (Spanish, only after approval):**
1. `promo-video/out/simul-editorial-es.mp4`.
2. `promo-video/out/keyframes-editorial-es/`, reviewed frame by frame like the English version.

**Both rounds:**
- The source in `promo-video/` (new compositions plus the README updated with how to render them), committed on a new branch. Do not push without asking.
- If you changed the demo mode, commit it on its own branch off `store-screenshots`, and tell me its name.
