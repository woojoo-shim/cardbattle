/** Hand-drawn SVG card illustrations — replaces emoji icons. Godfield-bold subjects read
 * inside a Yu-Gi-Oh-style illustrated scene window: each card's element paints an
 * atmospheric backdrop (sky + backlit horizon + ground plane) behind the item, and the
 * subject is stamped with a chunky ink outline so it pops off the diorama.
 * 64x64 viewBox; scale via `size`. */

interface Props {
  id: string;
  size?: number | string; // number → px; string → any CSS length (e.g. a clamp() for responsive cards)
}

const STEEL = '#cfd6e6';
const STEEL_D = '#7b8398';
const WOOD = '#8a5a32';
const WOOD_D = '#5c3a1f';

/** The per-art blurred glow disc was the cheap "AI bloom" look (same tell we stripped from the
 *  portraits). The scene window's backlit horizon now separates the subject, so this is a no-op —
 *  kept as a component so the 37 art fns don't each need editing. */
function Glow(_p: { color: string; o?: number }) {
  return null;
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
      {/* spark — crisp ember disc + hard four-point flare */}
      <circle cx="45" cy="13" r="3.4" fill="#ffce5a" stroke="#7a3a12" strokeWidth="0.7" />
      <path d="M45 7 L46 12 L51 13 L46 14 L45 19 L44 14 L39 13 L44 12 Z" fill="#fff1a8" />
    </>
  );
}

