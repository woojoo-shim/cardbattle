import { randomBytes, scryptSync, timingSafeEqual, createHmac } from 'crypto';
import { getUser, upsertUser, grantCosmetic, grantCard, grantDevGold, setDeck, setActiveDeck as setActiveDeckStore, deleteDeck as deleteDeckStore, setEquippedBorder, setEquippedTitle, setEquippedEffect, type UserRecord } from './store.js';
import { sanitizeAvatar, DEFAULT_OWNED, cosmeticKind, cosmeticPrice, DEFAULT_CARDS, defaultDeck, cardPrice, isValidDeck, MAX_DECKS, BOX_PRICE, rollBoxCard } from '@cardbattle/shared';

// Zero-dependency auth: scrypt password hashing + HMAC-signed stateless tokens.
// The secret must be set in prod (env AUTH_SECRET); a fixed dev fallback keeps local
// tokens valid across restarts. Tokens are `base64url(payload).hex(sig)` and carry only
// the username + issued-at, so a leaked token can't be tampered with without the secret.
const SECRET = process.env.AUTH_SECRET ?? 'cardbattle-dev-secret-change-me';
const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const STARTING_GOLD = 100; // gold every new account begins with

// Dev grant: accounts whose username is listed here get topped up to DEV_GOLD once, on login
// (tracked by the `devGranted` flag so it fires a single time). Set DEV_GOLD_USERS in prod to a
// comma-separated list of your own account name(s). The owner's dev account is included by default.
const DEV_GOLD = 1000;
const DEV_GOLD_USERS = new Set(
  (process.env.DEV_GOLD_USERS ?? 'photon')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean),
);

export interface AuthResult {
  token: string; username: string; display: string; avatar: string;
  wins: number; losses: number; gold: number; owned: string[];
  equippedBorder: string; equippedTitle: string; equippedEffect: string;
  ownedCards: string[]; decks: string[][]; activeDeck: number; deck: string[];
}

/** openBox() result: the updated account plus the cardId that was rolled (for the reveal). */
export interface BoxResult extends AuthResult { rolled: string }

const USERNAME_RE = /^[a-zA-Z0-9_가-힣]{2,16}$/;

function hash(password: string, salt: string): string {
  return scryptSync(password, salt, 64).toString('hex');
}

function sign(username: string): string {
  const payload = Buffer.from(JSON.stringify({ u: username, t: Date.now() })).toString('base64url');
  const sig = createHmac('sha256', SECRET).update(payload).digest('hex');
  return `${payload}.${sig}`;
}

/** Verify an HMAC token; returns the username if valid and unexpired, else null. */
export function verifyToken(token: string | undefined): string | null {
  if (!token) return null;
  const dot = token.lastIndexOf('.');
  if (dot < 0) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = createHmac('sha256', SECRET).update(payload).digest('hex');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const { u, t } = JSON.parse(Buffer.from(payload, 'base64url').toString()) as { u: string; t: number };
    if (Date.now() - t > TOKEN_TTL_MS) return null;
    return u;
  } catch {
    return null;
  }
}

function toResult(rec: UserRecord, token: string): AuthResult {
  return {
    token, username: rec.username, display: rec.display, avatar: rec.avatar,
    wins: rec.wins, losses: rec.losses, gold: rec.gold, owned: rec.owned,
    equippedBorder: rec.equippedBorder, equippedTitle: rec.equippedTitle, equippedEffect: rec.equippedEffect,
    ownedCards: rec.ownedCards, decks: rec.decks, activeDeck: rec.activeDeck,
    deck: rec.decks[rec.activeDeck] ?? [], // the resolved active deck (BattleRoom/match draw pool)
  };
}

