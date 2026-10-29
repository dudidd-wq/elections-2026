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
const { epMetrics, ep26Cmp } = new Function(src + '; return { epMetrics: epMetrics, ep26Cmp: typeof ep26Cmp === "function" ? ep26Cmp : null };')();
const PD = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/polls.json'), 'utf8'));
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
const yCh = y.channels || {};
ok(Object.keys(yCh).every(k => !(k in D.meta.channels)), '2026-only channels are not in meta.channels (2019–2022 charts unchanged)');
ok(Object.keys(D.meta.channels).join() === 'kan,c12,c13,c14', 'meta.channels unchanged');
ok(!y.polls.length || /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}[+-]\d{2}:\d{2}$/.test(y.updatedAt || ''), '2026 updatedAt stamp');
const pids = new Set();
for (const p of y.polls) {
  ok(p.channel in D.meta.channels || p.channel in yCh, `2026 ${p.id} channel known`);
  ok(!pids.has(p.id), `2026 ${p.id} unique`); pids.add(p.id);
  ok(p.sources.length >= 2 && new Set(p.sources.map(s => s.url)).size === p.sources.length, `2026 ${p.id} >=2 distinct sources`);
  ok(y.lists.every(l => Number.isInteger(p.seats[l.id]) && p.seats[l.id] >= 0) && Object.keys(p.seats).length === y.lists.length, `2026 ${p.id} seats for every list`);
  ok(Object.values(p.seats).every(v => v === 0 || v >= 4), `2026 ${p.id} no list with 1–3 seats`);
}
ok(y.polls.filter(p => p.kind === 'initial').length === new Set(y.polls.filter(p => p.kind === 'initial').map(p => p.channel)).size, '2026 one initial per channel');
if (y.count) {
  const c = y.count, sum = Object.values(c.pct).reduce((a, b) => a + b, 0);
  ok(c.sources.length >= 2 && c.sources.every(s => isUrl(s.url)), '2026 count sources');
  ok(Object.keys(c.pct).every(k => y.lists.some(l => l.id === k)) && sum <= 100 && sum > 50, `2026 count shares (sum ${sum.toFixed(2)})`);
  ok(/חלקית/.test(c.label) || (/לא סופית/.test(c.label) && /לא רשמית/.test(c.label)), '2026 count labelled partial / not final');
  ok(!y.results || !/לא רשמי/.test(c.label), 'no set-results while not certified');
  if (c.voters && c.eligible) ok(Math.abs(c.voters / c.eligible * 100 - c.turnout) < 0.05, '2026 turnout = voters / eligible');
}
// ep26Cmp (poll average + each pollster vs a seat result), recomputed independently on a synthetic result
ok(typeof ep26Cmp === 'function', 'ep26Cmp present in app.js');
if (ep26Cmp && y.polls.length) {
  const fake = { seats: { ...y.polls[0].seats } };
  const X = ep26Cmp(y, PD, fake);
  const ids13 = y.lists.map(l => l.id);
  const mis = s => ids13.reduce((t, id) => t + Math.abs((s[id] || 0) - fake.seats[id]), 0) / 2;
  ok(near(X.rows[0].misallocated, Math.round(mis(PD.computed.average) * 100) / 100), 'ep26Cmp average misallocated');
  ok(X.rows.filter(r => r.kind === 'poll').length === PD.computed.n, 'ep26Cmp one row per poll in the average');
  for (const r of X.rows.filter(r => r.kind === 'poll')) { const p = PD.polls.find(q => q.id === r.id); ok(near(r.misallocated, mis(p.seats)), `ep26Cmp ${r.id}`); }
  const r0 = X.rows.find(r => r.id === y.polls[0].id); ok(r0 && r0.misallocated === 0 && Object.values(r0.blocs).every(b => b.err === 0), 'ep26Cmp identical poll -> 0 error');
  for (const b of X.blocs) ok(b.result === PD.blocs.find(q => q.id === b.id).members.reduce((t, m) => t + (fake.seats[m] || 0), 0), `ep26Cmp bloc ${b.id}`);
  ok(!X.blocs.some(b => b.id === 'other'), 'ep26Cmp site blocs only');
}
if (y.results) ok(Object.values(y.results.seats).reduce((a, b) => a + b, 0) === 120 && isUrl(y.results.source.url), '2026 results');
// hygiene
const blob = JSON.stringify(D);
ok(!/api[_-]?key|token=|secret/i.test(blob), 'no keys in data');
ok(!/תחזית ל-2026|ינצח|כדאי להצביע/.test(blob), 'no forecast / recommendation wording in data');
console.log(`${checks - fails}/${checks} checks passed`);
process.exit(fails ? 1 : 0);
