'use strict';
// Emberline slot art, set four: champion-style slots. Runeblade Ascendant (armoured
// spellblade) and Veil Oracle (hooded arcane mage). Adds an ornate gold frame and
// full-screen "ultimate" effects.
(() => {
  const A = SlotArt, { lin, rad, rr, ell, star, poly, blob, limb, shine, mix, mix2, ICON, GLYPH, CHAR, SCENE, LIVE, THEMES } = A;
  const TAU = Math.PI * 2;
  A.FRAME = A.FRAME || {};
  A.ULT = A.ULT || {};
  const bez = (p0, p1, p2, p3, u) => { const v = 1 - u; return [v * v * v * p0[0] + 3 * v * v * u * p1[0] + 3 * v * u * u * p2[0] + u * u * u * p3[0], v * v * v * p0[1] + 3 * v * v * u * p1[1] + 3 * v * u * u * p2[1] + u * u * u * p3[1]]; };
  const sample = (p0, p1, p2, p3, n) => Array.from({ length: n }, (_, i) => bez(p0, p1, p2, p3, i / (n - 1)));
  function tube(c, pts, r0, r1, fill, outline) {
    const n = pts.length;
    if (outline) { c.fillStyle = outline; pts.forEach((p, i) => { const r = mix(r0, r1, i / (n - 1)) + 0.02; ell(c, p[0], p[1], r, r); c.fill(); }); }
    c.fillStyle = fill; pts.forEach((p, i) => { const r = mix(r0, r1, i / (n - 1)); ell(c, p[0], p[1], r, r); c.fill(); });
  }
  const GOLD = (c, y0, y1) => lin(c, 0, y0, 0, y1, '#fff6c8', '#f2c14e', '#a8701a', '#f2c14e');

  // ---------- glyphs ----------
  GLYPH.blade = (c) => {
    c.fillStyle = lin(c, 0, -0.95, 0, 0.5, '#ffffff', '#9fe8ff', '#3a8dff'); poly(c, [[0, -0.95], [0.16, -0.6], [0.12, 0.4], [-0.12, 0.4], [-0.16, -0.6]]); c.fill();
    c.fillStyle = '#f2c14e'; poly(c, [[-0.5, 0.36], [0.5, 0.36], [0.36, 0.52], [-0.36, 0.52]]); c.fill(); rr(c, -0.07, 0.5, 0.14, 0.36, 0.04); c.fill(); ell(c, 0, 0.9, 0.1, 0.1); c.fill();
  };
  GLYPH.veil = (c) => {
    c.strokeStyle = lin(c, 0, -0.9, 0, 0.9, '#ffffff', '#ff9af0', '#b23dff'); c.lineWidth = 0.13; c.lineCap = 'round';
    c.beginPath(); c.moveTo(-0.85, 0); c.quadraticCurveTo(0, -0.8, 0.85, 0); c.quadraticCurveTo(0, 0.8, -0.85, 0); c.stroke();
    c.fillStyle = '#ffffff'; poly(c, [[0, -0.34], [0.16, 0], [0, 0.34], [-0.16, 0]]); c.fill();
    c.lineWidth = 0.09; c.beginPath(); c.moveTo(0, -0.95); c.lineTo(0, -0.62); c.moveTo(0, 0.62); c.lineTo(0, 0.95); c.stroke();
  };

  // ---------- premium symbols ----------
  ICON.crest = (c) => {
    const sh = (s) => { c.beginPath(); c.moveTo(-0.72 * s, -0.8 * s); c.lineTo(0.72 * s, -0.8 * s); c.lineTo(0.72 * s, 0.05 * s); c.quadraticCurveTo(0.66 * s, 0.62 * s, 0, 0.92 * s); c.quadraticCurveTo(-0.66 * s, 0.62 * s, -0.72 * s, 0.05 * s); c.closePath(); };
    c.fillStyle = GOLD(c, -0.9, 0.9); sh(1); c.fill();
    c.fillStyle = lin(c, -0.6, -0.8, 0.6, 0.8, '#5a8dff', '#1f3a9a', '#0a1446'); sh(0.84); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.14)'; poly(c, [[-0.6, -0.66], [0, -0.66], [0, 0.76], [-0.34, 0.5], [-0.6, 0.04]]); c.fill();
    c.fillStyle = GOLD(c, -0.5, 0.5); star(c, 0, -0.02, 4, 0.5, 0.15); c.fill();
    c.fillStyle = '#9fe8ff'; c.shadowColor = '#5ab8ff'; c.shadowBlur = 8; ell(c, 0, -0.02, 0.1, 0.1); c.fill(); c.shadowBlur = 0;
    c.strokeStyle = '#3a2408'; c.lineWidth = 0.04; sh(1); c.stroke(); shine(c, -0.4, -0.5, 0.14);
  };
  ICON.manavial = (c) => {
    c.fillStyle = rad(c, 0, 0.2, 0.05, 0.9, 'rgba(90,184,255,0.4)', 'rgba(90,184,255,0)'); c.fillRect(-1, -1, 2, 2);
    c.fillStyle = GOLD(c, -1, -0.5); rr(c, -0.2, -0.96, 0.4, 0.2, 0.05); c.fill(); rr(c, -0.28, -0.62, 0.56, 0.12, 0.04); c.fill();
    c.save(); c.beginPath(); c.moveTo(-0.16, -0.78); c.lineTo(0.16, -0.78); c.lineTo(0.16, -0.4); c.bezierCurveTo(0.7, -0.2, 0.8, 0.6, 0.3, 0.86); c.lineTo(-0.3, 0.86); c.bezierCurveTo(-0.8, 0.6, -0.7, -0.2, -0.16, -0.4); c.closePath();
    c.fillStyle = 'rgba(200,235,255,0.3)'; c.fill(); c.clip();
    c.fillStyle = lin(c, 0, -0.1, 0, 0.9, '#bff0ff', '#3a9dff', '#0f2f9a'); c.fillRect(-1, -0.12, 2, 1.1);
    c.fillStyle = 'rgba(255,255,255,0.75)'; for (const [x, y, r] of [[-0.2, 0.3, 0.06], [0.2, 0.1, 0.045], [0.1, 0.55, 0.07], [-0.3, 0.62, 0.04]]) { ell(c, x, y, r, r); c.fill(); }
    c.restore();
    c.strokeStyle = '#eafcff'; c.lineWidth = 0.045; c.lineJoin = 'round'; c.beginPath(); c.moveTo(-0.16, -0.78); c.lineTo(-0.16, -0.4); c.bezierCurveTo(-0.7, -0.2, -0.8, 0.6, -0.3, 0.86); c.lineTo(0.3, 0.86); c.bezierCurveTo(0.8, 0.6, 0.7, -0.2, 0.16, -0.4); c.lineTo(0.16, -0.78); c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.6)'; ell(c, -0.36, 0.14, 0.07, 0.24, 0.4); c.fill(); shine(c, 0.34, -0.06, 0.14);
  };
  ICON.warhorn = (c) => {
    c.fillStyle = lin(c, -0.8, 0.6, 0.8, -0.6, '#3a2a55', '#8a6ad6', '#e6d6ff');
    c.beginPath(); c.moveTo(-0.9, -0.5); c.bezierCurveTo(-0.5, 0.7, 0.4, 0.9, 0.9, 0.3); c.lineTo(0.72, -0.14); c.bezierCurveTo(0.3, 0.3, -0.3, 0.16, -0.7, -0.62); c.closePath(); c.fill();
    c.strokeStyle = '#1a1030'; c.lineWidth = 0.045; c.lineJoin = 'round'; c.stroke();
    c.fillStyle = GOLD(c, -0.4, 0.6);
    for (const [x, y, r] of [[0.8, 0.08, 0.3], [0.18, 0.36, 0.2], [-0.42, -0.04, 0.16]]) { c.save(); c.translate(x, y); c.rotate(x * 0.9 - 0.5); rr(c, -0.07, -r, 0.14, r * 2, 0.04); c.fill(); c.restore(); }
    c.fillStyle = '#9fe8ff'; ell(c, -0.84, -0.56, 0.09, 0.09); c.fill(); shine(c, 0.5, 0.0, 0.14);
  };
  ICON.runesword = (c) => {
    c.rotate(0.7);
    c.fillStyle = rad(c, 0, -0.3, 0.05, 1, 'rgba(90,184,255,0.5)', 'rgba(90,184,255,0)'); c.fillRect(-1, -1.2, 2, 2.2);
    c.fillStyle = lin(c, -0.14, 0, 0.14, 0, '#eafcff', '#7ab8ff', '#2a4aa8'); poly(c, [[0, -1.05], [0.15, -0.72], [0.12, 0.3], [-0.12, 0.3], [-0.15, -0.72]]); c.fill();
    c.strokeStyle = '#0a1446'; c.lineWidth = 0.035; c.stroke();
    c.strokeStyle = '#eaffff'; c.lineWidth = 0.045; c.shadowColor = '#7af7ff'; c.shadowBlur = 8; c.beginPath(); c.moveTo(0, -0.8); c.lineTo(0, 0.22); c.stroke();
    c.lineWidth = 0.03; for (const y of [-0.55, -0.3, -0.05]) { c.beginPath(); c.moveTo(-0.07, y); c.lineTo(0.07, y + 0.08); c.stroke(); }
    c.shadowBlur = 0;
    c.fillStyle = GOLD(c, 0.2, 1); c.beginPath(); c.moveTo(-0.5, 0.2); c.quadraticCurveTo(0, 0.36, 0.5, 0.2); c.lineTo(0.42, 0.42); c.quadraticCurveTo(0, 0.5, -0.42, 0.42); c.closePath(); c.fill();
    rr(c, -0.07, 0.44, 0.14, 0.4, 0.04); c.fill(); c.fillStyle = '#5ab8ff'; poly(c, [[0, 0.82], [0.1, 0.93], [0, 1.04], [-0.1, 0.93]]); c.fill();
  };
  ICON.omask = (c) => {
    c.fillStyle = rad(c, 0, 0, 0.05, 0.95, 'rgba(255,120,230,0.4)', 'rgba(255,120,230,0)'); c.fillRect(-1, -1, 2, 2);
    c.fillStyle = GOLD(c, -0.9, 0.9); c.beginPath(); c.moveTo(0, -0.9); c.bezierCurveTo(0.7, -0.86, 0.72, 0.0, 0.42, 0.56); c.quadraticCurveTo(0.2, 0.9, 0, 0.94); c.quadraticCurveTo(-0.2, 0.9, -0.42, 0.56); c.bezierCurveTo(-0.72, 0.0, -0.7, -0.86, 0, -0.9); c.fill();
    c.strokeStyle = '#3a2408'; c.lineWidth = 0.04; c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.3)'; c.beginPath(); c.moveTo(0, -0.84); c.bezierCurveTo(-0.6, -0.8, -0.64, 0, -0.38, 0.5); c.lineTo(-0.12, 0.3); c.lineTo(-0.1, -0.6); c.closePath(); c.fill();
    c.fillStyle = '#1a0a2e'; for (const s of [-1, 1]) { c.beginPath(); c.moveTo(s * 0.1, -0.12); c.quadraticCurveTo(s * 0.3, -0.3, s * 0.5, -0.2); c.quadraticCurveTo(s * 0.32, -0.04, s * 0.1, -0.12); c.fill(); }
    c.fillStyle = '#ff7ae6'; c.shadowColor = '#ff4fd8'; c.shadowBlur = 8; for (const s of [-1, 1]) { ell(c, s * 0.3, -0.16, 0.07, 0.035, s * -0.2); c.fill(); }
    poly(c, [[0, -0.66], [0.07, -0.52], [0, -0.38], [-0.07, -0.52]]); c.fill(); c.shadowBlur = 0;
    c.strokeStyle = '#7a4a10'; c.lineWidth = 0.025; c.beginPath(); c.moveTo(0, 0.06); c.lineTo(0, 0.8); c.moveTo(-0.26, 0.3); c.quadraticCurveTo(0, 0.42, 0.26, 0.3); c.stroke();
  };
  ICON.voidgem = (c) => {
    const p = [[0, -0.92], [0.6, -0.4], [0.6, 0.4], [0, 0.92], [-0.6, 0.4], [-0.6, -0.4]];
    c.fillStyle = lin(c, -0.6, -0.9, 0.6, 0.9, '#ffb8f5', '#b23dff', '#2a0a6e'); poly(c, p); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.3)'; poly(c, [[0, -0.92], [0.6, -0.4], [0, -0.1], [-0.6, -0.4]]); c.fill();
    c.fillStyle = 'rgba(10,0,40,0.3)'; poly(c, [[0, -0.1], [0.6, -0.4], [0.6, 0.4], [0, 0.92]]); c.fill();
    c.strokeStyle = '#ffd6fa'; c.lineWidth = 0.035; c.lineJoin = 'round'; poly(c, p); c.stroke(); c.beginPath(); c.moveTo(-0.6, -0.4); c.lineTo(0, -0.1); c.lineTo(0.6, -0.4); c.moveTo(0, -0.1); c.lineTo(0, 0.92); c.stroke();
    c.fillStyle = rad(c, 0, 0.1, 0, 0.3, '#ffffff', 'rgba(255,255,255,0)'); ell(c, 0, 0.1, 0.3, 0.3); c.fill(); shine(c, -0.26, -0.5, 0.18);
  };
  ICON.astrolabe = (c) => {
    c.strokeStyle = GOLD(c, -0.9, 0.9); c.lineWidth = 0.1; ell(c, 0, 0, 0.82, 0.82); c.stroke();
    c.lineWidth = 0.06; c.beginPath(); c.ellipse(0, 0, 0.82, 0.3, 0.5, 0, TAU); c.stroke(); c.beginPath(); c.ellipse(0, 0, 0.82, 0.3, -0.7, 0, TAU); c.stroke();
    c.fillStyle = rad(c, -0.1, -0.1, 0.02, 0.36, '#ffffff', '#ff9af0', '#7a12c2'); c.shadowColor = '#ff4fd8'; c.shadowBlur = 12; ell(c, 0, 0, 0.3, 0.3); c.fill(); c.shadowBlur = 0;
    c.fillStyle = '#fff6c8'; for (let i = 0; i < 8; i++) { const an = (i * TAU) / 8; ell(c, Math.cos(an) * 0.82, Math.sin(an) * 0.82, 0.055, 0.055); c.fill(); }
    c.fillStyle = '#9fe8ff'; ell(c, 0.56, -0.34, 0.08, 0.08); c.fill(); shine(c, -0.5, -0.5, 0.14);
  };
  ICON.wingcrown = (c) => {
    for (const s of [-1, 1]) { c.fillStyle = lin(c, 0, -0.9, s * 0.9, 0.2, '#ffffff', '#ffc8f8', '#b23dff'); for (let k = 0; k < 4; k++) { c.beginPath(); c.moveTo(s * 0.2, 0.1 + k * 0.06); c.quadraticCurveTo(s * (0.6 + k * 0.08), -0.5 + k * 0.22, s * (0.96 - k * 0.06), -0.84 + k * 0.3); c.quadraticCurveTo(s * 0.6, -0.1 + k * 0.16, s * 0.2, 0.3 + k * 0.05); c.fill(); } }
    c.fillStyle = GOLD(c, -0.7, 0.7); poly(c, [[-0.44, 0.56], [-0.5, -0.14], [-0.24, 0.12], [0, -0.6], [0.24, 0.12], [0.5, -0.14], [0.44, 0.56]]); c.fill();
    c.strokeStyle = '#3a2408'; c.lineWidth = 0.04; c.lineJoin = 'round'; c.stroke();
    rr(c, -0.5, 0.5, 1.0, 0.24, 0.07); c.fill(); c.stroke();
    c.fillStyle = '#ff5ae0'; c.shadowColor = '#ff4fd8'; c.shadowBlur = 10; poly(c, [[0, -0.22], [0.12, 0.02], [0, 0.26], [-0.12, 0.02]]); c.fill(); c.shadowBlur = 0; shine(c, 0, -0.62, 0.16);
  };

  // ---------- themes ----------
  THEMES.blade = {
    tag: 'Mystery runes all flip to one symbol · walking wilds', bg: ['#030614', '#0c1f5a', '#2a6ad6'], accent: '#7af0ff', accent2: '#f2c14e', frame: ['#fff6c8', '#d99a2a'],
    lows: ['#7af0ff', '#9db8ff', '#f2c14e', '#ff9ad0', '#eafcff'], icons: ['manavial', 'warhorn', 'crest', 'runesword'], glyph: 'blade', wild: ['#eafcff', '#2f7dff', '#0a1466'], ambient: 'mote', chScale: 1.1,
    quotes: { wild: ['By the rune!', 'Cleave!', 'Stand aside.'], win: ['Clean strike.', 'Honour and gold.', 'Well fought.'], big: ['ASCENSION!', 'THE BLADE AWAKENS!'], bonus: ['Free spins. Steel yourself.'], tease: ['Parried.', 'Next strike lands.'], idle: ['The rune hungers.', 'Draw, and spin.'] },
  };
  THEMES.oracle = {
    tag: 'Every winning tumble charges the multiplier', bg: ['#07021a', '#2a0a5a', '#a81fa0'], accent: '#ff9af0', accent2: '#f2c14e', frame: ['#fff6c8', '#d99a2a'],
    lows: ['#ff9af0', '#b98aff', '#f2c14e', '#7af0ff', '#ffffff'], icons: ['voidgem', 'astrolabe', 'omask', 'wingcrown'], glyph: 'veil', wild: ['#ffe6fb', '#b23dff', '#2a0a6e'], ambient: 'star', chScale: 1.1,
    quotes: { wild: ['It is written.', 'Behold.', 'A sigil falls.'], win: ['As foreseen.', 'The veil parts.', 'Fate pays.'], big: ['THE STARS ALIGN!', 'DESTINY UNBOUND!'], bonus: ['Free spins. I saw this coming.'], tease: ['Not this thread.', 'Fate is coy.'], idle: ['I know how this ends.', 'Spin. I will pretend to be surprised.'] },
  };

  // ---------- backgrounds ----------
  SCENE.blade = (c, w, h) => {
    for (let i = 0; i < 110; i++) { const s = 0.4 + ((i * 0.33) % 1) * 1.2; c.fillStyle = `rgba(255,255,255,${0.2 + ((i * 0.17) % 1) * 0.5})`; c.fillRect(((i * 0.618) % 1) * w, ((i * 0.755) % 1) * h * 0.6, s, s); }
    c.fillStyle = rad(c, w * 0.14, h * 0.3, 0, h * 0.7, 'rgba(120,200,255,0.4)', 'rgba(60,120,255,0)'); c.fillRect(0, 0, w, h);
    const spire = (x, bw, top, col) => { c.fillStyle = col; poly(c, [[x - bw, h], [x - bw * 0.6, h * top + bw * 2], [x, h * top], [x + bw * 0.6, h * top + bw * 2], [x + bw, h]]); c.fill(); c.fillStyle = 'rgba(160,220,255,0.12)'; poly(c, [[x, h * top], [x + bw * 0.6, h * top + bw * 2], [x + bw, h], [x, h]]); c.fill(); };
    for (const [x, bw, top] of [[0.04, 0.035, 0.3], [0.22, 0.03, 0.42], [0.3, 0.02, 0.56], [0.97, 0.04, 0.26], [0.9, 0.022, 0.5]]) spire(w * x, w * bw, top, '#0c1a4a');
    for (const [x, bw, top] of [[0.12, 0.05, 0.5], [0.26, 0.03, 0.68], [0.94, 0.035, 0.62]]) spire(w * x, w * bw, top, '#070f30');
    c.fillStyle = '#04081e'; c.fillRect(0, h * 0.9, w, h * 0.1);
  };
  LIVE.blade = (c, w, h, t, k) => {
    c.save(); c.globalCompositeOperation = 'lighter';
    for (const [x, top, ph] of [[0.04, 0.3, 0], [0.22, 0.42, 2], [0.97, 0.26, 4]]) {
      const a = 0.35 + 0.25 * Math.sin(t * 1.7 + ph) + k * 0.25;
      c.fillStyle = lin(c, 0, 0, 0, h * top, 'rgba(120,220,255,0)', `rgba(120,220,255,${a})`); c.fillRect(w * x - 2, 0, 4, h * top);
      c.fillStyle = rad(c, w * x, h * top, 0, h * 0.07, `rgba(200,245,255,${a + 0.3})`, 'rgba(90,160,255,0)'); ell(c, w * x, h * top, h * 0.07, h * 0.07); c.fill();
    }
    for (let i = 0; i < 6; i++) { const x = ((t * 0.02 + i * 0.19) % 1.2 - 0.1) * w, y = h * (0.62 + (i % 3) * 0.08); c.fillStyle = `rgba(120,170,255,${0.07 + k * 0.05})`; ell(c, x, y, h * 0.3, h * 0.035); c.fill(); }
    c.restore();
  };
  SCENE.oracle = (c, w, h) => {
    for (let i = 0; i < 150; i++) { const s = 0.4 + ((i * 0.33) % 1) * 1.4; c.fillStyle = `rgba(255,${200 + (i % 50)},255,${0.25 + ((i * 0.17) % 1) * 0.6})`; c.fillRect(((i * 0.618) % 1) * w, ((i * 0.755) % 1) * h, s, s); }
    const rock = (x, y, s) => { c.fillStyle = '#12062e'; poly(c, [[x - s, y], [x - s * 0.5, y - s * 0.5], [x + s * 0.6, y - s * 0.4], [x + s, y], [x + s * 0.3, y + s * 1.4], [x - s * 0.4, y + s]]); c.fill(); c.fillStyle = 'rgba(255,120,230,0.18)'; poly(c, [[x - s, y], [x - s * 0.5, y - s * 0.5], [x + s * 0.6, y - s * 0.4], [x + s, y]]); c.fill(); };
    rock(w * 0.05, h * 0.8, h * 0.09); rock(w * 0.27, h * 0.9, h * 0.06); rock(w * 0.96, h * 0.72, h * 0.08); rock(w * 0.3, h * 0.2, h * 0.035);
  };
  LIVE.oracle = (c, w, h, t, k) => {
    const cx = w * 0.15, cy = h * 0.42;
    c.save(); c.globalCompositeOperation = 'lighter'; c.translate(cx, cy);
    for (let arm = 0; arm < 3; arm++) {
      c.beginPath();
      for (let q = 0; q <= 5.2; q += 0.12) { const r = h * (0.03 + q * 0.085), an = q * 1.1 + (arm * TAU) / 3 + t * 0.25; c[q ? 'lineTo' : 'moveTo'](Math.cos(an) * r, Math.sin(an) * r * 0.75); }
      c.strokeStyle = `rgba(${arm === 1 ? '120,200,255' : '255,120,230'},${0.16 + k * 0.1})`; c.lineWidth = h * 0.035; c.lineCap = 'round'; c.stroke();
    }
    c.fillStyle = rad(c, 0, 0, 0, h * 0.2, `rgba(255,230,255,${0.5 + k * 0.2})`, 'rgba(180,60,255,0.25)', 'rgba(120,20,200,0)'); ell(c, 0, 0, h * 0.2, h * 0.2); c.fill();
    c.restore();
  };

  // ---------- ornate gold frame ----------
  function goldFrame(accent) {
    return (c, x, y, w, h, cell, t, glow) => {
      const b = cell * 0.11, r = cell * 0.16;
      c.lineJoin = 'round';
      c.lineWidth = b; c.strokeStyle = '#5a3608'; rr(c, x - b * 0.2, y - b * 0.2, w + b * 0.4, h + b * 0.4, r); c.stroke();
      c.lineWidth = b * 0.7; c.strokeStyle = GOLD(c, y, y + h); rr(c, x - b * 0.2, y - b * 0.2, w + b * 0.4, h + b * 0.4, r); c.stroke();
      c.lineWidth = b * 0.16; c.strokeStyle = 'rgba(255,250,220,0.9)'; rr(c, x - b * 0.42, y - b * 0.42, w + b * 0.84, h + b * 0.84, r * 1.1); c.stroke();
      // a light that runs around the border
      const per = 2 * (w + h);
      c.save(); c.globalCompositeOperation = 'lighter';
      for (const off of [0, 0.5]) {
        let d = ((t * 0.16 + off) % 1) * per, px, py;
        if (d < w) { px = x + d; py = y; } else if ((d -= w) < h) { px = x + w; py = y + d; } else if ((d -= h) < w) { px = x + w - d; py = y + h; } else { px = x; py = y + h - (d - w); }
        c.fillStyle = rad(c, px, py, 0, cell * 0.5, '#ffffff', accent + 'aa', accent + '00'); ell(c, px, py, cell * 0.5, cell * 0.5); c.fill();
      }
      c.restore();
      const gem = (gx, gy, s) => {
        c.fillStyle = '#5a3608'; poly(c, [[gx, gy - s * 1.25], [gx + s * 1.25, gy], [gx, gy + s * 1.25], [gx - s * 1.25, gy]]); c.fill();
        c.fillStyle = GOLD(c, gy - s, gy + s); poly(c, [[gx, gy - s * 1.1], [gx + s * 1.1, gy], [gx, gy + s * 1.1], [gx - s * 1.1, gy]]); c.fill();
        c.save(); c.shadowColor = accent; c.shadowBlur = 10 + glow * 12; c.fillStyle = lin(c, gx - s, gy - s, gx + s, gy + s, '#ffffff', accent, '#1a0a4a'); poly(c, [[gx, gy - s * 0.66], [gx + s * 0.66, gy], [gx, gy + s * 0.66], [gx - s * 0.66, gy]]); c.fill(); c.restore();
      };
      for (const [gx, gy] of [[x, y], [x + w, y], [x, y + h], [x + w, y + h]]) gem(gx, gy, cell * 0.17);
      gem(x, y + h / 2, cell * 0.1); gem(x + w, y + h / 2, cell * 0.1); gem(x + w / 2, y + h, cell * 0.12);
      // crest
      const cx = x + w / 2, cy = y - cell * 0.05, s = cell * 0.36;
      for (const sd of [-1, 1]) { c.fillStyle = GOLD(c, cy - s, cy + s * 0.4); for (let k = 0; k < 3; k++) { c.beginPath(); c.moveTo(cx + sd * s * 0.5, cy + s * 0.2); c.quadraticCurveTo(cx + sd * s * (1.4 + k * 0.5), cy - s * (0.5 - k * 0.2), cx + sd * s * (2.4 + k * 0.5), cy - s * (0.9 - k * 0.42)); c.quadraticCurveTo(cx + sd * s * (1.5 + k * 0.4), cy + s * 0.3, cx + sd * s * 0.5, cy + s * 0.34); c.fill(); } }
      c.fillStyle = '#5a3608'; poly(c, [[cx, cy - s * 1.2], [cx + s * 0.95, cy - s * 0.2], [cx + s * 0.6, cy + s * 0.75], [cx - s * 0.6, cy + s * 0.75], [cx - s * 0.95, cy - s * 0.2]]); c.fill();
      c.fillStyle = GOLD(c, cy - s, cy + s); poly(c, [[cx, cy - s * 1.06], [cx + s * 0.82, cy - s * 0.16], [cx + s * 0.5, cy + s * 0.64], [cx - s * 0.5, cy + s * 0.64], [cx - s * 0.82, cy - s * 0.16]]); c.fill();
      c.save(); c.shadowColor = accent; c.shadowBlur = 12 + glow * 14; c.fillStyle = lin(c, 0, cy - s * 0.6, 0, cy + s * 0.4, '#ffffff', accent); poly(c, [[cx, cy - s * 0.66], [cx + s * 0.4, cy - s * 0.08], [cx, cy + s * 0.44], [cx - s * 0.4, cy - s * 0.08]]); c.fill(); c.restore();
    };
  }
  A.FRAME.blade = goldFrame('#5ac8ff');
  A.FRAME.oracle = goldFrame('#ff6ae6');

  // ---------- "ultimate" full-screen effects (k = 0..1 intensity) ----------
  A.ULT.blade = (c, L, t, k) => {
    c.save(); c.globalCompositeOperation = 'lighter'; c.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      const p = (t * 1.1 + i * 0.33) % 1, x = L.w * (-0.2 + p * 1.4), a = Math.sin(p * Math.PI) * k;
      c.strokeStyle = `rgba(160,235,255,${a * 0.6})`; c.lineWidth = L.h * 0.035; c.beginPath(); c.arc(x - L.h * 0.9, L.h * (0.5 + (i - 1) * 0.12), L.h, -0.5, 0.5); c.stroke();
      c.strokeStyle = `rgba(255,255,255,${a * 0.85})`; c.lineWidth = L.h * 0.008; c.stroke();
    }
    c.restore();
  };
  A.ULT.oracle = (c, L, t, k) => {
    const cx = L.rx + L.rw / 2, cy = L.ry + L.rh / 2;
    c.save(); c.globalCompositeOperation = 'lighter'; c.translate(cx, cy);
    for (let i = 0; i < 3; i++) {
      const p = (t * 0.5 + i / 3) % 1, r = p * L.w * 0.6;
      c.strokeStyle = `rgba(255,150,240,${(1 - p) * k * 0.6})`; c.lineWidth = L.h * 0.012; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.stroke();
      c.save(); c.rotate(t * (i % 2 ? -0.6 : 0.6)); c.strokeStyle = `rgba(255,230,160,${(1 - p) * k * 0.5})`; c.lineWidth = L.h * 0.006; star(c, 0, 0, 6, r, r * 0.58); c.stroke(); c.restore();
    }
    c.restore();
  };

  // ---------- Kaelric, the runeblade ----------
  CHAR.blade = (c, t, a) => {
    const steel = lin(c, -0.5, -1, 0.5, 1.2, '#7a9ae0', '#34509a', '#141f4e'), dark = '#070b24', breathe = Math.sin(t * 1.6), power = Math.max(a.joy, a.hype, a.cast);
    c.fillStyle = rad(c, 0, 0, 0.1, 2, `rgba(90,190,255,${0.2 + power * 0.3})`, 'rgba(60,90,255,0)'); c.fillRect(-2.4, -2.4, 4.8, 4.8);
    c.fillStyle = 'rgba(2,4,20,0.5)'; ell(c, 0, 1.34, 0.8, 0.12); c.fill();
    c.translate(0.05, breathe * 0.012 - a.hype * Math.abs(Math.sin(t * 7)) * 0.05);
    // cape
    const wv = (i) => Math.sin(t * 2.2 + i * 1.1) * (0.05 + power * 0.07);
    c.fillStyle = lin(c, 0, -0.5, 0, 1.3, '#2f55c8', '#16247a', '#080d34');
    c.beginPath(); c.moveTo(-0.34, -0.46); c.lineTo(0.3, -0.46); c.bezierCurveTo(0.1, 0.2, -0.3 + wv(0), 0.7, -0.5 + wv(1), 1.22);
    for (let i = 0; i < 4; i++) { const x0 = -0.5 - i * 0.16, x1 = x0 - 0.16; c.lineTo((x0 + x1) / 2 + wv(i + 2), 1.06 + (i % 2) * 0.08); c.lineTo(x1 + wv(i + 3), 1.2 - i * 0.07); }
    c.bezierCurveTo(-1.2 + wv(5), 0.5, -0.8, -0.1, -0.34, -0.46); c.fill(); c.strokeStyle = '#f2c14e'; c.lineWidth = 0.022; c.stroke();
    // legs
    for (const [hip, knee, foot, far] of [[[-0.13, 0.42], [-0.26, 0.82], [-0.34, 1.2], true], [[0.13, 0.42], [0.24, 0.8], [0.3, 1.2], false]]) {
      tube(c, sample(hip, hip, knee, knee, 5), 0.15, 0.12, far ? '#263c80' : steel, dark); tube(c, sample(knee, knee, foot, foot, 5), 0.115, 0.095, far ? '#263c80' : steel, dark);
      c.fillStyle = GOLD(c, knee[1] - 0.1, knee[1] + 0.1); poly(c, [[knee[0] - 0.11, knee[1] - 0.06], [knee[0], knee[1] - 0.15], [knee[0] + 0.11, knee[1] - 0.06], [knee[0], knee[1] + 0.1]]); c.fill();
      c.fillStyle = dark; poly(c, [[foot[0] - 0.13, foot[1] - 0.02], [foot[0] + 0.26, foot[1] + 0.06], [foot[0] + 0.28, foot[1] + 0.14], [foot[0] - 0.14, foot[1] + 0.14]]); c.fill();
      c.fillStyle = far ? '#263c80' : '#4a6ab8'; poly(c, [[foot[0] - 0.11, foot[1] - 0.04], [foot[0] + 0.2, foot[1] + 0.05], [foot[0] + 0.22, foot[1] + 0.11], [foot[0] - 0.12, foot[1] + 0.11]]); c.fill();
    }
    // back arm
    const handL = mix2([-0.34, 0.3], [-0.62, -0.62 + Math.sin(t * 9) * 0.04], a.joy);
    tube(c, sample([-0.4, -0.36], [-0.56, -0.05], [-0.56, -0.05], handL, 8), 0.11, 0.095, '#263c80', dark);
    c.fillStyle = GOLD(c, handL[1] - 0.1, handL[1] + 0.1); ell(c, handL[0], handL[1], 0.115, 0.115); c.fill();
    // torso
    c.fillStyle = dark; for (let k = -1; k <= 1; k++) poly(c, [[k * 0.17 - 0.12, 0.3], [k * 0.17 + 0.12, 0.3], [k * 0.2 + 0.14, 0.66], [k * 0.2, 0.74], [k * 0.2 - 0.14, 0.66]]), c.fill();
    c.fillStyle = steel; for (let k = -1; k <= 1; k++) poly(c, [[k * 0.17 - 0.1, 0.32], [k * 0.17 + 0.1, 0.32], [k * 0.2 + 0.12, 0.64], [k * 0.2, 0.71], [k * 0.2 - 0.12, 0.64]]), c.fill();
    c.fillStyle = steel; blob(c, [[-0.38, -0.44], [0, -0.52], [0.38, -0.44], [0.33, 0.0], [0.22, 0.36], [-0.22, 0.36], [-0.33, 0.0]]); c.fill(); c.strokeStyle = dark; c.lineWidth = 0.03; c.stroke();
    c.strokeStyle = GOLD(c, -0.5, 0.4); c.lineWidth = 0.035; c.lineJoin = 'round'; c.beginPath(); c.moveTo(-0.3, -0.42); c.lineTo(0, 0.04); c.lineTo(0.3, -0.42); c.moveTo(-0.24, 0.1); c.lineTo(0, 0.26); c.lineTo(0.24, 0.1); c.stroke();
    c.fillStyle = GOLD(c, 0.28, 0.42); c.fillRect(-0.24, 0.29, 0.48, 0.09);
    const pulse = 0.6 + 0.4 * Math.sin(t * 3);
    c.save(); c.shadowColor = '#7af0ff'; c.shadowBlur = 14 + power * 18; c.fillStyle = `rgba(190,250,255,${0.7 + 0.3 * pulse})`; poly(c, [[0, -0.3], [0.09, -0.16], [0, -0.02], [-0.09, -0.16]]); c.fill(); c.restore();
    // pauldrons
    for (const s of [-1, 1]) {
      c.fillStyle = dark; ell(c, s * 0.44, -0.43, 0.27, 0.2, s * 0.3); c.fill(); c.fillStyle = steel; ell(c, s * 0.44, -0.44, 0.245, 0.175, s * 0.3); c.fill();
      c.strokeStyle = GOLD(c, -0.6, -0.3); c.lineWidth = 0.035; c.beginPath(); c.ellipse(s * 0.44, -0.44, 0.245, 0.175, s * 0.3, s > 0 ? -0.4 : Math.PI - 2.2, s > 0 ? 2.2 : Math.PI + 0.4); c.stroke();
      c.fillStyle = GOLD(c, -0.8, -0.4); poly(c, [[s * 0.5, -0.58], [s * 0.78, -0.82], [s * 0.64, -0.5]]); c.fill();
    }
    // helm
    c.save(); c.translate(0, -0.74); c.rotate(Math.sin(t * 0.8) * 0.03 + a.cast * 0.08);
    const flame = sample([-0.02, -0.3], [-0.2, -0.62], [-0.56 + Math.sin(t * 3) * 0.08, -0.6], [-0.8 + Math.sin(t * 2.4) * 0.12, -0.34 + Math.cos(t * 2) * 0.06], 12);
    c.save(); c.globalCompositeOperation = 'lighter'; tube(c, flame, 0.12, 0.02, 'rgba(90,210,255,0.55)', null); tube(c, flame, 0.06, 0.01, 'rgba(230,252,255,0.8)', null); c.restore();
    for (const s of [-1, 1]) { c.fillStyle = GOLD(c, -0.5, 0.1); c.beginPath(); c.moveTo(s * 0.2, -0.12); c.quadraticCurveTo(s * 0.5, -0.3, s * 0.46, -0.62); c.quadraticCurveTo(s * 0.36, -0.36, s * 0.16, -0.26); c.fill(); }
    c.fillStyle = steel; c.beginPath(); c.moveTo(-0.24, 0.2); c.bezierCurveTo(-0.3, -0.2, -0.16, -0.36, 0, -0.36); c.bezierCurveTo(0.16, -0.36, 0.3, -0.2, 0.24, 0.2); c.lineTo(0.1, 0.3); c.lineTo(0, 0.24); c.lineTo(-0.1, 0.3); c.closePath(); c.fill(); c.strokeStyle = dark; c.lineWidth = 0.028; c.stroke();
    c.fillStyle = GOLD(c, -0.4, 0.3); c.fillRect(-0.03, -0.36, 0.06, 0.3);
    c.fillStyle = dark; poly(c, [[-0.18, -0.06], [0.18, -0.06], [0.16, 0.04], [0.04, 0.04], [0.03, 0.22], [-0.03, 0.22], [-0.04, 0.04], [-0.16, 0.04]]); c.fill();
    c.fillStyle = a.blink ? '#3a8dff' : '#dffcff'; c.shadowColor = '#7af0ff'; c.shadowBlur = 10 + power * 12;
    for (const s of [-1, 1]) { poly(c, [[s * 0.05 + a.look * 0.01, -0.03], [s * 0.15 + a.look * 0.01, -0.045 - a.hype * 0.01], [s * 0.14 + a.look * 0.01, 0.015], [s * 0.05 + a.look * 0.01, 0.01]]); c.fill(); }
    c.shadowBlur = 0; c.restore();
    // sword arm and blade
    const hand = mix2(mix2([0.56, 0.12], [0.5, -0.78], Math.max(a.joy, a.hype)), [0.78, -0.2], a.cast);
    const ang = mix(mix(0.5, 0.0 + Math.sin(t * 9) * 0.06 * a.hype, Math.max(a.joy, a.hype)), mix(-1.5, 1.9, Math.min(1, a.cast * 1.15)), a.cast > 0.02 ? 1 : 0);
    if (a.cast > 0.05) { c.save(); c.globalCompositeOperation = 'lighter'; c.translate(hand[0], hand[1]); for (let i = 0; i < 5; i++) { c.strokeStyle = `rgba(150,235,255,${(1 - i / 5) * a.cast * 0.55})`; c.lineWidth = 0.1 - i * 0.012; c.lineCap = 'round'; c.beginPath(); c.arc(0, 0, 0.75 + i * 0.12, ang - Math.PI / 2 - 0.9, ang - Math.PI / 2 + 0.1); c.stroke(); } c.restore(); }
    tube(c, sample([0.42, -0.36], [0.66, -0.12], [0.66, -0.12], hand, 8), 0.12, 0.1, steel, dark);
    c.save(); c.translate(hand[0], hand[1]); c.rotate(ang);
    c.fillStyle = '#3a2a1c'; rr(c, -0.04, -0.02, 0.08, 0.3, 0.02); c.fill(); c.fillStyle = GOLD(c, 0.2, 0.4); ell(c, 0, 0.3, 0.06, 0.06); c.fill();
    c.fillStyle = GOLD(c, -0.2, 0.05); c.beginPath(); c.moveTo(-0.3, -0.1); c.quadraticCurveTo(0, 0.02, 0.3, -0.1); c.lineTo(0.24, 0.02); c.quadraticCurveTo(0, 0.08, -0.24, 0.02); c.closePath(); c.fill();
    c.save(); c.shadowColor = '#5ac8ff'; c.shadowBlur = 12 + power * 22;
    c.fillStyle = lin(c, -0.1, 0, 0.1, 0, '#f2fcff', '#8fc8ff', '#2a4ab8'); poly(c, [[0, -1.5], [0.1, -1.28], [0.085, -0.08], [-0.085, -0.08], [-0.1, -1.28]]); c.fill(); c.restore();
    c.strokeStyle = dark; c.lineWidth = 0.02; poly(c, [[0, -1.5], [0.1, -1.28], [0.085, -0.08], [-0.085, -0.08], [-0.1, -1.28]]); c.stroke();
    c.strokeStyle = '#eaffff'; c.lineCap = 'round'; c.shadowColor = '#7af0ff'; c.shadowBlur = 8;
    for (let i = 0; i < 6; i++) { const y = -0.24 - i * 0.19, lit = 0.25 + 0.75 * Math.max(0, Math.sin(t * 4 - i * 0.9)) + power * 0.4; c.globalAlpha = Math.min(1, lit); c.lineWidth = 0.022; c.beginPath(); c.moveTo(-0.045, y); c.lineTo(0.045, y - 0.06); c.moveTo(0, y - 0.03); c.lineTo(0, y + 0.05); c.stroke(); }
    c.globalAlpha = 1; c.shadowBlur = 0; c.restore();
    c.fillStyle = GOLD(c, hand[1] - 0.1, hand[1] + 0.1); ell(c, hand[0], hand[1], 0.125, 0.125); c.fill(); c.strokeStyle = dark; c.lineWidth = 0.02; c.stroke();
    for (let i = 0; i < 5; i++) { const an = t * 0.8 + (i * TAU) / 5, x = Math.cos(an) * 1.0, y = -0.1 + Math.sin(an) * 0.3 + Math.sin(t * 2 + i) * 0.04; c.save(); c.translate(x, y); c.rotate(an * 2); c.shadowColor = '#7af0ff'; c.shadowBlur = 8; c.fillStyle = 'rgba(200,245,255,0.85)'; poly(c, [[0, -0.07], [0.03, 0], [0, 0.07], [-0.03, 0]]); c.fill(); c.restore(); }
  };

  // ---------- Vesper, the veil oracle ----------
  CHAR.oracle = (c, t, a) => {
    const power = Math.max(a.joy, a.hype, a.cast), dark = '#12052e', robe = lin(c, 0, -0.6, 0, 1.4, '#5a2ab8', '#2a0f6e', '#0e0430');
    c.fillStyle = rad(c, 0, -0.1, 0.1, 2, `rgba(255,110,230,${0.18 + power * 0.28})`, 'rgba(140,60,255,0.06)', 'rgba(0,0,0,0)'); c.fillRect(-2.4, -2.4, 4.8, 4.8);
    // sigil wheel behind
    c.save(); c.translate(0, -0.2); c.globalCompositeOperation = 'lighter'; c.strokeStyle = `rgba(255,170,240,${0.4 + power * 0.4})`; c.shadowColor = '#ff4fd8'; c.shadowBlur = 12;
    c.save(); c.rotate(t * 0.3); c.lineWidth = 0.028; ell(c, 0, 0, 1.12, 1.12); c.stroke(); ell(c, 0, 0, 0.94, 0.94); c.stroke();
    c.beginPath(); for (let i = 0; i < 24; i++) { const an = (i * TAU) / 24; c.moveTo(Math.cos(an) * 0.97, Math.sin(an) * 0.97); c.lineTo(Math.cos(an) * (i % 3 ? 1.03 : 1.09), Math.sin(an) * (i % 3 ? 1.03 : 1.09)); } c.stroke(); c.restore();
    c.save(); c.rotate(-t * 0.45); c.lineWidth = 0.02; c.strokeStyle = `rgba(255,225,150,${0.35 + power * 0.4})`; star(c, 0, 0, 3, 0.94, 0.47); c.stroke(); star(c, 0, 0, 3, 0.94, 0.47, Math.PI / 2); c.stroke(); c.restore();
    c.restore();
    c.translate(0, Math.sin(t * 1.3) * 0.07 - a.hype * Math.abs(Math.sin(t * 7)) * 0.06);
    const orb = (x, y, r) => { c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = rad(c, x, y, 0, r * 2.4, 'rgba(255,170,240,0.5)', 'rgba(255,90,230,0)'); ell(c, x, y, r * 2.4, r * 2.4); c.fill(); c.restore(); c.fillStyle = rad(c, x - r * 0.3, y - r * 0.3, r * 0.05, r, '#ffffff', '#ff8ae8', '#7a12c2'); ell(c, x, y, r, r); c.fill(); c.strokeStyle = 'rgba(255,240,200,0.8)'; c.lineWidth = r * 0.12; c.beginPath(); c.ellipse(x, y, r * 1.5, r * 0.45, t * 2, 0, TAU); c.stroke(); };
    const orbs = [0, 1, 2].map((i) => { const an = t * (1 + a.hype * 2.5) + (i * TAU) / 3, rad2 = mix(1.05, 0.25, a.hype); return [Math.cos(an) * rad2, mix(-0.1, -1.75, a.hype) + Math.sin(an) * rad2 * 0.32, Math.sin(an)]; });
    for (const o of orbs) if (o[2] < 0) orb(o[0], o[1], 0.09);
    // ribbons
    for (const s of [-1, 1]) tube(c, sample([s * 0.2, -0.8], [s * 0.7, -0.7], [s * (0.9 + Math.sin(t * 1.6 + s) * 0.12), -0.1], [s * (0.75 + Math.sin(t * 2 + s * 2) * 0.2), 0.5], 16), 0.05, 0.012, s > 0 ? '#ff7ae6' : '#f2c14e', null);
    // robe
    const wv = (i) => Math.sin(t * 2 + i * 1.4) * (0.04 + power * 0.05);
    c.fillStyle = robe; c.beginPath(); c.moveTo(-0.3, -0.42); c.lineTo(0.3, -0.42); c.bezierCurveTo(0.42, 0.2, 0.5 + wv(0), 0.8, 0.36 + wv(1), 1.2);
    for (let i = 0; i < 5; i++) { const x0 = 0.36 - i * 0.144, x1 = x0 - 0.144; c.lineTo((x0 + x1) / 2 + wv(i), 1.42 - (i % 2) * 0.14 + wv(i + 2)); c.lineTo(x1 + wv(i + 1), 1.2 + (i % 2) * 0.05); }
    c.bezierCurveTo(-0.5 + wv(3), 0.8, -0.42, 0.2, -0.3, -0.42); c.fill(); c.strokeStyle = dark; c.lineWidth = 0.028; c.stroke();
    c.strokeStyle = GOLD(c, -0.4, 1.2); c.lineWidth = 0.03; c.beginPath(); c.moveTo(-0.07, -0.3); c.lineTo(-0.1, 1.15); c.moveTo(0.07, -0.3); c.lineTo(0.1, 1.15); c.stroke();
    c.lineWidth = 0.02; for (let i = 0; i < 6; i++) { const y = -0.1 + i * 0.2; c.beginPath(); c.moveTo(-0.08, y); c.lineTo(0, y + 0.07); c.lineTo(0.08, y); c.stroke(); }
    for (let i = 0; i < 8; i++) { const p = (t * 0.4 + i / 8) % 1; c.fillStyle = `rgba(255,150,240,${(1 - p) * 0.7})`; ell(c, -0.3 + ((i * 0.618) % 1) * 0.6, 1.3 + p * 0.35, 0.02, 0.02); c.fill(); }
    // mantle
    c.fillStyle = lin(c, 0, -0.5, 0, 0.1, '#7a3de0', '#3a167a'); c.beginPath(); c.moveTo(-0.5, -0.36); c.quadraticCurveTo(0, -0.62, 0.5, -0.36); c.lineTo(0.56, -0.08);
    for (let i = 0; i < 5; i++) { const x0 = 0.56 - i * 0.224, x1 = x0 - 0.224; c.quadraticCurveTo((x0 + x1) / 2, 0.14, x1, -0.08); }
    c.closePath(); c.fill(); c.strokeStyle = GOLD(c, -0.5, 0.1); c.lineWidth = 0.028; c.stroke();
    c.fillStyle = '#ff5ae0'; c.shadowColor = '#ff4fd8'; c.shadowBlur = 10; poly(c, [[0, -0.34], [0.07, -0.24], [0, -0.14], [-0.07, -0.24]]); c.fill(); c.shadowBlur = 0;
    // arms
    const hL = mix2(mix2([-0.78, 0.02 + Math.sin(t * 1.5) * 0.03], [-0.7, -0.75], a.joy), [-0.95, -0.35], a.hype);
    const hR = mix2(mix2(mix2([0.78, 0.02 - Math.sin(t * 1.5) * 0.03], [0.7, -0.75], a.joy), [0.95, -0.35], a.hype), [1.05, -0.22], a.cast);
    for (const [s, hnd] of [[-1, hL], [1, hR]]) {
      const sh = [s * 0.4, -0.3], el = [mix(sh[0], hnd[0], 0.5), mix(sh[1], hnd[1], 0.5) + 0.2];
      tube(c, sample(sh, el, el, hnd, 10), 0.11, 0.17, robe, dark);
      c.strokeStyle = GOLD(c, hnd[1] - 0.2, hnd[1] + 0.2); c.lineWidth = 0.028; ell(c, hnd[0], hnd[1], 0.17, 0.17); c.stroke();
      c.fillStyle = '#e6d6f5'; ell(c, hnd[0] + s * 0.06, hnd[1] - 0.05, 0.07, 0.07); c.fill();
      if (!a.hype || a.hype < 0.5) orb(hnd[0] + s * 0.08, hnd[1] - 0.26 - Math.sin(t * 3 + s) * 0.03 - (s > 0 ? a.cast * 0.06 : 0), 0.075 + (s > 0 ? a.cast * 0.1 : 0));
    }
    // halo, hood and mask
    c.save(); c.translate(0, -0.78); c.rotate(Math.sin(t * 0.9) * 0.03);
    c.save(); c.rotate(t * 0.4); c.strokeStyle = GOLD(c, -0.6, 0.6); c.lineWidth = 0.03; ell(c, 0, 0, 0.52, 0.52); c.stroke(); c.fillStyle = GOLD(c, -0.7, 0.7); for (let i = 0; i < 8; i++) { const an = (i * TAU) / 8; poly(c, [[Math.cos(an - 0.09) * 0.52, Math.sin(an - 0.09) * 0.52], [Math.cos(an) * (i % 2 ? 0.66 : 0.76), Math.sin(an) * (i % 2 ? 0.66 : 0.76)], [Math.cos(an + 0.09) * 0.52, Math.sin(an + 0.09) * 0.52]]); c.fill(); } c.restore();
    c.fillStyle = lin(c, 0, -0.5, 0, 0.4, '#6a32d0', '#2a0f6e'); c.beginPath(); c.moveTo(0, -0.5); c.bezierCurveTo(0.46, -0.48, 0.5, 0.1, 0.36, 0.4); c.lineTo(0, 0.5); c.lineTo(-0.36, 0.4); c.bezierCurveTo(-0.5, 0.1, -0.46, -0.48, 0, -0.5); c.fill(); c.strokeStyle = dark; c.lineWidth = 0.028; c.stroke();
    c.strokeStyle = GOLD(c, -0.5, 0.4); c.lineWidth = 0.022; c.beginPath(); c.moveTo(-0.3, 0.36); c.bezierCurveTo(-0.42, 0.1, -0.38, -0.4, 0, -0.42); c.bezierCurveTo(0.38, -0.4, 0.42, 0.1, 0.3, 0.36); c.stroke();
    c.fillStyle = '#080216'; c.beginPath(); c.moveTo(0, -0.34); c.bezierCurveTo(0.3, -0.32, 0.32, 0.1, 0.22, 0.34); c.lineTo(0, 0.42); c.lineTo(-0.22, 0.34); c.bezierCurveTo(-0.32, 0.1, -0.3, -0.32, 0, -0.34); c.fill();
    c.fillStyle = GOLD(c, -0.3, 0.4); c.beginPath(); c.moveTo(0, -0.24); c.bezierCurveTo(0.22, -0.22, 0.24, 0.06, 0.15, 0.24); c.quadraticCurveTo(0.06, 0.36, 0, 0.37); c.quadraticCurveTo(-0.06, 0.36, -0.15, 0.24); c.bezierCurveTo(-0.24, 0.06, -0.22, -0.22, 0, -0.24); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.3)'; c.beginPath(); c.moveTo(0, -0.22); c.bezierCurveTo(-0.2, -0.2, -0.22, 0.05, -0.14, 0.22); c.lineTo(-0.04, 0.1); c.lineTo(-0.03, -0.14); c.closePath(); c.fill();
    c.fillStyle = a.blink ? '#7a12c2' : '#ffd6fa'; c.shadowColor = '#ff4fd8'; c.shadowBlur = 10 + power * 14;
    for (const s of [-1, 1]) { c.beginPath(); c.moveTo(s * 0.035 + a.look * 0.01, 0.0); c.quadraticCurveTo(s * 0.1 + a.look * 0.01, -0.07 - a.hype * 0.02, s * 0.17 + a.look * 0.01, -0.03); c.quadraticCurveTo(s * 0.1 + a.look * 0.01, 0.03, s * 0.035 + a.look * 0.01, 0.0); c.fill(); }
    poly(c, [[0, -0.19], [0.03, -0.13], [0, -0.07], [-0.03, -0.13]]); c.fill(); c.shadowBlur = 0;
    c.restore();
    for (const o of orbs) if (o[2] >= 0) orb(o[0], o[1], 0.09 + a.hype * 0.05);
    if (a.hype > 0.5) orb(0, -1.75, 0.2 * a.hype);
  };
})();
