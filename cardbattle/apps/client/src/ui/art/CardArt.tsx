/** Hand-drawn SVG card illustrations — replaces emoji icons. Godfield-bold subjects read
 * inside a Yu-Gi-Oh-style illustrated scene window: each card's element paints an
 * atmospheric backdrop (sky + backlit horizon + ground plane) behind the item, and the
 * subject is stamped with a chunky ink outline so it pops off the diorama.
 * 64x64 viewBox; scale via `size`. */

import { useState } from 'react';

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
      <path d="M32 5 L38 15 L37 40 L32 47 L27 40 L26 15 Z" fill={STEEL} stroke="#1a1f2e" strokeWidth="1.4" />
      <path d="M32 5 L32 47 L27 40 L26 15 Z" fill={STEEL_D} opacity="0.55" />
      {/* fuller groove + edge sheen */}
      <path d="M32 8 L32 43" stroke="#ff90b3" strokeWidth="1.2" opacity="0.85" />
      <path d="M35 15 L34.4 38" stroke="#fbfdff" strokeWidth="1" opacity="0.8" strokeLinecap="round" />
      {/* crossguard */}
      <path d="M18 44 L46 44 Q49 44 49 46.5 Q49 49 46 49 L18 49 Q15 49 15 46.5 Q15 44 18 44 Z" fill="#c9962f" stroke="#3a2a0e" strokeWidth="1.2" />
      <path d="M18 44.6 L46 44.6" stroke="#f4d886" strokeWidth="1" opacity="0.8" />
      {/* grip wrap */}
      <rect x="29.5" y="49" width="5" height="9" rx="1" fill={WOOD} stroke="#2a1808" strokeWidth="1" />
      {[51, 53.5, 56].map((y, i) => (
        <line key={i} x1="29.5" y1={y} x2="34.5" y2={y - 1.3} stroke={WOOD_D} strokeWidth="1" />
      ))}
      {/* pommel */}
      <circle cx="32" cy="59.5" r="3.6" fill="#c9962f" stroke="#3a2a0e" strokeWidth="1.2" />
      <circle cx="30.8" cy="58.3" r="1.1" fill="#f4d886" opacity="0.9" />
    </>
  );
}

function Bow() {
  return (
    <>
      <Glow color="#ff5c8a" o={0.3} />
      {/* bow limb */}
      <path d="M20 7 Q46 32 20 57" fill="none" stroke="#2a1808" strokeWidth="6.4" strokeLinecap="round" />
      <path d="M20 7 Q46 32 20 57" fill="none" stroke={WOOD} strokeWidth="4.6" strokeLinecap="round" />
      <path d="M21 10 Q43 32 21 54" fill="none" stroke="#c08a52" strokeWidth="1.3" strokeLinecap="round" opacity="0.8" />
      {/* nocks */}
      <circle cx="20" cy="7" r="2" fill="#5c3a1f" stroke="#2a1808" strokeWidth="0.8" />
      <circle cx="20" cy="57" r="2" fill="#5c3a1f" stroke="#2a1808" strokeWidth="0.8" />
      {/* string drawn back */}
      <path d="M20 7 L27 32 L20 57" fill="none" stroke="#eef2fb" strokeWidth="1.2" opacity="0.9" />
      {/* arrow */}
      <line x1="12" y1="32" x2="54" y2="32" stroke="#8a5a32" strokeWidth="2.4" />
      <line x1="12" y1="31.2" x2="54" y2="31.2" stroke="#c08a52" strokeWidth="0.8" opacity="0.7" />
      <path d="M54 32 L46 27.5 L48 32 L46 36.5 Z" fill="#dfe5f2" stroke="#1a1f2e" strokeWidth="0.9" />
      {/* fletching */}
      <path d="M14 32 L10 28 L15 30 Z" fill="#ff7aa0" stroke="#ffd0db" strokeWidth="0.7" />
      <path d="M14 32 L10 36 L15 34 Z" fill="#ff5c8a" stroke="#ffd0db" strokeWidth="0.7" />
    </>
  );
}

function Spear() {
  return (
    <>
      <Glow color="#b388ff" o={0.32} />
      {/* shaft */}
      <rect x="30" y="22" width="4.4" height="40" rx="2" fill={WOOD} stroke="#2a1808" strokeWidth="1" />
      <line x1="31" y1="24" x2="31" y2="60" stroke="#c08a52" strokeWidth="0.9" opacity="0.7" />
      {/* head */}
      <path d="M32 3 L40 20 L32 27 L24 20 Z" fill={STEEL} stroke="#1a1f2e" strokeWidth="1.3" />
      <path d="M32 3 L32 27 L24 20 Z" fill={STEEL_D} opacity="0.55" />
      <path d="M32 6 L32 24" stroke="#c9aaff" strokeWidth="1.1" opacity="0.9" />
      <path d="M35 18 L34 24" stroke="#f4f0ff" strokeWidth="0.9" opacity="0.75" strokeLinecap="round" />
      {/* side prongs */}
      <path d="M24 20 L18 14 L22 21 Z" fill="#b8c0d4" stroke="#1a1f2e" strokeWidth="0.9" />
      <path d="M40 20 L46 14 L42 21 Z" fill="#b8c0d4" stroke="#1a1f2e" strokeWidth="0.9" />
      {/* binding */}
      <rect x="28.6" y="24" width="6.8" height="3.4" rx="1" fill="#e7c272" stroke="#8a5e1c" strokeWidth="0.8" />
    </>
  );
}

function Bomb() {
  return (
    <>
      <Glow color="#ff7a3c" o={0.5} />
      {/* body */}
      <circle cx="30" cy="40" r="18.5" fill="#12141c" stroke="#000" strokeWidth="1.6" />
      <circle cx="30" cy="40" r="18.5" fill="url(#bomb-sphere)" />
      <defs>
        <radialGradient id="bomb-sphere" cx="0.36" cy="0.32" r="0.72">
          <stop offset="0" stopColor="#4a5266" />
          <stop offset="0.55" stopColor="#22252f" stopOpacity="0.5" />
          <stop offset="1" stopColor="#0a0b10" stopOpacity="0.9" />
        </radialGradient>
      </defs>
      <circle cx="23.5" cy="33.5" r="4.5" fill="#6a728a" opacity="0.55" />
      {/* neck */}
      <rect x="26" y="17" width="8" height="9" rx="1.5" fill="#2a2f3e" stroke="#000" strokeWidth="1.1" />
      <rect x="27" y="18" width="6" height="2" rx="1" fill="#565e74" opacity="0.7" />
      {/* fuse */}
      <path d="M30 18 Q39 9 45 13" fill="none" stroke="#4a3418" strokeWidth="3.4" strokeLinecap="round" />
      <path d="M30 18 Q39 9 45 13" fill="none" stroke="#a07b4a" strokeWidth="2" strokeLinecap="round" />
      {/* spark — crisp ember disc + hard four-point flare */}
      <circle cx="46" cy="12" r="5" fill="#ff7a1a" opacity="0.3" />
      <circle cx="46" cy="12" r="3.4" fill="#ffce5a" stroke="#7a3a12" strokeWidth="0.7" />
      <path d="M46 5 L47 11 L53 12 L47 13 L46 19 L45 13 L39 12 L45 11 Z" fill="#fff1a8" />
      <circle cx="46" cy="12" r="1.3" fill="#fff" />
    </>
  );
}

function Potion() {
  return (
    <>
      <Glow color="#79b0a2" o={0.45} />
      {/* glass body */}
      <path d="M24 28 L24 24 L40 24 L40 28 L46 50 Q46 58 32 58 Q18 58 18 50 Z" fill="#0e2a28" stroke="#0a1a18" strokeWidth="1.6" />
      {/* liquid + surface */}
      <path d="M20.5 43 Q32 39 43.5 43 L46 50 Q46 58 32 58 Q18 58 18 50 Z" fill="#79b0a2" opacity="0.9" />
      <path d="M20.5 47 Q32 44 43.5 47 L46 52 Q45 58 32 58 Q19 58 18 52 Z" fill="#4f8a7e" opacity="0.6" />
      <path d="M20.5 43 Q32 40 43.5 43" stroke="#d6fff7" strokeWidth="1.2" opacity="0.85" fill="none" />
      {/* bubbles */}
      <circle cx="29" cy="50" r="2" fill="#eafffb" opacity="0.85" />
      <circle cx="36" cy="52" r="1.4" fill="#eafffb" opacity="0.75" />
      <circle cx="32" cy="54" r="1" fill="#eafffb" opacity="0.65" />
      {/* glass highlight */}
      <path d="M22 30 Q20 44 25 54" fill="none" stroke="#cff2ea" strokeWidth="1.6" opacity="0.35" strokeLinecap="round" />
      {/* neck + cork */}
      <rect x="26" y="16" width="12" height="9" rx="2" fill="#15312f" stroke="#0a1a18" strokeWidth="1.4" />
      <rect x="27" y="10" width="10" height="7" rx="2" fill="#9a6a3a" stroke="#5c3a1f" strokeWidth="1.1" />
      <rect x="28" y="11" width="8" height="2" rx="1" fill="#c08f54" opacity="0.7" />
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
        fill="#ffd86a" stroke="#7a5410" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M36 14 L36 28 L50 28 L50 36 L36 36 L36 50 L28 50 Z" fill="#c98d22" opacity="0.5" />
      <path d="M30 16 L34 16 L34 30 L48 30" fill="none" stroke="#fff6d8" strokeWidth="1.3" opacity="0.85" strokeLinecap="round" />
    </>
  );
}

function Reverse() {
  return (
    <>
      <Glow color="#8b6cff" o={0.42} />
      {/* two curved arrows forming a rotation ring */}
      <path d="M16 32 A16 16 0 0 1 44 21" fill="none" stroke="#4a2c7e" strokeWidth="6" strokeLinecap="round" />
      <path d="M48 32 A16 16 0 0 1 20 43" fill="none" stroke="#4a2c7e" strokeWidth="6" strokeLinecap="round" />
      <path d="M16 32 A16 16 0 0 1 44 21" fill="none" stroke="#c9a0ff" strokeWidth="3.6" strokeLinecap="round" />
      <path d="M48 32 A16 16 0 0 1 20 43" fill="none" stroke="#c9a0ff" strokeWidth="3.6" strokeLinecap="round" />
      {/* arrowheads */}
      <path d="M45 22 L37 18 L46 13 Z" fill="#e2d0ff" stroke="#4a2c7e" strokeWidth="1" strokeLinejoin="round" />
      <path d="M19 42 L27 46 L18 51 Z" fill="#e2d0ff" stroke="#4a2c7e" strokeWidth="1" strokeLinejoin="round" />
      {/* core hub — crisp inked pip */}
      <circle cx="32" cy="32" r="3.6" fill="#efe6ff" stroke="#3a2c5e" strokeWidth="1" />
      <circle cx="30.9" cy="30.9" r="1.1" fill="#fff" />
    </>
  );
}

function Shield() {
  return (
    <>
      <Glow color="#7fb6ff" o={0.42} />
      {/* shield body */}
      <path d="M32 7 L53 15 L53 34 Q53 51 32 59 Q11 51 11 34 L11 15 Z"
        fill="#16243a" stroke="#0a1220" strokeWidth="2" />
      <path d="M32 7 L53 15 L53 34 Q53 51 32 59 Z" fill="#0e1726" opacity="0.55" />
      {/* inner rim */}
      <path d="M32 12 L48 18 L48 33 Q48 47 32 53 Q16 47 16 33 L16 18 Z" fill="none" stroke="#3a5680" strokeWidth="1.2" />
      {/* rivets */}
      {[[18, 19], [46, 19], [18, 33], [46, 33]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="1.5" fill="#7fb6ff" opacity="0.7" />
      ))}
      {/* center boss */}
      <circle cx="32" cy="31" r="8.5" fill="#2a4870" stroke="#0a1220" strokeWidth="1.4" />
      <circle cx="32" cy="31" r="8.5" fill="none" stroke="#cfe2ff" strokeWidth="1" opacity="0.7" />
      <circle cx="29.5" cy="28.5" r="2.4" fill="#9ec6ff" opacity="0.6" />
      {/* sheen */}
      <path d="M22 15 L31 12 L31 51 Q22 45 22 34 Z" fill="#9ec6ff" opacity="0.16" />
    </>
  );
}

