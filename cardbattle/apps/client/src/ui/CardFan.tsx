import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { CardInstance } from '@cardbattle/shared';
import { CARD_DEFS, COSMETIC_BY_ID, requiresTarget } from '@cardbattle/shared';
import { C, RARITY_BORDER, mono, sans } from './theme.js';
import { CardArt } from './art/CardArt.js';
import { Icon, TauntFrame, type IconName } from './art/Icon.js';
import { playSfx } from '../audio/sfx.js';

interface Props {
  hand: CardInstance[];
  enabled: boolean;
  pendingId: string | null;
  mana: number;
  onPlay: (card: CardInstance) => void;
  /** Equipped cosmetic border id (from the account); 'none' or undefined = plain frame. */
  borderCosmetic?: string;
}

/** A gradient-border overlay ring for an equipped cosmetic skin. Only the border area is
 *  painted (transparent center via the padding/border-box clip trick), so the card content
 *  underneath shows through. pointerEvents:none keeps clicks flowing to the card button. */
function cosmeticRing(border: string): React.CSSProperties {
  const grad = border.startsWith('linear') || border.startsWith('radial');
  return {
    position: 'absolute', inset: 0, borderRadius: 12, pointerEvents: 'none', zIndex: 4,
    border: '2.5px solid transparent',
    ...(grad
      ? { backgroundImage: `${border}`, WebkitMask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)', WebkitMaskComposite: 'xor', maskComposite: 'exclude', padding: '2.5px' }
      : { borderColor: border }),
  };
}

// Touch devices (iPad/phone) have no hover, so a single tap on an instant card would fire it
// before its description is ever seen. There, the first tap previews the card (lifts + shows the
// tooltip) and a second tap commits. Mouse users keep the original hover-to-read, click-to-play.
const IS_TOUCH =
  typeof window !== 'undefined' && !!window.matchMedia &&
  window.matchMedia('(hover: none), (pointer: coarse)').matches;

// A minion's persistent abilities get a small emblem drawn on the card face, so a player can
// read its power at a glance without opening the tooltip. Keyword keywords + the 유언 (deathrattle)
// synthetic marker each map to a tinted glyph badge.
const KEYWORD_META: Record<string, { icon: IconName; color: string; label: string; desc: string }> = {
  charge:       { icon: 'bolt',    color: '#d68a50', label: '쇄도', desc: '소환된 턴에 바로 공격할 수 있다.' },
  taunt:        { icon: 'shield',  color: '#e0c060', label: '수호', desc: '적은 먼저 이 하수인을 공격해야 한다.' },
  divineShield: { icon: 'sparkle', color: '#e8c880', label: '가호', desc: '첫 번째 피해를 1회 무효화한다.' },
  lifesteal:    { icon: 'heart',   color: '#cf8f74', label: '착취', desc: '가한 피해만큼 내 영웅을 회복한다.' },
  poisonous:    { icon: 'poison',  color: '#9aa863', label: '부식', desc: '피해를 준 하수인을 즉시 파괴한다.' },
  deathrattle:  { icon: 'skull',   color: '#a89f88', label: '유언', desc: '죽을 때 특수 효과가 발동한다.' },
};

// macOS-dock-style proximity magnification: how far (px) from the cursor a card still feels
// the pull. Cards inside this radius grow smoothly by distance — nearest biggest, neighbours
// partially — so the hand "breathes" open as the cursor approaches, not only on direct hover.
const MAG_RADIUS = 240;

/** Fanned hand — the dominant interaction. Cards rotate outward from center, lift on hover,
 * and the selected (pending-target) card lifts higher with a teal outline. */
