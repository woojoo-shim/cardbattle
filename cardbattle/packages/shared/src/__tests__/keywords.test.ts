import { describe, it, expect } from 'vitest';
import { reduce } from '../engine/reducer.js';
import { endTurn } from '../engine/loop.js';
import { DEFAULT_RULES } from '../modes.js';
import type { GameState, PlayerState, ReduceCtx } from '../types.js';

function player(id: string, seat: number, over: Partial<PlayerState> = {}): PlayerState {
  return { id, name: id, avatar: 'hero', connected: true, seat, hp: 40, maxHp: 40, defense: 0, hand: [], equipment: [], statuses: [], deathrattle: [], buffs: [], alive: true, skipTurns: 0, gamble: false, empower: 1, mana: 20, ...over };
}
function game(over: Partial<GameState> = {}): GameState {
  return { phase: 'playing', mode: 'standard', rules: DEFAULT_RULES, players: [player('a', 0), player('b', 1)], turnOrder: ['a', 'b'], currentTurnIndex: 0, turnDir: 1, roundCount: 1, turnDeadline: 0, rngSeed: 1, log: [], winnerId: null, ...over };
}
const ctx: ReduceCtx = { nextCardId: () => 'c-x', now: 1000 };

describe('battlecry (전투의 함성)', () => {
  it('warcry deals only its base damage when the caster still holds other cards', () => {
    const s = game();
    s.players[0].hand = [{ id: 'c1', defId: 'warcry' }, { id: 'c2', defId: 'sword' }];
    const { state, events } = reduce(s, { type: 'play_card', cardInstanceId: 'c1', targetId: 'b' }, ctx);
    expect(state.players[1].hp).toBe(34); // 6 base only, bonus NOT met (still holds c2)
    expect(events.some((e) => e.type === 'battlecry_triggered')).toBe(false);
  });

  it('warcry adds its last_card bonus when it is the caster\'s final card', () => {
    const s = game();
    s.players[0].hand = [{ id: 'c1', defId: 'warcry' }];
    const { state, events } = reduce(s, { type: 'play_card', cardInstanceId: 'c1', targetId: 'b' }, ctx);
    expect(state.players[1].hp).toBe(26); // 6 base + 8 bonus = 14
    expect(events).toContainEqual(expect.objectContaining({ type: 'battlecry_triggered', playerId: 'a', cond: 'last_card' }));
  });

  it('berserk adds its wounded bonus only when the caster is at half HP or below', () => {
    const healthy = game();
    healthy.players[0].hand = [{ id: 'c1', defId: 'berserk' }];
    expect(reduce(healthy, { type: 'play_card', cardInstanceId: 'c1', targetId: 'b' }, ctx).state.players[1].hp).toBe(33); // 7 base only

    const hurt = game();
    hurt.players[0].hp = 20; // exactly half of 40 -> wounded
    hurt.players[0].hand = [{ id: 'c1', defId: 'berserk' }, { id: 'c2', defId: 'sword' }];
    const r = reduce(hurt, { type: 'play_card', cardInstanceId: 'c1', targetId: 'b' }, ctx);
    expect(r.state.players[1].hp).toBe(26); // 7 base + 7 wounded bonus = 14
    expect(r.events).toContainEqual(expect.objectContaining({ type: 'battlecry_triggered', cond: 'wounded' }));
  });
});

describe('deathrattle (죽음의 메아리)', () => {
  it('martyr arms a parting blow that only fires on the caster\'s death', () => {
    const s = game();
    s.players[0].hand = [{ id: 'c1', defId: 'martyr' }];
    const { state, events } = reduce(s, { type: 'play_card', cardInstanceId: 'c1' }, ctx);
    expect(state.players[0].defense).toBe(6);         // shield applied immediately
    expect(state.players[0].deathrattle).toHaveLength(1); // parting effect armed
    expect(events.some((e) => e.type === 'deathrattle_triggered')).toBe(false); // not yet
  });

  it('the caster\'s death fires the armed deathrattle on all others', () => {
    const s = game({ players: [player('a', 0, { hp: 8, deathrattle: [{ kind: 'damage', amount: 8, target: 'all' }] }), player('b', 1), player('c', 2)], turnOrder: ['b', 'a', 'c'], currentTurnIndex: 0 });
    s.players[1].hand = [{ id: 'c1', defId: 'sword' }]; // b's turn, sword hits a for 10 -> lethal (a hp 8)
    const { state, events } = reduce(s, { type: 'play_card', cardInstanceId: 'c1', targetId: 'a' }, ctx);
    expect(state.players[0].alive).toBe(false);
    expect(events).toContainEqual({ type: 'deathrattle_triggered', playerId: 'a' });
    expect(state.players[0].deathrattle).toHaveLength(0); // spent
    expect(state.players[1].hp).toBe(32); // b took 8 from the parting AoE
    expect(state.players[2].hp).toBe(32); // c took 8 too
  });

  it('poison death also triggers the deathrattle (centralized elimination)', () => {
    const s = game({ players: [player('a', 0), player('b', 1, { hp: 3, deathrattle: [{ kind: 'damage', amount: 5, target: 'all' }], statuses: [{ kind: 'poison', amount: 5, turns: 2, sourceId: 'a' }] }), player('c', 2)], turnOrder: ['a', 'b', 'c'] });
    const r = endTurn(s, ctx); // a -> b: poison kills b -> deathrattle hits a and c
    expect(r.state.players[1].alive).toBe(false);
    expect(r.events).toContainEqual({ type: 'deathrattle_triggered', playerId: 'b' });
    expect(r.state.players[0].hp).toBe(35); // a took 5 from b's parting blow
    expect(r.state.players[2].hp).toBe(35); // c took 5 too
  });
});
