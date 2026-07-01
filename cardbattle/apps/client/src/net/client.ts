import { Client, Room } from 'colyseus.js';
import type { CardInstance, GameEvent } from '@cardbattle/shared';

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
  metadata: { title?: string; code?: string; players?: number; started?: boolean };
}

const wrap = (room: Room): BattleConnection => ({ room, sessionId: room.sessionId });

/** Quick match: drop into any open lobby or spin up a fresh one (solo/bot fast path). */
export async function quickPlay(name: string, avatar: string): Promise<BattleConnection> {
  const room = await new Client(endpoint).joinOrCreate('battle', { name, avatar });
  return wrap(room);
}

/** Host a brand-new named room; the returned room carries its own code (in state). */
export async function createRoom(name: string, title: string, avatar: string): Promise<BattleConnection> {
  const room = await new Client(endpoint).create('battle', { name, title, avatar });
  return wrap(room);
}

/** Join a specific room by its Colyseus roomId (used by both the list and code paths). */
export async function joinRoomById(roomId: string, name: string, avatar: string): Promise<BattleConnection> {
  const room = await new Client(endpoint).joinById(roomId, { name, avatar });
  return wrap(room);
}

/**
 * Subscribe to the live room browser. Connects to the 'lobby' room (battle-filtered) and
 * invokes onUpdate with the current open-room list on every change. Returns an unsubscribe
 * fn that leaves the lobby connection.
 */
export async function listLobby(onUpdate: (rooms: RoomInfo[]) => void): Promise<() => void> {
  const room = await new Client(endpoint).joinOrCreate('lobby', { filter: { name: 'battle' } });
  const byId = new Map<string, RoomInfo>();
  const emit = () => onUpdate([...byId.values()]);

  room.onMessage('rooms', (rooms: RoomInfo[]) => {
    byId.clear();
    for (const r of rooms) byId.set(r.roomId, r);
    emit();
  });
  room.onMessage('+', ([roomId, info]: [string, RoomInfo]) => { byId.set(roomId, info); emit(); });
  room.onMessage('-', (roomId: string) => { byId.delete(roomId); emit(); });

  return () => { room.leave(); };
}

export type { CardInstance, GameEvent };