function Potion() {
  return (
    <>
      <Glow color="#79b0a2" o={0.45} />
      {/* liquid */}
      <path d="M24 28 L24 24 L40 24 L40 28 L46 50 Q46 58 32 58 Q18 58 18 50 Z" fill="#0e2a28" stroke="#2e6f66" strokeWidth="1.5" />
      <path d="M21 44 Q32 40 43 44 L46 50 Q46 58 32 58 Q18 58 18 50 Z" fill="#79b0a2" opacity="0.85" />
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
      {/* core hub — crisp inked pip */}
      <circle cx="32" cy="32" r="3.4" fill="#efe6ff" stroke="#3a2c5e" strokeWidth="0.8" />
      <circle cx="30.9" cy="30.9" r="1" fill="#fff" />
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

function Peek() {
  return (
    <>
      <Glow color="#8be3ff" o={0.42} />
      {/* crystal-ball eye that scries a hidden card */}
      <circle cx="32" cy="34" r="18" fill="#0d1c2c" stroke="#8be3ff" strokeWidth="2" />
      <circle cx="32" cy="34" r="18" fill="url(#peek-orb)" opacity="0.5" />
      <defs>
        <radialGradient id="peek-orb" cx="0.38" cy="0.34" r="0.7">
          <stop offset="0" stopColor="#d6f4ff" stopOpacity="0.9" />
          <stop offset="1" stopColor="#1a3a55" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* eye */}
      <path d="M20 34 Q32 24 44 34 Q32 44 20 34 Z" fill="#06121c" stroke="#bfeaff" strokeWidth="1.2" />
      <circle cx="32" cy="34" r="5" fill="#3fb6ff" />
      <circle cx="32" cy="34" r="2.2" fill="#04121e" />
      <circle cx="30" cy="32" r="1.2" fill="#eaffff" />
      {/* stand */}
      <path d="M22 52 L42 52 L38 56 L26 56 Z" fill="#1c3550" stroke="#5a86ab" strokeWidth="1" />
    </>
  );
}

function Shatter() {
  return (
    <>
      <Glow color="#9be85a" o={0.4} />
      {/* a card breaking apart */}
      <g transform="rotate(-8 32 32)">
        <path d="M18 14 L34 14 L31 50 L15 50 Z" fill="#16202c" stroke="#5a7a3c" strokeWidth="1.5" />
        <path d="M18 14 L34 14 L31 50 L15 50 Z" fill="#0e1620" opacity="0.4" />
      </g>
      <g transform="rotate(14 38 34)">
        <path d="M34 18 L50 16 L49 50 L33 52 Z" fill="#1a2530" stroke="#5a7a3c" strokeWidth="1.5" />
      </g>
      {/* crack */}
      <path d="M33 12 L29 26 L37 30 L31 44 L35 54" fill="none" stroke="#bdf08a" strokeWidth="2" strokeLinejoin="round" />
      {/* shards */}
      <path d="M22 8 L26 12 L21 14 Z" fill="#bdf08a" opacity="0.85" />
      <path d="M48 10 L52 14 L46 15 Z" fill="#bdf08a" opacity="0.7" />
      <path d="M44 54 L48 57 L42 58 Z" fill="#bdf08a" opacity="0.7" />
    </>
  );
}

function Bind() {
  return (
    <>
      <Glow color="#7fd6ff" o={0.4} />
      {/* frozen shackle ring with a hanging chain — locks a turn in ice */}
      <circle cx="32" cy="22" r="11" fill="none" stroke="#bfeaff" strokeWidth="4" />
      <circle cx="32" cy="22" r="11" fill="none" stroke="#3fb6ff" strokeWidth="1.4" />
      {/* keyhole on the cuff */}
      <circle cx="32" cy="20" r="2.6" fill="#0d1c2c" />
      <rect x="31" y="21" width="2" height="5" fill="#0d1c2c" />
      {/* chain links dangling below */}
      {[34, 44, 54].map((cy, i) => (
        <ellipse key={i} cx={i % 2 ? 28 : 32} cy={cy} rx="4.6" ry="6" fill="none" stroke="#9bd8f5" strokeWidth="3" />
      ))}
      {/* frost shards */}
      <path d="M14 14 L18 18 L13 19 Z" fill="#d6f4ff" opacity="0.85" />
      <path d="M50 16 L54 20 L48 21 Z" fill="#d6f4ff" opacity="0.7" />
    </>
  );
}

function Dice() {
  return (
    <>
      <Glow color="#ffd84a" o={0.5} />
      {/* a single die tilted, glowing gold — fate of the gamble */}
      <g transform="rotate(-12 32 34)">
        <rect x="18" y="20" width="28" height="28" rx="5" fill="#1c2233" stroke="#ffd86a" strokeWidth="2" />
        <rect x="18" y="20" width="28" height="28" rx="5" fill="url(#dice-sheen)" opacity="0.4" />
        {/* pips: five */}
        <circle cx="25" cy="27" r="2.4" fill="#fff1a8" />
        <circle cx="39" cy="27" r="2.4" fill="#fff1a8" />
        <circle cx="32" cy="34" r="2.4" fill="#fff1a8" />
        <circle cx="25" cy="41" r="2.4" fill="#fff1a8" />
        <circle cx="39" cy="41" r="2.4" fill="#fff1a8" />
      </g>
      <defs>
        <linearGradient id="dice-sheen" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.5" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* sparks of chance */}
      <circle cx="50" cy="14" r="2" fill="#fff1a8" opacity="0.85" />
      <circle cx="14" cy="50" r="1.6" fill="#fff1a8" opacity="0.7" />
    </>
  );
}

function Sacrifice() {
  return (
    <>
      <Glow color="#ff7a3c" o={0.5} />
      {/* altar slab */}
      <rect x="16" y="44" width="32" height="8" rx="2" fill="#2a1f1a" stroke="#7a4a2a" strokeWidth="1.4" />
      <rect x="20" y="52" width="24" height="5" rx="1.5" fill="#1a1310" stroke="#5c3a1f" strokeWidth="1" />
      {/* rising flame of offering */}
      <path d="M32 8 Q42 22 36 34 Q44 30 40 42 Q38 48 32 48 Q26 48 24 42 Q20 30 28 34 Q22 22 32 8 Z"
        fill="#ff8a3c" stroke="#ffd07a" strokeWidth="1.2" />
      <path d="M32 18 Q37 28 33 38 Q31 44 32 46 Q26 44 28 36 Q26 28 32 18 Z" fill="#ffe08a" opacity="0.9" />
      {/* embers */}
      <circle cx="42" cy="20" r="1.8" fill="#ffd07a" opacity="0.85" />
      <circle cx="22" cy="26" r="1.4" fill="#ffb45a" opacity="0.75" />
    </>
  );
}

function TwinStrike() {
  return (
    <>
      <Glow color="#ff5c8a" o={0.36} />
      {/* two crossed blades */}
      <g transform="rotate(20 32 32)">
        <path d="M32 8 L35 16 L34 40 L32 45 L30 40 L29 16 Z" fill={STEEL} stroke="#eef2ff" strokeWidth="1" />
        <rect x="23" y="43" width="18" height="4" rx="2" fill="#b98a3c" stroke="#e7c272" strokeWidth="0.8" />
        <rect x="30" y="47" width="4" height="8" fill={WOOD} stroke={WOOD_D} strokeWidth="0.7" />
      </g>
      <g transform="rotate(-20 32 32)">
        <path d="M32 8 L35 16 L34 40 L32 45 L30 40 L29 16 Z" fill={STEEL} stroke="#eef2ff" strokeWidth="1" />
        <path d="M32 8 L32 45 L30 40 L29 16 Z" fill={STEEL_D} opacity="0.6" />
        <rect x="23" y="43" width="18" height="4" rx="2" fill="#b98a3c" stroke="#e7c272" strokeWidth="0.8" />
        <rect x="30" y="47" width="4" height="8" fill={WOOD} stroke={WOOD_D} strokeWidth="0.7" />
      </g>
      {/* clash spark at the cross point */}
      <path d="M32 26 L34 30 L38 31 L34 33 L33 37 L31 33 L27 31 L31 30 Z" fill="#ffd0db" opacity="0.9" />
    </>
  );
}

function FirstAid() {
  return (
    <>
      <Glow color="#79b0a2" o={0.45} />
      {/* aid kit body */}
      <rect x="12" y="22" width="40" height="30" rx="5" fill="#13312c" stroke="#79b0a2" strokeWidth="2" />
      <rect x="12" y="22" width="40" height="10" rx="5" fill="#0e2a28" opacity="0.6" />
      {/* handle */}
      <path d="M26 22 L26 18 Q26 16 28 16 L36 16 Q38 16 38 18 L38 22" fill="none" stroke="#79b0a2" strokeWidth="2" />
      {/* green cross */}
      <path d="M29 34 L35 34 L35 40 L41 40 L41 46 L35 46 L35 52 L29 52 L29 46 L23 46 L23 40 L29 40 Z"
        fill="#7af0d3" stroke="#d6fff7" strokeWidth="1.2" />
    </>
  );
}

function Snipe() {
  return (
    <>
      <Glow color="#ff5c8a" o={0.42} />
      {/* scope ring */}
      <circle cx="32" cy="32" r="20" fill="#0d1622" stroke="#ff7aa0" strokeWidth="2.5" />
      <circle cx="32" cy="32" r="20" fill="none" stroke="#5a2436" strokeWidth="1" />
      {/* crosshair */}
      <line x1="32" y1="10" x2="32" y2="24" stroke="#ffd0db" strokeWidth="2" />
      <line x1="32" y1="40" x2="32" y2="54" stroke="#ffd0db" strokeWidth="2" />
      <line x1="10" y1="32" x2="24" y2="32" stroke="#ffd0db" strokeWidth="2" />
      <line x1="40" y1="32" x2="54" y2="32" stroke="#ffd0db" strokeWidth="2" />
      {/* locked-on dot */}
      <circle cx="32" cy="32" r="4" fill="#c2543a" />
      <circle cx="32" cy="32" r="1.6" fill="#fff" opacity="0.9" />
    </>
  );
}

function Judgment() {
  return (
    <>
      <Glow color="#f4c44a" o={0.5} />
      {/* central column */}
      <rect x="30" y="12" width="4" height="40" rx="1.5" fill="#e7c272" stroke="#fff3c8" strokeWidth="0.8" />
      <circle cx="32" cy="11" r="3" fill="#ffe9a8" stroke="#fff3c8" strokeWidth="1" />
      {/* beam */}
      <rect x="12" y="16" width="40" height="3" rx="1.5" fill="#e7c272" />
      {/* hanging chains + pans (scales of judgment) */}
      <line x1="16" y1="18" x2="16" y2="30" stroke="#cdbb88" strokeWidth="1" />
      <line x1="48" y1="18" x2="48" y2="30" stroke="#cdbb88" strokeWidth="1" />
      <path d="M8 30 Q16 42 24 30 Z" fill="#2a2418" stroke="#ffd86a" strokeWidth="1.4" />
      <path d="M40 30 Q48 42 56 30 Z" fill="#2a2418" stroke="#ffd86a" strokeWidth="1.4" />
      {/* base */}
      <path d="M24 52 L40 52 L44 57 L20 57 Z" fill="#1c1810" stroke="#c08f54" strokeWidth="1" />
    </>
  );
}

function Plunder() {
  return (
    <>
      <Glow color="#9be85a" o={0.4} />
      {/* a card being yanked away, trailing motion lines */}
      <g transform="rotate(-14 30 30)">
        <rect x="14" y="10" width="22" height="30" rx="3" fill="#16202c" stroke="#7ad04a" strokeWidth="1.6" />
        <rect x="14" y="10" width="22" height="30" rx="3" fill="#0e1620" opacity="0.4" />
        <path d="M25 16 L28 22 L34 23 L29 27 L30 33 L25 30 L20 33 L21 27 L16 23 L22 22 Z" fill="#bdf08a" opacity="0.85" />
      </g>
      {/* motion streaks */}
      <path d="M40 14 L50 12" stroke="#bdf08a" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
      <path d="M42 20 L52 19" stroke="#bdf08a" strokeWidth="2" strokeLinecap="round" opacity="0.45" />
      {/* grabbing hand */}
      <path d="M34 42 Q34 36 39 36 L48 36 Q54 36 54 42 L54 50 Q54 58 44 58 L40 58 Q34 58 33 52 L31 46 Q30 42 34 44 Z"
        fill="#2c3a22" stroke="#9be85a" strokeWidth="1.6" />
      {/* fingers */}
      {[39, 44, 49].map((x, i) => (
        <rect key={i} x={x - 1.5} y="33" width="3" height="8" rx="1.5" fill="#3a4c2c" stroke="#9be85a" strokeWidth="1" />
      ))}
      <rect x="52" y="42" width="5" height="3.5" rx="1.75" fill="#3a4c2c" stroke="#9be85a" strokeWidth="1" />
    </>
  );
}

function Dagger() {
  return (
    <>
      <Glow color="#ff5c8a" o={0.3} />
      {/* short stabbing blade */}
      <path d="M32 8 L35 16 L34 36 L32 42 L30 36 L29 16 Z" fill={STEEL} stroke="#eef2ff" strokeWidth="1" />
      <path d="M32 8 L32 42 L30 36 L29 16 Z" fill={STEEL_D} opacity="0.6" />
      <path d="M32 9 L32 41" stroke="#ff90b3" strokeWidth="1" opacity="0.8" />
      {/* guard */}
      <rect x="24" y="41" width="16" height="4" rx="2" fill="#b98a3c" stroke="#e7c272" strokeWidth="1" />
      {/* grip + pommel */}
      <rect x="30" y="45" width="4" height="10" fill={WOOD} stroke={WOOD_D} strokeWidth="0.8" />
      <circle cx="32" cy="56" r="3" fill="#b98a3c" stroke="#e7c272" strokeWidth="1" />
    </>
  );
}

function Fireball() {
  return (
    <>
      <Glow color="#ff7a3c" o={0.55} />
      {/* molten core */}
      <circle cx="32" cy="36" r="16" fill="url(#fb-core)" stroke="#ff9a4a" strokeWidth="1.5" />
      <defs>
        <radialGradient id="fb-core" cx="0.4" cy="0.36" r="0.7">
          <stop offset="0" stopColor="#fff1a8" />
          <stop offset="0.5" stopColor="#ff8a3c" />
          <stop offset="1" stopColor="#c0264a" />
        </radialGradient>
      </defs>
      {/* trailing flames */}
      <path d="M32 20 Q24 8 20 4 Q26 14 22 16 Q30 12 32 20 Z" fill="#ff8a3c" opacity="0.9" />
      <path d="M40 24 Q48 14 52 10 Q46 20 50 22 Q42 20 40 24 Z" fill="#ffb45a" opacity="0.8" />
      {/* inner hotspot — crisp molten catch-light */}
      <circle cx="28" cy="32" r="3.4" fill="#fff1a8" />
      <circle cx="26.9" cy="30.9" r="1.1" fill="#fff" />
    </>
  );
}

function Frostbolt() {
  return (
    <>
      <Glow color="#7fd6ff" o={0.45} />
      {/* icy arrow shaft */}
      <line x1="12" y1="52" x2="48" y2="16" stroke="#bfeaff" strokeWidth="3" strokeLinecap="round" />
      <line x1="14" y1="50" x2="46" y2="18" stroke="#e6f7ff" strokeWidth="1" opacity="0.8" />
      {/* crystalline head */}
      <path d="M48 16 L40 18 L46 24 Z" fill="#d6f4ff" stroke="#8be3ff" strokeWidth="1" />
      <path d="M52 12 L44 15 L49 20 L54 18 Z" fill="#eaffff" stroke="#8be3ff" strokeWidth="0.8" />
      {/* frost shards flaking off */}
      <path d="M22 26 L26 30 L21 31 Z" fill="#d6f4ff" opacity="0.85" />
      <path d="M32 36 L36 40 L31 41 Z" fill="#d6f4ff" opacity="0.7" />
      {/* fletching */}
      <path d="M12 52 L18 50 L16 44 Z" fill="#7fd6ff" opacity="0.8" />
      <path d="M12 52 L14 46 L20 48 Z" fill="#7fd6ff" opacity="0.7" />
    </>
  );
}

function Windfury() {
  return (
    <>
      <Glow color="#7af0d3" o={0.4} />
      {/* three swift slash arcs */}
      <path d="M14 18 Q40 22 50 46" fill="none" stroke="#d6fff7" strokeWidth="3.5" strokeLinecap="round" opacity="0.9" />
      <path d="M12 30 Q38 34 48 56" fill="none" stroke="#7af0d3" strokeWidth="3.5" strokeLinecap="round" opacity="0.8" />
      <path d="M18 10 Q46 12 56 34" fill="none" stroke="#bff6ec" strokeWidth="3" strokeLinecap="round" opacity="0.7" />
      {/* speed sparks at the tips */}
      <circle cx="50" cy="46" r="2" fill="#eafffb" opacity="0.9" />
      <circle cx="48" cy="56" r="1.6" fill="#eafffb" opacity="0.75" />
      <circle cx="56" cy="34" r="1.6" fill="#eafffb" opacity="0.7" />
    </>
  );
}

function Bulwark() {
  return (
    <>
      <Glow color="#7fb6ff" o={0.4} />
      {/* fortress wall of stone blocks */}
      <rect x="12" y="20" width="40" height="34" rx="3" fill="#1a2536" stroke="#7fb6ff" strokeWidth="2" />
      {/* battlement crenellations */}
      <rect x="12" y="14" width="8" height="8" fill="#22314a" stroke="#7fb6ff" strokeWidth="1.4" />
      <rect x="28" y="14" width="8" height="8" fill="#22314a" stroke="#7fb6ff" strokeWidth="1.4" />
      <rect x="44" y="14" width="8" height="8" fill="#22314a" stroke="#7fb6ff" strokeWidth="1.4" />
      {/* brick seams */}
      <line x1="12" y1="32" x2="52" y2="32" stroke="#3a4c68" strokeWidth="1.2" />
      <line x1="12" y1="43" x2="52" y2="43" stroke="#3a4c68" strokeWidth="1.2" />
      <line x1="26" y1="20" x2="26" y2="32" stroke="#3a4c68" strokeWidth="1.2" />
      <line x1="38" y1="32" x2="38" y2="43" stroke="#3a4c68" strokeWidth="1.2" />
      <line x1="22" y1="43" x2="22" y2="54" stroke="#3a4c68" strokeWidth="1.2" />
      <line x1="42" y1="43" x2="42" y2="54" stroke="#3a4c68" strokeWidth="1.2" />
      {/* sheen */}
      <path d="M16 20 L24 20 L18 54 L12 54 L12 24 Z" fill="#9ec6ff" opacity="0.12" />
    </>
  );
}

function Meditate() {
  return (
    <>
      <Glow color="#79b0a2" o={0.42} />
      {/* aura rings */}
      <circle cx="32" cy="34" r="20" fill="none" stroke="#7af0d3" strokeWidth="1" opacity="0.4" />
      <circle cx="32" cy="34" r="14" fill="none" stroke="#7af0d3" strokeWidth="1" opacity="0.55" />
      {/* seated figure silhouette */}
      <circle cx="32" cy="24" r="5" fill="#bff6ec" />
      <path d="M20 50 Q32 34 44 50 Q44 54 32 54 Q20 54 20 50 Z" fill="#2e6f66" stroke="#7af0d3" strokeWidth="1.4" />
      {/* meditative hands */}
      <path d="M24 46 Q32 40 40 46" fill="none" stroke="#d6fff7" strokeWidth="2" strokeLinecap="round" />
      {/* rising motes of calm */}
      <circle cx="32" cy="10" r="2" fill="#d6fff7" opacity="0.85" />
      <circle cx="24" cy="14" r="1.4" fill="#d6fff7" opacity="0.7" />
      <circle cx="40" cy="14" r="1.4" fill="#d6fff7" opacity="0.7" />
    </>
  );
}

function HolyNova() {
  return (
    <>
      <Glow color="#f4c44a" o={0.6} />
      {/* radiant burst rays */}
      {Array.from({ length: 12 }).map((_, i) => (
        <line
          key={i}
          x1="32"
          y1="32"
          x2={32 + 28 * Math.cos((i * Math.PI) / 6)}
          y2={32 + 28 * Math.sin((i * Math.PI) / 6)}
          stroke="#ffe9a8"
          strokeWidth={i % 2 ? 1.5 : 3}
          opacity="0.6"
          strokeLinecap="round"
        />
      ))}
      {/* blazing core */}
      <circle cx="32" cy="32" r="12" fill="url(#hn-core)" stroke="#fff3c8" strokeWidth="1.5" />
      <defs>
        <radialGradient id="hn-core" cx="0.5" cy="0.5" r="0.6">
          <stop offset="0" stopColor="#fffef0" />
          <stop offset="1" stopColor="#f4c44a" />
        </radialGradient>
      </defs>
      <circle cx="32" cy="32" r="4" fill="#fffef0" />
      <circle cx="30.6" cy="30.6" r="1.3" fill="#fff" />
    </>
  );
}

function Execute() {
  return (
    <>
      <Glow color="#c2543a" o={0.5} />
      {/* headsman's axe */}
      <rect x="30" y="10" width="4" height="46" rx="1.5" fill={WOOD} stroke={WOOD_D} strokeWidth="0.8" />
      {/* broad blade */}
      <path d="M32 12 Q52 12 52 30 Q44 26 32 28 Z" fill={STEEL} stroke="#eef2ff" strokeWidth="1.2" />
      <path d="M32 12 Q52 12 52 30 Q44 26 32 28 Z" fill="#ff90b3" opacity="0.18" />
      <path d="M32 12 L32 28 Q44 26 52 30" fill="none" stroke="#ffd0db" strokeWidth="1" opacity="0.7" />
      {/* back spike */}
      <path d="M30 16 Q18 16 16 26 Q24 22 30 24 Z" fill={STEEL_D} stroke="#c9d0e0" strokeWidth="1" />
      {/* blood edge */}
      <path d="M52 30 Q49 34 46 33" stroke="#c0264a" strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* pommel */}
      <circle cx="32" cy="57" r="3" fill="#b98a3c" stroke="#e7c272" strokeWidth="1" />
    </>
  );
}

