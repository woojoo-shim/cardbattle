# Card Battle S1 — Core Game Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a server-authoritative, real-time turn-based card battle loop (2–8 players, last-survivor wins) playable across multiple browser tabs.

**Architecture:** A framework-agnostic pure reducer (`reduce(state, action, ctx) -> {state, events}`) holds all game logic in `packages/shared`. A Colyseus `BattleRoom` owns the canonical plain `GameState`, validates client input, runs the reducer, mirrors state into a Colyseus `@schema` for delta sync, and broadcasts `GameEvent[]` as messages. A React+Vite client renders DOM UI and a PixiJS VFX stub.

**Tech Stack:** pnpm workspaces, TypeScript, Colyseus 0.16 (`@colyseus/core`, `@colyseus/schema`), `colyseus.js`, React 18, Vite, PixiJS, vitest, `@colyseus/testing`, `tsx`.

**Spec:** `docs/superpowers/specs/2026-06-28-card-battle-s1-core-design.md`

**Project root:** All paths below are relative to `cardbattle/` (created in Task 1) inside the repo root.

---

## ⚠️ Library-version note (READ FIRST)

Your training data for Colyseus 0.16 / `@colyseus/schema` v3 may be **outdated**. The schema decorator API and the per-client filtering mechanism (`StateView` replaced the old `@filter`) changed in recent versions. **Before implementing Tasks 7–9, verify the current API** via Context7 (`resolve-library-id` → `get-library-docs` for `colyseus`) or https://docs.colyseus.io. The pure-engine tasks (2–6) have no such risk — the code given there is authoritative.

---

## File Structure

```
cardbattle/
├─ package.json                         # workspace root + dev scripts
├─ pnpm-workspace.yaml
├─ tsconfig.base.json
├─ packages/shared/
│  ├─ package.json                      # @cardbattle/shared (no build, type:module)
│  ├─ tsconfig.json
│  ├─ vitest.config.ts
│  └─ src/
│     ├─ index.ts                       # barrel exports
│     ├─ types.ts                       # GameState, PlayerState, CardDef, Action, GameEvent, Effect
│     ├─ constants.ts                   # tunables (maxHp, turn seconds, hand sizes)
│     ├─ cards/
│     │  ├─ defs.ts                     # S1 card catalog + weighted-pool helper
│     │  └─ effects.ts                  # effect dispatcher map (damage, heal)
│     ├─ engine/
│     │  ├─ rng.ts                      # seeded deterministic RNG
│     │  ├─ reducer.ts                  # reduce(state, action, ctx)
│     │  └─ loop.ts                     # init, startGame, draw, advanceTurn, win check
│     └─ __tests__/
│        ├─ rng.test.ts
│        ├─ reducer.test.ts
│        └─ loop.test.ts
├─ apps/server/
│  ├─ package.json
│  ├─ tsconfig.json
│  └─ src/
│     ├─ index.ts                       # Colyseus server bootstrap
│     ├─ schema/BattleState.ts          # @schema mirror + syncToSchema()
│     ├─ rooms/BattleRoom.ts            # lobby, validation, reducer host, timer
│     └─ __tests__/battleRoom.test.ts   # @colyseus/testing integration
└─ apps/client/
   ├─ package.json
   ├─ tsconfig.json
   ├─ vite.config.ts
   ├─ index.html
   └─ src/
      ├─ main.tsx
      ├─ App.tsx                        # phase switch: Lobby | Battle | GameOver
      ├─ net/client.ts                  # colyseus.js connection + join
      ├─ state/useRoom.ts               # room ↔ React state bridge
      ├─ ui/
      │  ├─ Lobby.tsx
      │  ├─ Battle.tsx
      │  ├─ PlayerRing.tsx
      │  ├─ Hud.tsx
      │  ├─ Hand.tsx
      │  └─ Log.tsx
      └─ vfx/VfxLayer.tsx               # Pixi stub: hit flash + damage number
```

**Responsibility boundaries:**
- `packages/shared` knows nothing about Colyseus, React, or the network. Pure, deterministic, fully unit-tested.
- `apps/server` is the only place RNG seed lives and the only authority on state transitions.
- `apps/client` sends `Action`s and renders `BattleState` + `GameEvent` messages. Never computes game outcomes.

---

## Task 1: Scaffold the monorepo

**Files:**
- Create: `cardbattle/package.json`, `cardbattle/pnpm-workspace.yaml`, `cardbattle/tsconfig.base.json`
- Create: `cardbattle/packages/shared/package.json`, `cardbattle/packages/shared/tsconfig.json`, `cardbattle/packages/shared/vitest.config.ts`
- Create: `cardbattle/packages/shared/src/index.ts` (temporary placeholder)

- [ ] **Step 1: Create workspace files**

`cardbattle/pnpm-workspace.yaml`:
```yaml
packages:
  - 'packages/*'
  - 'apps/*'
```

`cardbattle/package.json`:
```json
{
  "name": "cardbattle",
  "private": true,
  "type": "module",
  "scripts": {
    "dev:server": "pnpm --filter @cardbattle/server dev",
    "dev:client": "pnpm --filter @cardbattle/client dev",
    "test": "pnpm --filter @cardbattle/shared test"
  },
  "devDependencies": {
    "typescript": "^5.6.0"
  }
}
```

`cardbattle/tsconfig.base.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "verbatimModuleSyntax": false,
    "forceConsistentCasingInFileNames": true
  }
}
```

- [ ] **Step 2: Create the shared package**

`cardbattle/packages/shared/package.json`:
```json
{
  "name": "@cardbattle/shared",
  "version": "0.0.0",
  "type": "module",
  "main": "src/index.ts",
  "types": "src/index.ts",
  "exports": { ".": "./src/index.ts" },
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "vitest": "^2.1.0",
    "typescript": "^5.6.0"
  }
}
```

`cardbattle/packages/shared/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "rootDir": "src", "noEmit": true },
  "include": ["src"]
}
```

`cardbattle/packages/shared/vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { environment: 'node' } });
```

`cardbattle/packages/shared/src/index.ts` (placeholder, replaced in later tasks):
```ts
export const SHARED_OK = true;
```

- [ ] **Step 3: Install and verify**

Run: `cd cardbattle && pnpm install`
Expected: completes without error; `node_modules` created.

Run: `cd cardbattle && pnpm --filter @cardbattle/shared exec vitest run`
Expected: "No test files found" (exit 0) — toolchain works.

- [ ] **Step 4: Commit**

```bash
git add cardbattle/package.json cardbattle/pnpm-workspace.yaml cardbattle/tsconfig.base.json cardbattle/packages/shared
git commit -m "chore: scaffold cardbattle pnpm monorepo + shared package"
```

---

## Task 2: Data model (`types.ts`, `constants.ts`)

**Files:**
- Create: `cardbattle/packages/shared/src/types.ts`
- Create: `cardbattle/packages/shared/src/constants.ts`

These are type/const declarations only (no runtime logic), so no dedicated test — they are exercised by every later test.

- [ ] **Step 1: Write `constants.ts`**

```ts
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 8;
export const START_HP = 40;
export const START_DEFENSE = 0;
export const START_HAND = 3;
export const DRAW_PER_TURN = 1;
export const HAND_SOFT_CAP = 8; // not enforced in S1
export const TURN_SECONDS = 30;
export const RECONNECT_SECONDS = 30;
```

- [ ] **Step 2: Write `types.ts`** (matches spec §4)

```ts
export type Phase = 'lobby' | 'playing' | 'ended';
export type Element = 'physical' | 'fire' | 'ice' | 'lightning' | 'poison' | 'holy' | 'none';
export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';
export type CardKind = 'weapon' | 'magic' | 'heal' | 'special' | 'equipment';

export type Effect =
  | { kind: 'damage'; amount: number; target: 'chosen' | 'all' | 'random' }
  | { kind: 'heal'; amount: number };

export interface CardDef {
  id: string;
  name: string;
  rarity: Rarity;
  cost: number;
  element: Element;
  kind: CardKind;
  effects: Effect[];
  cooldown: number;
  vfxKey: string;
  sfxKey: string;
  icon: string;
  desc: string;
  drawWeight: number;
}

export interface CardInstance { id: string; defId: string; }

export interface PlayerState {
  id: string;
  name: string;
  connected: boolean;
  seat: number;
  hp: number;
  maxHp: number;
  defense: number;
  hand: CardInstance[];
  equipment: CardInstance[]; // S1: always []
  statuses: unknown[];       // S1: always []
  buffs: unknown[];          // S1: always []
  alive: boolean;
}

export interface GameState {
  phase: Phase;
  players: PlayerState[];
  turnOrder: string[];
  currentTurnIndex: number;
  turnDeadline: number;
  rngSeed: number;
  log: GameEvent[];
  winnerId: string | null;
}

export type Action =
  | { type: 'play_card'; cardInstanceId: string; targetId?: string }
  | { type: 'end_turn' };
// Reserved for S2: | { type: 'defend'; ... }

export type GameEvent =
  | { type: 'turn_started'; playerId: string; deadline: number }
  | { type: 'turn_ended'; playerId: string }
  | { type: 'card_drawn'; playerId: string; cardInstanceId: string; defId: string }
  | { type: 'card_played'; playerId: string; defId: string; targetId?: string }
  | { type: 'damage_dealt'; sourceId: string; targetId: string; amount: number; element: Element; targetHpAfter: number }
  | { type: 'healed'; targetId: string; amount: number; targetHpAfter: number }
  | { type: 'player_eliminated'; playerId: string }
  | { type: 'game_over'; winnerId: string };

/** Context passed into the reducer; supplies authority-owned services (RNG, clock). */
export interface ReduceCtx {
  nextCardId: () => string;   // unique CardInstance id generator (server-owned)
  now: number;                // epoch ms used to compute deadlines
}

export interface ReduceResult { state: GameState; events: GameEvent[]; }
```

