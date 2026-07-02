import { useEffect, useState } from 'react';
import type { CardInstance, GameEvent } from '@cardbattle/shared';
import { CARD_DEFS, requiresTarget, resolveMode } from '@cardbattle/shared';
import type { UiState, RoomError, LiveEmote, Reward } from '../state/useRoom.js';
import { TopBar } from './TopBar.js';
import { RoundTable } from './RoundTable.js';
import { CardFan } from './CardFan.js';
import { TurnArrow } from './TurnArrow.js';
import { Log } from './Log.js';
import { RevealOverlay } from './RevealOverlay.js';
import { EmoteBar } from './EmoteBar.js';
import { EmoteLayer } from './EmoteLayer.js';
import { ManaBar } from './ManaBar.js';
import { VfxLayer } from '../vfx/VfxLayer.js';
import { Icon } from './art/Icon.js';
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
  emotes: LiveEmote[];
  sendEmote: (id: string) => void;
  reward?: Reward | null;
}

export function Battle({ ui, myId, hand, events, error, send, onExit, borderCosmetic, emotes, sendEmote, reward }: Props) {
  const [pending, setPending] = useState<CardInstance | null>(null);
  const activeId = ui.turnOrder[ui.currentTurnIndex];
  const isMyTurn = activeId === myId && ui.phase === 'playing';
  const myMana = ui.players.find((p) => p.id === myId)?.mana ?? 0;
  const manaMax = resolveMode(ui.mode).rules.manaMax;

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
        {reward && !reward.guest && (
          <div style={rewardPill}>
            <Icon name="coin" size={18} />
            <span style={rewardEarned}>+{reward.earned}</span>
            <span style={rewardLabel}>골드</span>
            {reward.balance != null && (
              <span style={rewardBalance}>보유 {reward.balance}</span>
            )}
          </div>
        )}
        {reward && reward.guest && (
          <p style={rewardGuest}>게스트는 골드를 얻지 못합니다. 로그인하면 골드가 적립됩니다.</p>
        )}
        <button className="cb-enter" style={returnBtn} onClick={onExit}>
          로비로 돌아가기&nbsp;<Icon name="arrowRight" size={16} />
        </button>
      </div>
    );
  }

  return (
    <div style={screen}>
      <ChamberDeco />
      <VfxLayer events={events} players={ui.players} />
      <EmoteLayer emotes={emotes} />
      <RevealOverlay events={events} myId={myId} ui={ui} />
      <div style={topRow}><TopBar ui={ui} myId={myId} /></div>
      <div style={tableRow}>
        <div style={fieldGrid} />
        <RoundTable ui={ui} myId={myId} selectable={isMyTurn && !!pending} onSelect={selectTarget} />
        {ui.phase === 'playing' && activeId && <TurnArrow activeId={activeId} isMyTurn={isMyTurn} turnDir={ui.turnDir} />}
        <span style={fieldHint}>◈ BACK-ROOM TABLE ◈</span>
        <Log events={events} ui={ui} />
        {pending && <div style={targetHint}><Icon name="target" size={15} />&nbsp;대상을 선택하세요 (카드 다시 클릭 시 취소)</div>}
        {error && <div style={errToast}>{error.message}</div>}
      </div>
      <div style={handRow}>
        <div style={manaDock}>
          <ManaBar mana={myMana} max={manaMax} lit={isMyTurn} />
        </div>
        <CardFan hand={hand} enabled={isMyTurn} pendingId={pending?.id ?? null} mana={myMana} onPlay={playCard} borderCosmetic={borderCosmetic} />
        <EmoteBar onSend={sendEmote} />
        {isMyTurn && (
          <button style={endTurnBtn} onClick={() => { setPending(null); send({ type: 'end_turn' }); }}>
            턴 종료&nbsp;<Icon name="arrowRight" size={15} />
          </button>
        )}
      </div>
    </div>
  );
}

