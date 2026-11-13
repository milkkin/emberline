'use strict';
// Builds the solo (no-server) version into phone/: the same page and scripts as public/,
// plus phone/local-backend.js, which answers the API calls inside the browser.
//
//   node tools/build-phone.js
const fs = require('fs');
const path = require('path');
const pub = path.join(__dirname, '..', 'public');
const out = path.join(__dirname, '..', 'phone');

for (const f of ['style.css', 'app.js', 'slots-engine.js', 'slots-math.js', 'slots-art.js', 'slots-art2.js', 'slots-art3.js', 'slots-art4.js', 'slots.js']) fs.copyFileSync(path.join(pub, f), path.join(out, f));
let html = fs.readFileSync(path.join(pub, 'index.html'), 'utf8');
html = html.replace('<script src="app.js"></script>', '<script src="local-backend.js"></script>\n<script src="app.js"></script>');
html = html.replace('<script src="https://telegram.org/js/telegram-web-app.js"></script>\n', ''); // the solo build never talks to Telegram
if (!html.includes('local-backend.js')) throw new Error('index.html changed: could not add the local backend');
fs.writeFileSync(path.join(out, 'index.html'), html);
console.log('built', out);
