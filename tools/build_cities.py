#!/usr/bin/env python3
"""Build data/cities/k26.json (2026 per-locality data) and data/cities/lineage.json.
Usage (current, since 4.11.2026): python3 tools/build_cities.py /path/to/expc26-2026-11-04.csv "2026-11-04"
  CEC per-locality CSV (columns: סמל ועדה, שם ישוב, סמל ישוב, בזב, מצביעים, פסולים, כשרים, then one column per list letter;
  row 9999 'מעטפות חיצוניות' = external/double envelopes, not attributed to localities). Totals must equal REF_CSV exactly.
Legacy: python3 tools/build_cities.py /path/to/localities.json "<retrieved ISO>" (israelielections.com copy, 19:58 count, REF_1958).
Party colour fields in the source ("c") are ignored. Lists < 1% of national valid votes are folded into "other",
like data/geo (tools/build_geo.py). Never extrapolates: numbers are copied as published.
"""
import json, sys, os, hashlib
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src_path, retrieved = sys.argv[1], sys.argv[2]
raw = open(src_path, 'rb').read()
IS_CSV = src_path.lower().endswith('.csv')
if IS_CSV:
    import csv, io
    C = list(csv.reader(io.StringIO(raw.decode('utf-8-sig'))))
    hdr = C[0]; assert hdr[:7] == ['סמל ועדה', 'שם ישוב', 'סמל ישוב', 'בזב', 'מצביעים', 'פסולים', 'כשרים'], hdr[:7]
    pc = [i for i in range(7, len(hdr)) if hdr[i].strip()]
    body = [x for x in C[1:] if any(c.strip() for c in x)]
    for x in body: assert len(x) == len(hdr) and int(x[4]) == int(x[5]) + int(x[6]), x[:7]
    rows_in = [[x[2], x[0], x[1], int(x[3]), int(x[4]), int(x[6]), [int(x[i]) for i in pc]] for x in body]
    L = {'parties': [{'letters': hdr[i].strip(), 'votes': sum(r[6][k] for r in rows_in)} for k, i in enumerate(pc)], 'rows': rows_in, 'updated_at': None}
else:
    L = json.loads(raw)
EP = json.load(open(os.path.join(ROOT, 'data/exitpolls.json'), encoding='utf-8'))['y2026']
GI = json.load(open(os.path.join(ROOT, 'data/geo/index.json'), encoding='utf-8'))
NAMES = {c: n for c, n, *_ in GI['localities']}
SITE = {l['id']: l['name'] for l in EP['lists']}
LET = {'מחל': 'likud', 'דרך': 'yashar', 'רק': 'beyachad', 'ודם': 'joint', 'אמת': 'dems', 'עם': 'raam', 'ל': 'yb', 'ב': 'otzma',
       'ג': 'utj', 'שס': 'shas', 'ט': 'rzz', 'די': 'miluim', 'ך': 'amcha'}
# National count the legacy JSON must reconcile with exactly (machria.com 19:58, 29.10.2026; same numbers as tools/build_outlook.py c1958)
REF_1958 = {'asOf': '2026-10-29T19:58+02:00', 'valid': 5678352, 'invalid': 25789,
       'votes': dict(likud=1164494, yashar=911796, beyachad=530253, joint=499878, dems=365733, raam=336275, yb=336838, otzma=325650, utj=312241, shas=298881, rzz=289181, miluim=154585, amcha=95288)}
# Totals of the CEC per-locality CSV downloaded 4.11.2026 (sha256 bf7db01f…). Certified national result (4.11.2026): 5,690,778 valid,
# 25,887 invalid; the CSV has 648 more valid and 84 more invalid votes and no certified-version marker.
REF_CSV = {'asOf': '2026-11-04', 'eligible': 7331981, 'voters': 5717397, 'valid': 5691426, 'invalid': 25971,
           'votes': dict(likud=1167591, yashar=913629, beyachad=532018, joint=500755, dems=366278, raam=337720, yb=337450, otzma=326793, utj=312632, shas=299533, rzz=290549, miluim=155199, amcha=95764)}
