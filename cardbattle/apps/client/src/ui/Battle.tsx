import { useEffect, useState } from 'react';
import type { CardInstance, GameEvent } from '@cardbattle/shared';
import { CARD_DEFS, requiresTarget } from '@cardbattle/shared';
import type { UiState, RoomError } from '../state/useRoom.js';
import { TopBar } from './TopBar.js';
import { EnemyLineup } from './EnemyLineup.js';
import { HeroPanel } from './HeroPanel.js';
import { CardFan } from './CardFan.js';
import { TurnArrow } from './TurnArrow.js';
import { Log } from './Log.js';
import { VfxLayer } from '../vfx/VfxLayer.js';
import { C, mono, sans } from './theme.js';
import './arena.css';

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
        <h1 style={{ ...endTitle, color: iWon ? C.you : C.enemy }}>
          {iWon ? '승리!' : `${winner?.name ?? '???'} 승리`}
        </h1>
        <p style={endSub}>{iWon ? '최후의 생존자가 되었습니다.' : '다음 기회에…'}</p>
      </div>
    );
  }

  return (
    <div style={screen}>
      <VfxLayer events={events} />
      <div style={topRow}><TopBar ui={ui} myId={myId} /></div>
      <div style={lineupRow}><EnemyLineup ui={ui} myId={myId} selectable={isMyTurn && !!pending} onSelect={selectTarget} /></div>
      <div style={fieldRow}>
        <div style={fieldGrid} />
        {ui.phase === 'playing' && activeId && <TurnArrow activeId={activeId} isMyTurn={isMyTurn} />}
        <span style={fieldHint}>◈ BATTLEFIELD ◈</span>
        <Log events={events} ui={ui} />
        {pending && <div style={targetHint}>🎯 대상을 선택하세요 (카드 다시 클릭 시 취소)</div>}
        {error && <div style={errToast}>{error.message}</div>}
      </div>
      <div style={heroRow}><HeroPanel ui={ui} myId={myId} /></div>
      <div style={handRow}>
        <CardFan hand={hand} enabled={isMyTurn} pendingId={pending?.id ?? null} onPlay={playCard} />
        {isMyTurn && (
          <button style={endTurnBtn} onClick={() => { setPending(null); send({ type: 'end_turn' }); }}>
            턴 종료 ▶
          </button>
        )}
      </div>
    </div>
  );
}

const screen: React.CSSProperties = {
  width: '100vw', height: '100vh', overflow: 'hidden', position: 'relative', fontFamily: sans,
  display: 'grid', gridTemplateRows: '64px 34% 1fr 116px 188px',
  background:
    'radial-gradient(120% 90% at 50% 8%, #141826 0%, #0e1018 38%, #07080d 100%), #07080d',
  color: C.text,
};
const topRow: React.CSSProperties = {};
const lineupRow: React.CSSProperties = { minHeight: 0 };
const fieldRow: React.CSSProperties = { position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const fieldGrid: React.CSSProperties = {
  position: 'absolute', inset: 0,
  backgroundImage:
    'linear-gradient(rgba(56,232,200,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(56,232,200,0.04) 1px, transparent 1px)',
  backgroundSize: '40px 40px',
  WebkitMaskImage: 'radial-gradient(60% 70% at 50% 50%, #000, transparent)',
  maskImage: 'radial-gradient(60% 70% at 50% 50%, #000, transparent)',
};
const fieldHint: React.CSSProperties = {
  position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)',
  fontFamily: mono, fontSize: 11, color: C.faint, letterSpacing: 3,
};
const heroRow: React.CSSProperties = { display: 'flex', alignItems: 'center' };
const handRow: React.CSSProperties = { position: 'relative', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' };
const targetHint: React.CSSProperties = {
  position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
  padding: '8px 18px', background: 'rgba(255,59,107,0.18)', border: `1px solid ${C.enemy}`,
  borderRadius: 999, color: '#ff9cba', fontSize: 14, zIndex: 16,
};
const errToast: React.CSSProperties = {
  position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
  padding: '8px 16px', background: 'rgba(255,59,107,0.2)', border: `1px solid ${C.enemy}`,
  borderRadius: 8, color: '#ff9cba', fontSize: 13, zIndex: 17,
};
const endTurnBtn: React.CSSProperties = {
  position: 'absolute', bottom: 30, right: 32, padding: '13px 24px', fontSize: 16, fontWeight: 800,
  color: '#04231b', cursor: 'pointer', border: 'none', borderRadius: 10, fontFamily: sans,
  background: 'linear-gradient(180deg,#5af0d3,#22c7a8)', boxShadow: '0 8px 20px rgba(56,232,200,0.35)',
  transition: 'transform .15s', zIndex: 16,
};
const endWrap: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
  minHeight: '100vh', gap: 12, fontFamily: sans,
  background: 'radial-gradient(120% 90% at 50% 30%, #141826 0%, #0e1018 40%, #07080d 100%), #07080d',
};
const endTitle: React.CSSProperties = { margin: 0, fontSize: 64, fontWeight: 900, letterSpacing: 4, textShadow: '0 0 50px currentColor' };
const endSub: React.CSSProperties = { margin: 0, color: C.dim, fontSize: 18 };