function Charge() {
  return (
    <>
      <Glow color="#6fb6ff" o={0.5} />
      {/* mana crystal being energized */}
      <path d="M32 6 L44 26 L38 54 L26 54 L20 26 Z" fill="url(#charge-core)" stroke="#9ec6ff" strokeWidth="1.6" />
      <defs>
        <linearGradient id="charge-core" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#d6ecff" />
          <stop offset="0.5" stopColor="#5aa0ff" />
          <stop offset="1" stopColor="#2a4c9a" />
        </linearGradient>
      </defs>
      {/* inner facet lines */}
      <path d="M32 6 L32 54" stroke="#eaf4ff" strokeWidth="1" opacity="0.7" />
      <path d="M20 26 L44 26" stroke="#bcd8ff" strokeWidth="1" opacity="0.6" />
      <path d="M32 6 L20 26 L26 54 Z" fill="#ffffff" opacity="0.12" />
      {/* charging lightning sparks */}
      <path d="M12 14 L18 20 L14 22 L20 30" fill="none" stroke="#ffe46a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
      <path d="M52 16 L46 22 L50 24 L44 32" fill="none" stroke="#ffe46a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />
      {/* core facet catch-light — crisp */}
      <circle cx="32" cy="32" r="3.4" fill="#eaf4ff" />
      <circle cx="30.9" cy="30.9" r="1" fill="#fff" />
      <circle cx="26" cy="14" r="1.6" fill="#bfe0ff" opacity="0.8" />
      <circle cx="40" cy="18" r="1.4" fill="#bfe0ff" opacity="0.7" />
    </>
  );
}

