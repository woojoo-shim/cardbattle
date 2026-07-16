import { useEffect, useState } from 'react';
import { Shop } from './Shop.js';
import { Icon } from './art/Icon.js';
import { C, mono, sans } from './theme.js';
import { playSfx } from '../audio/sfx.js';
import { MuteButton } from './MuteButton.js';
import type { Account } from '../net/auth.js';

interface Props {
  account: Account;
  onAccount: (a: Account) => void;
  onStart: () => void;        // quick bot game
  onMultiplayer: () => void;  // room browser
  onLogout: () => void;
}

// A dramatic display serif for the title — no serif is bundled, so lean on a system stack to
// get the heavy, engraved manuscript look.
const serif = "'Times New Roman', Georgia, 'Nanum Myeongjo', serif";

// Local ink palette — this whole hub sits on a LIGHT parchment page, so text is dark sepia ink
// (the shared C.text/dim/faint tokens are light-on-dark and would wash out here). Oxblood seal accent.
const INK = '#3a2c18';
const INK_DIM = '#6b5636';
const INK_FAINT = '#94805a';
const SEAL = '#9c3b28';
const PAPER_HI = '#f4e9cb';

type ItemKey = 'start' | 'multi' | 'how' | 'shop' | 'credits' | 'logout';
const ITEMS: { key: ItemKey; label: string; sub: string }[] = [
  { key: 'start', label: '시작', sub: '봇과 빠른 연습' },
  { key: 'multi', label: '멀티플레이어', sub: '방 목록 · 친구와 대전' },
  { key: 'how', label: '플레이 방법', sub: '처음이신가요?' },
  { key: 'shop', label: '상점', sub: '외형 · 칭호' },
  { key: 'credits', label: '제작진', sub: '' },
  { key: 'logout', label: '나가기', sub: '로그아웃' },
];

// Bumped whenever the how-to content meaningfully changes, so returning players see it once more.
const INTRO_SEEN_KEY = 'cb_intro_v1';

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
  const [howOpen, setHowOpen] = useState(false);

  // First-timers get the how-to-play guide once, automatically. A localStorage flag keeps it
  // from re-appearing every visit; it stays reachable from the menu afterwards.
  useEffect(() => {
    try {
      if (!localStorage.getItem(INTRO_SEEN_KEY)) { setHowOpen(true); localStorage.setItem(INTRO_SEEN_KEY, '1'); }
    } catch { /* private mode / storage disabled: just skip the auto-intro */ }
  }, []);

  const act = (k: ItemKey) => {
    playSfx(k === 'logout' ? 'back' : 'select');
    if (k === 'start') onStart();
    else if (k === 'multi') onMultiplayer();
    else if (k === 'how') setHowOpen(true);
    else if (k === 'shop') setShopOpen(true);
    else if (k === 'credits') setCreditsOpen(true);
    else if (k === 'logout') onLogout();
  };

  return (
    <div style={wrap}>
      {/* the scriptorium backdrop: an aged sheet of parchment lit by one warm candle, with paper
          fibre grain and soft foxing at the corners — the whole page reads as old stock, not a room */}
      <div style={sceneLayer} aria-hidden>
        <div style={paperTop} />
        <div style={paperFox} />
        <div style={{ ...paperFox, ...paperFoxR }} />
        <div style={paperGrain} />
        <span style={candleGlow} />
        <div style={inkHairline} />
      </div>
      {/* strewn cards behind everything */}
      <div style={scatterLayer} aria-hidden>
        {SCATTER.map((c, i) => (
          <span key={i} style={scatterCard(c)}>
            <span style={{ fontSize: 13 * c.s, color: 'rgba(156,59,40,0.42)' }}>◈</span>
          </span>
        ))}
      </div>
      <div style={vignette} aria-hidden />
      {/* cards drifting down from the sky — above the vignette so the slow fall reads clearly */}
      <div style={fallLayer} aria-hidden>
        {FALLING.map((c, i) => (
          <span key={`f${i}`} className="cb-cardfall" style={fallingCard(c)}>
            <span style={{ fontSize: 13 * c.s, color: 'rgba(156,59,40,0.42)' }}>◈</span>
          </span>
        ))}
      </div>

      {/* account chip, top-right */}
      <div style={topBar}>
        <MuteButton />
        <button style={goldChip} onClick={() => { playSfx('coin'); setShopOpen(true); }} title="상점 열기">
          <Icon name="coin" size={15} />&nbsp;{account.gold}
        </button>
        <span style={nameChip}>{account.display}</span>
      </div>

      <div style={content} className="cb-gate-in">
        <span style={kicker}>◈&nbsp;&nbsp;심연의 투기장 · 온라인 카드 배틀&nbsp;&nbsp;◈</span>
        <h1 style={titleWrap}>
          <span style={titleStack}>
            <span style={titleGhost} aria-hidden>ABYSSAL</span>
            <span style={titleLine}>ABYSSAL</span>
            <span style={strike} aria-hidden>
              <span className="cb-blade-shine" style={bladeShine} />
              <span className="cb-gem-pulse" style={strikeGem}>◆</span>
            </span>
          </span>
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

      {shopOpen && <Shop account={account} onAccount={onAccount} onClose={() => setShopOpen(false)} />}
      {creditsOpen && <Credits onClose={() => setCreditsOpen(false)} />}
      {howOpen && <HowToPlay onClose={() => setHowOpen(false)} onStart={() => { setHowOpen(false); onStart(); }} />}
    </div>
  );
}

