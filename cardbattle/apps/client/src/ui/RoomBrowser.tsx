import { useEffect, useState } from 'react';
import { createRoom, joinRoomById, quickPlay, listLobby, findRoomByCode, type BattleConnection, type RoomInfo } from '../net/client.js';
import { fetchMe, type Account } from '../net/auth.js';
import { MODE_LIST, GAME_MODES, DEFAULT_MODE, type GameModeId } from '@cardbattle/shared';
import { Shop } from './Shop.js';
import { Icon, MODE_ICON } from './art/Icon.js';
import { playSfx } from '../audio/sfx.js';
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

/** Custom-game browser: live list of open rooms, host a new room,
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
  const toggleModes = () => { playSfx('toggle'); setShowModes((v) => { if (v) setMode(DEFAULT_MODE); return !v; }); };
  const create = () => { playSfx('select'); onPick(() => createRoom(name, title.trim(), avatar, mode, isPrivate)); };
  const join = (roomId: string) => { playSfx('select'); onPick(() => joinRoomById(roomId, name, avatar)); };
  const quick = () => { playSfx('select'); onPick(() => quickPlay(name, avatar)); };
  const joinByCode = async () => {
    const c = code.trim().toUpperCase();
    if (!c) return;
    playSfx('select');
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
    if (!roomId) { playSfx('back'); setErr(`'${c}' 방을 찾을 수 없습니다.`); return; }
    join(roomId);
  };

  return (
    <div style={wrap}>
      <style>{hoverCss}</style>
      <Atmosphere />
      <div style={topBar}>
        {onBack && <button style={logout} onClick={() => { playSfx('back'); onBack(); }}>← 나가기</button>}
        <button style={goldChip} onClick={() => { playSfx('coin'); setShopOpen(true); }} title="상점 열기"><Icon name="coin" size={16} />&nbsp;{account.gold}&nbsp;&nbsp;상점</button>
        {onLogout && <button style={logout} onClick={() => { playSfx('back'); onLogout(); }}>로그아웃</button>}
      </div>

      <div style={inner}>
        <header style={head}>
          <span style={kicker}>심연의 투기장 · 대기실</span>
          <h1 style={heading}>대전 목록</h1>
          <div style={flourish} aria-hidden>
            <span style={flourishRule} />
            <span style={flourishGem}>◆</span>
            <span style={flourishRule} />
          </div>
          <p style={sub}>{name} · <span style={{ color: C.rare }}>◆ {account.gold} GOLD</span></p>
        </header>

        <div style={cols}>
          {/* Left: live room list */}
          <section style={panel}>
            <div style={winBar}>
              <span>열린 방</span>
              <span style={winMeta}>{open.length}개</span>
            </div>
            <div style={listBox}>
              {open.length === 0 && <p style={empty}>열린 방이 없습니다.<br />오른쪽에서 새 방을 만들어 보세요.</p>}
              {open.map((r) => {
                const filled = headcount(r);
                const cap = r.maxClients;
                const nearFull = filled >= cap - 1;
                return (
                  <button key={r.roomId} className="cb-room" style={roomRow} onClick={() => join(r.roomId)}>
                    <span style={rMedallion} title={GAME_MODES[r.metadata?.mode ?? 'standard']?.name}>
                      <Icon name={MODE_ICON[r.metadata?.mode ?? 'standard']} size={18} color={C.rare} />
                    </span>
                    <span style={rTitleCol}>
                      <span style={rTitleRow}>
                        <span style={rTitle}>{r.metadata?.title || '제목 없음'}</span>
                        {nearFull && <span style={nearFullPill}>마감 임박</span>}
                      </span>
                      <span style={rMeta}><span style={rCode}>#{r.metadata?.code}</span> · {GAME_MODES[r.metadata?.mode ?? 'standard']?.name}</span>
                    </span>
                    <span style={rCountCol}>
                      <span style={seatPips} aria-hidden>
                        {Array.from({ length: cap }, (_, i) => (
                          <span key={i} style={i < filled ? pipOn : pipOff} />
                        ))}
                      </span>
                      <span style={rCount}>{filled}/{cap} <span style={rCountLbl}>좌석</span></span>
                    </span>
                    <span className="cb-go" style={rGo}>참가&nbsp;<Icon name="arrowRight" size={13} /></span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Right: create / code / quick */}
          <section style={panel}>
            <div style={winBar}>
              <span>새 방 만들기</span>
            </div>
            <div style={form}>
              <label style={cap}>세션 이름</label>
              <input
                className="cb-input"
                style={field}
                value={title}
                maxLength={24}
                placeholder="세션 이름 입력..."
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && create()}
              />

              <label style={cap}>공개 설정</label>
              <div style={visRow}>
                <button className="cb-vis" data-on={!isPrivate ? '1' : undefined} style={{ ...visBtn, ...(!isPrivate ? visBtnOn : null) }} onClick={() => { playSfx('toggle'); setIsPrivate(false); }}>
                  <Icon name="globe" size={15} />&nbsp;공개
                </button>
                <button className="cb-vis" data-on={isPrivate ? '1' : undefined} style={{ ...visBtn, ...(isPrivate ? visBtnOn : null) }} onClick={() => { playSfx('toggle'); setIsPrivate(true); }}>
                  <Icon name="lock" size={15} />&nbsp;비공개
                </button>
              </div>
              <p style={visHint}>
                {isPrivate ? '목록에 표시되지 않고 코드로만 접속' : '로비 목록에 공개로 노출됩니다'}
              </p>

              <button className="cb-vis" data-on={showModes ? '1' : undefined} style={{ ...modeToggle, ...(showModes ? visBtnOn : null) }} onClick={toggleModes}>
                <Icon name="sparkle" size={15} />&nbsp;게임 규칙 {showModes ? <><Icon name="chevronUp" size={13} /></> : <><Icon name="chevronDown" size={13} /></>}
              </button>
              {showModes && (
                <div style={modeGrid}>
                  {MODE_LIST.map((m) => {
                    const on = m.id === mode;
                    return (
                      <button
                        key={m.id}
                        className="cb-mode"
                        data-on={on ? '1' : undefined}
                        style={{ ...modeCard, ...(on ? modeCardOn : null) }}
                        onClick={() => { playSfx('select'); setMode(m.id); }}
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
              <button className="cb-exec" style={primary} onClick={create}>방 만들기</button>

              <div style={sep}><span>코드로 참가</span></div>
              <div style={codeRow}>
                <input
                  className="cb-input"
                  style={{ ...field, ...codeField }}
                  value={code}
                  maxLength={4}
                  placeholder="ABCD"
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && joinByCode()}
                />
                <button className="cb-ghost" style={ghost} onClick={joinByCode}>참가</button>
              </div>

              <div style={sep}><span>연습</span></div>
              <button className="cb-ghost" style={ghost} onClick={quick}><Icon name="bolt" size={15} />&nbsp;봇과 빠른 대전</button>

              {err && <p style={errLine}>{err}</p>}
            </div>
          </section>
        </div>
      </div>

      {shopOpen && <Shop account={account} onAccount={onAccount} onClose={() => setShopOpen(false)} />}
    </div>
  );
}

const hoverCss = `
.cb-input:focus {
  border-color: ${C.borderHi} !important;
  background: rgba(224,170,70,0.05) !important;
}
.cb-input::placeholder { color: rgba(224,170,70,0.28); }
.cb-room { transition: border-color .14s, background .14s, transform .14s; }
.cb-room:hover {
  border-color: ${C.borderHi} !important;
  background: rgba(224,170,70,0.06) !important;
  transform: translateX(3px);
}
.cb-go { opacity: 0.5; transition: opacity .14s, transform .14s; }
.cb-room:hover .cb-go { opacity: 1; transform: translateX(3px); }
.cb-exec { transition: filter .14s, transform .08s; }
.cb-exec:hover { filter: brightness(1.08); }
.cb-exec:active { transform: translateY(1px); }
.cb-ghost { transition: border-color .14s, background .14s, color .14s; }
.cb-ghost:hover {
  border-color: ${C.borderHi} !important; color: ${C.text} !important;
  background: rgba(224,170,70,0.07) !important;
}
.cb-vis:hover:not([data-on="1"]), .cb-mode:hover:not([data-on="1"]) {
  border-color: ${C.borderHi} !important; color: ${C.text} !important;
  background: rgba(224,170,70,0.05) !important;
}
@keyframes cb-rb-ember {
  0%   { transform: translateY(0) scale(1); opacity: 0; }
  12%  { opacity: 0.9; }
  85%  { opacity: 0.5; }
  100% { transform: translateY(-102vh) scale(0.5); opacity: 0; }
}
`;

// A candlelit waiting-hall glow behind the browser — warm amber key light pooling from above,
// an oxblood halo, a cool plum wall-wash up top, all closing into a vignette. SHOW layer only.
function Atmosphere() {
  return (
    <div aria-hidden style={atmos}>
      <div style={atmosGlow} />
      <div style={atmosVignette} />
      <div style={emberField} className="cb-rb-embers">
        {EMBERS.map((e, i) => (
          <span
            key={i}
            style={{
              position: 'absolute', left: `${e.x}%`, bottom: '-4%',
              width: e.s, height: e.s, borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(240,200,120,0.9), rgba(224,165,60,0) 70%)',
              animation: `cb-rb-ember ${e.d}s linear ${e.delay}s infinite`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
const EMBERS = [
  { x: 12, s: 3, d: 13, delay: 0 }, { x: 24, s: 2, d: 17, delay: 3 },
  { x: 38, s: 4, d: 11, delay: 6 }, { x: 52, s: 2, d: 15, delay: 1 },
  { x: 66, s: 3, d: 19, delay: 4 }, { x: 78, s: 2, d: 12, delay: 8 },
  { x: 88, s: 3, d: 16, delay: 2 }, { x: 45, s: 2, d: 21, delay: 9 },
];

const serif = "'Times New Roman', Georgia, 'Nanum Myeongjo', serif";
const wrap: React.CSSProperties = {
  position: 'relative', minHeight: '100vh', width: '100%', boxSizing: 'border-box',
  fontFamily: sans, color: C.text, overflow: 'hidden',
  background: 'linear-gradient(180deg, #101422 0%, #0a0d16 60%, #06080f 100%)',
};
const atmos: React.CSSProperties = { position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none' };
const atmosGlow: React.CSSProperties = {
  position: 'absolute', inset: 0,
  background:
    'radial-gradient(120% 70% at 50% -8%, rgba(168,107,255,0.16), transparent 55%),' +
    'radial-gradient(90% 60% at 50% 0%, rgba(55,224,160,0.10), transparent 60%),' +
    'radial-gradient(80% 50% at 50% 4%, rgba(74,48,86,0.12), transparent 62%),' +
    'radial-gradient(100% 80% at 50% 110%, rgba(90,60,190,0.12), transparent 60%)',
};
const atmosVignette: React.CSSProperties = {
  position: 'absolute', inset: 0,
  background: 'radial-gradient(115% 100% at 50% 42%, transparent 52%, rgba(0,0,0,0.62) 100%)',
};
const emberField: React.CSSProperties = { position: 'absolute', inset: 0, mixBlendMode: 'screen' };
const inner: React.CSSProperties = {
  position: 'relative', zIndex: 1,
  width: '100%', maxWidth: 1200, margin: '0 auto', boxSizing: 'border-box',
  padding: '72px clamp(20px, 5vw, 56px) 56px',
  display: 'flex', flexDirection: 'column', gap: 28,
};
const head: React.CSSProperties = { textAlign: 'left', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6 };
const kicker: React.CSSProperties = {
  fontFamily: mono, fontSize: 12, letterSpacing: 4, textTransform: 'uppercase',
  color: 'rgba(224,165,60,0.72)',
};
const heading: React.CSSProperties = {
  margin: 0, fontFamily: serif, fontSize: 'clamp(30px, 5.4vw, 46px)', fontWeight: 700,
  letterSpacing: 2, color: '#eef2fb',
  textShadow: '0 2px 0 #0d1019, 0 6px 22px rgba(0,0,0,0.6)',
};
const flourish: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, width: 'clamp(200px, 30vw, 340px)', margin: '2px 0' };
const flourishRule: React.CSSProperties = {
  flex: 1, height: 1,
  background: 'linear-gradient(90deg, transparent, rgba(224,165,60,0.5) 30%, rgba(224,165,60,0.5) 70%, transparent)',
};
const flourishGem: React.CSSProperties = { fontSize: 11, color: '#e0a53c', textShadow: '0 0 10px rgba(224,165,60,0.6)' };
const sub: React.CSSProperties = { margin: '4px 0 0', fontSize: 15, color: C.dim, fontFamily: mono, letterSpacing: 0.5 };
const cols: React.CSSProperties = { display: 'flex', gap: 22, width: '100%', alignItems: 'flex-start', flexWrap: 'wrap' };
const panel: React.CSSProperties = {
  flex: 1, minWidth: 300, display: 'flex', flexDirection: 'column', borderRadius: 4, overflow: 'hidden',
  background: 'linear-gradient(180deg, rgba(30,38,58,0.82), rgba(16,20,32,0.78))',
  border: `1px solid ${C.border}`, borderTop: '2px solid #a86bff',
  boxShadow: '0 24px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(150,180,230,0.05)',
};
const winBar: React.CSSProperties = {
  display: 'flex', alignItems: 'center', padding: '16px 20px', fontFamily: serif, fontSize: 18, fontWeight: 700,
  color: '#eef2fb', letterSpacing: 1.5, borderBottom: `1px solid ${C.border}`,
  background: 'linear-gradient(180deg, rgba(40,32,64,0.35), transparent)',
};
const winMeta: React.CSSProperties = { marginLeft: 'auto', fontFamily: mono, fontSize: 14, color: C.dim, letterSpacing: 1 };
const form: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 10, padding: '18px 20px 22px' };
const cap: React.CSSProperties = {
  fontFamily: sans, fontSize: 13, fontWeight: 700, letterSpacing: 0.5, color: C.dim, marginTop: 4,
};
const listBox: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 8, minHeight: 280, maxHeight: '56vh', overflowY: 'auto', padding: '14px 18px 18px' };
const empty: React.CSSProperties = { color: C.faint, fontSize: 15, fontFamily: sans, textAlign: 'center', margin: 'auto', lineHeight: 1.9 };
const roomRow: React.CSSProperties = {
  display: 'grid', gridTemplateColumns: 'auto 1fr auto auto', alignItems: 'center', gap: 14,
  padding: '12px 14px', borderRadius: 4, cursor: 'pointer', textAlign: 'left',
  background: 'rgba(120,140,200,0.02)', border: `1px solid ${C.border}`, color: C.text, fontFamily: sans,
};
const rMedallion: React.CSSProperties = {
  width: 38, height: 38, flexShrink: 0, display: 'grid', placeItems: 'center', borderRadius: '50%',
  background: 'radial-gradient(circle at 50% 35%, rgba(58,72,110,0.9), rgba(16,20,32,0.9))',
  border: '1px solid rgba(120,90,190,0.55)', boxShadow: 'inset 0 1px 0 rgba(200,180,255,0.14)',
};
const rTitleCol: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 2, overflow: 'hidden' };
const rTitleRow: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' };
const rTitle: React.CSSProperties = { fontWeight: 600, fontSize: 16, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };
const nearFullPill: React.CSSProperties = {
  flexShrink: 0, fontSize: 10.5, fontWeight: 700, letterSpacing: 0.5, color: '#ffd27a',
  background: 'rgba(224,120,40,0.16)', border: '1px solid rgba(224,140,50,0.42)', borderRadius: 3,
  padding: '2px 7px', fontFamily: sans,
};
const rMeta: React.CSSProperties = { fontSize: 12, color: C.faint, fontFamily: mono, letterSpacing: 0.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };
const rCountCol: React.CSSProperties = { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5 };
const seatPips: React.CSSProperties = { display: 'flex', gap: 3 };
const pipOn: React.CSSProperties = { width: 6, height: 6, borderRadius: '50%', background: C.rare, boxShadow: '0 0 5px rgba(224,165,60,0.55)' };
const pipOff: React.CSSProperties = { width: 6, height: 6, borderRadius: '50%', background: 'rgba(150,170,220,0.14)', border: '1px solid rgba(150,170,220,0.16)', boxSizing: 'border-box' };
const rCountLbl: React.CSSProperties = { fontSize: 11, color: C.faint, letterSpacing: 0.5 };
const visRow: React.CSSProperties = { display: 'flex', gap: 10 };
const visBtn: React.CSSProperties = {
  flex: 1, padding: '13px 14px', fontSize: 15, fontWeight: 700, color: C.dim, cursor: 'pointer', letterSpacing: 0.5,
  borderRadius: 4, border: `1px solid ${C.border}`, background: 'rgba(0,0,0,0.3)', fontFamily: sans,
  transition: 'border-color .12s, background .12s, color .12s',
};
const visBtnOn: React.CSSProperties = {
  color: C.rare, border: `1px solid ${C.borderHi}`, background: 'rgba(216,162,60,0.1)',
};
const visHint: React.CSSProperties = { margin: '-2px 0 2px', color: C.faint, fontSize: 13, lineHeight: 1.35, fontFamily: sans };
const modeToggle: React.CSSProperties = {
  marginTop: 4, padding: '13px 16px', fontSize: 15, fontWeight: 700, color: C.dim, cursor: 'pointer', letterSpacing: 0.5,
  borderRadius: 4, border: `1px solid ${C.border}`, background: 'rgba(0,0,0,0.3)', fontFamily: sans,
  display: 'flex', alignItems: 'center', gap: 4,
  transition: 'border-color .12s, color .12s, background .12s',
};
const modeGrid: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 };
const modeCard: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: 3, padding: '13px 15px', textAlign: 'left', cursor: 'pointer',
  borderRadius: 4, border: `1px solid ${C.border}`, background: 'rgba(0,0,0,0.3)', color: C.text, fontFamily: sans,
  transition: 'border-color .12s, background .12s',
};
const modeCardOn: React.CSSProperties = {
  border: `1px solid ${C.borderHi}`, background: 'rgba(224,170,70,0.08)',
};
const modeIcon: React.CSSProperties = { fontSize: 22, lineHeight: 1 };
const modeName: React.CSSProperties = { fontWeight: 700, fontSize: 15 };
const modeTag: React.CSSProperties = { fontSize: 12.5, color: C.dim, lineHeight: 1.3 };
const rCode: React.CSSProperties = { fontFamily: mono, fontSize: 12, color: C.rare, letterSpacing: 1 };
const rCount: React.CSSProperties = { fontFamily: mono, fontSize: 15, color: C.dim };
const rGo: React.CSSProperties = { fontSize: 14, color: C.rare, fontWeight: 700, letterSpacing: 0.5, display: 'flex', alignItems: 'center' };
const field: React.CSSProperties = {
  padding: '14px 16px', fontSize: 16, color: C.text, outline: 'none', letterSpacing: 0.5,
  background: 'rgba(0,0,0,0.35)', border: `1px solid ${C.border}`, borderRadius: 4, fontFamily: sans,
  transition: 'border-color .12s, background .12s',
};
const codeRow: React.CSSProperties = { display: 'flex', gap: 10 };
const codeField: React.CSSProperties = { flex: 1, fontFamily: mono, letterSpacing: 8, textAlign: 'center', textTransform: 'uppercase' };
const primary: React.CSSProperties = {
  marginTop: 6, padding: '16px 20px', fontSize: 17, fontWeight: 700, color: '#2a1a06', cursor: 'pointer', letterSpacing: 1,
  border: '1px solid #b98a2c', borderRadius: 4, background: '#cf9a2f', fontFamily: sans,
};
const ghost: React.CSSProperties = {
  padding: '15px 20px', fontSize: 15, fontWeight: 700, color: C.text, cursor: 'pointer', letterSpacing: 0.5,
  border: `1px solid ${C.border}`, borderRadius: 4, background: 'rgba(224,170,70,0.03)', fontFamily: sans,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};
const sep: React.CSSProperties = {
  textAlign: 'center', color: C.faint, fontSize: 12, margin: '10px 0 2px', fontFamily: sans,
  letterSpacing: 2, textTransform: 'uppercase',
};
const errLine: React.CSSProperties = { margin: '2px 0 0', color: C.enemy, fontSize: 14, textAlign: 'center', fontFamily: sans };
const topBar: React.CSSProperties = {
  position: 'fixed', top: 16, right: 16, zIndex: 40, display: 'flex', gap: 8, alignItems: 'center',
};
const goldChip: React.CSSProperties = {
  padding: '8px 16px', fontSize: 13, fontWeight: 700, color: '#e6cf96', cursor: 'pointer', letterSpacing: 0.5,
  borderRadius: 4, border: '1px solid #5a4820', fontFamily: sans,
  background: 'rgba(42,33,14,0.85)',
};
const logout: React.CSSProperties = {
  padding: '8px 14px', fontSize: 12.5, fontWeight: 700, letterSpacing: 0.5,
  color: C.dim, cursor: 'pointer', borderRadius: 4, border: `1px solid ${C.border}`,
  background: 'rgba(10,12,9,0.85)', fontFamily: sans,
};
