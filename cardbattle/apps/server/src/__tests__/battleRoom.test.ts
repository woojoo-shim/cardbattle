import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Server } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { createServer } from 'http';
import { BattleRoom } from '../rooms/BattleRoom.js';

// @colyseus/testing's static import triggers @colyseus/tools side-effects
// (three dynamic imports: bun-websockets, redis-driver, redis-presence) that
// create temporarily-unhandled rejections.  vitest's unhandledRejection hook
// catches these before .catch(() => {}) runs and tries to forward the non-
// serialisable error object through the tinypool IPC channel, crashing with
// Buffer.from(Object).  Deferring to a dynamic import inside beforeAll
// lets the .catch() swallowing run first, so the rejection never leaks.
let colyseus: import('@colyseus/testing').ColyseusTestServer;

describe('BattleRoom integration', () => {
  beforeAll(async () => {
    const { boot } = await import('@colyseus/testing');
    const gameServer = new Server({
      transport: new WebSocketTransport({ server: createServer() }),
      gracefullyShutdown: false,
    });
    gameServer.define('battle', BattleRoom);
    colyseus = await boot(gameServer);
  });

  afterAll(async () => {
    await colyseus?.shutdown();
  });

  it('two clients can join, ready, and start a game', async () => {
    const room = await colyseus.createRoom('battle', {});
    const c1 = await colyseus.connectTo(room, { name: 'A' });
    const c2 = await colyseus.connectTo(room, { name: 'B' });

    // Wait for schema to be delivered to both clients.
    await c1.waitForNextPatch();

    expect(c1.state.players.size).toBe(2);

    // Register listeners BEFORE sending setReady so no race.
    const eventsPromise = c1.waitForMessage('events');

    c1.send('setReady', { ready: true });
    c2.send('setReady', { ready: true });

    // Wait for the state patch that sets phase='playing'.
    await room.waitForNextPatch();

    // Wait for the 'events' broadcast to reach c1.
    const evts = await eventsPromise as any[];
    const started = evts.some((e) => e.type === 'turn_started');

    expect(c1.state.phase).toBe('playing');
    expect(started).toBe(true);
  });

  it('only the owner receives their hand contents', async () => {
    const room = await colyseus.createRoom('battle', {});
    const c1 = await colyseus.connectTo(room, { name: 'A' });
    const c2 = await colyseus.connectTo(room, { name: 'B' });

    // Register hand listener BEFORE sending setReady.
    const handPromise = c1.waitForMessage('hand');

    c1.send('setReady', { ready: true });
    c2.send('setReady', { ready: true });

    // Wait for state to settle (phase becomes 'playing').
    await room.waitForNextPatch();

    // Await c1's private hand message.
    const c1Hand = await handPromise as any[];

    expect(c1Hand.length).toBeGreaterThan(0);

    const c1AsSeenByC2 = c2.state.players.get(c1.sessionId);
    expect(c1AsSeenByC2?.handCount).toBeGreaterThan(0);
    // hand array in synced schema must be empty (hidden information).
    expect(c1AsSeenByC2?.hand.length ?? 0).toBe(0);
  });
});
