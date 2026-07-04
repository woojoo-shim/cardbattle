import { useState } from 'react';
import { Shop } from './Shop.js';
import { Icon } from './art/Icon.js';
import { C, mono, sans } from './theme.js';
import { playSfx } from '../audio/sfx.js';
import { MuteButton } from './MuteButton.js';
import type { Account } from '../net/auth.js';

interface Props {
  account: Account;
  onAccount: (a: Account) => void;
  onStart: () => void;        // quick bot game
  onMultiplayer: () => void;  // room browser
  onLogout: () => void;
}

// A dramatic display serif for the title — no serif is bundled, so lean on a system stack to
// get the heavy, engraved "back-room sign" look (à la Buckshot Roulette's cover).
const serif = "'Times New Roman', Georgia, 'Nanum Myeongjo', serif";

type ItemKey = 'start' | 'multi' | 'shop' | 'credits' | 'logout';
const ITEMS: { key: ItemKey; label: string; sub: string }[] = [
  { key: 'start', label: '시작', sub: '봇과 빠른 연습' },
  { key: 'multi', label: '멀티플레이어', sub: '방 목록 · 친구와 대전' },
  { key: 'shop', label: '상점', sub: '외형 · 칭호' },
  { key: 'credits', label: '제작진', sub: '' },
  { key: 'logout', label: '나가기', sub: '로그아웃' },
];

// Face-down cards drifting down from the sky — slow ("느릭느릭"), staggered across the whole
// width and depth so the back room always has a gentle rain of cards. Deep/small cards fall
// slower & dimmer (further away); near/large cards fall a touch faster & brighter — a parallax
// that sells the height of the fall. Deterministic so it never reshuffles on re-render.
const FALLING: { l: number; dur: number; delay: number; r0: number; r1: number; o: number; s: number }[] = [
  { l: 6, dur: 11, delay: 0, r0: -20, r1: 160, o: 0.42, s: 0.8 },
  { l: 15, dur: 14, delay: -5, r0: 30, r1: 260, o: 0.5, s: 0.95 },
  { l: 23, dur: 17, delay: -9, r0: -10, r1: 200, o: 0.32, s: 0.68 },
  { l: 31, dur: 12, delay: -3, r0: 15, r1: 300, o: 0.55, s: 1.05 },
  { l: 40, dur: 16, delay: -11, r0: -25, r1: 180, o: 0.34, s: 0.72 },
  { l: 48, dur: 10, delay: -6, r0: 20, r1: 240, o: 0.6, s: 1.15 },
  { l: 56, dur: 18, delay: -2, r0: -5, r1: 340, o: 0.3, s: 0.6 },
  { l: 64, dur: 13, delay: -8, r0: 35, r1: 210, o: 0.5, s: 1.0 },
  { l: 72, dur: 15, delay: -4, r0: -18, r1: 150, o: 0.36, s: 0.75 },
  { l: 81, dur: 11, delay: -7, r0: 24, r1: 280, o: 0.54, s: 1.1 },
  { l: 89, dur: 16, delay: -13, r0: -12, r1: 190, o: 0.3, s: 0.66 },
  { l: 95, dur: 12, delay: -1, r0: 28, r1: 230, o: 0.44, s: 0.9 },
];

// Face-down cards strewn around the frame like spent shells — dense at the edges, clearing the
// centre so the title + menu read. Deterministic layout so it doesn't jitter on re-render.
const SCATTER: { l: number; t: number; r: number; o: number; s: number }[] = [
  { l: 4, t: 10, r: -19, o: 0.30, s: 1.0 },
  { l: 12, t: 30, r: 13, o: 0.22, s: 0.9 },
  { l: 7, t: 55, r: -8, o: 0.27, s: 1.1 },
  { l: 15, t: 80, r: 24, o: 0.20, s: 0.95 },
  { l: 33, t: 92, r: -7, o: 0.17, s: 1.0 },
  { l: 60, t: 91, r: 15, o: 0.19, s: 1.05 },
  { l: 85, t: 82, r: -22, o: 0.26, s: 1.0 },
  { l: 93, t: 58, r: 9, o: 0.22, s: 0.9 },
  { l: 88, t: 32, r: -13, o: 0.27, s: 1.1 },
  { l: 80, t: 11, r: 20, o: 0.20, s: 0.95 },
  { l: 55, t: 7, r: -11, o: 0.16, s: 1.0 },
  { l: 30, t: 8, r: 17, o: 0.20, s: 1.0 },
];