function Drain() {
  return (
    <>
      <Glow color="#9be85a" o={0.4} />
      {/* dripping blade */}
      <path d="M32 5 L37 15 L36 38 L32 45 L28 38 L27 15 Z" fill={STEEL} stroke="#1a1f2e" strokeWidth="1.3" />
      <path d="M32 5 L32 45 L28 38 L27 15 Z" fill={STEEL_D} opacity="0.55" />
      <path d="M32 8 L32 42" stroke="#b6f08a" strokeWidth="1.1" opacity="0.85" />
      <path d="M34.5 15 L33.8 37" stroke="#eafff0" strokeWidth="0.9" opacity="0.7" strokeLinecap="round" />
      {/* guard + grip */}
      <path d="M21 42 L43 42 Q46 42 46 44 Q46 46 43 46 L21 46 Q18 46 18 44 Q18 42 21 42 Z" fill="#6a8a3c" stroke="#2a3a14" strokeWidth="1.1" />
      <rect x="29.6" y="46" width="4.8" height="9" rx="1" fill={WOOD} stroke="#2a1808" strokeWidth="1" />
      {/* poison sheen dripping */}
      <path d="M32 45 Q30 51 32 55 Q34 51 32 45 Z" fill="#9be85a" opacity="0.9" />
      {/* blood drops */}
      <path d="M28 49 Q26 54 28 56 Q30 54 28 49 Z" fill="#c0264a" />
      <circle cx="38" cy="52" r="2.2" fill="#c0264a" />
    </>
  );
}

function Bolt() {
  return (
    <>
      <Glow color="#ffd84a" o={0.5} />
      {/* bolt glow aura */}
      <path d="M36 6 L20 34 L30 34 L26 58 L46 26 L34 26 Z" fill="none" stroke="#ffb43a" strokeWidth="5" strokeLinejoin="round" opacity="0.4" />
      {/* lightning bolt */}
      <path d="M36 6 L20 34 L30 34 L26 58 L46 26 L34 26 Z"
        fill="#ffe46a" stroke="#8a6410" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M36 6 L20 34 L30 34 L27 52 Z" fill="#fff6c4" opacity="0.55" />
      <path d="M34 12 L26 30" stroke="#fffbe0" strokeWidth="1.2" opacity="0.8" strokeLinecap="round" />
      {/* sparks */}
      <circle cx="45" cy="13" r="2" fill="#fff1a8" opacity="0.9" />
      <circle cx="17" cy="47" r="1.6" fill="#fff1a8" opacity="0.8" />
      <circle cx="49" cy="30" r="1.3" fill="#fff1a8" opacity="0.7" />
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
      <path d="M20 34 Q32 24 44 34 Q32 44 20 34 Z" fill="#06121c" stroke="#bfeaff" strokeWidth="1.4" />
      <circle cx="32" cy="34" r="5.2" fill="#3fb6ff" stroke="#0a2438" strokeWidth="0.8" />
      <circle cx="32" cy="34" r="2.4" fill="#04121e" />
      <circle cx="30" cy="32" r="1.3" fill="#eaffff" />
      {/* orb highlight streak */}
      <path d="M24 26 Q20 30 21 36" fill="none" stroke="#eaffff" strokeWidth="1.6" opacity="0.4" strokeLinecap="round" />
      {/* stand */}
      <path d="M22 52 L42 52 L38 57 L26 57 Z" fill="#1c3550" stroke="#0a1622" strokeWidth="1.1" />
      <path d="M25 53 L39 53" stroke="#5a86ab" strokeWidth="0.9" opacity="0.7" />
    </>
  );
}

function Shatter() {
  return (
    <>
      <Glow color="#9be85a" o={0.4} />
      {/* a card breaking apart */}
      <g transform="rotate(-10 32 32)">
        <path d="M17 13 L34 13 L31 51 L14 51 Z" fill="#16202c" stroke="#0e1620" strokeWidth="1.6" />
        <path d="M17 13 L34 13 L31 51 Z" fill="#0e1620" opacity="0.45" />
        <path d="M20 18 L28 18" stroke="#3a5a2c" strokeWidth="1" opacity="0.6" />
      </g>
      <g transform="rotate(16 38 34)">
        <path d="M34 17 L51 15 L50 51 L33 53 Z" fill="#1a2530" stroke="#0e1620" strokeWidth="1.6" />
        <path d="M40 40 L47 40" stroke="#3a5a2c" strokeWidth="1" opacity="0.6" />
      </g>
      {/* crack */}
      <path d="M33 10 L28 26 L37 30 L30 44 L35 56" fill="none" stroke="#0e1620" strokeWidth="3.4" strokeLinejoin="round" />
      <path d="M33 10 L28 26 L37 30 L30 44 L35 56" fill="none" stroke="#bdf08a" strokeWidth="1.8" strokeLinejoin="round" />
      {/* shards */}
      <path d="M21 7 L26 12 L20 14 Z" fill="#bdf08a" opacity="0.9" />
      <path d="M48 9 L53 14 L46 15 Z" fill="#bdf08a" opacity="0.75" />
      <path d="M45 55 L49 58 L42 59 Z" fill="#bdf08a" opacity="0.75" />
    </>
  );
}

function Bind() {
  return (
    <>
      <Glow color="#7fd6ff" o={0.4} />
      {/* frozen shackle ring with a hanging chain — locks a turn in ice */}
      <circle cx="32" cy="22" r="11.5" fill="none" stroke="#0a2438" strokeWidth="5.4" />
      <circle cx="32" cy="22" r="11.5" fill="none" stroke="#bfeaff" strokeWidth="3.4" />
      <circle cx="32" cy="22" r="11.5" fill="none" stroke="#eaffff" strokeWidth="1" opacity="0.6" strokeDasharray="4 8" />
      {/* keyhole on the cuff */}
      <circle cx="32" cy="20" r="2.8" fill="#0a2438" />
      <rect x="30.9" y="21" width="2.2" height="5.5" fill="#0a2438" />
      {/* chain links dangling below */}
      {[34, 44, 54].map((cy, i) => (
        <ellipse key={i} cx={i % 2 ? 28 : 32} cy={cy} rx="4.8" ry="6.2" fill="none" stroke="#0a2438" strokeWidth="4" />
      ))}
      {[34, 44, 54].map((cy, i) => (
        <ellipse key={`h${i}`} cx={i % 2 ? 28 : 32} cy={cy} rx="4.8" ry="6.2" fill="none" stroke="#9bd8f5" strokeWidth="2.2" />
      ))}
      {/* frost shards */}
      <path d="M13 13 L18 18 L12 19 Z" fill="#d6f4ff" opacity="0.9" />
      <path d="M51 15 L55 20 L48 21 Z" fill="#d6f4ff" opacity="0.75" />
    </>
  );
}

function Dice() {
  return (
    <>
      <Glow color="#ffd84a" o={0.5} />
      {/* a single die tilted, glowing gold — fate of the gamble */}
      <g transform="rotate(-12 32 34)">
        <rect x="17" y="19" width="30" height="30" rx="6" fill="#1c2233" stroke="#8a6410" strokeWidth="2.2" />
        <rect x="17" y="19" width="30" height="30" rx="6" fill="url(#dice-sheen)" opacity="0.45" />
        <path d="M20 22 L44 22" stroke="#ffe89a" strokeWidth="1.2" opacity="0.5" strokeLinecap="round" />
        {/* pips: five */}
        {[[25, 27], [39, 27], [32, 34], [25, 41], [39, 41]].map(([x, y], i) => (
          <g key={i}>
            <circle cx={x} cy={y} r="2.6" fill="#8a6410" />
            <circle cx={x} cy={y} r="2.2" fill="#fff1a8" />
          </g>
        ))}
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
      <rect x="15" y="44" width="34" height="8" rx="2" fill="#2a1f1a" stroke="#160f0c" strokeWidth="1.4" />
      <rect x="16" y="45" width="32" height="2" rx="1" fill="#7a4a2a" opacity="0.6" />
      <rect x="19" y="52" width="26" height="6" rx="1.5" fill="#1a1310" stroke="#160f0c" strokeWidth="1" />
      {/* flame glow */}
      <ellipse cx="32" cy="30" rx="12" ry="20" fill="#ff7a1a" opacity="0.22" />
      {/* rising flame of offering */}
      <path d="M32 7 Q43 22 36 34 Q45 30 40 43 Q38 48 32 48 Q26 48 24 43 Q19 30 28 34 Q21 22 32 7 Z"
        fill="#ff8a3c" stroke="#c04e14" strokeWidth="1.3" />
      <path d="M32 17 Q38 28 33 38 Q31 44 32 46 Q26 44 28 36 Q25 28 32 17 Z" fill="#ffe08a" opacity="0.95" />
      <path d="M32 24 Q34 32 32 42 Q30 34 32 24 Z" fill="#fffbe0" opacity="0.8" />
      {/* embers */}
      <circle cx="43" cy="19" r="1.8" fill="#ffd07a" opacity="0.9" />
      <circle cx="21" cy="25" r="1.4" fill="#ffb45a" opacity="0.8" />
      <circle cx="38" cy="13" r="1.2" fill="#ffe08a" opacity="0.7" />
    </>
  );
}

function TwinStrike() {
  return (
    <>
      <Glow color="#ff5c8a" o={0.36} />
      {/* two crossed blades */}
      <g transform="rotate(20 32 32)">
        <path d="M32 7 L35.5 16 L34.5 40 L32 46 L29.5 40 L28.5 16 Z" fill={STEEL} stroke="#1a1f2e" strokeWidth="1.2" />
        <path d="M32 10 L31.5 42" stroke="#eef2ff" strokeWidth="0.8" opacity="0.6" />
        <rect x="22" y="43" width="20" height="4.2" rx="2" fill="#b98a3c" stroke="#3a2a0e" strokeWidth="1" />
        <rect x="29.6" y="47" width="4.8" height="8" rx="1" fill={WOOD} stroke="#2a1808" strokeWidth="0.9" />
      </g>
      <g transform="rotate(-20 32 32)">
        <path d="M32 7 L35.5 16 L34.5 40 L32 46 L29.5 40 L28.5 16 Z" fill={STEEL} stroke="#1a1f2e" strokeWidth="1.2" />
        <path d="M32 7 L32 46 L29.5 40 L28.5 16 Z" fill={STEEL_D} opacity="0.55" />
        <rect x="22" y="43" width="20" height="4.2" rx="2" fill="#b98a3c" stroke="#3a2a0e" strokeWidth="1" />
        <rect x="29.6" y="47" width="4.8" height="8" rx="1" fill={WOOD} stroke="#2a1808" strokeWidth="0.9" />
      </g>
      {/* clash spark at the cross point */}
      <path d="M32 24 L34.5 30 L40 32 L34.5 34 L33 40 L31 34 L25 32 L30.5 30 Z" fill="#fff" opacity="0.5" />
      <path d="M32 27 L33.5 31 L37 32 L33.5 33 L32.5 37 L31 33 L27 32 L31 31 Z" fill="#ffd0db" opacity="0.95" />
    </>
  );
}

function FirstAid() {
  return (
    <>
      <Glow color="#79b0a2" o={0.45} />
      {/* aid kit body */}
      <rect x="11" y="22" width="42" height="31" rx="5" fill="#13312c" stroke="#08201c" strokeWidth="2" />
      <rect x="11" y="22" width="42" height="9" rx="5" fill="#1c4a42" opacity="0.7" />
      <line x1="11" y1="31" x2="53" y2="31" stroke="#08201c" strokeWidth="1" />
      {/* clasp */}
      <rect x="29" y="29" width="6" height="4" rx="1" fill="#0e2a28" stroke="#79b0a2" strokeWidth="0.8" />
      {/* handle */}
      <path d="M25 22 L25 18 Q25 15 28 15 L36 15 Q39 15 39 18 L39 22" fill="none" stroke="#0e2a28" strokeWidth="3.4" />
      <path d="M25 22 L25 18 Q25 15 28 15 L36 15 Q39 15 39 18 L39 22" fill="none" stroke="#79b0a2" strokeWidth="1.8" />
      {/* green cross */}
      <path d="M29 35 L35 35 L35 41 L41 41 L41 47 L35 47 L35 53 L29 53 L29 47 L23 47 L23 41 L29 41 Z"
        fill="#7af0d3" stroke="#1c5a4c" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M31 37 L33 37 L33 43 L39 43" fill="none" stroke="#d6fff7" strokeWidth="1" opacity="0.8" strokeLinecap="round" />
    </>
  );
}

function Snipe() {
  return (
    <>
      <Glow color="#ff5c8a" o={0.42} />
      {/* scope ring */}
      <circle cx="32" cy="32" r="20.5" fill="#0d1622" stroke="#0a0f18" strokeWidth="2" />
      <circle cx="32" cy="32" r="20.5" fill="none" stroke="#ff7aa0" strokeWidth="2.4" />
      <circle cx="32" cy="32" r="16" fill="none" stroke="#5a2436" strokeWidth="1" />
      {/* tick marks */}
      {Array.from({ length: 12 }).map((_, i) => {
        const a = (i * Math.PI) / 6;
        return (
          <line key={i} x1={32 + 17.5 * Math.cos(a)} y1={32 + 17.5 * Math.sin(a)}
            x2={32 + 20 * Math.cos(a)} y2={32 + 20 * Math.sin(a)} stroke="#ff9ab4" strokeWidth="1" opacity="0.6" />
        );
      })}
      {/* crosshair */}
      <line x1="32" y1="11" x2="32" y2="26" stroke="#ffd0db" strokeWidth="1.8" />
      <line x1="32" y1="38" x2="32" y2="53" stroke="#ffd0db" strokeWidth="1.8" />
      <line x1="11" y1="32" x2="26" y2="32" stroke="#ffd0db" strokeWidth="1.8" />
      <line x1="38" y1="32" x2="53" y2="32" stroke="#ffd0db" strokeWidth="1.8" />
      {/* locked-on dot */}
      <circle cx="32" cy="32" r="4.4" fill="#c2543a" stroke="#ffd0db" strokeWidth="0.8" />
      <circle cx="30.8" cy="30.8" r="1.4" fill="#fff" opacity="0.9" />
    </>
  );
}

