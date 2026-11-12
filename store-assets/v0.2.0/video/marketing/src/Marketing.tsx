import '@fontsource-variable/geist';
import '@fontsource-variable/geist-mono';
import React, { useEffect, useState } from 'react';
import {
  AbsoluteFill,
  Easing,
  Html5Audio,
  Img,
  Sequence,
  continueRender,
  delayRender,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import click_ from './sfx/click.wav';
import tick from './sfx/tick.wav';
import whoosh from './sfx/whoosh.wav';
import { VOICE, VOICE_SECONDS } from './voice';

export const C = {
  bg: '#f6f8f9',
  surface: '#ffffff',
  ink: '#13242f',
  muted: '#5d6d76',
  line: '#dde4e7',
  amber: '#e8a13f',
  mint: '#0f7a6d',
  danger: '#b83c24',
  coral: '#ff5c3a',
  teal: '#1f9fae',
};
export const SANS = "'Geist Variable', system-ui, sans-serif";
export const MONO = "'Geist Mono Variable', ui-monospace, monospace";
const FPS = 30;
const XFADE = 12;

// Each scene lasts its animation minimum or its narration plus breathing room, whichever is longer.
const MIN_SECONDS = [4.5, 3.5, 8.5, 8.5, 7.5, 7, 6.5];
const VOICE_LEAD = 12;
const SCENES = MIN_SECONDS.reduce(
  (starts, min, i) => [
    ...starts,
    starts[i] + Math.max(min * FPS, Math.ceil(VOICE_SECONDS[i] * FPS) + VOICE_LEAD + 20),
  ],
  [0],
);
export const TOTAL = SCENES[SCENES.length - 1];

type Rect = [number, number, number, number];
type Key = { f: number; z: number; c?: [number, number] };
// labelAt: 'below' puts the label under the ring, 'end' right-aligns it above; default is above, left-aligned.
type Mark = {
  from: number;
  to?: number;
  rect: Rect;
  label?: string;
  spot?: boolean;
  labelAt?: 'below' | 'end';
};

const ease = Easing.bezier(0.65, 0, 0.35, 1);

function useSpring(delay: number, damping = 18) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - delay, fps, config: { damping, mass: 0.8 } });
}

/** Fades a scene in and out so neighbouring scenes crossfade. */
const Scene: React.FC<{ dur: number; children: React.ReactNode }> = ({ dur, children }) => {
  const f = useCurrentFrame();
  const opacity = interpolate(f, [0, XFADE, dur - XFADE, dur], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const scale = interpolate(f, [0, dur], [1.015, 1]);
  return <AbsoluteFill style={{ opacity, transform: `scale(${scale})` }}>{children}</AbsoluteFill>;
};

const Background: React.FC = () => {
  const f = useCurrentFrame();
  const a = f / 90;
  return (
    <AbsoluteFill style={{ background: C.bg, overflow: 'hidden' }}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `linear-gradient(${C.line}55 1px, transparent 1px), linear-gradient(90deg, ${C.line}55 1px, transparent 1px)`,
          backgroundSize: '64px 64px',
          maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)',
        }}
      />
      <Blob
        color={C.amber}
        x={1500 + Math.sin(a) * 120}
        y={160 + Math.cos(a * 0.8) * 80}
        size={900}
      />
      <Blob
        color={C.teal}
        x={200 + Math.cos(a * 0.7) * 140}
        y={900 + Math.sin(a) * 90}
        size={1000}
      />
    </AbsoluteFill>
  );
};

const Blob: React.FC<{ color: string; x: number; y: number; size: number }> = ({
  color,
  x,
  y,
  size,
}) => (
  <div
    style={{
      position: 'absolute',
      left: x - size / 2,
      top: y - size / 2,
      width: size,
      height: size,
      borderRadius: '50%',
      background: color,
      opacity: 0.13,
      filter: 'blur(140px)',
    }}
  />
);

