import { useState } from 'react';
import { Shop } from './Shop.js';
import { Icon } from './art/Icon.js';
import { C, mono, sans } from './theme.js';
import type { Account } from '../net/auth.js';

interface Props {
  account: Account;
  onAccount: (a: Account) => void;
  onStart: () => void;        // quick bot game
  onMultiplayer: () => void;  // room browser
  onLogout: () => void;
}

// A dramatic display serif for the title — no serif is bundled, so lean on a system stack to
// get the heavy, engraved "back-room sign" look (à la Buckshot Roulette's cover).
const serif = "'Times New Roman', Georgia, 'Nanum Myeongjo', serif";

type ItemKey = 'start' | 'multi' | 'shop' | 'credits' | 'logout';
const ITEMS: { key: ItemKey; label: string; sub: string }[] = [
  { key: 'start', label: '시작', sub: '봇과 빠른 연습' },
  { key: 'multi', label: '멀티플레이어', sub: '방 목록 · 친구와 대전' },
  { key: 'shop', label: '상점', sub: '외형 · 칭호' },
  { key: 'credits', label: '제작진', sub: '' },
  { key: 'logout', label: '나가기', sub: '로그아웃' },
];

// Face-down cards drifting down from the sky — slow ("느릭느릭"), staggered across the whole
// width and depth so the back room always has a gentle rain of cards. Deep/small cards fall
// slower & dimmer (further away); near/large cards fall a touch faster & brighter — a parallax
// that sells the height of the fall. Deterministic so it never reshuffles on re-render.
const FALLING: { l: number; dur: number; delay: number; r0: number; r1: number; o: number; s: number }[] = [
  { l: 6, dur: 11, delay: 0, r0: -20, r1: 160, o: 0.42, s: 0.8 },
  { l: 15, dur: 14, delay: -5, r0: 30, r1: 260, o: 0.5, s: 0.95 },
  { l: 23, dur: 17, delay: -9, r0: -10, r1: 200, o: 0.32, s: 0.68 },
  { l: 31, dur: 12, delay: -3, r0: 15, r1: 300, o: 0.55, s: 1.05 },
  { l: 40, dur: 16, delay: -11, r0: -25, r1: 180, o: 0.34, s: 0.72 },
  { l: 48, dur: 10, delay: -6, r0: 20, r1: 240, o: 0.6, s: 1.15 },
  { l: 56, dur: 18, delay: -2, r0: -5, r1: 340, o: 0.3, s: 0.6 },
  { l: 64, dur: 13, delay: -8, r0: 35, r1: 210, o: 0.5, s: 1.0 },
  { l: 72, dur: 15, delay: -4, r0: -18, r1: 150, o: 0.36, s: 0.75 },
  { l: 81, dur: 11, delay: -7, r0: 24, r1: 280, o: 0.54, s: 1.1 },
  { l: 89, dur: 16, delay: -13, r0: -12, r1: 190, o: 0.3, s: 0.66 },
  { l: 95, dur: 12, delay: -1, r0: 28, r1: 230, o: 0.44, s: 0.9 },
];

// Face-down cards strewn around the frame like spent shells — dense at the edges, clearing the
// centre so the title + menu read. Deterministic layout so it doesn't jitter on re-render.
const SCATTER: { l: number; t: number; r: number; o: number; s: number }[] = [
  { l: 4, t: 10, r: -19, o: 0.30, s: 1.0 },
  { l: 12, t: 30, r: 13, o: 0.22, s: 0.9 },
  { l: 7, t: 55, r: -8, o: 0.27, s: 1.1 },
  { l: 15, t: 80, r: 24, o: 0.20, s: 0.95 },
  { l: 33, t: 92, r: -7, o: 0.17, s: 1.0 },
  { l: 60, t: 91, r: 15, o: 0.19, s: 1.05 },
  { l: 85, t: 82, r: -22, o: 0.26, s: 1.0 },
  { l: 93, t: 58, r: 9, o: 0.22, s: 0.9 },
  { l: 88, t: 32, r: -13, o: 0.27, s: 1.1 },
  { l: 80, t: 11, r: 20, o: 0.20, s: 0.95 },
  { l: 55, t: 7, r: -11, o: 0.16, s: 1.0 },
  { l: 30, t: 8, r: 17, o: 0.20, s: 1.0 },
];

