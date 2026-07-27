import { Server, LobbyRoom } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { createServer } from 'http';
import { fileURLToPath } from 'url';
import path from 'path';
import express from 'express';
import { BattleRoom } from './rooms/BattleRoom.js';
import { register, login, me, buyCosmetic, equipCosmetic, buyCard, saveDeck, AuthError } from './auth/auth.js';
import { initStore } from './auth/store.js';

const port = Number(process.env.PORT ?? 2567);

// Serve the built client from the same origin so one URL hosts both the page and the
// websocket. The Vite build output lives at apps/client/dist relative to this file.
const here = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.resolve(here, '../../client/dist');
const app = express();
// CORS: when the frontend is hosted elsewhere (e.g. a vercel.app page) it calls this
// server's /api cross-origin. Auth is a stateless Bearer token (no cookies), so a wildcard
// origin is safe — no credentialed requests. Answer preflight OPTIONS before the JSON parser.
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});
app.use(express.json());

// Auth API — registered BEFORE the static/SPA handlers so /api/* isn't swallowed by
// the index.html fallback. Bearer token in the Authorization header for /api/me.
app.post('/api/register', (req, res) => {
  try {
    const { username, password, avatar } = req.body ?? {};
    res.json(register(username, password, avatar));
  } catch (err) {
    if (err instanceof AuthError) return res.status(400).json({ error: err.message });
    res.status(500).json({ error: '서버 오류' });
  }
});
app.post('/api/login', (req, res) => {
  try {
    const { username, password } = req.body ?? {};
    res.json(login(username, password));
  } catch (err) {
    if (err instanceof AuthError) return res.status(400).json({ error: err.message });
    res.status(500).json({ error: '서버 오류' });
  }
});
app.get('/api/me', (req, res) => {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  const profile = me(token);
  if (!profile) return res.status(401).json({ error: '세션이 만료되었습니다.' });
  res.json(profile);
});
const bearer = (req: express.Request) => req.headers.authorization?.replace(/^Bearer\s+/i, '');
app.post('/api/shop/buy', (req, res) => {
  try {
    res.json(buyCosmetic(bearer(req), (req.body ?? {}).itemId));
  } catch (err) {
    if (err instanceof AuthError) return res.status(400).json({ error: err.message });
    res.status(500).json({ error: '서버 오류' });
  }
});
app.post('/api/shop/equip', (req, res) => {
  try {
    res.json(equipCosmetic(bearer(req), (req.body ?? {}).itemId));
  } catch (err) {
    if (err instanceof AuthError) return res.status(400).json({ error: err.message });
    res.status(500).json({ error: '서버 오류' });
  }
});
app.post('/api/cards/buy', (req, res) => {
  try {
    res.json(buyCard(bearer(req), (req.body ?? {}).cardId));
  } catch (err) {
    if (err instanceof AuthError) return res.status(400).json({ error: err.message });
    res.status(500).json({ error: '서버 오류' });
  }
});
app.post('/api/deck', (req, res) => {
  try {
    res.json(saveDeck(bearer(req), (req.body ?? {}).deck));
  } catch (err) {
    if (err instanceof AuthError) return res.status(400).json({ error: err.message });
    res.status(500).json({ error: '서버 오류' });
  }
});

app.use(express.static(clientDist));
// SPA fallback: anything not matched as a static asset returns index.html. Colyseus
// matchmaking rides the websocket upgrade event, so it never reaches this handler.
app.use((_req, res) => res.sendFile(path.join(clientDist, 'index.html')));

const httpServer = createServer(app);
const gameServer = new Server({ transport: new WebSocketTransport({ server: httpServer }) });
// enableRealtimeListing() pushes battle-room create/metadata/dispose into the LobbyRoom so the
// client room browser updates live. The 'lobby' room is what the browser screen connects to.
gameServer.define('battle', BattleRoom).enableRealtimeListing();
gameServer.define('lobby', LobbyRoom);
// Load the account store (Redis or file) BEFORE listening so no auth request races an
// empty Map — otherwise a login arriving mid-load would falsely 401.
initStore()
  .then(() => gameServer.listen(port))
  .then(() => console.log(`[cardbattle] server listening on :${port}`))
  .catch((err) => {
    console.error('[cardbattle] failed to listen', err);
    process.exit(1);
  });
