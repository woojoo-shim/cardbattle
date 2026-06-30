import type { CardDef } from '../types.js';

export const CARD_DEFS: Record<string, CardDef> = {
  sword:    { id: 'sword',    name: '검',     rarity: 'common', cost: 0, element: 'physical', kind: 'weapon', effects: [{ kind: 'damage', amount: 10, target: 'chosen' }], cooldown: 0, vfxKey: 'slash',   sfxKey: 'slash',   icon: '🗡️', desc: '대상에게 10 피해', drawWeight: 20 },
  bow:      { id: 'bow',      name: '활',     rarity: 'common', cost: 0, element: 'physical', kind: 'weapon', effects: [{ kind: 'damage', amount: 7,  target: 'chosen' }], cooldown: 0, vfxKey: 'arrow',   sfxKey: 'arrow',   icon: '🏹', desc: '대상에게 7 피해',  drawWeight: 20 },
  spear:    { id: 'spear',    name: '창',     rarity: 'rare',   cost: 0, element: 'physical', kind: 'weapon', effects: [{ kind: 'damage', amount: 13, target: 'chosen' }], cooldown: 0, vfxKey: 'thrust',  sfxKey: 'thrust',  icon: '🔱', desc: '대상에게 13 피해', drawWeight: 10 },
  bomb:     { id: 'bomb',     name: '폭탄',   rarity: 'epic',   cost: 0, element: 'fire',     kind: 'magic',  effects: [{ kind: 'damage', amount: 12, target: 'all' }],    cooldown: 0, vfxKey: 'explode', sfxKey: 'explode', icon: '💣', desc: '나를 제외한 모두에게 12 피해', drawWeight: 8 },
  potion:   { id: 'potion',   name: '회복약', rarity: 'common', cost: 0, element: 'holy',     kind: 'heal',   effects: [{ kind: 'heal',   amount: 8 }],                 cooldown: 0, vfxKey: 'heal',    sfxKey: 'heal',    icon: '🧪', desc: '나를 8 회복', drawWeight: 9 },
  greatheal:{ id: 'greatheal',name: '대회복', rarity: 'rare',   cost: 0, element: 'holy',     kind: 'heal',   effects: [{ kind: 'heal',   amount: 14 }],                cooldown: 0, vfxKey: 'heal',    sfxKey: 'heal',    icon: '✨', desc: '나를 14 회복', drawWeight: 3 },
  // Special cards — change the flow of play, not just HP.
  reverse:  { id: 'reverse',  name: '역류',   rarity: 'rare',   cost: 0, element: 'lightning',kind: 'special',effects: [{ kind: 'reverse' }],                          cooldown: 0, vfxKey: 'reverse', sfxKey: 'reverse', icon: '🔄', desc: '진행 방향을 반대로 뒤집는다', drawWeight: 8 },
  shield:   { id: 'shield',   name: '방패',   rarity: 'common', cost: 0, element: 'holy',     kind: 'equipment',effects:[{ kind: 'shield', amount: 8 }],                 cooldown: 0, vfxKey: 'shield',  sfxKey: 'shield',  icon: '🛡️', desc: '방어 +8 (받는 피해 감소)', drawWeight: 12 },
  drain:    { id: 'drain',    name: '흡혈검', rarity: 'rare',   cost: 0, element: 'poison',   kind: 'magic',  effects: [{ kind: 'damage', amount: 8, target: 'chosen' }, { kind: 'heal', amount: 8 }], cooldown: 0, vfxKey: 'drain', sfxKey: 'drain', icon: '🩸', desc: '대상에게 8 피해, 나를 8 회복', drawWeight: 8 },
  bolt:     { id: 'bolt',     name: '벼락',   rarity: 'epic',   cost: 0, element: 'lightning',kind: 'magic',  effects: [{ kind: 'damage', amount: 16, target: 'random' }], cooldown: 0, vfxKey: 'bolt',  sfxKey: 'bolt',  icon: '⚡', desc: '무작위 적에게 16 피해', drawWeight: 6 },
  peek:     { id: 'peek',     name: '간파',   rarity: 'rare',   cost: 0, element: 'none',     kind: 'special',effects: [{ kind: 'peek' }],                              cooldown: 0, vfxKey: 'peek',   sfxKey: 'peek',   icon: '🔮', desc: '지목한 상대의 손패 1장을 몰래 엿본다', drawWeight: 9 },
  shatter:  { id: 'shatter',  name: '파쇄',   rarity: 'epic',   cost: 0, element: 'poison',   kind: 'special',effects: [{ kind: 'discard' }],                           cooldown: 0, vfxKey: 'shatter',sfxKey: 'shatter',icon: '🗑️', desc: '지목한 상대의 손패 1장을 무작위로 파괴한다', drawWeight: 6 },
};

export const ALL_DEFS: CardDef[] = Object.values(CARD_DEFS);

/** Does this card require the player to pick a target before playing? */
export function requiresTarget(def: CardDef): boolean {
  return def.effects.some(
    (e) => (e.kind === 'damage' && e.target === 'chosen') || e.kind === 'peek' || e.kind === 'discard',
  );
}