export function CardFan({ hand, enabled, pendingId, mana, onPlay, borderCosmetic }: Props) {
  const cos = borderCosmetic ? COSMETIC_BY_ID[borderCosmetic] : undefined;
  const hasCos = !!cos && cos.id !== 'none';
  const [hover, setHover] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  // Minions are summoned by DRAGGING the card up out of the hand onto the board (Hearthstone-style),
  // not by a single click. This tracks the in-flight drag: the card id + start/current pointer pos.
  const [drag, setDrag] = useState<{ id: string; sx: number; sy: number; x: number; y: number; moved: boolean } | null>(null);
  // Cursor X (viewport px) while it hovers the fan, plus the measured center X of every card
  // slot — together they drive the dock-style proximity magnification below. null = cursor away.
  const [mouseX, setMouseX] = useState<number | null>(null);
  const fanRef = useRef<HTMLDivElement>(null);
  const centersRef = useRef<number[]>([]);
  const rafRef = useRef<number | null>(null);
  // After a successful drag-drop the browser still fires a click; this flag swallows that
  // trailing click so a dragged spell doesn't also fire again via onClick (double-play).
  const skipClickRef = useRef(false);
  const n = hand.length;
  const mid = (n - 1) / 2;

  // Drop a stale preview when the turn ends or the previewed card leaves the hand.
  useEffect(() => {
    if (preview && (!enabled || !hand.some((c) => c.id === preview))) setPreview(null);
  }, [enabled, hand, preview]);

  // Cancel any pending rAF on unmount so a late frame never touches a dead component.
  useEffect(() => () => { if (rafRef.current != null) cancelAnimationFrame(rafRef.current); }, []);

  // rAF-throttled: remeasure each card slot's center X (transforms don't reflow, and cards scale
  // from bottom-center so their center X is stable even while magnified — no feedback loop) then
  // publish the cursor X. Direct-hover magnification isn't enough; the user wants the whole hand
  // to swell as the cursor draws near (see the reference image).
  const onFanMove = (e: React.PointerEvent) => {
    const x = e.clientX;
    if (rafRef.current != null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const root = fanRef.current;
      if (root) {
        const kids = root.children;
        const arr: number[] = [];
        for (let k = 0; k < kids.length; k++) {
          const r = (kids[k] as HTMLElement).getBoundingClientRect();
          arr.push(r.left + r.width / 2);
        }
        centersRef.current = arr;
      }
      setMouseX(x);
    });
  };
  const onFanLeave = () => {
    if (rafRef.current != null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    setMouseX(null);
  };

  return (
    <div style={fan} ref={fanRef} onPointerMove={onFanMove} onPointerLeave={onFanLeave}>
      {hand.map((c, i) => {
        const def = CARD_DEFS[c.defId];
        if (!def) return null;
        const isPending = c.id === pendingId;
        const isPreview = c.id === preview && enabled;
        const isHover = (c.id === hover || isPreview) && enabled;
        const rot = (i - mid) * 5;
        const lift = Math.abs(i - mid) * 14;
        // Minion cards carry attack/health stats; spell cards fire an effect on play.
        const isMinion = !!def.minion;
        const hasDamage = def.effects.some((e) => e.kind === 'damage');
        const hasShield = def.effects.some((e) => e.kind === 'shield');
        const isDestroy = def.effects.some((e) => e.kind === 'destroy');
        const isDraw = def.effects.some((e) => e.kind === 'draw');
        const isMana = def.effects.some((e) => e.kind === 'gainMana');
        const dmgValue = def.effects.reduce((m, e) => (e.kind === 'damage' ? Math.max(m, e.amount) : m), 0);
        const value = def.effects.reduce((m, e) => ('amount' in e ? Math.max(m, e.amount) : m), 0);
        // Affordability: on my turn, cards I can't currently pay for are dimmed and unclickable.
        const affordable = def.cost <= mana;
        const playable = enabled && affordable;
        const pill: { style: React.CSSProperties; label: React.ReactNode } = isMinion
          ? { style: minionStat, label: `${def.minion!.attack}/${def.minion!.health}` }
          : isDestroy
          ? { style: dmgVal, label: <Icon name="close" size={12} /> }
          : isDraw
          ? { style: manaValPill, label: `+${value}` }
          : isMana
          ? { style: manaValPill, label: `+${value}` }
          : hasDamage
          ? { style: dmgVal, label: `${dmgValue}` }
          : hasShield
          ? { style: shieldVal, label: `+${value}` }
          : { style: healVal, label: `+${value}` };

        const tint = RARITY_TINT[def.rarity] ?? RARITY_TINT.common;

        // The card's persistent abilities. 수호(taunt) becomes a SHIELD-SHAPED frame around the
        // whole card (coloured by rarity) so a defender reads at a glance; the other keywords +
        // 유언 show as left-edge emblem badges. The tooltip lists ALL of them with icons.
        const abilityKeys = [
          ...(def.keywords ?? []),
          ...(def.deathrattle && def.deathrattle.length ? ['deathrattle'] : []),
        ].filter((k) => KEYWORD_META[k]);
        const hasTaunt = abilityKeys.includes('taunt');
        const emblems = abilityKeys.filter((k) => k !== 'taunt');

        // Dock-style proximity magnification: 0 = at rest, 1 = cursor dead-centre on this card.
        // Cards rest SMALL and swell smoothly as the cursor nears (nearest grows most). A smoothstep
        // falloff keeps the bulge soft-edged so the hand "breathes" open instead of snapping.
        const center = centersRef.current[i];
        let m = 0;
        if (mouseX != null && center != null) {
          const t = 1 - Math.abs(mouseX - center) / MAG_RADIUS;
          if (t > 0) m = t * t * (3 - 2 * t);
        }

        // Lifted cards stand up toward the viewer with a slight 3D tilt (Balatro-style physicality),
        // not just a flat slide — the fan's perspective makes them read as real objects picked up.
        let transform = `rotate(${rot}deg) translateY(${lift}px)`;
        let z = 1;
        if (isPending) { transform = 'perspective(720px) translateY(-52px) rotateX(-7deg) scale(1.62)'; z = 6; }
        else if (isHover) { transform = 'perspective(720px) translateY(-46px) rotateX(-5deg) scale(1.55)'; z = 5; }
        else if (m > 0.002) {
          // Straighten the fan spread, lift, and scale — all by proximity amount m.
          transform = `perspective(720px) rotate(${rot * (1 - m)}deg) translateY(${lift - m * 60}px) rotateX(${-5 * m}deg) scale(${1 + m * 0.5})`;
          z = 2 + Math.round(m * 2);
        }

        return (
          <div key={c.id} className="cb-hand-deal" style={{ ...dealSlot, animationDelay: `${i * 260}ms`, zIndex: z }}>
            <button
              className="cb-hand-card"
              disabled={!enabled}
              onMouseEnter={() => { setHover(c.id); if (playable) playSfx('hover'); }}
              onMouseLeave={() => setHover((h) => (h === c.id ? null : h))}
              onClick={() => {
                if (!enabled) return;
                // Swallow the click that fires right after a drag-drop so we never play twice.
                if (skipClickRef.current) { skipClickRef.current = false; return; }
                if (isMinion) return; // 하수인은 클릭이 아니라 보드로 드래그해서 소환한다
                // On touch, the first tap only previews the card; the second tap commits.
                if (IS_TOUCH && preview !== c.id) { setPreview(c.id); playSfx('select'); return; }
                if (!affordable) return; // can't pay for it — reads fine, just won't play
                setPreview(null);
                onPlay(c);
              }}
              onPointerDown={(e) => {
                // Both minions AND spells are dragged out of the hand onto the board; spells then
                // snap to the board and fire (targeted spells enter target-select via onPlay).
                if (!playable) return;
                try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch { /* older browsers */ }
                setDrag({ id: c.id, sx: e.clientX, sy: e.clientY, x: e.clientX, y: e.clientY, moved: false });
              }}
              onPointerMove={(e) => {
                if (!drag || drag.id !== c.id) return;
                const moved = drag.moved || Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 8;
                if (moved) setDrag({ ...drag, x: e.clientX, y: e.clientY, moved: true });
              }}
              onPointerUp={(e) => {
                if (!drag || drag.id !== c.id) return;
                const lifted = drag.sy - e.clientY; // pulled up out of the hand toward the board
                const dropped = drag.moved && lifted > 70;
                setDrag(null);
                if (dropped && affordable) { skipClickRef.current = true; playSfx('select'); onPlay(c); }
              }}
              onPointerCancel={() => { if (drag && drag.id === c.id) setDrag(null); }}
              style={{
                ...card,
                transform,
                cursor: !enabled ? 'default' : !affordable ? 'not-allowed' : 'grab',
                opacity: drag?.id === c.id && drag.moved ? 0.28 : !enabled ? 0.5 : affordable ? 1 : 0.42,
                filter: playable ? 'none' : 'grayscale(0.4)',
                borderColor: isPending ? C.you : RARITY_BORDER[def.rarity] ?? C.border,
                boxShadow: isPending
                  ? `0 0 0 1px ${C.you}, 0 26px 44px rgba(143,157,79,0.3)`
                  : hasCos && isHover
                  ? `0 0 22px ${cos!.glow}, 0 26px 44px rgba(0,0,0,0.6)`
                  : hasCos
                  ? `0 0 14px ${cos!.glow}, 0 14px 26px rgba(0,0,0,0.55)`
                  : isHover
                  ? '0 26px 44px rgba(0,0,0,0.6)'
                  : '0 14px 26px rgba(0,0,0,0.55)',
              }}
            >
              {playable && <i className="cb-hand-sheen" aria-hidden />}
              {hasCos && <div style={cosmeticRing(cos!.border)} />}
              {tint.sheen !== 'transparent' && (
                <div
                  className="cb-foil"
                  style={{ ...foilSheen, background: `linear-gradient(128deg, transparent 30%, ${tint.sheen} 50%, transparent 70%)` }}
                  aria-hidden
                />
              )}
              {(isHover || isPending) && (() => {
                const rm = RARITY_META[def.rarity] ?? RARITY_META.common;
                const em = ELEM_META[def.element] ?? ELEM_META.none;
                const needsTarget = requiresTarget(def);
                return (
                  <div style={{ ...tip, borderColor: rm.color, boxShadow: `0 16px 36px rgba(0,0,0,0.6), 0 0 20px ${rm.color}33` }}>
                    <span style={{ ...tipTopEdge, background: `linear-gradient(90deg, transparent, ${rm.color}, transparent)` }} aria-hidden />
                    <div style={tipHead}>
                      <div style={{ ...tipName, color: rm.color }}>{def.name}</div>
                      <div style={{ ...tipRarity, color: rm.color, borderColor: `${rm.color}66` }}>{rm.label}</div>
                    </div>
                    <div style={tipMeta}>
                      <span style={{ ...tipChip, ...tipCostChip }}>◈ {def.cost}</span>
                      {def.element !== 'none' && (
                        <span style={{ ...tipChip, color: em.color, borderColor: `${em.color}55`, background: `${em.color}18` }}>{em.label}</span>
                      )}
                      {needsTarget && <span style={{ ...tipChip, ...tipTargetChip }}>대상 지정</span>}
                    </div>
                    <div style={tipDesc}>{def.desc}</div>
                    {abilityKeys.length > 0 && (
                      <div style={tipAbilities}>
                        {abilityKeys.map((k) => {
                          const km = KEYWORD_META[k];
                          return (
                            <div key={k} style={tipAbilityRow}>
                              <span style={{ ...tipAbilityIcon, color: km.color, borderColor: `${km.color}66` }}>
                                <Icon name={km.icon} size="66%" />
                              </span>
                              <span style={tipAbilityText}>
                                <b style={{ color: km.color }}>{km.label}</b> — {km.desc}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {def.flavor && <div style={tipFlavor}>{def.flavor}</div>}
                    {IS_TOUCH && isPreview && !isPending && <div style={tipHint}>한 번 더 탭하여 사용</div>}
                  </div>
                );
              })()}
              <div style={{ ...costBadge, ...(enabled && !affordable ? costBadgeShort : null) }}>◈{def.cost}</div>
              {emblems.length > 0 && (
                <div style={emblemCol}>
                  {emblems.map((k) => {
                    const km = KEYWORD_META[k];
                    return (
                      <div key={k} style={{ ...emblemBadge, color: km.color, borderColor: `${km.color}77` }} title={km.label} aria-label={km.label}>
                        <Icon name={km.icon} size="62%" />
                      </div>
                    );
                  })}
                </div>
              )}
              <div style={artWindow}>
                <div style={{ ...artGlow, background: `radial-gradient(circle at 50% 44%, ${tint.glow}, transparent 68%)` }} aria-hidden />
                <CardArt id={def.id} size="clamp(82px, 8.6vw, 148px)" />
              </div>
              <div style={{ ...nameplate, background: `linear-gradient(180deg, transparent, ${tint.plate})` }}>
                <div style={cname}>{def.name}</div>
              </div>
              <div style={{ ...pillVal, ...pill.style }}>{pill.label}</div>
              {hasTaunt && <TauntFrame color={RARITY_BORDER[def.rarity] ?? C.border} style={{ zIndex: 2 }} />}
            </button>
          </div>
        );
      })}
      {drag && drag.moved && createPortal((() => {
        const dc = hand.find((h) => h.id === drag.id);
        const ddef = dc && CARD_DEFS[dc.defId];
        if (!ddef) return null;
        return (
          <div style={{ ...dragGhost, left: drag.x, top: drag.y }}>
            <div style={dragGhostCard}>
              <div style={dragGhostArt}><CardArt id={ddef.id} size={64} /></div>
              <div style={dragGhostName}>{ddef.name}</div>
              <div style={dragGhostStat}>{ddef.minion ? `${ddef.minion.attack}/${ddef.minion.health}` : `◈${ddef.cost}`}</div>
            </div>
            <div style={dragHint}>{ddef.minion ? '↑ 놓아서 소환' : '↑ 놓아서 발동'}</div>
          </div>
        );
      })(), document.body)}
    </div>
  );
}

const fan: React.CSSProperties = {
  // Full width so pointermove fires across the WHOLE hand band — the cards then magnify as the
  // cursor merely APPROACHES nearby (dock-style), not only when it's directly over a card.
  display: 'flex', alignItems: 'flex-end', justifyContent: 'center', height: '100%', width: '100%',
  paddingBottom: 18, fontFamily: sans,
  // 3D depth for the deal-in tumble; pivot low so cards arc up from the "deck" at the bottom.
  perspective: 1300, perspectiveOrigin: '50% 120%',
};
// The animated deal slot owns the fan overlap + stacking; the button inside owns the fan
// rotation and hover lift, so the entrance animation never fights the hover transform.
const dealSlot: React.CSSProperties = { position: 'relative', margin: '0 -14px', display: 'flex', alignItems: 'flex-end', transformOrigin: '50% 90%' };
const card: React.CSSProperties = {
  // Width scales with the viewport; height derives from a locked 5:7 playing-card ratio so the
  // proportion never drifts across clamp breakpoints (independent width/height clamps used to).
  width: 'clamp(140px, 13.5vw, 210px)', aspectRatio: '5 / 7',
  borderRadius: 12, position: 'relative',
  // Layered "cardstock" material: a warm lit embossed top edge, a fine woven cross-hatch grain,
  // an off-centre warm bloom and an aged edge vignette for handled-card depth, then the
  // rarity-neutral body. Pure CSS — no image, no extra DOM per card.
  background: [
    'linear-gradient(180deg, rgba(255,238,208,0.07), transparent 20%)',                 // warm lit top edge
    'radial-gradient(70% 46% at 32% 10%, rgba(226,182,112,0.06), transparent 60%)',      // faint warm bloom, off-centre = hand-made feel
    'radial-gradient(120% 104% at 50% 46%, transparent 55%, rgba(0,0,0,0.44) 100%)',     // aged edge vignette — corners darken like a handled card
    'repeating-linear-gradient(45deg, rgba(255,238,208,0.02) 0 1.5px, transparent 1.5px 3.5px)',  // warm woven thread
    'repeating-linear-gradient(-45deg, rgba(0,0,0,0.07) 0 1.5px, transparent 1.5px 3.5px)',        // cross-hatch shadow
    `radial-gradient(125% 85% at 50% -8%, ${C.panelHi}, ${C.stage} 68%, ${C.void})`,
  ].join(','),
  border: `1px solid ${C.border}`,
  color: C.text, display: 'flex', flexDirection: 'column', alignItems: 'center',
  justifyContent: 'flex-start', gap: 'clamp(4px, 0.5vw, 7px)',
  padding: 'clamp(9px, 0.95vw, 14px) clamp(8px, 0.8vw, 12px) clamp(7px, 0.7vw, 11px)',
  transition: 'transform .24s cubic-bezier(.34,1.25,.64,1), box-shadow .24s ease, border-color .24s ease',
  transformOrigin: 'bottom center', willChange: 'transform',
  touchAction: 'none', // let a minion be dragged up onto the board without the page scrolling
};
// The card that floats under the cursor while a minion is being dragged out of the hand. Rendered
// through a portal to document.body so the fan's `perspective` doesn't warp its fixed positioning.
const dragGhost: React.CSSProperties = {
  position: 'fixed', transform: 'translate(-50%, -62%) rotate(-4deg)', pointerEvents: 'none',
  zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7,
};
const dragGhostCard: React.CSSProperties = {
  width: 96, borderRadius: 12, padding: '10px 8px 8px',
  background: `radial-gradient(125% 85% at 50% -8%, ${C.panelHi}, ${C.stage} 68%, ${C.void})`,
  border: `1px solid ${C.you}`, boxShadow: '0 0 24px rgba(143,157,79,0.5), 0 20px 40px rgba(0,0,0,0.6)',
  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
};
const dragGhostArt: React.CSSProperties = {
  width: '84%', aspectRatio: '1', borderRadius: 10, overflow: 'hidden',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: 'radial-gradient(circle at 50% 40%, rgba(0,0,0,0.12), rgba(0,0,0,0.5))',
  border: `1px solid ${C.border}`,
};
const dragGhostName: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: C.text, lineHeight: 1 };
const dragGhostStat: React.CSSProperties = { fontFamily: mono, fontSize: 13, fontWeight: 800, color: '#f0e0b4' };
const dragHint: React.CSSProperties = {
  fontFamily: mono, fontSize: 11, fontWeight: 700, letterSpacing: 0.5, color: C.you,
  padding: '3px 8px', borderRadius: 6, background: 'rgba(16,20,32,0.92)', border: `1px solid ${C.you}66`,
};
// Per-rarity accents: a glow behind the art window, an optional foil sheen streak, and a
// nameplate tint. Keeps the grimy palette but signals card power at a glance.
const RARITY_TINT: Record<string, { glow: string; sheen: string; plate: string }> = {
  common: { glow: 'rgba(120,122,96,0.20)', sheen: 'transparent', plate: 'rgba(53,54,45,0.5)' },
  rare: { glow: 'rgba(111,160,140,0.34)', sheen: 'transparent', plate: 'rgba(60,86,76,0.45)' },
  epic: { glow: 'rgba(216,162,60,0.36)', sheen: 'rgba(216,162,60,0.11)', plate: 'rgba(90,68,26,0.48)' },
  legendary: { glow: 'rgba(216,162,60,0.5)', sheen: 'rgba(255,212,120,0.17)', plate: 'rgba(110,82,30,0.52)' },
};
// Recessed art frame — an inset dark well with a rarity glow so the illustration reads as
// mounted, giving the flat card real depth.
const artWindow: React.CSSProperties = {
  position: 'relative', width: '84%', aspectRatio: '1', marginTop: 2, borderRadius: 10,
  display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  background: [
    'radial-gradient(ellipse 80% 40% at 50% 6%, rgba(240,206,150,0.10), transparent 62%)',  // warm rim catch-light at the top of the well
    'repeating-linear-gradient(45deg, rgba(255,255,255,0.02) 0 1px, transparent 1px 3px)',
    'radial-gradient(circle at 50% 40%, rgba(0,0,0,0.12), rgba(0,0,0,0.5))',
  ].join(','),
  border: `1px solid ${C.border}`,
  boxShadow: 'inset 0 2px 9px rgba(0,0,0,0.65), inset 0 0 0 1px rgba(255,255,255,0.03)',
};
const artGlow: React.CSSProperties = { position: 'absolute', inset: 0, borderRadius: 10, pointerEvents: 'none' };
// Diagonal light streak for epic/legendary — a subtle foil shimmer.
const foilSheen: React.CSSProperties = {
  position: 'absolute', inset: 0, borderRadius: 12, pointerEvents: 'none', zIndex: 2,
  mixBlendMode: 'screen',
};
const nameplate: React.CSSProperties = {
  width: '100%', marginTop: 'auto', padding: '3px 2px 2px', textAlign: 'center',
  borderTop: `1px solid ${C.border}`,
};
const cname: React.CSSProperties = { fontSize: 'clamp(17px, 1.9vw, 28px)', fontWeight: 700, lineHeight: 1.1 };
const pillVal: React.CSSProperties = { fontFamily: mono, fontSize: 'clamp(15px, 1.7vw, 25px)', padding: '3px 13px', borderRadius: 999 };
// Every accent below is pulled into the theme's four printed-pigment families so the hand reads
// as one coherent candlelit palette (icons carry the fine distinctions, not colour):
//   ochre-red = offense · sage = life · gold-leaf = resource/fortune · faded-teal = arcane/defense.
const manaValPill: React.CSSProperties = { color: '#e6cf96', background: 'rgba(195,154,76,0.16)', border: '1px solid #6a5528' };
// Mana cost, top-left — gold-leaf resource. Turns ochre-red when the player can't afford it.
const costBadge: React.CSSProperties = {
  position: 'absolute', top: 7, left: 7, minWidth: 27, height: 27, padding: '0 7px',
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1,
  fontFamily: mono, fontSize: 'clamp(13px, 1.25vw, 18px)', fontWeight: 800, borderRadius: 9, zIndex: 3,
  color: '#e8cf96', background: 'linear-gradient(160deg, rgba(74,58,26,0.95), rgba(46,34,14,0.95))',
  border: '1px solid #6a5528', boxShadow: '0 2px 8px rgba(120,90,30,0.4)',
};
const costBadgeShort: React.CSSProperties = {
  color: '#e8b09a', background: 'linear-gradient(160deg, rgba(90,44,34,0.95), rgba(50,22,16,0.95))',
  border: '1px solid #7a3a2a', boxShadow: '0 2px 8px rgba(150,60,40,0.4)',
};
// Ability emblems stack down the LEFT edge, under the cost badge — the fanned cards overlap so
// only their left strip is exposed (the right corner is hidden behind the neighbour), so the
// left edge is the only always-visible place for the badges. Each is a small tinted disc.
const emblemCol: React.CSSProperties = {
  position: 'absolute', top: 38, left: 7, zIndex: 3,
  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
};
const emblemBadge: React.CSSProperties = {
  width: 'clamp(21px, 2vw, 28px)', height: 'clamp(21px, 2vw, 28px)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  borderRadius: '50%', border: '1px solid',
  background: 'linear-gradient(160deg, rgba(32,25,15,0.96), rgba(16,11,6,0.96))',
  boxShadow: '0 2px 6px rgba(0,0,0,0.5)',
};
const dmgVal: React.CSSProperties = { color: '#e8b4a6', background: 'rgba(176,70,47,0.18)', border: '1px solid #5a2c22' };
const healVal: React.CSSProperties = { color: '#cdd3a0', background: 'rgba(143,157,79,0.18)', border: '1px solid #4a5230' };
const shieldVal: React.CSSProperties = { color: '#b9cdc4', background: 'rgba(113,145,138,0.16)', border: '1px solid #44605a' };
// Minion attack/health, bottom-right — reads as the unit's battle stats.
const minionStat: React.CSSProperties = { color: '#f0e0b4', background: 'rgba(120,90,40,0.22)', border: '1px solid #6a5528', fontWeight: 800 };
// Korean label + accent colour per element / rarity, so the detail panel can chip them. Elements
// keep individual identity but as muted printed pigments (not fluorescent), coherent with the room.
const ELEM_META: Record<string, { label: string; color: string }> = {
  physical: { label: '물리', color: '#cf8f74' },
  fire: { label: '화염', color: '#d68a50' },
  ice: { label: '냉기', color: '#8fb1bd' },
  lightning: { label: '전격', color: '#d0b25e' },
  poison: { label: '맹독', color: '#9aa863' },
  holy: { label: '신성', color: '#dcc78c' },
  none: { label: '무속성', color: '#a89f88' },
};
const RARITY_META: Record<string, { label: string; color: string }> = {
  common: { label: '일반', color: '#a89f88' },
  rare: { label: '희귀', color: '#8fb0a2' },
  epic: { label: '영웅', color: '#d8ab5a' },
  legendary: { label: '전설', color: '#e8c880' },
};
// Card-detail panel: a rarity-framed card, a stat row (cost / element / target), then the text.
const tip: React.CSSProperties = {
  position: 'absolute', bottom: '108%', left: '50%', transform: 'translateX(-50%)',
  width: 'clamp(168px, 16vw, 216px)', padding: '11px 12px 10px', borderRadius: 11, zIndex: 20,
  background: 'linear-gradient(180deg, rgba(30,38,58,0.99), rgba(16,20,32,0.99))',
  border: '1px solid', pointerEvents: 'none', textAlign: 'left', overflow: 'hidden',
};
// A thin rarity-tinted light seam along the top rim of the panel.
const tipTopEdge: React.CSSProperties = { position: 'absolute', top: 0, left: 0, right: 0, height: 1.5, opacity: 0.9 };
const tipHead: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 7,
};
const tipName: React.CSSProperties = { fontFamily: sans, fontSize: 16, fontWeight: 800, letterSpacing: 0.4, lineHeight: 1.15 };
const tipRarity: React.CSSProperties = {
  flexShrink: 0, fontFamily: mono, fontSize: 9, fontWeight: 800, letterSpacing: 1,
  padding: '1px 6px', borderRadius: 5, border: '1px solid',
};
const tipMeta: React.CSSProperties = {
  display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 8,
  paddingBottom: 8, borderBottom: `1px solid ${C.border}`,
};
const tipChip: React.CSSProperties = {
  fontFamily: mono, fontSize: 11, fontWeight: 700, letterSpacing: 0.3,
  padding: '2px 7px', borderRadius: 6, border: '1px solid transparent',
};
const tipCostChip: React.CSSProperties = { color: '#e6cf96', background: 'rgba(195,154,76,0.15)', borderColor: '#6a552855' };
const tipTargetChip: React.CSSProperties = { color: '#e8b4a6', background: 'rgba(176,70,47,0.14)', borderColor: '#5a2c2288' };
const tipDesc: React.CSSProperties = { fontSize: 13, lineHeight: 1.5, color: C.text, whiteSpace: 'normal' };
// Ability rows in the tooltip — an icon disc + name + plain-language explanation, so a player
// learns what each keyword/유언 does without memorising the glossary.
const tipAbilities: React.CSSProperties = {
  marginTop: 8, paddingTop: 7, borderTop: `1px solid ${C.border}`,
  display: 'flex', flexDirection: 'column', gap: 6,
};
const tipAbilityRow: React.CSSProperties = { display: 'flex', alignItems: 'flex-start', gap: 7 };
const tipAbilityIcon: React.CSSProperties = {
  flexShrink: 0, width: 20, height: 20, marginTop: 1,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  borderRadius: '50%', border: '1px solid',
  background: 'linear-gradient(160deg, rgba(32,25,15,0.9), rgba(16,11,6,0.9))',
};
const tipAbilityText: React.CSSProperties = { fontSize: 11.5, lineHeight: 1.4, color: C.dim, whiteSpace: 'normal' };
const tipFlavor: React.CSSProperties = {
  marginTop: 7, paddingTop: 6, borderTop: `1px solid ${C.border}`,
  fontSize: 12, lineHeight: 1.45, color: C.dim, fontStyle: 'italic', whiteSpace: 'normal',
};
const tipHint: React.CSSProperties = {
  marginTop: 8, paddingTop: 6, borderTop: `1px solid ${C.border}`,
  fontSize: 11, fontWeight: 700, color: C.you, textAlign: 'center', letterSpacing: 0.3,
};
