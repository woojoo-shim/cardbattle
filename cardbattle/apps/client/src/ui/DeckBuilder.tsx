import { useMemo, useState } from 'react';
import {
  ALL_DEFS, CARD_DEFS, DECK_SIZE, MAX_COPIES, MAX_DECKS, TRIBE_LABEL, cardPrice,
  isValidDeck, type CardDef, type Rarity,
} from '@cardbattle/shared';
import { buyCard, saveDeck, setActiveDeck, deleteDeck, type Account } from '../net/auth.js';
import { playSfx } from '../audio/sfx.js';
import { C, mono, sans, RARITY_BORDER, TRIBE_COLOR } from './theme.js';
import { CardArt } from './art/CardArt.js';
import { Icon } from './art/Icon.js';

// The engraved display serif shared with the menu/lobby/shop — one back-room voice.
const serif = "'Times New Roman', Georgia, 'Nanum Myeongjo', serif";
const RARITY_LABEL: Record<Rarity, string> = { common: '일반', rare: '희귀', epic: '영웅', legendary: '전설' };
const RARITY_ORDER: Record<Rarity, number> = { common: 0, rare: 1, epic: 2, legendary: 3 };

/** Price tag / gold amount with the coin glyph. */
function Gold({ amount }: { amount: number }) {
  return <><Icon name="coin" size={14} />&nbsp;{amount}</>;
}

function counts(list: string[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const id of list) m.set(id, (m.get(id) ?? 0) + 1);
  return m;
}

interface Props {
  account: Account;
  onAccount: (a: Account) => void;
  onClose: () => void;
}

// Collection order: rarity then cost then name, so the catalogue reads low→high.
const CATALOG: CardDef[] = [...ALL_DEFS].sort(
  (a, b) => RARITY_ORDER[a.rarity] - RARITY_ORDER[b.rarity] || a.cost - b.cost || a.name.localeCompare(b.name),
);

/** Custom deck builder — buy cards with gold, then compose a DECK_SIZE-card draw deck
 *  (max MAX_COPIES per card) from owned cards. The saved deck is the account's match draw pool. */