CERT = {'valid': 5690778, 'invalid': 25887}
REF = REF_CSV if IS_CSV else REF_1958
P = L['parties']; rows_in = L['rows']
valid_nat = sum(r[5] for r in rows_in)
assert sum(p['votes'] for p in P) == valid_nat
for j, p in enumerate(P): assert sum(r[6][j] for r in rows_in) == p['votes'], p['letters']
big = sorted([j for j, p in enumerate(P) if p['votes'] / valid_nat >= 0.01], key=lambda j: -P[j]['votes'])
assert {P[j]['letters'] for j in big} == set(LET), {P[j]['letters'] for j in big}
lists = [{'l': P[j]['letters'], 'n': SITE[LET[P[j]['letters']]], 'id': LET[P[j]['letters']], 'v': P[j]['votes']} for j in big]
cols = ['code', 'eligible', 'voters', 'invalid', 'valid'] + [x['l'] for x in lists] + ['other']
rows, new_names, env = [], {}, None
for r in rows_in:
    code = int(r[0]); el, vo, va = r[3], r[4], r[5]
    vs = [r[6][j] for j in big]; other = va - sum(vs); assert other >= 0
    row = [code, el, vo, vo - va, va] + vs + [other]
    assert vo - va >= 0
    if code == GI['envelopesCode']: env = row
    elif code not in NAMES: new_names[code] = r[2]
    rows.append(row)
rows.sort(key=lambda x: x[0])
nat = [sum(x[i] for x in rows) for i in (1, 2, 3, 4)]
assert nat[3] == REF['valid'] and nat[2] == REF['invalid'], (nat, REF['valid'], REF['invalid'])
for x in lists: assert x['v'] == REF['votes'][x['id']], (x['id'], x['v'], REF['votes'][x['id']])
if IS_CSV:
    assert nat[0] == REF['eligible'] and nat[1] == REF['voters']
    gv, gi = nat[3] - CERT['valid'], nat[2] - CERT['invalid']
    f = lambda n: format(n, ',')
    out = {'k': 26, 'id': '2026', 'date': EP['date'], 'label': 'אוקטובר 2026', 'status': 'cec-file',
       'statusLabel': 'קובץ ועדת הבחירות לפי יישוב, הורד ב-4.11.2026: הסכום הארצי בקובץ הוא ' + f(nat[3]) + ' קולות כשרים ו-' + f(nat[2]) + ' פסולים, ' + f(gv) + ' כשרים ו-' + f(gi) + ' פסולים יותר מהתוצאה הארצית שהוגשה לנשיא (' + f(CERT['valid']) + ' כשרים, ' + f(CERT['invalid']) + ' פסולים). בקובץ אין סימון של גרסה, ולכן לא ידוע אם הוא תואם לגרסה שהוגשה לנשיא. קולות המעטפות החיצוניות (הכפולות) אינם משויכים ליישוב.',
       'basis': {'asOf': REF['asOf'], 'valid': nat[3], 'invalid': nat[2], 'certValid': CERT['valid'], 'certInvalid': CERT['invalid'], 'gapValid': gv, 'gapInvalid': gi,
                 'reconciles': 'סכום כל היישובים ושורת המעטפות החיצוניות שווה בדיוק לסכומי הקובץ (' + f(nat[3]) + ' כשרים, ' + f(nat[2]) + ' פסולים, ולכל אחת מ-13 הרשימות). התוצאה הארצית בשאר האתר לא שונתה.'},
       'src': {'url': 'https://votes26.bechirot.gov.il/', 'publisher': 'ועדת הבחירות המרכזית, קובץ תוצאות לפי יישוב (expc)',
               'sourceUpdatedAt': '2026-11-04', 'retrieved': retrieved, 'sha256': hashlib.sha256(raw).hexdigest(), 'bytes': len(raw),
               'note': 'הקובץ הורד ישירות מוועדת הבחירות. רשימות שקיבלו פחות מ-1% מקופלות ל"אחרות".'},
       'lists': lists, 'otherLists': len(P) - len(big), 'otherVotes': sum(x[-1] for x in rows),
       'national': nat, 'envelopes': env[1:5] if env else None, 'localities': len(rows) - (1 if env else 0),
       'names': {str(k): v for k, v in sorted(new_names.items())}, 'cols': cols, 'rows': rows}
