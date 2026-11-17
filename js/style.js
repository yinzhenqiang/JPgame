// Single source of truth for every STYLE.md token used by game code.
// No hex code may appear anywhere else in /js or /css (STYLE "Citation rule").

// STYLE §1 palette (17 colors)
export const C = {
  ink: '#05040F', night: '#0B0A24', indigo: '#15134A', dusk: '#2A1F6E',          // §1.1 stage
  steelLo: '#2B3050', muted: '#8C88B8', steel: '#9AA6C4', steelHi: '#F4F7FF',    // §1.2 steel & text
  violet: '#9B5CFF', cyan: '#19E3FF', pink: '#FF2E88',                           // §1.3 neon accents
  amber: '#FFB347', vermilion: '#FF5A36',                                        // §1.4 lantern warmth
  green: '#2BFF88', blue: '#2E9BFF', red: '#FF3B4E', gold: '#FFD23F',            // §1.5 rarity
};

// STYLE §1.6 rainbow sequence (fixed order)
export const RB = [C.red, C.amber, C.gold, C.green, C.cyan, C.blue, C.violet, C.pink];

// STYLE §2 rarity tiers, weakest → strongest. color null = animated rainbow (§2.3)
export const TIERS = [
  { id: 'green', label: '緑', color: C.green },
  { id: 'blue', label: '青', color: C.blue },
  { id: 'red', label: '赤', color: C.red },
  { id: 'gold', label: '金', color: C.gold },
  { id: 'rainbow', label: '虹', color: null },
];

// STYLE §2.6 reach → rarity mapping
export const REACH_COLOR = { normal: C.blue, super: C.red, premium: C.gold };

// STYLE §3.1 glow levels: [inner blur, outer blur] in px, index = G level
export const GLOW = [[0, 0], [14, 30], [23, 52], [32, 74], [41, 96], [50, 120]];

// STYLE §3.3 screen shake per tier: amplitude px, duration s, zoom punch
export const SHAKE = [
  null,
  { amp: 0, dur: 0, zoom: 1 },        // T1 green
  { amp: 2, dur: 0.12, zoom: 1 },     // T2 blue
  { amp: 4, dur: 0.2, zoom: 1 },      // T3 red
  { amp: 8, dur: 0.32, zoom: 1.03 },  // T4 gold
  { amp: 14, dur: 0.5, zoom: 1.06 },  // T5 rainbow / fever entry
];

// STYLE §3.4 timing
export const TIMING = { nearMissScale: 0.2, nearMissHold: 0.6, lanternStep: 0.15, rainbowCycle: 2.4 };

// STYLE §5.1 fonts (system only)
export const FONT = {
  disp: '"Arial Rounded MT Bold","Arial Black","Segoe UI Black","Yu Gothic UI","Meiryo","Hiragino Sans",sans-serif',
  body: '"Segoe UI","Yu Gothic UI","Meiryo","Hiragino Sans",sans-serif',
  mono: 'Consolas,"Cascadia Mono",monospace',
};

// STYLE §1.6: transparency is always an alpha of a §1 color
export const rgba = (hex, a) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
};

// Push the palette into CSS custom properties so the stylesheet contains no hex.
export function applyCssPalette(root = document.documentElement) {
  for (const [k, v] of Object.entries(C)) root.style.setProperty('--' + k, v);
}
