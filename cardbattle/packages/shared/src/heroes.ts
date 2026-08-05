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
 *  so the choice is about EFFECT, not price — a miniature of the board deck: self-buff (shield/heal),
 *  ramp (mana), a token summon, an AoE, card draw, and targeted bursts. */
export const HERO_POWERS: Record<string, HeroPower> = {
  // 방벽 — a dependable guard turn: bank defense when you have nothing to play.
  hero:    { id: 'hp_hero',    name: '방벽',     icon: '🛡️', cost: COST, element: 'holy',     effects: [{ kind: 'shield', amount: 6 }], desc: '방어 +6' },
  // 화염 첨탑 — a clean targeted burn, the archetypal mage nuke (영웅/하수인 아무나).
  mage:    { id: 'hp_mage',    name: '화염 첨탑', icon: '🔥', cost: COST, element: 'fire',     effects: [{ kind: 'damage', amount: 3, target: 'chosen' }], desc: '대상에게 3 피해' },
  // 재빠른 손 — ramp: bank toward a bigger multi-card turn later.
  goblin:  { id: 'hp_goblin',  name: '재빠른 손', icon: '🔷', cost: COST, element: 'lightning',effects: [{ kind: 'gainMana', amount: 2 }], desc: '마나 +2 (비용 2 → 실질 +0, 다음 턴 이월)' },
  // 화염 숨결 — chip every foe at once; strong in a crowded FFA table.
  dragon:  { id: 'hp_dragon',  name: '화염 숨결', icon: '🐲', cost: COST, element: 'fire',     effects: [{ kind: 'damage', amount: 2, target: 'allEnemies' }], desc: '나를 제외한 모든 영웅에게 2 피해' },
  // 재생력 — a steady self-mend to outlast the room.
  ogre:    { id: 'hp_ogre',    name: '재생력',   icon: '💪', cost: COST, element: 'holy',     effects: [{ kind: 'heal', amount: 5, target: 'hero' }], desc: '내 영웅을 5 회복' },
  // 피의 갈망 — a small poke that tops you up: hit a target, mend yourself.
  vampire: { id: 'hp_vampire', name: '피의 갈망', icon: '🩸', cost: COST, element: 'poison',   effects: [{ kind: 'damage', amount: 3, target: 'chosen' }, { kind: 'heal', amount: 2, target: 'hero' }], desc: '대상에게 3 피해, 내 영웅을 2 회복' },
  // 박쥐 소환 — put a small body on the board every turn.
  bat:     { id: 'hp_bat',     name: '박쥐 소환', icon: '🦇', cost: COST, element: 'none',     effects: [{ kind: 'summon', token: 'sprite', count: 1 }], desc: '반딧불 정령(1/2) 하나를 소환한다' },
  // 원혼의 계시 — dig for answers: refill your hand.
  ghost:   { id: 'hp_ghost',   name: '원혼의 계시', icon: '👻', cost: COST, element: 'none',   effects: [{ kind: 'draw', amount: 1 }], desc: '카드 1장을 뽑는다' },
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
    (e) =>
      (e.kind === 'damage' && e.target === 'chosen') ||
      (e.kind === 'heal' && e.target === 'chosen') ||
      (e.kind === 'buff' && e.target === 'chosen') ||
      e.kind === 'destroy',
  );
}