- [ ] **Step 3: Update barrel `index.ts`**

```ts
export * from './types.js';
export * from './constants.js';
```

- [ ] **Step 4: Typecheck**

Run: `cd cardbattle && pnpm --filter @cardbattle/shared exec tsc --noEmit`
Expected: PASS (no type errors).

- [ ] **Step 5: Commit**

```bash
git add cardbattle/packages/shared/src
git commit -m "feat(shared): add S1 data model and constants"
```

---

## Task 3: Seeded RNG (`engine/rng.ts`)

**Files:**
- Create: `cardbattle/packages/shared/src/engine/rng.ts`
- Test: `cardbattle/packages/shared/src/__tests__/rng.test.ts`

A deterministic PRNG so draws are reproducible and server-controlled. Use a mulberry32 generator that returns the next float and the advanced state (pure, no hidden mutation in the function signature).

- [ ] **Step 1: Write the failing test**

`__tests__/rng.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { nextFloat, weightedPick } from '../engine/rng.js';

describe('rng', () => {
  it('is deterministic for a given seed', () => {
    const a = nextFloat(12345);
    const b = nextFloat(12345);
    expect(a.value).toBe(b.value);
    expect(a.seed).toBe(b.seed);
  });

  it('advances the seed so successive draws differ', () => {
    const a = nextFloat(12345);
    const b = nextFloat(a.seed);
    expect(a.value).not.toBe(b.value);
  });

  it('weightedPick respects weights statistically', () => {
    const items = [
      { v: 'common', w: 90 },
      { v: 'rare', w: 10 },
    ];
    let seed = 1;
    const counts: Record<string, number> = { common: 0, rare: 0 };
    for (let i = 0; i < 4000; i++) {
      const r = weightedPick(seed, items, (it) => it.w);
      counts[r.item.v]++;
      seed = r.seed;
    }
    expect(counts.common).toBeGreaterThan(counts.rare * 3);
  });

  it('weightedPick is deterministic for a given seed', () => {
    const items = [{ v: 'a', w: 1 }, { v: 'b', w: 1 }, { v: 'c', w: 1 }];
    const r1 = weightedPick(777, items, (it) => it.w);
    const r2 = weightedPick(777, items, (it) => it.w);
    expect(r1.item.v).toBe(r2.item.v);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd cardbattle && pnpm --filter @cardbattle/shared exec vitest run rng`
Expected: FAIL ("Cannot find module '../engine/rng.js'").

- [ ] **Step 3: Implement `engine/rng.ts`**

```ts
/** mulberry32 — small, fast, deterministic PRNG. */
export function nextFloat(seed: number): { value: number; seed: number } {
  let t = (seed + 0x6d2b79f5) | 0;
  let x = t;
  x = Math.imul(x ^ (x >>> 15), x | 1);
  x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
  const value = ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  return { value, seed: t };
}

export function weightedPick<T>(
  seed: number,
  items: readonly T[],
  weightOf: (item: T) => number,
): { item: T; seed: number } {
  const total = items.reduce((s, it) => s + weightOf(it), 0);
  const { value, seed: nextSeed } = nextFloat(seed);
  let roll = value * total;
  for (const item of items) {
    roll -= weightOf(item);
    if (roll < 0) return { item, seed: nextSeed };
  }
  return { item: items[items.length - 1], seed: nextSeed };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd cardbattle && pnpm --filter @cardbattle/shared exec vitest run rng`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add cardbattle/packages/shared/src/engine/rng.ts cardbattle/packages/shared/src/__tests__/rng.test.ts
git commit -m "feat(shared): add deterministic seeded RNG with weighted pick"
```

---

## Task 4: Card catalog + effect dispatcher (`cards/defs.ts`, `cards/effects.ts`)

**Files:**
- Create: `cardbattle/packages/shared/src/cards/defs.ts`
- Create: `cardbattle/packages/shared/src/cards/effects.ts`
- Test: `cardbattle/packages/shared/src/__tests__/effects.test.ts` (created here, expanded in Task 5)

The dispatcher is the extensibility core (spec §3.1): a map from `Effect['kind']` to a handler that mutates a draft and emits events. New effects = one map entry; new cards = data only.

- [ ] **Step 1: Write `cards/defs.ts`** (spec §10)

```ts
import type { CardDef } from '../types.js';

export const CARD_DEFS: Record<string, CardDef> = {
  sword:    { id: 'sword',    name: '검',     rarity: 'common', cost: 0, element: 'physical', kind: 'weapon', effects: [{ kind: 'damage', amount: 10, target: 'chosen' }], cooldown: 0, vfxKey: 'slash',   sfxKey: 'slash',   icon: '🗡️', desc: '대상에게 10 피해', drawWeight: 20 },
  bow:      { id: 'bow',      name: '활',     rarity: 'common', cost: 0, element: 'physical', kind: 'weapon', effects: [{ kind: 'damage', amount: 7,  target: 'chosen' }], cooldown: 0, vfxKey: 'arrow',   sfxKey: 'arrow',   icon: '🏹', desc: '대상에게 7 피해',  drawWeight: 20 },
  spear:    { id: 'spear',    name: '창',     rarity: 'rare',   cost: 0, element: 'physical', kind: 'weapon', effects: [{ kind: 'damage', amount: 13, target: 'chosen' }], cooldown: 0, vfxKey: 'thrust',  sfxKey: 'thrust',  icon: '🔱', desc: '대상에게 13 피해', drawWeight: 10 },
  bomb:     { id: 'bomb',     name: '폭탄',   rarity: 'epic',   cost: 0, element: 'fire',     kind: 'magic',  effects: [{ kind: 'damage', amount: 12, target: 'all' }],    cooldown: 0, vfxKey: 'explode', sfxKey: 'explode', icon: '💣', desc: '나를 제외한 모두에게 12 피해', drawWeight: 8 },
  potion:   { id: 'potion',   name: '회복약', rarity: 'common', cost: 0, element: 'holy',     kind: 'heal',   effects: [{ kind: 'heal',   amount: 12 }],                cooldown: 0, vfxKey: 'heal',    sfxKey: 'heal',    icon: '🧪', desc: '나를 12 회복', drawWeight: 18 },
  greatheal:{ id: 'greatheal',name: '대회복', rarity: 'rare',   cost: 0, element: 'holy',     kind: 'heal',   effects: [{ kind: 'heal',   amount: 20 }],                cooldown: 0, vfxKey: 'heal',    sfxKey: 'heal',    icon: '✨', desc: '나를 20 회복', drawWeight: 6 },
};

export const ALL_DEFS: CardDef[] = Object.values(CARD_DEFS);

/** Does this card require the player to pick a target before playing? */
export function requiresTarget(def: CardDef): boolean {
  return def.effects.some((e) => e.kind === 'damage' && e.target === 'chosen');
}
```

- [ ] **Step 2: Write `cards/effects.ts`** (the dispatcher)

```ts
import type { Effect, GameEvent, GameState, PlayerState } from '../types.js';

export interface EffectCtx {
  state: GameState;
  source: PlayerState;        // who played the card
  chosenTargetId?: string;    // target picked for 'chosen' effects
  defId: string;
  emit: (e: GameEvent) => void;
}

function livingOthers(state: GameState, sourceId: string): PlayerState[] {
  return state.players.filter((p) => p.alive && p.id !== sourceId);
}

function applyDamageTo(target: PlayerState, amount: number, element: Effect extends { kind: 'damage' } ? Effect['kind'] : never, source: PlayerState, ctx: EffectCtx, el: string): void {
  // (placeholder signature — see real impl below)
}

