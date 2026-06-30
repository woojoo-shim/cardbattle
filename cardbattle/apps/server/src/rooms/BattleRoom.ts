import { Room, Client, updateLobby } from '@colyseus/core';
import {
  initGame, startGame, reduce, endTurn,
  CARD_DEFS, requiresTarget,
  type GameState, type Action, type GameEvent, type PlayerState,
  MIN_PLAYERS, MAX_PLAYERS, RECONNECT_SECONDS, START_HP, START_DEFENSE,
} from '@cardbattle/shared';
import { BattleState, syncToSchema } from '../schema/BattleState.js';

interface JoinOptions { name?: string; }
interface CreateOptions { name?: string; title?: string; }

/** Short, friendly, unambiguous room code (no 0/O/1/I) friends can type to join. */
function makeCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 4; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
  return s;
}

export class BattleRoom extends Room<BattleState> {
  maxClients = MAX_PLAYERS;
  private gs!: GameState;
  private ready = new Map<string, boolean>();
  private bots = new Set<string>();
  private botCounter = 0;
  private turnTimer?: ReturnType<typeof setTimeout>;
  private cardCounter = 0;

  private ctx() {
    return { nextCardId: () => `card-${this.cardCounter++}`, now: Date.now() };
  }

  onCreate(options: CreateOptions = {}): void {
    this.setState(new BattleState());
    this.gs = initGame([]); // empty; players added on join (lobby)

    // Custom-room identity: a typeable code for friends + a title shown in the browser.
    this.state.code = makeCode();
    this.state.title = (options.title ?? '').slice(0, 24) || `${options.name ?? '누군가'}의 방`;
    this.refreshLobby();

    this.onMessage('setReady', (client, msg: { ready: boolean }) => {
      if (this.gs.phase !== 'lobby') return;
      this.ready.set(client.sessionId, !!msg.ready);
      if (this.allReady()) this.begin();
    });

    this.onMessage('action', (client, msg: Action) => {
      this.handleAction(client, msg);
    });

    this.onMessage('addBot', () => {
      if (this.gs.phase !== 'lobby') return;
      if (this.gs.players.length >= MAX_PLAYERS) return;
      const id = `bot-${this.botCounter++}`;
      this.gs.players.push({
        id, name: `봇 ${this.botCounter}`,
        connected: true, seat: this.gs.players.length,
        hp: START_HP, maxHp: START_HP, defense: START_DEFENSE, hand: [], equipment: [], statuses: [], buffs: [], alive: true,
        skipTurns: 0, gamble: false, empower: 1,
      });
      this.bots.add(id);
      this.ready.set(id, true); // bots are always ready
      this.publish();
      if (this.allReady()) this.begin();
    });
  }

  onJoin(client: Client, options: JoinOptions): void {
    if (this.gs.phase !== 'lobby') { client.leave(); return; }
    this.gs.players.push({
      id: client.sessionId, name: (options.name ?? 'Player').slice(0, 16),
      connected: true, seat: this.gs.players.length,
      hp: START_HP, maxHp: START_HP, defense: START_DEFENSE, hand: [], equipment: [], statuses: [], buffs: [], alive: true,
      skipTurns: 0, gamble: false, empower: 1,
    });
    this.ready.set(client.sessionId, false);
    this.publish();
  }

  /** Publish this room's summary to the real-time lobby browser (title, code, headcount). */
  private refreshLobby(): void {
    this.setMetadata({
      title: this.state.title,
      code: this.state.code,
      players: this.gs.players.length,
      started: this.gs.phase !== 'lobby',
    }).then(() => updateLobby(this)).catch(() => {});
  }

  private allReady(): boolean {
    const n = this.gs.players.length;
    return n >= MIN_PLAYERS && this.gs.players.every((p) => this.ready.get(p.id));
  }

