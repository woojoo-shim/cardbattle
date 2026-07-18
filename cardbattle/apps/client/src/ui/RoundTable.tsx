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
      {/* A padded leather rail hoops the baize — the raised bumper of a real card table, catching
          the bulb on its top curve and stitched just inside. It's what lifts the felt off the floor
          and reads as furniture, not a painted disc. */}
      <span style={feltRail} aria-hidden />
      <div style={felt} aria-hidden>
        <span style={feltNap} />
        {/* Perspective grid raked across the baize — the painted lines of the play surface,
            converging toward the far edge so the top reads as a desk seen from above (Buckshot-style). */}
        <span style={feltGrid} />
        <span style={feltStains} />
        <span style={feltPaint} />
        <span style={feltPaintInner} />
        <span style={feltRim} />
        <span style={feltStitch} />
        <span style={feltGlow} />
      </div>

      {/* Pendant lamp hung over the table centre. The fixture (cord + shade) is always on;
          the emitted light (cone + floor pool + bulb) flickers up once when the match begins. */}
      <div style={lampWrap} aria-hidden>
        <span style={lampCord} />
        <span style={lampShade} />
        <span style={lampBulb} />
        <span style={lampCone} />
        <span style={lampPool} />
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
                >
                  <span style={{ fontSize: 8, color: 'rgba(143,157,79,0.45)' }}>◈</span>
                </span>
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
              filter: p.alive ? 'none' : 'grayscale(1)',
              opacity: p.alive ? 1 : 0.45,
              transform: `translate(-50%,-50%) scale(${isActive ? 1.08 : 1})`,
              zIndex: isActive ? 8 : 4,
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
              {canTarget && <span style={{ ...crosshair, borderColor: C.enemy }} />}
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
                  ? 'linear-gradient(90deg,#ff4d4d,#c4122a)'
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
              <span style={{ ...val, ...(p.alive && hpPct <= 30 ? { color: '#ff5a5a', fontWeight: 800 } : null) }}>{p.alive ? `${p.hp}/${p.maxHp}` : 'DEAD'}</span>
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
// The padded leather rail — a slightly larger oval sitting under/around the baize. A soft oxblood
// leather bumper with a lit top curve (bulb catching the padding) and its own drop shadow so the
// whole table stands proud of the floor like real furniture.
const feltRail: React.CSSProperties = {
  position: 'absolute', left: '50%', top: `${CY}%`,
  // Tilted onto the SAME plane as the felt (same perspective + rotateX about the same centre line)
  // so the padded bumper hoops the baize as one coherent piece of furniture seen from above.
  transform: 'translate(-50%,-50%) perspective(620px) rotateX(62deg)',
  width: '68%', height: '66%', borderRadius: '50%',
  background: 'radial-gradient(ellipse at 50% 26%, #4a2b23 0%, #351d17 42%, #21120e 74%, #0c0605 100%)',
  border: '1px solid #4d2e22',
  boxShadow:
    'inset 0 4px 8px rgba(150,96,60,0.30),' +      // bulb catching the top of the leather roll
    'inset 0 -12px 26px rgba(0,0,0,0.72),' +        // underside of the roll in shadow
    '0 30px 62px rgba(0,0,0,0.6), 0 8px 0 #0a0504', // floor drop + a solid near lip
};
const felt: React.CSSProperties = {
  position: 'absolute', left: '50%', top: `${CY}%`,
  // A near-round surface actually TILTED back in 3D (rotateX) rather than a pre-squashed flat oval,
  // so the near edge swells toward the viewer and the far edge recedes — a real desk you look down
  // onto (Buckshot framing). All children (grid, betting rings, stains) tilt with it as one plane.
  transform: 'translate(-50%,-50%) perspective(620px) rotateX(62deg)',
  width: '60%', height: '58%', borderRadius: '50%', overflow: 'hidden',
  // A worn card-table hauled down here to gamble on: bottle-green baize gone mossy and damp-stained,
  // burns and grime near the middle, edges rotting into the dark. The felt of an illegal back room —
  // muddy olive, not neon, so it sits in the gloom instead of glowing like a disc.
  background: 'radial-gradient(ellipse at 50% 32%, #223016 0%, #16210f 40%, #0c1208 66%, #070b05 100%)',
  border: '2px solid #2c3a20',
  boxShadow:
    'inset 0 0 96px 20px rgba(0,0,0,0.8),' +    // heavy vignette — edges rot into the dark
    'inset 0 3px 10px rgba(0,0,0,0.5),' +        // felt tucked just under the leading edge of the rail
    '0 26px 60px rgba(0,0,0,0.5)',
};
// A soft radial sheen where the bulb rakes across the felt nap — the premium lit-baize look.
const feltNap: React.CSSProperties = {
  position: 'absolute', inset: 0, borderRadius: '50%',
  background: 'radial-gradient(ellipse 46% 40% at 50% 34%, rgba(150,196,96,0.10), transparent 62%)',
};
// The painted play-surface grid. It fills the felt flat and INHERITS the parent's rotateX tilt,
// so its square cells foreshorten into converging lines on the tilted plane — the strongest cue
// that you're looking DOWN onto a desk. Faded at the rim by the mask so it melts into the baize.
const feltGrid: React.CSSProperties = {
  position: 'absolute', inset: 0, borderRadius: '50%',
  backgroundImage:
    'linear-gradient(rgba(188,208,150,0.15) 1px, transparent 1px),' +
    'linear-gradient(90deg, rgba(188,208,150,0.13) 1px, transparent 1px)',
  backgroundSize: '12% 12%', backgroundPosition: 'center',
  WebkitMaskImage: 'radial-gradient(64% 64% at 50% 50%, #000 40%, transparent 82%)',
  maskImage: 'radial-gradient(64% 64% at 50% 50%, #000 40%, transparent 82%)',
};
// Grime worked into the baize: greasy dark blotches, worn bald patches, and a faint pink smear
// caught from the room — the wear of a table that's seen a lot of bad nights.
const feltStains: React.CSSProperties = {
  position: 'absolute', inset: 0, borderRadius: '50%',
  backgroundImage:
    'radial-gradient(circle at 38% 34%, rgba(0,0,0,0.40) 0 6%, transparent 13%),' +
    'radial-gradient(circle at 66% 58%, rgba(0,0,0,0.36) 0 5%, transparent 12%),' +
    'radial-gradient(circle at 52% 72%, rgba(0,0,0,0.32) 0 7%, transparent 14%),' +
    'radial-gradient(circle at 30% 62%, rgba(110,82,36,0.16) 0 5%, transparent 12%),' +
    'radial-gradient(circle at 70% 30%, rgba(0,0,0,0.30) 0 4%, transparent 10%),' +
    'radial-gradient(circle at 44% 54%, rgba(0,0,0,0.22) 0 8%, transparent 16%),' +   // bald worn patch mid-table
    'radial-gradient(circle at 60% 42%, rgba(80,70,30,0.12) 0 6%, transparent 13%),' + // greasy sheen
    'radial-gradient(ellipse 14% 9% at 58% 46%, rgba(209,86,140,0.09), transparent 70%)',
};
// The old betting circle, painted in faded gilt — a thin gold ring worn to a dull amber gleam.
const feltPaint: React.CSSProperties = {
  position: 'absolute', inset: '23%', borderRadius: '50%',
  border: '1.5px solid rgba(216,162,60,0.28)',
  boxShadow: 'inset 0 0 12px rgba(216,162,60,0.10), 0 0 6px rgba(216,162,60,0.08)',
};
// A second, tighter gilt ring inside it — the double-line betting circle of a proper table.
const feltPaintInner: React.CSSProperties = {
  position: 'absolute', inset: '27%', borderRadius: '50%',
  border: '1px solid rgba(216,162,60,0.14)',
};
const feltRim: React.CSSProperties = {
  position: 'absolute', inset: 6, borderRadius: '50%', border: '1px solid rgba(150,168,110,0.12)',
};
// Stitching where the baize meets the leather rail — a dashed thread just inside the felt edge.
const feltStitch: React.CSSProperties = {
  position: 'absolute', inset: 3, borderRadius: '50%',
  border: '1px dashed rgba(200,150,70,0.14)',
};
const feltGlow: React.CSSProperties = {
  position: 'absolute', inset: 0, borderRadius: '50%',
  boxShadow: 'inset 0 0 52px rgba(224,164,72,0.12)',
};
// Pendant lamp over the table centre. The fixture (cord + shade) is always lit; the emitted
// light (bulb, cone, floor pool) plays the cb-lampon flicker once when RoundTable mounts (= game start).
const lampWrap: React.CSSProperties = {
  position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 2,
};
const lampCord: React.CSSProperties = {
  // A frayed wire dropping from the dark — the kind strung up in a back room nobody pays rent on.
  position: 'absolute', left: '50%', top: 0, transform: 'translateX(-50%)',
  width: 2, height: '14%', background: 'linear-gradient(#060504,#2a2216)',
};
const lampShade: React.CSSProperties = {
  // A battered tin dish clamped over a bare bulb — dented metal, no fixture, just what was on hand.
  position: 'absolute', left: '50%', top: '13%', transform: 'translateX(-50%)',
  width: 64, height: 30, borderRadius: '50% 50% 46% 46% / 80% 80% 20% 20%',
  background: 'linear-gradient(160deg,#2a2620,#141009)', border: '1px solid #3d3428',
  boxShadow: '0 6px 14px rgba(0,0,0,0.6)',
};
const lampBulb: React.CSSProperties = {
  // A single dirty sodium bulb — the only law in the room. Warm, jaundiced, buzzing.
  position: 'absolute', left: '50%', top: '20%', transform: 'translateX(-50%)',
  width: 16, height: 16, borderRadius: '50%',
  background: 'radial-gradient(circle, #fff2cf 0%, #f0b256 52%, rgba(210,140,50,0.22) 100%)',
  boxShadow: '0 0 22px 6px rgba(240,180,80,0.6)',
  animation: 'cb-lampon 2.4s ease-out both',
};
const lampCone: React.CSSProperties = {
  position: 'absolute', left: '50%', top: '21%', transform: 'translateX(-50%)',
  width: 240, height: '46%',
  background: 'linear-gradient(180deg, rgba(238,176,78,0.20), rgba(238,176,78,0))',
  clipPath: 'polygon(42% 0%, 58% 0%, 100% 100%, 0% 100%)',
  filter: 'blur(2px)', animation: 'cb-lampon 2.4s ease-out both',
};
const lampPool: React.CSSProperties = {
  position: 'absolute', left: '50%', top: `${CY}%`, transform: 'translate(-50%,-50%)',
  width: '54%', height: '38%', borderRadius: '50%',
  background: 'radial-gradient(ellipse at 50% 40%, rgba(238,176,78,0.16), transparent 68%)',
  animation: 'cb-lampon 2.4s ease-out both',
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
  background: 'linear-gradient(160deg,#1b2336,#101626)', border: `1px solid ${C.border}`,
  boxShadow: '0 3px 8px rgba(0,0,0,0.5), inset 0 0 0 2px rgba(143,157,79,0.06)',
};
/** Paint a mini face-down card's border/glow from an equipped border cosmetic. Gradient
 *  borders use the backgroundImage+clip trick; solid colors set borderColor directly. */
