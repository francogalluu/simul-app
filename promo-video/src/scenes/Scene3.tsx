import React from 'react';
import { Img, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { liftOut, paperShadow, ramp, stickIn } from '../lib/anim';
import { C, hand, T } from '../lib/theme';
import { CheckBadge, NotifBadge, PointerHand } from '../components/Icons';
import { Stick, Tape, TornNote } from '../components/Paper';
import { Phone, ScreenCrop } from '../components/Phone';
import { Confetti } from '../components/Confetti';
import { S3_THOMAS } from '../components/Cast';
import { useCopy, useScreens } from '../lib/copy';

// Phone placement (design px)
const PH = { cx: 1480, cy: 520, h: 800 };

// Crops in screenshot pixels (1206 x 2622)
const ROW = { x: 66, y: 1742, w: 1074, h: 188 }; // "Read 20 pages" row on Home
const BOX_EMPTY = { x: 1020, y: 1791 }; // its checkbox
const BOX_DONE = { x: 1020, y: 1598 }; // the real checked box from "Morning run", same size
const BOX = { w: 80, h: 78 };
const TITLE = { x: 244, y: 1768, h: 62 }; // "Read 20 pages" (width per language: copy.titleW)
const PROOF = { x: 87, y: 2091, w: 1031, h: 374 }; // From Thomas … Reject / Approve
const APPROVE = { x: 619, y: 2281, w: 459, h: 139 };

const ROW_S = 0.72;
const PROOF_S = 0.7;

/** The real "done" look for the Read 20 pages row: the app's own checked box (taken from "Morning run") + struck, greyed title. */
const DoneOverlay: React.FC<{ s: number; ox: number; oy: number; strike: number; check: { visible: boolean; scale: number; rot: number; opacity: number } }> = ({ s, ox, oy, strike, check }) => {
  const TW = useCopy().titleW;
  const SCREENS = useScreens();
  return (
  <>
    <div style={{ position: 'absolute', left: (TITLE.x - ox) * s, top: (TITLE.y - oy) * s, width: TW * s, height: TITLE.h * s, background: `rgba(255,255,255,${0.5 * strike})` }} />
    <div style={{ position: 'absolute', left: (TITLE.x - ox) * s, top: (TITLE.y - oy + TITLE.h / 2) * s, width: TW * s * strike, height: Math.max(1.5, 4 * s), background: '#A69C8F' }} />
    {check.visible && (
      <div style={{ position: 'absolute', left: (BOX_EMPTY.x - ox) * s, top: (BOX_EMPTY.y - oy) * s, transform: `scale(${check.scale}) rotate(${check.rot}deg)`, opacity: check.opacity }}>
        <ScreenCrop src={SCREENS.home} x={BOX_DONE.x} y={BOX_DONE.y} w={BOX.w} h={BOX.h} scale={s} radius={0} />
      </div>
    )}
  </>
  );
};

const Step: React.FC<{ start: number; end: number; seed: number; rot: number; children: React.ReactNode }> = ({ start, end, seed, rot, children }) => (
  <Stick start={start} end={end} cx={232} cy={206} anchor="left" rotate={rot}>
    <div style={{ position: 'relative' }}>
      <TornNote seed={seed} size={68} padX={36}>
        {children}
      </TornNote>
      <div style={{ position: 'absolute', left: '50%', top: -18, transform: 'translateX(-50%) rotate(-3deg)' }}>
        <Tape w={130} h={38} />
      </div>
    </div>
  </Stick>
);

const PhoneTag: React.FC<{ start: number; end: number; children: React.ReactNode }> = ({ start, end, children }) => (
  <Stick start={start} end={end} cx={useCopy().tagCx} cy={190} rotate={-5}>
    <TornNote seed={14} size={46} padX={24} padY={10} paper="#FFF8E6" color={C.ink700}>
      {children}
    </TornNote>
  </Stick>
);

export const Scene3: React.FC = () => {
  const f = useCurrentFrame();
  const c = useCopy();
  const SCREENS = useScreens();
  if (f < T.s3a - 2 || f >= T.s4) return null;
  const out = T.s4 - 14;

  // 3a: check the habit
  const checkAt = T.s3a + 64;
  const check = stickIn(f, checkAt, { fromScale: 1.5, fromRot: -10 });
  const strike = ramp(f, checkAt + 4, checkAt + 14);

  // 3b: photo flies from Thomas's phone into Emily's phone
  const polyIn = T.s3b + 24;
  const flyA = T.s3b + 44;
  const flyB = T.s3b + 82;
  const fly = ramp(f, flyA, flyB);
  const swapAt = T.s3b + 86;
  const swap = ramp(f, swapAt, swapAt + 14);
  const P0 = { x: (S3_THOMAS.x + 645) / 2, y: 340 };
  const P1 = { x: 900, y: 330 };
  const P2 = { x: PH.cx - 40, y: 470 };
  const bez = (a: number, b: number, c: number, t: number) => (1 - t) * (1 - t) * a + 2 * (1 - t) * t * b + t * t * c;
  const polyPop = stickIn(f, polyIn, { fromScale: 0.4, fromRot: -12 });
  const polyScale = f < flyA ? 0.55 * polyPop.scale : interpolate(fly, [0, 0.35, 1], [0.55, 0.62, 0.25]);
  const polyOpacity = polyPop.opacity * interpolate(fly, [0.85, 1], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // 3c: approve
  const tapAt = T.s3c + 52;
  const press = interpolate(f, [tapAt, tapAt + 3, tapAt + 10], [0, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const ripple = ramp(f, tapAt, tapAt + 14);
  const calloutOut = tapAt + 12;
  const stampAt = tapAt + 16;
  const proofCx = 1250;
  const proofCy = 640;
  const proofW = PROOF.w * PROOF_S;
  const proofH = PROOF.h * PROOF_S;
  const target = {
    x: proofCx - proofW / 2 + (APPROVE.x + APPROVE.w / 2 - PROOF.x) * PROOF_S,
    y: proofCy - proofH / 2 + (APPROVE.y + APPROVE.h / 2 - PROOF.y) * PROOF_S,
  };
  const fingerIn = ramp(f, T.s3c + 30, tapAt - 2);
  const fingerOut = ramp(f, tapAt + 14, tapAt + 30);
  const fingerPos = {
    x: interpolate(fingerIn, [0, 1], [1720, target.x]) + fingerOut * 220,
    y: interpolate(fingerIn, [0, 1], [1060, target.y]) + fingerOut * 300,
  };
  const pressScale = 1 - press * 0.12;
  const FINGER = 118;
  const tip = { x: (34 / 96) * FINGER, y: (6 / 120) * FINGER * 1.25 };

  return (
    <>
      <Step start={T.s3a + 8} end={T.s3b - 10} seed={21} rot={-2}>
        {c.steps[0]}
      </Step>
      <Step start={T.s3b + 6} end={T.s3c - 10} seed={23} rot={1.5}>
        {c.steps[1]}
      </Step>
      <Step start={T.s3c + 6} end={out} seed={27} rot={-1.5}>
        {c.steps[2]}
      </Step>

      <Stick start={T.s3a + 12} end={out} cx={PH.cx} cy={PH.cy} rotate={2} fromRot={6}>
        <Phone
          height={PH.h}
          from={SCREENS.home}
          to={SCREENS.proof}
          swap={swap}
          overlay={(sc) => (f >= T.s3b - 4 ? <DoneOverlay s={sc} ox={0} oy={0} strike={1} check={{ visible: true, scale: 1, rot: 0, opacity: 1 }} /> : null)}
        />
      </Stick>

      <PhoneTag start={T.s3a + 24} end={swapAt - 6}>{c.tagThomas}</PhoneTag>
      <PhoneTag start={swapAt} end={out}>{c.tagEmily}</PhoneTag>

      {/* 3a — the habit row, lifted out of the phone and checked */}
      <Stick start={T.s3a + 36} end={T.s3b - 4} cx={1225} cy={680} rotate={-1.5}>
        <div style={{ boxShadow: '0 0 0 10px #FFFEFA', borderRadius: 18 }}>
          <ScreenCrop src={SCREENS.home} {...ROW} scale={ROW_S}>
            <DoneOverlay s={ROW_S} ox={ROW.x} oy={ROW.y} strike={strike} check={check} />
          </ScreenCrop>
        </div>
      </Stick>

      {/* 3b — Polaroid of the real proof photo */}
      {f >= polyIn && f < flyB && (
        <div
          style={{
            position: 'absolute',
            left: f < flyA ? P0.x : bez(P0.x, P1.x, P2.x, fly),
            top: f < flyA ? P0.y + 50 * polyPop.lift : bez(P0.y, P1.y, P2.y, fly),
            transform: `translate(-50%, -50%) rotate(${-8 + fly * 14 + polyPop.rot}deg) scale(${polyScale})`,
            opacity: polyOpacity,
            filter: paperShadow(f < flyA ? polyPop.lift : 0.7),
          }}
        >
          <div style={{ background: '#FFFEFA', padding: '14px 14px 0', width: 268, borderRadius: 4 }}>
            <Img src={staticFile('screens/reading-photo.png')} style={{ width: 240, height: 180, objectFit: 'cover', display: 'block' }} />
            <div style={{ fontFamily: hand, fontWeight: 700, fontSize: 36, color: C.ink700, textAlign: 'center', padding: '6px 0 10px' }}>{c.polaroid}</div>
          </div>
        </div>
      )}
      <Stick start={swapAt - 2} end={T.s3c + 14} cx={PH.cx + 178} cy={PH.cy - 378} outline="stkS" fromScale={1.8}>
        <NotifBadge size={66} n={1} />
      </Stick>

      {/* 3c — the real Approve card, lifted out and tapped */}
      <Stick start={T.s3c + 16} end={calloutOut} cx={proofCx} cy={proofCy} rotate={-1}>
        <div style={{ boxShadow: '0 0 0 10px #FFFEFA', borderRadius: 22 }}>
          <ScreenCrop src={SCREENS.proof} {...PROOF} scale={PROOF_S} radius={22}>
            <div
              style={{
                position: 'absolute',
                left: (APPROVE.x - PROOF.x) * PROOF_S,
                top: (APPROVE.y - PROOF.y) * PROOF_S,
                width: APPROVE.w * PROOF_S,
                height: APPROVE.h * PROOF_S,
                borderRadius: 999,
                background: `rgba(30,60,40,${0.18 * press})`,
              }}
            />
            {ripple > 0 && ripple < 1 && (
              <div
                style={{
                  position: 'absolute',
                  left: (APPROVE.x + APPROVE.w / 2 - PROOF.x) * PROOF_S,
                  top: (APPROVE.y + APPROVE.h / 2 - PROOF.y) * PROOF_S,
                  width: 40 + ripple * 160,
                  height: 40 + ripple * 160,
                  transform: 'translate(-50%,-50%)',
                  borderRadius: '50%',
                  border: '4px solid rgba(255,255,255,0.9)',
                  opacity: 1 - ripple,
                }}
              />
            )}
          </ScreenCrop>
        </div>
      </Stick>
      {f >= T.s3c + 30 && f < tapAt + 30 && (
        <div
          style={{
            position: 'absolute',
            left: fingerPos.x - tip.x,
            top: fingerPos.y - tip.y,
            transformOrigin: `${tip.x}px ${tip.y}px`,
            transform: `rotate(-14deg) scale(${pressScale})`,
            filter: `url(#stkS) ${paperShadow(0.5 - press * 0.4)}`,
            opacity: 1 - fingerOut,
          }}
        >
          <PointerHand size={FINGER} />
        </div>
      )}

      <Stick start={stampAt} end={out} cx={PH.cx} cy={500} rotate={-10} outline="stk" fromScale={1.9} fromRot={-25}>
        <CheckBadge size={190} />
      </Stick>
      <Confetti start={stampAt + 2} x={PH.cx} y={500} />
    </>
  );
};

// Exported for the audio cue sheet.
export const S3_CUES = {
  check: T.s3a + 64,
  polaroid: T.s3b + 24,
  whoosh: T.s3b + 44,
  badge: T.s3b + 84,
  tap: T.s3c + 52,
  approve: T.s3c + 68,
};
