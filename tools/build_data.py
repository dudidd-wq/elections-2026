#!/usr/bin/env python3
"""Parse the canonical research document (platforms.md) into data/platforms.json and data/analysis.json.

Usage:  python3 tools/build_data.py [/path/to/platforms.md]
Default source: /workspace/elections-2026/platforms.md (a copy is kept in source/platforms.md).
Only data/*.json changes; the site code never needs editing for content updates.
"""
import json, re, sys, os, datetime, hashlib
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'source', 'platforms.md')
md = open(SRC, encoding='utf-8').read()
lines = md.split('\n')

LISTS = [  # id, match prefix
 ('likud', 'הליכוד'), ('yashar', 'ישר!'), ('beyachad', 'ביחד'), ('dems', 'הדמוקרטים'),
 ('joint', 'הרשימה המשותפת'), ('otzma', 'עוצמה יהודית'), ('shas', 'ש"ס'), ('yb', 'ישראל ביתנו'),
 ('utj', 'יהדות התורה'), ('rzz', 'הציונות הדתית'), ('miluim', 'המילואימניקים'), ('amcha', 'עמך ישראל')]
ISSUE_IDS = ['security', 'palestinian', 'draft', 'judiciary', 'inquiry', 'economy', 'housing', 'religion', 'crime', 'education']

def lid(name):
    n = re.sub(r'[*†]', '', name).strip()
    for i, p in LISTS:
        if n.startswith(p):
            return i
    raise ValueError('unknown list: ' + name)

def strip_md(s):
    return re.sub(r'\*\*(.+?)\*\*', r'\1', s).strip()

def cells(row):
    return [c.strip() for c in row.strip().strip('|').split('|')]

def section(start_pat, end_pat=r'^## '):
    out, on = [], False
    for ln in lines:
        if on and re.match(end_pat, ln):
            break
        if on:
            out.append(ln)
        if re.match(start_pat, ln):
            on = True
    return out

def table_rows(block):
    rows = [l for l in block if l.startswith('|')]
    return [cells(r) for r in rows[2:]]

def bullets(block):
    return [strip_md(l[2:]) for l in block if l.startswith('- ')]

def paras(block):
    return [l.strip() for l in block if l.strip() and not l.startswith(('|', '#', '- '))]

def link(s):
    m = re.search(r'\]\((https?://[^)]+)\)', s)
    return m.group(1) if m else None

def mdlinks(s):
    return [{'label': a, 'url': b} for a, b in re.findall(r'\[([^\]]+)\]\((https?://[^)]+)\)', s)]

# ---- meta
title = lines[0].lstrip('# ').strip()
subtitle = lines[2].strip('*').strip()
intro = section(r'^## מבוא ושיטה')
meta = {
    'title': title, 'subtitle': subtitle, 'electionDate': '2026-10-27',
    'documentAsOf': '2026-10-20', 'linksCheckedOn': '2026-10-20',
    'source': 'platforms.md (מסמך המחקר המקורי)',
    'sourceSha1': hashlib.sha1(md.encode()).hexdigest()[:12],
    'generatedAt': datetime.datetime.now().astimezone().isoformat(timespec='minutes'),
    'intro': [re.sub(r'^\*(.+)\*$', r'\1', p) for p in paras(intro)],
}
# ---- issues
iss_block = section(r'^## 10 הסוגיות שנבחרו')
issue_titles = [re.sub(r'^\d+\.\s*', '', l).strip() for l in iss_block if re.match(r'^\d+\.', l)]
issue_note = paras(iss_block)
mat_rows = [l for l in section(r'^## מטריצת השוואה') if l.startswith('|')]
mat_hdr = cells(mat_rows[0])[1:]
code_block = section(r'^### 4\. מטריצה תמציתית', r'^## |^### ')
code_rows_raw = [l for l in code_block if l.startswith('|')]
code_hdr = cells(code_rows_raw[0])[1:]
issues = [{'id': ISSUE_IDS[i], 'n': i + 1, 'title': issue_titles[i], 'short': mat_hdr[i], 'code': code_hdr[i]} for i in range(10)]

# ---- matrix summaries & codes
summary = {}
for r in table_rows(mat_rows):
    summary[lid(strip_md(r[0]))] = r[1:]
codes = {}
for r in table_rows(code_rows_raw):
    codes[lid(strip_md(r[0]))] = r[1:]

