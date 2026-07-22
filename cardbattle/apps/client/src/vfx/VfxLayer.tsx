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
  | { id: number; kind: 'num'; x: number; y: number; text: string; color: string; delay: number; icon?: IconName }
  | { id: number; kind: 'cast'; x: number; y: number; dx: number; dy: number; defId: string; name: string; color: string }
  | { id: number; kind: 'hurl'; x: number; y: number; dx: number; dy: number; defId: string | null; color: string; spin: boolean; dur?: number }
  | { id: number; kind: 'impact'; x: number; y: number; color: string; delay: number; big: boolean }
  | { id: number; kind: 'burst'; x: number; y: number; dx: number; dy: number; rot: number; effect: string; color: string };

/** When the projectile lands, the impact ring/number pops — synced to the hurl travel time.
 *  Kept in step with the slower, weightier hurl so the hit reads as a deliberate arrival. */
const IMPACT_DELAY = 0.55;

/** Per-element tint for projectiles/impacts — muted printed-ink pigments, not neon; physical/none
 *  fall back to a dusty ochre-rose. */
const ELEM: Record<Element, string> = {
  physical: '#bd6f66', fire: '#c1703c', ice: '#7fa6b6',
  lightning: '#c4a24e', poison: '#8b9b52', holy: '#d6c69a', none: '#bd6f66',
};
const HEAL = '#8f9d4f';
const SHIELD = '#7f95aa';

/** Viewport-centre of a player's portrait (the face), so hits land on the person and not the
 *  nameplate below. Prefers the dedicated portrait anchor; falls back to the whole seat card. */
