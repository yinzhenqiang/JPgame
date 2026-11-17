// The "director": turns one lottery result into reel motion and reach staging.
// It never decides outcomes — it only presents `spin` from lottery.js.
import { TIMING } from './style.js';

export const REACH_DUR = { normal: 4.2, super: 9, premium: 12.5 };
const CUT_AT = 1.2;        // seconds of normal-look reach before a Super/Premium cut-in
const FINALE = 2.2;        // final slow-down
const JACKPOT_DUR = 4.8;

export class Show {
  constructor(ev = {}) {
    this.ev = ev;
    this.phase = 'idle';           // idle | spin | reach | result | jackpot
    this.t = 0;
    this.reels = [7, 7, 7].map((d) => ({ pos: d, blur: false, stopped: true }));
    this.spin = null;
    this.tier = null;
    this.cut = false;              // true once a Super/Premium cut-in is on screen
    this.stageT = 0;               // seconds since cut-in
    this.rem = 0;                  // seconds until the last reel stops
    this.taikoHit = 0; this.beatT = 0; this.beats = 0;
    this.lost = false;
  }

  get busy() { return this.phase !== 'idle'; }
  // lanterns lit so far in a Super Reach — one per 150ms (STYLE §3.4)
  get lanternsLit() { return Math.floor(this.stageT / TIMING.lanternStep); }

  start(spin, fast) {
    this.spin = spin; this.phase = 'spin'; this.t = 0; this.fast = fast;
    this.tier = spin.tier; this.cut = false; this.stageT = 0; this.lost = false; this.taikoHit = 0; this.beats = 0;
    for (const r of this.reels) { r.blur = true; r.stopped = false; }
    this.stopped = 0;
    if (this.ev.start) this.ev.start(spin);
  }

  stopReel(i) {
    const r = this.reels[i];
    r.blur = false; r.stopped = true; r.pos = this.spin.digits[i]; this.stopped = i + 1;
    if (this.ev.stop) this.ev.stop(i, this.spin);
  }

  update(dt) {
    if (this.phase === 'idle') return;
    this.t += dt;
    this.taikoHit = Math.max(0, this.taikoHit - dt * 3.2);
    const k = this.fast ? 0.55 : 1, S = [0.8 * k, 1.3 * k, 1.8 * k], sp = this.spin;

    if (this.phase === 'spin') {
      for (const r of this.reels) if (r.blur) r.pos += 14 * dt;
      if (this.stopped === 0 && this.t >= S[0]) this.stopReel(0);
      if (this.stopped === 1 && this.t >= S[1]) {
        this.stopReel(1);
        if (sp.tier) {
          this.phase = 'reach'; this.t = 0;
          const r = this.reels[2]; r.blur = false; this.lastDigit = null;
          this.target = sp.digits[2] + 40;         // unwrapped so the scroll never runs backwards
          if (this.ev.reach) this.ev.reach(sp.tier, sp);
          return;
        }
      }
      if (this.stopped === 2 && this.t >= S[2]) { this.stopReel(2); this.phase = 'result'; this.t = 0; this.resultDur = 0.5 * k; }
      return;
    }

    if (this.phase === 'reach') {
      const D = REACH_DUR[this.tier];
      this.rem = D - this.t;
      if (this.tier !== 'normal' && !this.cut && this.t >= CUT_AT) { this.cut = true; this.stageT = 0; this.beatT = 0; if (this.ev.cutIn) this.ev.cutIn(this.tier, sp); }
      if (this.cut) {
        this.stageT += dt; this.beatT -= dt;
        if (this.beatT <= 0) {            // taiko: steady, then double-time in the finale
          this.beatT = this.rem > FINALE ? 0.5 : 0.25; this.taikoHit = 1; this.beats++;
          if (this.ev.taiko) this.ev.taiko(this.tier, this.rem <= FINALE);
        }
      }
      const r = this.reels[2], rem = Math.max(0, this.rem);
      r.pos = rem > FINALE ? this.target - 3 - 4.5 * (rem - FINALE) : this.target - 3 * Math.pow(rem / FINALE, 2);
      const d = Math.round(r.pos);
      if (d !== this.lastDigit) { this.lastDigit = d; if (this.ev.tick) this.ev.tick(); }
      if (this.rem <= 0) {
        this.stopReel(2);
        if (sp.win) { this.phase = 'jackpot'; this.t = 0; if (this.ev.jackpot) this.ev.jackpot(sp); }
        else { this.phase = 'result'; this.t = 0; this.resultDur = 1.5; this.lost = true; if (this.ev.lose) this.ev.lose(sp); }
      }
      return;
    }

    if (this.phase === 'jackpot' && this.t >= JACKPOT_DUR) return this.finish();
    if (this.phase === 'result' && this.t >= this.resultDur) return this.finish();
  }

  finish() {
    const sp = this.spin;
    this.phase = 'idle'; this.cut = false; this.lost = false; this.tier = null;
    if (this.ev.done) this.ev.done(sp);
  }
}
