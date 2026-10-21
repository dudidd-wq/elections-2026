#!/usr/bin/env python3
"""Build clip-site/site-data.js (the animated site-overview clip at /clip-site/) from the site's own data ONLY:
data/platforms.json, data/analysis.json, data/polls.json (+ the site's own UI labels in index.html / js/app.js).
Every text is copied verbatim (or as an exact leading sentence) from its source field and asserted here; every number
is computed from the data. Run: python3 tools/build_clip_site.py -> prints a summary; exit 1 on any mismatch.
Called automatically at the end of tools/update_polls.py and tools/build_data.py, so the twice-daily poll routine
regenerates clip B with the data (then bump sw.js VERSION as usual)."""
import json, os, re, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
J = lambda p: json.load(open(os.path.join(ROOT, p), encoding='utf-8'))
P, A, PO = J('data/platforms.json'), J('data/analysis.json'), J('data/polls.json')
APP = open(os.path.join(ROOT, 'js/app.js'), encoding='utf-8').read()
IDX = open(os.path.join(ROOT, 'index.html'), encoding='utf-8').read()
err = []
def need(text, src, where):
    if text not in src: err.append(f'{where}: text not found verbatim: {text[:60]}')
    return text
def first_sentence(s):
    m = re.match(r'(.+?[.!?])(\s|$)', s.strip())
    return m.group(1) if m else s.strip()
def dshort(d):  # 2026-10-20 -> 20.10
    return '%d.%d' % (int(d[8:10]), int(d[5:7]))
def dlong(d):
    return '%d.%d.%s' % (int(d[8:10]), int(d[5:7]), d[:4])

meta = P['meta']
sub = meta['subtitle'].split(' · ')
lists = P['lists']; nL = len(lists); issues = P['issues']; nI = len(issues)
out = {
  'title': need(meta['title'], meta['title'], 'meta.title'),
  'election': need(sub[0] + ' · ' + sub[1], meta['subtitle'], 'meta.subtitle'),
  'docAsOf': need(sub[2], meta['subtitle'], 'meta.subtitle'),
  'nLists': nL, 'nIssues': nI,
  'heroLead': 'השוואה ניטרלית של עמדות %d רשימות ב-%d סוגיות, כל עמדה במסגור של הרשימה עצמה ועם קישור למקור.' % (nL, nI),
  'heroNo': need('אין כאן המלצה להצבעה, אין שאלון התאמה ואין ציון לעמדות.', APP, 'app.js hero'),
  'issues': [i['short'] for i in issues],
}
need("השוואה ניטרלית של עמדות ' + nLists() + ' רשימות ב-10 סוגיות, כל עמדה במסגור של הרשימה עצמה ועם קישור למקור.", APP, 'app.js hero')
if nI != 10: err.append('issues != 10 (hero text says 10)')
# how positions are marked
rg = P['readingGuide']
out['sourceTypes'] = [{'k': k, 'v': v} for k, v in re.findall(r'"([^"]+)" = ([^.]+)\.', rg)]
if len(out['sourceTypes']) != 4: err.append('readingGuide: expected 4 source types, got %d' % len(out['sourceTypes']))
for t in out['sourceTypes']: need('"%s" = %s.' % (t['k'], t['v']), rg, 'readingGuide')
nf = re.search(r'"לא נמצאה עמדה" ([^.]+)\.', rg); out['notFound'] = need('"לא נמצאה עמדה" ' + nf.group(1) + '.', rg, 'readingGuide') if nf else err.append('notFound')
out['star'] = need(P['starLegend'], P['starLegend'], 'starLegend')
# cross-cutting analysis
out['analysisTitle'] = A['title']
out['rank'] = [r['label'] for r in sorted(A['rank'], key=lambda r: r['rank'])]
out['rankNote'] = need(first_sentence(A['intro'][1]), A['intro'][1], 'analysis.intro[1]')
ax = A['crossAxis'][0]; out['axis'] = {'label': ax['label'], 'text': need(first_sentence(ax['text']), ax['text'], 'crossAxis[0]')}
out['broadHeading'] = A['headings']['broad']
out['broad'] = [{'label': c['label'], 'text': need(first_sentence(c['text']), c['text'], 'consensusBroad')} for c in A['consensusBroad']]
# polls (as of the latest poll in polls.json – no new polls may be published from Fri 23.10 by law; the clip shows the data as of its date)
c = PO['computed']; tr0 = c['trend'][0]
ids = [l['id'] for l in lists]
for i in ids:
    if i not in c['average']: err.append('polls: no average for ' + i)
out['polls'] = {
  'asOf': dlong(c['asOf']), 'window': [dshort(c['window'][0]), dshort(c['window'][1])], 'n': c['n'],
  'avg': {i: c['average'][i] for i in ids}, 'from': dlong(tr0['date']), 'fromAvg': {i: tr0['avg'][i] for i in ids},
  'silence': need(PO['meta']['silence'], PO['meta']['silence'], 'polls.meta.silence'),
  'threshold': need(first_sentence(PO['meta']['threshold']), PO['meta']['threshold'], 'polls.meta.threshold'),
  'method': need(first_sentence(PO['method']['text']), PO['method']['text'], 'polls.method'),
  'updated': PO['meta']['updatedAt'][:10]
}
# 13 lists – one neutral line each: the first sentence of the list's composition, plus ballot letters and leader
out['lists'] = [{'id': l['id'], 'name': l['tableName'], 'letters': l['letters'], 'leader': l['leader'],
                 'comp': need(first_sentence(l['composition']), l['composition'], 'composition ' + l['id'])} for l in lists]
# how to use the site: the site's own navigation labels
nav = re.findall(r'data-nav="([a-z]+)"[^>]*>([^<]+)<', IDX)
out['nav'] = [{'id': k, 'label': v.strip()} for k, v in nav if k != 'home']
if len(out['nav']) < 6: err.append('nav labels not found')
out['site'] = 'https://dudidd-wq.github.io/elections-2026/'
out['updated'] = dlong(meta['documentAsOf'])
if err:
    print('\n'.join(err)); sys.exit(1)
open(os.path.join(ROOT, 'clip-site/site-data.js'), 'w', encoding='utf-8').write(
    '/* generated by tools/build_clip_site.py from data/platforms.json, data/analysis.json, data/polls.json – do not edit */\nwindow.SITE_CLIP = ' + json.dumps(out, ensure_ascii=False, indent=1) + ';\n')
print('ok: clip-site lists', nL, 'issues', nI, 'source types', len(out['sourceTypes']), 'rank', len(out['rank']), 'broad', len(out['broad']), 'polls asOf', out['polls']['asOf'], 'n', out['polls']['n'], 'nav', len(out['nav']))
