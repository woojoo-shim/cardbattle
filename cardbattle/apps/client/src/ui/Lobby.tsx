import { useState } from 'react';
import type { UiState } from '../state/useRoom.js';
import { MIN_PLAYERS, MAX_PLAYERS } from '@cardbattle/shared';
import { AvatarArt, BOT_TINTS } from './art/CreatureArt.js';

interface Props {
  ui: UiState;
  myId: string;
  onReady: (ready: boolean) => void;
  onAddBot: () => void;
}

export function Lobby({ ui, myId, onReady, onAddBot }: Props) {
  const [ready, setReady] = useState(false);
  const toggle = () => { const next = !ready; setReady(next); onReady(next); };
  const n = ui.players.length;

  return (
    <div style={wrap}>
      <h1 style={title}>CARD&nbsp;BATTLE</h1>
      {ui.title && <p style={roomTitle}>{ui.title}</p>}
      {ui.code && (
        <div style={codeBadge}>
          <span style={codeLabel}>방 코드</span>
          <span style={codeValue}>{ui.code}</span>
          <span style={codeShare}>친구에게 공유하세요</span>
        </div>
      )}
      <p style={subtitle}>
        {n}/{MAX_PLAYERS} 플레이어 · 최소 {MIN_PLAYERS}명 필요
      </p>
      <ul style={list}>
        {ui.players.map((p) => (
          <li key={p.id} style={{ ...row, ...(p.id === myId ? rowMe : null) }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: p.connected ? 1 : 0.4 }}>
              <span style={thumb}>
                <AvatarArt avatar={p.avatar} tint={BOT_TINTS[p.seat % BOT_TINTS.length]} size={30} />
              </span>
              {p.name}{p.id === myId ? ' (나)' : ''}
            </span>
            <span style={{ color: '#3df2c0', fontSize: 13 }}>좌석 {p.seat + 1}</span>
          </li>
        ))}
      </ul>
      <div style={{ display: 'flex', gap: 12 }}>
        <button onClick={onAddBot} disabled={n >= MAX_PLAYERS} style={botBtn}>
          + 봇 추가
        </button>
        <button onClick={toggle} style={{ ...btn, ...(ready ? btnReady : null) }}>
          {ready ? '준비 완료 ✓' : '준비하기'}
        </button>
      </div>
      <p style={hint}>봇을 추가하면 혼자서도 플레이할 수 있습니다. 모두 준비되면 시작!</p>
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
const roomTitle: React.CSSProperties = { margin: 0, fontSize: 18, fontWeight: 700, color: '#e8e8f0' };
const codeBadge: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px', borderRadius: 12,
  background: 'rgba(123,92,255,0.12)', border: '1px solid rgba(123,92,255,0.4)',
  boxShadow: '0 0 24px rgba(123,92,255,0.25)',
};
const codeLabel: React.CSSProperties = { fontSize: 13, color: '#9a9ab0' };
const codeValue: React.CSSProperties = {
  fontFamily: 'ui-monospace, monospace', fontSize: 26, fontWeight: 900, letterSpacing: 8,
  color: '#3df2c0', textShadow: '0 0 16px rgba(61,242,192,0.5)',
};
const codeShare: React.CSSProperties = { fontSize: 12, color: '#6a6a80' };
const list: React.CSSProperties = {
  listStyle: 'none', padding: 0, margin: '8px 0', width: 320, display: 'flex',
  flexDirection: 'column', gap: 8,
};
const row: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', padding: '10px 16px',
  background: 'rgba(255,255,255,0.04)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)',
};
const rowMe: React.CSSProperties = { borderColor: '#7b5cff', boxShadow: '0 0 16px rgba(123,92,255,0.4)' };
const thumb: React.CSSProperties = {
  width: 34, height: 34, borderRadius: 9, display: 'grid', placeItems: 'center', flexShrink: 0,
  background: 'linear-gradient(160deg,#1b2336,#101626)', border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden',
};
const btn: React.CSSProperties = {
  padding: '14px 40px', fontSize: 18, fontWeight: 700, color: '#fff', cursor: 'pointer',
  border: 'none', borderRadius: 12, background: 'linear-gradient(90deg,#7b5cff,#5b3cff)',
  boxShadow: '0 8px 24px rgba(123,92,255,0.4)',
};
const btnReady: React.CSSProperties = { background: 'linear-gradient(90deg,#1fae8a,#3df2c0)', color: '#04231b' };
const botBtn: React.CSSProperties = {
  padding: '14px 26px', fontSize: 16, fontWeight: 700, color: '#cfcfe0', cursor: 'pointer',
  border: '1px solid rgba(255,255,255,0.18)', borderRadius: 12, background: 'rgba(255,255,255,0.06)',
};
const hint: React.CSSProperties = { margin: 0, color: '#6a6a80', fontSize: 13 };
