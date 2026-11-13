'use strict';
// ---------- tiny DOM helpers ----------
const $ = (s, el = document) => el.querySelector(s);
function h(tag, props = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') e.className = v;
    else if (k === 'html') e.innerHTML = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (v !== false && v != null) e.setAttribute(k, v === true ? '' : v);
  }
  for (const k of kids.flat()) if (k != null && k !== false) e.append(k.nodeType ? k : document.createTextNode(k));
  return e;
}
const svg = (d, vb = '0 0 24 24') => `<svg viewBox="${vb}" fill="currentColor" aria-hidden="true">${d}</svg>`;
const ICON = {
  home: svg('<path d="M12 3l9 8h-2.5v9h-5v-6h-3v6h-5v-9H3z"/>'),
  dice: svg('<path d="M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2zm3 3.5A1.5 1.5 0 108 9.5 1.5 1.5 0 008 6.5zm8 0a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm-4 4a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm-4 4a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm8 0a1.5 1.5 0 100 3 1.5 1.5 0 000-3z" fill-rule="evenodd"/>'),
  limbo: svg('<path d="M12 2l4 7h-3v6h-2V9H8zM4 18h16v3H4z"/>'),
  crash: svg('<path d="M3 20h18v2H3zM4 17l5-6 4 3 6-9 1.7 1.1L13.6 17 9.4 13.8 5.5 18.3z"/>'),
  mines: svg('<path d="M12 2l3 4h4l1 5-8 11L4 11l1-5h4z"/>'),
  plinko: svg('<circle cx="12" cy="4" r="2"/><circle cx="8" cy="10" r="2"/><circle cx="16" cy="10" r="2"/><circle cx="4" cy="16" r="2"/><circle cx="12" cy="16" r="2"/><circle cx="20" cy="16" r="2"/><path d="M2 20h20v2H2z"/>'),
  bomb: svg('<circle cx="11" cy="14" r="7.5"/><path d="M15.5 7.5l2-2 1.5 1.5-2 2zM19 2l.7 1.8L21.5 4.5l-1.8.7L19 7l-.7-1.8L16.5 4.5l1.8-.7z"/>'),
};
ICON.gem = ICON.mines;

// ---------- state ----------
// localStorage can throw when storage is blocked (private mode, sandboxed frames).
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch {} },
};
const state = { me: null, cfg: null, cur: store.get('cur') || 'EMBER', bet: '1.00', feed: 'all' };
let token = store.get('sid');
function setToken(t) {
  token = t || null;
  store.set('sid', token);
}
const cur = () => state.cfg.currencies[state.cur];
const fmt = (x, c = state.cur) => Number(x).toFixed(state.cfg.currencies[c].dp);
const fmtMult = (m) => (m >= 1000 ? m.toLocaleString('en-US', { maximumFractionDigits: 0 }) : m.toFixed(2)) + '×';
const usd = (x, c = state.cur) => '$' + (x * state.cfg.currencies[c].rate).toFixed(2);

