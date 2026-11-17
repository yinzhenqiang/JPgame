// Drawing primitives. Every function cites the STYLE.md section it implements.
import { C, RB, FONT, rgba } from './style.js';
import { makeRng } from './rng.js';

// STYLE §3.1 — additive glow in the element's own color
export function glow(g, x, y, r, col, a = 1) {
  if (r <= 0 || a <= 0) return;
  const gr = g.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, rgba(col, a)); gr.addColorStop(1, rgba(col, 0));
  g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = gr;
  g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.restore();
}

// STYLE §7 sky: Ink → Night (45%) → Indigo (82%) → Dusk, stars in top 70%, warm horizon by tier
export function sky(g, w, h, r, stars = 60, warm = 0) {
  const s = g.createLinearGradient(0, 0, 0, h);
  s.addColorStop(0, C.ink); s.addColorStop(0.45, C.night); s.addColorStop(0.82, C.indigo); s.addColorStop(1, C.dusk);
  g.fillStyle = s; g.fillRect(0, 0, w, h);
  for (let i = 0; i < stars; i++) {
    g.fillStyle = rgba(C.steelHi, 0.25 + r() * 0.6);
    g.beginPath(); g.arc(r() * w, r() * h * 0.7, 0.5 + r() * 0.9, 0, 7); g.fill();
  }
  if (warm) { glow(g, w / 2, h, w * 0.6, C.pink, 0.22 * warm); glow(g, w / 2, h, w * 0.4, C.amber, 0.22 * warm); }
}

// STYLE §3.1 neon text: Ink stroke 22% of size, fill blur 50%, second fill 15%
export function neonText(g, t, x, y, size, col, align = 'center', italic = '') {
  g.save();
  g.font = `${italic}900 ${size}px ${FONT.disp}`; g.textAlign = align; g.textBaseline = 'middle'; g.lineJoin = 'round';
  g.lineWidth = size * 0.22; g.strokeStyle = C.ink; g.strokeText(t, x, y);
  g.shadowColor = typeof col === 'string' ? col : C.gold; g.shadowBlur = size * 0.5; g.fillStyle = col; g.fillText(t, x, y);
  g.shadowBlur = size * 0.15; g.fillText(t, x, y);
  g.restore();
}

export function label(g, t, x, y, col = C.muted, size = 11, align = 'center') {
  g.save(); g.font = `600 ${size}px ${FONT.mono}`; g.textAlign = align; g.fillStyle = col; g.fillText(t, x, y); g.restore();
}

// STYLE §1.6 + §2.3 — rainbow sequence as a sliding gradient (phase 0..1 = one 2.4s cycle)
export function rainbowGrad(g, x0, x1, phase = 0) {
  const w = x1 - x0, s = x0 - (phase % 1) * w;
  const lg = g.createLinearGradient(s, 0, s + 2 * w, 0);
  for (let i = 0; i <= 16; i++) lg.addColorStop(i / 16, RB[i % 8]);
  return lg;
}

// STYLE §7 lantern: ellipse, Ink outline + caps, 5 ribs; unlit = Dusk G0, lit = core → paper color, G3
export function lantern(g, x, y, s, lit = 1, col = C.vermilion) {
  const rw = s * 0.5, rh = s * 0.62;
  g.strokeStyle = rgba(C.steel, 0.5); g.lineWidth = 1; g.beginPath(); g.moveTo(x, y - rh - s * 0.3); g.lineTo(x, y - rh); g.stroke();
  if (lit > 0) { glow(g, x, y, s * 2.4, col, 0.38 * lit); glow(g, x, y, s * 1.2, C.amber, 0.4 * lit); }
  g.save(); g.beginPath(); g.ellipse(x, y, rw, rh, 0, 0, 7);
  if (lit > 0) {
    const gr = g.createRadialGradient(x, y, 0, x, y, rh);
    gr.addColorStop(0, lit > 0.6 ? C.steelHi : C.amber); gr.addColorStop(0.35, C.amber); gr.addColorStop(1, col);
    g.fillStyle = C.dusk; g.fill(); g.fillStyle = gr; g.globalAlpha = 0.35 + 0.65 * lit;
  } else g.fillStyle = C.dusk;
  g.fill(); g.globalAlpha = 1; g.lineWidth = Math.max(1.2, s * 0.08); g.strokeStyle = C.ink; g.stroke(); g.clip();
  g.strokeStyle = rgba(C.ink, 0.3); g.lineWidth = Math.max(0.6, s * 0.035);
  for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(x - rw, y + i * rh * 0.32); g.lineTo(x + rw, y + i * rh * 0.32); g.stroke(); }
  g.restore(); g.fillStyle = C.ink;
  g.fillRect(x - rw * 0.5, y - rh - s * 0.06, rw, s * 0.14); g.fillRect(x - rw * 0.5, y + rh - s * 0.08, rw, s * 0.14);
}

