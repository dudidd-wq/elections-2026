// Regression: every #/cities view covers all elections K21–K25 + 2026 (K26, partial). usage: node vscheck.mjs [BASE]
// Needs playwright-core and Chrome (run from a dir with playwright-core installed): node test/e2e/cities-vs.e2e.mjs [BASE]
// Bug [pt100u]: "בהשוואת יישובים אין את נתוני הבחירות האחרונות" — compare showed one election at a time and links opened it on an old one.
import { chromium } from 'playwright-core';
const BASE = process.argv[2] || 'http://127.0.0.1:8937/';
const KS = [21, 22, 23, 24, 25, 26];
const fail = [], errors = [];
const ok = (c, m) => { if (!c) fail.push(m); };
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
for (const w of [390, 1280]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 900 }, isMobile: w < 800, hasTouch: w < 800, locale: 'he-IL' });
  const page = await ctx.newPage(); const T = `${w}`;
  page.on('console', m => { if (m.type() === 'error') errors.push(`${T} console: ${m.text()}`); });
  page.on('pageerror', e => errors.push(`${T} pageerror: ${e.message}`));
  const go = async h => { await page.goto(BASE + h, { waitUntil: 'networkidle' }); await page.waitForSelector('#ct-method', { state: 'attached', timeout: 15000 }); await page.waitForTimeout(150); };
  const nat = await page.goto(BASE, { waitUntil: 'networkidle' }).then(() => page.evaluate(async () => (await (await fetch('data/cities/k26.json')).json()).national));
  // 1) compare, including when opened with an old k (the original repro), city vs nat and city vs city, and a locality new in 2026
  for (const h of ['#/cities/vs?a=5000&b=nat', '#/cities/vs?a=5000&b=3000&k=22', '#/cities/vs?a=7000&b=nat&k=21', '#/cities/vs?a=3869&b=5000']) {
    await go(h);
    const r = await page.evaluate(() => {
      const t = document.querySelector('table.ct-vs-t'), all = document.querySelector('table.ct-vs-all'), l = document.querySelector('table.ct-vs-l');
      return {
        ks: t ? [...t.querySelectorAll('tbody tr[data-ct-k]')].map(x => +x.getAttribute('data-ct-k')) : [],
        k26: t ? (t.querySelector('tr[data-ct-k26]') || {}).textContent || '' : '',
        head: t ? t.querySelector('thead').textContent : '',
        allHead: all ? [...all.querySelectorAll('thead th')].map(x => x.textContent) : [],
        allRows: all ? all.querySelectorAll('tbody tr').length : 0,
        lHead: l ? l.querySelector('thead').textContent : '', lRows: l ? l.querySelectorAll('tbody tr').length : 0,
        body: document.querySelector('main').textContent,
        charts: [...document.querySelectorAll('.ct-fig svg')].map(s => s.getAttribute('aria-label') || ''),
        csv: !!document.querySelector('table.ct-vs-all') && [...document.querySelectorAll('button')].filter(b => /CSV/.test(b.textContent)).length,
        ov: document.documentElement.scrollWidth - document.documentElement.clientWidth
      };
    });
    ok(JSON.stringify(r.ks) === JSON.stringify(KS), `${T} ${h} turnout/valid table elections ${r.ks}`);
    ok(/הצבעה/.test(r.head) && /כשרים/.test(r.head), `${T} ${h} turnout+valid columns missing: ${r.head}`);
    ok(/חלקי/.test(r.k26), `${T} ${h} 2026 row lacks partial label: ${r.k26}`);
    ok(/חלקית/.test(r.body) && /לא סופית/.test(r.body) && /לא רשמית/.test(r.body), `${T} ${h} partial/not final/not official label missing`);
    ok(/אין רשימה מקבילה/.test(r.body), `${T} ${h} "אין רשימה מקבילה" missing`);
    ok(r.allHead.length === 2 + KS.length && /2026/.test(r.allHead[r.allHead.length - 1]) && KS.every(k => r.allHead.some(x => x.includes('(' + k))), `${T} ${h} all-lists header: ${r.allHead}`);
    ok(r.allRows >= 3 * 13, `${T} ${h} all-lists rows ${r.allRows}`);
    ok(r.lRows >= 8 && /שינוי/.test(r.lHead), `${T} ${h} per-list table rows ${r.lRows} head ${r.lHead}`);
    ok(r.charts.length > 5 && /הכנסת ה-26/.test(r.charts[0]) && /הכנסת ה-21/.test(r.charts[0]), `${T} ${h} turnout chart lacks 21..26`);
    ok(r.csv >= 1, `${T} ${h} no CSV button on all-lists table`);
    ok(r.ov <= 0, `${T} ${h} page overflow ${r.ov}`);
  }
  // 2) 2026 values in compare match data/cities/k26.json (Tel Aviv vs national)
  await go('#/cities/vs?a=5000&b=nat');
  const v = await page.evaluate(() => [...document.querySelectorAll('table.ct-vs-t tr[data-ct-k26] td')].map(x => x.textContent.trim()));
  const pc = (a, b) => (100 * a / b).toFixed(1);
  ok(v.some(x => x.includes(pc(nat[1], nat[0]))), `${T} national 2026 turnout ${pc(nat[1], nat[0])} not in ${v}`);
  // 3) city page: turnout table covers every election the locality has; election select has 21..26
  await go('#/cities/5000');
  const c = await page.evaluate(() => ({ opts: [...document.querySelectorAll('select[data-ck] option')].map(o => +o.value), body: document.querySelector('main').textContent }));
  ok(JSON.stringify(c.opts) === JSON.stringify(KS), `${T} city page election select ${c.opts}`);
  ok(KS.every(k => c.body.includes('(' + k) || c.body.includes('ה-' + k) || c.body.includes(String(2019))) && /2026/.test(c.body), `${T} city page lacks 2026`);
  // 4) per-list view: select 21..26
  await go('#/cities/list');
  const lo = await page.evaluate(() => [...document.querySelectorAll('select[data-ck] option')].map(o => +o.value));
  ok(JSON.stringify(lo) === JSON.stringify(KS), `${T} per-list election select ${lo}`);
  // 5) command palette finds a locality that exists only in 2026 and offers compare
  await page.goto(BASE + '#/', { waitUntil: 'networkidle' });
  await page.keyboard.press('Control+k'); await page.waitForSelector('#kp-q');
  await page.fill('#kp-q', 'אביגיל'); await page.waitForTimeout(1500);
  const pal = await page.evaluate(() => [...document.querySelectorAll('#kp-list .kp-o')].map(x => x.textContent));
  ok(pal.some(x => /אביגיל/.test(x)), `${T} palette lacks 2026-only locality אביגיל: ${pal}`);
  await page.fill('#kp-q', 'תל אביב'); await page.waitForTimeout(500);
  const pal2 = await page.evaluate(() => [...document.querySelectorAll('#kp-list .kp-o')].map(x => x.textContent));
  ok(pal2.some(x => /2019–2026/.test(x)), `${T} palette lacks compare 2019–2026 entry`);
  await ctx.close();
}
await browser.close();
console.log(JSON.stringify({ fail, errors }, null, 1));
process.exit(fail.length || errors.length ? 1 : 0);
