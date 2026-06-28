export type Phase = 'lobby' | 'playing' | 'ended';
export type Element = 'physical' | 'fire' | 'ice' | 'lightning' | 'poison' | 'holy' | 'none';
export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';
export type CardKind = 'weapon' | 'magic' | 'equipment' | 'special';

export type Effect =
  | { kind: 'damage'; amount: number; target: 'chosen' | 'all' | 'random' }
  | { kind: 'heal'; amount: number };

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
}

export interface GameState {
  phase: Phase;
  players: PlayerState[];
  turnOrder: string[];
  currentTurnIndex: number;
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
  | { type: 'player_eliminated'; playerId: string }
  | { type: 'game_over'; winnerId: string };

/** Context passed into the reducer; supplies authority-owned services (RNG, clock). */
export interface ReduceCtx {
  nextCardId: () => string;   // unique CardInstance id generator (server-owned)
  now: number;                // epoch ms used to compute deadlines
}

export interface ReduceResult { state: GameState; events: GameEvent[]; }
