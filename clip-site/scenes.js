/* Clip B – "מה יש באתר": an overview of the elections site itself. Content ONLY from site-data.js (generated from
   data/platforms.json, data/analysis.json, data/polls.json by tools/build_clip_site.py, every text asserted verbatim).
   Scene lengths in bars (90 BPM, 1 bar = 2.667 s); every list scene = 2 bars (5.33 s), same structure and music bed.
   Lists in Hebrew alphabetical order (also in the poll chart). No recommendation, no ranking of lists. */
(function () {
  'use strict';
  var K = window.ClipKit, D = window.SITE_CLIP, A = K.A, B = K.B, esc = K.esc, IC = K.IC, words = K.words, count = K.count, scene = K.scene;
  var LIST_BARS = 2;
  var COLL = new Intl.Collator('he');
  var LISTS = D.lists.slice().sort(function (a, b) { return COLL.compare(a.name, b.name); });
  function mask(text, beat) { return '<span class="mask"><span' + A(beat, 'rise', 1.4) + '>' + esc(text) + '</span></span>'; }
  var tparts = D.title.split(' – ');

  scene('title', '', 3, 's-title',
    '<div class="titlemark"' + A(.25, 'fade', 2) + '>' + IC.columns + '</div>' +
    '<p class="eyebrow"' + A(.5, 'up') + '>' + esc(D.election) + '</p>' +
    '<h1>' + mask(tparts[0], 1) + mask(tparts[1], 1.8) + '</h1>' +
    '<p class="lead" style="max-width:1180px"' + A(3.5, 'up') + '>' + esc(D.heroLead) + '</p>' +
    '<p class="lead" style="font-size:34px;color:var(--ink3);margin-top:16px;max-width:1180px"' + A(5, 'up') + '>' + esc(D.heroNo) + '</p>' +
    '<div class="pill"' + A(6.5, 'up') + '>' + esc(D.docAsOf) + '</div>', { tr: 'none' });

  scene('scope', 'מה משווים', 3, 's-scope2',
    '<p class="eyebrow"' + A(.3, 'up') + '>מה משווים</p>' +
    '<div class="kpis"><div class="kpi card"' + A(.6, 'up') + '>' + count(D.nLists, .8, 2, { ping: 81 }) + '<span>רשימות</span></div>' +
    '<div class="kpi card"' + A(1.2, 'up') + '>' + count(D.nIssues, 1.4, 2, { ping: 84 }) + '<span>סוגיות</span></div></div>' +
    '<div class="ichips">' + D.issues.map(function (t, i) { return '<span class="ichip card"' + A(3 + i * .45, 'up') + '><i class="num">' + (i + 1) + '</i>' + esc(t) + '</span>'; }).join('') + '</div>');

  scene('marking', 'איך לקרוא', 4, 's-marking',
    '<p class="eyebrow"' + A(.3, 'up') + '>איך מסומנות העמדות</p>' +
    '<h2>' + mask('לכל עמדה – סוג המקור', .5) + '</h2>' +
    '<div class="stypes">' + D.sourceTypes.map(function (t, i) { return '<div class="stype card"' + A(2 + i * .9, 'up') + '><b>' + esc(t.k) + '</b><span>' + esc(t.v) + '</span></div>'; }).join('') + '</div>' +
    '<div class="starcard card"' + A(6.5, 'up') + '><i aria-hidden="true">*</i><span>' + esc(D.star) + '</span></div>' +
    '<p class="foot"' + A(9.5, 'fade') + '>' + esc(D.notFound) + '</p>');

  scene('splits', 'ניתוח רוחבי', 4, 's-splits',
    '<p class="eyebrow"' + A(.3, 'up') + '>ניתוח רוחבי</p>' +
    '<h2 style="font-size:72px">' + mask(D.analysisTitle, .5) + '</h2>' +
    '<div class="sgrid"><div><p class="sub2" style="margin-top:28px"' + A(1.6, 'up') + '>עומק המחלוקת, לפי הניתוח באתר</p><ol class="rank">' + D.rank.map(function (r, i) { return '<li' + A(2.2 + i * .55, 'up') + '><i class="num">' + (i + 1) + '</i><span>' + esc(r) + '</span></li>'; }).join('') + '</ol></div>' +
    '<div class="axis card"' + A(7, 'up') + '><small>ציר חוצה מחנות · ' + esc(D.axis.label) + '</small><b>' + esc(D.axis.text) + '</b></div></div>' +
    '<p class="foot" style="bottom:72px"' + A(9.5, 'fade') + '>' + esc(D.rankNote) + '</p>');

  scene('consensus', 'ניתוח רוחבי', 3, 's-consensus',
    '<p class="eyebrow"' + A(.3, 'up') + '>ניתוח רוחבי · מכנה משותף</p>' +
    '<h2>' + mask(D.broadHeading, .5) + '</h2>' +
    '<ul class="mlist" style="margin-top:44px">' + D.broad.map(function (c, i) { return '<li class="card cons"' + A(2 + i * 1.4, 'up') + '>' + IC.check + '<span><b>' + esc(c.label) + '</b><small>' + esc(c.text) + '</small></span></li>'; }).join('') + '</ul>');

  var P = D.polls, MAX = 26;
  scene('polls', 'סקרים', 4, 's-polls',
    '<p class="eyebrow"' + A(.3, 'up') + '>סקרים</p>' +
    '<h2 style="font-size:66px">' + mask('ממוצע הסקרים, נכון ל-' + P.asOf, .5) + '</h2>' +
    '<p class="lead" style="font-size:32px;margin-top:14px"' + A(1.4, 'up') + '>ממוצע של ' + P.n + ' סקרים (' + P.window[0] + '–' + P.window[1] + ') · במנדטים · לפי סדר האלף-בית · בצד: הממוצע ב-' + esc(P.from) + ' · סקרים אינם תוצאות בחירות</p>' +
    '<div class="pgrid">' + LISTS.map(function (l, i) {
      var b0 = 2.4 + i * .3, v = P.avg[l.id];
      return '<div class="prow"' + A(b0, 'fade', .8) + '><span class="lab">' + esc(l.name) + '</span><span class="trk"><i class="fil" data-w="' + Math.min(1, v / MAX).toFixed(4) + '" data-win="' + B(b0 + .2) + '"></i></span><span class="val">' + count(v, b0 + .2, 2.4, { dec: 1 }) + '</span><span class="was">ב-' + esc(P.from.replace(/\.\d{4}$/, '')) + ' · <span class="num">' + P.fromAvg[l.id].toFixed(1) + '</span></span></div>';
    }).join('') + '</div>' +
    '<p class="foot" style="bottom:56px"' + A(8.5, 'fade') + '>' + esc(P.method) + ' ' + esc(P.threshold) + '<br>' + esc(P.silence) + '</p>');

  scene('index', '13 הרשימות', 2, 's-index',
    '<p class="eyebrow"' + A(.2, 'up') + '>13 הרשימות</p>' +
    '<h2>' + mask('לפי סדר האלף-בית', .3) + '</h2>' +
    '<p class="lead" style="font-size:36px"' + A(1, 'up') + '>שורה אחת על כל רשימה, מתוך האתר · אותו מבנה ואותו זמן מסך לכל רשימה · הסדר אינו דירוג</p>' +
    '<div class="lgrid">' + LISTS.map(function (l, i) { return '<div class="lchip card"' + A(1.8 + i * .18, 'up') + '><b>' + esc(l.name) + '</b><span>' + esc(l.letters) + '</span></div>'; }).join('') + '</div>');

  LISTS.forEach(function (l, i) {
    scene('list-' + l.id, '13 הרשימות', LIST_BARS, 's-list',
      '<div class="prog"' + A(0, 'fade', .6) + '><span>לפי סדר האלף-בית · ' + (i + 1) + ' מתוך ' + LISTS.length + '</span><span class="ticks13">' + LISTS.map(function (_, k) { return '<i class="' + (k < i ? 'done' : k === i ? 'cur' : '') + '">' + (k === i ? '<b data-progress="1"></b>' : '') + '</i>'; }).join('') + '</span></div>' +
      '<i class="bigL" aria-hidden="true" data-l="' + esc(l.name.charAt(0)) + '"' + A(0, 'fade', 1.5) + '></i>' +
      '<div class="lname' + (l.name.length > 22 ? ' longn' : '') + '">' + mask(l.name, .2) + '</div>' +
      '<div class="lmeta"' + A(.6, 'up') + '><span class="letters">אותיות בפתק: <b>' + esc(l.letters) + '</b></span><span class="lleader2">' + esc(l.leader) + '</span></div>' +
      '<div class="lline card"' + A(1, 'up', 1) + '><small style="margin:0 0 12px">הרכב הרשימה</small><span class="ltext">' + words(l.comp, 1.3, 2) + '</span></div>', { list: true, entry: l });
  });

  var NAVIC = { matrix: IC.grid, issue: IC.search, list: IC.columns, compare: IC.columns, analysis: IC.chart, polls: IC.chart, podcasts: IC.mic, about: IC.info };
  scene('howto', 'איך משתמשים', 3, 's-howto',
    '<p class="eyebrow"' + A(.3, 'up') + '>איך משתמשים באתר</p>' +
    '<h2>' + mask('מה יש באתר', .5) + '</h2>' +
    '<p class="lead"' + A(1.5, 'up') + '>' + esc(D.heroLead.replace(/^.*?, /, '').replace(/^./, function (c) { return c; })) + '</p>' +
    '<div class="navgrid">' + D.nav.map(function (n, i) { return '<div class="navc card"' + A(2.6 + i * .5, 'up') + '>' + (NAVIC[n.id] || IC.info) + '<b>' + esc(n.label) + '</b></div>'; }).join('') + '</div>');

  scene('close', 'סיום', 3, 's-close',
    '<p class="eyebrow"' + A(.5, 'up') + '>לכל הפרטים</p>' +
    '<h2>' + mask('כל העמדות, המקורות והסקרים', 1) + mask('– באתר', 1.6) + '</h2>' +
    '<a class="url" href="' + D.site + '" target="_top" rel="noopener" tabindex="-1"' + A(3.5, 'up') + '>' + IC.link + '<span class="ltr">dudidd-wq.github.io/elections-2026</span></a>' +
    '<p class="neutral"' + A(5, 'up') + '><b>אתר מידע ניטרלי.</b> אין בו המלצה להצבעה · המסמך נכון ל-' + esc(D.updated) + ' · הסקרים נכון ל-' + esc(P.asOf) + '</p>', { last: true });

  K.run({
    listBars: LIST_BARS,
    sections: function (sec, SC, BEATS) {
      var L0 = SC.filter(function (s) { return s.x.list; });
      return [
        { b0: 0, b1: 4, mode: 'intro', prog: ['Am'] },
        { b0: 4, b1: sec('marking').b0, mode: 'a', prog: ['F', 'C', 'G', 'Am', 'F'] },
        { b0: sec('marking').b0, b1: sec('consensus').b0, mode: 'b', prog: ['Am', 'F', 'C', 'G'] },
        { b0: sec('consensus').b0, b1: sec('polls').b0, mode: 'build', prog: ['F', 'G', 'E'] },
        { b0: sec('polls').b0, b1: sec('index').b0, mode: 'peak', prog: ['Am', 'F', 'C', 'G'] },
        { b0: sec('index').b0, b1: L0[0].b0, mode: 'a', prog: ['F', 'G'] },
        { b0: L0[0].b0, b1: sec('howto').b0, mode: 'list', prog: ['Am', 'G'] },
        { b0: sec('howto').b0, b1: sec('close').b0, mode: 'reflect', prog: ['F', 'Dm', 'G'] },
        { b0: sec('close').b0, b1: BEATS, mode: 'outro', prog: ['F', 'G', 'Am'] }];
    }
  });
})();