function centerOf(id: string): { x: number; y: number } | null {
  const sel = `${CSS.escape(id)}`;
  const el = document.querySelector<HTMLElement>(`[data-portrait="${sel}"]`)
    ?? document.querySelector<HTMLElement>(`[data-pid="${sel}"]`);
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

/** The struck portrait takes a real, directional blow: it's SHOVED away from the attacker (kx/ky =
 *  unit vector pointing FROM the attacker TO the victim), freezes for a beat at the peak of the
 *  knockback (the hitstop that sells mass), then damped-recoils back to rest. Shove distance and
 *  settle time scale with the blow's magnitude, so a chip tap barely rocks and a crusher throws the
 *  seat. The seat is centred with translate(-50%,-50%) so that offset is baked into every key. */
function impactHit(id: string, kx: number, ky: number, magNorm: number): void {
  const el = document.querySelector<HTMLElement>(`[data-pid="${CSS.escape(id)}"]`);
  if (!el) return;
  const px = 7 + magNorm * 7; // ~10px chip → ~19px crusher shove
  el.style.setProperty('--kx', `${(kx * px).toFixed(1)}px`);
  el.style.setProperty('--ky', `${(ky * px).toFixed(1)}px`);
  const dur = 0.5 + magNorm * 0.18;
  el.style.animation = 'none';
  void el.offsetWidth; // reflow so back-to-back AoE hits always re-fire from 0
  el.style.animation = `cb-hit ${dur.toFixed(2)}s cubic-bezier(.3,.5,.25,1)`;
  setTimeout(() => { el.style.animation = ''; }, dur * 1000 + 40);
}

/** A whole-screen camera kick on impact — the entire arena jolts and settles, so a hit shoves the
 *  world, not just the little portrait. A faint scale masks the edges the translate exposes. BALATRO
 *  RULE: shake amplitude scales continuously with the blow's magnitude (via the --cbk custom prop the
 *  single keyframe multiplies its offsets by), clamped so chip damage still registers and a huge hit
 *  doesn't fling the screen off. Cleared+restarted so back-to-back hits always re-fire. */
function cameraKick(amount: number): void {
  const el = document.querySelector<HTMLElement>('[data-arena]');
  if (!el) return;
  const mag = Math.max(0.4, Math.min(1.7, amount / 9));
  const dur = 0.36 + mag * 0.14;
  el.style.setProperty('--cbk', mag.toFixed(2));
  el.style.animation = 'none';
  void el.offsetWidth; // reflow so a repeat hit restarts the shake from 0
  el.style.animation = `cb-camera ${dur.toFixed(2)}s cubic-bezier(.36,.07,.4,1)`;
  setTimeout(() => { el.style.animation = ''; }, dur * 1000 + 60);
}

/** The acting portrait swells up then eases back as it plays a card — a slow, deliberate glow. */
function castPulse(id: string): void {
  const el = document.querySelector<HTMLElement>(`[data-pid="${CSS.escape(id)}"]`);
  if (!el) return;
  el.style.animation = 'cb-cast .72s ease-in-out';
  setTimeout(() => { el.style.animation = ''; }, 740);
}

/** The attacker winds back a hair, then drives a committed lunge toward the victim just before
 *  the strike lands — a real weighty blow instead of a stationary glow. dirX/dirY = unit vector
 *  pointing at the target; the seat is centred with translate(-50%,-50%) so the offset is baked in. */
function lunge(id: string, dirX: number, dirY: number): void {
  const el = document.querySelector<HTMLElement>(`[data-pid="${CSS.escape(id)}"]`);
  if (!el) return;
  const mag = 22;
  el.style.setProperty('--lx', `${(dirX * mag).toFixed(1)}px`);
  el.style.setProperty('--ly', `${(dirY * mag).toFixed(1)}px`);
  el.style.animation = 'cb-lunge .8s cubic-bezier(.34,.8,.3,1)';
  setTimeout(() => { el.style.animation = ''; }, 820);
}

/**
 * S1 attack-animation layer. Maps the GameEvent stream to lightweight DOM effects:
 * a projectile orb flies attacker→target, lands with an impact ring + portrait shake,
 * and a floating ±number rises off the target. Heals pulse teal. The screen edge still
 * flashes crimson on damage. In S4 this is superseded by a pooled PixiJS particle canvas.
 */
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

    for (const e of fresh) {
      if (e.type === 'card_played') {
        const src = centerOf(e.playerId);
        const def = CARD_DEFS[e.defId];
        if (!src || !def) continue;
        const color = ELEM[def.element] ?? ELEM.none;
        const isAttack = def.effects.some(
          (ef) => ef.kind === 'damage' || ef.kind === 'pierce' || ef.kind === 'leech' || ef.kind === 'desperation',
        );
        if (isAttack) {
          // GODFIELD SIGNATURE: the actual weapon/item card is HURLED at the victim — it spins
          // end-over-end across the table and lands as the blow connects, instead of an abstract
          // comet beam. Aims at the chosen foe, or the table centre for area/random hits.
          const chosen = e.targetId ? centerOf(e.targetId) : null;
          const dest = chosen ?? tableCenter() ?? src;
          const dx = dest.x - src.x, dy = dest.y - src.y;
          add.push({ id: nextId.current++, kind: 'hurl', x: src.x, y: src.y, dx, dy, defId: e.defId, color, spin: true, dur: IMPACT_DELAY });
          // The attacker physically lunges at the victim — the missing weight in the old motion.
          const len = Math.hypot(dx, dy) || 1;
          lunge(e.playerId, dx / len, dy / len);
        } else {
          // Non-offensive cards (heal/shield/tempo) are dealt onto the table in front of the player.
          const c = tableCenter();
          const spot = c ? { x: src.x + (c.x - src.x) * 0.34, y: src.y + (c.y - src.y) * 0.34 } : src;
          add.push({ id: nextId.current++, kind: 'cast', x: spot.x, y: spot.y, dx: src.x - spot.x, dy: src.y - spot.y, defId: e.defId, name: def.name, color });
          castPulse(e.playerId);
        }
        // Cosmetic play-effect: a purchasable burst pops at the caster's seat — visible to all.
        const caster = playersRef.current?.find((p) => p.id === e.playerId);
        const fxDef = caster ? EFFECT_BY_ID[caster.effect] : undefined;
        if (fxDef && EFFECT_ICON[caster!.effect]) {
          add.push(...burstParticles(() => nextId.current++, src.x, src.y, caster!.effect, fxDef.color));
        }
      } else if (e.type === 'damage_dealt') {
        // Only bail if the target truly isn't on screen. Everything else is DEFERRED to the exact
        // moment of impact and both faces are RE-MEASURED then — so the hit lands dead-centre and
        // the knockback aims true even after the mouse-parallax has drifted the seats.
        if (!centerOf(e.targetId)) continue;
        const color = ELEM[e.element] ?? ELEM.none;
        const big = e.amount >= 8;
        const magNorm = Math.max(0.4, Math.min(1.7, e.amount / 9));
        // No floating damage NUMBER — a big glowing "+N" is the classic cheap free-to-play tell, and
        // it read cheap no matter how the motion was tuned. The blow is sold entirely by PHYSICS the
        // way fighting games / Godfield do it: one tight contact flash, the seat SHOVED away from the
        // attacker, the camera kick, and the crimson screen-bleed — all synced to this instant and all
        // scaled to how hard the blow hit. The HP bar draining does the counting.
        setTimeout(() => {
          const t = centerOf(e.targetId);
          if (t) {
            const spawn: Fx[] = [
              { id: nextId.current++, kind: 'impact', x: t.x, y: t.y, color, delay: 0, big },
            ];
            setFx((cur) => [...cur, ...spawn]);
            const ids = new Set(spawn.map((s) => s.id));
            setTimeout(() => setFx((cur) => cur.filter((f) => !ids.has(f.id))), 2000);
            // Knockback aimed straight away from the attacker. Self-inflicted / area damage with no
            // distinct source (e.g. poison) falls back to a downward slump.
            const s = centerOf(e.sourceId);
            let kx = 0, ky = 1;
            if (s && (s.x !== t.x || s.y !== t.y)) {
              const dx = t.x - s.x, dy = t.y - s.y, len = Math.hypot(dx, dy) || 1;
              kx = dx / len; ky = dy / len;
            }
            impactHit(e.targetId, kx, ky, magNorm);
            cameraKick(e.amount);
            // Crimson concussion at the screen edge — synced to the landing, deeper for a bigger hit.
            if (flashRef.current) {
              const a = Math.min(0.72, 0.34 + e.amount / 42);
              const spread = 24 + Math.min(34, e.amount);
              flashRef.current.style.boxShadow = `inset 0 0 ${200 + spread * 2}px ${spread}px rgba(196,42,74,${a.toFixed(2)})`;
              setTimeout(() => { if (flashRef.current) flashRef.current.style.boxShadow = 'inset 0 0 0 rgba(196,42,74,0)'; }, 320);
            }
          }
        }, IMPACT_DELAY * 1000);
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
        add.push({ id: nextId.current++, kind: 'num', x: tgt.x, y: tgt.y, text: `+${e.amount}`, color: HEAL, delay: 0 });
      } else if (e.type === 'shielded') {
        const tgt = centerOf(e.targetId);
        if (!tgt) continue;
        add.push({ id: nextId.current++, kind: 'num', x: tgt.x, y: tgt.y, text: `+${e.amount}`, color: SHIELD, delay: 0, icon: 'shield' });
      }
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
          ) : f.kind === 'impact' ? (
            <span key={f.id} style={impactStyle(f)} />
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
    animation: `${f.spin ? 'cb-hurl' : 'cb-hurl-glide'} ${(f.dur ?? 0.64).toFixed(2)}s cubic-bezier(.34,.32,.2,1) forwards`,
  } as React.CSSProperties;
}
/** The detonation an attack makes on arrival: a bright core radial ringed by an element-tinted
 *  shockwave circle, scaled up and thinned out. One element carries both — the background is the
 *  flash, the border is the ring, and both grow together under the transform scale. */
