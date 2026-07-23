import type { GameModeId, RuleSet } from './modes.js';

export type Phase = 'lobby' | 'playing' | 'ended';
export type Element = 'physical' | 'fire' | 'ice' | 'lightning' | 'poison' | 'holy' | 'none';
export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';
export type CardKind = 'weapon' | 'magic' | 'heal' | 'special' | 'equipment';

export type Effect =
  | { kind: 'damage'; amount: number; target: 'chosen' | 'all' | 'random' }
  | { kind: 'heal'; amount: number }
  | { kind: 'shield'; amount: number }
  | { kind: 'reverse' }
  | { kind: 'peek' }       // privately reveal one of a chosen player's hand cards to the caster
  | { kind: 'discard' }    // destroy one random card from a chosen player's hand
  | { kind: 'skip' }       // make a chosen player skip their next turn
  | { kind: 'gamble' }     // the caster's next attack this turn is doubled or nullified (50/50)
  | { kind: 'empower'; amount: number } // multiply the caster's damage this turn (e.g. 1.5x)
  | { kind: 'selfskip' }   // the caster forfeits their own next turn
  | { kind: 'steal' }      // take one random card from a chosen player's hand into mine
  | { kind: 'mana'; amount: number } // refill the caster's mana (the '충전' ramp card)
  | { kind: 'pierce'; amount: number; target: 'chosen' } // damage that ignores shield/defense entirely
  | { kind: 'swap' }       // swap the caster's current HP with a chosen player's HP
  | { kind: 'manaburn'; amount: number }    // drain up to `amount` mana from a chosen player
  | { kind: 'leech'; amount: number }       // hit every other living player, healing the caster by the HP actually removed
  | { kind: 'desperation'; amount: number } // hit a chosen player for `amount` + the caster's missing HP (comeback finisher)
  | { kind: 'poison'; amount: number; turns: number; target: 'chosen' | 'all' } // damage-over-time: ticks at the victim's turn start, ignores shield
  | { kind: 'regen'; amount: number; turns: number }   // heal-over-time on the caster: ticks at their own turn start
  | { kind: 'reflect'; pct: number; turns: number };   // a reflector: bounces `pct` of incoming HP damage back at the attacker until the caster's next turn

/** An ongoing effect riding on a player, ticked at that player's turn start (loop.ts). */
export type Status =
  | { kind: 'poison'; amount: number; turns: number; sourceId: string }
  | { kind: 'regen'; amount: number; turns: number }
  | { kind: 'reflect'; pct: number; turns: number };
export type StatusKind = Status['kind'];

export interface CardDef {
  id: string;
  name: string;
  rarity: Rarity;
  cost: number;
  element: Element;
  kind: CardKind;
  effects: Effect[];
  cooldown: number;
  vfxKey: string;
  sfxKey: string;
  icon: string;
  desc: string;
  drawWeight: number;
}

export interface CardInstance { id: string; defId: string; }

export interface PlayerState {
  id: string;
  name: string;
  avatar: string;            // chosen character id (humans: HUMAN_AVATARS; bots: BOT_AVATAR)
  connected: boolean;
  seat: number;
  hp: number;
  maxHp: number;
  defense: number;
  hand: CardInstance[];
  equipment: CardInstance[]; // S1: always []
  statuses: Status[];        // ongoing poison/regen/reflect effects, ticked at this player's turn start
  buffs: unknown[];          // S1: always []
  alive: boolean;
  skipTurns: number;         // pending turns to skip (from '결박' / '희생'); decremented on arrival
  gamble: boolean;           // a '도박' is armed: the next attack this turn is doubled or whiffs
  empower: number;           // damage multiplier for this turn (1 = none, 1.5 = '희생')
  mana: number;              // bankable resource spent to play cards; refills (ramping) each turn
}

export interface GameState {
  phase: Phase;
  mode: GameModeId;    // selected rule variant (label); mechanics come from `rules`
  rules: RuleSet;      // the active mode's tunables; the pure engine reads these, not module constants
  players: PlayerState[];
  turnOrder: string[];
  currentTurnIndex: number;
  turnDir: 1 | -1;     // +1 = forward through turnOrder, -1 = reversed (flipped by '역류')
  roundCount: number;  // increments each time the turn token completes a full lap
  turnDeadline: number;
  rngSeed: number;
  log: GameEvent[];
  winnerId: string | null;
}

export type Action =
  | { type: 'play_card'; cardInstanceId: string; targetId?: string }
  | { type: 'end_turn' };
// Reserved for S2: | { type: 'defend'; ... }

export type GameEvent =
  | { type: 'turn_started'; playerId: string; deadline: number }
  | { type: 'turn_ended'; playerId: string }
  | { type: 'card_drawn'; playerId: string; cardInstanceId: string; defId: string }
  | { type: 'card_played'; playerId: string; defId: string; targetId?: string }
  | { type: 'damage_dealt'; sourceId: string; targetId: string; amount: number; element: Element; targetHpAfter: number; absorbed?: number }
  | { type: 'healed'; targetId: string; amount: number; targetHpAfter: number }
  | { type: 'shielded'; targetId: string; amount: number; defenseAfter: number }
  | { type: 'direction_reversed'; direction: 1 | -1 }
  | { type: 'round_advanced'; round: number }
  | { type: 'card_revealed'; viewerId: string; targetId: string; cardInstanceId: string; defId: string } // PRIVATE: server sends only to viewerId
  | { type: 'card_discarded'; targetId: string; cardInstanceId: string; defId: string }
  | { type: 'card_stolen'; thiefId: string; targetId: string } // PUBLIC: identity stays hidden; thief learns it via hand sync
  | { type: 'turn_skipped'; playerId: string }
  | { type: 'gamble_resolved'; playerId: string; doubled: boolean }
  | { type: 'mana_gained'; playerId: string; amount: number; manaAfter: number }
  | { type: 'mana_burned'; targetId: string; amount: number; manaAfter: number } // a chosen player's mana was drained
  | { type: 'hp_swapped'; aId: string; bId: string; aHp: number; bHp: number }    // two players traded current HP
  | { type: 'status_applied'; targetId: string; status: StatusKind; amount: number; turns: number } // poison/regen/reflect landed on a player
  | { type: 'player_eliminated'; playerId: string }
  | { type: 'game_over'; winnerId: string };

/** Context passed into the reducer; supplies authority-owned services (RNG, clock). */
export interface ReduceCtx {
  nextCardId: () => string;   // unique CardInstance id generator (server-owned)
  now: number;                // epoch ms used to compute deadlines
}

export interface ReduceResult { state: GameState; events: GameEvent[]; }
