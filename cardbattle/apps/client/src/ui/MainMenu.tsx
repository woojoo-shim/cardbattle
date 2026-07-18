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

// A display serif for the title — no serif is bundled, so lean on a system stack.
const serif = "'Times New Roman', Georgia, 'Nanum Myeongjo', serif";

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
        <span style={kicker}>플레이 방법 · HOW TO PLAY</span>
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

// A clean, flat dark backdrop — no back-room diorama, no falling cards. Just the title + menu.
const wrap: React.CSSProperties = {
  position: 'relative', minHeight: '100vh', width: '100%', overflow: 'hidden', boxSizing: 'border-box',
  display: 'flex', alignItems: 'center', justifyContent: 'flex-start', fontFamily: sans, color: C.text,
  padding: '0 clamp(28px, 8vw, 120px)',
  background: 'linear-gradient(180deg, #140b0e 0%, #0b070a 60%, #060305 100%)',
};

const content: React.CSSProperties = {
  position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
  textAlign: 'left',
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
  fontSize: 'clamp(50px, 11vw, 118px)', color: '#f3eee6',
  textShadow: '0 2px 0 #1a0f10, 0 8px 24px rgba(0,0,0,0.6)',
};
const titleLine2: React.CSSProperties = {
  color: '#e7d8c6', letterSpacing: 'clamp(8px, 2.4vw, 26px)', marginTop: '-0.06em',
};
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
// The how-to panel is a taller card holding the five numbered beats.
const howCard: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '26px 30px 24px',
  borderRadius: 16, width: 'min(500px, 92vw)', maxHeight: '86vh', overflowY: 'auto', textAlign: 'center',
  background: 'linear-gradient(180deg, #1a1013, #100a0c)', border: `1px solid ${C.border}`,
  boxShadow: '0 30px 70px rgba(0,0,0,0.6)',
};
const howList: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 12, width: '100%', margin: '10px 0 4px' };
const howRow: React.CSSProperties = {
  display: 'flex', gap: 14, alignItems: 'flex-start', padding: '12px 14px', borderRadius: 12,
  background: 'rgba(0,0,0,0.28)', border: `1px solid ${C.border}`,
};
const howNum: React.CSSProperties = {
  flexShrink: 0, width: 30, height: 30, borderRadius: '50%', display: 'grid', placeItems: 'center',
  fontFamily: serif, fontSize: 16, fontWeight: 700, color: '#141608',
  background: 'linear-gradient(150deg, #d8b45a, #b98a3e)', boxShadow: '0 0 14px rgba(216,180,90,0.4)',
};
const howStepTitle: React.CSSProperties = { fontSize: 15.5, fontWeight: 800, color: '#f3eee6', letterSpacing: 0.4 };
const howBody: React.CSSProperties = { fontSize: 13, lineHeight: 1.55, color: C.dim };
const howGhostBtn: React.CSSProperties = {
  padding: '10px 22px', fontSize: 14, fontWeight: 700, color: C.dim, cursor: 'pointer',
  border: `1px solid ${C.borderHi}`, borderRadius: 10, background: 'rgba(255,255,255,0.05)', fontFamily: sans,
};
const creditsLine: React.CSSProperties = { margin: 0, fontSize: 14, color: C.text };
const creditsSmall: React.CSSProperties = { margin: '10px 0 4px', fontSize: 12.5, color: C.faint, lineHeight: 1.4 };
const creditsClose: React.CSSProperties = {
  marginTop: 12, padding: '10px 24px', fontSize: 14, fontWeight: 800, color: '#f4e9cb', cursor: 'pointer',
  border: 'none', borderRadius: 10, fontFamily: sans,
  background: 'linear-gradient(100deg, #b8492f, #9c3b28 56%, #7f2f1f)', boxShadow: '0 6px 18px rgba(0,0,0,0.5)',
};
