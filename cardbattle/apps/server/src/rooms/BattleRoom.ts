import { Room, Client, updateLobby } from '@colyseus/core';
import {
  initGame, startGame, reduce, endTurn, spawnPlayer,
  CARD_DEFS, requiresTarget, resolveMode,
  type GameState, type Action, type GameEvent, type PlayerState, type GameModeId,
  MIN_PLAYERS, MAX_PLAYERS, RECONNECT_SECONDS, MANA_MAX,
  BOT_AVATAR, sanitizeAvatar, GOLD_WIN, GOLD_LOSS, GOLD_1V1_WIN, EMOTE_BY_ID,
} from '@cardbattle/shared';
import { BattleState, syncToSchema } from '../schema/BattleState.js';
import { me, accountFromToken } from '../auth/auth.js';
import { recordMatch } from '../auth/store.js';

interface JoinOptions { name?: string; avatar?: string; token?: string; }
interface CreateOptions { name?: string; title?: string; avatar?: string; token?: string; mode?: GameModeId; private?: boolean; }
// Resolved by onAuth from a verified token; onJoin trusts this over client-sent name.
// `username` (when present) marks a logged-in account eligible for post-match gold.
// The equipped cosmetics ride along so the room can broadcast them to every player.
interface Auth {
  display: string; avatar: string; username: string | null;
  border: string; title: string; effect: string;
}

