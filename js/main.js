// 祭 NIGHT PARADE — game glue: state, input, loop, HUD.
import { TIERS, SHAKE, TIMING, applyCssPalette } from './style.js';
import { L } from './layout.js';
import { World } from './physics.js';
import { roll, ODDS, jackpotRate } from './lottery.js';
import { Show } from './show.js';
import { Backdrop, Stage } from './scene.js';
import { BoardView } from './board.js';
import * as audio from './audio.js';
import { seed } from './rng.js';
import { installHooks } from './hooks.js';

applyCssPalette();
const params = new URLSearchParams(location.search);
if (params.has('seed')) seed(Number(params.get('seed')) || 1);
const $ = (id) => document.getElementById(id);
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

const PAY = { start: 3, side: 5, jackpot: 300, refill: 250 };
const AUTO_INTERVAL = 0.55, MAX_HOLDS = 4, MAX_IN_PLAY = 28;

const state = {
  balls: 250, power: 0, charging: false, chargeDir: 1, autoPower: Number(params.get('power')) || 0.5,
  auto: false, autoT: 0, timeScale: 1, time: 0, slow: 0,
  holds: [], current: null, forced: [],
  fever: { active: false, left: 0, chain: 0 },
  near: null, nearLast: -99, bgmAt: -1, tickT: 0,
  shake: { amp: 0, dur: 0, t: 0, zoom: 1 },
  errors: [],
  stats: {
    launched: 0, entries: 0, overflow: 0, spins: 0, fouls: 0, side: 0, outs: 0, refills: 0,
    nearMiss: 0, nearIn: 0, reach: { normal: 0, super: 0, premium: 0 }, win: { normal: 0, super: 0, premium: 0 },
    jackpots: 0, maxChain: 0, feverEnded: 0,
  },
};
const stats = state.stats;
window.addEventListener('error', (e) => state.errors.push(String(e.message || e)));
window.addEventListener('unhandledrejection', (e) => state.errors.push(String(e.reason)));

/* ---------- world ---------- */
const ballGone = (b) => { if (b.gateT >= 0 && !b.pocketed) stats.nearMiss++; };
const world = new World({
  nail(b, n, imp) { audio.click(imp); board.addHit(n.x, n.y, imp); },
  clack(b, imp) { audio.clack(imp); },
  gate(b) {      // natural near-miss: a ball strikes a gate nail right above the start pocket (STYLE §4.4)
    if (state.timeScale === 1 && state.time - state.nearLast > 4 && !stage.active) {
      state.nearLast = state.time; state.near = { ball: b, x: b.x, y: b.y, t: 0, res: null, resT: 0 };
      state.slow = TIMING.nearMissHold; audio.nearMiss();
    }
  },
  pocket(b) {
    b.pocketed = true; stats.entries++; if (b.gateT >= 0) stats.nearIn++;
    state.balls += PAY.start; audio.pocket(); addHold();
  },
  side(b) { stats.side++; state.balls += PAY.side; audio.payout(); ballGone(b); },
  foul(b) { stats.fouls++; state.balls += 1; audio.foul(); ballGone(b); toast('ファール — ball returned'); },
  out(b) { stats.outs++; ballGone(b); },
});

/* ---------- lottery / holds / fever ---------- */
function addHold(kind) {
  const forced = kind || state.forced.shift();
  if (state.holds.length >= MAX_HOLDS) { stats.overflow++; toast('保留満タン — hold full'); return false; }
  state.holds.push(roll(state.fever.active, forced));
  return true;
}
function startFever() {
  const f = state.fever;
  f.chain = f.active ? f.chain + 1 : 1; f.active = true; f.left = ODDS.feverRounds;
  stats.maxChain = Math.max(stats.maxChain, f.chain);
  world.setPocketHalf(L.pocket.feverHalf);
  backdrop.setMode('fever');
  // pending holds are re-drawn at the fever rate (a visible 保留変化); already-winning holds are kept
  state.holds = state.holds.map((h) => (h.win ? h : roll(true)));
}
function endFever() {
  const f = state.fever;
  f.active = false; f.left = 0; f.chain = 0; stats.feverEnded++;
  world.setPocketHalf(L.pocket.half); backdrop.setMode('night'); audio.setBgm('night');
}
function doShake(tier) {      // STYLE §3.3 — scene layer only, never in turbo, never with reduced motion
  if (reducedMotion || state.timeScale !== 1) return;
  const s = SHAKE[tier]; if (!s || !s.amp) return;
  state.shake = { amp: s.amp, dur: s.dur, t: 0, zoom: s.zoom };
}