// STYLE §7 — lanterns hung on a sagging Steel wire. Returns lantern centres.
export function lanternString(g, x0, y0, x1, y1, sag, n, s, litFn, col) {
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2 + sag * 2;
  g.strokeStyle = rgba(C.steel, 0.45); g.lineWidth = 1.2; g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(cx, cy, x1, y1); g.stroke();
  const pts = [];
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n, u = 1 - t, x = u * u * x0 + 2 * u * t * cx + t * t * x1, y = u * u * y0 + 2 * u * t * cy + t * t * y1;
    lantern(g, x, y + s * 0.95, s, litFn ? litFn(i) : 1, typeof col === 'function' ? col(i) : col);
    pts.push({ x, y: y + s * 0.95 });
  }
  return pts;
}

// STYLE §7 stall: Ink silhouette, Amber → Vermilion opening, Ink noren + vendor, one neon roof-edge line
export function stall(g, x, base, w, h, acc, lit = 1) {
  const top = base - h, ry = base - h * 0.66, oy = ry + h * 0.06, oh = h * 0.3;
  if (lit > 0) glow(g, x + w / 2, base - h * 0.35, w * 0.95, C.amber, 0.3 * lit);
  g.fillStyle = C.ink; g.beginPath(); g.moveTo(x - w * 0.1, ry); g.lineTo(x + w * 0.08, top); g.lineTo(x + w * 0.92, top); g.lineTo(x + w * 1.1, ry); g.closePath(); g.fill();
  g.fillRect(x, ry, w, base - ry);
  const gr = g.createLinearGradient(0, oy, 0, oy + oh);
  gr.addColorStop(0, rgba(C.amber, 0.06 + 0.9 * lit)); gr.addColorStop(1, rgba(C.vermilion, 0.04 + 0.7 * lit));
  g.fillStyle = gr; g.fillRect(x + w * 0.07, oy, w * 0.86, oh);
  g.fillStyle = C.ink;
  for (let i = 0; i < 5; i++) { g.beginPath(); g.roundRect(x + w * 0.07 + i * w * 0.172 + 1, oy - 1, w * 0.172 - 2, oh * 0.36, [0, 0, 4, 4]); g.fill(); }
  g.beginPath(); g.arc(x + w * 0.5, oy + oh * 0.64, oh * 0.17, 0, 7); g.fill(); g.fillRect(x + w * 0.5 - oh * 0.26, oy + oh * 0.78, oh * 0.52, oh * 0.3);
  g.save(); g.strokeStyle = acc; g.shadowColor = acc; g.shadowBlur = 10; g.lineWidth = Math.max(1.5, w * 0.035); g.globalAlpha = 0.25 + 0.75 * lit;
  g.beginPath(); g.moveTo(x - w * 0.1, ry); g.lineTo(x + w * 1.1, ry); g.stroke(); g.restore();
}

export function stallRow(g, x0, x1, base, n, h, r, lit = 1) {
  const w = (x1 - x0) / n, acc = [C.pink, C.cyan, C.gold, C.green, C.violet];   // §7 roof-edge rotation
  for (let i = 0; i < n; i++) stall(g, x0 + i * w + w * 0.1, base, w * 0.8, h * (0.85 + r() * 0.3), acc[i % 5], lit);
}

// STYLE §7 silhouettes are always Ink
export function crowd(g, x0, x1, base, n, s, r) {
  g.fillStyle = C.ink;
  for (let i = 0; i < n; i++) {
    const x = x0 + (i + 0.5) / n * (x1 - x0) + (r() - 0.5) * (x1 - x0) / n, hh = s * (0.9 + r() * 0.6);
    g.beginPath(); g.arc(x, base - hh, s * 0.34, 0, 7); g.fill();
    g.beginPath(); g.roundRect(x - s * 0.45, base - hh + s * 0.26, s * 0.9, hh + 20, s * 0.3); g.fill();
  }
}

