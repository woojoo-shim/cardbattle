import { Server } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { createServer } from 'http';
import { BattleRoom } from './rooms/BattleRoom.js';

const port = Number(process.env.PORT ?? 2567);
const gameServer = new Server({ transport: new WebSocketTransport({ server: createServer() }) });
gameServer.define('battle', BattleRoom);
gameServer
  .listen(port)
  .then(() => console.log(`[cardbattle] server listening on :${port}`))
  .catch((err) => {
    console.error('[cardbattle] failed to listen', err);
    process.exit(1);
  });
