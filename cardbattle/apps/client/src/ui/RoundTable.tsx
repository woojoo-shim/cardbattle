import { useState } from 'react';
import type { UiState, UiMinion } from '../state/useRoom.js';
import { COSMETIC_BY_ID, TITLE_BY_ID, CARD_DEFS } from '@cardbattle/shared';
import { C, mono, sans } from './theme.js';
import { AvatarArt, BOT_TINTS } from './art/CreatureArt.js';
import { CardArt } from './art/CardArt.js';
import { Icon } from './art/Icon.js';

interface Props {
  ui: UiState;
  myId: string;
  selectable: boolean;
  onSelect: (id: string) => void;
  /** My turn and free to pick one of my minions to attack with. */
  attackMode?: boolean;
  /** The id of my minion currently armed to attack (highlighted). */
  attackerId?: string | null;
  onSelectAttacker?: (id: string) => void;
}

// Ellipse the seats ride on, as % of the table area. TOP-DOWN view: the table is now seen
// from directly above, so the ring is a nearly full circle (RY close to RX, only slightly
// squashed because the play area is wider than tall). cy is centred so seats fan evenly all
// the way around; my seat still anchors at the bottom-front (90°).
const CX = 50, CY = 52, RX = 41, RY = 37;

/** Everyone seated around a single oval table: my seat anchored at the front (bottom), the
 * rest fanned clockwise by seat order so the central turn-needle points outward to whoever
 * is acting. Each seat keeps its data-pid anchor for the VFX layer + needle. */
