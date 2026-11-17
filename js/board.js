// Playfield renderer: static layer (rails, nails, housings) + dynamic layer (balls, pocket, LCD, FX).
import { C, RB, REACH_COLOR, FONT, rgba } from './style.js';
import { L } from './layout.js';
import { makeRng } from './rng.js';
import { glow, neonText, label, nail, drawBall, burst, drawReelSet, rainbowGrad } from './draw.js';

export class BoardView {
  constructor(canvas, world) {
    this.c = canvas; this.g = canvas.getContext('2d'); this.world = world;
    this.hits = []; this.px = 1; this.static = null;
  }

  resize(cssW, dpr) {
    this.px = (cssW / L.W) * dpr;
    this.c.width = Math.round(L.W * this.px); this.c.height = Math.round(L.H * this.px);
    this.c.style.width = cssW + 'px'; this.c.style.height = (cssW * L.H / L.W) + 'px';
    this.static = null;
  }

  addHit(x, y, imp) { if (this.hits.length < 40) this.hits.push({ x, y, t: 0, s: Math.min(1, imp / 600) }); }

  fieldPath(g) {
    g.beginPath(); g.moveTo(L.wallL, L.H); g.lineTo(L.wallL, L.archY); g.arc(L.cx, L.archY, L.archR, Math.PI, 0); g.lineTo(L.wallR, L.H);
  }

  // Start-pocket style cup (STYLE §4.3); side pockets reuse it in Cyan (STYLE §8.2)
  cup(g, x, y, half, col, fillGlow) {
    g.save(); if (fillGlow) glow(g, x, y + 30, half * 3, C.gold, 0.35);
    const w = half + 3;
    g.beginPath(); g.moveTo(x - w, y + 2); g.lineTo(x - w, y + 44); g.quadraticCurveTo(x - w, y + 58, x - w + 14, y + 58); g.lineTo(x + w - 14, y + 58); g.quadraticCurveTo(x + w, y + 58, x + w, y + 44); g.lineTo(x + w, y + 2);
    g.fillStyle = rgba(C.ink, 0.85); g.fill(); g.lineWidth = 8; g.strokeStyle = C.ink; g.stroke();
    g.lineWidth = 3.5; g.strokeStyle = col; g.shadowColor = col; g.shadowBlur = 14; g.stroke(); g.restore();
  }

  buildStatic() {
    const s = document.createElement('canvas'); s.width = this.c.width; s.height = this.c.height;
    const g = s.getContext('2d'); g.scale(this.px, this.px);
    g.fillStyle = C.ink; g.fillRect(0, 0, L.W, L.H);
    // board backdrop: Night → Indigo with a faint 祭 watermark (as approved in the style test, §4)
    g.save(); this.fieldPath(g); g.closePath();
    const bg = g.createLinearGradient(0, 0, 0, L.H); bg.addColorStop(0, C.night); bg.addColorStop(1, C.indigo); g.fillStyle = bg; g.fill(); g.clip();
    g.font = '900 430px "Yu Gothic UI","Meiryo",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = rgba(C.dusk, 0.28); g.fillText('祭', L.cx, 600);
    g.fillStyle = C.ink; g.fillRect(0, L.H - 18, L.W, 18);
    g.restore();
    label(g, 'OUT  アウト', L.cx, L.H - 5, C.muted, 10);
    // rails: Steel Lo body + thin Cyan neon (§1.3 cyan = rails)
    const rail = () => { this.fieldPath(g); g.moveTo(L.lane.wallX, L.H); g.lineTo(L.lane.wallX, L.lane.top); };
    g.save(); g.lineCap = 'round'; g.lineWidth = 10; g.strokeStyle = C.steelLo; rail(); g.stroke();
    g.lineWidth = 2; g.strokeStyle = C.cyan; g.shadowColor = C.cyan; g.shadowBlur = 10; rail(); g.stroke(); g.restore();
    // LCD housing: Ink cabinet, 5px Pink neon (§4.5)
    const { lcd, roof } = L;
    g.save(); g.beginPath(); g.moveTo(roof[0][0], roof[0][1]); g.lineTo(roof[1][0], roof[1][1]); g.lineTo(roof[2][0], roof[2][1]);
    g.lineTo(lcd.x + lcd.w + 8, roof[2][1]); g.lineTo(lcd.x + lcd.w + 8, lcd.y + lcd.h + 6); g.lineTo(lcd.x - 8, lcd.y + lcd.h + 6); g.lineTo(lcd.x - 8, roof[0][1]); g.closePath();
    g.fillStyle = C.ink; g.fill(); g.lineJoin = 'round'; g.lineWidth = 5; g.strokeStyle = C.pink; g.shadowColor = C.pink; g.shadowBlur = 22; g.stroke(); g.restore();
    neonText(g, '祭', L.cx, roof[1][1] + 22, 20, C.gold);
    // one-way flap above the launch lane: dashed Cyan (STYLE §8.7)
    g.save(); g.lineCap = 'round'; g.lineWidth = 3; g.setLineDash([2, 9]); g.strokeStyle = C.cyan; g.shadowColor = C.cyan; g.shadowBlur = 8;
    g.beginPath(); g.moveTo(L.lane.wallX, L.lane.valveTop); g.lineTo(L.lane.wallX, L.lane.top); g.stroke(); g.restore();
    // rubber stopper: Pink neon bar (STYLE §8.7)
    for (const sg of this.world.segs) if (sg.kind === 'rubber') {
      g.save(); g.lineCap = 'round'; g.lineWidth = 10; g.strokeStyle = C.ink; g.beginPath(); g.moveTo(sg.x1, sg.y1); g.lineTo(sg.x2, sg.y2); g.stroke();
      g.lineWidth = 5; g.strokeStyle = C.pink; g.shadowColor = C.pink; g.shadowBlur = 14; g.stroke(); g.restore();
    }
    for (const sp of L.side) { this.cup(g, sp.x, sp.y, sp.half, C.cyan, false); neonText(g, '+5', sp.x, sp.y + 76, 12, C.cyan); }
    for (const n of this.world.nails) nail(g, n.x, n.y, n.r);
    this.static = s;
  }

