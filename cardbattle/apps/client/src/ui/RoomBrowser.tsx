import { useEffect, useRef, useState } from 'react';
import { createRoom, joinRoomById, quickPlay, listLobby, type BattleConnection, type RoomInfo } from '../net/client.js';
import { C, mono, sans } from './theme.js';

interface Props {
  name: string;
  onPick: (connect: () => Promise<BattleConnection>) => void;
}

function headcount(r: RoomInfo): number {
  return r.metadata?.players ?? r.clients;
}

/** StarCraft-style custom-game browser: live list of open rooms, host a new room,
 * or join by a 4-char code friends share. Quick-play drops straight into a bot game. */
export function RoomBrowser({ name, onPick }: Props) {
  const [rooms, setRooms] = useState<RoomInfo[]>([]);
  const [title, setTitle] = useState('');
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');
  const roomsRef = useRef<RoomInfo[]>([]);
  roomsRef.current = rooms;

  useEffect(() => {
    let off: (() => void) | undefined;
    let disposed = false;
    listLobby((list) => setRooms(list))
      .then((unsub) => { if (disposed) unsub(); else off = unsub; })
      .catch(() => setErr('로비에 연결하지 못했습니다.'));
    return () => { disposed = true; off?.(); };
  }, []);

  const open = rooms
    .filter((r) => !r.metadata?.started && headcount(r) < r.maxClients)
    .sort((a, b) => (a.metadata?.title ?? '').localeCompare(b.metadata?.title ?? ''));

  const create = () => onPick(() => createRoom(name, title.trim()));
  const join = (roomId: string) => onPick(() => joinRoomById(roomId, name));
  const quick = () => onPick(() => quickPlay(name));
  const joinByCode = () => {
    const c = code.trim().toUpperCase();
    if (!c) return;
    const hit = roomsRef.current.find((r) => (r.metadata?.code ?? '').toUpperCase() === c);
    if (!hit) { setErr(`'${c}' 방을 찾을 수 없습니다.`); return; }
    join(hit.roomId);
  };

  return (
    <div style={wrap}>
      <h1 style={brand}>CARD&nbsp;BATTLE</h1>
      <p style={who}>{name} 님 · 방을 만들거나 친구 방에 입장하세요</p>

      <div style={cols}>
        {/* Left: live room list */}
        <section style={panel}>
          <h2 style={hd}>열린 방 <span style={count}>{open.length}</span></h2>
          <div style={listBox}>
            {open.length === 0 && <p style={empty}>열린 방이 없습니다. 새로 만들어 보세요.</p>}
            {open.map((r) => (
              <button key={r.roomId} style={roomRow} onClick={() => join(r.roomId)}>
                <span style={rTitle}>{r.metadata?.title || '제목 없음'}</span>
                <span style={rCode}>{r.metadata?.code}</span>
                <span style={rCount}>{headcount(r)}/{r.maxClients}</span>
                <span style={rGo}>입장 ▶</span>
              </button>
            ))}
          </div>
        </section>

        {/* Right: create / code / quick */}
        <section style={panel}>
          <h2 style={hd}>방 만들기</h2>
          <input
            style={field}
            value={title}
            maxLength={24}
            placeholder="방 제목 (예: 고수만 오셈)"
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && create()}
          />
          <button style={primary} onClick={create}>+ 방 만들기</button>

          <div style={sep}><span>또는 코드로 입장</span></div>
          <div style={codeRow}>
            <input
              style={{ ...field, ...codeField }}
              value={code}
              maxLength={4}
              placeholder="ABCD"
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && joinByCode()}
            />
            <button style={ghost} onClick={joinByCode}>입장</button>
          </div>

          <div style={sep}><span>혼자 연습</span></div>
          <button style={ghost} onClick={quick}>⚡ 빠른 입장 (봇과 연습)</button>

          {err && <p style={errLine}>{err}</p>}
        </section>
      </div>
    </div>
  );
}

