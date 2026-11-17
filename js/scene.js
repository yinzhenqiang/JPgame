// Full-window festival backdrop (STYLE §7) and the reach / jackpot cut-in stage (§7.1).
import { C, RB, REACH_COLOR, FONT, rgba } from './style.js';
import { makeRng } from './rng.js';
import {
  glow, sky, neonText, rainbowGrad, lanternString, lantern, stallRow, crowd, mikoshi, taiko, torii, yagura,
  burst, godRays, Fireworks, drawReelSet,
} from './draw.js';

const mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, w); c.height = Math.max(1, h); return c; };

/* ---------- Backdrop: night festival ↔ fireworks festival ---------- */
export class Backdrop {
  constructor() { this.fw = new Fireworks(); this.mode = 'night'; this.cache = {}; this.w = 0; this.h = 0; this.tS = 0; this.tG = 0; this.tW = 0; }
  resize(w, h) { this.w = w; this.h = h; this.cache = {}; }
  setMode(m) { if (m !== this.mode) { this.mode = m; this.tS = this.tG = 0; this.tW = 1; } }

  layers(mode) {
    if (this.cache[mode]) return this.cache[mode];
    const { w, h } = this, k = h / 600, base = h - 34 * k, fever = mode === 'fever', r = makeRng(fever ? 77 : 31);
    const skyC = mk(w, h), sg = skyC.getContext('2d');
    // STYLE §0.2: idle is the darkest state; fever spends the whole brightness budget
    sky(sg, w, h, r, fever ? 160 : 130, fever ? 1.3 : 0.3);
    if (fever) { glow(sg, w * 0.2, h, w * 0.35, C.violet, 0.3); glow(sg, w * 0.8, h, w * 0.35, C.vermilion, 0.25); }
    const gC = mk(w, h), g = gC.getContext('2d');
    const gg = g.createLinearGradient(0, base - 10, 0, h); gg.addColorStop(0, rgba(C.ink, 0)); gg.addColorStop(0.3, C.ink);
    g.fillStyle = gg; g.fillRect(0, base - 10, w, h - base + 10);
    const lit = fever ? 1 : 0.45;
    torii(g, w * 0.16, base, 120 * k); torii(g, w * 0.84, base, 120 * k);
    stallRow(g, 0, w * 0.09, base, 1, 72 * k, r, lit); stallRow(g, w * 0.23, w * 0.43, base, 3, 74 * k, r, lit);
    stallRow(g, w * 0.57, w * 0.77, base, 3, 74 * k, r, lit); stallRow(g, w * 0.91, w, base, 1, 72 * k, r, lit);
    if (fever) {      // §7.1 fever recipe: strings radiate from the yagura, 2 torii, 2 mikoshi, full crowd
      const top = yagura(g, w / 2, base, 190 * k);
      [[0, base - 150 * k], [w * 0.2, base - 60 * k], [w, base - 150 * k], [w * 0.8, base - 60 * k]].forEach((e, i) =>
        lanternString(g, top.x, top.y, e[0], e[1], (i % 2 ? 10 : 34) * k, i % 2 ? 9 : 13, 17 * k, () => 1, (j) => RB[(j + i * 2) % 8]));
      lantern(g, top.x, top.y - 6 * k, 26 * k, 1, C.gold);
      mikoshi(g, w * 0.33, base + 8 * k, 56 * k); mikoshi(g, w * 0.67, base + 8 * k, 56 * k);
      crowd(g, 0, w, h + 8 * k, 70, 13 * k, r);
    } else {          // night festival: one Vermilion string, lanterns lit, thin crowd
      lanternString(g, -10, base - 150 * k, w * 0.5, base - 128 * k, 26 * k, 13, 16 * k, (i) => (i % 3 === 1 ? 0 : 0.55));
      lanternString(g, w * 0.5, base - 128 * k, w + 10, base - 150 * k, 26 * k, 13, 16 * k, (i) => (i % 3 === 1 ? 0 : 0.55));
      crowd(g, 0, w, h + 8 * k, 26, 13 * k, r);
    }
    return (this.cache[mode] = { sky: skyC, ground: gC });
  }

