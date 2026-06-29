import type { GameEvent } from '@cardbattle/shared';
import { CARD_DEFS } from '@cardbattle/shared';
import type { UiState } from '../state/useRoom.js';

interface Props {
  events: GameEvent[];
  ui: UiState;
}

function nameOf(ui: UiState, id: string): string {
  return ui.players.find((p) => p.id === id)?.name ?? id.slice(0, 4);
}

function line(ui: UiState, e: GameEvent): string | null {
  switch (e.type) {
    case 'turn_started': return `▶ ${nameOf(ui, e.playerId)} 의 턴`;
    case 'card_played': return `🃏 ${nameOf(ui, e.playerId)} → ${CARD_DEFS[e.defId]?.name ?? e.defId}`;
    case 'damage_dealt':
      return `💥 ${nameOf(ui, e.targetId)} 가 ${e.amount} 피해 (HP ${e.targetHpAfter})`;
    case 'healed':
      return `💚 ${nameOf(ui, e.targetId)} 가 ${e.amount} 회복 (HP ${e.targetHpAfter})`;
    case 'player_eliminated': return `☠ ${nameOf(ui, e.playerId)} 탈락`;
    case 'game_over': return `🏆 ${nameOf(ui, e.winnerId)} 승리!`;
    default: return null;
  }
}

export function Log({ events, ui }: Props) {
  const lines = events.map((e) => line(ui, e)).filter((l): l is string => l !== null);
  const recent = lines.slice(-12);
  return (
    <div style={box}>
      {recent.map((l, i) => (
        <div key={i} style={{ ...row, opacity: 0.5 + 0.5 * ((i + 1) / recent.length) }}>{l}</div>
      ))}
    </div>
  );
}

const box: React.CSSProperties = {
  position: 'absolute', top: 16, right: 16, width: 240, maxHeight: '40vh', overflow: 'hidden',
  display: 'flex', flexDirection: 'column', gap: 3, padding: 12,
  background: 'rgba(16,16,28,0.7)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10,
  color: '#cfcfe0', fontFamily: 'system-ui', fontSize: 12, zIndex: 5,
};
const row: React.CSSProperties = { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' };
