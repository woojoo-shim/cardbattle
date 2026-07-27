import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import path from 'path';
import { DEFAULT_CARDS, sanitizeDeck } from '@cardbattle/shared';

// A tiny JSON-file user store — zero external deps. Records are held in memory and
// flushed to disk (debounced) on every change. On Render's free tier the filesystem
// is ephemeral, so accounts reset on redeploy/spin-down; swap this for Neon/Upstash
// later without touching auth.ts (same load/get/upsert surface).
export interface UserRecord {
  username: string;   // lowercased key used for lookup
  display: string;    // original-case name shown in game
  salt: string;       // hex
  passHash: string;   // hex (scrypt)
  avatar: string;
  createdAt: number;
  wins: number;
  losses: number;
  gold: number;             // earned per match, spent in the shop
  owned: string[];          // cosmetic ids the account has bought (borders, titles, effects)
  equippedBorder: string;   // currently equipped card-border cosmetic id
  equippedTitle: string;    // currently equipped name title id
  equippedEffect: string;   // currently equipped card-play burst effect id
  ownedCards: string[];     // card ids the account has unlocked (all commons are free/default)
  deck: string[];           // the account's chosen match deck (DECK_SIZE defIds, duplicates allowed)
}

// Older records (pre-gold / pre-title) may lack the economy/cosmetic fields; backfill sane
// defaults on read so the rest of the code can assume they exist.
function normalize(u: UserRecord): UserRecord {
  if (typeof u.gold !== 'number') u.gold = 0;
  if (!Array.isArray(u.owned)) u.owned = ['none'];
  for (const def of ['none', 'title_none', 'fx_none']) {
    if (!u.owned.includes(def)) u.owned.push(def);
  }
  if (typeof u.equippedBorder !== 'string') u.equippedBorder = 'none';
  if (typeof u.equippedTitle !== 'string') u.equippedTitle = 'title_none';
  if (typeof u.equippedEffect !== 'string') u.equippedEffect = 'fx_none';
  // Card economy: every account owns all commons for free; older records lack these fields.
  if (!Array.isArray(u.ownedCards)) u.ownedCards = [...DEFAULT_CARDS];
  for (const def of DEFAULT_CARDS) if (!u.ownedCards.includes(def)) u.ownedCards.push(def);
  u.deck = sanitizeDeck(u.deck, u.ownedCards); // repair/seed a legal deck from the owned pool
  return u;
}

const DB_PATH = process.env.AUTH_DB_PATH ?? path.resolve(process.cwd(), 'data/users.json');

// Optional durable backend: Upstash Redis (REST). When both env vars are set the store
// persists to Redis instead of the local file, so accounts survive Render's ephemeral-fs
// wipes on every redeploy. Absent the vars we fall back to the JSON file (local dev).
const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const REDIS_KEY = process.env.UPSTASH_REDIS_KEY ?? 'cardbattle:users';
const useRedis = !!(REDIS_URL && REDIS_TOKEN);

const users = new Map<string, UserRecord>();
let loaded = false;
let saveTimer: ReturnType<typeof setTimeout> | undefined;

