// Emberline slot engine — shared by the server (authoritative results) and the browser
// (fairness verifier). Pure and deterministic: the same floats always give the same round.
//
// How a round is decided:
//   1. Two fair floats pick a payout tier from the slot's published table (slots-math.js).
//      The table fixes the odds of every tier, so the RTP is set by design.
//   2. Four fair floats seed a PRNG. Spins are generated from it and re-rolled until the
//      round's payout lands inside the chosen tier. The first match is the result.
// All amounts are in "units" of 0.01 x the base bet.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SlotEngine = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const BLOCK = 10; // a cell covered by a multiplier block (tumbling slots)
  const SC = 9; // scatter. Symbols 0-4 are low pays, 5-8 are high pays.
  const SYM_WEIGHTS = [16, 16, 15, 15, 14, 9, 7, 5, 3];

  // pays[symbol][reelsMatched - 3], per way
  const PAY_5x3 = [[10, 30, 80], [10, 30, 80], [15, 40, 100], [15, 40, 120], [20, 60, 150], [30, 80, 250], [40, 120, 400], [60, 200, 600], [100, 300, 1000]];
  const PAY_5x4 = [[5, 15, 40], [5, 15, 40], [8, 20, 50], [8, 20, 60], [10, 30, 80], [15, 40, 120], [20, 60, 200], [30, 100, 300], [50, 150, 500]];
  const PAY_5x5 = [[5, 10, 25], [5, 10, 25], [5, 12, 30], [8, 15, 40], [8, 20, 50], [10, 25, 60], [12, 30, 80], [15, 40, 120], [25, 80, 250]];
  const PAY_6x4 = [[5, 8, 15, 30], [5, 8, 15, 30], [5, 10, 20, 40], [8, 12, 25, 50], [8, 15, 30, 60], [10, 15, 30, 80], [12, 20, 50, 120], [15, 30, 80, 200], [20, 50, 120, 400]];

  const PAY_6x5 = [[5, 8, 12, 25], [5, 8, 12, 25], [5, 8, 15, 30], [5, 10, 20, 40], [8, 12, 25, 50], [8, 15, 30, 60], [10, 20, 40, 100], [12, 25, 60, 150], [15, 40, 100, 300]];

  // tumbling slots pay for 8-9, 10-11 and 12+ matching symbols anywhere on the grid
  const PAY_ANY = [[20, 50, 150], [20, 50, 150], [30, 70, 200], [40, 80, 250], [50, 100, 300], [80, 150, 500], [100, 200, 800], [150, 300, 1200], [250, 600, 2500]];

  // fs.sticky: wild reels stay for the rest of the free spins
  // fs.walk:   wild reels step one reel left each spin and gain +1 multiplier
  // fs.ladder: every wild reel that lands adds this much to a win multiplier that never resets
  // multMode:  how the multipliers of wild reels in one win combine ('add' or 'mul')
  const SLOTS = {
    djinn: {
      name: 'Ember Djinn', cap: 10000, reels: 5, rows: 3, pays: PAY_5x3, mults: [1, 2, 3, 5], multMode: 'add',
      fs: { spins: [8, 10, 12], sticky: true, walk: false, ladder: 0 }, cost: { base: 1, feature: 10, bonus: 100, enhanced: 250, super: 600, mystery: 200 }, featureWilds: 2,
    },
    kitsune: {
      name: 'Neon Kitsune', cap: 25000, reels: 5, rows: 4, pays: PAY_5x4, mults: [1, 2, 3], multMode: 'add',
      fs: { spins: [8, 10, 12], sticky: false, walk: true, ladder: 0 }, cost: { base: 1, feature: 15, bonus: 100, enhanced: 250, super: 600, mystery: 200 }, featureWilds: 2,
    },
    kraken: {
      name: 'Abyssal Hoard', cap: 50000, reels: 5, rows: 4, pays: PAY_5x4, mults: [1, 2], multMode: 'add',
      fs: { spins: [10, 12, 15], sticky: false, walk: false, ladder: 1 }, cost: { base: 1, feature: 15, bonus: 100, enhanced: 250, super: 600, mystery: 200 }, featureWilds: 2,
    },
    nebula: {
      name: 'Nebula Nine', cap: 100000, reels: 6, rows: 4, pays: PAY_6x4, mults: [1, 2, 3, 5], multMode: 'mul',
      fs: { spins: [8, 10, 12], sticky: true, walk: false, ladder: 0 }, cost: { base: 1, feature: 10, bonus: 100, enhanced: 250, super: 600, mystery: 200 }, featureWilds: 2,
    },
    sugar: {
      name: 'Sugar Overdrive', cap: 200000, reels: 5, rows: 5, pays: PAY_5x5, mults: [1, 2, 3, 5, 10], multMode: 'mul',
      fs: { spins: [10, 12, 15], sticky: true, walk: false, ladder: 1 }, cost: { base: 1, feature: 25, bonus: 100, enhanced: 250, super: 600, mystery: 200 }, featureWilds: 2,
    },
    witch: {
      name: 'Moonhex Coven', cap: 75000, reels: 5, rows: 4, pays: PAY_5x4, mults: [1, 2, 3, 5, 10], multMode: 'add',
      fs: { spins: [10, 12, 15], sticky: true, walk: false, ladder: 1 }, cost: { base: 1, feature: 15, bonus: 100, enhanced: 250, super: 600, mystery: 200 }, featureWilds: 2,
    },
    dragon: {
      name: 'Cinderwing', cap: 250000, reels: 6, rows: 5, pays: PAY_6x5, mults: [1, 2, 3, 5], multMode: 'mul',
      fs: { spins: [8, 10, 12], sticky: false, walk: true, ladder: 0 }, cost: { base: 1, feature: 25, bonus: 100, enhanced: 250, super: 600, mystery: 200 }, featureWilds: 2,
    },
    blade: {
      name: 'Runeblade Ascendant', cap: 120000, reels: 6, rows: 4, pays: PAY_6x4, mults: [1, 2, 3, 5], multMode: 'add',
      fs: { spins: [8, 10, 12], sticky: false, walk: true, ladder: 1 }, cost: { base: 1, feature: 15, bonus: 100, enhanced: 250, super: 600, mystery: 200 }, featureWilds: 2,
    },
    oracle: {
      name: 'Veil Oracle', type: 'tumble', cap: 100000, reels: 6, rows: 5, pays: PAY_ANY, mults: [2, 3, 5, 10, 25, 50, 100, 250, 1000], multSkew: 15,
      fs: { spins: [10, 12, 15] }, cost: { base: 1, feature: 20, bonus: 100, enhanced: 250, super: 600, mystery: 200 }, featureBlocks: 1,
    },
    // type 'tumble': winning symbols are removed and new ones fall in; 2x2 blocks carry multipliers.
    // Base game: a spin's win is multiplied by the sum of the blocks on screen. Free spins: every
    // block adds to a total multiplier that never resets.
    yeti: {
      name: 'Glacier Throne', type: 'tumble', cap: 150000, reels: 6, rows: 5, pays: PAY_ANY, mults: [2, 3, 5, 10, 25, 50, 100, 250, 500], multSkew: 15,
      fs: { spins: [10, 12, 15] }, cost: { base: 1, feature: 20, bonus: 100, enhanced: 250, super: 600, mystery: 200 }, featureBlocks: 1,
    },
  };
  // Bonus levels: 0 = standard, 1 = enhanced, 2 = super. Each extra scatter raises the level:
  // more free spins, a higher average and a guaranteed minimum win (x bet).
  const MODES = ['base', 'feature', 'bonus', 'enhanced', 'super', 'mystery'];
  const LEVEL_MIN = [0, 20, 50];
  const LEVEL_NAME = ['Bonus', 'Enhanced bonus', 'Super bonus'];

  // ---------- deterministic PRNG (sfc32) ----------
  function makeRng(a, b, c, d) {
    let sa = 0, sb = 0, sc = 0, sd = 0;
    const next = function () {
      a |= 0; b |= 0; c |= 0; d |= 0;
      const t = (((a + b) | 0) + d) | 0;
      d = (d + 1) | 0;
      a = b ^ (b >>> 9);
      b = (c + (c << 3)) | 0;
      c = (c << 21) | (c >>> 11);
      c = (c + t) | 0;
      return (t >>> 0) / 4294967296;
    };
    next.mark = function () { sa = a; sb = b; sc = c; sd = d; };
    next.rewind = function () { a = sa; b = sb; c = sc; d = sd; };
    next.get = function () { return [a, b, c, d]; };
    next.set = function (s) { a = s[0]; b = s[1]; c = s[2]; d = s[3]; };
    for (let i = 0; i < 12; i++) next();
    return next;
  }

  // ---------- generation ----------
  // "Heat" (0..1) is the knob that makes rich rounds findable: more wild reels, bigger
  // multipliers, more stacked premium symbols. Each tier in the table names its heat.
  const wBase = (h) => 0.012 + 0.9 * Math.pow(h, 2.2);
  const wFree = (cfg, h) => (cfg.fs.walk ? 0.02 + 0.5 * h * h : cfg.fs.sticky ? 0.015 + 0.6 * h * h : 0.04 + 0.85 * h * h);

  const scratchCache = new Map();
  function getScratch(cfg) {
    let s = scratchCache.get(cfg);
    if (!s) {
      s = { cnt: new Int32Array(cfg.reels * 10), wild: new Int32Array(cfg.reels), fw: new Int32Array(cfg.reels), scRow: new Int8Array(cfg.reels), grid: new Int8Array(cfg.reels * cfg.rows), tc: new Int32Array(9), T: 0, nsc: 0, lvl: -1 };
      scratchCache.set(cfg, s);
    }
    return s;
  }
  const symCache = new Map();
  function symCum(h) {
    let c = symCache.get(h);
    if (!c) {
      const w = SYM_WEIGHTS.map((x, s) => x * (1 + 2.5 * h * (s / 8)));
      const tot = w.reduce((p, q) => p + q, 0);
      c = new Float64Array(9);
      let sum = 0;
      for (let s = 0; s < 9; s++) { sum += w[s] / tot; c[s] = sum; }
      c[8] = 1;
      symCache.set(h, c);
    }
    return c;
  }
  const multCache = new Map();
  function pickMult(cfg, rng, h) {
    const key = cfg.name + '|' + h;
    let c = multCache.get(key);
    if (!c) {
      const n = cfg.mults.length;
      const w = cfg.mults.map((_, i) => (n > 1 ? Math.exp(i * ((h * (cfg.multSkew || 8)) / (n - 1) - 1.6)) : 1));
      const tot = w.reduce((p, q) => p + q, 0);
      c = new Float64Array(n);
      let sum = 0;
      for (let i = 0; i < n; i++) { sum += w[i] / tot; c[i] = sum; }
      c[n - 1] = 1;
      multCache.set(key, c);
    }
    const u = rng();
    let i = 0;
    while (u >= c[i]) i++;
    return cfg.mults[i];
  }

  function genReels(cfg, rng, h, st, grid) {
    const cum = symCum(h), rho = 0.12 + 0.55 * h, rows = cfg.rows, cnt = st.cnt;
    cnt.fill(0);
    for (let r = 0; r < cfg.reels; r++) {
      const base = r * 10, scRow = st.scRow[r];
      const col = grid ? (grid[r] = new Array(rows)) : null;
      let prev = 0;
      for (let row = 0; row < rows; row++) {
        let s;
        if (row > 0 && rng() < rho) s = prev; // stacked symbol
        else { const u = rng(); s = 0; while (u >= cum[s]) s++; }
        prev = s;
        if (row === scRow) { if (col) col[row] = SC; }
        else { cnt[base + s]++; if (col) col[row] = s; }
      }
    }
  }

  // Ways pays, left to right. A wild reel counts as every row matching.
  function evaluate(cfg, cnt, wild, G, wins) {
    const n = cfg.reels, rows = cfg.rows, mul = cfg.multMode === 'mul';
    let total = 0;
    for (let s = 0; s < 9; s++) {
      let ways = 1, k = 0, sum = 0, prod = 1;
      for (let r = 0; r < n; r++) {
        const m = wild[r];
        const c = m ? rows : cnt[r * 10 + s];
        if (!c) break;
        ways *= c; k++;
        if (m > 1) { sum += m; prod *= m; }
      }
      if (k >= 3) {
        const M = (mul ? prod : sum || 1) * G;
        const pay = cfg.pays[s][k - 3] * ways * M;
        total += pay;
        if (wins) wins.push([s, k, ways, M, pay]);
      }
    }
    return total;
  }

  // ---------- tumbling slots ----------
  const tumCache = new Map();
  function tumCum(h) {
    let c = tumCache.get(h);
    if (!c) {
      const w = SYM_WEIGHTS.map((x) => Math.pow(x, 1 + 3 * h)); // heat concentrates the grid on fewer symbols
      const tot = w.reduce((p, q) => p + q, 0);
      c = new Float64Array(9);
      let sum = 0;
      for (let s = 0; s < 9; s++) { sum += w[s] / tot; c[s] = sum; }
      c[8] = 1;
      tumCache.set(h, c);
    }
    return c;
  }
  // kind 3 = a free spin (blocks add to the running multiplier st.T)
  function tumbleSpin(cfg, rng, h, kind, st, out) {
    const n = cfg.reels, R = cfg.rows, g = st.grid, cells = n * R, cum = tumCum(h), rho = 0.1 + 0.5 * h, cnt = st.tc;
    g.fill(-1);
    const blocks = out ? [] : null;
    let sum = 0, nb = 0;
    const wp = kind === 2 ? 0 : kind === 3 ? 0.05 + 0.8 * h * h : 0.02 + 0.75 * h * h;
    if (wp) for (let k = 0; k < 2; k++) if (rng() < wp) nb++;
    if (kind === 1 && nb < cfg.featureBlocks) nb = cfg.featureBlocks;
    for (let b = 0; b < nb; b++) {
      for (let t = 0; t < 8; t++) {
        const col = (rng() * (n - 1)) | 0, row = (rng() * (R - 1)) | 0, i = col * R + row;
        if (g[i] === -1 && g[i + 1] === -1 && g[i + R] === -1 && g[i + R + 1] === -1) {
          g[i] = g[i + 1] = g[i + R] = g[i + R + 1] = BLOCK;
          const m = pickMult(cfg, rng, h);
          sum += m;
          if (blocks) blocks.push([col, row, m]);
          break;
        }
      }
    }
    let nsc = 0;
    if (kind === 0) { const u = rng(); nsc = u < 0.6 ? 0 : u < 0.86 ? 1 : u < 0.97 ? 2 : 3; }
    else if (kind === 2) { const u = rng(); nsc = u < 0.8 ? 4 : u < 0.95 ? 5 : 6; if (st.lvl >= 0) nsc = 4 + st.lvl; }
    for (let k = 0; k < nsc; k++) { let i; do i = (rng() * cells) | 0; while (g[i] !== -1); g[i] = SC; }
    const fill = (prev) => {
      if (prev >= 0 && prev < 9 && rng() < rho) return prev;
      const u = rng();
      let s = 0;
      while (u >= cum[s]) s++;
      return s;
    };
    for (let col = 0; col < n; col++) {
      let prev = -1;
      for (let row = 0; row < R; row++) { const i = col * R + row; if (g[i] === -1) g[i] = prev = fill(prev); else prev = -1; }
    }
    const snap = () => { const o = []; for (let col = 0; col < n; col++) o.push(Array.from(g.subarray(col * R, col * R + R))); return o; };
    const first = out ? snap() : null, steps = out ? [] : null;
    let base = 0;
    for (let iter = 0; iter < 40; iter++) {
      cnt.fill(0);
      for (let i = 0; i < cells; i++) if (g[i] < 9) cnt[g[i]]++;
      const wins = out ? [] : null;
      let any = false;
      for (let s = 0; s < 9; s++) {
        const c = cnt[s];
        if (c >= 8) { const pay = cfg.pays[s][c >= 12 ? 2 : c >= 10 ? 1 : 0]; base += pay; any = true; if (wins) wins.push([s, c, pay]); }
      }
      if (!any) break;
      for (let col = 0; col < n; col++) {
        const o = col * R;
        let w = R - 1; // survivors sink to the lowest free cells; blocks stay where they are
        for (let row = R - 1; row >= 0; row--) {
          const v = g[o + row];
          if (v === BLOCK) continue;
          if (v === SC || cnt[v] < 8) { while (g[o + w] === BLOCK) w--; g[o + w] = v; w--; }
        }
        let prev = -1; // the free cells left above are refilled from the top
        for (let row = 0; row <= w; row++) { if (g[o + row] === BLOCK) { prev = -1; continue; } g[o + row] = prev = fill(prev); }
      }
      if (steps) steps.push({ wins, g: snap() });
    }
    let M;
    if (kind === 3) { st.T += sum; M = st.T || 1; } else M = sum || 1;
    const win = base * M;
    st.nsc = nsc;
    if (out) out.push({ g: first, blocks, steps, base, M, T: kind === 3 ? st.T : 0, win });
    return win;
  }
  function tumbleBonus(cfg, rng, h, st, stopAbove, out) {
    const capU = cfg.cap * 100;
    let total = tumbleSpin(cfg, rng, 0, 2, st, out);
    const spins = cfg.fs.spins[st.nsc - 4];
    if (out) out[0].fs = spins;
    st.T = 0;
    for (let i = 0; i < spins; i++) {
      total += tumbleSpin(cfg, rng, h, 3, st, out);
      if (total >= capU) return capU;
      if (total > stopAbove) return total;
    }
    return total;
  }

  // kind: 0 = base spin that does not trigger the bonus, 1 = feature (wild) spin, 2 = bonus trigger spin
  function simSpin(cfg, rng, h, kind, st, out) {
    if (cfg.type === 'tumble') return tumbleSpin(cfg, rng, h, kind, st, out);
    const n = cfg.reels;
    st.scRow.fill(-1);
    let nsc = 0;
    if (kind === 0) { const u = rng(); nsc = u < 0.74 ? 0 : u < 0.94 ? 1 : 2; }
    else if (kind === 2) { const u = rng(); nsc = u < 0.86 ? 3 : u < 0.97 ? 4 : 5; if (st.lvl >= 0) nsc = 3 + st.lvl; }
    for (let i = 0; i < nsc; i++) {
      let r;
      do r = (rng() * n) | 0; while (st.scRow[r] >= 0);
      st.scRow[r] = (rng() * cfg.rows) | 0;
    }
    const wp = kind === 2 ? 0 : wBase(h);
    let nw = 0;
    for (let r = 0; r < n; r++) {
      st.wild[r] = 0;
      if (wp && st.scRow[r] < 0 && rng() < wp) { st.wild[r] = pickMult(cfg, rng, h); nw++; }
    }
    if (kind === 1) {
      while (nw < cfg.featureWilds) {
        const r = (rng() * n) | 0;
        if (!st.wild[r]) { st.wild[r] = pickMult(cfg, rng, h); nw++; }
      }
    }
    const grid = out ? [] : null, wins = out ? [] : null;
    genReels(cfg, rng, h, st, grid);
    const win = evaluate(cfg, st.cnt, st.wild, 1, wins);
    st.nsc = nsc;
    if (out) out.push({ g: grid, w: Array.from(st.wild), fresh: null, win, wins, G: 1 });
    return win;
  }

  // Trigger spin plus free spins. Returns the round total, capped at the max win.
  // `stopAbove` lets the search abandon a round early once it has overshot its tier.
  function simBonus(cfg, rng, h, st, stopAbove, out) {
    if (cfg.type === 'tumble') return tumbleBonus(cfg, rng, h, st, stopAbove, out);
    const capU = cfg.cap * 100, fs = cfg.fs, n = cfg.reels, fw = st.fw;
    let total = simSpin(cfg, rng, 0, 2, st, out);
    const spins = fs.spins[st.nsc - 3];
    if (out) out[0].fs = spins;
    fw.fill(0);
    st.scRow.fill(-1);
    const wp = wFree(cfg, h);
    let G = 1;
    for (let i = 0; i < spins; i++) {
      if (fs.walk) {
        for (let r = 0; r < n - 1; r++) fw[r] = fw[r + 1] ? fw[r + 1] + 1 : 0;
        fw[n - 1] = 0;
      } else if (!fs.sticky) fw.fill(0);
      const fresh = out ? [] : null;
      let landed = 0;
      for (let r = 0; r < n; r++) {
        if (!fw[r] && rng() < wp) { fw[r] = pickMult(cfg, rng, h); landed++; if (fresh) fresh.push(r); }
      }
      G += landed * fs.ladder;
      const grid = out ? [] : null, wins = out ? [] : null;
      genReels(cfg, rng, h, st, grid);
      const win = evaluate(cfg, st.cnt, fw, G, wins);
      total += win;
      if (out) out.push({ g: grid, w: Array.from(fw), fresh, win, wins, G });
      if (total >= capU) return capU;
      if (total > stopAbove) return total;
    }
    return total;
  }

  // tier = [kind, lo, hi, heat, probability, meanUnits, bonusLevel?]; a round fits when lo < total <= hi
  function generate(cfg, tier, rng) {
    const kind = tier[0], lo = tier[1], hi = tier[2], h = tier[3];
    const st = getScratch(cfg), capU = cfg.cap * 100;
    st.lvl = kind === 2 && tier.length > 6 ? tier[6] : -1; // the tier fixes the bonus level (scatter count)
    const maxTries = kind === 2 ? 200000 : 2000000;
    const first = rng.get();
    for (let i = 0; i < maxTries; i++) {
      rng.mark();
      const total = kind === 2 ? simBonus(cfg, rng, h, st, hi, null) : Math.min(simSpin(cfg, rng, h, kind, st, null), capU);
      if (total > lo && total <= hi) { rng.rewind(); return replay(cfg, kind, h, rng); }
    }
    rng.set(first); // unreachable in practice: every published tier is hit within a few hundred tries
    return replay(cfg, kind, h, rng);
  }
  function replay(cfg, kind, h, rng) {
    const spins = [], st = getScratch(cfg), capU = cfg.cap * 100;
    const total = kind === 2 ? simBonus(cfg, rng, h, st, Infinity, spins) : Math.min(simSpin(cfg, rng, h, kind, st, spins), capU);
    return { total, capped: total >= capU, spins };
  }

  // floats: six provably fair floats in [0, 1) with 32 bits each
  function play(slotId, mode, floats) {
    const cfg = SLOTS[slotId], tiers = api.MATH[slotId][mode];
    const u = floats[4] + Math.floor(floats[5] * 2097152) / 9007199254740992;
    let index = tiers.length - 1;
    for (let i = 0, acc = 0; i < tiers.length; i++) {
      acc += tiers[i][4];
      if (u < acc) { index = i; break; }
    }
    const tier = tiers[index];
    const rng = makeRng(Math.floor(floats[0] * 4294967296), Math.floor(floats[1] * 4294967296), Math.floor(floats[2] * 4294967296), Math.floor(floats[3] * 4294967296));
    const round = generate(cfg, tier, rng);
    return { units: round.total, capped: round.capped, spins: round.spins, tier: index };
  }

  const api = { SC, BLOCK, SLOTS, MODES, LEVEL_MIN, LEVEL_NAME, MATH: null, FLOATS: 6, play, makeRng, getScratch, simSpin, simBonus };
  return api;
});