/** A single TIGHT contact flash at the point of impact — a hard, brief white spark, not a big soft
 *  expanding bubble. The slash carries the shape; this just marks the moment of contact. */
function impactStyle(f: Extract<Fx, { kind: 'impact' }>): React.CSSProperties {
  const size = f.big ? 84 : 56;
  return {
    position: 'fixed', left: f.x, top: f.y, width: size, height: size, borderRadius: '50%',
    // A hard white-hot core that punches on instantly, ringed by a tight element bloom — a
    // concussion at the point of contact, not a soft expanding bubble.
    background: `radial-gradient(circle, #fff 0%, #fff 16%, ${f.color}dd 40%, transparent 66%)`,
    boxShadow: `0 0 22px ${f.color}, 0 0 8px #fff`,
    mixBlendMode: 'screen', willChange: 'transform, opacity', zIndex: 61,
    animation: `cb-impact ${f.big ? 0.32 : 0.26}s cubic-bezier(.12,.75,.3,1) ${f.delay}s backwards`,
  };
}
function burstStyle(f: Extract<Fx, { kind: 'burst' }>): React.CSSProperties {
  return {
    position: 'fixed', left: f.x, top: f.y, fontSize: 16, lineHeight: 1, zIndex: 62,
    filter: `drop-shadow(0 0 6px ${f.color})`, willChange: 'transform, opacity',
    ['--dx' as string]: `${f.dx}px`, ['--dy' as string]: `${f.dy}px`, ['--rot' as string]: `${f.rot}deg`,
    animation: 'cb-burst .72s cubic-bezier(.2,.7,.3,1) forwards',
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
/** Heal / shield gains only — a lighter, buoyant rise. (Damage no longer floats a number; the hit
 *  is sold by physics: flash + knockback + camera + crimson + the draining HP bar.) */
function numStyle(f: Extract<Fx, { kind: 'num' }>): React.CSSProperties {
  return {
    position: 'fixed', left: f.x, top: f.y, color: f.color, whiteSpace: 'nowrap',
    display: 'flex', alignItems: 'center', gap: 3, lineHeight: 1,
    fontFamily: '"Geist", system-ui, sans-serif', willChange: 'transform, opacity',
    fontWeight: 800, fontSize: 30, letterSpacing: '-0.02em',
    textShadow: `0 0 10px ${f.color}, 0 2px 5px rgba(0,0,0,0.75)`,
    animation: `cb-rise 1.5s cubic-bezier(.16,.84,.44,1) ${f.delay}s backwards`,
  };
}
