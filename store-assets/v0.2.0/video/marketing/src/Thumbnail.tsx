import { AbsoluteFill } from 'remotion';
import { C, MONO, Mark3, SANS, Shot, Window } from './Marketing';

// Reused animated parts get negative delays so frame 0 shows them settled.
export const Thumbnail: React.FC = () => (
  <AbsoluteFill style={{ background: '#0d1c27', overflow: 'hidden', fontFamily: SANS }}>
    <div style={{ position: 'absolute', right: -160, top: -200, width: 760, height: 760, borderRadius: '50%', background: C.amber, opacity: 0.22, filter: 'blur(150px)' }} />
    <div style={{ position: 'absolute', left: -200, bottom: -260, width: 700, height: 700, borderRadius: '50%', background: C.teal, opacity: 0.25, filter: 'blur(150px)' }} />

    <div style={{ position: 'absolute', left: 64, top: 52, display: 'flex', alignItems: 'center', gap: 16 }}>
      <Mark3 size={60} delay={-60} />
      <span style={{ fontWeight: 700, fontSize: 38, letterSpacing: -1, color: '#fff' }}>BugReceipt</span>
    </div>

    <div style={{ position: 'absolute', left: 64, top: 186, width: 620 }}>
      <div style={{ position: 'relative', display: 'inline-block', fontSize: 58, fontWeight: 650, color: '#8a9aa3', letterSpacing: -1.5 }}>
        “It’s broken.”
        <span style={{ position: 'absolute', left: -6, right: -6, top: '52%', height: 8, borderRadius: 4, background: C.coral, transform: 'rotate(-4deg)' }} />
      </div>
      <div style={{ marginTop: 18, fontSize: 112, lineHeight: 0.95, fontWeight: 750, letterSpacing: -4, color: '#fff' }}>Here’s the</div>
      <div style={{ fontSize: 150, lineHeight: 1, fontWeight: 800, letterSpacing: -6, color: C.amber }}>proof.</div>
      <div style={{ marginTop: 22, fontFamily: MONO, fontSize: 24, letterSpacing: 1, color: '#b7c4cb' }}>VIDEO · CONSOLE · NETWORK</div>
    </div>

    <div style={{ position: 'absolute', inset: 0, transform: 'rotate(-4deg)', transformOrigin: '75% 50%' }}>
      <Window x={700} y={170} url="BugReceipt · Review evidence" delay={-60}>
        <Shot
          src="guide/08-network-evidence.png"
          imgW={2880}
          imgH={1800}
          w={540}
          keys={[{ f: 0, z: 1.6, c: [1350, 1250] }]}
          marks={[
            { from: -60, rect: [613, 953, 2143, 161], label: 'POST /api/orders · 422', spot: true },
            { from: -60, rect: [645, 1300, 2076, 367], spot: true },
          ]}
        />
      </Window>
    </div>
  </AbsoluteFill>
);
