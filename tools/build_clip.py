#!/usr/bin/env python3
"""Build clip/clip-data.js (the animated summary clip at /clip/) from data/podcasts.json ONLY.
Every number is computed here from the data; every quote is copied verbatim and asserted to exist in the data.
One verified quote per list (QUOTE_PICK below; rule: a policy/positioning statement from the list head's own
appearance, the same kind of slot for every list). Lists are sorted alphabetically (he collation is done in JS too).
Run: python3 tools/build_clip.py  -> prints a summary; exit 1 on any mismatch."""
import json, os, re, sys, collections
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D = json.load(open(os.path.join(ROOT, 'data/podcasts.json'), encoding='utf-8'))
P = json.load(open(os.path.join(ROOT, 'data/platforms.json'), encoding='utf-8'))
TN = {l['id']: l['tableName'] for l in P['lists']}
ISS = {i['id']: i['short'] for i in P['issues']}
# (item id, quote text) – text must match the data exactly
QUOTE_PICK = {
 'beyachad': ('beyachad-walla', 'אם נתניהו לא יוחלף, אסון ענק נוסף לעם ישראל זה רק עניין של זמן'),
 'dems': ('dems-haaretz', 'אנחנו באיזשהו אופן בכלל מפלגה שמרנית'),
 'likud': ('likud-gly-editors', 'מי שלא באמת לומד, ויש הרבה כאלה - חייב להתגייס'),
 'miluim': ('miluim-103', 'מי שיביא הכי הרבה מנדטים ציוניים אני הולך להיות איתו'),
 'rzz': ('rzz-120', 'אני חושב שצריך לצאת למלחמה ביהודה ושומרון'),
 'joint': ('joint-lechtapes', 'רוצים לקוות למצב שתקום בו מדינה פלסטינית לצד מדינת ישראל בגבולות 67'),
 'utj': ('utj-kikar', 'ממ"ח זה החלטה של גדולי ישראל'),
 'yashar': ('yashar-perry', 'להגביל כהונת ראש ממשלה לשמונה שנים'),
 'yb': ('yb-kikar', 'אין מונופול בכשרות'),
 'otzma': ('otzma-103', 'אם אקבל המון מנדטים, כנראה שלא יצליחו להשאיר אותי בחוץ'),
 'amcha': ('amcha-sharon', 'לא אמרתי חוק גיוס, אמרתי חוק הסדרת מעמד המשרתים'),
 'raam': ('raam-unholy', 'Israel needs a new government'),
 'shas': ('shas-kikar', 'לא תהיה ממשלה בישראל - ש"ס תומכת או משתתפת - בלי שנסדיר את מעמד תלמידי הישיבות'),
}
def method_short(v):
    if 'faster-whisper' in v or 'תמלול אוטומטי' in v: return 'אומת מול תמלול אוטומטי של קובץ השמע'
    if 'כתוביות אוטומטיות' in v: return 'אומת מול כתוביות YouTube\u200f ובדיקה מול ההקלטה'
    if 'כתוביות רשמיות' in v: return 'אומת מול הכתוביות הרשמיות של הפרק (באנגלית)'
    if 'תיאור הפרק' in v: return 'אומת מול תיאור הפרק בפיד הרשמי'
    if 'מופיע כציטוט בדף המקור' in v: return 'אומת מול דף המקור'
    raise SystemExit('unknown verification method: ' + v)
fmt = lambda d: '%d.%d.%s' % (int(d[8:]), int(d[5:7]), d[:4])
err = []
lists = []
types = collections.Counter(); topics_lists = collections.defaultdict(set); nq = 0
def tcat(t):
    if t.startswith('פודקאסט'): return 'pod'
    if t.startswith('ריאיון רדיו'): return 'radio'
    if t.startswith('ריאיון טלוויזיה') or t.startswith('ריאיון וידאו'): return 'tv'
    err.append('unknown type ' + t)
for l in D['lists']:
    for it in l['items']:
        types[tcat(it['type'])] += 1; nq += len(it['quotes'])
        for t in it['topics']: topics_lists[t].add(l['id'])
    iid, text = QUOTE_PICK[l['id']]
    it = next((x for x in l['items'] if x['id'] == iid), None)
    q = it and next((x for x in it['quotes'] if x['text'] == text), None)
    if not q: err.append(f"{l['id']}: quote not found verbatim"); continue
    lists.append({'id': l['id'], 'name': TN[l['id']], 'leader': l['leader'], 'quote': q['text'],
                  'lang': 'ar' if re.search('[\u0600-\u06FF]', q['text']) else ('en' if not re.search('[\u0590-\u05FF]', q['text']) else 'he'),
                  'show': it['show'], 'outlet': it['outlet'], 'host': it['host'], 'date': fmt(it['date']), 'type': it['type'],
                  'method': method_short(q['verified_by']), 'ts': q.get('ts', ''), 'src': q['source_url'],
                  'topics': [ISS[t] for t in it['topics']]})
# audience split: taken from the site's computed finding text (same numbers the site shows)
f_scope = next(f for f in D['findings'] if f.startswith('היקף'))
f_stage = next(f for f in D['findings'] if f.startswith('בחירת במה'))
m = re.search(r'(\d+) הופעות בבמות מיינסטרים, (\d+) בבמות שקהלן קרוב למחנה הדובר, (\d+) בבמות שקהלן קרוב למחנה אחר ו-(\d+) בבמות לקהל כללי או ייעודי', f_stage)
aud = [int(x) for x in m.groups()]
if sum(aud) != D['total']: err.append('audience sum != total')
ms = re.search(r'(\d+) פודקאסטים.*?(\d+) ראיונות טלוויזיה.*?(\d+) ראיונות רדיו', f_scope)
if [int(x) for x in ms.groups()] != [types['pod'], types['tv'], types['radio']]: err.append(f'type counts mismatch {ms.groups()} {dict(types)}')
if sum(len(l['items']) for l in D['lists']) != D['total']: err.append('total mismatch')
out = {'total': D['total'], 'lists': len(D['lists']), 'quotes': nq, 'window': [fmt(D['window'][0]), fmt(D['window'][1])], 'updated': fmt(D['updated']),
       'types': [types['pod'], types['tv'], types['radio']], 'audience': aud,
       'topics': sorted([[ISS[t], len(s)] for t, s in topics_lists.items()], key=lambda x: (-x[1], list(ISS.values()).index(x[0]))),
       'findTopics': next(f for f in D['findings'] if f.startswith('נושאים')),
       'findStyle': next(f for f in D['findings'] if f.startswith('סגנון')),
       'gaps': D['gaps']['notes'], 'method': D['method'], 'entries': lists}
if err: print('\n'.join(err)); sys.exit(1)
open(os.path.join(ROOT, 'clip/clip-data.js'), 'w', encoding='utf-8').write('/* generated by tools/build_clip.py from data/podcasts.json – do not edit */\nwindow.CLIP_DATA = ' + json.dumps(out, ensure_ascii=False, indent=1) + ';\n')
print(f"ok: clip-data lists {len(lists)} total {D['total']} quotes {nq} types {out['types']} audience {aud}")
print(out['topics'])
