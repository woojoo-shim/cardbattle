import type { UiState } from '../state/useRoom.js';
import { C, mono, sans } from './theme.js';
import { CreatureArt } from './art/CreatureArt.js';

interface Props {
  ui: UiState;
  myId: string;
  selectable: boolean;
  onSelect: (id: string) => void;
}

/** Opponents arrayed as a horizontal portrait line — they look down on you.
 * Active turn = forward + spotlight; targetable = crosshair; dead = desaturated + ☠. */
export function EnemyLineup({ ui, myId, selectable, onSelect }: Props) {
  const activeId = ui.turnOrder[ui.currentTurnIndex];
  const enemies = ui.players.filter((p) => p.id !== myId);
  const twoRows = enemies.length > 5;

  return (
    <div style={{ ...wrap, flexWrap: twoRows ? 'wrap' : 'nowrap' }}>
      {enemies.map((p) => {
        const isActive = p.id === activeId;
        const canTarget = selectable && p.alive;
        const hpPct = Math.max(0, (p.hp / p.maxHp) * 100);
        return (
          <div
            key={p.id}
            data-pid={p.id}
            onClick={() => canTarget && onSelect(p.id)}
            style={{
              ...enemy,
              transform: isActive ? 'translateY(-10px)' : 'none',
              filter: p.alive ? 'none' : 'grayscale(1)',
              opacity: p.alive ? 1 : 0.4,
              cursor: canTarget ? 'crosshair' : 'default',
            }}
          >
            <div
              style={{
                ...portrait,
                transform: p.alive ? 'none' : 'rotate(-3deg)',
                borderColor: isActive || canTarget ? C.enemy : C.border,
                boxShadow: isActive
                  ? `0 0 0 1px ${C.enemy}, 0 18px 40px rgba(255,59,107,0.35)`
                  : canTarget
                  ? `0 0 0 1px ${C.enemy}, 0 0 26px rgba(255,59,107,0.45)`
                  : '0 10px 24px rgba(0,0,0,0.5)',
              }}
            >
              {p.defense > 0 && <span style={{ ...badge, ...badgeDef }}>🛡{p.defense}</span>}
              {!p.connected && p.alive && <span style={{ ...badge, ...badgeWarn }}>⚠</span>}
              <CreatureArt seat={p.seat} size={64} />
              {canTarget && <span style={crosshair} />}
              {!p.alive && <span style={skull}>☠</span>}
              {isActive && p.alive && <span style={spot} />}
            </div>
            <div style={hpWrap}>
              <div style={hpBar}>
                <i style={{ ...hpFill, width: `${hpPct}%` }} />
              </div>
              <div style={hpRow}>
                <span style={ename}>
                  {p.name}
                  {isActive && p.alive ? ' · 턴' : ''}
                  {canTarget ? ' ◎' : ''}
                </span>
                <span style={val}>{p.alive ? `${p.hp}/${p.maxHp}` : 'DEAD'}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

const wrap: React.CSSProperties = {
  height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
  gap: 22, padding: '8px 24px', fontFamily: sans,
};
const enemy: React.CSSProperties = {
  position: 'relative', width: 108, display: 'flex', flexDirection: 'column', alignItems: 'center',
  gap: 8, transition: 'transform .25s',
};
const portrait: React.CSSProperties = {
  width: 96, height: 104, borderRadius: 14, position: 'relative', overflow: 'hidden',
  background: `linear-gradient(160deg, ${C.panelHi}, ${C.panel})`, border: `1px solid ${C.border}`,
  display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'box-shadow .2s',
};
const badge: React.CSSProperties = {
  position: 'absolute', top: 6, width: 26, height: 22, borderRadius: 7, display: 'flex',
  alignItems: 'center', justifyContent: 'center', fontSize: 11, fontFamily: mono, fontWeight: 700,
  border: `1px solid ${C.border}`, background: 'rgba(10,12,20,0.85)',
};
const badgeDef: React.CSSProperties = { left: 6, color: '#7fb6ff' };
const badgeWarn: React.CSSProperties = { right: 6, color: C.rare };
const crosshair: React.CSSProperties = {
  position: 'absolute', inset: 0, border: `1px dashed ${C.enemy}`, borderRadius: 14,
  animation: 'cb-spin 6s linear infinite',
};
const skull: React.CSSProperties = {
  position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34,
};
const spot: React.CSSProperties = {
  position: 'absolute', left: '50%', bottom: -26, transform: 'translateX(-50%)',
  width: 130, height: 46, borderRadius: '50%',
  background: 'radial-gradient(ellipse, rgba(255,59,107,0.35), transparent 70%)',
};
const hpWrap: React.CSSProperties = { width: 96 };
const hpBar: React.CSSProperties = {
  height: 9, borderRadius: 6, background: '#0c0f18', border: `1px solid ${C.border}`, overflow: 'hidden',
};
const hpFill: React.CSSProperties = {
  display: 'block', height: '100%', borderRadius: 6,
  background: `linear-gradient(90deg, #ff6b8f, ${C.enemy})`, transition: 'width .3s',
};
const hpRow: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 3 };
const ename: React.CSSProperties = {
  fontSize: 11, color: C.dim, fontWeight: 600, maxWidth: 60, overflow: 'hidden',
  textOverflow: 'ellipsis', whiteSpace: 'nowrap',
};
const val: React.CSSProperties = { fontFamily: mono, fontSize: 11, color: C.dim };
