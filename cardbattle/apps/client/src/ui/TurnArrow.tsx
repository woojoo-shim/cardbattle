import { useEffect, useRef, useState } from 'react';
import { C } from './theme.js';

// The felt is tilted rotateX(62°); its vertical extent projects to ~cos(62°) on screen. The
// needle lies ON that plane, so we un-foreshorten the screen delta by this factor to find the
// in-plane angle that will *project* to point at a seat, and tilt the needle by the same 62°.
const TILT_DEG = 80;
const COS_TILT = Math.cos((TILT_DEG * Math.PI) / 180);

interface Props {
  activeId: string;
  isMyTurn: boolean;
  turnDir: number; // +1 = forward play order, -1 = reversed (flipped by '역류')
}

/** Central compass needle that points at whose turn it is. Rather than taking the short
 * path, it always sweeps in the round's play direction (turnDir) — so across a full lap it
 * spins all the way around the table, and visibly reverses when '역류' flips the direction. */
export function TurnArrow({ activeId, isMyTurn, turnDir }: Props) {
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
      // Un-squash the vertical delta into the felt's own plane so the in-plane angle projects
      // (after rotateX) straight at the seat rather than aiming as if the table were flat.
      const want = (Math.atan2((ty - cy) / COS_TILT, tx - cx) * 180) / Math.PI;
      // Screen y grows downward, so a positive angle step rotates clockwise. Drive the sweep in
      // the play direction: forward → keep adding (CW), reversed → keep subtracting (CCW).
      const raw = ((want - angleRef.current) % 360 + 360) % 360; // 0..360 the clockwise way
      const delta = turnDir < 0 ? (raw === 0 ? 0 : raw - 360) : raw;
      angleRef.current += delta;
      setAngle(angleRef.current);
    };
    aim();
    const raf = requestAnimationFrame(aim);
    const t = setTimeout(aim, 320); // let portrait spotlight/translate animations settle
    window.addEventListener('resize', aim);
    return () => { cancelAnimationFrame(raf); clearTimeout(t); window.removeEventListener('resize', aim); };
  }, [activeId, turnDir]);

  return (
    <div ref={ref} style={wrap} aria-hidden>
      {/* Everything decorative lies flat on the table: squashed to the felt's foreshortened
          ellipse so the rings read as circles painted on the tilted table, not floating discs. */}
      <div style={plane}>
        {/* soft pool of light breathing under the compass */}
        <span style={{ ...glowDisc, background: `radial-gradient(circle, ${color}33, transparent 68%)` }} />
        {/* two rings turning against each other for depth */}
        <span style={{ ...ring, borderColor: `${color}44`, boxShadow: `0 0 34px ${color}33` }} />
        <span style={{ ...ringInner, borderColor: `${color}2e` }} />
      </div>

      <span style={{ ...needle, transform: `perspective(620px) rotateX(${TILT_DEG}deg) rotate(${angle}deg)` }}>
        <svg width="152" height="54" viewBox="0 0 152 54" style={{ position: 'absolute', left: 0, top: -27, display: 'block', overflow: 'visible', filter: `drop-shadow(0 0 10px ${color})` }}>
          <defs>
            <linearGradient id="ta-grad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor={color} stopOpacity="0" />
              <stop offset="0.55" stopColor={color} stopOpacity="0.55" />
              <stop offset="1" stopColor={color} stopOpacity="1" />
            </linearGradient>
            <linearGradient id="ta-core" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#fff" stopOpacity="0" />
              <stop offset="1" stopColor="#fff" stopOpacity="0.9" />
            </linearGradient>
          </defs>
          {/* tapered shaft */}
          <path d="M12 27 L106 27" stroke="url(#ta-grad)" strokeWidth="7" strokeLinecap="round" />
          {/* energy streaming toward the target */}
          <path d="M16 27 L102 27" stroke={color} strokeWidth="2.6" strokeLinecap="round"
            strokeDasharray="2 11" className="cb-arrow-flow" opacity="0.9" />
          {/* bright inner core, brightest near the head */}
          <path d="M44 27 L102 27" stroke="url(#ta-core)" strokeWidth="2" strokeLinecap="round" />
          {/* fletching at the base */}
          <path d="M13 27 L2 18 M13 27 L2 36" stroke={color} strokeWidth="3" strokeLinecap="round" opacity="0.5" />
          {/* elongated spear head */}
          <path d="M98 9 L146 27 L98 45 L112 27 Z" fill={color} />
          {/* specular highlight inside the head */}
          <path d="M105 17 L134 27 L105 37 L116 27 Z" fill="#fff" opacity="0.34" />
        </svg>
      </span>

      {/* hub: a slowly turning gem with a bright molten core */}
      <span style={{ ...hubGem, borderColor: color, boxShadow: `0 0 16px ${color}` }} />
      <span style={{ ...hub, background: color, boxShadow: `0 0 20px ${color}, 0 0 7px #fff` }} />
    </div>
  );
}

// Centred on the felt itself (top 57% = RoundTable's CY), not the row's midpoint — otherwise
// the needle radiates from above the table and the rings ride up onto the back wall.
const wrap: React.CSSProperties = {
  position: 'absolute', left: '50%', top: '57%', width: 0, height: 0, zIndex: 6, pointerEvents: 'none',
};
// Lay the decorative rings/glow ON the baize by tilting them with the SAME 3D transform the
// felt uses (perspective + rotateX 62°), so they foreshorten into the table's real ellipse
// instead of standing up as flat circles floating over the room.
const plane: React.CSSProperties = {
  position: 'absolute', left: 0, top: 0, width: 0, height: 0,
  transform: 'perspective(620px) rotateX(80deg)', transformOrigin: '0 0',
};
// Circle diameters in vw; the plane's rotateX(62°) then squashes them to ~cos(62°) tall so they
// sit inside the felt's painted betting circle rather than spilling onto the walls.
const glowDisc: React.CSSProperties = {
  position: 'absolute', left: '50%', top: '50%', width: '22vw', height: '22vw', borderRadius: '50%',
  transform: 'translate(-50%, -50%)', animation: 'cb-arrow-breathe 3.6s ease-in-out infinite',
  transformOrigin: 'center',
};
const ring: React.CSSProperties = {
  position: 'absolute', left: '-13vw', top: '-13vw', width: '26vw', height: '26vw', borderRadius: '50%',
  border: '2px dashed', animation: 'cb-spin 14s linear infinite',
};
const ringInner: React.CSSProperties = {
  position: 'absolute', left: '-9.5vw', top: '-9.5vw', width: '19vw', height: '19vw', borderRadius: '50%',
  border: '1px solid', animation: 'cb-spin-rev 22s linear infinite',
};
const needle: React.CSSProperties = {
  position: 'absolute', left: 0, top: 0, width: 0, height: 0, transformOrigin: '0 0',
  transition: 'transform .8s cubic-bezier(.45,.05,.25,1)',
};
const hub: React.CSSProperties = {
  position: 'absolute', left: -7, top: -7, width: 14, height: 14, borderRadius: '50%',
};
// A diamond gem framing the hub, turning slowly so the centre never feels static.
const hubGem: React.CSSProperties = {
  position: 'absolute', left: '50%', top: '50%', width: 22, height: 22,
  border: '2px solid', borderRadius: 4, background: 'rgba(0,0,0,0.35)',
  animation: 'cb-hub-spin 9s linear infinite',
};
