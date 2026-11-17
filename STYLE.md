# STYLE.md — 祭 NIGHT PARADE

Locked art direction for the Neon Japanese Matsuri (ネオン祭り) pachinko game.
Reference render: `style-test.html` (screenshot: `style-test.png`).

**Citation rule.** Every visual decision in game code cites a section of this file
in a comment, e.g. `// STYLE §3.2 glow G3`. If a needed value is not here, add it
to this file first, then cite it. No hex code may appear in game code unless it is
listed in §1.

Status of each section:

| Section | Status |
|---|---|
| §1 Palette, §2 Rarity, §3.1 Glow, §3.2 Particles, §5 UI, §6 Title, §7 Scene kit | **Approved** — shown in `style-test.html` |
| §3.3 Shake, §3.4 Timing | **Proposed** — the style test is static, so these were never seen in motion. Review on the first playable build. |
| §8 Game HUD additions | **Proposed** — added while building the game for components the style test did not cover. Built only from §1 colors and §2/§3/§5 rules. |

---

## §0 Core rules

- **§0.1 Dark-and-neon.** Base luminance stays low: every background is built from
  Ink / Night / Indigo / Dusk only. The whole brightness budget goes to lanterns,
  neon signs, machine lights and effect colors.
- **§0.2 Brightness scales with stakes.** Idle play is the darkest state. Brightness,
  glow radius, particle count and shake all rise with rarity tier (§2) and peak in
  Fever. Never spend top-tier brightness on a low-tier event.
- **§0.3 Cartoon chrome on a moody stage.** UI is rounded, chunky and bouncy with
  bold Ink outlines; the scene behind it is atmospheric and soft.
- **§0.4 Code-generated only.** All visuals come from Canvas, SVG, CSS gradients and
  particles. No image, font or texture files.
- **§0.5 Outline color is always Ink** (`#05040F`), never pure black and never a
  tinted outline.

---

## §1 Palette (17 colors — the complete set)

Token names match the CSS variables / JS keys in `style-test.html`.

### §1.1 Stage (low luminance)

| Token | Name | Hex | Use |
|---|---|---|---|
| `ink` | 墨 Ink | `#05040F` | All outlines, silhouettes, deepest sky, drop "shadows" |
| `night` | 夜 Night | `#0B0A24` | Page/base background, panel fill, reel drum interior |
| `indigo` | 藍 Indigo | `#15134A` | Lower sky, panel top gradient, board backdrop |
| `dusk` | 宵 Dusk | `#2A1F6E` | Horizon, panel borders, unlit lanterns, unlit 7-seg segments |

### §1.2 Steel & text

| Token | Name | Hex | Use |
|---|---|---|---|
| `steelLo` | Steel Lo | `#2B3050` | Ball shadow side, rails, disabled button fill |
| `muted` | Muted | `#8C88B8` | Secondary text, captions, disabled label |
| `steel` | Steel | `#9AA6C4` | Ball mid-tone, wires, tertiary text |
| `steelHi` | Steel Hi | `#F4F7FF` | Primary text, speculars, firework tips, hot cores |

### §1.3 Neon accents

| Token | Name | Hex | Use |
|---|---|---|---|
| `violet` | 紫 Violet | `#9B5CFF` | Normal button body, sky haze, secondary neon |
| `cyan` | Cyan | `#19E3FF` | Ball rim A, spinning reel, normal button ring, rails |
| `pink` | Pink | `#FF2E88` | Ball rim B, cabinet frame, payline, section tags, title extrude |

### §1.4 Lantern warmth

| Token | Name | Hex | Use |
|---|---|---|---|
| `amber` | Amber | `#FFB347` | Lantern core, stall light, nail glow, taiko skin |
| `vermilion` | 朱 Lantern | `#FF5A36` | Lantern paper, torii, taiko body, 祭 badge |

### §1.5 Rarity (see §2)

| Token | Name | Hex |
|---|---|---|
| `green` | 緑 Green | `#2BFF88` |
| `blue` | 青 Blue | `#2E9BFF` |
| `red` | 赤 Red | `#FF3B4E` |
| `gold` | 金 Gold | `#FFD23F` |

