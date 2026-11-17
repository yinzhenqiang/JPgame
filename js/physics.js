// DOM-free ball physics: circles vs nails, capsule segments, arch, walls, ball-ball.
import { L, buildSegs, buildNails, gateNails } from './layout.js';
import { rand } from './rng.js';

const G = 1500;            // gravity, units/s²
const H_STEP = 1 / 240;    // fixed substep
const E_NAIL = 0.52, E_WALL = 0.36, E_ARCH = 0.08, E_BALL = 0.6, E_RUBBER = 0.55;

export const VALVE = { x1: L.lane.wallX, y1: L.lane.valveTop, x2: L.lane.wallX, y2: L.lane.top };

export class World {
  constructor(events = {}) {
    this.ev = events;
    this.segs = buildSegs();
    this.nails = buildNails(this.segs);
    this.pocketHalf = L.pocket.half;
    this.gates = gateNails(this.pocketHalf);
    this.balls = [];
    this.acc = 0;
    this.time = 0;
    this.nextId = 1;
  }

  setPocketHalf(h) { this.pocketHalf = h; this.gates = gateNails(h); }

  launch(power) {
    // weak = drops off the arch on the left, strong = rides the arch to the rubber ramp on the right
    const v = (1640 + 240 * power) * (0.992 + rand() * 0.016);
    const b = { id: this.nextId++, x: L.lane.x, y: L.lane.startY, vx: 0, vy: -v, age: 0, still: 0, trail: [], gateT: -1, done: false };
    this.balls.push(b);
    return b;
  }

  step(dt) {
    this.acc += dt;
    let n = 0;
    while (this.acc >= H_STEP && n < 400) { this.sub(H_STEP); this.acc -= H_STEP; n++; }
    if (n === 400) this.acc = 0;
    for (const b of this.balls) { b.trail.push(b.x, b.y); if (b.trail.length > 10) b.trail.splice(0, 2); }
  }

  bounce(b, nx, ny, pen, e) {
    b.x += nx * pen; b.y += ny * pen;
    const vn = b.vx * nx + b.vy * ny;
    if (vn < 0) { b.vx -= (1 + e) * vn * nx; b.vy -= (1 + e) * vn * ny; return -vn; }
    return 0;
  }

  hitCircle(b, c, e) {
    const dx = b.x - c.x, dy = b.y - c.y, min = L.r + c.r;
    const d2 = dx * dx + dy * dy;
    if (d2 >= min * min || d2 === 0) return 0;
    const d = Math.sqrt(d2);
    const imp = this.bounce(b, dx / d, dy / d, min - d, e * (0.85 + rand() * 0.3));
    if (imp > 0) { const j = (rand() - 0.5) * 0.06 * imp; b.vx += -dy / d * j; b.vy += dx / d * j; }
    return imp;
  }

  hitSeg(b, s, e) {
    const dx = s.x2 - s.x1, dy = s.y2 - s.y1;
    const t = Math.max(0, Math.min(1, ((b.x - s.x1) * dx + (b.y - s.y1) * dy) / (dx * dx + dy * dy)));
    const px = s.x1 + dx * t, py = s.y1 + dy * t, ex = b.x - px, ey = b.y - py, min = L.r + L.segR;
    const d2 = ex * ex + ey * ey;
    if (d2 >= min * min || d2 === 0) return 0;
    const d = Math.sqrt(d2);
    return this.bounce(b, ex / d, ey / d, min - d, e);
  }

