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

/** Loot-box ("상자 깡") gold price and per-rarity drop weights. Commons are default-owned so they
 *  never drop — the box always yields a NEW (unowned) rare/epic/legendary card, rarity-weighted. */
export const BOX_PRICE = 130;
const BOX_WEIGHTS: Record<Rarity, number> = { common: 0, rare: 60, epic: 30, legendary: 10 };

/** Roll one unowned card from the box, weighted by rarity. Returns a cardId the account does NOT
 *  own, or null when every non-common card is already owned. `rand` yields [0,1). */
export function rollBoxCard(owned: string[], rand: () => number = Math.random): string | null {
  const ownedSet = new Set(owned);
  const pool = ALL_DEFS.filter((d) => d.rarity !== 'common' && !ownedSet.has(d.id));
  if (pool.length === 0) return null;
  const total = pool.reduce((s, d) => s + BOX_WEIGHTS[d.rarity], 0);
  if (total <= 0) return pool[Math.floor(rand() * pool.length)].id;
  let roll = rand() * total;
  for (const d of pool) {
    roll -= BOX_WEIGHTS[d.rarity];
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