export function MainMenu({ account, onAccount, onStart, onMultiplayer, onLogout }: Props) {
  const [hover, setHover] = useState<ItemKey | null>(null);
  const [shopOpen, setShopOpen] = useState(false);
  const [creditsOpen, setCreditsOpen] = useState(false);

  const act = (k: ItemKey) => {
    playSfx(k === 'logout' ? 'back' : 'select');
    if (k === 'start') onStart();
    else if (k === 'multi') onMultiplayer();
    else if (k === 'shop') setShopOpen(true);
    else if (k === 'credits') setCreditsOpen(true);
    else if (k === 'logout') onLogout();
  };

  return (
    <div style={wrap}>
      {/* the back-room scene: a receding floor plane, a far wall, and the table's lamp pooling
          up from below — depth behind the falling cards, not just a flat wash */}
      <div style={sceneLayer} aria-hidden>
        <div style={sceneCeiling} />
        <div style={sceneWall} />
        <div style={wallStreaks} />
        <div style={stallDoor} />
        <div style={wallMirror} />
        <div style={{ ...wallMirror, ...wallMirrorR }} />
        <div style={counter}>
          {[15, 37, 59].map((lx) => (
            <span key={lx} style={{ ...basin, left: `${lx}%` }}>
              <span style={faucet} />
            </span>
          ))}
        </div>
        <div style={sceneHorizon} />
        {/* The drain lives INSIDE the tilted floor plane, so the parent's rotateX foreshortens it
            onto the tiles as a real hole in the ground rather than a flat sticker on the wall. */}
        <div style={sceneFloor}>
          <div style={floorDrain} aria-hidden>
            <span style={drainWell} />
            {[16, 32, 48, 64, 80].map((tp) => (
              <span key={tp} style={{ ...drainGrateBar, top: `${tp}%` }} />
            ))}
          </div>
        </div>
        <div style={floorSheen} />
        <div style={sceneLight} />
        <span style={sceneBulb} />
        <div style={sceneLampPool} />
        <div style={sceneGrime} />
      </div>
      {/* strewn cards behind everything */}
      <div style={scatterLayer} aria-hidden>
        {SCATTER.map((c, i) => (
          <span key={i} style={scatterCard(c)}>
            <span style={{ fontSize: 13 * c.s, color: 'rgba(166,197,63,0.4)' }}>◈</span>
          </span>
        ))}
      </div>
      <div style={vignette} aria-hidden />
      {/* cards drifting down from the sky — above the vignette so the slow fall reads clearly */}
      <div style={fallLayer} aria-hidden>
        {FALLING.map((c, i) => (
          <span key={`f${i}`} className="cb-cardfall" style={fallingCard(c)}>
            <span style={{ fontSize: 13 * c.s, color: 'rgba(166,197,63,0.4)' }}>◈</span>
          </span>
        ))}
      </div>

      {/* account chip, top-right */}
      <div style={topBar}>
        <MuteButton />
        <button style={goldChip} onClick={() => { playSfx('coin'); setShopOpen(true); }} title="상점 열기">
          <Icon name="coin" size={15} />&nbsp;{account.gold}
        </button>
        <span style={nameChip}>{account.display}</span>
      </div>

      <div style={content} className="cb-gate-in">
        <span style={kicker}>◈&nbsp;&nbsp;심연의 투기장 · 온라인 카드 배틀&nbsp;&nbsp;◈</span>
        <h1 style={titleWrap}>
          <span style={titleStack}>
            <span style={titleGhost} aria-hidden>ABYSSAL</span>
            <span style={titleLine}>ABYSSAL</span>
            <span style={strike} aria-hidden><span style={strikeGem}>◆</span></span>
          </span>
          <span style={{ ...titleLine, ...titleLine2 }}>ARENA</span>
        </h1>
        <span style={byline}>A CARD BATTLE IN THE BACK ROOM</span>

        <nav style={menu}>
          {ITEMS.map((it) => {
            const on = hover === it.key;
            const danger = it.key === 'logout';
            return (
              <button
                key={it.key}
                style={menuItem(on, danger)}
                onClick={() => act(it.key)}
                onMouseEnter={() => { setHover(it.key); playSfx('hover'); }}
                onMouseLeave={() => setHover((h) => (h === it.key ? null : h))}
              >
                <span style={labelWrap}>
                  <span style={caret(on)}>◆</span>
                  <span style={menuLabel}>{it.label}</span>
                </span>
                {it.sub && <span style={menuSub(on)}>{it.sub}</span>}
              </button>
            );
          })}
        </nav>
      </div>

      {shopOpen && <Shop account={account} onAccount={onAccount} onClose={() => setShopOpen(false)} />}
      {creditsOpen && <Credits onClose={() => setCreditsOpen(false)} />}
    </div>
  );
}

