// A tiny seeded generator (mulberry32): the same seed deals the same customers, the same
// orders and the same grill timings, which is what makes the screenshot scenes repeatable
// and lets a player replay a shift exactly.

export function createRandom(seed) {
  let state = seed | 0;
  return function nextRandom() {
    state = (state + 0x6d2b79f5) | 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

/** Pick one entry of `list` with the seeded generator. */
export function pick(random, list) {
  return list[Math.floor(random() * list.length)];
}

/** An integer in [min, max). */
export function rollInt(random, min, max) {
  return min + Math.floor(random() * (max - min));
}
