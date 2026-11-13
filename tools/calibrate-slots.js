'use strict';
// Builds public/slots-math.js — the payout-tier table for every slot and mode.
//
//   node tools/calibrate-slots.js            all slots
//   node tools/calibrate-slots.js sugar      one slot (others are kept from the existing file)
//
// For each tier the tool finds the "heat" at which the engine produces rounds of that size
// most often, measures the average payout of rounds accepted into the tier, and then solves
// the tier probabilities so that every mode returns exactly RTP x its cost.
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const fs = require('fs');
const path = require('path');
const E = require('../public/slots-engine.js');

const RTP = 0.96;
const OUT = path.join(__dirname, '..', 'public', 'slots-math.js');
const LV_P = [0.86, 0.11, 0.03]; // how often a natural trigger is standard / enhanced / super
const LV_AVG = [1, 3, 8]; // relative average payout of each level
const LV_MIN = [0, 2100, 5500]; // lowest tier edge allowed per level (guaranteed 20x / 50x)
const HEATS = Array.from({ length: 21 }, (_, i) => i / 20);

// Distribution shape per slot. [s, tau, b] = lognormal width, tail weight, tail exponent.
//   hit        chance that a base spin pays without triggering the bonus
//   bonusEvery base spins per bonus trigger
//   spinRTP    share of RTP paid by ordinary base spins (the rest comes from the bonus)
//   featZero   chance that a feature spin pays nothing
const SHAPES = {
  djinn: { hit: 0.42, bonusEvery: 130, spinRTP: 0.6, spin: [1.1, 0.03, 1.7], bonus: [0.8, 0.15, 1.5], featZero: 0.28, feat: [1.0, 0.12, 1.5] },
  kitsune: { hit: 0.41, bonusEvery: 140, spinRTP: 0.59, spin: [1.1, 0.03, 1.7], bonus: [0.8, 0.2, 1.5], featZero: 0.28, feat: [1.0, 0.15, 1.5] },
  kraken: { hit: 0.4, bonusEvery: 150, spinRTP: 0.58, spin: [1.1, 0.03, 1.7], bonus: [0.85, 0.25, 1.45], featZero: 0.28, feat: [1.0, 0.18, 1.45] },
  nebula: { hit: 0.39, bonusEvery: 160, spinRTP: 0.57, spin: [1.1, 0.03, 1.7], bonus: [0.85, 0.3, 1.45], featZero: 0.28, feat: [1.05, 0.2, 1.45] },
  sugar: { hit: 0.38, bonusEvery: 170, spinRTP: 0.56, spin: [1.1, 0.03, 1.7], bonus: [0.9, 0.35, 1.4], featZero: 0.28, feat: [1.05, 0.25, 1.4] },
  witch: { hit: 0.4, bonusEvery: 150, spinRTP: 0.58, spin: [1.1, 0.03, 1.7], bonus: [0.85, 0.28, 1.45], featZero: 0.28, feat: [1.0, 0.18, 1.45] },
  dragon: { hit: 0.38, bonusEvery: 175, spinRTP: 0.56, spin: [1.1, 0.03, 1.7], bonus: [0.9, 0.35, 1.4], featZero: 0.25, feat: [1.05, 0.25, 1.4] },
  yeti: { hit: 0.34, bonusEvery: 180, spinRTP: 0.55, spin: [1.15, 0.04, 1.6], bonus: [0.9, 0.32, 1.4], featZero: 0.4, feat: [1.1, 0.25, 1.4] },
  blade: { hit: 0.39, bonusEvery: 160, spinRTP: 0.57, spin: [1.1, 0.03, 1.7], bonus: [0.88, 0.32, 1.42], featZero: 0.28, feat: [1.05, 0.22, 1.42] },
  oracle: { hit: 0.34, bonusEvery: 180, spinRTP: 0.55, spin: [1.15, 0.04, 1.6], bonus: [0.9, 0.32, 1.4], featZero: 0.4, feat: [1.1, 0.25, 1.4] },
};

const nice = (x) => { const p = Math.pow(10, Math.floor(Math.log10(x)) - 1); return Math.round(x / p) * p; };
function extend(edges, capU) {
  const out = edges.slice();
  for (;;) {
    const next = nice(out[out.length - 1] * 1.6);
    if (next >= capU * 0.75) break;
    out.push(next);
  }
  out.push(capU - 1);
  return out;
}
function mkTiers(kind, edges, zero, max, capU) {
  const t = [];
  if (zero) t.push({ kind, lo: -1, hi: 0 });
  for (let i = 1; i < edges.length; i++) t.push({ kind, lo: edges[i - 1], hi: edges[i] });
  if (max) t.push({ kind, lo: capU - 1, hi: capU, max: true });
  return t;
}
const sim = (cfg, rng, h, kind, st, stop) => (kind === 2 ? E.simBonus(cfg, rng, h, st, stop, null) : Math.min(E.simSpin(cfg, rng, h, kind, st, null), cfg.cap * 100));

