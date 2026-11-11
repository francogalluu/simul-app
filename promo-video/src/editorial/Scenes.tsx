import React from 'react';
import { AbsoluteFill, Easing, Img, interpolate, interpolateColors, staticFile, useCurrentFrame } from 'remotion';
import { useEditorialCopy } from '../lib/editorialCopy';
import { C, CUE, EASE, EASE_OUT, SAFE, TE, XF, lerp, ramp, sans, sceneOpacity, serif } from './theme';
import { Avatar, IPhone, MaskLine, Patch, Shot, fadeUp, label } from './ui';

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

// ───────────────────────── 1 · Hook ─────────────────────────
export const Hook: React.FC = () => {
  const f = useCurrentFrame();
  const c = useEditorialCopy();
  if (f >= TE.s2 + XF) return null;
  const out = ramp(f, TE.s2 - XF, TE.s2);
  const blockH = c.hookSize * 1.1 * 2;
  const top = 500 - blockH / 2 - 30;
  return (
    <AbsoluteFill style={{ opacity: 1 - out, transform: `translateY(${-out * 12}px)` }}>
      <div style={{ position: 'absolute', left: SAFE.left, top }}>
        <MaskLine f={f} at={8} size={c.hookSize}>{c.hook[0]}</MaskLine>
        <MaskLine f={f} at={15} size={c.hookSize}>{c.hook[1]}</MaskLine>
      </div>
      <div style={{ position: 'absolute', left: SAFE.left, top: top + blockH + 64, height: 2, width: 520 * ramp(f, 36, 62), background: C.ink }} />
    </AbsoluteFill>
  );
};

// ───────────────────────── 2 · The idea ─────────────────────────
const PAIR = { cy: 352, size: 196, dx: 74 }; // big pair, centred on x 960
export const EYEBROW = { cx: 258, cy: 322, size: 56 }; // where the pair lands in scene 3

export const Idea: React.FC = () => {
  const f = useCurrentFrame();
  const c = useEditorialCopy();
  if (f < TE.s2 || f >= TE.s3a + XF) return null;
  const out = ramp(f, TE.s3a - XF, TE.s3a);
  return (
    <AbsoluteFill style={{ opacity: 1 - out, transform: `translateY(${-out * 12}px)` }}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 486, textAlign: 'center', ...label(32), ...fadeUp(f, CUE.meet + 4) }}>{c.pair}</div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 572 }}>
        <MaskLine f={f} at={CUE.meet + 14} size={c.ideaSize} align="center">{c.idea}</MaskLine>
      </div>
    </AbsoluteFill>
  );
};

/** The two avatars: slide in and meet (scene 2), then carry into scene 3 as the "whose phone" marker. */
export const AvatarPair: React.FC = () => {
  const f = useCurrentFrame();
  if (f < TE.s2 || f >= TE.s4 + XF) return null;
  const enter = ramp(f, TE.s2 + 4, CUE.meet + 2, EASE_OUT);
  const move = ramp(f, TE.s3a - 10, TE.s3a + 20); // shared-element move into scene 3
  const swap = ramp(f, TE.s3b + 22, TE.s3b + 36); // Thomas's phone -> Emily's phone
  const size = lerp(PAIR.size, EYEBROW.size, move);
  const cy = lerp(PAIR.cy, EYEBROW.cy, move);
  const tx = lerp(lerp(960 - PAIR.dx - 150, 960 - PAIR.dx, enter), EYEBROW.cx, move);
  const ex = lerp(lerp(960 + PAIR.dx + 150, 960 + PAIR.dx, enter), EYEBROW.cx, move);
  const sceneOut = 1 - ramp(f, TE.s4 - XF, TE.s4, Easing.linear);
  const gap = lerp(7, 0, move);
  return (
    <AbsoluteFill style={{ opacity: sceneOut }}>
      <Avatar who="thomas" size={size} cx={tx} cy={cy} opacity={enter * (1 - swap)} />
      <Avatar who="emily" size={size} cx={ex} cy={cy} opacity={move > 0 ? Math.max(1 - move * 1.25, swap) : enter} gap={swap > 0 ? 0 : gap} />
    </AbsoluteFill>
  );
};

