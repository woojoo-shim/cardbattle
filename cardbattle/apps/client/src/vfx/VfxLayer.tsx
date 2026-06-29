import { useEffect, useRef } from 'react';
import type { GameEvent } from '@cardbattle/shared';

interface Props {
  events: GameEvent[];
}

/**
 * S1 VFX stub: a transparent fixed overlay that consumes the GameEvent stream.
 * In S4 this is replaced by a PixiJS canvas that maps event.type → particle bursts.
 * For now it only flashes the screen edge on damage so the event wiring is verifiable.
 */
export function VfxLayer({ events }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const seen = useRef(0);

  useEffect(() => {
    const fresh = events.slice(seen.current);
    seen.current = events.length;
    const el = ref.current;
    if (!el) return;
    if (fresh.some((e) => e.type === 'damage_dealt')) {
      el.style.boxShadow = 'inset 0 0 120px rgba(255,92,138,0.6)';
      const id = setTimeout(() => { if (ref.current) ref.current.style.boxShadow = 'none'; }, 180);
      return () => clearTimeout(id);
    }
  }, [events]);

  return <div ref={ref} style={layer} aria-hidden />;
}

const layer: React.CSSProperties = {
  position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 50, transition: 'box-shadow .1s',
};