function FateSwap() {
  return (
    <>
      <Glow color="#b388ff" o={0.42} />
      {/* two hearts trading places along curved swap arrows */}
      <path d="M18 16 C15 16 13 18.4 13 21 C13 25 17 28 22 32 C27 28 31 25 31 21 C31 18.4 29 16 26 16 C24 16 22.6 17.2 22 18.4 C21.4 17.2 20 16 18 16 Z" fill="#ff5c8a" stroke="#ffd0db" strokeWidth="1" />
      <path d="M42 34 C39 34 37 36.4 37 39 C37 43 41 46 46 50 C51 46 55 43 55 39 C55 36.4 53 34 50 34 C48 34 46.6 35.2 46 36.4 C45.4 35.2 44 34 42 34 Z" fill="#7fb6ff" stroke="#cfe2ff" strokeWidth="1" />
      {/* swap arrows */}
      <path d="M12 40 Q22 52 34 46" fill="none" stroke="#c9a0ff" strokeWidth="3" strokeLinecap="round" />
      <path d="M34 46 L28 45 L31 51 Z" fill="#e2d0ff" />
      <path d="M52 24 Q42 12 30 18" fill="none" stroke="#c9a0ff" strokeWidth="3" strokeLinecap="round" />
      <path d="M30 18 L36 19 L33 13 Z" fill="#e2d0ff" />
    </>
  );
}

function MindSiphon() {
  return (
    <>
      <Glow color="#6fb6ff" o={0.45} />
      {/* a head profile with a spiral mind, mana motes streaming out */}
      <path d="M34 54 Q18 54 16 38 Q14 22 30 18 Q46 14 48 30 Q49 40 42 42 L42 50 Q42 54 38 54 Z"
        fill="#16243a" stroke="#7fb6ff" strokeWidth="2" strokeLinejoin="round" />
      {/* mind swirl */}
      <path d="M30 34 m0 -6 a6 6 0 1 1 -5 3 a3.5 3.5 0 1 0 3 2" fill="none" stroke="#bfe0ff" strokeWidth="2" strokeLinecap="round" />
      {/* siphoned mana crystals drifting away */}
      <path d="M52 14 l3 5 l-3 5 l-3 -5 Z" fill="#5aa0ff" stroke="#d6ecff" strokeWidth="0.9" />
      <path d="M56 28 l2.2 3.6 l-2.2 3.6 l-2.2 -3.6 Z" fill="#5aa0ff" stroke="#d6ecff" strokeWidth="0.8" opacity="0.8" />
      <circle cx="49" cy="24" r="1.6" fill="#d6ecff" opacity="0.85" />
    </>
  );
}

function BloodWave() {
  return (
    <>
      <Glow color="#c0264a" o={0.45} />
      {/* a cresting wave of blood */}
      <path d="M6 40 Q14 26 24 34 Q30 39 36 32 Q44 22 52 34 Q58 42 58 48 L58 56 L6 56 Z"
        fill="#7a1330" stroke="#ff6a88" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M6 44 Q16 34 24 40 Q32 46 40 40 Q48 34 58 44 L58 56 L6 56 Z" fill="#c0264a" opacity="0.8" />
      {/* curl highlight */}
      <path d="M44 26 Q52 30 52 38 Q49 33 44 34 Q47 30 44 26 Z" fill="#ff8aa0" opacity="0.85" />
      {/* flung droplets */}
      <path d="M20 20 Q18 24 20 26 Q22 24 20 20 Z" fill="#ff6a88" />
      <circle cx="34" cy="18" r="2.4" fill="#ff6a88" />
      <circle cx="48" cy="16" r="1.8" fill="#ff6a88" opacity="0.85" />
    </>
  );
}

function LastStand() {
  return (
    <>
      <Glow color="#ff5c8a" o={0.42} />
      {/* a cracked shield with a defiant clenched fist bursting through */}
      <path d="M32 6 L50 12 L50 30 Q50 44 32 52 Q14 44 14 30 L14 12 Z"
        fill="#1a2230" stroke="#ff7aa0" strokeWidth="2" strokeLinejoin="round" />
      {/* crack */}
      <path d="M32 6 L28 20 L36 26 L30 38 L34 52" fill="none" stroke="#c2543a" strokeWidth="2" strokeLinejoin="round" opacity="0.8" />
      {/* fist */}
      <path d="M24 40 Q24 32 30 32 L40 32 Q46 32 46 38 L46 46 Q46 52 38 52 L30 52 Q24 52 24 46 Z"
        fill="#3a2530" stroke="#ffd0db" strokeWidth="1.6" />
      {[30, 35, 40].map((x, i) => (
        <rect key={i} x={x - 1.6} y="29" width="3.2" height="7" rx="1.5" fill="#4a2f38" stroke="#ffd0db" strokeWidth="1" />
      ))}
      {/* defiant spark */}
      <path d="M35 12 L37 17 L42 18 L37 19 L35 24 L33 19 L28 18 L33 17 Z" fill="#ffd0db" opacity="0.9" />
    </>
  );
}

function Gale() {
  return (
    <>
      <Glow color="#7fd6ff" o={0.4} />
      {/* three swirling wind gusts */}
      <path d="M10 20 h22 a5 5 0 1 0 -5 -5" fill="none" stroke="#d6f4ff" strokeWidth="3.2" strokeLinecap="round" />
      <path d="M8 32 h34 a6 6 0 1 1 -6 6" fill="none" stroke="#7fd6ff" strokeWidth="3.2" strokeLinecap="round" />
      <path d="M12 44 h20 a4.5 4.5 0 1 0 -4.5 4.5" fill="none" stroke="#bfeaff" strokeWidth="3" strokeLinecap="round" opacity="0.85" />
      {/* frost flecks carried on the wind */}
      <path d="M48 12 l3 3 l-3 3 l-3 -3 Z" fill="#eaffff" opacity="0.85" />
      <circle cx="50" cy="50" r="1.8" fill="#eaffff" opacity="0.7" />
    </>
  );
}

function Tempest() {
  return (
    <>
      <Glow color="#ffd84a" o={0.5} />
      {/* storm cloud */}
      <path d="M18 30 A9 9 0 0 1 34 24 A8 8 0 0 1 48 28 A7 7 0 0 1 47 42 L20 42 A8 8 0 0 1 18 30 Z"
        fill="#2a2f42" stroke="#8b93ad" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M18 30 A9 9 0 0 1 34 24 A8 8 0 0 1 48 28 A7 7 0 0 1 47 42 Z" fill="#1a1e2c" opacity="0.5" />
      {/* forking lightning */}
      <path d="M32 40 L24 52 L31 52 L26 62 L40 48 L33 48 L38 40 Z" fill="#ffe46a" stroke="#fff6c4" strokeWidth="1.4" strokeLinejoin="round" />
      {/* driving rain */}
      <line x1="20" y1="46" x2="17" y2="54" stroke="#7fb6ff" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
      <line x1="46" y1="46" x2="43" y2="54" stroke="#7fb6ff" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
    </>
  );
}

function Backstab() {
  return (
    <>
      <Glow color="#9be85a" o={0.4} />
      {/* a stolen card pulled away, a dagger striking from behind it */}
      <g transform="rotate(-12 26 32)">
        <rect x="14" y="14" width="22" height="30" rx="3" fill="#16202c" stroke="#7ad04a" strokeWidth="1.6" />
        <rect x="14" y="14" width="22" height="30" rx="3" fill="#0e1620" opacity="0.4" />
        <path d="M25 20 L28 26 L34 27 L29 31 L30 37 L25 34 L20 37 L21 31 L16 27 L22 26 Z" fill="#bdf08a" opacity="0.8" />
      </g>
      {/* dagger thrust */}
      <g transform="rotate(38 44 32)">
        <path d="M44 8 L47 16 L46 34 L44 40 L42 34 L41 16 Z" fill="#cfd6e6" stroke="#eef2ff" strokeWidth="1" />
        <path d="M44 8 L44 40 L42 34 L41 16 Z" fill="#7b8398" opacity="0.6" />
        <rect x="37" y="39" width="14" height="3.5" rx="1.7" fill="#6a8a3c" stroke="#bfe772" strokeWidth="0.9" />
        <rect x="42.5" y="42" width="3" height="8" fill={WOOD} stroke={WOOD_D} strokeWidth="0.7" />
      </g>
      {/* motion streak */}
      <path d="M40 12 L50 8" stroke="#bdf08a" strokeWidth="2" strokeLinecap="round" opacity="0.55" />
    </>
  );
}

