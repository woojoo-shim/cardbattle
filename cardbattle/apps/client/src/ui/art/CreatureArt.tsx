/** Hand-drawn SVG creature portraits — replaces emoji faces. Stylized dark-fantasy
 * head-and-shoulders busts with neon rim light. 64x64 viewBox; scale via `size`. */

const RED = '#ff3b6b';
const TEAL = '#38e8c8';

function EyeGlow({ x, color = RED }: { x: number; color?: string }) {
  return (
    <>
      <circle cx={x} cy={30} r="4.5" fill={color} opacity="0.5" style={{ filter: 'blur(2px)' }} />
      <circle cx={x} cy={30} r="2" fill="#fff" />
    </>
  );
}

/** 0 — Hooded sorcerer */
function Mage() {
  return (
    <>
      <path d="M32 6 C16 6 12 24 12 40 L12 60 L52 60 L52 40 C52 24 48 6 32 6 Z" fill="#241a3a" stroke="#5a3fa0" strokeWidth="1.5" />
      <path d="M32 6 C20 6 15 20 16 34 L48 34 C49 20 44 6 32 6 Z" fill="#160f26" />
      <path d="M22 30 Q32 24 42 30 L42 40 Q32 46 22 40 Z" fill="#0a0710" />
      <EyeGlow x={26} color="#8b6cff" />
      <EyeGlow x={38} color="#8b6cff" />
      <path d="M12 40 L8 58 L18 54" fill="#241a3a" stroke="#5a3fa0" strokeWidth="1.2" />
    </>
  );
}

/** 1 — Goblin imp */
function Goblin() {
  return (
    <>
      <path d="M10 26 L24 34 L18 20 Z" fill="#4a7a32" stroke="#2f5320" strokeWidth="1" />
      <path d="M54 26 L40 34 L46 20 Z" fill="#4a7a32" stroke="#2f5320" strokeWidth="1" />
      <path d="M32 14 C18 14 16 32 18 44 C20 56 44 56 46 44 C48 32 46 14 32 14 Z" fill="#5a8f3c" stroke="#34521f" strokeWidth="1.5" />
      <path d="M22 40 Q32 36 42 40 L38 48 Q32 52 26 48 Z" fill="#3a5e26" />
      <EyeGlow x={26} color="#ffd84a" />
      <EyeGlow x={38} color="#ffd84a" />
      <path d="M26 46 L29 50 L32 46 L35 50 L38 46" fill="none" stroke="#f0f0e0" strokeWidth="1.4" />
      <path d="M30 26 Q32 30 34 26" fill="none" stroke="#34521f" strokeWidth="1.2" />
    </>
  );
}

/** 2 — Automaton */
function Automaton() {
  return (
    <>
      <path d="M16 16 L48 16 L52 24 L52 52 L12 52 L12 24 Z" fill="#283044" stroke="#566180" strokeWidth="1.5" />
      <path d="M16 16 L32 16 L32 52 L12 52 L12 24 Z" fill="#1f2638" opacity="0.6" />
      <rect x="20" y="26" width="24" height="12" rx="2" fill="#0a0d14" stroke="#3a4256" strokeWidth="1.2" />
      <rect x="22" y="29" width="20" height="2" fill={RED} opacity="0.5" />
      <circle cx="32" cy="32" r="3.5" fill={RED} style={{ filter: 'blur(0.5px)' }} />
      <circle cx="32" cy="32" r="1.5" fill="#fff" />
      <rect x="22" y="44" width="20" height="4" rx="1" fill="#161b27" stroke="#3a4256" strokeWidth="0.8" />
      <line x1="26" y1="44" x2="26" y2="48" stroke="#3a4256" strokeWidth="0.8" />
      <line x1="32" y1="44" x2="32" y2="48" stroke="#3a4256" strokeWidth="0.8" />
      <line x1="38" y1="44" x2="38" y2="48" stroke="#3a4256" strokeWidth="0.8" />
      <line x1="32" y1="8" x2="32" y2="16" stroke="#566180" strokeWidth="1.5" />
      <circle cx="32" cy="7" r="2.5" fill={RED} />
    </>
  );
}

/** 3 — Dragon */
function Dragon() {
  return (
    <>
      <path d="M18 10 L24 22 L14 20 Z" fill="#7a2f3a" stroke="#4a1c24" strokeWidth="1" />
      <path d="M46 10 L40 22 L50 20 Z" fill="#7a2f3a" stroke="#4a1c24" strokeWidth="1" />
      <path d="M32 12 C20 12 16 26 18 38 C20 50 28 58 32 58 C36 58 44 50 46 38 C48 26 44 12 32 12 Z" fill="#9a3a48" stroke="#5a232c" strokeWidth="1.5" />
      <path d="M24 44 L32 56 L40 44 C40 50 36 54 32 54 C28 54 24 50 24 44 Z" fill="#3a1219" />
      <path d="M26 48 L28 52 M30 48 L31 53 M34 48 L33 53 M38 48 L36 52" stroke="#f0e6d0" strokeWidth="1.3" />
      <EyeGlow x={25} color="#ffd84a" />
      <EyeGlow x={39} color="#ffd84a" />
      <path d="M28 38 Q32 41 36 38" fill="none" stroke="#5a232c" strokeWidth="1" />
      <circle cx="29" cy="40" r="1" fill="#3a1219" />
      <circle cx="35" cy="40" r="1" fill="#3a1219" />
    </>
  );
}

