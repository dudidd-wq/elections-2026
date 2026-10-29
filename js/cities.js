/* #/cities – per-locality analysis K21–K26: city page, per-list view, compare. Neutral: alphabetical lists, no party colours.
   K21–K25: official CEC results (data/geo, data.gov.il). K26: PARTIAL count (data/cities/k26.json), labelled as such.
   Loaded on demand by app.js; data are fetched lazily per view. */
(function () {
  'use strict';
  var U = window.EL26; if (!U) return;
  var esc = U.esc, COLL = U.COLL;
  var TOP = 15, PAGE = 50, MINS = [1000, 5000, 20000, 50000], ENV = 9999;
  var IX = null, LIN = null, ERR = '', ERRH = '', EL = {}, SH = {}, PEND = {}, NAME = {}, KS = [];
  var NF = (window.Intl && Intl.NumberFormat) ? new Intl.NumberFormat('he-IL') : { format: String };
  function n(x) { return NF.format(x); }
  function p2(x) { return (100 * x).toFixed(2) + '%'; }
  function p1(x) { return (100 * x).toFixed(1) + '%'; }
  function pp(x) { var s = Math.abs(100 * x).toFixed(1); return (100 * x) >= 0.05 ? '+' + s : (100 * x) <= -0.05 ? '−' + s : '0.0'; }
  function rerender() { if (U.parseHash().page === 'cities') U.render(true); }
  function get(key, url, done) {
    if (PEND[key]) return; PEND[key] = 1;
    U.getJSON(url).then(function (d) { done(d); rerender(); }).catch(function (e) { ERR = (e && e.message) || 'שגיאה'; ERRH = location.hash; delete PEND[key]; rerender(); });
  }
  function needBase() {
    if (IX && EL[26] && !EL[26]._n) { Object.keys(EL[26].names).forEach(function (c) { if (!NAME[+c]) NAME[+c] = EL[26].names[c]; }); EL[26]._n = 1; SIDX = null; }
    if (IX && LIN && EL[26]) return true;
    get('ix', 'data/geo/index.json', function (d) { IX = d; d.localities.forEach(function (l) { if (l[0] !== ENV) NAME[l[0]] = l[1]; }); KS = d.elections.map(function (e) { return e.k; }).concat([26]); });
    get('lin', 'data/cities/lineage.json', function (d) { LIN = d; });
    get('k26', 'data/cities/k26.json', function (d) { EL[26] = d; });
    return false;
  }
  function needEl(k) { if (EL[k]) return true; get('k' + k, 'data/geo/k' + k + '.json', function (d) { EL[k] = d; }); return false; }
  function needSh(c) {
    if (SH[c]) return true;
    if (IX && !IX.localities.some(function (l) { return l[0] === c; })) { SH[c] = { c: c, e: {} }; return true; } // new in 2026: no 2019–2022 shard
    get('c' + c, 'data/geo/loc/' + c + '.json', function (d) { SH[c] = d; }); return false; }
  function elOf(k) { return k === 26 ? EL[26] : IX.elections.filter(function (e) { return e.k === k; })[0]; }
  function lists(k) { return elOf(k).lists; }
  function nat(k) { return elOf(k).national; } // [eligible, voters, invalid, valid]
  function curK(q) { var k = +q.k; return KS.indexOf(k) >= 0 ? k : 26; }
  function prevK(k) { var i = KS.indexOf(k); return i > 0 ? KS[i - 1] : null; }
  function elName(k) { var e = elOf(k); return e.label + ' (הכנסת ה-' + k + ')' + (k === 26 ? ', חלקי' : ''); }
  function hashFor(arg, q) {
    var s = Object.keys(q || {}).filter(function (k) { return q[k] !== '' && q[k] != null; }).map(function (k) { return k + '=' + encodeURIComponent(q[k]); }).join('&');
    return '#/cities' + (arg ? '/' + arg : '') + (s ? '?' + s : '');
  }
  // lineage: series containing (k, letter); predecessor in the previous election, if any
  function seriesOf(k, l) { return LIN.series.filter(function (s) { return s.m[k] === l; })[0] || null; }
  function prevOf(k, l) { var pk = prevK(k), s = seriesOf(k, l); return pk && s && s.m[pk] ? { k: pk, l: s.m[pk], s: s } : null; }
  function noComp(k, l) {
    var pk = prevK(k); if (!pk) return 'אין מערכת קודמת בנתונים';
    var x = lists(k).filter(function (y) { return y.l === l; })[0], nc = LIN.noComparable[k] || {};
    if (x && x.id && nc[x.id]) return 'אין רשימה מקבילה: ' + nc[x.id];
    var s = seriesOf(k, l); return 'אין רשימה מקבילה' + (s && s.note ? ': ' + s.note : '');
  }
  // rows: K21–K25 from data/geo/k{k}.json, K26 from data/cities/k26.json (same columns)
  function rowMap(k) { var d = EL[k]; if (!d._m) { d._m = {}; d.rows.forEach(function (r) { d._m[r[0]] = r; }); } return d._m; }
  function cityRow(k, c) { // [eligible, voters, invalid, valid, ...lists, other] or null
    if (k === 26) { var r = rowMap(26)[c]; return r ? r.slice(1) : null; }
    var s = SH[c]; return s && s.e[k] ? s.e[k].t : null;
  }
  function share(row, k, l) { var i = lists(k).map(function (x) { return x.l; }).indexOf(l); return i < 0 || !row || !row[3] ? null : row[4 + i] / row[3]; }
  function votes(row, k, l) { var i = lists(k).map(function (x) { return x.l; }).indexOf(l); return i < 0 || !row ? null : row[4 + i]; }
  function natShare(k, l) { var x = lists(k).filter(function (y) { return y.l === l; })[0]; return x ? x.v / nat(k)[3] : null; }
  function alpha(ls) { return ls.slice().sort(function (a, b) { return COLL.compare(a.n, b.n); }); }
  function nm(c) { return NAME[c] || ('יישוב ' + c); }

  // ---------- shared UI
  function norm(s) { return String(s).replace(/[\u0591-\u05C7]/g, '').replace(/["'`׳״\-–()[\].,]/g, ' ').replace(/\s+/g, ' ').trim(); }
  var SIDX = null;
  function search(q) {
    q = norm(q); if (!q) return [];
    if (!SIDX) { SIDX = []; Object.keys(NAME).forEach(function (c) { SIDX.push({ c: +c, n: NAME[c], k: norm(NAME[c]) }); }); }
    var out = [];
    SIDX.forEach(function (x) { var r = x.k === q ? 0 : x.k.indexOf(q) === 0 ? 1 : (' ' + x.k).indexOf(' ' + q) >= 0 ? 2 : 9; if (r < 9) out.push({ c: x.c, n: x.n, r: r }); });
    out.sort(function (a, b) { return a.r - b.r || COLL.compare(a.n, b.n); });
    return out;
  }
  function searchBox() {
    return '<div class="geo-search" role="search"><label for="ct-q">בחירת יישוב</label><input id="ct-q" type="search" autocomplete="off" spellcheck="false" placeholder="הקלידו שם יישוב, למשל: חיפה" aria-describedby="ct-q-st" aria-controls="ct-res">' +
      '<p id="ct-q-st" class="meta" role="status" aria-live="polite"></p><ul id="ct-res" class="geo-res"></ul></div>';
  }
  function fillSearch() {
    var inp = document.getElementById('ct-q'), ul = document.getElementById('ct-res'), st = document.getElementById('ct-q-st');
    if (!inp || !ul || !IX) return;
    var r = search(inp.value), k = U.parseHash().q.k;
    ul.innerHTML = r.slice(0, 20).map(function (x) { return '<li><a href="' + hashFor(String(x.c), k ? { k: k } : {}) + '">' + esc(x.n) + '</a></li>'; }).join('');
    st.textContent = inp.value.trim() ? (r.length ? (r.length > 20 ? 'נמצאו ' + r.length + ' יישובים, מוצגים 20 הראשונים' : r.length === 1 ? 'נמצא יישוב אחד' : 'נמצאו ' + r.length + ' יישובים') : 'לא נמצא יישוב בשם הזה') : '';
  }
  function tbl(label, cap, headCells, body, cls) {
    return '<div class="tbl-wrap ep-w" tabindex="0" role="region" aria-label="' + esc(label) + '"><table class="tbl ep-t geo-t' + (cls ? ' ' + cls : '') + '"><caption class="ep-cap"><span>' + cap + '</span></caption><thead><tr>' + headCells + '</tr></thead><tbody>' + body + '</tbody></table></div>';
  }
  function th(t, num) { return '<th scope="col"' + (num ? ' class="n"' : '') + '>' + t + '</th>'; }
  function sortTh(t, key, cur, dir, num) {
    var on = cur === key, s = on ? (dir === 'asc' ? 'ascending' : 'descending') : 'none';
    return '<th scope="col"' + (num ? ' class="n"' : '') + ' aria-sort="' + s + '"><button type="button" class="geo-sort" data-csort="' + key + '">' + t + (on ? (dir === 'asc' ? ' ▲' : ' ▼') : '') + '<span class="sr">' + (on ? '' : ', לחצו למיון') + '</span></button></th>';
  }
  function pager(total, p) {
    var pages = Math.max(1, Math.ceil(total / PAGE)); if (pages === 1) return '';
    return '<div class="geo-pager" role="group" aria-label="דפדוף"><button type="button" class="chip" data-cpage="' + (p - 1) + '"' + (p <= 1 ? ' disabled' : '') + '>הקודם</button><span>עמוד ' + p + ' מתוך ' + pages + '</span><button type="button" class="chip" data-cpage="' + (p + 1) + '"' + (p >= pages ? ' disabled' : '') + '>הבא</button></div>';
  }
  function elSelect(k, id) {
    return '<label for="' + id + '">מערכת בחירות</label> <select id="' + id + '" data-ck="1">' + KS.map(function (x) { return '<option value="' + x + '"' + (x === k ? ' selected' : '') + '>' + esc(elName(x)) + '</option>'; }).join('') + '</select>';
  }
  function loading() { return '<div class="skel" aria-hidden="true"><i></i><i></i><i></i></div><p class="sr" role="status">טוען…</p>'; }
  function error() { return '<div class="empty" role="alert"><b>שגיאה בטעינת הנתונים</b><p>' + esc(ERR) + '. נסו לרענן את הדף.</p></div>'; }
  function partialNote(k) {
    if (k !== 26) return '';
    var d = EL[26];
    return '<p class="note warn" data-ct-partial><b>נתוני 2026:</b> ' + esc(d.statusLabel) + ' ' + esc(d.basis.reconciles) + ' מקור: ' + U.srcLink(d.src.url, d.src.publisher) + ' <span class="meta">(עדכון המקור ' + U.fmtStamp(d.src.sourceUpdatedAt) + ', נשלף ' + U.fmtStamp(d.src.retrieved) + ')</span>. ' + esc(d.src.note) + '</p>';
  }
  function tabs(cur) {
    var t = [['', 'יישוב'], ['list', 'לפי רשימה'], ['vs', 'השוואה']];
    return '<nav class="tabs" aria-label="תצוגות הניתוח">' + t.map(function (x) { return '<a href="' + hashFor(x[0], {}) + '"' + (x[0] === cur ? ' aria-current="page"' : '') + '>' + x[1] + '</a>'; }).join('') + '</nav>';
  }

  // ---------- simple SVG trend chart (neutral ink; city solid, national dashed)
  function spark(title, pts, natPts, fmt) { // pts: [{k, v|null}]
    var W = 300, H = 120, L = 34, R = 10, T = 12, B = 22, all = pts.concat(natPts).filter(function (p) { return p.v != null; });
    if (!all.length) return '';
    var mx = Math.max.apply(null, all.map(function (p) { return p.v; })), top = mx <= 0 ? 0.1 : Math.ceil(mx * 10 / 0.95) / 10; if (top > 1) top = 1;
    var x = function (i) { return L + i * (W - L - R) / (KS.length - 1); }, y = function (v) { return T + (H - T - B) * (1 - v / top); };
    function path(ps) { var d = '', on = false; ps.forEach(function (p) { var i = KS.indexOf(p.k); if (p.v == null) { on = false; return; } d += (on ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(p.v).toFixed(1); on = true; }); return d; }
    var desc = pts.map(function (p) { return 'הכנסת ה-' + p.k + ': ' + (p.v == null ? 'אין' : fmt(p.v)); }).join('; ') + '. ארצי: ' + natPts.map(function (p) { return p.k + ' ' + (p.v == null ? 'אין' : fmt(p.v)); }).join('; ');
    var g = '<line class="ct-ax" x1="' + L + '" x2="' + (W - R) + '" y1="' + y(0) + '" y2="' + y(0) + '"/><line class="ct-gr" x1="' + L + '" x2="' + (W - R) + '" y1="' + y(top) + '" y2="' + y(top) + '"/>' +
      '<text class="ct-tx" x="' + (L - 4) + '" y="' + (y(top) + 4) + '" text-anchor="end">' + Math.round(top * 100) + '%</text><text class="ct-tx" x="' + (L - 4) + '" y="' + (y(0) + 4) + '" text-anchor="end">0</text>' +
      KS.map(function (k, i) { return '<text class="ct-tx" x="' + x(i).toFixed(1) + '" y="' + (H - 6) + '" text-anchor="middle">' + k + '</text>'; }).join('') +
      '<path class="ct-nat" d="' + path(natPts) + '"/><path class="ct-line" d="' + path(pts) + '"/>' +
      pts.filter(function (p) { return p.v != null; }).map(function (p) { return '<circle class="ct-pt" r="3" cx="' + x(KS.indexOf(p.k)).toFixed(1) + '" cy="' + y(p.v).toFixed(1) + '"/>'; }).join('');
    return '<figure class="ct-fig"><figcaption>' + esc(title) + '</figcaption><svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(title + ': ' + desc) + '" focusable="false">' + g + '</svg></figure>';
  }

  // ---------- landing
  function pageLanding() {
    var d = EL[26], N = d.national;
    return searchBox() + partialNote(26) +
      '<div class="kpis"><div class="kpi"><b>' + n(d.localities) + '</b><span>יישובים בנתוני 2026 (חלקי)</span></div><div class="kpi"><b>' + n(N[3] - d.envelopes[3]) + '</b><span>קולות כשרים שמשויכים ליישוב (2026, חלקי)</span></div><div class="kpi"><b>' + n(d.envelopes[3]) + '</b><span>קולות כשרים במעטפות כפולות, בלי שיוך ליישוב</span></div></div>' +
      '<h2>מה יש כאן</h2><ul><li><b>יישוב:</b> אחוז ההצבעה ואחוז הקולות של כל רשימה בכל מערכת מ-2019 עד 2026, שינוי בנקודות אחוז מול המערכת הקודמת כשיש רשימה מקבילה, והשוואה לתוצאה הארצית.</li>' +
      '<li><b><a href="' + hashFor('list', {}) + '">לפי רשימה</a>:</b> היישובים שבהם רשימה קיבלה את האחוז הגבוה והנמוך ביותר, הכי הרבה קולות, והשינוי הגדול ביותר, עם סינון לפי גודל יישוב.</li>' +
      '<li><b><a href="' + hashFor('vs', {}) + '">השוואה</a>:</b> שני יישובים זה לצד זה, או יישוב מול התוצאה הארצית.</li></ul>' +
      '<h2>יישובים גדולים</h2><ul class="geo-res">' + d.rows.filter(function (r) { return r[0] !== ENV; }).sort(function (a, b) { return b[4] - a[4]; }).slice(0, 12).sort(function (a, b) { return COLL.compare(nm(a[0]), nm(b[0])); }).map(function (r) { return '<li><a href="' + hashFor(String(r[0]), {}) + '">' + esc(nm(r[0])) + '</a></li>'; }).join('') + '</ul>';
  }

  // ---------- city page
  function pageCity(c, q) {
    if (!NAME[c]) return '<div class="empty" role="alert"><b>היישוב לא נמצא</b><p><a href="#/cities">חזרה לחיפוש</a></p></div>';
    if (!needSh(c)) return loading();
    var k = curK(q), row = cityRow(k, c), pk = prevK(k);
    var hdr = '<h2 class="ct-h">' + esc(nm(c)) + ' <span class="meta">(סמל יישוב ' + c + ')</span></h2>' +
      '<p><a href="' + hashFor('vs', { a: c, b: 'nat', k: k }) + '">השוואה לתוצאה הארצית</a> · <a href="' + hashFor('vs', { a: c, k: k }) + '">השוואה ליישוב אחר</a> · <a href="#/geo/' + c + '">פירוט לפי קלפי (2019–2022)</a></p>';
    // turnout over time
    var trow = KS.map(function (x) { var r = cityRow(x, c); return '<tr' + (x === 26 ? ' data-ct-k26' : '') + '><th scope="row">' + esc(elName(x)) + '</th>' + (r ? '<td class="n">' + n(r[0]) + '</td><td class="n">' + n(r[1]) + '</td><td class="n" data-ct-turnout>' + (r[0] ? p1(r[1] / r[0]) : '–') + '</td><td class="n" data-ct-valid>' + n(r[3]) + '</td><td class="n">' + n(r[2]) + '</td>' : '<td colspan="5">אין נתונים ליישוב במערכת הזו</td>') + '</tr>'; }).join('');
    var tt = tbl('השתתפות ב' + nm(c), 'בעלי זכות בחירה, מצביעים וקולות לפי מערכת. בלי מעטפות כפולות (חיילים, נציגויות, בתי חולים ובתי סוהר), שלא משויכות ליישוב.',
      th('מערכת') + th('בעלי זכות', 1) + th('מצביעים', 1) + th('אחוז הצבעה', 1) + th('קולות כשרים', 1) + th('פסולים', 1), trow);
    if (!row) return hdr + '<p>' + elSelect(k, 'ct-k') + '</p>' + partialNote(k) + '<p class="note">אין ליישוב נתונים במערכת הזו.</p>' + tt;
    var body = alpha(lists(k)).map(function (l) {
      var s = share(row, k, l.l), ns = natShare(k, l.l), pv = prevOf(k, l.l), pr = pv ? cityRow(pv.k, c) : null, ps = pv && pr ? share(pr, pv.k, pv.l) : null;
      var ch = ps != null ? '<td class="n" data-ct-ch>' + pp(s - ps) + '</td>' : '<td class="ct-nc">' + esc(pv && !pr ? 'אין נתונים ליישוב ב-' + pv.k : noComp(k, l.l)) + '</td>';
      return '<tr data-ct-l="' + esc(l.l) + '"><th scope="row"><a href="' + hashFor('list', { k: k, l: l.l }) + '">' + esc(l.n) + '</a></th><td class="n" data-ct-v>' + n(votes(row, k, l.l)) + '</td><td class="n" data-ct-s>' + p2(s) + '</td><td class="n">' + p2(ns) + '</td><td class="n">' + pp(s - ns) + '</td>' + ch + '</tr>';
    }).join('') + '<tr data-ct-l="other"><th scope="row">רשימות אחרות (מתחת ל-1% ארצית)</th><td class="n" data-ct-v>' + n(row[row.length - 1]) + '</td><td class="n" data-ct-s>' + p2(row[row.length - 1] / row[3]) + '</td><td class="n">–</td><td class="n">–</td><td>–</td></tr>';
    var rt = tbl('תוצאות ' + nm(c) + ' ' + elName(k), 'קולות ואחוז מהקולות הכשרים ב' + esc(nm(c)) + ', ' + esc(elName(k)) + '. רשימות לפי סדר האלף־בית. "מול הארצי" ו"שינוי" בנקודות אחוז. השינוי מחושב מול ' + (pk ? 'הכנסת ה-' + pk : '—') + ' רק כשיש רשימה מקבילה.',
      th('רשימה') + th('קולות', 1) + th('אחוז ביישוב', 1) + th('אחוז ארצי', 1) + th('מול הארצי', 1) + th('שינוי מהמערכת הקודמת'), body);
    // trend charts: turnout + each lineage series with at least one point in the city
    var charts = [spark('אחוז הצבעה', KS.map(function (x) { var r = cityRow(x, c); return { k: x, v: r && r[0] ? r[1] / r[0] : null }; }), KS.map(function (x) { return { k: x, v: null }; }), p1)];
    alpha(LIN.series).forEach(function (s) {
      var pts = KS.map(function (x) { var r = cityRow(x, c); return { k: x, v: s.m[x] && r ? share(r, x, s.m[x]) : null }; });
      if (!pts.some(function (p) { return p.v != null; })) return;
      charts.push(spark(s.n, pts, KS.map(function (x) { return { k: x, v: s.m[x] ? natShare(x, s.m[x]) : null }; }), p1));
    });
    return hdr + '<p>' + elSelect(k, 'ct-k') + '</p>' + partialNote(k) + rt + tt +
      '<h3>מגמות לאורך המערכות</h3><p class="meta">קו מלא: היישוב. קו מקווקו: התוצאה הארצית (באחוז ההצבעה אין קו ארצי, כי הארצי כולל מעטפות כפולות). ציר אופקי: מספר הכנסת (21 = אפריל 2019, 26 = 2026, חלקי). רק רשימות עם רצף מוגדר (ראו "שיטה"). נקודה חסרה: אין רשימה מקבילה באותה מערכת. 2026 חלקי.</p><div class="ct-grid">' + charts.join('') + '</div>';
  }

  // ---------- per-list view
  function pageList(q) {
    var k = curK(q); if (!needEl(k) && k !== 26) return listForm(k, '', q) + loading();
    var ls = alpha(lists(k)), l = ls.some(function (x) { return x.l === q.l; }) ? q.l : ls[0].l;
    var pv = prevOf(k, l); if (pv && !needEl(pv.k) && pv.k !== 26) return listForm(k, l, q) + loading();
    var mn = MINS.indexOf(+q.min) >= 0 ? +q.min : 1000;
    var pm = pv ? rowMap(pv.k) : null, lname = ls.filter(function (x) { return x.l === l; })[0].n;
    var all = EL[k].rows.filter(function (r) { return r[0] !== ENV && r[4] >= mn; }).map(function (r) {
      var row = r.slice(1), o = { c: r[0], valid: row[3], v: votes(row, k, l), s: share(row, k, l), d: null };
      if (pv) { var p = pm[r[0]]; if (p && p[4] >= mn) o.d = o.s - share(p.slice(1), pv.k, pv.l); }
      return o;
    });
    function top(arr, f, dir) { return arr.slice().sort(function (a, b) { return dir * (f(a) - f(b)) || COLL.compare(nm(a.c), nm(b.c)); }).slice(0, TOP); }
    function mini(title, arr, cols) {
      return '<section class="ct-mini"><h2 class="h3">' + title + '</h2>' + tbl(title, title + ' (מינימום ' + n(mn) + ' קולות כשרים ביישוב' + (/הנמוך/.test(title) && zeros ? '; ב-' + n(zeros) + ' יישובים הרשימה לא קיבלה אף קול, והם מסודרים לפי סדר האלף־בית' : '') + ')', th('#', 1) + th('יישוב') + cols.map(function (x) { return th(x[0], 1); }).join(''),
        arr.map(function (o, i) { return '<tr data-ct-c="' + o.c + '"><td class="n">' + (i + 1) + '</td><th scope="row"><a href="' + hashFor(String(o.c), { k: k }) + '">' + esc(nm(o.c)) + '</a></th>' + cols.map(function (x) { return '<td class="n">' + x[1](o) + '</td>'; }).join('') + '</tr>'; }).join('')) + '</section>';
    }
    var fS = function (o) { return p2(o.s); }, fV = function (o) { return n(o.v); }, fD = function (o) { return pp(o.d); }, fN = function (o) { return n(o.valid); };
    var ns = natShare(k, l), withD = all.filter(function (o) { return o.d != null; }), zeros = all.filter(function (o) { return !o.v; }).length;
    var h = listForm(k, l, q) + partialNote(k) +
      '<p>' + esc(lname) + ', ' + esc(elName(k)) + ': ' + p2(ns) + ' מהקולות הכשרים ארצית (' + n(lists(k).filter(function (x) { return x.l === l; })[0].v) + ' קולות). ' + n(all.length) + ' יישובים עם ' + n(mn) + ' קולות כשרים לפחות. ' +
      (pv ? 'שינוי מחושב מול "' + esc(pv.s.n) + '" בהכנסת ה-' + pv.k + '.' + (pv.s.note ? ' ' + esc(pv.s.note) : '') : esc(noComp(k, l)) + '. לכן אין כאן עליות וירידות.') + '</p>' +
      '<div class="geo-2">' + mini('האחוז הגבוה ביותר', top(all, function (o) { return o.s; }, -1), [['אחוז', fS], ['קולות', fV]]) + mini('האחוז הנמוך ביותר', top(all, function (o) { return o.s; }, 1), [['אחוז', fS], ['קולות', fV]]) + '</div>' +
      '<div class="geo-2">' + mini('הכי הרבה קולות', top(all, function (o) { return o.v; }, -1), [['קולות', fV], ['אחוז', fS]]) + mini('יישובים גדולים: הכי הרבה קולות כשרים', top(all, function (o) { return o.valid; }, -1), [['קולות כשרים', fN], ['אחוז', fS]]) + '</div>' +
      (pv ? '<div class="geo-2">' + mini('העלייה הגדולה ביותר (נקודות אחוז)', top(withD, function (o) { return o.d; }, -1), [['שינוי', fD], ['אחוז', fS]]) + mini('הירידה הגדולה ביותר (נקודות אחוז)', top(withD, function (o) { return o.d; }, 1), [['שינוי', fD], ['אחוז', fS]]) + '</div>' : '');
    // full sortable table
    var s = ['name', 'valid', 'v', 's', 'd'].indexOf(q.s) >= 0 ? q.s : 's', dir = q.d === 'asc' || q.d === 'desc' ? q.d : (s === 'name' ? 'asc' : 'desc'), sg = dir === 'asc' ? 1 : -1;
    if (s === 'd' && !pv) s = 's';
    var arr = all.slice().sort(function (a, b) {
      if (s === 'name') return sg * COLL.compare(nm(a.c), nm(b.c));
      if (a[s] == null || b[s] == null) return (a[s] == null) - (b[s] == null) || COLL.compare(nm(a.c), nm(b.c)); // missing values last
      return sg * (a[s] - b[s]) || COLL.compare(nm(a.c), nm(b.c));
    });
    var pages = Math.max(1, Math.ceil(arr.length / PAGE)), pg = Math.min(Math.max(1, +q.p || 1), pages);
    h += '<h2 class="h3" id="ct-all">כל היישובים</h2>' + tbl('כל היישובים', 'כל היישובים עם ' + n(mn) + ' קולות כשרים לפחות. לחצו על כותרת עמודה למיון.',
      sortTh('יישוב', 'name', s, dir) + sortTh('קולות כשרים', 'valid', s, dir, 1) + sortTh('קולות לרשימה', 'v', s, dir, 1) + sortTh('אחוז', 's', s, dir, 1) + (pv ? sortTh('שינוי (נק׳ אחוז)', 'd', s, dir, 1) : ''),
      arr.slice((pg - 1) * PAGE, pg * PAGE).map(function (o) { return '<tr data-ct-c="' + o.c + '"><th scope="row"><a href="' + hashFor(String(o.c), { k: k }) + '">' + esc(nm(o.c)) + '</a></th><td class="n">' + n(o.valid) + '</td><td class="n">' + n(o.v) + '</td><td class="n">' + p2(o.s) + '</td>' + (pv ? '<td class="n">' + (o.d == null ? '–' : pp(o.d)) + '</td>' : '') + '</tr>'; }).join('')) + pager(arr.length, pg);
    return h;
  }
  function listForm(k, l, q) {
    var ls = alpha(lists(k)), mn = MINS.indexOf(+q.min) >= 0 ? +q.min : 1000;
    return '<div class="ct-form"><p>' + elSelect(k, 'ct-k') + '</p><p><label for="ct-l">רשימה</label> <select id="ct-l" data-cl="1">' + ls.map(function (x) { return '<option value="' + esc(x.l) + '"' + (x.l === l ? ' selected' : '') + '>' + esc(x.n) + '</option>'; }).join('') + '</select></p>' +
      '<p><label for="ct-min">גודל יישוב מינימלי</label> <select id="ct-min" data-cmin="1">' + MINS.map(function (m) { return '<option value="' + m + '"' + (m === mn ? ' selected' : '') + '>' + n(m) + ' קולות כשרים</option>'; }).join('') + '</select></p></div>';
  }

  // ---------- compare
  function citySel(id, cur, withNat) {
    var opts = Object.keys(NAME).map(Number).sort(function (a, b) { return COLL.compare(NAME[a], NAME[b]); });
    return '<label for="' + id + '">' + (id === 'ct-a' ? 'יישוב ראשון' : 'מול') + '</label> <select id="' + id + '" data-cv="' + id.slice(-1) + '">' + '<option value="">בחרו…</option>' + (withNat ? '<option value="nat"' + (cur === 'nat' ? ' selected' : '') + '>התוצאה הארצית</option>' : '') +
      opts.map(function (c) { return '<option value="' + c + '"' + (String(c) === String(cur) ? ' selected' : '') + '>' + esc(NAME[c]) + '</option>'; }).join('') + '</select>';
  }
  function pageVs(q) {
    var k = curK(q), a = NAME[+q.a] ? +q.a : null, b = q.b === 'nat' ? 'nat' : NAME[+q.b] ? +q.b : null;
    var form = '<div class="ct-form"><p>' + elSelect(k, 'ct-k') + '</p><p>' + citySel('ct-a', a, false) + '</p><p>' + citySel('ct-b', b, true) + '</p></div>';
    if (!a || !b) return form + '<p class="note">בחרו שני יישובים, או יישוב ו"התוצאה הארצית".</p>';
    if ((!needSh(a)) | (b !== 'nat' && !needSh(b))) return form + loading();
    var ra = cityRow(k, a), rb = b === 'nat' ? nat(k).concat(lists(k).map(function (x) { return x.v; })) : cityRow(k, b);
    var nb = b === 'nat' ? 'ארצי' : nm(b);
    if (!ra || !rb) return form + partialNote(k) + '<p class="note">אין נתונים ל' + esc(!ra ? nm(a) : nb) + ' במערכת הזו.</p>';
    var head = th('רשימה') + th(esc(nm(a)), 1) + th(esc(nb), 1) + th('הפרש (נק׳ אחוז)', 1);
    var kp = '<tr><th scope="row">אחוז הצבעה</th><td class="n">' + p1(ra[1] / ra[0]) + '</td><td class="n">' + (rb[0] ? p1(rb[1] / rb[0]) : '–') + '</td><td class="n">' + (rb[0] ? pp(ra[1] / ra[0] - rb[1] / rb[0]) : '–') + '</td></tr>' +
      '<tr><th scope="row">קולות כשרים</th><td class="n">' + n(ra[3]) + '</td><td class="n">' + n(rb[3]) + '</td><td class="n">–</td></tr>';
    var body = alpha(lists(k)).map(function (l) { var sa = share(ra, k, l.l), sb = b === 'nat' ? natShare(k, l.l) : share(rb, k, l.l);
      return '<tr data-ct-l="' + esc(l.l) + '"><th scope="row">' + esc(l.n) + '</th><td class="n">' + p2(sa) + '</td><td class="n">' + p2(sb) + '</td><td class="n">' + pp(sa - sb) + '</td></tr>'; }).join('');
    return form + partialNote(k) + tbl('השוואה: ' + nm(a) + ' מול ' + nb, esc(nm(a)) + ' מול ' + esc(nb) + ', ' + esc(elName(k)) + '. אחוז מהקולות הכשרים; רשימות לפי סדר האלף־בית.' + (b === 'nat' ? ' הארצי כולל מעטפות כפולות; היישוב לא.' : ''), head, kp + body) +
      '<p><a href="' + hashFor(String(a), { k: k }) + '">לעמוד של ' + esc(nm(a)) + '</a>' + (b !== 'nat' ? ' · <a href="' + hashFor(String(b), { k: k }) + '">לעמוד של ' + esc(nm(b)) + '</a>' : '') + '</p>';
  }

  // ---------- method
  function method() {
    var d = EL[26];
    return '<section class="note ct-method" id="ct-method" aria-labelledby="ct-mh"><h2 id="ct-mh">שיטה, מקורות ומגבלות</h2><ul>' +
      '<li><b>2019–2022 (הכנסת ה-21 עד ה-25):</b> תוצאות האמת של ועדת הבחירות המרכזית לפי יישוב, מהמאגר הפתוח ב-data.gov.il (ראו <a href="#/geo">תוצאות לפי יישוב וקלפי</a>). סכום היישובים ושורת המעטפות הכפולות שווה לתוצאה הארצית בכל מערכת.</li>' +
      '<li><b>2026 (הכנסת ה-26): חלקי, לא סופי ולא רשמי.</b> ' + esc(d.statusLabel) + ' ' + esc(d.basis.reconciles) + ' המקור: ' + U.srcLink(d.src.url, d.src.publisher) + ' (SHA-256 ' + esc(d.src.sha256.slice(0, 12)) + '…). ' + esc(d.src.note) + ' כשוועדת הבחירות תפרסם את הקבצים הרשמיים, הנתונים יוחלפו.</li>' +
      '<li><b>מה לא נכלל:</b> קולות המעטפות הכפולות (חיילים, נציגויות, בתי חולים, בתי סוהר ועוד) לא משויכים ליישוב, ולכן אחוז ההצבעה ביישוב נמוך מהאמיתי, ובמקומות עם הרבה מצביעים במעטפות התמונה חלקית. אין כאן הערכה או השלמה של נתונים חסרים.</li>' +
      '<li><b>רשימות:</b> רשימות שקיבלו פחות מ-1% מהקולות ארצית מקופלות ל"רשימות אחרות". ' + esc(LIN.note) + '</li>' +
      '<li><b>רצף רשימות:</b> ' + alpha(LIN.series).map(function (s) { return esc(s.n) + ' (' + Object.keys(s.m).map(function (k) { return k; }).join(', ') + ')' + (s.note ? ': ' + esc(s.note) : ''); }).join('; ') + '.</li>' +
      '<li><b>אחוזים:</b> אחוז הקולות = קולות הרשימה חלקי הקולות הכשרים ביישוב. אחוז הצבעה = מצביעים חלקי בעלי זכות בחירה ביישוב. שינוי ופער מוצגים בנקודות אחוז.</li>' +
      '<li><b>ניטרליות:</b> רשימות מוצגות לפי סדר האלף־בית, בלי צבעי מפלגות, בלי המלצה ובלי חיבור רשימות לגושים או לקואליציות. אין חלוקה לפי מגזר, כי אין לאתר סיווג יישובים ממקור מוסמך.</li></ul></section>';
  }

  function page(r) {
    var q = r.q || {}, sub = r.arg === 'list' ? 'list' : r.arg === 'vs' ? 'vs' : r.arg ? 'city' : '';
    var hd = U.head('ניתוח לפי יישוב', 'ניתוח לפי יישוב', 'אחוז ההצבעה ולמי הצביעו בכל יישוב, 2019–2026, עם השוואה למערכות קודמות ולתוצאה הארצית. נתוני 2026 חלקיים ואינם סופיים. <a href="#ct-method">שיטה ומגבלות</a>');
    if (ERR && ERRH !== location.hash) ERR = ''; // an error belongs to the page where it happened
    if (ERR) return hd + error();
    if (!needBase()) return hd + loading();
    var body = sub === 'city' ? pageCity(+r.arg, q) : sub === 'list' ? pageList(q) : sub === 'vs' ? pageVs(q) : pageLanding();
    return hd + tabs(sub === 'city' ? '' : sub) + (sub === 'city' ? searchBox() : '') + body + method();
  }
  function title(r) { return r.arg === 'list' ? 'לפי רשימה' : r.arg === 'vs' ? 'השוואה' : r.arg && NAME[+r.arg] ? NAME[+r.arg] : ''; }

  // ---------- events (delegated on #main; only cities controls)
  var main = U.main;
  function go(over, focusSel) {
    var r = U.parseHash(), q = Object.assign({}, r.q, over);
    U.setHash(hashFor(r.arg, q));
    if (focusSel) { var el = main.querySelector(focusSel); if (el) el.focus({ preventScroll: true }); }
  }
  main.addEventListener('input', function (e) { if (e.target.id === 'ct-q') fillSearch(); });
  main.addEventListener('keydown', function (e) {
    if (e.target.id === 'ct-q' && e.key === 'Enter') { var a = main.querySelector('#ct-res a'); if (a) { e.preventDefault(); location.hash = a.getAttribute('href'); } }
  });
  main.addEventListener('change', function (e) {
    var t = e.target; if (!t.hasAttribute || U.parseHash().page !== 'cities') return;
    if (t.hasAttribute('data-ck')) go({ k: t.value, p: '', l: U.parseHash().arg === 'list' ? '' : U.parseHash().q.l }, '#ct-k');
    else if (t.hasAttribute('data-cl')) go({ l: t.value, p: '' }, '#ct-l');
    else if (t.hasAttribute('data-cmin')) go({ min: t.value, p: '' }, '#ct-min');
    else if (t.hasAttribute('data-cv')) { var o = {}; o[t.getAttribute('data-cv')] = t.value; go(o, '#' + t.id); }
  });
  main.addEventListener('click', function (e) {
    if (U.parseHash().page !== 'cities') return;
    var b = e.target.closest && e.target.closest('button'); if (!b) return;
    if (b.hasAttribute('data-csort')) {
      var r = U.parseHash(), s = b.getAttribute('data-csort'), cur = r.q.s || 's', curDir = r.q.d || (cur === 'name' ? 'asc' : 'desc');
      var d = cur === s ? (curDir === 'asc' ? 'desc' : 'asc') : (s === 'name' ? 'asc' : 'desc');
      go({ s: s, d: d, p: '' }, '[data-csort="' + s + '"]');
    } else if (b.hasAttribute('data-cpage')) {
      go({ p: b.getAttribute('data-cpage') }); var an = document.getElementById('ct-all'); if (an) an.scrollIntoView({ block: 'start' });
    }
  });
  window.EL26CITIES = { page: page, title: title, after: fillSearch };
})();