### §1.6 Derived values

- **Rainbow sequence** (fixed order): `red → amber → gold → green → cyan → blue → violet → pink` (→ back to `red` when looping).
- **Transparency** is always an alpha of a §1 color (`rgba()` / `color-mix(... transparent)`). No new hues.
- **Palette strip order** (dark → neon): ink, night, indigo, dusk, steelLo, muted, steel, steelHi, violet, blue, cyan, green, gold, amber, vermilion, red, pink.

---

## §2 Rarity color system

Five tiers, weakest to strongest. Color is the player's read of how good an event is.

| Tier | Label | Color | Stars | Glow level (§3.1) |
|---|---|---|---|---|
| T1 | 緑 GREEN | `#2BFF88` | ★☆☆☆☆ | G1 |
| T2 | 青 BLUE | `#2E9BFF` | ★★☆☆☆ | G2 |
| T3 | 赤 RED | `#FF3B4E` | ★★★☆☆ | G3 |
| T4 | 金 GOLD | `#FFD23F` | ★★★★☆ | G4 |
| T5 | 虹 RAINBOW | rainbow sequence §1.6, animated | ★★★★★ | G5 |

Rules:

- **§2.1 Order is fixed and never reused out of order.** green < blue < red < gold < rainbow.
- **§2.2 Rarity colors mean rarity.** The four rarity hexes are reserved for
  expectation signalling (frames, cut-ins, text, ball rim tint, particles). Do not use
  them for neutral decoration. Exceptions already locked: `gold` on stopped reel
  digits, nail heads and the title; `red` on yagura drape stripes.
- **§2.3 Rainbow is always moving.** It is never a static gradient in-game: a
  115° gradient of the rainbow sequence, `background-size: 300%`, sliding one full
  cycle every 2.4 s, plus a Steel Hi diagonal shimmer sweep every 1.6 s, plus a halo
  that cycles red → gold → cyan → violet in step with it.
- **§2.4 Rainbow is scarce.** Only T5 events, Premium Reach and Fever may show it.
- **§2.5 Swatch construction.** Rounded square (radius 26px), 4px Ink border, 3px
  ring in tier color, radial fill: Steel Hi hot-spot at 34%/28% → tier color at 34%
  → tier color mixed 40% into Ink at the edge.
- **§2.6 Reach mapping.** Normal Reach = blue, Super Reach = red, Premium Reach =
  gold + rainbow, Fever = rainbow.

---

## §3 Effect vocabulary

### §3.1 Glow levels

Glow is additive (`globalCompositeOperation = 'lighter'` on canvas, stacked
`box-shadow` in CSS), always in the element's own color.

| Level | Inner blur | Outer blur (55% alpha) | Used by |
|---|---|---|---|
| G0 | none | none | Disabled UI, unlit lanterns, silhouettes |
| G1 | 14px | 30px | T1 green, ambient nails, dim stalls |
| G2 | 23px | 52px | T2 blue, Normal Reach, normal buttons |
| G3 | 32px | 74px | T3 red, Super Reach, lit lanterns, cabinet frame |
| G4 | 41px | 96px | T4 gold, highlighted button, stopped "7" digits |
| G5 | 50px | 120px, color-cycling | T5 rainbow, Premium Reach, Fever |

Formula behind the table: inner = `14 + 9·t` px, outer = `30 + 22·t` px, `t` = 0…4
for T1…T5 (G5 uses the fixed 50 / 120 animated halo).

Other locked glow recipes:

- **Neon tube:** Steel Hi core + three shadows in tube color at 8 / 22 / 60px.
- **Neon text (canvas):** Ink stroke at 22% of font size, fill with blur 50% of size, then a second fill at 15%.
- **Lantern:** two radial glows — paper color at 2.4× lantern size (38% alpha) and Amber at 1.2× (40% alpha).
- **Ball rim:** two arcs at 95% radius, 9% radius thick, blur 45% radius; Cyan lower-left, Pink right. Rim colors may be swapped for a tier color (§2).

### §3.2 Particle & effect types