// The first-run guide: the core loop in five plain beats, so a newcomer can sit down and play a
// bot match without guessing. Reachable any time from the "플레이 방법" menu item.
const HOW_STEPS: { n: string; title: string; body: string }[] = [
  { n: '1', title: '최후의 1인', body: '2~8명이 한 테이블에 앉아 서로를 공격합니다. 마지막까지 살아남는 한 명이 승리합니다.' },
  { n: '2', title: '내 턴에 카드', body: '자기 차례가 오면 손에 든 카드를 냅니다. 각 카드는 마나 비용이 있고, 마나가 있으면 한 턴에 여러 장도 낼 수 있습니다.' },
  { n: '3', title: '카드의 종류', body: '공격으로 상대 HP를 깎고, 회복으로 나를 살리고, 방어막으로 피해를 막습니다. 그 밖에 훔치기·역류·간파 같은 특수 카드도 있습니다.' },
  { n: '4', title: '마나는 불어난다', body: '마나는 턴마다 자동으로 차오르고, 라운드가 길어질수록 회복량이 커집니다. \'충전\' 카드로 더 모아 큰 한 방을 노릴 수도 있습니다.' },
  { n: '5', title: '조작', body: '카드를 클릭 → 대상이 필요한 카드는 상대를 고른 뒤 사용됩니다. 낼 카드가 없으면 \'턴 종료\'로 넘기세요. 제한 시간이 지나면 자동으로 넘어갑니다.' },
];

