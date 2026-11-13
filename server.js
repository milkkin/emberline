'use strict';
// Emberline — provably fair casino server. Zero dependencies: `node server.js`.
// All balances are DEMO credits. No real deposits or withdrawals exist.
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const slots = require('./public/slots-engine.js');
slots.MATH = require('./public/slots-math.js');

const PORT = Number(process.env.PORT) || 3000;
const PUBLIC = path.join(__dirname, 'public');
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// Fixed demo rates (not live prices). `start` is the faucet amount (~$1,000).
const CURRENCIES = {
  EMBER: { rate: 1, dp: 2, start: 1000 }, // the house play currency: free, not purchasable, not redeemable
  USDT: { rate: 1, dp: 2, start: 1000 },
  BTC: { rate: 100000, dp: 8, start: 0.01 },
  ETH: { rate: 4000, dp: 6, start: 0.25 },
  SOL: { rate: 200, dp: 4, start: 5 },
};
const RTP = 0.99; // 1% house edge on every game
const MAX_BET_USD = 1000;
const MIN_BET_USD = 0.01;
const CRASH_K = 0.00009; // multiplier = e^(K * ms)
const MAX_MULT = 1e6;
const SLOT_MIN_USD = 0.2; // base bet limits for slots; the total stake still obeys MAX_BET_USD
const SLOT_MAX_USD = 100;
const FAUCET_COOLDOWN = 10e3;
const SESSION_TTL = 30 * 24 * 3600e3;
// Framing is allowed by default so the site renders inside an embedded preview pane.
// Set DENY_FRAMING=1 on a real deployment to forbid embedding (clickjacking defence).
const DENY_FRAMING = process.env.DENY_FRAMING === '1';
// Telegram Mini App login. Set TELEGRAM_BOT_TOKEN to the token BotFather gave your bot.
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
// EMBER shop (Telegram Stars). EMBER is a play currency: it can be bought, never sold back,
// withdrawn or exchanged. Set TELEGRAM_WEBHOOK_SECRET and point the bot's webhook at
// /api/telegram/webhook with the same secret_token to turn the shop on.
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || '';
const SHOP_ON = !!(BOT_TOKEN && WEBHOOK_SECRET);
const PACKS = {
  small: { stars: 100, ember: 5000, name: 'Pouch of EMBER' },
  medium: { stars: 500, ember: 30000, name: 'Chest of EMBER' },
  large: { stars: 2500, ember: 200000, name: 'Vault of EMBER' },
};
let BOT_NAME = ''; // filled in from Telegram at start, for invite links
async function telegram(method, payload) {
  const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  const j = await r.json().catch(() => ({}));
  if (!j.ok) throw new HttpError(502, 'Telegram did not accept the request');
  return j.result;
}

// ---------- persistence ----------
let db = { users: {}, sessions: {}, bets: [], betId: 0 };
try {
  db = Object.assign(db, JSON.parse(fs.readFileSync(DB_FILE, 'utf8')));
} catch {}
let saveTimer = null;
function save() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(DB_FILE + '.tmp', JSON.stringify(db));
    fs.renameSync(DB_FILE + '.tmp', DB_FILE);
  }, 250);
}
// Crash rounds live in memory; refund any that were open when the server stopped.
for (const u of Object.values(db.users)) {
  for (const [c, v] of Object.entries(CURRENCIES)) if (!(c in u.bal)) { u.bal[c] = v.start; save(); } // currencies added since the account was made
  if (u.crash) {
    u.bal[u.crash.cur] = r8(u.bal[u.crash.cur] + u.crash.bet);
    delete u.crash;
    save();
  }
}

// ---------- helpers ----------
function r8(x) {
  return Math.round(x * 1e8) / 1e8;
}
const floor2 = (x) => Math.floor(x * 100 + 1e-9) / 100;
class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
const bad = (msg, status = 400) => {
  throw new HttpError(status, msg);
};
const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');
const newSeed = () => crypto.randomBytes(32).toString('hex');

