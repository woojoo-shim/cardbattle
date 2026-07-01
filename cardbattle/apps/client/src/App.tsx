import { useState } from 'react';
import { useRoom } from './state/useRoom.js';
import { Lobby } from './ui/Lobby.js';
import { Battle } from './ui/Battle.js';
import { RoomBrowser } from './ui/RoomBrowser.js';
import { C, mono, sans } from './ui/theme.js';
import './ui/arena.css';
import type { BattleConnection } from './net/client.js';

type Connect = () => Promise<BattleConnection>;

export function App() {
  const [name, setName] = useState<string | null>(null);
  const [connect, setConnect] = useState<Connect | null>(null);

  if (name === null) return <NameGate onSubmit={setName} />;
  // useState setters treat function values as updaters, so wrap to store the connect fn itself.
  if (connect === null) return <RoomBrowser name={name} onPick={(c) => setConnect(() => c)} />;
  return <Game connect={connect} />;
}

function Game({ connect }: { connect: Connect }) {
  const { conn, ui, hand, events, error, send, setReady, addBot } = useRoom(connect);
  const myId = conn?.sessionId ?? '';

  if (!ui) {
    return <Centered>{error ? `연결 실패: ${error.message}` : '연결 중…'}</Centered>;
  }
  if (ui.phase === 'lobby') {
    return <Lobby ui={ui} myId={myId} onReady={setReady} onAddBot={addBot} />;
  }
  return <Battle ui={ui} myId={myId} hand={hand} events={events} error={error} send={send} />;
}

/** Drifting suit glyphs scattered in the deep behind the entry card. */
const GLYPHS = [
  { ch: '♠', x: '11%', y: '20%', size: 58, color: C.magic, delay: 0,   dur: 9 },
  { ch: '♥', x: '83%', y: '24%', size: 46, color: C.enemy, delay: 1.4, dur: 11 },
  { ch: '♦', x: '17%', y: '73%', size: 42, color: C.you,   delay: 0.8, dur: 10 },
  { ch: '♣', x: '87%', y: '69%', size: 52, color: C.rare,  delay: 2.1, dur: 12 },
  { ch: '♦', x: '67%', y: '13%', size: 28, color: C.you,   delay: 2.6, dur: 10 },
  { ch: '♠', x: '50%', y: '87%', size: 30, color: C.magic, delay: 1.0, dur: 13 },
] as const;

function NameGate({ onSubmit }: { onSubmit: (name: string) => void }) {
  const [value, setValue] = useState('');
  const go = () => { const n = value.trim() || 'Player'; onSubmit(n.slice(0, 16)); };
  return (
    <div style={gateWrap}>
      <div style={gateBg} className="cb-abyss-bg" aria-hidden />
      <div style={gateVignette} aria-hidden />
      <div style={glyphLayer} aria-hidden>
        {GLYPHS.map((g, i) => (
          <span
            key={i}
            className="cb-drift"
            style={{
              position: 'absolute', left: g.x, top: g.y, fontSize: g.size, color: g.color,
              opacity: 0.16, textShadow: `0 0 24px ${g.color}`, userSelect: 'none',
              ['--dur' as string]: `${g.dur}s`, ['--delay' as string]: `${g.delay}s`,
            } as React.CSSProperties}
          >
            {g.ch}
          </span>
        ))}
      </div>

      <div style={gateContent} className="cb-gate-in">
        <div style={crest} aria-hidden>
          <span style={crestRing} className="cb-crest-ring" />
          <span style={crestGlyph}>⚔</span>
        </div>
        <h1 style={brand} className="cb-brand">CARD&nbsp;BATTLE</h1>
        <p style={tagline}>◈&nbsp;&nbsp;THE ABYSSAL ARENA&nbsp;&nbsp;◈</p>

        <div style={panel}>
          <label style={label}>플레이어 이름</label>
          <input
            className="cb-nick"
            autoFocus
            value={value}
            maxLength={16}
            placeholder="닉네임을 입력하세요"
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && go()}
            style={input}
          />
          <button className="cb-enter" onClick={go} style={enter}>입장하기</button>
        </div>
        <p style={hint}>이름을 정하고 심연의 투기장에 입장하세요</p>
      </div>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div style={center}>{children}</div>;
}

