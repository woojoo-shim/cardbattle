import { useEffect, useRef, useState } from 'react';
import type { CardInstance, GameEvent, Action } from '@cardbattle/shared';
import type { BattleConnection } from '../net/client.js';
import { reconnect as reconnectRoom } from '../net/client.js';

/** Live socket health, surfaced so the UI can overlay a "재접속 중" / "연결 끊김" state.
 *  'live' = connected; 'reconnecting' = a drop is being retried; 'lost' = grace window elapsed. */
export type ConnStatus = 'live' | 'reconnecting' | 'lost';

// While seated in a live room we stash the reconnection token so a full page refresh can rejoin
// the same seat. Cleared on a deliberate leave or once the match ends (nothing to rejoin).
const RESUME_KEY = 'cb_resume';
export function readResumeToken(): string | null {
  try {
    const raw = sessionStorage.getItem(RESUME_KEY);
    if (!raw) return null;
    const { token, ts } = JSON.parse(raw) as { token: string; ts: number };
    // The server grace is ~30s; give the reload a little slack, then treat it as too old.
    if (!token || Date.now() - ts > 40_000) { sessionStorage.removeItem(RESUME_KEY); return null; }
    return token;
  } catch { return null; }
}
function writeResumeToken(token: string): void {
  try { sessionStorage.setItem(RESUME_KEY, JSON.stringify({ token, ts: Date.now() })); } catch { /* ignore */ }
}
function clearResumeToken(): void {
  try { sessionStorage.removeItem(RESUME_KEY); } catch { /* ignore */ }
}

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

/** A live emote bubble to draw over a seat. `key` is unique so re-sending the same
 * emote restarts its bubble; the layer removes it when it expires. */
export interface LiveEmote {
  key: number;
  playerId: string;
  id: string;
}

/** Post-match payout for this client, delivered the moment the game ends. `balance` is the
 *  account's new gold total (null for guests, who earn nothing). */
export interface Reward {
  earned: number;
  balance: number | null;
  won: boolean;
  guest: boolean;
}

export interface UseRoom {
  conn: BattleConnection | null;
  ui: UiState | null;
  hand: CardInstance[];
  events: GameEvent[];
  error: RoomError | null;
  emotes: LiveEmote[];
  reward: Reward | null;
  /** Wall-clock time (ms) the public-lobby bot auto-fill lands, or 0 when no countdown is running. */
  autofillDeadline: number;
  /** Socket health, so the UI can overlay a reconnecting / lost banner. */
  status: ConnStatus;
  send: (action: Action) => void;
  setReady: (ready: boolean) => void;
  addBot: () => void;
  removeBot: (botId?: string) => void;
  sendEmote: (id: string) => void;
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
  const [emotes, setEmotes] = useState<LiveEmote[]>([]);
  const [reward, setReward] = useState<Reward | null>(null);
  const [autofillDeadline, setAutofillDeadline] = useState(0);
  const [status, setStatus] = useState<ConnStatus>('live');
  const connRef = useRef<BattleConnection | null>(null);
  const emoteKey = useRef(0);

  useEffect(() => {
    let disposed = false;
    let active: BattleConnection | null = null;
    let ended = false;      // once the match is over there's nothing to rejoin — don't reconnect
    let playing = false;    // only a started match reserves a seat for reconnection (lobby seats don't)
    let tries = 0;          // reconnect attempts spent in the current drop
    let retryTimer: ReturnType<typeof setTimeout> | undefined;

    // Attach all room listeners. Called on the first join and again after each successful
    // reconnect (the reconnected room is a fresh object needing its own handlers).
    const wire = (c: BattleConnection) => {
      active = c;
      connRef.current = c;
      setConn(c);
      setStatus('live');
      const first = snapshot(c.room.state);
      setUi(first);
      // The seat is only reconnectable once the match is underway; keep the resume token in
      // step with phase so a refresh in the lobby (where the server drops the seat) won't try.
      playing = first.phase === 'playing';
      if (playing) writeResumeToken(c.reconnectionToken); else clearResumeToken();
      c.room.onStateChange((state) => {
        const st = snapshot(state);
        setUi(st);
        playing = st.phase === 'playing';
        if (playing) writeResumeToken(c.reconnectionToken);
        else if (st.phase !== 'playing') clearResumeToken();
      });
      c.room.onMessage('hand', (cards: CardInstance[]) => setHand(cards ?? []));
      c.room.onMessage('events', (evts: GameEvent[]) => {
        if (evts.some((e) => e.type === 'game_over')) { ended = true; clearResumeToken(); }
        setEvents((prev) => [...prev, ...evts]);
      });
      c.room.onMessage('error', (err: RoomError) => setError(err));
      c.room.onMessage('reward', (r: Reward) => setReward(r));
      c.room.onMessage('autofill', (m: { deadline: number }) => setAutofillDeadline(m?.deadline ?? 0));
      c.room.onMessage('emote', (m: { playerId: string; id: string }) => {
        // One bubble per player at a time: replace any existing bubble for this seat,
        // then auto-dismiss this one after it has been on screen a few seconds.
        const key = ++emoteKey.current;
        setEmotes((prev) => [...prev.filter((e) => e.playerId !== m.playerId), { key, playerId: m.playerId, id: m.id }]);
        setTimeout(() => setEmotes((prev) => prev.filter((e) => e.key !== key)), 3200);
      });
      // Socket closed. A deliberate unmount (disposed) or a finished match needs no action;
      // anything else is a drop — retry with the reconnection token inside the server's grace.
      c.room.onLeave(() => {
        if (disposed || ended || !playing) return; // lobby / finished seats aren't reconnectable
        setStatus('reconnecting');
        tryReconnect(c.reconnectionToken);
      });
    };

    const tryReconnect = (token: string) => {
      if (disposed) return;
      reconnectRoom(token)
        .then((c2) => { tries = 0; wire(c2); })
        .catch(() => {
          if (disposed) return;
          // Back off and retry a handful of times; past the grace window, give up gracefully.
          if (++tries <= 8) retryTimer = setTimeout(() => tryReconnect(token), 2000);
          else { setStatus('lost'); clearResumeToken(); }
        });
    };

    connect()
      .then((c) => {
        if (disposed) { c.room.leave(); return; }
        wire(c);
      })
      .catch((err) => setError({ code: 'JOIN_FAILED', message: String(err?.message ?? err) }));

    return () => {
      disposed = true;
      connRef.current = null;
      if (retryTimer) clearTimeout(retryTimer);
      clearResumeToken();
      active?.room.leave();
    };
  }, [connect]);

  const send = (action: Action) => connRef.current?.room.send('action', action);
  const setReady = (ready: boolean) => connRef.current?.room.send('setReady', { ready });
  const addBot = () => connRef.current?.room.send('addBot');
  const removeBot = (botId?: string) => connRef.current?.room.send('removeBot', botId ? { botId } : {});
  const sendEmote = (id: string) => connRef.current?.room.send('emote', { id });

  return { conn, ui, hand, events, error, emotes, reward, autofillDeadline, status, send, setReady, addBot, removeBot, sendEmote };
}
