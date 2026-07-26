import type { Effect, GameEvent, GameState, PlayerState, Element, MinionInstance } from '../types.js';
import { weightedPick } from '../engine/rng.js';
import { CARD_DEFS, ALL_DEFS } from './defs.js';

/** The board runs on two kinds of combatant: a hero (a PlayerState) and a minion on someone's field.
 *  Any `chosen` target resolves to one of these via findEntity. */
export type Entity =
  | { kind: 'hero'; hero: PlayerState }
  | { kind: 'minion'; minion: MinionInstance; owner: PlayerState };

export interface EffectCtx {
  state: GameState;
  source: PlayerState;         // the hero casting the spell / owning the battlecry
  chosenTargetId: string | undefined;
  element: Element;            // from the CardDef being played
  randomOrder: PlayerState[];  // pre-shuffled living others, supplied by reducer (deterministic)
  emit: (e: GameEvent) => void;
  nextCardId: () => string;    // server-owned unique CardInstance id generator (for draw effects)
}

function livingOthers(state: GameState, sourceId: string): PlayerState[] {
  return state.players.filter((p) => p.alive && p.id !== sourceId);
}

/** Locate any combatant by id — a hero or a minion on any field. */
export function findEntity(state: GameState, id: string | undefined): Entity | null {
  if (!id) return null;
  const hero = state.players.find((p) => p.id === id);
  if (hero) return { kind: 'hero', hero };
  for (const p of state.players) {
    const m = p.field.find((x) => x.id === id);
    if (m) return { kind: 'minion', minion: m, owner: p };
  }
  return null;
}

/** Mint a fresh unique MinionInstance id from the server-owned counter. */
function mintMinionId(state: GameState): string {
  const id = `m${state.nextMinionId}`;
  state.nextMinionId += 1;
  return id;
}

/** Summon one copy of a minion token onto an owner's field (respecting the field cap). Sets up its
 *  combat stats + keyword flags, arms its deathrattle, and announces it. Returns the new minion (or
 *  null if the field is full / the token isn't a minion). */
export function summonMinion(state: GameState, owner: PlayerState, defId: string, emit: (e: GameEvent) => void): MinionInstance | null {
  if (owner.field.length >= state.rules.fieldCap) return null;
  const def = CARD_DEFS[defId];
  if (!def || !def.minion) return null;
  const kw = def.keywords ?? [];
  const m: MinionInstance = {
    id: mintMinionId(state),
    defId,
    ownerId: owner.id,
    attack: def.minion.attack,
    health: def.minion.health,
    maxHealth: def.minion.health,
    summonedThisTurn: true,
    attacksLeft: kw.includes('charge') ? 1 : 0, // charge lets it swing the turn it lands
    taunt: kw.includes('taunt'),
    charge: kw.includes('charge'),
    divineShield: kw.includes('divineShield'),
    poisonous: kw.includes('poisonous'),
    lifesteal: kw.includes('lifesteal'),
    deathrattle: def.deathrattle ? structuredClone(def.deathrattle) : [],
  };
  owner.field.push(m);
  emit({ type: 'minion_summoned', playerId: owner.id, minionId: m.id, defId });
  return m;
}

/** Deal `amount` of `element` damage to a hero. Shield (defense) soaks first and is spent doing so.
 *  Returns the HP actually removed (feeds lifesteal). Death is settled by resolveDeaths afterwards. */
function damageHero(hero: PlayerState, amount: number, element: Element, sourceId: string, emit: (e: GameEvent) => void): number {
  if (!hero.alive || amount <= 0) return 0;
  const absorbed = Math.min(hero.defense, amount);
  hero.defense -= absorbed;
  const dealt = amount - absorbed;
  hero.hp = Math.max(0, hero.hp - dealt);
  emit({ type: 'damage_dealt', sourceId, targetId: hero.id, amount: dealt, element, targetHpAfter: hero.hp, absorbed });
  return dealt;
}

/** Deal `amount` damage to a minion. Divine Shield negates the first hit entirely (and pops). A
 *  poisonous source destroys any minion it wounds. Returns damage actually dealt (0 if shielded). */
function damageMinion(m: MinionInstance, amount: number, poisonous: boolean, emit: (e: GameEvent) => void): number {
  if (amount <= 0) return 0;
  if (m.divineShield) {
    m.divineShield = false;
    emit({ type: 'minion_buffed', minionId: m.id, attack: m.attack, health: m.health }); // refresh: shield gone
    return 0;
  }
  m.health -= amount;
  emit({ type: 'minion_damaged', minionId: m.id, amount, healthAfter: m.health });
  if (poisonous) m.health = 0; // 독성: any damage is lethal
  return amount;
}

function healHeroBy(hero: PlayerState, amount: number, emit: (e: GameEvent) => void): void {
  if (amount <= 0 || !hero.alive) return;
  const before = hero.hp;
  hero.hp = Math.min(hero.maxHp, hero.hp + amount);
  if (hero.hp !== before) emit({ type: 'healed', targetId: hero.id, amount: hero.hp - before, targetHpAfter: hero.hp });
}

