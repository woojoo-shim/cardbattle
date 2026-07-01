/** Hand-drawn SVG card illustrations — replaces emoji icons. Dark-fantasy neon style,
 * each tinted by its element. 64x64 viewBox; scale via `size`. */

interface Props {
  id: string;
  size?: number | string; // number → px; string → any CSS length (e.g. a clamp() for responsive cards)
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
      <Glow color="#38e8c8" o={0.45} />
      {/* aid kit body */}
      <rect x="12" y="22" width="40" height="30" rx="5" fill="#13312c" stroke="#38e8c8" strokeWidth="2" />
      <rect x="12" y="22" width="40" height="10" rx="5" fill="#0e2a28" opacity="0.6" />
      {/* handle */}
      <path d="M26 22 L26 18 Q26 16 28 16 L36 16 Q38 16 38 18 L38 22" fill="none" stroke="#38e8c8" strokeWidth="2" />
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
      <circle cx="32" cy="32" r="4" fill="#ff3b6b" />
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
      {/* inner spark */}
      <circle cx="28" cy="32" r="4" fill="#fff1a8" opacity="0.9" style={{ filter: 'blur(1px)' }} />
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
      <Glow color="#38e8c8" o={0.42} />
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
      <circle cx="32" cy="32" r="5" fill="#fffef0" opacity="0.95" style={{ filter: 'blur(1px)' }} />
    </>
  );
}

function Execute() {
  return (
    <>
      <Glow color="#ff3b6b" o={0.5} />
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
      {/* rising energy motes */}
      <circle cx="32" cy="32" r="4" fill="#eaf4ff" opacity="0.9" style={{ filter: 'blur(1px)' }} />
      <circle cx="26" cy="14" r="1.6" fill="#bfe0ff" opacity="0.8" />
      <circle cx="40" cy="18" r="1.4" fill="#bfe0ff" opacity="0.7" />
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
};

export function CardArt({ id, size = 44 }: Props) {
  const Art = ART[id];
  if (!Art) return null;
  const dim = typeof size === 'number' ? `${size}px` : size;
  return (
    <svg viewBox="0 0 64 64" aria-hidden style={{ display: 'block', width: dim, height: dim }}>
      <Art />
    </svg>
  );
}
