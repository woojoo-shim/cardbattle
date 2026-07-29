// Asset-free sound engine. Every cue is synthesised at runtime with the Web Audio API — no
// audio files to ship, cache, or fail to load — which keeps the grimy, lo-fi arcade tone
// consistent and the bundle tiny. One shared AudioContext, a master gain that doubles as the
// mute switch, and a small library of named cues built from oscillators + noise bursts.

type Cue =
  | 'hover' | 'select' | 'back' | 'toggle'
  | 'deal' | 'play' | 'draw'
  | 'attack' | 'damage' | 'block' | 'heal' | 'shield' | 'reverse' | 'coin'
  | 'poison' | 'regen' | 'reflect'
  | 'win' | 'lose' | 'turn';

const MUTE_KEY = 'cb_muted';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = (() => {
  try { return localStorage.getItem(MUTE_KEY) === '1'; } catch { return false; }
})();

// The browser only lets audio start from a user gesture, so the context is created lazily on
// the first cue and resumed whenever it lands in a suspended state.
function ensure(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!ctx) {
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.5;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

// A single enveloped oscillator note.
function tone(
  ac: AudioContext, dest: AudioNode,
  type: OscillatorType, from: number, to: number,
  t0: number, dur: number, peak: number,
) {
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, t0);
  if (to !== from) osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0 + Math.min(0.012, dur * 0.3));
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(dest);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