export function register(rawName: string, password: string, avatar: string): AuthResult {
  const display = (rawName ?? '').trim();
  const username = display.toLowerCase();
  if (!USERNAME_RE.test(display)) throw new AuthError('아이디는 2~16자의 한글/영문/숫자/_ 만 가능합니다.');
  if (typeof password !== 'string' || password.length < 4) throw new AuthError('비밀번호는 4자 이상이어야 합니다.');
  if (getUser(username)) throw new AuthError('이미 사용 중인 아이디입니다.');
  const salt = randomBytes(16).toString('hex');
  const rec: UserRecord = {
    username, display: display.slice(0, 16), salt, passHash: hash(password, salt),
    avatar: sanitizeAvatar(avatar), createdAt: Date.now(), wins: 0, losses: 0,
    gold: STARTING_GOLD, owned: [...DEFAULT_OWNED], equippedBorder: 'none',
    equippedTitle: 'title_none', equippedEffect: 'fx_none',
    ownedCards: [...DEFAULT_CARDS], decks: [defaultDeck()], activeDeck: 0,
  };
  upsertUser(rec);
  if (DEV_GOLD_USERS.has(username)) grantDevGold(username, DEV_GOLD); // one-time owner top-up
  return toResult(rec, sign(username));
}

export function login(rawName: string, password: string): AuthResult {
  const username = (rawName ?? '').trim().toLowerCase();
  const rec = getUser(username);
  if (!rec) throw new AuthError('아이디 또는 비밀번호가 올바르지 않습니다.');
  const candidate = Buffer.from(hash(password ?? '', rec.salt));
  const stored = Buffer.from(rec.passHash);
  if (candidate.length !== stored.length || !timingSafeEqual(candidate, stored)) {
    throw new AuthError('아이디 또는 비밀번호가 올바르지 않습니다.');
  }
  if (DEV_GOLD_USERS.has(username)) grantDevGold(username, DEV_GOLD); // one-time owner top-up
  return toResult(rec, sign(username));
}

/** Resolve a token to a public profile (for /api/me auto-login), or null. */
export function me(token: string | undefined): AuthResult | null {
  const username = verifyToken(token);
  if (!username) return null;
  const rec = getUser(username);
  if (!rec) return null;
  return toResult(rec, token!);
}

/** Buy a cosmetic with gold. Works for borders, titles, and effects. Validates token,
 *  existence, price, funds, and dup ownership. */
export function buyCosmetic(token: string | undefined, itemId: string): AuthResult {
  const username = verifyToken(token);
  if (!username) throw new AuthError('세션이 만료되었습니다.');
  const rec = getUser(username);
  if (!rec) throw new AuthError('세션이 만료되었습니다.');
  const price = cosmeticPrice(itemId);
  if (price === null) throw new AuthError('존재하지 않는 상품입니다.');
  if (rec.owned.includes(itemId)) throw new AuthError('이미 보유 중입니다.');
  if (rec.gold < price) throw new AuthError('골드가 부족합니다.');
  grantCosmetic(username, itemId, price);
  return toResult(rec, token!);
}

/** Equip an owned cosmetic — routes to border/title/effect by the item's kind. */
export function equipCosmetic(token: string | undefined, itemId: string): AuthResult {
  const username = verifyToken(token);
  if (!username) throw new AuthError('세션이 만료되었습니다.');
  const rec = getUser(username);
  if (!rec) throw new AuthError('세션이 만료되었습니다.');
  const kind = cosmeticKind(itemId);
  if (!kind) throw new AuthError('존재하지 않는 상품입니다.');
  if (!rec.owned.includes(itemId)) throw new AuthError('보유하지 않은 상품입니다.');
  if (kind === 'border') setEquippedBorder(username, itemId);
  else if (kind === 'title') setEquippedTitle(username, itemId);
  else setEquippedEffect(username, itemId);
  return toResult(rec, token!);
}

/** Buy a card with gold. Validates token, existence, price, funds, and dup ownership. */
export function buyCard(token: string | undefined, cardId: string): AuthResult {
  const username = verifyToken(token);
  if (!username) throw new AuthError('세션이 만료되었습니다.');
  const rec = getUser(username);
  if (!rec) throw new AuthError('세션이 만료되었습니다.');
  const price = cardPrice(cardId);
  if (price === null) throw new AuthError('존재하지 않는 카드입니다.');
  if (rec.ownedCards.includes(cardId)) throw new AuthError('이미 보유 중입니다.');
  if (rec.gold < price) throw new AuthError('골드가 부족합니다.');
  grantCard(username, cardId, price);
  return toResult(rec, token!);
}