export const Mark3: React.FC<{ size: number; delay?: number }> = ({ size, delay = 0 }) => {
  const s = (i: number) => useSpring(delay + 4 + i * 5, 14);
  const bars = [
    { d: 'M27 31h76l-5 16H22z', fill: '#f8fbfc' },
    { d: 'M22 56h62l-5 16H17z', fill: C.coral },
    { d: 'M17 81h47l-5 16H12z', fill: C.teal },
  ];
  const p = bars.map((_, i) => s(i));
  const box = useSpring(delay, 16);
  return (
    <svg viewBox="0 0 128 128" width={size} height={size} style={{ transform: `scale(${box})` }}>
      <rect width="128" height="128" rx="24" fill="#102332" />
      {bars.map((b, i) => (
        <path
          key={i}
          d={b.d}
          fill={b.fill}
          style={{ transform: `translateX(${(1 - p[i]) * -60}px)`, opacity: p[i] }}
        />
      ))}
    </svg>
  );
};

/** Word-by-word rise-in text. */
const Words: React.FC<{
  text: string;
  delay: number;
  accent?: string[];
  style?: React.CSSProperties;
  stagger?: number;
}> = ({ text, delay, accent = [], style, stagger = 3 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', columnGap: '0.26em', ...style }}>
      {text.split(' ').map((w, i) => {
        const p = spring({
          frame: frame - delay - i * stagger,
          fps,
          config: { damping: 20, mass: 0.7 },
        });
        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              opacity: p,
              transform: `translateY(${(1 - p) * 34}px)`,
              filter: `blur(${(1 - p) * 8}px)`,
              color: accent.includes(w) ? C.amber : undefined,
            }}
          >
            {w}
          </span>
        );
      })}
    </div>
  );
};

const Caption: React.FC<{ kicker: string; title: string; accent: string[]; sub: string }> = ({
  kicker,
  title,
  accent,
  sub,
}) => {
  const k = useSpring(4);
  const s = useSpring(26);
  return (
    <div
      style={{
        position: 'absolute',
        left: 100,
        top: 0,
        bottom: 0,
        width: 500,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: 28,
      }}
    >
      <div
        style={{
          fontFamily: MONO,
          fontSize: 20,
          letterSpacing: 3,
          textTransform: 'uppercase',
          color: C.mint,
          opacity: k,
          display: 'flex',
          alignItems: 'center',
          gap: 14,
        }}
      >
        <span style={{ width: 40 * k, height: 3, background: C.amber, borderRadius: 2 }} />
        {kicker}
      </div>
      <Words
        text={title}
        accent={accent}
        delay={8}
        style={{
          fontFamily: SANS,
          fontWeight: 650,
          fontSize: 64,
          lineHeight: 1.06,
          color: C.ink,
          letterSpacing: -1.5,
        }}
      />
      <div
        style={{
          fontFamily: SANS,
          fontSize: 26,
          lineHeight: 1.45,
          color: C.muted,
          opacity: s,
          transform: `translateY(${(1 - s) * 16}px)`,
        }}
      >
        {sub}
      </div>
    </div>
  );
};

/** Browser-ish window chrome around one or more shots. */
export const Window: React.FC<{
  x: number;
  y: number;
  url: string;
  children: React.ReactNode;
  delay?: number;
}> = ({ x, y, url, children, delay = 0 }) => {
  const p = useSpring(delay, 20);
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        borderRadius: 18,
        overflow: 'hidden',
        background: C.surface,
        boxShadow: '0 40px 90px -30px rgba(19,36,47,0.45), 0 0 0 1px rgba(19,36,47,0.08)',
        opacity: p,
        transform: `translateY(${(1 - p) * 60}px) scale(${0.96 + p * 0.04})`,
      }}
    >
      <div
        style={{
          height: 44,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '0 18px',
          background: '#eef2f4',
          borderBottom: `1px solid ${C.line}`,
        }}
      >
        {['#ff5f57', '#febc2e', '#28c840'].map((c) => (
          <span key={c} style={{ width: 12, height: 12, borderRadius: 6, background: c }} />
        ))}
        <div
          style={{
            marginLeft: 18,
            flex: 1,
            maxWidth: 520,
            height: 26,
            borderRadius: 13,
            background: C.surface,
            fontFamily: MONO,
            fontSize: 14,
            color: C.muted,
            display: 'flex',
            alignItems: 'center',
            padding: '0 14px',
          }}
        >
          {url}
        </div>
      </div>
      <div style={{ display: 'flex' }}>{children}</div>
    </div>
  );
};

