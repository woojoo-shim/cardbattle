import { useEffect, useState } from 'react';
import type { CardInstance, GameEvent } from '@cardbattle/shared';
import { CARD_DEFS, requiresTarget } from '@cardbattle/shared';
import type { UiState, RoomError } from '../state/useRoom.js';
import { TopBar } from './TopBar.js';
import { RoundTable } from './RoundTable.js';
import { CardFan } from './CardFan.js';
import { TurnArrow } from './TurnArrow.js';
import { Log } from './Log.js';
import { RevealOverlay } from './RevealOverlay.js';
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
  onExit: () => void;
  borderCosmetic?: string;
}

export function Battle({ ui, myId, hand, events, error, send, onExit, borderCosmetic }: Props) {
  const [pending, setPending] = useState<CardInstance | null>(null);
  const activeId = ui.turnOrder[ui.currentTurnIndex];
  const isMyTurn = activeId === myId && ui.phase === 'playing';
  const myMana = ui.players.find((p) => p.id === myId)?.mana ?? 0;

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
        <VfxLayer events={events} players={ui.players} />
        <h1 style={{ ...endTitle, color: iWon ? C.you : C.enemy }}>
          {iWon ? '승리!' : `${winner?.name ?? '???'} 승리`}
        </h1>
        <p style={endSub}>{iWon ? '최후의 생존자가 되었습니다.' : '다음 기회에…'}</p>
        <button className="cb-enter" style={returnBtn} onClick={onExit}>
          로비로 돌아가기&nbsp;<span style={{ fontWeight: 900 }}>→</span>
        </button>
      </div>
    );
  }

  return (
    <div style={screen}>
      <VfxLayer events={events} players={ui.players} />
      <RevealOverlay events={events} myId={myId} ui={ui} />
      <div style={topRow}><TopBar ui={ui} myId={myId} /></div>
      <div style={tableRow}>
        <div style={fieldGrid} />
        <RoundTable ui={ui} myId={myId} selectable={isMyTurn && !!pending} onSelect={selectTarget} />
        {ui.phase === 'playing' && activeId && <TurnArrow activeId={activeId} isMyTurn={isMyTurn} turnDir={ui.turnDir} />}
        <span style={fieldHint}>◈ ABYSSAL TABLE ◈</span>
        <Log events={events} ui={ui} />
        {pending && <div style={targetHint}>🎯 대상을 선택하세요 (카드 다시 클릭 시 취소)</div>}
        {error && <div style={errToast}>{error.message}</div>}
      </div>
      <div style={handRow}>
        <div style={manaDock}>
          <span style={{ ...manaOrb, opacity: isMyTurn ? 1 : 0.6 }}>◈</span>
          <div style={manaText}>
            <span style={manaNum}>{myMana}</span>
            <span style={manaLabel}>MANA</span>
          </div>
        </div>
        <CardFan hand={hand} enabled={isMyTurn} pendingId={pending?.id ?? null} mana={myMana} onPlay={playCard} borderCosmetic={borderCosmetic} />
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
  display: 'grid', gridTemplateRows: '64px 1fr clamp(196px, 19vh, 256px)',
  background:
    'radial-gradient(120% 90% at 50% 8%, #141826 0%, #0e1018 38%, #07080d 100%), #07080d',
  color: C.text,
};
const topRow: React.CSSProperties = {};
const tableRow: React.CSSProperties = { position: 'relative', minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' };
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
// My mana readout, anchored bottom-left (mirrors 턴 종료 on the right). Sized in clamp units so it
// keeps proportion on iPad. Always visible; the orb dims a touch when it isn't my turn.
const manaDock: React.CSSProperties = {
  position: 'absolute', bottom: 28, left: 28, zIndex: 16,
  display: 'flex', alignItems: 'center', gap: 14,
  padding: 'clamp(12px, 1.4vw, 18px) clamp(18px, 2vw, 28px)', borderRadius: 16,
  background: 'linear-gradient(180deg, rgba(20,30,54,0.94), rgba(12,18,34,0.94))',
  border: '1.5px solid #3a5da0', boxShadow: '0 10px 28px rgba(30,70,150,0.42), inset 0 0 20px rgba(80,150,255,0.12)',
};
const manaOrb: React.CSSProperties = {
  fontSize: 'clamp(34px, 3.6vw, 52px)', color: '#6fb6ff',
  textShadow: '0 0 22px rgba(90,160,255,0.95), 0 0 8px rgba(150,200,255,0.9)', transition: 'opacity .3s ease',
};
const manaText: React.CSSProperties = { display: 'flex', flexDirection: 'column', lineHeight: 1 };
const manaNum: React.CSSProperties = { fontFamily: mono, fontSize: 'clamp(34px, 3.6vw, 52px)', fontWeight: 900, color: '#e2f0ff', textShadow: '0 0 12px rgba(120,180,255,0.5)' };
const manaLabel: React.CSSProperties = { fontFamily: mono, fontSize: 'clamp(11px, 1vw, 14px)', letterSpacing: 3, color: '#7fa8d8', marginTop: 4 };
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
const returnBtn: React.CSSProperties = {
  marginTop: 26, padding: '14px 28px', fontSize: 16, fontWeight: 800, letterSpacing: 0.5,
  color: '#fff', cursor: 'pointer', border: 'none', borderRadius: 12, fontFamily: sans,
  background: 'linear-gradient(100deg, #6d4bff, #5b3cff 60%, #2fb8a0)',
  boxShadow: '0 6px 18px rgba(123,92,255,0.4)',
};
