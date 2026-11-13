'use strict';
// One-time Telegram setup: points your bot at your hosted Emberline server.
// Run it on the machine that hosts the server, with these environment variables set:
//
//   TELEGRAM_BOT_TOKEN       the token BotFather gave you (keep it secret)
//   TELEGRAM_WEBHOOK_SECRET  any long random string; the server must be started with the same one
//   PUBLIC_URL               the https address of your server, e.g. https://emberline.example.com
//                            (on Render this is filled in automatically)
//
//   node tools/telegram-setup.js
const token = process.env.TELEGRAM_BOT_TOKEN, secret = process.env.TELEGRAM_WEBHOOK_SECRET, url = (process.env.PUBLIC_URL || process.env.RENDER_EXTERNAL_URL || '').replace(/\/+$/, '');
if (!token || !secret || !/^https:\/\//.test(url)) {
  console.error('Set TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET and PUBLIC_URL (must start with https://) first.');
  process.exit(1);
}
if (!/^[A-Za-z0-9_-]{1,256}$/.test(secret)) {
  console.error('TELEGRAM_WEBHOOK_SECRET may only contain letters, numbers, "_" and "-".');
  process.exit(1);
}
async function call(method, payload) {
  const r = await fetch(`https://api.telegram.org/bot${token}/${method}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload || {}) });
  const j = await r.json();
  if (!j.ok) throw new Error(`${method} failed: ${j.description}`);
  return j.result;
}
(async () => {
  const me = await call('getMe');
  console.log(`Bot: @${me.username}`);
  // payments and their confirmations arrive here
  await call('setWebhook', { url: `${url}/api/telegram/webhook`, secret_token: secret, allowed_updates: ['message', 'pre_checkout_query'] });
  console.log(`Webhook set to ${url}/api/telegram/webhook`);
  // the button next to the message box that opens the game
  await call('setChatMenuButton', { menu_button: { type: 'web_app', text: 'Play', web_app: { url: `${url}/` } } });
  console.log('Menu button "Play" now opens the game.');
  await call('setMyCommands', { commands: [{ command: 'start', description: 'Open Emberline' }, { command: 'paysupport', description: 'Help with a purchase' }] });
  const page = await fetch(`${url}/api/shop`).then((r) => r.json()).catch(() => null);
  console.log(page ? `Server reachable. Shop enabled: ${page.enabled}` : 'Warning: could not reach the server at PUBLIC_URL.');
  console.log(`Done. Open https://t.me/${me.username} and tap Play.`);
})().catch((e) => { console.error(e.message); process.exit(1); });
