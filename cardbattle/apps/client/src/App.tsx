import { memo, useEffect, useState } from 'react';
import { useRoom, readResumeToken } from './state/useRoom.js';
import { Lobby } from './ui/Lobby.js';
import { Battle } from './ui/Battle.js';
import { RoomBrowser } from './ui/RoomBrowser.js';
import { MainMenu } from './ui/MainMenu.js';
import { Splash } from './ui/Splash.js';
import { quickPlay, startCoachGame, reconnect, findRoomByCode, joinRoomById } from './net/client.js';
import { InstallButton, promptInstall } from './ui/InstallButton.js';
import { C, mono, sans } from './ui/theme.js';
import { BrandMark } from './ui/BrandMark.js';
import { Icon } from './ui/art/Icon.js';
import { AvatarArt, AVATAR_CHOICES } from './ui/art/CreatureArt.js';
import { CardArt } from './ui/art/CardArt.js';
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
  // When true, the next battle runs with the guided coach overlay (learn-by-playing tutorial).
  const [coach, setCoach] = useState(false);
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
    if (token) { setSplashDone(true); setCoach(false); setConnect(() => () => reconnect(token)); }
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
      .then((roomId) => { if (roomId) { setCoach(false); setConnect(() => () => joinRoomById(roomId, account.display, account.avatar)); } })
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
          onStart={() => { setCoach(false); setConnect(() => () => quickPlay(account.display, account.avatar)); }}
          onStartCoach={() => { setCoach(true); setConnect(() => () => startCoachGame(account.display, account.avatar)); }}
          onMultiplayer={() => setView('browser')}
          onLogout={() => { clearToken(); setAccount(null); }}
        />
      );
    }
    return (
      <RoomBrowser
        account={account}
        onAccount={setAccount}
        onPick={(c) => { setCoach(false); setConnect(() => c); }}
        onBack={() => setView('menu')}
        onLogout={() => { clearToken(); setAccount(null); }}
      />
    );
  }
  // Dropping `connect` unmounts Game → useRoom's cleanup leaves the room → back to the browser.
  return <Game connect={connect} onExit={() => setConnect(null)} borderCosmetic={account.equippedBorder} coach={coach} />;
}

function Game({ connect, onExit, borderCosmetic, coach }: { connect: Connect; onExit: () => void; borderCosmetic?: string; coach?: boolean }) {
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
        : <Battle ui={ui} myId={myId} hand={hand} events={events} error={error} send={send} onExit={onExit} borderCosmetic={borderCosmetic} emotes={emotes} sendEmote={sendEmote} reward={reward} coach={coach} />}
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

// Real card faces drifting through the dark arena behind the login glass. Deterministic
// scatter with per-card depth (scale / opacity / blur / glow) so near cards read sharp and
// lit, far ones recede into the murk — a deep, layered field, not a flat backdrop.
const DRIFT_CARDS = [
  // near, bright, sharp — catch the light
  { id: 'snipe',   left: 5,  top: 12, size: 74, scale: 1.06, rot: -13, op: 0.82, blur: 0,   glow: 0.7, delay: 0,   dur: 24 },
  { id: 'bomb',    left: 80, top: 7,  size: 80, scale: 1.1,  rot: 12,  op: 0.8,  blur: 0,   glow: 0.7, delay: 3,   dur: 27 },
  { id: 'bolt',    left: 84, top: 58, size: 70, scale: 1.02, rot: -9,  op: 0.82, blur: 0,   glow: 0.8, delay: 1.6, dur: 29 },
  { id: 'shield',  left: 9,  top: 62, size: 64, scale: 0.98, rot: 10,  op: 0.72, blur: 0.3, glow: 0.5, delay: 6,   dur: 25 },
  // mid
  { id: 'reverse', left: 63, top: 78, size: 56, scale: 0.9,  rot: 16,  op: 0.56, blur: 0.9, glow: 0.3, delay: 4.2, dur: 28 },
  { id: 'sword',   left: 20, top: 82, size: 54, scale: 0.88, rot: -18, op: 0.54, blur: 1,   glow: 0.3, delay: 12,  dur: 30 },
  { id: 'potion',  left: 45, top: 3,  size: 50, scale: 0.82, rot: -5,  op: 0.46, blur: 1.4, glow: 0.2, delay: 8,   dur: 31 },
  { id: 'peek',    left: 71, top: 33, size: 46, scale: 0.78, rot: 8,   op: 0.4,  blur: 1.6, glow: 0,   delay: 14,  dur: 34 },
  // far, dim, blurred — depth
  { id: 'drain',   left: 27, top: 36, size: 42, scale: 0.74, rot: -20, op: 0.34, blur: 2,   glow: 0,   delay: 10,  dur: 33 },
  { id: 'bind',    left: 52, top: 52, size: 38, scale: 0.7,  rot: 22,  op: 0.28, blur: 2.4, glow: 0,   delay: 16,  dur: 36 },
] as const;

