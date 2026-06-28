import { describe, it, expect } from 'vitest';
import { nextFloat, weightedPick } from '../engine/rng.js';

describe('rng', () => {
  it('is deterministic for a given seed', () => {
    const a = nextFloat(12345);
    const b = nextFloat(12345);
    expect(a.value).toBe(b.value);
    expect(a.seed).toBe(b.seed);
  });

  it('advances the seed so successive draws differ', () => {
    const a = nextFloat(12345);
    const b = nextFloat(a.seed);
    expect(a.value).not.toBe(b.value);
  });

  it('weightedPick respects weights statistically', () => {
    const items = [
      { v: 'common', w: 90 },
      { v: 'rare', w: 10 },
    ];
    let seed = 1;
    const counts: Record<string, number> = { common: 0, rare: 0 };
    for (let i = 0; i < 4000; i++) {
      const r = weightedPick(seed, items, (it) => it.w);
      counts[r.item.v]++;
      seed = r.seed;
    }
    expect(counts.common).toBeGreaterThan(counts.rare * 3);
  });

  it('weightedPick is deterministic for a given seed', () => {
    const items = [{ v: 'a', w: 1 }, { v: 'b', w: 1 }, { v: 'c', w: 1 }];
    const r1 = weightedPick(777, items, (it) => it.w);
    const r2 = weightedPick(777, items, (it) => it.w);
    expect(r1.item.v).toBe(r2.item.v);
  });
});