function Judgment() {
  return (
    <>
      <Glow color="#f4c44a" o={0.5} />
      {/* central column */}
      <rect x="30" y="12" width="4" height="40" rx="1.5" fill="#e7c272" stroke="#8a5e1c" strokeWidth="1" />
      <line x1="31" y1="14" x2="31" y2="50" stroke="#fff3c8" strokeWidth="0.8" opacity="0.6" />
      <circle cx="32" cy="10" r="3.4" fill="#ffe9a8" stroke="#8a5e1c" strokeWidth="1" />
      <circle cx="31" cy="9" r="1" fill="#fff" opacity="0.8" />
      {/* beam */}
      <rect x="11" y="16" width="42" height="3" rx="1.5" fill="#e7c272" stroke="#8a5e1c" strokeWidth="0.7" />
      {/* hanging chains + pans (scales of judgment) */}
      <line x1="16" y1="18" x2="16" y2="30" stroke="#cdbb88" strokeWidth="1.2" />
      <line x1="48" y1="18" x2="48" y2="30" stroke="#cdbb88" strokeWidth="1.2" />
      <path d="M8 30 Q16 43 24 30 Z" fill="#2a2418" stroke="#ffd86a" strokeWidth="1.5" />
      <path d="M40 30 Q48 43 56 30 Z" fill="#2a2418" stroke="#ffd86a" strokeWidth="1.5" />
      <path d="M10 31 Q16 39 22 31" fill="none" stroke="#8a6a20" strokeWidth="0.9" opacity="0.6" />
      <path d="M42 31 Q48 39 54 31" fill="none" stroke="#8a6a20" strokeWidth="0.9" opacity="0.6" />
      {/* base */}
      <path d="M23 52 L41 52 L45 58 L19 58 Z" fill="#1c1810" stroke="#8a5e1c" strokeWidth="1.1" />
      <path d="M25 53 L39 53" stroke="#c08f54" strokeWidth="0.9" opacity="0.6" />
    </>
  );
}

function Plunder() {
  return (
    <>
      <Glow color="#9be85a" o={0.4} />
      {/* a card being yanked away, trailing motion lines */}
      <g transform="rotate(-14 30 30)">
        <rect x="13" y="9" width="24" height="32" rx="3" fill="#16202c" stroke="#0e1620" strokeWidth="1.8" />
        <rect x="13" y="9" width="24" height="32" rx="3" fill="#0e1620" opacity="0.4" />
        <path d="M25 15 L28.5 22 L36 23 L30.5 28 L32 35 L25 31 L18 35 L19.5 28 L14 23 L21.5 22 Z" fill="#bdf08a" opacity="0.9" />
      </g>
      {/* motion streaks */}
      <path d="M40 12 L51 10" stroke="#bdf08a" strokeWidth="2.2" strokeLinecap="round" opacity="0.65" />
      <path d="M42 18 L53 17" stroke="#bdf08a" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
      <path d="M43 24 L52 24" stroke="#bdf08a" strokeWidth="1.6" strokeLinecap="round" opacity="0.35" />
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
      <path d="M32 7 L35.5 16 L34.5 36 L32 43 L29.5 36 L28.5 16 Z" fill={STEEL} stroke="#1a1f2e" strokeWidth="1.3" />
      <path d="M32 7 L32 43 L29.5 36 L28.5 16 Z" fill={STEEL_D} opacity="0.55" />
      <path d="M32 10 L32 40" stroke="#ff90b3" strokeWidth="1.1" opacity="0.85" />
      <path d="M34 16 L33.4 34" stroke="#fbfdff" strokeWidth="0.8" opacity="0.7" strokeLinecap="round" />
      {/* guard */}
      <path d="M23 41 L41 41 Q44 41 44 43 Q44 45.5 41 45.5 L23 45.5 Q20 45.5 20 43 Q20 41 23 41 Z" fill="#c9962f" stroke="#3a2a0e" strokeWidth="1" />
      {/* grip + pommel */}
      <rect x="29.6" y="45.5" width="4.8" height="10" rx="1" fill={WOOD} stroke="#2a1808" strokeWidth="0.9" />
      <circle cx="32" cy="56.5" r="3.2" fill="#c9962f" stroke="#3a2a0e" strokeWidth="1" />
      <circle cx="30.9" cy="55.4" r="1" fill="#f4d886" opacity="0.9" />
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
      <path d="M32 20 Q23 7 19 3 Q26 14 21 16 Q30 12 32 20 Z" fill="#ff8a3c" stroke="#c04e14" strokeWidth="0.8" opacity="0.95" />
      <path d="M40 24 Q49 13 53 9 Q46 20 51 22 Q42 20 40 24 Z" fill="#ffb45a" stroke="#c04e14" strokeWidth="0.7" opacity="0.85" />
      <path d="M20 30 Q10 26 6 22 Q16 28 14 32 Q18 28 20 30 Z" fill="#ff9a4a" opacity="0.7" />
      {/* inner hotspot — crisp molten catch-light */}
      <circle cx="28" cy="32" r="4" fill="#fff1a8" />
      <circle cx="26.9" cy="30.9" r="1.4" fill="#fff" />
    </>
  );
}

function Frostbolt() {
  return (
    <>
      <Glow color="#7fd6ff" o={0.45} />
      {/* icy arrow shaft */}
      <line x1="11" y1="53" x2="49" y2="15" stroke="#3fb6ff" strokeWidth="4.4" strokeLinecap="round" opacity="0.5" />
      <line x1="11" y1="53" x2="49" y2="15" stroke="#bfeaff" strokeWidth="3" strokeLinecap="round" />
      <line x1="13" y1="51" x2="47" y2="17" stroke="#eaffff" strokeWidth="1" opacity="0.85" />
      {/* crystalline head */}
      <path d="M49 15 L40 17 L46 24 Z" fill="#d6f4ff" stroke="#3fb6ff" strokeWidth="1.1" />
      <path d="M53 11 L44 14 L49 20 L55 17 Z" fill="#eaffff" stroke="#3fb6ff" strokeWidth="0.9" />
      {/* frost shards flaking off */}
      <path d="M22 26 L27 30 L21 31 Z" fill="#d6f4ff" opacity="0.9" />
      <path d="M31 36 L36 40 L30 41 Z" fill="#d6f4ff" opacity="0.75" />
      {/* fletching */}
      <path d="M11 53 L18 50 L16 44 Z" fill="#7fd6ff" stroke="#3fb6ff" strokeWidth="0.7" opacity="0.85" />
      <path d="M11 53 L14 46 L21 49 Z" fill="#7fd6ff" stroke="#3fb6ff" strokeWidth="0.7" opacity="0.75" />
    </>
  );
}

function Windfury() {
  return (
    <>
      <Glow color="#7af0d3" o={0.4} />
      {/* three swift slash arcs */}
      <path d="M14 18 Q40 22 50 46" fill="none" stroke="#1c6f5e" strokeWidth="5" strokeLinecap="round" opacity="0.4" />
      <path d="M12 30 Q38 34 48 56" fill="none" stroke="#1c6f5e" strokeWidth="5" strokeLinecap="round" opacity="0.4" />
      <path d="M14 18 Q40 22 50 46" fill="none" stroke="#d6fff7" strokeWidth="3.2" strokeLinecap="round" opacity="0.95" />
      <path d="M12 30 Q38 34 48 56" fill="none" stroke="#7af0d3" strokeWidth="3.2" strokeLinecap="round" opacity="0.85" />
      <path d="M18 10 Q46 12 56 34" fill="none" stroke="#bff6ec" strokeWidth="2.8" strokeLinecap="round" opacity="0.75" />
      {/* speed sparks at the tips */}
      <circle cx="50" cy="46" r="2.2" fill="#eafffb" opacity="0.95" />
      <circle cx="48" cy="56" r="1.6" fill="#eafffb" opacity="0.8" />
      <circle cx="56" cy="34" r="1.6" fill="#eafffb" opacity="0.75" />
    </>
  );
}

function Bulwark() {
  return (
    <>
      <Glow color="#7fb6ff" o={0.4} />
      {/* fortress wall of stone blocks */}
      <rect x="11" y="20" width="42" height="35" rx="3" fill="#1a2536" stroke="#0a1220" strokeWidth="2" />
      {/* battlement crenellations */}
      <rect x="11" y="13" width="8.5" height="9" fill="#22314a" stroke="#0a1220" strokeWidth="1.3" />
      <rect x="27.5" y="13" width="8.5" height="9" fill="#22314a" stroke="#0a1220" strokeWidth="1.3" />
      <rect x="44" y="13" width="8.5" height="9" fill="#22314a" stroke="#0a1220" strokeWidth="1.3" />
      {/* brick seams */}
      <g stroke="#0a1220" strokeWidth="1.3">
        <line x1="11" y1="32" x2="53" y2="32" />
        <line x1="11" y1="43" x2="53" y2="43" />
        <line x1="26" y1="20" x2="26" y2="32" />
        <line x1="38" y1="32" x2="38" y2="43" />
        <line x1="22" y1="43" x2="22" y2="55" />
        <line x1="42" y1="43" x2="42" y2="55" />
      </g>
      {/* highlight seams */}
      <g stroke="#3a4c68" strokeWidth="0.9" opacity="0.7">
        <line x1="11" y1="33" x2="53" y2="33" />
        <line x1="11" y1="44" x2="53" y2="44" />
      </g>
      {/* sheen */}
      <path d="M15 20 L23 20 L17 55 L11 55 L11 24 Z" fill="#9ec6ff" opacity="0.1" />
    </>
  );
}

function Meditate() {
  return (
    <>
      <Glow color="#79b0a2" o={0.42} />
      {/* aura rings */}
      <circle cx="32" cy="34" r="21" fill="none" stroke="#7af0d3" strokeWidth="1" opacity="0.35" />
      <circle cx="32" cy="34" r="15.5" fill="none" stroke="#7af0d3" strokeWidth="1" opacity="0.5" />
      <circle cx="32" cy="30" r="10" fill="#7af0d3" opacity="0.12" />
      {/* seated figure silhouette */}
      <path d="M19 50 Q32 33 45 50 Q45 55 32 55 Q19 55 19 50 Z" fill="#2e6f66" stroke="#0e3a34" strokeWidth="1.6" />
      <circle cx="32" cy="23" r="5.4" fill="#bff6ec" stroke="#0e3a34" strokeWidth="1.2" />
      <circle cx="30.4" cy="21.6" r="1.3" fill="#eafffb" opacity="0.8" />
      {/* meditative hands */}
      <path d="M23 46 Q32 39 41 46" fill="none" stroke="#d6fff7" strokeWidth="2.2" strokeLinecap="round" />
      {/* rising motes of calm */}
      <circle cx="32" cy="9" r="2" fill="#d6fff7" opacity="0.9" />
      <circle cx="24" cy="13" r="1.4" fill="#d6fff7" opacity="0.75" />
      <circle cx="40" cy="13" r="1.4" fill="#d6fff7" opacity="0.75" />
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
      <rect x="29.6" y="10" width="4.4" height="47" rx="1.5" fill={WOOD} stroke="#2a1808" strokeWidth="1" />
      <line x1="30.6" y1="12" x2="30.6" y2="55" stroke="#c08a52" strokeWidth="0.8" opacity="0.6" />
      {/* broad blade */}
      <path d="M32 11 Q53 11 53 31 Q44 26 32 28 Z" fill={STEEL} stroke="#1a1f2e" strokeWidth="1.3" />
      <path d="M32 11 Q47 11 51 22 Q42 20 32 22 Z" fill="#eef2ff" opacity="0.35" />
      <path d="M32 28 Q44 26 53 31" fill="none" stroke="#ffd0db" strokeWidth="1.2" opacity="0.75" />
      {/* back spike */}
      <path d="M30 15 Q17 15 15 26 Q24 22 30 24 Z" fill={STEEL_D} stroke="#1a1f2e" strokeWidth="1.1" />
      {/* blood edge */}
      <path d="M53 31 Q50 35 47 34" stroke="#c0264a" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <path d="M45 33 Q44 37 45 39" stroke="#c0264a" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      {/* pommel */}
      <circle cx="32" cy="57.5" r="3.2" fill="#c9962f" stroke="#3a2a0e" strokeWidth="1" />
    </>
  );
}

