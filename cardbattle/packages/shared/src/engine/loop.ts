import type { CardDef, GameEvent, GameState, PlayerState, ReduceCtx, ReduceResult } from '../types.js';
import { DEFAULT_AVATAR } from '../constants.js';
import { resolveMode, manaRegenFor, DEFAULT_MODE, type GameModeId, type RuleSet } from '../modes.js';
import { ALL_DEFS, CARD_DEFS } from '../cards/defs.js';
import { eliminate, tickBuildings } from '../cards/effects.js';
import { weightedPick, shuffle } from './rng.js';
import { checkWin } from './reducer.js';

/** Build a fresh lobby-ready player under the given ruleset. Shared by initGame and the
 *  room's mid-lobby joins/bot adds so every seat honours the selected mode's starting stats. */
export function spawnPlayer(rules: RuleSet, seat: number, id: string, name: string, avatar: string, deck: string[] = []): PlayerState {
  return {
    id, name, avatar, connected: true, seat,
    hp: rules.startHp, maxHp: rules.startHp, defense: rules.startDefense,
    hand: [], field: [], buildings: [], statuses: [], deathrattle: [], alive: true,
    skipTurns: 0, mana: rules.startMana, heroPowerUsed: false, deck,
  };
}

export function initGame(seats: { id: string; name: string }[], mode: GameModeId = DEFAULT_MODE): GameState {
  const m = resolveMode(mode);
  const players: PlayerState[] = seats.map((s, i) => spawnPlayer(m.rules, i, s.id, s.name, DEFAULT_AVATAR));
  return { phase: 'lobby', mode: m.id, rules: m.rules, players, turnOrder: [], currentTurnIndex: 0, turnDir: 1, roundCount: 1, turnDeadline: 0, rngSeed: (Math.random() * 1e9) | 0, nextMinionId: 0, log: [], winnerId: null };
}

/** Draw one card into a player's hand (mutates state, advances seed).
 *  Clash-Royale-style cycle: a player's own deck is an ORDERED, rotating queue — the front card
 *  is drawn and every played card returns to the back (see reducer), so cards come back around in
 *  a predictable loop. Coach pools and deckless seats (guests/bots) fall back to a weighted roll. */
function drawCard(state: GameState, player: PlayerState, ctx: ReduceCtx, emit: (e: GameEvent) => void): void {
  if (player.hand.length >= state.rules.handCap) return; // a hand never overflows past the cap
  // Cycle path: draw the next queued card off the FRONT of this player's deck (no cardPool override).
  if (!state.rules.cardPool && player.deck.length) {
    const defId = player.deck.shift()!;
    if (CARD_DEFS[defId]) {
      const inst = { id: ctx.nextCardId(), defId };
      player.hand.push(inst);
      emit({ type: 'card_drawn', playerId: player.id, cardInstanceId: inst.id, defId });
      return;
    }
    // unknown id in the queue: drop it and fall through to a weighted roll this draw
  }
  // Fallback (coach pool / deckless guests & bots): a weighted random pick from the pool.
  const ids = state.rules.cardPool ?? null;
  const pool: CardDef[] = ids
    ? ids.map((id) => CARD_DEFS[id]).filter((d): d is CardDef => !!d)
    : ALL_DEFS;
  const src = pool.length ? pool : ALL_DEFS; // safety: an empty/misconfigured pool falls back to the full deck
  const pick = weightedPick(state.rngSeed, src, (d) => d.drawWeight);
  state.rngSeed = pick.seed;
  const inst = { id: ctx.nextCardId(), defId: pick.item.id };
  player.hand.push(inst);
  emit({ type: 'card_drawn', playerId: player.id, cardInstanceId: inst.id, defId: inst.defId });
}

export function startGame(input: GameState, ctx: ReduceCtx): ReduceResult {
  const state = structuredClone(input);
  const events: GameEvent[] = [];
  const emit = (e: GameEvent) => { events.push(e); state.log.push(e); };
  state.phase = 'playing';
  state.turnOrder = state.players.filter((p) => p.alive).map((p) => p.id);
  state.currentTurnIndex = 0;
  // Shuffle each player's deck ONCE into its rotating draw queue (Clash-Royale cycle). Coach pools
  // aren't shuffled here — they roll weighted each draw. Deckless seats keep their empty queue.
  for (const p of state.players) {
    if (!state.rules.cardPool && p.deck.length) {
      const sh = shuffle(state.rngSeed, p.deck);
      state.rngSeed = sh.seed;
      p.deck = sh.items;
    }
  }
  // opening hands (drawn silently into hand; card_drawn still emitted for log)
  for (const p of state.players) {
    for (let i = 0; i < state.rules.startHand; i++) drawCard(state, p, ctx, emit);
  }
  beginTurn(state, ctx, emit);
  return { state, events };
}

