/** Shared visual tokens for the battle UI — a jewel / dark-fantasy palette.
 * Deep blue-black slate surfaces under cool moonlit ink; every accent is a saturated GEMSTONE
 * pigment (emerald, ruby, gold, amethyst) reading like faceted stones lit against obsidian.
 * Depth comes from luminance layers + 1px borders + soft drop shadows. Bright but not fluorescent. */
export const C = {
  void: '#0a0d15',   // obsidian — darkened so lit surfaces separate cleanly
  stage: '#10131c',  // 흑청 midnight
  panel: '#1c2233',  // slate card-stock surface — lifts off the void
  panelHi: '#2b3448',
  border: '#3a4560',  // cool steel edge — raised so panels read a crisp outline
  borderHi: '#5c6f96',
  text: '#eef2fb',  // cool moonlit ink — crisp for legibility
  dim: '#aab6cf',
  faint: '#5a6484',
  you: '#37e0a0',    // me / my turn / heal — bright emerald
  enemy: '#ff4d5e',  // opponents / damage / danger — bright ruby
  rare: '#ffcf4d',   // rare/epic cards, victory — gleaming gold
  magic: '#a86bff',  // status effects, magic — amethyst cool counterpoint
} as const;

export const RARITY_BORDER: Record<string, string> = {
  common: C.border,
  rare: C.magic,
  epic: C.rare,
  legendary: C.rare,
};

// Tribe (종족) accent colors — a distinct pigment per creature family.
export const TRIBE_COLOR: Record<string, string> = {
  beast: '#d19a5c',      // 야수 — warm tawny hide
  human: '#7fa8d8',      // 인간 — steel blue
  undead: '#a888c8',     // 망자 — sickly violet
  elemental: '#4fc9bf',  // 정령 — arcane teal
};

export const mono = '"Geist Mono", ui-monospace, SFMono-Regular, Menlo, monospace';
export const sans = '"Geist", Inter, system-ui, -apple-system, "Segoe UI", sans-serif';
