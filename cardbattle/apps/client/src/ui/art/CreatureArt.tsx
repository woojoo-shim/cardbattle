/** Hand-drawn SVG creature portraits — replaces emoji faces. Stylized dark-fantasy
 * head-and-shoulders busts, crisp inked (no blur bloom). 64x64 viewBox; scale via `size`. */

// De-neoned to match the parchment/candlelight art direction: the old neon-pink /
// neon-cyan accents read as loud on the muted table, so they're now an ember
// oxblood and a faded verdigris teal. Eyes/lenses are crisp inked discs, not soft
// glowing halos, so the portraits read as deliberate vector art, not cheap AI bloom.
const RED = '#c2543a';
const TEAL = '#79b0a2';

/** Crisp inked eye — a solid tinted disc with a sharp dark rim and a hard catch-light.
 *  No blur bloom (the old glowy version read as a cheap AI-portrait halo). */
function Eye({ x, color = RED }: { x: number; color?: string }) {
  return (
    <>
      <circle cx={x} cy={30} r="3.1" fill={color} stroke="#0a0710" strokeWidth="0.8" />
      <circle cx={x - 0.9} cy={29.1} r="1" fill="#fff" />
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
      <Eye x={26} color="#8b6cff" />
      <Eye x={38} color="#8b6cff" />
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
      <Eye x={26} color="#ffd84a" />
      <Eye x={38} color="#ffd84a" />
      <path d="M26 46 L29 50 L32 46 L35 50 L38 46" fill="none" stroke="#f0f0e0" strokeWidth="1.4" />
      <path d="M30 26 Q32 30 34 26" fill="none" stroke="#34521f" strokeWidth="1.2" />
    </>
  );
}

/** Shared metal chassis (shoulders + neck) every bot head sits on, so the machines read as
 *  busts seated at the table like the creatures do. Drawn first; the head overlaps the neck. */
function Chassis() {
  return (
    <>
      <path d="M7 60 L8 51 Q9 43 20 42 L44 42 Q55 43 56 51 L57 60 Z" fill="#222a3a" stroke="#3a4256" strokeWidth="1.2" />
      <path d="M7 60 L8 51 Q9 43 20 42 L32 42 L32 60 Z" fill="#1b2130" opacity="0.55" />
      <rect x="27" y="37" width="10" height="8" rx="1.5" fill="#1a2130" stroke="#3a4256" strokeWidth="0.8" />
      <circle cx="24" cy="53" r="1.3" fill="#3a4256" /><circle cx="40" cy="53" r="1.3" fill="#3a4256" />
    </>
  );
}