  private begin(): void {
    // Once the match starts the room leaves the lobby for good. Lock it so the matchmaker
    // routes new joiners to a fresh lobby room instead of this (started/ended) one, which
    // onJoin would reject — surfacing as "연결 실패" on the client. Reconnection bypasses lock.
    this.lock();
    const r = startGame(this.gs, this.ctx());
    this.gs = r.state;
    this.refreshLobby(); // mark started:true so the browser drops this room from its list
    this.publish(r.events);
    this.afterCurrent();
  }

  /** After a turn (re)starts: end the game, auto-drive a bot, or arm the human deadline. */
  private afterCurrent(): void {
    this.clearTimer();
    if (this.gs.phase !== 'playing') return;
    const cur = this.gs.turnOrder[this.gs.currentTurnIndex];
    if (this.bots.has(cur)) {
      this.turnTimer = setTimeout(() => this.botTurn(), 900);
    } else {
      this.armTimer();
    }
  }

  /** A bot plays one useful card (if any) then ends its turn. */
  private botTurn(): void {
    if (this.gs.phase !== 'playing') return;
    const cur = this.gs.turnOrder[this.gs.currentTurnIndex];
    if (!this.bots.has(cur)) return;
    const bot = this.gs.players.find((p) => p.id === cur);
    if (!bot) return;
    const action = this.chooseBotAction(bot);
    if (action) {
      const r = reduce(this.gs, action, this.ctx());
      this.gs = r.state; this.publish(r.events);
      if (this.gs.phase === 'ended') { this.clearTimer(); return; }
      this.turnTimer = setTimeout(() => this.botEndTurn(), 700);
    } else {
      this.botEndTurn();
    }
  }

  private botEndTurn(): void {
    if (this.gs.phase !== 'playing') return;
    const r = endTurn(this.gs, this.ctx());
    this.gs = r.state; this.publish(r.events);
    this.afterCurrent();
  }

  /** Simple bot policy: heal when badly hurt, else play the first useful attack/utility card. */
  private chooseBotAction(bot: PlayerState): Action | null {
    const opponents = this.gs.players.filter((p) => p.alive && p.id !== bot.id);
    const has = (card: { defId: string }, kind: string, target?: string) =>
      CARD_DEFS[card.defId]?.effects.some((e) => e.kind === kind && (target === undefined || (e as any).target === target)) ?? false;

    // 1. Badly hurt: prefer a pure self-heal (potion/대회복), not a targeted lifesteal.
    if (bot.hp < bot.maxHp * 0.5) {
      const healCard = bot.hand.find((c) => has(c, 'heal') && !requiresTarget(CARD_DEFS[c.defId]!));
      if (healCard) return { type: 'play_card', cardInstanceId: healCard.id };
    }

    // 2. Otherwise act on the first playable card in hand order.
    for (const card of bot.hand) {
      const def = CARD_DEFS[card.defId];
      if (!def) continue;
      if (requiresTarget(def)) {
        if (opponents.length > 0) {
          const target = opponents[Math.floor(Math.random() * opponents.length)];
          return { type: 'play_card', cardInstanceId: card.id, targetId: target.id };
        }
        continue;
      }
      if (has(card, 'damage', 'all') || has(card, 'damage', 'random')) {
        if (opponents.length > 0) return { type: 'play_card', cardInstanceId: card.id };
        continue;
      }
      if (has(card, 'heal') && bot.hp < bot.maxHp) return { type: 'play_card', cardInstanceId: card.id };
      if (has(card, 'shield') && bot.defense < 8) return { type: 'play_card', cardInstanceId: card.id };
      // '역류'(reverse) has no direct value to the bot's heuristic — it simply ends its turn.
    }
    return null;
  }

