// A small seeded random source (mulberry32). Feed it the same seed and it deals the
// same guests, the same tickets and the same smoker timings every time — that is what
// makes the screenshot scenes repeatable and a shift replayable.

export function makeRng(seed) {
  let s = seed | 0;
  return function next() {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Pick one item from `items` using the seeded source. */
export function pickOne(rng, items) {
  return items[Math.floor(rng() * items.length)];
}

/** A whole number from `lo` (inclusive) to `hi` (exclusive). */
export function rollRange(rng, lo, hi) {
  return lo + Math.floor(rng() * (hi - lo));
}