/** 2 — Bot family. Each is a distinct grimy back-room machine; `tint` lights its glowing eyes. */
function Bot0({ tint = RED }: { tint?: string }) {
  return (
    <><Chassis />
      <rect x="15" y="12" width="34" height="28" rx="5" fill="#283044" stroke="#566180" strokeWidth="1.5" />
      <rect x="15" y="12" width="17" height="28" rx="5" fill="#1f2638" opacity="0.5" />
      <line x1="32" y1="5" x2="32" y2="12" stroke="#566180" strokeWidth="1.5" /><circle cx="32" cy="4" r="2.4" fill={tint} />
      <rect x="19" y="20" width="26" height="12" rx="2.5" fill="#0a0d14" stroke="#3a4256" strokeWidth="1" />
      <rect x="21" y="24.5" width="22" height="3.4" rx="1.5" fill={tint} opacity="0.85" />
      <circle cx="32" cy="26" r="2.1" fill="#fff" />
      <circle cx="19" cy="16" r="1" fill="#3a4256" /><circle cx="45" cy="16" r="1" fill="#3a4256" />
    </>
  );
}
/** dome cyclops */
function Bot1({ tint = RED }: { tint?: string }) {
  return (
    <><Chassis />
      <path d="M14 41 L14 30 A18 18 0 0 1 50 30 L50 41 Z" fill="#283044" stroke="#566180" strokeWidth="1.5" />
      <path d="M14 30 A18 18 0 0 1 32 12 L32 41 L14 41 Z" fill="#1f2638" opacity="0.5" />
      <line x1="32" y1="4" x2="32" y2="13" stroke="#566180" strokeWidth="1.5" /><circle cx="32" cy="3" r="2.2" fill={tint} />
      <circle cx="32" cy="29" r="8" fill="#0a0d14" stroke="#3a4256" strokeWidth="1.2" />
      <circle cx="32" cy="29" r="5" fill={tint} stroke="#0a0d14" strokeWidth="0.8" />
      <circle cx="30.8" cy="27.8" r="1.4" fill="#fff" />
      <rect x="10" y="31" width="4" height="6" rx="1" fill="#232a3a" stroke="#3a4256" strokeWidth="0.8" />
      <rect x="50" y="31" width="4" height="6" rx="1" fill="#232a3a" stroke="#3a4256" strokeWidth="0.8" />
    </>
  );
}
/** CRT monitor head */
function Bot2({ tint = RED }: { tint?: string }) {
  return (
    <><Chassis />
      <rect x="13" y="12" width="38" height="30" rx="7" fill="#2a3140" stroke="#566180" strokeWidth="1.5" />
      <rect x="18" y="16" width="28" height="22" rx="6" fill="#0a1512" stroke="#1f4640" strokeWidth="1" />
      <path d="M20 18 Q32 15 44 18" stroke="#2a5a50" strokeWidth="0.8" fill="none" opacity="0.6" />
      <circle cx="26" cy="26" r="2.4" fill={tint} /><circle cx="38" cy="26" r="2.4" fill={tint} />
      <path d="M26 33 Q32 36 38 33" stroke={tint} strokeWidth="1.4" fill="none" opacity="0.8" />
      <g stroke={tint} strokeWidth="0.4" opacity="0.22"><line x1="19" y1="22" x2="45" y2="22" /><line x1="19" y1="30" x2="45" y2="30" /></g>
      <circle cx="49" cy="39" r="1.8" fill="#232a3a" stroke="#3a4256" strokeWidth="0.8" />
    </>
  );
}
/** riveted goggle bot */
function Bot3({ tint = RED }: { tint?: string }) {
  return (
    <><Chassis />
      <path d="M16 12 L48 12 L50 32 Q32 40 14 32 Z" fill="#283044" stroke="#566180" strokeWidth="1.5" />
      <path d="M16 12 L32 12 L32 38 Q22 37 14 32 Z" fill="#1f2638" opacity="0.45" />
      <circle cx="25" cy="23" r="5" fill="#0a0d14" stroke="#3a4256" strokeWidth="1.2" />
      <circle cx="39" cy="23" r="5" fill="#0a0d14" stroke="#3a4256" strokeWidth="1.2" />
      <circle cx="25" cy="23" r="2.2" fill={tint} /><circle cx="39" cy="23" r="2.2" fill={tint} />
      <path d="M22 32 L42 32 L40 37 Q32 40 24 37 Z" fill="#12161f" stroke="#3a4256" strokeWidth="0.8" />
      <g stroke="#3a4256" strokeWidth="0.7"><line x1="28" y1="32" x2="28" y2="38" /><line x1="32" y1="33" x2="32" y2="39" /><line x1="36" y1="32" x2="36" y2="38" /></g>
      <circle cx="19" cy="15" r="1" fill="#3a4256" /><circle cx="45" cy="15" r="1" fill="#3a4256" />
    </>
  );
}
/** narrow periscope */
function Bot4({ tint = RED }: { tint?: string }) {
  return (
    <><Chassis />
      <rect x="22" y="8" width="20" height="34" rx="4" fill="#283044" stroke="#566180" strokeWidth="1.5" />
      <rect x="22" y="8" width="10" height="34" rx="4" fill="#1f2638" opacity="0.5" />
      <circle cx="32" cy="6" r="2" fill={tint} />
      <rect x="25" y="19" width="14" height="6" rx="2" fill="#0a0d14" stroke="#3a4256" strokeWidth="1" />
      <rect x="26.5" y="21" width="11" height="2.4" fill={tint} />
      <g stroke="#3a4256" strokeWidth="0.8"><line x1="26" y1="30" x2="38" y2="30" /><line x1="26" y1="33" x2="38" y2="33" /><line x1="26" y1="36" x2="38" y2="36" /></g>
      <rect x="14" y="17" width="8" height="3" rx="1" fill="#232a3a" stroke="#3a4256" strokeWidth="0.6" />
      <rect x="42" y="17" width="8" height="3" rx="1" fill="#232a3a" stroke="#3a4256" strokeWidth="0.6" />
    </>
  );
}
/** grille speaker bot */
function Bot5({ tint = RED }: { tint?: string }) {
  return (
    <><Chassis />
      <path d="M18 12 L46 12 L51 40 L13 40 Z" fill="#283044" stroke="#566180" strokeWidth="1.5" />
      <path d="M18 12 L32 12 L32 40 L13 40 Z" fill="#1f2638" opacity="0.45" />
      <line x1="32" y1="6" x2="32" y2="12" stroke="#566180" strokeWidth="1.4" /><circle cx="32" cy="5" r="2" fill={tint} />
      <rect x="21" y="19" width="7" height="7" rx="1.5" fill="#0a0d14" stroke="#3a4256" strokeWidth="1" />
      <rect x="36" y="19" width="7" height="7" rx="1.5" fill="#0a0d14" stroke="#3a4256" strokeWidth="1" />
      <rect x="23" y="21" width="3.2" height="3.2" fill={tint} /><rect x="38" y="21" width="3.2" height="3.2" fill={tint} />
      <g fill="#12161f">{[32, 35].flatMap((y) => [24, 28, 32, 36, 40].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r="0.9" />))}</g>
    </>
  );
}
/** hex head, angry triangular eyes */
function Bot6({ tint = RED }: { tint?: string }) {
  return (
    <><Chassis />
      <path d="M32 10 L50 20 L50 34 L32 44 L14 34 L14 20 Z" fill="#283044" stroke="#566180" strokeWidth="1.5" />
      <path d="M32 10 L14 20 L14 34 L32 44 Z" fill="#1f2638" opacity="0.45" />
      <circle cx="32" cy="17" r="1.5" fill={tint} />
      <path d="M22 24 L30 26 L22 29 Z" fill={tint} /><path d="M42 24 L34 26 L42 29 Z" fill={tint} />
      <rect x="26" y="34" width="12" height="4" fill="#12161f" stroke="#3a4256" strokeWidth="0.6" />
      <g stroke="#3a4256" strokeWidth="0.6"><line x1="30" y1="34" x2="30" y2="38" /><line x1="34" y1="34" x2="34" y2="38" /></g>
    </>
  );
}
/** cracked display face */
function Bot7({ tint = RED }: { tint?: string }) {
  return (
    <><Chassis />
      <rect x="14" y="12" width="36" height="30" rx="4" fill="#2a3140" stroke="#566180" strokeWidth="1.5" />
      <line x1="32" y1="6" x2="32" y2="12" stroke="#566180" strokeWidth="1.5" /><circle cx="32" cy="5" r="2" fill={tint} />
      <rect x="18" y="16" width="28" height="22" rx="2" fill="#0a0d14" stroke="#3a4256" strokeWidth="1" />
      <rect x="18" y="16" width="28" height="22" rx="2" fill={tint} opacity="0.12" />
      <rect x="24" y="22" width="5" height="5" fill={tint} /><rect x="35" y="22" width="5" height="5" fill={tint} />
      <g fill={tint} opacity="0.8"><rect x="26" y="31" width="3" height="3" /><rect x="30.5" y="31" width="3" height="3" /><rect x="35" y="31" width="3" height="3" /></g>
      <path d="M30 16 L33 24 L28 30 L34 38" stroke="#0a0d14" strokeWidth="1.2" fill="none" />
      <path d="M30 16 L33 24 L28 30 L34 38" stroke={tint} strokeWidth="0.4" fill="none" opacity="0.5" />
    </>
  );
}

