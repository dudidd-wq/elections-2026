#!/usr/bin/env python3
"""Add 27.10.2026 exit-poll rows / official results to data/exitpolls.json -> y2026.

Append-only. Never deletes or edits a published row; after `freeze` nothing can change.
List ids/names come from data/polls.json (parties), so the 2026 table uses the site's own ids.

  add-poll   --channel c12 --pollster "..." --time 22:00 --kind initial|update \
             --seats likud=30,yashar=12,... --source URL [--source URL2] [--note "..."]
  set-results --seats likud=..,... --source URL --label "תוצאות רשמיות (סופיות)" \
             [--short "תוצאה"] [--bloc likud,shas,...] [--bloc-source URL] [--note "..."]
             (may be called again until freeze, e.g. partial -> final count; the old one is kept in resultsHistory)
  freeze     marks y2026 frozen (do this once CEC publishes the final certified results)
  show       prints y2026 summary + metrics vs results
Lists not named in --seats are recorded as 0 (did not pass the threshold in that poll). Seats must sum to 120.
"""
import argparse, datetime, json, os, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = os.path.join(ROOT, 'data', 'exitpolls.json')
TODAY = datetime.date.today().isoformat()

def load():
    with open(P, encoding='utf-8') as f: return json.load(f)
def save(d):
    with open(P, 'w', encoding='utf-8') as f: json.dump(d, f, ensure_ascii=False, indent=1); f.write('\n')
def parties():
    with open(os.path.join(ROOT, 'data', 'polls.json'), encoding='utf-8') as f:
        return [p for p in json.load(f)['parties'] if not p.get('withdrawn')]
def parse_seats(s, ids):
    out = {i: 0 for i in ids}
    for kv in s.split(','):
        k, v = kv.split('='); k = k.strip()
        if k not in out: sys.exit('unknown list id %r (known: %s)' % (k, ','.join(ids)))
        out[k] = int(v)
    if sum(out.values()) != 120: sys.exit('seats sum to %d, not 120' % sum(out.values()))
    return out
def srcs(urls, note=''):
    if not urls: sys.exit('at least one --source URL is required')
    return [{'url': u, 'retrieved': TODAY, 'note': note} for u in urls]
def metrics(lists, actual, seats, bloc):
    diff = {l['id']: seats.get(l['id'], 0) - actual.get(l['id'], 0) for l in lists}
    sa = sum(abs(v) for v in diff.values())
    return {'misallocated': sa / 2, 'within1': sum(abs(v) <= 1 for v in diff.values()), 'n': len(lists),
            'bloc': sum(seats.get(i, 0) for i in bloc), 'blocActual': sum(actual.get(i, 0) for i in bloc)}

def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('cmd', choices=['add-poll', 'set-results', 'freeze', 'show'])
    for a in ['--channel', '--pollster', '--time', '--kind', '--seats', '--note', '--label', '--short', '--bloc', '--bloc-source']: ap.add_argument(a)
    ap.add_argument('--source', action='append', default=[])
    a = ap.parse_args()
    d = load(); y = d['y2026']
    if a.cmd == 'show':
        print(json.dumps({k: y[k] for k in ('status', 'note')}, ensure_ascii=False)); print(len(y['polls']), 'polls')
        r = y.get('results')
        for p in y['polls']:
            print(p['id'], p['channel'], p['time'], (metrics(y['lists'], r['seats'], p['seats'], r.get('blocLists') or []) if r else ''))
        return
    if y.get('status') == 'frozen': sys.exit('y2026 is frozen; nothing may be added or changed')
    if not y['lists']:
        y['lists'] = [{'id': p['id'], 'name': p['name']} for p in parties()]
    ids = [l['id'] for l in y['lists']]
    if a.cmd == 'add-poll':
        if a.channel not in d['meta']['channels']: sys.exit('unknown channel %r (add it to meta.channels in tools/build_exitpolls.py)' % a.channel)
        if a.kind not in ('initial', 'update') or not a.time or not a.pollster: sys.exit('--kind initial|update, --time and --pollster are required')
        if a.kind == 'initial' and any(p['channel'] == a.channel and p['kind'] == 'initial' for p in y['polls']): sys.exit('initial poll for this channel already recorded (rows are never replaced)')
        n = sum(p['channel'] == a.channel for p in y['polls'])
        pid = '2026-%s-%s' % (a.channel, 'init' if a.kind == 'initial' else 'u%d' % n)
        y['polls'].append({'id': pid, 'channel': a.channel, 'pollster': a.pollster, 'time': a.time, 'kind': a.kind,
                           'seats': parse_seats(a.seats, ids), 'sources': srcs(a.source, a.note or ''), 'addedAt': datetime.datetime.now().isoformat(timespec='minutes')})
        y['status'] = 'polls'
        y['note'] = 'המדגמים כפי שפורסמו בערב הבחירות, 27.10.2026. זו לא תוצאה: ההשוואה לתוצאות תתווסף כשוועדת הבחירות המרכזית תפרסם אותן.'
        print('added', pid)
    elif a.cmd == 'set-results':
        if not a.label: sys.exit('--label required (e.g. "תוצאות רשמיות סופיות" or "ספירה חלקית, 99% מהקלפיות")')
        r = {'label': a.label, 'short': a.short or 'תוצאה', 'seats': parse_seats(a.seats, ids), 'source': srcs(a.source)[0],
             'blocLists': [b.strip() for b in (a.bloc or '').split(',') if b.strip()], 'note': a.note or ''}
        if a.bloc_source: r['blocSource'] = srcs([a.bloc_source])[0]
        for b in r['blocLists']:
            if b not in ids: sys.exit('unknown bloc id %r' % b)
        if y.get('results'): y.setdefault('resultsHistory', []).append(y['results'])
        y['results'] = r; y['status'] = 'results'
        y['note'] = 'המדגמים של 27.10.2026 מול ' + a.label + '. המדדים מחושבים באותן נוסחאות כמו ב-2019–2022.'
        print('results set')
    elif a.cmd == 'freeze':
        if not y.get('results'): sys.exit('no results yet; freeze only after the final certified results')
        y['status'] = 'frozen'; y['frozenAt'] = datetime.datetime.now().isoformat(timespec='minutes')
        print('frozen')
    save(d)

if __name__ == '__main__': main()