/* ── Board-model art (20 minions + 10 spells) ─────────────────────────────
   Compact, ink-outlined subjects. Each pairs with its element's SCENE backdrop
   (see ELEMENT below), so palette + backdrop carry a lot of the character. */

// shared humanoid tones
const SKIN = '#e6b487', SKIN_D = '#a9754a';
const PLATE = '#cdd6e6', PLATE_D = '#79839a';
const GOLD = '#f0c860', GOLD_D = '#b8862c';

/** A small floating wisp of light (꼬마 정령). */
function Sprite() {
  return (
    <>
      <ellipse cx="32" cy="34" rx="9" ry="11" fill="#bfe9ff" />
      <ellipse cx="32" cy="32" rx="5" ry="6.5" fill="#f2fbff" />
      <circle cx="29.5" cy="30" r="1.3" fill="#1a2a3a" />
      <circle cx="34.5" cy="30" r="1.3" fill="#1a2a3a" />
      <path d="M24 40 Q20 46 24 50" stroke="#8fd6f0" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.7" />
      <path d="M40 40 Q44 46 40 50" stroke="#8fd6f0" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.7" />
    </>
  );
}

/** Bust of an armored soldier holding a short blade (신병). */
function Recruit() {
  return (
    <>
      <path d="M22 52 Q22 40 32 40 Q42 40 42 52 Z" fill="#5b6a4a" />
      <circle cx="32" cy="30" r="8" fill={SKIN} stroke={SKIN_D} strokeWidth="1" />
      <path d="M24 28 Q32 18 40 28 L40 24 Q32 16 24 24 Z" fill={STEEL} stroke={STEEL_D} strokeWidth="0.8" />
      <rect x="43" y="30" width="2.4" height="20" fill={STEEL} stroke={STEEL_D} strokeWidth="0.7" transform="rotate(12 44 40)" />
      <circle cx="29" cy="31" r="1.1" fill="#26303e" />
      <circle cx="35" cy="31" r="1.1" fill="#26303e" />
    </>
  );
}

/** A footman behind a broad shield (수비병 · 도발). */
function Guard() {
  return (
    <>
      <circle cx="36" cy="28" r="7" fill={SKIN} stroke={SKIN_D} strokeWidth="1" />
      <path d="M28 26 Q36 18 44 26 L44 22 Q36 15 28 22 Z" fill={STEEL} stroke={STEEL_D} strokeWidth="0.8" />
      <path d="M14 24 L30 24 L30 44 Q22 52 14 44 Z" fill="#7c5a30" stroke="#40260f" strokeWidth="1.4" />
      <path d="M22 24 L22 48" stroke="#c8922f" strokeWidth="1.6" />
      <circle cx="22" cy="35" r="2.4" fill={GOLD} stroke={GOLD_D} strokeWidth="0.8" />
    </>
  );
}

/** A lunging wolf (늑대 · 돌진). */
function Wolf() {
  return (
    <>
      <path d="M16 46 Q24 30 40 32 L52 30 L48 38 Q46 48 34 48 Z" fill="#6b6f78" stroke="#2b2e35" strokeWidth="1.4" />
      <path d="M50 28 L54 22 L54 30 Z" fill="#6b6f78" stroke="#2b2e35" strokeWidth="1" />
      <path d="M45 30 L48 24 L50 31 Z" fill="#6b6f78" stroke="#2b2e35" strokeWidth="1" />
      <path d="M52 32 L60 33 L52 36 Z" fill="#3a3d44" />
      <circle cx="50" cy="31" r="1.3" fill="#ffd24a" />
      <path d="M20 46 L18 54 M28 47 L27 55 M36 47 L36 55" stroke="#2b2e35" strokeWidth="2" strokeLinecap="round" />
    </>
  );
}

/** A young squire raising a banner (종자). */
function Squire() {
  return (
    <>
      <rect x="30" y="14" width="2" height="38" fill="#6b4a26" />
      <path d="M32 15 L48 19 L44 26 L48 33 L32 29 Z" fill="#a83b2c" stroke="#5f1f16" strokeWidth="1" />
      <circle cx="24" cy="32" r="7" fill={SKIN} stroke={SKIN_D} strokeWidth="1" />
      <path d="M18 52 Q18 40 24 40 Q31 40 31 52 Z" fill="#456089" />
      <circle cx="22" cy="32" r="1.1" fill="#26303e" />
      <circle cx="27" cy="32" r="1.1" fill="#26303e" />
    </>
  );
}

/** An archer drawing a bow (궁수). */
function Archer() {
  return (
    <>
      <path d="M20 16 Q40 32 20 48" stroke="#7c5a30" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <path d="M20 16 L20 48" stroke="#e8e2d0" strokeWidth="1" />
      <path d="M20 32 L46 32" stroke="#cfd8e6" strokeWidth="1.4" />
      <path d="M44 30 L50 32 L44 34 Z" fill="#cfd8e6" stroke="#79839a" strokeWidth="0.6" />
      <circle cx="30" cy="26" r="6" fill={SKIN} stroke={SKIN_D} strokeWidth="1" />
      <path d="M25 50 Q25 40 31 40 Q37 40 37 50 Z" fill="#3f5a3a" />
    </>
  );
}

/** A knight in full plate with a longsword (기사). */
function Knight() {
  return (
    <>
      <path d="M22 52 Q22 38 32 38 Q42 38 42 52 Z" fill={STEEL} stroke={STEEL_D} strokeWidth="1.2" />
      <path d="M25 40 L39 40" stroke={STEEL_D} strokeWidth="1" />
      <path d="M24 30 Q32 20 40 30 L40 34 L24 34 Z" fill={STEEL} stroke={STEEL_D} strokeWidth="1" />
      <rect x="30" y="30" width="4" height="6" fill="#1c2430" />
      <rect x="45" y="16" width="2.6" height="30" fill={STEEL} stroke={STEEL_D} strokeWidth="0.8" transform="rotate(8 46 30)" />
      <rect x="42" y="30" width="9" height="2.4" fill={GOLD} stroke={GOLD_D} strokeWidth="0.6" transform="rotate(8 46 31)" />
    </>
  );
}

/** A robed cleric raising a holy staff (사제). */
function Cleric() {
  return (
    <>
      <rect x="44" y="14" width="2.2" height="36" fill="#c8922f" />
      <path d="M45 14 L45 8 M42 11 L48 11" stroke={GOLD} strokeWidth="2" strokeLinecap="round" />
      <circle cx="45" cy="11" r="3.4" fill="none" stroke={GOLD} strokeWidth="1.4" />
      <path d="M20 52 Q20 30 30 30 Q40 30 40 52 Z" fill="#e8e2d0" stroke="#b6ad92" strokeWidth="1.2" />
      <circle cx="30" cy="26" r="6.5" fill={SKIN} stroke={SKIN_D} strokeWidth="1" />
      <path d="M23 26 Q30 18 37 26 L37 22 Q30 16 23 22 Z" fill="#d9cfae" />
    </>
  );
}

/** An enormous tower shield (방패병 · 도발). */
function Shieldbearer() {
  return (
    <>
      <path d="M18 14 L46 14 L46 42 Q32 54 18 42 Z" fill="#8a6636" stroke="#3e2510" strokeWidth="1.8" />
      <path d="M32 14 L32 50" stroke="#c8922f" strokeWidth="2" />
      <path d="M18 26 L46 26" stroke="#c8922f" strokeWidth="2" />
      <circle cx="32" cy="26" r="4" fill={GOLD} stroke={GOLD_D} strokeWidth="1" />
    </>
  );
}

