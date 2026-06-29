import { useEffect, useRef, useState } from 'react';
import type { CardInstance, GameEvent, Action } from '@cardbattle/shared';
import { joinBattle, type BattleConnection } from '../net/client.js';

export interface UiPlayer {
  id: string;
  name: string;
  connected: boolean;
  seat: number;
  hp: number;
  maxHp: number;
  defense: number;
  alive: boolean;
  handCount: number;
}

export interface UiState {
  phase: string;
  currentTurnIndex: number;
  turnDeadline: number;
  winnerId: string;
  turnOrder: string[];
  players: UiPlayer[];
}

export interface RoomError {
  code: string;
  message: string;
}

export interface UseRoom {
  conn: BattleConnection | null;
  ui: UiState | null;
  hand: CardInstance[];
  events: GameEvent[];
  error: RoomError | null;
  send: (action: Action) => void;
  setReady: (ready: boolean) => void;
}

/** Build a plain UiState snapshot from the decoded Colyseus schema. */
function snapshot(state: any): UiState {
  const players: UiPlayer[] = [];
  state.players.forEach((p: any) => {
    players.push({
      id: p.id,
      name: p.name,
      connected: p.connected,
      seat: p.seat,
      hp: p.hp,
      maxHp: p.maxHp,
      defense: p.defense,
      alive: p.alive,
      handCount: p.handCount,
    });
  });
  players.sort((a, b) => a.seat - b.seat);
  return {
    phase: state.phase,
    currentTurnIndex: state.currentTurnIndex,
    turnDeadline: state.turnDeadline,
    winnerId: state.winnerId,
    turnOrder: Array.from(state.turnOrder as Iterable<string>),
    players,
  };
}

export function useRoom(name: string): UseRoom {
  const [conn, setConn] = useState<BattleConnection | null>(null);
  const [ui, setUi] = useState<UiState | null>(null);
  const [hand, setHand] = useState<CardInstance[]>([]);
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [error, setError] = useState<RoomError | null>(null);
  const connRef = useRef<BattleConnection | null>(null);

  useEffect(() => {
    let disposed = false;
    let active: BattleConnection | null = null;

    joinBattle(name)
      .then((c) => {
        if (disposed) { c.room.leave(); return; }
        active = c;
        connRef.current = c;
        setConn(c);
        setUi(snapshot(c.room.state));
        c.room.onStateChange((state) => setUi(snapshot(state)));
        c.room.onMessage('hand', (cards: CardInstance[]) => setHand(cards ?? []));
        c.room.onMessage('events', (evts: GameEvent[]) =>
          setEvents((prev) => [...prev, ...evts]));
        c.room.onMessage('error', (err: RoomError) => setError(err));
      })
      .catch((err) => setError({ code: 'JOIN_FAILED', message: String(err?.message ?? err) }));

    return () => {
      disposed = true;
      connRef.current = null;
      active?.room.leave();
    };
  }, [name]);

  const send = (action: Action) => connRef.current?.room.send('action', action);
  const setReady = (ready: boolean) => connRef.current?.room.send('setReady', { ready });

  return { conn, ui, hand, events, error, send, setReady };
}
