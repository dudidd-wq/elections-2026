// #/geo shows 2026 (K26) at LOCALITY level only, from data/cities/k26.json, with its status label; figures equal #/cities.
// Needs playwright-core and Chrome: node test/e2e/geo-k26.e2e.mjs [BASE]
import { chromium } from 'playwright-core';
const BASE = process.argv[2] || 'http://127.0.0.1:8937/';
const CODES = [3000, 6100, 5000, 4000, 7000, 70, 7900, 8800, 2610, 9000, 1309, 2710, 1161, 7300, 3869]; // Jerusalem, Bnei Brak, Tel Aviv, Haifa, Lod, Ashdod, Petah Tikva, Shefa-Amr, Bet Shemesh, Beer Sheva, Elad, Umm al-Fahm, Rahat, Nazareth, Avigayil (new in 2026)
const fail = [], errors = [];
const ok = (c, m) => { if (!c) fail.push(m); };
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const page = await browser.newPage({ locale: 'he-IL' });
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
await page.goto(BASE, { waitUntil: 'networkidle' });
const K = await page.evaluate(async () => (await (await fetch('data/cities/k26.json')).json()));
const label = K.statusLabel, pct = (a, b) => (100 * a / b).toFixed(1) + '%';
const main = () => page.evaluate(() => document.querySelector('main').innerText);
// national
await page.goto(BASE + '#/geo?k=26', { waitUntil: 'networkidle' }); await page.waitForSelector('#geo-method', { timeout: 15000 });
let t = await main();
ok(t.includes('ברמת יישוב בלבד, אין קלפיות ל-2026'), 'national: locality-only label');
ok(t.includes(label), 'national: statusLabel');
ok(!/תוצאות סופיות לפי יישוב[^.]*\bהן\b/.test(t), 'no final claim');
ok(await page.$eval('#geo-k', s => s.value) === '26', 'national: 2026 selected');
ok(await page.$$eval('#geo-k option', o => o.map(x => x.value).join()) === '21,22,23,24,25,26', 'options 21–26');
await page.goto(BASE + '#/geo', { waitUntil: 'networkidle' }); await page.waitForSelector('#geo-2026', { timeout: 15000 });
ok((await main()).includes(label), 'default national view carries label');
for (const c of CODES) {
  const r = K.rows.find(x => x[0] === c); if (!r) { fail.push('no k26 row ' + c); continue; }
  await page.goto(BASE + `#/geo/${c}?k=26`, { waitUntil: 'networkidle' }); await page.waitForSelector('#geo-kd', { timeout: 15000 });
  t = await main();
  const g = await page.evaluate(() => {
    const tr = [...document.querySelectorAll('table')].find(x => /אחוז ההצבעה לפי מערכת/.test(x.closest('[aria-label]')?.getAttribute('aria-label') || ''));
    const row = tr ? [...tr.querySelectorAll('tbody tr')].find(x => /2026/.test(x.cells[0].textContent)) : null;
    const lt = [...document.querySelectorAll('[aria-label^="קולות לפי רשימה"] tbody tr')].map(x => [x.cells[0].textContent, x.cells[1].textContent.replace(/\D/g, '')]);
    return { turnout: row ? row.cells[3].textContent : null, lists: lt, boxes: !!document.querySelector('[aria-label^="קלפיות, "]') };
  });
  ok(t.includes(label), `${c}: statusLabel`);
  ok(t.includes('ברמת יישוב בלבד, אין קלפיות ל-2026'), `${c}: locality-only`);
  ok(!g.boxes, `${c}: no 2026 box table`);
  ok(g.turnout === pct(r[2], r[1]), `${c}: turnout ${g.turnout} vs ${pct(r[2], r[1])}`);
  K.lists.forEach((l, i) => { const x = g.lists.find(y => y[0].startsWith(l.n)); ok(x && +x[1] === r[5 + i], `${c} ${l.l}: ${x && x[1]} vs ${r[5 + i]}`); });
  // same locality on #/cities
  await page.goto(BASE + `#/cities/${c}`, { waitUntil: 'networkidle' }); await page.waitForSelector('#ct-method', { state: 'attached', timeout: 15000 });
  const ct = await page.evaluate(() => (document.querySelector('tr[data-ct-k26] [data-ct-turnout]') || {}).textContent);
  ok(ct === g.turnout, `${c}: #/cities turnout ${ct} = #/geo ${g.turnout}`);
}
await browser.close();
if (errors.length) fail.push(...errors);
console.log(fail.length ? 'FAIL\n' + fail.join('\n') : `geo-k26 e2e OK (${CODES.length} localities)`);
process.exit(fail.length ? 1 : 0);
