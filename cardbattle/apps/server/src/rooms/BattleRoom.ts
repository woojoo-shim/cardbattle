import { Room, Client } from '@colyseus/core';
import {
  initGame, startGame, reduce, endTurn,
  type GameState, type Action, type GameEvent,
  MIN_PLAYERS, MAX_PLAYERS, RECONNECT_SECONDS, START_HP, START_DEFENSE,
} from '@cardbattle/shared';
import { BattleState, syncToSchema } from '../schema/BattleState.js';

interface JoinOptions { name?: string; }

export class BattleRoom extends Room<BattleState> {
  maxClients = MAX_PLAYERS;
  private gs!: GameState;
  private ready = new Map<string, boolean>();
  private turnTimer?: ReturnType<typeof setTimeout>;
  private cardCounter = 0;

  private ctx() {
    return { nextCardId: () => `card-${this.cardCounter++}`, now: Date.now() };
  }

  onCreate(): void {
    this.setState(new BattleState());
    this.gs = initGame([]); // empty; players added on join (lobby)

    this.onMessage('setReady', (client, msg: { ready: boolean }) => {
      if (this.gs.phase !== 'lobby') return;
      this.ready.set(client.sessionId, !!msg.ready);
      if (this.allReady()) this.begin();
    });

    this.onMessage('action', (client, msg: Action) => {
      this.handleAction(client, msg);
    });
  }

  onJoin(client: Client, options: JoinOptions): void {
    if (this.gs.phase !== 'lobby') { client.leave(); return; }
    this.gs.players.push({
      id: client.sessionId, name: (options.name ?? 'Player').slice(0, 16),
      connected: true, seat: this.gs.players.length,
      hp: START_HP, maxHp: START_HP, defense: START_DEFENSE, hand: [], equipment: [], statuses: [], buffs: [], alive: true,
    });
    this.ready.set(client.sessionId, false);
    this.publish();
  }

  private allReady(): boolean {
    const n = this.gs.players.length;
    return n >= MIN_PLAYERS && this.gs.players.every((p) => this.ready.get(p.id));
  }

  private begin(): void {
    const r = startGame(this.gs, this.ctx());
    this.gs = r.state;
    this.publish(r.events);
    this.armTimer();
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
    else if (r.events.some((e) => e.type === 'turn_started')) { this.armTimer(); }
  }

  private armTimer(): void {
    this.clearTimer();
    const ms = Math.max(0, this.gs.turnDeadline - Date.now());
    this.turnTimer = setTimeout(() => {
      const r = endTurn(this.gs, this.ctx());
      this.gs = r.state;
      this.publish(r.events);
      if (this.gs.phase === 'ended') this.clearTimer(); else this.armTimer();
    }, ms);
  }

  private clearTimer(): void { if (this.turnTimer) clearTimeout(this.turnTimer); this.turnTimer = undefined; }

  /** Push state to schema + per-client hand + broadcast events. */
  private publish(events: GameEvent[] = []): void {
    syncToSchema(this.state, this.gs);
    this.pushHands();
    if (events.length) this.broadcast('events', events);
  }

  /** Send each connected client only their own hand contents (hidden information). */
  private pushHands(): void {
    for (const client of this.clients) {
      const p = this.gs.players.find((pp) => pp.id === client.sessionId);
      client.send('hand', p ? p.hand : []);
    }
  }

  async onLeave(client: Client, consented: boolean): Promise<void> {
    const p = this.gs.players.find((pp) => pp.id === client.sessionId);
    if (p) p.connected = false;
    this.publish();
    if (consented) return; // intentional leave: stay a passive seat, never reconnect. See spec §8.
    try {
      await this.allowReconnection(client, RECONNECT_SECONDS);
      if (p) { p.connected = true; this.publish(); }
    } catch {
      // grace expired: stay as passive seat (alive, auto-passed on their turn). See spec §8.
      if (this.gs.phase === 'playing' && this.gs.turnOrder[this.gs.currentTurnIndex] === client.sessionId) {
        const r = endTurn(this.gs, this.ctx()); this.gs = r.state; this.publish(r.events); this.armTimer();
      }
    }
  }

  onDispose(): void { this.clearTimer(); }
}
