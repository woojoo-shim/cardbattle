import type { GameModeId, RuleSet } from './modes.js';

export type Phase = 'lobby' | 'playing' | 'ended';
export type Element = 'physical' | 'fire' | 'ice' | 'lightning' | 'poison' | 'holy' | 'none';
export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';
export type CardKind = 'minion' | 'spell';

/** Passive minion abilities (Hearthstone-flavoured, adapted to our FFA board). */
export type Keyword =
  | 'taunt'         // 수호: enemies must attack this minion before the hero or other minions
  | 'charge'        // 쇄도: can attack the turn it's summoned (no summoning sickness)
  | 'divineShield'  // 가호: the first damage this minion takes is negated
  | 'poisonous'     // 부식: any minion this damages is destroyed outright
  | 'lifesteal';    // 착취: damage this deals also heals its owner's hero

/** Who a damage/heal/buff effect reaches. Entity targets (`chosen`) resolve to a hero OR a minion. */
export type DamageTarget = 'chosen' | 'allEnemies' | 'allEnemyMinions' | 'allMinions' | 'randomEnemy';
export type HealTarget = 'hero' | 'chosen' | 'allFriendly';
export type BuffTarget = 'chosen' | 'allFriendlyMinions' | 'randomFriendlyMinion';

/** The board-model effect union. A spell card's effects fire on play; a minion card's effects
 *  are its 강림 (battlecry, fire on summon); a minion's `deathrattle` (유언) fires on its death. */
export type Effect =
  | { kind: 'damage'; amount: number; target: DamageTarget }
  | { kind: 'heal'; amount: number; target: HealTarget }
  | { kind: 'buff'; attack: number; health: number; target: BuffTarget } // permanent +atk/+hp
  | { kind: 'summon'; token: string; count: number }  // summon `count` copies of a token minion for the caster
  | { kind: 'draw'; amount: number }
  | { kind: 'gainMana'; amount: number }
  | { kind: 'shield'; amount: number }                // hero armor (adds to defense)
  | { kind: 'destroy'; target: 'chosen' };            // destroy a chosen minion outright

export interface CardDef {
  id: string;
  name: string;
  rarity: Rarity;
  cost: number;
  element: Element;
  kind: CardKind;
  /** Base stats for a minion card (undefined for spells). */
  minion?: { attack: number; health: number };
  /** Passive keywords a summoned minion carries. */
  keywords?: Keyword[];
  /** Spell: fired on play. Minion: its battlecry (fired on summon). */
  effects: Effect[];
  /** Minion parting effects, fired when it dies. */
  deathrattle?: Effect[];
  cooldown: number;
  vfxKey: string;
  sfxKey: string;
  icon: string;
  desc: string;
  /** Hearthstone-style flavor text — personality, no mechanical meaning. */
  flavor?: string;
  drawWeight: number;
}

export interface CardInstance { id: string; defId: string; }

/** A minion in play on a player's field. Combat stats live here (not on the def) so buffs and
 *  damage persist. `attacksLeft` gates one swing per turn; summoning sickness is `summonedThisTurn`
 *  unless the minion has charge. divineShield/poisonous/lifesteal mirror the def's keywords. */
export interface MinionInstance {
  id: string;
  defId: string;
  ownerId: string;
  attack: number;
  health: number;
  maxHealth: number;
  summonedThisTurn: boolean;
  attacksLeft: number;
  taunt: boolean;
  charge: boolean;
  divineShield: boolean;
  poisonous: boolean;
  lifesteal: boolean;
  deathrattle: Effect[];
}