function Charge() {
  return (
    <>
      <Glow color="#6fb6ff" o={0.5} />
      {/* mana crystal being energized */}
      <path d="M32 6 L44 26 L38 54 L26 54 L20 26 Z" fill="url(#charge-core)" stroke="#152a52" strokeWidth="1.8" strokeLinejoin="round" />
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
      <path d="M18 16 C15 16 13 18.4 13 21 C13 25 17 28 22 32 C27 28 31 25 31 21 C31 18.4 29 16 26 16 C24 16 22.6 17.2 22 18.4 C21.4 17.2 20 16 18 16 Z" fill="#ff5c8a" stroke="#7a1a3a" strokeWidth="1.2" />
      <path d="M17 19 C16 19.5 15.5 20.5 16 22" fill="none" stroke="#ffd0db" strokeWidth="1.1" opacity="0.75" strokeLinecap="round" />
      <path d="M42 34 C39 34 37 36.4 37 39 C37 43 41 46 46 50 C51 46 55 43 55 39 C55 36.4 53 34 50 34 C48 34 46.6 35.2 46 36.4 C45.4 35.2 44 34 42 34 Z" fill="#7fb6ff" stroke="#1a3a66" strokeWidth="1.2" />
      <path d="M41 37 C40 37.5 39.5 38.5 40 40" fill="none" stroke="#cfe2ff" strokeWidth="1.1" opacity="0.75" strokeLinecap="round" />
      {/* swap arrows */}
      <path d="M12 40 Q22 53 34 46" fill="none" stroke="#4a2c7e" strokeWidth="4.6" strokeLinecap="round" opacity="0.5" />
      <path d="M12 40 Q22 53 34 46" fill="none" stroke="#c9a0ff" strokeWidth="3" strokeLinecap="round" />
      <path d="M34 46 L27 45 L31 52 Z" fill="#e2d0ff" stroke="#4a2c7e" strokeWidth="0.9" strokeLinejoin="round" />
      <path d="M52 24 Q42 11 30 18" fill="none" stroke="#4a2c7e" strokeWidth="4.6" strokeLinecap="round" opacity="0.5" />
      <path d="M52 24 Q42 11 30 18" fill="none" stroke="#c9a0ff" strokeWidth="3" strokeLinecap="round" />
      <path d="M30 18 L37 19 L33 12 Z" fill="#e2d0ff" stroke="#4a2c7e" strokeWidth="0.9" strokeLinejoin="round" />
    </>
  );
}

function MindSiphon() {
  return (
    <>
      <Glow color="#6fb6ff" o={0.45} />
      {/* aura behind the drained mind */}
      <ellipse cx="30" cy="36" rx="18" ry="20" fill="#6fb6ff" opacity="0.14" />
      {/* a head profile with a spiral mind, mana motes streaming out */}
      <path d="M34 54 Q18 54 16 38 Q14 22 30 18 Q46 14 48 30 Q49 40 42 42 L42 50 Q42 54 38 54 Z"
        fill="#16243a" stroke="#0a1220" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M18 34 Q16 24 28 20 Q40 17 45 26" fill="none" stroke="#7fb6ff" strokeWidth="1.4" opacity="0.7" strokeLinecap="round" />
      {/* mind swirl */}
      <path d="M30 34 m0 -6 a6 6 0 1 1 -5 3 a3.5 3.5 0 1 0 3 2" fill="none" stroke="#4a7ab0" strokeWidth="3" strokeLinecap="round" opacity="0.5" />
      <path d="M30 34 m0 -6 a6 6 0 1 1 -5 3 a3.5 3.5 0 1 0 3 2" fill="none" stroke="#bfe0ff" strokeWidth="1.8" strokeLinecap="round" />
      {/* siphoned mana crystals drifting away */}
      <path d="M52 14 l3 5 l-3 5 l-3 -5 Z" fill="#5aa0ff" stroke="#0a1220" strokeWidth="1.1" strokeLinejoin="round" />
      <path d="M52 14 l3 5 l-3 5 Z" fill="#d6ecff" opacity="0.45" />
      <path d="M56 28 l2.2 3.6 l-2.2 3.6 l-2.2 -3.6 Z" fill="#5aa0ff" stroke="#0a1220" strokeWidth="1" strokeLinejoin="round" opacity="0.9" />
      <circle cx="49" cy="24" r="1.8" fill="#d6ecff" opacity="0.9" />
      <circle cx="45" cy="18" r="1.2" fill="#d6ecff" opacity="0.7" />
    </>
  );
}

function BloodWave() {
  return (
    <>
      <Glow color="#c0264a" o={0.45} />
      {/* a cresting wave of blood */}
      <path d="M6 40 Q14 26 24 34 Q30 39 36 32 Q44 22 52 34 Q58 42 58 48 L58 56 L6 56 Z"
        fill="#7a1330" stroke="#3a0a18" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M6 44 Q16 34 24 40 Q32 46 40 40 Q48 34 58 44 L58 56 L6 56 Z" fill="#c0264a" opacity="0.85" />
      <path d="M6 49 Q18 42 30 47 Q42 52 58 47 L58 56 L6 56 Z" fill="#e03a58" opacity="0.5" />
      {/* wave crest ink line */}
      <path d="M6 40 Q14 26 24 34 Q30 39 36 32 Q44 22 52 34" fill="none" stroke="#ff6a88" strokeWidth="1.4" opacity="0.8" strokeLinecap="round" />
      {/* curl highlight */}
      <path d="M44 26 Q52 30 52 38 Q49 33 44 34 Q47 30 44 26 Z" fill="#ff8aa0" opacity="0.9" />
      <path d="M46 28 Q50 31 49 35" fill="none" stroke="#ffd0da" strokeWidth="1" opacity="0.7" strokeLinecap="round" />
      {/* flung droplets */}
      <path d="M20 20 Q18 24 20 26 Q22 24 20 20 Z" fill="#ff6a88" stroke="#7a1330" strokeWidth="0.7" />
      <circle cx="34" cy="18" r="2.4" fill="#ff6a88" stroke="#7a1330" strokeWidth="0.7" />
      <circle cx="33" cy="17" r="0.8" fill="#ffd0da" opacity="0.8" />
      <circle cx="48" cy="16" r="1.8" fill="#ff6a88" opacity="0.9" />
    </>
  );
}

function LastStand() {
  return (
    <>
      <Glow color="#ff5c8a" o={0.42} />
      {/* a cracked shield with a defiant clenched fist bursting through */}
      <path d="M32 6 L50 12 L50 30 Q50 44 32 52 Q14 44 14 30 L14 12 Z"
        fill="#1a2230" stroke="#0a1220" strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M32 9 L47 14 L47 30 Q47 42 32 49 Q17 42 17 30 L17 14 Z"
        fill="none" stroke="#3a4c68" strokeWidth="1.2" opacity="0.7" strokeLinejoin="round" />
      {/* crack */}
      <path d="M32 6 L28 20 L36 26 L30 38 L34 52" fill="none" stroke="#c2543a" strokeWidth="2.2" strokeLinejoin="round" opacity="0.85" />
      <path d="M32 6 L28 20 L36 26 L30 38 L34 52" fill="none" stroke="#ff9a6a" strokeWidth="0.8" strokeLinejoin="round" opacity="0.6" />
      {/* fist */}
      <path d="M24 40 Q24 32 30 32 L40 32 Q46 32 46 38 L46 46 Q46 52 38 52 L30 52 Q24 52 24 46 Z"
        fill="#3a2530" stroke="#160a10" strokeWidth="1.8" />
      <path d="M26 40 Q26 34 31 34 L40 34" fill="none" stroke="#ffd0db" strokeWidth="1" opacity="0.6" strokeLinecap="round" />
      {[30, 35, 40].map((x, i) => (
        <rect key={i} x={x - 1.6} y="29" width="3.2" height="7" rx="1.5" fill="#4a2f38" stroke="#160a10" strokeWidth="1.1" />
      ))}
      {/* defiant spark */}
      <path d="M35 12 L37 17 L42 18 L37 19 L35 24 L33 19 L28 18 L33 17 Z" fill="#ffe0ea" opacity="0.95" />
      <circle cx="35" cy="18" r="1" fill="#fff" opacity="0.9" />
    </>
  );
}

function Gale() {
  return (
    <>
      <Glow color="#7fd6ff" o={0.4} />
      {/* dark backing gusts for depth */}
      <path d="M10 20 h22 a5 5 0 1 0 -5 -5" fill="none" stroke="#2a6a8a" strokeWidth="5" strokeLinecap="round" opacity="0.35" />
      <path d="M8 32 h34 a6 6 0 1 1 -6 6" fill="none" stroke="#2a6a8a" strokeWidth="5" strokeLinecap="round" opacity="0.35" />
      {/* three swirling wind gusts */}
      <path d="M10 20 h22 a5 5 0 1 0 -5 -5" fill="none" stroke="#d6f4ff" strokeWidth="3.2" strokeLinecap="round" />
      <path d="M8 32 h34 a6 6 0 1 1 -6 6" fill="none" stroke="#7fd6ff" strokeWidth="3.2" strokeLinecap="round" />
      <path d="M12 44 h20 a4.5 4.5 0 1 0 -4.5 4.5" fill="none" stroke="#bfeaff" strokeWidth="3" strokeLinecap="round" opacity="0.9" />
      {/* frost flecks carried on the wind */}
      <path d="M48 12 l3 3 l-3 3 l-3 -3 Z" fill="#eaffff" stroke="#7fd6ff" strokeWidth="0.7" opacity="0.9" />
      <circle cx="50" cy="50" r="1.8" fill="#eaffff" opacity="0.75" />
      <circle cx="54" cy="26" r="1.2" fill="#eaffff" opacity="0.6" />
    </>
  );
}

function Tempest() {
  return (
    <>
      <Glow color="#ffd84a" o={0.5} />
      {/* storm cloud */}
      <path d="M18 30 A9 9 0 0 1 34 24 A8 8 0 0 1 48 28 A7 7 0 0 1 47 42 L20 42 A8 8 0 0 1 18 30 Z"
        fill="#2a2f42" stroke="#0a0e1a" strokeWidth="2" strokeLinejoin="round" />
      <path d="M18 30 A9 9 0 0 1 34 24 A8 8 0 0 1 48 28 A7 7 0 0 1 47 42 Z" fill="#161a28" opacity="0.55" />
      <path d="M20 26 A8 8 0 0 1 33 22" fill="none" stroke="#8b93ad" strokeWidth="1.2" opacity="0.6" strokeLinecap="round" />
      {/* lightning glow */}
      <path d="M32 40 L24 52 L31 52 L26 62 L40 48 L33 48 L38 40 Z" fill="none" stroke="#ffd84a" strokeWidth="4" strokeLinejoin="round" opacity="0.35" />
      {/* forking lightning */}
      <path d="M32 40 L24 52 L31 52 L26 62 L40 48 L33 48 L38 40 Z" fill="#ffe46a" stroke="#fff6c4" strokeWidth="1.4" strokeLinejoin="round" />
      {/* driving rain */}
      <line x1="20" y1="46" x2="17" y2="54" stroke="#7fb6ff" strokeWidth="2" strokeLinecap="round" opacity="0.75" />
      <line x1="46" y1="46" x2="43" y2="54" stroke="#7fb6ff" strokeWidth="2" strokeLinecap="round" opacity="0.75" />
      <line x1="53" y1="44" x2="51" y2="50" stroke="#7fb6ff" strokeWidth="1.6" strokeLinecap="round" opacity="0.55" />
    </>
  );
}

