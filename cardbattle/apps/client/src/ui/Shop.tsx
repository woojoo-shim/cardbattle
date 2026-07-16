import { useState } from 'react';
import {
  COSMETICS, TITLES, PLAY_EFFECTS,
  type Cosmetic, type Title, type PlayEffect,
} from '@cardbattle/shared';
import { buyCosmetic, equipCosmetic, type Account } from '../net/auth.js';
import { playSfx } from '../audio/sfx.js';
import { C, mono, sans } from './theme.js';
import { CardArt } from './art/CardArt.js';
import { Icon, EFFECT_ICON } from './art/Icon.js';

// The engraved display serif shared with the menu/lobby — one back-room voice across screens.
const serif = "'Times New Roman', Georgia, 'Nanum Myeongjo', serif";
// Parchment-page inks for the shop chrome. Product-preview boxes stay dark so cosmetic art pops.
const INK = '#3a2c18';
const INK_DIM = '#6b5636';
const INK_FAINT = '#94805a';
const SEAL = '#9c3b28';
const PAPER_HI = '#f4e9cb';

/** Price tag / gold amount with the coin glyph. */
function Gold({ amount }: { amount: number }) {
  return <><Icon name="coin" size={14} />&nbsp;{amount}</>;
}

interface Props {
  account: Account;
  onAccount: (a: Account) => void;
  onClose: () => void;
}

type TabId = 'border' | 'title' | 'effect';
const TABS: { id: TabId; label: string }[] = [
  { id: 'border', label: '테두리' },
  { id: 'title', label: '칭호' },
  { id: 'effect', label: '이펙트' },
];

/** A gradient string paints via backgroundImage+clip; a solid color paints directly. */
function isGrad(v: string): boolean {
  return v.startsWith('linear') || v.startsWith('radial');
}

/** Gold shop with three cosmetic families — card borders, name titles, and card-play burst
 *  effects — each bought with match-earned gold and equipped account-wide. All cosmetics are
 *  visible to every player at the table. A live preview shows the selected item. */
export function Shop({ account, onAccount, onClose }: Props) {
  const [tab, setTab] = useState<TabId>('border');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const owns = (id: string) => account.owned.includes(id);
  const act = (fn: () => Promise<Account>) => {
    if (busy) return;
    setBusy(true); setErr('');
    fn().then(onAccount).catch((e: unknown) => setErr(e instanceof Error ? e.message : '오류')).finally(() => setBusy(false));
  };

  return (
    <div style={overlay} onClick={onClose}>
      <div style={modal} className="cb-shop-pop" onClick={(e) => e.stopPropagation()}>
        <div style={head}>
          <div style={hdCol}>
            <span style={hdKicker}>◈&nbsp;&nbsp;암시장 · BLACK MARKET</span>
            <h2 style={hd}>상점</h2>
          </div>
          <span style={goldPill} className="cb-gold-shine"><Gold amount={account.gold} /></span>
          <button style={closeBtn} onClick={() => { playSfx('back'); onClose(); }} aria-label="닫기"><Icon name="close" size={14} /></button>
        </div>

        <div style={tabRow}>
          {TABS.map((t) => (
            <button key={t.id} style={tabBtn(t.id === tab)} onClick={() => { playSfx('toggle'); setTab(t.id); setErr(''); }}>
              {t.label}
            </button>
          ))}
        </div>

        {err && <p style={errLine}>{err}</p>}

        <div style={body}>
          {tab === 'border' && (
            <BorderTab account={account} owns={owns} busy={busy} act={act} />
          )}
          {tab === 'title' && (
            <TitleTab account={account} owns={owns} busy={busy} act={act} />
          )}
          {tab === 'effect' && (
            <EffectTab account={account} owns={owns} busy={busy} act={act} />
          )}
        </div>
      </div>
    </div>
  );
}

