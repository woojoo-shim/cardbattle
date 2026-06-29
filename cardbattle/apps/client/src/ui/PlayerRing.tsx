import type { UiPlayer, UiState } from '../state/useRoom.js';

interface Props {
  ui: UiState;
  myId: string;
  selectable: boolean;
  onSelect: (id: string) => void;
}

/** Arrange players around an ellipse; highlight the active turn and elimination state. */
export function PlayerRing({ ui, myId, selectable, onSelect }: Props) {
  const activeId = ui.turnOrder[ui.currentTurnIndex];
  const n = ui.players.length;

  return (
    <div style={ring}>
      {ui.players.map((p, i) => {
        const angle = (i / Math.max(1, n)) * 2 * Math.PI - Math.PI / 2;
        const x = 50 + 42 * Math.cos(angle);
        const y = 50 + 38 * Math.sin(angle);
        const isActive = p.id === activeId;
        const isMe = p.id === myId;
        const canTarget = selectable && p.id !== myId && p.alive;
        return (
          <div
            key={p.id}
            onClick={() => canTarget && onSelect(p.id)}
            style={{
              ...avatar,
              left: `${x}%`, top: `${y}%`,
              borderColor: isActive ? '#3df2c0' : isMe ? '#7b5cff' : 'rgba(255,255,255,0.12)',
              boxShadow: isActive ? '0 0 28px rgba(61,242,192,0.6)' : 'none',
              opacity: p.alive ? 1 : 0.3,
              cursor: canTarget ? 'crosshair' : 'default',
              filter: p.alive ? 'none' : 'grayscale(1)',
              outline: canTarget ? '2px dashed #ff5c8a' : 'none',
            }}
          >
            <div style={pname}>{p.name}{isMe ? ' (나)' : ''}</div>
            <div style={hpRow}>
              <div style={hpBarBg}>
                <div style={{ ...hpBar, width: `${Math.max(0, (p.hp / p.maxHp) * 100)}%` }} />
              </div>
              <span style={hpText}>{p.hp}/{p.maxHp}</span>
            </div>
            <div style={meta}>
              🂠 {p.handCount}{p.defense > 0 ? `  🛡 ${p.defense}` : ''}{!p.connected ? '  ⚠' : ''}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const ring: React.CSSProperties = { position: 'relative', width: '100%', height: '100%' };
const avatar: React.CSSProperties = {
  position: 'absolute', transform: 'translate(-50%,-50%)', width: 140, padding: '8px 10px',
  background: 'rgba(16,16,28,0.85)', border: '2px solid', borderRadius: 12,
  color: '#e8e8f0', fontFamily: 'system-ui', transition: 'box-shadow .2s,opacity .2s',
};
const pname: React.CSSProperties = { fontWeight: 700, fontSize: 14, marginBottom: 4, textAlign: 'center' };
const hpRow: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 6 };
const hpBarBg: React.CSSProperties = { flex: 1, height: 8, background: '#2a2a3a', borderRadius: 4, overflow: 'hidden' };
const hpBar: React.CSSProperties = { height: '100%', background: 'linear-gradient(90deg,#ff5c8a,#3df2c0)', transition: 'width .3s' };
const hpText: React.CSSProperties = { fontSize: 11, color: '#9a9ab0', minWidth: 44, textAlign: 'right' };
const meta: React.CSSProperties = { fontSize: 12, color: '#9a9ab0', marginTop: 4, textAlign: 'center' };
