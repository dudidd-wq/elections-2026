// Data test for data/outlook.json and the #/outlook page. No dependencies: `node test/outlook.test.mjs`
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const O = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/outlook.json'), 'utf8'));
const EP = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/exitpolls.json'), 'utf8'));
const app = fs.readFileSync(path.join(ROOT, 'js/app.js'), 'utf8');
let fails = 0, checks = 0;
const ok = (c, m) => { checks++; if (!c) { fails++; console.log('FAIL', m); } };
const sum = o => Object.values(o).reduce((a, b) => a + b, 0);
const eq = (a, b) => JSON.stringify(Object.keys(a).sort().map(k => [k, a[k]])) === JSON.stringify(Object.keys(b).sort().map(k => [k, b[k]]));
// page code, extracted verbatim from app.js
const s0 = app.indexOf('  var OL = null'), s1 = app.indexOf('  var TITLES = {');
ok(s0 > 0 && s1 > s0, 'outlook block found');
const block = app.slice(s0, s1);
const COLL = new Intl.Collator('he');
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const stub = { esc, COLL, getJSON: () => Promise.resolve(O), fmtStamp: s => s, fmtShort: s => s.slice(5, 10), fmtN: x => (Math.round(x * 10) / 10).toFixed(1), orderNote: () => 'סדר אלפביתי', srcLink: (u, l) => '<a href="' + esc(u) + '">' + esc(l || 'מקור') + '</a>', head: (e, t, l) => '<h1>' + t + '</h1><p>' + l + '</p>' };
const f = new Function(...Object.keys(stub), block + '; return { olBO, pageOutlook, olThink, setOL: function (d) { OL = d; } };')(...Object.values(stub));
f.setOL(O);
const html = f.pageOutlook();
const text = html.replace(/<[^>]+>/g, ' ');
const AG = O.agreements;
// 1. Bader–Ofer reproduces the published unofficial allocations
const c1244 = { likud: 26, yashar: 21, beyachad: 12, joint: 11, dems: 8, raam: 8, yb: 7, otzma: 7, utj: 7, shas: 7, rzz: 6, miluim: 0, amcha: 0 };
const c1132 = Object.assign({}, c1244, { likud: 27, raam: 7 });
ok(eq(O.checks.machria1244, c1244), 'python BO = machria 12:44');
const c1804 = Object.assign({}, c1244, { likud: 27, shas: 6 });
ok(eq(O.checks.machria1804, c1804), 'python BO = machria 18:04');
ok(eq(O.checks.iie1132NoAgreements, c1132), 'python BO = IIE 11:32 (no agreements)');
const v1244 = { likud: 1113916, yashar: 871828, beyachad: 496469, joint: 487472, dems: 349488, raam: 325192, yb: 321049, otzma: 304809, utj: 301487, shas: 285598, rzz: 265109, miluim: 144766, amcha: 88718 }; v1244.other = 5409377 - sum(v1244);
const v1116 = { likud: 1104055, yashar: 864323, beyachad: 489995, joint: 484083, dems: 346632, raam: 322775, yb: 317770, otzma: 300676, utj: 299052, shas: 282835, rzz: 260264, miluim: 142768, amcha: 87440 }; v1116.other = 5355415 - sum(v1116);
ok(eq(f.olBO(v1244, AG), c1244), 'JS BO = machria 12:44');
ok(eq(f.olBO(v1116), c1132), 'JS BO = IIE 11:32');
// K25 official seats without agreements are not needed to match exactly (agreements mattered); check the official K25 with its own agreements is not modelled -> only sum
for (const s of O.compare.counts) { ok(sum(s.seats) === 120, `count ${s.asOf} sums to 120`); }
// 2. sums to 120, ranges contain medians, distributions sum to ~100
ok(sum(O.modal) === 120, 'modal sums to 120');
ok(sum(O.midScenario.seats) === 120, 'mid scenario sums to 120');
for (const p of O.projection) {
  ok(p.seats.p10 <= p.seats.p50 && p.seats.p50 <= p.seats.p90, `${p.id} seat range contains median`);
  ok(p.pct.p10 <= p.pct.p50 && p.pct.p50 <= p.pct.p90, `${p.id} pct range contains median`);
  ok(Math.abs(sum(p.pSeats) - 100) < 0.5, `${p.id} pSeats ~100`);
  ok(p.seats.p50 === 0 || p.pct.p50 >= 3.25, `${p.id} threshold consistent`);
}
for (const b of O.blocs) { ok(b.p10 <= b.p50 && b.p50 <= b.p90, `${b.id} bloc range contains median`); ok(Math.abs(sum(b.dist) - 100) < 0.5, `${b.id} bloc dist`); }
ok(sum(Object.fromEntries(O.blocs.map(b => [b.id, b.p50]))) >= 118 && sum(Object.fromEntries(O.blocs.map(b => [b.id, b.p50]))) <= 122, 'bloc medians ≈120');
ok(O.blocs.every(b => b.members.every(m => O.projection.some(p => p.id === m))) && new Set(O.blocs.flatMap(b => b.members)).size === O.projection.length, 'blocs partition the lists');
for (const p of O.compare.polls) ok(sum(p.seats) === 120, `${p.id} poll sums to 120`);
for (const h of O.history) {
  const c = EP.campaigns.find(c => c.knesset === h.k);
  ok(c && c.bloc.seats === h.blocSeats, `K${h.k} bloc = exitpolls.json`);
  ok(h.turnout > 60 && h.turnout < 80 && h.envShare > 0 && h.envShare < 15, `K${h.k} sane`);
}
for (const b of O.backtest) ok(b.mae <= b.maxErr && b.mae >= 0, `backtest K${b.k}`);
ok(Math.abs(O.backtestSummary.mae - O.backtest.reduce((a, b) => a + b.mae, 0) / O.backtest.length) < 0.001, 'backtest summary mae');
// 3. page numbers = data
for (const p of O.projection) {
  const row = html.match(new RegExp('<tr data-ol="' + p.id + '">.*?</tr>', 'g')) || [];
  ok(row.length === 2, `${p.id} two rows`);
  ok(row[0] && row[0].includes('<b data-ol-pct>' + p.pct.p50.toFixed(2) + '%</b>'), `${p.id} pct on page`);
  ok(row[1] && row[1].includes('<b data-ol-seat>' + p.seats.p50 + '</b>'), `${p.id} seat median on page`);
  const rng = p.seats.p10 === p.seats.p90 ? String(p.seats.p50) : p.seats.p10 + '–' + p.seats.p90;
  ok(row[1] && row[1].includes('<td class="n" data-ol-rng>' + rng + '</td>'), `${p.id} seat range on page`);
}
ok(text.includes(O.disclaimer), 'disclaimer shown');
ok(text.includes(O.backtestSummary.mae.toFixed(3)), 'backtest mae shown');
for (const b of O.blocs.filter(b => b.p90 > 0)) ok(text.includes(b.p50 + (b.p10 !== b.p90 ? ' (' + b.p10 + '–' + b.p90 + ')' : '')), `bloc ${b.id} in think text`);
// 4. alphabetical order in every per-list table
const order = O.projection.map(p => p.name).sort(COLL.compare);
const rows = [...html.matchAll(/<tr data-ol="(\w+)">/g)].map(m => O.projection.find(p => p.id === m[1]).name);
ok(JSON.stringify(rows.slice(0, order.length)) === JSON.stringify(order) && JSON.stringify(rows.slice(order.length)) === JSON.stringify(order), 'alphabetical order');
// 5. no party colours, neutral language
ok(!/COLOR\[|class="dot"|--c:|style="/.test(block), 'no party colours / inline styles');
ok(!/ממליץ|מומלץ|כדאי להצביע|ירכיב את הממשלה|תרכיב את הממשלה|הקואליציה הבאה תהיה/.test(text), 'no recommendation / government prediction');
ok(/index\.html/.test('index.html') && fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').includes('href="#/outlook" data-nav="outlook"'), 'nav link');
ok(fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8').includes("'data/outlook.json'"), 'sw caches outlook.json');
// 6. retrospective vs completed (not certified) count
const R = O.retro, PUB = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/outlook_published.json'), 'utf8'));
const c1958 = Object.assign({}, c1244, { likud: 27, shas: 6 });
ok(eq(O.checks.machria1958, c1958) && eq(R.actual.seats, c1958), 'python BO = machria 19:58 (27/21/12/11/8/8/7/7/7/6/6)');
const v1958 = Object.assign({}, R.actual.votes); v1958.other = R.actual.valid - sum(v1958);
ok(eq(f.olBO(v1958, AG), c1958), 'JS BO = machria 19:58');
ok(sum(R.actual.votes) + v1958.other === 5678352 && v1958.other === 57259, 'valid/other 19:58');
ok(eq(EP.y2026.count.pct ? Object.fromEntries(Object.keys(R.actual.votes).map(k => [k, Math.round(R.actual.votes[k] / R.actual.valid * 10000) / 100])) : {}, EP.y2026.count.pct), 'exitpolls count pct = votes/valid');
ok(PUB.published.length === R.estimates.length, 'one retro per published estimate');
for (const e of R.estimates) {
  const P = PUB.published.find(x => x.commit === e.commit);
  for (const x of e.rows) {
    ok(x.p50 === P.lists[x.id].pct.p50 && x.modal === P.modal[x.id], `${e.commit} ${x.id} = as published`);
    ok(Math.abs(x.err - (x.p50 - 100 * R.actual.votes[x.id] / R.actual.valid)) < 0.0006, `${e.commit} ${x.id} err`);
    ok(x.inside === (x.p10 - 0.005 <= 100 * R.actual.votes[x.id] / R.actual.valid && 100 * R.actual.votes[x.id] / R.actual.valid <= x.p90 + 0.005), `${e.commit} ${x.id} inside flag`);
  }
  ok(Math.abs(e.mae - e.rows.reduce((a, x) => a + Math.abs(x.err), 0) / e.rows.length) < 0.0006, `${e.commit} mae`);
  ok(e.remainingActual === R.actual.valid - e.basisValid, `${e.commit} remaining`);
  ok(html.includes('<b data-retro-mae>' + e.mae.toFixed(3) + '</b>'), `${e.commit} mae on page`);
}
for (const k of Object.keys(c1958)) if (c1958[k]) ok(html.includes('<span data-retro-final="' + k + '">' + c1958[k] + '</span>'), `final seats ${k} on page`);
const retroTxt = (html.split('<section aria-labelledby="ol-r">')[1] || '').split('</section>')[0].replace(/<[^>]+>/g, ' ');
ok(retroTxt.length > 500 && !/סופי|רשמי/.test(retroTxt.replace(/אינן סופיות ואינן רשמיות|לא סופיות ולא רשמיות|לא סופי ולא רשמי|אינן סופיות, הרשמיות|תוצאות רשמיות אחרי|חלוקה רשמית|את התוצאות הרשמיות/g, '')), 'retro: no final/official claim');
ok(text.includes('לא סופיות ולא רשמיות'), 'not-final label shown');
console.log(`${checks - fails}/${checks} checks passed`);
process.exit(fails ? 1 : 0);
