import { useEffect, useState } from 'react';
import { Shop } from './Shop.js';
import { DeckBuilder } from './DeckBuilder.js';
import { Icon } from './art/Icon.js';
import type { IconName } from './art/Icon.js';
import { CardArt } from './art/CardArt.js';
import { CARD_DEFS } from '@cardbattle/shared';
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

type ItemKey = 'start' | 'multi' | 'how' | 'deck' | 'shop' | 'credits' | 'logout';
// Matchmaking-first, Clash-Royale style: the hero action RUNS A MATCH (auto-finds a 1v1 opponent,
// fills with a bot if none turns up). Friend rooms (create/join by code) are the secondary path,
// not the headline — we lead with "find a match", not "invite to a room".
const ITEMS: { key: ItemKey; label: string; sub: string; icon: IconName }[] = [
  { key: 'start', label: '대전 찾기', sub: '1대1 매칭 · 상대 자동 탐색', icon: 'swords' },
  { key: 'multi', label: '친구와 대전', sub: '코드로 방 만들기 · 참가', icon: 'chain' },
  { key: 'how', label: '플레이 방법', sub: '게임하며 배우기', icon: 'target' },
  { key: 'deck', label: '덱 편성', sub: '카드 수집 · 덱 만들기', icon: 'hand' },
  { key: 'shop', label: '상점', sub: '외형 · 칭호', icon: 'coin' },
  { key: 'credits', label: '제작진', sub: '', icon: 'star' },
  { key: 'logout', label: '나가기', sub: '로그아웃', icon: 'arrowRight' },
];

// Bumped whenever the onboarding meaningfully changes, so returning players see the invite once more.
const INTRO_SESSION_KEY = 'cb_intro_session';

// The first-run MENU GUIDE. Instead of yanking a newcomer straight into a practice room, we walk them
// through the menu itself — each step spotlights one option and explains it, ending with an invite to
// try the guided practice match. The last step's button is what actually launches the coach game.
const GUIDE_STEPS: { target: ItemKey | null; title: string; text: string; final?: boolean }[] = [
  { target: null, title: '환영합니다!', text: '처음이시죠? 어떤 버튼이 무슨 역할인지 하나씩 알려드릴게요.\n아래 «다음» 버튼을 눌러 따라와 주세요.' },
  { target: 'start', title: '① 대전 찾기', text: '누르면 곧바로 다른 사람과 1대1 대결이 시작돼요.\n상대가 없으면 컴퓨터(봇)가 대신 상대해 줍니다.' },
  { target: 'multi', title: '② 친구와 대전', text: '방을 만들면 코드가 나와요.\n그 코드를 친구에게 보내면 같이 대결할 수 있어요.' },
  { target: 'deck', title: '③ 덱 편성', text: '내가 쓸 카드 묶음을 「덱」이라고 해요.\n좋은 카드를 모아 덱을 짜면 대결이 훨씬 쉬워져요.' },
  { target: 'how', title: '④ 플레이 방법', text: '컴퓨터랑 연습 대결을 하면서 직접 배워봐요.\n한 판만 해보면 금방 익숙해져요. 지금 해볼까요?', final: true },
];

