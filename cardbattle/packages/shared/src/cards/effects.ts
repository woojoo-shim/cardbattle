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
