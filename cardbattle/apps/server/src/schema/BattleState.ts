import { Schema, MapSchema, ArraySchema, type } from '@colyseus/schema';
import type { GameState } from '@cardbattle/shared';

export class CardInstanceSchema extends Schema {
  @type('string') id = '';
  @type('string') defId = '';
}

/** One ongoing status riding on a player (poison/regen/reflect), surfaced so clients can
 *  paint turn-start effect badges. `amount` doubles as reflect's percent (0.5 -> 50). */
export class StatusSchema extends Schema {
  @type('string') kind = '';
  @type('number') amount = 0;
  @type('number') turns = 0;
}

/** A minion standing on a player's field (하스스톤식 하수인). Full stats are public. */
export class MinionSchema extends Schema {
  @type('string') id = '';
  @type('string') defId = '';
  @type('string') ownerId = '';
  @type('number') attack = 0;
  @type('number') health = 0;
  @type('number') maxHealth = 0;
  @type('boolean') taunt = false;
  @type('boolean') charge = false;
  @type('boolean') divineShield = false;
  @type('boolean') poisonous = false;
  @type('boolean') lifesteal = false;
  @type('boolean') summonedThisTurn = false;
  @type('number') attacksLeft = 0;
  @type('boolean') hasDeathrattle = false;
}

/** A building (건물) a player has placed. `turnsLeft > 0` = still under construction, 0 = active. */
export class BuildingSchema extends Schema {
  @type('string') id = '';
  @type('string') defId = '';
  @type('string') ownerId = '';
  @type('number') turnsLeft = 0;
}

export class PlayerSchema extends Schema {
  @type('string') id = '';
  @type('string') name = '';
  @type('string') avatar = '';
  @type('boolean') connected = true;
  @type('number') seat = 0;
  @type('number') hp = 0;
  @type('number') maxHp = 0;
  @type('number') defense = 0;
  @type('boolean') alive = true;
  @type('number') handCount = 0;
  @type('number') skipTurns = 0;
  @type('number') mana = 0;
  @type('boolean') heroPowerUsed = false;
  @type('boolean') hasDeathrattle = false; // 유언 (deathrattle) armed — clients paint a parting-blow badge
  // Equipped cosmetics, mirrored from the room's cosmetics map so every client sees them.
  // Set in BattleRoom.publish() (not here) since they live outside the pure GameState.
  @type('string') border = 'none';
  @type('string') titleCosmetic = 'title_none';
  @type('string') effectCosmetic = 'fx_none';
  @type([CardInstanceSchema]) hand = new ArraySchema<CardInstanceSchema>();
  @type([StatusSchema]) statuses = new ArraySchema<StatusSchema>();
  @type([MinionSchema]) field = new ArraySchema<MinionSchema>();
  @type([BuildingSchema]) buildings = new ArraySchema<BuildingSchema>();
}

export class BattleState extends Schema {
  @type('string') code = '';
  @type('string') title = '';
  @type('string') mode = 'standard';
  @type('string') phase = 'lobby';
  @type('number') currentTurnIndex = 0;
  @type('number') turnDir = 1;
  @type('number') roundCount = 1;
  @type('number') turnDeadline = 0;
  @type('string') winnerId = '';
  @type(['string']) turnOrder = new ArraySchema<string>();
  @type({ map: PlayerSchema }) players = new MapSchema<PlayerSchema>();
}

/** Mirror the authoritative plain GameState into the Colyseus schema (delta-synced). */
export function syncToSchema(schema: BattleState, gs: GameState): void {
  schema.mode = gs.mode;
  schema.phase = gs.phase;
  schema.currentTurnIndex = gs.currentTurnIndex;
  schema.turnDir = gs.turnDir;
  schema.roundCount = gs.roundCount;
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
  // Remove schema players no longer present in gs (e.g. a lobby leaver was spliced out).
  const liveIds = new Set(gs.players.map((p) => p.id));
  for (const key of Array.from(schema.players.keys())) {
    if (!liveIds.has(key)) schema.players.delete(key);
  }
  for (const p of gs.players) {
    let ps = schema.players.get(p.id);
    if (!ps) { ps = new PlayerSchema(); ps.id = p.id; schema.players.set(p.id, ps); }
    ps.name = p.name; ps.avatar = p.avatar; ps.connected = p.connected; ps.seat = p.seat;
    ps.hp = p.hp; ps.maxHp = p.maxHp; ps.defense = p.defense; ps.alive = p.alive;
    ps.handCount = p.hand.length;
    ps.skipTurns = p.skipTurns;
    ps.mana = p.mana;
    ps.heroPowerUsed = p.heroPowerUsed;
    ps.hasDeathrattle = p.deathrattle.length > 0;
    // Rebuild the status list (small, changes rarely) so effect badges stay in sync.
    while (ps.statuses.length > 0) ps.statuses.pop();
    for (const st of p.statuses) {
      const ss = new StatusSchema();
      ss.kind = st.kind;
      ss.amount = st.kind === 'reflect' ? Math.round(st.pct * 100) : st.amount;
      ss.turns = st.turns;
      ps.statuses.push(ss);
    }
    // Rebuild the field (minions come and go each turn) so the board stays in sync.
    while (ps.field.length > 0) ps.field.pop();
    for (const m of p.field) {
      const ms = new MinionSchema();
      ms.id = m.id; ms.defId = m.defId; ms.ownerId = m.ownerId;
      ms.attack = m.attack; ms.health = m.health; ms.maxHealth = m.maxHealth;
      ms.taunt = m.taunt; ms.charge = m.charge; ms.divineShield = m.divineShield;
      ms.poisonous = m.poisonous; ms.lifesteal = m.lifesteal;
      ms.summonedThisTurn = m.summonedThisTurn; ms.attacksLeft = m.attacksLeft;
      ms.hasDeathrattle = m.deathrattle.length > 0;
      ps.field.push(ms);
    }
    // Rebuild the buildings list (placed/progressing/completing) so the board stays in sync.
    while (ps.buildings.length > 0) ps.buildings.pop();
    for (const b of p.buildings) {
      const bs = new BuildingSchema();
      bs.id = b.id; bs.defId = b.defId; bs.ownerId = b.ownerId; bs.turnsLeft = b.turnsLeft;
      ps.buildings.push(bs);
    }
  }
}
