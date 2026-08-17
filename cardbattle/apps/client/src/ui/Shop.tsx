import { useState } from 'react';
import {
  COSMETICS, TITLES, PLAY_EFFECTS, ALL_DEFS, CARD_DEFS, CARD_PACKS, TRIBE_LABEL,
  type Cosmetic, type Title, type PlayEffect, type CardDef, type Rarity, type PackId, type PackDef,
} from '@cardbattle/shared';
import { buyCosmetic, equipCosmetic, openPack, openOwnedPack, type Account } from '../net/auth.js';
import { playSfx } from '../audio/sfx.js';
import { C, mono, sans, RARITY_BORDER, TRIBE_COLOR } from './theme.js';
import { CardArt } from './art/CardArt.js';
import { Icon, EFFECT_ICON } from './art/Icon.js';

// The engraved display serif shared with the menu/lobby — one back-room voice across screens.
const serif = "'Times New Roman', Georgia, 'Nanum Myeongjo', serif";

const RARITY_LABEL: Record<Rarity, string> = { common: '일반', rare: '희귀', epic: '영웅', legendary: '전설' };

/** Price tag / gold amount with the coin glyph. */
function Gold({ amount }: { amount: number }) {
  return <><Icon name="coin" size={14} />&nbsp;{amount}</>;
}

interface Props {
  account: Account;
  onAccount: (a: Account) => void;
  onClose: () => void;
}

