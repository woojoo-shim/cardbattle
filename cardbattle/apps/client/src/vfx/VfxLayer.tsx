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
  /** The local player's seat id — so the crimson pain-bleed fires ONLY when *I* take the blow, not
   *  when I land one on a foe. Dealing damage shouldn't paint my own screen red. */
  myId?: string;
}

type Fx =
  | { id: number; kind: 'bolt'; x: number; y: number; dx: number; dy: number; color: string }
  | { id: number; kind: 'num'; x: number; y: number; text: string; color: string; delay: number; icon?: IconName }
  | { id: number; kind: 'cast'; x: number; y: number; dx: number; dy: number; defId: string; name: string; color: string }
  | { id: number; kind: 'summon'; x: number; y: number; defId: string; color: string }
  | { id: number; kind: 'activate'; x: number; y: number; size: number; defId: string; name: string; color: string }
  | { id: number; kind: 'hurl'; x: number; y: number; dx: number; dy: number; defId: string | null; color: string; spin: boolean; dur?: number }
  | { id: number; kind: 'impact'; x: number; y: number; color: string; delay: number; big: boolean }
  | { id: number; kind: 'death'; x: number; y: number }
  | { id: number; kind: 'shard'; x: number; y: number; dx: number; dy: number; rot: number }
  | { id: number; kind: 'buff'; x: number; y: number }
  | { id: number; kind: 'spark'; x: number; y: number; dx: number; dy: number; delay: number }
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
// Cold steel for a blow that a shield swallows whole — the guard flashes silver, not blood-warm.
const STEEL = '#b8c4d0';

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

/** A KNOCKOUT reel — the finisher when a blow actually ELIMINATES a player (not just chips HP). The
 *  audio already lands a heavy finisher thud on player_eliminated; this is the missing VISUAL half.
 *  A harder, spinning version of the hit recoil: the seat is thrown further and REELS with a rotation
 *  as it goes down; the persistent grayscale/skull dead-state carries the "stays down" read after. */
