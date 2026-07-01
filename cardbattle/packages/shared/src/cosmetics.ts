// Gold economy + card cosmetics. Shared so the server can validate prices/ownership and
// the client can render the shop and apply equipped skins. Gold is earned per match by
// logged-in players (guests/bots earn nothing) and spent on cosmetic card borders — purely
// visual, no gameplay effect, keeping the game fair.

// Gold awarded when a match ends, to each logged-in human who was seated.
export const GOLD_PER_MATCH = 15;   // just for playing it out
export const GOLD_WIN_BONUS = 45;   // extra for the last survivor

/** A cosmetic card-border skin buyable with gold and equipped account-wide. */
export interface Cosmetic {
  id: string;
  name: string;
  price: number;      // gold; 0 = owned by default
  /** CSS border color / gradient stops used by the client to paint the card frame. */
  border: string;
  /** Soft outer glow color for the equipped frame. */
  glow: string;
}

// The 'none' skin is free and always owned — the default plain frame.
export const COSMETICS: readonly Cosmetic[] = [
  { id: 'none',    name: '기본',       price: 0,   border: '#39405a', glow: 'rgba(0,0,0,0)' },
  { id: 'emerald', name: '에메랄드',    price: 60,  border: 'linear-gradient(135deg,#38e8c8,#22c7a8)', glow: 'rgba(56,232,200,0.55)' },
  { id: 'amethyst',name: '자수정',      price: 90,  border: 'linear-gradient(135deg,#8b6cff,#b388ff)', glow: 'rgba(139,108,255,0.6)' },
  { id: 'inferno', name: '인페르노',    price: 140, border: 'linear-gradient(135deg,#ff6b3d,#ff3b6b)', glow: 'rgba(255,59,107,0.6)' },
  { id: 'gold',    name: '황금',       price: 220, border: 'linear-gradient(135deg,#ffd75e,#f4a11a)', glow: 'rgba(244,196,74,0.7)' },
  { id: 'abyss',   name: '심연',       price: 320, border: 'linear-gradient(135deg,#5af0d3,#7b5cff)', glow: 'rgba(123,92,255,0.7)' },
] as const;

export const COSMETIC_BY_ID: Record<string, Cosmetic> =
  Object.fromEntries(COSMETICS.map((c) => [c.id, c]));

/** Cosmetics every account owns for free (never need buying). */
export const DEFAULT_OWNED = ['none'];
