import type { GameEvent } from '@cardbattle/shared';
import { CARD_DEFS } from '@cardbattle/shared';
import type { UiState } from '../state/useRoom.js';
import { C, mono, sans } from './theme.js';
import { Icon, type IconName } from './art/Icon.js';

interface Props {
  events: GameEvent[];
  ui: UiState;
}

type Tone = 'turn' | 'card' | 'dmg' | 'heal' | 'shield' | 'round' | 'out' | 'win' | 'skip' | 'summon' | 'attack' | 'buff' | 'die' | 'cry';
type Line = { icon: IconName; text: string; tone: Tone };

function nameOf(ui: UiState, id: string): string {
  return ui.players.find((p) => p.id === id)?.name ?? id.slice(0, 4);
}

/** A minion id → its card name (from any player's field), or a short fallback. */
function minionName(ui: UiState, minionId: string): string {
  for (const p of ui.players) {
    const m = p.field.find((f) => f.id === minionId);
    if (m) return CARD_DEFS[m.defId]?.name ?? m.defId;
  }
  return '하수인';
}

/** A minion id OR a hero playerId → a display name (attack/target can be either). */
function unitName(ui: UiState, id: string): string {
  const hero = ui.players.find((p) => p.id === id);
  if (hero) return hero.name;
  return minionName(ui, id);
}

function line(ui: UiState, e: GameEvent): Line | null {
  switch (e.type) {
    case 'turn_started': return { icon: 'arrowRight', text: `${nameOf(ui, e.playerId)} 의 턴`, tone: 'turn' };
    case 'card_played': return { icon: 'card', text: `${nameOf(ui, e.playerId)} → ${CARD_DEFS[e.defId]?.name ?? e.defId}`, tone: 'card' };
    case 'damage_dealt': return { icon: 'burst', text: `${unitName(ui, e.targetId)} ${e.amount} 피해 (HP ${e.targetHpAfter})`, tone: 'dmg' };
    case 'healed': return { icon: 'heart', text: `${unitName(ui, e.targetId)} ${e.amount} 회복 (HP ${e.targetHpAfter})`, tone: 'heal' };
    case 'shielded': return { icon: 'shield', text: `${nameOf(ui, e.targetId)} 방어 +${e.amount} (총 ${e.defenseAfter})`, tone: 'shield' };
    case 'turn_skipped': return { icon: 'zzz', text: `${nameOf(ui, e.playerId)} 의 턴 건너뜀`, tone: 'skip' };
    case 'round_advanced': return { icon: 'arrowCW', text: `ROUND ${e.round} — 손패 보충`, tone: 'round' };
    case 'minion_summoned': return { icon: 'card', text: `${nameOf(ui, e.playerId)} 소환 — ${CARD_DEFS[e.defId]?.name ?? e.defId}`, tone: 'summon' };
    case 'minion_attacked': return { icon: 'burst', text: `${minionName(ui, e.attackerId)} → ${unitName(ui, e.targetId)} 공격`, tone: 'attack' };
    case 'minion_damaged': return { icon: 'burst', text: `${minionName(ui, e.minionId)} ${e.amount} 피해 (HP ${e.healthAfter})`, tone: 'dmg' };
    case 'minion_buffed': return { icon: 'heart', text: `${minionName(ui, e.minionId)} 강화 → ${e.attack}/${e.health}`, tone: 'buff' };
    case 'minion_died': return { icon: 'skull', text: `${minionName(ui, e.minionId)} 파괴됨`, tone: 'die' };
    case 'battlecry_triggered': return { icon: 'burst', text: `${nameOf(ui, e.playerId)} — 강림!`, tone: 'cry' };
    case 'deathrattle_triggered': return { icon: 'skull', text: `${nameOf(ui, e.playerId)} — 유언!`, tone: 'die' };
    case 'player_eliminated': return { icon: 'skull', text: `${nameOf(ui, e.playerId)} 탈락`, tone: 'out' };
    case 'game_over': return { icon: 'trophy', text: `${nameOf(ui, e.winnerId)} 승리!`, tone: 'win' };
    default: return null;
  }
}

// Every tone pulled into the four printed-pigment families (ochre-red / sage / gold-leaf /
// faded-teal) so the combat record reads as the same candlelit palette, not neon confetti.
const TONE: Record<Tone, string> = {
  turn: C.dim, card: C.text, dmg: '#e8b4a6', heal: '#cdd3a0',
  shield: '#b9cdc4', round: C.rare, out: C.faint, win: C.rare,
  skip: '#a9c4bf', summon: '#c3b0d0', attack: '#e8b4a6', buff: '#cdd3a0',
  die: '#9aa863', cry: '#e8cf96',
};

/** De-emphasized combat record floating at the field's edge — recent lines only. */
export function Log({ events, ui }: Props) {
  // Keep each surviving line's source index as its key so only a genuinely NEW line
  // remounts and plays the slide-in — older lines just shift up without re-animating.
  const lines = events
    .map((e, idx) => ({ l: line(ui, e), idx }))
    .filter((x): x is { l: Line; idx: number } => x.l !== null)
    .slice(-6);
  if (lines.length === 0) return null;
  return (
    <div style={box}>
      <h4 style={head}>전투 기록</h4>
      {lines.map(({ l, idx }, i) => {
        const color = TONE[l.tone];
        return (
          <div key={idx} className="cb-log-line" style={{ ...row, color, borderTop: i === 0 ? 'none' : `1px solid #2b2114` }}>
            <span style={{ ...tick, background: color }} />
            <Icon name={l.icon} size={13} style={{ marginRight: 5 }} />{l.text}
          </div>
        );
      })}
    </div>
  );
}

// Anchored bottom-left, clear of the seat ring's top arc. pointer-events:none so it NEVER
// intercepts taps meant for a seat behind it (iPad landscape packs seats tighter). Slightly
// translucent + width clamps to stay unobtrusive on narrower iPad aspect ratios.
const box: React.CSSProperties = {
  position: 'absolute', left: 16, bottom: 12, width: 'clamp(180px, 22vw, 230px)', zIndex: 3,
  pointerEvents: 'none',
  background: 'linear-gradient(180deg, rgba(30,38,58,0.85), rgba(16,20,32,0.85))',
  border: `1px solid ${C.border}`, borderRadius: 12, padding: '10px 12px',
  boxShadow: '0 18px 40px rgba(0,0,0,0.5)', fontFamily: sans,
};
const head: React.CSSProperties = {
  fontFamily: mono, fontSize: 11, color: C.faint, letterSpacing: 2, margin: '0 0 8px',
};
const row: React.CSSProperties = {
  position: 'relative', display: 'flex', alignItems: 'center', fontSize: 13, padding: '3px 0 3px 8px',
  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
};
// A slim tone-colored tab on the row's left edge — lets you scan the record by event type at a glance.
const tick: React.CSSProperties = {
  position: 'absolute', left: 0, top: 4, bottom: 4, width: 2.5, borderRadius: 2, opacity: 0.7,
};