// A short filtered noise burst — the grit under whooshes and impacts.
function noise(ac: AudioContext, dest: AudioNode, t0: number, dur: number, peak: number, cutoff: number, hp = false) {
  const n = Math.floor(ac.sampleRate * dur);
  const buf = ac.createBuffer(1, n, ac.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  const src = ac.createBufferSource();
  src.buffer = buf;
  const f = ac.createBiquadFilter();
  f.type = hp ? 'highpass' : 'lowpass';
  f.frequency.value = cutoff;
  const g = ac.createGain();
  g.gain.setValueAtTime(peak, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(f).connect(g).connect(dest);
  src.start(t0);
  src.stop(t0 + dur + 0.02);
}

/** Fire a named sound cue. Silent (and cheap) when muted or when Web Audio is unavailable.
 * `opts.mag` (~0.4 chip → ~1.6 crusher) scales the impact weight so the sound tracks the hit,
 * mirroring the magnitude-scaled knockback / camera / flash on the visual side. */
export function playSfx(cue: Cue, opts?: { mag?: number }) {
  if (muted) return;
  const ac = ensure();
  if (!ac || !master) return;
  const t = ac.currentTime;
  const mag = opts?.mag ?? 1;
  switch (cue) {
    case 'hover':
      tone(ac, master, 'sine', 660, 720, t, 0.05, 0.06); break;
    case 'select':
      tone(ac, master, 'triangle', 520, 780, t, 0.09, 0.16);
      tone(ac, master, 'square', 260, 300, t, 0.06, 0.05); break;
    case 'back':
      tone(ac, master, 'triangle', 480, 300, t, 0.11, 0.14); break;
    case 'toggle':
      tone(ac, master, 'square', 400, 400, t, 0.04, 0.09); break;
    case 'deal':
      noise(ac, master, t, 0.13, 0.18, 3200, true); break;
    case 'draw':
      noise(ac, master, t, 0.1, 0.14, 2600, true);
      tone(ac, master, 'sine', 700, 1000, t, 0.08, 0.05); break;
    case 'play':
      noise(ac, master, t, 0.1, 0.16, 4200, true);
      tone(ac, master, 'triangle', 380, 620, t, 0.12, 0.14); break;
    case 'attack': {
      // A minion swings: a quick blade cutting through the air — an airy high-pass whoosh that
      // rushes past with a fast downward pitched swipe. This is the WIND-UP lunge sound; the meaty
      // impact thud rides IMPACT_DELAY later on the resulting damage event.
      const m = mag;
      noise(ac, master, t, 0.10 + m * 0.03, 0.09 + m * 0.04, 1500 + m * 900, true);
      tone(ac, master, 'triangle', 780, 240, t, 0.10 + m * 0.03, 0.06 + m * 0.03);
      break;
    }
    case 'damage': {
      // A layered impact, scaled by magnitude so a chip taps and a crusher slams:
      // 1) a sharp high transient CRACK (the leading edge of the strike),
      // 2) a filtered-noise + pitched BODY thump (the meat of the blow),
      // 3) a low SUB boom that drops deeper and rings longer the harder the hit lands.
      const m = mag;
      noise(ac, master, t, 0.012 + m * 0.006, 0.10 + m * 0.05, 5200 + m * 1400, true);
      noise(ac, master, t + 0.004, 0.13 + m * 0.05, 0.20 + m * 0.10, 1200);
      tone(ac, master, 'sawtooth', 220, 68, t + 0.004, 0.14 + m * 0.05, 0.14 + m * 0.06);
      tone(ac, master, 'sine', 150 - m * 28, 42, t + 0.004, 0.18 + m * 0.14, 0.13 + m * 0.09);
      break;
    }
    case 'block': {
      // A shield eats the blow: a bright metallic CLANG (steel meeting steel) rather than a
      // fleshy thud — a dull thud transient under a ringing square ping + a crisp noise clink,
      // scaled by magnitude so a soaked-up crusher rings harder than a chip.
      const m = mag;
      noise(ac, master, t, 0.02 + m * 0.006, 0.10 + m * 0.04, 2600, false);
      tone(ac, master, 'square', 720, 500, t, 0.10 + m * 0.03, 0.10 + m * 0.05);
      tone(ac, master, 'triangle', 1500, 1500, t, 0.16, 0.05 + m * 0.03);
      noise(ac, master, t, 0.05, 0.09 + m * 0.03, 6400, true);
      break;
    }
    case 'heal':
      tone(ac, master, 'sine', 520, 780, t, 0.16, 0.13);
      tone(ac, master, 'sine', 780, 1040, t + 0.05, 0.18, 0.1); break;
    case 'shield':
      tone(ac, master, 'square', 300, 460, t, 0.14, 0.11);
      noise(ac, master, t, 0.08, 0.08, 1800); break;
    case 'reverse':
      tone(ac, master, 'sawtooth', 300, 720, t, 0.12, 0.12);
      tone(ac, master, 'sawtooth', 720, 300, t + 0.1, 0.14, 0.1); break;
    case 'coin':
      tone(ac, master, 'square', 880, 1320, t, 0.07, 0.12);
      tone(ac, master, 'square', 1320, 1760, t + 0.06, 0.09, 0.1); break;
    case 'poison':
      // A sickly corrosive hiss: airy high-pass noise over a queasy detuned low buzz.
      noise(ac, master, t, 0.26, 0.12, 5200, true);
      tone(ac, master, 'sawtooth', 150, 96, t, 0.28, 0.11);
      tone(ac, master, 'sawtooth', 156, 100, t, 0.28, 0.08); break;
    case 'regen':
      // A soft holy shimmer: a gentle rising open-fifth chime pair.
      tone(ac, master, 'sine', 660, 990, t, 0.22, 0.1);
      tone(ac, master, 'sine', 990, 1320, t + 0.07, 0.24, 0.07); break;
    case 'reflect':
      // A hard metallic barrier ring: bright square ping plus a crisp noise clink.
      tone(ac, master, 'square', 620, 880, t, 0.16, 0.12);
      tone(ac, master, 'triangle', 1240, 1240, t, 0.2, 0.06);
      noise(ac, master, t, 0.05, 0.1, 6000, true); break;
    case 'turn':
      tone(ac, master, 'sine', 440, 560, t, 0.09, 0.08); break;
    case 'win': {
      const notes = [523, 659, 784, 1046];
      notes.forEach((f, i) => tone(ac, master!, 'triangle', f, f, t + i * 0.1, 0.24, 0.16)); break;
    }
    case 'lose': {
      const notes = [392, 330, 262, 196];
      notes.forEach((f, i) => tone(ac, master!, 'sawtooth', f, f * 0.98, t + i * 0.13, 0.28, 0.12)); break;
    }
  }
}

/** Map the freshest GameEvents to sound cues. Callers pass the accumulated event array and the
 * cursor of how many were already sounded; returns the new cursor. Win/lose is personalised to
 * the local player. Frequent, low-signal events (draws, mana ticks) are intentionally silent. */
export function soundEvents(
  events: { type: string; targetId?: string; playerId?: string; winnerId?: string; status?: string; element?: string; amount?: number; absorbed?: number }[],
  seen: number,
  myId: string,
): number {
  // Normalise a damage amount into the impact-weight range the visual side uses.
  const magOf = (a?: number) => (a == null ? 1 : Math.max(0.4, Math.min(1.6, a / 9)));
  // VfxLayer defers every damage impact by IMPACT_DELAY (the hurl travel time) so the flash + kick
  // land as the thrown card connects. The impact SOUND must ride the same delay or the thud cracks
  // ~0.55s before the card arrives — the single worst desync for felt punch.
  const IMPACT_MS = 550;
  for (let i = seen; i < events.length; i++) {
    const e = events[i];
    switch (e.type) {
      case 'card_played': playSfx('play'); break;
      case 'minion_summoned': playSfx('deal'); break;
      // The minion lunges — a blade-swing whoosh fires at the wind-up, ahead of the impact thud
      // which lands IMPACT_MS later on the resulting minion_damaged / damage_dealt event.
      case 'minion_attacked': playSfx('attack'); break;
      case 'minion_damaged': {
        if (e.amount && e.amount > 0) { const mag = magOf(e.amount); setTimeout(() => playSfx('damage', { mag }), IMPACT_MS); }
        break;
      }
      case 'damage_dealt': {
        // Poison damage-over-time ticks get the corrosive hiss instead of the blunt hit. Both ride
        // the impact delay so the sound lands exactly with the deferred visual.
        if (e.element === 'poison') { setTimeout(() => playSfx('poison'), IMPACT_MS); break; }
        // A shield that soaks part (or all) of the blow rings a metallic CLANG; only the HP actually
        // lost gets the fleshy thud. A fully-blocked hit (amount 0) is clang-only — no blood thud.
        const blocked = e.absorbed ?? 0;
        if (blocked > 0) { const mag = magOf(blocked); setTimeout(() => playSfx('block', { mag }), IMPACT_MS); }
        if (e.amount && e.amount > 0) { const mag = magOf(e.amount); setTimeout(() => playSfx('damage', { mag }), IMPACT_MS); }
        break;
      }
      case 'healed': playSfx('heal'); break;
      case 'shielded': playSfx('shield'); break;
      case 'minion_buffed': playSfx('shield'); break;
      case 'player_eliminated': setTimeout(() => playSfx('damage', { mag: 1.6 }), IMPACT_MS); break;
      case 'game_over': playSfx(e.winnerId === myId ? 'win' : 'lose'); break;
    }
  }
  return events.length;
}

export function isMuted() { return muted; }

/** Shared context + master gain for sibling audio modules (background music) so everything
 * runs on one AudioContext and obeys the same mute switch. */
export function ensureAudio(): AudioContext | null { return ensure(); }
export function getMaster(): GainNode | null { return master; }

/** Flip the master mute and persist it. Returns the new muted state. */
export function toggleMute(): boolean {
  muted = !muted;
  try { localStorage.setItem(MUTE_KEY, muted ? '1' : '0'); } catch { /* ignore */ }
  if (master && ctx) master.gain.setTargetAtTime(muted ? 0 : 0.5, ctx.currentTime, 0.02);
  if (!muted) { ensure(); playSfx('toggle'); }
  return muted;
}
