import { useEffect, useState } from 'react';
import { useRoom, readResumeToken } from './state/useRoom.js';
import { Lobby } from './ui/Lobby.js';
import { Battle } from './ui/Battle.js';
import { RoomBrowser } from './ui/RoomBrowser.js';
import { MainMenu } from './ui/MainMenu.js';
import { Splash } from './ui/Splash.js';
import { quickPlay, reconnect, findRoomByCode, joinRoomById } from './net/client.js';
import { InstallButton, promptInstall } from './ui/InstallButton.js';
import { C, mono, sans } from './ui/theme.js';
import { BrandMark } from './ui/BrandMark.js';
import { Icon } from './ui/art/Icon.js';
import { AvatarArt, AVATAR_CHOICES } from './ui/art/CreatureArt.js';
import { login, register, fetchMe, clearToken, getToken, type Account } from './net/auth.js';
import { playSfx } from './audio/sfx.js';
import { startBgm } from './audio/bgm.js';
import { MuteButton } from './ui/MuteButton.js';
import './ui/arena.css';
import type { BattleConnection } from './net/client.js';

type Connect = () => Promise<BattleConnection>;

export function App() {
  // undefined = still checking a stored token; null = logged out; Account = signed in.
  const [account, setAccount] = useState<Account | null | undefined>(() => (getToken() ? undefined : null));
  const [connect, setConnect] = useState<Connect | null>(null);
  // After login we land on the main menu; 멀티플레이어 opens the room browser.
  const [view, setView] = useState<'menu' | 'browser'>('menu');
  // The brand intro plays once per session, right before the menu first appears.
  const [splashDone, setSplashDone] = useState(false);
  // One-shot: after a page refresh, if a live-game seat is still within its grace window, rejoin it.
  const [resumeChecked, setResumeChecked] = useState(false);
  // One-shot: honour an invite link (?join=CODE) once we're signed in.
  const [joinChecked, setJoinChecked] = useState(false);

  useEffect(() => {
    if (account === undefined) fetchMe().then((a) => setAccount(a));
  }, [account]);

  // On the first load with a signed-in account, transparently rejoin a dropped game if the
  // reconnection token is still fresh — a refresh mid-match drops you right back in your seat.
  useEffect(() => {
    if (resumeChecked || !account) return;
    setResumeChecked(true);
    const token = readResumeToken();
    if (token) { setSplashDone(true); setConnect(() => () => reconnect(token)); }
  }, [account, resumeChecked]);

  // Invite links carry a room code in the URL (`?join=ABCD`). Once signed in, resolve the code to
  // a live room and drop straight in — skipping the menu — so a shared link lands friends in the
  // same room. The param is stripped afterwards so a mid-game refresh leans on the resume token,
  // not a re-join loop. A live-game rejoin (resume) always wins over a stale invite link.
  useEffect(() => {
    if (joinChecked || !account || connect) return;
    setJoinChecked(true);
    const code = new URLSearchParams(window.location.search).get('join');
    if (!code) return;
    const url = new URL(window.location.href);
    url.searchParams.delete('join');
    window.history.replaceState({}, '', url.pathname + url.search + url.hash);
    setSplashDone(true);
    findRoomByCode(code)
      .then((roomId) => { if (roomId) setConnect(() => () => joinRoomById(roomId, account.display, account.avatar)); })
      .catch(() => {});
  }, [account, joinChecked, connect]);

  // Go fullscreen on the visitor's first interaction — the browser only grants the Fullscreen
  // API from a user gesture, so we can't request it on load. Fire once, then let go.
  useEffect(() => {
    const goFullscreen = () => {
      if (!document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => {});
    };
    window.addEventListener('pointerdown', goFullscreen, { once: true });
    return () => window.removeEventListener('pointerdown', goFullscreen);
  }, []);

  // Kick off the ambient background music on the visitor's first interaction. Browsers only
  // let audio start from a user gesture, so we wait for the first pointerdown, then let go.
  useEffect(() => {
    const kick = () => startBgm();
    window.addEventListener('pointerdown', kick, { once: true });
    window.addEventListener('keydown', kick, { once: true });
    return () => {
      window.removeEventListener('pointerdown', kick);
      window.removeEventListener('keydown', kick);
    };
  }, []);

  if (account === undefined) return <Centered>불러오는 중…</Centered>;
  if (account === null) return <AuthGate onAuthed={setAccount} />;
  // Intro splash → menu: play the fade-in/hold/fade-out once, then reveal the menu.
  if (!splashDone) return <Splash onDone={() => setSplashDone(true)} />;
  // useState setters treat function values as updaters, so wrap to store the connect fn itself.
  if (connect === null) {
    if (view === 'menu') {
      return (
        <MainMenu
          account={account}
          onAccount={setAccount}
          onStart={() => setConnect(() => () => quickPlay(account.display, account.avatar))}
          onMultiplayer={() => setView('browser')}
          onLogout={() => { clearToken(); setAccount(null); }}
        />
      );
    }
    return (
      <RoomBrowser
        account={account}
        onAccount={setAccount}
        onPick={(c) => setConnect(() => c)}
        onBack={() => setView('menu')}
        onLogout={() => { clearToken(); setAccount(null); }}
      />
    );
  }
  // Dropping `connect` unmounts Game → useRoom's cleanup leaves the room → back to the browser.
  return <Game connect={connect} onExit={() => setConnect(null)} borderCosmetic={account.equippedBorder} />;
}

