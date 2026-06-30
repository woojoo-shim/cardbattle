import type { GameEvent } from '@cardbattle/shared';
import { CARD_DEFS } from '@cardbattle/shared';
import type { UiState } from '../state/useRoom.js';
import { C, mono, sans } from './theme.js';

interface Props {
  events: GameEvent[];
  ui: UiState;
}

type Line = { text: string; tone: 'turn' | 'card' | 'dmg' | 'heal' | 'shield' | 'reverse' | 'round' | 'out' | 'win' | 'reveal' | 'discard' | 'skip' | 'gamble' };

function nameOf(ui: UiState, id: string): string {
  return ui.players.find((p) => p.id === id)?.name ?? id.slice(0, 4);
}

function line(ui: UiState, e: GameEvent): Line | null {
  switch (e.type) {
    case 'turn_started': return { text: `▶ ${nameOf(ui, e.playerId)} 의 턴`, tone: 'turn' };
    case 'card_played': return { text: `🃏 ${nameOf(ui, e.playerId)} → ${CARD_DEFS[e.defId]?.name ?? e.defId}`, tone: 'card' };
    case 'damage_dealt': return { text: `💥 ${nameOf(ui, e.targetId)} ${e.amount} 피해 (HP ${e.targetHpAfter})`, tone: 'dmg' };
    case 'healed': return { text: `💚 ${nameOf(ui, e.targetId)} ${e.amount} 회복 (HP ${e.targetHpAfter})`, tone: 'heal' };
    case 'shielded': return { text: `🛡 ${nameOf(ui, e.targetId)} 방어 +${e.amount} (총 ${e.defenseAfter})`, tone: 'shield' };
    case 'direction_reversed': return { text: `🔄 진행 방향 반전! (${e.direction === -1 ? '역방향' : '정방향'})`, tone: 'reverse' };
    case 'card_revealed': return { text: `🔮 ${nameOf(ui, e.viewerId)} 가 ${nameOf(ui, e.targetId)} 의 손패를 엿봤다`, tone: 'reveal' };
    case 'card_discarded': return { text: `🗑 ${nameOf(ui, e.targetId)} 의 ${CARD_DEFS[e.defId]?.name ?? e.defId} 파괴됨`, tone: 'discard' };
    case 'turn_skipped': return { text: `💤 ${nameOf(ui, e.playerId)} 의 턴 건너뜀`, tone: 'skip' };
    case 'gamble_resolved': return { text: e.doubled ? `🎲 ${nameOf(ui, e.playerId)} 도박 성공! 2배 피해` : `🎲 ${nameOf(ui, e.playerId)} 도박 실패… 빗나감`, tone: 'gamble' };
    case 'round_advanced': return { text: `↻ ROUND ${e.round} — 손패 보충`, tone: 'round' };
    case 'player_eliminated': return { text: `☠ ${nameOf(ui, e.playerId)} 탈락`, tone: 'out' };
    case 'game_over': return { text: `🏆 ${nameOf(ui, e.winnerId)} 승리!`, tone: 'win' };
    default: return null;
  }
}

const TONE: Record<Line['tone'], string> = {
  turn: C.dim, card: C.text, dmg: '#ff8aa6', heal: '#7fe9d6',
  shield: '#7fb6ff', reverse: '#c9a0ff', round: C.rare, out: C.faint, win: C.rare,
  reveal: '#8be3ff', discard: '#9be85a', skip: '#5fd0ff', gamble: '#ffd84a',
};

/** De-emphasized combat record floating at the field's edge — recent lines only. */
export function Log({ events, ui }: Props) {
  const lines = events.map((e) => line(ui, e)).filter((l): l is Line => l !== null).slice(-8);
  if (lines.length === 0) return null;
  return (
    <div style={box}>
      <h4 style={head}>전투 기록</h4>
      {lines.map((l, i) => (
        <div key={i} style={{ ...row, color: TONE[l.tone], borderTop: i === 0 ? 'none' : `1px solid #1b1f2c` }}>
          {l.text}
        </div>
      ))}
    </div>
  );
}

const box: React.CSSProperties = {
  position: 'absolute', right: 24, top: 16, width: 230, zIndex: 15,
  background: 'linear-gradient(180deg, rgba(22,26,38,0.96), rgba(14,16,24,0.96))',
  border: `1px solid ${C.border}`, borderRadius: 12, padding: '12px 14px',
  boxShadow: '0 18px 40px rgba(0,0,0,0.5)', fontFamily: sans,
};
const head: React.CSSProperties = {
  fontFamily: mono, fontSize: 11, color: C.faint, letterSpacing: 2, margin: '0 0 8px',
};
const row: React.CSSProperties = {
  fontSize: 12, padding: '3px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
};
