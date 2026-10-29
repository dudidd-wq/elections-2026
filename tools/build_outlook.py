#!/usr/bin/env python3
"""Build data/outlook.json for the #/outlook page ("תחזית והקשר היסטורי").

A STATISTICAL ESTIMATE, NOT A RESULT. Everything is computed here from:
  * data/geo/index.json + data/geo/kNN.json  (official CEC results K21–K25, incl. the double-envelope row 9999)
  * data/exitpolls.json (2026 exit polls, partial counts; campaigns = official seats + recommendation blocs K21–K25)
  * data/polls.json (pre-election poll average, declared blocs)
  * COUNT26 / ENV26 below: the 2026 partial counts and double-envelope batches as published (sources inline).
Run: python3 tools/build_outlook.py   (deterministic: seeded RNG)
"""
import json, math, os, random, statistics as st
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
J = lambda p: json.load(open(os.path.join(ROOT, p), encoding='utf-8'))
SEED, NSIM, SEATS, THR = 2026, 20000, 120, 0.0325
IDS = ['likud', 'yashar', 'beyachad', 'joint', 'dems', 'raam', 'yb', 'otzma', 'utj', 'shas', 'rzz', 'miluim', 'amcha']
# Surplus agreements, CEC notice, Yalkut HaPirsumim 15045 (19.10.2026)
AGREEMENTS = [['yashar', 'dems'], ['likud', 'rzz'], ['beyachad', 'yb'], ['shas', 'utj'], ['raam', 'joint']]
AGR_SRC = [{'url': 'https://hakol-bo.co.il/elections-2026', 'note': 'רשימת הסכמי העודפים כפי שפורסמה (ועדת הבחירות, ילקוט הפרסומים 15045, עמ׳ 1098, 19.10.2026)'},
           {'url': 'https://machria.com/elections-2026', 'note': 'אותם חמישה הסכמים בין רשימות שעוברות את אחוז החסימה; עוצמה יהודית, המילואימניקים ועמך ישראל בלי הסכם'}]

# ---- 2026 partial counts (CEC numbers as quoted). votes per list; 'other' = valid - sum(lists)
COUNT26 = {
  'c1116': {'asOf': '2026-10-29T11:16+02:00', 'label': 'כל 12,018 הקלפיות הרגילות + 208 קלפיות מעטפות כפולות',
            'valid': 5355415, 'invalid': 23988, 'envBoxes': 208,
            'votes': dict(likud=1104055, yashar=864323, beyachad=489995, joint=484083, dems=346632, raam=322775, yb=317770, otzma=300676, utj=299052, shas=282835, rzz=260264, miluim=142768, amcha=87440),
            'sources': [{'url': 'https://machria.com/elections-2026', 'note': 'עדכון 11:16'}, {'url': 'https://israelielections.com/2026/results/', 'note': 'עדכון 11:32, אותם מספרים'}, {'url': 'https://www.kipa.co.il/%D7%97%D7%93%D7%A9%D7%95%D7%AA/1235019-0/', 'note': 'אותם מספרים, 11:16'}]},
  'c1244': {'asOf': '2026-10-29T12:44+02:00', 'label': 'כל 12,018 הקלפיות הרגילות + 314 קלפיות מעטפות כפולות',
            'valid': 5409377, 'invalid': 24285, 'envBoxes': 314,
            'votes': dict(likud=1113916, yashar=871828, beyachad=496469, joint=487472, dems=349488, raam=325192, yb=321049, otzma=304809, utj=301487, shas=285598, rzz=265109, miluim=144766, amcha=88718),
            'sources': [{'url': 'https://machria.com/elections-2026', 'note': 'עדכון 12:44'}]},
}
VOTERS_2200 = 5695682   # CEC figure at 22:00 (77.7% of 7,331,981)
ELIGIBLE = 7331981
# Double envelopes counted, by cumulative batch (share of valid envelope votes, %), as reported
ENV26 = [
  {'n': 29253, 'src': 'https://www.ynet.co.il/news/article/hk3f7wxafx', 'pct': dict(likud=18.5, beyachad=15.6, yashar=14.8, rzz=13.4, otzma=9.4, yb=6.3, dems=5.2, miluim=4.4, amcha=3.24, shas=3.1, utj=2.9, joint=0.9, raam=0.9)},
  {'n': 64304, 'src': 'https://www.hidabroot.org/article/1229030', 'pct': dict(likud=18.8, yashar=15.3, beyachad=14.7, rzz=11.6, otzma=8.4, yb=6.1, dems=5.5, miluim=4.1, shas=3.8, utj=3.3, amcha=2.9, joint=2.2, raam=1.7)},
  {'n': 153458, 'src': 'https://www.ynet.co.il/news/article/r1dwsce6zx', 'pct': dict(likud=18.54, yashar=15.36, beyachad=14.21, rzz=10.57, otzma=8.01, yb=6.02, dems=5.95, shas=4.48, utj=4.05, miluim=3.97, amcha=2.73, joint=2.62, raam=1.99)},
]
ENV_TOTAL_MIN = 400000   # ynet: "מתוך יותר מ-400 אלף"
ENV_INVALID_RATE = 4093 / 462807  # K25 envelope invalid rate (data/geo k25 row 9999)
TOTAL_FACTOR_2022 = 4794593 / 4843023  # final voters / CEC 22:00 figure, 2022 (JNS + CEC final)
LETTER26 = {'likud': ['מחל'], 'shas': ['שס'], 'utj': ['ג'], 'yb': ['ל'], 'raam': ['עם'], 'joint': ['ום', 'ד', 'ודעם'], 'dems': ['אמת', 'מרצ'],
            'rzz': ['ט'], 'otzma': ['ט'], 'beyachad': ['פה'], 'yashar': ['כן']}

