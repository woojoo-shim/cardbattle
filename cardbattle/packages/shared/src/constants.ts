export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 8;
export const START_HP = 40;
export const START_DEFENSE = 0;
export const START_HAND = 4;
export const DRAW_PER_TURN = 0;       // no per-turn draw; hands are topped up each full lap instead
export const HAND_TARGET = 4;         // every lap, living players are refilled up to this many cards
export const HAND_SOFT_CAP = 8; // not enforced in S1
export const TURN_SECONDS = 30;
export const RECONNECT_SECONDS = 30;

// Character avatars. Humans pick one of HUMAN_AVATARS; the robotic BOT_AVATAR is reserved
// for bots and can't be chosen by a player (the server sanitises any tampered choice).
export const HUMAN_AVATARS = ['hero', 'mage', 'goblin', 'dragon', 'ogre', 'vampire', 'bat', 'ghost'] as const;
export const BOT_AVATAR = 'bot';
export const DEFAULT_AVATAR = 'hero';

/** Coerce a client-supplied avatar to a legal human pick (never the bot shape). */
export function sanitizeAvatar(a: unknown): string {
  return typeof a === 'string' && (HUMAN_AVATARS as readonly string[]).includes(a) ? a : DEFAULT_AVATAR;
}