/** Run one Redis command via the Upstash REST endpoint (single-command form). */
async function redisCmd(cmd: unknown[]): Promise<{ result: unknown }> {
  const res = await fetch(REDIS_URL!, {
    method: 'POST',
    headers: { Authorization: `Bearer ${REDIS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmd),
  });
  if (!res.ok) throw new Error(`Upstash ${res.status} ${await res.text()}`);
  return res.json() as Promise<{ result: unknown }>;
}

function hydrate(arr: UserRecord[]): void {
  for (const u of arr) users.set(u.username, normalize(u));
}

function loadFile(): void {
  try {
    const raw = readFileSync(DB_PATH, 'utf8');
    hydrate(JSON.parse(raw) as UserRecord[]);
    console.log(`[auth] loaded ${users.size} account(s) from ${DB_PATH}`);
  } catch {
    console.log(`[auth] no user store at ${DB_PATH} — starting empty`);
  }
}

/** Populate the in-memory store at boot. Awaited before the server listens so every
 *  sync getUser() below reads a fully-loaded Map. Redis when configured, else the file. */
export async function initStore(): Promise<void> {
  if (loaded) return;
  loaded = true;
  if (!useRedis) return loadFile();
  try {
    const { result } = await redisCmd(['GET', REDIS_KEY]);
    if (typeof result === 'string' && result) {
      hydrate(JSON.parse(result) as UserRecord[]);
      console.log(`[auth] loaded ${users.size} account(s) from Upstash Redis`);
    } else {
      console.log('[auth] Upstash Redis store empty — starting fresh');
    }
  } catch (err) {
    console.error('[auth] Redis load failed — falling back to file', err);
    loadFile();
  }
}

// Lazy sync guard for the file path: if a getUser() ever fires before initStore() (only
// possible in file mode), load the file on demand. In Redis mode initStore() has already
// flipped `loaded`, so this is a no-op and the async-loaded Redis data is used.
function load(): void {
  if (loaded) return;
  loaded = true;
  loadFile();
}

function scheduleSave(): void {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const data = JSON.stringify([...users.values()], null, 2);
    if (useRedis) {
      redisCmd(['SET', REDIS_KEY, data]).catch((err) => console.error('[auth] Redis save failed', err));
      return;
    }
    try {
      mkdirSync(path.dirname(DB_PATH), { recursive: true });
      writeFileSync(DB_PATH, data);
    } catch (err) {
      console.error('[auth] failed to persist user store', err);
    }
  }, 400);
}

export function getUser(username: string): UserRecord | undefined {
  load();
  return users.get(username.toLowerCase());
}

export function upsertUser(rec: UserRecord): void {
  load();
  users.set(rec.username, normalize(rec));
  scheduleSave();
}

/** Record a finished match's outcome + gold for one account. Mutates in place, persists.
 *  Returns the account's new gold balance (or null if the account no longer exists). */
export function recordMatch(username: string, won: boolean, gold: number): number | null {
  const rec = getUser(username);
  if (!rec) return null;
  if (won) rec.wins += 1; else rec.losses += 1;
  rec.gold += gold;
  scheduleSave();
  return rec.gold;
}

/** Buy a cosmetic: deduct gold and grant ownership. Caller validates price/ownership. */
export function grantCosmetic(username: string, id: string, price: number): void {
  const rec = getUser(username);
  if (!rec) return;
  rec.gold -= price;
  if (!rec.owned.includes(id)) rec.owned.push(id);
  scheduleSave();
}

/** Buy a card: deduct gold and grant ownership. Caller validates price/ownership. */
export function grantCard(username: string, id: string, price: number): void {
  const rec = getUser(username);
  if (!rec) return;
  rec.gold -= price;
  if (!rec.ownedCards.includes(id)) rec.ownedCards.push(id);
  scheduleSave();
}

/** Save the account's chosen match deck. Caller validates legality against ownedCards. */
export function setDeck(username: string, deck: string[]): void {
  const rec = getUser(username);
  if (!rec) return;
  rec.deck = deck;
  scheduleSave();
}

/** Equip an already-owned cosmetic border. */
export function setEquippedBorder(username: string, id: string): void {
  const rec = getUser(username);
  if (!rec) return;
  rec.equippedBorder = id;
  scheduleSave();
}

/** Equip an already-owned name title. */
export function setEquippedTitle(username: string, id: string): void {
  const rec = getUser(username);
  if (!rec) return;
  rec.equippedTitle = id;
  scheduleSave();
}

/** Equip an already-owned card-play burst effect. */
export function setEquippedEffect(username: string, id: string): void {
  const rec = getUser(username);
  if (!rec) return;
  rec.equippedEffect = id;
  scheduleSave();
}