  // s: { show, fever, near, power, charging, time, dt, phase }
  draw(s) {
    const g = this.g, { lcd, pocket } = L, half = this.world.pocketHalf;
    if (!this.static) this.buildStatic();
    g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(this.static, 0, 0);
    g.setTransform(this.px, 0, 0, this.px, 0, 0);

    this.drawLcd(g, s);

    // launcher charge: Cyan → Pink (ball rim colors, not rarity — STYLE §8.4)
    if (s.charging || s.power > 0) {
      const hgt = 40 + s.power * 300, y0 = L.H - 20;
      const lg = g.createLinearGradient(0, y0, 0, y0 - hgt); lg.addColorStop(0, rgba(C.cyan, 0.85)); lg.addColorStop(1, rgba(C.pink, 0.85));
      g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = lg; g.shadowColor = C.cyan; g.shadowBlur = 14;
      g.beginPath(); g.roundRect(L.lane.x - 7, y0 - hgt, 14, hgt, 7); g.fill(); g.restore();
    }

    // start pocket + gate nails (open wider in fever)
    this.cup(g, pocket.x, pocket.y, half, C.pink, true);
    if (s.fever) burst(g, pocket.x, pocket.y + 26, half * 0.9, C.gold, 0.35 + 0.25 * Math.sin(s.time * 8), 12);
    neonText(g, 'START', pocket.x, pocket.y + 76, 13, C.gold);
    for (const gt of this.world.gates) nail(g, gt.x, gt.y, gt.r);

    // P3 impact bursts on nail hits
    for (const h of this.hits) { h.t += s.dt; burst(g, h.x, h.y, 7 + h.t * 40, C.gold, (1 - h.t / 0.16) * (0.4 + 0.6 * h.s), 6); }
    this.hits = this.hits.filter((h) => h.t < 0.16);

    // near-miss spotlight goes under the balls so the frozen ball stays bright (§4.4)
    const nm = s.near;
    if (nm) {
      const a = Math.min(1, nm.t * 6) * (nm.res ? Math.max(0, 1 - nm.resT / 0.7) : 1);
      const vg = g.createRadialGradient(nm.x, nm.y, 70, nm.x, nm.y, 460); vg.addColorStop(0, rgba(C.ink, 0)); vg.addColorStop(1, rgba(C.ink, 0.72 * a));
      g.fillStyle = vg; g.fillRect(0, 0, L.W, L.H);
    }

    // balls with P5 trail: 5 ghost copies, shrinking and fading
    for (const b of this.world.balls) {
      const tr = b.trail, n = tr.length / 2;
      for (let i = 0; i < n - 1; i++) drawBall(g, tr[i * 2], tr[i * 2 + 1], L.r, C.cyan, C.pink, 0.05 + 0.05 * i, 0.55 + 0.09 * i);
      if (nm && nm.ball === b) drawBall(g, b.x, b.y, L.r, C.gold, C.pink); else drawBall(g, b.x, b.y, L.r);
    }

    if (nm) this.drawNear(g, nm);
  }