export type EffectHandler = (effect: Extract<Effect, { kind: string }>, ctx: EffectCtx) => void;

function damageOne(target: PlayerState, amount: number, element: string, sourceId: string, ctx: EffectCtx): void {
  if (!target.alive) return;
  const dealt = Math.max(0, amount - target.defense);
  target.hp = Math.max(0, target.hp - dealt);
  ctx.emit({ type: 'damage_dealt', sourceId, targetId: target.id, amount: dealt, element: element as any, targetHpAfter: target.hp });
  if (target.hp === 0 && target.alive) {
    target.alive = false;
    ctx.emit({ type: 'player_eliminated', playerId: target.id });
  }
}

export const effectHandlers: Record<Effect['kind'], (effect: any, ctx: EffectCtx) => void> = {
  damage: (effect: Extract<Effect, { kind: 'damage' }>, ctx) => {
    const { state, source } = ctx;
    if (effect.target === 'all') {
      for (const t of livingOthers(state, source.id)) damageOne(t, effect.amount, ctx.defIdElement(), source.id, ctx);
    } else if (effect.target === 'chosen') {
      const t = state.players.find((p) => p.id === ctx.chosenTargetId);
      if (t) damageOne(t, effect.amount, ctx.defIdElement(), source.id, ctx);
    } else {
      const pool = livingOthers(state, source.id);
      if (pool.length) damageOne(pool[0], effect.amount, ctx.defIdElement(), source.id, ctx); // 'random' resolved by reducer-supplied order
    }
  },
  heal: (effect: Extract<Effect, { kind: 'heal' }>, ctx) => {
    const { source } = ctx;
    source.hp = Math.min(source.maxHp, source.hp + effect.amount);
    ctx.emit({ type: 'healed', targetId: source.id, amount: effect.amount, targetHpAfter: source.hp });
  },
};
```

> **Note for implementer:** the `ctx.defIdElement()` / `applyDamageTo` placeholders above are intentionally rough. The clean version is finalized in Task 5 where the reducer wires `element` from the `CardDef` and supplies the `random` ordering through the RNG. Treat Task 4 as establishing the **dispatcher-map shape**; Task 5's tests pin down exact behavior. Keep `damageOne` and `effectHandlers` as the stable extension points.

- [ ] **Step 3: Typecheck only (behavior tested in Task 5)**

Run: `cd cardbattle && pnpm --filter @cardbattle/shared exec tsc --noEmit`
Expected: PASS. Fix any type errors (you may simplify `EffectCtx` to pass `element` directly rather than `defIdElement()` — see Task 5 final shape).

- [ ] **Step 4: Commit**

```bash
git add cardbattle/packages/shared/src/cards
git commit -m "feat(shared): add S1 card catalog and effect dispatcher map"
```

---

## Task 5: Reducer (`engine/reducer.ts`)

**Files:**
- Create: `cardbattle/packages/shared/src/engine/reducer.ts`
- Modify: `cardbattle/packages/shared/src/cards/effects.ts` (finalize `EffectCtx` to carry `element` and `rng`)
- Test: `cardbattle/packages/shared/src/__tests__/reducer.test.ts`

The reducer is pure: it deep-clones the input state, applies the action, returns `{state, events}`. Invalid actions return the state unchanged with an empty event list (the room layer turns that into an `error` message — see Task 8).

- [ ] **Step 1: Finalize `EffectCtx` in `cards/effects.ts`**

Replace the rough version with:
```ts
import type { Effect, GameEvent, GameState, PlayerState, Element } from '../types.js';

export interface EffectCtx {
  state: GameState;
  source: PlayerState;
  chosenTargetId: string | undefined;
  element: Element;        // from the CardDef being played
  randomOrder: PlayerState[]; // pre-shuffled living others, supplied by reducer (deterministic)
  emit: (e: GameEvent) => void;
}

function livingOthers(state: GameState, sourceId: string): PlayerState[] {
  return state.players.filter((p) => p.alive && p.id !== sourceId);
}

export function damageOne(target: PlayerState, amount: number, element: Element, sourceId: string, emit: (e: GameEvent) => void): void {
  if (!target.alive) return;
  const dealt = Math.max(0, amount - target.defense);
  target.hp = Math.max(0, target.hp - dealt);
  emit({ type: 'damage_dealt', sourceId, targetId: target.id, amount: dealt, element, targetHpAfter: target.hp });
  if (target.hp === 0) {
    target.alive = false;
    emit({ type: 'player_eliminated', playerId: target.id });
  }
}

export const effectHandlers: Record<Effect['kind'], (effect: any, ctx: EffectCtx) => void> = {
  damage: (effect: Extract<Effect, { kind: 'damage' }>, ctx) => {
    const targets =
      effect.target === 'all'   ? livingOthers(ctx.state, ctx.source.id)
    : effect.target === 'random'? ctx.randomOrder.slice(0, 1)
    : (() => { const t = ctx.state.players.find((p) => p.id === ctx.chosenTargetId && p.alive); return t ? [t] : []; })();
    for (const t of targets) damageOne(t, effect.amount, ctx.element, ctx.source.id, ctx.emit);
  },
  heal: (effect: Extract<Effect, { kind: 'heal' }>, ctx) => {
    ctx.source.hp = Math.min(ctx.source.maxHp, ctx.source.hp + effect.amount);
    ctx.emit({ type: 'healed', targetId: ctx.source.id, amount: effect.amount, targetHpAfter: ctx.source.hp });
  },
};
```

- [ ] **Step 2: Write the failing test** `__tests__/reducer.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { reduce } from '../engine/reducer.js';
import type { GameState, PlayerState, ReduceCtx } from '../types.js';

function player(id: string, seat: number, over: Partial<PlayerState> = {}): PlayerState {
  return { id, name: id, connected: true, seat, hp: 40, maxHp: 40, defense: 0, hand: [], equipment: [], statuses: [], buffs: [], alive: true, ...over };
}
function game(over: Partial<GameState> = {}): GameState {
  return { phase: 'playing', players: [player('a', 0), player('b', 1)], turnOrder: ['a', 'b'], currentTurnIndex: 0, turnDeadline: 0, rngSeed: 1, log: [], winnerId: null, ...over };
}
const ctx: ReduceCtx = { nextCardId: () => 'c-x', now: 1000 };