// ---------- provably fair ----------
// float_i = bytes of HMAC-SHA256(serverSeed, `${clientSeed}:${nonce}:${round}`), 4 bytes per float.
function* floatGen(server, client, nonce) {
  for (let round = 0; ; round++) {
    const d = crypto.createHmac('sha256', server).update(`${client}:${nonce}:${round}`).digest();
    for (let i = 0; i < 32; i += 4) {
      yield d[i] / 256 + d[i + 1] / 65536 + d[i + 2] / 16777216 + d[i + 3] / 4294967296;
    }
  }
}
function draw(u, n) {
  const nonce = u.seed.nonce++;
  const g = floatGen(u.seed.server, u.seed.client, nonce);
  const f = [];
  for (let i = 0; i < n; i++) f.push(g.next().value);
  return { f, nonce };
}
const diceRoll = (f) => Math.floor(f * 10000) / 100; // 0.00 – 99.99
const crashPoint = (f) => Math.min(MAX_MULT, Math.max(1, Math.floor(99 / (1 - f)) / 100));
function minePositions(f, count) {
  const a = Array.from({ length: 25 }, (_, i) => i);
  for (let i = 0; i < count; i++) {
    const j = i + Math.floor(f[i] * (25 - i));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, count);
}
function minesMult(count, picks) {
  let m = RTP;
  for (let i = 0; i < picks; i++) m *= (25 - i) / (25 - count - i);
  return Math.round(m * 1e4) / 1e4;
}

// Plinko payout tables: mult(d) = c + T·d^p, d = distance from centre (0..1),
// with T solved so the expected return is exactly RTP before 2dp rounding.
const PLINKO_RISK = { low: { c: 0.5, p: 2 }, medium: { c: 0.4, p: 3 }, high: { c: 0.2, p: 6 } };
const PLINKO = {};
for (const risk of Object.keys(PLINKO_RISK)) {
  PLINKO[risk] = {};
  for (let n = 8; n <= 16; n++) {
    const { c, p } = PLINKO_RISK[risk];
    const prob = [];
    let comb = 1;
    for (let k = 0; k <= n; k++) {
      prob.push(comb / 2 ** n);
      comb = (comb * (n - k)) / (k + 1);
    }
    const d = prob.map((_, k) => Math.abs(k - n / 2) / (n / 2));
    const T = (RTP - c) / prob.reduce((s, pk, k) => s + pk * d[k] ** p, 0);
    PLINKO[risk][n] = d.map((dk) => Math.round((c + T * dk ** p) * 100) / 100);
  }
}

// ---------- accounts ----------
function publicUser(u) {
  const round = crashRounds.get(u.key);
  return {
    name: u.name,
    bal: u.bal,
    seed: { hash: sha256(u.seed.server), client: u.seed.client, nonce: u.seed.nonce },
    stats: u.stats,
    mines: publicMines(u),
    crash: round && !round.done ? { bet: round.bet, cur: round.cur, auto: round.auto, elapsed: Date.now() - round.startAt } : null,
  };
}
function createUser(name, password) {
  const key = name.toLowerCase();
  if (db.users[key]) bad('That username is taken');
  const salt = crypto.randomBytes(16).toString('hex');
  const u = {
    key,
    name,
    salt,
    hash: crypto.scryptSync(password, salt, 32).toString('hex'),
    bal: Object.fromEntries(Object.entries(CURRENCIES).map(([c, v]) => [c, v.start])),
    seed: { server: newSeed(), client: crypto.randomBytes(8).toString('hex'), nonce: 0 },
    stats: { bets: 0, wagered: 0, profit: 0 },
    faucetAt: 0,
    created: Date.now(),
  };
  db.users[key] = u;
  return u;
}
function startSession(res, u) {
  const token = crypto.randomBytes(32).toString('hex');
  db.sessions[token] = { user: u.key, exp: Date.now() + SESSION_TTL };
  res.setHeader('Set-Cookie', `sid=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_TTL / 1000}`);
  save();
  return token;
}
// A session is presented either as the cookie or as `Authorization: Bearer <token>`.
// The header exists because browsers drop SameSite cookies when the site is embedded
// in a frame on another site (for example a preview pane).
function sessionTokens(req) {
  const out = [];
  const b = /^Bearer ([a-f0-9]{64})$/.exec(req.headers.authorization || '');
  if (b) out.push(b[1]);
  const c = /(?:^|;\s*)sid=([a-f0-9]{64})/.exec(req.headers.cookie || '');
  if (c) out.push(c[1]);
  return out;
}
function currentUser(req) {
  for (const t of sessionTokens(req)) {
    const s = Object.hasOwn(db.sessions, t) ? db.sessions[t] : null;
    if (s && s.exp >= Date.now() && Object.hasOwn(db.users, s.user)) return db.users[s.user];
  }
  return null;
}
function credentials(body) {
  const name = String(body.name || '').trim();
  const password = String(body.password || '');
  if (!/^[A-Za-z0-9_]{3,16}$/.test(name)) bad('Username must be 3–16 letters, numbers or underscores');
  if (password.length < 6 || password.length > 128) bad('Password must be at least 6 characters');
  return { name, password };
}
const authHits = new Map();
function throttle(req) {
  const ip = req.socket.remoteAddress;
  const now = Date.now();
  const hits = (authHits.get(ip) || []).filter((t) => now - t < 60e3);
  if (hits.length >= 20) bad('Too many attempts, try again in a minute', 429);
  hits.push(now);
  authHits.set(ip, hits);
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
    referrals: u.refs || 0, refCode: u.key.startsWith('tg') ? u.key : null, bot: BOT_NAME, perFriend: REFERRER_SPARKS,
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
  const payout = r8(bet * mult);
  u.bal[cur] = r8(u.bal[cur] + payout);
  const rate = CURRENCIES[cur].rate;
  u.stats.bets++;
  u.stats.wagered = r8(u.stats.wagered + bet * rate);
  u.stats.profit = r8(u.stats.profit + (payout - bet) * rate);
  const d = daily(u); d.wagered = (d.wagered || 0) + bet * rate;
  const rec = { id: ++db.betId, game, user: u.name, bet, cur, mult, payout, nonce, t: Date.now() };
  db.bets.push(rec);
  if (db.bets.length > 3000) db.bets.splice(0, db.bets.length - 2000);
  save();
  return rec;
}
const num = (v, lo, hi, msg) => {
  const n = Number(v);
  if (!Number.isFinite(n) || n < lo || n > hi) bad(msg);
  return n;
};