  update(dt) {
    if (this.mode === 'fever') {
      const { w, h } = this, k = h / 600, ground = h - 60 * k;
      this.tS -= dt; this.tG -= dt; this.tW -= dt;
      if (this.tS <= 0) {      // small P8
        this.tS = 0.13;
        this.fw.spawn({ x: Math.random() * w, y: h * (0.08 + Math.random() * 0.45), R: (26 + Math.random() * 26) * k, col: RB[(Math.random() * 8) | 0], rays: 18, rings: 1, life: 1.4, rise: 0.35, ground });
      }
      if (this.tG <= 0) {      // giant two-color P8
        this.tG = 0.36; const i = (Math.random() * 8) | 0;
        this.fw.spawn({ x: w * (0.04 + Math.random() * 0.92), y: h * (0.14 + Math.random() * 0.32), R: (90 + Math.random() * 60) * k, col: RB[i], col2: RB[(i + 1 + ((Math.random() * 3) | 0)) % 8], rays: 46, rings: 3, droop: 0.13, life: 2.4, rise: 0.55, ground });
      }
      if (this.tW <= 0) {      // P9 willow, Gold only
        this.tW = 1.3;
        this.fw.spawn({ x: w * (0.15 + Math.random() * 0.7), y: h * (0.08 + Math.random() * 0.1), R: 72 * k, col: C.gold, rays: 40, rings: 1, droop: 0.55, life: 2.6, rise: 0.6, ground });
      }
    }
    this.fw.update(dt);
  }

  draw(g) {
    const L = this.layers(this.mode);
    g.drawImage(L.sky, 0, 0); this.fw.draw(g); g.drawImage(L.ground, 0, 0);
  }
}

/* ---------- Stage: Super / Premium cut-ins and the jackpot celebration ---------- */
export class Stage {
  constructor() { this.fw = new Fireworks(); this.alpha = 0; this.kind = null; this.t = 0; this.spawnT = 0; this.flash = 0; this.onShake = null; this.digits = [7, 7, 7]; }

  update(dt, show) {
    let kind = null;
    if (show.phase === 'jackpot') kind = 'jackpot';
    else if (show.cut && (show.phase === 'reach' || (show.phase === 'result' && show.lost))) kind = show.tier;
    if (kind && kind !== this.kind) {
      this.t = 0; this.spawnT = 0;
      if (kind === 'jackpot') this.flash = 1;       // STYLE §3.3 T5: 1-frame Steel Hi flash
    }
    if (kind) this.kind = kind;
    this.active = !!kind;
    this.alpha = Math.max(0, Math.min(1, this.alpha + (kind ? dt * 5 : -dt * 3)));
    if (this.alpha === 0) { this.kind = null; this.fw.list.length = 0; }
    this.t += dt; this.flash = Math.max(0, this.flash - dt * 6);
    this.lost = show.lost;
    if (this.kind && this.w) {
      const { w, h } = this, k = h / 262, ground = h - 30 * k;
      this.spawnT -= dt;
      if (this.spawnT <= 0 && !show.lost) {
        if (this.kind === 'super') {            // §7.1 Super: one small Red P8 at a time
          this.spawnT = 1.5; this.fw.spawn({ x: w * (0.35 + Math.random() * 0.3), y: h * 0.26, R: 46 * k, col: C.red, rays: 22, rings: 1, life: 1.4, ground });
        } else if (this.kind === 'premium') {   // §7.1 Premium: three giant P8
          this.spawnT = 0.7; const n = (this.n = (this.n || 0) + 1) % 3;
          const o = [{ x: 0.5, y: 0.33, R: 118, col: C.gold, col2: C.amber, rays: 44, rings: 3, droop: 0.14, shake: 4 }, { x: 0.12, y: 0.3, R: 84, col: C.pink, col2: C.violet, rays: 30 }, { x: 0.88, y: 0.26, R: 88, col: C.cyan, col2: C.green, rays: 30 }][n];
          this.fw.spawn({ ...o, x: w * o.x, y: h * o.y, R: o.R * k, life: 2.2, ground });
        } else {                                // jackpot: sky full of rainbow-sequence blooms
          this.spawnT = 0.16; const i = (Math.random() * 8) | 0, big = Math.random() < 0.4;
          this.fw.spawn({ x: Math.random() * w, y: h * (0.08 + Math.random() * 0.5), R: (big ? 70 + Math.random() * 40 : 26 + Math.random() * 22) * k, col: RB[i], col2: RB[(i + 2) % 8], rays: big ? 40 : 18, rings: big ? 3 : 1, life: big ? 2 : 1.3, ground });
        }
      }
      this.fw.onBloom = (b) => { if (b.shake && this.onShake) this.onShake(b.shake); };
      this.fw.update(dt);
    }
  }

