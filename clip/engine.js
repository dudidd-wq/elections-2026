/* Clip engine v4 (shared by /clip/ and /clip-site/) – fast, smooth editorial motion. Deterministic timeline at 120 BPM:
   every frame is a pure function of the clock T, so play / pause / scrub / ?t= seeking / frame-exact recording all
   render identically. requestAnimationFrame only.
   Stability rules: text is only ever faded or moved by whole pixels while it enters; at rest it has no transform,
   no filter and no scale (pixel-stable). No glitch, shake, tilt, flash or beat-pulsing of text/cards.
   Usage: scenes file calls ClipKit.scene(...) for every scene, then ClipKit.run(cfg). */
(function () {
  'use strict';
  var AU = window.ClipAudio, SPB = AU.SPB, BAR = AU.BAR;
  var Q = new URLSearchParams(location.search);
  var REC = Q.get('rec') === '1';
  var CALM = Q.get('calm') === '1' || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  var SC = [];

  // ---------- helpers for scene markup (times in beats unless noted)
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function clamp(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function eo(x) { return 1 - Math.pow(1 - x, 3); }
  function eq(x) { return 1 - Math.pow(1 - x, 4); }
  function eio(x) { return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
  function B(n) { return (n * SPB).toFixed(3); }
  function A(beat, type, dBeats, outBeat) { return ' data-in="' + B(beat) + '"' + (type ? ' data-a="' + type + '"' : '') + (dBeats ? ' data-d="' + B(dBeats) + '"' : '') + (outBeat != null ? ' data-out="' + B(outBeat) + '"' : ''); }
  function words(text, beat0, spanBeats) { // word-by-word soft rise; whole words, so bidi and line breaks stay natural
    var ws = String(text).split(/(\s+)/), n = ws.filter(function (w) { return w.trim(); }).length, k = 0, out = '';
    var st = Math.min(.07, spanBeats * SPB / Math.max(1, n));
    ws.forEach(function (w) { if (!w.trim()) { out += w; return; } out += '<span class="w" data-a="word" data-in="' + (beat0 * SPB + k * st).toFixed(3) + '" data-d="0.34">' + esc(w) + '</span>'; k++; });
    return out;
  }
  function count(v, beat, dBeats, opt) { opt = opt || {}; return '<b class="num" data-count="' + v + '" data-dec="' + (opt.dec || 0) + '" data-cin="' + B(beat) + '" data-cd="' + B(dBeats || 3) + '"' + (opt.ping ? ' data-ping="' + opt.ping + '"' : '') + '>' + (opt.dec ? (0).toFixed(opt.dec) : '0') + '</b>'; }
  function fmtT(s) { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ':' + ('0' + s % 60).slice(-2); }
  var IC = {
    check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12.5l5 5L20 6.5"/></svg>',
    quote: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 7H6a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h3v1a3 3 0 0 1-3 3M20 7h-4a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h3v1a3 3 0 0 1-3 3"/></svg>',
    link: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>',
    ban: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M6 6l12 12"/></svg>',
    info: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/></svg>',
    grid: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/></svg>',
    chart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
    search: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L21 21"/></svg>',
    mic: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M6 11a6 6 0 0 0 12 0M12 17v4M9 21h6"/></svg>',
    columns: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="4" width="5" height="16" rx="1.2"/><rect x="9.5" y="4" width="5" height="16" rx="1.2"/><rect x="15.5" y="4" width="5" height="16" rx="1.2"/></svg>',
    star: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5l2.6 5.6 6 .6-4.5 4 1.3 6-5.4-3.1-5.4 3.1 1.3-6-4.5-4 6-.6z"/></svg>'
  };
  // scene(id, chapter, bars, cssClass, html, extra). extra.tr: 'fade' (default) | 'none'; extra.list: list scene (guarded equal)
  function scene(id, chap, bars, cls, html, x) { x = x || {}; SC.push({ id: id, chap: chap, bars: bars, beats: bars * 4, dur: bars * BAR, cls: cls, html: html, x: x, tr: x.tr || 'fade' }); }

  // ---------- dots: generic "one dot = one item" layouts (hemicycle -> clusters); every dot identical
  function hemicycle(n, cx, cy, r0, r1, rows) {
    var radii = [], sum = 0; for (var k = 0; k < rows; k++) { var r = r0 + (r1 - r0) * k / (rows - 1); radii.push(r); sum += r; }
    var per = radii.map(function (r) { return Math.round(n * r / sum); }); var d = n - per.reduce(function (a, b) { return a + b; }, 0); per[rows - 1] += d;
    var seats = []; radii.forEach(function (r, k) { for (var j = 0; j < per[k]; j++) { var a = per[k] === 1 ? Math.PI / 2 : Math.PI * j / (per[k] - 1); seats.push({ a: a, x: cx + r * Math.cos(a), y: cy - r * Math.sin(a) }); } });
    seats.sort(function (p, q) { return p.a - q.a; }); return seats;
  }
  function layoutClusters(groups, cy, width) {
    var DS = 40, pos = [], labels = [], widths = groups.map(function (g) { return g.cols * DS; });
    var gap = (width - widths.reduce(function (a, b) { return a + b; }, 0)) / (groups.length + 1), x = 960 + width / 2 - gap, idx = 0;
    groups.forEach(function (g, gi) { var right = x, rows = Math.ceil(g.n / g.cols); for (var k = 0; k < g.n; k++) { var c = k % g.cols, r = Math.floor(k / g.cols); pos[idx++] = { x: right - DS / 2 - c * DS, y: cy + DS / 2 + r * DS - rows * DS }; } labels.push({ x: right - widths[gi] / 2, y: cy + 26, g: g }); x = right - widths[gi] - gap; });
    return { pos: pos, labels: labels };
  }
  function buildDots(h, cfg) {
    var N = cfg.n, L = layoutClusters(cfg.groups, cfg.cy, cfg.width || 1640), H = cfg.hemi ? hemicycle(N, 960, cfg.hemi.cy, cfg.hemi.r0, cfg.hemi.r1, cfg.hemi.rows || 4) : null;
    var dots = []; for (var i = 0; i < N; i++) { var d = document.createElement('i'); d.className = 'dot'; h.appendChild(d); dots.push(d); }
    var labs = L.labels.map(function (l, gi) {
      var e = document.createElement('div'); e.className = 'clab';
      e.innerHTML = '<b class="num">0</b><span>' + esc(l.g.lab) + '</span>' + (l.g.sub ? '<small>' + esc(l.g.sub) + '</small>' : '');
      e.style.right = Math.round(1920 - l.x) + 'px'; e.style.top = Math.round(l.y) + 'px'; h.appendChild(e); return { el: e, b: e.firstChild, n: l.g.n, gi: gi, last: -1 };
    });
    return { dots: dots, H: H, E: L.pos, labs: labs, tm: { in: cfg.tIn * SPB, move: cfg.tMove * SPB, lab: cfg.tLab * SPB }, last: [] };
  }
  function renderDots(o, lt) {
    var tm = o.tm;
    for (var i = 0; i < o.dots.length; i++) {
      var f = eq(clamp((lt - tm.in - i * .012) / .4));              // appear in place (hemicycle) – fade + settle 12px
      var m = o.H ? eio(clamp((lt - tm.move - (i % 10) * .015) / .75)) : 1;
      var sx = o.H ? o.H[i].x : o.E[i].x, sy = o.H ? o.H[i].y : o.E[i].y;
      var x = Math.round(sx + (o.E[i].x - sx) * m), y = Math.round(sy + (o.E[i].y - sy) * m + (1 - f) * 12);
      var key = x * 10000 + y + f;
      if (o.last[i] === key) continue; o.last[i] = key;
      var st = o.dots[i].style; st.opacity = f >= 1 ? '' : f.toFixed(3); st.transform = 'translate3d(' + x + 'px,' + y + 'px,0)';
    }
    o.labs.forEach(function (l) {
      var p = clamp((lt - tm.lab - l.gi * .15) / .4), e = eo(p), v = Math.round(l.n * eo(clamp((lt - tm.lab - l.gi * .15) / .7)));
      l.el.style.opacity = p >= 1 ? '' : e.toFixed(3); l.el.style.transform = p >= 1 ? '' : 'translate3d(0,' + Math.round((1 - e) * 16) + 'px,0)';
      if (v !== l.last) { l.last = v; l.b.textContent = v; }
    });
  }

  // ---------- Hebrew line-break hygiene (textContent is left byte-identical): a word joined by a hyphen, maqaf or dash
  // (האלף-בית, הנדל–זליכה, הדתית–זהות) never breaks inside, and a spaced dash never starts a line (it is kept with the
  // word before it). Custom inline tags, so no scene CSS (e.g. '.lchip span') applies to them; inside a flex/grid
  // container the whole text run is wrapped once, so it stays a single item exactly like the original anonymous text.
  var JOINED = /[^\s]+(?:[-\u2010\u2011\u2013\u2014\u05be][^\s]+)+(?: [-\u2013\u2014](?=\s))?|[^\s]+ [-\u2013\u2014](?=\s)/g;
  function tidy(root) {
    var tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), nodes = [], n;
    while ((n = tw.nextNode())) if (!n.parentNode.closest('.w,x-nw,svg,.ltr')) nodes.push(n);
    nodes.forEach(function (t) {
      var d = t.data; JOINED.lastIndex = 0; if (!JOINED.test(d)) return;
      var box = /flex|grid/.test(getComputedStyle(t.parentNode).display) ? document.createElement('x-tx') : document.createDocumentFragment();
      var last = 0, m; JOINED.lastIndex = 0;
      while ((m = JOINED.exec(d))) { if (m.index > last) box.appendChild(document.createTextNode(d.slice(last, m.index))); var sp = document.createElement('x-nw'); sp.textContent = m[0]; box.appendChild(sp); last = m.index + m[0].length; }
      if (last < d.length) box.appendChild(document.createTextNode(d.slice(last)));
      t.parentNode.replaceChild(box, t);
    });
  }

  // ---------- run
  function run(cfg) {
    var app = document.getElementById('app'), stage = document.getElementById('stage'), host = document.getElementById('scenes');
    var LB = cfg.listBars;
    SC.filter(function (s) { return s.x.list; }).forEach(function (s) { if (s.bars !== LB || s.tr !== 'fade') throw new Error('unequal list treatment: ' + s.id); });
    var b0 = 0;
    SC.forEach(function (s) {
      s.b0 = b0; s.start = b0 * SPB; b0 += s.beats;
      var el = document.createElement('section'); el.className = 'scene ' + s.cls; el.setAttribute('aria-hidden', 'true');
      el.innerHTML = '<div class="inner">' + s.html + '</div>'; host.appendChild(el); tidy(el); s.el = el; s.inner = el.firstChild; s.lastX = null;
      s.anims = [].map.call(el.querySelectorAll('[data-in]'), function (n) {
        n.classList.add('a'); var t = n.getAttribute('data-a') || 'up'; if (CALM && t !== 'fade') t = 'fade';
        return { el: n, t0: +n.getAttribute('data-in'), d: +(n.getAttribute('data-d') || .45), out: n.hasAttribute('data-out') ? +n.getAttribute('data-out') : null, type: t, last: -1 };
      });
      s.counts = [].map.call(el.querySelectorAll('[data-count]'), function (n) { return { el: n, v: +n.getAttribute('data-count'), dec: +n.getAttribute('data-dec') || 0, t0: +n.getAttribute('data-cin'), d: +n.getAttribute('data-cd'), last: null }; });
      s.fills = [].map.call(el.querySelectorAll('[data-w]'), function (n) { return { el: n, w: +n.getAttribute('data-w'), t0: +n.getAttribute('data-win'), d: +(n.getAttribute('data-wd') || .8), last: -1 }; });
      s.prog = el.querySelector('[data-progress]');
      var dh = el.querySelector('[data-dots]'); if (dh && cfg.dots) s.dots = buildDots(dh, cfg.dots[dh.getAttribute('data-dots')]);
    });
    var BEATS = b0, DUR = BEATS * SPB;
    SC.forEach(function (s) { if (s.b0 % 2) throw new Error('scene ' + s.id + ' not on a strong beat'); });

    // ---------- score (one deterministic event list drives the live music and the offline WAV)
    function sec(id) { return SC.filter(function (s) { return s.id === id; })[0]; }
    var sections = cfg.sections(sec, SC, BEATS);
    var cuts = []; SC.forEach(function (s, i) { if (i) cuts.push({ b: s.b0, kind: s.x.list ? 'list' : 'scene' }); });
    var hits = [];
    SC.forEach(function (s) {
      s.counts.forEach(function (c) { var n = c.el.getAttribute('data-ping'); if (n) hits.push({ t: s.start + c.t0 + c.d * .55, n: +n, v: .9 }); });
      if (s.dots) s.dots.labs.forEach(function (l) { hits.push({ t: s.start + s.dots.tm.lab + l.gi * .15 + .3, n: [81, 84, 88, 86][l.gi % 4], v: .8 }); });
    });
    var EVENTS = AU.score({ beats: BEATS, sections: sections, cuts: cuts, hits: hits });
    window.CLIP = { duration: DUR, bpm: AU.BPM, bar: BAR, scenes: SC.map(function (s) { return { id: s.id, start: s.start, dur: s.dur, bars: s.bars, list: !!s.x.list }; }), events: EVENTS, sections: sections };

    // ---------- background: warm paper with three very soft, slowly drifting tints (no colour is mapped to anything)
    var bg = document.getElementById('bg').getContext('2d'), wv = document.getElementById('wave').getContext('2d');
    var TINTS = [[47, 79, 134, .075], [111, 143, 114, .085], [176, 138, 79, .07]];
    function drawBg(T) {
      bg.globalCompositeOperation = 'source-over'; bg.fillStyle = '#f5f3ee'; bg.fillRect(0, 0, 192, 108);
      var sp = CALM ? .4 : 2.2;
      for (var i = 0; i < TINTS.length; i++) {
        var c = TINTS[i], x = 96 + Math.sin(T * .021 * sp + i * 2.1) * 62, y = 54 + Math.cos(T * .017 * sp + i * 1.7) * 30, r = 70 + 10 * Math.sin(T * .013 + i);
        var g = bg.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + c[3] + ')'); g.addColorStop(1, 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',0)');
        bg.fillStyle = g; bg.fillRect(0, 0, 192, 108);
      }
    }
    var FREQ = null, WS = new Float32Array(64);
    function drawWave(T) { // a quiet "sound line" motif along the bottom (follows the music when it plays)
      wv.clearRect(0, 0, 1920, 120); wv.fillStyle = '#2f4f86';
      var N = 64, bw = 1920 / N, live = FREQ && music.live();
      if (live) music.analyser().getByteFrequencyData(FREQ);
      for (var i = 0; i < N; i++) {
        var u = Math.abs(i / (N - 1) - .5) * 2, envl = 1 - u * u * .8, target;
        if (live) target = FREQ[Math.floor(2 + Math.pow(u, 1.3) * 60)] / 255;
        else target = .25 + .18 * Math.sin(i * .45 + T * 1.3) * Math.sin(i * .17 - T * .7);
        WS[i] = live ? WS[i] * .8 + target * .2 : target;
        var h = Math.round(4 + WS[i] * 60 * envl);
        wv.globalAlpha = .10 + .10 * envl;
        wv.fillRect(Math.round(i * bw + bw * .3), 116 - h, Math.round(bw * .4), h);
      }
      wv.globalAlpha = 1;
    }

    // ---------- render
    var chapEl = document.getElementById('chap'), tl = document.getElementById('tline'), live = document.getElementById('live');
    var curScene = null, curChap = null;
    function sceneAt(T) { for (var i = 0; i < SC.length; i++) if (T < SC[i].start + SC[i].dur) return SC[i]; return SC[SC.length - 1]; }
    function applyAnim(n, lt) {
      var p = clamp((lt - n.t0) / n.d), out = n.out != null ? clamp((lt - n.out) / .5) : 0;
      var key = p + out * 2; if (key === n.last) return; n.last = key;
      var s = n.el.style, e = eq(p), op = 1, y = 0, clip = '';
      switch (n.type) {
        case 'fade': op = eo(p); break;
        case 'word': op = clamp(p * 1.6); y = Math.round((1 - e) * 14); break;
        case 'rise': op = clamp(p * 2); y = Math.round((1 - e) * 64); break;      // inside a .mask line
        case 'wipe': op = p > 0 ? 1 : 0; if (p < 1) clip = 'inset(-10px -10px -10px ' + ((1 - e) * 100).toFixed(2) + '%)'; break;
        case 'line': op = 1; if (p < 1) clip = 'inset(0 0 0 ' + ((1 - e) * 100).toFixed(2) + '%)'; break;
        default: op = eo(p); y = Math.round((1 - e) * 28);
      }
      if (out) op *= 1 - eo(out);
      s.opacity = op >= 1 ? '' : op.toFixed(3);
      s.transform = y ? 'translate3d(0,' + y + 'px,0)' : '';
      s.clipPath = clip;
    }
    function transition(s, lt) { // fast cut on the beat: fade in .22 s while the scene slides in 48 px (whole pixels), fade out over the last .16 s
      var pin = clamp(lt / .36), op = Math.min(eo(clamp(lt / .22)), s.x.last ? 1 : eo(clamp((s.dur - lt) / .16)));
      if (s.tr === 'none' && lt < .4) { op = 1; pin = 1; }
      s.el.style.opacity = op >= 1 ? '' : op.toFixed(3);
      var x = CALM ? 0 : Math.round((1 - eq(pin)) * 48);
      if (x !== s.lastX) { s.lastX = x; s.inner.style.transform = x ? 'translate3d(' + x + 'px,0,0)' : ''; }
    }
    function render(T) {
      var s = sceneAt(T), lt = T - s.start;
      if (s !== curScene) {
        if (curScene) { curScene.el.classList.remove('on'); curScene.el.setAttribute('aria-hidden', 'true'); }
        s.el.classList.add('on'); s.el.removeAttribute('aria-hidden'); curScene = s;
        s.anims.forEach(function (n) { n.last = -1; }); s.counts.forEach(function (c) { c.last = null; }); s.fills.forEach(function (f) { f.last = -1; }); if (s.dots) s.dots.last = []; if (s.dots) s.dots.labs.forEach(function (l) { l.last = -1; }); s.lastX = null;
        if (!REC) { var txt = s.el.textContent.replace(/\s+/g, ' ').trim(); live.textContent = ''; setTimeout(function () { live.textContent = txt.slice(0, 400); }, 50); }
      }
      transition(s, lt);
      s.anims.forEach(function (n) { applyAnim(n, lt); });
      s.counts.forEach(function (c) {
        var p = clamp((lt - c.t0) / c.d), v = (c.v * eo(p)).toFixed(c.dec);
        if (p >= 1) v = c.v.toFixed(c.dec);
        if (v !== c.last) { c.last = v; c.el.textContent = v; }
      });
      s.fills.forEach(function (f) { var p = eio(clamp((lt - f.t0) / f.d)); if (p !== f.last) { f.last = p; f.el.style.transform = p >= 1 && f.w === 1 ? '' : 'scaleX(' + (f.w * p).toFixed(4) + ')'; } });
      if (s.dots) renderDots(s.dots, lt);
      if (s.prog) s.prog.style.transform = 'scaleX(' + clamp(lt / s.dur).toFixed(4) + ')';
      if (s.chap !== curChap) { curChap = s.chap; chapEl.textContent = s.chap; }
      drawBg(T); drawWave(T);
      tl.style.transform = 'scaleX(' + (T / DUR).toFixed(4) + ')';
      updateUI(T);
    }

    // ---------- scaling (letterbox) – whole-pixel offsets so the stage never sits on a half pixel
    function fit() {
      var vw = window.innerWidth, vh = window.innerHeight, k = Math.min(vw / 1920, vh / 1080);
      stage.style.transform = 'translate3d(' + Math.round((vw - 1920 * k) / 2) + 'px,' + Math.round((vh - 1080 * k) / 2) + 'px,0) scale(' + k + ')';
      var rot = document.getElementById('rot'); if (rot) rot.style.top = Math.round(vh / 2 + 540 * k + 16) + 'px';
    }
    window.addEventListener('resize', fit); window.addEventListener('orientationchange', fit); fit();

    // ---------- clock (the audio clock is master while music plays)
    var T = Math.min(Math.max(0, parseFloat(Q.get('t')) || 0), DUR), playing = false, lastNow = 0;
    function frame(now) {
      if (playing) {
        if (music.live()) T = Math.min(DUR, Math.max(T, music.timeNow()));
        else { var dt = lastNow ? Math.min(.1, (now - lastNow) / 1000) : 0; T += dt; }
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
      var sc = Math.round(T); if (sc !== lastSec) { lastSec = sc; timeEl.textContent = fmtT(T) + ' / ' + fmtT(DUR); scrub.setAttribute('aria-valuenow', sc); scrub.setAttribute('aria-valuetext', fmtT(T) + ' מתוך ' + fmtT(DUR)); }
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
    if (CALM) app.classList.add('calm');
    var started = false;
    function go() {
      if (started) return; started = true;
      render(T); requestAnimationFrame(frame);
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
  }
  window.ClipKit = { scene: scene, run: run, A: A, B: B, words: words, count: count, esc: esc, IC: IC, SPB: SPB, BAR: BAR, CALM: CALM };
})();