# ---- per-issue tables
positions = {i: {} for i, _ in LISTS}
issue_heads = [k for k, l in enumerate(lines) if re.match(r'^### \d+\. ', l) and k < lines.index('## פרופיל קצר לכל רשימה')]
assert len(issue_heads) == 10, issue_heads
for n, k in enumerate(issue_heads):
    blk = []
    for l in lines[k + 1:]:
        if l.startswith('#'):
            break
        blk.append(l)
    for r in table_rows(blk):
        L = lid(r[0])
        positions[L][ISSUE_IDS[n]] = {'full': r[1], 'sourceType': r[2], 'url': link(r[3])}
for L, _ in LISTS:
    for n, I in enumerate(ISSUE_IDS):
        p = positions[L][I]
        code = codes[L][n]
        p['summary'] = summary[L][n]
        p['code'] = code.replace('*', '').strip()
        p['star'] = '*' in code  # * = based on statements/announcements/votes (per analysis matrix)
        p['notFound'] = p['summary'].startswith('לא נמצאה')  # cell where no public position was found

# ---- profiles
lists = []
prof_heads = [k for k, l in enumerate(lines) if l.startswith('### ') and lines.index('## פרופיל קצר לכל רשימה') < k < lines.index('## קווי המחלוקת המרכזיים (סיכום ניטרלי)')]
FIELD = {'שם בפתק': 'ballotName', 'ראש הרשימה': 'leader', 'הרכב': 'composition', 'מנדטים בכנסת ה-25': 'seats25',
         'סטטוס מצע': 'platformStatus', 'גוש/שותפויות מוצהרות': 'declaredBloc', 'מקור מרכזי': 'mainSource'}
src_start = lines.index('### מקורות לפי רשימה (כפי שמופיעים בטבלאות)')
for k in prof_heads:
    h = lines[k][4:]
    m = re.match(r'^(.*?) \(([^()]+)\) – (.*)$', h)
    name, letters, avgtxt = m.group(1), m.group(2), m.group(3)
    L = lid(name)
    d = {'id': L, 'name': name, 'letters': letters, 'docPollNote': avgtxt}
    for l in lines[k + 1:]:
        if l.startswith('#'):
            break
        mm = re.match(r'^- \*\*(.+?):\*\* (.*)$', l)
        if mm:
            d[FIELD[mm.group(1)]] = mm.group(2).strip()
    # display name used in tables
    for r in table_rows(section(r'^### 1\. ביטחון', r'^###')):
        if lid(r[0]) == L:
            d['tableName'] = r[0].replace('†', '').strip()
    d['added20Oct'] = L in ('miluim', 'amcha')
    # sources list
    srcs, on = [], False
    for l in lines[src_start + 1:]:
        if l.startswith('## '):
            break
        if l.startswith('**'):
            on = lid(l.strip('*:')) == L
            continue
        if on and l.startswith('- '):
            srcs.append(l[2:].strip())
    d['sources'] = srcs
    lists.append(d)
assert len(lists) == 12

# ---- general sources, gaps, neutral summary
gen = []
for l in section(r'^### כללי וסקרים', r'^###'):
    if l.startswith('- '):
        t = l[2:]
        m = re.match(r'^(.*): (https?://\S+)$', t)
        gen.append({'label': m.group(1), 'url': m.group(2)} if m else {'label': t, 'url': None})
platforms = {
    'meta': meta, 'issueNote': issue_note, 'issues': issues, 'lists': lists, 'positions': positions,
    'starLegend': 'כוכבית (*) מסמנת עמדה שמבוססת על הצהרות, הודעות, נאומים, ראיונות או הצבעות, ולא על מצע, מסמך מדיניות או תשובה רשמית לשאלון.',
    'daggerLegend': '† רשימה שנוספה למסמך ב-20.10.2026; מתחת לאחוז החסימה ברוב הסקרים שבבסיס המסמך.',
    'readingGuide': paras(section(r'^## מבוא ושיטה'))[-1],
    'mainSplits': bullets(section(r'^## קווי המחלוקת המרכזיים')),
    'gaps': bullets(section(r'^## פערים ואי-ודאויות')),
    'generalSources': gen,
}

# ---- analysis
A = section(r'^## ניתוח רוחבי')
def sub(h3=None, h4=None):
    out, on = [], False
    for l in A:
        if on and (l.startswith('#### ') or l.startswith('### ')):
            break
        if on:
            out.append(l)
        if (h4 and l.startswith('#### ') and l[5:].strip() == h4) or (h3 and l.startswith('### ') and l[4:].strip() == h3):
            on = True
    return out
intro_a = []
for l in A:
    if l.startswith('### '):
        break
    if l.strip():
        intro_a.append(l.strip())
