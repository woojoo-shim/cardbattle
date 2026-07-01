/**
 * Quick-emote presets sent during battle (Clash-Royale / Brawl-Stars style).
 * NOT free-text chat — only these fixed reactions can be sent, so it can't be abused.
 * `icon` is an Icon-component glyph name (client renders it as SVG for the no-emoji design);
 * `label` is the short preset phrase shown in the speech bubble.
 */
export interface Emote {
  id: string;
  icon: string;
  label: string;
}

export const EMOTES: Emote[] = [
  { id: 'gg', icon: 'trophy', label: 'GG' },
  { id: 'nice', icon: 'sparkle', label: '멋진데?' },
  { id: 'hello', icon: 'hand', label: '안녕!' },
  { id: 'oops', icon: 'warn', label: '이런…' },
  { id: 'threat', icon: 'swords', label: '각오해' },
  { id: 'laugh', icon: 'star', label: 'ㅋㅋㅋ' },
  { id: 'think', icon: 'eye', label: '음…' },
  { id: 'sad', icon: 'frost', label: '슬퍼…' },
];

export const EMOTE_BY_ID: Record<string, Emote> =
  Object.fromEntries(EMOTES.map((e) => [e.id, e]));
