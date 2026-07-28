import type { Action, GameEvent, GameState, ReduceCtx, ReduceResult, PlayerState } from '../types.js';
import { CARD_DEFS, requiresTarget } from '../cards/defs.js';
import { effectHandlers, EffectCtx, summonMinion, resolveAttack, findEntity } from '../cards/effects.js';
import { heroPowerFor, heroPowerNeedsTarget } from '../heroes.js';
import { weightedPick } from './rng.js';

function clone(state: GameState): GameState {
  return structuredClone(state);
}

function currentPlayerId(state: GameState): string {
  return state.turnOrder[state.currentTurnIndex];
}

/** Deterministic shuffle of living others for 'randomEnemy'-target effects. */
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

/** True if `defender`'s controller has a 수호 (taunt) minion — enemies must strike a taunt first.
 *  The taunt minion itself is always a legal target. */
function tauntBlocks(state: GameState, targetId: string): boolean {
  const ent = findEntity(state, targetId);
  if (!ent) return false;
  const controllerId = ent.kind === 'hero' ? ent.hero.id : ent.owner.id;
  const controller = state.players.find((p) => p.id === controllerId);
  if (!controller) return false;
  const hasTaunt = controller.field.some((m) => m.taunt);
  if (!hasTaunt) return false;
  return !(ent.kind === 'minion' && ent.minion.taunt); // ok only if the chosen target is itself a taunt
}

export function reduce(input: GameState, action: Action, ctx: ReduceCtx): ReduceResult {
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
    if (actor.mana < def.cost) return { state: input, events: [] }; // can't afford it
    // a minion needs an open field slot to be summoned
    if (def.kind === 'minion' && actor.field.length >= input.rules.fieldCap) return { state: input, events: [] };
    // target validation for effects that pick an entity
    if (requiresTarget(def)) {
      const ent = findEntity(input, action.targetId);
      if (!ent) return { state: input, events: [] };
      if (ent.kind === 'hero' && !ent.hero.alive) return { state: input, events: [] };
    }

    const state = clone(input);
    const events: GameEvent[] = [];
    const emit = (e: GameEvent) => { events.push(e); state.log.push(e); };
    const sActor = state.players.find((p) => p.id === actorId)!;
    sActor.hand.splice(cardIdx, 1); // consume
    sActor.mana -= def.cost;        // pay the cost before effects (so 마나 샘 nets correctly)
    emit({ type: 'card_played', playerId: actorId, defId: def.id, targetId: action.targetId });

    const effCtx: EffectCtx = {
      state, source: sActor, chosenTargetId: action.targetId,
      element: def.element, randomOrder: randomOrder(state, actorId), emit, nextCardId: ctx.nextCardId,
    };

    if (def.kind === 'minion') {
      summonMinion(state, sActor, def.id, emit);
      if (def.effects.length) { // 강림 (battlecry): the summon's effects fire on entry
        emit({ type: 'battlecry_triggered', playerId: actorId, cond: def.id });
        for (const eff of def.effects) effectHandlers[eff.kind](eff, effCtx);
      }
    } else {
      for (const eff of def.effects) effectHandlers[eff.kind](eff, effCtx); // spell fires on play
    }

    checkWin(state, emit);
    return { state, events };
  }

  if (action.type === 'attack') {
    const actorId = currentPlayerId(input);
    const actor = input.players.find((p) => p.id === actorId);
    if (!actor || !actor.alive) return { state: input, events: [] };
    const attacker = actor.field.find((m) => m.id === action.attackerId);
    if (!attacker) return { state: input, events: [] };          // must be your own minion
    if (attacker.attacksLeft <= 0) return { state: input, events: [] };
    if (attacker.attack <= 0) return { state: input, events: [] };
    const target = findEntity(input, action.targetId);
    if (!target) return { state: input, events: [] };
    const targetOwnerId = target.kind === 'hero' ? target.hero.id : target.owner.id;
    if (targetOwnerId === actorId) return { state: input, events: [] };  // no friendly fire
    if (target.kind === 'hero' && !target.hero.alive) return { state: input, events: [] };
    if (tauntBlocks(input, action.targetId)) return { state: input, events: [] };

    const state = clone(input);
    const events: GameEvent[] = [];
    const emit = (e: GameEvent) => { events.push(e); state.log.push(e); };
    const sAttacker = state.players.find((p) => p.id === actorId)!.field.find((m) => m.id === action.attackerId)!;
    resolveAttack(state, sAttacker, action.targetId, emit, ctx.nextCardId);

    checkWin(state, emit);
    return { state, events };
  }

  if (action.type === 'use_hero_power') {
    const actorId = currentPlayerId(input);
    const actor = input.players.find((p) => p.id === actorId);
    if (!actor || !actor.alive) return { state: input, events: [] };
    if (actor.heroPowerUsed) return { state: input, events: [] }; // once per turn
    const power = heroPowerFor(actor.avatar);
    if (actor.mana < power.cost) return { state: input, events: [] };
    if (heroPowerNeedsTarget(power)) {
      const ent = findEntity(input, action.targetId);
      if (!ent) return { state: input, events: [] };
      if (ent.kind === 'hero' && !ent.hero.alive) return { state: input, events: [] };
    }

    const state = clone(input);
    const events: GameEvent[] = [];
    const emit = (e: GameEvent) => { events.push(e); state.log.push(e); };
    const sActor = state.players.find((p) => p.id === actorId)!;
    sActor.mana -= power.cost;
    sActor.heroPowerUsed = true;
    emit({ type: 'hero_power_used', playerId: actorId, avatar: sActor.avatar, powerId: power.id, targetId: action.targetId });

    const effCtx: EffectCtx = {
      state, source: sActor, chosenTargetId: action.targetId,
      element: power.element, randomOrder: randomOrder(state, actorId), emit, nextCardId: ctx.nextCardId,
    };
    for (const eff of power.effects) effectHandlers[eff.kind](eff, effCtx);

    checkWin(state, emit);
    return { state, events };
  }

  if (action.type === 'end_turn') {
    return endTurn(input, ctx);
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
