import { describe, it, expect } from 'vitest';
import { endTurn } from '../engine/loop.js';
import { DEFAULT_RULES } from '../modes.js';
import type { GameState, PlayerState, ReduceCtx } from '../types.js';

// Legacy status ticks (poison/regen) still run in the turn loop even though no current card applies
// them — they are injected directly here to exercise the tick path.
function player(id: string, seat: number, over: Partial<PlayerState> = {}): PlayerState {
  return { id, name: id, avatar: 'hero', connected: true, seat, hp: 40, maxHp: 40, defense: 0, hand: [], field: [], buildings: [], statuses: [], deathrattle: [], alive: true, skipTurns: 0, mana: 20, heroPowerUsed: false, deck: [], ...over };
}
function game(over: Partial<GameState> = {}): GameState {
  return { phase: 'playing', mode: 'standard', rules: DEFAULT_RULES, players: [player('a', 0), player('b', 1)], turnOrder: ['a', 'b'], currentTurnIndex: 0, turnDir: 1, roundCount: 1, turnDeadline: 0, rngSeed: 1, nextMinionId: 0, log: [], winnerId: null, ...over };
}
const ctx: ReduceCtx = { nextCardId: () => 'c-x', now: 1000 };

describe('poison', () => {
  it('bites at the victim\'s turn start, bypassing shield', () => {
    const s = game();
    s.players[1].defense = 20;
    s.players[1].statuses = [{ kind: 'poison', amount: 5, turns: 3, sourceId: 'a' }];
    const r = endTurn(s, ctx); // a -> b: b's turn starts, poison ticks
    expect(r.state.players[1].hp).toBe(35);      // 5 damage ignored the 20 shield
    expect(r.state.players[1].defense).toBe(20); // shield untouched
    expect(r.state.players[1].statuses[0].turns).toBe(2); // one turn consumed
    expect(r.events).toContainEqual(expect.objectContaining({ type: 'damage_dealt', sourceId: 'a', targetId: 'b', element: 'poison', amount: 5 }));
  });

  it('expires after its final tick', () => {
    const s = game();
    s.players[1].statuses = [{ kind: 'poison', amount: 3, turns: 1, sourceId: 'a' }];
    const r = endTurn(s, ctx);
    expect(r.state.players[1].hp).toBe(37);
    expect(r.state.players[1].statuses).toHaveLength(0);
  });

  it('a lethal poison tick eliminates the victim and the token advances past the corpse', () => {
    const s = game({ players: [player('a', 0), player('b', 1, { hp: 3, statuses: [{ kind: 'poison', amount: 5, turns: 2, sourceId: 'a' }] }), player('c', 2)], turnOrder: ['a', 'b', 'c'] });
    const r = endTurn(s, ctx); // a -> b: poison kills b -> advance to c
    expect(r.state.players[1].alive).toBe(false);
    expect(r.state.players[1].statuses).toHaveLength(0); // corpse cleared
    expect(r.state.turnOrder[r.state.currentTurnIndex]).toBe('c');
    expect(r.events).toContainEqual({ type: 'player_eliminated', playerId: 'b' });
  });
});

describe('regen', () => {
  it('mends the holder at the start of their own turn (overheals past maxHp)', () => {
    const s = game();
    s.players[0].hp = 20;
    s.players[0].statuses = [{ kind: 'regen', amount: 5, turns: 3 }];
    // a -> b -> a: on a's next turn the regen ticks
    const afterB = endTurn(s, ctx);
    const afterA = endTurn(afterB.state, ctx);
    expect(afterA.state.players[0].hp).toBe(25); // +5
    expect(afterA.events).toContainEqual(expect.objectContaining({ type: 'healed', targetId: 'a', amount: 5 }));
  });
});