function miniBackCos(cos: { border: string; glow: string }): React.CSSProperties {
  const grad = cos.border.startsWith('linear') || cos.border.startsWith('radial');
  return {
    boxShadow: `0 0 8px ${cos.glow}, 0 3px 8px rgba(0,0,0,0.5)`,
    ...(grad
      ? { border: '1.5px solid transparent', backgroundImage: `linear-gradient(160deg,#1b2336,#101626), ${cos.border}`, backgroundOrigin: 'border-box', backgroundClip: 'padding-box, border-box' }
      : { borderColor: cos.border }),
  };
}
const shieldChip: React.CSSProperties = {
  position: 'absolute', top: -32, left: 0, transform: 'translateX(-50%)',
  padding: '1px 6px', borderRadius: 6, fontSize: 10, fontWeight: 800, fontFamily: mono,
  color: '#bcd8ff', background: 'linear-gradient(160deg,#15233f,#0e1830)', border: '1px solid #7fb6ff',
  boxShadow: '0 0 10px rgba(127,182,255,0.5)', whiteSpace: 'nowrap', zIndex: 20,
};
const seat: React.CSSProperties = {
  position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
  pointerEvents: 'auto', transition: 'transform .3s cubic-bezier(.22,.61,.36,1)',
};
const portrait: React.CSSProperties = {
  borderRadius: 16, position: 'relative', overflow: 'hidden',
  background: `linear-gradient(160deg, ${C.panelHi}, ${C.panel})`, border: `1px solid ${C.border}`,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  transition: 'box-shadow .3s cubic-bezier(.22,.61,.36,1), border-color .3s ease',
};
const badge: React.CSSProperties = {
  position: 'absolute', top: 5, minWidth: 24, height: 20, padding: '0 4px', borderRadius: 7, display: 'flex',
  alignItems: 'center', justifyContent: 'center', fontSize: 10, fontFamily: mono, fontWeight: 700,
  border: `1px solid ${C.border}`, background: 'rgba(10,12,20,0.85)', zIndex: 2,
};
const badgeDef: React.CSSProperties = { left: 5, color: '#7fb6ff' };
const badgeWarn: React.CSSProperties = { right: 5, color: C.rare };
// Ongoing turn-start effects, shown as a compact chip row under the portrait.
const STATUS_META: Record<string, { color: string; icon: 'poison' | 'reflect' | 'regen' | 'zzz' }> = {
  poison: { color: '#8fd14f', icon: 'poison' },
  regen: { color: '#79b0a2', icon: 'regen' },
  reflect: { color: '#b08fe0', icon: 'reflect' },
};
const statusRow: React.CSSProperties = {
  display: 'flex', gap: 3, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 3, maxWidth: '96%',
};
const statusChip: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 2, height: 16, padding: '0 4px', borderRadius: 6,
  fontSize: 9, fontFamily: mono, fontWeight: 700, border: '1px solid', background: 'rgba(10,12,20,0.82)',
};
const statusTurns: React.CSSProperties = {
  fontSize: 8, opacity: 0.7, fontStyle: 'normal', marginLeft: 1,
};
const crosshair: React.CSSProperties = {
  position: 'absolute', inset: 0, border: '1px dashed', borderRadius: 16, animation: 'cb-spin 6s linear infinite',
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
const manaVal: React.CSSProperties = { fontFamily: mono, fontSize: 11, color: '#6fb6ff', whiteSpace: 'nowrap' };
/** Equipped-title chip under the name. Gradient title colors paint via background-clip:text. */
function titleLine(color: string): React.CSSProperties {
  const grad = color.startsWith('linear') || color.startsWith('radial');
  return {
    fontSize: 9.5, fontWeight: 900, letterSpacing: 0.4, marginTop: -1, whiteSpace: 'nowrap',
    ...(grad
      ? { backgroundImage: color, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', WebkitTextFillColor: 'transparent' }
      : { color }),
  };
}
