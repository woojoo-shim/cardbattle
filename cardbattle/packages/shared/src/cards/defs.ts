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
