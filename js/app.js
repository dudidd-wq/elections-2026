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
    podcasts: '<rect x="9" y="3" width="6" height="11" rx="3" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M6 11a6 6 0 0 0 12 0M12 17v4M9 21h6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
    coalition: '<path d="M3 19a9 9 0 0 1 18 0" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M12 6v13" stroke="currentColor" stroke-width="1.8" stroke-dasharray="2 2.2"/><circle cx="7" cy="15" r="1.6" fill="currentColor"/><circle cx="17" cy="15" r="1.6" fill="currentColor"/>',
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
      '<div class="controls"><a class="btn" href="#/matrix">למטריצת העמדות</a><a class="btn sec" href="#/compare">השוואה בין רשימות</a></div>' +
      '<p class="pod-clip hero-clip"><a href="clip-site/"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>סרטון קצר: מה מצאנו באתר (כדקה וחצי)</a></p>' + asOfLine() + '</div>' +
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
      card('#/coalition', 'בנה קואליציה', 'בחירת רשימות, הערכת מנדטים מול קו 61 והשוואה מתמטית של העמדות המוצהרות בכל סוגיה. לא תחזית ולא המלצה.', 'coalition') +
      card('#/exit-polls', 'מדגמים: דיוק בעבר', 'עד כמה דייקו מדגמי הטלוויזיה בערב הבחירות ב-2019–2022, מול התוצאות הרשמיות. בלי תחזית.', 'polls') +
      card('#/outlook', 'תחזית והקשר היסטורי', 'הערכה סטטיסטית של התוצאה הסופית אחרי ספירת המעטפות הכפולות, טווחי מושבים, והשוואה ל-2019–2022. לא תוצאה רשמית.', 'polls') +
      card('#/geo', 'תוצאות לפי יישוב וקלפי', 'אחוז ההצבעה ולמי הצביעו בכל יישוב ובכל קלפי, בחמש המערכות של 2019–2022. התוצאות הרשמיות של ועדת הבחירות.', 'analysis') +
      card('#/podcasts', 'פודקאסטים וראיונות', 'מה אמרו ראשי הרשימות בפודקאסטים ובראיונות ארוכים בחודש שלפני הבחירות, עם קישורים וציטוטים מאומתים.', 'podcasts') +
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
      '<h2>בונה הקואליציה</h2><p>בעמוד <a href="#/coalition">בנה קואליציה</a> יש מדד קרבה שמשווה את העמדות המוצהרות של רשימות זו לזו, לפי הקידוד של הניתוח הרוחבי. הוא לא מדרג עמדות, לא תחזית ולא המלצה, ואינו מתחשב בהצהרות על שותפויות. השיטה, הקידוד המלא והמגבלות מפורטים בעמוד עצמו.</p>' +
      '<h2>דיוק המדגמים בעבר</h2><p>בעמוד <a href="#/exit-polls">מדגמים: דיוק בעבר</a> מושווים מדגמי הטלוויזיה של ערב הבחירות ב-2019–2022 לתוצאות הרשמיות של ועדת הבחירות המרכזית, עם מקור לכל מדגם, הנוסחאות והמגבלות. העמוד לא מנבא את תוצאות 2026.</p>' +
      '<h2>תוצאות לפי יישוב וקלפי</h2><p>בעמוד <a href="#/geo">תוצאות לפי יישוב וקלפי</a> מוצגים אחוז ההצבעה ושיעור הקולות של כל רשימה בכל יישוב ובכל קלפי, בחמש מערכות הבחירות של 2019–2022. הנתונים הם קובצי תוצאות האמת של ועדת הבחירות המרכזית (data.gov.il), והסכומים נבדקו מול התוצאות הארציות הרשמיות.</p>' +
      '<h2>פערים ואי-ודאויות</h2><ul>' + P.gaps.map(function (g) { return '<li>' + esc(g) + '</li>'; }).join('') + '</ul>' +
      '<h2>מקורות כלליים</h2><ul class="srcs">' + P.generalSources.map(function (s) { return '<li>' + (s.url ? srcLink(s.url, s.label) : esc(s.label)) + '</li>'; }).join('') + '</ul>' +
      '<p>המקורות של כל רשימה מופיעים בעמוד הפרופיל שלה, ומקור לכל עמדה מופיע לצדה.</p>' +
      '<h2>איך מתעדכנים הנתונים</h2><p>כל התוכן נמצא בקבצי נתונים: <a href="data/platforms.json">platforms.json</a> (רשימות, סוגיות ועמדות), <a href="data/analysis.json">analysis.json</a> (ניתוח רוחבי), <a href="data/polls.json">polls.json</a> (סקרים) ו-<a href="data/podcasts.json">podcasts.json</a> (פודקאסטים וראיונות; נבנה בנפרד ממסמך המחקר על הופעות ראשי הרשימות ואינו מושפע מעדכון הסקרים). הקבצים נבנים מ-source/platforms.md ומ-source/additions.json. עדכון נעשה בקבצים האלה בלבד. סקר חדש נוסף בעזרת הסקריפט tools/update_polls.py, שמחשב מחדש את הממוצע, את סכומי הגושים ואת המגמה. התיעוד המלא נמצא ב-<a href="' + REPO + '#readme" target="_blank" rel="noopener noreferrer">מאגר הקוד<span class="sr"> (נפתח בחלון חדש)</span></a>.</p>' +
      '<h2>חותמות זמן</h2><ul><li>העמדות נכונות ל-' + fmtDate(P.meta.documentAsOf) + '.</li><li>קובצי הנתונים של המצעים נוצרו ב-' + fmtStamp(P.meta.generatedAt) + ' (מזהה גרסת המקור: <span class="ltr">' + esc(P.meta.sourceSha1) + '</span>).</li><li>נתוני הסקרים עודכנו ב-' + fmtStamp(D.meta.updatedAt) + '; הסקר האחרון מ-' + fmtDate(D.meta.latestPollDate) + '.</li></ul>' +
      '<h2>עיצוב ונגישות</h2><p>גופן Heebo (רישיון SIL OFL, מאוחסן באתר), מצב בהיר וכהה, ניגודיות AA, יעדי מגע של 48 פיקסלים לפחות, ניווט מלא במקלדת, וטבלה לכל גרף.</p>';
  }

  // ---------- podcasts & long interviews (data/podcasts.json, loaded on demand)
  var PD = null, PDerr = '';
  function loadPodcasts() {
    return getJSON('data/podcasts.json').then(function (d) { PD = d; }).catch(function (e) { PDerr = e.message; });
  }
  function podLang(t) { return /[\u0600-\u06FF]/.test(t) ? ' lang="ar" dir="rtl"' : (/[A-Za-z]/.test(t) && !/[\u0590-\u05FF]/.test(t) ? ' lang="en" dir="ltr"' : ''); }
  function podItem(it) {
    var meta = [fmtDate(it.date) + (it.dateNote ? ' (' + it.dateNote + ')' : ''), it.host, it.outlet, it.type, 'אורך: ' + it.length, 'שפה: ' + it.lang];
    var tags = '<span class="ptag aud">' + esc(it.audience) + '</span>' + it.topics.map(function (t) { return '<span class="ptag iss"><span class="sr">סוגיה: </span>' + esc(ISS[t].short) + '</span>'; }).join('');
    var pts = '<div class="pod-pts"><p class="pod-lab">עיקרי הדברים <span class="kind para">פרפרזה</span></p><ul>' + it.points.map(function (p) { return '<li>' + esc(p) + '</li>'; }).join('') + '</ul></div>';
    var qs = it.quotes.map(function (q) {
      return '<figure class="pq"><blockquote' + podLang(q.text) + '>„' + esc(q.text) + '”</blockquote><figcaption><span class="kind quote">ציטוט מאומת</span> ' + esc(q.verified_by) + (q.ts ? ' · <span class="ltr">' + esc(q.ts) + '</span>' : '') + ' · ' + srcLink(q.source_url, 'מקור הציטוט') + '</figcaption></figure>';
    }).join('');
    var src = '<div class="src">' + srcLink(it.url, 'להאזנה או לצפייה') + it.also.map(function (u, k) { return srcLink(u, 'מקור נוסף' + (it.also.length > 1 ? ' ' + (k + 1) : '')); }).join('') + '</div>';
    return '<article class="pod" id="pi-' + esc(it.id) + '"><h3>' + esc(it.show) + '</h3><p class="pod-meta">' + meta.map(esc).join(' · ') + '</p><p class="ptags">' + tags + '</p>' + pts + qs + (it.note ? '<p class="meta">הערה: ' + esc(it.note) + '</p>' : '') + src + '</article>';
  }
  function pageNotFoundPod() { return '<div class="empty" role="alert"><b>לא ניתן לטעון את נתוני הפודקאסטים</b><p>' + esc(PDerr) + '. נסו לרענן את הדף.</p></div>'; }
  function pagePodcasts(arg, q) {
    if (!PD) return PDerr ? pageNotFoundPod() : '<div class="skel" aria-hidden="true"><i></i><i></i><i></i></div><p class="sr" role="status">טוען…</p>';
    var fi = q.issue && ISS[q.issue] ? q.issue : '';
    var lists = PD.lists.filter(function (l) { return LIST[l.id]; }).sort(function (a, b) { return COLL.compare(LIST[a.id].tableName, LIST[b.id].tableName); });
    var shown = 0;
    var secs = lists.map(function (l) {
      var its = l.items.filter(function (it) { return !fi || it.topics.indexOf(fi) >= 0; }).sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
      shown += its.length;
      var cmp = l.compare.filter(function (c) { return !fi || c.issue === fi; });
      var n = l.items.length;
      return '<section class="pod-list" id="pl-' + l.id + '" aria-labelledby="plh-' + l.id + '"><h2 id="plh-' + l.id + '"><a href="#/list/' + l.id + '">' + esc(LIST[l.id].tableName) + '</a> <span class="pod-leader">' + esc(l.leader) + '</span></h2>' +
        '<p class="meta">' + (n === 1 ? 'הופעה אחת' : n + ' הופעות') + ' בחלון הסקירה' + (fi ? ' · מוצגות ' + its.length + ' בסוגיה הנבחרת' : '') + '</p>' +
        (n === 0 ? '<p class="note">לא נמצאו הופעות ארוכות של ראש הרשימה בחלון הסקירה.</p>' : its.length ? '<div class="pod-grid">' + its.map(podItem).join('') + '</div>' : '<p class="meta">אין הופעות שעסקו בסוגיה הנבחרת.</p>') +
        (cmp.length ? '<div class="pod-cmp"><h3>השוואה לעמדות באתר</h3><ul>' + cmp.map(function (c) {
          return '<li><span class="kind cmpk">' + esc(c.kind) + '</span> <a href="#/issue/' + c.issue + '">' + esc(ISS[c.issue].short) + '</a>: ' + esc(c.text) + ' <span class="meta">(' + c.items.map(function (iid) { var it = l.items.filter(function (x) { return x.id === iid; })[0]; return it ? esc(it.show) + ', ' + fmtShort(it.date) : ''; }).join('; ') + ')</span></li>';
        }).join('') + '</ul></div>' : '') +
        ((l.context.length || l.unverified.length) && !fi ? '<details class="pod-more"><summary>הקשר נוסף' + ' (' + (l.context.length + l.unverified.length) + ')</summary>' +
          (l.context.length ? '<p class="pod-lab">מחוץ לחלון הסקירה – לא נספר</p><ul>' + l.context.map(function (c) { return '<li>' + esc(c.show) + ' (' + esc(c.host) + ', ' + fmtDate(c.date) + '): ' + esc(c.point) + ' ' + srcLink(c.url, 'מקור') + '</li>'; }).join('') + '</ul>' : '') +
          (l.unverified.length ? '<p class="pod-lab">דווח אך לא אומת – לא נספר</p><ul>' + l.unverified.map(function (u) { return '<li>' + esc(u) + '</li>'; }).join('') + '</ul>' : '') + '</details>' : '') +
        '<p class="pod-up"><a href="#/podcasts' + (fi ? '?issue=' + fi : '') + '">↑ לראש העמוד ולרשימת הרשימות</a></p></section>';
    }).join('');
    var w = PD.window;
    return '<header class="page-head"><p class="eyebrow">פודקאסטים וראיונות</p><h1>ראשי הרשימות בפודקאסטים ובראיונות ארוכים</h1>' +
      '<p class="lead">מה אמרו ראשי ' + lists.length + ' הרשימות בפודקאסטים ובראיונות אודיו ווידאו ארוכים בחודש שלפני הבחירות. לכל הופעה: פרטים, קישור, עיקרי הדברים בפרפרזה, וציטוטים רק אם נבדקו מול תמלול או מול דף המקור.</p>' +
      '<p class="meta"><b>עדכון אחרון: ' + fmtDate(PD.updated) + '</b> · חלון הסקירה: ' + fmtDate(w[0]) + '–' + fmtDate(w[1]) + ' · הנתונים: <a href="data/podcasts.json">podcasts.json</a></p>' +
      '<p class="pod-clip"><a href="clip/"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>קליפ סיכום מונפש של הממצאים (כ-2 דקות)</a></p></header>' +
      '<div class="kpis"><div class="kpi"><b>' + PD.total + '</b><span>הופעות שאותרו</span></div><div class="kpi"><b>' + lists.length + '</b><span>ראשי רשימות</span></div><div class="kpi"><b class="stamp">' + fmtShort(w[0]) + '–' + fmtShort(w[1]) + '</b><span>חלון הסקירה</span></div><div class="kpi"><b class="stamp">' + fmtDate(PD.updated) + '</b><span>עדכון אחרון</span></div></div>' +
      '<div class="legend pod-legend" role="note" aria-label="מקרא"><span><span class="kind quote">ציטוט מאומת</span> נוסח שנבדק מול תמלול או מול דף המקור; שיטת האימות מצוינת לצדו</span><span><span class="kind para">פרפרזה</span> סיכום שלנו, לא ציטוט</span></div>' +
      '<details class="note method"><summary><b>שיטה וניטרליות</b></summary>' + PD.method.map(function (m) { return '<p>' + esc(m) + '</p>'; }).join('') + '</details>' +
      '<h2>ממצאים רוחביים</h2><ul class="pod-find">' + PD.findings.map(function (f) { var k = f.indexOf(':'); return '<li>' + (k > 0 && k < 30 ? '<b>' + esc(f.slice(0, k)) + ':</b>' + esc(f.slice(k + 1)) : esc(f)) + '</li>'; }).join('') + '</ul>' +
      '<nav class="pod-index" aria-label="מעבר לרשימה"><p class="pod-lab">מעבר לרשימה</p><ul>' + lists.map(function (l) { return '<li><a href="#/podcasts/' + l.id + (fi ? '?issue=' + fi : '') + '"><span>' + esc(LIST[l.id].tableName) + '</span><small>' + esc(l.leader) + ' · ' + l.items.length + '</small></a></li>'; }).join('') + '</ul></nav>' +
      '<div class="toolbar panel tight"><div class="tb-row">' +
      '<label>סינון לפי סוגיה: <select id="podissue"><option value="">כל הסוגיות</option>' + P.issues.map(function (i) { return '<option value="' + i.id + '"' + (i.id === fi ? ' selected' : '') + '>' + i.n + '. ' + esc(i.short) + '</option>'; }).join('') + '</select></label></div>' +
      '<p class="order-note">' + esc('סדר הרשימות: לפי סדר האלף-בית של שם הרשימה. הסדר אינו מבטא דירוג או העדפה.') + (fi ? ' מוצגות ' + shown + ' הופעות בסוגיה "' + esc(ISS[fi].short) + '".' : '') + '</p></div>' +
      secs +
      '<h2 id="pod-gaps">פערים ומגבלות</h2><ul>' + (PD.gaps.noAppearances.length ? '<li>ראשי רשימות שלא נמצאה להם הופעה בחלון: ' + PD.gaps.noAppearances.map(esc).join(', ') + '.</li>' : '') + PD.gaps.notes.map(function (g) { return '<li>' + esc(g) + '</li>'; }).join('') + '</ul>';
  }

  function foot() {
    document.getElementById('foot').innerHTML =
      '<p><b>אתר מידע ניטרלי.</b> אין בו המלצה להצבעה. העמדות נכונות ל-' + fmtDate(P.meta.documentAsOf) + '; הסקרים עודכנו ב-' + fmtStamp(D.meta.updatedAt) + ' (סקר אחרון: ' + fmtDate(D.meta.latestPollDate) + ', ' + D.polls.length + ' סקרים).</p>' +
      '<p><a href="#/about">שיטה ומקורות</a> · <a href="data/platforms.json">platforms.json</a> · <a href="data/analysis.json">analysis.json</a> · <a href="data/polls.json">polls.json</a> · <a href="data/podcasts.json">podcasts.json</a> · <a href="data/coalition.json">coalition.json</a> · <a href="data/exitpolls.json">exitpolls.json</a> · <a href="data/geo/index.json">geo/index.json</a> · <a href="' + REPO + '" target="_blank" rel="noopener noreferrer">קוד המקור<span class="sr"> (נפתח בחלון חדש)</span></a></p>';
  }

  // ---------- coalition builder (#/coalition; data/coalition.json, loaded on demand)
  // A mathematical comparison of declared positions as coded in the cross-cutting analysis. Not a forecast, not a recommendation.
  var CO = null, COerr = '', CX = null;
  function loadCoalition() { return getJSON('data/coalition.json').then(function (d) { CO = d; coPrep(); }).catch(function (e) { COerr = e.message || 'שגיאה'; }); }
  function alpha(ids) { return ids.slice().sort(function (a, b) { return COLL.compare(lname(a), lname(b)); }); }
  function coPrep() {
    var ids = P.lists.map(function (l) { return l.id; });
    CX = { ids: alpha(ids), d: {}, s10: {} };
    ids.forEach(function (id) { CX.s10[id] = Math.round(avgOf(id) * 10); });
    CO.issues.forEach(function (is) {
      var k = is.camps.length, cons = is.consensus ? is.consensus.members : [], m = {};
      function dc(x, y, a, b) {
        if (x === y) return 0;
        if (is.scale === 'ordinal') return Math.abs(x - y) / (k - 1);
        if (is.scale === 'degree' && cons.indexOf(a) >= 0 && cons.indexOf(b) >= 0) return 0.5;
        return 1;
      }
      ids.forEach(function (a) {
        m[a] = {};
        ids.forEach(function (b) {
          var A1 = is.lists[a], B1 = is.lists[b];
          if (!A1 || !B1) { m[a][b] = null; return; }
          var s1 = 0, s2 = 0;
          A1.camps.forEach(function (x) { s1 += Math.min.apply(null, B1.camps.map(function (y) { return dc(x, y, a, b); })); });
          B1.camps.forEach(function (y) { s2 += Math.min.apply(null, A1.camps.map(function (x) { return dc(x, y, a, b); })); });
          m[a][b] = (s1 / A1.camps.length + s2 / B1.camps.length) / 2;
        });
      });
      CX.d[is.id] = m;
    });
  }
  function coState(q) {
    var l = (q.l || '').split(',').filter(function (x, i, a) { return LIST[x] && a.indexOf(x) === i; });
    return {
      l: alpha(l),
      w: CO.issues.map(function (is, k) { var c = (q.w || '').charAt(k); return /^[0-3]$/.test(c) ? +c : 1; }),
      sw: q.s === '0' ? 0 : q.s === '10' ? 1 : 0.5,
      th: q.th === 'all', must: LIST[q.must] ? q.must : '', nd: q.nd !== '0',
      mp: /^(25|40|50)$/.test(q.mp || '') ? +q.mp : 40,
      view: q.view === 'list' ? 'list' : 'score', sort: q.sort === 'gap' ? 'gap' : 'n', all: q.all === '1'
    };
  }
  function coHash(st, over) {
    var s = Object.assign({}, st, over || {}), q = [];
    if (s.l.length) q.push('l=' + alpha(s.l).join(','));
    if (s.w.some(function (x) { return x !== 1; })) q.push('w=' + s.w.join(''));
    if (s.sw !== 0.5) q.push('s=' + (s.sw === 0 ? '0' : '10'));
    if (s.th) q.push('th=all');
    if (s.must) q.push('must=' + s.must);
    if (!s.nd) q.push('nd=0');
    if (s.mp !== 40) q.push('mp=' + s.mp);
    if (s.view === 'list') q.push('view=list');
    if (s.sort === 'gap') q.push('sort=gap');
    if (s.all) q.push('all=1');
    return '#/coalition' + (q.length ? '?' + q.join('&') : '');
  }
  function coCf(id, iid, sw) { return P.positions[id][iid].star ? sw : 1; }
  function coSum10(set) { return set.reduce(function (s, id) { return s + CX.s10[id]; }, 0); }
  function coScore(set, st, sw) {
    if (sw == null) sw = st.sw;
    var num = 0, den = 0, cov = 0, tot = 0;
    CO.issues.forEach(function (is, k) {
      var wi = st.w[k], m = CX.d[is.id]; if (!wi) return;
      for (var i = 0; i < set.length; i++) for (var j = i + 1; j < set.length; j++) {
        tot++;
        var d = m[set[i]][set[j]]; if (d == null) continue;
        var w = wi * coCf(set[i], is.id, sw) * coCf(set[j], is.id, sw); if (!w) continue;
        cov++; num += w * (1 - d); den += w;
      }
    });
    return { score: den ? num / den * 100 : null, cov: tot ? cov / tot : 0 };
  }
  function coIssue(set, is, st) {
    var m = CX.d[is.id], num = 0, den = 0, maxD = -1, n = 0;
    for (var i = 0; i < set.length; i++) for (var j = i + 1; j < set.length; j++) {
      var d = m[set[i]][set[j]]; if (d == null) continue;
      var w = coCf(set[i], is.id, st.sw) * coCf(set[j], is.id, st.sw); if (!w) continue;
      n++; num += w * (1 - d); den += w; if (d > maxD) maxD = d;
    }
    var counted = function (id) { return is.lists[id] && coCf(id, is.id, st.sw) > 0; };
    return {
      agree: den ? num / den * 100 : null, maxD: maxD, n: n,
      groups: is.camps.map(function (lab, k) { return { k: k, lab: lab, ids: set.filter(function (id) { return is.lists[id] && is.lists[id].camps.indexOf(k) >= 0; }) }; }).filter(function (g) { return g.ids.length; }),
      unc: set.filter(function (id) { return !is.lists[id]; }),
      off: set.filter(function (id) { return is.lists[id] && !counted(id); })
    };
  }
  function coRange(set, st, s) {
    if (st.sw !== 0.5 || s == null) return null;
    var v = [s, coScore(set, st, 0).score, coScore(set, st, 1).score].filter(function (x) { return x != null; }).map(Math.round);
    var lo = Math.min.apply(null, v), hi = Math.max.apply(null, v);
    return lo === hi ? null : [lo, hi];
  }
  function coStatus(x) {
    if (!x.n) return 'אין השוואה';
    if (x.maxD < 1e-9) return 'אותו מודל';
    if (x.maxD <= 0.5 + 1e-9) return 'פער חלקי';
    if (x.maxD < 1 - 1e-9) return 'פער גדול';
    return 'פער מלא';
  }
  // declared refusals inside a set: one entry per (from, to) pair, with every source that maps it
  function coRefusals(set) {
    var out = [], ix = {};
    function add(a, b, src) {
      var k = a + '>' + b;
      if (!ix[k]) { ix[k] = { from: a, to: b, srcs: [] }; out.push(ix[k]); }
      ix[k].srcs.push(src);
    }
    set.forEach(function (a) {
      var dcl = CO.declared[a]; if (!dcl) return;
      dcl.refuses.forEach(function (r) { r.refuses.forEach(function (b) { if (set.indexOf(b) >= 0) add(a, b, { ev: r.ev, via: r.via }); }); });
      (dcl.statements || []).forEach(function (m) { m.refs.forEach(function (r) { r.refuses.forEach(function (b) { if (set.indexOf(b) >= 0) add(a, b, { ev: m.quote, via: r.via, who: m.who, date: m.date, src: m.src }); }); }); });
    });
    return out;
  }
  // pair stats under the current weights: index, number of issues compared, issues at full distance
  var COPS = {};
  function coPairs(st) {
    var key = st.w.join('') + '|' + st.sw;
    if (COPS.key === key) return COPS.m;
    var m = {};
    CX.ids.forEach(function (a) { m[a] = {}; });
    CX.ids.forEach(function (a, i) {
      CX.ids.slice(i + 1).forEach(function (b) {
        var sc = coScore([a, b], st), n = 0, full = 0;
        CO.issues.forEach(function (is, k) {
          if (!st.w[k]) return;
          var d = CX.d[is.id][a][b]; if (d == null || !(coCf(a, is.id, st.sw) * coCf(b, is.id, st.sw))) return;
          n++; if (d > 1 - 1e-9) full++;
        });
        m[a][b] = m[b][a] = { score: sc.score, n: n, full: full };
      });
    });
    COPS = { key: key, m: m }; return m;
  }
  var CO_MINN = 5; // a pair must be compared on at least 5 counted issues for its index to be used
  function coStats(set, st) {
    var pm = coPairs(st), worst = null, minN = 99, full = 0;
    for (var i = 0; i < set.length; i++) for (var j = i + 1; j < set.length; j++) {
      var p = pm[set[i]][set[j]];
      if (p.n < minN) minN = p.n;
      var v = p.score == null ? -1 : p.score;
      if (!worst || v < worst.score) worst = { score: v, a: set[i], b: set[j], full: p.full, n: p.n };
    }
    CO.issues.forEach(function (is, k) {
      if (!st.w[k]) return;
      for (var i = 0; i < set.length; i++) for (var j = i + 1; j < set.length; j++) {
        var d = CX.d[is.id][set[i]][set[j]];
        if (d != null && d > 1 - 1e-9 && coCf(set[i], is.id, st.sw) * coCf(set[j], is.id, st.sw)) { full++; return; }
      }
    });
    return { worst: worst, minN: set.length > 1 ? minN : 0, full: full };
  }
  function coMk(set, st, sum, extra) {
    var sc = coScore(set, st), x = coStats(set, st), refs = coRefusals(set);
    return Object.assign({ set: set, sum: sum, score: sc.score, cov: sc.cov, rng: coRange(set, st, sc.score), ref: refs.length, refs: refs, worst: x.worst, minN: x.minN, full: x.full, names: set.map(lname).join(', ') }, extra || {});
  }
  // passes the closeness threshold: every pair compared on enough issues and at or above the threshold
  function coPass(c, st) { return !st.mp || (c.minN >= CO_MINN && c.worst && Math.round(c.worst.score) >= st.mp); }
  function coPool(st) { return CX.ids.filter(function (id) { return st.th || CX.s10[id] >= 40; }); }
  var COMW = {};
  function coMinWin(st) {
    var key = st.w.join('') + '|' + st.sw + '|' + st.th;
    if (COMW[key]) return COMW[key];
    var pool = coPool(st), n = pool.length, out = [];
    for (var mask = 1; mask < (1 << n); mask++) {
      var set = [], sum = 0, mn = 1e9;
      for (var i = 0; i < n; i++) if (mask & (1 << i)) { set.push(pool[i]); var v = CX.s10[pool[i]]; sum += v; if (v < mn) mn = v; }
      if (sum < 610 || sum - mn >= 610) continue;
      out.push(coMk(set, st, sum));
    }
    out.sort(coCmp);
    COMW = {}; COMW[key] = out; return out;
  }
  // order: the pair furthest apart first (higher is better), then the mean index, then fewer issues with a full gap
  function coCmp(a, b) {
    var wa = a.worst ? Math.round(a.worst.score) : -1, wb = b.worst ? Math.round(b.worst.score) : -1;
    if (wb !== wa) return wb - wa;
    var sa = a.score == null ? -1 : Math.round(a.score), sb = b.score == null ? -1 : Math.round(b.score);
    if (sb !== sa) return sb - sa;
    if (a.full !== b.full) return a.full - b.full;
    var ca = Math.round(a.cov * 100), cb = Math.round(b.cov * 100);
    if (cb !== ca) return cb - ca;
    if (a.set.length !== b.set.length) return a.set.length - b.set.length;
    return COLL.compare(a.names, b.names);
  }
  function coAdd(st) {
    var cur = st.l, base = coSum10(cur), res = [];
    if (!cur.length || base >= 610) return [];
    var cand = coPool(st).filter(function (id) { return cur.indexOf(id) < 0; });
    (function rec(start, pick, sum) {
      if (pick.length && sum >= 610) {
        if (pick.every(function (p) { return sum - CX.s10[p] < 610; })) {
          var set = alpha(cur.concat(pick)), c = coMk(set, st, sum, { add: alpha(pick) });
          c.names = alpha(pick).map(lname).join(', ');
          res.push(c);
        }
        return;
      }
      if (pick.length === 3) return;
      for (var i = start; i < cand.length; i++) rec(i + 1, pick.concat([cand[i]]), sum + CX.s10[cand[i]]);
    })(0, [], base);
    res.sort(function (a, b) { return a.add.length - b.add.length || coCmp(a, b); });
    return res;
  }
  function coSeatsTxt(s10) { return (s10 / 10).toFixed(1); }
  function coScoreTxt(s) { return s == null ? '–' : String(Math.round(s)); }
  function coNames(ids, is) {
    return ids.map(function (id) {
      var st = is && P.positions[id][is.id].star;
      return '<span class="co-nm">' + esc(lname(id)) + (st ? '<span class="star" title="מבוסס על הצהרות, הודעות או הצבעות">*</span>' : '') + '</span>';
    }).join('');
  }
  function coMeter(s10) {
    var pct = Math.min(100, s10 / 12), gap = 610 - s10;
    var txt = s10 >= 610 ? 'מעל קו 61 ב-' + coSeatsTxt(s10 - 610) : 'חסרים ' + coSeatsTxt(gap) + ' עד 61';
    return '<div class="co-meter"><div class="co-bar" role="img" aria-label="' + esc('הערכת מנדטים לצירוף: ' + coSeatsTxt(s10) + ' מתוך 120; ' + txt) + '"><i style="width:' + pct.toFixed(2) + '%"></i><b style="inset-inline-start:' + (61 / 1.2).toFixed(2) + '%"></b></div>' +
      '<div class="co-scale" aria-hidden="true"><span>0</span><span style="inset-inline-start:' + (61 / 1.2).toFixed(2) + '%">61</span><span class="end">120</span></div></div>';
  }
  function coLink(st, set, label, extra) {
    return '<a class="btn sec co-load" data-co-load href="' + coHash(st, { l: set }) + '"' + (extra || '') + '>' + label + '</a>';
  }
  function coCombo(st, c, k, addMode) {
    return '<li class="co-combo"><div class="co-combo-h">' + (k != null ? '<span class="co-rank" aria-hidden="true">' + (k + 1) + '</span>' : '') +
      '<div class="co-combo-n">' + (addMode ? '<span class="meta">הוספה של </span>' : '') + coNames(addMode ? c.add : c.set) + '</div></div>' +
      '<p class="co-combo-m"><span>' + coSeatsTxt(c.sum) + ' מנדטים</span>' +
      (c.worst ? '<span>הזוג הרחוק ביותר: ' + esc(lname(c.worst.a)) + ' – ' + esc(lname(c.worst.b)) + ', <b>' + coScoreTxt(c.worst.score < 0 ? null : c.worst.score) + '</b>' + (c.worst.n < CO_MINN ? ' (רק ' + c.worst.n + ' סוגיות בהשוואה)' : '') + '</span>' : '') +
      '<span>מדד קרבה ממוצע ' + coScoreTxt(c.score) + (c.rng ? ' <span class="co-rng">(טווח ' + c.rng[0] + '–' + c.rng[1] + ')</span>' : '') + '</span><span>סוגיות עם פער מלא בין שתי רשימות: ' + c.full + '</span><span>כיסוי ' + Math.round(c.cov * 100) + '%' + (c.cov < 0.6 ? ' – נמוך' : '') + '</span>' +
      (c.ref ? '<span>הצהרות סירוב בתוך הצירוף: ' + c.refs.map(function (r) { return esc(lname(r.from)) + ' לגבי ' + esc(lname(r.to)); }).join('; ') + '</span>' : '<span>אין בצירוף הצהרת סירוב (מבין אלה שנאספו)</span>') + '</p>' +
      coLink(st, c.set, addMode ? 'הוסיפו לבונה' : 'פתחו בבונה', ' aria-label="' + esc((addMode ? 'הוסיפו לבונה: ' + c.names : 'פתחו בבונה: ' + c.names)) + '"') + '</li>';
  }
  function pageCoalition(q) {
    var lead = 'בחרו רשימות וראו את הערכת המנדטים מול קו 61, ואיפה העמדות המוצהרות שלהן קרובות או רחוקות בכל אחת מ-10 הסוגיות. זו השוואה מתמטית של עמדות מוצהרות, לפי הקידוד של <a href="#/analysis">הניתוח הרוחבי</a>, ולא תחזית: היא לא אומרת מי יצטרף למי, ואין בה המלצה. <a href="#co-method">איך זה מחושב</a>';
    var hd = head('כלי השוואה', 'בנה קואליציה', lead);
    if (!CO) return hd + (COerr ? '<div class="empty" role="alert"><b>שגיאה בטעינת נתוני ההשוואה</b><p>' + esc(COerr) + '. נסו לרענן את הדף.</p></div>' : '<div class="skel" aria-hidden="true"><i></i><i></i><i></i></div><p class="sr" role="status">טוען…</p>');
    var st = coState(q), set = st.l, s10 = coSum10(set), C = D.computed, h = hd;
    // picker
    var pick = '<div class="panel co-pick"><fieldset><legend>בחירת רשימות – נבחרו ' + set.length + ' מתוך ' + nLists() + '</legend><div class="chips co-chips">' +
      CX.ids.map(function (id) {
        var on = set.indexOf(id) >= 0, low = CX.s10[id] < 40;
        return '<button type="button" class="chip" data-co="' + id + '" aria-pressed="' + on + '"><span>' + esc(lname(id)) + '</span><span class="co-seat">' + fmtN(avgOf(id)) + (low ? '<span class="sr"> – ממוצע מתחת ל-4 מנדטים</span><span aria-hidden="true">↓</span>' : '') + '</span></button>';
      }).join('') + '</div></fieldset>' +
      '<p class="meta co-pick-n">המספר ליד כל רשימה: הערכת מנדטים לפי ממוצע ' + C.n + ' הסקרים שבחלון ' + fmtShort(C.window[0]) + '–' + fmtShort(C.window[1]) + ' (<a href="#/polls">סקרים</a>). ↓ = ממוצע מתחת ל-4 מנדטים, הסף שמתחתיו רשימה לא עוברת את אחוז החסימה. סדר הרשימות: לפי סדר האלף-בית.</p>' +
      (set.length ? '<p><button type="button" class="btn sec" data-co-clear>ניקוי הבחירה</button></p>' : '') + '</div>';
    h += '<section class="co-builder" id="co-builder" aria-label="בניית צירוף">';
    // summary
    var sc = set.length > 1 ? coScore(set, st) : null;
    h += '<div class="panel co-sum" aria-live="polite"><div class="co-kpis">' +
      '<div><span class="k">הערכת מנדטים</span><b>' + coSeatsTxt(s10) + '</b><span class="meta">הערכה מהסקרים</span></div>' +
      '<div><span class="k">קו 61</span><b>' + (set.length ? '<bdi dir="ltr">' + (s10 >= 610 ? '+' + coSeatsTxt(s10 - 610) : '−' + coSeatsTxt(610 - s10)) + '</bdi>' : '–') + '</b><span class="meta">' + (!set.length ? 'לא נבחרו רשימות' : s10 >= 610 ? 'מעל 61' : 'מתחת ל-61') + '</span></div>' +
      '<div><span class="k">מדד קרבה</span><b>' + (sc ? coScoreTxt(sc.score) : '–') + '</b><span class="meta">' + (sc ? (sc.score == null ? 'אין השוואות שנספרו' : '0–100 · כיסוי ' + Math.round(sc.cov * 100) + '%') : 'נדרשות 2 רשימות לפחות') + '</span></div></div>' +
      coMeter(s10) + (set.length > 1 ? (function () {
        var x = coStats(set, st), w = x.worst;
        return '<p class="co-worst">הזוג הרחוק ביותר בבחירה: ' + esc(lname(w.a)) + ' – ' + esc(lname(w.b)) + ', מדד ' + coScoreTxt(w.score < 0 ? null : w.score) + ' (על סמך ' + w.n + ' סוגיות; בפער מלא ב-' + w.full + ')' +
          (w.n < CO_MINN ? '. פחות מ-' + CO_MINN + ' סוגיות בהשוואה – המדד הזוגי לא מספיק לסף.' : Math.round(w.score) < st.mp ? '. מתחת לסף הקרבה (' + st.mp + ') שבו משתמשת רשימת הצירופים.' : '.') + '</p>';
      })() : '') + (set.some(function (id) { return CX.s10[id] < 40; }) ? '<p class="meta">הצירוף כולל רשימה שממוצעה מתחת ל-4 מנדטים (↓). רשימה שלא תעבור את אחוז החסימה לא תקבל מנדטים, והסכום יקטן בהתאם.</p>' : '') + '</div>' + pick;
    // what it takes
    if (set.length && s10 < 610) {
      var addsAll = coAdd(st), adds = addsAll.filter(function (c) { return coPass(c, st) && (!st.nd || !c.ref); }), show = adds.slice(0, 6);
      h += '<div class="panel co-need"><h2>מה צריך כדי להגיע ל-61</h2>' +
        (show.length ? '<p class="meta">צירופים מינימליים של עד 3 רשימות נוספות' + (st.th ? '' : ' (מתוך הרשימות שממוצען 4 מנדטים לפחות)') + ', באותם מסננים כמו ברשימת הצירופים למטה (סף קרבה: ' + coMpTxt(st) + (st.nd ? '; בלי הצהרות סירוב' : '') + '). הסדר: לפי מספר הרשימות שמתווספות, ואז לפי הזוג הרחוק ביותר והמדד הממוצע. "טווח" = המדד כשמשקל העמדות המסומנות * הוא 0 או 1.</p><ol class="co-combos">' + show.map(function (c) { return coCombo(st, c, null, true); }).join('') + '</ol>' + (adds.length > 6 ? '<p class="meta">ועוד ' + (adds.length - 6) + ' אפשרויות.</p>' : '')
          : '<p>' + (addsAll.length ? 'יש ' + addsAll.length + ' דרכים להגיע ל-61 בהוספה של עד 3 רשימות, אבל אף אחת מהן לא עוברת את המסננים (סף קרבה: ' + coMpTxt(st) + (st.nd ? '; בלי הצהרות סירוב' : '') + ').' + (function () {
            var p2 = addsAll.filter(function (c) { return coPass(c, st); });
            return st.nd && p2.length ? ' ' + (p2.length === 1 ? 'אחת מהן עוברת את סף הקרבה אבל כוללת' : p2.length + ' מהן עוברות את סף הקרבה אבל כוללות') + ' הצהרת סירוב:</p><ol class="co-combos">' + p2.slice(0, 6).map(function (c) { return coCombo(st, c, null, true); }).join('') + '</ol><p class="meta">אפשר לשנות את המסננים ברשימת הצירופים למטה.' : ' אפשר לשנות אותם ברשימת הצירופים למטה.';
          })() : 'אין צירוף של עד 3 רשימות נוספות' + (st.th ? '' : ' מתוך הרשימות שממוצען 4 מנדטים לפחות') + ' שמביא את הבחירה ל-61 לפי ההערכה.') + '</p>') + '</div>';
    } else if (set.length && s10 >= 610) {
      var extra = set.filter(function (id) { return s10 - CX.s10[id] >= 610; });
      h += '<div class="panel co-need"><h2>הצירוף מגיע ל-61 לפי ההערכה</h2><p>' + (extra.length ? 'גם בלי אחת מהרשימות הבאות הצירוף נשאר עם 61 לפחות (בכל פעם רשימה אחת): ' + extra.map(function (id) { return esc(lname(id)); }).join(', ') + '. זו קביעה חשבונית בלבד.' : 'זה צירוף מינימלי: הוצאה של כל אחת מהרשימות מורידה אותו מתחת ל-61 לפי ההערכה.') + '</p></div>';
    }
    h += '</section>';
    // weights
    var wOn = st.w.some(function (x) { return x !== 1; }) || st.sw !== 0.5;
    h += '<details class="panel co-w"' + (wOn ? ' open' : '') + '><summary>משקלות: חשיבות הסוגיות ועמדות המסומנות *' + (wOn ? ' – שונו' : '') + '</summary>' +
      '<p class="meta">ברירת המחדל: כל הסוגיות באותו משקל (1). משקל 0 מוציא סוגיה מהמדד. המשקלות משנים רק את החישוב במסך זה ונשמרים בקישור.</p><div class="co-sliders">' +
      CO.issues.map(function (is, k) {
        return '<div class="co-sl"><label for="co-w-' + k + '">' + esc(is.short) + '</label><input type="range" id="co-w-' + k + '" data-co-w="' + k + '" min="0" max="3" step="1" value="' + st.w[k] + '" aria-valuetext="' + coWTxt(st.w[k]) + '"><output for="co-w-' + k + '" id="co-wo-' + k + '">' + coWTxt(st.w[k]) + '</output></div>';
      }).join('') + '</div>' +
      '<fieldset class="co-swf"><legend>משקל של עמדה המסומנת * (מבוססת על הצהרות, הודעות או הצבעות ולא על מצע כתוב)</legend><span class="seg">' +
      [[1, '1 – כמו כל עמדה'], [0.5, '0.5 – ברירת המחדל'], [0, '0 – לא נספרת']].map(function (o) { return '<button type="button" data-co-sw="' + o[0] + '" aria-pressed="' + (st.sw === o[0]) + '">' + o[1] + '</button>'; }).join('') + '</span></fieldset>' +
      (wOn ? '<p><button type="button" class="btn sec" data-co-reset>חזרה לברירת המחדל</button></p>' : '') + '</details>';
    // comparison
    if (set.length > 1) h += coCompare(st, set, sc);
    else h += '<div class="empty co-empty"><b>' + (set.length ? 'בחרו רשימה נוספת כדי לראות את ההשוואה בין העמדות.' : 'בחרו לפחות שתי רשימות כדי לראות את ההשוואה בין העמדות.') + '</b><p>אפשר גם לפתוח אחד מהצירופים שבהמשך העמוד.</p></div>';
    h += coSuggest(st);
    h += coMethod(st);
    return h;
  }
  function coWTxt(v) { return ['0 – לא נספרת', '1 – רגיל', '2 – כפול', '3 – משולש'][v]; }
  function coCompare(st, set, sc) {
    var h = '', rows = CO.issues.map(function (is, k) { return { is: is, k: k, x: coIssue(set, is, st) }; });
    var lo = st.sw === 0.5 ? [coScore(set, st, 0).score, coScore(set, st, 1).score].filter(function (x) { return x != null; }) : [];
    h += '<section class="co-res" aria-labelledby="co-res-h"><h2 id="co-res-h">ההשוואה בין העמדות</h2>' +
      '<p class="lead-s">מדד הקרבה של הצירוף: <b>' + coScoreTxt(sc.score) + '</b> מתוך 100, על סמך ' + Math.round(sc.cov * 100) + '% מההשוואות האפשריות בין זוגות הרשימות בסוגיות שבמדד' + (lo.length ? '. בשינוי משקל העמדות המסומנות * ל-0 או ל-1 המדד נע בין ' + coScoreTxt(Math.min.apply(null, lo.concat([sc.score]))) + ' ל-' + coScoreTxt(Math.max.apply(null, lo.concat([sc.score]))) : '') + '. 100 = כל זוגות הרשימות באותו מודל בכל הסוגיות שנספרו; 0 = כל הזוגות במודלים הרחוקים ביותר זה מזה.' + (sc.cov < 0.6 ? ' <span class="co-warn">הכיסוי נמוך: חלק ניכר מהעמדות לא קודדו בסולם, ולכן המדד נשען על מעט השוואות.</span>' : '') + '</p>';
    // fault lines
    var ranked = rows.filter(function (r) { return r.x.n && st.w[r.k]; }).sort(function (a, b) { return a.x.agree - b.x.agree || a.k - b.k; });
    var gaps = ranked.filter(function (r) { return r.x.maxD > 1e-9; }).slice(0, 3), same = rows.filter(function (r) { return r.x.n && st.w[r.k] && r.x.maxD < 1e-9; });
    h += '<div class="panel co-fault"><h3>קווי השבר בצירוף</h3>' +
      (gaps.length ? '<p class="meta">הסוגיות שבהן הקרבה בתוך הצירוף הנמוכה ביותר:</p><ul>' + gaps.map(function (r) {
        return '<li><a href="#co-i-' + r.is.id + '">' + esc(r.is.short) + '</a> – ' + coStatus(r.x) + ': ' + r.x.groups.map(function (g) { return '<span class="co-fg">' + esc(g.ids.map(lname).join(', ')) + '</span>'; }).join(' <span class="co-vs">מול</span> ') + '</li>';
      }).join('') + '</ul>' + (gaps.some(function (r) { var seen = {}; return r.x.groups.some(function (g) { return g.ids.some(function (id) { if (seen[id]) return true; seen[id] = 1; return false; }); }); }) ? '<p class="meta">רשימה שמופיעה ביותר מקבוצה אחת שויכה בניתוח ליותר ממודל אחד (רשימה משותפת או עמדה מורכבת); ראו טבלת הקידוד.</p>' : '') : '<p>בכל הסוגיות שנספרו, הרשימות שנבחרו נמצאות באותו מודל.</p>') +
      (same.length ? '<p class="meta">אותו מודל לכל הרשימות שקודדו: ' + same.map(function (r) { return esc(r.is.short); }).join(', ') + '.</p>' : '') + '</div>';
    // per-issue
    var order = st.sort === 'gap' ? rows.slice().sort(function (a, b) { var A1 = a.x.n ? a.x.agree : 101, B1 = b.x.n ? b.x.agree : 101; return A1 - B1 || a.k - b.k; }) : rows;
    h += '<div class="co-sorthead"><h3>לפי סוגיה</h3><span class="seg" role="group" aria-label="סדר הסוגיות"><button type="button" data-co-sort="n" aria-pressed="' + (st.sort === 'n') + '">לפי סדר הסוגיות</button><button type="button" data-co-sort="gap" aria-pressed="' + (st.sort === 'gap') + '">מהפער הגדול לקטן</button></span></div><div class="co-issues">' +
      order.map(function (r) {
        var is = r.is, x = r.x, stt = coStatus(x);
        return '<article class="co-iss' + (st.w[r.k] ? '' : ' off') + '" id="co-i-' + is.id + '"><h4><a href="#/issue/' + is.id + '">' + esc(is.short) + '</a><span class="badge">' + stt + '</span></h4>' +
          (x.n ? '<div class="co-agree"><span class="co-ab" aria-hidden="true"><i style="width:' + x.agree.toFixed(1) + '%"></i></span><span><b>' + coScoreTxt(x.agree) + '</b> קרבה בסוגיה · מרחק מרבי בין שתי רשימות: ' + coDistTxt(is, x.maxD) + '</span></div>' : '<p class="meta">אין זוג רשימות עם עמדות מקודדות בסוגיה זו.</p>') +
          (st.w[r.k] ? '' : '<p class="meta">משקל 0 – הסוגיה לא נספרת במדד.</p>') +
          '<ol class="co-groups">' + x.groups.map(function (g) { return '<li><span class="co-gl">' + esc(is.camps[g.k]) + '</span><span class="co-gn">' + coNames(g.ids, is) + '</span></li>'; }).join('') + '</ol>' +
          (x.unc.length ? '<p class="meta co-unc">לא קודדו בסולם: ' + x.unc.map(function (id) { return esc(lname(id)) + ' (' + esc(CO.reasons[is.uncoded[id].reason]) + ')'; }).join(', ') + '.</p>' : '') +
          (x.off.length ? '<p class="meta co-unc">לא נספרו (משקל * = 0): ' + x.off.map(function (id) { return esc(lname(id)); }).join(', ') + '.</p>' : '') +
          '<p class="meta co-scl">' + coScaleTxt(is) + '</p></article>';
      }).join('') + '</div>';
    // pair matrix
    h += '<details class="panel co-pairs"><summary>מדד הקרבה לכל זוג רשימות בצירוף</summary><div class="tbl-wrap" tabindex="0" role="region" aria-label="טבלת זוגות"><table class="tbl co-pt"><caption class="sr">מדד הקרבה (0–100) לכל זוג רשימות שנבחרו</caption><thead><tr><th scope="col"><span class="sr">רשימה</span></th>' +
      set.map(function (b) { return '<th scope="col">' + esc(lname(b)) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      set.map(function (a) {
        return '<tr><th scope="row">' + esc(lname(a)) + '</th>' + set.map(function (b) {
          if (a === b) return '<td class="co-self" aria-label="אותה רשימה">·</td>';
          var p = coScore([a, b], st);
          return '<td style="--a:' + (p.score == null ? 0 : (p.score / 100 * 0.32).toFixed(3)) + '">' + coScoreTxt(p.score) + '</td>';
        }).join('') + '</tr>';
      }).join('') + '</tbody></table></div><p class="meta">כל תא: מדד הקרבה של שתי הרשימות בלבד, באותה שיטה ובאותם משקלות. גוון התא עולה עם המספר.</p></details>';
    // declared
    var refs = coRefusals(set);
    function viaTxt(v, to) {
      if (!v) return 'נוגע ל' + lname(to);
      if (v.group) return 'נוגע ל' + lname(to) + '; ' + v.note;
      return 'נוגע ל' + lname(to) + ' דרך ראש הרשימה, ' + v.leader;
    }
    h += '<div class="panel co-decl"><h3>אילוצים מוצהרים</h3><p class="meta">לא נכללים במדד. שני מקורות, באותו כלל לכל הרשימות: (1) השדה "גוש / שותפויות מוצהרות" מפרופיל הרשימה, כלשונו; (2) הצהרות מפורשות ובלתי מותנות של ראש הרשימה מהקמפיין, עם תאריך וקישור למקור. הצהרה מסומנת כנוגעת לרשימה בצירוף רק כשהיא נוקבת בשם הרשימה, בשם ראש הרשימה, או ב"מפלגות ערביות" / "מפלגות חרדיות" (הרשימה המשותפת ורע"ם לפי סיווג הגושים באתר; ש"ס ויהדות התורה). הצהרות מותנות או כאלה שדורשות פרשנות מוצגות בלי מיפוי. ייתכנו הצהרות שלא נאספו כאן, ורשימה בלי הצהרה כאן לא בהכרח לא הצהירה.</p>' +
      (refs.length ? '<ul class="co-refs">' + refs.map(function (r) {
        return '<li><b>' + esc(lname(r.from)) + '</b>, לגבי ' + esc(lname(r.to)) + ':<ul>' + r.srcs.map(function (x) {
          return '<li>"' + esc(x.ev) + '"' + (x.src ? ' – ' + esc(x.who) + ', <a href="' + esc(x.src.url) + '" target="_blank" rel="noopener">' + esc(x.src.title) + '</a>' : ' – מתוך פרופיל הרשימה') + ' <span class="meta">(' + esc(viaTxt(x.via, r.to)) + ')</span></li>';
        }).join('') + '</ul></li>';
      }).join('') + '</ul>' : '<p>אין בצירוף הצהרה (מבין אלה שנאספו) שנוקבת ברשימה אחרת בצירוף, בראש הרשימה שלה או בקבוצה שהיא שייכת אליה.</p>') +
      '<ul class="co-dl">' + set.map(function (id) { var dd = CO.declared[id]; return '<li><a href="#/list/' + id + '">' + esc(lname(id)) + '</a>: ' + (dd && dd.text ? esc(dd.text) : '<span class="meta">אין הצהרה בשדה זה</span>') + '</li>'; }).join('') + '</ul></div></section>';
    return h;
  }
  function coDistTxt(is, d) {
    if (d < 1e-9) return '0 (אותו מודל)';
    if (is.scale === 'ordinal') { var steps = d * (is.camps.length - 1); return (Math.abs(steps - Math.round(steps)) < 1e-6 ? Math.round(steps) + ' מתוך ' + (is.camps.length - 1) + ' צעדים בסולם' : steps.toFixed(1) + ' מתוך ' + (is.camps.length - 1) + ' צעדים בסולם (ממוצע, רשימה מורכבת)'); }
    if (d <= 0.5 + 1e-9) return 'חלקי (מודלים שונים בתוך הסכמה על הכיוון)';
    return d < 1 - 1e-9 ? fmtN(d) + ' (רשימה מורכבת)' : 'מלא (מודלים שונים)';
  }
  function coScaleTxt(is) {
    return is.scale === 'ordinal' ? 'סולם מדורג: המודלים מסודרים בין שני קטבים, והמרחק נמדד במספר הצעדים ביניהם.'
      : is.scale === 'degree' ? 'מחלוקת על מידה: ' + (is.consensus ? 'רשימות שבהסכמה החלקית שבניתוח ("' + esc(is.consensus.label) + '") ובמודלים שונים – מרחק חלקי (0.5); אחרות – מרחק מלא.' : 'מודלים שונים – מרחק מלא.')
      : 'מחלוקת עיקרון: מודלים שונים – מרחק מלא.';
  }
  function coMpTxt(st) { return 'כל זוג רשימות בצירוף במדד ' + st.mp + ' לפחות, על סמך ' + CO_MINN + ' סוגיות לפחות'; }
  function coSuggest(st) {
    var all = coMinWin(st), byMust = all.filter(function (c) { return !st.must || c.set.indexOf(st.must) >= 0; });
    var pass = byMust.filter(function (c) { return coPass(c, st); }), list = pass.filter(function (c) { return !st.nd || !c.ref; });
    var h = '<section class="co-sug" aria-labelledby="co-sug-h"><h2 id="co-sug-h">הצירופים הקרובים ביותר בעמדות המוצהרות, מתוך אלה שמגיעים ל-61 לפי ההערכה</h2>' +
      '<p>צירופים מינימליים: אין בהם רשימה שאפשר להוציא ועדיין להישאר עם 61 לפחות. שני מסננים, אותו כלל לכל זוג רשימות: (1) <b>סף קרבה</b> – כל זוג רשימות בצירוף צריך להגיע לסף במדד הקרבה הזוגי, על סמך ' + CO_MINN + ' סוגיות לפחות שבהן שתיהן קודדו (צירוף שיש בו זוג רחוק מאוד לא מוצג, גם אם הממוצע גבוה); (2) <b>הצהרות סירוב</b> – כברירת מחדל לא מוצגים צירופים שיש בהם הצהרת סירוב מפורשת בין שתי רשימות (מבין אלה שנאספו, ראו "אילוצים מוצהרים"). הסדר: לפי מדד הקרבה של הזוג הרחוק ביותר בצירוף, מהגבוה לנמוך (בדומה לגישת "הטווח המינימלי" במדע המדינה); בשוויון – לפי המדד הממוצע, מספר הסוגיות עם פער מלא, הכיסוי, מספר הרשימות וסדר האלף-בית. זו השוואה מתמטית של עמדות מוצהרות ושל הערכות מהסקרים, לא תחזית ולא המלצה.</p>' +
      '<div class="toolbar panel tight co-tools"><span class="seg" role="group" aria-label="תצוגה"><button type="button" data-co-view="score" aria-pressed="' + (st.view === 'score') + '">כל הצירופים</button><button type="button" data-co-view="list" aria-pressed="' + (st.view === 'list') + '">לפי רשימה</button></span>' +
      (st.view === 'score' ? '<label>חייב לכלול <select id="co-must"><option value="">כל רשימה</option>' + CX.ids.map(function (id) { return '<option value="' + id + '"' + (st.must === id ? ' selected' : '') + '>' + esc(lname(id)) + '</option>'; }).join('') + '</select></label>' : '') +
      '<label>סף קרבה לכל זוג <select id="co-mp">' + [[40, '40 – ברירת המחדל'], [50, '50'], [25, '25']].map(function (o) { return '<option value="' + o[0] + '"' + (st.mp === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></label>' +
      '<label class="co-ck"><input type="checkbox" id="co-nd"' + (st.nd ? ' checked' : '') + '> להסתיר צירופים שיש בהם הצהרת סירוב (מבין אלה שנאספו) בין רשימות</label>' +
      '<label class="co-ck"><input type="checkbox" id="co-th"' + (st.th ? ' checked' : '') + '> לכלול גם רשימות שממוצען מתחת ל-4 מנדטים</label></div>' +
      '<p class="meta">' + byMust.length + ' צירופים מינימליים' + (st.must ? ' עם ' + esc(lname(st.must)) : '') + '; ' + (pass.length === 1 ? 'אחד עובר' : pass.length + ' עוברים') + ' את סף הקרבה (' + coMpTxt(st) + ')' + (st.nd ? '; ' + (list.length === 1 ? 'אחד מהם' : list.length + ' מהם') + ' בלי הצהרת סירוב' : '') + '.</p>';
    if (st.view === 'list') {
      h += '<p class="meta">לכל רשימה: הצירוף הראשון לפי הסדר שלמעלה שהיא חלק ממנו, באותם מסננים. סדר הרשימות: לפי סדר האלף-בית.</p><ul class="co-bylist">' + CX.ids.map(function (id) {
        var c = list.filter(function (x) { return x.set.indexOf(id) >= 0; })[0], c2 = !c && st.nd ? pass.filter(function (x) { return x.set.indexOf(id) >= 0; })[0] : null;
        return '<li><h3>' + esc(lname(id)) + '</h3>' + (c ? '<ol class="co-combos">' + coCombo(st, c, null, false) + '</ol>' : c2 ? '<p class="meta">אין צירוף בלי הצהרת סירוב; הראשון שעובר את סף הקרבה:</p><ol class="co-combos">' + coCombo(st, c2, null, false) + '</ol>' : '<p class="meta">' + (CX.s10[id] < 40 && !st.th ? 'ממוצע מתחת ל-4 מנדטים; לא נכללת בחישוב (אפשר לשנות בתיבת הסימון למעלה).' : 'אין צירוף מינימלי שעובר את סף הקרבה.') + '</p>') + '</li>';
      }).join('') + '</ul>';
    } else {
      var n = st.all ? list.length : Math.min(10, list.length);
      h += list.length ? '<ol class="co-combos">' + list.slice(0, n).map(function (c, k) { return coCombo(st, c, k, false); }).join('') + '</ol>' + (list.length > n ? '<p><button type="button" class="btn sec" data-co-all>הצגת כל ' + list.length + ' הצירופים</button></p>' : '')
        : '<div class="empty"><b>אין צירוף שעובר את המסננים.</b><p>' + (pass.length && st.nd ? 'לפי הערכת הסקרים, כל ' + pass.length + ' הצירופים שעוברים את סף הקרבה כוללים לפחות הצהרת סירוב אחת בין שתי רשימות בהם (מבין ההצהרות שנאספו).' : 'אפשר להוריד את סף הקרבה' + (st.nd ? ' או לבטל את הסתרת הצירופים עם הצהרות סירוב' : '') + '.') + '</p></div>' +
          (pass.length && st.nd ? '<h3 class="co-sub">הצירופים שעוברים את סף הקרבה, כל אחד עם הצהרות הסירוב שבו</h3><p class="meta">אותו סדר ואותו סף; ההצהרות מפורטות בכל צירוף. ' + (pass.length > 10 && !st.all ? 'מוצגים 10 הראשונים.' : '') + '</p><ol class="co-combos">' + pass.slice(0, st.all ? pass.length : 10).map(function (c, k) { return coCombo(st, c, k, false); }).join('') + '</ol>' + (pass.length > 10 && !st.all ? '<p><button type="button" class="btn sec" data-co-all>הצגת כל ' + pass.length + ' הצירופים</button></p>' : '') : '');
    }
    return h + '</section>';
  }
  function coMethod(st) {
    var C = D.computed, h = '<section class="co-method" id="co-method" aria-labelledby="co-m-h"><h2 id="co-m-h">איך זה מחושב</h2>' +
      '<div class="panel"><h3>הקידוד</h3><p>לכל סוגיה נקבעה השאלה שבמחלוקת ונקבעו המודלים, כפי שהם מופיעים בניתוח הרוחבי שבאתר; כל רשימה שויכה למודל אחד (או לכמה, ברשימה מורכבת) על סמך העמדה שלה בעמוד הסוגיה. השיוך מתועד בטבלה למטה, עם הקטע מהניתוח שעליו הוא נשען. רשימה שאין לה עמדה על השאלה שבמחלוקת, או שיש לה רק עמדה כללית, לא קודדה ולא נספרת – והסיבה מוצגת.</p>' +
      '<h3>המרחק בין שתי רשימות בסוגיה</h3><ul><li>אותו מודל: 0.</li><li>סולם מדורג (המודלים מסודרים בין שני קטבים): מספר הצעדים ביניהם חלקי מספר הצעדים בסולם. בין המודל הראשון לאחרון: 1.</li><li>מחלוקת על מידה (הניתוח מציין הסכמה על הכיוון): שתי רשימות שבהסכמה החלקית שבניתוח ובמודלים שונים – 0.5; אחרת – 1.</li><li>מחלוקת עיקרון: מודלים שונים – 1.</li><li>רשימה מורכבת ששויכה לכמה מודלים: ממוצע ההתאמה הקרובה ביותר לכל אחד מהמודלים שלה, בשני הכיוונים.</li></ul>' +
      '<h3>המדד</h3><p>לכל זוג רשימות בצירוף ובכל סוגיה: 1 פחות המרחק. המדד הוא הממוצע המשוקלל של כל הזוגות וכל הסוגיות, כפול 100. משקל של זוג בסוגיה = משקל הסוגיה × משקל העמדה של כל אחת משתי הרשימות. עמדה המסומנת * (מבוססת על הצהרות, הודעות או הצבעות) מקבלת כברירת מחדל משקל ' + (CO.starWeight) + ', ועמדה ממצע, ממסמך או מתשובה רשמית – 1. "כיסוי" הוא שיעור ההשוואות שנספרו מתוך כל ההשוואות האפשריות בסוגיות שבמדד. "קרבה בסוגיה" מחושבת באותה דרך, לסוגיה אחת.</p>' +
      '<h3>מנדטים</h3><p>הערכת המנדטים היא סכום הממוצעים של הרשימות ב-' + C.n + ' הסקרים שבחלון ' + fmtShort(C.window[0]) + '–' + fmtShort(C.window[1]) + ', לפי <a href="#/polls">עמוד הסקרים</a>. היא לא תוצאה ולא הקצאת מושבים: לסקרים יש טווח טעות, ורשימה שלא תעבור את אחוז החסימה תקבל 0. ' + esc(D.meta.silence) + ' כברירת מחדל, רשימות שממוצען מתחת ל-4 מנדטים לא נכללות בחיפוש הצירופים.</p>' +
      '<h3>רשימת הצירופים</h3><p>ממוצע של כל הזוגות יכול להיות גבוה גם כשבצירוף יש שתי רשימות עם עמדות מנוגדות כמעט בכל סוגיה. לכן לכל זוג רשימות מחושב גם מדד זוגי (אותה נוסחה, על שתי הרשימות בלבד), ונספרות הסוגיות שבהן שתיהן קודדו. ברשימת הצירופים מוצגים רק צירופים שבהם כל זוג רשימות מגיע לסף (ברירת מחדל 40; אפשר לבחור 25 או 50) על סמך ' + CO_MINN + ' סוגיות לפחות, והם מסודרים לפי המדד של הזוג הרחוק ביותר בצירוף, ואחריו המדד הממוצע. הכלל זהה לכל זוג רשימות, בלי חריגים. כברירת מחדל מוסתרים גם צירופים שיש בהם הצהרת סירוב מפורשת (מבין אלה שנאספו); אם אין צירוף כזה, הצירופים שעוברים את הסף מוצגים עם ההצהרות שבהם. הסף הוא בחירה של האתר, לא קביעה מדעית.</p>' +
      '<h3>מגבלות</h3><ul><li>זו השוואה מתמטית של עמדות מוצהרות, לא תחזית ולא המלצה. היא לא אומרת מי יצטרף למי ולא מעריכה סיכויים.</li><li>נכללות רק 10 הסוגיות שבאתר. מה שלא נמדד כאן – יחסים אישיים, דרישות תקציביות, תפקידים, פערים בתוך אותו מודל – לא נכלל.</li><li>הקידוד למודלים מפשט: הבדלים בתוך אותו מודל לא נספרים, ובסולם מדורג המרחקים בין מודלים סמוכים נחשבים שווים.</li><li>כל הרשימות שוקלות אותו דבר במדד, בלי קשר לגודלן.</li><li>הצהרות על שותפויות או על סירוב לשבת עם רשימה אחרת אינן חלק מהמדד; הן מוצגות בנפרד, כלשונן, בפרק "אילוצים מוצהרים", ומשמשות כמסנן ברשימת הצירופים (אפשר לבטל אותו). אוסף ההצהרות אינו ממצה.</li><li>ממוצע יכול להסתיר פער חד בין שתי רשימות. לכן רשימת הצירופים מסודרת לפי הזוג הרחוק ביותר, ומוצגים רק צירופים שבהם כל זוג עובר את סף הקרבה (כברירת מחדל 40), על סמך ' + CO_MINN + ' סוגיות לפחות. הכלל זהה לכל זוג רשימות.</li><li>רשימה עם עמדות רבות שלא קודדו נמדדת על פחות השוואות – ראו את ה"כיסוי".</li></ul></div>' +
      '<details class="panel co-code"><summary>טבלת הקידוד המלאה (10 סוגיות)</summary>' + CO.issues.map(function (is) {
        var byCamp = is.camps.map(function (lab, k) { return { lab: lab, ids: CX.ids.filter(function (id) { return is.lists[id] && is.lists[id].camps.indexOf(k) >= 0; }) }; });
        return '<div class="co-ci"><h4><a href="#/issue/' + is.id + '">' + esc(is.title) + '</a></h4><p class="meta">' + coScaleTxt(is) + '</p><p><b>השאלה שבמחלוקת:</b> ' + esc(is.scope) + '</p>' +
          '<p class="meta">על סמך הניתוח הרוחבי: "' + esc(is.basis) + '"</p><ol class="co-groups">' +
          byCamp.map(function (c) { return '<li><span class="co-gl">' + esc(c.lab) + '</span><span class="co-gn">' + (c.ids.length ? coNames(c.ids, is) : '<span class="meta">–</span>') + '</span></li>'; }).join('') + '</ol>' +
          (Object.keys(is.uncoded).length ? '<p class="meta">לא קודדו: ' + alpha(Object.keys(is.uncoded)).map(function (id) { return esc(lname(id)) + ' (' + esc(CO.reasons[is.uncoded[id].reason]) + ')'; }).join(', ') + '.</p>' : '') +
          Object.keys(is.lists).filter(function (id) { return is.lists[id].decision; }).map(function (id) { return '<p class="meta">' + esc(lname(id)) + ': ' + esc(is.lists[id].decision) + '</p>'; }).join('') + '</div>';
      }).join('') + '<p class="meta">הנתונים: <a href="data/coalition.json">coalition.json</a>, שנבנה ב-tools/build_coalition.py מ-analysis.json ומ-platforms.json, עם בדיקה שכל ציטוט בקידוד מופיע בטקסט המקור.</p></details></section>';
    return h;
  }
  function coGo(over, focusSel) {
    var st = coState(parseHash().q); setHash(coHash(st, over));
    if (focusSel) { var el = $main.querySelector(focusSel); if (el) el.focus(); }
  }

  // ---------- exit polls accuracy (#/exit-polls; data/exitpolls.json, loaded on demand)
  var EP = null, EPerr = '';
  function loadExitPolls() { return getJSON('data/exitpolls.json').then(function (d) { EP = d; }).catch(function (e) { EPerr = e.message || 'שגיאה'; }); }
  // same formulas as tools/build_exitpolls.py (checked by test/exitpolls.test.mjs)
  function epMetrics(lists, seats, blocIds, largeMin) {
    var diff = {}, sabs = 0, w1 = 0, ex = 0, big = [], small = [], thr = [], pb = 0, ab = 0;
    lists.forEach(function (l) {
      var p = seats[l.id] || 0, d = p - l.seats; diff[l.id] = d; sabs += Math.abs(d);
      if (Math.abs(d) <= 1) w1++; if (d === 0) ex++;
      (l.seats >= largeMin ? big : small).push(Math.abs(d));
      if ((p > 0) !== (l.seats > 0)) thr.push(l.id);
      if (blocIds.indexOf(l.id) >= 0) { pb += p; ab += l.seats; }
    });
    function avg(a) { return a.length ? Math.round(a.reduce(function (s, x) { return s + x; }, 0) / a.length * 1000) / 1000 : null; }
    return { diff: diff, sumAbs: sabs, misallocated: sabs / 2, within1: w1, n: lists.length, exact: ex, maeLarge: avg(big), maeSmall: avg(small), bloc: pb, blocActual: ab, blocErr: pb - ab, thresholdMisses: thr };
  }
  // 2026: pure comparison of the last pre-election poll average (polls.json computed) and the exit polls with a seat result.
  // Used only when y2026.results exists (CEC seats). Checked by test/exitpolls.test.mjs.
  function ep26Cmp(y, PD, res) {
    var lists = y.lists.map(function (l) { return { id: l.id, name: l.name, seats: res.seats[l.id] || 0 }; });
    var blocs = PD.blocs.filter(function (b) { return b.id !== 'other'; }).map(function (b) { return { id: b.id, members: b.members.filter(function (m) { return lists.some(function (l) { return l.id === m; }); }) }; });
    function bsum(seats, b) { return b.members.reduce(function (s, m) { return s + (seats[m] || 0); }, 0); }
    var actualB = {}; blocs.forEach(function (b) { actualB[b.id] = bsum(res.seats, b); });
    function row(id, label, seats, kind) {
      var m = epMetrics(lists, seats, [], 0), be = {};
      blocs.forEach(function (b) { var v = bsum(seats, b); be[b.id] = { v: v, err: Math.round((v - actualB[b.id]) * 10) / 10 }; });
      return { id: id, label: label, kind: kind, misallocated: Math.round(m.misallocated * 100) / 100, within1: m.within1, n: m.n, blocs: be };
    }
    var avg = PD.computed.average, rows = [row('avg', 'ממוצע הסקרים (' + PD.computed.n + ')', avg, 'avg')];
    PD.computed.included.map(function (id) { return PD.polls.filter(function (p) { return p.id === id; })[0]; }).filter(Boolean)
      .map(function (p) { var s = {}; Object.keys(p.seats).forEach(function (k) { s[k] = p.seats[k] || 0; }); return row(p.id, p.outlet + ' (' + p.pollster + '), ' + p.date, s, 'poll'); })
      .sort(function (a, b) { return a.label < b.label ? -1 : a.label > b.label ? 1 : 0; }).forEach(function (r) { rows.push(r); });
    y.polls.filter(function (p) { return p.kind === 'initial'; }).forEach(function (p) { rows.push(row(p.id, p.channel, p.seats, 'exit')); });
    var per = lists.map(function (l) { return { id: l.id, name: l.name, result: l.seats, avg: avg[l.id] || 0, d: Math.round(((avg[l.id] || 0) - l.seats) * 10) / 10 }; });
    return { lists: per, blocs: blocs.map(function (b) { return { id: b.id, members: b.members, result: actualB[b.id] }; }), rows: rows };
  }
  function epCh(id) { return (EP.meta.channels[id] || (EP.y2026 && EP.y2026.channels && EP.y2026.channels[id]) || id); }
  function epChOrder() { return Object.keys(EP.meta.channels).sort(function (a, b) { return COLL.compare(epCh(a), epCh(b)); }); }
  function epSign(n) { return n > 0 ? '+' + n : n < 0 ? '−' + Math.abs(n) : '0'; }
  function epNum(x) { return String(Math.round(x * 100) / 100).replace('.', '.'); }
  function epInit() { var a = []; EP.campaigns.forEach(function (c) { c.polls.forEach(function (p) { if (p.kind === 'initial') a.push({ c: c, p: p }); }); }); return a; }
  function epSrcs(ss) { return ss.map(function (s, k) { return srcLink(s.url, 'מקור ' + (k + 1)) + (s.note ? ' <span class="meta">(' + esc(s.note) + ')</span>' : ''); }).join(' · ') + ' <span class="meta">· נשלף ' + fmtDate(ss[0].retrieved) + '</span>'; }
  function epShort(c) { return c.label.replace(/ \(.*\)$/, ''); }

  // chart 1: mis-allocated seats per initial poll, per channel (dots) with min–max range and mean
  function epChart1() {
    var chs = epChOrder(), W = 400, rowH = 64, L = 84, R = 24, T = 34, H = T + chs.length * rowH + 30, max = 10;
    function x(v) { return L + (W - L - R) * v / max; }
    var g = '';
    for (var t = 0; t <= max; t += 2) g += '<line x1="' + x(t) + '" x2="' + x(t) + '" y1="' + (T - 8) + '" y2="' + (H - 26) + '" class="ep-grid"/><text x="' + x(t) + '" y="' + (H - 8) + '" class="ep-ax" text-anchor="middle">' + t + '</text>';
    chs.forEach(function (ch, i) {
      var y = T + i * rowH + rowH / 2, s = EP.summary.byChannel[ch];
      var ps = epInit().filter(function (o) { return o.p.channel === ch; });
      g += '<text x="' + (L - 12) + '" y="' + (y + 5) + '" class="ep-lab" text-anchor="end">' + esc(epCh(ch)) + '</text>';
      if (s.n > 1) g += '<line x1="' + x(s.min) + '" x2="' + x(s.max) + '" y1="' + y + '" y2="' + y + '" class="ep-range"/><line x1="' + x(s.min) + '" x2="' + x(s.min) + '" y1="' + (y - 8) + '" y2="' + (y + 8) + '" class="ep-range"/><line x1="' + x(s.max) + '" x2="' + x(s.max) + '" y1="' + (y - 8) + '" y2="' + (y + 8) + '" class="ep-range"/>';
      var seen = {};
      ps.forEach(function (o) { var v = o.p.metrics.misallocated, k = seen[v] = (seen[v] || 0) + 1; g += '<circle cx="' + x(v) + '" cy="' + (y - 14 - (k - 1) * 7) + '" r="4" class="ep-dot"><title>' + esc(epShort(o.c) + ': ' + v) + '</title></circle>'; });
      g += '<rect x="' + (x(s.mean) - 2) + '" y="' + (y - 11) + '" width="4" height="22" class="ep-mean"/><text x="' + x(s.mean) + '" y="' + (y + 26) + '" class="ep-val" text-anchor="middle">' + epNum(s.mean) + (s.n === 1 ? ' (1)' : '') + '</text>';
    });
    g += '<text x="' + ((L + W - R) / 2) + '" y="14" class="ep-ax" text-anchor="middle">מושבים שהוקצו לא נכון במדגם הראשוני (22:00)</text>';
    return '<figure class="ep-fig"><svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-labelledby="ep1t" class="ep-svg" direction="ltr"><title id="ep1t">מושבים שהוקצו לא נכון לפי ערוץ: נקודה לכל מערכת בחירות, קו לטווח, פס לממוצע. הנתונים המלאים בטבלה שמתחת.</title>' + g + '</svg>' +
      '<figcaption class="meta">נקודה = מדגם ראשוני אחד (מערכת בחירות אחת). קו אופקי = הטווח מהנמוך לגבוה. פס אנכי ומספר = הממוצע. ציר: 0 עד 10 מושבים.</figcaption></figure>';
  }
  // chart 2: signed bloc error per campaign and channel
  function order0(c) { return c.polls.filter(function (p) { return p.kind === 'initial'; }).length; }
  function epChart2() {
    var camps = EP.campaigns, chs = epChOrder(), W = 400, H = 280, T = 24, B = 56, L = 28, R = 4, lo = -6, hi = 4;
    var gw = (W - L - R) / camps.length, bw = Math.min(22, (gw - 10) / chs.length);
    function y(v) { return T + (H - T - B) * (hi - v) / (hi - lo); }
    var g = '';
    for (var t = lo; t <= hi; t += 2) g += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y(t) + '" y2="' + y(t) + '" class="ep-grid' + (t === 0 ? ' z' : '') + '"/><text x="' + (L - 6) + '" y="' + (y(t) + 4) + '" class="ep-ax" text-anchor="end">' + epSign(t) + '</text>';
    camps.forEach(function (c, i) {
      var x0 = L + i * gw + (gw - order0(c) * (bw + 2)) / 2, ps = c.polls.filter(function (p) { return p.kind === 'initial'; });
      var order = chs.filter(function (ch) { return ps.some(function (p) { return p.channel === ch; }); });
      order.forEach(function (ch, j) {
        var p = ps.filter(function (q) { return q.channel === ch; })[0], e = p.metrics.blocErr, xx = x0 + j * (bw + 2);
        var y1 = Math.min(y(0), y(e)), h = Math.max(2, Math.abs(y(e) - y(0)));
        g += '<rect x="' + xx + '" y="' + y1 + '" width="' + bw + '" height="' + h + '" class="ep-bar"><title>' + esc(epShort(c) + ', ' + epCh(ch) + ': ' + epSign(e)) + '</title></rect>' +
          '<text x="' + (xx + bw / 2) + '" y="' + (e < 0 ? y(e) + 14 : y(e) - 4) + '" class="ep-val" text-anchor="middle">' + epSign(e) + '</text>';
      });
      g += '<text x="' + (L + i * gw + gw / 2) + '" y="' + (H - B + 22) + '" class="ep-ax" text-anchor="middle">' + esc(epShort(c)) + '</text><text x="' + (L + i * gw + gw / 2) + '" y="' + (H - B + 40) + '" class="ep-ax" text-anchor="middle">' + order.length + ' מדגמים</text>';
    });
    return '<figure class="ep-fig"><svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-labelledby="ep2t" class="ep-svg" direction="ltr"><title id="ep2t">ההפרש בין סכום הגוש במדגם הראשוני לבין התוצאה, לכל מערכת בחירות ולכל ערוץ. הנתונים המלאים בטבלה שמתחת.</title>' + g + '</svg>' +
      '<figcaption class="meta">כל עמודה = מדגם ראשוני אחד. מעל הקו: המדגם נתן לגוש יותר מושבים מהתוצאה; מתחת לקו: פחות. בתוך כל מערכת, העמודות מסודרות לפי סדר האלף-בית של שמות הערוצים (' + chs.map(epCh).map(esc).join(', ') + ').</figcaption></figure>';
  }
  function epCampTable(c) {
    var lists = c.lists.slice().sort(function (a, b) { return COLL.compare(a.name, b.name); });
    var ps = c.polls.filter(function (p) { return p.kind === 'initial'; }).sort(function (a, b) { return COLL.compare(epCh(a.channel), epCh(b.channel)); });
    function cell(p, l) { var v = p.seats[l.id], d = p.metrics.diff[l.id]; return '<td class="n">' + v + (d ? ' <span class="ep-d">(' + epSign(d) + ')</span>' : '') + '</td>'; }
    var body = lists.map(function (l) {
      return '<tr><th scope="row">' + esc(l.name) + (l.inBloc ? ' <span class="ep-b" title="בגוש לפי הכלל">●</span><span class="sr"> (בגוש)</span>' : '') + (l.pct != null ? ' <span class="meta">' + l.pct.toFixed(2) + '%</span>' : '') + '</th><td class="n"><b>' + l.seats + '</b></td>' + ps.map(function (p) { return cell(p, l); }).join('') + '</tr>';
    }).join('');
    var foot = [['סכום הגוש', function (p) { return p.metrics.bloc + ' (' + epSign(p.metrics.blocErr) + ')'; }, c.bloc.seats],
      ['מושבים שהוקצו לא נכון', function (p) { return epNum(p.metrics.misallocated); }, '–'],
      ['תחזיות בטווח ±1', function (p) { return p.metrics.within1 + ' מתוך ' + p.metrics.n; }, '–'],
      ['טעויות בחסימה', function (p) { return p.metrics.thresholdMisses.length ? p.metrics.thresholdMisses.map(function (id) { return lname2(c, id); }).join(', ') : 'אין'; }, '–']]
      .map(function (r) { return '<tr class="ep-sum"><th scope="row">' + r[0] + '</th><td class="n">' + r[2] + '</td>' + ps.map(function (p) { return '<td class="n">' + esc(r[1](p)) + '</td>'; }).join('') + '</tr>'; }).join('');
    return '<div class="tbl-wrap ep-w" tabindex="0" role="region" aria-label="' + esc('מדגמים מול תוצאות, ' + c.label + ', אפשר לגלול אופקית') + '"><table class="tbl ep-t"><caption class="ep-cap"><span>' + esc(c.label) + ': מושבים במדגם הראשוני (בסוגריים: ההפרש מהתוצאה). ● = רשימה בגוש לפי הכלל. אחוז = שיעור הקולות של רשימה ליד אחוז החסימה (3.25%).</span></caption><thead><tr><th scope="col">רשימה</th><th scope="col" class="n">תוצאה רשמית</th>' +
      ps.map(function (p) { return '<th scope="col" class="n">' + esc(epCh(p.channel)) + '<br><span class="meta">' + esc(p.pollster) + '</span></th>'; }).join('') + '</tr></thead><tbody>' + body + foot + '</tbody></table></div>';
  }
  function lname2(c, id) { var l = c.lists.filter(function (x) { return x.id === id; })[0]; return l ? l.name : id; }
  function epUpdates(c) {
    var us = c.polls.filter(function (p) { return p.kind === 'update'; });
    if (!us.length && !c.partial.length) return '<p class="meta">לא נמצאו עדכונים מלאים מהלילה.</p>';
    var lists = c.lists.slice().sort(function (a, b) { return COLL.compare(a.name, b.name); });
    var t = us.length ? '<div class="tbl-wrap ep-w" tabindex="0" role="region" aria-label="' + esc('עדכוני הלילה, ' + c.label) + '"><table class="tbl ep-t"><caption class="ep-cap"><span>עדכונים שפורסמו אחרי 22:00 (לא נכללים במדדים הראשיים)</span></caption><thead><tr><th scope="col">רשימה</th><th scope="col" class="n">תוצאה</th>' +
      us.map(function (p) { return '<th scope="col" class="n">' + esc(epCh(p.channel)) + '<br><span class="meta">' + esc(p.time) + '</span></th>'; }).join('') + '</tr></thead><tbody>' +
      lists.map(function (l) { return '<tr><th scope="row">' + esc(l.name) + '</th><td class="n"><b>' + l.seats + '</b></td>' + us.map(function (p) { return '<td class="n">' + p.seats[l.id] + '</td>'; }).join('') + '</tr>'; }).join('') +
      '<tr class="ep-sum"><th scope="row">סכום הגוש</th><td class="n">' + c.bloc.seats + '</td>' + us.map(function (p) { return '<td class="n">' + p.metrics.bloc + ' (' + epSign(p.metrics.blocErr) + ')</td>'; }).join('') + '</tr>' +
      '<tr class="ep-sum"><th scope="row">מושבים שהוקצו לא נכון</th><td class="n">–</td>' + us.map(function (p) { return '<td class="n">' + epNum(p.metrics.misallocated) + '</td>'; }).join('') + '</tr>' +
      '<tr class="ep-sum"><th scope="row">מקורות</th><td class="n">–</td>' + us.map(function (p) { return '<td class="n">' + p.sources.length + (p.status === 'single-source' ? ' <span class="badge">מקור יחיד</span>' : '') + '</td>'; }).join('') + '</tr></tbody></table></div>' : '';
    var src = us.length ? '<ul class="srcs ep-src">' + us.map(function (p) { return '<li>' + esc(epCh(p.channel) + ', ' + p.time) + ': ' + epSrcs(p.sources) + '</li>'; }).join('') + '</ul>' : '';
    var part = c.partial.map(function (x) { return '<p class="note">' + esc(x.text) + ' ' + epSrcs(x.sources) + '</p>'; }).join('');
    return t + src + part;
  }
  function epLS() { // abs error per list prediction, large vs small, across the initial polls
    var a = { L: [0, 0, 0], S: [0, 0, 0] };
    epInit().forEach(function (o) { o.c.lists.forEach(function (l) { var k = l.seats >= EP.meta.largeMin ? 'L' : 'S', e = Math.abs(o.p.metrics.diff[l.id]); a[k][0] += e; a[k][1]++; if (l.seats > 0) a[k][2] += l.seats; }); });
    var sIn = 0; epInit().forEach(function (o) { o.c.lists.forEach(function (l) { if (l.seats > 0 && l.seats < EP.meta.largeMin) sIn += Math.abs(o.p.metrics.diff[l.id]); }); });
    return { L: a.L[0] / a.L[1], S: a.S[0] / a.S[1], nL: a.L[1], nS: a.S[1], shareL: a.L[0] / (a.L[0] + a.S[0]), relL: a.L[0] / a.L[2], relS: sIn / a.S[2] };
  }
  function ep26Src(p) { // 2026 rows: one note per poll (stored on every source), then the links
    var n = (p.sources[0] && p.sources[0].note) || '';
    return p.sources.map(function (s, k) { return srcLink(s.url, 'מקור ' + (k + 1)); }).join(' · ') + ' <span class="meta">· נשלף ' + fmtDate(p.sources[0].retrieved) + '</span>' + (n ? '<br><span class="meta">' + esc(n) + '</span>' : '');
  }
  function ep26Table(y, ps, lists, res, cap, aria) {
    var h = '<div class="tbl-wrap ep-w" tabindex="0" role="region" aria-label="' + esc(aria) + '"><table class="tbl ep-t"><caption class="ep-cap"><span>' + esc(cap) + (res ? '; ' + esc(res.label) : '') + '</span></caption><thead><tr><th scope="col">רשימה</th>' + (res ? '<th scope="col" class="n">' + esc(res.short || 'תוצאה') + '</th>' : '') +
      ps.map(function (p) { return '<th scope="col" class="n">' + esc(epCh(p.channel)) + '<br><span class="meta">' + esc(p.time) + (p.kind === 'update' ? ' · עדכון' : '') + '</span></th>'; }).join('') + '</tr></thead><tbody>' +
      lists.map(function (l) { return '<tr><th scope="row">' + esc(l.name) + '</th>' + (res ? '<td class="n"><b>' + (res.seats[l.id] || 0) + '</b></td>' : '') + ps.map(function (p) { return '<td class="n">' + (p.seats[l.id] || 0) + '</td>'; }).join('') + '</tr>'; }).join('') +
      '<tr class="ep-sum"><th scope="row">סה"כ</th>' + (res ? '<td class="n">120</td>' : '') + ps.map(function (p) { return '<td class="n">' + Object.keys(p.seats).reduce(function (s, k) { return s + p.seats[k]; }, 0) + '</td>'; }).join('') + '</tr>' +
      D.blocs.filter(function (b) { return b.id !== 'other'; }).map(function (b) { return '<tr class="ep-sum"><th scope="row">' + esc(blocShort(b.id)) + ' <span class="meta">(הגדרת האתר)</span></th>' + (res ? '<td class="n">' + b.members.reduce(function (s, m) { return s + (res.seats[m] || 0); }, 0) + '</td>' : '') + ps.map(function (p) { return '<td class="n">' + b.members.reduce(function (s, m) { return s + (p.seats[m] || 0); }, 0) + '</td>'; }).join('') + '</tr>'; }).join('');
    if (res) {
      var rl = lists.map(function (l) { return { id: l.id, seats: res.seats[l.id] || 0 }; });
      var ms = ps.map(function (p) { return epMetrics(rl, p.seats, res.blocLists || [], EP.meta.largeMin); });
      h += '<tr class="ep-sum"><th scope="row">מושבים שהוקצו לא נכון</th><td class="n">–</td>' + ms.map(function (m) { return '<td class="n">' + epNum(m.misallocated) + '</td>'; }).join('') + '</tr>' +
        '<tr class="ep-sum"><th scope="row">תחזיות בטווח ±1</th><td class="n">–</td>' + ms.map(function (m) { return '<td class="n">' + m.within1 + ' מתוך ' + m.n + '</td>'; }).join('') + '</tr>' +
        ((res.blocLists || []).length ? '<tr class="ep-sum"><th scope="row">סכום הגוש</th><td class="n">' + ms[0].blocActual + '</td>' + ms.map(function (m) { return '<td class="n">' + m.bloc + ' (' + epSign(m.blocErr) + ')</td>'; }).join('') + '</tr>' : '');
    }
    return h + '</tbody></table></div><ul class="srcs ep-src">' + ps.map(function (p) { return '<li><b>' + esc(epCh(p.channel) + ', ' + p.time) + '</b> (' + esc(p.pollster) + '): ' + ep26Src(p) + '</li>'; }).join('') + '</ul>';
  }
  function ep26Count(y, lists) { // partial CEC count: vote shares only (no seat allocation published yet)
    var c = y.count; if (!c) return '';
    var C = D.computed, ini = y.polls.filter(function (p) { return p.kind === 'initial'; });
    var h = '<h3 id="ep-2026-count">' + esc(c.label) + '</h3><p class="note warn"><b>ספירה חלקית, לא תוצאה.</b> נכון ל-' + esc(fmtStamp(c.asOf)) + '. ' + esc(c.note) + '</p>' +
      '<div class="kpis">' + (c.turnout ? '<div class="kpi"><b>' + c.turnout + '%</b><span>שיעור ההצבעה' + (c.voters ? ' (' + c.voters.toLocaleString('he-IL') + ' מתוך ' + c.eligible.toLocaleString('he-IL') + ')' : '') + '</span></div>' : '') +
      (c.ballots ? '<div class="kpi"><b>' + c.ballots.toLocaleString('he-IL') + '</b><span>קלפיות שנספרו עד כה</span></div>' : '') +
      (c.validVotes ? '<div class="kpi"><b>' + c.validVotes.toLocaleString('he-IL') + '</b><span>קולות כשרים שנספרו עד כה</span></div>' : '') + '</div>' +
      '<div class="tbl-wrap ep-w" tabindex="0" role="region" aria-label="ספירה חלקית מול הסקרים"><table class="tbl ep-t"><caption class="ep-cap"><span>אחוז מהקולות שנספרו עד כה, לצד ממוצע הסקרים האחרון לפני הבחירות (' + esc(fmtDate(C.asOf)) + ') ולצד מדגמי 22:00. אחוזי קולות ומושבים אינם אותה יחידה, ולכן לא מחושב כאן הפרש.</span></caption><thead><tr><th scope="col">רשימה</th><th scope="col" class="n">% מהקולות שנספרו</th><th scope="col">ביחס לאחוז החסימה (' + c.threshold + '%) בספירה עד כה</th><th scope="col" class="n">ממוצע הסקרים (מושבים)</th><th scope="col" class="n">עברה את החסימה בסקרים</th><th scope="col" class="n">טווח מדגמי 22:00 (מושבים)</th></tr></thead><tbody>' +
      lists.map(function (l) { var v = c.pct[l.id], xs = ini.map(function (p) { return p.seats[l.id] || 0; });
        return '<tr><th scope="row">' + esc(l.name) + '</th><td class="n">' + (v != null ? v.toFixed(2) + '%' : '–') + '</td><td>' + (v == null ? '–' : v >= c.threshold ? 'מעל' : 'מתחת') + '</td><td class="n">' + fmtN(C.average[l.id] || 0) + '</td><td class="n">' + (C.passesIn[l.id] || 0) + ' מתוך ' + C.n + '</td><td class="n">' + Math.min.apply(null, xs) + '–' + Math.max.apply(null, xs) + '</td></tr>'; }).join('') +
      '</tbody></table></div><p class="meta">מקורות הספירה: ' + epSrcs(c.sources.map(function (s) { return { url: s.url, retrieved: s.retrieved }; })) + '</p>';
    return h;
  }
  function ep26Compare(y) { // last pre-election poll average + each pollster vs a seat result (only once CEC seats exist)
    var C = D.computed, res = y.results;
    var h = '<h3 id="ep-2026-cmp">ממוצע הסקרים האחרון מול התוצאה</h3>';
    if (!res) return h + '<p class="note">ועדת הבחירות המרכזית עדיין לא פרסמה חלוקת מושבים, ולכן עוד אין השוואה במושבים בין ממוצע הסקרים האחרון (' + esc(fmtDate(C.asOf)) + ', ' + C.n + ' סקרים) או כל מכון סקרים לבין התוצאה. ההשוואה תופיע כאן אוטומטית, באותן נוסחאות, כשהחלוקה תפורסם, ותסומן כחלקית עד לתוצאות הסופיות.</p>';
    var X = ep26Cmp(y, D, res), partial = !/סופי/.test(res.label);
    var mark = partial ? ' <span class="badge">חלקי</span>' : '';
    var bl = X.blocs;
    h += (partial ? '<p class="note warn"><b>לפי ' + esc(res.label) + '.</b> המספרים ישתנו עד התוצאות הסופיות.</p>' : '') +
      '<div class="tbl-wrap ep-w" tabindex="0" role="region" aria-label="ממוצע הסקרים מול התוצאה לפי רשימה"><table class="tbl ep-t"><caption class="ep-cap"><span>לפי רשימה: ממוצע הסקרים (' + esc(fmtDate(C.asOf)) + ') מול ' + esc(res.short || 'התוצאה') + '</span></caption><thead><tr><th scope="col">רשימה</th><th scope="col" class="n">' + esc(res.short || 'תוצאה') + mark + '</th><th scope="col" class="n">ממוצע הסקרים</th><th scope="col" class="n">הפרש (ממוצע פחות תוצאה)</th></tr></thead><tbody>' +
      X.lists.slice().sort(function (a, b) { return COLL.compare(a.name, b.name); }).map(function (l) { return '<tr><th scope="row">' + esc(l.name) + '</th><td class="n"><b>' + l.result + '</b></td><td class="n">' + fmtN(l.avg) + '</td><td class="n">' + epSign(l.d) + '</td></tr>'; }).join('') + '</tbody></table></div>' +
      '<div class="tbl-wrap ep-w" tabindex="0" role="region" aria-label="טעות לפי סקר וגוש"><table class="tbl ep-t"><caption class="ep-cap"><span>הטעות של כל סקר ומדגם: מושבים שהוקצו לא נכון, וסכום כל גוש בהגדרת האתר (בסוגריים: ההפרש מהתוצאה)</span></caption><thead><tr><th scope="col">סקר / מדגם</th><th scope="col" class="n">מושבים שהוקצו לא נכון</th>' +
      bl.map(function (b) { return '<th scope="col" class="n">' + esc(blocShort(b.id)) + ' (' + b.result + ')' + mark + '</th>'; }).join('') + '</tr></thead><tbody>' +
      X.rows.map(function (r) { return '<tr' + (r.kind === 'avg' ? ' class="ep-sum"' : '') + '><th scope="row">' + esc(r.kind === 'exit' ? 'מדגם 22:00, ' + epCh(r.label) : r.label) + '</th><td class="n">' + epNum(r.misallocated) + '</td>' + bl.map(function (b) { var v = r.blocs[b.id]; return '<td class="n">' + fmtN(v.v).replace(/\.0$/, '') + ' (' + epSign(v.err) + ')</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>' +
      '<p class="meta">הגושים לפי הגדרת עמוד הסקרים באתר: ' + D.blocs.filter(function (b) { return b.id !== 'other'; }).map(function (b) { return esc(b.name); }).join('; ') + '. זו לא הגדרת הגוש של 2019–2022 (ההמלצות לנשיא). הסקרים בממוצע: ' + esc(C.n) + ' הסקרים האחרונים של כל כלי תקשורת בין ' + esc(fmtDate(C.window[0])) + ' ל-' + esc(fmtDate(C.window[1])) + ' (data/polls.json).</p>';
    return h;
  }
  function ep2026() {
    var y = EP.y2026; if (!y) return '';
    var h = '<h2 id="ep-2026">2026: מדגמי הערב</h2>';
    if (!y.polls.length) return h + '<p class="note">' + esc(y.note) + '</p>';
    var lists = y.lists.slice().sort(function (a, b) { return COLL.compare(a.name, b.name); }), res = y.results;
    var ini = y.polls.filter(function (p) { return p.kind === 'initial'; }).sort(function (a, b) { return COLL.compare(epCh(a.channel), epCh(b.channel)); });
    var ups = y.polls.filter(function (p) { return p.kind === 'update'; });
    h += '<p>' + esc(y.note) + '</p>' + (y.updatedAt ? '<p class="meta">עודכן: ' + esc(fmtStamp(y.updatedAt)) + '. הערוצים והרשימות לפי סדר האלף-בית; העדכונים לפי סדר פרסומם. הגושים לפי הגדרת עמוד הסקרים באתר.</p>' : '') +
      ep26Table(y, ini, lists, res, 'מדגמי 22:00, 27.10.2026, כפי שפורסמו', 'מדגמי 2026 ב-22:00') +
      (ups.length ? '<details><summary>עדכוני הלילה (' + ups.length + ')</summary>' + ep26Table(y, ups, lists, res, 'עדכונים שפורסמו אחרי 22:00, לפי סדר הפרסום', 'עדכוני הלילה 2026') + '</details>' : '');
    if (res) h += '<p class="meta">' + esc(res.note || '') + ' ' + (res.source ? epSrcs([res.source]) : '') + (y.status === 'frozen' ? ' הנתונים של 2026 הוקפאו ב-' + fmtDate(y.frozenAt) + ' ולא ישתנו.' : '') + '</p>';
    return h + ep26Count(y, lists) + ep26Compare(y);
  }
  function pageExitPolls() {
    var hd = head('מדגמים', 'עד כמה דייקו מדגמי ערב הבחירות?', 'השוואה של מדגמי הטלוויזיה שפורסמו ב-22:00 בחמש מערכות הבחירות האחרונות (2019–2022) מול התוצאות הרשמיות של ועדת הבחירות המרכזית. בלי תחזית ובלי שיפוט: רק מה שפורסם, מה שנספר, והפער ביניהם. <a href="#ep-method">איך זה מחושב</a>');
    if (!EP) return hd + (EPerr ? '<div class="empty" role="alert"><b>שגיאה בטעינת נתוני המדגמים</b><p>' + esc(EPerr) + '. נסו לרענן את הדף.</p></div>' : '<div class="skel" aria-hidden="true"><i></i><i></i><i></i></div><p class="sr" role="status">טוען…</p>');
    var S = EP.summary, ini = epInit(), mis = ini.map(function (o) { return o.p.metrics.misallocated; });
    var thrPolls = ini.filter(function (o) { return o.p.metrics.thresholdMisses.length; }).length;
    var be = ini.map(function (o) { return o.p.metrics.blocErr; }), ls = epLS();
    var chs = epChOrder();
    var kpis = '<div class="kpis"><div class="kpi big"><b>' + S.nInitial + '</b><span>מדגמים ראשוניים (22:00) ב-5 מערכות בחירות</span></div>' +
      '<div class="kpi"><b>' + fmtN(S.meanMisallocated) + '</b><span>מושבים שהוקצו לא נכון, בממוצע למדגם (טווח ' + Math.min.apply(null, mis) + '–' + Math.max.apply(null, mis) + ')</span></div>' +
      '<div class="kpi"><b>' + (Math.round((1 - S.meanMisallocated / 120) * 1000) / 10) + '%</b><span>מ-120 המושבים הוקצו לרשימה הנכונה, בממוצע</span></div>' +
      '<div class="kpi"><b>' + Math.round(S.within1Share * 1000) / 10 + '%</b><span>מהתחזיות לרשימות בודדות סטו לכל היותר במושב אחד</span></div>' +
      '<div class="kpi"><b>' + thrPolls + ' מתוך ' + S.nInitial + '</b><span>מדגמים טעו לפחות ברשימה אחת: עוברת או לא עוברת את אחוז החסימה</span></div></div>';
    var t1 = '<details><summary>הנתונים כטבלה</summary><div class="tbl-wrap ep-w" tabindex="0" role="region" aria-label="מושבים שהוקצו לא נכון לפי ערוץ ומערכת"><table class="tbl ep-t"><caption class="ep-cap"><span>מושבים שהוקצו לא נכון במדגם הראשוני</span></caption><thead><tr><th scope="col">ערוץ</th>' + EP.campaigns.map(function (c) { return '<th scope="col" class="n">' + esc(epShort(c)) + '</th>'; }).join('') + '<th scope="col" class="n">ממוצע</th></tr></thead><tbody>' +
      chs.map(function (ch) { return '<tr><th scope="row">' + esc(epCh(ch)) + '</th>' + EP.campaigns.map(function (c) { var p = c.polls.filter(function (q) { return q.kind === 'initial' && q.channel === ch; })[0]; return '<td class="n">' + (p ? epNum(p.metrics.misallocated) : '<span class="meta">לא פורסם</span>') + '</td>'; }).join('') + '<td class="n"><b>' + epNum(S.byChannel[ch].mean) + '</b></td></tr>'; }).join('') + '</tbody></table></div></details>';
    var t2 = '<details><summary>הנתונים כטבלה</summary><div class="tbl-wrap ep-w" tabindex="0" role="region" aria-label="סכום הגוש במדגם מול התוצאה"><table class="tbl ep-t"><caption class="ep-cap"><span>סכום הגוש במדגם הראשוני (בסוגריים: ההפרש מהתוצאה)</span></caption><thead><tr><th scope="col">מערכת</th><th scope="col" class="n">תוצאה</th>' + chs.map(function (ch) { return '<th scope="col" class="n">' + esc(epCh(ch)) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      EP.campaigns.map(function (c) { return '<tr><th scope="row">' + esc(epShort(c)) + '</th><td class="n"><b>' + c.bloc.seats + '</b></td>' + chs.map(function (ch) { var p = c.polls.filter(function (q) { return q.kind === 'initial' && q.channel === ch; })[0]; return '<td class="n">' + (p ? p.metrics.bloc + ' (' + epSign(p.metrics.blocErr) + ')' : '<span class="meta">–</span>') + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div><ul class="ep-src">' + EP.campaigns.map(function (c) { return '<li><b>' + esc(epShort(c)) + ':</b> ' + c.bloc.lists.map(function (id) { return lname2(c, id); }).sort(COLL.compare).map(esc).join(', ') + ' · ' + srcLink(c.bloc.source.url, 'מקור') + '</li>'; }).join('') + '</ul></details>';
    var thrList = '<ul>' + ini.filter(function (o) { return o.p.metrics.thresholdMisses.length; }).map(function (o) {
      return '<li><b>' + esc(epShort(o.c)) + ', ' + esc(epCh(o.p.channel)) + ':</b> ' + o.p.metrics.thresholdMisses.map(function (id) { var l = o.c.lists.filter(function (x) { return x.id === id; })[0]; return esc(l.name) + ' (במדגם ' + o.p.seats[id] + ', בתוצאה ' + l.seats + (l.pct != null ? ', ' + l.pct.toFixed(2) + '% מהקולות' : '') + ')'; }).join('; ') + '</li>';
    }).join('') + '</ul>';
    var camps = EP.campaigns.map(function (c) {
      var ps = c.polls.filter(function (p) { return p.kind === 'initial'; });
      var conf = ps.filter(function (p) { return p.conflicts; }).map(function (p) { return p.conflicts.map(function (x) { return '<p class="note warn"><b>מקורות סותרים, ' + esc(epCh(p.channel)) + ':</b> ' + esc(x.note) + ' ' + epSrcs(x.sources) + '</p>'; }).join(''); }).join('');
      return '<section class="ep-camp" id="ep-' + c.id + '"><h3>' + esc(c.label) + '</h3><p class="meta">תוצאה רשמית: ' + srcLink(c.cec.url, 'ועדת הבחירות המרכזית') + ' (נשלף ' + fmtDate(c.cec.retrieved) + ') · כלל הגוש: ' + srcLink(c.bloc.source.url, 'ההמלצות לנשיא') + ' (' + esc(c.bloc.source.note) + ')</p>' + epCampTable(c) + conf +
        '<ul class="srcs ep-src">' + ps.slice().sort(function (a, b) { return COLL.compare(epCh(a.channel), epCh(b.channel)); }).map(function (p) { return '<li>' + esc(epCh(p.channel)) + ': ' + epSrcs(p.sources) + '</li>'; }).join('') + '</ul>' +
        '<details><summary>עדכוני הלילה (' + c.polls.filter(function (p) { return p.kind === 'update'; }).length + ')</summary>' + epUpdates(c) + '</details></section>';
    }).join('');
    var R = EP.meta.rules;
    return hd + kpis +
      '<h2>הטעות בכל ערוץ</h2><p>"מושבים שהוקצו לא נכון" הוא מספר המושבים שהמדגם שם אצל רשימה אחרת מזו שקיבלה אותם בפועל. 0 = מדגם זהה לתוצאה. ממוצע לכל ערוץ: ' + chs.map(function (ch) { return esc(epCh(ch)) + ' ' + epNum(S.byChannel[ch].mean) + ' (' + S.byChannel[ch].n + (S.byChannel[ch].n === 1 ? ' מדגם' : ' מדגמים') + ')'; }).join(' · ') + '.</p>' + epChart1() + t1 +
      '<p class="note">ההבדלים בין הערוצים קטנים ממושב אחד בממוצע, על בסיס 5 מדגמים לכל ערוץ (ומדגם אחד בלבד בערוץ 14), ולכן אין בהם בסיס לדירוג. בכל ערוץ הטווח בין מערכות הבחירות רחב יותר מההבדל בין הערוצים.</p>' +
      '<h2>הטעות בסכום הגוש</h2><p>כאן נבדק סכום המושבים של הרשימות שהמליצו לנשיא על בנימין נתניהו אחרי כל מערכת. אותו הרכב רשימות מוחל על המדגם ועל התוצאה. הטעות נעה בין ' + epSign(Math.min.apply(null, be)) + ' ל-' + epSign(Math.max.apply(null, be)) + ' מושבים. כיוון הטעות היה אחיד בתוך רוב המערכות: באפריל 2019 ובנובמבר 2022 כל המדגמים נתנו לגוש פחות מהתוצאה; במרץ 2020 ובמרץ 2021 כל המדגמים נתנו יותר; בספטמבר 2019 הכיוון היה מעורב.</p>' + epChart2() + t2 +
      '<h2>רשימות גדולות ורשימות קטנות</h2><p>' + esc(R.large) + ' הטעות הממוצעת בתחזית לרשימה גדולה: ' + epNum(ls.L) + ' מושבים (' + ls.nL + ' תחזיות). לרשימה קטנה: ' + epNum(ls.S) + ' מושבים (' + ls.nS + ' תחזיות). כלומר במושבים, הטעות הממוצעת לרשימה דומה בשתי הקבוצות. יש הרבה יותר רשימות קטנות, ולכן ' + Math.round((1 - ls.shareL) * 100) + '% מסך הסטיות הן ברשימות קטנות. יחסית לגודל: ברשימות הגדולות הסטיות הן ' + Math.round(ls.relL * 1000) / 10 + '% מהמושבים שקיבלו, וברשימות הקטנות שנכנסו לכנסת ' + Math.round(ls.relS * 1000) / 10 + '%.</p>' +
      '<h2>אחוז החסימה</h2><p>הטעויות הגדולות ביותר ברשימה בודדת קרו כשרשימה עברה את אחוז החסימה (3.25%) במדגם ולא בתוצאה, או להפך. טעות כזו מזיזה 4 מושבים או יותר בבת אחת. ב-' + thrPolls + ' מתוך ' + S.nInitial + ' המדגמים הראשוניים הייתה טעות כזו:</p>' + thrList +
      '<p>בכל המקרים האלה הרשימה קיבלה בתוצאה בין 3.16% ל-3.79% מהקולות, כלומר קרוב מאוד לסף. במרץ 2021 שלושת המדגמים, וגם כל עדכוני הלילה שנמצאו, נתנו לרע"מ 0 מושבים; בתוצאה היא קיבלה 4. בנובמבר 2022 ארבעת המדגמים נתנו למרצ 4–5 מושבים; בתוצאה היא לא עברה את אחוז החסימה.</p>' +
      '<h2 id="ep-tonight">איך לקרוא מדגם בערב הבחירות</h2><div class="note"><ul>' +
      '<li>מדגם הוא הערכה, לא תוצאה. במערכות 2019–2022 מדגם ראשוני הקצה לא נכון ' + Math.min.apply(null, mis) + ' עד ' + Math.max.apply(null, mis) + ' מושבים, ובממוצע ' + epNum(S.meanMisallocated) + '.</li>' +
      '<li>סכום הגוש במדגם הראשוני היה רחוק מהתוצאה ב-' + Math.min.apply(null, be.map(Math.abs)) + ' עד ' + Math.max.apply(null, be.map(Math.abs)) + ' מושבים, ואף פעם לא היה זהה לה. הפרש של מושבים בודדים סביב 61 לא הכריע מראש בשום מערכת.</li>' +
      '<li>רשימה שקרובה לאחוז החסימה במדגם (4–5 מושבים) היא המקור העיקרי לאי-ודאות: אם היא לא עוברת, 4 מושבים ומעלה עוברים לרשימות אחרות.</li>' +
      '<li>המדגמים מתעדכנים במהלך הלילה. בחלק מהמערכות העדכונים התקרבו לתוצאה ובחלק לא (למשל רע"מ ב-2021, מרצ ב-2022).</li>' +
      '<li>התוצאה המחייבת היא של ועדת הבחירות המרכזית, אחרי ספירת כל הקולות, כולל המעטפות הכפולות.</li></ul></div>' +
      ep2026() +
      '<h2>הנתונים לפי מערכת בחירות</h2><p class="meta">סדר הרשימות והערוצים: לפי סדר האלף-בית.</p>' + camps +
      '<h2 id="ep-method">שיטה</h2><ul>' + ['scope', 'absent', 'lists', 'misallocated', 'within1', 'bloc', 'large'].map(function (k) { return '<li>' + esc(R[k]) + '</li>'; }).join('') +
      '<li>לכל מדגם נרשמו לפחות שני מקורות שפרסמו את המספרים בזמן אמת, חוץ מעדכונים שמסומנים "מקור יחיד". ויקיפדיה שימשה רק כמוביל ולא נספרת כמקור מאמת. כל המקורות נשלפו ב-' + fmtDate(EP.meta.retrieved) + '.</li>' +
      '<li>"' + (Math.round((1 - S.meanMisallocated / 120) * 1000) / 10) + '% מהמושבים הוקצו נכון" = 1 פחות (ממוצע המושבים שהוקצו לא נכון ÷ 120). זה לא שיעור התחזיות "הנכונות" לרשימות: רק ' + Math.round(S.within1Share * 1000) / 10 + '% מהתחזיות לרשימות בודדות היו בטווח של מושב אחד, ו-' + Math.round(ini.reduce(function (s, o) { return s + o.p.metrics.exact; }, 0) / ini.reduce(function (s, o) { return s + o.p.metrics.n; }, 0) * 1000) / 10 + '% היו מדויקות.</li>' +
      '<li>הנתונים והחישובים: <a href="data/exitpolls.json">exitpolls.json</a>, נבנה בסקריפט tools/build_exitpolls.py ונבדק בבדיקה אוטומטית שמחשבת מחדש כל מדד.</li></ul>' +
      '<h2>מגבלות</h2><ul><li>16 מדגמים בחמש מערכות הם מדגם קטן. אין כאן בסיס סטטיסטי להשוואה בין ערוצים או לניבוי הטעות במערכת הבאה.</li><li>כלל הגוש מכני ונקבע לפי ההמלצות לנשיא אחרי הבחירות. הוא לא בהכרח תואם את הגושים שהערוצים עצמם הציגו בערב הבחירות.</li><li>הכלל "גדולה = 10 מושבים ומעלה" נבחר מראש ונקבע לפי התוצאה. כלל אחר ייתן מספרים אחרים.</li><li>חלק מעדכוני הלילה נמצאו במקור אחד בלבד, ולחלקם לא צוינה שעה.</li></ul>' +
      '<h2>מה לא הצלחנו לאמת</h2><ul><li>אפריל 2019, חדשות 12: ארבעה מקורות מוסרים לחד"ש-תע"ל ולרע"מ-בל"ד 6 ו-6, ומעריב ואתר עוזית מוסרים 7 ו-5. בחרנו ב-6 ו-6. אין לכך השפעה על המדדים.</li><li>אפריל 2019: לא נמצא פירוט מלא של עדכוני הלילה, רק מספרים חלקיים.</li><li>ספטמבר 2019, עדכון חדשות 12: המספרים אומתו מול אתר עוזית ומול גלובס, ולפיהם הגוש 55. ב-Times of Israel מופיע 54, ולא ברור לאיזה עדכון הכוונה. השעה 02:10 היא לפי אתר עוזית, ולפי גלובס העדכון שודר בסביבות 02:30.</li><li>נובמבר 2022: לעדכוני הלילה של כאן 11 ושל חדשות 13 לא נמצאה שעה מדויקת, ולערוץ 14 לא נמצאו עדכונים.</li><li>לא נמצא בארכיון פרסום רשמי של הערוצים עצמם לכל המדגמים, ולכן המקורות הם כתבות שפורסמו באותו לילה ואתר מעקב.</li><li>בטבלאות של ויקיפדיה נמצאו טעויות: שורות שסכומן 121, עדכונים מאוחרים שמוצגים כמדגם הראשוני, ופיצול שגוי של מושבים. לכן לא הסתמכנו עליהן.</li><li>מדגמים שלא שודרו בטלוויזיה (למשל מדגם באתר ynet באפריל 2019) לא נכללו.</li></ul>';
  }

  // ---------- router
  function parseHash() {
    var h = location.hash.replace(/^#\/?/, ''), qs = {}, qi = h.indexOf('?');
    if (qi >= 0) { h.slice(qi + 1).split('&').forEach(function (kv) { var p = kv.split('='); if (p[0]) qs[decodeURIComponent(p[0])] = decodeURIComponent(p[1] || ''); }); h = h.slice(0, qi); }
    var parts = h.split('/').filter(Boolean);
    return { page: parts[0] || 'home', arg: parts[1] ? decodeURIComponent(parts[1]) : '', q: qs };
  }
  // ---- #/outlook: statistical estimate from data/outlook.json (built by tools/build_outlook.py). Not an official result.
  var OL = null, OLerr = '';
  function loadOutlook() { return getJSON('data/outlook.json').then(function (d) { OL = d; }).catch(function (e) { OLerr = e.message || 'שגיאה'; }); }
  // Bader–Ofer (3.25% threshold, surplus agreements). Same algorithm as tools/build_outlook.py; checked by test/outlook.test.mjs
  function olBO(votes, agreements, seats, thr) {
    seats = seats || 120; thr = thr == null ? 0.0325 : thr;
    var valid = 0, k; for (k in votes) valid += votes[k];
    var pass = {}, tot = 0; for (k in votes) if (k !== 'other' && votes[k] >= thr * valid) { pass[k] = votes[k]; tot += votes[k]; }
    var q = tot / seats, s = {}, used = {}, units = [];
    for (k in pass) s[k] = Math.floor(pass[k] / q);
    (agreements || []).forEach(function (a) { if (pass[a[0]] != null && pass[a[1]] != null) { units.push(a); used[a[0]] = used[a[1]] = 1; } });
    for (k in pass) if (!used[k]) units.push([k]);
    var us = units.map(function (u) { return u.reduce(function (t, x) { return t + s[x]; }, 0); }), uv = units.map(function (u) { return u.reduce(function (t, x) { return t + pass[x]; }, 0); });
    var left = seats - units.reduce(function (t, u, i) { return t + us[i]; }, 0);
    for (var n = 0; n < left; n++) { var bi = 0; for (var i = 1; i < units.length; i++) { var a = uv[i] / (us[i] + 1), b = uv[bi] / (us[bi] + 1); if (a > b || (a === b && uv[i] > uv[bi])) bi = i; } us[bi]++; }
    var out = {}; for (k in votes) if (k !== 'other') out[k] = 0;
    units.forEach(function (u, i) {
      if (u.length === 1) { out[u[0]] = us[i]; return; }
      var qq = uv[i] / us[i], ss = {}, got = 0; u.forEach(function (x) { ss[x] = Math.floor(pass[x] / qq); got += ss[x]; });
      for (var m = got; m < us[i]; m++) { var best = u[0]; u.forEach(function (x) { var a = pass[x] / (ss[x] + 1), b = pass[best] / (ss[best] + 1); if (a > b || (a === b && pass[x] > pass[best])) best = x; }); ss[best]++; }
      u.forEach(function (x) { out[x] = ss[x]; });
    });
    return out;
  }
  function olN(x) { return Math.round(x).toLocaleString('he-IL'); }
  function olP(x) { return x.toFixed(2) + '%'; }
  function olK(x) { return Math.round(x / 1000).toLocaleString('he-IL'); }
  function olRng(s) { return s.p10 === s.p90 ? String(s.p50) : s.p10 + '–' + s.p90; }
  function olSorted() { return OL.projection.slice().sort(function (a, b) { return COLL.compare(a.name, b.name); }); }
  function olName(id) { return OL.projection.filter(function (p) { return p.id === id; })[0].name; }
  function olShort(lbl) { return lbl.split(' (')[0]; }
  function olClose() { // lists whose seat count is genuinely uncertain (second outcome ≥ 5% of simulations)
    return OL.projection.filter(function (p) { var v = Object.keys(p.pSeats).map(function (k) { return p.pSeats[k]; }).sort(function (a, b) { return b - a; }); return v.length > 1 && v[1] >= 5; })
      .sort(function (a, b) { var m = function (p) { var g = OL.midScenario.margins[p.id] || {}; return Math.min(g.gain == null ? 1e9 : g.gain, g.lose == null ? 1e9 : g.lose); }; return m(a) - m(b) || COLL.compare(a.name, b.name); });
  }
  function olThink() {
    var E = OL.envelopes, ls = olSorted().filter(function (p) { return p.seats.p90 > 0; }), out = olSorted().filter(function (p) { return p.seats.p90 === 0; });
    var close = olClose(), M = OL.midScenario.margins;
    var dist = function (p) { return Object.keys(p.pSeats).filter(function (k) { return p.pSeats[k] >= 1; }).map(function (k) { return k + ' (' + Math.round(p.pSeats[k]) + '%)'; }).join(' או '); };
    return '<p>הספירה כמעט הסתיימה. כל הקלפיות הרגילות נספרו, ונשארו כ-' + olK(E.remainingValidRange[0]) + '–' + olK(E.remainingValidRange[1]) + ' אלף קולות כשרים במעטפות כפולות, כ-' + Math.round(100 * (E.remainingValidRange[0] + E.remainingValidRange[1]) / 2 / (OL.count.valid + (E.remainingValidRange[0] + E.remainingValidRange[1]) / 2)) + '% מכל הקולות. לכן התמונה הכללית כבר יציבה, ומה שנשאר פתוח הוא מושבים בודדים.</p>' +
      '<p>לפי ההערכה שלי (חציון, ובסוגריים הטווח שבו נמצאות 80% מההדמיות): ' + ls.map(function (p) { return esc(p.name) + ' ' + p.seats.p50 + (p.seats.p10 !== p.seats.p90 ? ' (' + olRng(p.seats) + ')' : ''); }).join(', ') + '. ' +
      (out.length ? out.map(function (p) { return esc(p.name) + ' (כ-' + p.pct.p50.toFixed(1) + '%)'; }).join(' ו') + ' לא עוברות את אחוז החסימה בשום הדמיה. ' : '') + '</p>' +
      (close.length ? '<p>המושבים הפתוחים ביותר: ' + close.map(function (p) { var g = M[p.id] || {}; return esc(p.name) + ': ' + dist(p) + (g.gain != null && g.gain < (g.lose || 1e9) ? ', בתרחיש המרכזי חסרים לה כ-' + olN(g.gain) + ' קולות למושב נוסף' : g.lose != null ? ', בתרחיש המרכזי היא מעל המושב האחרון בכ-' + olN(g.lose) + ' קולות' : ''); }).join('; ') + '. חלק מההכרעות האלה הן בתוך זוג רשימות עם הסכם עודפים, כך שמושב עובר בין שתי הרשימות בזוג ולא משנה את סכום הזוג.</p>' : '') +
      '<p>סכומי הגושים, לפי העמדות שהרשימות עצמן הצהירו לפני הבחירות: ' + OL.blocs.filter(function (b) { return b.p90 > 0; }).map(function (b) { return esc(b.name) + ': ' + b.p50 + (b.p10 !== b.p90 ? ' (' + b.p10 + '–' + b.p90 + ')' : ''); }).join('; ') + '. ' + esc(OL.blocNote) + '</p>' +
      '<p>מה עלול להיות שונה: אני לא יודע בדיוק כמה מעטפות נשארו (טווח ' + olK(E.totalRange[0]) + '–' + olK(E.totalRange[1]) + ' אלף בסך הכול), והרכב המעטפות השתנה מאוד בין המנות שנספרו. גם תיקונים של ועדת הבחירות אחרי הספירה יכולים להזיז מושב. זו הערכה סטטיסטית, לא תוצאה רשמית. התוצאה המחייבת היא של ועדת הבחירות המרכזית.</p>';
  }
  function pageOutlook() {
    var hd = head('תחזית', 'תחזית והקשר היסטורי', 'מה עוד לא נספר, איך זה עשוי להשפיע על המושבים, ואיך 2026 נראית מול חמש מערכות הבחירות הקודמות. <a href="#ol-method">איך זה מחושב</a>');
    if (!OL) return hd + (OLerr ? '<div class="empty" role="alert"><b>שגיאה בטעינת נתוני התחזית</b><p>' + esc(OLerr) + '. נסו לרענן את הדף.</p></div>' : '<div class="skel" aria-hidden="true"><i></i><i></i><i></i></div><p class="sr" role="status">טוען…</p>');
    var E = OL.envelopes, C = OL.count, ps = olSorted(), BT = OL.backtestSummary, cmp = OL.compare, hist = OL.history, Y = OL.y26;
    var src = function (ss) { return ss.map(function (s) { return srcLink(s.url, s.note ? s.note : 'מקור'); }).join(' · '); };
    var banner = '<div class="note warn ol-banner" role="note"><b>' + esc(OL.disclaimer) + '.</b> הנתונים חלקיים. הספירה האחרונה שנכללה: ' + fmtStamp(C.asOf) + ', ' + esc(C.label) + ' (' + olN(C.valid) + ' קולות כשרים). ' + src(C.sources) + '. אין עדיין חלוקת מושבים רשמית.</div>';
    var kpis = '<div class="kpis"><div class="kpi big"><b>' + olK(E.countedNow) + ' אלף</b><span>מעטפות כפולות נספרו (מתוך ' + olK(E.totalRange[0]) + '–' + olK(E.totalRange[1]) + ' אלף, הערכה)</span></div>' +
      '<div class="kpi"><b>' + olK(E.remainingValidRange[0]) + '–' + olK(E.remainingValidRange[1]) + ' אלף</b><span>קולות כשרים שעוד לא נספרו (הערכה)</span></div>' +
      '<div class="kpi"><b>' + Y.turnoutFinalEst.toFixed(1) + '%</b><span>שיעור הצבעה משוער (' + Y.turnoutFinalRange[0].toFixed(1) + '–' + Y.turnoutFinalRange[1].toFixed(1) + '%)</span></div>' +
      '<div class="kpi"><b>' + BT.mae.toFixed(2) + '</b><span>נקודות אחוז: טעות ממוצעת בבדיקה לאחור על 2019–2022</span></div></div>';
    // (א) envelopes
    var tA = '<div class="tbl-wrap ol-w" tabindex="0" role="region" aria-label="אחוזים: נספר, מעטפות ותחזית"><table class="tbl ol-t"><caption class="sr">אחוז הקולות לפי רשימה: נספר עד כה, במעטפות הכפולות, וההערכה לתוצאה הסופית</caption><thead><tr><th scope="col">רשימה</th><th scope="col" class="n">נספר עד ' + C.asOf.slice(11, 16) + '</th><th scope="col" class="n">בקלפיות הרגילות בלבד</th><th scope="col" class="n">במעטפות שנספרו</th><th scope="col" class="n">הנחה למעטפות שנותרו</th><th scope="col" class="n">הערכה סופית (טווח 10%–90%)</th></tr></thead><tbody>' +
      ps.map(function (p) { return '<tr data-ol="' + p.id + '"><th scope="row">' + esc(p.name) + '</th><td class="n">' + olP(p.counted) + '</td><td class="n">' + olP(p.regOnly) + '</td><td class="n">' + olP(p.envSoFar) + '</td><td class="n">' + p.envRemainingMu.toFixed(1) + '% ± ' + p.envRemainingSd.toFixed(1) + '</td><td class="n"><b data-ol-pct>' + olP(p.pct.p50) + '</b> <span class="meta">(' + p.pct.p10.toFixed(2) + '–' + p.pct.p90.toFixed(2) + ')</span></td></tr>'; }).join('') + '</tbody></table></div>';
    var tBatch = '<details><summary>הרכב המעטפות לפי מנות ספירה (' + E.batches.length + ')</summary><div class="tbl-wrap ol-w" tabindex="0" role="region" aria-label="מנות מעטפות"><table class="tbl ol-t"><thead><tr><th scope="col">רשימה</th>' + E.batches.map(function (b, i) { return '<th scope="col" class="n">מנה ' + (i + 1) + '<br><span class="meta">' + olN(b.n) + '</span></th>'; }).join('') + '</tr></thead><tbody>' +
      ps.map(function (p) { return '<tr><th scope="row">' + esc(p.name) + '</th>' + E.batches.map(function (b) { return '<td class="n">' + b.pct[p.id].toFixed(1) + '%</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div><p class="meta">מנות 1–3: אחוזים מצטברים שפורסמו (הוחסרו זה מזה); מנה 4: ההפרש בין ספירת 11:16 לספירת 18:04. מקורות: ' + E.batches.map(function (b, i) { return /^https?:/.test(b.src) ? srcLink(b.src, 'מנה ' + (i + 1)) : 'מנה ' + (i + 1) + ': ' + esc(b.src); }).join(' · ') + '</p></details>';
    // (ב) seats
    var tB = '<div class="tbl-wrap ol-w" tabindex="0" role="region" aria-label="הערכת מושבים"><table class="tbl ol-t"><caption class="sr">הערכת מושבים לפי רשימה</caption><thead><tr><th scope="col">רשימה</th><th scope="col" class="n">חציון</th><th scope="col" class="n">טווח 10%–90%</th><th scope="col">הסתברות לכל תוצאה</th><th scope="col" class="n">בלי הסכמי עודפים (ממוצע)</th><th scope="col" class="n">השפעת ההסכמים</th></tr></thead><tbody>' +
      ps.map(function (p) { return '<tr data-ol="' + p.id + '"><th scope="row">' + esc(p.name) + '</th><td class="n"><b data-ol-seat>' + p.seats.p50 + '</b></td><td class="n" data-ol-rng>' + olRng(p.seats) + '</td><td>' + Object.keys(p.pSeats).filter(function (k) { return p.pSeats[k] >= 0.5; }).map(function (k) { return k + ': ' + Math.round(p.pSeats[k]) + '%'; }).join(' · ') + '</td><td class="n">' + p.seatsNoAgr.mean.toFixed(2) + '</td><td class="n">' + (p.agreementEffect > 0 ? '+' : '') + p.agreementEffect.toFixed(2) + '</td></tr>'; }).join('') + '</tbody></table></div>';
    var modalSum = ps.reduce(function (t, p) { return t + OL.modal[p.id]; }, 0), medSum = ps.reduce(function (t, p) { return t + p.seats.p50; }, 0);
    var modal = '<p>התרחיש השכיח ביותר בהדמיות (' + OL.modalShare.toFixed(0) + '% מהן), חלוקה מלאה של ' + modalSum + ' מושבים: ' + ps.filter(function (p) { return OL.modal[p.id] > 0; }).map(function (p) { return esc(p.name) + ' ' + OL.modal[p.id]; }).join(', ') + '.' + (medSum !== 120 ? ' סכום החציונים בטבלה הוא ' + medSum + ' ולא 120, כי החציון מחושב לכל רשימה בנפרד.' : '') + '</p>';
    var close = olClose(), M = OL.midScenario.margins;
    var closeL = close.length ? '<ul>' + close.map(function (p) { var g = M[p.id] || {}; return '<li><b>' + esc(p.name) + ':</b> ' + Object.keys(p.pSeats).filter(function (k) { return p.pSeats[k] >= 1; }).map(function (k) { return k + ' מושבים ב-' + Math.round(p.pSeats[k]) + '% מההדמיות'; }).join(', ') + '. בתרחיש המרכזי: ' + (g.gain != null ? 'עוד ' + olN(g.gain) + ' קולות למושב נוסף' : '') + (g.gain != null && g.lose != null ? '; ' : '') + (g.lose != null ? 'אובדן ' + olN(g.lose) + ' קולות להפסד מושב' : '') + '.</li>'; }).join('') + '</ul>' : '<p>אין רשימה שמספר המושבים שלה פתוח ביותר מ-5% מההדמיות.</p>';
    var agr = '<p>הסכמי העודפים הרשמיים: ' + OL.agreements.map(function (a) { return esc(olName(a[0])) + ' עם ' + esc(olName(a[1])); }).sort(COLL.compare).join(' · ') + '. ' + src(OL.agreementSources) + '. הטבלה מראה בכמה מושבים בממוצע ההסכמים משנים את התוצאה לכל רשימה.</p>';
    var cmpRows = ps.map(function (p) {
      var c = cmp.counts[cmp.counts.length - 1].seats[p.id];
      var d = function (x) { var v = Math.round((x - p.seats.p50) * 100) / 100; return (v > 0 ? '+' : '') + (Number.isInteger(v) ? v : v.toFixed(1)); };
      return '<tr><th scope="row">' + esc(p.name) + '</th><td class="n"><b>' + p.seats.p50 + '</b></td><td class="n">' + fmtN(cmp.initialAvg[p.id]) + ' <span class="meta">(' + d(cmp.initialAvg[p.id]) + ')</span></td><td class="n">' + fmtN(cmp.allAvg[p.id]) + ' <span class="meta">(' + d(cmp.allAvg[p.id]) + ')</span></td><td class="n">' + fmtN(cmp.pollAverage[p.id]) + ' <span class="meta">(' + d(cmp.pollAverage[p.id]) + ')</span></td><td class="n">' + c + ' <span class="meta">(' + d(c) + ')</span></td></tr>';
    }).join('');
    var tC = '<div class="tbl-wrap ol-w" tabindex="0" role="region" aria-label="השוואה למדגמים ולסקרים"><table class="tbl ol-t"><caption class="sr">ההערכה מול המדגמים, הסקרים והספירה</caption><thead><tr><th scope="col">רשימה</th><th scope="col" class="n">הערכה (חציון)</th><th scope="col" class="n">ממוצע 6 המדגמים הראשוניים</th><th scope="col" class="n">ממוצע כל ' + cmp.polls.length + ' המדגמים</th><th scope="col" class="n">ממוצע ' + cmp.pollAverageN + ' הסקרים האחרונים</th><th scope="col" class="n">חלוקה לפי ספירת ' + cmp.counts[cmp.counts.length - 1].asOf.slice(11, 16) + '</th></tr></thead><tbody>' + cmpRows + '</tbody></table></div>' +
      '<p class="meta">בסוגריים: ההפרש מהחציון. פלוס = המדגם או הסקר נתנו יותר מההערכה. הממוצעים אינם מעוגלים ל-120.</p>';
    var pl = cmp.polls.slice().sort(function (a, b) { return a.misallocated - b.misallocated || COLL.compare(a.id, b.id); });
    var tP = '<details><summary>כל מדגם לעומת ההערכה (מושבים שהוקצו אחרת)</summary><ul>' + pl.map(function (p) { return '<li>' + esc(p.channel) + (p.pollster ? ' (' + esc(p.pollster) + ')' : '') + ', ' + (p.kind === 'initial' ? 'מדגם ראשוני' : 'עדכון') + ' ' + esc(p.time) + ': ' + fmtN(p.misallocated) + '</li>'; }).join('') + '</ul><p class="meta">מסודר מהקרוב לרחוק. ההשוואה היא להערכה, לא לתוצאה הרשמית, ולכן היא זמנית. <a href="#/exit-polls">לדף המדגמים</a></p></details>';
    var tS = '<details><summary>איך המושבים זזו בין הספירות (' + cmp.counts.length + ')</summary><div class="tbl-wrap ol-w" tabindex="0" role="region" aria-label="מושבים לפי ספירה"><table class="tbl ol-t"><thead><tr><th scope="col">רשימה</th>' + cmp.counts.map(function (s) { return '<th scope="col" class="n">' + fmtShort(s.asOf) + ' ' + s.asOf.slice(11, 16) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      ps.map(function (p) { return '<tr><th scope="row">' + esc(p.name) + '</th>' + cmp.counts.map(function (s) { return '<td class="n">' + s.seats[p.id] + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div><p class="meta">חלוקה לפי באדר-עופר עם הסכמי העודפים על כל ספירה חלקית. ספירות שבהן רק האחוזים זמינים חושבו מהאחוזים המעוגלים. ספירת 28.10 07:57 כללה כ-57% מהקולות בלבד.</p></details>';
    // (ג) history
    var hRows = hist.map(function (h) { return '<tr><th scope="row">' + esc(olShort(h.label)) + '</th><td class="n">' + h.turnout.toFixed(1) + '%</td><td class="n">' + h.envShare.toFixed(1) + '%</td><td class="n">' + h.enpVotes.toFixed(1) + '</td><td class="n">' + h.enpSeats.toFixed(1) + '</td><td class="n">' + h.wastedPct.toFixed(1) + '%</td><td class="n">' + (h.pedersen != null ? h.pedersen.toFixed(1) : '–') + '</td><td class="n">' + h.maxDrift.toFixed(2) + '</td><td class="n">' + h.seatsMovedByEnvelopes + '</td><td class="n">' + h.blocSeats + '</td></tr>'; }).join('') +
      '<tr class="ol-26"><th scope="row">2026 (הערכה)</th><td class="n">' + Y.turnoutFinalEst.toFixed(1) + '%</td><td class="n">' + Y.envShareEst[0].toFixed(1) + '–' + Y.envShareEst[1].toFixed(1) + '%</td><td class="n">' + Y.enpVotes.toFixed(1) + '</td><td class="n">' + Y.enpSeats.toFixed(1) + '</td><td class="n">' + Y.wastedPct.toFixed(1) + '%</td><td class="n">–</td><td class="n">–</td><td class="n">–</td><td class="n">' + OL.blocs[0].p50 + '*</td></tr>';
    var tH = '<div class="tbl-wrap ol-w" tabindex="0" role="region" aria-label="השוואה היסטורית"><table class="tbl ol-t"><caption class="sr">מדדים היסטוריים 2019–2026</caption><thead><tr><th scope="col">מערכת</th><th scope="col" class="n">שיעור הצבעה</th><th scope="col" class="n">מעטפות כפולות (מהמצביעים)</th><th scope="col" class="n">מספר מפלגות אפקטיבי (קולות)</th><th scope="col" class="n">מספר מפלגות אפקטיבי (מושבים)</th><th scope="col" class="n">קולות מתחת לחסימה</th><th scope="col" class="n">תנודתיות (פדרסן)</th><th scope="col" class="n">תזוזה מרבית בגלל המעטפות (נק׳ אחוז)</th><th scope="col" class="n">מושבים שזזו בגלל המעטפות</th><th scope="col" class="n">גוש התומכים בנתניהו</th></tr></thead><tbody>' + hRows + '</tbody></table></div>' +
      '<p class="meta">גוש התומכים בנתניהו בעבר: הרשימות שהמליצו עליו לנשיא אחרי הבחירות (' + hist.map(function (h) { return srcLink(h.blocSource, olShort(h.label)); }).join(' · ') + '). *ב-2026 אין עדיין המלצות, ולכן מוצג גוש הקואליציה היוצאת לפי ההצהרות לפני הבחירות. זו הגדרה אחרת, וההשוואה מקורבת. מספר המפלגות האפקטיבי על הקולות כולל רק רשימות שקיבלו 1% ומעלה. התנודתיות לפי אות הפתק, ולכן מקורבת כשאותה אות עברה בין הרכבים. "מושבים שזזו בגלל המעטפות": החלוקה בלי הסכמי עודפים לפי הקלפיות הרגילות בלבד מול התוצאה הסופית. תוצאות רשמיות: ' + hist.map(function (h) { return srcLink(h.source, olShort(h.label)); }).join(' · ') + '.</p>';
    var swings = '<details><summary>התנודות הגדולות בין מערכות</summary><ul>' + hist.filter(function (h) { return h.topSwings; }).map(function (h) { return '<li><b>' + esc(olShort(h.label)) + ':</b> ' + h.topSwings.map(function (s) { return esc(s.n) + ' ' + s.from.toFixed(1) + '% ← ' + s.to.toFixed(1) + '% (' + (s.pp > 0 ? '+' : '') + s.pp.toFixed(1) + ')'; }).join('; ') + '. שיעור ההצבעה ' + (h.turnoutChange > 0 ? '+' : '') + h.turnoutChange.toFixed(1) + ' נקודות; הגוש ' + (h.blocChange > 0 ? '+' : '') + h.blocChange + ' מושבים.</li>'; }).join('') + '</ul></details>';
    var envHist = '<details><summary>מה המעטפות הכפולות הזיזו בעבר</summary><ul>' + hist.map(function (h) { var d = Object.keys(h.seatsMovedDetail).sort(COLL.compare); return '<li><b>' + esc(olShort(h.label)) + ':</b> ' + olN(h.envVoters) + ' מעטפות (' + h.envShare.toFixed(1) + '%), תזוזה מרבית ' + h.maxDrift.toFixed(2) + ' נקודות. ' + (d.length ? d.map(function (n) { var v = h.seatsMovedDetail[n]; return esc(n) + ' ' + (v > 0 ? '+' : '') + v; }).join(', ') : 'אף מושב לא זז') + '.</li>'; }).join('') + '</ul></details>';
    var unusual = '<ul class="ol-unusual">' + OL.unusual.map(function (u) { return '<li>' + esc(u.text) + '</li>'; }).join('') + '</ul>';
    // methods + backtest
    var bt = '<div class="tbl-wrap ol-w" tabindex="0" role="region" aria-label="בדיקה לאחור"><table class="tbl ol-t"><caption class="sr">בדיקה לאחור: קלפיות רגילות + יחס המעטפות ממערכות קודמות מול התוצאה הסופית</caption><thead><tr><th scope="col">מערכת</th><th scope="col" class="n">טעות ממוצעת (נק׳ אחוז)</th><th scope="col" class="n">טעות מרבית</th><th scope="col" class="n">בלי תיקון: טעות ממוצעת</th><th scope="col" class="n">מושבים שהוקצו אחרת</th><th scope="col" class="n">בלי תיקון: מושבים</th><th scope="col" class="n">רשימות עם היסטוריה</th></tr></thead><tbody>' +
      OL.backtest.map(function (b) { return '<tr><th scope="row">' + esc(olShort(b.label)) + '</th><td class="n">' + b.mae.toFixed(3) + '</td><td class="n">' + b.maxErr.toFixed(2) + ' <span class="meta">(' + esc(b.maxErrList) + ')</span></td><td class="n">' + b.naiveMae.toFixed(3) + '</td><td class="n">' + b.seatErr + '</td><td class="n">' + b.naiveSeatErr + '</td><td class="n">' + b.matched + '/' + b.nLists + '</td></tr>'; }).join('') + '</tbody></table></div>';
    var methods = '<section class="note" id="ol-method"><h2>איך זה מחושב (כל ההנחות)</h2><ol>' +
      '<li><b>נקודת המוצא:</b> ספירת ' + fmtStamp(C.asOf) + ' (' + olN(C.valid) + ' קולות כשרים). כל 12,018 הקלפיות הרגילות כבר נספרו, ולכן מה שחסר הוא מעטפות כפולות בלבד.</li>' +
      '<li><b>כמה מעטפות נשארו:</b> מספר הקלפיות הרגילות (' + olN(E.regularBallots) + ' פתקים) חושב מספירת 11:16 פחות ' + olN(E.batches[0].n + E.batches[1].n + E.batches[2].n) + ' מעטפות שדווחו כנספרות באותה שעה. סך המעטפות: לפחות ' + olN(E.totalRange[0]) + ' (מה שכבר נספר; ועדת הבחירות הודיעה ב-29.10 בשעה 16:50 שספירת המעטפות הסתיימה וקליטת התוצאות נמשכת) ולכל היותר ' + olN(E.totalRange[1]) + ' (אם נתון ההצבעה של 22:00, ' + olN(E.voters2200) + ', הוא הסופי). בהדמיה הכמות נבחרת באופן אחיד בטווח, ו-' + (100 * 4093 / 462807).toFixed(2) + '% פסולים כמו במעטפות של 2022.</li>' +
      '<li><b>הרכב המעטפות שנותרו:</b> ממוצע משוקלל של שתי המנות האחרונות (' + olN(E.batches[2].n) + ' ו-' + olN(E.batches[3].n) + ' קולות), עם סטיית תקן לכל רשימה: הגדולה מבין 0.3 נקודות, 15% מהערך, ההפרש מהממוצע המצטבר והפיזור בין המנות. ' + OL.nSim.toLocaleString('he-IL') + ' הדמיות (זרע ' + OL.seed + ').</li>' +
      '<li><b>חלוקת המושבים:</b> שיטת באדר-עופר, אחוז חסימה ' + OL.threshold + '% מכל הקולות הכשרים, עם הסכמי העודפים הרשמיים. הפונקציה משחזרת את החלוקה הלא רשמית שפורסמה ב-machria לספירות 12:44 ו-18:04 ואת החלוקה של israelielections.com לספירת 11:32 (בלי הסכמים).</li>' +
      '<li><b>טווחים:</b> אחוזון 10 ואחוזון 90 של ההדמיות. "חציון" לכל רשימה בנפרד.</li>' +
      '<li><b>גושים:</b> לפי העמדות שהרשימות הצהירו לפני הבחירות (כמו בדף הסקרים). אינם תחזית של קואליציה.</li>' +
      '<li><b>בדיקה לאחור (שיטה ב׳, היסטורית בלבד):</b> לכל מערכת 2019–2022 לקחתי את התוצאות בקלפיות הרגילות בלבד, הוספתי את מספר המעטפות האמיתי, וחילקתי אותן לפי יחס "מעטפות לעומת קלפיות רגילות" של אותה רשימה (לפי אות הפתק) בשתי המערכות הקודמות. רשימה בלי היסטוריה קיבלה יחס 1. השוואה מול התוצאה הסופית, ומול "בלי תיקון" (המעטפות כמו הקלפיות הרגילות). המושבים בבדיקה מחושבים בלי הסכמי עודפים. טעות ממוצעת בכל המערכות: ' + BT.mae.toFixed(3) + ' נקודות (בלי תיקון: ' + BT.naiveMae.toFixed(3) + '); הכי הרבה מושבים שהוקצו אחרת: ' + BT.seatErrMax + ' (בלי תיקון: ' + BT.naiveSeatErrMax + ').</li>' +
      '<li><b>למה ההערכה הסופית לא משתמשת בשיטה ב׳:</b> ב-2026 הרכב המעטפות שכבר נספרו ידוע, והוא רחוק ממה ששיטה ב׳ צופה (טעות ממוצעת ' + OL.methodB.mae.toFixed(2) + ' נקודות ברכב המעטפות), בעיקר כי שבע רשימות חדשות בהרכבן. לכן ההערכה מבוססת על המעטפות שנספרו. בדיקה פנימית: מצב 11:16 + הרכב המנה הקודמת חזה את ספירת 18:04 בטעות ממוצעת של ' + OL.pseudoBacktestA.mae.toFixed(3) + ' נקודות ובלי טעות במושבים.</li>' +
      '<li><b>מה חסר:</b> נתוני ועדת הבחירות עצמה לא זמינים מכאן (חסימה גאוגרפית), ולכן המספרים מצוטטים דרך machria, israelielections.com, ynet וכלי תקשורת נוספים. הרכב המנות 1–3 מחושב מאחוזים מעוגלים. אין מידע על הפיזור הגאוגרפי של המעטפות שנותרו (למשל חיילים, דיפלומטים, אסירים ובתי חולים).</li></ol>' +
      '<h3>בדיקה לאחור, 2019–2022</h3>' + bt + '<p class="meta">נתוני העבר: ועדת הבחירות המרכזית דרך data.gov.il (שורת המעטפות הכפולות בכל מערכת). מקורות המעטפות ב-2026: ' + src(E.sources) + '. הקוד: tools/build_outlook.py.</p></section>';
    return hd + banner + kpis +
      '<h2 id="ol-a">א. מה עוד לא נספר</h2><p>נשארו רק מעטפות כפולות: קולות של חיילים, אנשי כוחות הביטחון, דיפלומטים, אסירים, מאושפזים ועוד. הן מצביעות אחרת מהקלפיות הרגילות, ולכן ההערכה לוקחת בחשבון את הרכב המעטפות שכבר נספרו.</p>' + tA + tBatch +
      '<h2 id="ol-b">ב. מושבים</h2>' + tB + modal + '<h3>המושבים הקרובים ביותר</h3>' + closeL + '<h3>הסכמי העודפים</h3>' + agr +
      '<h3>מול המדגמים, הסקרים והספירות</h3>' + tC + tP + tS +
      '<h2 id="ol-c">ג. מול ההיסטוריה (2019–2022)</h2>' + tH + swings + envHist + '<h3>מה חריג הפעם</h3>' + unusual +
      '<h2 id="ol-d">ד. מה אני חושב</h2><div class="ol-think">' + olThink() + '</div>' +
      methods + '<p class="meta">' + esc(orderNote()) + '</p>';
  }
  var TITLES = { home: 'ראשי', matrix: 'מטריצה', issue: 'לפי סוגיה', list: 'לפי רשימה', compare: 'השוואה', analysis: 'ניתוח רוחבי', polls: 'סקרים', podcasts: 'פודקאסטים וראיונות', coalition: 'בנה קואליציה', 'exit-polls': 'מדגמים: דיוק בעבר', geo: 'תוצאות לפי יישוב וקלפי', outlook: 'תחזית והקשר היסטורי', about: 'שיטה ומקורות' };
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
      case 'outlook': html = pageOutlook(); if (!OL && !OLerr) loadOutlook().then(function () { if (parseHash().page === 'outlook') render(true); }); break;
      case 'coalition': html = pageCoalition(r.q); if (!CO && !COerr) loadCoalition().then(function () { if (parseHash().page === 'coalition') render(true); }); break;
      case 'exit-polls': html = pageExitPolls(); if (!EP && !EPerr) loadExitPolls().then(function () { if (parseHash().page === 'exit-polls') render(true); }); break;
      case 'geo': if (window.EL26GEO) { html = window.EL26GEO.page(r); sub = window.EL26GEO.title(r); } else { html = '<div class="skel" aria-hidden="true"><i></i><i></i><i></i></div><p class="sr" role="status">טוען…</p>'; loadGeo(); } break;
      case 'podcasts': html = pagePodcasts(r.arg, r.q); if (!PD && !PDerr) loadPodcasts().then(function () { if (parseHash().page === 'podcasts') { render(true); podScroll(); } }); break;
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
    if (r.page === 'podcasts' && PD) podScroll();
    if (r.page === 'geo' && window.EL26GEO) window.EL26GEO.after();
  }
  var geoLoading = false;
  function loadGeo() {
    if (geoLoading) return; geoLoading = true;
    window.EL26 = { esc: esc, COLL: COLL, head: head, srcLink: srcLink, fmtDate: fmtDate, parseHash: parseHash, setHash: setHash, render: render, getJSON: getJSON, main: $main };
    var s = document.createElement('script'); s.src = 'js/geo.js?v=' + GEO_V; s.async = true;
    s.onload = function () { if (parseHash().page === 'geo') render(true); };
    s.onerror = function () { geoLoading = false; if (parseHash().page === 'geo') $main.innerHTML = '<div class="empty" role="alert"><b>שגיאה בטעינת העמוד</b><p>נסו לרענן.</p></div>'; };
    document.head.appendChild(s);
  }
  var GEO_V = '1';
  function podScroll() { var r = parseHash(); if (r.page !== 'podcasts' || !r.arg) return; var el = document.getElementById('pl-' + r.arg); if (el) el.scrollIntoView({ block: 'start' }); }
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
    var la = e.target.closest('a[data-co-load]');
    if (la) { e.preventDefault(); setHash(la.getAttribute('href')); var bl = document.getElementById('co-builder'); if (bl) { bl.scrollIntoView({ block: 'start' }); var fc = bl.querySelector('.chip'); if (fc) fc.focus({ preventScroll: true }); } return; }
    var t = e.target.closest('button'); if (!t) return;
    if (t.hasAttribute('data-co')) { var cs = coState(parseHash().q), cv = t.getAttribute('data-co'), ci = cs.l.indexOf(cv); if (ci >= 0) cs.l.splice(ci, 1); else cs.l.push(cv); coGo({ l: cs.l }, '[data-co="' + cv + '"]'); return; }
    if (t.hasAttribute('data-co-clear')) { coGo({ l: [] }, '.co-chips .chip'); return; }
    if (t.hasAttribute('data-co-sw')) { var sv = +t.getAttribute('data-co-sw'); coGo({ sw: sv }, '[data-co-sw="' + sv + '"]'); return; }
    if (t.hasAttribute('data-co-reset')) { coGo({ sw: 0.5, w: CO.issues.map(function () { return 1; }) }, '#co-w-0'); return; }
    if (t.hasAttribute('data-co-sort')) { var so = t.getAttribute('data-co-sort'); coGo({ sort: so }, '[data-co-sort="' + so + '"]'); return; }
    if (t.hasAttribute('data-co-view')) { var vw = t.getAttribute('data-co-view'); coGo({ view: vw, all: false }, '[data-co-view="' + vw + '"]'); return; }
    if (t.hasAttribute('data-co-all')) { coGo({ all: true }); return; }
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
    else if (t.id === 'podissue') { var pr = parseHash(); setHash('#/podcasts' + (pr.arg ? '/' + pr.arg : '') + (t.value ? '?issue=' + t.value : '')); var pi = document.getElementById('podissue'); if (pi) pi.focus(); }
    else if (t.id === 'hl' || t.id === 'hlrow') { state.hl = t.value; render(true); var el = document.getElementById(t.id); if (el) el.focus(); }
    else if (t.hasAttribute('data-co-w')) { var wk = +t.getAttribute('data-co-w'), ws = coState(parseHash().q); ws.w[wk] = +t.value; coGo({ w: ws.w }, '#co-w-' + wk); }
    else if (t.id === 'co-th') coGo({ th: t.checked, all: false }, '#co-th');
    else if (t.id === 'co-nd') coGo({ nd: t.checked, all: false }, '#co-nd');
    else if (t.id === 'co-must') coGo({ must: t.value, all: false }, '#co-must');
    else if (t.id === 'co-mp') coGo({ mp: +t.value, all: false }, '#co-mp');
    else if (t.id === 'outlet') { setHash('#/polls' + (t.value ? '?outlet=' + encodeURIComponent(t.value) : '')); var o = document.getElementById('outlet'); if (o) o.focus(); }
  });
  $main.addEventListener('input', function (e) {
    var t = e.target; if (!t.hasAttribute || !t.hasAttribute('data-co-w')) return;
    var o = document.getElementById('co-wo-' + t.getAttribute('data-co-w')); if (o) o.textContent = coWTxt(+t.value); t.setAttribute('aria-valuetext', coWTxt(+t.value));
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
