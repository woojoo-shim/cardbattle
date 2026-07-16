import { useEffect, useState } from 'react';
import { createRoom, joinRoomById, quickPlay, listLobby, findRoomByCode, type BattleConnection, type RoomInfo } from '../net/client.js';
import { fetchMe, type Account } from '../net/auth.js';
import { MODE_LIST, GAME_MODES, DEFAULT_MODE, type GameModeId } from '@cardbattle/shared';
import { Shop } from './Shop.js';
import { Icon, MODE_ICON } from './art/Icon.js';
import { playSfx } from '../audio/sfx.js';
import { mono } from './theme.js';

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
      <style>{blinkCss}</style>
      <div style={topBar}>
        {onBack && <button style={logout} onClick={() => { playSfx('back'); onBack(); }}>← EXIT</button>}
        <button style={goldChip} onClick={() => { playSfx('coin'); setShopOpen(true); }} title="상점 열기"><Icon name="coin" size={16} />&nbsp;{account.gold}&nbsp;&nbsp;SHOP</button>
        {onLogout && <button style={logout} onClick={() => { playSfx('back'); onLogout(); }}>LOGOUT</button>}
      </div>
      <div style={screen}>
        <span style={scanlines} aria-hidden />
        <span style={curve} aria-hidden />

        <div style={banner}>
          <div style={welcome}>WELCOME, {name.toUpperCase()}</div>
          <div style={bootLines}>
            <div>&gt; User authenticated. Access granted.</div>
            <div>&gt; ABYSSAL ARENA — BACK-ROOM TERMINAL v6</div>
            <div>
              &gt; Balance:&nbsp;<span style={{ color: SEAL }}>&#9670; {account.gold} GOLD</span>
            </div>
            <div style={loadRow}>
              &gt; Establishing uplink&nbsp;
              <span style={loadBar}><span style={loadFill} /></span>
              &nbsp;<span style={caret}>█</span>
            </div>
          </div>
        </div>

        <div style={cols}>
        {/* Left: live room list */}
        <section style={panel} className="cb-panel">
          <div style={winBar}>
            <span>OPEN SESSIONS</span>
            <span style={winMeta}>{open.length} FOUND</span>
          </div>
          <div style={listBox}>
            {open.length === 0 && <p style={empty}>-- no open sessions --<br />&gt; run `new` to host one_</p>}
            {open.map((r) => (
              <button key={r.roomId} style={roomRow} onClick={() => join(r.roomId)}>
                <span style={rTitle}>
                  <span style={rMode} title={GAME_MODES[r.metadata?.mode ?? 'standard']?.name}>
                    <Icon name={MODE_ICON[r.metadata?.mode ?? 'standard']} size={16} color={SEAL} />
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
        <section style={panel} className="cb-panel">
          <div style={winBar}>
            <span>HOST NEW SESSION</span>
            <span style={winStat}><span style={winStatDot} className="cb-blink" aria-hidden />READY</span>
          </div>
          <div style={form}>
            <label style={cap}><span style={capDot}>&#9670;</span>&nbsp;세션 이름 <span style={capHint}>TITLE</span></label>
            <input
              className="cb-input"
              style={field}
              value={title}
              maxLength={24}
              placeholder="세션 이름 입력..."
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && create()}
            />

            <label style={cap}><span style={capDot}>&#9670;</span>&nbsp;공개 설정 <span style={capHint}>VISIBILITY</span></label>
            <div style={visRow}>
              <button style={{ ...visBtn, ...(!isPrivate ? visBtnOn : null) }} onClick={() => { playSfx('toggle'); setIsPrivate(false); }}>
                <Icon name="globe" size={15} />&nbsp;PUBLIC
              </button>
              <button style={{ ...visBtn, ...(isPrivate ? visBtnOn : null) }} onClick={() => { playSfx('toggle'); setIsPrivate(true); }}>
                <Icon name="lock" size={15} />&nbsp;PRIVATE
              </button>
            </div>
            <p style={visHint}>
              {isPrivate ? '# 목록 비표시 · 코드 입력으로만 접속 가능' : '# 로비 목록에 공개 노출됩니다'}
            </p>

            <button style={{ ...modeToggle, ...(showModes ? modeToggleOn : null) }} onClick={toggleModes}>
              <Icon name="sparkle" size={15} />&nbsp;게임 규칙 {showModes ? <>[접기]&nbsp;<Icon name="chevronUp" size={13} /></> : <>[펼치기]&nbsp;<Icon name="chevronDown" size={13} /></>}
            </button>
            {showModes && (
              <div style={modeGrid}>
                {MODE_LIST.map((m) => {
                  const on = m.id === mode;
                  return (
                    <button
                      key={m.id}
                      style={{ ...modeCard, ...(on ? modeCardOn : null) }}
                      onClick={() => { playSfx('select'); setMode(m.id); }}
                      title={m.desc}
                    >
                      <span style={modeIcon}><Icon name={MODE_ICON[m.id]} size={22} color={SEAL} /></span>
                      <span style={modeName}>{on ? '> ' : ''}{m.name}</span>
                      <span style={modeTag}>{m.tagline}</span>
                    </button>
                  );
                })}
              </div>
            )}
            <button className="cb-exec" style={primary} onClick={create}>
              <span style={execArrow}>&#9654;</span>&nbsp;방 생성 &middot; EXECUTE
            </button>

            <div style={sep} className="cb-sep"><span>코드로 참가</span></div>
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
              <button style={ghost} onClick={joinByCode}>CONNECT</button>
            </div>

            <div style={sep} className="cb-sep"><span>연습</span></div>
            <button style={ghost} onClick={quick}><Icon name="bolt" size={15} />&nbsp;봇과 빠른 대전</button>

            {err && <p style={errLine}>! {err}</p>}
          </div>
        </section>
        </div>
      </div>

      {shopOpen && <Shop account={account} onAccount={onAccount} onClose={() => setShopOpen(false)} />}
    </div>
  );
}

