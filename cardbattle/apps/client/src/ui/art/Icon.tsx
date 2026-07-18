/** Hand-drawn SVG UI glyphs — replaces every emoji in the interface. 24x24 viewBox,
 * `currentColor` by default so a glyph inherits the surrounding text color; pass an
 * explicit `color` to override. Stroke-based so they stay crisp at any size. */
import type { GameModeId } from '@cardbattle/shared';

export type IconName =
  | 'coin' | 'close' | 'check' | 'lock' | 'globe' | 'sparkle' | 'bolt'
  | 'swords' | 'swirl' | 'shield' | 'dice' | 'skull' | 'trophy' | 'warn'
  | 'eye' | 'chain' | 'zzz' | 'fire' | 'target' | 'card' | 'burst'
  | 'heart' | 'reverse' | 'crystal' | 'trash' | 'hand' | 'download'
  | 'petal' | 'frost' | 'star' | 'sound' | 'mute'
  | 'poison' | 'reflect' | 'regen'
  | 'arrowRight' | 'arrowSwap' | 'arrowCW' | 'arrowCCW' | 'chevronUp' | 'chevronDown';

interface Props {
  name: IconName;
  size?: number | string;
  color?: string;
  style?: React.CSSProperties;
  className?: string;
}

/** stroke helpers keep every glyph visually consistent */
const S = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