/** Open a loot box ("상자 깡"): spend BOX_PRICE gold, roll one UNOWNED card (rarity-weighted),
 *  and grant it. Returns the account plus the rolled cardId for the reveal. */
export function openBox(token: string | undefined): BoxResult {
  const username = verifyToken(token);
  if (!username) throw new AuthError('세션이 만료되었습니다.');
  const rec = getUser(username);
  if (!rec) throw new AuthError('세션이 만료되었습니다.');
  if (rec.gold < BOX_PRICE) throw new AuthError('골드가 부족합니다.');
  const rolled = rollBoxCard(rec.ownedCards);
  if (!rolled) throw new AuthError('모든 카드를 이미 보유하고 있습니다.');
  grantCard(username, rolled, BOX_PRICE);
  return { ...toResult(rec, token!), rolled };
}

/** Save a deck into slot `index` (0..decks.length; === length appends a new slot up to
 *  MAX_DECKS). Validates legality against owned cards and the slot bounds. */
export function saveDeck(token: string | undefined, index: unknown, deck: unknown): AuthResult {
  const username = verifyToken(token);
  if (!username) throw new AuthError('세션이 만료되었습니다.');
  const rec = getUser(username);
  if (!rec) throw new AuthError('세션이 만료되었습니다.');
  if (typeof index !== 'number' || !Number.isInteger(index) || index < 0 || index > rec.decks.length) {
    throw new AuthError('덱 슬롯이 올바르지 않습니다.');
  }
  if (index === rec.decks.length && rec.decks.length >= MAX_DECKS) {
    throw new AuthError(`덱은 최대 ${MAX_DECKS}개까지 만들 수 있습니다.`);
  }
  if (!Array.isArray(deck) || !deck.every((id): id is string => typeof id === 'string')) {
    throw new AuthError('덱 형식이 올바르지 않습니다.');
  }
  if (!isValidDeck(deck, rec.ownedCards)) throw new AuthError('덱 구성이 올바르지 않습니다.');
  setDeck(username, index, deck);
  return toResult(rec, token!);
}

/** Pick which saved deck is used for matches. Validates the index is in range. */
export function setActiveDeck(token: string | undefined, index: unknown): AuthResult {
  const username = verifyToken(token);
  if (!username) throw new AuthError('세션이 만료되었습니다.');
  const rec = getUser(username);
  if (!rec) throw new AuthError('세션이 만료되었습니다.');
  if (typeof index !== 'number' || !Number.isInteger(index) || index < 0 || index >= rec.decks.length) {
    throw new AuthError('덱 슬롯이 올바르지 않습니다.');
  }
  setActiveDeckStore(username, index);
  return toResult(rec, token!);
}

/** Delete a saved deck slot (at least one deck always remains). */
export function deleteDeck(token: string | undefined, index: unknown): AuthResult {
  const username = verifyToken(token);
  if (!username) throw new AuthError('세션이 만료되었습니다.');
  const rec = getUser(username);
  if (!rec) throw new AuthError('세션이 만료되었습니다.');
  if (typeof index !== 'number' || !Number.isInteger(index) || index < 0 || index >= rec.decks.length) {
    throw new AuthError('덱 슬롯이 올바르지 않습니다.');
  }
  if (rec.decks.length <= 1) throw new AuthError('덱은 최소 1개는 있어야 합니다.');
  deleteDeckStore(username, index);
  return toResult(rec, token!);
}

/** For BattleRoom.onAuth: resolve a token to the account username (for gold awards), or null. */
export function accountFromToken(token: string | undefined): string | null {
  return verifyToken(token);
}

export class AuthError extends Error {}