else:
  out = {'k': 26, 'id': '2026', 'date': EP['date'], 'label': 'אוקטובר 2026',
       'status': 'partial',
       'statusLabel': 'ספירה חלקית, לא סופית ולא רשמית: ועדת הבחירות השלימה את ספירת כל 12,018 הקלפיות הרגילות וכל 881 קלפיות המעטפות הכפולות (ספירת 19:58, 29.10.2026), אבל הנתונים ברמת היישוב הם מהספירה הזאת ולא מהקבצים הרשמיים. התוצאות הארציות הסופיות אושרו והוגשו לנשיא ב-4.11.2026 (חלוקת המושבים זהה), וקובצי היישובים והקלפיות הרשמיים לא נכללו כאן כי האתר הוקפא באותו יום. קולות המעטפות הכפולות אינם משויכים ליישוב.',
      'basis': {'asOf': REF['asOf'], 'valid': nat[3],
                'reconciles': 'סכום כל היישובים ושורת המעטפות הכפולות שווה בדיוק לספירה הארצית של 19:58 שפורסמה ב-machria.com (5,678,352 קולות כשרים, 25,789 פסולים, ולכל אחת מ-13 הרשימות).'},
       'src': {'url': 'https://israelielections.com/2026/results/localities.json', 'publisher': 'israelielections.com, עותק של נתוני ועדת הבחירות לפי יישוב',
               'sourceUpdatedAt': L['updated_at'], 'retrieved': retrieved, 'sha256': hashlib.sha256(raw).hexdigest(), 'bytes': len(raw),
               'note': 'אתר ועדת הבחירות (votes26 / media26) לא נגיש מהשרת שבו נבנה האתר, ולכן הקובץ לא הושווה ישירות למקור. הסכומים הושוו לספירה הארצית.'},
       'lists': lists, 'otherLists': len(P) - len(big), 'otherVotes': sum(x[-1] for x in rows),
       'national': nat, 'envelopes': env[1:5] if env else None, 'localities': len(rows) - (1 if env else 0),
       'names': {str(k): v for k, v in sorted(new_names.items())}, 'cols': cols, 'rows': rows}