def r(x, d=2): return round(x, d)

# ---------------- Bader–Ofer ----------------
def bader_ofer(votes, agreements=(), seats=SEATS, thr=THR):
    valid = sum(votes.values())
    passing = {k: v for k, v in votes.items() if k != 'other' and v >= thr * valid}
    q = sum(passing.values()) / seats
    s = {k: int(v // q) for k, v in passing.items()}
    units = []
    used = set()
    for a, b in agreements:
        if a in passing and b in passing:
            units.append((a, b)); used |= {a, b}
    units += [(k,) for k in passing if k not in used]
    us = {u: sum(s[k] for k in u) for u in units}
    uv = {u: sum(passing[k] for k in u) for u in units}
    left = seats - sum(s.values())
    for _ in range(left):
        u = max(units, key=lambda u: (uv[u] / (us[u] + 1), uv[u]))
        us[u] += 1
    out = {k: 0 for k in votes if k != 'other'}
    for u in units:
        if len(u) == 1: out[u[0]] = us[u]; continue
        tot = us[u]; qq = uv[u] / tot
        ss = {k: int(passing[k] // qq) for k in u}
        for _ in range(tot - sum(ss.values())):
            k = max(u, key=lambda k: (passing[k] / (ss[k] + 1), passing[k]))
            ss[k] += 1
        out.update(ss)
    return out

def last_seat_margins(votes, agreements):
    """votes a list must gain to win one more seat / can lose before losing one (others fixed), by bisection."""
    base = bader_ofer(votes, agreements); res = {}
    for k in base:
        if base[k] == 0: continue
        def seats_with(dv):
            v = dict(votes); v[k] = max(0, v[k] + dv); return bader_ofer(v, agreements)[k]
        lo, hi = 0, 60000
        if seats_with(hi) <= base[k]: up = None
        else:
            while hi - lo > 1:
                m = (lo + hi) // 2
                if seats_with(m) > base[k]: hi = m
                else: lo = m
            up = hi
        lo, hi = 0, 60000
        if seats_with(-hi) >= base[k]: down = None
        else:
            while hi - lo > 1:
                m = (lo + hi) // 2
                if seats_with(-m) < base[k]: hi = m
                else: lo = m
            down = hi
        res[k] = {'gain': up, 'lose': down}
    return res

def q(xs, p):
    xs = sorted(xs); i = (len(xs) - 1) * p; a = int(math.floor(i)); b = min(a + 1, len(xs) - 1)
    return xs[a] + (xs[b] - xs[a]) * (i - a)

# ---------------- history K21–K25 ----------------
GI = J('data/geo/index.json'); EP = J('data/exitpolls.json'); PD = J('data/polls.json')
CAMP = {c['knesset']: c for c in EP['campaigns']}
hist = []
for e in GI['elections']:
    k = e['k']; nat = e['national']; env = e['envelopes']
    lists = {l['l']: {'n': l['n'], 'v': l['v']} for l in e['lists']}
    kj = J('data/geo/k%d.json' % k)
    row = [x for x in kj['rows'] if x[0] in (9999, 99999)][0]
    col = {c: i for i, c in enumerate(kj['cols'])}
    for L in lists: lists[L]['env'] = row[col[L]]
    other_v = e['otherVotes']; other_env = row[col['other']]
    valid = nat[3]; envv = env[3]; regv = valid - envv
    camp = CAMP[k]
    seat_off = [l['seats'] for l in camp['lists']]
    shares = [l['v'] / valid for l in lists.values()]
    below = sum(l['v'] for l in lists.values() if l['v'] < THR * valid) + other_v
    reg_votes = {L: lists[L]['v'] - lists[L]['env'] for L in lists}; reg_votes['other'] = other_v - other_env
    fin_votes = {L: lists[L]['v'] for L in lists}; fin_votes['other'] = other_v
    s_reg = bader_ofer(reg_votes); s_fin = bader_ofer(fin_votes)
    drift = {L: r(100 * (fin_votes[L] / valid - reg_votes[L] / regv), 3) for L in lists}
    ratio = {L: ((lists[L]['env'] / envv) / (reg_votes[L] / regv)) if reg_votes[L] > 0 else None for L in lists}
    hist.append({'k': k, 'date': e['date'], 'label': camp['label'], 'eligible': nat[0], 'voters': nat[1], 'valid': valid,
                 'turnout': r(100 * nat[1] / nat[0]), 'envVoters': env[1], 'envShare': r(100 * env[1] / nat[1]),
                 'enpVotes': r(1 / sum(x * x for x in shares)), 'enpSeats': r(SEATS * SEATS / sum(x * x for x in seat_off)),
                 'wastedPct': r(100 * below / valid), 'wastedVotes': below,
                 'blocSeats': camp['bloc']['seats'], 'blocLists': [l['name'] for l in camp['lists'] if l['inBloc']], 'blocSource': camp['bloc']['source']['url'],
                 'lists': [{'l': L, 'n': lists[L]['n'], 'v': lists[L]['v'], 'env': lists[L]['env'], 'pct': r(100 * lists[L]['v'] / valid),
                            'regPct': r(100 * reg_votes[L] / regv), 'envPct': r(100 * lists[L]['env'] / envv),
                            'ratio': r(ratio[L], 3) if ratio[L] else None, 'drift': drift[L]} for L in lists],
                 'maxDrift': max(abs(x) for x in drift.values()), 'seatsMovedByEnvelopes': sum(abs(s_fin[L] - s_reg[L]) for L in s_fin) // 2,
                 'seatsMovedDetail': {lists[L]['n']: s_fin[L] - s_reg[L] for L in s_fin if s_fin[L] != s_reg[L]},
                 '_reg': reg_votes, '_fin': fin_votes, '_envv': envv, '_regv': regv, '_ratio': ratio,
                 'source': camp['cec']['url']})
# Pedersen volatility by ballot letter (approximation; letters re-used by different lists)
CHAIN = {'ודעם': ['ום', 'דעם', 'ד'], 'ום+ד': ['ודעם']}
for a, b in zip(hist, hist[1:]):
    pa = {x['l']: x['pct'] for x in a['lists']}; pb = {x['l']: x['pct'] for x in b['lists']}
    keys = set(pa) | set(pb)
    b['pedersen'] = r(sum(abs(pb.get(k, 0) - pa.get(k, 0)) for k in keys) / 2, 1)
    sw = sorted(((pb.get(k, 0) - pa.get(k, 0), k) for k in keys if k in pa and k in pb), key=lambda t: -abs(t[0]))[:3]
    nb = {x['l']: x['n'] for x in b['lists']}
    b['topSwings'] = [{'l': k, 'n': nb[k], 'from': pa[k], 'to': pb[k], 'pp': r(d)} for d, k in sw]
    b['turnoutChange'] = r(b['turnout'] - a['turnout'])
    b['blocChange'] = b['blocSeats'] - a['blocSeats']

def hist_ratio(lettersets, upto_k, n_prev=2):
    """mean envelope/regular ratio over the n_prev elections before upto_k, for the list identified by any of the letters"""
    vals = []
    for h in [h for h in hist if h['k'] < upto_k][-n_prev:]:
        L = [l for l in lettersets if l in h['_reg']]
        if not L: continue
        env = sum(h['_fin'][x] - h['_reg'][x] for x in L); reg = sum(h['_reg'][x] for x in L)
        if reg > 0: vals.append((env / h['_envv']) / (reg / h['_regv']))
    return (sum(vals) / len(vals), len(vals)) if vals else (1.0, 0)

# ---------------- backtest: regular-only subtotal + prior elections' envelope ratios -> final ----------------
def predict_from_regular(reg, envv, ratios):
    regv = sum(reg.values()); comp = {k: reg[k] / regv * ratios.get(k, 1.0) for k in reg}
    z = sum(comp.values()); return {k: reg[k] + envv * comp[k] / z for k in reg}
backtest = []
for h in hist[1:]:
    prev_letters = {L: [L] + CHAIN.get(L, []) for L in h['_reg']}
    ratios = {L: hist_ratio(prev_letters[L], h['k'])[0] for L in h['_reg']}
    pred = predict_from_regular(h['_reg'], h['_envv'], ratios)
    valid = h['valid']
    err = {L: 100 * (pred[L] - h['_fin'][L]) / valid for L in h['_fin'] if L != 'other'}
    naive = {L: 100 * (h['_reg'][L] / h['_regv'] - h['_fin'][L] / valid) for L in err}
    sp = bader_ofer(pred); sf = bader_ofer(h['_fin']); sn = bader_ofer({k: v / h['_regv'] for k, v in h['_reg'].items()})
    names = {x['l']: x['n'] for x in h['lists']}
    backtest.append({'k': h['k'], 'label': h['label'], 'mae': r(st.mean(abs(x) for x in err.values()), 3), 'maxErr': r(max(abs(x) for x in err.values()), 3),
                     'maxErrList': names[max(err, key=lambda k: abs(err[k]))],
                     'naiveMae': r(st.mean(abs(x) for x in naive.values()), 3), 'naiveMax': r(max(abs(x) for x in naive.values()), 3),
                     'seatErr': sum(abs(sp[L] - sf[L]) for L in sf) // 2, 'naiveSeatErr': sum(abs(sn[L] - sf[L]) for L in sf) // 2,
                     'matched': sum(1 for L in h['_reg'] if L != 'other' and hist_ratio(prev_letters[L], h['k'])[1] > 0), 'nLists': len(err)})

# ---------------- 2026: envelopes counted so far, remaining, projection ----------------
c1, c2 = COUNT26['c1116'], COUNT26['c1244']
for c in (c1, c2): c['votes']['other'] = c['valid'] - sum(c['votes'].values())
ALL = IDS + ['other']
def env_pct(b):
    p = dict(b['pct']); p['other'] = max(0.0, 100 - sum(p.values())); return p
env_valid_1116 = round(ENV26[-1]['n'] * (1 - ENV_INVALID_RATE))
env_votes_1116 = {k: env_pct(ENV26[-1])[k] / 100 * env_valid_1116 for k in ALL}
reg26 = {k: c1['votes'][k] - env_votes_1116[k] for k in ALL}       # regular-only subtotal
reg26_valid = sum(reg26.values())
inc = {k: c2['votes'][k] - c1['votes'][k] for k in ALL}            # 11:16 -> 12:44, all envelopes (regular boxes were complete)
inc_valid = sum(inc.values())
env_now = {k: env_votes_1116[k] + inc[k] for k in ALL}
env_now_valid = sum(env_now.values())
regular_ballots = c1['valid'] + c1['invalid'] - ENV26[-1]['n']
env_ballots_now = c2['valid'] + c2['invalid'] - regular_ballots
env_total_hi = VOTERS_2200 - regular_ballots                       # if the 22:00 figure equals the final total
env_total_mid = round(VOTERS_2200 * TOTAL_FACTOR_2022) - regular_ballots
env_total_lo = ENV_TOTAL_MIN
rem_lo = (env_total_lo - env_ballots_now) * (1 - ENV_INVALID_RATE)
rem_hi = (env_total_hi - env_ballots_now) * (1 - ENV_INVALID_RATE)
# batches (non-cumulative) for heterogeneity
batches = []
prev_n, prev = 0, {k: 0.0 for k in ALL}
for b in ENV26:
    p = env_pct(b); cum = {k: p[k] / 100 * b['n'] for k in ALL}; n = b['n'] - prev_n
    batches.append({'n': n, 'pct': {k: 100 * (cum[k] - prev[k]) / n for k in ALL}, 'src': b['src']}); prev_n, prev = b['n'], cum
batches.append({'n': inc_valid, 'pct': {k: 100 * inc[k] / inc_valid for k in ALL}, 'src': 'machria 11:16→12:44'})
last2 = batches[-2:]
mu = {k: sum(b['pct'][k] * b['n'] for b in last2) / sum(b['n'] for b in last2) for k in ALL}
envcum = {k: 100 * env_now[k] / env_now_valid for k in ALL}
sd = {k: max(0.3, abs(mu[k] - envcum[k]), st.pstdev([b['pct'][k] for b in batches[1:]]), 0.15 * mu[k]) for k in ALL}

# method B (history only) for 2026: regular subtotal + K24/K25 envelope ratios of predecessor lists
ratio26 = {}
for k in IDS:
    if k in LETTER26:
        letters = LETTER26[k]; rr, n = hist_ratio(letters, 26)
        ratio26[k] = {'ratio': r(rr, 3), 'n': n, 'letters': letters}
    else: ratio26[k] = {'ratio': 1.0, 'n': 0, 'letters': []}
ratio26['other'] = {'ratio': r(hist_ratio(['other'], 26)[0], 3), 'n': 2, 'letters': ['other']}
compB = {k: reg26[k] / reg26_valid * ratio26[k]['ratio'] for k in ALL}; zB = sum(compB.values())
compB = {k: 100 * compB[k] / zB for k in ALL}
liveCheckB = {k: {'predEnv': r(compB[k]), 'obsEnv': r(envcum[k])} for k in IDS}
liveCheckB_mae = r(st.mean(abs(compB[k] - envcum[k]) for k in IDS), 2)
# pseudo-backtest of method A inside 2026: from the 11:16 state, predict 12:44 using the batch-3 composition
predA_1244 = {k: c1['votes'][k] + inc_valid * batches[2]['pct'][k] / 100 for k in ALL}
pseudoA = {'mae': r(st.mean(abs(100 * predA_1244[k] / c2['valid'] - 100 * c2['votes'][k] / c2['valid']) for k in IDS), 3),
           'max': r(max(abs(100 * predA_1244[k] / c2['valid'] - 100 * c2['votes'][k] / c2['valid']) for k in IDS), 3),
           'seatErr': sum(abs(a - b) for a, b in zip(bader_ofer(predA_1244, AGREEMENTS).values(), bader_ofer(c2['votes'], AGREEMENTS).values())) // 2}

rng = random.Random(SEED)
sims_pct = {k: [] for k in ALL}; sims_seat = {k: [] for k in IDS}; sims_seat_na = {k: [] for k in IDS}
bloc_defs = [b for b in PD['blocs'] if b['id'] != 'other'] + [{'id': 'other', 'name': 'רשימות אחרות (המילואימניקים והכלכלית, עמך ישראל)', 'members': ['miluim', 'amcha']}]
sims_bloc = {b['id']: [] for b in bloc_defs}
agree_effect = {k: 0 for k in IDS}; scen = {}
for _ in range(NSIM):
    R = rng.uniform(rem_lo, rem_hi)
    s = {k: max(0.02, rng.gauss(mu[k], sd[k])) for k in ALL}; z = sum(s.values())
    v = {k: c2['votes'][k] + R * s[k] / z for k in ALL}
    V = sum(v.values())
    for k in ALL: sims_pct[k].append(100 * v[k] / V)
    a = bader_ofer(v, AGREEMENTS); na = bader_ofer(v)
    assert sum(a.values()) == SEATS and sum(na.values()) == SEATS
    for k in IDS:
        sims_seat[k].append(a[k]); sims_seat_na[k].append(na[k]); agree_effect[k] += a[k] - na[k]
    for b in bloc_defs: sims_bloc[b['id']].append(sum(a[m] for m in b['members'] if m in a))
    key = tuple(a[k] for k in IDS); scen[key] = scen.get(key, 0) + 1
modal = max(scen, key=scen.get)
names = {l['id']: l['name'] for l in EP['y2026']['lists']}
proj = []
for k in IDS:
    sp, ss, sn = sims_pct[k], sims_seat[k], sims_seat_na[k]
    med = int(round(q(ss, .5)))
    dist = {}
    for x in ss: dist[x] = dist.get(x, 0) + 1
    proj.append({'id': k, 'name': names[k], 'counted': r(100 * c2['votes'][k] / c2['valid']), 'votes': c2['votes'][k],
                 'envSoFar': r(envcum[k]), 'envRemainingMu': r(mu[k]), 'envRemainingSd': r(sd[k]),
                 'regOnly': r(100 * reg26[k] / reg26_valid),
                 'histRatio': ratio26[k]['ratio'], 'histRatioN': ratio26[k]['n'],
                 'pct': {'p10': r(q(sp, .1)), 'p50': r(q(sp, .5)), 'p90': r(q(sp, .9))},
                 'seats': {'p10': int(q(ss, .1)), 'p50': med, 'p90': int(math.ceil(q(ss, .9) - 1e-9)), 'mean': r(st.mean(ss), 2)},
                 'seatsNoAgr': {'p50': int(round(q(sn, .5))), 'mean': r(st.mean(sn), 2)},
                 'agreementEffect': r(agree_effect[k] / NSIM, 2),
                 'pSeats': {str(x): r(100 * c / NSIM, 1) for x, c in sorted(dist.items())},
                 'pPass': r(100 * sum(1 for x in ss if x > 0) / NSIM, 1),
                 'modal': modal[IDS.index(k)]})
blocs = [{'id': b['id'], 'name': b['name'], 'members': b['members'], 'p10': int(q(sims_bloc[b['id']], .1)), 'p50': int(round(q(sims_bloc[b['id']], .5))), 'p90': int(math.ceil(q(sims_bloc[b['id']], .9) - 1e-9)),
          'dist': {str(x): r(100 * sum(1 for y in sims_bloc[b['id']] if y == x) / NSIM, 1) for x in sorted(set(sims_bloc[b['id']]))}} for b in bloc_defs]
# median-scenario votes (for margins): counted + expected remaining
Rmid = (rem_lo + rem_hi) / 2; zmu = sum(mu.values())
vmid = {k: c2['votes'][k] + Rmid * mu[k] / zmu for k in ALL}
margins = last_seat_margins({k: round(x) for k, x in vmid.items()}, AGREEMENTS)
seat_mid = bader_ofer(vmid, AGREEMENTS)

# ---- comparisons: exit polls, poll average, counts
y = EP['y2026']
med = {p['id']: p['seats']['p50'] for p in proj}
def misalloc(seats): return sum(abs(seats.get(k, 0) - med[k]) for k in IDS) / 2
CHN = dict(EP['meta']['channels']); CHN.update(EP['y2026'].get('channels', {}))
polls_cmp = [{'id': p['id'], 'channel': CHN.get(p['channel'], p['channel']), 'pollster': p.get('pollster', ''), 'time': p['time'], 'kind': p['kind'],
              'seats': {k: p['seats'].get(k, 0) for k in IDS}, 'misallocated': misalloc(p['seats'])} for p in y['polls']]
init = [p for p in y['polls'] if p['kind'] == 'initial']
avg_init = {k: r(st.mean(p['seats'].get(k, 0) for p in init), 2) for k in IDS}
avg_all = {k: r(st.mean(p['seats'].get(k, 0) for p in y['polls']), 2) for k in IDS}
pavg = {k: PD['computed']['average'].get(k, 0) for k in IDS}
snaps = []
for h in y['countHistory'] + [y['count']]:
    V = h['validVotes']; v = {k: h['pct'][k] / 100 * V for k in IDS}; v['other'] = V - sum(v.values())
    snaps.append({'asOf': h['asOf'], 'label': h['label'], 'valid': V, 'seats': bader_ofer(v, AGREEMENTS), 'approxFromPct': True})
for key in ('c1116',):
    c = COUNT26[key]; snaps.append({'asOf': c['asOf'], 'label': c['label'], 'valid': c['valid'], 'seats': bader_ofer(c['votes'], AGREEMENTS), 'approxFromPct': False})
snaps.sort(key=lambda s: s['asOf'])
# validation of the seat function against published unofficial calcs
check_machria_1244 = bader_ofer(c2['votes'], AGREEMENTS)
check_iie_1132_noagr = bader_ofer(c1['votes'])

# ---- history summary + "unusual"
h25 = hist[-1]
proj_total_valid = c2['valid'] + Rmid
wasted26 = r(st.mean([sims_pct['other'][i] + sum(sims_pct[k][i] for k in IDS if sims_seat[k][i] == 0) for i in range(NSIM)]), 2)
shares_mid = [100 * vmid[k] / sum(vmid.values()) for k in IDS]
enp26_votes = r(1 / sum((x / 100) ** 2 for x in shares_mid), 2)
enp26_seats = r(SEATS * SEATS / sum(x * x for x in modal), 2)
turnout_final_est = r(100 * (regular_ballots + (env_total_lo + env_total_hi) / 2) / ELIGIBLE, 1)
y26 = {'turnout2200': r(100 * VOTERS_2200 / ELIGIBLE, 1), 'turnoutFinalEst': turnout_final_est,
       'turnoutFinalRange': [r(100 * (regular_ballots + env_total_lo) / ELIGIBLE, 1), r(100 * (regular_ballots + env_total_hi) / ELIGIBLE, 1)],
       'envShareEst': [r(100 * env_total_lo / (regular_ballots + env_total_lo), 1), r(100 * env_total_hi / (regular_ballots + env_total_hi), 1)],
       'wastedPct': wasted26, 'enpVotes': enp26_votes, 'enpSeats': enp26_seats,
       'arabEnvVsAll': {'env': r(envcum['joint'] + envcum['raam'], 2), 'all': r(100 * (c2['votes']['joint'] + c2['votes']['raam']) / c2['valid'], 2),
                        'k25env': r(sum(x['envPct'] for x in h25['lists'] if x['l'] in ('עם', 'ום', 'ד')), 2), 'k25all': r(sum(x['pct'] for x in h25['lists'] if x['l'] in ('עם', 'ום', 'ד')), 2)}}
max_turnout_prev = max(h['turnout'] for h in hist)
entered = {h['k']: sum(1 for l in CAMP[h['k']]['lists'] if l['seats'] > 0) for h in hist}
n26 = sum(1 for p in proj if p['seats']['p50'] > 0)
min_env_prev = min(h['envShare'] for h in hist[-2:])
unusual = [
  {'id': 'turnout', 'text': 'שיעור ההצבעה: לפי ההערכה כאן %.1f%% (טווח %.1f%%–%.1f%%; הנתון של הוועדה ל-22:00 הוא %.1f%%). זה גבוה ב-%.1f נקודות לפחות מהשיעור הסופי הגבוה ביותר בחמש המערכות הקודמות (%.1f%%, %s).' % (y26['turnoutFinalEst'], y26['turnoutFinalRange'][0], y26['turnoutFinalRange'][1], y26['turnout2200'], y26['turnoutFinalRange'][0] - max_turnout_prev, max_turnout_prev, [h['label'].split(' (')[0] for h in hist if h['turnout'] == max_turnout_prev][0])},
  {'id': 'lists', 'text': 'לפי ההערכה ייכנסו %d רשימות (בחמש המערכות הקודמות: %s). שבע מ-13 הרשימות שבאתר לא התמודדו בהרכב הזה ב-2022 (ישר!, ביחד, הדמוקרטים, הציונות הדתית–זהות, עוצמה יהודית, המילואימניקים והכלכלית, עמך ישראל), ולכן אין להן היסטוריה ישירה של הצבעה במעטפות הכפולות.' % (n26, ', '.join('%d (%s)' % (entered[h['k']], h['label'].split(' (')[0]) for h in hist))},
  {'id': 'arabEnv', 'text': 'במעטפות הכפולות שנספרו עד כה הרשימה המשותפת ורע"ם קיבלו יחד %.1f%%, לעומת %.1f%% בספירה הכוללת (יחס %.2f). ב-2022 היחס המקביל (חד"ש-תע"ל, בל"ד ורע"ם) היה %.1f%% מול %.1f%% (יחס %.2f).' % (y26['arabEnvVsAll']['env'], y26['arabEnvVsAll']['all'], y26['arabEnvVsAll']['env'] / y26['arabEnvVsAll']['all'], y26['arabEnvVsAll']['k25env'], y26['arabEnvVsAll']['k25all'], y26['arabEnvVsAll']['k25env'] / y26['arabEnvVsAll']['k25all'])},
  {'id': 'envShare', 'text': 'משקל המעטפות הכפולות: לפי ההערכה %.1f%%–%.1f%% מהמצביעים, פחות מ-2021 ו-2022 (%s), ובערך כמו ב-2020 (%.1f%%) או מעט יותר.' % (y26['envShareEst'][0], y26['envShareEst'][1], ', '.join('%.1f%%' % h['envShare'] for h in hist[-2:]), hist[2]['envShare'])},
  {'id': 'wasted', 'text': 'קולות לרשימות מתחת לאחוז החסימה: כ-%.1f%% לפי ההערכה. בחמש המערכות הקודמות: %s.' % (wasted26, ', '.join('%.1f%% (%s)' % (h['wastedPct'], h['label'].split(' (')[0]) for h in hist))},
  {'id': 'envMix', 'text': 'הרכב המעטפות משתנה מאוד בין מנות הספירה: הציונות הדתית–זהות קיבלה %.1f%% במנה הראשונה שדווחה ו-%.1f%% במנה האחרונה, והרשימה המשותפת %.1f%% ו-%.1f%%. לכן טווחי ההערכה רחבים יותר מטעות דגימה רגילה.' % (batches[0]['pct']['rzz'], batches[-1]['pct']['rzz'], batches[0]['pct']['joint'], batches[-1]['pct']['joint'])},
]

out = {
  'title': 'תחזית והקשר היסטורי', 'disclaimer': 'הערכה סטטיסטית, לא תוצאה רשמית',
  'generated': c2['asOf'], 'seed': SEED, 'nSim': NSIM, 'threshold': THR * 100,
  'count': {'asOf': c2['asOf'], 'label': c2['label'], 'valid': c2['valid'], 'invalid': c2['invalid'], 'sources': c2['sources'],
            'prev': {'asOf': c1['asOf'], 'valid': c1['valid'], 'sources': c1['sources']}},
  'envelopes': {'countedNow': env_ballots_now, 'countedValidNow': round(env_now_valid), 'regularBallots': regular_ballots,
                'totalRange': [env_total_lo, env_total_hi], 'totalMid2022Factor': env_total_mid,
                'remainingValidRange': [round(rem_lo), round(rem_hi)], 'voters2200': VOTERS_2200, 'eligible': ELIGIBLE,
                'batches': [{'n': round(b['n']), 'src': b['src'], 'pct': {k: r(b['pct'][k]) for k in ALL}} for b in batches],
                'sources': [{'url': b['src']} for b in ENV26] + [{'url': 'https://www.jns.org/israel-news/israel-votes-2022-turnout-as-of-10-a-m-highest-since-1981', 'note': '2022: 4,843,023 בנתון של 22:00'}, {'url': 'https://www.c14.co.il/article/1763324', 'note': '12,018 קלפיות רגילות'}]},
  'agreements': AGREEMENTS, 'agreementSources': AGR_SRC,
  'projection': proj, 'modal': {k: modal[IDS.index(k)] for k in IDS}, 'modalShare': r(100 * scen[modal] / NSIM, 1),
  'blocs': blocs, 'blocNote': PD['blocNote'],
  'midScenario': {'seats': seat_mid, 'margins': margins},
  'compare': {'initialAvg': avg_init, 'allAvg': avg_all, 'pollAverage': pavg, 'pollAverageAsOf': PD['computed']['asOf'], 'pollAverageN': PD['computed']['n'],
              'polls': polls_cmp, 'counts': snaps},
  'methodB': {'ratio': ratio26, 'envPred': liveCheckB, 'mae': liveCheckB_mae},
  'pseudoBacktestA': pseudoA,
  'checks': {'machria1244': check_machria_1244, 'iie1132NoAgreements': check_iie_1132_noagr},
  'history': [{k: v for k, v in h.items() if not k.startswith('_')} for h in hist],
  'y26': y26, 'backtest': backtest,
  'backtestSummary': {'mae': r(st.mean(b['mae'] for b in backtest), 3), 'maxErr': max(b['maxErr'] for b in backtest),
                      'naiveMae': r(st.mean(b['naiveMae'] for b in backtest), 3), 'seatErrMax': max(b['seatErr'] for b in backtest), 'naiveSeatErrMax': max(b['naiveSeatErr'] for b in backtest)},
  'unusual': unusual,
}
json.dump(out, open(os.path.join(ROOT, 'data/outlook.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('ok', {p['id']: (p['pct']['p50'], p['seats']['p10'], p['seats']['p50'], p['seats']['p90']) for p in proj})
print('blocs', [(b['id'], b['p10'], b['p50'], b['p90']) for b in blocs])
print('backtest', backtest); print('pseudoA', pseudoA, 'methodB mae', liveCheckB_mae)
print('checks', check_machria_1244, check_iie_1132_noagr)
print('env', env_ballots_now, env_total_lo, env_total_hi, round(rem_lo), round(rem_hi), 'modal share', out['modalShare'], 'sum medians', sum(med.values()))
print('margins', margins)