/** Set deadline, refresh the current player's board + hero power, ramp mana, auto-draw, emit turn_started. */
function beginTurn(state: GameState, ctx: ReduceCtx, emit: (e: GameEvent) => void): void {
  const cur = state.players.find((p) => p.id === state.turnOrder[state.currentTurnIndex]);
  if (!cur) return;
  state.turnDeadline = ctx.now + state.rules.turnSeconds * 1000;
  cur.heroPowerUsed = false; // the signature ability refreshes at the start of each of your turns
  // Every minion you control wakes up: summoning sickness clears and it gets its one swing this turn.
  for (const m of cur.field) { m.summonedThisTurn = false; m.attacksLeft = 1; }
  // Refill mana by the round-scaled amount (ramps up as the match goes longer), then draw.
  const regained = manaRegenFor(state.rules, state.roundCount);
  cur.mana = Math.min(state.rules.manaMax, cur.mana + regained);
  emit({ type: 'mana_gained', playerId: cur.id, amount: regained, manaAfter: cur.mana });
  // Advance/fire this player's buildings. A completed 화염탑's damage could finish the last foe, so
  // settle the win before drawing / announcing the turn.
  tickBuildings(state, cur, emit, ctx.nextCardId);
  checkWin(state, emit);
  if (state.phase !== 'playing') return;
  for (let i = 0; i < state.rules.drawPerTurn; i++) drawCard(state, cur, ctx, emit);
  emit({ type: 'turn_started', playerId: cur.id, deadline: state.turnDeadline });
}

/** Top every living player's hand back up to handTarget (cards are added, never removed). */
function refillHands(state: GameState, ctx: ReduceCtx, emit: (e: GameEvent) => void): void {
  for (const p of state.players) {
    if (!p.alive) continue;
    while (p.hand.length < state.rules.handTarget) drawCard(state, p, ctx, emit);
  }
}

/** Tick a player's ongoing statuses at THEIR turn start (legacy: no current card applies one, kept
 *  for schema/UI compatibility). Poison bites through shield, regen mends; a poison kill eliminates. */
function tickStatuses(state: GameState, p: PlayerState, emit: (e: GameEvent) => void, nextCardId: () => string): void {
  if (!p.alive || p.statuses.length === 0) return;
  const kept: PlayerState['statuses'] = [];
  for (const st of p.statuses) {
    if (st.kind === 'poison') {
      if (p.alive) {
        p.hp = Math.max(0, p.hp - st.amount);
        emit({ type: 'damage_dealt', sourceId: st.sourceId, targetId: p.id, amount: st.amount, element: 'poison', targetHpAfter: p.hp });
        if (p.hp === 0 && p.alive) eliminate(state, p, emit, nextCardId);
      }
    } else if (st.kind === 'regen') {
      if (p.alive) {
        const before = p.hp;
        p.hp = p.hp + st.amount; // overheal: regen can push hp above maxHp, no cap
        emit({ type: 'healed', targetId: p.id, amount: p.hp - before, targetHpAfter: p.hp });
      }
    }
    if (!p.alive) continue; // corpse keeps nothing
    if (st.turns - 1 > 0) kept.push({ ...st, turns: st.turns - 1 });
  }
  p.statuses = p.alive ? kept : [];
}

export function endTurn(input: GameState, ctx: ReduceCtx): ReduceResult {
  if (input.phase !== 'playing') return { state: input, events: [] };
  const state = structuredClone(input);
  const events: GameEvent[] = [];
  const emit = (e: GameEvent) => { events.push(e); state.log.push(e); };
  const endingId = state.turnOrder[state.currentTurnIndex];
  emit({ type: 'turn_ended', playerId: endingId });

  // advance to the next living player in the current direction; crossing the wrap point (seam) means
  // the token completed a full lap -> a new round begins. Skipped players are passed over (consuming
  // one skip); a player we settle on has their turn-start statuses ticked; a poison kill keeps advancing.
  const n = state.turnOrder.length;
  const dir = state.turnDir;
  let lapped = false;
  let cursor = state.currentTurnIndex;
  for (let guard = 0; guard < n * 8; guard++) {
    let stepped = false;
    for (let step = 1; step <= n; step++) {
      const idx = (((cursor + dir * step) % n) + n) % n;
      const cand = state.players.find((p) => p.id === state.turnOrder[idx]);
      if (cand && cand.alive) {
        if (dir === 1 ? idx <= cursor : idx >= cursor) lapped = true;
        cursor = idx;
        stepped = true;
        break;
      }
    }
    if (!stepped) break; // no living player at all
    const landed = state.players.find((p) => p.id === state.turnOrder[cursor]);
    if (landed && landed.skipTurns > 0) {
      landed.skipTurns -= 1;
      emit({ type: 'turn_skipped', playerId: landed.id });
      continue; // keep advancing past the skipped player
    }
    if (landed) tickStatuses(state, landed, emit, ctx.nextCardId);
    if (landed && !landed.alive) continue; // poison finished them -> find the next taker
    break;
  }
  state.currentTurnIndex = cursor;
  checkWin(state, emit);
  if (state.phase === 'playing') {
    if (lapped) {
      state.roundCount += 1;
      emit({ type: 'round_advanced', round: state.roundCount });
      refillHands(state, ctx, emit);
    }
    beginTurn(state, ctx, emit);
  }
  return { state, events };
}
