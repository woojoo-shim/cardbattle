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

/** 1대1 대기실 — 처음부터 다시. 큰 시작 타일 두 개(방 만들기 / 봇과 연습)로 길을 명확히 하고,
 *  아래에 친구 코드 참가와 지금 열린 방 목록을 둔다. 촛불빛 호두나무 테마로 앱 전체와 통일. */
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
        {onBack && <button style={chip} onClick={() => { playSfx('back'); onBack(); }}>← 나가기</button>}
        <button style={goldChip} onClick={() => { playSfx('coin'); setShopOpen(true); }} title="상점 열기">
          <Icon name="coin" size={15} />&nbsp;{account.gold}&nbsp;·&nbsp;상점
        </button>
        {onLogout && <button style={chip} onClick={() => { playSfx('back'); onLogout(); }}>로그아웃</button>}
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
          <p style={sub}>{name}&nbsp;&nbsp;·&nbsp;&nbsp;<span style={{ color: C.rare }}>◆ {account.gold} GOLD</span></p>
        </header>

        {/* 두 갈래의 시작 — 방을 만들어 사람을 기다리거나, 봇과 바로 연습. */}
        <div style={tiles}>
          <button className="cb-tile cb-tile-gold" style={{ ...tile, ...tileGold }} onClick={create}>
            <span style={tileIcon}><Icon name="swords" size={30} color="#2a1a06" /></span>
            <span style={tileTitle}>방 만들기</span>
            <span style={tileSubGold}>참가 코드를 친구에게 공유</span>
          </button>
          <button className="cb-tile" style={tile} onClick={quick}>
            <span style={{ ...tileIcon, ...tileIconDark }}><Icon name="bolt" size={30} color="#e0a53c" /></span>
            <span style={{ ...tileTitle, color: C.text }}>봇과 연습</span>
            <span style={tileSub}>혼자서 즉시 시작</span>
          </button>
        </div>

        {/* 친구 코드로 참가 */}
        <div style={panel}>
          <div style={panelHead}><Icon name="hand" size={15} color="#e0a53c" />&nbsp;친구 코드로 참가</div>
          <div style={codeRow}>
            <input
              className="cb-input"
              style={codeField}
              value={code}
              maxLength={4}
              placeholder="ABCD"
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && joinByCode()}
            />
            <button className="cb-ghost" style={ghost} onClick={joinByCode}>참가</button>
          </div>
          {err && <p style={errLine}>{err}</p>}
        </div>

        {/* 지금 열린 방 */}
        <div style={panel}>
          <div style={panelHead}>
            <Icon name="globe" size={15} color="#e0a53c" />&nbsp;지금 열린 방
            {open.length > 0 && <span style={countPill}>{open.length}</span>}
          </div>
          <div style={listBox}>
            {open.length === 0 && (
              <p style={empty}>기다리는 방이 없어요.<br />위에서 <b style={{ color: C.rare }}>방 만들기</b>로 상대를 기다려 보세요.</p>
            )}
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
        </div>
      </div>

      {shopOpen && <Shop account={account} onAccount={onAccount} onClose={() => setShopOpen(false)} />}
    </div>
  );
}