function Credits({ onClose }: { onClose: () => void }) {
  return (
    <div style={creditsBackdrop} onClick={onClose}>
      <div style={creditsCard} onClick={(e) => e.stopPropagation()}>
        <span style={kicker}>◈&nbsp;&nbsp;제작진&nbsp;&nbsp;◈</span>
        <h2 style={creditsTitle}>심연의 투기장</h2>
        <p style={creditsLine}>기획 · 개발 &nbsp;—&nbsp; woojoo</p>
        <p style={creditsLine}>실시간 서버 &nbsp;—&nbsp; Colyseus</p>
        <p style={creditsLine}>렌더링 &nbsp;—&nbsp; React · PixiJS</p>
        <p style={creditsSmall}>Godfield에서 영감을 받은 최후 생존 카드 배틀.</p>
        <button style={creditsClose} onClick={onClose}>닫기</button>
      </div>
    </div>
  );
}

const wrap: React.CSSProperties = {
  position: 'relative', minHeight: '100vh', width: '100%', overflow: 'hidden',
  display: 'flex', alignItems: 'center', justifyContent: 'flex-start', fontFamily: sans, color: C.text,
  padding: '0 clamp(32px, 8vw, 130px)',
  // Oxblood back-room haze bleeding down into wet black — the arena mood, carried to the menu.
  background:
    'radial-gradient(58% 40% at 50% 30%, rgba(126,38,62,0.20), transparent 68%),' +
    'radial-gradient(70% 50% at 50% 108%, rgba(56,232,200,0.06), transparent 62%),' +
    'linear-gradient(180deg, #140b0e 0%, #0d070a 52%, #060305 100%),' +
    '#060305',
};
// A grimy back-room washroom built from layered CSS, aiming for the Buckshot cover mood: a dark
// panelled ceiling, a tiled ceramic wall with grouted seams and grime, a couple of dead mirrors,
// and a dirty checkerboard floor receding into the dark under one jaundiced overhead bulb.
const sceneLayer: React.CSSProperties = {
  position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden',
};
// Grit/grain scattered over the whole room so the flat gradients read as worn surfaces.
const NOISE =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%25' height='100%25' filter='url(%23n)' opacity='0.6'/></svg>\")";
const sceneCeiling: React.CSSProperties = {
  position: 'absolute', left: 0, right: 0, top: 0, height: '13%',
  backgroundColor: '#0a0806',
  backgroundImage:
    'repeating-linear-gradient(90deg, rgba(0,0,0,0.65) 0 2px, transparent 2px 118px),' +
    'repeating-linear-gradient(0deg, rgba(0,0,0,0.5) 0 1px, transparent 1px 40px)',
  boxShadow: 'inset 0 -26px 46px rgba(0,0,0,0.75)',
};
// Tiled ceramic wall: dirty beige base, dark grout seams both ways, greasy blotches, top sheen.
const sceneWall: React.CSSProperties = {
  position: 'absolute', left: 0, right: 0, top: 0, height: '60%',
  backgroundColor: '#241d16',
  backgroundImage:
    'radial-gradient(circle at 22% 30%, rgba(0,0,0,0.45) 0 6%, transparent 18%),' +
    'radial-gradient(circle at 80% 24%, rgba(0,0,0,0.4) 0 5%, transparent 15%),' +
    'radial-gradient(circle at 62% 48%, rgba(0,0,0,0.35) 0 7%, transparent 18%),' +
    'radial-gradient(70% 60% at 50% 34%, rgba(74,64,48,0.55), transparent 72%),' +   // pooled light on tiles
    'repeating-linear-gradient(90deg, rgba(0,0,0,0.55) 0 2px, transparent 2px 92px),' +  // vertical grout
    'repeating-linear-gradient(0deg, rgba(0,0,0,0.5) 0 2px, transparent 2px 74px),' +    // horizontal grout
    'linear-gradient(180deg, rgba(255,238,206,0.06), transparent 26%)',                  // faint top sheen
  boxShadow: 'inset 0 -50px 90px rgba(0,0,0,0.66)',
};
// A dead mirror bolted to the tile: dark glass with a lit top bevel (relief, not a 3D box) so it
// stands proud of the wall rather than floating.
const wallMirror: React.CSSProperties = {
  position: 'absolute', left: '7%', top: '15%', width: '30%', height: '32%', borderRadius: 3,
  background: 'linear-gradient(158deg, rgba(38,50,48,0.55) 0%, rgba(12,15,15,0.7) 55%, rgba(6,8,8,0.8) 100%)',
  border: '1px solid rgba(0,0,0,0.7)',
  boxShadow:
    'inset 0 2px 0 rgba(190,200,188,0.10), inset 0 0 60px rgba(0,0,0,0.55),' +
    '0 6px 20px rgba(0,0,0,0.5)',
};
const wallMirrorR: React.CSSProperties = { left: 'auto', right: '7%', width: '26%', height: '28%', top: '17%' };
// Vertical grime runs weeping down the tiles — thin dark drips of varying length, plus a couple
// of pale mineral streaks, so the wall reads as water-stained rather than a clean gradient.
const wallStreaks: React.CSSProperties = {
  position: 'absolute', left: 0, right: 0, top: 0, height: '56%', mixBlendMode: 'multiply', opacity: 0.7,
  backgroundImage:
    'linear-gradient(180deg, rgba(0,0,0,0.5) 0 40%, transparent 90%),' +
    'linear-gradient(180deg, rgba(0,0,0,0.45) 0 28%, transparent 76%),' +
    'linear-gradient(180deg, rgba(0,0,0,0.4) 0 52%, transparent 92%),' +
    'linear-gradient(180deg, rgba(0,0,0,0.42) 0 34%, transparent 80%),' +
    'linear-gradient(180deg, rgba(0,0,0,0.38) 0 60%, transparent 96%),' +
    'linear-gradient(180deg, rgba(214,196,150,0.10) 0 46%, transparent 84%)',
  backgroundRepeat: 'no-repeat',
  backgroundSize: '2px 100%, 3px 100%, 2px 100%, 4px 100%, 2px 100%, 3px 100%',
  backgroundPosition: '19% 0, 27% 0, 44% 0, 66% 0, 73% 0, 58% 0',
};
// A closed stall/service door bolted to the right wall: recessed dark panel with a lit top-left
// bevel (relief), a faint inset panel line, and a small round handle plate.
const stallDoor: React.CSSProperties = {
  position: 'absolute', right: '3.5%', top: '10%', width: '13%', height: '46%', borderRadius: 2,
  background: 'linear-gradient(150deg, #1c1712 0%, #120d0a 48%, #0a0705 100%)',
  border: '1px solid rgba(0,0,0,0.72)',
  boxShadow:
    'inset 0 2px 0 rgba(190,180,150,0.10), inset 2px 0 0 rgba(150,140,110,0.06),' +
    'inset 0 0 40px rgba(0,0,0,0.6), 0 6px 22px rgba(0,0,0,0.55)',
  backgroundClip: 'padding-box',
};
// The sink counter running along the base of the wall: a dark ledge with a lit front lip
// (relief) so it stands proud, holding a row of basin ellipses.
const counter: React.CSSProperties = {
  position: 'absolute', left: 0, right: 0, top: '46%', height: '11%',
  background: 'linear-gradient(180deg, #2a231a 0%, #1a140e 46%, #0d0906 100%)',
  borderTop: '1px solid rgba(210,196,160,0.16)',
  boxShadow: 'inset 0 2px 0 rgba(230,214,170,0.10), 0 10px 26px rgba(0,0,0,0.6)',
};
// A shallow washbasin sunk into the counter: dark porcelain ellipse with a lit rear rim and a
// pooled shadow at the drain — relief, not a 3D bowl.
const basin: React.CSSProperties = {
  position: 'absolute', top: '30%', width: '17%', height: '58%', transform: 'translateX(-50%)',
  borderRadius: '50%',
  background: 'radial-gradient(ellipse at 50% 38%, #0a0706 0%, #14100b 60%, #221a12 100%)',
  boxShadow: 'inset 0 3px 5px rgba(0,0,0,0.7), inset 0 -2px 0 rgba(214,196,150,0.12)',
};
// A stub faucet rising from the back rim of each basin — a thin lit vertical with a bent neck.
const faucet: React.CSSProperties = {
  position: 'absolute', left: '50%', top: '-34%', width: 3, height: '46%', transform: 'translateX(-50%)',
  borderRadius: 2,
  background: 'linear-gradient(180deg, rgba(200,190,160,0.5), rgba(90,84,66,0.5))',
  boxShadow: '0 0 6px rgba(0,0,0,0.5)',
};
// A hairline of light where wall meets floor — the room's vanishing seam.
const sceneHorizon: React.CSSProperties = {
  position: 'absolute', left: 0, right: 0, top: '56%', height: 2,
  background: 'linear-gradient(90deg, transparent, rgba(238,200,120,0.26) 30%, rgba(238,200,120,0.28) 70%, transparent)',
  filter: 'blur(1px)',
};
// Dirty checkerboard floor skewed into perspective, receding into the dark.
const sceneFloor: React.CSSProperties = {
  position: 'absolute', left: '-40%', right: '-40%', bottom: 0, height: '52%',
  backgroundColor: '#120e0a',
  backgroundImage:
    'linear-gradient(45deg, #2b271f 25%, transparent 25%),' +
    'linear-gradient(-45deg, #2b271f 25%, transparent 25%),' +
    'linear-gradient(45deg, transparent 75%, #2b271f 75%),' +
    'linear-gradient(-45deg, transparent 75%, #2b271f 75%)',
  backgroundSize: '84px 84px',
  backgroundPosition: '0 0, 0 42px, 42px -42px, -42px 0',
  transform: 'perspective(560px) rotateX(61deg)', transformOrigin: 'center top',
  boxShadow: 'inset 0 70px 120px rgba(0,0,0,0.78)',
};
// A wet vertical smear of light on the floor directly under the bulb — the damp, greasy sheen
// that reads the tiles as slick rather than dry. Sits over the checkerboard, below the lamp pool.
const floorSheen: React.CSSProperties = {
  position: 'absolute', left: '50%', bottom: 0, width: '30%', height: '48%', transform: 'translateX(-50%)',
  background: 'linear-gradient(180deg, rgba(240,206,132,0.14) 0%, rgba(240,206,132,0.05) 40%, transparent 78%)',
  filter: 'blur(10px)', mixBlendMode: 'screen',
};
// The square gray metal drain plate. It's a child of the tilted floor plane, so it's a true
// square here; the parent's rotateX foreshortens it onto the tiles. Cast-iron frame with a lit
// top edge and a shadow skirt so it reads as set into the floor near the wall.
const floorDrain: React.CSSProperties = {
  position: 'absolute', left: '50%', top: '5%', width: 150, height: 150,
  transform: 'translateX(-50%)', borderRadius: 3,
  background: 'linear-gradient(160deg, #55534d 0%, #35342f 40%, #201f1b 100%)',
  border: '1px solid rgba(20,19,16,0.9)',
  boxShadow:
    'inset 0 2px 0 rgba(150,148,140,0.35), inset 0 -2px 6px rgba(0,0,0,0.7),' +
    '0 6px 14px rgba(0,0,0,0.6)',
};
// The sunken black mouth inside the plate — the hole the runoff falls into.
const drainWell: React.CSSProperties = {
  position: 'absolute', inset: 9, borderRadius: 2,
  background: 'radial-gradient(ellipse at 50% 45%, #000 0%, #060503 70%, #131109 100%)',
  boxShadow: 'inset 0 3px 7px rgba(0,0,0,0.95)',
};
// One parallel bar of the cast grate spanning the mouth — thin lit steel struts.
const drainGrateBar: React.CSSProperties = {
  position: 'absolute', left: 9, right: 9, height: 4, borderRadius: 2,
  transform: 'translateY(-50%)',
  background: 'linear-gradient(180deg, #6a675f, #34322c)',
  boxShadow: '0 1px 1px rgba(0,0,0,0.8)',
};
// The overhead bulb's light cone falling through the room.
const sceneLight: React.CSSProperties = {
  position: 'absolute', left: '50%', top: '-4%', width: '48%', height: '74%', transform: 'translateX(-50%)',
  background: 'linear-gradient(180deg, rgba(240,204,128,0.16), rgba(240,204,128,0.02) 70%, transparent)',
  clipPath: 'polygon(45% 0%, 55% 0%, 80% 100%, 20% 100%)', filter: 'blur(7px)',
};
// The bare sodium bulb up top.
const sceneBulb: React.CSSProperties = {
  position: 'absolute', left: '50%', top: '4%', width: 14, height: 14, borderRadius: '50%',
  transform: 'translateX(-50%)',
  background: 'radial-gradient(circle, #fff2cf 0%, #f0b256 55%, rgba(210,140,50,0.2) 100%)',
  boxShadow: '0 0 26px 8px rgba(240,190,90,0.55)',
};
// The bulb's pool welling up from the floor centre.
const sceneLampPool: React.CSSProperties = {
  position: 'absolute', left: '50%', bottom: '-6%', width: '66%', height: '44%',
  transform: 'translateX(-50%)', borderRadius: '50%',
  background: 'radial-gradient(ellipse at 50% 50%, rgba(240,200,120,0.16), rgba(240,200,120,0.04) 55%, transparent 72%)',
  filter: 'blur(6px)',
};
const sceneGrime: React.CSSProperties = {
  position: 'absolute', inset: 0, backgroundImage: NOISE, backgroundSize: '160px 160px',
  opacity: 0.13, mixBlendMode: 'overlay',
};
const scatterLayer: React.CSSProperties = {
  position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0, opacity: 0.5,
};
// Falling cards ride above the vignette (zIndex 1) but below the content (zIndex 2) so the
// slow drift stays clearly visible against the darkened scene without covering the menu.
const fallLayer: React.CSSProperties = {
  position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1, opacity: 0.6,
};
function fallingCard(c: (typeof FALLING)[number]): React.CSSProperties {
  return {
    position: 'absolute', left: `${c.l}%`, top: 0,
    width: 74 * c.s, height: 104 * c.s, borderRadius: 9,
    display: 'grid', placeItems: 'center', filter: 'blur(0.6px)',
    background: 'linear-gradient(160deg,#211a12,#100a08)', border: `1px solid ${C.border}`,
    boxShadow: '0 10px 22px rgba(0,0,0,0.5), inset 0 0 0 2px rgba(166,197,63,0.05)',
    animation: `cb-cardfall ${c.dur}s linear ${c.delay}s infinite`,
    ['--r0' as string]: `${c.r0}deg`, ['--r1' as string]: `${c.r1}deg`, ['--o' as string]: `${c.o}`,
  };
}
function scatterCard(c: { l: number; t: number; r: number; o: number; s: number }): React.CSSProperties {
  return {
    position: 'absolute', left: `${c.l}%`, top: `${c.t}%`,
    width: 76 * c.s, height: 106 * c.s, borderRadius: 9,
    transform: `translate(-50%,-50%) rotate(${c.r}deg)`, opacity: c.o,
    display: 'grid', placeItems: 'center', filter: 'blur(0.4px)',
    background: 'linear-gradient(160deg,#211a12,#100a08)', border: `1px solid ${C.border}`,
    boxShadow: '0 10px 22px rgba(0,0,0,0.6), inset 0 0 0 2px rgba(166,197,63,0.05)',
  };
}
const vignette: React.CSSProperties = {
  position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1,
  background: 'radial-gradient(120% 108% at 50% 42%, transparent 44%, rgba(4,3,5,0.9) 100%)',
};

