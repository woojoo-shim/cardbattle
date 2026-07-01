import {
  START_HP, START_DEFENSE, START_HAND, DRAW_PER_TURN, HAND_TARGET, HAND_CAP, TURN_SECONDS,
  START_MANA, MANA_MAX, MANA_REGEN_BASE, MANA_REGEN_STEP, MANA_REGEN_CAP,
} from './constants.js';

export type GameModeId = 'standard' | 'blitz' | 'chaos' | 'tank' | 'casino';

/** Every tunable that a game mode can override. The pure engine reads these off
 *  GameState.rules instead of the module constants, so a new mode is data-only. */
export interface RuleSet {
  startHp: number;
  startDefense: number;
  startHand: number;
  drawPerTurn: number;
  handTarget: number;
  handCap: number;
  turnSeconds: number;
  startMana: number;
  manaMax: number;
  manaRegenBase: number;
  manaRegenStep: number;
  manaRegenCap: number;
  /** '도박장' mode: every attack is forced into a double-or-nothing coin flip. */
  forceGamble: boolean;
}

export interface GameMode {
  id: GameModeId;
  name: string;
  icon: string;
  tagline: string;   // one short line shown on the mode picker card
  desc: string;      // fuller explanation of the twist
  rules: RuleSet;
}

/** The baseline ruleset: mirrors the module constants (what S1 shipped with). */
export const DEFAULT_RULES: RuleSet = {
  startHp: START_HP,
  startDefense: START_DEFENSE,
  startHand: START_HAND,
  drawPerTurn: DRAW_PER_TURN,
  handTarget: HAND_TARGET,
  handCap: HAND_CAP,
  turnSeconds: TURN_SECONDS,
  startMana: START_MANA,
  manaMax: MANA_MAX,
  manaRegenBase: MANA_REGEN_BASE,
  manaRegenStep: MANA_REGEN_STEP,
  manaRegenCap: MANA_REGEN_CAP,
  forceGamble: false,
};

export const GAME_MODES: Record<GameModeId, GameMode> = {
  standard: {
    id: 'standard', name: '정통전', icon: '⚔️',
    tagline: '균형 잡힌 기본 규칙',
    desc: '체력 40, 마나 5로 시작하는 표준 규칙. 카드배틀의 정석.',
    rules: { ...DEFAULT_RULES },
  },
  blitz: {
    id: 'blitz', name: '속공전', icon: '⚡',
    tagline: '낮은 체력 · 빠른 턴 · 순식간에 끝난다',
    desc: '체력 24, 손패 5장, 턴 18초. 마나가 넉넉해 초반부터 화력전. 짧고 굵게.',
    rules: {
      ...DEFAULT_RULES,
      startHp: 24, startHand: 5, handTarget: 5, turnSeconds: 18,
      startMana: 6, manaMax: 14, manaRegenBase: 3, manaRegenCap: 7,
    },
  },
  chaos: {
    id: 'chaos', name: '혼돈전', icon: '🌀',
    tagline: '거대한 손패 · 넘치는 마나 · 광역 난타',
    desc: '손패 6장, 매 턴 2장 드로우, 마나 8/최대 18. 콤보와 대량 마법이 난무하는 아수라장.',
    rules: {
      ...DEFAULT_RULES,
      startHand: 6, handTarget: 6, handCap: 10, drawPerTurn: 2,
      startMana: 8, manaMax: 18, manaRegenBase: 4, manaRegenStep: 1, manaRegenCap: 8,
    },
  },
  tank: {
    id: 'tank', name: '철벽전', icon: '🛡️',
    tagline: '높은 체력 · 느린 마나 · 장기 소모전',
    desc: '체력 90으로 시작하는 진흙탕 소모전. 마나가 천천히 차올라 한 방보다 운영이 중요하다.',
    rules: {
      ...DEFAULT_RULES,
      startHp: 90, turnSeconds: 35, startMana: 4, manaRegenBase: 2, manaRegenCap: 5,
    },
  },
  casino: {
    id: 'casino', name: '도박장', icon: '🎲',
    tagline: '모든 공격이 두 배 아니면 꽝',
    desc: '모든 공격이 강제로 도박이 된다. 50% 확률로 피해 2배, 50% 확률로 완전 빗나감. 운명에 맡겨라.',
    rules: {
      ...DEFAULT_RULES,
      startHp: 44, startMana: 6, forceGamble: true,
    },
  },
};

export const DEFAULT_MODE: GameModeId = 'standard';
export const MODE_LIST: GameMode[] = Object.values(GAME_MODES);

/** Coerce a client-supplied mode id to a known mode (falls back to standard). */
export function resolveMode(id: unknown): GameMode {
  return (typeof id === 'string' && GAME_MODES[id as GameModeId]) || GAME_MODES[DEFAULT_MODE];
}

/** Mana regenerated at the start of a turn under a given ruleset, ramping with the round. */
export function manaRegenFor(rules: RuleSet, round: number): number {
  return Math.min(rules.manaRegenCap, rules.manaRegenBase + Math.max(0, round - 1) * rules.manaRegenStep);
}