/** The bot chassis roster — a bot's seat index picks its machine so no two neighbours match. */
const BOT_UNITS = [Bot0, Bot1, Bot2, Bot3, Bot4, Bot5, Bot6, Bot7];

/** 3 — Dragon */
function Dragon() {
  return (
    <>
      <path d="M18 10 L24 22 L14 20 Z" fill="#7a2f3a" stroke="#4a1c24" strokeWidth="1" />
      <path d="M46 10 L40 22 L50 20 Z" fill="#7a2f3a" stroke="#4a1c24" strokeWidth="1" />
      <path d="M32 12 C20 12 16 26 18 38 C20 50 28 58 32 58 C36 58 44 50 46 38 C48 26 44 12 32 12 Z" fill="#9a3a48" stroke="#5a232c" strokeWidth="1.5" />
      <path d="M24 44 L32 56 L40 44 C40 50 36 54 32 54 C28 54 24 50 24 44 Z" fill="#3a1219" />
      <path d="M26 48 L28 52 M30 48 L31 53 M34 48 L33 53 M38 48 L36 52" stroke="#f0e6d0" strokeWidth="1.3" />
      <Eye x={25} color="#ffd84a" />
      <Eye x={39} color="#ffd84a" />
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
      <Eye x={26} color={RED} />
      <Eye x={38} color={RED} />
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
      <Eye x={26} color={RED} />
      <Eye x={38} color={RED} />
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
      <Eye x={28} color={RED} />
      <Eye x={36} color={RED} />
      <path d="M30 40 L32 43 L34 40" fill="none" stroke="#d8d0e0" strokeWidth="1.2" />
    </>
  );
}