// ---------- mines ----------
function publicMines(u) {
  const m = u.mines;
  if (!m) return null;
  const k = m.revealed.length;
  return { bet: m.bet, cur: m.cur, count: m.count, revealed: m.revealed, mult: k ? minesMult(m.count, k) : 1, next: minesMult(m.count, k + 1) };
}
function minesFinish(u, won) {
  const m = u.mines;
  delete u.mines;
  const mult = won ? minesMult(m.count, m.revealed.length) : 0;
  const bet = recordBet(u, 'mines', m.bet, m.cur, mult, m.nonce);
  return { over: true, won, minePos: m.mines, revealed: m.revealed, mult, payout: bet.payout, bal: u.bal, bet };
}

// ---------- crash ----------
const crashRounds = new Map();
function crashSettle(key, mult) {
  const r = crashRounds.get(key);
  if (!r || r.done) return;
  clearTimeout(r.timer);
  const u = db.users[key];
  delete u.crash;
  const bet = recordBet(u, 'crash', r.bet, r.cur, mult, r.nonce);
  r.done = { crashed: !mult, mult, crashPoint: r.crashPoint, payout: bet.payout, bal: u.bal, bet };
  r.waiters.splice(0).forEach((fn) => fn(r.done));
}

// ---------- routes ----------
const routes = {};
const route = (method, url, fn, auth = true) => (routes[`${method} ${url}`] = { fn, auth });

route('GET', '/api/config', () => ({ currencies: CURRENCIES, plinko: PLINKO, crashK: CRASH_K, maxBetUsd: MAX_BET_USD, rtp: RTP }), false);
route('GET', '/api/me', (req, res, u) => ({ user: u ? publicUser(u) : null }), false);

