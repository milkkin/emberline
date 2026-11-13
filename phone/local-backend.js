'use strict';
// Emberline solo mode: the server's game logic running inside the page, for places where no
// server can be reached (a phone, a hosted static page). One player, balance kept in this
// browser's storage. Mirrors the routes in server.js; results use the same seed scheme, but
// the "server" seed is generated on this device, so fairness here is a self-check only.
window.LocalBackend = (() => {
  const CURRENCIES = { EMBER: { rate: 1, dp: 2, start: 1000 }, USDT: { rate: 1, dp: 2, start: 1000 }, BTC: { rate: 100000, dp: 8, start: 0.01 }, ETH: { rate: 4000, dp: 6, start: 0.25 }, SOL: { rate: 200, dp: 4, start: 5 } };
  const RTP = 0.99, MAX_BET_USD = 1000, MIN_BET_USD = 0.01, CRASH_K = 0.00009, MAX_MULT = 1e6, FAUCET_COOLDOWN = 10e3, SLOT_MIN_USD = 0.2, SLOT_MAX_USD = 100;
  const KEY = 'emberline-solo';
  const r8 = (x) => Math.round(x * 1e8) / 1e8;
  const floor2 = (x) => Math.floor(x * 100 + 1e-9) / 100;
  const bad = (msg) => { throw new Error(msg); };

  // ---------- SHA-256 / HMAC (synchronous, so it works in any frame) ----------
  const K = [];
  for (let n = 2; K.length < 64; n++) { let p = true; for (let d = 2; d * d <= n; d++) if (n % d === 0) { p = false; break; } if (p) K.push((Math.cbrt(n) % 1) * 4294967296 >>> 0); }
  function sha256(bytes) {
    const h = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
    const len = bytes.length, total = ((len + 9 + 63) >> 6) << 6, m = new Uint8Array(total), w = new Uint32Array(64);
    m.set(bytes); m[len] = 0x80;
    const dv = new DataView(m.buffer);
    dv.setUint32(total - 8, Math.floor((len * 8) / 4294967296)); dv.setUint32(total - 4, (len * 8) >>> 0);
    const rot = (x, n) => (x >>> n) | (x << (32 - n));
    for (let o = 0; o < total; o += 64) {
      for (let i = 0; i < 16; i++) w[i] = dv.getUint32(o + i * 4);
      for (let i = 16; i < 64; i++) { const a = w[i - 15], b = w[i - 2]; w[i] = (w[i - 16] + (rot(a, 7) ^ rot(a, 18) ^ (a >>> 3)) + w[i - 7] + (rot(b, 17) ^ rot(b, 19) ^ (b >>> 10))) >>> 0; }
      let [a, b, c, d, e, f, g, hh] = h;
      for (let i = 0; i < 64; i++) {
        const t1 = (hh + (rot(e, 6) ^ rot(e, 11) ^ rot(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + w[i]) >>> 0;
        const t2 = ((rot(a, 2) ^ rot(a, 13) ^ rot(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) >>> 0;
        hh = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
      }
      h[0] = (h[0] + a) >>> 0; h[1] = (h[1] + b) >>> 0; h[2] = (h[2] + c) >>> 0; h[3] = (h[3] + d) >>> 0;
      h[4] = (h[4] + e) >>> 0; h[5] = (h[5] + f) >>> 0; h[6] = (h[6] + g) >>> 0; h[7] = (h[7] + hh) >>> 0;
    }
    const out = new Uint8Array(32), ov = new DataView(out.buffer);
    h.forEach((v, i) => ov.setUint32(i * 4, v));
    return out;
  }
  const utf8 = (s) => new TextEncoder().encode(s);
  const toHex = (b) => [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  function hmac(keyStr, msg) {
    let key = utf8(keyStr);
    if (key.length > 64) key = sha256(key);
    const ipad = new Uint8Array(64), opad = new Uint8Array(64);
    for (let i = 0; i < 64; i++) { const k = key[i] || 0; ipad[i] = k ^ 0x36; opad[i] = k ^ 0x5c; }
    const m = utf8(msg), inner = new Uint8Array(64 + m.length);
    inner.set(ipad); inner.set(m, 64);
    const outer = new Uint8Array(96);
    outer.set(opad); outer.set(sha256(inner), 64);
    return sha256(outer);
  }
  function randomHex(n) {
    const b = new Uint8Array(n);
    if (window.crypto && crypto.getRandomValues) crypto.getRandomValues(b); else for (let i = 0; i < n; i++) b[i] = (Math.random() * 256) | 0;
    return toHex(b);
  }

  // ---------- state ----------
  let db = null;
  function fresh() {
    return {
      user: { name: 'you', bal: Object.fromEntries(Object.entries(CURRENCIES).map(([c, v]) => [c, v.start])), seed: { server: randomHex(32), client: randomHex(8), nonce: 0 }, stats: { bets: 0, wagered: 0, profit: 0 }, faucetAt: 0 },
      bets: [], betId: 0,
    };
  }
  function load() {
    if (db) return;
    try { db = JSON.parse(localStorage.getItem(KEY)); } catch { db = null; }
    if (!db || !db.user || !db.user.seed) db = fresh();
    const u = db.user;
    for (const [c, v] of Object.entries(CURRENCIES)) if (!(c in u.bal)) u.bal[c] = v.start;
    if (u.crash) { u.bal[u.crash.cur] = r8(u.bal[u.crash.cur] + u.crash.bet); delete u.crash; }
    save();
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch {} }

  // ---------- fair results (same scheme as the server) ----------
  function draw(u, n) {
    const nonce = u.seed.nonce++, f = [];
    for (let round = 0; f.length < n; round++) {
      const d = hmac(u.seed.server, `${u.seed.client}:${nonce}:${round}`);
      for (let i = 0; i < 32 && f.length < n; i += 4) f.push(d[i] / 256 + d[i + 1] / 65536 + d[i + 2] / 16777216 + d[i + 3] / 4294967296);
    }
    return { f, nonce };
  }
  const crashPoint = (f) => Math.min(MAX_MULT, Math.max(1, Math.floor(99 / (1 - f)) / 100));
  function minesMult(count, picks) { let m = RTP; for (let i = 0; i < picks; i++) m *= (25 - i) / (25 - count - i); return Math.round(m * 1e4) / 1e4; }
  const PLINKO_RISK = { low: { c: 0.5, p: 2 }, medium: { c: 0.4, p: 3 }, high: { c: 0.2, p: 6 } }, PLINKO = {};
  for (const risk of Object.keys(PLINKO_RISK)) {
    PLINKO[risk] = {};
    for (let n = 8; n <= 16; n++) {
      const { c, p } = PLINKO_RISK[risk], prob = [];
      let comb = 1;
      for (let k = 0; k <= n; k++) { prob.push(comb / 2 ** n); comb = (comb * (n - k)) / (k + 1); }
      const d = prob.map((_, k) => Math.abs(k - n / 2) / (n / 2));
      const T = (RTP - c) / prob.reduce((s, pk, k) => s + pk * d[k] ** p, 0);
      PLINKO[risk][n] = d.map((dk) => Math.round((c + T * dk ** p) * 100) / 100);
    }
  }


  // ---------- Sparks: loyalty points ----------
// Earned by wagering (daily goals), a daily check-in and inviting friends. The wagering goals
  // are capped per day at a level the free faucet covers in minutes, so buying EMBER gives no
  // advantage: a free player can earn every Spark a paying player can.
  const QUESTS = {
    w1: { name: 'Wager 500 EMBER today', goal: 500, reward: 50 },
    w2: { name: 'Wager 2,000 EMBER today', goal: 2000, reward: 150 },
    w3: { name: 'Wager 5,000 EMBER today', goal: 5000, reward: 300 },
  };
  const CHECKIN_SPARKS = 50, REFERRER_SPARKS = 500, REFERRED_SPARKS = 200;
  const dayKey = (t = Date.now()) => new Date(t).toISOString().slice(0, 10);
  function daily(u) {
    if (!u.daily || u.daily.day !== dayKey()) u.daily = { day: dayKey(), wagered: 0, claimed: {}, checkin: false };
    return u.daily;
  }
  const questProgress = (d) => Math.floor(d.wagered || 0); // value wagered today, in EMBER (1 EMBER = 1 unit)
  function sparksView(u) {
    const d = daily(u), next = u.lastCheckin === dayKey(Date.now() - 864e5) ? (u.streak || 0) + 1 : 1;
    return {
      sparks: u.sparks || 0, streak: u.streak || 0, checkedIn: d.checkin, checkinReward: CHECKIN_SPARKS * Math.min(7, d.checkin ? u.streak || 1 : next),
      quests: Object.entries(QUESTS).map(([id, q]) => ({ id, ...q, progress: Math.min(q.goal, questProgress(d, id)), claimed: !!d.claimed[id] })),
      referrals: u.refs || 0, refCode: null, bot: '', perFriend: REFERRER_SPARKS,
    };
  }
  function sparksCheckin(u) {
    const d = daily(u);
    if (d.checkin) bad('You have already checked in today');
    u.streak = u.lastCheckin === dayKey(Date.now() - 864e5) ? (u.streak || 0) + 1 : 1;
    u.lastCheckin = dayKey(); d.checkin = true;
    u.sparks = (u.sparks || 0) + CHECKIN_SPARKS * Math.min(7, u.streak);
  }
  function sparksClaim(u, id) {
    const d = daily(u), q = Object.hasOwn(QUESTS, id) ? QUESTS[id] : bad('Unknown quest');
    if (d.claimed[id]) bad('Already claimed today');
    if (questProgress(d, id) < q.goal) bad('Quest not finished yet');
    d.claimed[id] = true;
    u.sparks = (u.sparks || 0) + q.reward;
  }
  
  // ---------- betting core ----------
  function takeBet(u, body) {
    const cur = String(body.currency);
    const c = Object.hasOwn(CURRENCIES, cur) ? CURRENCIES[cur] : bad('Unknown currency');
    const bet = r8(Number(body.bet));
    if (!Number.isFinite(bet) || bet <= 0) bad('Enter a bet amount');
    if (bet * c.rate < MIN_BET_USD - 1e-9) bad(`Minimum bet is $${MIN_BET_USD}`);
    if (bet * c.rate > MAX_BET_USD + 1e-9) bad(`Maximum bet is $${MAX_BET_USD}`);
    if (u.bal[cur] < bet) bad('Insufficient balance');
    u.bal[cur] = r8(u.bal[cur] - bet);
    return { bet, cur };
  }
  function recordBet(u, game, bet, cur, mult, nonce) {
    const payout = r8(bet * mult), rate = CURRENCIES[cur].rate;
    u.bal[cur] = r8(u.bal[cur] + payout);
    u.stats.bets++; u.stats.wagered = r8(u.stats.wagered + bet * rate); u.stats.profit = r8(u.stats.profit + (payout - bet) * rate); const d = daily(u); d.wagered = (d.wagered || 0) + bet * rate;
    const rec = { id: ++db.betId, game, user: u.name, bet, cur, mult, payout, nonce, t: Date.now() };
    db.bets.push(rec);
    if (db.bets.length > 200) db.bets.splice(0, db.bets.length - 150);
    save();
    return rec;
  }
  const num = (v, lo, hi, msg) => { const n = Number(v); if (!Number.isFinite(n) || n < lo || n > hi) bad(msg); return n; };
  const copy = (o) => JSON.parse(JSON.stringify(o));

  function publicMines(u) {
    const m = u.mines;
    if (!m) return null;
    const k = m.revealed.length;
    return { bet: m.bet, cur: m.cur, count: m.count, revealed: m.revealed.slice(), mult: k ? minesMult(m.count, k) : 1, next: minesMult(m.count, k + 1) };
  }
  function minesFinish(u, won) {
    const m = u.mines;
    delete u.mines;
    const mult = won ? minesMult(m.count, m.revealed.length) : 0;
    const bet = recordBet(u, 'mines', m.bet, m.cur, mult, m.nonce);
    return { over: true, won, minePos: m.mines, revealed: m.revealed, mult, payout: bet.payout, bal: copy(u.bal), bet };
  }
  let round = null; // crash round (in memory)
  function crashSettle(mult) {
    const r = round;
    if (!r || r.done) return;
    clearTimeout(r.timer);
    const u = db.user;
    delete u.crash;
    const bet = recordBet(u, 'crash', r.bet, r.cur, mult, r.nonce);
    r.done = { crashed: !mult, mult, crashPoint: r.crashPoint, payout: bet.payout, bal: copy(u.bal), bet };
    r.waiters.splice(0).forEach((fn) => fn(r.done));
  }
  function publicUser(u) {
    return {
      name: u.name, bal: copy(u.bal), stats: copy(u.stats), mines: publicMines(u),
      seed: { hash: toHex(sha256(utf8(u.seed.server))), client: u.seed.client, nonce: u.seed.nonce },
      crash: round && !round.done ? { bet: round.bet, cur: round.cur, auto: round.auto, elapsed: Date.now() - round.startAt } : null,
    };
  }

  // ---------- routes ----------
  const me = () => ({ user: publicUser(db.user), token: null });
  const routes = {
    '/api/config': () => ({ currencies: CURRENCIES, plinko: PLINKO, crashK: CRASH_K, maxBetUsd: MAX_BET_USD, rtp: RTP }),
    '/api/me': me, '/api/guest': me, '/api/login': me, '/api/register': me,
    '/api/logout': () => ({ ok: true }),
    '/api/faucet': (u, body) => {
      const cur = String(body.currency);
      if (!Object.hasOwn(CURRENCIES, cur)) bad('Unknown currency');
      const wait = u.faucetAt + FAUCET_COOLDOWN - Date.now();
      if (wait > 0) bad(`Faucet available in ${Math.ceil(wait / 1000)}s`);
      u.faucetAt = Date.now();
      u.bal[cur] = r8(u.bal[cur] + CURRENCIES[cur].start);
      save();
      return { bal: copy(u.bal) };
    },
    '/api/seed/rotate': (u, body) => {
      if (u.mines || u.crash) bad('Finish your active game before rotating seeds');
      const client = String(body.clientSeed || '').trim();
      if (!/^[\x21-\x7e]{1,64}$/.test(client)) bad('Client seed must be 1–64 printable characters without spaces');
      const previous = { serverSeed: u.seed.server, hash: toHex(sha256(utf8(u.seed.server))), clientSeed: u.seed.client, nonce: u.seed.nonce };
      u.seed = { server: randomHex(32), client, nonce: 0 };
      save();
      return { previous, user: publicUser(u) };
    },
    '/api/dice': (u, body) => {
      const target = Math.round(num(body.target, 0, 100, 'Invalid target') * 100) / 100, over = !!body.over, chance = over ? 100 - target : target;
      if (chance < 0.01 || chance > 98) bad('Win chance must be between 0.01% and 98%');
      const { bet, cur } = takeBet(u, body), { f, nonce } = draw(u, 1);
      const roll = Math.floor(f[0] * 10000) / 100, win = over ? roll >= target : roll < target;
      const rec = recordBet(u, 'dice', bet, cur, win ? Math.round(((RTP * 100) / chance) * 1e4) / 1e4 : 0, nonce);
      return { roll, win, bal: copy(u.bal), bet: rec };
    },
    '/api/limbo': (u, body) => {
      const target = Math.round(num(body.target, 1.01, 10000, 'Target must be between 1.01× and 10,000×') * 100) / 100;
      const { bet, cur } = takeBet(u, body), { f, nonce } = draw(u, 1);
      const result = crashPoint(f[0]), win = result >= target;
      const rec = recordBet(u, 'limbo', bet, cur, win ? target : 0, nonce);
      return { result, win, bal: copy(u.bal), bet: rec };
    },
    '/api/plinko': (u, body) => {
      const rows = num(body.rows, 8, 16, 'Rows must be 8–16'), risk = String(body.risk);
      if (!Number.isInteger(rows)) bad('Rows must be 8–16');
      if (!Object.hasOwn(PLINKO, risk)) bad('Invalid risk');
      const { bet, cur } = takeBet(u, body), { f, nonce } = draw(u, rows);
      const path = f.map((x) => (x < 0.5 ? 0 : 1)), bucket = path.reduce((a, b) => a + b, 0);
      const rec = recordBet(u, 'plinko', bet, cur, PLINKO[risk][rows][bucket], nonce);
      return { path, bucket, bal: copy(u.bal), bet: rec };
    },
    '/api/mines/start': (u, body) => {
      if (u.mines) bad('You already have a mines game in progress');
      const count = num(body.mines, 1, 24, 'Mines must be 1–24');
      if (!Number.isInteger(count)) bad('Mines must be 1–24');
      const { bet, cur } = takeBet(u, body), { f, nonce } = draw(u, count);
      const a = Array.from({ length: 25 }, (_, i) => i);
      for (let i = 0; i < count; i++) { const j = i + Math.floor(f[i] * (25 - i)); [a[i], a[j]] = [a[j], a[i]]; }
      u.mines = { bet, cur, count, mines: a.slice(0, count), revealed: [], nonce };
      save();
      return { mines: publicMines(u), bal: copy(u.bal) };
    },
    '/api/mines/reveal': (u, body) => {
      const m = u.mines || bad('No active mines game'), tile = Number(body.tile);
      if (!Number.isInteger(tile) || tile < 0 || tile > 24 || m.revealed.includes(tile)) bad('Invalid tile');
      if (m.mines.includes(tile)) return { hit: tile, ...minesFinish(u, false) };
      m.revealed.push(tile);
      if (m.revealed.length === 25 - m.count) return minesFinish(u, true);
      save();
      return { mines: publicMines(u), bal: copy(u.bal) };
    },
    '/api/mines/cashout': (u) => {
      const m = u.mines || bad('No active mines game');
      if (!m.revealed.length) bad('Reveal at least one tile first');
      return minesFinish(u, true);
    },
    '/api/crash/start': (u, body) => {
      if (round && !round.done) bad('Round already in progress');
      let auto = null;
      if (body.auto != null && body.auto !== '') auto = Math.round(num(body.auto, 1.01, MAX_MULT, 'Auto cashout must be at least 1.01×') * 100) / 100;
      const { bet, cur } = takeBet(u, body), { f, nonce } = draw(u, 1);
      const cp = crashPoint(f[0]), autoWins = auto !== null && auto <= cp;
      round = { bet, cur, auto, crashPoint: cp, nonce, startAt: Date.now(), waiters: [], done: null };
      round.timer = setTimeout(() => crashSettle(autoWins ? auto : 0), Math.log(autoWins ? auto : cp) / CRASH_K);
      u.crash = { bet, cur };
      save();
      return { bal: copy(u.bal), auto };
    },
    '/api/crash/cashout': () => {
      if (!round || round.done) bad('No round in progress');
      const m = floor2(Math.exp(CRASH_K * (Date.now() - round.startAt)));
      crashSettle(m <= round.crashPoint ? m : 0);
      return round.done;
    },
    '/api/crash/wait': () => {
      if (!round) bad('No round');
      return round.done || new Promise((resolve) => round.waiters.push(resolve));
    },
    '/api/slots/spin': (u, body) => {
      const id = String(body.slot), mode = String(body.mode || 'base'), cur = String(body.currency);
      if (!Object.hasOwn(SlotEngine.SLOTS, id)) bad('Unknown slot');
      if (!SlotEngine.MODES.includes(mode)) bad('Unknown mode');
      const c = Object.hasOwn(CURRENCIES, cur) ? CURRENCIES[cur] : bad('Unknown currency');
      const cfg = SlotEngine.SLOTS[id], cost = cfg.cost[mode], bet = r8(Number(body.bet));
      if (!Number.isFinite(bet) || bet <= 0) bad('Enter a bet amount');
      if (bet * c.rate < SLOT_MIN_USD - 1e-9) bad(`Minimum slot bet is $${SLOT_MIN_USD.toFixed(2)}`);
      if (bet * c.rate > SLOT_MAX_USD + 1e-9) bad(`Maximum slot bet is $${SLOT_MAX_USD}`);
      if (bet * cost * c.rate > MAX_BET_USD + 1e-9) bad(`This feature costs ${cost}× the bet; lower the bet to $${(MAX_BET_USD / cost).toFixed(2)} or less`);
      const { bet: stake } = takeBet(u, { bet: bet * cost, currency: cur }), { f, nonce } = draw(u, SlotEngine.FLOATS);
      const r = SlotEngine.play(id, mode, f);
      const rec = recordBet(u, cfg.name, stake, cur, r.units / 100 / cost, nonce);
      return { round: { spins: r.spins, units: r.units, capped: r.capped }, bal: copy(u.bal), bet: rec };
    },
    '/api/shop': () => ({ enabled: false, packs: [] }),
    '/api/leaderboard': (u) => ({ top: u.sparks ? [{ name: u.name, points: u.sparks }] : [], you: { points: u.sparks || 0, rank: u.sparks ? 1 : null }, players: u.sparks ? 1 : 0 }),
    '/api/airdrop': (u) => sparksView(u),
    '/api/airdrop/checkin': (u) => { sparksCheckin(u); save(); return sparksView(u); },
    '/api/airdrop/claim': (u, body) => { sparksClaim(u, String(body.quest)); save(); return sparksView(u); },
    '/api/bets': () => ({ bets: db.bets.slice(-30).reverse() }),
    '/api/bets/mine': () => ({ bets: db.bets.slice(-30).reverse() }),
  };

  // Same contract as fetch-based api(): resolves with the JSON body, rejects with Error(message).
  async function call(url, body) {
    load();
    const fn = routes[url.startsWith('/') ? url : '/' + url];
    if (!fn) throw new Error('Not found');
    return fn(db.user, body || {});
  }
  return { call };
})();
