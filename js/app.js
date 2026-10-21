/* השוואת מצעים – בחירות 2026. Static, data-driven: all content comes from data/*.json */
(function () {
  'use strict';
  var P, A, D; // platforms, analysis, polls
  var $main = document.getElementById('main');
  var dlg = document.getElementById('dlg');
  var tip = document.getElementById('tip');
  var REPO = 'https://github.com/dudidd-wq/elections-2026';
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem('el26.' + k); return v === null ? d : v; } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem('el26.' + k, v); } catch (e) {} }
  };
  var state = { order: store.get('order', 'alpha'), hl: '', mxMode: store.get('mxMode', 'summary') };

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function fmtDate(iso) { if (!iso) return ''; var d = iso.slice(0, 10).split('-'); return +d[2] + '.' + +d[1] + '.' + d[0]; }
  function fmtShort(iso) { var d = iso.slice(0, 10).split('-'); return +d[2] + '.' + +d[1]; }
  function fmtStamp(iso) { if (!iso) return ''; var t = iso.slice(11, 16); return fmtDate(iso) + (t ? ' ' + t : '') + ' (שעון ישראל)'; }
  function fmtN(x) { return (Math.round(x * 10) / 10).toFixed(1); }
  var COLL = (window.Intl && Intl.Collator) ? new Intl.Collator('he') : { compare: function (a, b) { return a < b ? -1 : a > b ? 1 : 0; } };
  function byId(arr) { var o = {}; arr.forEach(function (x) { o[x.id] = x; }); return o; }
  var LIST, ISS, PARTY, COLOR = {};

  // ---------- theme
  var themeBtn = document.getElementById('theme');
  function syncTheme() { var dark = document.documentElement.getAttribute('data-theme') === 'dark'; themeBtn.setAttribute('aria-pressed', String(dark)); }
  themeBtn.addEventListener('click', function () {
    var t = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', t); store.set('theme', t); syncTheme();
  });
  syncTheme();

  // ---------- colours: muted palette, assigned by alphabetical order of list names (not party colours)
  var PALETTE = ['#4a75a5', '#9f643c', '#487f4f', '#995c99', '#887030', '#3a7b82', '#b45750', '#7867ad', '#657b37', '#a35c80', '#3a7898', '#886f49', '#447e6b'];
  function assignColors() {
    var ids = D.parties.filter(function (p) { return !p.withdrawn; }).map(function (p) { return p.id; });
    ids.sort(function (a, b) { return COLL.compare(lname(a), lname(b)); });
    ids.forEach(function (id, k) { COLOR[id] = PALETTE[k % PALETTE.length]; });
    D.parties.forEach(function (p) { if (!COLOR[p.id]) COLOR[p.id] = '#737373'; });
  }
  function dot(id) { return '<span class="dot" style="--c:' + COLOR[id] + '" aria-hidden="true"></span>'; }

  function avgOf(id) { return (D.computed.average[id] || 0); }
  var SORTC = {};
  function sortIds(ids) {
    var ck = state.order + '|' + ids.join(','); if (SORTC[ck]) return SORTC[ck].slice();
    var r = sortIds0(ids); SORTC[ck] = r; return r.slice();
  }
  function sortIds0(ids) {
    var names = {}; ids.forEach(function (id) { names[id] = lname(id); });
    return ids.slice().sort(function (a, b) {
      if (state.order === 'polls') { var d = avgOf(b) - avgOf(a); if (Math.abs(d) > 1e-9) return d; }
      return COLL.compare(names[a], names[b]);
    });
  }
  function orderedLists() { return sortIds(P.lists.map(function (l) { return l.id; })).map(function (id) { return LIST[id]; }); }
  function lname(id) { var l = LIST && LIST[id]; return l ? l.tableName : PARTY[id].name; }
  function dagger(id) {
    if (!LIST[id]) return '';
    return LIST[id].added20Oct ? ' <span class="dagger" title="נוספה למסמך ב-20.10.2026">†</span>' : '';
  }
  function starMark(p) { return p.star ? '<span class="star" title="מבוסס על הצהרות, הודעות או הצבעות">*</span>' : ''; }
  function nLists() { return P.lists.length; }
  function orderNote() {
    return state.order === 'polls'
      ? 'סדר הרשימות: לפי ממוצע הסקרים העדכני (' + fmtDate(D.computed.asOf) + '), מהגבוה לנמוך; בשוויון – לפי סדר האלף-בית.'
      : 'סדר הרשימות: לפי סדר האלף-בית של שם הרשימה. הסדר אינו מבטא דירוג או העדפה.';
  }
  function orderCtl() {
    return '<div class="controls" role="group" aria-label="סדר הרשימות"><span class="seg">' +
      '<button type="button" data-order="alpha" aria-pressed="' + (state.order === 'alpha') + '">א–ב</button>' +
      '<button type="button" data-order="polls" aria-pressed="' + (state.order === 'polls') + '">לפי ממוצע הסקרים</button></span>' +
      '<span class="order-note">' + esc(orderNote()) + '</span></div>';
  }
  function asOfLine() {
    return '<p class="meta">העמדות נכונות ל-' + fmtDate(P.meta.documentAsOf) + ' · הקישורים נבדקו ב-' + fmtDate(P.meta.linksCheckedOn) + ' · מקור: מסמך המחקר "' + esc(P.meta.title) + '".</p>';
  }
  function legend(heat) {
    return '<div class="legend" role="note" aria-label="מקרא">' +
      (heat ? '<span><i class="sw plat"></i>מצע, מסמך מדיניות או תשובה רשמית</span><span><i class="sw stmt"></i>הצהרות, הודעות או הצבעות (*)</span><span><i class="sw nf"></i>לא נמצאה עמדה פומבית</span>' : '') +
      '<span><b class="star">*</b> ' + esc(P.starLegend.replace(/^כוכבית \(\*\) /, '')) + '</span>' +
      '<span><b class="dagger">†</b> ' + esc(P.daggerLegend.replace(/^† /, '')) + '</span>' +
      '<span>"לא נמצאה עמדה" פירושו שלא אותרה עמדה פומבית, ולא שאין לרשימה עמדה.</span></div>';
  }
  function legendCompact(heat) {
    return '<div class="legend compact" role="note" aria-label="מקרא">' + (heat === false ? '<span><b class="star">*</b> מבוסס על הצהרות או הצבעות</span>' : '<span><i class="sw plat"></i>מצע / מסמך / תשובה רשמית</span><span><i class="sw stmt"></i>הצהרות או הצבעות <b class="star">*</b></span><span><i class="sw nf"></i>לא נמצאה עמדה פומבית</span>') +
      '<span><b class="dagger">†</b> נוספה למסמך ב-20.10</span>' +
      '<details><summary>מקרא מלא</summary>' + legend(false).replace('class="legend"', 'class="legend inner"') + '</details></div>';
  }
  function host(url) { return url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]; }
  function srcLink(url, label) {
    if (!url) return '<span class="meta">אין קישור</span>';
    return '<a href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">' + esc(label || 'למקור') + '&nbsp;<span class="ltr">(' + esc(host(url)) + ')</span><span class="sr"> (נפתח בחלון חדש)</span></a>';
  }
  function head(eyebrow, title, lead) {
    return '<header class="page-head">' + (eyebrow ? '<p class="eyebrow">' + esc(eyebrow) + '</p>' : '') + '<h1>' + title + '</h1>' + (lead ? '<p class="lead">' + lead + '</p>' : '') + asOfLine() + '</header>';
  }
  var ICON = {
    matrix: '<path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" fill="none" stroke="currentColor" stroke-width="1.8"/>',
    issue: '<path d="M5 6h14M5 12h14M5 18h9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" fill="none"/>',
    list: '<circle cx="12" cy="8" r="3.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M5 20a7 7 0 0 1 14 0" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
    compare: '<path d="M4 5h6v14H4zM14 5h6v14h-6z" fill="none" stroke="currentColor" stroke-width="1.8"/>',
    analysis: '<path d="M12 3v18M3 12h18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="1.8"/>',
    polls: '<path d="M5 20V11M10 20V6M15 20v-7M20 20V9" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    about: '<circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 11v6M12 7.5v.1" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'
  };
  function icon(k) { return '<span class="ico" aria-hidden="true"><svg viewBox="0 0 24 24">' + ICON[k] + '</svg></span>'; }
  var GO = '<span class="go" aria-hidden="true">←</span>';

  // ---------- mention highlighting in free text
  var MRX, MMAP = {};
  function buildMentions() {
    var al = [];
    Object.keys(P.aliases).forEach(function (id) { P.aliases[id].forEach(function (a) { al.push(a); MMAP[esc(a)] = id; }); });
    al.sort(function (a, b) { return b.length - a.length; });
    var alt = al.map(function (a) { return esc(a).replace(/[.*+?^${}()|[\]\\!]/g, '\\$&'); }).join('|');
    MRX = new RegExp('(^|[\\s(\\-–,;:/"]|&quot;)([ובלהמש]{0,2})(' + alt + ')(?![\\u05D0-\\u05EA])', 'g');
  }
  function mark(text) {
    return esc(text).replace(MRX, function (m, pre, px, name) {
      var id = MMAP[name]; var on = state.hl && state.hl === id ? ' on' : '';
      return pre + '<mark class="m' + on + '" data-l="' + id + '">' + px + name + '</mark>';
    });
  }
  function hlSelect() {
    var o = '<option value="">ללא הדגשה</option>' + orderedLists().map(function (l) { return '<option value="' + l.id + '"' + (state.hl === l.id ? ' selected' : '') + '>' + esc(l.tableName) + '</option>'; }).join('');
    return '<div class="controls"><label for="hl">הדגשת אזכורים של רשימה:</label> <select id="hl">' + o + '</select> <span id="hlcount" class="meta" role="status"></span></div>';
  }

  // ---------- tooltip
  function showTip(html, x, y) {
    tip.innerHTML = html; tip.classList.add('on');
    var w = tip.offsetWidth, h = tip.offsetHeight, vw = window.innerWidth;
    var left = Math.min(Math.max(8, x - w / 2), vw - w - 8), top = y - h - 14; if (top < 8) top = y + 18;
    tip.style.left = left + 'px'; tip.style.top = top + 'px';
  }
  function hideTip() { tip.classList.remove('on'); }

  // ---------- dialog
  function openCell(lid, iid) {
    var p = P.positions[lid][iid], l = LIST[lid], i = ISS[iid];
    var h = '<h2 id="dlg-title"><span class="lname">' + dot(lid) + esc(l.tableName) + '</span>' + dagger(lid) + ' · ' + esc(i.title) + '</h2>' +
      '<p class="sum"><b>בתמצית:</b> ' + esc(p.summary) + '</p>' +
      '<p><b>העמדה המלאה (במסגור הרשימה):</b> ' + esc(p.full) + ' ' + starMark(p) + '</p>' +
      '<p><span class="badge">סוג מקור: ' + esc(p.sourceType) + '</span> ' + (p.star ? '<span class="badge"><span class="star">*</span> מבוסס על הצהרות/הצבעות</span> ' : '') + '</p>' +
      '<p>' + srcLink(p.url, 'מקור העמדה') + '</p>' + extraSrc(p) +
      '<p class="meta">קוד קצר בניתוח הרוחבי: ' + esc(p.code) + '</p>' +
      '<p class="pager"><a class="btn sec" href="#/issue/' + iid + '">כל הרשימות בסוגיה זו</a> <a class="btn sec" href="#/list/' + lid + '">פרופיל הרשימה</a></p>' +
      '<p class="meta">נכון ל-' + fmtDate(P.meta.documentAsOf) + '.</p>';
    document.getElementById('dlg-body').innerHTML = h;
    dlg.querySelector('.dlg-in').style.setProperty('--c', COLOR[lid]);
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
  }
  function extraSrc(p) {
    if (!p.extraUrls || !p.extraUrls.length) return '';
    return '<p class="meta">מקורות נוספים: ' + p.extraUrls.map(function (u, k) { return srcLink(u, 'מקור ' + (k + 2)); }).join(' · ') + '</p>';
  }
  document.getElementById('dlg-x').addEventListener('click', function () { dlg.close(); });
  dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
  dlg.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('a[href^="#/"]')) dlg.close(); });

  // ---------- seats arc (hemicycle)
  function allocSeats() { // largest-remainder rounding of the poll average to 120 seats (illustration, not a forecast)
    var ids = D.parties.filter(function (p) { return !p.withdrawn; }).map(function (p) { return p.id; });
    var tot = ids.reduce(function (s, id) { return s + avgOf(id); }, 0) || 1;
    var q = ids.map(function (id) { var v = avgOf(id) / tot * 120; return { id: id, f: Math.floor(v), r: v - Math.floor(v) }; });
    var left = 120 - q.reduce(function (s, x) { return s + x.f; }, 0);
    q.slice().sort(function (a, b) { return b.r - a.r; }).slice(0, left).forEach(function (x) { x.f++; });
    var o = {}; q.forEach(function (x) { o[x.id] = x.f; }); return o;
  }
  function arcSvg(seats) {
    var ids = sortIds(Object.keys(seats).filter(function (id) { return seats[id] > 0; }));
    var W = 520, H = 290, cx = W / 2, cy = 270, R0 = 92, R1 = 250, rows = 7, pts = [];
    var radii = [], sum = 0; for (var i = 0; i < rows; i++) { radii.push(R0 + (R1 - R0) * i / (rows - 1)); sum += radii[i]; }
    var cnt = radii.map(function (r) { return Math.round(120 * r / sum); });
    var diff = 120 - cnt.reduce(function (a, b) { return a + b; }, 0); cnt[rows - 1] += diff;
    radii.forEach(function (r, k) { for (var j = 0; j < cnt[k]; j++) { var a = cnt[k] === 1 ? Math.PI / 2 : j / (cnt[k] - 1) * Math.PI; pts.push({ a: a, r: r }); } });
    pts.sort(function (p1, p2) { return p1.a - p2.a || p2.r - p1.r; }); // start at the right edge (reading direction)
    var k = 0, circles = '', seatR = 8.6;
    ids.forEach(function (id) {
      for (var s = 0; s < seats[id]; s++) {
        var p = pts[k++]; var x = cx + p.r * Math.cos(p.a), y = cy - p.r * Math.sin(p.a);
        circles += '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + seatR + '" fill="' + COLOR[id] + '" data-l="' + id + '"/>';
      }
    });
    var label = 'הקצאה מעוגלת של ממוצע הסקרים ל-120 מושבים: ' + ids.map(function (id) { return lname(id) + ' ' + seats[id]; }).join(', ');
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(label) + '">' + circles +
      '<text class="arc-total" x="' + cx + '" y="' + (cy - 26) + '" text-anchor="middle">120</text><text class="arc-sub" x="' + cx + '" y="' + (cy - 4) + '" text-anchor="middle">מושבים · רוב = 61</text></svg>';
  }

  // ---------- pages
  function daysTo(dateIso) {
    var now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jerusalem' }));
    var t = new Date(dateIso + 'T00:00:00'); var n = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return Math.round((t - n) / 864e5);
  }
  function pageHome() {
    var dd = daysTo(P.meta.electionDate);
    var when = dd > 1 ? 'בעוד ' + dd + ' ימים' : dd === 1 ? 'מחר' : dd === 0 ? 'היום' : 'הבחירות התקיימו';
    var c = D.computed, seats = allocSeats(), ids = sortIds(Object.keys(seats).filter(function (id) { return seats[id] > 0; }));
    var kpiDays = dd >= 0 ? '<div class="kpi big"><b>' + (dd > 1 ? dd : dd === 1 ? 'מחר' : 'היום') + '</b><span>' + (dd > 1 ? 'ימים עד יום הבחירות' : 'יום הבחירות') + ' · 27.10</span></div>' : '<div class="kpi big"><b>27.10</b><span>הבחירות התקיימו</span></div>';
    return '<section class="hero" aria-labelledby="h1">' +
      '<div><p class="eyebrow">בחירות לכנסת ה-26 · יום שלישי, 27 באוקטובר 2026</p>' +
      '<h1 id="h1">מה הרשימות אומרות, <em>סוגיה אחר סוגיה</em></h1>' +
      '<p class="lead">השוואה ניטרלית של עמדות ' + nLists() + ' רשימות ב-10 סוגיות, כל עמדה במסגור של הרשימה עצמה ועם קישור למקור. הבחירות ' + when + '. אין כאן המלצה להצבעה, אין שאלון התאמה ואין ציון לעמדות.</p>' +
      '<div class="count">' + kpiDays +
      '<div class="kpi"><b>' + nLists() + '</b><span>רשימות</span></div><div class="kpi"><b>10</b><span>סוגיות</span></div>' +
      '<div class="kpi"><b>' + D.polls.length + '</b><span>סקרים · אחרון ' + fmtShort(c.asOf) + '</span></div></div>' +
      '<div class="controls"><a class="btn" href="#/matrix">למטריצת העמדות</a><a class="btn sec" href="#/compare">השוואה בין רשימות</a></div>' + asOfLine() + '</div>' +
      '<div class="arc-card"><div class="arc-head"><h2>ממוצע הסקרים, כמושבים</h2><span class="meta">' + c.n + ' סקרים, ' + fmtShort(c.window[0]) + '–' + fmtShort(c.window[1]) + '</span></div>' +
      '<div class="arc" id="arc">' + arcSvg(seats) + '</div>' +
      '<ul class="arc-legend" aria-label="מושבים לפי רשימה">' + ids.map(function (id) { return '<li><button type="button" data-arc="' + id + '" aria-label="' + esc(lname(id) + ': ' + seats[id] + ' מושבים (ממוצע ' + fmtN(avgOf(id)) + '), לפרופיל הרשימה') + '">' + dot(id) + '<span>' + esc(lname(id)) + '</span><b>' + seats[id] + '</b></button></li>'; }).join('') + '</ul>' +
      '<p class="meta">המחשה: הממוצע מעוגל ל-120 מושבים בשיטת השארית הגדולה. זו אינה תחזית, ולא הופעל אחוז החסימה על הממוצע. ' + esc(orderNote()) + ' <a href="#/polls">לכל נתוני הסקרים</a></p></div>' +
      '</section>' +
      '<h2>לאן ממשיכים</h2><div class="cards">' +
      card('#/matrix', 'מטריצה', nLists() + ' רשימות × 10 סוגיות במפת חום לפי סוג המקור. לחיצה על תא מציגה את העמדה המלאה ואת המקור.', 'matrix') +
      card('#/issue', 'לפי סוגיה', 'כל הרשימות בסוגיה אחת, בניסוח מלא, ולצדן המחנות בסוגיה.', 'issue') +
      card('#/list', 'לפי רשימה', 'פרופיל של כל רשימה: הרכב, מעמד המצע, גוש מוצהר, סקרים ועמדות.', 'list') +
      card('#/compare', 'השוואה', 'בחירה של 2–3 רשימות והשוואה ביניהן זו לצד זו.', 'compare') +
      card('#/analysis', 'ניתוח רוחבי', 'קווי המחלוקת החדים, המכנה המשותף והחפיפות בין הגושים.', 'analysis') +
      card('#/polls', 'סקרים', 'ממוצע, טווח, סכומי גושים וקו 61, מגמה וטבלת כל הסקרים.', 'polls') +
      '</div>' +
      '<h2>10 הסוגיות</h2><nav class="issue-strip" aria-label="מעבר לסוגיה">' + P.issues.map(function (i) { return '<a href="#/issue/' + i.id + '"><span class="n">' + i.n + '</span>' + esc(i.short) + '</a>'; }).join('') + '</nav>' +
      '<h2>איך לקרוא את האתר</h2><div class="principles">' +
      '<div><b>ניטרלי</b><p>בלי המלצה ובלי ציון. כל הרשימות מוצגות באותו מבנה ובאותו סדר.</p></div>' +
      '<div><b>שקוף</b><p>לכל עמדה סוג מקור וקישור. <span class="star">*</span> מסמנת עמדה שמבוססת על הצהרות או הצבעות.</p></div>' +
      '<div><b>עקבי</b><p>' + esc(orderNote()) + '</p></div>' +
      '<div><b>מתוארך</b><p>העמדות נכונות ל-' + fmtDate(P.meta.documentAsOf) + '; הסקרים עודכנו ב-' + fmtStamp(D.meta.updatedAt) + '.</p></div></div>' +
      legend(false);
  }
  function card(href, t, d, ic) { return '<a class="card" href="' + href + '">' + (ic ? icon(ic) : '') + GO + '<h3>' + esc(t) + '</h3><p>' + esc(d) + '</p></a>'; }

  function selIssues(param) {
    var all = P.issues.map(function (i) { return i.id; });
    if (!param) return all;
    var s = param.split(',').filter(function (x) { return ISS[x]; });
    return s.length ? s : all;
  }
  function issueChips(sel, name) {
    return '<fieldset><legend>סינון לפי סוגיה</legend><div class="chips" data-chips="' + name + '">' +
      '<button type="button" class="chip" data-all="1" aria-pressed="' + (sel.length === P.issues.length) + '">כל הסוגיות</button>' +
      P.issues.map(function (i) { return '<button type="button" class="chip" data-v="' + i.id + '" aria-pressed="' + (sel.indexOf(i.id) >= 0 && sel.length !== P.issues.length) + '">' + esc(i.short) + '</button>'; }).join('') +
      '</div></fieldset>';
  }

  function cellClass(p) { return p.notFound ? 'nf' : p.star ? 'stmt' : 'plat'; }
  function matrixTable(sel, mode) {
    var lists = orderedLists();
    var headRow = '<tr><th scope="col"><span class="meta">רשימה / סוגיה</span></th>' + sel.map(function (iid) { return '<th scope="col"><a href="#/issue/' + iid + '">' + esc(mode === 'code' ? ISS[iid].code : ISS[iid].short) + '</a></th>'; }).join('') + '</tr>';
    var body = lists.map(function (l) {
      return '<tr' + (state.hl === l.id ? ' class="hl"' : '') + '><th scope="row"><a href="#/list/' + l.id + '">' + dot(l.id) + esc(l.tableName) + '</a>' + dagger(l.id) + '</th>' + sel.map(function (iid) {
        var p = P.positions[l.id][iid];
        var t = mode === 'code' ? p.code : p.summary;
        return '<td><button type="button" class="cell ' + cellClass(p) + '" data-cell="' + l.id + '|' + iid + '" aria-label="' + esc(l.tableName + ', ' + ISS[iid].short + ': ' + t + (p.star ? ' (מבוסס על הצהרות או הצבעות)' : '') + '. לחיצה לעמדה המלאה ולמקור') + '">' + esc(t) + (p.star ? ' <span class="star" aria-hidden="true">*</span>' : '') + '</button></td>';
      }).join('') + '</tr>';
    }).join('');
    return '<div class="mx-wrap" tabindex="0" role="region" aria-label="מטריצת עמדות, אפשר לגלול אופקית ואנכית"><table class="mx' + (mode === 'code' ? ' code' : '') + '"><caption class="sr">עמדות הרשימות לפי סוגיה</caption><thead>' + headRow + '</thead><tbody>' + body + '</tbody></table></div>';
  }
  function hlRowSelect() {
    return '<label>הדגשת שורה: <select id="hlrow"><option value="">ללא</option>' + orderedLists().map(function (l) { return '<option value="' + l.id + '"' + (state.hl === l.id ? ' selected' : '') + '>' + esc(l.tableName) + '</option>'; }).join('') + '</select></label>';
  }
  function pageMatrix(q) {
    var sel = selIssues(q.issues), mode = state.mxMode;
    var tot = { plat: 0, stmt: 0, nf: 0 }; P.lists.forEach(function (l) { sel.forEach(function (i) { tot[cellClass(P.positions[l.id][i])]++; }); });
    return head('מטריצה', 'מטריצת השוואה', 'תמצית במילות מפתח, ' + nLists() + ' רשימות × ' + sel.length + ' סוגיות. צבע הרקע מסמן את סוג המקור, לא את תוכן העמדה. לחיצה על תא פותחת את הניסוח המלא, את סוג המקור ואת הקישור.') +
      '<div class="toolbar panel tight"><div class="tb-row"><span class="seg" role="group" aria-label="סדר הרשימות">' +
      '<button type="button" data-order="alpha" aria-pressed="' + (state.order === 'alpha') + '">א–ב</button>' +
      '<button type="button" data-order="polls" aria-pressed="' + (state.order === 'polls') + '">לפי ממוצע הסקרים</button></span>' +
      '<span class="seg" role="group" aria-label="סוג התמצית">' +
      '<button type="button" data-mx="summary" aria-pressed="' + (mode === 'summary') + '">תמצית</button>' +
      '<button type="button" data-mx="code" aria-pressed="' + (mode === 'code') + '">קודים קצרים</button></span>' +
      hlRowSelect() + '</div><p class="order-note">' + esc(orderNote()) + '</p>' +
      issueChips(sel, 'mx') + '</div>' + legendCompact() +
      '<p class="mx-tip">בתצוגה הנוכחית: ' + tot.plat + ' תאים מבוססי מצע או מסמך, ' + tot.stmt + ' מבוססי הצהרות (*), ' + tot.nf + ' בלי עמדה שנמצאה. שורת הכותרת ועמודת הרשימות נשארות במקום בזמן גלילה.</p>' +
      matrixTable(sel, mode);
  }

  function posBlock(lid, iid, headWith) {
    var p = P.positions[lid][iid];
    var title = headWith === 'list' ? '<a href="#/list/' + lid + '">' + esc(lname(lid)) + '</a>' + dagger(lid) : '<a href="#/issue/' + iid + '">' + esc(ISS[iid].n + '. ' + ISS[iid].title) + '</a>';
    return '<article class="pos' + (p.notFound ? ' nf' : '') + '" style="--c:' + COLOR[lid] + '"><h3>' + (headWith === 'list' ? dot(lid) : '') + title + ' ' + (p.star ? '<span class="badge"><span class="star">*</span> הצהרות/הצבעות</span>' : '') + '</h3>' +
      '<p class="sum">בתמצית: ' + esc(p.summary) + '</p><p class="full">' + esc(p.full) + '</p>' +
      '<div class="src"><span class="badge">סוג מקור: ' + esc(p.sourceType) + '</span>' + srcLink(p.url, 'מקור') +
      (p.extraUrls && p.extraUrls.length ? p.extraUrls.map(function (u, k) { return srcLink(u, 'מקור ' + (k + 2)); }).join('') : '') + '</div></article>';
  }
  function campList(c) {
    return '<ul>' + c.segments.map(function (s) { return '<li>' + (s.label ? '<span class="lab">' + mark(s.label) + '</span> – ' : '') + mark(s.who) + '</li>'; }).join('') + '</ul>';
  }

  function pageIssue(id) {
    if (!id || !ISS[id]) {
      return head('לפי סוגיה', 'השוואה לפי סוגיה', 'בחרו סוגיה כדי לראות את עמדות כל ' + nLists() + ' הרשימות בניסוח מלא.') +
        '<div class="cards">' + P.issues.map(function (i) {
          var nf = P.lists.filter(function (l) { return P.positions[l.id][i.id].notFound; }).length;
          return '<a class="card" href="#/issue/' + i.id + '">' + GO + '<span class="list-chip">' + i.n + '</span><h2 class="ch">' + esc(i.short) + '</h2><p>' + esc(i.title) + '</p><p class="meta">' + (nLists() - nf) + ' מתוך ' + nLists() + ' רשימות עם עמדה שנמצאה</p></a>';
        }).join('') + '</div>' +
        '<p class="note">' + esc(P.issueNote.join(' ')) + '</p>';
    }
    var i = ISS[id], idx = P.issues.indexOf(i);
    var prev = P.issues[(idx + 9) % 10], next = P.issues[(idx + 1) % 10];
    var rk = A.rank.filter(function (r) { return r.issues.indexOf(id) >= 0; })[0];
    var camp = A.camps.filter(function (c) { return c.issue === id; })[0];
    var h = head('סוגיה ' + i.n + ' מתוך 10', esc(i.title), '') +
      '<div class="toolbar panel tight"><div class="tb-row"><label>מעבר לסוגיה: <select id="goissue">' + P.issues.map(function (x) { return '<option value="' + x.id + '"' + (x.id === id ? ' selected' : '') + '>' + x.n + '. ' + esc(x.short) + '</option>'; }).join('') + '</select></label></div>' + orderCtl() + '</div>' + legendCompact(false);
    if (camp) h += '<section class="camp" aria-labelledby="camp-h"><h2 id="camp-h">המחנות בסוגיה (מתוך הניתוח הרוחבי)</h2>' + campList(camp) + '</section>';
    if (rk) h += '<p class="note">בדירוג עומק המחלוקת בניתוח הרוחבי: מקום ' + rk.rank + ' מתוך 7 (' + esc(rk.label) + '). הדירוג הוא ניתוח ולא נתון. <a href="#/analysis/splits">לדירוג המלא</a></p>';
    h += '<h2>עמדות הרשימות</h2><div class="grid-pos two">' + orderedLists().map(function (l) { return posBlock(l.id, id, 'list'); }).join('') + '</div>';
    h += '<nav class="pager" aria-label="ניווט בין סוגיות"><a class="btn sec" href="#/issue/' + prev.id + '">→ ' + esc(prev.short) + '</a><a class="btn sec" href="#/issue/' + next.id + '">' + esc(next.short) + ' ←</a></nav>';
    return h;
  }

  function pollStats(id) {
    var c = D.computed, inc = c.included.length;
    return { avg: c.average[id], rng: c.range[id], pass: c.passesIn[id], n: inc };
  }
  function basisBar(id) {
    var t = { plat: 0, stmt: 0, nf: 0 }; P.issues.forEach(function (i) { t[cellClass(P.positions[id][i.id])]++; });
    return '<div class="basis" role="img" aria-label="' + esc('בסיס העמדות: ' + t.plat + ' ממצע או מסמך, ' + t.stmt + ' מהצהרות, ' + t.nf + ' לא נמצאה עמדה') + '"><i style="width:' + t.plat * 10 + '%;background:var(--acc)"></i><i style="width:' + t.stmt * 10 + '%;background:var(--star)"></i><i style="width:' + t.nf * 10 + '%;background:var(--line2)"></i></div>' +
      '<p class="meta">' + t.plat + ' ממצע/מסמך · ' + t.stmt + ' מהצהרות (*) · ' + t.nf + ' לא נמצאה</p>';
  }
  function pageList(id) {
    if (!id || !LIST[id]) {
      return head('לפי רשימה', 'פרופיל לפי רשימה', 'הרכב, מעמד המצע, גוש מוצהר, סקרים ועמדות של כל רשימה.') + orderCtl() + '<div class="cards">' + orderedLists().map(function (l) {
        var s = pollStats(l.id);
        return '<a class="card lcard" href="#/list/' + l.id + '" style="--c:' + COLOR[l.id] + '">' + GO + '<div class="row"><h2 class="ch">' + esc(l.tableName) + dagger(l.id) + '</h2></div>' +
          '<div class="row"><span class="meta">אותיות: <b>' + esc(l.letters) + '</b></span><span><span class="seats">' + fmtN(s.avg) + '</span> <span class="meta">מנדטים בממוצע</span></span></div>' +
          '<p>' + esc(l.leader) + '</p>' + basisBar(l.id) + '</a>';
      }).join('') + '</div>' + legend(false);
    }
    var l = LIST[id], s = pollStats(id);
    var stars = P.issues.filter(function (i) { return P.positions[id][i.id].star; }).length;
    var h = '<header class="page-head"><p class="eyebrow">פרופיל רשימה</p><h1><span class="lname">' + dot(id) + esc(l.tableName) + '</span>' + dagger(id) + '</h1>' +
      '<p class="lead"><span class="letters" aria-label="אותיות בפתק">' + esc(l.letters) + '</span> &nbsp;' + esc(l.leader) + '</p>' + asOfLine() + '</header>' +
      '<label class="controls">מעבר לרשימה: <select id="golist">' + orderedLists().map(function (x) { return '<option value="' + x.id + '"' + (x.id === id ? ' selected' : '') + '>' + esc(x.tableName) + '</option>'; }).join('') + '</select></label>' +
      (l.verify ? '<p class="note"><b>בדיקת הרכב:</b> ' + esc(l.verify.text) + ' ' + l.verify.sources.map(function (u, k) { return srcLink(u, 'מקור ' + (k + 1)); }).join(' · ') + '</p>' : '') +
      '<div class="prof-hero"><div class="panel"><dl class="prof">' +
      '<dt>שם בפתק</dt><dd>' + esc(l.ballotName) + '</dd><dt>אותיות</dt><dd>' + esc(l.letters) + '</dd>' +
      '<dt>ראש הרשימה</dt><dd>' + esc(l.leader) + '</dd><dt>הרכב</dt><dd>' + esc(l.composition) + '</dd>' +
      '<dt>מנדטים בכנסת ה-25</dt><dd>' + esc(l.seats25) + '</dd><dt>מעמד המצע</dt><dd>' + esc(l.platformStatus) + '</dd>' +
      '<dt>גוש / שותפויות מוצהרות</dt><dd>' + esc(l.declaredBloc) + '</dd><dt>מקור מרכזי</dt><dd>' + srcLink(l.mainSource, 'אתר / מקור מרכזי') + '</dd>' +
      '<dt>עמדות שמבוססות על הצהרות</dt><dd>' + stars + ' מתוך 10 הסוגיות מסומנות <span class="star">*</span>' + basisBar(id) + '</dd></dl></div>' +
      '<div class="panel"><h2 style="margin-top:0">סקרים</h2><div class="kpis"><div class="kpi"><b>' + fmtN(s.avg) + '</b><span>ממוצע עדכני (' + s.n + ' סקרים, ' + fmtShort(D.computed.window[0]) + '–' + fmtShort(D.computed.window[1]) + ')</span></div>' +
      '<div class="kpi"><b>' + s.rng[0] + '–' + s.rng[1] + '</b><span>טווח באותם סקרים</span></div>' +
      '<div class="kpi"><b>' + s.pass + '/' + s.n + '</b><span>סקרים שבהם עוברת את החסימה</span></div>' +
      '<div class="kpi"><b>' + (D.documentBaseline.average[id] != null ? fmtN(D.documentBaseline.average[id]) : '—') + '</b><span>במסמך המקור (7 סקרים, 13–19.10)</span></div></div>' +
      '<div class="spark">' + sparkSvg(id, 600, 160) + '</div><p class="meta"><a href="#/polls">לכל נתוני הסקרים והשיטה</a></p></div></div>' +
      '<h2>העמדות ב-10 הסוגיות</h2>' + legendCompact(false) + '<div class="grid-pos two">' + P.issues.map(function (i) { return posBlock(id, i.id, 'issue'); }).join('') + '</div>' +
      '<h2>מקורות הרשימה</h2><ul class="srcs">' + l.sources.map(function (u) { return '<li>' + srcLink(u, u.replace(/^https?:\/\/(www\.)?/, '').slice(0, 60)) + '</li>'; }).join('') + '</ul>' +
      '<p><a class="btn" href="#/compare/' + id + '">השוואה עם רשימות אחרות</a></p>';
    return h;
  }

  function pageCompare(param, q) {
    var sel = (param || '').split(',').filter(function (x) { return LIST[x]; }).slice(0, 3);
    var iss = selIssues(q.issues);
    var h = head('השוואה', 'השוואה בין רשימות', 'בחרו 2 או 3 רשימות. העמדות מוצגות זו לצד זו, באותו סדר ובאותו מבנה לכל הרשימות.') + '<div class="toolbar panel tight">' + orderCtl() +
      '<fieldset><legend>בחירת רשימות (עד 3) – נבחרו ' + sel.length + '</legend><div class="chips" data-chips="cmp">' + orderedLists().map(function (l) {
        var on = sel.indexOf(l.id) >= 0, dis = !on && sel.length >= 3;
        return '<button type="button" class="chip" data-v="' + l.id + '" aria-pressed="' + on + '"' + (dis ? ' aria-disabled="true" title="אפשר לבחור עד 3 רשימות"' : '') + '>' + dot(l.id) + esc(l.tableName) + '</button>';
      }).join('') + '</div></fieldset>' + (sel.length >= 3 ? '<p class="meta" role="status">נבחרו 3 רשימות (המקסימום). כדי להחליף, בטלו בחירה של אחת מהן.</p>' : '') +
      issueChips(iss, 'cmpi') + '</div>' + legendCompact(false);
    if (sel.length < 2) return h + '<div class="empty" role="status"><svg viewBox="0 0 24 24" aria-hidden="true">' + ICON.compare + '</svg><b>' + (sel.length ? 'בחרו עוד רשימה אחת לפחות' : 'עדיין לא נבחרו רשימות') + '</b><p>בחרו לפחות שתי רשימות מהרשימה שלמעלה כדי להציג השוואה.</p></div>';
    var ids = sortIds(sel);
    h += '<div class="cmp-head" style="--n:' + ids.length + '" aria-hidden="true">' + ids.map(function (lid) { return '<div style="--c:' + COLOR[lid] + '">' + dot(lid) + esc(lname(lid)) + '</div>'; }).join('') + '</div>';
    h += '<div id="cmp">' + iss.map(function (iid) {
      return '<section class="cmp-issue"><h2><a href="#/issue/' + iid + '">' + ISS[iid].n + '. ' + esc(ISS[iid].title) + '</a></h2><div class="grid-cmp" style="--n:' + ids.length + '">' +
        ids.map(function (lid) { return posBlock(lid, iid, 'list'); }).join('') + '</div></section>';
    }).join('') + '</div>';
    return h;
  }

  function pageAnalysis(tab, q) {
    tab = tab || 'splits';
    var tabs = [['splits', 'קווי המחלוקת'], ['consensus', 'המכנה המשותף'], ['overlaps', 'חפיפות ועיקרון מול מידה'], ['codes', 'מטריצת קודים']];
    var h = head('ניתוח רוחבי', esc(A.title), '') + A.intro.map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('') +
      '<nav class="tabs" aria-label="חלקי הניתוח">' + tabs.map(function (t) { return '<a href="#/analysis/' + t[0] + '"' + (t[0] === tab ? ' aria-current="page"' : '') + '>' + t[1] + '</a>'; }).join('') + '</nav>' + (tab === 'codes' ? '' : hlSelect());
    if (tab === 'splits') {
      var iss = selIssues(q.issues);
      h += '<h2>דירוג הסוגיות לפי עומק המחלוקת</h2><p class="meta">1 = המחלוקת העמוקה ביותר. הדירוג נשען על שלושה מבחנים: עיקרון או מידה, מספר המחנות, ותנאים קואליציוניים סותרים.</p><ol class="rank">' +
        A.rank.map(function (r) { return '<li><span class="num" aria-hidden="true">' + r.rank + '</span><div><b>' + esc(r.label) + '</b> <span class="sr">מקום ' + r.rank + '</span><p>' + mark(r.text) + '</p><p class="meta">' + r.issues.map(function (i) { return '<a href="#/issue/' + i + '">' + esc(ISS[i].short) + '</a>'; }).join(' · ') + '</p></div></li>'; }).join('') + '</ol>' +
        '<h2>המחנות בכל סוגיה</h2>' + issueChips(iss, 'an') +
        A.camps.filter(function (c) { return iss.indexOf(c.issue) >= 0; }).map(function (c) {
          return '<section class="camp"><h3><a href="#/issue/' + c.issue + '">' + esc(c.title.replace(/:$/, '')) + '</a></h3>' + campList(c) + '</section>';
        }).join('') +
        '<h2>מחלוקות שחוצות את ציר ימין–שמאל</h2>' + items(A.crossAxis) +
        '<h2>קווי המחלוקת המרכזיים (סיכום ניטרלי מתוך המסמך)</h2><ul>' + P.mainSplits.map(function (s) { return '<li>' + mark(s) + '</li>'; }).join('') + '</ul>';
    } else if (tab === 'consensus') {
      h += '<h2>' + esc(A.headings.broad) + '</h2>' + items(A.consensusBroad) +
        '<h2>' + esc(A.headings.partial) + '</h2>' + items(A.consensusPartial);
    } else if (tab === 'overlaps') {
      h += '<h2>חפיפות בין גושים</h2><ul class="items" style="list-style:none;padding:0">' + A.overlaps.map(function (s) { return '<li class="card">' + mark(s) + '</li>'; }).join('') + '</ul>' +
        '<h2>מחלוקת על עיקרון מול מחלוקת על מידה</h2>' + items(A.principleVsDegree);
    } else {
      h += '<h2>מטריצה תמציתית (קודים קצרים)</h2><p class="note">' + esc(A.codeMatrixLegend) + '</p><p><a class="btn" href="#/matrix">פתיחה במטריצה האינטראקטיבית</a></p>';
      h += orderCtl() + legend(true) + matrixTable(P.issues.map(function (i) { return i.id; }), 'code');
    }
    return h;
  }
  function items(arr) {
    return '<div class="items">' + arr.map(function (x) { return '<div class="card">' + (x.label ? '<h3>' + mark(x.label) + '</h3>' : '') + '<p>' + mark(x.text) + '</p></div>'; }).join('') + '</div>';
  }

  // ---------- polls
  var BLOC_COL = { coalition: '#5b6475', opposition: '#6f6396', arab: '#3d7d7a', other: '#8a6f45' };
  function pollParties() { return D.parties.filter(function (p) { return !p.withdrawn; }).map(function (p) { return p.id; }); }
  function blocSum(avg, bid) { var b = D.blocs.filter(function (x) { return x.id === bid; })[0]; return b.members.reduce(function (s, m) { return s + (avg[m] || 0); }, 0); }
  function blocName(bid) { return D.blocs.filter(function (x) { return x.id === bid; })[0].name; }
  function blocShort(id) { return id === 'coalition' ? 'גוש הקואליציה היוצאת' : id === 'opposition' ? 'גוש האופוזיציה' : id === 'arab' ? 'רשימות ערביות' : 'רשימות אחרות'; }

  function sparkSvg(id, W, H, isBloc) {
    W = W || 260; H = H || 110;
    var tr = D.computed.trend, pad = { l: 26, r: 10, t: 10, b: 20 };
    var d0 = new Date(tr[0].date), d1 = new Date(tr[tr.length - 1].date), span = Math.max(1, d1 - d0);
    var vals = tr.map(function (t) { return isBloc ? blocSum(t.avg, id) : t.avg[id]; });
    var ymax = isBloc ? 70 : 35, ymin = 0, col = isBloc ? BLOC_COL[id] : COLOR[id];
    function x(d) { return pad.l + (new Date(d) - d0) / span * (W - pad.l - pad.r); }
    function y(v) { return pad.t + (1 - (v - ymin) / (ymax - ymin)) * (H - pad.t - pad.b); }
    var pts = tr.map(function (t, k) { return x(t.date).toFixed(1) + ',' + y(vals[k]).toFixed(1); }).join(' ');
    var area = 'M' + x(tr[0].date).toFixed(1) + ',' + y(0) + ' L' + pts.split(' ').join(' L') + ' L' + x(tr[tr.length - 1].date).toFixed(1) + ',' + y(0) + 'Z';
    var dots = isBloc ? '' : D.polls.filter(function (p) { return p.date >= tr[0].date; }).map(function (p) { return '<circle cx="' + x(p.date).toFixed(1) + '" cy="' + y(p.seats[id] || 0).toFixed(1) + '" r="1.9" fill="var(--ink3)" opacity=".55"/>'; }).join('');
    var grid = (isBloc ? [0, 20, 40, 61] : [0, 4, 10, 20, 30]).map(function (g) {
      return '<line x1="' + pad.l + '" x2="' + (W - pad.r) + '" y1="' + y(g) + '" y2="' + y(g) + '" stroke="' + (g === 61 ? 'var(--ink)' : g === 4 ? 'var(--warn)' : 'var(--line)') + '" stroke-width="' + (g === 61 ? 1.5 : 1) + '"' + (g === 4 ? ' stroke-dasharray="3 3"' : '') + '/>' + (g === 4 ? '' : '<text x="2" y="' + (y(g) + 4) + '">' + g + '</text>');
    }).join('');
    var first = vals[0], last = vals[vals.length - 1];
    var label = (isBloc ? blocName(id) : lname(id)) + ': ממוצע ' + fmtN(first) + ' ב-' + fmtDate(tr[0].date) + ', ' + fmtN(last) + ' ב-' + fmtDate(tr[tr.length - 1].date);
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(label) + '"><g class="axis">' + grid + '</g>' +
      '<path d="' + area + '" fill="' + col + '" opacity=".12"/>' + dots +
      '<polyline fill="none" stroke="' + col + '" stroke-width="2.4" stroke-linejoin="round" points="' + pts + '"/>' +
      '<circle cx="' + x(tr[tr.length - 1].date).toFixed(1) + '" cy="' + y(last).toFixed(1) + '" r="3.5" fill="' + col + '"/>' +
      '<g class="axis"><text x="' + pad.l + '" y="' + (H - 4) + '" text-anchor="start">' + fmtDate(tr[0].date) + '</text>' +
      '<text x="' + (W - pad.r) + '" y="' + (H - 4) + '" text-anchor="end">' + fmtDate(tr[tr.length - 1].date) + '</text></g></svg>';
  }

  var TR = null; // trend chart geometry for interaction
  function trendSvg(ids) {
    var tr = D.computed.trend, W = 900, H = 440, pad = { l: 34, r: 170, t: 14, b: 28 };
    var d0 = new Date(tr[0].date), d1 = new Date(tr[tr.length - 1].date), span = Math.max(1, d1 - d0);
    function x(d) { return pad.l + (new Date(d) - d0) / span * (W - pad.l - pad.r); }
    function y(v) { return pad.t + (1 - v / 32) * (H - pad.t - pad.b); }
    var grid = [0, 4, 8, 12, 16, 20, 24, 28, 32].map(function (g) { return '<line x1="' + pad.l + '" x2="' + (W - pad.r) + '" y1="' + y(g) + '" y2="' + y(g) + '"' + (g === 4 ? ' stroke="var(--warn)" stroke-dasharray="4 4"' : '') + '/><text x="' + (pad.l - 6) + '" y="' + (y(g) + 4) + '" text-anchor="end">' + g + '</text>'; }).join('');
    var ticks = [], step = Math.max(1, Math.round(tr.length / 6));
    for (var k = 0; k < tr.length; k += step) ticks.push(tr[k].date);
    var xt = ticks.map(function (d) { return '<text x="' + x(d) + '" y="' + (H - 8) + '" text-anchor="middle">' + fmtShort(d) + '</text>'; }).join('');
    var ends = ids.map(function (id) { return { id: id, v: tr[tr.length - 1].avg[id] || 0 }; }).sort(function (a, b) { return b.v - a.v; });
    var GAP = 16, lastY = -1e9; ends.forEach(function (e) { e.y = Math.max(y(e.v), lastY + GAP); lastY = e.y; });
    var lim = H - pad.b + 6; for (var q = ends.length - 1; q >= 0; q--) { if (ends[q].y > lim) ends[q].y = lim; lim = ends[q].y - GAP; }
    var lines = ids.map(function (id) {
      var pts = tr.map(function (t) { return x(t.date).toFixed(1) + ',' + y(t.avg[id] || 0).toFixed(1); }).join(' ');
      return '<polyline class="ln" data-l="' + id + '" stroke="' + COLOR[id] + '" points="' + pts + '"/>';
    }).join('');
    var labels = ends.map(function (e) { return '<path d="M' + (W - pad.r + 2) + ',' + y(e.v).toFixed(1) + ' L' + (W - pad.r + 10) + ',' + e.y.toFixed(1) + '" stroke="' + COLOR[e.id] + '" stroke-width="1.5" fill="none"/><circle cx="' + (W - pad.r + 15) + '" cy="' + e.y.toFixed(1) + '" r="4.5" fill="' + COLOR[e.id] + '"/><text class="ln-l" data-l="' + e.id + '" x="' + (W - pad.r + 24) + '" y="' + (e.y + 4.5) + '" fill="var(--ink)" style="font-weight:600;font-size:13px">' + esc(lname(e.id).replace(/ \(.*\)$/, '')) + ' ' + fmtN(e.v) + '</text>'; }).join('');
    TR = { W: W, H: H, pad: pad, x: x, y: y, ids: ids };
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" tabindex="0" aria-label="' + esc('מגמת ממוצע הסקרים לכל רשימה מ-' + fmtDate(tr[0].date) + ' עד ' + fmtDate(tr[tr.length - 1].date) + '. מקשי החצים מציגים את הערכים בכל תאריך. הנתונים המלאים בטבלה למטה.') + '">' +
      '<g class="axis">' + grid + xt + '</g>' + lines + labels +
      '<line id="xh" x1="0" x2="0" y1="' + pad.t + '" y2="' + (H - pad.b) + '" stroke="var(--ink)" stroke-width="1" opacity="0"/></svg>';
  }
  var trIdx = -1;
  function trendAt(k, cx, cy) {
    var tr = D.computed.trend; k = Math.max(0, Math.min(tr.length - 1, k)); trIdx = k;
    var t = tr[k], xh = document.getElementById('xh'); if (!xh) return;
    var px = TR.x(t.date); xh.setAttribute('x1', px); xh.setAttribute('x2', px); xh.setAttribute('opacity', '.35');
    var ids = TR.ids.slice().sort(function (a, b) { return (t.avg[b] || 0) - (t.avg[a] || 0); });
    var html = '<b>ממוצע ב-' + fmtDate(t.date) + '</b>' + ids.map(function (id) { return '<div class="r"><span class="lname">' + dot(id) + esc(lname(id).replace(/ \(.*\)$/, '')) + '</span><span>' + fmtN(t.avg[id] || 0) + '</span></div>'; }).join('');
    var svg = xh.ownerSVGElement, r = svg.getBoundingClientRect();
    showTip(html, cx != null ? cx : r.left + px / TR.W * r.width, cy != null ? cy : r.top + r.height * .3);
  }

  function pagePolls(q) {
    var c = D.computed, ids = sortIds(pollParties());
    var max = 35, inc = {}; c.included.forEach(function (x) { inc[x] = 1; });
    var win = D.polls.filter(function (p) { return inc[p.id]; });
    var bars = ids.map(function (id) {
      var a = c.average[id], r = c.range[id];
      var pts = win.map(function (p) { var v = p.seats[id] || 0; return '<span class="bar-pt" style="right:calc(' + (v / max * 100) + '% - 3px)"></span>'; }).join('');
      return '<div class="bar-row" style="--c:' + COLOR[id] + '" data-tip="' + esc('<b>' + esc(lname(id)) + '</b>ממוצע ' + fmtN(a) + ' · טווח ' + r[0] + '–' + r[1] + ' · עוברת את החסימה ב-' + c.passesIn[id] + ' מתוך ' + c.n + ' סקרים') + '"><span>' + dot(id) + (LIST[id] ? '<a href="#/list/' + id + '">' + esc(lname(id)) + '</a>' : esc(lname(id))) + '</span>' +
        '<span class="bar-track" aria-hidden="true"><span class="bar-fill" style="width:' + (a / max * 100) + '%"></span>' + pts + '<span class="bar-rng" style="right:' + (r[0] / max * 100) + '%;width:' + ((r[1] - r[0]) / max * 100) + '%"></span><span class="bar-thr" style="right:' + (4 / max * 100) + '%"></span></span>' +
        '<span class="bar-v">' + fmtN(a) + '<span class="sr"> מנדטים, טווח ' + r[0] + '–' + r[1] + '</span></span></div>';
    }).join('');
    var axis = '<div class="bar-row" aria-hidden="true"><span></span><span class="bar-axis">' + [0, 5, 10, 15, 20, 25, 30, 35].map(function (v) { return '<span style="right:' + (v / max * 100) + '%">' + v + '</span>'; }).join('') + '</span><span></span></div>';
    var blocs = D.blocs.map(function (b) { return { b: b, v: c.blocs.filter(function (x) { return x.id === b.id; })[0].avg }; });
    var BM = 70;
    var stack = '<div class="bars" role="list">' + blocs.map(function (x) {
      return '<div class="bar-row bloc" role="listitem" style="--c:' + BLOC_COL[x.b.id] + '" data-tip="' + esc('<b>' + esc(x.b.name) + '</b>' + fmtN(x.v) + ' מנדטים בממוצע') + '"><span>' + esc(blocShort(x.b.id)) + '</span><span class="bar-track" aria-hidden="true"><span class="bar-fill" style="width:' + (x.v / BM * 100) + '%"></span><span class="bar-61" style="right:' + (61 / BM * 100) + '%"></span></span><span class="bar-v">' + fmtN(x.v) + '<span class="sr"> מנדטים</span></span></div>';
    }).join('') + '<div class="bar-row" aria-hidden="true"><span></span><span class="bar-axis"><span style="right:0">0</span><span style="right:' + (30 / BM * 100) + '%">30</span><span style="right:' + (61 / BM * 100) + '%;font-weight:800;color:var(--ink)">61</span></span><span></span></div></div>' +
      '<p class="meta">כל גוש מוצג בפס נפרד באותו קנה מידה (0–70 מנדטים); הקו השחור מסמן 61 מנדטים, הרוב בכנסת. סדר הגושים קבוע ואינו משתנה לפי התוצאות. ההרכב: ' + D.blocs.map(function (b) { return esc(b.name); }).join('; ') + '.</p>';
    var outlets = []; D.polls.forEach(function (p) { if (outlets.indexOf(p.outlet) < 0) outlets.push(p.outlet); });
    outlets.sort(function (a, b) { return COLL.compare(a, b); });
    var of = q.outlet && outlets.indexOf(q.outlet) >= 0 ? q.outlet : '';
    var rows = D.polls.slice().sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : COLL.compare(a.outlet, b.outlet); }).filter(function (p) { return !of || p.outlet === of; });
    var tbl = '<div class="tbl-wrap" tabindex="0" role="region" aria-label="טבלת הסקרים, אפשר לגלול אופקית"><table class="tbl polls"><caption>' + rows.length + ' סקרים' + (of ? ' של ' + esc(of) : '') + ' · שורה מוצללת = נכללת בממוצע העדכני</caption><thead><tr><th scope="col">תאריך</th><th scope="col">כלי תקשורת</th><th scope="col">מכון הסקרים</th><th scope="col" class="n">מדגם</th>' +
      ids.map(function (id) { return '<th scope="col" class="n">' + esc(PARTY[id].name) + '</th>'; }).join('') +
      D.blocs.map(function (b) { return '<th scope="col" class="n">' + esc(b.id === 'coalition' ? 'גוש הקואליציה' : b.id === 'opposition' ? 'גוש האופוזיציה' : b.id === 'arab' ? 'רשימות ערביות' : 'אחרות') + '</th>'; }).join('') +
      '<th scope="col">מקור</th></tr></thead><tbody>' + rows.map(function (p) {
        return '<tr' + (inc[p.id] ? ' class="inwin"' : '') + '><td class="n">' + fmtDate(p.date) + (inc[p.id] ? '<span class="sr"> (בממוצע)</span>' : '') + '</td><td>' + esc(p.outlet) + '</td><td>' + esc(p.pollster) + '</td><td class="n">' + (p.sample || '—') + '</td>' +
          ids.map(function (id) { var v = p.seats[id]; return '<td class="n">' + (v == null ? '<span title="לא דווח / מתחת לחסימה">–</span>' : v) + '</td>'; }).join('') +
          D.blocs.map(function (b) { return '<td class="n">' + b.members.reduce(function (s, m) { return s + (p.seats[m] || 0); }, 0) + '</td>'; }).join('') +
          '<td>' + srcLink(p.url, 'פרסום') + (p.verified ? ' <span class="badge" title="' + esc(p.verifiedNote || 'נבדק') + '">✓ נבדק</span>' : '') + '</td></tr>';
      }).join('') + '</tbody></table></div>';
    var base = D.documentBaseline;
    var baseT = '<div class="tbl-wrap" tabindex="0" role="region" aria-label="השוואת ממוצעים"><table class="tbl"><caption>השוואה: ממוצע המסמך מול הממוצע העדכני</caption><thead><tr><th scope="col">רשימה</th><th scope="col" class="n">במסמך (13–19.10, 7 סקרים)</th><th scope="col" class="n">עדכני (' + fmtDate(c.window[0]) + '–' + fmtDate(c.window[1]) + ', ' + c.n + ' סקרים)</th><th scope="col" class="n">הפרש</th></tr></thead><tbody>' +
      ids.filter(function (id) { return base.average[id] != null; }).map(function (id) { var d = c.average[id] - base.average[id]; return '<tr><td>' + esc(lname(id)) + '</td><td class="n">' + fmtN(base.average[id]) + '</td><td class="n">' + fmtN(c.average[id]) + '</td><td class="n ltr">' + (d > 0 ? '+' : '') + fmtN(d) + '</td></tr>'; }).join('') + '</tbody></table></div>';
    var t = c.trend;
    return head('סקרים', 'סקרי מנדטים', 'ממוצע הסקרים העדכני, הטווח בין המכונים, סכומי הגושים מול קו 61, והמגמה לאורך זמן. סקרים אינם תחזית.') +
      '<div class="kpis"><div class="kpi big"><b>' + fmtShort(c.asOf) + '</b><span>הסקר האחרון</span></div><div class="kpi"><b>' + D.polls.length + '</b><span>סקרים במאגר, מ-' + fmtDate(D.polls.reduce(function (m, p) { return p.date < m ? p.date : m; }, '9999')) + '</span></div><div class="kpi"><b>' + c.n + '</b><span>סקרים בממוצע העדכני (' + fmtShort(c.window[0]) + '–' + fmtShort(c.window[1]) + ')</span></div><div class="kpi"><b class="stamp">' + fmtStamp(D.meta.updatedAt) + '</b><span>עדכון אחרון</span></div></div>' +
      '<details class="note method"><summary><b>שיטת החישוב:</b> ממוצע פשוט של הסקר האחרון של כל כלי תקשורת ב-7 ימים</summary><p>' + esc(D.method.text) + ' ' + esc(D.meta.threshold) + '</p></details>' +
      '<p class="note warn">סקרים אינם תחזית. יש פערים גדולים בין המכונים (למשל הליכוד: ' + c.range.likud[0] + '–' + c.range.likud[1] + ' מנדטים בחלון הנוכחי). ' + esc(D.meta.silence) + '</p>' +
      orderCtl() +
      '<section class="chart" aria-labelledby="h-bars"><div class="chart-head"><h2 id="h-bars">ממוצע מנדטים לכל רשימה</h2><span class="meta">' + c.n + ' סקרים, ' + fmtDate(c.window[0]) + '–' + fmtDate(c.window[1]) + '</span></div>' +
      '<p class="meta">הפס = הממוצע; הנקודות = הסקרים הבודדים שבממוצע; הקו השחור = הטווח (מינימום–מקסימום); הקו המקווקו = 4 מנדטים (המינימום לרשימה שעוברת את אחוז החסימה).</p><div class="bars">' + bars + axis + '</div>' +
      '<details><summary>הנתונים כטבלה</summary><div class="tbl-wrap" tabindex="0" role="region" aria-label="טבלת הממוצעים"><table class="tbl"><thead><tr><th scope="col">רשימה</th><th scope="col" class="n">ממוצע</th><th scope="col" class="n">טווח</th><th scope="col" class="n">עוברת בסקרים</th></tr></thead><tbody>' +
      ids.map(function (id) { return '<tr><td>' + esc(lname(id)) + '</td><td class="n">' + fmtN(c.average[id]) + '</td><td class="n">' + c.range[id][0] + '–' + c.range[id][1] + '</td><td class="n">' + c.passesIn[id] + '/' + c.n + '</td></tr>'; }).join('') + '</tbody></table></div></details></section>' +
      '<section class="chart" aria-labelledby="h-blocs"><div class="chart-head"><h2 id="h-blocs">סכומי הגושים וקו 61</h2></div>' + stack +
      '<p class="note">' + esc(D.blocNote) + ' לפי הממוצע, ' + (blocs.some(function (x) { return x.v >= 61; }) ? 'גוש אחד מגיע ל-61 מנדטים.' : 'אף גוש אינו מגיע ל-61 מנדטים.') + ' בסקרים בודדים התמונה שונה – ראו את עמודות הגושים בטבלה.</p></section>' +
      '<section class="chart trend" id="trend" aria-labelledby="h-trend"><div class="chart-head"><h2 id="h-trend">מגמה לאורך זמן</h2><span class="meta">' + fmtDate(t[0].date) + ' → ' + fmtDate(t[t.length - 1].date) + '</span></div>' +
      '<p class="meta">ממוצע מתגלגל באותה שיטה, לכל תאריך שבו פורסם סקר. ציר הזמן משמאל (מוקדם) לימין (מאוחר). ריחוף או מקשי החצים מציגים את הערכים; לחיצה על שם רשימה מדגישה את הקו שלה.</p>' +
      trendSvg(ids) + '<div class="trend-legend" role="group" aria-label="הדגשת קו">' + ids.map(function (id) { return '<button type="button" data-trend="' + id + '" aria-pressed="false">' + dot(id) + esc(lname(id).replace(/ \(.*\)$/, '')) + '</button>'; }).join('') + '</div></section>' +
      '<h3>כל רשימה בנפרד</h3><p class="meta">אותו קנה מידה בכל הגרפים (0–35). הקו = הממוצע המתגלגל; הנקודות = סקרים בודדים; הקו המקווקו = 4 מנדטים.</p>' +
      '<div class="multi">' + ids.map(function (id) { return '<div class="spark"><h3><span class="lname">' + dot(id) + esc(lname(id)) + '</span><span class="ltr">' + fmtN(t[0].avg[id]) + ' → ' + fmtN(t[t.length - 1].avg[id]) + '</span></h3>' + sparkSvg(id) + '</div>'; }).join('') + '</div>' +
      '<h3>מגמת הגושים</h3><div class="multi">' + D.blocs.map(function (b) { return '<div class="spark"><h3><span>' + esc(blocShort(b.id)) + '</span><span class="ltr">' + fmtN(blocSum(t[0].avg, b.id)) + ' → ' + fmtN(blocSum(t[t.length - 1].avg, b.id)) + '</span></h3>' + sparkSvg(b.id, 260, 110, true) + '</div>'; }).join('') + '</div>' +
      '<h2>כל הסקרים</h2><label class="controls">סינון לפי כלי תקשורת: <select id="outlet"><option value="">כל כלי התקשורת</option>' + outlets.map(function (o) { return '<option' + (o === of ? ' selected' : '') + '>' + esc(o) + '</option>'; }).join('') + '</select></label>' +
      '<p class="meta">"–" = הרשימה לא דווחה בסקר או דווחה רק באחוזים, מתחת לאחוז החסימה (נספרת כ-0). התאריך הוא תאריך הסקר כפי שמופיע במקור המעקב (ברוב המקרים יום עבודת השטח). ' + esc(PARTY.bw.note) + ' בכל הסקרים מאז 9.9.2026 היא לא עברה את אחוז החסימה, ולכן אינה מוצגת. הרשימה המשותפת (חד"ש, תע"ל ובל"ד) מופיעה בכל הסקרים כרשימה אחת.</p>' + tbl +
      '<h2>בדיקת נתוני המסמך</h2><p>' + esc(base.text) + '</p><p class="note">' + esc(base.verification) + '</p>' + baseT +
      '<h2>מקורות הסקרים</h2><ul class="srcs"><li>' + srcLink(D.meta.primarySource.url, D.meta.primarySource.label) + '</li>' + D.meta.crossCheck.map(function (s) { return '<li>' + srcLink(s.url, s.label) + '</li>'; }).join('') + '</ul><p class="meta">' + esc(D.meta.scope) + ' לכל סקר בטבלה יש קישור לפרסום המקורי. עדכון אחרון של נתוני הסקרים: ' + fmtStamp(D.meta.updatedAt) + '.</p>';
  }

  function pageAbout() {
    var joint = LIST.joint;
    return head('שיטה ומקורות', 'שיטה, ניטרליות ומקורות', '') +
      '<h2>עקרונות</h2><div class="principles"><div><b>בלי המלצה</b><p>אין באתר המלצה להצבעה, אין שאלון התאמה ואין ציון לעמדות.</p></div><div><b>במסגור הרשימה</b><p>כל עמדה מוצגת במסגור של הרשימה עצמה, ככל האפשר בלשונה, עם סוג המקור וקישור.</p></div><div><b>יחס שווה</b><p>כל הרשימות מוצגות באותו מבנה ובאותו סדר בכל העמודים. ' + esc(orderNote()) + '</p></div><div><b>צבעים ניטרליים</b><p>צבעי הרשימות עמומים ונקבעים לפי סדר האלף-בית של שמות הרשימות, ולא לפי צבעי המפלגות. החלוקה לגושים מבוססת על הצהרות הרשימות.</p></div></div>' + legend(true) +
      '<h2>שיטת המסמך</h2>' + P.meta.intro.map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('') +
      '<p class="note"><b>בדיקת הרשימה המשותפת.</b> ' + esc(joint.verify.text) + ' ' + joint.verify.sources.map(function (u, k) { return srcLink(u, 'מקור ' + (k + 1)); }).join(' · ') + '</p>' +
      '<h2>פערים ואי-ודאויות</h2><ul>' + P.gaps.map(function (g) { return '<li>' + esc(g) + '</li>'; }).join('') + '</ul>' +
      '<h2>מקורות כלליים</h2><ul class="srcs">' + P.generalSources.map(function (s) { return '<li>' + (s.url ? srcLink(s.url, s.label) : esc(s.label)) + '</li>'; }).join('') + '</ul>' +
      '<p>המקורות של כל רשימה מופיעים בעמוד הפרופיל שלה, ומקור לכל עמדה מופיע לצדה.</p>' +
      '<h2>איך מתעדכנים הנתונים</h2><p>כל התוכן נמצא בקבצי נתונים: <a href="data/platforms.json">platforms.json</a> (רשימות, סוגיות ועמדות), <a href="data/analysis.json">analysis.json</a> (ניתוח רוחבי) ו-<a href="data/polls.json">polls.json</a> (סקרים). הקבצים נבנים מ-source/platforms.md ומ-source/additions.json. עדכון נעשה בקבצים האלה בלבד. סקר חדש נוסף בעזרת הסקריפט tools/update_polls.py, שמחשב מחדש את הממוצע, את סכומי הגושים ואת המגמה. התיעוד המלא נמצא ב-<a href="' + REPO + '#readme" target="_blank" rel="noopener noreferrer">מאגר הקוד<span class="sr"> (נפתח בחלון חדש)</span></a>.</p>' +
      '<h2>חותמות זמן</h2><ul><li>העמדות נכונות ל-' + fmtDate(P.meta.documentAsOf) + '.</li><li>קובצי הנתונים של המצעים נוצרו ב-' + fmtStamp(P.meta.generatedAt) + ' (מזהה גרסת המקור: <span class="ltr">' + esc(P.meta.sourceSha1) + '</span>).</li><li>נתוני הסקרים עודכנו ב-' + fmtStamp(D.meta.updatedAt) + '; הסקר האחרון מ-' + fmtDate(D.meta.latestPollDate) + '.</li></ul>' +
      '<h2>עיצוב ונגישות</h2><p>גופן Heebo (רישיון SIL OFL, מאוחסן באתר), מצב בהיר וכהה, ניגודיות AA, יעדי מגע של 48 פיקסלים לפחות, ניווט מלא במקלדת, וטבלה לכל גרף.</p>';
  }

  function foot() {
    document.getElementById('foot').innerHTML =
      '<p><b>אתר מידע ניטרלי.</b> אין בו המלצה להצבעה. העמדות נכונות ל-' + fmtDate(P.meta.documentAsOf) + '; הסקרים עודכנו ב-' + fmtStamp(D.meta.updatedAt) + ' (סקר אחרון: ' + fmtDate(D.meta.latestPollDate) + ', ' + D.polls.length + ' סקרים).</p>' +
      '<p><a href="#/about">שיטה ומקורות</a> · <a href="data/platforms.json">platforms.json</a> · <a href="data/analysis.json">analysis.json</a> · <a href="data/polls.json">polls.json</a> · <a href="' + REPO + '" target="_blank" rel="noopener noreferrer">קוד המקור<span class="sr"> (נפתח בחלון חדש)</span></a></p>';
  }

  // ---------- router
  function parseHash() {
    var h = location.hash.replace(/^#\/?/, ''), qs = {}, qi = h.indexOf('?');
    if (qi >= 0) { h.slice(qi + 1).split('&').forEach(function (kv) { var p = kv.split('='); if (p[0]) qs[decodeURIComponent(p[0])] = decodeURIComponent(p[1] || ''); }); h = h.slice(0, qi); }
    var parts = h.split('/').filter(Boolean);
    return { page: parts[0] || 'home', arg: parts[1] ? decodeURIComponent(parts[1]) : '', q: qs };
  }
  var TITLES = { home: 'ראשי', matrix: 'מטריצה', issue: 'לפי סוגיה', list: 'לפי רשימה', compare: 'השוואה', analysis: 'ניתוח רוחבי', polls: 'סקרים', about: 'שיטה ומקורות' };
  var lastPage = null;
  function render(keepScroll) {
    var r = parseHash(), html, sub = '';
    hideTip();
    switch (r.page) {
      case 'matrix': html = pageMatrix(r.q); break;
      case 'issue': html = pageIssue(r.arg); if (ISS[r.arg]) sub = ISS[r.arg].short; break;
      case 'list': html = pageList(r.arg); if (LIST[r.arg]) sub = LIST[r.arg].tableName; break;
      case 'compare': html = pageCompare(r.arg, r.q); break;
      case 'analysis': html = pageAnalysis(r.arg, r.q); break;
      case 'polls': html = pagePolls(r.q); break;
      case 'about': html = pageAbout(); break;
      default: r.page = 'home'; html = pageHome();
    }
    $main.innerHTML = html;
    var hc = document.getElementById('hlcount');
    if (hc && state.hl) { var nOn = $main.querySelectorAll('mark.m.on').length; hc.textContent = nOn === 1 ? 'אזכור אחד מודגש בעמוד זה' : nOn ? nOn + ' אזכורים מודגשים בעמוד זה' : 'אין אזכורים של הרשימה בעמוד זה'; }
    document.title = (sub ? sub + ' – ' : '') + TITLES[r.page] + ' | השוואת מצעים – בחירות 2026';
    document.querySelectorAll('[data-nav]').forEach(function (a) { if (a.getAttribute('data-nav') === r.page) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    var cur = document.querySelector('[data-nav][aria-current]'), nv = cur && cur.closest('.nav');
    if (cur && nv) requestAnimationFrame(function () { setTimeout(function () { if (nv.scrollWidth > nv.clientWidth) { var nr = nv.getBoundingClientRect(), cr = cur.getBoundingClientRect(); nv.scrollLeft += (cr.left + cr.width / 2) - (nr.left + nr.width / 2); } }, 0); });
    var key = r.page + '/' + r.arg;
    if (!keepScroll && lastPage !== null && key !== lastPage) { window.scrollTo(0, 0); $main.focus({ preventScroll: true }); }
    lastPage = key;
  }
  function setHash(h) { if (location.hash === h) render(true); else { history.replaceState(null, '', h); render(true); } }
  function curQ() { return parseHash(); }
  function withIssues(r, list) {
    var base = '#/' + r.page + (r.arg ? '/' + r.arg : '');
    var q = Object.assign({}, r.q); if (list && list.length && list.length < 10) q.issues = list.join(','); else delete q.issues;
    var s = Object.keys(q).map(function (k) { return k + '=' + encodeURIComponent(q[k]); }).join('&');
    return base + (s ? '?' + s : '');
  }

  // ---------- chart interactions (hemicycle, bars, trend)
  function arcFocus(id) {
    var arc = document.getElementById('arc'); if (!arc) return;
    arc.classList.toggle('dim', !!id);
    arc.querySelectorAll('circle').forEach(function (c) { c.classList.toggle('on', c.getAttribute('data-l') === id); });
  }
  var trendSel = '';
  function trendFocus(id) {
    var tw = document.getElementById('trend'); if (!tw) return;
    tw.classList.toggle('focus', !!id);
    tw.querySelectorAll('.ln').forEach(function (l) { l.classList.toggle('on', l.getAttribute('data-l') === id); });
    tw.querySelectorAll('[data-trend]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-trend') === id)); });
  }
  function closest(e, sel) { return e.target && e.target.closest ? e.target.closest(sel) : null; }
  $main.addEventListener('pointerover', function (e) {
    var a = closest(e, '[data-arc],#arc circle');
    if (a) {
      var id = a.getAttribute('data-arc') || a.getAttribute('data-l'); arcFocus(id);
      if (a.tagName.toLowerCase() === 'circle') { var s = allocSeats(); showTip('<b>' + esc(lname(id)) + '</b>' + s[id] + ' מושבים בהמחשה · ממוצע ' + fmtN(avgOf(id)), e.clientX, e.clientY); }
      return;
    }
    var b = closest(e, '[data-tip]');
    if (b) { var r = b.getBoundingClientRect(); showTip(b.getAttribute('data-tip'), Math.min(Math.max(e.clientX, r.left), r.right), r.top + 4); }
  });
  $main.addEventListener('pointerout', function (e) {
    var to = e.relatedTarget && e.relatedTarget.closest ? e.relatedTarget : null;
    if (closest(e, '[data-arc],#arc')) { if (!(to && to.closest('[data-arc],#arc circle'))) { arcFocus(''); hideTip(); } }
    else if (closest(e, '[data-tip]') && !(to && to.closest('[data-tip]'))) hideTip();
    if (closest(e, '#trend svg') && !(to && to.closest('#trend svg'))) { hideTip(); var xh = document.getElementById('xh'); if (xh) xh.setAttribute('opacity', '0'); }
  });
  $main.addEventListener('focusin', function (e) { var a = closest(e, '[data-arc]'); if (a) arcFocus(a.getAttribute('data-arc')); });
  $main.addEventListener('focusout', function (e) {
    if (closest(e, '[data-arc]')) arcFocus('');
    if (closest(e, '#trend svg')) { hideTip(); var xh = document.getElementById('xh'); if (xh) xh.setAttribute('opacity', '0'); }
  });
  $main.addEventListener('pointermove', function (e) {
    var svg = closest(e, '#trend svg'); if (!svg || !TR) return;
    var r = svg.getBoundingClientRect(), vx = (e.clientX - r.left) / r.width * TR.W, tr = D.computed.trend, best = 0, bd = 1e9;
    tr.forEach(function (t, k) { var d = Math.abs(TR.x(t.date) - vx); if (d < bd) { bd = d; best = k; } });
    trendAt(best, e.clientX, e.clientY);
  });
  $main.addEventListener('keydown', function (e) {
    if (!closest(e, '#trend svg')) return;
    var n = D.computed.trend.length;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); trendAt(trIdx < 0 ? n - 1 : trIdx - 1); }
    else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); trendAt(trIdx < 0 ? n - 1 : trIdx + 1); }
    else if (e.key === 'Home') { e.preventDefault(); trendAt(0); } else if (e.key === 'End') { e.preventDefault(); trendAt(n - 1); }
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') hideTip(); });
  window.addEventListener('scroll', hideTip, { passive: true });

  $main.addEventListener('click', function (e) {
    var t = e.target.closest('button'); if (!t) return;
    if (t.hasAttribute('data-cell')) { var p = t.getAttribute('data-cell').split('|'); openCell(p[0], p[1]); return; }
    if (t.hasAttribute('data-order')) { state.order = t.getAttribute('data-order'); store.set('order', state.order); render(true); foot(); var ob = $main.querySelector('[data-order="' + state.order + '"]'); if (ob) ob.focus(); return; }
    if (t.hasAttribute('data-mx')) { state.mxMode = t.getAttribute('data-mx'); store.set('mxMode', state.mxMode); render(true); var mb = $main.querySelector('[data-mx="' + state.mxMode + '"]'); if (mb) mb.focus(); return; }
    if (t.hasAttribute('data-arc')) { location.hash = '#/list/' + t.getAttribute('data-arc'); return; }
    if (t.hasAttribute('data-trend')) { var id = t.getAttribute('data-trend'); trendSel = trendSel === id ? '' : id; trendFocus(trendSel); return; }
    var chips = t.parentNode && t.parentNode.getAttribute('data-chips');
    if (chips) {
      var r = curQ();
      if (chips === 'cmp') {
        if (t.getAttribute('aria-disabled') === 'true') return;
        var sel = (r.arg || '').split(',').filter(function (x) { return LIST[x]; }), v = t.getAttribute('data-v'), k = sel.indexOf(v);
        if (k >= 0) sel.splice(k, 1); else if (sel.length < 3) sel.push(v);
        r.arg = sel.join(','); setHash(withIssues(r, r.q.issues ? r.q.issues.split(',') : null));
        var b = $main.querySelector('[data-chips="cmp"] [data-v="' + v + '"]'); if (b) b.focus();
        return;
      }
      var cur = r.q.issues ? r.q.issues.split(',') : [];
      if (t.hasAttribute('data-all')) cur = [];
      else { var iv = t.getAttribute('data-v'), j = cur.indexOf(iv); if (j >= 0) cur.splice(j, 1); else cur.push(iv); }
      cur = P.issues.map(function (i) { return i.id; }).filter(function (i) { return cur.indexOf(i) >= 0; });
      setHash(withIssues(r, cur));
      var fb = $main.querySelector('[data-chips="' + chips + '"] ' + (t.hasAttribute('data-all') ? '[data-all]' : '[data-v="' + t.getAttribute('data-v') + '"]')); if (fb) fb.focus();
    }
  });
  $main.addEventListener('change', function (e) {
    var t = e.target;
    if (t.id === 'goissue') location.hash = '#/issue/' + t.value;
    else if (t.id === 'golist') location.hash = '#/list/' + t.value;
    else if (t.id === 'hl' || t.id === 'hlrow') { state.hl = t.value; render(true); var el = document.getElementById(t.id); if (el) el.focus(); }
    else if (t.id === 'outlet') { setHash('#/polls' + (t.value ? '?outlet=' + encodeURIComponent(t.value) : '')); var o = document.getElementById('outlet'); if (o) o.focus(); }
  });
  window.addEventListener('hashchange', function () { if (dlg.open) dlg.close(); trendSel = ''; render(false); });

  function getJSON(u) { return fetch(u, { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error(u + ' ' + r.status); return r.json(); }); }
  Promise.all([getJSON('data/platforms.json'), getJSON('data/analysis.json'), getJSON('data/polls.json')]).then(function (res) {
    P = res[0]; A = res[1]; D = res[2];
    LIST = byId(P.lists); ISS = byId(P.issues); PARTY = byId(D.parties);
    assignColors(); buildMentions(); render(false); foot();
  }).catch(function (err) {
    $main.innerHTML = '<div class="empty" role="alert"><b>שגיאה בטעינת הנתונים</b><p>' + esc(err.message) + '. נסו לרענן את הדף.</p></div>';
  });
  if ('serviceWorker' in navigator && location.protocol === 'https:') { navigator.serviceWorker.register('sw.js').catch(function () {}); }
})();