| ID | Type | Construction | Tiers |
|---|---|---|---|
| P1 | Spark dot | Radial glow 3–6px, tier color | T1+ |
| P2 | Pulse ring | Elliptical stroke rings, 2 concentric, fading outward | T2+ (Normal Reach) |
| P3 | Impact burst | 10 short radial strokes, alternating lengths, Gold | Nail hits, near-miss, lantern ignition |
| P4 | Freeze rings | 3 thin Steel Hi circles (middle one dashed) around a frozen ball | Near-miss only |
| P5 | Trail | 5 ghost copies, shrinking and fading (ball); dotted 1/8 dash arcs for path | Ball always |
| P6 | Speed streaks | Vertical 1.6px lines, Cyan→Steel Hi→Cyan | Spinning reel |
| P7 | Shock arcs | 3 arcs above a taiko, alternating Amber / Pink | T3+ (Super Reach) |
| P8 | Firework bloom | 1–3 rings of rays, color→Steel Hi tip, tip glow dot, Steel Hi core | T3 small ×1; T4 giant ×3; Fever fills sky |
| P9 | Willow bloom | P8 with heavy droop (0.55), Gold only | Fever |
| P10 | God rays | 16 alternating Gold / Pink wedges at 7% alpha from the horizon | T4+ (Premium Reach) |
| P11 | Launch trail | Thin Amber line fading upward from the ground | Fever |

Firework parameters: small = radius 26–52px, 18–22 rays, 1 ring; giant = radius
84–150px, 30–46 rays, 2–3 rings, two-color; droop 0.10–0.14 (willow 0.55).

### §3.3 Screen shake per tier — PROPOSED

| Tier | Amplitude | Duration | Notes |
|---|---|---|---|
| T1 green | 0px | — | No shake |
| T2 blue | 2px | 120ms | Single nudge |
| T3 red | 4px | 200ms | Synced to each taiko hit |
| T4 gold | 8px | 320ms | Plus 1.03× zoom punch |
| T5 rainbow / Fever entry | 14px | 500ms | Plus 1.06× zoom punch and a 1-frame Steel Hi flash |

Shake decays exponentially, moves the scene layer only (never the UI layer), and is
disabled entirely under `prefers-reduced-motion`.

### §3.4 Timing — PROPOSED

- Near-miss freeze: time scale 0.2× (as labeled in the style test), hold 600ms.
- Super Reach lanterns ignite left → right, one per 150ms, each with a P3 burst.
- Highlighted button bob: 1.1s ease-in-out loop (approved, §5.2).
- Rainbow cycle 2.4s, shimmer 1.6s (approved, §2.3).

---

## §4 Game objects

- **§4.1 Ball.** Radial steel gradient offset to upper-left (Steel Hi → Steel →
  Steel Lo → Ink), Violet horizon reflection in the lower half, Vermilion/Amber
  lantern reflections, Cyan + Pink rim (§3.1), Steel Hi specular ellipse plus a small
  dot, Ink outline at 4.5% of radius. In-game diameter 28px.
- **§4.2 Nail.** 5px brass head (Steel Hi → Gold → Amber), 1.5px Ink outline, G1
  Amber glow, short Ink shaft offset down-right. Gate nails are 6px.
- **§4.3 Start pocket.** Ink cup, 3.5px Pink neon outline, Gold interior glow, Gold "START" label.
- **§4.4 Near-miss.** Spotlight vignette (Ink to 72% at the edges), P3 + P4 on the
  ball, ball rim switches to Gold/Pink, Gold "IN ?" and Red "OUT ?" dashed arrows,
  Gold-outlined callout chip.
- **§4.5 Reels.** Seven-segment digits, 8% italic skew, segment thickness 13% of
  height. Stopped: Gold, G4, unlit segments in Dusk at 45%, neighbour digits at 22%.
  Spinning: Cyan ghosts at 8.5% alpha stacked vertically + P6. Drum = vertical
  Ink → Indigo → Ink gradient with Ink fade top and bottom. Frame: 9px Ink + 4px neon
  (Gold stopped, Cyan spinning). Cabinet: Ink, 5px Pink neon. Payline: dashed Pink.

