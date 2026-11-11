import React from 'react';
import { useCurrentFrame } from 'remotion';
import { ramp } from '../lib/anim';
import { C, serif, T } from '../lib/theme';
import { Heart, Pan, Shoe } from '../components/Icons';
import { Stick, Tape, TornNote } from '../components/Paper';
import { useCopy } from '../lib/copy';

export const headline: React.CSSProperties = {
  fontFamily: serif,
  fontWeight: 700,
  fontSize: 112,
  lineHeight: 1,
  color: C.ink,
  whiteSpace: 'nowrap',
  letterSpacing: -1,
  padding: '6px 14px 18px',
};

/** Scene 1 — Hook: "Building habits alone is hard." */
export const Scene1: React.FC = () => {
  const f = useCurrentFrame();
  const c = useCopy();
  if (f >= T.s2) return null;
  const out = T.s2 - 14;
  const droop = ramp(f, 96, 118);
  const xDraw = ramp(f, 84, 96);
  return (
    <>
      <Stick start={16} end={out} cx={216} cy={392} anchor="left" outline="stkS" fromRot={-3}>
        <div style={headline}>{c.hook[0]}</div>
      </Stick>
      <Stick start={24} end={out + 2} cx={216} cy={516} anchor="left" outline="stkS" fromRot={3}>
        <div style={headline}>{c.hook[1]}</div>
      </Stick>

      {/* habit icons that droop once the streak breaks */}
      <Stick start={38} end={out} cx={1215} cy={262} rotate={-12 + droop * 22} outline="stk" style={{ marginTop: droop * 36 }}>
        <div style={{ filter: `saturate(${1 - droop * 0.45})` }}>
          <Shoe size={150} />
        </div>
      </Stick>
      <Stick start={46} end={out} cx={1640} cy={268} rotate={10 - droop * 24} outline="stk" style={{ marginTop: droop * 40 }}>
        <div style={{ filter: `saturate(${1 - droop * 0.45})` }}>
          <Pan size={150} />
        </div>
      </Stick>

      {/* streak note: Day 1 ✓ Day 2 ✓ Day 3 ✗ */}
      <Stick start={62} end={out + 4} cx={232} cy={712} anchor="left" rotate={-2}>
        <div style={{ position: 'relative' }}>
          <TornNote seed={5} size={58} lined>
            <span>{c.day} 1 <span style={{ color: C.accentDeep }}>✓</span></span>
            <span style={{ marginLeft: 40 }}>{c.day} 2 <span style={{ color: C.accentDeep }}>✓</span></span>
            <span style={{ marginLeft: 40, position: 'relative', color: C.ink500 }}>
              {c.day} 3
              <svg width={120} height={80} viewBox="0 0 120 80" style={{ position: 'absolute', left: -14, top: -6, overflow: 'visible' }}>
                <path d="M8 10 L108 70" stroke={C.danger} strokeWidth={8} strokeLinecap="round" fill="none" strokeDasharray={120} strokeDashoffset={120 * (1 - Math.min(1, xDraw * 2))} />
                <path d="M108 8 L10 72" stroke={C.danger} strokeWidth={8} strokeLinecap="round" fill="none" strokeDasharray={120} strokeDashoffset={120 * (1 - Math.max(0, xDraw * 2 - 1))} />
              </svg>
            </span>
          </TornNote>
          <div style={{ position: 'absolute', left: -28, top: -18, transform: 'rotate(-28deg)' }}>
            <Tape w={110} h={36} />
          </div>
        </div>
      </Stick>
    </>
  );
};

/** Scene 2 — The idea: do it with someone close to you. */
export const Scene2: React.FC = () => {
  const f = useCurrentFrame();
  const c = useCopy();
  if (f < T.s2 || f >= T.s3a) return null;
  const out = T.s3a - 14;
  return (
    <>
      <Stick start={T.s2 + 6} end={out} cx={216} cy={392} anchor="left" outline="stkS" fromRot={-3}>
        <div style={headline}>{c.idea[0]}</div>
      </Stick>
      <Stick start={T.s2 + 13} end={out + 2} cx={216} cy={516} anchor="left" outline="stkS" fromRot={3}>
        <div style={headline}>{c.idea[1]}</div>
      </Stick>
      <Stick start={T.s2 + 52} end={out + 4} cx={240} cy={700} anchor="left" rotate={-2.5}>
        <div style={{ position: 'relative' }}>
          <TornNote seed={9} size={62}>
            {c.ideaNote}
          </TornNote>
          <div style={{ position: 'absolute', right: -30, top: -16, transform: 'rotate(24deg)' }}>
            <Tape w={110} h={36} />
          </div>
        </div>
      </Stick>
      <Stick start={T.s2 + 46} end={out} cx={1370} cy={250} rotate={-6} outline="stk" fromScale={1.6}>
        <div style={{ transform: `scale(${1 + 0.05 * Math.sin((f - T.s2) / 5)})` }}>
          <Heart size={96} />
        </div>
      </Stick>
    </>
  );
};