function Backstab() {
  return (
    <>
      <Glow color="#9be85a" o={0.4} />
      {/* a stolen card pulled away, a dagger striking from behind it */}
      <g transform="rotate(-12 26 32)">
        <rect x="14" y="14" width="22" height="30" rx="3" fill="#16202c" stroke="#0a1220" strokeWidth="1.8" />
        <rect x="16" y="16" width="18" height="26" rx="2" fill="none" stroke="#7ad04a" strokeWidth="1" opacity="0.6" />
        <rect x="14" y="14" width="22" height="30" rx="3" fill="#0e1620" opacity="0.4" />
        <path d="M25 20 L28 26 L34 27 L29 31 L30 37 L25 34 L20 37 L21 31 L16 27 L22 26 Z" fill="#bdf08a" opacity="0.85" />
      </g>
      {/* dagger thrust */}
      <g transform="rotate(38 44 32)">
        <path d="M44 8 L47 16 L46 34 L44 40 L42 34 L41 16 Z" fill="#cfd6e6" stroke="#1a1f2e" strokeWidth="1.1" strokeLinejoin="round" />
        <path d="M44 8 L44 40 L42 34 L41 16 Z" fill="#7b8398" opacity="0.6" />
        <path d="M45 12 L45.6 34" stroke="#fbfdff" strokeWidth="0.7" opacity="0.7" />
        <rect x="37" y="39" width="14" height="3.5" rx="1.7" fill="#6a8a3c" stroke="#2a3a14" strokeWidth="1" />
        <rect x="42.5" y="42" width="3" height="8" fill={WOOD} stroke={WOOD_D} strokeWidth="0.8" />
      </g>
      {/* motion streak */}
      <path d="M40 12 L50 8" stroke="#bdf08a" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
      <path d="M42 16 L51 12" stroke="#bdf08a" strokeWidth="1.4" strokeLinecap="round" opacity="0.4" />
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
      <path d="M31 36 Q15 24 12 40 Q23 42 31 41 Z" fill="#bfe9ff" opacity="0.5" stroke="#8fd6f0" strokeWidth="0.7" />
      <path d="M33 36 Q49 24 52 40 Q41 42 33 41 Z" fill="#bfe9ff" opacity="0.5" stroke="#8fd6f0" strokeWidth="0.7" />
      <path d="M29 40 Q29 52 32 52 Q35 52 35 40 Z" fill="#7fcff0" stroke="#4a9ec0" strokeWidth="0.8" />
      <circle cx="32" cy="30" r="9.5" fill="#dff4ff" />
      <circle cx="32" cy="30" r="6.5" fill="#f4fbff" />
      <circle cx="29.5" cy="29" r="1.4" fill="#1a2a3a" />
      <circle cx="34.5" cy="29" r="1.4" fill="#1a2a3a" />
      <path d="M30 33 Q32 35 34 33" stroke="#5a7a90" strokeWidth="1" fill="none" strokeLinecap="round" />
      <circle cx="46" cy="23" r="1.6" fill="#eafaff" />
      <circle cx="19" cy="26" r="1.2" fill="#eafaff" />
    </>
  );
}

/** Bust of an armored soldier holding a short blade (신병). */
function Recruit() {
  return (
    <>
      <path d="M20 53 Q20 39 32 39 Q44 39 44 53 Z" fill="#5b6a4a" stroke="#33402a" strokeWidth="1.2" />
      <path d="M32 40 L32 53" stroke="#3a4a2a" strokeWidth="1" opacity="0.6" />
      <path d="M20 43 Q17 41 16 46 L20 48 Z" fill="#4a5740" stroke="#33402a" strokeWidth="0.8" />
      <circle cx="32" cy="30" r="8.2" fill={SKIN} stroke={SKIN_D} strokeWidth="1.1" />
      <path d="M28 31 Q32 34 36 31" stroke={SKIN_D} strokeWidth="0.7" fill="none" opacity="0.5" />
      <path d="M23 27 Q32 16 41 27 L41 23 Q32 15 23 23 Z" fill={STEEL} stroke={STEEL_D} strokeWidth="0.9" />
      <path d="M32 16 L32 23" stroke={STEEL_D} strokeWidth="0.6" opacity="0.6" />
      <rect x="44" y="28" width="2.6" height="22" rx="0.6" fill={STEEL} stroke={STEEL_D} strokeWidth="0.7" transform="rotate(13 45 39)" />
      <rect x="41" y="37" width="8" height="2.2" rx="0.6" fill={GOLD} stroke={GOLD_D} strokeWidth="0.5" transform="rotate(13 45 38)" />
      <circle cx="29" cy="31" r="1.2" fill="#26303e" />
      <circle cx="35" cy="31" r="1.2" fill="#26303e" />
    </>
  );
}

/** A footman behind a broad shield (수비병 · 수호). */
function Guard() {
  return (
    <>
      <path d="M34 52 Q34 40 40 40 Q47 40 47 52 Z" fill="#5c6470" stroke="#333844" strokeWidth="1.1" />
      <circle cx="40" cy="28" r="7.2" fill={SKIN} stroke={SKIN_D} strokeWidth="1.1" />
      <path d="M32 26 Q40 17 48 26 L48 22 Q40 14 32 22 Z" fill={STEEL} stroke={STEEL_D} strokeWidth="0.9" />
      <circle cx="38" cy="29" r="1.1" fill="#26303e" />
      <circle cx="43" cy="29" r="1.1" fill="#26303e" />
      <path d="M13 22 L31 22 L31 43 Q22 53 13 43 Z" fill="#8a6636" stroke="#40260f" strokeWidth="1.6" />
      <path d="M13 22 L22 24 L22 48 Q17 46 13 43 Z" fill="#9c7842" opacity="0.5" />
      <path d="M22 22 L22 50" stroke="#c8922f" strokeWidth="1.8" />
      <path d="M13 32 L31 32" stroke="#c8922f" strokeWidth="1.6" />
      <circle cx="22" cy="32" r="3" fill={GOLD} stroke={GOLD_D} strokeWidth="1" />
      <circle cx="21" cy="31" r="1" fill="#fff3d0" opacity="0.7" />
    </>
  );
}

/** A lunging wolf (늑대 · 쇄도). */
function Wolf() {
  return (
    <>
      <path d="M12 40 Q22 44 30 40 L44 40 Q52 40 54 34 Q50 44 40 44 Q34 48 26 46 Q18 48 12 40 Z" fill="#5f636c" stroke="#26292f" strokeWidth="1.4" />
      <path d="M44 40 Q54 36 58 28 Q60 34 55 38 Q58 40 54 43 Q50 46 44 44 Z" fill="#6b6f78" stroke="#26292f" strokeWidth="1.4" />
      <path d="M54 30 L57 23 L59 31 Z" fill="#6b6f78" stroke="#26292f" strokeWidth="1" />
      <path d="M49 31 L51 24 L54 32 Z" fill="#6b6f78" stroke="#26292f" strokeWidth="1" />
      <path d="M57 34 L64 34 L57 38 Z" fill="#33363d" stroke="#26292f" strokeWidth="0.6" />
      <path d="M57 36 L61 35 M57 37 L60 37" stroke="#e8ecf2" strokeWidth="0.7" />
      <circle cx="55" cy="32" r="1.4" fill="#ffd24a" stroke="#7a5a10" strokeWidth="0.4" />
      <path d="M18 44 L16 53 M27 45 L26 54 M36 44 L35 53 M45 44 L44 52" stroke="#26292f" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M12 40 Q10 36 13 34 Q15 38 12 40 Z" fill="#5f636c" stroke="#26292f" strokeWidth="1" />
    </>
  );
}

/** A young squire raising a banner (종자). */
function Squire() {
  return (
    <>
      <rect x="30" y="12" width="2.2" height="40" rx="0.6" fill="#6b4a26" stroke="#432c14" strokeWidth="0.5" />
      <path d="M32 13 L50 17 L45 25 L50 33 L32 29 Z" fill="#a83b2c" stroke="#5f1f16" strokeWidth="1.1" />
      <path d="M32 13 L50 17 L45 25 L32 22 Z" fill="#c04a36" opacity="0.55" />
      <path d="M37 18 L43 19 M37 23 L44 24" stroke="#5f1f16" strokeWidth="0.7" opacity="0.6" />
      <path d="M16 52 Q16 39 24 39 Q32 39 32 52 Z" fill="#456089" stroke="#2a3d58" strokeWidth="1.1" />
      <path d="M16 52 Q16 39 24 39 L24 52 Z" fill="#54739e" opacity="0.5" />
      <circle cx="24" cy="31" r="7.4" fill={SKIN} stroke={SKIN_D} strokeWidth="1.1" />
      <path d="M17 28 Q24 20 31 27 Q30 22 24 22 Q18 22 17 28 Z" fill="#5a3f22" stroke="#3a2814" strokeWidth="0.7" />
      <circle cx="22" cy="32" r="1.2" fill="#26303e" />
      <circle cx="27" cy="32" r="1.2" fill="#26303e" />
      <path d="M22 35 Q24 36 26 35" stroke={SKIN_D} strokeWidth="0.7" fill="none" opacity="0.6" />
    </>
  );
}

/** An archer drawing a bow (궁수). */
function Archer() {
  return (
    <>
      <path d="M18 14 Q40 32 18 50" stroke="#7c5a30" strokeWidth="2.8" fill="none" strokeLinecap="round" />
      <path d="M18 14 Q38 30 20 34" stroke="#9c7842" strokeWidth="1" fill="none" opacity="0.6" />
      <path d="M18 14 L18 50" stroke="#e8e2d0" strokeWidth="0.9" />
      <path d="M22 51 Q22 40 30 40 Q38 40 38 51 Z" fill="#3f5a3a" stroke="#26361f" strokeWidth="1.1" />
      <path d="M22 51 Q22 40 30 40 L30 51 Z" fill="#4d6b46" opacity="0.5" />
      <circle cx="30" cy="26" r="6.4" fill={SKIN} stroke={SKIN_D} strokeWidth="1.1" />
      <path d="M24 24 Q30 17 36 24 Q35 20 30 20 Q25 20 24 24 Z" fill="#3f5a3a" stroke="#26361f" strokeWidth="0.7" />
      <circle cx="31" cy="26" r="1.1" fill="#26303e" />
      <path d="M20 30 L52 30" stroke="#cfd8e6" strokeWidth="1.5" />
      <path d="M18 30 L18 30" />
      <path d="M50 27 L57 30 L50 33 Z" fill="#cfd8e6" stroke="#79839a" strokeWidth="0.7" />
      <path d="M50 30 L44 28 M50 30 L44 32" stroke="#79839a" strokeWidth="0.6" />
    </>
  );
}

/** A knight in full plate with a longsword (기사). */
function Knight() {
  return (
    <>
      <path d="M20 53 Q20 38 32 38 Q44 38 44 53 Z" fill={PLATE} stroke={PLATE_D} strokeWidth="1.3" />
      <path d="M20 53 Q20 38 32 38 L32 53 Z" fill="#e4eaf4" opacity="0.45" />
      <path d="M32 40 L32 53 M24 44 L40 44" stroke={PLATE_D} strokeWidth="0.9" opacity="0.7" />
      <path d="M18 40 Q16 44 19 47 L24 44 Z" fill={PLATE} stroke={PLATE_D} strokeWidth="1" />
      <path d="M40 40 Q46 42 46 47 L41 46 Z" fill={PLATE} stroke={PLATE_D} strokeWidth="1" />
      <path d="M23 30 Q32 19 41 30 L41 35 L23 35 Z" fill={PLATE} stroke={PLATE_D} strokeWidth="1.1" />
      <path d="M32 19 L32 33" stroke={PLATE_D} strokeWidth="0.7" opacity="0.6" />
      <rect x="30" y="29" width="4" height="7" rx="0.8" fill="#121a26" />
      <path d="M32 20 L29 14 L32 16 L35 14 Z" fill="#c0392b" stroke="#7a2018" strokeWidth="0.5" />
      <rect x="46" y="12" width="2.8" height="34" rx="0.7" fill={PLATE} stroke={PLATE_D} strokeWidth="0.9" transform="rotate(9 47 30)" />
      <path d="M46 12 L47 30" stroke="#fff" strokeWidth="0.6" opacity="0.5" transform="rotate(9 47 30)" />
      <rect x="42" y="30" width="10" height="2.6" rx="0.6" fill={GOLD} stroke={GOLD_D} strokeWidth="0.6" transform="rotate(9 47 31)" />
    </>
  );
}

/** A robed cleric raising a holy staff (사제). */
function Cleric() {
  return (
    <>
      <rect x="44" y="12" width="2.4" height="38" rx="0.6" fill="#c8922f" stroke="#8a5f1c" strokeWidth="0.5" />
      <circle cx="45.2" cy="11" r="4" fill="none" stroke={GOLD} strokeWidth="1.6" />
      <path d="M45.2 5 L45.2 12 M41 8 L49.4 8" stroke={GOLD} strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="45.2" cy="11" r="6.5" fill="#fff2c0" opacity="0.25" />
      <path d="M18 53 Q18 29 30 29 Q42 29 42 53 Z" fill="#eae4d2" stroke="#b6ad92" strokeWidth="1.3" />
      <path d="M18 53 Q18 29 30 29 L30 53 Z" fill="#f4efdf" opacity="0.5" />
      <path d="M30 34 L30 53" stroke="#c4b89a" strokeWidth="0.8" opacity="0.6" />
      <path d="M24 40 L36 40" stroke={GOLD} strokeWidth="1.6" />
      <circle cx="30" cy="25" r="6.8" fill={SKIN} stroke={SKIN_D} strokeWidth="1.1" />
      <path d="M22 25 Q30 15 38 25 L38 20 Q30 13 22 20 Z" fill="#dcd2b4" stroke="#b6ad92" strokeWidth="0.8" />
      <path d="M30 15 L30 22" stroke="#b6ad92" strokeWidth="0.6" opacity="0.6" />
      <circle cx="28" cy="26" r="1" fill="#26303e" />
      <circle cx="32" cy="26" r="1" fill="#26303e" />
    </>
  );
}