---

## §5 UI components

### §5.1 Shared chrome

- **Fonts (system only, no downloads).**
  Display: `"Arial Rounded MT Bold", "Arial Black", "Segoe UI Black", "Yu Gothic UI", "Meiryo", "Hiragino Sans", sans-serif`, weight 900.
  Body: `"Segoe UI", "Yu Gothic UI", "Meiryo", "Hiragino Sans", sans-serif`.
  Mono / numerals: `Consolas, "Cascadia Mono", monospace`.
- **Type scale.** Display 30px / 900 Gold with G1 glow · Heading 19–21px / 900,
  letter-spacing 1.5px · Body 15px / 1.5 Steel Hi · Caption 12–12.5px Muted ·
  Numerals 24px / 700 mono, Cyan, letter-spacing 3px.
- **Panel.** Radius 30px, 3px Dusk border, fill Indigo-55%/Night → Night, hard
  drop "shadow" `0 8px 0` Ink plus a 3px Ink ring. No soft shadows on chrome.
- **Inner frame (canvas, stage).** Radius 20–22px, 3px Ink border.
- **Tag / chip.** Pill, 3px Ink border, Ink text on a solid accent fill, G1 glow in
  the fill color. Section tags are Pink and rotated −4°.

### §5.2 Buttons

All: pill (radius 999px), 4px Ink border, display font 900 at 16px, padding 17px 20px, no wrapping.

| State | Fill | Text | Ring / glow | Depth | Motion |
|---|---|---|---|---|---|
| Normal | Violet → Dusk (vertical) | Steel Hi, 2px Ink text shadow | 3px Cyan ring, G2 Cyan at 45% | `0 8px 0` Ink, top inset highlight, bottom inset shade | none |
| Highlighted | Steel Hi → Gold → Amber → Vermilion | Ink | 3px Gold ring, G4 Gold + Amber | same as normal | scale 1.1, rotate −3°, bob to 1.15 / −1° / −3px over 1.1s |
| Disabled | Steel Lo flat | Muted | none (G0) | `0 4px 0` Ink | none |

Rule: only one Highlighted button on screen at a time.

---

## §6 Title treatment — "祭 NIGHT PARADE"

- **祭 badge.** 172px circle rotated −7°, 6px Ink border, 4px Gold ring, radial
  Amber → Vermilion → Red fill with horizontal lantern ribs (2px Ink at 22% every
  17px), G4 Vermilion glow, `0 9px 0` Ink depth. Glyph: 116px / 900, Steel Hi, 5px
  Ink stroke.
- **Wordmark.** Two stacked lines, italic 900 display font at 70px, letter-spacing 2px.
  - "NIGHT": vertical gradient Steel Hi → Gold → Amber → Vermilion.
  - "PARADE": vertical gradient Steel Hi → Cyan → Blue.
  - Each line has a 16px Ink outline layer behind it, and behind that a Pink copy
    offset 10px down (the neon extrude) with Pink and Violet drop glows.
- **Underline.** 8px Steel Hi neon tube with Cyan glow (§3.1 neon tube).
- **Tagline.** "ネオン祭りパチンコ", 15px / 700, Amber, letter-spacing 8px, Vermilion glow.
- **Minimum size.** Scale the lockup as one unit; do not go below a 96px badge.
- **In-scene headline variant ("FEVER").** Italic 900 at 150px, rainbow-sequence
  fill, Steel Hi top highlight, 28px Ink outline, 40px Pink under-stroke with G5 glow.

---

## §7 Scene kit (festival backdrop)

- **Sky.** Vertical Ink → Night (45%) → Indigo (82%) → Dusk, Steel Hi stars in the
  top 70%. Warm horizon glow (Pink + Amber) scales with tier.
- **Lanterns.** Ellipse, Ink outline and caps, 5 ribs. Unlit = flat Dusk, G0. Lit =
  Steel Hi/Amber core → paper color, G3. Hung on a sagging Steel wire.
- **Stalls.** Ink silhouettes with an Amber → Vermilion lit opening, Ink noren flaps
  and vendor, one neon roof-edge line (Pink / Cyan / Gold / Green / Violet rotating).
