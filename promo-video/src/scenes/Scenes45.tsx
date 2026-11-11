import React from 'react';
import { Img, staticFile, useCurrentFrame } from 'remotion';
import { liftOut, paperShadow, ramp, stickIn } from '../lib/anim';
import { C, hand, sans, serif, T } from '../lib/theme';
import { ThoughtCloud } from '../components/Icons';
import { Stick, Tape, TornNote } from '../components/Paper';
import { Placed } from '../components/Cast';
import { useCopy } from '../lib/copy';

const BASE_Y = 760; // bars stand on this line
const BAR_W = 270;
// Deliberately NOT to scale: the comparison figure varies by source, so the short bar only reads as "clearly less".
const BAR_STYLE = [
  { h: 360, color: C.accent, at: T.s4 + 40 },
  { h: 185, color: '#E3C6A6', at: T.s4 + 52 },
];

/** Scene 4 — Why it works (Gail Matthews, Dominican University of California). */
export const Scene4: React.FC = () => {
  const f = useCurrentFrame();
  const c = useCopy();
  if (f < T.s4 || f >= T.s5) return null;
  const out = T.s5 - 14;
  const BARS = c.bars.map((b, i) => ({ ...b, ...BAR_STYLE[i] }));
  return (
    <>
      <Stick start={T.s4 + 6} end={out} cx={960} cy={180} outline="stkS">
        <div style={{ fontFamily: serif, fontWeight: 700, fontSize: c.questionSize, color: C.ink, whiteSpace: 'nowrap', padding: '4px 12px 12px' }}>
          {c.question}
        </div>
      </Stick>
      <Stick start={T.s4 + 16} end={out} cx={960} cy={248}>
        <div style={{ fontFamily: sans, fontWeight: 600, fontSize: 27, color: C.ink500, whiteSpace: 'nowrap' }}>
          {c.source}
        </div>
      </Stick>

      {/* torn paper ground line */}
      <Stick start={T.s4 + 26} end={out} cx={960} cy={BASE_Y + 9} fromScale={1.05}>
        <div style={{ width: 760, height: 18, background: '#FFFDF7', clipPath: 'polygon(0 30%,8% 0,20% 25%,33% 5%,47% 30%,60% 0,74% 28%,88% 6%,100% 26%,100% 100%,0 100%)' }} />
      </Stick>

      {BARS.map((b, i) => {
        const grow = ramp(f, b.at, b.at + 26);
        const o = liftOut(f, out);
        const a = stickIn(f, b.at, { fromScale: 1.04, fromRot: 0 });
        if (!a.visible || o.gone) return null;
        const h = b.h * grow;
        return (
          <React.Fragment key={i}>
            <div
              style={{
                position: 'absolute',
                left: b.cx - BAR_W / 2,
                top: BASE_Y - h,
                width: BAR_W,
                height: h,
                background: b.color,
                borderRadius: '10px 10px 0 0',
                boxShadow: '0 0 0 9px #FFFEFA',
                opacity: a.opacity * o.opacity,
                filter: paperShadow(Math.max(a.lift, o.lift) * 0.6),
                transform: `translateY(${o.y}px)`,
                backgroundImage: 'repeating-linear-gradient(135deg, rgba(255,255,255,0.12) 0 14px, rgba(255,255,255,0) 14px 28px)',
              }}
            />
            {grow > 0.15 && (
              <div style={{ position: 'absolute', left: b.cx - 60, top: BASE_Y - h - 14, transform: `rotate(${i ? 4 : -4}deg) translateY(${o.y}px)`, opacity: o.opacity }}>
                <Tape w={120} h={34} />
              </div>
            )}
          </React.Fragment>
        );
      })}

      {BARS.map((b, i) => (
        <React.Fragment key={`t${i}`}>
          <Stick start={b.at + 24} end={out} cx={b.cx} cy={BASE_Y - b.h - 62} rotate={i ? 3 : -3} fromScale={1.5}>
            <div style={{ fontFamily: hand, fontWeight: 700, fontSize: i ? 64 : 84, color: i ? C.ink700 : C.accentDeep, whiteSpace: 'nowrap', lineHeight: 1 }}>{b.value}</div>
          </Stick>
          <Stick start={b.at + 8} end={out} cx={b.cx} cy={BASE_Y + 72}>
            <div style={{ fontFamily: sans, fontWeight: 800, fontSize: c.barLabelSize, color: C.ink, textAlign: 'center', lineHeight: 1.18, whiteSpace: 'nowrap' }}>
              {b.label[0]}
              <br />
              {b.label[1]}
            </div>
          </Stick>
        </React.Fragment>
      ))}

      {/* small couple cheering beside the tall bar, a thought cloud by the short one */}
      <Placed who="thomas" x={BARS[0].cx - 328} bottom={BASE_Y + 4} scale={0.44} enter={T.s4 + 78} exit={out} poses={[[0, 'cheer']]} blinkSeed={1} />
      <Placed who="emily" x={BARS[0].cx - 222} bottom={BASE_Y + 4} scale={0.44} enter={T.s4 + 84} exit={out} poses={[[0, 'cheer']]} blinkSeed={4} />
      <Stick start={T.s4 + 92} end={out} cx={c.cloud.cx} cy={c.cloud.cy} rotate={4} outline="stk">
        <ThoughtCloud size={170} />
      </Stick>
    </>
  );
};