/** A seat's equipped cosmetics, mirrored into the schema so all clients render them. */
interface SeatCosmetics { border: string; title: string; effect: string; }
const DEFAULT_COSMETICS: SeatCosmetics = { border: 'none', title: 'title_none', effect: 'fx_none' };

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
  private unlisted = false; // a private room: hidden from the browser, joinable only by code
  private turnTimer?: ReturnType<typeof setTimeout>;
  private cardCounter = 0;
  // sessionId → account username, for awarding gold to logged-in humans when the match ends.
  private accounts = new Map<string, string>();
  // seat id (sessionId or bot id) → equipped cosmetics, mirrored to the schema each publish.
  private cosmetics = new Map<string, SeatCosmetics>();
  private awarded = false;
  // sessionId → last emote timestamp, for per-sender rate limiting.
  private emoteAt = new Map<string, number>();

  private ctx() {
    return { nextCardId: () => `card-${this.cardCounter++}`, now: Date.now() };
  }

  onCreate(options: CreateOptions = {}): void {
    this.setState(new BattleState());
    const mode = resolveMode(options.mode).id;
    this.gs = initGame([], mode); // empty; players added on join (lobby)
    this.unlisted = !!options.private;

    // Custom-room identity: a typeable code for friends + a title shown in the browser.
    this.state.code = makeCode();
    this.state.mode = mode;
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
      this.gs.players.push(spawnPlayer(this.gs.rules, this.gs.players.length, id, `봇 ${this.botCounter}`, BOT_AVATAR));
      this.bots.add(id);
      this.ready.set(id, true); // bots are always ready
      this.publish();
      if (this.allReady()) this.begin();
    });

    // Quick-emote: a seated player broadcasts a preset reaction to the whole table.
    // Rate-limited (one per ~1.2s per sender) so it can't be spammed. Validates the emote
    // id against the shared preset list — free text is impossible by construction.
    this.onMessage('emote', (client, msg: { id?: string }) => {
      const emote = msg?.id ? EMOTE_BY_ID[msg.id] : undefined;
      if (!emote) return;
      if (!this.gs.players.some((p) => p.id === client.sessionId)) return; // must be seated
      const last = this.emoteAt.get(client.sessionId) ?? 0;
      const now = Date.now();
      if (now - last < 1200) return; // rate limit
      this.emoteAt.set(client.sessionId, now);
      this.broadcast('emote', { playerId: client.sessionId, id: emote.id });
    });

    this.onMessage('removeBot', (_client, msg: { botId?: string } = {}) => {
      if (this.gs.phase !== 'lobby') return;
      // Remove the named bot, or the most-recently-added one if no id is given.
      const botId = msg?.botId && this.bots.has(msg.botId) ? msg.botId : [...this.bots].pop();
      if (!botId) return;
      const idx = this.gs.players.findIndex((p) => p.id === botId);
      if (idx < 0) return;
      this.gs.players.splice(idx, 1);
      this.gs.players.forEach((p, i) => { p.seat = i; }); // reindex seats after removal
      this.bots.delete(botId);
      this.ready.delete(botId);
      this.publish();
    });
  }

  // Verify the account token (if any). A valid token pins the seat to the account's
  // display name so a player can't spoof another account's name; guests (no token)
  // get an empty Auth and fall through to the client-supplied name in onJoin. onAuth
  // must return a truthy value or Colyseus rejects the join, so guests get {} not null.
  onAuth(_client: Client, options: JoinOptions): Auth {
    const profile = me(options.token);
    if (profile) return {
      display: profile.display, avatar: profile.avatar, username: profile.username,
      border: profile.equippedBorder, title: profile.equippedTitle, effect: profile.equippedEffect,
    };
    return { display: '', avatar: '', username: accountFromToken(options.token), ...DEFAULT_COSMETICS };
  }

  onJoin(client: Client, options: JoinOptions): void {
    if (this.gs.phase !== 'lobby') { client.leave(); return; }
    const auth = client.auth as Auth;
    if (auth.username) this.accounts.set(client.sessionId, auth.username);
    this.cosmetics.set(client.sessionId, { border: auth.border, title: auth.title, effect: auth.effect });
    const name = auth.display || (options.name ?? 'Player').slice(0, 16);
    const avatar = auth.avatar || options.avatar;
    this.gs.players.push(spawnPlayer(this.gs.rules, this.gs.players.length, client.sessionId, name, sanitizeAvatar(avatar)));
    this.ready.set(client.sessionId, false);
    this.publish();
  }

  /** Publish this room's summary to the real-time lobby browser (title, code, headcount). */
  private refreshLobby(): void {
    this.setMetadata({
      title: this.state.title,
      code: this.state.code,
      mode: this.gs.mode,
      unlisted: this.unlisted,
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

  /** A bot plays useful cards one at a time — as many as its mana affords — then ends its turn.
   *  Each play is spaced out so the table can watch a multi-card turn unfold, not a single burst. */
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
      // Loop: keep taking affordable actions this same turn, then end when nothing's worth playing.
      this.turnTimer = setTimeout(() => this.botTurn(), 700);
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

  /** Simple bot policy: heal when badly hurt, else play the first useful affordable card. Only
   *  ever returns actions the bot can currently pay for — the caller loops until this yields null. */
  private chooseBotAction(bot: PlayerState): Action | null {
    const opponents = this.gs.players.filter((p) => p.alive && p.id !== bot.id);
    const has = (card: { defId: string }, kind: string, target?: string) =>
      CARD_DEFS[card.defId]?.effects.some((e) => e.kind === kind && (target === undefined || (e as any).target === target)) ?? false;
    const affordable = (card: { defId: string }) => (CARD_DEFS[card.defId]?.cost ?? 99) <= bot.mana;

    // 1. Badly hurt: prefer a pure self-heal (potion/대회복), not a targeted lifesteal.
    if (bot.hp < bot.maxHp * 0.5) {
      const healCard = bot.hand.find((c) => affordable(c) && has(c, 'heal') && !requiresTarget(CARD_DEFS[c.defId]!));
      if (healCard) return { type: 'play_card', cardInstanceId: healCard.id };
    }

    // 2. Otherwise act on the first playable (affordable) card in hand order.
    for (const card of bot.hand) {
      const def = CARD_DEFS[card.defId];
      if (!def || !affordable(card)) continue;
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
      // '역류'(reverse) has no direct value to the bot's heuristic — it simply skips it.
    }

    // 3. Nothing better to do this turn: bank mana with '충전' if it's still worth it (not near cap).
    const chargeCard = bot.hand.find((c) => affordable(c) && has(c, 'mana') && bot.mana <= MANA_MAX - 3);
    if (chargeCard) return { type: 'play_card', cardInstanceId: chargeCard.id };

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
    // Mirror each seat's equipped cosmetics onto its schema player so all clients render them.
    // These live outside the pure GameState, so they're applied here rather than in syncToSchema.
    for (const [id, ps] of this.state.players) {
      const cos = this.cosmetics.get(id) ?? DEFAULT_COSMETICS;
      ps.border = cos.border; ps.titleCosmetic = cos.title; ps.effectCosmetic = cos.effect;
    }
    this.pushHands();
    if (this.gs.phase === 'lobby') this.refreshLobby(); // keep the browser headcount live; no churn mid-game
    if (!this.awarded && events.some((e) => e.type === 'game_over')) {
      this.awarded = true; // guard: award exactly once even if publish runs again
      this.awardGold();
    }
    if (events.length) this.sendEvents(events);
  }

  /** Grant post-match gold to every logged-in human seat (guests/bots earn nothing). Winning a
   *  3+ player match pays GOLD_WIN; losing pays a GOLD_LOSS consolation. Winning a 1v1 (2 seats
   *  total) pays nothing — anti-farm so you can't grind gold against a single bot/friend. The
   *  store persists the new balance + W/L for auto-login. */
  private awardGold(): void {
    const winnerId = this.gs.winnerId;
    const isOneVsOne = this.gs.players.length <= 2;
    for (const p of this.gs.players) {
      if (this.bots.has(p.id)) continue;
      const username = this.accounts.get(p.id);
      if (!username) continue; // guest
      const won = p.id === winnerId;
      const gold = won ? (isOneVsOne ? GOLD_1V1_WIN : GOLD_WIN) : GOLD_LOSS;
      recordMatch(username, won, gold);
    }
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
      this.cosmetics.delete(client.sessionId);
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
