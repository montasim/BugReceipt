import '@fontsource-variable/geist';
import '@fontsource-variable/geist-mono';
import React from 'react';
import {
  AbsoluteFill,
  Easing,
  Html5Audio,
  Img,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import clickSfx from './sfx/click.wav';
import tick from './sfx/tick.wav';
import whoosh from './sfx/whoosh.wav';
import { VOICE, VOICE_SECONDS } from './voice-launch';

// Dark cinematic palette built from the product's amber and teal.
const K = {
  bg: '#0a1318',
  bg2: '#102029',
  ink: '#f3f6f7',
  muted: '#93a6ae',
  amber: '#f0a63e',
  amberSoft: 'rgba(240,166,62,0.18)',
  teal: '#2fb5a3',
  red: '#ff6b55',
  card: '#ffffff',
  line: 'rgba(255,255,255,0.09)',
};
const SANS = "'Geist Variable', system-ui, sans-serif";
const MONO = "'Geist Mono Variable', ui-monospace, monospace";
const FPS = 30;
const XFADE = 14;
const LEAD = 10;

// Scene length: its animation minimum, or narration plus breathing room, whichever is longer.
const MIN_SECONDS = [6.4, 5.6, 7.6, 8.4, 6.6, 7.8, 5.6];
const STARTS = MIN_SECONDS.reduce(
  (s, min, i) => [
    ...s,
    s[i] + Math.max(Math.round(min * FPS), Math.ceil(VOICE_SECONDS[i] * FPS) + LEAD + 22),
  ],
  [0],
);
export const LAUNCH_TOTAL = STARTS[STARTS.length - 1];

const ease = Easing.bezier(0.65, 0, 0.35, 1);
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const sec = (s: number) => Math.round(s * FPS);

function useSpring(delay: number, damping = 16, mass = 0.8) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - delay, fps, config: { damping, mass } });
}

/* ---------------------------------------------------------------- backdrop */

