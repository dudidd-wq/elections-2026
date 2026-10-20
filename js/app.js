/* השוואת מצעים – בחירות 2026. Static, data-driven: all content comes from data/*.json */
(function () {
  'use strict';
  var P, A, D; // platforms, analysis, polls
  var $main = document.getElementById('main');
  var dlg = document.getElementById('dlg');
  var REPO = 'https://github.com/dudidd-wq/elections-2026';
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem('el26.' + k); return v === null ? d : v; } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem('el26.' + k, v); } catch (e) {} }
  };
  var state = { order: store.get('order', 'alpha'), hl: '', mxMode: store.get('mxMode', 'summary') };

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function fmtDate(iso) { if (!iso) return ''; var d = iso.slice(0, 10).split('-'); return +d[2] + '.' + +d[1] + '.' + d[0]; }
  function fmtStamp(iso) { if (!iso) return ''; var t = iso.slice(11, 16); return fmtDate(iso) + (t ? ' ' + t : '') + ' (שעון ישראל)'; }
  function fmtN(x) { return (Math.round(x * 10) / 10).toFixed(1); }
  function byId(arr) { var o = {}; arr.forEach(function (x) { o[x.id] = x; }); return o; }
  var LIST, ISS, PARTY;

  function avgOf(id) { return (D.computed.average[id] || 0); }
  function sortIds(ids) {
    var names = {}; ids.forEach(function (id) { names[id] = (LIST[id] ? LIST[id].tableName : PARTY[id].name); });
    return ids.slice().sort(function (a, b) {
      if (state.order === 'polls') { var d = avgOf(b) - avgOf(a); if (Math.abs(d) > 1e-9) return d; }
      return names[a].localeCompare(names[b], 'he');
    });
  }
  function orderedLists() { return sortIds(P.lists.map(function (l) { return l.id; })).map(function (id) { return LIST[id]; }); }
  function lname(id) { var l = LIST[id]; return l ? l.tableName : PARTY[id].name; }
  function dagger(id) { return LIST[id] && LIST[id].added20Oct ? ' <span class="dagger" title="נוספה למסמך ב-20.10.2026">†</span>' : ''; }
  function starMark(p) { return p.star ? '<span class="star" title="מבוסס על הצהרות, הודעות או הצבעות">*</span>' : ''; }
  function orderNote() {
    return state.order === 'polls'
      ? 'סדר הרשימות: לפי ממוצע הסקרים העדכני (' + fmtDate(D.computed.asOf) + '), מהגבוה לנמוך; בשוויון – לפי סדר האלף-בית.'
      : 'סדר הרשימות: לפי סדר האלף-בית של שם הרשימה. הסדר אינו מבטא דירוג או העדפה.';
  }
  function orderCtl() {
    return '<div class="controls" role="group" aria-label="סדר הרשימות"><span class="seg">' +
      '<button type="button" data-order="alpha" aria-pressed="' + (state.order === 'alpha') + '">סדר אלפביתי</button>' +
      '<button type="button" data-order="polls" aria-pressed="' + (state.order === 'polls') + '">לפי ממוצע הסקרים</button></span>' +
      '<span class="order-note">' + esc(orderNote()) + '</span></div>';
  }
  function asOfLine() {
    return '<p class="meta">העמדות נכונות ל-' + fmtDate(P.meta.documentAsOf) + ' · הקישורים נבדקו ב-' + fmtDate(P.meta.linksCheckedOn) + ' · מקור: מסמך המחקר "' + esc(P.meta.title) + '".</p>';
  }
  function legend() {
    return '<p class="note"><span class="star">*</span> ' + esc(P.starLegend.replace(/^כוכבית \(\*\) /, '')) + ' <span class="dagger">†</span> ' + esc(P.daggerLegend.replace(/^† /, '')) + ' "לא נמצאה עמדה" פירושו שלא אותרה עמדה פומבית, ולא שאין לרשימה עמדה.</p>';
  }
  function srcLink(url, label) {
    if (!url) return '<span class="meta">אין קישור</span>';
    var host = url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0];
    return '<a href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">' + esc(label || 'למקור') + ' <span class="ltr">(' + esc(host) + ')</span><span class="sr"> (נפתח בחלון חדש)</span></a>';
  }

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

  // ---------- dialog
  function openCell(lid, iid) {
    var p = P.positions[lid][iid], l = LIST[lid], i = ISS[iid];
    var h = '<h2 id="dlg-title">' + esc(l.tableName) + dagger(lid) + ' · ' + esc(i.title) + '</h2>' +
      '<p class="sum"><b>בתמצית:</b> ' + esc(p.summary) + '</p>' +
      '<p><b>העמדה המלאה (במסגור הרשימה):</b> ' + esc(p.full) + ' ' + starMark(p) + '</p>' +
      '<p><span class="badge">סוג מקור: ' + esc(p.sourceType) + '</span> ' + (p.star ? '<span class="badge"><span class="star">*</span> מבוסס על הצהרות/הצבעות</span>' : '') + '</p>' +
      '<p>' + srcLink(p.url, 'מקור העמדה') + '</p>' +
      '<p class="meta">קוד קצר בניתוח הרוחבי: ' + esc(p.code) + '</p>' +
      '<p class="pager"><a class="btn sec" href="#/issue/' + iid + '">כל הרשימות בסוגיה זו</a> <a class="btn sec" href="#/list/' + lid + '">פרופיל הרשימה</a></p>' +
      '<p class="meta">נכון ל-' + fmtDate(P.meta.documentAsOf) + '.</p>';
    document.getElementById('dlg-body').innerHTML = h;
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
  }
  document.getElementById('dlg-x').addEventListener('click', function () { dlg.close(); });
  dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
  dlg.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('a[href^="#/"]')) dlg.close(); });

  // ---------- pages
  function daysTo(dateIso) {
    var now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jerusalem' }));
    var t = new Date(dateIso + 'T00:00:00'); var n = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return Math.round((t - n) / 864e5);
  }
  function pageHome() {
    var dd = daysTo(P.meta.electionDate);
    var when = dd > 1 ? 'בעוד ' + dd + ' ימים' : dd === 1 ? 'מחר' : dd === 0 ? 'היום' : 'הבחירות התקיימו';
    var raam = PARTY.raam;
    return '<h1>' + esc(P.meta.title) + '</h1>' +
      '<p class="lead">הבחירות לכנסת ה-26 ייערכו ביום שלישי, 27 באוקטובר 2026 (' + when + '). האתר משווה את עמדותיהן של 12 רשימות ב-10 סוגיות, כל עמדה במסגור של הרשימה עצמה ועם קישור למקור. אין כאן המלצה להצבעה, אין שאלון התאמה ואין הערכה של איכות העמדות.</p>' +
      asOfLine() +
      '<div class="cards">' +
      card('#/matrix', 'מטריצה', '12 רשימות × 10 סוגיות. לחיצה על תא מציגה את העמדה המלאה ואת המקור.') +
      card('#/issue', 'לפי סוגיה', 'כל הרשימות בסוגיה אחת, בניסוח מלא, ולצדן המחנות בסוגיה.') +
      card('#/list', 'לפי רשימה', 'פרופיל של כל רשימה: הרכב, מעמד המצע, גוש מוצהר, סקרים ועמדות.') +
      card('#/compare', 'השוואה', 'בחירה של 2–3 רשימות והשוואה ביניהן זו לצד זו.') +
      card('#/analysis', 'ניתוח רוחבי', 'קווי המחלוקת החדים, המכנה המשותף והחפיפות בין הגושים.') +
      card('#/polls', 'סקרים', 'ממוצע הסקרים, סכומי הגושים, קו 61, מגמה וטבלת כל הסקרים.') +
      '</div>' + legend() +
      '<p class="note">' + esc(orderNote()) + ' אפשר לשנות את הסדר בכל עמוד שבו מוצגות הרשימות.</p>' +
      '<p class="note warn"><b>מה לא נכלל:</b> ' + esc(raam.note) + ' המסמך בחר את 10 הרשימות הגדולות לפי ממוצע הסקרים ב-13–19.10.2026 והוסיף שתי רשימות שקרובות לאחוז החסימה; רע"ם, שממוצעה גבוה משלהן, לא נכללה. פרטים בעמוד <a href="#/about">שיטה ומקורות</a>.</p>';
  }
  function card(href, t, d) { return '<a class="card" href="' + href + '"><h2>' + esc(t) + '</h2><p>' + esc(d) + '</p></a>'; }

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

  function matrixTable(sel, mode) {
    var lists = orderedLists();
    var head = '<tr><th scope="col">רשימה</th>' + sel.map(function (iid) { return '<th scope="col"><a href="#/issue/' + iid + '">' + esc(mode === 'code' ? ISS[iid].code : ISS[iid].short) + '</a></th>'; }).join('') + '</tr>';
    var body = lists.map(function (l) {
      return '<tr' + (state.hl === l.id ? ' class="hl"' : '') + '><th scope="row"><a href="#/list/' + l.id + '">' + esc(l.tableName) + '</a>' + dagger(l.id) + '</th>' + sel.map(function (iid) {
        var p = P.positions[l.id][iid];
        var t = mode === 'code' ? p.code : p.summary;
        return '<td><button type="button" class="cell' + (p.notFound ? ' nf' : '') + '" data-cell="' + l.id + '|' + iid + '" aria-label="' + esc(l.tableName + ', ' + ISS[iid].short + ': ' + t + (p.star ? ' (מבוסס על הצהרות או הצבעות)' : '') + '. לחיצה לעמדה המלאה ולמקור') + '">' + esc(t) + (p.star ? ' <span class="star" aria-hidden="true">*</span>' : '') + '</button></td>';
      }).join('') + '</tr>';
    }).join('');
    return '<div class="mx-wrap" tabindex="0" role="region" aria-label="מטריצת עמדות, אפשר לגלול אופקית"><table class="mx"><caption class="sr">עמדות הרשימות לפי סוגיה</caption><thead>' + head + '</thead><tbody>' + body + '</tbody></table></div>';
  }
  function hlRowSelect() {
    return '<label>הדגשת שורה: <select id="hlrow"><option value="">ללא</option>' + orderedLists().map(function (l) { return '<option value="' + l.id + '"' + (state.hl === l.id ? ' selected' : '') + '>' + esc(l.tableName) + '</option>'; }).join('') + '</select></label>';
  }
  function pageMatrix(q) {
    var sel = selIssues(q.issues), mode = state.mxMode;
    return '<h1>מטריצת השוואה</h1>' +
      '<p class="lead">תמצית במילות מפתח. לחיצה על תא פותחת את הניסוח המלא, את סוג המקור ואת הקישור.</p>' + asOfLine() +
      orderCtl() +
      '<div class="controls"><span class="seg" role="group" aria-label="סוג התמצית">' +
      '<button type="button" data-mx="summary" aria-pressed="' + (mode === 'summary') + '">תמצית</button>' +
      '<button type="button" data-mx="code" aria-pressed="' + (mode === 'code') + '">קודים קצרים (ניתוח רוחבי)</button></span>' +
      hlRowSelect() + '</div>' +
      issueChips(sel, 'mx') + legend() + matrixTable(sel, mode);
  }

  function posBlock(lid, iid, headWith) {
    var p = P.positions[lid][iid];
    var title = headWith === 'list' ? '<a href="#/list/' + lid + '">' + esc(lname(lid)) + '</a>' + dagger(lid) : '<a href="#/issue/' + iid + '">' + esc(ISS[iid].title) + '</a>';
    return '<article class="pos' + (p.notFound ? ' nf' : '') + '"><h3>' + title + ' ' + (p.star ? '<span class="badge"><span class="star">*</span> הצהרות/הצבעות</span>' : '') + '</h3>' +
      '<p class="sum">בתמצית: ' + esc(p.summary) + '</p><p>' + esc(p.full) + '</p>' +
      '<div class="src"><span class="badge">סוג מקור: ' + esc(p.sourceType) + '</span>' + srcLink(p.url, 'מקור') + '</div></article>';
  }

  function pageIssue(id) {
    if (!id || !ISS[id]) {
      return '<h1>השוואה לפי סוגיה</h1><p class="lead">בחרו סוגיה כדי לראות את עמדות כל 12 הרשימות בניסוח מלא.</p>' + asOfLine() +
        '<div class="cards">' + P.issues.map(function (i) { return card('#/issue/' + i.id, i.n + '. ' + i.short, i.title); }).join('') + '</div>' +
        '<p class="note">' + esc(P.issueNote.join(' ')) + '</p>';
    }
    var i = ISS[id], idx = P.issues.indexOf(i);
    var prev = P.issues[(idx + 9) % 10], next = P.issues[(idx + 1) % 10];
    var rk = A.rank.filter(function (r) { return r.issues.indexOf(id) >= 0; })[0];
    var camp = A.camps.filter(function (c) { return c.issue === id; })[0];
    var h = '<h1>' + i.n + '. ' + esc(i.title) + '</h1>' + asOfLine() +
      '<label class="controls">מעבר לסוגיה: <select id="goissue">' + P.issues.map(function (x) { return '<option value="' + x.id + '"' + (x.id === id ? ' selected' : '') + '>' + x.n + '. ' + esc(x.short) + '</option>'; }).join('') + '</select></label>' +
      orderCtl() + legend();
    if (camp) {
      h += '<section class="camp" aria-labelledby="camp-h"><h2 id="camp-h">המחנות בסוגיה (מתוך הניתוח הרוחבי)</h2><ul>' + camp.segments.map(function (s) {
        return '<li>' + (s.label ? '<span class="lab">' + mark(s.label) + '</span> – ' : '') + mark(s.who) + '</li>';
      }).join('') + '</ul></section>';
    }
    if (rk) h += '<p class="note">בדירוג עומק המחלוקת בניתוח הרוחבי: מקום ' + rk.rank + ' מתוך 7 (' + esc(rk.label) + '). הדירוג הוא ניתוח ולא נתון. <a href="#/analysis/splits">לדירוג המלא</a></p>';
    h += '<h2>עמדות הרשימות</h2>' + orderedLists().map(function (l) { return posBlock(l.id, id, 'list'); }).join('');
    h += '<nav class="pager" aria-label="ניווט בין סוגיות"><a class="btn sec" href="#/issue/' + prev.id + '">→ ' + esc(prev.short) + '</a><a class="btn sec" href="#/issue/' + next.id + '">' + esc(next.short) + ' ←</a></nav>';
    return h;
  }

  function pollStats(id) {
    var c = D.computed, inc = c.included.length;
    return { avg: c.average[id], rng: c.range[id], pass: c.passesIn[id], n: inc };
  }
  function pageList(id) {
    if (!id || !LIST[id]) {
      return '<h1>פרופיל לפי רשימה</h1>' + asOfLine() + orderCtl() + '<div class="cards">' + orderedLists().map(function (l) {
        var s = pollStats(l.id);
        return '<a class="card" href="#/list/' + l.id + '"><h2>' + esc(l.tableName) + dagger(l.id) + '</h2><p class="meta">אותיות בפתק: ' + esc(l.letters) + ' · ממוצע סקרים: ' + fmtN(s.avg) + ' מנדטים</p><p>' + esc(l.leader) + '</p></a>';
      }).join('') + '</div>';
    }
    var l = LIST[id], s = pollStats(id);
    var stars = P.issues.filter(function (i) { return P.positions[id][i.id].star; }).length;
    var h = '<h1>' + esc(l.tableName) + dagger(id) + '</h1>' + asOfLine() +
      '<label class="controls">מעבר לרשימה: <select id="golist">' + orderedLists().map(function (x) { return '<option value="' + x.id + '"' + (x.id === id ? ' selected' : '') + '>' + esc(x.tableName) + '</option>'; }).join('') + '</select></label>' +
      '<dl class="prof">' +
      '<dt>שם בפתק</dt><dd>' + esc(l.ballotName) + '</dd><dt>אותיות</dt><dd>' + esc(l.letters) + '</dd>' +
      '<dt>ראש הרשימה</dt><dd>' + esc(l.leader) + '</dd><dt>הרכב</dt><dd>' + esc(l.composition) + '</dd>' +
      '<dt>מנדטים בכנסת ה-25</dt><dd>' + esc(l.seats25) + '</dd><dt>מעמד המצע</dt><dd>' + esc(l.platformStatus) + '</dd>' +
      '<dt>גוש / שותפויות מוצהרות</dt><dd>' + esc(l.declaredBloc) + '</dd><dt>מקור מרכזי</dt><dd>' + srcLink(l.mainSource, 'אתר / מקור מרכזי') + '</dd>' +
      '<dt>עמדות שמבוססות על הצהרות</dt><dd>' + stars + ' מתוך 10 הסוגיות מסומנות <span class="star">*</span></dd></dl>' +
      '<h2>סקרים</h2><div class="kpis"><div class="kpi">ממוצע עדכני<b>' + fmtN(s.avg) + '</b><span class="meta">מנדטים, ' + s.n + ' סקרים, ' + fmtDate(D.computed.window[0]) + '–' + fmtDate(D.computed.window[1]) + '</span></div>' +
      '<div class="kpi">טווח<b>' + s.rng[0] + '–' + s.rng[1] + '</b><span class="meta">מנדטים באותם סקרים</span></div>' +
      '<div class="kpi">עוברת את החסימה<b>' + s.pass + ' / ' + s.n + '</b><span class="meta">סקרים בחלון הממוצע</span></div>' +
      '<div class="kpi">במסמך המקור<b>' + fmtN(D.documentBaseline.average[id] || 0) + '</b><span class="meta">ממוצע 7 סקרים, 13–19.10</span></div></div>' +
      '<div class="spark">' + sparkSvg(id, 600, 150) + '</div><p class="meta"><a href="#/polls">לכל נתוני הסקרים והשיטה</a></p>' +
      '<h2>העמדות ב-10 הסוגיות</h2>' + legend() + P.issues.map(function (i) { return posBlock(id, i.id, 'issue'); }).join('') +
      '<h2>מקורות הרשימה</h2><ul class="srcs">' + l.sources.map(function (u) { return '<li>' + srcLink(u, u.replace(/^https?:\/\//, '').slice(0, 70)) + '</li>'; }).join('') + '</ul>' +
      '<p><a class="btn sec" href="#/compare/' + id + '">השוואה עם רשימות אחרות</a></p>';
    return h;
  }

  function pageCompare(param, q) {
    var sel = (param || '').split(',').filter(function (x) { return LIST[x]; }).slice(0, 3);
    var iss = selIssues(q.issues);
    var h = '<h1>השוואה בין רשימות</h1><p class="lead">בחרו 2 או 3 רשימות. העמדות מוצגות זו לצד זו, באותו סדר ובאותו מבנה לכל הרשימות.</p>' + asOfLine() + orderCtl() +
      '<fieldset><legend>בחירת רשימות (עד 3) – נבחרו ' + sel.length + '</legend><div class="chips" data-chips="cmp">' + orderedLists().map(function (l) {
        var on = sel.indexOf(l.id) >= 0, dis = !on && sel.length >= 3;
        return '<button type="button" class="chip" data-v="' + l.id + '" aria-pressed="' + on + '"' + (dis ? ' aria-disabled="true" title="אפשר לבחור עד 3 רשימות"' : '') + '>' + esc(l.tableName) + '</button>';
      }).join('') + '</div></fieldset>' + (sel.length >= 3 ? '<p class="meta" role="status">נבחרו 3 רשימות (המקסימום). כדי להחליף, בטלו בחירה של אחת מהן.</p>' : '') +
      issueChips(iss, 'cmpi') + legend();
    if (sel.length < 2) return h + '<p class="note" role="status">בחרו לפחות שתי רשימות כדי להציג השוואה.</p>';
    var ids = sortIds(sel);
    h += '<div id="cmp">' + iss.map(function (iid) {
      return '<section class="cmp-issue"><h2><a href="#/issue/' + iid + '">' + ISS[iid].n + '. ' + esc(ISS[iid].title) + '</a></h2><div class="grid-cmp" style="--n:' + ids.length + '">' +
        ids.map(function (lid) { return posBlock(lid, iid, 'list'); }).join('') + '</div></section>';
    }).join('') + '</div>';
    return h;
  }

  function pageAnalysis(tab, q) {
    tab = tab || 'splits';
    var tabs = [['splits', 'קווי המחלוקת'], ['consensus', 'המכנה המשותף'], ['overlaps', 'חפיפות ועיקרון מול מידה'], ['codes', 'מטריצת קודים']];
    var h = '<h1>' + esc(A.title) + '</h1>' + A.intro.map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('') + asOfLine() +
      '<nav class="tabs" aria-label="חלקי הניתוח">' + tabs.map(function (t) { return '<a class="btn' + (t[0] === tab ? '' : ' sec') + '" href="#/analysis/' + t[0] + '"' + (t[0] === tab ? ' aria-current="page"' : '') + '>' + t[1] + '</a>'; }).join('') + '</nav>' + (tab === 'codes' ? '' : hlSelect());
    if (tab === 'splits') {
      var iss = selIssues(q.issues);
      h += '<h2>דירוג הסוגיות לפי עומק המחלוקת</h2><p class="meta">1 = המחלוקת העמוקה ביותר. הדירוג נשען על שלושה מבחנים: עיקרון או מידה, מספר המחנות, ותנאים קואליציוניים סותרים.</p><ol class="rank">' +
        A.rank.map(function (r) { return '<li><span class="num" aria-hidden="true">' + r.rank + '</span><div><b>' + esc(r.label) + '</b> <span class="sr">מקום ' + r.rank + '</span><p>' + mark(r.text) + '</p><p class="meta">' + r.issues.map(function (i) { return '<a href="#/issue/' + i + '">' + esc(ISS[i].short) + '</a>'; }).join(' · ') + '</p></div></li>'; }).join('') + '</ol>' +
        '<h2>המחנות בכל סוגיה</h2>' + issueChips(iss, 'an') +
        A.camps.filter(function (c) { return iss.indexOf(c.issue) >= 0; }).map(function (c) {
          return '<section class="camp"><h3><a href="#/issue/' + c.issue + '">' + esc(c.title.replace(/:$/, '')) + '</a></h3><ul>' + c.segments.map(function (s) { return '<li>' + (s.label ? '<span class="lab">' + mark(s.label) + '</span> – ' : '') + mark(s.who) + '</li>'; }).join('') + '</ul></section>';
        }).join('') +
        '<h2>מחלוקות שחוצות את ציר ימין–שמאל</h2>' + items(A.crossAxis) +
        '<h2>קווי המחלוקת המרכזיים (סיכום ניטרלי מתוך המסמך)</h2><ul>' + P.mainSplits.map(function (s) { return '<li>' + mark(s) + '</li>'; }).join('') + '</ul>';
    } else if (tab === 'consensus') {
      h += '<h2>' + esc(A.headings.broad) + '</h2>' + items(A.consensusBroad) + '<h2>' + esc(A.headings.partial) + '</h2>' + items(A.consensusPartial);
    } else if (tab === 'overlaps') {
      h += '<h2>חפיפות בין גושים</h2><ul class="cards" style="list-style:none;padding:0">' + A.overlaps.map(function (s) { return '<li class="card">' + mark(s) + '</li>'; }).join('') + '</ul>' +
        '<h2>מחלוקת על עיקרון מול מחלוקת על מידה</h2>' + items(A.principleVsDegree);
    } else {
      h += '<h2>מטריצה תמציתית (קודים קצרים)</h2><p class="note">' + esc(A.codeMatrixLegend) + '</p><p><a class="btn" href="#/matrix">פתיחה במטריצה האינטראקטיבית</a></p>';
      h += orderCtl() + matrixTable(P.issues.map(function (i) { return i.id; }), 'code');
    }
    return h;
  }
  function items(arr) {
    return '<div class="cards">' + arr.map(function (x) { return '<div class="card">' + (x.label ? '<h3>' + mark(x.label) + '</h3>' : '') + '<p>' + mark(x.text) + '</p></div>'; }).join('') + '</div>';
  }

  // ---------- polls
  var BLOC_COL = { coalition: 'var(--b1)', opposition: 'var(--b2)', arab: 'var(--b3)', other: 'var(--b4)' };
  function pollParties() { return D.parties.filter(function (p) { return !p.withdrawn; }).map(function (p) { return p.id; }); }
  function sparkSvg(id, W, H, isBloc) {
    W = W || 260; H = H || 110;
    var tr = D.computed.trend, pad = { l: 26, r: 8, t: 10, b: 20 };
    var d0 = new Date(tr[0].date), d1 = new Date(tr[tr.length - 1].date), span = Math.max(1, d1 - d0);
    var vals = tr.map(function (t) { return isBloc ? blocSum(t.avg, id) : t.avg[id]; });
    var ymax = isBloc ? 70 : 35, ymin = 0;
    function x(d) { return pad.l + (new Date(d) - d0) / span * (W - pad.l - pad.r); } // time flows left-to-right
    function y(v) { return pad.t + (1 - (v - ymin) / (ymax - ymin)) * (H - pad.t - pad.b); }
    var pts = tr.map(function (t, k) { return x(t.date).toFixed(1) + ',' + y(vals[k]).toFixed(1); }).join(' ');
    var dots = isBloc ? '' : D.polls.filter(function (p) { return p.date >= tr[0].date; }).map(function (p) { return '<circle cx="' + x(p.date).toFixed(1) + '" cy="' + y(p.seats[id] || 0).toFixed(1) + '" r="1.8" fill="#8a93a3"/>'; }).join('');
    var grid = (isBloc ? [0, 20, 40, 61] : [0, 4, 10, 20, 30]).map(function (g) {
      return '<line x1="' + pad.l + '" x2="' + (W - pad.r) + '" y1="' + y(g) + '" y2="' + y(g) + '" stroke="' + (g === 61 ? '#000' : g === 4 ? '#b45309' : '#d5d9e2') + '" stroke-width="' + (g === 61 ? 1.5 : 1) + '"' + (g === 4 ? ' stroke-dasharray="3 3"' : '') + '/>' + (g === 4 ? '' : '<text x="2" y="' + (y(g) + 4) + '" font-size="10" fill="#4a5263">' + g + '</text>');
    }).join('');
    var first = vals[0], last = vals[vals.length - 1];
    var label = (isBloc ? blocName(id) : lname(id)) + ': ממוצע ' + fmtN(first) + ' ב-' + fmtDate(tr[0].date) + ', ' + fmtN(last) + ' ב-' + fmtDate(tr[tr.length - 1].date);
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(label) + '">' + grid + dots +
      '<polyline fill="none" stroke="' + (isBloc ? BLOC_COL[id] : 'var(--bar)') + '" stroke-width="2.2" points="' + pts + '"/>' +
      '<text x="' + pad.l + '" y="' + (H - 4) + '" font-size="10" text-anchor="start" fill="#4a5263">' + fmtDate(tr[0].date) + '</text>' +
      '<text x="' + (W - pad.r) + '" y="' + (H - 4) + '" font-size="10" text-anchor="end" fill="#4a5263">' + fmtDate(tr[tr.length - 1].date) + '</text></svg>';
  }
  function blocSum(avg, bid) { var b = D.blocs.filter(function (x) { return x.id === bid; })[0]; return b.members.reduce(function (s, m) { return s + (avg[m] || 0); }, 0); }
  function blocName(bid) { return D.blocs.filter(function (x) { return x.id === bid; })[0].name; }

  function pagePolls(q) {
    var c = D.computed, ids = sortIds(pollParties());
    var max = 35;
    var bars = ids.map(function (id) {
      var a = c.average[id], r = c.range[id];
      return '<div class="bar-row"><span>' + (LIST[id] ? '<a href="#/list/' + id + '">' + esc(lname(id)) + '</a>' : esc(lname(id)) + ' <span class="meta">(לא במסמך המצעים)</span>') + '</span>' +
        '<span class="bar-track" aria-hidden="true"><span class="bar-fill" style="width:' + (a / max * 100) + '%"></span><span class="bar-rng" style="right:' + (r[0] / max * 100) + '%;width:' + ((r[1] - r[0]) / max * 100) + '%"></span><span class="bar-thr" style="right:' + (4 / max * 100) + '%"></span></span>' +
        '<span class="bar-v">' + fmtN(a) + '</span></div>';
    }).join('');
    var blocs = D.blocs.map(function (b) { return { b: b, v: c.blocs.filter(function (x) { return x.id === b.id; })[0].avg }; });
    var BM = 70;
    var stack = '<div class="bars" role="list">' + blocs.map(function (x) {
      return '<div class="bar-row bloc" role="listitem"><span>' + esc(x.b.name) + '</span><span class="bar-track" aria-hidden="true"><span class="bar-fill" style="width:' + (x.v / BM * 100) + '%;background:' + BLOC_COL[x.b.id] + '"></span><span class="bar-61" style="right:' + (61 / BM * 100) + '%"></span></span><span class="bar-v">' + fmtN(x.v) + '<span class="sr"> מנדטים</span></span></div>';
    }).join('') + '<div class="bar-row" aria-hidden="true"><span></span><span class="bar-axis"><span style="right:' + (61 / BM * 100) + '%">61</span></span><span></span></div></div>' +
      '<p class="meta">כל גוש מוצג בפס נפרד באותו קנה מידה (0–70 מנדטים); הקו השחור מסמן 61 מנדטים, הרוב בכנסת. סדר הגושים קבוע ואינו משתנה לפי התוצאות.</p>';
    var outlets = []; D.polls.forEach(function (p) { if (outlets.indexOf(p.outlet) < 0) outlets.push(p.outlet); });
    outlets.sort(function (a, b) { return a.localeCompare(b, 'he'); });
    var of = q.outlet && outlets.indexOf(q.outlet) >= 0 ? q.outlet : '';
    var rows = D.polls.slice().sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : a.outlet.localeCompare(b.outlet, 'he'); }).filter(function (p) { return !of || p.outlet === of; });
    var inc = {}; c.included.forEach(function (x) { inc[x] = 1; });
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
    return '<h1>סקרי מנדטים</h1>' +
      '<div class="kpis"><div class="kpi">סקר אחרון<b>' + fmtDate(c.asOf) + '</b></div><div class="kpi">סקרים במאגר<b>' + D.polls.length + '</b><span class="meta">מ-' + fmtDate(D.polls.reduce(function (m, p) { return p.date < m ? p.date : m; }, '9999')) + '</span></div><div class="kpi">בממוצע העדכני<b>' + c.n + ' סקרים</b><span class="meta">' + fmtDate(c.window[0]) + '–' + fmtDate(c.window[1]) + '</span></div><div class="kpi">עודכן<b style="font-size:1rem">' + fmtStamp(D.meta.updatedAt) + '</b></div></div>' +
      '<p class="note"><b>שיטה:</b> ' + esc(D.method.text) + ' ' + esc(D.meta.threshold) + '</p>' +
      '<p class="note warn">סקרים אינם תחזית. יש פערים גדולים בין המכונים (למשל הליכוד: ' + c.range.likud[0] + '–' + c.range.likud[1] + ' מנדטים בחלון הנוכחי). ' + esc(D.meta.silence) + '</p>' +
      orderCtl() +
      '<h2>ממוצע מנדטים לכל רשימה</h2><p class="meta">הפס = הממוצע; הקו השחור = הטווח (מינימום–מקסימום) בסקרים שבממוצע; הקו המקווקו = 4 מנדטים (המינימום לרשימה שעוברת את אחוז החסימה).</p><div class="bars">' + bars + '</div>' +
      '<details><summary style="min-height:48px;display:flex;align-items:center;cursor:pointer">הנתונים כטבלה</summary><div class="tbl-wrap" tabindex="0" role="region" aria-label="טבלת הממוצעים"><table class="tbl"><thead><tr><th scope="col">רשימה</th><th scope="col" class="n">ממוצע</th><th scope="col" class="n">טווח</th><th scope="col" class="n">עוברת בסקרים</th></tr></thead><tbody>' +
      ids.map(function (id) { return '<tr><td>' + esc(lname(id)) + '</td><td class="n">' + fmtN(c.average[id]) + '</td><td class="n">' + c.range[id][0] + '–' + c.range[id][1] + '</td><td class="n">' + c.passesIn[id] + '/' + c.n + '</td></tr>'; }).join('') + '</tbody></table></div></details>' +
      '<h2>סכומי הגושים וקו 61</h2>' + stack +
      '<p class="note">' + esc(D.blocNote) + ' לפי הממוצע, ' + (blocs.some(function (x) { return x.v >= 61; }) ? 'גוש אחד מגיע ל-61 מנדטים.' : 'אף גוש אינו מגיע ל-61 מנדטים.') + ' בסקרים בודדים התמונה שונה – ראו את עמודות הגושים בטבלה.</p>' +
      '<h2>מגמה לאורך זמן</h2><p class="meta">הקו = הממוצע המתגלגל (אותה שיטה, לכל תאריך שבו פורסם סקר, מ-' + fmtDate(D.method.trendFrom) + '); הנקודות = סקרים בודדים; הקו המקווקו = 4 מנדטים. ציר הזמן משמאל (מוקדם) לימין (מאוחר). כל הגרפים באותו קנה מידה (0–35).</p>' +
      '<div class="multi">' + ids.map(function (id) { var t = c.trend; return '<div class="spark"><h3><span>' + esc(lname(id)) + '</span><span class="ltr">' + fmtN(t[0].avg[id]) + ' → ' + fmtN(t[t.length - 1].avg[id]) + '</span></h3>' + sparkSvg(id) + '</div>'; }).join('') + '</div>' +
      '<h3>מגמת הגושים</h3><div class="multi">' + D.blocs.map(function (b) { var t = c.trend; return '<div class="spark"><h3><span>' + esc(b.name) + '</span><span class="ltr">' + fmtN(blocSum(t[0].avg, b.id)) + ' → ' + fmtN(blocSum(t[t.length - 1].avg, b.id)) + '</span></h3>' + sparkSvg(b.id, 260, 110, true) + '</div>'; }).join('') + '</div>' +
      '<h2>כל הסקרים</h2><label class="controls">סינון לפי כלי תקשורת: <select id="outlet"><option value="">כל כלי התקשורת</option>' + outlets.map(function (o) { return '<option' + (o === of ? ' selected' : '') + '>' + esc(o) + '</option>'; }).join('') + '</select></label>' +
      '<p class="meta">"–" = הרשימה לא דווחה בסקר או דווחה רק באחוזים, מתחת לאחוז החסימה (נספרת כ-0). התאריך הוא תאריך הסקר כפי שמופיע במקור המעקב (ברוב המקרים יום עבודת השטח). ' + esc(PARTY.bw.note) + ' בכל הסקרים מאז 9.9.2026 היא לא עברה את אחוז החסימה, ולכן אינה מוצגת.</p>' + tbl +
      '<h2>בדיקת נתוני המסמך</h2><p>' + esc(base.text) + '</p><p class="note">' + esc(base.verification) + '</p>' + baseT +
      '<h2>מקורות הסקרים</h2><ul class="srcs"><li>' + srcLink(D.meta.primarySource.url, D.meta.primarySource.label) + '</li>' + D.meta.crossCheck.map(function (s) { return '<li>' + srcLink(s.url, s.label) + '</li>'; }).join('') + '</ul><p class="meta">' + esc(D.meta.scope) + ' לכל סקר בטבלה יש קישור לפרסום המקורי. עדכון אחרון של נתוני הסקרים: ' + fmtStamp(D.meta.updatedAt) + '.</p>';
  }

  function pageAbout() {
    return '<h1>שיטה, ניטרליות ומקורות</h1>' + asOfLine() +
      '<h2>עקרונות</h2><ul><li>אין באתר המלצה להצבעה, אין שאלון התאמה ואין ציון לעמדות.</li><li>כל עמדה מוצגת במסגור של הרשימה עצמה, ככל האפשר בלשונה, עם סוג המקור וקישור.</li><li>כל הרשימות מוצגות באותו מבנה ובאותו סדר בכל העמודים. ' + esc(orderNote()) + '</li><li>החלוקה לגושים מבוססת על הצהרות הרשימות, וצבעי הגרפים ניטרליים ואינם צבעי המפלגות.</li></ul>' + legend() +
      '<h2>שיטת המסמך</h2>' + P.meta.intro.map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('') +
      '<h2>מה לא נכלל</h2><p class="note warn">' + esc(PARTY.raam.note) + ' הבחירה נעשתה במסמך המקור: 10 הרשימות הגדולות לפי ממוצע הסקרים, ועוד שתי רשימות שנוספו ב-20.10.2026 (מסומנות †). רע"ם (ממוצע ' + fmtN(D.computed.average.raam) + ' מנדטים) ושאר הרשימות שמתמודדות לא נכללו.</p>' +
      '<h2>פערים ואי-ודאויות</h2><ul>' + P.gaps.map(function (g) { return '<li>' + esc(g) + '</li>'; }).join('') + '</ul>' +
      '<h2>מקורות כלליים</h2><ul class="srcs">' + P.generalSources.map(function (s) { return '<li>' + (s.url ? srcLink(s.url, s.label) : esc(s.label)) + '</li>'; }).join('') + '</ul>' +
      '<p>המקורות של כל רשימה מופיעים בעמוד הפרופיל שלה, ומקור לכל עמדה מופיע לצדה.</p>' +
      '<h2>איך מתעדכנים הנתונים</h2><p>כל התוכן נמצא בקבצי נתונים: <a href="data/platforms.json">platforms.json</a> (רשימות, סוגיות ועמדות), <a href="data/analysis.json">analysis.json</a> (ניתוח רוחבי) ו-<a href="data/polls.json">polls.json</a> (סקרים). עדכון נעשה בקבצים האלה בלבד. סקר חדש נוסף בעזרת הסקריפט tools/update_polls.py, שמחשב מחדש את הממוצע, את סכומי הגושים ואת המגמה. התיעוד המלא נמצא ב-<a href="' + REPO + '#readme" target="_blank" rel="noopener noreferrer">מאגר הקוד<span class="sr"> (נפתח בחלון חדש)</span></a>.</p>' +
      '<h2>חותמות זמן</h2><ul><li>העמדות נכונות ל-' + fmtDate(P.meta.documentAsOf) + '.</li><li>קובצי הנתונים של המצעים נוצרו ב-' + fmtStamp(P.meta.generatedAt) + ' (מזהה גרסת המקור: <span class="ltr">' + esc(P.meta.sourceSha1) + '</span>).</li><li>נתוני הסקרים עודכנו ב-' + fmtStamp(D.meta.updatedAt) + '; הסקר האחרון מ-' + fmtDate(D.meta.latestPollDate) + '.</li></ul>';
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
    var key = r.page + '/' + r.arg;
    if (!keepScroll && key !== lastPage) { window.scrollTo(0, 0); $main.focus({ preventScroll: true }); }
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

  $main.addEventListener('click', function (e) {
    var t = e.target.closest('button'); if (!t) return;
    if (t.hasAttribute('data-cell')) { var p = t.getAttribute('data-cell').split('|'); openCell(p[0], p[1]); return; }
    if (t.hasAttribute('data-order')) { state.order = t.getAttribute('data-order'); store.set('order', state.order); render(true); foot(); return; }
    if (t.hasAttribute('data-mx')) { state.mxMode = t.getAttribute('data-mx'); store.set('mxMode', state.mxMode); render(true); return; }
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
  window.addEventListener('hashchange', function () { if (dlg.open) dlg.close(); render(false); });

  function getJSON(u) { return fetch(u, { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error(u + ' ' + r.status); return r.json(); }); }
  Promise.all([getJSON('data/platforms.json'), getJSON('data/analysis.json'), getJSON('data/polls.json')]).then(function (res) {
    P = res[0]; A = res[1]; D = res[2];
    LIST = byId(P.lists.map(function (l) { return l; })); ISS = byId(P.issues); PARTY = byId(D.parties);
    buildMentions(); render(false); foot();
  }).catch(function (err) {
    $main.innerHTML = '<p class="note warn">שגיאה בטעינת הנתונים (' + esc(err.message) + '). נסו לרענן את הדף.</p>';
  });
  if ('serviceWorker' in navigator && location.protocol === 'https:') { navigator.serviceWorker.register('sw.js').catch(function () {}); }
})();