// ───────────────────────── 3 · The core loop ─────────────────────────
const PH = { cx: 1330, cy: 540 };
const STEP_TOP = 394;
const STEP_H = 116;
const STEP_W = 640;

// Screenshot coordinates (1206 x 2622).
const BOX = { w: 80, h: 80 };
const BOX_EMPTY = { x: 1019, y: 1790 }; // "Read 20 pages" checkbox
const BOX_DONE = { x: 1019, y: 1597 }; // the app's real checked box, from "Morning run"
const TITLE = { x: 244, y: 1768, h: 62 };
const BADGE = { cx: 945.5, cy: 261.5, r: 31 };
const PHOTO = { x: 88, y: 1312, w: 1030, h: 773 };
const CHIP = { right: 1077, y: 2147, h: 72 };
const APPROVE = { x: 619, y: 2281, w: 459, h: 140 };

const StepList: React.FC = () => {
  const f = useCurrentFrame();
  const c = useEditorialCopy();
  const starts = [TE.s3a + 22, TE.s3b, TE.s3c];
  const ends = [TE.s3b, TE.s3c, TE.end];
  return (
    <div style={{ position: 'absolute', left: SAFE.left, top: STEP_TOP, width: STEP_W }}>
      {c.steps.map((text, i) => {
        const on = ramp(f, starts[i], starts[i] + 14) * (1 - ramp(f, ends[i], ends[i] + 14));
        const color = interpolateColors(on, [0, 1], ['#A9A197', C.ink]);
        return (
          <div key={i} style={{ position: 'absolute', top: i * STEP_H, left: 0, width: STEP_W, height: STEP_H, ...fadeUp(f, TE.s3a + 8 + i * 4) }}>
            <div style={{ position: 'absolute', left: 0, top: 0, width: STEP_W, height: 2, background: C.line }} />
            <div style={{ position: 'absolute', left: 0, top: 0, width: STEP_W * ramp(f, starts[i], starts[i] + 20), height: 2, background: C.ink, opacity: on }} />
            <div style={{ position: 'absolute', left: 0, top: 0, height: STEP_H, display: 'flex', alignItems: 'center' }}>
              <span style={{ ...label(24, 800, color), width: 60, position: 'relative', top: 5 }}>{i + 1}</span>
              <span style={{ ...label(c.stepSize, 700, color) }}>{text}</span>
            </div>
          </div>
        );
      })}
      <div style={{ position: 'absolute', left: 0, top: 3 * STEP_H, width: STEP_W, height: 2, background: C.line, ...fadeUp(f, TE.s3a + 20) }} />
    </div>
  );
};

const PhoneOwner: React.FC = () => {
  const f = useCurrentFrame();
  const c = useEditorialCopy();
  // one label leaves before the other arrives, so the two never overlap
  const out = ramp(f, TE.s3b + 18, TE.s3b + 28);
  const inn = ramp(f, TE.s3b + 28, TE.s3b + 40, EASE_OUT);
  const base: React.CSSProperties = { position: 'absolute', left: EYEBROW.cx + EYEBROW.size / 2 + 18, top: EYEBROW.cy - 20, height: 40, lineHeight: '40px', ...label(28) };
  const a = fadeUp(f, TE.s3a + 12, 12);
  return (
    <>
      <div style={{ ...base, opacity: Number(a.opacity) * (1 - out), transform: `translateY(${-out * 10}px) ${a.transform}` }}>{c.phoneOf[0]}</div>
      <div style={{ ...base, opacity: inn, transform: `translateY(${(1 - inn) * 10}px)` }}>{c.phoneOf[1]}</div>
    </>
  );
};

