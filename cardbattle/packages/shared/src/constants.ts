export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 6;
export const START_HP = 40;
export const START_DEFENSE = 0;
export const START_HAND = 4;
export const DRAW_PER_TURN = 1;       // steady trickle: draw 1 at the start of each of your turns
export const HAND_TARGET = 4;         // every lap, living players are topped up to this many cards (floor)
export const HAND_CAP = 7;            // a hand never grows beyond this; draws past it are skipped
export const HAND_SOFT_CAP = 8; // not enforced in S1
export const TURN_SECONDS = 90;

// Mana economy (Clash-Royale-ish): a bankable resource that gates how many cards you can play
// per turn. It refills a set amount at the start of each of your turns, and that refill AMOUNT
// ramps up as the match goes longer, so late rounds enable bigger multi-card plays.
export const START_MANA = 5;          // everyone opens with this
export const MANA_MAX = 12;           // hard cap on banked mana
export const MANA_REGEN_BASE = 2;     // regen at round 1
export const MANA_REGEN_STEP = 1;     // +1 regen per completed round…
export const MANA_REGEN_CAP = 6;      // …up to this ceiling

/** Mana regenerated at the start of a turn, ramping with the round count (1R→2 … 5R+→6). */
export function manaRegen(round: number): number {
  return Math.min(MANA_REGEN_CAP, MANA_REGEN_BASE + Math.max(0, round - 1) * MANA_REGEN_STEP);
}
export const RECONNECT_SECONDS = 30;

// Public-lobby auto-fill: once every present human in a PUBLIC room is ready but the room
// is short of players, a countdown runs; on expiry the room tops up with bots and starts —
// so a solo "빠른 대전" never sits in an empty lobby forever. Private (friend) rooms don't
// auto-fill; there you wait for the specific friend and add bots by hand.
export const AUTOFILL_SECONDS = 15;

// Character avatars. Humans pick one of HUMAN_AVATARS; the robotic BOT_AVATAR is reserved
// for bots and can't be chosen by a player (the server sanitises any tampered choice).
export const HUMAN_AVATARS = ['hero', 'mage', 'goblin', 'dragon', 'ogre', 'vampire', 'bat', 'ghost'] as const;
export const BOT_AVATAR = 'bot';
export const DEFAULT_AVATAR = 'hero';

/** Coerce a client-supplied avatar to a legal human pick (never the bot shape). */
export function sanitizeAvatar(a: unknown): string {
  return typeof a === 'string' && (HUMAN_AVATARS as readonly string[]).includes(a) ? a : DEFAULT_AVATAR;
}
