import { useState } from 'react';
import {
  COSMETICS, TITLES, PLAY_EFFECTS,
  type Cosmetic, type Title, type PlayEffect,
} from '@cardbattle/shared';
import { buyCosmetic, equipCosmetic, type Account } from '../net/auth.js';
import { C, mono, sans } from './theme.js';
import { CardArt } from './art/CardArt.js';

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
      <div style={modal} onClick={(e) => e.stopPropagation()}>
        <div style={head}>
          <h2 style={hd}>상점</h2>
          <span style={goldPill}>🪙 {account.gold}</span>
          <button style={closeBtn} onClick={onClose} aria-label="닫기">✕</button>
        </div>

        <div style={tabRow}>
          {TABS.map((t) => (
            <button key={t.id} style={tabBtn(t.id === tab)} onClick={() => { setTab(t.id); setErr(''); }}>
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
  if (owned) return <button style={equipBtn} disabled={busy} onClick={() => act(() => equipCosmetic(id))}>착용하기</button>;
  return (
    <button style={buyBtn} disabled={busy} onClick={() => act(() => buyCosmetic(id))}>🪙 {price} 구매</button>
  );
}

function BorderTab({ account, owns, busy, act }: TabProps) {
  const [sel, setSel] = useState<Cosmetic>(
    COSMETICS.find((c) => c.id === account.equippedBorder) ?? COSMETICS[0],
  );
  return (
    <>
      <div style={previewCol}>
        <div style={cardFrame(sel)}><CardArt id="snipe" size={72} /></div>
        <span style={previewName}>{sel.name}</span>
        <ActionRow id={sel.id} price={sel.price} equipped={sel.id === account.equippedBorder}
          owned={owns(sel.id)} busy={busy} account={account} act={act} />
      </div>
      <div style={grid}>
        {COSMETICS.map((c) => (
          <button key={c.id} style={swatch(c.id === sel.id, c.glow)} onClick={() => setSel(c)} title={c.name}>
            <span style={swatchName}>{c.name}</span>
            <span style={swatchPrice}>{c.id === account.equippedBorder ? '착용 중' : owns(c.id) ? '보유' : `🪙 ${c.price}`}</span>
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
          <button key={t.id} style={swatch(t.id === sel.id, 'rgba(56,232,200,0.4)')} onClick={() => setSel(t)} title={t.name}>
            <span style={t.text ? titleText(t.color) : swatchName}>{t.text || t.name}</span>
            <span style={swatchPrice}>{t.id === account.equippedTitle ? '착용 중' : owns(t.id) ? '보유' : `🪙 ${t.price}`}</span>
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
          {sel.glyph
            ? <span style={{ fontSize: 48, filter: `drop-shadow(0 0 14px ${sel.color})` }}>{sel.glyph}</span>
            : <span style={titleNone}>(이펙트 없음)</span>}
        </div>
        <span style={previewName}>{sel.name}</span>
        <ActionRow id={sel.id} price={sel.price} equipped={sel.id === account.equippedEffect}
          owned={owns(sel.id)} busy={busy} account={account} act={act} />
      </div>
      <div style={grid}>
        {PLAY_EFFECTS.map((e) => (
          <button key={e.id} style={swatch(e.id === sel.id, e.color)} onClick={() => setSel(e)} title={e.name}>
            <span style={{ fontSize: 20 }}>{e.glyph || '—'}</span>
            <span style={swatchName}>{e.name}</span>
            <span style={swatchPrice}>{e.id === account.equippedEffect ? '착용 중' : owns(e.id) ? '보유' : `🪙 ${e.price}`}</span>
          </button>
        ))}
      </div>
    </>
  );
}

const overlay: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 60, display: 'grid', placeItems: 'center',
  background: 'rgba(4,5,9,0.72)', backdropFilter: 'blur(4px)', fontFamily: sans,
};
const modal: React.CSSProperties = {
  width: 'min(720px, 94vw)', maxHeight: '88vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
  borderRadius: 18, background: `linear-gradient(180deg, ${C.panelHi}, ${C.panel})`,
  border: `1px solid ${C.borderHi}`, boxShadow: '0 30px 80px rgba(0,0,0,0.65)', color: C.text,
};
const head: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', borderBottom: `1px solid ${C.border}`,
};
const hd: React.CSSProperties = { margin: 0, fontSize: 18, fontWeight: 900, letterSpacing: 1, flex: 1 };
const goldPill: React.CSSProperties = {
  fontFamily: mono, fontSize: 15, fontWeight: 800, color: '#ffd75e', padding: '5px 12px', borderRadius: 999,
  border: '1px solid #6a5620', background: 'rgba(60,48,12,0.5)',
};
const closeBtn: React.CSSProperties = {
  width: 34, height: 34, borderRadius: 8, cursor: 'pointer', color: C.dim, fontSize: 16,
  border: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.04)',
};
const tabRow: React.CSSProperties = {
  display: 'flex', gap: 8, padding: '12px 20px 0', borderBottom: `1px solid ${C.border}`,
};
function tabBtn(on: boolean): React.CSSProperties {
  return {
    padding: '9px 18px', fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: sans,
    color: on ? C.you : C.dim, background: 'transparent', border: 'none',
    borderBottom: on ? `2px solid ${C.you}` : '2px solid transparent', marginBottom: -1,
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
    background: 'linear-gradient(180deg, #1c2233, #0d121c)', padding: 3,
    ...(grad
      ? { border: '3px solid transparent', backgroundImage: `linear-gradient(#101622,#101622), ${c.border}`, backgroundOrigin: 'border-box', backgroundClip: 'padding-box, border-box' }
      : { border: `3px solid ${c.border}` }),
    boxShadow: `0 0 26px ${c.glow}, 0 14px 30px rgba(0,0,0,0.5)`,
  };
}
const titlePreviewBox: React.CSSProperties = {
  width: 168, height: 120, borderRadius: 14, display: 'flex', flexDirection: 'column',
  alignItems: 'center', justifyContent: 'center', gap: 6,
  background: 'linear-gradient(180deg, #1c2233, #0d121c)', border: `1px solid ${C.border}`,
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
    background: 'radial-gradient(circle at center, rgba(255,255,255,0.05), #0d121c 70%)',
    border: `1px solid ${C.border}`, boxShadow: `inset 0 0 30px ${color}`,
  };
}
const previewName: React.CSSProperties = { fontSize: 15, fontWeight: 800 };
const equippedTag: React.CSSProperties = { fontSize: 13, fontWeight: 800, color: C.you };
const equipBtn: React.CSSProperties = {
  padding: '10px 18px', fontSize: 14, fontWeight: 800, color: '#04231b', cursor: 'pointer', border: 'none',
  borderRadius: 10, background: 'linear-gradient(180deg,#5af0d3,#22c7a8)', boxShadow: '0 6px 16px rgba(56,232,200,0.3)',
};
const buyBtn: React.CSSProperties = {
  padding: '10px 18px', fontSize: 14, fontWeight: 800, color: '#2a1e04', cursor: 'pointer', border: 'none',
  borderRadius: 10, background: 'linear-gradient(180deg,#ffd75e,#f4a11a)', boxShadow: '0 6px 16px rgba(244,161,26,0.35)',
};
const errLine: React.CSSProperties = { margin: '10px 20px 0', color: C.enemy, fontSize: 12.5, textAlign: 'center' };
const grid: React.CSSProperties = {
  flex: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))', gap: 10, alignContent: 'start',
};
function swatch(on: boolean, glow: string): React.CSSProperties {
  return {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '12px 8px', cursor: 'pointer',
    borderRadius: 12, color: C.text, fontFamily: sans, minHeight: 66, justifyContent: 'center',
    background: on ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)',
    border: on ? `2px solid ${C.you}` : `1px solid ${C.border}`,
    boxShadow: on ? `0 0 14px ${glow}` : 'none',
  };
}
const swatchName: React.CSSProperties = { fontSize: 13, fontWeight: 700 };
const swatchPrice: React.CSSProperties = { fontFamily: mono, fontSize: 11.5, color: C.dim };
