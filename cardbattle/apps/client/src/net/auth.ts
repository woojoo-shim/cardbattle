// Auth HTTP client. In dev, Vite proxies /api to the :2567 server (see vite.config.ts).
// In prod, if VITE_SERVER_URL is set (Vercel frontend → Render backend) the /api calls go
// cross-origin to that server (the server sends CORS headers); otherwise same-origin (the
// single-host Render deploy serves both page and API). The token lives in localStorage for
// auto-login and rides Colyseus joins (net/client.ts) so the server seats the account.
const apiBase = import.meta.env.DEV
  ? ''
  : ((import.meta.env.VITE_SERVER_URL as string | undefined)?.replace(/\/$/, '') ?? '');

const TOKEN_KEY = 'cb_token';

export interface Account {
  token: string;
  username: string;
  display: string;
  avatar: string;
  wins: number;
  losses: number;
  gold: number;
  owned: string[];
  equippedBorder: string;
  equippedTitle: string;
  equippedEffect: string;
  ownedCards: string[];
  decks: string[][];    // up to MAX_DECKS saved decks
  activeDeck: number;   // index of the deck used for matches
  deck: string[];       // resolved active deck (decks[activeDeck]) — the match draw pool
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
export function saveToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}
export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

// Render's free tier sleeps after ~15min; the first request while it cold-starts can return an
// empty body or a non-JSON 502 page. Parse defensively so `res.json()` never throws the cryptic
// "Unexpected end of JSON input" at the user — return null and let callers show a friendly retry.
async function readJson(res: Response): Promise<any> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function post(path: string, body: unknown): Promise<Account> {
  let res: Response;
  try {
    res = await fetch(`${apiBase}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error('서버에 연결하지 못했습니다. 잠시 후 다시 시도해주세요.');
  }
  const data = await readJson(res);
  if (!res.ok) throw new Error(data?.error ?? (res.status >= 500 ? '서버를 깨우는 중입니다. 잠시 후 다시 시도해주세요.' : '요청에 실패했습니다.'));
  if (!data) throw new Error('서버 응답을 받지 못했습니다. 잠시 후 다시 시도해주세요.');
  return data as Account;
}

export async function register(username: string, password: string, avatar: string): Promise<Account> {
  const acct = await post('/api/register', { username, password, avatar });
  saveToken(acct.token);
  return acct;
}

export async function login(username: string, password: string): Promise<Account> {
  const acct = await post('/api/login', { username, password });
  saveToken(acct.token);
  return acct;
}

/** Resolve the stored token to an account for silent auto-login; null if none/expired. */
export async function fetchMe(): Promise<Account | null> {
  const token = getToken();
  if (!token) return null;
  try {
    const res = await fetch(`${apiBase}/api/me`, { headers: { Authorization: `Bearer ${token}` } });
    // Only a real 401 means the session expired — clear the token then. A cold-start 5xx/empty
    // body is transient, so KEEP the token (wiping it here logged the user out on every wake).
    if (!res.ok) { if (res.status === 401) clearToken(); return null; }
    return (await readJson(res)) as Account | null;
  } catch {
    return null;
  }
}

/** Authenticated POST (Bearer token) returning the updated account. */
async function authPost(path: string, body: unknown): Promise<Account> {
  let res: Response;
  try {
    res = await fetch(`${apiBase}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken() ?? ''}` },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error('서버에 연결하지 못했습니다. 잠시 후 다시 시도해주세요.');
  }
  const data = await readJson(res);
  if (!res.ok) throw new Error(data?.error ?? (res.status >= 500 ? '서버를 깨우는 중입니다. 잠시 후 다시 시도해주세요.' : '요청에 실패했습니다.'));
  if (!data) throw new Error('서버 응답을 받지 못했습니다. 잠시 후 다시 시도해주세요.');
  return data as Account;
}

/** Buy a cosmetic; returns the updated account (new gold + owned). */
export function buyCosmetic(itemId: string): Promise<Account> {
  return authPost('/api/shop/buy', { itemId });
}
/** Equip an owned cosmetic border; returns the updated account. */
export function equipCosmetic(itemId: string): Promise<Account> {
  return authPost('/api/shop/equip', { itemId });
}
/** Buy a card with gold; returns the updated account (new gold + ownedCards). */
export function buyCard(cardId: string): Promise<Account> {
  return authPost('/api/cards/buy', { cardId });
}
/** openBox result — the updated account plus the cardId that was rolled (for the reveal). */
export interface BoxOpenResult extends Account { rolled: string }
/** Open a loot box ("상자 깡"): spend gold, receive a random unowned card. Returns the updated
 *  account plus the rolled cardId. */
export async function openBox(): Promise<BoxOpenResult> {
  const acct = await authPost('/api/box/open', {});
  return acct as BoxOpenResult;
}
/** Save a deck into slot `index` (index === decks.length appends a new slot). */
export function saveDeck(index: number, deck: string[]): Promise<Account> {
  return authPost('/api/deck', { index, deck });
}
/** Pick which saved deck is used for matches; returns the updated account. */
export function setActiveDeck(index: number): Promise<Account> {
  return authPost('/api/deck/active', { index });
}
/** Delete a saved deck slot; returns the updated account. */
export function deleteDeck(index: number): Promise<Account> {
  return authPost('/api/deck/delete', { index });
}