// A cluttered underground back room where nobody's supposed to be gambling — oxblood-stained
// walls swallowed by black, a single dirty bulb pooling jaundiced light on the worn table, and
// pink grime sprayed across the walls (see ChamberDeco). Corners drown so the room feels buried.
const screen: React.CSSProperties = {
  width: '100vw', height: '100vh', overflow: 'hidden', position: 'relative', fontFamily: sans,
  display: 'grid', gridTemplateRows: '64px 1fr clamp(196px, 19vh, 256px)',
  background:
    'radial-gradient(54% 38% at 50% 43%, rgba(226,164,72,0.17), transparent 66%),' +   // dirty bulb pooling on the table
    'radial-gradient(66% 44% at 50% 26%, rgba(126,38,62,0.16), transparent 72%),' +     // oxblood haze bleeding down the back wall
    'radial-gradient(44% 24% at 50% 74%, rgba(150,92,58,0.08), transparent 74%),' +     // grimy light on the wet floor
    'linear-gradient(180deg, transparent 48%, rgba(120,52,66,0.05) 53%, transparent 60%),' + // grubby seam where wall meets floor
    'linear-gradient(180deg, #170d10 0%, #120a0d 46%, #0d070a 55%, #060305 100%),' +    // oxblood wall → wet black floor
    '#060305',
  boxShadow: 'inset 0 0 270px 96px rgba(0,0,0,0.96)',
  color: C.text,
};
// The back room, actually drawn: junked audio gear stacked against the side walls (a mixer rack
// and a two-woofer speaker cabinet on the left; an amp with a dead green screen, pipes and a valve
// wheel on the right), a couple of clamp spotlights hung off the ceiling, frayed cables drooping
// across the top, and pink grime sprayed over all of it. Silhouette tones so it stays behind play.
function ChamberDeco() {
  return (
    <svg style={chamberDeco} viewBox="0 0 192 108" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <defs>
        <filter id="cb-splat" x="-25%" y="-25%" width="150%" height="150%">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="7" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="7" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <radialGradient id="cb-cone" cx="50%" cy="44%" r="56%">
          <stop offset="0" stopColor="#2c1e1d" />
          <stop offset="0.55" stopColor="#0e0809" />
          <stop offset="1" stopColor="#060304" />
        </radialGradient>
        {/* Soft cast shadow so a cabinet reads as bolted to the wall and standing a little proud
            of it — depth by relief, not by isometric side faces (which look like floor furniture
            on this head-on view). */}
        <filter id="cb-relief" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2.2" stdDeviation="1.8" floodColor="#000" floodOpacity="0.7" />
        </filter>
      </defs>

      {/* ===== LEFT WALL — mixer rack, tweeter box, big speaker, stacked papers =====
           Each cabinet casts a soft shadow (cb-relief) so it stands a little proud of the wall,
           and carries a thin lit top edge — depth by relief, read straight-on, not isometric. */}
      <g stroke="#2a1e1d" strokeWidth="0.4" filter="url(#cb-relief)">
        {/* tweeter box perched on top */}
        <rect x="20" y="29" width="11" height="11" rx="0.8" fill="#150f10" />
        <rect x="20.4" y="29.3" width="10.2" height="0.9" rx="0.4" fill="#2c211f" stroke="none" />
        <circle cx="25.5" cy="34.5" r="3.1" fill="url(#cb-cone)" />
        {/* mixer / rack unit */}
        <rect x="0.5" y="40" width="30" height="26" rx="1" fill="#160f10" />
        <rect x="1" y="40.4" width="29" height="1" rx="0.5" fill="#2c211f" stroke="none" />
        <rect x="3" y="42" width="25" height="5" rx="0.5" fill="#0c0708" stroke="none" />
        <rect x="3" y="42" width="25" height="5" rx="0.5" fill="#0c0708" stroke="none" />
        {/* fader bank */}
        <g stroke="none">
          <rect x="4" y="49.5" width="24" height="5" fill="#0c0708" />
          {[5, 8, 11, 14, 17, 20, 23, 26].map((x) => (
            <g key={x}><rect x={x - 0.4} y="50" width="0.8" height="4" fill="#241d1c" /><rect x={x - 0.7} y={50.4 + (x % 3) * 0.9} width="1.4" height="1" rx="0.4" fill="#4a3b39" /></g>
          ))}
        </g>
        {/* knob + LED row */}
        <g stroke="none">
          {[5, 9, 13, 17, 21, 25].map((x) => (<circle key={x} cx={x} cy="59.5" r="1.5" fill="#241d1c" stroke="#0a0506" strokeWidth="0.25" />))}
          {[5, 9, 13, 17, 21, 25].map((x, i) => (<circle key={`l${x}`} cx={x} cy="63.4" r="0.5" fill={['#4d6a52', '#7a5a2e', '#4d6a52', '#3a4a6a', '#7a5a2e', '#4d6a52'][i]} />))}
        </g>
        {/* big speaker cabinet, sunk off the bottom */}
        <rect x="-1" y="66" width="27" height="44" rx="1" fill="#130d0e" />
        <rect x="-0.5" y="66.4" width="26" height="1" rx="0.5" fill="#2a1f1d" stroke="none" />
        <circle cx="8" cy="80.5" r="6.3" fill="url(#cb-cone)" stroke="#2a1e1d" strokeWidth="0.5" />
        <circle cx="8" cy="80.5" r="2.1" fill="#0a0607" />
        <circle cx="8" cy="96.5" r="6.3" fill="url(#cb-cone)" stroke="#2a1e1d" strokeWidth="0.5" />
        <circle cx="8" cy="96.5" r="2.1" fill="#0a0607" />
        {/* papers/junk stacked against the cabinet */}
        <g fill="#181212" stroke="#2c211f" strokeWidth="0.3">
          <rect x="18" y="88" width="15" height="2.6" transform="rotate(-3 25 89)" />
          <rect x="18" y="91.4" width="15" height="2.6" transform="rotate(2 25 92)" />
          <rect x="18" y="94.8" width="15" height="2.6" transform="rotate(-2 25 96)" />
        </g>
      </g>

      {/* ===== RIGHT WALL — amp with dead screen, vents, pipes + valve =====
           Same relief treatment as the left wall: a soft cast shadow lifts it off the wall,
           a thin lit top edge catches the bulb. */}
      <g stroke="#2a1e1d" strokeWidth="0.4" filter="url(#cb-relief)">
        {/* amp / machine unit */}
        <rect x="160" y="42" width="31" height="25" rx="1" fill="#160f10" />
        <rect x="160.5" y="42.4" width="30" height="1" rx="0.5" fill="#2c211f" stroke="none" />
        {/* dead green screen */}
        <rect x="163" y="45" width="15" height="9" rx="0.6" fill="#0a1210" />
        <rect x="163.7" y="45.7" width="13.6" height="7.6" fill="#16302a" stroke="none" />
        <g stroke="#204a42" strokeWidth="0.3" opacity="0.8">
          <line x1="164.2" y1="47.4" x2="176.6" y2="47.4" /><line x1="164.2" y1="49.4" x2="176.6" y2="49.4" /><line x1="164.2" y1="51.4" x2="176.6" y2="51.4" />
        </g>
        {/* knobs */}
        <g stroke="#0a0506" strokeWidth="0.25" fill="#241d1c">
          <circle cx="182" cy="47.5" r="1.7" /><circle cx="187" cy="47.5" r="1.7" /><circle cx="182" cy="52.5" r="1.7" /><circle cx="187" cy="52.5" r="1.7" />
        </g>
        {/* vent slats */}
        <g stroke="#0a0506" strokeWidth="0.5">
          <line x1="163" y1="58" x2="188" y2="58" /><line x1="163" y1="60" x2="188" y2="60" /><line x1="163" y1="62" x2="188" y2="62" /><line x1="163" y1="64" x2="188" y2="64" />
        </g>
        {/* pipes running down the corner + a valve wheel */}
        <g fill="#140e0d" stroke="#2a1e1d" strokeWidth="0.4">
          <rect x="174" y="78" width="18" height="5" rx="2.5" />
          <rect x="174" y="87" width="18" height="5" rx="2.5" />
          <rect x="185" y="70" width="5" height="40" rx="2" />
        </g>
        {/* specular stripes to round the pipes into cylinders */}
        <g stroke="none" opacity="0.5">
          <rect x="175" y="79" width="16" height="0.9" rx="0.45" fill="#3a2b28" />
          <rect x="175" y="88" width="16" height="0.9" rx="0.45" fill="#3a2b28" />
          <rect x="185.7" y="71" width="0.9" height="38" rx="0.45" fill="#3a2b28" />
        </g>
        <g stroke="#33241f" strokeWidth="0.6" fill="none">
          <circle cx="182.5" cy="80.5" r="3.4" fill="#171110" />
          <line x1="182.5" y1="77.1" x2="182.5" y2="83.9" /><line x1="179.1" y1="80.5" x2="185.9" y2="80.5" /><line x1="180.1" y1="78.1" x2="184.9" y2="82.9" /><line x1="180.1" y1="82.9" x2="184.9" y2="78.1" />
        </g>
      </g>

      {/* ===== CLAMP SPOTLIGHTS hung off the ceiling ===== */}
      <g stroke="#2a1e1d" strokeWidth="0.4">
        <g transform="translate(52 23) rotate(26)">
          <line x1="-2" y1="-9" x2="0" y2="-3.5" stroke="#0a0506" strokeWidth="0.6" />
          <rect x="-6" y="-4" width="11" height="8.6" rx="1.2" fill="#100b0c" />
          <rect x="5" y="-3.4" width="4" height="1.9" fill="#0d0809" stroke="#2a1e1d" strokeWidth="0.3" />
          <rect x="5" y="2.5" width="4" height="1.9" fill="#0d0809" stroke="#2a1e1d" strokeWidth="0.3" />
          <circle cx="5" cy="0.5" r="3.2" fill="#1c1310" stroke="#33241f" strokeWidth="0.5" />
          <circle cx="5" cy="0.5" r="1.5" fill="#2e1f16" />
        </g>
        <g transform="translate(140 25) rotate(-24)">
          <line x1="2" y1="-9" x2="0" y2="-3.5" stroke="#0a0506" strokeWidth="0.6" />
          <rect x="-5" y="-4" width="11" height="8.6" rx="1.2" fill="#100b0c" />
          <rect x="-9" y="-3.4" width="4" height="1.9" fill="#0d0809" stroke="#2a1e1d" strokeWidth="0.3" />
          <rect x="-9" y="2.5" width="4" height="1.9" fill="#0d0809" stroke="#2a1e1d" strokeWidth="0.3" />
          <circle cx="-5" cy="0.5" r="3.2" fill="#1c1310" stroke="#33241f" strokeWidth="0.5" />
          <circle cx="-5" cy="0.5" r="1.5" fill="#2e1f16" />
        </g>
      </g>

      {/* frayed cables drooping across the ceiling */}
      <g stroke="#080405" strokeWidth="0.8" fill="none" opacity="0.9" strokeLinecap="round">
        <path d="M-2 9 Q 48 27 96 13 T 194 17" />
        <path d="M-2 4 Q 60 21 120 7 T 194 10" />
        <path d="M38 2 Q 70 23 104 6" />
      </g>

      {/* pink grime splatter — clustered on the upper walls and corners, fading toward the table */}
      <g filter="url(#cb-splat)">
        <g fill="#d1568c" opacity="0.20"><circle cx="40" cy="22" r="6.2" /><circle cx="45" cy="16" r="2" /><circle cx="34" cy="28" r="1.4" /><circle cx="48" cy="26" r="1" /></g>
        <g fill="#e08ab0" opacity="0.16"><circle cx="151" cy="30" r="5" /><circle cx="159" cy="23" r="1.7" /><circle cx="143" cy="37" r="1.1" /></g>
        <g fill="#d1568c" opacity="0.14"><circle cx="112" cy="14" r="3.2" /><circle cx="118" cy="10" r="0.9" /></g>
        <g fill="#e08ab0" opacity="0.13"><circle cx="169" cy="72" r="4.2" /><circle cx="177" cy="65" r="1.3" /></g>
        <g fill="#d1568c" opacity="0.12"><circle cx="120" cy="86" r="3.6" /><circle cx="128" cy="82" r="1.1" /></g>
        <g fill="#e08ab0" opacity="0.10"><circle cx="86" cy="88" r="3" /></g>
      </g>
    </svg>
  );
}
const chamberDeco: React.CSSProperties = {
  position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0,
};
const topRow: React.CSSProperties = {};
const tableRow: React.CSSProperties = { position: 'relative', minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' };
// The wet concrete floor of the pit: grimy tile seams tilted back in perspective so the lines
// converge toward the horizon, making the table read as sitting on a receding floor in a real room.
const fieldGrid: React.CSSProperties = {
  position: 'absolute', left: '50%', bottom: '-6%', width: '172%', height: '62%',
  transform: 'translateX(-50%) perspective(560px) rotateX(62deg)',
  transformOrigin: '50% 100%', pointerEvents: 'none',
  backgroundImage:
    'linear-gradient(rgba(122,140,102,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(122,140,102,0.045) 1px, transparent 1px)',
  backgroundSize: '46px 46px',
  WebkitMaskImage: 'radial-gradient(72% 92% at 50% 100%, #000 28%, transparent 78%)',
  maskImage: 'radial-gradient(72% 92% at 50% 100%, #000 28%, transparent 78%)',
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
// My mana readout, anchored bottom-left (mirrors 턴 종료 on the right). The ManaBar carries its
// own frame; this just pins it to the corner. Bounded width keeps it clear of the card fan on iPad.
const manaDock: React.CSSProperties = {
  position: 'absolute', bottom: 24, left: 24, zIndex: 16,
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
const rewardPill: React.CSSProperties = {
  marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 8,
  padding: '10px 18px', borderRadius: 999, fontFamily: mono,
  color: '#ffd66b', background: 'rgba(255,196,64,0.10)',
  border: '1px solid rgba(255,196,64,0.35)', boxShadow: '0 0 22px rgba(255,196,64,0.20)',
};
const rewardEarned: React.CSSProperties = { fontSize: 22, fontWeight: 900 };
const rewardLabel: React.CSSProperties = { fontSize: 14, opacity: 0.8 };
const rewardBalance: React.CSSProperties = { marginLeft: 6, paddingLeft: 10, fontSize: 13, color: C.dim, borderLeft: '1px solid rgba(255,255,255,0.14)' };
const rewardGuest: React.CSSProperties = { margin: 0, color: C.dim, fontSize: 13, opacity: 0.8 };
const returnBtn: React.CSSProperties = {
  marginTop: 26, padding: '14px 28px', fontSize: 16, fontWeight: 800, letterSpacing: 0.5,
  color: '#fff', cursor: 'pointer', border: 'none', borderRadius: 12, fontFamily: sans,
  background: 'linear-gradient(100deg, #6d4bff, #5b3cff 60%, #2fb8a0)',
  boxShadow: '0 6px 18px rgba(123,92,255,0.4)',
};