/** An enormous tower shield (방패병 · 수호). */
function Shieldbearer() {
  return (
    <>
      <path d="M16 12 L48 12 L48 42 Q32 55 16 42 Z" fill="#8a6636" stroke="#3e2510" strokeWidth="2" />
      <path d="M16 12 L32 12 L32 53 Q23 49 16 42 Z" fill="#9c7842" opacity="0.5" />
      <path d="M32 12 L32 52" stroke="#c8922f" strokeWidth="2.2" />
      <path d="M16 25 L48 25" stroke="#c8922f" strokeWidth="2.2" />
      <circle cx="32" cy="25" r="4.6" fill={GOLD} stroke={GOLD_D} strokeWidth="1.1" />
      <circle cx="30.5" cy="23.5" r="1.3" fill="#fff3d0" opacity="0.7" />
      <circle cx="20" cy="16" r="1.2" fill={GOLD_D} />
      <circle cx="44" cy="16" r="1.2" fill={GOLD_D} />
      <circle cx="20" cy="40" r="1.2" fill={GOLD_D} />
      <circle cx="44" cy="40" r="1.2" fill={GOLD_D} />
    </>
  );
}

/** A raging berserker with twin axes (광전사). */
function Berserker() {
  return (
    <>
      <path d="M22 41 Q22 53 32 53 Q42 53 42 41 Z" fill="#7a2e22" stroke="#481810" strokeWidth="1.2" />
      <path d="M22 41 Q22 53 32 53 L32 41 Z" fill="#8f3a2c" opacity="0.5" />
      <path d="M13 21 L23 27 L21 31 L11 25 Z" fill="#b8483a" stroke="#5f1710" strokeWidth="0.9" />
      <path d="M13 21 L23 27 L21 24 Z" fill="#d05c48" opacity="0.6" />
      <rect x="20" y="26" width="2.2" height="18" rx="0.6" fill="#6b4a26" stroke="#432c14" strokeWidth="0.4" transform="rotate(-42 21 35)" />
      <path d="M51 21 L41 27 L43 31 L53 25 Z" fill="#b8483a" stroke="#5f1710" strokeWidth="0.9" />
      <path d="M51 21 L41 27 L43 24 Z" fill="#d05c48" opacity="0.6" />
      <rect x="42" y="26" width="2.2" height="18" rx="0.6" fill="#6b4a26" stroke="#432c14" strokeWidth="0.4" transform="rotate(42 43 35)" />
      <circle cx="32" cy="30" r="8.4" fill={SKIN} stroke={SKIN_D} strokeWidth="1.1" />
      <path d="M22 26 Q26 16 32 20 Q38 16 42 26 Q38 22 32 24 Q26 22 22 26 Z" fill="#8a5a2a" stroke="#5a3a18" strokeWidth="0.7" />
      <path d="M27 30 L31 31 M37 30 L33 31" stroke="#3a1410" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M28 34 Q32 32 36 34" stroke="#4a1a12" strokeWidth="1.2" fill="none" strokeLinecap="round" />
    </>
  );
}

/** A venomous spider (맹독거미 · 부식). */
function Venomspider() {
  return (
    <>
      <path d="M22 30 L9 22 M22 34 L8 32 M22 38 L9 42 M22 42 L11 50" stroke="#232c15" strokeWidth="2.2" strokeLinecap="round" fill="none" />
      <path d="M42 30 L55 22 M42 34 L56 32 M42 38 L55 42 M42 42 L53 50" stroke="#232c15" strokeWidth="2.2" strokeLinecap="round" fill="none" />
      <path d="M14 24 L10 21 M13 43 L9 46" stroke="#232c15" strokeWidth="2" strokeLinecap="round" />
      <ellipse cx="32" cy="37" rx="10.5" ry="8.5" fill="#3a4a24" stroke="#1a220f" strokeWidth="1.3" />
      <ellipse cx="29" cy="34" rx="4" ry="3" fill="#4d6130" opacity="0.6" />
      <path d="M32 30 L30 38 L34 38 Z" fill="#c4f04a" opacity="0.55" />
      <path d="M28 40 L26 45 M36 40 L38 45 M32 41 L32 47" stroke="#8fb03a" strokeWidth="0.8" opacity="0.6" />
      <circle cx="32" cy="26" r="5.4" fill="#4a5c2e" stroke="#1a220f" strokeWidth="1.1" />
      <circle cx="29.5" cy="26" r="1.5" fill="#c4f04a" />
      <circle cx="34.5" cy="26" r="1.5" fill="#c4f04a" />
      <path d="M30 30 L28 33 M34 30 L36 33" stroke="#d8ff6a" strokeWidth="1" strokeLinecap="round" />
    </>
  );
}

/** A mounted lancer charging (창기병 · 쇄도). */
function Cavalier() {
  return (
    <>
      <path d="M10 44 Q18 34 34 36 L44 33 Q50 34 47 40 L44 44 Q40 51 28 50 Q18 51 10 44 Z" fill="#6b5236" stroke="#33260f" strokeWidth="1.3" />
      <path d="M10 44 Q18 34 34 36 L34 48 Q20 50 10 44 Z" fill="#7d613f" opacity="0.5" />
      <path d="M44 33 Q49 32 50 36 Q47 37 44 36 Z" fill="#5a4429" stroke="#33260f" strokeWidth="0.8" />
      <path d="M15 45 L13 53 M25 47 L24 54 M35 46 L35 53 M43 44 L43 51" stroke="#33260f" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M30 30 Q28 24 33 22 L33 30 Z" fill="#5a4429" stroke="#33260f" strokeWidth="0.8" />
      <path d="M26 22 Q30 14 36 20 Q40 24 38 30 L30 30 Q26 26 26 22 Z" fill="#8a6a44" stroke="#4a3618" strokeWidth="1.1" />
      <circle cx="31" cy="22" r="4.4" fill={PLATE} stroke={PLATE_D} strokeWidth="1" />
      <rect x="30" y="20" width="2.4" height="4" rx="0.6" fill="#121a26" />
      <path d="M35 21 L62 12" stroke="#cfd8e6" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M35 21 L58 13" stroke="#f0f4fa" strokeWidth="0.7" opacity="0.6" />
      <path d="M59 10 L64 12 L59 15 Z" fill={PLATE} stroke={PLATE_D} strokeWidth="0.7" />
      <path d="M50 18 L54 15 L53 20 Z" fill="#a83b2c" stroke="#5f1f16" strokeWidth="0.6" />
    </>
  );
}

/** A radiant paladin (성기사 · 신성한 보호막). */
function Paladin() {
  return (
    <>
      <circle cx="32" cy="30" r="17" fill="#fff2c0" opacity="0.16" />
      <circle cx="32" cy="30" r="17" fill="none" stroke="#fff2c0" strokeWidth="1" opacity="0.5" />
      <path d="M20 53 Q20 36 32 36 Q44 36 44 53 Z" fill={PLATE} stroke={PLATE_D} strokeWidth="1.3" />
      <path d="M20 53 Q20 36 32 36 L32 53 Z" fill="#eef2fa" opacity="0.5" />
      <path d="M18 40 Q16 44 19 47 L24 44 Z" fill={PLATE} stroke={PLATE_D} strokeWidth="1" />
      <path d="M40 40 Q46 42 46 47 L41 46 Z" fill={PLATE} stroke={PLATE_D} strokeWidth="1" />
      <path d="M23 30 Q32 19 41 30 L41 35 L23 35 Z" fill="#eef2fa" stroke={PLATE_D} strokeWidth="1.1" />
      <path d="M32 20 L32 34" stroke={PLATE_D} strokeWidth="0.7" opacity="0.6" />
      <rect x="30" y="29" width="4" height="7" rx="0.8" fill="#121a26" />
      <path d="M32 22 L29 15 L32 17 L35 15 Z" fill={GOLD} stroke={GOLD_D} strokeWidth="0.5" />
      <path d="M32 40 L32 51 M26 44 L38 44" stroke={GOLD} strokeWidth="2.4" strokeLinecap="round" />
    </>
  );
}

/** A caped vampire lord (흡혈귀 · 착취). */
function Vampirelord() {
  return (
    <>
      <path d="M12 52 Q18 28 32 30 Q46 28 52 52 Z" fill="#2a1420" stroke="#120810" strokeWidth="1.5" />
      <path d="M12 52 Q18 28 32 30 L32 52 Z" fill="#3a1c2c" opacity="0.55" />
      <path d="M22 30 Q22 24 32 24 Q42 24 42 30 L38 33 Q32 30 26 33 Z" fill="#4a1020" stroke="#2a0810" strokeWidth="1" />
      <path d="M22 30 L20 24 Q26 22 32 24 M42 30 L44 24 Q38 22 32 24" stroke="#2a0810" strokeWidth="1" fill="none" />
      <circle cx="32" cy="25" r="7.6" fill="#e8dcd4" stroke="#b09a92" strokeWidth="1.1" />
      <path d="M24 21 Q32 12 40 21 Q40 14 32 14 Q24 14 24 21 Z" fill="#140812" stroke="#0a0408" strokeWidth="0.7" />
      <path d="M30 14 L30 20 M34 14 L34 20" stroke="#2a1420" strokeWidth="0.6" opacity="0.7" />
      <circle cx="29" cy="25" r="1.5" fill="#e01020" />
      <circle cx="35" cy="25" r="1.5" fill="#e01020" />
      <path d="M26 22 L28 25 M38 22 L36 25" stroke="#0a0408" strokeWidth="1" strokeLinecap="round" />
      <path d="M29.5 29 L30.5 32 M34.5 29 L33.5 32" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" />
    </>
  );
}

/** A bomb-hurling grenadier (폭탄병 · 유언). */
function Bomber() {
  return (
    <>
      <path d="M13 51 Q13 39 21 39 Q29 39 29 51 Z" fill="#4a3a24" stroke="#2c2012" strokeWidth="1.1" />
      <path d="M13 51 Q13 39 21 39 L21 51 Z" fill="#5c4a30" opacity="0.5" />
      <circle cx="21" cy="30" r="6.4" fill={SKIN} stroke={SKIN_D} strokeWidth="1.1" />
      <path d="M15 28 Q21 20 27 28 Q26 23 21 23 Q16 23 15 28 Z" fill="#5a3f22" stroke="#3a2814" strokeWidth="0.7" />
      <circle cx="20" cy="30" r="1" fill="#26303e" />
      <circle cx="23" cy="30" r="1" fill="#26303e" />
      <circle cx="39" cy="37" r="9.4" fill="#2a2e36" stroke="#0e1014" strokeWidth="1.5" />
      <ellipse cx="35" cy="33" rx="3.2" ry="2.2" fill="#5a6068" opacity="0.6" />
      <rect x="35" y="26" width="8" height="3.4" rx="1" fill="#4a4038" stroke="#0e1014" strokeWidth="0.7" />
      <path d="M40 26 Q44 18 48 21" stroke="#8a6636" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      <circle cx="48" cy="20" r="2.4" fill="#ffce5a" />
      <path d="M48 15 L48 12 M52 18 L55 16 M52 22 L55 24 M44 15 L42 12" stroke="#ff8a2a" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="48" cy="20" r="3.8" fill="none" stroke="#ff6a1a" strokeWidth="0.8" opacity="0.6" />
    </>
  );
}

/** A warlord raising a banner and blade (전쟁군주). */
function Warlord() {
  return (
    <>
      <rect x="47" y="10" width="2.2" height="42" rx="0.6" fill="#6b4a26" stroke="#432c14" strokeWidth="0.5" />
      <path d="M49 11 L62 14 L58 21 L62 28 L49 25 Z" fill="#7a1f18" stroke="#3e0f0a" strokeWidth="1.1" />
      <path d="M49 11 L62 14 L58 21 L49 19 Z" fill="#94322a" opacity="0.55" />
      <path d="M53 15 L57 16 M53 21 L58 22" stroke="#3e0f0a" strokeWidth="0.6" opacity="0.6" />
      <path d="M18 53 Q18 36 30 36 Q42 36 42 53 Z" fill="#54341f" stroke={GOLD_D} strokeWidth="1.2" />
      <path d="M18 53 Q18 36 30 36 L30 53 Z" fill="#6a4428" opacity="0.5" />
      <path d="M24 42 L36 42" stroke={GOLD} strokeWidth="1.4" opacity="0.7" />
      <path d="M22 30 Q22 22 30 22 Q38 22 38 30 L38 34 L22 34 Z" fill={PLATE} stroke={PLATE_D} strokeWidth="1.2" />
      <path d="M30 22 L30 34" stroke={PLATE_D} strokeWidth="0.6" opacity="0.5" />
      <rect x="28.6" y="28" width="2.8" height="5" rx="0.6" fill="#121a26" />
      <path d="M30 22 L27 12 L30 15 L33 12 Z" fill="#c0392b" stroke="#7a2018" strokeWidth="0.6" />
      <rect x="11" y="14" width="2.6" height="32" rx="0.6" fill={PLATE} stroke={PLATE_D} strokeWidth="0.9" transform="rotate(-11 12 30)" />
      <rect x="8" y="28" width="9" height="2.4" rx="0.5" fill={GOLD} stroke={GOLD_D} strokeWidth="0.5" transform="rotate(-11 12 29)" />
    </>
  );
}

