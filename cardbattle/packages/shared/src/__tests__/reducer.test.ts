import { describe, it, expect } from 'vitest';
import { reduce } from '../engine/reducer.js';
import { DEFAULT_RULES } from '../modes.js';
import type { GameState, PlayerState, MinionInstance, ReduceCtx } from '../types.js';

function player(id: string, seat: number, over: Partial<PlayerState> = {}): PlayerState {
  return { id, name: id, avatar: 'hero', connected: true, seat, hp: 40, maxHp: 40, defense: 0, hand: [], field: [], statuses: [], deathrattle: [], alive: true, skipTurns: 0, mana: 20, heroPowerUsed: false, deck: [], ...over };
}
function game(over: Partial<GameState> = {}): GameState {
  return { phase: 'playing', mode: 'standard', rules: DEFAULT_RULES, players: [player('a', 0), player('b', 1)], turnOrder: ['a', 'b'], currentTurnIndex: 0, turnDir: 1, roundCount: 1, turnDeadline: 0, rngSeed: 1, nextMinionId: 0, log: [], winnerId: null, ...over };
}
function minion(id: string, ownerId: string, over: Partial<MinionInstance> = {}): MinionInstance {
  return { id, defId: 'knight', ownerId, attack: 3, health: 3, maxHealth: 3, summonedThisTurn: false, attacksLeft: 1, taunt: false, charge: false, divineShield: false, poisonous: false, lifesteal: false, deathrattle: [], ...over };
}
let n = 0;
const ctx: ReduceCtx = { nextCardId: () => `c-${n++}`, now: 1000 };