export function MainMenu({ account, onAccount, onStart, onStartCoach, onMultiplayer, onLogout }: Props) {
  const [hover, setHover] = useState<ItemKey | null>(null);
  const [shopOpen, setShopOpen] = useState(false);
  const [deckOpen, setDeckOpen] = useState(false);
  const [creditsOpen, setCreditsOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [guideStep, setGuideStep] = useState<number | null>(null);

  // A player with no games yet gets a guided tour OF THE MENU (not thrown into a match) so they learn
  // where everything is first — and only start the practice when they choose to on the final step.
  // Gated per browser session (not a one-time flag) so it keeps greeting fresh accounts/guests, but
  // won't relaunch every time they return to the menu this session. 플레이 방법 replays the practice.
  useEffect(() => {
    const fresh = account.wins === 0 && account.losses === 0;
    if (!fresh) return;
    try {
      if (!sessionStorage.getItem(INTRO_SESSION_KEY)) { sessionStorage.setItem(INTRO_SESSION_KEY, '1'); setGuideStep(0); }
    } catch { setGuideStep(0); }
  }, []);

  const guideTarget = guideStep !== null ? GUIDE_STEPS[guideStep].target : null;
  const nextGuide = () => { playSfx('select'); setGuideStep((s) => (s === null ? null : Math.min(s + 1, GUIDE_STEPS.length - 1))); };
  const endGuide = () => { playSfx('back'); setGuideStep(null); };
  const startPractice = () => { setGuideStep(null); onStartCoach(); };

  const act = (k: ItemKey) => {
    playSfx(k === 'logout' ? 'back' : 'select');
    if (k === 'start') onStart();
    else if (k === 'multi') onMultiplayer();
    else if (k === 'how') setGuideStep(0);
    else if (k === 'deck') setDeckOpen(true);
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
            const guided = guideTarget === it.key;
            const on = hover === it.key || guided;
            const danger = it.key === 'logout';
            return (
              <button
                key={it.key}
                style={{ ...menuItem(on, danger), ...(guided ? menuHi : null) }}
                className={guided ? 'cb-guide-hi' : undefined}
                onClick={() => act(it.key)}
                onMouseEnter={() => { setHover(it.key); playSfx('hover'); }}
                onMouseLeave={() => setHover((h) => (h === it.key ? null : h))}
              >
                <span style={medallion(on, danger)}>
                  <Icon name={it.icon} size={20} color={danger ? C.enemy : (on ? '#f4e4c0' : C.you)} />
                </span>
                <span style={itemText}>
                  <span style={menuLabel}>{it.label}</span>
                  {it.sub && <span style={menuSub(on)}>{it.sub}</span>}
                </span>
                <span style={itemArrow(on)}>›</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* a fanned hand of real cards filling the right half — the menu reads as a CARD game at a glance */}
      <HeroFan />

      {guideStep !== null && (
        <MenuGuide step={guideStep} onNext={nextGuide} onSkip={endGuide} onStart={startPractice} />
      )}

      {shopOpen && <Shop account={account} onAccount={onAccount} onClose={() => setShopOpen(false)} />}
      {deckOpen && <DeckBuilder account={account} onAccount={onAccount} onClose={() => setDeckOpen(false)} />}
      {creditsOpen && <Credits onClose={() => setCreditsOpen(false)} />}
      {inviteOpen && <CoachInvite onClose={() => setInviteOpen(false)} onStart={() => { setInviteOpen(false); onStartCoach(); }} />}
    </div>
  );
}

// A held hand of REAL cards fanned out on the right of the menu — the single strongest signal that
// this is a CARD game. Five faces arc around a pivot (middle card highest, outers splay & dip). Each
// is the actual in-game card: the ornate carved stone frame (card-frame.png) with the illustration
// dropped into the recessed art window and the card name on the plaque — identical to the hand cards
// in battle, so the menu reads as the same game. A candlelit glow pools behind; the whole spread
// drifts on a slow idle float (cb-hero-float). Purely decorative — aria-hidden.
const FAN_CARDS = ['archer', 'cleric', 'firebolt', 'knight', 'strike'] as const;
const FAN_CARD_W = 220; // px width of one framed card (2:3 → 330 tall)
function HeroFan() {
  const mid = (FAN_CARDS.length - 1) / 2;
  return (
    <div style={fanPos} className="cb-hero-fan" aria-hidden>
      <div style={fanGlow} />
      <div style={fanFloat} className="cb-hero-float">
        {FAN_CARDS.map((id, i) => {
          const off = i - mid;
          const rot = off * 13;
          const x = off * 132;
          const y = Math.abs(off) * 50 - 10; // arc: outer cards dip lower
          const name = CARD_DEFS[id]?.name ?? '';
          return (
            <div
              key={id}
              style={{
                ...fanCard,
                transform: `translate(-50%, -50%) translate(${x}px, ${y}px) rotate(${rot}deg)`,
                zIndex: 10 - Math.abs(off),
              }}
            >
              <span style={fanArtWindow}><CardArt id={id} size="100%" /></span>
              <span style={fanNameplate}><span style={fanName}>{name}</span></span>
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

// The first-run menu tour. A callout pinned to the bottom-centre that steps through the menu, while
// the option it's describing pulses on the left (cb-guide-hi). The final step launches the practice.
function MenuGuide({ step, onNext, onSkip, onStart }: {
  step: number; onNext: () => void; onSkip: () => void; onStart: () => void;
}) {
  const s = GUIDE_STEPS[step];
  const last = step === GUIDE_STEPS.length - 1;
  const targetLabel = s.target ? ITEMS.find((i) => i.key === s.target)?.label : null;
  return (
    <div style={guideWrap}>
      <div style={guideCard} className="cb-guide-in" key={step}>
        <div style={guideHead}>
          <span style={guideKicker}>가이드 {step + 1} / {GUIDE_STEPS.length}</span>
          <button style={guideSkip} onClick={onSkip}>건너뛰기</button>
        </div>
        {targetLabel && <span style={guidePoint} className="cb-guide-arrow">←&nbsp;왼쪽 메뉴 «{targetLabel}»</span>}
        <h3 style={guideTitle}>{s.title}</h3>
        <p style={guideText}>{s.text}</p>
        <div style={guideFoot}>
          <div style={guideDots}>
            {GUIDE_STEPS.map((_, i) => <span key={i} style={guideDot(i === step)} />)}
          </div>
          {last
            ? <button style={guidePrimary} onClick={onStart}>지금 해보기</button>
            : <button style={guidePrimary} onClick={onNext}>다음&nbsp;→</button>}
        </div>
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
  background: 'linear-gradient(180deg, #101422 0%, #0a0d16 60%, #06080f 100%)',
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
  position: 'absolute', left: '50%', top: '50%', width: 'clamp(720px, 62vw, 1040px)', height: 'clamp(720px, 62vw, 1040px)',
  transform: 'translate(-50%, -50%)',
  borderRadius: '50%', filter: 'blur(26px)',
  background: 'radial-gradient(circle, rgba(224,165,60,0.2), rgba(158,58,40,0.1) 46%, transparent 72%)',
};
// A sized, relatively-positioned stage the cards are absolutely pinned to (each centred then arced).
const fanFloat: React.CSSProperties = { position: 'relative', width: 'clamp(340px, 28vw, 460px)', height: 'clamp(540px, 56vw, 780px)' };
// The real carved stone card frame (same art as the battle hand cards). The illustration and the
// name plaque are absolutely positioned into the frame's carved cavities so they line up with the png.
const fanCard: React.CSSProperties = {
  position: 'absolute', left: '50%', top: '50%',
  width: FAN_CARD_W, aspectRatio: '2 / 3',
  backgroundImage: 'url(/card-frame.png)', backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat',
  filter: 'drop-shadow(0 22px 40px rgba(0,0,0,0.6))',
};
const fanArtWindow: React.CSSProperties = {
  position: 'absolute', left: '12%', top: '14.5%', width: '76%', height: '60%',
  display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: 6,
};
const fanNameplate: React.CSSProperties = {
  position: 'absolute', left: '13%', top: '81%', width: '74%', height: '11.5%',
  display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center',
  padding: '0 4px', pointerEvents: 'none',
};
const fanName: React.CSSProperties = {
  fontFamily: sans, fontWeight: 800, lineHeight: 1.02,
  fontSize: Math.round(FAN_CARD_W * 0.088), letterSpacing: '-0.01em', color: '#2c1d0d',
  textShadow: '0 1px 0 rgba(244,228,192,0.55)',
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
.cb-guide-hi { animation: cb-guide-hi 1.3s ease-in-out infinite; }
@keyframes cb-guide-hi {
  0%, 100% { box-shadow: 0 0 0 1px rgba(224,165,60,0.35), 0 0 16px rgba(224,165,60,0.16); }
  50%      { box-shadow: 0 0 0 1px rgba(224,165,60,0.7),  0 0 30px rgba(224,165,60,0.42); }
}
.cb-guide-in { animation: cb-guide-in 0.36s cubic-bezier(0.22, 1.2, 0.36, 1) both; }
@keyframes cb-guide-in {
  0%   { transform: translateY(16px) scale(0.97); opacity: 0; }
  100% { transform: translateY(0) scale(1); opacity: 1; }
}
.cb-guide-arrow { animation: cb-guide-arrow 1.2s ease-in-out infinite; }
@keyframes cb-guide-arrow {
  0%, 100% { transform: translateX(0); opacity: 0.75; }
  50%      { transform: translateX(-5px); opacity: 1; }
}
`;
const byline: React.CSSProperties = {
  fontFamily: mono, fontSize: 'clamp(9px, 1.4vw, 12px)', letterSpacing: 4, color: C.dim,
  marginTop: 12, textTransform: 'uppercase',
};

const menu: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 8, marginTop: 'clamp(22px, 4vh, 42px)',
  width: 'min(420px, 100%)',
};
// Each option is now a real button PANEL — an icon medallion on the left, label over sub-caption, and
// a chevron on the right. A warm walnut gradient with a hairline gold top-edge reads as pressed metal,
// and hover slides + lights the whole tile so the menu feels like a game menu, not a bare text list.
function menuItem(on: boolean, danger: boolean): React.CSSProperties {
  const accent = danger ? C.enemy : '#c79433';
  return {
    position: 'relative', display: 'flex', alignItems: 'center', gap: 14,
    padding: '11px 16px', cursor: 'pointer', textAlign: 'left', fontFamily: sans,
    borderRadius: 10,
    border: `1px solid ${on ? accent : 'rgba(120,96,56,0.28)'}`,
    background: on
      ? 'linear-gradient(180deg, rgba(58,43,26,0.92), rgba(30,20,11,0.92))'
      : 'linear-gradient(180deg, rgba(30,26,20,0.6), rgba(16,13,9,0.6))',
    boxShadow: on
      ? `0 10px 26px rgba(0,0,0,0.5), 0 0 22px ${accent}33, inset 0 1px 0 rgba(240,206,150,0.18)`
      : 'inset 0 1px 0 rgba(200,180,140,0.06)',
    color: on ? '#fff' : 'rgba(226,220,214,0.72)',
    transform: on ? 'translateX(8px)' : 'none',
    transition: 'transform .16s ease, background .16s ease, border-color .16s ease, box-shadow .16s ease, color .16s ease',
  };
}
// The pill applied to whichever menu item the guide is currently spotlighting.
const menuHi: React.CSSProperties = {
  background: 'linear-gradient(180deg, rgba(58,43,26,0.92), rgba(30,20,11,0.92))', borderColor: '#c79433',
};
// A round carved-stone icon badge at the head of each tile.
function medallion(on: boolean, danger: boolean): React.CSSProperties {
  const accent = danger ? 'rgba(120,44,36,0.9)' : 'rgba(90,64,30,0.9)';
  return {
    flex: '0 0 auto', width: 40, height: 40, borderRadius: '50%',
    display: 'grid', placeItems: 'center',
    background: `radial-gradient(circle at 50% 35%, ${accent}, rgba(24,16,10,0.95))`,
    border: `1px solid ${on ? 'rgba(224,165,60,0.7)' : 'rgba(120,96,56,0.45)'}`,
    boxShadow: on ? 'inset 0 1px 0 rgba(240,206,150,0.25)' : 'inset 0 1px 0 rgba(200,180,140,0.08)',
    transition: 'border-color .16s ease',
  };
}
const itemText: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0, flex: 1 };
function itemArrow(on: boolean): React.CSSProperties {
  return {
    flex: '0 0 auto', fontSize: 22, lineHeight: 1, color: on ? '#e0a53c' : 'rgba(200,180,140,0.3)',
    transform: on ? 'translateX(0)' : 'translateX(-4px)', opacity: on ? 1 : 0.5,
    transition: 'transform .16s ease, opacity .16s ease, color .16s ease',
  };
}
const menuLabel: React.CSSProperties = { fontSize: 'clamp(18px, 2.3vw, 22px)', fontWeight: 800, letterSpacing: 0.5 };
function menuSub(on: boolean): React.CSSProperties {
  return {
    fontFamily: mono, fontSize: 10.5, letterSpacing: 0.5, color: on ? C.dim : C.faint,
    transition: 'color .16s ease', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
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
  borderRadius: 4, border: `1px solid ${C.border}`, background: 'rgba(16,20,32,0.8)', fontFamily: sans,
};

const creditsBackdrop: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 60, display: 'grid', placeItems: 'center',
  background: 'rgba(4,3,5,0.72)', backdropFilter: 'blur(4px)',
};
const creditsCard: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '30px 34px',
  borderRadius: 4, width: 'min(420px, 90vw)', textAlign: 'center',
  background: '#12161f', border: `1px solid ${C.border}`, borderTop: '2px solid #a86bff',
  boxShadow: '0 18px 40px rgba(0,0,0,0.5)',
};
const creditsTitle: React.CSSProperties = { fontFamily: serif, fontSize: 32, fontWeight: 700, margin: '2px 0 8px', color: '#eef2fb', letterSpacing: 1 };
const creditsLine: React.CSSProperties = { margin: 0, fontSize: 14, color: C.text };
const creditsSmall: React.CSSProperties = { margin: '10px 0 4px', fontSize: 12.5, color: C.faint, lineHeight: 1.5 };
const creditsClose: React.CSSProperties = {
  marginTop: 14, padding: '10px 24px', fontSize: 14, fontWeight: 700, color: '#f4f0ff', cursor: 'pointer',
  border: '1px solid #7a52c8', borderRadius: 4, fontFamily: sans, background: '#a86bff',
};
const inviteGhost: React.CSSProperties = {
  marginTop: 8, padding: '8px 20px', fontSize: 13, fontWeight: 700, color: C.dim, cursor: 'pointer',
  border: `1px solid ${C.border}`, borderRadius: 4, fontFamily: sans, background: 'transparent',
};

// The menu-guide callout, pinned bottom-centre. Pointer-transparent wrapper so the highlighted menu
// item behind it stays hoverable; only the card itself takes clicks.
const guideWrap: React.CSSProperties = {
  // Pinned to the RIGHT half (over the decorative fan) so the left menu column it points at is never
  // covered — whichever item is highlighted stays fully visible while the callout explains it.
  position: 'fixed', right: 0, bottom: 'clamp(24px, 5vh, 60px)', zIndex: 62,
  maxWidth: '54vw', display: 'flex', justifyContent: 'flex-end',
  paddingRight: 'clamp(24px, 5vw, 90px)', pointerEvents: 'none',
};
const guideCard: React.CSSProperties = {
  pointerEvents: 'auto', width: 'min(540px, 92vw)', padding: '20px 26px 22px', borderRadius: 8,
  background: '#12161f', border: `1px solid ${C.border}`, borderTop: '3px solid #e0a53c',
  boxShadow: '0 22px 50px rgba(0,0,0,0.62)',
};
const guideHead: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 8,
};
const guideKicker: React.CSSProperties = {
  fontFamily: mono, fontSize: 12.5, fontWeight: 700, letterSpacing: 2, color: '#c79a4e', textTransform: 'uppercase',
};
const guideSkip: React.CSSProperties = {
  padding: '6px 13px', fontSize: 13, fontWeight: 700, color: C.dim, cursor: 'pointer',
  border: `1px solid ${C.border}`, borderRadius: 4, fontFamily: sans, background: 'transparent',
};
const guidePoint: React.CSSProperties = {
  display: 'inline-block', fontFamily: sans, fontSize: 14, fontWeight: 700, letterSpacing: 0.3, color: '#e0a53c', marginBottom: 8,
};
const guideTitle: React.CSSProperties = {
  margin: '0 0 8px', fontSize: 24, fontWeight: 800, color: '#f6efdb', letterSpacing: 0.3,
};
const guideText: React.CSSProperties = { margin: 0, fontSize: 17, lineHeight: 1.65, color: '#d3dae6', whiteSpace: 'pre-line' };
const guideFoot: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 20,
};
const guideDots: React.CSSProperties = { display: 'flex', gap: 6 };
function guideDot(on: boolean): React.CSSProperties {
  return {
    width: on ? 20 : 8, height: 8, borderRadius: 4,
    background: on ? '#e0a53c' : 'rgba(224,165,60,0.28)', transition: 'width .2s ease, background .2s ease',
  };
}
const guidePrimary: React.CSSProperties = {
  padding: '12px 26px', fontSize: 16, fontWeight: 800, color: '#2a1a06', cursor: 'pointer',
  border: '1px solid #e0b95c', borderRadius: 4, fontFamily: sans,
  background: 'linear-gradient(180deg, #e6b552, #cf9a2f)',
  boxShadow: '0 6px 16px rgba(207,154,47,0.28), inset 0 1px 0 rgba(255,240,200,0.5)',
};