const hoverCss = `
.cb-input:focus {
  border-color: #e0b95c !important;
  background: rgba(224,170,70,0.06) !important;
}
.cb-input::placeholder { color: rgba(224,170,70,0.3); }
.cb-tile { transition: transform .14s ease, box-shadow .14s ease, border-color .14s ease, filter .14s ease; }
.cb-tile:hover { transform: translateY(-3px); border-color: rgba(224,165,60,0.6) !important; }
.cb-tile:active { transform: translateY(-1px); }
.cb-tile-gold:hover { filter: brightness(1.06); }
.cb-room { transition: border-color .14s, background .14s, transform .14s; }
.cb-room:hover {
  border-color: #e0b95c !important;
  background: rgba(224,170,70,0.07) !important;
  transform: translateX(3px);
}
.cb-go { opacity: 0.5; transition: opacity .14s, transform .14s; }
.cb-room:hover .cb-go { opacity: 1; transform: translateX(3px); }
.cb-ghost { transition: border-color .14s, background .14s, color .14s; }
.cb-ghost:hover {
  border-color: #e0b95c !important; color: #fff !important;
  background: rgba(224,170,70,0.1) !important;
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
      <div style={emberField}>
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
  fontFamily: sans, color: C.text, overflowX: 'hidden', overflowY: 'auto',
  background: 'linear-gradient(180deg, #1a120b 0%, #120b07 55%, #080503 100%)',
};
const atmos: React.CSSProperties = { position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none' };
const atmosGlow: React.CSSProperties = {
  position: 'absolute', inset: 0,
  background:
    'radial-gradient(120% 72% at 50% -8%, rgba(242,184,94,0.16), transparent 55%),' +
    'radial-gradient(90% 60% at 50% 0%, rgba(158,58,40,0.13), transparent 60%),' +
    'radial-gradient(80% 50% at 50% 4%, rgba(74,48,86,0.1), transparent 62%),' +
    'radial-gradient(100% 80% at 50% 112%, rgba(132,44,32,0.16), transparent 60%)',
};
const atmosVignette: React.CSSProperties = {
  position: 'absolute', inset: 0,
  background: 'radial-gradient(115% 100% at 50% 42%, transparent 52%, rgba(0,0,0,0.66) 100%)',
};
const emberField: React.CSSProperties = { position: 'absolute', inset: 0, mixBlendMode: 'screen' };
const inner: React.CSSProperties = {
  position: 'relative', zIndex: 1,
  width: '100%', maxWidth: 'min(560px, 94vw)', margin: '0 auto', boxSizing: 'border-box',
  padding: 'clamp(40px, 8vh, 72px) clamp(20px, 5vw, 44px) clamp(28px, 5vh, 56px)',
  display: 'flex', flexDirection: 'column', gap: 'clamp(12px, 2.4vh, 20px)',
};
const head: React.CSSProperties = { textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'clamp(4px, 0.8vh, 6px)' };
const kicker: React.CSSProperties = {
  fontFamily: mono, fontSize: 'clamp(10px, 1.4vw, 12px)', letterSpacing: 4, textTransform: 'uppercase',
  color: 'rgba(224,165,60,0.72)',
};
const heading: React.CSSProperties = {
  margin: 0, fontFamily: serif, fontSize: 'clamp(28px, 5.4vw, 46px)', fontWeight: 700,
  letterSpacing: 2, color: '#f4e9cb',
  textShadow: '0 2px 0 #14100c, 0 6px 22px rgba(0,0,0,0.6)',
};
const flourish: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, width: 'clamp(200px, 30vw, 340px)', margin: '2px 0' };
const flourishRule: React.CSSProperties = {
  flex: 1, height: 1,
  background: 'linear-gradient(90deg, transparent, rgba(224,165,60,0.5) 30%, rgba(224,165,60,0.5) 70%, transparent)',
};
const flourishGem: React.CSSProperties = { fontSize: 11, color: '#e0a53c', textShadow: '0 0 10px rgba(224,165,60,0.6)' };
const sub: React.CSSProperties = { margin: '4px 0 0', fontSize: 'clamp(12px, 1.7vw, 14.5px)', color: C.dim, fontFamily: mono, letterSpacing: 0.5 };

const tiles: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'clamp(10px, 1.6vw, 14px)' };
const tile: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 'clamp(6px, 1vh, 8px)',
  padding: 'clamp(18px, 3.4vh, 26px) clamp(10px, 2vw, 16px)', borderRadius: 10, cursor: 'pointer', fontFamily: sans, textAlign: 'center',
  background: 'linear-gradient(180deg, rgba(44,33,20,0.9), rgba(24,16,10,0.9))',
  border: '1px solid rgba(120,96,56,0.4)',
  boxShadow: '0 12px 28px rgba(0,0,0,0.42), inset 0 1px 0 rgba(255,238,196,0.08)',
};
const tileGold: React.CSSProperties = {
  background: 'linear-gradient(180deg, #eeba4c 0%, #cf9a2f 100%)',
  border: '1px solid #eccb72',
  boxShadow: '0 14px 30px rgba(207,154,47,0.34), inset 0 1px 0 rgba(255,246,212,0.6)',
};
const tileIcon: React.CSSProperties = {
  width: 'clamp(44px, 7vw, 58px)', height: 'clamp(44px, 7vw, 58px)', borderRadius: '50%', display: 'grid', placeItems: 'center',
  background: 'rgba(42,26,6,0.16)', border: '1px solid rgba(42,26,6,0.22)',
};
const tileIconDark: React.CSSProperties = {
  background: 'radial-gradient(circle at 50% 35%, rgba(90,64,30,0.9), rgba(20,13,7,0.9))',
  border: '1px solid rgba(224,165,60,0.4)',
};
const tileTitle: React.CSSProperties = { fontSize: 'clamp(16px, 2.6vw, 20px)', fontWeight: 900, letterSpacing: 0.5, color: '#2a1a06', lineHeight: 1 };
const tileSubGold: React.CSSProperties = { fontFamily: mono, fontSize: 'clamp(9px, 1.3vw, 11px)', fontWeight: 700, letterSpacing: 0.4, color: 'rgba(42,26,6,0.72)' };
const tileSub: React.CSSProperties = { fontFamily: mono, fontSize: 'clamp(9px, 1.3vw, 11px)', fontWeight: 700, letterSpacing: 0.4, color: C.faint };

const panel: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: 'clamp(7px, 1.2vh, 10px)', padding: 'clamp(12px, 2vh, 16px) clamp(14px, 2.4vw, 18px)', borderRadius: 10,
  background: 'rgba(24,16,10,0.62)', border: '1px solid rgba(120,96,56,0.3)',
  boxShadow: 'inset 0 1px 0 rgba(255,238,196,0.05)',
};
const panelHead: React.CSSProperties = {
  display: 'flex', alignItems: 'center', fontSize: 'clamp(11px, 1.6vw, 13.5px)', fontWeight: 800, letterSpacing: 0.5,
  color: '#e6cf96', fontFamily: sans,
};
const countPill: React.CSSProperties = {
  marginLeft: 8, minWidth: 20, padding: '1px 7px', borderRadius: 999, fontFamily: mono, fontSize: 'clamp(10px, 1.3vw, 11.5px)',
  fontWeight: 800, color: '#2a1a06', background: '#e0a53c', textAlign: 'center',
};
const codeRow: React.CSSProperties = { display: 'flex', gap: 'clamp(7px, 1.4vw, 10px)' };
const codeField: React.CSSProperties = {
  flex: 1, minWidth: 0, padding: 'clamp(10px, 1.8vh, 13px) clamp(12px, 2vw, 16px)', fontSize: 'clamp(15px, 2.4vw, 18px)', color: C.text, outline: 'none',
  fontFamily: mono, letterSpacing: 8, textAlign: 'center', textTransform: 'uppercase',
  background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(120,96,56,0.4)', borderRadius: 8,
  boxSizing: 'border-box', transition: 'border-color .12s, background .12s',
};
const ghost: React.CSSProperties = {
  padding: 'clamp(10px, 1.8vh, 13px) clamp(16px, 3vw, 22px)', fontSize: 'clamp(13px, 1.9vw, 15px)', fontWeight: 800, color: '#e6cf96', cursor: 'pointer', letterSpacing: 0.5,
  border: '1px solid rgba(120,96,56,0.5)', borderRadius: 8, background: 'rgba(224,170,70,0.05)', fontFamily: sans,
  whiteSpace: 'nowrap',
};
const listBox: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 'clamp(6px, 1vh, 8px)', maxHeight: '34vh', overflowY: 'auto' };
const empty: React.CSSProperties = { color: C.faint, fontSize: 'clamp(11px, 1.6vw, 13.5px)', fontFamily: sans, textAlign: 'center', margin: '6px 0', lineHeight: 1.8 };
const roomRow: React.CSSProperties = {
  display: 'grid', gridTemplateColumns: 'auto 1fr auto', alignItems: 'center', gap: 'clamp(10px, 1.8vw, 14px)',
  padding: 'clamp(9px, 1.6vh, 11px) clamp(10px, 1.8vw, 13px)', borderRadius: 8, cursor: 'pointer', textAlign: 'left',
  background: 'rgba(0,0,0,0.22)', border: '1px solid rgba(120,96,56,0.3)', color: C.text, fontFamily: sans,
};
const rMedallion: React.CSSProperties = {
  width: 'clamp(30px, 5vw, 36px)', height: 'clamp(30px, 5vw, 36px)', flexShrink: 0, display: 'grid', placeItems: 'center', borderRadius: '50%',
  background: 'radial-gradient(circle at 50% 35%, rgba(90,64,30,0.9), rgba(20,13,7,0.9))',
  border: '1px solid rgba(224,165,60,0.45)', boxShadow: 'inset 0 1px 0 rgba(255,238,196,0.14)',
};
const rTitleCol: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 2, overflow: 'hidden' };
const rTitle: React.CSSProperties = { fontWeight: 700, fontSize: 'clamp(13px, 1.9vw, 15px)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };
const rMeta: React.CSSProperties = { fontSize: 'clamp(11px, 1.6vw, 12.5px)', color: C.dim, fontFamily: mono, letterSpacing: 0.4 };
const rCode: React.CSSProperties = { fontFamily: mono, fontSize: 'clamp(10px, 1.5vw, 12px)', color: C.rare, letterSpacing: 1 };
const rGo: React.CSSProperties = { fontSize: 'clamp(12px, 1.8vw, 14px)', color: C.rare, fontWeight: 800, letterSpacing: 0.5, display: 'flex', alignItems: 'center' };
const errLine: React.CSSProperties = { margin: '2px 0 0', color: C.enemy, fontSize: 'clamp(11px, 1.6vw, 13.5px)', textAlign: 'center', fontFamily: sans };

const topBar: React.CSSProperties = {
  position: 'fixed', top: 'clamp(10px, 1.6vw, 16px)', right: 'clamp(10px, 1.6vw, 16px)', zIndex: 40, display: 'flex', gap: 8, alignItems: 'center',
};
const goldChip: React.CSSProperties = {
  display: 'flex', alignItems: 'center', padding: 'clamp(6px, 1vw, 8px) clamp(12px, 2vw, 16px)', fontSize: 'clamp(11px, 1.6vw, 13px)', fontWeight: 700,
  color: '#e6cf96', cursor: 'pointer', letterSpacing: 0.5,
  borderRadius: 8, border: '1px solid #5a4820', fontFamily: sans, background: 'rgba(42,33,14,0.85)',
};
const chip: React.CSSProperties = {
  padding: 'clamp(6px, 1vw, 8px) clamp(10px, 1.8vw, 14px)', fontSize: 'clamp(11px, 1.5vw, 12.5px)', fontWeight: 700, letterSpacing: 0.5,
  color: C.dim, cursor: 'pointer', borderRadius: 8, border: '1px solid rgba(120,96,56,0.4)',
  background: 'rgba(20,13,9,0.85)', fontFamily: sans,
};
