import { describe, it, expect } from 'vitest';
import { reduce } from '../engine/reducer.js';
import { endTurn } from '../engine/loop.js';
import { DEFAULT_RULES } from '../modes.js';
import type { GameState, PlayerState, ReduceCtx } from '../types.js';

function player(id: string, seat: number, over: Partial<PlayerState> = {}): PlayerState {
  return { id, name: id, avatar: 'hero', connected: true, seat, hp: 40, maxHp: 40, defense: 0, hand: [], field: [], statuses: [], deathrattle: [], alive: true, skipTurns: 0, mana: 20, heroPowerUsed: false, ...over };
}
function game(over: Partial<GameState> = {}): GameState {
  return { phase: 'playing', mode: 'standard', rules: DEFAULT_RULES, players: [player('a', 0), player('b', 1)], turnOrder: ['a', 'b'], currentTurnIndex: 0, turnDir: 1, roundCount: 1, turnDeadline: 0, rngSeed: 1, nextMinionId: 0, log: [], winnerId: null, ...over };
}
const ctx: ReduceCtx = { nextCardId: () => 'c-x', now: 1000 };

describe('reduce: use_hero_power', () => {
  it('mage deals 3 damage to a chosen target and spends mana', () => {
    const s = game({ players: [player('a', 0, { avatar: 'mage' }), player('b', 1)] });
    const { state, events } = reduce(s, { type: 'use_hero_power', targetId: 'b' }, ctx);
    expect(state.players[1].hp).toBe(37);
    expect(state.players[0].mana).toBe(18); // 20 - cost 2
    expect(state.players[0].heroPowerUsed).toBe(true);
    expect(events).toContainEqual(expect.objectContaining({ type: 'hero_power_used', playerId: 'a', avatar: 'mage' }));
  });

  it('hero (default) shields self, no target needed', () => {
    const s = game();
    const { state } = reduce(s, { type: 'use_hero_power' }, ctx);
    expect(state.players[0].defense).toBe(6);
  });

  it('rejects a second use in the same turn', () => {
    const s = game({ players: [player('a', 0, { avatar: 'mage', heroPowerUsed: true })], turnOrder: ['a'] });
    const before = s;
    const { state, events } = reduce(s, { type: 'use_hero_power', targetId: 'a' }, ctx);
    expect(state).toBe(before);
    expect(events).toHaveLength(0);
  });

  it('rejects when unable to afford the cost', () => {
    const s = game({ players: [player('a', 0, { avatar: 'mage', mana: 1 }), player('b', 1)] });
    const before = s;
    const { state } = reduce(s, { type: 'use_hero_power', targetId: 'b' }, ctx);
    expect(state).toBe(before);
  });

  it('does not mutate the input (purity)', () => {
    const s = game({ players: [player('a', 0, { avatar: 'mage' }), player('b', 1)] });
    reduce(s, { type: 'use_hero_power', targetId: 'b' }, ctx);
    expect(s.players[1].hp).toBe(40);
    expect(s.players[0].heroPowerUsed).toBe(false);
  });

  it('refreshes heroPowerUsed when a turn begins', () => {
    // b starts already-used; when a ends their turn, beginTurn(b) must reset b's flag.
    const s = game({ players: [player('a', 0), player('b', 1, { heroPowerUsed: true })] });
    const { state } = endTurn(s, ctx);
    expect(state.players[1].heroPowerUsed).toBe(false);
  });
});
