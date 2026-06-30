import type { GameEvent, GameState, PlayerState, ReduceCtx, ReduceResult } from '../types.js';
import { START_HP, START_DEFENSE, START_HAND, DRAW_PER_TURN, HAND_TARGET, TURN_SECONDS } from '../constants.js';
import { ALL_DEFS } from '../cards/defs.js';
import { weightedPick } from './rng.js';
import { checkWin } from './reducer.js';

export function initGame(seats: { id: string; name: string }[]): GameState {
  const players: PlayerState[] = seats.map((s, i) => ({
    id: s.id, name: s.name, connected: true, seat: i,
    hp: START_HP, maxHp: START_HP, defense: START_DEFENSE,
    hand: [], equipment: [], statuses: [], buffs: [], alive: true,
    skipTurns: 0, gamble: false, empower: 1,
  }));
  return { phase: 'lobby', players, turnOrder: [], currentTurnIndex: 0, turnDir: 1, roundCount: 1, turnDeadline: 0, rngSeed: (Math.random() * 1e9) | 0, log: [], winnerId: null };
}

/** Draw one weighted card into a player's hand (mutates state, advances seed). */
function drawCard(state: GameState, player: PlayerState, ctx: ReduceCtx, emit: (e: GameEvent) => void): void {
  const pick = weightedPick(state.rngSeed, ALL_DEFS, (d) => d.drawWeight);
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
  // opening hands (drawn silently into hand; card_drawn still emitted for log)
  for (const p of state.players) {
    for (let i = 0; i < START_HAND; i++) drawCard(state, p, ctx, emit);
  }
  beginTurn(state, ctx, emit);
  return { state, events };
}

/** Set deadline, auto-draw for the current player, emit turn_started. */
function beginTurn(state: GameState, ctx: ReduceCtx, emit: (e: GameEvent) => void): void {
  const cur = state.players.find((p) => p.id === state.turnOrder[state.currentTurnIndex]);
  if (!cur) return;
  state.turnDeadline = ctx.now + TURN_SECONDS * 1000;
  for (let i = 0; i < DRAW_PER_TURN; i++) drawCard(state, cur, ctx, emit);
  emit({ type: 'turn_started', playerId: cur.id, deadline: state.turnDeadline });
}

/** Top every living player's hand back up to HAND_TARGET (cards are added, never removed). */
function refillHands(state: GameState, ctx: ReduceCtx, emit: (e: GameEvent) => void): void {
  for (const p of state.players) {
    if (!p.alive) continue;
    while (p.hand.length < HAND_TARGET) drawCard(state, p, ctx, emit);
  }
}

export function endTurn(input: GameState, ctx: ReduceCtx): ReduceResult {
  if (input.phase !== 'playing') return { state: input, events: [] };
  const state = structuredClone(input);
  const events: GameEvent[] = [];
  const emit = (e: GameEvent) => { events.push(e); state.log.push(e); };
  const endingId = state.turnOrder[state.currentTurnIndex];
  // Per-turn buffs ('도박' arm, '희생' empower) expire when the turn ends, even if unused.
  const ending = state.players.find((p) => p.id === endingId);
  if (ending) { ending.gamble = false; ending.empower = 1; }
  emit({ type: 'turn_ended', playerId: endingId });

  // advance to the next living player in the current direction; crossing the wrap
  // point (seam) means the token completed a full lap -> a new round begins. A player
  // carrying skipTurns is passed over (consuming one skip) and we keep advancing.
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
