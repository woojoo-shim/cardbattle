import { useEffect, useState } from 'react';
import { Shop } from './Shop.js';
import { Icon } from './art/Icon.js';
import { CardArt } from './art/CardArt.js';
import { C, mono, sans } from './theme.js';
import { playSfx } from '../audio/sfx.js';
import { MuteButton } from './MuteButton.js';
import type { Account } from '../net/auth.js';

interface Props {
  account: Account;
  onAccount: (a: Account) => void;
  onStart: () => void;        // quick bot game
  onStartCoach: () => void;   // guided bot game (learn by playing)
  onMultiplayer: () => void;  // room browser
  onLogout: () => void;
}

// A display serif for the title — no serif is bundled, so lean on a system stack.
const serif = "'Times New Roman', Georgia, 'Nanum Myeongjo', serif";

type ItemKey = 'start' | 'multi' | 'how' | 'shop' | 'credits' | 'logout';
const ITEMS: { key: ItemKey; label: string; sub: string }[] = [
  { key: 'start', label: '시작', sub: '봇과 빠른 연습' },
  { key: 'multi', label: '멀티플레이어', sub: '방 목록 · 친구와 대전' },
  { key: 'how', label: '플레이 방법', sub: '게임하며 배우기' },
  { key: 'shop', label: '상점', sub: '외형 · 칭호' },
  { key: 'credits', label: '제작진', sub: '' },
  { key: 'logout', label: '나가기', sub: '로그아웃' },
];

// Bumped whenever the onboarding meaningfully changes, so returning players see the invite once more.
const INTRO_SEEN_KEY = 'cb_intro_v3';

export function MainMenu({ account, onAccount, onStart, onStartCoach, onMultiplayer, onLogout }: Props) {
  const [hover, setHover] = useState<ItemKey | null>(null);
  const [shopOpen, setShopOpen] = useState(false);
  const [creditsOpen, setCreditsOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);

  // First-timers are offered a guided practice match once, automatically. A localStorage flag keeps
  // the invite from re-appearing every visit; 플레이 방법 launches the same guided game afterwards.
  useEffect(() => {
    try {
      if (!localStorage.getItem(INTRO_SEEN_KEY)) { setInviteOpen(true); localStorage.setItem(INTRO_SEEN_KEY, '1'); }
    } catch { /* private mode / storage disabled: just skip the auto-invite */ }
  }, []);

  const act = (k: ItemKey) => {
    playSfx(k === 'logout' ? 'back' : 'select');
    if (k === 'start') onStart();
    else if (k === 'multi') onMultiplayer();
    else if (k === 'how') onStartCoach();
    else if (k === 'shop') setShopOpen(true);
    else if (k === 'credits') setCreditsOpen(true);
    else if (k === 'logout') onLogout();
  };

  return (
    <div style={wrap}>
      <style>{heroCss}</style>
      {/* account chip, top-right */}
      <div style={topBar}>
        <MuteButton />
        <button style={goldChip} onClick={() => { playSfx('coin'); setShopOpen(true); }} title="상점 열기">
          <Icon name="coin" size={15} />&nbsp;{account.gold}
        </button>
        <span style={nameChip}>{account.display}</span>
      </div>

      <div style={content} className="cb-gate-in">
        <span style={kicker}>심연의 투기장 · 온라인 카드 배틀</span>
        <h1 style={titleWrap}>
          <LogoLine text="ABYSSAL" style={titleLine} />
          <LogoLine text="ARENA" style={{ ...titleLine, ...titleLine2 }} />
        </h1>
        <div style={flourish} aria-hidden>
          <span style={flourishRule} />
          <span style={flourishGem}>◆</span>
          <span style={flourishRule} />
        </div>
        <span style={byline}>A CARD BATTLE IN THE BACK ROOM</span>

        <nav style={menu}>
          {ITEMS.map((it) => {
            const on = hover === it.key;
            const danger = it.key === 'logout';
            return (
              <button
                key={it.key}
                style={menuItem(on, danger)}
                onClick={() => act(it.key)}
                onMouseEnter={() => { setHover(it.key); playSfx('hover'); }}
                onMouseLeave={() => setHover((h) => (h === it.key ? null : h))}
              >
                <span style={labelWrap}>
                  <span style={caret(on)}>◆</span>
                  <span style={menuLabel}>{it.label}</span>
                </span>
                {it.sub && <span style={menuSub(on)}>{it.sub}</span>}
              </button>
            );
          })}
        </nav>
      </div>

      {/* a fanned hand of real cards filling the right half — the menu reads as a CARD game at a glance */}
      <HeroFan />

      {shopOpen && <Shop account={account} onAccount={onAccount} onClose={() => setShopOpen(false)} />}
      {creditsOpen && <Credits onClose={() => setCreditsOpen(false)} />}
      {inviteOpen && <CoachInvite onClose={() => setInviteOpen(false)} onStart={() => { setInviteOpen(false); onStartCoach(); }} />}
    </div>
  );
}

