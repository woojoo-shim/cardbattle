import { useEffect, useState } from 'react';
import type { CardInstance } from '@cardbattle/shared';
import { CARD_DEFS, COSMETIC_BY_ID, requiresTarget } from '@cardbattle/shared';
import { C, RARITY_BORDER, mono, sans } from './theme.js';
import { CardArt } from './art/CardArt.js';
import { Icon } from './art/Icon.js';
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

/** Fanned hand — the dominant interaction. Cards rotate outward from center, lift on hover,
 * and the selected (pending-target) card lifts higher with a teal outline. */
export function CardFan({ hand, enabled, pendingId, mana, onPlay, borderCosmetic }: Props) {
  const cos = borderCosmetic ? COSMETIC_BY_ID[borderCosmetic] : undefined;
  const hasCos = !!cos && cos.id !== 'none';
  const [hover, setHover] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const n = hand.length;
  const mid = (n - 1) / 2;

  // Drop a stale preview when the turn ends or the previewed card leaves the hand.
  useEffect(() => {
    if (preview && (!enabled || !hand.some((c) => c.id === preview))) setPreview(null);
  }, [enabled, hand, preview]);

  return (
    <div style={fan}>
      {hand.map((c, i) => {
        const def = CARD_DEFS[c.defId];
        if (!def) return null;
        const isPending = c.id === pendingId;
        const isPreview = c.id === preview && enabled;
        const isHover = (c.id === hover || isPreview) && enabled;
        const rot = (i - mid) * 5;
        const lift = Math.abs(i - mid) * 8;
        const isAtk = (k: string) => k === 'damage' || k === 'pierce' || k === 'leech' || k === 'desperation';
        const hasDamage = def.effects.some((e) => isAtk(e.kind));
        const hasShield = def.effects.some((e) => e.kind === 'shield');
        const isReverse = def.effects.some((e) => e.kind === 'reverse');
        const isPeek = def.effects.some((e) => e.kind === 'peek');
        const isDiscard = def.effects.some((e) => e.kind === 'discard');
        const isSkip = def.effects.some((e) => e.kind === 'skip');
        const isGamble = def.effects.some((e) => e.kind === 'gamble');
        const isSacrifice = def.effects.some((e) => e.kind === 'selfskip');
        const isMana = def.effects.some((e) => e.kind === 'mana');
        const isSwap = def.effects.some((e) => e.kind === 'swap');
        const dmgValue = def.effects.reduce((m, e) => (isAtk(e.kind) && 'amount' in e ? Math.max(m, e.amount) : m), 0);
        const value = def.effects.reduce((m, e) => ('amount' in e ? Math.max(m, e.amount) : m), 0);
        // Affordability: on my turn, cards I can't currently pay for are dimmed and unclickable.
        const affordable = def.cost <= mana;
        const playable = enabled && affordable;
        const pill: { style: React.CSSProperties; label: React.ReactNode } = isReverse
          ? { style: revVal, label: <Icon name="arrowSwap" size={13} /> }
          : isPeek
          ? { style: peekVal, label: <Icon name="eye" size={13} /> }
          : isDiscard
          ? { style: shatterVal, label: <Icon name="close" size={12} /> }
          : isSkip
          ? { style: skipVal, label: <Icon name="chain" size={13} /> }
          : isGamble
          ? { style: gambleVal, label: <Icon name="dice" size={13} /> }
          : isSacrifice
          ? { style: sacrificeVal, label: <Icon name="fire" size={13} /> }
          : isSwap
          ? { style: revVal, label: <Icon name="heart" size={13} /> }
          : isMana
          ? { style: manaValPill, label: `+${value}` }
          : hasDamage
          ? { style: dmgVal, label: `${dmgValue}` }
          : hasShield
          ? { style: shieldVal, label: `+${value}` }
          : { style: healVal, label: `+${value}` };

        const tint = RARITY_TINT[def.rarity] ?? RARITY_TINT.common;

        // Lifted cards stand up toward the viewer with a slight 3D tilt (Balatro-style physicality),
        // not just a flat slide — the fan's perspective makes them read as real objects picked up.
        let transform = `rotate(${rot}deg) translateY(${lift}px)`;
        let z = 1;
        if (isPending) { transform = 'perspective(720px) translateY(-30px) rotateX(-7deg) scale(1.1)'; z = 6; }
        else if (isHover) { transform = 'perspective(720px) translateY(-22px) rotateX(-6deg) scale(1.08)'; z = 5; }

        return (
          <div key={c.id} className="cb-hand-deal" style={{ ...dealSlot, animationDelay: `${i * 260}ms`, zIndex: z }}>
            <button
              className="cb-hand-card"
              disabled={!enabled}
              onMouseEnter={() => { setHover(c.id); if (playable) playSfx('hover'); }}
              onMouseLeave={() => setHover((h) => (h === c.id ? null : h))}
              onClick={() => {
                if (!enabled) return;
                // On touch, the first tap only previews the card; the second tap commits.
                if (IS_TOUCH && preview !== c.id) { setPreview(c.id); playSfx('select'); return; }
                if (!affordable) return; // can't pay for it — reads fine, just won't play
                setPreview(null);
                onPlay(c);
              }}
              style={{
                ...card,
                transform,
                cursor: !enabled ? 'default' : affordable ? 'pointer' : 'not-allowed',
                opacity: !enabled ? 0.5 : affordable ? 1 : 0.42,
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
                    {IS_TOUCH && isPreview && !isPending && <div style={tipHint}>한 번 더 탭하여 사용</div>}
                  </div>
                );
              })()}
              <div style={{ ...costBadge, ...(enabled && !affordable ? costBadgeShort : null) }}>◈{def.cost}</div>
              <div style={artWindow}>
                <div style={{ ...artGlow, background: `radial-gradient(circle at 50% 44%, ${tint.glow}, transparent 68%)` }} aria-hidden />
                <CardArt id={def.id} size="clamp(46px, 4.8vw, 68px)" />
              </div>
              <div style={{ ...nameplate, background: `linear-gradient(180deg, transparent, ${tint.plate})` }}>
                <div style={cname}>{def.name}</div>
              </div>
              <div style={{ ...pillVal, ...pill.style }}>{pill.label}</div>
            </button>
          </div>
        );
      })}
    </div>
  );
}

