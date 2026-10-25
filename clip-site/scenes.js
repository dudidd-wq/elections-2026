/* Clip B – "השוואת מצעים: מה מצאנו" (v4, fast cut): substantive findings of the elections site. Content ONLY from
   site-data.js (generated from data/platforms.json, data/analysis.json, data/polls.json by tools/build_clip_site.py;
   every text asserted verbatim, every number computed). 120 BPM: 1 beat = 0.5 s, 1 bar = 2 s; scene lengths in bars,
   each about the minimum comfortable reading time (0.18 s/word + 0.8 s). Strictly neutral: no recommendation, no
   ranking of lists; when lists get numbers, all 13 are shown (alphabetical) or a subset chosen by a stated rule. */
(function () {
  'use strict';
  var K = window.ClipKit, D = window.SITE_CLIP, A = K.A, B = K.B, esc = K.esc, IC = K.IC, words = K.words, count = K.count, scene = K.scene;
  var COLL = new Intl.Collator('he');
  var LISTS = D.lists.slice().sort(function (a, b) { return COLL.compare(a.name, b.name); });
  function mask(text, beat) { return '<span class="mask"><span' + A(beat, 'rise', 1) + '>' + esc(text) + '</span></span>'; }
  function sgn(v) { return '<span class="ltr num">' + (v > 0 ? '+' : v < 0 ? '\u2212' : '±') + Math.abs(v).toFixed(1) + '</span>'; }
  var tparts = D.title.split(' – '), P = D.polls, BS = D.basis;

  scene('title', '', 2, 's-title',
    '<div class="titlemark"' + A(0, 'fade', 1) + '>' + IC.columns + '</div>' +
    '<h1>' + mask(tparts[0], 0) + mask(tparts[1], .5) + '</h1>' +
    '<div class="pill"' + A(1.4, 'up') + '><b>' + D.nLists + '</b> רשימות · <b>' + D.nIssues + '</b> סוגיות · מה מצאנו</div>', { tr: 'none' });

  scene('depth', 'מחלוקות', 4, 's-depth',
    '<p class="eyebrow"' + A(0, 'up') + '>ניתוח רוחבי · עומק המחלוקת</p>' +
    '<h2>' + mask('איפה המחלוקת עמוקה ביותר', .2) + '</h2>' +
    '<ol class="rank r2">' + D.rank.map(function (r, i) { return '<li' + A(1 + i * .3, 'up') + '><i class="num">' + (i + 1) + '</i><span>' + esc(r) + '</span></li>'; }).join('') + '</ol>' +
    '<p class="foot"' + A(4, 'fade') + '>' + esc(D.rankNote) + '</p>');

  scene('deep', 'מחלוקות', 3, 's-deep',
    '<p class="eyebrow"' + A(0, 'up') + '>' + esc(D.deep.s[0].replace(/\.$/, '')) + '</p>' +
    '<h2 class="big">' + mask(D.deep.label, .2) + '</h2>' +
    '<p class="bigq2">' + words(D.deep.s[1], 1, 1.6) + '</p>' +
    '<p class="lead"' + A(3, 'up') + '>' + esc(D.deep.s[2]) + '</p>');

  var C = D.camps;
  scene('camps', 'מחלוקות', 4.5, 's-camps',
    '<p class="eyebrow"' + A(0, 'up') + '>' + esc(C.s1.replace(/\.$/, '')) + '</p>' +
    '<h2>' + mask(C.label, .2) + '</h2>' +
    '<div class="cgrid">' + [[C.wbHead, C.wb], [C.gzHead, C.gz]].map(function (g, gi) {
      return '<div class="ccol card"' + A(1 + gi * .4, 'up') + '><b>' + esc(g[0]) + '</b><ol>' + g[1].map(function (m, i) { return '<li' + A(1.4 + gi * .4 + i * .25, 'fade', .5) + '>' + esc(m) + '</li>'; }).join('') + '</ol></div>';
    }).join('') + '</div>');

  scene('pvd', 'מחלוקות', 3.5, 's-pvd',
    '<p class="eyebrow"' + A(0, 'up') + '>ניתוח רוחבי · עיקרון או מידה</p>' +
    '<h2>' + mask('על מה בדיוק חלוקים', .2) + '</h2>' +
    '<div class="pvd">' + D.pvd.map(function (g, gi) {
      return '<div class="pcol card' + (gi ? ' alt' : '') + '"' + A(1 + gi * .5, 'up') + '><b>' + esc(g.label) + '</b><div class="chips">' + g.items.map(function (c, i) { return '<span class="chip"' + A(1.4 + gi * .5 + i * .15, 'fade', .4) + '>' + esc(c) + '</span>'; }).join('') + '</div></div>';
    }).join('') + '</div>');

  scene('axes', 'צירים', 3, 's-axes',
    '<p class="eyebrow"' + A(0, 'up') + '>ציר חוצה מחנות · ' + esc(D.axes.label) + '</p>' +
    '<p class="bigq">' + words(D.axes.lead, .2, 1.4) + '</p>' +
    '<p class="sub2"' + A(2.2, 'up') + '>צירים שחוצים את הגושים, לפי הניתוח באתר</p>' +
    '<div class="chips">' + D.axes.labels.map(function (c, i) { return '<span class="chip"' + A(2.6 + i * .25, 'up') + '>' + esc(c) + '</span>'; }).join('') + '</div>');

  scene('consensus', 'הסכמות', 3, 's-consensus',
    '<p class="eyebrow"' + A(0, 'up') + '>ניתוח רוחבי · מכנה משותף</p>' +
    '<h2>' + mask(D.broadHeading, .2) + '</h2>' +
    '<ul class="nlist">' + D.broadN.map(function (c, i) { return '<li class="card"' + A(1 + i * .5, 'up') + '><b class="badge">' + esc(c.n) + '</b><span>' + esc(c.label) + '</span></li>'; }).join('') + '</ul>' +
    '');

  scene('partial', 'הסכמות', 3, 's-consensus',
    '<p class="eyebrow"' + A(0, 'up') + '>ניתוח רוחבי · מכנה משותף</p>' +
    '<h2>' + mask(D.partialHeading, .2) + '</h2>' +
    '<ul class="nlist">' + D.partialN.map(function (c, i) { return '<li class="card"' + A(1 + i * .5, 'up') + '><b class="badge">' + esc(c.n) + '</b><span>' + esc(c.label) + '</span></li>'; }).join('') + '</ul>');

  scene('basis', 'שקיפות', 3, 's-basis',
    '<p class="eyebrow"' + A(0, 'up') + '>על מה מבוססות העמדות</p>' +
    '<h2>' + mask(BS.total + ' עמדות: ' + D.nLists + ' רשימות × ' + D.nIssues + ' סוגיות', .2) + '</h2>' +
    '<div class="bstack"' + A(1, 'fade', .4) + '>' + ['plat', 'stmt', 'nf'].map(function (k, i) { return '<i class="seg ' + k + '" style="width:' + (BS[k] / BS.total * 100).toFixed(3) + '%"' + A(1.2 + i * .4, 'wipe', .8) + '></i>'; }).join('') + '</div>' +
    '<div class="blegend">' + ['plat', 'stmt', 'nf'].map(function (k, i) { return '<div class="bl"' + A(1.4 + i * .4, 'up') + '><i class="sw ' + k + '"></i>' + count(BS[k], 1.4 + i * .4, 1.6, { ping: [84, 88, 91][i] }) + '<span>' + esc(BS.labels[k]) + (k === 'stmt' ? ' <b class="star">*</b>' : '') + '</span></div>'; }).join('') + '</div>' +
    '<p class="foot"' + A(3.4, 'fade') + '>' + esc(BS.legend) + '</p>');

  var MAX = 26;
  scene('polls', 'סקרים', 5, 's-polls',
    '<p class="eyebrow"' + A(0, 'up') + '>סקרים · אינם תוצאות בחירות</p>' +
    '<h2 style="font-size:66px">' + mask('ממוצע הסקרים, נכון ל-' + P.asOf, .2) + '</h2>' +
    '<p class="lead" style="font-size:30px;margin-top:12px"' + A(.9, 'up') + '>ממוצע של ' + P.n + ' סקרים · במנדטים · לפי סדר האלף-בית · בצד: השינוי מאז ' + esc(P.from) + '</p>' +
    '<div class="pgrid">' + LISTS.map(function (l, i) {
      var b0 = 1.4 + i * .15, v = P.avg[l.id];
      return '<div class="prow" data-row="1"' + A(b0, 'fade', .5) + '><span class="lab">' + esc(l.name) + '</span><span class="trk"><i class="fil" data-w="' + Math.min(1, v / MAX).toFixed(4) + '" data-win="' + B(b0 + .1) + '" data-wd="0.7"></i></span><span class="val">' + count(v, b0 + .1, 1.4, { dec: 1 }) + '</span><span class="was">' + sgn(Math.round((v - P.fromAvg[l.id]) * 10) / 10) + '</span></div>';
    }).join('') + '</div>' +
    '');

  scene('moves', 'סקרים', 4.5, 's-moves',
    '<p class="eyebrow"' + A(0, 'up') + '>סקרים · מגמה · אינם תוצאות בחירות</p>' +
    '<h2>' + mask('השינויים הגדולים מאז ' + P.from.replace(/\.\d{4}$/, ''), .2) + '</h2>' +
    '<p class="lead" style="font-size:32px;margin-top:14px"' + A(.9, 'up') + '>' + esc(P.movesRule) + '</p>' +
    '<div class="mvgrid">' + P.moves.map(function (m, i) { return '<div class="mv card"' + A(1.6 + i * .4, 'up') + '><b class="nm">' + esc(m.name) + '</b><span class="ft ltr num">' + m.from.toFixed(1) + ' → ' + m.to.toFixed(1) + '</span><span class="dl">' + sgn(m.d) + '</span></div>'; }).join('') + '</div>' +
    '<p class="foot"' + A(3.6, 'fade') + '>' + esc(P.silence) + '</p>');

  var NAVIC = { matrix: IC.grid, issue: IC.search, list: IC.columns, compare: IC.columns, analysis: IC.chart, polls: IC.chart, podcasts: IC.mic, coalition: IC.columns, about: IC.info };
  scene('howto', 'באתר', 2, 's-howto',
    '<p class="eyebrow"' + A(0, 'up') + '>איך משתמשים באתר</p>' +
    '<h2>' + mask('כל עמדה – בניסוח המלא ועם קישור למקור', .2) + '</h2>' +
    '<div class="navgrid"' + (D.nav.length > 8 ? ' style="grid-template-columns:repeat(5,1fr)"' : '') + '>' + D.nav.map(function (n, i) { return '<div class="navc card"' + A(1 + i * .2, 'up') + '>' + (NAVIC[n.id] || IC.info) + '<b>' + esc(n.label) + '</b></div>'; }).join('') + '</div>');

  scene('close', 'סיום', 2, 's-close',
    '<p class="eyebrow"' + A(0, 'up') + '>לכל הפרטים</p>' +
    '<h2>' + mask('כל העמדות, המקורות', .2) + mask('והסקרים – באתר', .6) + '</h2>' +
    '<a class="url" href="' + D.site + '" target="_top" rel="noopener" tabindex="-1"' + A(1.3, 'up') + '>' + IC.link + '<span class="ltr">dudidd-wq.github.io/elections-2026</span></a>' +
    '<p class="neutral"' + A(1.9, 'up') + '><b>אתר מידע ניטרלי.</b> ' + esc(D.heroNo) + '</p>', { last: true });

  K.run({
    listBars: 0,
    sections: function (sec, SC, BEATS) {
      return [
        { b0: 0, b1: sec('deep').b0, mode: 'go', prog: ['C', 'G', 'Am', 'F'] },
        { b0: sec('deep').b0, b1: sec('pvd').b0, mode: 'hook', prog: ['Am', 'F', 'C', 'G'] },
        { b0: sec('pvd').b0, b1: sec('consensus').b0, mode: 'go', prog: ['F', 'G', 'Em', 'Am'] },
        { b0: sec('consensus').b0, b1: sec('basis').b0, mode: 'break', prog: ['F', 'G', 'Am', 'G'] },
        { b0: sec('basis').b0, b1: sec('howto').b0, mode: 'hook', prog: ['C', 'G', 'Am', 'F'] },
        { b0: sec('howto').b0, b1: sec('close').b0, mode: 'go', prog: ['F', 'G', 'C'] },
        { b0: sec('close').b0, b1: BEATS, mode: 'outro', prog: ['F', 'C'] }];
    }
  });
})();
