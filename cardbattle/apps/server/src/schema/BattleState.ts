import { Schema, MapSchema, ArraySchema, type } from '@colyseus/schema';
import type { GameState } from '@cardbattle/shared';

export class CardInstanceSchema extends Schema {
  @type('string') id = '';
  @type('string') defId = '';
}

export class PlayerSchema extends Schema {
  @type('string') id = '';
  @type('string') name = '';
  @type('boolean') connected = true;
  @type('number') seat = 0;
  @type('number') hp = 0;
  @type('number') maxHp = 0;
  @type('number') defense = 0;
  @type('boolean') alive = true;
  @type('number') handCount = 0;
  @type([CardInstanceSchema]) hand = new ArraySchema<CardInstanceSchema>();
}

export class BattleState extends Schema {
  @type('string') phase = 'lobby';
  @type('number') currentTurnIndex = 0;
  @type('number') turnDeadline = 0;
  @type('string') winnerId = '';
  @type(['string']) turnOrder = new ArraySchema<string>();
  @type({ map: PlayerSchema }) players = new MapSchema<PlayerSchema>();
}

/** Mirror the authoritative plain GameState into the Colyseus schema (delta-synced). */
export function syncToSchema(schema: BattleState, gs: GameState): void {
  schema.phase = gs.phase;
  schema.currentTurnIndex = gs.currentTurnIndex;
  schema.turnDeadline = gs.turnDeadline;
  schema.winnerId = gs.winnerId ?? '';
  // @colyseus/schema v3 ArraySchema.splice rejects insertCount > deleteCount, so a single
  // splice cannot grow an empty array. Rebuild via pop/push, but only when the order changed
  // (it is set once at game start in S1) to avoid emitting redundant deltas every publish.
  const orderUnchanged =
    schema.turnOrder.length === gs.turnOrder.length &&
    gs.turnOrder.every((id, i) => schema.turnOrder[i] === id);
  if (!orderUnchanged) {
    while (schema.turnOrder.length > 0) schema.turnOrder.pop();
    for (const id of gs.turnOrder) schema.turnOrder.push(id);
  }
  // NOTE: does not remove schema players absent from gs.players. In S1 players are
  // never deleted (disconnect sets connected=false), so stale entries cannot occur.
  for (const p of gs.players) {
    let ps = schema.players.get(p.id);
    if (!ps) { ps = new PlayerSchema(); ps.id = p.id; schema.players.set(p.id, ps); }
    ps.name = p.name; ps.connected = p.connected; ps.seat = p.seat;
    ps.hp = p.hp; ps.maxHp = p.maxHp; ps.defense = p.defense; ps.alive = p.alive;
    ps.handCount = p.hand.length;
  }
}
