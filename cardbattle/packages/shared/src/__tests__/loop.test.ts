import { describe, it, expect } from 'vitest';
import { initGame, startGame, endTurn } from '../engine/loop.js';
import type { ReduceCtx } from '../types.js';
import { START_HAND, START_HP, TURN_SECONDS } from '../constants.js';

let counter = 0;
const ctx = (): ReduceCtx => ({ nextCardId: () => `c${counter++}`, now: 10000 });

describe('loop', () => {
  it('initGame seats players and sets lobby defaults', () => {
    const s = initGame([{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }]);
    expect(s.phase).toBe('lobby');
    expect(s.players.map((p) => p.seat)).toEqual([0, 1]);
    expect(s.players[0].hp).toBe(START_HP);
  });

  it('startGame deals opening hands and starts first turn', () => {
    counter = 0;
    const s = startGame(initGame([{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }]), ctx());
    expect(s.state.phase).toBe('playing');
    expect(s.state.players[0].hand).toHaveLength(START_HAND + 1); // opening + first-turn draw
    expect(s.state.players[1].hand).toHaveLength(START_HAND);
    expect(s.state.turnDeadline).toBe(10000 + TURN_SECONDS * 1000);
    expect(s.events.some((e) => e.type === 'turn_started' && e.playerId === 'a')).toBe(true);
  });

  it('endTurn advances to next living player and draws for them', () => {
    counter = 0;
    const started = startGame(initGame([{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }]), ctx());
    const r = endTurn(started.state, ctx());
    expect(r.state.currentTurnIndex).toBe(1);
    expect(r.events.some((e) => e.type === 'turn_ended' && e.playerId === 'a')).toBe(true);
    expect(r.events.some((e) => e.type === 'card_drawn' && e.playerId === 'b')).toBe(true);
  });

  it('endTurn skips dead players', () => {
    counter = 0;
    const started = startGame(initGame([{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }, { id: 'c', name: 'C' }]), ctx());
    started.state.players[1].alive = false; // b is dead
    const r = endTurn(started.state, ctx());
    expect(r.state.turnOrder[r.state.currentTurnIndex]).toBe('c');
  });
});