describe('reduce: play_card (spells)', () => {
  it('strike deals 3 damage to a chosen hero and consumes the card + mana', () => {
    const s = game();
    s.players[0].hand = [{ id: 'c1', defId: 'strike' }];
    const { state, events } = reduce(s, { type: 'play_card', cardInstanceId: 'c1', targetId: 'b' }, ctx);
    expect(state.players[1].hp).toBe(37);
    expect(state.players[0].hand).toHaveLength(0);
    expect(state.players[0].mana).toBe(19); // 20 - cost 1
    expect(events).toContainEqual(expect.objectContaining({ type: 'damage_dealt', targetId: 'b', amount: 3 }));
  });

  it('does not mutate the input state (purity)', () => {
    const s = game();
    s.players[0].hand = [{ id: 'c1', defId: 'strike' }];
    reduce(s, { type: 'play_card', cardInstanceId: 'c1', targetId: 'b' }, ctx);
    expect(s.players[1].hp).toBe(40);
    expect(s.players[0].hand).toHaveLength(1);
  });

  it('holylight heals a chosen hero and can overheal past maxHp', () => {
    const s = game();
    s.players[0].hp = 36;
    s.players[0].hand = [{ id: 'c1', defId: 'holylight' }]; // heal 6
    const { state } = reduce(s, { type: 'play_card', cardInstanceId: 'c1', targetId: 'a' }, ctx);
    expect(state.players[0].hp).toBe(42); // 36 + 6, overheals past the 40 max
  });

  it('eliminates a hero brought to 0 hp', () => {
    const s = game();
    s.players[1].hp = 3;
    s.players[0].hand = [{ id: 'c1', defId: 'strike' }]; // 3 dmg
    const { state, events } = reduce(s, { type: 'play_card', cardInstanceId: 'c1', targetId: 'b' }, ctx);
    expect(state.players[1].alive).toBe(false);
    expect(events).toContainEqual({ type: 'player_eliminated', playerId: 'b' });
  });

  it('frostshock hits all enemy heroes but not self', () => {
    const s = game({ players: [player('a', 0), player('b', 1), player('c', 2)], turnOrder: ['a', 'b', 'c'] });
    s.players[0].hand = [{ id: 'c1', defId: 'frostshock' }]; // 3 dmg allEnemies
    const { state } = reduce(s, { type: 'play_card', cardInstanceId: 'c1' }, ctx);
    expect(state.players[0].hp).toBe(40);
    expect(state.players[1].hp).toBe(37);
    expect(state.players[2].hp).toBe(37);
  });

  it('shield (defense) is consumed by incoming damage', () => {
    const s = game();
    s.players[1].defense = 2;
    s.players[0].hand = [{ id: 'c1', defId: 'firebolt' }]; // 4 dmg
    const { state } = reduce(s, { type: 'play_card', cardInstanceId: 'c1', targetId: 'b' }, ctx);
    expect(state.players[1].defense).toBe(0); // 2 absorbed
    expect(state.players[1].hp).toBe(38);     // 4 - 2 through
  });

  it('assassin destroys a chosen enemy minion on summon', () => {
    const s = game();
    s.players[1].field = [minion('m1', 'b', { health: 8, maxHealth: 8 })];
    s.players[0].hand = [{ id: 'c1', defId: 'assassin' }];
    const { state, events } = reduce(s, { type: 'play_card', cardInstanceId: 'c1', targetId: 'm1' }, ctx);
    expect(state.players[1].field).toHaveLength(0);
    expect(state.players[0].field).toHaveLength(1); // the assassin itself is summoned
    expect(state.players[0].field[0].defId).toBe('assassin');
    expect(events).toContainEqual(expect.objectContaining({ type: 'minion_died', minionId: 'm1' }));
  });

  it('manasurge nets +1 mana (cost 1, grants 2)', () => {
    const s = game();
    s.players[0].mana = 5;
    s.players[0].hand = [{ id: 'c1', defId: 'manasurge' }];
    const { state, events } = reduce(s, { type: 'play_card', cardInstanceId: 'c1' }, ctx);
    expect(state.players[0].mana).toBe(6); // 5 - 1 + 2
    expect(events).toContainEqual(expect.objectContaining({ type: 'mana_gained', playerId: 'a', manaAfter: 6 }));
  });

  it('spends mana equal to the card cost', () => {
    const s = game();
    s.players[0].mana = 5;
    s.players[0].hand = [{ id: 'c1', defId: 'firebolt' }]; // cost 2
    const { state } = reduce(s, { type: 'play_card', cardInstanceId: 'c1', targetId: 'b' }, ctx);
    expect(state.players[0].mana).toBe(3);
  });

  it('rejects a card the actor cannot afford', () => {
    const s = game();
    s.players[0].mana = 1;
    s.players[0].hand = [{ id: 'c1', defId: 'firebolt' }]; // cost 2 > 1
    const { state, events } = reduce(s, { type: 'play_card', cardInstanceId: 'c1', targetId: 'b' }, ctx);
    expect(events).toHaveLength(0);
    expect(state).toEqual(s);
  });

  it('rejects playing when it is not your turn', () => {
    const s = game();
    s.players[1].hand = [{ id: 'c9', defId: 'strike' }];
    const { state, events } = reduce(s, { type: 'play_card', cardInstanceId: 'c9', targetId: 'a' }, ctx);
    expect(state).toEqual(s);
    expect(events).toHaveLength(0);
  });

  it('rejects a card not in hand', () => {
    const s = game();
    const { state, events } = reduce(s, { type: 'play_card', cardInstanceId: 'nope', targetId: 'b' }, ctx);
    expect(events).toHaveLength(0);
    expect(state).toEqual(s);
  });

  it('rejects a dead chosen target', () => {
    const s = game();
    s.players[1].alive = false;
    s.players[0].hand = [{ id: 'c1', defId: 'strike' }];
    const { events } = reduce(s, { type: 'play_card', cardInstanceId: 'c1', targetId: 'b' }, ctx);
    expect(events).toHaveLength(0);
  });
});

