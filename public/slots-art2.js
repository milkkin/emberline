'use strict';
// Emberline slot art, set two: Cinderwing (dragon) and Moonhex Coven (witch).
// These use jointed, layered characters and animated backgrounds on top of SlotArt.
(() => {
  const A = SlotArt, { lin, rad, rr, ell, star, poly, blob, limb, shine, mix, mix2, ICON, GLYPH, CHAR, SCENE, LIVE, THEMES } = A;
  const TAU = Math.PI * 2;
  const bez = (p0, p1, p2, p3, u) => { const v = 1 - u; return [v * v * v * p0[0] + 3 * v * v * u * p1[0] + 3 * v * u * u * p2[0] + u * u * u * p3[0], v * v * v * p0[1] + 3 * v * v * u * p1[1] + 3 * v * u * u * p2[1] + u * u * u * p3[1]]; };
  const sample = (p0, p1, p2, p3, n) => Array.from({ length: n }, (_, i) => bez(p0, p1, p2, p3, i / (n - 1)));
  // a tapered tube drawn as overlapping discs, with an outline pass underneath
  function tube(c, pts, r0, r1, fill, outline) {
    const n = pts.length;
    if (outline) { c.fillStyle = outline; pts.forEach((p, i) => { const r = mix(r0, r1, i / (n - 1)) + 0.022; ell(c, p[0], p[1], r, r); c.fill(); }); }
    c.fillStyle = fill; pts.forEach((p, i) => { const r = mix(r0, r1, i / (n - 1)); ell(c, p[0], p[1], r, r); c.fill(); });
  }

  // ---------- glyphs ----------
  GLYPH.claw = (c) => {
    c.lineCap = 'round';
    for (let i = -1; i <= 1; i++) {
      c.strokeStyle = lin(c, 0, -0.9, 0, 0.9, '#fff3a0', '#ff8a1f', '#c21a0f'); c.lineWidth = 0.2 - Math.abs(i) * 0.03;
      c.beginPath(); c.moveTo(i * 0.42 + 0.28, -0.82); c.quadraticCurveTo(i * 0.42 - 0.1, -0.1, i * 0.42 - 0.3, 0.82); c.stroke();
    }
  };
  GLYPH.moon = (c) => {
    c.fillStyle = lin(c, 0, -0.9, 0, 0.9, '#fffbe0', '#ffd24a', '#d08a12');
    c.beginPath(); c.arc(-0.05, 0, 0.82, 0.55, TAU - 0.55); c.quadraticCurveTo(-0.1, 0, 0.65, 0.43); c.fill();
    c.fillStyle = '#eafffb'; star(c, 0.42, -0.02, 5, 0.26, 0.11); c.fill();
  };

  // ---------- premium symbols ----------
  ICON.scale = (c) => {
    const shape = (s) => { c.beginPath(); c.moveTo(0, -0.88 * s); c.bezierCurveTo(0.8 * s, -0.7 * s, 0.82 * s, 0.1 * s, 0, 0.9 * s); c.bezierCurveTo(-0.82 * s, 0.1 * s, -0.8 * s, -0.7 * s, 0, -0.88 * s); };
    c.fillStyle = lin(c, 0, -0.9, 0, 0.9, '#ffe9a0', '#d08a12'); shape(1); c.fill();
    c.fillStyle = lin(c, -0.5, -0.8, 0.5, 0.8, '#ff6a5c', '#b3141f', '#4a050c'); shape(0.86); c.fill();
    c.strokeStyle = 'rgba(255,200,170,0.5)'; c.lineWidth = 0.035;
    for (const s of [0.66, 0.46, 0.26]) { shape(s); c.stroke(); }
    c.strokeStyle = '#ffd9a0'; c.lineWidth = 0.04; c.beginPath(); c.moveTo(0, -0.7); c.lineTo(0, 0.72); c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.35)'; ell(c, -0.26, -0.36, 0.1, 0.26, 0.5); c.fill(); shine(c, 0.3, -0.42, 0.16);
  };
  ICON.horn = (c) => {
    c.fillStyle = lin(c, -0.7, 0.6, 0.7, -0.7, '#7a4a1c', '#f2dcb0', '#fffaf0');
    c.beginPath(); c.moveTo(-0.82, 0.3); c.bezierCurveTo(-0.3, 0.9, 0.6, 0.5, 0.86, -0.86); c.bezierCurveTo(0.42, -0.06, -0.1, 0.16, -0.52, -0.06); c.closePath(); c.fill();
    c.strokeStyle = '#4a2a0c'; c.lineWidth = 0.045; c.lineJoin = 'round'; c.stroke();
    c.strokeStyle = 'rgba(90,50,10,0.45)'; c.lineWidth = 0.03;
    for (const [x0, y0, x1, y1] of [[0.02, 0.56, 0.02, 0.12], [0.32, 0.34, 0.26, -0.04], [0.56, -0.02, 0.48, -0.3]]) { c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); }
    c.fillStyle = lin(c, 0, -0.2, 0, 0.6, '#fff2a8', '#e3a11c', '#8a4d08');
    c.beginPath(); c.moveTo(-0.9, 0.24); c.quadraticCurveTo(-0.62, 0.72, -0.24, 0.74); c.lineTo(-0.3, 0.02); c.quadraticCurveTo(-0.5, -0.02, -0.6, -0.16); c.closePath(); c.fill();
    c.strokeStyle = '#6b3a05'; c.lineWidth = 0.035; c.stroke(); c.fillStyle = '#e0184f'; ell(c, -0.52, 0.36, 0.08, 0.08); c.fill(); shine(c, 0.6, -0.5, 0.14);
  };
  ICON.egg = (c) => {
    c.fillStyle = rad(c, 0, 0.75, 0.05, 0.75, 'rgba(255,170,40,0.9)', 'rgba(255,80,20,0)'); c.fillRect(-1, 0.1, 2, 0.9);
    c.save(); c.beginPath(); c.moveTo(0, -0.92); c.bezierCurveTo(0.56, -0.86, 0.72, 0.2, 0.52, 0.56); c.bezierCurveTo(0.34, 0.9, -0.34, 0.9, -0.52, 0.56); c.bezierCurveTo(-0.72, 0.2, -0.56, -0.86, 0, -0.92);
    c.fillStyle = rad(c, -0.2, -0.4, 0.05, 1.2, '#ff8a6a', '#a81d2c', '#2a050c'); c.fill(); c.clip();
    c.strokeStyle = 'rgba(20,0,5,0.45)'; c.lineWidth = 0.03;
    for (let row = 0; row < 9; row++) for (let k = -4; k <= 4; k++) { const x = k * 0.22 + (row % 2) * 0.11, y = -0.86 + row * 0.2; c.beginPath(); c.arc(x, y, 0.12, 0.15, Math.PI - 0.15); c.stroke(); }
    c.strokeStyle = '#ffd24a'; c.lineWidth = 0.05; c.shadowColor = '#ff8a1f'; c.shadowBlur = 10; c.lineJoin = 'round';
    c.beginPath(); c.moveTo(-0.5, 0.1); c.lineTo(-0.2, 0.26); c.lineTo(-0.08, 0.02); c.lineTo(0.16, 0.3); c.lineTo(0.3, 0.1); c.lineTo(0.56, 0.24); c.stroke();
    c.restore();
    c.fillStyle = 'rgba(255,255,255,0.4)'; ell(c, -0.22, -0.5, 0.09, 0.2, 0.4); c.fill();
  };
  ICON.eye = (c) => {
    const almond = (s) => { c.beginPath(); c.moveTo(-0.92 * s, 0); c.quadraticCurveTo(0, -0.86 * s, 0.92 * s, 0); c.quadraticCurveTo(0, 0.86 * s, -0.92 * s, 0); };
    c.fillStyle = lin(c, 0, -0.6, 0, 0.6, '#fff2a8', '#e3a11c', '#7a4208'); almond(1); c.fill();
    c.fillStyle = '#1a0508'; almond(0.84); c.fill();
    c.save(); almond(0.78); c.clip();
    c.fillStyle = rad(c, 0, 0, 0.05, 0.66, '#fff3a0', '#ff9a1f', '#c21a0f'); c.fillRect(-1, -1, 2, 2);
    c.strokeStyle = 'rgba(120,20,0,0.5)'; c.lineWidth = 0.02;
    for (let i = 0; i < 26; i++) { const an = (i * TAU) / 26; c.beginPath(); c.moveTo(Math.cos(an) * 0.16, Math.sin(an) * 0.16); c.lineTo(Math.cos(an) * 0.6, Math.sin(an) * 0.6); c.stroke(); }
    c.fillStyle = '#12030a'; c.beginPath(); c.ellipse(0, 0, 0.1, 0.5, 0, 0, TAU); c.fill();
    c.restore();
    c.fillStyle = 'rgba(255,255,255,0.85)'; ell(c, -0.24, -0.2, 0.09, 0.06, -0.5); c.fill();
    for (const s of [-1, 1]) { c.fillStyle = '#ffd24a'; poly(c, [[s * 0.9, 0], [s * 1.0, -0.14], [s * 0.98, 0.14]]); c.fill(); }
  };
  ICON.mushroom = (c) => {
    c.fillStyle = rad(c, 0, 0.1, 0.1, 1, 'rgba(92,255,217,0.35)', 'rgba(92,255,217,0)'); c.fillRect(-1, -1, 2, 2);
    c.fillStyle = lin(c, -0.2, 0, 0.25, 0, '#fffaf0', '#e6d6c2', '#a8947a');
    c.beginPath(); c.moveTo(-0.2, -0.05); c.bezierCurveTo(-0.14, 0.4, -0.36, 0.8, -0.3, 0.86); c.quadraticCurveTo(0, 0.98, 0.3, 0.86); c.bezierCurveTo(0.36, 0.8, 0.14, 0.4, 0.2, -0.05); c.fill();
    c.fillStyle = '#d9c8b0'; ell(c, 0, 0.02, 0.5, 0.1); c.fill();
    c.fillStyle = rad(c, -0.25, -0.5, 0.05, 1.1, '#ff8ad0', '#c2187a', '#4a0a5a');
    c.beginPath(); c.moveTo(-0.86, 0.02); c.bezierCurveTo(-0.9, -0.7, -0.4, -0.94, 0, -0.94); c.bezierCurveTo(0.4, -0.94, 0.9, -0.7, 0.86, 0.02); c.quadraticCurveTo(0, 0.2, -0.86, 0.02); c.fill();
    c.strokeStyle = '#3a0646'; c.lineWidth = 0.04; c.stroke();
    c.fillStyle = '#d6fff4'; c.shadowColor = '#5cffd9'; c.shadowBlur = 8;
    for (const [x, y, r] of [[-0.42, -0.4, 0.13], [0.1, -0.62, 0.16], [0.5, -0.28, 0.11], [-0.1, -0.2, 0.09], [-0.62, -0.1, 0.07], [0.32, -0.02, 0.06]]) { ell(c, x, y, r, r * 0.8); c.fill(); }
    c.shadowBlur = 0;
  };
  ICON.potion = (c) => {
    c.fillStyle = '#8a5a2c'; rr(c, -0.15, -0.98, 0.3, 0.2, 0.05); c.fill();
    c.fillStyle = 'rgba(214,255,244,0.35)'; rr(c, -0.2, -0.8, 0.4, 0.5, 0.04); c.fill(); ell(c, 0, 0.22, 0.68, 0.66); c.fill();
    c.save(); ell(c, 0, 0.22, 0.6, 0.58); c.clip();
    c.fillStyle = lin(c, 0, -0.1, 0, 0.9, '#b8fff0', '#2fe0b0', '#0a6a8a'); c.fillRect(-1, 0.02, 2, 1);
    c.fillStyle = '#eafffb'; ell(c, 0, 0.02, 0.62, 0.07); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.7)'; for (const [x, y, r] of [[-0.2, 0.4, 0.06], [0.16, 0.24, 0.045], [0.3, 0.52, 0.07], [-0.02, 0.64, 0.04]]) { ell(c, x, y, r, r); c.fill(); }
    c.restore();
    c.strokeStyle = '#eafffb'; c.lineWidth = 0.05; ell(c, 0, 0.22, 0.68, 0.66); c.stroke(); c.strokeRect(-0.2, -0.8, 0.4, 0.42);
    c.fillStyle = '#ffd24a'; rr(c, -0.27, -0.42, 0.54, 0.1, 0.04); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.6)'; ell(c, -0.36, 0.02, 0.08, 0.24, 0.5); c.fill(); shine(c, 0.36, -0.1, 0.14);
  };
  ICON.tome = (c) => {
    c.rotate(-0.12);
    c.fillStyle = '#efe4c8'; rr(c, -0.62, -0.7, 1.3, 1.46, 0.06); c.fill();
    c.strokeStyle = 'rgba(120,90,40,0.5)'; c.lineWidth = 0.02; for (let y = -0.6; y < 0.74; y += 0.09) { c.beginPath(); c.moveTo(0.56, y); c.lineTo(0.68, y); c.stroke(); }
    c.fillStyle = lin(c, -0.7, -0.8, 0.6, 0.8, '#8a5cff', '#4a1fa8', '#1c0a5a'); rr(c, -0.72, -0.8, 1.3, 1.5, 0.08); c.fill();
    c.strokeStyle = '#12062e'; c.lineWidth = 0.045; c.stroke();
    c.fillStyle = '#2a0f6e'; c.fillRect(-0.72, -0.8, 0.16, 1.5);
    c.fillStyle = lin(c, 0, -0.8, 0, 0.7, '#fff2a8', '#e3a11c');
    for (const [x, y] of [[0.58, -0.8], [0.58, 0.7]]) { poly(c, [[x, y], [x - 0.26, y], [x, y + (y < 0 ? 0.26 : -0.26)]]); c.fill(); }
    c.fillRect(0.4, -0.12, 0.22, 0.2);
    c.strokeStyle = '#5cffd9'; c.lineWidth = 0.035; c.shadowColor = '#5cffd9'; c.shadowBlur = 10; ell(c, -0.06, -0.05, 0.34, 0.34); c.stroke(); star(c, -0.06, -0.05, 5, 0.3, 0.12); c.stroke(); c.shadowBlur = 0;
  };
  ICON.orb = (c) => {
    c.fillStyle = lin(c, 0, 0.5, 0, 0.98, '#fff2a8', '#e3a11c', '#7a4208');
    poly(c, [[-0.3, 0.52], [0.3, 0.52], [0.56, 0.96], [-0.56, 0.96]]); c.fill(); c.strokeStyle = '#5a2f05'; c.lineWidth = 0.035; c.stroke();
    c.save(); ell(c, 0, -0.12, 0.74, 0.74); c.fillStyle = rad(c, -0.2, -0.36, 0.05, 1, '#d6fff4', '#5a3dd9', '#12062e'); c.fill(); c.clip();
    c.lineCap = 'round';
    for (let arm = 0; arm < 3; arm++) { c.strokeStyle = ['#5cffd9', '#ff9ad9', '#ffffff'][arm]; c.globalAlpha = 0.75; c.lineWidth = 0.07; c.beginPath(); for (let q = 0; q <= 3.4; q += 0.15) { const r = 0.06 + q * 0.17, an = q + (arm * TAU) / 3; c[q ? 'lineTo' : 'moveTo'](Math.cos(an) * r, -0.12 + Math.sin(an) * r); } c.stroke(); }
    c.globalAlpha = 1; c.fillStyle = rad(c, 0, -0.12, 0, 0.22, '#ffffff', 'rgba(255,255,255,0)'); c.fillRect(-1, -1, 2, 2);
    c.restore();
    c.strokeStyle = '#eafffb'; c.lineWidth = 0.045; ell(c, 0, -0.12, 0.74, 0.74); c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.65)'; ell(c, -0.34, -0.46, 0.11, 0.24, 0.6); c.fill(); shine(c, 0.36, -0.44, 0.16);
  };

  // ---------- themes ----------
  THEMES.dragon = {
    tag: 'Wild reels walk left and multiply each other', bg: ['#0a0406', '#3a0a10', '#b5300f'], accent: '#ffb347', accent2: '#ff3d1f', frame: ['#ffe0a8', '#ff5a1f'],
    lows: ['#ffb36b', '#ff7a5c', '#ffd36b', '#ff5a6a', '#fff0b8'], icons: ['scale', 'horn', 'egg', 'eye'], glyph: 'claw', wild: ['#ffe9a0', '#ff4d1f', '#5a0a12'], ambient: 'ember', chScale: 1.05,
    quotes: { wild: ['BURN!', 'My reel now.', 'Ashes!'], win: ['More for the hoard.', 'Shiny.', 'Mine!'], big: ['THE HOARD GROWS!', 'KNEEL BEFORE THE FLAME!'], bonus: ['Free spins. I am pleased.'], tease: ['Hrrrm.', 'Patience, mortal.'], idle: ['I have slept on bigger wins.', 'Wake me when it lands.'] },
  };
  THEMES.witch = {
    tag: 'Sticky wild reels raise a multiplier that never resets', bg: ['#050312', '#1a0f4a', '#3d2a8a'], accent: '#5cffd9', accent2: '#b98aff', frame: ['#d6fff4', '#8a5cff'],
    lows: ['#5cffd9', '#b98aff', '#ff9ad9', '#9db8ff', '#fff2a8'], icons: ['mushroom', 'potion', 'tome', 'orb'], glyph: 'moon', wild: ['#d6fff4', '#7a4dff', '#1c0a5a'], ambient: 'mote', chScale: 1.08,
    quotes: { wild: ['Hex!', 'By the moon!', 'Abraca-wild!'], win: ['Charmed!', 'Brewed to perfection.', 'Ooh, sparkly!'], big: ['FULL MOON JACKPOT!', 'THE COVEN FEASTS!'], bonus: ['Free spins! Light the candles.'], tease: ['Curses!', 'The moon was shy.'], idle: ['Double, double, spin and bubble.', 'My bat says spin.'] },
  };

  // ---------- backgrounds: a still layer plus a moving one drawn every frame ----------
  SCENE.dragon = (c, w, h) => {
    const ridge = (base, amp, col, seed) => { c.fillStyle = col; c.beginPath(); c.moveTo(0, h); for (let i = 0; i <= 40; i++) { const x = (i / 40) * w; c.lineTo(x, h * base - Math.abs(Math.sin(i * 0.9 + seed) * Math.sin(i * 0.37 + seed * 2)) * h * amp); } c.lineTo(w, h); c.fill(); };
    c.fillStyle = rad(c, w * 0.12, h * 0.34, 0, h * 0.6, 'rgba(255,140,40,0.55)', 'rgba(255,60,20,0)'); c.fillRect(0, 0, w, h);
    ridge(0.62, 0.3, 'rgba(60,12,16,0.85)', 1.3);
    c.fillStyle = '#1c070b'; poly(c, [[w * -0.02, h * 0.86], [w * 0.08, h * 0.36], [w * 0.16, h * 0.36], [w * 0.3, h * 0.86]]); c.fill();
    ridge(0.8, 0.16, 'rgba(26,6,10,0.95)', 4.1);
    c.fillStyle = '#0c0306'; c.fillRect(0, h * 0.9, w, h * 0.1);
  };
  LIVE.dragon = (c, w, h, t, k) => {
    const pulse = 0.6 + 0.4 * Math.sin(t * 2.3);
    c.save(); c.globalCompositeOperation = 'lighter';
    c.fillStyle = rad(c, w * 0.12, h * 0.36, 0, h * 0.26, `rgba(255,190,80,${0.5 * pulse + k * 0.3})`, 'rgba(255,60,10,0)'); c.fillRect(0, 0, w * 0.5, h * 0.8);
    c.strokeStyle = `rgba(255,150,40,${0.75})`; c.lineWidth = h * 0.012; c.lineCap = 'round';
    c.beginPath(); c.moveTo(w * 0.12, h * 0.37); c.bezierCurveTo(w * 0.1, h * 0.5, w * 0.17, h * 0.62, w * 0.14 + Math.sin(t) * 3, h * 0.86); c.stroke();
    c.beginPath(); for (let i = 0; i <= 50; i++) { const x = (i / 50) * w, y = h * 0.945 + Math.sin(i * 0.5 + t * 1.3) * h * 0.008; c[i ? 'lineTo' : 'moveTo'](x, y); }
    c.strokeStyle = lin(c, 0, 0, w, 0, '#ff5a1f', '#ffd24a', '#ff3d1f', '#ffb347'); c.lineWidth = h * (0.03 + 0.008 * pulse); c.stroke();
    c.fillStyle = lin(c, 0, h * 0.7, 0, h, 'rgba(255,80,20,0)', `rgba(255,80,20,${0.22 + 0.08 * pulse + k * 0.15})`); c.fillRect(0, h * 0.7, w, h * 0.3);
    c.restore();
    for (let i = 0; i < 7; i++) { const p = (t * 0.07 + i / 7) % 1; c.fillStyle = `rgba(40,20,24,${0.4 * (1 - p)})`; ell(c, w * 0.12 + Math.sin(i * 2 + t * 0.4) * w * 0.03 + p * w * 0.08, h * 0.34 - p * h * 0.4, h * (0.03 + p * 0.09), h * (0.03 + p * 0.08)); c.fill(); }
  };
  SCENE.witch = (c, w, h) => {
    for (let i = 0; i < 140; i++) { const s = 0.4 + ((i * 0.33) % 1) * 1.3; c.fillStyle = `rgba(255,255,255,${0.25 + ((i * 0.17) % 1) * 0.6})`; c.fillRect(((i * 0.618) % 1) * w, ((i * 0.755) % 1) * h * 0.75, s, s); }
    const mx = w * 0.13, my = h * 0.24, mr = h * 0.17;
    c.fillStyle = rad(c, mx, my, mr * 0.6, mr * 3, 'rgba(210,235,255,0.5)', 'rgba(120,140,255,0)'); c.fillRect(0, 0, w, h);
    c.fillStyle = rad(c, mx - mr * 0.3, my - mr * 0.3, mr * 0.1, mr * 1.2, '#ffffff', '#e6f0ff', '#a9b8e6'); ell(c, mx, my, mr, mr); c.fill();
    c.fillStyle = 'rgba(120,140,200,0.35)'; for (const [x, y, r] of [[-0.3, 0.2, 0.2], [0.35, -0.25, 0.14], [0.1, 0.45, 0.1], [-0.45, -0.35, 0.08]]) { ell(c, mx + x * mr, my + y * mr, r * mr, r * mr); c.fill(); }
    const tree = (x, s, col) => {
      c.strokeStyle = col; c.lineCap = 'round';
      const br = (x0, y0, an, len, wd, d) => { const x1 = x0 + Math.cos(an) * len, y1 = y0 + Math.sin(an) * len; c.lineWidth = wd; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); if (d > 0) { br(x1, y1, an - 0.5 - (d % 2) * 0.2, len * 0.68, wd * 0.62, d - 1); br(x1, y1, an + 0.45, len * 0.7, wd * 0.62, d - 1); } };
      br(x, h, -Math.PI / 2 + 0.05, h * 0.2 * s, h * 0.03 * s, 4);
    };
    tree(w * 0.03, 1.5, '#0a0620'); tree(w * 0.27, 1.0, '#0d0828'); tree(w * 0.985, 1.4, '#0a0620');
    c.fillStyle = '#080418'; c.beginPath(); c.moveTo(0, h); for (let i = 0; i <= 30; i++) c.lineTo((i / 30) * w, h * 0.9 - Math.abs(Math.sin(i * 1.7)) * h * 0.03); c.lineTo(w, h); c.fill();
  };
  LIVE.witch = (c, w, h, t, k) => {
    for (let i = 0; i < 4; i++) { const x = ((t * (0.012 + i * 0.004) + i * 0.27) % 1.3 - 0.15) * w, y = h * (0.16 + i * 0.07); c.fillStyle = `rgba(150,140,230,${0.16 + k * 0.06})`; for (let j = 0; j < 5; j++) { ell(c, x + j * h * 0.07, y + Math.sin(j * 2 + i) * h * 0.012, h * 0.075, h * 0.026); c.fill(); } }
    c.fillStyle = '#05020f';
    for (let i = 0; i < 5; i++) { const p = (t * 0.045 + i * 0.21) % 1, x = p * w * 1.1 - w * 0.05, y = h * (0.12 + i * 0.05) + Math.sin(t * 1.4 + i * 2) * h * 0.02, s = h * (0.012 + (i % 3) * 0.004), f = Math.sin(t * 13 + i * 2) * s * 0.9; c.beginPath(); c.moveTo(x - s * 2, y - f); c.quadraticCurveTo(x - s, y - s * 0.6, x, y); c.quadraticCurveTo(x + s, y - s * 0.6, x + s * 2, y - f); c.quadraticCurveTo(x + s, y + s * 0.2, x, y + s * 0.5); c.quadraticCurveTo(x - s, y + s * 0.2, x - s * 2, y - f); c.fill(); }
    for (let i = 0; i < 3; i++) { const o = Math.sin(t * 0.3 + i * 2) * w * 0.05; c.fillStyle = lin(c, 0, h * (0.82 + i * 0.05), 0, h, 'rgba(92,255,217,0)', `rgba(120,200,230,${0.1 + k * 0.08})`); c.beginPath(); c.moveTo(0, h); for (let j = 0; j <= 20; j++) c.lineTo((j / 20) * w, h * (0.86 + i * 0.04) + Math.sin(j * 0.8 + t * 0.5 + i) * h * 0.015 + o * 0.02); c.lineTo(w, h); c.fill(); }
  };

  // ---------- Cinderwing, the dragon ----------
  CHAR.dragon = (c, t, a) => {
    const breathe = Math.sin(t * 1.6), flapV = 2.2 + a.joy * 3.5 + a.hype * 6, flap = Math.sin(t * flapV) * (0.2 + a.joy * 0.28 + a.hype * 0.32);
    const body = lin(c, 0, -0.4, 0, 1.1, '#c22a35', '#7a1220', '#2a070e'), dark = '#16040a', bone = lin(c, 0, -1.4, 0, 1.2, '#fffaf0', '#e6cfa0', '#a8845a');
    c.fillStyle = rad(c, 0.1, 0.1, 0.1, 2, `rgba(255,110,30,${0.2 + a.joy * 0.22 + a.cast * 0.25})`, 'rgba(255,60,20,0)'); c.fillRect(-2.4, -2.4, 4.8, 4.8);
    c.translate(0.4, 0.05); c.scale(0.92, 0.92);
    // hoard
    c.fillStyle = '#14080c'; ell(c, -0.1, 1.3, 1.1, 0.22); c.fill();
    for (let i = 0; i < 22; i++) { const x = -1.0 + ((i * 0.618) % 1) * 1.9, y = 1.2 + ((i * 0.37) % 1) * 0.16; c.fillStyle = i % 3 ? '#e3a11c' : '#ffd24a'; ell(c, x, y, 0.1, 0.04); c.fill(); c.fillStyle = '#fff2a8'; ell(c, x - 0.02, y - 0.012, 0.06, 0.018); c.fill(); if (Math.sin(t * 3 + i * 1.7) > 0.93) shine(c, x, y - 0.03, 0.09); }
    c.translate(0, breathe * 0.018 - a.hype * Math.abs(Math.sin(t * 7)) * 0.07);
    // wings
    const wing = (sx, sy, f, far) => {
      const a1 = -1.75 + f * 0.4, E = [sx + Math.cos(a1) * 0.6, sy + Math.sin(a1) * 0.6], a2 = -2.3 + f * 0.5, W = [E[0] + Math.cos(a2) * 0.45, E[1] + Math.sin(a2) * 0.45];
      const tips = [[-2.65, 1.0], [-3.2, 0.95], [-3.78, 0.8]].map(([an, L], i) => [W[0] + Math.cos(an + f * (0.6 + i * 0.12)) * L, W[1] + Math.sin(an + f * (0.6 + i * 0.12)) * L]);
      const att = [sx - 0.25, sy + 0.5], sc = (p, q) => { const m = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2]; return [mix(m[0], W[0], 0.3), mix(m[1], W[1], 0.3)]; };
      c.beginPath(); c.moveTo(sx, sy); c.lineTo(E[0], E[1]); c.lineTo(W[0], W[1]); c.lineTo(tips[0][0], tips[0][1]);
      let s1 = sc(tips[0], tips[1]); c.quadraticCurveTo(s1[0], s1[1], tips[1][0], tips[1][1]);
      s1 = sc(tips[1], tips[2]); c.quadraticCurveTo(s1[0], s1[1], tips[2][0], tips[2][1]);
      s1 = sc(tips[2], att); c.quadraticCurveTo(s1[0], s1[1], att[0], att[1]); c.closePath();
      c.fillStyle = far ? lin(c, 0, -1.6, 0, 0.5, '#5a0f18', '#2a060c') : lin(c, W[0], W[1], att[0], att[1], '#ff6a3d', '#c21a2a', '#5a0a16'); c.fill();
      c.strokeStyle = dark; c.lineWidth = 0.025; c.lineJoin = 'round'; c.stroke();
      if (!far) { c.strokeStyle = 'rgba(255,190,120,0.35)'; c.lineWidth = 0.014; for (const tp of tips) for (const u of [0.35, 0.65]) { c.beginPath(); c.moveTo(mix(W[0], tp[0], u), mix(W[1], tp[1], u)); c.lineTo(mix(att[0], tp[0], u * 0.8), mix(att[1], tp[1], u * 0.8)); c.stroke(); } }
      const bcol = far ? '#3a0a12' : '#8a1522';
      limb(c, [[sx, sy], E], 0.11, bcol); limb(c, [E, W], 0.085, bcol);
      for (const tp of tips) limb(c, [W, tp], 0.045, bcol);
      c.fillStyle = bone; poly(c, [[W[0] - 0.04, W[1]], [W[0] + 0.04, W[1] - 0.02], [W[0] + 0.06, W[1] - 0.2]]); c.fill();
    };
    wing(-0.08, -0.18, Math.sin(t * flapV - 0.5) * (0.2 + a.joy * 0.28 + a.hype * 0.32), true);
    // tail
    const tail = sample([-0.6, 0.8], [-1.35, 1.25], [-1.45, 0.3], [-1.0 + Math.sin(t * 1.3) * 0.1, 0.02 + Math.cos(t * 1.1) * 0.08], 20);
    tube(c, tail, 0.2, 0.035, body, dark);
    const te = tail[19], tp = tail[17], ta = Math.atan2(te[1] - tp[1], te[0] - tp[0]);
    c.save(); c.translate(te[0], te[1]); c.rotate(ta); c.fillStyle = '#ff6a3d'; poly(c, [[0, -0.13], [0.3, 0], [0, 0.13], [0.08, 0]]); c.fill(); c.strokeStyle = dark; c.lineWidth = 0.02; c.stroke(); c.restore();
    // body
    c.fillStyle = body; blob(c, [[-0.55, -0.22], [-0.12, -0.34], [0.24, -0.06], [0.34, 0.5], [0.08, 0.98], [-0.5, 1.02], [-0.82, 0.55]]); c.fill(); c.strokeStyle = dark; c.lineWidth = 0.03; c.stroke();
    c.save(); blob(c, [[0.1, -0.06], [0.36, 0.34], [0.24, 0.9], [-0.06, 1.0], [-0.04, 0.4]]); c.fillStyle = lin(c, 0, -0.1, 0, 1, '#ffd98a', '#f2903a', '#a8431a'); c.fill(); c.clip();
    c.strokeStyle = 'rgba(120,40,10,0.55)'; c.lineWidth = 0.025; for (let y = 0.08; y < 1; y += 0.15) { c.beginPath(); c.moveTo(-0.1, y + 0.05); c.quadraticCurveTo(0.15, y - 0.05, 0.42, y + 0.05); c.stroke(); }
    c.restore();
    c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = rad(c, 0.16, 0.2, 0, 0.42, `rgba(255,170,60,${0.22 + 0.12 * breathe + a.cast * 0.6})`, 'rgba(255,90,20,0)'); c.fillRect(-0.4, -0.3, 1.1, 1.1); c.restore();
    c.fillStyle = body; ell(c, -0.36, 0.72, 0.36, 0.42, -0.3); c.fill(); c.strokeStyle = dark; c.lineWidth = 0.03; c.stroke();
    limb(c, [[-0.3, 1.0], [0.12, 1.1]], 0.17, '#7a1220');
    c.fillStyle = bone; for (let i = 0; i < 3; i++) { poly(c, [[0.1 + i * 0.07, 1.04], [0.18 + i * 0.07, 1.08], [0.14 + i * 0.07, 1.2]]); c.fill(); }
    wing(-0.3, -0.16, flap, false);
    // neck and head
    let H = [0.5 + Math.sin(t * 0.9) * 0.04, -0.85 + breathe * 0.03];
    H = mix2(H, [0.66, -0.76], a.antic); H = mix2(H, [0.84, -0.58], a.cast); H = mix2(H, [0.4, -1.12], a.hype * (1 - a.cast));
    const neck = sample([0.02, -0.08], [-0.28, -0.56], [H[0] - 0.5, H[1] + 0.16], H, 14);
    for (let i = 1; i < 13; i++) { const p = neck[i], q = neck[i + 1], o = neck[i - 1], tx = q[0] - o[0], ty = q[1] - o[1], l = Math.hypot(tx, ty), nx = -ty / l, ny = tx / l, r = mix(0.27, 0.15, i / 13); c.fillStyle = '#ff6a3d'; poly(c, [[p[0] - nx * r * 0.8 - (tx / l) * 0.05, p[1] - ny * r * 0.8 - (ty / l) * 0.05], [p[0] - nx * (r + 0.13), p[1] - ny * (r + 0.13)], [p[0] - nx * r * 0.8 + (tx / l) * 0.05, p[1] - ny * r * 0.8 + (ty / l) * 0.05]]); c.fill(); }
    tube(c, neck, 0.27, 0.15, body, dark);
    for (let i = 1; i < 13; i++) { const p = neck[i], q = neck[i + 1], o = neck[i - 1], tx = q[0] - o[0], ty = q[1] - o[1], l = Math.hypot(tx, ty), r = mix(0.27, 0.15, i / 13); c.fillStyle = i % 2 ? '#f2903a' : '#ffc46b'; ell(c, p[0] + (-ty / l) * r * 0.5, p[1] + (tx / l) * r * 0.5, r * 0.52, r * 0.52); c.fill(); }
    const glowPos = neck[Math.min(13, Math.floor(a.cast * 13))];
    if (a.cast > 0.05) { c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = rad(c, glowPos[0], glowPos[1], 0, 0.3, 'rgba(255,220,120,0.8)', 'rgba(255,120,20,0)'); c.fillRect(glowPos[0] - 0.3, glowPos[1] - 0.3, 0.6, 0.6); c.restore(); }
    limb(c, [[0.14, 0.24], [0.4, 0.5], [0.32 + a.joy * 0.2, 0.8 - a.joy * 0.5]], 0.13, '#8a1522');
    const jaw = 0.07 + a.cast * 0.5 + a.hype * 0.55 + a.joy * 0.22 + Math.max(0, Math.sin(t * 1.6)) * 0.03;
    c.save(); c.translate(H[0], H[1]); c.rotate(0.1 + a.cast * 0.16 - a.hype * 0.45 + Math.sin(t * 1.1) * 0.04); c.scale(1.18, 1.18);
    for (const [o, s] of [[0.1, 0.8], [0, 1]]) { c.fillStyle = bone; c.beginPath(); c.moveTo(-0.08 + o, -0.18); c.bezierCurveTo(-0.3 + o, -0.3, -0.5 * s + o, -0.36, -0.66 * s + o, -0.56 * s); c.bezierCurveTo(-0.44 * s + o, -0.22, -0.32 + o, -0.12, -0.2 + o, -0.06); c.closePath(); c.fill(); c.strokeStyle = '#5a3a1c'; c.lineWidth = 0.018; c.stroke(); }
    c.fillStyle = '#ff6a3d'; for (let i = 0; i < 3; i++) { const an = 2.5 + i * 0.38; poly(c, [[-0.16, 0.04 + i * 0.03], [-0.16 + Math.cos(an) * 0.34, 0.06 + Math.sin(an) * 0.34], [-0.1, 0.12 + i * 0.03]]); c.fill(); }
    c.fillStyle = lin(c, 0, 0, 0.5, 0.3, '#3a050a', a.cast > 0.2 ? '#ffb347' : '#8a1018'); poly(c, [[-0.04, 0.06], [0.52, 0.05], [-0.04 + Math.cos(jaw) * 0.52, 0.07 + Math.sin(jaw) * 0.52]]); c.fill();
    c.save(); c.translate(-0.04, 0.07); c.rotate(jaw);
    c.fillStyle = '#6a1019'; c.beginPath(); c.moveTo(-0.04, 0); c.lineTo(0.5, 0.0); c.quadraticCurveTo(0.56, 0.06, 0.48, 0.1); c.quadraticCurveTo(0.2, 0.18, -0.08, 0.12); c.closePath(); c.fill(); c.strokeStyle = dark; c.lineWidth = 0.02; c.stroke();
    c.fillStyle = '#fffaf0'; for (const x of [0.18, 0.28, 0.38, 0.47]) { poly(c, [[x - 0.03, 0.005], [x, -0.075], [x + 0.03, 0.005]]); c.fill(); }
    c.restore();
    c.fillStyle = lin(c, 0, -0.28, 0, 0.1, '#e03a45', '#8a1522', '#4a0a12');
    c.beginPath(); c.moveTo(-0.26, 0.08); c.bezierCurveTo(-0.32, -0.2, -0.06, -0.28, 0.1, -0.2); c.lineTo(0.2, -0.16); c.quadraticCurveTo(0.4, -0.11, 0.55, -0.06); c.quadraticCurveTo(0.64, 0.0, 0.56, 0.06); c.lineTo(0, 0.09); c.closePath(); c.fill(); c.strokeStyle = dark; c.lineWidth = 0.022; c.stroke();
    c.fillStyle = '#fffaf0'; for (const x of [0.22, 0.32, 0.42, 0.51]) { poly(c, [[x - 0.03, 0.065], [x, 0.15], [x + 0.03, 0.065]]); c.fill(); }
    c.strokeStyle = 'rgba(255,170,150,0.4)'; c.lineWidth = 0.014; for (const [x, y] of [[-0.1, -0.12], [0.0, -0.06], [-0.14, -0.02], [0.3, -0.05], [0.4, -0.02]]) { c.beginPath(); c.arc(x, y, 0.045, Math.PI, TAU); c.stroke(); }
    c.fillStyle = dark; ell(c, 0.52, -0.02, 0.03, 0.018, -0.4); c.fill();
    c.fillStyle = dark; ell(c, 0.17, -0.1, 0.085, 0.06, -0.2); c.fill();
    c.save(); c.translate(0.17, -0.1); c.rotate(-0.2); c.scale(1, a.blink ? 0.12 : 1);
    c.fillStyle = '#ffd24a'; c.shadowColor = '#ff9a1f'; c.shadowBlur = 12 + a.hype * 10; ell(c, 0, 0, 0.065, 0.042 + a.hype * 0.012); c.fill(); c.shadowBlur = 0;
    c.fillStyle = '#12030a'; ell(c, a.look * 0.015, 0, 0.012 + a.antic * 0.01, 0.038); c.fill(); c.restore();
    c.fillStyle = '#5a0a12'; poly(c, [[0.04, -0.17], [0.3, -0.1], [0.28, -0.14 - a.hype * 0.02], [0.08, -0.2]]); c.fill();
    for (let i = 0; i < 3; i++) { const p = (t * 0.5 + i / 3) % 1; c.fillStyle = `rgba(90,70,70,${0.35 * (1 - p) * (1 - a.cast)})`; ell(c, 0.54 + p * 0.1, -0.04 - p * 0.3, 0.02 + p * 0.06, 0.02 + p * 0.06); c.fill(); }
    if (a.cast > 0.08 || a.hype > 0.5) {
      const pw = Math.max(a.cast, (a.hype - 0.5) * 2);
      c.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 18; i++) { const u = ((i / 18 + t * 2.4) % 1), x = 0.56 + u * 1.25 * pw, y = 0.08 + u * 0.14 + Math.sin(t * 22 + i * 2.1) * 0.05 * u, r = 0.04 + u * 0.24 * pw; c.fillStyle = rad(c, x, y, 0, r, `rgba(255,${250 - u * 150},${180 - u * 170},${(1 - u) * 0.75})`, 'rgba(255,60,10,0)'); ell(c, x, y, r, r); c.fill(); }
    }
    c.restore();
  };

  // ---------- Nyx, the moon witch ----------
  CHAR.witch = (c, t, a) => {
    const sway = Math.sin(t * 1.1), dark = '#12062e', hair = lin(c, -1, -1, 0.3, 0.9, '#ffffff', '#bff5ea', '#4ac8b8');
    c.fillStyle = rad(c, 0, 0, 0.1, 1.9, `rgba(92,255,217,${0.14 + a.joy * 0.22})`, 'rgba(140,90,255,0.07)', 'rgba(0,0,0,0)'); c.fillRect(-2.3, -2.3, 4.6, 4.6);
    // rune circle
    const glow = 0.35 + a.joy * 0.35 + a.hype * 0.3 + a.cast * 0.3;
    c.save(); c.translate(0, 1.32); c.scale(1, 0.27); c.rotate(t * 0.5); c.strokeStyle = `rgba(92,255,217,${glow})`; c.shadowColor = '#5cffd9'; c.shadowBlur = 14; c.lineWidth = 0.035;
    ell(c, 0, 0, 0.98, 0.98); c.stroke(); ell(c, 0, 0, 0.78, 0.78); c.stroke(); star(c, 0, 0, 6, 0.78, 0.45); c.stroke();
    c.beginPath(); for (let i = 0; i < 18; i++) { const an = (i * TAU) / 18; c.moveTo(Math.cos(an) * 0.82, Math.sin(an) * 0.82); c.lineTo(Math.cos(an) * 0.94, Math.sin(an) * 0.94); } c.stroke(); c.restore();
    for (let i = 0; i < 10; i++) { const p = (t * 0.3 + i / 10) % 1; c.fillStyle = `rgba(160,255,235,${(1 - p) * glow})`; ell(c, Math.sin(i * 2.4) * 0.8 + Math.sin(t * 2 + i) * 0.04, 1.3 - p * (1.0 + a.hype), 0.022, 0.022); c.fill(); }
    c.translate(0, Math.sin(t * 1.4) * 0.06 - a.hype * Math.abs(Math.sin(t * 8)) * 0.1);
    // cloak
    const wv = (i) => Math.sin(t * 2 + i * 1.3) * 0.05 * (1 + a.hype + a.joy * 0.5);
    c.fillStyle = lin(c, 0, -0.4, 0, 1.1, '#4a1f9a', '#1c0a4a', '#0c0424');
    blob(c, [[-0.36, -0.36], [0.36, -0.36], [0.78 + wv(0), 0.45], [0.66 + wv(1), 1.06], [0.24, 0.94 + wv(2)], [-0.2, 1.06 + wv(3)], [-0.7 + wv(4), 1.0], [-0.86 + wv(5), 0.42]]); c.fill();
    c.strokeStyle = '#7a4dff'; c.lineWidth = 0.022; c.stroke();
    for (let i = 0; i < 9; i++) { if (Math.sin(t * 2 + i * 2.3) > 0.2) shine(c, -0.62 + ((i * 0.618) % 1) * 1.25, 0.3 + ((i * 0.37) % 1) * 0.6, 0.05); }
    // back hair
    for (let i = 0; i < 6; i++) { const pts = sample([-0.12 - i * 0.04, -0.82], [-0.62, -0.62 + i * 0.1], [-0.95 + Math.sin(t * 1.5 + i) * 0.12, -0.1 + i * 0.13], [-0.8 + Math.sin(t * 1.8 + i * 0.7) * 0.2 - a.hype * 0.2, 0.36 + i * 0.13 - a.hype * 0.3], 26); tube(c, pts, 0.11, 0.035, hair, i % 2 ? null : 'rgba(40,120,120,0.5)'); }
    // legs
    for (const s of [-1, 1]) {
      const sw = Math.sin(t * 2 + s) * 0.07, foot = [s * 0.15 + sw, 1.06];
      limb(c, [[s * 0.12, 0.5], foot], 0.13, '#f2e9ff');
      for (const u of [0.25, 0.5, 0.75]) limb(c, [[mix(s * 0.12, foot[0], u) - 0.065, mix(0.5, 1.06, u)], [mix(s * 0.12, foot[0], u) + 0.065, mix(0.5, 1.06, u)]], 0.05, '#7a4dff');
      c.fillStyle = dark; ell(c, foot[0] + 0.03, foot[1] + 0.06, 0.13, 0.085); c.fill(); c.beginPath(); c.moveTo(foot[0] + 0.1, foot[1] + 0.03); c.quadraticCurveTo(foot[0] + 0.26, foot[1], foot[0] + 0.22, foot[1] - 0.1); c.quadraticCurveTo(foot[0] + 0.2, foot[1] + 0.06, foot[0] + 0.1, foot[1] + 0.12); c.fill();
    }
    // dress
    c.fillStyle = lin(c, 0, -0.3, 0, 0.7, '#6a3de8', '#3a1a9a', '#1c0a5a');
    c.beginPath(); c.moveTo(-0.22, -0.32); c.lineTo(0.22, -0.32); c.bezierCurveTo(0.26, 0.1, 0.4, 0.4, 0.46 + wv(1) * 0.5, 0.62);
    for (let i = 0; i < 5; i++) { const x0 = 0.46 - i * 0.184, x1 = x0 - 0.184; c.quadraticCurveTo((x0 + x1) / 2, 0.76 + wv(i) * 0.4, x1, 0.62); }
    c.bezierCurveTo(-0.4, 0.4, -0.26, 0.1, -0.22, -0.32); c.fill(); c.strokeStyle = dark; c.lineWidth = 0.025; c.stroke();
    c.strokeStyle = '#5cffd9'; c.lineWidth = 0.02; c.beginPath(); c.moveTo(-0.4, 0.56); for (let i = 0; i < 5; i++) c.quadraticCurveTo(-0.31 + i * 0.184, 0.68, -0.22 + i * 0.184, 0.56); c.stroke();
    c.fillStyle = '#ffd24a'; c.fillRect(-0.25, 0.0, 0.5, 0.07); c.fillStyle = '#fff2a8'; rr(c, -0.07, -0.025, 0.14, 0.12, 0.02); c.fill();
    c.fillStyle = '#eafffb'; poly(c, [[-0.2, -0.33], [0, -0.2], [0.2, -0.33], [0.14, -0.38], [-0.14, -0.38]]); c.fill();
    // arms and staff
    const handL = mix2([-0.48, 0.2 + sway * 0.03], [-0.62, -0.72 + Math.sin(t * 9) * 0.05], a.joy);
    const handR = mix2(mix2([0.56, 0.14 - sway * 0.03], [0.92, -0.2], a.cast), [0.62, -0.74 + Math.cos(t * 9) * 0.05], a.joy * (1 - a.cast));
    limb(c, [[-0.24, -0.24], [-0.52, mix(0.0, -0.3, a.joy)], handL], 0.19, '#4a22b8');
    c.fillStyle = '#7a4dff'; ell(c, handL[0], handL[1], 0.13, 0.13); c.fill(); c.fillStyle = '#ffe0d0'; ell(c, handL[0] - 0.02, handL[1] + 0.05, 0.075, 0.075); c.fill();
    c.save(); c.translate(handR[0], handR[1]); c.rotate(0.14 + sway * 0.04 + a.cast * 0.95 + a.joy * 0.2 * Math.sin(t * 9));
    c.strokeStyle = lin(c, -0.03, 0, 0.03, 0, '#8a5a2c', '#5a3414'); c.lineWidth = 0.055; c.lineCap = 'round'; c.beginPath(); c.moveTo(0, 0.8); c.lineTo(0, -0.74); c.stroke();
    c.fillStyle = lin(c, 0, -1.2, 0, -0.7, '#fffbe0', '#ffd24a', '#c98a12'); c.beginPath(); c.arc(0, -0.95, 0.24, 0.5, Math.PI - 0.5, true); c.quadraticCurveTo(0, -0.82, 0.2, -0.85); c.fill();
    const cr = 0.085 + a.cast * 0.07 + Math.sin(t * 5) * 0.012;
    c.shadowColor = '#5cffd9'; c.shadowBlur = 18 + a.cast * 22; c.fillStyle = lin(c, 0, -1.1, 0, -0.85, '#ffffff', '#5cffd9'); poly(c, [[0, -0.98 - cr * 1.5], [cr, -0.98], [0, -0.98 + cr * 1.5], [-cr, -0.98]]); c.fill(); c.shadowBlur = 0;
    c.fillStyle = rad(c, 0, -0.98, 0, 0.3 + a.cast * 0.3, `rgba(92,255,217,${0.35 + a.cast * 0.5})`, 'rgba(92,255,217,0)'); ell(c, 0, -0.98, 0.3 + a.cast * 0.3, 0.3 + a.cast * 0.3); c.fill();
    for (let i = 0; i < 4; i++) { const an = t * 2.4 + (i * TAU) / 4; shine(c, Math.cos(an) * 0.26, -0.98 + Math.sin(an) * 0.2, 0.06); }
    c.restore();
    limb(c, [[0.24, -0.24], [0.5, mix(0.02, -0.2, Math.max(a.cast, a.joy))], handR], 0.19, '#4a22b8');
    c.fillStyle = '#7a4dff'; ell(c, handR[0], handR[1], 0.13, 0.13); c.fill(); c.fillStyle = '#ffe0d0'; ell(c, handR[0] + 0.01, handR[1] - 0.02, 0.08, 0.08); c.fill();
    // head
    c.save(); c.translate(0, -0.72); c.rotate(sway * 0.03 + a.cast * 0.06);
    c.fillStyle = lin(c, 0, -0.4, 0, 0.4, '#fff0e6', '#f8c8b4'); ell(c, 0, 0, 0.41, 0.38); c.fill(); c.strokeStyle = '#a86a5a'; c.lineWidth = 0.018; c.stroke();
    c.fillStyle = 'rgba(255,120,150,0.4)'; ell(c, -0.25, 0.12, 0.085, 0.05); c.fill(); ell(c, 0.25, 0.12, 0.085, 0.05); c.fill();
    for (const s of [-1, 1]) {
      const ex = s * 0.17, ey = 0.02;
      if (a.blink || a.joy > 0.65) { c.strokeStyle = dark; c.lineWidth = 0.035; c.lineCap = 'round'; c.beginPath(); c.moveTo(ex - 0.1, ey + (a.joy > 0.65 ? 0.03 : 0)); c.quadraticCurveTo(ex, ey + (a.joy > 0.65 ? -0.1 : 0.06), ex + 0.1, ey + (a.joy > 0.65 ? 0.03 : 0)); c.stroke(); continue; }
      const big = 1 + a.antic * 0.18 + a.hype * 0.1;
      c.save(); ell(c, ex, ey, 0.105 * big, 0.13 * big); c.fillStyle = '#fff'; c.fill(); c.clip();
      const ix = ex + a.look * 0.035;
      c.fillStyle = rad(c, ix, ey + 0.03, 0.01, 0.1, '#b8fff0', '#18b8a0', '#0a4a6a'); ell(c, ix, ey + 0.01, 0.09, 0.105); c.fill();
      c.fillStyle = dark; ell(c, ix, ey + 0.01, 0.045, 0.06); c.fill();
      c.fillStyle = '#fff'; ell(c, ix - 0.03, ey - 0.045, 0.03, 0.035); c.fill(); ell(c, ix + 0.035, ey + 0.05, 0.014, 0.014); c.fill();
      c.restore();
      c.strokeStyle = dark; c.lineWidth = 0.035; c.lineCap = 'round'; c.beginPath(); c.arc(ex, ey + 0.02, 0.125 * big, Math.PI * 1.12, Math.PI * 1.88); c.stroke();
      c.lineWidth = 0.02; c.beginPath(); c.moveTo(ex + s * 0.1, ey - 0.05); c.lineTo(ex + s * 0.16, ey - 0.1); c.stroke();
      limb(c, [[ex - 0.07, ey - 0.19 - a.antic * 0.03 + (s < 0 ? 0 : 0)], [ex + 0.07, ey - 0.19 - a.antic * 0.03]], 0.022, '#3a9a8e');
    }
    c.strokeStyle = '#8a4a3a'; c.lineWidth = 0.022; c.lineCap = 'round';
    if (a.antic > 0.5) { c.fillStyle = '#7a2a3a'; ell(c, 0, 0.23, 0.04, 0.05); c.fill(); }
    else if (a.joy > 0.4 || a.hype > 0.3) { c.fillStyle = '#7a2a3a'; c.beginPath(); c.moveTo(-0.11, 0.19); c.quadraticCurveTo(0, 0.36, 0.11, 0.19); c.closePath(); c.fill(); c.fillStyle = '#fff'; poly(c, [[0.04, 0.19], [0.085, 0.19], [0.06, 0.24]]); c.fill(); }
    else { c.beginPath(); c.moveTo(-0.08, 0.2); c.quadraticCurveTo(0, 0.25, 0.08, 0.2); c.stroke(); }
    // fringe and side locks
    c.fillStyle = hair; blob(c, [[-0.44, -0.04], [-0.4, -0.32], [0, -0.42], [0.4, -0.32], [0.44, -0.04], [0.32, -0.12], [0.18, -0.2], [0.04, -0.1], [-0.12, -0.22], [-0.3, -0.1]]); c.fill();
    c.strokeStyle = 'rgba(40,120,120,0.45)'; c.lineWidth = 0.015; c.stroke();
    for (const s of [-1, 1]) tube(c, sample([s * 0.4, -0.1], [s * 0.48, 0.1], [s * 0.44 + Math.sin(t * 1.7 + s) * 0.05, 0.3], [s * 0.4 + Math.sin(t * 2 + s) * 0.08, 0.5], 16), 0.07, 0.03, hair, null);
    // hat
    c.fillStyle = '#0c0424'; ell(c, 0, -0.3, 0.72, 0.17, -0.08); c.fill(); c.fillStyle = lin(c, 0, -0.45, 0, -0.2, '#4a1f9a', '#1c0a4a'); ell(c, 0, -0.32, 0.7, 0.15, -0.08); c.fill();
    const tip = [0.42 + Math.sin(t * 2) * 0.07 + a.hype * Math.sin(t * 12) * 0.08, -0.98 + Math.cos(t * 2) * 0.04];
    c.fillStyle = lin(c, -0.3, -1.1, 0.4, -0.3, '#6a3de8', '#3a1a9a', '#1c0a5a');
    c.beginPath(); c.moveTo(-0.36, -0.34); c.bezierCurveTo(-0.26, -0.7, -0.14, -1.0, 0.02, -1.12); c.quadraticCurveTo(0.26, -1.2, tip[0], tip[1]); c.quadraticCurveTo(0.26, -1.04, 0.16, -0.94); c.bezierCurveTo(0.26, -0.7, 0.32, -0.5, 0.36, -0.4); c.quadraticCurveTo(0, -0.26, -0.36, -0.34); c.fill();
    c.strokeStyle = dark; c.lineWidth = 0.022; c.stroke();
    c.fillStyle = '#eafffb'; ell(c, tip[0], tip[1], 0.05, 0.05); c.fill();
    c.fillStyle = '#18b8a0'; c.beginPath(); c.moveTo(-0.35, -0.38); c.quadraticCurveTo(0, -0.3, 0.35, -0.44); c.lineTo(0.31, -0.55); c.quadraticCurveTo(0, -0.42, -0.31, -0.5); c.closePath(); c.fill();
    c.save(); c.translate(0.02, -0.44); c.scale(0.1, 0.1); GLYPH.moon(c); c.restore();
    shine(c, -0.08, -0.74, 0.06); shine(c, 0.12, -0.62, 0.045);
    c.restore();
    // bat familiar
    const ba = t * 0.9, bx = Math.cos(ba) * 1.08, by = -0.95 + Math.sin(ba * 1.3) * 0.22, bf = Math.sin(t * 15) * 0.5;
    c.fillStyle = '#0c0424';
    for (const s of [-1, 1]) { c.beginPath(); c.moveTo(bx, by); c.quadraticCurveTo(bx + s * 0.12, by - 0.14 - bf * 0.1, bx + s * 0.26, by - 0.04 - bf * 0.14); c.quadraticCurveTo(bx + s * 0.2, by + 0.02, bx + s * 0.17, by + 0.07); c.quadraticCurveTo(bx + s * 0.1, by + 0.02, bx, by + 0.05); c.fill(); }
    ell(c, bx, by, 0.065, 0.075); c.fill(); poly(c, [[bx - 0.05, by - 0.05], [bx - 0.045, by - 0.13], [bx - 0.01, by - 0.065]]); c.fill(); poly(c, [[bx + 0.05, by - 0.05], [bx + 0.045, by - 0.13], [bx + 0.01, by - 0.065]]); c.fill();
    c.fillStyle = '#5cffd9'; ell(c, bx - 0.025, by - 0.01, 0.012, 0.012); c.fill(); ell(c, bx + 0.025, by - 0.01, 0.012, 0.012); c.fill();
  };
})();
