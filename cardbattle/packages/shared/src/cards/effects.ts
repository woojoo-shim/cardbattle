import type { Effect, GameEvent, GameState, PlayerState, Element, Status } from '../types.js';
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

/** Take a player out of the game once and for all: flip them dead, shed their statuses, announce it,
 *  then fire any armed 죽음의 메아리 (Deathrattle) — the parting effects run with the dead player as
 *  their own source, targeting the survivors. Guarded so a chained kill never re-triggers the same
 *  corpse's rattle. The single place a player is eliminated, so every death (strike, pierce, poison,
 *  or a deathrattle's own AoE) gets the same treatment. */
export function eliminate(state: GameState, victim: PlayerState, emit: (e: GameEvent) => void): void {
  if (!victim.alive) return;
  victim.alive = false;
  const rattle = victim.deathrattle;
  victim.statuses = [];      // the dead carry no lingering effects
  victim.deathrattle = [];   // spent — a corpse can only rattle once
  emit({ type: 'player_eliminated', playerId: victim.id });
  if (rattle.length) {
    emit({ type: 'deathrattle_triggered', playerId: victim.id });
    const ctx: EffectCtx = {
      state, source: victim, chosenTargetId: undefined,
      element: 'none', randomOrder: livingOthers(state, victim.id), emit,
    };
    for (const e of rattle) effectHandlers[e.kind](e, ctx);
  }
}

/** Deal `amount` of `element` damage from `source` to `target`. Shield soaks first; if the target
 *  wears a reflector, a fraction of the HP damage bounces straight back at the attacker (once — the
 *  bounce itself never re-reflects). `allowReflect=false` is used for that bounce and for sources
 *  (pierce) that should ignore reflectors entirely. */
export function damageOne(state: GameState, target: PlayerState, amount: number, element: Element, source: PlayerState, emit: (e: GameEvent) => void, allowReflect = true): void {
  if (!target.alive) return;
  // Shield (defense) is a consumable buffer, not a passive: it soaks damage and is spent doing so.
  const absorbed = Math.min(target.defense, amount);
  target.defense -= absorbed;
  const dealt = amount - absorbed;
  target.hp = Math.max(0, target.hp - dealt);
  emit({ type: 'damage_dealt', sourceId: source.id, targetId: target.id, amount: dealt, element, targetHpAfter: target.hp, absorbed });
  if (target.hp === 0) eliminate(state, target, emit);
  // Reflector: bounce a share of the HP damage back at the attacker (never itself reflected).
  if (allowReflect && dealt > 0 && source.alive && source.id !== target.id) {
    const refl = target.statuses.find((s) => s.kind === 'reflect');
    if (refl) {
      const back = Math.round(dealt * refl.pct);
      if (back > 0) damageOne(state, source, back, element, target, emit, false);
    }
  }
}

/** Apply/merge an ongoing status onto a player and announce it. Poison stacks its per-tick amount
 *  and refreshes duration; regen/reflect take the stronger magnitude and the longer duration. */
function applyStatus(p: PlayerState, st: Status, emit: (e: GameEvent) => void): void {
  const cur = p.statuses.find((s) => s.kind === st.kind);
  if (!cur) {
    p.statuses.push(st);
  } else if (cur.kind === 'poison' && st.kind === 'poison') {
    cur.amount += st.amount;
    cur.turns = Math.max(cur.turns, st.turns);
    cur.sourceId = st.sourceId;
  } else if (cur.kind === 'regen' && st.kind === 'regen') {
    cur.amount = Math.max(cur.amount, st.amount);
    cur.turns = Math.max(cur.turns, st.turns);
  } else if (cur.kind === 'reflect' && st.kind === 'reflect') {
    cur.pct = Math.max(cur.pct, st.pct);
    cur.turns = Math.max(cur.turns, st.turns);
  }
  const amount = st.kind === 'reflect' ? Math.round(st.pct * 100) : st.amount;
  emit({ type: 'status_applied', targetId: p.id, status: st.kind, amount, turns: st.turns });
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
    for (const t of targets) damageOne(ctx.state, t, amount, ctx.element, ctx.source, ctx.emit);
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
    if (t.hp === 0) eliminate(ctx.state, t, ctx.emit);
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
      damageOne(ctx.state, t, amount, ctx.element, ctx.source, ctx.emit);
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
    damageOne(ctx.state, t, amount, ctx.element, ctx.source, ctx.emit);
  },
  // '독' — lay a damage-over-time on the target(s); it bites at the start of each of their turns
  // (loop.ts), bypassing shield. Empower/gamble don't apply — it's a lingering toxin, not a strike.
  poison: (effect: Extract<Effect, { kind: 'poison' }>, ctx) => {
    const targets = effect.target === 'all'
      ? livingOthers(ctx.state, ctx.source.id)
      : (() => { const t = ctx.state.players.find((p) => p.id === ctx.chosenTargetId && p.alive); return t ? [t] : []; })();
    for (const t of targets) {
      applyStatus(t, { kind: 'poison', amount: effect.amount, turns: effect.turns, sourceId: ctx.source.id }, ctx.emit);
    }
  },
  // '재생' — a heal-over-time on the caster, ticking at the start of their own turns.
  regen: (effect: Extract<Effect, { kind: 'regen' }>, ctx) => {
    applyStatus(ctx.source, { kind: 'regen', amount: effect.amount, turns: effect.turns }, ctx.emit);
  },
  // '반사막' — a reflector: until the caster's next turn, a share of incoming HP damage bounces
  // back at whoever struck them (handled in damageOne).
  reflect: (effect: Extract<Effect, { kind: 'reflect' }>, ctx) => {
    applyStatus(ctx.source, { kind: 'reflect', pct: effect.pct, turns: effect.turns }, ctx.emit);
  },
  // 전투의 함성 — read the battlefield the instant the card lands. The played card has already been
  // spliced from hand (reducer), so `last_card` means this was the caster's parting shot. When the
  // condition holds, the bonus effects fire immediately through the SAME context (same target/element).
  battlecry: (effect: Extract<Effect, { kind: 'battlecry' }>, ctx) => {
    const met =
      effect.cond === 'last_card'   ? ctx.source.hand.length === 0
    : effect.cond === 'wounded'     ? ctx.source.hp * 2 <= ctx.source.maxHp
    : /* outnumbered */               livingOthers(ctx.state, ctx.source.id).length >= 2;
    if (!met) return;
    ctx.emit({ type: 'battlecry_triggered', playerId: ctx.source.id, cond: effect.cond });
    for (const e of effect.effects) effectHandlers[e.kind](e, ctx);
  },
  // 죽음의 메아리 — arm the caster with parting effects. They lie dormant until this player is
  // eliminated, then eliminate() unleashes them on the survivors (see effects.ts eliminate).
  deathrattle: (effect: Extract<Effect, { kind: 'deathrattle' }>, ctx) => {
    ctx.source.deathrattle = [...ctx.source.deathrattle, ...effect.effects];
  },
};