export interface PlayerState {
  id: string;
  name: string;
  avatar: string;            // chosen character id (humans: HUMAN_AVATARS; bots: BOT_AVATAR)
  connected: boolean;
  seat: number;
  hp: number;
  maxHp: number;
  defense: number;           // hero armor: soaks damage to the hero before HP
  hand: CardInstance[];
  field: MinionInstance[];   // minions this player controls, left→right summon order
  statuses: Status[];        // ongoing turn-start effects (unused by the current card set, kept for badges)
  deathrattle: Effect[];     // legacy hero deathrattle slot (unused by the current card set)
  alive: boolean;
  skipTurns: number;         // pending turns to skip
  mana: number;              // bankable resource spent to play cards; refills (ramping) each turn
  heroPowerUsed: boolean;    // has this player used their avatar's signature ability this turn?
  deck: string[];            // this player's chosen draw pool (card defIds, duplicates weight draws)
}

export interface GameState {
  phase: Phase;
  mode: GameModeId;    // selected rule variant (label); mechanics come from `rules`
  rules: RuleSet;      // the active mode's tunables; the pure engine reads these, not module constants
  players: PlayerState[];
  turnOrder: string[];
  currentTurnIndex: number;
  turnDir: 1 | -1;     // +1 = forward through turnOrder, -1 = reversed
  roundCount: number;  // increments each time the turn token completes a full lap
  turnDeadline: number;
  rngSeed: number;
  nextMinionId: number; // server-owned counter for unique MinionInstance ids
  log: GameEvent[];
  winnerId: string | null;
}

export type Action =
  | { type: 'play_card'; cardInstanceId: string; targetId?: string }
  | { type: 'attack'; attackerId: string; targetId: string } // attackerId = own minion, targetId = enemy hero or minion
  | { type: 'use_hero_power'; targetId?: string }
  | { type: 'end_turn' };

/** An ongoing turn-start status (kept for schema/UI compatibility; no current card applies one). */
export type Status =
  | { kind: 'poison'; amount: number; turns: number; sourceId: string }
  | { kind: 'regen'; amount: number; turns: number }
  | { kind: 'reflect'; pct: number; turns: number };
export type StatusKind = Status['kind'];

export type GameEvent =
  | { type: 'turn_started'; playerId: string; deadline: number }
  | { type: 'turn_ended'; playerId: string }
  | { type: 'card_drawn'; playerId: string; cardInstanceId: string; defId: string }
  | { type: 'card_played'; playerId: string; defId: string; targetId?: string }
  | { type: 'hero_power_used'; playerId: string; avatar: string; powerId: string; targetId?: string }
  | { type: 'damage_dealt'; sourceId: string; targetId: string; amount: number; element: Element; targetHpAfter: number; absorbed?: number }
  | { type: 'healed'; targetId: string; amount: number; targetHpAfter: number }
  | { type: 'shielded'; targetId: string; amount: number; defenseAfter: number }
  | { type: 'round_advanced'; round: number }
  | { type: 'turn_skipped'; playerId: string }
  | { type: 'mana_gained'; playerId: string; amount: number; manaAfter: number }
  // Board / minion events
  | { type: 'minion_summoned'; playerId: string; minionId: string; defId: string }
  | { type: 'minion_attacked'; attackerId: string; targetId: string }             // targetId = hero playerId or minion id
  | { type: 'minion_damaged'; minionId: string; amount: number; healthAfter: number }
  | { type: 'minion_buffed'; minionId: string; attack: number; health: number }   // new totals after the buff
  | { type: 'minion_died'; minionId: string; playerId: string }
  | { type: 'deathrattle_triggered'; playerId: string }             // a minion's 유언 (deathrattle) fired
  | { type: 'battlecry_triggered'; playerId: string; cond: string } // a minion's 강림 (battlecry) fired
  | { type: 'player_eliminated'; playerId: string }
  | { type: 'game_over'; winnerId: string };

/** Context passed into the reducer; supplies authority-owned services (RNG, clock, id gen). */
export interface ReduceCtx {
  nextCardId: () => string;   // unique CardInstance id generator (server-owned)
  now: number;                // epoch ms used to compute deadlines
}

export interface ReduceResult { state: GameState; events: GameEvent[]; }
