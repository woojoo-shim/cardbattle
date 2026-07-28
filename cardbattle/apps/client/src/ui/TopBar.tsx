import { useEffect, useState } from 'react';
import type { UiState } from '../state/useRoom.js';
import { Icon } from './art/Icon.js';
import { MuteButton } from './MuteButton.js';
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
  // Burning fuse: only during MY turn's final seconds. The unburnt rope shrinks with the
  // remaining time (5s window), the flame rides its shrinking tip toward the bomb.
  const showFuse = danger && isMyTurn && remainMs > 0;
  const fuse = Math.max(0, Math.min(1, remainMs / 5000));

  return (
    <>
    {showFuse && (
      <div style={fuseWrap} aria-hidden>
        <div style={fuseTaunt} className="cb-fuse-taunt">시간은 기다리지 않아!</div>
        <div style={fuseTrack}>
          <span style={fuseBomb}>💣</span>
          <div style={fuseRail}>
            <div style={{ ...fuseRope, width: `${fuse * 100}%` }} />
            <div style={{ ...fuseCharred, left: `${fuse * 100}%` }} />
            <div style={{ ...fuseFlame, left: `${fuse * 100}%` }} className="cb-fuse-flame">
              <span style={fuseSpark} className="cb-fuse-spark" />
            </div>
          </div>
        </div>
      </div>
    )}
    <div style={{ ...bar, background: isMyTurn ? ribbonLit : ribbonIdle }}>
      <div style={round}>
        <Icon name="skull" size={13} />&nbsp;ROUND <b style={{ color: C.text }}>{ui.roundCount}</b>
        <span title={ui.turnDir === -1 ? '역방향 진행' : '정방향 진행'}
          style={{ ...dirTag, color: ui.turnDir === -1 ? C.enemy : C.dim }}>
          <Icon name={ui.turnDir === -1 ? 'arrowCCW' : 'arrowCW'} size={15} />
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
        <MuteButton />
        <span
          style={{
            ...ring,
            background: `conic-gradient(${ringColor} ${pct}%, #3a2e1c 0)`,
            animation: danger ? 'cb-pulse 1s infinite' : undefined,
          }}
        />
        <span style={{ color: danger ? C.enemy : C.text, minWidth: 26, textAlign: 'right' }}>{remain}</span>
      </div>
    </div>
    </>
  );
}

// --- Burning fuse (final 5s of your turn) ---
const fuseWrap: React.CSSProperties = {
  position: 'fixed', top: 66, left: '50%', transform: 'translateX(-50%)', zIndex: 40,
  width: 'min(560px, 76vw)', display: 'flex', flexDirection: 'column', alignItems: 'center',
  gap: 8, pointerEvents: 'none',
};
const fuseTaunt: React.CSSProperties = {
  fontFamily: sans, fontWeight: 900, fontSize: 22, letterSpacing: '-0.02em',
  color: '#ffd8a0',
  textShadow: '0 0 12px rgba(240,120,40,0.9), 0 2px 4px rgba(0,0,0,0.8)',
  whiteSpace: 'nowrap',
};
const fuseTrack: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 6, width: '100%',
};
const fuseBomb: React.CSSProperties = { fontSize: 22, flex: '0 0 auto', filter: 'drop-shadow(0 0 6px rgba(0,0,0,0.7))' };
const fuseRail: React.CSSProperties = {
  position: 'relative', flex: 1, height: 12, borderRadius: 6,
};
const fuseRope: React.CSSProperties = {
  position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', height: 8, borderRadius: 4,
  // Braided hemp rope: warm strand base + a diagonal twist highlight.
  background: 'repeating-linear-gradient(115deg, #9c6b3a 0 5px, #c89257 5px 8px, #7a5028 8px 12px)',
  boxShadow: 'inset 0 -1px 2px rgba(0,0,0,0.4)',
};
const fuseCharred: React.CSSProperties = {
  position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', height: 5, borderRadius: 3,
  // The already-burnt stub trailing the flame toward the bomb-side.
  background: 'repeating-linear-gradient(115deg, #241812 0 4px, #3a2418 4px 7px)',
  // width is implicit: it spans from `left` to the right edge via left offset only, so give it a right anchor
};
const fuseFlame: React.CSSProperties = {
  position: 'absolute', top: '50%', width: 20, height: 26, marginLeft: -10,
  transform: 'translateY(-58%)',
  background: 'radial-gradient(50% 60% at 50% 70%, #fff2c0 0%, #ffcf5a 28%, #ff7a1e 60%, rgba(214,60,20,0.2) 85%, transparent 100%)',
  borderRadius: '50% 50% 50% 50% / 62% 62% 40% 40%',
  filter: 'drop-shadow(0 0 8px rgba(255,140,40,0.95))',
};
const fuseSpark: React.CSSProperties = {
  position: 'absolute', left: '50%', top: 2, width: 6, height: 6, marginLeft: -3, borderRadius: '50%',
  background: 'radial-gradient(circle, #fff6d8, #ffb03a 70%, transparent)',
};

const bar: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 24, padding: '0 24px',
  borderBottom: `1px solid ${C.border}`, fontFamily: sans, position: 'relative', zIndex: 20,
};
const ribbonLit = `linear-gradient(180deg, rgba(143,157,79,0.12), transparent 80%)`;
const ribbonIdle = `linear-gradient(180deg, rgba(255,255,255,0.02), transparent 80%)`;
const round: React.CSSProperties = { fontFamily: mono, fontSize: 13, color: C.dim, letterSpacing: 1 };
const dirTag: React.CSSProperties = { fontSize: 16, fontWeight: 800, margin: '0 2px 0 6px' };
const center: React.CSSProperties = { flex: 1, display: 'flex', justifyContent: 'center' };
const pill: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 10, padding: '8px 22px', borderRadius: 4,
  fontWeight: 700, fontSize: 20, letterSpacing: 1,
};
const pillMine: React.CSSProperties = {
  background: 'rgba(143,157,79,0.12)', border: `1px solid ${C.you}`, color: C.you,
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