function Game({ connect, onExit, borderCosmetic }: { connect: Connect; onExit: () => void; borderCosmetic?: string }) {
  const { conn, ui, hand, events, error, send, setReady, addBot, removeBot, emotes, sendEmote, reward, autofillDeadline, status } = useRoom(connect);
  const myId = conn?.sessionId ?? '';

  if (!ui) {
    // A failed join/resume must never strand the player on a dead screen. This most often fires
    // when a saved seat's room has already ended (stale resume token, or an invite link to a
    // finished game) — surface a calm message and always offer a way back to the lobby list.
    if (error) {
      const gone = /disposed|not found|locked|no rooms/i.test(error.message);
      return (
        <div style={connOverlay}>
          <div style={connCard}>
            <span style={connTitle}>{gone ? '방이 종료되었습니다' : '연결 실패'}</span>
            <span style={connSub}>
              {gone ? '이미 끝났거나 사라진 방이에요. 목록으로 돌아가 주세요.' : error.message}
            </span>
            <button style={connBtn} onClick={() => { playSfx('back'); onExit(); }}>목록으로</button>
          </div>
        </div>
      );
    }
    return <Centered>연결 중…</Centered>;
  }
  return (
    <>
      {ui.phase === 'lobby'
        ? <Lobby ui={ui} myId={myId} onReady={setReady} onAddBot={addBot} onRemoveBot={removeBot} onExit={onExit} autofillDeadline={autofillDeadline} />
        : <Battle ui={ui} myId={myId} hand={hand} events={events} error={error} send={send} onExit={onExit} borderCosmetic={borderCosmetic} emotes={emotes} sendEmote={sendEmote} reward={reward} />}
      {status !== 'live' && <ConnOverlay status={status} onExit={onExit} />}
    </>
  );
}

// Covers the table when the socket drops: a soft "재접속 중" veil while the token is retried, then
// a firm "연결이 끊겼습니다" with an escape hatch once the grace window has lapsed.
function ConnOverlay({ status, onExit }: { status: 'reconnecting' | 'lost'; onExit: () => void }) {
  const lost = status === 'lost';
  return (
    <div style={connOverlay}>
      <div style={connCard}>
        {!lost && <div style={connSpinner} aria-hidden />}
        <span style={connTitle}>{lost ? '연결이 끊겼습니다' : '재접속 중…'}</span>
        <span style={connSub}>
          {lost ? '대전으로 돌아갈 수 없습니다. 목록으로 나가 주세요.' : '자리를 지키고 있습니다. 잠시만 기다려 주세요.'}
        </span>
        {lost && <button style={connBtn} onClick={() => { playSfx('back'); onExit(); }}>목록으로</button>}
      </div>
    </div>
  );
}

// Hand-scattered embers so the drift never looks like a repeating grid — varied column, size,
// start offset and speed. Concentrated toward the centre where the lamp shaft falls.
const EMBERS = [
  { left: 32, size: 3, delay: 0, dur: 9 },
  { left: 46, size: 2, delay: 2.4, dur: 11 },
  { left: 54, size: 4, delay: 5.1, dur: 8.5 },
  { left: 60, size: 2, delay: 1.2, dur: 12 },
  { left: 41, size: 3, delay: 6.7, dur: 10 },
  { left: 68, size: 2, delay: 3.6, dur: 9.5 },
  { left: 28, size: 2, delay: 8.2, dur: 11.5 },
  { left: 50, size: 3, delay: 4.3, dur: 13 },
  { left: 72, size: 3, delay: 7.5, dur: 10.5 },
] as const;

