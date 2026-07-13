import { sans } from './theme.js';

interface Props {
  /** Emblem diameter in px. Wordmark scales from it. */
  size?: number;
  /** Hide the "CARD BATTLE" wordmark and show only the crest. */
  markOnly?: boolean;
}

/**
 * The game's crest + wordmark. An abyssal badge (crossed swords guarding a rune gem,
 * ringed by a neon halo) sits above a metal-and-neon "CARD BATTLE" wordmark. Deterministic
 * SVG so it stays crisp at any size; reused on the login gate and the lobby header so the
 * brand reads the same everywhere. Purely decorative — aria-hidden, no interactivity.
 */
export function BrandMark({ size = 116, markOnly = false }: Props) {
  const word = Math.round(size * 0.44); // wordmark cap-height tracks the crest
  return (
    <div style={wrap}>
      <Crest size={size} />
      {!markOnly && (
        <div style={{ ...wordRow, fontSize: word }} aria-hidden>
          <span style={wordA}>CARD</span>
          <span style={gap} />
          <span style={wordB}>BATTLE</span>
        </div>
      )}
    </div>
  );
}

function Crest({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 128 148" width={size} height={size * (148 / 128)} aria-hidden className="cb-crest-glow" style={{ display: 'block' }}>
      <defs>
        <linearGradient id="cbRing" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#d8a23c" />
          <stop offset="0.5" stopColor="#c3e04d" />
          <stop offset="1" stopColor="#a6c53f" />
        </linearGradient>
        <radialGradient id="cbAbyss" cx="0.5" cy="0.4" r="0.75">
          <stop offset="0" stopColor="#1a2340" />
          <stop offset="0.6" stopColor="#0c1120" />
          <stop offset="1" stopColor="#060812" />
        </radialGradient>
        <radialGradient id="cbGem" cx="0.5" cy="0.4" r="0.7">
          <stop offset="0" stopColor="#eafff9" />
          <stop offset="0.4" stopColor="#7cf0dc" />
          <stop offset="1" stopColor="#2aa9b8" />
        </radialGradient>
        <linearGradient id="cbBlade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f2f6ff" />
          <stop offset="1" stopColor="#8a94b4" />
        </linearGradient>
      </defs>

      {/* halo behind the crest — slowly breathes so the badge never feels frozen */}
      <ellipse className="cb-crest-halo" cx="64" cy="62" rx="52" ry="52" fill="#5b8cff" opacity="0.14" />

      {/* badge body */}
      <path d={BADGE} fill="url(#cbAbyss)" stroke="url(#cbRing)" strokeWidth="3.2" strokeLinejoin="round" />
      {/* inner engraved ring */}
      <path d={BADGE} fill="none" stroke="#3a5da0" strokeWidth="1" strokeLinejoin="round" opacity="0.7"
        transform="translate(64 66) scale(0.82) translate(-64 -66)" />

      {/* crown spikes at the top */}
      <g fill="url(#cbRing)">
        <polygon points="64,3 67,13 61,13" />
        <polygon points="46,7 50,15 43,15" opacity="0.85" />
        <polygon points="82,7 85,15 78,15" opacity="0.85" />
      </g>

      {/* crossed swords */}
      <Sword rot={26} />
      <Sword rot={-26} />

      {/* rune gem over the cross */}
      <polygon points="64,46 73,63 64,82 55,63" fill="url(#cbGem)" stroke="#eafff9" strokeWidth="1" strokeLinejoin="round" />
      <polygon points="64,46 73,63 64,63 55,63" fill="#eafff9" opacity="0.55" />
      <circle className="cb-crest-spark" cx="64" cy="61" r="2.6" fill="#ffffff" opacity="0.95" />

      {/* bottom point highlight */}
      <circle cx="64" cy="132" r="2.4" fill="url(#cbRing)" />
    </svg>
  );
}

function Sword({ rot }: { rot: number }) {
  return (
    <g transform={`translate(64 66) rotate(${rot})`}>
      {/* blade */}
      <polygon points="0,-44 3.6,-33 3,7 -3,7 -3.6,-33" fill="url(#cbBlade)" stroke="#c8d2ea" strokeWidth="0.6" strokeLinejoin="round" />
      <polygon points="0,-44 1.2,-33 0,7 -1.2,-33" fill="#ffffff" opacity="0.5" />
      {/* crossguard */}
      <rect x="-11" y="6" width="22" height="4.4" rx="1.6" fill="#c9a24a" stroke="#8a6a24" strokeWidth="0.5" />
      {/* grip */}
      <rect x="-2" y="10" width="4" height="15" rx="1.4" fill="#3a2f22" />
      {/* pommel */}
      <circle cx="0" cy="27" r="3.1" fill="#c9a24a" stroke="#8a6a24" strokeWidth="0.5" />
    </g>
  );
}

// Heater-shield badge with a pointed foot, centered around x=64.
const BADGE =
  'M64 10 C90 10 108 22 108 46 C108 80 92 104 64 134 C36 104 20 80 20 46 C20 22 38 10 64 10 Z';

const wrap: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, userSelect: 'none',
};
const wordRow: React.CSSProperties = {
  display: 'flex', alignItems: 'baseline', fontFamily: sans, fontWeight: 900,
  letterSpacing: 4, lineHeight: 1, whiteSpace: 'nowrap',
};
const gap: React.CSSProperties = { width: '0.42em' };
// Brushed-metal caps with a cool neon underglow — reads as engraved, not a flat gradient fill.
const wordA: React.CSSProperties = {
  background: 'linear-gradient(180deg,#fbf6e6 0%,#e6dcc2 44%,#b4ab90 100%)',
  WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent',
  filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.55)) drop-shadow(0 0 10px rgba(216,162,60,0.45))',
};
const wordB: React.CSSProperties = {
  background: 'linear-gradient(180deg,#f2f5da 0%,#c3e04d 46%,#7c9a2f 100%)',
  WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent',
  filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.55)) drop-shadow(0 0 12px rgba(166,197,63,0.5))',
};
