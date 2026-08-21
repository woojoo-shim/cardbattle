import { useEffect, useState } from 'react';
import { createRoom, joinRoomById, quickPlay, listLobby, findRoomByCode, type BattleConnection, type RoomInfo } from '../net/client.js';
import { fetchMe, type Account } from '../net/auth.js';
import { DEFAULT_MODE } from '@cardbattle/shared';
import { Shop } from './Shop.js';
import { Icon } from './art/Icon.js';
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

/** 1대1 대기실. 딱 세 가지 길만 준다 — 방을 만들어 친구를 초대하거나(코드 공유),
 *  친구 코드로 참가하거나, 봇과 바로 연습하거나. 방 이름·공개설정·규칙 같은 건 없앴다. */
export function RoomBrowser({ account, onAccount, onPick, onBack, onLogout }: Props) {
  const { display: name, avatar } = account;
  const [rooms, setRooms] = useState<RoomInfo[]>([]);
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

  const open = rooms.filter((r) => !r.metadata?.started && !r.metadata?.unlisted && headcount(r) < r.maxClients);

  // One button covers both jobs: a public room shows up in the list for a random opponent
  // AND hands you a code you can text a friend. No name, no options — just make it and wait.
  const create = () => { playSfx('select'); onPick(() => createRoom(name, '', avatar, DEFAULT_MODE, false)); };
  const join = (roomId: string) => { playSfx('select'); onPick(() => joinRoomById(roomId, name, avatar)); };
  const quick = () => { playSfx('select'); onPick(() => quickPlay(name, avatar)); };
  const joinByCode = async () => {
    const c = code.trim().toUpperCase();
    if (!c) return;
    playSfx('select');
    setErr('');
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
          <h1 style={heading}>대전 상대 찾기</h1>
          <div style={flourish} aria-hidden>
            <span style={flourishRule} />
            <span style={flourishGem}>◆</span>
            <span style={flourishRule} />
          </div>
          <p style={sub}>{name} · <span style={{ color: C.rare }}>◆ {account.gold} GOLD</span></p>
        </header>

        <section style={panel}>
          <div style={body}>
            {/* Primary path — make a room, share the code, or wait for anyone. */}
            <button className="cb-exec" style={primary} onClick={create}>
              <Icon name="swords" size={19} />&nbsp;방 만들기
            </button>
            <p style={hintLine}>방을 만들면 <b style={{ color: C.rare }}>참가 코드</b>가 나와요. 친구에게 알려주면 바로 대전!</p>

            {/* Join a friend by their code. */}
            <div style={sep}><span style={sepRule} /><span style={sepLabel}>친구 코드로 참가</span><span style={sepRule} /></div>
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

            {/* Live public rooms waiting for an opponent. */}
            <div style={sep}><span style={sepRule} /><span style={sepLabel}>지금 열린 방 {open.length > 0 && <span style={{ color: C.rare }}>{open.length}</span>}</span><span style={sepRule} /></div>
            <div style={listBox}>
              {open.length === 0 && <p style={empty}>기다리는 방이 없어요.<br />위에서 방을 만들면 상대를 기다릴 수 있어요.</p>}
              {open.map((r) => (
                <button key={r.roomId} className="cb-room" style={roomRow} onClick={() => join(r.roomId)}>
                  <span style={rMedallion}><Icon name="swords" size={16} color={C.rare} /></span>
                  <span style={rTitleCol}>
                    <span style={rTitle}>대전 상대 대기 중</span>
                    <span style={rMeta}><span style={rCode}>#{r.metadata?.code}</span></span>
                  </span>
                  <span className="cb-go" style={rGo}>참가&nbsp;<Icon name="arrowRight" size={13} /></span>
                </button>
              ))}
            </div>

            {/* Solo practice against the bot. */}
            <div style={sep}><span style={sepRule} /><span style={sepLabel}>혼자 연습</span><span style={sepRule} /></div>
            <button className="cb-ghost" style={ghost} onClick={quick}><Icon name="bolt" size={15} />&nbsp;봇과 빠른 대전</button>

            {err && <p style={errLine}>{err}</p>}
          </div>
        </section>
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
@keyframes cb-rb-ember {
  0%   { transform: translateY(0) scale(1); opacity: 0; }
  12%  { opacity: 0.9; }
  85%  { opacity: 0.5; }
  100% { transform: translateY(-102vh) scale(0.5); opacity: 0; }
}
`;

// A candlelit waiting-hall glow behind the browser. SHOW layer only.
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
  width: '100%', maxWidth: 540, margin: '0 auto', boxSizing: 'border-box',
  padding: '72px clamp(20px, 5vw, 44px) 56px',
  display: 'flex', flexDirection: 'column', gap: 24,
};
const head: React.CSSProperties = { textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 };
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
const panel: React.CSSProperties = {
  width: '100%', display: 'flex', flexDirection: 'column', borderRadius: 4, overflow: 'hidden',
  background: 'linear-gradient(180deg, rgba(30,38,58,0.82), rgba(16,20,32,0.78))',
  border: `1px solid ${C.border}`, borderTop: '2px solid #a86bff',
  boxShadow: '0 24px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(150,180,230,0.05)',
};
const body: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 8, padding: '22px 22px 24px' };
const hintLine: React.CSSProperties = { margin: '2px 2px 0', fontSize: 13.5, color: C.dim, textAlign: 'center', lineHeight: 1.5, fontFamily: sans };
const listBox: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 8, maxHeight: '38vh', overflowY: 'auto' };
const empty: React.CSSProperties = { color: C.faint, fontSize: 14, fontFamily: sans, textAlign: 'center', margin: '8px 0', lineHeight: 1.8 };
const roomRow: React.CSSProperties = {
  display: 'grid', gridTemplateColumns: 'auto 1fr auto', alignItems: 'center', gap: 14,
  padding: '12px 14px', borderRadius: 4, cursor: 'pointer', textAlign: 'left',
  background: 'rgba(120,140,200,0.02)', border: `1px solid ${C.border}`, color: C.text, fontFamily: sans,
};
const rMedallion: React.CSSProperties = {
  width: 38, height: 38, flexShrink: 0, display: 'grid', placeItems: 'center', borderRadius: '50%',
  background: 'radial-gradient(circle at 50% 35%, rgba(58,72,110,0.9), rgba(16,20,32,0.9))',
  border: '1px solid rgba(120,90,190,0.55)', boxShadow: 'inset 0 1px 0 rgba(200,180,255,0.14)',
};
const rTitleCol: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 2, overflow: 'hidden' };
const rTitle: React.CSSProperties = { fontWeight: 600, fontSize: 15.5, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };
const rMeta: React.CSSProperties = { fontSize: 12.5, color: C.dim, fontFamily: mono, letterSpacing: 0.4 };
const rCode: React.CSSProperties = { fontFamily: mono, fontSize: 12, color: C.rare, letterSpacing: 1 };
const rGo: React.CSSProperties = { fontSize: 14, color: C.rare, fontWeight: 700, letterSpacing: 0.5, display: 'flex', alignItems: 'center' };
const field: React.CSSProperties = {
  padding: '14px 16px', fontSize: 16, color: C.text, outline: 'none', letterSpacing: 0.5,
  background: 'rgba(0,0,0,0.35)', border: `1px solid ${C.border}`, borderRadius: 4, fontFamily: sans,
  transition: 'border-color .12s, background .12s',
};
const codeRow: React.CSSProperties = { display: 'flex', gap: 10 };
const codeField: React.CSSProperties = { flex: 1, fontFamily: mono, letterSpacing: 8, textAlign: 'center', textTransform: 'uppercase' };
const primary: React.CSSProperties = {
  marginTop: 2, padding: '18px 20px', fontSize: 18, fontWeight: 800, color: '#2a1a06', cursor: 'pointer', letterSpacing: 1,
  border: '1px solid #e0b95c', borderRadius: 4, fontFamily: sans,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: 'linear-gradient(180deg, #e6b552, #cf9a2f)',
  boxShadow: '0 8px 20px rgba(207,154,47,0.28), inset 0 1px 0 rgba(255,240,200,0.5)',
};
const ghost: React.CSSProperties = {
  padding: '15px 20px', fontSize: 15, fontWeight: 700, color: C.text, cursor: 'pointer', letterSpacing: 0.5,
  border: `1px solid ${C.border}`, borderRadius: 4, background: 'rgba(224,170,70,0.03)', fontFamily: sans,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};
const sep: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 12, margin: '16px 0 6px',
};
const sepRule: React.CSSProperties = {
  flex: 1, height: 1, background: 'linear-gradient(90deg, transparent, rgba(150,170,220,0.24), transparent)',
};
const sepLabel: React.CSSProperties = {
  fontFamily: sans, fontSize: 13, fontWeight: 700, letterSpacing: 1, color: '#aeb8cc', whiteSpace: 'nowrap',
};
const errLine: React.CSSProperties = { margin: '8px 0 0', color: C.enemy, fontSize: 14, textAlign: 'center', fontFamily: sans };
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
