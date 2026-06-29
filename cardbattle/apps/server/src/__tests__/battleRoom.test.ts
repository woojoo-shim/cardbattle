import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Server } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { createServer } from 'http';
import { BattleRoom } from '../rooms/BattleRoom.js';

// @colyseus/testing's static import triggers @colyseus/tools side-effects (dynamic
// imports of optional drivers) that create temporarily-unhandled rejections. Deferring
// to a dynamic import inside beforeAll lets the internal .catch() swallow them first.
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

    // connectTo awaits onJoin completion, so the authoritative server state is populated.
    expect(room.state.players.size).toBe(2);
    expect(room.state.phase).toBe('lobby');

    // Register the 'events' listener BEFORE readying so the start broadcast is captured.
    const eventsPromise = c1.waitForMessage('events');
    c1.send('setReady', { ready: true });
    c2.send('setReady', { ready: true });

    // Resolve once the start broadcast (turn_started) reaches c1.
    const evts = (await eventsPromise) as Array<{ type: string }>;
    expect(evts.some((e) => e.type === 'turn_started')).toBe(true);
    expect(room.state.phase).toBe('playing');
  });

  it('only the owner receives their hand contents', async () => {
    const room = await colyseus.createRoom('battle', {});
    const c1 = await colyseus.connectTo(room, { name: 'A' });
    const c2 = await colyseus.connectTo(room, { name: 'B' });

    // 'hand' is sent on every publish (incl. empty lobby hands); keep the latest.
    let c1Hand: unknown[] = [];
    c1.onMessage('hand', (h) => { c1Hand = h as unknown[]; });

    const eventsPromise = c1.waitForMessage('events');
    c1.send('setReady', { ready: true });
    c2.send('setReady', { ready: true });

    // The start publish sends 'hand' (dealt cards) BEFORE 'events', so once 'events'
    // arrives the owner's filled hand has already been applied.
    await eventsPromise;
    expect(c1Hand.length).toBeGreaterThan(0);

    // The synced schema (what every client sees) exposes handCount but never card contents.
    const c1Schema = room.state.players.get(c1.sessionId);
    expect(c1Schema?.handCount).toBeGreaterThan(0);
    expect(c1Schema?.hand.length ?? 0).toBe(0);
  });
});