const center: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
  minHeight: '100vh', gap: 16, color: C.dim, fontFamily: sans, background: C.void,
};

const gateWrap: React.CSSProperties = {
  position: 'relative', minHeight: '100vh', width: '100%', overflow: 'hidden',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: C.void, fontFamily: sans,
};
const gateBg: React.CSSProperties = {
  position: 'absolute', inset: '-20%', pointerEvents: 'none',
  background:
    'radial-gradient(60% 55% at 50% 38%, rgba(123,92,255,0.28), transparent 62%),' +
    'radial-gradient(70% 60% at 50% 108%, rgba(56,232,200,0.20), transparent 60%),' +
    'radial-gradient(40% 40% at 82% 12%, rgba(255,59,107,0.14), transparent 70%)',
};
const gateVignette: React.CSSProperties = {
  position: 'absolute', inset: 0, pointerEvents: 'none',
  background: 'radial-gradient(120% 120% at 50% 50%, transparent 55%, rgba(4,5,9,0.85) 100%)',
  boxShadow: 'inset 0 0 220px rgba(0,0,0,0.9)',
};
const glyphLayer: React.CSSProperties = {
  position: 'absolute', inset: 0, pointerEvents: 'none',
  fontFamily: '"Geist", system-ui, sans-serif',
};

const gateContent: React.CSSProperties = {
  position: 'relative', zIndex: 2,
  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
  padding: '0 20px',
};
const crest: React.CSSProperties = {
  position: 'relative', width: 72, height: 72, display: 'grid', placeItems: 'center', marginBottom: 2,
};
const crestRing: React.CSSProperties = {
  position: 'absolute', inset: 0, borderRadius: '50%',
  border: `1.5px dashed ${C.borderHi}`,
  boxShadow: `0 0 26px rgba(123,92,255,0.35), inset 0 0 18px rgba(56,232,200,0.18)`,
};
const crestGlyph: React.CSSProperties = {
  fontSize: 34, lineHeight: 1, filter: 'drop-shadow(0 0 12px rgba(244,196,74,0.6))',
};
const brand: React.CSSProperties = {
  margin: 0, fontSize: 'clamp(40px, 9vw, 64px)', fontWeight: 900, letterSpacing: 6, lineHeight: 1,
  fontFamily: sans,
  background: 'linear-gradient(90deg,#7b5cff,#3df2c0,#ff5c8a,#7b5cff)',
  WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent',
};
const tagline: React.CSSProperties = {
  margin: '2px 0 10px', fontFamily: mono, fontSize: 12, letterSpacing: 5,
  color: C.dim, textTransform: 'uppercase',
};
const panel: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 12, width: 300,
  padding: '22px 22px 24px', borderRadius: 16,
  background: 'linear-gradient(180deg, rgba(31,36,52,0.72), rgba(14,16,24,0.82))',
  border: `1px solid ${C.border}`,
  boxShadow: '0 30px 70px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)',
  backdropFilter: 'blur(8px)',
};
const label: React.CSSProperties = {
  fontFamily: mono, fontSize: 11, letterSpacing: 2, color: C.faint, textTransform: 'uppercase',
  textAlign: 'left',
};
const input: React.CSSProperties = {
  padding: '13px 16px', fontSize: 16, width: '100%', boxSizing: 'border-box', textAlign: 'center',
  color: C.text, fontFamily: sans,
  background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.borderHi}`, borderRadius: 10, outline: 'none',
};
const enter: React.CSSProperties = {
  padding: '13px 20px', fontSize: 16, fontWeight: 800, letterSpacing: 1, color: '#fff', cursor: 'pointer',
  border: 'none', borderRadius: 10, fontFamily: sans,
  background: 'linear-gradient(100deg,#7b5cff,#5b3cff 55%,#38e8c8)',
  boxShadow: '0 8px 24px rgba(123,92,255,0.45)',
};
const hint: React.CSSProperties = {
  margin: '4px 0 0', fontSize: 12, color: C.faint, fontFamily: sans,
};
