import type { Effect, GameEvent, GameState, PlayerState, Element } from '../types.js';
import { weightedPick } from '../engine/rng.js';

export interface EffectCtx {
  state: GameState;
  source: PlayerState;
  chosenTargetId: string | undefined;
  element: Element;        // from the CardDef being played
  randomOrder: PlayerState[]; // pre-shuffled living others, supplied by reducer (deterministic)
  emit: (e: GameEvent) => void;
}

function livingOthers(state: GameState, sourceId: string): PlayerState[] {
  return state.players.filter((p) => p.alive && p.id !== sourceId);
}

export function damageOne(target: PlayerState, amount: number, element: Element, sourceId: string, emit: (e: GameEvent) => void): void {
  if (!target.alive) return;
  // Shield (defense) is a consumable buffer, not a passive: it soaks damage and is spent doing so.
  const absorbed = Math.min(target.defense, amount);
  target.defense -= absorbed;
  const dealt = amount - absorbed;
  target.hp = Math.max(0, target.hp - dealt);
  emit({ type: 'damage_dealt', sourceId, targetId: target.id, amount: dealt, element, targetHpAfter: target.hp });
  if (target.hp === 0) {
    target.alive = false;
    emit({ type: 'player_eliminated', playerId: target.id });
  }
}

export const effectHandlers: Record<Effect['kind'], (effect: any, ctx: EffectCtx) => void> = {
  damage: (effect: Extract<Effect, { kind: 'damage' }>, ctx) => {
    const targets =
      effect.target === 'all'   ? livingOthers(ctx.state, ctx.source.id)
    : effect.target === 'random'? ctx.randomOrder.slice(0, 1)
    : (() => { const t = ctx.state.players.find((p) => p.id === ctx.chosenTargetId && p.alive); return t ? [t] : []; })();
    // '희생' empowers every attack this turn; '도박', if armed, then either doubles or whiffs it.
    let amount = Math.round(effect.amount * (ctx.source.empower || 1));
    if (ctx.source.gamble) {
      ctx.source.gamble = false; // consumed by this attack
      const flip = weightedPick(ctx.state.rngSeed, [0, 1], () => 1);
      ctx.state.rngSeed = flip.seed;
      const doubled = flip.item === 1;
      amount = doubled ? amount * 2 : 0;
      ctx.emit({ type: 'gamble_resolved', playerId: ctx.source.id, doubled });
    }
    for (const t of targets) damageOne(t, amount, ctx.element, ctx.source.id, ctx.emit);
  },
  heal: (effect: Extract<Effect, { kind: 'heal' }>, ctx) => {
    ctx.source.hp = Math.min(ctx.source.maxHp, ctx.source.hp + effect.amount);
    ctx.emit({ type: 'healed', targetId: ctx.source.id, amount: effect.amount, targetHpAfter: ctx.source.hp });
  },
  shield: (effect: Extract<Effect, { kind: 'shield' }>, ctx) => {
    ctx.source.defense += effect.amount;
    ctx.emit({ type: 'shielded', targetId: ctx.source.id, amount: effect.amount, defenseAfter: ctx.source.defense });
  },
  reverse: (_effect: Extract<Effect, { kind: 'reverse' }>, ctx) => {
    ctx.state.turnDir = ctx.state.turnDir === 1 ? -1 : 1;
    ctx.emit({ type: 'direction_reversed', direction: ctx.state.turnDir });
  },
  peek: (_effect: Extract<Effect, { kind: 'peek' }>, ctx) => {
    const t = ctx.state.players.find((p) => p.id === ctx.chosenTargetId);
    if (!t || !t.alive || t.hand.length === 0) return;
    const pick = weightedPick(ctx.state.rngSeed, t.hand, () => 1);
    ctx.state.rngSeed = pick.seed;
    // PRIVATE event: the room delivers it only to the caster (viewerId).
    ctx.emit({ type: 'card_revealed', viewerId: ctx.source.id, targetId: t.id, cardInstanceId: pick.item.id, defId: pick.item.defId });
  },
  discard: (_effect: Extract<Effect, { kind: 'discard' }>, ctx) => {
    const t = ctx.state.players.find((p) => p.id === ctx.chosenTargetId);
    if (!t || !t.alive || t.hand.length === 0) return;
    const pick = weightedPick(ctx.state.rngSeed, t.hand, () => 1);
    ctx.state.rngSeed = pick.seed;
    const idx = t.hand.findIndex((c) => c.id === pick.item.id);
    if (idx >= 0) t.hand.splice(idx, 1);
    ctx.emit({ type: 'card_discarded', targetId: t.id, cardInstanceId: pick.item.id, defId: pick.item.defId });
  },
  skip: (_effect: Extract<Effect, { kind: 'skip' }>, ctx) => {
    const t = ctx.state.players.find((p) => p.id === ctx.chosenTargetId);
    if (!t || !t.alive) return;
    t.skipTurns += 1;
  },
  gamble: (_effect: Extract<Effect, { kind: 'gamble' }>, ctx) => {
    ctx.source.gamble = true; // armed; resolved by the next attack played this turn
  },
  empower: (effect: Extract<Effect, { kind: 'empower' }>, ctx) => {
    ctx.source.empower = effect.amount; // multiplies attacks for the rest of this turn
  },
  selfskip: (_effect: Extract<Effect, { kind: 'selfskip' }>, ctx) => {
    ctx.source.skipTurns += 1; // forfeit my own next turn
  },
  steal: (_effect: Extract<Effect, { kind: 'steal' }>, ctx) => {
    const t = ctx.state.players.find((p) => p.id === ctx.chosenTargetId);
    if (!t || !t.alive || t.hand.length === 0) return;
    const pick = weightedPick(ctx.state.rngSeed, t.hand, () => 1);
    ctx.state.rngSeed = pick.seed;
    const idx = t.hand.findIndex((c) => c.id === pick.item.id);
    if (idx < 0) return;
    const [stolen] = t.hand.splice(idx, 1);
    ctx.source.hand.push(stolen); // the card moves into my hand; its identity is only revealed to me via hand sync
    ctx.emit({ type: 'card_stolen', thiefId: ctx.source.id, targetId: t.id });
  },
};
