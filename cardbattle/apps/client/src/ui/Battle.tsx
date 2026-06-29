import { useEffect, useState } from 'react';
import type { CardInstance, GameEvent } from '@cardbattle/shared';
import { CARD_DEFS, requiresTarget } from '@cardbattle/shared';
import type { UiState, RoomError } from '../state/useRoom.js';
import { PlayerRing } from './PlayerRing.js';
import { Hud } from './Hud.js';
import { Hand } from './Hand.js';
import { Log } from './Log.js';
import { VfxLayer } from '../vfx/VfxLayer.js';

interface Props {
  ui: UiState;
  myId: string;
  hand: CardInstance[];
  events: GameEvent[];
  error: RoomError | null;
  send: (a: { type: 'play_card'; cardInstanceId: string; targetId?: string } | { type: 'end_turn' }) => void;
}

export function Battle({ ui, myId, hand, events, error, send }: Props) {
  const [pending, setPending] = useState<CardInstance | null>(null);
  const activeId = ui.turnOrder[ui.currentTurnIndex];
  const isMyTurn = activeId === myId && ui.phase === 'playing';

  // Clear a half-finished target selection whenever the turn passes away from me.
  useEffect(() => { if (!isMyTurn) setPending(null); }, [isMyTurn]);

  const playCard = (card: CardInstance) => {
    if (!isMyTurn) return;
    const def = CARD_DEFS[card.defId];
    if (!def) return;
    if (requiresTarget(def)) {
      setPending((cur) => (cur?.id === card.id ? null : card)); // toggle target mode
      return;
    }
    send({ type: 'play_card', cardInstanceId: card.id });
  };

  const selectTarget = (targetId: string) => {
    if (!pending) return;
    send({ type: 'play_card', cardInstanceId: pending.id, targetId });
    setPending(null);
  };

  if (ui.phase === 'ended') {
    const winner = ui.players.find((p) => p.id === ui.winnerId);
    const iWon = ui.winnerId === myId;
    return (
      <div style={endWrap}>
        <VfxLayer events={events} />
        <h1 style={{ ...endTitle, color: iWon ? '#3df2c0' : '#ff5c8a' }}>
          {iWon ? '승리!' : `${winner?.name ?? '???'} 승리`}
        </h1>
        <p style={endSub}>{iWon ? '최후의 생존자가 되었습니다.' : '다음 기회에…'}</p>
      </div>
    );
  }

  return (
    <div style={stage}>
      <VfxLayer events={events} />
      <Hud ui={ui} myId={myId} />
      <Log events={events} ui={ui} />
      <div style={ringArea}>
        <PlayerRing ui={ui} myId={myId} selectable={isMyTurn && !!pending} onSelect={selectTarget} />
      </div>
      {pending && (
        <div style={targetHint}>🎯 대상을 선택하세요 (카드 다시 클릭 시 취소)</div>
      )}
      {error && <div style={errToast}>{error.message}</div>}
      <Hand hand={hand} enabled={isMyTurn} pendingId={pending?.id ?? null} onPlay={playCard} />
      {isMyTurn && (
        <button style={endTurnBtn} onClick={() => { setPending(null); send({ type: 'end_turn' }); }}>
          턴 종료 ▶
        </button>
      )}
    </div>
  );
}

const stage: React.CSSProperties = { position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' };
const ringArea: React.CSSProperties = { position: 'absolute', inset: '80px 40px 200px 40px' };
const targetHint: React.CSSProperties = {
  position: 'absolute', top: 70, left: '50%', transform: 'translateX(-50%)',
  padding: '8px 18px', background: 'rgba(255,92,138,0.18)', border: '1px solid #ff5c8a',
  borderRadius: 999, color: '#ff9cba', fontFamily: 'system-ui', fontSize: 14, zIndex: 6,
};
const errToast: React.CSSProperties = {
  position: 'absolute', bottom: 190, left: '50%', transform: 'translateX(-50%)',
  padding: '8px 16px', background: 'rgba(255,92,138,0.2)', border: '1px solid #ff5c8a',
  borderRadius: 8, color: '#ff9cba', fontFamily: 'system-ui', fontSize: 13, zIndex: 7,
};
const endTurnBtn: React.CSSProperties = {
  position: 'absolute', bottom: 26, right: 32, padding: '12px 26px', fontSize: 16, fontWeight: 700,
  color: '#04231b', cursor: 'pointer', border: 'none', borderRadius: 10,
  background: 'linear-gradient(90deg,#1fae8a,#3df2c0)', boxShadow: '0 6px 18px rgba(61,242,192,0.4)', zIndex: 6,
};
const endWrap: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
  minHeight: '100vh', gap: 12, fontFamily: 'system-ui',
};
const endTitle: React.CSSProperties = { margin: 0, fontSize: 64, fontWeight: 900, letterSpacing: 4, textShadow: '0 0 50px currentColor' };
const endSub: React.CSSProperties = { margin: 0, color: '#9a9ab0', fontSize: 18 };
