# 祭 NIGHT PARADE

A single-player neon-matsuri pachinko game in plain HTML + ES modules. No build step, no
downloaded assets: every model, texture and sound is generated in code (Canvas, CSS, Web Audio).
All visuals follow [`STYLE.md`](STYLE.md); game code cites its sections in comments.

## Run it

ES modules need an HTTP server (opening `index.html` from disk will not work).

**Windows, nothing to install:**

```powershell
powershell -ExecutionPolicy Bypass -File serve.ps1
```

then open <http://localhost:8130/>. Use `-Port 9000` to change the port.

**Or with any other static server**, from this folder:

```
npx serve .          # Node
python -m http.server 8130
```

## How to play

| Input | Action |
|---|---|
| Hold `Space`, the LAUNCH button, or the board | Charge the power meter; release to launch |
| `A` or AUTO | Auto-play at the last launch power |
| `M` or ♪ | Mute / unmute |
| +250 玉 | Refill when you run out of balls |

- Weak shots drop off the arch on the left; strong shots ride the arch to the pink rubber ramp on the right.
- A ball in the centre **START** pocket pays 3 balls and spins the reels. Side pockets pay 5.
- Up to 4 entries wait in the **保留 HOLD** slots. Each slot's color is a pre-read hint of its
  chance: 緑 < 青 < 赤 < 金 < 虹. Rainbow only ever appears on a winning hold.
- Two matching digits = **REACH**. Normal wins about 5%, Super about 30%, Premium about 80%.
- Three matching digits = **JACKPOT** (300 balls) and **FEVER**: 10 spins at 1/30, the start
  pocket opens wider, the backdrop becomes the fireworks festival and the BGM changes. A jackpot
  during fever raises the 連チャン counter and resets the 10 spins.

Sound starts on your first click or key press (browser autoplay rule).

## Odds

Decided at pocket entry in `js/lottery.js`; the reels and staging only present the result.
Measured over 3,000,000 simulated rolls per mode:

| | Jackpot | Normal win | Super win | Premium win | Reach per spin |
|---|---|---|---|---|---|
| Base | 1 / 297 | 5.1% | 30.5% | 80.7% | 3.8% |
| Fever | 1 / 29.9 | 5.0% | 30.2% | 80.0% | 37.5% |

Jackpots are split 50 / 30 / 20 across Normal / Super / Premium, which makes Premium Reach rare
in base play (about 1 spin in 1,200).

## Play-test

There are two runners with the same steps and checks: 500 auto balls on the real physics and
lottery, screenshots of the reels, a Super Reach, a Premium Reach and FEVER, a full
launch → reels → reach → jackpot → fever → chain-counter loop, and a failure on any console error.

```powershell
# Needs only Chrome — drives it over the DevTools protocol
powershell -ExecutionPolicy Bypass -File tests\playtest.ps1

# Playwright (needs Node.js)
npm install
npx playwright install chromium
npm test
```

Screenshots and `result.json` land in `tests/out/`.

**Status:** `tests\playtest.ps1` passes. `tests/playtest.mjs` (Playwright) has **not been run** —
Node.js was not installed on the machine this was built on, so the PowerShell runner was written
to do the same job. Treat the Playwright script as untested until it has run once.

The staged screenshots force an outcome through the debug hook (`pachinko.enter(...)` /
`pachinko.force(...)`) because a Premium Reach is too rare to wait for; the 500-ball run forces nothing.

## Debug hooks

`window.pachinko` in the console, or URL parameters:

| URL | Effect |
|---|---|
| `?seed=42` | Reproducible lottery and launch jitter |
| `?auto=1&turbo=8` | Auto-play at 8× speed |
| `?demo=reels` / `super` / `premium` / `jackpot` / `fever` / `chain` | Jump to that moment and freeze |
| `?autotest=500` | Fire 500 balls at turbo, then set the page title to `AUTOTEST DONE` |

## Layout

```
index.html          page + HUD markup
css/game.css        HUD styles (colors only via STYLE §1 custom properties)
js/style.js         STYLE.md tokens — the only file containing hex codes
js/layout.js        board geometry and nail placement
js/physics.js       ball physics (fixed 240 Hz substeps)
js/lottery.js       odds, reach tiers, hold hints
js/show.js          reel and reach sequencing
js/draw.js          drawing primitives (ball, nails, reels, lanterns, fireworks…)
js/scene.js         festival backdrop and reach / jackpot cut-ins
js/board.js         playfield renderer
js/audio.js         Web Audio synth: SFX, jingles, two BGM loops
js/main.js          state, input, game loop, HUD
js/hooks.js         debug and play-test hooks
serve.ps1           static server
tests/              play-test runners and output
style-test.html     the approved art style test page
```

## Known limits

- STYLE.md §3.3 (shake), §3.4 (timing) and §8 (HUD additions) are still marked PROPOSED and want a review in motion.
- In fever the fireworks sky is only visible beside the board; the playfield itself stays opaque.
- Balls that stall on a nail get a nudge after 0.6 s, and are removed after 45 s as a last resort.
- Audio has been exercised only in muted headless Chrome; it has not been listened to.
