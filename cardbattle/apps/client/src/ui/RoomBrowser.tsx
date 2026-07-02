import { useEffect, useState } from 'react';
import { createRoom, joinRoomById, quickPlay, listLobby, findRoomByCode, type BattleConnection, type RoomInfo } from '../net/client.js';
import { fetchMe, type Account } from '../net/auth.js';
import { MODE_LIST, GAME_MODES, DEFAULT_MODE, type GameModeId } from '@cardbattle/shared';
import { Shop } from './Shop.js';
import { BrandMark } from './BrandMark.js';
import { Icon, MODE_ICON } from './art/Icon.js';
import { C, mono } from './theme.js';

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
  const joinByCode = async () => {
    const c = code.trim().toUpperCase();
    if (!c) return;
    setErr('');
    // Ask the server for the room right now — works for private rooms and survives a stale
    // or disconnected lobby list (which is why the old local-list lookup could miss it).
    let roomId: string | null;
    try {
      roomId = await findRoomByCode(c);
    } catch {
      setErr('서버에 연결하지 못했습니다. 잠시 후 다시 시도하세요.');
      return;
    }
    if (!roomId) { setErr(`'${c}' 방을 찾을 수 없습니다.`); return; }
    join(roomId);
  };

  return (
    <div style={wrap}>
      <style>{blinkCss}</style>
      <div style={topBar}>
        {onBack && <button style={logout} onClick={onBack}>← EXIT</button>}
        <button style={goldChip} onClick={() => setShopOpen(true)} title="상점 열기"><Icon name="coin" size={16} />&nbsp;{account.gold}&nbsp;&nbsp;SHOP</button>
        {onLogout && <button style={logout} onClick={onLogout}>LOGOUT</button>}
      </div>
      <BrandMark size={72} />
      <p style={who}><span style={promptMark}>guest@arena</span>:~$ login <b style={{ color: C.you }}>{name}</b> <span style={caret}>█</span></p>

      <div style={cols}>
        {/* Left: live room list */}
        <section style={panel}>
          <div style={winBar}>
            <span style={winDots}><i style={{ ...dot, background: C.enemy }} /><i style={{ ...dot, background: C.rare }} /><i style={{ ...dot, background: C.you }} /></span>
            <span style={winTitle}>rooms.list</span>
            <span style={winMeta}>{open.length} OPEN</span>
          </div>
          <div style={hd}>&gt; ls --open-rooms</div>
          <div style={listBox}>
            {open.length === 0 && <p style={empty}>-- no open sessions --<br />&gt; run `new` to host one_</p>}
            {open.map((r) => (
              <button key={r.roomId} style={roomRow} onClick={() => join(r.roomId)}>
                <span style={rTitle}>
                  <span style={rMode} title={GAME_MODES[r.metadata?.mode ?? 'standard']?.name}>
                    <Icon name={MODE_ICON[r.metadata?.mode ?? 'standard']} size={16} color={C.rare} />
                  </span>
                  <span style={rArrow}>&gt;</span>{r.metadata?.title || 'untitled'}
                </span>
                <span style={rCode}>#{r.metadata?.code}</span>
                <span style={rCount}>[{headcount(r)}/{r.maxClients}]</span>
                <span style={rGo}>JOIN&nbsp;<Icon name="arrowRight" size={13} /></span>
              </button>
            ))}
          </div>
        </section>

        {/* Right: create / code / quick */}
        <section style={panel}>
          <div style={winBar}>
            <span style={winDots}><i style={{ ...dot, background: C.enemy }} /><i style={{ ...dot, background: C.rare }} /><i style={{ ...dot, background: C.you }} /></span>
            <span style={winTitle}>host.sh</span>
            <span style={winMeta}>NEW</span>
          </div>
          <div style={hd}>&gt; new --title</div>
          <input
            style={field}
            value={title}
            maxLength={24}
            placeholder="세션 이름 입력..."
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && create()}
          />
          <div style={hd}>&gt; set --visibility</div>
          <div style={visRow}>
            <button style={{ ...visBtn, ...(!isPrivate ? visBtnOn : null) }} onClick={() => setIsPrivate(false)}>
              <Icon name="globe" size={15} />&nbsp;PUBLIC
            </button>
            <button style={{ ...visBtn, ...(isPrivate ? visBtnOn : null) }} onClick={() => setIsPrivate(true)}>
              <Icon name="lock" size={15} />&nbsp;PRIVATE
            </button>
          </div>
          <p style={visHint}>
            {isPrivate ? '# 목록 비표시 · 코드 입력으로만 접속 가능' : '# 로비 목록에 공개 노출됩니다'}
          </p>

          <button style={{ ...modeToggle, ...(showModes ? modeToggleOn : null) }} onClick={toggleModes}>
            <Icon name="sparkle" size={15} />&nbsp;--mode {showModes ? <>[collapse]&nbsp;<Icon name="chevronUp" size={13} /></> : <>[expand]&nbsp;<Icon name="chevronDown" size={13} /></>}
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
                    <span style={modeName}>{on ? '> ' : ''}{m.name}</span>
                    <span style={modeTag}>{m.tagline}</span>
                  </button>
                );
              })}
            </div>
          )}
          <button style={primary} onClick={create}>[ ▶ EXECUTE — 방 생성 ]</button>

          <div style={sep}><span>── join --code ──</span></div>
          <div style={codeRow}>
            <input
              style={{ ...field, ...codeField }}
              value={code}
              maxLength={4}
              placeholder="ABCD"
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && joinByCode()}
            />
            <button style={ghost} onClick={joinByCode}>CONNECT</button>
          </div>

          <div style={sep}><span>── practice ──</span></div>
          <button style={ghost} onClick={quick}><Icon name="bolt" size={15} />&nbsp;./quickplay --vs-bots</button>

          {err && <p style={errLine}>! {err}</p>}
        </section>
      </div>

      {shopOpen && <Shop account={account} onAccount={onAccount} onClose={() => setShopOpen(false)} />}
    </div>
  );
}