route('POST', '/api/register', (req, res, _, body) => {
  throttle(req);
  const { name, password } = credentials(body);
  const u = createUser(name, password);
  return { user: publicUser(u), token: startSession(res, u) };
}, false);
route('POST', '/api/guest', (req, res) => {
  throttle(req);
  let name;
  do name = 'guest_' + crypto.randomBytes(3).toString('hex');
  while (db.users[name]);
  const u = createUser(name, newSeed());
  return { user: publicUser(u), token: startSession(res, u) };
}, false);
route('POST', '/api/login', (req, res, _, body) => {
  throttle(req);
  const name = String(body.name || '').trim().toLowerCase();
  const u = Object.hasOwn(db.users, name) ? db.users[name] : null;
  const given = crypto.scryptSync(String(body.password || ''), u ? u.salt : 'x', 32);
  if (!u || !crypto.timingSafeEqual(given, Buffer.from(u.hash, 'hex'))) bad('Wrong username or password', 401);
  return { user: publicUser(u), token: startSession(res, u) };
}, false);
route('POST', '/api/logout', (req, res) => {
  for (const t of sessionTokens(req)) delete db.sessions[t];
  res.setHeader('Set-Cookie', 'sid=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0');
  save();
  return { ok: true };
}, false);

route('POST', '/api/faucet', (req, res, u, body) => {
  const cur = String(body.currency);
  if (!Object.hasOwn(CURRENCIES, cur)) bad('Unknown currency');
  const wait = u.faucetAt + FAUCET_COOLDOWN - Date.now();
  if (wait > 0) bad(`Faucet available in ${Math.ceil(wait / 1000)}s`, 429);
  u.faucetAt = Date.now();
  u.bal[cur] = r8(u.bal[cur] + CURRENCIES[cur].start);
  save();
  return { bal: u.bal };
});

route('POST', '/api/seed/rotate', (req, res, u, body) => {
  if (u.mines || u.crash) bad('Finish your active game before rotating seeds');
  const client = String(body.clientSeed || '').trim();
  if (!/^[\x21-\x7e]{1,64}$/.test(client)) bad('Client seed must be 1–64 printable characters without spaces');
  const previous = { serverSeed: u.seed.server, hash: sha256(u.seed.server), clientSeed: u.seed.client, nonce: u.seed.nonce };
  u.seed = { server: newSeed(), client, nonce: 0 };
  save();
  return { previous, user: publicUser(u) };
});

route('POST', '/api/dice', (req, res, u, body) => {
  const target = Math.round(num(body.target, 0, 100, 'Invalid target') * 100) / 100;
  const over = !!body.over;
  const chance = over ? 100 - target : target;
  if (chance < 0.01 || chance > 98) bad('Win chance must be between 0.01% and 98%');
  const { bet, cur } = takeBet(u, body);
  const { f, nonce } = draw(u, 1);
  const roll = diceRoll(f[0]);
  const win = over ? roll >= target : roll < target;
  const mult = win ? Math.round((RTP * 100 / chance) * 1e4) / 1e4 : 0;
  return { roll, win, bal: u.bal, bet: recordBet(u, 'dice', bet, cur, mult, nonce) };
});

route('POST', '/api/limbo', (req, res, u, body) => {
  const target = Math.round(num(body.target, 1.01, 10000, 'Target must be between 1.01× and 10,000×') * 100) / 100;
  const { bet, cur } = takeBet(u, body);
  const { f, nonce } = draw(u, 1);
  const result = crashPoint(f[0]);
  const win = result >= target;
  return { result, win, bal: u.bal, bet: recordBet(u, 'limbo', bet, cur, win ? target : 0, nonce) };
});

route('POST', '/api/plinko', (req, res, u, body) => {
  const rows = num(body.rows, 8, 16, 'Rows must be 8–16');
  if (!Number.isInteger(rows)) bad('Rows must be 8–16');
  const risk = String(body.risk);
  if (!Object.hasOwn(PLINKO, risk)) bad('Invalid risk');
  const { bet, cur } = takeBet(u, body);
  const { f, nonce } = draw(u, rows);
  const path = f.map((x) => (x < 0.5 ? 0 : 1));
  const bucket = path.reduce((a, b) => a + b, 0);
  return { path, bucket, bal: u.bal, bet: recordBet(u, 'plinko', bet, cur, PLINKO[risk][rows][bucket], nonce) };
});