function healMinionBy(m: MinionInstance, amount: number, emit: (e: GameEvent) => void): void {
  if (amount <= 0) return;
  const before = m.health;
  m.health = Math.min(m.maxHealth, m.health + amount);
  if (m.health !== before) emit({ type: 'minion_buffed', minionId: m.id, attack: m.attack, health: m.health });
}

/** Remove a dead minion from its field, announce it, then fire its 죽음의 메아리 (deathrattle) with the
 *  owner as source. Guarded by presence on the field so a doubly-resolved death can't rattle twice. */
function killMinion(state: GameState, owner: PlayerState, m: MinionInstance, emit: (e: GameEvent) => void, nextCardId: () => string): void {
  const idx = owner.field.findIndex((x) => x.id === m.id);
  if (idx < 0) return;
  owner.field.splice(idx, 1);
  emit({ type: 'minion_died', minionId: m.id, playerId: owner.id });
  if (m.deathrattle.length) {
    emit({ type: 'deathrattle_triggered', playerId: owner.id });
    const ctx: EffectCtx = {
      state, source: owner, chosenTargetId: undefined,
      element: 'none', randomOrder: livingOthers(state, owner.id), emit, nextCardId,
    };
    for (const e of m.deathrattle) effectHandlers[e.kind](e, ctx);
  }
}

/** Take a hero out of the game once and for all: flip them dead, shed their statuses, drop their
 *  whole board, announce it, then fire any armed hero deathrattle (legacy slot; unused by the current
 *  set). The single place a hero is eliminated. Guarded so a chained kill never re-triggers a corpse. */
export function eliminate(state: GameState, victim: PlayerState, emit: (e: GameEvent) => void, nextCardId: () => string): void {
  if (!victim.alive) return;
  victim.alive = false;
  const rattle = victim.deathrattle;
  victim.statuses = [];
  victim.deathrattle = [];
  victim.field = []; // a fallen hero's minions leave the board
  emit({ type: 'player_eliminated', playerId: victim.id });
  if (rattle.length) {
    emit({ type: 'deathrattle_triggered', playerId: victim.id });
    const ctx: EffectCtx = {
      state, source: victim, chosenTargetId: undefined,
      element: 'none', randomOrder: livingOthers(state, victim.id), emit, nextCardId,
    };
    for (const e of rattle) effectHandlers[e.kind](e, ctx);
  }
}

/** Settle every pending death after a damage exchange: minions at ≤0 health die (which may deathrattle
 *  into more damage/summons), heroes at 0 HP are eliminated. Loops until the board is stable. */
export function resolveDeaths(state: GameState, emit: (e: GameEvent) => void, nextCardId: () => string): void {
  let changed = true;
  let guard = 0;
  while (changed && guard++ < 64) {
    changed = false;
    for (const p of state.players) {
      for (const m of [...p.field]) {
        if (m.health <= 0) { killMinion(state, p, m, emit, nextCardId); changed = true; }
      }
    }
    for (const p of state.players) {
      if (p.alive && p.hp <= 0) { eliminate(state, p, emit, nextCardId); changed = true; }
    }
  }
}

/** One minion swings at an enemy hero or minion. Hero hits don't retaliate (heroes have no attack);
 *  minion trades are simultaneous. Applies lifesteal, poisonous, divine-shield, then resolves deaths. */
export function resolveAttack(state: GameState, attacker: MinionInstance, targetId: string, emit: (e: GameEvent) => void, nextCardId: () => string): void {
  const owner = state.players.find((p) => p.id === attacker.ownerId);
  if (!owner) return;
  const ent = findEntity(state, targetId);
  if (!ent) return;
  const element = CARD_DEFS[attacker.defId]?.element ?? 'physical';
  emit({ type: 'minion_attacked', attackerId: attacker.id, targetId });
  attacker.attacksLeft -= 1;

  if (ent.kind === 'hero') {
    const dealt = damageHero(ent.hero, attacker.attack, element, owner.id, emit);
    if (attacker.lifesteal) healHeroBy(owner, dealt, emit);
  } else {
    const defender = ent.minion;
    const dealt = damageMinion(defender, attacker.attack, attacker.poisonous, emit);        // attacker → defender
    damageMinion(attacker, defender.attack, defender.poisonous, emit);                        // defender → attacker (retaliation)
    if (attacker.lifesteal) healHeroBy(owner, dealt, emit);
  }
  resolveDeaths(state, emit, nextCardId);
}