rank = []
for l in sub(h4='דירוג הסוגיות לפי עומק המחלוקת'):
    m = re.match(r'^(\d+)\. (.+?) – (.*)$', l)
    if m:
        rank.append({'rank': int(m.group(1)), 'label': m.group(2), 'text': m.group(3)})
RANK_ISSUES = [['draft'], ['palestinian', 'security'], ['judiciary'], ['inquiry'], ['religion'], ['education'], ['crime', 'economy', 'housing']]
for r, iss in zip(rank, RANK_ISSUES):
    r['issues'] = iss
camps = []
CAMP_ISSUE = dict(zip(['ביטחון (עזה, לבנון, איראן)', 'הסוגיה הפלסטינית', 'גיוס חרדים', 'מערכת המשפט', 'ועדת חקירה', 'יוקר המחיה', 'דיור', 'דת ומדינה', 'פשיעה', 'חינוך ולימודי ליבה'], ISSUE_IDS))
for l in sub(h4='המחנות בכל סוגיה'):
    m = re.match(r'^- \*\*(.+?):\*\* (.*)$', l)
    if m:
        # split into camp sentences: sentences ending with '. ' (not inside parentheses/quotes)
        txt = m.group(2)
        parts, depth, cur = [], 0, ''
        i = 0
        while i < len(txt):
            ch = txt[i]
            cur += ch
            if ch == '(':
                depth += 1
            elif ch == ')':
                depth -= 1
            if ch == '.' and depth == 0 and (i + 1 == len(txt) or txt[i + 1] == ' '):
                parts.append(cur.strip()); cur = ''
            i += 1
        if cur.strip():
            parts.append(cur.strip())
        segs = []
        for p in parts:
            mm = re.match(r'^(.+?) – (.+)$', p)
            if mm and len(mm.group(1)) < 140:
                segs.append({'label': mm.group(1), 'who': mm.group(2)})
            else:
                segs.append({'label': None, 'who': p})
        camps.append({'issue': CAMP_ISSUE[m.group(1)], 'title': m.group(1), 'text': txt, 'segments': segs})
def colon_items(block):
    out = []
    for b in bullets(block):
        m = re.match(r'^([^:]{2,120}): (.*)$', b)
        out.append({'label': m.group(1), 'text': m.group(2)} if m else {'label': None, 'text': b})
    return out
analysis = {
    'title': 'ניתוח רוחבי: מחלוקות חדות ומכנה משותף',
    'intro': intro_a,
    'rank': rank,
    'camps': camps,
    'crossAxis': colon_items(sub(h4='מחלוקות שחוצות את ציר ימין–שמאל')),
    'consensusBroad': colon_items(sub(h4='הסכמה רחבה (10–11 מתוך 12)')),
    'consensusPartial': colon_items(sub(h4='הסכמה חלקית (רוב, לא כולם)')),
    'overlaps': bullets(sub(h4='חפיפות בין גושים')),
    'principleVsDegree': colon_items(sub(h4='מחלוקת על עיקרון מול מחלוקת על מידה')),
    'codeMatrixLegend': paras(code_block)[0],
    'headings': {'broad': 'הסכמה רחבה (10–11 מתוך 12)', 'partial': 'הסכמה חלקית (רוב, לא כולם)'},
}
# list name aliases used for highlighting mentions in free text
aliases = {
 'likud': ['הליכוד', 'ליכוד'], 'yashar': ['ישר!'], 'beyachad': ['ביחד', 'יש עתיד'], 'dems': ['הדמוקרטים'],
 'joint': ['הרשימה המשותפת', 'חד"ש', 'בל"ד', 'מק"י'], 'otzma': ['עוצמה יהודית', 'עוצמה', 'בן גביר'], 'shas': ['ש"ס', 'דרעי'],
 'yb': ['ישראל ביתנו'], 'utj': ['יהדות התורה', 'פינדרוס', 'פרוש'], 'rzz': ['הציונות הדתית–זהות', 'צ"ד', 'זהות', 'פייגלין', 'סמוטריץ\''],
 'miluim': ['המילואימניקים והכלכלית'], 'amcha': ['עמך ישראל', 'וינטר']}
platforms['aliases'] = aliases
os.makedirs(os.path.join(ROOT, 'data'), exist_ok=True)
json.dump(platforms, open(os.path.join(ROOT, 'data', 'platforms.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
json.dump(analysis, open(os.path.join(ROOT, 'data', 'analysis.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('ok: lists', len(lists), 'issues', len(issues), 'cells', sum(len(v) for v in positions.values()), 'camps', len(camps), 'rank', len(rank))