const Backdrop: React.FC = () => {
  const f = useCurrentFrame();
  const a = f / 120;
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at 50% 120%, ${K.bg2}, ${K.bg} 70%)`,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          width: 1100,
          height: 1100,
          left: 1100 + Math.cos(a) * 120,
          top: -500 + Math.sin(a * 0.8) * 80,
          background: 'radial-gradient(circle, rgba(240,166,62,0.16), transparent 62%)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: 1200,
          height: 1200,
          left: -500 + Math.sin(a * 0.7) * 120,
          top: 300 + Math.cos(a) * 80,
          background: 'radial-gradient(circle, rgba(47,181,163,0.13), transparent 62%)',
        }}
      />
      {/* Fine grid, fading toward the edges. */}
      <AbsoluteFill
        style={{
          backgroundImage: `linear-gradient(${K.line} 1px, transparent 1px), linear-gradient(90deg, ${K.line} 1px, transparent 1px)`,
          backgroundSize: '64px 64px',
          backgroundPosition: `${(f * 0.3) % 64}px 0`,
          opacity: 0.35,
          maskImage: 'radial-gradient(ellipse at center, black 20%, transparent 75%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, black 20%, transparent 75%)',
        }}
      />
    </AbsoluteFill>
  );
};

/** Crossfades with a soft blur and push so scenes glide into each other. */
const Scene: React.FC<{ dur: number; children: React.ReactNode }> = ({ dur, children }) => {
  const f = useCurrentFrame();
  const inP = interpolate(f, [0, XFADE], [0, 1], { ...clamp, easing: ease });
  const outP = interpolate(f, [dur - XFADE, dur], [0, 1], { ...clamp, easing: ease });
  return (
    <AbsoluteFill
      style={{
        opacity: inP * (1 - outP),
        transform: `scale(${1.03 - 0.03 * inP - 0.03 * outP})`,
        filter: `blur(${(1 - inP) * 10 + outP * 10}px)`,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

/* ---------------------------------------------------------------- text */

/** Words rise and unblur one by one. */
const Words: React.FC<{
  text: string;
  delay: number;
  size: number;
  color?: string;
  weight?: number;
  accent?: string[];
}> = ({ text, delay, size, color = K.ink, weight = 640, accent = [] }) => {
  const f = useCurrentFrame();
  return (
    <div
      style={{
        fontFamily: SANS,
        fontSize: size,
        fontWeight: weight,
        color,
        lineHeight: 1.08,
        letterSpacing: '-0.035em',
      }}
    >
      {text.split(' ').map((w, i) => {
        const p = interpolate(f, [delay + i * 3, delay + i * 3 + 14], [0, 1], {
          ...clamp,
          easing: Easing.out(Easing.cubic),
        });
        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              marginRight: '0.24em',
              opacity: p,
              transform: `translateY(${(1 - p) * 26}px)`,
              filter: `blur(${(1 - p) * 8}px)`,
              color: accent.includes(w) ? K.amber : undefined,
            }}
          >
            {w}
          </span>
        );
      })}
    </div>
  );
};

const FeatureCopy: React.FC<{
  n: string;
  tag: string;
  title: string;
  accent: string[];
  sub: string;
}> = ({ n, tag, title, accent, sub }) => {
  const f = useCurrentFrame();
  const bar = interpolate(f, [4, 26], [0, 1], { ...clamp, easing: ease });
  const subP = interpolate(f, [24, 40], [0, 1], clamp);
  return (
    <div
      style={{
        position: 'absolute',
        left: 120,
        top: 0,
        bottom: 0,
        width: 560,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          fontFamily: MONO,
          fontSize: 22,
          letterSpacing: '0.18em',
          color: K.amber,
          marginBottom: 28,
        }}
      >
        <span>{n}</span>
        <span style={{ width: 56 * bar, height: 2, background: K.amber }} />
        <span style={{ opacity: bar }}>{tag}</span>
      </div>
      <Words text={title} delay={8} size={72} accent={accent} />
      <div
        style={{
          marginTop: 30,
          fontFamily: SANS,
          fontSize: 28,
          lineHeight: 1.45,
          color: K.muted,
          opacity: subP,
          transform: `translateY(${(1 - subP) * 12}px)`,
        }}
      >
        {sub}
      </div>
    </div>
  );
};

/* ---------------------------------------------------------------- shot + camera + highlights */

type Rect = [number, number, number, number]; // x, y, w, h in image pixels
type Cam = { f: number; c?: [number, number]; z: number }; // z = zoom relative to "fit"
// end: right-align the label to the ring so it sits over empty space at the end of a row.
type Mark = {
  from: number;
  to?: number;
  rect: Rect;
  label?: string;
  below?: boolean;
  end?: boolean;
  spot?: boolean;
};
type Click = { f: number; at: [number, number]; from?: [number, number] };

function camAt(f: number, keys: Cam[], w: number, h: number) {
  const pts = keys.map((k) => ({ ...k, c: k.c ?? ([w / 2, h / 2] as [number, number]) }));
  if (f <= pts[0].f) return pts[0];
  for (let i = 1; i < pts.length; i++) {
    if (f <= pts[i].f) {
      const a = pts[i - 1];
      const b = pts[i];
      const t = ease((f - a.f) / (b.f - a.f));
      return {
        c: [a.c[0] + (b.c[0] - a.c[0]) * t, a.c[1] + (b.c[1] - a.c[1]) * t] as [number, number],
        z: a.z + (b.z - a.z) * t,
      };
    }
  }
  return pts[pts.length - 1];
}

/** A product screenshot in a window frame, with a moving camera, spotlights, rings, labels and a cursor. */
const Shot: React.FC<{
  src: string;
  w: number;
  h: number;
  box: Rect; // viewport placement on the 1920x1080 canvas
  cam: Cam[];
  marks?: Mark[];
  clicks?: Click[];
  title?: string;
  enter?: boolean;
}> = ({ src, w, h, box, cam, marks = [], clicks = [], title = 'BugReceipt', enter = true }) => {
  const f = useCurrentFrame();
  const [bx, by, bw, bh] = box;
  const BAR = 46;
  const vh = bh - BAR;
  const fit = Math.min(bw / w, vh / h);
  const { c, z } = camAt(f, cam, w, h);
  const s = fit * z;
  // Clamp the camera so the image never reveals empty space when zoomed in.
  const half = (len: number, view: number) => Math.min(len / 2, view / s / 2);
  const cx = Math.max(half(w, bw), Math.min(w - half(w, bw), c[0]));
  const cy = Math.max(half(h, vh), Math.min(h - half(h, vh), c[1]));
  const tx = bw / 2 - cx * s;
  const ty = vh / 2 - cy * s;
  const toScreen = (r: Rect) => [tx + r[0] * s, ty + r[1] * s, r[2] * s, r[3] * s];

  const spr = useSpring(0, 18, 1);
  const rise = enter ? spr : 1;

  return (
    <div
      style={{
        position: 'absolute',
        left: bx,
        top: by,
        width: bw,
        height: bh,
        borderRadius: 22,
        overflow: 'hidden',
        background: '#eef2f4',
        boxShadow: '0 50px 120px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.08)',
        transform: `perspective(2200px) translateY(${(1 - rise) * 70}px) rotateX(${(1 - rise) * 9}deg)`,
        opacity: interpolate(rise, [0, 0.4], [0, 1], clamp),
      }}
    >
      <div
        style={{
          height: BAR,
          background: '#fbfcfc',
          borderBottom: '1px solid #dfe5e8',
          display: 'flex',
          alignItems: 'center',
          padding: '0 18px',
          gap: 9,
        }}
      >
        {['#f26b5b', '#f5be4f', '#4cc27a'].map((col) => (
          <span key={col} style={{ width: 13, height: 13, borderRadius: 7, background: col }} />
        ))}
        <span
          style={{
            marginLeft: 16,
            padding: '5px 16px',
            borderRadius: 8,
            background: '#eef2f4',
            fontFamily: SANS,
            fontSize: 16,
            color: '#5d6d76',
          }}
        >
          {title}
        </span>
      </div>
      <div style={{ position: 'relative', width: bw, height: vh, overflow: 'hidden' }}>
        <Img
          src={staticFile(src)}
          style={{
            position: 'absolute',
            left: tx,
            top: ty,
            width: w * s,
            height: h * s,
            maxWidth: 'none',
          }}
        />
        {marks.map((m, i) => (
          <Highlight key={i} m={m} r={toScreen(m.rect)} vw={bw} />
        ))}
        {clicks.map((k, i) => (
          <Cursor key={i} k={k} toScreen={(p) => [tx + p[0] * s, ty + p[1] * s]} />
        ))}
      </div>
    </div>
  );
};

const Highlight: React.FC<{ m: Mark; r: number[]; vw: number }> = ({ m, r, vw }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const to = m.to ?? 99999;
  if (f < m.from - 2 || f > to + 14) return null;
  const pin = spring({ frame: f - m.from, fps, config: { damping: 13, mass: 0.7 } });
  const out = interpolate(f, [to, to + 12], [1, 0], clamp);
  const op = Math.min(1, pin * 1.4) * out;
  const pad = 10;
  const [x, y, w, h] = [r[0] - pad, r[1] - pad, r[2] + pad * 2, r[3] + pad * 2];
  const pulse = interpolate(f - m.from, [6, 30], [0, 1], clamp);
  const breathe = 0.5 + 0.5 * Math.sin((f - m.from) / 9);
  const labelP = interpolate(f, [m.from + 6, m.from + 18], [0, 1], {
    ...clamp,
    easing: Easing.out(Easing.cubic),
  });
  return (
    <>
      {m.spot !== false && (
        <div
          style={{
            position: 'absolute',
            left: x,
            top: y,
            width: w,
            height: h,
            borderRadius: 14,
            boxShadow: `0 0 0 4000px rgba(6,14,19,${0.5 * op})`,
            pointerEvents: 'none',
          }}
        />
      )}
      <div
        style={{
          position: 'absolute',
          left: x,
          top: y,
          width: w,
          height: h,
          borderRadius: 14,
          border: `3px solid ${K.amber}`,
          boxShadow: `0 0 ${18 + breathe * 16}px rgba(240,166,62,${0.55 * op}), inset 0 0 0 1px rgba(255,255,255,0.4)`,
          opacity: op,
          transform: `scale(${1.12 - 0.12 * pin})`,
        }}
      />
      {/* One expanding ripple when the highlight lands. */}
      <div
        style={{
          position: 'absolute',
          left: x,
          top: y,
          width: w,
          height: h,
          borderRadius: 14,
          border: `2px solid ${K.amber}`,
          opacity: (1 - pulse) * 0.8 * out,
          transform: `scale(${1 + pulse * 0.12})`,
        }}
      />
      {m.label && (
        <div
          style={{
            position: 'absolute',
            ...(m.end ? { right: Math.max(12, vw - (x + w)) } : { left: Math.max(12, x) }),
            top: m.below ? y + h + 14 : y - 54,
            padding: '8px 16px',
            borderRadius: 999,
            background: K.amber,
            color: '#1a1206',
            fontFamily: SANS,
            fontWeight: 650,
            fontSize: 22,
            whiteSpace: 'nowrap',
            boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
            opacity: labelP * out,
            transform: `translateY(${(1 - labelP) * (m.below ? -10 : 10)}px)`,
          }}
        >
          {m.label}
        </div>
      )}
    </>
  );
};

const Cursor: React.FC<{ k: Click; toScreen: (p: [number, number]) => number[] }> = ({
  k,
  toScreen,
}) => {
  const f = useCurrentFrame();
  const start = k.f - 22;
  if (f < start || f > k.f + 30) return null;
  const travel = interpolate(f, [start, k.f - 2], [0, 1], { ...clamp, easing: ease });
  const [ax, ay] = toScreen(k.at);
  const [fx, fy] = k.from ? toScreen(k.from) : [ax + 160, ay + 140];
  const x = fx + (ax - fx) * travel;
  const y = fy + (ay - fy) * travel;
  const press = interpolate(f, [k.f - 2, k.f + 1, k.f + 6], [1, 0.82, 1], clamp);
  const ripple = interpolate(f, [k.f, k.f + 18], [0, 1], clamp);
  const fade = interpolate(f, [start, start + 6, k.f + 20, k.f + 30], [0, 1, 1, 0], clamp);
  return (
    <>
      <div
        style={{
          position: 'absolute',
          left: ax - 40,
          top: ay - 40,
          width: 80,
          height: 80,
          borderRadius: 40,
          background: 'rgba(240,166,62,0.35)',
          opacity: f >= k.f ? 1 - ripple : 0,
          transform: `scale(${0.3 + ripple})`,
        }}
      />
      <svg
        width="34"
        height="40"
        viewBox="0 0 24 28"
        style={{
          position: 'absolute',
          left: x - 4,
          top: y - 2,
          opacity: fade,
          transform: `scale(${press})`,
          transformOrigin: '4px 2px',
          filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.35))',
        }}
      >
        <path
          d="M2 1 L2 22 L7.5 17 L11 25 L14.5 23.5 L11 15.8 L18.5 15.8 Z"
          fill="#111"
          stroke="#fff"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      </svg>
    </>
  );
};

/** Fades a nested piece in and out inside a scene. */
const Fade: React.FC<{
  from: number;
  dur: number;
  children: React.ReactNode;
  fadeIn?: boolean;
}> = ({ from, dur, children, fadeIn = true }) => (
  <Sequence from={from} durationInFrames={dur} layout="none">
    <FadeInner dur={dur} fadeIn={fadeIn}>
      {children}
    </FadeInner>
  </Sequence>
);
const FadeInner: React.FC<{ dur: number; fadeIn: boolean; children: React.ReactNode }> = ({
  dur,
  fadeIn,
  children,
}) => {
  const f = useCurrentFrame();
  const op = interpolate(
    f,
    [0, fadeIn ? 10 : 0.01, dur - 10, dur],
    [fadeIn ? 0 : 1, 1, 1, 0],
    clamp,
  );
  return <AbsoluteFill style={{ opacity: op }}>{children}</AbsoluteFill>;
};

/* ---------------------------------------------------------------- scenes */

const D = 1.44; // review screenshots were measured at 2000px wide; source is 2880px
const d = (x: number, y: number, w: number, h: number): Rect => [x * D, y * D, w * D, h * D];
const RIGHT_WIDE: Rect = [760, 150, 1060, 780];
const RIGHT_TALL: Rect = [900, 70, 780, 940];

// 0 — The problem: a bug report with nothing in it.
const Hook: React.FC = () => {
  const f = useCurrentFrame();
  const card = useSpring(4, 15);
  const typed = 'Checkout is broken.'.slice(0, Math.max(0, Math.floor((f - 14) / 1.6)));
  const caret = Math.floor(f / 8) % 2 === 0;
  const lacks = ['No steps', 'No logs', 'No proof'];
  const at = [sec(3.3), sec(4.05), sec(4.8)].map((x) => x + LEAD);
  const shake = f > at[2] && f < at[2] + 10 ? Math.sin(f * 2.4) * (at[2] + 10 - f) * 0.9 : 0;
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
      <div
        style={{
          width: 1000,
          borderRadius: 24,
          background: K.card,
          padding: '40px 52px 46px',
          boxShadow: '0 60px 140px rgba(0,0,0,0.55)',
          transform: `translate(${shake}px, ${(1 - card) * 60}px) scale(${0.94 + 0.06 * card})`,
          opacity: card,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            fontFamily: SANS,
            fontSize: 22,
            color: '#6a7a83',
          }}
        >
          <span
            style={{
              padding: '6px 14px',
              borderRadius: 999,
              background: '#e6f4ea',
              color: '#1a7f37',
              fontWeight: 600,
            }}
          >
            ● Open
          </span>
          <span>Issue #482 · opened just now</span>
        </div>
        <div
          style={{
            marginTop: 26,
            fontFamily: SANS,
            fontSize: 64,
            fontWeight: 700,
            color: '#14232c',
            letterSpacing: '-0.03em',
            minHeight: 76,
          }}
        >
          {typed}
          <span style={{ opacity: caret && typed.length < 19 ? 1 : 0, color: K.amber }}>|</span>
        </div>
        <div style={{ marginTop: 22, height: 2, background: '#e8edf0' }} />
        <div
          style={{
            marginTop: 26,
            fontFamily: SANS,
            fontSize: 26,
            color: '#9aa7ae',
            fontStyle: 'italic',
          }}
        >
          No description provided.
        </div>
        <div style={{ display: 'flex', gap: 16, marginTop: 34 }}>
          {lacks.map((t, i) => {
            const p = spring({ frame: f - at[i], fps: FPS, config: { damping: 12, mass: 0.6 } });
            return (
              <div
                key={t}
                style={{
                  padding: '14px 26px',
                  borderRadius: 14,
                  background: '#fff0ed',
                  border: '2px solid #ffc9bd',
                  color: '#c2391f',
                  fontFamily: SANS,
                  fontWeight: 650,
                  fontSize: 30,
                  opacity: Math.min(1, p * 1.5),
                  transform: `scale(${0.6 + 0.4 * p}) rotate(${(1 - p) * -6}deg)`,
                }}
              >
                ✕ {t}
              </div>
            );
          })}
        </div>
      </div>
      {at.map((x) => (
        <Sequence key={x} from={x} durationInFrames={10} layout="none">
          <Html5Audio src={tick} volume={0.5} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};

// 1 — The answer.
const Brand: React.FC = () => {
  const f = useCurrentFrame();
  const mark = useSpring(2, 11, 0.7);
  const word = interpolate(f, [10, 30], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const chips = ['Steps', 'Console', 'Network', 'Private'];
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 34 }}>
        <div
          style={{
            width: 150,
            height: 150,
            borderRadius: 38,
            background: '#ffffff',
            display: 'grid',
            placeItems: 'center',
            boxShadow: `0 0 ${60 * mark}px rgba(240,166,62,0.45), 0 30px 60px rgba(0,0,0,0.4)`,
            transform: `scale(${mark}) rotate(${(1 - mark) * -25}deg)`,
          }}
        >
          <Img src={staticFile('brand/bugreceipt-mark.svg')} style={{ width: 96, height: 96 }} />
        </div>
        <div
          style={{
            fontFamily: SANS,
            fontWeight: 720,
            fontSize: 140,
            letterSpacing: '-0.05em',
            color: K.ink,
            clipPath: `inset(0 ${(1 - word) * 100}% 0 0)`,
            transform: `translateX(${(1 - word) * -30}px)`,
          }}
        >
          BugReceipt
        </div>
      </div>
      <div style={{ marginTop: 44, width: 1300, textAlign: 'center' }}>
        <Words
          text="Every bug, with a receipt developers can reproduce."
          delay={30}
          size={50}
          weight={520}
          color={K.muted}
          accent={['receipt']}
        />
      </div>
      <div style={{ display: 'flex', gap: 14, marginTop: 46 }}>
        {chips.map((c, i) => {
          const p = interpolate(f, [62 + i * 5, 76 + i * 5], [0, 1], {
            ...clamp,
            easing: Easing.out(Easing.back(2)),
          });
          return (
            <div
              key={c}
              style={{
                padding: '10px 22px',
                borderRadius: 999,
                border: `1px solid ${K.line}`,
                background: 'rgba(255,255,255,0.05)',
                fontFamily: MONO,
                fontSize: 22,
                color: K.ink,
                opacity: p,
                transform: `translateY(${(1 - p) * 16}px)`,
              }}
            >
              <span style={{ color: K.teal }}>✓</span> {c}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// 2 — Record: choose the tab, then steps appear while recording.
const Record: React.FC<{ dur: number }> = ({ dur }) => {
  const swap = sec(2.6);
  return (
    <AbsoluteFill>
      <FeatureCopy
        n="01"
        tag="RECORD"
        title="Every step, written as it happens."
        accent={['step,']}
        sub="Pick the tab, press record, and note each step right in the Chrome side panel."
      />
      <Fade from={0} dur={swap + 10} fadeIn={false}>
        <Shot
          src="guide/02-choose-tab.png"
          w={880}
          h={1200}
          box={[RIGHT_TALL[0], RIGHT_TALL[1] + 120, RIGHT_TALL[2], 820]}
          title="Side panel"
          cam={[
            { f: 0, z: 1 },
            { f: 30, z: 1 },
            { f: 70, z: 1.25, c: [400, 1000] },
          ]}
          marks={[{ from: 40, rect: [40, 1080, 388, 80], label: 'Start recording' }]}
          clicks={[{ f: 62, at: [234, 1120] }]}
        />
      </Fade>
      <Fade from={swap} dur={dur - swap}>
        <Shot
          src="guide/03-recording.png"
          w={880}
          h={1520}
          box={RIGHT_TALL}
          title="Side panel · recording"
          enter={false}
          cam={[
            { f: 0, z: 1.05, c: [440, 600] },
            { f: 26, z: 1.35, c: [440, 300] },
            { f: 60, z: 1.35, c: [440, 560] },
            { f: 140, z: 1.3, c: [440, 600] },
          ]}
          marks={[
            { from: 12, to: 48, rect: [40, 168, 800, 217], label: '● Recording the tab' },
            { from: 54, to: 72, rect: [52, 540, 776, 55] },
            { from: 72, to: 90, rect: [52, 597, 776, 55] },
            { from: 90, to: 108, rect: [52, 652, 776, 55] },
            { from: 110, rect: [40, 522, 800, 203], label: '3 steps, logged live', below: true },
          ]}
        />
      </Fade>
      <Sequence from={62} durationInFrames={10} layout="none">
        <Html5Audio src={clickSfx} volume={0.6} />
      </Sequence>
      {[40, swap + 12, swap + 54, swap + 72, swap + 90, swap + 110].map((x) => (
        <Sequence key={x} from={x} durationInFrames={10} layout="none">
          <Html5Audio src={tick} volume={0.35} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};

// 3 — Capture: the stack trace, then the failing request and its response.
const Capture: React.FC<{ dur: number }> = ({ dur }) => {
  const swap = sec(4.1);
  return (
    <AbsoluteFill>
      <FeatureCopy
        n="02"
        tag="CAPTURE"
        title="Console and network, caught for you."
        accent={['caught']}
        sub="Errors, stack traces and the exact failing request are recorded automatically."
      />
      <Fade from={0} dur={swap + 10} fadeIn={false}>
        <Shot
          src="guide/07-console-evidence.png"
          w={2880}
          h={1800}
          box={RIGHT_WIDE}
          title="Console evidence"
          cam={[
            { f: 0, z: 1 },
            { f: 18, z: 1 },
            { f: 50, z: 1.6, c: [1656, 1330] },
            { f: swap, z: 1.7, c: [1656, 1330] },
          ]}
          marks={[
            {
              from: 54,
              to: 82,
              rect: d(412, 785, 1500, 70),
              label: '422 Unprocessable Entity',
              end: true,
            },
            { from: 84, rect: d(412, 862, 1500, 92), label: 'Stack trace', end: true },
          ]}
        />
      </Fade>
      <Fade from={swap} dur={dur - swap}>
        <Shot
          src="guide/08-network-evidence.png"
          w={2880}
          h={1800}
          box={RIGHT_WIDE}
          title="Network evidence"
          enter={false}
          cam={[
            { f: 0, z: 1.7, c: [1700, 1060] },
            { f: 40, z: 1.8, c: [1400, 1270] },
            { f: 100, z: 1.85, c: [1350, 1330] },
          ]}
          marks={[
            { from: 8, to: 40, rect: d(428, 664, 1484, 108), label: 'Failing request' },
            { from: 46, rect: d(455, 945, 560, 56), label: 'The real reason', below: true },
          ]}
        />
      </Fade>
      {[54, 84, swap + 8, swap + 46].map((x) => (
        <Sequence key={x} from={x} durationInFrames={10} layout="none">
          <Html5Audio src={tick} volume={0.35} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};

// 4 — Privacy: secrets turn into [REDACTED] before anything is saved.
const Privacy: React.FC = () => {
  const f = useCurrentFrame();
  const lines: [string, string, string][] = [
    ['Authorization: ', 'Bearer eyJhbGciOiJIUzI1NiJ9.x7…', '[REDACTED]'],
    ['"password": ', '"hunter2-checkout"', '"[REDACTED]"'],
    ['Cookie: ', 'session=7f3a9c2e41d0…', '[REDACTED]'],
    ['"email": ', '"jane@shop.example"', '"[REDACTED]"'],
  ];
  const panel = useSpring(4, 18, 1);
  const badge = interpolate(f, [sec(4.2), sec(4.2) + 14], [0, 1], {
    ...clamp,
    easing: Easing.out(Easing.back(1.8)),
  });
  return (
    <AbsoluteFill>
      <FeatureCopy
        n="03"
        tag="PRIVATE"
        title="Secrets never leave your machine."
        accent={['never']}
        sub="Tokens, passwords, cookies and emails are redacted locally, before anything is stored."
      />
      <div
        style={{
          position: 'absolute',
          left: 800,
          top: 230,
          width: 1000,
          borderRadius: 22,
          background: '#0e1a20',
          border: `1px solid ${K.line}`,
          boxShadow: '0 50px 120px rgba(0,0,0,0.55)',
          padding: '30px 40px 40px',
          opacity: panel,
          transform: `perspective(2200px) translateY(${(1 - panel) * 70}px) rotateX(${(1 - panel) * 9}deg)`,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontFamily: MONO,
            fontSize: 20,
            color: K.muted,
            marginBottom: 22,
          }}
        >
          <span>POST /api/orders · request</span>
          <span style={{ color: K.teal }}>filtered locally</span>
        </div>
        {lines.map(([k, secret, red], i) => {
          const t0 = 26 + i * 16;
          const sweep = interpolate(f, [t0, t0 + 14], [0, 1], { ...clamp, easing: ease });
          const done = f >= t0 + 8;
          return (
            <div
              key={k}
              style={{
                position: 'relative',
                fontFamily: MONO,
                fontSize: 30,
                lineHeight: '64px',
                color: K.ink,
                borderTop: i ? `1px solid ${K.line}` : 'none',
              }}
            >
              <span style={{ color: '#8fc7ff' }}>{k}</span>
              <span style={{ position: 'relative' }}>
                <span style={{ color: done ? K.amber : '#ffb4a8', fontWeight: done ? 600 : 400 }}>
                  {done ? red : secret}
                </span>
                {/* Redaction bar sweeps across the secret. */}
                <span
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 12,
                    height: 40,
                    width: `${interpolate(sweep, [0, 0.5, 1], [0, 100, 0])}%`,
                    marginLeft: `${interpolate(sweep, [0, 0.5, 1], [0, 0, 100])}%`,
                    background: K.amber,
                    borderRadius: 6,
                  }}
                />
              </span>
            </div>
          );
        })}
      </div>
      <div
        style={{
          position: 'absolute',
          left: 800,
          top: 740,
          display: 'flex',
          gap: 18,
          opacity: badge,
          transform: `translateY(${(1 - badge) * 20}px)`,
        }}
      >
        <div
          style={{
            padding: '16px 26px',
            borderRadius: 16,
            background: K.amberSoft,
            border: `1px solid ${K.amber}`,
            fontFamily: SANS,
            fontSize: 28,
            fontWeight: 600,
            color: K.amber,
          }}
        >
          4 sensitive values redacted
        </div>
        <div
          style={{
            padding: '16px 26px',
            borderRadius: 16,
            background: 'rgba(47,181,163,0.14)',
            border: `1px solid ${K.teal}`,
            fontFamily: MONO,
            fontSize: 24,
            color: K.teal,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <span style={{ width: 12, height: 12, borderRadius: 6, background: K.teal }} /> REPORT
          STAYS LOCAL
        </div>
      </div>
      {lines.map((_, i) => (
        <Sequence key={i} from={34 + i * 16} durationInFrames={10} layout="none">
          <Html5Audio src={tick} volume={0.4} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};

// 5 — Annotate, then export one ZIP.
const Export: React.FC<{ dur: number }> = ({ dur }) => {
  const swap = sec(3.2);
  const zipClick = swap + 92;
  return (
    <AbsoluteFill>
      <FeatureCopy
        n="04"
        tag="SHARE"
        title="Mark it. Zip it. Ship it."
        accent={['Ship']}
        sub="Highlight the problem on a frame, then download one GitHub-ready ZIP."
      />
      <Fade from={0} dur={swap + 10} fadeIn={false}>
        <Shot
          src="guide/annotated-frame.png"
          w={2880}
          h={1800}
          box={RIGHT_WIDE}
          title="Visual evidence"
          cam={[
            { f: 0, z: 1 },
            { f: 16, z: 1 },
            { f: 48, z: 1.9, c: [2140, 1100] },
          ]}
          marks={[{ from: 50, rect: d(1280, 755, 415, 103), label: 'Annotated frame' }]}
        />
      </Fade>
      <Fade from={swap} dur={dur - swap}>
        <Shot
          src="guide/09-choose-files.png"
          w={2880}
          h={1800}
          box={RIGHT_WIDE}
          title="Choose files"
          enter={false}
          cam={[
            { f: 0, z: 1.25, c: [1680, 760] },
            { f: 70, z: 1.25, c: [1680, 760] },
            { f: 92, z: 1.15, c: [1900, 1300] },
          ]}
          marks={[
            ...[290, 386, 482, 579, 674].map((y, i) => ({
              from: 6 + i * 11,
              to: 6 + i * 11 + 12,
              rect: d(1812, y + 30, 98, 36),
              spot: false,
            })),
            { from: zipClick - 4, rect: d(1748, 1183, 218, 50), label: 'Download as ZIP' },
          ]}
          clicks={[{ f: zipClick + 6, at: d(1857, 1208, 0, 0).slice(0, 2) as [number, number] }]}
        />
      </Fade>
      {[50, ...[0, 1, 2, 3, 4].map((i) => swap + 6 + i * 11), zipClick - 4].map((x) => (
        <Sequence key={x} from={x} durationInFrames={10} layout="none">
          <Html5Audio src={tick} volume={0.35} />
        </Sequence>
      ))}
      <Sequence from={zipClick + 6} durationInFrames={10} layout="none">
        <Html5Audio src={clickSfx} volume={0.6} />
      </Sequence>
    </AbsoluteFill>
  );
};

// 6 — Call to action.
const Cta: React.FC = () => {
  const f = useCurrentFrame();
  const mark = useSpring(0, 12);
  const btn = useSpring(22, 13);
  const shine = interpolate(f, [50, 80], [-30, 130], clamp);
  const url = interpolate(f, [40, 56], [0, 1], clamp);
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 26,
          transform: `scale(${0.85 + 0.15 * mark})`,
          opacity: mark,
        }}
      >
        <div
          style={{
            width: 104,
            height: 104,
            borderRadius: 28,
            background: '#fff',
            display: 'grid',
            placeItems: 'center',
            boxShadow: '0 0 50px rgba(240,166,62,0.4)',
          }}
        >
          <Img src={staticFile('brand/bugreceipt-mark.svg')} style={{ width: 66, height: 66 }} />
        </div>
        <div
          style={{
            fontFamily: SANS,
            fontWeight: 720,
            fontSize: 104,
            letterSpacing: '-0.05em',
            color: K.ink,
          }}
        >
          BugReceipt
        </div>
      </div>
      <div style={{ marginTop: 26 }}>
        <Words
          text="Free. Private. Built for Chrome."
          delay={10}
          size={44}
          weight={520}
          color={K.muted}
          accent={['Free.', 'Private.']}
        />
      </div>
      <div
        style={{
          marginTop: 54,
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          gap: 18,
          padding: '24px 46px',
          borderRadius: 999,
          background: K.amber,
          color: '#1a1206',
          fontFamily: SANS,
          fontWeight: 680,
          fontSize: 40,
          boxShadow: '0 24px 60px rgba(240,166,62,0.35)',
          transform: `scale(${0.7 + 0.3 * btn})`,
          opacity: btn,
        }}
      >
        <Img src={staticFile('brand/chrome-logo.svg')} style={{ width: 46, height: 46 }} />
        Add to Chrome, it's free
        <div
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: `${shine}%`,
            width: 120,
            background: 'linear-gradient(100deg, transparent, rgba(255,255,255,0.55), transparent)',
          }}
        />
      </div>
      <div style={{ marginTop: 30, fontFamily: MONO, fontSize: 26, color: K.muted, opacity: url }}>
        bugreceipt.netlify.app
      </div>
    </AbsoluteFill>
  );
};

/* ---------------------------------------------------------------- timeline */

const SCENES: React.FC<{ dur: number }>[] = [Hook, Brand, Record, Capture, Privacy, Export, Cta];

export const Launch: React.FC = () => (
  <AbsoluteFill style={{ background: K.bg }}>
    <Backdrop />
    {SCENES.map((S, i) => {
      const from = STARTS[i];
      const dur = STARTS[i + 1] - from + (i < SCENES.length - 1 ? XFADE : 0);
      return (
        <Sequence key={i} from={from} durationInFrames={dur}>
          <Scene dur={dur}>
            <S dur={dur} />
          </Scene>
          <Sequence from={LEAD} layout="none">
            <Html5Audio src={VOICE[i]} />
          </Sequence>
          {i > 0 && <Html5Audio src={whoosh} volume={0.22} />}
        </Sequence>
      );
    })}
  </AbsoluteFill>
);

/* ---------------------------------------------------------------- YouTube thumbnail (1280x720) */

export const LaunchThumbnail: React.FC = () => (
  <AbsoluteFill style={{ background: K.bg }}>
    <Backdrop />
    <div
      style={{
        position: 'absolute',
        left: 64,
        top: 0,
        bottom: 0,
        width: 600,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 30 }}>
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 18,
            background: '#fff',
            display: 'grid',
            placeItems: 'center',
          }}
        >
          <Img src={staticFile('brand/bugreceipt-mark.svg')} style={{ width: 42, height: 42 }} />
        </div>
        <span
          style={{
            fontFamily: SANS,
            fontWeight: 720,
            fontSize: 44,
            letterSpacing: '-0.04em',
            color: K.ink,
          }}
        >
          BugReceipt
        </span>
      </div>
      <div
        style={{
          fontFamily: SANS,
          fontWeight: 760,
          fontSize: 92,
          lineHeight: 0.98,
          letterSpacing: '-0.05em',
          color: K.ink,
        }}
      >
        Bug reports
        <br />
        with <span style={{ color: K.amber }}>proof.</span>
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 34 }}>
        {['Steps', 'Console', 'Network', 'Private'].map((c) => (
          <span
            key={c}
            style={{
              padding: '8px 16px',
              borderRadius: 999,
              border: `1px solid ${K.line}`,
              background: 'rgba(255,255,255,0.06)',
              fontFamily: MONO,
              fontSize: 20,
              color: K.ink,
            }}
          >
            <span style={{ color: K.teal }}>✓</span> {c}
          </span>
        ))}
      </div>
    </div>
    <div
      style={{
        position: 'absolute',
        inset: 0,
        transform: 'perspective(1800px) rotateY(-10deg)',
        transformOrigin: '100% 50%',
      }}
    >
      <Shot
        src="guide/07-console-evidence.png"
        w={2880}
        h={1800}
        box={[690, 120, 700, 480]}
        title="Console evidence"
        enter={false}
        cam={[{ f: 0, z: 1.55, c: [1500, 1300] }]}
        marks={[{ from: -60, rect: d(412, 862, 1500, 92), label: 'Stack trace' }]}
      />
    </div>
  </AbsoluteFill>
);
