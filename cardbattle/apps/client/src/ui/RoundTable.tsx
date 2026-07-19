import type { UiState } from '../state/useRoom.js';
import { COSMETIC_BY_ID, TITLE_BY_ID } from '@cardbattle/shared';
import { C, mono, sans } from './theme.js';
import { AvatarArt, BOT_TINTS } from './art/CreatureArt.js';
import { Icon } from './art/Icon.js';

interface Props {
  ui: UiState;
  myId: string;
  selectable: boolean;
  onSelect: (id: string) => void;
}

// Ellipse the seats ride on, as % of the table area. cy sits a touch below centre so the
// top arc clears the bar and the near (my) seat tucks just above the hand. RY is squashed
// well below RX so the ring reads as a table tilted away from us into the chamber's perspective
// (foreshortened depth), matching the receding side-wall gear and the perspective floor.
// Seat ring flattened to hug the steeply-tilted felt: its projected rim is much shorter than
// wide now, so RY is well below RX and the whole ring is a touch higher (CY) than the felt centre
// so the far seats tuck onto the back rim instead of floating up the wall.
const CX = 50, CY = 57, RX = 34, RY = 21;

/** Everyone seated around a single oval table: my seat anchored at the front (bottom), the
 * rest fanned clockwise by seat order so the central turn-needle points outward to whoever
 * is acting. Each seat keeps its data-pid anchor for the VFX layer + needle. */
