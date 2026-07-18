import { useEffect, useState } from 'react';
import { createRoom, joinRoomById, quickPlay, listLobby, findRoomByCode, type BattleConnection, type RoomInfo } from '../net/client.js';
import { fetchMe, type Account } from '../net/auth.js';
import { MODE_LIST, GAME_MODES, DEFAULT_MODE, type GameModeId } from '@cardbattle/shared';
import { Shop } from './Shop.js';
import { Icon, MODE_ICON } from './art/Icon.js';
import { playSfx } from '../audio/sfx.js';
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
              &gt; Balance:&nbsp;<span style={{ color: C.rare }}>&#9670; {account.gold} GOLD</span>
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
              <button key={r.roomId} className="cb-room" style={roomRow} onClick={() => join(r.roomId)}>
                <span style={rTitle}>
                  <span style={rMode} title={GAME_MODES[r.metadata?.mode ?? 'standard']?.name}>
                    <Icon name={MODE_ICON[r.metadata?.mode ?? 'standard']} size={16} color={C.rare} />
                  </span>
                  <span style={rArrow}>&gt;</span>{r.metadata?.title || 'untitled'}
                </span>
                <span style={rCode}>#{r.metadata?.code}</span>
                <span style={rCount}>[{headcount(r)}/{r.maxClients}]</span>
                <span className="cb-go" style={rGo}>JOIN&nbsp;<Icon name="arrowRight" size={13} /></span>
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
              <button className="cb-vis" data-on={!isPrivate ? '1' : undefined} style={{ ...visBtn, ...(!isPrivate ? visBtnOn : null) }} onClick={() => { playSfx('toggle'); setIsPrivate(false); }}>
                <Icon name="globe" size={15} />&nbsp;PUBLIC
              </button>
              <button className="cb-vis" data-on={isPrivate ? '1' : undefined} style={{ ...visBtn, ...(isPrivate ? visBtnOn : null) }} onClick={() => { playSfx('toggle'); setIsPrivate(true); }}>
                <Icon name="lock" size={15} />&nbsp;PRIVATE
              </button>
            </div>
            <p style={visHint}>
              {isPrivate ? '# 목록 비표시 · 코드 입력으로만 접속 가능' : '# 로비 목록에 공개 노출됩니다'}
            </p>

            <button className="cb-modetoggle" data-on={showModes ? '1' : undefined} style={{ ...modeToggle, ...(showModes ? modeToggleOn : null) }} onClick={toggleModes}>
              <Icon name="sparkle" size={15} />&nbsp;게임 규칙 {showModes ? <>[접기]&nbsp;<Icon name="chevronUp" size={13} /></> : <>[펼치기]&nbsp;<Icon name="chevronDown" size={13} /></>}
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
              <button className="cb-ghost" style={ghost} onClick={joinByCode}>CONNECT</button>
            </div>

            <div style={sep} className="cb-sep"><span>연습</span></div>
            <button className="cb-ghost" style={ghost} onClick={quick}><Icon name="bolt" size={15} />&nbsp;봇과 빠른 대전</button>

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
  border-color: #e0aa46 !important;
  background: rgba(224,170,70,0.06) !important;
  box-shadow: inset 0 0 0 1px rgba(224,170,70,0.4), 0 0 18px rgba(224,170,70,0.22) !important;
}
.cb-input::placeholder { color: rgba(224,170,70,0.28); }
.cb-exec { position: relative; overflow: hidden; transition: box-shadow .14s, transform .08s; }
.cb-exec:hover { box-shadow: 0 0 30px rgba(224,170,70,0.5); }
.cb-exec:active { transform: translateY(1px); }
.cb-exec::after {
  content: ''; position: absolute; inset: 0; pointer-events: none;
  background: linear-gradient(115deg, transparent 35%, rgba(255,255,255,0.35) 50%, transparent 65%);
  transform: translateX(-120%); transition: transform .55s ease;
}
.cb-exec:hover::after { transform: translateX(120%); }
.cb-sep::before, .cb-sep::after {
  content: ''; flex: 1; height: 1px;
  background: linear-gradient(90deg, transparent, rgba(224,170,70,0.24), transparent);
}
@keyframes cb-blink { 0%,55% { opacity: 1; } 56%,100% { opacity: 0.15; } }
.cb-blink { animation: cb-blink 1.3s steps(1,end) infinite; }
/* Live hover reactions — the terminal was dead-static (no element responded to the cursor).
   Room rows slide out with a lit left-edge tick + the JOIN arrow springs forward; ghost/vis/mode
   controls warm to amber. data-on guards keep an already-selected control from being re-styled. */
