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
// The back room, redrawn from scratch: a buried gambling den with an exposed-brick back wall under
// peeling plaster, a barred window leaking cold street-light, a caged wall lamp burning amber, a
// crooked framed picture, an electrical junction box with live LEDs, junked gear receding down both
// side walls (metal shelving left, a locker with a dead CRT + pipes right), ceiling conduit and
// frayed cables, a cracked concrete floor with an iron drain, all sunk in shadow and old pink grime.
function ChamberDeco() {
  return (
    <svg style={chamberDeco} viewBox="0 0 192 108" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <defs>
        <filter id="cb-splat" x="-25%" y="-25%" width="150%" height="150%">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="7" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="7" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <filter id="cb-grime" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.16 0.24" numOctaves="3" seed="11" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="4" />
        </filter>
        <radialGradient id="cb-cone" cx="50%" cy="44%" r="56%">
          <stop offset="0" stopColor="#2c1e1d" />
          <stop offset="0.55" stopColor="#0e0809" />
          <stop offset="1" stopColor="#060304" />
        </radialGradient>
        <linearGradient id="cb-side" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#1d1315" />
          <stop offset="1" stopColor="#090507" />
        </linearGradient>
        {/* floor: darkest at the far wall foot, a touch warmer near the viewer where the lamp reaches */}
        <linearGradient id="cb-floor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#080705" />
          <stop offset="0.5" stopColor="#0e0b08" />
          <stop offset="1" stopColor="#15110b" />
        </linearGradient>
        <radialGradient id="cb-glass" cx="50%" cy="38%" r="66%">
          <stop offset="0" stopColor="#24343a" />
          <stop offset="0.55" stopColor="#121c20" />
          <stop offset="1" stopColor="#0a1013" />
        </radialGradient>
      </defs>

      {/* ===== ANGLED SIDE WALLS. The back wall stops high (y58) so a big receding FLOOR opens
           below it — the room is now seen from ABOVE, matching the tilted table oval instead of
           a flat head-on wall. Side walls fold from the ceiling down to the floor at the seams. */}
      <polygon points="0,0 40,15 40,58 0,108" fill="url(#cb-side)" />
      <polygon points="192,0 152,15 152,58 192,108" fill="url(#cb-side)" />

      {/* ===== FLOOR PLANE — the concrete pit floor, a wide quad receding from the near edge up to
           the back wall foot (y58). Its seam lines converge to a high vanishing point (~96,24) so
           the ground tilts up toward us at the SAME angle as the felt oval and the seat ring. */}
      <polygon points="40,58 152,58 192,108 0,108" fill="url(#cb-floor)" />
      <g stroke="#0a0908" strokeWidth="0.4" opacity="0.5">
        {/* radial seams fanning from the back edge toward the viewer (depth lines) */}
        <line x1="60" y1="58" x2="7" y2="108" /><line x1="80" y1="58" x2="56.5" y2="108" />
        <line x1="96" y1="58" x2="96" y2="108" />
        <line x1="112" y1="58" x2="135.5" y2="108" /><line x1="132" y1="58" x2="185" y2="108" />
        {/* transverse depth bands, bunching as they recede */}
        <line x1="28.8" y1="72" x2="163.2" y2="72" /><line x1="16" y1="88" x2="176" y2="88" />
        <line x1="6.4" y1="100" x2="185.6" y2="100" />
      </g>
      {/* corner seams where the side walls fold into the back wall + down to the floor */}
      <line x1="40" y1="15" x2="40" y2="58" stroke="#060304" strokeWidth="0.6" />
      <line x1="152" y1="15" x2="152" y2="58" stroke="#060304" strokeWidth="0.6" />
      {/* the bright-ish line where the back wall meets the floor */}
      <line x1="40" y1="58" x2="152" y2="58" stroke="#221a12" strokeWidth="0.6" opacity="0.8" />

      {/* ===== BACK WALL — grimy plaster with a scar of exposed brick ===== */}
      {/* damp / peeling plaster blotches */}
      <g filter="url(#cb-grime)" opacity="0.6">
        <rect x="44" y="8" width="104" height="18" fill="#22161a" />
        <rect x="60" y="40" width="74" height="10" fill="#1a1013" />
      </g>
      {/* exposed brick patch, plaster fallen away (upper-left of the back wall) */}
      <g>
        <rect x="49" y="14" width="31" height="27" fill="#160c0d" />
        <g stroke="#0d0607" strokeWidth="0.3">
          {[0, 1, 2, 3, 4, 5].map((r) => {
            const y = 15.5 + r * 4;
            const off = r % 2 ? 3 : 0;
            return [0, 1, 2, 3, 4].map((c) => (
              <rect key={`br-${r}-${c}`} x={49.5 + off + c * 6} y={y} width="5.4" height="3.4"
                fill={(r + c) % 3 === 0 ? '#281618' : '#201315'} />
            ));
          })}
        </g>
        {/* ragged plaster edge overhanging the brick */}
        <path d="M49 14 Q47 26 49 41 L52 41 Q50 26 52 20 L80 15 L80 14 Z" fill="#221619" opacity="0.9" />
        <path d="M80 41 Q82 30 80 20 L77 22 Q79 31 77 41 Z" fill="#221619" opacity="0.7" />
      </g>

      {/* barred window, upper-right of the back wall — cold outside light bleeding through */}
      <g>
        {/* faint cold spill washing down the wall under the sill */}
        <polygon points="108,12 140,12 146,58 102,58" fill="#3a5560" opacity="0.03" />
        <rect x="110" y="11" width="30" height="23" rx="1" fill="#0c0708" stroke="#2a1c1e" strokeWidth="0.8" />
        <rect x="112" y="13" width="26" height="19" fill="url(#cb-glass)" />
        {/* iron bars */}
        <g stroke="#05070a" strokeWidth="1">
          <line x1="119" y1="12.5" x2="119" y2="32.5" /><line x1="125" y1="12.5" x2="125" y2="32.5" />
          <line x1="131" y1="12.5" x2="131" y2="32.5" />
          <line x1="112.5" y1="22.5" x2="137.5" y2="22.5" strokeWidth="0.8" />
        </g>
        {/* cracked pane hints */}
        <g stroke="#8fb0bb" strokeWidth="0.2" opacity="0.4">
          <line x1="114" y1="15" x2="118" y2="20" /><line x1="133" y1="26" x2="136" y2="30" />
        </g>
        <rect x="109" y="33.5" width="32" height="1.6" fill="#160e10" />
      </g>

      {/* a crooked framed picture, gone black with grime */}
      <g transform="rotate(-4 90 44)">
        <rect x="82" y="38" width="16" height="12" fill="#0e0809" stroke="#2b2019" strokeWidth="0.8" />
        <rect x="84" y="40" width="12" height="8" fill="#161011" />
        <line x1="84" y1="40" x2="96" y2="48" stroke="#241a1a" strokeWidth="0.3" opacity="0.5" />
      </g>

      {/* electrical conduit dropping to a junction box with live indicator LEDs */}
      <g>
        <rect x="141" y="8" width="1.8" height="30" fill="#150f0e" stroke="#2a1e1a" strokeWidth="0.3" />
        <rect x="137" y="38" width="10" height="8" rx="0.8" fill="#120d0c" stroke="#2c211d" strokeWidth="0.5" />
        <circle cx="140" cy="41.5" r="0.9" fill="#7ad07f"><animate attributeName="opacity" values="1;0.3;1" dur="2.6s" repeatCount="indefinite" /></circle>
        <circle cx="143.5" cy="41.5" r="0.9" fill="#d8a23c"><animate attributeName="opacity" values="0.4;1;0.4" dur="1.7s" repeatCount="indefinite" /></circle>
        <rect x="138.5" y="43.6" width="7" height="1" rx="0.5" fill="#241a18" />
      </g>

      {/* ===== LEFT WALL — metal shelving rack receding to the vanishing point, loaded with junk ===== */}
      <g stroke="#2a1e1d" strokeWidth="0.4">
        {/* uprights: near (x=6) tall, far (x=34) short */}
        <polygon points="5,42 7,42 7,94 5,96" fill="#191110" />
        <polygon points="33,46 34.4,46 34.4,80 33,80.5" fill="#160f0e" />
        {/* three shelves foreshortening back */}
        <polygon points="5,52 34,54 34,55.6 5,54" fill="#1d1513" />
        <polygon points="5,66 34,66 34,67.6 5,68" fill="#1a1211" />
        <polygon points="5,82 34,78.5 34,80.1 5,84" fill="#170f0e" />
        {/* boxes / cans on the shelves, larger up front */}
        <g stroke="#2c211f" strokeWidth="0.3">
          <rect x="8" y="43.5" width="11" height="8.5" fill="#140d0d" />
          <rect x="21" y="46" width="8" height="7" fill="#120c0c" />
          <rect x="9" y="57" width="9" height="9" fill="#170f0e" />
          <rect x="22" y="59.5" width="7" height="6" fill="#120c0c" />
          {/* a jerrycan silhouette */}
          <path d="M9 74 h9 v9 h-9 z M11 72 h5 v2 h-5 z" fill="#130d0c" />
          <rect x="21" y="73.5" width="6.5" height="5" fill="#110b0b" />
        </g>
        {/* debris at the foot */}
        <g fill="#181212" stroke="#2c211f" strokeWidth="0.3">
          <rect x="14" y="90" width="16" height="2.6" transform="rotate(-3 22 91)" />
          <rect x="14" y="93.6" width="16" height="2.6" transform="rotate(2 22 95)" />
        </g>
      </g>

      {/* ===== RIGHT WALL — a tall steel locker + dead CRT, pipes and a valve at the near corner ===== */}
      <g stroke="#2a1e1d" strokeWidth="0.4">
        {/* locker body receding */}
        <polygon points="188,42 160,46 160,90 188,94" fill="#140e0f" />
        <polygon points="188,42 174,44 174,90 188,92" fill="#181110" />
        {/* louvred door slats */}
        <g stroke="#0a0506" strokeWidth="0.4" opacity="0.8">
          <line x1="176" y1="50" x2="186.6" y2="49" /><line x1="176" y1="53" x2="186.6" y2="52" />
          <line x1="176" y1="56" x2="186.6" y2="55" /><line x1="176" y1="59" x2="186.6" y2="58" />
        </g>
        {/* handle */}
        <rect x="175.5" y="66" width="1.6" height="7" rx="0.6" fill="#2c211d" />
        {/* dead green CRT bolted above, near-right */}
        <polygon points="161,50 172,49 172,60 161,61" fill="#0a1210" />
        <polygon points="162,51 171,50.2 171,59 162,59.8" fill="#153029" />
        <g stroke="#1f4640" strokeWidth="0.3" opacity="0.7">
          <line x1="163" y1="52.6" x2="170.4" y2="52" /><line x1="163" y1="54.6" x2="170.4" y2="54" /><line x1="163" y1="56.6" x2="170.4" y2="56" />
        </g>
        <circle cx="169.5" cy="58.4" r="0.7" fill="#3a6a5c" opacity="0.7"><animate attributeName="opacity" values="0.3;0.8;0.3" dur="3.2s" repeatCount="indefinite" /></circle>
        {/* pipes down the near corner + valve wheel */}
        <g fill="#140e0d" stroke="#2a1e1d" strokeWidth="0.4">
          <rect x="176" y="80" width="16" height="4.6" rx="2.3" />
          <rect x="176" y="88" width="16" height="4.6" rx="2.3" />
          <rect x="186" y="60" width="4.6" height="48" rx="2" />
        </g>
        <g stroke="none" opacity="0.5">
          <rect x="177" y="81" width="14" height="0.8" rx="0.4" fill="#3a2b28" />
          <rect x="186.6" y="61" width="0.8" height="46" rx="0.4" fill="#3a2b28" />
        </g>
        <g stroke="#33241f" strokeWidth="0.6" fill="none">
          <circle cx="184" cy="82.3" r="3.2" fill="#171110" />
          <line x1="184" y1="79.1" x2="184" y2="85.5" /><line x1="180.8" y1="82.3" x2="187.2" y2="82.3" /><line x1="181.7" y1="80" x2="186.3" y2="84.6" /><line x1="181.7" y1="84.6" x2="186.3" y2="80" />
        </g>
      </g>

      {/* ===== CEILING — conduit pipe + a vent, frayed cables drooping across ===== */}
      <g stroke="#2a1e1d" strokeWidth="0.4" fill="#120c0c">
        <rect x="40" y="3" width="112" height="2.4" rx="1.2" />
        <rect x="70" y="1.5" width="16" height="5" rx="0.6" fill="#0e0908" />
        <g stroke="#0a0506" strokeWidth="0.4">
          <line x1="72" y1="2.5" x2="72" y2="5.5" /><line x1="76" y1="2.5" x2="76" y2="5.5" /><line x1="80" y1="2.5" x2="80" y2="5.5" /><line x1="84" y1="2.5" x2="84" y2="5.5" />
        </g>
      </g>
      <g stroke="#080405" strokeWidth="0.8" fill="none" opacity="0.9" strokeLinecap="round">
        <path d="M-2 9 Q 48 27 96 13 T 194 17" />
        <path d="M-2 4 Q 60 21 120 7 T 194 10" />
        <path d="M40 5 Q 70 24 104 8" />
      </g>

      {/* ===== FLOOR — cracked concrete with an iron drain grate, mostly under the table ===== */}
      <g opacity="0.7">
        <g stroke="#0a0607" strokeWidth="0.4" fill="none" opacity="0.6">
          <path d="M20 100 L34 96 L46 101" /><path d="M150 99 L164 95 L176 100" /><path d="M96 104 L104 100" />
        </g>
        {/* iron drain grate, front-left of the floor */}
        <g transform="translate(150 98)">
          <rect x="-7" y="-7" width="14" height="14" rx="0.6" fill="#0d0908" stroke="#2a201c" strokeWidth="0.5" />
          <g stroke="#241a17" strokeWidth="0.7">
            <line x1="-5" y1="-4" x2="5" y2="-4" /><line x1="-5" y1="-1.5" x2="5" y2="-1.5" /><line x1="-5" y1="1" x2="5" y2="1" /><line x1="-5" y1="3.5" x2="5" y2="3.5" />
          </g>
        </g>
      </g>

      {/* pink grime splatter — clustered on the upper walls and corners, fading toward the table */}
      <g filter="url(#cb-splat)">
        <g fill="#d1568c" opacity="0.11"><circle cx="40" cy="22" r="6.2" /><circle cx="45" cy="16" r="2" /><circle cx="34" cy="28" r="1.4" /><circle cx="48" cy="26" r="1" /></g>
        <g fill="#e08ab0" opacity="0.09"><circle cx="158" cy="30" r="5" /><circle cx="166" cy="23" r="1.7" /><circle cx="150" cy="37" r="1.1" /></g>
        <g fill="#d1568c" opacity="0.08"><circle cx="112" cy="52" r="3.2" /><circle cx="118" cy="48" r="0.9" /></g>
        <g fill="#e08ab0" opacity="0.07"><circle cx="169" cy="72" r="4.2" /><circle cx="177" cy="65" r="1.3" /></g>
        <g fill="#d1568c" opacity="0.07"><circle cx="120" cy="90" r="3.6" /><circle cx="128" cy="86" r="1.1" /></g>
        <g fill="#e08ab0" opacity="0.06"><circle cx="30" cy="88" r="3" /></g>
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
  color: '#141608', cursor: 'pointer', border: 'none', borderRadius: 10, fontFamily: sans,
  background: 'linear-gradient(180deg,#c3e04d,#8fa832)', boxShadow: '0 8px 20px rgba(166,197,63,0.35)',
  transition: 'transform .15s', zIndex: 16,
};
const endWrap: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
  minHeight: '100vh', gap: 12, fontFamily: sans,
  background: 'radial-gradient(120% 90% at 50% 30%, #191a12 0%, #101110 40%, #080807 100%), #080807',
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
  color: '#141608', cursor: 'pointer', border: 'none', borderRadius: 12, fontFamily: sans,
  background: 'linear-gradient(100deg, #b6d24a, #93ad34 58%, #74902a)',
  boxShadow: '0 6px 18px rgba(0,0,0,0.5)',
};
