import { useEffect, useRef } from 'react';
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
  // Gems that were empty last render and are filled now "pop" in — the satisfying regen tick.
  const prev = useRef(cur);
  const gainedFrom = cur > prev.current ? prev.current : cur; // indices [gainedFrom, cur) just lit up
  useEffect(() => { prev.current = cur; });
  return (
    <div style={wrap}>
      <div style={readout}>
        <span style={{ ...num, opacity: lit ? 1 : 0.82 }}>{cur}</span>
        <span style={slash}>/{max}</span>
        <span style={label}>MANA</span>
      </div>
      <div style={crystals}>
        {Array.from({ length: max }).map((_, i) => (
          <Gem key={i} on={i < cur} lit={lit} fresh={i >= gainedFrom && i < cur} />
        ))}
      </div>
    </div>
  );
}

function Gem({ on, lit, fresh }: { on: boolean; lit: boolean; fresh: boolean }) {
  const base = on ? '#c8912f' : '#241a10';
  const outline = on ? '#f0d089' : '#3a2e1c';
  return (
    <svg
      viewBox="0 0 24 24" width="15" height="15" aria-hidden
      style={{ display: 'block', filter: on ? `drop-shadow(0 0 ${lit ? 4 : 2}px rgba(224,178,90,0.9))` : undefined, animation: fresh ? 'cb-mana-pop 0.5s cubic-bezier(.2,1.5,.4,1) both' : undefined }}
    >
      <polygon points="12,2 21,7 21,17 12,22 3,17 3,7" fill={base} stroke={outline} strokeWidth="1.3" strokeLinejoin="round" />
      {on && (
        <>
          <polygon points="12,2 21,7 12,12 3,7" fill="#f0cd83" opacity="0.6" />
          <polygon points="3,7 12,12 3,17" fill="#8a5f1f" opacity="0.55" />
          <circle cx="9" cy="8" r="1.5" fill="#fff2d4" opacity="0.92" />
        </>
      )}
    </svg>
  );
}

const wrap: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 14,
  padding: 'clamp(10px, 1.2vw, 15px) clamp(14px, 1.6vw, 20px)', borderRadius: 16,
  background: 'linear-gradient(180deg, rgba(42,32,19,0.94), rgba(26,18,10,0.94))',
  border: '1.5px solid #6a5528',
  boxShadow: '0 10px 28px rgba(90,60,20,0.42), inset 0 0 20px rgba(220,170,80,0.12)',
};
const readout: React.CSSProperties = { display: 'flex', flexDirection: 'column', lineHeight: 1, alignItems: 'flex-start' };
const num: React.CSSProperties = {
  fontFamily: mono, fontSize: 'clamp(30px, 3.2vw, 46px)', fontWeight: 900, color: '#f0e2c0',
  textShadow: '0 0 12px rgba(220,180,100,0.6)', transition: 'opacity .3s ease',
};
const slash: React.CSSProperties = { fontFamily: mono, fontSize: 'clamp(13px, 1.2vw, 17px)', fontWeight: 700, color: '#c2a878', marginTop: 2 };
const label: React.CSSProperties = { fontFamily: mono, fontSize: 'clamp(10px, 0.9vw, 12px)', letterSpacing: 3, color: '#c2a878', marginTop: 5 };
const crystals: React.CSSProperties = {
  display: 'flex', flexWrap: 'wrap', gap: 4, maxWidth: 128, alignContent: 'center',
};
