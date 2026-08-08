import { useState } from 'react';
import type { UiState, UiMinion } from '../state/useRoom.js';
import { COSMETIC_BY_ID, TITLE_BY_ID, CARD_DEFS } from '@cardbattle/shared';
import { C, mono, sans } from './theme.js';
import { AvatarArt, BOT_TINTS } from './art/CreatureArt.js';
import { CardArt } from './art/CardArt.js';
import { Icon, TauntFrame, type IconName } from './art/Icon.js';

/** Who a pending card/power can be aimed at. `side:'friendly'` = my own hero/minions (buffs,
 *  heals); `side:'enemy'` = opponents (damage, destroy). `heroes`/`minions` gate which entity
 *  kinds are valid (e.g. a +N/+N buff only lands on minions, so heroes:false). */
export type TargetIntent = { side: 'enemy' | 'friendly'; heroes: boolean; minions: boolean };
export const ENEMY_INTENT: TargetIntent = { side: 'enemy', heroes: true, minions: true };

interface Props {
  ui: UiState;
  myId: string;
  selectable: boolean;
  onSelect: (id: string) => void;
  /** Which entities the current selection is allowed to hit. Defaults to enemies. */
  targetIntent?: TargetIntent;
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
export function RoundTable({ ui, myId, selectable, onSelect, targetIntent = ENEMY_INTENT, attackMode, attackerId, onSelectAttacker }: Props) {
  const friendlyTarget = targetIntent.side === 'friendly';
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
              const canHit = selectable && targetIntent.minions && (friendlyTarget ? mine : !mine);
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
                  {m.taunt && <TauntFrame color={armed ? '#e0b84a' : '#c8a24a'} style={{ zIndex: 3 }} />}
                  <div style={minionArtWindow}><CardArt id={m.defId} size="100%" /></div>
                  <span style={minionName}>{def?.name}</span>
                  <span style={{ ...minionStat, ...minionAtk }}>{m.attack}</span>
                  <span style={{ ...minionStat, ...minionHp, color: m.health < m.maxHealth ? '#ff9a6a' : '#8fe0a0' }}>{m.health}</span>
                  {(() => {
                    const kws = KEYWORD_ORDER.filter((k) => m[k]);
                    if (!kws.length) return null;
                    return (
                      <div style={kwRow}>
                        {kws.map((k) => (
                          <span key={k} style={{ ...kwChip, color: KEYWORD_META[k].color, borderColor: KEYWORD_META[k].color }} title={KEYWORD_META[k].desc}>
                            {KEYWORD_META[k].label}
                          </span>
                        ))}
                      </div>
                    );
                  })()}
                  {hoverMinion === m.id && def && (
                    <div style={minionTip}>
                      <span style={minionTipEdge} aria-hidden />
                      <div style={minionTipHead}>
                        <span style={minionTipName}>{def.name}</span>
                        <span style={minionTipStat}>{m.attack}/{m.health}</span>
                      </div>
                      <div style={minionTipDesc}>{def.desc}</div>
                      {(() => {
                        const abils = KEYWORD_ORDER.filter((k) => m[k]);
                        const hasRattle = m.hasDeathrattle;
                        if (!abils.length && !hasRattle) return null;
                        return (
                          <div style={minionTipAbilities}>
                            {abils.map((k) => (
                              <div key={k} style={minionTipAbilityRow}>
                                <span style={{ ...minionTipAbilityIcon, color: KEYWORD_META[k].color, borderColor: `${KEYWORD_META[k].color}66` }}>
                                  <Icon name={KEYWORD_META[k].icon} size="66%" />
                                </span>
                                <span style={minionTipAbilityText}>
                                  <b style={{ color: KEYWORD_META[k].color }}>{KEYWORD_META[k].label}</b> — {KEYWORD_META[k].desc}
                                </span>
                              </div>
                            ))}
                            {hasRattle && (
                              <div style={minionTipAbilityRow}>
                                <span style={{ ...minionTipAbilityIcon, color: '#a89f88', borderColor: '#a89f8866' }}>
                                  <Icon name="skull" size="66%" />
                                </span>
                                <span style={minionTipAbilityText}>
                                  <b style={{ color: '#a89f88' }}>유언</b> — 죽을 때 특수 효과가 발동한다.
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })()}
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
        const canTarget = selectable && p.alive && targetIntent.heroes && (friendlyTarget ? isMe : !isMe);
        const accent = isMe ? C.you : C.enemy;
        // Overheal can push hp above maxHp, so clamp the BAR/pips at 100% (the numeric readout
        // below still shows the true value, e.g. 35/30).
        const hpPct = Math.max(0, Math.min(100, (p.hp / p.maxHp) * 100));

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
        const seatOpacity = !p.alive ? 0.62 : isActive ? 1 : recede ? 0.58 : isMe ? 1 : 0.9;
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
              zIndex: !p.alive ? 9 : isActive ? 8 : recede ? 3 : 4,
            }}
          >
            {/* A bold skull bobbing above a fallen player's head — the clear "이 사람은 죽었다" marker. */}
            {!p.alive && (
              <span style={deathSkull} aria-label="탈락">
                <Icon name="skull" size={34} color="#e7e0ec" />
              </span>
            )}
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
              {isActive && p.alive && <span style={{ ...spot, background: `radial-gradient(ellipse, ${isMe ? 'rgba(168,200,78,0.42)' : 'rgba(212,74,46,0.4)'}, transparent 70%)` }} />}
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

            <div style={hpPips}>
              {(() => {
                const PIPS = 10;
                const crit = p.alive && hpPct <= 30;
                // Number of lit pips (at least 1 while alive so a sliver of HP still shows a dot).
                const lit = !p.alive ? 0 : Math.max(1, Math.round((hpPct / 100) * PIPS));
                const litBg = crit
                  ? 'radial-gradient(circle at 35% 30%,#ff8f9a,#b3202f)'
                  : isMe
                  ? `radial-gradient(circle at 35% 30%,#9bf5d0,${C.you})`
                  : `radial-gradient(circle at 35% 30%,#ff9aa4,${C.enemy})`;
                const litGlow = crit
                  ? '0 0 5px rgba(255,77,94,0.7)'
                  : isMe ? '0 0 4px rgba(55,224,160,0.55)' : '0 0 4px rgba(255,77,94,0.55)';
                return Array.from({ length: PIPS }, (_, i) => {
                  const on = i < lit;
                  return (
                    <i
                      key={i}
                      style={{
                        ...pip,
                        background: on ? litBg : '#0e131f',
                        borderColor: on ? 'transparent' : C.border,
                        boxShadow: on ? litGlow : 'inset 0 1px 2px rgba(0,0,0,0.5)',
                        animation: on && crit ? 'cb-hp-crit 0.9s ease-in-out infinite' : undefined,
                      }}
                    />
                  );
                });
              })()}
            </div>
            <div style={info}>
              <span style={{ ...nm, color: isMe ? C.you : C.dim }}>
                {p.name}{isMe ? ' (나)' : ''}{p.skipTurns > 0 && p.alive ? <> · <Icon name="zzz" size={11} /></> : ''}{p.alive && p.hasDeathrattle ? <span style={rattleMark} title="유언">⚰</span> : ''}
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
    'radial-gradient(circle at 50% 46%, rgba(255,207,77,0.22), transparent 58%),' +  // warm gold overhead light pool (the single warm note)
    'radial-gradient(circle at 50% 44%, rgba(255,232,150,0.12), transparent 50%),' + // hot gold centre catch-light on the baize
    'radial-gradient(circle at 50% 50%, transparent 56%, rgba(138,107,255,0.26) 100%),' + // amethyst edge tint — temperature contrast vs the warm centre
    'radial-gradient(circle at 50% 48%, #1e5c46 0%, #123528 50%, #08120d 100%)',       // emerald baize felt body: lit centre → black rim
  border: '2px solid rgba(255,207,77,0.44)',
  boxShadow:
    'inset 0 0 8px 1px rgba(255,214,120,0.36),' + // gold rim highlight
    'inset 0 0 180px 24px rgba(0,0,0,0.56),' +    // felt edge falls to black
    '0 24px 60px rgba(0,0,0,0.62)',               // table floats above the floor
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
  background: 'linear-gradient(160deg,#26314a,#141b2b)', border: `1px solid ${C.border}`,
  boxShadow: '0 3px 8px rgba(0,0,0,0.5), inset 0 0 0 2px rgba(55,224,160,0.06)',
};
/** Paint a mini face-down card's border/glow from an equipped border cosmetic. Gradient
 *  borders use the backgroundImage+clip trick; solid colors set borderColor directly. */
function miniBackCos(cos: { border: string; glow: string }): React.CSSProperties {
  const grad = cos.border.startsWith('linear') || cos.border.startsWith('radial');
  return {
    boxShadow: `0 0 8px ${cos.glow}, 0 3px 8px rgba(0,0,0,0.5)`,
    ...(grad
      ? { border: '1.5px solid transparent', backgroundImage: `linear-gradient(160deg,#26314a,#141b2b), ${cos.border}`, backgroundOrigin: 'border-box', backgroundClip: 'padding-box, border-box' }
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
    'radial-gradient(ellipse 92% 58% at 50% 8%, rgba(150,180,230,0.16), transparent 60%),' +  // cool top catch-light
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
  // Hearthstone-style board: every player's minions sit in ONE clean horizontal rank facing the
  // table centre, never wrapping into a cluster. The row grows symmetrically from its anchor
  // point (translate -50%) so it stays lined up in front of the player.
  position: 'absolute', transform: 'translate(-50%,-50%)', zIndex: 6, pointerEvents: 'auto',
  display: 'flex', gap: 8, flexWrap: 'nowrap', justifyContent: 'center', alignItems: 'flex-end',
  whiteSpace: 'nowrap',
};
const minionChip: React.CSSProperties = {
  position: 'relative', width: 'clamp(84px, 9vw, 128px)', aspectRatio: '5 / 7', borderRadius: 12, flexShrink: 0,
  background: [
    'linear-gradient(180deg, rgba(150,180,230,0.06), transparent 22%)',
    'radial-gradient(120% 100% at 50% 46%, transparent 55%, rgba(0,0,0,0.4) 100%)',
    'radial-gradient(125% 85% at 50% -8%, #26314a, #18202f 68%, #0e131f)',
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
  background: 'linear-gradient(180deg, rgba(28,34,51,0.99), rgba(14,19,31,0.99))',
  border: `1px solid ${C.borderHi}`, textAlign: 'left', overflow: 'hidden',
  boxShadow: '0 14px 34px rgba(0,0,0,0.6)',
};
const minionTipEdge: React.CSSProperties = {
  position: 'absolute', top: 0, left: 0, right: 0, height: 1.5,
  background: 'linear-gradient(90deg, transparent, #ffcf4d, transparent)', opacity: 0.9,
};
const minionTipHead: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6,
};
const minionTipName: React.CSSProperties = { fontFamily: sans, fontSize: 14, fontWeight: 800, color: '#e6edfb', lineHeight: 1.15 };
const minionTipStat: React.CSSProperties = { flexShrink: 0, fontFamily: mono, fontSize: 13, fontWeight: 900, color: '#e6edfb' };
const minionTipDesc: React.CSSProperties = { fontFamily: sans, fontSize: 12, lineHeight: 1.5, color: C.text, whiteSpace: 'normal' };
// Ability rows in the minion hover panel — icon disc + name + plain explanation.
const minionTipAbilities: React.CSSProperties = {
  marginTop: 7, paddingTop: 6, borderTop: `1px solid ${C.border}`,
  display: 'flex', flexDirection: 'column', gap: 5,
};
const minionTipAbilityRow: React.CSSProperties = { display: 'flex', alignItems: 'flex-start', gap: 6 };
const minionTipAbilityIcon: React.CSSProperties = {
  flexShrink: 0, width: 18, height: 18, marginTop: 1,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  borderRadius: '50%', border: '1px solid', background: 'rgba(12,7,5,0.9)',
};
const minionTipAbilityText: React.CSSProperties = { fontFamily: sans, fontSize: 10.5, lineHeight: 1.4, color: C.dim, whiteSpace: 'normal' };
const minionArtWindow: React.CSSProperties = {
  width: '92%', aspectRatio: '1 / 1', borderRadius: 5, overflow: 'hidden',
  display: 'grid', placeItems: 'center', flexShrink: 0,
  background: 'radial-gradient(120% 120% at 50% 30%, rgba(0,0,0,0.15), rgba(0,0,0,0.5))',
  border: '1px solid rgba(0,0,0,0.45)', boxShadow: 'inset 0 1px 0 rgba(150,180,230,0.08)',
};
const minionName: React.CSSProperties = {
  maxWidth: '100%', fontFamily: sans, fontSize: 15, fontWeight: 800, color: '#dbe4f5',
  lineHeight: 1.1, textAlign: 'center', letterSpacing: '-0.02em',
  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
};
const minionStat: React.CSSProperties = {
  position: 'absolute', bottom: -12, minWidth: 32, height: 32, padding: '0 5px', borderRadius: 8,
  fontSize: 21, fontFamily: mono, fontWeight: 900, lineHeight: '32px', textAlign: 'center',
  background: '#0a0d15', border: '1px solid rgba(0,0,0,0.6)',
};
const minionAtk: React.CSSProperties = { left: -10, color: '#ffcf4d' };
const minionHp: React.CSSProperties = { right: -10 };
// Passive keywords a minion carries, shown as readable name chips (수호/쇄도/가호/부식/착취)
// so players don't have to hover to learn what a minion does.
const KEYWORD_ORDER = ['taunt', 'charge', 'divineShield', 'poisonous', 'lifesteal'] as const;
const KEYWORD_META: Record<typeof KEYWORD_ORDER[number], { label: string; color: string; desc: string; icon: IconName }> = {
  taunt: { label: '수호', color: '#e0c060', desc: '적은 먼저 이 하수인을 공격해야 한다.', icon: 'shield' },
  charge: { label: '쇄도', color: '#f0a24a', desc: '소환된 턴에 바로 공격할 수 있다.', icon: 'bolt' },
  divineShield: { label: '가호', color: '#f0e096', desc: '첫 피해를 무효화한다.', icon: 'sparkle' },
  poisonous: { label: '부식', color: '#9fb066', desc: '피해를 준 하수인을 즉사시킨다.', icon: 'poison' },
  lifesteal: { label: '착취', color: '#d0839a', desc: '가한 피해만큼 내 영웅을 회복한다.', icon: 'heart' },
};
const kwRow: React.CSSProperties = {
  display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center', maxWidth: '100%', lineHeight: 1,
};
const kwChip: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', height: 14, padding: '0 3px', borderRadius: 4,
  fontSize: 9, fontFamily: sans, fontWeight: 800, border: '1px solid', background: 'rgba(12,7,5,0.9)',
  letterSpacing: '-0.03em',
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
// The bold knockout skull that floats and bobs just above a fallen player's portrait.
const deathSkull: React.CSSProperties = {
  position: 'absolute', top: -22, left: '50%', zIndex: 14, pointerEvents: 'none',
  filter: 'drop-shadow(0 3px 5px rgba(0,0,0,0.85)) drop-shadow(0 0 9px rgba(255,255,255,0.45))',
  animation: 'cb-death-skull 2.6s ease-in-out infinite',
};
const spot: React.CSSProperties = {
  position: 'absolute', left: '50%', bottom: -22, transform: 'translateX(-50%)',
  width: 120, height: 42, borderRadius: '50%',
};
// HP is shown as a row of 10 circular pips that deplete proportionally (the exact hp/maxHp
// number still lives in the info row below). A row of dots reads instantly and avoids the
// generic "health bar" look.
const hpPips: React.CSSProperties = {
  display: 'flex', gap: 3, width: '86%', justifyContent: 'center', flexWrap: 'nowrap',
};
const pip: React.CSSProperties = {
  flex: '0 0 auto', width: 9, height: 9, borderRadius: '50%',
  border: '1px solid', boxSizing: 'border-box',
  transition: 'background .25s ease, box-shadow .25s ease',
};
const info: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 7, maxWidth: '100%' };
const nm: React.CSSProperties = {
  fontSize: 14, fontWeight: 700, maxWidth: 104, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
};
const rattleMark: React.CSSProperties = { marginLeft: 3, fontSize: 13, color: '#c9b8e0', filter: 'saturate(0.8)' };
const val: React.CSSProperties = { fontFamily: mono, fontSize: 14, color: C.dim, whiteSpace: 'nowrap' };
const manaVal: React.CSSProperties = { fontFamily: mono, fontSize: 14, color: '#ffcf4d', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 2 };
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
