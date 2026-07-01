import { mono } from './theme.js';

interface Props {
  mana: number;
  max: number;
  lit: boolean; // my turn → crystals glow brighter
}

/** Hearthstone-style mana readout: a wrapped row of gem crystals (filled = available mana,
 *  empty = headroom to the cap) plus a bold current/max number. Bounded width + flex-wrap so
 *  it never grows sideways into the card fan on iPad — it stacks into more rows instead. */
export function ManaBar({ mana, max, lit }: Props) {
  const cur = Math.max(0, Math.min(mana, max));
  return (
    <div style={wrap}>
      <div style={readout}>
        <span style={{ ...num, opacity: lit ? 1 : 0.82 }}>{cur}</span>
        <span style={slash}>/{max}</span>
        <span style={label}>MANA</span>
      </div>
      <div style={crystals}>
        {Array.from({ length: max }).map((_, i) => (
          <Gem key={i} on={i < cur} lit={lit} />
        ))}
      </div>
    </div>
  );
}

function Gem({ on, lit }: { on: boolean; lit: boolean }) {
  const base = on ? '#2f7fe0' : '#111a2c';
  const outline = on ? '#bfe0ff' : '#2b3d5c';
  return (
    <svg
      viewBox="0 0 24 24" width="15" height="15" aria-hidden
      style={{ display: 'block', filter: on ? `drop-shadow(0 0 ${lit ? 4 : 2}px rgba(90,160,255,0.9))` : undefined }}
    >
      <polygon points="12,2 21,7 21,17 12,22 3,17 3,7" fill={base} stroke={outline} strokeWidth="1.3" strokeLinejoin="round" />
      {on && (
        <>
          <polygon points="12,2 21,7 12,12 3,7" fill="#8ec4ff" opacity="0.6" />
          <polygon points="3,7 12,12 3,17" fill="#1b53a8" opacity="0.55" />
          <circle cx="9" cy="8" r="1.5" fill="#eaf4ff" opacity="0.92" />
        </>
      )}
    </svg>
  );
}

const wrap: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 14,
  padding: 'clamp(10px, 1.2vw, 15px) clamp(14px, 1.6vw, 20px)', borderRadius: 16,
  background: 'linear-gradient(180deg, rgba(20,30,54,0.94), rgba(12,18,34,0.94))',
  border: '1.5px solid #3a5da0',
  boxShadow: '0 10px 28px rgba(30,70,150,0.42), inset 0 0 20px rgba(80,150,255,0.12)',
};
const readout: React.CSSProperties = { display: 'flex', flexDirection: 'column', lineHeight: 1, alignItems: 'flex-start' };
const num: React.CSSProperties = {
  fontFamily: mono, fontSize: 'clamp(30px, 3.2vw, 46px)', fontWeight: 900, color: '#e2f0ff',
  textShadow: '0 0 12px rgba(120,180,255,0.6)', transition: 'opacity .3s ease',
};
const slash: React.CSSProperties = { fontFamily: mono, fontSize: 'clamp(13px, 1.2vw, 17px)', fontWeight: 700, color: '#7fa8d8', marginTop: 2 };
const label: React.CSSProperties = { fontFamily: mono, fontSize: 'clamp(10px, 0.9vw, 12px)', letterSpacing: 3, color: '#7fa8d8', marginTop: 5 };
const crystals: React.CSSProperties = {
  display: 'flex', flexWrap: 'wrap', gap: 4, maxWidth: 128, alignContent: 'center',
};
