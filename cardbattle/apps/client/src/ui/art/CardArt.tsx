/** Hand-drawn SVG card illustrations — replaces emoji icons. Dark-fantasy neon style,
 * each tinted by its element. 64x64 viewBox; scale via `size`. */

interface Props {
  id: string;
  size?: number;
}

const STEEL = '#cfd6e6';
const STEEL_D = '#7b8398';
const WOOD = '#8a5a32';
const WOOD_D = '#5c3a1f';

/** soft radial glow disc behind the artwork */
function Glow({ color, o = 0.45 }: { color: string; o?: number }) {
  return <circle cx="32" cy="32" r="22" fill={color} opacity={o} style={{ filter: 'blur(8px)' }} />;
}

function Sword() {
  return (
    <>
      <Glow color="#ff5c8a" o={0.35} />
      {/* blade */}
      <path d="M32 6 L37 16 L36 40 L32 46 L28 40 L27 16 Z" fill={STEEL} stroke="#eef2ff" strokeWidth="1" />
      <path d="M32 6 L32 46 L28 40 L27 16 Z" fill={STEEL_D} opacity="0.6" />
      <path d="M32 7 L32 45" stroke="#ff90b3" strokeWidth="1" opacity="0.8" />
      {/* crossguard */}
      <rect x="19" y="44" width="26" height="5" rx="2.5" fill="#b98a3c" stroke="#e7c272" strokeWidth="1" />
      {/* grip */}
      <rect x="30" y="49" width="4" height="9" fill={WOOD} stroke={WOOD_D} strokeWidth="0.8" />
      {/* pommel */}
      <circle cx="32" cy="59" r="3.5" fill="#b98a3c" stroke="#e7c272" strokeWidth="1" />
    </>
  );
}

function Bow() {
  return (
    <>
      <Glow color="#ff5c8a" o={0.3} />
      {/* bow limb */}
      <path d="M20 8 Q44 32 20 56" fill="none" stroke={WOOD} strokeWidth="5" strokeLinecap="round" />
      <path d="M20 8 Q44 32 20 56" fill="none" stroke="#b07a44" strokeWidth="1.6" strokeLinecap="round" />
      {/* string */}
      <path d="M20 8 L20 56" stroke="#dfe5f2" strokeWidth="1.2" opacity="0.85" />
      {/* arrow */}
      <line x1="14" y1="32" x2="52" y2="32" stroke="#c9d0e0" strokeWidth="2" />
      <path d="M52 32 L45 28 L45 36 Z" fill="#ff7aa0" stroke="#ffd0db" strokeWidth="0.8" />
      <path d="M16 28 L12 32 L16 36" fill="none" stroke="#9aa3bb" strokeWidth="2" strokeLinecap="round" />
    </>
  );
}

function Spear() {
  return (
    <>
      <Glow color="#b388ff" o={0.32} />
      {/* shaft */}
      <rect x="30" y="22" width="4" height="38" rx="2" fill={WOOD} stroke={WOOD_D} strokeWidth="0.8" />
      {/* head */}
      <path d="M32 4 L39 20 L32 26 L25 20 Z" fill={STEEL} stroke="#eef2ff" strokeWidth="1" />
      <path d="M32 4 L32 26 L25 20 Z" fill={STEEL_D} opacity="0.6" />
      <path d="M32 6 L32 24" stroke="#c9aaff" strokeWidth="1" opacity="0.85" />
      {/* side prongs */}
      <path d="M25 20 L20 16 L23 22" fill="#cfd6e6" stroke="#eef2ff" strokeWidth="0.8" />
      <path d="M39 20 L44 16 L41 22" fill="#cfd6e6" stroke="#eef2ff" strokeWidth="0.8" />
      {/* binding */}
      <rect x="29" y="24" width="6" height="3" fill="#e7c272" />
    </>
  );
}

function Bomb() {
  return (
    <>
      <Glow color="#ff7a3c" o={0.5} />
      {/* body */}
      <circle cx="30" cy="40" r="18" fill="#1a1d28" stroke="#3a3f52" strokeWidth="1.5" />
      <circle cx="24" cy="34" r="6" fill="#3a4256" opacity="0.7" />
      {/* neck */}
      <rect x="26" y="18" width="8" height="8" rx="1.5" fill="#2a2f3e" stroke="#454c63" strokeWidth="1" />
      {/* fuse */}
      <path d="M30 18 Q38 10 44 14" fill="none" stroke="#a07b4a" strokeWidth="2.5" strokeLinecap="round" />
      {/* spark */}
      <circle cx="45" cy="13" r="5" fill="#ffd84a" opacity="0.9" style={{ filter: 'blur(2px)' }} />
      <path d="M45 7 L46 12 L51 13 L46 14 L45 19 L44 14 L39 13 L44 12 Z" fill="#fff1a8" />
    </>
  );
}

function Potion() {
  return (
    <>
      <Glow color="#38e8c8" o={0.45} />
      {/* liquid */}
      <path d="M24 28 L24 24 L40 24 L40 28 L46 50 Q46 58 32 58 Q18 58 18 50 Z" fill="#0e2a28" stroke="#2e6f66" strokeWidth="1.5" />
      <path d="M21 44 Q32 40 43 44 L46 50 Q46 58 32 58 Q18 58 18 50 Z" fill="#38e8c8" opacity="0.85" />
      <path d="M21 44 Q32 41 43 44" stroke="#bff6ec" strokeWidth="1" opacity="0.7" fill="none" />
      {/* bubbles */}
      <circle cx="29" cy="50" r="2" fill="#d6fff7" opacity="0.8" />
      <circle cx="36" cy="52" r="1.4" fill="#d6fff7" opacity="0.7" />
      {/* neck + cork */}
      <rect x="26" y="16" width="12" height="9" rx="2" fill="#15312f" stroke="#2e6f66" strokeWidth="1.3" />
      <rect x="27" y="11" width="10" height="6" rx="2" fill="#9a6a3a" stroke="#c08f54" strokeWidth="1" />
    </>
  );
}

