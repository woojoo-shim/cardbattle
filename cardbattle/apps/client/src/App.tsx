import { useEffect, useState } from 'react';
import { useRoom } from './state/useRoom.js';
import { Lobby } from './ui/Lobby.js';
import { Battle } from './ui/Battle.js';
import { RoomBrowser } from './ui/RoomBrowser.js';
import { MainMenu } from './ui/MainMenu.js';
import { quickPlay } from './net/client.js';
import { InstallButton, promptInstall } from './ui/InstallButton.js';
import { C, RARITY_BORDER, mono, sans } from './ui/theme.js';
import { CardArt } from './ui/art/CardArt.js';
import { BrandMark } from './ui/BrandMark.js';
import { Icon } from './ui/art/Icon.js';
import { AvatarArt, AVATAR_CHOICES } from './ui/art/CreatureArt.js';
import { login, register, fetchMe, clearToken, getToken, type Account } from './net/auth.js';
import './ui/arena.css';
import type { BattleConnection } from './net/client.js';

type Connect = () => Promise<BattleConnection>;

export function App() {
  // undefined = still checking a stored token; null = logged out; Account = signed in.
  const [account, setAccount] = useState<Account | null | undefined>(() => (getToken() ? undefined : null));
  const [connect, setConnect] = useState<Connect | null>(null);
  // After login we land on the main menu; 멀티플레이어 opens the room browser.
  const [view, setView] = useState<'menu' | 'browser'>('menu');

  useEffect(() => {
    if (account === undefined) fetchMe().then((a) => setAccount(a));
  }, [account]);

  if (account === undefined) return <Centered>불러오는 중…</Centered>;
  if (account === null) return <AuthGate onAuthed={setAccount} />;
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
  const { conn, ui, hand, events, error, send, setReady, addBot, removeBot, emotes, sendEmote, reward } = useRoom(connect);
  const myId = conn?.sessionId ?? '';

  if (!ui) {
    return <Centered>{error ? `연결 실패: ${error.message}` : '연결 중…'}</Centered>;
  }
  if (ui.phase === 'lobby') {
    return <Lobby ui={ui} myId={myId} onReady={setReady} onAddBot={addBot} onRemoveBot={removeBot} />;
  }
  return <Battle ui={ui} myId={myId} hand={hand} events={events} error={error} send={send} onExit={onExit} borderCosmetic={borderCosmetic} emotes={emotes} sendEmote={sendEmote} reward={reward} />;
}

/** A fanned hand of real game cards, dealt across the void behind the title. */
const HERO_CARDS = [
  { id: 'reverse',   rarity: 'rare',      a: -22, x: -168, y: 34 },
  { id: 'bomb',      rarity: 'epic',      a: -11, x: -88,  y: 9 },
  { id: 'snipe',     rarity: 'legendary', a: 0,   x: 0,    y: 0 },
  { id: 'greatheal', rarity: 'rare',      a: 11,  x: 88,   y: 9 },
  { id: 'sword',     rarity: 'common',    a: 22,  x: 168,  y: 34 },
] as const;

