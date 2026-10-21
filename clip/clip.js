/* Clip engine v2 – deterministic timeline at 120 BPM (1 beat = 0.5 s). Every frame is a pure function of the clock T,
   so play / pause / scrub / ?t= seeking / frame-exact recording all render identically. requestAnimationFrame only.
   Content: ONLY clip-data.js (generated from data/podcasts.json by tools/build_clip.py). Music: audio.js (generated). */
(function () {
  'use strict';
  var D = window.CLIP_DATA, AU = window.ClipAudio;
  var Q = new URLSearchParams(location.search);
  var REC = Q.get('rec') === '1';
  var CALM = Q.get('calm') === '1' || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  var SPB = AU.SPB;                     // seconds per beat
  var LIST_BEATS = 16;                  // equal screen time for every list (8 s = exactly 4 bars: every list gets the identical musical bed)
  var SITE = 'https://dudidd-wq.github.io/elections-2026/#/podcasts';
  var COLL = new Intl.Collator('he');
  var ENTRIES = D.entries.slice().sort(function (a, b) { return COLL.compare(a.name, b.name); });
  var app = document.getElementById('app'), stage = document.getElementById('stage'), host = document.getElementById('scenes');

  // ---------- helpers
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function clamp(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function eo(x) { return 1 - Math.pow(1 - x, 3); }
  function ex(x) { return x >= 1 ? 1 : 1 - Math.pow(2, -10 * x); }
  function eb(x) { var c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); }
  function eio(x) { return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
  function B(n) { return (n * SPB).toFixed(3); }
  function A(beat, type, dBeats) { return ' data-in="' + B(beat) + '"' + (type ? ' data-a="' + type + '"' : '') + (dBeats ? ' data-d="' + B(dBeats) + '"' : ''); }
  function chars(text, beat0, spanSec, type) { // letter-by-letter; words kept unbreakable, digit/Latin runs kept as one token (bidi)
    var toks = text.match(/[0-9A-Za-z][0-9A-Za-z.\-–:\/#]*|\s+|./gu) || [], n = toks.filter(function (t) { return t.trim(); }).length, st = spanSec / Math.max(1, n), out = '', k = 0, open = false;
    toks.forEach(function (c) {
      if (!c.trim()) { if (open) { out += '</span>'; open = false; } out += ' '; return; }
      if (!open) { out += '<span style="white-space:nowrap;display:inline-block">'; open = true; }
      out += '<span class="ch" data-in="' + (beat0 * SPB + k * st).toFixed(3) + '" data-a="' + (type || 'char') + '" data-d="0.5">' + esc(c) + '</span>'; k++;
    });
    if (open) out += '</span>';
    return out;
  }
  function words(text, t0, span, type) {
    var ws = text.split(/(\s+)/), n = ws.filter(function (w) { return w.trim(); }).length, k = 0, out = '';
    var st = Math.min(0.12, span / Math.max(1, n));
    ws.forEach(function (w) { if (!w.trim()) { out += w; return; } out += '<span class="w" data-a="' + (type || 'word') + '" data-in="' + (t0 + k * st).toFixed(3) + '" data-d="0.5">' + esc(w) + '</span>'; k++; });
    return out;
  }
  function fmtT(s) { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ':' + ('0' + s % 60).slice(-2); }
  var IC = {
    check: '<svg viewBox="0 0 24 24"><path d="M4 12.5l5 5L20 6.5"/></svg>',
    quote: '<svg viewBox="0 0 24 24"><path d="M10 7H6a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h3v1a3 3 0 0 1-3 3M20 7h-4a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h3v1a3 3 0 0 1-3 3"/></svg>',
    link: '<svg viewBox="0 0 24 24"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>',
    ban: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M6 6l12 12"/></svg>',
    ok: '<svg viewBox="0 0 24 24"><path d="M4 12.5l5 5L20 6.5"/></svg>',
    mic: '<svg viewBox="0 0 24 36" class="bigmic"><rect x="7" y="2" width="10" height="18" rx="5"/><path d="M3 15a9 9 0 0 0 18 0M12 24v8M7 33h10"/></svg>'
  };

  // ---------- scenes (durations in beats; every list scene = LIST_BEATS)
  var SC = [];
  function scene(id, chap, beats, cls, html, x) { x = x || {}; SC.push({ id: id, chap: chap, beats: beats, dur: beats * SPB, cls: cls, html: html, x: x, tr: x.tr || 'zoom' }); }

  scene('title', '', 16, 's-title',
    '<div class="rings" data-ring="1"><i></i><i></i><i></i>' + IC.mic + '</div>' +
    '<p class="eyebrow"' + A(1.5, 'flicker', 2) + '>בחירות לכנסת ה-26 · 27.10.2026</p>' +
    '<h1 class="glow"><span class="l1">' + chars('ראשי הרשימות', 4, 0.55, 'char') + '</span><span class="l2 gtxt">' + chars('בפודקאסטים ובראיונות ארוכים', 4.6, 0.9, 'char') + '</span></h1>' +
    '<p class="lead"' + A(7, 'blur') + '>מה אמרו ראשי ' + D.lists + ' הרשימות בחודש שלפני הבחירות – הממצאים, בכשלוש דקות</p>' +
    '<div class="pill card"' + A(8.5, 'pop') + '>חלון הסקירה <b>' + D.window[0] + '–' + D.window[1] + '</b></div>', { tr: 'none' });

  scene('scope', 'היקף', 24, 's-scope',
    '<p class="eyebrow"' + A(0.3, 'skew') + '>היקף</p>' +
    '<h2>' + chars('מה נאסף', 0.5, 0.35, 'char') + '</h2>' +
    '<p class="dotnote"' + A(2, 'fade') + ' data-out="' + B(10.5) + '">כל נקודה – הופעה אחת</p>' +
    '<div class="hemi-n"' + A(2.5, 'zoom') + ' data-out="' + B(10.5) + '"><b data-count="' + D.total + '" data-cin="' + B(2.5) + '" data-cd="' + B(3) + '" data-hit="hit">0</b><span>הופעות שאותרו</span></div>' +
    '<div class="kchip card" style="right:140px"' + A(6, 'pop') + ' data-out="' + B(10.5) + '" data-hitin="blip"><b>' + D.lists + '</b><span>ראשי רשימות – לכל אחד לפחות הופעה אחת</span></div>' +
    '<div class="kchip card" style="left:140px"' + A(7, 'pop') + ' data-out="' + B(10.5) + '" data-hitin="blip"><b>חודש אחד</b><span>' + D.window[0] + '–' + D.window[1] + '</span></div>' +
    '<div class="dots" data-dots="types"></div>');

  scene('method', 'שיטה', 24, 's-method',
    '<p class="eyebrow"' + A(0.3, 'skew') + '>שיטה</p>' +
    '<h2>' + chars('רק מה שנבדק מול המקור', 0.5, 0.6, 'char') + '</h2>' +
    '<div class="mgrid"><ul class="mlist">' +
    '<li class="card"' + A(3, 'wipe', 1.2) + ' data-hitin="blip">' + IC.check + '<span>פודקאסטים וראיונות אודיו/וידאו ארוכים של ראשי הרשימות – בעברית, באנגלית ובערבית</span></li>' +
    '<li class="card"' + A(5, 'wipe', 1.2) + ' data-hitin="blip">' + IC.quote + '<span>ציטוט – רק אם נבדק מול תמלול או מול דף המקור, כדברי ראש הרשימה עצמו ולא ככותרת</span></li>' +
    '<li class="card"' + A(7, 'wipe', 1.2) + ' data-hitin="blip">' + IC.link + '<span>כל השאר באתר – פרפרזה, ומסומן כך. לכל הופעה ולכל ציטוט – קישור למקור</span></li>' +
    '<li class="card"' + A(9, 'wipe', 1.2) + ' data-hitin="blip">' + IC.ban + '<span>לא נכללו פודקאסטים בהפקת המפלגות עצמן</span></li></ul>' +
    '<div class="big39 card"' + A(1.5, 'flip', 1.5) + ' data-spin="1"><b data-count="' + D.quotes + '" data-cin="' + B(2) + '" data-cd="' + B(4) + '" data-hit="hit">0</b><span>ציטוטים מאומתים</span><small>בכל ההופעות יחד. מספר ההופעות משקף את מה שאותר בחיפוש, ואינו מדד לחשיבות או דירוג.</small></div></div>', { tr: 'slide' });

  scene('stage', 'ממצאים', 20, 's-stage',
    '<p class="eyebrow"' + A(0.3, 'skew') + '>ממצא · בחירת במה</p>' +
    '<h2>' + chars('לאיזה קהל פנו ההופעות', 0.5, 0.6, 'char') + '</h2>' +
    '<p class="lead"' + A(2, 'blur') + '>לפי סיווג הקהל שמוצג באתר בכל הופעה · ' + D.total + ' הופעות, לכל הרשימות יחד</p>' +
    '<div class="dots" data-dots="aud"></div>' +
    '<p class="foot"' + A(12, 'fade') + '>הסיווג הוא של העורך, ומוצהר כך באתר. הספירה אינה מפורטת כאן לפי רשימה.</p>', { tr: 'wipe' });

  var ft = D.findTopics, mFrame = ft.match(/בעיקר במסגור קואליציוני \(([^)]*)\)/);
  var chipsT = ft.split('נושאים חוזרים נוספים:')[1].replace(/\.\s*$/, '').trim().split(/,\s*/);
  var styleF = D.findStyle.replace(/^סגנון:\s*/, '');
  scene('topics', 'ממצאים', 24, 's-topics',
    '<p class="eyebrow"' + A(0.3, 'skew') + '>ממצא · נושאים</p>' +
    '<p class="bigq">' + words('גיוס חרדים עלה אצל רוב ראשי הרשימות', 0.5, 1.4, 'slam') + '</p>' +
    '<p class="lead"' + A(4, 'blur') + '>בעיקר במסגור קואליציוני: ' + esc(mFrame ? mFrame[1] : '') + '</p>' +
    '<p class="sub2"' + A(6, 'skew') + '>נושאים חוזרים נוספים</p>' +
    '<div class="chips">' + chipsT.map(function (c, i) { return '<span class="chip" data-pulse="1"' + A(7 + i, 'pop', 1) + ' data-hitin="blip">' + esc(c) + '</span>'; }).join('') + '</div>' +
    '<p class="foot"' + A(11, 'fade') + '>ועוד: ' + esc(styleF) + '</p>', { tr: 'slide', build: [16, 24] });

  scene('bars', 'ממצאים', 20, 's-bars',
    '<p class="eyebrow"' + A(0.3, 'skew') + '>נתונים · 10 הסוגיות של האתר</p>' +
    '<h2 style="font-size:66px">' + chars('בכמה מ-' + D.lists + ' הרשימות עלתה כל סוגיה', 0.4, 0.7, 'char') + '</h2>' +
    '<div class="bars">' + D.topics.map(function (t, i) {
      var b0 = 2 + i * 0.5;
      return '<div class="brow"' + A(b0, 'skew', 1) + '><span class="lab">' + esc(t[0]) + '</span><span class="trk"><i class="fil" data-w="' + (t[1] / 13).toFixed(4) + '" data-win="' + B(b0 + .25) + '"></i></span><span class="val"><b data-count="' + t[1] + '" data-cin="' + B(b0 + .25) + '" data-cd="' + B(2) + '" data-hit="blip" data-n="' + (69 + [0, 2, 3, 5, 7, 8, 10, 12, 14, 15][i]) + '">0</b> מתוך 13</span></div>';
    }).join('') + '</div>' +
    '<p class="foot"' + A(9, 'fade') + '>סוגיה נספרת לרשימה אם תויגה לפחות באחת מהופעות ראש הרשימה. הופעה יכולה לעסוק בכמה סוגיות. התיוג לפי 10 הסוגיות של האתר בלבד.</p>', { tr: 'drop' });

  scene('index', '13 הרשימות', 16, 's-index',
    '<p class="eyebrow"' + A(0.3, 'skew') + '>13 הרשימות</p>' +
    '<h2>' + chars('לפי סדר האלף-בית', 0.5, 0.5, 'char') + '</h2>' +
    '<p class="lead" style="font-size:38px"' + A(1.5, 'blur') + '>ציטוט מאומת אחד מכל ראש רשימה · אותו מבנה ואותו זמן מסך לכל רשימה · הסדר אינו דירוג</p>' +
    '<div class="lgrid">' + ENTRIES.map(function (e, i) { return '<div class="lchip card"' + A(3 + i * 0.5, 'flip', 1) + '><b>' + esc(e.name) + '</b><span>' + esc(e.leader) + '</span></div>'; }).join('') + '</div>', { tr: 'zoom' });

  ENTRIES.forEach(function (e, i) {
    var qlang = e.lang === 'he' ? '' : ' lang="' + e.lang + '" dir="' + (e.lang === 'en' ? 'ltr' : 'rtl') + '"';
    scene('list-' + e.id, '13 הרשימות', LIST_BEATS, 's-list',
      '<div class="prog"' + A(0, 'fade', .5) + '><span>לפי סדר האלף-בית · ' + (i + 1) + ' מתוך ' + ENTRIES.length + '</span><span class="ticks13">' + ENTRIES.map(function (_, k) { return '<i class="' + (k < i ? 'done' : k === i ? 'cur' : '') + '">' + (k === i ? '<b></b>' : '') + '</i>'; }).join('') + '</span></div>' +
      '<i class="bigL" aria-hidden="true" data-l="' + esc(e.name.charAt(0)) + '"' + A(0.15, 'blur', 1.5) + '></i>' +
      '<div class="lname' + (e.name.length > 22 ? ' longn' : '') + '">' + chars(e.name, 0.25, 0.55, 'char') + '</div>' +
      '<div class="lleader"' + A(1, 'skew') + '><span class="eq" data-eq="1"><i></i><i></i><i></i><i></i><i></i></span>' + esc(e.leader) + '</div>' +
      '<figure class="qcard card"' + A(1, 'wipe', 1) + '><span class="qmark" aria-hidden="true">”</span><blockquote class="qtext' + (e.quote.length > 60 ? ' long' : '') + '"' + qlang + ' style="margin:0">' +
      words((e.lang === 'he' ? '„' : '“') + e.quote + '”', 1.6 * SPB, 1.6, 'word') + '</blockquote>' +
      '<figcaption><div class="qattr"' + A(6, 'fade', 1) + '><span class="dash">—</span> ' + esc(e.leader) + ' · ' + esc(e.show) + (e.outlet && e.show.indexOf(e.outlet) < 0 ? ' (' + esc(e.outlet) + ')' : '') + ' · ' + esc(e.date) + '</div>' +
      '<div class="qmeta"' + A(6.5, 'fade', 1) + '><span>' + esc(e.type) + '</span><span class="ok">' + IC.ok + esc(e.method) + (e.ts ? ' · בזמן <span class="ltr">' + esc(e.ts) + '</span>' : '') + '</span>' +
      '<a href="' + esc(e.src) + '" target="_blank" rel="noopener noreferrer" tabindex="-1">למקור הציטוט ↗</a></div></figcaption></figure>', { tr: 'list', entry: e });
  });

  scene('gaps', 'מגבלות', 20, 's-gaps',
    '<p class="eyebrow" style="color:var(--am);text-shadow:0 0 16px rgba(255,190,59,.6)"' + A(0.3, 'skew') + '>פערים ומגבלות</p>' +
    '<h2>' + chars('מה לא נכלל, ומה חשוב לדעת', 0.5, 0.7, 'char') + '</h2>' +
    '<ul class="glist">' + [
      'לא נכללו פודקאסטים בהפקת המפלגות, נאומים ועימותים',
      'ראיונות רדיו לא נאספו באופן שיטתי – ייתכן שחסרים ראיונות',
      'הופעות בלי כתוביות או תמלול – פרטים ותקציר בלבד, ללא ציטוט',
      'הסיקור בערבית חלקי',
      'תוויות הקהל הן סיווג של העורך; מספר ההופעות אינו מדד לחשיבות'
    ].map(function (g, i) { return '<li class="card"' + A(3 + i * 2, 'wipe', 1.2) + '><i></i>' + esc(g) + '</li>'; }).join('') + '</ul>', { tr: 'fade' });

  scene('close', 'סיום', 16, 's-close',
    '<div class="rings" data-ring="1" style="left:960px;top:300px;opacity:.5"><i></i><i></i><i></i></div>' +
    '<p class="eyebrow"' + A(0.5, 'skew') + '>לכל הפרטים</p>' +
    '<h2 class="glow">' + chars('כל ' + D.total + ' ההופעות, הקישורים והציטוטים המלאים – באתר', 1, 1.1, 'char') + '</h2>' +
    '<a class="url card" href="' + SITE + '" target="_top" rel="noopener" tabindex="-1"' + A(4, 'pop', 1) + ' data-hitin="hit">' + IC.link + '<span class="ltr">dudidd-wq.github.io/elections-2026/#/podcasts</span></a>' +
    '<p class="neutral"' + A(6, 'blur') + '><b>אתר מידע ניטרלי.</b> אין בו המלצה להצבעה · הנתונים עודכנו ב-' + D.updated + '</p>', { tr: 'zoom', last: true });

  // neutrality guard: every list scene has the same duration and transition
  SC.filter(function (s) { return s.id.indexOf('list-') === 0; }).forEach(function (s) { if (s.beats !== LIST_BEATS || s.tr !== 'list') throw new Error('unequal list treatment'); });

  // ---------- build DOM
  var b0 = 0;
  SC.forEach(function (s) {
    s.b0 = b0; s.start = b0 * SPB; b0 += s.beats;
    var el = document.createElement('section'); el.className = 'scene ' + s.cls; el.setAttribute('aria-hidden', 'true');
    el.innerHTML = '<div class="inner">' + s.html + '</div>'; host.appendChild(el); s.el = el; s.inner = el.firstChild;
    s.anims = [].map.call(el.querySelectorAll('[data-in]'), function (n) {
      n.classList.add('a'); var t = n.getAttribute('data-a') || 'up';
      if (CALM && t !== 'word' && t !== 'char') t = 'fade';
      return { el: n, t0: +n.getAttribute('data-in'), d: +(n.getAttribute('data-d') || .7), out: n.hasAttribute('data-out') ? +n.getAttribute('data-out') : null, type: t, last: -1, seed: Math.random() };
    });
    s.counts = [].map.call(el.querySelectorAll('[data-count]'), function (n) { return { el: n, v: +n.getAttribute('data-count'), t0: +n.getAttribute('data-cin'), d: +n.getAttribute('data-cd'), last: -1, lb: -1 }; });
    s.fills = [].map.call(el.querySelectorAll('[data-w]'), function (n) { return { el: n, w: +n.getAttribute('data-w'), t0: +n.getAttribute('data-win'), last: -1 }; });
    s.heads = [].slice.call(el.querySelectorAll('h1,h2,.lname,.bigq'));
    s.eq = [].slice.call(el.querySelectorAll('[data-eq] i'));
    s.rings = el.querySelector('[data-ring]'); s.spin = el.querySelector('[data-spin]');
    s.pulse = [].slice.call(el.querySelectorAll('[data-pulse]'));
    var dh = el.querySelector('[data-dots]'); if (dh) s.dots = buildDots(dh, dh.getAttribute('data-dots'));
  });
  var BEATS = b0, DUR = BEATS * SPB;
  // music guard: the drop, the list section, every list, the breakdown and the outro start on a bar downbeat
  SC.forEach(function (s) { if ((s.id.indexOf('list-') === 0 || ['bars', 'index', 'gaps', 'close'].indexOf(s.id) >= 0) && s.b0 % 4) throw new Error('scene ' + s.id + ' not on a bar'); });
  if (BEATS % 4) throw new Error('clip length not whole bars');

  // ---------- score (same data drives the live music, the offline WAV and the visual beat pulses)
  function sec(id) { return SC.filter(function (s) { return s.id === id; })[0]; }
  var L0 = SC.filter(function (s) { return s.id.indexOf('list-') === 0; });
  var sections = [
    { b0: 0, b1: 4, mode: 'intro' }, { b0: 4, b1: sec('scope').b0, mode: 'g1' },
    { b0: sec('scope').b0, b1: sec('method').b0, mode: 'g2' }, { b0: sec('method').b0, b1: sec('topics').b0, mode: 'g2arp' },
    { b0: sec('topics').b0, b1: sec('topics').b0 + 16, mode: 'g2' }, { b0: sec('topics').b0 + 16, b1: sec('bars').b0, mode: 'build' },
    { b0: sec('bars').b0, b1: sec('index').b0, mode: 'drop' }, { b0: sec('index').b0, b1: L0[0].b0, mode: 'g2arp' },
    { b0: L0[0].b0, b1: sec('gaps').b0, mode: 'lists' }, { b0: sec('gaps').b0, b1: sec('close').b0, mode: 'breakdown' },
    { b0: sec('close').b0, b1: BEATS - 2, mode: 'outro' }, { b0: BEATS - 2, b1: BEATS, mode: 'tail' }];
  var ENERGY = { intro: .45, g1: .62, g2: .74, g2arp: .8, build: .9, drop: 1, lists: .84, breakdown: .38, outro: .72, tail: .4 };
  var cuts = [{ b: 4, kind: 'scene' }];
  SC.forEach(function (s, i) { if (i) cuts.push({ b: s.b0, kind: s.tr === 'list' || (SC[i + 1] && SC[i + 1].tr === 'list' && s.id === 'index' && false) ? 'list' : (s.tr === 'drop' ? 'drop' : 'scene') }); });
  var hits = [];
  SC.forEach(function (s) {
    s.counts.forEach(function (c) { var k = c.el.getAttribute('data-hit'); if (k) hits.push({ t: s.start + c.t0 + c.d, kind: k, n: +c.el.getAttribute('data-n') || undefined, v: k === 'blip' ? .8 : 1 }); });
    [].forEach.call(s.el.querySelectorAll('[data-hitin]'), function (n) { hits.push({ t: s.start + +n.getAttribute('data-in'), kind: n.getAttribute('data-hitin'), v: .7 }); });
  });
  var EVENTS = AU.score({ beats: BEATS, sections: sections, cuts: cuts, hits: hits });
  var KICKS = EVENTS.filter(function (e) { return e.k === 'kick'; }).map(function (e) { return e.t; });
  var IMPACTS = EVENTS.filter(function (e) { return e.k === 'impact'; }).map(function (e) { return [e.t, e.p.v]; });
  var SNARES = EVENTS.filter(function (e) { return e.k === 'clap'; }).map(function (e) { return e.t; });
  function lastBefore(arr, T, get) { var lo = 0, hi = arr.length; while (lo < hi) { var m = (lo + hi) >> 1; if ((get ? get(arr[m]) : arr[m]) <= T) lo = m + 1; else hi = m; } return lo - 1; }
  function kickEnv(T) { var i = lastBefore(KICKS, T); return i < 0 ? 0 : Math.exp(-(T - KICKS[i]) * 9); }
  function snareEnv(T) { var i = lastBefore(SNARES, T); return i < 0 ? 0 : Math.exp(-(T - SNARES[i]) * 12); }
  function impactEnv(T) { var i = lastBefore(IMPACTS, T, function (x) { return x[0]; }); return i < 0 ? [0, 0] : [Math.exp(-(T - IMPACTS[i][0]) * 6), IMPACTS[i][1]]; }
  function modeAt(T) { var b = T / SPB; for (var i = 0; i < sections.length; i++) if (b < sections[i].b1) return sections[i]; return sections[sections.length - 1]; }
  function energy(T) { var s = modeAt(T), e = ENERGY[s.mode]; if (s.mode === 'build') e = .8 + .2 * clamp((T / SPB - s.b0) / (s.b1 - s.b0)); return e; }
  // warp = integral of particle speed (deterministic, so a seek lands on the same frame)
  var WARP = [0]; (function () { for (var t = .1; t <= DUR + .2; t += .1) { var s = modeAt(t).mode; var v = s === 'drop' ? 3.2 : s === 'build' ? 1.5 + 3 * clamp((t / SPB - modeAt(t).b0) / 8) : s === 'intro' ? 2.4 : s === 'breakdown' || s === 'tail' ? .5 : 1; WARP.push(WARP[WARP.length - 1] + v * .1); } })();
  function warp(T) { var i = Math.min(WARP.length - 2, Math.max(0, Math.floor(T / .1))); return WARP[i] + (WARP[i + 1] - WARP[i]) * (T / .1 - i); }

  window.CLIP = { duration: DUR, bpm: AU.BPM, scenes: SC.map(function (s) { return { id: s.id, start: s.start, dur: s.dur }; }), events: EVENTS };

  // ---------- dots: hemicycle -> clusters (one dot = one appearance; no list identity, all dots identical)
  function hemicycle(n, cx, cy, r0, r1, rows) {
    var radii = [], sum = 0; for (var k = 0; k < rows; k++) { var r = r0 + (r1 - r0) * k / (rows - 1); radii.push(r); sum += r; }
    var per = radii.map(function (r) { return Math.round(n * r / sum); }); var d = n - per.reduce(function (a, b) { return a + b; }, 0); per[rows - 1] += d;
    var seats = []; radii.forEach(function (r, k) { for (var j = 0; j < per[k]; j++) { var a = per[k] === 1 ? Math.PI / 2 : Math.PI * j / (per[k] - 1); seats.push({ a: a, x: cx + r * Math.cos(a), y: cy - r * Math.sin(a) }); } });
    seats.sort(function (p, q) { return p.a - q.a; }); return seats;
  }
  function layoutClusters(groups, cy, width) {
    var DS = 44, pos = [], labels = [], widths = groups.map(function (g) { return g.cols * DS; });
    var gap = (width - widths.reduce(function (a, b) { return a + b; }, 0)) / (groups.length + 1), x = 960 + width / 2 - gap, idx = 0;
    groups.forEach(function (g, gi) { var right = x, rows = Math.ceil(g.n / g.cols); for (var k = 0; k < g.n; k++) { var c = k % g.cols, r = Math.floor(k / g.cols); pos[idx++] = { x: right - DS / 2 - c * DS, y: cy - rows * DS / 2 + DS / 2 + r * DS }; } labels.push({ x: right - widths[gi] / 2, y: cy + rows * DS / 2 + 24, g: g }); x = right - widths[gi] - gap; });
    return { pos: pos, labels: labels };
  }
  function buildDots(h, kind) {
    var N = D.total, groups, cy;
    if (kind === 'types') { groups = [{ n: D.types[0], cols: 9, lab: 'פודקאסטים', sub: 'אודיו או וידאו' }, { n: D.types[1], cols: 4, lab: 'ראיונות טלוויזיה', sub: 'או וידאו ארוכים' }, { n: D.types[2], cols: 4, lab: 'ראיונות רדיו', sub: '' }]; cy = 680; }
    else { groups = [{ n: D.audience[0], cols: 5, lab: 'במות מיינסטרים' }, { n: D.audience[1], cols: 5, lab: 'קהל קרוב למחנה הדובר' }, { n: D.audience[2], cols: 3, lab: 'קהל קרוב למחנה אחר' }, { n: D.audience[3], cols: 5, lab: 'קהל כללי או ייעודי', sub: 'כלכלה, לייף-סטייל, דוברי אנגלית ועוד' }]; cy = 640; }
    var L = layoutClusters(groups, cy, 1640), H = hemicycle(N, 960, kind === 'types' ? 885 : 860, kind === 'types' ? 215 : 190, kind === 'types' ? 365 : 370, 4);
    var S = []; for (var i = 0; i < N; i++) { var a = i * 2.39996, r = 700 + (i * 37) % 500; S.push({ x: 960 + Math.cos(a) * r * 1.4, y: 540 + Math.sin(a) * r * .8 }); }
    var dots = []; for (i = 0; i < N; i++) { var d = document.createElement('i'); d.className = 'dot'; h.appendChild(d); dots.push(d); }
    var labs = L.labels.map(function (l, gi) {
      var e = document.createElement('div'); e.className = 'clab';
      e.innerHTML = '<b>0</b><span>' + esc(l.g.lab) + '</span>' + (l.g.sub ? '<small>' + esc(l.g.sub) + '</small>' : '');
      e.style.right = (1920 - l.x) + 'px'; e.style.top = l.y + 'px'; h.appendChild(e); return { el: e, b: e.firstChild, n: l.g.n, gi: gi };
    });
    var tm = kind === 'types' ? { in: 2 * SPB, hemi: 2 * SPB, move: 11 * SPB, lab: 13 * SPB } : { in: 1.5 * SPB, hemi: 1.5 * SPB, move: 5 * SPB, lab: 7 * SPB };
    return { dots: dots, S: S, H: H, E: L.pos, labs: labs, tm: tm, kind: kind };
  }
  function renderDots(o, lt, T) {
    var tm = o.tm, ke = kickEnv(T);
    for (var i = 0; i < o.dots.length; i++) {
      var f = ex(clamp((lt - tm.hemi - i * .03) / .7));            // fly in to the hemicycle
      var m = eio(clamp((lt - tm.move - (i % 12) * .025) / .9));    // regroup into clusters
      var x = o.S[i].x + (o.H[i].x - o.S[i].x) * f, y = o.S[i].y + (o.H[i].y - o.S[i].y) * f;
      x += (o.E[i].x - x) * m; y += (o.E[i].y - y) * m;
      var sc = (0.35 + .65 * f) * (1 + .18 * ke * (CALM ? 0 : 1));
      var st = o.dots[i].style; st.opacity = clamp(f * 1.4).toFixed(3); st.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px) scale(' + sc.toFixed(3) + ')';
    }
    o.labs.forEach(function (l) {
      var p = clamp((lt - tm.lab - l.gi * .25) / .6), e = eb(p);
      l.el.style.opacity = clamp(p * 2).toFixed(3); l.el.style.transform = 'translateY(' + ((1 - e) * 40).toFixed(1) + 'px) scale(' + (.7 + .3 * e).toFixed(3) + ')';
      var cp = clamp((lt - tm.lab - l.gi * .25) / 1.0); l.b.textContent = Math.round(l.n * eo(cp));
      l.b.style.filter = cp > 0 && cp < 1 ? 'blur(' + (3 * (1 - cp)).toFixed(1) + 'px)' : '';
    });
  }
  // label reveal blips for the dot clusters
  SC.forEach(function (s) { if (s.dots) s.dots.labs.forEach(function (l) { hits.push({ t: s.start + s.dots.tm.lab + l.gi * .25 + 1.0, kind: 'blip', v: .8, n: 76 + l.gi * 3 }); }); });
  EVENTS = AU.score({ beats: BEATS, sections: sections, cuts: cuts, hits: hits }); window.CLIP.events = EVENTS;

  // ---------- background canvases
  var au = document.getElementById('aurora').getContext('2d'), pc = document.getElementById('parts'), pcx = pc.getContext('2d'), wv = document.getElementById('wave').getContext('2d');
  var PAL = [[34, 227, 255], [139, 92, 255], [255, 61, 200], [255, 190, 59], [40, 70, 255]];
  function drawAurora(T, en, ke) {
    au.globalCompositeOperation = 'source-over'; au.fillStyle = '#04050d'; au.fillRect(0, 0, 192, 108);
    au.globalCompositeOperation = 'lighter';
    var sp = CALM ? .25 : 1;
    for (var i = 0; i < 5; i++) {
      var c = PAL[i], x = 96 + Math.sin(T * .11 * sp + i * 1.7) * 70 + Math.cos(T * .07 * sp + i) * 20, y = 54 + Math.cos(T * .09 * sp + i * 2.3) * 40;
      var r = 55 + 18 * Math.sin(T * .13 * sp + i), a = (.16 + .26 * en + (CALM ? 0 : .16 * ke)) * (i === 3 ? .55 : 1);
      var g = au.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, 'rgba(' + c + ',' + a.toFixed(3) + ')'); g.addColorStop(1, 'rgba(' + c + ',0)');
      au.fillStyle = g; au.fillRect(0, 0, 192, 108);
    }
  }
  var SPR = PAL.slice(0, 4).map(function (c) { var cv = document.createElement('canvas'); cv.width = cv.height = 32; var x = cv.getContext('2d'); var g = x.createRadialGradient(16, 16, 0, 16, 16, 16); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.25, 'rgba(' + c + ',.9)'); g.addColorStop(1, 'rgba(' + c + ',0)'); x.fillStyle = g; x.fillRect(0, 0, 32, 32); return cv; });
  var NP = CALM ? 50 : 150, PRT = []; (function () { var s = 12345; function r() { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; } for (var i = 0; i < NP; i++) PRT.push({ x: r() * 960, y: r() * 540, z: .3 + r() * .7, vx: (r() - .5) * 18, vy: -6 - r() * 22, s: r() * 4, c: i % 4 }); })();
  function drawParts(T, en, ke) {
    pcx.clearRect(0, 0, 960, 540); pcx.globalCompositeOperation = 'lighter';
    var w = warp(T) * (CALM ? .3 : 1), mode = modeAt(T).mode, streak = !CALM && (mode === 'drop' || mode === 'build' || mode === 'intro');
    for (var i = 0; i < NP; i++) {
      var p = PRT[i], x = ((p.x + p.vx * w * p.z) % 960 + 960) % 960, y = ((p.y + p.vy * w * p.z * 1.6) % 540 + 540) % 540;
      var size = (3 + p.z * 7) * (1 + .5 * ke), a = (.25 + .55 * p.z) * (.5 + .5 * en) * (.6 + .4 * Math.sin(T * 2 + p.s * 3));
      pcx.globalAlpha = clamp(a);
      if (streak) { var len = 18 * p.z * (mode === 'drop' ? 1.6 : 1); for (var k = 0; k < 3; k++) pcx.drawImage(SPR[p.c], x - size / 2 - p.vx * .04 * len * k / 3, y - size / 2 - p.vy * .04 * len * k / 3, size, size); }
      else pcx.drawImage(SPR[p.c], x - size / 2, y - size / 2, size, size);
    }
    pcx.globalAlpha = 1;
  }
  var WG = wv.createLinearGradient(0, 0, 1920, 0); WG.addColorStop(0, '#ff3dc8'); WG.addColorStop(.5, '#8b5cff'); WG.addColorStop(1, '#22e3ff');
  var FREQ = null;
  function drawWave(T, en, ke, se) {
    wv.clearRect(0, 0, 1920, 240); wv.fillStyle = WG;
    var N = 80, bw = 1920 / N, live = FREQ && music.live();
    if (live) music.analyser().getByteFrequencyData(FREQ);
    for (var i = 0; i < N; i++) {
      var u = i / (N - 1), c = Math.abs(u - .5) * 2, env = 1 - c * c * .7, h;
      if (live) { var bin = Math.floor(2 + Math.pow(c, 1.4) * 70); h = (FREQ[bin] / 255) * 200 * env + 3; }
      else h = (en * (.18 + .55 * ke * (1 - c * .6) + .25 * se * c + .12 * Math.abs(Math.sin(i * 1.9 + T * 7.3) * Math.sin(i * .53 - T * 3.1)))) * 200 * env + 3;
      wv.globalAlpha = .25 + .4 * env;
      var x = i * bw + bw * .22, ww = bw * .56;
      wv.beginPath(); if (wv.roundRect) wv.roundRect(x, 236 - h, ww, h, ww / 2); else wv.rect(x, 236 - h, ww, h); wv.fill();
    }
    wv.globalAlpha = 1;
  }

  // ---------- render
  var chapEl = document.getElementById('chap'), tl = document.getElementById('tline'), live = document.getElementById('live'), flash = document.getElementById('flash'), leak = document.getElementById('leak'), grid = document.getElementById('grid'), liveDot = document.getElementById('liveDot');
  var curScene = null, curChap = null;
  function sceneAt(T) { for (var i = 0; i < SC.length; i++) if (T < SC[i].start + SC[i].dur) return SC[i]; return SC[SC.length - 1]; }
  function layoutGradChars(s) { [].forEach.call(s.el.querySelectorAll('.gtxt'), function (g) { g.style.position = 'relative'; var W = g.offsetWidth; [].forEach.call(g.querySelectorAll('.ch'), function (c) { c.style.backgroundSize = W + 'px 100%'; c.style.backgroundPosition = (-c.offsetLeft) + 'px 0'; }); }); }
  function applyAnim(n, p, lt) {
    var out = n.out != null ? clamp((lt - n.out) / .35) : 0;
    var key = p * 1000 + out; if (Math.abs(key - n.last) < .5 && p >= 1 && out === 0) return; n.last = key;
    var s = n.el.style, e, op = 1, tf = '', fl = '';
    switch (n.type) {
      case 'char': e = ex(p); op = clamp(p * 2.2); tf = 'translateY(' + ((1 - e) * .55).toFixed(3) + 'em) scale(' + (1.35 - .35 * e).toFixed(3) + ') skewX(' + ((1 - e) * -14).toFixed(2) + 'deg)'; if (p < 1) fl = 'blur(' + ((1 - e) * 10).toFixed(1) + 'px)'; break;
      case 'word': e = ex(p); op = clamp(p * 2); tf = 'translateY(' + ((1 - e) * .35).toFixed(3) + 'em)'; if (p < 1 && !CALM) fl = 'blur(' + ((1 - e) * 8).toFixed(1) + 'px)'; break;
      case 'slam': e = eb(p); op = clamp(p * 3); tf = 'scale(' + (2.2 - 1.2 * Math.min(1, ex(p))).toFixed(3) + ') translateY(' + ((1 - e) * 20).toFixed(1) + 'px)'; if (p < 1) fl = 'blur(' + ((1 - ex(p)) * 12).toFixed(1) + 'px)'; break;
      case 'blur': e = ex(p); op = e; tf = 'scale(' + (1.08 - .08 * e).toFixed(4) + ')'; if (p < 1) fl = 'blur(' + ((1 - e) * 14).toFixed(1) + 'px)'; break;
      case 'skew': e = ex(p); op = clamp(p * 2); tf = 'translateX(' + ((1 - e) * 140).toFixed(1) + 'px) skewX(' + ((1 - e) * -22).toFixed(2) + 'deg)'; break;
      case 'pop': e = eb(p); op = clamp(p * 3); tf = 'scale(' + (.55 + .45 * e).toFixed(4) + ')'; break;
      case 'zoom': e = ex(p); op = clamp(p * 2); tf = 'scale(' + (2.4 - 1.4 * e).toFixed(4) + ')'; if (p < 1) fl = 'blur(' + ((1 - e) * 16).toFixed(1) + 'px)'; break;
      case 'flip': e = eb(p); op = clamp(p * 2.5); tf = 'perspective(900px) rotateY(' + ((1 - ex(p)) * -80).toFixed(2) + 'deg) scale(' + (.8 + .2 * e).toFixed(3) + ')'; break;
      case 'wipe': e = ex(p); op = 1; s.clipPath = p >= 1 ? '' : 'inset(0 0 0 ' + ((1 - e) * 100).toFixed(2) + '% round 24px)'; tf = 'translateX(' + ((1 - e) * 40).toFixed(1) + 'px)'; if (p <= 0) op = 0; break;
      case 'flicker': op = p >= 1 ? 1 : ((Math.floor(p * 14) % 3 === 1) ? .15 : clamp(p * 1.6)); break;
      default: e = eo(p); op = e; tf = 'translateY(' + ((1 - e) * 30).toFixed(1) + 'px)';
    }
    if (out) { op *= 1 - out; tf += ' scale(' + (1 - .1 * out).toFixed(3) + ')'; }
    s.opacity = op.toFixed(3); s.transform = tf; s.filter = fl;
  }
  function transition(s, lt) { // scene-level enter/exit transform & opacity
    var st = s.el.style, enter = clamp(lt / .42), exit = s.x.last ? 0 : clamp((lt - (s.dur - .3)) / .3), tf = '', op = 1;
    if (CALM) { op = Math.min(clamp(lt / .5), s.x.last ? 1 : clamp((s.dur - lt) / .5)); st.opacity = op.toFixed(3); st.transform = ''; st.clipPath = ''; return; }
    var e = ex(enter);
    switch (s.tr) {
      case 'zoom': case 'drop': tf = 'scale(' + (1.25 - .25 * e).toFixed(4) + ')'; op = clamp(enter * 2.5); break;
      case 'slide': tf = 'translateX(' + ((1 - e) * -260).toFixed(1) + 'px) skewX(' + ((1 - e) * 10).toFixed(2) + 'deg)'; op = clamp(enter * 2.5); break;
      case 'list': tf = 'translateX(' + ((1 - e) * -200).toFixed(1) + 'px) scale(' + (1.06 - .06 * e).toFixed(4) + ')'; op = clamp(enter * 2.5); break;
      case 'wipe': st.clipPath = enter >= 1 ? '' : 'circle(' + (e * 120).toFixed(2) + '% at 50% 50%)'; break;
      case 'fade': op = clamp(lt / .6); break;
      default: break;
    }
    if (exit > 0) { var x = eio(exit); tf += ' scale(' + (1 + .12 * x).toFixed(4) + ')'; op *= 1 - x; }
    st.transform = tf; st.opacity = op.toFixed(3); if (s.tr !== 'wipe') st.clipPath = '';
  }
  function render(T) {
    var s = sceneAt(T), lt = T - s.start;
    if (s !== curScene) {
      if (curScene) { curScene.el.classList.remove('on'); curScene.el.setAttribute('aria-hidden', 'true'); }
      s.el.classList.add('on'); s.el.removeAttribute('aria-hidden'); curScene = s;
      if (!s.laid) { layoutGradChars(s); s.laid = true; }
      s.anims.forEach(function (n) { n.last = -1; }); s.counts.forEach(function (c) { c.last = -1; }); s.fills.forEach(function (f) { f.last = -1; });
      if (!REC) { var txt = s.el.textContent.replace(/\s+/g, ' ').trim(); live.textContent = ''; setTimeout(function () { live.textContent = txt.slice(0, 400); }, 50); }
    }
    var en = energy(T), ke = kickEnv(T), se = snareEnv(T), im = impactEnv(T);
    transition(s, lt);
    s.anims.forEach(function (n) { applyAnim(n, clamp((lt - n.t0) / n.d), lt); });
    s.counts.forEach(function (c) {
      var p = clamp((lt - c.t0) / c.d), v = Math.round(c.v * eo(p)), post = clamp((lt - c.t0 - c.d) / .35);
      if (v !== c.last) { c.last = v; c.el.textContent = v; }
      var st = c.el.style;
      if (p > 0 && p < 1) { st.filter = CALM ? '' : 'blur(' + (2.5 + 5 * (1 - p) * (1 - p)).toFixed(1) + 'px)'; st.transform = 'scaleY(' + (1 + .12 * (1 - p)).toFixed(3) + ') translateY(' + (Math.sin(lt * 60) * 3 * (1 - p)).toFixed(1) + 'px)'; }
      else { st.filter = ''; st.transform = post > 0 && post < 1 && !CALM ? 'scale(' + (1 + .18 * Math.sin(Math.PI * post)).toFixed(3) + ')' : ''; }
    });
    s.fills.forEach(function (f) { var p = ex(clamp((lt - f.t0) / .9)); if (Math.abs(p - f.last) > .001) { f.last = p; f.el.style.transform = 'scaleX(' + (f.w * p).toFixed(4) + ')'; } });
    if (s.dots) renderDots(s.dots, lt, T);
    // per-scene extras
    var inner = s.inner.style, itf = '';
    if (!CALM) {
      itf = 'rotateY(' + (Math.sin(T * .37) * 2.4).toFixed(2) + 'deg) rotateX(' + (Math.cos(T * .29) * 1.6).toFixed(2) + 'deg) scale(' + (1 + .006 * ke * en).toFixed(4) + ')';
      if (lt < .26 && s.tr !== 'none') { var fr = Math.floor(lt * 30); itf = 'translateX(' + (((fr * 37) % 7) - 3) * 6 + 'px) ' + itf; }
      if (s.x.build) { var bp = clamp((lt / SPB - s.x.build[0]) / (s.x.build[1] - s.x.build[0])); itf += ' scale(' + (1 + .05 * bp * bp).toFixed(4) + ') translate(' + (Math.sin(lt * 47) * 7 * bp * bp).toFixed(1) + 'px,' + (Math.cos(lt * 53) * 5 * bp * bp).toFixed(1) + 'px)'; }
    }
    inner.transform = itf;
    // glitch: RGB split on headings just after a cut and on impacts
    var gl = CALM ? 0 : Math.max(lt < .3 && s.tr !== 'none' ? 1 - lt / .3 : 0, im[0] > .5 && im[1] > .8 ? (im[0] - .5) * 2 : 0);
    s.heads.forEach(function (h) { if (gl > .02) { var dx = ((Math.floor(T * 30) * 13) % 9 - 4) * gl * 2.2; h.style.textShadow = dx.toFixed(1) + 'px 0 rgba(255,61,200,.85),' + (-dx).toFixed(1) + 'px 0 rgba(34,227,255,.85)'; } else if (h.style.textShadow) h.style.textShadow = ''; });
    s.pulse.forEach(function (c, i) { c.style.boxShadow = '0 0 ' + (20 + 40 * (s.x.build && lt / SPB > s.x.build[0] ? se : ke * .5)).toFixed(0) + 'px rgba(255,61,200,' + (.25 + .5 * se).toFixed(2) + ')'; });
    if (s.eq.length) s.eq.forEach(function (b, i) { b.style.transform = 'scaleY(' + (.2 + .8 * clamp(ke * (.6 + .4 * Math.abs(Math.sin(i * 2.1 + T * 9))) + .15 * Math.abs(Math.sin(T * 5 + i)))).toFixed(3) + ')'; });
    if (s.rings) { var rs = s.rings.children; for (var r = 0; r < 3; r++) { var ph = ((T * .5 + r / 3) % 1); rs[r].style.transform = 'scale(' + (.6 + ph * 2.2 + .15 * ke).toFixed(3) + ')'; rs[r].style.opacity = ((1 - ph) * (.5 + .5 * en)).toFixed(3); } if (s.id === 'title') s.rings.style.opacity = ex(clamp(lt / 1.6)).toFixed(3); var mic = s.rings.querySelector('.bigmic'); if (mic) mic.style.transform = 'scale(' + (1 + .08 * ke).toFixed(3) + ')'; }
    if (s.ext) s.ext(lt);
    if (s.spin) s.spin.style.setProperty('--ang', (T * 90 % 360).toFixed(1) + 'deg');
    if (s.x.entry) { if (!s.bigL) s.bigL = s.el.querySelector('.bigL'); s.bigL.style.setProperty('--k', CALM ? '0' : (ke * en).toFixed(3));
      if (!s.cur) s.cur = s.el.querySelector('.ticks13 .cur b'); s.cur.style.transform = 'scaleX(' + clamp(lt / s.dur).toFixed(4) + ')'; }
    if (s.chap !== curChap) { curChap = s.chap; chapEl.textContent = s.chap; }
    // global layers
    drawAurora(T, en, ke); drawParts(T, en, ke); drawWave(T, en, ke, se);
    grid.style.transform = 'perspective(700px) rotateX(62deg) translateY(' + ((warp(T) * 60) % 120).toFixed(1) + 'px)';
    grid.style.opacity = (.22 + .25 * en + .2 * ke).toFixed(3);
    var fl = CALM ? 0 : Math.pow(im[0], 1.6) * (im[1] > 1.1 ? .95 : im[1] < .6 ? .22 : .5);
    flash.style.opacity = fl.toFixed(3);
    var lp = CALM ? 1 : clamp((T - (s.start - .25)) / 1.3), leakOn = s.tr !== 'list' && s.tr !== 'none' && lp < 1;
    leak.style.opacity = leakOn ? (Math.sin(Math.PI * lp) * .8).toFixed(3) : '0';
    if (leakOn) leak.style.transform = 'translateX(' + (1700 - lp * 2600).toFixed(0) + 'px) scale(' + (1 + lp * .4).toFixed(3) + ')';
    liveDot.style.opacity = (.35 + .65 * ke).toFixed(3);
    tl.style.transform = 'scaleX(' + (T / DUR).toFixed(4) + ')';
    updateUI(T);
  }

  // ---------- scaling (letterbox)
  function fit() {
    var vw = window.innerWidth, vh = window.innerHeight, k = Math.min(vw / 1920, vh / 1080);
    stage.style.transform = 'translate(-50%,-50%) scale(' + k + ')';
    var rot = document.getElementById('rot'); if (rot) rot.style.top = (vh / 2 + 540 * k + 16) + 'px';
  }
  window.addEventListener('resize', fit); window.addEventListener('orientationchange', fit); fit();

  // ---------- clock (the audio clock is master while music plays, so beats stay locked)
  var T = Math.min(Math.max(0, parseFloat(Q.get('t')) || 0), DUR), playing = false, lastNow = 0, ema = 0, slow = 0, LITE = false; // LITE: adaptive fallback on slow machines (fewer particles, no scanlines/grid)
  function frame(now) {
    if (playing) {
      if (music.live()) T = Math.min(DUR, Math.max(T, music.timeNow()));
      else { var dt = lastNow ? Math.min(.1, (now - lastNow) / 1000) : 0; T += dt; }
      if (lastNow) { var fd = now - lastNow; if (fd > 0 && fd < 250) { ema = ema ? ema * .97 + fd * .03 : fd; if (ema > 26 && ++slow > 120 && !LITE) { LITE = true; NP = Math.round(NP / 2); document.body.classList.add('lite'); } } }
      lastNow = now;
      if (T >= DUR) { T = DUR; setPlaying(false); }
    }
    render(T); requestAnimationFrame(frame);
  }
  var bPlay = document.getElementById('bPlay'), icPlay = document.getElementById('icPlay');
  function setPlaying(v) {
    if (v && T >= DUR - .01) T = 0;
    playing = v; lastNow = 0;
    bPlay.setAttribute('aria-label', v ? 'השהיה' : (T >= DUR ? 'הפעלה מחדש' : 'הפעלה'));
    bPlay.title = (v ? 'השהיה' : 'הפעלה') + ' (רווח)';
    icPlay.setAttribute('d', v ? 'M7 5h4v14H7zM13 5h4v14h-4z' : (T >= DUR ? 'M12 5a7 7 0 1 1-6.6 4.7L3 9l1.5 5 4.7-2.2-2-1A5 5 0 1 0 12 7z' : 'M8 5v14l11-7z'));
    music.sync(); poke();
  }
  function seek(t) { T = Math.min(Math.max(0, t), DUR); lastNow = 0; music.sync(); }

  // ---------- music (live Web Audio, follows the timeline)
  var music = (function () {
    var eng = null, want = false, on = false;
    var b = document.getElementById('bMusic');
    function ensure() { if (!eng) { eng = AU.Live(EVENTS); if (eng) FREQ = new Uint8Array(eng.analyser.frequencyBinCount); } return eng; }
    function ui() { b.setAttribute('aria-pressed', want ? 'true' : 'false'); b.setAttribute('aria-label', 'מוזיקה (' + (want ? 'פועלת' : 'כבויה') + ')'); }
    function sync() {
      if (want && playing && T < DUR && ensure()) { eng.start(T); on = true; }
      else { if (eng) eng.stop(); on = false; }
    }
    function set(v) { want = v; ui(); sync(); }
    b.addEventListener('click', function () { set(!want); hideSound(); });
    return { set: set, sync: sync, toggle: function () { set(!want); hideSound(); }, live: function () { return on && !!eng && eng.ctx.state === 'running'; }, timeNow: function () { return eng.timeNow(); }, analyser: function () { return eng.analyser; }, wanted: function () { return want; } };
  })();

  // ---------- sound overlay ("הפעל עם סאונד"); the clip keeps running muted behind it
  var sound = document.getElementById('sound'), miniT = 0;
  function hideSound() { sound.hidden = true; clearTimeout(miniT); }
  function showSound() { if (REC) return; sound.hidden = false; sound.classList.remove('mini'); miniT = setTimeout(function () { sound.classList.add('mini'); }, 7000); }
  document.getElementById('sBtn').addEventListener('click', function () { var mini = sound.classList.contains('mini'); hideSound(); if (!mini || T < 2) T = 0; music.set(true); setPlaying(true); });
  document.getElementById('sSkip').addEventListener('click', function () { hideSound(); app.focus(); });

  // ---------- UI
  var scrub = document.getElementById('scrub'), fill = document.getElementById('fill'), knob = document.getElementById('knob'), timeEl = document.getElementById('time');
  scrub.setAttribute('aria-valuemax', Math.round(DUR));
  document.getElementById('ticks').innerHTML = SC.filter(function (s, i) { return i > 0 && s.chap !== SC[i - 1].chap; }).map(function (s) { return '<i style="left:' + (s.start / DUR * 100).toFixed(2) + '%"></i>'; }).join('');
  var lastSec = -1;
  function updateUI(T) {
    var p = T / DUR; fill.style.transform = 'scaleX(' + p.toFixed(4) + ')'; knob.style.left = (p * 100).toFixed(3) + '%';
    var sec = Math.round(T); if (sec !== lastSec) { lastSec = sec; timeEl.textContent = fmtT(T) + ' / ' + fmtT(DUR); scrub.setAttribute('aria-valuenow', sec); scrub.setAttribute('aria-valuetext', fmtT(T) + ' מתוך ' + fmtT(DUR)); }
  }
  bPlay.addEventListener('click', function () { setPlaying(!playing); });
  var dragging = false, wasPlaying = false;
  function posToT(ev) { var r = scrub.querySelector('.track').getBoundingClientRect(); return clamp((ev.clientX - r.left) / r.width) * DUR; }
  scrub.addEventListener('pointerdown', function (ev) { dragging = true; wasPlaying = playing; playing = false; music.sync(); scrub.setPointerCapture(ev.pointerId); seek(posToT(ev)); poke(); });
  scrub.addEventListener('pointermove', function (ev) { if (dragging) { T = posToT(ev); } });
  function endDrag() { if (!dragging) return; dragging = false; if (wasPlaying && T < DUR) setPlaying(true); else setPlaying(false); }
  scrub.addEventListener('pointerup', endDrag); scrub.addEventListener('pointercancel', endDrag);
  scrub.addEventListener('keydown', function (ev) {
    var k = ev.key, d = 0;
    if (k === 'ArrowLeft' || k === 'ArrowDown') d = -5; else if (k === 'ArrowRight' || k === 'ArrowUp') d = 5; else if (k === 'Home') { seek(0); ev.preventDefault(); } else if (k === 'End') { seek(DUR - .01); ev.preventDefault(); }
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
  var bFull = document.getElementById('bFull'), fsOK = !!(document.fullscreenEnabled || document.webkitFullscreenEnabled);
  if (!fsOK) bFull.hidden = true;
  function toggleFull() {
    if (!fsOK) return; var fe = document.fullscreenElement || document.webkitFullscreenElement;
    if (fe) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    else { var p = (app.requestFullscreen || app.webkitRequestFullscreen).call(app); if (p && p.catch) p.catch(function () {}); }
  }
  bFull.addEventListener('click', toggleFull);
  document.addEventListener('fullscreenchange', function () { bFull.setAttribute('aria-label', document.fullscreenElement ? 'יציאה ממסך מלא' : 'מסך מלא'); fit(); });
  var idleT = 0, ctl = document.getElementById('controls');
  function poke() { app.classList.remove('idle'); clearTimeout(idleT); if (playing) idleT = setTimeout(function () { if (playing && !dragging && !ctl.contains(document.activeElement) && !ctl.matches(':hover')) app.classList.add('idle'); }, 2600); }
  ['pointermove', 'pointerdown', 'keydown', 'touchstart'].forEach(function (e) { document.addEventListener(e, poke, { passive: true }); });
  ctl.addEventListener('focusin', function () { app.classList.remove('idle'); clearTimeout(idleT); });
  ctl.addEventListener('focusout', poke);
  document.getElementById('viewport').addEventListener('click', function (ev) { if (ev.target.closest('a')) return; setPlaying(!playing); });

  // ---------- start
  if (REC) app.classList.add('rec');
  var started = false;
  function go() {
    if (started) return; started = true;
    render(T); requestAnimationFrame(frame);
    // audio may only start after a user gesture: offer the overlay unless the browser says autoplay is allowed
    var allowed = navigator.getAutoplayPolicy ? navigator.getAutoplayPolicy('audiocontext') === 'allowed' : false;
    if (!REC && Q.get('sound') !== '0') { if (allowed) music.set(true); else showSound(); }
    setPlaying(Q.get('paused') !== '1');
    window.CLIP.startedAt = performance.now();
  }
  window.CLIP.seek = function (t) { seek(t); render(T); };
  window.CLIP.pause = function () { setPlaying(false); };
  window.CLIP.play = function () { setPlaying(true); };
  window.CLIP.time = function () { return T; };
  window.CLIP.music = function () { return { wanted: music.wanted(), live: music.live() }; };
  (document.fonts && document.fonts.ready ? Promise.race([document.fonts.ready, new Promise(function (r) { setTimeout(r, 1500); })]) : Promise.resolve()).then(go);
})();