// STYLE §7 mikoshi with carriers: Ink, Amber + Gold backlight, thin Gold roof rim
export function mikoshi(g, x, base, s, bob = 0) {
  const y = base - s * 0.75 - bob;
  glow(g, x, y - s * 0.45, s * 1.5, C.amber, 0.5); glow(g, x, y - s * 0.5, s * 0.9, C.gold, 0.45);
  g.save(); g.translate(x, y); g.scale(s, s); g.fillStyle = C.ink;
  g.beginPath(); g.moveTo(-0.7, -0.68); g.quadraticCurveTo(-0.45, -0.52, -0.1, -0.92); g.lineTo(0.1, -0.92); g.quadraticCurveTo(0.45, -0.52, 0.7, -0.68); g.lineTo(0.58, -0.5); g.lineTo(-0.58, -0.5); g.closePath(); g.fill();
  g.fillRect(-0.32, -0.5, 0.64, 0.34); g.fillRect(-0.46, -0.18, 0.92, 0.09); g.fillRect(-1.25, -0.1, 2.5, 0.07);
  g.beginPath(); g.moveTo(0, -1.2); g.lineTo(0.16, -1.04); g.lineTo(0.05, -0.92); g.lineTo(-0.05, -0.92); g.lineTo(-0.2, -1.1); g.closePath(); g.fill();
  for (let i = 0; i < 8; i++) {
    const px = -1.1 + i * 0.314;
    g.beginPath(); g.arc(px, 0.13, 0.075, 0, 7); g.fill(); g.beginPath(); g.roundRect(px - 0.09, 0.2, 0.18, 0.34, 0.05); g.fill();
    g.fillRect(px - 0.085, 0.5, 0.07, 0.26 + bob / s); g.fillRect(px + 0.02, 0.5, 0.07, 0.26 + bob / s);
    g.lineWidth = 0.05; g.strokeStyle = C.ink; g.lineCap = 'round';
    g.beginPath(); g.moveTo(px - 0.07, 0.24); g.lineTo(px - 0.1, -0.05); g.moveTo(px + 0.07, 0.24); g.lineTo(px + 0.1, -0.05); g.stroke();
  }
  g.restore();
  g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = rgba(C.gold, 0.9); g.shadowColor = C.gold; g.shadowBlur = 8; g.lineWidth = 1.5;
  g.beginPath(); g.moveTo(x - s * 0.7, y - s * 0.68); g.quadraticCurveTo(x - s * 0.45, y - s * 0.52, x - s * 0.1, y - s * 0.92); g.lineTo(x + s * 0.1, y - s * 0.92); g.quadraticCurveTo(x + s * 0.45, y - s * 0.52, x + s * 0.7, y - s * 0.68); g.stroke();
  g.fillStyle = C.gold; [-0.2, 0, 0.2].forEach((d) => { g.beginPath(); g.arc(x + d * s, y - s * 0.33, s * 0.035, 0, 7); g.fill(); });
  g.restore();
}