  sub(h) {
    const { balls, ev } = this, P = L.pocket, half = this.pocketHalf;
    this.time += h;
    for (const b of balls) {
      b.age += h;
      b.vy += G * h;
      b.x += b.vx * h; b.y += b.vy * h;

      // arch above archY, straight walls below
      if (b.y < L.archY) {
        const dx = b.x - L.cx, dy = b.y - L.archY, d = Math.hypot(dx, dy), lim = L.archR - L.r;
        if (d > lim) this.bounce(b, -dx / d, -dy / d, d - lim, E_ARCH);
      } else {
        if (b.x < L.wallL + L.r) this.bounce(b, 1, 0, L.wallL + L.r - b.x, E_WALL);
        if (b.x > L.wallR - L.r) this.bounce(b, -1, 0, b.x - (L.wallR - L.r), E_WALL);
      }

      for (const s of this.segs) {
        if (Math.min(s.y1, s.y2) - 20 > b.y || Math.max(s.y1, s.y2) + 20 < b.y) continue;
        const imp = this.hitSeg(b, s, s.kind === 'rubber' ? E_RUBBER : E_WALL);
        if (imp > 60 && ev.wall) ev.wall(b, imp);
      }
      // 逆流防止弁: one-way flap above the launch lane — a ball that has reached the field cannot fall back in
      if (!b.infield && b.x > L.lane.wallX + 20) b.infield = true;
      if (b.infield && b.y < L.lane.top + 20) this.hitSeg(b, VALVE, E_WALL);
      // start-pocket cup walls follow the (fever) opening width
      for (const d of [-1, 1]) {
        const x = P.x + d * (half + 3);
        this.hitSeg(b, { x1: x, y1: P.y + 2, x2: x, y2: P.y + 48 }, E_WALL);
      }

      for (const nl of this.nails) {
        if (Math.abs(nl.y - b.y) > 20 || Math.abs(nl.x - b.x) > 20) continue;
        const imp = this.hitCircle(b, nl, E_NAIL);
        if (imp > 30 && ev.nail) ev.nail(b, nl, imp);
      }
      for (const gt of this.gates) {
        const imp = this.hitCircle(b, gt, E_NAIL);
        if (imp > 30) {
          if (ev.nail) ev.nail(b, gt, imp);
          if (b.y < gt.y + 4 && b.gateT < 0) { b.gateT = this.time; if (ev.gate) ev.gate(b, gt); }
        }
      }

      // stuck guard
      // (a real machine has the same problem — 玉詰まり — and an attendant; here the ball gets a growing nudge)
      if (b.vx * b.vx + b.vy * b.vy < 400) {
        b.still += h;
        if (b.still > 0.6) { b.nudges = (b.nudges || 0) + 1; b.vx += (rand() - 0.5) * 240 * b.nudges; b.vy -= 90 * b.nudges; b.still = 0; }
      } else b.still = 0;
      if (b.age > 45) { b.done = true; if (ev.out) ev.out(b); continue; }

      // sensors
      if (Math.abs(b.x - P.x) < half && b.y > P.y + 12 && b.y < P.y + 50) { b.done = true; if (ev.pocket) ev.pocket(b); continue; }
      for (const sp of L.side) {
        if (Math.abs(b.x - sp.x) < sp.half && b.y > sp.y + 14 && b.y < sp.y + 46) { b.done = true; if (ev.side) ev.side(b, sp); }
      }
      if (b.done) continue;
      if (b.x < L.lane.wallX && b.y > L.H - 30 && b.vy > 0 && b.age > 0.25) { b.done = true; if (ev.foul) ev.foul(b); continue; }
      if (b.y > L.H + 30) { b.done = true; if (ev.out) ev.out(b); }
    }

    // ball-ball
    for (let i = 0; i < balls.length; i++) {
      const a = balls[i]; if (a.done) continue;
      for (let j = i + 1; j < balls.length; j++) {
        const c = balls[j]; if (c.done) continue;
        const dx = c.x - a.x, dy = c.y - a.y, d2 = dx * dx + dy * dy, min = L.r * 2;
        if (d2 >= min * min || d2 === 0) continue;
        const d = Math.sqrt(d2), nx = dx / d, ny = dy / d, pen = (min - d) / 2;
        a.x -= nx * pen; a.y -= ny * pen; c.x += nx * pen; c.y += ny * pen;
        const rv = (c.vx - a.vx) * nx + (c.vy - a.vy) * ny;
        if (rv < 0) {
          const j2 = -(1 + E_BALL) * rv / 2;
          a.vx -= j2 * nx; a.vy -= j2 * ny; c.vx += j2 * nx; c.vy += j2 * ny;
          if (-rv > 80 && ev.clack) ev.clack(a, -rv);
        }
      }
    }
    if (balls.some((b) => b.done)) this.balls = balls.filter((b) => !b.done);
  }
}
