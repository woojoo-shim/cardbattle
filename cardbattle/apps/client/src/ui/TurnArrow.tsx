import { useEffect, useRef, useState } from 'react';
import { C } from './theme.js';

interface Props {
  activeId: string;
  isMyTurn: boolean;
}

/** Central compass needle that swivels to point at whose turn it is. It reads the
 * active player's portrait anchor (data-pid) and rotates a pointer toward it; the
 * angle accumulates so the needle always takes the short path (never unwinds 360°). */
export function TurnArrow({ activeId, isMyTurn }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const angleRef = useRef(0);
  const [angle, setAngle] = useState(0);
  const color = isMyTurn ? C.you : C.enemy;

  useEffect(() => {
    const aim = () => {
      const host = ref.current;
      if (!host) return;
      const tgt = document.querySelector<HTMLElement>(`[data-pid="${CSS.escape(activeId)}"]`);
      if (!tgt) return;
      const hr = host.getBoundingClientRect();
      const tr = tgt.getBoundingClientRect();
      const cx = hr.left + hr.width / 2;
      const cy = hr.top + hr.height / 2;
      const tx = tr.left + tr.width / 2;
      const ty = tr.top + tr.height / 2;
      const want = (Math.atan2(ty - cy, tx - cx) * 180) / Math.PI;
      let delta = ((want - angleRef.current) % 360 + 360) % 360;
      if (delta > 180) delta -= 360; // short way around
      angleRef.current += delta;
      setAngle(angleRef.current);
    };
    aim();
    const raf = requestAnimationFrame(aim);
    const t = setTimeout(aim, 320); // let portrait spotlight/translate animations settle
    window.addEventListener('resize', aim);
    return () => { cancelAnimationFrame(raf); clearTimeout(t); window.removeEventListener('resize', aim); };
  }, [activeId]);

  return (
    <div ref={ref} style={wrap} aria-hidden>
      <span style={{ ...ring, borderColor: `${color}44`, boxShadow: `0 0 34px ${color}33` }} />
      <span style={{ ...needle, transform: `rotate(${angle}deg)` }}>
        <svg width="124" height="48" viewBox="0 0 124 48" style={{ position: 'absolute', left: 0, top: -24, display: 'block', filter: `drop-shadow(0 0 8px ${color})` }}>
          <defs>
            <linearGradient id="ta-grad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor={color} stopOpacity="0.08" />
              <stop offset="1" stopColor={color} stopOpacity="1" />
            </linearGradient>
          </defs>
          <path d="M8 24 L86 24" stroke="url(#ta-grad)" strokeWidth="6" strokeLinecap="round" />
          <path d="M82 9 L118 24 L82 39 L94 24 Z" fill={color} />
        </svg>
      </span>
      <span style={{ ...hub, background: color, boxShadow: `0 0 18px ${color}, 0 0 6px #fff` }} />
    </div>
  );
}

const wrap: React.CSSProperties = {
  position: 'absolute', left: '50%', top: '50%', width: 0, height: 0, zIndex: 6, pointerEvents: 'none',
};
const ring: React.CSSProperties = {
  position: 'absolute', left: -118, top: -118, width: 236, height: 236, borderRadius: '50%',
  border: '2px dashed', animation: 'cb-spin 14s linear infinite',
};
const needle: React.CSSProperties = {
  position: 'absolute', left: 0, top: 0, width: 0, height: 0, transformOrigin: '0 0',
  transition: 'transform .6s cubic-bezier(.34,1.28,.5,1)',
};
const hub: React.CSSProperties = {
  position: 'absolute', left: -8, top: -8, width: 16, height: 16, borderRadius: '50%',
};
