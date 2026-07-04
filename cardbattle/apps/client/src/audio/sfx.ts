// Asset-free sound engine. Every cue is synthesised at runtime with the Web Audio API — no
// audio files to ship, cache, or fail to load — which keeps the grimy, lo-fi arcade tone
// consistent and the bundle tiny. One shared AudioContext, a master gain that doubles as the
// mute switch, and a small library of named cues built from oscillators + noise bursts.

type Cue =
  | 'hover' | 'select' | 'back' | 'toggle'
  | 'deal' | 'play' | 'draw'
  | 'damage' | 'heal' | 'shield' | 'reverse' | 'coin'
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

/** Fire a named sound cue. Silent (and cheap) when muted or when Web Audio is unavailable. */
export function playSfx(cue: Cue) {
  if (muted) return;
  const ac = ensure();
  if (!ac || !master) return;
  const t = ac.currentTime;
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
    case 'damage':
      noise(ac, master, t, 0.16, 0.32, 1400);
      tone(ac, master, 'sawtooth', 200, 70, t, 0.16, 0.2); break;
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
  events: { type: string; targetId?: string; playerId?: string; winnerId?: string }[],
  seen: number,
  myId: string,
): number {
  for (let i = seen; i < events.length; i++) {
    const e = events[i];
    switch (e.type) {
      case 'card_played': playSfx('play'); break;
      case 'damage_dealt': playSfx('damage'); break;
      case 'healed': playSfx('heal'); break;
      case 'shielded': playSfx('shield'); break;
      case 'direction_reversed': playSfx('reverse'); break;
      case 'card_stolen': playSfx('draw'); break;
      case 'player_eliminated': playSfx('damage'); break;
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