describe('reduce: play_card (minions)', () => {
  it('summons a minion onto the field', () => {
    const s = game();
    s.players[0].hand = [{ id: 'c1', defId: 'knight' }]; // 4/3
    const { state, events } = reduce(s, { type: 'play_card', cardInstanceId: 'c1' }, ctx);
    expect(state.players[0].field).toHaveLength(1);
    expect(state.players[0].field[0].attack).toBe(4);
    expect(state.players[0].field[0].health).toBe(3);
    expect(events).toContainEqual(expect.objectContaining({ type: 'minion_summoned', playerId: 'a', defId: 'knight' }));
  });

  it('a fresh minion has summoning sickness (no charge → no attack this turn)', () => {
    const s = game();
    s.players[0].hand = [{ id: 'c1', defId: 'knight' }];
    const { state } = reduce(s, { type: 'play_card', cardInstanceId: 'c1' }, ctx);
    expect(state.players[0].field[0].summonedThisTurn).toBe(true);
    expect(state.players[0].field[0].attacksLeft).toBe(0);
  });

  it('a charge minion can swing the turn it lands', () => {
    const s = game();
    s.players[0].hand = [{ id: 'c1', defId: 'wolf' }]; // 3/2 charge
    const { state } = reduce(s, { type: 'play_card', cardInstanceId: 'c1' }, ctx);
    expect(state.players[0].field[0].charge).toBe(true);
    expect(state.players[0].field[0].attacksLeft).toBe(1);
  });

  it('rejects a minion when the field is full', () => {
    const s = game();
    s.players[0].field = Array.from({ length: DEFAULT_RULES.fieldCap }, (_, i) => minion(`f${i}`, 'a'));
    s.players[0].hand = [{ id: 'c1', defId: 'knight' }];
    const { state, events } = reduce(s, { type: 'play_card', cardInstanceId: 'c1' }, ctx);
    expect(events).toHaveLength(0);
    expect(state).toEqual(s);
  });
});

describe('reduce: attack', () => {
  it('a minion swings at the enemy hero (no retaliation)', () => {
    const s = game();
    s.players[0].field = [minion('m1', 'a', { attack: 3, attacksLeft: 1 })];
    const { state, events } = reduce(s, { type: 'attack', attackerId: 'm1', targetId: 'b' }, ctx);
    expect(state.players[1].hp).toBe(37);
    expect(state.players[0].field[0].health).toBe(3); // hero can't hit back
    expect(state.players[0].field[0].attacksLeft).toBe(0);
    expect(events).toContainEqual(expect.objectContaining({ type: 'minion_attacked', attackerId: 'm1', targetId: 'b' }));
  });

  it('minion trades are simultaneous', () => {
    const s = game();
    s.players[0].field = [minion('m1', 'a', { attack: 3, health: 3, attacksLeft: 1 })];
    s.players[1].field = [minion('m2', 'b', { attack: 2, health: 4 })];
    const { state } = reduce(s, { type: 'attack', attackerId: 'm1', targetId: 'm2' }, ctx);
    expect(state.players[1].field[0].health).toBe(1); // 4 - 3
    expect(state.players[0].field[0].health).toBe(1); // 3 - 2 retaliation
  });

  it('rejects hitting an enemy hero while a taunt minion guards it', () => {
    const s = game();
    s.players[0].field = [minion('m1', 'a', { attack: 3, attacksLeft: 1 })];
    s.players[1].field = [minion('t1', 'b', { taunt: true })];
    const { state, events } = reduce(s, { type: 'attack', attackerId: 'm1', targetId: 'b' }, ctx);
    expect(events).toHaveLength(0);
    expect(state).toEqual(s);
  });

  it('rejects attacking with a minion that has no attacks left', () => {
    const s = game();
    s.players[0].field = [minion('m1', 'a', { attacksLeft: 0 })];
    const { events } = reduce(s, { type: 'attack', attackerId: 'm1', targetId: 'b' }, ctx);
    expect(events).toHaveLength(0);
  });

  it('rejects friendly fire', () => {
    const s = game();
    s.players[0].field = [minion('m1', 'a', { attacksLeft: 1 }), minion('m2', 'a')];
    const { events } = reduce(s, { type: 'attack', attackerId: 'm1', targetId: 'm2' }, ctx);
    expect(events).toHaveLength(0);
  });
});