- **Silhouettes (always Ink, always backlit).** Mikoshi with carriers (Amber + Gold
  backlight, thin Gold roof rim), yagura tower (red/white drape, Amber-lit deck),
  crowd heads. Torii is the one exception: solid Vermilion with G3 glow.
- **Taiko.** Vermilion body, Steel Hi → Amber skin, Gold tacks, Ink mitsudomoe, Amber sticks, P7.

### §7.1 Reach tier recipes

| Tier | Lanterns | Fireworks | Extras | Reel frame | Shake |
|---|---|---|---|---|---|
| Normal | all unlit | none | P2 ring, a few P1 sparks, stalls at 12% light | Blue | §3.3 T2 |
| Super | ignite in sequence | 1 small Red P8 | 2 taiko + P7, "ドン!" text, stalls at 80% | Red | §3.3 T3 |
| Premium | all lit, rainbow colors | 3 giant P8 | P10 rays, mikoshi parade, crowd, stalls at 100% | Rainbow | §3.3 T4 |
| Fever | all lit, strings radiating from the yagura | 14 small + 7 giant P8, 2 P9, P11 trails | 2 torii, 2 mikoshi, full crowd, "FEVER" headline | — | §3.3 T5 |

---

## §8 Game HUD additions — PROPOSED

Components the game needed that were not in the style test. No new colors.

- **§8.1 Hold slots (保留).** Four 40px slots plus one 52px "now spinning" slot,
  separated by a Dusk bar. Each is the §2.5 swatch at small size (radius 13px / 16px,
  3px Ink border, 3px tier ring) with the tier's glow level from §3.1. Empty slot =
  Night fill, Dusk ring, G0. The rainbow slot uses the §2.3 animation. A rainbow hint
  is only ever shown on a winning hold (§2.4).
- **§8.2 Side pockets.** Same cup as the start pocket (§4.3) with a Cyan outline and
  a Cyan "+5" label. Cyan, not a rarity color, because they carry no lottery (§2.2).
- **§8.3 Toggle button "on".** The Normal button (§5.2) with its ring and glow
  switched from Cyan to Pink. It is not a Highlighted button, so the one-highlight
  rule still holds: LAUNCH is the only Highlighted button.
- **§8.4 Power meter.** 22px pill, 3px Ink border, Night track, Dusk ring. Fill is a
  Cyan → Pink gradient (the ball rim pair, §3.1) with a Cyan glow; a 3px Steel Hi
  tick marks the last launch power. The on-board launcher charge bar uses the same
  gradient. Rarity colors are deliberately not used for power (§2.2).
- **§8.5 連チャン counter.** Panel (§5.1) with a Gold border and G5-width Gold glow,
  shown only in Fever. Gold chip "FEVER フィーバー"; Pink "連チャン" heading; Gold
  italic "×"; the count at 96px italic 900 in the moving rainbow gradient (§2.3)
  with a 2px Ink stroke and a `0 4px 0` Ink drop; "残り N 回" in Amber with mono
  Cyan numerals.
- **§8.6 Toast.** Ink pill, 3px Pink border, G1 Pink glow, Steel Hi display text.
- **§8.7 Board.** Night → Indigo field with the Dusk 祭 watermark at 28% and Steel Lo
  rails carrying a 2px Cyan neon line, exactly as in style-test section 02. Board
  frame: radius 22px, 3px Ink border, Dusk ring, `0 8px 0` Ink drop (§5.1).
- **§8.8 Fever start pocket.** In Fever the gate nails move apart and a pulsing Gold
  P3 burst sits in the pocket mouth.
- **§8.9 Reach letdown.** When a Super or Premium Reach fails, the stage dims to Ink
  at 72% and shows "ざんねん…" in Muted — the only moment a cut-in loses brightness (§0.2).
- **§8.10 Board hardware (extends §8.7).** Rubber ramp where the arch meets the right
  wall: 10px Ink bar with a 5px Pink neon core, G1. One-way flap above the launch
  lane: 3px dotted Cyan line with a Cyan glow.
