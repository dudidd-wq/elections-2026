#!/usr/bin/env python3
"""Build data/geo/* from official CEC per-ballot results (data.gov.il dataset `votes-knesset`).

Raw dumps are NOT kept in the repo. Fetch them with tools/fetch_geo.py into $GEO_RAW
(default /workspace/geo/raw), then run:  python3 tools/build_geo.py
Output:
  data/geo/index.json      elections meta (lists, national totals, sources, sha256) + locality names
  data/geo/kNN.json        per-locality aggregates for election NN (lazy-loaded by #/geo)
  data/geo/loc/<code>.json per-locality shard: aggregates + every ballot box, all elections
Nothing is estimated: every number is a sum of official ballot rows.
"""
import json, os, hashlib, collections, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.environ.get('GEO_RAW', '/workspace/geo/raw')
OUT = os.path.join(ROOT, 'data', 'geo')
META = {'_id','סמל ועדה','ברזל','שם ישוב','סמל ישוב','מספר קלפי','קלפי','ריכוז','שופט','בזב','מצביעים','פסולים','כשרים'}
MIN_NATIONAL_SHARE = 1.0   # lists below 1% of valid votes nationally are summed into "other"
ENVELOPES = 9999           # 'מעטפות חיצוניות' (double envelopes), bzb=0
CODE_ALIAS = {99999: 9999} # K21 published the envelopes row as 99999; merged so the page shows one series
DS = 'https://data.gov.il/dataset/votes-knesset'
ELECTIONS = [
 # knesset, id, date, label, ballot resource, city resource, short names per CEC letters
 (21,'2019a','2019-04-09','אפריל 2019','f79f9ba5-fe12-4b90-96cc-916f1b7c1c34','1a1c7b2b-e819-4ba9-b159-d68e3566c58b',
  {'מחל':'הליכוד','פה':'כחול לבן','שס':'ש"ס','ג':'יהדות התורה','ום':'חד"ש-תע"ל','אמת':'העבודה','ל':'ישראל ביתנו','טב':'איחוד מפלגות הימין','מרצ':'מרצ','כ':'כולנו','דעם':'רע"מ-בל"ד','נ':'הימין החדש','ז':'זהות','נר':'גשר'}),
 (22,'2019b','2019-09-17','ספטמבר 2019','22f3a195-3a79-436c-be23-cb606bc7b398','bd22cd14-138c-4917-931a-ef628c2a5a30',
  {'פה':'כחול לבן','מחל':'הליכוד','ודעם':'הרשימה המשותפת','שס':'ש"ס','ל':'ישראל ביתנו','ג':'יהדות התורה','טב':'ימינה','אמת':'העבודה-גשר','מרצ':'המחנה הדמוקרטי','כף':'עוצמה יהודית'}),
 (23,'2020','2020-03-02','מרץ 2020','3b9e911a-2e90-4587-b209-84171664056b','3dc36e20-25d6-4496-ba6a-71d9bc917349',
  {'מחל':'הליכוד','פה':'כחול לבן','ודעם':'הרשימה המשותפת','שס':'ש"ס','ג':'יהדות התורה','אמת':'העבודה-גשר-מרצ','ל':'ישראל ביתנו','טב':'ימינה'}),
 (24,'2021','2021-03-23','מרץ 2021','419be3b0-fd30-455a-afc0-034ec36be990','9921a347-8466-4ef4-81f9-22523c5c4632',
  {'מחל':'הליכוד','פה':'יש עתיד','שס':'ש"ס','כן':'כחול לבן','ב':'ימינה','אמת':'העבודה','ג':'יהדות התורה','ל':'ישראל ביתנו','ט':'הציונות הדתית','ודעם':'הרשימה המשותפת','ת':'תקווה חדשה','מרצ':'מרצ','עם':'רע"מ'}),
 (25,'2022','2022-11-01','נובמבר 2022','cc223336-07bc-485d-b160-62df92967c0a','b392b8ee-ba45-4ea0-bfed-f03a1a36e99c',
  {'מחל':'הליכוד','פה':'יש עתיד','ט':'הציונות הדתית','כן':'המחנה הממלכתי','שס':'ש"ס','ג':'יהדות התורה','ל':'ישראל ביתנו','עם':'רע"מ','ום':'חד"ש-תע"ל','אמת':'העבודה','מרצ':'מרצ','ד':'בל"ד','ב':'הבית היהודי'}),
]
# Extra elections (e.g. 2026) can be appended via data/geo/extra_elections.json (same tuple shape as a list).

def norm_name(s): return ' '.join(str(s).replace('\u200f','').split())

def ballot_no(r):
    v = r.get('קלפי', r.get('מספר קלפי'))
    v = float(v); return int(v) if v == int(v) else round(v, 2)

def load(k, kind):
    p = os.path.join(RAW, f'k{k}_{kind}.json')
    b = open(p, 'rb').read()
    return json.loads(b), hashlib.sha256(b).hexdigest(), len(b)