/** 7 — Ghost wraith */
function Ghost() {
  return (
    <>
      <path d="M32 8 C20 8 16 22 16 36 L16 56 L22 50 L27 56 L32 50 L37 56 L42 50 L48 56 L48 36 C48 22 44 8 32 8 Z"
        fill="#1a2a30" stroke="#3aa89a" strokeWidth="1.4" opacity="0.92" />
      <path d="M22 28 Q26 24 30 28 L30 36 Q26 40 22 36 Z" fill="#06110f" />
      <path d="M34 28 Q38 24 42 28 L42 36 Q38 40 34 36 Z" fill="#06110f" />
      <Eye x={26} color={TEAL} />
      <Eye x={38} color={TEAL} />
      <path d="M28 44 Q32 40 36 44" fill="none" stroke="#3aa89a" strokeWidth="1.2" />
    </>
  );
}

/** Hero — knight helm */
function Hero() {
  return (
    <>
      <path d="M32 8 C20 8 16 22 16 36 C16 50 24 58 32 58 C40 58 48 50 48 36 C48 22 44 8 32 8 Z" fill="#1c2738" stroke={TEAL} strokeWidth="1.6" />
      <path d="M22 26 L42 26 L42 32 L36 32 L36 30 L28 30 L28 32 L22 32 Z" fill="#06110f" />
      <rect x="30" y="30" width="4" height="18" rx="1.5" fill="#06110f" />
      <Eye x={26} color={TEAL} />
      <Eye x={38} color={TEAL} />
      <path d="M32 4 L32 10 M28 6 L36 6" stroke={TEAL} strokeWidth="1.5" />
      <path d="M20 22 Q32 16 44 22" fill="none" stroke={TEAL} strokeWidth="1" opacity="0.6" />
    </>
  );
}

/** Avatar id -> portrait component. 'bot' is reserved for the machine roster (BOT_UNITS). */
const AVATARS: Record<string, () => JSX.Element> = {
  hero: Hero, mage: Mage, goblin: Goblin, dragon: Dragon,
  ogre: Ogre, vampire: Vampire, bat: Bat, ghost: Ghost,
};

/** Human-selectable characters (id + Korean label), in picker order. Excludes the bot shape. */
export const AVATAR_CHOICES: { id: string; name: string }[] = [
  { id: 'hero', name: '기사' },
  { id: 'mage', name: '마법사' },
  { id: 'goblin', name: '고블린' },
  { id: 'dragon', name: '드래곤' },
  { id: 'ogre', name: '오우거' },
  { id: 'vampire', name: '뱀파이어' },
  { id: 'bat', name: '박쥐' },
  { id: 'ghost', name: '유령' },
];

/** Distinct glow colors so each bot at the table reads as its own machine. */
export const BOT_TINTS = ['#c2543a', '#79b0a2', '#d8a63c', '#8b6cff', '#5f8fc4', '#c47a3a', '#8f9d4f', '#b06a92'];

/** Unified portrait renderer. `bot` avatars render one of 8 distinct machines,
 *  picked by `variant` (usually the seat index) and tinted by `tint`. */
export function AvatarArt({ avatar, tint, variant = 0, size = 58 }: { avatar: string; tint?: string; variant?: number; size?: number }) {
  const isBot = avatar === 'bot' || !AVATARS[avatar];
  const Bot = BOT_UNITS[((variant % BOT_UNITS.length) + BOT_UNITS.length) % BOT_UNITS.length];
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden style={{ display: 'block' }}>
      <defs>
        <radialGradient id="av-mood" cx="0.5" cy="0.36" r="0.7">
          <stop offset="0.58" stopColor="#04060a" stopOpacity="0" />
          <stop offset="1" stopColor="#03050a" stopOpacity="0.55" />
        </radialGradient>
        <radialGradient id="av-floor" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#000" stopOpacity="0.55" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="av-toplight" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.11" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <filter id="av-shadow" x="-35%" y="-35%" width="170%" height="170%">
          <feDropShadow dx="0" dy="1.4" stdDeviation="1.6" floodColor="#000" floodOpacity="0.55" />
        </filter>
      </defs>
      <rect x="0" y="0" width="64" height="64" fill="url(#av-mood)" />
      <ellipse cx="32" cy="59" rx="18" ry="4" fill="url(#av-floor)" />
      <g filter="url(#av-shadow)">{isBot ? <Bot tint={tint} /> : AVATARS[avatar]()}</g>
      <rect x="0" y="0" width="64" height="28" fill="url(#av-toplight)" style={{ mixBlendMode: 'screen' }} />
    </svg>
  );
}
