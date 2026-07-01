import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import path from 'path';

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
  return u;
}

const DB_PATH = process.env.AUTH_DB_PATH ?? path.resolve(process.cwd(), 'data/users.json');

const users = new Map<string, UserRecord>();
let loaded = false;
let saveTimer: ReturnType<typeof setTimeout> | undefined;

function load(): void {
  if (loaded) return;
  loaded = true;
  try {
    const raw = readFileSync(DB_PATH, 'utf8');
    const arr = JSON.parse(raw) as UserRecord[];
    for (const u of arr) users.set(u.username, normalize(u));
    console.log(`[auth] loaded ${users.size} account(s) from ${DB_PATH}`);
  } catch {
    console.log(`[auth] no user store at ${DB_PATH} — starting empty`);
  }
}

function scheduleSave(): void {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      mkdirSync(path.dirname(DB_PATH), { recursive: true });
      writeFileSync(DB_PATH, JSON.stringify([...users.values()], null, 2));
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

/** Record a finished match's outcome + gold for one account. Mutates in place, persists. */
export function recordMatch(username: string, won: boolean, gold: number): void {
  const rec = getUser(username);
  if (!rec) return;
  if (won) rec.wins += 1; else rec.losses += 1;
  rec.gold += gold;
  scheduleSave();
}

/** Buy a cosmetic: deduct gold and grant ownership. Caller validates price/ownership. */
export function grantCosmetic(username: string, id: string, price: number): void {
  const rec = getUser(username);
  if (!rec) return;
  rec.gold -= price;
  if (!rec.owned.includes(id)) rec.owned.push(id);
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
