import { useEffect, useRef, useState } from 'react';
import type { CardInstance, GameEvent } from '@cardbattle/shared';
import { CARD_DEFS, requiresTarget, resolveMode, heroPowerFor, heroPowerNeedsTarget } from '@cardbattle/shared';
import type { UiState, RoomError, LiveEmote, Reward } from '../state/useRoom.js';
import { TopBar } from './TopBar.js';
import { RoundTable, ENEMY_INTENT, type TargetIntent } from './RoundTable.js';
import { CardFan } from './CardFan.js';
import { Log } from './Log.js';
import { EmoteBar } from './EmoteBar.js';
import { EmoteLayer } from './EmoteLayer.js';
import { ManaBar } from './ManaBar.js';
import { VfxLayer } from '../vfx/VfxLayer.js';
import { Icon, type IconName } from './art/Icon.js';
import { AvatarArt } from './art/CreatureArt.js';
import { soundEvents } from '../audio/sfx.js';
import { C, mono, sans } from './theme.js';
import './arena.css';

interface Props {
  ui: UiState;
  myId: string;
  hand: CardInstance[];
  events: GameEvent[];
  error: RoomError | null;
  send: (a: { type: 'play_card'; cardInstanceId: string; targetId?: string } | { type: 'attack'; attackerId: string; targetId: string } | { type: 'use_hero_power'; targetId?: string } | { type: 'end_turn' }) => void;
  onExit: () => void;
  borderCosmetic?: string;
  emotes: LiveEmote[];
  sendEmote: (id: string) => void;
  reward?: Reward | null;
  coach?: boolean;
}

