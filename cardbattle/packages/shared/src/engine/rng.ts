/** mulberry32 — small, fast, deterministic PRNG. */
export function nextFloat(seed: number): { value: number; seed: number } {
  let t = (seed + 0x6d2b79f5) | 0;
  let x = t;
  x = Math.imul(x ^ (x >>> 15), x | 1);
  x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
  const value = ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  return { value, seed: t };
}

/** Seeded Fisher–Yates shuffle: returns a new shuffled array + the advanced seed. */
export function shuffle<T>(seed: number, items: readonly T[]): { items: T[]; seed: number } {
  const out = items.slice();
  let s = seed;
  for (let i = out.length - 1; i > 0; i--) {
    const r = nextFloat(s);
    s = r.seed;
    const j = Math.floor(r.value * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return { items: out, seed: s };
}

export function weightedPick<T>(
  seed: number,
  items: readonly T[],
  weightOf: (item: T) => number,
): { item: T; seed: number } {
  const total = items.reduce((s, it) => s + weightOf(it), 0);
  const { value, seed: nextSeed } = nextFloat(seed);
  let roll = value * total;
  for (const item of items) {
    roll -= weightOf(item);
    if (roll < 0) return { item, seed: nextSeed };
  }
  return { item: items[items.length - 1], seed: nextSeed };
}