// How often each heat lands in each tier.
function pilot(cfg, tiers, n) {
  const st = E.getScratch(cfg), kind = tiers[0].kind;
  const acc = tiers.map(() => new Float64Array(HEATS.length));
  HEATS.forEach((h, hi) => {
    const rng = E.makeRng(1234 + hi, 99, kind, 7);
    for (let i = 0; i < n; i++) {
      const total = sim(cfg, rng, h, kind, st, Infinity);
      for (let t = 0; t < tiers.length; t++) {
        if (total > tiers[t].lo && total <= tiers[t].hi) { acc[t][hi] += 1 / n; break; }
      }
    }
  });
  return acc;
}
// Average payout of rounds accepted into a tier at its heat.
function measure(cfg, tier, h, want, maxTries) {
  const st = E.getScratch(cfg), rng = E.makeRng(777, tier.lo + 1, tier.hi, tier.kind);
  let got = 0, sum = 0, tries = 0;
  while (got < want && tries < maxTries) {
    tries++;
    const total = sim(cfg, rng, h, tier.kind, st, tier.hi);
    if (total > tier.lo && total <= tier.hi) { got++; sum += total; }
  }
  return { mu: got ? sum / got : 0, acc: got / tries, got };
}
function prepare(cfg, tiers, pilotN, want, maxTries) {
  const acc = pilot(cfg, tiers, pilotN);
  const out = [];
  tiers.forEach((t, i) => {
    let best = 0;
    for (let h = 1; h < HEATS.length; h++) if (acc[i][h] > acc[i][best]) best = h;
    if (acc[i][best] <= 0) return;
    const m = t.max ? { mu: cfg.cap * 100, acc: acc[i][best], got: want } : measure(cfg, t, HEATS[best], want, maxTries);
    if (m.got < 400) return; // too rare to place reliably: leave the tier out
    out.push({ ...t, heat: HEATS[best], mu: m.mu, acc: m.acc });
  });
  return out;
}

// Lognormal body with a power-law tail over the tiers; the location is solved so the
// average payout equals `target` (in units).
function assign(tiers, mass, target, [s, tau, b]) {
  const at = (m) => {
    let sw = 0, sm = 0;
    const w = tiers.map((t) => {
      const x = Math.log(t.mu) - m;
      const body = Math.exp((-x * x) / (2 * s * s));
      const tail = x > 0 ? tau * Math.exp(-b * x) * (1 - body) : 0;
      const lo = Math.max(t.lo, t.hi / 2.5);
      const v = (body + tail) * (t.max ? 1 : Math.log(t.hi / lo) / Math.log(1.6));
      sw += v; sm += v * t.mu;
      return v;
    });
    return { mean: (mass * sm) / sw, p: w.map((v) => (mass * v) / sw) };
  };
  let lo = Math.log(tiers[0].mu) - 8, hi = Math.log(tiers[tiers.length - 1].mu) + 2;
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    if (at(mid).mean < target) lo = mid; else hi = mid;
  }
  const r = at((lo + hi) / 2);
  if (Math.abs(r.mean - target) > target * 1e-6) throw new Error(`cannot reach target mean ${target} (got ${r.mean})`);
  return r.p;
}