def main():
    extra = os.path.join(OUT, 'extra_elections.json')
    els = ELECTIONS + ([tuple(x) for x in json.load(open(extra))] if os.path.exists(extra) else [])
    os.makedirs(os.path.join(OUT, 'loc'), exist_ok=True)
    names = {}; variants = collections.defaultdict(set); shards = collections.defaultdict(dict)
    index = {'source': {'dataset': DS, 'publisher': 'ועדת הבחירות המרכזית לכנסת (באמצעות data.gov.il)', 'license': 'Other (Open) — כפי שמופיע בדף המאגר',
                        'api': 'https://data.gov.il/api/3/action/datastore_search?resource_id=…'},
             'minNationalShare': MIN_NATIONAL_SHARE, 'envelopesCode': ENVELOPES, 'codeAlias': {str(a): b for a, b in CODE_ALIAS.items()}, 'elections': []}
    for (k, eid, date, label, rb, rc, short) in els:
        bd, bsha, bsize = load(k, 'ballot'); cd, csha, csize = load(k, 'city')
        letters = [f for f in bd['fields'] if f not in META]
        recs = bd['records']
        valid = sum(r['כשרים'] for r in recs)
        tot = {l: sum(r.get(l) or 0 for r in recs) for l in letters}
        assert sum(tot.values()) == valid, k
        keep = sorted([l for l in letters if 100 * tot[l] / valid >= MIN_NATIONAL_SHARE], key=lambda l: -tot[l])
        assert set(keep) == set(short), (k, set(keep) ^ set(short))
        others = [l for l in letters if l not in keep]
        lists = [{'l': l, 'n': short[l], 'v': tot[l]} for l in keep]
        nat = [sum(r['בזב'] for r in recs), sum(r['מצביעים'] for r in recs), sum(r['פסולים'] for r in recs), valid]
        # per locality
        agg = collections.OrderedDict(); bal = collections.defaultdict(list)
        for r in sorted(recs, key=lambda r: (r['סמל ישוב'], ballot_no(r))):
            c = CODE_ALIAS.get(int(r['סמל ישוב']), int(r['סמל ישוב'])); nm = norm_name(r['שם ישוב'])
            names[c] = nm; variants[c].add(nm)
            row = [r['בזב'], r['מצביעים'], r['פסולים'], r['כשרים']] + [r.get(l) or 0 for l in keep] + [sum(r.get(l) or 0 for l in others)]
            assert sum(row[4:]) == r['כשרים'], (k, c, ballot_no(r))
            assert r['מצביעים'] == r['פסולים'] + r['כשרים'], (k, c, ballot_no(r))
            bal[c].append([ballot_no(r)] + row)
            a = agg.setdefault(c, [0] * len(row))
            for i, x in enumerate(row): a[i] += x
        # cross-check vs the separate official per-locality file
        city = {CODE_ALIAS.get(int(r['סמל ישוב']), int(r['סמל ישוב'])): r for r in cd['records']}
        assert set(city) == set(agg), k
        for c, a in agg.items():
            cr = city[c]
            assert [cr['בזב'], cr['מצביעים'], cr['פסולים'], cr['כשרים']] == a[:4], (k, c)
            assert [cr.get(l) or 0 for l in keep] == a[4:-1], (k, c)
        rows = [[c] + a for c, a in agg.items()]
        json.dump({'k': k, 'cols': ['code', 'eligible', 'voters', 'invalid', 'valid'] + keep + ['other'], 'rows': rows},
                  open(os.path.join(OUT, f'k{k}.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
        for c in agg:
            shards[c][str(k)] = {'t': agg[c], 'b': bal[c]}
        index['elections'].append({'k': k, 'id': eid, 'date': date, 'label': label, 'lists': lists,
            'otherLists': len(others), 'envelopes': agg.get(ENVELOPES, [0, 0, 0, 0])[:4], 'otherVotes': sum(tot[l] for l in others), 'national': nat,
            'localities': len(agg), 'ballots': len(recs),
            'src': {'ballots': {'resource': rb, 'url': f'{DS}/resource/{rb}', 'sha256': bsha, 'bytes': bsize, 'retrieved': bd.get('retrieved')},
                    'localities': {'resource': rc, 'url': f'{DS}/resource/{rc}', 'sha256': csha, 'bytes': csize, 'retrieved': cd.get('retrieved')}}})
    import re
    key = lambda x: re.sub(r'[^\u05d0-\u05ea]', '', x)
    for c in names:  # prefer a punctuated spelling of the same letters (e.g. 'קדימה-צורן' over 'קדימהצורן')
        best = max([v for v in variants[c] if key(v) == key(names[c])], key=len)
        names[c] = best
    coll = sorted(names)
    index['localities'] = [[c, names[c]] + sorted(variants[c] - {names[c]}) for c in coll]
    json.dump(index, open(os.path.join(OUT, 'index.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
    for c, e in shards.items():
        json.dump({'c': c, 'n': names[c], 'e': e}, open(os.path.join(OUT, 'loc', f'{c}.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
    print('elections', len(index['elections']), 'localities', len(coll), 'shards', len(shards))

if __name__ == '__main__':
    main()
