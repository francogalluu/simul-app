import React from 'react';
import { AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { EditorialLang, Lang } from './lib/editorialCopy';
import { C, CUE, TE } from './editorial/theme';
import { AvatarPair, Closing, CoreLoop, Hook, Idea, Study } from './editorial/Scenes';

/** Very slow push-in: 1.5% over the whole video. */
const Camera: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const f = useCurrentFrame();
  return <AbsoluteFill style={{ transform: `scale(${interpolate(f, [0, TE.end], [1, 1.015])})` }}>{children}</AbsoluteFill>;
};

// Music: set to a file under public/audio once a track is chosen (see README). null = no music.
const MUSIC: string | null = null;
const MUSIC_VOLUME = 0.5;

// Sound cues: [frame, sound, volume]. 'pop' = "Clean Minimal Pop" (Pixabay), only on the main beats.
// 'tap' and 'check' are synthesized (scripts/make_sfx.py).
const POP = 'sfx/dragon-studio-clean-minimal-pop-467466.mp3';
const CUES: [number, 'pop' | 'tap' | 'check', number, number?][] = [
  [CUE.meet, 'pop', 0.2, 1], // avatars meet
  [CUE.check, 'pop', 0.24, 1.06], // checkbox
  [CUE.badge, 'pop', 0.2, 0.94], // notification
  [CUE.tap, 'tap', 0.4],
  [CUE.approve, 'pop', 0.24, 1.03], // approve
  [CUE.approve + 1, 'check', 0.3], // soft confirmation chime
];

export const SimulEditorial: React.FC<{ lang: Lang }> = ({ lang }) => (
  <EditorialLang.Provider value={lang}>
    <AbsoluteFill style={{ background: C.bg2 }}>
      <Camera>
        <AbsoluteFill style={{ background: `linear-gradient(${C.bg}, ${C.bg2})` }} />
        <Hook />
        <Idea />
        <CoreLoop />
        <AvatarPair />
        <Study />
        <Closing />
      </Camera>
      {MUSIC && (
        <Audio
          src={staticFile(MUSIC)}
          volume={(f) => interpolate(f, [0, 20, TE.end - 60, TE.end - 3], [0, MUSIC_VOLUME, MUSIC_VOLUME, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })}
        />
      )}
      {CUES.map(([at, name, vol, rate], i) => (
        <Sequence key={i} from={at} durationInFrames={45} layout="none">
          {name === 'pop' ? (
            // the file starts with ~0.16 s of silence: skip 5 frames so the pop lands on the cue
            <Audio src={staticFile(POP)} volume={vol} startFrom={5} playbackRate={rate ?? 1} />
          ) : (
            <Audio src={staticFile(`sfx/${name}.wav`)} volume={vol} />
          )}
        </Sequence>
      ))}
    </AbsoluteFill>
  </EditorialLang.Provider>
);
