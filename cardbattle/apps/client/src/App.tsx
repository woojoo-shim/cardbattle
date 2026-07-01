import { useState } from 'react';
import { useRoom } from './state/useRoom.js';
import { Lobby } from './ui/Lobby.js';
import { Battle } from './ui/Battle.js';
import { RoomBrowser } from './ui/RoomBrowser.js';
import { C, RARITY_BORDER, mono, sans } from './ui/theme.js';
import { CardArt } from './ui/art/CardArt.js';
import './ui/arena.css';
import type { BattleConnection } from './net/client.js';

type Connect = () => Promise<BattleConnection>;

export function App() {
  const [name, setName] = useState<string | null>(null);
  const [connect, setConnect] = useState<Connect | null>(null);

  if (name === null) return <NameGate onSubmit={setName} />;
  // useState setters treat function values as updaters, so wrap to store the connect fn itself.
  if (connect === null) return <RoomBrowser name={name} onPick={(c) => setConnect(() => c)} />;
  // Dropping `connect` unmounts Game → useRoom's cleanup leaves the room → back to the browser.
  return <Game connect={connect} onExit={() => setConnect(null)} />;
}

function Game({ connect, onExit }: { connect: Connect; onExit: () => void }) {
  const { conn, ui, hand, events, error, send, setReady, addBot } = useRoom(connect);
  const myId = conn?.sessionId ?? '';

  if (!ui) {
    return <Centered>{error ? `연결 실패: ${error.message}` : '연결 중…'}</Centered>;
  }
  if (ui.phase === 'lobby') {
    return <Lobby ui={ui} myId={myId} onReady={setReady} onAddBot={addBot} />;
  }
  return <Battle ui={ui} myId={myId} hand={hand} events={events} error={error} send={send} onExit={onExit} />;
}

/** A fanned hand of real game cards, dealt across the void behind the title. */
const HERO_CARDS = [
  { id: 'reverse',   rarity: 'rare',      a: -22, x: -168, y: 34 },
  { id: 'bomb',      rarity: 'epic',      a: -11, x: -88,  y: 9 },
  { id: 'snipe',     rarity: 'legendary', a: 0,   x: 0,    y: 0 },
  { id: 'greatheal', rarity: 'rare',      a: 11,  x: 88,   y: 9 },
  { id: 'sword',     rarity: 'common',    a: 22,  x: 168,  y: 34 },
] as const;

function NameGate({ onSubmit }: { onSubmit: (name: string) => void }) {
  const [value, setValue] = useState('');
  const go = () => { const n = value.trim() || 'Player'; onSubmit(n.slice(0, 16)); };
  return (
    <div style={gateWrap}>
      <div style={gateGlow} aria-hidden />
      <div style={gateVignette} aria-hidden />

      <div style={gateContent} className="cb-gate-in">
        <span style={kicker}>◈&nbsp;&nbsp;THE&nbsp;ABYSSAL&nbsp;ARENA&nbsp;&nbsp;◈</span>
        <h1 style={brand}>CARD&nbsp;BATTLE</h1>
        <div style={ruleWrap} aria-hidden><span className="cb-rule" style={rule} /></div>

        <div style={heroFan} className="cb-hero-float" aria-hidden>
          {HERO_CARDS.map((c) => (
            <div key={c.id} style={heroCard(c)}>
              <div style={heroSheen} />
              <CardArt id={c.id} size={54} />
            </div>
          ))}
        </div>

        <div style={field} className="cb-field">
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
          <button className="cb-enter" onClick={go} style={enter} aria-label="입장">
            입장&nbsp;<span style={{ fontWeight: 900 }}>→</span>
          </button>
        </div>
        <p style={hint}>이름을 정하고 심연의 투기장에 뛰어드세요</p>
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
  display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: sans,
  background:
    'radial-gradient(72% 52% at 50% 116%, rgba(56,232,200,0.10), transparent 60%),' +
    'radial-gradient(60% 46% at 50% -12%, rgba(123,92,255,0.11), transparent 62%),' +
    '#07080d',
};
// One restrained pool of light behind the hand — glow is a moment, not wallpaper.
const gateGlow: React.CSSProperties = {
  position: 'absolute', left: '50%', top: '46%', width: 520, height: 300,
  transform: 'translate(-50%, -50%)', pointerEvents: 'none', borderRadius: '50%',
  background: 'radial-gradient(ellipse at center, rgba(123,92,255,0.16), transparent 68%)',
  filter: 'blur(6px)',
};
const gateVignette: React.CSSProperties = {
  position: 'absolute', inset: 0, pointerEvents: 'none',
  background: 'radial-gradient(125% 115% at 50% 44%, transparent 56%, rgba(4,5,9,0.92) 100%)',
};

const gateContent: React.CSSProperties = {
  position: 'relative', zIndex: 2,
  display: 'flex', flexDirection: 'column', alignItems: 'center',
  padding: '0 20px',
};
const kicker: React.CSSProperties = {
  fontFamily: mono, fontSize: 11, letterSpacing: 6, color: C.faint, textTransform: 'uppercase',
  marginBottom: 12,
};
// Brushed-metal title — near-white with a top-lit sheen, engraved by a soft drop shadow.
const brand: React.CSSProperties = {
  margin: 0, fontSize: 'clamp(44px, 9.5vw, 70px)', fontWeight: 900, letterSpacing: 3, lineHeight: 1,
  fontFamily: sans,
  background: 'linear-gradient(180deg, #ffffff 0%, #d3d8ea 46%, #8890a8 100%)',
  WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent',
  filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.6))',
};
const ruleWrap: React.CSSProperties = {
  marginTop: 14, width: 'min(340px, 74vw)', height: 2, borderRadius: 2, overflow: 'hidden',
};
const rule: React.CSSProperties = {
  display: 'block', width: '100%', height: '100%',
  background: 'linear-gradient(90deg, transparent, #38e8c8 32%, #8b6cff 68%, transparent)',
  backgroundSize: '220% 100%',
};

