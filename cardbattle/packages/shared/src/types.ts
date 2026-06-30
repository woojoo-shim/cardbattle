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
  | { kind: 'selfskip' };  // the caster forfeits their own next turn

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
  connected: boolean;
  seat: number;
  hp: number;
  maxHp: number;
  defense: number;
  hand: CardInstance[];
  equipment: CardInstance[]; // S1: always []
  statuses: unknown[];       // S1: always []
  buffs: unknown[];          // S1: always []
  alive: boolean;
  skipTurns: number;         // pending turns to skip (from '결박' / '희생'); decremented on arrival
  gamble: boolean;           // a '도박' is armed: the next attack this turn is doubled or whiffs
  empower: number;           // damage multiplier for this turn (1 = none, 1.5 = '희생')
}

export interface GameState {
  phase: Phase;
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
  | { type: 'damage_dealt'; sourceId: string; targetId: string; amount: number; element: Element; targetHpAfter: number }
  | { type: 'healed'; targetId: string; amount: number; targetHpAfter: number }
  | { type: 'shielded'; targetId: string; amount: number; defenseAfter: number }
  | { type: 'direction_reversed'; direction: 1 | -1 }
  | { type: 'round_advanced'; round: number }
  | { type: 'card_revealed'; viewerId: string; targetId: string; cardInstanceId: string; defId: string } // PRIVATE: server sends only to viewerId
  | { type: 'card_discarded'; targetId: string; cardInstanceId: string; defId: string }
  | { type: 'turn_skipped'; playerId: string }
  | { type: 'gamble_resolved'; playerId: string; doubled: boolean }
  | { type: 'player_eliminated'; playerId: string }
  | { type: 'game_over'; winnerId: string };

/** Context passed into the reducer; supplies authority-owned services (RNG, clock). */
export interface ReduceCtx {
  nextCardId: () => string;   // unique CardInstance id generator (server-owned)
  now: number;                // epoch ms used to compute deadlines
}

export interface ReduceResult { state: GameState; events: GameEvent[]; }
