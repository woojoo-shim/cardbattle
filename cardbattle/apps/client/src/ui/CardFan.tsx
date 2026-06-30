import { useState } from 'react';
import type { CardInstance } from '@cardbattle/shared';
import { CARD_DEFS } from '@cardbattle/shared';
import { C, RARITY_BORDER, mono, sans } from './theme.js';
import { CardArt } from './art/CardArt.js';

interface Props {
  hand: CardInstance[];
  enabled: boolean;
  pendingId: string | null;
  onPlay: (card: CardInstance) => void;
}

/** Fanned hand — the dominant interaction. Cards rotate outward from center, lift on hover,
 * and the selected (pending-target) card lifts higher with a teal outline. */
export function CardFan({ hand, enabled, pendingId, onPlay }: Props) {
  const [hover, setHover] = useState<string | null>(null);
  const n = hand.length;
  const mid = (n - 1) / 2;

  return (
    <div style={fan}>
      {hand.map((c, i) => {
        const def = CARD_DEFS[c.defId];
        if (!def) return null;
        const isPending = c.id === pendingId;
        const isHover = c.id === hover && enabled;
        const rot = (i - mid) * 5;
        const lift = Math.abs(i - mid) * 8;
        const hasDamage = def.effects.some((e) => e.kind === 'damage');
        const hasShield = def.effects.some((e) => e.kind === 'shield');
        const isReverse = def.effects.some((e) => e.kind === 'reverse');
        const isPeek = def.effects.some((e) => e.kind === 'peek');
        const isDiscard = def.effects.some((e) => e.kind === 'discard');
        const value = def.effects.reduce((m, e) => ('amount' in e ? Math.max(m, e.amount) : m), 0);
        const pill = isReverse
          ? { style: revVal, label: '↔' }
          : isPeek
          ? { style: peekVal, label: '👁' }
          : isDiscard
          ? { style: shatterVal, label: '✖' }
          : hasDamage
          ? { style: dmgVal, label: `${value}` }
          : hasShield
          ? { style: shieldVal, label: `+${value}` }
          : { style: healVal, label: `+${value}` };

        let transform = `rotate(${rot}deg) translateY(${lift}px)`;
        let z = 1;
        if (isPending) { transform = 'translateY(-30px) scale(1.1)'; z = 6; }
        else if (isHover) { transform = 'translateY(-22px) scale(1.08)'; z = 5; }

        return (
          <button
            key={c.id}
            disabled={!enabled}
            onMouseEnter={() => setHover(c.id)}
            onMouseLeave={() => setHover((h) => (h === c.id ? null : h))}
            onClick={() => onPlay(c)}
            style={{
              ...card,
              transform,
              zIndex: z,
              cursor: enabled ? 'pointer' : 'default',
              opacity: enabled ? 1 : 0.5,
              filter: enabled ? 'none' : 'grayscale(0.3)',
              borderColor: isPending ? C.you : RARITY_BORDER[def.rarity] ?? C.border,
              boxShadow: isPending
                ? `0 0 0 1px ${C.you}, 0 26px 44px rgba(56,232,200,0.3)`
                : isHover
                ? '0 26px 44px rgba(0,0,0,0.6)'
                : '0 14px 26px rgba(0,0,0,0.55)',
            }}
          >
            <CardArt id={def.id} size="clamp(48px, 5vw, 72px)" />
            <div style={cname}>{def.name}</div>
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
  background: 'linear-gradient(170deg,#1c2233,#11151f)', border: `1px solid ${C.border}`,
  color: C.text, display: 'flex', flexDirection: 'column', alignItems: 'center',
  justifyContent: 'space-between', padding: 'clamp(12px, 1.2vw, 18px) clamp(8px, 0.8vw, 12px)',
  transition: 'transform .18s ease, box-shadow .18s ease',
  transformOrigin: 'bottom center',
};
const cname: React.CSSProperties = { fontSize: 'clamp(13px, 1.25vw, 17px)', fontWeight: 700 };
const pillVal: React.CSSProperties = { fontFamily: mono, fontSize: 'clamp(12px, 1.1vw, 15px)', padding: '2px 9px', borderRadius: 999 };
const dmgVal: React.CSSProperties = { color: '#ffd0db', background: 'rgba(255,59,107,0.16)', border: '1px solid #5a2436' };
const healVal: React.CSSProperties = { color: '#bff6ec', background: 'rgba(56,232,200,0.16)', border: '1px solid #1f5a4c' };
const shieldVal: React.CSSProperties = { color: '#cfe2ff', background: 'rgba(127,182,255,0.16)', border: '1px solid #2a4870' };
const revVal: React.CSSProperties = { color: '#d9c4ff', background: 'rgba(139,108,255,0.16)', border: '1px solid #4a3a78' };
const peekVal: React.CSSProperties = { color: '#cdeaff', background: 'rgba(139,227,255,0.16)', border: '1px solid #2a5a78' };
const shatterVal: React.CSSProperties = { color: '#d6f5b8', background: 'rgba(155,232,90,0.16)', border: '1px solid #3e6a2a' };