export function RoundTable({ ui, myId, selectable, onSelect }: Props) {
  const activeId = ui.turnOrder[ui.currentTurnIndex];
  const ring = [...ui.players].sort((a, b) => a.seat - b.seat);
  const n = ring.length;
  const myRing = Math.max(0, ring.findIndex((p) => p.id === myId));

  return (
    <div style={area}>
      {/* A single clean table oval — a muted felt disc with a thin gold rim, tilted into the
          scene so the seat ring reads as sitting around it. No grid, no lamp, no grime. */}
      <div style={felt} aria-hidden />

      {/* House sigil branded into the felt centre — anchors the empty middle instead of a void.
          A brass-engraved medallion carrying the ROUND count and the flow direction, laid flat
          on the table plane (rotateX) and dimmed so it reads as inlay, not a focal element. */}
      <div style={emblem} aria-hidden>
        <div style={emblemInk}>
          <Icon name="skull" size={26} />
          <div style={emblemRound}>ROUND</div>
          <div style={emblemNum}>{ui.roundCount}</div>
          <div style={emblemDir}>
            <Icon name={ui.turnDir === -1 ? 'arrowCCW' : 'arrowCW'} size={13} />
          </div>
        </div>
      </div>

      {/* In front of each living seat: a small fan of face-down cards, one per card the player
          is holding. A persistent passive (e.g. shield) shows as a chip above so it stays put. */}
      {ring.map((p, i) => {
        if (!p.alive) return null;
        const k = ((i - myRing) % n + n) % n;
        const theta = ((90 + k * (360 / n)) * Math.PI) / 180;
        const sLeft = CX + RX * Math.cos(theta);
        const sTop = CY + RY * Math.sin(theta);
        const spotLeft = sLeft * 0.66 + CX * 0.34; // a third of the way in toward the table centre
        const spotTop = sTop * 0.66 + CY * 0.34;
        const cards = Math.max(0, p.handCount);
        const spread = cards > 1 ? Math.min(11, 64 / (cards - 1)) : 0;
        // The player's equipped border cosmetic paints the back of their face-down cards, so
        // everyone at the table sees which frame they've equipped — not just its owner's hand.
        const cos = COSMETIC_BY_ID[p.border];
        const hasCos = !!cos && cos.id !== 'none';
        return (
          <div key={`tc-${p.id}`} style={{ ...tableFan, left: `${spotLeft}%`, top: `${spotTop}%` }}>
            {Array.from({ length: cards }).map((_, ci) => {
              const off = ci - (cards - 1) / 2;
              return (
                <span
                  key={ci}
                  style={{ ...miniBack, ...(hasCos ? miniBackCos(cos!) : null), left: off * spread, transform: `translate(-50%,-50%) rotate(${off * 4}deg)`, zIndex: ci }}
                />
              );
            })}
            {p.defense > 0 && <span style={shieldChip}><Icon name="shield" size={11} />{p.defense}</span>}
          </div>
        );
      })}

      {ring.map((p, i) => {
        const isMe = p.id === myId;
        const k = ((i - myRing) % n + n) % n;            // 0 = me, then clockwise around the oval
        const theta = ((90 + k * (360 / n)) * Math.PI) / 180; // 90° = bottom-front
        const left = CX + RX * Math.cos(theta);
        const top = CY + RY * Math.sin(theta);
        const isActive = p.id === activeId;
        const canTarget = selectable && p.alive && !isMe;
        const accent = isMe ? C.you : C.enemy;
        const hpPct = Math.max(0, (p.hp / p.maxHp) * 100);

        // Value hierarchy: the acting player is the clear focus (bigger, brighter); everyone
        // else who isn't me or a current target recedes into the background (dimmer, desaturated,
        // a touch smaller) so the eye lands on whose turn it is. Targetable foes stay bright.
        const recede = p.alive && !isActive && !isMe && !canTarget;
        const seatFilter = !p.alive
          ? 'grayscale(1)'
          : isActive
          ? 'brightness(1.1) saturate(1.06)'
          : recede
          ? 'brightness(0.62) saturate(0.8)'
          : 'none';
        const seatOpacity = !p.alive ? 0.4 : isActive ? 1 : recede ? 0.58 : isMe ? 1 : 0.9;
        const seatScale = isActive ? 1.12 : recede ? 0.96 : 1;

        return (
          <div
            key={p.id}
            data-pid={p.id}
            onClick={() => canTarget && onSelect(p.id)}
            style={{
              ...seat,
              left: `${left}%`, top: `${top}%`,
              width: isMe ? 132 : 112,
              cursor: canTarget ? 'crosshair' : 'default',
              filter: seatFilter,
              opacity: seatOpacity,
              transform: `translate(-50%,-50%) scale(${seatScale})`,
              zIndex: isActive ? 8 : recede ? 3 : 4,
            }}
          >
            <div
              data-portrait={p.id}
              style={{
                ...portrait,
                width: isMe ? 92 : 80, height: isMe ? 92 : 80,
                borderColor: isActive || canTarget || isMe ? accent : C.border,
                boxShadow: isActive
                  ? `0 0 0 2px ${accent}, 0 14px 38px ${isMe ? 'rgba(143,157,79,0.4)' : 'rgba(176,70,47,0.4)'}`
                  : isMe
                  ? `0 0 0 1px ${C.you}, 0 0 22px rgba(143,157,79,0.3)`
                  : canTarget
                  ? `0 0 0 1px ${C.enemy}, 0 0 24px rgba(176,70,47,0.45)`
                  : '0 10px 24px rgba(0,0,0,0.5)',
              }}
            >
              {p.defense > 0 && <span style={{ ...badge, ...badgeDef }}><Icon name="shield" size={11} />{p.defense}</span>}
              {!p.connected && p.alive && <span style={{ ...badge, ...badgeWarn }}><Icon name="warn" size={12} /></span>}
              <AvatarArt avatar={p.avatar} tint={BOT_TINTS[p.seat % BOT_TINTS.length]} variant={p.seat} size={56} />
              {!p.alive && <span style={skull}><Icon name="skull" size={30} /></span>}
              {isActive && p.alive && <span style={{ ...spot, background: `radial-gradient(ellipse, ${isMe ? 'rgba(143,157,79,0.4)' : 'rgba(176,70,47,0.35)'}, transparent 70%)` }} />}
            </div>

            {p.alive && p.statuses.length > 0 && (
              <div style={statusRow}>
                {p.statuses.map((st) => {
                  const meta = STATUS_META[st.kind] ?? { color: C.dim, icon: 'zzz' as const };
                  const label = st.kind === 'reflect' ? `${st.amount}%` : String(st.amount);
                  return (
                    <span key={st.kind} style={{ ...statusChip, color: meta.color, borderColor: `${meta.color}66` }}
                      title={`${st.turns}턴 남음`}>
                      <Icon name={meta.icon} size={10} />{label}
                      <i style={statusTurns}>{st.turns}</i>
                    </span>
                  );
                })}
              </div>
            )}

            <div style={hpBar}>
              {(() => {
                const crit = p.alive && hpPct <= 30;
                const fillBg = crit
                  ? 'linear-gradient(90deg,#d24a35,#a5301f)'
                  : isMe ? `linear-gradient(90deg,#aeb877,${C.you})` : `linear-gradient(90deg,#c96a52,${C.enemy})`;
                return (
                  <i style={{ ...hpFill, width: `${hpPct}%`, background: fillBg, animation: crit ? 'cb-hp-crit 0.9s ease-in-out infinite' : undefined }}>
                    <span style={hpGloss} />
                  </i>
                );
              })()}
            </div>
            <div style={info}>
              <span style={{ ...nm, color: isMe ? C.you : C.dim }}>
                {p.name}{isMe ? ' (나)' : ''}{isActive && p.alive ? ' · 턴' : ''}{p.skipTurns > 0 && p.alive ? <> · <Icon name="zzz" size={11} /></> : ''}
              </span>
              <span style={{ ...val, ...(p.alive && hpPct <= 30 ? { color: '#d9634a', fontWeight: 800 } : null) }}>{p.alive ? `${p.hp}/${p.maxHp}` : 'DEAD'}</span>
              {p.alive && <span style={manaVal}>◈{p.mana}</span>}
            </div>
            {(() => {
              // A player's equipped title (칭호), shown to everyone under their name.
              const t = TITLE_BY_ID[p.title];
              if (!t || !t.text) return null;
              return <span style={titleLine(t.color)}>{t.text}</span>;
            })()}
          </div>
        );
      })}
    </div>
  );
}

