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
 * clear the (now-stale) list and re-join with a short backoff until unsubscribed.
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

      // Socket dropped (server restart/sleep) — drop the stale list and retry.
      room.onLeave(() => {
        current = null;
        if (closed) return;
        byId.clear();
        emit();
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
