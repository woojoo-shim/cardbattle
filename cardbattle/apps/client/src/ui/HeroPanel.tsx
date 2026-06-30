import type { UiState } from '../state/useRoom.js';
import { C, mono, sans } from './theme.js';
import { HeroArt } from './art/CreatureArt.js';

interface Props {
  ui: UiState;
  myId: string;
}

const SEGMENTS = 10;

/** The player's own status, rendered large as the screen's anchor: segmented HP bar,
 * big numeric HP, defense + hand-count badges. */
export function HeroPanel({ ui, myId }: Props) {
  const me = ui.players.find((p) => p.id === myId);
  if (!me) return null;
  const ratio = me.maxHp > 0 ? me.hp / me.maxHp : 0;
  const lit = Math.round(ratio * SEGMENTS);

  return (
    <div style={wrap}>
      <div style={panel} data-pid={me.id}>
        <div style={ava}><HeroArt size={46} /></div>
        <div style={info}>
          <div style={nameRow}>
            <b style={{ fontSize: 18 }}>{me.name}</b>
            <span style={youTag}>YOU</span>
            {!me.alive && <span style={deadTag}>탈락</span>}
          </div>
          <div style={hpBig}>
            {Array.from({ length: SEGMENTS }, (_, i) => (
              <span key={i} style={{ ...seg, ...(i < lit ? segOn : null) }} />
            ))}
          </div>
        </div>
        <div style={stat}>
          <div style={num}>
            {Math.max(0, me.hp)}
            <span style={{ fontSize: 16, color: C.dim }}>/{me.maxHp}</span>
          </div>
          <div style={badges}>
            <span style={{ ...sbadge, ...defBadge }}>🛡 {me.defense}</span>
            <span style={{ ...sbadge, ...handBadge }}>🂠 {me.handCount}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const wrap: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: sans };
const panel: React.CSSProperties = {
  width: 'min(760px, 92%)', height: 88, borderRadius: 16, display: 'flex', alignItems: 'center',
  gap: 18, padding: '0 22px', position: 'relative',
  background: `linear-gradient(180deg, ${C.panelHi}, ${C.panel})`,
  border: `1px solid ${C.border}`, borderTopColor: C.borderHi,
  boxShadow: '0 -2px 0 rgba(255,255,255,0.04) inset, 0 22px 50px rgba(0,0,0,0.6)',
};
const ava: React.CSSProperties = {
  width: 60, height: 60, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: 30, background: '#0e1220', border: `1px solid ${C.you}`, boxShadow: '0 0 22px rgba(56,232,200,0.3)',
};
const info: React.CSSProperties = { flex: 1 };
const nameRow: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 };
const youTag: React.CSSProperties = {
  fontFamily: mono, fontSize: 11, color: C.you, border: `1px solid ${C.you}`, borderRadius: 6, padding: '1px 7px',
};
const deadTag: React.CSSProperties = {
  fontFamily: mono, fontSize: 11, color: C.enemy, border: `1px solid ${C.enemy}`, borderRadius: 6, padding: '1px 7px',
};
const hpBig: React.CSSProperties = {
  height: 20, borderRadius: 8, background: '#0a0d15', border: `1px solid ${C.border}`,
  display: 'flex', gap: 2, padding: 2,
};
const seg: React.CSSProperties = { flex: 1, borderRadius: 3, background: '#1b2030', transition: 'background .3s' };
const segOn: React.CSSProperties = { background: `linear-gradient(90deg, #5af0d3, ${C.you})` };
const stat: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, minWidth: 120,
};
const num: React.CSSProperties = { fontFamily: mono, fontSize: 30, fontWeight: 700, lineHeight: 1 };
const badges: React.CSSProperties = { display: 'flex', gap: 6 };
const sbadge: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 4, fontFamily: mono, fontSize: 12, padding: '3px 8px',
  borderRadius: 999, border: `1px solid ${C.border}`, background: 'rgba(10,12,20,0.7)',
};
const defBadge: React.CSSProperties = { color: '#7fb6ff', borderColor: '#243a5a' };
const handBadge: React.CSSProperties = { color: C.dim };
