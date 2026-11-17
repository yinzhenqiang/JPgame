// Seedable RNG (mulberry32). Gameplay randomness goes through `rand` so a
// ?seed= URL parameter makes a session reproducible for the play-test.
export function makeRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let _r = makeRng((Date.now() ^ (Math.random() * 0x7fffffff)) >>> 0);
export const rand = () => _r();
export const seed = (n) => { _r = makeRng(n); };
export const pick = (arr) => arr[Math.floor(rand() * arr.length)];
