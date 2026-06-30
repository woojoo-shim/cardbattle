import { useEffect, useRef, useState } from 'react';
import type { Element, GameEvent } from '@cardbattle/shared';
import { CARD_DEFS } from '@cardbattle/shared';

interface Props {
  events: GameEvent[];
}

type Fx =
  | { id: number; kind: 'bolt'; x: number; y: number; dx: number; dy: number; color: string }
  | { id: number; kind: 'ring'; x: number; y: number; color: string; delay: number }
  | { id: number; kind: 'num'; x: number; y: number; text: string; color: string; delay: number }
  | { id: number; kind: 'cast'; x: number; y: number; icon: string; name: string; color: string };

/** Per-element tint for projectiles/impacts; physical/none fall back to crimson. */
const ELEM: Record<Element, string> = {
  physical: '#ff5c8a', fire: '#ff7a3c', ice: '#5fd0ff',
  lightning: '#ffd84a', poison: '#9be85a', holy: '#ffe9a8', none: '#ff5c8a',
};
const HEAL = '#38e8c8';
const SHIELD = '#7fb6ff';

/** Viewport-centre of a player's portrait/panel, located via its data-pid anchor. */
function centerOf(id: string): { x: number; y: number } | null {
  const el = document.querySelector<HTMLElement>(`[data-pid="${CSS.escape(id)}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

/** Briefly jolt the struck portrait. The animation overrides transform then reverts. */
function shake(id: string): void {
  const el = document.querySelector<HTMLElement>(`[data-pid="${CSS.escape(id)}"]`);
  if (!el) return;
  el.style.animation = 'cb-shake .3s ease';
  setTimeout(() => { el.style.animation = ''; }, 300);
}

/** The acting portrait lifts + glows, selling that THIS character is playing a card. */
function castPulse(id: string): void {
  const el = document.querySelector<HTMLElement>(`[data-pid="${CSS.escape(id)}"]`);
  if (!el) return;
  const prevFilter = el.style.filter;
  el.style.animation = 'cb-castlift .45s ease';
  el.style.filter = 'brightness(1.35) drop-shadow(0 0 16px rgba(255,255,255,0.55))';
  setTimeout(() => { el.style.animation = ''; el.style.filter = prevFilter; }, 450);
}

/**
 * S1 attack-animation layer. Maps the GameEvent stream to lightweight DOM effects:
 * a projectile orb flies attacker→target, lands with an impact ring + portrait shake,
 * and a floating ±number rises off the target. Heals pulse teal. The screen edge still
 * flashes crimson on damage. In S4 this is superseded by a pooled PixiJS particle canvas.
 */
export function VfxLayer({ events }: Props) {
  const flashRef = useRef<HTMLDivElement>(null);
  const seen = useRef(0);
  const nextId = useRef(1);
  const [fx, setFx] = useState<Fx[]>([]);

  useEffect(() => {
    const fresh = events.slice(seen.current);
    seen.current = events.length;
    if (fresh.length === 0) return;

    const add: Fx[] = [];
    let damaged = false;

    for (const e of fresh) {
      if (e.type === 'card_played') {
        const src = centerOf(e.playerId);
        const def = CARD_DEFS[e.defId];
        if (!src || !def) continue;
        const color = ELEM[def.element] ?? ELEM.none;
        add.push({ id: nextId.current++, kind: 'cast', x: src.x, y: src.y, icon: def.icon, name: def.name, color });
        castPulse(e.playerId);
      } else if (e.type === 'damage_dealt') {
        const tgt = centerOf(e.targetId);
        if (!tgt) continue;
        damaged = true;
        const color = ELEM[e.element] ?? ELEM.none;
        const src = centerOf(e.sourceId);
        const hasBolt = !!src && (src.x !== tgt.x || src.y !== tgt.y);
        if (hasBolt && src) {
          add.push({ id: nextId.current++, kind: 'bolt', x: src.x, y: src.y, dx: tgt.x - src.x, dy: tgt.y - src.y, color });
        }
        const delay = hasBolt ? 0.2 : 0; // let the projectile land before the impact pops
        add.push({ id: nextId.current++, kind: 'ring', x: tgt.x, y: tgt.y, color, delay });
        add.push({ id: nextId.current++, kind: 'num', x: tgt.x, y: tgt.y, text: `-${e.amount}`, color, delay });
        shake(e.targetId);
      } else if (e.type === 'healed') {
        const tgt = centerOf(e.targetId);
        if (!tgt) continue;
        add.push({ id: nextId.current++, kind: 'ring', x: tgt.x, y: tgt.y, color: HEAL, delay: 0 });
        add.push({ id: nextId.current++, kind: 'num', x: tgt.x, y: tgt.y, text: `+${e.amount}`, color: HEAL, delay: 0 });
      } else if (e.type === 'shielded') {
        const tgt = centerOf(e.targetId);
        if (!tgt) continue;
        add.push({ id: nextId.current++, kind: 'ring', x: tgt.x, y: tgt.y, color: SHIELD, delay: 0 });
        add.push({ id: nextId.current++, kind: 'num', x: tgt.x, y: tgt.y, text: `🛡+${e.amount}`, color: SHIELD, delay: 0 });
      }
    }

    if (damaged && flashRef.current) {
      flashRef.current.style.boxShadow = 'inset 0 0 120px rgba(255,92,138,0.6)';
      setTimeout(() => { if (flashRef.current) flashRef.current.style.boxShadow = 'none'; }, 180);
    }

    if (add.length) {
      setFx((cur) => [...cur, ...add]);
      const ids = new Set(add.map((a) => a.id));
      setTimeout(() => setFx((cur) => cur.filter((f) => !ids.has(f.id))), 1100);
    }
  }, [events]);

  return (
    <>
      <div ref={flashRef} style={flash} aria-hidden />
      <div style={stage} aria-hidden>
        {fx.map((f) =>
          f.kind === 'bolt' ? (
            <span key={f.id} style={boltStyle(f)} />
          ) : f.kind === 'ring' ? (
            <span key={f.id} style={ringStyle(f)} />
          ) : f.kind === 'cast' ? (
            <span key={f.id} style={castStyle(f)}>
              <span style={{ fontSize: 30, lineHeight: 1 }}>{f.icon}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap' }}>{f.name}</span>
            </span>
          ) : (
            <span key={f.id} style={numStyle(f)}>{f.text}</span>
          ),
        )}
      </div>
    </>
  );
}

const flash: React.CSSProperties = {
  position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 50, transition: 'box-shadow .1s',
};
const stage: React.CSSProperties = {
  position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 60, overflow: 'hidden',
};

function boltStyle(f: Extract<Fx, { kind: 'bolt' }>): React.CSSProperties {
  return {
    position: 'fixed', left: f.x, top: f.y, width: 18, height: 18, borderRadius: '50%',
    background: `radial-gradient(circle, #fff, ${f.color} 55%, transparent 72%)`,
    boxShadow: `0 0 16px ${f.color}, 0 0 30px ${f.color}`,
    animation: 'cb-bolt .26s cubic-bezier(.4,.05,.7,1) forwards',
    ['--dx' as string]: `${f.dx}px`, ['--dy' as string]: `${f.dy}px`,
  } as React.CSSProperties;
}
function ringStyle(f: Extract<Fx, { kind: 'ring' }>): React.CSSProperties {
  return {
    position: 'fixed', left: f.x, top: f.y, width: 96, height: 96, borderRadius: '50%',
    border: `3px solid ${f.color}`, boxShadow: `0 0 22px ${f.color}`,
    animation: `cb-ring .5s ease-out ${f.delay}s backwards`,
  };
}
function castStyle(f: Extract<Fx, { kind: 'cast' }>): React.CSSProperties {
  return {
    position: 'fixed', left: f.x, top: f.y, display: 'flex', flexDirection: 'column',
    alignItems: 'center', gap: 4, padding: '9px 12px', borderRadius: 12,
    background: 'linear-gradient(170deg,#1c2233,#11151f)', border: `1px solid ${f.color}`,
    boxShadow: `0 0 22px ${f.color}, 0 12px 30px rgba(0,0,0,0.6)`,
    fontFamily: '"Geist", system-ui, sans-serif', willChange: 'transform, opacity',
    animation: 'cb-cast .9s cubic-bezier(.2,.7,.3,1) forwards',
  };
}
function numStyle(f: Extract<Fx, { kind: 'num' }>): React.CSSProperties {
  return {
    position: 'fixed', left: f.x, top: f.y, color: f.color,
    fontFamily: '"Geist Mono", ui-monospace, monospace', fontWeight: 800, fontSize: 30,
    textShadow: `0 0 10px ${f.color}, 0 2px 4px rgba(0,0,0,0.7)`, whiteSpace: 'nowrap',
    animation: `cb-rise .9s ease-out ${f.delay}s backwards`,
  };
}