const blinkCss = `
@keyframes cb-caret { 0%,49% { opacity: 1; } 50%,100% { opacity: 0; } }
@keyframes cb-load {
  0% { width: 8%; }
  45% { width: 66%; }
  70% { width: 82%; }
  100% { width: 100%; }
}
.cb-input:focus {
  border-color: #9c3b28 !important;
  background: rgba(255,250,232,0.7) !important;
  box-shadow: inset 0 0 0 1px rgba(156,59,40,0.35) !important;
}
.cb-input::placeholder { color: rgba(94,80,54,0.5); }
.cb-exec { position: relative; overflow: hidden; transition: box-shadow .14s, transform .08s; }
.cb-exec:hover { box-shadow: 0 6px 16px rgba(60,20,10,0.28); }
.cb-exec:active { transform: translateY(1px); }
.cb-exec::after {
  content: ''; position: absolute; inset: 0; pointer-events: none;
  background: linear-gradient(115deg, transparent 35%, rgba(255,247,224,0.28) 50%, transparent 65%);
  transform: translateX(-120%); transition: transform .55s ease;
}
.cb-exec:hover::after { transform: translateX(120%); }
.cb-sep::before, .cb-sep::after {
  content: ''; flex: 1; height: 1px;
  background: linear-gradient(90deg, transparent, rgba(90,66,34,0.3), transparent);
}
@keyframes cb-blink { 0%,55% { opacity: 1; } 56%,100% { opacity: 0.15; } }
.cb-blink { animation: cb-blink 1.3s steps(1,end) infinite; }
/* Hard L-shaped ticks pinned to each panel's four corners — printed registry corner marks in
   oxblood ink that make the two columns read as scoped ledger pages rather than plain cards.
   Drawn as eight thin bars from a single overlay pseudo so there's no extra DOM. */
.cb-panel::after {
  content: ''; position: absolute; inset: 5px; pointer-events: none; z-index: 6; opacity: 0.5;
  background:
    linear-gradient(#9c3b28 0 0) 0 0 / 15px 2px no-repeat,
    linear-gradient(#9c3b28 0 0) 0 0 / 2px 15px no-repeat,
    linear-gradient(#9c3b28 0 0) 100% 0 / 15px 2px no-repeat,
    linear-gradient(#9c3b28 0 0) 100% 0 / 2px 15px no-repeat,
    linear-gradient(#9c3b28 0 0) 0 100% / 15px 2px no-repeat,
    linear-gradient(#9c3b28 0 0) 0 100% / 2px 15px no-repeat,
    linear-gradient(#9c3b28 0 0) 100% 100% / 15px 2px no-repeat,
    linear-gradient(#9c3b28 0 0) 100% 100% / 2px 15px no-repeat;
}
`;

