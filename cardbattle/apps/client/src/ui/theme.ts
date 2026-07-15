/** Shared visual tokens for the battle UI — an aged-paper / candlelit-scriptorium palette.
 * Warm walnut-and-leather surfaces under parchment ink; every accent is a muted, printed
 * pigment (sage ink, ochre-red, gold-leaf, faded teal) — NO fluorescent neon and no glow spam.
 * Depth comes from luminance layers + 1px borders + soft drop shadows, like ink on old stock. */
export const C = {
  void: '#191209', // dark walnut desk the parchment rests on
  stage: '#211810',
  panel: '#2a2013', // aged leather / worn card-stock surface
  panelHi: '#382b1a',
  border: '#4a3b27', // scuffed leather edge
  borderHi: '#6a5539',
  text: '#ece0c6', // warm parchment ink
  dim: '#b4a583',
  faint: '#6f6047',
  you: '#8f9d4f', // me / my turn / heal — muted sage ink (was fluorescent green)
  enemy: '#b0462f', // opponents / damage / danger — ochre blood-red, printed not neon
  rare: '#c39a4c', // rare/epic cards, victory — gold-leaf / lamp light
  magic: '#71918a', // status effects, magic — faded teal ink
} as const;

export const RARITY_BORDER: Record<string, string> = {
  common: C.border,
  rare: C.magic,
  epic: C.rare,
  legendary: C.rare,
};

export const mono = '"Geist Mono", ui-monospace, SFMono-Regular, Menlo, monospace';
export const sans = '"Geist", Inter, system-ui, -apple-system, "Segoe UI", sans-serif';