// STYLE §7 taiko: Vermilion body, Steel Hi → Amber skin, Gold tacks, Ink mitsudomoe, Amber sticks, P7 shock arcs.
// hit: 1 = stick just struck, decays to 0.
export function taiko(g, x, y, r, flip = 1, hit = 0) {
  glow(g, x, y, r * 2.4, C.vermilion, 0.3 + 0.2 * hit);
  g.save(); g.lineCap = 'round'; g.strokeStyle = C.ink; g.lineWidth = r * 0.24;
  g.beginPath(); g.moveTo(x - r * 0.5, y + r * 0.6); g.lineTo(x - r * 0.95, y + r * 1.5); g.moveTo(x + r * 0.5, y + r * 0.6); g.lineTo(x + r * 0.95, y + r * 1.5); g.stroke();
  g.beginPath(); g.arc(x, y, r, 0, 7); g.fillStyle = C.vermilion; g.fill(); g.lineWidth = r * 0.1; g.stroke();
  const gr = g.createRadialGradient(x - r * 0.2, y - r * 0.25, 0, x, y, r * 0.8); gr.addColorStop(0, C.steelHi); gr.addColorStop(1, C.amber);
  g.beginPath(); g.arc(x, y, r * 0.76, 0, 7); g.fillStyle = gr; g.fill(); g.lineWidth = r * 0.07; g.stroke();
  g.fillStyle = C.gold; for (let i = 0; i < 14; i++) { const a = i / 14 * 6.283; g.beginPath(); g.arc(x + Math.cos(a) * r * 0.88, y + Math.sin(a) * r * 0.88, r * 0.05, 0, 7); g.fill(); }
  g.fillStyle = C.ink; for (let k = 0; k < 3; k++) { const a = k * 2.094 - 1.57; g.beginPath(); g.arc(x + Math.cos(a) * r * 0.27, y + Math.sin(a) * r * 0.27, r * 0.17, 0, 7); g.fill(); }
  [[-1, 0.25, 1], [1, -0.2, 0.55]].forEach(([d, o, lead]) => {
    const up = (1 - Math.min(1, hit * lead * 1.4)) * r * 0.9;
    const bx = x + d * flip * r * 1.5, by = y - r * 1.45 - up * 0.3, ex = x + d * flip * r * 0.3, ey = y - r * 0.35 + o * r * 0.3 - up;
    g.strokeStyle = C.ink; g.lineWidth = r * 0.22; g.beginPath(); g.moveTo(bx, by); g.lineTo(ex, ey); g.stroke();
    g.strokeStyle = C.amber; g.lineWidth = r * 0.11; g.beginPath(); g.moveTo(bx, by); g.lineTo(ex, ey); g.stroke();
  });
  if (hit > 0.02) {
    g.globalCompositeOperation = 'lighter';
    for (let k = 1; k <= 3; k++) {
      const c = k % 2 ? C.amber : C.pink;
      g.strokeStyle = rgba(c, 0.85 * hit / k); g.shadowColor = c; g.shadowBlur = 10; g.lineWidth = 3.2 - k * 0.6;
      g.beginPath(); g.arc(x, y, r * (1.2 + k * 0.3 + (1 - hit) * 0.5), -2.45, -0.7); g.stroke();
    }
  }
  g.restore();
}

// STYLE §7 torii: the one non-Ink silhouette — solid Vermilion, G3
export function torii(g, x, base, s) {
  g.save(); g.fillStyle = C.vermilion; g.shadowColor = C.vermilion; g.shadowBlur = 16;
  g.fillRect(x - s * 0.36, base - s * 0.8, s * 0.09, s * 0.8); g.fillRect(x + s * 0.27, base - s * 0.8, s * 0.09, s * 0.8); g.fillRect(x - s * 0.46, base - s * 0.66, s * 0.92, s * 0.07);
  g.beginPath(); g.moveTo(x - s * 0.62, base - s * 0.98); g.quadraticCurveTo(x, base - s * 0.88, x + s * 0.62, base - s * 0.98); g.lineTo(x + s * 0.58, base - s * 0.84); g.quadraticCurveTo(x, base - s * 0.77, x - s * 0.58, base - s * 0.84); g.closePath(); g.fill();
  g.restore();
}

// STYLE §7 yagura: Ink tower, red/white drape, Amber-lit deck
export function yagura(g, x, base, s) {
  const tw = s * 0.34; glow(g, x, base - s * 0.65, s * 0.8, C.amber, 0.35);
  g.fillStyle = C.ink; g.beginPath(); g.moveTo(x - tw * 0.8, base); g.lineTo(x - tw * 0.52, base - s * 0.55); g.lineTo(x + tw * 0.52, base - s * 0.55); g.lineTo(x + tw * 0.8, base); g.fill();
  for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? C.steelHi : C.red; g.fillRect(x - tw * 0.7 + i * tw * 0.175, base - s * 0.56, tw * 0.176, s * 0.11); }
  g.fillStyle = rgba(C.amber, 0.75); g.fillRect(x - tw * 0.5, base - s * 0.83, tw, s * 0.23);
  g.fillStyle = C.ink; g.fillRect(x - tw * 0.78, base - s * 0.61, tw * 1.56, s * 0.055);
  g.fillRect(x - tw * 0.56, base - s * 0.84, tw * 0.1, s * 0.24); g.fillRect(x + tw * 0.46, base - s * 0.84, tw * 0.1, s * 0.24);
  g.beginPath(); g.arc(x, base - s * 0.7, s * 0.045, 0, 7); g.fill(); g.fillRect(x - s * 0.05, base - s * 0.67, s * 0.1, s * 0.07);
  g.beginPath(); g.moveTo(x - tw * 0.98, base - s * 0.82); g.quadraticCurveTo(x - tw * 0.4, base - s * 0.86, x, base - s); g.quadraticCurveTo(x + tw * 0.4, base - s * 0.86, x + tw * 0.98, base - s * 0.82); g.closePath(); g.fill();
  return { x, y: base - s * 0.98 };
}

