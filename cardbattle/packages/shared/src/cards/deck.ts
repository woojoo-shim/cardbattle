import type { Rarity } from '../types.js';
import { CARD_DEFS, ALL_DEFS } from './defs.js';

/** A match deck is a fixed-size list of card defIds (duplicates allowed, capped per card). The
 *  in-match draw pool IS this list — copies of a card weight it more heavily toward being drawn. */
export const DECK_SIZE = 20;
export const MAX_COPIES = 2;

/** Each account may save up to this many decks and pick one as the active match deck. */
export const MAX_DECKS = 5;

/** Gold price to unlock a card, by rarity. Commons are free so a brand-new account can build a
 *  legal deck immediately (12 commons × 2 copies = 24 slots ≥ DECK_SIZE). */
export const CARD_PRICE: Record<Rarity, number> = { common: 0, rare: 50, epic: 90, legendary: 160 };

/** Gold price for a card id, or null if the id isn't a real card. */
export function cardPrice(id: string): number | null {
  const def = CARD_DEFS[id];
  return def ? CARD_PRICE[def.rarity] : null;
}

/** Card packs ("카드팩"): three tiers with different gold prices and rarity odds. Commons are
 *  default-owned so they never drop — a pack always yields a NEW (unowned) rare/epic/legendary
 *  card, weighted by the tier's odds. Higher tiers cost more but skew toward rarer cards. */
export type PackId = 'normal' | 'rare' | 'super';
export interface PackDef {
  id: PackId;
  name: string;
  price: number;
  weights: Record<Rarity, number>;
}
export const CARD_PACKS: PackDef[] = [
  { id: 'normal', name: '일반 팩',      price: 90,  weights: { common: 0, rare: 78, epic: 20, legendary: 2 } },
  { id: 'rare',   name: '레어 팩',      price: 180, weights: { common: 0, rare: 40, epic: 46, legendary: 14 } },
  { id: 'super',  name: '슈퍼 레어 팩', price: 340, weights: { common: 0, rare: 12, epic: 48, legendary: 40 } },
];

/** Look up a pack by id, or undefined for an unknown id. */
export function packById(id: string): PackDef | undefined {
  return CARD_PACKS.find((p) => p.id === id);
}

/** Odds (percent, sums to 100) for which pack tier a match WIN grants for free. */
export const WIN_PACK_ODDS: Record<PackId, number> = { normal: 80, rare: 15, super: 5 };

/** Roll one pack tier for a win reward, weighted by WIN_PACK_ODDS. `rand` yields [0,1). */
export function rollPackTier(rand: () => number = Math.random): PackId {
  const order: PackId[] = ['normal', 'rare', 'super'];
  let roll = rand() * 100;
  for (const id of order) {
    roll -= WIN_PACK_ODDS[id];
    if (roll < 0) return id;
  }
  return 'normal';
}

/** Roll one unowned card from a pack, weighted by the tier's rarity odds. Returns a cardId the
 *  account does NOT own, or null for an unknown pack / when every non-common card is already
 *  owned. `rand` yields [0,1). */
export function rollPackCard(packId: string, owned: string[], rand: () => number = Math.random): string | null {
  const pack = packById(packId);
  if (!pack) return null;
  const ownedSet = new Set(owned);
  const pool = ALL_DEFS.filter((d) => d.rarity !== 'common' && !ownedSet.has(d.id));
  if (pool.length === 0) return null;
  const total = pool.reduce((s, d) => s + pack.weights[d.rarity], 0);
  if (total <= 0) return pool[Math.floor(rand() * pool.length)].id;
  let roll = rand() * total;
  for (const d of pool) {
    roll -= pack.weights[d.rarity];
    if (roll < 0) return d.id;
  }
  return pool[pool.length - 1].id;
}

/** The cards every account owns from the start: all commons (free). */
export const DEFAULT_CARDS: string[] = ALL_DEFS.filter((d) => d.rarity === 'common').map((d) => d.id);

/** Count occurrences of each id in a list. */
function counts(list: string[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const id of list) m.set(id, (m.get(id) ?? 0) + 1);
  return m;
}

/** Build a legal starter deck from the owned pool: fill to DECK_SIZE, up to MAX_COPIES per card. */
export function defaultDeck(owned: string[] = DEFAULT_CARDS): string[] {
  const pool = owned.filter((id) => CARD_DEFS[id]);
  const deck: string[] = [];
  const used = new Map<string, number>();
  // pass over the pool up to MAX_COPIES times so we spread copies evenly before doubling up
  for (let copy = 0; copy < MAX_COPIES && deck.length < DECK_SIZE; copy++) {
    for (const id of pool) {
      if (deck.length >= DECK_SIZE) break;
      const n = used.get(id) ?? 0;
      if (n >= MAX_COPIES) continue;
      if (n === copy) { deck.push(id); used.set(id, n + 1); }
    }
  }
  return deck;
}

/** A deck is legal when it's exactly DECK_SIZE real, owned cards with no card over MAX_COPIES. */
export function isValidDeck(deck: string[], owned: string[]): boolean {
  if (!Array.isArray(deck) || deck.length !== DECK_SIZE) return false;
  const ownedSet = new Set(owned);
  for (const [id, n] of counts(deck)) {
    if (!CARD_DEFS[id]) return false;
    if (!ownedSet.has(id)) return false;
    if (n > MAX_COPIES) return false;
  }
  return true;
}

/** Return the deck if legal, otherwise a fresh default deck for the owned pool. */
export function sanitizeDeck(deck: string[] | undefined, owned: string[]): string[] {
  return deck && isValidDeck(deck, owned) ? deck : defaultDeck(owned);
}
