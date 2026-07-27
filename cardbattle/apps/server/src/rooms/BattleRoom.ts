import { Room, Client, updateLobby } from '@colyseus/core';
import {
  initGame, startGame, reduce, endTurn, spawnPlayer,
  CARD_DEFS, requiresTarget, resolveMode,
  heroPowerFor, heroPowerNeedsTarget,
  type GameState, type Action, type GameEvent, type PlayerState, type MinionInstance, type GameModeId, type CardDef,
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
  deck: string[]; // the account's chosen match deck (empty for guests → default deck at spawn)
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
      deck: profile.deck,
    };
    return { display: '', avatar: '', username: accountFromToken(options.token), ...DEFAULT_COSMETICS, deck: [] };
  }

  onJoin(client: Client, options: JoinOptions): void {
    if (this.gs.phase !== 'lobby') { client.leave(); return; }
    const auth = client.auth as Auth;
    if (auth.username) this.accounts.set(client.sessionId, auth.username);
    this.cosmetics.set(client.sessionId, { border: auth.border, title: auth.title, effect: auth.effect });
    const name = auth.display || (options.name ?? 'Player').slice(0, 16);
    const avatar = auth.avatar || options.avatar;
    // Logged-in players draw from their chosen deck; guests (empty deck) fall back to the full set.
    this.gs.players.push(spawnPlayer(this.gs.rules, this.gs.players.length, client.sessionId, name, sanitizeAvatar(avatar), auth.deck));
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

  /** Board-model bot policy (하스스톤식). One action per call; the caller loops until null.
   *  Priority: lethal (burst a reachable hero) → removal/AoE clear → develop the board (summon) →
   *  buff → self-heal when hurt → attack with ready minions (respect 도발, trade well, else go face) →
   *  ramp/draw value → hero power → end. Every returned action is validated against the reducer's
   *  legality (mana, field slot, 도발) so the bot loop never stalls on a rejected move. */
  private chooseBotAction(bot: PlayerState): Action | null {
    const opponents = this.gs.players.filter((p) => p.alive && p.id !== bot.id);
    if (opponents.length === 0) return null;
    const manaMax = this.gs.rules.manaMax;
    const fieldCap = this.gs.rules.fieldCap;
    const play = (id: string, targetId?: string): Action =>
      targetId ? { type: 'play_card', cardInstanceId: id, targetId } : { type: 'play_card', cardInstanceId: id };
    const atk = (attackerId: string, targetId: string): Action => ({ type: 'attack', attackerId, targetId });

    const weakestHero = [...opponents].sort((a, b) => a.hp - b.hp)[0];
    // Every enemy minion tagged with its owner (for 도발 checks and trade scoring).
    const enemyMinions: { m: MinionInstance; owner: PlayerState }[] = [];
    for (const o of opponents) for (const m of o.field) enemyMinions.push({ m, owner: o });
    // An opponent hero is reachable by a direct hit only if that opponent has NO 도발 minion up.
    const reachable = (o: PlayerState) => o.field.every((m) => !m.taunt);

    const affordable = bot.hand
      .map((c) => ({ inst: c, def: CARD_DEFS[c.defId]! }))
      .filter((h) => h.def && h.def.cost <= bot.mana);
    const has = (def: CardDef, k: string) => def.effects.some((e) => e.kind === k);
    const dmgOf = (def: CardDef, target: string) =>
      def.effects.filter((e) => e.kind === 'damage' && (e as any).target === target).reduce((s, e) => s + (e as any).amount, 0);

    // 1) LETHAL — a chosen-damage spell to a reachable hero it kills.
    for (const h of affordable) {
      if (h.def.kind !== 'spell') continue;
      const face = dmgOf(h.def, 'chosen');
      if (face <= 0) continue;
      const victim = opponents.find((o) => reachable(o) && face >= o.hp);
      if (victim) return play(h.inst.id, victim.id);
    }
    // 1b) LETHAL — an AoE-to-heroes spell (서리 충격) that finishes someone.
    for (const h of affordable) {
      if (h.def.kind !== 'spell') continue;
      const all = dmgOf(h.def, 'allEnemies');
      if (all > 0 && opponents.some((o) => all >= o.hp)) return play(h.inst.id);
    }
    // 1c) LETHAL — a ready minion straight to a reachable hero.
    for (const m of bot.field) {
      if (m.attacksLeft <= 0 || m.attack <= 0) continue;
      const victim = opponents.find((o) => reachable(o) && m.attack >= o.hp);
      if (victim) return atk(m.id, victim.id);
    }

    // 2) REMOVAL / clears.
    // 암살 — destroy the biggest enemy body outright.
    const assn = affordable.find((h) => has(h.def, 'destroy'));
    if (assn && enemyMinions.length) {
      const big = [...enemyMinions].sort((a, b) => (b.m.attack + b.m.health) - (a.m.attack + a.m.health))[0];
      if (big.m.attack + big.m.health >= 6) return play(assn.inst.id, big.m.id);
    }
    // 화염 폭풍 / 화염룡 전투의 함성 — AoE the enemy board when it clears value.
    const aoe = affordable.find((h) => h.def.kind === 'spell' && dmgOf(h.def, 'allEnemyMinions') > 0);
    if (aoe) {
      const amt = dmgOf(aoe.def, 'allEnemyMinions');
      const kills = enemyMinions.filter((e) => e.m.health <= amt && !e.m.divineShield).length;
      if (enemyMinions.length >= 3 || kills >= 2) return play(aoe.inst.id);
    }
    // 강타/화염 화살 — burn down a valuable enemy minion my hand can finish.
    for (const h of affordable) {
      if (h.def.kind !== 'spell') continue;
      const face = dmgOf(h.def, 'chosen');
      if (face <= 0) continue;
      const kill = [...enemyMinions]
        .filter((e) => e.m.health <= face && !e.m.divineShield && e.m.attack >= 3)
        .sort((a, b) => b.m.attack - a.m.attack)[0];
      if (kill) return play(h.inst.id, kill.m.id);
    }

    // 3) DEVELOP — put a body on the board (biggest affordable that fits an open slot).
    if (bot.field.length < fieldCap) {
      // 궁수-type: a minion whose battlecry damages a chosen target — aim a kill, else the weakest hero.
      const archer = affordable.find((h) => h.def.kind === 'minion' && requiresTarget(h.def) && dmgOf(h.def, 'chosen') > 0);
      if (archer) {
        const amt = dmgOf(archer.def, 'chosen');
        const kill = [...enemyMinions].filter((e) => e.m.health <= amt && !e.m.divineShield).sort((a, b) => b.m.attack - a.m.attack)[0];
        return play(archer.inst.id, kill ? kill.m.id : weakestHero.id);
      }
      const summon = affordable
        .filter((h) => h.def.kind === 'minion' && !requiresTarget(h.def))
        .sort((a, b) => b.def.cost - a.def.cost)[0];
      if (summon) return play(summon.inst.id);
    }

    // 4) BUFF — pump my board once it's worth it.
    const buffAll = affordable.find((h) => h.def.kind === 'spell' && h.def.effects.some((e) => e.kind === 'buff' && (e as any).target === 'allFriendlyMinions'));
    if (buffAll && bot.field.length >= 2) return play(buffAll.inst.id);
    const buffOne = affordable.find((h) => h.def.kind === 'spell' && h.def.effects.some((e) => e.kind === 'buff' && (e as any).target === 'chosen'));
    if (buffOne && bot.field.length) {
      const best = [...bot.field].sort((a, b) => b.attack - a.attack)[0];
      return play(buffOne.inst.id, best.id);
    }

    // 5) HEAL — top the hero up when badly hurt.
    if (bot.hp < bot.maxHp * 0.5) {
      const healHero = affordable.find((h) => h.def.effects.some((e) => e.kind === 'heal' && (e as any).target === 'hero'));
      if (healHero) return play(healHero.inst.id);
      const healChosen = affordable.find((h) => h.def.kind === 'spell' && h.def.effects.some((e) => e.kind === 'heal' && (e as any).target === 'chosen'));
      if (healChosen) return play(healChosen.inst.id, bot.id);
    }

    // 6) ATTACK — one ready minion trades well or applies face pressure.
    const attacker = bot.field.find((m) => m.attacksLeft > 0 && m.attack > 0);
    if (attacker) {
      // A 도발 minion anywhere forces a trade — smash the softest one.
      const taunts = enemyMinions.filter((e) => e.m.taunt);
      if (taunts.length) {
        const t = [...taunts].sort((a, b) => (a.m.divineShield ? 1 : 0) - (b.m.divineShield ? 1 : 0) || a.m.health - b.m.health)[0];
        return atk(attacker.id, t.m.id);
      }
      // Favorable trade: kill an enemy body and survive (poisonous kills anything it touches).
      const trade = [...enemyMinions]
        .filter((e) => !e.m.divineShield && attacker.attack >= e.m.health && (attacker.poisonous || e.m.attack < attacker.health))
        .sort((a, b) => (b.m.attack + b.m.health) - (a.m.attack + a.m.health))[0];
      if (trade && trade.m.attack >= 3) return atk(attacker.id, trade.m.id);
      // Otherwise pile onto the weakest reachable hero.
      const face = opponents.find((o) => reachable(o)) ?? null;
      if (face) return atk(attacker.id, [...opponents].filter(reachable).sort((a, b) => a.hp - b.hp)[0].id);
      // Every hero is guarded — take the best available trade even if unfavorable.
      const any = [...enemyMinions].filter((e) => !e.m.divineShield).sort((a, b) => b.m.attack - a.m.attack)[0];
      if (any) return atk(attacker.id, any.m.id);
    }

    // 7) VALUE — spend leftover mana on chip / ramp / draw instead of wasting it.
    const chip = affordable.find((h) => h.def.kind === 'spell' && dmgOf(h.def, 'allEnemies') > 0);
    if (chip && opponents.length >= 2) return play(chip.inst.id);
    const ramp = affordable.find((h) => has(h.def, 'gainMana') && bot.mana <= manaMax - 2);
    if (ramp) return play(ramp.inst.id);
    const draw = affordable.find((h) => has(h.def, 'draw') && bot.hand.length <= 4);
    if (draw) return play(draw.inst.id);
    if (bot.field.length < fieldCap) {
      const anyMin = affordable.find((h) => h.def.kind === 'minion' && !requiresTarget(h.def));
      if (anyMin) return play(anyMin.inst.id);
    }

    // 8) HERO POWER — a finisher or steady value when there's nothing better.
    const power = heroPowerFor(bot.avatar);
    if (!bot.heroPowerUsed && bot.mana >= power.cost) {
      if (heroPowerNeedsTarget(power)) {
        const face = power.effects.filter((e) => e.kind === 'damage' && (e as any).target === 'chosen').reduce((s, e) => s + (e as any).amount, 0);
        if (face > 0) {
          const victim = opponents.find((o) => reachable(o) && face >= o.hp);
          if (victim) return { type: 'use_hero_power', targetId: victim.id };
          const killM = [...enemyMinions].filter((e) => !e.m.divineShield && e.m.health <= face).sort((a, b) => b.m.attack - a.m.attack)[0];
          if (killM) return { type: 'use_hero_power', targetId: killM.m.id };
          const reach = [...opponents].filter(reachable).sort((a, b) => a.hp - b.hp)[0];
          if (reach) return { type: 'use_hero_power', targetId: reach.id };
        }
      } else {
        const useIt = (): Action => ({ type: 'use_hero_power' });
        if (power.effects.some((e) => e.kind === 'damage' && (e as any).target === 'allEnemies')) return useIt();
        if (power.effects.some((e) => e.kind === 'summon') && bot.field.length < fieldCap) return useIt();
        if (power.effects.some((e) => e.kind === 'heal') && bot.hp < bot.maxHp * 0.85) return useIt();
        if (power.effects.some((e) => e.kind === 'shield') && bot.defense < 8) return useIt();
        if (power.effects.some((e) => e.kind === 'gainMana') && bot.mana <= manaMax - 2) return useIt();
        if (power.effects.some((e) => e.kind === 'draw') && bot.hand.length <= 4) return useIt();
      }
    }

    return null; // nothing worth doing — end the turn
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

  /** Broadcast the event stream to the whole table (board model has no hidden reveals). */
  private sendEvents(events: GameEvent[]): void {
    this.broadcast('events', events);
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