function HowToPlay({ onClose, onStart }: { onClose: () => void; onStart: () => void }) {
  return (
    <div style={creditsBackdrop} onClick={onClose}>
      <div style={howCard} className="cb-gate-in" onClick={(e) => e.stopPropagation()}>
        <span style={kicker}>◈&nbsp;&nbsp;플레이 방법 · HOW TO PLAY&nbsp;&nbsp;◈</span>
        <h2 style={creditsTitle}>처음 오셨나요?</h2>
        <div style={howList}>
          {HOW_STEPS.map((s) => (
            <div key={s.n} style={howRow}>
              <span style={howNum}>{s.n}</span>
              <span style={{ display: 'flex', flexDirection: 'column', gap: 3, textAlign: 'left' }}>
                <span style={howStepTitle}>{s.title}</span>
                <span style={howBody}>{s.body}</span>
              </span>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
          <button style={howGhostBtn} onClick={() => { playSfx('back'); onClose(); }}>닫기</button>
          <button style={creditsClose} onClick={() => { playSfx('select'); onStart(); }}>봇과 연습 시작</button>
        </div>
      </div>
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
  display: 'flex', alignItems: 'center', justifyContent: 'flex-start', fontFamily: sans, color: INK,
  padding: '0 clamp(32px, 8vw, 130px)',
  // A single sheet of aged parchment under warm candlelight — the manuscript mood, no back-room grime.
  background:
    'radial-gradient(62% 46% at 50% 24%, rgba(216,172,98,0.22), transparent 66%),' +
    'radial-gradient(80% 60% at 50% 112%, rgba(120,88,46,0.16), transparent 62%),' +
    'linear-gradient(180deg, #ecdcb6 0%, #e2d0a4 52%, #d3bd8e 100%),' +
    '#e2d0a4',
};
// The scriptorium backdrop: one aged sheet of parchment lit by a warm candle. Built from a few
// soft layers — a sunlit top wash, foxing stains at the corners, paper fibre grain, a candle
// halo, and a faint ruled ink hairline — so the whole page reads as old stock, no room, no grime.
const sceneLayer: React.CSSProperties = {
  position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden',
};
// Fibre grain scattered over the sheet so the flat washes read as pressed paper, not flat colour.
const NOISE =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%25' height='100%25' filter='url(%23n)' opacity='0.6'/></svg>\")";
// A warm sunlit wash across the top of the sheet.
const paperTop: React.CSSProperties = {
  position: 'absolute', left: 0, right: 0, top: 0, height: '46%',
  background: 'linear-gradient(180deg, rgba(255,248,228,0.5), transparent 92%)',
};
// A soft brown foxing/age stain blooming in from a corner.
const paperFox: React.CSSProperties = {
  position: 'absolute', left: '-6%', top: '-8%', width: '46%', height: '52%',
  background: 'radial-gradient(circle at 40% 40%, rgba(140,104,54,0.20), transparent 62%)',
  filter: 'blur(8px)',
};
const paperFoxR: React.CSSProperties = { left: 'auto', right: '-8%', top: 'auto', bottom: '-10%', width: '54%', height: '58%' };
// Pressed paper fibre — the turbulence texture, multiplied faintly into the sheet.
const paperGrain: React.CSSProperties = {
  position: 'absolute', inset: 0, backgroundImage: NOISE, backgroundSize: '150px 150px',
  opacity: 0.10, mixBlendMode: 'multiply',
};
// The candle's warm halo pooling over the page.
const candleGlow: React.CSSProperties = {
  position: 'absolute', left: '50%', top: '20%', width: '70%', height: '70%',
  transform: 'translate(-50%, -50%)', borderRadius: '50%',
  background: 'radial-gradient(ellipse at 50% 50%, rgba(226,178,96,0.22), transparent 66%)',
  filter: 'blur(12px)',
};
// A faint ruled ink line, like the guide-rule on old manuscript stock.
const inkHairline: React.CSSProperties = {
  position: 'absolute', left: 0, right: 0, top: '62%', height: 1,
  background: 'linear-gradient(90deg, transparent, rgba(90,66,34,0.22) 24%, rgba(90,66,34,0.22) 76%, transparent)',
};
const scatterLayer: React.CSSProperties = {
  position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0, opacity: 0.5,
};
// Falling cards ride above the vignette (zIndex 1) but below the content (zIndex 2) so the
// slow drift stays clearly visible against the darkened scene without covering the menu.
const fallLayer: React.CSSProperties = {
  position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1, opacity: 0.6,
};
function fallingCard(c: (typeof FALLING)[number]): React.CSSProperties {
  return {
    position: 'absolute', left: `${c.l}%`, top: 0,
    width: 74 * c.s, height: 104 * c.s, borderRadius: 9,
    display: 'grid', placeItems: 'center', filter: 'blur(0.6px)',
    background: 'linear-gradient(160deg,#3a2c18,#241a10)', border: `1px solid ${C.borderHi}`,
    boxShadow: '0 10px 22px rgba(0,0,0,0.5), inset 0 0 0 2px rgba(244,233,203,0.06)',
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
    background: 'linear-gradient(160deg,#3a2c18,#241a10)', border: `1px solid ${C.borderHi}`,
    boxShadow: '0 10px 22px rgba(0,0,0,0.6), inset 0 0 0 2px rgba(244,233,203,0.06)',
  };
}
const vignette: React.CSSProperties = {
  position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1,
  background: 'radial-gradient(120% 108% at 50% 42%, transparent 52%, rgba(96,68,34,0.42) 100%)',
};

const content: React.CSSProperties = {
  position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
  textAlign: 'left',
};
const kicker: React.CSSProperties = {
  fontFamily: mono, fontSize: 11, letterSpacing: 5, color: INK_FAINT, textTransform: 'uppercase',
  marginBottom: 4,
};
const titleWrap: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 0, margin: '6px 0 2px',
};
const titleLine: React.CSSProperties = {
  display: 'block', fontFamily: serif, fontWeight: 700, lineHeight: 0.92, letterSpacing: 'clamp(4px, 1.2vw, 12px)',
  fontSize: 'clamp(52px, 12vw, 128px)', color: INK,
  textShadow: '0 1px 0 rgba(255,248,228,0.6), 0 3px 8px rgba(90,66,34,0.28)',
};
const titleLine2: React.CSSProperties = {
  color: SEAL, letterSpacing: 'clamp(8px, 2.4vw, 26px)', marginTop: '-0.06em',
};
// The title struck through like the Buckshot cover: a ghosted duplicate shoved down-right behind
// the crisp word, with a bright blade-line bisecting both and a gem punched through its centre.
const titleStack: React.CSSProperties = { position: 'relative', display: 'inline-block' };
const titleGhost: React.CSSProperties = {
  ...titleLine, position: 'absolute', left: 'clamp(5px, 0.7vw, 12px)', top: 'clamp(6px, 0.9vw, 16px)',
  color: 'transparent', WebkitTextStroke: '1px rgba(156,59,40,0.42)', textShadow: 'none', opacity: 0.6,
};
const strike: React.CSSProperties = {
  position: 'absolute', left: '-3%', right: '-3%', top: '52%', height: 'clamp(3px, 0.4vw, 5px)',
  transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: `linear-gradient(90deg, transparent, ${SEAL} 7%, ${SEAL} 93%, transparent)`,
  boxShadow: '0 1px 0 rgba(255,248,228,0.5)',
};
const bladeShine: React.CSSProperties = {
  position: 'absolute', top: 0, bottom: 0, left: 0, width: '30%',
  background: 'linear-gradient(90deg, transparent, rgba(255,244,220,0.9), transparent)',
  filter: 'blur(0.6px)', pointerEvents: 'none',
};
const strikeGem: React.CSSProperties = {
  position: 'relative', fontSize: 'clamp(14px, 1.8vw, 22px)', color: PAPER_HI, lineHeight: 1, padding: '0 10px',
  background: SEAL, borderRadius: 3,
};
const byline: React.CSSProperties = {
  fontFamily: mono, fontSize: 'clamp(9px, 1.4vw, 12px)', letterSpacing: 4, color: INK_DIM,
  marginTop: 10, textTransform: 'uppercase',
};

const menu: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6, marginTop: 'clamp(24px, 4.5vh, 48px)',
  paddingLeft: 28,
};
function menuItem(on: boolean, danger: boolean): React.CSSProperties {
  return {
    // Left-aligned column, label over sub-caption, so the whole menu reads down the left edge.
    position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 1,
    padding: '6px 8px', cursor: 'pointer', border: 'none', background: 'transparent', fontFamily: sans,
    color: on ? (danger ? SEAL : INK) : INK_DIM,
    transform: on ? 'translateX(10px)' : 'none',
    transition: 'color .16s ease, transform .16s ease',
  };
}
// The label + its hover caret. Relative so the caret can hang off the label's left edge without
// nudging the label off-centre.
const labelWrap: React.CSSProperties = { position: 'relative', display: 'inline-flex', alignItems: 'center' };
function caret(on: boolean): React.CSSProperties {
  return {
    position: 'absolute', left: -24, top: '50%', fontSize: 13, color: SEAL, lineHeight: 1,
    transform: on ? 'translateY(-50%) translateX(0)' : 'translateY(-50%) translateX(-8px)',
    opacity: on ? 1 : 0,
    transition: 'opacity .16s ease, transform .16s ease',
  };
}
const menuLabel: React.CSSProperties = { fontSize: 'clamp(22px, 3.4vw, 30px)', fontWeight: 800, letterSpacing: 1 };
function menuSub(on: boolean): React.CSSProperties {
  return {
    fontFamily: mono, fontSize: 11, letterSpacing: 1, color: on ? INK_DIM : INK_FAINT,
    transition: 'color .16s ease',
  };
}

const topBar: React.CSSProperties = {
  position: 'fixed', top: 16, right: 16, zIndex: 40, display: 'flex', gap: 8, alignItems: 'center',
};
const goldChip: React.CSSProperties = {
  padding: '7px 14px', fontSize: 13, fontWeight: 800, color: PAPER_HI, cursor: 'pointer',
  borderRadius: 999, border: '1px solid #7a2f20', fontFamily: sans,
  background: `linear-gradient(180deg, ${SEAL}, #7f2f1f)`,
  boxShadow: '0 4px 12px rgba(60,20,10,0.28)',
};
const nameChip: React.CSSProperties = {
  padding: '7px 14px', fontSize: 13, fontWeight: 700, color: INK_DIM,
  borderRadius: 999, border: '1px solid rgba(90,66,34,0.4)', background: 'rgba(247,238,214,0.6)', fontFamily: sans,
};

const creditsBackdrop: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 60, display: 'grid', placeItems: 'center',
  background: 'rgba(40,28,12,0.6)', backdropFilter: 'blur(4px)',
};
// The modals are torn parchment slips: cream paper, sepia ink, pressed shadow — same stock as the page.
const parchmentCard = [
  'radial-gradient(120% 85% at 18% 8%, rgba(255,250,232,0.5), transparent 52%)',
  'linear-gradient(180deg, #eddcb2, #e0cd9c)',
].join(',');
const creditsCard: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '28px 34px',
  borderRadius: 16, width: 'min(420px, 90vw)', textAlign: 'center',
  background: parchmentCard, border: '1px solid rgba(90,66,34,0.4)',
  boxShadow: '0 30px 68px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,250,232,0.6)',
};
const creditsTitle: React.CSSProperties = { fontFamily: serif, fontSize: 34, fontWeight: 700, margin: '2px 0 8px', color: INK, letterSpacing: 2 };
// The how-to panel is a taller card holding the five numbered beats.
const howCard: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '26px 30px 24px',
  borderRadius: 16, width: 'min(500px, 92vw)', maxHeight: '86vh', overflowY: 'auto', textAlign: 'center',
  background: parchmentCard, border: '1px solid rgba(90,66,34,0.4)',
  boxShadow: '0 30px 68px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,250,232,0.6)',
};
const howList: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 12, width: '100%', margin: '10px 0 4px' };
const howRow: React.CSSProperties = {
  display: 'flex', gap: 14, alignItems: 'flex-start', padding: '12px 14px', borderRadius: 12,
  background: 'rgba(206,182,132,0.36)', border: '1px solid rgba(90,66,34,0.3)',
};
const howNum: React.CSSProperties = {
  flexShrink: 0, width: 30, height: 30, borderRadius: '50%', display: 'grid', placeItems: 'center',
  fontFamily: serif, fontSize: 16, fontWeight: 700, color: PAPER_HI,
  background: `radial-gradient(circle at 40% 34%, #bd4e34, ${SEAL} 72%)`, boxShadow: '0 2px 7px rgba(60,20,10,0.4)',
};
const howStepTitle: React.CSSProperties = { fontSize: 15.5, fontWeight: 800, color: INK, letterSpacing: 0.4 };
const howBody: React.CSSProperties = { fontSize: 13, lineHeight: 1.55, color: INK_DIM };
const howGhostBtn: React.CSSProperties = {
  padding: '10px 22px', fontSize: 14, fontWeight: 700, color: INK_DIM, cursor: 'pointer',
  border: '1px solid rgba(90,66,34,0.4)', borderRadius: 10, background: 'rgba(247,238,214,0.5)', fontFamily: sans,
};
const creditsLine: React.CSSProperties = { margin: 0, fontSize: 14, color: INK };
const creditsSmall: React.CSSProperties = { margin: '10px 0 4px', fontSize: 12.5, color: INK_FAINT, lineHeight: 1.4 };
const creditsClose: React.CSSProperties = {
  marginTop: 12, padding: '10px 24px', fontSize: 14, fontWeight: 800, color: PAPER_HI, cursor: 'pointer',
  border: 'none', borderRadius: 10, fontFamily: sans,
  background: `linear-gradient(100deg, #b8492f, ${SEAL} 56%, #7f2f1f)`, boxShadow: '0 6px 15px rgba(60,20,10,0.35)',
};