// URLs are sent relative to the page and the session also travels as a bearer token, so the
// app keeps working behind a path-prefixing proxy or inside a frame where cookies are dropped.
async function api(url, body) {
  if (window.LocalBackend) return LocalBackend.call(url, body);
  const headers = {};
  if (token) headers.Authorization = 'Bearer ' + token;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const res = await fetch(url.replace(/^\//, ''), body === undefined ? { headers } : { method: 'POST', headers, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}
function toast(msg, ok) {
  const t = h('div', { class: 'toast' + (ok ? ' ok' : '') }, msg);
  $('#toasts').append(t);
  setTimeout(() => t.remove(), 3200);
}
// Runs a bet action; shows errors as toasts and resyncs the balance when one fails.
async function attempt(fn) {
  try {
    return await fn();
  } catch (e) {
    toast(e.message);
    if (state.me) api('/api/me').then((r) => setUser(r.user)).catch(() => {});
  }
}
function setBal(bal) {
  if (!state.me || !bal) return;
  state.me.bal = bal;
  renderBal();
}
function adjustBal(delta) {
  state.me.bal[state.cur] = Math.round((state.me.bal[state.cur] + delta) * 1e8) / 1e8;
  renderBal();
}
function renderBal() {
  if (state.me) $('#bal').textContent = fmt(state.me.bal[state.cur]);
}
function setUser(u) {
  state.me = u;
  $('#wallet-pill').hidden = !u;
  $('#logout-btn').hidden = !u;
  $('#user-name').hidden = !u;
  $('#login-btn').hidden = !!u;
  if (u) $('#user-name').textContent = u.name;
  renderBal();
}
const needLogin = () => (state.me ? false : (authModal(), true));

// ---------- modals ----------
function modal(title, body, wide) {
  const close = () => ov.remove();
  const ov = h('div', { class: 'overlay', onmousedown: (e) => e.target === ov && close() },
    h('div', { class: 'modal' + (wide ? ' wide' : ''), role: 'dialog', 'aria-label': title },
      h('h3', {}, title, h('button', { class: 'x', onclick: close, 'aria-label': 'Close' }, '×')), body));
  $('#modal-root').replaceChildren(ov);
  return close;
}
function authModal() {
  let mode = 'login';
  const name = h('input', { type: 'text', autocomplete: 'username', maxlength: 16 });
  const pass = h('input', { type: 'password', autocomplete: 'current-password' });
  const err = h('div', { class: 'err' });
  const submit = h('button', { class: 'btn accent big', type: 'submit' }, 'Log in');
  const seg = h('div', { class: 'seg' },
    ...['login', 'register'].map((m) => h('button', { type: 'button', class: m === mode ? 'on' : '', onclick: (e) => {
      mode = m;
      seg.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b === e.target));
      submit.textContent = m === 'login' ? 'Log in' : 'Create account';
    } }, m === 'login' ? 'Log in' : 'Register')));
  const done = (r) => { setToken(r.token); setUser(r.user); close(); route(); refreshBets(); };
  const form = h('form', { onsubmit: async (e) => {
    e.preventDefault();
    try { done(await api('/api/' + mode, { name: name.value, password: pass.value })); } catch (ex) { err.textContent = ex.message; }
  } },
    seg, h('div', { style: 'height:14px' }),
    h('label', { class: 'field' }, h('span', {}, 'Username'), name),
    h('label', { class: 'field' }, h('span', {}, 'Password'), pass),
    err, submit,
    h('div', { style: 'height:10px' }),
    h('button', { class: 'btn ghost big', type: 'button', onclick: async () => {
      try { done(await api('/api/guest', {})); } catch (ex) { err.textContent = ex.message; }
    } }, 'Play as guest'),
    h('p', { class: 'hint' }, 'New accounts start with about $1,000 of demo credits in each currency.'));
  const close = modal('Welcome to Emberline', form);
  name.focus();
}
function walletModal() {
  const body = h('div');
  const shopBox = h('div', { class: 'hint' }, 'Loading…');
  api('/api/shop').then((r) => {
    const tg = window.Telegram && window.Telegram.WebApp;
    if (!r.enabled || !tg || !tg.initData) return shopBox.replaceChildren('Buying EMBER is available when Emberline is opened as a Telegram Mini App. The faucet above is always free.');
    shopBox.className = '';
    shopBox.replaceChildren(
      ...r.packs.map((p) => h('div', { class: 'wallet-row' }, h('b', { style: 'width:auto' }, p.name), h('div', { class: 'mono' }, p.ember.toLocaleString('en-US') + ' EMBER'),
        h('button', { class: 'btn accent small', onclick: () => attempt(async () => {
          const { link } = await api('/api/shop/invoice', { pack: p.id });
          tg.openInvoice(link, (status) => { if (status === 'paid') { toast('Payment received — adding your EMBER', true); setTimeout(() => api('/api/me').then((m) => { setUser(m.user); draw(); }), 2500); } });
        }) }, `${p.stars.toLocaleString('en-US')} Stars`))),
      h('p', { class: 'hint' }, 'EMBER is a play currency for entertainment, for adults 18+. It has no cash value and can never be withdrawn, sold, exchanged or redeemed for anything. Winning EMBER does not win money.'));
  }).catch(() => { shopBox.textContent = 'The shop is unavailable right now.'; });
  const pointsBox = h('div', { class: 'hint' }, 'Loading…');
  api('/api/leaderboard').then((r) => {
    pointsBox.className = '';
    pointsBox.replaceChildren(
      h('div', { class: 'stats', style: 'margin-top:0;grid-template-columns:repeat(2,1fr)' },
        h('div', { class: 'stat' }, h('small', {}, 'Your points'), h('b', {}, Math.floor(r.you ? r.you.points : 0).toLocaleString('en-US'))),
        h('div', { class: 'stat' }, h('small', {}, 'Your rank'), h('b', {}, r.you && r.you.rank ? `#${r.you.rank} of ${r.players}` : '—'))),
      h('p', { class: 'hint' }, 'You earn 1 point for every $1 of demo credits you wager. Points have no cash value and no reward is attached to them.'),
      ...r.top.slice(0, 10).map((x, i) => h('div', { class: 'wallet-row' }, h('b', {}, '#' + (i + 1)), h('div', { class: 'mono' }, x.name), h('div', { class: 'mono' }, Math.floor(x.points).toLocaleString('en-US')))));
  }).catch(() => { pointsBox.textContent = 'Points are unavailable right now.'; });
  const draw = () => {
    const s = state.me.stats;
    body.replaceChildren(
      h('p', { class: 'hint' }, 'Demo balances only. Rates are fixed for display and are not live market prices.'),
      ...Object.keys(state.cfg.currencies).map((c) => h('div', { class: 'wallet-row' },
        h('b', {}, c),
        h('div', { class: 'mono' }, fmt(state.me.bal[c], c), h('small', {}, usd(state.me.bal[c], c))),
        h('button', { class: 'btn small', onclick: () => attempt(async () => {
          setBal((await api('/api/faucet', { currency: c })).bal);
          toast(`Added ${state.cfg.currencies[c].start} ${c} demo credits`, true);
          draw();
        }) }, 'Faucet'))),
      h('h4', {}, 'Get EMBER'), shopBox,
      h('h4', {}, 'Points'), pointsBox,
      h('h4', {}, 'Your stats'),
      h('div', { class: 'stats', style: 'margin-top:0' },
        h('div', { class: 'stat' }, h('small', {}, 'Bets'), h('b', {}, String(s.bets))),
        h('div', { class: 'stat' }, h('small', {}, 'Wagered'), h('b', {}, '$' + s.wagered.toFixed(2))),
        h('div', { class: 'stat' }, h('small', {}, 'Profit'), h('b', {}, (s.profit < 0 ? '-$' : '$') + Math.abs(s.profit).toFixed(2)))));
  };
  api('/api/me').then((r) => { setUser(r.user); draw(); });
  draw();
  modal('Wallet', body);
}

// ---------- provably fair (client-side verification) ----------
const enc = (s) => new TextEncoder().encode(s);
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
async function fairFloats(server, client, nonce, n) {
  const key = await crypto.subtle.importKey('raw', enc(server), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const out = [];
  for (let round = 0; out.length < n; round++) {
    const d = new Uint8Array(await crypto.subtle.sign('HMAC', key, enc(`${client}:${nonce}:${round}`)));
    for (let i = 0; i < 32 && out.length < n; i += 4) out.push(d[i] / 256 + d[i + 1] / 65536 + d[i + 2] / 16777216 + d[i + 3] / 4294967296);
  }
  return out;
}
const crashFrom = (f) => Math.min(1e6, Math.max(1, Math.floor(99 / (1 - f)) / 100));
async function verify(game, server, client, nonce, param) {
  if (game.startsWith('slot:')) {
    const [, id, mode] = game.split(':');
    const r = SlotEngine.play(id, mode, await fairFloats(server, client, nonce, SlotEngine.FLOATS));
    const free = r.spins.length - 1;
    return `Payout: ${(r.units / 100).toLocaleString('en-US')}× bet` + (free ? ` · bonus with ${free} free spins` : '') + (r.capped ? ' · MAX WIN' : '');
  }
  if (game === 'dice') return 'Roll: ' + (Math.floor((await fairFloats(server, client, nonce, 1))[0] * 10000) / 100).toFixed(2);
  if (game === 'limbo' || game === 'crash') return 'Result: ' + fmtMult(crashFrom((await fairFloats(server, client, nonce, 1))[0]));
  if (game === 'plinko') {
    const path = (await fairFloats(server, client, nonce, param)).map((x) => (x < 0.5 ? 0 : 1));
    return `Path: ${path.map((b) => 'LR'[b]).join('')} → bucket ${path.reduce((a, b) => a + b, 0)} (0 = far left)`;
  }
  const f = await fairFloats(server, client, nonce, param);
  const a = Array.from({ length: 25 }, (_, i) => i);
  for (let i = 0; i < param; i++) {
    const j = i + Math.floor(f[i] * (25 - i));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return 'Mine tiles (1–25, row by row): ' + a.slice(0, param).map((x) => x + 1).sort((x, y) => x - y).join(', ');
}
function fairModal() {
  const body = h('div');
  const vServer = h('input', { type: 'text', placeholder: 'Revealed server seed' });
  const vClient = h('input', { type: 'text' });
  const vNonce = h('input', { type: 'number', min: 0, value: 0 });
  const vGame = h('select', {}, ...['dice', 'limbo', 'crash', 'mines', 'plinko'].map((g) => h('option', { value: g }, g[0].toUpperCase() + g.slice(1))),
    ...Object.entries(SlotEngine.SLOTS).flatMap(([id, s]) => [['base', 'spin'], ['feature', 'feature spin'], ['bonus', 'bought bonus'], ['enhanced', 'enhanced bonus'], ['super', 'super bonus'], ['mystery', 'mystery bonus']].map(([m, label]) => h('option', { value: `slot:${id}:${m}` }, `${s.name} — ${label}`))));
  const vParam = h('input', { type: 'number', value: 3 });
  const paramField = h('label', { class: 'field', hidden: true }, h('span', {}, 'Mines'), vParam);
  const out = h('div', { class: 'code' }, 'Enter a revealed server seed to verify a past bet.');
  vGame.addEventListener('change', () => {
    const g = vGame.value;
    paramField.hidden = g !== 'mines' && g !== 'plinko';
    paramField.firstChild.textContent = g === 'mines' ? 'Mines' : 'Rows';
    vParam.value = g === 'mines' ? 3 : 16;
  });
  const top = h('div');
  const drawTop = (revealed) => {
    const s = state.me && state.me.seed;
    if (!s) return top.replaceChildren(h('p', { class: 'hint' }, 'Log in to see your seed pair. The verifier below works without an account.'));
    const clientIn = h('input', { type: 'text', value: s.client, maxlength: 64 });
    vClient.value = revealed ? revealed.clientSeed : s.client;
    top.replaceChildren(
      h('label', { class: 'field' }, h('span', {}, 'Active server seed (SHA-256 hash)'), h('div', { class: 'code' }, s.hash)),
      h('label', { class: 'field' }, h('span', {}, 'Client seed', h('em', {}, `Next nonce: ${s.nonce}`)),
        h('div', { class: 'row' }, clientIn, h('button', { class: 'btn small', onclick: () => attempt(async () => {
          const r = await api('/api/seed/rotate', { clientSeed: clientIn.value });
          setUser(r.user);
          vServer.value = r.previous.serverSeed;
          drawTop(r.previous);
        }) }, 'Rotate'))),
      revealed && h('label', { class: 'field' }, h('span', {}, `Previous server seed — revealed (${revealed.nonce} bets)`), h('div', { class: 'code' }, revealed.serverSeed)));
  };
  drawTop();
  if (state.me) api('/api/me').then((r) => { setUser(r.user); drawTop(); });
  body.append(
    h('p', { class: 'hint' }, 'Before you bet, the server commits to a secret seed by showing its hash. Each result is HMAC-SHA256(server seed, "client seed:nonce:round"). Rotating reveals the old seed so every past bet can be recomputed.'),
    top,
    h('h4', {}, 'Verify a bet'),
    h('label', { class: 'field' }, h('span', {}, 'Server seed'), vServer),
    h('label', { class: 'field' }, h('span', {}, 'Client seed'), vClient),
    h('div', { class: 'row' },
      h('label', { class: 'field', style: 'flex:1' }, h('span', {}, 'Nonce'), vNonce),
      h('label', { class: 'field', style: 'flex:1' }, h('span', {}, 'Game'), vGame),
      paramField),
    h('button', { class: 'btn accent big', onclick: async () => {
      try {
        if (!vServer.value.trim()) throw new Error('Enter the revealed server seed');
        const param = Math.max(1, Math.min(vGame.value === 'mines' ? 24 : 16, Math.floor(+vParam.value) || 1));
        const hash = hex(await crypto.subtle.digest('SHA-256', enc(vServer.value.trim())));
        const result = await verify(vGame.value, vServer.value.trim(), vClient.value.trim(), Math.floor(+vNonce.value) || 0, param);
        out.replaceChildren(h('b', {}, result), h('br'), h('br'), 'Seed hash: ' + hash);
      } catch (e) {
        out.textContent = e.message || 'Verification needs a secure context (https or localhost).';
      }
    } }, 'Verify'),
    h('div', { style: 'height:12px' }), out);
  modal('Provably fair', body, true);
}

// ---------- shared game UI ----------
function betField() {
  const inp = h('input', { type: 'number', min: 0, step: 'any', value: state.bet, inputmode: 'decimal' });
  const hint = h('em');
  const sync = () => { state.bet = inp.value; hint.textContent = usd(+inp.value || 0); };
  const set = (v) => { inp.value = Math.max(0, v).toFixed(cur().dp); sync(); };
  inp.addEventListener('input', sync);
  sync();
  const maxBet = () => Math.min(state.me ? state.me.bal[state.cur] : 0, state.cfg.maxBetUsd / cur().rate);
  return {
    el: h('label', { class: 'field' }, h('span', {}, `Bet amount (${state.cur})`, hint),
      h('div', { class: 'row' }, inp,
        h('button', { class: 'mini', type: 'button', onclick: () => set(+inp.value / 2) }, '½'),
        h('button', { class: 'mini', type: 'button', onclick: () => set(Math.min(+inp.value * 2, state.cfg.maxBetUsd / cur().rate)) }, '2×'),
        h('button', { class: 'mini', type: 'button', onclick: () => set(maxBet()) }, 'Max'))),
    get: () => +inp.value,
    lock: (on) => { inp.disabled = on; },
  };
}
function numField(label, attrs, onchange) {
  const inp = h('input', { type: 'number', step: 'any', ...attrs });
  inp.addEventListener('input', () => onchange && onchange(+inp.value));
  return { el: h('label', { class: 'field' }, h('span', {}, label), inp), inp, get: () => +inp.value };
}
function chipRow() {
  const el = h('div', { class: 'chips' });
  return { el, add: (text, win) => { el.append(h('span', { class: 'chip' + (win ? ' w' : '') }, text)); while (el.children.length > 12) el.firstChild.remove(); } };
}
function frame(title, controls, stage, stageClass = '') {
  return h('div', { class: 'game' }, h('div', { class: 'panel' }, h('h2', {}, title), controls), h('div', { class: 'stage ' + stageClass }, stage));
}
function fitCanvas(canvas) {
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth, hh = canvas.clientHeight;
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(hh * dpr)) {
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(hh * dpr);
  }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w, h: hh };
}

// ---------- views ----------
// Each view receives a `live` object; live.on turns false when the user navigates away.
const views = {};

views[''] = (root, live) => {
  const cards = [
    ['dice', 'Dice', 'Pick your odds, roll 0–100', '#7a2f1c,#c9512b'],
    ['limbo', 'Limbo', 'Set a target, beat the multiplier', '#4b2a7a,#8a4fd6'],
    ['crash', 'Crash', 'Cash out before it burns out', '#7a5a14,#d19a1f'],
    ['mines', 'Mines', 'Find gems, dodge the mines', '#175a45,#27a07a'],
    ['plinko', 'Plinko', 'Drop the ball, chase the edges', '#6b1f47,#c73d83'],
  ];
  root.append(
    h('div', { class: 'hero' },
      h('h1', {}, 'Every roll, verifiable.'),
      h('p', {}, 'Ten slots with wild reels, tumbling wins and max wins up to 250,000×, five table games, and results you can recompute yourself from a committed seed. Play with demo credits — nothing here costs or pays real money.'),
      state.me ? h('a', { class: 'btn accent', href: '#crash', style: 'text-decoration:none;display:inline-block' }, 'Play Crash')
        : h('button', { class: 'btn accent', onclick: authModal }, 'Start playing')),
    window.SlotUI && SlotUI.lobby(live),
    h('h2', { class: 'lobby-h' }, 'Originals'),
    h('div', { class: 'cards' }, ...cards.map(([id, name, desc, grad]) =>
      h('a', { class: 'card', href: '#' + id, style: `background:linear-gradient(140deg,${grad})` }, h('b', {}, name), h('span', {}, desc), h('span', { html: ICON[id] })))));
};

views.dice = (root, live) => {
  let target = 50, over = true, busy = false;
  const bet = betField();
  const chips = chipRow();
  const fill = h('i');
  const marker = h('div', { class: 'marker mono' }, '50.00');
  const slider = h('input', { type: 'range', min: 2, max: 98, step: 1, value: target, 'aria-label': 'Target' });
  const sMult = h('b'), sTarget = h('b'), sChance = h('b');
  const profit = h('em');
  const seg = h('div', { class: 'seg' },
    h('button', { class: 'on', onclick: () => setOver(true) }, 'Roll over'),
    h('button', { onclick: () => setOver(false) }, 'Roll under'));
  const chance = () => (over ? 100 - target : target);
  const mult = () => 99 / chance();
  function update() {
    fill.style.left = over ? target + '%' : '0';
    fill.style.width = chance() + '%';
    sMult.textContent = mult().toFixed(4) + '×';
    sTarget.textContent = (over ? '≥ ' : '< ') + target.toFixed(2);
    sChance.textContent = chance().toFixed(2) + '%';
    profit.textContent = fmt(bet.get() * (mult() - 1));
  }
  function setOver(v) {
    over = v;
    seg.children[0].classList.toggle('on', v);
    seg.children[1].classList.toggle('on', !v);
    update();
  }
  slider.addEventListener('input', () => { target = +slider.value; update(); });
  bet.el.addEventListener('input', update);
  const btn = h('button', { class: 'btn accent big', onclick: async () => {
    if (needLogin() || busy) return;
    busy = true;
    const r = await attempt(() => api('/api/dice', { bet: bet.get(), currency: state.cur, target, over }));
    busy = false;
    if (!r) return;
    setBal(r.bal);
    if (!live.on) return;
    marker.textContent = r.roll.toFixed(2);
    marker.className = 'marker mono show ' + (r.win ? 'w' : 'l');
    marker.style.left = r.roll + '%';
    chips.add(r.roll.toFixed(2), r.win);
    refreshBets();
  } }, 'Roll dice');
  root.append(frame('Dice',
    [bet.el, h('div', { class: 'field' }, h('span', {}, 'Direction'), seg),
      h('div', { class: 'field' }, h('span', {}, 'Profit on win', profit)), btn],
    [chips.el,
      h('div', { class: 'track-wrap' }, marker, h('div', { class: 'track' }, fill), slider,
        h('div', { class: 'scale' }, ...[0, 25, 50, 75, 100].map((n) => h('span', {}, String(n))))),
      h('div', { class: 'stats' },
        h('div', { class: 'stat' }, h('small', {}, 'Multiplier'), sMult),
        h('div', { class: 'stat' }, h('small', {}, 'Win if roll'), sTarget),
        h('div', { class: 'stat' }, h('small', {}, 'Win chance'), sChance))]));
  update();
};

views.limbo = (root, live) => {
  let busy = false;
  const bet = betField();
  const chips = chipRow();
  const big = h('div', { class: 'big-num' }, '1.00×');
  const sub = h('div', { class: 'sub' });
  const sChance = h('b'), sProfit = h('b');
  const target = numField('Target multiplier', { value: '2.00', min: 1.01, max: 10000 }, update);
  function update() {
    const t = target.get();
    sChance.textContent = t >= 1.01 ? (99 / t).toFixed(4) + '%' : '—';
    sProfit.textContent = t >= 1.01 ? fmt(bet.get() * (t - 1)) : '—';
  }
  bet.el.addEventListener('input', update);
  const btn = h('button', { class: 'btn accent big', onclick: async () => {
    if (needLogin() || busy) return;
    busy = true;
    const r = await attempt(() => api('/api/limbo', { bet: bet.get(), currency: state.cur, target: target.get() }));
    if (!r) return (busy = false);
    big.className = 'big-num';
    sub.textContent = '';
    const t0 = performance.now(), dur = 450;
    (function tick(now) {
      if (!live.on) return setBal(r.bal);
      const u = Math.min(1, (now - t0) / dur);
      big.textContent = fmtMult(Math.exp(Math.log(r.result) * (1 - (1 - u) ** 3)));
      if (u < 1) return requestAnimationFrame(tick);
      big.textContent = fmtMult(r.result);
      big.classList.add(r.win ? 'w' : 'l');
      sub.className = 'sub ' + (r.win ? 'w' : 'l');
      sub.textContent = r.win ? `Won ${fmt(r.bet.payout)} ${state.cur}` : `Missed ${fmtMult(r.bet.mult || target.get())}`;
      chips.add(fmtMult(r.result), r.win);
      setBal(r.bal);
      refreshBets();
      busy = false;
    })(t0);
  } }, 'Bet');
  root.append(frame('Limbo', [bet.el, target.el, btn],
    [chips.el, big, sub,
      h('div', { class: 'stats', style: 'grid-template-columns:repeat(2,1fr);max-width:420px' },
        h('div', { class: 'stat' }, h('small', {}, 'Win chance'), sChance),
        h('div', { class: 'stat' }, h('small', {}, 'Profit on win'), sProfit))]));
  update();
};

views.crash = (root, live) => {
  const K = state.cfg.crashK;
  let phase = 'idle', t0 = 0, endMult = 1, round = null;
  const bet = betField();
  const chips = chipRow();
  const auto = numField('Auto cashout (optional)', { placeholder: 'e.g. 2.00', min: 1.01 });
  const canvas = h('canvas');
  const big = h('div', { class: 'big-num' }, '1.00×');
  const sub = h('div', { class: 'sub' }, 'Place a bet to launch');
  const btn = h('button', { class: 'btn accent big', onclick: act }, 'Bet');
  const current = () => (phase === 'run' ? Math.exp(K * (performance.now() - t0)) : endMult);

  function draw() {
    if (!live.on) return;
    const { ctx, w, h: H } = fitCanvas(canvas);
    const m = current();
    const tNow = Math.log(m) / K;
    const tMax = Math.max(8000, tNow * 1.15), mMax = Math.max(2, m * 1.25);
    const pad = 28;
    const X = (t) => pad + (t / tMax) * (w - pad * 2);
    const Y = (v) => H - pad - ((v - 1) / (mMax - 1)) * (H - pad * 2);
    ctx.clearRect(0, 0, w, H);
    ctx.strokeStyle = '#2f2a3a';
    ctx.fillStyle = '#6f6880';
    ctx.font = '11px ui-monospace, monospace';
    ctx.lineWidth = 1;
    const step = mMax > 60 ? 20 : mMax > 12 ? 5 : mMax > 5 ? 2 : mMax > 2.6 ? 1 : 0.5;
    for (let v = 1; v <= mMax; v += step) {
      ctx.beginPath(); ctx.moveTo(pad, Y(v)); ctx.lineTo(w - pad, Y(v)); ctx.stroke();
      ctx.fillText(v.toFixed(step < 1 ? 1 : 0) + '×', 2, Y(v) + 4);
    }
    if (phase !== 'idle') {
      const color = phase === 'bust' ? '#ff4d6a' : phase === 'won' ? '#3ddc97' : '#ff6b3d';
      ctx.beginPath();
      ctx.moveTo(X(0), Y(1));
      for (let i = 1; i <= 60; i++) { const t = (tNow * i) / 60; ctx.lineTo(X(t), Y(Math.exp(K * t))); }
      ctx.strokeStyle = color; ctx.lineWidth = 4; ctx.lineJoin = 'round'; ctx.stroke();
      ctx.lineTo(X(tNow), Y(1)); ctx.closePath();
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, color + '55'); g.addColorStop(1, color + '00');
      ctx.fillStyle = g; ctx.fill();
      ctx.beginPath(); ctx.arc(X(tNow), Y(m), 7, 0, 7); ctx.fillStyle = color; ctx.fill();
    }
    if (phase === 'run') {
      big.textContent = fmtMult(Math.floor(m * 100) / 100);
      btn.textContent = `Cash out ${fmt(round.bet * Math.floor(m * 100) / 100)}`;
      requestAnimationFrame(draw);
    }
  }
  function begin(r, elapsed) {
    round = r; phase = 'run'; t0 = performance.now() - elapsed;
    big.className = 'big-num'; sub.className = 'sub';
    sub.textContent = r.auto ? `Auto cashout at ${fmtMult(r.auto)}` : 'Cash out before it crashes';
    btn.className = 'btn win big'; bet.lock(true);
    draw();
    waitResult();
  }
  async function waitResult() {
    for (;;) {
      try { return finish(await api('/api/crash/wait')); } catch (e) {
        if (e.message === 'No round') return finish(null);
        await new Promise((r) => setTimeout(r, 800));
      }
    }
  }
  function finish(r) {
    if (r) setBal(r.bal);
    refreshBets();
    if (!live.on) return;
    phase = r && !r.crashed ? 'won' : 'bust';
    endMult = r ? (r.crashed ? r.crashPoint : r.mult) : current();
    big.textContent = fmtMult(endMult);
    big.className = 'big-num ' + (phase === 'won' ? 'w' : 'l');
    sub.className = 'sub ' + (phase === 'won' ? 'w' : 'l');
    sub.textContent = !r ? 'Round ended' : r.crashed ? `Crashed at ${fmtMult(r.crashPoint)}` : `Cashed out ${fmt(r.payout)} ${r.bet.cur} — it crashed at ${fmtMult(r.crashPoint)}`;
    if (r) chips.add(fmtMult(r.crashPoint), r.crashPoint >= 2);
    btn.className = 'btn accent big'; btn.textContent = 'Bet'; btn.disabled = false; bet.lock(false);
    draw();
  }
  async function act() {
    if (needLogin()) return;
    btn.disabled = true;
    if (phase === 'run') {
      await attempt(() => api('/api/crash/cashout', {}));
      if (phase === 'run') btn.disabled = false;
      return;
    }
    const amount = bet.get();
    const r = await attempt(() => api('/api/crash/start', { bet: amount, currency: state.cur, auto: auto.inp.value }));
    btn.disabled = false;
    if (!r) return;
    setBal(r.bal);
    begin({ bet: amount, auto: r.auto }, 0);
  }
  root.append(frame('Crash', [bet.el, auto.el, btn],
    [chips.el, h('div', { class: 'canvas-box' }, canvas, h('div', { class: 'crash-read' }, big, sub))]));
  const onResize = () => (live.on ? phase !== 'run' && draw() : window.removeEventListener('resize', onResize));
  window.addEventListener('resize', onResize);
  draw();
  if (state.me && state.me.crash) {
    const c = state.me.crash;
    state.me.crash = null;
    begin({ bet: c.bet, auto: c.auto }, c.elapsed);
  }
};