const content: React.CSSProperties = {
  position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
  textAlign: 'left',
};
const kicker: React.CSSProperties = {
  fontFamily: mono, fontSize: 11, letterSpacing: 5, color: C.faint, textTransform: 'uppercase',
  marginBottom: 4,
};
const titleWrap: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 0, margin: '6px 0 2px',
};
const titleLine: React.CSSProperties = {
  display: 'block', fontFamily: serif, fontWeight: 700, lineHeight: 0.92, letterSpacing: 'clamp(4px, 1.2vw, 12px)',
  fontSize: 'clamp(52px, 12vw, 128px)', color: '#f3eee6',
  textShadow: '0 3px 0 #1a0f10, 0 10px 30px rgba(0,0,0,0.7), 0 0 40px rgba(126,38,62,0.4)',
};
const titleLine2: React.CSSProperties = {
  color: '#e7d8c6', letterSpacing: 'clamp(8px, 2.4vw, 26px)', marginTop: '-0.06em',
};
// The title struck through like the Buckshot cover: a ghosted duplicate shoved down-right behind
// the crisp word, with a bright blade-line bisecting both and a gem punched through its centre.
const titleStack: React.CSSProperties = { position: 'relative', display: 'inline-block' };
const titleGhost: React.CSSProperties = {
  ...titleLine, position: 'absolute', left: 'clamp(5px, 0.7vw, 12px)', top: 'clamp(6px, 0.9vw, 16px)',
  color: 'transparent', WebkitTextStroke: '1px rgba(126,38,62,0.55)', textShadow: 'none', opacity: 0.75,
};
const strike: React.CSSProperties = {
  position: 'absolute', left: '-3%', right: '-3%', top: '52%', height: 'clamp(3px, 0.4vw, 5px)',
  transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: 'linear-gradient(90deg, transparent, #f3eee6 7%, #f3eee6 93%, transparent)',
  boxShadow: '0 0 14px rgba(243,238,230,0.5), 0 2px 0 #1a0f10',
};
const strikeGem: React.CSSProperties = {
  fontSize: 'clamp(14px, 1.8vw, 22px)', color: C.rare, lineHeight: 1, padding: '0 10px',
  background: '#0d070a', textShadow: '0 0 14px rgba(216,162,60,0.85)',
};
const byline: React.CSSProperties = {
  fontFamily: mono, fontSize: 'clamp(9px, 1.4vw, 12px)', letterSpacing: 4, color: C.dim,
  marginTop: 10, textTransform: 'uppercase',
};

