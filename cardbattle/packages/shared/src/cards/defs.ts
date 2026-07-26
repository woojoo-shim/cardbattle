import type { CardDef } from '../types.js';

// Hearthstone-style board deck: 20 minions summoned to the field + 10 spells cast for instant effect.
// A minion card's `effects` are its 전투의 함성 (battlecry, fired on summon); `deathrattle` fires on death.
// A spell card's `effects` fire the moment it's played.
export const CARD_DEFS: Record<string, CardDef> = {
  // ---- MINIONS (20) ----
  sprite:      { id: 'sprite',      name: '꼬마 정령',   rarity: 'common', cost: 1, element: 'none',      kind: 'minion', minion: { attack: 1, health: 2 }, effects: [], cooldown: 0, vfxKey: 'summon', sfxKey: 'summon', icon: '🧚', desc: '1/2 하수인.', drawWeight: 14 },
  recruit:     { id: 'recruit',     name: '신병',        rarity: 'common', cost: 1, element: 'physical',  kind: 'minion', minion: { attack: 2, health: 1 }, effects: [], cooldown: 0, vfxKey: 'summon', sfxKey: 'summon', icon: '🪖', desc: '2/1 하수인.', drawWeight: 14 },
  guard:       { id: 'guard',       name: '수비병',      rarity: 'common', cost: 2, element: 'physical',  kind: 'minion', minion: { attack: 2, health: 3 }, keywords: ['taunt'], effects: [], cooldown: 0, vfxKey: 'summon', sfxKey: 'shield', icon: '🛡️', desc: '2/3 · 도발 (적은 먼저 이 하수인을 공격해야 한다).', drawWeight: 12 },
  wolf:        { id: 'wolf',        name: '늑대',        rarity: 'common', cost: 2, element: 'physical',  kind: 'minion', minion: { attack: 3, health: 2 }, keywords: ['charge'], effects: [], cooldown: 0, vfxKey: 'summon', sfxKey: 'slash', icon: '🐺', desc: '3/2 · 돌진 (소환된 턴에 바로 공격).', drawWeight: 10 },
  squire:      { id: 'squire',      name: '종자',        rarity: 'common', cost: 2, element: 'none',      kind: 'minion', minion: { attack: 2, health: 2 }, effects: [{ kind: 'draw', amount: 1 }], cooldown: 0, vfxKey: 'summon', sfxKey: 'draw', icon: '🧑‍🌾', desc: '2/2 · 전투의 함성: 카드 1장을 뽑는다.', drawWeight: 9 },
  archer:      { id: 'archer',      name: '궁수',        rarity: 'rare',   cost: 3, element: 'physical',  kind: 'minion', minion: { attack: 3, health: 2 }, effects: [{ kind: 'damage', amount: 2, target: 'chosen' }], cooldown: 0, vfxKey: 'summon', sfxKey: 'arrow', icon: '🏹', desc: '3/2 · 전투의 함성: 지목한 대상에게 2 피해.', drawWeight: 8 },
  knight:      { id: 'knight',      name: '기사',        rarity: 'common', cost: 3, element: 'physical',  kind: 'minion', minion: { attack: 4, health: 3 }, effects: [], cooldown: 0, vfxKey: 'summon', sfxKey: 'summon', icon: '🤺', desc: '4/3 하수인.', drawWeight: 10 },
  cleric:      { id: 'cleric',      name: '사제',        rarity: 'rare',   cost: 3, element: 'holy',      kind: 'minion', minion: { attack: 2, health: 3 }, effects: [{ kind: 'heal', amount: 4, target: 'hero' }], cooldown: 0, vfxKey: 'summon', sfxKey: 'heal', icon: '⛪', desc: '2/3 · 전투의 함성: 내 영웅을 4 회복.', drawWeight: 7 },
  shieldbearer:{ id: 'shieldbearer',name: '방패병',      rarity: 'rare',   cost: 3, element: 'holy',      kind: 'minion', minion: { attack: 1, health: 6 }, keywords: ['taunt'], effects: [], cooldown: 0, vfxKey: 'summon', sfxKey: 'shield', icon: '🧱', desc: '1/6 · 도발.', drawWeight: 7 },
  berserker:   { id: 'berserker',   name: '광전사',      rarity: 'rare',   cost: 3, element: 'fire',      kind: 'minion', minion: { attack: 5, health: 2 }, effects: [], cooldown: 0, vfxKey: 'summon', sfxKey: 'slash', icon: '😤', desc: '5/2 하수인.', drawWeight: 7 },
  venomspider: { id: 'venomspider', name: '맹독거미',    rarity: 'rare',   cost: 3, element: 'poison',    kind: 'minion', minion: { attack: 2, health: 3 }, keywords: ['poisonous'], effects: [], cooldown: 0, vfxKey: 'summon', sfxKey: 'poison', icon: '🕷️', desc: '2/3 · 독성 (피해를 준 하수인을 즉사시킨다).', drawWeight: 7 },
  cavalier:    { id: 'cavalier',    name: '창기병',      rarity: 'rare',   cost: 4, element: 'physical',  kind: 'minion', minion: { attack: 4, health: 3 }, keywords: ['charge'], effects: [], cooldown: 0, vfxKey: 'summon', sfxKey: 'thrust', icon: '🐴', desc: '4/3 · 돌진.', drawWeight: 6 },
  paladin:     { id: 'paladin',     name: '성기사',      rarity: 'epic',   cost: 4, element: 'holy',      kind: 'minion', minion: { attack: 3, health: 4 }, keywords: ['divineShield'], effects: [], cooldown: 0, vfxKey: 'summon', sfxKey: 'shield', icon: '✨', desc: '3/4 · 신성 보호막 (첫 피해 무효).', drawWeight: 6 },
  vampirelord: { id: 'vampirelord', name: '흡혈귀',      rarity: 'epic',   cost: 4, element: 'poison',    kind: 'minion', minion: { attack: 3, health: 4 }, keywords: ['lifesteal'], effects: [], cooldown: 0, vfxKey: 'summon', sfxKey: 'drain', icon: '🧛', desc: '3/4 · 흡혈 (가한 피해만큼 내 영웅 회복).', drawWeight: 6 },
  bomber:      { id: 'bomber',      name: '폭탄병',      rarity: 'epic',   cost: 4, element: 'fire',      kind: 'minion', minion: { attack: 3, health: 2 }, effects: [], deathrattle: [{ kind: 'damage', amount: 2, target: 'allEnemies' }], cooldown: 0, vfxKey: 'summon', sfxKey: 'explode', icon: '💣', desc: '3/2 · 죽음의 메아리: 모든 적 영웅에게 2 피해.', drawWeight: 6 },
  warlord:     { id: 'warlord',     name: '전쟁군주',    rarity: 'epic',   cost: 5, element: 'physical',  kind: 'minion', minion: { attack: 5, health: 5 }, effects: [{ kind: 'buff', attack: 1, health: 1, target: 'allFriendlyMinions' }], cooldown: 0, vfxKey: 'summon', sfxKey: 'summon', icon: '📣', desc: '5/5 · 전투의 함성: 내 다른 하수인에게 +1/+1.', drawWeight: 5 },
  golem:       { id: 'golem',       name: '바위 골렘',   rarity: 'epic',   cost: 5, element: 'physical',  kind: 'minion', minion: { attack: 6, health: 6 }, keywords: ['taunt'], effects: [], cooldown: 0, vfxKey: 'summon', sfxKey: 'summon', icon: '🗿', desc: '6/6 · 도발.', drawWeight: 5 },
  necromancer: { id: 'necromancer', name: '강령술사',    rarity: 'epic',   cost: 5, element: 'poison',    kind: 'minion', minion: { attack: 3, health: 4 }, effects: [], deathrattle: [{ kind: 'summon', token: 'sprite', count: 2 }], cooldown: 0, vfxKey: 'summon', sfxKey: 'summon', icon: '💀', desc: '3/4 · 죽음의 메아리: 꼬마 정령 2마리 소환.', drawWeight: 5 },
  dragon:      { id: 'dragon',      name: '화염룡',      rarity: 'legendary', cost: 7, element: 'fire',   kind: 'minion', minion: { attack: 8, health: 8 }, effects: [{ kind: 'damage', amount: 4, target: 'allEnemyMinions' }], cooldown: 0, vfxKey: 'summon', sfxKey: 'explode', icon: '🐉', desc: '8/8 · 전투의 함성: 모든 적 하수인에게 4 피해.', drawWeight: 3 },
  archangel:   { id: 'archangel',   name: '대천사',      rarity: 'legendary', cost: 7, element: 'holy',   kind: 'minion', minion: { attack: 7, health: 7 }, keywords: ['divineShield'], effects: [{ kind: 'heal', amount: 8, target: 'hero' }], cooldown: 0, vfxKey: 'summon', sfxKey: 'heal', icon: '👼', desc: '7/7 · 신성 보호막 · 전투의 함성: 내 영웅을 8 회복.', drawWeight: 3 },

  // ---- SPELLS (10) ----
  strike:      { id: 'strike',      name: '강타',        rarity: 'common', cost: 1, element: 'physical',  kind: 'spell', effects: [{ kind: 'damage', amount: 3, target: 'chosen' }], cooldown: 0, vfxKey: 'slash', sfxKey: 'slash', icon: '👊', desc: '지목한 대상(영웅/하수인)에게 3 피해.', drawWeight: 12 },
  firebolt:    { id: 'firebolt',    name: '화염 화살',   rarity: 'common', cost: 2, element: 'fire',      kind: 'spell', effects: [{ kind: 'damage', amount: 4, target: 'chosen' }], cooldown: 0, vfxKey: 'explode', sfxKey: 'explode', icon: '🔥', desc: '지목한 대상에게 4 피해.', drawWeight: 11 },
  holylight:   { id: 'holylight',   name: '성스러운 빛', rarity: 'common', cost: 1, element: 'holy',      kind: 'spell', effects: [{ kind: 'heal', amount: 6, target: 'chosen' }], cooldown: 0, vfxKey: 'heal', sfxKey: 'heal', icon: '🕯️', desc: '지목한 대상(영웅/하수인)을 6 회복.', drawWeight: 9 },
  flamestrike: { id: 'flamestrike', name: '화염 폭풍',   rarity: 'epic',   cost: 5, element: 'fire',      kind: 'spell', effects: [{ kind: 'damage', amount: 4, target: 'allEnemyMinions' }], cooldown: 0, vfxKey: 'explode', sfxKey: 'explode', icon: '🌋', desc: '모든 적 하수인에게 4 피해.', drawWeight: 5 },
  bless:       { id: 'bless',       name: '축복',        rarity: 'common', cost: 2, element: 'holy',      kind: 'spell', effects: [{ kind: 'buff', attack: 2, health: 2, target: 'chosen' }], cooldown: 0, vfxKey: 'heal', sfxKey: 'shield', icon: '🙏', desc: '내 하수인에게 +2/+2.', drawWeight: 8 },
  frostshock:  { id: 'frostshock',  name: '서리 충격',   rarity: 'rare',   cost: 3, element: 'ice',       kind: 'spell', effects: [{ kind: 'damage', amount: 3, target: 'allEnemies' }], cooldown: 0, vfxKey: 'bolt', sfxKey: 'bolt', icon: '❄️', desc: '모든 적 영웅에게 3 피해.', drawWeight: 6 },
  assassinate: { id: 'assassinate', name: '암살',        rarity: 'rare',   cost: 4, element: 'poison',    kind: 'spell', effects: [{ kind: 'destroy', target: 'chosen' }], cooldown: 0, vfxKey: 'shatter', sfxKey: 'shatter', icon: '🗡️', desc: '지목한 하수인을 즉시 파괴한다.', drawWeight: 6 },
  warhorn:     { id: 'warhorn',     name: '전투의 뿔피리',rarity: 'rare',  cost: 3, element: 'physical',  kind: 'spell', effects: [{ kind: 'buff', attack: 1, health: 1, target: 'allFriendlyMinions' }], cooldown: 0, vfxKey: 'summon', sfxKey: 'summon', icon: '📯', desc: '내 모든 하수인에게 +1/+1.', drawWeight: 6 },
  insight:     { id: 'insight',     name: '비전 지식',   rarity: 'common', cost: 2, element: 'none',      kind: 'spell', effects: [{ kind: 'draw', amount: 2 }], cooldown: 0, vfxKey: 'peek', sfxKey: 'draw', icon: '📖', desc: '카드 2장을 뽑는다.', drawWeight: 8 },
  manasurge:   { id: 'manasurge',   name: '마나 샘',     rarity: 'common', cost: 1, element: 'lightning', kind: 'spell', effects: [{ kind: 'gainMana', amount: 2 }], cooldown: 0, vfxKey: 'charge', sfxKey: 'charge', icon: '🔷', desc: '마나 +2 (비용 1 → 실질 +1).', drawWeight: 8 },
};

export const ALL_DEFS: CardDef[] = Object.values(CARD_DEFS);

/** Does playing this card require the player to pick a target first?
 *  A `chosen` damage/heal/buff or a `destroy` effect needs an entity selected. */
export function requiresTarget(def: CardDef): boolean {
  return def.effects.some(
    (e) =>
      (e.kind === 'damage' && e.target === 'chosen') ||
      (e.kind === 'heal' && e.target === 'chosen') ||
      (e.kind === 'buff' && e.target === 'chosen') ||
      e.kind === 'destroy',
  );
}
