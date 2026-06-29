import { useState } from 'react';
import type { UiState } from '../state/useRoom.js';
import { MIN_PLAYERS, MAX_PLAYERS } from '@cardbattle/shared';

interface Props {
  ui: UiState;
  myId: string;
  onReady: (ready: boolean) => void;
}

export function Lobby({ ui, myId, onReady }: Props) {
  const [ready, setReady] = useState(false);
  const toggle = () => { const next = !ready; setReady(next); onReady(next); };
  const n = ui.players.length;

  return (
    <div style={wrap}>
      <h1 style={title}>CARD&nbsp;BATTLE</h1>
      <p style={subtitle}>
        {n}/{MAX_PLAYERS} 플레이어 · 최소 {MIN_PLAYERS}명 필요
      </p>
      <ul style={list}>
        {ui.players.map((p) => (
          <li key={p.id} style={{ ...row, ...(p.id === myId ? rowMe : null) }}>
            <span style={{ opacity: p.connected ? 1 : 0.4 }}>
              {p.name}{p.id === myId ? ' (나)' : ''}
            </span>
            <span style={{ color: '#3df2c0', fontSize: 13 }}>좌석 {p.seat + 1}</span>
          </li>
        ))}
      </ul>
      <button onClick={toggle} style={{ ...btn, ...(ready ? btnReady : null) }}>
        {ready ? '준비 완료 ✓' : '준비하기'}
      </button>
      <p style={hint}>모든 플레이어가 준비하면 게임이 시작됩니다.</p>
    </div>
  );
}

const wrap: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
  minHeight: '100vh', gap: 18, color: '#e8e8f0', fontFamily: 'system-ui',
};
const title: React.CSSProperties = {
  margin: 0, fontSize: 52, fontWeight: 900, letterSpacing: 4,
  background: 'linear-gradient(90deg,#7b5cff,#3df2c0)', WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent', textShadow: '0 0 40px rgba(123,92,255,0.5)',
};
const subtitle: React.CSSProperties = { margin: 0, color: '#9a9ab0' };
const list: React.CSSProperties = {
  listStyle: 'none', padding: 0, margin: '8px 0', width: 320, display: 'flex',
  flexDirection: 'column', gap: 8,
};
const row: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', padding: '10px 16px',
  background: 'rgba(255,255,255,0.04)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)',
};
const rowMe: React.CSSProperties = { borderColor: '#7b5cff', boxShadow: '0 0 16px rgba(123,92,255,0.4)' };
const btn: React.CSSProperties = {
  padding: '14px 40px', fontSize: 18, fontWeight: 700, color: '#fff', cursor: 'pointer',
  border: 'none', borderRadius: 12, background: 'linear-gradient(90deg,#7b5cff,#5b3cff)',
  boxShadow: '0 8px 24px rgba(123,92,255,0.4)',
};
const btnReady: React.CSSProperties = { background: 'linear-gradient(90deg,#1fae8a,#3df2c0)', color: '#04231b' };
const hint: React.CSSProperties = { margin: 0, color: '#6a6a80', fontSize: 13 };