function AuthGate({ onAuthed }: { onAuthed: (account: Account) => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
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
    if (!u || !password) { setError('아이디와 비밀번호를 입력하세요.'); return; }
    setError(null);
    setBusy(true);
    const req = mode === 'login' ? login(u, password) : register(u, password, avatar);
    req.then(onAuthed).catch((e: unknown) => {
      setError(e instanceof Error ? e.message : '요청에 실패했습니다.');
      setBusy(false);
    });
  };

  return (
    <div style={gateWrap}>
      <InstallButton />
      <div style={gateGlow} aria-hidden />
      <div style={gateVignette} aria-hidden />

      <div style={gateContent} className="cb-gate-in">
        <span style={kicker}>◈&nbsp;&nbsp;THE&nbsp;ABYSSAL&nbsp;ARENA&nbsp;&nbsp;◈</span>
        <BrandMark size={104} />
        <div style={ruleWrap} aria-hidden><span className="cb-rule" style={rule} /></div>

        <div style={heroFan} className="cb-hero-float" aria-hidden>
          {HERO_CARDS.map((c) => (
            <div key={c.id} style={heroCard(c)}>
              <div style={heroSheen} />
              <CardArt id={c.id} size={54} />
            </div>
          ))}
        </div>

        <div style={tabRow}>
          <button type="button" style={tab(mode === 'login')} onClick={() => { setMode('login'); setError(null); }}>로그인</button>
          <button type="button" style={tab(mode === 'register')} onClick={() => { setMode('register'); setError(null); }}>회원가입</button>
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
                    onClick={() => setAvatar(c.id)}
                    title={c.name}
                    aria-label={c.name}
                    aria-pressed={on}
                    style={pickCell(on)}
                  >
                    <AvatarArt avatar={c.id} size={40} />
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
          <input
            value={password}
            type="password"
            maxLength={64}
            placeholder="비밀번호"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && go()}
            style={authInput}
          />
          <button className="cb-enter" onClick={go} style={enter} aria-label={mode === 'login' ? '로그인' : '회원가입'} disabled={busy}>
            {busy ? '…' : mode === 'login' ? '로그인' : '가입'}&nbsp;<Icon name="arrowRight" size={16} />
          </button>
        </div>
        {error ? <p style={errText}>{error}</p> : <p style={hint}>계정을 만들고 심연의 투기장에 뛰어드세요</p>}
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

const gateWrap: React.CSSProperties = {
  position: 'relative', minHeight: '100vh', width: '100%', overflow: 'hidden',
  display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: sans,
  background:
    'radial-gradient(72% 52% at 50% 116%, rgba(56,232,200,0.10), transparent 60%),' +
    'radial-gradient(60% 46% at 50% -12%, rgba(123,92,255,0.11), transparent 62%),' +
    '#07080d',
};
// One restrained pool of light behind the hand — glow is a moment, not wallpaper.
const gateGlow: React.CSSProperties = {
  position: 'absolute', left: '50%', top: '46%', width: 520, height: 300,
  transform: 'translate(-50%, -50%)', pointerEvents: 'none', borderRadius: '50%',
  background: 'radial-gradient(ellipse at center, rgba(123,92,255,0.16), transparent 68%)',
  filter: 'blur(6px)',
};
const gateVignette: React.CSSProperties = {
  position: 'absolute', inset: 0, pointerEvents: 'none',
  background: 'radial-gradient(125% 115% at 50% 44%, transparent 56%, rgba(4,5,9,0.92) 100%)',
};

const gateContent: React.CSSProperties = {
  position: 'relative', zIndex: 2,
  display: 'flex', flexDirection: 'column', alignItems: 'center',
  padding: '0 20px',
};
const kicker: React.CSSProperties = {
  fontFamily: mono, fontSize: 11, letterSpacing: 6, color: C.faint, textTransform: 'uppercase',
  marginBottom: 12,
};
const ruleWrap: React.CSSProperties = {
  marginTop: 14, width: 'min(340px, 74vw)', height: 2, borderRadius: 2, overflow: 'hidden',
};
const rule: React.CSSProperties = {
  display: 'block', width: '100%', height: '100%',
  background: 'linear-gradient(90deg, transparent, #38e8c8 32%, #8b6cff 68%, transparent)',
  backgroundSize: '220% 100%',
};

const heroFan: React.CSSProperties = {
  position: 'relative', width: 'min(440px, 92vw)', height: 168, margin: '30px 0 34px',
  pointerEvents: 'none', filter: 'drop-shadow(0 22px 44px rgba(0,0,0,0.55))',
};
function heroCard(c: (typeof HERO_CARDS)[number]): React.CSSProperties {
  const depth = Math.abs(c.a);
  const opacity = depth === 0 ? 1 : depth >= 22 ? 0.66 : 0.85;
  return {
    position: 'absolute', left: '50%', top: '50%', width: 88, height: 122, opacity,
    transform: `translate(-50%, -50%) translate(${c.x}px, ${c.y}px) rotate(${c.a}deg)`,
    background: 'linear-gradient(180deg, #1c2233, #0d121c)',
    border: `1px solid ${RARITY_BORDER[c.rarity]}`, borderRadius: 12,
    display: 'grid', placeItems: 'center', overflow: 'hidden',
    boxShadow: `0 12px 26px rgba(0,0,0,0.5), inset 0 0 22px ${RARITY_BORDER[c.rarity]}22`,
  };
}
const heroSheen: React.CSSProperties = {
  position: 'absolute', inset: 0, pointerEvents: 'none',
  background: 'linear-gradient(150deg, rgba(255,255,255,0.10), transparent 42%)',
};

const pickLabel: React.CSSProperties = {
  fontFamily: mono, fontSize: 10, letterSpacing: 3, color: C.faint, textTransform: 'uppercase',
  marginBottom: 10,
};
const pickRow: React.CSSProperties = {
  display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 8,
  width: 'min(360px, 90vw)', marginBottom: 18,
};
function pickCell(on: boolean): React.CSSProperties {
  return {
    width: 52, height: 52, padding: 0, cursor: 'pointer', borderRadius: 12,
    display: 'grid', placeItems: 'center',
    background: on ? 'linear-gradient(160deg, rgba(56,232,200,0.16), rgba(123,92,255,0.12))' : 'rgba(20,24,34,0.6)',
    border: `1px solid ${on ? C.you : C.border}`,
    boxShadow: on ? `0 0 0 1px ${C.you}, 0 0 16px rgba(56,232,200,0.35)` : 'inset 0 1px 0 rgba(255,255,255,0.03)',
    transition: 'border-color .2s, box-shadow .2s, background .2s',
  };
}
// Segmented 로그인 / 회원가입 toggle.
const tabRow: React.CSSProperties = {
  display: 'flex', gap: 4, padding: 4, marginBottom: 16, borderRadius: 12,
  background: 'rgba(20,24,34,0.72)', border: `1px solid ${C.border}`,
};
function tab(on: boolean): React.CSSProperties {
  return {
    padding: '9px 22px', fontSize: 14, fontWeight: 800, letterSpacing: 0.5, cursor: 'pointer',
    border: 'none', borderRadius: 9, fontFamily: sans,
    color: on ? '#fff' : C.dim,
    background: on ? 'linear-gradient(100deg, #6d4bff, #5b3cff 60%, #2fb8a0)' : 'transparent',
    boxShadow: on ? '0 6px 16px rgba(123,92,255,0.35)' : 'none',
    transition: 'color .2s, background .2s',
  };
}
// A stacked card holding the id + password fields and the submit action.
const authFields: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: 8, width: 'min(360px, 90vw)', padding: 10,
  borderRadius: 14, background: 'rgba(20,24,34,0.72)', border: `1px solid ${C.border}`,
  boxShadow: '0 24px 60px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.04)',
  backdropFilter: 'blur(8px)',
};
const authInput: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', padding: '12px 14px', fontSize: 16, color: C.text, fontFamily: sans,
  background: 'rgba(0,0,0,0.28)', border: `1px solid ${C.border}`, borderRadius: 10, outline: 'none',
};
const enter: React.CSSProperties = {
  width: '100%', padding: '12px 20px', fontSize: 15, fontWeight: 800, letterSpacing: 0.5,
  color: '#fff', cursor: 'pointer', border: 'none', borderRadius: 10, fontFamily: sans,
  background: 'linear-gradient(100deg, #6d4bff, #5b3cff 60%, #2fb8a0)',
  boxShadow: '0 6px 18px rgba(123,92,255,0.4)',
};
const hint: React.CSSProperties = {
  margin: '16px 0 0', fontSize: 12.5, color: C.faint, fontFamily: sans, letterSpacing: 0.2,
};
const errText: React.CSSProperties = {
  margin: '16px 0 0', fontSize: 12.5, color: C.enemy, fontFamily: sans, letterSpacing: 0.2,
};
