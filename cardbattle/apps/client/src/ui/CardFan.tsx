import { useEffect, useState } from 'react';
import type { CardInstance } from '@cardbattle/shared';
import { CARD_DEFS, COSMETIC_BY_ID } from '@cardbattle/shared';
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

        let transform = `rotate(${rot}deg) translateY(${lift}px)`;
        let z = 1;
        if (isPending) { transform = 'translateY(-30px) scale(1.1)'; z = 6; }
        else if (isHover) { transform = 'translateY(-22px) scale(1.08)'; z = 5; }

        return (
          <button
            key={c.id}
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
              zIndex: z,
              cursor: !enabled ? 'default' : affordable ? 'pointer' : 'not-allowed',
              opacity: !enabled ? 0.5 : affordable ? 1 : 0.42,
              filter: playable ? 'none' : 'grayscale(0.4)',
              borderColor: isPending ? C.you : RARITY_BORDER[def.rarity] ?? C.border,
              boxShadow: isPending
                ? `0 0 0 1px ${C.you}, 0 26px 44px rgba(166,197,63,0.3)`
                : hasCos && isHover
                ? `0 0 22px ${cos!.glow}, 0 26px 44px rgba(0,0,0,0.6)`
                : hasCos
                ? `0 0 14px ${cos!.glow}, 0 14px 26px rgba(0,0,0,0.55)`
                : isHover
                ? '0 26px 44px rgba(0,0,0,0.6)'
                : '0 14px 26px rgba(0,0,0,0.55)',
            }}
          >
            {hasCos && <div style={cosmeticRing(cos!.border)} />}
            {tint.sheen !== 'transparent' && (
              <div
                style={{ ...foilSheen, background: `linear-gradient(128deg, transparent 34%, ${tint.sheen} 50%, transparent 66%)` }}
                aria-hidden
              />
            )}
            {(isHover || isPending) && (
              <div style={tip}>
                <div style={tipName}>{def.name}</div>
                <div style={tipDesc}>{def.desc}</div>
                {IS_TOUCH && isPreview && !isPending && <div style={tipHint}>한 번 더 탭하여 사용</div>}
              </div>
            )}
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
        );
      })}
    </div>
  );
}

const fan: React.CSSProperties = {
  display: 'flex', alignItems: 'flex-end', justifyContent: 'center', height: '100%',
  paddingBottom: 18, fontFamily: sans,
};
const card: React.CSSProperties = {
  width: 'clamp(92px, 9vw, 132px)', height: 'clamp(128px, 12.5vw, 184px)',
  borderRadius: 12, margin: '0 -6px', position: 'relative',
  background: `radial-gradient(125% 85% at 50% -8%, ${C.panelHi}, ${C.stage} 68%, ${C.void})`,
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
  background: 'radial-gradient(circle at 50% 40%, rgba(0,0,0,0.12), rgba(0,0,0,0.5))',
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
const pillVal: React.CSSProperties = { fontFamily: mono, fontSize: 'clamp(12px, 1.1vw, 15px)', padding: '2px 9px', borderRadius: 999 };
const manaValPill: React.CSSProperties = { color: '#bfe0ff', background: 'rgba(90,160,255,0.18)', border: '1px solid #2a4a80' };
// Mana cost, top-left. Turns red when the player can't currently afford it (on their turn).
const costBadge: React.CSSProperties = {
  position: 'absolute', top: 6, left: 6, minWidth: 20, height: 20, padding: '0 5px',
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1,
  fontFamily: mono, fontSize: 'clamp(11px, 1vw, 13px)', fontWeight: 800, borderRadius: 7, zIndex: 3,
  color: '#cfe6ff', background: 'linear-gradient(160deg, rgba(30,58,110,0.95), rgba(16,30,60,0.95))',
  border: '1px solid #3a6bb0', boxShadow: '0 2px 8px rgba(40,90,190,0.4)',
};
const costBadgeShort: React.CSSProperties = {
  color: '#ffc2cf', background: 'linear-gradient(160deg, rgba(90,30,48,0.95), rgba(50,16,26,0.95))',
  border: '1px solid #b0466a', boxShadow: '0 2px 8px rgba(190,50,90,0.4)',
};
const dmgVal: React.CSSProperties = { color: '#ffd0db', background: 'rgba(255,59,107,0.16)', border: '1px solid #5a2436' };
const healVal: React.CSSProperties = { color: '#dcefb0', background: 'rgba(166,197,63,0.16)', border: '1px solid #4a5a1f' };
const shieldVal: React.CSSProperties = { color: '#cfe2ff', background: 'rgba(127,182,255,0.16)', border: '1px solid #2a4870' };
const revVal: React.CSSProperties = { color: '#d9c4ff', background: 'rgba(139,108,255,0.16)', border: '1px solid #4a3a78' };
const peekVal: React.CSSProperties = { color: '#cdeaff', background: 'rgba(139,227,255,0.16)', border: '1px solid #2a5a78' };
const shatterVal: React.CSSProperties = { color: '#d6f5b8', background: 'rgba(155,232,90,0.16)', border: '1px solid #3e6a2a' };
const skipVal: React.CSSProperties = { color: '#bfe6ff', background: 'rgba(95,208,255,0.16)', border: '1px solid #2a5a78' };
const gambleVal: React.CSSProperties = { color: '#ffe39a', background: 'rgba(255,216,74,0.16)', border: '1px solid #6a5a22' };
const sacrificeVal: React.CSSProperties = { color: '#ffc6a0', background: 'rgba(255,122,60,0.16)', border: '1px solid #6a3a22' };
const tip: React.CSSProperties = {
  position: 'absolute', bottom: '102%', left: '50%', transform: 'translateX(-50%)',
  width: 'clamp(150px, 15vw, 200px)', padding: '9px 11px', borderRadius: 10, zIndex: 20,
  background: 'linear-gradient(180deg, rgba(24,28,40,0.98), rgba(14,16,24,0.98))',
  border: `1px solid ${C.border}`, boxShadow: '0 16px 36px rgba(0,0,0,0.6)',
  pointerEvents: 'none', textAlign: 'left',
};
const tipName: React.CSSProperties = { fontFamily: mono, fontSize: 12, color: C.you, letterSpacing: 1, marginBottom: 4 };
const tipDesc: React.CSSProperties = { fontSize: 12.5, lineHeight: 1.45, color: C.text, whiteSpace: 'normal' };
const tipHint: React.CSSProperties = {
  marginTop: 6, paddingTop: 5, borderTop: `1px solid ${C.border}`,
  fontSize: 11, fontWeight: 700, color: C.you, textAlign: 'center', letterSpacing: 0.3,
};