/** A hulking rock golem (바위 골렘 · 수호). */
function Golem() {
  return (
    <>
      <rect x="19" y="29" width="26" height="24" rx="3" fill="#6d6a5e" stroke="#2f2c24" strokeWidth="1.7" />
      <path d="M19 32 Q19 29 22 29 L32 29 L32 53 L19 53 Z" fill="#7c796c" opacity="0.5" />
      <rect x="24" y="18" width="16" height="15" rx="3" fill="#7a776a" stroke="#2f2c24" strokeWidth="1.5" />
      <rect x="11" y="31" width="8" height="18" rx="2" fill="#636055" stroke="#2f2c24" strokeWidth="1.3" />
      <rect x="45" y="31" width="8" height="18" rx="2" fill="#636055" stroke="#2f2c24" strokeWidth="1.3" />
      <rect x="27" y="24" width="4" height="2.6" rx="0.6" fill="#8be3ff" />
      <rect x="33" y="24" width="4" height="2.6" rx="0.6" fill="#8be3ff" />
      <circle cx="29" cy="25.3" r="2.6" fill="#8be3ff" opacity="0.35" />
      <circle cx="35" cy="25.3" r="2.6" fill="#8be3ff" opacity="0.35" />
      <path d="M24 30 L28 33 M30 30 L27 34 M38 44 L42 40 M22 44 L26 48" stroke="#2f2c24" strokeWidth="1" opacity="0.5" fill="none" />
      <path d="M25 51 L28 47 L31 51 M35 40 L38 44 L41 40" stroke="#2f2c24" strokeWidth="0.8" opacity="0.4" fill="none" />
      <circle cx="40" cy="47" r="1.6" fill="#5a6b3a" opacity="0.7" />
      <circle cx="22" cy="35" r="1.2" fill="#5a6b3a" opacity="0.6" />
    </>
  );
}

/** A hooded necromancer with a floating skull (강령술사 · 유언). */
function Necromancer() {
  return (
    <>
      <path d="M18 53 Q18 25 32 25 Q46 25 46 53 Z" fill="#2a2440" stroke="#120e22" strokeWidth="1.5" />
      <path d="M18 53 Q18 25 32 25 L32 53 Z" fill="#372f52" opacity="0.5" />
      <path d="M32 33 L30 53 M32 33 L34 53" stroke="#120e22" strokeWidth="0.7" opacity="0.5" />
      <path d="M22 32 Q22 15 32 15 Q42 15 42 32 L38 34 Q32 30 26 34 Z" fill="#1a1630" stroke="#0a0818" strokeWidth="1.1" />
      <path d="M22 32 L20 16 Q26 13 32 15 M42 32 L44 16 Q38 13 32 15" stroke="#0a0818" strokeWidth="0.8" fill="none" />
      <ellipse cx="32" cy="31" rx="5.4" ry="6.4" fill="#0c0a16" />
      <circle cx="30" cy="30" r="1.5" fill="#b46cff" />
      <circle cx="34" cy="30" r="1.5" fill="#b46cff" />
      <circle cx="30" cy="30" r="3" fill="#a45cff" opacity="0.3" />
      <circle cx="34" cy="30" r="3" fill="#a45cff" opacity="0.3" />
      <circle cx="49" cy="19" r="4.4" fill="#e8e2d0" stroke="#b6ad92" strokeWidth="0.9" />
      <path d="M45 20 Q49 25 53 20" fill="#e8e2d0" stroke="#b6ad92" strokeWidth="0.7" />
      <ellipse cx="47.2" cy="18.5" rx="1.2" ry="1.5" fill="#2a2440" />
      <ellipse cx="50.8" cy="18.5" rx="1.2" ry="1.5" fill="#2a2440" />
      <path d="M47 23 L48 25 M51 23 L50 25" stroke="#b6ad92" strokeWidth="0.6" />
      <circle cx="49" cy="19" r="6.5" fill="#a45cff" opacity="0.18" />
    </>
  );
}

/** A fire dragon (화염룡). */
function Dragon() {
  return (
    <>
      {/* far wing + finger-spars */}
      <path d="M8 36 Q18 20 30 30 Q24 40 14 42 Q10 40 8 36 Z" fill="#8a2818" stroke="#4a1108" strokeWidth="1.3" />
      <path d="M8 36 Q18 20 30 30 Q22 30 14 34 Q10 36 8 36 Z" fill="#a8331f" opacity="0.5" />
      <path d="M12 39 Q18 26 28 29 M12 41 Q19 32 30 33 M13 37 Q18 24 26 27" stroke="#4a1108" strokeWidth="0.8" fill="none" opacity="0.55" />
      {/* curling spade tail */}
      <path d="M12 46 Q5 50 2 58 Q5 52 10 50 Q14 49 14 45 Z" fill="#a8331f" stroke="#521309" strokeWidth="1.2" />
      <path d="M2 58 Q0 54 1 50 Q4 53 4 57 Z" fill="#c24327" stroke="#521309" strokeWidth="0.8" />
      {/* body + belly highlight */}
      <path d="M12 46 Q22 26 42 30 L52 26 Q56 28 53 34 Q54 43 40 46 Q26 50 12 46 Z" fill="#a8331f" stroke="#521309" strokeWidth="1.5" />
      <path d="M12 46 Q22 26 42 30 L42 44 Q26 48 12 46 Z" fill="#bf3d24" opacity="0.4" />
      {/* scale rows */}
      <path d="M26 32 L30 34 M32 34 L36 36 M38 36 L42 38" stroke="#7a1e10" strokeWidth="0.8" opacity="0.6" fill="none" />
      <path d="M22 42 Q27 40 31 42 M20 38 Q25 36 29 38" stroke="#7a1e10" strokeWidth="0.7" opacity="0.5" fill="none" />
      {/* back spine spikes */}
      <path d="M30 30 L31 25 L35 30 Z M38 30 L40 25 L44 29 Z M46 28 L48 22 L51 27 Z" fill="#8a2818" stroke="#521309" strokeWidth="0.7" />
      {/* crest horns */}
      <path d="M52 24 L59 17 L57 27 Z" fill="#c24327" stroke="#521309" strokeWidth="0.9" />
      <path d="M46 25 L49 16 L52 26 Z" fill="#c24327" stroke="#521309" strokeWidth="0.9" />
      {/* brow + fierce eye */}
      <path d="M49 25 Q53 22.6 57 25" stroke="#521309" strokeWidth="1" fill="none" strokeLinecap="round" />
      <circle cx="53" cy="27" r="1.9" fill="#ffd24a" stroke="#7a4a08" strokeWidth="0.5" />
      <path d="M53 25.3 L53 28.7" stroke="#7a1e00" strokeWidth="0.9" strokeLinecap="round" />
      <circle cx="52.2" cy="26.1" r="0.5" fill="#fffbe8" />
      {/* fire breath */}
      <path d="M56 30 Q63 26 62 32 Q60 30 56 31 Q63 33 60 38 Q58 34 55 34 Q60 32 56 30 Z" fill="#ff6a1a" />
      <path d="M57 31 Q62 28 61 33 Q59 31 56 32 Q61 34 58 37 Q57 34 56 33 Z" fill="#ff9a3c" opacity="0.9" />
      <path d="M57 31 Q61 30 60 33 Q58 32 57 32 Z" fill="#ffe08a" opacity="0.85" />
      <circle cx="60" cy="32" r="0.9" fill="#fffbe8" />
      <circle cx="61" cy="37" r="0.8" fill="#ffb43a" opacity="0.7" />
      <circle cx="57" cy="40" r="0.6" fill="#ff9a3c" opacity="0.6" />
      {/* forelegs + claws */}
      <path d="M15 44 L13 52 M25 46 L24 54 M35 45 L35 53 M44 44 L45 51" stroke="#4a1108" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M13 52 L11 53 M24 54 L22 55 M35 53 L37 54 M45 51 L47 52" stroke="#e8e2d0" strokeWidth="1" strokeLinecap="round" />
    </>
  );
}

/** A winged archangel (대천사 · 신성한 보호막). */
function Archangel() {
  return (
    <>
      <path d="M32 20 Q12 20 9 42 Q16 36 22 38 Q16 32 24 34 Q18 28 32 38 Z" fill="#f4efe0" stroke="#cfc6ac" strokeWidth="1.1" />
      <path d="M32 20 Q52 20 55 42 Q48 36 42 38 Q48 32 40 34 Q46 28 32 38 Z" fill="#f4efe0" stroke="#cfc6ac" strokeWidth="1.1" />
      <path d="M14 34 Q20 34 24 37 M20 30 Q26 31 30 36 M50 34 Q44 34 40 37 M44 30 Q38 31 34 36" stroke="#cfc6ac" strokeWidth="0.6" fill="none" opacity="0.7" />
      <path d="M24 53 Q24 31 32 31 Q40 31 40 53 Z" fill="#eef2fa" stroke="#c2c9d6" strokeWidth="1.3" />
      <path d="M24 53 Q24 31 32 31 L32 53 Z" fill="#f8fbff" opacity="0.6" />
      <path d="M32 36 L32 53" stroke="#c2c9d6" strokeWidth="0.7" opacity="0.6" />
      <circle cx="32" cy="24" r="6.4" fill={SKIN} stroke={SKIN_D} strokeWidth="1.1" />
      <ellipse cx="32" cy="14" rx="6.5" ry="2.2" fill="none" stroke={GOLD} strokeWidth="1.8" />
      <ellipse cx="32" cy="14" rx="6.5" ry="2.2" fill="#fff2c0" opacity="0.3" />
      <path d="M32 39 L32 50 M27 43 L37 43" stroke={GOLD} strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="30" cy="24" r="0.9" fill="#26303e" />
      <circle cx="34" cy="24" r="0.9" fill="#26303e" />
    </>
  );
}

/* ── Spells ── */

/** A slashing blade arc (강타). */
function StrikeArt() {
  return (
    <>
      <path d="M10 50 Q30 14 56 20" stroke="#eef2fa" strokeWidth="5.5" fill="none" strokeLinecap="round" />
      <path d="M10 50 Q30 14 56 20" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.9" />
      <path d="M13 47 Q32 18 50 22" stroke="#8fa0c0" strokeWidth="1.4" fill="none" strokeLinecap="round" opacity="0.55" />
      <path d="M18 42 Q34 24 46 26" stroke="#c8d4e8" strokeWidth="1" fill="none" strokeLinecap="round" opacity="0.4" />
      <path d="M50 14 L60 19 L51 25 Z" fill="#eef2fa" stroke="#a8b4c8" strokeWidth="0.6" />
      <path d="M50 20 L44 22 M52 24 L47 27" stroke="#fff" strokeWidth="1" strokeLinecap="round" opacity="0.7" />
      <path d="M52 21 L58 18 M53 24 L59 25 M50 26 L54 31" stroke="#eef2fa" strokeWidth="1.4" strokeLinecap="round" opacity="0.8" />
    </>
  );
}

/** A hurled firebolt (화염 화살). */
function FireboltArt() {
  return (
    <>
      <path d="M8 50 Q22 40 34 32" stroke="#ff6a1a" strokeWidth="5" fill="none" strokeLinecap="round" opacity="0.4" />
      <path d="M12 48 Q24 40 36 32" stroke="#ff9a3c" strokeWidth="2.6" fill="none" strokeLinecap="round" opacity="0.7" />
      <path d="M16 46 Q24 42 32 38" stroke="#ffe08a" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.6" />
      <circle cx="44" cy="27" r="9.5" fill="#ff6a1a" opacity="0.35" />
      <circle cx="44" cy="27" r="7.6" fill="#ff9a3c" stroke="#c2400f" strokeWidth="0.8" />
      <circle cx="44" cy="27" r="4.2" fill="#ffe08a" />
      <circle cx="42.5" cy="25.5" r="1.8" fill="#fffbe8" />
      <path d="M44 17 Q49 21 47 27 Q52 23 50 16 Z" fill="#ff6a1a" />
      <path d="M52 22 L57 18 M53 28 L58 30 M50 32 L53 37" stroke="#ffb43a" strokeWidth="1.2" strokeLinecap="round" opacity="0.7" />
    </>
  );
}