export const effectHandlers: Record<Effect['kind'], (effect: any, ctx: EffectCtx) => void> = {
  damage: (effect: Extract<Effect, { kind: 'damage' }>, ctx) => {
    const { state, emit, element } = ctx;
    const src = ctx.source.id;
    const hitHero = (h: PlayerState) => damageHero(h, effect.amount, element, src, emit);
    const hitMinion = (m: MinionInstance) => damageMinion(m, effect.amount, false, emit);
    switch (effect.target) {
      case 'chosen': {
        const ent = findEntity(state, ctx.chosenTargetId);
        if (ent?.kind === 'hero') hitHero(ent.hero);
        else if (ent?.kind === 'minion') hitMinion(ent.minion);
        break;
      }
      case 'allEnemies':
        for (const p of livingOthers(state, src)) hitHero(p);
        break;
      case 'allEnemyMinions':
        for (const p of state.players) if (p.id !== src) for (const m of [...p.field]) hitMinion(m);
        break;
      case 'allMinions':
        for (const p of state.players) for (const m of [...p.field]) hitMinion(m);
        break;
      case 'randomEnemy': {
        const t = ctx.randomOrder[0];
        if (t) hitHero(t);
        break;
      }
    }
    resolveDeaths(state, emit, ctx.nextCardId);
  },
  heal: (effect: Extract<Effect, { kind: 'heal' }>, ctx) => {
    switch (effect.target) {
      case 'hero':
        healHeroBy(ctx.source, effect.amount, ctx.emit);
        break;
      case 'chosen': {
        const ent = findEntity(ctx.state, ctx.chosenTargetId);
        if (ent?.kind === 'hero') healHeroBy(ent.hero, effect.amount, ctx.emit);
        else if (ent?.kind === 'minion') healMinionBy(ent.minion, effect.amount, ctx.emit);
        break;
      }
      case 'allFriendly':
        healHeroBy(ctx.source, effect.amount, ctx.emit);
        for (const m of ctx.source.field) healMinionBy(m, effect.amount, ctx.emit);
        break;
    }
  },
  buff: (effect: Extract<Effect, { kind: 'buff' }>, ctx) => {
    const apply = (m: MinionInstance) => {
      m.attack += effect.attack;
      m.maxHealth += effect.health;
      m.health += effect.health;
      ctx.emit({ type: 'minion_buffed', minionId: m.id, attack: m.attack, health: m.health });
    };
    switch (effect.target) {
      case 'chosen': {
        const ent = findEntity(ctx.state, ctx.chosenTargetId);
        if (ent?.kind === 'minion') apply(ent.minion);
        break;
      }
      case 'allFriendlyMinions':
        for (const m of ctx.source.field) apply(m);
        break;
      case 'randomFriendlyMinion': {
        if (ctx.source.field.length === 0) break;
        const pick = weightedPick(ctx.state.rngSeed, ctx.source.field, () => 1);
        ctx.state.rngSeed = pick.seed;
        apply(pick.item);
        break;
      }
    }
  },
  summon: (effect: Extract<Effect, { kind: 'summon' }>, ctx) => {
    for (let i = 0; i < effect.count; i++) summonMinion(ctx.state, ctx.source, effect.token, ctx.emit);
  },
  draw: (effect: Extract<Effect, { kind: 'draw' }>, ctx) => {
    for (let i = 0; i < effect.amount; i++) drawForPlayer(ctx.state, ctx.source, ctx.nextCardId, ctx.emit);
  },
  gainMana: (effect: Extract<Effect, { kind: 'gainMana' }>, ctx) => {
    ctx.source.mana = Math.min(ctx.state.rules.manaMax, ctx.source.mana + effect.amount);
    ctx.emit({ type: 'mana_gained', playerId: ctx.source.id, amount: effect.amount, manaAfter: ctx.source.mana });
  },
  shield: (effect: Extract<Effect, { kind: 'shield' }>, ctx) => {
    ctx.source.defense += effect.amount;
    ctx.emit({ type: 'shielded', targetId: ctx.source.id, amount: effect.amount, defenseAfter: ctx.source.defense });
  },
  destroy: (_effect: Extract<Effect, { kind: 'destroy' }>, ctx) => {
    const ent = findEntity(ctx.state, ctx.chosenTargetId);
    if (ent?.kind === 'minion') {
      ent.minion.health = 0;
      resolveDeaths(ctx.state, ctx.emit, ctx.nextCardId);
    }
  },
};

/** Draw one weighted card into a player's hand (mutates state, advances seed). Mirrors loop.ts's
 *  drawCard so draw effects don't force a circular import with the turn loop. */
function drawForPlayer(state: GameState, player: PlayerState, nextCardId: () => string, emit: (e: GameEvent) => void): void {
  if (player.hand.length >= state.rules.handCap) return;
  const pool = state.rules.cardPool
    ? ALL_DEFS.filter((d) => state.rules.cardPool!.includes(d.id))
    : ALL_DEFS;
  const src = pool.length ? pool : ALL_DEFS;
  const pick = weightedPick(state.rngSeed, src, (d) => d.drawWeight);
  state.rngSeed = pick.seed;
  const inst = { id: nextCardId(), defId: pick.item.id };
  player.hand.push(inst);
  emit({ type: 'card_drawn', playerId: player.id, cardInstanceId: inst.id, defId: inst.defId });
}
