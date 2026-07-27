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

/** A fully-illustrated faceted mana jewel — brilliant-cut crown, table facet, pavilion, and
 *  glints — instead of a flat hexagon. Filled gems glow warm amber; empty gems read as a dead
 *  socket. Shared gradient ids are safe: every instance's <defs> is identical, so url() resolving
 *  to the first match in the document paints them all the same. */
function Gem({ on, lit, fresh }: { on: boolean; lit: boolean; fresh: boolean }) {
  // id keyed by state: on/off gems have DIFFERENT stops, so a shared id would make every gem
  // paint with the first-defined (on) gradient — killing the filled/empty distinction. Two
  // state-keyed ids stay identical across same-state instances, so first-match resolution is safe.
  const bodyId = on ? 'cb-mana-body-on' : 'cb-mana-body-off';
  return (
    <svg
      viewBox="0 0 24 24" width="26" height="26" aria-hidden
      style={{
        display: 'block',
        filter: on
          ? `drop-shadow(0 1px 2px rgba(0,0,0,0.5)) drop-shadow(0 0 ${lit ? 6 : 3}px rgba(240,196,96,0.9))`
          : 'drop-shadow(0 1px 1px rgba(0,0,0,0.4))',
        animation: fresh ? 'cb-mana-pop 0.5s cubic-bezier(.2,1.5,.4,1) both' : undefined,
      }}
    >
      <defs>
        <radialGradient id={bodyId} cx="42%" cy="32%" r="74%">
          <stop offset="0%" stopColor={on ? '#ffeeb8' : '#3a2c17'} />
          <stop offset="46%" stopColor={on ? '#f0b84a' : '#2a2013'} />
          <stop offset="100%" stopColor={on ? '#a5691d' : '#181209'} />
        </radialGradient>
        <linearGradient id="cb-mana-crown" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff6d8" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#fff6d8" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* faceted gem body */}
      <polygon
        points="12,1.4 18.6,4.2 22.6,11 18,20.6 12,23 6,20.6 1.4,11 5.4,4.2"
        fill={`url(#${bodyId})`} stroke={on ? '#ffdf8f' : '#4a3a20'} strokeWidth="1" strokeLinejoin="round"
      />
      {/* table facet */}
      <polygon points="12,5 16,7 15,12 12,14 9,12 8,7" fill={on ? '#ffe9ad' : '#2f2415'} opacity={on ? 0.72 : 0.5} />
      {on && (
        <>
          {/* crown highlight sweep */}
          <polygon points="12,1.4 18.6,4.2 16,7 12,5 8,7 5.4,4.2" fill="url(#cb-mana-crown)" />
          {/* pavilion shading (bottom facets) */}
          <polygon points="12,14 15,12 18,20.6 12,23" fill="#8a5518" opacity="0.5" />
          <polygon points="12,14 9,12 6,20.6 12,23" fill="#6f4413" opacity="0.55" />
          {/* glints */}
          <circle cx="10" cy="7.4" r="1.4" fill="#fffef2" opacity="0.95" />
          <circle cx="14.6" cy="9" r="0.7" fill="#fff7dd" opacity="0.85" />
        </>
      )}
    </svg>
  );
}

const wrap: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 20,
  padding: 'clamp(14px, 1.6vw, 20px) clamp(18px, 2vw, 26px)', borderRadius: 6,
  background: 'rgba(34,26,15,0.94)',
  border: '1px solid #5a4820',
  boxShadow: '0 10px 24px rgba(0,0,0,0.45)',
};
const readout: React.CSSProperties = { display: 'flex', flexDirection: 'column', lineHeight: 1, alignItems: 'flex-start' };
const num: React.CSSProperties = {
  fontFamily: mono, fontSize: 'clamp(40px, 4.2vw, 62px)', fontWeight: 800, color: '#f0e2c0',
  transition: 'opacity .3s ease',
};
const slash: React.CSSProperties = { fontFamily: mono, fontSize: 'clamp(16px, 1.5vw, 21px)', fontWeight: 700, color: '#c2a878', marginTop: 3 };
const label: React.CSSProperties = { fontFamily: mono, fontSize: 'clamp(12px, 1.1vw, 15px)', letterSpacing: 4, color: '#c2a878', marginTop: 7 };
const crystals: React.CSSProperties = {
  display: 'flex', flexWrap: 'wrap', gap: 6, maxWidth: 228, alignContent: 'center',
};
