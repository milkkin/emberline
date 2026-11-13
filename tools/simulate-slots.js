'use strict';
// Plays every slot and mode through the real engine with random fair floats and compares
// what was paid with what the published table promises.
//
//   node tools/simulate-slots.js [spinsPerMode=1000000]
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const crypto = require('crypto');
const E = require('../public/slots-engine.js');
E.MATH = require('../public/slots-math.js');

const ENOUGH = 2000; // a tier needs this many rounds before its average is compared

function run({ id, mode, n }) {
  const cfg = E.SLOTS[id], tiers = E.MATH[id][mode], cost = cfg.cost[mode];
  let paid = 0, hits = 0, max = 0, bonus = 0, capped = 0, mismatch = 0;
  const count = new Float64Array(tiers.length), sums = new Float64Array(tiers.length);
  const floats = new Array(6);
  const t0 = Date.now();
  for (let i = 0; i < n; i++) {
    const buf = crypto.randomBytes(24);
    for (let k = 0; k < 6; k++) floats[k] = buf.readUInt32BE(k * 4) / 4294967296;
    const r = E.play(id, mode, floats);
    paid += r.units;
    count[r.tier]++; sums[r.tier] += r.units;
    if (r.units > 0) hits++;
    if (r.units > max) max = r.units;
    if (r.spins.length > 1) bonus++;
    if (r.capped) capped++;
    // the detailed replay must agree with the fast search, and the wins must add up
    const sum = Math.min(r.spins.reduce((a, s) => a + s.win, 0), cfg.cap * 100);
    if (sum !== r.units) mismatch++;
  }
  const expect = tiers.reduce((a, t) => a + t[4] * t[5], 0);
  // Tight check: over the tiers that came up often, compare the average paid with the table.
  let coreP = 0, coreE = 0, worst = 0;
  tiers.forEach((t, i) => {
    if (count[i] < ENOUGH) return;
    coreP += t[4] * (sums[i] / count[i]); coreE += t[4] * t[5];
    if (t[5] > 0) worst = Math.max(worst, Math.abs(sums[i] / count[i] / t[5] - 1));
  });
  return {
    id, mode, n, mismatch,
    usPerSpin: ((Date.now() - t0) * 1000) / n,
    rtp: paid / n / (100 * cost), rtpExpected: expect / (100 * cost),
    core: coreP / (100 * cost), coreExpected: coreE / (100 * cost), worst,
    hit: hits / n, bonusEvery: bonus ? n / bonus : 0, max: max / 100, capped,
  };
}

if (!isMainThread) {
  parentPort.postMessage(run(workerData));
} else {
  const n = Number(process.argv[2]) || 1000000;
  const jobs = [];
  for (const id of Object.keys(E.SLOTS)) for (const mode of E.MODES) jobs.push({ id, mode, n: mode === 'bonus' ? Math.round(n / 5) : n });
  const results = [];
  let next = 0, running = 0;
  const pump = () => {
    while (running < 4 && next < jobs.length) {
      const w = new Worker(__filename, { workerData: jobs[next++] });
      running++;
      w.once('message', (r) => { results.push(r); running--; pump(); });
      w.once('error', (e) => { console.error(e); process.exit(1); });
    }
    if (!running && next >= jobs.length) report();
  };
  const pct = (x) => (x * 100).toFixed(2) + '%';
  const report = () => {
    results.sort((a, b) => jobs.findIndex((j) => j.id === a.id && j.mode === a.mode) - jobs.findIndex((j) => j.id === b.id && j.mode === b.mode));
    console.log('slot     mode     spins      RTP paid / table     common tiers paid / table  worst tier   hit rate  bonus every  biggest     us/spin  errors');
    for (const r of results) {
      console.log(`${r.id.padEnd(8)} ${r.mode.padEnd(8)} ${String(r.n).padStart(8)}   ${pct(r.rtp).padStart(8)} / ${pct(r.rtpExpected)}      ${pct(r.core).padStart(8)} / ${pct(r.coreExpected).padEnd(8)}       ${pct(r.worst).padStart(6)}      ${pct(r.hit).padStart(7)}  ${(r.bonusEvery ? r.bonusEvery.toFixed(0) : '-').padStart(8)}   ${(r.max + 'x').padStart(10)}  ${r.usPerSpin.toFixed(1).padStart(7)}  ${r.mismatch}`);
    }
  };
  pump();
}