route('POST', '/api/mines/start', (req, res, u, body) => {
  if (u.mines) bad('You already have a mines game in progress');
  const count = num(body.mines, 1, 24, 'Mines must be 1–24');
  if (!Number.isInteger(count)) bad('Mines must be 1–24');
  const { bet, cur } = takeBet(u, body);
  const { f, nonce } = draw(u, count);
  u.mines = { bet, cur, count, mines: minePositions(f, count), revealed: [], nonce };
  save();
  return { mines: publicMines(u), bal: u.bal };
});
route('POST', '/api/mines/reveal', (req, res, u, body) => {
  const m = u.mines || bad('No active mines game');
  const tile = Number(body.tile);
  if (!Number.isInteger(tile) || tile < 0 || tile > 24 || m.revealed.includes(tile)) bad('Invalid tile');
  if (m.mines.includes(tile)) return { hit: tile, ...minesFinish(u, false) };
  m.revealed.push(tile);
  if (m.revealed.length === 25 - m.count) return minesFinish(u, true);
  save();
  return { mines: publicMines(u), bal: u.bal };
});
route('POST', '/api/mines/cashout', (req, res, u) => {
  const m = u.mines || bad('No active mines game');
  if (!m.revealed.length) bad('Reveal at least one tile first');
  return minesFinish(u, true);
});

route('POST', '/api/crash/start', (req, res, u, body) => {
  const prev = crashRounds.get(u.key);
  if (prev && !prev.done) bad('Round already in progress');
  let auto = null;
  if (body.auto != null && body.auto !== '') auto = Math.round(num(body.auto, 1.01, MAX_MULT, 'Auto cashout must be at least 1.01×') * 100) / 100;
  const { bet, cur } = takeBet(u, body);
  const { f, nonce } = draw(u, 1);
  const cp = crashPoint(f[0]);
  const autoWins = auto !== null && auto <= cp;
  const round = { bet, cur, auto, crashPoint: cp, nonce, startAt: Date.now(), waiters: [], done: null };
  round.timer = setTimeout(() => crashSettle(u.key, autoWins ? auto : 0), Math.log(autoWins ? auto : cp) / CRASH_K);
  crashRounds.set(u.key, round);
  u.crash = { bet, cur };
  save();
  return { bal: u.bal, auto };
});
route('POST', '/api/crash/cashout', (req, res, u) => {
  const r = crashRounds.get(u.key);
  if (!r || r.done) bad('No round in progress');
  const m = floor2(Math.exp(CRASH_K * (Date.now() - r.startAt)));
  crashSettle(u.key, m <= r.crashPoint ? m : 0);
  return r.done;
});
route('GET', '/api/crash/wait', (req, res, u) => {
  const r = crashRounds.get(u.key) || bad('No round', 404);
  return r.done || new Promise((resolve) => r.waiters.push(resolve));
});

route('POST', '/api/slots/spin', (req, res, u, body) => {
  const id = String(body.slot), mode = String(body.mode || 'base'), cur = String(body.currency);
  if (!Object.hasOwn(slots.SLOTS, id)) bad('Unknown slot');
  if (!slots.MODES.includes(mode)) bad('Unknown mode');
  const c = Object.hasOwn(CURRENCIES, cur) ? CURRENCIES[cur] : bad('Unknown currency');
  const cfg = slots.SLOTS[id], cost = cfg.cost[mode];
  const bet = r8(Number(body.bet));
  if (!Number.isFinite(bet) || bet <= 0) bad('Enter a bet amount');
  if (bet * c.rate < SLOT_MIN_USD - 1e-9) bad(`Minimum slot bet is $${SLOT_MIN_USD.toFixed(2)}`);
  if (bet * c.rate > SLOT_MAX_USD + 1e-9) bad(`Maximum slot bet is $${SLOT_MAX_USD}`);
  if (bet * cost * c.rate > MAX_BET_USD + 1e-9) bad(`This feature costs ${cost}× the bet; lower the bet to $${(MAX_BET_USD / cost).toFixed(2)} or less`);
  const { bet: stake } = takeBet(u, { bet: bet * cost, currency: cur });
  const { f, nonce } = draw(u, slots.FLOATS);
  const round = slots.play(id, mode, f);
  // recordBet pays stake x mult, i.e. bet x units / 100
  const rec = recordBet(u, cfg.name, stake, cur, round.units / 100 / cost, nonce);
  return { round: { spins: round.spins, units: round.units, capped: round.capped }, bal: u.bal, bet: rec };
});

