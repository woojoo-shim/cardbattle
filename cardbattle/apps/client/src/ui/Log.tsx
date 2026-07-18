import type { GameEvent } from '@cardbattle/shared';
import { CARD_DEFS } from '@cardbattle/shared';
import type { UiState } from '../state/useRoom.js';
import { C, mono, sans } from './theme.js';
import { Icon, type IconName } from './art/Icon.js';

interface Props {
  events: GameEvent[];
  ui: UiState;
}

type Tone = 'turn' | 'card' | 'dmg' | 'heal' | 'shield' | 'reverse' | 'round' | 'out' | 'win' | 'reveal' | 'discard' | 'skip' | 'gamble' | 'steal';
type Line = { icon: IconName; text: string; tone: Tone };

function nameOf(ui: UiState, id: string): string {
  return ui.players.find((p) => p.id === id)?.name ?? id.slice(0, 4);
}

function line(ui: UiState, e: GameEvent): Line | null {
  switch (e.type) {
    case 'turn_started': return { icon: 'arrowRight', text: `${nameOf(ui, e.playerId)} 의 턴`, tone: 'turn' };
    case 'card_played': return { icon: 'card', text: `${nameOf(ui, e.playerId)} → ${CARD_DEFS[e.defId]?.name ?? e.defId}`, tone: 'card' };
    case 'damage_dealt': return { icon: 'burst', text: `${nameOf(ui, e.targetId)} ${e.amount} 피해 (HP ${e.targetHpAfter})`, tone: 'dmg' };
    case 'healed': return { icon: 'heart', text: `${nameOf(ui, e.targetId)} ${e.amount} 회복 (HP ${e.targetHpAfter})`, tone: 'heal' };
    case 'shielded': return { icon: 'shield', text: `${nameOf(ui, e.targetId)} 방어 +${e.amount} (총 ${e.defenseAfter})`, tone: 'shield' };
    case 'direction_reversed': return { icon: 'reverse', text: `진행 방향 반전! (${e.direction === -1 ? '역방향' : '정방향'})`, tone: 'reverse' };
    case 'card_revealed': return { icon: 'crystal', text: `${nameOf(ui, e.viewerId)} 가 ${nameOf(ui, e.targetId)} 의 손패를 엿봤다`, tone: 'reveal' };
    case 'card_discarded': return { icon: 'trash', text: `${nameOf(ui, e.targetId)} 의 ${CARD_DEFS[e.defId]?.name ?? e.defId} 파괴됨`, tone: 'discard' };
    case 'card_stolen': return { icon: 'hand', text: `${nameOf(ui, e.thiefId)} 가 ${nameOf(ui, e.targetId)} 의 손패 1장을 강탈`, tone: 'steal' };
    case 'turn_skipped': return { icon: 'zzz', text: `${nameOf(ui, e.playerId)} 의 턴 건너뜀`, tone: 'skip' };
    case 'gamble_resolved': return { icon: 'dice', text: e.doubled ? `${nameOf(ui, e.playerId)} 도박 성공! 2배 피해` : `${nameOf(ui, e.playerId)} 도박 실패… 빗나감`, tone: 'gamble' };
    case 'round_advanced': return { icon: 'arrowCW', text: `ROUND ${e.round} — 손패 보충`, tone: 'round' };
    case 'player_eliminated': return { icon: 'skull', text: `${nameOf(ui, e.playerId)} 탈락`, tone: 'out' };
    case 'game_over': return { icon: 'trophy', text: `${nameOf(ui, e.winnerId)} 승리!`, tone: 'win' };
    case 'hp_swapped': return { icon: 'arrowSwap', text: `${nameOf(ui, e.aId)} ↔ ${nameOf(ui, e.bId)} 체력 교환`, tone: 'reverse' };
    case 'mana_burned': return { icon: 'crystal', text: `${nameOf(ui, e.targetId)} 마나 -${e.amount} (남은 ${e.manaAfter})`, tone: 'reveal' };
    case 'status_applied': {
      const label = e.status === 'poison' ? `중독 ${e.amount}×${e.turns}턴`
        : e.status === 'regen' ? `재생 ${e.amount}×${e.turns}턴`
        : `반사 ${e.amount}% (${e.turns}턴)`;
      const icon = e.status === 'poison' ? 'poison' : e.status === 'regen' ? 'regen' : 'reflect';
      return { icon, text: `${nameOf(ui, e.targetId)} — ${label}`, tone: e.status === 'poison' ? 'discard' : e.status === 'regen' ? 'heal' : 'reverse' };
    }
    default: return null;
  }
}

const TONE: Record<Tone, string> = {
  turn: C.dim, card: C.text, dmg: '#ff8aa6', heal: '#7fe9d6',
  shield: '#7fb6ff', reverse: '#c9a0ff', round: C.rare, out: C.faint, win: C.rare,
  reveal: '#8be3ff', discard: '#9be85a', skip: '#5fd0ff', gamble: '#ffd84a', steal: '#c9a0ff',
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
          <div key={idx} className="cb-log-line" style={{ ...row, color, borderTop: i === 0 ? 'none' : `1px solid #1b1f2c` }}>
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
  background: 'linear-gradient(180deg, rgba(22,26,38,0.82), rgba(14,16,24,0.82))',
  border: `1px solid ${C.border}`, borderRadius: 12, padding: '10px 12px',
  boxShadow: '0 18px 40px rgba(0,0,0,0.5)', fontFamily: sans,
};
const head: React.CSSProperties = {
  fontFamily: mono, fontSize: 11, color: C.faint, letterSpacing: 2, margin: '0 0 8px',
};
const row: React.CSSProperties = {
  position: 'relative', display: 'flex', alignItems: 'center', fontSize: 12, padding: '3px 0 3px 8px',
  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
};
// A slim tone-colored tab on the row's left edge — lets you scan the record by event type at a glance.
const tick: React.CSSProperties = {
  position: 'absolute', left: 0, top: 4, bottom: 4, width: 2.5, borderRadius: 2, opacity: 0.7,
};