/** A raging berserker with twin axes (광전사). */
function Berserker() {
  return (
    <>
      <circle cx="32" cy="30" r="8" fill={SKIN} stroke={SKIN_D} strokeWidth="1" />
      <path d="M24 40 Q24 52 32 52 Q40 52 40 40 Z" fill="#7a2e22" />
      <path d="M16 20 L22 26 L20 30 L12 24 Z" fill="#b03428" stroke="#5f1710" strokeWidth="0.8" />
      <rect x="20" y="26" width="2" height="16" fill="#6b4a26" transform="rotate(-40 21 34)" />
      <path d="M48 20 L42 26 L44 30 L52 24 Z" fill="#b03428" stroke="#5f1710" strokeWidth="0.8" />
      <rect x="42" y="26" width="2" height="16" fill="#6b4a26" transform="rotate(40 43 34)" />
      <path d="M28 29 L31 30 M36 29 L33 30" stroke="#3a1410" strokeWidth="1.4" strokeLinecap="round" />
    </>
  );
}

/** A venomous spider (맹독거미 · 독성). */
function Venomspider() {
  return (
    <>
      <ellipse cx="32" cy="36" rx="10" ry="8" fill="#3a4a24" stroke="#1a220f" strokeWidth="1.2" />
      <circle cx="32" cy="27" r="5" fill="#4a5c2e" stroke="#1a220f" strokeWidth="1" />
      <path d="M22 32 L12 26 M22 36 L11 36 M22 40 L13 46" stroke="#2a331a" strokeWidth="2" strokeLinecap="round" />
      <path d="M42 32 L52 26 M42 36 L53 36 M42 40 L51 46" stroke="#2a331a" strokeWidth="2" strokeLinecap="round" />
      <circle cx="30" cy="26" r="1.3" fill="#c4f04a" />
      <circle cx="34" cy="26" r="1.3" fill="#c4f04a" />
      <ellipse cx="32" cy="38" rx="3" ry="4" fill="#a6c84a" opacity="0.7" />
    </>
  );
}

/** A mounted lancer charging (창기병 · 돌진). */
function Cavalier() {
  return (
    <>
      <path d="M14 44 Q22 34 38 36 L46 34 L44 44 Q40 50 30 50 Z" fill="#6b5236" stroke="#33260f" strokeWidth="1.2" />
      <path d="M18 44 L16 52 M28 46 L27 53 M36 45 L36 52" stroke="#33260f" strokeWidth="2" strokeLinecap="round" />
      <circle cx="30" cy="26" r="5.5" fill={STEEL} stroke={STEEL_D} strokeWidth="1" />
      <path d="M34 24 L60 18" stroke="#cfd8e6" strokeWidth="2" strokeLinecap="round" />
      <path d="M58 16 L62 18 L58 20 Z" fill={STEEL} stroke={STEEL_D} strokeWidth="0.6" />
    </>
  );
}

/** A radiant paladin (성기사 · 신성한 보호막). */
function Paladin() {
  return (
    <>
      <circle cx="32" cy="32" r="16" fill="none" stroke="#fff2c0" strokeWidth="1" opacity="0.5" />
      <path d="M22 52 Q22 36 32 36 Q42 36 42 52 Z" fill={STEEL} stroke={STEEL_D} strokeWidth="1.2" />
      <path d="M24 30 Q32 20 40 30 L40 34 L24 34 Z" fill="#eef2fa" stroke={STEEL_D} strokeWidth="1" />
      <rect x="30" y="30" width="4" height="6" fill="#1c2430" />
      <path d="M32 40 L32 50 M27 44 L37 44" stroke={GOLD} strokeWidth="2.2" strokeLinecap="round" />
    </>
  );
}

/** A caped vampire lord (흡혈귀 · 흡혈). */
function Vampirelord() {
  return (
    <>
      <path d="M14 50 Q20 30 32 30 Q44 30 50 50 Z" fill="#2a1420" stroke="#120810" strokeWidth="1.4" />
      <circle cx="32" cy="26" r="7.5" fill="#e8dcd4" stroke="#b09a92" strokeWidth="1" />
      <path d="M24 24 Q32 14 40 24 L40 20 Q32 13 24 20 Z" fill="#1a0c14" />
      <circle cx="29" cy="26" r="1.4" fill="#c4182c" />
      <circle cx="35" cy="26" r="1.4" fill="#c4182c" />
      <path d="M29 30 L30 33 M35 30 L34 33" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" />
    </>
  );
}

/** A bomb-hurling grenadier (폭탄병 · 죽음의 메아리). */
function Bomber() {
  return (
    <>
      <circle cx="38" cy="36" r="9" fill="#2a2e36" stroke="#0e1014" strokeWidth="1.4" />
      <ellipse cx="35" cy="33" rx="3" ry="2" fill="#5a6068" opacity="0.7" />
      <path d="M38 27 Q42 20 46 22" stroke="#8a6636" strokeWidth="1.6" fill="none" />
      <circle cx="46" cy="21" r="2.2" fill="#ffb43a" />
      <circle cx="46" cy="21" r="3.4" fill="none" stroke="#ff6a1a" strokeWidth="0.8" opacity="0.7" />
      <circle cx="20" cy="30" r="6" fill={SKIN} stroke={SKIN_D} strokeWidth="1" />
      <path d="M15 50 Q15 40 21 40 Q27 40 27 50 Z" fill="#4a3a24" />
    </>
  );
}

/** A warlord raising a banner and blade (전쟁군주). */
function Warlord() {
  return (
    <>
      <rect x="46" y="12" width="2" height="40" fill="#6b4a26" />
      <path d="M48 13 L60 16 L56 22 L60 28 L48 25 Z" fill="#7a1f18" stroke="#3e0f0a" strokeWidth="1" />
      <path d="M20 52 Q20 36 30 36 Q40 36 40 52 Z" fill="#54341f" stroke={GOLD_D} strokeWidth="1" />
      <circle cx="30" cy="26" r="7" fill={STEEL} stroke={STEEL_D} strokeWidth="1.2" />
      <path d="M30 18 L27 13 L30 15 L33 13 Z" fill={GOLD} stroke={GOLD_D} strokeWidth="0.6" />
      <rect x="12" y="18" width="2.4" height="28" fill={STEEL} stroke={STEEL_D} strokeWidth="0.8" transform="rotate(-10 13 32)" />
    </>
  );
}

/** A hulking rock golem (바위 골렘 · 도발). */
function Golem() {
  return (
    <>
      <rect x="20" y="30" width="24" height="22" rx="3" fill="#6d6a5e" stroke="#2f2c24" strokeWidth="1.6" />
      <rect x="24" y="20" width="16" height="14" rx="3" fill="#7a776a" stroke="#2f2c24" strokeWidth="1.4" />
      <rect x="14" y="32" width="7" height="16" rx="2" fill="#6d6a5e" stroke="#2f2c24" strokeWidth="1.2" />
      <rect x="43" y="32" width="7" height="16" rx="2" fill="#6d6a5e" stroke="#2f2c24" strokeWidth="1.2" />
      <circle cx="29" cy="27" r="1.6" fill="#8be3ff" />
      <circle cx="35" cy="27" r="1.6" fill="#8be3ff" />
      <path d="M24 40 L40 40 M32 34 L32 50" stroke="#2f2c24" strokeWidth="1" opacity="0.5" />
    </>
  );
}

/** A hooded necromancer with a floating skull (강령술사 · 죽음의 메아리). */
function Necromancer() {
  return (
    <>
      <path d="M20 52 Q20 26 32 26 Q44 26 44 52 Z" fill="#2a2440" stroke="#120e22" strokeWidth="1.4" />
      <path d="M24 30 Q32 18 40 30 L40 26 Q32 16 24 26 Z" fill="#1a1630" />
      <ellipse cx="32" cy="30" rx="5" ry="6" fill="#0c0a16" />
      <circle cx="30" cy="29" r="1.3" fill="#a45cff" />
      <circle cx="34" cy="29" r="1.3" fill="#a45cff" />
      <circle cx="48" cy="20" r="4" fill="#e8e2d0" stroke="#b6ad92" strokeWidth="0.8" />
      <circle cx="46.5" cy="19" r="1" fill="#2a2440" />
      <circle cx="49.5" cy="19" r="1" fill="#2a2440" />
    </>
  );
}

