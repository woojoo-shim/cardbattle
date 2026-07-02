import { useEffect, useRef, useState } from 'react';
import { createRoom, joinRoomById, quickPlay, listLobby, type BattleConnection, type RoomInfo } from '../net/client.js';
import { fetchMe, type Account } from '../net/auth.js';
import { MODE_LIST, GAME_MODES, DEFAULT_MODE, type GameModeId } from '@cardbattle/shared';
import { Shop } from './Shop.js';
import { BrandMark } from './BrandMark.js';
import { Icon, MODE_ICON } from './art/Icon.js';
import { C, mono, sans } from './theme.js';

interface Props {
  account: Account;
  onAccount: (a: Account) => void;
  onPick: (connect: () => Promise<BattleConnection>) => void;
  onBack?: () => void;
  onLogout?: () => void;
}

function headcount(r: RoomInfo): number {
  return r.metadata?.players ?? r.clients;
}

/** StarCraft-style custom-game browser: live list of open rooms, host a new room,
 * or join by a 4-char code friends share. Quick-play drops straight into a bot game. */
export function RoomBrowser({ account, onAccount, onPick, onBack, onLogout }: Props) {
  const { display: name, avatar } = account;
  const [rooms, setRooms] = useState<RoomInfo[]>([]);
  const [title, setTitle] = useState('');
  const [mode, setMode] = useState<GameModeId>(DEFAULT_MODE);
  const [showModes, setShowModes] = useState(false); // special modes stay collapsed (standard) by default
  const [isPrivate, setIsPrivate] = useState(false); // public rooms are listed; private ones join-by-code only
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');
  const [shopOpen, setShopOpen] = useState(false);
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

  // Refresh the account (gold may have grown from a just-finished match) when we land here.
  useEffect(() => { fetchMe().then((a) => { if (a) onAccount(a); }); }, []);

  const open = rooms
    .filter((r) => !r.metadata?.started && !r.metadata?.unlisted && headcount(r) < r.maxClients)
    .sort((a, b) => (a.metadata?.title ?? '').localeCompare(b.metadata?.title ?? ''));

  // Collapsing the special-mode picker snaps the room back to the standard ruleset.
  const toggleModes = () => setShowModes((v) => { if (v) setMode(DEFAULT_MODE); return !v; });
  const create = () => onPick(() => createRoom(name, title.trim(), avatar, mode, isPrivate));
  const join = (roomId: string) => onPick(() => joinRoomById(roomId, name, avatar));
  const quick = () => onPick(() => quickPlay(name, avatar));
  const joinByCode = () => {
    const c = code.trim().toUpperCase();
    if (!c) return;
    const hit = roomsRef.current.find((r) => (r.metadata?.code ?? '').toUpperCase() === c);
    if (!hit) { setErr(`'${c}' 방을 찾을 수 없습니다.`); return; }
    join(hit.roomId);
  };

  return (
    <div style={wrap}>
      <div style={topBar}>
        {onBack && <button style={logout} onClick={onBack}>← 메뉴</button>}
        <button style={goldChip} onClick={() => setShopOpen(true)} title="상점 열기"><Icon name="coin" size={16} />&nbsp;{account.gold}&nbsp;&nbsp;상점</button>
        {onLogout && <button style={logout} onClick={onLogout}>로그아웃</button>}
      </div>
      <BrandMark size={72} />
      <p style={who}>{name} 님 · 방을 만들거나 친구 방에 입장하세요</p>

      <div style={cols}>
        {/* Left: live room list */}
        <section style={panel}>
          <h2 style={hd}>열린 방 <span style={count}>{open.length}</span></h2>
          <div style={listBox}>
            {open.length === 0 && <p style={empty}>열린 방이 없습니다. 새로 만들어 보세요.</p>}
            {open.map((r) => (
              <button key={r.roomId} style={roomRow} onClick={() => join(r.roomId)}>
                <span style={rTitle}>
                  <span style={rMode} title={GAME_MODES[r.metadata?.mode ?? 'standard']?.name}>
                    <Icon name={MODE_ICON[r.metadata?.mode ?? 'standard']} size={16} color={C.rare} />
                  </span>
                  {r.metadata?.title || '제목 없음'}
                </span>
                <span style={rCode}>{r.metadata?.code}</span>
                <span style={rCount}>{headcount(r)}/{r.maxClients}</span>
                <span style={rGo}>입장&nbsp;<Icon name="arrowRight" size={13} /></span>
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
          <div style={visRow}>
            <button style={{ ...visBtn, ...(!isPrivate ? visBtnOn : null) }} onClick={() => setIsPrivate(false)}>
              <Icon name="globe" size={15} />&nbsp;공개
            </button>
            <button style={{ ...visBtn, ...(isPrivate ? visBtnOn : null) }} onClick={() => setIsPrivate(true)}>
              <Icon name="lock" size={15} />&nbsp;비공개
            </button>
          </div>
          <p style={visHint}>
            {isPrivate ? '목록에 표시되지 않고, 코드로만 입장할 수 있습니다.' : '누구나 방 목록에서 볼 수 있습니다.'}
          </p>

          <button style={{ ...modeToggle, ...(showModes ? modeToggleOn : null) }} onClick={toggleModes}>
            <Icon name="sparkle" size={15} />&nbsp;특별 모드 {showModes ? <>접기&nbsp;<Icon name="chevronUp" size={13} /></> : <>선택하기&nbsp;<Icon name="chevronDown" size={13} /></>}
          </button>
          {showModes && (
            <div style={modeGrid}>
              {MODE_LIST.map((m) => {
                const on = m.id === mode;
                return (
                  <button
                    key={m.id}
                    style={{ ...modeCard, ...(on ? modeCardOn : null) }}
                    onClick={() => setMode(m.id)}
                    title={m.desc}
                  >
                    <span style={modeIcon}><Icon name={MODE_ICON[m.id]} size={22} color={C.rare} /></span>
                    <span style={modeName}>{m.name}</span>
                    <span style={modeTag}>{m.tagline}</span>
                  </button>
                );
              })}
            </div>
          )}
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
          <button style={ghost} onClick={quick}><Icon name="bolt" size={15} />&nbsp;빠른 입장 (봇과 연습)</button>

          {err && <p style={errLine}>{err}</p>}
        </section>
      </div>

      {shopOpen && <Shop account={account} onAccount={onAccount} onClose={() => setShopOpen(false)} />}
    </div>
  );
}

const wrap: React.CSSProperties = {
  minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center',
  justifyContent: 'center', gap: 10, fontFamily: sans, color: C.text,
  background: 'radial-gradient(120% 90% at 50% 8%, #141826 0%, #0e1018 40%, #07080d 100%), #07080d',
};
const who: React.CSSProperties = { margin: '10px 0 14px', color: C.dim, fontSize: 14 };
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
const rTitle: React.CSSProperties = { fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 7 };
const rMode: React.CSSProperties = { fontSize: 15, flexShrink: 0 };
const visRow: React.CSSProperties = { display: 'flex', gap: 8 };
const visBtn: React.CSSProperties = {
  flex: 1, padding: '11px 12px', fontSize: 14, fontWeight: 700, color: C.dim, cursor: 'pointer',
  borderRadius: 10, border: `1px solid ${C.border}`, background: 'rgba(0,0,0,0.25)', fontFamily: sans,
  transition: 'border-color .12s, background .12s, color .12s',
};
const visBtnOn: React.CSSProperties = {
  color: C.text, border: '1px solid #7b5cff', background: 'rgba(123,92,255,0.14)', boxShadow: '0 0 14px rgba(123,92,255,0.28)',
};
const visHint: React.CSSProperties = { margin: '-4px 0 2px', color: C.faint, fontSize: 12, lineHeight: 1.3 };
const modeToggle: React.CSSProperties = {
  padding: '11px 14px', fontSize: 14, fontWeight: 700, color: C.dim, cursor: 'pointer',
  borderRadius: 10, border: `1px dashed ${C.borderHi}`, background: 'rgba(255,255,255,0.03)', fontFamily: sans,
  transition: 'border-color .12s, color .12s, background .12s',
};
const modeToggleOn: React.CSSProperties = { color: '#5af0d3', border: '1px solid rgba(56,232,200,0.5)', background: 'rgba(56,232,200,0.06)' };
const modeGrid: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 };
const modeCard: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: 2, padding: '10px 12px', textAlign: 'left', cursor: 'pointer',
  borderRadius: 10, border: `1px solid ${C.border}`, background: 'rgba(0,0,0,0.25)', color: C.text, fontFamily: sans,
  transition: 'border-color .12s, background .12s, box-shadow .12s',
};
const modeCardOn: React.CSSProperties = {
  border: '1px solid #5af0d3', background: 'rgba(56,232,200,0.1)', boxShadow: '0 0 16px rgba(56,232,200,0.28)',
};
const modeIcon: React.CSSProperties = { fontSize: 18, lineHeight: 1 };
const modeName: React.CSSProperties = { fontWeight: 800, fontSize: 13.5 };
const modeTag: React.CSSProperties = { fontSize: 11, color: C.dim, lineHeight: 1.25 };
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
const topBar: React.CSSProperties = {
  position: 'fixed', top: 16, right: 16, zIndex: 40, display: 'flex', gap: 8, alignItems: 'center',
};
const goldChip: React.CSSProperties = {
  padding: '8px 16px', fontSize: 13.5, fontWeight: 800, color: '#ffe08a', cursor: 'pointer',
  borderRadius: 999, border: '1px solid #6a5620', fontFamily: sans,
  background: 'linear-gradient(180deg, rgba(70,56,16,0.9), rgba(40,32,10,0.9))',
  boxShadow: '0 6px 16px rgba(180,140,30,0.25)',
};
const logout: React.CSSProperties = {
  padding: '8px 14px', fontSize: 13, fontWeight: 700,
  color: C.dim, cursor: 'pointer', borderRadius: 999, border: `1px solid ${C.border}`,
  background: 'rgba(20,24,34,0.8)', fontFamily: sans,
};
