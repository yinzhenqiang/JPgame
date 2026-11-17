// Lottery: every start-pocket entry is decided here, at entry time.
// The reels and staging only *present* the result.
import { rand } from './rng.js';

export const ODDS = {
  base: 1 / 300,          // jackpot probability per spin
  feverMult: 10,          // fever: 10× → 1/30
  feverRounds: 10,
  // How jackpots are distributed across reach tiers…
  share: { normal: 0.5, super: 0.3, premium: 0.2 },
  // …and the win rate each tier must show. Losing-reach frequencies are derived
  // from these two tables so that P(win | tier) holds exactly in both modes.
  winRate: { normal: 0.05, super: 0.30, premium: 0.80 },
};

const TIER_KEYS = ['normal', 'super', 'premium'];

// Pre-read hint weights [green, blue, red, gold, rainbow] by outcome class.
// Rainbow only ever appears on a jackpot (STYLE §2.4: rainbow is scarce).
const HINT = {
  win: [5, 10, 30, 40, 15],
  'premium-lose': [20, 30, 35, 15, 0],
  'super-lose': [40, 35, 22, 3, 0],
  'normal-lose': [60, 30, 9.5, 0.5, 0],
  miss: [93, 6.5, 0.5, 0, 0],
};

const weighted = (w) => {
  let u = rand() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < w.length; i++) { u -= w[i]; if (u < 0) return i; }
  return w.length - 1;
};

export function jackpotRate(fever) { return ODDS.base * (fever ? ODDS.feverMult : 1); }

// forced: optional 'miss' | '<tier>-lose' | '<tier>-win' | 'jackpot' (debug / play-test hook)
export function roll(fever, forced) {
  let win = false, tier = null;
  if (forced) {
    if (forced === 'jackpot') { win = true; tier = 'premium'; }
    else if (forced !== 'miss') { const [t, r] = forced.split('-'); tier = t; win = r === 'win'; }
  } else {
    const pJ = jackpotRate(fever);
    let u = rand();
    if (u < pJ) { win = true; tier = TIER_KEYS[weighted(TIER_KEYS.map((k) => ODDS.share[k]))]; }
    else {
      u -= pJ;
      for (const k of TIER_KEYS) {
        const pLose = pJ * ODDS.share[k] * (1 - ODDS.winRate[k]) / ODDS.winRate[k];
        if (u < pLose) { tier = k; break; }
        u -= pLose;
      }
    }
  }
  const d = Math.floor(rand() * 10);
  let digits, miss = 0;
  if (win) digits = [d, d, d];
  else if (tier) { miss = rand() < 0.6 ? 1 : -1; digits = [d, d, (d + miss + 10) % 10]; }   // +1 = slides past, −1 = stops short
  else { const b = (d + 1 + Math.floor(rand() * 9)) % 10; digits = [d, b, Math.floor(rand() * 10)]; }
  const cls = win ? 'win' : tier ? tier + '-lose' : 'miss';
  return { win, tier, digits, miss, hint: weighted(HINT[cls]), fever };
}
