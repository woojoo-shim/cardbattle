import { useState } from 'react';
import { useRoom } from './state/useRoom.js';
import { Lobby } from './ui/Lobby.js';
import { Battle } from './ui/Battle.js';
import { RoomBrowser } from './ui/RoomBrowser.js';
import type { BattleConnection } from './net/client.js';

type Connect = () => Promise<BattleConnection>;

export function App() {
  const [name, setName] = useState<string | null>(null);
  const [connect, setConnect] = useState<Connect | null>(null);

  if (name === null) return <NameGate onSubmit={setName} />;
  // useState setters treat function values as updaters, so wrap to store the connect fn itself.
  if (connect === null) return <RoomBrowser name={name} onPick={(c) => setConnect(() => c)} />;
  return <Game connect={connect} />;
}

function Game({ connect }: { connect: Connect }) {
  const { conn, ui, hand, events, error, send, setReady, addBot } = useRoom(connect);
  const myId = conn?.sessionId ?? '';

  if (!ui) {
    return <Centered>{error ? `연결 실패: ${error.message}` : '연결 중…'}</Centered>;
  }
  if (ui.phase === 'lobby') {
    return <Lobby ui={ui} myId={myId} onReady={setReady} onAddBot={addBot} />;
  }
  return <Battle ui={ui} myId={myId} hand={hand} events={events} error={error} send={send} />;
}

function NameGate({ onSubmit }: { onSubmit: (name: string) => void }) {
  const [value, setValue] = useState('');
  const go = () => { const n = value.trim() || 'Player'; onSubmit(n.slice(0, 16)); };
  return (
    <Centered>
      <h1 style={brand}>CARD&nbsp;BATTLE</h1>
      <input
        autoFocus
        value={value}
        maxLength={16}
        placeholder="닉네임"
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && go()}
        style={input}
      />
      <button onClick={go} style={enter}>입장</button>
    </Centered>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div style={center}>{children}</div>;
}

const center: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
  minHeight: '100vh', gap: 16, color: '#9a9ab0', fontFamily: 'system-ui',
};
const brand: React.CSSProperties = {
  margin: 0, fontSize: 48, fontWeight: 900, letterSpacing: 4,
  background: 'linear-gradient(90deg,#7b5cff,#3df2c0)', WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent', textShadow: '0 0 40px rgba(123,92,255,0.5)',
};
const input: React.CSSProperties = {
  padding: '12px 16px', fontSize: 16, width: 240, textAlign: 'center', color: '#e8e8f0',
  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 10, outline: 'none',
};
const enter: React.CSSProperties = {
  padding: '12px 36px', fontSize: 16, fontWeight: 700, color: '#fff', cursor: 'pointer',
  border: 'none', borderRadius: 10, background: 'linear-gradient(90deg,#7b5cff,#5b3cff)',
  boxShadow: '0 8px 24px rgba(123,92,255,0.4)',
};