// This browser is now a paper ROOM LEDGER, not a glowing CRT — sepia ink on aged parchment.
// AY is the body ink; INK_DIM/INK_FAINT the softer inks; SEAL the oxblood ruling/heading accent.
const AY = '#3a2c18';
const INK_DIM = '#6b5636';
const INK_FAINT = '#94805a';
const SEAL = '#9c3b28';
const PAPER_HI = '#f4e9cb';
const wrap: React.CSSProperties = {
  minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'stretch',
  justifyContent: 'flex-start', fontFamily: mono, color: AY,
  background: 'radial-gradient(78% 60% at 50% 0%, #e6d4ac 0%, #dcc99c 58%, #cdb88a 100%)',
};
// The whole browser lives inside one curved CRT monitor: a heavy plastic bezel, a phosphor-dark
// glass, screen-edge curvature vignette and hard scanlines — so it reads as a terminal screen,
// not a web page. Content sits above the overlays via zIndex.
const screen: React.CSSProperties = {
  position: 'relative', flex: 1, minHeight: '100vh', width: '100%', display: 'flex', flexDirection: 'column', gap: 26,
  padding: '56px clamp(28px, 6vw, 96px) 52px', overflow: 'hidden',
  background: [
    'radial-gradient(120% 85% at 18% 4%, rgba(255,250,232,0.4), transparent 52%)', // sunlit top of the sheet
    'radial-gradient(90% 70% at 84% 96%, rgba(140,104,54,0.16), transparent 60%)', // foxed corner
    'linear-gradient(180deg, #ecdcb4 0%, #e0cd9e 50%, #d3bd8c 100%)',              // parchment body
  ].join(','),
  boxShadow: 'inset 0 0 160px 40px rgba(120,90,50,0.16)', // soft page vignette, no glow
};
// A faint ruled-paper line pattern instead of CRT scanlines.
const scanlines: React.CSSProperties = {
  position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 3,
  background: 'repeating-linear-gradient(0deg, rgba(90,66,34,0.05) 0px, rgba(90,66,34,0.05) 1px, transparent 2px, transparent 28px)',
  mixBlendMode: 'multiply',
};
const curve: React.CSSProperties = {
  position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 4,
  background: 'radial-gradient(128% 118% at 50% 44%, transparent 62%, rgba(96,68,34,0.4) 100%)',
};
// Ledger heading ink — the oxblood ruling used for the registry title/boot readout.
const P = SEAL;
const banner: React.CSSProperties = {
  width: '100%', maxWidth: 1280, margin: '0 auto', fontFamily: mono, color: P, letterSpacing: 0.3, textAlign: 'left',
  position: 'relative', zIndex: 5,
};
const welcome: React.CSSProperties = {
  display: 'inline-block', fontSize: 30, fontWeight: 800, letterSpacing: 5, textTransform: 'uppercase',
  color: P, borderBottom: `2px solid ${P}`, paddingBottom: 8,
};
// The `>`-prefixed readout under the title — left-aligned mono lines in soft ink.
const bootLines: React.CSSProperties = {
  marginTop: 14, fontSize: 15, lineHeight: 1.75, color: INK_DIM, letterSpacing: 1,
};
const loadRow: React.CSSProperties = { display: 'flex', alignItems: 'center', marginTop: 2 };
// Bracketed loading track à la `[****---------]`; the fill sweeps across on a loop.
const loadBar: React.CSSProperties = {
  display: 'inline-block', width: 150, height: 13, verticalAlign: 'middle',
  border: `1px solid ${P}`, borderRadius: 1, background: 'rgba(247,238,214,0.5)', overflow: 'hidden',
};
const loadFill: React.CSSProperties = {
  display: 'block', height: '100%', width: '38%',
  background: `repeating-linear-gradient(90deg, ${P} 0px, ${P} 6px, rgba(156,59,40,0.3) 6px, rgba(156,59,40,0.3) 9px)`,
  animation: 'cb-load 2.4s ease-in-out infinite',
};
const caret: React.CSSProperties = { color: P, animation: 'cb-caret 1.06s steps(1,end) infinite', marginLeft: 1 };
const cols: React.CSSProperties = {
  display: 'flex', gap: 26, width: '100%', maxWidth: 1280, margin: '0 auto',
  alignItems: 'stretch', position: 'relative', zIndex: 5,
};
const panel: React.CSSProperties = {
  position: 'relative',
  flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 14, padding: '0 0 22px', borderRadius: 6, overflow: 'hidden',
  background: 'rgba(247,238,214,0.5)', border: `1px solid rgba(90,66,34,0.34)`,
  boxShadow: 'inset 0 1px 0 rgba(255,250,232,0.5)',
};
const winBar: React.CSSProperties = {
  display: 'flex', alignItems: 'center', padding: '14px 18px', fontFamily: mono, fontSize: 17, fontWeight: 700,
  color: SEAL, textTransform: 'uppercase', letterSpacing: 2.5,
  background: 'rgba(156,59,40,0.08)', borderBottom: `1px dashed rgba(90,66,34,0.4)`,
};
const winMeta: React.CSSProperties = { marginLeft: 'auto', fontFamily: mono, fontSize: 14, color: INK_DIM, letterSpacing: 1 };
// A live "● READY" status pinned to the right of the host panel's title bar.
const winStat: React.CSSProperties = {
  marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 7,
  fontFamily: mono, fontSize: 13, letterSpacing: 2, color: SEAL,
};
const winStatDot: React.CSSProperties = {
  width: 8, height: 8, borderRadius: '50%', background: SEAL,
};
// Padded body for the host form so every field shares one consistent gutter and rhythm.
const form: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 10, padding: '18px 20px 22px' };
// Field caption: a lit ◆ marker, the Korean label, and a dim English tag on the right.
const cap: React.CSSProperties = {
  display: 'flex', alignItems: 'center', fontFamily: mono, fontSize: 14, fontWeight: 700,
  letterSpacing: 0.5, color: AY, marginTop: 4,
};
const capDot: React.CSSProperties = { color: SEAL, fontSize: 11 };
const capHint: React.CSSProperties = { marginLeft: 'auto', fontSize: 11, letterSpacing: 2, color: INK_FAINT, fontWeight: 600 };
const execArrow: React.CSSProperties = { fontSize: 13 };
const listBox: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 8, minHeight: 300, maxHeight: '52vh', overflowY: 'auto', padding: '6px 20px 20px' };
const empty: React.CSSProperties = { color: INK_FAINT, fontSize: 16, fontFamily: mono, textAlign: 'center', margin: 'auto', lineHeight: 1.9 };
const roomRow: React.CSSProperties = {
  display: 'grid', gridTemplateColumns: '1fr auto auto auto', alignItems: 'center', gap: 16,
  padding: '14px 16px', borderRadius: 4, cursor: 'pointer', textAlign: 'left',
  background: 'rgba(247,238,214,0.45)', border: `1px solid rgba(90,66,34,0.34)`, color: AY, fontFamily: mono,
};
const rTitle: React.CSSProperties = { fontWeight: 600, fontSize: 17, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 8, fontFamily: mono };
const rMode: React.CSSProperties = { fontSize: 19, flexShrink: 0 };
const rArrow: React.CSSProperties = { color: AY, marginRight: 2 };
const visRow: React.CSSProperties = { display: 'flex', gap: 10 };
const visBtn: React.CSSProperties = {
  flex: 1, padding: '14px 14px', fontSize: 16, fontWeight: 700, color: INK_DIM, cursor: 'pointer', letterSpacing: 0.5,
  borderRadius: 4, border: `1px solid rgba(90,66,34,0.34)`, background: 'rgba(247,238,214,0.4)', fontFamily: mono,
  transition: 'border-color .12s, background .12s, color .12s',
};
const visBtnOn: React.CSSProperties = {
  color: PAPER_HI, border: `1px solid ${SEAL}`, background: 'linear-gradient(180deg,#b8492f,#8f2f1f)',
};
const visHint: React.CSSProperties = { margin: '-2px 0 2px', color: INK_FAINT, fontSize: 14, lineHeight: 1.35, fontFamily: mono };
const modeToggle: React.CSSProperties = {
  marginTop: 4, padding: '14px 16px', fontSize: 16, fontWeight: 700, color: INK_DIM, cursor: 'pointer', letterSpacing: 0.5,
  borderRadius: 4, border: `1px dashed rgba(90,66,34,0.5)`, background: 'rgba(247,238,214,0.3)', fontFamily: mono,
  transition: 'border-color .12s, color .12s, background .12s',
};
const modeToggleOn: React.CSSProperties = { color: SEAL, border: `1px solid ${SEAL}`, background: 'rgba(156,59,40,0.08)' };
const modeGrid: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 };
const modeCard: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: 3, padding: '13px 15px', textAlign: 'left', cursor: 'pointer',
  borderRadius: 4, border: `1px solid rgba(90,66,34,0.34)`, background: 'rgba(247,238,214,0.4)', color: AY, fontFamily: mono,
  transition: 'border-color .12s, background .12s, box-shadow .12s',
};
const modeCardOn: React.CSSProperties = {
  border: `1px solid ${SEAL}`, background: 'rgba(156,59,40,0.1)', boxShadow: 'inset 0 0 0 1px rgba(156,59,40,0.3)',
};
const modeIcon: React.CSSProperties = { fontSize: 22, lineHeight: 1 };
const modeName: React.CSSProperties = { fontWeight: 700, fontSize: 16, fontFamily: mono };
const modeTag: React.CSSProperties = { fontSize: 13, color: INK_DIM, lineHeight: 1.3, fontFamily: mono };
const rCode: React.CSSProperties = { fontFamily: mono, fontSize: 16, color: SEAL, letterSpacing: 1 };
const rCount: React.CSSProperties = { fontFamily: mono, fontSize: 16, color: INK_DIM };
const rGo: React.CSSProperties = { fontSize: 15, color: SEAL, fontWeight: 700, fontFamily: mono, letterSpacing: 0.5 };
const field: React.CSSProperties = {
  padding: '14px 16px', fontSize: 17, color: AY, outline: 'none', letterSpacing: 0.5,
  background: 'rgba(255,250,232,0.55)', border: `1px solid rgba(90,66,34,0.34)`, borderRadius: 4, fontFamily: mono,
  transition: 'border-color .12s, background .12s, box-shadow .12s',
};
const codeRow: React.CSSProperties = { display: 'flex', gap: 10 };
const codeField: React.CSSProperties = { flex: 1, fontFamily: mono, letterSpacing: 8, textAlign: 'center', textTransform: 'uppercase' };
const primary: React.CSSProperties = {
  marginTop: 6, padding: '17px 20px', fontSize: 18, fontWeight: 800, color: PAPER_HI, cursor: 'pointer', letterSpacing: 1,
  border: 'none', borderRadius: 4, background: 'linear-gradient(100deg, #b8492f, #9c3b28 56%, #7f2f1f)', fontFamily: mono,
  boxShadow: '0 6px 15px rgba(60,20,10,0.32), inset 0 1px 0 rgba(255,250,232,0.28)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};
const ghost: React.CSSProperties = {
  padding: '15px 20px', fontSize: 16, fontWeight: 700, color: AY, cursor: 'pointer', letterSpacing: 0.5,
  border: `1px solid rgba(90,66,34,0.5)`, borderRadius: 4, background: 'rgba(247,238,214,0.4)', fontFamily: mono,
};
const sep: React.CSSProperties = {
  textAlign: 'center', color: INK_FAINT, fontSize: 12, margin: '8px 0 2px', fontFamily: mono,
  letterSpacing: 2.5, textTransform: 'uppercase',
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
};
const errLine: React.CSSProperties = { margin: '2px 0 0', color: SEAL, fontSize: 15, textAlign: 'center', fontFamily: mono };
const topBar: React.CSSProperties = {
  position: 'fixed', top: 16, right: 16, zIndex: 40, display: 'flex', gap: 8, alignItems: 'center',
};
const goldChip: React.CSSProperties = {
  padding: '8px 16px', fontSize: 13, fontWeight: 800, color: PAPER_HI, cursor: 'pointer', letterSpacing: 0.5,
  borderRadius: 4, border: `1px solid ${SEAL}`, fontFamily: mono,
  background: 'linear-gradient(180deg,#b8492f,#8f2f1f)',
  boxShadow: '0 4px 12px rgba(60,20,10,0.28)',
};
const logout: React.CSSProperties = {
  padding: '8px 14px', fontSize: 12.5, fontWeight: 700, letterSpacing: 0.5,
  color: INK_DIM, cursor: 'pointer', borderRadius: 4, border: `1px solid rgba(90,66,34,0.34)`,
  background: 'rgba(247,238,214,0.45)', fontFamily: mono,
};
