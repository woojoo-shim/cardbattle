import { useEffect, useRef, useState } from 'react';
import type { Element, GameEvent } from '@cardbattle/shared';
import { CARD_DEFS, EFFECT_BY_ID } from '@cardbattle/shared';
import type { UiPlayer } from '../state/useRoom.js';
import { CardArt } from '../ui/art/CardArt.js';
import { Icon, EFFECT_ICON, type IconName } from '../ui/art/Icon.js';

interface Props {
  events: GameEvent[];
  /** Every seat, so the caster's equipped play-effect can be looked up on card_played. */
  players?: UiPlayer[];
}

type Fx =
  | { id: number; kind: 'bolt'; x: number; y: number; dx: number; dy: number; color: string }
  | { id: number; kind: 'ring'; x: number; y: number; color: string; delay: number; size?: number; thick?: number; dur?: number }
  | { id: number; kind: 'bloom'; x: number; y: number; color: string; delay: number }
  | { id: number; kind: 'spark'; x: number; y: number; dx: number; dy: number; color: string; delay: number }
  | { id: number; kind: 'num'; x: number; y: number; text: string; color: string; delay: number; icon?: IconName }
  | { id: number; kind: 'cast'; x: number; y: number; dx: number; dy: number; defId: string; name: string; color: string }
  | { id: number; kind: 'hurl'; x: number; y: number; dx: number; dy: number; defId: string | null; color: string; spin: boolean }
  | { id: number; kind: 'burst'; x: number; y: number; dx: number; dy: number; rot: number; effect: string; color: string };

/** When the projectile lands, the impact ring/number pops — synced to the hurl travel time.
 *  Kept in step with the slower, weightier hurl so the hit reads as a deliberate arrival. */
const IMPACT_DELAY = 0.46;

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

/** Centre of the round table ≈ centroid of every seat anchored around it. */
function tableCenter(): { x: number; y: number } | null {
  const els = document.querySelectorAll<HTMLElement>('[data-pid]');
  if (els.length === 0) return null;
  let x = 0, y = 0;
  els.forEach((el) => { const r = el.getBoundingClientRect(); x += r.left + r.width / 2; y += r.top + r.height / 2; });
  return { x: x / els.length, y: y / els.length };
}

/** Jolt the struck portrait with a heavy, damped recoil that settles slowly in place —
 *  a weighty blow, not a quick flinch. */
function shake(id: string): void {
  const el = document.querySelector<HTMLElement>(`[data-pid="${CSS.escape(id)}"]`);
  if (!el) return;
  el.style.animation = 'cb-shake .58s cubic-bezier(.33,.06,.28,.98)';
  setTimeout(() => { el.style.animation = ''; }, 600);
}

/** The acting portrait swells up then eases back as it plays a card — a slow, deliberate glow. */
function castPulse(id: string): void {
  const el = document.querySelector<HTMLElement>(`[data-pid="${CSS.escape(id)}"]`);
  if (!el) return;
  el.style.animation = 'cb-cast .72s ease-in-out';
  setTimeout(() => { el.style.animation = ''; }, 740);
}

/**
 * S1 attack-animation layer. Maps the GameEvent stream to lightweight DOM effects:
 * a projectile orb flies attacker→target, lands with an impact ring + portrait shake,
 * and a floating ±number rises off the target. Heals pulse teal. The screen edge still
 * flashes crimson on damage. In S4 this is superseded by a pooled PixiJS particle canvas.
 */
/** A layered impact at (cx,cy): a soft additive bloom + a double shockwave ring. Shared by
 *  every hit (damage/heal/shield) so contact always lands with real light, not a bare outline. */
function impact(spawn: () => number, cx: number, cy: number, color: string, delay: number): Fx[] {
  return [
    { id: spawn(), kind: 'bloom', x: cx, y: cy, color, delay },
    { id: spawn(), kind: 'ring', x: cx, y: cy, color, delay, size: 84, thick: 3, dur: 0.84 },
    { id: spawn(), kind: 'ring', x: cx, y: cy, color, delay: delay + 0.04, size: 150, thick: 1.5, dur: 1.0 },
  ];
}