/** A fire dragon (화염룡). */
function Dragon() {
  return (
    <>
      <path d="M14 44 Q24 26 42 30 L54 24 L50 34 Q52 44 38 46 Z" fill="#a8331f" stroke="#521309" strokeWidth="1.4" />
      <path d="M52 22 L58 16 L57 26 Z" fill="#c24327" stroke="#521309" strokeWidth="0.8" />
      <path d="M46 26 L50 18 L52 27 Z" fill="#c24327" stroke="#521309" strokeWidth="0.8" />
      <path d="M20 34 Q28 22 38 30 L34 40 Q26 44 20 38 Z" fill="#c24327" opacity="0.8" />
      <circle cx="52" cy="26" r="1.5" fill="#ffd24a" />
      <path d="M55 30 Q62 30 60 34 Q58 32 55 33 Z" fill="#ffb43a" />
      <path d="M16 42 L14 50 M26 44 L25 52 M34 44 L34 52" stroke="#521309" strokeWidth="2" strokeLinecap="round" />
    </>
  );
}

/** A winged archangel (대천사 · 신성한 보호막). */
function Archangel() {
  return (
    <>
      <path d="M32 20 Q14 22 12 40 Q24 34 32 40 Z" fill="#f4efe0" stroke="#cfc6ac" strokeWidth="1" />
      <path d="M32 20 Q50 22 52 40 Q40 34 32 40 Z" fill="#f4efe0" stroke="#cfc6ac" strokeWidth="1" />
      <path d="M26 52 Q26 32 32 32 Q38 32 38 52 Z" fill="#eef2fa" stroke="#c2c9d6" strokeWidth="1.2" />
      <circle cx="32" cy="24" r="6" fill={SKIN} stroke={SKIN_D} strokeWidth="1" />
      <ellipse cx="32" cy="15" rx="6" ry="2" fill="none" stroke={GOLD} strokeWidth="1.6" />
      <path d="M32 40 L32 50 M28 44 L36 44" stroke={GOLD} strokeWidth="2" strokeLinecap="round" />
    </>
  );
}

/* ── Spells ── */

/** A slashing blade arc (강타). */
function StrikeArt() {
  return (
    <>
      <path d="M14 46 Q34 12 54 22" stroke="#eef2fa" strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d="M14 46 Q34 16 52 24" stroke="#8fa0c0" strokeWidth="1.6" fill="none" strokeLinecap="round" opacity="0.7" />
      <path d="M50 20 L58 20 L52 26 Z" fill="#eef2fa" />
    </>
  );
}

/** A hurled firebolt (화염 화살). */
function FireboltArt() {
  return (
    <>
      <path d="M14 44 Q26 36 40 30" stroke="#ff7a2a" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.6" />
      <circle cx="44" cy="28" r="8" fill="#ff9a3c" />
      <circle cx="44" cy="28" r="4.5" fill="#ffe08a" />
      <path d="M44 20 Q50 24 48 30 Q52 26 50 20 Z" fill="#ff6a1a" />
    </>
  );
}

/** A descending shaft of holy light (성스러운 빛). */
function HolylightArt() {
  return (
    <>
      <path d="M26 8 L38 8 L34 40 L30 40 Z" fill="#fff2c0" opacity="0.5" />
      <path d="M28 8 L36 8 L33 40 L31 40 Z" fill="#fffbe8" opacity="0.8" />
      <circle cx="32" cy="44" r="6" fill="#ffe08a" />
      <path d="M32 36 L32 52 M24 44 L40 44" stroke={GOLD} strokeWidth="2" strokeLinecap="round" opacity="0.8" />
    </>
  );
}

/** A sweeping wall of flame (화염 폭풍). */
function FlamestrikeArt() {
  return (
    <>
      <path d="M12 50 Q16 32 20 44 Q24 26 28 44 Q32 28 36 44 Q40 26 44 44 Q48 32 52 50 Z" fill="#ff7a2a" stroke="#a8331f" strokeWidth="1" />
      <path d="M18 48 Q22 38 26 48 Q30 36 34 48 Q38 38 42 48 Z" fill="#ffe08a" opacity="0.9" />
    </>
  );
}

/** An upward blessing sigil (축복). */
function BlessArt() {
  return (
    <>
      <path d="M32 12 L32 44 M20 24 L32 12 L44 24" stroke="#ffe08a" strokeWidth="3.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="32" cy="48" r="4" fill="#fff2c0" />
      <circle cx="20" cy="20" r="1.6" fill="#ffe08a" />
      <circle cx="44" cy="20" r="1.6" fill="#ffe08a" />
    </>
  );
}

/** Bursting frost shards (서리 충격). */
function FrostshockArt() {
  return (
    <>
      <path d="M32 14 L32 50 M18 22 L46 42 M46 22 L18 42" stroke="#bfe9ff" strokeWidth="3" strokeLinecap="round" />
      <path d="M32 14 L29 19 L35 19 Z M32 50 L29 45 L35 45 Z" fill="#eafaff" />
      <circle cx="32" cy="32" r="3.4" fill="#eafaff" />
    </>
  );
}

/** A poised assassin's dagger (암살). */
function AssassinateArt() {
  return (
    <>
      <path d="M40 12 L46 18 L26 46 L22 42 Z" fill="#cfd8e6" stroke="#79839a" strokeWidth="1" />
      <path d="M40 12 L44 16 L26 44 L24 42 Z" fill="#eef2fa" />
      <rect x="18" y="42" width="10" height="4" rx="1" fill="#8a1f18" transform="rotate(45 23 44)" />
      <circle cx="18" cy="50" r="3" fill="#c4182c" opacity="0.8" />
    </>
  );
}

/** A rallying war horn (전투의 뿔피리). */
function WarhornArt() {
  return (
    <>
      <path d="M14 34 Q34 22 50 34 Q44 44 30 42 Q20 42 14 34 Z" fill="#d9b878" stroke="#8a6636" strokeWidth="1.4" />
      <path d="M48 30 Q54 30 54 36 Q50 36 48 38 Z" fill="#e8d8a8" />
      <path d="M22 40 Q28 46 40 46" stroke="#c8922f" strokeWidth="1.4" fill="none" />
      <path d="M50 26 L54 24 M52 30 L57 30 M50 34 L54 38" stroke={GOLD} strokeWidth="1.6" strokeLinecap="round" opacity="0.8" />
    </>
  );
}

/** An open tome of arcane insight (비전 지식). */
function InsightArt() {
  return (
    <>
      <path d="M14 24 Q24 20 32 24 L32 46 Q24 42 14 46 Z" fill="#e8e2d0" stroke="#b6ad92" strokeWidth="1.2" />
      <path d="M50 24 Q40 20 32 24 L32 46 Q40 42 50 46 Z" fill="#d9cfae" stroke="#b6ad92" strokeWidth="1.2" />
      <path d="M18 28 L28 28 M18 32 L28 32 M36 28 L46 28 M36 32 L46 32" stroke="#a89a72" strokeWidth="1" />
      <circle cx="32" cy="18" r="4" fill="#a45cff" opacity="0.85" />
      <path d="M32 12 L32 15 M28 16 L30 18 M36 16 L34 18" stroke="#c8a0ff" strokeWidth="1.2" strokeLinecap="round" />
    </>
  );
}

/** A surging mana crystal (마나샘). */
function ManasurgeArt() {
  return (
    <>
      <path d="M32 12 L42 30 L32 52 L22 30 Z" fill="#5aa0ff" stroke="#2a4a8a" strokeWidth="1.4" />
      <path d="M32 12 L37 30 L32 52 L32 12 Z" fill="#8ec4ff" opacity="0.8" />
      <path d="M32 12 L27 30 L32 52" stroke="#2a4a8a" strokeWidth="0.8" opacity="0.6" />
      <circle cx="18" cy="40" r="1.6" fill="#bfe0ff" />
      <circle cx="46" cy="22" r="1.6" fill="#bfe0ff" />
    </>
  );
}