.cb-room { transition: border-color .14s, background .14s, box-shadow .14s, transform .14s; }
.cb-room:hover {
  border-color: #e0aa46 !important;
  background: rgba(224,170,70,0.09) !important;
  box-shadow: inset 3px 0 0 #ffb43a, inset 0 0 26px rgba(224,170,70,0.1), 0 0 18px rgba(224,170,70,0.16) !important;
  transform: translateX(5px);
}
.cb-go { opacity: 0.5; transition: opacity .14s, transform .14s; }
.cb-room:hover .cb-go { opacity: 1; transform: translateX(4px); text-shadow: 0 0 10px rgba(255,178,54,0.6); }
.cb-ghost { transition: border-color .14s, background .14s, color .14s, box-shadow .14s; }
.cb-ghost:hover {
  border-color: #e0aa46 !important; color: #ffce7a !important;
  background: rgba(224,170,70,0.1) !important; box-shadow: 0 0 16px rgba(224,170,70,0.2) !important;
}
.cb-vis:hover:not([data-on="1"]), .cb-mode:hover:not([data-on="1"]), .cb-modetoggle:hover:not([data-on="1"]) {
  border-color: rgba(224,170,70,0.55) !important; color: #ffce7a !important;
  background: rgba(224,170,70,0.06) !important;
}
.cb-mode:hover:not([data-on="1"]) { box-shadow: 0 0 14px rgba(224,170,70,0.14) !important; }
/* Hard L-shaped ticks pinned to each panel's four corners — the HUD frame that makes the two
   columns read as scoped terminal windows rather than plain cards. Drawn as eight thin bars from
   a single overlay pseudo so there's no extra DOM. */