  private handleAction(client: Client, action: Action): void {
    if (this.gs.phase !== 'playing') return;
    const currentId = this.gs.turnOrder[this.gs.currentTurnIndex];
    if (client.sessionId !== currentId) { client.send('error', { code: 'NOT_YOUR_TURN', message: '당신의 턴이 아닙니다.' }); return; }

    const before = this.gs;
    const r = action.type === 'end_turn' ? endTurn(this.gs, this.ctx()) : reduce(this.gs, action, this.ctx());
    if (r.events.length === 0 && r.state === before) {
      client.send('error', { code: 'INVALID_ACTION', message: '실행할 수 없는 행동입니다.' });
      return;
    }
    this.gs = r.state;
    this.publish(r.events);
    if (this.gs.phase === 'ended') { this.clearTimer(); }
    else if (r.events.some((e) => e.type === 'turn_started')) { this.afterCurrent(); }
  }

  private armTimer(): void {
    this.clearTimer();
    const ms = Math.max(0, this.gs.turnDeadline - Date.now());
    this.turnTimer = setTimeout(() => {
      const r = endTurn(this.gs, this.ctx());
      this.gs = r.state;
      this.publish(r.events);
      this.afterCurrent();
    }, ms);
  }

  private clearTimer(): void { if (this.turnTimer) clearTimeout(this.turnTimer); this.turnTimer = undefined; }

  /**
   * Push state to schema + per-client hand + broadcast events.
   * Ordering is a contract: 'hand' (pushHands) MUST be sent before 'events' so a client
   * that awaits the start 'events' broadcast already has its dealt hand applied.
   */
  private publish(events: GameEvent[] = []): void {
    syncToSchema(this.state, this.gs);
    this.pushHands();
    if (this.gs.phase === 'lobby') this.refreshLobby(); // keep the browser headcount live; no churn mid-game
    if (events.length) this.sendEvents(events);
  }

  /**
   * Broadcast the event stream, but keep private reveals (card_revealed) hidden from
   * everyone except their viewer — otherwise '간파' would leak the peeked card to the table.
   * Each client receives the public events plus only the reveals addressed to them, in order.
   */
  private sendEvents(events: GameEvent[]): void {
    if (!events.some((e) => e.type === 'card_revealed')) { this.broadcast('events', events); return; }
    for (const client of this.clients) {
      const visible = events.filter((e) => e.type !== 'card_revealed' || e.viewerId === client.sessionId);
      if (visible.length) client.send('events', visible);
    }
  }

  /** Send each connected client only their own hand contents (hidden information). */
  private pushHands(): void {
    for (const client of this.clients) {
      const p = this.gs.players.find((pp) => pp.id === client.sessionId);
      client.send('hand', p ? p.hand : []);
    }
  }

  async onLeave(client: Client, consented: boolean): Promise<void> {
    // In the lobby a leaver is removed outright (no in-game seat to preserve). This also
    // cleans up the throwaway connection React StrictMode makes during dev double-mounts.
    if (this.gs.phase === 'lobby') {
      const idx = this.gs.players.findIndex((pp) => pp.id === client.sessionId);
      if (idx >= 0) this.gs.players.splice(idx, 1);
      this.gs.players.forEach((pp, i) => { pp.seat = i; }); // reindex so a new joiner's seat can't collide
      this.ready.delete(client.sessionId);
      this.publish();
      return;
    }
    const p = this.gs.players.find((pp) => pp.id === client.sessionId);
    if (p) p.connected = false;
    this.publish();
    if (consented) return; // intentional leave: stay a passive seat, never reconnect. See spec §8.
    try {
      await this.allowReconnection(client, RECONNECT_SECONDS);
      if (p) { p.connected = true; this.publish(); }
    } catch {
      // grace expired: stay as passive seat (alive, auto-passed on their turn). See spec §8.
      // Guard against racing the turnTimer: only end the turn if it is still this player's,
      // and clearTimer() first so a pending turnTimer callback cannot double-advance the turn.
      if (this.gs.phase === 'playing' && this.gs.turnOrder[this.gs.currentTurnIndex] === client.sessionId) {
        this.clearTimer();
        const r = endTurn(this.gs, this.ctx()); this.gs = r.state; this.publish(r.events); this.afterCurrent();
      }
    }
  }

  onDispose(): void { this.clearTimer(); }
}