function AuthGate({ onAuthed }: { onAuthed: (account: Account) => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [avatar, setAvatar] = useState(AVATAR_CHOICES[0].id);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const go = () => {
    if (busy) return;
    // Fire the install prompt synchronously (first line, before any await) so the click
    // still counts as a user gesture. Only ask once per browser; the manual 앱 설치 button
    // remains as a fallback when no prompt is available yet.
    if (!localStorage.getItem('cb_install_asked')) {
      promptInstall().then((r) => { if (r !== 'unavailable') localStorage.setItem('cb_install_asked', '1'); });
    }
    const u = username.trim();
    if (!u || !password) { setError('아이디와 비밀번호를 입력하세요.'); playSfx('back'); return; }
    setError(null);
    setBusy(true);
    playSfx('select');
    const req = mode === 'login' ? login(u, password) : register(u, password, avatar);
    req.then((a) => { playSfx('win'); onAuthed(a); }).catch((e: unknown) => {
      setError(e instanceof Error ? e.message : '요청에 실패했습니다.');
      playSfx('back');
      setBusy(false);
    });
  };

  return (
    <div style={gateWrap}>
      <InstallButton />
      <div style={gateMute}><MuteButton /></div>
      {/* Dust motes / embers drifting up through the dead air of the back room — one restrained
          atmospheric layer behind the content. */}
      <div style={emberField} aria-hidden>
        {EMBERS.map((e, i) => (
          <span
            key={i}
            className="cb-ember"
            style={{ left: `${e.left}%`, width: e.size, height: e.size, animationDelay: `${e.delay}s`, animationDuration: `${e.dur}s` }}
          />
        ))}
      </div>
      <div style={gateVignette} aria-hidden />

      {/* The whole login lives inside ONE object: a premium admission ticket to the arena. */}
      <div style={ticketShell} className="cb-gate-in">
        <div style={ticketAura} aria-hidden />
        <span style={ticketFrame} aria-hidden />

        {/* TOP STUB — the punched admission line */}
        <div style={stubTop}>
          <span style={admitTag}><span style={admitDot} aria-hidden />ADMIT&nbsp;ONE</span>
          <span style={serial}>No.&nbsp;008&nbsp;·&nbsp;FFA</span>
        </div>
        <div style={perf} aria-hidden />

        {/* HEADER — crest seal + title */}
        <div style={crestMedallion}><BrandMark size={62} markOnly /></div>
        <h1 style={ticketTitle}>심연의 투기장</h1>
        <span style={ticketSub}>ABYSSAL&nbsp;ARENA</span>

        <div style={tabRow}>
          <button type="button" style={tab(mode === 'login')} onClick={() => { setMode('login'); setError(null); playSfx('toggle'); }}>로그인</button>
          <button type="button" style={tab(mode === 'register')} onClick={() => { setMode('register'); setError(null); playSfx('toggle'); }}>회원가입</button>
        </div>

        {mode === 'register' && (
          <>
            <span style={pickLabel}>캐릭터 선택</span>
            <div style={pickRow}>
              {AVATAR_CHOICES.map((c) => {
                const on = c.id === avatar;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => { setAvatar(c.id); playSfx('hover'); }}
                    title={c.name}
                    aria-label={c.name}
                    aria-pressed={on}
                    style={pickCell(on)}
                  >
                    {on && <span style={pickPin} aria-hidden><Icon name="check" size={9} color="#1a1206" /></span>}
                    <span style={pickArt(on)}><AvatarArt avatar={c.id} size={44} /></span>
                    <span style={pickName(on)}>{c.name}</span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        <div style={authFields} className="cb-field">
          <input
            className="cb-nick"
            autoFocus
            value={username}
            maxLength={16}
            placeholder="아이디"
            autoComplete="username"
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && go()}
            style={authInput}
          />
          <div style={pwWrap}>
            <input
              className="cb-nick"
              value={password}
              type={showPw ? 'text' : 'password'}
              maxLength={64}
              placeholder="비밀번호"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && go()}
              style={{ ...authInput, paddingRight: 44 }}
            />
            <button
              type="button"
              onClick={() => { setShowPw((v) => !v); playSfx('toggle'); }}
              style={pwToggle}
              aria-label={showPw ? '비밀번호 숨기기' : '비밀번호 표시'}
              aria-pressed={showPw}
              tabIndex={-1}
            >
              <Icon name="eye" size={18} color={showPw ? TICKET.accent : TICKET.faint} />
            </button>
          </div>
          <button className="cb-enter cb-ticket" onClick={go} style={enter} aria-label={mode === 'login' ? '로그인' : '회원가입'} disabled={busy}>
            {busy ? '…' : mode === 'login' ? '입장하기' : '가입하기'}&nbsp;<Icon name="arrowRight" size={16} />
          </button>
        </div>
        {error ? <p style={errText}>{error}</p> : <p style={hint}>계정을 만들고 심연의 투기장에 뛰어드세요</p>}

        {/* BOTTOM STUB — the flavour tear-off */}
        <div style={perf} aria-hidden />
        <span style={stubTagline}>여덟이 앉고, 하나가 살아남는다</span>
      </div>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div style={center}>{children}</div>;
}

const center: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
  minHeight: '100vh', gap: 16, color: C.dim, fontFamily: sans, background: C.void,
};

const connOverlay: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 80, display: 'grid', placeItems: 'center',
  background: 'rgba(4,3,5,0.66)', backdropFilter: 'blur(4px)',
};
const connCard: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '30px 38px',
  borderRadius: 16, width: 'min(360px, 90vw)', textAlign: 'center',
  background: 'linear-gradient(180deg, #1a1013, #100a0c)', border: `1px solid ${C.border}`,
  boxShadow: '0 30px 70px rgba(0,0,0,0.6)',
};
const connSpinner: React.CSSProperties = {
  width: 34, height: 34, borderRadius: '50%',
  border: '3px solid rgba(216,162,60,0.2)', borderTopColor: '#e6ad3e',
  animation: 'cb-spin 0.8s linear infinite',
};
const connTitle: React.CSSProperties = { fontSize: 18, fontWeight: 800, color: '#f3eee6', letterSpacing: 1 };
const connSub: React.CSSProperties = { fontSize: 13, color: C.dim, lineHeight: 1.5 };
const connBtn: React.CSSProperties = {
  marginTop: 6, padding: '10px 26px', fontSize: 14, fontWeight: 800, color: '#141608', cursor: 'pointer',
  border: 'none', borderRadius: 10, fontFamily: sans,
  background: 'linear-gradient(100deg, #b6d24a, #93ad34 58%, #74902a)', boxShadow: '0 6px 18px rgba(0,0,0,0.5)',
};

// Admission-ticket palette — warm brass, obsidian and parchment. Scoped to the login gate.
// A speakeasy pass to the back room: gold foil on charred card stock.
const TICKET = {
  text: '#f3ead6',
  dim: '#b0a184',
  faint: '#7c7059',
  brass: '#d8b45a',
  accent: '#e6ad3e',
  edge: 'rgba(216,180,90,0.28)',
  edgeHi: 'rgba(216,180,90,0.55)',
};

const gateWrap: React.CSSProperties = {
  position: 'relative', minHeight: '100vh', width: '100%', overflow: 'hidden',
  display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: sans,
  background:
    'radial-gradient(56% 40% at 50% 14%, rgba(224,165,60,0.12), transparent 64%),' +
    'radial-gradient(90% 60% at 50% 120%, rgba(120,30,26,0.10), transparent 60%),' +
    'linear-gradient(180deg, #14100c 0%, #0d0a08 54%, #070605 100%),' +
    '#070605',
};
// Full-height field the embers drift up through; sits behind the gate content (z below it).
const emberField: React.CSSProperties = {
  position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1, overflow: 'hidden',
};
const gateMute: React.CSSProperties = {
  position: 'fixed', top: 16, left: 16, zIndex: 40,
};
const gateVignette: React.CSSProperties = {
  position: 'absolute', inset: 0, pointerEvents: 'none',
  background: 'radial-gradient(125% 115% at 50% 40%, transparent 55%, rgba(4,3,2,0.94) 100%)',
};

// The single admission-ticket card that holds the whole login.
const ticketShell: React.CSSProperties = {
  position: 'relative', zIndex: 2, width: 'min(384px, 92vw)', padding: '18px 26px 20px',
  display: 'flex', flexDirection: 'column', alignItems: 'center', borderRadius: 18,
  background: [
    'linear-gradient(180deg, rgba(32,25,16,0.92), rgba(14,11,8,0.96))',
    'repeating-linear-gradient(45deg, rgba(255,240,210,0.012) 0 2px, transparent 2px 5px)',
  ].join(','),
  border: `1px solid ${TICKET.edge}`,
  boxShadow: '0 42px 92px rgba(0,0,0,0.72), inset 0 1px 0 rgba(255,240,210,0.08)',
  backdropFilter: 'blur(8px)',
};
// A soft brass halo bleeding out from behind the ticket (negative z so it sits behind the body).
const ticketAura: React.CSSProperties = {
  position: 'absolute', left: '50%', top: '46%', width: '118%', height: '118%',
  transform: 'translate(-50%, -50%)', borderRadius: '50%', pointerEvents: 'none', zIndex: -1,
  background: 'radial-gradient(circle, rgba(224,165,60,0.16), transparent 66%)',
  filter: 'blur(26px)',
};
// An engraved inner hairline that frames the ticket a few px inside its edge.
const ticketFrame: React.CSSProperties = {
  position: 'absolute', inset: 7, borderRadius: 12, pointerEvents: 'none',
  border: `1px solid ${TICKET.edge}`, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.4)',
};
// Top control stub — the ADMIT ONE / serial line.
const stubTop: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%',
  fontFamily: mono, fontSize: 9.5, letterSpacing: 3, color: TICKET.faint, textTransform: 'uppercase',
};
const admitTag: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, color: TICKET.dim };
const admitDot: React.CSSProperties = {
  width: 5, height: 5, borderRadius: '50%', background: TICKET.accent, boxShadow: `0 0 6px ${TICKET.accent}`,
};
const serial: React.CSSProperties = { letterSpacing: 2 };
// A punched perforation line between stub and body.
const perf: React.CSSProperties = {
  width: '100%', margin: '13px 0', borderTop: `1.5px dashed ${TICKET.edge}`,
};
// The crest sits inside a wax-seal medallion.
const crestMedallion: React.CSSProperties = {
  display: 'grid', placeItems: 'center', width: 92, height: 92, borderRadius: '50%', margin: '2px 0 8px',
  background: 'radial-gradient(circle at 50% 42%, rgba(224,165,60,0.16), rgba(12,10,8,0.4) 66%, transparent)',
  boxShadow: `inset 0 0 0 1px ${TICKET.edge}, 0 0 22px rgba(224,165,60,0.16)`,
};
const ticketTitle: React.CSSProperties = {
  margin: 0, fontFamily: sans, fontSize: 26, fontWeight: 900, letterSpacing: 2, color: TICKET.text, textAlign: 'center',
  textShadow: '0 2px 16px rgba(0,0,0,0.6), 0 0 22px rgba(224,165,60,0.2)',
};
const ticketSub: React.CSSProperties = {
  marginTop: 5, marginBottom: 18, fontFamily: mono, fontSize: 10.5, letterSpacing: 6, color: TICKET.brass,
  textTransform: 'uppercase', opacity: 0.85,
};
const stubTagline: React.CSSProperties = {
  fontFamily: mono, fontSize: 11, letterSpacing: 3, color: TICKET.dim, textAlign: 'center',
};

