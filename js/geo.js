/* #/geo – turnout and votes per locality and per ballot box, K21–K25 (official CEC data via data.gov.il).
   Loaded on demand by app.js; data/geo/* is fetched lazily (index, one election file, one locality shard at a time). */
(function () {
  'use strict';
  var U = window.EL26; if (!U) return;
  var esc = U.esc, COLL = U.COLL;
  var MIN = 2000, TOP = 15, PAGE = 50;
  var IX = null, ERR = '', EL = {}, SH = {}, PEND = {}, NAME = {}, PREV = {};
  var NF = (window.Intl && Intl.NumberFormat) ? new Intl.NumberFormat('he-IL') : { format: String };
  function n(x) { return NF.format(x); }
  function pc(a, b, d) { return b ? (100 * a / b).toFixed(d == null ? 1 : d) + '%' : '–'; }
  function pp(x) { var s = Math.abs(x).toFixed(1); return x > 0.05 ? '+' + s : x < -0.05 ? '−' + s : '0.0'; }
  function rerender() { if (U.parseHash().page === 'geo') U.render(true); }
  function get(key, url, done) {
    if (PEND[key]) return; PEND[key] = 1;
    U.getJSON(url).then(function (d) { done(d); rerender(); }).catch(function (e) { ERR = (e && e.message) || 'שגיאה'; rerender(); });
  }
  function needIndex() {
    if (IX) return true;
    get('ix', 'data/geo/index.json', function (d) {
      IX = d; d.localities.forEach(function (l) { NAME[l[0]] = l[1]; });
      d.elections.forEach(function (e, i) { PREV[e.k] = i ? d.elections[i - 1].k : null; });
    });
    return false;
  }
  function needEl(k) { if (EL[k]) return true; get('k' + k, 'data/geo/k' + k + '.json', function (d) { EL[k] = d; }); return false; }
  function needSh(c) { if (SH[c]) return true; get('c' + c, 'data/geo/loc/' + c + '.json', function (d) { SH[c] = d; }); return false; }
  function elOf(k) { return IX.elections.filter(function (e) { return e.k === k; })[0]; }
  function curK(q) { var k = +q.k, ks = IX.elections.map(function (e) { return e.k; }); return ks.indexOf(k) >= 0 ? k : ks[ks.length - 1]; }
  function isEnv(c) { return c === IX.envelopesCode; }
  function lbl(e) { return e.label; }
  function hashFor(arg, q) {
    var s = Object.keys(q).filter(function (k) { return q[k] !== '' && q[k] != null; }).map(function (k) { return k + '=' + encodeURIComponent(q[k]); }).join('&');
    return '#/geo' + (arg ? '/' + arg : '') + (s ? '?' + s : '');
  }
  // ---------- search (Hebrew, prefix of the full name or of any word)
  function norm(s) { return String(s).replace(/[\u0591-\u05C7]/g, '').replace(/["'`׳״\-–()[\].,]/g, ' ').replace(/\s+/g, ' ').trim(); }
  var SIDX = null;
  function search(q) {
    q = norm(q); if (!q) return [];
    if (!SIDX) SIDX = IX.localities.map(function (l) { return { c: l[0], n: l[1], keys: l.slice(1).map(norm) }; });
    var out = [];
    SIDX.forEach(function (x) {
      var rank = 9;
      x.keys.forEach(function (k) {
        if (k === q) rank = Math.min(rank, 0); else if (k.indexOf(q) === 0) rank = Math.min(rank, 1);
        else if ((' ' + k).indexOf(' ' + q) >= 0) rank = Math.min(rank, 2);
      });
      if (rank < 9) out.push({ c: x.c, n: x.n, r: rank });
    });
    out.sort(function (a, b) { return a.r - b.r || COLL.compare(a.n, b.n); });
    return out;
  }
  function searchBox(val) {
    return '<div class="geo-search" role="search"><label for="geo-q">חיפוש יישוב</label><input id="geo-q" type="search" autocomplete="off" spellcheck="false" placeholder="למשל: באר שבע" value="' + esc(val || '') + '" aria-describedby="geo-q-st" aria-controls="geo-res">' +
      '<p id="geo-q-st" class="meta" role="status" aria-live="polite"></p><ul id="geo-res" class="geo-res"></ul></div>';
  }
  function fillSearch() {
    var inp = document.getElementById('geo-q'), ul = document.getElementById('geo-res'), st = document.getElementById('geo-q-st');
    if (!inp || !ul || !IX) return;
    var r = search(inp.value), k = U.parseHash().q.k;
    ul.innerHTML = r.slice(0, 20).map(function (x) { return '<li><a href="' + hashFor(String(x.c), k ? { k: k } : {}) + '">' + esc(x.n) + '</a></li>'; }).join('');
    st.textContent = inp.value.trim() ? (r.length ? (r.length > 20 ? 'נמצאו ' + r.length + ' יישובים, מוצגים 20 הראשונים' : r.length === 1 ? 'נמצא יישוב אחד' : 'נמצאו ' + r.length + ' יישובים') : 'לא נמצא יישוב בשם הזה') : '';
  }
  // ---------- generic helpers
  function rows(k) { var d = EL[k]; return d.rows; }
  function col(k, name) { return EL[k].cols.indexOf(name); }
  function lists(k) { return elOf(k).lists; }               // ordered by national votes in the data; display sorts alphabetically
  function alpha(ls) { return ls.slice().sort(function (a, b) { return COLL.compare(a.n, b.n); }); }
  function lead(r, k, off) { // r = row starting at eligible; off = index of first list column in r
    var ls = lists(k), best = [], val = r[3];
    ls.forEach(function (l, i) { best.push({ n: l.n, v: r[off + i] }); });
    best.sort(function (a, b) { return b.v - a.v || COLL.compare(a.n, b.n); });
    return best.slice(0, 2).map(function (b) { return { n: b.n, v: b.v, s: val ? b.v / val : 0 }; });
  }
  function tbl(label, cap, headCells, body) {
    return '<div class="tbl-wrap ep-w" tabindex="0" role="region" aria-label="' + esc(label) + '"><table class="tbl ep-t geo-t"><caption class="ep-cap"><span>' + cap + '</span></caption><thead><tr>' + headCells + '</tr></thead><tbody>' + body + '</tbody></table></div>';
  }
  function th(t, num) { return '<th scope="col"' + (num ? ' class="n"' : '') + '>' + t + '</th>'; }
  function sortTh(t, key, cur, dir, num) {
    var on = cur === key, s = on ? (dir === 'asc' ? 'ascending' : 'descending') : 'none';
    return '<th scope="col"' + (num ? ' class="n"' : '') + ' aria-sort="' + s + '"><button type="button" class="geo-sort" data-gsort="' + key + '">' + t + (on ? (dir === 'asc' ? ' ▲' : ' ▼') : '') + '<span class="sr">' + (on ? '' : ', לחצו למיון') + '</span></button></th>';
  }
  function pager(total, p, id) {
    var pages = Math.max(1, Math.ceil(total / PAGE)); if (pages === 1) return '';
    return '<div class="geo-pager" role="group" aria-label="דפדוף"><button type="button" class="chip" data-gpage="' + (p - 1) + '" data-gp="' + id + '"' + (p <= 1 ? ' disabled' : '') + '>הקודם</button><span>עמוד ' + p + ' מתוך ' + pages + '</span><button type="button" class="chip" data-gpage="' + (p + 1) + '" data-gp="' + id + '"' + (p >= pages ? ' disabled' : '') + '>הבא</button></div>';
  }
  function elSelect(k, id) {
    return '<label for="' + id + '">מערכת בחירות</label> <select id="' + id + '" data-gk="1">' + IX.elections.map(function (e) { return '<option value="' + e.k + '"' + (e.k === k ? ' selected' : '') + '>' + esc(lbl(e)) + ' (הכנסת ה-' + e.k + ')</option>'; }).join('') + '</select>';
  }
  function loading() { return '<div class="skel" aria-hidden="true"><i></i><i></i><i></i></div><p class="sr" role="status">טוען…</p>'; }
  function error() { return '<div class="empty" role="alert"><b>שגיאה בטעינת הנתונים</b><p>' + esc(ERR) + '. נסו לרענן את הדף.</p></div>'; }
  function srcLine(e) {
    return 'מקור: ' + U.srcLink(e.src.ballots.url, 'ועדת הבחירות המרכזית, תוצאות לפי קלפיות') + ' · ' + U.srcLink(e.src.localities.url, 'לפי יישובים') + ' <span class="meta">(data.gov.il, נשלף ' + U.fmtDate(e.src.ballots.retrieved) + ')</span>';
  }
  function bar(share) { return '<span class="geo-bar" aria-hidden="true"><i style="width:' + Math.max(0, Math.min(100, share * 100)).toFixed(1) + '%"></i></span>'; }

  // ---------- national page
  function pageNational(q) {
    var k = curK(q), e = elOf(k), pk = PREV[k];
    if (!needEl(k) | (pk ? !needEl(pk) : false)) return loading();
    var C = EL[k].cols, iE = 1, iV = 2, iI = 3, iVal = 4, off = 5;
    var all = rows(k).filter(function (r) { return !isEnv(r[0]); });
    var big = all.filter(function (r) { return r[iE] >= MIN; });
    var t = function (r) { return r[iV] / r[iE]; };
    var hi = big.slice().sort(function (a, b) { return t(b) - t(a) || COLL.compare(NAME[a[0]], NAME[b[0]]); }).slice(0, TOP);
    var lo = big.slice().sort(function (a, b) { return t(a) - t(b) || COLL.compare(NAME[a[0]], NAME[b[0]]); }).slice(0, TOP);
    function tRow(r, i) { return '<tr><td class="n">' + (i + 1) + '</td><th scope="row"><a href="' + hashFor(String(r[0]), { k: k }) + '">' + esc(NAME[r[0]]) + '</a></th><td class="n">' + pc(r[iV], r[iE]) + '</td><td class="n">' + n(r[iE]) + '</td></tr>'; }
    var hT = th('#', 1) + th('יישוב') + th('אחוז הצבעה', 1) + th('בעלי זכות בחירה', 1);
    var nat = e.national, env = e.envelopes, Lsum = all.reduce(function (s, r) { return [s[0] + r[iE], s[1] + r[iV]]; }, [0, 0]);
    var tr = all.map(t).filter(function (x, j) { return all[j][iE] >= MIN; });
    var h = '<div class="kpis"><div class="kpi big"><b>' + pc(nat[1], nat[0], 2) + '</b><span>אחוז הצבעה ארצי, ' + esc(lbl(e)) + ' (כולל מעטפות כפולות)</span></div>' +
      '<div class="kpi"><b>' + pc(Lsum[1], Lsum[0]) + '</b><span>אחוז הצבעה בקלפיות היישובים בלבד (בלי ' + n(env[1]) + ' מצביעי המעטפות הכפולות)</span></div>' +
      '<div class="kpi"><b>' + n(e.ballots) + '</b><span>שורות קלפי בקובץ הרשמי, ב-' + n(e.localities - (env[1] ? 1 : 0)) + ' יישובים</span></div>' +
      '<div class="kpi"><b>' + pc(Math.min.apply(null, tr), 1) + ' עד ' + pc(Math.max.apply(null, tr), 1) + '</b><span>טווח אחוז ההצבעה ביישובים עם ' + n(MIN) + ' בעלי זכות בחירה ומעלה (' + n(big.length) + ' יישובים)</span></div></div>';
    h += '<p class="meta">' + srcLine(e) + '</p>';
    h += '<h2 id="geo-turnout">אחוז הצבעה: הגבוה והנמוך ביותר</h2><p>' + esc(lbl(e)) + '. רק יישובים עם ' + n(MIN) + ' בעלי זכות בחירה ומעלה. אחוז ההצבעה ביישוב = מצביעים בקלפיות היישוב ÷ בעלי זכות הבחירה בו (ראו <a href="#geo-method">שיטה</a>).</p>' +
      '<div class="geo-2">' + tbl('הגבוה ביותר', TOP + ' היישובים עם אחוז ההצבעה הגבוה ביותר', hT, hi.map(tRow).join('')) + tbl('הנמוך ביותר', TOP + ' היישובים עם אחוז ההצבעה הנמוך ביותר', hT, lo.map(tRow).join('')) + '</div>';
    // change vs previous election
    if (pk) {
      var pm = {}; rows(pk).forEach(function (r) { pm[r[0]] = r; });
      var ch = big.filter(function (r) { var p = pm[r[0]]; return p && p[1] >= MIN; }).map(function (r) { var p = pm[r[0]]; return { c: r[0], a: p[2] / p[1], b: t(r), d: 100 * (t(r) - p[2] / p[1]) }; });
      var up = ch.slice().sort(function (a, b) { return b.d - a.d || COLL.compare(NAME[a.c], NAME[b.c]); }).slice(0, TOP);
      var dn = ch.slice().sort(function (a, b) { return a.d - b.d || COLL.compare(NAME[a.c], NAME[b.c]); }).slice(0, TOP);
      var pe = elOf(pk), cT = th('#', 1) + th('יישוב') + th(esc(lbl(pe)), 1) + th(esc(lbl(e)), 1) + th('שינוי (נקודות אחוז)', 1);
      var cRow = function (x, i) { return '<tr><td class="n">' + (i + 1) + '</td><th scope="row"><a href="' + hashFor(String(x.c), { k: k }) + '">' + esc(NAME[x.c]) + '</a></th><td class="n">' + pc(x.a, 1) + '</td><td class="n">' + pc(x.b, 1) + '</td><td class="n"><b>' + pp(x.d) + '</b></td></tr>'; };
      var nUp = ch.filter(function (x) { return x.d > 0; }).length;
      h += '<h2 id="geo-change">השינוי באחוז ההצבעה מהמערכת הקודמת</h2><p>מ' + esc(lbl(pe)) + ' ל' + esc(lbl(e)) + ', ב-' + n(ch.length) + ' יישובים עם ' + n(MIN) + ' בעלי זכות בחירה ומעלה בשתי המערכות. אחוז ההצבעה עלה ב-' + n(nUp) + ' מהם וירד או לא השתנה ב-' + n(ch.length - nUp) + '.</p>' +
        '<div class="geo-2">' + tbl('העלייה הגדולה ביותר', 'העלייה הגדולה ביותר', cT, up.map(cRow).join('')) + tbl('הירידה הגדולה ביותר', 'הירידה הגדולה ביותר', cT, dn.map(cRow).join('')) + '</div>';
    } else h += '<p class="note">' + esc(lbl(e)) + ' היא המערכת הראשונה בנתונים, ולכן אין השוואה למערכת קודמת.</p>';
    // per-list strongholds
    var ls = alpha(lists(k)), lsel = q.l && ls.some(function (l) { return l.l === q.l; }) ? q.l : ls[0].l, li = lists(k).map(function (l) { return l.l; }).indexOf(lsel), L = lists(k)[li];
    var sh = big.map(function (r) { return { c: r[0], v: r[off + li], s: r[iVal] ? r[off + li] / r[iVal] : 0, e: r[iE] }; }).sort(function (a, b) { return b.s - a.s || COLL.compare(NAME[a.c], NAME[b.c]); }).slice(0, TOP);
    h += '<h2 id="geo-lists">לפי רשימה: היישובים עם השיעור הגבוה ביותר</h2><p>חישוב מכני: שיעור הקולות של הרשימה מתוך הקולות הכשרים ביישוב, ' + TOP + ' היישובים הראשונים, רק יישובים עם ' + n(MIN) + ' בעלי זכות בחירה ומעלה. הרשימות ברשימה הנפתחת לפי סדר האלף-בית; מוצגות רשימות שקיבלו לפחות ' + IX.minNationalShare + '% מהקולות הכשרים בארץ.</p>' +
      '<p><label for="geo-l">רשימה</label> <select id="geo-l" data-gl="1">' + ls.map(function (l) { return '<option value="' + esc(l.l) + '"' + (l.l === lsel ? ' selected' : '') + '>' + esc(l.n) + ' (' + esc(l.l) + ')</option>'; }).join('') + '</select></p>' +
      '<p class="meta">' + esc(L.n) + ' בארץ: ' + n(L.v) + ' קולות, ' + pc(L.v, e.national[3], 2) + ' מהקולות הכשרים.</p>' +
      tbl('שיעור הגבוה ביותר, ' + L.n, esc(L.n) + ', ' + esc(lbl(e)), th('#', 1) + th('יישוב') + th('שיעור מהכשרים', 1) + th('קולות', 1) + th('בעלי זכות בחירה', 1),
        sh.map(function (x, i) { return '<tr><td class="n">' + (i + 1) + '</td><th scope="row"><a href="' + hashFor(String(x.c), { k: k }) + '">' + esc(NAME[x.c]) + '</a></th><td class="n">' + pc(x.s, 1) + '</td><td class="n">' + n(x.v) + '</td><td class="n">' + n(x.e) + '</td></tr>'; }).join(''));
    // all localities, sortable + paged
    var sk = ['name', 'eligible', 'turnout', 'invalid'].indexOf(q.s) >= 0 ? q.s : 'name', dir = q.d === 'desc' ? 'desc' : q.d === 'asc' ? 'asc' : (sk === 'name' ? 'asc' : 'desc');
    var f = function (r) { return sk === 'name' ? 0 : sk === 'eligible' ? r[iE] : sk === 'turnout' ? (r[iE] ? r[iV] / r[iE] : -1) : (r[iV] ? r[iI] / r[iV] : -1); };
    var srt = all.slice().sort(function (a, b) { var d = sk === 'name' ? COLL.compare(NAME[a[0]], NAME[b[0]]) : f(a) - f(b) || COLL.compare(NAME[a[0]], NAME[b[0]]); return dir === 'asc' ? d : -d; });
    var pages = Math.max(1, Math.ceil(srt.length / PAGE)), p = Math.min(pages, Math.max(1, +q.p || 1));
    h += '<h2 id="geo-all">כל היישובים</h2><p class="meta">' + n(all.length) + ' יישובים ב' + esc(lbl(e)) + '. ברירת המחדל: לפי סדר האלף-בית. "שתי הרשימות הגדולות" = שתי הרשימות עם הכי הרבה קולות ביישוב, מבין הרשימות שמוצגות.</p>' +
      tbl('כל היישובים, ' + lbl(e), 'כל היישובים, ' + esc(lbl(e)) + ' (עמוד ' + p + ' מתוך ' + pages + ')',
        sortTh('יישוב', 'name', sk, dir) + sortTh('בעלי זכות בחירה', 'eligible', sk, dir, 1) + th('מצביעים', 1) + sortTh('אחוז הצבעה', 'turnout', sk, dir, 1) + sortTh('פסולים', 'invalid', sk, dir, 1) + th('שתי הרשימות הגדולות'),
        srt.slice((p - 1) * PAGE, p * PAGE).map(function (r) {
          var t2 = lead(r.slice(1), k, off - 1);
          return '<tr><th scope="row"><a href="' + hashFor(String(r[0]), { k: k }) + '">' + esc(NAME[r[0]]) + '</a></th><td class="n">' + n(r[iE]) + '</td><td class="n">' + n(r[iV]) + '</td><td class="n">' + pc(r[iV], r[iE]) + '</td><td class="n">' + pc(r[iI], r[iV]) + '</td><td>' + t2.map(function (x) { return esc(x.n) + ' ' + pc(x.s, 1); }).join(' · ') + '</td></tr>';
        }).join('')) + pager(srt.length, p, 'all');
    return h;
  }

  // ---------- locality page
  function pageLocality(c, q) {
    if (!NAME[c]) return '<div class="empty" role="alert"><b>היישוב לא נמצא</b><p>אין יישוב עם הסמל ' + esc(c) + ' בנתונים. <a href="#/geo">לעמוד הראשי של התוצאות לפי יישוב</a></p></div>';
    if (!needSh(c)) return loading();
    var S = SH[c], ks = IX.elections.map(function (e) { return e.k; }).filter(function (k) { return S.e[k]; });
    var k = ks.indexOf(+q.k) >= 0 ? +q.k : ks[ks.length - 1], e = elOf(k), X = S.e[k], env = isEnv(c);
    var h = '<p><a href="' + hashFor('', { k: k }) + '">→ כל היישובים</a></p>';
    if (env) h += '<p class="note"><b>זה לא יישוב.</b> "מעטפות חיצוניות" היא השורה שבה ועדת הבחירות מרכזת את הקולות במעטפות כפולות: חיילים, סגל דיפלומטי, אסירים, מאושפזים, אנשי צוות הקלפיות, ובוחרים בקלפיות נגישות או מיוחדות. אין לה בעלי זכות בחירה משלה, ולכן אין לה אחוז הצבעה. באפריל 2019 היא פורסמה בסמל 99999, ובשאר המערכות בסמל 9999.</p>';
    if (ks.length < IX.elections.length) h += '<p class="note">היישוב מופיע בנתונים רק ב-' + ks.length + ' מתוך ' + IX.elections.length + ' מערכות: ' + ks.map(function (kk) { return esc(lbl(elOf(kk))); }).join(', ') + '. יישוב יכול להיעדר כשהוא חדש, כשהוא אוחד עם יישוב אחר, או כשהקלפיות שלו נרשמו תחת יישוב אחר.</p>';
    // turnout over time
    var T = ks.map(function (kk) { var t = S.e[kk].t, E = elOf(kk); return { k: kk, e: E, el: t[0], v: t[1], i: t[2], val: t[3], nat: (E.national[1] - E.envelopes[1]) / E.national[0] }; });
    if (!env) {
      var last = T[T.length - 1];
      h += '<div class="kpis"><div class="kpi big"><b>' + pc(last.v, last.el) + '</b><span>אחוז הצבעה, ' + esc(lbl(last.e)) + '</span></div><div class="kpi"><b>' + n(last.el) + '</b><span>בעלי זכות בחירה, ' + esc(lbl(last.e)) + '</span></div><div class="kpi"><b>' + n(S.e[last.k].b.length) + '</b><span>קלפיות, ' + esc(lbl(last.e)) + '</span></div></div>';
      h += '<h2 id="geo-t">אחוז ההצבעה לאורך המערכות</h2>' + turnoutChart(T) +
        tbl('אחוז ההצבעה לפי מערכת', 'אחוז ההצבעה ב' + esc(S.n) + ' לפי מערכת. להשוואה: אחוז ההצבעה בקלפיות כל היישובים יחד, בלי המעטפות הכפולות.', th('מערכת') + th('בעלי זכות בחירה', 1) + th('מצביעים', 1) + th('אחוז הצבעה', 1) + th('שינוי (נקודות)', 1) + th('פסולים', 1) + th('כל היישובים', 1),
          T.map(function (x, i) { var pr = i ? T[i - 1] : null; return '<tr><th scope="row">' + esc(lbl(x.e)) + '</th><td class="n">' + n(x.el) + '</td><td class="n">' + n(x.v) + '</td><td class="n"><b>' + pc(x.v, x.el) + '</b></td><td class="n">' + (pr && pr.k === PREV[x.k] ? pp(100 * (x.v / x.el - pr.v / pr.el)) : '–') + '</td><td class="n">' + pc(x.i, x.v) + '</td><td class="n">' + pc(x.nat, 1) + '</td></tr>'; }).join(''));
    } else {
      h += tbl('מעטפות חיצוניות לפי מערכת', 'קולות במעטפות כפולות לפי מערכת', th('מערכת') + th('מצביעים', 1) + th('פסולים', 1) + th('כשרים', 1) + th('שיעור מכלל המצביעים בארץ', 1),
        T.map(function (x) { return '<tr><th scope="row">' + esc(lbl(x.e)) + '</th><td class="n">' + n(x.v) + '</td><td class="n">' + n(x.i) + '</td><td class="n">' + n(x.val) + '</td><td class="n">' + pc(x.v, x.e.national[1]) + '</td></tr>'; }).join(''));
    }
    // vote shares by list name across elections
    var names = {}; ks.forEach(function (kk) { lists(kk).forEach(function (l, i) { (names[l.n] = names[l.n] || {})[kk] = S.e[kk].t[3] ? S.e[kk].t[4 + i] / S.e[kk].t[3] : 0; }); });
    var other = {}; ks.forEach(function (kk) { var t = S.e[kk].t; other[kk] = t[3] ? t[t.length - 1] / t[3] : 0; });
    var nl = Object.keys(names).sort(COLL.compare), lk = ks[ks.length - 1], pk = PREV[lk];
    h += '<h2 id="geo-v">למי הצביעו: שיעור הקולות לפי רשימה</h2><p>שיעור מתוך הקולות הכשרים ביישוב. השורות לפי סדר האלף-בית של שם הרשימה. תא ריק = לא רצה רשימה בשם הזה באותה מערכת, או שקיבלה פחות מ-' + IX.minNationalShare + '% בארץ ונכללה ב"רשימות אחרות".</p>' +
      '<p class="note">שם זהה לא אומר הרכב זהה. למשל "כחול לבן" של 2019–2020 כללה את יש עתיד, ו"כחול לבן" של 2021 לא; "העבודה" רצה ב-2019 וב-2020 באיחודים עם רשימות אחרות. עמודת השינוי מחשבת רק הפרש בין שני מספרים של אותו שם, בלי לטעון להמשכיות.</p>' +
      tbl('שיעור הקולות לפי רשימה ומערכת', 'שיעור הקולות ב' + esc(S.n) + ' (אחוז מהכשרים)', th('רשימה') + ks.map(function (kk) { return th(esc(lbl(elOf(kk))), 1); }).join('') + (pk && S.e[pk] ? th('שינוי ' + esc(lbl(elOf(pk))) + ' ← ' + esc(lbl(elOf(lk))), 1) : ''),
        nl.map(function (nm) { var r = names[nm]; return '<tr><th scope="row">' + esc(nm) + '</th>' + ks.map(function (kk) { return '<td class="n">' + (r[kk] != null ? pc(r[kk], 1) : '') + '</td>'; }).join('') + (pk && S.e[pk] ? '<td class="n">' + (r[lk] != null && r[pk] != null ? pp(100 * (r[lk] - r[pk])) : '') + '</td>' : '') + '</tr>'; }).join('') +
        '<tr class="ep-sum"><th scope="row">רשימות אחרות</th>' + ks.map(function (kk) { return '<td class="n">' + pc(other[kk], 1) + '</td>'; }).join('') + (pk && S.e[pk] ? '<td class="n"></td>' : '') + '</tr>');
    // selected election: lists detail + ballots
    var ls = lists(k), t = X.t;
    h += '<h2 id="geo-kd">פירוט לפי מערכת</h2><p>' + elSelect(k, 'geo-k') + '</p><p class="meta">' + srcLine(e) + '</p>' +
      tbl('קולות לפי רשימה, ' + lbl(e), 'קולות ב' + esc(S.n) + ', ' + esc(lbl(e)) + ' (לפי סדר האלף-בית). להשוואה: השיעור בכל הארץ.', th('רשימה') + th('קולות', 1) + th('אחוז מהכשרים', 1) + th('<span class="sr">המחשה</span>') + th('בכל הארץ', 1),
        alpha(ls).map(function (l) { var i = ls.indexOf(l), v = t[4 + i], s = t[3] ? v / t[3] : 0; return '<tr><th scope="row">' + esc(l.n) + ' <span class="meta">(' + esc(l.l) + ')</span></th><td class="n">' + n(v) + '</td><td class="n">' + pc(s, 1) + '</td><td>' + bar(s) + '</td><td class="n">' + pc(l.v, e.national[3]) + '</td></tr>'; }).join('') +
        '<tr class="ep-sum"><th scope="row">רשימות אחרות (' + e.otherLists + ')</th><td class="n">' + n(t[t.length - 1]) + '</td><td class="n">' + pc(t[t.length - 1], t[3]) + '</td><td></td><td class="n">' + pc(e.otherVotes, e.national[3]) + '</td></tr>' +
        '<tr class="ep-sum"><th scope="row">סה"כ כשרים</th><td class="n">' + n(t[3]) + '</td><td class="n">100%</td><td></td><td class="n">100%</td></tr>');
    h += ballots(c, k, q);
    return h;
  }
  function turnoutChart(T) {
    var W = 400, H = 220, L = 34, R = 6, Tp = 22, B = 40, gw = (W - L - R) / T.length, bw = Math.min(44, gw * 0.5);
    var y = function (v) { return Tp + (H - Tp - B) * (1 - v); };
    var g = '';
    [0, .25, .5, .75, 1].forEach(function (v) { g += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y(v) + '" y2="' + y(v) + '" class="ep-grid' + (v === 0 ? ' z' : '') + '"/><text x="' + (L - 4) + '" y="' + (y(v) + 4) + '" class="ep-ax" text-anchor="end">' + (v * 100) + '%</text>'; });
    T.forEach(function (x, i) {
      var cx = L + gw * i + gw / 2, tv = x.el ? x.v / x.el : 0;
      g += '<rect x="' + (cx - bw / 2) + '" y="' + y(tv) + '" width="' + bw + '" height="' + (y(0) - y(tv)) + '" class="ep-bar"><title>' + esc(lbl(x.e) + ': ' + pc(tv, 1)) + '</title></rect>' +
        '<line x1="' + (cx - bw / 2 - 6) + '" x2="' + (cx + bw / 2 + 6) + '" y1="' + y(x.nat) + '" y2="' + y(x.nat) + '" class="geo-nat"/>' +
        '<text x="' + cx + '" y="' + (y(tv) - 5) + '" class="ep-val" text-anchor="middle">' + pc(tv, 1) + '</text>' +
        '<text x="' + cx + '" y="' + (H - B + 16) + '" class="ep-ax" text-anchor="middle">' + esc(lbl(x.e).split(' ')[0]) + '</text><text x="' + cx + '" y="' + (H - B + 30) + '" class="ep-ax" text-anchor="middle">' + esc(lbl(x.e).split(' ')[1] || '') + '</text>';
    });
    return '<figure class="ep-fig"><svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-labelledby="geo-ct" class="ep-svg" direction="ltr"><title id="geo-ct">אחוז ההצבעה ביישוב בכל מערכת (עמודות) ואחוז ההצבעה בקלפיות כל היישובים (קו אופקי). הנתונים בטבלה שמתחת.</title>' + g + '</svg><figcaption class="meta">עמודה = אחוז ההצבעה ביישוב. קו אופקי = כל היישובים יחד, בלי המעטפות הכפולות. מסודר לפי זמן, משמאל לימין.</figcaption></figure>';
  }
  function ballots(c, k, q) {
    var e = elOf(k), B = SH[c].e[k].b, ls = lists(k);
    var sk = ['no', 'eligible', 'turnout', 'invalid'].indexOf(q.s) >= 0 ? q.s : 'no', dir = q.d === 'desc' ? 'desc' : q.d === 'asc' ? 'asc' : (sk === 'no' ? 'asc' : 'desc');
    var f = function (b) { return sk === 'no' ? b[0] : sk === 'eligible' ? b[1] : sk === 'turnout' ? (b[1] ? b[2] / b[1] : -1) : (b[2] ? b[3] / b[2] : -1); };
    var srt = B.slice().sort(function (a, b) { var d = f(a) - f(b) || a[0] - b[0]; return dir === 'asc' ? d : -d; });
    var pages = Math.max(1, Math.ceil(srt.length / PAGE)), p = Math.min(pages, Math.max(1, +q.p || 1));
    var tt = B.filter(function (b) { return b[1] >= 100; }).map(function (b) { return b[2] / b[1]; });
    var h = '<h2 id="geo-b">קלפיות</h2><p>' + n(B.length) + ' קלפיות ב' + esc(SH[c].n) + ', ' + esc(lbl(e)) + '.' + (tt.length > 1 ? ' אחוז ההצבעה בקלפיות עם 100 בעלי זכות בחירה ומעלה נע בין ' + pc(Math.min.apply(null, tt), 1) + ' ל-' + pc(Math.max.apply(null, tt), 1) + '.' : '') + '</p>' +
      '<p class="note">מספרי הקלפיות ושיוך הבוחרים אליהן משתנים בין מערכות, ולכן קלפי עם אותו מספר במערכת אחרת היא לא בהכרח אותה קלפי ואותם בוחרים. ' + (k >= 22 ? 'מספר עם נקודה (למשל 3.1) הוא קלפי משנה של אותה קלפי, כפי שמופיע בקובץ הרשמי.' : '') + ' אחוז הצבעה גבוה מאוד או נמוך מאוד בקלפי בודדת יכול לנבוע מקלפי קטנה או מקלפי מיוחדת.</p>' +
      tbl('קלפיות, ' + lbl(e), 'קלפיות ב' + esc(SH[c].n) + ', ' + esc(lbl(e)) + ' (עמוד ' + p + ' מתוך ' + pages + ')',
        sortTh('קלפי', 'no', sk, dir, 1) + sortTh('בעלי זכות בחירה', 'eligible', sk, dir, 1) + th('מצביעים', 1) + sortTh('אחוז הצבעה', 'turnout', sk, dir, 1) + sortTh('פסולים', 'invalid', sk, dir, 1) + th('שתי הרשימות הגדולות בקלפי'),
        srt.slice((p - 1) * PAGE, p * PAGE).map(function (b) {
          var t2 = lead(b.slice(1), k, 4);
          return '<tr><th scope="row" class="n">' + esc(String(b[0])) + '</th><td class="n">' + n(b[1]) + '</td><td class="n">' + n(b[2]) + '</td><td class="n">' + (b[1] ? pc(b[2], b[1]) : '–') + '</td><td class="n">' + n(b[3]) + '</td><td>' + (b[4] ? t2.map(function (x) { return esc(x.n) + ' ' + n(x.v) + ' (' + pc(x.s, 0) + ')'; }).join(' · ') : '–') + '</td></tr>';
        }).join('')) + pager(srt.length, p, 'b') +
      '<details><summary>כל הרשימות בכל קלפי (' + esc(lbl(e)) + ', העמוד הנוכחי)</summary>' +
      tbl('כל הרשימות בכל קלפי', 'קולות לכל רשימה בכל קלפי בעמוד הנוכחי. הרשימות לפי סדר האלף-בית.', th('קלפי', 1) + alpha(ls).map(function (l) { return th(esc(l.n), 1); }).join('') + th('אחרות', 1) + th('כשרים', 1),
        srt.slice((p - 1) * PAGE, p * PAGE).map(function (b) { return '<tr><th scope="row" class="n">' + esc(String(b[0])) + '</th>' + alpha(ls).map(function (l) { return '<td class="n">' + n(b[5 + ls.indexOf(l)]) + '</td>'; }).join('') + '<td class="n">' + n(b[b.length - 1]) + '</td><td class="n">' + n(b[4]) + '</td></tr>'; }).join('')) + '</details>';
    return h;
  }

  // ---------- method / limits
  function method() {
    var E = IX.elections, k22 = E.filter(function (e) { return e.k === 22; })[0];
    return '<h2 id="geo-method">שיטה</h2><ul>' +
      '<li><b>מקור:</b> קובצי "תוצאות האמת" של ועדת הבחירות המרכזית לכנסת, לפי קלפיות ולפי יישובים, במאגר ' + U.srcLink(IX.source.dataset, 'votes-knesset ב-data.gov.il') + '. הנתונים נשלפו דרך ממשק ה-API הציבורי של המאגר. לכל מערכת נשמר טביעת אצבע (sha256) של הקובץ שנשלף, בקובץ <a href="data/geo/index.json">index.json</a>.</li>' +
      '<li><b>שום מספר לא הוערך.</b> כל מספר בעמוד הוא סכום של שורות קלפי מהקובץ הרשמי. הבנייה בודקת שסכום הקלפיות בכל יישוב זהה לקובץ היישובים הרשמי, ושבכל קלפי מצביעים = פסולים + כשרים.</li>' +
      '<li><b>אחוז הצבעה</b> = מצביעים ÷ בעלי זכות בחירה (בז"ב). בארץ: כל המצביעים, כולל המעטפות הכפולות. ביישוב ובקלפי: רק מי שהצביע בקלפי הרגילה של היישוב.</li>' +
      '<li><b>מעטפות כפולות:</b> חיילים, סגל דיפלומטי בחו"ל, אסירים, מאושפזים, צוותי קלפי ובוחרים בקלפיות מיוחדות מצביעים במעטפה כפולה. הקולות האלה נספרים בנפרד ומופיעים בשורה "מעטפות חיצוניות", לא ביישוב של הבוחר. בעלי זכות הבחירה שלהם כן נספרים ביישוב, ולכן אחוז ההצבעה ביישוב נמוך מעט מהאמיתי. היקף המעטפות הכפולות: ' + E.map(function (e) { return esc(lbl(e)) + ' ' + n(e.envelopes[1]); }).join(' · ') + '.</li>' +
      '<li><b>קולות פסולים</b> נספרים במצביעים ולא בכשרים. שיעור הקולות של רשימה מחושב מתוך הכשרים.</li>' +
      '<li><b>רשימות:</b> לכל מערכת מוצגות בנפרד הרשימות שקיבלו לפחות ' + IX.minNationalShare + '% מהקולות הכשרים בארץ (כולל כל מי שעבר את אחוז החסימה). שאר הרשימות מסוכמות ב"רשימות אחרות". השמות הקצרים מבוססים על שמות הרשימות בקובץ רשימות המועמדים של ועדת הבחירות; האותיות הן אותיות הפתק.</li>' +
      '<li><b>סף מינימום:</b> בטבלאות הארציות נכללים רק יישובים עם ' + n(MIN) + ' בעלי זכות בחירה ומעלה, כדי שיישובים קטנים מאוד לא ימלאו את הקצוות. כל היישובים מופיעים בטבלה המלאה ובחיפוש.</li>' +
      '<li><b>יישובים לאורך זמן:</b> יישוב מזוהה לפי סמל היישוב של הלמ"ס. ' + n(IX.localities.length) + ' סמלים מופיעים בנתונים, ורובם בכל חמש המערכות. כשיישוב אוחד, פוצל או נוסד בין מערכות, הוא מופיע רק במערכות שבהן הופיע בקובץ.</li>' +
      '<li><b>קלפיות:</b> מזהה קלפי = סמל יישוב + מספר קלפי. מספרי הקלפיות ושיוך הבוחרים משתנים בין מערכות, ולכן אין כאן השוואה של קלפי בודדת לאורך זמן.</li>' +
      '<li><b>בלי חלוקה למגזרים:</b> אין כאן סיכומים לפי מגזר או לפי אופי היישוב, כי לא השתמשנו בסיווג רשמי מתועד של יישובים.</li></ul>' +
      '<h2>בדיקה מול התוצאות הרשמיות</h2><p>בכל חמש המערכות, סכום כל הקלפיות זהה למספרי המצביעים, הקולות הפסולים והקולות הכשרים הרשמיים בארץ, וגם לסך הקולות של כל רשימה שמוצגת. בדיקה אוטומטית (test/geo.test.mjs) מחשבת את הסכומים מחדש.</p>' +
      '<h2>מגבלות ומה לא אומת</h2><ul>' +
      '<li>ספטמבר 2019: מספר בעלי זכות הבחירה בקובץ הוא ' + n(k22.national[0]) + ', ובפרסום התוצאות הרשמי מופיע 6,394,030 (הפרש של 2,812). לכן אחוז ההצבעה הארצי כאן ' + pc(k22.national[1], k22.national[0], 2) + ' ובפרסום הרשמי 69.83%. מספרי המצביעים והקולות זהים.</li>' +
      '<li>האתרים של ועדת הבחירות (votesNN.bechirot.gov.il) לא היו נגישים מהשרת שבנה את הנתונים, ולכן ההשוואה לסיכומים הארציים נעשתה מול טבלאות התוצאות בוויקיפדיה, שמצטטות את הוועדה. קובצי הנתונים עצמם הם של הוועדה.</li>' +
      '<li>הקובץ הרשמי לא כולל את מיקום הקלפי (כתובת), ולכן אין כאן פירוק לפי שכונה.</li>' +
      '<li>אחוז ההצבעה ביישוב מחושב מול פנקס הבוחרים, שכולל גם בעלי זכות בחירה שגרים בחו"ל. ביישובים שיש בהם הרבה כאלה אחוז ההצבעה נמוך יותר מסיבה זו.</li>' +
      '<li>אין כאן מפה: לא מצאנו קובץ גבולות רשמי חופשי שאפשר להטמיע בלי ספריות חיצוניות.</li></ul>';
  }
  // ---------- 2026 hook
  function hook2026() {
    var has = IX.elections.some(function (e) { return e.k === 26; });
    return has ? '' : '<p class="note" id="geo-2026">הבחירות לכנסת ה-26 (27.10.2026) יתווספו כאן כשוועדת הבחירות תפרסם את קובצי תוצאות האמת לפי קלפיות במאגר data.gov.il, באותה שיטה ובאותן בדיקות. עד אז אין כאן נתונים של 2026.</p>';
  }

  function page(r) {
    var q = r.q || {};
    var hd = U.head('תוצאות לפי יישוב וקלפי', r.arg && NAME[+r.arg] ? esc(NAME[+r.arg]) + ': אחוז הצבעה ולמי הצביעו' : 'אחוז הצבעה ולמי הצביעו, לפי יישוב וקלפי',
      'התוצאות הרשמיות של ועדת הבחירות המרכזית בחמש מערכות הבחירות האחרונות (2019–2022), לכל יישוב ולכל קלפי. בלי תחזית ובלי שיפוט: רק מה שנספר. <a href="#geo-method">שיטה ומגבלות</a>');
    if (ERR) return hd + error();
    if (!needIndex()) return hd + loading();
    var body = r.arg ? pageLocality(+r.arg, q) : pageNational(q) + hook2026();
    var top = r.arg ? searchBox('') : '<p>' + elSelect(curK(q), 'geo-k') + '</p>' + searchBox('');
    return hd + top + body + method();
  }
  function title(r) { return r.arg && IX && NAME[+r.arg] ? NAME[+r.arg] : ''; }

  // ---------- events (delegated on #main; only for geo controls)
  var main = U.main;
  function go(over, focusSel) {
    var r = U.parseHash(), q = Object.assign({}, r.q, over);
    U.setHash(hashFor(r.arg, q));
    if (focusSel) { var el = main.querySelector(focusSel); if (el) el.focus({ preventScroll: true }); }
  }
  main.addEventListener('input', function (e) { if (e.target.id === 'geo-q') fillSearch(); });
  main.addEventListener('keydown', function (e) {
    if (e.target.id === 'geo-q' && e.key === 'Enter') { var a = main.querySelector('#geo-res a'); if (a) { e.preventDefault(); location.hash = a.getAttribute('href'); } }
  });
  main.addEventListener('change', function (e) {
    var t = e.target;
    if (t.hasAttribute && t.hasAttribute('data-gk')) go({ k: t.value, p: '', l: '' }, '#' + t.id);
    else if (t.hasAttribute && t.hasAttribute('data-gl')) go({ l: t.value }, '#geo-l');
  });
  main.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('button'); if (!b) return;
    if (b.hasAttribute('data-gsort')) {
      var r = U.parseHash(), s = b.getAttribute('data-gsort'), cur = r.q.s || (r.arg ? 'no' : 'name'), defAsc = (s === 'no' || s === 'name');
      var curDir = r.q.d || ((cur === 'no' || cur === 'name') ? 'asc' : 'desc');
      var d = cur === s ? (curDir === 'asc' ? 'desc' : 'asc') : (defAsc ? 'asc' : 'desc');
      go({ s: s, d: d, p: '' }, '[data-gsort="' + s + '"]');
    } else if (b.hasAttribute('data-gpage')) {
      var id = b.getAttribute('data-gp'); go({ p: b.getAttribute('data-gpage') });
      var anchor = document.getElementById(id === 'b' ? 'geo-b' : 'geo-all'); if (anchor) anchor.scrollIntoView({ block: 'start' });
      var nb = main.querySelector('[data-gp="' + id + '"]:not([disabled])'); if (nb) nb.focus({ preventScroll: true });
    }
  });
  window.EL26GEO = { page: page, title: title, after: fillSearch, _search: function (q) { return IX ? search(q) : null; } };
})();
