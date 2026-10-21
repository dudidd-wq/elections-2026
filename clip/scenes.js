/* Clip A – "ראשי הרשימות בפודקאסטים ובראיונות ארוכים". Content ONLY from clip-data.js (generated from
   data/podcasts.json by tools/build_clip.py, every quote asserted verbatim). Scene lengths in bars (90 BPM, 1 bar = 2.667 s);
   every list scene = 3 bars (8 s), same structure, same music bed. Lists in Hebrew alphabetical order. */
(function () {
  'use strict';
  var K = window.ClipKit, D = window.CLIP_DATA, A = K.A, B = K.B, esc = K.esc, IC = K.IC, words = K.words, count = K.count, scene = K.scene;
  var LIST_BARS = 3, SITE = 'https://dudidd-wq.github.io/elections-2026/#/podcasts';
  var COLL = new Intl.Collator('he');
  var ENTRIES = D.entries.slice().sort(function (a, b) { return COLL.compare(a.name, b.name); });
  function mask(text, beat, cls) { return '<span class="mask' + (cls ? ' ' + cls : '') + '"><span' + A(beat, 'rise', 1.4) + '>' + esc(text) + '</span></span>'; }

  scene('title', '', 2, 's-title',
    '<div class="titlemark"' + A(.25, 'fade', 2) + '>' + IC.mic + '</div>' +
    '<p class="eyebrow"' + A(.5, 'up') + '>בחירות לכנסת ה-26 · 27.10.2026</p>' +
    '<h1>' + mask('ראשי הרשימות', 1) + mask('בפודקאסטים ובראיונות ארוכים', 1.8) + '</h1>' +
    '<p class="lead"' + A(3.5, 'up') + '>מה אמרו ראשי ' + D.lists + ' הרשימות בחודש שלפני הבחירות – הממצאים, בשלוש דקות</p>' +
    '<div class="pill"' + A(4.5, 'up') + '>חלון הסקירה <b>' + D.window[0] + '–' + D.window[1] + '</b></div>', { tr: 'none' });

  scene('scope', 'היקף', 4, 's-scope',
    '<p class="eyebrow"' + A(.3, 'up') + '>היקף</p>' +
    '<h2>' + mask('מה נאסף', .5) + '</h2>' +
    '<p class="lead"' + A(1.5, 'up', 0, 8.5) + '>כל נקודה – הופעה אחת</p>' +
    '<div class="hemi-n" style="top:650px"' + A(2.5, 'fade', 1, 8.5) + '>' + count(D.total, 2.5, 3, { ping: 81 }) + '<span>הופעות שאותרו</span></div>' +
    '<div class="kfig" style="right:150px;top:560px"' + A(4.5, 'up', 0, 8.5) + '>' + count(D.lists, 4.5, 2, { ping: 84 }) + '<span>ראשי רשימות – לכל אחד לפחות הופעה אחת</span></div>' +
    '<div class="kfig" style="left:150px;top:560px"' + A(5.5, 'up', 0, 8.5) + '><b>חודש אחד</b><span>' + D.window[0] + '–' + D.window[1] + '</span></div>' +
    '<div class="dots" data-dots="types"></div>');

  scene('method', 'שיטה', 4, 's-method',
    '<p class="eyebrow"' + A(.3, 'up') + '>שיטה</p>' +
    '<h2>' + mask('רק מה שנבדק מול המקור', .5) + '</h2>' +
    '<div class="mgrid"><ul class="mlist">' +
    '<li class="card"' + A(2.5, 'up') + '>' + IC.check + '<span>פודקאסטים וראיונות אודיו/וידאו ארוכים של ראשי הרשימות – בעברית, באנגלית ובערבית</span></li>' +
    '<li class="card"' + A(4, 'up') + '>' + IC.quote + '<span>ציטוט – רק אם נבדק מול תמלול או מול דף המקור, כדברי ראש הרשימה עצמו ולא ככותרת</span></li>' +
    '<li class="card"' + A(5.5, 'up') + '>' + IC.link + '<span>כל השאר באתר – פרפרזה, ומסומן כך. לכל הופעה ולכל ציטוט – קישור למקור</span></li>' +
    '<li class="card"' + A(7, 'up') + '>' + IC.ban + '<span>לא נכללו פודקאסטים בהפקת המפלגות עצמן</span></li></ul>' +
    '<div class="bigfig card"' + A(1.5, 'up') + '>' + count(D.quotes, 2, 3, { ping: 84 }) + '<span>ציטוטים מאומתים</span><small>בכל ההופעות יחד. מספר ההופעות משקף את מה שאותר בחיפוש, ואינו מדד לחשיבות או דירוג.</small></div></div>');

  scene('stage', 'ממצאים', 3, 's-stage',
    '<p class="eyebrow"' + A(.3, 'up') + '>ממצא · בחירת במה</p>' +
    '<h2>' + mask('לאיזה קהל פנו ההופעות', .5) + '</h2>' +
    '<p class="lead"' + A(1.5, 'up') + '>לפי סיווג הקהל שמוצג באתר בכל הופעה · ' + D.total + ' הופעות, לכל הרשימות יחד</p>' +
    '<div class="dots" data-dots="aud"></div>' +
    '<p class="foot"' + A(7, 'fade') + '>הסיווג הוא של העורך, ומוצהר כך באתר. הספירה אינה מפורטת כאן לפי רשימה.</p>');

  var ft = D.findTopics, mFrame = ft.match(/בעיקר במסגור קואליציוני \(([^)]*)\)/);
  var chipsT = ft.split('נושאים חוזרים נוספים:')[1].replace(/\.\s*$/, '').trim().split(/,\s*/);
  var styleF = D.findStyle.replace(/^סגנון:\s*/, '');
  scene('topics', 'ממצאים', 3, 's-topics',
    '<p class="eyebrow"' + A(.3, 'up') + '>ממצא · נושאים</p>' +
    '<p class="bigq">' + words('גיוס חרדים עלה אצל רוב ראשי הרשימות', .5, 2) + '</p>' +
    '<p class="lead"' + A(3, 'up') + '>בעיקר במסגור קואליציוני: ' + esc(mFrame ? mFrame[1] : '') + '</p>' +
    '<p class="sub2"' + A(4.5, 'up') + '>נושאים חוזרים נוספים</p>' +
    '<div class="chips">' + chipsT.map(function (c, i) { return '<span class="chip"' + A(5.2 + i * .5, 'up') + '>' + esc(c) + '</span>'; }).join('') + '</div>' +
    '<p class="foot"' + A(8, 'fade') + '>ועוד: ' + esc(styleF) + '</p>');

  scene('bars', 'ממצאים', 4, 's-bars',
    '<p class="eyebrow"' + A(.3, 'up') + '>נתונים · 10 הסוגיות של האתר</p>' +
    '<h2 style="font-size:64px">' + mask('בכמה מ-' + D.lists + ' הרשימות עלתה כל סוגיה', .5) + '</h2>' +
    '<div class="bars">' + D.topics.map(function (t, i) {
      var b0 = 2 + i * .4;
      return '<div class="brow"' + A(b0, 'fade', .8) + '><span class="lab">' + esc(t[0]) + '</span><span class="trk"><i class="fil" data-w="' + (t[1] / 13).toFixed(4) + '" data-win="' + B(b0 + .2) + '"></i></span><span class="val">' + count(t[1], b0 + .2, 2.4) + ' מתוך 13</span></div>';
    }).join('') + '</div>' +
    '<p class="foot" style="bottom:60px"' + A(8, 'fade') + '>סוגיה נספרת לרשימה אם תויגה לפחות באחת מהופעות ראש הרשימה. הופעה יכולה לעסוק בכמה סוגיות. התיוג לפי 10 הסוגיות של האתר בלבד.</p>');

  scene('index', '13 הרשימות', 2, 's-index',
    '<p class="eyebrow"' + A(.2, 'up') + '>13 הרשימות</p>' +
    '<h2>' + mask('לפי סדר האלף-בית', .3) + '</h2>' +
    '<p class="lead" style="font-size:36px"' + A(1, 'up') + '>ציטוט מאומת אחד מכל ראש רשימה · אותו מבנה ואותו זמן מסך לכל רשימה · הסדר אינו דירוג</p>' +
    '<div class="lgrid">' + ENTRIES.map(function (e, i) { return '<div class="lchip card"' + A(1.8 + i * .18, 'up') + '><b>' + esc(e.name) + '</b><span>' + esc(e.leader) + '</span></div>'; }).join('') + '</div>');

  ENTRIES.forEach(function (e, i) {
    var qlang = e.lang === 'he' ? '' : ' lang="' + e.lang + '" dir="' + (e.lang === 'en' ? 'ltr' : 'rtl') + '"';
    scene('list-' + e.id, '13 הרשימות', LIST_BARS, 's-list',
      '<div class="prog"' + A(0, 'fade', .6) + '><span>לפי סדר האלף-בית · ' + (i + 1) + ' מתוך ' + ENTRIES.length + '</span><span class="ticks13">' + ENTRIES.map(function (_, k) { return '<i class="' + (k < i ? 'done' : k === i ? 'cur' : '') + '">' + (k === i ? '<b data-progress="1"></b>' : '') + '</i>'; }).join('') + '</span></div>' +
      '<i class="bigL" aria-hidden="true" data-l="' + esc(e.name.charAt(0)) + '"' + A(0, 'fade', 1.5) + '></i>' +
      '<div class="lname' + (e.name.length > 22 ? ' longn' : '') + '">' + mask(e.name, .25) + '</div>' +
      '<div class="lleader"' + A(.75, 'up') + '>' + esc(e.leader) + '</div>' +
      '<figure class="qcard card"' + A(1.25, 'up', 1) + '><blockquote class="qtext' + (e.quote.length > 60 ? ' long' : '') + '"' + qlang + ' style="margin:0">' +
      words((e.lang === 'he' ? '„' : '“') + e.quote + '”', 1.7, 3) + '</blockquote>' +
      '<figcaption><div class="qattr"' + A(4.5, 'fade', 1) + '><span class="dash">—</span> ' + esc(e.leader) + ' · ' + esc(e.show) + (e.outlet && e.show.indexOf(e.outlet) < 0 ? ' (' + esc(e.outlet) + ')' : '') + ' · ' + esc(e.date) + '</div>' +
      '<div class="qmeta"' + A(5, 'fade', 1) + '><span>' + esc(e.type) + '</span><span class="ok">' + IC.check + esc(e.method) + (e.ts ? ' · בזמן <span class="ltr">' + esc(e.ts) + '</span>' : '') + '</span>' +
      '<a href="' + esc(e.src) + '" target="_blank" rel="noopener noreferrer" tabindex="-1">למקור הציטוט ↗</a></div></figcaption></figure>', { list: true, entry: e });
  });

  scene('gaps', 'מגבלות', 3, 's-gaps',
    '<p class="eyebrow" style="color:var(--sand)"' + A(.3, 'up') + '>פערים ומגבלות</p>' +
    '<h2>' + mask('מה לא נכלל, ומה חשוב לדעת', .5) + '</h2>' +
    '<ul class="glist">' + [
      'לא נכללו פודקאסטים בהפקת המפלגות, נאומים ועימותים',
      'ראיונות רדיו לא נאספו באופן שיטתי – ייתכן שחסרים ראיונות',
      'הופעות בלי כתוביות או תמלול – פרטים ותקציר בלבד, ללא ציטוט',
      'הסיקור בערבית חלקי',
      'תוויות הקהל הן סיווג של העורך; מספר ההופעות אינו מדד לחשיבות'
    ].map(function (g, i) { return '<li class="card"' + A(2 + i * 1.1, 'up') + '><i></i>' + esc(g) + '</li>'; }).join('') + '</ul>');

  scene('close', 'סיום', 3, 's-close',
    '<p class="eyebrow"' + A(.5, 'up') + '>לכל הפרטים</p>' +
    '<h2>' + mask('כל ' + D.total + ' ההופעות, הקישורים', 1) + mask('והציטוטים המלאים – באתר', 1.6) + '</h2>' +
    '<a class="url" href="' + SITE + '" target="_top" rel="noopener" tabindex="-1"' + A(3.5, 'up') + '>' + IC.link + '<span class="ltr">dudidd-wq.github.io/elections-2026/#/podcasts</span></a>' +
    '<p class="neutral"' + A(5, 'up') + '><b>אתר מידע ניטרלי.</b> אין בו המלצה להצבעה · הנתונים עודכנו ב-' + D.updated + '</p>', { last: true });

  K.run({
    listBars: LIST_BARS,
    dots: {
      types: { n: D.total, hemi: { cy: 820, r0: 205, r1: 350 }, cy: 720, tIn: 2, tMove: 9, tLab: 10.5,
        groups: [{ n: D.types[0], cols: 9, lab: 'פודקאסטים', sub: 'אודיו או וידאו' }, { n: D.types[1], cols: 4, lab: 'ראיונות טלוויזיה', sub: 'או וידאו ארוכים' }, { n: D.types[2], cols: 4, lab: 'ראיונות רדיו', sub: '' }] },
      aud: { n: D.total, cy: 690, tIn: 2, tLab: 3.8,
        groups: [{ n: D.audience[0], cols: 5, lab: 'במות מיינסטרים' }, { n: D.audience[1], cols: 5, lab: 'קהל קרוב למחנה הדובר' }, { n: D.audience[2], cols: 3, lab: 'קהל קרוב למחנה אחר' }, { n: D.audience[3], cols: 5, lab: 'קהל כללי או ייעודי', sub: 'כלכלה, לייף-סטייל, דוברי אנגלית ועוד' }] }
    },
    sections: function (sec, SC, BEATS) {
      var L0 = SC.filter(function (s) { return s.x.list; });
      return [
        { b0: 0, b1: 4, mode: 'intro', prog: ['Am'] },
        { b0: 4, b1: sec('method').b0, mode: 'a', prog: ['F', 'C', 'G', 'Am', 'F'] },
        { b0: sec('method').b0, b1: sec('topics').b0, mode: 'b', prog: ['Am', 'F', 'C', 'G'] },
        { b0: sec('topics').b0, b1: sec('bars').b0, mode: 'build', prog: ['F', 'G', 'E'] },
        { b0: sec('bars').b0, b1: sec('index').b0, mode: 'peak', prog: ['Am', 'F', 'C', 'G'] },
        { b0: sec('index').b0, b1: L0[0].b0, mode: 'a', prog: ['F', 'G'] },
        { b0: L0[0].b0, b1: sec('gaps').b0, mode: 'list', prog: ['Am', 'F', 'G'] },
        { b0: sec('gaps').b0, b1: sec('close').b0, mode: 'reflect', prog: ['F', 'Dm', 'G'] },
        { b0: sec('close').b0, b1: BEATS, mode: 'outro', prog: ['F', 'G', 'Am'] }];
    }
  });
})();