export function MainMenu({ account, onAccount, onStart, onMultiplayer, onLogout }: Props) {
  const [hover, setHover] = useState<ItemKey | null>(null);
  const [shopOpen, setShopOpen] = useState(false);
  const [creditsOpen, setCreditsOpen] = useState(false);

  const act = (k: ItemKey) => {
    if (k === 'start') onStart();
    else if (k === 'multi') onMultiplayer();
    else if (k === 'shop') setShopOpen(true);
    else if (k === 'credits') setCreditsOpen(true);
    else if (k === 'logout') onLogout();
  };

  return (
    <div style={wrap}>
      {/* the back-room scene: a receding floor plane, a far wall, and the table's lamp pooling
          up from below — depth behind the falling cards, not just a flat wash */}
      <div style={sceneLayer} aria-hidden>
        <div style={sceneWall} />
        <div style={sceneFloor} />
        <div style={sceneHorizon} />
        <div style={sceneLampPool} />
      </div>
      {/* strewn cards behind everything */}
      <div style={scatterLayer} aria-hidden>
        {SCATTER.map((c, i) => (
          <span key={i} style={scatterCard(c)}>
            <span style={{ fontSize: 13 * c.s, color: 'rgba(56,232,200,0.4)' }}>◈</span>
          </span>
        ))}
      </div>
      <div style={vignette} aria-hidden />
      {/* cards drifting down from the sky — above the vignette so the slow fall reads clearly */}
      <div style={fallLayer} aria-hidden>
        {FALLING.map((c, i) => (
          <span key={`f${i}`} className="cb-cardfall" style={fallingCard(c)}>
            <span style={{ fontSize: 13 * c.s, color: 'rgba(56,232,200,0.4)' }}>◈</span>
          </span>
        ))}
      </div>

      {/* account chip, top-right */}
      <div style={topBar}>
        <button style={goldChip} onClick={() => setShopOpen(true)} title="상점 열기">
          <Icon name="coin" size={15} />&nbsp;{account.gold}
        </button>
        <span style={nameChip}>{account.display}</span>
      </div>

      <div style={content} className="cb-gate-in">
        <span style={kicker}>◈&nbsp;&nbsp;심연의 투기장 · 온라인 카드 배틀&nbsp;&nbsp;◈</span>
        <h1 style={titleWrap}>
          <span style={titleLine}>ABYSSAL</span>
          <span style={{ ...titleLine, ...titleLine2 }}>ARENA</span>
        </h1>
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
                onMouseEnter={() => setHover(it.key)}
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

      {shopOpen && <Shop account={account} onAccount={onAccount} onClose={() => setShopOpen(false)} />}
      {creditsOpen && <Credits onClose={() => setCreditsOpen(false)} />}
    </div>
  );
}