const heroFan: React.CSSProperties = {
  position: 'relative', width: 'min(440px, 92vw)', height: 168, margin: '30px 0 34px',
  pointerEvents: 'none', filter: 'drop-shadow(0 22px 44px rgba(0,0,0,0.55))',
};
function heroCard(c: (typeof HERO_CARDS)[number]): React.CSSProperties {
  const depth = Math.abs(c.a);
  const opacity = depth === 0 ? 1 : depth >= 22 ? 0.66 : 0.85;
  return {
    position: 'absolute', left: '50%', top: '50%', width: 88, height: 122, opacity,
    transform: `translate(-50%, -50%) translate(${c.x}px, ${c.y}px) rotate(${c.a}deg)`,
    background: 'linear-gradient(180deg, #1c2233, #0d121c)',
    border: `1px solid ${RARITY_BORDER[c.rarity]}`, borderRadius: 12,
    display: 'grid', placeItems: 'center', overflow: 'hidden',
    boxShadow: `0 12px 26px rgba(0,0,0,0.5), inset 0 0 22px ${RARITY_BORDER[c.rarity]}22`,
  };
}
const heroSheen: React.CSSProperties = {
  position: 'absolute', inset: 0, pointerEvents: 'none',
  background: 'linear-gradient(150deg, rgba(255,255,255,0.10), transparent 42%)',
};

// A single pill housing the name field + enter action; the whole pill lights on focus.
const field: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 6, width: 'min(360px, 90vw)', padding: 6,
  borderRadius: 14, background: 'rgba(20,24,34,0.72)', border: `1px solid ${C.border}`,
  boxShadow: '0 24px 60px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.04)',
  backdropFilter: 'blur(8px)',
};
const input: React.CSSProperties = {
  flex: 1, minWidth: 0, padding: '12px 14px', fontSize: 16, color: C.text, fontFamily: sans,
  background: 'transparent', border: 'none', outline: 'none',
};
const enter: React.CSSProperties = {
  flexShrink: 0, padding: '12px 20px', fontSize: 15, fontWeight: 800, letterSpacing: 0.5,
  color: '#fff', cursor: 'pointer', border: 'none', borderRadius: 10, fontFamily: sans,
  background: 'linear-gradient(100deg, #6d4bff, #5b3cff 60%, #2fb8a0)',
  boxShadow: '0 6px 18px rgba(123,92,255,0.4)',
};
const hint: React.CSSProperties = {
  margin: '16px 0 0', fontSize: 12.5, color: C.faint, fontFamily: sans, letterSpacing: 0.2,
};
