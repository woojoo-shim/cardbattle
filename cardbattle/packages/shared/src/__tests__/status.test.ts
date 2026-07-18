import { describe, it, expect } from 'vitest';
import { reduce } from '../engine/reducer.js';
import { endTurn } from '../engine/loop.js';
import { DEFAULT_RULES } from '../modes.js';
import type { GameState, PlayerState, ReduceCtx, Status } from '../types.js';

function player(id: string, seat: number, over: Partial<PlayerState> = {}): PlayerState {
  return { id, name: id, avatar: 'hero', connected: true, seat, hp: 40, maxHp: 40, defense: 0, hand: [], equipment: [], statuses: [], buffs: [], alive: true, skipTurns: 0, gamble: false, empower: 1, mana: 20, ...over };
}
function game(over: Partial<GameState> = {}): GameState {
  return { phase: 'playing', mode: 'standard', rules: DEFAULT_RULES, players: [player('a', 0), player('b', 1)], turnOrder: ['a', 'b'], currentTurnIndex: 0, turnDir: 1, roundCount: 1, turnDeadline: 0, rngSeed: 1, log: [], winnerId: null, ...over };
}
const ctx: ReduceCtx = { nextCardId: () => 'c-x', now: 1000 };

describe('poison', () => {
  it('venomdart deals upfront damage and applies a poison status', () => {
    const s = game();
    s.players[0].hand = [{ id: 'c1', defId: 'venomdart' }];
    const { state, events } = reduce(s, { type: 'play_card', cardInstanceId: 'c1', targetId: 'b' }, ctx);
    expect(state.players[1].hp).toBe(36); // 4 upfront
    expect(state.players[1].statuses).toContainEqual({ kind: 'poison', amount: 3, turns: 3, sourceId: 'a' });
    expect(events).toContainEqual(expect.objectContaining({ type: 'status_applied', targetId: 'b', status: 'poison', amount: 3, turns: 3 }));
  });

  it('poison bites at the victim\'s turn start, bypassing shield', () => {
    const s = game();
    s.players[1].defense = 20;
    s.players[1].statuses = [{ kind: 'poison', amount: 5, turns: 3, sourceId: 'a' }];
    const r = endTurn(s, ctx); // a -> b: b's turn starts, poison ticks
    expect(r.state.players[1].hp).toBe(35);     // 5 damage ignored the 20 shield
    expect(r.state.players[1].defense).toBe(20); // shield untouched
    expect(r.state.players[1].statuses[0].turns).toBe(2); // one turn consumed
    expect(r.events).toContainEqual(expect.objectContaining({ type: 'damage_dealt', sourceId: 'a', targetId: 'b', element: 'poison', amount: 5 }));
  });

  it('poison expires after its final tick', () => {
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

  it('plaguemist poisons every other player', () => {
    const s = game({ players: [player('a', 0), player('b', 1), player('c', 2)], turnOrder: ['a', 'b', 'c'] });
    s.players[0].hand = [{ id: 'c1', defId: 'plaguemist' }];
    const { state } = reduce(s, { type: 'play_card', cardInstanceId: 'c1' }, ctx);
    expect(state.players[0].statuses).toHaveLength(0);
    expect(state.players[1].statuses).toContainEqual(expect.objectContaining({ kind: 'poison', amount: 3 }));
    expect(state.players[2].statuses).toContainEqual(expect.objectContaining({ kind: 'poison', amount: 3 }));
  });

  it('re-applying poison stacks the per-tick amount and refreshes duration', () => {
    const s = game();
    s.players[1].statuses = [{ kind: 'poison', amount: 3, turns: 1, sourceId: 'a' }];
    s.players[0].hand = [{ id: 'c1', defId: 'venomdart' }];
    const { state } = reduce(s, { type: 'play_card', cardInstanceId: 'c1', targetId: 'b' }, ctx);
    const pois = state.players[1].statuses.find((st) => st.kind === 'poison') as Extract<Status, { kind: 'poison' }>;
    expect(pois.amount).toBe(6);  // 3 + 3
    expect(pois.turns).toBe(3);   // max(1, 3)
  });
});

describe('regen', () => {
  it('mends the caster at the start of their own turn, capped at maxHp', () => {
    const s = game();
    s.players[0].hp = 20;
    s.players[0].hand = [{ id: 'c1', defId: 'regenward' }];
    const r0 = reduce(s, { type: 'play_card', cardInstanceId: 'c1' }, ctx);
    expect(r0.state.players[0].statuses).toContainEqual({ kind: 'regen', amount: 5, turns: 3 });
    // a -> b -> a: on a's next turn the regen ticks
    const afterB = endTurn(r0.state, ctx);
    const afterA = endTurn(afterB.state, ctx);
    expect(afterA.state.players[0].hp).toBe(25); // +5
    expect(afterA.events).toContainEqual(expect.objectContaining({ type: 'healed', targetId: 'a', amount: 5 }));
  });
});

describe('reflect', () => {
  it('bounces a share of incoming HP damage back at the attacker', () => {
    const s = game({ currentTurnIndex: 1 }); // b's turn
    s.players[0].statuses = [{ kind: 'reflect', pct: 0.5, turns: 2 }];
    s.players[1].hand = [{ id: 'c1', defId: 'sword' }]; // 10 dmg
    const { state } = reduce(s, { type: 'play_card', cardInstanceId: 'c1', targetId: 'a' }, ctx);
    expect(state.players[0].hp).toBe(30); // took the full 10
    expect(state.players[1].hp).toBe(35); // 5 reflected back (no re-reflect)
  });

  it('pierce ignores a reflector entirely', () => {
    const s = game({ currentTurnIndex: 1 });
    s.players[0].statuses = [{ kind: 'reflect', pct: 0.5, turns: 2 }];
    s.players[1].hand = [{ id: 'c1', defId: 'execute' }]; // 18 pierce
    const { state } = reduce(s, { type: 'play_card', cardInstanceId: 'c1', targetId: 'a' }, ctx);
    expect(state.players[0].hp).toBe(22); // 40 - 18
    expect(state.players[1].hp).toBe(40); // no bounce
  });

  it('only reflects damage that actually reaches HP (shield-absorbed hits do not bounce)', () => {
    const s = game({ currentTurnIndex: 1 });
    s.players[0].defense = 10;
    s.players[0].statuses = [{ kind: 'reflect', pct: 0.5, turns: 2 }];
    s.players[1].hand = [{ id: 'c1', defId: 'sword' }]; // 10 dmg fully absorbed
    const { state } = reduce(s, { type: 'play_card', cardInstanceId: 'c1', targetId: 'a' }, ctx);
    expect(state.players[0].hp).toBe(40); // shield ate it all
    expect(state.players[1].hp).toBe(40); // nothing to reflect
  });
});