  draw(g, w, h, show, time) {
    this.w = w; this.h = h;
    if (this.alpha <= 0 || !this.kind) return;
    const k = h / 262, r = makeRng(this.kind === 'super' ? 8 : 42), phase = time / 2.4;   // §2.3 rainbow cycle 2.4s
    g.save(); g.globalAlpha = this.alpha;
    if (this.kind === 'super') this.drawSuper(g, w, h, k, r, show, time);
    else if (this.kind === 'premium') this.drawPremium(g, w, h, k, r, show, time, phase);
    else this.drawJackpot(g, w, h, k, r, show, time, phase);
    if (this.lost) {      // the letdown: lights go out
      g.fillStyle = rgba(C.ink, Math.min(0.72, show.t * 1.6)); g.fillRect(0, 0, w, h);
      neonText(g, 'ざんねん…', w / 2, h * 0.8, 22 * k, C.muted);
    }
    if (this.flash > 0) { g.fillStyle = rgba(C.steelHi, this.flash * 0.9); g.fillRect(0, 0, w, h); }
    g.restore();
  }

  drawSuper(g, w, h, k, r, show, time) {
    sky(g, w, h, r, 70, 0.5);
    this.fw.draw(g);
    const n = 12, lit = show.lanternsLit, newest = Math.min(n - 1, lit - 1), pulse = lit >= n ? 0.75 + 0.25 * show.taikoHit : 1;
    const pts = lanternString(g, -10, 10 * k, w + 10, 10 * k, 22 * k, n, 22 * k, (i) => (i < lit ? pulse : i === lit ? 0.4 : 0), (i) => (i % 2 ? C.red : C.vermilion));
    if (lit > 0 && lit <= n) { const p = pts[newest], f = (show.stageT % 0.15) / 0.15; burst(g, p.x, p.y, 22 * k * (1 + f * 0.4), C.amber, 1 - f); }   // P3 on ignition
    g.fillStyle = C.ink; g.fillRect(0, h - 20 * k, w, 20 * k);
    stallRow(g, w * 0.2, w * 0.8, h - 18 * k, 6, 48 * k, r, 0.8);
    drawReelSet(g, w / 2, h * 0.52, 62 * k, show.reels, REACH_COLOR.super, C.red, time);
    const hit = show.taikoHit;
    taiko(g, w * 0.1, h - 70 * k, 34 * k, 1, hit); taiko(g, w * 0.9, h - 70 * k, 34 * k, -1, hit);
    if (hit > 0.25) {
      g.save(); g.translate(w * 0.17, h - 134 * k); g.rotate(-0.2); neonText(g, 'ドン!', 0, 0, (16 + 6 * hit) * k, C.amber); g.restore();
      g.save(); g.translate(w * 0.83, h - 134 * k); g.rotate(0.2); neonText(g, 'ドドン!', 0, 0, (14 + 6 * hit) * k, C.pink); g.restore();
    }
    neonText(g, 'スーパーリーチ', w / 2, h * 0.52 + 58 * k, 18 * k, C.red);
  }

