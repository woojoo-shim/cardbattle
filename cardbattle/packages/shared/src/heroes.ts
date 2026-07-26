import type { Effect, Element } from './types.js';

/** A per-avatar signature ability (하스스톤 영웅 능력): a fixed, once-per-turn play that costs
 *  mana and runs a small set of Effects through the same handlers as cards. Every seat always
 *  has one (keyed by its chosen avatar), so it's the reliable fallback when your hand is dry. */
export interface HeroPower {
  id: string;
  name: string;
  icon: string;
  cost: number;
  element: Element;
  effects: Effect[];
  desc: string;
}

const COST = 2;

/** Signature abilities keyed by avatar id (HUMAN_AVATARS + BOT_AVATAR). Costs are uniform (2)
 *  so the choice is about EFFECT, not price — the same spread the card pool offers in miniature:
 *  self-buff (shield/heal/reflect), ramp (mana), an AoE, and targeted bursts. */
export const HERO_POWERS: Record<string, HeroPower> = {
  // 방벽 — a dependable guard turn: bank defense when you have nothing to play.
  hero:    { id: 'hp_hero',    name: '방벽',     icon: '🛡️', cost: COST, element: 'holy',     effects: [{ kind: 'shield', amount: 6 }], desc: '방어 +6' },
  // 화염 첨탑 — a clean targeted burn, the archetypal mage nuke.
  mage:    { id: 'hp_mage',    name: '화염 첨탑', icon: '🔥', cost: COST, element: 'fire',     effects: [{ kind: 'damage', amount: 3, target: 'chosen' }], desc: '대상에게 3 피해' },
  // 재빠른 손 — ramp: bank toward a bigger multi-card turn later.
  goblin:  { id: 'hp_goblin',  name: '재빠른 손', icon: '🔷', cost: COST, element: 'lightning',effects: [{ kind: 'mana', amount: 2 }], desc: '마나 +2 (비용 2 → 실질 +0, 다음 턴 이월)' },
  // 화염 숨결 — chip every foe at once; strong in a crowded FFA table.
  dragon:  { id: 'hp_dragon',  name: '화염 숨결', icon: '🐲', cost: COST, element: 'fire',     effects: [{ kind: 'damage', amount: 2, target: 'all' }], desc: '나를 제외한 모두에게 2 피해' },
  // 재생력 — a steady self-mend to outlast the room.
  ogre:    { id: 'hp_ogre',    name: '재생력',   icon: '💪', cost: COST, element: 'holy',     effects: [{ kind: 'heal', amount: 5 }], desc: '나를 5 회복' },
  // 피의 갈망 — a small lifesteal poke: pressure a foe and top yourself up.
  vampire: { id: 'hp_vampire', name: '피의 갈망', icon: '🩸', cost: COST, element: 'poison',   effects: [{ kind: 'damage', amount: 3, target: 'chosen' }, { kind: 'heal', amount: 2 }], desc: '대상에게 3 피해, 나를 2 회복' },
  // 독니 — lay a lingering toxin that ignores shield.
  bat:     { id: 'hp_bat',     name: '독니',     icon: '🦇', cost: COST, element: 'poison',   effects: [{ kind: 'poison', amount: 2, turns: 2, target: 'chosen' }], desc: '대상에게 2턴간 매 턴 2 중독 피해(방어 무시)' },
  // 원혼의 장막 — a short reflector to punish whoever swings at you.
  ghost:   { id: 'hp_ghost',   name: '원혼의 장막', icon: '👻', cost: COST, element: 'none',   effects: [{ kind: 'reflect', pct: 0.4, turns: 1 }], desc: '내 다음 턴까지 받는 피해의 40%를 공격자에게 되돌린다' },
  // 조준 사격 — the bot's straightforward targeted hit.
  bot:     { id: 'hp_bot',     name: '조준 사격', icon: '🤖', cost: COST, element: 'physical', effects: [{ kind: 'damage', amount: 3, target: 'chosen' }], desc: '대상에게 3 피해' },
};

export const DEFAULT_HERO_POWER = HERO_POWERS.hero;

/** The signature ability for an avatar, falling back to the default guard if unknown. */
export function heroPowerFor(avatar: string): HeroPower {
  return HERO_POWERS[avatar] ?? DEFAULT_HERO_POWER;
}

/** Does this hero power need the player to pick a target first? (mirrors cards' requiresTarget) */
export function heroPowerNeedsTarget(power: HeroPower): boolean {
  return power.effects.some(
    (e) => (e.kind === 'damage' && e.target === 'chosen') || (e.kind === 'poison' && e.target === 'chosen') || e.kind === 'pierce' || e.kind === 'peek' || e.kind === 'discard' || e.kind === 'skip' || e.kind === 'steal' || e.kind === 'swap' || e.kind === 'manaburn' || e.kind === 'desperation',
  );
}