const fan: React.CSSProperties = {
  display: 'flex', alignItems: 'flex-end', justifyContent: 'center', height: '100%',
  paddingBottom: 18, fontFamily: sans,
  // 3D depth for the deal-in tumble; pivot low so cards arc up from the "deck" at the bottom.
  perspective: 1300, perspectiveOrigin: '50% 120%',
};
// The animated deal slot owns the fan overlap + stacking; the button inside owns the fan
// rotation and hover lift, so the entrance animation never fights the hover transform.
const dealSlot: React.CSSProperties = { position: 'relative', margin: '0 -6px', display: 'flex', alignItems: 'flex-end', transformOrigin: '50% 90%' };
const card: React.CSSProperties = {
  // Width scales with the viewport; height derives from a locked 5:7 playing-card ratio so the
  // proportion never drifts across clamp breakpoints (independent width/height clamps used to).
  width: 'clamp(92px, 9vw, 132px)', aspectRatio: '5 / 7',
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
const cname: React.CSSProperties = { fontSize: 'clamp(12px, 1.15vw, 16px)', fontWeight: 700, lineHeight: 1.1 };
const pillVal: React.CSSProperties = { fontFamily: mono, fontSize: 'clamp(12px, 1.1vw, 16px)', padding: '2px 9px', borderRadius: 999 };
// Every accent below is pulled into the theme's four printed-pigment families so the hand reads
// as one coherent candlelit palette (icons carry the fine distinctions, not colour):
//   ochre-red = offense · sage = life · gold-leaf = resource/fortune · faded-teal = arcane/defense.
const manaValPill: React.CSSProperties = { color: '#e6cf96', background: 'rgba(195,154,76,0.16)', border: '1px solid #6a5528' };
// Mana cost, top-left — gold-leaf resource. Turns ochre-red when the player can't afford it.
const costBadge: React.CSSProperties = {
  position: 'absolute', top: 6, left: 6, minWidth: 20, height: 20, padding: '0 5px',
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1,
  fontFamily: mono, fontSize: 'clamp(11px, 1vw, 13px)', fontWeight: 800, borderRadius: 7, zIndex: 3,
  color: '#e8cf96', background: 'linear-gradient(160deg, rgba(74,58,26,0.95), rgba(46,34,14,0.95))',
  border: '1px solid #6a5528', boxShadow: '0 2px 8px rgba(120,90,30,0.4)',
};
const costBadgeShort: React.CSSProperties = {
  color: '#e8b09a', background: 'linear-gradient(160deg, rgba(90,44,34,0.95), rgba(50,22,16,0.95))',
  border: '1px solid #7a3a2a', boxShadow: '0 2px 8px rgba(150,60,40,0.4)',
};
const dmgVal: React.CSSProperties = { color: '#e8b4a6', background: 'rgba(176,70,47,0.18)', border: '1px solid #5a2c22' };
const healVal: React.CSSProperties = { color: '#cdd3a0', background: 'rgba(143,157,79,0.18)', border: '1px solid #4a5230' };
const shieldVal: React.CSSProperties = { color: '#b9cdc4', background: 'rgba(113,145,138,0.16)', border: '1px solid #44605a' };
const revVal: React.CSSProperties = { color: '#c3b0d0', background: 'rgba(150,120,160,0.15)', border: '1px solid #574a5e' };
const peekVal: React.CSSProperties = { color: '#a9c4bf', background: 'rgba(113,145,138,0.15)', border: '1px solid #44605a' };
const shatterVal: React.CSSProperties = { color: '#d8b79a', background: 'rgba(150,100,60,0.15)', border: '1px solid #5e4630' };
const skipVal: React.CSSProperties = { color: '#a9c4bf', background: 'rgba(113,145,138,0.15)', border: '1px solid #44605a' };
const gambleVal: React.CSSProperties = { color: '#e8cf96', background: 'rgba(195,154,76,0.16)', border: '1px solid #6a5528' };
const sacrificeVal: React.CSSProperties = { color: '#e6b393', background: 'rgba(176,80,47,0.16)', border: '1px solid #6a3a24' };
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
  background: 'linear-gradient(180deg, rgba(42,32,19,0.99), rgba(20,13,9,0.99))',
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
const tipHint: React.CSSProperties = {
  marginTop: 8, paddingTop: 6, borderTop: `1px solid ${C.border}`,
  fontSize: 11, fontWeight: 700, color: C.you, textAlign: 'center', letterSpacing: 0.3,
};
