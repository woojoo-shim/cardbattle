/** Shared visual tokens for the battle UI — "The Abyssal Arena" dark-fantasy palette.
 * Depth comes from luminance layers + 1px borders + drop shadows, not glow spam.
 * Glow is reserved for state-change moments (your turn, hit flash, targeting). */
export const C = {
  void: '#07080d',
  stage: '#0e1018',
  panel: '#161a26',
  panelHi: '#1f2434',
  border: '#2c3142',
  borderHi: '#39405a',
  text: '#e7e9f2',
  dim: '#8b90a6',
  faint: '#565c72',
  you: '#38e8c8', // me / my turn / heal
  enemy: '#ff3b6b', // opponents / damage / targeting / danger
  rare: '#f4c44a', // rare/epic cards, victory
  magic: '#8b6cff', // status effects, magic
} as const;

export const RARITY_BORDER: Record<string, string> = {
  common: C.border,
  rare: C.magic,
  epic: C.rare,
  legendary: C.rare,
};

export const mono = '"Geist Mono", ui-monospace, SFMono-Regular, Menlo, monospace';
export const sans = '"Geist", Inter, system-ui, -apple-system, "Segoe UI", sans-serif';
