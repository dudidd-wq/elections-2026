// Data test for data/exitpolls.json. No dependencies: `node test/exitpolls.test.mjs`
// Recomputes every metric independently and compares with the JSON and with js/app.js epMetrics().
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const D = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/exitpolls.json'), 'utf8'));
const app = fs.readFileSync(path.join(ROOT, 'js/app.js'), 'utf8');
let fails = 0, checks = 0;
const ok = (c, m) => { checks++; if (!c) { fails++; console.log('FAIL', m); } };
const near = (a, b) => Math.abs(a - b) < 1e-6;
// app.js metric function, extracted verbatim
const src = app.slice(app.indexOf('function epMetrics('), app.indexOf('function epCh('));
const epMetrics = new Function(src + '; return epMetrics;')();
const isUrl = u => /^https?:\/\/[^\s]+$/.test(u || '');
const isDate = s => /^\d{4}-\d{2}-\d{2}$/.test(s || '');
const nonWiki = ss => ss.filter(s => !/wikipedia\.org/.test(s.url));
const ids = new Set();
let all = [], within = 0, nPred = 0;
const LM = D.meta.largeMin;
for (const c of D.campaigns) {
  ok(isUrl(c.cec.url) && isDate(c.cec.retrieved), `${c.id} CEC source`);
  ok(isUrl(c.bloc.source.url) && isDate(c.bloc.source.retrieved), `${c.id} bloc source`);
  const actual = Object.fromEntries(c.lists.map(l => [l.id, l.seats]));
  ok(Object.values(actual).reduce((a, b) => a + b, 0) === 120, `${c.id} actual sums to 120`);
  ok(c.bloc.lists.every(i => i in actual), `${c.id} bloc ids known`);
  ok(c.bloc.seats === c.bloc.lists.reduce((s, i) => s + actual[i], 0), `${c.id} bloc seats`);
  ok(c.lists.every(l => l.inBloc === c.bloc.lists.includes(l.id)), `${c.id} inBloc flags`);
  for (const p of c.polls) {
    const tag = p.id;
    ok(!ids.has(p.id), `${tag} unique id`); ids.add(p.id);
    ok(['kan', 'c12', 'c13', 'c14'].includes(p.channel), `${tag} channel`);
    ok(p.sources.length > 0 && p.sources.every(s => isUrl(s.url) && isDate(s.retrieved)), `${tag} every source has URL + retrieval date`);
    const nw = nonWiki(p.sources).length;
    ok(nw >= 1, `${tag} at least one non-Wikipedia source`);
    const nc = nonWiki((p.conflicts || []).flatMap(x => x.sources)).length;
    ok(p.status === 'single-source' ? nw >= 1 : p.status === 'conflict' ? nw + nc >= 2 : nw >= 2, `${tag} status ${p.status} vs ${nw} non-wiki sources`);
    ok(Object.keys(p.seats).length === c.lists.length && c.lists.every(l => Number.isInteger(p.seats[l.id]) && p.seats[l.id] >= 0), `${tag} seats for every list`);
    ok(Object.values(p.seats).reduce((a, b) => a + b, 0) === 120, `${tag} poll sums to 120`);
    // independent recomputation
    const diff = {}; let sa = 0, w1 = 0, ex = 0, big = [], small = [], thr = [], pb = 0, ab = 0;
    for (const l of c.lists) { const d = p.seats[l.id] - l.seats; diff[l.id] = d; sa += Math.abs(d); if (Math.abs(d) <= 1) w1++; if (!d) ex++; (l.seats >= LM ? big : small).push(Math.abs(d)); if ((p.seats[l.id] > 0) !== (l.seats > 0)) thr.push(l.id); if (c.bloc.lists.includes(l.id)) { pb += p.seats[l.id]; ab += l.seats; } }
    const m = p.metrics, avg = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;
    ok(JSON.stringify(m.diff) === JSON.stringify(diff), `${tag} diff`);
    ok(m.sumAbs === sa && near(m.misallocated, sa / 2) && sa % 2 === 0, `${tag} sumAbs/misallocated`);
    ok(m.within1 === w1 && m.exact === ex && m.n === c.lists.length, `${tag} within1/exact/n`);
    ok(near(m.maeLarge, avg(big)) || Math.abs(m.maeLarge - avg(big)) < 0.001, `${tag} maeLarge`);
    ok(Math.abs(m.maeSmall - avg(small)) < 0.001, `${tag} maeSmall`);
    ok(m.bloc === pb && m.blocActual === ab && m.blocErr === pb - ab && ab === c.bloc.seats, `${tag} bloc`);
    ok(JSON.stringify(m.thresholdMisses.slice().sort()) === JSON.stringify(thr.slice().sort()), `${tag} threshold misses`);
    const am = epMetrics(c.lists, p.seats, c.bloc.lists, LM);
    ok(am.misallocated === m.misallocated && am.blocErr === m.blocErr && am.within1 === m.within1 && JSON.stringify(am.thresholdMisses.sort()) === JSON.stringify(thr.sort()), `${tag} app.js epMetrics agrees`);
    if (p.kind === 'initial') { all.push({ c, p }); within += w1; nPred += c.lists.length; }
    for (const x of (p.conflicts || [])) ok(x.sources.every(s => isUrl(s.url)), `${tag} conflict sources`);
  }
  for (const x of c.partial) ok(x.sources.every(s => isUrl(s.url) && isDate(s.retrieved)), `${c.id} partial sources`);
}
// summary
const S = D.summary;
ok(S.nInitial === all.length && all.length === 16, `16 initial polls (got ${all.length})`);
ok(near(S.meanMisallocated, all.reduce((s, o) => s + o.p.metrics.misallocated, 0) / all.length), 'mean misallocated');
ok(Math.abs(S.within1Share - within / nPred) < 1e-4, 'within1 share');
for (const [ch, v] of Object.entries(S.byChannel)) {
  const xs = all.filter(o => o.p.channel === ch).map(o => o.p.metrics.misallocated);
  ok(v.n === xs.length && near(v.mean, xs.reduce((a, b) => a + b, 0) / xs.length) && v.min === Math.min(...xs) && v.max === Math.max(...xs), `byChannel ${ch}`);
}
// y2026 hooks
const y = D.y2026;
ok(y && y.date === '2026-10-27' && Array.isArray(y.polls) && Array.isArray(y.lists), 'y2026 present');
for (const p of y.polls) {
  ok(p.sources.every(s => isUrl(s.url)), `2026 ${p.id} sources`);
  ok(Object.values(p.seats).reduce((a, b) => a + b, 0) === 120, `2026 ${p.id} sums to 120`);
}
if (y.results) ok(Object.values(y.results.seats).reduce((a, b) => a + b, 0) === 120 && isUrl(y.results.source.url), '2026 results');
// hygiene
const blob = JSON.stringify(D);
ok(!/api[_-]?key|token=|secret/i.test(blob), 'no keys in data');
ok(!/תחזית ל-2026|ינצח|כדאי להצביע/.test(blob), 'no forecast / recommendation wording in data');
console.log(`${checks - fails}/${checks} checks passed`);
process.exit(fails ? 1 : 0);