const wrap: React.CSSProperties = {
  minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center',
  justifyContent: 'center', gap: 10, fontFamily: sans, color: C.text,
  background: 'radial-gradient(120% 90% at 50% 8%, #141826 0%, #0e1018 40%, #07080d 100%), #07080d',
};
const brand: React.CSSProperties = {
  margin: 0, fontSize: 44, fontWeight: 900, letterSpacing: 4,
  background: 'linear-gradient(90deg,#7b5cff,#3df2c0)', WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
};
const who: React.CSSProperties = { margin: '0 0 14px', color: C.dim, fontSize: 14 };
const cols: React.CSSProperties = { display: 'flex', gap: 20, width: 'min(820px, 94vw)', alignItems: 'stretch' };
const panel: React.CSSProperties = {
  flex: 1, display: 'flex', flexDirection: 'column', gap: 12, padding: 20, borderRadius: 16,
  background: `linear-gradient(180deg, ${C.panelHi}, ${C.panel})`, border: `1px solid ${C.border}`,
  boxShadow: '0 22px 50px rgba(0,0,0,0.55)',
};
const hd: React.CSSProperties = { margin: 0, fontSize: 16, fontWeight: 800, letterSpacing: 1, display: 'flex', alignItems: 'center', gap: 8 };
const count: React.CSSProperties = {
  fontFamily: mono, fontSize: 12, color: C.you, border: `1px solid ${C.border}`, borderRadius: 999, padding: '1px 8px',
};
const listBox: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 8, minHeight: 220, maxHeight: 340, overflowY: 'auto' };
const empty: React.CSSProperties = { color: C.faint, fontSize: 13, textAlign: 'center', margin: 'auto' };
const roomRow: React.CSSProperties = {
  display: 'grid', gridTemplateColumns: '1fr auto auto auto', alignItems: 'center', gap: 12,
  padding: '12px 14px', borderRadius: 10, cursor: 'pointer', textAlign: 'left',
  background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`, color: C.text, fontFamily: sans,
};
const rTitle: React.CSSProperties = { fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };
const rCode: React.CSSProperties = { fontFamily: mono, fontSize: 13, color: C.rare, letterSpacing: 2 };
const rCount: React.CSSProperties = { fontFamily: mono, fontSize: 13, color: C.dim };
const rGo: React.CSSProperties = { fontSize: 13, color: C.you, fontWeight: 700 };
const field: React.CSSProperties = {
  padding: '12px 14px', fontSize: 15, color: C.text, outline: 'none',
  background: 'rgba(0,0,0,0.3)', border: `1px solid ${C.border}`, borderRadius: 10, fontFamily: sans,
};
const codeRow: React.CSSProperties = { display: 'flex', gap: 8 };
const codeField: React.CSSProperties = { flex: 1, fontFamily: mono, letterSpacing: 6, textAlign: 'center', textTransform: 'uppercase' };
const primary: React.CSSProperties = {
  padding: '13px 18px', fontSize: 16, fontWeight: 800, color: '#04231b', cursor: 'pointer',
  border: 'none', borderRadius: 10, background: 'linear-gradient(180deg,#5af0d3,#22c7a8)',
  boxShadow: '0 8px 20px rgba(56,232,200,0.3)',
};
const ghost: React.CSSProperties = {
  padding: '13px 18px', fontSize: 15, fontWeight: 700, color: C.text, cursor: 'pointer',
  border: `1px solid ${C.borderHi}`, borderRadius: 10, background: 'rgba(255,255,255,0.05)',
};
const sep: React.CSSProperties = {
  textAlign: 'center', color: C.faint, fontSize: 12, margin: '4px 0',
  display: 'flex', alignItems: 'center', gap: 10,
};
const errLine: React.CSSProperties = { margin: 0, color: C.enemy, fontSize: 13, textAlign: 'center' };