route('GET', '/api/leaderboard', (req, res, u) => {
  const all = Object.values(db.users).filter((x) => x.sparks > 0).sort((a, b) => b.sparks - a.sparks);
  return { top: all.slice(0, 20).map((x) => ({ name: x.name, points: x.sparks })), you: u ? { points: u.sparks || 0, rank: all.indexOf(u) + 1 || null } : null, players: all.length };
}, false);
route('GET', '/api/airdrop', (req, res, u) => sparksView(u));
route('POST', '/api/airdrop/checkin', (req, res, u) => { sparksCheckin(u); save(); return sparksView(u); });
route('POST', '/api/airdrop/claim', (req, res, u, body) => { sparksClaim(u, String(body.quest)); save(); return sparksView(u); });

// Telegram sends signed "initData" to a Mini App. The signature proves who the player is.
route('POST', '/api/telegram', (req, res, _, body) => {
  if (!BOT_TOKEN) bad('Telegram login is not configured on this server', 503);
  throttle(req);
  const p = new URLSearchParams(String(body.initData || ''));
  const hash = p.get('hash') || '';
  p.delete('hash');
  const check = [...p.entries()].map(([k, v]) => `${k}=${v}`).sort().join('\n');
  const secret = crypto.createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
  const calc = crypto.createHmac('sha256', secret).update(check).digest('hex');
  if (hash.length !== calc.length || !crypto.timingSafeEqual(Buffer.from(calc), Buffer.from(hash))) bad('Invalid Telegram login', 401);
  if (!(Date.now() / 1000 - Number(p.get('auth_date')) < 86400)) bad('Telegram login expired, reopen the app', 401);
  let tu;
  try { tu = JSON.parse(p.get('user')); } catch { bad('Invalid Telegram login', 401); }
  if (!tu || !Number.isSafeInteger(tu.id)) bad('Invalid Telegram login', 401);
  const key = 'tg' + tu.id;
  let u = Object.hasOwn(db.users, key) ? db.users[key] : null;
  if (!u) {
    u = createUser(key, newSeed());
    // invite links carry the inviter's code; both sides get Sparks once, when the friend first joins
    const ref = String(p.get('start_param') || '');
    if (/^tg\d+$/.test(ref) && ref !== key && Object.hasOwn(db.users, ref)) {
      u.ref = ref; u.sparks = REFERRED_SPARKS;
      db.users[ref].sparks = (db.users[ref].sparks || 0) + REFERRER_SPARKS; db.users[ref].refs = (db.users[ref].refs || 0) + 1;
    }
  }
  const handle = String(tu.username || '').replace(/[^A-Za-z0-9_]/g, '').slice(0, 20);
  u.name = '@' + (handle || key); // "@" keeps Telegram names apart from registered usernames
  return { user: publicUser(u), token: startSession(res, u) };
}, false);

route('GET', '/api/shop', () => ({ enabled: SHOP_ON, packs: Object.entries(PACKS).map(([id, p]) => ({ id, ...p })) }), false);
route('POST', '/api/shop/invoice', async (req, res, u, body) => {
  if (!SHOP_ON) bad('The shop is not set up on this server', 503);
  if (!u.key.startsWith('tg')) bad('Open Emberline inside Telegram to buy EMBER');
  const id = String(body.pack);
  const pack = Object.hasOwn(PACKS, id) ? PACKS[id] : bad('Unknown pack');
  const link = await telegram('createInvoiceLink', {
    title: pack.name,
    description: `${pack.ember.toLocaleString('en-US')} EMBER play credits. EMBER has no cash value and cannot be withdrawn, sold or exchanged.`,
    payload: `${u.key}:${id}`, currency: 'XTR', prices: [{ label: pack.name, amount: pack.stars }],
  });
  return { link };
});
// Telegram calls this when a payment is being confirmed and when it has completed.
route('POST', '/api/telegram/webhook', async (req, res, _, body) => {
  const given = Buffer.from(String(req.headers['x-telegram-bot-api-secret-token'] || '')), want = Buffer.from(WEBHOOK_SECRET);
  if (!SHOP_ON || given.length !== want.length || !crypto.timingSafeEqual(given, want)) bad('Forbidden', 403);
  const valid = (payload, stars) => {
    const [key, id] = String(payload).split(':');
    return Object.hasOwn(db.users, key) && Object.hasOwn(PACKS, id) && PACKS[id].stars === stars ? { u: db.users[key], pack: PACKS[id] } : null;
  };
  if (body.pre_checkout_query) {
    const q = body.pre_checkout_query, ok = q.currency === 'XTR' && !!valid(q.invoice_payload, q.total_amount);
    await telegram('answerPreCheckoutQuery', { pre_checkout_query_id: q.id, ok, ...(ok ? {} : { error_message: 'This pack is no longer available.' }) });
  }
  const pay = body.message && body.message.successful_payment;
  if (pay && pay.currency === 'XTR') {
    db.payments = db.payments || {};
    const order = valid(pay.invoice_payload, pay.total_amount), charge = String(pay.telegram_payment_charge_id);
    if (order && !Object.hasOwn(db.payments, charge)) { // each Telegram charge is credited once
      db.payments[charge] = { user: order.u.key, ember: order.pack.ember, stars: pay.total_amount, t: Date.now() };
      order.u.bal.EMBER = r8(order.u.bal.EMBER + order.pack.ember);
      save();
    }
  }
  return { ok: true };
}, false);