interface TabProps {
  account: Account;
  owns: (id: string) => boolean;
  busy: boolean;
  act: (fn: () => Promise<Account>) => void;
}

/** Shared buy/equip action row under a preview. */
function ActionRow({ id, price, equipped, owned, busy, act }: {
  id: string; price: number; equipped: boolean; owned: boolean; busy: boolean; account: Account; act: TabProps['act'];
}) {
  if (equipped) return <span style={equippedTag}>착용 중</span>;
  if (owned) return <button className="cb-shop-btn" style={equipBtn} disabled={busy} onClick={() => { playSfx('select'); act(() => equipCosmetic(id)); }}>착용하기</button>;
  return (
    <button className="cb-shop-btn" style={buyBtn} disabled={busy} onClick={() => { playSfx('coin'); act(() => buyCosmetic(id)); }}><Gold amount={price} /> 구매</button>
  );
}

function BorderTab({ account, owns, busy, act }: TabProps) {
  const [sel, setSel] = useState<Cosmetic>(
    COSMETICS.find((c) => c.id === account.equippedBorder) ?? COSMETICS[0],
  );
  return (
    <>
      <div style={previewCol}>
        <div style={cardFrame(sel)} className="cb-shop-float"><CardArt id="snipe" size={72} /></div>
        <span style={previewName}>{sel.name}</span>
        <ActionRow id={sel.id} price={sel.price} equipped={sel.id === account.equippedBorder}
          owned={owns(sel.id)} busy={busy} account={account} act={act} />
      </div>
      <div style={grid}>
        {COSMETICS.map((c) => (
          <button key={c.id} className="cb-shop-swatch" style={swatch(c.id === sel.id, c.glow)} onClick={() => { playSfx('hover'); setSel(c); }} title={c.name}>
            <span style={swatchName}>{c.name}</span>
            <span style={swatchPrice}>{c.id === account.equippedBorder ? '착용 중' : owns(c.id) ? '보유' : <Gold amount={c.price} />}</span>
          </button>
        ))}
      </div>
    </>
  );
}

function TitleTab({ account, owns, busy, act }: TabProps) {
  const [sel, setSel] = useState<Title>(
    TITLES.find((t) => t.id === account.equippedTitle) ?? TITLES[0],
  );
  return (
    <>
      <div style={previewCol}>
        <div style={titlePreviewBox}>
          <span style={titlePreviewName}>{account.display}</span>
          {sel.text
            ? <span style={titleText(sel.color)}>{sel.text}</span>
            : <span style={titleNone}>(칭호 없음)</span>}
        </div>
        <span style={previewName}>{sel.name}</span>
        <ActionRow id={sel.id} price={sel.price} equipped={sel.id === account.equippedTitle}
          owned={owns(sel.id)} busy={busy} account={account} act={act} />
      </div>
      <div style={grid}>
        {TITLES.map((t) => (
          <button key={t.id} className="cb-shop-swatch" style={swatch(t.id === sel.id, 'rgba(156,59,40,0.4)')} onClick={() => { playSfx('hover'); setSel(t); }} title={t.name}>
            <span style={t.text ? titleText(t.color) : swatchName}>{t.text || t.name}</span>
            <span style={swatchPrice}>{t.id === account.equippedTitle ? '착용 중' : owns(t.id) ? '보유' : <Gold amount={t.price} />}</span>
          </button>
        ))}
      </div>
    </>
  );
}

