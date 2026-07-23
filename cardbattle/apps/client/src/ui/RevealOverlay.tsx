import { useEffect, useRef, useState } from 'react';
import type { GameEvent } from '@cardbattle/shared';
import { CARD_DEFS } from '@cardbattle/shared';
import type { UiState } from '../state/useRoom.js';
import { C, mono, sans } from './theme.js';
import { CardArt } from './art/CardArt.js';
import { Icon } from './art/Icon.js';

interface Props {
  events: GameEvent[];
  myId: string;
  ui: UiState;
}

interface Reveal { targetName: string; defId: string }

/** Center-screen toast that surfaces a card peeked via 간파(peek). Only the caster receives
 * the private `card_revealed` event (filtered server-side), so this is safe to render here. */
export function RevealOverlay({ events, myId, ui }: Props) {
  const seen = useRef(0);
  const [reveal, setReveal] = useState<Reveal | null>(null);

  useEffect(() => {
    for (let i = seen.current; i < events.length; i++) {
      const e = events[i];
      if (e.type === 'card_revealed' && e.viewerId === myId) {
        const targetName = ui.players.find((p) => p.id === e.targetId)?.name ?? '상대';
        setReveal({ targetName, defId: e.defId });
      }
    }
    seen.current = events.length;
  }, [events, myId, ui]);

  useEffect(() => {
    if (!reveal) return;
    const t = setTimeout(() => setReveal(null), 3400);
    return () => clearTimeout(t);
  }, [reveal]);

  if (!reveal) return null;
  const def = CARD_DEFS[reveal.defId];
  return (
    <div style={wrap}>
      <div style={card}>
        <div style={head}><Icon name="crystal" size={16} />&nbsp;{reveal.targetName} 의 손패</div>
        <CardArt id={reveal.defId} size="96px" />
        <div style={name}>{def?.name ?? reveal.defId}</div>
        <div style={desc}>{def?.desc ?? ''}</div>
      </div>
    </div>
  );
}

const wrap: React.CSSProperties = {
  position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 40, pointerEvents: 'none', fontFamily: sans,
};
const card: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
  padding: '22px 30px', borderRadius: 16,
  background: 'linear-gradient(180deg, rgba(42,32,19,0.97), rgba(20,13,8,0.97))',
  border: `1px solid ${C.border}`, boxShadow: '0 0 0 1px rgba(113,145,138,0.6), 0 30px 70px rgba(0,0,0,0.65)',
  animation: 'revealPop .26s ease',
};
const head: React.CSSProperties = { fontFamily: mono, fontSize: 12, color: C.magic, letterSpacing: 2 };
const name: React.CSSProperties = { fontSize: 20, fontWeight: 800, color: C.text };
const desc: React.CSSProperties = { fontSize: 13, color: C.dim, maxWidth: 220, textAlign: 'center' };