/** Scene 5 — Logo, tagline, "Now on the App Store". */
export const Scene5: React.FC = () => {
  const f = useCurrentFrame();
  const c = useCopy();
  if (f < T.s5) return null;
  const btn = stickIn(f, T.s5 + 58, { fromScale: 1.25, fromRot: -4 });
  const pulse = f > T.s5 + 100 ? 1 + 0.018 * Math.sin((f - T.s5 - 100) / 7) : 1;
  return (
    <>
      <Stick start={T.s5 + 8} cx={720} cy={420} rotate={-4} fromRot={-14}>
        <div style={{ position: 'relative' }}>
          <Img src={staticFile('icon.png')} style={{ width: 190, height: 190, borderRadius: 44, boxShadow: '0 0 0 10px #FFFEFA', display: 'block' }} />
          <div style={{ position: 'absolute', left: -26, top: -10, transform: 'rotate(-34deg)' }}>
            <Tape w={100} h={34} />
          </div>
        </div>
      </Stick>
      <Stick start={T.s5 + 16} cx={1070} cy={414} outline="stkS" fromRot={3}>
        <div style={{ fontFamily: serif, fontWeight: 700, fontSize: 170, color: C.ink, lineHeight: 1, padding: '6px 16px 26px', letterSpacing: -2 }}>Simul</div>
      </Stick>
      <Stick start={T.s5 + 34} cx={960} cy={604} rotate={-1.5}>
        <TornNote seed={31} size={64} padX={34}>
          {c.tagline}
        </TornNote>
      </Stick>
      {btn.visible && (
        <div
          style={{
            position: 'absolute',
            left: 960,
            top: 744,
            transform: `translate(-50%,-50%) rotate(${btn.rot}deg) scale(${btn.scale * pulse})`,
            opacity: btn.opacity,
            filter: paperShadow(btn.lift),
          }}
        >
          <div
            style={{
              background: C.ink,
              color: '#FFFDF7',
              fontFamily: sans,
              fontWeight: 800,
              fontSize: 48,
              padding: '24px 56px 26px',
              borderRadius: 999,
              boxShadow: '0 0 0 9px #FFFEFA',
              whiteSpace: 'nowrap',
            }}
          >
            {c.cta}
          </div>
        </div>
      )}
      <Placed who="thomas" x={360} bottom={930} scale={0.7} enter={T.s5 + 44} poses={[[0, 'idle'], [T.s5 + 60, 'wave'], [T.s5 + 150, 'idle']]} look={1} blinkSeed={2} />
      <Placed who="emily" x={1560} bottom={930} scale={0.7} enter={T.s5 + 50} poses={[[0, 'idle'], [T.s5 + 66, 'wave'], [T.s5 + 156, 'idle']]} look={1} flip blinkSeed={5} />
    </>
  );
};
