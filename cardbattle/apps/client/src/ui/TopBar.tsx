import { useEffect, useState } from 'react';
import type { UiState } from '../state/useRoom.js';
import { C, mono, sans } from './theme.js';

interface Props {
  ui: UiState;
  myId: string;
}

/** Full-width ribbon: round + survivor count, whose-turn pill (lit teal on my turn),
 * and a donut countdown that pulses crimson under 5s. The most important signal on screen. */
export function TopBar({ ui, myId }: Props) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);

  const activeId = ui.turnOrder[ui.currentTurnIndex];
  const active = ui.players.find((p) => p.id === activeId);
  const isMyTurn = activeId === myId;
  const alive = ui.players.filter((p) => p.alive).length;
  const total = ui.players.length;

  const totalMs = 30000; // TURN_SECONDS; visual only
  const remainMs = Math.max(0, (ui.turnDeadline || 0) - now); // turnDeadline is 0/NaN before the first turn arms
  const remain = Math.ceil(remainMs / 1000);
  const pct = Math.max(0, Math.min(100, (remainMs / totalMs) * 100));
  const danger = remain <= 5;
  const ringColor = danger ? C.enemy : isMyTurn ? C.you : C.dim;

  return (
    <div style={{ ...bar, background: isMyTurn ? ribbonLit : ribbonIdle }}>
      <div style={round}>
        ☠ ROUND <b style={{ color: C.text }}>{ui.roundCount}</b>
        <span title={ui.turnDir === -1 ? '역방향 진행' : '정방향 진행'}
          style={{ ...dirTag, color: ui.turnDir === -1 ? C.enemy : C.dim }}>
          {ui.turnDir === -1 ? '↺' : '↻'}
        </span>
        {' · '}생존{' '}
        <b style={{ color: C.text }}>{alive}</b>
        <span style={{ color: C.faint }}>/{total}</span>
      </div>

      <div style={center}>
        <div style={{ ...pill, ...(isMyTurn ? pillMine : pillOther) }}>
          {isMyTurn && <span style={dot} />}
          {isMyTurn ? '당신의 턴' : `${active?.name ?? '...'} 의 턴`}
        </div>
      </div>

      <div style={timer}>
        <span
          style={{
            ...ring,
            background: `conic-gradient(${ringColor} ${pct}%, #21263a 0)`,
            animation: danger ? 'cb-pulse 1s infinite' : undefined,
          }}
        />
        <span style={{ color: danger ? C.enemy : C.text, minWidth: 26, textAlign: 'right' }}>{remain}</span>
      </div>
    </div>
  );
}

const bar: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 24, padding: '0 24px',
  borderBottom: `1px solid ${C.border}`, fontFamily: sans, position: 'relative', zIndex: 20,
};
const ribbonLit = `linear-gradient(180deg, rgba(56,232,200,0.12), transparent 80%)`;
const ribbonIdle = `linear-gradient(180deg, rgba(255,255,255,0.02), transparent 80%)`;
const round: React.CSSProperties = { fontFamily: mono, fontSize: 13, color: C.dim, letterSpacing: 1 };
const dirTag: React.CSSProperties = { fontSize: 15, fontWeight: 800, margin: '0 2px 0 6px' };
const center: React.CSSProperties = { flex: 1, display: 'flex', justifyContent: 'center' };
const pill: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 10, padding: '8px 22px', borderRadius: 999,
  fontWeight: 800, fontSize: 20, letterSpacing: 1,
};
const pillMine: React.CSSProperties = {
  background: 'rgba(56,232,200,0.12)', border: `1px solid ${C.you}`, color: C.you,
  boxShadow: '0 0 30px rgba(56,232,200,0.25)',
};
const pillOther: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`, color: C.dim,
};
const dot: React.CSSProperties = {
  width: 9, height: 9, borderRadius: '50%', background: C.you,
  boxShadow: `0 0 12px ${C.you}`, animation: 'cb-pulse 1.6s infinite',
};
const timer: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 8, fontFamily: mono, fontSize: 20,
};
const ring: React.CSSProperties = {
  width: 34, height: 34, borderRadius: '50%', display: 'block',
  WebkitMask: 'radial-gradient(farthest-side, transparent 60%, #000 62%)',
  mask: 'radial-gradient(farthest-side, transparent 60%, #000 62%)',
};
