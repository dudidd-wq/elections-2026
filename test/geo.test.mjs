// Data test for data/geo/*. No dependencies: `node test/geo.test.mjs`
// Checks sources/hashes, internal consistency (ballots → locality → national) and the official national totals.
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const J = p => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
const IX = J('data/geo/index.json');
let fails = 0, checks = 0;
const ok = (c, m) => { checks++; if (!c) { fails++; if (fails < 40) console.log('FAIL', m); } };
const sum = (a, b) => a.map((x, i) => x + b[i]);
// Official national results (CEC, as published in the final results; K22 eligible differs in the data.gov.il file, see NOTES.md)
const OFFICIAL = {
  21: { voters: 4340253, invalid: 30983, valid: 4309270, eligible: 6339729 },
  22: { voters: 4465168, invalid: 28362, valid: 4436806, eligible: 6391218 /* published: 6,394,030 */ },
  23: { voters: 4615135, invalid: 25073, valid: 4590062, eligible: 6453255 },
  24: { voters: 4436365, invalid: 26313, valid: 4410052, eligible: 6578084 },
  25: { voters: 4794593, invalid: 29851, valid: 4764742, eligible: 6788804 },
};
// Official votes of the largest list in each election (spot check of list columns)
const TOPLIST = { 21: ['מחל', 1140370], 22: ['פה', 1151214], 23: ['מחל', 1352449], 24: ['מחל', 1066892], 25: ['מחל', 1115336] };
ok(/^https:\/\/data\.gov\.il\//.test(IX.source.dataset), 'dataset url');
const codes = new Set(IX.localities.map(l => l[0]));
ok(codes.size === IX.localities.length, 'unique locality codes');
const shards = Object.fromEntries(IX.localities.map(l => [l[0], J(`data/geo/loc/${l[0]}.json`)]));
ok(fs.readdirSync(path.join(ROOT, 'data/geo/loc')).length === codes.size, 'one shard per locality');
for (const e of IX.elections) {
  const t = `K${e.k}`;
  for (const kind of ['ballots', 'localities']) {
    const s = e.src[kind];
    ok(/^https:\/\/data\.gov\.il\/dataset\/votes-knesset\/resource\/[0-9a-f-]{36}$/.test(s.url) && s.url.endsWith(s.resource), `${t} ${kind} url`);
    ok(/^\d{4}-\d{2}-\d{2}$/.test(s.retrieved), `${t} ${kind} retrieved`);
    ok(/^[0-9a-f]{64}$/.test(s.sha256) && s.bytes > 0, `${t} ${kind} sha256`);
    // raw files live outside the repo; if present, verify the hash
    const raw = path.join(process.env.GEO_RAW || '/workspace/geo/raw', `k${e.k}_${kind === 'ballots' ? 'ballot' : 'city'}.json`);
    if (fs.existsSync(raw)) ok(crypto.createHash('sha256').update(fs.readFileSync(raw)).digest('hex') === s.sha256, `${t} ${kind} raw hash`);
  }
  const o = OFFICIAL[e.k];
  if (o) ok(e.national[0] === o.eligible && e.national[1] === o.voters && e.national[2] === o.invalid && e.national[3] === o.valid, `${t} national = official ${e.national}`);
  if (TOPLIST[e.k]) ok(e.lists.some(l => l.l === TOPLIST[e.k][0] && l.v === TOPLIST[e.k][1]), `${t} top list votes`);
  ok(e.lists.every(l => l.v / e.national[3] * 100 >= IX.minNationalShare) && e.otherVotes / e.national[3] * 100 < 100, `${t} kept lists >= min share`);
  ok(e.lists.reduce((s, l) => s + l.v, 0) + e.otherVotes === e.national[3], `${t} lists+other = valid`);
  ok(e.national[1] === e.national[2] + e.national[3], `${t} voters = invalid + valid`);
  const K = J(`data/geo/k${e.k}.json`);
  ok(JSON.stringify(K.cols) === JSON.stringify(['code', 'eligible', 'voters', 'invalid', 'valid', ...e.lists.map(l => l.l), 'other']), `${t} cols`);
  ok(K.rows.length === e.localities, `${t} locality count`);
  let nat = null, nb = 0;
  for (const r of K.rows) {
    const v = r.slice(1);
    nat = nat ? sum(nat, v) : v.slice();
    ok(v[1] === v[2] + v[3], `${t} ${r[0]} voters = invalid + valid`);
    ok(v.slice(4).reduce((a, b) => a + b, 0) === v[3], `${t} ${r[0]} lists = valid`);
    const S = shards[r[0]]; ok(S && S.e[e.k], `${t} ${r[0]} shard has election`);
    if (!S || !S.e[e.k]) continue;
    ok(JSON.stringify(S.e[e.k].t) === JSON.stringify(v), `${t} ${r[0]} shard total = election row`);
    const bs = S.e[e.k].b; nb += bs.length;
    const bsum = bs.reduce((a, b) => sum(a, b.slice(1)), v.map(() => 0));
    ok(JSON.stringify(bsum) === JSON.stringify(v), `${t} ${r[0]} ballots sum = locality`);
    ok(bs.every(b => b.length === v.length + 1 && b[2] === b[3] + b[4]), `${t} ${r[0]} ballot rows`);
    ok(new Set(bs.map(b => b[0])).size === bs.length, `${t} ${r[0]} unique ballot numbers`);
  }
  ok(nb === e.ballots, `${t} ballot count ${nb}`);
  ok(JSON.stringify(nat.slice(0, 4)) === JSON.stringify(e.national), `${t} sum of localities = national`);
  e.lists.forEach((l, i) => ok(nat[4 + i] === l.v, `${t} ${l.l} sum = national`));
  ok(nat[nat.length - 1] === e.otherVotes, `${t} other sum`);
  const env = K.rows.find(r => r[0] === IX.envelopesCode);
  ok(env && env[1] === 0 && JSON.stringify(env.slice(1, 5)) === JSON.stringify(e.envelopes), `${t} envelopes row`);
}
// shards only reference known elections and their own code
for (const [c, S] of Object.entries(shards)) ok(String(S.c) === c && Object.keys(S.e).every(k => IX.elections.some(e => String(e.k) === k)), `shard ${c}`);
// initial-load budget: geo adds nothing to the first page load
const idx = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'), sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
ok(!/geo\.js|data\/geo/.test(idx), 'index.html does not load geo');
ok(!/data\/geo|geo\.js/.test(sw.slice(sw.indexOf('CORE'), sw.indexOf(']', sw.indexOf('CORE')))), 'SW does not precache geo');
console.log(`${checks - fails}/${checks} checks passed`);
process.exit(fails ? 1 : 0);