function Credits({ onClose }: { onClose: () => void }) {
  return (
    <div style={creditsBackdrop} onClick={onClose}>
      <div style={creditsCard} onClick={(e) => e.stopPropagation()}>
        <span style={kicker}>◈&nbsp;&nbsp;제작진&nbsp;&nbsp;◈</span>
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

const wrap: React.CSSProperties = {
  position: 'relative', minHeight: '100vh', width: '100%', overflow: 'hidden',
  display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: sans, color: C.text,
  // Oxblood back-room haze bleeding down into wet black — the arena mood, carried to the menu.
  background:
    'radial-gradient(58% 40% at 50% 30%, rgba(126,38,62,0.20), transparent 68%),' +
    'radial-gradient(70% 50% at 50% 108%, rgba(56,232,200,0.06), transparent 62%),' +
    'linear-gradient(180deg, #140b0e 0%, #0d070a 52%, #060305 100%),' +
    '#060305',
};
// The back-room environment behind the cards: a far wall up top, a floor plane receding to a
// horizon a little above centre, and the table lamp glowing up from the bottom edge.
const sceneLayer: React.CSSProperties = {
  position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden',
};
const sceneWall: React.CSSProperties = {
  position: 'absolute', left: 0, right: 0, top: 0, height: '58%',
  background:
    'radial-gradient(120% 90% at 50% 100%, rgba(126,38,62,0.16), transparent 70%),' +
    'linear-gradient(180deg, #0a0508 0%, #100a0d 60%, #150c10 100%)',
};
// The floor: a lighter plane skewed to read as receding away from the viewer.
const sceneFloor: React.CSSProperties = {
  position: 'absolute', left: '-20%', right: '-20%', bottom: 0, height: '46%',
  background:
    'radial-gradient(80% 120% at 50% 120%, rgba(238,176,78,0.10), transparent 60%),' +
    'linear-gradient(180deg, #160d10 0%, #0c0709 70%, #060305 100%)',
  transform: 'perspective(520px) rotateX(58deg)', transformOrigin: 'center top',
  boxShadow: 'inset 0 60px 80px rgba(0,0,0,0.6)',
};
// A hairline of light where wall meets floor — the room's vanishing seam.
const sceneHorizon: React.CSSProperties = {
  position: 'absolute', left: 0, right: 0, top: '54%', height: 2,
  background: 'linear-gradient(90deg, transparent, rgba(238,176,78,0.28) 30%, rgba(238,176,78,0.3) 70%, transparent)',
  filter: 'blur(1px)',
};
// The table lamp's pool welling up from the bottom edge.
const sceneLampPool: React.CSSProperties = {
  position: 'absolute', left: '50%', bottom: '-8%', width: '70%', height: '46%',
  transform: 'translateX(-50%)', borderRadius: '50%',
  background: 'radial-gradient(ellipse at 50% 50%, rgba(238,176,78,0.14), rgba(238,176,78,0.04) 55%, transparent 72%)',
  filter: 'blur(6px)',
};
const scatterLayer: React.CSSProperties = {
  position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
};
// Falling cards ride above the vignette (zIndex 1) but below the content (zIndex 2) so the
// slow drift stays clearly visible against the darkened scene without covering the menu.
const fallLayer: React.CSSProperties = {
  position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1,
};
function fallingCard(c: (typeof FALLING)[number]): React.CSSProperties {
  return {
    position: 'absolute', left: `${c.l}%`, top: 0,
    width: 74 * c.s, height: 104 * c.s, borderRadius: 9,
    display: 'grid', placeItems: 'center', filter: 'blur(0.6px)',
    background: 'linear-gradient(160deg,#1b2336,#0c1120)', border: `1px solid ${C.border}`,
    boxShadow: '0 10px 22px rgba(0,0,0,0.5), inset 0 0 0 2px rgba(56,232,200,0.05)',
    animation: `cb-cardfall ${c.dur}s linear ${c.delay}s infinite`,
    ['--r0' as string]: `${c.r0}deg`, ['--r1' as string]: `${c.r1}deg`, ['--o' as string]: `${c.o}`,
  };
}
function scatterCard(c: { l: number; t: number; r: number; o: number; s: number }): React.CSSProperties {
  return {
    position: 'absolute', left: `${c.l}%`, top: `${c.t}%`,
    width: 76 * c.s, height: 106 * c.s, borderRadius: 9,
    transform: `translate(-50%,-50%) rotate(${c.r}deg)`, opacity: c.o,
    display: 'grid', placeItems: 'center', filter: 'blur(0.4px)',
    background: 'linear-gradient(160deg,#1b2336,#0c1120)', border: `1px solid ${C.border}`,
    boxShadow: '0 10px 22px rgba(0,0,0,0.6), inset 0 0 0 2px rgba(56,232,200,0.05)',
  };
}
const vignette: React.CSSProperties = {
  position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1,
  background: 'radial-gradient(120% 108% at 50% 42%, transparent 44%, rgba(4,3,5,0.9) 100%)',
};

const content: React.CSSProperties = {
  position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center',
  padding: '0 20px', textAlign: 'center',
};
const kicker: React.CSSProperties = {
  fontFamily: mono, fontSize: 11, letterSpacing: 5, color: C.faint, textTransform: 'uppercase',
  marginBottom: 4,
};
const titleWrap: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, margin: '6px 0 2px',
};
const titleLine: React.CSSProperties = {
  fontFamily: serif, fontWeight: 700, lineHeight: 0.92, letterSpacing: 'clamp(4px, 1.2vw, 12px)',
  fontSize: 'clamp(52px, 12vw, 128px)', color: '#f3eee6',
  textShadow: '0 3px 0 #1a0f10, 0 10px 30px rgba(0,0,0,0.7), 0 0 40px rgba(126,38,62,0.4)',
};
const titleLine2: React.CSSProperties = {
  color: '#e7d8c6', letterSpacing: 'clamp(8px, 2.4vw, 26px)', marginTop: '-0.06em',
};
const byline: React.CSSProperties = {
  fontFamily: mono, fontSize: 'clamp(9px, 1.4vw, 12px)', letterSpacing: 4, color: C.dim,
  marginTop: 10, textTransform: 'uppercase',
};

const menu: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, marginTop: 'clamp(28px, 5vh, 54px)',
};
function menuItem(on: boolean, danger: boolean): React.CSSProperties {
  const base = danger ? C.enemy : C.you;
  return {
    // A centred column: label row on top, sub-caption centred beneath — so the labels line up
    // dead-centre on the screen regardless of caption width.
    position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
    padding: '6px 18px', cursor: 'pointer', border: 'none', background: 'transparent', fontFamily: sans,
    color: on ? '#fff' : 'rgba(226,220,214,0.62)',
    transform: on ? 'translateX(6px)' : 'none',
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
  padding: '7px 14px', fontSize: 13, fontWeight: 800, color: '#ffe08a', cursor: 'pointer',
  borderRadius: 999, border: '1px solid #6a5620', fontFamily: sans,
  background: 'linear-gradient(180deg, rgba(70,56,16,0.9), rgba(40,32,10,0.9))',
  boxShadow: '0 6px 16px rgba(180,140,30,0.25)',
};
const nameChip: React.CSSProperties = {
  padding: '7px 14px', fontSize: 13, fontWeight: 700, color: C.dim,
  borderRadius: 999, border: `1px solid ${C.border}`, background: 'rgba(20,14,16,0.8)', fontFamily: sans,
};

const creditsBackdrop: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 60, display: 'grid', placeItems: 'center',
  background: 'rgba(4,3,5,0.72)', backdropFilter: 'blur(4px)',
};
const creditsCard: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '28px 34px',
  borderRadius: 16, width: 'min(420px, 90vw)', textAlign: 'center',
  background: 'linear-gradient(180deg, #1a1013, #100a0c)', border: `1px solid ${C.border}`,
  boxShadow: '0 30px 70px rgba(0,0,0,0.6)',
};
const creditsTitle: React.CSSProperties = { fontFamily: serif, fontSize: 34, fontWeight: 700, margin: '2px 0 8px', color: '#f3eee6', letterSpacing: 2 };
const creditsLine: React.CSSProperties = { margin: 0, fontSize: 14, color: C.text };
const creditsSmall: React.CSSProperties = { margin: '10px 0 4px', fontSize: 12.5, color: C.faint, lineHeight: 1.4 };
const creditsClose: React.CSSProperties = {
  marginTop: 12, padding: '10px 24px', fontSize: 14, fontWeight: 800, color: '#fff', cursor: 'pointer',
  border: 'none', borderRadius: 10, fontFamily: sans,
  background: 'linear-gradient(100deg, #6d4bff, #5b3cff 60%, #2fb8a0)', boxShadow: '0 6px 18px rgba(123,92,255,0.4)',
};
