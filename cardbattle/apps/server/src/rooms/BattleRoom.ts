import { Room, Client, updateLobby } from '@colyseus/core';
import {
  initGame, startGame, reduce, endTurn, spawnPlayer,
  CARD_DEFS, requiresTarget, resolveMode,
  type GameState, type Action, type GameEvent, type PlayerState, type GameModeId, type CardDef,
  MIN_PLAYERS, MAX_PLAYERS, RECONNECT_SECONDS, AUTOFILL_SECONDS,
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
  // Public-lobby auto-fill countdown: when the present humans are all ready but the room is
  // short of players, this timer fires to top up with bots and begin. `fillDeadline` is the
  // wall-clock time it lands, echoed to clients so they can render a live countdown.
  private fillTimer?: ReturnType<typeof setTimeout>;
  private fillDeadline = 0;
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

    // Coach/tutorial rooms are solo practice: seed one bot up front so the newcomer only has to
    // ready up (no lobby fumbling), then drop straight into the guided match against it.
    if (mode === 'coach') {
      const id = `bot-${this.botCounter++}`;
      this.gs.players.push(spawnPlayer(this.gs.rules, this.gs.players.length, id, '연습 상대', BOT_AVATAR));
      this.bots.add(id);
      this.ready.set(id, true);
    }

    this.refreshLobby();

    this.onMessage('setReady', (client, msg: { ready: boolean }) => {
      if (this.gs.phase !== 'lobby') return;
      this.ready.set(client.sessionId, !!msg.ready);
      if (this.allReady()) this.begin();
      else this.evaluateAutofill();
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
      else this.evaluateAutofill();
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
      this.evaluateAutofill();
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
    this.evaluateAutofill(); // a new arrival un-readies the room; recheck the fill countdown
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

  /** True when at least one human is seated and every human has readied up. Bots are always
   *  ready, so this is the "the people are set, we're only short of bodies" signal. */
  private humansReady(): boolean {
    const humans = this.gs.players.filter((p) => !this.bots.has(p.id));
    return humans.length >= 1 && humans.every((p) => this.ready.get(p.id));
  }

  /** Keep the public-lobby auto-fill countdown in sync with the room. Arms a countdown when the
   *  humans are all ready but the room is short of MIN_PLAYERS; cancels it the moment that's no
   *  longer true (someone un-readies, a human joins, enough players gather). Private rooms opt out. */
  private evaluateAutofill(): void {
    if (this.gs.phase !== 'lobby' || this.unlisted) { this.cancelAutofill(); return; }
    const wants = this.humansReady() && this.gs.players.length < MIN_PLAYERS;
    if (!wants) { this.cancelAutofill(); return; }
    if (this.fillTimer) return; // already counting down
    this.fillDeadline = Date.now() + AUTOFILL_SECONDS * 1000;
    this.broadcast('autofill', { deadline: this.fillDeadline });
    this.fillTimer = setTimeout(() => this.runAutofill(), AUTOFILL_SECONDS * 1000);
  }

  private cancelAutofill(): void {
    if (!this.fillTimer) return;
    clearTimeout(this.fillTimer);
    this.fillTimer = undefined;
    this.fillDeadline = 0;
    this.broadcast('autofill', { deadline: 0 }); // 0 tells clients to hide the countdown
  }

  /** Countdown elapsed: top the room up to MIN_PLAYERS with bots, then start the match. */
  private runAutofill(): void {
    this.fillTimer = undefined;
    this.fillDeadline = 0;
    if (this.gs.phase !== 'lobby' || !this.humansReady()) return; // conditions changed under us
    while (this.gs.players.length < MIN_PLAYERS) {
      const id = `bot-${this.botCounter++}`;
      this.gs.players.push(spawnPlayer(this.gs.rules, this.gs.players.length, id, `봇 ${this.botCounter}`, BOT_AVATAR));
      this.bots.add(id);
      this.ready.set(id, true);
    }
    this.begin();
  }

  private begin(): void {
    this.cancelAutofill();
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
      // Paced so each play still lands with weight (the client hurl+impact reads in ~850ms) — but
      // no longer than that, so a multi-card bot turn stays snappy instead of dragging.
      this.turnTimer = setTimeout(() => this.botTurn(), 900);
    } else {
      // A short held beat before the turn passes, so the table isn't yanked to the next seat.
      this.turnTimer = setTimeout(() => this.botEndTurn(), 450);
    }
  }

  private botEndTurn(): void {
    if (this.gs.phase !== 'playing') return;
    const r = endTurn(this.gs, this.ctx());
    this.gs = r.state; this.publish(r.events);
    this.afterCurrent();
  }

  /** Tactical bot policy. Priority ladder, one action per call (the caller loops until null):
   *    1) LETHAL   — finish any opponent it can outright kill (accounts for shield & pierce)
   *    2) SURVIVE  — badly hurt → the biggest self-heal it can afford
   *    3) STRIKE   — focus-fire the weakest foe for the most removed HP; value AoE by how many it hits;
   *                  disrupt the strongest foe (bind/steal/manaburn); swap HP when frail
   *    4) BANK     — nothing worth doing → ramp mana (charge/meditate)
   *  This makes a solo game feel like a real opponent: it never wastes a nuke, never scatters damage,
   *  and it WILL close the gap and finish you off when you drop low. */
  private chooseBotAction(bot: PlayerState): Action | null {
    const opponents = this.gs.players.filter((p) => p.alive && p.id !== bot.id);
    if (opponents.length === 0) return null;
    const manaMax = this.gs.rules.manaMax;
    const play = (id: string, targetId?: string): Action =>
      targetId ? { type: 'play_card', cardInstanceId: id, targetId } : { type: 'play_card', cardInstanceId: id };

    const byWeak = [...opponents].sort((a, b) => (a.hp + a.defense) - (b.hp + b.defense) || a.hp - b.hp);
    const weakest = byWeak[0];
    const strongest = [...opponents].sort((a, b) => (b.hp + b.defense) - (a.hp + a.defense) || b.hp - a.hp)[0];

    const sumBy = (def: CardDef, kind: string, chosenOnly = false) =>
      def.effects.filter((e) => e.kind === kind && (!chosenOnly || (e as any).target === 'chosen'))
                 .reduce((s, e) => s + ((e as any).amount ?? 0), 0);
    const hasKind = (def: CardDef, kind: string) => def.effects.some((e) => e.kind === kind);
    // HP actually removed from `opp` by single-targeting this card (defense soaks normal, pierce bypasses,
    // desperation scales with our own missing HP).
    const removedFrom = (def: CardDef, opp: PlayerState) => {
      let normal = sumBy(def, 'damage', true);
      const desp = def.effects.filter((e) => e.kind === 'desperation').reduce((s, e) => s + (e as any).amount, 0);
      if (desp) normal += desp + (bot.maxHp - bot.hp);
      const pierce = sumBy(def, 'pierce');
      return pierce + Math.max(0, normal - opp.defense);
    };
    // HP removed from `opp` by an AoE (damage all / leech) that hits everyone.
    const aoeRemovedFrom = (def: CardDef, opp: PlayerState) => {
      const all = def.effects.filter((e) => e.kind === 'damage' && (e as any).target === 'all').reduce((s, e) => s + (e as any).amount, 0);
      const raw = all + sumBy(def, 'leech');
      return raw > 0 ? Math.max(0, raw - opp.defense) : 0;
    };

    const hand = bot.hand.map((c) => ({ inst: c, def: CARD_DEFS[c.defId]! })).filter((h) => h.def && h.def.cost <= bot.mana);
    if (hand.length === 0) return null;

    // 1) LETHAL — the smart kill. Take the cheapest card that finishes a foe.
    let lethal: { action: Action; cost: number } | null = null;
    for (const h of hand) {
      if (requiresTarget(h.def)) {
        if (!(hasKind(h.def, 'damage') || hasKind(h.def, 'pierce') || hasKind(h.def, 'desperation'))) continue;
        const victim = opponents.filter((o) => removedFrom(h.def, o) >= o.hp).sort((a, b) => a.hp - b.hp)[0];
        if (victim && (!lethal || h.def.cost < lethal.cost)) lethal = { action: play(h.inst.id, victim.id), cost: h.def.cost };
      } else if (aoeRemovedFrom(h.def, weakest) >= weakest.hp && aoeRemovedFrom(h.def, weakest) > 0) {
        if (!lethal || h.def.cost < lethal.cost) lethal = { action: play(h.inst.id), cost: h.def.cost };
      }
    }
    if (lethal) return lethal.action;

    // 2) SURVIVE — badly hurt: the strongest self-heal available (else a lifesteal on the weakest).
    if (bot.hp < bot.maxHp * 0.45) {
      const heal = hand.filter((h) => sumBy(h.def, 'heal') > 0 && !requiresTarget(h.def) && !hasKind(h.def, 'selfskip'))
                       .sort((a, b) => sumBy(b.def, 'heal') - sumBy(a.def, 'heal'))[0];
      if (heal) return play(heal.inst.id);
      const drain = hand.find((h) => sumBy(h.def, 'heal') > 0 && requiresTarget(h.def) && removedFrom(h.def, weakest) > 0);
      if (drain) return play(drain.inst.id, weakest.id);
    }

    // 3) STRIKE / control — score every affordable play, take the best.
    const cands: { score: number; action: Action }[] = [];
    const consider = (score: number, action: Action) => { if (score > 0) cands.push({ score, action }); };
    for (const h of hand) {
      const d = h.def;
      if (requiresTarget(d)) {
        const removed = removedFrom(d, weakest);
        if (removed > 0) consider(removed * 3 - d.cost, play(h.inst.id, weakest.id));       // focus-fire
        if (hasKind(d, 'skip')) consider(9 - d.cost, play(h.inst.id, strongest.id));        // lock down the threat
        if (hasKind(d, 'steal') || hasKind(d, 'discard')) {
          const rich = [...opponents].sort((a, b) => b.hand.length - a.hand.length)[0];
          if (rich.hand.length > 0) consider(6 - d.cost, play(h.inst.id, rich.id));
        }
        if (hasKind(d, 'manaburn')) {
          const mrich = [...opponents].sort((a, b) => b.mana - a.mana)[0];
          if (mrich.mana >= 2) consider(5 - d.cost, play(h.inst.id, mrich.id));
        }
        if (hasKind(d, 'swap') && strongest.hp > bot.hp + 12) consider(strongest.hp - bot.hp, play(h.inst.id, strongest.id));
        if (hasKind(d, 'poison')) {
          // A lingering toxin pays off on a durable foe (each tick bypasses shield); aim the
          // healthiest target that isn't already rotting so all its ticks land.
          const pe = d.effects.find((e) => e.kind === 'poison') as any;
          const victim = [...opponents].filter((o) => !o.statuses.some((s) => s.kind === 'poison')).sort((a, b) => b.hp - a.hp)[0] ?? strongest;
          consider(sumBy(d, 'poison') * (pe?.turns ?? 1) - d.cost, play(h.inst.id, victim.id));
        }
      } else {
        const aoe = aoeRemovedFrom(d, weakest);
        if (aoe > 0) consider(aoe * opponents.length * 2 - d.cost + (sumBy(d, 'leech') ? 4 : 0), play(h.inst.id));
        if (sumBy(d, 'heal') > 0 && !hasKind(d, 'selfskip') && bot.hp < bot.maxHp * 0.8) consider(sumBy(d, 'heal') - d.cost, play(h.inst.id));
        if (sumBy(d, 'shield') > 0 && bot.defense < 8 && bot.hp < bot.maxHp * 0.75) consider(sumBy(d, 'shield') / 2 - d.cost, play(h.inst.id));
        // '역병안개' — AoE poison every foe (bypasses shield); scale by heads and duration.
        if (hasKind(d, 'poison')) {
          const pe = d.effects.find((e) => e.kind === 'poison') as any;
          consider(sumBy(d, 'poison') * (pe?.turns ?? 1) * opponents.length / 2 - d.cost, play(h.inst.id));
        }
        // '재생축복' — stack a heal-over-time when wounded and not already regenerating.
        if (hasKind(d, 'regen') && !bot.statuses.some((s) => s.kind === 'regen') && bot.hp < bot.maxHp * 0.85) {
          const re = d.effects.find((e) => e.kind === 'regen') as any;
          consider((re?.amount ?? 0) * (re?.turns ?? 1) / 2 - d.cost, play(h.inst.id));
        }
        // '가시갑옷' — raise a reflector when hurt and unguarded, so the next hit bites back.
        if (hasKind(d, 'reflect') && !bot.statuses.some((s) => s.kind === 'reflect') && bot.hp < bot.maxHp * 0.7) {
          consider(6 - d.cost, play(h.inst.id));
        }
      }
    }
    if (cands.length) return cands.sort((a, b) => b.score - a.score)[0].action;

    // 4) BANK — nothing worth attacking with: ramp mana toward a bigger turn if not near the cap.
    const ramp = hand.find((h) => sumBy(h.def, 'mana') > 0 && bot.mana <= manaMax - 3);
    if (ramp) return play(ramp.inst.id);

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
      const won = p.id === winnerId;
      const gold = won ? (isOneVsOne ? GOLD_1V1_WIN : GOLD_WIN) : GOLD_LOSS;
      // Guests earn nothing but still get a reward card (0 gold) so the end screen reads the same.
      const balance = username ? recordMatch(username, won, gold) : null;
      const earned = username ? gold : 0;
      const client = this.clients.find((c) => c.sessionId === p.id);
      client?.send('reward', { earned, balance, won, guest: !username });
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
      this.evaluateAutofill();
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

  onDispose(): void { this.clearTimer(); if (this.fillTimer) clearTimeout(this.fillTimer); }
}
