import { useState } from 'react';
import { CardArt } from './art/CardArt.js';
import { Icon, type IconName } from './art/Icon.js';
import { C, mono, sans } from './theme.js';
import { playSfx } from '../audio/sfx.js';

// A display serif for headings — no serif is bundled, so lean on a system stack.
const serif = "'Times New Roman', Georgia, 'Nanum Myeongjo', serif";

interface Props {
  onClose: () => void;
  onStart: () => void; // jump straight into a bot practice match
}

// A small card exhibit: the real CardArt, its name, mana cost, and a one-line effect tag — so
// newcomers learn the actual cards they'll be holding, not abstract descriptions.
function CardChip({ id, name, cost, tag }: { id: string; name: string; cost: number; tag: string }) {
  return (
    <div style={chip}>
      <div style={chipArtWrap}>
        <span style={chipCost}>{cost}</span>
        <CardArt id={id} size={52} />
      </div>
      <span style={chipName}>{name}</span>
      <span style={chipTag}>{tag}</span>
    </div>
  );
}

// A row of mana crystals — filled (amber) up to `on`, empty after — mirroring the in-game ManaBar
// so the resource reads the same in the lesson as at the table.
function ManaRow({ on, max }: { on: number; max: number }) {
  return (
    <div style={{ display: 'flex', gap: 5, justifyContent: 'center' }}>
      {Array.from({ length: max }).map((_, i) => (
        <span key={i} style={{ color: i < on ? '#e0b25a' : '#3a2e1c', filter: i < on ? 'drop-shadow(0 0 4px rgba(224,178,90,0.7))' : undefined }}>
          <Icon name="crystal" size={20} />
        </span>
      ))}
    </div>
  );
}

// A single HP bar sketch for the goal page.
function HpSketch({ pct, label, dead }: { pct: number; label: string; dead?: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, opacity: dead ? 0.4 : 1 }}>
      <span style={{ position: 'relative' }}>
        <Icon name="skull" size={26} />
      </span>
      <div style={{ width: 64, height: 7, borderRadius: 5, background: '#0c0f18', border: `1px solid ${C.border}`, overflow: 'hidden' }}>
        <span style={{ display: 'block', height: '100%', width: `${pct}%`, background: dead ? '#3a2020' : pct <= 30 ? 'linear-gradient(90deg,#d24a35,#a5301f)' : `linear-gradient(90deg,#c96a52,${C.enemy})` }} />
      </div>
      <span style={{ fontFamily: mono, fontSize: 10, color: dead ? C.faint : C.dim }}>{dead ? 'DEAD' : label}</span>
    </div>
  );
}