/** Thomas's Home with the "Read 20 pages" row checked: the app's own checked box, strikethrough and 2/2 count. */
const HomeScreen: React.FC = () => {
  const f = useCurrentFrame();
  const c = useEditorialCopy();
  const done = ramp(f, CUE.check, CUE.check + 12, EASE_OUT);
  const strike = ramp(f, CUE.check + 2, CUE.check + 16);
  return (
    <>
      <Shot src={c.screens.home} />
      {done > 0 && (
        <>
          <Patch src={c.screens.home} x={BOX_DONE.x} y={BOX_DONE.y} w={BOX.w} h={BOX.h} left={BOX_EMPTY.x} top={BOX_EMPTY.y} style={{ opacity: done, transform: `scale(${lerp(0.88, 1, done)})`, background: '#fff' }} />
          <div style={{ position: 'absolute', left: TITLE.x, top: TITLE.y, width: c.titleW, height: TITLE.h, background: `rgba(255,255,255,${0.5 * strike})` }} />
          <div style={{ position: 'absolute', left: TITLE.x, top: TITLE.y + TITLE.h / 2, width: c.titleW * strike, height: 4, background: C.muted }} />
          {/* "You 1/2" becomes 2/2 */}
          <div style={{ position: 'absolute', left: 1060, top: 1452, width: 80, height: 56, background: C.bg, opacity: done }} />
          <div style={{ position: 'absolute', right: 1206 - 1129, top: 1452, height: 56, lineHeight: '56px', fontFamily: sans, fontWeight: 600, fontSize: 40, color: C.tertiary, opacity: done }}>2/2</div>
        </>
      )}
    </>
  );
};

/** Emily's Proof sheet: badge pulse, tap on Approve, the app's "Approved" chip, one green check. */
const ProofScreen: React.FC<{ opacity: number; rise: number }> = ({ opacity, rise }) => {
  const f = useCurrentFrame();
  const c = useEditorialCopy();
  const pulse = interpolate(f, [CUE.badge, CUE.badge + 7, CUE.badge + 20], [0, 1, 0], { ...clamp, easing: EASE });
  const ring = ramp(f, CUE.badge, CUE.badge + 24, EASE_OUT);
  const press = interpolate(f, [CUE.tap, CUE.tap + 3, CUE.tap + 12], [0, 1, 0], clamp);
  const ripple = ramp(f, CUE.tap, CUE.tap + 20, EASE_OUT);
  const approved = ramp(f, CUE.approve - 4, CUE.approve + 8);
  const check = ramp(f, CUE.approve, CUE.approve + 14, EASE_OUT);
  const draw = ramp(f, CUE.approve + 4, CUE.approve + 18);
  const CHECK_R = 92;
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: 1206, height: 2622, opacity, transform: `translateY(${rise}px)` }}>
      <Shot src={c.screens.proof} />
      {/* notification badge on the mailbox: the real badge, pulsing once */}
      {f >= CUE.badge && ring < 1 && (
        <div style={{ position: 'absolute', left: BADGE.cx - BADGE.r, top: BADGE.cy - BADGE.r, width: BADGE.r * 2, height: BADGE.r * 2, borderRadius: '50%', border: '5px solid #C0463F', boxSizing: 'border-box', transform: `scale(${1 + ring * 1.5})`, opacity: (1 - ring) * 0.9 }} />
      )}
      {pulse > 0 && (
        <Patch src={c.screens.proof} x={BADGE.cx - BADGE.r} y={BADGE.cy - BADGE.r} w={BADGE.r * 2} h={BADGE.r * 2} left={BADGE.cx - BADGE.r} top={BADGE.cy - BADGE.r} style={{ borderRadius: '50%', transform: `scale(${1 + pulse * 0.32})` }} />
      )}
      {/* tap on Approve */}
      <div style={{ position: 'absolute', left: APPROVE.x, top: APPROVE.y, width: APPROVE.w, height: APPROVE.h, borderRadius: 999, overflow: 'hidden', background: `rgba(38,32,25,${0.12 * press})` }}>
        {f >= CUE.tap && ripple < 1 && (
          <div style={{ position: 'absolute', left: APPROVE.w / 2, top: APPROVE.h / 2, width: 60 + ripple * 420, height: 60 + ripple * 420, marginLeft: -(60 + ripple * 420) / 2, marginTop: -(60 + ripple * 420) / 2, borderRadius: '50%', background: `rgba(255,255,255,${0.34 * (1 - ripple)})` }} />
        )}
      </div>
      {/* "Waiting for approval" -> the app's "Approved" chip */}
      {approved > 0 && (
        <>
          <div style={{ position: 'absolute', left: 690, top: CHIP.y - 8, width: 400, height: CHIP.h + 16, background: '#fff', opacity: approved }} />
          <div style={{ position: 'absolute', right: 1206 - CHIP.right, top: CHIP.y, height: CHIP.h, lineHeight: `${CHIP.h}px`, padding: '0 30px', borderRadius: 999, background: C.accentSoft, color: C.accentDeep, fontFamily: sans, fontWeight: 800, fontSize: 33, opacity: approved }}>{c.approved}</div>
        </>
      )}
      {/* one green check */}
      {check > 0 && (
        <div style={{ position: 'absolute', left: PHOTO.x + PHOTO.w / 2 - CHECK_R, top: PHOTO.y + PHOTO.h / 2 - CHECK_R, width: CHECK_R * 2, height: CHECK_R * 2, borderRadius: '50%', background: C.accent, boxShadow: '0 0 0 9px rgba(255,255,255,0.92), 0 18px 40px rgba(0,0,0,0.28)', opacity: check, transform: `scale(${lerp(0.82, 1, check)})` }}>
          <svg width={CHECK_R * 2} height={CHECK_R * 2} viewBox="0 0 100 100">
            <path d="M29 52 L44 66 L72 36" fill="none" stroke="#fff" strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} />
          </svg>
        </div>
      )}
    </div>
  );
};