const feed = ({ nonce, ...b }) => b;
route('GET', '/api/bets', () => ({ bets: db.bets.slice(-30).reverse().map(feed) }), false);
route('GET', '/api/bets/mine', (req, res, u) => {
  const out = [];
  for (let i = db.bets.length - 1; i >= 0 && out.length < 30; i--) if (db.bets[i].user === u.name) out.push(db.bets[i]);
  return { bets: out };
});

// ---------- http ----------
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
function send(res, status, obj) {
  if (res.writableEnded || res.destroyed) return;
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(obj));
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => {
      data += c;
      if (data.length > 10000) reject(new HttpError(413, 'Request too large'));
    });
    req.on('end', () => {
      try {
        const v = data ? JSON.parse(data) : {};
        resolve(v && typeof v === 'object' ? v : {});
      } catch {
        reject(new HttpError(400, 'Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}
function serveStatic(req, res, pathname) {
  const rel = pathname === '/' ? 'index.html' : decodeURIComponent(pathname.slice(1));
  const file = path.resolve(PUBLIC, rel);
  if (!file.startsWith(PUBLIC + path.sep)) return send(res, 403, { error: 'Forbidden' });
  fs.readFile(file, (err, buf) => {
    if (err) return send(res, 404, { error: 'Not found' });
    const headers = {
      'Content-Type': MIME[path.extname(file)] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff',
    };
    if (DENY_FRAMING) headers['X-Frame-Options'] = 'DENY';
    res.writeHead(200, headers);
    res.end(buf);
  });
}

http
  .createServer(async (req, res) => {
    let pathname;
    try {
      pathname = new URL(req.url, 'http://x').pathname;
    } catch {
      return send(res, 400, { error: 'Bad request' });
    }
    if (!pathname.startsWith('/api/')) {
      if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, { error: 'Method not allowed' });
      return serveStatic(req, res, pathname);
    }
    const r = routes[`${req.method} ${pathname}`];
    if (!r) return send(res, 404, { error: 'Not found' });
    try {
      let body = {};
      if (req.method === 'POST') {
        // JSON-only POSTs + SameSite cookies keep cross-site forms from placing bets.
        if (!/^application\/json/.test(req.headers['content-type'] || '')) bad('Expected application/json', 415);
        body = await readBody(req);
      }
      const u = currentUser(req);
      if (r.auth && !u) bad('Please log in', 401);
      send(res, 200, await r.fn(req, res, u, body));
    } catch (e) {
      if (!(e instanceof HttpError)) console.error(e);
      send(res, e.status || 500, { error: e instanceof HttpError ? e.message : 'Server error' });
    }
  })
  .listen(PORT, () => {
    console.log(`Emberline running at http://localhost:${PORT}`);
    if (BOT_TOKEN) telegram('getMe').then((me) => { BOT_NAME = me.username; }).catch(() => {});
    // With Telegram configured, connect the bot to this server on every start (webhook, Play button).
    if (SHOP_ON && (process.env.PUBLIC_URL || process.env.RENDER_EXTERNAL_URL)) {
      require('child_process').spawn(process.execPath, [path.join(__dirname, 'tools', 'telegram-setup.js')], { stdio: 'inherit' }).on('error', (e) => console.error('Telegram setup could not start:', e.message));
    }
  });
