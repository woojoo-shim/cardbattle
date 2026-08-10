import { describe, it, expect } from 'vitest';
import { reduce } from '../engine/reducer.js';
import { endTurn } from '../engine/loop.js';
import { DEFAULT_RULES } from '../modes.js';
import type { GameState, PlayerState, ReduceCtx } from '../types.js';

function player(id: string, seat: number, over: Partial<PlayerState> = {}): PlayerState {
  return { id, name: id, avatar: 'hero', connected: true, seat, hp: 40, maxHp: 40, defense: 0, hand: [], field: [], buildings: [], statuses: [], deathrattle: [], alive: true, skipTurns: 0, mana: 20, heroPowerUsed: false, deck: [], ...over };
}
function game(over: Partial<GameState> = {}): GameState {
  return { phase: 'playing', mode: 'standard', rules: DEFAULT_RULES, players: [player('a', 0), player('b', 1)], turnOrder: ['a', 'b'], currentTurnIndex: 0, turnDir: 1, roundCount: 1, turnDeadline: 0, rngSeed: 1, nextMinionId: 0, log: [], winnerId: null, ...over };
}
let n = 0;
const ctx: ReduceCtx = { nextCardId: () => `c-${n++}`, now: 1000 };

/** End the current player's turn and bring the token all the way back to 'a', so 'a' has taken
 *  one more turn-start (where their buildings tick). Returns the resulting state. */
function fullRound(s: GameState): GameState {
  const afterA = endTurn(s, ctx).state;     // a -> b
  return endTurn(afterA, ctx).state;        // b -> a (a's turn start ticks a's buildings)
}

describe('buildings', () => {
  it('placing a building starts construction and fires NO effect on placement', () => {
    const s = game();
    s.players[0].mana = 5;
    s.players[0].hand = [{ id: 'c1', defId: 'goldmine' }]; // cost 2, buildTurns 2, +1 mana when active
    const { state, events } = reduce(s, { type: 'play_card', cardInstanceId: 'c1' }, ctx);
    expect(state.players[0].buildings).toHaveLength(1);
    expect(state.players[0].buildings[0].turnsLeft).toBe(2);
    expect(state.players[0].hand).toHaveLength(0);
    expect(state.players[0].mana).toBe(3); // 5 - cost 2, effect did NOT run
    expect(events).toContainEqual(expect.objectContaining({ type: 'building_placed', defId: 'goldmine', turnsLeft: 2 }));
    expect(events.some((e) => e.type === 'building_completed')).toBe(false);
  });

  it('goldmine completes after its build turns then grants mana every owner turn start', () => {
    let s = game();
    s.players[0].mana = 2;
    s.players[0].hand = [{ id: 'c1', defId: 'goldmine' }];
    s = reduce(s, { type: 'play_card', cardInstanceId: 'c1' }, ctx).state;
    // turnsLeft 2 -> after one full round it decrements to 1 (still building)
    s = fullRound(s);
    expect(s.players[0].buildings[0].turnsLeft).toBe(1);
    // next round it completes (turnsLeft 0) AND fires — mana bumps by 1 beyond the turn's regen.
    const before = s.players[0].mana;
    s = fullRound(s);
    expect(s.players[0].buildings[0].turnsLeft).toBe(0);
    expect(s.players[0].mana).toBeGreaterThan(before);
  });

  it('flametower damages a random enemy each turn once active (and can win)', () => {
    let s = game();
    s.players[1].hp = 2; // one 3-damage tick finishes b
    s.players[0].mana = 3;
    // seed it already-active so the very next owner turn start triggers it.
    s.players[0].buildings = [{ id: 'b0', defId: 'flametower', ownerId: 'a', turnsLeft: 0 }];
    s = fullRound(s);
    expect(s.players[1].hp).toBeLessThanOrEqual(0);
    expect(s.phase).toBe('ended');
    expect(s.winnerId).toBe('a');
  });
});