function knockout(id: string, kx: number, ky: number): void {
  const el = document.querySelector<HTMLElement>(`[data-pid="${CSS.escape(id)}"]`);
  if (!el) return;
  const px = 20; // thrown hard — a finisher, not a chip shove
  el.style.setProperty('--kx', `${(kx * px).toFixed(1)}px`);
  el.style.setProperty('--ky', `${(ky * px).toFixed(1)}px`);
  el.style.setProperty('--kr', `${kx >= 0 ? 12 : -12}deg`); // reel spun away from the blow
  el.style.animation = 'none';
  void el.offsetWidth; // reflow so the reel always fires from rest
  el.style.animation = 'cb-ko 0.95s cubic-bezier(.32,.62,.24,1)';
  setTimeout(() => { el.style.animation = ''; }, 990);
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

export function VfxLayer({ events, players, myId }: Props) {
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
        const isAttack = def.kind !== 'minion' && def.effects.some((ef) => ef.kind === 'damage' || ef.kind === 'destroy');
        if (def.kind !== 'minion') {
          // BIG LEFT-OF-THE-TABLE ACTIVATION REVEAL: whenever a card is played (dragged onto the
          // desk to cast it), the card art blows up HUGE on the LEFT of the table, holds a readable
          // beat with a glowing element-tinted aura, then fades — so it unmistakably reads as the
          // card being CAST/activated. This is the star; the attack hurl / support deal below still
          // deliver the effect afterward.
          const c = tableCenter();
          const midY = c ? c.y : window.innerHeight / 2;
          const size = Math.round(Math.min(window.innerHeight * 0.52, 460));
          const leftX = Math.max(size * 0.6, window.innerWidth * 0.17);
          add.push({ id: nextId.current++, kind: 'activate', x: leftX, y: midY, size, defId: e.defId, name: def.name, color });
        }
        if (def.kind === 'minion') {
          // A summoned minion gets a BIG, prominent reveal on the CASTER's side of the table (pulled
          // partway toward centre so it stays on-screen but never blocks the middle): the card art
          // swells up large so you clearly see who just took the field, holds a beat, then fades.
          const c = tableCenter();
          const spot = c ? { x: src.x + (c.x - src.x) * 0.45, y: src.y + (c.y - src.y) * 0.45 } : src;
          add.push({ id: nextId.current++, kind: 'summon', x: spot.x, y: spot.y, defId: e.defId, color });
          castPulse(e.playerId);
        } else if (isAttack) {
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
        const blocked = e.absorbed ?? 0;
        const fullyBlocked = e.amount === 0 && blocked > 0; // the shield swallowed the whole blow
        // A landed hit flashes the element tint; a fully-guarded one flashes cold steel instead.
        const color = fullyBlocked ? STEEL : (ELEM[e.element] ?? ELEM.none);
        const big = e.amount >= 8;
        // Shove/kick scale with the HP actually lost; a fully-blocked blow still gives a light rock.
        const kickAmt = e.amount || blocked * 0.4;
        const magNorm = Math.max(0.4, Math.min(1.7, kickAmt / 9));
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
            cameraKick(kickAmt);
            // Crimson concussion at the screen edge — ONLY when *I* lose real HP. A full screen-edge
            // blood vignette is the "I'm taking the hit / danger" language; it read wrong firing on
            // EVERY blow, painting my own screen red even as I struck a foe. Now it's reserved for my
            // own pain (targetId === my seat). Landing a hit on an enemy is sold by their reeling seat
            // + the whole-arena camera kick, no self-blood. A shield that eats the blow draws none.
            if (e.amount > 0 && e.targetId === myId && flashRef.current) {
              const a = Math.min(0.8, 0.4 + e.amount / 38);
              const spread = 28 + Math.min(38, e.amount);
              flashRef.current.style.boxShadow = `inset 0 0 ${200 + spread * 2}px ${spread}px rgba(196,42,74,${a.toFixed(2)})`;
              setTimeout(() => { if (flashRef.current) flashRef.current.style.boxShadow = 'inset 0 0 0 rgba(196,42,74,0)'; }, 320);
            }
          }
        }, IMPACT_DELAY * 1000);
      } else if (e.type === 'minion_attacked') {
        // A minion trades blows: it lunges at whatever it's striking (enemy hero or minion).
        const from = centerOf(e.attackerId);
        const to = centerOf(e.targetId);
        if (from && to) {
          const dx = to.x - from.x, dy = to.y - from.y, len = Math.hypot(dx, dy) || 1;
          lunge(e.attackerId, dx / len, dy / len);
        }
      } else if (e.type === 'minion_damaged') {
        // A wounded minion takes a tight contact flash + a small recoil at its chip.
        if (!centerOf(e.minionId)) continue;
        const magNorm = Math.max(0.4, Math.min(1.2, e.amount / 6));
        setTimeout(() => {
          const t = centerOf(e.minionId);
          if (!t) return;
          const spawn: Fx[] = [{ id: nextId.current++, kind: 'impact', x: t.x, y: t.y, color: ELEM.none, delay: 0, big: false }];
          setFx((cur) => [...cur, ...spawn]);
          const ids = new Set(spawn.map((s) => s.id));
          setTimeout(() => setFx((cur) => cur.filter((f) => !ids.has(f.id))), 2000);
          impactHit(e.minionId, 0, 1, magNorm);
        }, IMPACT_DELAY * 1000);
      } else if (e.type === 'minion_died') {
        // A destroyed minion shatters: a skull puffs up and drifts off where it stood, ringed by a
        // burst of dark shards flung outward. Measured NOW — the minion is about to leave the DOM,
        // so its on-screen spot must be captured before the board re-renders without it.
        const at = centerOf(e.minionId) ?? tableCenter();
        if (!at) continue;
        add.push({ id: nextId.current++, kind: 'death', x: at.x, y: at.y });
        const shards = 8;
        for (let i = 0; i < shards; i++) {
          const ang = (i / shards) * Math.PI * 2 + Math.random() * 0.5;
          const dist = 30 + Math.random() * 28;
          add.push({
            id: nextId.current++, kind: 'shard', x: at.x, y: at.y,
            dx: Math.cos(ang) * dist, dy: Math.sin(ang) * dist - 8, rot: (Math.random() - 0.5) * 280,
          });
        }
      } else if (e.type === 'minion_buffed') {
        // A minion is empowered: a warm emerald→gold surge blooms up from it with a cluster of
        // gilded motes rising, selling the "grows stronger" beat. Fires at once (the minion stays).
        const at = centerOf(e.minionId);
        if (!at) continue;
        add.push({ id: nextId.current++, kind: 'buff', x: at.x, y: at.y });
        const motes = 6;
        for (let i = 0; i < motes; i++) {
          add.push({
            id: nextId.current++, kind: 'spark', x: at.x, y: at.y,
            dx: (Math.random() - 0.5) * 46, dy: -(34 + Math.random() * 32), delay: Math.random() * 0.18,
          });
        }
      } else if (e.type === 'healed') {
        const tgt = centerOf(e.targetId);
        if (!tgt) continue;
        add.push({ id: nextId.current++, kind: 'num', x: tgt.x, y: tgt.y, text: `+${e.amount}`, color: HEAL, delay: 0 });
      } else if (e.type === 'shielded') {
        const tgt = centerOf(e.targetId);
        if (!tgt) continue;
        add.push({ id: nextId.current++, kind: 'num', x: tgt.x, y: tgt.y, text: `+${e.amount}`, color: SHIELD, delay: 0, icon: 'shield' });
      } else if (e.type === 'player_eliminated') {
        // A finisher deserves a finisher's motion. The killing damage_dealt landed this same instant
        // (its impact flash + hit recoil fire at IMPACT_DELAY); DEFER the knockout to the same beat so
        // it overrides that light recoil with a hard spinning reel + a max-mag camera kick, landing
        // together with the heavy finisher thud the audio already plays. Direction comes from the last
        // blow that struck this seat in the batch; a sourceless kill (e.g. poison) slumps straight down.
        if (!centerOf(e.playerId)) continue;
        const kill = [...fresh].reverse().find(
          (k) => k.type === 'damage_dealt' && k.targetId === e.playerId,
        ) as Extract<GameEvent, { type: 'damage_dealt' }> | undefined;
        setTimeout(() => {
          const t = centerOf(e.playerId);
          if (!t) return;
          let kx = 0, ky = 1;
          const s = kill ? centerOf(kill.sourceId) : null;
          if (s && (s.x !== t.x || s.y !== t.y)) {
            const dx = t.x - s.x, dy = t.y - s.y, len = Math.hypot(dx, dy) || 1;
            kx = dx / len; ky = dy / len;
          }
          knockout(e.playerId, kx, ky);
          cameraKick(18); // max-mag (clamps to 1.7) — the whole arena rocks on the kill
        }, IMPACT_DELAY * 1000);
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
              {f.defId ? <CardArt id={f.defId} size={44} /> : <Icon name="card" size={28} color={f.color} />}
            </span>
          ) : f.kind === 'impact' ? (
            <span key={f.id} style={impactStyle(f)} />
          ) : f.kind === 'death' ? (
            <span key={f.id} style={deathStyle(f)}><Icon name="skull" size={32} color="#e7dfe8" /></span>
          ) : f.kind === 'shard' ? (
            <span key={f.id} style={shardStyle(f)} />
          ) : f.kind === 'buff' ? (
            <span key={f.id} style={buffStyle(f)} />
          ) : f.kind === 'spark' ? (
            <span key={f.id} style={sparkStyle(f)} />
          ) : f.kind === 'burst' ? (
            <span key={f.id} style={burstStyle(f)}><Icon name={EFFECT_ICON[f.effect]!} size={16} color={f.color} /></span>
          ) : f.kind === 'summon' ? (
            <span key={f.id} style={summonStyle(f)}><CardArt id={f.defId} size={460} /></span>
          ) : f.kind === 'activate' ? (
            <span key={f.id} style={activateStyle(f)}>
              <CardArt id={f.defId} size={f.size} />
              <span style={activateNameStyle(f)}>{f.name}</span>
            </span>
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
    filter: `drop-shadow(0 0 14px ${f.color}) drop-shadow(0 8px 16px rgba(0,0,0,0.72))`,
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
  const size = f.big ? 96 : 64;
  // Not a flat disc — a STARBURST spark: a white-hot core, four dominant lens-flare STAR ARMS, and a
  // finer sparkle of light spikes between them, all masked to fade off radially so it reads as an
  // energetic flash of light at the point of contact, not a plain circle. Layering a coarse (90°) and
  // a fine (18°) conic gives uneven ray lengths — a real sparkle, not uniform spokes. The core keeps
  // a tight white hot-spot ringed by the element tint. Single, centred, cohesive.
  const fade = 'radial-gradient(circle, #000 16%, rgba(0,0,0,0.6) 40%, transparent 74%)';
  const background = [
    `radial-gradient(circle, #fff 0%, #fff 14%, ${f.color}f0 30%, ${f.color}55 48%, transparent 66%)`,
    'repeating-conic-gradient(from 45deg, rgba(255,255,255,0.85) 0deg 1.1deg, transparent 1.1deg 90deg)',
    'repeating-conic-gradient(from 12deg, rgba(255,255,255,0.5) 0deg 1.8deg, transparent 1.8deg 22.5deg)',
  ].join(',');
  return {
    position: 'fixed', left: f.x, top: f.y, width: size, height: size, background,
    maskImage: fade, WebkitMaskImage: fade,
    filter: `drop-shadow(0 0 20px ${f.color}) drop-shadow(0 0 7px #fff)`,
    mixBlendMode: 'screen', willChange: 'transform, opacity', zIndex: 61,
    animation: `cb-impact ${f.big ? 0.36 : 0.3}s cubic-bezier(.1,.78,.28,1) ${f.delay}s backwards`,
  };
}
/** A destroyed minion's skull: puffs up big, then drifts up and fades — the clear "파괴됨" beat. */
function deathStyle(f: Extract<Fx, { kind: 'death' }>): React.CSSProperties {
  return {
    position: 'fixed', left: f.x, top: f.y, zIndex: 62,
    filter: 'drop-shadow(0 0 12px rgba(200,96,104,0.85)) drop-shadow(0 2px 5px rgba(0,0,0,0.8))',
    willChange: 'transform, opacity',
    animation: 'cb-death-pop 1.1s cubic-bezier(.2,.72,.3,1) forwards',
  };
}
/** Dark cracked fragments flung out as the minion breaks apart. */
function shardStyle(f: Extract<Fx, { kind: 'shard' }>): React.CSSProperties {
  return {
    position: 'fixed', left: f.x, top: f.y, width: 7, height: 7, borderRadius: 2,
    background: 'linear-gradient(140deg,#4a3550,#241826)', border: '1px solid rgba(200,96,104,0.5)',
    boxShadow: '0 0 6px rgba(200,96,104,0.55)', willChange: 'transform, opacity', zIndex: 61,
    ['--dx' as string]: `${f.dx}px`, ['--dy' as string]: `${f.dy}px`, ['--rot' as string]: `${f.rot}deg`,
    animation: 'cb-shard .8s cubic-bezier(.2,.7,.3,1) forwards',
  } as React.CSSProperties;
}
/** The empowering surge that blooms up from a buffed minion — an emerald→gold aura ring. */
function buffStyle(f: Extract<Fx, { kind: 'buff' }>): React.CSSProperties {
  return {
    position: 'fixed', left: f.x, top: f.y, width: 66, height: 66, borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(255,207,77,0.55) 0%, rgba(55,224,160,0.42) 42%, rgba(55,224,160,0) 72%)',
    boxShadow: '0 0 18px rgba(255,207,77,0.5)', willChange: 'transform, opacity', zIndex: 61,
    animation: 'cb-buff-surge .85s cubic-bezier(.2,.72,.3,1) forwards',
  };
}
/** Gilded motes rising off a buffed minion. */
function sparkStyle(f: Extract<Fx, { kind: 'spark' }>): React.CSSProperties {
  return {
    position: 'fixed', left: f.x, top: f.y, width: 5, height: 5, borderRadius: '50%',
    background: 'radial-gradient(circle,#fff6d8,#ffcf4d)', boxShadow: '0 0 7px rgba(255,207,77,0.85)',
    willChange: 'transform, opacity', zIndex: 62,
    ['--dx' as string]: `${f.dx}px`, ['--dy' as string]: `${f.dy}px`,
    animation: `cb-buff-mote .8s ${f.delay}s cubic-bezier(.25,.6,.35,1) forwards`,
    opacity: 0,
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
/** A summoned minion's big reveal: the card art swells up large at the caster's seat, overshoots,
 *  settles, holds a readable beat, then eases up and fades — clearly announcing who took the field. */
function summonStyle(f: Extract<Fx, { kind: 'summon' }>): React.CSSProperties {
  return {
    position: 'fixed', left: f.x, top: f.y, zIndex: 63,
    filter: `drop-shadow(0 0 22px ${f.color}) drop-shadow(0 10px 22px rgba(0,0,0,0.75))`,
    willChange: 'transform, opacity', transformOrigin: 'center',
    animation: 'cb-summon 1.25s cubic-bezier(.18,.72,.28,1) forwards',
  };
}
/** The BIG activation reveal on the LEFT of the table: the played card art blows up huge, holds a
 *  readable beat inside a bright element-tinted aura, then fades — the "카드 발동" money shot. */
function activateStyle(f: Extract<Fx, { kind: 'activate' }>): React.CSSProperties {
  return {
    position: 'fixed', left: f.x, top: f.y, zIndex: 64,
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
    filter: `drop-shadow(0 0 40px ${f.color}) drop-shadow(0 0 14px ${f.color}) drop-shadow(0 16px 34px rgba(0,0,0,0.82))`,
    willChange: 'transform, opacity', transformOrigin: 'center',
    animation: 'cb-activate 1.4s cubic-bezier(.16,.72,.26,1) forwards',
  };
}
/** The card's name plate under the big left reveal — a struck gilt-white label. */
function activateNameStyle(f: Extract<Fx, { kind: 'activate' }>): React.CSSProperties {
  return {
    fontFamily: '"Geist", system-ui, sans-serif', fontWeight: 800,
    fontSize: Math.round(f.size * 0.11), letterSpacing: '-0.01em', color: '#f6efdd',
    whiteSpace: 'nowrap', textShadow: `0 0 16px ${f.color}, 0 2px 6px rgba(0,0,0,0.85)`,
  };
}
function castStyle(f: Extract<Fx, { kind: 'cast' }>): React.CSSProperties {
  return {
    position: 'fixed', left: f.x, top: f.y, display: 'flex', flexDirection: 'column',
    alignItems: 'center', gap: 2, padding: '6px 7px', borderRadius: 8, width: 48,
    background: 'linear-gradient(170deg,#26314a,#141b2b)', border: `1px solid ${f.color}`,
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