function calibrate(id) {
  const cfg = E.SLOTS[id], sh = SHAPES[id], capU = cfg.cap * 100;
  const spin = prepare(cfg, mkTiers(0, [0, 50, 100, 200, 300, 500, 800, 1300, 2100, 3400, 5500, 8900, 14400, 23300, 37700, 61000, 100000], true, false, capU), 60000, 30000, 6e6);
  const feat = prepare(cfg, mkTiers(1, extend([0, 100, 200, 300, 500, 800, 1300, 2100, 3400, 5500], capU), true, true, capU), 60000, 20000, 4e6);
  // Bonus levels (0 standard, 1 enhanced, 2 super): the level fixes the scatter count; higher
  // levels drop the tiers below their guaranteed minimum and are given a higher average.
  const st = E.getScratch(cfg);
  const bonusLv = [0, 1, 2].map((lvl) => {
    st.lvl = lvl;
    const tiers = mkTiers(2, extend([0, 200, 350, 500, 800, 1300, 2100, 3400, 5500], capU), false, true, capU).filter((t) => t.lo >= LV_MIN[lvl]).map((t) => ({ ...t, lvl }));
    return prepare(cfg, tiers, 12000, 5000, 8e5);
  });
  st.lvl = -1;
  const share = LV_P.map((p, l) => p * LV_AVG[l]), shareSum = share.reduce((a, b) => a + b, 0);

  const pack = (tiers, p) => tiers.map((t, i) => ({ ...t, p: p[i] }));
  const paying = (tiers) => tiers.filter((t) => t.hi > 0);
  const zero = (tiers) => tiers.filter((t) => t.hi === 0);
  const beta = 1 / sh.bonusEvery;

  const modes = {
    base: [
      ...pack(zero(spin), [1 - sh.hit - beta]),
      ...pack(paying(spin), assign(paying(spin), sh.hit, sh.spinRTP * 100, sh.spin)),
      ...bonusLv.flatMap((tiers, l) => pack(tiers, assign(tiers, beta * LV_P[l], ((RTP - sh.spinRTP) * 100 * share[l]) / shareSum, sh.bonus))),
    ],
    feature: (() => {
      const z = zero(feat).length ? sh.featZero : 0;
      return [...pack(zero(feat), [z]), ...pack(paying(feat), assign(paying(feat), 1 - z, RTP * cfg.cost.feature * 100, sh.feat))];
    })(),
    bonus: pack(bonusLv[0], assign(bonusLv[0], 1, RTP * cfg.cost.bonus * 100, sh.bonus)),
    enhanced: pack(bonusLv[1], assign(bonusLv[1], 1, RTP * cfg.cost.enhanced * 100, sh.bonus)),
    super: pack(bonusLv[2], assign(bonusLv[2], 1, RTP * cfg.cost.super * 100, sh.bonus)),
    // mystery: one of the three bought bonuses at random, weighted so the price is fair
    mystery: (() => {
      const buy = [cfg.cost.bonus, cfg.cost.enhanced, cfg.cost.super], q2 = (cfg.cost.mystery - 0.7 * buy[0] - 0.3 * buy[1]) / (buy[2] - buy[0]), q = [0.7 - q2, 0.3, q2];
      return bonusLv.flatMap((tiers, l) => pack(tiers, assign(tiers, q[l], q[l] * RTP * buy[l] * 100, sh.bonus)));
    })(),
  };

  const result = { meta: { rtp: {}, maxOdds: {}, hit: sh.hit + beta, bonusOdds: sh.bonusEvery }, base: null, feature: null, bonus: null };
  const report = [];
  for (const mode of E.MODES) {
    const tiers = modes[mode].sort((x, y) => y.lo - x.lo);
    const rows = tiers.map((t) => [t.kind, t.lo, t.hi, t.heat, Number(t.p.toPrecision(12)), Number(t.mu.toFixed(2)), ...(t.kind === 2 ? [t.lvl] : [])]);
    rows[rows.length - 1][4] += 1 - rows.reduce((a, r) => a + r[4], 0); // absorb rounding in the most common tier
    result[mode] = rows;
    const rtp = rows.reduce((a, r) => a + r[4] * r[5], 0) / (100 * cfg.cost[mode]);
    const pMax = rows.filter((r) => r[2] === capU).reduce((a, r) => a + r[4], 0), max = pMax ? [0, 0, 0, 0, pMax] : null;
    result.meta.rtp[mode] = Number(rtp.toFixed(5));
    result.meta.maxOdds[mode] = max ? Math.round(1 / max[4]) : null;
    report.push(`  ${mode.padEnd(8)} RTP ${(rtp * 100).toFixed(3)}%  tiers ${rows.length}  slowest tier hit ${(Math.min(...tiers.map((t) => t.acc)) * 100).toFixed(2)}%  max win 1 in ${max ? Math.round(1 / max[4]).toLocaleString('en-US') : '-'}`);
    for (const t of tiers) report.push(`      ${String(t.lo / 100).padStart(9)} – ${String(t.hi / 100).padEnd(9)} kind ${t.kind}  heat ${t.heat.toFixed(2)}  hit ${(t.acc * 100).toFixed(2).padStart(6)}%  mean ${(t.mu / 100).toFixed(2).padStart(10)}  p ${t.p.toExponential(3)}`);
  }
  return { id, result, report: `${cfg.name} (${id}) — max win ${cfg.cap.toLocaleString('en-US')}x\n${report.join('\n')}` };
}

if (!isMainThread) {
  parentPort.postMessage(calibrate(workerData));
} else {
  const ids = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(E.SLOTS);
  let math = {};
  try { math = require(OUT); } catch {}
  const t0 = Date.now();
  Promise.all(ids.map((id) => new Promise((resolve, reject) => {
    const w = new Worker(__filename, { workerData: id });
    w.once('message', resolve);
    w.once('error', reject);
  }))).then((done) => {
    for (const d of done) { math[d.id] = d.result; console.log(d.report + '\n'); }
    const ordered = Object.keys(E.SLOTS).filter((id) => math[id]);
    const body = ordered.map((id) => {
      const m = math[id];
      const mode = (k) => `    ${k}: [\n${m[k].map((r) => '      ' + JSON.stringify(r)).join(',\n')},\n    ]`;
      return `  ${id}: {\n    meta: ${JSON.stringify(m.meta)},\n${E.MODES.map(mode).join(',\n')},\n  }`;
    }).join(',\n');
    fs.writeFileSync(OUT, `// Generated by tools/calibrate-slots.js — do not edit by hand.\n// Each tier is [kind, lo, hi, heat, probability, meanPayout]; amounts are 0.01 x bet.\n(function (m) {\n  if (typeof module === 'object' && module.exports) module.exports = m;\n  else SlotEngine.MATH = m;\n})({\n${body},\n});\n`);
    console.log(`wrote ${path.relative(process.cwd(), OUT)} in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  }).catch((e) => { console.error(e); process.exit(1); });
}