describe('reduce: play_card', () => {
  it('deals damage to a chosen target', () => {
    const s = game();
    s.players[0].hand = [{ id: 'c1', defId: 'sword' }];
    const { state, events } = reduce(s, { type: 'play_card', cardInstanceId: 'c1', targetId: 'b' }, ctx);
    expect(state.players[1].hp).toBe(30);
    expect(state.players[0].hand).toHaveLength(0); // card consumed
    expect(events).toContainEqual(expect.objectContaining({ type: 'damage_dealt', targetId: 'b', amount: 10 }));
  });

  it('does not mutate the input state (purity)', () => {
    const s = game();
    s.players[0].hand = [{ id: 'c1', defId: 'sword' }];
    reduce(s, { type: 'play_card', cardInstanceId: 'c1', targetId: 'b' }, ctx);
    expect(s.players[1].hp).toBe(40); // original untouched
  });

  it('heals self capped at maxHp', () => {
    const s = game();
    s.players[0].hp = 35;
    s.players[0].hand = [{ id: 'c1', defId: 'potion' }];
    const { state } = reduce(s, { type: 'play_card', cardInstanceId: 'c1' }, ctx);
    expect(state.players[0].hp).toBe(40); // 35+12 capped
  });

  it('eliminates a player at 0 hp', () => {
    const s = game();
    s.players[1].hp = 8;
    s.players[0].hand = [{ id: 'c1', defId: 'sword' }];
    const { state, events } = reduce(s, { type: 'play_card', cardInstanceId: 'c1', targetId: 'b' }, ctx);
    expect(state.players[1].alive).toBe(false);
    expect(events).toContainEqual({ type: 'player_eliminated', playerId: 'b' });
  });

  it('bomb hits all others but not self', () => {
    const s = game({ players: [player('a', 0), player('b', 1), player('c', 2)] });
    s.turnOrder = ['a', 'b', 'c'];
    s.players[0].hand = [{ id: 'c1', defId: 'bomb' }];
    const { state } = reduce(s, { type: 'play_card', cardInstanceId: 'c1' }, ctx);
    expect(state.players[0].hp).toBe(40);
    expect(state.players[1].hp).toBe(28);
    expect(state.players[2].hp).toBe(28);
  });

  it('rejects playing when it is not your turn', () => {
    const s = game();
    s.players[1].hand = [{ id: 'c9', defId: 'sword' }];
    const { state, events } = reduce(s, { type: 'play_card', cardInstanceId: 'c9', targetId: 'a' }, ctx);
    expect(state).toEqual(s);       // unchanged
    expect(events).toHaveLength(0);
  });

  it('rejects a card not in hand', () => {
    const s = game();
    const { state, events } = reduce(s, { type: 'play_card', cardInstanceId: 'nope', targetId: 'b' }, ctx);
    expect(events).toHaveLength(0);
    expect(state).toEqual(s);
  });

  it('rejects a dead/invalid chosen target', () => {
    const s = game();
    s.players[1].alive = false;
    s.players[0].hand = [{ id: 'c1', defId: 'sword' }];
    const { events } = reduce(s, { type: 'play_card', cardInstanceId: 'c1', targetId: 'b' }, ctx);
    expect(events).toHaveLength(0);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd cardbattle && pnpm --filter @cardbattle/shared exec vitest run reducer`
Expected: FAIL ("Cannot find module '../engine/reducer.js'").

- [ ] **Step 4: Implement `engine/reducer.ts`**

```ts
import type { Action, GameEvent, GameState, ReduceCtx, ReduceResult, PlayerState } from '../types.js';
import { CARD_DEFS, requiresTarget } from '../cards/defs.js';
import { effectHandlers, EffectCtx } from '../cards/effects.js';
import { weightedPick } from './rng.js';

function clone(state: GameState): GameState {
  return structuredClone(state);
}

function currentPlayerId(state: GameState): string {
  return state.turnOrder[state.currentTurnIndex];
}

/** Deterministic shuffle of living others for 'random'-target effects. */
function randomOrder(state: GameState, sourceId: string): PlayerState[] {
  const pool = state.players.filter((p) => p.alive && p.id !== sourceId);
  let seed = state.rngSeed;
  for (let i = pool.length - 1; i > 0; i--) {
    const r = weightedPick(seed, pool.slice(0, i + 1), () => 1);
    seed = r.seed;
    const j = pool.indexOf(r.item);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool;
}

export function reduce(input: GameState, action: Action, _ctx: ReduceCtx): ReduceResult {
  if (input.phase !== 'playing') return { state: input, events: [] };

  if (action.type === 'play_card') {
    const actorId = currentPlayerId(input);
    const actor = input.players.find((p) => p.id === actorId);
    if (!actor || !actor.alive) return { state: input, events: [] };
    const cardIdx = actor.hand.findIndex((c) => c.id === action.cardInstanceId);
    if (cardIdx < 0) return { state: input, events: [] };
    const card = actor.hand[cardIdx];
    const def = CARD_DEFS[card.defId];
    if (!def) return { state: input, events: [] };
    // target validation for 'chosen' damage
    if (requiresTarget(def)) {
      const t = input.players.find((p) => p.id === action.targetId);
      if (!t || !t.alive) return { state: input, events: [] };
    }

    const state = clone(input);
    const events: GameEvent[] = [];
    const emit = (e: GameEvent) => { events.push(e); state.log.push(e); };
    const sActor = state.players.find((p) => p.id === actorId)!;
    sActor.hand.splice(cardIdx, 1); // consume
    emit({ type: 'card_played', playerId: actorId, defId: def.id, targetId: action.targetId });

    const effCtx: EffectCtx = {
      state, source: sActor, chosenTargetId: action.targetId,
      element: def.element, randomOrder: randomOrder(state, actorId), emit,
    };
    for (const eff of def.effects) effectHandlers[eff.kind](eff, effCtx);

    checkWin(state, emit);
    return { state, events };
  }

  if (action.type === 'end_turn') {
    return endTurn(input, _ctx);
  }

  return { state: input, events: [] };
}

export function checkWin(state: GameState, emit: (e: GameEvent) => void): void {
  if (state.phase !== 'playing') return;
  const alive = state.players.filter((p) => p.alive);
  if (alive.length <= 1) {
    state.phase = 'ended';
    state.winnerId = alive[0]?.id ?? null;
    if (state.winnerId) emit({ type: 'game_over', winnerId: state.winnerId });
  }
}

// endTurn lives in loop.ts and is imported; declared here as a forward reference.
import { endTurn } from './loop.js';
```

> Note: `endTurn` is implemented in Task 6 (`loop.ts`). Until then, the `end_turn` branch and the import will not resolve — that's expected; Task 6 completes it. To keep Task 5 green in isolation, the reducer tests above only exercise `play_card`. **Temporarily** stub `loop.ts` with `export function endTurn(s,c){return {state:s,events:[]};}` so the module imports; Task 6 replaces it with the real implementation and its own tests.

- [ ] **Step 5: Add the temporary `loop.ts` stub**

`engine/loop.ts`:
```ts
import type { GameState, ReduceCtx, ReduceResult } from '../types.js';
export function endTurn(state: GameState, _ctx: ReduceCtx): ReduceResult {
  return { state, events: [] }; // replaced in Task 6
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `cd cardbattle && pnpm --filter @cardbattle/shared exec vitest run reducer`
Expected: PASS (8 tests).

- [ ] **Step 7: Commit**

```bash
git add cardbattle/packages/shared/src/engine/reducer.ts cardbattle/packages/shared/src/engine/loop.ts cardbattle/packages/shared/src/cards/effects.ts cardbattle/packages/shared/src/__tests__/reducer.test.ts
git commit -m "feat(shared): add pure reducer for play_card (damage/heal/elimination/win)"
```

---

## Task 6: Game loop (`engine/loop.ts`)

**Files:**
- Modify: `cardbattle/packages/shared/src/engine/loop.ts` (replace stub)
- Test: `cardbattle/packages/shared/src/__tests__/loop.test.ts`

Provides: `initGame(players)`, `startGame(state, ctx)` (deal opening hands + first turn), `drawForCurrent(state, ctx)`, and the real `endTurn` (advance to next living player, set deadline, auto-draw, emit turn events). End-of-turn must skip dead/disconnected players and re-check win.

- [ ] **Step 1: Write the failing test** `__tests__/loop.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { initGame, startGame, endTurn } from '../engine/loop.js';
import type { ReduceCtx } from '../types.js';
import { START_HAND, START_HP, TURN_SECONDS } from '../constants.js';

let counter = 0;
const ctx = (): ReduceCtx => ({ nextCardId: () => `c${counter++}`, now: 10000 });

describe('loop', () => {
  it('initGame seats players and sets lobby defaults', () => {
    const s = initGame([{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }]);
    expect(s.phase).toBe('lobby');
    expect(s.players.map((p) => p.seat)).toEqual([0, 1]);
    expect(s.players[0].hp).toBe(START_HP);
  });

  it('startGame deals opening hands and starts first turn', () => {
    counter = 0;
    const s = startGame(initGame([{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }]), ctx());
    expect(s.state.phase).toBe('playing');
    expect(s.state.players[0].hand).toHaveLength(START_HAND + 1); // opening + first-turn draw
    expect(s.state.players[1].hand).toHaveLength(START_HAND);
    expect(s.state.turnDeadline).toBe(10000 + TURN_SECONDS * 1000);
    expect(s.events.some((e) => e.type === 'turn_started' && e.playerId === 'a')).toBe(true);
  });

  it('endTurn advances to next living player and draws for them', () => {
    counter = 0;
    const started = startGame(initGame([{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }]), ctx());
    const r = endTurn(started.state, ctx());
    expect(r.state.currentTurnIndex).toBe(1);
    expect(r.events.some((e) => e.type === 'turn_ended' && e.playerId === 'a')).toBe(true);
    expect(r.events.some((e) => e.type === 'card_drawn' && e.playerId === 'b')).toBe(true);
  });

  it('endTurn skips dead players', () => {
    counter = 0;
    const started = startGame(initGame([{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }, { id: 'c', name: 'C' }]), ctx());
    started.state.players[1].alive = false; // b is dead
    const r = endTurn(started.state, ctx());
    expect(r.state.turnOrder[r.state.currentTurnIndex]).toBe('c');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd cardbattle && pnpm --filter @cardbattle/shared exec vitest run loop`
Expected: FAIL (functions not implemented / stub returns no events).

- [ ] **Step 3: Implement `engine/loop.ts`** (replace stub)

```ts
import type { GameEvent, GameState, PlayerState, ReduceCtx, ReduceResult } from '../types.js';
import { START_HP, START_DEFENSE, START_HAND, DRAW_PER_TURN, TURN_SECONDS } from '../constants.js';
import { ALL_DEFS } from '../cards/defs.js';
import { weightedPick } from './rng.js';
import { checkWin } from './reducer.js';

export function initGame(seats: { id: string; name: string }[]): GameState {
  const players: PlayerState[] = seats.map((s, i) => ({
    id: s.id, name: s.name, connected: true, seat: i,
    hp: START_HP, maxHp: START_HP, defense: START_DEFENSE,
    hand: [], equipment: [], statuses: [], buffs: [], alive: true,
  }));
  return { phase: 'lobby', players, turnOrder: [], currentTurnIndex: 0, turnDeadline: 0, rngSeed: (Math.random() * 1e9) | 0, log: [], winnerId: null };
}

/** Draw one weighted card into a player's hand (mutates state, advances seed). */
function drawCard(state: GameState, player: PlayerState, ctx: ReduceCtx, emit: (e: GameEvent) => void): void {
  const pick = weightedPick(state.rngSeed, ALL_DEFS, (d) => d.drawWeight);
  state.rngSeed = pick.seed;
  const inst = { id: ctx.nextCardId(), defId: pick.item.id };
  player.hand.push(inst);
  emit({ type: 'card_drawn', playerId: player.id, cardInstanceId: inst.id, defId: inst.defId });
}

export function startGame(input: GameState, ctx: ReduceCtx): ReduceResult {
  const state = structuredClone(input);
  const events: GameEvent[] = [];
  const emit = (e: GameEvent) => { events.push(e); state.log.push(e); };
  state.phase = 'playing';
  state.turnOrder = state.players.filter((p) => p.alive).map((p) => p.id);
  state.currentTurnIndex = 0;
  // opening hands (drawn silently into hand; card_drawn still emitted for log)
  for (const p of state.players) {
    for (let i = 0; i < START_HAND; i++) drawCard(state, p, ctx, emit);
  }
  beginTurn(state, ctx, emit);
  return { state, events };
}

/** Set deadline, auto-draw for the current player, emit turn_started. */
function beginTurn(state: GameState, ctx: ReduceCtx, emit: (e: GameEvent) => void): void {
  const cur = state.players.find((p) => p.id === state.turnOrder[state.currentTurnIndex]);
  if (!cur) return;
  state.turnDeadline = ctx.now + TURN_SECONDS * 1000;
  for (let i = 0; i < DRAW_PER_TURN; i++) drawCard(state, cur, ctx, emit);
  emit({ type: 'turn_started', playerId: cur.id, deadline: state.turnDeadline });
}

export function endTurn(input: GameState, ctx: ReduceCtx): ReduceResult {
  if (input.phase !== 'playing') return { state: input, events: [] };
  const state = structuredClone(input);
  const events: GameEvent[] = [];
  const emit = (e: GameEvent) => { events.push(e); state.log.push(e); };
  const endingId = state.turnOrder[state.currentTurnIndex];
  emit({ type: 'turn_ended', playerId: endingId });

  // advance to next living player
  const n = state.turnOrder.length;
  for (let step = 1; step <= n; step++) {
    const idx = (state.currentTurnIndex + step) % n;
    const cand = state.players.find((p) => p.id === state.turnOrder[idx]);
    if (cand && cand.alive) { state.currentTurnIndex = idx; break; }
  }
  checkWin(state, emit);
  if (state.phase === 'playing') beginTurn(state, ctx, emit);
  return { state, events };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd cardbattle && pnpm --filter @cardbattle/shared exec vitest run`
Expected: PASS (all rng + reducer + loop tests).

- [ ] **Step 5: Update barrel `index.ts`**

```ts
export * from './types.js';
export * from './constants.js';
export * from './cards/defs.js';
export * from './cards/effects.js';
export * from './engine/rng.js';
export * from './engine/reducer.js';
export * from './engine/loop.js';
```

- [ ] **Step 6: Typecheck + full test**

Run: `cd cardbattle && pnpm --filter @cardbattle/shared exec tsc --noEmit && pnpm --filter @cardbattle/shared test`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add cardbattle/packages/shared/src
git commit -m "feat(shared): add game loop (init, start, draw, end turn, win check)"
```

---

## Task 7: Colyseus server bootstrap + state schema

> **Verify Colyseus 0.16 APIs before writing this task** (see top note). Confirm: schema decorator syntax (`@type` from `@colyseus/schema`), `Room` lifecycle (`onCreate/onJoin/onLeave`), `this.state`, `this.broadcast`, `allowReconnection`, and the per-client filtering mechanism (`StateView`). Adjust the code below to match the verified API.

**Files:**
- Create: `cardbattle/apps/server/package.json`, `cardbattle/apps/server/tsconfig.json`
- Create: `cardbattle/apps/server/src/index.ts`
- Create: `cardbattle/apps/server/src/schema/BattleState.ts`

- [ ] **Step 1: Create the server package**

`cardbattle/apps/server/package.json`:
```json
{
  "name": "@cardbattle/server",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "test": "vitest run"
  },
  "dependencies": {
    "@cardbattle/shared": "workspace:*",
    "@colyseus/core": "^0.16.0",
    "@colyseus/schema": "^3.0.0",
    "colyseus": "^0.16.0"
  },
  "devDependencies": {
    "@colyseus/testing": "^0.16.0",
    "tsx": "^4.19.0",
    "vitest": "^2.1.0",
    "typescript": "^5.6.0"
  }
}
```

`cardbattle/apps/server/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "experimentalDecorators": true, "useDefineForClassFields": false, "rootDir": "src", "noEmit": true },
  "include": ["src"]
}
```

- [ ] **Step 2: Write `schema/BattleState.ts`** (verify decorator API first)

```ts
import { Schema, MapSchema, ArraySchema, type } from '@colyseus/schema';
import type { GameState } from '@cardbattle/shared';

export class CardInstanceSchema extends Schema {
  @type('string') id = '';
  @type('string') defId = '';
}

export class PlayerSchema extends Schema {
  @type('string') id = '';
  @type('string') name = '';
  @type('boolean') connected = true;
  @type('number') seat = 0;
  @type('number') hp = 0;
  @type('number') maxHp = 0;
  @type('number') defense = 0;
  @type('boolean') alive = true;
  @type('number') handCount = 0;                 // visible to everyone
  @type([CardInstanceSchema]) hand = new ArraySchema<CardInstanceSchema>(); // filtered to owner — see Task 8
}

export class BattleState extends Schema {
  @type('string') phase = 'lobby';
  @type('number') currentTurnIndex = 0;
  @type('number') turnDeadline = 0;
  @type('string') winnerId = '';
  @type(['string']) turnOrder = new ArraySchema<string>();
  @type({ map: PlayerSchema }) players = new MapSchema<PlayerSchema>();
}

/** Mirror the authoritative plain GameState into the Colyseus schema (delta-synced). */
export function syncToSchema(schema: BattleState, gs: GameState): void {
  schema.phase = gs.phase;
  schema.currentTurnIndex = gs.currentTurnIndex;
  schema.turnDeadline = gs.turnDeadline;
  schema.winnerId = gs.winnerId ?? '';
  schema.turnOrder.splice(0, schema.turnOrder.length, ...gs.turnOrder);
  for (const p of gs.players) {
    let ps = schema.players.get(p.id);
    if (!ps) { ps = new PlayerSchema(); ps.id = p.id; schema.players.set(p.id, ps); }
    ps.name = p.name; ps.connected = p.connected; ps.seat = p.seat;
    ps.hp = p.hp; ps.maxHp = p.maxHp; ps.defense = p.defense; ps.alive = p.alive;
    ps.handCount = p.hand.length;
    // `hand` (full contents) is populated per-owner in Task 8 using StateView/filtering.
  }
}
```

- [ ] **Step 3: Write `src/index.ts`** (verify server bootstrap API first)

```ts
import { Server } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { createServer } from 'http';
import { BattleRoom } from './rooms/BattleRoom.js';

const port = Number(process.env.PORT ?? 2567);
const gameServer = new Server({ transport: new WebSocketTransport({ server: createServer() }) });
gameServer.define('battle', BattleRoom);
gameServer.listen(port);
console.log(`[cardbattle] server listening on :${port}`);
```

> `BattleRoom` does not exist yet — Task 8 creates it. This file will not run until then. Add `@colyseus/ws-transport` to dependencies if the verified bootstrap requires it.

- [ ] **Step 4: Install**

Run: `cd cardbattle && pnpm install`
Expected: resolves `@colyseus/*`. If a package name/version differs from the verified docs, correct `package.json` and re-run.

- [ ] **Step 5: Commit**

```bash
git add cardbattle/apps/server
git commit -m "feat(server): add Colyseus bootstrap and BattleState schema mirror"
```

---

## Task 8: BattleRoom (lobby, validation, reducer host, hidden hands, timer)

> **Verify Colyseus 0.16 Room + StateView API before implementing.** Hidden-hand filtering is the riskiest part: in schema v3 use `client.view` / `StateView` to expose each client only their own `PlayerSchema.hand`. If unavailable, fall back to sending each client their hand via a private message (`client.send('hand', cards)`) instead of putting full hand in the synced schema.

**Files:**
- Create: `cardbattle/apps/server/src/rooms/BattleRoom.ts`

- [ ] **Step 1: Implement `BattleRoom.ts`**

```ts
import { Room, Client } from '@colyseus/core';
import {
  initGame, startGame, reduce, endTurn,
  type GameState, type Action, type GameEvent,
  MIN_PLAYERS, MAX_PLAYERS, RECONNECT_SECONDS,
} from '@cardbattle/shared';
import { BattleState, syncToSchema } from '../schema/BattleState.js';

interface JoinOptions { name?: string; }

export class BattleRoom extends Room<BattleState> {
  maxClients = MAX_PLAYERS;
  private gs!: GameState;
  private ready = new Map<string, boolean>();
  private turnTimer?: NodeJS.Timeout;
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
      hp: 40, maxHp: 40, defense: 0, hand: [], equipment: [], statuses: [], buffs: [], alive: true,
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
    // If schema StateView is used instead, populate ps.hand here under each client's view.
  }

  async onLeave(client: Client, consented: boolean): Promise<void> {
    const p = this.gs.players.find((pp) => pp.id === client.sessionId);
    if (p) p.connected = false;
    this.publish();
    try {
      if (!consented) await this.allowReconnection(client, RECONNECT_SECONDS);
      if (p) { p.connected = true; this.publish(); }
    } catch {
      // grace expired: stay as passive seat (alive, auto-passed on their turn). See spec §8.
      // If it's their turn, auto end it.
      if (this.gs.phase === 'playing' && this.gs.turnOrder[this.gs.currentTurnIndex] === client.sessionId) {
        const r = endTurn(this.gs, this.ctx()); this.gs = r.state; this.publish(r.events); this.armTimer();
      }
    }
  }

  onDispose(): void { this.clearTimer(); }
}
```

> **Auto-pass on disconnected current player:** the timer already ends their turn after 30s, so the spec's auto-pass is satisfied even without the `onLeave` branch. The branch makes it immediate. Keep whichever the verified API supports cleanly.

- [ ] **Step 2: Typecheck**

Run: `cd cardbattle && pnpm --filter @cardbattle/server exec tsc --noEmit`
Expected: PASS (fix to match verified Colyseus API).

- [ ] **Step 3: Commit**

```bash
git add cardbattle/apps/server/src/rooms/BattleRoom.ts
git commit -m "feat(server): add BattleRoom (lobby, validation, reducer host, hidden hands, timer)"
```

---

## Task 9: Server integration test (`@colyseus/testing`)

> **Verify the `@colyseus/testing` API** (`boot`, `connectTo`, `room.waitForNextPatch`, message helpers) against 0.16 docs before writing.

**Files:**
- Create: `cardbattle/apps/server/src/__tests__/battleRoom.test.ts`

- [ ] **Step 1: Write the integration test**

```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ColyseusTestServer, boot } from '@colyseus/testing';
import { BattleRoom } from '../rooms/BattleRoom.js';

describe('BattleRoom integration', () => {
  let colyseus: ColyseusTestServer;
  beforeAll(async () => { colyseus = await boot({ initializeGameServer: (gs) => gs.define('battle', BattleRoom) } as any); });
  afterAll(async () => { await colyseus.shutdown(); });

  it('two clients can join, ready, and start a game', async () => {
    const room = await colyseus.createRoom('battle', {});
    const c1 = await colyseus.connectTo(room, { name: 'A' });
    const c2 = await colyseus.connectTo(room, { name: 'B' });
    await room.waitForNextPatch();
    expect(c1.state.players.size).toBe(2);

    let started = false;
    c1.onMessage('events', (evts: any[]) => { if (evts.some((e) => e.type === 'turn_started')) started = true; });
    c1.send('setReady', { ready: true });
    c2.send('setReady', { ready: true });
    await room.waitForNextPatch();
    expect(c1.state.phase).toBe('playing');
    expect(started).toBe(true);
  });

  it('only the owner receives their hand contents', async () => {
    const room = await colyseus.createRoom('battle', {});
    const c1 = await colyseus.connectTo(room, { name: 'A' });
    const c2 = await colyseus.connectTo(room, { name: 'B' });
    let c1Hand: any[] = [];
    c1.onMessage('hand', (h) => { c1Hand = h; });
    c1.send('setReady', { ready: true });
    c2.send('setReady', { ready: true });
    await room.waitForNextPatch();
    expect(c1Hand.length).toBeGreaterThan(0);
    // c2's synced view shows only counts for c1, never card defIds
    const c1AsSeenByC2 = c2.state.players.get(c1.sessionId);
    expect(c1AsSeenByC2?.handCount).toBeGreaterThan(0);
    expect(c1AsSeenByC2?.hand.length ?? 0).toBe(0); // contents hidden
  });
});
```

- [ ] **Step 2: Run and iterate**

Run: `cd cardbattle && pnpm --filter @cardbattle/server test`
Expected: PASS. Adjust API calls to match verified `@colyseus/testing` surface until green.

- [ ] **Step 3: Commit**

```bash
git add cardbattle/apps/server/src/__tests__/battleRoom.test.ts
git commit -m "test(server): integration test for join/ready/start and hidden hands"
```

---

## Task 10: Client scaffold + connection (`net/client.ts`)

**Files:**
- Create: `cardbattle/apps/client/package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`
- Create: `cardbattle/apps/client/src/main.tsx`, `src/net/client.ts`

- [ ] **Step 1: Create client package files**

`cardbattle/apps/client/package.json`:
```json
{
  "name": "@cardbattle/client",
  "type": "module",
  "scripts": { "dev": "vite", "build": "vite build" },
  "dependencies": {
    "@cardbattle/shared": "workspace:*",
    "colyseus.js": "^0.16.0",
    "pixi.js": "^8.0.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.0",
    "vite": "^5.4.0",
    "typescript": "^5.6.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0"
  }
}
```

`cardbattle/apps/client/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "jsx": "react-jsx", "lib": ["ES2022", "DOM", "DOM.Iterable"], "noEmit": true },
  "include": ["src"]
}
```

`cardbattle/apps/client/vite.config.ts`:
```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({ plugins: [react()], server: { host: true, port: 5173 } });
```

`cardbattle/apps/client/index.html`:
```html
<!doctype html>
<html lang="ko">
  <head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>Card Battle</title></head>
  <body style="margin:0;background:#0a0a0f"><div id="root"></div><script type="module" src="/src/main.tsx"></script></body>
</html>
```

- [ ] **Step 2: Write `net/client.ts`** (verify `colyseus.js` 0.16 API)

```ts
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
```

`src/main.tsx`:
```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.js';
createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
```

> `App.tsx` is created in Task 11.

- [ ] **Step 3: Install + dev sanity**

Run: `cd cardbattle && pnpm install`
Then create a minimal `App.tsx` returning `<div>loading</div>` temporarily and run: `pnpm --filter @cardbattle/client dev`
Expected: Vite serves on :5173, page renders without console errors. Stop the server.

@ Use the agent-browser-verify skill for the dev-server visual gut-check.

- [ ] **Step 4: Commit**

```bash
git add cardbattle/apps/client/package.json cardbattle/apps/client/tsconfig.json cardbattle/apps/client/vite.config.ts cardbattle/apps/client/index.html cardbattle/apps/client/src/main.tsx cardbattle/apps/client/src/net
git commit -m "feat(client): scaffold Vite+React client and colyseus connection"
```

---

## Task 11: Room state bridge + Lobby UI (`state/useRoom.ts`, `ui/Lobby.tsx`, `App.tsx`)

**Files:**
- Create: `cardbattle/apps/client/src/state/useRoom.ts`
- Create: `cardbattle/apps/client/src/ui/Lobby.tsx`
- Create: `cardbattle/apps/client/src/App.tsx`

`useRoom` subscribes to schema changes (via Colyseus state callbacks — verify 0.16 `getStateCallbacks` per memory note), the `events`/`hand`/`error` messages, and exposes a plain React state snapshot + a `send` helper.

- [ ] **Step 1: Implement `state/useRoom.ts`** (verify Colyseus 0.16 callback API: `getStateCallbacks(room)`, `$(state).players.onAdd`, etc.)

```ts
import { useEffect, useRef, useState, useCallback } from 'react';
import type { Room } from 'colyseus.js';
import { joinBattle } from '../net/client.js';
import type { Action, CardInstance, GameEvent } from '@cardbattle/shared';

export interface UiPlayer { id: string; name: string; seat: number; hp: number; maxHp: number; alive: boolean; connected: boolean; handCount: number; }
export interface UiState {
  phase: string; currentTurnId: string | null; turnDeadline: number;
  winnerId: string | null; players: UiPlayer[];
}

export function useRoom(name: string) {
  const [conn, setConn] = useState<{ room: Room; sessionId: string } | null>(null);
  const [ui, setUi] = useState<UiState>({ phase: 'connecting', currentTurnId: null, turnDeadline: 0, winnerId: null, players: [] });
  const [hand, setHand] = useState<CardInstance[]>([]);
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const roomRef = useRef<Room | null>(null);

  useEffect(() => {
    let disposed = false;
    joinBattle(name).then((c) => {
      if (disposed) { c.room.leave(); return; }
      roomRef.current = c.room; setConn(c);
      const snapshot = () => {
        const s: any = c.room.state;
        const players: UiPlayer[] = [];
        s.players.forEach((p: any) => players.push({ id: p.id, name: p.name, seat: p.seat, hp: p.hp, maxHp: p.maxHp, alive: p.alive, connected: p.connected, handCount: p.handCount }));
        players.sort((a, b) => a.seat - b.seat);
        setUi({ phase: s.phase, currentTurnId: s.turnOrder[s.currentTurnIndex] ?? null, turnDeadline: s.turnDeadline, winnerId: s.winnerId || null, players });
      };
      c.room.onStateChange(snapshot);
      c.room.onMessage('hand', (h: CardInstance[]) => setHand(h));
      c.room.onMessage('events', (evts: GameEvent[]) => setEvents((prev) => [...prev, ...evts]));
      c.room.onMessage('error', (e: { message: string }) => { setError(e.message); setTimeout(() => setError(null), 2000); });
    });
    return () => { disposed = true; roomRef.current?.leave(); };
  }, [name]);

  const send = useCallback((action: Action) => roomRef.current?.send('action', action), []);
  const setReady = useCallback((ready: boolean) => roomRef.current?.send('setReady', { ready }), []);
  return { conn, ui, hand, events, error, send, setReady };
}
```

- [ ] **Step 2: Implement `ui/Lobby.tsx`**

```tsx
import type { UiState } from '../state/useRoom.js';

export function Lobby({ ui, onReady }: { ui: UiState; onReady: () => void }) {
  return (
    <div style={{ color: '#e6e6f0', fontFamily: 'system-ui', padding: 32, maxWidth: 480, margin: '0 auto' }}>
      <h1 style={{ color: '#8b7bff' }}>대기방</h1>
      <p>플레이어 {ui.players.length}명 (최소 2명)</p>
      <ul>{ui.players.map((p) => <li key={p.id}>{p.name}</li>)}</ul>
      <button onClick={onReady} style={{ padding: '12px 24px', background: '#8b7bff', border: 0, borderRadius: 8, color: '#fff', cursor: 'pointer' }}>준비 완료</button>
    </div>
  );
}
```

- [ ] **Step 3: Implement `App.tsx`** (phase switch)

```tsx
import { useState } from 'react';
import { useRoom } from './state/useRoom.js';
import { Lobby } from './ui/Lobby.js';
import { Battle } from './ui/Battle.js';

export function App() {
  const [name] = useState(() => 'Player' + Math.floor(Math.random() * 1000));
  const { ui, hand, events, error, send, setReady } = useRoom(name);
  if (ui.phase === 'connecting') return <div style={{ color: '#888', padding: 32 }}>연결 중…</div>;
  if (ui.phase === 'lobby') return <Lobby ui={ui} onReady={() => setReady(true)} />;
  return <Battle ui={ui} hand={hand} events={events} error={error} send={send} myId={/* sessionId */ ''} />;
}
```

> `Battle.tsx` is created in Task 12. Wire `myId` from `conn?.sessionId` once available.

- [ ] **Step 4: Manual verify lobby**

Start server (`pnpm dev:server`) and client (`pnpm dev:client`). Open 2 tabs.
Expected: both tabs show the lobby with 2 players; clicking 준비 in both transitions to the (next task's) battle view without console errors.

@ Use the agent-browser-verify skill here.

- [ ] **Step 5: Commit**

```bash
git add cardbattle/apps/client/src/state cardbattle/apps/client/src/ui/Lobby.tsx cardbattle/apps/client/src/App.tsx
git commit -m "feat(client): room state bridge and lobby UI"
```

---

## Task 12: Battle UI (`PlayerRing`, `Hud`, `Hand`, `Log`, `Battle`)

**Files:**
- Create: `cardbattle/apps/client/src/ui/PlayerRing.tsx`, `Hud.tsx`, `Hand.tsx`, `Log.tsx`, `Battle.tsx`

Dark/neon minimal UI (full S5 polish later). Players arranged in a circle; current turn highlighted; click a damage card → it requires a target → click an opponent to confirm; heal cards play immediately; a turn-timer countdown; an end-turn button; a scrolling log.

- [ ] **Step 1: Implement `ui/PlayerRing.tsx`**

```tsx
import type { UiPlayer } from '../state/useRoom.js';

export function PlayerRing({ players, currentTurnId, myId, selectableIds, onSelect }: {
  players: UiPlayer[]; currentTurnId: string | null; myId: string;
  selectableIds: Set<string>; onSelect: (id: string) => void;
}) {
  const R = 160, cx = 200, cy = 200;
  return (
    <svg width={400} height={400} style={{ display: 'block', margin: '0 auto' }}>
      {players.map((p, i) => {
        const a = (i / players.length) * Math.PI * 2 - Math.PI / 2;
        const x = cx + R * Math.cos(a), y = cy + R * Math.sin(a);
        const isTurn = p.id === currentTurnId;
        const selectable = selectableIds.has(p.id);
        return (
          <g key={p.id} transform={`translate(${x},${y})`} style={{ cursor: selectable ? 'pointer' : 'default' }} onClick={() => selectable && onSelect(p.id)}>
            <circle r={34} fill={p.alive ? '#16161f' : '#0c0c10'} stroke={isTurn ? '#8b7bff' : selectable ? '#ff5d73' : '#33334a'} strokeWidth={isTurn || selectable ? 3 : 1.5} opacity={p.alive ? 1 : 0.4} />
            <text textAnchor="middle" y={-2} fill="#e6e6f0" fontSize={11}>{p.name}{p.id === myId ? ' (나)' : ''}</text>
            <text textAnchor="middle" y={14} fill={p.hp > p.maxHp * 0.3 ? '#6ee7b7' : '#ff5d73'} fontSize={12}>{p.hp}/{p.maxHp}</text>
          </g>
        );
      })}
    </svg>
  );
}
```

- [ ] **Step 2: Implement `ui/Hud.tsx`** (turn + timer)

```tsx
import { useEffect, useState } from 'react';

export function Hud({ currentName, deadline, myTurn, onEndTurn }: { currentName: string; deadline: number; myTurn: boolean; onEndTurn: () => void; }) {
  const [remain, setRemain] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setRemain(Math.max(0, Math.ceil((deadline - Date.now()) / 1000))), 200);
    return () => clearInterval(t);
  }, [deadline]);
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#e6e6f0', padding: '8px 16px' }}>
      <span>현재 턴: <b style={{ color: '#8b7bff' }}>{currentName}</b></span>
      <span>{remain}s</span>
      {myTurn && <button onClick={onEndTurn} style={{ padding: '8px 16px', background: '#33334a', border: 0, borderRadius: 6, color: '#fff', cursor: 'pointer' }}>턴 종료</button>}
    </div>
  );
}
```

- [ ] **Step 3: Implement `ui/Hand.tsx`** (card list + hover)

```tsx
import { CARD_DEFS, type CardInstance } from '@cardbattle/shared';

