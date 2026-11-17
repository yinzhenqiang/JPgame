// All sound is synthesized with Web Audio — no audio files.
let ctx = null, master, sfxBus, musicBus, noiseBuf;
let muted = false, sfxOn = true, lastClick = 0;
let bgm = null, bgmTimer = null, bgmStep = 0, bgmNext = 0;

const now = () => ctx.currentTime;

export function init() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume().catch(() => {}); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  const comp = ctx.createDynamicsCompressor();
  master = ctx.createGain(); master.gain.value = muted ? 0 : 0.7;
  sfxBus = ctx.createGain(); sfxBus.gain.value = 0.9;
  musicBus = ctx.createGain(); musicBus.gain.value = 0.32;
  sfxBus.connect(master); musicBus.connect(master); master.connect(comp); comp.connect(ctx.destination);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  if (bgm) startBgm();
}

export const setMuted = (m) => { muted = m; if (master) master.gain.setTargetAtTime(m ? 0 : 0.7, now(), 0.03); };
export const isMuted = () => muted;
export const setSfxEnabled = (on) => { sfxOn = on; };   // off during turbo play so nodes don't pile up
const ok = () => ctx && sfxOn && ctx.state === 'running';

function tone({ f = 440, f2 = 0, type = 'sine', t = 0, d = 0.1, g = 0.2, a = 0.003, dest = sfxBus }) {
  const o = ctx.createOscillator(), v = ctx.createGain(), T = now() + t;
  o.type = type; o.frequency.setValueAtTime(f, T);
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, T + d);
  v.gain.setValueAtTime(0.0001, T); v.gain.linearRampToValueAtTime(g, T + a); v.gain.exponentialRampToValueAtTime(0.0001, T + d);
  o.connect(v); v.connect(dest); o.start(T); o.stop(T + d + 0.03);
}
function noise({ t = 0, d = 0.1, g = 0.2, hp = 20, lp = 18000, dest = sfxBus }) {
  const s = ctx.createBufferSource(), v = ctx.createGain(), h = ctx.createBiquadFilter(), l = ctx.createBiquadFilter(), T = now() + t;
  s.buffer = noiseBuf; s.loop = true; h.type = 'highpass'; h.frequency.value = hp; l.type = 'lowpass'; l.frequency.value = lp;
  v.gain.setValueAtTime(g, T); v.gain.exponentialRampToValueAtTime(0.0001, T + d);
  s.connect(h); h.connect(l); l.connect(v); v.connect(dest); s.start(T, Math.random() * 0.5); s.stop(T + d + 0.03);
}
const N = (semi) => 440 * Math.pow(2, semi / 12);   // semitones from A4

/* ---------- SFX ---------- */
// Ball click per nail: two inharmonic partials, pitch + level follow impact speed
export function click(imp) {
  if (!ok()) return;
  const t = performance.now(); if (t - lastClick < 14) return; lastClick = t;
  const v = Math.min(1, imp / 700), f = 2600 + Math.random() * 1600;
  tone({ f, type: 'sine', d: 0.035 + v * 0.03, g: 0.05 + v * 0.16, a: 0.001 });
  tone({ f: f * 1.53, type: 'triangle', d: 0.025, g: 0.03 + v * 0.07, a: 0.001 });
}
export function clack(imp) {
  if (!ok()) return;
  const v = Math.min(1, imp / 600); tone({ f: 1500 + Math.random() * 300, type: 'triangle', d: 0.03, g: 0.05 + v * 0.1, a: 0.001 });
}
export function thump(power) {
  if (!ok()) return;
  tone({ f: 170 + power * 60, f2: 48, d: 0.16, g: 0.5, a: 0.002 });
  noise({ d: 0.05, g: 0.18, lp: 2400 });
  tone({ f: 900 + power * 900, f2: 2400 + power * 1200, type: 'triangle', d: 0.09, g: 0.05 });
}
export function tick() { if (ok()) tone({ f: 980, type: 'square', d: 0.028, g: 0.05, a: 0.001 }); }
export function reelStop() { if (ok()) { tone({ f: 240, f2: 120, type: 'triangle', d: 0.09, g: 0.3 }); noise({ d: 0.03, g: 0.1, hp: 2000 }); } }
export function pocket() { if (ok()) { tone({ f: N(7), type: 'square', d: 0.09, g: 0.1 }); tone({ f: N(14), type: 'square', t: 0.08, d: 0.16, g: 0.1 }); } }
export function payout() { if (ok()) for (let i = 0; i < 3; i++) tone({ f: 2100 + i * 380, type: 'triangle', t: i * 0.05, d: 0.06, g: 0.08 }); }
export function foul() { if (ok()) tone({ f: 200, f2: 120, type: 'sawtooth', d: 0.12, g: 0.06 }); }
export function nearMiss() { if (ok()) { tone({ f: 500, f2: 1700, type: 'sine', d: 0.5, g: 0.13, a: 0.05 }); tone({ f: 505, f2: 1720, type: 'triangle', d: 0.5, g: 0.06, a: 0.05 }); } }
export function taiko(strong = 1) {
  if (!ok()) return;
  tone({ f: 120, f2: 46, d: 0.3, g: 0.6 * strong, a: 0.002 }); noise({ d: 0.07, g: 0.22 * strong, lp: 900 });
}
export function boom(size = 1) {
  if (!ok()) return;
  noise({ d: 0.5 * size, g: 0.07 * size, lp: 500 }); noise({ t: 0.06, d: 0.35, g: 0.03, hp: 3000 });
}
// Tiered reach jingles — more notes, higher register and more layers per tier
export function reach(tier) {
  if (!ok()) return;
  if (tier === 'normal') [0, 4, 7].forEach((s, i) => tone({ f: N(s), type: 'triangle', t: i * 0.11, d: 0.2, g: 0.14 }));
  else if (tier === 'super') {
    [0, 4, 7, 12, 16, 19].forEach((s, i) => tone({ f: N(s), type: 'square', t: i * 0.075, d: 0.16, g: 0.09 }));
    taiko(1); setTimeout(() => taiko(0.8), 230);
  } else {
    [0, 4, 7, 12, 16, 19, 24, 28].forEach((s, i) => { tone({ f: N(s), type: 'sawtooth', t: i * 0.065, d: 0.2, g: 0.06 }); tone({ f: N(s + 12), type: 'triangle', t: i * 0.065, d: 0.24, g: 0.07 }); });
    [24, 28, 31].forEach((s) => tone({ f: N(s), type: 'triangle', t: 0.56, d: 1.1, g: 0.07, a: 0.02 }));
    taiko(1); boom(1);
  }
}
export function lose() { if (ok()) [3, 1, -2, -6].forEach((s, i) => tone({ f: N(s - 12), type: 'triangle', t: i * 0.14, d: 0.28, g: 0.12 })); }
export function fanfare() {
  if (!ok()) return;
  const seq = [[0, 0], [4, 0.12], [7, 0.24], [12, 0.36], [7, 0.54], [12, 0.66], [16, 0.84], [19, 1.02], [24, 1.26]];
  for (const [s, t] of seq) { tone({ f: N(s), type: 'sawtooth', t, d: 0.22, g: 0.09 }); tone({ f: N(s - 12), type: 'square', t, d: 0.22, g: 0.05 }); }
  [12, 16, 19, 24].forEach((s) => tone({ f: N(s), type: 'sawtooth', t: 1.5, d: 1.6, g: 0.06, a: 0.03 }));
  for (let i = 0; i < 4; i++) setTimeout(() => taiko(1), i * 380);
  for (let i = 0; i < 10; i++) tone({ f: 3000 + Math.random() * 3000, type: 'sine', t: 1.4 + i * 0.12, d: 0.2, g: 0.03 });
}

