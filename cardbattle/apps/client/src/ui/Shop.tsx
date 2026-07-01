import { useState } from 'react';
import { COSMETICS, type Cosmetic } from '@cardbattle/shared';
import { buyCosmetic, equipCosmetic, type Account } from '../net/auth.js';
import { C, mono, sans } from './theme.js';
import { CardArt } from './art/CardArt.js';

interface Props {
  account: Account;
  onAccount: (a: Account) => void;
  onClose: () => void;
}

/** Gold shop: buy cosmetic card borders with match-earned gold and equip them. Purely
 *  visual — no gameplay effect. A live card preview shows the selected frame. */
export function Shop({ account, onAccount, onClose }: Props) {
  const [selected, setSelected] = useState<Cosmetic>(
    COSMETICS.find((c) => c.id === account.equippedBorder) ?? COSMETICS[0],
  );
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

        <div style={body}>
          {/* Live preview of the selected frame on a real card */}
          <div style={previewCol}>
            <div style={cardFrame(selected)}>
              <CardArt id="snipe" size={72} />
            </div>
            <span style={previewName}>{selected.name}</span>
            {selected.id === account.equippedBorder ? (
              <span style={equippedTag}>착용 중</span>
            ) : owns(selected.id) ? (
              <button style={equipBtn} disabled={busy} onClick={() => act(() => equipCosmetic(selected.id))}>착용하기</button>
            ) : (
              <button style={buyBtn} disabled={busy || account.gold < selected.price}
                onClick={() => act(() => buyCosmetic(selected.id))}>
                🪙 {selected.price} 구매
              </button>
            )}
            {err && <p style={errLine}>{err}</p>}
          </div>

          {/* Grid of all skins */}
          <div style={grid}>
            {COSMETICS.map((c) => {
              const on = c.id === selected.id;
              return (
                <button key={c.id} style={swatch(c, on)} onClick={() => { setSelected(c); setErr(''); }} title={c.name}>
                  <span style={swatchName}>{c.name}</span>
                  <span style={swatchPrice}>
                    {c.id === account.equippedBorder ? '착용 중' : owns(c.id) ? '보유' : `🪙 ${c.price}`}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
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
const body: React.CSSProperties = { display: 'flex', gap: 20, padding: 20, overflow: 'auto' };
const previewCol: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, minWidth: 168,
};
function cardFrame(c: Cosmetic): React.CSSProperties {
  const grad = c.border.startsWith('linear') || c.border.startsWith('radial');
  return {
    width: 120, height: 166, borderRadius: 14, display: 'grid', placeItems: 'center',
    background: 'linear-gradient(180deg, #1c2233, #0d121c)',
    padding: 3,
    ...(grad
      ? { border: '3px solid transparent', backgroundImage: `linear-gradient(#101622,#101622), ${c.border}`, backgroundOrigin: 'border-box', backgroundClip: 'padding-box, border-box' }
      : { border: `3px solid ${c.border}` }),
    boxShadow: `0 0 26px ${c.glow}, 0 14px 30px rgba(0,0,0,0.5)`,
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
const errLine: React.CSSProperties = { margin: 0, color: C.enemy, fontSize: 12.5, textAlign: 'center' };
const grid: React.CSSProperties = {
  flex: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))', gap: 10, alignContent: 'start',
};
function swatch(c: Cosmetic, on: boolean): React.CSSProperties {
  const grad = c.border.startsWith('linear') || c.border.startsWith('radial');
  return {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '12px 8px', cursor: 'pointer',
    borderRadius: 12, color: C.text, fontFamily: sans,
    background: on ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)',
    border: on ? `2px solid ${C.you}` : `1px solid ${C.border}`,
    boxShadow: on ? `0 0 14px ${c.glow}` : 'none',
    ...(grad ? { outline: 'none' } : {}),
  };
}
const swatchName: React.CSSProperties = { fontSize: 13, fontWeight: 700 };
const swatchPrice: React.CSSProperties = { fontFamily: mono, fontSize: 11.5, color: C.dim };
