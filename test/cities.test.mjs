// Data test for #/cities (data/cities/*, data/geo/k21–k25). No dependencies: `node test/cities.test.mjs`
// Rendered-page checks (values on the page vs these files, axe, overflow) are in the audit citysmoke.mjs.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const J = p => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
let fails = 0, checks = 0;
const ok = (c, m) => { checks++; if (!c) { fails++; if (fails < 40) console.log('FAIL', m); } };
const IX = J('data/geo/index.json'), K26 = J('data/cities/k26.json'), LIN = J('data/cities/lineage.json');
const COLL = new Intl.Collator('he');

// 1. K21–K25: locality rows (incl. the envelopes row) reconcile with the national totals and the per-list votes
for (const e of IX.elections) {
  const K = J(`data/geo/k${e.k}.json`), tot = new Array(K.cols.length).fill(0);
  for (const r of K.rows) r.forEach((x, i) => { if (i) tot[i] += x; });
  ['eligible', 'voters', 'invalid', 'valid'].forEach((c, i) => ok(tot[i + 1] === e.national[i], `K${e.k} ${c} ${tot[i + 1]} vs ${e.national[i]}`));
  e.lists.forEach(L => { const j = K.cols.indexOf(L.l); ok(j > 4 && tot[j] === L.v, `K${e.k} list ${L.l}`); });
  ok(tot.slice(5).reduce((a, b) => a + b, 0) === e.national[3], `K${e.k} list columns sum to valid`);
}

// 2. K26 (partial): status wording, source, and reconciliation with machria 18:04 (exact national count)
ok(K26.k === 26 && K26.status === 'partial', 'k26 status partial');
ok(/חלקית/.test(K26.statusLabel) && /לא סופית/.test(K26.statusLabel) && /לא רשמית/.test(K26.statusLabel), 'k26 label partial / not final / not official');
const claims = JSON.stringify(K26).replace(/(לא|ואינם|ואינן|אינם|אינן|ולא)\s+(סופי|רשמי)\S*/g, '');
ok(!/(סופי|רשמי)/.test(claims.replace(/תוצאות האמת|הקבצים הרשמיים/g, '')), 'k26: no final/official claim except negations');
ok(/^https:\/\//.test(K26.src.url) && K26.src.retrieved && K26.src.sourceUpdatedAt && /^[0-9a-f]{64}$/.test(K26.src.sha256), 'k26 source recorded');
const MACHRIA_1804 = { valid: 5653178, invalid: 25633, votes: { likud: 1159791, yashar: 907566, beyachad: 527064, joint: 498763, dems: 364053, raam: 335391, yb: 335185, otzma: 323800, utj: 311473, shas: 297889, rzz: 286934, miluim: 153674, amcha: 94655 } };
const t26 = new Array(K26.cols.length).fill(0);
for (const r of K26.rows) r.forEach((x, i) => { if (i) t26[i] += x; });
ok(K26.national[3] === MACHRIA_1804.valid && K26.national[2] === MACHRIA_1804.invalid, 'k26 national = machria 18:04');
[1, 2, 3, 4].forEach(i => ok(t26[i] === K26.national[i - 1], `k26 rows sum col ${K26.cols[i]}`));
K26.lists.forEach(L => {
  const j = K26.cols.indexOf(L.l);
  ok(j > 4 && t26[j] === L.v, `k26 list column ${L.l}`);
  ok(MACHRIA_1804.votes[L.id] === L.v, `k26 ${L.id} ${L.v} = machria ${MACHRIA_1804.votes[L.id]}`);
  ok(!('c' in L) && !('color' in L), `k26 ${L.id} has no colour`);
});
ok(Object.keys(MACHRIA_1804.votes).length === K26.lists.length, 'k26: all 13 lists');
const env = K26.rows.find(r => r[0] === IX.envelopesCode);
ok(env && env.slice(1, 5).join() === K26.envelopes.join(), 'k26 envelopes row');
ok(K26.rows.filter(r => r[0] !== IX.envelopesCode).length === K26.localities, 'k26 locality count');
ok(t26.slice(5).reduce((a, b) => a + b, 0) === K26.national[3], 'k26 list columns sum to valid');
// every row: voters = invalid + valid, lists sum to valid; shares sum to 100%
for (const K of [K26, ...IX.elections.map(e => J(`data/geo/k${e.k}.json`))]) {
  for (const r of K.rows) {
    const lv = r.slice(5).reduce((a, b) => a + b, 0);
    ok(r[2] === r[3] + r[4], `K${K.k} ${r[0]} voters = invalid + valid`);
    ok(lv === r[4], `K${K.k} ${r[0]} lists sum to valid`);
    if (r[4]) { const sh = r.slice(5).reduce((a, x) => a + 100 * x / r[4], 0); ok(Math.abs(sh - 100) < 1e-9, `K${K.k} ${r[0]} shares sum ${sh}`); }
    ok(r.every(x => Number.isInteger(x) && x >= 0), `K${K.k} ${r[0]} integers`);
  }
}
// spot checks (IIE localities file, 18:04 count)
const row = c => K26.rows.find(r => r[0] === c);
ok(row(5000).slice(1, 5).join() === '473868,309971,931,309040', 'k26 Tel Aviv');
ok(row(3000).slice(1, 5).join() === '455862,300647,1232,299415', 'k26 Jerusalem');
// localities that are new in 2026 have names
const known = new Set(IX.localities.map(l => l[0]));
K26.rows.forEach(r => { if (!known.has(r[0])) ok(K26.names[r[0]], `k26 new locality ${r[0]} has a name`); });

// 3. lineage: every mapped letter exists in that election; ids unique; noComparable ids exist in K26
const lettersOf = k => new Set(k === 26 ? K26.lists.map(l => l.l) : IX.elections.find(e => e.k === k).lists.map(l => l.l));
const ids = new Set();
LIN.series.forEach(s => {
  ok(!ids.has(s.id), `lineage id unique ${s.id}`); ids.add(s.id);
  Object.entries(s.m).forEach(([k, l]) => ok(lettersOf(+k).has(l), `lineage ${s.id} K${k} ${l}`));
  ok(!('c' in s) && !('color' in s), `lineage ${s.id} no colour`);
});
K26.lists.forEach(L => ok(LIN.series.some(s => s.m[26] === L.l) || (LIN.noComparable[26] || {})[L.id], `K26 ${L.id} in lineage or noComparable`));

// 4. code: neutral – no party colours, lists sorted alphabetically with the Hebrew collator
const JS = fs.readFileSync(path.join(ROOT, 'js/cities.js'), 'utf8');
ok(!/#[0-9a-fA-F]{3,6}\b/.test(JS) && !/\b(rgb|hsl)a?\(/.test(JS), 'cities.js: no hard-coded colours');
ok(!/color|colour|fill="#|stroke="#/i.test(JS.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')), 'cities.js: no colour attributes');
ok(/COLL\.compare/.test(JS), 'cities.js sorts with the Hebrew collator');
const sorted = K26.lists.map(l => l.n).sort(COLL.compare);
ok(sorted.length === 13, 'k26 names');
// 5. byte budget of lazy files
ok(fs.statSync(path.join(ROOT, 'data/cities/k26.json')).size < 150000, 'k26.json < 150 KB');
ok(fs.statSync(path.join(ROOT, 'js/cities.js')).size < 80000, 'cities.js < 80 KB');
console.log(`cities: ${checks - fails}/${checks} checks passed`);
process.exit(fails ? 1 : 0);
