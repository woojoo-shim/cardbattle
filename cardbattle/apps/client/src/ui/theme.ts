/** Shared visual tokens for the battle UI — Buckshot-Roulette-style grimy back-room palette.
 * Warm, desaturated near-black surfaces + muddy borders; the only saturated colours are a
 * sickly fluorescent institutional green, blood red, dirty amber, and a muted verdigris.
 * Depth comes from luminance layers + 1px borders + drop shadows, not neon glow spam. */
export const C = {
  void: '#080807', // wet-black room floor
  stage: '#101110',
  panel: '#181a16', // grimy warm-grey surface
  panelHi: '#232620',
  border: '#35362d', // muddy metal edge
  borderHi: '#4a4b3a',
  text: '#e7e3d5', // bone white
  dim: '#9c988a',
  faint: '#605d51',
  you: '#a6c53f', // me / my turn / heal — sickly institutional green
  enemy: '#cf3a30', // opponents / damage / targeting / danger — blood red
  rare: '#d8a23c', // rare/epic cards, victory — dirty amber / lamp light
  magic: '#6fa08c', // status effects, magic — muted verdigris
} as const;

export const RARITY_BORDER: Record<string, string> = {
  common: C.border,
  rare: C.magic,
  epic: C.rare,
  legendary: C.rare,
};

export const mono = '"Geist Mono", ui-monospace, SFMono-Regular, Menlo, monospace';
export const sans = '"Geist", Inter, system-ui, -apple-system, "Segoe UI", sans-serif';