export function Battle({ ui, myId, hand, events, error, send, onExit, borderCosmetic, emotes, sendEmote, reward, coach }: Props) {
  const [pending, setPending] = useState<CardInstance | null>(null);
  // True while the hero power is armed and waiting for its target (its own targeting mode,
  // separate from a card's `pending` so the two can't both be live).
  const [powerPending, setPowerPending] = useState(false);
  // The id of my own minion armed to attack, waiting for the enemy it should strike.
  const [attacker, setAttacker] = useState<string | null>(null);
  // Learn-by-playing coach: tracks whether the newcomer has taken their first play / ended a turn,
  // so the guidance advances in step with what they actually do at the table.
  const [coachPlayed, setCoachPlayed] = useState(false);
  const [coachEnded, setCoachEnded] = useState(false);
  const [coachOff, setCoachOff] = useState(false);
  const activeId = ui.turnOrder[ui.currentTurnIndex];
  const isMyTurn = activeId === myId && ui.phase === 'playing';
  const me = ui.players.find((p) => p.id === myId);
  const myMana = me?.mana ?? 0;
  const mode = resolveMode(ui.mode);
  const manaMax = mode.rules.manaMax;
  // The deck is an infinite weighted draw from the mode's card pool, so "남은 장수" is really the
  // number of distinct cards this mode can serve. Show that as the deck size in the corner pile.
  const deckCount = mode.rules.cardPool ? mode.rules.cardPool.length : Object.keys(CARD_DEFS).length;
  // The avatar's signature ability: once per turn, costs mana, may need a target.
  const power = heroPowerFor(me?.avatar ?? '');
  const powerNeedsTarget = heroPowerNeedsTarget(power);
  const powerUsed = me?.heroPowerUsed ?? false;
  const canUsePower = isMyTurn && !powerUsed && myMana >= power.cost;

  // Clear a half-finished target selection whenever the turn passes away from me.
  useEffect(() => { if (!isMyTurn) { setPending(null); setPowerPending(false); setAttacker(null); } }, [isMyTurn]);

  // Fire the "당신의 턴" telegraph on the RISING edge of my turn — a bump to a nonce key remounts
  // the banner so its one-shot animation replays each time the turn lands back on me.
  const [turnFlash, setTurnFlash] = useState(0);
  const wasMyTurn = useRef(false);
  useEffect(() => {
    if (isMyTurn && !wasMyTurn.current) setTurnFlash((n) => n + 1);
    wasMyTurn.current = isMyTurn;
  }, [isMyTurn]);

  // Sound the freshest game events (whooshes, impacts, win/lose) in lockstep with the VFX.
  const soundCursor = useRef(0);
  useEffect(() => { soundCursor.current = soundEvents(events, soundCursor.current, myId); }, [events, myId]);

  // Where a targeted card is allowed to aim: heal/buff (chosen) hit MY side, everything else foes.
  const intentForDef = (def: (typeof CARD_DEFS)[string]): TargetIntent => {
    for (const e of def.effects) {
      if (e.kind === 'buff' && e.target === 'chosen') return { side: 'friendly', heroes: false, minions: true };
      if (e.kind === 'heal' && e.target === 'chosen') return { side: 'friendly', heroes: true, minions: true };
    }
    return ENEMY_INTENT;
  };

  // Is `id` a living hero/minion this card is actually allowed to target? Validates side
  // (mine vs enemy per the intent) and kind (heroes/minions) so a mis-dropped arrow falls back
  // to click-to-aim instead of firing at an illegal target the server would just reject.
  const isValidTarget = (def: (typeof CARD_DEFS)[string], id: string): boolean => {
    const intent = intentForDef(def);
    const wantMine = intent.side === 'friendly';
    const hero = ui.players.find((p) => p.id === id);
    if (hero) return intent.heroes && hero.alive && (wantMine ? hero.id === myId : hero.id !== myId);
    for (const p of ui.players) {
      const m = p.field.find((mn) => mn.id === id);
      if (m) return intent.minions && (wantMine ? p.id === myId : p.id !== myId);
    }
    return false;
  };

  // Every living hero/minion this card may legally aim at, given its heal/buff-vs-attack intent.
  const validTargets = (def: (typeof CARD_DEFS)[string]): string[] => {
    const ids: string[] = [];
    for (const p of ui.players) {
      if (isValidTarget(def, p.id)) ids.push(p.id);
      for (const m of p.field) if (isValidTarget(def, m.id)) ids.push(m.id);
    }
    return ids;
  };

  const fire = (card: CardInstance, targetId: string) => {
    send({ type: 'play_card', cardInstanceId: card.id, targetId });
    setPending(null);
    setCoachPlayed(true);
  };

  const playCard = (card: CardInstance, droppedOnId?: string) => {
    if (!isMyTurn) return;
    const def = CARD_DEFS[card.defId];
    if (!def) return;
    setPowerPending(false); // playing a card cancels an armed hero power
    setAttacker(null);      // …and cancels an armed minion attack
    if (requiresTarget(def)) {
      // Dropped straight onto a legal target → fire immediately (drag-to-aim, card-game style).
      if (droppedOnId && isValidTarget(def, droppedOnId)) { fire(card, droppedOnId); return; }
      // 알잘딱: dropped on empty felt but only ONE legal target exists → just aim it there. Only
      // when it's ambiguous (multiple choices) do we fall back to click-to-aim.
      const targets = validTargets(def);
      if (targets.length === 1) { fire(card, targets[0]); return; }
      setPending((cur) => (cur?.id === card.id ? null : card));
      return;
    }
    send({ type: 'play_card', cardInstanceId: card.id });
    setCoachPlayed(true);
  };

  // Arm (or toggle off) one of my minions to attack. Clicking a second minion switches the pick.
  const selectAttacker = (minionId: string) => {
    if (!isMyTurn) return;
    setPending(null);
    setPowerPending(false);
    setAttacker((cur) => (cur === minionId ? null : minionId));
  };

  // Fire (or arm) the avatar's signature ability. Non-targeted powers resolve immediately;
  // targeted ones enter their own selection mode (clicking the button again cancels it).
  const usePower = () => {
    if (!canUsePower) return;
    if (powerNeedsTarget) {
      setPending(null);
      setPowerPending((cur) => !cur); // toggle target mode
      return;
    }
    send({ type: 'use_hero_power' });
  };

  const selectTarget = (targetId: string) => {
    if (attacker) {
      send({ type: 'attack', attackerId: attacker, targetId });
      setAttacker(null);
      return;
    }
    if (powerPending) {
      send({ type: 'use_hero_power', targetId });
      setPowerPending(false);
      return;
    }
    if (!pending) return;
    send({ type: 'play_card', cardInstanceId: pending.id, targetId });
    setPending(null);
    setCoachPlayed(true);
  };

  // A pending card that heals/buffs a chosen target must aim at MY side; damage/destroy aim at
  // foes (the default). Without this a friendly buff like 축복/빛 could only be pointed at enemies.
  const pendingDef = pending ? CARD_DEFS[pending.defId] : undefined;
  const targetIntent: TargetIntent = pendingDef ? intentForDef(pendingDef) : ENEMY_INTENT;

  if (ui.phase === 'ended') {
    const winner = ui.players.find((p) => p.id === ui.winnerId);
    const iWon = ui.winnerId === myId;
    // Placement from the elimination order in the event stream: the winner is 1st, the last
    // player knocked out is the runner-up, and so on back to whoever fell first. In an FFA,
    // "8명 중 3위" is a far kinder verdict than a bare 패배 — it tells you how close you came.
    const total = ui.players.length;
    const elimOrder = events.flatMap((e) => (e.type === 'player_eliminated' ? [e.playerId] : []));
    const placement = iWon ? 1 : (() => { const ei = elimOrder.indexOf(myId); return ei < 0 ? null : total - ei; })();
    const showPlace = !iWon && placement != null && total >= 3;
    const placeColor = placement === 2 ? '#dbe2ea' : placement === 3 ? '#cf9155' : C.dim;
    return (
      <div style={{ ...endWrap, background: iWon ? endBgWin : endBgLose }}>
        <VfxLayer events={events} players={ui.players} myId={myId} />
        {iWon && <div style={endRays} className="cb-rays" aria-hidden />}
        <div style={{ ...endHalo, background: iWon ? haloWin : haloLose }} aria-hidden />

        <div style={endStage}>
          <div style={medallion} className="cb-medallion-in">
            <span style={crest} className="cb-hero-float">
              <Icon name={iWon ? 'trophy' : 'skull'} size={30} color={iWon ? '#ffd66b' : '#cf6a63'} />
            </span>
            <div style={{
              ...avatarDisc,
              filter: iWon ? 'none' : 'grayscale(0.65) brightness(0.8)',
              border: iWon ? '3px solid rgba(216,178,76,0.7)' : '3px solid rgba(120,70,70,0.55)',
              boxShadow: iWon
                ? '0 0 40px rgba(216,178,76,0.5), inset 0 2px 10px rgba(0,0,0,0.6)'
                : '0 0 26px rgba(120,50,50,0.4), inset 0 2px 10px rgba(0,0,0,0.6)',
            }}>
              <AvatarArt avatar={winner?.avatar ?? 'ghost'} tint={iWon ? '#e8c880' : '#9a6a6a'} size={92} />
            </div>
          </div>

          <span style={{ ...endKicker, color: iWon ? '#d8b24c' : '#a24a4a' }}>
            ◈&nbsp;&nbsp;{iWon ? 'LAST ONE STANDING' : 'GAME OVER'}&nbsp;&nbsp;◈
          </span>
          <h1 style={{ ...endTitle, color: iWon ? C.you : C.enemy }} className="cb-end-pop">
            {iWon ? '승리' : '패배'}
          </h1>
          {showPlace && (
            <div style={{ ...placePill, borderColor: placeColor, boxShadow: `0 0 24px ${placeColor}33` }} className="cb-medallion-in">
              <span style={{ ...placeRank, color: placeColor }}>{placement}<span style={placeOrd}>위</span></span>
              <span style={placeOf}>{total}명 중</span>
            </div>
          )}
          <p style={endSub}>
            {iWon ? '최후의 생존자가 되었습니다.' : `${winner?.name ?? '???'} 이(가) 최후까지 살아남았습니다.`}
          </p>

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
      </div>
    );
  }

  return (
    <div style={screen} data-arena>
      <SceneLife />
      <BoardFrame />
      <VfxLayer events={events} players={ui.players} myId={myId} />
      {attacker && <AttackArrow attackerId={attacker} />}
      <EmoteLayer emotes={emotes} />
      {turnFlash > 0 && (
        <div key={turnFlash} style={turnBanner} aria-hidden>
          <span style={turnEdge} />
          <span style={turnSweep} />
          <span style={turnWord}>당신의 턴</span>
        </div>
      )}
      <div style={topRow}><TopBar ui={ui} myId={myId} /></div>
      <div style={tableRow}>
        <RoundTable
          ui={ui}
          myId={myId}
          selectable={isMyTurn && (!!pending || powerPending || !!attacker)}
          onSelect={selectTarget}
          targetIntent={targetIntent}
          attackMode={isMyTurn && !pending && !powerPending}
          attackerId={attacker}
          onSelectAttacker={selectAttacker}
        />
        <Log events={events} ui={ui} />
        {(pending || powerPending || attacker) && (
          <div style={targetHint}>
            <Icon name="target" size={15} />&nbsp;
            {attacker ? '공격할 대상을 선택하세요 (하수인 다시 클릭 시 취소)'
              : powerPending ? '영웅 능력의 대상을 선택하세요 (능력 버튼 다시 클릭 시 취소)'
              : targetIntent.side === 'friendly'
              ? '아군 대상을 선택하세요 (카드 다시 클릭 시 취소)'
              : '대상을 선택하세요 (카드 다시 클릭 시 취소)'}
          </div>
        )}
        {error && <div style={errToast}>{error.message}</div>}
      </div>
      <div style={handRow}>
        <div style={cornerDock}>
          <DeckPile count={deckCount} />
          <ManaBar mana={myMana} max={manaMax} lit={isMyTurn} />
        </div>
        <CardFan hand={hand} enabled={isMyTurn} pendingId={pending?.id ?? null} mana={myMana} onPlay={playCard} borderCosmetic={borderCosmetic} />
        <EmoteBar onSend={sendEmote} />
        {isMyTurn && (
          <button
            style={{
              ...heroBtn,
              opacity: canUsePower ? 1 : 0.42,
              cursor: canUsePower ? 'pointer' : 'default',
              borderColor: powerPending ? '#e0b84a' : '#5a4a86',
              boxShadow: powerPending ? '0 0 14px rgba(224,184,74,0.4)' : 'none',
            }}
            onClick={usePower}
            disabled={!canUsePower}
            title={`${power.name} · ${power.desc}`}
          >
            <span style={heroIcon}>{power.icon}</span>
            <span style={heroInfo}>
              <span style={heroName}>{power.name}</span>
              <span style={heroCost}>
                <Icon name="crystal" size={11} />&nbsp;{power.cost}
                {powerUsed ? ' · 사용함' : ''}
              </span>
            </span>
          </button>
        )}
        {isMyTurn && (
          <button style={endTurnBtn} onClick={() => { setPending(null); setPowerPending(false); send({ type: 'end_turn' }); setCoachEnded(true); }}>
            턴 종료&nbsp;<Icon name="arrowRight" size={15} />
          </button>
        )}
      </div>
      {coach && !coachOff && (
        <CoachLayer
          isMyTurn={isMyTurn}
          hasPending={!!pending}
          played={coachPlayed}
          ended={coachEnded}
          onDismiss={() => setCoachOff(true)}
        />
      )}
    </div>
  );
}

