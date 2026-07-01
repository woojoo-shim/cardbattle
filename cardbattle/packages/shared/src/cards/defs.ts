import type { CardDef } from '../types.js';

export const CARD_DEFS: Record<string, CardDef> = {
  sword:    { id: 'sword',    name: '검',     rarity: 'common', cost: 2, element: 'physical', kind: 'weapon', effects: [{ kind: 'damage', amount: 10, target: 'chosen' }], cooldown: 0, vfxKey: 'slash',   sfxKey: 'slash',   icon: '🗡️', desc: '대상에게 10 피해', drawWeight: 20 },
  bow:      { id: 'bow',      name: '활',     rarity: 'common', cost: 1, element: 'physical', kind: 'weapon', effects: [{ kind: 'damage', amount: 7,  target: 'chosen' }], cooldown: 0, vfxKey: 'arrow',   sfxKey: 'arrow',   icon: '🏹', desc: '대상에게 7 피해',  drawWeight: 20 },
  spear:    { id: 'spear',    name: '창',     rarity: 'rare',   cost: 3, element: 'physical', kind: 'weapon', effects: [{ kind: 'damage', amount: 13, target: 'chosen' }], cooldown: 0, vfxKey: 'thrust',  sfxKey: 'thrust',  icon: '🔱', desc: '대상에게 13 피해', drawWeight: 10 },
  bomb:     { id: 'bomb',     name: '폭탄',   rarity: 'epic',   cost: 4, element: 'fire',     kind: 'magic',  effects: [{ kind: 'damage', amount: 12, target: 'all' }],    cooldown: 0, vfxKey: 'explode', sfxKey: 'explode', icon: '💣', desc: '나를 제외한 모두에게 12 피해', drawWeight: 8 },
  potion:   { id: 'potion',   name: '회복약', rarity: 'common', cost: 1, element: 'holy',     kind: 'heal',   effects: [{ kind: 'heal',   amount: 8 }],                 cooldown: 0, vfxKey: 'heal',    sfxKey: 'heal',    icon: '🧪', desc: '나를 8 회복', drawWeight: 9 },
  greatheal:{ id: 'greatheal',name: '대회복', rarity: 'rare',   cost: 3, element: 'holy',     kind: 'heal',   effects: [{ kind: 'heal',   amount: 14 }],                cooldown: 0, vfxKey: 'heal',    sfxKey: 'heal',    icon: '✨', desc: '나를 14 회복', drawWeight: 3 },
  // Special cards — change the flow of play, not just HP.
  reverse:  { id: 'reverse',  name: '역류',   rarity: 'rare',   cost: 2, element: 'lightning',kind: 'special',effects: [{ kind: 'reverse' }],                          cooldown: 0, vfxKey: 'reverse', sfxKey: 'reverse', icon: '🔄', desc: '진행 방향을 반대로 뒤집는다', drawWeight: 8 },
  shield:   { id: 'shield',   name: '방패',   rarity: 'common', cost: 2, element: 'holy',     kind: 'equipment',effects:[{ kind: 'shield', amount: 8 }],                 cooldown: 0, vfxKey: 'shield',  sfxKey: 'shield',  icon: '🛡️', desc: '방어 +8 (받는 피해 감소)', drawWeight: 12 },
  drain:    { id: 'drain',    name: '흡혈검', rarity: 'rare',   cost: 3, element: 'poison',   kind: 'magic',  effects: [{ kind: 'damage', amount: 8, target: 'chosen' }, { kind: 'heal', amount: 8 }], cooldown: 0, vfxKey: 'drain', sfxKey: 'drain', icon: '🩸', desc: '대상에게 8 피해, 나를 8 회복', drawWeight: 8 },
  bolt:     { id: 'bolt',     name: '벼락',   rarity: 'epic',   cost: 4, element: 'lightning',kind: 'magic',  effects: [{ kind: 'damage', amount: 16, target: 'random' }], cooldown: 0, vfxKey: 'bolt',  sfxKey: 'bolt',  icon: '⚡', desc: '무작위 적에게 16 피해', drawWeight: 6 },
  peek:     { id: 'peek',     name: '간파',   rarity: 'rare',   cost: 1, element: 'none',     kind: 'special',effects: [{ kind: 'peek' }],                              cooldown: 0, vfxKey: 'peek',   sfxKey: 'peek',   icon: '🔮', desc: '지목한 상대의 손패 1장을 몰래 엿본다', drawWeight: 9 },
  shatter:  { id: 'shatter',  name: '파쇄',   rarity: 'epic',   cost: 2, element: 'poison',   kind: 'special',effects: [{ kind: 'discard' }],                           cooldown: 0, vfxKey: 'shatter',sfxKey: 'shatter',icon: '🗑️', desc: '지목한 상대의 손패 1장을 무작위로 파괴한다', drawWeight: 6 },
  // Tempo / gamble cards — manipulate turn order and attack power.
  bind:     { id: 'bind',     name: '결박',   rarity: 'epic',   cost: 3, element: 'ice',      kind: 'special',effects: [{ kind: 'skip' }],                              cooldown: 0, vfxKey: 'bind',   sfxKey: 'bind',   icon: '⛓️', desc: '지목한 상대의 다음 턴을 건너뛰게 한다', drawWeight: 6 },
  gambit:   { id: 'gambit',   name: '도박',   rarity: 'epic',   cost: 2, element: 'none',     kind: 'special',effects: [{ kind: 'gamble' }],                            cooldown: 0, vfxKey: 'gamble', sfxKey: 'gamble', icon: '🎲', desc: '이번 턴 다음 공격이 50%로 2배, 50%로 빗나간다', drawWeight: 6 },
  sacrifice:{ id: 'sacrifice',name: '희생',   rarity: 'epic',   cost: 3, element: 'holy',     kind: 'special',effects: [{ kind: 'heal', amount: 10 }, { kind: 'empower', amount: 1.5 }, { kind: 'selfskip' }], cooldown: 0, vfxKey: 'sacrifice', sfxKey: 'sacrifice', icon: '🔥', desc: '다음 턴을 포기하는 대신 10 회복 + 이번 턴 공격 1.5배', drawWeight: 5 },
  // Extra designs — twin strike, combo recovery, finisher, and an all-out judgment.
  twinstrike:{id: 'twinstrike',name:'연격',   rarity: 'rare',   cost: 3, element: 'physical', kind: 'weapon', effects: [{ kind: 'damage', amount: 6, target: 'chosen' }, { kind: 'damage', amount: 6, target: 'chosen' }], cooldown: 0, vfxKey: 'slash', sfxKey: 'slash', icon: '⚔️', desc: '대상에게 6 피해를 두 번 (총 12)', drawWeight: 7 },
  firstaid: { id: 'firstaid', name: '응급처치',rarity: 'rare',   cost: 2, element: 'holy',     kind: 'heal',   effects: [{ kind: 'heal', amount: 6 }, { kind: 'shield', amount: 6 }], cooldown: 0, vfxKey: 'heal', sfxKey: 'heal', icon: '🩹', desc: '나를 6 회복하고 방어 +6', drawWeight: 6 },
  snipe:    { id: 'snipe',    name: '저격',   rarity: 'legendary',cost:5, element: 'physical', kind: 'weapon', effects: [{ kind: 'damage', amount: 20, target: 'chosen' }], cooldown: 0, vfxKey: 'snipe',  sfxKey: 'snipe',  icon: '🎯', desc: '대상에게 20 피해', drawWeight: 3 },
  judgment: { id: 'judgment', name: '심판',   rarity: 'epic',   cost: 4, element: 'holy',     kind: 'magic',  effects: [{ kind: 'damage', amount: 8, target: 'all' }, { kind: 'heal', amount: 8 }], cooldown: 0, vfxKey: 'explode', sfxKey: 'explode', icon: '⚖️', desc: '나를 제외한 모두에게 8 피해, 나를 8 회복', drawWeight: 4 },
  plunder:  { id: 'plunder',  name: '강탈',   rarity: 'epic',   cost: 3, element: 'poison',   kind: 'special',effects: [{ kind: 'steal' }],                             cooldown: 0, vfxKey: 'plunder',sfxKey: 'plunder',icon: '🫳', desc: '지목한 상대의 손패 1장을 무작위로 빼앗아 온다', drawWeight: 5 },
  // Mana ramp: costs 1 but grants 3 (net +2), letting you bank toward a big multi-card turn.
  charge:   { id: 'charge',   name: '충전',   rarity: 'rare',   cost: 1, element: 'lightning',kind: 'special',effects: [{ kind: 'mana', amount: 3 }],                    cooldown: 0, vfxKey: 'charge', sfxKey: 'charge', icon: '🔷', desc: '마나 +3 (비용 1 → 실질 +2)', drawWeight: 8 },
  // New wave — cheap filler, elemental nukes, a freeze-strike, a triple hit, a big wall,
  // a ramp+heal, an AoE finisher, and an armor-piercing execution.
  dagger:   { id: 'dagger',   name: '단검',   rarity: 'common', cost: 1, element: 'physical', kind: 'weapon', effects: [{ kind: 'damage', amount: 5, target: 'chosen' }], cooldown: 0, vfxKey: 'slash',   sfxKey: 'slash',   icon: '🔪', desc: '대상에게 5 피해', drawWeight: 18 },
  fireball: { id: 'fireball', name: '화염구', rarity: 'epic',   cost: 3, element: 'fire',     kind: 'magic',  effects: [{ kind: 'damage', amount: 11, target: 'chosen' }], cooldown: 0, vfxKey: 'explode', sfxKey: 'explode', icon: '🔥', desc: '대상에게 11 피해', drawWeight: 7 },
  frostbolt:{ id: 'frostbolt',name: '서리화살',rarity:'epic',   cost: 4, element: 'ice',      kind: 'magic',  effects: [{ kind: 'damage', amount: 8, target: 'chosen' }, { kind: 'skip' }], cooldown: 0, vfxKey: 'bind', sfxKey: 'bind', icon: '🧊', desc: '대상에게 8 피해 + 다음 턴을 얼려 건너뛰게 한다', drawWeight: 5 },
  windfury: { id: 'windfury', name: '질풍참', rarity: 'epic',   cost: 4, element: 'physical', kind: 'weapon', effects: [{ kind: 'damage', amount: 5, target: 'chosen' }, { kind: 'damage', amount: 5, target: 'chosen' }, { kind: 'damage', amount: 5, target: 'chosen' }], cooldown: 0, vfxKey: 'slash', sfxKey: 'slash', icon: '🌪️', desc: '대상에게 5 피해를 세 번 (총 15)', drawWeight: 5 },
  bulwark:  { id: 'bulwark',  name: '성벽',   rarity: 'rare',   cost: 3, element: 'holy',     kind: 'equipment',effects:[{ kind: 'shield', amount: 16 }],                cooldown: 0, vfxKey: 'shield',  sfxKey: 'shield',  icon: '🧱', desc: '방어 +16 (받는 피해 감소)', drawWeight: 7 },
  meditate: { id: 'meditate', name: '명상',   rarity: 'common', cost: 1, element: 'none',     kind: 'special',effects: [{ kind: 'mana', amount: 2 }, { kind: 'heal', amount: 4 }], cooldown: 0, vfxKey: 'charge', sfxKey: 'charge', icon: '🧘', desc: '마나 +2, 나를 4 회복', drawWeight: 9 },
  holynova: { id: 'holynova', name: '신성폭발',rarity:'legendary',cost:5, element: 'holy',     kind: 'magic',  effects: [{ kind: 'damage', amount: 10, target: 'all' }, { kind: 'heal', amount: 12 }], cooldown: 0, vfxKey: 'explode', sfxKey: 'explode', icon: '🌟', desc: '나를 제외한 모두에게 10 피해, 나를 12 회복', drawWeight: 3 },
  execute:  { id: 'execute',  name: '처형',   rarity: 'legendary',cost:5, element: 'physical', kind: 'weapon', effects: [{ kind: 'pierce', amount: 18, target: 'chosen' }], cooldown: 0, vfxKey: 'snipe', sfxKey: 'snipe', icon: '🪓', desc: '대상에게 방어를 무시하는 18 관통 피해', drawWeight: 3 },
};

export const ALL_DEFS: CardDef[] = Object.values(CARD_DEFS);

/** Does this card require the player to pick a target before playing? */
export function requiresTarget(def: CardDef): boolean {
  return def.effects.some(
    (e) => (e.kind === 'damage' && e.target === 'chosen') || e.kind === 'pierce' || e.kind === 'peek' || e.kind === 'discard' || e.kind === 'skip' || e.kind === 'steal',
  );
}