const area: React.CSSProperties = { position: 'absolute', inset: 0, fontFamily: sans, pointerEvents: 'none' };
// A single premium table oval, tilted into the scene so the seats read as sitting around it.
// One clean element, but finished like a real object: a warm overhead pool lights the felt
// centre, the baize deepens to black at the rim, a brass bezel catches a hairline of light,
// and a soft drop shadow floats the whole table above the floor. No grid, lamp, or grime.
const felt: React.CSSProperties = {
  position: 'absolute', left: '50%', top: `${CY}%`,
  transform: 'translate(-50%,-50%) perspective(620px) rotateX(62deg)',
  width: '62%', height: '60%', borderRadius: '50%', overflow: 'hidden',
  background:
    'radial-gradient(ellipse 58% 52% at 50% 38%, rgba(230,180,96,0.17), transparent 60%),' + // warm overhead light pool
    'radial-gradient(ellipse at 50% 42%, #3a1c1e 0%, #26100f 52%, #100607 100%)',            // deep burgundy felt tied to the oxblood room: lit centre → black rim
  border: '2px solid rgba(200,152,70,0.30)',
  boxShadow:
    'inset 0 0 5px 1px rgba(236,202,126,0.24),' + // brass rim highlight
    'inset 0 0 92px 30px rgba(0,0,0,0.72),' +     // felt edge falls to black
    '0 28px 62px rgba(0,0,0,0.6)',                // table floats above the floor
};
// The engraved house medallion at the table centre. Laid flat on the felt plane (same rotateX
// as the card piles) and low-opacity so it feels branded INTO the baize — an anchor for the
// dead middle, never competing with the seats or VFX.
const emblem: React.CSSProperties = {
  position: 'absolute', left: `${CX}%`, top: `${CY}%`, zIndex: 2, pointerEvents: 'none',
  transform: 'translate(-50%,-50%) perspective(520px) rotateX(58deg)',
  width: 96, height: 96, borderRadius: '50%',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: 'radial-gradient(circle at 50% 42%, rgba(198,150,72,0.10), rgba(0,0,0,0) 68%)',
  border: '1.5px solid rgba(198,150,72,0.22)',
  boxShadow: 'inset 0 0 18px 4px rgba(0,0,0,0.5), inset 0 0 3px rgba(236,202,126,0.18)',
  opacity: 0.62,
};
const emblemInk: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
  color: 'rgba(210,178,116,0.85)', textShadow: '0 1px 2px rgba(0,0,0,0.6)',
};
const emblemRound: React.CSSProperties = {
  fontFamily: mono, fontSize: 9, letterSpacing: 3, color: 'rgba(198,168,120,0.7)', marginTop: 2,
};
const emblemNum: React.CSSProperties = {
  fontFamily: mono, fontSize: 22, fontWeight: 900, lineHeight: 1, color: 'rgba(224,196,140,0.92)',
};
const emblemDir: React.CSSProperties = {
  marginTop: 2, color: 'rgba(198,168,120,0.6)', display: 'flex',
};
// The face-down pile each player has laid on the table. Tilted onto the felt's own plane
// (perspective + rotateX) so the cards lie FLAT on the baize seen from above, not standing
// upright like billboards — matching the looking-down-at-a-desk framing.
const tableFan: React.CSSProperties = {
  position: 'absolute', transform: 'translate(-50%,-50%) perspective(520px) rotateX(58deg)', width: 0, height: 0,
  transformStyle: 'preserve-3d', pointerEvents: 'none', zIndex: 3,
};
const miniBack: React.CSSProperties = {
  position: 'absolute', top: 0, width: 20, height: 28, borderRadius: 4,
  transformOrigin: 'center bottom', display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: 'linear-gradient(160deg,#2a2013,#171009)', border: `1px solid ${C.border}`,
  boxShadow: '0 3px 8px rgba(0,0,0,0.5), inset 0 0 0 2px rgba(143,157,79,0.06)',
};
/** Paint a mini face-down card's border/glow from an equipped border cosmetic. Gradient
 *  borders use the backgroundImage+clip trick; solid colors set borderColor directly. */