// STYLE §3.2 P3 impact burst: 10 short radial strokes, alternating lengths
export function burst(g, x, y, r0, col, a = 1, n = 10) {
  g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = rgba(col, a); g.shadowColor = col; g.shadowBlur = 8; g.lineWidth = Math.max(1.5, r0 * 0.14); g.lineCap = 'round';
  g.beginPath();
  for (let i = 0; i < n; i++) {
    const an = i / n * 6.283 + 0.2, r1 = r0 * (1.45 + (i % 2) * 0.5);
    g.moveTo(x + Math.cos(an) * r0, y + Math.sin(an) * r0); g.lineTo(x + Math.cos(an) * r1, y + Math.sin(an) * r1);
  }
  g.stroke(); g.restore();
}

// STYLE §3.2 P10 god rays: 16 alternating Gold / Pink wedges at 7% alpha from the horizon
export function godRays(g, x, y, len, rot = 0) {
  g.save(); g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 16; i++) {
    const a = -Math.PI + i / 15 * Math.PI + Math.sin(rot + i) * 0.03, a2 = a + 0.09;
    g.fillStyle = rgba(i % 2 ? C.gold : C.pink, 0.07);
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len); g.lineTo(x + Math.cos(a2) * len, y + Math.sin(a2) * len); g.fill();
  }
  g.restore();
}

/* ---------- STYLE §3.2 P8 / P9 / P11 fireworks (animated) ---------- */
export class Fireworks {
  constructor() { this.list = []; this.onBloom = null; }
  // o: {x, y, R, col, col2, rays, rings, droop, life, rise, ground}
  spawn(o) {
    this.list.push({ rays: 34, rings: 2, droop: 0.12, life: 1.8, rise: 0.5, col2: o.col, seed: (Math.random() * 1e9) | 0, ...o, age: -(o.rise ?? 0.5), bloomed: false });
  }
  update(dt) {
    for (const b of this.list) {
      b.age += dt;
      if (!b.bloomed && b.age >= 0) { b.bloomed = true; if (this.onBloom) this.onBloom(b); }
    }
    this.list = this.list.filter((b) => b.age < b.life);
  }
  draw(g) {
    g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
    for (const b of this.list) {
      if (b.age < 0) {            // P11 launch trail: thin Amber line fading upward
        const u = 1 + b.age / b.rise, gy = b.ground ?? b.y + 400, y = gy + (b.y - gy) * (1 - (1 - u) * (1 - u));
        const lg = g.createLinearGradient(0, y + 90, 0, y); lg.addColorStop(0, rgba(C.amber, 0)); lg.addColorStop(1, rgba(C.amber, 0.7));
        g.strokeStyle = lg; g.lineWidth = 1.6; g.beginPath(); g.moveTo(b.x, Math.min(gy, y + 90)); g.lineTo(b.x, y); g.stroke();
        continue;
      }
      const u = b.age / b.life, ex = 1 - Math.pow(1 - Math.min(1, u * 1.6), 3), fade = u < 0.55 ? 1 : Math.max(0, 1 - (u - 0.55) / 0.45);
      const r = makeRng(b.seed);
      glow(g, b.x, b.y, b.R * 1.35 * ex, b.col, 0.2 * fade);
      for (let k = 0; k < b.rings; k++) {
        const RR = b.R * (1 - k * 0.4) * ex, c = k % 2 ? b.col2 : b.col, n = Math.round(b.rays * (1 - k * 0.3)), off = r() * 6;
        g.strokeStyle = rgba(c, 0.85 * fade); g.lineWidth = Math.max(1, b.R * 0.016);
        g.beginPath();
        const tips = [];
        for (let i = 0; i < n; i++) {
          const a = i / n * Math.PI * 2 + off + (r() - 0.5) * 0.1, len = RR * (0.84 + r() * 0.2), dr = len * b.droop * (0.4 + u * 1.6);
          const x0 = b.x + Math.cos(a) * len * (0.25 + 0.5 * u), y0 = b.y + Math.sin(a) * len * (0.25 + 0.5 * u) + dr * 0.3;
          const x1 = b.x + Math.cos(a) * len, y1 = b.y + Math.sin(a) * len + dr;
          g.moveTo(x0, y0); g.quadraticCurveTo((x0 + x1) / 2, (y0 + y1) / 2 - dr * 0.3, x1, y1);
          tips.push(x1, y1);
        }
        g.stroke();
        g.fillStyle = rgba(C.steelHi, 0.95 * fade);
        const ts = Math.min(3.2, Math.max(1.3, b.R * 0.012));     // tip glow dot (round, small at any bloom size)
        g.beginPath();
        for (let i = 0; i < tips.length; i += 2) { g.moveTo(tips[i] + ts, tips[i + 1]); g.arc(tips[i], tips[i + 1], ts, 0, 7); }
        g.fill();
      }
      glow(g, b.x, b.y, b.R * 0.25 * (1 - u), C.steelHi, 0.55 * fade);
    }
    g.restore();
  }
}