const show = new Show({
  stop() { audio.reelStop(); },
  tick() { audio.tick(); },
  reach(tier) { stats.reach[tier]++; audio.reach('normal'); doShake(2); },
  cutIn(tier) { audio.reach(tier); doShake(tier === 'super' ? 3 : 4); },
  taiko(tier, finale) { audio.taiko(finale ? 1 : 0.8); if (tier === 'super') doShake(3); },
  lose() { audio.lose(); },
  jackpot(sp) {
    stats.jackpots++; stats.win[sp.tier]++; state.balls += PAY.jackpot;
    startFever(); audio.setBgm(null); audio.fanfare(); state.bgmAt = state.time + 2.8; doShake(5);
  },
  done(sp) {
    state.current = null;
    if (state.fever.active && !sp.win) { state.fever.left--; if (state.fever.left <= 0) endFever(); }
  },
});

/* ---------- view ---------- */
const sceneEl = $('scene'), bgC = $('bg'), stageC = $('stage');
const bgG = bgC.getContext('2d'), stageG = stageC.getContext('2d');
const backdrop = new Backdrop(), stage = new Stage(), board = new BoardView($('board'), world);
stage.onShake = doShake;
let stageDpr = 1;

function resize() {
  const W = innerWidth, H = innerHeight, dpr = Math.min(devicePixelRatio || 1, 2);
  bgC.width = W; bgC.height = H; backdrop.resize(W, H);
  stageDpr = Math.min(dpr, 1.5); stageC.width = Math.round(W * stageDpr); stageC.height = Math.round(H * stageDpr);
  const bh = Math.max(320, H - 28);
  board.resize(Math.min(bh * L.W / L.H, W - 16), dpr);
}
addEventListener('resize', resize); resize();

/* ---------- input ---------- */
function launch(power) {
  if (state.balls <= 0) {
    if (state.auto) refill(); else { toast('玉切れ — press +250'); return false; }
  }
  state.balls--; stats.launched++; world.launch(power); audio.thump(power);
  return true;
}
function refill() { state.balls += PAY.refill; stats.refills++; }
function startCharge() { audio.init(); if (state.charging) return; state.charging = true; state.power = 0; state.chargeDir = 1; }
function release() {
  if (!state.charging) return;
  state.charging = false; state.autoPower = state.power; launch(state.power); state.power = 0;
}
function setAuto(on) { state.auto = on; state.autoT = 0; $('btnAuto').classList.toggle('on', on); $('btnAuto').textContent = on ? 'AUTO ON' : 'AUTO'; }
function toggleSound() { audio.init(); audio.setMuted(!audio.isMuted()); $('btnSound').textContent = audio.isMuted() ? '♪ OFF' : '♪ ON'; $('btnSound').classList.toggle('on', !audio.isMuted()); }

const hold = (el) => el.addEventListener('pointerdown', (e) => { e.preventDefault(); startCharge(); });
hold($('btnLaunch')); hold($('board'));
addEventListener('pointerup', release); addEventListener('pointercancel', release);
$('btnAuto').addEventListener('click', (e) => { audio.init(); setAuto(!state.auto); e.currentTarget.blur(); });
$('btnSound').addEventListener('click', (e) => { toggleSound(); e.currentTarget.blur(); });
$('btnRefill').addEventListener('click', (e) => { audio.init(); if (state.balls <= 0) refill(); e.currentTarget.blur(); });
addEventListener('keydown', (e) => {
  if (e.code === 'Space') { e.preventDefault(); if (!e.repeat) startCharge(); }
  else if (e.code === 'KeyA' && !e.repeat) { audio.init(); setAuto(!state.auto); }
  else if (e.code === 'KeyM' && !e.repeat) toggleSound();
});
addEventListener('keyup', (e) => { if (e.code === 'Space') { e.preventDefault(); release(); } });
audio.setBgm('night');

/* ---------- HUD ---------- */
const cache = {};
const setText = (id, v) => { if (cache[id] !== v) { cache[id] = v; $(id).textContent = v; } };
const setClass = (id, v) => { if (cache['c' + id] !== v) { cache['c' + id] = v; $(id).className = v; } };
let toastT = 0;
function toast(msg) { if (state.timeScale !== 1) return; const t = $('toast'); t.textContent = msg; t.classList.add('show'); toastT = 1.4; }

