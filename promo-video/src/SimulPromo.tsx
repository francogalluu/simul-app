import React from 'react';
import { AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { PaperBackground, StickerDefs } from './components/Paper';
import { StoryCast } from './components/Cast';
import { Scene1, Scene2 } from './scenes/Scenes12';
import { Scene3, S3_CUES } from './scenes/Scene3';
import { Scene4, Scene5 } from './scenes/Scenes45';
import { T } from './lib/theme';
import { Lang, LangContext } from './lib/copy';

/** Very gentle camera: a 2% push-in over the whole piece plus a slow drift. */
const Camera: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const f = useCurrentFrame();
  const zoom = interpolate(f, [0, T.end], [1, 1.02]);
  const dx = Math.sin(f / 140) * 5;
  const dy = Math.cos(f / 170) * 3;
  return <AbsoluteFill style={{ transform: `translate(${dx}px, ${dy}px) scale(${zoom})` }}>{children}</AbsoluteFill>;
};

// Sound cues: [frame, sound, volume]. 'pop' = "Clean Minimal Pop" (Pixabay), only on the main pieces.
// 'tap' and 'check' are the synthesized finger tap and approval ding (scripts/make_sfx.py).
const POP = 'dragon-studio-clean-minimal-pop-467466.mp3';
const CUES: [number, 'pop' | 'tap' | 'check', number][] = [
  [6, 'pop', 0.16], // Thomas
  [16, 'pop', 0.14], // hook headline
  [62, 'pop', 0.13], // streak note
  [T.s2 + 6, 'pop', 0.14], // idea headline
  [T.s2 + 22, 'pop', 0.16], // Emily
  [T.s2 + 46, 'pop', 0.15], // heart
  [T.s3a + 10, 'pop', 0.14], // step 1 + phone
  [T.s3a + 36, 'pop', 0.13], // habit row
  [S3_CUES.check, 'pop', 0.24], // habit checked
  [T.s3b + 6, 'pop', 0.14], // step 2
  [S3_CUES.polaroid, 'pop', 0.15], // photo
  [S3_CUES.badge, 'pop', 0.2], // notification
  [T.s3c + 6, 'pop', 0.14], // step 3
  [T.s3c + 16, 'pop', 0.13], // approve card
  [S3_CUES.tap, 'tap', 0.5],
  [S3_CUES.approve, 'check', 0.6],
  [T.s4 + 6, 'pop', 0.14], // question
  [T.s4 + 40, 'pop', 0.13], // bar 1
  [T.s4 + 52, 'pop', 0.13], // bar 2
  [T.s5 + 8, 'pop', 0.16], // logo
  [T.s5 + 34, 'pop', 0.13], // tagline
  [T.s5 + 58, 'pop', 0.2], // App Store button
];
const RATES = [1, 0.94, 1.06, 0.97, 1.03];

export const SimulPromo: React.FC<{ lang: Lang }> = ({ lang }) => (
  <LangContext.Provider value={lang}>
  <AbsoluteFill style={{ background: '#F7E4D0' }}>
    <StickerDefs />
    <Camera>
      <PaperBackground />
      <Scene1 />
      <Scene2 />
      <Scene3 />
      <StoryCast />
      <Scene4 />
      <Scene5 />
    </Camera>

    {/* "Acoustic Folk" by PaulYudin — Pixabay Content License (pixabay.com/music/upbeat-acoustic-folk-160684) */}
    <Audio
      src={staticFile('audio/paulyudin-acoustic-folk-160684.mp3')}
      volume={(f) => interpolate(f, [0, 12, T.end - 75, T.end - 4], [0, 0.75, 0.75, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })}
    />
    {CUES.map(([at, name, vol], i) => (
      <Sequence key={i} from={at} durationInFrames={40} layout="none">
        {name === 'pop' ? (
          // the file has ~0.16 s of silence before the hit; skip it so the pop lands on the frame
          <Audio src={staticFile(`sfx/${POP}`)} volume={vol} startFrom={4} playbackRate={RATES[i % RATES.length]} />
        ) : (
          <Audio src={staticFile(`sfx/${name}.wav`)} volume={vol} />
        )}
      </Sequence>
    ))}
  </AbsoluteFill>
  </LangContext.Provider>
);