/* ---------- STYLE §4.5 seven-segment digits ---------- */
const SEG = { 0: 'abcdef', 1: 'bc', 2: 'abdeg', 3: 'abcdg', 4: 'bcfg', 5: 'acdfg', 6: 'acdefg', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg' };
// 8% italic skew, thickness 13% of height; unlit segments Dusk at `ghost` alpha
export function seg7(g, x, y, h, d, col, a = 1, ghost = 0, shadow = true) {
  const w = h * 0.56, t = h * 0.13, gp = t * 0.14;
  const poly = (p) => { g.moveTo(p[0][0], p[0][1]); for (let i = 1; i < p.length; i++) g.lineTo(p[i][0], p[i][1]); g.closePath(); };
  const H = (cx, cy) => { const Ln = w - t - gp * 2; poly([[cx - Ln / 2, cy], [cx - Ln / 2 + t / 2, cy - t / 2], [cx + Ln / 2 - t / 2, cy - t / 2], [cx + Ln / 2, cy], [cx + Ln / 2 - t / 2, cy + t / 2], [cx - Ln / 2 + t / 2, cy + t / 2]]); };
  const V = (cx, cy) => { const Ln = h / 2 - t / 2 - gp * 2; poly([[cx, cy - Ln / 2], [cx + t / 2, cy - Ln / 2 + t / 2], [cx + t / 2, cy + Ln / 2 - t / 2], [cx, cy + Ln / 2], [cx - t / 2, cy + Ln / 2 - t / 2], [cx - t / 2, cy - Ln / 2 + t / 2]]); };
  const P = { a: () => H(w / 2, t / 2), g: () => H(w / 2, h / 2), d: () => H(w / 2, h - t / 2), f: () => V(t / 2, h / 4 + t / 4), b: () => V(w - t / 2, h / 4 + t / 4), e: () => V(t / 2, h * 0.75 - t / 4), c: () => V(w - t / 2, h * 0.75 - t / 4) };
  g.save(); g.translate(x, y); g.transform(1, 0, -0.08, 1, h * 0.04, 0);
  if (ghost) { g.fillStyle = rgba(C.dusk, ghost); g.beginPath(); for (const k in P) if (!SEG[d].includes(k)) P[k](); g.fill(); }
  g.beginPath(); for (const k of SEG[d]) P[k]();
  if (shadow) { g.shadowColor = col; g.shadowBlur = h * 0.22; }
  g.fillStyle = rgba(col, a); g.fill();
  if (a > 0.9) { g.shadowBlur = 0; g.globalCompositeOperation = 'lighter'; g.fillStyle = rgba(C.steelHi, 0.28); g.fill(); }
  g.restore();
}

const streakRng = makeRng(99), STREAKS = Array.from({ length: 16 }, () => [streakRng(), streakRng(), 0.2 + streakRng() * 0.4]);

// STYLE §4.5 reel drum. reel: {pos (float digit index), blur (fast spin), stopped}
export function drawReel(g, x, y, w, h, reel, frame, time = 0) {
  const rad = h * 0.1, dh = h * 0.66, dw = dh * 0.56, dx = x + w / 2 - dw / 2, dy = y + h / 2 - dh / 2, pitch = dh * 1.12;
  const mod = (n) => ((n % 10) + 10) % 10;
  g.save(); g.beginPath(); g.roundRect(x, y, w, h, rad);
  const dg = g.createLinearGradient(0, y, 0, y + h); dg.addColorStop(0, C.ink); dg.addColorStop(0.5, C.indigo); dg.addColorStop(1, C.ink);
  g.fillStyle = dg; g.fill(); g.clip();
  if (reel.blur) {           // spinning: Cyan ghosts stacked vertically + P6 speed streaks
    glow(g, x + w / 2, y + h / 2, w * 0.7, C.cyan, 0.16);
    const p = reel.pos * 2.5, f = p - Math.floor(p), base = Math.floor(p);
    for (let k = -3; k <= 4; k++) seg7(g, dx, dy + (k - f) * dh * 0.4, dh, mod(base + k), C.cyan, 0.13, 0, false);
    g.globalCompositeOperation = 'lighter';
    for (const s of STREAKS) {
      const ly = y + ((s[1] + time * 2.2) % 1) * (h + 60) - 60, ll = h * s[2];
      const lg = g.createLinearGradient(0, ly, 0, ly + ll); lg.addColorStop(0, rgba(C.cyan, 0)); lg.addColorStop(0.5, rgba(C.steelHi, 0.35)); lg.addColorStop(1, rgba(C.cyan, 0));
      g.fillStyle = lg; g.fillRect(x + 6 + s[0] * (w - 12), ly, Math.max(1, w * 0.012), ll);
    }
    g.globalCompositeOperation = 'source-over';
  } else {
    const col = reel.stopped ? C.gold : C.cyan, base = Math.round(reel.pos);
    if (reel.stopped) glow(g, x + w / 2, y + h / 2, w * 0.7, C.gold, 0.22);    // stopped digit: Gold, G4
    for (let k = -1; k <= 1; k++) {
      const off = base + k - reel.pos, centre = 1 - Math.min(1, Math.abs(off));
      seg7(g, dx, dy + off * pitch, dh, mod(base + k), col, reel.stopped ? (k === 0 ? 1 : 0.22) : 0.3 + 0.7 * centre, k === 0 && reel.stopped ? 0.45 : 0, centre > 0.3);
    }
  }
  const sh = g.createLinearGradient(0, y, 0, y + h);
  sh.addColorStop(0, rgba(C.ink, 0.85)); sh.addColorStop(0.28, rgba(C.ink, 0)); sh.addColorStop(0.72, rgba(C.ink, 0)); sh.addColorStop(1, rgba(C.ink, 0.85));
  g.fillStyle = sh; g.fillRect(x, y, w, h); g.fillStyle = rgba(C.steelHi, 0.06); g.fillRect(x, y, w, h * 0.2);
  g.restore();
  // frame: Ink + neon (Gold stopped, Cyan spinning) unless a tier frame is given
  const fc = frame || (reel.stopped ? C.gold : C.cyan);
  g.save(); g.beginPath(); g.roundRect(x, y, w, h, rad);
  g.lineWidth = Math.max(3, h * 0.04); g.strokeStyle = C.ink; g.stroke();
  g.lineWidth = Math.max(1.5, h * 0.018); g.strokeStyle = fc; g.shadowColor = typeof fc === 'string' ? fc : C.gold; g.shadowBlur = h * 0.08; g.stroke();
  g.restore();
}

// Three drums in a cabinet (Ink, neon frame) with a dashed Pink payline — STYLE §4.5
export function drawReelSet(g, cx, cy, h, reels, frame, glowCol, time) {
  const bw = h * 0.78, gap = h * 0.13, tot = bw * 3 + gap * 2;
  g.save(); g.fillStyle = rgba(C.ink, 0.9); g.beginPath(); g.roundRect(cx - tot / 2 - gap, cy - h / 2 - gap, tot + gap * 2, h + gap * 2, h * 0.16); g.fill();
  g.lineWidth = Math.max(2.5, h * 0.028); g.strokeStyle = frame; g.shadowColor = glowCol; g.shadowBlur = h * 0.12; g.stroke(); g.restore();
  for (let i = 0; i < 3; i++) drawReel(g, cx - tot / 2 + i * (bw + gap), cy - h / 2, bw, h, reels[i], null, time + i * 0.37);
  g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = rgba(C.pink, 0.7); g.shadowColor = C.pink; g.shadowBlur = 8; g.lineWidth = Math.max(1, h * 0.01); g.setLineDash([h * 0.05, h * 0.04]);
  g.beginPath(); g.moveTo(cx - tot / 2 - gap * 0.5, cy); g.lineTo(cx + tot / 2 + gap * 0.5, cy); g.stroke(); g.restore();
}

/* ---------- STYLE §4.1 ball ---------- */
function paintBall(g, x, y, r, ca, cb) {
  glow(g, x - r * 0.5, y + r * 0.4, r * 1.7, ca, 0.2); glow(g, x + r * 0.5, y - r * 0.1, r * 1.7, cb, 0.18);
  let gr = g.createRadialGradient(x - r * 0.35, y - r * 0.42, r * 0.04, x, y, r);
  gr.addColorStop(0, C.steelHi); gr.addColorStop(0.22, C.steel); gr.addColorStop(0.68, C.steelLo); gr.addColorStop(1, C.ink);
  g.beginPath(); g.arc(x, y, r, 0, 7); g.fillStyle = gr; g.fill();
  g.save(); g.clip(); g.globalCompositeOperation = 'lighter';
  gr = g.createLinearGradient(0, y, 0, y + r * 0.8); gr.addColorStop(0, rgba(C.violet, 0)); gr.addColorStop(0.45, rgba(C.violet, 0.38)); gr.addColorStop(1, rgba(C.dusk, 0));
  g.fillStyle = gr; g.fillRect(x - r, y, r * 2, r);
  glow(g, x + r * 0.28, y + r * 0.38, r * 0.26, C.vermilion, 0.75); glow(g, x - r * 0.2, y + r * 0.52, r * 0.18, C.amber, 0.65);
  g.lineCap = 'round'; g.lineWidth = r * 0.09; g.shadowBlur = r * 0.45;
  g.strokeStyle = ca; g.shadowColor = ca; g.beginPath(); g.arc(x, y, r * 0.95, Math.PI * 0.52, Math.PI * 1.22); g.stroke(); g.stroke();
  g.strokeStyle = cb; g.shadowColor = cb; g.beginPath(); g.arc(x, y, r * 0.95, -Math.PI * 0.32, Math.PI * 0.3); g.stroke(); g.stroke();
  g.restore();
  g.fillStyle = rgba(C.steelHi, 0.96); g.beginPath(); g.ellipse(x - r * 0.38, y - r * 0.46, r * 0.2, r * 0.11, -0.65, 0, 7); g.fill();
  g.beginPath(); g.arc(x - r * 0.1, y - r * 0.64, r * 0.045, 0, 7); g.fill();
  g.lineWidth = Math.max(1.5, r * 0.045); g.strokeStyle = C.ink; g.beginPath(); g.arc(x, y, r, 0, 7); g.stroke();
}

const sprites = new Map();
// Cached ball sprite (rim colors may be swapped for a tier color — STYLE §3.1 ball rim)
export function ballSprite(r, ca = C.cyan, cb = C.pink, px = 2) {
  const key = r + ca + cb + px;
  let s = sprites.get(key);
  if (!s) {
    const size = Math.ceil(r * 5.6);
    s = document.createElement('canvas'); s.width = s.height = size * px;
    const g = s.getContext('2d'); g.scale(px, px); paintBall(g, size / 2, size / 2, r, ca, cb);
    s.half = size / 2; sprites.set(key, s);
  }
  return s;
}
export function drawBall(g, x, y, r, ca, cb, alpha = 1, scale = 1) {
  const s = ballSprite(r, ca, cb), h = s.half * scale;
  if (alpha !== 1) { g.save(); g.globalAlpha = alpha; g.drawImage(s, x - h, y - h, h * 2, h * 2); g.restore(); }
  else g.drawImage(s, x - h, y - h, h * 2, h * 2);
}

// STYLE §4.2 nail: brass head Steel Hi → Gold → Amber, 1.5px Ink outline, G1 Amber glow, Ink shaft
export function nail(g, x, y, rr = 5) {
  g.save(); g.strokeStyle = rgba(C.ink, 0.75); g.lineWidth = rr * 0.9; g.lineCap = 'round'; g.beginPath(); g.moveTo(x, y); g.lineTo(x + rr * 0.9, y + rr * 2.3); g.stroke();
  glow(g, x, y, rr * 3.2, C.amber, 0.3);
  const gr = g.createRadialGradient(x - rr * 0.35, y - rr * 0.35, 0, x, y, rr); gr.addColorStop(0, C.steelHi); gr.addColorStop(0.45, C.gold); gr.addColorStop(1, C.amber);
  g.beginPath(); g.arc(x, y, rr, 0, 7); g.fillStyle = gr; g.fill(); g.lineWidth = 1.5; g.strokeStyle = C.ink; g.stroke(); g.restore();
}