function EffectTab({ account, owns, busy, act }: TabProps) {
  const [sel, setSel] = useState<PlayEffect>(
    PLAY_EFFECTS.find((e) => e.id === account.equippedEffect) ?? PLAY_EFFECTS[0],
  );
  return (
    <>
      <div style={previewCol}>
        <div style={effectPreviewBox(sel.color)}>
          {EFFECT_ICON[sel.id]
            ? <span className="cb-shop-float" style={{ filter: `drop-shadow(0 0 14px ${sel.color})` }}><Icon name={EFFECT_ICON[sel.id]!} size={48} color={sel.color} /></span>
            : <span style={titleNone}>(이펙트 없음)</span>}
        </div>
        <span style={previewName}>{sel.name}</span>
        <ActionRow id={sel.id} price={sel.price} equipped={sel.id === account.equippedEffect}
          owned={owns(sel.id)} busy={busy} account={account} act={act} />
      </div>
      <div style={grid}>
        {PLAY_EFFECTS.map((e) => (
          <button key={e.id} className="cb-shop-swatch" style={swatch(e.id === sel.id, e.color)} onClick={() => { playSfx('hover'); setSel(e); }} title={e.name}>
            <span style={{ height: 22, display: 'grid', placeItems: 'center' }}>
              {EFFECT_ICON[e.id] ? <Icon name={EFFECT_ICON[e.id]!} size={20} color={e.color} /> : '—'}
            </span>
            <span style={swatchName}>{e.name}</span>
            <span style={swatchPrice}>{e.id === account.equippedEffect ? '착용 중' : owns(e.id) ? '보유' : <Gold amount={e.price} />}</span>
          </button>
        ))}
      </div>
    </>
  );
}