const GLYPHS: Record<IconName, () => JSX.Element> = {
  coin: () => (
    <>
      <ellipse cx="12" cy="12" rx="8" ry="8" fill="#f6c453" stroke="#b8860b" strokeWidth="1.5" />
      <ellipse cx="12" cy="12" rx="5" ry="5" fill="none" stroke="#b8860b" strokeWidth="1.2" opacity="0.6" />
      <path d="M12 8.5 L12 15.5 M10 10.2 h2.6 a1.6 1.6 0 0 1 0 3.2 H10" fill="none" stroke="#7a5a08" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  close: () => <path d="M6 6 L18 18 M18 6 L6 18" {...S} />,
  check: () => <path d="M5 13 L10 18 L19 6" {...S} />,
  lock: () => (
    <>
      <rect x="5" y="11" width="14" height="9" rx="2" {...S} />
      <path d="M8 11 V8 a4 4 0 0 1 8 0 v3" {...S} />
    </>
  ),
  globe: () => (
    <>
      <circle cx="12" cy="12" r="8.5" {...S} />
      <path d="M3.5 12 h17 M12 3.5 v17 M12 3.5 c3 3 3 14 0 17 M12 3.5 c-3 3 -3 14 0 17" {...S} strokeWidth={1.5} />
    </>
  ),
  sparkle: () => (
    <>
      <path d="M12 3 L13.6 9.4 L20 11 L13.6 12.6 L12 19 L10.4 12.6 L4 11 L10.4 9.4 Z" fill="currentColor" stroke="none" />
      <path d="M18.5 4 L19.2 6.3 L21.5 7 L19.2 7.7 L18.5 10 L17.8 7.7 L15.5 7 L17.8 6.3 Z" fill="currentColor" stroke="none" opacity="0.7" />
    </>
  ),
  bolt: () => <path d="M13 2 L5 13 h5 l-1 9 L19 10 h-6 Z" fill="currentColor" stroke="none" />,
  swords: () => (
    <>
      <path d="M4 4 L13 13 M3.5 6 L6 3.5 L15 12.5" {...S} strokeWidth={1.8} />
      <path d="M20 4 L11 13 M20.5 6 L18 3.5 L9 12.5" {...S} strokeWidth={1.8} />
      <path d="M8 16 L4 20 M16 16 L20 20" {...S} strokeWidth={1.8} />
    </>
  ),
  swirl: () => <path d="M12 12 m0 -7 a7 7 0 1 1 -6 3.5 a5 5 0 1 0 4.3 2.5 a3 3 0 1 1 -2.5 1.5" {...S} strokeWidth={1.8} />,
  shield: () => (
    <>
      <path d="M12 3 L19 6 V11 c0 5 -3.5 8 -7 10 c-3.5 -2 -7 -5 -7 -10 V6 Z" fill="currentColor" opacity="0.18" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M9 12 l2 2 l4 -4" {...S} strokeWidth={1.8} />
    </>
  ),
  dice: () => (
    <>
      <rect x="4" y="4" width="16" height="16" rx="3.5" fill="currentColor" opacity="0.15" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="9" cy="9" r="1.4" fill="currentColor" />
      <circle cx="15" cy="9" r="1.4" fill="currentColor" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" />
      <circle cx="9" cy="15" r="1.4" fill="currentColor" />
      <circle cx="15" cy="15" r="1.4" fill="currentColor" />
    </>
  ),
  skull: () => (
    <>
      <path d="M12 3 c-5 0 -8 3.3 -8 7.5 c0 2.4 1.2 4 2.5 5 V19 a1.5 1.5 0 0 0 1.5 1.5 h8 a1.5 1.5 0 0 0 1.5 -1.5 v-3.5 c1.3 -1 2.5 -2.6 2.5 -5 C20 6.3 17 3 12 3 Z" fill="currentColor" opacity="0.9" stroke="none" />
      <circle cx="8.7" cy="11" r="1.9" fill="#0b0f1a" />
      <circle cx="15.3" cy="11" r="1.9" fill="#0b0f1a" />
      <path d="M11 15 l1 -2 l1 2" fill="none" stroke="#0b0f1a" strokeWidth="1.2" strokeLinejoin="round" />
    </>
  ),
  trophy: () => (
    <>
      <path d="M7 4 h10 v4 a5 5 0 0 1 -10 0 Z" fill="#f6c453" stroke="#b8860b" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M7 5 H4 v2 a3 3 0 0 0 3 3 M17 5 h3 v2 a3 3 0 0 1 -3 3" fill="none" stroke="#b8860b" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M12 12.5 V16 M9 20 h6 M10 20 c0 -2 1 -4 2 -4 c1 0 2 2 2 4" fill="none" stroke="#b8860b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  warn: () => (
    <>
      <path d="M12 3.5 L21 19 H3 Z" fill="currentColor" opacity="0.18" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M12 9 v5" {...S} strokeWidth={1.8} />
      <circle cx="12" cy="16.6" r="1.1" fill="currentColor" stroke="none" />
    </>
  ),
  eye: () => (
    <>
      <path d="M2.5 12 C5 7 8.5 5 12 5 s7 2 9.5 7 C19 17 15.5 19 12 19 s-7 -2 -9.5 -7 Z" {...S} strokeWidth={1.8} />
      <circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" />
    </>
  ),
  chain: () => (
    <>
      <rect x="3" y="8.5" width="9" height="7" rx="3.5" {...S} strokeWidth={1.8} />
      <rect x="12" y="8.5" width="9" height="7" rx="3.5" {...S} strokeWidth={1.8} />
    </>
  ),
  zzz: () => (
    <>
      <path d="M5 8 h5 l-5 6 h5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13 5 h4 l-4 5 h4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
    </>
  ),
  fire: () => (
    <path d="M12 3 c3 4 5 5.5 5 9 a5 5 0 0 1 -10 0 c0 -2 1 -3 2 -4 c0.3 1.2 1 2 2 2 c-1 -2 -0.5 -5 1 -7 Z"
      fill="currentColor" stroke="none" />
  ),
  target: () => (
    <>
      <circle cx="12" cy="12" r="8" {...S} strokeWidth={1.8} />
      <circle cx="12" cy="12" r="4" {...S} strokeWidth={1.8} />
      <circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none" />
    </>
  ),
  card: () => (
    <>
      <rect x="6" y="3.5" width="12" height="17" rx="2" fill="currentColor" opacity="0.15" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </>
  ),
  burst: () => (
    <path d="M12 2 L14 9 L21 7 L16 12 L21 17 L14 15 L12 22 L10 15 L3 17 L8 12 L3 7 L10 9 Z"
      fill="currentColor" stroke="none" />
  ),
  heart: () => (
    <path d="M12 20 C6 15.5 3 12 3 8.5 A4.5 4.5 0 0 1 12 6 A4.5 4.5 0 0 1 21 8.5 C21 12 18 15.5 12 20 Z"
      fill="currentColor" stroke="none" />
  ),
  reverse: () => (
    <>
      <path d="M6 9 h9 a4 4 0 0 1 0 8 h-2" {...S} strokeWidth={1.8} />
      <path d="M8.5 6 L5.5 9 L8.5 12" {...S} strokeWidth={1.8} />
    </>
  ),
  crystal: () => (
    <>
      <circle cx="12" cy="10" r="6" fill="currentColor" opacity="0.2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M9.5 8 a3 3 0 0 1 3 -2" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity="0.8" />
      <path d="M6 16 h12 l-1.5 3 h-9 Z" fill="currentColor" opacity="0.3" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </>
  ),
  trash: () => (
    <>
      <path d="M5 7 h14 M9 7 V5 a1 1 0 0 1 1 -1 h4 a1 1 0 0 1 1 1 v2" {...S} strokeWidth={1.8} />
      <path d="M7 7 l1 12 a1.5 1.5 0 0 0 1.5 1.4 h5 a1.5 1.5 0 0 0 1.5 -1.4 L17 7" {...S} strokeWidth={1.8} />
    </>
  ),
  hand: () => (
    <>
      <path d="M8 11 V5.5 a1.4 1.4 0 0 1 2.8 0 V11 M10.8 11 V4.5 a1.4 1.4 0 0 1 2.8 0 V11 M13.6 11 V5.5 a1.4 1.4 0 0 1 2.8 0 V13" {...S} strokeWidth={1.6} />
      <path d="M8 11 V9 a1.4 1.4 0 0 0 -2.8 0 v5 a6 6 0 0 0 6 6 h1 a5 5 0 0 0 5 -5 v-2" {...S} strokeWidth={1.6} />
    </>
  ),
  sound: () => (
    <>
      <path d="M4 9 h3.5 L12 5 v14 l-4.5 -4 H4 Z" fill="currentColor" opacity="0.2" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M15.5 9 a4 4 0 0 1 0 6 M17.8 6.6 a7.5 7.5 0 0 1 0 10.8" {...S} strokeWidth={1.7} />
    </>
  ),
  mute: () => (
    <>
      <path d="M4 9 h3.5 L12 5 v14 l-4.5 -4 H4 Z" fill="currentColor" opacity="0.2" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M16 9.5 L21 14.5 M21 9.5 L16 14.5" {...S} strokeWidth={1.7} />
    </>
  ),
  download: () => (
    <>
      <path d="M12 3 v11 M7.5 10 L12 14.5 L16.5 10" {...S} strokeWidth={1.8} />
      <path d="M5 19 h14" {...S} strokeWidth={1.8} />
    </>
  ),
  petal: () => (
    <g fill="currentColor" stroke="none">
      {[0, 72, 144, 216, 288].map((a) => (
        <ellipse key={a} cx="12" cy="6.5" rx="2.6" ry="4.5" transform={`rotate(${a} 12 12)`} opacity="0.9" />
      ))}
      <circle cx="12" cy="12" r="2" fill="#fff" opacity="0.85" />
    </g>
  ),
  frost: () => (
    <g stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none">
      {[0, 60, 120].map((a) => (
        <g key={a} transform={`rotate(${a} 12 12)`}>
          <path d="M12 2 V22" />
          <path d="M12 6 l-2.5 -2.5 M12 6 l2.5 -2.5 M12 18 l-2.5 2.5 M12 18 l2.5 2.5" />
        </g>
      ))}
    </g>
  ),
  star: () => (
    <path d="M12 2.5 L14.7 9 L21.5 9.5 L16.3 14 L18 20.7 L12 17 L6 20.7 L7.7 14 L2.5 9.5 L9.3 9 Z"
      fill="currentColor" stroke="none" />
  ),
  arrowRight: () => <path d="M4 12 h15 M13 6 l6 6 l-6 6" {...S} strokeWidth={2.2} />,
  arrowSwap: () => (
    <>
      <path d="M4 9 h14 M15 6 l3 3 l-3 3" {...S} strokeWidth={1.8} />
      <path d="M20 15 H6 M9 12 l-3 3 l3 3" {...S} strokeWidth={1.8} />
    </>
  ),
  arrowCW: () => (
    <>
      <path d="M20 12 a8 8 0 1 1 -2.3 -5.6" {...S} strokeWidth={1.8} />
      <path d="M18 3.5 V7 h-3.5" {...S} strokeWidth={1.8} />
    </>
  ),
  arrowCCW: () => (
    <>
      <path d="M4 12 a8 8 0 1 0 2.3 -5.6" {...S} strokeWidth={1.8} />
      <path d="M6 3.5 V7 h3.5" {...S} strokeWidth={1.8} />
    </>
  ),
  chevronUp: () => <path d="M6 15 L12 9 L18 15" {...S} strokeWidth={2.2} />,
  chevronDown: () => <path d="M6 9 L12 15 L18 9" {...S} strokeWidth={2.2} />,
  // A dripping venom drop with a skull hint — damage-over-time.
  poison: () => (
    <>
      <path d="M12 3 C12 3 6 10 6 14.5 a6 6 0 0 0 12 0 C18 10 12 3 12 3 Z" {...S} strokeWidth={1.8} />
      <circle cx="10" cy="14" r="1" fill="currentColor" stroke="none" />
      <circle cx="14" cy="14" r="1" fill="currentColor" stroke="none" />
      <path d="M10.5 16.5 h3" {...S} strokeWidth={1.6} />
    </>
  ),
  // A shield with a bounce-back arrow — the reflector barrier.
  reflect: () => (
    <>
      <path d="M12 3 L19 6 V11 c0 5 -3.5 8 -7 10 c-3.5 -2 -7 -5 -7 -10 V6 Z" {...S} strokeWidth={1.8} />
      <path d="M9.5 13 l-2.5 -2.5 l2.5 -2.5 M7.2 10.5 H13 a2.5 2.5 0 0 1 0 5 h-1" {...S} strokeWidth={1.6} />
    </>
  ),
  // A rising leaf/cross — heal-over-time.
  regen: () => (
    <>
      <path d="M12 20 C12 20 5 15 5 9 C5 9 10 9 12 13 C14 9 19 9 19 9 C19 15 12 20 12 20 Z" {...S} strokeWidth={1.8} />
      <path d="M12 20 V11" {...S} strokeWidth={1.6} />
    </>
  ),
};

/** Which glyph stands in for each game mode (replaces the emoji in modes.ts data). */
export const MODE_ICON: Record<GameModeId, IconName> = {
  standard: 'swords', blitz: 'bolt', chaos: 'swirl', tank: 'shield', casino: 'dice',
};

/** Which glyph stands in for each card-play burst effect (replaces cosmetics.ts glyphs).
 * `null` for the "no effect" default. */
export const EFFECT_ICON: Record<string, IconName | null> = {
  fx_none: null, fx_sparkle: 'sparkle', fx_bolt: 'bolt', fx_petals: 'petal',
  fx_swirl: 'swirl', fx_hearts: 'heart', fx_embers: 'fire', fx_frost: 'frost',
  fx_skulls: 'skull', fx_coins: 'coin', fx_stars: 'star', fx_crystal: 'crystal',
};

/** Inline SVG glyph. Sits on the text baseline via `verticalAlign` so it reads like a letter. */
export function Icon({ name, size = 16, color, style, className }: Props) {
  const glyph = GLYPHS[name];
  if (!glyph) return null;
  const px = typeof size === 'number' ? `${size}px` : size;
  return (
    <svg
      width={px} height={px} viewBox="0 0 24 24"
      className={className}
      style={{ display: 'inline-block', verticalAlign: '-0.15em', color, flexShrink: 0, ...style }}
      aria-hidden
    >
      {glyph()}
    </svg>
  );
}
