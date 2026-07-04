import { useState } from 'react';
import { Icon } from './art/Icon.js';
import { isMuted, toggleMute } from '../audio/sfx.js';
import { C, sans } from './theme.js';

/** A small round speaker toggle. Mirrors the shared mute state (persisted in localStorage),
 * so placing it on any screen controls the whole game's audio. */
export function MuteButton() {
  const [muted, setMuted] = useState(isMuted());
  return (
    <button
      type="button"
      onClick={() => setMuted(toggleMute())}
      style={btn}
      title={muted ? '소리 켜기' : '소리 끄기'}
      aria-label={muted ? '소리 켜기' : '소리 끄기'}
      aria-pressed={muted}
    >
      <Icon name={muted ? 'mute' : 'sound'} size={16} color={muted ? C.faint : '#cfe08a'} />
    </button>
  );
}

const btn: React.CSSProperties = {
  width: 34, height: 34, display: 'grid', placeItems: 'center', cursor: 'pointer',
  borderRadius: 999, border: `1px solid ${C.border}`, fontFamily: sans, padding: 0,
  background: 'rgba(20,14,16,0.8)',
};