const overlay: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 60, display: 'grid', placeItems: 'center',
  // Warm walnut scrim so the parchment modal reads as a page laid on the desk.
  background:
    'radial-gradient(70% 60% at 50% 30%, rgba(60,40,16,0.4), transparent 70%),' +
    'rgba(20,12,4,0.66)',
  backdropFilter: 'blur(5px)', fontFamily: sans,
};
const modal: React.CSSProperties = {
  width: 'min(720px, 94vw)', maxHeight: '88vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
  borderRadius: 18, background: 'linear-gradient(180deg, #eddcb2 0%, #e4d1a4 55%, #d7c194 100%)',
  border: `1px solid rgba(90,66,34,0.5)`, color: INK,
  boxShadow: '0 40px 90px rgba(30,18,6,0.5), inset 0 1px 0 rgba(255,250,232,0.5)',
};
const head: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', borderBottom: `1px solid rgba(90,66,34,0.34)`,
  background: 'linear-gradient(180deg, rgba(156,59,40,0.08), transparent)',
};
const hdCol: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 3, flex: 1 };
const hdKicker: React.CSSProperties = {
  fontFamily: mono, fontSize: 10, letterSpacing: 3.5, color: INK_FAINT, textTransform: 'uppercase',
};
const hd: React.CSSProperties = {
  margin: 0, fontFamily: serif, fontSize: 26, fontWeight: 700, letterSpacing: 3, color: INK,
  textShadow: '0 1px 0 rgba(255,250,232,0.55)',
};
const goldPill: React.CSSProperties = {
  fontFamily: mono, fontSize: 15, fontWeight: 800, color: PAPER_HI, padding: '5px 12px', borderRadius: 999,
  border: `1px solid ${SEAL}`, background: 'linear-gradient(180deg,#b8492f,#8f2f1f)',
};
const closeBtn: React.CSSProperties = {
  width: 34, height: 34, borderRadius: 8, cursor: 'pointer', color: INK_DIM, fontSize: 16,
  border: `1px solid rgba(90,66,34,0.34)`, background: 'rgba(247,238,214,0.5)',
};
const tabRow: React.CSSProperties = {
  display: 'flex', gap: 8, padding: '12px 20px 0', borderBottom: `1px solid rgba(90,66,34,0.34)`,
};
function tabBtn(on: boolean): React.CSSProperties {
  return {
    padding: '9px 18px', fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: sans,
    color: on ? SEAL : INK_DIM, background: 'transparent', border: 'none',
    borderBottom: on ? `2px solid ${SEAL}` : '2px solid transparent', marginBottom: -1,
  };
}
const body: React.CSSProperties = { display: 'flex', gap: 20, padding: 20, overflow: 'auto' };
const previewCol: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, minWidth: 168,
};
function cardFrame(c: Cosmetic): React.CSSProperties {
  const grad = isGrad(c.border);
  return {
    width: 120, height: 166, borderRadius: 14, display: 'grid', placeItems: 'center',
    background: 'linear-gradient(180deg, #211a12, #100a08)', padding: 3,
    ...(grad
      ? { border: '3px solid transparent', backgroundImage: `linear-gradient(#161009,#161009), ${c.border}`, backgroundOrigin: 'border-box', backgroundClip: 'padding-box, border-box' }
      : { border: `3px solid ${c.border}` }),
    boxShadow: `0 0 26px ${c.glow}, 0 14px 30px rgba(0,0,0,0.5)`,
  };
}
const titlePreviewBox: React.CSSProperties = {
  width: 168, height: 120, borderRadius: 14, display: 'flex', flexDirection: 'column',
  alignItems: 'center', justifyContent: 'center', gap: 6,
  background: 'linear-gradient(180deg, #211a12, #100a08)', border: `1px solid ${C.border}`,
};
const titlePreviewName: React.CSSProperties = { fontSize: 17, fontWeight: 800, color: C.text };
function titleText(color: string): React.CSSProperties {
  const grad = isGrad(color);
  return {
    fontSize: 14, fontWeight: 900, letterSpacing: 0.5,
    ...(grad
      ? { backgroundImage: color, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', WebkitTextFillColor: 'transparent' }
      : { color }),
  };
}
const titleNone: React.CSSProperties = { fontSize: 13, color: C.dim };
function effectPreviewBox(color: string): React.CSSProperties {
  return {
    width: 168, height: 120, borderRadius: 14, display: 'grid', placeItems: 'center',
    background: 'radial-gradient(circle at center, rgba(255,238,206,0.06), #100a08 70%)',
    border: `1px solid ${C.border}`, boxShadow: `inset 0 0 30px ${color}`,
  };
}
const previewName: React.CSSProperties = { fontSize: 15, fontWeight: 800 };
const equippedTag: React.CSSProperties = { fontSize: 13, fontWeight: 800, color: SEAL };
const equipBtn: React.CSSProperties = {
  padding: '10px 18px', fontSize: 14, fontWeight: 800, color: PAPER_HI, cursor: 'pointer', border: 'none',
  borderRadius: 10, background: 'linear-gradient(100deg,#b8492f,#9c3b28 56%,#7f2f1f)', boxShadow: '0 6px 16px rgba(60,20,10,0.3)',
};
const buyBtn: React.CSSProperties = {
  padding: '10px 18px', fontSize: 14, fontWeight: 800, color: '#2a1e04', cursor: 'pointer', border: 'none',
  borderRadius: 10, background: 'linear-gradient(180deg,#e6b752,#c9922f)', boxShadow: '0 6px 16px rgba(120,84,20,0.3)',
};
const errLine: React.CSSProperties = { margin: '10px 20px 0', color: SEAL, fontSize: 12.5, textAlign: 'center' };
const grid: React.CSSProperties = {
  flex: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))', gap: 10, alignContent: 'start',
};
function swatch(on: boolean, glow: string): React.CSSProperties {
  return {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '12px 8px', cursor: 'pointer',
    borderRadius: 12, color: INK, fontFamily: sans, minHeight: 66, justifyContent: 'center',
    background: on ? 'rgba(156,59,40,0.1)' : 'rgba(247,238,214,0.45)',
    border: on ? `2px solid ${SEAL}` : `1px solid rgba(90,66,34,0.34)`,
    boxShadow: on ? `inset 0 0 0 1px rgba(156,59,40,0.3)` : 'none',
  };
}
const swatchName: React.CSSProperties = { fontSize: 13, fontWeight: 700 };
const swatchPrice: React.CSSProperties = { fontFamily: mono, fontSize: 11.5, color: INK_DIM };