views.mines = (root, live) => {
  let game = state.me && state.me.mines, busy = false;
  const bet = betField();
  const count = h('select', {}, ...Array.from({ length: 24 }, (_, i) => h('option', { value: i + 1, selected: i === 2 }, String(i + 1))));
  const sub = h('div', { class: 'sub' }, 'Choose your mines and start');
  const sMult = h('b', {}, '—'), sNext = h('b', {}, '—'), sGems = h('b', {}, '—');
  const tiles = Array.from({ length: 25 }, (_, i) => h('button', { class: 'tile', disabled: true, 'aria-label': `Tile ${i + 1}`, onclick: () => reveal(i) }));
  const btn = h('button', { class: 'btn accent big', onclick: act }, 'Start game');
  const random = h('button', { class: 'btn ghost big', style: 'margin-top:8px', hidden: true, onclick: () => {
    const free = tiles.map((_, i) => i).filter((i) => !game.revealed.includes(i));
    reveal(free[Math.floor(Math.random() * free.length)]);
  } }, 'Pick random tile');
  const show = (i, kind, extra = '') => { tiles[i].className = `tile ${kind} ${extra}`; tiles[i].innerHTML = ICON[kind === 'gem' ? 'gem' : 'bomb']; tiles[i].disabled = true; };

  function paint() {
    const on = !!game;
    bet.lock(on); count.disabled = on; random.hidden = !on;
    btn.className = 'btn big ' + (on ? 'win' : 'accent');
    if (on) {
      tiles.forEach((t, i) => (game.revealed.includes(i) ? show(i, 'gem') : ((t.className = 'tile'), (t.innerHTML = ''), (t.disabled = false))));
      count.value = game.count;
      const k = game.revealed.length;
      btn.textContent = k ? `Cash out ${fmt(game.bet * game.mult, game.cur)} ${game.cur}` : 'Reveal a tile';
      btn.disabled = !k;
      sMult.textContent = fmtMult(game.mult); sNext.textContent = fmtMult(game.next); sGems.textContent = `${k} / ${25 - game.count}`;
      sub.className = 'sub'; sub.textContent = k ? '' : 'Pick a tile';
    } else {
      btn.textContent = 'Start game'; btn.disabled = false;
    }
  }
  function end(r) {
    game = null;
    setBal(r.bal);
    refreshBets();
    if (!live.on) return;
    tiles.forEach((_, i) => {
      const mine = r.minePos.includes(i);
      show(i, mine ? 'mine' : 'gem', (i === r.hit ? 'hit' : !mine && r.revealed.includes(i) ? '' : 'dim'));
    });
    sub.className = 'sub ' + (r.won ? 'w' : 'l');
    sub.textContent = r.won ? `Cashed out ${fmt(r.payout, r.bet.cur)} ${r.bet.cur} at ${fmtMult(r.mult)}` : 'Boom — you hit a mine';
    paint();
  }
  async function reveal(i) {
    if (!game || busy) return;
    busy = true;
    const r = await attempt(() => api('/api/mines/reveal', { tile: i }));
    busy = false;
    if (!r) return;
    if (r.over) return end(r);
    game = r.mines;
    if (live.on) paint();
  }
  async function act() {
    if (needLogin() || busy) return;
    busy = true;
    const r = await attempt(() => (game ? api('/api/mines/cashout', {}) : api('/api/mines/start', { bet: bet.get(), currency: state.cur, mines: +count.value })));
    busy = false;
    if (!r) return;
    if (r.over) return end(r);
    setBal(r.bal);
    game = r.mines;
    if (live.on) paint();
  }
  root.append(frame('Mines',
    [bet.el, h('label', { class: 'field' }, h('span', {}, 'Mines'), count), btn, random],
    [h('div', { class: 'grid' }, tiles), sub,
      h('div', { class: 'stats', style: 'margin-top:14px;max-width:470px' },
        h('div', { class: 'stat' }, h('small', {}, 'Current'), sMult),
        h('div', { class: 'stat' }, h('small', {}, 'Next tile'), sNext),
        h('div', { class: 'stat' }, h('small', {}, 'Gems found'), sGems))]));
  paint();
};