function camera(
  keys: Key[],
  f: number,
  imgW: number,
  imgH: number,
): { z: number; cx: number; cy: number } {
  const pts = keys.map((k) => ({ ...k, c: k.c ?? ([imgW / 2, imgH / 2] as [number, number]) }));
  let i = 0;
  while (i < pts.length - 1 && f >= pts[i + 1].f) i++;
  const a = pts[i];
  const b = pts[Math.min(i + 1, pts.length - 1)];
  const t = b.f === a.f ? 1 : ease(Math.min(1, Math.max(0, (f - a.f) / (b.f - a.f))));
  return {
    z: a.z + (b.z - a.z) * t,
    cx: a.c[0] + (b.c[0] - a.c[0]) * t,
    cy: a.c[1] + (b.c[1] - a.c[1]) * t,
  };
}

/** A screenshot with an animated camera and spotlight highlights drawn in image pixels. */
export const Shot: React.FC<{
  src: string;
  imgW: number;
  imgH: number;
  w: number;
  keys?: Key[];
  marks?: Mark[];
  children?: (scale: number) => React.ReactNode;
}> = ({ src, imgW, imgH, w, keys = [{ f: 0, z: 1 }], marks = [], children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const k = w / imgW;
  const h = imgH * k;
  const { z, cx, cy } = camera(keys, frame, imgW, imgH);
  const s = k * z;
  const tx = Math.min(0, Math.max(w - imgW * s, w / 2 - cx * s));
  const ty = Math.min(0, Math.max(h - imgH * s, h / 2 - cy * s));
  // Visible part of the image; marks are clipped to it so a ring is never cut off by the frame edge.
  const inset = 20 / s;
  const vx0 = -tx / s + inset;
  const vy0 = -ty / s + inset;
  const vx1 = (w - tx) / s - inset;
  const vy1 = (h - ty) / s - inset;
  marks = marks.map((m) => {
    const [x, y, rw, rh] = m.rect;
    const x0 = Math.max(x, vx0);
    const y0 = Math.max(y, vy0);
    return { ...m, rect: [x0, y0, Math.min(x + rw, vx1) - x0, Math.min(y + rh, vy1) - y0] };
  });
  const spot = marks.reduce((m, mk) => {
    if (!mk.spot) return m;
    const on = spring({ frame: frame - mk.from, fps, config: { damping: 22 } });
    const off = mk.to ? spring({ frame: frame - mk.to, fps, config: { damping: 22 } }) : 0;
    return Math.max(m, on - off);
  }, 0);
  return (
    <div
      style={{
        position: 'relative',
        width: w,
        height: h,
        overflow: 'hidden',
        background: C.surface,
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: imgW,
          height: imgH,
          transformOrigin: '0 0',
          transform: `translate(${tx}px, ${ty}px) scale(${s})`,
        }}
      >
        <Img src={staticFile(src)} style={{ width: imgW, height: imgH, display: 'block' }} />
        {/* Dim everything outside the active marks. */}
        <svg
          width={imgW}
          height={imgH}
          style={{ position: 'absolute', inset: 0, opacity: spot * 0.55 }}
        >
          <defs>
            <mask id={`m-${src}`}>
              <rect width={imgW} height={imgH} fill="white" />
              {marks
                .filter((m) => m.spot && frame >= m.from && (!m.to || frame < m.to + 10))
                .map((m, i) => (
                  <rect
                    key={i}
                    x={m.rect[0] - 10 / s}
                    y={m.rect[1] - 10 / s}
                    width={m.rect[2] + 20 / s}
                    height={m.rect[3] + 20 / s}
                    rx={14 / s}
                    fill="black"
                  />
                ))}
            </mask>
          </defs>
          <rect width={imgW} height={imgH} fill={C.ink} mask={`url(#m-${src})`} />
        </svg>
        {marks.map((m, i) => (
          <React.Fragment key={i}>
            <Highlight mark={m} scale={s} viewTop={vy0} />
            <Sequence from={m.from} durationInFrames={6} layout="none">
              <Html5Audio src={tick} volume={0.35} />
            </Sequence>
          </React.Fragment>
        ))}
        {children?.(s)}
      </div>
    </div>
  );
};

const Highlight: React.FC<{ mark: Mark; scale: number; viewTop: number }> = ({
  mark,
  scale,
  viewTop,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const on = spring({ frame: frame - mark.from, fps, config: { damping: 14, mass: 0.6 } });
  const off = mark.to ? spring({ frame: frame - mark.to, fps, config: { damping: 22 } }) : 0;
  const p = Math.max(0, on - off);
  if (p <= 0.001) return null;
  const pad = 10 / scale;
  const [x, y, w, h] = mark.rect;
  const pulse = 1 + Math.sin((frame - mark.from) / 6) * 0.15 * Math.exp(-(frame - mark.from) / 40);
  return (
    <>
      <div
        style={{
          position: 'absolute',
          left: x - pad,
          top: y - pad,
          width: w + pad * 2,
          height: h + pad * 2,
          borderRadius: 14 / scale,
          border: `${4 / scale}px solid ${C.amber}`,
          boxShadow: `0 0 0 ${(6 * pulse) / scale}px ${C.amber}40, 0 0 ${40 / scale}px ${C.amber}80`,
          opacity: p,
          transform: `scale(${1.06 - 0.06 * p})`,
        }}
      />
      {mark.label && (
        <div
          style={{
            position: 'absolute',
            left: mark.labelAt === 'end' ? x + w + pad : x - pad,
            // Label sits above the ring, or below it when asked or when the ring hugs the top of the frame.
            top:
              mark.labelAt === 'below' || y - pad - 52 / scale < viewTop - 12 / scale
                ? y + h + pad + 12 / scale
                : y - pad - 52 / scale,
            fontFamily: SANS,
            fontWeight: 600,
            fontSize: 22 / scale,
            lineHeight: `${40 / scale}px`,
            padding: `0 ${16 / scale}px`,
            borderRadius: 20 / scale,
            background: C.ink,
            color: '#fff',
            whiteSpace: 'nowrap',
            opacity: p,
            transform: `${mark.labelAt === 'end' ? 'translateX(-100%) ' : ''}translateY(${(1 - p) * (12 / scale)}px)`,
            boxShadow: `0 ${8 / scale}px ${24 / scale}px rgba(19,36,47,0.3)`,
          }}
        >
          <span style={{ color: C.amber, marginRight: 10 / scale }}>●</span>
          {mark.label}
        </div>
      )}
    </>
  );
};

/** Pointer that glides to a target and clicks; coordinates in image pixels. */
const Cursor: React.FC<{
  scale: number;
  from: [number, number];
  to: [number, number];
  start: number;
  arrive: number;
  click: number;
}> = ({ scale, from, to, start, arrive, click }) => {
  const f = useCurrentFrame();
  if (f < start - 8) return null;
  const t = ease(Math.min(1, Math.max(0, (f - start) / (arrive - start))));
  const x = from[0] + (to[0] - from[0]) * t;
  const y = from[1] + (to[1] - from[1]) * t;
  const appear = Math.min(1, (f - start + 8) / 8);
  const press = f >= click && f < click + 6 ? 0.85 : 1;
  const ring = interpolate(f, [click, click + 18], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const u = 1 / scale;
  return (
    <>
      <Sequence from={click} durationInFrames={4} layout="none">
        <Html5Audio src={click_} volume={0.6} />
      </Sequence>
      {f >= click && ring < 1 && (
        <div
          style={{
            position: 'absolute',
            left: to[0] - 40 * u,
            top: to[1] - 40 * u,
            width: 80 * u,
            height: 80 * u,
            borderRadius: '50%',
            border: `${3 * u}px solid ${C.amber}`,
            opacity: 1 - ring,
            transform: `scale(${0.3 + ring})`,
          }}
        />
      )}
      <svg
        viewBox="0 0 24 24"
        width={34 * u}
        height={34 * u}
        style={{
          position: 'absolute',
          left: x - 4 * u,
          top: y - 2 * u,
          opacity: appear,
          transform: `scale(${press})`,
          transformOrigin: '0 0',
          filter: `drop-shadow(0 ${3 * u}px ${5 * u}px rgba(0,0,0,0.35))`,
        }}
      >
        <path
          d="M4 2l15 11-7 1-3.5 7z"
          fill={C.ink}
          stroke="#fff"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    </>
  );
};

const Hook: React.FC = () => {
  const card = useSpring(4, 16);
  const shake = interpolate(useCurrentFrame(), [36, 40, 44, 48, 52], [0, -8, 8, -4, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <AbsoluteFill
      style={{ alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 70 }}
    >
      <div
        style={{
          width: 820,
          padding: '34px 40px',
          borderRadius: 22,
          background: C.surface,
          boxShadow: '0 30px 80px -30px rgba(19,36,47,0.4), 0 0 0 1px rgba(19,36,47,0.08)',
          opacity: card,
          transform: `translateY(${(1 - card) * 50}px) translateX(${shake}px)`,
          fontFamily: SANS,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            fontFamily: MONO,
            fontSize: 20,
            color: C.muted,
          }}
        >
          <span style={{ width: 14, height: 14, borderRadius: 7, background: C.danger }} /> BUG-1042
          · opened just now
        </div>
        <div
          style={{ marginTop: 18, fontSize: 46, fontWeight: 650, color: C.ink, letterSpacing: -1 }}
        >
          “Checkout is broken.”
        </div>
        <div style={{ marginTop: 10, fontSize: 28, color: C.muted }}>
          It doesn’t work. Please fix ASAP.
        </div>
      </div>
      <Words
        text="No steps. No logs. No proof."
        delay={100}
        stagger={10}
        accent={['proof.']}
        style={{
          fontFamily: SANS,
          fontWeight: 650,
          fontSize: 84,
          letterSpacing: -2,
          color: C.ink,
          justifyContent: 'center',
        }}
      />
    </AbsoluteFill>
  );
};

const Logo: React.FC = () => {
  const word = useSpring(16);
  return (
    <AbsoluteFill
      style={{ alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 40 }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 36 }}>
        <Mark3 size={170} />
        <div
          style={{
            fontFamily: SANS,
            fontWeight: 700,
            fontSize: 128,
            letterSpacing: -4,
            color: C.ink,
            opacity: word,
            transform: `translateX(${(1 - word) * -40}px)`,
          }}
        >
          BugReceipt
        </div>
      </div>
      <Words
        text="Bug reports developers can reproduce."
        delay={30}
        accent={['reproduce.']}
        style={{ fontFamily: SANS, fontSize: 46, color: C.muted, fontWeight: 500 }}
      />
    </AbsoluteFill>
  );
};

const RecordScene: React.FC = () => (
  <AbsoluteFill>
    <Caption
      kicker="01 · Capture"
      title="Record the tab. Add steps as you go."
      accent={['steps']}
      sub="Pick the broken tab, reproduce the bug, and narrate what you did. Nothing else to set up."
    />
    <Window x={660} y={188} url="shop.example.test/checkout" delay={2}>
      <Shot
        src="guide/hero-page.png"
        imgW={1800}
        imgH={1520}
        w={780}
        marks={[{ from: 24, rect: [1118, 820, 584, 135], label: 'The bug', labelAt: 'below' }]}
      />
      <div style={{ borderLeft: `1px solid ${C.line}` }}>
        <PanelIn delay={46}>
          <Shot
            src="guide/03-recording.png"
            imgW={880}
            imgH={1520}
            w={380}
            marks={[
              {
                from: 80,
                to: 140,
                rect: [40, 170, 800, 215],
                label: 'Recording + diagnostics',
                spot: true,
              },
              { from: 145, rect: [40, 522, 800, 203], label: 'Your steps', spot: true },
            ]}
          />
        </PanelIn>
      </div>
    </Window>
  </AbsoluteFill>
);

const PanelIn: React.FC<{ delay: number; children: React.ReactNode }> = ({ delay, children }) => {
  const p = useSpring(delay, 20);
  return <div style={{ opacity: p, transform: `translateX(${(1 - p) * 80}px)` }}>{children}</div>;
};

/** Crossfades between two shots inside one window. */
const Swap: React.FC<{ at: number; a: React.ReactNode; b: React.ReactNode }> = ({ at, a, b }) => {
  const f = useCurrentFrame();
  const t = interpolate(f, [at, at + 12], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <div style={{ position: 'relative' }}>
      <div style={{ opacity: 1 - t }}>{a}</div>
      <div style={{ position: 'absolute', inset: 0, opacity: t }}>
        <Sequence from={at} layout="none">
          {b}
        </Sequence>
      </div>
    </div>
  );
};

const W = 1180;

const DiagnosticsScene: React.FC = () => (
  <AbsoluteFill>
    <Caption
      kicker="02 · Diagnostics"
      title="Console and network, captured."
      accent={['captured.']}
      sub="Errors, stack traces and the failing request, with secrets filtered out before anything is stored."
    />
    <Window x={640} y={150} url="BugReceipt · Review evidence" delay={2}>
      <Swap
        at={135}
        a={
          <Shot
            src="guide/07-console-evidence.png"
            imgW={2880}
            imgH={1800}
            w={W}
            keys={[
              { f: 10, z: 1 },
              { f: 40, z: 1.75, c: [1300, 1150] },
              { f: 92, z: 1.75, c: [1300, 1150] },
              { f: 118, z: 1.45, c: [1900, 560] },
            ]}
            marks={[
              {
                from: 44,
                to: 96,
                rect: [588, 1123, 2192, 257],
                label: 'Failed request + uncaught error',
                spot: true,
              },
              {
                from: 112,
                rect: [1822, 367, 396, 43],
                label: 'Secrets redacted locally',
                spot: true,
              },
            ]}
          />
        }
        b={
          <Shot
            src="guide/08-network-evidence.png"
            imgW={2880}
            imgH={1800}
            w={W}
            keys={[
              { f: 0, z: 1.15, c: [1440, 1100] },
              { f: 30, z: 1.55, c: [1400, 1250] },
            ]}
            marks={[
              { from: 18, rect: [613, 953, 2143, 161], label: 'The failing request', spot: true },
              {
                from: 52,
                rect: [645, 1300, 2076, 367],
                label: 'Response body included',
                spot: true,
              },
            ]}
          />
        }
      />
    </Window>
  </AbsoluteFill>
);

const ReviewScene: React.FC = () => (
  <AbsoluteFill>
    <Caption
      kicker="03 · Review & export"
      title="Mark the problem. Ship one ZIP."
      accent={['ZIP.']}
      sub="Annotate frames, remove anything private, and download a GitHub-ready report."
    />
    <Window x={640} y={150} url="BugReceipt · Review evidence" delay={2}>
      <Swap
        at={105}
        a={
          <Shot
            src="guide/annotated-frame.png"
            imgW={2880}
            imgH={1800}
            w={W}
            keys={[
              { f: 10, z: 1 },
              { f: 40, z: 1.8, c: [2100, 1150] },
            ]}
            marks={[
              {
                from: 44,
                rect: [1843, 1089, 595, 144],
                label: 'Marked on the frame',
                labelAt: 'below',
                spot: true,
              },
            ]}
          />
        }
        b={
          <Shot
            src="guide/09-choose-files.png"
            imgW={2880}
            imgH={1800}
            w={W}
            keys={[
              { f: 0, z: 1 },
              { f: 40, z: 1 },
              { f: 66, z: 1.7, c: [2300, 1500] },
            ]}
            marks={[
              {
                from: 12,
                to: 46,
                rect: [588, 415, 2195, 693],
                label: 'Report, recording, frames, console, HAR',
                spot: true,
              },
              { from: 74, rect: [2516, 1704, 315, 72], label: 'One click', spot: true },
            ]}
          >
            {(s) => (
              <Cursor
                scale={s}
                from={[1700, 1100]}
                to={[2660, 1742]}
                start={50}
                arrive={76}
                click={84}
              />
            )}
          </Shot>
        }
      />
    </Window>
  </AbsoluteFill>
);

const ContextMenu: React.FC<{ scale: number; at: number; hover: number }> = ({
  scale,
  at,
  hover,
}) => {
  const p = useSpring(at, 20);
  const f = useCurrentFrame();
  if (f < at || f > hover + 24) return null;
  const u = 1 / scale;
  const items = [
    'Copy',
    'Search Google for “Almost ready…”',
    'Print…',
    'Suggest a correction',
    'Inspect',
  ];
  return (
    <div
      style={{
        position: 'absolute',
        left: 1530,
        top: 345,
        width: 300 * u,
        padding: `${8 * u}px 0`,
        borderRadius: 10 * u,
        background: '#fff',
        boxShadow: `0 ${12 * u}px ${36 * u}px rgba(19,36,47,0.28), 0 0 0 ${1 * u}px rgba(19,36,47,0.1)`,
        fontFamily: SANS,
        fontSize: 15 * u,
        color: C.ink,
        opacity: p,
        transform: `scale(${0.92 + 0.08 * p})`,
        transformOrigin: '0 0',
      }}
    >
      {items.map((t) => {
        const ours = t === 'Suggest a correction';
        const active = ours && f >= hover;
        return (
          <div
            key={t}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10 * u,
              padding: `${7 * u}px ${14 * u}px`,
              background: active ? `${C.amber}33` : 'transparent',
              fontWeight: ours ? 600 : 400,
              borderTop: t === 'Inspect' ? `${1 * u}px solid ${C.line}` : undefined,
            }}
          >
            {ours ? (
              <Img
                src={staticFile('brand/bugreceipt-mark.svg')}
                style={{ width: 16 * u, height: 16 * u }}
              />
            ) : (
              <span style={{ width: 16 * u }} />
            )}
            {t}
          </div>
        );
      })}
    </div>
  );
};

const CorrectionScene: React.FC = () => {
  const f = useCurrentFrame();
  const panel = useSpring(100, 20);
  return (
    <AbsoluteFill>
      <Caption
        kicker="04 · Corrections"
        title="Wrong wording? Right-click it."
        accent={['Right-click']}
        sub="Select any text, suggest a fix, and export it with a screenshot for the developer."
      />
      <Window x={640} y={150} url="shop.example.test/checkout" delay={2}>
        <Shot
          src="guide/11-select-text.png"
          imgW={2880}
          imgH={1800}
          w={W}
          keys={[
            { f: 8, z: 1 },
            { f: 34, z: 1.6, c: [1250, 520] },
            { f: 92, z: 1.6, c: [1250, 520] },
            { f: 118, z: 1 },
          ]}
          marks={[
            {
              from: 14,
              to: 100,
              rect: [400, 317, 1126, 48],
              label: 'Selected text',
              labelAt: 'end',
            },
          ]}
        >
          {(s) => (
            <>
              <ContextMenu scale={s} at={40} hover={64} />
              {f < 100 && (
                <Cursor
                  scale={s}
                  from={[1300, 700]}
                  to={[1680, 528]}
                  start={44}
                  arrive={64}
                  click={74}
                />
              )}
            </>
          )}
        </Shot>
      </Window>
      <div
        style={{
          position: 'absolute',
          left: 1380,
          top: 120,
          borderRadius: 18,
          overflow: 'hidden',
          boxShadow: '0 40px 90px -20px rgba(19,36,47,0.55), 0 0 0 1px rgba(19,36,47,0.1)',
          opacity: panel,
          transform: `translateX(${(1 - panel) * 120}px)`,
        }}
      >
        <Sequence from={100} layout="none">
          <Shot
            src="guide/13-correction-suggestion.png"
            imgW={880}
            imgH={1520}
            w={440}
            marks={[
              { from: 26, to: 70, rect: [40, 858, 800, 180], label: 'Your wording', spot: true },
              {
                from: 70,
                rect: [40, 1408, 586, 72],
                label: 'Export JSON + screenshot',
                spot: true,
              },
            ]}
          />
        </Sequence>
      </div>
    </AbsoluteFill>
  );
};

const Outro: React.FC = () => {
  const pills = ['Stays on your machine', 'Secrets filtered', 'No account needed'];
  const cta = useSpring(60, 14);
  return (
    <AbsoluteFill
      style={{ alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 44 }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
        <Mark3 size={96} />
        <span
          style={{
            fontFamily: SANS,
            fontWeight: 700,
            fontSize: 64,
            letterSpacing: -2,
            color: C.ink,
          }}
        >
          BugReceipt
        </span>
      </div>
      <Words
        text="One capture. Everything a developer needs."
        delay={12}
        accent={['Everything']}
        style={{
          fontFamily: SANS,
          fontWeight: 650,
          fontSize: 72,
          letterSpacing: -2,
          color: C.ink,
          justifyContent: 'center',
          maxWidth: 1700,
        }}
      />
      <div style={{ display: 'flex', gap: 18 }}>
        {pills.map((t, i) => (
          <Pill key={t} text={t} delay={34 + i * 6} />
        ))}
      </div>
      <div
        style={{
          marginTop: 10,
          display: 'flex',
          alignItems: 'center',
          gap: 18,
          padding: '22px 40px',
          borderRadius: 18,
          background: C.amber,
          fontFamily: SANS,
          fontWeight: 650,
          fontSize: 36,
          color: C.ink,
          boxShadow: `0 20px 50px -15px ${C.amber}`,
          transform: `scale(${cta})`,
        }}
      >
        <Img src={staticFile('brand/chrome-logo.svg')} style={{ width: 44, height: 44 }} />
        Add to Chrome — it’s free
      </div>
      <div style={{ fontFamily: MONO, fontSize: 26, color: C.muted, opacity: cta }}>
        bugreceipt.netlify.app
      </div>
    </AbsoluteFill>
  );
};

const Pill: React.FC<{ text: string; delay: number }> = ({ text, delay }) => {
  const p = useSpring(delay);
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 24px',
        borderRadius: 999,
        background: C.surface,
        border: `1px solid ${C.line}`,
        fontFamily: SANS,
        fontSize: 26,
        color: C.ink,
        opacity: p,
        transform: `translateY(${(1 - p) * 20}px)`,
      }}
    >
      <span style={{ width: 10, height: 10, borderRadius: 5, background: C.mint }} />
      {text}
    </div>
  );
};

const ORDER = [Hook, Logo, RecordScene, DiagnosticsScene, ReviewScene, CorrectionScene, Outro];

export const Marketing: React.FC = () => {
  const [handle] = useState(() => delayRender('fonts'));
  useEffect(() => {
    document.fonts.ready.then(() => continueRender(handle));
  }, [handle]);
  return (
    <AbsoluteFill>
      <Background />
      {ORDER.map((S, i) => {
        const from = SCENES[i];
        // Every scene but the last runs XFADE frames past its cut so the next one fades in over it.
        const dur = SCENES[i + 1] - from + (i < ORDER.length - 1 ? XFADE : 0);
        return (
          <Sequence key={i} from={from} durationInFrames={dur}>
            <Scene dur={dur}>
              <S />
            </Scene>
            <Sequence from={VOICE_LEAD} layout="none">
              <Html5Audio src={VOICE[i]} />
            </Sequence>
          </Sequence>
        );
      })}
      {SCENES.slice(1, -1).map((cut) => (
        <Sequence key={cut} from={cut - 18} durationInFrames={27} layout="none">
          <Html5Audio src={whoosh} volume={0.3} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