export const CoreLoop: React.FC = () => {
  const f = useCurrentFrame();
  if (f < TE.s3a - 4 || f >= TE.s4 + XF) return null;
  const opacity = 1 - ramp(f, TE.s4 - XF, TE.s4, Easing.linear);
  const phoneIn = fadeUp(f, TE.s3a + 4, 24, 18);
  // camera on the phone: push in on the habit row, back out, then in on the Proof sheet
  const inA = ramp(f, TE.s3a + 44, TE.s3a + 72) - ramp(f, TE.s3b - 8, TE.s3b + 18);
  const inC = ramp(f, TE.s3c + 6, TE.s3c + 34);
  const cam = inC > 0 ? { p: inC, scale: 1.5, fx: 603, fy: 1870 } : { p: inA, scale: 1.9, fx: 603, fy: 1700 };
  const swap = ramp(f, TE.s3b + 20, TE.s3b + 38);
  return (
    <AbsoluteFill style={{ opacity }}>
      <PhoneOwner />
      <StepList />
      <IPhone cx={PH.cx} cy={PH.cy} cam={cam} style={phoneIn}>
        <HomeScreen />
        {swap > 0 && <ProofScreen opacity={swap} rise={(1 - swap) * 60} />}
      </IPhone>
    </AbsoluteFill>
  );
};

// ───────────────────────── 4 · Why it works (study) ─────────────────────────
const PITCH = 88;
const DOT = 46;

const Couple: React.FC<{ fill: number }> = ({ fill }) => {
  const bg = interpolateColors(fill, [0, 1], [C.bg, C.accent]);
  const border = interpolateColors(fill, [0, 1], [C.outline, C.accentDeep]);
  const dot: React.CSSProperties = { position: 'absolute', top: 0, width: DOT, height: DOT, borderRadius: '50%', boxSizing: 'border-box', border: `2px solid ${border}`, background: bg };
  return (
    <div style={{ width: PITCH, height: DOT, position: 'relative', flex: 'none' }}>
      <div style={{ ...dot, left: 0 }} />
      <div style={{ ...dot, left: 28 }} />
    </div>
  );
};

