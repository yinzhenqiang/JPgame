// Debug + play-test hooks. Exposed as window.pachinko; also drives ?demo= and ?autotest= URLs.
// The lottery is only ever bypassed through `force` / `enter`, which exist for staging tests.
export function installHooks(G) {
  const { state, stats, show, world, params } = G;
  const waitFor = (pred) => new Promise((res) => { const f = () => (pred() ? res() : requestAnimationFrame(f)); f(); });
  const waitGame = (sec) => { const t = state.time + sec; return waitFor(() => state.time >= t); };

  const api = {
    state, stats, show, world,
    setTimeScale: G.setTimeScale, setAuto: G.setAuto, endFever: G.endFever, launch: G.launch, waitFor,
    // queue an outcome for the next natural pocket entry: 'miss' | '<tier>-lose' | '<tier>-win' | 'jackpot'
    force(kind) { state.forced.push(kind); },
    // add a hold directly, as if a ball had just entered the start pocket
    enter(kind) { return G.addHold(kind); },
    idle() { return !show.busy && state.holds.length === 0; },
    freeze(name) { state.timeScale = 0; state.auto = false; document.title = 'READY:' + name; },
    snapshot() {
      return {
        phase: show.phase, tier: show.tier, cut: show.cut, stageT: +show.stageT.toFixed(2), digits: show.spin ? show.spin.digits : null,
        fever: { ...state.fever }, holds: state.holds.map((h) => h.hint), inPlay: world.balls.length, balls: state.balls,
        bgm: G.audio.currentBgm(), audio: G.audio.audioState(), pocketHalf: world.pocketHalf, nails: world.nails.length + world.gates.length,
        stats: JSON.parse(JSON.stringify(stats)), errors: state.errors.slice(),
      };
    },
  };

  const demos = {
    async reels() { api.enter('normal-lose'); await waitFor(() => show.phase === 'reach' && show.t > 0.6); },
    async super() { api.enter('super-lose'); await waitFor(() => show.cut && show.stageT > 2.3 && show.taikoHit > 0.7); },
    async premium() { api.enter('premium-win'); await waitFor(() => show.cut && show.stageT > 4.6); },
    async jackpot() { api.enter('premium-win'); api.setTimeScale(4); await waitFor(() => show.phase === 'jackpot'); api.setTimeScale(1); await waitFor(() => show.t > 1.6); },
    async fever() {
      api.enter('jackpot'); api.setTimeScale(6); await waitFor(() => api.idle() && state.fever.active);
      api.setTimeScale(1); api.setAuto(true); await waitGame(3.5);
    },
    async chain() {
      api.enter('jackpot'); api.setTimeScale(6); await waitFor(() => api.idle() && state.fever.active);
      api.enter('jackpot'); await waitFor(() => api.idle() && state.fever.chain === 2);
      api.setTimeScale(1); api.setAuto(true); await waitGame(3);
    },
  };
  api.demo = async (name) => { await demos[name](); api.freeze(name); };

  api.autotest = async (n, turbo = 12) => {
    api.setTimeScale(turbo); api.setAuto(true);
    await waitFor(() => stats.launched >= n);
    api.setAuto(false);
    await waitFor(() => world.balls.length === 0 && api.idle());
    api.setTimeScale(1);
    const out = api.snapshot();
    let pre = document.getElementById('autotest-result');
    if (!pre) { pre = document.createElement('pre'); pre.id = 'autotest-result'; pre.hidden = true; document.body.appendChild(pre); }
    pre.textContent = JSON.stringify(out);
    document.title = 'AUTOTEST DONE';
    return out;
  };

  window.pachinko = api;
  if (params.has('turbo')) api.setTimeScale(Number(params.get('turbo')) || 1);
  if (params.get('auto') === '1') api.setAuto(true);
  if (params.has('demo') && demos[params.get('demo')]) api.demo(params.get('demo'));
  if (params.has('autotest')) api.autotest(Number(params.get('autotest')) || 500, Number(params.get('turbo')) || 12);
}
