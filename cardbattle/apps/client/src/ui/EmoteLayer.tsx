import { useEffect, useState } from 'react';
import { EMOTE_BY_ID } from '@cardbattle/shared';
import type { LiveEmote } from '../state/useRoom.js';
import { Icon, type IconName } from './art/Icon.js';
import { C, sans } from './theme.js';

interface Props {
  emotes: LiveEmote[];
}

/** Floats a speech bubble above each seat that just sent a quick-emote. Anchored to the
 *  seat's [data-pid] portrait (the same anchor VfxLayer uses) and auto-removed by useRoom. */
export function EmoteLayer({ emotes }: Props) {
  return (
    <div style={layer}>
      {emotes.map((e) => (
        <Bubble key={e.key} emote={e} />
      ))}
    </div>
  );
}

function Bubble({ emote }: { emote: LiveEmote }) {
  const def = EMOTE_BY_ID[emote.id];
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const locate = () => {
      const el = document.querySelector<HTMLElement>(`[data-pid="${CSS.escape(emote.playerId)}"]`);
      if (!el) { setPos(null); return; }
      const r = el.getBoundingClientRect();
      setPos({ x: r.left + r.width / 2, y: r.top });
    };
    locate();
    window.addEventListener('resize', locate);
    return () => window.removeEventListener('resize', locate);
  }, [emote.playerId, emote.key]);

  if (!def || !pos) return null;
  return (
    <div style={{ ...bubble, left: pos.x, top: pos.y }}>
      <Icon name={def.icon as IconName} size={18} color={C.you} />
      <span style={label}>{def.label}</span>
    </div>
  );
}

const layer: React.CSSProperties = {
  position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 40,
};
const bubble: React.CSSProperties = {
  position: 'fixed', transform: 'translate(-50%, -118%)',
  display: 'flex', alignItems: 'center', gap: 8,
  padding: '9px 16px', borderRadius: 999, fontFamily: sans,
  background: 'linear-gradient(180deg, rgba(20,30,52,0.97), rgba(12,18,34,0.97))',
  border: `1.5px solid ${C.you}`,
  boxShadow: '0 8px 24px rgba(56,232,200,0.32), inset 0 0 16px rgba(56,232,200,0.1)',
  color: '#e6fbf5', fontSize: 16, fontWeight: 800, whiteSpace: 'nowrap',
  animation: 'cb-bubble-pop 0.34s cubic-bezier(0.18,1.4,0.4,1) forwards',
};
const label: React.CSSProperties = { letterSpacing: 0.4 };
