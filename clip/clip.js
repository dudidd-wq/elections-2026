/* Clip engine: a deterministic timeline. Every frame is a pure function of the clock T (seconds), so play, pause,
   scrubbing, seeking (?t=) and recording all render identically. requestAnimationFrame only; no libraries.
   Content comes only from clip-data.js (generated from data/podcasts.json by tools/build_clip.py). */
(function () {
  'use strict';
  var D = window.CLIP_DATA;
  var Q = new URLSearchParams(location.search);
  var REC = Q.get('rec') === '1';
  var app = document.getElementById('app'), stage = document.getElementById('stage'), host = document.getElementById('scenes');
  var LIST_DUR = 6.5; // equal screen time for every list
  var SITE = 'https://dudidd-wq.github.io/elections-2026/#/podcasts';
  var COLL = new Intl.Collator('he');
  var ENTRIES = D.entries.slice().sort(function (a, b) { return COLL.compare(a.name, b.name); });

  // ---------- helpers
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function clamp(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function eo(x) { return 1 - Math.pow(1 - x, 3); }            // easeOutCubic
  function eio(x) { return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
  function words(text, t0, span, lang) {           // split into word spans, revealed one by one
    var ws = text.split(/(\s+)/), out = '', n = ws.filter(function (w) { return w.trim(); }).length, k = 0;
    var st = Math.min(0.11, span / Math.max(1, n));
    ws.forEach(function (w) { if (!w.trim()) { out += w; return; } out += '<span class="w a" data-a="word" data-in="' + (t0 + k * st).toFixed(3) + '" data-d="0.45">' + esc(w) + '</span>'; k++; });
    return out;
  }
  function A(inT, type, d) { return ' data-in="' + inT + '"' + (type ? ' data-a="' + type + '"' : '') + (d ? ' data-d="' + d + '"' : ''); }
  function fmtT(s) { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ':' + ('0' + s % 60).slice(-2); }
  var IC = {
    check: '<svg viewBox="0 0 24 24"><path d="M4 12.5l5 5L20 6.5"/></svg>',
    quote: '<svg viewBox="0 0 24 24"><path d="M10 7H6a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h3v1a3 3 0 0 1-3 3M20 7h-4a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h3v1a3 3 0 0 1-3 3"/></svg>',
    link: '<svg viewBox="0 0 24 24"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>',
    ban: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M6 6l12 12"/></svg>',
    ext: '<svg viewBox="0 0 24 24"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>',
    ok: '<svg viewBox="0 0 24 24"><path d="M4 12.5l5 5L20 6.5"/></svg>'
  };

  // ---------- scenes
  var SC = [];
  function scene(id, chap, dur, cls, html, extra) { SC.push({ id: id, chap: chap, dur: dur, cls: cls, html: html, extra: extra || {}, wave: (extra && extra.wave) || 0.35 }); }

  scene('title', '', 9, 's-title',
    '<p' + A(0.3) + ' class="eyebrow">בחירות לכנסת ה-26 · 27.10.2026</p>' +
    '<h1><span' + A(0.6, 'up', 1) + '>ראשי הרשימות</span><span class="l2 a" data-in="1.0" data-d="1">בפודקאסטים ובראיונות ארוכים</span></h1>' +
    '<p' + A(1.8) + ' class="lead">מה אמרו ראשי ' + D.lists + ' הרשימות בחודש שלפני הבחירות – סיכום מונפש של הממצאים</p>' +
    '<div' + A(2.6) + ' class="date-pill">חלון הסקירה <b>' + D.window[0] + '–' + D.window[1] + '</b></div>', { wave: 1 });

  scene('scope', 'היקף', 12, 's-scope',
    '<p' + A(0.2) + ' class="eyebrow">היקף</p>' +
    '<h2' + A(0.4) + '>מה נאסף</h2>' +
    '<div class="kpis"><div' + A(0.8) + ' class="kpi"><b data-count="' + D.total + '" data-cin="0.9" data-cd="1.6">0</b><span>הופעות שאותרו</span></div>' +
    '<div' + A(1.1) + ' class="kpi"><b data-count="' + D.lists + '" data-cin="1.2" data-cd="1.2">0</b><span>ראשי רשימות – לכל אחד לפחות הופעה אחת</span></div>' +
    '<div' + A(1.4) + ' class="kpi"><b class="stamp">חודש אחד</b><span>' + D.window[0] + '–' + D.window[1] + '</span></div></div>' +
    '<div class="dots" data-dots="types"></div>' +
    '<p' + A(2.0) + ' class="foot" style="bottom:auto;top:560px;text-align:center">כל נקודה – הופעה אחת · לפי סוג ההופעה, לכל הרשימות יחד</p>', { wave: .3 });

  scene('method', 'שיטה', 12, 's-method',
    '<p' + A(0.2) + ' class="eyebrow">שיטה</p>' +
    '<h2' + A(0.4) + '>רק מה שנבדק מול המקור</h2>' +
    '<div class="mgrid"><ul class="mlist">' +
    '<li' + A(1.0, 'left') + '>' + IC.check + '<span>פודקאסטים וראיונות אודיו/וידאו ארוכים של ראשי הרשימות – בעברית, באנגלית ובערבית</span></li>' +
    '<li' + A(1.6, 'left') + '>' + IC.quote + '<span>ציטוט – רק אם נבדק מול תמלול או מול דף המקור, כדברי ראש הרשימה עצמו ולא ככותרת</span></li>' +
    '<li' + A(2.2, 'left') + '>' + IC.link + '<span>כל השאר באתר – פרפרזה, ומסומן כך. לכל הופעה ולכל ציטוט – קישור למקור</span></li>' +
    '<li' + A(2.8, 'left') + '>' + IC.ban + '<span>לא נכללו פודקאסטים בהפקת המפלגות עצמן</span></li></ul>' +
    '<div' + A(1.3, 'scale') + ' class="big39"><b data-count="' + D.quotes + '" data-cin="1.5" data-cd="1.6">0</b><span>ציטוטים מאומתים</span><small>בכל ההופעות יחד. מספר ההופעות משקף את מה שאותר בחיפוש, ואינו מדד לחשיבות או דירוג.</small></div></div>', { wave: .3 });

  scene('stage', 'ממצאים', 12, 's-stage',
    '<p' + A(0.2) + ' class="eyebrow">ממצא · בחירת במה</p>' +
    '<h2' + A(0.4) + '>לאיזה קהל פנו ההופעות</h2>' +
    '<p' + A(0.8) + ' class="lead">לפי סיווג הקהל שמוצג באתר בכל הופעה · ' + D.total + ' הופעות, לכל הרשימות יחד</p>' +
    '<div class="dots" data-dots="aud"></div>' +
    '<p' + A(5.0) + ' class="foot">הסיווג הוא של העורך, ומוצהר כך באתר. הספירה אינה מפורטת כאן לפי רשימה.</p>', { wave: .3 });

  var ft = D.findTopics; // "נושאים: גיוס חרדים עלה אצל רוב ראשי הרשימות, בעיקר במסגור קואליציוני (...). נושאים חוזרים נוספים: a, b, c, d ו-e."
  var mFrame = ft.match(/בעיקר במסגור קואליציוני \(([^)]*)\)/);
  var more = ft.split('נושאים חוזרים נוספים:')[1].replace(/\.\s*$/, '').trim();
  var chips = more.split(/,\s*/); var last = chips.pop(); var lp = last.split(/ ו-(?=[^ ])/);
  if (lp.length === 2) { chips.push(lp[0].trim()); chips.push(lp[1].trim()); } else chips.push(last);
  // "חשבון הגושים ואחוז החסימה" is one pair in the source sentence ("..., יוקר המחיה, חשבון הגושים ואחוז החסימה")
  var styleF = D.findStyle.replace(/^סגנון:\s*/, '');
  scene('topics', 'ממצאים', 11, 's-topics',
    '<p' + A(0.2) + ' class="eyebrow">ממצא · נושאים</p>' +
    '<p class="bigq">' + words('גיוס חרדים עלה אצל רוב ראשי הרשימות', 0.5, 1.0) + '</p>' +
    '<p' + A(1.9) + ' class="lead">בעיקר במסגור קואליציוני: ' + esc(mFrame ? mFrame[1] : '') + '</p>' +
    '<p' + A(3.0) + ' class="sub2">נושאים חוזרים נוספים</p>' +
    '<div class="chips">' + chips.map(function (c, i) { return '<span' + A((3.3 + i * 0.35).toFixed(2), 'scale') + ' class="chip">' + esc(c) + '</span>'; }).join('') + '</div>' +
    '<p' + A(5.6) + ' class="foot">ועוד: ' + esc(styleF) + '</p>', { wave: .3, chips: chips });

  var tmax = 13;
  scene('bars', 'ממצאים', 10, 's-bars',
    '<p' + A(0.2) + ' class="eyebrow">נתונים · 10 הסוגיות של האתר</p>' +
    '<h2' + A(0.4) + ' style="font-size:64px">בכמה מ-' + D.lists + ' הרשימות עלתה כל סוגיה</h2>' +
    '<div class="bars">' + D.topics.map(function (t, i) {
      var tin = (1.0 + i * 0.16).toFixed(2);
      return '<div' + A(tin, 'left', .6) + ' class="brow"><span class="lab">' + esc(t[0]) + '</span><span class="trk"><i class="fil" data-w="' + (t[1] / tmax).toFixed(4) + '" data-win="' + (+tin + .2).toFixed(2) + '"></i></span><span class="val"><b data-count="' + t[1] + '" data-cin="' + (+tin + .2).toFixed(2) + '" data-cd="1.1">0</b> מתוך ' + tmax + '</span></div>';
    }).join('') + '</div>' +
    '<p' + A(3.4) + ' class="foot" style="bottom:70px">סוגיה נספרת לרשימה אם תויגה לפחות באחת מהופעות ראש הרשימה. הופעה יכולה לעסוק בכמה סוגיות. התיוג לפי 10 הסוגיות של האתר בלבד.</p>', { wave: .25 });

  scene('index', '13 הרשימות', 7, 's-index',
    '<p' + A(0.2) + ' class="eyebrow">13 הרשימות</p>' +
    '<h2' + A(0.4) + '>לפי סדר האלף-בית</h2>' +
    '<p' + A(0.8) + ' class="lead" style="font-size:38px">ציטוט מאומת אחד מכל ראש רשימה · אותו מבנה ואותו זמן מסך לכל רשימה · הסדר אינו דירוג</p>' +
    '<div class="lgrid">' + ENTRIES.map(function (e, i) { return '<div' + A((1.3 + i * 0.12).toFixed(2), 'scale', .5) + ' class="lchip"><b>' + esc(e.name) + '</b><span>' + esc(e.leader) + '</span></div>'; }).join('') + '</div>', { wave: .3 });

  ENTRIES.forEach(function (e, i) {
    var nW = e.quote.split(/\s+/).length;
    var qlang = e.lang === 'he' ? '' : ' lang="' + e.lang + '" dir="' + (e.lang === 'en' ? 'ltr' : 'rtl') + '"';
    var meta = [e.type];
    scene('list-' + e.id, '13 הרשימות', LIST_DUR, 's-list',
      '<div' + A(0.05, 'fade', .4) + ' class="prog"><span>לפי סדר האלף-בית · ' + (i + 1) + ' מתוך ' + ENTRIES.length + '</span><span class="ticks13">' + ENTRIES.map(function (_, k) { return '<i class="' + (k < i ? 'done' : k === i ? 'cur' : '') + '">' + (k === i ? '<b></b>' : '') + '</i>'; }).join('') + '</span></div>' +
      '<div' + A(0.15, 'up', .7) + ' class="lname' + (e.name.length > 22 ? ' longn' : '') + '">' + esc(e.name) + '</div>' +
      '<div' + A(0.35, 'up', .7) + ' class="lleader">' + esc(e.leader) + '</div>' +
      '<figure' + A(0.6, 'up', .8) + ' class="qcard" style="margin-inline:0"><blockquote class="qtext' + (e.quote.length > 60 ? ' long' : '') + '"' + qlang + ' style="margin:0">' +
      words((e.lang === 'he' ? '„' : '“') + e.quote + '”', 0.95, 1.6) + '</blockquote>' +
      '<figcaption><div' + A(2.5, 'fade', .6) + ' class="qattr">— ' + esc(e.leader) + ' · ' + esc(e.show) + (e.outlet && e.show.indexOf(e.outlet) < 0 ? ' (' + esc(e.outlet) + ')' : '') + ' · ' + esc(e.date) + '</div>' +
      '<div' + A(2.8, 'fade', .6) + ' class="qmeta"><span>' + esc(e.type) + '</span><span class="ok">' + IC.ok + esc(e.method) + (e.ts ? ' · בזמן <span class="ltr">' + esc(e.ts) + '</span>' : '') + '</span>' +
      '<a href="' + esc(e.src) + '" target="_blank" rel="noopener noreferrer" tabindex="-1">למקור הציטוט ↗</a></div></figcaption></figure>', { wave: .55, entry: e, nW: nW });
  });

  scene('gaps', 'מגבלות', 11, 's-gaps',
    '<p' + A(0.2) + ' class="eyebrow">פערים ומגבלות</p>' +
    '<h2' + A(0.4) + '>מה לא נכלל, ומה חשוב לדעת</h2>' +
    '<ul class="glist">' + [
      'לא נכללו פודקאסטים בהפקת המפלגות, נאומים ועימותים',
      'ראיונות רדיו לא נאספו באופן שיטתי – ייתכן שחסרים ראיונות',
      'הופעות בלי כתוביות או תמלול – פרטים ותקציר בלבד, ללא ציטוט',
      'הסיקור בערבית חלקי',
      'תוויות הקהל הן סיווג של העורך; מספר ההופעות אינו מדד לחשיבות'
    ].map(function (g, i) { return '<li' + A((1.0 + i * 0.55).toFixed(2), 'left') + '>' + esc(g) + '</li>'; }).join('') + '</ul>', { wave: .25 });

  scene('close', 'סיום', 9, 's-close',
    '<p' + A(0.2) + ' class="eyebrow">לכל הפרטים</p>' +
    '<h2' + A(0.4) + '>כל ' + D.total + ' ההופעות, הקישורים והציטוטים המלאים – באתר</h2>' +
    '<a' + A(1.2, 'scale') + ' class="url" href="' + SITE + '" target="_top" rel="noopener" tabindex="-1">' + IC.link + '<span class="ltr">dudidd-wq.github.io/elections-2026/#/podcasts</span></a>' +
    '<p' + A(2.0) + ' class="neutral"><b>אתר מידע ניטרלי.</b> אין בו המלצה להצבעה · הנתונים עודכנו ב-' + D.updated + '</p>', { wave: 1, last: true });

  // equal-time guard (neutrality): every list scene must have the same duration
  SC.filter(function (s) { return s.id.indexOf('list-') === 0; }).forEach(function (s) { if (s.dur !== LIST_DUR) throw new Error('unequal list time'); });

  // ---------- build DOM
  var T0 = 0;
  SC.forEach(function (s) {
    s.start = T0; T0 += s.dur;
    var el = document.createElement('section');
    el.className = 'scene ' + s.cls; el.setAttribute('aria-hidden', 'true'); el.innerHTML = s.html;
    host.appendChild(el); s.el = el;
    s.anims = [].map.call(el.querySelectorAll('[data-in]'), function (n) {
      n.classList.add('a');
      var t = n.getAttribute('data-a') || 'up';
      return { el: n, t0: +n.getAttribute('data-in') || 0, d: +(n.getAttribute('data-d') || (t === 'word' ? .45 : .8)), type: t, last: -1 };
    });
    s.counts = [].map.call(el.querySelectorAll('[data-count]'), function (n) { return { el: n, v: +n.getAttribute('data-count'), t0: +n.getAttribute('data-cin'), d: +n.getAttribute('data-cd'), last: -1 }; });
    s.fills = [].map.call(el.querySelectorAll('[data-w]'), function (n) { return { el: n, w: +n.getAttribute('data-w'), t0: +n.getAttribute('data-win'), last: -1 }; });
    var dh = el.querySelector('[data-dots]'); if (dh) s.dots = buildDots(dh, dh.getAttribute('data-dots'));
  });
  var DUR = T0;
  window.CLIP = { duration: DUR, scenes: SC.map(function (s) { return { id: s.id, start: s.start, dur: s.dur }; }) };

  // ---------- dot clusters (one dot = one appearance; no list identity, all same colour)
  function layoutClusters(groups, cy, width) {          // RTL: first group on the right
    var DS = 42, pos = [], labels = [];
    var widths = groups.map(function (g) { return g.cols * DS; });
    var gap = (width - widths.reduce(function (a, b) { return a + b; }, 0)) / (groups.length + 1);
    var x = 960 + width / 2 - gap; var idx = 0;
    groups.forEach(function (g, gi) {
      var right = x, rows = Math.ceil(g.n / g.cols);
      for (var k = 0; k < g.n; k++) { var c = k % g.cols, r = Math.floor(k / g.cols); pos[idx++] = { x: right - DS / 2 - c * DS, y: cy - (rows * DS) / 2 + DS / 2 + r * DS }; }
      labels.push({ x: right - widths[gi] / 2, y: cy + (rows * DS) / 2 + 26, g: g });
      x = right - widths[gi] - gap;
    });
    return { pos: pos, labels: labels };
  }
  function buildDots(h, kind) {
    var N = D.total, groups, cy, start;
    if (kind === 'types') {
      groups = [{ n: D.types[0], cols: 9, lab: 'פודקאסטים', sub: 'אודיו או וידאו' }, { n: D.types[1], cols: 4, lab: 'ראיונות טלוויזיה', sub: 'או וידאו ארוכים' }, { n: D.types[2], cols: 4, lab: 'ראיונות רדיו', sub: '' }];
      cy = 740;
    } else {
      groups = [{ n: D.audience[0], cols: 5, lab: 'במות מיינסטרים', sub: '' }, { n: D.audience[1], cols: 5, lab: 'קהל קרוב למחנה הדובר', sub: '' }, { n: D.audience[2], cols: 3, lab: 'קהל קרוב למחנה אחר', sub: '' }, { n: D.audience[3], cols: 5, lab: 'קהל כללי או ייעודי', sub: 'כלכלה, לייף-סטייל, דוברי אנגלית ועוד' }];
      cy = 600;
    }
    var L = layoutClusters(groups, cy, 1640);
    // start: one evenly spaced grid of all N dots (16 columns), RTL
    var S = []; for (var i = 0; i < N; i++) { var c = i % 16, r = Math.floor(i / 16); S.push({ x: 960 + 7.5 * 52 - c * 52, y: cy - 52 + r * 52 }); }
    var dots = [];
    for (i = 0; i < N; i++) { var d = document.createElement('i'); d.className = 'dot'; h.appendChild(d); dots.push(d); }
    var labs = L.labels.map(function (l, gi) {
      var e = document.createElement('div'); e.className = 'clab';
      e.innerHTML = '<b data-v="' + l.g.n + '">0</b><span>' + esc(l.g.lab) + '</span>' + (l.g.sub ? '<small>' + esc(l.g.sub) + '</small>' : '');
      e.style.right = (1920 - l.x) + 'px'; e.style.left = 'auto'; e.style.top = l.y + 'px'; e.style.transform = 'translateX(50%)';
      h.appendChild(e); return { el: e, b: e.firstChild, n: l.g.n, gi: gi };
    });
    return { dots: dots, S: S, E: L.pos, labs: labs, kind: kind, last: -1 };
  }
  function renderDots(o, lt) {
    var tIn = o.kind === 'types' ? 2.0 : 1.2, tMove = o.kind === 'types' ? 3.4 : 2.4;
    var key = Math.round(lt * 60); if (key === o.last) return; o.last = key;
    for (var i = 0; i < o.dots.length; i++) {
      var a = eo(clamp((lt - tIn - i * 0.018) / 0.5));
      var m = eio(clamp((lt - tMove - (i % 16) * 0.02) / 1.1));
      var x = o.S[i].x + (o.E[i].x - o.S[i].x) * m, y = o.S[i].y + (o.E[i].y - o.S[i].y) * m;
      var st = o.dots[i].style; st.opacity = a; st.transform = 'translate(' + (x - 960).toFixed(1) + 'px,' + y.toFixed(1) + 'px) scale(' + (0.4 + 0.6 * a).toFixed(3) + ')'; st.left = '960px'; st.top = '0px';
    }
    o.labs.forEach(function (l) {
      var p = eo(clamp((lt - tMove - 0.9 - l.gi * 0.2) / 0.7));
      l.el.style.opacity = p; l.el.style.transform = 'translateX(50%) translateY(' + ((1 - p) * 24).toFixed(1) + 'px)';
      l.b.textContent = Math.round(l.n * eo(clamp((lt - tMove - 0.9 - l.gi * 0.2) / 1.0)));
    });
  }

  // ---------- waveform (deterministic from T)
  var cv = document.getElementById('wave'), cx = cv.getContext('2d');
  var lastAmp = 0.4;
  function drawWave(T, amp) {
    cx.clearRect(0, 0, 1920, 260);
    var N = 96, bw = 1920 / N;
    for (var i = 0; i < N; i++) {
      var u = i / (N - 1), env = Math.sin(Math.PI * u);
      var h = (0.18 + 0.82 * Math.abs(Math.sin(i * 1.7 + T * 2.6) * Math.sin(i * 0.37 - T * 1.15) * 0.75 + 0.25 * Math.sin(i * 0.11 + T * 0.7))) * env * amp * 220 + 3;
      cx.fillStyle = 'rgba(157,184,234,' + (0.10 + 0.22 * env * amp).toFixed(3) + ')';
      var x = i * bw + bw * 0.28, w = bw * 0.44;
      cx.beginPath(); if (cx.roundRect) cx.roundRect(x, 250 - h, w, h, w / 2); else cx.rect(x, 250 - h, w, h); cx.fill();
    }
  }

  // ---------- render
  var orbs = [].slice.call(document.querySelectorAll('.orb'));
  var chapEl = document.getElementById('chap'), tl = document.getElementById('tline'), live = document.getElementById('live');
  var curScene = null, curChap = null;
  function sceneAt(T) { for (var i = 0; i < SC.length; i++) if (T < SC[i].start + SC[i].dur) return SC[i]; return SC[SC.length - 1]; }
  function applyAnim(n, p) {
    if (Math.abs(p - n.last) < 0.002) return; n.last = p; var e = eo(p), s = n.el.style;
    s.opacity = e.toFixed(3);
    if (n.type === 'up') s.transform = 'translateY(' + ((1 - e) * 48).toFixed(1) + 'px)';
    else if (n.type === 'word') s.transform = 'translateY(' + ((1 - e) * 0.32).toFixed(3) + 'em)';
    else if (n.type === 'left') s.transform = 'translateX(' + ((1 - e) * -60).toFixed(1) + 'px)';
    else if (n.type === 'scale') s.transform = 'scale(' + (0.9 + 0.1 * e).toFixed(3) + ')';
  }
  function render(T) {
    var s = sceneAt(T), lt = T - s.start;
    if (s !== curScene) {
      if (curScene) { curScene.el.classList.remove('on'); curScene.el.setAttribute('aria-hidden', 'true'); }
      s.el.classList.add('on'); s.el.removeAttribute('aria-hidden'); curScene = s;
      s.anims.forEach(function (n) { n.last = -1; }); s.counts.forEach(function (c) { c.last = -1; }); s.fills.forEach(function (f) { f.last = -1; }); if (s.dots) s.dots.last = -1;
      var txt = s.el.textContent.replace(/\s+/g, ' ').trim(); live.textContent = '';
      if (!REC) setTimeout(function () { live.textContent = txt.slice(0, 400); }, 50);
    }
    // scene-level fade in/out
    var fin = clamp(lt / 0.35), fout = s.extra.last ? 1 : clamp((s.dur - lt) / 0.45);
    s.el.style.opacity = Math.min(fin, fout).toFixed(3);
    s.el.style.transform = fout < 1 ? 'scale(' + (0.985 + 0.015 * fout).toFixed(4) + ')' : '';
    s.anims.forEach(function (n) { applyAnim(n, clamp((lt - n.t0) / n.d)); });
    s.counts.forEach(function (c) { var v = Math.round(c.v * eo(clamp((lt - c.t0) / c.d))); if (v !== c.last) { c.last = v; c.el.textContent = v; } });
    s.fills.forEach(function (f) { var p = eo(clamp((lt - f.t0) / 1.1)); if (Math.abs(p - f.last) > .002) { f.last = p; f.el.style.transform = 'scaleX(' + (f.w * p).toFixed(4) + ')'; } });
    if (s.dots) renderDots(s.dots, lt);
    if (s.extra.entry) { if (!s.cur) s.cur = s.el.querySelector('.ticks13 .cur b'); s.cur.style.transform = 'scaleX(' + clamp(lt / s.dur).toFixed(4) + ')'; }
    if (s.chap !== curChap) { curChap = s.chap; chapEl.textContent = s.chap; }
    // waveform amplitude: eases between scenes; list scenes "speak" while the quote is revealed
    var target = s.wave;
    if (s.extra.entry) target = 0.35 + 0.55 * (lt > 0.9 && lt < 2.7 ? Math.sin(Math.PI * (lt - 0.9) / 1.8) : 0);
    if (s.id === 'title') target = 0.35 + 0.65 * eo(clamp(lt / 2));
    if (s.extra.last) target = 1 - 0.6 * eo(clamp((lt - 4) / 4));
    lastAmp += (target - lastAmp) * 0.12; if (jump) { lastAmp = target; jump = false; }
    drawWave(T, lastAmp);
    // background drift
    orbs[0].style.transform = 'translate(' + (Math.sin(T * 0.07) * 120).toFixed(1) + 'px,' + (Math.cos(T * 0.05) * 80).toFixed(1) + 'px)';
    orbs[1].style.transform = 'translate(' + (Math.cos(T * 0.06) * 140).toFixed(1) + 'px,' + (Math.sin(T * 0.08) * 70).toFixed(1) + 'px)';
    orbs[2].style.transform = 'translate(' + (Math.sin(T * 0.045 + 1) * 260).toFixed(1) + 'px,' + (Math.cos(T * 0.04) * 120).toFixed(1) + 'px)';
    tl.style.transform = 'scaleX(' + (T / DUR).toFixed(4) + ')';
    updateUI(T);
  }

  // ---------- scaling (letterbox)
  function fit() {
    var vw = window.innerWidth, vh = window.innerHeight;
    var k = Math.min(vw / 1920, vh / 1080);
    stage.style.transform = 'translate(-50%,-50%) scale(' + k + ')';
    var rot = document.getElementById('rot'); if (rot) rot.style.top = (vh / 2 + 540 * k + 16) + 'px';
  }
  window.addEventListener('resize', fit); window.addEventListener('orientationchange', fit); fit();

  // ---------- clock
  var T = Math.min(Math.max(0, parseFloat(Q.get('t')) || 0), DUR), playing = false, lastNow = 0, jump = true;
  function frame(now) {
    if (playing) {
      var dt = lastNow ? Math.min(0.1, (now - lastNow) / 1000) : 0; lastNow = now; T += dt;
      if (T >= DUR) { T = DUR; setPlaying(false); }
    }
    render(T);
    requestAnimationFrame(frame);
  }
  var bPlay = document.getElementById('bPlay'), icPlay = document.getElementById('icPlay');
  function setPlaying(v) {
    playing = v; lastNow = 0;
    if (v && T >= DUR - 0.01) { T = 0; jump = true; }
    bPlay.setAttribute('aria-label', v ? 'השהיה' : (T >= DUR ? 'הפעלה מחדש' : 'הפעלה'));
    bPlay.title = (v ? 'השהיה' : 'הפעלה') + ' (רווח)';
    icPlay.setAttribute('d', v ? 'M7 5h4v14H7zM13 5h4v14h-4z' : (T >= DUR ? 'M12 5a7 7 0 1 1-6.6 4.7L3 9l1.5 5 4.7-2.2-2-1A5 5 0 1 0 12 7z' : 'M8 5v14l11-7z'));
    music.sync();
    poke();
  }
  function seek(t) { T = Math.min(Math.max(0, t), DUR); jump = true; lastNow = 0; if (T < DUR && !playing && bPlay.getAttribute('aria-label') === 'הפעלה מחדש') setPlaying(false); }

  // ---------- UI
  var scrub = document.getElementById('scrub'), fill = document.getElementById('fill'), knob = document.getElementById('knob'), timeEl = document.getElementById('time');
  scrub.setAttribute('aria-valuemax', Math.round(DUR));
  document.getElementById('ticks').innerHTML = SC.filter(function (s, i) { return i > 0 && s.chap !== SC[i - 1].chap; }).map(function (s) { return '<i style="left:' + (s.start / DUR * 100).toFixed(2) + '%"></i>'; }).join('');
  var lastSec = -1;
  function updateUI(T) {
    var p = T / DUR;
    fill.style.transform = 'scaleX(' + p.toFixed(4) + ')'; knob.style.left = (p * 100).toFixed(3) + '%';
    var sec = Math.round(T); if (sec !== lastSec) { lastSec = sec; timeEl.textContent = fmtT(T) + ' / ' + fmtT(DUR); scrub.setAttribute('aria-valuenow', sec); scrub.setAttribute('aria-valuetext', fmtT(T) + ' מתוך ' + fmtT(DUR)); }
  }
  bPlay.addEventListener('click', function () { setPlaying(!playing); });
  var dragging = false, wasPlaying = false;
  function posToT(ev) { var r = scrub.querySelector('.track').getBoundingClientRect(); return clamp((ev.clientX - r.left) / r.width) * DUR; }
  scrub.addEventListener('pointerdown', function (ev) { dragging = true; wasPlaying = playing; playing = false; scrub.setPointerCapture(ev.pointerId); seek(posToT(ev)); poke(); });
  scrub.addEventListener('pointermove', function (ev) { if (dragging) seek(posToT(ev)); });
  function endDrag() { if (!dragging) return; dragging = false; if (wasPlaying && T < DUR) setPlaying(true); }
  scrub.addEventListener('pointerup', endDrag); scrub.addEventListener('pointercancel', endDrag);
  scrub.addEventListener('keydown', function (ev) {
    var k = ev.key, d = 0;
    if (k === 'ArrowLeft' || k === 'ArrowDown') d = -5; else if (k === 'ArrowRight' || k === 'ArrowUp') d = 5; else if (k === 'Home') { seek(0); ev.preventDefault(); } else if (k === 'End') { seek(DUR - 0.01); ev.preventDefault(); }
    if (d) { seek(T + d); ev.preventDefault(); ev.stopPropagation(); }
  });
  document.addEventListener('keydown', function (ev) {
    if (ev.target && /^(INPUT|TEXTAREA|SELECT)$/.test(ev.target.tagName)) return;
    var k = ev.key;
    if (k === ' ' || k === 'k' || k === 'K') { if (ev.target && ev.target.tagName === 'BUTTON' && k === ' ') return; ev.preventDefault(); setPlaying(!playing); }
    else if ((k === 'ArrowLeft' || k === 'ArrowRight') && ev.target !== scrub) { seek(T + (k === 'ArrowRight' ? 5 : -5)); ev.preventDefault(); poke(); }
    else if (k === 'f' || k === 'F' || k === 'כ') toggleFull();
    else if (k === 'm' || k === 'M' || k === 'צ') music.toggle();
  });
  // fullscreen
  var bFull = document.getElementById('bFull');
  var fsOK = !!(document.fullscreenEnabled || document.webkitFullscreenEnabled);
  if (!fsOK) bFull.hidden = true;
  function toggleFull() {
    if (!fsOK) return;
    var fe = document.fullscreenElement || document.webkitFullscreenElement;
    if (fe) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    else { var p = (app.requestFullscreen || app.webkitRequestFullscreen).call(app); if (p && p.catch) p.catch(function () {}); }
  }
  bFull.addEventListener('click', toggleFull);
  document.addEventListener('fullscreenchange', function () { var on = !!document.fullscreenElement; bFull.setAttribute('aria-label', on ? 'יציאה ממסך מלא' : 'מסך מלא'); fit(); });
  // auto-hide controls while playing
  var idleT = 0;
  var ctl = document.getElementById('controls');
  function poke() { app.classList.remove('idle'); clearTimeout(idleT); if (playing) idleT = setTimeout(function () { if (playing && !dragging && !ctl.contains(document.activeElement) && !ctl.matches(':hover')) app.classList.add('idle'); }, 2600); }
  ['pointermove', 'pointerdown', 'keydown', 'touchstart'].forEach(function (e) { document.addEventListener(e, poke, { passive: true }); });
  document.getElementById('controls').addEventListener('focusin', function () { app.classList.remove('idle'); clearTimeout(idleT); });
  document.getElementById('controls').addEventListener('focusout', poke);
  // tap on the stage toggles play (like a video)
  document.getElementById('viewport').addEventListener('click', function (ev) { if (ev.target.closest('a')) return; setPlaying(!playing); });

  // ---------- optional generated background music (Web Audio synth, OFF by default, no recorded audio)
  var music = (function () {
    var ac = null, master = null, on = false, timer = 0, next = 0, step = 0;
    var CH = [[57, 60, 64, 69], [53, 57, 60, 65], [48, 55, 60, 64], [55, 59, 62, 67]]; // Am F C G
    var b = document.getElementById('bMusic');
    function hz(m) { return 440 * Math.pow(2, (m - 69) / 12); }
    function pad(notes, t, len) {
      notes.forEach(function (m, j) {
        [0, 7].forEach(function (det) {
          var o = ac.createOscillator(), g = ac.createGain();
          o.type = j === 0 ? 'sine' : 'triangle'; o.frequency.value = hz(m - (j === 0 ? 12 : 0)); o.detune.value = det - 3.5;
          g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(j === 0 ? 0.05 : 0.022, t + 1.4); g.gain.setValueAtTime(j === 0 ? 0.05 : 0.022, t + len - 1.2); g.gain.linearRampToValueAtTime(0, t + len + 0.6);
          o.connect(g); g.connect(master.f); o.start(t); o.stop(t + len + 0.7);
        });
      });
    }
    function pluck(m, t) {
      var o = ac.createOscillator(), g = ac.createGain(); o.type = 'sine'; o.frequency.value = hz(m + 12);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.03, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0005, t + 1.1);
      o.connect(g); g.connect(master.f); o.start(t); o.stop(t + 1.2);
    }
    function sched() {
      while (next < ac.currentTime + 0.6) {
        var bar = Math.floor(step / 8) % CH.length, ch = CH[bar];
        if (step % 8 === 0) pad(ch, next, 4);
        if ([0, 3, 5, 6].indexOf(step % 8) >= 0) pluck(ch[(step * 3) % ch.length], next);
        next += 0.5; step++;
      }
    }
    function start() {
      if (!ac) {
        var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return false;
        ac = new AC(); master = ac.createGain(); master.gain.value = 0; master.f = ac.createBiquadFilter(); master.f.type = 'lowpass'; master.f.frequency.value = 1400; master.f.connect(master); master.connect(ac.destination);
      }
      if (ac.state === 'suspended') ac.resume();
      next = ac.currentTime + 0.1; clearInterval(timer); timer = setInterval(sched, 150); sched();
      master.gain.cancelScheduledValues(ac.currentTime); master.gain.setValueAtTime(master.gain.value, ac.currentTime); master.gain.linearRampToValueAtTime(0.9, ac.currentTime + 1.2);
      return true;
    }
    function stop() {
      if (!ac) return; clearInterval(timer);
      master.gain.cancelScheduledValues(ac.currentTime); master.gain.setValueAtTime(master.gain.value, ac.currentTime); master.gain.linearRampToValueAtTime(0, ac.currentTime + 0.4);
      setTimeout(function () { if (!(on && playing) && ac.state === 'running') ac.suspend(); }, 500);
    }
    function sync() { if (on && playing) start(); else stop(); }
    function toggle() { on = !on; b.setAttribute('aria-pressed', on); b.setAttribute('aria-label', 'מוזיקת רקע (' + (on ? 'פועלת' : 'כבויה') + ')'); sync(); }
    b.addEventListener('click', toggle);
    return { toggle: toggle, sync: sync };
  })();

  // ---------- start (after fonts, so Hebrew layout doesn't jump)
  if (REC) app.classList.add('rec');
  var started = false;
  function go() {
    if (started) return; started = true; document.documentElement.classList.add('ready');
    render(T); requestAnimationFrame(frame);
    if (Q.get('paused') !== '1') setPlaying(true); else setPlaying(false);
    window.CLIP.startedAt = performance.now();
    window.dispatchEvent(new Event('clipstart'));
  }
  window.CLIP.seek = function (t) { seek(t); render(T); };
  window.CLIP.pause = function () { setPlaying(false); };
  window.CLIP.play = function () { setPlaying(true); };
  window.CLIP.time = function () { return T; };
  (document.fonts && document.fonts.ready ? Promise.race([document.fonts.ready, new Promise(function (r) { setTimeout(r, 1500); })]) : Promise.resolve()).then(go);
})();