const blinkCss = '@keyframes cb-caret { 0%,49% { opacity: 1; } 50%,100% { opacity: 0; } }';

const wrap: React.CSSProperties = {
  minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center',
  justifyContent: 'center', gap: 10, fontFamily: mono, color: C.text,
  background:
    'radial-gradient(70% 50% at 50% 8%, rgba(166,197,63,0.05), transparent 60%),' +
    'linear-gradient(180deg, #060806 0%, #040503 52%, #030403 100%), #030403',
};
const who: React.CSSProperties = { margin: '10px 0 14px', color: C.dim, fontSize: 13, fontFamily: mono, letterSpacing: 0.5 };
const promptMark: React.CSSProperties = { color: C.magic };
const caret: React.CSSProperties = { color: C.you, animation: 'cb-caret 1.06s steps(1,end) infinite', marginLeft: 1 };
const cols: React.CSSProperties = { display: 'flex', gap: 20, width: 'min(820px, 94vw)', alignItems: 'stretch' };
const panel: React.CSSProperties = {
  flex: 1, display: 'flex', flexDirection: 'column', gap: 10, padding: 0, borderRadius: 6, overflow: 'hidden',
  background: 'linear-gradient(180deg, #0a0c09, #070805)', border: `1px solid ${C.border}`,
  boxShadow: '0 22px 50px rgba(0,0,0,0.6), inset 0 0 60px rgba(166,197,63,0.03)',
};
const winBar: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
  background: 'linear-gradient(180deg, #141712, #0c0e0a)', borderBottom: `1px solid ${C.border}`,
};
const winDots: React.CSSProperties = { display: 'flex', gap: 5 };
const dot: React.CSSProperties = { width: 9, height: 9, borderRadius: '50%', display: 'block', opacity: 0.8 };
const winTitle: React.CSSProperties = { fontFamily: mono, fontSize: 12.5, color: C.dim, letterSpacing: 1, flex: 1 };
const winMeta: React.CSSProperties = { fontFamily: mono, fontSize: 11, color: C.you, letterSpacing: 1 };
const hd: React.CSSProperties = { margin: '2px 16px 0', fontFamily: mono, fontSize: 13, fontWeight: 700, letterSpacing: 0.5, color: C.you };
const listBox: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6, minHeight: 220, maxHeight: 340, overflowY: 'auto', padding: '4px 16px 16px' };
const empty: React.CSSProperties = { color: C.faint, fontSize: 13, fontFamily: mono, textAlign: 'center', margin: 'auto', lineHeight: 1.8 };
const roomRow: React.CSSProperties = {
  display: 'grid', gridTemplateColumns: '1fr auto auto auto', alignItems: 'center', gap: 12,
  padding: '10px 12px', borderRadius: 4, cursor: 'pointer', textAlign: 'left',
  background: 'rgba(166,197,63,0.03)', border: `1px solid ${C.border}`, color: C.text, fontFamily: mono,
};
const rTitle: React.CSSProperties = { fontWeight: 600, fontSize: 13.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6, fontFamily: mono };
const rMode: React.CSSProperties = { fontSize: 15, flexShrink: 0 };
const rArrow: React.CSSProperties = { color: C.you, marginRight: 2 };
const visRow: React.CSSProperties = { display: 'flex', gap: 8, margin: '0 16px' };
const visBtn: React.CSSProperties = {
  flex: 1, padding: '10px 12px', fontSize: 13, fontWeight: 700, color: C.dim, cursor: 'pointer', letterSpacing: 0.5,
  borderRadius: 4, border: `1px solid ${C.border}`, background: 'rgba(0,0,0,0.35)', fontFamily: mono,
  transition: 'border-color .12s, background .12s, color .12s',
};
const visBtnOn: React.CSSProperties = {
  color: C.rare, border: '1px solid #d8a23c', background: 'rgba(216,162,60,0.12)', boxShadow: '0 0 14px rgba(216,162,60,0.22)',
};
const visHint: React.CSSProperties = { margin: '-2px 16px 2px', color: C.faint, fontSize: 12, lineHeight: 1.3, fontFamily: mono };
const modeToggle: React.CSSProperties = {
  margin: '0 16px', padding: '10px 14px', fontSize: 13, fontWeight: 700, color: C.dim, cursor: 'pointer', letterSpacing: 0.5,
  borderRadius: 4, border: `1px dashed ${C.borderHi}`, background: 'rgba(166,197,63,0.02)', fontFamily: mono,
  transition: 'border-color .12s, color .12s, background .12s',
};
const modeToggleOn: React.CSSProperties = { color: C.you, border: `1px solid rgba(166,197,63,0.5)`, background: 'rgba(166,197,63,0.06)' };
const modeGrid: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, margin: '0 16px' };
const modeCard: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: 2, padding: '10px 12px', textAlign: 'left', cursor: 'pointer',
  borderRadius: 4, border: `1px solid ${C.border}`, background: 'rgba(0,0,0,0.35)', color: C.text, fontFamily: mono,
  transition: 'border-color .12s, background .12s, box-shadow .12s',
};
const modeCardOn: React.CSSProperties = {
  border: '1px solid #c3e04d', background: 'rgba(166,197,63,0.1)', boxShadow: '0 0 16px rgba(166,197,63,0.24)',
};
const modeIcon: React.CSSProperties = { fontSize: 18, lineHeight: 1 };
const modeName: React.CSSProperties = { fontWeight: 700, fontSize: 13, fontFamily: mono };
const modeTag: React.CSSProperties = { fontSize: 11, color: C.dim, lineHeight: 1.25, fontFamily: mono };
const rCode: React.CSSProperties = { fontFamily: mono, fontSize: 13, color: C.rare, letterSpacing: 1 };
const rCount: React.CSSProperties = { fontFamily: mono, fontSize: 13, color: C.dim };
const rGo: React.CSSProperties = { fontSize: 12, color: C.you, fontWeight: 700, fontFamily: mono, letterSpacing: 0.5 };
const field: React.CSSProperties = {
  margin: '0 16px', padding: '11px 14px', fontSize: 14, color: C.you, outline: 'none', letterSpacing: 0.5,
  background: 'rgba(0,0,0,0.4)', border: `1px solid ${C.border}`, borderRadius: 4, fontFamily: mono,
};
const codeRow: React.CSSProperties = { display: 'flex', gap: 8, margin: '0 16px' };
const codeField: React.CSSProperties = { flex: 1, margin: 0, fontFamily: mono, letterSpacing: 6, textAlign: 'center', textTransform: 'uppercase' };
const primary: React.CSSProperties = {
  margin: '2px 16px', padding: '13px 18px', fontSize: 15, fontWeight: 800, color: '#0a0d04', cursor: 'pointer', letterSpacing: 0.5,
  border: 'none', borderRadius: 4, background: 'linear-gradient(180deg,#c3e04d,#8fa832)', fontFamily: mono,
  boxShadow: '0 0 22px rgba(166,197,63,0.3)',
};
const ghost: React.CSSProperties = {
  margin: '0 16px', padding: '12px 18px', fontSize: 14, fontWeight: 700, color: C.you, cursor: 'pointer', letterSpacing: 0.5,
  border: `1px solid ${C.borderHi}`, borderRadius: 4, background: 'rgba(166,197,63,0.04)', fontFamily: mono,
};
const sep: React.CSSProperties = {
  textAlign: 'center', color: C.faint, fontSize: 12, margin: '4px 16px', fontFamily: mono,
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
};
const errLine: React.CSSProperties = { margin: '0 16px 14px', color: C.enemy, fontSize: 13, textAlign: 'center', fontFamily: mono };
const topBar: React.CSSProperties = {
  position: 'fixed', top: 16, right: 16, zIndex: 40, display: 'flex', gap: 8, alignItems: 'center',
};
const goldChip: React.CSSProperties = {
  padding: '8px 16px', fontSize: 13, fontWeight: 800, color: '#ffe08a', cursor: 'pointer', letterSpacing: 0.5,
  borderRadius: 4, border: '1px solid #6a5620', fontFamily: mono,
  background: 'linear-gradient(180deg, rgba(70,56,16,0.9), rgba(40,32,10,0.9))',
  boxShadow: '0 6px 16px rgba(180,140,30,0.2)',
};
const logout: React.CSSProperties = {
  padding: '8px 14px', fontSize: 12.5, fontWeight: 700, letterSpacing: 0.5,
  color: C.dim, cursor: 'pointer', borderRadius: 4, border: `1px solid ${C.border}`,
  background: 'rgba(10,12,9,0.85)', fontFamily: mono,
};
