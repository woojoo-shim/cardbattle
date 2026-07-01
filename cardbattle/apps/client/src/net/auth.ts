// Auth HTTP client. Uses same-origin relative paths: in prod the server serves the page,
// and in dev Vite proxies /api to the :2567 server (see vite.config.ts), so no CORS either
// way. The token lives in localStorage for auto-login and is attached to Colyseus joins
// (see net/client.ts) so the server can seat the account, not a spoofed name.
const apiBase = '';

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

async function post(path: string, body: unknown): Promise<Account> {
  const res = await fetch(`${apiBase}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? '요청에 실패했습니다.');
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
    if (!res.ok) { clearToken(); return null; }
    return (await res.json()) as Account;
  } catch {
    return null;
  }
}

async function shop(path: string, itemId: string): Promise<Account> {
  const res = await fetch(`${apiBase}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken() ?? ''}` },
    body: JSON.stringify({ itemId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? '요청에 실패했습니다.');
  return data as Account;
}

/** Buy a cosmetic; returns the updated account (new gold + owned). */
export function buyCosmetic(itemId: string): Promise<Account> {
  return shop('/api/shop/buy', itemId);
}
/** Equip an owned cosmetic border; returns the updated account. */
export function equipCosmetic(itemId: string): Promise<Account> {
  return shop('/api/shop/equip', itemId);
}
