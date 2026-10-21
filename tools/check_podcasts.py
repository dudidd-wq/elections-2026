#!/usr/bin/env python3
"""Validate data/podcasts.json (the 'פודקאסטים וראיונות' section).
It is independent of build_data.py / update_polls.py: the twice-daily routine never rewrites it.
Run after editing podcasts.json or after list ids change in platforms.json. Exit code 1 on any problem."""
import json, sys, re, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = json.load(open(os.path.join(ROOT, 'data/platforms.json'), encoding='utf-8'))
D = json.load(open(os.path.join(ROOT, 'data/podcasts.json'), encoding='utf-8'))
ids = {l['id'] for l in P['lists']}; iss = {i['id'] for i in P['issues']}
err = []
d_ = lambda s: re.fullmatch(r'\d{4}-\d{2}-\d{2}', s or '')
if not d_(D.get('updated')): err.append('updated missing/invalid')
got = {l['id'] for l in D['lists']}
if got != ids: err.append(f'list ids differ from platforms.json: missing {sorted(ids-got)} extra {sorted(got-ids)}')
n = 0
for l in D['lists']:
    for k in ('items', 'compare', 'context', 'unverified'):
        if not isinstance(l.get(k), list): err.append(f"{l['id']}: {k} must be a list")
    for it in l['items']:
        n += 1
        for k in ('id', 'show', 'host', 'outlet', 'type', 'date', 'length', 'lang', 'url', 'audience'):
            if not it.get(k): err.append(f"{l['id']}/{it.get('id')}: missing {k}")
        if not d_(it.get('date')) or not (D['window'][0] <= it['date'] <= D['window'][1]): err.append(f"{it.get('id')}: date outside window")
        if not str(it.get('url', '')).startswith('http'): err.append(f"{it.get('id')}: bad url")
        for t in it.get('topics', []):
            if t not in iss: err.append(f"{it['id']}: unknown issue {t}")
        if not it.get('points'): err.append(f"{it['id']}: no key points")
        for q in it.get('quotes', []):
            if not q.get('text') or not str(q.get('source_url', '')).startswith('http') or not q.get('verified_by'):
                err.append(f"{it['id']}: quote missing text/source_url/verified_by")
    for c in l['compare']:
        if c['issue'] not in iss: err.append(f"{l['id']}: compare issue {c['issue']}")
        for r in c['items']:
            if r not in {i['id'] for i in l['items']}: err.append(f"{l['id']}: compare ref {r}")
if D.get('total') != n: err.append(f'total {D.get("total")} != {n}')
print('\n'.join(err) if err else f'ok: lists {len(got)} items {n}')
sys.exit(1 if err else 0)
