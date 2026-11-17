// Board geometry in logical board units (1 unit = 1px at 1:1 scale).
// Ball diameter 28 — STYLE §4.1. Nail radius 5, gate nails 6 — STYLE §4.2.
export const L = {
  W: 720, H: 980,
  r: 14,
  cx: 360, archY: 372, archR: 346,       // top arch: circle centre + radius
  wallL: 14, wallR: 706,
  lane: { x: 36, wallX: 60, top: 335, valveTop: 215, startY: 930 },
  lcd: { x: 205, y: 304, w: 310, h: 200 },
  roof: [[191, 306], [360, 262], [529, 306]],
  pocket: { x: 360, y: 716, half: 20, feverHalf: 42 },
  side: [{ x: 118, y: 826, half: 19 }, { x: 602, y: 826, half: 19 }],
  nailR: 5, gateR: 6, segR: 4,
};

// Road fences: nail count per side and how far from centre they end. These two numbers set the
// start-pocket entry rate (tuned with tests/probe.ps1).
const ROAD_N = 5, ROAD_END = 70;

const distSeg =(px, py, s) => {
  const dx = s.x2 - s.x1, dy = s.y2 - s.y1;
  const t = Math.max(0, Math.min(1, ((px - s.x1) * dx + (py - s.y1) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (s.x1 + dx * t), py - (s.y1 + dy * t));
};

export function buildSegs() {
  const { lane, lcd, roof, side, H } = L, s = [];
  const add = (x1, y1, x2, y2, kind) => s.push({ x1, y1, x2, y2, kind });
  add(lane.wallX, lane.top, lane.wallX, H + 40, 'lane');
  // 返しゴム: rubber ramp where the arch meets the right wall — strong shots are kicked back into the field
  // (a ramp, not a radial stop: a radial stop sends the ball back along the arch into the launch lane)
  add(L.wallR, 380, L.wallR - 46, 416, 'rubber');
  add(roof[0][0], roof[0][1], roof[1][0], roof[1][1], 'roof');
  add(roof[1][0], roof[1][1], roof[2][0], roof[2][1], 'roof');
  add(lcd.x - 8, roof[0][1], lcd.x - 8, lcd.y + lcd.h + 6, 'lcd');
  add(lcd.x + lcd.w + 8, roof[2][1], lcd.x + lcd.w + 8, lcd.y + lcd.h + 6, 'lcd');
  add(lcd.x - 8, lcd.y + lcd.h + 6, lcd.x + lcd.w + 8, lcd.y + lcd.h + 6, 'lcd');
  for (const p of side) {
    add(p.x - p.half - 3, p.y, p.x - p.half - 3, p.y + 44, 'cup');
    add(p.x + p.half + 3, p.y, p.x + p.half + 3, p.y + 44, 'cup');
  }
  return s;
}

export function buildNails(segs) {
  const { cx, archY, archR, pocket, nailR } = L, nails = [];
  // a ball (28) must fit between a nail and any wall: 14*2 + nail 5 + wall 4 = 37, plus slack
  const clear = (x, y) => segs.every((s) => distSeg(x, y, s) >= 40);
  for (let k = 0; k < 14; k++) {
    const y = 120 + k * 56;
    for (let j = 0; j < 10; j++) {
      let x = (k % 2 ? 132 : 100) + j * 64;
      if (x === 676) x = 668;          // keep a 33px gap to the right wall, mirroring the left edge
      if (x > 670) continue;
      if (y < archY + 20 && Math.hypot(x - cx, y - archY) > archR - 44) continue;
      if (y > 575 && y < 790 && Math.abs(x - cx) < 228) continue;   // road + pocket zone
      if (!clear(x, y)) continue;
      nails.push({ x, y, r: nailR });
    }
  }
  // 道釘: two sloped fences that feed balls toward the start pocket
  for (const d of [-1, 1]) {
    // 20px pitch with an 8px drop: the dip between two heads (≈3px) is shallower than the drop, so balls roll, never rest
    for (let i = 0; i < ROAD_N; i++) nails.push({ x: cx + d * (ROAD_END + (ROAD_N - 1 - i) * 20), y: 660 - (ROAD_N - 1 - i) * 8, r: nailR, road: true });
  }
  return nails;
}

// 命釘: the two gate nails above the start pocket (they open in fever)
export const gateNails = (half) => [
  { x: L.pocket.x - half - 10, y: L.pocket.y - 12, r: L.gateR, gate: true },
  { x: L.pocket.x + half + 10, y: L.pocket.y - 12, r: L.gateR, gate: true },
];
