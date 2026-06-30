import { Server, LobbyRoom } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { createServer } from 'http';
import { fileURLToPath } from 'url';
import path from 'path';
import express from 'express';
import { BattleRoom } from './rooms/BattleRoom.js';

const port = Number(process.env.PORT ?? 2567);

// Serve the built client from the same origin so one URL hosts both the page and the
// websocket. The Vite build output lives at apps/client/dist relative to this file.
const here = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.resolve(here, '../../client/dist');
const app = express();
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
gameServer
  .listen(port)
  .then(() => console.log(`[cardbattle] server listening on :${port}`))
  .catch((err) => {
    console.error('[cardbattle] failed to listen', err);
    process.exit(1);
  });