export function Hand({ hand, myTurn, selectedId, onPick }: { hand: CardInstance[]; myTurn: boolean; selectedId: string | null; onPick: (c: CardInstance) => void; }) {
  return (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'center', padding: 12, flexWrap: 'wrap' }}>
      {hand.map((c) => {
        const def = CARD_DEFS[c.defId];
        const sel = c.id === selectedId;
        return (
          <button key={c.id} disabled={!myTurn} onClick={() => onPick(c)}
            style={{ width: 96, height: 132, borderRadius: 10, border: `2px solid ${sel ? '#8b7bff' : '#33334a'}`, background: '#16161f', color: '#e6e6f0', cursor: myTurn ? 'pointer' : 'default', transform: sel ? 'translateY(-8px)' : 'none', transition: 'transform .12s', boxShadow: sel ? '0 0 16px #8b7bff66' : 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <span style={{ fontSize: 28 }}>{def?.icon}</span>
            <b style={{ fontSize: 13 }}>{def?.name}</b>
            <span style={{ fontSize: 10, color: '#9a9ab0', padding: '0 6px', textAlign: 'center' }}>{def?.desc}</span>
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: Implement `ui/Log.tsx`**

```tsx
import { CARD_DEFS, type GameEvent } from '@cardbattle/shared';

function line(e: GameEvent): string {
  switch (e.type) {
    case 'card_played': return `${e.playerId} → ${CARD_DEFS[e.defId]?.name ?? e.defId} 사용`;
    case 'damage_dealt': return `${e.targetId} 가 ${e.amount} 피해 (HP ${e.targetHpAfter})`;
    case 'healed': return `${e.targetId} 가 ${e.amount} 회복 (HP ${e.targetHpAfter})`;
    case 'player_eliminated': return `💀 ${e.playerId} 탈락`;
    case 'turn_started': return `— ${e.playerId} 턴 시작 —`;
    case 'game_over': return `🏆 ${e.winnerId} 승리!`;
    default: return '';
  }
}
export function Log({ events }: { events: GameEvent[] }) {
  const lines = events.map(line).filter(Boolean).slice(-30);
  return (
    <div style={{ height: 140, overflowY: 'auto', background: '#0c0c10', borderRadius: 8, padding: 8, color: '#9a9ab0', fontSize: 12, fontFamily: 'ui-monospace, monospace' }}>
      {lines.map((l, i) => <div key={i}>{l}</div>)}
    </div>
  );
}
```

- [ ] **Step 5: Implement `ui/Battle.tsx`** (orchestrates target selection)

```tsx
import { useState } from 'react';
import { CARD_DEFS, requiresTarget, type Action, type CardInstance, type GameEvent } from '@cardbattle/shared';
import type { UiState } from '../state/useRoom.js';
import { PlayerRing } from './PlayerRing.js';
import { Hud } from './Hud.js';
import { Hand } from './Hand.js';
import { Log } from './Log.js';

export function Battle({ ui, hand, events, error, send, myId }: {
  ui: UiState; hand: CardInstance[]; events: GameEvent[]; error: string | null; send: (a: Action) => void; myId: string;
}) {
  const [pending, setPending] = useState<CardInstance | null>(null);
  const myTurn = ui.currentTurnId === myId;

  function pick(c: CardInstance) {
    const def = CARD_DEFS[c.defId];
    if (requiresTarget(def)) { setPending((p) => (p?.id === c.id ? null : c)); }
    else { send({ type: 'play_card', cardInstanceId: c.id }); setPending(null); }
  }
  function selectTarget(id: string) {
    if (!pending) return;
    send({ type: 'play_card', cardInstanceId: pending.id, targetId: id });
    setPending(null);
  }
  const selectable = new Set(pending ? ui.players.filter((p) => p.alive && p.id !== myId).map((p) => p.id) : []);
  const currentName = ui.players.find((p) => p.id === ui.currentTurnId)?.name ?? '?';

  if (ui.phase === 'ended') {
    const winner = ui.players.find((p) => p.id === ui.winnerId);
    return <div style={{ color: '#e6e6f0', textAlign: 'center', paddingTop: 80, fontFamily: 'system-ui' }}><h1 style={{ color: '#8b7bff' }}>🏆 {winner?.name ?? '무승부'} 승리</h1></div>;
  }
  return (
    <div style={{ maxWidth: 720, margin: '0 auto', fontFamily: 'system-ui' }}>
      <Hud currentName={currentName} deadline={ui.turnDeadline} myTurn={myTurn} onEndTurn={() => send({ type: 'end_turn' })} />
      <PlayerRing players={ui.players} currentTurnId={ui.currentTurnId} myId={myId} selectableIds={selectable} onSelect={selectTarget} />
      {pending && <p style={{ textAlign: 'center', color: '#ff5d73' }}>대상을 선택하세요</p>}
      {error && <p style={{ textAlign: 'center', color: '#ff5d73' }}>{error}</p>}
      <Hand hand={hand} myTurn={myTurn} selectedId={pending?.id ?? null} onPick={pick} />
      <Log events={events} />
    </div>
  );
}
```

- [ ] **Step 6: Wire `myId` in `App.tsx`** — pass `conn?.sessionId ?? ''` to `<Battle myId=…>` and expose `conn` from `useRoom`.

- [ ] **Step 7: Typecheck**

Run: `cd cardbattle && pnpm --filter @cardbattle/client exec tsc --noEmit`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add cardbattle/apps/client/src/ui cardbattle/apps/client/src/App.tsx cardbattle/apps/client/src/state/useRoom.ts
git commit -m "feat(client): battle UI (player ring, hud, hand, log, target selection)"
```

---

## Task 13: VFX stub layer (`vfx/VfxLayer.tsx`)

**Files:**
- Create: `cardbattle/apps/client/src/vfx/VfxLayer.tsx`
- Modify: `cardbattle/apps/client/src/ui/Battle.tsx` (mount the layer, feed it new events)

Minimal Pixi-or-DOM feedback so the loop *feels* alive (full S4 later): on each `damage_dealt`/`healed` event, flash the screen briefly and float a damage/heal number. Keep it a self-contained component reacting to the latest event.

- [ ] **Step 1: Implement `vfx/VfxLayer.tsx`** (DOM-based floating numbers; Pixi upgrade deferred to S4)

```tsx
import { useEffect, useState } from 'react';
import type { GameEvent } from '@cardbattle/shared';

interface Floater { id: number; text: string; color: string; }

export function VfxLayer({ latest }: { latest: GameEvent | null }) {
  const [floaters, setFloaters] = useState<Floater[]>([]);
  const [flash, setFlash] = useState<string | null>(null);
  useEffect(() => {
    if (!latest) return;
    let f: Floater | null = null;
    if (latest.type === 'damage_dealt') { f = { id: Math.random(), text: `-${latest.amount}`, color: '#ff5d73' }; setFlash('#ff5d7322'); }
    else if (latest.type === 'healed') { f = { id: Math.random(), text: `+${latest.amount}`, color: '#6ee7b7' }; setFlash('#6ee7b722'); }
    if (f) {
      const ff = f;
      setFloaters((p) => [...p, ff]);
      setTimeout(() => setFloaters((p) => p.filter((x) => x.id !== ff.id)), 800);
      setTimeout(() => setFlash(null), 120);
    }
  }, [latest]);
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', background: flash ?? 'transparent', transition: 'background .1s' }}>
      {floaters.map((f) => (
        <div key={f.id} style={{ position: 'absolute', left: '50%', top: '40%', transform: 'translateX(-50%)', color: f.color, fontSize: 40, fontWeight: 800, textShadow: '0 2px 8px #000', animation: 'float 0.8s ease-out forwards' }}>{f.text}</div>
      ))}
      <style>{`@keyframes float { from { opacity:1; transform: translate(-50%, 0);} to { opacity:0; transform: translate(-50%,-60px);} }`}</style>
    </div>
  );
}
```

- [ ] **Step 2: Feed the latest event from `Battle.tsx`**

In `Battle.tsx`, add: `const latest = events[events.length - 1] ?? null;` and render `<VfxLayer latest={latest} />` at the top of the returned tree.

- [ ] **Step 3: Manual verify**

Play a full 2-tab match: attack lands → red flash + `-N` floats; heal → green `+N`; a player reaches 0 → eliminated; last player → win screen.

@ Use the agent-browser-verify skill for the visual gut-check.

- [ ] **Step 4: Commit**

```bash
git add cardbattle/apps/client/src/vfx cardbattle/apps/client/src/ui/Battle.tsx
git commit -m "feat(client): minimal VFX stub (hit flash + floating damage/heal numbers)"
```

---

## Task 14: End-to-end verification + S1 sign-off

**Files:** none (verification only)

- [ ] **Step 1: Full automated suite**

Run: `cd cardbattle && pnpm --filter @cardbattle/shared test && pnpm --filter @cardbattle/server test`
Expected: all green.

- [ ] **Step 2: Manual 3-player match**

Start server + client. Open 3 tabs, all ready. Verify against spec §1 success criteria:
- turn rotates clockwise (by seat), draw→action→end works
- sword/bow/spear damage a chosen target; bomb hits all others; potion/greatheal heal self (capped)
- elimination at 0 HP; last survivor → win screen
- own hand visible, others show only count
- 30s timer auto-ends a turn
- disconnect one tab mid-game → their turn auto-passes; reconnect within 30s restores

@ Use the verification skill (full-story end-to-end) for this step.

- [ ] **Step 3: Final commit / tag**

```bash
git add -A
git commit -m "chore: S1 core game loop complete and verified"
```

---

## Done criteria (S1)

All Task 14 checks pass. The pure engine is fully unit-tested; the server enforces authority and hidden information; the client renders a playable dark/neon loop with placeholder VFX. **Next sub-project: S2 (data-driven card engine: 30+ cards, defense-response window, equipment).** The effect dispatcher map, `GameEvent` union, and `resolveAttack` seam are already in place for it.
