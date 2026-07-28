/** Shared visual tokens for the battle UI — an aged-paper / candlelit-scriptorium palette.
 * Warm walnut-and-leather surfaces under parchment ink; every accent is a muted, printed
 * pigment (sage ink, ochre-red, gold-leaf, faded teal) — NO fluorescent neon and no glow spam.
 * Depth comes from luminance layers + 1px borders + soft drop shadows, like ink on old stock. */
export const C = {
  void: '#120c06',  // deep walnut desk — darkened so lit surfaces separate cleanly
  stage: '#20160d',
  panel: '#342714',  // aged leather / worn card-stock surface — brighter so it lifts off the void
  panelHi: '#4a3720',
  border: '#5f4b30',  // scuffed leather edge — raised so panels read a crisp outline
  borderHi: '#8f7047',
  text: '#f6edd7',  // warm parchment ink — crisper for legibility
  dim: '#c6b78f',
  faint: '#786849',
  you: '#a8c84e',    // me / my turn / heal — vivid sage-lime (readable, not fluorescent)
  enemy: '#d44a2e',  // opponents / damage / danger — bright ember blood-red
  rare: '#e6b84e',   // rare/epic cards, victory — gleaming gold-leaf / lamp light
  magic: '#5fb8a8',  // status effects, magic — clean jade-teal cool counterpoint to the warm surfaces
} as const;

export const RARITY_BORDER: Record<string, string> = {
  common: C.border,
  rare: C.magic,
  epic: C.rare,
  legendary: C.rare,
};

export const mono = '"Geist Mono", ui-monospace, SFMono-Regular, Menlo, monospace';
export const sans = '"Geist", Inter, system-ui, -apple-system, "Segoe UI", sans-serif';