export function DeckBuilder({ account, onAccount, onClose }: Props) {
  // Which saved slot is being edited. slot === decks.length is the pending "new deck" slot.
  const [slot, setSlot] = useState<number>(Math.min(account.activeDeck, Math.max(0, account.decks.length - 1)));
  const [draft, setDraft] = useState<string[]>(account.decks[slot] ?? []);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [saved, setSaved] = useState(false);
  // Card whose description is shown — hover on desktop, tap on touch (no hover there).
  const [peek, setPeek] = useState<string | null>(null);

  const slotCount = account.decks.length;
  const canAddSlot = slotCount < MAX_DECKS;
  const isNewSlot = slot >= slotCount;
  const owns = (id: string) => account.ownedCards.includes(id);
  const draftCounts = useMemo(() => counts(draft), [draft]);
  const total = draft.length;
  const valid = isValidDeck(draft, account.ownedCards);
  const savedDeck = account.decks[slot] ?? [];
  const dirty = draft.join(',') !== savedDeck.join(',');

  const selectSlot = (i: number) => {
    if (busy || i === slot) return;
    playSfx('select');
    setSlot(i);
    setDraft(account.decks[i] ?? []);
    setSaved(false); setErr('');
  };

  const act = (fn: () => Promise<Account>) => {
    if (busy) return;
    setBusy(true); setErr('');
    fn().then(onAccount).catch((e: unknown) => setErr(e instanceof Error ? e.message : '오류')).finally(() => setBusy(false));
  };

  const addCard = (id: string) => {
    const have = draftCounts.get(id) ?? 0;
    if (total >= DECK_SIZE || have >= MAX_COPIES) return;
    playSfx('select');
    setDraft((d) => [...d, id]);
    setSaved(false);
  };
  const removeCard = (id: string) => {
    const idx = draft.lastIndexOf(id);
    if (idx < 0) return;
    playSfx('back');
    setDraft((d) => d.filter((_, i) => i !== idx));
    setSaved(false);
  };
  const doSave = () => {
    if (!valid || busy) return;
    setBusy(true); setErr('');
    playSfx('coin');
    saveDeck(slot, draft)
      .then((a) => { onAccount(a); setSaved(true); })
      .catch((e: unknown) => setErr(e instanceof Error ? e.message : '오류'))
      .finally(() => setBusy(false));
  };
  const doSetActive = () => {
    if (busy || isNewSlot || account.activeDeck === slot) return;
    setBusy(true); setErr('');
    playSfx('coin');
    setActiveDeck(slot)
      .then(onAccount)
      .catch((e: unknown) => setErr(e instanceof Error ? e.message : '오류'))
      .finally(() => setBusy(false));
  };
  const doDelete = () => {
    if (busy || isNewSlot || slotCount <= 1) return;
    setBusy(true); setErr('');
    playSfx('back');
    deleteDeck(slot)
      .then((a) => {
        onAccount(a);
        const ns = Math.min(slot, a.decks.length - 1);
        setSlot(ns); setDraft(a.decks[ns] ?? []); setSaved(false);
      })
      .catch((e: unknown) => setErr(e instanceof Error ? e.message : '오류'))
      .finally(() => setBusy(false));
  };

  // The deck side, grouped by card and sorted by cost, reads like a mana curve.
  const deckRows = useMemo(() => {
    return [...draftCounts.entries()]
      .map(([id, n]) => ({ def: CARD_DEFS[id]!, n }))
      .filter((r) => r.def)
      .sort((a, b) => a.def.cost - b.def.cost || a.def.name.localeCompare(b.def.name));
  }, [draftCounts]);

  return (
    <div style={overlay} onClick={onClose}>
      <div style={modal} className="cb-shop-pop" onClick={(e) => e.stopPropagation()}>
        <div style={head}>
          <div style={hdCol}>
            <span style={hdKicker}>◈&nbsp;&nbsp;전장의 서고 · WAR LIBRARY</span>
            <h2 style={hd}>덱 편성</h2>
          </div>
          <span style={goldPill} className="cb-gold-shine"><Gold amount={account.gold} /></span>
          <button style={closeBtn} onClick={() => { playSfx('back'); onClose(); }} aria-label="닫기"><Icon name="close" size={14} /></button>
        </div>

        {err && <p style={errLine}>{err}</p>}

        <div style={body}>
          {/* Deck side */}
          <div style={deckCol}>
            <div style={slotBar}>
              {account.decks.map((_, i) => (
                <button key={i} style={slotChip(i === slot, account.activeDeck === i)}
                  disabled={busy} onClick={() => selectSlot(i)}>
                  덱 {i + 1}{account.activeDeck === i ? ' ★' : ''}
                </button>
              ))}
              {canAddSlot && (
                <button key="new" style={slotChip(isNewSlot, false)}
                  disabled={busy} onClick={() => selectSlot(slotCount)}>+ 새 덱</button>
              )}
            </div>
            <div style={deckHeadRow}>
              <span style={deckTitle}>{isNewSlot ? '새 덱' : `덱 ${slot + 1}`}{!isNewSlot && account.activeDeck === slot ? ' · 사용 중' : ''}</span>
              <span style={deckCount(valid)}>{total} / {DECK_SIZE}</span>
            </div>
            <div style={deckList}>
              {deckRows.length === 0 && <p style={emptyNote}>보유 카드를 추가해 20장 덱을 만드세요.</p>}
              {deckRows.map(({ def, n }) => (
                <button key={def.id} style={deckRow} onClick={() => removeCard(def.id)} title="클릭하면 1장 제거">
                  <span style={costChip(def.rarity)}>{def.cost}</span>
                  <span style={deckName}>{def.name}</span>
                  {n > 1 && <span style={copyTag}>×{n}</span>}
                  <span style={removeMark}>−</span>
                </button>
              ))}
            </div>
            <button style={saveBtn(valid && dirty)} disabled={!valid || !dirty || busy} onClick={doSave}>
              {saved && !dirty ? '저장됨 ✓' : valid ? (isNewSlot ? '덱 만들기' : '덱 저장') : `20장 필요 (${DECK_SIZE - total}장 남음)`}
            </button>
            {!isNewSlot && (
              <div style={actionRow}>
                <button style={setActiveBtn(account.activeDeck !== slot)}
                  disabled={busy || account.activeDeck === slot} onClick={doSetActive}>
                  {account.activeDeck === slot ? '사용 중인 덱' : '이 덱 사용'}
                </button>
                <button style={deleteBtn(slotCount > 1)}
                  disabled={busy || slotCount <= 1} onClick={doDelete} title="이 덱 삭제">삭제</button>
              </div>
            )}
          </div>

          {/* Collection side */}
          <div style={collCol}>
            <span style={collTitle}>카드 수집</span>
            <div style={grid}>
              {CATALOG.map((def) => {
                const owned = owns(def.id);
                const inDeck = draftCounts.get(def.id) ?? 0;
                const price = cardPrice(def.id) ?? 0;
                const maxed = inDeck >= MAX_COPIES;
                const full = total >= DECK_SIZE;
                return (
                  <div key={def.id} style={cardCell(def.rarity, owned)}
                    onMouseEnter={() => setPeek(def.id)} onMouseLeave={() => setPeek((p) => (p === def.id ? null : p))}>
                    <div style={artWrap(def.rarity)}
                      onClick={() => setPeek((p) => (p === def.id ? null : def.id))}>
                      <CardArt id={def.id} size="clamp(96px, 9vw, 150px)" />
                      {peek === def.id && (
                        <div style={{ ...descPanel, borderColor: RARITY_BORDER[def.rarity] }}>
                          <span style={{ ...descRibbon, background: `linear-gradient(90deg, transparent, ${RARITY_BORDER[def.rarity]}, transparent)` }} aria-hidden />
                          <div style={descMeta}>
                            <span style={descCost}>◈ {def.cost}</span>
                            {def.tribe && (
                              <span style={{ ...descTribe, color: TRIBE_COLOR[def.tribe], borderColor: `${TRIBE_COLOR[def.tribe]}55`, background: `${TRIBE_COLOR[def.tribe]}18` }}>{TRIBE_LABEL[def.tribe]}</span>
                            )}
                            <span style={descRarity}>{RARITY_LABEL[def.rarity]}</span>
                          </div>
                          <div style={descText}>{def.desc}</div>
                        </div>
                      )}
                    </div>
                    <span style={cardName}>{def.name}</span>
                    <span style={cardMeta}>
                      {def.tribe && <b style={{ color: TRIBE_COLOR[def.tribe] }}>{TRIBE_LABEL[def.tribe]} · </b>}
                      {RARITY_LABEL[def.rarity]} · {def.cost}코스트
                    </span>
                    {owned ? (
                      <button style={addBtn(!maxed && !full)} disabled={maxed || full}
                        onClick={() => addCard(def.id)}>
                        {maxed ? `최대 ${MAX_COPIES}장` : full ? '덱 가득 참' : `덱에 추가${inDeck ? ` (${inDeck})` : ''}`}
                      </button>
                    ) : (
                      <button className="cb-shop-btn" style={buyBtn} disabled={busy}
                        onClick={() => { playSfx('coin'); act(() => buyCard(def.id)); }}>
                        <Gold amount={price} /> 구매
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const overlay: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 60, display: 'grid', placeItems: 'center',
  background:
    'radial-gradient(70% 60% at 50% 30%, rgba(120,70,200,0.22), transparent 70%),' +
    'rgba(4,6,12,0.8)',
  backdropFilter: 'blur(5px)', fontFamily: sans,
};
const modal: React.CSSProperties = {
  width: 'min(1440px, 98vw)', height: '96vh', maxHeight: '96vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
  borderRadius: 4, background: '#12161f',
  border: `1px solid ${C.borderHi}`, borderTop: '2px solid #a86bff', color: C.text,
  boxShadow: '0 20px 44px rgba(0,0,0,0.55)',
};
const head: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', borderBottom: `1px solid ${C.border}`,
  background: 'rgba(168,107,255,0.06)',
};
const hdCol: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 3, flex: 1 };
const hdKicker: React.CSSProperties = {
  fontFamily: mono, fontSize: 10, letterSpacing: 3.5, color: C.faint, textTransform: 'uppercase',
};
const hd: React.CSSProperties = {
  margin: 0, fontFamily: serif, fontSize: 32, fontWeight: 700, letterSpacing: 3, color: '#eef2fb',
  textShadow: '0 2px 0 #0d1019',
};
const goldPill: React.CSSProperties = {
  fontFamily: mono, fontSize: 15, fontWeight: 700, color: '#e6cf96', padding: '5px 12px', borderRadius: 4,
  border: '1px solid #5a4820', background: 'rgba(42,33,14,0.85)',
};
const closeBtn: React.CSSProperties = {
  width: 34, height: 34, borderRadius: 4, cursor: 'pointer', color: C.dim, fontSize: 16,
  border: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.04)',
};
const errLine: React.CSSProperties = { margin: '10px 20px 0', color: C.enemy, fontSize: 12.5, textAlign: 'center' };
const body: React.CSSProperties = { display: 'flex', gap: 18, padding: 18, overflow: 'hidden', minHeight: 0 };

// Deck column
const deckCol: React.CSSProperties = {
  width: 'clamp(300px, 24vw, 380px)', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 10,
  background: 'rgba(16,20,32,0.6)', border: `1px solid ${C.border}`, borderRadius: 4, padding: 14,
};
const slotBar: React.CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 5 };
function slotChip(on: boolean, active: boolean): React.CSSProperties {
  return {
    padding: '5px 9px', fontFamily: mono, fontSize: 11, fontWeight: 800, cursor: on ? 'default' : 'pointer',
    borderRadius: 3, color: on ? '#141608' : active ? C.rare : C.dim,
    border: `1px solid ${on ? '#6f7d3a' : active ? C.rare : C.border}`,
    background: on ? '#9fae6a' : 'rgba(255,255,255,0.02)', whiteSpace: 'nowrap',
  };
}
const actionRow: React.CSSProperties = { display: 'flex', gap: 6 };
function setActiveBtn(active: boolean): React.CSSProperties {
  return {
    flex: 1, padding: '8px 10px', fontSize: 12.5, fontWeight: 700, cursor: active ? 'pointer' : 'default',
    borderRadius: 3, color: active ? C.rare : C.faint,
    border: `1px solid ${active ? C.rare : C.border}`,
    background: active ? 'rgba(207,154,47,0.10)' : 'rgba(255,255,255,0.02)',
  };
}
function deleteBtn(active: boolean): React.CSSProperties {
  return {
    padding: '8px 12px', fontSize: 12.5, fontWeight: 700, cursor: active ? 'pointer' : 'default',
    borderRadius: 3, color: active ? C.enemy : C.faint,
    border: `1px solid ${active ? '#6e2b26' : C.border}`,
    background: active ? 'rgba(126,38,40,0.16)' : 'rgba(255,255,255,0.02)',
  };
}
const deckHeadRow: React.CSSProperties = { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' };
const deckTitle: React.CSSProperties = { fontFamily: serif, fontSize: 22, fontWeight: 700, color: '#eef2fb' };
function deckCount(valid: boolean): React.CSSProperties {
  return { fontFamily: mono, fontSize: 15, fontWeight: 800, color: valid ? C.you : C.dim };
}
const deckList: React.CSSProperties = {
  flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 5, minHeight: 120,
};
const emptyNote: React.CSSProperties = { margin: 'auto', color: C.faint, fontSize: 12.5, textAlign: 'center', lineHeight: 1.6 };
const deckRow: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 10, padding: '10px 11px', cursor: 'pointer',
  background: 'rgba(255,255,255,0.02)', border: `1px solid ${C.border}`, borderRadius: 4,
  color: C.text, fontFamily: sans, textAlign: 'left',
};
function costChip(rarity: Rarity): React.CSSProperties {
  return {
    width: 28, height: 28, flexShrink: 0, display: 'grid', placeItems: 'center', borderRadius: 4,
    fontFamily: mono, fontSize: 14, fontWeight: 800, color: '#eef2fb',
    background: 'rgba(30,52,74,0.5)', border: `1px solid ${RARITY_BORDER[rarity]}`,
  };
}
const deckName: React.CSSProperties = { flex: 1, fontSize: 15, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };
const copyTag: React.CSSProperties = { fontFamily: mono, fontSize: 14, fontWeight: 800, color: C.rare };
const removeMark: React.CSSProperties = { fontSize: 18, fontWeight: 800, color: C.enemy, width: 16, textAlign: 'center' };
function saveBtn(active: boolean): React.CSSProperties {
  return {
    padding: '11px 16px', fontSize: 14, fontWeight: 700, cursor: active ? 'pointer' : 'default',
    borderRadius: 4, color: active ? '#141608' : C.faint,
    border: active ? '1px solid #6f7d3a' : `1px solid ${C.border}`,
    background: active ? '#9fae6a' : 'rgba(255,255,255,0.03)',
  };
}

// Collection column
const collCol: React.CSSProperties = { flex: 1, display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 };
const collTitle: React.CSSProperties = { fontFamily: serif, fontSize: 22, fontWeight: 700, color: '#eef2fb' };
const grid: React.CSSProperties = {
  overflow: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(clamp(170px, 15vw, 230px), 1fr))',
  gap: 16, alignContent: 'start', paddingRight: 6,
};
function cardCell(rarity: Rarity, owned: boolean): React.CSSProperties {
  return {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '14px 12px',
    borderRadius: 6, background: owned ? 'rgba(42,33,14,0.4)' : 'rgba(255,255,255,0.02)',
    border: `1px solid ${owned ? RARITY_BORDER[rarity] : C.border}`,
    opacity: owned ? 1 : 0.82,
  };
}
function artWrap(rarity: Rarity): React.CSSProperties {
  return {
    position: 'relative', cursor: 'help',
    width: 'clamp(112px, 10.5vw, 170px)', height: 'clamp(112px, 10.5vw, 170px)',
    display: 'grid', placeItems: 'center', borderRadius: 6, overflow: 'hidden',
    background: 'linear-gradient(180deg, #211a12, #100a08)', border: `1px solid ${RARITY_BORDER[rarity]}`,
  };
}
// Hover/tap description — overlays the art window (stays inside the cell, so the grid never clips it).
const descPanel: React.CSSProperties = {
  position: 'absolute', inset: 0, zIndex: 5, padding: '12px 11px 10px',
  display: 'flex', flexDirection: 'column', gap: 7, textAlign: 'left', overflow: 'hidden',
  background: 'linear-gradient(180deg, rgba(18,12,6,0.97), rgba(8,5,3,0.98))',
  border: '1px solid', borderRadius: 6,
};
const descRibbon: React.CSSProperties = { position: 'absolute', top: 0, left: 0, right: 0, height: 1.5, opacity: 0.9 };
const descMeta: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 6 };
const descCost: React.CSSProperties = {
  fontFamily: mono, fontSize: 11, fontWeight: 800, letterSpacing: 0.3, color: '#e6cf96',
  padding: '1px 7px', borderRadius: 5, border: '1px solid #6a552855', background: 'rgba(195,154,76,0.15)',
};
const descTribe: React.CSSProperties = {
  fontFamily: mono, fontSize: 10, fontWeight: 800, letterSpacing: 0.5,
  padding: '1px 6px', borderRadius: 5, border: '1px solid transparent',
};
const descRarity: React.CSSProperties = { fontFamily: mono, fontSize: 10, fontWeight: 800, letterSpacing: 1, color: C.dim };
const descText: React.CSSProperties = {
  fontSize: 'clamp(11px, 1.05vw, 13.5px)', lineHeight: 1.5, color: C.text, whiteSpace: 'normal',
  overflowY: 'auto',
};
const cardName: React.CSSProperties = { fontSize: 'clamp(15px, 1.4vw, 19px)', fontWeight: 700, textAlign: 'center' };
const cardMeta: React.CSSProperties = { fontFamily: mono, fontSize: 'clamp(11px, 1vw, 13px)', color: C.dim, textAlign: 'center' };
function addBtn(active: boolean): React.CSSProperties {
  return {
    width: '100%', padding: '9px 6px', fontSize: 'clamp(12px, 1.15vw, 15px)', fontWeight: 700, cursor: active ? 'pointer' : 'default',
    borderRadius: 4, color: active ? C.text : C.faint,
    border: `1px solid ${active ? C.borderHi : C.border}`,
    background: active ? 'rgba(143,157,79,0.14)' : 'rgba(255,255,255,0.02)',
  };
}
const buyBtn: React.CSSProperties = {
  width: '100%', padding: '9px 6px', fontSize: 'clamp(12px, 1.15vw, 15px)', fontWeight: 700, color: '#2a1e04', cursor: 'pointer',
  border: '1px solid #b98a2c', borderRadius: 4, background: '#cf9a2f',
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3,
};
