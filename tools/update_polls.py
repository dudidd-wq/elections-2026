#!/usr/bin/env python3
"""Maintain data/polls.json: add polls, import from israelielections.com, recompute averages/trend/blocs.

Commands
  python3 tools/update_polls.py recompute
      Recompute the poll average, range, bloc sums and trend from the polls list.
  python3 tools/update_polls.py add --date 2026-10-21 --outlet "חדשות 12" --pollster "מדגם (מנו גבע)" \
      --url https://... [--sample 500] likud=21 yashar=24 beyachad=14 dems=9 joint=9 otzma=8 shas=8 yb=8 utj=7 rzz=7 raam=5 miluim=0 amcha=0
      Adds one poll (seats must sum to 120; a list below the 3.25% threshold = 0, seats must be 0 or >=4), then recomputes.
  python3 tools/update_polls.py import-iie [--html FILE] [--since 2026-09-09]
      Fetches https://israelielections.com/2026/polls/ (or parses a saved FILE) and merges polls not yet in the file.
      Imported rows are flagged source="israelielections.com"; spot-check them against the original link (url).

Average method (stated on the site): for the 7 days ending on the date of the most recent poll, take the most
recent poll of each media outlet and average them (simple mean). A list below the threshold (or not reported) counts as 0.
"""
import json, os, re, sys, html, argparse, datetime, urllib.request
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PATH = os.path.join(ROOT, 'data', 'polls.json')
IIE_URL = 'https://israelielections.com/2026/polls/'
IIE_COLS = ['likud', 'yashar', 'beyachad', 'dems', 'otzma', 'joint', 'shas', 'utj', 'yb', 'rzz', 'raam', 'miluim', 'amcha', 'bw']
OUTLETS = {'Channel 14': 'ערוץ 14', 'Channel 13 News': 'חדשות 13', 'Channel 12 News (N12)': 'חדשות 12', 'Kan 11': 'כאן 11',
           'Zman Yisrael': 'זמן ישראל', 'Israel Hayom': 'ישראל היום', 'i24NEWS': 'i24NEWS', 'Maariv': 'מעריב',
           'Walla': 'וואלה', 'Channel 16 / 103FM': 'ערוץ 16 / 103FM'}
POLLSTERS = {'Shlomo Filber': 'שלמה פילבר', 'Direct Polls (Shlomo Filber)': 'דיירקט פולס (שלמה פילבר)',
             'Midgam (Mano Geva)': 'מדגם (מנו גבע)', 'Midgam Project (Camil Fuchs)': 'מדגם פרויקט / המדד (קמיל פוקס)',
             'Kantar': 'קנטאר', 'Yossi Tatika': 'יוסי טאטיקה', 'Lazar Research': 'מכון לזר (Panel4All)', 'Maagar Mochot': 'מאגר מוחות'}
MONTHS = {'Jan': 1, 'Feb': 2, 'Mar': 3, 'Apr': 4, 'May': 5, 'Jun': 6, 'June': 6, 'Jul': 7, 'July': 7, 'Aug': 8, 'Sept': 9, 'Sep': 9, 'Oct': 10, 'Nov': 11, 'Dec': 12}

def load():
    return json.load(open(PATH, encoding='utf-8'))