// The login gate's atmosphere — embers + drifting card faces (10 CardArt SVGs) + light shafts.
// These take no props and never change, so they're split into their own memoized component:
// typing in the login fields re-renders AuthGate on every keystroke, and without this the whole
// heavy backdrop (SVGs included) re-rendered each time, blocking the input for ~400ms (INP).
const GateBackdrop = memo(function GateBackdrop() {
  return (
    <>
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
      {/* Living arena behind the glass — real card faces drifting through the dark. */}
      <div style={cardDrift} aria-hidden>
        {DRIFT_CARDS.map((c, i) => (
          <span
            key={i}
            className="cb-drift"
            style={{ left: `${c.left}%`, top: `${c.top}%`, animationDelay: `${c.delay}s`, animationDuration: `${c.dur}s` }}
          >
            <span style={{ display: 'block', transform: `rotate(${c.rot}deg) scale(${c.scale})`, opacity: c.op, filter: c.blur ? `blur(${c.blur}px)` : undefined }}>
              <span
                style={{
                  ...driftCardFace,
                  boxShadow: c.glow
                    ? `0 18px 40px rgba(0,0,0,0.55), 0 0 ${34 * c.glow}px rgba(224,165,60,${0.5 * c.glow}), inset 0 1px 0 rgba(255,225,170,0.14)`
                    : driftCardFace.boxShadow,
                }}
              >
                <CardArt id={c.id} size={c.size} />
              </span>
            </span>
          </span>
        ))}
      </div>
      {/* A shaft of warm light spills down onto the login from the unseen ceiling of the arena. */}
      <div style={lightShaft} className="cb-gate-shaft" aria-hidden />
      <div style={gateGlow} className="cb-gate-glow" aria-hidden />
      <div style={gateVignette} aria-hidden />
    </>
  );
});

