/* Clip A – "ראשי הרשימות בפודקאסטים ובראיונות ארוכים" (v4, fast cut). Content ONLY from clip-data.js (generated from
   data/podcasts.json by tools/build_clip.py, every quote asserted verbatim). 120 BPM: 1 beat = 0.5 s, 1 bar = 2 s.
   Scene lengths in bars; reveals 0.3-0.6 s; every scene gets about the minimum comfortable reading time (0.18 s/word + 0.8 s).
   Every list scene = 2.5 bars (5 s: 4+4+2 beats, the 2-beat measure is the same drum fill each time), same structure,
   same music bed. Lists in Hebrew alphabetical order. */
(function () {
  'use strict';
  var K = window.ClipKit, D = window.CLIP_DATA, A = K.A, B = K.B, esc = K.esc, IC = K.IC, words = K.words, count = K.count, scene = K.scene;
  var LIST_BARS = 2.5, SITE = 'https://dudidd-wq.github.io/elections-2026/#/podcasts';
  var COLL = new Intl.Collator('he');
  var ENTRIES = D.entries.slice().sort(function (a, b) { return COLL.compare(a.name, b.name); });
  function mask(text, beat, cls) { return '<span class="mask' + (cls ? ' ' + cls : '') + '"><span' + A(beat, 'rise', 1) + '>' + esc(text) + '</span></span>'; }

  scene('title', '', 2, 's-title',
    '<div class="titlemark"' + A(0, 'fade', 1) + '>' + IC.mic + '</div>' +
    '<h1>' + mask('ראשי הרשימות', 0) + mask('בפודקאסטים ובראיונות ארוכים', .5) + '</h1>' +
    '<p class="lead"' + A(1.5, 'up') + '>מה אמרו ראשי ' + D.lists + ' הרשימות בחודש שלפני הבחירות</p>' +
    '<div class="pill"' + A(2.2, 'up') + '>חלון הסקירה <b>' + D.window[0] + '–' + D.window[1] + '</b></div>', { tr: 'none' });

  scene('scope', 'היקף', 2, 's-scope',
    '<p class="eyebrow"' + A(0, 'up') + '>היקף</p>' +
    '<h2>' + mask('מה נאסף', .2) + '</h2>' +
    '<div class="hemi-n" style="top:650px"' + A(.6, 'fade', .8, 3) + '>' + count(D.total, .6, 1.8, { ping: 84 }) + '<span>הופעות שאותרו</span></div>' +
    '<div class="dots" data-dots="types"></div>');

  scene('method', 'שיטה', 3, 's-method',
    '<p class="eyebrow"' + A(0, 'up') + '>שיטה</p>' +
    '<h2>' + mask('רק מה שנבדק מול המקור', .2) + '</h2>' +
    '<div class="mgrid"><ul class="mlist">' +
    '<li class="card"' + A(1.2, 'up') + '>' + IC.check + '<span>פודקאסטים וראיונות ארוכים של ראשי הרשימות – בעברית, באנגלית ובערבית</span></li>' +
    '<li class="card"' + A(1.8, 'up') + '>' + IC.quote + '<span>ציטוט – רק אם נבדק מול תמלול או מול דף המקור</span></li>' +
    '<li class="card"' + A(2.4, 'up') + '>' + IC.link + '<span>לכל הופעה ולכל ציטוט – קישור למקור</span></li></ul>' +
    '<div class="bigfig card"' + A(.8, 'up') + '>' + count(D.quotes, .9, 2.2, { ping: 88 }) + '<span>ציטוטים מאומתים</span></div></div>');

  scene('stage', 'ממצאים', 3, 's-stage',
    '<p class="eyebrow"' + A(0, 'up') + '>ממצא · בחירת במה</p>' +
    '<h2>' + mask('לאיזה קהל פנו ההופעות', .2) + '</h2>' +
    '<p class="lead"' + A(.9, 'up') + '>לפי סיווג הקהל באתר · ' + D.total + ' הופעות, כל הרשימות יחד</p>' +
    '<div class="dots" data-dots="aud"></div>');

  var ft = D.findTopics, mFrame = ft.match(/בעיקר במסגור קואליציוני \(([^)]*)\)/);
  var chipsT = ft.split('נושאים חוזרים נוספים:')[1].replace(/\.\s*$/, '').trim().split(/,\s*/);
  scene('topics', 'ממצאים', 3, 's-topics',
    '<p class="eyebrow"' + A(0, 'up') + '>ממצא · נושאים</p>' +
    '<p class="bigq">' + words('גיוס חרדים עלה אצל רוב ראשי הרשימות', .2, 1.2) + '</p>' +
    '<p class="lead"' + A(1.4, 'up') + '>בעיקר במסגור קואליציוני: ' + esc(mFrame ? mFrame[1] : '') + '</p>' +
    '<p class="sub2"' + A(2.2, 'up') + '>נושאים חוזרים נוספים</p>' +
    '<div class="chips">' + chipsT.map(function (c, i) { return '<span class="chip"' + A(2.6 + i * .3, 'up') + '>' + esc(c) + '</span>'; }).join('') + '</div>');

  scene('bars', 'ממצאים', 4, 's-bars',
    '<p class="eyebrow"' + A(0, 'up') + '>נתונים · 10 הסוגיות של האתר</p>' +
    '<h2 style="font-size:64px">' + mask('בכמה מ-' + D.lists + ' הרשימות עלתה כל סוגיה', .2) + '</h2>' +
    '<div class="bars">' + D.topics.map(function (t, i) {
      var b0 = 1 + i * .25;
      return '<div class="brow" data-row="1"' + A(b0, 'fade', .6) + '><span class="lab">' + esc(t[0]) + '</span><span class="trk"><i class="fil" data-w="' + (t[1] / 13).toFixed(4) + '" data-win="' + B(b0 + .1) + '" data-wd="0.7"></i></span><span class="val">' + count(t[1], b0 + .1, 1.4) + ' מתוך 13</span></div>';
    }).join('') + '</div>' +
    '<p class="foot" style="bottom:60px"' + A(4.5, 'fade') + '>סוגיה נספרת לרשימה אם עלתה לפחות באחת מהופעות ראש הרשימה.</p>');

  scene('index', '13 הרשימות', 2, 's-index',
    '<p class="eyebrow"' + A(0, 'up') + '>13 הרשימות</p>' +
    '<h2>' + mask('ציטוט מאומת אחד מכל ראש רשימה', .2) + '</h2>' +
    '<p class="lead"' + A(1, 'up') + '>לפי סדר האלף-בית · אותו זמן מסך לכל רשימה · הסדר אינו דירוג</p>');

  ENTRIES.forEach(function (e, i) {
    var qlang = e.lang === 'he' ? '' : ' lang="' + e.lang + '" dir="' + (e.lang === 'en' ? 'ltr' : 'rtl') + '"';
    scene('list-' + e.id, '13 הרשימות', LIST_BARS, 's-list',
      '<div class="prog" aria-hidden="true"' + A(0, 'fade', .4) + '><span class="num">' + (i + 1) + '/' + ENTRIES.length + '</span><span class="ticks13">' + ENTRIES.map(function (_, k) { return '<i class="' + (k < i ? 'done' : k === i ? 'cur' : '') + '">' + (k === i ? '<b data-progress="1"></b>' : '') + '</i>'; }).join('') + '</span></div>' +
      '<i class="bigL" aria-hidden="true" data-l="' + esc(e.name.charAt(0)) + '"' + A(0, 'fade', .8) + '></i>' +
      '<div class="lname' + (e.name.length > 22 ? ' longn' : '') + '">' + mask(e.name, 0) + '</div>' +
      '<div class="lleader"' + A(.3, 'up') + '>' + esc(e.leader) + '</div>' +
      '<figure class="qcard card" data-src="' + esc(e.src) + '"' + A(.5, 'up', .8) + '><blockquote class="qtext' + (e.quote.length > 60 ? ' long' : '') + '"' + qlang + ' style="margin:0">' +
      words((e.lang === 'he' ? '„' : '“') + e.quote + '”', .7, 1.2) + '</blockquote>' +
      '<figcaption><div class="qattr"' + A(1.6, 'fade', .6) + '><span class="dash">—</span> ' + esc(e.show) + (e.outlet && e.show.indexOf(e.outlet) < 0 ? ' (' + esc(e.outlet) + ')' : '') + ' · ' + esc(e.date) + '</div></figcaption></figure>', { list: true, entry: e });
  });

  scene('gaps', 'מגבלות', 3, 's-gaps',
    '<p class="eyebrow" style="color:var(--sand)"' + A(0, 'up') + '>פערים ומגבלות</p>' +
    '<h2>' + mask('מה לא נכלל', .2) + '</h2>' +
    '<ul class="glist">' + [
      'פודקאסטים בהפקת המפלגות, נאומים ועימותים',
      'ראיונות רדיו – לא נאספו באופן שיטתי',
      'הופעות בלי תמלול – תקציר בלבד, ללא ציטוט',
      'הסיקור בערבית חלקי',
      'סיווג הקהל הוא של העורך; מספר ההופעות אינו מדד לחשיבות'
    ].map(function (g, i) { return '<li class="card"' + A(.9 + i * .35, 'up') + '><i></i>' + esc(g) + '</li>'; }).join('') + '</ul>');

  scene('close', 'סיום', 2, 's-close',
    '<p class="eyebrow"' + A(0, 'up') + '>לכל הפרטים</p>' +
    '<h2>' + mask('כל ' + D.total + ' ההופעות, הקישורים', .2) + mask('והציטוטים המלאים – באתר', .6) + '</h2>' +
    '<a class="url" href="' + SITE + '" target="_top" rel="noopener" tabindex="-1"' + A(1.3, 'up') + '>' + IC.link + '<span class="ltr">dudidd-wq.github.io/elections-2026/#/podcasts</span></a>' +
    '<p class="neutral"' + A(1.9, 'up') + '><b>אתר מידע ניטרלי.</b> אין בו המלצה להצבעה · עודכן ב-' + D.updated + '</p>', { last: true });

  K.run({
    listBars: LIST_BARS,
    dots: {
      types: { n: D.total, hemi: { cy: 820, r0: 205, r1: 350 }, cy: 720, tIn: .4, tMove: 3, tLab: 3.6,
        groups: [{ n: D.types[0], cols: 9, lab: 'פודקאסטים', sub: 'אודיו או וידאו' }, { n: D.types[1], cols: 4, lab: 'ראיונות טלוויזיה', sub: 'או וידאו ארוכים' }, { n: D.types[2], cols: 4, lab: 'ראיונות רדיו', sub: '' }] },
      aud: { n: D.total, cy: 700, tIn: 1.2, tLab: 2.2,
        groups: [{ n: D.audience[0], cols: 5, lab: 'במות מיינסטרים' }, { n: D.audience[1], cols: 5, lab: 'קהל קרוב למחנה הדובר' }, { n: D.audience[2], cols: 3, lab: 'קהל קרוב למחנה אחר' }, { n: D.audience[3], cols: 5, lab: 'קהל כללי או ייעודי' }] }
    },
    sections: function (sec, SC, BEATS) {
      var L0 = SC.filter(function (s) { return s.x.list; });
      return [
        { b0: 0, b1: sec('topics').b0, mode: 'go', prog: ['C', 'G', 'Am', 'F'] },
        { b0: sec('topics').b0, b1: sec('index').b0, mode: 'hook', prog: ['Am', 'F', 'C', 'G'] },
        { b0: sec('index').b0, b1: L0[0].b0, mode: 'break', prog: ['F', 'G'] },
        { b0: L0[0].b0, b1: sec('gaps').b0, mode: 'list', meas: [4, 4, 2], prog: ['C', 'Am', 'G'] },
        { b0: sec('gaps').b0, b1: sec('close').b0, mode: 'go', prog: ['F', 'C', 'G'] },
        { b0: sec('close').b0, b1: BEATS, mode: 'outro', prog: ['F', 'C'] }];
    }
  });
})();