export function RoundTable({ ui, myId, selectable, onSelect, attackMode, attackerId, onSelectAttacker }: Props) {
  const activeId = ui.turnOrder[ui.currentTurnIndex];
  // Hovering any minion on the board reveals its name / stats / ability text — so you can read a
  // foe's board before you commit to an attack or target.
  const [hoverMinion, setHoverMinion] = useState<string | null>(null);
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
        const spotLeft = sLeft * 0.58 + CX * 0.42; // pulled in onto the felt, toward the table centre
        const spotTop = sTop * 0.58 + CY * 0.42;
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

      {/* Each player's summoned minions sit out ON THE FELT, in front of the player (toward the
          table centre) — like a board, not stacked under the portrait. */}
      {ring.map((p, i) => {
        if (!p.alive || p.field.length === 0) return null;
        const k = ((i - myRing) % n + n) % n;
        const theta = ((90 + k * (360 / n)) * Math.PI) / 180;
        const sLeft = CX + RX * Math.cos(theta);
        const sTop = CY + RY * Math.sin(theta);
        const fLeft = sLeft * 0.44 + CX * 0.56; // out in front of the player, on the felt toward centre
        const fTop = sTop * 0.44 + CY * 0.56;
        return (
          <div key={`fld-${p.id}`} style={{ ...fieldRow, left: `${fLeft}%`, top: `${fTop}%` }}>
            {p.field.map((m) => {
              const mine = p.id === myId;
              const canAttack = mine && !!attackMode && m.attacksLeft > 0 && m.attack > 0;
              const canHit = !mine && selectable;
              const armed = attackerId === m.id;
              const clickable = canAttack || canHit;
              const def = CARD_DEFS[m.defId];
              return (
                <div
                  key={m.id}
                  data-pid={m.id}
                  onMouseEnter={() => setHoverMinion(m.id)}
                  onMouseLeave={() => setHoverMinion((h) => (h === m.id ? null : h))}
                  onClick={(e) => {
                    if (!clickable) return;
                    e.stopPropagation();
                    if (canAttack) onSelectAttacker?.(m.id);
                    else onSelect(m.id);
                  }}
                  style={{
                    ...minionChip,
                    borderColor: armed ? '#e0b84a' : m.taunt ? '#c8a24a' : mine ? C.you : C.enemy,
                    boxShadow: armed
                      ? '0 0 12px rgba(224,184,74,0.7)'
                      : m.divineShield ? '0 0 10px rgba(240,224,150,0.6)' : '0 3px 8px rgba(0,0,0,0.5)',
                    cursor: clickable ? (canAttack ? 'grab' : 'crosshair') : 'default',
                    opacity: mine && m.attacksLeft <= 0 && attackMode ? 0.6 : 1,
                    zIndex: hoverMinion === m.id ? 30 : undefined,
                  }}
                >
                  <div style={minionArtWindow}><CardArt id={m.defId} size={70} /></div>
                  <span style={minionName}>{def?.name}</span>
                  <span style={{ ...minionStat, ...minionAtk }}>{m.attack}</span>
                  <span style={{ ...minionStat, ...minionHp, color: m.health < m.maxHealth ? '#ff9a6a' : '#8fe0a0' }}>{m.health}</span>
                  {m.taunt && <span style={minionKw} title="도발">🛡</span>}
                  {m.divineShield && <span style={{ ...minionKw, right: 'auto', left: -4, top: -6 }} title="천상의 보호막">✦</span>}
                  {hoverMinion === m.id && def && (
                    <div style={minionTip}>
                      <span style={minionTipEdge} aria-hidden />
                      <div style={minionTipHead}>
                        <span style={minionTipName}>{def.name}</span>
                        <span style={minionTipStat}>{m.attack}/{m.health}</span>
                      </div>
                      <div style={minionTipDesc}>{def.desc}</div>
                    </div>
                  )}
                </div>
              );
            })}
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
              width: isMe ? 174 : 150,
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
                width: isMe ? 120 : 104, height: isMe ? 120 : 104,
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
              <AvatarArt avatar={p.avatar} tint={BOT_TINTS[p.seat % BOT_TINTS.length]} variant={p.seat} size={74} />
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
                  <>
                    <i style={{ ...hpGhost, width: `${hpPct}%` }} />
                    <i style={{ ...hpFill, width: `${hpPct}%`, background: fillBg, animation: crit ? 'cb-hp-crit 0.9s ease-in-out infinite' : undefined }}>
                      <span style={hpGloss} />
                    </i>
                  </>
                );
              })()}
            </div>
            <div style={info}>
              <span style={{ ...nm, color: isMe ? C.you : C.dim }}>
                {p.name}{isMe ? ' (나)' : ''}{p.skipTurns > 0 && p.alive ? <> · <Icon name="zzz" size={11} /></> : ''}{p.alive && p.hasDeathrattle ? <span style={rattleMark} title="죽음의 메아리">⚰</span> : ''}
              </span>
              <span style={{ ...val, ...(p.alive && hpPct <= 30 ? { color: '#d9634a', fontWeight: 800 } : null) }}>{p.alive ? `${p.hp}/${p.maxHp}` : 'DEAD'}</span>
              {p.alive && <span style={manaVal}><Icon name="crystal" size={10} />{p.mana}</span>}
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
// A single premium table oval seen from DIRECTLY ABOVE (top-down). One clean element, but
// finished like a real object: a warm overhead pool lights the felt centre, the baize deepens
// to black at the rim, a brass bezel catches a hairline of light, and a soft drop shadow floats
// the whole table off the floor. No perspective tilt now — it reads as looking straight down.
const felt: React.CSSProperties = {
  position: 'absolute', left: '50%', top: `${CY}%`,
  transform: 'translate(-50%,-50%)',
  width: '94%', height: '94%', borderRadius: 28, overflow: 'hidden',
  background:
    'radial-gradient(circle at 50% 46%, rgba(240,188,102,0.22), transparent 56%),' + // warm overhead light pool
    'radial-gradient(circle at 50% 44%, rgba(255,226,168,0.10), transparent 50%),' + // hot centre catch-light on the baize
    'radial-gradient(circle at 50% 50%, transparent 60%, rgba(72,46,86,0.24) 100%),' + // cool plum edge tint (ties to the bg wall wash)
    'radial-gradient(circle at 50% 48%, #4a2325 0%, #2c1214 52%, #120709 100%)',       // richer burgundy felt body: lit centre → black rim
  border: '2px solid rgba(206,158,76,0.36)',
  boxShadow:
    'inset 0 0 6px 1px rgba(240,208,132,0.30),' + // brass rim highlight
    'inset 0 0 180px 24px rgba(0,0,0,0.58),' +    // felt edge falls to black
    '0 24px 60px rgba(0,0,0,0.6)',                // table floats above the floor
};
// The engraved house medallion at the table centre. Face-on now (top-down view) and low-opacity
// so it feels branded INTO the baize — an anchor for the dead middle, never competing with the
// seats or VFX.
const emblem: React.CSSProperties = {
  position: 'absolute', left: `${CX}%`, top: `${CY}%`, zIndex: 2, pointerEvents: 'none',
  transform: 'translate(-50%,-50%)',
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
// The face-down pile each player has laid on the table. Seen from directly above (top-down),
// so the cards read as flat rectangles on the baize — no perspective tilt.
const tableFan: React.CSSProperties = {
  position: 'absolute', transform: 'translate(-50%,-50%)', width: 0, height: 0,
  pointerEvents: 'none', zIndex: 3,
};
const miniBack: React.CSSProperties = {
  position: 'absolute', top: 0, width: 20, height: 28, borderRadius: 4,
  transformOrigin: 'center center', display: 'flex', alignItems: 'center', justifyContent: 'center',
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
  // A recessed portrait well: a warm catch-light rakes the top, the base sinks into shadow, and
  // the avatar sits lit inside a framed medallion rather than pasted on a flat swatch.
  background:
    'radial-gradient(ellipse 92% 58% at 50% 8%, rgba(240,206,150,0.16), transparent 60%),' +  // warm top catch-light
    'radial-gradient(ellipse 100% 70% at 50% 118%, rgba(0,0,0,0.52), transparent 64%),' +      // base sinks to shadow
    `linear-gradient(160deg, ${C.panelHi}, ${C.panel})`,
  border: `1px solid ${C.border}`,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  transition: 'box-shadow .3s cubic-bezier(.22,.61,.36,1), border-color .3s ease',
};
const badge: React.CSSProperties = {
  position: 'absolute', top: 5, minWidth: 24, height: 20, padding: '0 4px', borderRadius: 7, display: 'flex',
  alignItems: 'center', justifyContent: 'center', fontSize: 11, fontFamily: mono, fontWeight: 700,
  border: `1px solid ${C.border}`, background: 'rgba(20,13,9,0.85)', zIndex: 2,
};
const badgeDef: React.CSSProperties = { left: 5, color: '#8fb0a6' };
const badgeWarn: React.CSSProperties = { right: 5, color: C.rare };
// The minion field: a compact row of summoned bodies under the portrait. Each carries its
// attack (bottom-left) and current health (bottom-right); taunt/divine-shield show as corner marks.
const fieldRow: React.CSSProperties = {
  position: 'absolute', transform: 'translate(-50%,-50%)', zIndex: 6, pointerEvents: 'auto',
  display: 'flex', gap: 9, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 320,
};
const minionChip: React.CSSProperties = {
  position: 'relative', width: 90, aspectRatio: '5 / 7', borderRadius: 10,
  background: [
    'linear-gradient(180deg, rgba(255,238,208,0.06), transparent 22%)',
    'radial-gradient(120% 100% at 50% 46%, transparent 55%, rgba(0,0,0,0.4) 100%)',
    'radial-gradient(125% 85% at 50% -8%, #2a2013, #1c140b 68%, #120709)',
  ].join(','),
  border: '2px solid',
  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '5px 4px 8px',
  boxSizing: 'border-box',
  transition: 'box-shadow .18s, border-color .18s, opacity .18s',
};
// Hover panel for a minion on the board — name, current stats, and its ability text. Sits above
// the chip, doesn't intercept the pointer, and is wide enough to read the keyword description.
const minionTip: React.CSSProperties = {
  position: 'absolute', bottom: '116%', left: '50%', transform: 'translateX(-50%)',
  width: 172, padding: '9px 11px 10px', borderRadius: 9, zIndex: 40, pointerEvents: 'none',
  background: 'linear-gradient(180deg, rgba(42,32,19,0.99), rgba(20,13,9,0.99))',
  border: `1px solid ${C.borderHi}`, textAlign: 'left', overflow: 'hidden',
  boxShadow: '0 14px 34px rgba(0,0,0,0.6)',
};
const minionTipEdge: React.CSSProperties = {
  position: 'absolute', top: 0, left: 0, right: 0, height: 1.5,
  background: 'linear-gradient(90deg, transparent, #caa24a, transparent)', opacity: 0.9,
};
const minionTipHead: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6,
};
const minionTipName: React.CSSProperties = { fontFamily: sans, fontSize: 14, fontWeight: 800, color: '#f0e0b4', lineHeight: 1.15 };
const minionTipStat: React.CSSProperties = { flexShrink: 0, fontFamily: mono, fontSize: 13, fontWeight: 900, color: '#f0e0b4' };
const minionTipDesc: React.CSSProperties = { fontFamily: sans, fontSize: 12, lineHeight: 1.5, color: C.text, whiteSpace: 'normal' };
const minionArtWindow: React.CSSProperties = {
  width: '92%', aspectRatio: '1 / 1', borderRadius: 5, overflow: 'hidden',
  display: 'grid', placeItems: 'center', flexShrink: 0,
  background: 'radial-gradient(120% 120% at 50% 30%, rgba(0,0,0,0.15), rgba(0,0,0,0.5))',
  border: '1px solid rgba(0,0,0,0.45)', boxShadow: 'inset 0 1px 0 rgba(255,238,208,0.08)',
};
const minionName: React.CSSProperties = {
  maxWidth: '100%', fontFamily: sans, fontSize: 12, fontWeight: 800, color: '#e8d6ac',
  lineHeight: 1.1, textAlign: 'center', letterSpacing: '-0.02em',
  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
};
const minionStat: React.CSSProperties = {
  position: 'absolute', bottom: -10, minWidth: 26, height: 26, padding: '0 4px', borderRadius: 7,
  fontSize: 17, fontFamily: mono, fontWeight: 900, lineHeight: '26px', textAlign: 'center',
  background: '#0c0705', border: '1px solid rgba(0,0,0,0.6)',
};
const minionAtk: React.CSSProperties = { left: -8, color: '#f2c14a' };
const minionHp: React.CSSProperties = { right: -8 };
const minionKw: React.CSSProperties = {
  position: 'absolute', top: -8, right: -6, fontSize: 20, lineHeight: 1,
  filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.8))',
};
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
  fontSize: 9, fontFamily: mono, fontWeight: 700, border: '1px solid', background: 'rgba(20,13,9,0.82)',
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
  position: 'relative',
  width: '86%', height: 11, borderRadius: 6, background: '#160f08', border: `1px solid ${C.border}`, overflow: 'hidden',
};
// The real fill drops FAST so the ghost bleed behind it is briefly exposed on a hit.
const hpFill: React.CSSProperties = {
  position: 'absolute', left: 0, top: 0, zIndex: 2,
  height: '100%', borderRadius: 6, overflow: 'hidden',
  transition: 'width .2s cubic-bezier(.4,0,.2,1)',
};
// The lagging "ghost" bleed behind the real fill. On damage it holds at the old HP for a
// beat (transition-delay) then drains slowly, so the chunk just lost flashes hot crimson
// and bleeds off — this carries the "how much damage" read now that the number is gone.
// On heal the real fill covers it instantly, so no artifact appears.
const hpGhost: React.CSSProperties = {
  position: 'absolute', left: 0, top: 0, zIndex: 1,
  height: '100%', borderRadius: 6,
  background: 'linear-gradient(90deg,#ff7a52,#e5482c)',
  transition: 'width .6s cubic-bezier(.5,0,.5,1) .28s',
};
// A slim specular strip across the top of the fill — the bar reads as a lit glass tube, not a flat block.
const hpGloss: React.CSSProperties = {
  position: 'absolute', left: 0, right: 0, top: 0, height: '45%', borderRadius: '6px 6px 40% 40%',
  background: 'linear-gradient(180deg, rgba(255,255,255,0.4), rgba(255,255,255,0))',
};
const info: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 7, maxWidth: '100%' };
const nm: React.CSSProperties = {
  fontSize: 14, fontWeight: 700, maxWidth: 104, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
};
const rattleMark: React.CSSProperties = { marginLeft: 3, fontSize: 13, color: '#c8b06a', filter: 'saturate(0.8)' };
const val: React.CSSProperties = { fontFamily: mono, fontSize: 14, color: C.dim, whiteSpace: 'nowrap' };
const manaVal: React.CSSProperties = { fontFamily: mono, fontSize: 14, color: '#c9ab63', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 2 };
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
