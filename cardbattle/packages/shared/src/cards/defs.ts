import type { CardDef, Tribe } from '../types.js';

/** Korean labels for the four creature tribes (종족). */
export const TRIBE_LABEL: Record<Tribe, string> = {
  beast: '야수',
  human: '인간',
  undead: '망자',
  elemental: '정령',
};

// Hearthstone-style board deck: 19 minions summoned to the field + 8 spells cast for instant effect.
// A minion card's `effects` are its 강림 (battlecry — fired on summon); `deathrattle` (유언) fires on death.
// A spell card's `effects` fire the moment it's played.
export const CARD_DEFS: Record<string, CardDef> = {
  // ---- MINIONS (19) ----
  sprite:      { id: 'sprite',      name: '정령',   rarity: 'common', cost: 1, element: 'none',      kind: 'minion', tribe: 'elemental', minion: { attack: 1, health: 2 }, effects: [{ kind: 'gainMana', amount: 1 }], cooldown: 0, vfxKey: 'summon', sfxKey: 'charge', icon: '🧚', desc: '공격력 1 · 체력 2 | 소환하면 마나 +1.', flavor: '"작다고 무시하지 마세요. 저도 마나 먹고 자란 몸이거든요."', drawWeight: 14 },
  recruit:     { id: 'recruit',     name: '신병',        rarity: 'common', cost: 1, element: 'physical',  kind: 'minion', tribe: 'human', minion: { attack: 2, health: 1 }, keywords: ['charge'], effects: [], cooldown: 0, vfxKey: 'summon', sfxKey: 'thrust', icon: '🪖', desc: '공격력 2 · 체력 1 | 쇄도: 소환한 턴에 바로 공격 가능.', flavor: '입대 첫날 배운 것: 방패는 두고 왔다.', drawWeight: 14 },
  guard:       { id: 'guard',       name: '수비병',      rarity: 'common', cost: 2, element: 'physical',  kind: 'minion', tribe: 'human', minion: { attack: 2, health: 3 }, keywords: ['taunt'], effects: [], cooldown: 0, vfxKey: 'summon', sfxKey: 'shield', icon: '🛡️', desc: '공격력 2 · 체력 3 | 수호: 적은 이 하수인부터 공격해야 함.', flavor: '"거기 서. 나부터 지나가야 할 텐데."', drawWeight: 12 },
  wolf:        { id: 'wolf',        name: '늑대',        rarity: 'common', cost: 2, element: 'physical',  kind: 'minion', tribe: 'beast', minion: { attack: 3, health: 2 }, keywords: ['charge'], effects: [], cooldown: 0, vfxKey: 'summon', sfxKey: 'slash', icon: '🐺', desc: '공격력 3 · 체력 2 | 쇄도: 소환한 턴에 바로 공격 가능.', flavor: '기다림이라는 단어를 배운 적이 없다.', drawWeight: 10 },
  archer:      { id: 'archer',      name: '궁수',        rarity: 'rare',   cost: 3, element: 'physical',  kind: 'minion', tribe: 'human', minion: { attack: 3, health: 2 }, effects: [{ kind: 'damage', amount: 2, target: 'chosen' }], cooldown: 0, vfxKey: 'summon', sfxKey: 'arrow', icon: '🏹', desc: '공격력 3 · 체력 2 | 소환하면 지목한 적에게 2 피해.', flavor: '"인사는 화살로 대신하겠소."', drawWeight: 8 },
  knight:      { id: 'knight',      name: '기사',        rarity: 'common', cost: 3, element: 'physical',  kind: 'minion', tribe: 'human', minion: { attack: 4, health: 3 }, effects: [{ kind: 'shield', amount: 2 }], cooldown: 0, vfxKey: 'summon', sfxKey: 'shield', icon: '🤺', desc: '공격력 4 · 체력 3 | 소환하면 내 영웅 방어도 +2.', flavor: '명예, 충성, 그리고 아주 잘 갈린 검 한 자루.', drawWeight: 10 },
  cleric:      { id: 'cleric',      name: '사제',        rarity: 'rare',   cost: 3, element: 'holy',      kind: 'minion', tribe: 'human', minion: { attack: 2, health: 3 }, effects: [{ kind: 'heal', amount: 4, target: 'hero' }], cooldown: 0, vfxKey: 'summon', sfxKey: 'heal', icon: '⛪', desc: '공격력 2 · 체력 3 | 소환하면 내 영웅 체력 4 회복.', flavor: '"아프죠? 가만히 계세요. 금방 끝나요."', drawWeight: 7 },
  berserker:   { id: 'berserker',   name: '광전사',      rarity: 'rare',   cost: 3, element: 'fire',      kind: 'minion', tribe: 'human', minion: { attack: 5, health: 2 }, keywords: ['charge'], effects: [], cooldown: 0, vfxKey: 'summon', sfxKey: 'slash', icon: '😤', desc: '공격력 5 · 체력 2 | 쇄도: 소환한 턴에 바로 공격 가능.', flavor: '방어는 겁쟁이나 하는 거라고 굳게 믿는다.', drawWeight: 7 },
  venomspider: { id: 'venomspider', name: '거미',    rarity: 'rare',   cost: 3, element: 'poison',    kind: 'minion', tribe: 'beast', minion: { attack: 2, health: 3 }, keywords: ['poisonous'], effects: [], cooldown: 0, vfxKey: 'summon', sfxKey: 'poison', icon: '🕷️', desc: '공격력 2 · 체력 3 | 부식: 피해를 준 하수인을 즉시 죽임.', flavor: '한 방울이면 충분하다. 크기는 중요하지 않다.', drawWeight: 7 },
  cavalier:    { id: 'cavalier',    name: '창기병',      rarity: 'rare',   cost: 4, element: 'physical',  kind: 'minion', tribe: 'human', minion: { attack: 4, health: 3 }, keywords: ['charge'], effects: [], cooldown: 0, vfxKey: 'summon', sfxKey: 'thrust', icon: '🐴', desc: '공격력 4 · 체력 3 | 쇄도: 소환한 턴에 바로 공격 가능.', flavor: '"멈추라고? 이 속도에서 그게 되겠나."', drawWeight: 6 },
  paladin:     { id: 'paladin',     name: '성기사',      rarity: 'epic',   cost: 4, element: 'holy',      kind: 'minion', tribe: 'human', minion: { attack: 3, health: 4 }, keywords: ['divineShield'], effects: [], cooldown: 0, vfxKey: 'summon', sfxKey: 'shield', icon: '✨', desc: '공격력 3 · 체력 4 | 가호: 처음 받는 피해 1회를 무효로 막음.', flavor: '빛이 그를 감싸는 한, 첫 일격은 소용없다.', drawWeight: 6 },
  vampirelord: { id: 'vampirelord', name: '흡혈귀',      rarity: 'epic',   cost: 4, element: 'poison',    kind: 'minion', tribe: 'undead', minion: { attack: 3, health: 4 }, keywords: ['lifesteal'], effects: [], cooldown: 0, vfxKey: 'summon', sfxKey: 'drain', icon: '🧛', desc: '공격력 3 · 체력 4 | 착취: 이 하수인이 준 피해만큼 내 영웅 체력 회복.', flavor: '"당신의 피는 참 좋은 빈티지군요."', drawWeight: 6 },
  bomber:      { id: 'bomber',      name: '폭탄병',      rarity: 'epic',   cost: 4, element: 'fire',      kind: 'minion', tribe: 'human', minion: { attack: 3, health: 2 }, effects: [], deathrattle: [{ kind: 'damage', amount: 2, target: 'allEnemies' }], cooldown: 0, vfxKey: 'summon', sfxKey: 'explode', icon: '💣', desc: '공격력 3 · 체력 2 | 죽으면 모든 적 영웅에게 2 피해.', flavor: '"내가 쓰러지면? 다 같이 가는 거지 뭐."', drawWeight: 6 },
  warlord:     { id: 'warlord',     name: '전쟁군주',    rarity: 'epic',   cost: 5, element: 'physical',  kind: 'minion', tribe: 'human', minion: { attack: 5, health: 5 }, effects: [{ kind: 'buff', attack: 1, health: 1, target: 'allFriendlyMinions' }], cooldown: 0, vfxKey: 'summon', sfxKey: 'summon', icon: '📣', desc: '공격력 5 · 체력 5 | 소환하면 내 다른 하수인 전체의 공격력·체력 +1.', flavor: '"고개 들어라! 오늘 우리는 이긴다!"', drawWeight: 5 },
  golem:       { id: 'golem',       name: '골렘',   rarity: 'epic',   cost: 5, element: 'physical',  kind: 'minion', tribe: 'elemental', minion: { attack: 6, health: 6 }, keywords: ['taunt'], effects: [], cooldown: 0, vfxKey: 'summon', sfxKey: 'summon', icon: '🗿', desc: '공격력 6 · 체력 6 | 수호: 적은 이 하수인부터 공격해야 함.', flavor: '천 년을 서 있었다. 오늘 하루쯤 더 서 있는 건 일도 아니다.', drawWeight: 5 },
  necromancer: { id: 'necromancer', name: '강령술사',    rarity: 'epic',   cost: 5, element: 'poison',    kind: 'minion', tribe: 'undead', minion: { attack: 3, health: 4 }, effects: [], deathrattle: [{ kind: 'summon', token: 'sprite', count: 2 }], cooldown: 0, vfxKey: 'summon', sfxKey: 'summon', icon: '💀', desc: '공격력 3 · 체력 4 | 죽으면 정령(1/2) 2마리를 내 편으로 소환.', flavor: '"죽음은 끝이 아니라… 인력 채용의 시작이지."', drawWeight: 5 },
  dragon:      { id: 'dragon',      name: '화염룡',      rarity: 'legendary', cost: 7, element: 'fire',   kind: 'minion', tribe: 'beast', minion: { attack: 8, health: 8 }, effects: [{ kind: 'damage', amount: 4, target: 'allEnemyMinions' }], cooldown: 0, vfxKey: 'summon', sfxKey: 'explode', icon: '🐉', desc: '공격력 8 · 체력 8 | 소환하면 모든 적 하수인에게 4 피해.', flavor: '날개를 펴는 순간, 전장의 온도가 바뀐다.', drawWeight: 3 },
  archangel:   { id: 'archangel',   name: '대천사',      rarity: 'legendary', cost: 7, element: 'holy',   kind: 'minion', tribe: 'elemental', minion: { attack: 7, health: 7 }, keywords: ['divineShield'], effects: [{ kind: 'heal', amount: 8, target: 'hero' }], cooldown: 0, vfxKey: 'summon', sfxKey: 'heal', icon: '👼', desc: '공격력 7 · 체력 7 | 가호: 처음 받는 피해 1회 무효 | 소환하면 내 영웅 체력 8 회복.', flavor: '"심판의 나팔은 아직 울리지 않았다. 하지만 준비는 됐다."', drawWeight: 3 },

  // ---- SPELLS (8) ----
  strike:      { id: 'strike',      name: '강타',        rarity: 'common', cost: 1, element: 'physical',  kind: 'spell', effects: [{ kind: 'damage', amount: 3, target: 'chosen' }], cooldown: 0, vfxKey: 'slash', sfxKey: 'slash', icon: '👊', desc: '지목한 적 영웅 또는 하수인에게 3 피해.', flavor: '복잡한 마법은 됐고. 그냥 한 대 치자.', drawWeight: 12 },
  firebolt:    { id: 'firebolt',    name: '화살',   rarity: 'common', cost: 2, element: 'fire',      kind: 'spell', effects: [{ kind: 'damage', amount: 4, target: 'chosen' }], cooldown: 0, vfxKey: 'explode', sfxKey: 'explode', icon: '🔥', desc: '지목한 적 영웅 또는 하수인에게 4 피해.', flavor: '견습 마법사가 가장 먼저, 그리고 가장 즐겁게 배우는 주문.', drawWeight: 11 },
  holylight:   { id: 'holylight',   name: '빛', rarity: 'common', cost: 1, element: 'holy',      kind: 'spell', effects: [{ kind: 'heal', amount: 5, target: 'chosen' }], cooldown: 0, vfxKey: 'heal', sfxKey: 'heal', icon: '🕯️', desc: '지목한 내 영웅 또는 하수인의 체력 5 회복.', flavor: '어둠이 아무리 깊어도, 촛불 하나면 길이 보인다.', drawWeight: 9 },
  bless:       { id: 'bless',       name: '축복',        rarity: 'common', cost: 2, element: 'holy',      kind: 'spell', effects: [{ kind: 'buff', attack: 2, health: 2, target: 'chosen' }], cooldown: 0, vfxKey: 'heal', sfxKey: 'shield', icon: '🙏', desc: '지목한 내 하수인의 공격력·체력 +2.', flavor: '하늘의 가호가 함께한다. 그리고 근육도 조금 함께한다.', drawWeight: 8 },
  frostshock:  { id: 'frostshock',  name: '서리',   rarity: 'rare',   cost: 3, element: 'ice',       kind: 'spell', effects: [{ kind: 'damage', amount: 3, target: 'allEnemies' }], cooldown: 0, vfxKey: 'bolt', sfxKey: 'bolt', icon: '❄️', desc: '적 영웅 전체에게 3 피해.', flavor: '"다들 좀 식힐 필요가 있어 보여서."', drawWeight: 6 },
  assassin:    { id: 'assassin',    name: '암살자',      rarity: 'epic',   cost: 4, element: 'poison',    kind: 'minion', tribe: 'human', minion: { attack: 4, health: 2 }, effects: [{ kind: 'destroy', target: 'chosen' }], cooldown: 0, vfxKey: 'shatter', sfxKey: 'shatter', icon: '🗡️', desc: '공격력 4 · 체력 2 | 강림: 지목한 적 하수인을 체력에 상관없이 즉시 파괴.', flavor: '소리도, 흔적도, 자비도 없다.', drawWeight: 6 },
  warhorn:     { id: 'warhorn',     name: '나팔',rarity: 'rare',  cost: 3, element: 'physical',  kind: 'spell', effects: [{ kind: 'buff', attack: 1, health: 1, target: 'allFriendlyMinions' }], cooldown: 0, vfxKey: 'summon', sfxKey: 'summon', icon: '📯', desc: '내 하수인 전체의 공격력·체력 +1.', flavor: '그 소리를 들으면 심장이 먼저 앞으로 나선다.', drawWeight: 6 },
  insight:     { id: 'insight',     name: '지혜',   rarity: 'common', cost: 2, element: 'none',      kind: 'spell', effects: [{ kind: 'draw', amount: 2 }], cooldown: 0, vfxKey: 'peek', sfxKey: 'draw', icon: '📖', desc: '내 덱에서 카드 2장을 뽑는다.', flavor: '"답은 언제나 책 속에 있지. 두 페이지쯤 뒤에."', drawWeight: 8 },
  manasurge:   { id: 'manasurge',   name: '마나',     rarity: 'common', cost: 1, element: 'lightning', kind: 'spell', effects: [{ kind: 'gainMana', amount: 2 }], cooldown: 0, vfxKey: 'charge', sfxKey: 'charge', icon: '🔷', desc: '마나 +2 (이 카드 비용 1 → 실제로 마나 1 이득).', flavor: '한 모금 마시면, 오늘은 뭐든 할 수 있을 것 같다.', drawWeight: 8 },

  // ---- BUILDINGS (5) ----
  // 건물: 내면 건설이 시작되고(建), buildTurns 턴이 지나면 완공되어 매 턴 시작마다 능력을 발동한다.
  goldmine:    { id: 'goldmine',    name: '금광',        rarity: 'common', cost: 2, element: 'none',      kind: 'building', building: { buildTurns: 2 }, effects: [{ kind: 'gainMana', amount: 1 }], cooldown: 0, vfxKey: 'charge', sfxKey: 'charge', icon: '⛏️', desc: '건설 2턴 | 완공 후 매 턴 시작마다 마나 +1.', flavor: '"곡괭이질 소리가 곧 돈 세는 소리다."', drawWeight: 9 },
  rampart:     { id: 'rampart',     name: '성벽',        rarity: 'common', cost: 2, element: 'physical',  kind: 'building', building: { buildTurns: 2 }, effects: [{ kind: 'shield', amount: 3 }], cooldown: 0, vfxKey: 'shield', sfxKey: 'shield', icon: '🧱', desc: '건설 2턴 | 완공 후 매 턴 시작마다 내 영웅 방어도 +3.', flavor: '"돌 하나하나가 누군가의 목숨값이다."', drawWeight: 8 },
  library:     { id: 'library',     name: '마도서관',    rarity: 'rare',   cost: 3, element: 'none',      kind: 'building', building: { buildTurns: 3 }, effects: [{ kind: 'draw', amount: 1 }], cooldown: 0, vfxKey: 'peek', sfxKey: 'draw', icon: '📚', desc: '건설 3턴 | 완공 후 매 턴 시작마다 카드 1장을 뽑음.', flavor: '"지식은 쌓일수록 무거워지고, 무거울수록 강해진다."', drawWeight: 6 },
  flametower:  { id: 'flametower',  name: '화염탑',      rarity: 'rare',   cost: 3, element: 'fire',      kind: 'building', building: { buildTurns: 3 }, effects: [{ kind: 'damage', amount: 3, target: 'randomEnemy' }], cooldown: 0, vfxKey: 'explode', sfxKey: 'explode', icon: '🗼', desc: '건설 3턴 | 완공 후 매 턴 시작마다 무작위 적에게 3 피해.', flavor: '"탑 꼭대기의 불꽃은 결코 잠들지 않는다."', drawWeight: 6 },
  fountain:    { id: 'fountain',    name: '치유의 샘',   rarity: 'epic',   cost: 3, element: 'holy',      kind: 'building', building: { buildTurns: 2 }, effects: [{ kind: 'heal', amount: 3, target: 'hero' }], cooldown: 0, vfxKey: 'heal', sfxKey: 'heal', icon: '⛲', desc: '건설 2턴 | 완공 후 매 턴 시작마다 내 영웅 체력 3 회복.', flavor: '"마르지 않는 샘물 한 모금이면, 상처도 잊힌다."', drawWeight: 5 },
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
