import { Client, Room } from 'colyseus.js';
import type { CardInstance, GameEvent } from '@cardbattle/shared';

const endpoint = `ws://${location.hostname}:2567`;

export interface BattleConnection {
  room: Room;
  sessionId: string;
}

export async function joinBattle(name: string): Promise<BattleConnection> {
  const client = new Client(endpoint);
  const room = await client.joinOrCreate('battle', { name });
  return { room, sessionId: room.sessionId };
}

export type { CardInstance, GameEvent };