type TabId = 'pack' | 'border' | 'title' | 'effect';
const TABS: { id: TabId; label: string }[] = [
  { id: 'pack', label: '카드팩' },
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
  const [tab, setTab] = useState<TabId>('pack');
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
          {tab === 'pack' && (
            <PackTab account={account} onAccount={onAccount} />
          )}
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

// Per-tier pack visuals: a sealed foil pack tinted by rarity odds (steel → sapphire → amethyst).
const PACK_STYLE: Record<PackId, { grad: string; border: string; glow: string; seal: string; label: string }> = {
  normal: { grad: 'radial-gradient(circle at 50% 30%, rgba(150,170,190,0.30), #10131a 74%)', border: '#8794a6', glow: 'rgba(140,160,190,0.5)', seal: '#dfe7f0', label: '일반' },
  rare:   { grad: 'radial-gradient(circle at 50% 30%, rgba(90,150,255,0.32), #0d1424 74%)',  border: '#5a8ce0', glow: 'rgba(90,150,255,0.55)', seal: '#cfe1ff', label: '레어' },
  super:  { grad: 'radial-gradient(circle at 50% 30%, rgba(200,140,255,0.34), #180d22 74%)', border: '#b06bff', glow: 'rgba(180,110,255,0.6)',  seal: '#ecd9ff', label: '슈퍼' },
};

/** Odds line: the pack's rarity weights already sum to 100, so they read as percentages. */
function oddsLine(pack: PackDef): string {
  const w = pack.weights;
  return `희귀 ${w.rare}% · 영웅 ${w.epic}% · 전설 ${w.legendary}%`;
}

/** Card packs ("카드팩"): three tiers, each spends its gold price to pull one random UNOWNED card
 *  weighted by the tier's odds. A purchase rolls the card server-side, then a full-screen ceremony
 *  shows the sealed pack — click it to shake, and after a few taps it bursts open to reveal. */
function PackTab({ account, onAccount }: { account: Account; onAccount: (a: Account) => void }) {
  const [busy, setBusy] = useState<PackId | null>(null);
  const [err, setErr] = useState('');
  const [ceremony, setCeremony] = useState<{ pack: PackDef; def: CardDef } | null>(null);

  const remaining = ALL_DEFS.filter((d) => d.rarity !== 'common' && !account.ownedCards.includes(d.id)).length;

  const buy = (pack: PackDef) => {
    if (busy !== null || remaining === 0) return;
    if (account.gold < pack.price) { setErr('골드가 부족합니다.'); return; }
    setBusy(pack.id); setErr(''); playSfx('coin');
    openPack(pack.id)
      .then((res) => {
        const def = CARD_DEFS[res.rolled];
        onAccount(res);
        if (def) setCeremony({ pack, def });
      })
      .catch((e: unknown) => setErr(e instanceof Error ? e.message : '오류'))
      .finally(() => setBusy(null));
  };

  // Open a pack the account already OWNS (won as a match reward) — free, no gold spent.
  const openOwned = (pack: PackDef) => {
    if (busy !== null || remaining === 0) return;
    if ((account.packs[pack.id] ?? 0) <= 0) return;
    setBusy(pack.id); setErr(''); playSfx('select');
    openOwnedPack(pack.id)
      .then((res) => {
        const def = CARD_DEFS[res.rolled];
        onAccount(res);
        if (def) setCeremony({ pack, def });
      })
      .catch((e: unknown) => setErr(e instanceof Error ? e.message : '오류'))
      .finally(() => setBusy(null));
  };

  const ownedPacks = CARD_PACKS.filter((p) => (account.packs[p.id] ?? 0) > 0);

  return (
    <div style={packWrap}>
      {ownedPacks.length > 0 && (
        <div style={ownedPackBox}>
          <span style={ownedPackTitle}>보유한 팩 · 승리 보상</span>
          <div style={ownedPackRow}>
            {ownedPacks.map((pack) => {
              const st = PACK_STYLE[pack.id];
              const count = account.packs[pack.id] ?? 0;
              const disabled = busy !== null || remaining === 0;
              return (
                <div key={pack.id} style={packCard}>
                  <div style={packArt(st)} className={busy === pack.id ? 'cb-box-shake' : 'cb-shop-float'}>
                    <span style={packBadge(st)}>{st.label}</span>
                    <span style={packSeal(st)}>✦</span>
                    <span style={ownedPackCount}>×{count}</span>
                  </div>
                  <span style={previewName}>{pack.name}</span>
                  <button className="cb-shop-btn" style={disabled ? boxBtnOff : equipBtn} disabled={disabled} onClick={() => openOwned(pack)}>
                    {busy === pack.id ? '여는 중…' : '무료 개봉'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {remaining === 0 && <p style={packAllOwned}>모든 카드를 이미 보유했습니다.</p>}
      <div style={packRow}>
        {CARD_PACKS.map((pack) => {
          const st = PACK_STYLE[pack.id];
          const canAfford = account.gold >= pack.price;
          const disabled = busy !== null || remaining === 0 || !canAfford;
          return (
            <div key={pack.id} style={packCard}>
              <div style={packArt(st)} className={busy === pack.id ? 'cb-box-shake' : 'cb-shop-float'}>
                <span style={packBadge(st)}>{st.label}</span>
                <span style={packSeal(st)}>✦</span>
              </div>
              <span style={previewName}>{pack.name}</span>
              <button className="cb-shop-btn" style={disabled ? boxBtnOff : buyBtn} disabled={disabled} onClick={() => buy(pack)}>
                {busy === pack.id ? '여는 중…' : <><Gold amount={pack.price} />&nbsp;열기</>}
              </button>
              <span style={packOdds}>{oddsLine(pack)}</span>
            </div>
          );
        })}
      </div>
      {err && <span style={boxErr}>{err}</span>}
      {ceremony && (
        <PackCeremony pack={ceremony.pack} def={ceremony.def} onClose={() => setCeremony(null)} />
      )}
    </div>
  );
}

/** Full-screen pack-opening ceremony: the sealed pack floats center-screen; each click shakes it
 *  (a one-shot animation replayed by remounting via `key`), and the third tap bursts it open to
 *  reveal the already-rolled card. */
function PackCeremony({ pack, def, onClose }: { pack: PackDef; def: CardDef; onClose: () => void }) {
  const st = PACK_STYLE[pack.id];
  const [clicks, setClicks] = useState(0);
  const [opened, setOpened] = useState(false);
  const NEED = 3;

  const tap = () => {
    if (opened) return;
    const n = clicks + 1;
    setClicks(n);
    if (n >= NEED) { playSfx('select'); setOpened(true); }
    else playSfx('toggle');
  };

  return (
    <div style={ceremonyOverlay} onClick={opened ? onClose : undefined}>
      {!opened ? (
        <div style={ceremonyCol} onClick={(e) => e.stopPropagation()}>
          <span style={ceremonyKicker}>{pack.name}</span>
          <button key={clicks} className={clicks > 0 ? 'cb-pack-shake' : 'cb-shop-float'} style={packBig(st)} onClick={tap} aria-label="팩 개봉">
            <span style={packBigBadge(st)}>{st.label}</span>
            <span style={packBigSeal(st)}>✦</span>
          </button>
          <span style={ceremonyHint}>팩을 클릭해서 개봉하세요</span>
        </div>
      ) : (
        <div style={ceremonyCol} onClick={(e) => e.stopPropagation()}>
          <div className="cb-box-reveal" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
            <div style={revealFace(def.rarity)}>
              {def.tribe && (
                <span style={{ ...faceTribe, color: TRIBE_COLOR[def.tribe], borderColor: `${TRIBE_COLOR[def.tribe]}66`, background: `${TRIBE_COLOR[def.tribe]}22` }}>
                  {TRIBE_LABEL[def.tribe]}
                </span>
              )}
              <div style={faceArt}><CardArt id={def.id} size="100%" /></div>
              <div style={facePlate}><div style={facePlateName}>{def.name}</div></div>
            </div>
            <span style={{ ...rarityTag, color: RARITY_BORDER[def.rarity] }}>
              {RARITY_LABEL[def.rarity]} 카드 획득!
            </span>
            <button className="cb-shop-btn" style={buyBtn} onClick={onClose}>확인</button>
          </div>
        </div>
      )}
    </div>
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
          <button key={t.id} className="cb-shop-swatch" style={swatch(t.id === sel.id, 'rgba(143,157,79,0.4)')} onClick={() => { playSfx('hover'); setSel(t); }} title={t.name}>
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

// —— Card-pack ("카드팩") tab ——
type PackVisual = { grad: string; border: string; glow: string; seal: string; label: string };
const packWrap: React.CSSProperties = { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 };
const packAllOwned: React.CSSProperties = { margin: 0, fontFamily: mono, fontSize: 12, color: C.dim, textAlign: 'center' };
const ownedPackBox: React.CSSProperties = {
  width: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: '14px 16px',
  borderRadius: 6, background: 'rgba(255,140,60,0.06)', border: '1px solid rgba(255,140,60,0.3)',
};
const ownedPackTitle: React.CSSProperties = {
  fontFamily: mono, fontSize: 12, fontWeight: 800, letterSpacing: 1, color: '#ffb27a', textTransform: 'uppercase',
};
const ownedPackRow: React.CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'center' };
const ownedPackCount: React.CSSProperties = {
  position: 'absolute', top: 6, right: 8, fontFamily: mono, fontWeight: 900, fontSize: 14,
  color: '#fff', textShadow: '0 1px 3px rgba(0,0,0,0.8)',
};
const packRow: React.CSSProperties = {
  display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, width: '100%',
};
const packCard: React.CSSProperties = { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 };
function packArt(st: PackVisual): React.CSSProperties {
  return {
    position: 'relative', width: 118, height: 164, borderRadius: 12, display: 'grid', placeItems: 'center',
    background: st.grad, border: `2px solid ${st.border}`,
    boxShadow: `0 0 28px ${st.glow}, inset 0 0 22px rgba(0,0,0,0.4)`,
  };
}
function packBadge(st: PackVisual): React.CSSProperties {
  return {
    position: 'absolute', top: 10, left: 0, right: 0, textAlign: 'center', fontFamily: serif, fontSize: 15,
    fontWeight: 800, letterSpacing: 1, color: st.seal, textShadow: `0 0 12px ${st.glow}`,
  };
}
function packSeal(st: PackVisual): React.CSSProperties {
  return { fontSize: 40, color: st.seal, textShadow: `0 0 20px ${st.glow}`, opacity: 0.9 };
}
const packOdds: React.CSSProperties = { fontFamily: mono, fontSize: 10.5, color: C.dim, textAlign: 'center' };
const boxBtnOff: React.CSSProperties = {
  padding: '10px 18px', fontSize: 14, fontWeight: 700, color: C.dim, cursor: 'not-allowed',
  border: `1px solid ${C.border}`, borderRadius: 4, background: 'rgba(255,255,255,0.04)', opacity: 0.7,
};
const boxErr: React.CSSProperties = { color: C.enemy, fontSize: 12, textAlign: 'center' };

// —— Pack-opening ceremony (full-screen) ——
const ceremonyOverlay: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 80, display: 'grid', placeItems: 'center',
  background: 'radial-gradient(60% 55% at 50% 40%, rgba(120,70,200,0.2), transparent 70%), rgba(3,4,9,0.9)',
  backdropFilter: 'blur(7px)', cursor: 'pointer',
  userSelect: 'none', WebkitUserSelect: 'none',
};
const ceremonyCol: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, cursor: 'default',
};
const ceremonyKicker: React.CSSProperties = {
  fontFamily: serif, fontSize: 24, fontWeight: 700, letterSpacing: 2, color: '#eef2fb', textShadow: '0 2px 0 #0d1019',
};
const ceremonyHint: React.CSSProperties = { fontFamily: mono, fontSize: 13, color: '#c9b8e6', letterSpacing: 1 };
function packBig(st: PackVisual): React.CSSProperties {
  return {
    position: 'relative', width: 208, height: 290, borderRadius: 18, display: 'grid', placeItems: 'center',
    background: st.grad, border: `3px solid ${st.border}`, cursor: 'pointer', padding: 0,
    boxShadow: `0 0 60px ${st.glow}, inset 0 0 40px rgba(0,0,0,0.42)`,
    outline: 'none', WebkitTapHighlightColor: 'transparent', userSelect: 'none', WebkitUserSelect: 'none',
  };
}
function packBigBadge(st: PackVisual): React.CSSProperties {
  return {
    position: 'absolute', top: 22, left: 0, right: 0, textAlign: 'center', fontFamily: serif, fontSize: 24,
    fontWeight: 800, letterSpacing: 2, color: st.seal, textShadow: `0 0 18px ${st.glow}`,
  };
}
function packBigSeal(st: PackVisual): React.CSSProperties {
  return { fontSize: 76, color: st.seal, textShadow: `0 0 34px ${st.glow}`, opacity: 0.92 };
}
function revealFace(rarity: Rarity): React.CSSProperties {
  return {
    position: 'relative', width: 150, aspectRatio: '2 / 3', backgroundImage: 'url(/card-frame.png)',
    backgroundSize: '100% 100%', filter: `drop-shadow(0 0 18px ${RARITY_BORDER[rarity]}) drop-shadow(0 10px 20px rgba(0,0,0,0.5))`,
  };
}
const faceTribe: React.CSSProperties = {
  position: 'absolute', top: '4%', right: '5%', zIndex: 3, fontSize: 10, fontWeight: 800, padding: '1px 6px',
  borderRadius: 999, border: '1px solid', fontFamily: sans,
};
const faceArt: React.CSSProperties = { position: 'absolute', left: '12%', top: '14.5%', width: '76%', height: '60%' };
const facePlate: React.CSSProperties = {
  position: 'absolute', left: '13%', top: '81%', width: '74%', height: '11.5%', display: 'grid', placeItems: 'center',
};
const facePlateName: React.CSSProperties = {
  fontSize: 13, fontWeight: 800, color: '#2c1d0d', fontFamily: serif, textAlign: 'center',
  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%',
};
const rarityTag: React.CSSProperties = { fontSize: 14, fontWeight: 900, letterSpacing: 0.5, textShadow: '0 1px 3px rgba(0,0,0,0.6)' };

const overlay: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 60, display: 'grid', placeItems: 'center',
  // Amethyst haze over wet black, matching the menu's jewel mood.
  background:
    'radial-gradient(70% 60% at 50% 30%, rgba(120,70,200,0.22), transparent 70%),' +
    'rgba(4,6,12,0.8)',
  backdropFilter: 'blur(5px)', fontFamily: sans,
};
const modal: React.CSSProperties = {
  width: 'min(720px, 94vw)', maxHeight: '88vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
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
  margin: 0, fontFamily: serif, fontSize: 26, fontWeight: 700, letterSpacing: 3, color: '#eef2fb',
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
const tabRow: React.CSSProperties = {
  display: 'flex', gap: 8, padding: '12px 20px 0', borderBottom: `1px solid ${C.border}`,
};
function tabBtn(on: boolean): React.CSSProperties {
  return {
    padding: '9px 18px', fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: sans,
    color: on ? C.rare : C.dim, background: 'transparent', border: 'none',
    borderBottom: on ? `2px solid ${C.rare}` : '2px solid transparent', marginBottom: -1,
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
const equippedTag: React.CSSProperties = { fontSize: 13, fontWeight: 800, color: C.you };
const equipBtn: React.CSSProperties = {
  padding: '10px 18px', fontSize: 14, fontWeight: 700, color: '#141608', cursor: 'pointer',
  border: '1px solid #6f7d3a', borderRadius: 4, background: '#9fae6a',
};
const buyBtn: React.CSSProperties = {
  padding: '10px 18px', fontSize: 14, fontWeight: 700, color: '#2a1e04', cursor: 'pointer',
  border: '1px solid #b98a2c', borderRadius: 4, background: '#cf9a2f',
};
const errLine: React.CSSProperties = { margin: '10px 20px 0', color: C.enemy, fontSize: 12.5, textAlign: 'center' };
const grid: React.CSSProperties = {
  flex: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))', gap: 10, alignContent: 'start',
};
function swatch(on: boolean, glow: string): React.CSSProperties {
  return {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '12px 8px', cursor: 'pointer',
    borderRadius: 4, color: C.text, fontFamily: sans, minHeight: 66, justifyContent: 'center',
    background: on ? 'rgba(224,170,70,0.07)' : 'rgba(255,255,255,0.02)',
    border: on ? `2px solid ${C.rare}` : `1px solid ${C.border}`,
    boxShadow: on ? `0 0 14px ${glow}` : 'none',
  };
}
const swatchName: React.CSSProperties = { fontSize: 13, fontWeight: 700 };
const swatchPrice: React.CSSProperties = { fontFamily: mono, fontSize: 11.5, color: C.dim };