// The Hearthstone-style red attack arrow. Once a minion is armed to attack, a bowed crimson
// bolt springs from that minion and its head tracks the cursor, so aiming at an enemy portrait
// feels like winding up a strike. Pointer-transparent full-screen SVG that re-reads the armed
// minion's on-screen centre (via its data-pid box) on every cursor move, so table drift/parallax
// never leaves the tail behind. Turns a brighter, hotter red once the cursor is over a valid
// target, giving a clear "release here" read.
function AttackArrow({ attackerId }: { attackerId: string }) {
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const [origin, setOrigin] = useState<{ x: number; y: number } | null>(null);
  const [onTarget, setOnTarget] = useState(false);

  useEffect(() => {
    const move = (e: PointerEvent) => {
      const src = document.querySelector(`[data-pid="${attackerId}"]`);
      if (src) {
        const r = src.getBoundingClientRect();
        setOrigin({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
      }
      setCursor({ x: e.clientX, y: e.clientY });
      // Is the cursor over an enemy portrait/minion (a clickable data-pid that isn't the attacker)?
      const under = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-pid]');
      const overId = under?.getAttribute('data-pid');
      setOnTarget(!!overId && overId !== attackerId);
    };
    window.addEventListener('pointermove', move);
    return () => window.removeEventListener('pointermove', move);
  }, [attackerId]);

  if (!origin || !cursor) return null;

  // A quadratic bezier bowed sideways off the straight tail→head line, so the bolt arcs like a
  // drawn bowstring rather than a flat ruler.
  const dx = cursor.x - origin.x;
  const dy = cursor.y - origin.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len; // perpendicular (bow) direction
  const ny = dx / len;
  const bow = Math.min(90, len * 0.22);
  const mx = origin.x + dx * 0.5 + nx * bow;
  const my = origin.y + dy * 0.5 + ny * bow;
  // Angle of the final approach (control point → head) so the arrowhead points along the curve.
  const ang = Math.atan2(cursor.y - my, cursor.x - mx);
  const hot = onTarget ? '#ff2b3d' : '#e04452';
  const glow = onTarget ? '#ff5a68' : '#c0303c';

  return (
    <svg style={arrowSvg} aria-hidden>
      <defs>
        <filter id="cb-arrow-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="0" stdDeviation={onTarget ? 6 : 3.5} floodColor={glow} floodOpacity="0.9" />
        </filter>
      </defs>
      <path
        d={`M ${origin.x} ${origin.y} Q ${mx} ${my} ${cursor.x} ${cursor.y}`}
        fill="none" stroke={hot} strokeWidth={onTarget ? 9 : 7} strokeLinecap="round"
        strokeDasharray="2 14" filter="url(#cb-arrow-glow)"
        className="cb-attack-flow" opacity={0.95}
      />
      <g transform={`translate(${cursor.x} ${cursor.y}) rotate(${(ang * 180) / Math.PI})`} filter="url(#cb-arrow-glow)">
        <path d={`M 0 0 L ${onTarget ? -30 : -24} ${onTarget ? -15 : -12} L ${onTarget ? -21 : -17} 0 L ${onTarget ? -30 : -24} ${onTarget ? 15 : 12} Z`} fill={hot} />
      </g>
    </svg>
  );
}
const arrowSvg: React.CSSProperties = {
  position: 'fixed', inset: 0, width: '100vw', height: '100vh',
  pointerEvents: 'none', zIndex: 45, overflow: 'visible',
};

// The learn-by-playing coach. A single contextual callout, anchored to whatever the newcomer
// should touch next, that advances by watching the real game state: wait for your turn → play a
// card → pick a target → end the turn → free play. Pointer-transparent except its own skip button,
// so it never blocks the table underneath.
function CoachLayer({ isMyTurn, hasPending, played, ended, onDismiss }: {
  isMyTurn: boolean; hasPending: boolean; played: boolean; ended: boolean; onDismiss: () => void;
}) {
  // Derive the step from the true state of play, not a scripted timeline.
  const step: CoachStep =
    ended || (played && !isMyTurn) ? 'done'
    : isMyTurn && hasPending ? 'target'
    : isMyTurn && played ? 'endturn'
    : isMyTurn ? 'play'
    : 'wait';

  // Once the loop is understood, retire the coach so it never nags an experienced hand.
  const [gone, setGone] = useState(false);
  useEffect(() => {
    if (step !== 'done') return;
    const t = setTimeout(onDismiss, 4200);
    return () => clearTimeout(t);
  }, [step, onDismiss]);
  if (gone) return null;

  const c = COACH[step];
  const stepNo = STEP_ORDER[step]; // 1–3 for the action steps, 0 for wait/done
  return (
    <div style={{ ...coachWrap, ...c.anchor }} key={step} className="cb-coach-in">
      <div style={coachBubble}>
        <div style={coachHead}>
          {stepNo > 0
            ? <span style={coachNum}>{stepNo}</span>
            : <span style={coachMark}><Icon name={c.icon} size={16} /></span>}
          <span style={coachStepTag}>{c.tag}</span>
          <button
            style={coachSkip}
            onClick={() => { setGone(true); onDismiss(); }}
            title="튜토리얼 끄기"
          >
            건너뛰기
          </button>
        </div>
        <p style={coachHeadline}>{c.head}</p>
        <p style={coachText}>{c.text}</p>
        {(c.point || stepNo > 0) && (
          <div style={coachFoot}>
            <span style={coachPoint}>{c.point ?? ''}</span>
            {stepNo > 0 && <span style={coachCount}>{stepNo} / 3</span>}
          </div>
        )}
      </div>
    </div>
  );
}

type CoachStep = 'wait' | 'play' | 'target' | 'endturn' | 'done';
// Which of the three actionable steps we're on (0 = intro/outro, no progress dots).
const STEP_ORDER: Record<CoachStep, number> = { wait: 0, play: 1, target: 2, endturn: 3, done: 0 };
const COACH: Record<CoachStep, { icon: IconName; tag: string; head: string; text: string; point?: string; anchor: React.CSSProperties }> = {
  wait: {
    icon: 'zzz', tag: '잠깐 대기',
    head: '지금은 상대 차례예요.',
    text: '상대가 카드를 내는 걸 지켜보세요. 내 차례가 되면 안내가 바로 이어집니다.',
    anchor: { bottom: 'clamp(200px, 20vh, 260px)', left: '50%', transform: 'translateX(-50%)' },
  },
  play: {
    icon: 'card', tag: '1단계 · 카드 내기',
    head: '카드를 한 장 눌러 내보세요.',
    text: '내 차례입니다. 각 카드의 숫자만큼 마나를 쓰고, 공격 카드는 상대의 HP를 깎아요.',
    point: '↓  화면 아래 내 손패에서 카드를 클릭',
    anchor: { bottom: 'clamp(200px, 20vh, 260px)', left: '50%', transform: 'translateX(-50%)' },
  },
  target: {
    icon: 'target', tag: '2단계 · 대상 고르기',
    head: '누구를 맞힐지 골라주세요.',
    text: '이 카드는 대상이 필요해요. 잘못 골랐다면 카드를 다시 눌러 취소할 수 있어요.',
    point: '↑  위쪽 상대의 얼굴(초상화)을 클릭',
    anchor: { top: 'clamp(76px, 12vh, 120px)', left: '50%', transform: 'translateX(-50%)' },
  },
  endturn: {
    icon: 'arrowRight', tag: '3단계 · 턴 넘기기',
    head: '다 냈으면 턴을 넘기세요.',
    text: '마나가 남으면 카드를 더 낼 수 있어요. 더 낼 게 없으면 턴을 마무리합니다.',
    point: '→  오른쪽 «턴 종료» 버튼을 클릭',
    anchor: { bottom: 'clamp(96px, 12vh, 140px)', right: 24 },
  },
  done: {
    icon: 'trophy', tag: '다 배웠어요!',
    head: '이게 한 턴의 전부예요.',
    text: '카드 내기 → 대상 고르기 → 턴 넘기기. 이제 자유롭게 싸워 최후의 1인이 되세요!',
    anchor: { bottom: 'clamp(200px, 20vh, 260px)', left: '50%', transform: 'translateX(-50%)' },
  },
};

// The draw pile in the bottom-right corner: a small stack of card backs. It's decorative at rest
// (the deck is an infinite weighted draw, so it never depletes) — hovering reveals the deck's card
// count in a tooltip, so a curious player can check "how many cards" without cluttering the board.
function DeckPile({ count }: { count: number }) {
  const [hover, setHover] = useState(false);
  return (
    <div style={deckWrap} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      {hover && <span style={deckTip}>덱 {count}장</span>}
      <span style={deckCard3} aria-hidden />
      <span style={deckCard2} aria-hidden />
      <div style={deckCardFront}><span style={deckEmblem}>◆</span></div>
    </div>
  );
}

// The living-air layer: what stops a clean board from reading as a frozen render. The key light
// over the table breathes on a long slow cycle, and a handful of dust motes drift up through the
// beam. Pointer-transparent, screen-blended, low opacity — presence, not clutter. This is the
// deliberate cure for "밋밋" (flat): ambient LIFE, not more objects.
function SceneLife() {
  return (
    <div style={lifeWrap} aria-hidden>
      <div style={coolRim} />
      <div style={lightShaft} className="cb-batt-shaft" />
      <div style={keyBreath} />
      <div style={floorPool} />
      {MOTES.map((m, i) => (
        <span
          key={i}
          style={{
            ...mote,
            left: `${m.x}%`, top: `${m.y}%`,
            width: m.s, height: m.s,
            ['--mx' as string]: `${m.dx}px`, ['--mo' as string]: m.o,
            animation: `cb-mote ${m.d}s linear ${m.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}
// Deterministic scatter across the central light so the drift reads as even but never gridded.
const MOTES = [
  { x: 34, y: 62, s: 3, dx: 16, o: 0.5, d: 15, delay: 0 },
  { x: 46, y: 70, s: 2, dx: -12, o: 0.42, d: 19, delay: 2.5 },
  { x: 58, y: 58, s: 3, dx: 20, o: 0.55, d: 17, delay: 5 },
  { x: 40, y: 52, s: 2, dx: -18, o: 0.36, d: 21, delay: 1.2 },
  { x: 66, y: 66, s: 2.5, dx: 14, o: 0.48, d: 16, delay: 6.4 },
  { x: 52, y: 48, s: 2, dx: -10, o: 0.34, d: 23, delay: 3.7 },
  { x: 28, y: 56, s: 2.5, dx: 22, o: 0.44, d: 18, delay: 8.1 },
  { x: 62, y: 74, s: 3, dx: -16, o: 0.5, d: 14, delay: 4.3 },
  { x: 48, y: 64, s: 2, dx: 12, o: 0.38, d: 20, delay: 9.6 },
  { x: 72, y: 60, s: 2.5, dx: -20, o: 0.46, d: 16.5, delay: 7 },
];
const lifeWrap: React.CSSProperties = {
  position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none',
  mixBlendMode: 'screen', overflow: 'hidden',
};
const keyBreath: React.CSSProperties = {
  position: 'absolute', left: '50%', top: '43%', width: '58%', height: '46%',
  borderRadius: '50%', filter: 'blur(46px)',
  background: 'radial-gradient(ellipse at 50% 45%, rgba(238,178,88,0.18), transparent 66%)',
  animation: 'cb-breathe 7.5s ease-in-out infinite',
};
// A cool dusty-plum wash raking down the far wall — the cold counterpoint that makes the warm
// firelight read as colour, not just brightness.
const coolRim: React.CSSProperties = {
  position: 'absolute', left: '50%', top: '-6%', width: '120%', height: '54%',
  transform: 'translateX(-50%)', borderRadius: '50%', filter: 'blur(60px)',
  background: 'radial-gradient(ellipse at 50% 30%, rgba(96,64,116,0.16), transparent 64%)',
};
// A tall cone of warm light falling from the unseen ceiling onto the table — breathes and sways.
const lightShaft: React.CSSProperties = {
  position: 'absolute', top: '-18%', left: '50%', width: 'min(640px, 62vw)', height: '112%',
  transform: 'translateX(-50%)',
  clipPath: 'polygon(40% 0%, 60% 0%, 84% 100%, 16% 100%)',
  background: 'linear-gradient(180deg, rgba(244,190,96,0.20) 0%, rgba(228,168,72,0.08) 44%, transparent 80%)',
  filter: 'blur(7px)',
};
// A warm pool of firelight blooming off the floor beneath the table.
const floorPool: React.CSSProperties = {
  position: 'absolute', left: '50%', bottom: '-8%', width: '80%', height: '40%',
  transform: 'translateX(-50%)', borderRadius: '50%', filter: 'blur(52px)',
  background: 'radial-gradient(ellipse at 50% 60%, rgba(40,170,130,0.16), transparent 68%)',
};
const mote: React.CSSProperties = {
  position: 'absolute', borderRadius: '50%',
  background: 'radial-gradient(circle, rgba(244,220,168,0.9), rgba(230,180,96,0) 70%)',
};
// A Hearthstone-style carved wooden game board frame ringing the whole screen: four walnut planks
// with a running grain and beveled highlights, a warm brass bead-line just inside the wood (the
// carved gold molding), and a domed brass boss capping each corner joint. Pure CSS (no images),
// pointer-transparent, and low in the stack (zIndex 3) so cards, buttons and VFX all sit in front —
// it reads as the physical board the match is played on, not chrome over the action.
function BoardFrame() {
  return (
    <div style={boardFrame} aria-hidden>
      <div style={framePlankTop} />
      <div style={framePlankBottom} />
      <div style={framePlankLeft} />
      <div style={framePlankRight} />
      <div style={frameBead} />
      <span style={{ ...frameCorner, top: -3, left: -3 }} />
      <span style={{ ...frameCorner, top: -3, right: -3 }} />
      <span style={{ ...frameCorner, bottom: -3, left: -3 }} />
      <span style={{ ...frameCorner, bottom: -3, right: -3 }} />
    </div>
  );
}
const FR = 20; // plank thickness
const grainH = 'repeating-linear-gradient(90deg, rgba(0,0,0,0.18) 0 1px, transparent 1px 8px)';
const grainV = 'repeating-linear-gradient(0deg, rgba(0,0,0,0.18) 0 1px, transparent 1px 8px)';
const woodH = 'linear-gradient(180deg,#2c3549 0%,#1e2636 46%,#12161f 100%)';
const woodV = 'linear-gradient(90deg,#2c3549 0%,#1e2636 46%,#12161f 100%)';
const boardFrame: React.CSSProperties = { position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 3 };
const framePlankTop: React.CSSProperties = {
  position: 'absolute', top: 0, left: 0, right: 0, height: FR, background: `${grainH}, ${woodH}`,
  boxShadow: 'inset 0 2px 3px rgba(150,180,230,0.18), inset 0 -6px 11px rgba(0,0,0,0.55), 0 3px 12px rgba(0,0,0,0.45)',
};
const framePlankBottom: React.CSSProperties = {
  position: 'absolute', bottom: 0, left: 0, right: 0, height: FR, background: `${grainH}, ${woodH}`,
  boxShadow: 'inset 0 -2px 3px rgba(150,180,230,0.13), inset 0 6px 11px rgba(0,0,0,0.55), 0 -3px 12px rgba(0,0,0,0.45)',
};
const framePlankLeft: React.CSSProperties = {
  position: 'absolute', top: 0, bottom: 0, left: 0, width: FR, background: `${grainV}, ${woodV}`,
  boxShadow: 'inset 2px 0 3px rgba(150,180,230,0.16), inset -6px 0 11px rgba(0,0,0,0.55), 3px 0 12px rgba(0,0,0,0.45)',
};
const framePlankRight: React.CSSProperties = {
  position: 'absolute', top: 0, bottom: 0, right: 0, width: FR, background: `${grainV}, ${woodV}`,
  boxShadow: 'inset -2px 0 3px rgba(150,180,230,0.13), inset 6px 0 11px rgba(0,0,0,0.55), -3px 0 12px rgba(0,0,0,0.45)',
};
// The carved gold molding line just inside the wood.
const frameBead: React.CSSProperties = {
  position: 'absolute', inset: FR - 1, borderRadius: 3,
  boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.5), inset 0 0 0 3px rgba(199,154,78,0.5), inset 0 0 14px rgba(199,154,78,0.14)',
};
// A domed brass boss capping each corner joint.
const frameCorner: React.CSSProperties = {
  position: 'absolute', width: 42, height: 42, borderRadius: 7,
  background: 'radial-gradient(circle at 38% 32%, #f0cd85 0%, #c79a4e 40%, #8a6428 68%, #4e3714 100%)',
  boxShadow: '0 2px 7px rgba(0,0,0,0.6), inset 0 1px 2px rgba(255,244,208,0.6), inset 0 -2px 4px rgba(0,0,0,0.5)',
  border: '1px solid #3a2810',
};

// A clean, dark board finished like a lit stage: a warm key light falls on the table at centre,
// a soft vignette pulls the corners to black to frame the play, and the base grades from oxblood
// to near-black. No diorama, no clutter — just quality lighting so the cards and portraits are the
// only things that read.
const screen: React.CSSProperties = {
  width: '100vw', height: '100vh', overflow: 'hidden', position: 'relative', fontFamily: sans,
  display: 'grid', gridTemplateRows: '64px 1fr clamp(210px, 25vh, 320px)',
  // Painted like a jewelled crypt-arena on obsidian: a warm gold core pools on the table (the one
  // warm note for contrast), an amethyst halo bleeds out around it, a deep sapphire wash climbs the
  // far wall up top, and an emerald glow rises off the floor for cool jewel-tone depth. A vignette
  // pulls the corners to black. Layered saturated GEMSTONE pigment — bright but not fluorescent.
  background:
    'radial-gradient(46% 34% at 50% 42%, rgba(255,207,77,0.18), transparent 60%),' +  // warm gold core on the table (the single warm accent)
    'radial-gradient(74% 60% at 50% 44%, rgba(138,107,255,0.18), transparent 70%),' + // amethyst halo around it
    'radial-gradient(120% 88% at 50% 2%, rgba(52,92,170,0.22), transparent 60%),' +   // deep sapphire wash up the far wall
    'radial-gradient(94% 80% at 50% 110%, rgba(40,170,130,0.16), transparent 60%),' + // emerald floor glow
    'radial-gradient(86% 80% at 50% 46%, transparent 44%, rgba(0,0,0,0.68) 100%),' +  // vignette frames the corners
    'linear-gradient(180deg, #141a2a 0%, #0a0d15 56%, #04060b 100%)',
  color: C.text,
};
const topRow: React.CSSProperties = {};
const tableRow: React.CSSProperties = {
  position: 'relative', minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
};
// zIndex 30 raises the whole hand band ABOVE the player/board row (tableRow) so a lifted or
// proximity-magnified card overlaps and covers the players cleanly instead of being clipped behind them.
const handRow: React.CSSProperties = { position: 'relative', zIndex: 30, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' };
const targetHint: React.CSSProperties = {
  position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
  padding: '8px 18px', background: 'rgba(255,77,94,0.16)', border: `1px solid ${C.enemy}`,
  borderRadius: 4, color: '#ffc0c6', fontSize: 14, zIndex: 16,
};
// The "당신의 턴" onset telegraph. A full-screen, pointer-transparent layer that flashes up once
// the instant my turn begins, then clears itself out. zIndex sits under the VfxLayer flash (50)
// so incoming impacts still read over it, but above the table and needle.
const turnBanner: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 44, pointerEvents: 'none',
  display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  animation: 'cb-turn-flash 1.5s ease-out forwards',
};
// A brief bloom of my colour hugging the screen edge, so the cue registers in peripheral vision.
const turnEdge: React.CSSProperties = {
  position: 'absolute', inset: 0,
  boxShadow: 'inset 0 0 150px 26px rgba(195,154,76,0.24)',
};
// A raking light bar that wipes across behind the words for a bit of showmanship.
const turnSweep: React.CSSProperties = {
  position: 'absolute', top: '50%', left: '50%', width: '58%', height: 132,
  transform: 'translate(-50%,-50%)',
  background: 'linear-gradient(90deg, transparent, rgba(195,154,76,0.14) 44%, rgba(236,224,198,0.28) 50%, rgba(195,154,76,0.14) 56%, transparent)',
  filter: 'blur(2px)', animation: 'cb-turn-sweep 1.5s cubic-bezier(.4,0,.25,1) forwards',
};
const turnWord: React.CSSProperties = {
  position: 'relative', fontFamily: sans, fontWeight: 900, fontSize: 'clamp(44px, 8vw, 96px)',
  color: '#f2e6c8', letterSpacing: 11,
  textShadow: '0 2px 2px rgba(30,18,6,0.7), 0 8px 22px rgba(30,18,6,0.6)',
  animation: 'cb-turn-text 1.5s cubic-bezier(.16,.84,.3,1) forwards',
};
const errToast: React.CSSProperties = {
  position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
  padding: '8px 16px', background: 'rgba(255,77,94,0.18)', border: `1px solid ${C.enemy}`,
  borderRadius: 4, color: '#ffc0c6', fontSize: 13, zIndex: 17,
};
// The bottom-RIGHT corner cluster (Hearthstone-style): the draw pile sits just left of the mana
// gems, both bottom-aligned, so the deck and mana read as one tidy corner group.
const cornerDock: React.CSSProperties = {
  position: 'absolute', bottom: 24, right: 24, zIndex: 16,
  display: 'flex', alignItems: 'flex-end', gap: 16,
};
const deckWrap: React.CSSProperties = { position: 'relative', width: 64, height: 88, cursor: 'default' };
// Layered card backs, each nudged & tilted a touch, so the widget reads as a physical draw pile.
const deckCard: React.CSSProperties = { position: 'absolute', inset: 0, borderRadius: 8, boxSizing: 'border-box' };
const deckCard3: React.CSSProperties = { ...deckCard, transform: 'translate(-7px,-7px) rotate(-5deg)', background: 'linear-gradient(160deg,#1a2233,#0e131f)', border: '1px solid #33405a', boxShadow: '0 4px 10px rgba(0,0,0,0.5)' };
const deckCard2: React.CSSProperties = { ...deckCard, transform: 'translate(-3px,-3px) rotate(-2.5deg)', background: 'linear-gradient(160deg,#1f2839,#111826)', border: '1px solid #3d4c68', boxShadow: '0 4px 10px rgba(0,0,0,0.5)' };
const deckCardFront: React.CSSProperties = {
  ...deckCard, display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: 'linear-gradient(160deg,#26314a,#141b2b)', border: '1px solid #4a5c80',
  boxShadow: '0 6px 14px rgba(0,0,0,0.55), inset 0 1px 0 rgba(200,220,255,0.1)',
};
// A gold diamond crest on the card back — a quiet emblem so the pile reads as "cards", not a box.
const deckEmblem: React.CSSProperties = {
  width: 30, height: 30, display: 'grid', placeItems: 'center', borderRadius: 6,
  border: '1px solid rgba(255,207,77,0.5)', color: '#ffcf4d', fontSize: 15,
  filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.7))', background: 'radial-gradient(120% 120% at 50% 30%, rgba(255,207,77,0.14), transparent 70%)',
};
const deckTip: React.CSSProperties = {
  position: 'absolute', bottom: '100%', left: '50%', transform: 'translate(-50%,-10px)',
  whiteSpace: 'nowrap', padding: '5px 11px', background: 'rgba(12,16,26,0.96)',
  border: '1px solid #3a4560', borderRadius: 4, color: '#cfe0ff', fontFamily: sans,
  fontSize: 12, fontWeight: 700, boxShadow: '0 6px 14px rgba(0,0,0,0.5)', pointerEvents: 'none', zIndex: 20,
};
const endTurnBtn: React.CSSProperties = {
  // Fixed to the viewport (not the hand row) so it sits at the screen's right vertical centre.
  position: 'fixed', top: '50%', right: 32, transform: 'translateY(-50%)', padding: '13px 24px', fontSize: 16, fontWeight: 700,
  color: '#eafff7', cursor: 'pointer', border: '1px solid #2a9e74', borderRadius: 4, fontFamily: sans,
  background: '#1c7a58',
  transition: 'transform .15s', zIndex: 30,
};
// The avatar's signature ability, docked bottom-left above the mana readout. An arcane violet
// slab so it reads as its own class of action, distinct from the oxblood 턴 종료 CTA.
const heroBtn: React.CSSProperties = {
  position: 'absolute', bottom: 92, left: 24, zIndex: 16,
  display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px',
  background: 'linear-gradient(180deg, rgba(48,38,74,0.96), rgba(28,20,44,0.96))',
  border: '1px solid #5a4a86', borderRadius: 4, fontFamily: sans,
  transition: 'opacity .15s, box-shadow .15s',
};
const heroIcon: React.CSSProperties = { fontSize: 22, lineHeight: 1 };
const heroInfo: React.CSSProperties = { display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2 };
const heroName: React.CSSProperties = { fontSize: 14, fontWeight: 700, color: '#e9def6', letterSpacing: 0.3 };
const heroCost: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', fontSize: 11, fontFamily: mono, color: '#b6a6d8',
};
const endWrap: React.CSSProperties = {
  position: 'relative', overflow: 'hidden',
  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
  minHeight: '100vh', fontFamily: sans,
};
// Victory bathes the room in warm gold; defeat drowns it in cold oxblood ash.
const endBgWin = 'radial-gradient(120% 90% at 50% 26%, #24210f 0%, #14130c 42%, #080806 100%), #080806';
const endBgLose = 'radial-gradient(120% 90% at 50% 26%, #1e1012 0%, #130b0d 44%, #070405 100%), #070405';
// A slow fan of light rays turning behind the winner — victory only.
const endRays: React.CSSProperties = {
  position: 'absolute', left: '50%', top: '40%', width: '150vmax', height: '150vmax',
  transform: 'translate(-50%, -50%)', pointerEvents: 'none', zIndex: 0, opacity: 0.5,
  background: 'repeating-conic-gradient(from 0deg at 50% 50%, rgba(216,178,76,0.13) 0deg 7deg, transparent 7deg 20deg)',
  WebkitMaskImage: 'radial-gradient(circle at 50% 50%, #000 6%, transparent 46%)',
  maskImage: 'radial-gradient(circle at 50% 50%, #000 6%, transparent 46%)',
};
const endHalo: React.CSSProperties = {
  position: 'absolute', left: '50%', top: '40%', width: 560, height: 560,
  transform: 'translate(-50%, -50%)', pointerEvents: 'none', zIndex: 0,
  borderRadius: '50%', filter: 'blur(30px)',
};
const haloWin = 'radial-gradient(circle, rgba(216,178,76,0.28), transparent 62%)';
const haloLose = 'radial-gradient(circle, rgba(160,60,60,0.22), transparent 62%)';
const endStage: React.CSSProperties = {
  position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column',
  alignItems: 'center', gap: 12, textAlign: 'center', padding: '0 20px',
};
// The winner's portrait in a ringed medallion, a floating crest above it.
const medallion: React.CSSProperties = {
  position: 'relative', marginBottom: 10,
};
const avatarDisc: React.CSSProperties = {
  width: 120, height: 120, borderRadius: '50%', display: 'grid', placeItems: 'center', overflow: 'hidden',
  background: 'radial-gradient(circle at 50% 34%, #1a2130, #0a0d14)',
};
const crest: React.CSSProperties = {
  position: 'absolute', top: -26, left: '50%', transform: 'translateX(-50%)', zIndex: 3,
  width: 46, height: 46, borderRadius: '50%', display: 'grid', placeItems: 'center',
  background: 'radial-gradient(circle, rgba(20,14,10,0.95), rgba(10,7,5,0.95))',
  border: '1px solid rgba(216,178,76,0.4)', boxShadow: '0 0 20px rgba(216,178,76,0.3)',
};
const endKicker: React.CSSProperties = {
  fontFamily: mono, fontSize: 12, letterSpacing: 5, textTransform: 'uppercase', fontWeight: 700,
};
const endTitle: React.CSSProperties = { margin: '2px 0 0', fontSize: 76, fontWeight: 900, letterSpacing: 10, textShadow: '0 0 60px currentColor' };
// Placement medal for FFA losers — a ranked verdict (2위 silver, 3위 bronze, else dim) so a
// hard-fought near-win reads as an accomplishment rather than a flat defeat.
const placePill: React.CSSProperties = {
  marginTop: 8, display: 'inline-flex', alignItems: 'baseline', gap: 10,
  padding: '8px 20px', borderRadius: 4, border: '1px solid',
  background: 'rgba(255,255,255,0.03)',
};
const placeRank: React.CSSProperties = { fontFamily: mono, fontSize: 30, fontWeight: 900, letterSpacing: 0.5 };
const placeOrd: React.CSSProperties = { fontSize: 16, fontWeight: 800, marginLeft: 2 };
const placeOf: React.CSSProperties = { fontSize: 13, color: C.dim, fontFamily: mono };
const endSub: React.CSSProperties = { margin: '4px 0 8px', color: C.dim, fontSize: 18 };
const rewardPill: React.CSSProperties = {
  marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 8,
  padding: '10px 18px', borderRadius: 4, fontFamily: mono,
  color: '#ffd66b', background: 'rgba(255,196,64,0.10)',
  border: '1px solid rgba(255,196,64,0.35)',
};
const rewardEarned: React.CSSProperties = { fontSize: 22, fontWeight: 900 };
const rewardLabel: React.CSSProperties = { fontSize: 14, opacity: 0.8 };
const rewardBalance: React.CSSProperties = { marginLeft: 6, paddingLeft: 10, fontSize: 13, color: C.dim, borderLeft: '1px solid rgba(255,255,255,0.14)' };
const rewardGuest: React.CSSProperties = { margin: 0, color: C.dim, fontSize: 13, opacity: 0.8 };
const returnBtn: React.CSSProperties = {
  marginTop: 26, padding: '14px 28px', fontSize: 16, fontWeight: 700, letterSpacing: 0.5,
  color: '#eafff7', cursor: 'pointer', border: '1px solid #2a9e74', borderRadius: 4, fontFamily: sans,
  background: '#1c7a58',
};

// The coach note. Deliberately flat and typographic — a bordered slip of dark card with a single
// gold spine down its left edge, a big bare step numeral, and a plain "1 / 3" counter. No glowing
// badge, gradient bubble, or pill dots (those read as a generic AI-made SaaS toast). It should feel
// like an instruction printed on the game's own stock. Pointer-transparent except the bubble itself.
const coachWrap: React.CSSProperties = {
  position: 'fixed', zIndex: 46, pointerEvents: 'none', maxWidth: 'min(340px, 88vw)',
};
const coachBubble: React.CSSProperties = {
  pointerEvents: 'auto', padding: '12px 15px 13px', borderRadius: 3,
  background: '#12151f', border: '1px solid rgba(90,110,150,0.3)', borderLeft: '3px solid #ffcf4d',
  boxShadow: '0 12px 26px rgba(0,0,0,0.5)',
};
const coachHead: React.CSSProperties = { display: 'flex', alignItems: 'baseline', gap: 9, marginBottom: 5 };
// A big, bare serif numeral instead of a glowing circular badge.
const coachSerif = "'Times New Roman', Georgia, 'Nanum Myeongjo', serif";
const coachNum: React.CSSProperties = {
  fontFamily: coachSerif, fontSize: 26, fontWeight: 700, lineHeight: 0.9, color: '#c79a4e', flexShrink: 0,
};
const coachMark: React.CSSProperties = { color: '#9a8558', alignSelf: 'center', flexShrink: 0, display: 'grid', placeItems: 'center' };
const coachStepTag: React.CSSProperties = {
  flex: 1, fontFamily: mono, fontSize: 10.5, fontWeight: 700, letterSpacing: 2, color: '#8f7f5c', textTransform: 'uppercase',
};
const coachSkip: React.CSSProperties = {
  padding: 0, fontSize: 11, color: C.faint, cursor: 'pointer', border: 'none', background: 'transparent',
  fontFamily: sans, textDecoration: 'underline', textUnderlineOffset: 2,
};
const coachHeadline: React.CSSProperties = { margin: '0 0 4px', fontSize: 15.5, fontWeight: 700, lineHeight: 1.32, color: '#e7dcc4' };
const coachText: React.CSSProperties = { margin: 0, fontSize: 12.5, lineHeight: 1.55, color: '#a99a7d' };
// Footer: the directional hint (left) and a plain step counter (right), divided from the body by a hairline.
const coachFoot: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
  marginTop: 11, paddingTop: 9, borderTop: '1px solid rgba(150,120,72,0.16)',
};
const coachPoint: React.CSSProperties = { fontFamily: mono, fontSize: 12, letterSpacing: 0.2, color: '#c79a4e' };
const coachCount: React.CSSProperties = { fontFamily: mono, fontSize: 11, letterSpacing: 1, color: '#7d6f52', flexShrink: 0 };