const menu: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6, marginTop: 'clamp(24px, 4.5vh, 48px)',
  paddingLeft: 28,
};
function menuItem(on: boolean, danger: boolean): React.CSSProperties {
  const base = danger ? C.enemy : C.you;
  return {
    // Left-aligned column, label over sub-caption, so the whole menu reads down the left edge.
    position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 1,
    padding: '6px 8px', cursor: 'pointer', border: 'none', background: 'transparent', fontFamily: sans,
    color: on ? '#fff' : 'rgba(226,220,214,0.62)',
    transform: on ? 'translateX(10px)' : 'none',
    textShadow: on ? `0 0 20px ${base}66` : 'none',
    transition: 'color .16s ease, transform .16s ease, text-shadow .16s ease',
  };
}
// The label + its hover caret. Relative so the caret can hang off the label's left edge without
// nudging the label off-centre.
const labelWrap: React.CSSProperties = { position: 'relative', display: 'inline-flex', alignItems: 'center' };
function caret(on: boolean): React.CSSProperties {
  return {
    position: 'absolute', left: -24, top: '50%', fontSize: 13, color: C.you, lineHeight: 1,
    transform: on ? 'translateY(-50%) translateX(0)' : 'translateY(-50%) translateX(-8px)',
    opacity: on ? 1 : 0,
    transition: 'opacity .16s ease, transform .16s ease',
  };
}
const menuLabel: React.CSSProperties = { fontSize: 'clamp(22px, 3.4vw, 30px)', fontWeight: 800, letterSpacing: 1 };
function menuSub(on: boolean): React.CSSProperties {
  return {
    fontFamily: mono, fontSize: 11, letterSpacing: 1, color: on ? C.dim : C.faint,
    transition: 'color .16s ease',
  };
}