views.plinko = (root, live) => {
  let rows = 12, risk = 'medium', balls = [], running = false;
  const bet = betField();
  const canvas = h('canvas');
  const buckets = h('div', { class: 'buckets' });
  const rowsSel = h('select', {}, ...Array.from({ length: 9 }, (_, i) => h('option', { value: i + 8, selected: i + 8 === rows }, String(i + 8))));
  const seg = h('div', { class: 'seg' }, ...['low', 'medium', 'high'].map((r) => h('button', { class: r === risk ? 'on' : '', onclick: (e) => {
    if (balls.length) return;
    risk = r;
    [...seg.children].forEach((b) => b.classList.toggle('on', b === e.target));
    layout();
  } }, r[0].toUpperCase() + r.slice(1))));
  rowsSel.addEventListener('change', () => { if (balls.length) return (rowsSel.value = rows); rows = +rowsSel.value; layout(); });
  const SEG = 125;
  const geo = () => {
    const { ctx, w, h: H } = fitCanvas(canvas);
    const s = Math.min(w / (rows + 3), (H - 30) / rows * 1.15);
    return { ctx, w, H, s, top: 26, sy: (H - 34) / rows };
  };
  function layout() {
    const table = state.cfg.plinko[risk][rows];
    buckets.replaceChildren(...table.map((m, k) => {
      const d = Math.abs(k - rows / 2) / (rows / 2);
      return h('div', { class: 'bucket', style: `background:hsl(${46 - 38 * d} 92% ${62 - 8 * d}%)`, title: m + '×' }, m >= 100 ? String(Math.round(m)) : String(m));
    }));
    paint();
  }
  function paint(now = performance.now()) {
    if (!live.on) return (running = false);
    const { ctx, w, H, s, top, sy } = geo();
    ctx.clearRect(0, 0, w, H);
    buckets.style.width = s * (rows + 1) + 'px';
    const pr = Math.max(2, s * 0.09), br = Math.max(4, s * 0.2);
    ctx.fillStyle = '#5d5570';
    for (let i = 0; i < rows; i++) for (let j = 0; j < i + 3; j++) {
      ctx.beginPath(); ctx.arc(w / 2 + (j - (i + 2) / 2) * s, top + i * sy, pr, 0, 7); ctx.fill();
    }
    balls = balls.filter((b) => {
      const t = (now - b.t0) / SEG; // segment 0 = drop-in, then one per row
      if (t >= rows + 1) { land(b); return false; }
      const i = Math.floor(t), u = t - i;
      const px = (n) => w / 2 + (b.rights[n] - n / 2) * s;
      let x, y;
      if (i === 0) { x = w / 2; y = top - sy + sy * u * u; }
      else { x = px(i - 1) + (px(i) - px(i - 1)) * u; y = top + (i - 1) * sy + sy * u - sy * 0.38 * 4 * u * (1 - u) * (1 - u); }
      ctx.beginPath(); ctx.arc(x, y - pr - br, br, 0, 7); ctx.fillStyle = '#ff6b3d'; ctx.fill();
      return true;
    });
    if (balls.length) requestAnimationFrame(paint); else running = false;
  }
  function land(b) {
    adjustBal(b.payout);
    refreshBets();
    const el = buckets.children[b.bucket];
    if (!el) return;
    el.classList.add('hit');
    setTimeout(() => el.classList.remove('hit'), 160);
  }
  const btn = h('button', { class: 'btn accent big', onclick: async () => {
    if (needLogin()) return;
    const amount = bet.get(), cfgRows = rows;
    if (balls.length >= 25) return;
    if (amount > 0 && amount <= state.me.bal[state.cur]) adjustBal(-amount);
    else return toast(amount > 0 ? 'Insufficient balance' : 'Enter a bet amount');
    const r = await attempt(() => api('/api/plinko', { bet: amount, currency: state.cur, rows: cfgRows, risk }));
    if (!r) return;
    if (!live.on || cfgRows !== rows) return setBal(r.bal);
    const rights = [0];
    r.path.forEach((bit, i) => rights.push(rights[i] + bit));
    balls.push({ t0: performance.now(), rights, bucket: r.bucket, payout: r.bet.payout });
    if (!running) { running = true; requestAnimationFrame(paint); }
  } }, 'Drop ball');
  root.append(frame('Plinko',
    [bet.el, h('div', { class: 'field' }, h('span', {}, 'Risk'), seg), h('label', { class: 'field' }, h('span', {}, 'Rows'), rowsSel), btn],
    [h('div', { class: 'canvas-box' }, canvas), buckets], 'plinko-stage'));
  const onResize = () => (live.on ? layout() : window.removeEventListener('resize', onResize));
  window.addEventListener('resize', onResize);
  layout();
};