  drawNear(g, nm) {
    const a = nm.res ? Math.max(0, 1 - nm.resT / 0.7) : 1;
    if (a <= 0) return;
    g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = a;
    glow(g, nm.x, nm.y, 90, C.gold, 0.4);
    [26, 40, 58].forEach((rr, i) => {          // P4 freeze rings (middle one dashed)
      g.strokeStyle = rgba(C.steelHi, 0.55 - 0.15 * i); g.lineWidth = 1.6; g.setLineDash(i === 1 ? [4, 6] : []);
      g.beginPath(); g.arc(nm.x, nm.y, rr + nm.t * 14, 0, 7); g.stroke();
    });
    g.restore();
    burst(g, nm.x, nm.y, 19, C.gold, a);
    if (!nm.res) neonText(g, '!?', nm.x + 30, nm.y - 34, 30, C.gold, 'center', 'italic ');
    else if (nm.res === 'in') neonText(g, 'IN!', nm.x, nm.y - 44 - nm.resT * 30, 26, C.gold, 'center', 'italic ');
    else neonText(g, 'OUT…', nm.x, nm.y - 44, 22, C.red, 'center', 'italic ');
  }

  drawLcd(g, s) {
    const { lcd } = L, show = s.show, cx = lcd.x + lcd.w / 2, cy = lcd.y + lcd.h * 0.46;
    g.save(); g.beginPath(); g.roundRect(lcd.x, lcd.y, lcd.w, lcd.h, 14); g.clip();
    const bg = g.createLinearGradient(0, lcd.y, 0, lcd.y + lcd.h);
    bg.addColorStop(0, C.ink); bg.addColorStop(0.45, C.night); bg.addColorStop(0.82, C.indigo); bg.addColorStop(1, C.dusk);
    g.fillStyle = bg; g.fillRect(lcd.x, lcd.y, lcd.w, lcd.h);
    const r = makeRng(5);
    for (let i = 0; i < 26; i++) { g.fillStyle = rgba(C.steelHi, 0.2 + r() * 0.5); g.fillRect(lcd.x + r() * lcd.w, lcd.y + r() * lcd.h * 0.7, 1.2, 1.2); }
    if (s.fever) for (let i = 0; i < 4; i++) glow(g, lcd.x + lcd.w * (0.15 + 0.23 * i), lcd.y + 30 + 14 * Math.sin(s.time * 3 + i * 2), 60, RB[(i * 2 + Math.floor(s.time * 2)) % 8], 0.3);

    const reaching = show.phase === 'reach';
    let frame = C.pink, gl = C.pink;
    if (reaching) { const col = show.cut ? REACH_COLOR[show.tier] : REACH_COLOR.normal; frame = gl = col; }
    if (show.phase === 'jackpot' || (reaching && show.cut && show.tier === 'premium')) { frame = rainbowGrad(g, lcd.x, lcd.x + lcd.w, s.time / 2.4); gl = C.gold; }
    if (reaching && !show.cut) {      // Normal Reach: P2 pulse rings + a few P1 sparks, Blue (§7.1)
      g.save(); g.globalCompositeOperation = 'lighter';
      [0, 0.5].forEach((o) => {
        const u = (show.t * 0.9 + o) % 1; g.strokeStyle = rgba(C.blue, 0.75 * (1 - u)); g.shadowColor = C.blue; g.shadowBlur = 12; g.lineWidth = 2.5;
        g.beginPath(); g.ellipse(cx, cy, 120 + u * 60, 52 + u * 30, 0, 0, 7); g.stroke();
      });
      g.restore();
      const sr = makeRng(Math.floor(show.t * 6) + 3);
      for (let i = 0; i < 6; i++) glow(g, lcd.x + sr() * lcd.w, lcd.y + sr() * lcd.h, 3 + sr() * 3, C.blue, 0.9);
    }
    drawReelSet(g, cx, cy, 96, show.reels, frame, gl, s.time);
    const ty = lcd.y + lcd.h - 22;
    if (reaching && !show.cut) neonText(g, 'リーチ', cx, ty, 17, C.blue);
    else if (show.phase === 'jackpot') neonText(g, '大当たり', cx, ty, 18, C.gold);
    else if (s.fever) neonText(g, `フィーバー 残り${s.feverLeft}回`, cx, ty, 14, C.gold);
    else { g.font = `600 11px ${FONT.mono}`; g.textAlign = 'center'; g.fillStyle = C.muted; g.fillText(`1/${s.rateDenom}`, cx, ty + 4); }
    g.restore();
  }
}