/** A descending shaft of holy light (성스러운 빛). */
function HolylightArt() {
  return (
    <>
      <path d="M22 6 L42 6 L36 44 L28 44 Z" fill="#fff2c0" opacity="0.35" />
      <path d="M26 6 L38 6 L34 44 L30 44 Z" fill="#fff7d8" opacity="0.6" />
      <path d="M29 6 L35 6 L33 44 L31 44 Z" fill="#fffbe8" opacity="0.9" />
      <path d="M18 12 L26 40 M46 12 L38 40" stroke="#fff2c0" strokeWidth="1" opacity="0.3" strokeLinecap="round" />
      <circle cx="32" cy="45" r="8.5" fill="#ffe08a" opacity="0.4" />
      <circle cx="32" cy="45" r="5.5" fill="#fff7d8" />
      <circle cx="32" cy="45" r="2.6" fill="#fffbe8" />
      <path d="M32 35 L32 55 M22 45 L42 45" stroke={GOLD} strokeWidth="2.2" strokeLinecap="round" opacity="0.85" />
      <path d="M25 38 L39 52 M39 38 L25 52" stroke="#ffe08a" strokeWidth="1" strokeLinecap="round" opacity="0.5" />
    </>
  );
}

/** A sweeping wall of flame (화염 폭풍). */
function FlamestrikeArt() {
  return (
    <>
      <path d="M8 52 Q13 28 18 44 Q23 20 28 44 Q32 24 36 44 Q41 20 46 44 Q51 28 56 52 Z" fill="#ff6a1a" stroke="#8a2818" strokeWidth="1.2" />
      <path d="M12 51 Q16 34 20 46 Q25 26 29 46 Q33 30 37 46 Q42 26 46 46 Q50 34 52 51 Z" fill="#ff9a3c" opacity="0.9" />
      <path d="M16 49 Q20 38 24 49 Q28 34 32 49 Q36 38 40 49 Q44 40 47 49 Z" fill="#ffe08a" opacity="0.85" />
      <path d="M24 46 Q27 40 30 46 Q33 40 36 46 Z" fill="#fffbe8" opacity="0.8" />
      <circle cx="20" cy="24" r="1.4" fill="#ffb43a" opacity="0.7" />
      <circle cx="42" cy="22" r="1.6" fill="#ffb43a" opacity="0.7" />
      <circle cx="32" cy="18" r="1.2" fill="#ffe08a" opacity="0.6" />
    </>
  );
}

/** An upward blessing sigil (축복). */
function BlessArt() {
  return (
    <>
      <circle cx="32" cy="30" r="18" fill="#fff2c0" opacity="0.12" />
      <path d="M32 50 L32 12 M18 26 L32 10 L46 26" stroke="#fff7d8" strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
      <path d="M32 50 L32 12 M19 25 L32 11 L45 25" stroke="#ffe08a" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M32 48 L32 14" stroke="#fffbe8" strokeWidth="1.2" strokeLinecap="round" opacity="0.9" />
      <circle cx="32" cy="10" r="3.4" fill="#fffbe8" />
      <circle cx="32" cy="10" r="5.5" fill="#ffe08a" opacity="0.4" />
      <path d="M14 18 L18 22 M50 18 L46 22 M12 34 L16 34 M52 34 L48 34" stroke="#ffe08a" strokeWidth="1.4" strokeLinecap="round" opacity="0.7" />
      <circle cx="20" cy="42" r="1.5" fill="#ffe08a" opacity="0.7" />
      <circle cx="44" cy="42" r="1.5" fill="#ffe08a" opacity="0.7" />
    </>
  );
}

/** Bursting frost shards (서리 충격). */
function FrostshockArt() {
  return (
    <>
      <circle cx="32" cy="32" r="17" fill="#bfe9ff" opacity="0.12" />
      <path d="M32 12 L32 52 M15 22 L49 42 M49 22 L15 42" stroke="#8fd6f0" strokeWidth="4" strokeLinecap="round" opacity="0.5" />
      <path d="M32 12 L32 52 M15 22 L49 42 M49 22 L15 42" stroke="#eafaff" strokeWidth="2" strokeLinecap="round" />
      <path d="M32 12 L28 17 L36 17 Z M32 52 L28 47 L36 47 Z" fill="#eafaff" />
      <path d="M15 22 L15 28 L21 25 Z M49 42 L49 36 L43 39 Z M49 22 L49 28 L43 25 Z M15 42 L15 36 L21 39 Z" fill="#eafaff" opacity="0.9" />
      <path d="M32 22 L28 26 M32 22 L36 26 M32 42 L28 38 M32 42 L36 38 M24 32 L28 28 M24 32 L28 36 M40 32 L36 28 M40 32 L36 36" stroke="#dff4ff" strokeWidth="1" strokeLinecap="round" opacity="0.7" />
      <circle cx="32" cy="32" r="3.8" fill="#fff" />
      <circle cx="32" cy="32" r="2" fill="#bfe9ff" />
    </>
  );
}

/** A poised assassin's dagger (암살). */
function AssassinateArt() {
  return (
    <>
      <path d="M42 10 L50 16 L28 46 L22 40 Z" fill="#cfd8e6" stroke="#79839a" strokeWidth="1.1" />
      <path d="M42 10 L47 14 L26 42 L23 40 Z" fill="#f4f7fc" />
      <path d="M42 10 L50 16 L46 18 Z" fill="#a8b4c8" />
      <path d="M30 26 L38 32" stroke="#a8b4c8" strokeWidth="0.7" opacity="0.6" />
      <rect x="17" y="40" width="12" height="4.5" rx="1.2" fill="#8a1f18" stroke="#4a0f0a" strokeWidth="0.7" transform="rotate(45 23 42)" />
      <circle cx="20" cy="38" r="2.4" fill="#3a2418" stroke="#1a0e08" strokeWidth="0.6" />
      <circle cx="16" cy="50" r="3.4" fill="#c4182c" opacity="0.85" />
      <path d="M16 46 Q18 50 15 54" stroke="#c4182c" strokeWidth="1.4" fill="none" strokeLinecap="round" opacity="0.7" />
      <circle cx="22" cy="54" r="1.4" fill="#c4182c" opacity="0.6" />
    </>
  );
}

/** A rallying war horn (전투의 뿔피리). */
function WarhornArt() {
  return (
    <>
      <path d="M10 38 Q30 20 50 32 Q46 42 34 42 Q28 46 20 44 Q13 43 10 38 Z" fill="#d9b878" stroke="#8a6636" strokeWidth="1.5" />
      <path d="M10 38 Q30 20 50 32 Q40 30 30 34 Q18 38 10 38 Z" fill="#e8d8a8" opacity="0.6" />
      <path d="M48 28 Q56 28 56 36 Q51 36 47 39 Z" fill="#e8d8a8" stroke="#8a6636" strokeWidth="1.2" />
      <path d="M18 40 Q26 47 38 45" stroke="#c8922f" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <circle cx="16" cy="38" r="2.2" fill={GOLD} stroke={GOLD_D} strokeWidth="0.6" />
      <path d="M52 22 L56 19 M54 27 L60 26 M53 32 L58 35 M55 15 L57 11" stroke={GOLD} strokeWidth="1.8" strokeLinecap="round" opacity="0.85" />
      <path d="M56 18 L62 14 M58 24 L64 23" stroke="#ffe08a" strokeWidth="1.2" strokeLinecap="round" opacity="0.6" />
    </>
  );
}

/** An open tome of arcane insight (비전 지식). */
function InsightArt() {
  return (
    <>
      <path d="M12 26 Q23 21 32 26 L32 50 Q23 45 12 50 Z" fill="#eae4d2" stroke="#b6ad92" strokeWidth="1.3" />
      <path d="M52 26 Q41 21 32 26 L32 50 Q41 45 52 50 Z" fill="#dcd2b4" stroke="#b6ad92" strokeWidth="1.3" />
      <path d="M32 26 L32 50" stroke="#a89a72" strokeWidth="1.2" />
      <path d="M17 30 L28 30 M17 34 L28 34 M17 38 L26 38 M36 30 L47 30 M36 34 L47 34 M38 38 L47 38" stroke="#a89a72" strokeWidth="0.9" opacity="0.8" />
      <circle cx="32" cy="16" r="4.6" fill="#a45cff" opacity="0.5" />
      <circle cx="32" cy="16" r="2.6" fill="#c8a0ff" />
      <path d="M32 8 L32 12 M25 12 L28 15 M39 12 L36 15 M23 18 L26 18 M41 18 L38 18" stroke="#c8a0ff" strokeWidth="1.2" strokeLinecap="round" opacity="0.8" />
    </>
  );
}

/** A surging mana crystal (마나샘). */
function ManasurgeArt() {
  return (
    <>
      <path d="M32 10 L44 30 L32 54 L20 30 Z" fill="#5aa0ff" stroke="#22407a" strokeWidth="1.5" />
      <path d="M32 10 L38 30 L32 54 L32 10 Z" fill="#8ec4ff" opacity="0.85" />
      <path d="M32 10 L26 30 L32 54" stroke="#22407a" strokeWidth="0.8" opacity="0.5" />
      <path d="M20 30 L44 30" stroke="#22407a" strokeWidth="0.8" opacity="0.5" />
      <path d="M28 20 L34 18" stroke="#dff0ff" strokeWidth="1.4" strokeLinecap="round" opacity="0.8" />
      <circle cx="32" cy="30" r="7" fill="#bfe0ff" opacity="0.35" />
      <circle cx="14" cy="42" r="1.8" fill="#bfe0ff" opacity="0.85" />
      <circle cx="50" cy="20" r="1.8" fill="#bfe0ff" opacity="0.85" />
      <circle cx="48" cy="44" r="1.3" fill="#bfe0ff" opacity="0.7" />
      <path d="M14 36 L16 40 M50 26 L48 30" stroke="#8ec4ff" strokeWidth="1" strokeLinecap="round" opacity="0.6" />
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
  physical:  { sky1: '#1e2a4a', sky2: '#33405f', horizon: '#f0b45a', g1: '#2c2114', g2: '#0e0a07', haze: '#f0b45a' },
  fire:      { sky1: '#3a1408', sky2: '#7a2810', horizon: '#ff8a1a', g1: '#3a1408', g2: '#160604', haze: '#ff8a1a' },
  holy:      { sky1: '#3a2c10', sky2: '#7a5c1e', horizon: '#ffdc7a', g1: '#332812', g2: '#150f07', haze: '#ffdc7a' },
  lightning: { sky1: '#221846', sky2: '#43307a', horizon: '#f4d23a', g1: '#241a34', g2: '#0e0918', haze: '#f4d23a' },
  poison:    { sky1: '#182814', sky2: '#33521c', horizon: '#a8e03a', g1: '#1a2810', g2: '#080f05', haze: '#a8e03a' },
  ice:       { sky1: '#12303e', sky2: '#2a5e72', horizon: '#bff0fa', g1: '#16323c', g2: '#08161c', haze: '#bff0fa' },
  none:      { sky1: '#2a1a3e', sky2: '#4e327a', horizon: '#e8b45a', g1: '#241a24', g2: '#100a12', haze: '#e8b45a' },
};

export function CardArt({ id, size = 44 }: Props) {
  const Art = ART[id];
  // Custom art override: if the artist drops `public/cards/<id>.png`, it renders in place of the
  // coded SVG. When that file is absent the <image> 404s → onError falls back to the coded art.
  const [failedId, setFailedId] = useState<string | null>(null);
  const useCustom = failedId !== id;
  if (!Art && !useCustom) return null;
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
          <stop offset="0" stopColor={s.horizon} stopOpacity="0.95" />
          <stop offset="0.5" stopColor={s.horizon} stopOpacity="0.45" />
          <stop offset="1" stopColor={s.horizon} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`ca-ground-${el}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={s.g1} />
          <stop offset="1" stopColor={s.g2} />
        </linearGradient>
        {/* framing vignette to keep the illustration reading as a windowed scene */}
        <radialGradient id="ca-vig" cx="0.5" cy="0.44" r="0.72">
          <stop offset="0.68" stopColor="#04060a" stopOpacity="0" />
          <stop offset="1" stopColor="#03040a" stopOpacity="0.42" />
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
      <rect x="0" y="38.4" width="64" height="1.6" fill={s.haze} opacity="0.6" style={{ mixBlendMode: 'screen' }} />
      {/* framing vignette + grounding contact shadow so the subject sits in the scene */}
      <rect x="0" y="0" width="64" height="64" fill="url(#ca-vig)" />
      <ellipse cx="32" cy="56" rx="17" ry="4.2" fill="url(#ca-floor)" />
      {/* the illustration, stamped with a bold ink outline and a soft cast shadow.
          a custom PNG (public/cards/<id>.png) wins; otherwise the coded SVG art renders. */}
      {useCustom ? (
        <image
          href={`/cards/${id}.png`}
          x="6"
          y="6"
          width="52"
          height="52"
          preserveAspectRatio="xMidYMid meet"
          filter="url(#ca-pop)"
          onError={() => setFailedId(id)}
        />
      ) : Art ? (
        <g filter="url(#ca-pop)"><Art /></g>
      ) : null}
      {/* faint overhead light wash across the top half */}
      <rect x="0" y="0" width="64" height="28" fill="url(#ca-toplight)" style={{ mixBlendMode: 'screen' }} />
    </svg>
  );
}