  drawPremium(g, w, h, k, r, show, time, phase) {
    sky(g, w, h, r, 60, 1);
    godRays(g, w / 2, h - 30 * k, w, time);
    this.fw.draw(g);
    lanternString(g, -6, 6 * k, w * 0.5, 2, 18 * k, 9, 15 * k, () => 1, (i) => RB[i % 8]);
    lanternString(g, w * 0.5, 2, w + 6, 6 * k, 18 * k, 9, 15 * k, () => 1, (i) => RB[(i + 4) % 8]);
    g.fillStyle = C.ink; g.fillRect(0, h - 16 * k, w, 16 * k);
    stallRow(g, 0, w * 0.27, h - 14 * k, 3, 58 * k, r, 1); stallRow(g, w * 0.73, w, h - 14 * k, 3, 58 * k, r, 1);
    const mx = w * (0.18 + ((show.stageT * 0.06) % 0.64)), bob = Math.abs(Math.sin(time * 7)) * 5 * k;
    mikoshi(g, mx, h - 12 * k, 60 * k, bob);        // the parade crosses the scene
    crowd(g, 0, w, h + 4 * k, 40, 11 * k, r);
    const rw = 56 * k * 1.4;
    drawReelSet(g, w / 2, h * 0.36, 56 * k, show.reels, rainbowGrad(g, w / 2 - rw * 2, w / 2 + rw * 2, phase), C.gold, time);
    neonText(g, 'プレミアムリーチ', w / 2, h * 0.36 + 54 * k, 19 * k, rainbowGrad(g, w / 2 - 120 * k, w / 2 + 120 * k, phase));
  }

  drawJackpot(g, w, h, k, r, show, time, phase) {
    sky(g, w, h, r, 80, 1.3);
    godRays(g, w / 2, h * 0.62, w, time * 1.5);
    this.fw.draw(g);
    g.fillStyle = C.ink; g.fillRect(0, h - 16 * k, w, 16 * k);
    stallRow(g, 0, w * 0.27, h - 14 * k, 3, 58 * k, r, 1); stallRow(g, w * 0.73, w, h - 14 * k, 3, 58 * k, r, 1);
    mikoshi(g, w * 0.5, h - 10 * k, 54 * k, Math.abs(Math.sin(time * 9)) * 6 * k);
    crowd(g, 0, w, h + 4 * k, 40, 11 * k, r);
    const rw = 52 * k * 1.4, pop = 1 + 0.06 * Math.sin(time * 10);
    drawReelSet(g, w / 2, h * 0.5, 52 * k, show.reels, rainbowGrad(g, w / 2 - rw * 2, w / 2 + rw * 2, phase), C.gold, time);
    // STYLE §6 in-scene headline variant
    const fy = h * 0.2, size = 46 * k * pop;
    g.save(); g.font = `italic 900 ${size}px ${FONT.disp}`;
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
    g.lineWidth = size * 0.27; g.strokeStyle = C.pink; g.shadowColor = C.pink; g.shadowBlur = 50; g.strokeText('大当たり', w / 2, fy + size * 0.05); g.shadowBlur = 0;
    g.lineWidth = size * 0.19; g.strokeStyle = C.ink; g.strokeText('大当たり', w / 2, fy);
    g.fillStyle = rainbowGrad(g, w / 2 - size * 2, w / 2 + size * 2, phase); g.fillText('大当たり', w / 2, fy);
    const hl = g.createLinearGradient(0, fy - size * 0.47, 0, fy + size * 0.07); hl.addColorStop(0, rgba(C.steelHi, 0.85)); hl.addColorStop(1, rgba(C.steelHi, 0));
    g.fillStyle = hl; g.fillText('大当たり', w / 2, fy); g.restore();
    neonText(g, 'FEVER START!', w / 2, h * 0.5 + 52 * k, 20 * k, C.gold, 'center', 'italic ');
  }
}