const ART: Record<string, () => JSX.Element> = {
  sprite: Sprite,
  recruit: Recruit,
  guard: Guard,
  wolf: Wolf,
  squire: Squire,
  archer: Archer,
  knight: Knight,
  cleric: Cleric,
  shieldbearer: Shieldbearer,
  berserker: Berserker,
  venomspider: Venomspider,
  cavalier: Cavalier,
  paladin: Paladin,
  vampirelord: Vampirelord,
  bomber: Bomber,
  warlord: Warlord,
  golem: Golem,
  necromancer: Necromancer,
  dragon: Dragon,
  archangel: Archangel,
  strike: StrikeArt,
  firebolt: FireboltArt,
  holylight: HolylightArt,
  flamestrike: FlamestrikeArt,
  bless: BlessArt,
  frostshock: FrostshockArt,
  assassinate: AssassinateArt,
  warhorn: WarhornArt,
  insight: InsightArt,
  manasurge: ManasurgeArt,
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
  peek: Peek,
  shatter: Shatter,
  bind: Bind,
  gambit: Dice,
  sacrifice: Sacrifice,
  twinstrike: TwinStrike,
  firstaid: FirstAid,
  snipe: Snipe,
  judgment: Judgment,
  plunder: Plunder,
  dagger: Dagger,
  fireball: Fireball,
  frostbolt: Frostbolt,
  windfury: Windfury,
  bulwark: Bulwark,
  meditate: Meditate,
  holynova: HolyNova,
  execute: Execute,
  charge: Charge,
  fateswap: FateSwap,
  mindsiphon: MindSiphon,
  bloodwave: BloodWave,
  laststand: LastStand,
  gale: Gale,
  tempest: Tempest,
  backstab: Backstab,
};

/** Card id → element, so each illustration gets its element's illustrated backdrop. */
type Elem = 'physical' | 'fire' | 'holy' | 'lightning' | 'poison' | 'ice' | 'none';
const ELEMENT: Record<string, Elem> = {
  sword: 'physical', bow: 'physical', spear: 'physical', twinstrike: 'physical', snipe: 'physical',
  dagger: 'physical', windfury: 'physical', execute: 'physical', laststand: 'physical', thornmail: 'physical',
  bomb: 'fire', fireball: 'fire',
  potion: 'holy', greatheal: 'holy', shield: 'holy', sacrifice: 'holy', firstaid: 'holy',
  judgment: 'holy', bulwark: 'holy', holynova: 'holy', regenward: 'holy',
  reverse: 'lightning', bolt: 'lightning', charge: 'lightning', mindsiphon: 'lightning', tempest: 'lightning',
  drain: 'poison', shatter: 'poison', plunder: 'poison', bloodwave: 'poison', backstab: 'poison',
  venomdart: 'poison', plaguemist: 'poison',
  bind: 'ice', frostbolt: 'ice', gale: 'ice',
  peek: 'none', gambit: 'none', meditate: 'none', fateswap: 'none',
  // ── board-model minions ──
  recruit: 'physical', squire: 'physical', archer: 'physical', knight: 'physical',
  shieldbearer: 'physical', berserker: 'physical', cavalier: 'physical',
  warlord: 'physical', golem: 'physical', guard: 'physical', wolf: 'physical',
  cleric: 'holy', paladin: 'holy', archangel: 'holy',
  venomspider: 'poison', vampirelord: 'poison', necromancer: 'poison',
  bomber: 'fire', dragon: 'fire',
  sprite: 'none',
  // ── board-model spells ──
  strike: 'physical', assassinate: 'physical', warhorn: 'physical',
  firebolt: 'fire', flamestrike: 'fire',
  holylight: 'holy', bless: 'holy',
  frostshock: 'ice',
  insight: 'none', manasurge: 'lightning',
};

/** Per-element illustrated scene: a dusk sky, a backlit horizon light-source, and a ground plane —
 *  muted candlelit pigments (the horizon glow is atmospheric light, not neon chrome). */
interface Scene { sky1: string; sky2: string; horizon: string; g1: string; g2: string; haze: string }
const SCENE: Record<Elem, Scene> = {
  physical:  { sky1: '#23293a', sky2: '#3d3a3f', horizon: '#e0a866', g1: '#2a2118', g2: '#120d0a', haze: '#c99a63' },
  fire:      { sky1: '#2e1710', sky2: '#5a2414', horizon: '#ff9a3c', g1: '#301410', g2: '#140806', haze: '#ff8a42' },
  holy:      { sky1: '#2c2414', sky2: '#5a4720', horizon: '#ffe0a0', g1: '#2e2415', g2: '#150f09', haze: '#ffcf7a' },
  lightning: { sky1: '#1e1830', sky2: '#3a2c52', horizon: '#ecd05a', g1: '#231a2c', g2: '#0e0a16', haze: '#d8c060' },
  poison:    { sky1: '#1a2016', sky2: '#33401f', horizon: '#b6c85a', g1: '#1c2413', g2: '#0b0f07', haze: '#a6b34e' },
  ice:       { sky1: '#1a242c', sky2: '#324a54', horizon: '#cfeaf0', g1: '#1e2a30', g2: '#0a1014', haze: '#bfe2ea' },
  none:      { sky1: '#241d2c', sky2: '#443850', horizon: '#e0b878', g1: '#241b18', g2: '#120c0a', haze: '#d8b06a' },
};

export function CardArt({ id, size = 44 }: Props) {
  const Art = ART[id];
  if (!Art) return null;
  const dim = typeof size === 'number' ? `${size}px` : size;
  const el = ELEMENT[id] ?? 'none';
  const s = SCENE[el];
  // Scene gradients are keyed by element (not per-card): url() resolves to the first match in the
  // document, and every card of an element shares an identical palette, so this stays correct.
  return (
    <svg viewBox="0 0 64 64" aria-hidden style={{ display: 'block', width: dim, height: dim }}>
      <defs>
        {/* Yu-Gi-Oh illustrated window: a dusk sky, a glowing horizon that backlights the subject,
            and a ground plane — a painted diorama rather than a flat spotlight-on-void. */}
        <linearGradient id={`ca-sky-${el}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={s.sky1} />
          <stop offset="1" stopColor={s.sky2} />
        </linearGradient>
        <radialGradient id={`ca-horizon-${el}`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor={s.horizon} stopOpacity="0.7" />
          <stop offset="0.5" stopColor={s.horizon} stopOpacity="0.28" />
          <stop offset="1" stopColor={s.horizon} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`ca-ground-${el}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={s.g1} />
          <stop offset="1" stopColor={s.g2} />
        </linearGradient>
        {/* framing vignette to keep the illustration reading as a windowed scene */}
        <radialGradient id="ca-vig" cx="0.5" cy="0.44" r="0.72">
          <stop offset="0.58" stopColor="#04060a" stopOpacity="0" />
          <stop offset="1" stopColor="#03040a" stopOpacity="0.6" />
        </radialGradient>
        <radialGradient id="ca-floor" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#000" stopOpacity="0.62" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="ca-toplight" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.09" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        {/* stamp a chunky dark outline around the art, then cast a soft grounding shadow */}
        <filter id="ca-pop" x="-45%" y="-45%" width="190%" height="190%">
          <feMorphology in="SourceAlpha" operator="dilate" radius="1.5" result="thick" />
          <feFlood floodColor="#0a0812" floodOpacity="1" result="ink" />
          <feComposite in="ink" in2="thick" operator="in" result="outline" />
          <feMerge result="stamped">
            <feMergeNode in="outline" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
          <feDropShadow dx="0" dy="1.7" stdDeviation="1.4" floodColor="#000" floodOpacity="0.55" />
        </filter>
      </defs>
      {/* painted scene: sky, ground plane, and a backlit horizon glow at the seam */}
      <rect x="0" y="0" width="64" height="41" fill={`url(#ca-sky-${el})`} />
      <rect x="0" y="39" width="64" height="25" fill={`url(#ca-ground-${el})`} />
      <ellipse cx="32" cy="40" rx="36" ry="15" fill={`url(#ca-horizon-${el})`} />
      {/* thin luminous horizon line where sky meets ground */}
      <rect x="0" y="38.4" width="64" height="1.6" fill={s.haze} opacity="0.32" style={{ mixBlendMode: 'screen' }} />
      {/* framing vignette + grounding contact shadow so the subject sits in the scene */}
      <rect x="0" y="0" width="64" height="64" fill="url(#ca-vig)" />
      <ellipse cx="32" cy="56" rx="17" ry="4.2" fill="url(#ca-floor)" />
      {/* the illustration, stamped with a bold ink outline and a soft cast shadow */}
      <g filter="url(#ca-pop)"><Art /></g>
      {/* faint overhead light wash across the top half */}
      <rect x="0" y="0" width="64" height="28" fill="url(#ca-toplight)" style={{ mixBlendMode: 'screen' }} />
    </svg>
  );
}