function GreatHeal() {
  return (
    <>
      <Glow color="#f4c44a" o={0.55} />
      {/* radiant rays */}
      {Array.from({ length: 8 }).map((_, i) => (
        <line
          key={i}
          x1="32"
          y1="32"
          x2={32 + 26 * Math.cos((i * Math.PI) / 4)}
          y2={32 + 26 * Math.sin((i * Math.PI) / 4)}
          stroke="#ffe9a8"
          strokeWidth="2"
          opacity="0.55"
          strokeLinecap="round"
        />
      ))}
      {/* cross / plus glyph */}
      <path d="M28 14 L36 14 L36 28 L50 28 L50 36 L36 36 L36 50 L28 50 L28 36 L14 36 L14 28 L28 28 Z"
        fill="#ffd86a" stroke="#fff3c8" strokeWidth="1.4" />
      <path d="M28 14 L36 14 L36 28 L50 28 L50 36 L36 36 L36 50 L28 50 Z" fill="#e7a93c" opacity="0.45" />
    </>
  );
}

function Reverse() {
  return (
    <>
      <Glow color="#8b6cff" o={0.42} />
      {/* two curved arrows forming a rotation ring */}
      <path d="M16 32 A16 16 0 0 1 44 21" fill="none" stroke="#c9a0ff" strokeWidth="4" strokeLinecap="round" />
      <path d="M48 32 A16 16 0 0 1 20 43" fill="none" stroke="#c9a0ff" strokeWidth="4" strokeLinecap="round" />
      {/* arrowheads */}
      <path d="M44 21 L38 18 L45 14 Z" fill="#e2d0ff" stroke="#fff" strokeWidth="0.6" />
      <path d="M20 43 L26 46 L19 50 Z" fill="#e2d0ff" stroke="#fff" strokeWidth="0.6" />
      {/* core spark */}
      <circle cx="32" cy="32" r="4" fill="#efe6ff" opacity="0.9" style={{ filter: 'blur(1px)' }} />
    </>
  );
}

function Shield() {
  return (
    <>
      <Glow color="#7fb6ff" o={0.42} />
      {/* shield body */}
      <path d="M32 8 L52 16 L52 34 Q52 50 32 58 Q12 50 12 34 L12 16 Z"
        fill="#16243a" stroke="#7fb6ff" strokeWidth="2" />
      <path d="M32 8 L52 16 L52 34 Q52 50 32 58 Z" fill="#0e1726" opacity="0.5" />
      {/* center boss */}
      <circle cx="32" cy="30" r="8" fill="#2a4870" stroke="#cfe2ff" strokeWidth="1.4" />
      {/* sheen */}
      <path d="M22 16 L32 12 L32 50 Q22 44 22 34 Z" fill="#9ec6ff" opacity="0.18" />
    </>
  );
}

function Drain() {
  return (
    <>
      <Glow color="#9be85a" o={0.4} />
      {/* dripping blade */}
      <path d="M32 6 L36 16 L35 38 L32 44 L29 38 L28 16 Z" fill={STEEL} stroke="#eef2ff" strokeWidth="1" />
      <path d="M32 6 L32 44 L29 38 L28 16 Z" fill={STEEL_D} opacity="0.6" />
      <path d="M32 7 L32 43" stroke="#b6f08a" strokeWidth="1" opacity="0.8" />
      {/* guard + grip */}
      <rect x="22" y="42" width="20" height="4" rx="2" fill="#6a8a3c" stroke="#bfe772" strokeWidth="1" />
      <rect x="30" y="46" width="4" height="9" fill={WOOD} stroke={WOOD_D} strokeWidth="0.8" />
      {/* blood drops */}
      <path d="M30 50 Q28 55 30 57 Q32 55 30 50 Z" fill="#c0264a" />
      <circle cx="37" cy="52" r="2.2" fill="#c0264a" />
    </>
  );
}

function Bolt() {
  return (
    <>
      <Glow color="#ffd84a" o={0.5} />
      {/* lightning bolt */}
      <path d="M36 6 L20 34 L30 34 L26 58 L46 26 L34 26 Z"
        fill="#ffe46a" stroke="#fff6c4" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M36 6 L20 34 L30 34 Z" fill="#fff2a0" opacity="0.6" />
      {/* sparks */}
      <circle cx="44" cy="14" r="2" fill="#fff1a8" opacity="0.85" />
      <circle cx="18" cy="48" r="1.6" fill="#fff1a8" opacity="0.75" />
    </>
  );
}

const ART: Record<string, () => JSX.Element> = {
  sword: Sword,
  bow: Bow,
  spear: Spear,
  bomb: Bomb,
  potion: Potion,
  greatheal: GreatHeal,
  reverse: Reverse,
  shield: Shield,
  drain: Drain,
  bolt: Bolt,
};

export function CardArt({ id, size = 44 }: Props) {
  const Art = ART[id];
  if (!Art) return null;
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden style={{ display: 'block' }}>
      <Art />
    </svg>
  );
}
