#!/usr/bin/env python3
"""Re-derive N random localities directly from the live data.gov.il datastore API (the primary CEC
publication) and compare with the built data/geo files. Independent of the local raw dumps.
usage: python3 tools/verify_geo_live.py [N=10 | code,code,...] [seed=2026]"""
import json, random, sys, urllib.parse, urllib.request, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ARG = sys.argv[1] if len(sys.argv) > 1 else '10'  # a number, or explicit codes 5000,3000
N = int(ARG) if ',' not in ARG else 0
SEED = int(sys.argv[2]) if len(sys.argv) > 2 else 2026
ix = json.load(open(os.path.join(ROOT, 'data/geo/index.json')))
API = 'https://data.gov.il/api/3/action/datastore_search'
def q(rid, code):
    u = API + '?' + urllib.parse.urlencode({'resource_id': rid, 'limit': 5000, 'filters': json.dumps({'סמל ישוב': code})})
    r = json.load(urllib.request.urlopen(urllib.request.Request(u, headers={'User-Agent': 'Mozilla/5.0'}), timeout=60))['result']
    return r['records']
codes = [l[0] for l in ix['localities'] if l[0] != ix['envelopesCode']]
pick = random.Random(SEED).sample(codes, N) if N else [int(x) for x in ARG.split(',')]
fails = checks = 0
for c in pick:
    sh = json.load(open(os.path.join(ROOT, f'data/geo/loc/{c}.json')))
    for e in ix['elections']:
        k = str(e['k'])
        if k not in sh['e']: continue
        mine = sh['e'][k]['t']; letters = [l['l'] for l in e['lists']]
        for kind in ('ballots', 'localities'):
            recs = q(e['src'][kind]['resource'], c)
            agg = [sum(int(r[f] or 0) for r in recs) for f in ('בזב', 'מצביעים', 'פסולים', 'כשרים')] + [sum(int(r.get(l) or 0) for r in recs) for l in letters]
            checks += 1
            if agg != mine[:len(agg)]:
                fails += 1; print('FAIL', c, sh['n'], k, kind, agg, mine)
            if kind == 'ballots' and len(recs) != len(sh['e'][k]['b']):
                fails += 1; print('FAIL ballot count', c, k, len(recs), len(sh['e'][k]['b']))
    print(c, sh['n'], 'ok' if not fails else '')
print(json.dumps({'localities': pick, 'checks': checks, 'fails': fails}, ensure_ascii=False))
sys.exit(1 if fails else 0)
