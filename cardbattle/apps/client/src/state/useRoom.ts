import { useEffect, useRef, useState } from 'react';
import type { CardInstance, GameEvent, Action } from '@cardbattle/shared';
import type { BattleConnection } from '../net/client.js';

export interface UiPlayer {
  id: string;
  name: string;
  avatar: string;
  connected: boolean;
  seat: number;
  hp: number;
  maxHp: number;
  defense: number;
  alive: boolean;
  handCount: number;
  skipTurns: number;
  mana: number;
  /** Equipped cosmetics, broadcast from the server so every player sees them. */
  border: string;
  title: string;
  effect: string;
}

export interface UiState {
  code: string;
  title: string;
  mode: string;
  phase: string;
  currentTurnIndex: number;
  turnDir: number;
  roundCount: number;
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
  addBot: () => void;
  removeBot: (botId?: string) => void;
}

/** Build a plain UiState snapshot from the decoded Colyseus schema. */
function snapshot(state: any): UiState {
  const players: UiPlayer[] = [];
  // state.players / turnOrder can be undefined for a tick after join, before the first sync.
  state.players?.forEach((p: any) => {
    players.push({
      id: p.id,
      name: p.name,
      avatar: p.avatar ?? '',
      connected: p.connected,
      seat: p.seat,
      hp: p.hp,
      maxHp: p.maxHp,
      defense: p.defense,
      alive: p.alive,
      handCount: p.handCount,
      skipTurns: p.skipTurns ?? 0,
      mana: p.mana ?? 0,
      border: p.border ?? 'none',
      title: p.titleCosmetic ?? 'title_none',
      effect: p.effectCosmetic ?? 'fx_none',
    });
  });
  players.sort((a, b) => a.seat - b.seat);
  return {
    code: state.code ?? '',
    title: state.title ?? '',
    mode: state.mode ?? 'standard',
    phase: state.phase,
    currentTurnIndex: state.currentTurnIndex,
    turnDir: state.turnDir ?? 1,
    roundCount: state.roundCount ?? 1,
    turnDeadline: state.turnDeadline,
    winnerId: state.winnerId,
    turnOrder: state.turnOrder ? Array.from(state.turnOrder as Iterable<string>) : [],
    players,
  };
}

/** `connect` establishes (or re-establishes) the battle connection — create / joinById /
 * quickPlay are all supplied by the caller, so this hook is transport-agnostic. */
export function useRoom(connect: () => Promise<BattleConnection>): UseRoom {
  const [conn, setConn] = useState<BattleConnection | null>(null);
  const [ui, setUi] = useState<UiState | null>(null);
  const [hand, setHand] = useState<CardInstance[]>([]);
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [error, setError] = useState<RoomError | null>(null);
  const connRef = useRef<BattleConnection | null>(null);

  useEffect(() => {
    let disposed = false;
    let active: BattleConnection | null = null;

    connect()
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
  }, [connect]);

  const send = (action: Action) => connRef.current?.room.send('action', action);
  const setReady = (ready: boolean) => connRef.current?.room.send('setReady', { ready });
  const addBot = () => connRef.current?.room.send('addBot');
  const removeBot = (botId?: string) => connRef.current?.room.send('removeBot', botId ? { botId } : {});

  return { conn, ui, hand, events, error, send, setReady, addBot, removeBot };
}