const topBar: React.CSSProperties = {
  position: 'fixed', top: 16, right: 16, zIndex: 40, display: 'flex', gap: 8, alignItems: 'center',
};
const goldChip: React.CSSProperties = {
  padding: '7px 14px', fontSize: 13, fontWeight: 800, color: '#ffe08a', cursor: 'pointer',
  borderRadius: 999, border: '1px solid #6a5620', fontFamily: sans,
  background: 'linear-gradient(180deg, rgba(70,56,16,0.9), rgba(40,32,10,0.9))',
  boxShadow: '0 6px 16px rgba(180,140,30,0.25)',
};
const nameChip: React.CSSProperties = {
  padding: '7px 14px', fontSize: 13, fontWeight: 700, color: C.dim,
  borderRadius: 999, border: `1px solid ${C.border}`, background: 'rgba(20,14,16,0.8)', fontFamily: sans,
};

const creditsBackdrop: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 60, display: 'grid', placeItems: 'center',
  background: 'rgba(4,3,5,0.72)', backdropFilter: 'blur(4px)',
};
const creditsCard: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '28px 34px',
  borderRadius: 16, width: 'min(420px, 90vw)', textAlign: 'center',
  background: 'linear-gradient(180deg, #1a1013, #100a0c)', border: `1px solid ${C.border}`,
  boxShadow: '0 30px 70px rgba(0,0,0,0.6)',
};
const creditsTitle: React.CSSProperties = { fontFamily: serif, fontSize: 34, fontWeight: 700, margin: '2px 0 8px', color: '#f3eee6', letterSpacing: 2 };
const creditsLine: React.CSSProperties = { margin: 0, fontSize: 14, color: C.text };
const creditsSmall: React.CSSProperties = { margin: '10px 0 4px', fontSize: 12.5, color: C.faint, lineHeight: 1.4 };
const creditsClose: React.CSSProperties = {
  marginTop: 12, padding: '10px 24px', fontSize: 14, fontWeight: 800, color: '#141608', cursor: 'pointer',
  border: 'none', borderRadius: 10, fontFamily: sans,
  background: 'linear-gradient(100deg, #b6d24a, #93ad34 58%, #74902a)', boxShadow: '0 6px 18px rgba(0,0,0,0.5)',
};
