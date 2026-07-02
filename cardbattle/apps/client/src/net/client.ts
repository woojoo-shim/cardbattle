import { Client, Room } from 'colyseus.js';
import type { CardInstance, GameEvent, GameModeId } from '@cardbattle/shared';
import { getToken } from './auth.js';

// Dev: the Vite page (:5173) and the Colyseus server (:2567) run on separate ports.
// Prod: the server serves the built client, so the websocket lives on the page's own
// origin — use wss when the page is https so secure pages don't get mixed-content errors.
const endpoint = import.meta.env.DEV
  ? `ws://${location.hostname}:2567`
  : `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}`;

export interface BattleConnection {
  room: Room;
  sessionId: string;
}

/** A battle room as advertised in the lobby browser (mirrors Colyseus IRoomCache). */
export interface RoomInfo {
  roomId: string;
  clients: number;
  maxClients: number;
  metadata: { title?: string; code?: string; mode?: GameModeId; players?: number; started?: boolean; unlisted?: boolean };
}

const wrap = (room: Room): BattleConnection => ({ room, sessionId: room.sessionId });

// The account token (if logged in) rides every join so the server's onAuth can seat the
// player under their verified account name instead of a client-supplied (spoofable) one.
const auth = () => { const token = getToken(); return token ? { token } : {}; };

/** Quick match: drop into any open lobby or spin up a fresh one (solo/bot fast path). */
export async function quickPlay(name: string, avatar: string): Promise<BattleConnection> {
  const room = await new Client(endpoint).joinOrCreate('battle', { name, avatar, ...auth() });
  return wrap(room);
}

/** Host a brand-new named room; the returned room carries its own code (in state).
 * A private room is hidden from the browser list — it's joinable only via its code. */
export async function createRoom(name: string, title: string, avatar: string, mode: GameModeId, isPrivate: boolean): Promise<BattleConnection> {
  const room = await new Client(endpoint).create('battle', { name, title, avatar, mode, private: isPrivate, ...auth() });
  return wrap(room);
}

/** Resolve a 4-char room code to a live roomId with a fresh one-shot lobby query. Unlike reading
 * the room-browser's own list (which can be empty or stale if that subscription's socket dropped,
 * and only ever populates a moment after mount), this opens a throwaway lobby connection, reads
 * the current full battle-room list once, then leaves. The lobby's raw list includes private
 * rooms too (the server hides them only from the browser UI, not from matchmaking), so codes for
 * private rooms resolve here as well. */
export function findRoomByCode(code: string): Promise<string | null> {
  const c = code.trim().toUpperCase();
  if (!c) return Promise.resolve(null);
  return new Promise((resolve, reject) => {
    new Client(endpoint).joinOrCreate('lobby', { filter: { name: 'battle' } }).then((room) => {
      const done = (roomId: string | null) => { clearTimeout(timer); room.leave(); resolve(roomId); };
      const timer = setTimeout(() => done(null), 6000); // no 'rooms' snapshot arrived
      room.onMessage('rooms', (rooms: RoomInfo[]) => {
        const hit = rooms.find((r) => (r.metadata?.code ?? '').toUpperCase() === c && !r.metadata?.started);
        done(hit ? hit.roomId : null);
      });
    }).catch(reject);
  });
}

/** Join a specific room by its Colyseus roomId (used by both the list and code paths). */
export async function joinRoomById(roomId: string, name: string, avatar: string): Promise<BattleConnection> {
  const room = await new Client(endpoint).joinById(roomId, { name, avatar, ...auth() });
  return wrap(room);
}

/**
 * Subscribe to the live room browser. Connects to the 'lobby' room (battle-filtered) and
 * invokes onUpdate with the current open-room list on every change. Returns an unsubscribe fn.
 *
 * The lobby socket can silently die when the server sleeps/restarts (Render free tier idles
 * after ~15min, and every deploy restarts the process). Without reconnection the browser would
 * keep a dead subscription and never see rooms created afterwards — so on an unexpected drop we
 * re-join with a short backoff until unsubscribed. We deliberately KEEP the last-known list on
 * the screen while reconnecting (rather than clearing it): free-tier sockets flap intermittently,
 * and blanking the list on every blip made rooms flicker in and out. The fresh 'rooms' snapshot
 * from the new connection replaces the list wholesale a moment later, correcting any staleness.
 */
export async function listLobby(onUpdate: (rooms: RoomInfo[]) => void): Promise<() => void> {
  const byId = new Map<string, RoomInfo>();
  const emit = () => onUpdate([...byId.values()]);
  let closed = false;
  let current: Room | null = null;

  const connect = async () => {
    if (closed) return;
    try {
      const room = await new Client(endpoint).joinOrCreate('lobby', { filter: { name: 'battle' } });
      if (closed) { room.leave(); return; }
      current = room;

      room.onMessage('rooms', (rooms: RoomInfo[]) => {
        byId.clear();
        for (const r of rooms) byId.set(r.roomId, r);
        emit();
      });
      room.onMessage('+', ([roomId, info]: [string, RoomInfo]) => { byId.set(roomId, info); emit(); });
      room.onMessage('-', (roomId: string) => { byId.delete(roomId); emit(); });

      // Socket dropped (server restart/sleep) — keep the last list visible and retry.
      room.onLeave(() => {
        current = null;
        if (closed) return;
        setTimeout(connect, 2000);
      });
    } catch {
      if (!closed) setTimeout(connect, 2000);
    }
  };

  await connect();
  return () => { closed = true; current?.leave(); };
}

export type { CardInstance, GameEvent };