// Defined before PAGES because the page visuals reference them at module-eval time.
const cardRow: React.CSSProperties = { display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' };
const ctrlChip: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', padding: '8px 14px', borderRadius: 999, fontSize: 13, fontWeight: 700,
  color: C.dim, background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`,
};

type Page = { icon: IconName; kicker: string; title: string; body: string; visual: React.ReactNode };

const PAGES: Page[] = [
  {
    icon: 'trophy', kicker: 'GOAL', title: '최후의 1인이 되어라',
    body: '2~8명이 원탁에 둘러앉아 서로를 공격합니다. 카드로 상대의 체력(HP)을 0으로 만들어 탈락시키고, 마지막까지 살아남는 한 명이 승리합니다.',
    visual: (
      <div style={{ display: 'flex', gap: 18, justifyContent: 'center', alignItems: 'flex-end' }}>
        <HpSketch pct={72} label="72/100" />
        <HpSketch pct={24} label="24/100" />
        <HpSketch pct={0} label="" dead />
        <HpSketch pct={100} label="100/100" />
      </div>
    ),
  },
  {
    icon: 'crystal', kicker: 'TURN & MANA', title: '내 차례에 마나로 카드를',
    body: '정해진 순서로 턴이 돌아옵니다. 카드마다 마나 비용이 있고, 마나가 남는 한 한 턴에 여러 장도 낼 수 있습니다. 마나는 턴마다 자동으로 차오르고, 라운드가 길어질수록 회복량이 커집니다.',
    visual: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
        <ManaRow on={4} max={6} />
        <span style={{ fontFamily: mono, fontSize: 11, color: C.faint, letterSpacing: 1 }}>4 / 6 MANA — 이번 턴에 쓸 수 있는 마나</span>
      </div>
    ),
  },
  {
    icon: 'burst', kicker: 'ATTACK', title: '공격 — 상대의 HP를 깎는다',
    body: '무기와 마법으로 피해를 줍니다. 한 대상을 노리는 카드, 모두를 휩쓰는 광역 카드, 방어막을 무시하는 관통 카드까지 다양합니다.',
    visual: (
      <div style={cardRow}>
        <CardChip id="sword" name="검" cost={2} tag="한 명 · 10 피해" />
        <CardChip id="bomb" name="폭탄" cost={4} tag="전체 · 12 피해" />
        <CardChip id="execute" name="처형" cost={5} tag="방어 무시 · 18" />
      </div>
    ),
  },
  {
    icon: 'shield', kicker: 'SURVIVE', title: '생존 — 회복과 방어막',
    body: '회복 카드로 HP를 되살리고, 방어막으로 들어오는 피해를 흡수합니다. 단, 방어막은 관통 피해와 중독은 막지 못합니다.',
    visual: (
      <div style={cardRow}>
        <CardChip id="potion" name="회복약" cost={1} tag="나 · 8 회복" />
        <CardChip id="bulwark" name="성벽" cost={3} tag="방어 +16" />
        <CardChip id="firstaid" name="응급처치" cost={2} tag="6 회복 + 방어" />
      </div>
    ),
  },
  {
    icon: 'reverse', kicker: 'SPECIAL', title: '변수 — 특수 카드',
    body: '진행 방향을 뒤집는 역류, 상대 손패를 엿보는 간파, 훔치거나 파괴하는 카드, 상대 턴을 건너뛰는 결박까지 — 판을 통째로 뒤집는 변수들입니다.',
    visual: (
      <div style={cardRow}>
        <CardChip id="reverse" name="역류" cost={2} tag="진행 방향 반전" />
        <CardChip id="peek" name="간파" cost={1} tag="손패 엿보기" />
        <CardChip id="plunder" name="강탈" cost={3} tag="손패 훔치기" />
        <CardChip id="bind" name="결박" cost={3} tag="다음 턴 스킵" />
      </div>
    ),
  },
  {
    icon: 'poison', kicker: 'STATUS', title: '지속 효과 — 상태이상',
    body: '중독은 매 턴 방어를 무시하고 갉아먹고, 재생은 턴마다 HP를 채워주며, 가시갑옷은 받은 피해를 공격자에게 되돌립니다. 남은 턴 수는 초상화 아래 칩으로 표시됩니다.',
    visual: (
      <div style={cardRow}>
        <CardChip id="venomdart" name="독침" cost={2} tag="3턴 중독" />
        <CardChip id="regenward" name="재생축복" cost={3} tag="3턴 재생" />
        <CardChip id="thornmail" name="가시갑옷" cost={3} tag="피해 50% 반사" />
      </div>
    ),
  },
  {
    icon: 'target', kicker: 'CONTROLS', title: '조작은 간단합니다',
    body: '손에 든 카드를 클릭하세요. 대상이 필요한 카드는 상대를 고르면 사용됩니다. 낼 카드가 없으면 «턴 종료»로 넘기고, 제한 시간이 지나면 자동으로 넘어갑니다. 이제 봇과 한 판 연습해 볼까요?',
    visual: (
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
        <span style={ctrlChip}><Icon name="card" size={15} />&nbsp;카드 클릭</span>
        <span style={ctrlChip}><Icon name="target" size={15} />&nbsp;대상 선택</span>
        <span style={ctrlChip}><Icon name="arrowRight" size={15} />&nbsp;턴 종료</span>
        <span style={ctrlChip}><Icon name="zzz" size={15} />&nbsp;시간 초과 시 자동</span>
      </div>
    ),
  },
];

export function Tutorial({ onClose, onStart }: Props) {
  const [i, setI] = useState(0);
  const page = PAGES[i];
  const last = i === PAGES.length - 1;

  const go = (next: number) => { playSfx('select'); setI(next); };

  return (
    <div style={backdrop} onClick={onClose}>
      <div style={card} className="cb-gate-in" onClick={(e) => e.stopPropagation()}>
        <button style={skip} onClick={() => { playSfx('back'); onClose(); }} title="닫기">
          <Icon name="close" size={16} />
        </button>

        <div style={header}>
          <span style={badge}><Icon name={page.icon} size={26} /></span>
          <span style={kicker}>{`STEP ${i + 1} / ${PAGES.length} · ${page.kicker}`}</span>
          <h2 style={title}>{page.title}</h2>
        </div>

        <div style={stage}>{page.visual}</div>

        <p style={body}>{page.body}</p>

        <div style={dots}>
          {PAGES.map((_, d) => (
            <button key={d} aria-label={`${d + 1}쪽`} onClick={() => go(d)}
              style={{ ...dot, ...(d === i ? dotOn : null) }} />
          ))}
        </div>

        <div style={nav}>
          <button style={{ ...ghostBtn, visibility: i === 0 ? 'hidden' : 'visible' }}
            onClick={() => go(i - 1)}>
            이전
          </button>
          {last ? (
            <button style={primaryBtn} onClick={() => { playSfx('select'); onStart(); }}>
              봇과 연습 시작&nbsp;<Icon name="arrowRight" size={16} />
            </button>
          ) : (
            <button style={primaryBtn} onClick={() => go(i + 1)}>
              다음&nbsp;<Icon name="arrowRight" size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const backdrop: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 60, display: 'grid', placeItems: 'center',
  background: 'rgba(4,3,5,0.74)', backdropFilter: 'blur(5px)', fontFamily: sans,
};
const card: React.CSSProperties = {
  position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center',
  width: 'min(560px, 94vw)', maxHeight: '90vh', padding: '30px 30px 24px', borderRadius: 18,
  background: 'linear-gradient(180deg, #1c1114, #110a0c)', border: `1px solid ${C.border}`,
  boxShadow: '0 34px 80px rgba(0,0,0,0.66), inset 0 0 40px rgba(160,90,40,0.06)',
};
const skip: React.CSSProperties = {
  position: 'absolute', top: 14, right: 14, width: 32, height: 32, borderRadius: 9, cursor: 'pointer',
  display: 'grid', placeItems: 'center', color: C.dim,
  border: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.04)',
};
const header: React.CSSProperties = { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, textAlign: 'center' };
const badge: React.CSSProperties = {
  width: 54, height: 54, borderRadius: '50%', display: 'grid', placeItems: 'center', color: '#141608',
  background: 'linear-gradient(150deg, #d8b45a, #b98a3e)', boxShadow: '0 0 22px rgba(216,180,90,0.4)',
};
const kicker: React.CSSProperties = {
  fontFamily: mono, fontSize: 11, letterSpacing: 3, color: C.faint, textTransform: 'uppercase', marginTop: 4,
};
const title: React.CSSProperties = {
  fontFamily: serif, fontSize: 27, fontWeight: 700, color: '#f3eee6', letterSpacing: 1, margin: '2px 0 0',
};
const stage: React.CSSProperties = {
  display: 'grid', placeItems: 'center', width: '100%', minHeight: 118, margin: '18px 0 6px',
  padding: '16px 10px', borderRadius: 14, background: 'rgba(0,0,0,0.28)', border: `1px solid ${C.border}`,
};
const body: React.CSSProperties = {
  fontSize: 14, lineHeight: 1.62, color: C.dim, textAlign: 'center', margin: '12px 4px 0', maxWidth: 460,
};
const chip: React.CSSProperties = { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, width: 78 };
const chipArtWrap: React.CSSProperties = {
  position: 'relative', width: 60, height: 60, borderRadius: 11, display: 'grid', placeItems: 'center',
  background: 'linear-gradient(160deg, #241a12, #16100b)', border: `1px solid ${C.border}`,
};
const chipCost: React.CSSProperties = {
  position: 'absolute', top: -6, left: -6, minWidth: 18, height: 18, padding: '0 4px', borderRadius: 6,
  display: 'grid', placeItems: 'center', fontFamily: mono, fontSize: 11, fontWeight: 800, color: '#e8cf96',
  background: 'linear-gradient(160deg, rgba(74,58,26,0.98), rgba(46,34,14,0.98))', border: '1px solid #6a5528',
};
const chipName: React.CSSProperties = { fontSize: 12.5, fontWeight: 800, color: '#f3eee6' };
const chipTag: React.CSSProperties = { fontFamily: mono, fontSize: 9.5, color: C.faint, letterSpacing: 0.3, textAlign: 'center' };
const dots: React.CSSProperties = { display: 'flex', gap: 7, margin: '18px 0 4px' };
const dot: React.CSSProperties = {
  width: 8, height: 8, borderRadius: '50%', cursor: 'pointer', padding: 0,
  border: 'none', background: 'rgba(226,220,214,0.22)', transition: 'background .18s ease, transform .18s ease',
};
const dotOn: React.CSSProperties = { background: '#d8b45a', transform: 'scale(1.25)' };
const nav: React.CSSProperties = { display: 'flex', gap: 10, marginTop: 14, width: '100%', justifyContent: 'center' };
const ghostBtn: React.CSSProperties = {
  padding: '11px 24px', fontSize: 14, fontWeight: 700, color: C.dim, cursor: 'pointer',
  border: `1px solid ${C.borderHi}`, borderRadius: 11, background: 'rgba(255,255,255,0.05)', fontFamily: sans,
};
const primaryBtn: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', padding: '11px 26px', fontSize: 14, fontWeight: 800, color: '#f4e9cb',
  cursor: 'pointer', border: 'none', borderRadius: 11, fontFamily: sans,
  background: 'linear-gradient(100deg, #b8492f, #9c3b28 56%, #7f2f1f)', boxShadow: '0 6px 18px rgba(0,0,0,0.5)',
};