/** A radial spray of bright sparks flung off a strike point — grit that sells the blow's weight. */
function sparkParticles(spawn: () => number, cx: number, cy: number, color: string, delay: number): Fx[] {
  const out: Fx[] = [];
  const count = 7;
  for (let i = 0; i < count; i++) {
    const ang = (i / count) * Math.PI * 2 + Math.random() * 0.5;
    const dist = 30 + Math.random() * 32;
    out.push({ id: spawn(), kind: 'spark', x: cx, y: cy, dx: Math.cos(ang) * dist, dy: Math.sin(ang) * dist, color, delay });
  }
  return out;
}

/** Spawn a ring of cosmetic burst particles at a seat when its owner plays a card. */
function burstParticles(spawn: () => number, cx: number, cy: number, effect: string, color: string): Fx[] {
  const out: Fx[] = [];
  const count = 8;
  for (let i = 0; i < count; i++) {
    const ang = (i / count) * Math.PI * 2 + Math.random() * 0.4;
    const dist = 34 + Math.random() * 22;
    out.push({
      id: spawn(), kind: 'burst', x: cx, y: cy,
      dx: Math.cos(ang) * dist, dy: Math.sin(ang) * dist - 10, // slight upward bias
      rot: (Math.random() - 0.5) * 220, effect, color,
    });
  }
  return out;
}