function miniBackCos(cos: { border: string; glow: string }): React.CSSProperties {
  const grad = cos.border.startsWith('linear') || cos.border.startsWith('radial');
  return {
    boxShadow: `0 0 8px ${cos.glow}, 0 3px 8px rgba(0,0,0,0.5)`,
    ...(grad
      ? { border: '1.5px solid transparent', backgroundImage: `linear-gradient(160deg,#2a2013,#171009), ${cos.border}`, backgroundOrigin: 'border-box', backgroundClip: 'padding-box, border-box' }
      : { borderColor: cos.border }),
  };
}
const shieldChip: React.CSSProperties = {
  position: 'absolute', top: -32, left: 0, transform: 'translateX(-50%)',
  padding: '1px 6px', borderRadius: 6, fontSize: 11, fontWeight: 800, fontFamily: mono,
  color: '#bccfc6', background: 'linear-gradient(160deg,#1c2a24,#12201b)', border: '1px solid #6f9a8e',
  boxShadow: '0 0 10px rgba(113,145,138,0.5)', whiteSpace: 'nowrap', zIndex: 20,
};
const seat: React.CSSProperties = {
  position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
  pointerEvents: 'auto', transition: 'transform .45s cubic-bezier(.22,.61,.36,1), filter .45s ease, opacity .45s ease',
};
const portrait: React.CSSProperties = {
  borderRadius: 16, position: 'relative', overflow: 'hidden',
  background: `linear-gradient(160deg, ${C.panelHi}, ${C.panel})`, border: `1px solid ${C.border}`,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  transition: 'box-shadow .3s cubic-bezier(.22,.61,.36,1), border-color .3s ease',
};
const badge: React.CSSProperties = {
  position: 'absolute', top: 5, minWidth: 24, height: 20, padding: '0 4px', borderRadius: 7, display: 'flex',
  alignItems: 'center', justifyContent: 'center', fontSize: 11, fontFamily: mono, fontWeight: 700,
  border: `1px solid ${C.border}`, background: 'rgba(10,12,20,0.85)', zIndex: 2,
};
const badgeDef: React.CSSProperties = { left: 5, color: '#8fb0a6' };
const badgeWarn: React.CSSProperties = { right: 5, color: C.rare };
// Ongoing turn-start effects, shown as a compact chip row under the portrait.
const STATUS_META: Record<string, { color: string; icon: 'poison' | 'reflect' | 'regen' | 'zzz' }> = {
  poison: { color: '#9aa863', icon: 'poison' },
  regen: { color: '#8bb0a6', icon: 'regen' },
  reflect: { color: '#a48ec0', icon: 'reflect' },
};
const statusRow: React.CSSProperties = {
  display: 'flex', gap: 3, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 3, maxWidth: '96%',
};
const statusChip: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 2, height: 16, padding: '0 4px', borderRadius: 6,
  fontSize: 9, fontFamily: mono, fontWeight: 700, border: '1px solid', background: 'rgba(10,12,20,0.82)',
};
const statusTurns: React.CSSProperties = {
  fontSize: 9, opacity: 0.7, fontStyle: 'normal', marginLeft: 1,
};
const skull: React.CSSProperties = {
  position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32,
};
const spot: React.CSSProperties = {
  position: 'absolute', left: '50%', bottom: -22, transform: 'translateX(-50%)',
  width: 120, height: 42, borderRadius: '50%',
};
const hpBar: React.CSSProperties = {
  width: '86%', height: 8, borderRadius: 6, background: '#0c0f18', border: `1px solid ${C.border}`, overflow: 'hidden',
};
const hpFill: React.CSSProperties = { display: 'block', height: '100%', borderRadius: 6, position: 'relative', overflow: 'hidden', transition: 'width .5s cubic-bezier(.22,.61,.36,1)' };
// A slim specular strip across the top of the fill — the bar reads as a lit glass tube, not a flat block.
const hpGloss: React.CSSProperties = {
  position: 'absolute', left: 0, right: 0, top: 0, height: '45%', borderRadius: '6px 6px 40% 40%',
  background: 'linear-gradient(180deg, rgba(255,255,255,0.4), rgba(255,255,255,0))',
};
const info: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 6, maxWidth: '100%' };
const nm: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, maxWidth: 78, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
};
const val: React.CSSProperties = { fontFamily: mono, fontSize: 11, color: C.dim, whiteSpace: 'nowrap' };
const manaVal: React.CSSProperties = { fontFamily: mono, fontSize: 11, color: '#c9ab63', whiteSpace: 'nowrap' };
/** Equipped-title chip under the name. Gradient title colors paint via background-clip:text. */
function titleLine(color: string): React.CSSProperties {
  const grad = color.startsWith('linear') || color.startsWith('radial');
  return {
    fontSize: 9, fontWeight: 900, letterSpacing: 0.4, marginTop: -1, whiteSpace: 'nowrap',
    ...(grad
      ? { backgroundImage: color, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', WebkitTextFillColor: 'transparent' }
      : { color }),
  };
}
