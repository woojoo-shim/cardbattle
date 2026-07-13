import { useEffect, useState } from 'react';
import { useRoom } from './state/useRoom.js';
import { Lobby } from './ui/Lobby.js';
import { Battle } from './ui/Battle.js';
import { RoomBrowser } from './ui/RoomBrowser.js';
import { MainMenu } from './ui/MainMenu.js';
import { Splash } from './ui/Splash.js';
import { quickPlay } from './net/client.js';
import { InstallButton, promptInstall } from './ui/InstallButton.js';
import { C, RARITY_BORDER, mono, sans } from './ui/theme.js';
import { CardArt } from './ui/art/CardArt.js';
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

  useEffect(() => {
    if (account === undefined) fetchMe().then((a) => setAccount(a));
  }, [account]);

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
  const { conn, ui, hand, events, error, send, setReady, addBot, removeBot, emotes, sendEmote, reward } = useRoom(connect);
  const myId = conn?.sessionId ?? '';

  if (!ui) {
    return <Centered>{error ? `연결 실패: ${error.message}` : '연결 중…'}</Centered>;
  }
  if (ui.phase === 'lobby') {
    return <Lobby ui={ui} myId={myId} onReady={setReady} onAddBot={addBot} onRemoveBot={removeBot} onExit={onExit} />;
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

      <div className="cb-gate-split">
        {/* LEFT — the summoning portal: the crest glowing inside counter-rotating arcane sigils,
            with the fanned hand dealing in beneath it. */}
        <div style={heroCol}>
          <div style={lightShaft} className="cb-shaft" aria-hidden />
          <span style={kicker}>◈&nbsp;&nbsp;THE&nbsp;ABYSSAL&nbsp;ARENA&nbsp;&nbsp;◈</span>
          <div style={portalWrap}>
            <div style={portalGlow} aria-hidden />
            <SigilRing />
            <div style={{ position: 'relative', zIndex: 2 }}><BrandMark size={104} /></div>
          </div>
          <div style={heroFan} className="cb-hero-float" aria-hidden>
            {HERO_CARDS.map((c, i) => {
              const t = HERO_TINT[c.rarity] ?? HERO_TINT.common;
              return (
                <div key={c.id} className="cb-hero-deal" style={{ ...heroCard(c), animationDelay: `${i * 320}ms` }}>
                  {t.sheen !== 'transparent' && (
                    <div style={{ ...heroFoil, background: `linear-gradient(128deg, transparent 34%, ${t.sheen} 50%, transparent 66%)` }} />
                  )}
                  <div style={heroArtWindow}>
                    <div style={{ ...heroArtGlow, background: `radial-gradient(circle at 50% 44%, ${t.glow}, transparent 68%)` }} />
                    <CardArt id={c.id} size={46} />
                  </div>
                </div>
              );
            })}
          </div>
          <p style={tagline}>여덟이 앉고, 하나가 살아남는다</p>
        </div>

        {/* RIGHT — the admission console: a corner-bracketed panel holding the entry form. */}
        <div style={panelCol}>
          <div style={consolePanel} className="cb-gate-in">
            <span style={cornerTL} aria-hidden /><span style={cornerTR} aria-hidden />
            <span style={cornerBL} aria-hidden /><span style={cornerBR} aria-hidden />

            <div style={consoleHead}>
              <span style={consoleTitle}>입&nbsp;장</span>
              <span style={consoleSub}>ENTER&nbsp;THE&nbsp;ARENA</span>
            </div>
            <div style={ruleWrap} aria-hidden><span className="cb-rule" style={rule} /></div>

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
                  <Icon name="eye" size={18} color={showPw ? FROST.cyan : FROST.faint} />
                </button>
              </div>
              <button className="cb-enter cb-frost" onClick={go} style={enter} aria-label={mode === 'login' ? '로그인' : '회원가입'} disabled={busy}>
                {busy ? '…' : mode === 'login' ? '로그인' : '가입'}&nbsp;<Icon name="arrowRight" size={16} />
              </button>
            </div>
            {error ? <p style={errText}>{error}</p> : <p style={hint}>계정을 만들고 심연의 투기장에 뛰어드세요</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Counter-rotating arcane sigil rings that halo the brand crest — the summoning portal.
 * Three stacked SVG layers spin at different rates/directions; purely decorative. */
function SigilRing() {
  const nodes = Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * Math.PI * 2;
    return { x: 100 + Math.cos(a) * 56, y: 100 + Math.sin(a) * 56, big: i % 3 === 0 };
  });
  return (
    <div style={sigilBox} aria-hidden>
      <svg viewBox="0 0 200 200" style={{ ...sigilLayer, animation: 'cb-spin 64s linear infinite' }}>
        <circle cx="100" cy="100" r="96" fill="none" stroke="rgba(150,210,255,0.5)" strokeWidth="0.6" strokeDasharray="1 7" />
        <circle cx="100" cy="100" r="90" fill="none" stroke="rgba(150,210,255,0.16)" strokeWidth="0.6" />
      </svg>
      <svg viewBox="0 0 200 200" style={{ ...sigilLayer, animation: 'cb-spin-rev 46s linear infinite' }}>
        <circle cx="100" cy="100" r="74" fill="none" stroke="rgba(111,224,255,0.42)" strokeWidth="1" strokeDasharray="10 13" strokeLinecap="round" />
      </svg>
      <svg viewBox="0 0 200 200" style={{ ...sigilLayer, animation: 'cb-spin 92s linear infinite' }}>
        <circle cx="100" cy="100" r="56" fill="none" stroke="rgba(120,170,210,0.32)" strokeWidth="0.6" />
        {nodes.map((n, i) => (
          <circle key={i} cx={n.x} cy={n.y} r={n.big ? 2 : 1}
            fill={n.big ? 'rgba(150,225,255,0.8)' : 'rgba(111,224,255,0.5)'} />
        ))}
      </svg>
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

// Frost-arcane palette — a cold, moonlit-glass mood scoped to the login gate only.
// A deliberate departure from the app's grimy oxblood: midnight navy, cyan and silver.
const FROST = {
  text: '#e8f2ff',
  dim: '#9fb6d4',
  faint: '#5f7899',
  cyan: '#6fe0ff',
  ice: '#a9d8ff',
  border: 'rgba(130,180,230,0.22)',
  borderHi: 'rgba(150,210,255,0.55)',
};

const gateWrap: React.CSSProperties = {
  position: 'relative', minHeight: '100vh', width: '100%', overflow: 'hidden',
  display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: sans,
  background:
    'radial-gradient(60% 42% at 50% 22%, rgba(80,180,240,0.15), transparent 66%),' +
    'radial-gradient(80% 55% at 50% 120%, rgba(90,140,255,0.10), transparent 62%),' +
    'linear-gradient(180deg, #0c1424 0%, #0a1120 52%, #060a14 100%),' +
    '#060a14',
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
  background: 'radial-gradient(125% 115% at 50% 44%, transparent 56%, rgba(4,7,14,0.94) 100%)',
};

// LEFT portal column — crest, sigil, hero hand, tagline stacked and centred.
const heroCol: React.CSSProperties = {
  position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
};
// A volumetric shaft of light descends from above onto the summoning portal — a cinematic
// key light that gives the crest a lit-from-heaven, store-hero drama. Screen-blended cone.
const lightShaft: React.CSSProperties = {
  position: 'absolute', top: -8, left: '50%', zIndex: 0, pointerEvents: 'none',
  width: 'clamp(150px, 22vh, 214px)', height: 'clamp(210px, 32vh, 300px)',
  background: 'linear-gradient(180deg, rgba(150,225,255,0.32), rgba(120,190,255,0.11) 46%, transparent 82%)',
  clipPath: 'polygon(40% 0, 60% 0, 100% 100%, 0 100%)',
  filter: 'blur(7px)', mixBlendMode: 'screen', transformOrigin: '50% 0',
};
// Square stage holding the rotating sigil rings + the crest floating at their centre.
const portalWrap: React.CSSProperties = {
  position: 'relative', width: 'clamp(232px, 32vh, 300px)', height: 'clamp(232px, 32vh, 300px)',
  display: 'grid', placeItems: 'center', margin: '4px 0 2px',
};
const portalGlow: React.CSSProperties = {
  position: 'absolute', left: '50%', top: '50%', width: '128%', height: '128%',
  transform: 'translate(-50%, -50%)', pointerEvents: 'none', borderRadius: '50%',
  background: 'radial-gradient(circle at 50% 46%, rgba(111,224,255,0.22), rgba(90,140,255,0.10) 42%, transparent 70%)',
  filter: 'blur(9px)',
};
const sigilBox: React.CSSProperties = {
  position: 'absolute', left: '50%', top: '50%', width: '112%', height: '112%',
  transform: 'translate(-50%, -50%)', pointerEvents: 'none', zIndex: 1,
};
const sigilLayer: React.CSSProperties = {
  position: 'absolute', inset: 0, width: '100%', height: '100%', willChange: 'transform',
};
const tagline: React.CSSProperties = {
  margin: '14px 0 0', fontFamily: mono, fontSize: 12, letterSpacing: 3, color: FROST.dim, textAlign: 'center',
};

// RIGHT admission-console column.
const panelCol: React.CSSProperties = {
  display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%',
};
const consolePanel: React.CSSProperties = {
  position: 'relative', width: 'min(380px, 92vw)', padding: '26px 24px 22px',
  display: 'flex', flexDirection: 'column', alignItems: 'center', borderRadius: 16,
  background: 'linear-gradient(180deg, rgba(22,34,56,0.80), rgba(12,20,36,0.85))',
  border: `1px solid ${FROST.border}`,
  boxShadow: '0 34px 74px rgba(0,4,16,0.6), inset 0 1px 0 rgba(150,210,255,0.08)',
  backdropFilter: 'blur(10px)',
};
// L-shaped brackets clamping the four corners of the console — engraved fixture look.
function corner(v: 'top' | 'bottom', h: 'left' | 'right'): React.CSSProperties {
  return {
    position: 'absolute', [v]: 8, [h]: 8, width: 13, height: 13, pointerEvents: 'none',
    [`border${v[0].toUpperCase()}${v.slice(1)}`]: `1.5px solid ${FROST.borderHi}`,
    [`border${h[0].toUpperCase()}${h.slice(1)}`]: `1.5px solid ${FROST.borderHi}`,
    opacity: 0.8,
  } as React.CSSProperties;
}
const cornerTL = corner('top', 'left');
const cornerTR = corner('top', 'right');
const cornerBL = corner('bottom', 'left');
const cornerBR = corner('bottom', 'right');
const consoleHead: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, marginBottom: 6,
};
const consoleTitle: React.CSSProperties = {
  fontFamily: sans, fontSize: 22, fontWeight: 900, letterSpacing: 6, color: FROST.text,
  textShadow: '0 2px 14px rgba(0,10,26,0.7), 0 0 20px rgba(111,224,255,0.28)',
};
const consoleSub: React.CSSProperties = {
  fontFamily: mono, fontSize: 9.5, letterSpacing: 5, color: FROST.faint, textTransform: 'uppercase',
};
const kicker: React.CSSProperties = {
  fontFamily: mono, fontSize: 11, letterSpacing: 6, color: FROST.faint, textTransform: 'uppercase',
  marginBottom: 4,
};
const ruleWrap: React.CSSProperties = {
  margin: '12px 0 16px', width: 'min(240px, 78%)', height: 2, borderRadius: 2, overflow: 'hidden',
};
const rule: React.CSSProperties = {
  display: 'block', width: '100%', height: '100%',
  background: 'linear-gradient(90deg, transparent, #6fe0ff 32%, #a9d8ff 68%, transparent)',
  backgroundSize: '220% 100%',
};

const heroFan: React.CSSProperties = {
  position: 'relative', width: 'min(420px, 88vw)', height: 168, margin: '10px 0 4px',
  pointerEvents: 'none', filter: 'drop-shadow(0 22px 44px rgba(0,0,0,0.55))',
};
// Per-rarity accents mirroring the in-battle hand — glow behind the art, foil sheen on epic+.
const HERO_TINT: Record<string, { glow: string; sheen: string }> = {
  common: { glow: 'rgba(120,160,200,0.20)', sheen: 'transparent' },
  rare: { glow: 'rgba(111,224,255,0.30)', sheen: 'transparent' },
  epic: { glow: 'rgba(120,190,255,0.34)', sheen: 'rgba(150,210,255,0.12)' },
  legendary: { glow: 'rgba(150,225,255,0.5)', sheen: 'rgba(200,235,255,0.18)' },
};
function heroCard(c: (typeof HERO_CARDS)[number]): React.CSSProperties {
  const depth = Math.abs(c.a);
  const opacity = depth === 0 ? 1 : depth >= 22 ? 0.7 : 0.88;
  return {
    position: 'absolute', left: '50%', top: '50%', width: 88, height: 122, opacity,
    // Resting fan slot, exposed as CSS vars so the cb-hero-deal keyframe can settle here after
    // its tumble. The inline transform is the no-animation fallback (matches the 100% keyframe).
    ['--tx' as string]: `${c.x}px`, ['--ty' as string]: `${c.y}px`, ['--rot' as string]: `${c.a}deg`, ['--op' as string]: `${opacity}`,
    transform: `translate(-50%, -50%) translate(${c.x}px, ${c.y}px) rotate(${c.a}deg)`,
    // Same woven cardstock material as the hand cards.
    background: [
      'linear-gradient(180deg, rgba(255,255,255,0.055), transparent 22%)',
      'repeating-linear-gradient(45deg, rgba(255,255,255,0.014) 0 1.5px, transparent 1.5px 3.5px)',
      'repeating-linear-gradient(-45deg, rgba(0,0,0,0.05) 0 1.5px, transparent 1.5px 3.5px)',
      `radial-gradient(125% 85% at 50% -8%, ${C.panelHi}, ${C.stage} 68%, ${C.void})`,
    ].join(','),
    border: `1px solid ${RARITY_BORDER[c.rarity]}`, borderRadius: 12,
    display: 'grid', placeItems: 'center', overflow: 'hidden',
    boxShadow: `0 12px 26px rgba(0,0,0,0.5), inset 0 0 22px ${RARITY_BORDER[c.rarity]}22`,
  };
}
const heroFoil: React.CSSProperties = {
  position: 'absolute', inset: 0, borderRadius: 12, pointerEvents: 'none', zIndex: 2, mixBlendMode: 'screen',
};
// Recessed art well matching the hand cards.
const heroArtWindow: React.CSSProperties = {
  position: 'relative', width: 66, height: 66, borderRadius: 10,
  display: 'grid', placeItems: 'center', overflow: 'hidden',
  background: [
    'repeating-linear-gradient(45deg, rgba(255,255,255,0.02) 0 1px, transparent 1px 3px)',
    'radial-gradient(circle at 50% 40%, rgba(0,0,0,0.12), rgba(0,0,0,0.5))',
  ].join(','),
  border: `1px solid ${C.border}`,
  boxShadow: 'inset 0 2px 9px rgba(0,0,0,0.65), inset 0 0 0 1px rgba(255,255,255,0.03)',
};
const heroArtGlow: React.CSSProperties = { position: 'absolute', inset: 0, borderRadius: 10, pointerEvents: 'none' };

const pickLabel: React.CSSProperties = {
  fontFamily: mono, fontSize: 10, letterSpacing: 3, color: C.faint, textTransform: 'uppercase',
  marginBottom: 10,
};
const pickRow: React.CSSProperties = {
  display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 8,
  width: '100%', marginBottom: 18,
};
function pickCell(on: boolean): React.CSSProperties {
  return {
    width: 52, height: 52, padding: 0, cursor: 'pointer', borderRadius: 12,
    display: 'grid', placeItems: 'center',
    background: on ? 'linear-gradient(160deg, rgba(111,224,255,0.18), rgba(120,190,255,0.10))' : 'rgba(16,26,44,0.6)',
    border: `1px solid ${on ? FROST.cyan : FROST.border}`,
    boxShadow: on ? `0 0 0 1px ${FROST.cyan}, 0 0 16px rgba(111,224,255,0.4)` : 'inset 0 1px 0 rgba(150,210,255,0.05)',
    transition: 'border-color .2s, box-shadow .2s, background .2s',
  };
}
// Segmented 로그인 / 회원가입 toggle.
const tabRow: React.CSSProperties = {
  display: 'flex', gap: 4, padding: 4, marginBottom: 16, borderRadius: 12,
  background: 'rgba(14,22,38,0.75)', border: `1px solid ${FROST.border}`,
};
function tab(on: boolean): React.CSSProperties {
  return {
    padding: '9px 22px', fontSize: 14, fontWeight: 800, letterSpacing: 0.5, cursor: 'pointer',
    border: 'none', borderRadius: 9, fontFamily: sans,
    color: on ? '#06121c' : FROST.dim,
    background: on ? 'linear-gradient(100deg, #9fe9ff, #5fc8ee 58%, #3fa9d6)' : 'transparent',
    boxShadow: on ? '0 6px 16px rgba(0,8,20,0.5)' : 'none',
    transition: 'color .2s, background .2s',
  };
}
// A recessed well holding the id + password fields and the submit action.
const authFields: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: 8, width: '100%', padding: 10,
  borderRadius: 12, background: 'rgba(4,8,16,0.4)', border: `1px solid ${FROST.border}`,
  boxShadow: 'inset 0 2px 10px rgba(0,4,12,0.55), inset 0 1px 0 rgba(150,210,255,0.05)',
};
const authInput: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', padding: '12px 14px', fontSize: 16, color: FROST.text, fontFamily: sans,
  background: 'rgba(6,12,22,0.5)', border: `1px solid ${FROST.border}`, borderRadius: 10, outline: 'none',
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
  color: '#06121c', cursor: 'pointer', border: 'none', borderRadius: 10, fontFamily: sans,
  background: 'linear-gradient(100deg, #9fe9ff, #5fc8ee 58%, #3fa9d6)',
  boxShadow: '0 6px 18px rgba(0,10,24,0.55)',
};
const hint: React.CSSProperties = {
  margin: '16px 0 0', fontSize: 12.5, color: FROST.faint, fontFamily: sans, letterSpacing: 0.2,
};
const errText: React.CSSProperties = {
  margin: '16px 0 0', fontSize: 12.5, color: C.enemy, fontFamily: sans, letterSpacing: 0.2,
};