const pickLabel: React.CSSProperties = {
  fontFamily: mono, fontSize: 10, letterSpacing: 3, color: TICKET.faint, textTransform: 'uppercase',
  marginBottom: 10,
};
const pickRow: React.CSSProperties = {
  display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8,
  width: '100%', marginBottom: 18,
};
// Each character is a small portrait card: a recessed art window over a name strip, framed in
// brass and lifted when chosen — reads as picking a fighter, not toggling a swatch.
function pickCell(on: boolean): React.CSSProperties {
  return {
    position: 'relative', padding: '7px 5px 6px', cursor: 'pointer', borderRadius: 11,
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
    background: on
      ? 'linear-gradient(180deg, rgba(224,165,60,0.22), rgba(120,80,26,0.10))'
      : 'linear-gradient(180deg, rgba(26,20,14,0.72), rgba(12,9,6,0.86))',
    border: `1px solid ${on ? TICKET.brass : TICKET.edge}`,
    boxShadow: on
      ? `0 0 0 1px ${TICKET.brass}, 0 10px 22px rgba(224,165,60,0.28), inset 0 1px 0 rgba(255,240,210,0.10)`
      : 'inset 0 1px 0 rgba(255,240,210,0.05)',
    transform: on ? 'translateY(-2px)' : 'none',
    transition: 'border-color .2s, box-shadow .2s, background .2s, transform .2s',
  };
}
// A little brass "selected" seal pinned to the card corner.
const pickPin: React.CSSProperties = {
  position: 'absolute', top: -6, right: -6, width: 18, height: 18, borderRadius: '50%',
  display: 'grid', placeItems: 'center', zIndex: 2,
  background: 'linear-gradient(150deg, #f0cf7a, #d8b45a 60%, #b8923c)',
  boxShadow: '0 2px 8px rgba(40,24,4,0.55)',
};
// The recessed portrait well that mounts the avatar art.
function pickArt(on: boolean): React.CSSProperties {
  return {
    width: '100%', aspectRatio: '1', borderRadius: 8, display: 'grid', placeItems: 'center',
    overflow: 'hidden',
    background: [
      `radial-gradient(circle at 50% 38%, ${on ? 'rgba(224,165,60,0.22)' : 'rgba(120,110,90,0.10)'}, transparent 68%)`,
      'radial-gradient(circle at 50% 42%, rgba(0,0,0,0.10), rgba(0,0,0,0.52))',
    ].join(','),
    border: `1px solid ${on ? TICKET.edgeHi : TICKET.edge}`,
    boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.6)',
  };
}
function pickName(on: boolean): React.CSSProperties {
  return {
    maxWidth: '100%', fontFamily: sans, fontSize: 10.5, fontWeight: 700, letterSpacing: 0.2,
    color: on ? TICKET.text : TICKET.faint, textAlign: 'center', lineHeight: 1,
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  };
}
// Segmented 로그인 / 회원가입 toggle.
const tabRow: React.CSSProperties = {
  display: 'flex', gap: 4, padding: 4, marginBottom: 16, borderRadius: 12,
  background: 'rgba(10,8,6,0.7)', border: `1px solid ${TICKET.edge}`,
};
function tab(on: boolean): React.CSSProperties {
  return {
    padding: '9px 22px', fontSize: 14, fontWeight: 800, letterSpacing: 0.5, cursor: 'pointer',
    border: 'none', borderRadius: 9, fontFamily: sans,
    color: on ? '#1a1206' : TICKET.dim,
    background: on ? 'linear-gradient(100deg, #f0cf7a, #d8b45a 58%, #b8923c)' : 'transparent',
    boxShadow: on ? '0 6px 16px rgba(40,24,4,0.5)' : 'none',
    transition: 'color .2s, background .2s',
  };
}
// A recessed well holding the id + password fields and the submit action.
const authFields: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: 8, width: '100%', padding: 10,
  borderRadius: 12, background: 'rgba(4,3,2,0.4)', border: `1px solid ${TICKET.edge}`,
  boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,240,210,0.05)',
};
const authInput: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', padding: '12px 14px', fontSize: 16, color: TICKET.text, fontFamily: sans,
  background: 'rgba(8,6,4,0.5)', border: `1px solid ${TICKET.edge}`, borderRadius: 10, outline: 'none',
};
// Password field wraps the input so the reveal toggle can sit inside its right edge.
const pwWrap: React.CSSProperties = { position: 'relative', width: '100%' };
const pwToggle: React.CSSProperties = {
  position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
  width: 32, height: 32, display: 'grid', placeItems: 'center', cursor: 'pointer',
  border: 'none', background: 'transparent', borderRadius: 8, padding: 0,
};
const enter: React.CSSProperties = {
  width: '100%', padding: '12px 20px', fontSize: 15, fontWeight: 800, letterSpacing: 0.5,
  color: '#1a1206', cursor: 'pointer', border: 'none', borderRadius: 10, fontFamily: sans,
  background: 'linear-gradient(100deg, #f2d488, #dcb457 56%, #bc9438)',
  boxShadow: '0 6px 18px rgba(50,30,4,0.5)',
};
const hint: React.CSSProperties = {
  margin: '16px 0 6px', fontSize: 12.5, color: TICKET.faint, fontFamily: sans, letterSpacing: 0.2,
};
const errText: React.CSSProperties = {
  margin: '16px 0 0', fontSize: 12.5, color: C.enemy, fontFamily: sans, letterSpacing: 0.2,
};