export const Study: React.FC = () => {
  const f = useCurrentFrame();
  const c = useEditorialCopy();
  if (f < TE.s4 - XF || f >= TE.s5 + XF) return null;
  const t0 = TE.s4;
  const rowAt = [t0 + 44, t0 + 104];
  return (
    <AbsoluteFill style={{ opacity: sceneOpacity(f, TE.s4 - XF, TE.s5) }}>
      <div style={{ position: 'absolute', left: SAFE.left, top: 138 }}>
        <MaskLine f={f} at={t0 + 4} size={c.studySize}>{c.study[0]}</MaskLine>
        <MaskLine f={f} at={t0 + 11} size={c.studySize}>{c.study[1]}</MaskLine>
      </div>
      <div style={{ position: 'absolute', left: SAFE.left, top: 372, height: 2, width: 120 * ramp(f, t0 + 26, t0 + 46), background: C.ink }} />
      {c.rows.map((row, r) => {
        const at = rowAt[r];
        const lastFill = at + 14 + (row.filled - 1) * 4 + 8;
        return (
          <div key={r} style={{ position: 'absolute', left: SAFE.left, top: 436 + r * 176 }}>
            <div style={{ ...label(28), ...fadeUp(f, at, 12) }}>{row.label}</div>
            <div style={{ display: 'flex', alignItems: 'center', marginTop: 20, height: 80 }}>
              <div style={{ display: 'flex', ...fadeUp(f, at + 4, 12) }}>
                {Array.from({ length: 12 }).map((_, i) => (
                  <Couple key={i} fill={i < row.filled ? ramp(f, at + 14 + i * 4, at + 22 + i * 4) : 0} />
                ))}
              </div>
              <div style={{ marginLeft: 30, fontFamily: serif, fontWeight: 700, fontSize: c.valueSize, letterSpacing: '-0.02em', color: r === 0 ? C.ink : C.ink500, whiteSpace: 'nowrap', ...fadeUp(f, lastFill - 4, 14) }}>{row.value}</div>
            </div>
          </div>
        );
      })}
      <div style={{ position: 'absolute', left: SAFE.left, top: 816, ...label(22, 600), ...fadeUp(f, t0 + 150, 10) }}>{c.source}</div>
    </AbsoluteFill>
  );
};

// ───────────────────────── 5 · Closing ─────────────────────────
export const Closing: React.FC = () => {
  const f = useCurrentFrame();
  const c = useEditorialCopy();
  if (f < TE.s5 - XF) return null;
  const t0 = TE.s5;
  const icon = ramp(f, t0 + 2, t0 + 20, EASE_OUT);
  return (
    <AbsoluteFill style={{ opacity: sceneOpacity(f, TE.s5 - XF, TE.end, true, false) }}>
      <Img
        src={staticFile('icon.png')}
        style={{ position: 'absolute', left: 960 - 80, top: 232, width: 160, height: 160, borderRadius: 36, opacity: icon, transform: `scale(${lerp(0.94, 1, icon)})`, boxShadow: `0 0 0 1.5px ${C.line}, 0 20px 36px -20px rgba(38,32,25,0.28)` }}
      />
      <div style={{ position: 'absolute', left: 0, right: 0, top: 418 }}>
        <MaskLine f={f} at={t0 + 14} size={118} align="center">{c.wordmark}</MaskLine>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 590, textAlign: 'center', ...label(40, 700), ...fadeUp(f, t0 + 30) }}>{c.tagline}</div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 700, display: 'flex', justifyContent: 'center', ...fadeUp(f, t0 + 46) }}>
        <div style={{ background: C.ink, color: C.bg, fontFamily: sans, fontWeight: 800, fontSize: 30, height: 76, lineHeight: '76px', padding: '0 44px', borderRadius: 999, letterSpacing: '0.005em' }}>{c.cta}</div>
      </div>
    </AbsoluteFill>
  );
};