// A held hand of real cards fanned out on the right of the menu — the single strongest signal that
// this is a CARD game. Five card faces arc around a pivot (middle card highest, outers splay & dip),
// each in a dark cardstock frame with a warm rim. A soft candlelit glow pools behind the fan and the
// whole spread drifts on a slow idle float (cb-hero-float). Purely decorative — aria-hidden.
const FAN_CARDS = ['snipe', 'shield', 'bomb', 'sword', 'potion'] as const;
function HeroFan() {
  const mid = (FAN_CARDS.length - 1) / 2;
  return (
    <div style={fanPos} className="cb-hero-fan" aria-hidden>
      <div style={fanGlow} />
      <div style={fanFloat} className="cb-hero-float">
        {FAN_CARDS.map((id, i) => {
          const off = i - mid;
          const rot = off * 13;
          const x = off * 112;
          const y = Math.abs(off) * 42 - 8; // arc: outer cards dip lower
          return (
            <div
              key={id}
              style={{
                ...fanCard,
                transform: `translate(-50%, -50%) translate(${x}px, ${y}px) rotate(${rot}deg)`,
                zIndex: 10 - Math.abs(off),
              }}
            >
              <CardArt id={id} size={216} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// One line of the wordmark, rendered as engraved gold leaf: a base gold-bevel span with an oxblood
// drop-shadow + amber underglow, plus an identical overlay span carrying only a bright light band that
// sweeps across the letters (mix-blend screen) — the specular glint that sells struck metal.
function LogoLine({ text, style }: { text: string; style: React.CSSProperties }) {
  return (
    <span style={{ position: 'relative', display: 'inline-block' }}>
      <span style={style}>{text}</span>
      <span aria-hidden style={{ ...style, ...logoSheen }} className="cb-logo-sheen">{text}</span>
    </span>
  );
}

// First-run welcome. Rather than a wall of rules, it offers to drop the player straight into a
// guided practice match where the coaching happens live, over a real bot game.
function CoachInvite({ onClose, onStart }: { onClose: () => void; onStart: () => void }) {
  return (
    <div style={creditsBackdrop} onClick={onClose}>
      <div style={creditsCard} onClick={(e) => e.stopPropagation()}>
        <span style={kicker}>환영합니다</span>
        <h2 style={creditsTitle}>플레이하며 배우기</h2>
        <p style={creditsSmall}>
          백 마디 설명보다 한 판이 빠릅니다. 봇과의 연습 대전에 뛰어들면 카드를 내고 대상을 겨누는
          순간마다 안내가 따라붙어요. 몸으로 규칙을 익혀보세요.
        </p>
        <button style={creditsClose} onClick={() => { playSfx('select'); onStart(); }}>게임하며 배우기</button>
        <button style={inviteGhost} onClick={() => { playSfx('back'); onClose(); }}>둘러보기</button>
      </div>
    </div>
  );
}

function Credits({ onClose }: { onClose: () => void }) {
  return (
    <div style={creditsBackdrop} onClick={onClose}>
      <div style={creditsCard} onClick={(e) => e.stopPropagation()}>
        <span style={kicker}>제작진</span>
        <h2 style={creditsTitle}>심연의 투기장</h2>
        <p style={creditsLine}>기획 · 개발 &nbsp;—&nbsp; woojoo</p>
        <p style={creditsLine}>실시간 서버 &nbsp;—&nbsp; Colyseus</p>
        <p style={creditsLine}>렌더링 &nbsp;—&nbsp; React · PixiJS</p>
        <p style={creditsSmall}>Godfield에서 영감을 받은 최후 생존 카드 배틀.</p>
        <button style={creditsClose} onClick={onClose}>닫기</button>
      </div>
    </div>
  );
}

// A clean, flat dark backdrop — no back-room diorama, no falling cards. The title + menu column sits
// on the left, the hero card fan fills the right, and the two are pushed to opposite edges so the
// whole width is in play instead of everything hugging the left margin.
const wrap: React.CSSProperties = {
  position: 'relative', minHeight: '100vh', width: '100%', overflow: 'hidden', boxSizing: 'border-box',
  display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 'clamp(20px, 4vw, 100px)',
  fontFamily: sans, color: C.text,
  padding: '0 clamp(28px, 7vw, 130px)',
  background: 'linear-gradient(180deg, #140b0e 0%, #0b070a 60%, #060305 100%)',
};

const content: React.CSSProperties = {
  position: 'relative', zIndex: 2, flex: '0 1 auto', maxWidth: 660,
  display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left',
};
const kicker: React.CSSProperties = {
  fontFamily: mono, fontSize: 11, letterSpacing: 5, color: C.faint, textTransform: 'uppercase',
  marginBottom: 6,
};
const titleWrap: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 0, margin: '4px 0 2px',
};
const titleLine: React.CSSProperties = {
  display: 'block', fontFamily: serif, fontWeight: 700, lineHeight: 0.92, letterSpacing: 'clamp(4px, 1.2vw, 12px)',
  fontSize: 'clamp(50px, 11vw, 118px)',
  // Engraved gold leaf: a vertical bevel (lit crown → dark foot) clipped to the letterforms.
  background: 'linear-gradient(178deg, #fbf1d0 0%, #ecd07d 30%, #cf9a34 60%, #8f6a24 88%, #6f5220 100%)',
  WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent', color: 'transparent',
  // drop-shadow (not text-shadow) follows the visible gold pixels: a hard oxblood emboss lip,
  // a soft cast shadow for lift, and a warm candlelit halo so the metal glows in the dark room.
  filter:
    'drop-shadow(0 2px 0 #1a0f10) drop-shadow(0 6px 20px rgba(0,0,0,0.62)) drop-shadow(0 0 26px rgba(224,165,60,0.30))',
};
const titleLine2: React.CSSProperties = {
  letterSpacing: 'clamp(8px, 2.4vw, 26px)', marginTop: '-0.06em',
};
// Overlay twin of a logo line: only a narrow light band is opaque, so a specular glint travels
// across the letters. No drop-shadow (it would ghost the whole silhouette); screen-blends onto gold.
const logoSheen: React.CSSProperties = {
  position: 'absolute', left: 0, top: 0, pointerEvents: 'none',
  background:
    'linear-gradient(105deg, transparent 40%, rgba(255,246,220,0.55) 47%, rgba(255,255,255,0.95) 50%, rgba(255,246,220,0.55) 53%, transparent 60%)',
  backgroundSize: '260% 100%', backgroundRepeat: 'no-repeat',
  WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent', color: 'transparent',
  filter: 'none', mixBlendMode: 'screen',
};
// A slim gold rule with a centred gem, set under the wordmark like an engraved crest divider.
const flourish: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 10, marginTop: 14, marginLeft: 2,
  width: 'clamp(220px, 34vw, 380px)',
};
const flourishRule: React.CSSProperties = {
  flex: 1, height: 1,
  background: 'linear-gradient(90deg, transparent, rgba(224,165,60,0.55) 30%, rgba(224,165,60,0.55) 70%, transparent)',
};
const flourishGem: React.CSSProperties = {
  fontSize: 10, color: '#e0a53c', lineHeight: 1, filter: 'drop-shadow(0 0 6px rgba(224,165,60,0.5))',
};

// The hero card fan — an in-flow right column (space-between pushes it to the right edge; the wrap's
// alignItems:center handles vertical centring). Grid-centres the float stage so the fan fills the
// right half of the screen instead of floating as a small badge in the corner.
const fanPos: React.CSSProperties = {
  // flex:1 so the fan claims ALL the space to the right of the title column and centres itself in it —
  // the card fan lands in the middle of the previously-empty right region rather than jammed against
  // the right edge (space-between) or leaving a big gap on the far right (flex-start).
  position: 'relative', flex: '1 1 0', minWidth: 0, zIndex: 1, pointerEvents: 'none',
  display: 'grid', placeItems: 'center',
};
const fanGlow: React.CSSProperties = {
  position: 'absolute', left: '50%', top: '50%', width: 'clamp(560px, 52vw, 840px)', height: 'clamp(560px, 52vw, 840px)',
  transform: 'translate(-50%, -50%)',
  borderRadius: '50%', filter: 'blur(26px)',
  background: 'radial-gradient(circle, rgba(224,165,60,0.18), rgba(150,44,32,0.09) 46%, transparent 72%)',
};
// A sized, relatively-positioned stage the cards are absolutely pinned to (each centred then arced).
const fanFloat: React.CSSProperties = { position: 'relative', width: 'clamp(260px, 22vw, 340px)', height: 'clamp(420px, 44vw, 600px)' };
const fanCard: React.CSSProperties = {
  position: 'absolute', left: '50%', top: '50%',
  display: 'grid', placeItems: 'center', padding: '12px 11px', borderRadius: 12,
  background: 'linear-gradient(180deg, #2a1f13, #1c140b)',
  border: '1px solid rgba(120,96,56,0.55)',
  boxShadow: '0 22px 44px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,225,170,0.12)',
};
// The cards are a fixed pixel size (CardArt size is an SVG width prop, not CSS-clampable), so the
// big fan that looks right on a wide 2000px screen overflows / overlaps the title on narrower
// desktops. Scale the whole fan DOWN in width buckets — the scale rides on fanPos (no inline
// transform there) so it composes cleanly with the fanFloat child's cb-hero-float idle animation.
const heroCss = `
.cb-hero-fan { transform-origin: center center; }
@media (max-width: 1600px) { .cb-hero-fan { transform: scale(0.85); } }
@media (max-width: 1360px) { .cb-hero-fan { transform: scale(0.7); } }
@media (max-width: 1150px) { .cb-hero-fan { transform: scale(0.58); } }
`;
const byline: React.CSSProperties = {
  fontFamily: mono, fontSize: 'clamp(9px, 1.4vw, 12px)', letterSpacing: 4, color: C.dim,
  marginTop: 12, textTransform: 'uppercase',
};

const menu: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6, marginTop: 'clamp(24px, 4.5vh, 48px)',
  paddingLeft: 28,
};
function menuItem(on: boolean, danger: boolean): React.CSSProperties {
  const base = danger ? C.enemy : C.you;
  return {
    // Left-aligned column, label over sub-caption, so the whole menu reads down the left edge.
    position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 1,
    padding: '6px 8px', cursor: 'pointer', border: 'none', background: 'transparent', fontFamily: sans,
    color: on ? '#fff' : 'rgba(226,220,214,0.62)',
    transform: on ? 'translateX(10px)' : 'none',
    textShadow: on ? `0 0 20px ${base}66` : 'none',
    transition: 'color .16s ease, transform .16s ease, text-shadow .16s ease',
  };
}
// The label + its hover caret. Relative so the caret can hang off the label's left edge without
// nudging the label off-centre.
const labelWrap: React.CSSProperties = { position: 'relative', display: 'inline-flex', alignItems: 'center' };
function caret(on: boolean): React.CSSProperties {
  return {
    position: 'absolute', left: -24, top: '50%', fontSize: 13, color: C.you, lineHeight: 1,
    transform: on ? 'translateY(-50%) translateX(0)' : 'translateY(-50%) translateX(-8px)',
    opacity: on ? 1 : 0,
    transition: 'opacity .16s ease, transform .16s ease',
  };
}
const menuLabel: React.CSSProperties = { fontSize: 'clamp(22px, 3.4vw, 30px)', fontWeight: 800, letterSpacing: 1 };
function menuSub(on: boolean): React.CSSProperties {
  return {
    fontFamily: mono, fontSize: 11, letterSpacing: 1, color: on ? C.dim : C.faint,
    transition: 'color .16s ease',
  };
}

const topBar: React.CSSProperties = {
  position: 'fixed', top: 16, right: 16, zIndex: 40, display: 'flex', gap: 8, alignItems: 'center',
};
const goldChip: React.CSSProperties = {
  padding: '7px 14px', fontSize: 13, fontWeight: 700, color: '#e6cf96', cursor: 'pointer',
  borderRadius: 4, border: '1px solid #5a4820', fontFamily: sans,
  background: 'rgba(42,33,14,0.85)',
};
const nameChip: React.CSSProperties = {
  padding: '7px 14px', fontSize: 13, fontWeight: 700, color: C.dim,
  borderRadius: 4, border: `1px solid ${C.border}`, background: 'rgba(20,14,16,0.8)', fontFamily: sans,
};

const creditsBackdrop: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 60, display: 'grid', placeItems: 'center',
  background: 'rgba(4,3,5,0.72)', backdropFilter: 'blur(4px)',
};
const creditsCard: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '30px 34px',
  borderRadius: 4, width: 'min(420px, 90vw)', textAlign: 'center',
  background: '#150e10', border: `1px solid ${C.border}`, borderTop: '2px solid #a4762f',
  boxShadow: '0 18px 40px rgba(0,0,0,0.5)',
};
const creditsTitle: React.CSSProperties = { fontFamily: serif, fontSize: 32, fontWeight: 700, margin: '2px 0 8px', color: '#f3eee6', letterSpacing: 1 };
const creditsLine: React.CSSProperties = { margin: 0, fontSize: 14, color: C.text };
const creditsSmall: React.CSSProperties = { margin: '10px 0 4px', fontSize: 12.5, color: C.faint, lineHeight: 1.5 };
const creditsClose: React.CSSProperties = {
  marginTop: 14, padding: '10px 24px', fontSize: 14, fontWeight: 700, color: '#f4e9cb', cursor: 'pointer',
  border: '1px solid #7f2f1f', borderRadius: 4, fontFamily: sans, background: '#9c3b28',
};
const inviteGhost: React.CSSProperties = {
  marginTop: 8, padding: '8px 20px', fontSize: 13, fontWeight: 700, color: C.dim, cursor: 'pointer',
  border: `1px solid ${C.border}`, borderRadius: 4, fontFamily: sans, background: 'transparent',
};