/* ---------- BGM: step sequencer on the yo pentatonic scale (D E G A B) ---------- */
const YO = [-7, -5, -2, 0, 2, 5, 7, 10, 12, 14];     // semitones from A4, D4 upward
const SONGS = {
  night: {
    bpm: 84,
    lead: [0, -1, -1, -1, 2, -1, 3, -1, 4, -1, -1, -1, 3, -1, 2, -1, 0, -1, -1, -1, 1, -1, 2, -1, 1, -1, -1, -1, -1, -1, -1, -1],
    bass: [0, -1, -1, -1, -1, -1, -1, -1, 3, -1, -1, -1, -1, -1, -1, -1],
    drum: 'D.......d.......',
    kane: '....k.......k...',
  },
  fever: {
    bpm: 156,
    lead: [5, 5, 7, 5, 4, 5, 7, 8, 9, 8, 7, 5, 7, -1, 7, -1, 5, 5, 7, 5, 4, 3, 4, 5, 7, 5, 4, 3, 5, -1, 5, -1],
    bass: [0, -1, 0, -1, 3, -1, 3, -1, 2, -1, 2, -1, 3, -1, 4, -1],
    drum: 'D.dDD.d.D.dDDdDd',
    kane: 'k.kkk.kkk.kkkkk.',
  },
};

function startBgm() {
  if (!ctx || bgmTimer) return;
  bgmStep = 0; bgmNext = now() + 0.08;
  bgmTimer = setInterval(() => {
    if (!bgm || !ctx || ctx.state !== 'running') return;
    const song = SONGS[bgm], stepDur = 60 / song.bpm / 4;
    if (bgmNext < now() - 0.3) bgmNext = now() + 0.05;
    while (bgmNext < now() + 0.2) {
      const t = bgmNext - now(), i = bgmStep, fever = bgm === 'fever';
      const ld = song.lead[i % song.lead.length];
      if (ld >= 0) tone({ f: N(YO[ld]) * (fever ? 2 : 1), type: fever ? 'square' : 'triangle', t, d: stepDur * (fever ? 0.9 : 3), g: fever ? 0.1 : 0.16, a: fever ? 0.004 : 0.03, dest: musicBus });
      const bs = song.bass[i % 16];
      if (bs >= 0) tone({ f: N(YO[bs]) / 4, type: fever ? 'sawtooth' : 'sine', t, d: stepDur * (fever ? 1.6 : 6), g: fever ? 0.2 : 0.22, dest: musicBus });
      const dr = song.drum[i % 16];
      if (dr !== '.') { const s = dr === 'D' ? 1 : 0.55; tone({ f: 110 * s + 30, f2: 44, d: 0.22, g: 0.5 * s, t, dest: musicBus }); noise({ t, d: 0.05, g: 0.12 * s, lp: 800, dest: musicBus }); }
      if (song.kane[i % 16] === 'k') { tone({ f: 2960, type: 'triangle', t, d: 0.05, g: 0.05, dest: musicBus }); tone({ f: 4435, type: 'sine', t, d: 0.04, g: 0.03, dest: musicBus }); }
      bgmNext += stepDur; bgmStep++;
    }
  }, 50);
}
export function setBgm(name) {
  if (bgm === name) return;
  bgm = name; bgmStep = 0;
  if (!name) { if (bgmTimer) { clearInterval(bgmTimer); bgmTimer = null; } return; }
  if (ctx) { bgmNext = now() + 0.1; startBgm(); }
}
export const currentBgm = () => bgm;
export const audioState = () => (ctx ? ctx.state : 'none');
