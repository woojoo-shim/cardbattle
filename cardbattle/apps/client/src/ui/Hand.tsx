import type { CardInstance } from '@cardbattle/shared';
import { CARD_DEFS } from '@cardbattle/shared';

interface Props {
  hand: CardInstance[];
  enabled: boolean;
  pendingId: string | null;
  onPlay: (card: CardInstance) => void;
}

const rarityGlow: Record<string, string> = {
  common: 'rgba(255,255,255,0.15)',
  rare: 'rgba(61,180,242,0.5)',
  epic: 'rgba(186,92,255,0.6)',
  legendary: 'rgba(255,196,61,0.7)',
};

export function Hand({ hand, enabled, pendingId, onPlay }: Props) {
  return (
    <div style={tray}>
      {hand.map((c) => {
        const def = CARD_DEFS[c.defId];
        if (!def) return null;
        const isPending = c.id === pendingId;
        return (
          <button
            key={c.id}
            disabled={!enabled}
            onClick={() => onPlay(c)}
            style={{
              ...card,
              cursor: enabled ? 'pointer' : 'default',
              opacity: enabled ? 1 : 0.55,
              boxShadow: isPending
                ? '0 0 24px #3df2c0, 0 0 0 2px #3df2c0'
                : `0 6px 18px ${rarityGlow[def.rarity] ?? rarityGlow.common}`,
              transform: isPending ? 'translateY(-12px)' : 'none',
            }}
          >
            <div style={icon}>{def.icon}</div>
            <div style={cname}>{def.name}</div>
            <div style={desc}>{def.desc}</div>
          </button>
        );
      })}
    </div>
  );
}

const tray: React.CSSProperties = {
  position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)',
  display: 'flex', gap: 12, zIndex: 5,
};
const card: React.CSSProperties = {
  width: 110, height: 150, padding: 10, border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 12, background: 'linear-gradient(160deg,#1a1a2e,#10101c)', color: '#e8e8f0',
  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
  fontFamily: 'system-ui', transition: 'transform .15s,box-shadow .15s',
};
const icon: React.CSSProperties = { fontSize: 40, marginTop: 6 };
const cname: React.CSSProperties = { fontWeight: 800, fontSize: 15 };
const desc: React.CSSProperties = { fontSize: 11, color: '#9a9ab0', textAlign: 'center', lineHeight: 1.3 };
