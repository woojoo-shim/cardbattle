// Asset-free background music. Like the SFX engine, every note is synthesised at runtime — no
// audio files to ship. It's a slow, brooding back-room ambience: a detuned low drone under a
// drifting low-pass filter, with sparse minor-pentatonic plinks trailing through a feedback
// delay. Deliberately quiet and unhurried so it sets a mood without fatiguing over a long match.
// Routes through the shared master gain, so the mute switch silences it along with the SFX.

import { ensureAudio, getMaster, isMuted } from './sfx.js';

// A-minor pentatonic across two octaves — melancholic, never resolves too brightly.
const SCALE = [220, 261.63, 293.66, 329.63, 392, 440, 523.25];

let started = false;
let stopChain: (() => void) | null = null;
let noteTimer: number | null = null;

/** Begin the ambient loop. No-op if already running, muted, or Web Audio is unavailable.
 * The context only actually produces sound once a user gesture resumes it. */
export function startBgm() {
  if (started || isMuted()) return;
  const ac = ensureAudio();
  const master = getMaster();
  if (!ac || !master) return;
  started = true;

  const now = ac.currentTime;

  // Music sub-bus, faded in slowly so it never stabs on.
  const music = ac.createGain();
  music.gain.setValueAtTime(0.0001, now);
  music.gain.exponentialRampToValueAtTime(0.34, now + 4);
  music.connect(master);

  // Feedback delay gives the plinks a cavernous tail.
  const delay = ac.createDelay(1.2);
  delay.delayTime.value = 0.39;
  const feedback = ac.createGain();
  feedback.gain.value = 0.34;
  const wet = ac.createGain();
  wet.gain.value = 0.4;
  delay.connect(feedback).connect(delay);
  delay.connect(wet).connect(music);

  // Low-pass shaping the drone; a slow LFO drifts the cutoff for a breathing feel.
  const lp = ac.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 300;
  lp.Q.value = 0.8;
  lp.connect(music);

  const lfo = ac.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = 0.045;
  const lfoDepth = ac.createGain();
  lfoDepth.gain.value = 150;
  lfo.connect(lfoDepth).connect(lp.frequency);
  lfo.start();

  // Detuned drone stack: root, fifth, and a soft octave sine for body.
  const drones: OscillatorNode[] = [];
  ([[55, 'sawtooth', 0.085, -5], [82.41, 'sawtooth', 0.07, 4], [110, 'sine', 0.05, 0]] as const)
    .forEach(([freq, type, gain, detune]) => {
      const o = ac.createOscillator();
      o.type = type;
      o.frequency.value = freq;
      o.detune.value = detune;
      const g = ac.createGain();
      g.gain.value = gain;
      o.connect(g).connect(lp);
      o.start();
      drones.push(o);
    });

  // One sparse plink, routed dry + into the delay tail.
  const plink = () => {
    if (isMuted()) return;
    const t = ac.currentTime;
    const base = SCALE[Math.floor(Math.random() * SCALE.length)];
    const freq = base * (Math.random() < 0.28 ? 2 : 1);
    const o = ac.createOscillator();
    o.type = Math.random() < 0.5 ? 'triangle' : 'sine';
    o.frequency.value = freq;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.11, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);
    o.connect(g);
    g.connect(music);
    g.connect(delay);
    o.start(t);
    o.stop(t + 1.9);
  };

  // Reschedule with irregular gaps so the melody never feels metronomic.
  const schedule = () => {
    plink();
    noteTimer = window.setTimeout(schedule, 2600 + Math.random() * 4200);
  };
  noteTimer = window.setTimeout(schedule, 1800);

  stopChain = () => {
    const t = ac.currentTime;
    music.gain.cancelScheduledValues(t);
    music.gain.setTargetAtTime(0.0001, t, 0.4);
    drones.forEach((o) => { try { o.stop(t + 1.6); } catch { /* already stopped */ } });
    try { lfo.stop(t + 1.6); } catch { /* already stopped */ }
  };
}

/** Fade the loop out and tear down its nodes. */
export function stopBgm() {
  if (noteTimer !== null) { clearTimeout(noteTimer); noteTimer = null; }
  if (stopChain) { stopChain(); stopChain = null; }
  started = false;
}
