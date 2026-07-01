import type { Action, GameEvent, GameState, ReduceCtx, ReduceResult, PlayerState } from '../types.js';
import { CARD_DEFS, requiresTarget } from '../cards/defs.js';
import { effectHandlers, EffectCtx } from '../cards/effects.js';
import { weightedPick } from './rng.js';

function clone(state: GameState): GameState {
  return structuredClone(state);
}

function currentPlayerId(state: GameState): string {
  return state.turnOrder[state.currentTurnIndex];
}

/** Deterministic shuffle of living others for 'random'-target effects. */
function randomOrder(state: GameState, sourceId: string): PlayerState[] {
  const pool = state.players.filter((p) => p.alive && p.id !== sourceId);
  let seed = state.rngSeed;
  for (let i = pool.length - 1; i > 0; i--) {
    const r = weightedPick(seed, pool.slice(0, i + 1), () => 1);
    seed = r.seed;
    const j = pool.indexOf(r.item);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool;
}

export function reduce(input: GameState, action: Action, _ctx: ReduceCtx): ReduceResult {
  if (input.phase !== 'playing') return { state: input, events: [] };

  if (action.type === 'play_card') {
    const actorId = currentPlayerId(input);
    const actor = input.players.find((p) => p.id === actorId);
    if (!actor || !actor.alive) return { state: input, events: [] };
    const cardIdx = actor.hand.findIndex((c) => c.id === action.cardInstanceId);
    if (cardIdx < 0) return { state: input, events: [] };
    const card = actor.hand[cardIdx];
    const def = CARD_DEFS[card.defId];
    if (!def) return { state: input, events: [] };
    // can't afford it: not enough banked mana for this card's cost
    if (actor.mana < def.cost) return { state: input, events: [] };
    // target validation for 'chosen' damage
    if (requiresTarget(def)) {
      const t = input.players.find((p) => p.id === action.targetId);
      if (!t || !t.alive) return { state: input, events: [] };
    }

    const state = clone(input);
    const events: GameEvent[] = [];
    const emit = (e: GameEvent) => { events.push(e); state.log.push(e); };
    const sActor = state.players.find((p) => p.id === actorId)!;
    sActor.hand.splice(cardIdx, 1); // consume
    sActor.mana -= def.cost;        // pay the cost BEFORE effects (so '충전' nets correctly)
    emit({ type: 'card_played', playerId: actorId, defId: def.id, targetId: action.targetId });

    const effCtx: EffectCtx = {
      state, source: sActor, chosenTargetId: action.targetId,
      element: def.element, randomOrder: randomOrder(state, actorId), emit,
    };
    for (const eff of def.effects) effectHandlers[eff.kind](eff, effCtx);

    checkWin(state, emit);
    return { state, events };
  }

  if (action.type === 'end_turn') {
    return endTurn(input, _ctx);
  }

  return { state: input, events: [] };
}

export function checkWin(state: GameState, emit: (e: GameEvent) => void): void {
  if (state.phase !== 'playing') return;
  const alive = state.players.filter((p) => p.alive);
  if (alive.length <= 1) {
    state.phase = 'ended';
    state.winnerId = alive[0]?.id ?? null;
    if (state.winnerId) emit({ type: 'game_over', winnerId: state.winnerId });
  }
}

// endTurn lives in loop.ts and is imported; declared here as a forward reference.
import { endTurn } from './loop.js';
