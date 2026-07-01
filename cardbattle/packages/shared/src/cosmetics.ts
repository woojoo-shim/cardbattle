// Gold economy + card cosmetics. Shared so the server can validate prices/ownership and
// the client can render the shop and apply equipped skins. Gold is earned per match by
// logged-in players (guests/bots earn nothing) and spent on cosmetics — purely visual, no
// gameplay effect, keeping the game fair. Three cosmetic families exist: card borders,
// name titles (칭호), and card-play burst effects — all visible to every player at the table.

// Gold awarded when a match ends. Winning pays well; losing still pays a little so grinding
// isn't punishing. A 1v1 win pays nothing to stop farming gold against a single bot/friend.
export const GOLD_WIN = 10;   // last survivor in a 3+ player match
export const GOLD_LOSS = 3;   // consolation for everyone else who was seated
export const GOLD_1V1_WIN = 0; // anti-farm: winning a 2-player match earns nothing

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

/** A name title (칭호) shown under a player's name at the table — visible to everyone. */
export interface Title {
  id: string;
  name: string;      // shop label
  price: number;     // gold; 0 = owned by default
  /** The text rendered under the player's name. */
  text: string;
  /** CSS color or gradient used to paint the title text. */
  color: string;
}

// 'title_none' is free/default — no title shown.
export const TITLES: readonly Title[] = [
  { id: 'title_none',    name: '없음',       price: 0,   text: '',           color: '#8b93a7' },
  { id: 'title_rookie',  name: '새내기',     price: 40,  text: '새내기',      color: '#8fe3c4' },
  { id: 'title_gambler', name: '도박꾼',     price: 80,  text: '도박꾼',      color: '#ffd75e' },
  { id: 'title_slayer',  name: '학살자',     price: 130, text: '학살자',      color: '#ff6b7d' },
  { id: 'title_arcane',  name: '비전술사',   price: 180, text: '비전술사',    color: 'linear-gradient(90deg,#8b6cff,#b388ff)' },
  { id: 'title_legend',  name: '전설',       price: 300, text: '전설',        color: 'linear-gradient(90deg,#ffd75e,#ff8a3c)' },
] as const;

export const TITLE_BY_ID: Record<string, Title> =
  Object.fromEntries(TITLES.map((t) => [t.id, t]));

/** A card-play burst effect that pops at the caster's seat when they play a card. */
export interface PlayEffect {
  id: string;
  name: string;      // shop label
  price: number;     // gold; 0 = owned by default
  /** Emoji/glyph used for the particle burst; empty = no burst. */
  glyph: string;
  /** Tint color for the burst glow. */
  color: string;
}

// 'fx_none' is free/default — no play burst.
export const PLAY_EFFECTS: readonly PlayEffect[] = [
  { id: 'fx_none',    name: '없음',       price: 0,   glyph: '',   color: 'rgba(0,0,0,0)' },
  { id: 'fx_sparkle', name: '반짝임',     price: 70,  glyph: '✨', color: '#ffe39a' },
  { id: 'fx_petals',  name: '꽃잎',       price: 110, glyph: '🌸', color: '#ffb3d1' },
  { id: 'fx_embers',  name: '불티',       price: 160, glyph: '🔥', color: '#ff7a3c' },
  { id: 'fx_frost',   name: '서리',       price: 200, glyph: '❄️', color: '#5fd0ff' },
  { id: 'fx_stars',   name: '별똥',       price: 280, glyph: '⭐', color: '#ffd75e' },
] as const;

export const EFFECT_BY_ID: Record<string, PlayEffect> =
  Object.fromEntries(PLAY_EFFECTS.map((e) => [e.id, e]));

/** Cosmetics every account owns for free (never need buying). */
export const DEFAULT_OWNED = ['none', 'title_none', 'fx_none'];

/** What kind of cosmetic an id refers to — used by the server to route buy/equip. */
export type CosmeticKind = 'border' | 'title' | 'effect';

/** Classify a cosmetic id, or null if it doesn't exist in any catalog. */
export function cosmeticKind(id: string): CosmeticKind | null {
  if (COSMETIC_BY_ID[id]) return 'border';
  if (TITLE_BY_ID[id]) return 'title';
  if (EFFECT_BY_ID[id]) return 'effect';
  return null;
}

/** Price of any cosmetic id across the three catalogs, or null if unknown. */
export function cosmeticPrice(id: string): number | null {
  const kind = cosmeticKind(id);
  if (kind === 'border') return COSMETIC_BY_ID[id].price;
  if (kind === 'title') return TITLE_BY_ID[id].price;
  if (kind === 'effect') return EFFECT_BY_ID[id].price;
  return null;
}