function hud(real) {
  setText('balls', String(state.balls)); setText('spins', String(stats.spins)); setText('jackpots', String(stats.jackpots));
  const f = state.fever;
  setText('rate', `1/${Math.round(1 / jackpotRate(f.active))}`);
  if (cache.fever !== f.active) { cache.fever = f.active; $('fever').hidden = !f.active; document.body.classList.toggle('fevering', f.active); }
  if (f.active) { setText('chain', String(f.chain)); setText('left', String(f.left)); }
  const slotCls = (h) => 'slot ' + (h ? 't-' + TIERS[h.hint].id : 'empty');   // pre-read hint colour — STYLE §2
  setClass('now', slotCls(state.current) + ' now');
  for (let i = 0; i < MAX_HOLDS; i++) setClass('h' + i, slotCls(state.holds[i]));
  $('meterFill').style.width = (state.charging ? state.power : 0) * 100 + '%';
  $('meterMark').style.left = state.autoPower * 100 + '%';
  const empty = state.balls <= 0;
  if (cache.empty !== empty) { cache.empty = empty; const b = $('btnRefill'); b.disabled = !empty; b.classList.toggle('off', !empty); }
  if (toastT > 0) { toastT -= real; if (toastT <= 0) $('toast').classList.remove('show'); }
}

/* ---------- loop ---------- */
function update(dt, real) {
  if (state.charging) {      // hold to charge: the meter sweeps up and back
    state.power += state.chargeDir * real * 0.9;
    if (state.power >= 1) { state.power = 1; state.chargeDir = -1; } else if (state.power <= 0) { state.power = 0; state.chargeDir = 1; }
  }
  if (state.auto) {
    state.autoT -= dt;
    while (state.autoT <= 0) {
      state.autoT += AUTO_INTERVAL;
      if (world.balls.length < MAX_IN_PLAY) launch(Math.max(0, Math.min(1, state.autoPower + (Math.random() - 0.5) * 0.05)));
    }
  }
  world.step(dt);

  const nm = state.near;
  if (nm) {
    nm.t += real;
    if (!nm.res) {
      if (!nm.ball.done) { nm.x = nm.ball.x; nm.y = nm.ball.y; }
      if (nm.ball.done) nm.res = nm.ball.pocketed ? 'in' : 'out';
      else if (nm.ball.y > L.pocket.y + 70 || nm.t > 3) nm.res = 'out';
    } else { nm.resT += real; if (nm.resT > 0.7) state.near = null; }
  }

  // the director advances in small slices so turbo play cannot skip a phase
  const n = Math.max(1, Math.ceil(dt / 0.04));
  for (let i = 0; i < n; i++) {
    if (!show.busy && state.holds.length) { state.current = state.holds.shift(); stats.spins++; show.start(state.current, state.fever.active); }
    show.update(dt / n); stage.update(dt / n, show);
  }
  if (show.reels.some((r) => r.blur)) { state.tickT -= dt; if (state.tickT <= 0) { audio.tick(); state.tickT = 0.085; } }
  if (state.bgmAt >= 0 && state.time >= state.bgmAt) { state.bgmAt = -1; audio.setBgm(state.fever.active ? 'fever' : 'night'); }
  backdrop.update(real);
}

function render(real, dt) {
  if (stage.alpha < 1) backdrop.draw(bgG);
  board.draw({
    show, fever: state.fever.active, feverLeft: state.fever.left, near: state.near, power: state.power, charging: state.charging,
    time: state.time, dt, rateDenom: Math.round(1 / jackpotRate(state.fever.active)),
  });
  stageG.setTransform(1, 0, 0, 1, 0, 0); stageG.clearRect(0, 0, stageC.width, stageC.height);
  stageG.setTransform(stageDpr, 0, 0, stageDpr, 0, 0);
  stage.draw(stageG, innerWidth, innerHeight, show, state.time);
  const s = state.shake;
  if (s.dur) {
    s.t += real; const e = Math.exp(-4 * s.t / s.dur);
    if (e < 0.02) { s.dur = 0; sceneEl.style.transform = ''; }
    else { const a = s.amp * e; sceneEl.style.transform = `translate(${(Math.random() * 2 - 1) * a}px,${(Math.random() * 2 - 1) * a}px) scale(${1 + (s.zoom - 1) * e})`; }
  }
  hud(real);
}

let last = performance.now();
function frame(ts) {
  const real = Math.max(0, Math.min(0.05, (ts - last) / 1000)); last = ts;
  let scale = state.timeScale;
  if (state.slow > 0 && scale === 1) { state.slow -= real; scale = TIMING.nearMissScale; }   // near-miss slow-mo, STYLE §3.4
  const dt = real * scale; state.time += dt;
  try { update(dt, real); render(real, dt); } catch (err) { state.errors.push(String(err && err.stack || err)); console.error(err); }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

/* ---------- debug / play-test hooks ---------- */
installHooks({
  state, stats, show, world, stage, params, audio,
  setTimeScale(n) { state.timeScale = n; audio.setSfxEnabled(n === 1); },
  setAuto, addHold, endFever, launch,
});
