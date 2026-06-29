import { useEffect, useState } from 'react';
import type { UiState } from '../state/useRoom.js';

interface Props {
  ui: UiState;
  myId: string;
}

/** Top banner: whose turn it is + a live countdown to the turn deadline. */
export function Hud({ ui, myId }: Props) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);

  const activeId = ui.turnOrder[ui.currentTurnIndex];
  const active = ui.players.find((p) => p.id === activeId);
  const isMyTurn = activeId === myId;
  const remain = Math.max(0, Math.ceil((ui.turnDeadline - now) / 1000));

  return (
    <div style={{ ...bar, borderColor: isMyTurn ? '#3df2c0' : 'rgba(255,255,255,0.1)' }}>
      <span style={turn}>
        {isMyTurn ? '🔥 당신의 턴!' : `${active?.name ?? '...'} 의 턴`}
      </span>
      <span style={{ ...timer, color: remain <= 5 ? '#ff5c8a' : '#3df2c0' }}>
        ⏱ {remain}s
      </span>
    </div>
  );
}

const bar: React.CSSProperties = {
  position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)',
  display: 'flex', gap: 24, alignItems: 'center', padding: '10px 24px',
  background: 'rgba(16,16,28,0.9)', border: '2px solid', borderRadius: 999,
  color: '#e8e8f0', fontFamily: 'system-ui', zIndex: 5,
};
const turn: React.CSSProperties = { fontWeight: 800, fontSize: 16 };
const timer: React.CSSProperties = { fontWeight: 700, fontSize: 16, minWidth: 56, textAlign: 'right' };