export function VfxLayer({ events, players }: Props) {
  const flashRef = useRef<HTMLDivElement>(null);
  const seen = useRef(0);
  const nextId = useRef(1);
  const [fx, setFx] = useState<Fx[]>([]);
  // Freshest players in a ref so the events effect (keyed only on `events`) reads current
  // equipped effects without re-subscribing on every player-state tick.
  const playersRef = useRef<UiPlayer[] | undefined>(players);
  playersRef.current = players;

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
        const isAttack = def.effects.some((ef) => ef.kind === 'damage');
        if (isAttack) {
          // Per-item projectile: the weapon/spell is hurled from the caster toward its target
          // (a chosen foe, or the table centre for area/random hits). Blades spin; magic glides.
          const chosen = e.targetId ? centerOf(e.targetId) : null;
          const dest = chosen ?? tableCenter() ?? src;
          add.push({ id: nextId.current++, kind: 'hurl', x: src.x, y: src.y, dx: dest.x - src.x, dy: dest.y - src.y, defId: e.defId, color, spin: def.kind === 'weapon' });
        } else {
          // Non-offensive cards (heal/shield/tempo) are dealt onto the table in front of the player.
          const c = tableCenter();
          const spot = c ? { x: src.x + (c.x - src.x) * 0.34, y: src.y + (c.y - src.y) * 0.34 } : src;
          add.push({ id: nextId.current++, kind: 'cast', x: spot.x, y: spot.y, dx: src.x - spot.x, dy: src.y - spot.y, defId: e.defId, name: def.name, color });
        }
        castPulse(e.playerId);
        // Cosmetic play-effect: a purchasable burst pops at the caster's seat — visible to all.
        const caster = playersRef.current?.find((p) => p.id === e.playerId);
        const fxDef = caster ? EFFECT_BY_ID[caster.effect] : undefined;
        if (fxDef && EFFECT_ICON[caster!.effect]) {
          add.push(...burstParticles(() => nextId.current++, src.x, src.y, caster!.effect, fxDef.color));
        }
      } else if (e.type === 'damage_dealt') {
        const tgt = centerOf(e.targetId);
        if (!tgt) continue;
        damaged = true;
        const color = ELEM[e.element] ?? ELEM.none;
        // The projectile was already launched by the preceding card_played; the impact lands as it arrives:
        // a bloom + double shockwave, a spray of sparks, then the damage number rising off the target.
        add.push(...impact(() => nextId.current++, tgt.x, tgt.y, color, IMPACT_DELAY));
        add.push(...sparkParticles(() => nextId.current++, tgt.x, tgt.y, color, IMPACT_DELAY));
        add.push({ id: nextId.current++, kind: 'num', x: tgt.x, y: tgt.y, text: `-${e.amount}`, color, delay: IMPACT_DELAY });
        setTimeout(() => shake(e.targetId), IMPACT_DELAY * 1000);
      } else if (e.type === 'card_stolen') {
        // A card is yanked from the victim's hand and flies across to the thief.
        const from = centerOf(e.targetId);
        const to = centerOf(e.thiefId);
        if (from && to) {
          add.push({ id: nextId.current++, kind: 'hurl', x: from.x, y: from.y, dx: to.x - from.x, dy: to.y - from.y, defId: null, color: '#c9a0ff', spin: true });
          castPulse(e.thiefId);
        }
      } else if (e.type === 'healed') {
        const tgt = centerOf(e.targetId);
        if (!tgt) continue;
        add.push(...impact(() => nextId.current++, tgt.x, tgt.y, HEAL, 0));
        add.push({ id: nextId.current++, kind: 'num', x: tgt.x, y: tgt.y, text: `+${e.amount}`, color: HEAL, delay: 0 });
      } else if (e.type === 'shielded') {
        const tgt = centerOf(e.targetId);
        if (!tgt) continue;
        add.push(...impact(() => nextId.current++, tgt.x, tgt.y, SHIELD, 0));
        add.push({ id: nextId.current++, kind: 'num', x: tgt.x, y: tgt.y, text: `+${e.amount}`, color: SHIELD, delay: 0, icon: 'shield' });
      }
    }

    if (damaged && flashRef.current) {
      // A deep, unhurried crimson bloom at the screen edge — the hit sinks in, then recedes.
      flashRef.current.style.boxShadow = 'inset 0 0 160px 20px rgba(196,42,74,0.5)';
      setTimeout(() => { if (flashRef.current) flashRef.current.style.boxShadow = 'inset 0 0 0 rgba(196,42,74,0)'; }, 260);
    }

    if (add.length) {
      setFx((cur) => [...cur, ...add]);
      const ids = new Set(add.map((a) => a.id));
      // Outlive the slowest effect (a delayed damage number rises for ~1.5s after landing).
      setTimeout(() => setFx((cur) => cur.filter((f) => !ids.has(f.id))), 2200);
    }
  }, [events]);

  return (
    <>
      <div ref={flashRef} style={flash} aria-hidden />
      <div style={stage} aria-hidden>
        {fx.map((f) =>
          f.kind === 'bolt' ? (
            <span key={f.id} style={boltStyle(f)} />
          ) : f.kind === 'hurl' ? (
            <span key={f.id} style={hurlStyle(f)}>
              {f.defId ? <CardArt id={f.defId} size={30} /> : <Icon name="card" size={28} color={f.color} />}
            </span>
          ) : f.kind === 'ring' ? (
            <span key={f.id} style={ringStyle(f)} />
          ) : f.kind === 'bloom' ? (
            <span key={f.id} style={bloomStyle(f)} />
          ) : f.kind === 'spark' ? (
            <span key={f.id} style={sparkStyle(f)} />
          ) : f.kind === 'burst' ? (
            <span key={f.id} style={burstStyle(f)}><Icon name={EFFECT_ICON[f.effect]!} size={16} color={f.color} /></span>
          ) : f.kind === 'cast' ? (
            <span key={f.id} style={castStyle(f)}>
              <CardArt id={f.defId} size={22} />
              <span style={{ fontSize: 8, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', letterSpacing: 0.2 }}>{f.name}</span>
            </span>
          ) : (
            <span key={f.id} style={numStyle(f)}>{f.icon && <Icon name={f.icon} size={22} style={{ marginRight: 2 }} />}{f.text}</span>
          ),
        )}
      </div>
    </>
  );
}

const flash: React.CSSProperties = {
  position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 50, transition: 'box-shadow .6s ease-out',
};
const stage: React.CSSProperties = {
  position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 60, overflow: 'hidden',
};

function boltStyle(f: Extract<Fx, { kind: 'bolt' }>): React.CSSProperties {
  return {
    position: 'fixed', left: f.x, top: f.y, width: 18, height: 18, borderRadius: '50%',
    background: `radial-gradient(circle, #fff, ${f.color} 55%, transparent 72%)`,
    boxShadow: `0 0 16px ${f.color}, 0 0 30px ${f.color}`,
    animation: 'cb-bolt .3s cubic-bezier(.45,0,.55,1) forwards',
    willChange: 'transform, opacity',
    ['--dx' as string]: `${f.dx}px`, ['--dy' as string]: `${f.dy}px`,
  } as React.CSSProperties;
}
function hurlStyle(f: Extract<Fx, { kind: 'hurl' }>): React.CSSProperties {
  return {
    position: 'fixed', left: f.x, top: f.y, fontSize: 28, lineHeight: 1, zIndex: 61,
    filter: `drop-shadow(0 0 10px ${f.color}) drop-shadow(0 2px 5px rgba(0,0,0,0.6))`,
    willChange: 'transform, opacity',
    ['--dx' as string]: `${f.dx}px`, ['--dy' as string]: `${f.dy}px`,
    animation: `${f.spin ? 'cb-hurl' : 'cb-hurl-glide'} .64s cubic-bezier(.34,.32,.2,1) forwards`,
  } as React.CSSProperties;
}
function burstStyle(f: Extract<Fx, { kind: 'burst' }>): React.CSSProperties {
  return {
    position: 'fixed', left: f.x, top: f.y, fontSize: 16, lineHeight: 1, zIndex: 62,
    filter: `drop-shadow(0 0 6px ${f.color})`, willChange: 'transform, opacity',
    ['--dx' as string]: `${f.dx}px`, ['--dy' as string]: `${f.dy}px`, ['--rot' as string]: `${f.rot}deg`,
    animation: 'cb-burst .72s cubic-bezier(.2,.7,.3,1) forwards',
  } as React.CSSProperties;
}
function ringStyle(f: Extract<Fx, { kind: 'ring' }>): React.CSSProperties {
  const size = f.size ?? 96;
  return {
    position: 'fixed', left: f.x, top: f.y, width: size, height: size, borderRadius: '50%',
    border: `${f.thick ?? 3}px solid ${f.color}`, boxShadow: `0 0 22px ${f.color}`, willChange: 'transform, opacity',
    animation: `cb-ring ${f.dur ?? 0.84}s cubic-bezier(.16,.84,.44,1) ${f.delay}s backwards`,
  };
}
/** Additive light flash at the hit point — screen-blended so it reads as real light on the dark table. */
function bloomStyle(f: Extract<Fx, { kind: 'bloom' }>): React.CSSProperties {
  return {
    position: 'fixed', left: f.x, top: f.y, width: 120, height: 120, borderRadius: '50%',
    background: `radial-gradient(circle, #fff 0%, ${f.color} 30%, transparent 68%)`,
    mixBlendMode: 'screen', willChange: 'transform, opacity',
    animation: `cb-bloom .6s ease-out ${f.delay}s backwards`,
  };
}
/** A single bright spark shard flung off the strike. */
function sparkStyle(f: Extract<Fx, { kind: 'spark' }>): React.CSSProperties {
  return {
    position: 'fixed', left: f.x, top: f.y, width: 5, height: 5, borderRadius: '50%',
    background: `radial-gradient(circle, #fff, ${f.color} 60%, transparent)`,
    boxShadow: `0 0 8px ${f.color}`, willChange: 'transform, opacity',
    ['--dx' as string]: `${f.dx}px`, ['--dy' as string]: `${f.dy}px`,
    animation: `cb-spark .5s cubic-bezier(.12,.7,.3,1) ${f.delay}s backwards`,
  } as React.CSSProperties;
}
function castStyle(f: Extract<Fx, { kind: 'cast' }>): React.CSSProperties {
  return {
    position: 'fixed', left: f.x, top: f.y, display: 'flex', flexDirection: 'column',
    alignItems: 'center', gap: 2, padding: '6px 7px', borderRadius: 8, width: 48,
    background: 'linear-gradient(170deg,#1c2233,#11151f)', border: `1px solid ${f.color}`,
    boxShadow: `0 0 14px ${f.color}, 0 8px 18px rgba(0,0,0,0.6)`,
    fontFamily: '"Geist", system-ui, sans-serif', willChange: 'transform, opacity',
    ['--dx' as string]: `${f.dx}px`, ['--dy' as string]: `${f.dy}px`,
    animation: 'cb-deal 1.45s cubic-bezier(.2,.7,.3,1) forwards',
  } as React.CSSProperties;
}
function numStyle(f: Extract<Fx, { kind: 'num' }>): React.CSSProperties {
  return {
    position: 'fixed', left: f.x, top: f.y, color: f.color,
    fontFamily: '"Geist Mono", ui-monospace, monospace', fontWeight: 800, fontSize: 30,
    textShadow: `0 0 10px ${f.color}, 0 2px 4px rgba(0,0,0,0.7)`, whiteSpace: 'nowrap',
    willChange: 'transform, opacity',
    animation: `cb-rise 1.5s cubic-bezier(.16,.84,.44,1) ${f.delay}s backwards`,
  };
}