.cb-panel::after {
  content: ''; position: absolute; inset: 5px; pointer-events: none; z-index: 6; opacity: 0.6;
  background:
    linear-gradient(#ffb43a 0 0) 0 0 / 15px 2px no-repeat,
    linear-gradient(#ffb43a 0 0) 0 0 / 2px 15px no-repeat,
    linear-gradient(#ffb43a 0 0) 100% 0 / 15px 2px no-repeat,
    linear-gradient(#ffb43a 0 0) 100% 0 / 2px 15px no-repeat,
    linear-gradient(#ffb43a 0 0) 0 100% / 15px 2px no-repeat,
    linear-gradient(#ffb43a 0 0) 0 100% / 2px 15px no-repeat,
    linear-gradient(#ffb43a 0 0) 100% 100% / 15px 2px no-repeat,
    linear-gradient(#ffb43a 0 0) 100% 100% / 2px 15px no-repeat;
  filter: drop-shadow(0 0 4px rgba(255,178,54,0.5));
}
`;

// Amber phosphor text tone — replaces the theme's sickly-green AY throughout this terminal so
// the whole browser reads as a warm amber CRT, cohering with the oxblood/brass world.
const AY = '#f0d18a';
const wrap: React.CSSProperties = {
  minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'stretch',
  justifyContent: 'flex-start', fontFamily: mono, color: AY,
  background: 'radial-gradient(78% 60% at 50% 0%, #130b0e 0%, #070406 58%, #030203 100%)',
};
// The whole browser lives inside one curved CRT monitor: a heavy plastic bezel, a phosphor-dark
// glass, screen-edge curvature vignette and hard scanlines — so it reads as a terminal screen,
// not a web page. Content sits above the overlays via zIndex.
const screen: React.CSSProperties = {
  position: 'relative', flex: 1, minHeight: '100vh', width: '100%', display: 'flex', flexDirection: 'column', gap: 26,
  padding: '56px clamp(28px, 6vw, 96px) 52px', overflow: 'hidden',
  background: 'radial-gradient(130% 108% at 50% 0%, #2e1c0a 0%, #1c1006 48%, #0a0603 100%)',
  boxShadow:
    'inset 0 0 200px 40px rgba(0,0,0,0.82), inset 0 0 120px rgba(255,178,54,0.14),' + // glass depth + hot phosphor haze
    'inset 0 0 90px rgba(255,178,54,0.3)',                                             // amber bloom
};
const scanlines: React.CSSProperties = {
  position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 3,
  background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.34) 0px, rgba(0,0,0,0.34) 1px, transparent 2px, transparent 4px)',
  mixBlendMode: 'multiply',
};
const curve: React.CSSProperties = {
  position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 4,
  background: 'radial-gradient(128% 118% at 50% 44%, transparent 60%, rgba(8,4,1,0.8) 100%)',
  boxShadow: 'inset 0 0 140px 44px rgba(8,4,1,0.86)',
};
// Fallout-terminal phosphor: a brighter, hotter amber than the body text for the boot readout.
const P = '#ffb43a';
const banner: React.CSSProperties = {
  width: '100%', maxWidth: 1280, margin: '0 auto', fontFamily: mono, color: P, letterSpacing: 0.3, textAlign: 'left',
  position: 'relative', zIndex: 5,
};
const welcome: React.CSSProperties = {
  display: 'inline-block', fontSize: 30, fontWeight: 800, letterSpacing: 5, textTransform: 'uppercase',
  color: P, borderBottom: `2px solid ${P}`, paddingBottom: 8,
  textShadow: `0 0 16px ${P}, 0 0 6px ${P}`,
};
// The `>`-prefixed boot log under the title — left-aligned mono lines, hot phosphor green with a glow.
const bootLines: React.CSSProperties = {
  marginTop: 14, fontSize: 15, lineHeight: 1.75, color: P, letterSpacing: 1,
  textShadow: `0 0 8px rgba(255,178,54,0.5)`,
};
const loadRow: React.CSSProperties = { display: 'flex', alignItems: 'center', marginTop: 2 };
// Bracketed loading track à la `[****---------]`; the fill sweeps across on a loop.
const loadBar: React.CSSProperties = {
  display: 'inline-block', width: 150, height: 13, verticalAlign: 'middle',
  border: `1px solid ${P}`, borderRadius: 1, background: 'rgba(0,0,0,0.5)',
  boxShadow: `inset 0 0 8px rgba(255,178,54,0.25), 0 0 8px rgba(255,178,54,0.3)`, overflow: 'hidden',
};
const loadFill: React.CSSProperties = {
  display: 'block', height: '100%', width: '38%',
  background: `repeating-linear-gradient(90deg, ${P} 0px, ${P} 6px, rgba(255,178,54,0.35) 6px, rgba(255,178,54,0.35) 9px)`,
  boxShadow: `0 0 10px ${P}`, animation: 'cb-load 2.4s ease-in-out infinite',
};
const caret: React.CSSProperties = { color: P, animation: 'cb-caret 1.06s steps(1,end) infinite', marginLeft: 1 };
const cols: React.CSSProperties = {
  display: 'flex', gap: 26, width: '100%', maxWidth: 1280, margin: '0 auto',
  alignItems: 'stretch', position: 'relative', zIndex: 5,
};
const panel: React.CSSProperties = {
  position: 'relative',
  flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 14, padding: '0 0 22px', borderRadius: 6, overflow: 'hidden',
  background: 'rgba(9,5,2,0.55)', border: `1px solid rgba(224,170,70,0.16)`,
  boxShadow: 'inset 0 0 60px rgba(0,0,0,0.5)',
};
const winBar: React.CSSProperties = {
  display: 'flex', alignItems: 'center', padding: '14px 18px', fontFamily: mono, fontSize: 17, fontWeight: 700,
  color: '#ffce7a', textTransform: 'uppercase', letterSpacing: 2.5, textShadow: '0 0 10px rgba(255,178,54,0.5)',
  background: 'rgba(255,178,54,0.08)', borderBottom: `1px dashed #7a5a2c`,
};
const winMeta: React.CSSProperties = { marginLeft: 'auto', fontFamily: mono, fontSize: 14, color: C.dim, letterSpacing: 1 };
// A live "● READY" status pinned to the right of the host panel's title bar.
const winStat: React.CSSProperties = {
  marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 7,
  fontFamily: mono, fontSize: 13, letterSpacing: 2, color: '#ffce7a',
};
const winStatDot: React.CSSProperties = {
  width: 8, height: 8, borderRadius: '50%', background: '#ffb43a', boxShadow: '0 0 8px #ffb43a, 0 0 3px #ffb43a',
};
// Padded body for the host form so every field shares one consistent gutter and rhythm.
const form: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 10, padding: '18px 20px 22px' };
// Field caption: a lit ◆ marker, the Korean label, and a dim English tag on the right.
const cap: React.CSSProperties = {
  display: 'flex', alignItems: 'center', fontFamily: mono, fontSize: 14, fontWeight: 700,
  letterSpacing: 0.5, color: AY, marginTop: 4,
};
const capDot: React.CSSProperties = { color: C.rare, fontSize: 11, textShadow: '0 0 8px rgba(216,162,60,0.6)' };
const capHint: React.CSSProperties = { marginLeft: 'auto', fontSize: 11, letterSpacing: 2, color: C.faint, fontWeight: 600 };
const execArrow: React.CSSProperties = { fontSize: 13 };
const listBox: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 8, minHeight: 300, maxHeight: '52vh', overflowY: 'auto', padding: '6px 20px 20px' };
const empty: React.CSSProperties = { color: C.faint, fontSize: 16, fontFamily: mono, textAlign: 'center', margin: 'auto', lineHeight: 1.9 };
const roomRow: React.CSSProperties = {
  display: 'grid', gridTemplateColumns: '1fr auto auto auto', alignItems: 'center', gap: 16,
  padding: '14px 16px', borderRadius: 4, cursor: 'pointer', textAlign: 'left',
  background: 'rgba(224,170,70,0.03)', border: `1px solid ${C.border}`, color: C.text, fontFamily: mono,
};
const rTitle: React.CSSProperties = { fontWeight: 600, fontSize: 17, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 8, fontFamily: mono };
const rMode: React.CSSProperties = { fontSize: 19, flexShrink: 0 };
const rArrow: React.CSSProperties = { color: AY, marginRight: 2 };
const visRow: React.CSSProperties = { display: 'flex', gap: 10 };
const visBtn: React.CSSProperties = {
  flex: 1, padding: '14px 14px', fontSize: 16, fontWeight: 700, color: C.dim, cursor: 'pointer', letterSpacing: 0.5,
  borderRadius: 4, border: `1px solid ${C.border}`, background: 'rgba(0,0,0,0.35)', fontFamily: mono,
  transition: 'border-color .12s, background .12s, color .12s',
};
const visBtnOn: React.CSSProperties = {
  color: C.rare, border: '1px solid #d8a23c', background: 'rgba(216,162,60,0.12)', boxShadow: '0 0 14px rgba(216,162,60,0.22)',
};
const visHint: React.CSSProperties = { margin: '-2px 0 2px', color: C.faint, fontSize: 14, lineHeight: 1.35, fontFamily: mono };
const modeToggle: React.CSSProperties = {
  marginTop: 4, padding: '14px 16px', fontSize: 16, fontWeight: 700, color: C.dim, cursor: 'pointer', letterSpacing: 0.5,
  borderRadius: 4, border: `1px dashed ${C.borderHi}`, background: 'rgba(224,170,70,0.02)', fontFamily: mono,
  transition: 'border-color .12s, color .12s, background .12s',
};
const modeToggleOn: React.CSSProperties = { color: AY, border: `1px solid rgba(224,170,70,0.5)`, background: 'rgba(224,170,70,0.06)' };
const modeGrid: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 };
const modeCard: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: 3, padding: '13px 15px', textAlign: 'left', cursor: 'pointer',
  borderRadius: 4, border: `1px solid ${C.border}`, background: 'rgba(0,0,0,0.35)', color: C.text, fontFamily: mono,
  transition: 'border-color .12s, background .12s, box-shadow .12s',
};
const modeCardOn: React.CSSProperties = {
  border: '1px solid #e0b24d', background: 'rgba(224,170,70,0.1)', boxShadow: '0 0 16px rgba(224,170,70,0.24)',
};
const modeIcon: React.CSSProperties = { fontSize: 22, lineHeight: 1 };
const modeName: React.CSSProperties = { fontWeight: 700, fontSize: 16, fontFamily: mono };
const modeTag: React.CSSProperties = { fontSize: 13, color: C.dim, lineHeight: 1.3, fontFamily: mono };
const rCode: React.CSSProperties = { fontFamily: mono, fontSize: 16, color: C.rare, letterSpacing: 1 };
const rCount: React.CSSProperties = { fontFamily: mono, fontSize: 16, color: C.dim };
const rGo: React.CSSProperties = { fontSize: 15, color: AY, fontWeight: 700, fontFamily: mono, letterSpacing: 0.5 };
const field: React.CSSProperties = {
  padding: '14px 16px', fontSize: 17, color: AY, outline: 'none', letterSpacing: 0.5,
  background: 'rgba(0,0,0,0.4)', border: `1px solid ${C.border}`, borderRadius: 4, fontFamily: mono,
  transition: 'border-color .12s, background .12s, box-shadow .12s',
};
const codeRow: React.CSSProperties = { display: 'flex', gap: 10 };
const codeField: React.CSSProperties = { flex: 1, fontFamily: mono, letterSpacing: 8, textAlign: 'center', textTransform: 'uppercase' };
const primary: React.CSSProperties = {
  marginTop: 6, padding: '17px 20px', fontSize: 18, fontWeight: 800, color: '#2a1a06', cursor: 'pointer', letterSpacing: 1,
  border: 'none', borderRadius: 4, background: 'linear-gradient(180deg,#ffd77a,#c9922f)', fontFamily: mono,
  boxShadow: '0 0 22px rgba(224,170,70,0.3), inset 0 1px 0 rgba(255,255,255,0.4)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};
const ghost: React.CSSProperties = {
  padding: '15px 20px', fontSize: 16, fontWeight: 700, color: AY, cursor: 'pointer', letterSpacing: 0.5,
  border: `1px solid ${C.borderHi}`, borderRadius: 4, background: 'rgba(224,170,70,0.04)', fontFamily: mono,
};
const sep: React.CSSProperties = {
  textAlign: 'center', color: C.faint, fontSize: 12, margin: '8px 0 2px', fontFamily: mono,
  letterSpacing: 2.5, textTransform: 'uppercase',
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
};
const errLine: React.CSSProperties = { margin: '2px 0 0', color: C.enemy, fontSize: 15, textAlign: 'center', fontFamily: mono };
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
