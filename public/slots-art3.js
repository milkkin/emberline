'use strict';
// Emberline slot art, set three: Glacier Throne (yeti king). Adds a sculpted reel frame and
// the 2x2 multiplier block used by tumbling slots.
(() => {
  const A = SlotArt, { lin, rad, rr, ell, star, poly, blob, limb, shine, mix, mix2, ICON, GLYPH, CHAR, SCENE, LIVE, THEMES } = A;
  const TAU = Math.PI * 2;
  A.FRAME = A.FRAME || {};
  const bez = (p0, p1, p2, p3, u) => { const v = 1 - u; return [v * v * v * p0[0] + 3 * v * v * u * p1[0] + 3 * v * u * u * p2[0] + u * u * u * p3[0], v * v * v * p0[1] + 3 * v * v * u * p1[1] + 3 * v * u * u * p2[1] + u * u * u * p3[1]]; };
  const sample = (p0, p1, p2, p3, n) => Array.from({ length: n }, (_, i) => bez(p0, p1, p2, p3, i / (n - 1)));
  function tube(c, pts, r0, r1, fill, outline) {
    const n = pts.length;
    if (outline) { c.fillStyle = outline; pts.forEach((p, i) => { const r = mix(r0, r1, i / (n - 1)) + 0.025; ell(c, p[0], p[1], r, r); c.fill(); }); }
    c.fillStyle = fill; pts.forEach((p, i) => { const r = mix(r0, r1, i / (n - 1)); ell(c, p[0], p[1], r, r); c.fill(); });
  }

  GLYPH.rune = (c) => {
    c.strokeStyle = lin(c, 0, -0.9, 0, 0.9, '#ffffff', '#9fe8ff', '#3a8dff'); c.lineWidth = 0.17; c.lineCap = 'round'; c.lineJoin = 'round';
    c.beginPath(); c.moveTo(0, 0.85); c.lineTo(0, -0.85); c.moveTo(-0.55, -0.6); c.lineTo(0, -0.05); c.lineTo(0.55, -0.6); c.moveTo(-0.3, 0.5); c.lineTo(0.3, 0.5); c.stroke();
  };

  // ---------- premium symbols ----------
  ICON.flake = (c) => {
    c.fillStyle = rad(c, 0, 0, 0.05, 0.95, 'rgba(159,232,255,0.5)', 'rgba(159,232,255,0)'); c.fillRect(-1, -1, 2, 2);
    c.strokeStyle = lin(c, 0, -0.9, 0, 0.9, '#ffffff', '#9fe8ff', '#5a9dff'); c.lineCap = 'round'; c.shadowColor = '#5ab8ff'; c.shadowBlur = 8;
    for (let i = 0; i < 6; i++) {
      c.save(); c.rotate((i * TAU) / 6);
      c.lineWidth = 0.11; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -0.86); c.stroke();
      c.lineWidth = 0.075; c.beginPath(); c.moveTo(0, -0.5); c.lineTo(0.22, -0.7); c.moveTo(0, -0.5); c.lineTo(-0.22, -0.7); c.moveTo(0, -0.26); c.lineTo(0.15, -0.4); c.moveTo(0, -0.26); c.lineTo(-0.15, -0.4); c.stroke();
      c.restore();
    }
    c.shadowBlur = 0; c.fillStyle = '#ffffff'; poly(c, [[0, -0.16], [0.14, 0], [0, 0.16], [-0.14, 0]]); c.fill();
  };
  ICON.axe = (c) => {
    c.rotate(0.5);
    c.strokeStyle = lin(c, -0.05, 0, 0.05, 0, '#9a6a3c', '#5a3414'); c.lineWidth = 0.12; c.lineCap = 'round'; c.beginPath(); c.moveTo(0, 0.92); c.lineTo(0, -0.8); c.stroke();
    c.strokeStyle = '#ffd24a'; c.lineWidth = 0.14; for (const y of [0.55, 0.3]) { c.beginPath(); c.moveTo(-0.01, y); c.lineTo(0.01, y + 0.08); c.stroke(); }
    for (const s of [-1, 1]) {
      c.fillStyle = lin(c, 0, -0.9, s * 0.8, 0, '#ffffff', '#b8e6ff', '#3a7ad6');
      c.beginPath(); c.moveTo(s * 0.05, -0.72); c.quadraticCurveTo(s * 0.5, -0.98, s * 0.84, -0.7); c.quadraticCurveTo(s * 0.62, -0.38, s * 0.84, -0.04); c.quadraticCurveTo(s * 0.45, 0.14, s * 0.05, -0.12); c.closePath(); c.fill();
      c.strokeStyle = '#12244a'; c.lineWidth = 0.04; c.lineJoin = 'round'; c.stroke();
      c.strokeStyle = 'rgba(255,255,255,0.8)'; c.lineWidth = 0.03; c.beginPath(); c.moveTo(s * 0.76, -0.62); c.quadraticCurveTo(s * 0.58, -0.38, s * 0.76, -0.12); c.stroke();
    }
    c.fillStyle = '#ffd24a'; ell(c, 0, -0.42, 0.13, 0.13); c.fill(); c.fillStyle = '#5ab8ff'; ell(c, 0, -0.42, 0.06, 0.06); c.fill();
  };
  ICON.helm = (c) => {
    for (const s of [-1, 1]) { c.fillStyle = lin(c, 0, -0.9, 0, 0, '#ffffff', '#e6d6b8', '#a8845a'); c.beginPath(); c.moveTo(s * 0.5, -0.26); c.bezierCurveTo(s * 0.98, -0.3, s * 1.0, -0.8, s * 0.72, -0.98); c.bezierCurveTo(s * 0.8, -0.66, s * 0.66, -0.5, s * 0.42, -0.5); c.closePath(); c.fill(); c.strokeStyle = '#5a3a1c'; c.lineWidth = 0.03; c.stroke(); }
    c.fillStyle = lin(c, -0.6, -0.7, 0.6, 0.6, '#e6f4ff', '#8fb0d6', '#3a4a7a');
    c.beginPath(); c.moveTo(-0.64, 0.5); c.bezierCurveTo(-0.72, -0.5, -0.3, -0.82, 0, -0.82); c.bezierCurveTo(0.3, -0.82, 0.72, -0.5, 0.64, 0.5); c.closePath(); c.fill();
    c.strokeStyle = '#12244a'; c.lineWidth = 0.045; c.stroke();
    c.fillStyle = lin(c, 0, -0.9, 0, 0.9, '#fff2a8', '#e3a11c'); c.fillRect(-0.07, -0.84, 0.14, 1.5); rr(c, -0.7, 0.36, 1.4, 0.2, 0.06); c.fill();
    c.fillStyle = '#12244a'; for (const s of [-1, 1]) { c.beginPath(); c.moveTo(s * 0.12, 0.0); c.quadraticCurveTo(s * 0.34, -0.14, s * 0.5, 0.02); c.quadraticCurveTo(s * 0.32, 0.2, s * 0.12, 0.14); c.fill(); }
    c.fillStyle = '#7af7ff'; for (const s of [-1, 1]) { ell(c, s * 0.3, 0.05, 0.06, 0.035); c.fill(); }
    c.fillStyle = 'rgba(255,255,255,0.5)'; ell(c, -0.36, -0.44, 0.08, 0.2, 0.5); c.fill(); shine(c, 0.34, -0.5, 0.14);
  };
  ICON.icecrown = (c) => {
    c.fillStyle = rad(c, 0, 0, 0.1, 1, 'rgba(120,200,255,0.45)', 'rgba(120,200,255,0)'); c.fillRect(-1, -1, 2, 2);
    const pts = [[-0.8, 0.5], [-0.86, -0.3], [-0.5, 0.06], [-0.38, -0.66], [-0.16, -0.02], [0, -0.92], [0.16, -0.02], [0.38, -0.66], [0.5, 0.06], [0.86, -0.3], [0.8, 0.5]];
    c.fillStyle = lin(c, 0, -0.9, 0, 0.6, '#ffffff', '#b8ecff', '#3a8dff'); poly(c, pts); c.fill();
    c.fillStyle = 'rgba(20,50,140,0.25)'; poly(c, [[0, -0.92], [0.16, -0.02], [0.38, -0.66], [0.5, 0.06], [0.86, -0.3], [0.8, 0.5], [0, 0.5]]); c.fill();
    c.strokeStyle = '#eafcff'; c.lineWidth = 0.04; c.lineJoin = 'round'; poly(c, pts); c.stroke();
    c.fillStyle = lin(c, 0, 0.4, 0, 0.8, '#fff2a8', '#e3a11c', '#8a4d08'); rr(c, -0.84, 0.42, 1.68, 0.3, 0.08); c.fill(); c.strokeStyle = '#5a2f05'; c.lineWidth = 0.035; c.stroke();
    for (const [x, col] of [[-0.5, '#ff5a8a'], [0, '#7af7ff'], [0.5, '#b98aff']]) { c.fillStyle = col; poly(c, [[x, 0.48], [x + 0.09, 0.57], [x, 0.66], [x - 0.09, 0.57]]); c.fill(); }
    shine(c, -0.36, -0.4, 0.16); shine(c, 0.14, -0.6, 0.12);
  };

  THEMES.yeti = {
    tag: 'Tumbling wins and multiplier blocks', bg: ['#020818', '#0a2a5c', '#2f8fc8'], accent: '#9fe8ff', accent2: '#5a8dff', frame: ['#eafcff', '#5ab8ff'],
    lows: ['#9fe8ff', '#b8a8ff', '#7dffd9', '#ffb8e0', '#fff2a8'], icons: ['flake', 'axe', 'helm', 'icecrown'], glyph: 'rune', wild: ['#eafcff', '#3a8dff', '#0a1f6e'], ambient: 'snow', chScale: 1.08,
    quotes: { wild: ['RUNE SMASH!', 'Catch!', 'Frozen solid!'], win: ['Hrah!', 'The mountain provides.', 'Crunchy!'], big: ['AVALANCHE!', 'THE THRONE ROARS!'], bonus: ['Free spins! The ice wakes.'], tease: ['Brrr. Close.', 'The peak is patient.'], idle: ['My throne is cold. My reels are hot.', 'Spin, small warm one.'] },
  };

  // ---------- background ----------
  SCENE.yeti = (c, w, h) => {
    for (let i = 0; i < 120; i++) { const s = 0.4 + ((i * 0.33) % 1) * 1.2; c.fillStyle = `rgba(255,255,255,${0.25 + ((i * 0.17) % 1) * 0.6})`; c.fillRect(((i * 0.618) % 1) * w, ((i * 0.755) % 1) * h * 0.5, s, s); }
    const peaks = (base, amp, seed, c0, c1) => {
      const pts = []; for (let i = 0; i <= 14; i++) pts.push([(i / 14) * w, h * base - (i % 2 ? amp * (0.55 + ((i * seed) % 1) * 0.45) : amp * 0.1 * ((i * seed * 3) % 1)) * h]);
      c.fillStyle = lin(c, 0, h * (base - amp), 0, h, c0, c1); c.beginPath(); c.moveTo(0, h); pts.forEach((p) => c.lineTo(p[0], p[1])); c.lineTo(w, h); c.fill();
      c.fillStyle = 'rgba(235,250,255,0.85)'; pts.forEach((p, i) => { if (i % 2) { const s = amp * h * 0.28; poly(c, [[p[0], p[1]], [p[0] + s * 0.7, p[1] + s], [p[0] + s * 0.2, p[1] + s * 0.7], [p[0] - s * 0.1, p[1] + s * 1.05], [p[0] - s * 0.6, p[1] + s * 0.9]]); c.fill(); } });
    };
    peaks(0.74, 0.42, 0.37, '#3a6aa8', '#0c2450'); peaks(0.86, 0.3, 0.61, '#1c3f7a', '#06142e');
    c.fillStyle = lin(c, 0, h * 0.86, 0, h, '#cfeaff', '#5a8dc8'); c.beginPath(); c.moveTo(0, h); for (let i = 0; i <= 30; i++) c.lineTo((i / 30) * w, h * 0.9 + Math.sin(i * 0.9) * h * 0.012); c.lineTo(w, h); c.fill();
  };
  LIVE.yeti = (c, w, h, t, k) => {
    c.save(); c.globalCompositeOperation = 'lighter';
    for (let b = 0; b < 3; b++) {
      const col = ['90,255,200', '120,170,255', '200,130,255'][b];
      c.beginPath();
      for (let i = 0; i <= 40; i++) { const x = (i / 40) * w, y = h * (0.1 + b * 0.05) + Math.sin(i * 0.32 + t * (0.5 + b * 0.15) + b * 2) * h * 0.035 + Math.sin(i * 0.11 + t * 0.2) * h * 0.03; c[i ? 'lineTo' : 'moveTo'](x, y); }
      for (let i = 40; i >= 0; i--) { const x = (i / 40) * w, y = h * (0.3 + b * 0.05) + Math.sin(i * 0.27 + t * 0.4 + b) * h * 0.03; c.lineTo(x, y); }
      c.fillStyle = lin(c, 0, h * 0.08, 0, h * 0.38, `rgba(${col},${0.3 + k * 0.2})`, `rgba(${col},0)`); c.fill();
    }
    c.restore();
  };

  // ---------- sculpted reel frame ----------
  A.FRAME.yeti = (c, x, y, w, h, cell, t, glow) => {
    const pw = Math.min(cell * 0.44, x - 3), lh = cell * 0.4, stone = (x0, x1) => lin(c, x0, 0, x1, 0, '#8fb0d6', '#c9e2f7', '#5a7aa8');
    const pulse = 0.55 + 0.45 * Math.sin(t * 2.4), rune = `rgba(159,232,255,${0.5 + 0.5 * pulse * Math.min(1, 0.6 + glow)})`;
    if (pw > 7) {
      for (const s of [0, 1]) {
        const px = s ? x + w : x - pw;
        c.fillStyle = stone(px, px + pw); c.fillRect(px, y - lh * 0.2, pw, h + lh * 0.5);
        c.fillStyle = 'rgba(10,30,70,0.25)'; for (let k = 1; k < 4; k++) c.fillRect(px + (pw * k) / 4 - 1, y, 2, h);
        c.fillStyle = '#3a5a8a'; c.fillRect(px - pw * 0.12, y + h - cell * 0.1, pw * 1.24, cell * 0.3); c.fillRect(px - pw * 0.12, y - lh * 0.3, pw * 1.24, cell * 0.16);
        c.save(); c.shadowColor = '#5ab8ff'; c.shadowBlur = 10; c.strokeStyle = rune; c.lineWidth = Math.max(1.5, pw * 0.09); c.lineCap = 'round';
        for (let k = 0; k < 3; k++) { const cy = y + h * (0.25 + k * 0.25), r = pw * 0.26; c.beginPath(); c.moveTo(px + pw / 2, cy - r); c.lineTo(px + pw / 2, cy + r); c.moveTo(px + pw / 2 - r * 0.8, cy - r * 0.5); c.lineTo(px + pw / 2, cy + (k % 2 ? -1 : 1) * r * 0.2); c.lineTo(px + pw / 2 + r * 0.8, cy - r * 0.5); c.stroke(); }
        c.restore();
        // brazier with cold fire
        const bx = px + pw / 2, by = y - lh * 0.3;
        c.fillStyle = '#28385a'; poly(c, [[bx - pw * 0.55, by - pw * 0.5], [bx + pw * 0.55, by - pw * 0.5], [bx + pw * 0.3, by], [bx - pw * 0.3, by]]); c.fill();
        c.save(); c.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 7; i++) { const p = (t * 1.3 + i / 7 + s * 0.4) % 1, fx = bx + Math.sin(t * 5 + i * 2 + s) * pw * 0.14 * (1 - p), fy = by - pw * 0.5 - p * pw * 1.7, r = pw * (0.42 - p * 0.3); c.fillStyle = rad(c, fx, fy, 0, r, `rgba(220,250,255,${0.8 * (1 - p)})`, `rgba(60,140,255,${0.5 * (1 - p)})`, 'rgba(40,80,255,0)'); ell(c, fx, fy, r, r); c.fill(); }
        c.restore();
      }
    }
    const lx = x - Math.max(pw, 0) * 1.1, lw = w + Math.max(pw, 0) * 2.2;
    c.fillStyle = lin(c, 0, y - lh, 0, y, '#d6ebfb', '#8fb0d6', '#4a6a9a'); rr(c, lx, y - lh, lw, lh, cell * 0.08); c.fill();
    c.strokeStyle = '#12244a'; c.lineWidth = 2; c.stroke();
    c.fillStyle = '#ffffff'; c.beginPath(); c.moveTo(lx, y - lh + 2);
    for (let i = 0; i <= 24; i++) c.lineTo(lx + (i / 24) * lw, y - lh - Math.abs(Math.sin(i * 1.3)) * cell * 0.07 - cell * 0.03);
    c.lineTo(lx + lw, y - lh + cell * 0.06); c.lineTo(lx, y - lh + cell * 0.06); c.fill();
    c.fillStyle = lin(c, 0, y, 0, y + cell * 0.3, 'rgba(235,250,255,0.95)', 'rgba(140,200,255,0.55)');
    for (let i = 0; i < 26; i++) { const ix = x + ((i + 0.5) / 26) * w, il = cell * (0.07 + ((i * 0.618) % 1) * 0.2), iw = cell * 0.05; poly(c, [[ix - iw, y], [ix + iw, y], [ix, y + il]]); c.fill(); }
    c.fillStyle = lin(c, 0, y + h, 0, y + h + cell * 0.2, '#c9e2f7', '#5a7aa8'); rr(c, lx, y + h, lw, cell * 0.2, cell * 0.06); c.fill(); c.strokeStyle = '#12244a'; c.lineWidth = 2; c.stroke();
    const cx = x + w / 2, cy = y - lh * 0.55, cr = cell * 0.26;
    c.save(); c.shadowColor = '#5ab8ff'; c.shadowBlur = 14 + glow * 14; c.fillStyle = lin(c, 0, cy - cr, 0, cy + cr, '#ffffff', '#7ad0ff', '#2a5ad6'); poly(c, [[cx, cy - cr * 1.25], [cx + cr, cy], [cx, cy + cr * 1.25], [cx - cr, cy]]); c.fill(); c.restore();
    c.fillStyle = 'rgba(255,255,255,0.6)'; poly(c, [[cx, cy - cr * 1.25], [cx + cr * 0.4, cy - cr * 0.2], [cx, cy], [cx - cr * 0.4, cy - cr * 0.2]]); c.fill();
  };

  // ---------- 2x2 multiplier block ----------
  A.drawBlock = (c, th, x, y, size, t, mult, land, pulse) => {
    const pop = land >= 1 ? 1 + Math.max(0, 1 - pulse * 3) * 0.14 : 0.8, m = size * 0.04;
    c.save(); c.translate(x + size / 2, y + size / 2); c.scale(pop, pop); c.rotate(land < 1 ? (1 - land) * -1.4 : 0);
    const hs = size / 2 - m;
    c.shadowColor = th.wild[1]; c.shadowBlur = size * 0.2;
    c.fillStyle = lin(c, -hs, -hs, hs, hs, th.wild[0], th.wild[1], th.wild[2]); rr(c, -hs, -hs, hs * 2, hs * 2, size * 0.1); c.fill(); c.shadowBlur = 0;
    c.save(); c.clip(); c.globalCompositeOperation = 'lighter'; c.strokeStyle = 'rgba(255,255,255,0.16)'; c.lineWidth = size * 0.09;
    const gap = size * 0.3, off = (t * size * 0.5) % gap;
    for (let d = -size * 2; d < size * 2; d += gap) { c.beginPath(); c.moveTo(-hs, d + off + hs); c.lineTo(hs, d + off - hs); c.stroke(); }
    c.fillStyle = 'rgba(255,255,255,0.22)'; poly(c, [[-hs, -hs], [hs, -hs], [hs * 0.3, -hs * 0.3], [-hs, hs * 0.2]]); c.fill();
    c.restore();
    c.lineWidth = size * 0.035; c.strokeStyle = '#ffffff'; rr(c, -hs, -hs, hs * 2, hs * 2, size * 0.1); c.stroke();
    c.lineWidth = size * 0.012; c.strokeStyle = 'rgba(255,255,255,0.55)'; rr(c, -hs * 0.86, -hs * 0.86, hs * 1.72, hs * 1.72, size * 0.07); c.stroke();
    c.save(); c.globalAlpha = 0.28; c.translate(0, -hs * 0.05); c.scale(hs * 0.7, hs * 0.7); GLYPH[th.glyph](c); c.restore();
    const text = '×' + mult, fs = size * (text.length > 3 ? 0.36 : 0.46) * (1 + Math.sin(t * 5) * 0.03);
    c.font = `900 ${fs}px ${A.FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
    c.lineWidth = fs * 0.2; c.strokeStyle = 'rgba(6,14,50,0.9)'; c.strokeText(text, 0, fs * 0.04);
    c.fillStyle = lin(c, 0, -fs / 2, 0, fs / 2, '#ffffff', '#fff2a8', '#ffb347'); c.fillText(text, 0, fs * 0.04);
    c.restore();
  };

  // ---------- Brumm, the yeti king ----------
  CHAR.yeti = (c, t, a) => {
    const fur = lin(c, 0, -1.3, 0, 1.3, '#ffffff', '#e4f4ff', '#9cc8ea'), dark = '#12244a', breathe = Math.sin(t * 1.5);
    c.fillStyle = rad(c, 0, 0, 0.1, 2, `rgba(120,200,255,${0.2 + a.joy * 0.2 + a.cast * 0.25})`, 'rgba(60,120,255,0)'); c.fillRect(-2.4, -2.4, 4.8, 4.8);
    const stomp = a.hype * Math.abs(Math.sin(t * 7)) * 0.1;
    c.fillStyle = `rgba(4,12,40,${0.4 - stomp})`; ell(c, 0, 1.34, 0.95 - stomp, 0.13); c.fill();
    c.translate(0, -stomp + breathe * 0.012);
    for (const s of [-1, 1]) {
      tube(c, sample([s * 0.32, 0.6], [s * 0.42, 0.82], [s * 0.4, 1.0], [s * 0.38, 1.14], 6), 0.25, 0.21, fur, dark);
      c.fillStyle = dark; ell(c, s * 0.46, 1.25, 0.33, 0.14); c.fill(); c.fillStyle = fur; ell(c, s * 0.46, 1.24, 0.3, 0.115); c.fill();
      c.fillStyle = '#2a3f73'; for (let k = 0; k < 3; k++) { ell(c, s * (0.3 + k * 0.16), 1.3, 0.055, 0.04); c.fill(); }
    }
    c.save(); c.scale(1 + breathe * 0.014, 1 - breathe * 0.008);
    c.fillStyle = fur; blob(c, [[-0.78, -0.36], [0, -0.62], [0.78, -0.36], [0.88, 0.35], [0.56, 0.96], [0, 1.03], [-0.56, 0.96], [-0.88, 0.35]]); c.fill(); c.strokeStyle = dark; c.lineWidth = 0.035; c.stroke();
    c.fillStyle = 'rgba(160,210,245,0.55)'; ell(c, 0, 0.38, 0.46, 0.5); c.fill();
    c.strokeStyle = 'rgba(110,160,215,0.6)'; c.lineWidth = 0.022; c.lineCap = 'round'; c.beginPath();
    for (let row = 0; row < 7; row++) for (let k = -3; k <= 3; k++) { const x = k * 0.21 + (row % 2) * 0.1, y = -0.28 + row * 0.19; if (Math.abs(x) > 0.74 - Math.abs(row - 2.5) * 0.04) continue; c.moveTo(x - 0.06, y); c.quadraticCurveTo(x, y + 0.09, x + 0.06, y); }
    c.stroke(); c.restore();
    // arms
    const beat = Math.sin(t * 11);
    for (const s of [-1, 1]) {
      let hand = [s * 0.98, 0.55 + Math.sin(t * 1.5 + s) * 0.03];
      hand = mix2(hand, [s * 1.0, -0.5 + Math.sin(t * 10 + s * 1.5) * 0.2], a.joy);
      hand = mix2(hand, s * beat > 0 ? [s * 0.28, 0.02] : [s * 0.95, -0.25], a.hype);
      hand = mix2(hand, [s * 0.34, -1.5], Math.min(1, a.cast * 1.3));
      const sh = [s * 0.74, -0.26], el = [mix(sh[0], hand[0], 0.5) + s * 0.34, mix(sh[1], hand[1], 0.5) + 0.05];
      tube(c, sample(sh, el, el, hand, 10), 0.235, 0.2, fur, dark);
      c.fillStyle = dark; ell(c, hand[0], hand[1], 0.23, 0.23); c.fill(); c.fillStyle = '#3a5a96'; ell(c, hand[0], hand[1], 0.195, 0.195); c.fill();
      c.fillStyle = '#eafcff'; for (let k = -1; k <= 1; k++) { const an = Math.atan2(hand[1] - el[1], hand[0] - el[0]) + k * 0.5; poly(c, [[hand[0] + Math.cos(an - 0.2) * 0.17, hand[1] + Math.sin(an - 0.2) * 0.17], [hand[0] + Math.cos(an) * 0.3, hand[1] + Math.sin(an) * 0.3], [hand[0] + Math.cos(an + 0.2) * 0.17, hand[1] + Math.sin(an + 0.2) * 0.17]]); c.fill(); }
    }
    if (a.cast > 0.08) {
      const s = 0.36 * Math.min(1, a.cast * 1.2);
      c.save(); c.translate(0, -1.56); c.rotate(t * 3); c.shadowColor = '#5ab8ff'; c.shadowBlur = 24;
      c.fillStyle = lin(c, -s, -s, s, s, '#ffffff', '#7ad0ff', '#2a5ad6'); rr(c, -s / 2, -s / 2, s, s, s * 0.14); c.fill(); c.shadowBlur = 0;
      c.strokeStyle = '#fff'; c.lineWidth = 0.02; c.stroke(); c.scale(s * 0.32, s * 0.32); GLYPH.rune(c); c.restore();
    }
    // head
    for (const s of [-1, 1]) {
      c.fillStyle = lin(c, 0, -1.5, 0, -0.5, '#ffffff', '#cfe6fa', '#6f96c8');
      c.beginPath(); c.moveTo(s * 0.4, -1.04); c.bezierCurveTo(s * 0.92, -1.44, s * 1.22, -0.84, s * 0.86, -0.52); c.bezierCurveTo(s * 0.98, -0.82, s * 0.82, -1.06, s * 0.5, -0.86); c.closePath(); c.fill(); c.strokeStyle = dark; c.lineWidth = 0.028; c.stroke();
      c.strokeStyle = 'rgba(18,36,74,0.4)'; c.lineWidth = 0.02; for (const u of [0.3, 0.5, 0.7]) { const p = bez([s * 0.4, -1.04], [s * 0.92, -1.44], [s * 1.22, -0.84], [s * 0.86, -0.52], u), q = bez([s * 0.5, -0.86], [s * 0.82, -1.06], [s * 0.98, -0.82], [s * 0.86, -0.52], u); c.beginPath(); c.moveTo(p[0], p[1]); c.lineTo(q[0], q[1]); c.stroke(); }
    }
    c.save(); c.translate(0, -0.02 + a.cast * -0.04); c.rotate(Math.sin(t * 0.9) * 0.03);
    c.fillStyle = fur; blob(c, [[-0.58, -0.6], [-0.48, -1.1], [0, -1.27], [0.48, -1.1], [0.58, -0.6], [0.38, -0.28], [0, -0.14], [-0.38, -0.28]]); c.fill(); c.strokeStyle = dark; c.lineWidth = 0.032; c.stroke();
    c.fillStyle = lin(c, 0, -1.05, 0, -0.36, '#6a90d6', '#2a4480'); blob(c, [[-0.35, -0.7], [-0.31, -0.98], [0, -1.05], [0.31, -0.98], [0.35, -0.7], [0.23, -0.42], [0, -0.35], [-0.23, -0.42]]); c.fill();
    for (const s of [-1, 1]) {
      c.save(); c.translate(s * 0.16, -0.77); c.scale(1, a.blink ? 0.12 : 1);
      c.fillStyle = '#eaffff'; c.shadowColor = '#7af7ff'; c.shadowBlur = 12 + a.hype * 10; ell(c, 0, 0, 0.078, 0.056 + a.antic * 0.02 + a.hype * 0.012); c.fill(); c.shadowBlur = 0;
      c.fillStyle = dark; ell(c, a.look * 0.025, 0, 0.026, 0.036); c.fill(); c.restore();
      limb(c, [[s * 0.3, -0.92 - a.joy * 0.04 + a.hype * 0.03], [s * 0.05, -0.84 + a.hype * 0.04]], 0.06, dark);
    }
    c.fillStyle = dark; poly(c, [[-0.09, -0.66], [0.09, -0.66], [0, -0.58]]); c.fill();
    const open = 0.025 + a.joy * 0.07 + a.hype * 0.12 + a.cast * 0.07 + a.antic * 0.04;
    c.fillStyle = '#0c1836'; ell(c, 0, -0.49, 0.2, open + 0.012); c.fill();
    c.fillStyle = '#ffffff'; for (const s of [-1, 1]) { poly(c, [[s * 0.1, -0.47 + open], [s * 0.14, -0.6 - open * 0.2], [s * 0.18, -0.47 + open]]); c.fill(); }
    c.fillStyle = fur; poly(c, [[-0.22, -0.3], [-0.1, -0.1], [0, -0.24], [0.1, -0.1], [0.22, -0.3]]); c.fill();
    for (let i = 0; i < 5; i++) { const d = i - 2, x = d * 0.17, y = -1.4 - (1 - Math.abs(d) * 0.32) * 0.16 + Math.sin(t * 2 + i) * 0.025, hh = 0.2 - Math.abs(d) * 0.035; c.save(); c.shadowColor = '#5ab8ff'; c.shadowBlur = 10; c.fillStyle = lin(c, 0, y - hh, 0, y + hh, '#ffffff', '#7ad0ff', '#3a6ad6'); poly(c, [[x, y - hh], [x + 0.055, y], [x, y + hh * 0.7], [x - 0.055, y]]); c.fill(); c.restore(); }
    const p = (t * 0.3) % 1;
    if (p < 0.6 && a.cast < 0.2) for (let i = 0; i < 4; i++) { const u = p / 0.6 + i * 0.1; c.fillStyle = `rgba(220,245,255,${Math.max(0, 0.4 * (1 - u))})`; ell(c, 0.1 + u * 0.5, -0.46 + u * 0.12, 0.05 + u * 0.12, 0.04 + u * 0.09); c.fill(); }
    c.restore();
    for (let i = 0; i < 6; i++) if (Math.sin(t * 2.2 + i * 2.1) > 0.6) shine(c, -0.7 + ((i * 0.618) % 1) * 1.4, -0.3 + ((i * 0.37) % 1) * 1.0, 0.06);
  };
})();
