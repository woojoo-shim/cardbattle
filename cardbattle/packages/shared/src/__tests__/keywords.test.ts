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
const ctx: ReduceCtx = { nextCardId: () => `d-${n++}`, now: 1000 };

describe('battlecry (강림) fires on summon', () => {
  it('squire draws a card', () => {
    const s = game();
    s.players[0].hand = [{ id: 'c1', defId: 'squire' }];
    const { state, events } = reduce(s, { type: 'play_card', cardInstanceId: 'c1' }, ctx);
    expect(state.players[0].field).toHaveLength(1);
    expect(state.players[0].hand).toHaveLength(1); // squire consumed, 1 drawn
    expect(events).toContainEqual(expect.objectContaining({ type: 'battlecry_triggered', playerId: 'a', cond: 'squire' }));
  });

  it('archer deals 2 damage to a chosen enemy hero', () => {
    const s = game();
    s.players[0].hand = [{ id: 'c1', defId: 'archer' }];
    const { state, events } = reduce(s, { type: 'play_card', cardInstanceId: 'c1', targetId: 'b' }, ctx);
    expect(state.players[1].hp).toBe(38);
    expect(events).toContainEqual(expect.objectContaining({ type: 'damage_dealt', targetId: 'b', amount: 2 }));
  });

  it('cleric heals its own hero', () => {
    const s = game();
    s.players[0].hp = 30;
    s.players[0].hand = [{ id: 'c1', defId: 'cleric' }]; // heal 4 hero
    const { state } = reduce(s, { type: 'play_card', cardInstanceId: 'c1' }, ctx);
    expect(state.players[0].hp).toBe(34);
  });

  it('warlord buffs all friendly minions (+1/+1), including itself', () => {
    const s = game();
    s.players[0].field = [minion('m1', 'a', { attack: 3, health: 3, maxHealth: 3 })];
    s.players[0].hand = [{ id: 'c1', defId: 'warlord' }]; // 5/5, +1/+1 allFriendlyMinions
    const { state } = reduce(s, { type: 'play_card', cardInstanceId: 'c1' }, ctx);
    const m1 = state.players[0].field.find((m) => m.id === 'm1')!;
    const wl = state.players[0].field.find((m) => m.defId === 'warlord')!;
    expect([m1.attack, m1.health]).toEqual([4, 4]);
    expect([wl.attack, wl.health]).toEqual([6, 6]);
  });
});

describe('deathrattle (유언) fires on minion death', () => {
  it('bomber deals 2 to all enemy heroes when it dies', () => {
    // b's turn; b assassinates a's bomber -> bomber deathrattle hits a's enemies (b)
    const s = game({ currentTurnIndex: 1 });
    s.players[0].field = [minion('m1', 'a', { defId: 'bomber', health: 2, deathrattle: [{ kind: 'damage', amount: 2, target: 'allEnemies' }] })];
    s.players[1].hand = [{ id: 'c1', defId: 'assassinate' }];
    const { state, events } = reduce(s, { type: 'play_card', cardInstanceId: 'c1', targetId: 'm1' }, ctx);
    expect(state.players[0].field).toHaveLength(0);
    expect(events).toContainEqual(expect.objectContaining({ type: 'deathrattle_triggered', playerId: 'a' }));
    expect(state.players[1].hp).toBe(38); // b took 2 from bomber's parting blow
  });

  it('necromancer summons 2 sprites when it dies', () => {
    const s = game({ currentTurnIndex: 1 });
    s.players[0].field = [minion('m1', 'a', { defId: 'necromancer', health: 4, deathrattle: [{ kind: 'summon', token: 'sprite', count: 2 }] })];
    s.players[1].hand = [{ id: 'c1', defId: 'assassinate' }];
    const { state } = reduce(s, { type: 'play_card', cardInstanceId: 'c1', targetId: 'm1' }, ctx);
    expect(state.players[0].field).toHaveLength(2); // necromancer died, 2 sprites summoned
    expect(state.players[0].field.every((m) => m.defId === 'sprite')).toBe(true);
  });
});

describe('board keywords', () => {
  it('divine shield negates the first hit and pops', () => {
    const s = game();
    s.players[0].field = [minion('m1', 'a', { attack: 3, attacksLeft: 1 })];
    s.players[1].field = [minion('m2', 'b', { attack: 2, health: 4, divineShield: true })];
    const { state } = reduce(s, { type: 'attack', attackerId: 'm1', targetId: 'm2' }, ctx);
    const m2 = state.players[1].field[0];
    expect(m2.health).toBe(4);          // damage negated
    expect(m2.divineShield).toBe(false); // shield popped
  });

  it('poisonous destroys any minion it damages', () => {
    const s = game();
    s.players[0].field = [minion('m1', 'a', { attack: 1, health: 5, poisonous: true, attacksLeft: 1 })];
    s.players[1].field = [minion('m2', 'b', { attack: 1, health: 8 })];
    const { state } = reduce(s, { type: 'attack', attackerId: 'm1', targetId: 'm2' }, ctx);
    expect(state.players[1].field).toHaveLength(0); // big minion destroyed by 1 poison damage
  });

  it('lifesteal heals the attacking hero for damage dealt', () => {
    const s = game();
    s.players[0].hp = 30;
    s.players[0].field = [minion('m1', 'a', { attack: 4, lifesteal: true, attacksLeft: 1 })];
    const { state } = reduce(s, { type: 'attack', attackerId: 'm1', targetId: 'b' }, ctx);
    expect(state.players[1].hp).toBe(36); // 40 - 4
    expect(state.players[0].hp).toBe(34); // 30 + 4 lifesteal
  });
});