/** 4 — Ogre brute */
function Ogre() {
  return (
    <>
      <path d="M32 12 C18 12 14 28 16 42 C18 54 46 54 48 42 C50 28 46 12 32 12 Z" fill="#7c6a52" stroke="#4e4133" strokeWidth="1.5" />
      <path d="M20 22 Q26 18 30 22" fill="none" stroke="#4e4133" strokeWidth="2" />
      <path d="M34 22 Q38 18 44 22" fill="none" stroke="#4e4133" strokeWidth="2" />
      <EyeGlow x={26} color={RED} />
      <EyeGlow x={38} color={RED} />
      <path d="M22 44 L26 40 L26 50 Z" fill="#f0ecd8" stroke="#cfc9b0" strokeWidth="0.8" />
      <path d="M42 44 L38 40 L38 50 Z" fill="#f0ecd8" stroke="#cfc9b0" strokeWidth="0.8" />
      <path d="M26 44 Q32 48 38 44" fill="none" stroke="#4e4133" strokeWidth="1.5" />
      <ellipse cx="32" cy="38" rx="3" ry="2" fill="#5e4f3c" />
    </>
  );
}

/** 5 — Vampire */
function Vampire() {
  return (
    <>
      <path d="M14 56 L32 30 L50 56 Z" fill="#1a1320" stroke="#3a2a44" strokeWidth="1.2" />
      <path d="M32 10 C22 10 18 22 20 34 C22 46 28 50 32 50 C36 50 42 46 44 34 C46 22 42 10 32 10 Z" fill="#d9d2e0" stroke="#a89cb8" strokeWidth="1" />
      <path d="M20 16 L32 24 L44 16 L44 12 L32 18 L20 12 Z" fill="#120c18" />
      <EyeGlow x={26} color={RED} />
      <EyeGlow x={38} color={RED} />
      <path d="M28 40 Q32 44 36 40" fill="none" stroke="#7a2030" strokeWidth="1.2" />
      <path d="M29 40 L30 45 L31 40 Z" fill="#fff" />
      <path d="M35 40 L34 45 L33 40 Z" fill="#fff" />
      <path d="M32 30 L26 56 M32 30 L38 56" stroke="#2a1f30" strokeWidth="1" />
    </>
  );
}

/** 6 — Bat */
function Bat() {
  return (
    <>
      <path d="M32 26 C20 18 8 22 4 32 C12 30 12 36 18 34 C16 40 24 38 26 34 C28 36 30 32 32 36 Z" fill="#2a2336" stroke="#4a3f5a" strokeWidth="1" />
      <path d="M32 26 C44 18 56 22 60 32 C52 30 52 36 46 34 C48 40 40 38 38 34 C36 36 34 32 32 36 Z" fill="#2a2336" stroke="#4a3f5a" strokeWidth="1" />
      <ellipse cx="32" cy="34" rx="9" ry="11" fill="#3a3048" stroke="#574a68" strokeWidth="1.2" />
      <path d="M26 24 L29 30 L23 29 Z" fill="#3a3048" stroke="#574a68" strokeWidth="0.8" />
      <path d="M38 24 L35 30 L41 29 Z" fill="#3a3048" stroke="#574a68" strokeWidth="0.8" />
      <EyeGlow x={28} color={RED} />
      <EyeGlow x={36} color={RED} />
      <path d="M30 40 L32 43 L34 40" fill="none" stroke="#d8d0e0" strokeWidth="1.2" />
    </>
  );
}

/** 7 — Ghost wraith */
function Ghost() {
  return (
    <>
      <circle cx="32" cy="34" r="22" fill={TEAL} opacity="0.15" style={{ filter: 'blur(6px)' }} />
      <path d="M32 8 C20 8 16 22 16 36 L16 56 L22 50 L27 56 L32 50 L37 56 L42 50 L48 56 L48 36 C48 22 44 8 32 8 Z"
        fill="#1a2a30" stroke="#3aa89a" strokeWidth="1.4" opacity="0.92" />
      <path d="M22 28 Q26 24 30 28 L30 36 Q26 40 22 36 Z" fill="#06110f" />
      <path d="M34 28 Q38 24 42 28 L42 36 Q38 40 34 36 Z" fill="#06110f" />
      <EyeGlow x={26} color={TEAL} />
      <EyeGlow x={38} color={TEAL} />
      <path d="M28 44 Q32 40 36 44" fill="none" stroke="#3aa89a" strokeWidth="1.2" />
    </>
  );
}

/** Hero — knight helm */
function Hero() {
  return (
    <>
      <circle cx="32" cy="32" r="22" fill={TEAL} opacity="0.16" style={{ filter: 'blur(6px)' }} />
      <path d="M32 8 C20 8 16 22 16 36 C16 50 24 58 32 58 C40 58 48 50 48 36 C48 22 44 8 32 8 Z" fill="#1c2738" stroke={TEAL} strokeWidth="1.6" />
      <path d="M22 26 L42 26 L42 32 L36 32 L36 30 L28 30 L28 32 L22 32 Z" fill="#06110f" />
      <rect x="30" y="30" width="4" height="18" rx="1.5" fill="#06110f" />
      <EyeGlow x={26} color={TEAL} />
      <EyeGlow x={38} color={TEAL} />
      <path d="M32 4 L32 10 M28 6 L36 6" stroke={TEAL} strokeWidth="1.5" />
      <path d="M20 22 Q32 16 44 22" fill="none" stroke={TEAL} strokeWidth="1" opacity="0.6" />
    </>
  );
}

const CREATURES = [Mage, Goblin, Automaton, Dragon, Ogre, Vampire, Bat, Ghost];

export function CreatureArt({ seat, size = 58 }: { seat: number; size?: number }) {
  const Art = CREATURES[seat % CREATURES.length];
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden style={{ display: 'block' }}>
      <Art />
    </svg>
  );
}

export function HeroArt({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden style={{ display: 'block' }}>
      <Hero />
    </svg>
  );
}