function AuthGate({ onAuthed }: { onAuthed: (account: Account) => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [avatar, setAvatar] = useState(AVATAR_CHOICES[0].id);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // The Render free tier sleeps after ~15min idle, so the first auth request can take 30–50s to
  // spin the server back up. If a request runs past a few seconds it's almost certainly a cold
  // start — surface a "waking the server" hint so the wait doesn't read as a frozen button.
  const [waking, setWaking] = useState(false);

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
    setWaking(false);
    playSfx('select');
    const wakeTimer = setTimeout(() => setWaking(true), 4000);
    const done = () => { clearTimeout(wakeTimer); setWaking(false); };
    const req = mode === 'login' ? login(u, password) : register(u, password, avatar);
    req.then((a) => { done(); playSfx('win'); onAuthed(a); }).catch((e: unknown) => {
      done();
      setError(e instanceof Error ? e.message : '요청에 실패했습니다.');
      playSfx('back');
      setBusy(false);
    });
  };

  // No-account entry: mint a throwaway local guest and drop straight into the arena. Carries no
  // token, so joins seat the player as a guest (server onAuth returns username:null) — progress
  // (gold, wins, cosmetics) simply doesn't persist. Lets a visitor play instantly before signing up.
  const goGuest = () => {
    if (busy) return;
    playSfx('select');
    onAuthed({
      token: '', username: '', display: `손님${Math.floor(1000 + Math.random() * 9000)}`,
      avatar, wins: 0, losses: 0, gold: 0,
      owned: [], equippedBorder: '', equippedTitle: '', equippedEffect: '',
    });
  };

  return (
    <div style={gateWrap}>
      <InstallButton />
      <div style={gateMute}><MuteButton /></div>
      <GateBackdrop />

      {/* The login floats over the arena — a minimal frosted-glass pass. */}
      <div style={ticketShell} className="cb-gate-in">
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
                    {on && <span style={pickPin} aria-hidden><Icon name="check" size={9} color="#f4e9cb" /></span>}
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
            {busy ? (waking ? '서버 깨우는 중…' : '…') : mode === 'login' ? '입장하기' : '가입하기'}&nbsp;{!busy && <Icon name="arrowRight" size={16} />}
          </button>
        </div>
        {waking
          ? <p style={hint}>서버가 절전 모드였어요. 처음 접속은 최대 1분까지 걸릴 수 있어요.</p>
          : error ? <p style={errText}>{error}</p> : <p style={hint}>계정을 만들고 심연의 투기장에 뛰어드세요</p>}

        <button type="button" style={guestLink} onClick={goGuest} disabled={busy}>계정 없이 게스트로 둘러보기</button>

        <span style={stubTagline}>여섯이 앉고, 하나가 살아남는다</span>
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
  background: `linear-gradient(180deg, ${C.panelHi}, ${C.panel})`, border: `1px solid ${C.border}`,
  boxShadow: '0 30px 70px rgba(0,0,0,0.6)',
};
const connSpinner: React.CSSProperties = {
  width: 34, height: 34, borderRadius: '50%',
  border: `3px solid ${C.border}`, borderTopColor: C.rare,
  animation: 'cb-spin 0.8s linear infinite',
};
const connTitle: React.CSSProperties = { fontSize: 18, fontWeight: 800, color: C.text, letterSpacing: 1 };
const connSub: React.CSSProperties = { fontSize: 13, color: C.dim, lineHeight: 1.5 };
const connBtn: React.CSSProperties = {
  marginTop: 6, padding: '10px 26px', fontSize: 14, fontWeight: 800, color: '#f4e9cb', cursor: 'pointer',
  border: 'none', borderRadius: 10, fontFamily: sans,
  background: `linear-gradient(100deg, ${C.enemy}, #7f2f1f)`, boxShadow: '0 6px 18px rgba(0,0,0,0.5)',
};

// Admission-ticket palette — printed on DARK STOCK. Scoped to the login gate.
// A black arena pass: warm parchment ink on dark walnut card-stock, one oxblood seal accent. Flat, no glow.
const TICKET = {
  ink: '#ece0c6', // primary text ink (light, on the dark stock)
  dim: '#b4a583', // secondary ink
  faint: '#8a7856', // faint printed / caption ink
  paper: '#20180e', // dark card-stock base
  paperHi: '#f4e9cb', // light ink used on the oxblood button
  seal: '#b0462f', // oxblood accent — hairlines, dots, the seal
  edge: 'rgba(74,59,39,0.7)', // scuffed ink hairline
  edgeHi: '#6a5539',
  // legacy aliases so any stray reference keeps compiling
  text: '#ece0c6',
  brass: '#b0462f',
  accent: '#b0462f',
};

const gateWrap: React.CSSProperties = {
  position: 'relative', minHeight: '100vh', width: '100%', overflow: 'hidden',
  display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: sans,
  background:
    'radial-gradient(60% 46% at 50% 8%, rgba(240,180,70,0.20), transparent 62%),' +
    'radial-gradient(80% 50% at 50% 116%, rgba(150,40,30,0.16), transparent 60%),' +
    'linear-gradient(180deg, #1a140d 0%, #100b08 52%, #060504 100%),' +
    '#060504',
};
// Full-height field the embers drift up through; sits behind the gate content (z below it).
const emberField: React.CSSProperties = {
  position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1, overflow: 'hidden',
};
const gateMute: React.CSSProperties = {
  position: 'fixed', top: 16, left: 16, zIndex: 40,
};
const gateVignette: React.CSSProperties = {
  position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1,
  background: 'radial-gradient(120% 110% at 50% 42%, transparent 48%, rgba(3,2,1,0.96) 100%)',
};
// A tall cone of warm light raking down from the top of the arena onto the login glass.
const lightShaft: React.CSSProperties = {
  position: 'absolute', top: '-14%', left: '50%', width: 'min(560px, 92vw)', height: '128%',
  transform: 'translateX(-50%)', pointerEvents: 'none', zIndex: 1,
  clipPath: 'polygon(38% 0%, 62% 0%, 88% 100%, 12% 100%)',
  background: 'linear-gradient(180deg, rgba(240,186,86,0.24) 0%, rgba(224,165,60,0.10) 40%, transparent 82%)',
  mixBlendMode: 'screen', filter: 'blur(6px)',
};
// A soft warm halo pooled behind the form so it lifts off the dark field.
const gateGlow: React.CSSProperties = {
  position: 'absolute', top: '50%', left: '50%', width: 520, height: 520,
  transform: 'translate(-50%, -50%)', pointerEvents: 'none', zIndex: 1, borderRadius: '50%',
  background: 'radial-gradient(circle, rgba(224,165,60,0.16), rgba(150,40,30,0.06) 46%, transparent 70%)',
  mixBlendMode: 'screen', filter: 'blur(10px)',
};

// The login form floats over the drifting arena — a minimal frosted-glass panel with one oxblood accent rule.
const ticketShell: React.CSSProperties = {
  position: 'relative', zIndex: 2, width: 'min(372px, 92vw)', padding: '24px 26px 22px',
  display: 'flex', flexDirection: 'column', alignItems: 'center', borderRadius: 10,
  background: 'rgba(22,16,9,0.72)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
  border: `1px solid rgba(90,74,45,0.5)`, borderTop: `2px solid ${TICKET.seal}`,
  boxShadow: '0 30px 70px rgba(0,0,0,0.62)',
};
// Full-bleed layer of card faces drifting behind the glass.
const cardDrift: React.CSSProperties = {
  position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1, overflow: 'hidden',
};
// Each drifting card sits in a small dark frame so it reads as a real card, not a floating icon.
const driftCardFace: React.CSSProperties = {
  display: 'grid', placeItems: 'center', padding: '10px 9px', borderRadius: 8,
  background: '#221910', border: '1px solid rgba(90,74,45,0.55)',
  boxShadow: '0 14px 32px rgba(0,0,0,0.5)',
};
// The crest sits inside a flat seal medallion.
const crestMedallion: React.CSSProperties = {
  display: 'grid', placeItems: 'center', width: 92, height: 92, borderRadius: '50%', margin: '2px 0 8px',
  background: 'radial-gradient(circle at 50% 38%, rgba(240,180,70,0.22), rgba(60,44,20,0.34) 62%)',
  border: `1px solid rgba(150,110,50,0.55)`,
  boxShadow: '0 0 40px rgba(224,165,60,0.28), inset 0 1px 0 rgba(255,225,170,0.16)',
};
const ticketTitle: React.CSSProperties = {
  margin: 0, fontFamily: sans, fontSize: 26, fontWeight: 800, letterSpacing: 1, color: TICKET.ink, textAlign: 'center',
  textShadow: '0 2px 0 rgba(10,7,4,0.6), 0 0 26px rgba(224,165,60,0.28)',
};
const ticketSub: React.CSSProperties = {
  marginTop: 5, marginBottom: 18, fontFamily: mono, fontSize: 10.5, letterSpacing: 6, color: TICKET.seal,
  textTransform: 'uppercase', opacity: 0.9,
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
    position: 'relative', padding: '7px 5px 6px', cursor: 'pointer', borderRadius: 4,
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
    background: on ? 'rgba(156,59,40,0.16)' : 'rgba(42,32,18,0.7)',
    border: `1px solid ${on ? TICKET.seal : TICKET.edge}`,
    transform: on ? 'translateY(-2px)' : 'none',
    transition: 'border-color .2s, background .2s, transform .2s',
  };
}
// A little flat "selected" seal pinned to the card corner.
const pickPin: React.CSSProperties = {
  position: 'absolute', top: -6, right: -6, width: 18, height: 18, borderRadius: '50%',
  display: 'grid', placeItems: 'center', zIndex: 2,
  background: '#9c3b28', border: '1px solid #7f2f1f',
};
// The recessed portrait well that mounts the avatar art.
function pickArt(on: boolean): React.CSSProperties {
  return {
    width: '100%', aspectRatio: '1', borderRadius: 4, display: 'grid', placeItems: 'center',
    overflow: 'hidden',
    background: on ? 'rgba(156,59,40,0.14)' : 'rgba(18,13,7,0.55)',
    border: `1px solid ${on ? TICKET.edgeHi : TICKET.edge}`,
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
  display: 'flex', gap: 4, padding: 4, marginBottom: 16, borderRadius: 4,
  background: 'rgba(18,13,7,0.6)', border: `1px solid ${TICKET.edge}`,
};
function tab(on: boolean): React.CSSProperties {
  return {
    padding: '9px 22px', fontSize: 14, fontWeight: 700, letterSpacing: 0.5, cursor: 'pointer',
    border: 'none', borderRadius: 4, fontFamily: sans,
    color: on ? TICKET.paperHi : TICKET.dim,
    background: on ? '#9c3b28' : 'transparent',
    transition: 'color .2s, background .2s',
  };
}
// A flat dark well holding the id + password fields and the submit action.
const authFields: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: 8, width: '100%', padding: 10,
  borderRadius: 4, background: 'rgba(18,13,7,0.5)', border: `1px solid ${TICKET.edge}`,
};
const authInput: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', padding: '12px 14px', fontSize: 16, color: TICKET.ink, fontFamily: sans,
  background: 'rgba(10,7,4,0.6)', border: `1px solid ${TICKET.edge}`, borderRadius: 4, outline: 'none',
};
// Password field wraps the input so the reveal toggle can sit inside its right edge.
const pwWrap: React.CSSProperties = { position: 'relative', width: '100%' };
const pwToggle: React.CSSProperties = {
  position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
  width: 32, height: 32, display: 'grid', placeItems: 'center', cursor: 'pointer',
  border: 'none', background: 'transparent', borderRadius: 4, padding: 0,
};
const enter: React.CSSProperties = {
  width: '100%', padding: '12px 20px', fontSize: 15, fontWeight: 700, letterSpacing: 0.5,
  color: TICKET.paperHi, cursor: 'pointer', border: '1px solid #7f2f1f', borderRadius: 4, fontFamily: sans,
  background: '#9c3b28',
};
const hint: React.CSSProperties = {
  margin: '16px 0 6px', fontSize: 12.5, color: TICKET.faint, fontFamily: sans, letterSpacing: 0.2,
};
const errText: React.CSSProperties = {
  margin: '16px 0 0', fontSize: 12.5, color: C.enemy, fontFamily: sans, letterSpacing: 0.2,
};
const guestLink: React.CSSProperties = {
  margin: '10px 0 0', padding: '6px 4px', fontSize: 12.5, fontFamily: sans, color: TICKET.dim,
  background: 'transparent', border: 'none', cursor: 'pointer',
  textDecoration: 'underline', textUnderlineOffset: 3, letterSpacing: 0.2,
};