json.dump(out, open(os.path.join(ROOT, 'data/cities/k26.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))

# ---- list continuity (only where the same party ran under the same letters with substantially the same composition)
LIN = [
  {'id': 'likud', 'n': 'הליכוד', 'm': {21: 'מחל', 22: 'מחל', 23: 'מחל', 24: 'מחל', 25: 'מחל', 26: 'מחל'}, 'note': 'מספטמבר 2019 כולנו רצה בתוך רשימת הליכוד.'},
  {'id': 'shas', 'n': 'ש"ס', 'm': {21: 'שס', 22: 'שס', 23: 'שס', 24: 'שס', 25: 'שס', 26: 'שס'}, 'note': ''},
  {'id': 'utj', 'n': 'יהדות התורה', 'm': {21: 'ג', 22: 'ג', 23: 'ג', 24: 'ג', 25: 'ג', 26: 'ג'}, 'note': ''},
  {'id': 'yb', 'n': 'ישראל ביתנו', 'm': {21: 'ל', 22: 'ל', 23: 'ל', 24: 'ל', 25: 'ל', 26: 'ל'}, 'note': ''},
  {'id': 'raam', 'n': 'רע"ם', 'm': {24: 'עם', 25: 'עם', 26: 'עם'}, 'note': 'באפריל 2019 רע"מ רצה עם בל"ד (רשימה אחרת), ובספטמבר 2019 ובמרץ 2020 בתוך הרשימה המשותפת. אין רשימה מקבילה באותן מערכות.'},
  {'id': 'joint', 'n': 'הרשימה המשותפת (חד"ש, תע"ל ובל"ד)', 'm': {24: 'ודעם', 26: 'ודם'}, 'note': 'ב-2021 ההרכב זהה (חד"ש, תע"ל ובל"ד). ב-2022 חד"ש-תע"ל ובל"ד רצו בנפרד, ולכן אין רשימה מקבילה ל-2022 ואין חישוב שינוי מ-2022. ב-2019–2020 הרשימה כללה גם את רע"מ.'},
  {'id': 'rz', 'n': 'הציונות הדתית (עם עוצמה יהודית ונעם)', 'm': {24: 'ט', 25: 'ט'}, 'note': 'ב-2026 הציונות הדתית–זהות ועוצמה יהודית רצו בנפרד, ולכן אין רשימה מקבילה ל-2026.'},
  {'id': 'bw', 'n': 'כחול לבן (גנץ–לפיד)', 'm': {21: 'פה', 22: 'פה', 23: 'פה'}, 'note': 'ב-2021 יש עתיד וכחול לבן רצו בנפרד.'},
  {'id': 'ya', 'n': 'יש עתיד', 'm': {24: 'פה', 25: 'פה'}, 'note': 'ב-2026 יש עתיד רצה בתוך "ביחד", רשימה בהרכב אחר.'},
  {'id': 'labor', 'n': 'העבודה', 'm': {24: 'אמת', 25: 'אמת'}, 'note': 'ב-2026 העבודה ומרצ רצו יחד כ"הדמוקרטים", רשימה בהרכב אחר.'},
  {'id': 'meretz', 'n': 'מרצ', 'm': {24: 'מרצ', 25: 'מרצ'}, 'note': ''},
  {'id': 'yamina', 'n': 'ימינה', 'm': {22: 'טב', 23: 'טב'}, 'note': ''},
  {'id': 'jointall', 'n': 'הרשימה המשותפת (ארבע המפלגות)', 'm': {22: 'ודעם', 23: 'ודעם'}, 'note': ''},
]
GLAB = {e['k']: {x['l']: x['n'] for x in e['lists']} for e in GI['elections']}; GLAB[26] = {x['l']: x['n'] for x in lists}
for s in LIN:
    for k, l in s['m'].items(): assert l in GLAB[k], (s['id'], k, l)
NOC = {26: {'yashar': 'רשימה חדשה.', 'beyachad': 'בנט ולפיד רצו בעבר ברשימות נפרדות (ימינה / יש עתיד), ולכן אין רשימה מקבילה.',
            'dems': 'איחוד העבודה ומרצ; ב-2022 הן רצו בנפרד, ולכן אין רשימה מקבילה.', 'otzma': 'ב-2021 וב-2022 רצה בתוך הציונות הדתית, ולכן אין רשימה מקבילה.',
            'rzz': 'ב-2022 הציונות הדתית רצה עם עוצמה יהודית ונעם, ולכן אין רשימה מקבילה.', 'miluim': 'רשימה חדשה.', 'amcha': 'רשימה חדשה.'}}
lin = {'note': 'רצף רשימות בין מערכות בחירות נקבע רק כשאותה מפלגה רצה באותה אות ובהרכב דומה. שינוי בנקודות אחוז מחושב רק בין שתי מערכות עוקבות שבשתיהן יש לרשימה מקבילה. בכל מקרה אחר כתוב "אין רשימה מקבילה". רשימות שקיבלו פחות מ-1% ארצית מקופלות ל"אחרות" ואינן ניתנות להשוואה.',
       'series': [{'id': s['id'], 'n': s['n'], 'm': {str(k): v for k, v in s['m'].items()}, 'note': s['note']} for s in LIN],
       'noComparable': {str(k): v for k, v in NOC.items()}}
json.dump(lin, open(os.path.join(ROOT, 'data/cities/lineage.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('k26 rows', len(rows), 'localities', out['localities'], 'new names', new_names, 'national', nat, 'env', env[:5])
