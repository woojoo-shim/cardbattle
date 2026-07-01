import type { Effect, GameEvent, GameState, PlayerState, Element } from '../types.js';
import { weightedPick } from '../engine/rng.js';

/** Resolve an attack's amount after this turn's empower and any gamble (armed or mode-forced).
 *  A gamble flips 50/50: the hit either doubles or whiffs entirely. Emits gamble_resolved when it fires. */
function resolveAttackAmount(ctx: EffectCtx, base: number): number {
  let amount = Math.round(base * (ctx.source.empower || 1));
  const gambling = ctx.source.gamble || ctx.state.rules.forceGamble;
  if (gambling) {
    ctx.source.gamble = false; // consume any armed gamble
    const flip = weightedPick(ctx.state.rngSeed, [0, 1], () => 1);
    ctx.state.rngSeed = flip.seed;
    const doubled = flip.item === 1;
    amount = doubled ? amount * 2 : 0;
    ctx.emit({ type: 'gamble_resolved', playerId: ctx.source.id, doubled });
  }
  return amount;
}

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
    // '희생' empowers every attack this turn; a gamble (armed by '도박', or forced in 도박장 mode)
    // then either doubles or whiffs it.
    const amount = resolveAttackAmount(ctx, effect.amount);
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
  mana: (effect: Extract<Effect, { kind: 'mana' }>, ctx) => {
    ctx.source.mana = Math.min(ctx.state.rules.manaMax, ctx.source.mana + effect.amount);
    ctx.emit({ type: 'mana_gained', playerId: ctx.source.id, amount: effect.amount, manaAfter: ctx.source.mana });
  },
  // Like damage, but the hit lands straight on HP — shield/defense is bypassed, not spent.
  // Still an attack, so it obeys this turn's empower and any armed gamble.
  pierce: (effect: Extract<Effect, { kind: 'pierce' }>, ctx) => {
    const t = ctx.state.players.find((p) => p.id === ctx.chosenTargetId && p.alive);
    if (!t) return;
    const amount = resolveAttackAmount(ctx, effect.amount);
    t.hp = Math.max(0, t.hp - amount);
    ctx.emit({ type: 'damage_dealt', sourceId: ctx.source.id, targetId: t.id, amount, element: ctx.element, targetHpAfter: t.hp });
    if (t.hp === 0) {
      t.alive = false;
      ctx.emit({ type: 'player_eliminated', playerId: t.id });
    }
  },
  // '운명교환' — trade my current HP with the chosen player's. Each side is clamped to its own
  // maxHp so a low-HP caster can offload their frailty onto a healthy foe (and vice versa).
  swap: (_effect: Extract<Effect, { kind: 'swap' }>, ctx) => {
    const t = ctx.state.players.find((p) => p.id === ctx.chosenTargetId && p.alive);
    if (!t) return;
    const mine = ctx.source.hp;
    ctx.source.hp = Math.min(ctx.source.maxHp, t.hp);
    t.hp = Math.min(t.maxHp, mine);
    ctx.emit({ type: 'hp_swapped', aId: ctx.source.id, bId: t.id, aHp: ctx.source.hp, bHp: t.hp });
  },
  // '정신흡수' — siphon a chosen player's banked mana. Pairs with a `mana` effect on the same
  // card to hand the drained resource to the caster.
  manaburn: (effect: Extract<Effect, { kind: 'manaburn' }>, ctx) => {
    const t = ctx.state.players.find((p) => p.id === ctx.chosenTargetId && p.alive);
    if (!t) return;
    const burned = Math.min(t.mana, effect.amount);
    t.mana -= burned;
    ctx.emit({ type: 'mana_burned', targetId: t.id, amount: burned, manaAfter: t.mana });
  },
  // '흡혈파동' — an AoE vampire strike: hit every other living player, then heal the caster by the
  // total HP actually removed (shield-absorbed damage doesn't feed the leech). Still an attack, so
  // it honours this turn's empower and any armed gamble (resolved once for the whole wave).
  leech: (effect: Extract<Effect, { kind: 'leech' }>, ctx) => {
    const targets = livingOthers(ctx.state, ctx.source.id);
    const amount = resolveAttackAmount(ctx, effect.amount);
    let healed = 0;
    for (const t of targets) {
      const before = t.hp;
      damageOne(t, amount, ctx.element, ctx.source.id, ctx.emit);
      healed += before - t.hp;
    }
    if (healed > 0) {
      ctx.source.hp = Math.min(ctx.source.maxHp, ctx.source.hp + healed);
      ctx.emit({ type: 'healed', targetId: ctx.source.id, amount: healed, targetHpAfter: ctx.source.hp });
    }
  },
  // '최후의 발악' — the closer to death the caster is, the harder it hits: base + the caster's
  // missing HP. A desperate comeback swing against a chosen foe (obeys empower/gamble).
  desperation: (effect: Extract<Effect, { kind: 'desperation' }>, ctx) => {
    const t = ctx.state.players.find((p) => p.id === ctx.chosenTargetId && p.alive);
    if (!t) return;
    const missing = ctx.source.maxHp - ctx.source.hp;
    const amount = resolveAttackAmount(ctx, effect.amount + missing);
    damageOne(t, amount, ctx.element, ctx.source.id, ctx.emit);
  },
};
