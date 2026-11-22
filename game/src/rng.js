// A small deterministic random source (mulberry32) so a seed always replays the
// same patrol drift, loot wobble and guard hesitation. The game never calls
// Math.random for anything that affects a screenshot.
export function createSeededRandom(seed) {
  let state = (seed >>> 0) || 1;
  return function nextRandom() {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function pickFrom(random, list) {
  return list[Math.floor(random() * list.length)];
}

export function jitter(random, amount) {
  return (random() * 2 - 1) * amount;
}
