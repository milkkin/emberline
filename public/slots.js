'use strict';
// Emberline slots — canvas renderer, effects, sound and round presentation.
// The server decides every round; this file only animates the result it sends back.
(() => {
  const E = SlotEngine, A = SlotArt, SC = E.SC, TAU = Math.PI * 2;
  const clamp = (x, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, x));
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pickOne = (arr) => arr[(Math.random() * arr.length) | 0];
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeOutBack = (u) => 1 + 2.70158 * Math.pow(u - 1, 3) + 1.70158 * Math.pow(u - 1, 2);
  const BET_USD = [0.2, 0.4, 0.6, 0.8, 1, 1.5, 2, 3, 4, 5, 8, 10, 15, 20, 25, 40, 50, 75, 100];
  // celebration tiers, as multiples of the amount staked on the round
  const WIN_TIERS = [[10, 'BIG WIN'], [50, 'MEGA WIN'], [250, 'EPIC WIN'], [1000, 'INSANE WIN'], [5000, 'LEGENDARY WIN']];
  const SLOT_IDS = Object.keys(E.SLOTS);
  const mechanic = (cfg) => [
    cfg.fs.sticky && 'wild reels stick until the bonus ends',
    cfg.fs.walk && 'wild reels walk one reel left each spin and gain +1 multiplier per step',
    cfg.fs.ladder && 'every wild reel that lands adds +1 to a win multiplier that never resets',
    cfg.type === 'tumble' && (cfg.chain ? 'every winning tumble adds to a multiplier that never resets' : 'every multiplier block adds to a total multiplier that never resets'),
  ].filter(Boolean).join('; ');

  // ---------- synthesised sound (no audio files) ----------
  const Sfx = (() => {
    let ctx = null, master = null, muted = store.get('slotMute') === '1';
    function init() {
      if (ctx || muted) return;
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        ctx = new AC();
        master = ctx.createGain(); master.gain.value = 0.2; master.connect(ctx.destination);
      } catch { ctx = null; }
    }
    function tone(freq, dur, { type = 'sine', vol = 0.5, at = 0, slide = 0 } = {}) {
      if (!ctx || muted) return;
      try {
        const t = ctx.currentTime + at, o = ctx.createOscillator(), g = ctx.createGain();
        o.type = type; o.frequency.setValueAtTime(freq, t);
        if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * slide), t + dur);
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.03);
      } catch {}
    }
    function noise(dur, { vol = 0.3, at = 0, freq = 2000, slide = 0 } = {}) {
      if (!ctx || muted) return;
      try {
        const t = ctx.currentTime + at, n = Math.floor(ctx.sampleRate * dur), buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
        for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
        const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
        src.buffer = buf; f.type = 'bandpass'; f.frequency.setValueAtTime(freq, t);
        if (slide) f.frequency.exponentialRampToValueAtTime(freq * slide, t + dur);
        g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        src.connect(f); f.connect(g); g.connect(master); src.start(t);
      } catch {}
    }
    const semi = (base, s) => base * Math.pow(2, s / 12);
    const PENTA = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24, 26, 28];
    return {
      init,
      get muted() { return muted; },
      toggle() { muted = !muted; store.set('slotMute', muted ? '1' : null); if (!muted) init(); return muted; },
      click: () => tone(900, 0.04, { type: 'square', vol: 0.1 }),
      spin: () => noise(0.4, { vol: 0.14, freq: 400, slide: 5 }),
      stop: (i) => { tone(150 - i * 7, 0.1, { vol: 0.55, slide: 0.5 }); noise(0.04, { vol: 0.1, freq: 3200 }); },
      scatter: (n) => [0, 1, 2].forEach((k) => tone(semi(523, PENTA[Math.min(12, n * 2 + k)]), 0.3, { type: 'triangle', vol: 0.32, at: k * 0.06 })),
      antic: () => { for (let k = 0; k < 11; k++) tone(280 + k * 48, 0.09, { type: 'sawtooth', vol: 0.06, at: k * 0.085 }); },
      wild: (k) => { tone(semi(880, k * 2), 0.34, { type: 'sawtooth', vol: 0.2, slide: 0.25 }); noise(0.32, { vol: 0.24, freq: 5200, slide: 0.2 }); tone(105, 0.32, { vol: 0.55, slide: 0.5 }); },
      walk: () => noise(0.3, { vol: 0.16, freq: 900, slide: 3 }),
      win: (level) => { for (let k = 0; k < 3 + level * 2; k++) tone(semi(523, PENTA[k + level]), 0.17, { type: 'triangle', vol: 0.28, at: k * 0.07 }); },
      coin: () => tone(rnd(1500, 2600), 0.05, { type: 'square', vol: 0.045 }),
      tierUp: (i) => { [0, 4, 7, 12].forEach((s, k) => tone(semi(392, s + i * 2), 0.55, { type: 'sawtooth', vol: 0.15, at: k * 0.05 })); noise(0.55, { vol: 0.3, freq: 700, slide: 7 }); tone(68, 0.55, { vol: 0.75, slide: 0.5 }); },
      bonus: () => [0, 4, 7, 12, 16, 19, 24].forEach((s, k) => tone(semi(330, s), 0.36, { type: 'square', vol: 0.12, at: k * 0.09 })),
      mult: (g) => tone(300 + Math.min(g, 30) * 42, 0.2, { type: 'square', vol: 0.16, slide: 1.6 }),
    };
  })();

  // ---------- the slot view ----------
  function mount(root, live, id) {
    const cfg = E.SLOTS[id], th = A.THEMES[id], N = cfg.reels, R = cfg.rows, capU = cfg.cap * 100;
    const all = Array.from({ length: N }, (_, i) => i);
    const ways = Math.pow(R, N);
    const tumble = cfg.type === 'tumble';
    let tblocks = []; // multiplier blocks on the grid (tumbling slots)
    let chainNow = 1; // running multiplier of chain slots
    const randSym = () => (Math.random() < 0.035 ? SC : (Math.random() * 9) | 0);
    const randCol = () => Array.from({ length: R }, () => (Math.random() * 9) | 0);

    // ---- DOM ----
    const canvas = h('canvas', { class: 'slot-canvas', 'aria-label': `${cfg.name} slot machine` });
    const ctx = canvas.getContext('2d');
    const betLabel = h('b', { class: 'mono' }), betUsd = h('small');
    const spinSub = h('small');
    const spinBtn = h('button', { class: 'slot-spin', onclick: () => trigger() }, h('span', {}, 'SPIN'), spinSub);
    const featBtn = h('button', { class: 'slot-opt', onclick: toggleFeature, 'aria-pressed': 'false' }, h('b', {}, tumble ? (id === 'oracle' ? 'SIGIL SPIN' : 'RUNE SPIN') : 'WILD SPIN'), h('small', {}, tumble ? (cfg.chain ? `${cfg.cost.feature}× bet · multiplier starts at ×${cfg.featureChain}` : `${cfg.cost.feature}× bet · a multiplier block every spin`) : `${cfg.cost.feature}× bet · ${cfg.featureWilds}+ wild reels every spin`));
    const buyBtn = h('button', { class: 'slot-opt buy', onclick: buyBonus }, h('b', {}, 'BUY BONUS'), h('small', {}, `from ${cfg.cost.bonus}× bet · 4 bonus types`));
    const turboBtn = h('button', { class: 'slot-mini', onclick: () => { turbo = !turbo; store.set('slotTurbo', turbo ? '1' : null); syncUi(); } }, 'Turbo');
    const autoBtn = h('button', { class: 'slot-mini', onclick: () => { auto = !auto; syncUi(); if (auto && !busy) trigger(); } }, 'Auto');
    const soundBtn = h('button', { class: 'slot-mini', onclick: () => { Sfx.toggle(); syncUi(); } }, 'Sound');
    const infoBtn = h('button', { class: 'slot-mini', onclick: paytable }, 'Paytable');
    root.append(h('div', { class: 'slot' },
      h('div', { class: 'slot-stage' }, canvas),
      h('div', { class: 'slot-bar' },
        h('div', { class: 'slot-bet' },
          h('button', { class: 'slot-step', onclick: () => stepBet(-1), 'aria-label': 'Lower bet' }, '−'),
          h('div', {}, h('small', {}, 'BET'), betLabel, betUsd),
          h('button', { class: 'slot-step', onclick: () => stepBet(1), 'aria-label': 'Raise bet' }, '+')),
        featBtn, buyBtn, spinBtn,
        h('div', { class: 'slot-minis' }, turboBtn, autoBtn, soundBtn, infoBtn))));

    // ---- state ----
    let lay = null, T = 0, clock = performance.now(), last = clock;
    let busy = false, auto = false, feature = false, skipping = false, turbo = store.get('slotTurbo') === '1';
    let betIdx = clamp(Number(store.get('slotBet') ?? 4) | 0, 0, BET_USD.length - 1);
    let fs = null, bonusMix = 0, hi = null, banner = null, bubble = null, deadSpins = 0;
    let winShown = 0, winTarget = 0, shakeMag = 0, flashA = 0, flashCol = '#fff';
    let pillars = [];
    const parts = [], amb = [], pops = [], bolts = [], waits = [];
    const an = { cast: 0, joy: 0, hype: 0, antic: 0, look: 0.4, blink: false, castT: 0, joyT: 0, hypeT: 0, anticT: 0, nextBlink: 2, blinkT: 0 };
    const reels = all.map(() => ({ mode: 'idle', pos: Math.random() * 24, vel: 0, velT: 0, delay: 0, col: randCol(), next: null, fill: null, strip: Array.from({ length: 24 }, randSym), t0: 0, dur: 0, land: -9, antic: 0 }));

    const rate = () => (skipping ? 0.12 : turbo ? 0.45 : 1);
    const wait = (ms) => new Promise((res) => { if (!live.on) return res(); waits.push({ at: clock + ms * rate(), res }); });
    const betAmount = () => Number((BET_USD[betIdx] / cur().rate).toFixed(cur().dp));
    const money = (x) => `${fmt(x)} ${state.cur}`;
    const cellX = (i) => lay.rx + (i + 0.5) * lay.cell, cellY = (row) => lay.ry + (row + 0.5) * lay.cell;

    function syncUi() {
      const bet = betAmount(), cost = feature ? cfg.cost.feature : 1;
      betLabel.textContent = money(bet);
      betUsd.textContent = '$' + BET_USD[betIdx].toFixed(2);
      spinSub.textContent = busy ? 'tap to skip' : money(bet * cost);
      spinBtn.classList.toggle('busy', busy);
      featBtn.classList.toggle('on', feature); featBtn.setAttribute('aria-pressed', String(feature));
      turboBtn.classList.toggle('on', turbo); autoBtn.classList.toggle('on', auto); soundBtn.classList.toggle('on', !Sfx.muted);
      autoBtn.textContent = auto ? 'Auto: on' : 'Auto';
      soundBtn.textContent = Sfx.muted ? 'Sound: off' : 'Sound: on';
      buyBtn.disabled = busy; featBtn.disabled = busy;
    }
    function stepBet(d) { if (busy) return; betIdx = clamp(betIdx + d, 0, BET_USD.length - 1); store.set('slotBet', String(betIdx)); Sfx.init(); Sfx.click(); syncUi(); }
    function toggleFeature() { if (busy) return; feature = !feature; Sfx.init(); Sfx.click(); syncUi(); if (feature) say(tumble ? (cfg.chain ? `Multiplier starts at ×${cfg.featureChain}!` : 'A multiplier block, every spin!') : `${cfg.featureWilds}+ wild reels, every spin!`, 2200); }
    function buyBonus() {
      if (busy || needLogin()) return;
      const bet = betAmount(), sc0 = tumble ? 4 : 3;
      const level = (l) => `${sc0 + l} scatters · ${cfg.fs.spins[l]} free spins` + (E.LEVEL_MIN[l] ? ` · at least ${E.LEVEL_MIN[l]}× bet guaranteed` : '');
      const opts = [['bonus', 'Bonus', level(0)], ['enhanced', 'Enhanced bonus', level(1)], ['super', 'Super bonus', level(2)], ['mystery', 'Mystery bonus', 'awards a Bonus, Enhanced or Super bonus at random']];
      const close = modal(`Buy ${cfg.name} bonus`, h('div', {},
        h('p', { class: 'hint' }, `During free spins ${mechanic(cfg)}. Every option returns about 96% of its price on average; most bonuses pay back less than they cost.`),
        ...opts.map(([mode, name, desc]) => h('button', { class: 'slot-opt buy buy-row', onclick: () => { close(); doSpin(mode); } },
          h('b', {}, `${name} — ${money(bet * cfg.cost[mode])}`), h('small', {}, `${cfg.cost[mode]}× bet · ${desc}`)))));
    }
    // intro banner for free spins; extra scatters upgrade the bonus
    function bonusBanner(first) {
      const lvl = Math.max(0, cfg.fs.spins.indexOf(first.fs));
      if (lvl) say(E.LEVEL_NAME[lvl].toUpperCase() + '!', 2400);
      return showBanner({ title: lvl ? `${E.LEVEL_NAME[lvl].toUpperCase().replace(' BONUS', '')} · ${first.fs} FREE SPINS` : `${first.fs} FREE SPINS`, sub: (lvl ? `Guaranteed at least ${E.LEVEL_MIN[lvl]}× bet. ` : '') + mechanic(cfg) }, lvl ? 2600 : 2100);
    }
    function paytableTumble() {
      const meta = E.MATH[id].meta, odds = (x) => (x ? `1 in ${x.toLocaleString('en-US')}` : 'not reachable');
      const row = (sym) => {
        const cv = h('canvas', { width: 96, height: 96, class: 'pay-sym' });
        cv.getContext('2d').drawImage(A.sprite(id, sym, 96), 0, 0);
        return h('div', { class: 'pay-row' }, cv, h('div', { class: 'mono' }, ...cfg.pays[sym].map((p, k) => h('div', {}, ['8–9  ', '10–11  ', '12+  '][k], h('b', {}, (p / 100).toFixed(2) + '×')))));
      };
      const sc = h('canvas', { width: 96, height: 96, class: 'pay-sym' });
      sc.getContext('2d').drawImage(A.sprite(id, SC, 96), 0, 0);
      modal(`${cfg.name} — paytable`, h('div', { class: 'pay' },
        h('p', { class: 'hint' }, `${N}×${R} grid. 8 or more matching symbols anywhere pay, as a multiple of your bet. Max win ${cfg.cap.toLocaleString('en-US')}× bet.`),
        h('div', { class: 'pay-grid' }, ...[8, 7, 6, 5, 4, 3, 2, 1, 0].map(row)),
        h('h4', {}, 'Tumbles'),
        h('p', {}, 'Winning symbols shatter and new ones fall in. This repeats until no new win forms; all wins from one spin are added together.'),
        h('h4', {}, cfg.chain ? 'Sigil multiplier' : 'Multiplier blocks'),
        h('p', {}, cfg.chain ? `Every winning tumble adds a sigil worth ${cfg.mults.map((m) => '+' + m).join(', ')} to the multiplier, which applies to the tumbles that follow. It starts at ×1 and resets after each spin.` : `2×2 blocks carrying ${cfg.mults.map((m) => '×' + m).join(', ')} can land on any spin. A spin's total win is multiplied by the sum of the blocks on the grid.`),
        h('h4', {}, 'Free spins'),
        h('div', { class: 'pay-row' }, sc, h('div', {}, h('div', {}, `4, 5 or 6 scatters award ${cfg.fs.spins.join(', ')} free spins.`), h('div', {}, cfg.chain ? 'In free spins the sigil multiplier never resets: it carries from spin to spin.' : 'In free spins every block adds to a total multiplier that never resets and applies to every win.'))),
        h('h4', {}, 'Feature spins'),
        h('p', {}, `${cfg.chain ? 'Sigil' : 'Rune'} Spin costs ${cfg.cost.feature}× bet and ${cfg.chain ? 'starts the multiplier at ×' + cfg.featureChain : 'guarantees a multiplier block on that spin'} (no scatters). Buy Bonus costs ${cfg.cost.bonus}× bet and starts free spins immediately. Enhanced (${cfg.cost.enhanced}×) and Super (${cfg.cost.super}×) bonuses start with one or two extra scatters: more free spins and a guaranteed minimum of ${E.LEVEL_MIN[1]}× and ${E.LEVEL_MIN[2]}× bet. Mystery (${cfg.cost.mystery}×) awards one of the three at random. Landing extra scatters on a normal spin upgrades the bonus the same way.`),
        h('h4', {}, 'Odds'),
        h('div', { class: 'stats', style: 'margin-top:0' },
          h('div', { class: 'stat' }, h('small', {}, 'RTP (spin / rune / buy)'), h('b', {}, ['base', 'feature', 'bonus'].map((m) => (meta.rtp[m] * 100).toFixed(1) + '%').join(' / '))),
          h('div', { class: 'stat' }, h('small', {}, 'Any win on a spin'), h('b', {}, (meta.hit * 100).toFixed(1) + '%')),
          h('div', { class: 'stat' }, h('small', {}, 'Bonus trigger'), h('b', {}, `1 in ${meta.bonusOdds}`))),
        h('p', { class: 'hint' }, `Max win odds — spin: ${odds(meta.maxOdds.base)}; rune spin: ${odds(meta.maxOdds.feature)}; bought bonus: ${odds(meta.maxOdds.bonus)}. Every round is derived from your seed pair and can be recomputed in the Fairness panel.`)), true);
    }
    function paytable() {
      if (tumble) return paytableTumble();
      const meta = E.MATH[id].meta, n = cfg.pays[0].length, odds = (x) => (x ? `1 in ${x.toLocaleString('en-US')}` : 'not reachable');
      const row = (sym) => {
        const cv = h('canvas', { width: 96, height: 96, class: 'pay-sym' });
        cv.getContext('2d').drawImage(A.sprite(id, sym, 96), 0, 0);
        return h('div', { class: 'pay-row' }, cv, h('div', { class: 'mono' }, ...cfg.pays[sym].map((p, k) => h('div', {}, `${k + 3} reels  `, h('b', {}, (p / 100).toFixed(2) + '×')))));
      };
      const sc = h('canvas', { width: 96, height: 96, class: 'pay-sym' });
      sc.getContext('2d').drawImage(A.sprite(id, SC, 96), 0, 0);
      modal(`${cfg.name} — paytable`, h('div', { class: 'pay' },
        h('p', { class: 'hint' }, `${N}×${R} reels, ${ways.toLocaleString('en-US')} ways. Wins pay left to right on adjacent reels, per way, as a multiple of your bet. Max win ${cfg.cap.toLocaleString('en-US')}× bet.`),
        h('div', { class: 'pay-grid' }, ...[8, 7, 6, 5, 4, 3, 2, 1, 0].map(row)),
        h('h4', {}, 'Wild reels'),
        h('p', {}, `A wild reel covers the whole reel and counts as every symbol. Wild reels can carry multipliers (${cfg.mults.filter((m) => m > 1).map((m) => '×' + m).join(', ')}); in one win they ${cfg.multMode === 'mul' ? 'multiply each other' : 'add together'}.`),
        cfg.ability && h('h4', {}, cfg.abilityName), cfg.ability && h('p', {}, cfg.abilityText),
        h('h4', {}, 'Free spins'),
        h('div', { class: 'pay-row' }, sc, h('div', {}, h('div', {}, `3, 4 or 5 scatters award ${cfg.fs.spins.join(', ')} free spins.`), h('div', {}, `In free spins ${mechanic(cfg)}.`))),
        h('h4', {}, 'Feature spins'),
        h('p', {}, `Wild Spin costs ${cfg.cost.feature}× bet and guarantees at least ${cfg.featureWilds} wild reels on that spin (no scatters). Buy Bonus costs ${cfg.cost.bonus}× bet and starts free spins immediately. Enhanced (${cfg.cost.enhanced}×) and Super (${cfg.cost.super}×) bonuses start with one or two extra scatters: more free spins and a guaranteed minimum of ${E.LEVEL_MIN[1]}× and ${E.LEVEL_MIN[2]}× bet. Mystery (${cfg.cost.mystery}×) awards one of the three at random. Landing extra scatters on a normal spin upgrades the bonus the same way.`),
        h('h4', {}, 'Odds'),
        h('div', { class: 'stats', style: 'margin-top:0' },
          h('div', { class: 'stat' }, h('small', {}, 'RTP (spin / wild / buy)'), h('b', {}, ['base', 'feature', 'bonus'].map((m) => (meta.rtp[m] * 100).toFixed(1) + '%').join(' / '))),
          h('div', { class: 'stat' }, h('small', {}, 'Any win on a spin'), h('b', {}, (meta.hit * 100).toFixed(1) + '%')),
          h('div', { class: 'stat' }, h('small', {}, 'Bonus trigger'), h('b', {}, `1 in ${meta.bonusOdds}`))),
        h('p', { class: 'hint' }, `Max win odds — spin: ${odds(meta.maxOdds.base)}; wild spin: ${odds(meta.maxOdds.feature)}; bought bonus: ${odds(meta.maxOdds.bonus)}. Every round is derived from your seed pair and can be recomputed in the Fairness panel.`)), true);
    }

    // ---- layout ----
    function resize() {
      const W = canvas.clientWidth;
      if (!W) return;
      const mobile = W < 620, H = Math.round(mobile ? W * 1.16 : W * 0.56), dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.style.height = H + 'px';
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      const L = { w: W, h: H, dpr, mobile, unit: mobile ? W * 1.75 : W };
      if (mobile) {
        const top = H * 0.27, bottom = H * 0.1;
        L.cell = Math.floor(Math.min((W * 0.95) / N, (H - top - bottom) / R));
        L.rx = (W - L.cell * N) / 2; L.ry = top + (H - top - bottom - L.cell * R) / 2;
        L.chS = top * 0.3; L.chX = W * 0.2; L.chY = top * 0.52;
      } else {
        const zx = W * 0.3, zw = W * 0.68, zy = H * 0.105, zh = H * 0.775;
        L.cell = Math.floor(Math.min(zw / N, zh / R));
        L.rx = zx + (zw - L.cell * N) / 2; L.ry = zy + (zh - L.cell * R) / 2;
        L.chS = Math.min(W * 0.112, H * 0.27); L.chX = W * 0.148; L.chY = H * 0.56;
      }
      L.chS *= th.chScale || 1;
      L.rw = L.cell * N; L.rh = L.cell * R; L.px = Math.round(L.cell * dpr);
      L.bg = A.background(id, W, H, dpr);
      lay = L;
    }

    // ---- effects ----
    function spawn(p) { if (parts.length < 1100) parts.push(Object.assign({ age: 0, g: 0, rot: 0, vr: 0, add: true }, p)); }
    function burst(x, y, n, o = {}) {
      for (let i = 0; i < n; i++) {
        const a = rnd(0, TAU), v = rnd(o.v0 ?? 40, o.v1 ?? 260);
        spawn({ type: o.type || 'spark', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - (o.up ?? 0), g: o.g ?? 240, life: rnd(0.35, o.life ?? 0.9), size: rnd(1.5, o.size ?? 4), col: pickOne(o.cols || [th.accent, th.accent2, '#ffffff']) });
      }
    }
    function coins(n) {
      for (let i = 0; i < n; i++) spawn({ type: 'coin', x: lay.w * rnd(0.3, 0.7), y: lay.h + 10, vx: rnd(-260, 260), vy: -rnd(lay.h * 1.0, lay.h * 1.9), g: lay.h * 2.2, life: rnd(1.4, 2.4), size: rnd(5, 11) * (lay.unit / 900), rot: rnd(0, TAU), vr: rnd(-12, 12), add: false });
    }
    function confetti(n) {
      for (let i = 0; i < n; i++) spawn({ type: 'conf', x: rnd(0, lay.w), y: -10, vx: rnd(-60, 60), vy: rnd(80, 320), g: 120, life: rnd(1.6, 3), size: rnd(4, 9), rot: rnd(0, TAU), vr: rnd(-9, 9), col: pickOne([th.accent, th.accent2, '#ffffff', '#ffe84a', '#ff5fa8', '#7af7ff']), add: false });
    }
    const shake = (m) => { shakeMag = Math.max(shakeMag, m * (lay.unit / 900)); };
    const flash = (col, a) => { flashCol = col; flashA = Math.max(flashA, a); };
    function say(text, ms = 1700) { bubble = { text, t0: T, until: T + ms / 1000 }; }
    function popup(text, level) { pops.push({ text, x: lay.rx + lay.rw / 2, y: lay.ry + lay.rh * 0.5, t0: T, level }); }
    function boltTo(col) {
      const from = [lay.chX + lay.chS * 1.05, lay.chY - lay.chS * 0.3];
      bolts.push({ from, to: [cellX(col), lay.ry + lay.rh * 0.12], t0: T }, { from, to: [cellX(col), lay.ry + lay.rh * 0.88], t0: T });
    }
    function skip() {
      if (!busy) return;
      skipping = true;
      if (banner && banner.kind === 'win' && T - banner.t0 < banner.dur) banner.t0 = T - banner.dur;
      const hold = banner ? 650 : 30;
      for (const w of waits) w.at = Math.min(w.at, clock + hold);
      for (const r of reels) if (r.mode === 'stop') r.dur = Math.min(r.dur, 90);
    }

    // ---- reels ----
    function spinReels(list) {
      list.forEach((i, k) => { const r = reels[i]; r.mode = 'spin'; r.vel = 0; r.velT = turbo ? 40 : 29; r.delay = k * (turbo ? 0.012 : 0.045); r.antic = 0; });
    }
    function stopReel(i, col) {
      const r = reels[i], base = Math.floor(r.pos);
      r.fill = [];
      for (let k = -1; k <= R; k++) r.fill.push(r.strip[(((base - k) % 24) + 24) % 24]);
      r.mode = 'stop'; r.drop = null; r.next = col.slice(); r.t0 = clock; r.dur = 370 * rate();
    }
    function landed(i) {
      const r = reels[i];
      Sfx.stop(i);
      const row = r.col.indexOf(SC);
      if (row >= 0) {
        const n = reels.filter((q, k) => k <= i && q.mode === 'idle' && q.col.includes(SC)).length;
        Sfx.scatter(n); burst(cellX(i), cellY(row), 22, { cols: [th.accent2, '#ffffff', '#ffe27a'] });
        an.joyT = Math.max(an.joyT, 0.4);
      }
    }
    // what the reels show when they stop, before a signature ability rewrites cells
    function preGrid(sp) {
      if (!sp.ab) return sp.g;
      const g0 = sp.g.map((col) => col.slice());
      for (const [r, row, old] of sp.ab.cells) g0[r][row] = sp.ab.type === 'mystery' ? 10 : old;
      return g0;
    }
    async function showAbility(sp) {
      const ab = sp.ab;
      if (!ab) return;
      an.castT = 0.9; an.hypeT = Math.max(an.hypeT, 0.6);
      say(pickOne(th.quotes.wild), 1500);
      const cells = new Set(ab.cells.map(([r, row]) => r + ',' + row));
      if (ab.type === 'clone') { for (let r = 0; r < ab.reels; r++) for (let row = 0; row < R; row++) cells.add(r + ',' + row); popup(`${ab.reels} REELS LINKED`, 2); }
      hi = { cells, wilds: new Set(), t0: T };
      Sfx.walk();
      await wait(700);
      hi = null;
      flash(ab.type === 'scorch' ? '#ff7a1f' : th.wild[0], 0.35); shake(8); Sfx.wild(1);
      for (const [r, row] of ab.cells) burst(cellX(r), cellY(row), 12, { v1: 300, cols: ab.type === 'scorch' ? ['#ffd24a', '#ff7a1f', '#ffffff'] : th.wild.concat('#ffffff') });
      reels.forEach((r, i) => { if (r.mode === 'idle') r.col = sp.g[i].slice(); });
      await wait(430);
    }
    async function landReels(sp, list, tease) {
      const g0 = preGrid(sp);
      let sc = 0;
      for (const i of list) {
        if (tease && sc >= (tumble ? 3 : 2) && !skipping) { reels[i].antic = 1; an.anticT = 1.3; Sfx.antic(); await wait(turbo ? 1500 : 950); }
        stopReel(i, g0[i]);
        if (g0[i].includes(SC)) sc++;
        await wait(150);
      }
      await wait(330);
      for (const r of reels) r.antic = 0;
      // a skipped round can outrun the stop animation: make sure every reel shows its result
      for (const i of list) if (reels[i].mode !== 'idle') { reels[i].mode = 'idle'; reels[i].col = g0[i].slice(); }
    }
    function clearPillars() { for (const p of pillars) if (!p.dying) p.dying = T; }
    async function walkPillars() {
      const alive = pillars.filter((p) => !p.dying);
      if (!alive.length) return;
      for (const p of alive) { p.from = p.col; p.to = p.col - 1; p.mt0 = clock; p.mdur = 320 * rate(); }
      Sfx.walk();
      await wait(340);
      pillars = pillars.filter((p) => p.dying || p.to >= 0);
      for (const p of pillars) if (p.from != null) { p.col = p.to; p.from = null; p.mult += 1; p.bump = T; }
    }
    async function showWilds(sp, cols) {
      let k = 0;
      for (const col of cols) {
        an.castT = 0.55; boltTo(col); Sfx.wild(k++);
        pillars.push({ col, mult: sp.w[col], born: T, from: null, bump: -9 });
        shake(8); flash(th.wild[0], 0.22);
        for (let j = 0; j < 34; j++) spawn({ type: 'spark', x: cellX(col) + rnd(-0.4, 0.4) * lay.cell, y: lay.ry + rnd(0, lay.rh), vx: rnd(-240, 240), vy: rnd(-260, 120), g: 260, life: rnd(0.4, 1), size: rnd(2, 5), col: pickOne(th.wild.concat('#ffffff')) });
        if (fs && cfg.fs.ladder) { fs.G += cfg.fs.ladder; fs.bump = T; Sfx.mult(fs.G); }
        if (k === 1 && Math.random() < 0.6) say(pickOne(th.quotes.wild));
        await wait(330);
      }
      if (cols.length) await wait(220);
    }
    async function showWins(sp, bet) {
      if (!sp.win) return;
      const cells = new Set(), wilds = new Set();
      for (const [s, k] of sp.wins) {
        for (let r = 0; r < k; r++) {
          if (sp.w[r]) wilds.add(r); else sp.g[r].forEach((v, row) => { if (v === s) cells.add(r + ',' + row); });
        }
      }
      hi = { cells, wilds, t0: T };
      const x = sp.win / 100, amount = x * bet, level = x >= 50 ? 3 : x >= 10 ? 2 : x >= 2 ? 1 : 0;
      Sfx.win(level);
      an.joyT = Math.max(an.joyT, 0.8 + level * 0.5);
      if (level >= 2) { an.hypeT = Math.max(an.hypeT, 1.2); shake(4 + level * 3); flash(th.accent, 0.12 * level); }
      winTarget += amount;
      popup('+' + money(amount), level);
      let n = 0;
      for (const key of cells) { if (n++ > 36) break; const [r, row] = key.split(',').map(Number); burst(cellX(r), cellY(row), 4 + level * 3, { v1: 180 + level * 60 }); }
      for (const r of wilds) burst(cellX(r), lay.ry + lay.rh / 2, 14 + level * 6, { v1: 320, cols: th.wild.concat('#ffffff') });
      if (level >= 1 && Math.random() < 0.5) say(pickOne(th.quotes.win));
      await wait(560 + level * 330);
      hi = null;
    }
    async function showBanner(o, ms) { banner = Object.assign({ kind: 'info', t0: T }, o); await wait(ms); banner = null; }

    async function freeSpin(sp, bet) {
      skipping = false;
      const fresh = sp.fresh || [];
      const held = all.filter((i) => sp.w[i] && !fresh.includes(i));
      if (cfg.fs.walk) await walkPillars(); else if (!cfg.fs.sticky) clearPillars();
      const list = all.filter((i) => !held.includes(i));
      spinReels(list); Sfx.spin();
      await wait(430);
      await landReels(sp, list, false);
      await showAbility(sp);
      await showWilds(sp, fresh);
      if (fs) fs.G = sp.G;
      await showWins(sp, bet);
    }

    // ---- tumbling slots ----
    async function tumbleSpin(sp, bet, tease) {
      await landReels(sp, all, tease);
      for (const [col, row, m] of sp.blocks) {
        an.castT = 0.8;
        if (Math.random() < 0.5) say(pickOne(th.quotes.wild));
        await wait(260);
        tblocks.push({ col, row, mult: m, born: T, from: [lay.chX, lay.chY - lay.chS * 1.6], hit: false, pulse: -9 });
        await wait(430);
        if (fs) { fs.G += m; fs.bump = T; Sfx.mult(fs.G); }
      }
      let k = 0;
      if (cfg.chain) chainNow = sp.steps.length ? sp.steps[0].m : sp.chain;
      for (const st of sp.steps) {
        const syms = new Set(st.wins.map((w) => w[0])), cells = new Set();
        reels.forEach((r, i) => r.col.forEach((v, row) => { if (syms.has(v)) cells.add(i + ',' + row); }));
        hi = { cells, wilds: new Set(), t0: T };
        Sfx.win(Math.min(3, k)); an.joyT = Math.max(an.joyT, 0.7);
        popup('+' + money((st.wins.reduce((a, w) => a + w[2], 0) / 100) * bet * (st.m || 1)) + (st.m > 1 ? `  (×${st.m})` : ''), Math.min(2, k));
        await wait(540);
        hi = null;
        for (const key of cells) { const [i, row] = key.split(',').map(Number); burst(cellX(i), cellY(row), 10, { v1: 280, cols: [th.accent, '#ffffff', th.lows[0]] }); }
        Sfx.stop(k); shake(3 + k * 1.5);
        reels.forEach((r, i) => {
          const free = [], keep = [];
          r.col.forEach((v, row) => { if (v !== E.BLOCK) { free.push(row); if (!syms.has(v)) keep.push(row); } });
          const fresh = free.length - keep.length, drop = new Float32Array(R);
          free.forEach((row, j) => { drop[row] = j < fresh ? -(fresh + 0.6) : keep[j - fresh] - row; });
          r.col = st.g[i].slice(); r.drop = drop;
        });
        if (cfg.chain) { chainNow = sp.steps[k + 1] ? sp.steps[k + 1].m : sp.chain; an.castT = 0.5; Sfx.mult(chainNow); if (fs) { fs.G = chainNow; fs.bump = T; } }
        await wait(420);
        k++;
      }
      if (sp.win) {
        if (sp.M > 1) {
          for (const b of tblocks) b.pulse = T;
          Sfx.mult(sp.M); popup('×' + sp.M, 3); shake(9); flash(th.wild[0], 0.25); an.hypeT = Math.max(an.hypeT, 1.1);
          await wait(650);
        }
        const amount = (sp.win / 100) * bet;
        winTarget += amount;
        if (sp.M > 1) popup(money(amount), 3);
        if (Math.random() < 0.4) say(pickOne(th.quotes.win));
        await wait(480);
      }
    }
    async function presentTumble(res, bet, cost) {
      const spins = res.round.spins, first = spins[0], bonus = spins.length > 1;
      await tumbleSpin(first, bet, true);
      if (bonus) {
        const cells = new Set();
        reels.forEach((r, i) => r.col.forEach((v, row) => { if (v === SC) cells.add(i + ',' + row); }));
        hi = { cells, wilds: new Set(), t0: T };
        Sfx.bonus(); an.hypeT = 2.4; flash('#ffffff', 0.5); shake(12); say(pickOne(th.quotes.bonus), 2400);
        for (const key of cells) { const [i, row] = key.split(',').map(Number); burst(cellX(i), cellY(row), 40, { v1: 420, life: 1.3, cols: [th.accent, th.accent2, '#ffffff'] }); }
        await wait(1200);
        hi = null;
        await bonusBanner(first);
        fs = { i: 0, n: first.fs, G: 0, bump: -9 };
        let total = first.win;
        for (let i = 1; i < spins.length && live.on; i++) {
          fs.i = i; skipping = false; tblocks = [];
          spinReels(all); Sfx.spin();
          await wait(430);
          await tumbleSpin(spins[i], bet, false);
          fs.G = spins[i].T;
          total += spins[i].win;
          if (total >= capU) break;
        }
        await wait(450);
        fs = null;
      }
      const amount = (res.round.units / 100) * bet;
      winTarget = amount;
      await celebrate(amount, res.round.units / 100 / cost, res.round.capped, bonus);
    }

    async function present(res, bet, cost) {
      if (tumble) return presentTumble(res, bet, cost);
      const spins = res.round.spins, first = spins[0], bonus = spins.length > 1;
      await landReels(first, all, true);
      await showAbility(first);
      await showWilds(first, all.filter((i) => first.w[i]));
      await showWins(first, bet);
      if (bonus) {
        const cells = new Set();
        first.g.forEach((col, r) => col.forEach((v, row) => { if (v === SC) cells.add(r + ',' + row); }));
        hi = { cells, wilds: new Set(), t0: T };
        Sfx.bonus(); an.hypeT = 2.4; flash('#ffffff', 0.5); shake(12); say(pickOne(th.quotes.bonus), 2400);
        for (const key of cells) { const [r, row] = key.split(',').map(Number); burst(cellX(r), cellY(row), 40, { v1: 420, life: 1.3, cols: [th.accent, th.accent2, '#ffffff', '#ffe27a'] }); }
        await wait(1200);
        hi = null;
        await bonusBanner(first);
        clearPillars();
        fs = { i: 0, n: first.fs, G: 1, bump: -9 };
        let total = first.win;
        for (let i = 1; i < spins.length && live.on; i++) {
          fs.i = i;
          await freeSpin(spins[i], bet);
          total += spins[i].win;
          if (total >= capU) break;
        }
        await wait(450);
        fs = null; clearPillars();
      }
      const amount = (res.round.units / 100) * bet;
      winTarget = amount;
      await celebrate(amount, res.round.units / 100 / cost, res.round.capped, bonus);
    }
    async function celebrate(amount, mult, capped, bonus) {
      if (!(amount > 0)) {
        if (++deadSpins >= 5 && Math.random() < 0.35) { say(pickOne(th.quotes.tease)); deadSpins = 0; }
        return wait(120);
      }
      deadSpins = 0;
      let tier = -1;
      WIN_TIERS.forEach(([m], i) => { if (mult >= m) tier = i; });
      if (capped) tier = WIN_TIERS.length - 1;
      if (tier < 0) {
        if (bonus) await showBanner({ title: 'BONUS COMPLETE', amount: money(amount) }, 2300);
        return wait(100);
      }
      skipping = false;
      banner = { kind: 'win', t0: T, amount, mult, tier: 0, maxTier: tier, capped, dur: 2.4 + tier * 1.3, done: false };
      Sfx.tierUp(0); an.hypeT = banner.dur + 2; say(pickOne(th.quotes.big), 3200); shake(10); flash('#ffffff', 0.35);
      await wait((banner.dur + 1.7) * 1000);
      banner = null;
    }

    async function doSpin(mode) {
      if (busy || needLogin()) return;
      const bet = betAmount(), cost = cfg.cost[mode], stake = bet * cost;
      if (stake > state.me.bal[state.cur] + 1e-12) { auto = false; syncUi(); return toast('Insufficient balance'); }
      busy = true; skipping = false;
      Sfx.init(); Sfx.click(); Sfx.spin();
      adjustBal(-stake);
      winShown = winTarget = 0; hi = null; clearPillars(); tblocks = []; chainNow = 1;
      spinReels(all); syncUi();
      const t0 = performance.now();
      const res = await attempt(() => api('/api/slots/spin', { slot: id, mode, bet, currency: state.cur }));
      if (!res) {
        for (const r of reels) { r.mode = 'idle'; }
        busy = false; auto = false; syncUi();
        return;
      }
      await wait(Math.max(0, (turbo ? 260 : 560) - (performance.now() - t0)));
      await present(res, bet, cost);
      setBal(res.bal); refreshBets();
      busy = false; syncUi();
      if (auto && live.on) setTimeout(() => { if (auto && live.on && !busy) doSpin(feature ? 'feature' : 'base'); }, turbo ? 180 : 520);
    }
    function trigger() { if (busy) skip(); else doSpin(feature ? 'feature' : 'base'); }

    // ---- per-frame update ----
    function update(dt) {
      for (let i = waits.length - 1; i >= 0; i--) if (clock >= waits[i].at || !live.on) waits.splice(i, 1)[0].res();
      for (let i = 0; i < N; i++) {
        const r = reels[i];
        if (r.drop) for (let k = 0; k < R; k++) r.drop[k] = Math.min(0, r.drop[k] + dt * 15);
        if (r.mode === 'spin') {
          if (r.delay > 0) r.delay -= dt; else { r.vel += (r.velT - r.vel) * Math.min(1, dt * 12); r.pos += r.vel * dt; }
        } else if (r.mode === 'stop' && clock - r.t0 >= r.dur) { r.mode = 'idle'; r.col = r.next; r.land = T; landed(i); }
      }
      pillars = pillars.filter((p) => !(p.dying && T - p.dying > 0.25));
      // character
      for (const k of ['cast', 'joy', 'hype', 'antic']) { an[k + 'T'] = Math.max(0, an[k + 'T'] - dt); an[k] += ((an[k + 'T'] > 0 ? 1 : 0) - an[k]) * Math.min(1, dt * (k === 'cast' ? 14 : 7)); }
      an.look += ((busy ? 0.9 : Math.sin(T * 0.5) * 0.6) - an.look) * Math.min(1, dt * 4);
      an.nextBlink -= dt;
      if (an.nextBlink <= 0) { an.blinkT = 0.12; an.nextBlink = rnd(1.6, 4.5); }
      an.blinkT -= dt; an.blink = an.blinkT > 0;
      if (!busy && !bubble && Math.random() < dt / 14) say(pickOne(th.quotes.idle), 2600);
      if (bubble && T > bubble.until) bubble = null;
      // counters and decays
      winShown += (winTarget - winShown) * Math.min(1, dt * 9);
      if (Math.abs(winTarget - winShown) < 1e-9) winShown = winTarget;
      shakeMag *= Math.pow(0.0015, dt); flashA *= Math.pow(0.004, dt);
      bonusMix += ((fs ? 1 : 0) - bonusMix) * Math.min(1, dt * 3);
      // particles
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.age += dt;
        if (p.age >= p.life) { parts.splice(i, 1); continue; }
        p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
      }
      ambient(dt);
      // big-win banner: count up, climb tiers, throw coins
      if (banner && banner.kind === 'win') {
        const u = clamp((T - banner.t0) / banner.dur);
        let tier = 0;
        WIN_TIERS.forEach(([m], i) => { if (banner.mult * u >= m) tier = i; });
        tier = Math.min(tier, banner.maxTier);
        if (u >= 1) tier = banner.maxTier;
        if (tier > banner.tier) { banner.tier = tier; banner.pop = T; Sfx.tierUp(tier); shake(10 + tier * 5); flash('#ffffff', 0.4); confetti(40 + tier * 20); }
        if (u >= 1 && !banner.done) { banner.done = true; banner.pop = T; shake(14); confetti(90); if (banner.capped) { flash('#ffe27a', 0.7); coins(120); } }
        if (Math.random() < dt * (14 + banner.tier * 16)) { coins(1 + banner.tier); if (u < 1) Sfx.coin(); }
      }
    }
    function ambient(dt) {
      const L = lay, k = (1 + bonusMix * 1.8) * (L.w / 900), kind = th.ambient;
      const rates = { ember: 16, rain: 55, bubble: 7, star: 2.2, sprinkle: 9, mote: 7, snow: 26 };
      if (amb.length < 260 && Math.random() < dt * rates[kind] * k) {
        if (kind === 'ember') amb.push({ x: rnd(0, L.w), y: L.h + 5, vx: rnd(-12, 12), vy: -rnd(25, 80), life: rnd(2.5, 5), age: 0, s: rnd(1, 3), ph: rnd(0, 9) });
        else if (kind === 'rain') amb.push({ x: rnd(0, L.w * 1.2), y: -20, vx: -130, vy: rnd(520, 860), life: 2, age: 0, s: rnd(9, 20), c: Math.random() < 0.5 ? '#7af7ff' : '#ff4fd8' });
        else if (kind === 'bubble') amb.push({ x: rnd(0, L.w), y: L.h + 8, vx: 0, vy: -rnd(22, 70), life: rnd(4, 9), age: 0, s: rnd(2, 7), ph: rnd(0, 9) });
        else if (kind === 'star') amb.push({ x: rnd(L.w * 0.2, L.w * 1.2), y: rnd(-20, L.h * 0.4), vx: -rnd(380, 620), vy: rnd(160, 300), life: 0.9, age: 0, s: rnd(30, 70) });
        else if (kind === 'snow') amb.push({ x: rnd(-L.w * 0.1, L.w), y: -6, vx: rnd(10, 45), vy: rnd(35, 110), life: 12, age: 0, s: rnd(0.8, 2.6), ph: rnd(0, 9) });
        else if (kind === 'mote') amb.push({ x: rnd(0, L.w), y: rnd(L.h * 0.2, L.h), vx: rnd(-14, 14), vy: -rnd(4, 22), life: rnd(3, 7), age: 0, s: rnd(1.2, 3), ph: rnd(0, 9) });
        else amb.push({ x: rnd(0, L.w), y: -8, vx: rnd(-15, 15), vy: rnd(30, 85), life: rnd(5, 9), age: 0, s: rnd(4, 8), rot: rnd(0, TAU), vr: rnd(-4, 4), c: pickOne(['#ffe84a', '#7af7ff', '#ffffff', '#9dff6b', '#ff9a3d']) });
      }
      for (let i = amb.length - 1; i >= 0; i--) {
        const p = amb[i];
        p.age += dt; p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.rot != null) p.rot += p.vr * dt;
        if (p.age > p.life || p.y > L.h + 40 || p.y < -60) amb.splice(i, 1);
      }
    }

    // ---- drawing ----
    function label(c, str, x, y, size, o = {}) {
      c.font = `900 ${size}px ${A.FONT}`; c.textAlign = o.align || 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
      if (o.glow) { c.shadowColor = o.glow; c.shadowBlur = size * 0.7; }
      c.lineWidth = size * (o.sw ?? 0.2); c.strokeStyle = o.stroke || 'rgba(8,4,16,0.9)'; c.strokeText(str, x, y);
      c.shadowBlur = 0; c.fillStyle = o.fill || '#fff'; c.fillText(str, x, y);
    }
    function drawAmbient(c) {
      const kind = th.ambient;
      c.save();
      for (const p of amb) {
        const f = 1 - p.age / p.life;
        if (kind === 'ember') { c.globalCompositeOperation = 'lighter'; c.fillStyle = `rgba(255,${150 + ((p.ph * 20) | 0) % 90},60,${f * (0.5 + 0.5 * Math.sin(T * 8 + p.ph))})`; c.beginPath(); c.arc(p.x + Math.sin(T * 1.5 + p.ph) * 8, p.y, p.s, 0, TAU); c.fill(); }
        else if (kind === 'snow') { c.fillStyle = `rgba(255,255,255,${0.35 + 0.2 * p.s})`; c.beginPath(); c.arc(p.x + Math.sin(T * 1.3 + p.ph) * 9, p.y, p.s, 0, TAU); c.fill(); }
        else if (kind === 'mote') { c.globalCompositeOperation = 'lighter'; const a = Math.sin((p.age / p.life) * Math.PI) * (0.5 + 0.5 * Math.sin(T * 3 + p.ph)), x = p.x + Math.sin(T * 0.9 + p.ph) * 14; c.fillStyle = `rgba(140,255,225,${a * 0.25})`; c.beginPath(); c.arc(x, p.y, p.s * 3.2, 0, TAU); c.fill(); c.fillStyle = `rgba(230,255,250,${a})`; c.beginPath(); c.arc(x, p.y, p.s, 0, TAU); c.fill(); }
        else if (kind === 'rain') { c.strokeStyle = p.c; c.globalAlpha = 0.4; c.lineWidth = 1.2; c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x + 0.15 * p.s, p.y - p.s); c.stroke(); }
        else if (kind === 'bubble') { c.strokeStyle = `rgba(200,255,246,${0.5 * f})`; c.lineWidth = 1; c.beginPath(); c.arc(p.x + Math.sin(T * 1.2 + p.ph) * 10, p.y, p.s, 0, TAU); c.stroke(); }
        else if (kind === 'star') { const g = c.createLinearGradient(p.x, p.y, p.x + p.s, p.y - p.s * 0.5); g.addColorStop(0, `rgba(255,255,255,${f})`); g.addColorStop(1, 'rgba(255,255,255,0)'); c.strokeStyle = g; c.lineWidth = 1.6; c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x + p.s, p.y - p.s * 0.5); c.stroke(); }
        else { c.save(); c.translate(p.x, p.y); c.rotate(p.rot); c.globalAlpha = 0.75 * Math.min(1, f * 3); c.fillStyle = p.c; A.rr(c, -p.s, -p.s * 0.3, p.s * 2, p.s * 0.6, p.s * 0.3); c.fill(); c.restore(); }
      }
      c.restore();
    }
    function drawCell(c, sym, x, y, scale, alpha) {
      const L = lay, s = L.cell * scale, o = (L.cell - s) / 2;
      if (sym < 0 || sym > 10 || (sym === 10 && tumble) || y > L.ry + L.rh || y + L.cell < L.ry) return;
      c.globalAlpha = alpha; c.drawImage(A.sprite(id, sym, L.px), x + o, y + o, s, s); c.globalAlpha = 1;
    }
    function drawReels(c) {
      const L = lay, { rx, ry, rw, rh, cell } = L, pad = cell * 0.08;
      c.fillStyle = 'rgba(7,4,16,0.82)'; A.rr(c, rx - pad, ry - pad, rw + pad * 2, rh + pad * 2, cell * 0.16); c.fill();
      c.save(); A.rr(c, rx - pad * 0.4, ry - pad * 0.4, rw + pad * 0.8, rh + pad * 0.8, cell * 0.12); c.clip();
      const covered = new Set();
      for (const p of pillars) if (p.from == null && !p.dying && T - p.born > 0.28) covered.add(p.col);
      for (let i = 0; i < N; i++) {
        const r = reels[i], x = rx + i * cell;
        if (i % 2) { c.fillStyle = 'rgba(255,255,255,0.03)'; c.fillRect(x, ry, cell, rh); }
        if (r.mode === 'spin') {
          const base = Math.floor(r.pos), frac = r.pos - base, fast = r.vel > 8;
          for (let k = -1; k <= R; k++) {
            const sym = r.strip[(((base - k) % 24) + 24) % 24], y = ry + (k + frac) * cell;
            if (fast) { c.globalAlpha = 0.72; c.drawImage(A.sprite(id, sym, L.px), x, y - cell * 0.16, cell, cell * 1.32); c.globalAlpha = 1; } else drawCell(c, sym, x, y, 1, 1);
          }
        } else if (r.mode === 'stop') {
          const D = (1 - easeOutBack(clamp((clock - r.t0) / r.dur))) * R;
          for (let row = 0; row < R; row++) drawCell(c, r.next[row], x, ry + (row - D) * cell, 1, 1);
          for (let j = 0; j <= R; j++) drawCell(c, r.fill[j + 1], x, ry + (R - D + j) * cell, 1, 0.8);
          drawCell(c, r.fill[0], x, ry + (-D - 1) * cell, 1, 1);
        } else if (!covered.has(i)) {
          for (let row = 0; row < R; row++) {
            const sym = r.col[row];
            let scale = 1, alpha = 1;
            if (hi) {
              if (hi.cells.has(i + ',' + row)) {
                const pulse = Math.abs(Math.sin((T - hi.t0) * 7));
                scale = 1.04 + 0.12 * pulse;
                c.fillStyle = A.rad(c, x + cell / 2, ry + (row + 0.5) * cell, cell * 0.1, cell * 0.62, th.accent + 'cc', th.accent + '00'); c.globalAlpha = 0.5 + 0.5 * pulse; c.fillRect(x, ry + row * cell, cell, cell); c.globalAlpha = 1;
              } else alpha = 0.3;
            } else if (sym === SC) scale = 1 + 0.045 * Math.sin(T * 5 + i);
            drawCell(c, sym, x, ry + (row + (r.drop ? r.drop[row] : 0)) * cell, scale, alpha);
          }
          const k = clamp(1 - (T - r.land) / 0.22);
          if (k > 0) { c.fillStyle = `rgba(255,255,255,${k * 0.14})`; c.fillRect(x, ry, cell, rh); }
        }
        if (r.antic) {
          c.fillStyle = th.accent2 + '2e'; c.fillRect(x, ry, cell, rh);
          c.globalAlpha = 0.55 + 0.45 * Math.sin(T * 22); c.strokeStyle = th.accent2; c.lineWidth = cell * 0.05; c.strokeRect(x + cell * 0.03, ry + cell * 0.03, cell * 0.94, rh - cell * 0.06); c.globalAlpha = 1;
        }
      }
      c.restore();
      for (const p of pillars) {
        let col = p.col, alpha = 1;
        if (p.from != null) { const u = clamp((clock - p.mt0) / p.mdur); col = lerp(p.from, p.to, u * u * (3 - 2 * u)); if (p.to < 0) alpha = 1 - u; }
        if (p.dying) alpha *= clamp(1 - (T - p.dying) / 0.25);
        const bump = clamp(1 - (T - p.bump) / 0.3), lit = hi && hi.wilds.has(p.col) ? Math.abs(Math.sin((T - hi.t0) * 7)) : 0;
        c.save(); c.globalAlpha = alpha;
        const cx = rx + (col + 0.5) * cell, cy = ry + rh / 2, s = 1 + bump * 0.12 + lit * 0.04;
        c.translate(cx, cy); c.scale(s, s); c.translate(-cx, -cy);
        A.drawWild(c, th, rx + col * cell, ry, cell, rh, T, p.mult, (T - p.born) / 0.32);
        if (lit) { c.globalAlpha = alpha * lit * 0.5; c.fillStyle = '#ffffff'; A.rr(c, rx + col * cell + cell * 0.05, ry + cell * 0.05, cell * 0.9, rh - cell * 0.1, cell * 0.16); c.fill(); }
        c.restore();
      }
      for (const b of tblocks) {
        const u = clamp((T - b.born) / 0.3), e = u * u, tx = rx + b.col * cell, ty = ry + b.row * cell;
        if (u >= 1 && !b.hit) { b.hit = true; shake(10); flash(th.wild[0], 0.2); Sfx.wild(0); burst(tx + cell, ty + cell, 46, { v1: 420, life: 1.1, cols: th.wild.concat('#ffffff') }); }
        A.drawBlock(c, th, lerp(b.from[0] - cell, tx, e), lerp(b.from[1] - cell, ty, e) - Math.sin(u * Math.PI) * cell * 0.9, cell * 2, T, b.mult, u, Math.min(T - b.born - 0.3, T - b.pulse));
      }
      const featGlow = feature && !fs ? 0.5 + 0.5 * Math.sin(T * 5) : 0;
      c.lineWidth = cell * 0.055; c.strokeStyle = A.lin(c, rx, ry, rx + rw, ry + rh, th.frame[0], th.frame[1], th.frame[0]);
      c.shadowColor = th.frame[1]; c.shadowBlur = (14 + bonusMix * 16 + featGlow * 18) * L.dpr;
      A.rr(c, rx - pad, ry - pad, rw + pad * 2, rh + pad * 2, cell * 0.16); c.stroke(); c.shadowBlur = 0;
      if (A.FRAME && A.FRAME[id]) A.FRAME[id](c, rx - pad, ry - pad, rw + pad * 2, rh + pad * 2, cell, T, bonusMix + featGlow);
      // lightning from the character to the wild reels
      c.save(); c.globalCompositeOperation = 'lighter'; c.lineJoin = 'round';
      for (let i = bolts.length - 1; i >= 0; i--) {
        const b = bolts[i], age = (T - b.t0) / 0.3;
        if (age >= 1) { bolts.splice(i, 1); continue; }
        const dx = b.to[0] - b.from[0], dy = b.to[1] - b.from[1], len = Math.hypot(dx, dy), nx = -dy / len, ny = dx / len;
        c.beginPath(); c.moveTo(b.from[0], b.from[1]);
        for (let k = 1; k < 9; k++) { const o = rnd(-1, 1) * len * 0.05; c.lineTo(b.from[0] + (dx * k) / 9 + nx * o, b.from[1] + (dy * k) / 9 + ny * o); }
        c.lineTo(b.to[0], b.to[1]);
        c.globalAlpha = 1 - age; c.shadowColor = th.wild[1]; c.shadowBlur = 16 * L.dpr;
        c.strokeStyle = th.wild[0]; c.lineWidth = cell * 0.07; c.stroke();
        c.strokeStyle = '#ffffff'; c.lineWidth = cell * 0.025; c.stroke();
      }
      c.restore();
    }
    function drawParticles(c) {
      c.save();
      for (const p of parts) {
        const f = 1 - p.age / p.life;
        c.globalCompositeOperation = p.add ? 'lighter' : 'source-over';
        if (p.type === 'coin') {
          c.globalAlpha = Math.min(1, f * 4);
          c.fillStyle = '#f7c23c'; c.beginPath(); c.ellipse(p.x, p.y, Math.abs(Math.cos(p.rot)) * p.size + 1, p.size, 0, 0, TAU); c.fill();
          c.fillStyle = '#fff3b0'; c.beginPath(); c.ellipse(p.x - p.size * 0.15, p.y - p.size * 0.2, Math.abs(Math.cos(p.rot)) * p.size * 0.45 + 0.5, p.size * 0.45, 0, 0, TAU); c.fill();
        } else if (p.type === 'conf') {
          c.globalAlpha = Math.min(1, f * 3); c.save(); c.translate(p.x, p.y); c.rotate(p.rot); c.fillStyle = p.col; c.fillRect(-p.size / 2, -p.size * 0.3 * Math.cos(p.rot * 2), p.size, p.size * 0.6 * Math.cos(p.rot * 2)); c.restore();
        } else {
          c.globalAlpha = f; c.strokeStyle = p.col; c.lineWidth = p.size * 0.7; c.lineCap = 'round';
          c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x - p.vx * 0.035, p.y - p.vy * 0.035); c.stroke();
        }
      }
      c.restore();
    }
    function drawHud(c) {
      const L = lay, u = L.unit, mid = L.rx + L.rw / 2, topY = L.ry - L.cell * 0.08 - u * 0.022, botY = L.ry + L.rh + (L.h - L.ry - L.rh) * 0.52;
      const gold = A.lin(c, 0, botY - u * 0.02, 0, botY + u * 0.02, '#fffbe0', '#ffd24a', '#ff9a1f');
      // title
      const tx = L.mobile ? L.w * 0.64 : L.chX, ty = L.mobile ? L.h * 0.085 : L.h * 0.075, ts = Math.min(L.mobile ? u * 0.032 : u * 0.027, (L.mobile ? L.w * 0.62 : Math.min(L.rx - L.cell * 0.3, tx * 2 - 10)) / (cfg.name.length * 0.6));
      label(c, cfg.name.toUpperCase(), tx, ty, ts, { fill: A.lin(c, 0, ty - ts / 2, 0, ty + ts / 2, '#ffffff', th.accent), glow: th.accent2 });
      label(c, `MAX WIN ${cfg.cap.toLocaleString('en-US')}×`, tx, ty + ts * 1.05, ts * 0.5, { fill: th.frame[0], sw: 0.3 });
      // line above the reels
      if (fs) {
        label(c, `FREE SPIN ${fs.i} / ${fs.n}`, L.rx + L.rw, topY, u * 0.019, { align: 'right', fill: th.accent });
        if (cfg.fs.ladder || tumble) { const b = 1 + clamp(1 - (T - fs.bump) / 0.35) * 0.6; label(c, `MULTIPLIER ×${Math.max(1, fs.G)}`, L.rx, topY, u * 0.021 * b, { align: 'left', fill: gold, glow: th.accent2 }); }
      } else {
        label(c, tumble ? (cfg.chain && chainNow > 1 ? `MULTIPLIER ×${chainNow}` : 'PAYS ANYWHERE · 8+ MATCHING') : `${ways.toLocaleString('en-US')} WAYS`, L.rx, topY, u * 0.015, { align: 'left', fill: 'rgba(255,255,255,0.8)', sw: 0.3 });
        if (feature) label(c, tumble ? 'RUNE SPIN ON' : `WILD SPIN ON · ${cfg.featureWilds}+ WILD REELS`, L.rx + L.rw, topY, u * 0.015, { align: 'right', fill: th.accent, sw: 0.3 });
      }
      // line below the reels
      if (winShown > 0) label(c, `${fs ? 'BONUS WIN' : 'WIN'}  ${money(winShown)}`, mid, botY, u * 0.03, { fill: gold, glow: th.accent2 });
      else label(c, th.tag.toUpperCase(), mid, botY, u * 0.0135, { fill: 'rgba(255,255,255,0.7)', sw: 0.35 });
      // win pop-ups
      for (let i = pops.length - 1; i >= 0; i--) {
        const p = pops[i], a = (T - p.t0) / 1.15;
        if (a >= 1) { pops.splice(i, 1); continue; }
        const s = u * (0.03 + p.level * 0.009) * (a < 0.15 ? easeOutBack(a / 0.15) : 1);
        c.globalAlpha = a > 0.7 ? (1 - a) / 0.3 : 1;
        label(c, p.text, p.x, p.y - a * L.cell * 0.9, s, { fill: gold, glow: th.accent2 });
        c.globalAlpha = 1;
      }
      // speech bubble
      if (bubble) {
        const a = Math.min(1, (T - bubble.t0) / 0.15, (bubble.until - T) / 0.2), size = u * 0.0155;
        c.font = `700 ${size}px system-ui, sans-serif`;
        const tw = c.measureText(bubble.text).width, bw = tw + size * 1.6, bh = size * 2.3;
        let bx = L.mobile ? L.chX + L.chS * 1.25 : L.chX - bw / 2, by = L.mobile ? L.chY - L.chS * 0.2 : L.chY - L.chS * 1.95;
        bx = clamp(bx, 6, L.w - bw - 6); by = Math.max(by, L.h * 0.165);
        c.globalAlpha = clamp(a);
        c.fillStyle = '#ffffff'; A.rr(c, bx, by, bw, bh, size * 0.8); c.fill();
        c.beginPath();
        if (L.mobile) { c.moveTo(bx + 2, by + bh * 0.3); c.lineTo(bx - size * 0.7, by + bh * 0.55); c.lineTo(bx + 2, by + bh * 0.7); }
        else { c.moveTo(bx + bw / 2 - size * 0.6, by + bh - 2); c.lineTo(bx + bw / 2, by + bh + size * 0.7); c.lineTo(bx + bw / 2 + size * 0.6, by + bh - 2); }
        c.fill();
        c.fillStyle = '#1a0f26'; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillText(bubble.text, bx + size * 0.8, by + bh / 2 + 1);
        c.globalAlpha = 1;
      }
    }
    function drawBanner(c) {
      if (!banner) return;
      const L = lay, u = L.unit, a = clamp((T - banner.t0) / 0.3), cx = L.w / 2, cy = L.h / 2, win = banner.kind === 'win';
      c.fillStyle = `rgba(5,2,12,${0.66 * a})`; c.fillRect(0, 0, L.w, L.h);
      c.save(); c.translate(cx, cy); c.rotate(T * 0.35); c.globalCompositeOperation = 'lighter';
      const rays = win ? 16 : 12, reach = Math.hypot(L.w, L.h);
      for (let i = 0; i < rays; i++) { c.fillStyle = A.rad(c, 0, 0, 0, reach * 0.6, (i % 2 ? th.accent : th.accent2) + (win ? '55' : '2e'), th.accent + '00'); c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, reach, (i * TAU) / rays, (i * TAU) / rays + TAU / rays / 2); c.fill(); }
      c.restore();
      const gold = (y, s) => A.lin(c, 0, y - s / 2, 0, y + s / 2, '#ffffff', '#ffe27a', '#ff9a1f');
      if (win) {
        const p = clamp((T - banner.t0) / banner.dur), shown = banner.amount * (1 - Math.pow(1 - p, 2));
        const done = banner.done, title = done && banner.capped ? 'MAX WIN' : WIN_TIERS[banner.tier][1];
        const pop = 1 + clamp(1 - (T - (banner.pop ?? banner.t0)) / 0.35) * 0.35, s = Math.min(u * 0.1, L.w * 0.16) * easeOutBack(a) * pop * (1 + Math.sin(T * 9) * 0.02);
        label(c, title, cx, cy - u * 0.06, s, { fill: gold(cy - u * 0.06, s), glow: th.accent2, sw: 0.14 });
        label(c, money(done ? banner.amount : shown), cx, cy + u * 0.045, Math.min(u * 0.062, L.w * 0.1), { fill: '#ffffff', glow: th.accent });
        label(c, done && banner.capped ? `${cfg.cap.toLocaleString('en-US')}× — THE MAXIMUM` : `${(banner.mult * (done ? 1 : p)).toFixed(banner.mult < 100 ? 1 : 0)}× your stake`, cx, cy + u * 0.105, u * 0.02, { fill: th.frame[0], sw: 0.3 });
      } else {
        const s = Math.min(u * 0.075, L.w * 0.13) * easeOutBack(a);
        label(c, banner.title, cx, cy - (banner.amount ? u * 0.04 : u * 0.015), s, { fill: gold(cy, s), glow: th.accent2, sw: 0.14 });
        if (banner.amount) label(c, banner.amount, cx, cy + u * 0.05, Math.min(u * 0.055, L.w * 0.09), { fill: '#ffffff', glow: th.accent });
        if (banner.sub) {
          const size = Math.min(u * 0.017, L.w * 0.034);
          c.font = `700 ${size}px system-ui, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = 'rgba(255,255,255,0.92)';
          const words = banner.sub.split(' '), lines = [''];
          for (const w of words) { const t = lines[lines.length - 1] + (lines[lines.length - 1] ? ' ' : '') + w; if (c.measureText(t).width > L.w * 0.8) lines.push(w); else lines[lines.length - 1] = t; }
          lines.forEach((ln, i) => c.fillText(ln.charAt(0).toUpperCase() + ln.slice(1), cx, cy + u * 0.055 + i * size * 1.4));
        }
      }
    }
    function draw() {
      const L = lay, c = ctx;
      c.setTransform(L.dpr, 0, 0, L.dpr, 0, 0);
      c.drawImage(L.bg, 0, 0, L.w, L.h);
      if (bonusMix > 0.01) { c.fillStyle = A.rad(c, L.w / 2, L.h / 2, 0, L.w * 0.7, th.accent2 + '40', th.accent2 + '00'); c.globalAlpha = bonusMix * (0.8 + 0.2 * Math.sin(T * 3)); c.fillRect(0, 0, L.w, L.h); c.globalAlpha = 1; }
      if (A.LIVE[id]) A.LIVE[id](c, L.w, L.h, T, bonusMix);
      drawAmbient(c);
      c.save();
      if (shakeMag > 0.3) c.translate(rnd(-shakeMag, shakeMag), rnd(-shakeMag, shakeMag));
      A.character(c, id, L.chX, L.chY, L.chS, T, an);
      drawReels(c);
      drawParticles(c);
      if (A.ULT && A.ULT[id] && an.hype > 0.04) A.ULT[id](c, L, T, Math.min(1, an.hype));
      drawHud(c);
      c.restore();
      drawBanner(c);
      if (banner && banner.kind === 'win') drawParticles(c);
      if (flashA > 0.01) { c.globalAlpha = Math.min(1, flashA); c.fillStyle = flashCol; c.fillRect(0, 0, L.w, L.h); c.globalAlpha = 1; }
    }

    // ---- loop and input ----
    function frame(now) {
      if (!live.on) { for (const w of waits.splice(0)) w.res(); window.removeEventListener('resize', onResize); window.removeEventListener('keydown', onKey); return; }
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now; clock = now; T += dt;
      if (!lay || canvas.clientWidth !== lay.w) resize();
      if (lay) { update(dt); draw(); }
      requestAnimationFrame(frame);
    }
    const onResize = () => resize();
    const onKey = (e) => {
      if (e.code !== 'Space' || /INPUT|SELECT|TEXTAREA|BUTTON/.test(e.target.tagName) || $('#modal-root').children.length) return;
      e.preventDefault(); trigger();
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('keydown', onKey);
    canvas.addEventListener('click', () => { if (busy) skip(); });
    syncUi();
    requestAnimationFrame((now) => { last = clock = now; frame(now); });
  }

  // ---------- lobby cards with live character portraits ----------
  function lobby(live) {
    const cards = SLOT_IDS.map((id) => {
      const cfg = E.SLOTS[id], th = A.THEMES[id];
      const cv = h('canvas', { class: 'slot-card-art' });
      return { id, cv, el: h('a', { class: 'slot-card', href: '#slot-' + id, style: `background:linear-gradient(160deg,${th.bg[1]},${th.bg[0]} 70%);border-color:${th.frame[1]}66` },
        cv, h('b', {}, cfg.name), h('em', { style: `color:${th.frame[0]}` }, `Up to ${cfg.cap.toLocaleString('en-US')}×`), h('span', {}, th.tag)) };
    });
    const a = { cast: 0, joy: 0.25, hype: 0, antic: 0, look: 0, blink: false };
    let last = 0;
    (function tick(now) {
      if (!live.on) return;
      if (now - last > 32) {
        last = now;
        const t = now / 1000;
        cards.forEach(({ id, cv }, i) => {
          const w = cv.clientWidth, hh = cv.clientHeight, dpr = Math.min(window.devicePixelRatio || 1, 2);
          if (!w) return;
          if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(hh * dpr); }
          const c = cv.getContext('2d');
          c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, w, hh);
          a.look = Math.sin(t * 0.6 + i); a.blink = (t * 0.37 + i * 0.21) % 1 < 0.03;
          const big = A.THEMES[id].chScale ? 0.82 : 1;
          A.character(c, id, w / 2, hh * (big < 1 ? 0.6 : 0.54), Math.min(w / 2.7, hh / 3.3) * big, t + i * 1.7, a);
        });
      }
      requestAnimationFrame(tick);
    })(0);
    return h('div', {}, h('h2', { class: 'lobby-h' }, 'Slots'), h('div', { class: 'slot-cards' }, ...cards.map((c) => c.el)));
  }

  // ---------- registration ----------
  ICON.slot = svg('<path d="M4 4h16a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2zm1 3v10h4V7zm5 0v10h4V7zm5 0v10h4V7zM6.5 10h1l-.8 4h-1zM11.5 10h1l-.8 4h-1zM16.5 10h1l-.8 4h-1z" fill-rule="evenodd"/>');
  NAV.push([null, 'Slots']);
  for (const id of SLOT_IDS) {
    views['slot-' + id] = (root, live) => mount(root, live, id);
    NAV.push(['slot-' + id, E.SLOTS[id].name, 'slot']);
  }
  window.SlotUI = { lobby, ids: SLOT_IDS };
})();
