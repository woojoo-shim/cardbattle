import { useEffect, useRef, useState } from 'react';
import { EMOTES } from '@cardbattle/shared';
import { Icon, type IconName } from './art/Icon.js';
import { C, sans } from './theme.js';

interface Props {
  onSend: (id: string) => void;
}

/** Bottom-right quick-emote picker: a round trigger that pops open a grid of preset
 *  reactions (no free-text chat). Sending closes the popover and briefly locks the
 *  trigger so a player can't machine-gun emotes past the server's rate limit. */
export function EmoteBar({ onSend }: Props) {
  const [open, setOpen] = useState(false);
  const [cooling, setCooling] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Close the popover when clicking elsewhere.
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const pick = (id: string) => {
    if (cooling) return;
    onSend(id);
    setOpen(false);
    setCooling(true);
    setTimeout(() => setCooling(false), 1300);
  };

  return (
    <div ref={wrapRef} style={wrap}>
      {open && (
        <div style={grid}>
          {EMOTES.map((e) => (
            <button key={e.id} style={cell} onClick={() => pick(e.id)} title={e.label}>
              <Icon name={e.icon as IconName} size={22} color={C.you} />
              <span style={cellLabel}>{e.label}</span>
            </button>
          ))}
        </div>
      )}
      <button
        style={{ ...trigger, opacity: cooling ? 0.5 : 1, cursor: cooling ? 'default' : 'pointer' }}
        onClick={() => !cooling && setOpen((o) => !o)}
        title="이모트 보내기"
      >
        <Icon name="sparkle" size={22} color="#04231b" />
      </button>
    </div>
  );
}

const wrap: React.CSSProperties = {
  position: 'absolute', bottom: 30, right: 230, zIndex: 18,
  display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 12, fontFamily: sans,
};
const grid: React.CSSProperties = {
  display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8,
  padding: 12, borderRadius: 16,
  background: 'linear-gradient(180deg, rgba(18,26,46,0.98), rgba(10,15,28,0.98))',
  border: `1.5px solid ${C.border}`, boxShadow: '0 14px 34px rgba(0,0,0,0.5)',
  animation: 'cb-emote-pop 0.2s ease',
};
const cell: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
  width: 74, padding: '10px 6px', borderRadius: 10, cursor: 'pointer',
  background: 'rgba(156,59,40,0.06)', border: `1px solid ${C.border}`,
  color: '#ece0c6', fontFamily: sans, transition: 'background .15s, border-color .15s',
};
const cellLabel: React.CSSProperties = { fontSize: 12, fontWeight: 700, letterSpacing: 0.3, whiteSpace: 'nowrap' };
const trigger: React.CSSProperties = {
  width: 54, height: 54, borderRadius: '50%', border: 'none',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: 'linear-gradient(100deg,#b8492f,#9c3b28 56%,#7f2f1f)',
  boxShadow: '0 8px 20px rgba(60,20,10,0.4)', transition: 'opacity .2s, transform .15s',
};