// ---------- router, nav, feed ----------
const NAV = [['', 'Lobby', 'home'], ['dice', 'Dice', 'dice'], ['limbo', 'Limbo', 'limbo'], ['crash', 'Crash', 'crash'], ['mines', 'Mines', 'mines'], ['plinko', 'Plinko', 'plinko']];
let live = { on: false };
function route() {
  const id = location.hash.replace(/^#\/?/, '');
  const view = Object.hasOwn(views, id) ? id : '';
  live.on = false;
  live = { on: true };
  const root = $('#view');
  root.replaceChildren();
  $('#nav').replaceChildren(...NAV.map(([p, label, icon]) => (p === null ? h('div', { class: 'nav-h' }, label)
    : h('a', { href: '#' + (p || 'lobby'), class: p === view ? 'on' : '', html: ICON[icon] + `<span>${label}</span>` }))));
  views[view](root, live);
}
async function refreshBets() {
  if (state.feed === 'mine' && !state.me) {
    return $('#bets-body').replaceChildren(h('tr', {}, h('td', { colspan: 5, class: 'empty' }, 'Log in to see your bets.')));
  }
  try {
    const { bets } = await api(state.feed === 'mine' ? '/api/bets/mine' : '/api/bets');
    $('#bets-body').replaceChildren(...(bets.length ? bets.map((b) => h('tr', {},
      h('td', { class: 'g' }, b.game),
      h('td', { class: 'muted' }, b.user),
      h('td', { class: 'r num' }, `${fmt(b.bet, b.cur)} ${b.cur}`),
      h('td', { class: 'r num' + (b.mult >= 1 ? '' : ' muted') }, fmtMult(b.mult)),
      h('td', { class: 'r num ' + (b.payout > b.bet ? 'w' : 'muted') }, `${b.payout > b.bet ? '+' : ''}${fmt(b.payout > b.bet ? b.payout - b.bet : b.payout - b.bet, b.cur)} ${b.cur}`)))
      : [h('tr', {}, h('td', { colspan: 5, class: 'empty' }, 'No bets yet — be the first.'))]));
  } catch {}
}

async function init() {
  // Inside Telegram the Mini App signs the player in with their Telegram account.
  const tg = window.Telegram && window.Telegram.WebApp;
  if (tg && tg.initData && !window.LocalBackend) {
    try { tg.ready(); tg.expand(); setToken((await api('/api/telegram', { initData: tg.initData })).token); document.body.classList.add('solo'); } catch {}
  }
  const [cfg, me] = await Promise.all([api('/api/config'), api('/api/me')]);
  state.cfg = cfg;
  if (!Object.hasOwn(cfg.currencies, state.cur)) state.cur = Object.keys(cfg.currencies)[0];
  state.bet = (1 / cur().rate).toFixed(cur().dp);
  const sel = $('#cur');
  sel.replaceChildren(...Object.keys(cfg.currencies).map((c) => h('option', { value: c, selected: c === state.cur }, c)));
  sel.addEventListener('change', () => {
    state.cur = sel.value;
    store.set('cur', state.cur);
    state.bet = (1 / cur().rate).toFixed(cur().dp);
    renderBal();
    route();
    if (state.me) api('/api/me').then((r) => setBal(r.user.bal)).catch(() => {});
  });
  $('#login-btn').addEventListener('click', authModal);
  $('#wallet-btn').addEventListener('click', walletModal);
  $('#fair-btn').addEventListener('click', fairModal);
  $('#logout-btn').addEventListener('click', async () => {
    await api('/api/logout', {}).catch(() => {});
    setToken(null);
    setUser(null);
    route();
    refreshBets();
  });
  document.querySelectorAll('[data-feed]').forEach((t) => t.addEventListener('click', () => {
    state.feed = t.dataset.feed;
    document.querySelectorAll('[data-feed]').forEach((x) => x.classList.toggle('on', x === t));
    refreshBets();
  }));
  if (window.LocalBackend) {
    document.body.classList.add('solo');
    $('.demo-bar').textContent = 'Solo demo — play credits with no cash value, saved in this browser only.';
  }
  setUser(me.user);
  window.addEventListener('hashchange', route);
  route();
  refreshBets();
  setInterval(() => document.hidden || refreshBets(), 4000);
}
// Start only once every script on the page has run: the slot scripts load after this file
// and register their views, and in solo mode the API answers before they would have loaded.
const start = () => init().catch((e) => toast('Failed to load: ' + e.message));
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
else start();
