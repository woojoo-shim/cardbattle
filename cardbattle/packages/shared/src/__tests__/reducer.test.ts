import { describe, it, expect } from 'vitest';
import { reduce } from '../engine/reducer.js';
import type { GameState, PlayerState, ReduceCtx } from '../types.js';

function player(id: string, seat: number, over: Partial<PlayerState> = {}): PlayerState {
  return { id, name: id, connected: true, seat, hp: 40, maxHp: 40, defense: 0, hand: [], equipment: [], statuses: [], buffs: [], alive: true, ...over };
}
function game(over: Partial<GameState> = {}): GameState {
  return { phase: 'playing', players: [player('a', 0), player('b', 1)], turnOrder: ['a', 'b'], currentTurnIndex: 0, turnDeadline: 0, rngSeed: 1, log: [], winnerId: null, ...over };
}
const ctx: ReduceCtx = { nextCardId: () => 'c-x', now: 1000 };

describe('reduce: play_card', () => {
  it('deals damage to a chosen target', () => {
    const s = game();
    s.players[0].hand = [{ id: 'c1', defId: 'sword' }];
    const { state, events } = reduce(s, { type: 'play_card', cardInstanceId: 'c1', targetId: 'b' }, ctx);
    expect(state.players[1].hp).toBe(30);
    expect(state.players[0].hand).toHaveLength(0); // card consumed
    expect(events).toContainEqual(expect.objectContaining({ type: 'damage_dealt', targetId: 'b', amount: 10 }));
  });

  it('does not mutate the input state (purity)', () => {
    const s = game();
    s.players[0].hand = [{ id: 'c1', defId: 'sword' }];
    reduce(s, { type: 'play_card', cardInstanceId: 'c1', targetId: 'b' }, ctx);
    expect(s.players[1].hp).toBe(40); // original untouched
  });

  it('heals self capped at maxHp', () => {
    const s = game();
    s.players[0].hp = 35;
    s.players[0].hand = [{ id: 'c1', defId: 'potion' }];
    const { state } = reduce(s, { type: 'play_card', cardInstanceId: 'c1' }, ctx);
    expect(state.players[0].hp).toBe(40); // 35+12 capped
  });

  it('eliminates a player at 0 hp', () => {
    const s = game();
    s.players[1].hp = 8;
    s.players[0].hand = [{ id: 'c1', defId: 'sword' }];
    const { state, events } = reduce(s, { type: 'play_card', cardInstanceId: 'c1', targetId: 'b' }, ctx);
    expect(state.players[1].alive).toBe(false);
    expect(events).toContainEqual({ type: 'player_eliminated', playerId: 'b' });
  });

  it('bomb hits all others but not self', () => {
    const s = game({ players: [player('a', 0), player('b', 1), player('c', 2)] });
    s.turnOrder = ['a', 'b', 'c'];
    s.players[0].hand = [{ id: 'c1', defId: 'bomb' }];
    const { state } = reduce(s, { type: 'play_card', cardInstanceId: 'c1' }, ctx);
    expect(state.players[0].hp).toBe(40);
    expect(state.players[1].hp).toBe(28);
    expect(state.players[2].hp).toBe(28);
  });

  it('rejects playing when it is not your turn', () => {
    const s = game();
    s.players[1].hand = [{ id: 'c9', defId: 'sword' }];
    const { state, events } = reduce(s, { type: 'play_card', cardInstanceId: 'c9', targetId: 'a' }, ctx);
    expect(state).toEqual(s);       // unchanged
    expect(events).toHaveLength(0);
  });

  it('rejects a card not in hand', () => {
    const s = game();
    const { state, events } = reduce(s, { type: 'play_card', cardInstanceId: 'nope', targetId: 'b' }, ctx);
    expect(events).toHaveLength(0);
    expect(state).toEqual(s);
  });

  it('rejects a dead/invalid chosen target', () => {
    const s = game();
    s.players[1].alive = false;
    s.players[0].hand = [{ id: 'c1', defId: 'sword' }];
    const { events } = reduce(s, { type: 'play_card', cardInstanceId: 'c1', targetId: 'b' }, ctx);
    expect(events).toHaveLength(0);
  });
});
