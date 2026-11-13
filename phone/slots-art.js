'use strict';
// Emberline slot art. Everything is drawn procedurally on canvas: no image assets.
const SlotArt = (() => {
  const TAU = Math.PI * 2;
  const FONT = 'Impact, "Arial Black", "Trebuchet MS", sans-serif';
  const mix = (a, b, t) => a + (b - a) * t;
  const mix2 = (p, q, t) => [mix(p[0], q[0], t), mix(p[1], q[1], t)];

  // ---------- helpers ----------
  function stops(g, cols) { cols.forEach((c, i) => g.addColorStop(cols.length === 1 ? 0 : i / (cols.length - 1), c)); return g; }
  const lin = (c, x0, y0, x1, y1, ...cols) => stops(c.createLinearGradient(x0, y0, x1, y1), cols);
  const rad = (c, x, y, r0, r1, ...cols) => stops(c.createRadialGradient(x, y, r0, x, y, r1), cols);
  function rr(c, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }
  function poly(c, pts) { c.beginPath(); pts.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.closePath(); }
  function blob(c, pts) {
    const n = pts.length;
    c.beginPath();
    for (let i = 0; i <= n; i++) {
      const p = pts[i % n], q = pts[(i + 1) % n], mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2;
      if (i === 0) c.moveTo(mx, my); else c.quadraticCurveTo(p[0], p[1], mx, my);
    }
    c.closePath();
  }
  function star(c, x, y, n, R, r, rot = -Math.PI / 2) {
    c.beginPath();
    for (let i = 0; i < n * 2; i++) {
      const a = rot + (i * Math.PI) / n, d = i % 2 ? r : R;
      c[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * d, y + Math.sin(a) * d);
    }
    c.closePath();
  }
  function ell(c, x, y, rx, ry, rot = 0) { c.beginPath(); c.ellipse(x, y, Math.abs(rx), Math.abs(ry), rot, 0, TAU); }
  function limb(c, pts, w, col) {
    c.strokeStyle = col; c.lineWidth = w; c.lineCap = 'round'; c.lineJoin = 'round';
    c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
    if (pts.length === 3) c.quadraticCurveTo(pts[1][0], pts[1][1], pts[2][0], pts[2][1]); else c.lineTo(pts[1][0], pts[1][1]);
    c.stroke();
  }
  function shine(c, x, y, r) { c.fillStyle = 'rgba(255,255,255,0.9)'; star(c, x, y, 4, r, r * 0.22, 0); c.fill(); }
  function eye(c, x, y, rx, ry, a, iris, pupil = 1) {
    c.save(); c.translate(x, y); c.scale(1, a.blink ? 0.1 : 1);
    c.fillStyle = '#fff'; ell(c, 0, 0, rx, ry); c.fill();
    c.save(); c.clip();
    c.fillStyle = iris; ell(c, a.look * rx * 0.3, 0, rx * 0.66, rx * 0.66); c.fill();
    c.fillStyle = '#12091c'; ell(c, a.look * rx * 0.36, 0, rx * 0.36 * pupil, rx * 0.36 * pupil); c.fill();
    c.fillStyle = '#fff'; ell(c, a.look * rx * 0.3 - rx * 0.22, -ry * 0.32, rx * 0.15, rx * 0.15); c.fill();
    c.restore();
    c.lineWidth = rx * 0.16; c.strokeStyle = '#12091c'; ell(c, 0, 0, rx, ry); c.stroke();
    c.restore();
  }

  // ---------- theme glyphs (scatter emblem and wild-reel crest) ----------
  const GLYPH = {
    flame(c) {
      c.fillStyle = lin(c, 0, -0.9, 0, 0.8, '#fff3a0', '#ff9a1f', '#e0301a');
      c.beginPath(); c.moveTo(0, -0.9);
      c.bezierCurveTo(0.6, -0.3, 0.62, 0.25, 0.32, 0.6); c.bezierCurveTo(0.15, 0.82, -0.15, 0.82, -0.32, 0.6);
      c.bezierCurveTo(-0.62, 0.25, -0.34, -0.15, -0.18, -0.45); c.bezierCurveTo(-0.1, -0.2, 0.02, -0.2, 0.02, -0.34);
      c.bezierCurveTo(0.1, -0.55, -0.06, -0.72, 0, -0.9); c.fill();
      c.fillStyle = '#fff6c9'; c.beginPath(); c.moveTo(0.02, 0); c.bezierCurveTo(0.3, 0.25, 0.2, 0.62, 0, 0.62); c.bezierCurveTo(-0.22, 0.62, -0.26, 0.3, 0.02, 0); c.fill();
    },
    torii(c) {
      c.fillStyle = lin(c, 0, -0.9, 0, 0.9, '#ff8fb1', '#ff2d6a', '#a30f45');
      c.beginPath(); c.moveTo(-0.92, -0.86); c.quadraticCurveTo(0, -0.66, 0.92, -0.86); c.lineTo(0.84, -0.6); c.quadraticCurveTo(0, -0.44, -0.84, -0.6); c.closePath(); c.fill();
      c.fillRect(-0.66, -0.36, 1.32, 0.13); c.fillRect(-0.52, -0.5, 0.15, 1.35); c.fillRect(0.37, -0.5, 0.15, 1.35); c.fillRect(-0.06, -0.5, 0.12, 0.16);
    },
    whirl(c) {
      c.strokeStyle = lin(c, -0.8, -0.8, 0.8, 0.8, '#d6fff6', '#3ff2d0', '#2a7fd6'); c.lineWidth = 0.15; c.lineCap = 'round';
      c.beginPath();
      for (let a = 0; a <= 4.4 * Math.PI; a += 0.15) { const r = 0.06 + a * 0.057; c[a ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r); }
      c.stroke();
    },
    galaxy(c) {
      c.lineCap = 'round';
      for (let arm = 0; arm < 2; arm++) {
        c.strokeStyle = arm ? '#ffa8f0' : '#9fd0ff'; c.lineWidth = 0.13;
        c.beginPath();
        for (let a = 0; a <= 3.6; a += 0.12) { const r = 0.1 + a * 0.22, ang = a + arm * Math.PI; c[a ? 'lineTo' : 'moveTo'](Math.cos(ang) * r, Math.sin(ang) * r * 0.82); }
        c.stroke();
      }
      c.fillStyle = rad(c, 0, 0, 0, 0.34, '#ffffff', '#ffe9a8', 'rgba(255,200,120,0)'); ell(c, 0, 0, 0.34, 0.34); c.fill();
    },
    bolt(c) {
      c.fillStyle = lin(c, 0, -0.95, 0, 0.95, '#ffffff', '#ffe84a', '#ff9a1f');
      poly(c, [[0.2, -0.95], [-0.52, 0.12], [-0.06, 0.12], [-0.26, 0.95], [0.56, -0.22], [0.08, -0.22], [0.46, -0.95]]); c.fill();
      c.strokeStyle = '#a34a00'; c.lineWidth = 0.05; c.lineJoin = 'round'; c.stroke();
    },
  };

  // ---------- premium symbol icons, drawn inside the box [-1, 1] ----------
  const ICON = {
    coin(c) {
      c.fillStyle = rad(c, -0.25, -0.3, 0.05, 1.1, '#fff6c2', '#f7c23c', '#a8620e'); ell(c, 0, 0, 0.8, 0.8); c.fill();
      c.lineWidth = 0.07; c.strokeStyle = '#8a4d08'; c.stroke();
      c.lineWidth = 0.04; c.strokeStyle = '#ffe9a0'; ell(c, 0, 0, 0.62, 0.62); c.stroke();
      c.fillStyle = lin(c, 0, -0.4, 0, 0.4, '#fffbe0', '#e59a17'); star(c, 0, 0.03, 5, 0.42, 0.18); c.fill();
      c.strokeStyle = '#9a5b0c'; c.lineWidth = 0.03; c.stroke(); shine(c, -0.42, -0.42, 0.16);
    },
    dagger(c) {
      c.rotate(0.6);
      c.fillStyle = lin(c, -0.2, 0, 0.3, 0, '#ffffff', '#b9cde0', '#6f879f');
      c.beginPath(); c.moveTo(0.02, 0.12); c.quadraticCurveTo(0.42, -0.5, 0.08, -1.0); c.quadraticCurveTo(0.02, -0.4, -0.2, 0.12); c.closePath(); c.fill();
      c.strokeStyle = '#3d4d63'; c.lineWidth = 0.035; c.stroke();
      c.fillStyle = lin(c, 0, 0.08, 0, 0.24, '#ffe9a0', '#d08a12'); rr(c, -0.36, 0.08, 0.72, 0.16, 0.08); c.fill();
      c.fillStyle = lin(c, -0.1, 0, 0.1, 0, '#7a2f1c', '#c9512b', '#5a1f10'); rr(c, -0.1, 0.22, 0.2, 0.52, 0.06); c.fill();
      c.fillStyle = '#ffd24a'; ell(c, 0, 0.8, 0.14, 0.14); c.fill(); c.fillStyle = '#e0301a'; ell(c, 0, 0.8, 0.06, 0.06); c.fill();
    },
    gem(c) {
      const o = [[-0.5, -0.74], [0.5, -0.74], [0.88, -0.28], [0, 0.88], [-0.88, -0.28]];
      c.fillStyle = lin(c, 0, -0.8, 0, 0.9, '#ff9aae', '#e0184f', '#6d0a2a'); poly(c, o); c.fill();
      c.fillStyle = 'rgba(255,255,255,0.28)'; poly(c, [[-0.5, -0.74], [0.5, -0.74], [0.26, -0.28], [-0.26, -0.28]]); c.fill();
      c.fillStyle = 'rgba(255,255,255,0.14)'; poly(c, [[-0.26, -0.28], [0.26, -0.28], [0, 0.88]]); c.fill();
      c.strokeStyle = '#ffd0da'; c.lineWidth = 0.03; c.lineJoin = 'round';
      c.beginPath(); c.moveTo(-0.88, -0.28); c.lineTo(0.88, -0.28); c.moveTo(-0.5, -0.74); c.lineTo(-0.26, -0.28); c.lineTo(0, 0.88); c.lineTo(0.26, -0.28); c.lineTo(0.5, -0.74); c.stroke();
      c.strokeStyle = '#4a0519'; c.lineWidth = 0.05; poly(c, o); c.stroke(); shine(c, -0.34, -0.5, 0.2);
    },
    lamp(c) {
      const gold = lin(c, 0, -0.5, 0, 0.75, '#fff2a8', '#f5b82e', '#9a5b0c');
      c.strokeStyle = gold; c.lineWidth = 0.1; c.lineCap = 'round';
      c.beginPath(); c.moveTo(-0.5, 0.05); c.bezierCurveTo(-1.0, -0.1, -0.95, 0.5, -0.5, 0.38); c.stroke();
      c.fillStyle = gold;
      c.beginPath(); c.moveTo(0.35, 0.1); c.bezierCurveTo(0.6, 0.1, 0.72, -0.2, 0.98, -0.3); c.lineTo(0.95, -0.14); c.bezierCurveTo(0.8, 0.0, 0.75, 0.42, 0.4, 0.45); c.closePath(); c.fill();
      ell(c, -0.08, 0.26, 0.56, 0.3); c.fill();
      poly(c, [[-0.3, 0.5], [0.14, 0.5], [0.3, 0.72], [-0.46, 0.72]]); c.fill();
      ell(c, -0.08, -0.04, 0.3, 0.14); c.fill(); ell(c, -0.08, -0.22, 0.09, 0.09); c.fill();
      c.strokeStyle = '#8a4d08'; c.lineWidth = 0.035; ell(c, -0.08, 0.26, 0.56, 0.3); c.stroke();
      c.fillStyle = 'rgba(255,255,255,0.5)'; ell(c, -0.26, 0.14, 0.2, 0.07, -0.3); c.fill();
      c.save(); c.translate(0.98, -0.52); c.scale(0.26, 0.26); GLYPH.flame(c); c.restore();
    },
    lantern(c) {
      c.fillStyle = rad(c, 0, 0, 0.05, 0.8, '#fff0b8', '#ff5a7e', '#8a0f3c'); ell(c, 0, 0, 0.56, 0.62); c.fill();
      c.strokeStyle = 'rgba(90,5,30,0.55)'; c.lineWidth = 0.03;
      for (const k of [0.2, 0.4]) { ell(c, 0, 0, 0.56 * Math.cos(Math.asin(k / 0.62 * 0.62)), 0.62); c.stroke(); ell(c, 0, 0, k, 0.62); c.stroke(); }
      c.fillStyle = lin(c, 0, -0.8, 0, -0.6, '#ffe9a0', '#b9770e'); rr(c, -0.26, -0.8, 0.52, 0.2, 0.05); c.fill(); rr(c, -0.26, 0.6, 0.52, 0.16, 0.05); c.fill();
      c.strokeStyle = '#ffd24a'; c.lineWidth = 0.05; c.beginPath(); c.moveTo(0, 0.76); c.lineTo(0, 0.98); c.moveTo(0, -0.8); c.lineTo(0, -0.98); c.stroke();
      c.fillStyle = 'rgba(255,255,255,0.45)'; ell(c, -0.24, -0.22, 0.1, 0.22, 0.3); c.fill();
    },
    chip(c) {
      c.fillStyle = rad(c, -0.2, -0.2, 0.05, 1, '#7af7ff', '#3a5bff', '#2a0f6e'); ell(c, 0, 0, 0.8, 0.8); c.fill();
      c.strokeStyle = '#fff'; c.lineWidth = 0.16;
      for (let i = 0; i < 6; i++) { c.beginPath(); c.arc(0, 0, 0.71, (i * TAU) / 6, (i * TAU) / 6 + 0.42); c.stroke(); }
      c.fillStyle = '#150a33'; ell(c, 0, 0, 0.5, 0.5); c.fill(); c.strokeStyle = '#ff4fd8'; c.lineWidth = 0.05; c.stroke();
      c.fillStyle = lin(c, 0, -0.34, 0, 0.34, '#ffffff', '#ff4fd8'); poly(c, [[0, -0.34], [0.26, 0], [0, 0.34], [-0.26, 0]]); c.fill();
    },
    katana(c) {
      c.rotate(-0.72);
      c.fillStyle = lin(c, -0.08, 0, 0.1, 0, '#ffffff', '#c8ecff', '#5f86b8');
      c.beginPath(); c.moveTo(-0.07, 0.3); c.quadraticCurveTo(-0.16, -0.5, 0.05, -1.05); c.quadraticCurveTo(0.12, -0.5, 0.08, 0.3); c.closePath(); c.fill();
      c.strokeStyle = '#7af7ff'; c.lineWidth = 0.035; c.stroke();
      c.fillStyle = '#ffd24a'; ell(c, 0, 0.33, 0.24, 0.08); c.fill();
      c.fillStyle = '#2a0f4e'; rr(c, -0.08, 0.38, 0.16, 0.62, 0.05); c.fill();
      c.strokeStyle = '#ff4fd8'; c.lineWidth = 0.04; c.beginPath();
      for (let y = 0.46; y < 0.95; y += 0.14) { c.moveTo(-0.08, y); c.lineTo(0.08, y + 0.1); c.moveTo(0.08, y); c.lineTo(-0.08, y + 0.1); }
      c.stroke();
    },
    mask(c) {
      const face = [[0, 0.9], [0.5, 0.42], [0.86, -0.1], [0.4, -0.42], [0.82, -0.95], [0.18, -0.62], [0, -0.66], [-0.18, -0.62], [-0.82, -0.95], [-0.4, -0.42], [-0.86, -0.1], [-0.5, 0.42]];
      c.fillStyle = lin(c, 0, -0.9, 0, 0.9, '#ffffff', '#ffe6f2'); poly(c, face); c.fill();
      c.strokeStyle = '#ff2d8a'; c.lineWidth = 0.06; c.lineJoin = 'round'; c.stroke();
      c.fillStyle = '#ff2d6a'; poly(c, [[0.7, -0.8], [0.34, -0.58], [0.46, -0.4]]); c.fill(); poly(c, [[-0.7, -0.8], [-0.34, -0.58], [-0.46, -0.4]]); c.fill();
      poly(c, [[0, -0.5], [0.1, -0.3], [0, -0.1], [-0.1, -0.3]]); c.fill();
      c.fillStyle = '#16091f';
      for (const s of [1, -1]) { c.beginPath(); c.moveTo(s * 0.14, -0.02); c.quadraticCurveTo(s * 0.4, -0.3, s * 0.64, -0.14); c.quadraticCurveTo(s * 0.4, 0.06, s * 0.14, -0.02); c.fill(); }
      c.strokeStyle = '#ff2d6a'; c.lineWidth = 0.05; c.lineCap = 'round'; c.beginPath();
      for (const s of [1, -1]) { c.moveTo(s * 0.3, 0.3); c.lineTo(s * 0.56, 0.2); c.moveTo(s * 0.26, 0.44); c.lineTo(s * 0.46, 0.42); }
      c.stroke();
      c.fillStyle = '#16091f'; poly(c, [[-0.08, 0.5], [0.08, 0.5], [0, 0.62]]); c.fill();
    },
    shell(c) {
      c.fillStyle = lin(c, 0, -0.9, 0, 0.8, '#fff0f6', '#ff9ec7', '#a34380');
      c.beginPath(); c.moveTo(0, 0.78);
      const n = 5;
      for (let i = 0; i <= n; i++) { const a0 = Math.PI + (i * Math.PI) / n; if (!i) c.lineTo(Math.cos(a0) * 0.88, Math.sin(a0) * 0.86 + 0.02); else { const am = a0 - Math.PI / n / 2; c.quadraticCurveTo(Math.cos(am) * 1.06, Math.sin(am) * 1.04 + 0.02, Math.cos(a0) * 0.88, Math.sin(a0) * 0.86 + 0.02); } }
      c.closePath(); c.fill(); c.strokeStyle = '#7a2a5e'; c.lineWidth = 0.045; c.lineJoin = 'round'; c.stroke();
      c.strokeStyle = 'rgba(122,42,94,0.5)'; c.lineWidth = 0.03; c.beginPath();
      for (let i = 1; i < n; i++) { const a = Math.PI + (i * Math.PI) / n; c.moveTo(0, 0.7); c.lineTo(Math.cos(a) * 0.82, Math.sin(a) * 0.8); }
      c.stroke();
      c.fillStyle = rad(c, -0.06, 0.32, 0.02, 0.26, '#ffffff', '#e8f6ff', '#9fb8d6'); ell(c, 0, 0.38, 0.24, 0.24); c.fill(); shine(c, -0.4, -0.4, 0.14);
    },
    anchor(c) {
      const m = lin(c, -0.7, -0.8, 0.7, 0.8, '#f2fbff', '#9cc3dc', '#3f6f93');
      c.strokeStyle = m; c.lineCap = 'round'; c.lineJoin = 'round';
      c.lineWidth = 0.1; ell(c, 0, -0.72, 0.15, 0.15); c.stroke();
      c.lineWidth = 0.16; c.beginPath(); c.moveTo(0, -0.56); c.lineTo(0, 0.7); c.moveTo(-0.4, -0.34); c.lineTo(0.4, -0.34); c.stroke();
      c.beginPath(); c.moveTo(-0.66, 0.16); c.quadraticCurveTo(-0.6, 0.76, 0, 0.76); c.quadraticCurveTo(0.6, 0.76, 0.66, 0.16); c.stroke();
      c.fillStyle = m; poly(c, [[-0.9, 0.3], [-0.6, -0.04], [-0.46, 0.34]]); c.fill(); poly(c, [[0.9, 0.3], [0.6, -0.04], [0.46, 0.34]]); c.fill();
    },
    trident(c) {
      const g = lin(c, 0, -1, 0, 1, '#fff6c2', '#f7c23c', '#a8620e');
      c.strokeStyle = g; c.fillStyle = g; c.lineCap = 'round'; c.lineJoin = 'round';
      c.lineWidth = 0.12; c.beginPath(); c.moveTo(0, 0.95); c.lineTo(0, -0.5); c.stroke();
      c.lineWidth = 0.11; c.beginPath(); c.moveTo(-0.52, -0.62); c.quadraticCurveTo(-0.54, -0.08, 0, -0.08); c.quadraticCurveTo(0.54, -0.08, 0.52, -0.62); c.stroke();
      for (const x of [-0.52, 0, 0.52]) { const y = x ? -0.6 : -0.5; poly(c, [[x, y - 0.42], [x + 0.17, y], [x - 0.17, y]]); c.fill(); }
      c.fillStyle = '#3ff2d0'; ell(c, 0, 0.1, 0.1, 0.1); c.fill();
    },
    chest(c) {
      c.fillStyle = lin(c, 0, -0.1, 0, 0.72, '#b8692c', '#6b3310'); rr(c, -0.78, -0.08, 1.56, 0.8, 0.08); c.fill();
      c.fillStyle = lin(c, 0, -0.75, 0, -0.05, '#d98a45', '#8a4718');
      c.beginPath(); c.moveTo(-0.78, -0.06); c.bezierCurveTo(-0.78, -0.78, 0.78, -0.78, 0.78, -0.06); c.closePath(); c.fill();
      c.fillStyle = rad(c, 0, -0.1, 0.02, 0.6, 'rgba(255,240,150,0.95)', 'rgba(255,200,60,0)'); c.fillRect(-0.8, -0.5, 1.6, 0.8);
      const gold = lin(c, 0, -0.7, 0, 0.7, '#fff2a8', '#e3a11c');
      c.fillStyle = gold; c.fillRect(-0.56, -0.6, 0.14, 1.32); c.fillRect(0.42, -0.6, 0.14, 1.32); c.fillRect(-0.78, -0.12, 1.56, 0.1);
      rr(c, -0.15, -0.22, 0.3, 0.36, 0.05); c.fill();
      c.fillStyle = '#3a1a05'; ell(c, 0, -0.08, 0.05, 0.05); c.fill(); c.fillRect(-0.02, -0.06, 0.04, 0.12);
      c.strokeStyle = '#3a1a05'; c.lineWidth = 0.04; rr(c, -0.78, -0.08, 1.56, 0.8, 0.08); c.stroke(); shine(c, 0.3, -0.52, 0.16);
    },
    crystal(c) {
      const shard = (s, dx, dy, rot) => {
        c.save(); c.translate(dx, dy); c.rotate(rot); c.scale(s, s);
        const p = [[0, -0.95], [0.32, -0.48], [0.32, 0.5], [0, 0.85], [-0.32, 0.5], [-0.32, -0.48]];
        c.fillStyle = lin(c, -0.3, -0.9, 0.3, 0.8, '#e6ffff', '#59d6ff', '#6a3de8'); poly(c, p); c.fill();
        c.fillStyle = 'rgba(255,255,255,0.3)'; poly(c, [[0, -0.95], [0.32, -0.48], [0, -0.3], [-0.32, -0.48]]); c.fill();
        c.fillStyle = 'rgba(20,10,80,0.22)'; poly(c, [[0, -0.3], [0.32, -0.48], [0.32, 0.5], [0, 0.85]]); c.fill();
        c.strokeStyle = '#eaffff'; c.lineWidth = 0.035; c.lineJoin = 'round'; poly(c, p); c.stroke();
        c.restore();
      };
      shard(0.6, -0.48, 0.28, -0.5); shard(0.66, 0.48, 0.24, 0.45); shard(1, 0, 0, 0); shine(c, -0.14, -0.4, 0.2);
    },
    ufo(c) {
      c.fillStyle = lin(c, 0, 0.2, 0, 0.98, 'rgba(160,255,190,0.7)', 'rgba(160,255,190,0)'); poly(c, [[-0.22, 0.2], [0.22, 0.2], [0.62, 0.98], [-0.62, 0.98]]); c.fill();
      c.fillStyle = lin(c, 0, -0.7, 0, 0, 'rgba(220,250,255,0.95)', 'rgba(90,200,255,0.75)');
      c.beginPath(); c.ellipse(0, -0.08, 0.42, 0.56, 0, Math.PI, TAU); c.closePath(); c.fill();
      c.strokeStyle = '#eaffff'; c.lineWidth = 0.035; c.stroke();
      c.fillStyle = lin(c, 0, -0.2, 0, 0.36, '#f2f6ff', '#8f9fc4', '#3d4a73'); ell(c, 0, 0.06, 0.9, 0.28); c.fill();
      c.strokeStyle = '#1f2947'; c.lineWidth = 0.04; c.stroke();
      for (let i = -2; i <= 2; i++) { c.fillStyle = i % 2 ? '#ff5fa8' : '#ffe84a'; ell(c, i * 0.32, 0.1 + Math.abs(i) * -0.03 + 0.06, 0.07, 0.07); c.fill(); }
      c.fillStyle = 'rgba(255,255,255,0.6)'; ell(c, -0.14, -0.36, 0.08, 0.16, 0.5); c.fill();
    },
    planet(c) {
      const ring = (front) => {
        c.save(); c.rotate(-0.38); c.strokeStyle = lin(c, -1, 0, 1, 0, '#fff2a8', '#ffb347', '#ff7ad9'); c.lineWidth = 0.13;
        c.beginPath(); c.ellipse(0, 0, 0.98, 0.3, 0, front ? 0 : Math.PI, front ? Math.PI : TAU); c.stroke(); c.restore();
      };
      ring(false);
      c.save(); ell(c, 0, 0, 0.58, 0.58); c.fillStyle = rad(c, -0.2, -0.24, 0.04, 0.8, '#ffe0a0', '#ff7a5c', '#8a1f6e'); c.fill(); c.clip();
      c.fillStyle = 'rgba(120,20,90,0.35)'; c.rotate(-0.38);
      for (const y of [-0.34, -0.06, 0.24]) c.fillRect(-0.7, y, 1.4, 0.11);
      c.restore(); ring(true); shine(c, -0.26, -0.3, 0.14);
    },
    rocket(c) {
      c.rotate(0.62);
      c.fillStyle = lin(c, 0, 0.45, 0, 1.0, '#ffffff', '#ffd24a', 'rgba(255,90,30,0)');
      c.beginPath(); c.moveTo(-0.2, 0.44); c.quadraticCurveTo(0, 1.3, 0.2, 0.44); c.closePath(); c.fill();
      c.fillStyle = '#ff3d6e'; poly(c, [[-0.3, 0.1], [-0.62, 0.62], [-0.3, 0.46]]); c.fill(); poly(c, [[0.3, 0.1], [0.62, 0.62], [0.3, 0.46]]); c.fill();
      c.fillStyle = lin(c, -0.3, 0, 0.3, 0, '#ffffff', '#e4ebff', '#93a3cc');
      c.beginPath(); c.moveTo(0, -0.98); c.bezierCurveTo(0.42, -0.5, 0.34, 0.1, 0.3, 0.48); c.lineTo(-0.3, 0.48); c.bezierCurveTo(-0.34, 0.1, -0.42, -0.5, 0, -0.98); c.fill();
      c.strokeStyle = '#2a3157'; c.lineWidth = 0.04; c.stroke();
      c.fillStyle = '#ff3d6e'; c.beginPath(); c.moveTo(0, -0.98); c.bezierCurveTo(0.22, -0.74, 0.28, -0.6, 0.3, -0.5); c.lineTo(-0.3, -0.5); c.bezierCurveTo(-0.28, -0.6, -0.22, -0.74, 0, -0.98); c.fill();
      c.fillStyle = rad(c, -0.04, -0.2, 0.01, 0.2, '#eaffff', '#3ac8ff', '#14508a'); ell(c, 0, -0.16, 0.16, 0.16); c.fill(); c.strokeStyle = '#2a3157'; c.lineWidth = 0.05; c.stroke();
    },
    gumdrop(c) {
      c.fillStyle = lin(c, 0, -0.8, 0, 0.75, '#c8fff0', '#2fe0b0', '#0a8a78');
      c.beginPath(); c.moveTo(-0.72, 0.66); c.bezierCurveTo(-0.8, -0.5, -0.36, -0.86, 0, -0.86); c.bezierCurveTo(0.36, -0.86, 0.8, -0.5, 0.72, 0.66); c.quadraticCurveTo(0, 0.86, -0.72, 0.66); c.fill();
      c.strokeStyle = '#066a5c'; c.lineWidth = 0.045; c.stroke();
      c.fillStyle = 'rgba(255,255,255,0.85)';
      for (let i = 0; i < 16; i++) ell(c, Math.sin(i * 2.4) * 0.5, -0.5 + ((i * 0.618) % 1) * 1.05, 0.03, 0.03), c.fill();
      c.fillStyle = 'rgba(255,255,255,0.5)'; ell(c, -0.3, -0.42, 0.12, 0.26, 0.5); c.fill();
    },
    donut(c) {
      c.beginPath(); c.arc(0, 0, 0.82, 0, TAU); c.arc(0, 0, 0.26, 0, TAU, true);
      c.fillStyle = rad(c, -0.2, -0.2, 0.1, 1, '#ffd9a0', '#e09a4a', '#9a5a1c'); c.fill('evenodd');
      c.beginPath();
      for (let a = 0; a <= TAU + 0.01; a += 0.1) { const r = 0.68 + Math.sin(a * 7) * 0.07; c[a ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r); }
      c.arc(0, 0, 0.33, 0, TAU, true);
      c.fillStyle = lin(c, 0, -0.8, 0, 0.8, '#ff9fd0', '#ff3d94'); c.fill('evenodd');
      const cols = ['#ffe84a', '#7af7ff', '#ffffff', '#9dff6b', '#b98aff'];
      for (let i = 0; i < 14; i++) { const a = i * 2.4, r = 0.4 + ((i * 0.37) % 1) * 0.22; c.save(); c.translate(Math.cos(a) * r, Math.sin(a) * r); c.rotate(i * 1.3); c.fillStyle = cols[i % 5]; rr(c, -0.07, -0.022, 0.14, 0.044, 0.02); c.fill(); c.restore(); }
      c.fillStyle = 'rgba(255,255,255,0.4)'; ell(c, -0.36, -0.42, 0.2, 0.08, -0.7); c.fill();
    },
    lollipop(c) {
      c.strokeStyle = '#fff'; c.lineWidth = 0.1; c.lineCap = 'round'; c.beginPath(); c.moveTo(0.06, 0.3); c.lineTo(0.26, 0.96); c.stroke();
      const R = 0.64, cy = -0.24, cols = ['#ff3d94', '#ffffff', '#ffe84a', '#ffffff', '#7af7ff', '#ffffff'];
      for (let i = 0; i < 6; i++) {
        const edge = (k) => { const pts = []; for (let r = 0; r <= R; r += R / 10) { const a = ((i + k) * TAU) / 6 + (r / R) * 1.5; pts.push([Math.cos(a) * r, cy + Math.sin(a) * r]); } return pts; };
        const p0 = edge(0), p1 = edge(1).reverse();
        c.fillStyle = cols[i]; c.beginPath(); p0.concat(p1).forEach((p, j) => c[j ? 'lineTo' : 'moveTo'](p[0], p[1])); c.closePath(); c.fill();
      }
      c.strokeStyle = '#a3125c'; c.lineWidth = 0.05; ell(c, 0, cy, R, R); c.stroke();
      c.fillStyle = 'rgba(255,255,255,0.5)'; ell(c, -0.26, cy - 0.28, 0.2, 0.1, -0.6); c.fill();
    },
    heart(c) {
      c.fillStyle = rad(c, -0.25, -0.35, 0.05, 1.3, '#ff9fc0', '#ff2d6a', '#8a0a3c');
      c.beginPath(); c.moveTo(0, 0.86); c.bezierCurveTo(-1.25, 0.05, -0.9, -0.95, -0.4, -0.8); c.bezierCurveTo(-0.16, -0.74, 0, -0.5, 0, -0.34);
      c.bezierCurveTo(0, -0.5, 0.16, -0.74, 0.4, -0.8); c.bezierCurveTo(0.9, -0.95, 1.25, 0.05, 0, 0.86); c.fill();
      c.strokeStyle = '#5c0526'; c.lineWidth = 0.05; c.stroke();
      c.fillStyle = 'rgba(255,255,255,0.6)'; ell(c, -0.42, -0.42, 0.2, 0.11, -0.6); c.fill(); shine(c, 0.4, -0.3, 0.16);
    },
  };

  // ---------- themes ----------
  const THEMES = {
    djinn: {
      tag: 'Wild reels stick for the whole bonus', bg: ['#150812', '#4a1410', '#c25a1c'], accent: '#ffb347', accent2: '#ff5a1f', frame: ['#fff0b8', '#ff9a2e'],
      lows: ['#ffb36b', '#ff8a5c', '#ffd36b', '#ff6f91', '#fff0b8'], icons: ['coin', 'dagger', 'gem', 'lamp'], glyph: 'flame', wild: ['#ffe27a', '#ff7a1f', '#a81d0c'], ambient: 'ember',
      quotes: { wild: ['Burn, reel, burn!', 'A wish granted!', 'Wild fire!'], win: ['As you wish!', 'More gold!', 'Splendid!'], big: ['THE LAMP OVERFLOWS!', 'A THOUSAND WISHES!'], bonus: ['Free spins, master!'], tease: ['So close...', 'One more rub...'], idle: ['Three wishes? Try three scatters.', 'Rub the lamp.'] },
    },
    kitsune: {
      tag: 'Wild reels walk left and grow each step', bg: ['#07061a', '#2a0f4e', '#d61f8a'], accent: '#7af7ff', accent2: '#ff4fd8', frame: ['#bffcff', '#ff4fd8'],
      lows: ['#7af7ff', '#ff7ad9', '#b98aff', '#5cffb0', '#ffe84a'], icons: ['lantern', 'chip', 'katana', 'mask'], glyph: 'torii', wild: ['#bffcff', '#b23dff', '#3a0f8a'], ambient: 'rain',
      quotes: { wild: ['Foxfire!', 'Walk with me.', 'Neon wild!'], win: ['Clever!', 'Nine tails up!', 'Lucky fox!'], big: ['THE CITY IS YOURS!', 'SPIRIT JACKPOT!'], bonus: ['Free spins! Follow the lights.'], tease: ['Almost...', 'The gate is near.'], idle: ['The night is young.', 'Spin, little human.'] },
    },
    kraken: {
      tag: 'Every wild reel raises a multiplier that never resets', bg: ['#02101c', '#063a52', '#12a39a'], accent: '#3ff2d0', accent2: '#ffd24a', frame: ['#c8fff4', '#2ac8c0'],
      lows: ['#5ce0ff', '#3ff2d0', '#9db8ff', '#7dffb0', '#ffe9a0'], icons: ['shell', 'anchor', 'trident', 'chest'], glyph: 'whirl', wild: ['#c8fff4', '#16a8b8', '#0a2f6e'], ambient: 'bubble',
      quotes: { wild: ['Release the wild!', 'From the deep!', 'Mine. All mine.'], win: ['Shiny!', 'Into the hoard!', 'Glub glub!'], big: ['THE HOARD OPENS!', 'TIDAL JACKPOT!'], bonus: ['Free spins! Dive, dive!'], tease: ['It slipped away...', 'So close to the vault.'], idle: ['Eight arms, one hoard.', 'The deep is patient.'] },
    },
    nebula: {
      tag: 'Wild multipliers multiply each other', bg: ['#04031a', '#1b1464', '#7a2bd9'], accent: '#9fd0ff', accent2: '#ff7ad9', frame: ['#e6f1ff', '#7a8dff'],
      lows: ['#9fd0ff', '#b98aff', '#ff9ad9', '#7dffd9', '#ffe9a0'], icons: ['crystal', 'ufo', 'planet', 'rocket'], glyph: 'galaxy', wild: ['#e6f1ff', '#5a6dff', '#2a0f7a'], ambient: 'star',
      quotes: { wild: ['Warp wild!', 'Ignition!', 'Nine lives, one reel.'], win: ['Purr-fect!', 'Stellar!', 'Mission paid!'], big: ['HYPERSPACE JACKPOT!', 'NINE LIVES OF GOLD!'], bonus: ['Free spins! Engaging thrusters.'], tease: ['Missed the orbit...', 'Abort? Never.'], idle: ['Houston, we have a spin.', 'Zero gravity, full reels.'] },
    },
    sugar: {
      tag: 'Sticky wilds, multiplying multipliers and a rising global multiplier', bg: ['#2a0540', '#c2187a', '#ffb347'], accent: '#ffe84a', accent2: '#7af7ff', frame: ['#fff7b0', '#ff4fa3'],
      lows: ['#7af7ff', '#9dff6b', '#ffe84a', '#ff9a3d', '#ffffff'], icons: ['gumdrop', 'donut', 'lollipop', 'heart'], glyph: 'bolt', wild: ['#fff7b0', '#ff4fa3', '#7a12c2'], ambient: 'sprinkle',
      quotes: { wild: ['WILD WILD WILD!', 'ZAP!', 'MORE SUGAR!'], win: ['YES YES YES!', 'Again again!', 'Sweet!'], big: ['OVERDRIVE!!!', 'I CAN TASTE COLOURS!'], bonus: ['FREE SPINS! AAAAH!'], tease: ['Nooo! So close!', 'One more one more!'], idle: ['Spin spin spin!', "I haven't blinked since Tuesday."] },
    },
  };
  const LOW_GLYPHS = ['10', 'J', 'Q', 'K', 'A'];

  // ---------- symbol sprites ----------
  const spriteCache = new Map();
  function sprite(id, sym, px) {
    const key = id + ':' + sym + ':' + px;
    let cv = spriteCache.get(key);
    if (cv) return cv;
    const th = THEMES[id];
    cv = document.createElement('canvas');
    cv.width = cv.height = px;
    const c = cv.getContext('2d'), m = px / 2;
    c.translate(m, m);
    if (sym === 10) {
      // mystery rune: flips to a real symbol once the reels stop
      c.shadowColor = th.wild[1]; c.shadowBlur = px * 0.12;
      c.fillStyle = lin(c, -m, -m, m, m, th.wild[1], th.wild[2]); rr(c, -m * 0.8, -m * 0.8, m * 1.6, m * 1.6, m * 0.3); c.fill(); c.shadowBlur = 0;
      c.lineWidth = m * 0.07; c.strokeStyle = th.wild[0]; c.stroke();
      c.save(); c.globalAlpha = 0.3; c.scale(m * 0.6, m * 0.6); GLYPH[th.glyph](c); c.restore();
      c.font = `900 ${m * 1.25}px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
      c.lineWidth = m * 0.2; c.strokeStyle = 'rgba(8,4,16,0.85)'; c.strokeText('?', 0, m * 0.06); c.fillStyle = '#ffffff'; c.fillText('?', 0, m * 0.06);
    } else if (sym < 5) {
      const col = th.lows[sym];
      c.fillStyle = 'rgba(10,6,20,0.5)'; rr(c, -m * 0.74, -m * 0.74, m * 1.48, m * 1.48, m * 0.3); c.fill();
      c.strokeStyle = col; c.globalAlpha = 0.5; c.lineWidth = m * 0.05; c.stroke(); c.globalAlpha = 1;
      const text = LOW_GLYPHS[sym], fs = m * (text.length > 1 ? 0.98 : 1.22);
      c.font = `900 ${fs}px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.lineJoin = 'round'; c.lineWidth = fs * 0.16; c.strokeStyle = 'rgba(8,4,16,0.9)'; c.strokeText(text, 0, fs * 0.05);
      c.fillStyle = lin(c, 0, -fs * 0.5, 0, fs * 0.5, '#ffffff', col, col); c.fillText(text, 0, fs * 0.05);
      c.globalAlpha = 0.35; c.fillStyle = '#fff'; c.save(); rr(c, -m, -m, m * 2, m * 0.98, 0); c.clip(); c.fillText(text, 0, fs * 0.05); c.restore(); c.globalAlpha = 1;
    } else if (sym < 9) {
      c.fillStyle = rad(c, 0, 0, m * 0.1, m * 0.95, 'rgba(255,255,255,0.16)', 'rgba(255,255,255,0)'); c.fillRect(-m, -m, px, px);
      c.scale(m * 0.8, m * 0.8); c.shadowColor = 'rgba(0,0,0,0.55)'; c.shadowBlur = px * 0.06; c.shadowOffsetY = px * 0.03;
      ICON[th.icons[sym - 5]](c);
    } else {
      // scatter medallion
      c.fillStyle = rad(c, 0, 0, m * 0.2, m, th.accent2, 'rgba(0,0,0,0)'); c.globalAlpha = 0.55; c.fillRect(-m, -m, px, px); c.globalAlpha = 1;
      c.fillStyle = rad(c, -m * 0.2, -m * 0.25, m * 0.05, m * 0.9, '#3a2a55', '#120a22'); ell(c, 0, -m * 0.06, m * 0.74, m * 0.74); c.fill();
      c.lineWidth = m * 0.09; c.strokeStyle = lin(c, 0, -m, 0, m, '#fff7c2', '#f5b82e', '#a8620e'); c.stroke();
      c.lineWidth = m * 0.025; c.strokeStyle = th.accent; ell(c, 0, -m * 0.06, m * 0.62, m * 0.62); c.stroke();
      c.save(); c.translate(0, -m * 0.14); c.scale(m * 0.46, m * 0.46); GLYPH[th.glyph](c); c.restore();
      const fs = m * 0.4;
      c.fillStyle = lin(c, 0, m * 0.36, 0, m * 0.86, '#ff5a8a', '#b3123f'); rr(c, -m * 0.86, m * 0.38, m * 1.72, m * 0.48, m * 0.12); c.fill();
      c.lineWidth = m * 0.04; c.strokeStyle = '#fff2a8'; c.stroke();
      c.font = `900 ${fs}px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#fff'; c.fillText('BONUS', 0, m * 0.64);
    }
    spriteCache.set(key, cv);
    if (spriteCache.size > 400) spriteCache.delete(spriteCache.keys().next().value);
    return cv;
  }

  // ---------- wild reel ----------
  function drawWild(c, th, x, y, w, h, t, mult, appear) {
    const e = appear < 1 ? 1 - Math.pow(1 - appear, 3) : 1;
    c.save();
    c.translate(x + w / 2, y + h / 2);
    c.scale(0.35 + 0.65 * e, e);
    const hw = w / 2 - w * 0.05, hh = h / 2 - w * 0.05;
    c.shadowColor = th.wild[1]; c.shadowBlur = w * 0.4;
    c.fillStyle = lin(c, 0, -hh, 0, hh, th.wild[0], th.wild[1], th.wild[2]);
    rr(c, -hw, -hh, hw * 2, hh * 2, w * 0.16); c.fill();
    c.shadowBlur = 0;
    c.save(); c.clip();
    c.globalCompositeOperation = 'lighter'; c.strokeStyle = 'rgba(255,255,255,0.17)'; c.lineWidth = w * 0.18;
    const gap = w * 0.62, off = (t * w * 1.4) % gap;
    for (let yy = -hh - w; yy < hh + w; yy += gap) { c.beginPath(); c.moveTo(-hw, yy + off + w * 0.5); c.lineTo(hw, yy + off - w * 0.5); c.stroke(); }
    c.restore();
    c.lineWidth = w * 0.05; c.strokeStyle = '#ffffff'; rr(c, -hw, -hh, hw * 2, hh * 2, w * 0.16); c.stroke();
    const fs = Math.min(w * 0.58, (hh * 2) / (mult > 1 ? 6.7 : 5.4));
    c.font = `900 ${fs}px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
    const top = -fs * 1.55 - (mult > 1 ? fs * 0.5 : 0);
    'WILD'.split('').forEach((ch, i) => {
      const yy = top + i * fs * 1.03 + Math.sin(t * 4 + i * 0.8) * fs * 0.05;
      c.lineWidth = fs * 0.18; c.strokeStyle = 'rgba(30,6,20,0.8)'; c.strokeText(ch, 0, yy);
      c.fillStyle = '#fff'; c.fillText(ch, 0, yy);
    });
    c.save(); c.translate(0, top - fs * 1.15); c.scale(fs * 0.5, fs * 0.5); if (-hh < top - fs * 1.7) GLYPH[th.glyph](c); c.restore();
    if (mult > 1) {
      const by = top + fs * 4.35, br = fs * 0.72 * (1 + Math.sin(t * 6) * 0.05);
      c.fillStyle = '#1a0b16'; ell(c, 0, by, br, br); c.fill();
      c.lineWidth = fs * 0.1; c.strokeStyle = '#ffe27a'; c.stroke();
      c.fillStyle = '#ffe27a'; c.font = `900 ${fs * (mult > 9 ? 0.6 : 0.74)}px ${FONT}`; c.fillText('×' + mult, 0, by + fs * 0.04);
    }
    c.restore();
  }

  // ---------- backgrounds ----------
  const SCENE = {
    djinn(c, w, h) {
      c.fillStyle = rad(c, w * 0.8, h * 0.2, 0, h * 0.5, 'rgba(255,230,170,0.9)', 'rgba(255,170,80,0.25)', 'rgba(255,120,40,0)'); c.fillRect(0, 0, w, h);
      c.fillStyle = '#fff2c8'; ell(c, w * 0.8, h * 0.2, h * 0.075, h * 0.075); c.fill();
      c.fillStyle = 'rgba(40,10,20,0.55)';
      for (const [x, s] of [[0.1, 1], [0.24, 0.7], [0.92, 0.85]]) { const bx = w * x, bw = h * 0.1 * s, by = h * 0.78; c.fillRect(bx - bw / 2, by - bw * 1.6, bw, bw * 1.6 + h * 0.3); c.beginPath(); c.moveTo(bx - bw * 0.7, by - bw * 1.6); c.bezierCurveTo(bx - bw * 0.9, by - bw * 2.6, bx - bw * 0.1, by - bw * 2.7, bx, by - bw * 3.3); c.bezierCurveTo(bx + bw * 0.1, by - bw * 2.7, bx + bw * 0.9, by - bw * 2.6, bx + bw * 0.7, by - bw * 1.6); c.fill(); }
      for (let k = 0; k < 3; k++) { c.fillStyle = ['rgba(120,40,20,0.6)', 'rgba(70,20,16,0.8)', 'rgba(30,8,12,0.95)'][k]; c.beginPath(); c.moveTo(0, h); for (let x = 0; x <= w; x += w / 40) c.lineTo(x, h * (0.76 + k * 0.08) + Math.sin(x / w * (5 + k * 2) + k * 2) * h * 0.035); c.lineTo(w, h); c.fill(); }
    },
    kitsune(c, w, h) {
      for (let i = 0; i < 26; i++) {
        const bw = w * (0.03 + ((i * 0.37) % 1) * 0.04), x = (i / 26) * w * 1.05 - w * 0.02, bh = h * (0.18 + ((i * 0.61) % 1) * 0.4);
        c.fillStyle = i % 2 ? '#120a2e' : '#0b0620'; c.fillRect(x, h - bh, bw, bh);
        for (let y = h - bh + 6; y < h - 8; y += 9) for (let xx = x + 3; xx < x + bw - 4; xx += 7) if (((xx * 13 + y * 7 + i) | 0) % 5 < 2) { c.fillStyle = ['#ff4fd8', '#7af7ff', '#ffe84a'][((xx + y) | 0) % 3]; c.globalAlpha = 0.55; c.fillRect(xx, y, 3, 4); c.globalAlpha = 1; }
      }
      c.fillStyle = lin(c, 0, h * 0.75, 0, h, 'rgba(255,79,216,0)', 'rgba(255,79,216,0.35)'); c.fillRect(0, h * 0.75, w, h * 0.25);
      c.strokeStyle = 'rgba(122,247,255,0.35)'; c.lineWidth = 1.5;
      for (let i = 0; i < 6; i++) { const y = h * (0.86 + i * 0.028); c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
    },
    kraken(c, w, h) {
      for (let i = 0; i < 5; i++) { const x = w * (0.1 + i * 0.2); c.fillStyle = lin(c, 0, 0, 0, h * 0.9, 'rgba(160,255,240,0.2)', 'rgba(160,255,240,0)'); poly(c, [[x, 0], [x + w * 0.06, 0], [x + w * 0.16 - w * 0.2, h * 0.9], [x - w * 0.28, h * 0.9]]); c.fill(); }
      c.fillStyle = 'rgba(2,20,32,0.9)'; c.beginPath(); c.moveTo(0, h);
      for (let x = 0; x <= w; x += w / 30) c.lineTo(x, h * 0.86 + Math.sin(x / w * 9) * h * 0.03 + Math.sin(x / w * 23) * h * 0.012);
      c.lineTo(w, h); c.fill();
      for (let i = 0; i < 9; i++) { const x = w * ((i * 0.137 + 0.03) % 1), kh = h * (0.12 + ((i * 0.41) % 1) * 0.16); c.strokeStyle = i % 2 ? 'rgba(20,120,110,0.8)' : 'rgba(10,80,90,0.9)'; c.lineWidth = w * 0.008; c.lineCap = 'round'; c.beginPath(); c.moveTo(x, h * 0.9); c.bezierCurveTo(x - w * 0.02, h * 0.9 - kh * 0.4, x + w * 0.02, h * 0.9 - kh * 0.7, x - w * 0.005, h * 0.9 - kh); c.stroke(); }
      c.fillStyle = 'rgba(8,50,64,0.85)';
      for (const x of [0.06, 0.94]) { c.fillRect(w * x - h * 0.03, h * 0.5, h * 0.06, h * 0.4); c.fillRect(w * x - h * 0.045, h * 0.48, h * 0.09, h * 0.03); }
    },
    nebula(c, w, h) {
      for (const [x, y, r, col] of [[0.2, 0.3, 0.5, 'rgba(255,90,200,0.28)'], [0.75, 0.2, 0.45, 'rgba(80,160,255,0.3)'], [0.55, 0.8, 0.5, 'rgba(120,255,220,0.16)']]) { c.fillStyle = rad(c, w * x, h * y, 0, h * r, col, 'rgba(0,0,0,0)'); c.fillRect(0, 0, w, h); }
      for (let i = 0; i < 160; i++) { const x = ((i * 0.6180339) % 1) * w, y = ((i * 0.7548776) % 1) * h, s = 0.4 + ((i * 0.33) % 1) * 1.4; c.fillStyle = `rgba(255,255,255,${0.3 + ((i * 0.17) % 1) * 0.6})`; c.fillRect(x, y, s, s); }
      c.fillStyle = rad(c, w * 0.02, h * 1.18, h * 0.2, h * 0.52, '#3a1a7a', '#1a0a4a'); ell(c, w * 0.02, h * 1.18, h * 0.5, h * 0.5); c.fill();
      c.strokeStyle = 'rgba(190,160,255,0.5)'; c.lineWidth = 2; c.stroke();
    },
    sugar(c, w, h) {
      c.save(); c.translate(w / 2, h * 0.62);
      for (let i = 0; i < 24; i++) { c.fillStyle = i % 2 ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0)'; c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, w, (i * TAU) / 24, ((i + 1) * TAU) / 24); c.fill(); }
      c.restore();
      for (let k = 0; k < 3; k++) { c.fillStyle = ['rgba(255,140,200,0.55)', 'rgba(255,90,160,0.75)', 'rgba(140,20,110,0.92)'][k]; c.beginPath(); c.moveTo(0, h); const n = 7 + k * 2; for (let i = 0; i <= n; i++) { const x0 = (i / n) * w, y0 = h * (0.8 + k * 0.07); if (!i) c.lineTo(x0, y0); else c.quadraticCurveTo(x0 - w / n / 2, y0 - h * 0.09, x0, y0); } c.lineTo(w, h); c.fill(); }
      const cols = ['#ffe84a', '#7af7ff', '#ffffff', '#9dff6b'];
      for (let i = 0; i < 40; i++) { c.fillStyle = cols[i % 4]; c.globalAlpha = 0.5; ell(c, ((i * 0.618) % 1) * w, ((i * 0.755) % 1) * h * 0.8, 2 + (i % 3), 2 + (i % 3)); c.fill(); }
      c.globalAlpha = 1;
    },
  };
  function background(id, w, h, dpr) {
    const th = THEMES[id], cv = document.createElement('canvas');
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    const c = cv.getContext('2d');
    c.scale(dpr, dpr);
    c.fillStyle = lin(c, 0, 0, 0, h, ...th.bg); c.fillRect(0, 0, w, h);
    SCENE[id](c, w, h);
    c.fillStyle = rad(c, w / 2, h / 2, h * 0.35, Math.hypot(w, h) * 0.62, 'rgba(0,0,0,0)', 'rgba(0,0,0,0.6)'); c.fillRect(0, 0, w, h);
    return cv;
  }

  // ---------- characters ----------
  // Drawn around the origin in a box roughly 2.4 wide by 3 tall. `a` carries the live state:
  //   cast  0..1  pointing at the reels      joy   0..1  happy
  //   hype  0..1  big-win frenzy             antic 0..1  holding its breath
  //   look -1..1  eye direction              blink bool
  const CHAR = {
    djinn(c, t, a) {
      const sway = Math.sin(t * 1.3) * 0.1;
      c.fillStyle = rad(c, 0, 0.1, 0.1, 1.8, `rgba(255,150,50,${0.25 + a.joy * 0.3})`, 'rgba(255,90,20,0)'); c.fillRect(-2.2, -2.2, 4.4, 4.4);
      c.translate(0, Math.sin(t * 1.7) * 0.05 - a.hype * Math.abs(Math.sin(t * 9)) * 0.14);
      c.fillStyle = lin(c, 0, 0.4, 0, 1.6, '#ff9a3d', '#ff4d1f', 'rgba(255,60,20,0)');
      c.beginPath(); c.moveTo(-0.4, 0.45); c.bezierCurveTo(-0.5, 0.95, 0.3 + sway, 1.0, sway * 1.6, 1.6); c.bezierCurveTo(0.1 + sway, 1.1, 0.55, 0.9, 0.4, 0.45); c.closePath(); c.fill();
      for (let i = 0; i < 7; i++) { const p = (t * 0.45 + i / 7) % 1; c.fillStyle = `rgba(255,${180 + i * 8},90,${(1 - p) * 0.8})`; ell(c, Math.sin(i * 2.1 + t * 1.2) * 0.45, 1.35 - p * 1.5, 0.035 * (1 - p) + 0.012, 0.035 * (1 - p) + 0.012); c.fill(); }
      c.fillStyle = lin(c, 0, -0.4, 0, 0.6, '#ffb055', '#e2501c', '#8a1f0e');
      blob(c, [[-0.66, -0.26], [0, -0.42], [0.66, -0.26], [0.52, 0.2], [0.4, 0.56], [-0.4, 0.56], [-0.52, 0.2]]); c.fill();
      c.strokeStyle = '#ffd24a'; c.lineWidth = 0.09; c.lineCap = 'round'; c.beginPath(); c.moveTo(-0.4, 0.5); c.quadraticCurveTo(0, 0.62, 0.4, 0.5); c.stroke();
      c.beginPath(); c.moveTo(-0.3, -0.3); c.quadraticCurveTo(0, -0.08, 0.3, -0.3); c.stroke();
      c.fillStyle = '#e0184f'; poly(c, [[0, -0.2], [0.09, -0.1], [0, 0.02], [-0.09, -0.1]]); c.fill();
      const skin = '#e86a2a';
      const armL = [mix2(mix2([-0.74, 0.18], [-0.74, 0.18], a.cast), [-0.92, -0.5], a.joy), mix2([0.14, 0.14], [-1.0, -1.05 + Math.sin(t * 11) * 0.05], a.joy)];
      const armR = [mix2(mix2([0.74, 0.18], [0.92, -0.14], a.cast), [0.92, -0.5], a.joy), mix2(mix2([-0.14, 0.06], [1.22, -0.4], a.cast), [1.0, -1.05 + Math.cos(t * 11) * 0.05], a.joy)];
      for (const [s, arm] of [[-1, armL], [1, armR]]) {
        limb(c, [[s * 0.6, -0.2], arm[0], arm[1]], 0.24, skin);
        limb(c, [mix2(arm[0], arm[1], 0.55), mix2(arm[0], arm[1], 0.82)], 0.27, '#ffd24a');
        c.fillStyle = '#ffb055'; ell(c, arm[1][0], arm[1][1], 0.14, 0.14); c.fill();
      }
      if (a.cast > 0.05) { const r = 0.14 + a.cast * 0.22 + Math.sin(t * 30) * 0.02; c.fillStyle = rad(c, armR[1][0] + 0.08, armR[1][1] - 0.08, 0, r * 1.6, '#ffffff', '#ffd24a', 'rgba(255,90,20,0)'); ell(c, armR[1][0] + 0.08, armR[1][1] - 0.08, r * 1.6, r * 1.6); c.fill(); }
      // head
      c.fillStyle = skin; poly(c, [[-0.32, -0.72], [-0.48, -0.86], [-0.3, -0.84]]); c.fill(); poly(c, [[0.32, -0.72], [0.48, -0.86], [0.3, -0.84]]); c.fill();
      c.fillStyle = lin(c, 0, -1.05, 0, -0.36, '#ffc27a', '#e06a2c');
      c.beginPath(); c.moveTo(-0.31, -0.84); c.bezierCurveTo(-0.33, -0.56, -0.14, -0.38, 0, -0.36); c.bezierCurveTo(0.14, -0.38, 0.33, -0.56, 0.31, -0.84); c.bezierCurveTo(0.3, -1.08, -0.3, -1.08, -0.31, -0.84); c.fill();
      c.fillStyle = '#3a1205'; poly(c, [[-0.09, -0.42], [0.09, -0.42], [0, -0.26]]); c.fill();
      for (const s of [-1, 1]) {
        c.save(); c.translate(s * 0.13, -0.76); c.scale(1, a.blink ? 0.12 : 1);
        c.fillStyle = '#fff6b0'; c.shadowColor = '#ffd24a'; c.shadowBlur = 10; ell(c, 0, 0, 0.085, 0.05 + a.hype * 0.02, s * -0.2); c.fill(); c.shadowBlur = 0;
        c.fillStyle = '#3a1205'; ell(c, a.look * 0.03, 0, 0.02, 0.04); c.fill(); c.restore();
        limb(c, [[s * 0.05, -0.86 + a.joy * -0.03], [s * 0.22, -0.9 - a.joy * 0.05]], 0.04, '#3a1205');
      }
      c.strokeStyle = '#3a1205'; c.lineWidth = 0.035; c.beginPath(); c.moveTo(-0.13, -0.58); c.quadraticCurveTo(0, -0.5 + a.joy * 0.07, 0.13, -0.58); c.stroke();
      if (a.joy > 0.5) { c.fillStyle = '#5a1205'; c.beginPath(); c.moveTo(-0.12, -0.58); c.quadraticCurveTo(0, -0.42, 0.12, -0.58); c.closePath(); c.fill(); }
      // turban
      c.fillStyle = lin(c, 0, -1.3, 0, -0.9, '#8a4dff', '#3a137a'); blob(c, [[-0.4, -0.92], [-0.36, -1.18], [0, -1.3], [0.36, -1.18], [0.4, -0.92], [0, -0.86]]); c.fill();
      c.strokeStyle = 'rgba(200,170,255,0.5)'; c.lineWidth = 0.03; c.beginPath(); c.moveTo(-0.34, -1.0); c.quadraticCurveTo(0, -1.2, 0.34, -1.0); c.moveTo(-0.3, -1.12); c.quadraticCurveTo(0, -1.28, 0.3, -1.12); c.stroke();
      c.fillStyle = '#fff'; c.beginPath(); c.moveTo(0, -1.0); c.quadraticCurveTo(0.2 + sway * 0.6, -1.4, 0.04 + sway, -1.62); c.quadraticCurveTo(-0.08 + sway * 0.4, -1.3, 0, -1.0); c.fill();
      c.fillStyle = '#ffd24a'; poly(c, [[0, -1.06], [0.08, -0.97], [0, -0.88], [-0.08, -0.97]]); c.fill(); c.fillStyle = '#e0184f'; ell(c, 0, -0.97, 0.035, 0.035); c.fill();
    },
    kitsune(c, t, a) {
      c.fillStyle = rad(c, 0, 0, 0.1, 1.8, `rgba(255,79,216,${0.2 + a.joy * 0.3})`, 'rgba(122,247,255,0.06)', 'rgba(0,0,0,0)'); c.fillRect(-2.2, -2.2, 4.4, 4.4);
      c.translate(0, Math.sin(t * 1.5) * 0.03 - a.hype * Math.abs(Math.sin(t * 9)) * 0.12);
      // tails
      c.beginPath();
      const tails = [];
      for (let i = -3; i <= 3; i++) {
        const ang = -Math.PI / 2 + i * 0.27 * (1 + a.joy * 0.35) + Math.sin(t * 1.6 + i) * 0.07, L = 1.35 - Math.abs(i) * 0.06;
        const dx = Math.cos(ang), dy = Math.sin(ang), px = -dy, py = dx, wob = Math.sin(t * 2.2 + i * 1.3) * 0.12 * (1 + a.hype);
        const tip = [dx * L + px * wob, 0.75 + dy * L + py * wob], mid = [dx * L * 0.62, 0.75 + dy * L * 0.62];
        tails.push([tip, mid, px, py]);
        c.moveTo(-px * 0.06, 0.75 - py * 0.06); c.quadraticCurveTo(mid[0] - px * 0.3, mid[1] - py * 0.3, tip[0], tip[1]); c.quadraticCurveTo(mid[0] + px * 0.3, mid[1] + py * 0.3, px * 0.06, 0.75 + py * 0.06);
      }
      c.fillStyle = rad(c, 0, 0.75, 0.3, 1.5, '#ffffff', '#ffd0f5', '#ff3dbb'); c.shadowColor = '#ff4fd8'; c.shadowBlur = 14 + a.joy * 14; c.fill(); c.shadowBlur = 0;
      c.strokeStyle = 'rgba(180,60,200,0.5)'; c.lineWidth = 0.02; c.stroke();
      // body
      c.fillStyle = lin(c, 0, -0.2, 0, 1.0, '#ffffff', '#cfe6ff'); blob(c, [[-0.44, 1.0], [-0.52, 0.45], [-0.3, -0.06], [0, -0.16], [0.3, -0.06], [0.52, 0.45], [0.44, 1.0], [0, 1.06]]); c.fill();
      c.strokeStyle = '#5b3a9a'; c.lineWidth = 0.03; c.stroke();
      const pawR = mix2(mix2([0.2, 0.98], [0.78, 0.0], a.cast), [0.62, -0.5], a.joy), pawL = mix2([-0.2, 0.98], [-0.62, -0.5], a.joy);
      limb(c, [[-0.18, 0.3], pawL], 0.2, '#f2f8ff'); limb(c, [[0.18, 0.3], pawR], 0.2, '#f2f8ff');
      for (const p of [pawL, pawR]) { c.fillStyle = '#fff'; ell(c, p[0], p[1], 0.13, 0.1); c.fill(); c.fillStyle = '#ff4fd8'; ell(c, p[0], p[1] + 0.02, 0.05, 0.035); c.fill(); }
      if (a.cast > 0.05) { const r = 0.2 + a.cast * 0.2; c.fillStyle = rad(c, pawR[0] + 0.1, pawR[1] - 0.14, 0, r, '#ffffff', '#7af7ff', 'rgba(122,247,255,0)'); ell(c, pawR[0] + 0.1, pawR[1] - 0.14, r, r); c.fill(); }
      c.strokeStyle = '#ff2d6a'; c.lineWidth = 0.07; c.beginPath(); c.moveTo(-0.26, -0.06); c.quadraticCurveTo(0, 0.1, 0.26, -0.06); c.stroke();
      c.fillStyle = '#ffd24a'; ell(c, 0, 0.08, 0.07, 0.07); c.fill();
      // head
      const tw = Math.sin(t * 3.1) > 0.94 ? 0.06 : 0;
      c.fillStyle = lin(c, 0, -1.3, 0, -0.2, '#ffffff', '#e6f3ff');
      poly(c, [[0, -0.2], [0.3, -0.3], [0.56, -0.44], [0.44, -0.6], [0.4, -0.82], [0.56, -1.34 - tw], [0.14, -0.96], [0, -0.98], [-0.14, -0.96], [-0.56, -1.34 + tw], [-0.4, -0.82], [-0.44, -0.6], [-0.56, -0.44], [-0.3, -0.3]]); c.fill();
      c.strokeStyle = '#5b3a9a'; c.lineWidth = 0.03; c.lineJoin = 'round'; c.stroke();
      c.fillStyle = '#ff4fd8'; poly(c, [[0.5, -1.22 - tw], [0.24, -0.96], [0.42, -0.86]]); c.fill(); poly(c, [[-0.5, -1.22 + tw], [-0.24, -0.96], [-0.42, -0.86]]); c.fill();
      poly(c, [[0, -0.92], [0.06, -0.82], [0, -0.7], [-0.06, -0.82]]); c.fill();
      for (const s of [-1, 1]) {
        if (a.joy > 0.6) { c.strokeStyle = '#16091f'; c.lineWidth = 0.045; c.lineCap = 'round'; c.beginPath(); c.moveTo(s * 0.1, -0.58); c.quadraticCurveTo(s * 0.21, -0.72, s * 0.32, -0.58); c.stroke(); } else {
          c.save(); c.translate(s * 0.21, -0.62); c.rotate(s * -0.28); c.scale(1, a.blink ? 0.1 : 1);
          c.fillStyle = '#7af7ff'; c.shadowColor = '#7af7ff'; c.shadowBlur = 8; ell(c, 0, 0, 0.12, 0.075 + a.antic * 0.02); c.fill(); c.shadowBlur = 0;
          c.strokeStyle = '#16091f'; c.lineWidth = 0.028; c.stroke(); c.fillStyle = '#16091f'; ell(c, a.look * 0.04, 0, 0.025, 0.065); c.fill(); c.restore();
        }
        c.strokeStyle = '#ff4fd8'; c.lineWidth = 0.03; c.lineCap = 'round'; c.beginPath(); c.moveTo(s * 0.36, -0.46); c.lineTo(s * 0.5, -0.5); c.moveTo(s * 0.34, -0.38); c.lineTo(s * 0.46, -0.38); c.stroke();
      }
      c.fillStyle = '#16091f'; poly(c, [[-0.045, -0.4], [0.045, -0.4], [0, -0.34]]); c.fill();
      c.strokeStyle = '#16091f'; c.lineWidth = 0.025; c.beginPath(); c.moveTo(-0.08, -0.29); c.quadraticCurveTo(-0.04, -0.25, 0, -0.31); c.quadraticCurveTo(0.04, -0.25, 0.08, -0.29); c.stroke();
      for (let i = 0; i < 3; i++) { const ang = t * 0.9 + (i * TAU) / 3, x = Math.cos(ang) * 1.0, y = -0.25 + Math.sin(ang) * 0.32, r = 0.09 + a.joy * 0.05; c.fillStyle = rad(c, x, y, 0, r * 2, '#ffffff', '#7af7ff', 'rgba(122,247,255,0)'); ell(c, x, y, r * 2, r * 2); c.fill(); }
    },
    kraken(c, t, a) {
      c.fillStyle = rad(c, 0, 0, 0.1, 1.8, `rgba(63,242,208,${0.18 + a.joy * 0.25})`, 'rgba(0,0,0,0)'); c.fillRect(-2.2, -2.2, 4.4, 4.4);
      c.translate(0, Math.sin(t * 1.4) * 0.06 - a.hype * Math.abs(Math.sin(t * 8)) * 0.12);
      const tent = (bx, th0, dark, extend) => {
        const N = 11, pts = [];
        for (let k = 0; k <= N; k++) {
          const u = k / N, ang = mix(th0 + Math.sin(t * 1.6 + k * 0.5 + bx * 4) * 0.3 * u * (1 + a.joy + a.hype) + u * u * 0.9 * Math.sign(th0 || 1), 1.75 - u * 0.5, extend);
          const d = 0.105 * (1 + extend * 0.35); const p = k ? pts[k - 1] : [bx, 0.42];
          pts.push(k ? [p[0] + Math.sin(ang) * d, p[1] + Math.cos(ang) * d] : p);
        }
        for (let k = 1; k <= N; k++) { const u = k / N; limb(c, [pts[k - 1], pts[k]], 0.2 * (1 - u) + 0.045, dark ? '#16606e' : k % 2 ? '#22b0a6' : '#1fa39a'); }
        if (!dark) for (let k = 2; k < N; k += 2) { c.fillStyle = 'rgba(220,255,250,0.75)'; ell(c, pts[k][0], pts[k][1], 0.03 * (1 - k / N) + 0.012, 0.03 * (1 - k / N) + 0.012); c.fill(); }
      };
      for (const [bx, th] of [[-0.42, -0.95], [0, 0.18], [0.42, 0.95]]) tent(bx, th, true, 0);
      const fronts = [[-0.5, -0.62], [-0.24, -0.22], [0.24, 0.22], [0.5, 0.62]];
      fronts.forEach(([bx, th], i) => tent(bx, th, false, i === 3 ? a.cast : 0));
      const sq = 1 + Math.sin(t * 2.1) * 0.025 + a.hype * Math.sin(t * 14) * 0.04;
      c.save(); c.scale(1 / sq, sq);
      c.fillStyle = rad(c, -0.2, -0.6, 0.05, 1.4, '#8dffe6', '#1f9d98', '#452a8f');
      blob(c, [[-0.6, 0.5], [-0.76, -0.1], [-0.54, -0.86], [0, -1.14], [0.54, -0.86], [0.76, -0.1], [0.6, 0.5], [0, 0.66]]); c.fill();
      c.strokeStyle = '#0d3a55'; c.lineWidth = 0.035; c.stroke();
      c.fillStyle = 'rgba(210,255,246,0.28)';
      for (const [x, y, r] of [[-0.3, -0.8, 0.1], [0.1, -0.92, 0.07], [0.38, -0.66, 0.09], [-0.5, -0.44, 0.06], [0.2, -0.62, 0.05]]) { ell(c, x, y, r, r * 0.8); c.fill(); }
      const big = 1 + a.hype * 0.18 + a.antic * 0.1;
      eye(c, -0.29, -0.08, 0.2 * big, 0.24 * big, a, '#ffcf3d', 1 - a.hype * 0.4); eye(c, 0.29, -0.08, 0.2 * big, 0.24 * big, a, '#ffcf3d', 1 - a.hype * 0.4);
      c.strokeStyle = '#0d3a55'; c.lineWidth = 0.04; c.lineCap = 'round';
      if (a.hype > 0.4 || a.antic > 0.5) { c.fillStyle = '#0d2a40'; ell(c, 0, 0.32, 0.08, 0.1); c.fill(); } else { c.beginPath(); c.moveTo(-0.12, 0.28); c.quadraticCurveTo(0, 0.36 + a.joy * 0.08, 0.12, 0.28); c.stroke(); }
      c.fillStyle = 'rgba(255,120,170,0.35)'; ell(c, -0.5, 0.18, 0.1, 0.06); c.fill(); ell(c, 0.5, 0.18, 0.1, 0.06); c.fill();
      c.save(); c.translate(-0.16, -1.1); c.rotate(-0.22);
      c.fillStyle = lin(c, 0, -0.26, 0, 0.06, '#fff2a8', '#e3a11c'); poly(c, [[-0.26, 0.06], [-0.3, -0.2], [-0.14, -0.06], [0, -0.28], [0.14, -0.06], [0.3, -0.2], [0.26, 0.06]]); c.fill();
      c.strokeStyle = '#8a4d08'; c.lineWidth = 0.025; c.stroke(); c.fillStyle = '#e0184f'; ell(c, 0, -0.03, 0.04, 0.04); c.fill(); c.restore();
      c.restore();
      for (let i = 0; i < 6; i++) { const p = (t * 0.22 + i / 6) % 1; c.strokeStyle = `rgba(200,255,246,${(1 - p) * 0.7})`; c.lineWidth = 0.015; ell(c, Math.sin(i * 1.9 + t) * 0.85 + Math.sin(t * 2 + i) * 0.05, 1.2 - p * 2.6, 0.03 + (i % 3) * 0.02, 0.03 + (i % 3) * 0.02); c.stroke(); }
    },
    nebula(c, t, a) {
      c.fillStyle = rad(c, 0, 0, 0.1, 1.8, `rgba(159,208,255,${0.16 + a.joy * 0.25})`, 'rgba(0,0,0,0)'); c.fillRect(-2.2, -2.2, 4.4, 4.4);
      c.translate(Math.sin(t * 0.6) * 0.05, Math.sin(t * 1.1) * 0.08 - a.hype * Math.abs(Math.sin(t * 8)) * 0.14);
      c.rotate(Math.sin(t * 0.7) * 0.08 + a.hype * Math.sin(t * 6) * 0.1);
      const fl = 0.25 + a.joy * 0.45 + a.hype * 0.3 + Math.sin(t * 40) * 0.04;
      for (const x of [-0.24, 0.24]) { c.fillStyle = lin(c, 0, 0.8, 0, 0.9 + fl, '#ffffff', '#7af7ff', 'rgba(90,120,255,0)'); c.beginPath(); c.moveTo(x - 0.12, 0.84); c.quadraticCurveTo(x, 0.9 + fl * 1.6, x + 0.12, 0.84); c.fill(); }
      c.fillStyle = '#7f8cab'; rr(c, -0.5, -0.12, 1.0, 0.98, 0.16); c.fill();
      const wag = Math.sin(t * 3) * 0.2 * (1 + a.joy);
      c.strokeStyle = '#eef2ff'; c.lineWidth = 0.13; c.lineCap = 'round'; c.beginPath(); c.moveTo(-0.3, 0.72); c.bezierCurveTo(-0.8, 0.9, -1.05, 0.5 + wag, -0.92, 0.12 + wag); c.stroke();
      c.strokeStyle = '#ff8a3d'; c.beginPath(); c.moveTo(-0.95, 0.24 + wag); c.lineTo(-0.92, 0.12 + wag); c.stroke();
      const kick = Math.sin(t * 2.2) * 0.06;
      for (const s of [-1, 1]) { limb(c, [[s * 0.2, 0.7], [s * 0.3, 1.16 + s * kick]], 0.26, '#e4e9f7'); c.fillStyle = '#ff8a3d'; rr(c, s * 0.3 - 0.17, 1.12 + s * kick, 0.34, 0.2, 0.08); c.fill(); }
      c.fillStyle = lin(c, -0.45, 0, 0.45, 0, '#ffffff', '#f1f4ff', '#b9c4dd'); rr(c, -0.43, -0.08, 0.86, 0.9, 0.2); c.fill();
      c.strokeStyle = '#59658a'; c.lineWidth = 0.03; c.stroke();
      c.fillStyle = '#28324f'; rr(c, -0.24, 0.2, 0.48, 0.3, 0.06); c.fill();
      ['#ff5a5a', '#ffe84a', '#5cff9a'].forEach((col, i) => { c.fillStyle = Math.sin(t * 5 + i * 2) > 0 ? col : '#44506e'; ell(c, -0.13 + i * 0.13, 0.3, 0.035, 0.035); c.fill(); });
      c.fillStyle = '#7af7ff'; c.fillRect(-0.17, 0.39, 0.34 * (0.5 + 0.5 * Math.sin(t * 1.5)), 0.045);
      c.fillStyle = '#ff8a3d'; c.fillRect(-0.43, 0.62, 0.86, 0.07);
      const handL = mix2([-0.78, 0.46], [-0.82, -0.6 + Math.sin(t * 10) * 0.05], a.joy), handR = mix2(mix2([0.78, 0.46], [1.12, 0.02], a.cast), [0.82, -0.6 + Math.cos(t * 10) * 0.05], a.joy);
      for (const [s, hnd] of [[-1, handL], [1, handR]]) { limb(c, [[s * 0.4, 0.08], [s * 0.72, mix(0.2, -0.1, a.joy)], hnd], 0.24, '#eef2ff'); c.fillStyle = '#ff8a3d'; ell(c, hnd[0], hnd[1], 0.15, 0.15); c.fill(); }
      if (a.cast > 0.05) { const r = 0.2 + a.cast * 0.25; c.fillStyle = rad(c, handR[0] + 0.1, handR[1] - 0.05, 0, r, '#ffffff', '#9fd0ff', 'rgba(159,208,255,0)'); ell(c, handR[0] + 0.1, handR[1] - 0.05, r, r); c.fill(); }
      // helmet and cat
      c.fillStyle = '#c9d2ea'; ell(c, 0, -0.1, 0.42, 0.1); c.fill();
      c.fillStyle = '#eef2ff'; ell(c, 0, -0.64, 0.6, 0.6); c.fill(); c.fillStyle = '#16203f'; ell(c, 0, -0.64, 0.52, 0.52); c.fill();
      const fur = lin(c, 0, -1.0, 0, -0.3, '#ffc56b', '#f08a24');
      c.fillStyle = fur; poly(c, [[-0.34, -0.74], [-0.36, -1.08], [-0.1, -0.9]]); c.fill(); poly(c, [[0.34, -0.74], [0.36, -1.08], [0.1, -0.9]]); c.fill();
      c.fillStyle = '#ff9ab0'; poly(c, [[-0.3, -0.82], [-0.32, -1.0], [-0.18, -0.9]]); c.fill(); poly(c, [[0.3, -0.82], [0.32, -1.0], [0.18, -0.9]]); c.fill();
      c.fillStyle = fur; ell(c, 0, -0.6, 0.38, 0.32); c.fill();
      c.strokeStyle = '#a8500c'; c.lineWidth = 0.03; c.lineCap = 'round'; c.beginPath(); for (const x of [-0.08, 0, 0.08]) { c.moveTo(x, -0.9); c.lineTo(x, -0.8); } c.stroke();
      c.fillStyle = '#fff5e0'; ell(c, -0.1, -0.47, 0.13, 0.1); c.fill(); ell(c, 0.1, -0.47, 0.13, 0.1); c.fill();
      eye(c, -0.16, -0.66, 0.1, 0.115, a, '#8dff7a', 0.7 + a.joy * 0.8 + a.antic * 0.6); eye(c, 0.16, -0.66, 0.1, 0.115, a, '#8dff7a', 0.7 + a.joy * 0.8 + a.antic * 0.6);
      c.fillStyle = '#ff7a9a'; poly(c, [[-0.04, -0.54], [0.04, -0.54], [0, -0.49]]); c.fill();
      c.strokeStyle = '#7a3a0c'; c.lineWidth = 0.022; c.beginPath(); c.moveTo(-0.08, -0.43); c.quadraticCurveTo(-0.04, -0.39 + a.joy * 0.03, 0, -0.45); c.quadraticCurveTo(0.04, -0.39 + a.joy * 0.03, 0.08, -0.43); c.stroke();
      c.strokeStyle = 'rgba(255,255,255,0.8)'; c.lineWidth = 0.012; c.beginPath(); for (const s of [-1, 1]) for (const dy of [-0.03, 0.02]) { c.moveTo(s * 0.2, -0.47 + dy); c.lineTo(s * 0.42, -0.5 + dy * 2.4); } c.stroke();
      c.fillStyle = rad(c, -0.2, -0.86, 0.02, 0.75, 'rgba(210,245,255,0.34)', 'rgba(120,190,255,0.08)'); ell(c, 0, -0.64, 0.52, 0.52); c.fill();
      c.strokeStyle = 'rgba(255,255,255,0.75)'; c.lineWidth = 0.045; c.beginPath(); c.arc(0, -0.64, 0.42, Math.PI * 1.05, Math.PI * 1.4); c.stroke();
      c.strokeStyle = '#59658a'; c.lineWidth = 0.035; ell(c, 0, -0.64, 0.6, 0.6); c.stroke();
      c.strokeStyle = '#c9d2ea'; c.lineWidth = 0.03; c.beginPath(); c.moveTo(0.38, -1.1); c.lineTo(0.5, -1.36); c.stroke();
      c.fillStyle = Math.sin(t * 6) > 0 ? '#ff4d4d' : '#7a1f1f'; ell(c, 0.5, -1.38, 0.05, 0.05); c.fill();
    },
    sugar(c, t, a) {
      c.fillStyle = rad(c, 0, 0.1, 0.1, 1.8, `rgba(255,232,74,${0.2 + a.joy * 0.3})`, 'rgba(0,0,0,0)'); c.fillRect(-2.2, -2.2, 4.4, 4.4);
      const jump = Math.abs(Math.sin(t * 5.5)) * (0.06 + a.joy * 0.2 + a.hype * 0.3);
      c.fillStyle = `rgba(60,0,60,${0.35 - jump * 0.5})`; ell(c, 0, 1.12, 0.8 - jump * 0.6, 0.12); c.fill();
      const sy = 1 + Math.sin(t * 11) * (0.03 + a.hype * 0.05) + jump * 0.25, sx = 1 / Math.sqrt(sy);
      c.translate(0, 1.05 - jump); c.scale(sx, sy); c.translate(0, -1.05);
      for (const s of [-1, 1]) { const bx = s * 0.22, ex = s * (0.42 + Math.sin(t * 6 + s) * 0.08), ey = -1.36 + Math.cos(t * 7 + s) * 0.06; c.strokeStyle = '#b0126a'; c.lineWidth = 0.05; c.lineCap = 'round'; c.beginPath(); c.moveTo(bx, -0.78); c.quadraticCurveTo(bx + s * 0.02, -1.15, ex, ey); c.stroke(); c.fillStyle = s > 0 ? '#ffe84a' : '#7af7ff'; ell(c, ex, ey, 0.1, 0.1); c.fill(); c.strokeStyle = '#fff'; c.lineWidth = 0.03; c.beginPath(); c.arc(ex, ey, 0.06, t * 5, t * 5 + 3); c.stroke(); }
      const armY = mix(0.4, -0.6, Math.max(a.joy, a.hype)), wv = Math.sin(t * 13) * 0.1 * (0.3 + a.joy + a.hype);
      const handL = [-1.12, armY + wv], handR = mix2([1.12, armY - wv], [1.25, -0.25], a.cast * (1 - a.joy));
      for (const [s, hnd] of [[-1, handL], [1, handR]]) { limb(c, [[s * 0.78, 0.12], [s * 1.0, mix(0.35, -0.15, a.joy)], hnd], 0.17, '#ff4fa3'); c.fillStyle = '#ff7fbe'; ell(c, hnd[0], hnd[1], 0.13, 0.13); c.fill(); }
      if (a.cast > 0.05) { const r = 0.2 + a.cast * 0.25; c.fillStyle = rad(c, handR[0] + 0.1, handR[1], 0, r, '#ffffff', '#ffe84a', 'rgba(255,232,74,0)'); ell(c, handR[0] + 0.1, handR[1], r, r); c.fill(); }
      const wob = (i) => Math.sin(t * 6 + i * 1.7) * 0.025;
      const body = [[-0.72, 1.0], [-0.9 + wob(1), 0.3], [-0.66, -0.52 + wob(2)], [0, -0.9 + wob(3)], [0.66, -0.52 + wob(4)], [0.9 + wob(5), 0.3], [0.72, 1.0], [0.36, 1.1], [0, 1.02], [-0.36, 1.1]];
      c.fillStyle = lin(c, 0, -0.9, 0, 1.1, '#ffb0d8', '#ff4fa3', '#b0126a'); blob(c, body); c.fill();
      c.strokeStyle = '#7a0a4a'; c.lineWidth = 0.035; c.stroke();
      c.fillStyle = 'rgba(255,255,255,0.4)'; ell(c, -0.42, -0.42, 0.14, 0.3, 0.5); c.fill();
      c.fillStyle = 'rgba(255,255,255,0.22)'; for (const [x, y, r] of [[0.5, 0.6, 0.07], [0.3, 0.82, 0.045], [-0.5, 0.7, 0.05], [0.56, 0.2, 0.035]]) { ell(c, x, y, r, r); c.fill(); }
      const jit = Math.sin(t * 31) * 0.012 * (1 + a.hype * 2), big = 1 + a.antic * 0.15 + a.hype * 0.1;
      for (const s of [-1, 1]) {
        if (a.hype > 0.5) {
          c.fillStyle = '#fff'; ell(c, s * 0.3, -0.16, 0.25, 0.25); c.fill(); c.strokeStyle = '#12091c'; c.lineWidth = 0.04; c.stroke();
          c.strokeStyle = s > 0 ? '#ff2d6a' : '#3a5bff'; c.lineWidth = 0.045; c.beginPath();
          for (let q = 0; q < 12; q += 0.25) { const r = q * 0.017, ang = q + t * 9 * s; c[q ? 'lineTo' : 'moveTo'](s * 0.3 + Math.cos(ang) * r, -0.16 + Math.sin(ang) * r); }
          c.stroke();
        } else eye(c, s * 0.3 + jit, -0.16, 0.25 * big, 0.25 * big, a, '#3a5bff', 0.7);
      }
      const open = 0.14 + a.joy * 0.16 + a.hype * 0.14 + Math.max(0, Math.sin(t * 4)) * 0.04;
      c.fillStyle = '#5a0a35'; c.beginPath(); c.moveTo(-0.36, 0.24); c.quadraticCurveTo(0, 0.24 + open * 2.6, 0.36, 0.24); c.quadraticCurveTo(0, 0.3, -0.36, 0.24); c.fill();
      c.fillStyle = '#ff6b8a'; ell(c, 0.02, 0.26 + open * 1.0, 0.16, open * 0.5); c.fill();
      c.fillStyle = '#fff'; rr(c, -0.1, 0.26, 0.09, 0.08, 0.02); c.fill(); rr(c, 0.01, 0.26, 0.09, 0.08, 0.02); c.fill();
      c.fillStyle = 'rgba(255,255,255,0.35)'; ell(c, -0.58, 0.16, 0.11, 0.07); c.fill(); ell(c, 0.58, 0.16, 0.11, 0.07); c.fill();
      const cols = ['#ffe84a', '#7af7ff', '#ffffff', '#9dff6b', '#ff9a3d', '#b98aff'];
      for (let i = 0; i < 6; i++) { const ang = t * (1.4 + a.hype * 4) + (i * TAU) / 6; c.save(); c.translate(Math.cos(ang) * 1.15, 0.1 + Math.sin(ang) * 0.42); c.rotate(ang * 2); c.fillStyle = cols[i]; rr(c, -0.07, -0.025, 0.14, 0.05, 0.025); c.fill(); c.restore(); }
    },
  };
  function character(c, id, x, y, s, t, a) {
    c.save(); c.translate(x, y); c.scale(s, s);
    CHAR[id](c, t, a);
    c.restore();
  }

  const LIVE = {}; // optional per-theme background layer that is redrawn every frame: LIVE[id](c, w, h, t, bonus)
  return { THEMES, GLYPH, ICON, CHAR, SCENE, LIVE, FONT, sprite, drawWild, background, character, rr, lin, rad, ell, star, poly, blob, limb, shine, mix, mix2 };
})();