def save(d):
    json.dump(d, open(PATH, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

def now():
    return datetime.datetime.now().astimezone().isoformat(timespec='minutes')

def pid(p):
    return f"{p['date']}_{re.sub(r'[^a-z0-9]+', '', p['outletEn'].lower()) or 'x'}"

def validate(p, party_ids):
    s = {k: v for k, v in p['seats'].items() if v is not None}
    tot = sum(s.values())
    errs = []
    if tot != 120:
        errs.append(f'sum={tot} (expected 120)')
    for k, v in s.items():
        if k not in party_ids:
            errs.append('unknown list ' + k)
        if v not in (0,) and v < 4:
            errs.append(f'{k}={v}: a list passing the 3.25% threshold gets at least 4 seats')
    return errs

def recompute(d):
    polls = sorted(d['polls'], key=lambda p: (p['date'], p['outlet']))
    ids = [x['id'] for x in d['parties']]
    def window_avg(end):
        e = datetime.date.fromisoformat(end)
        start = (e - datetime.timedelta(days=d['method']['windowDays'] - 1)).isoformat()
        latest = {}
        for p in polls:
            if start <= p['date'] <= end:
                latest[p['outlet']] = p  # sorted by date -> keeps the most recent per outlet
        sel = list(latest.values())
        if not sel:
            return None
        avg = {k: round(sum((p['seats'].get(k) or 0) for p in sel) / len(sel), 2) for k in ids}
        return start, sel, avg
    last = polls[-1]['date']
    start, sel, avg = window_avg(last)
    rng = {k: [min((p['seats'].get(k) or 0) for p in sel), max((p['seats'].get(k) or 0) for p in sel)] for k in ids}
    passes = {k: sum(1 for p in sel if (p['seats'].get(k) or 0) > 0) for k in ids}
    blocs = []
    for b in d['blocs']:
        blocs.append({'id': b['id'], 'avg': round(sum(avg[m] for m in b['members']), 1),
                      'perPoll': {p['id']: sum((p['seats'].get(m) or 0) for m in b['members']) for p in sel}})
    trend = []
    dates = sorted({p['date'] for p in polls if p['date'] >= d['method']['trendFrom']})
    for dt in dates:
        r = window_avg(dt)
        if r:
            trend.append({'date': dt, 'n': len(r[1]), 'avg': {k: round(v, 1) for k, v in r[2].items()}})
    d['computed'] = {'computedAt': now(), 'asOf': last, 'window': [start, last], 'included': [p['id'] for p in sel],
                     'n': len(sel), 'average': {k: round(v, 1) for k, v in avg.items()}, 'range': rng, 'passesIn': passes,
                     'blocs': blocs, 'trend': trend}
    d['meta']['updatedAt'] = now()
    d['meta']['latestPollDate'] = last
    d['meta']['pollCount'] = len(polls)
    return d

IIE_HEAD = {'Likud': 'likud', 'Yashar!': 'yashar', 'Together': 'beyachad', 'Democrats': 'dems', 'Joint List': 'joint',
            'Otzma': 'otzma', 'United Torah': 'utj', 'Shas': 'shas', 'Yisrael Beiteinu': 'yb', 'Religious Zionism': 'rzz',
            "Ra'am": 'raam', 'Reservists': 'miluim', 'Amcha': 'amcha', 'Blue and White': 'bw'}

def iie_cols(text):
    # column order is read from the table header (the tracker reordered columns on 21-22.10.2026)
    st = text.find('newest first')
    th = text[text.find('<thead', st):]
    th = html.unescape(th[:th.find('</thead>')])
    cols = []
    for cell in re.findall(r'<th[^>]*>(.*?)</th>', th, re.S):
        c = re.sub('<[^>]+>', ' ', cell)
        hit = [v for k, v in IIE_HEAD.items() if k in c]
        if len(hit) == 1:
            cols.append(hit[0])
    if sorted(cols) != sorted(IIE_COLS):
        sys.exit('iie header not recognised: ' + repr(cols))
    return cols

def parse_iie(text, since):
    cols = iie_cols(text)
    tb = text[text.find('<tbody', text.find('newest first')):]
    tb = tb[:tb.find('</tbody>')]
    out = []
    for r in re.findall(r'<tr[^>]*>(.*?)</tr>', tb, re.S):
        tds = re.findall(r'<td[^>]*>(.*?)</td>', r, re.S)
        clean = lambda x: html.unescape(re.sub('<[^>]+>', '', x)).strip()
        dd, mon, yy = clean(tds[0]).split()
        date = datetime.date(int(yy), MONTHS[mon], int(dd)).isoformat()
        if date < since:
            continue
        m = re.match(r'(.*?)<div class="tiny"[^>]*>(.*?)</div>', tds[1], re.S)
        pollster = clean(m.group(1)) if m else clean(tds[1])
        outl = clean(m.group(2)) if m else ''
        sample = None
        ms = re.search(r'n=([\d,]+)', outl)
        if ms:
            sample = int(ms.group(1).replace(',', ''))
        outl = outl.split(' · ')[0].strip()
        nums = [clean(x) for x in tds[2:2 + len(IIE_COLS)]]
        seats = {k: (int(v) if v.isdigit() else None) for k, v in zip(cols, nums)}
        links = [html.unescape(u) for u in re.findall(r'href="([^"]+)"', tds[2 + len(IIE_COLS)])]
        prim = [u for u in links if 'web.archive.org' not in u]
        out.append({'date': date, 'outletEn': outl, 'outlet': OUTLETS.get(outl, outl), 'pollsterEn': pollster,
                    'pollster': POLLSTERS.get(pollster, pollster), 'sample': sample, 'seats': seats,
                    'url': (prim or links or [None])[0], 'urls': links, 'source': 'israelielections.com'})
    return out

def merge(d, new):
    have = {(p['date'], p['outlet'], json.dumps(p['seats'], sort_keys=True)) for p in d['polls']}
    byid = {p['id']: p for p in d['polls']}
    added = 0
    for p in new:
        key = (p['date'], p['outlet'], json.dumps(p['seats'], sort_keys=True))
        if key in have:
            for q in d['polls']:  # same poll reported twice: merge links
                if (q['date'], q['outlet'], json.dumps(q['seats'], sort_keys=True)) == key:
                    q['urls'] = list(dict.fromkeys(q['urls'] + p['urls']))
                    q['sample'] = q.get('sample') or p.get('sample')
            continue
        p['id'] = pid(p)
        while p['id'] in byid:
            p['id'] += 'b'
        p.setdefault('verified', None)
        errs = validate(p, [x['id'] for x in d['parties']])
        if errs:
            p['warnings'] = errs
            print('WARN', p['id'], errs)
        d['polls'].append(p); byid[p['id']] = p; have.add(key); added += 1
    return added

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('cmd', choices=['recompute', 'add', 'import-iie'])
    ap.add_argument('--date'); ap.add_argument('--outlet'); ap.add_argument('--outlet-en'); ap.add_argument('--pollster')
    ap.add_argument('--url'); ap.add_argument('--sample', type=int); ap.add_argument('--html'); ap.add_argument('--since', default='2026-09-09')
    ap.add_argument('seats', nargs='*')
    a = ap.parse_args()
    d = load()
    if a.cmd == 'add':
        seats = {x['id']: 0 for x in d['parties']}
        for kv in a.seats:
            k, v = kv.split('='); seats[k] = int(v)
        p = {'date': a.date, 'outlet': a.outlet, 'outletEn': a.outlet_en or a.outlet, 'pollster': a.pollster, 'pollsterEn': a.pollster,
             'sample': a.sample, 'seats': seats, 'url': a.url, 'urls': [a.url], 'source': 'manual', 'verified': True}
        errs = validate(p, list(seats))
        if errs:
            sys.exit('invalid poll: ' + '; '.join(errs))
        merge(d, [p])
    elif a.cmd == 'import-iie':
        text = open(a.html, encoding='utf-8').read() if a.html else urllib.request.urlopen(
            urllib.request.Request(IIE_URL, headers={'User-Agent': 'Mozilla/5.0 elections-2026 updater'}), timeout=30).read().decode('utf-8')
        n = merge(d, parse_iie(text, a.since))
        print('imported', n, 'new polls')
    recompute(d)
    save(d)
    c = d['computed']
    print('polls:', len(d['polls']), '| latest:', c['asOf'], '| window:', c['window'], '| n:', c['n'])
    print('average:', ' '.join(f"{k}={v}" for k, v in sorted(c['average'].items(), key=lambda x: -x[1])))
    # clip B (/clip-site/) embeds the poll averages: regenerate it from the new data (non-fatal for the routine: on any mismatch the old, dated site-data.js is kept and a WARNING is printed)
    import subprocess
    r = subprocess.run([sys.executable, os.path.join(ROOT, 'tools', 'build_clip_site.py')])
    if r.returncode: print('WARNING: build_clip_site.py failed - clip-site/site-data.js NOT updated (it keeps its previous, dated data). Fix before the next commit.', file=sys.stderr)
    r = subprocess.run([sys.executable, os.path.join(ROOT, 'tools', 'build_coalition.py')])
    if r.returncode: print('WARNING: build_coalition.py failed - data/coalition.json NOT updated (it keeps its previous data; the coalition page still works). Fix before the next commit.', file=sys.stderr)

if __name__ == '__main__':
    main()
