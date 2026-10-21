/* Clip soundtrack v3 – serious, warm "news-explainer" score, fully generated with the Web Audio API
   (no recorded or copyrighted audio): soft piano motif, warm string pad, round bass, light percussion pulse.
   90 BPM, A minor. A deterministic score is built from the clip timeline (sections in bars, scene cuts, number
   reveals), then scheduled live (ClipAudio.Live) or rendered offline (ClipAudio.renderOffline) for the MP4.
   Shared by /clip/ and /clip-site/. */
(function () {
  'use strict';
  var BPM = 90, SPB = 60 / BPM, BAR = 4 * SPB;
  var MG = .61;                         // master gain after the limiter (tuned for ~-16 LUFS integrated)
  // chords (bass root, voicing) – section-relative progressions so every list gets the identical musical bed
  var CH = {
    Am: { r: 45, v: [57, 60, 64, 69] }, F: { r: 41, v: [53, 57, 60, 65] }, C: { r: 48, v: [55, 60, 64, 67] },
    G: { r: 43, v: [55, 59, 62, 67] }, Dm: { r: 38, v: [53, 57, 62, 65] }, E: { r: 40, v: [56, 59, 64, 68] }
  };
  var PROG4 = ['Am', 'F', 'C', 'G'], PROG3 = ['Am', 'F', 'G'], PROG2 = ['Am', 'F'];
  // piano motif per chord: [beat, midi, beats]
  var MOTIF = {
    Am: [[0, 76, 1.5], [1.5, 72, .5], [2, 74, 1], [3, 76, 1]], F: [[0, 77, 1.5], [1.5, 76, .5], [2, 74, 1], [3, 72, 1]],
    C: [[0, 72, 1.5], [1.5, 74, .5], [2, 76, 1], [3, 79, 1]], G: [[0, 79, 1.5], [1.5, 77, .5], [2, 76, 1], [3, 74, 1]],
    Gend: [[0, 74, 3], [3, 71, 1]], Am_end: [[0, 76, 4]]
  };
  var ARP = [0, 2, 1, 2, 3, 2, 1, 2];   // chord-tone order for the 8th-note piano figure
  var LVL = { intro: .8, a: .86, b: .93, build: .9, peak: 1.16, list: .94, reflect: .78, outro: .9, tail: .9 };
  function hz(m) { return 440 * Math.pow(2, (m - 69) / 12); }

  // ---------- score. cfg: {beats, sections:[{b0,b1,mode,prog?}], cuts:[{b,kind}], hits:[{t,kind,v}]}
  function score(cfg) {
    var ev = [], end = cfg.beats;
    function add(t, k, p) { ev.push({ t: t, k: k, p: p || {} }); }
    cfg.sections.forEach(function (s) {
      var prog = s.prog || ((s.b1 - s.b0) % 16 === 12 || (s.b1 - s.b0) === 12 ? PROG3 : PROG4), m = s.mode;
      for (var b = s.b0; b < s.b1; b += 4) {
        var t = b * SPB, rb = (b - s.b0) / 4, nb = Math.round((s.b1 - s.b0) / 4), ci = prog[rb % prog.length], ch = CH[ci], last = rb === nb - 1;
        var lastOfList = m === 'list' && rb % prog.length === prog.length - 1;
        add(t, 'lvl', { g: m === 'build' ? LVL.build + .14 * rb / Math.max(1, nb - 1) : LVL[m] });
        // string pad: every bar (warm bed); brighter in build/peak
        if (m !== 'tail') add(t, 'pad', { n: ch.v, d: BAR, v: m === 'reflect' || m === 'intro' ? .8 : 1, cut: m === 'peak' ? 3200 : m === 'build' ? 1100 + 1300 * rb / Math.max(1, nb - 1) : m === 'intro' ? 1200 : 2100 });
        // bass
        if (m !== 'intro' && m !== 'tail') {
          if (m === 'reflect' || m === 'a' || m === 'outro') add(t, 'bass', { n: ch.r, d: BAR * .96, v: .9 });
          else for (var h = 0; h < 4; h += (m === 'peak' ? 1 : 2)) add(t + h * SPB, 'bass', { n: ch.r + (m === 'peak' && h % 2 ? 12 : 0), d: SPB * (m === 'peak' ? .9 : 1.9), v: m === 'peak' ? .85 : 1 });
        }
        // piano: 8th-note figure (soft) + motif in the melodic sections
        var fig = m === 'a' || m === 'b' || m === 'build' || m === 'peak' || m === 'list' || m === 'outro';
        if (fig) for (var e = 0; e < 8; e++) {
          if (m === 'outro' && last && e > 1) break;
          add(t + e * SPB / 2, 'piano', { n: ch.v[ARP[e]] + (m === 'peak' ? 12 : 0), v: (e % 2 ? .32 : .45) * (m === 'build' ? .8 + .3 * rb / Math.max(1, nb - 1) : 1), d: 1.1 });
        }
        var mel = m === 'intro' || m === 'peak' || m === 'list' || m === 'outro' || (m === 'reflect' && rb % 2 === 0);
        if (mel) {
          var mo = m === 'list' && lastOfList ? MOTIF.Gend : m === 'outro' && last ? MOTIF.Am_end : MOTIF[ci] || MOTIF.Am;
          if (m === 'intro' && rb === 0) mo = [[1, 76, 1], [2, 74, 1], [3, 72, 1]];
          mo.forEach(function (x) { add(t + x[0] * SPB, 'piano', { n: x[1], v: m === 'reflect' ? .55 : .8, d: Math.max(1.2, x[2] * SPB * 1.6), mel: 1 }); });
        }
        // light percussion pulse
        if (m === 'b' || m === 'build' || m === 'peak' || m === 'list' || (m === 'outro' && !last)) {
          var kv = m === 'peak' ? 1 : m === 'outro' ? .6 : .8;
          var dropLastBeat = m === 'build' && last;
          add(t, 'kick', { v: kv }); if (!dropLastBeat) add(t + 2 * SPB, 'kick', { v: kv * .85 });
          if (m === 'peak') add(t + 2.5 * SPB, 'kick', { v: .55 });
          if (m === 'peak' || m === 'list' || m === 'build') { add(t + SPB, 'rim', { v: m === 'peak' ? 1 : .7 }); if (!dropLastBeat) add(t + 3 * SPB, 'rim', { v: m === 'peak' ? 1 : .7 }); }
          var step = m === 'build' && rb >= nb - 2 ? 4 : 2;
          for (var q = 0; q < 4 * step; q++) { if (dropLastBeat && q >= 3 * step) break; add(t + q * SPB / step, 'shaker', { v: (q % step === step / 2 ? .9 : .5) * (m === 'peak' ? 1 : .8) }); }
        } else if (m === 'a') for (var q2 = 0; q2 < 8; q2++) add(t + q2 * SPB / 2, 'shaker', { v: q2 % 2 ? .45 : .25 });
        // gentle swell into the key finding (last bar of the build) and into the outro
        if (m === 'build' && last) add(t, 'swell', { d: BAR, v: 1 });
        if (m === 'peak' && rb === 0) add(t, 'cym', { v: .8 });
      }
    });
    // scene cuts: a soft low piano octave on the downbeat + a light air swell into it (identical for every list)
    cfg.cuts.forEach(function (c) {
      var t = c.b * SPB, s = cfg.sections.filter(function (x) { return c.b >= x.b0 && c.b < x.b1; })[0], ci = 'Am';
      if (s) { var pr = s.prog || PROG4; ci = pr[Math.round((c.b - s.b0) / 4) % pr.length] || 'Am'; }
      add(t, 'dong', { n: CH[ci].r + 12, v: c.kind === 'list' ? .7 : 1 });
      add(t - .9, 'air', { d: .9, v: c.kind === 'list' ? .6 : 1 });
    });
    cfg.hits.forEach(function (h) { add(h.t, 'ping', { v: h.v || 1, n: h.n || 81 }); });
    add(end * SPB - 1.4, 'fade', { tc: .4 });
    ev.sort(function (a, b) { return a.t - b.t || (a.k < b.k ? -1 : 1); });
    return ev;
  }

  // ---------- deterministic noise + impulse
  function rng(seed) { var s = seed >>> 0; return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  function noiseBuf(ctx) { var r = rng(7), n = ctx.sampleRate * 2, b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0); for (var i = 0; i < n; i++) d[i] = r() * 2 - 1; return b; }
  function shortNoise(ctx, seed) { var r = rng(seed), n = Math.floor(ctx.sampleRate * .15), b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0); for (var i = 0; i < n; i++) d[i] = r() * 2 - 1; return b; }
  function impulse(ctx) { var r = rng(11), sec = 3.2, n = Math.floor(ctx.sampleRate * sec), b = ctx.createBuffer(2, n, ctx.sampleRate); for (var c = 0; c < 2; c++) { var d = b.getChannelData(c); for (var i = 0; i < n; i++) d[i] = (r() * 2 - 1) * Math.pow(1 - i / n, 4) * (i < 400 ? i / 400 : 1); } return b; }

  // ---------- mixing graph: instruments -> gentle glue compressor -> limiter -> master; reverb + soft delay sends
  function graph(ctx, dest) {
    var G = { ctx: ctx, noise: noiseBuf(ctx), shk: [1, 2, 3, 4].map(function (k) { return shortNoise(ctx, 20 + k); }) };
    var comp = ctx.createDynamicsCompressor(); comp.threshold.value = -20; comp.knee.value = 12; comp.ratio.value = 2.2; comp.attack.value = .02; comp.release.value = .3;
    var lim = ctx.createDynamicsCompressor(); lim.threshold.value = -5; lim.knee.value = 0; lim.ratio.value = 20; lim.attack.value = .002; lim.release.value = .12;
    var hs = ctx.createBiquadFilter(); hs.type = 'highshelf'; hs.frequency.value = 6000; hs.gain.value = -1;   // keep the top end soft
    var out = ctx.createGain(); out.gain.value = MG; comp.connect(hs); hs.connect(lim); lim.connect(out); out.connect(dest);
    var rev = ctx.createConvolver(); rev.buffer = impulse(ctx); var revG = ctx.createGain(); revG.gain.value = .5; rev.connect(revG); revG.connect(comp);
    var del = ctx.createDelay(1.5); del.delayTime.value = SPB * .75; var fb = ctx.createGain(); fb.gain.value = .25; var dlp = ctx.createBiquadFilter(); dlp.type = 'lowpass'; dlp.frequency.value = 2400;
    del.connect(dlp); dlp.connect(fb); fb.connect(del); var delG = ctx.createGain(); delG.gain.value = .22; dlp.connect(delG); delG.connect(comp);
    G.comp = comp; G.out = out; G.rev = rev; G.del = del;
    return G;
  }
  function bus(G) { // one "session" (live: recreated on every seek so stale notes can be silenced)
    var ctx = G.ctx, s = ctx.createGain(); s.connect(G.comp);
    var rv = ctx.createGain(); rv.connect(G.rev); var dl = ctx.createGain(); dl.connect(G.del);
    return { s: s, rv: rv, dl: dl };
  }
  function env(g, t, a, peak, d) { g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.setTargetAtTime(0, t + a + .0007, d / 4); }
  function noiseSrc(G, t, dur) { var n = G.ctx.createBufferSource(); n.buffer = G.noise; n.loop = true; n.start(t, (t * 7.31) % 1.5); n.stop(t + dur + .05); return n; }
  function osc(c, type, f, t, stop, det) { var o = c.createOscillator(); o.type = type; o.frequency.value = f; if (det) o.detune.value = det; o.start(t); o.stop(stop); return o; }
  var V = {
    lvl: function (G, B, t, p) { G.out.gain.setTargetAtTime(MG * p.g, t, .5); },
    fade: function (G, B, t, p) { G.out.gain.setTargetAtTime(0, t, p.tc); },
    piano: function (G, B, t, p) { // 3 partials, hammer-like attack, long natural decay, gentle lowpass
      var c = G.ctx, f = hz(p.n), lp = c.createBiquadFilter(), g = c.createGain(), d = p.d || 1.2, stop = t + d + 2.1;
      lp.type = 'lowpass'; lp.frequency.setValueAtTime(Math.min(7000, f * 9), t); lp.frequency.setTargetAtTime(Math.min(4200, f * 5), t, .25);
      var amp = (p.mel ? .16 : .1) * p.v;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(amp, t + .006); g.gain.setTargetAtTime(amp * .35, t + .006 + .0007, .28); g.gain.setTargetAtTime(0, t + d + .0007, .3);
      [[1, 1, 0], [2, .36, 3], [3, .14, -4], [4.01, .07, 0], [5.02, .03, 2]].forEach(function (x) { var o = osc(c, 'sine', f * x[0], t, stop, x[2]), og = c.createGain(); og.gain.value = x[1]; o.connect(og); og.connect(lp); });
      lp.connect(g); g.connect(B.s); g.connect(B.rv); if (p.mel) g.connect(B.dl);
    },
    pad: function (G, B, t, p) { // warm string ensemble: detuned saws, slow attack, lowpass
      var c = G.ctx, lp = c.createBiquadFilter(), g = c.createGain(), d = p.d, stop = t + d + 1.4;
      lp.type = 'lowpass'; lp.Q.value = .5; lp.frequency.setValueAtTime(p.cut * .7, t); lp.frequency.linearRampToValueAtTime(p.cut, t + d * .6);
      var a = .022 * p.v;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(a, t + .7); g.gain.setValueAtTime(a, t + d - .1); g.gain.linearRampToValueAtTime(0, t + d + 1.2);
      p.n.forEach(function (m, i) { [-7, 0, 7].forEach(function (dt) { var o = osc(c, 'sawtooth', hz(m), t, stop, dt + (i - 1.5) * 1.3); o.connect(lp); }); });
      lp.connect(g); g.connect(B.s); g.connect(B.rv);
    },
    bass: function (G, B, t, p) {
      var c = G.ctx, f = hz(p.n), lp = c.createBiquadFilter(), g = c.createGain(), stop = t + p.d + .4;
      lp.type = 'lowpass'; lp.frequency.value = 520; lp.Q.value = .7;
      var a = .13 * p.v; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(a, t + .015); g.gain.setTargetAtTime(a * .7, t + .015 + .0007, .3); g.gain.setTargetAtTime(0, t + p.d * .92 + .0007, .06);
      osc(c, 'sine', f, t, stop).connect(lp); var tri = osc(c, 'triangle', f * 2, t, stop), tg = c.createGain(); tg.gain.value = .25; tri.connect(tg); tg.connect(lp);
      lp.connect(g); g.connect(B.s);
    },
    kick: function (G, B, t, p) { // soft, round "heartbeat" kick
      var c = G.ctx, o = osc(c, 'sine', 120, t, t + .5), g = c.createGain();
      o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(48, t + .14);
      env(g, t, .004, .42 * p.v, .3); o.connect(g); g.connect(B.s);
    },
    rim: function (G, B, t, p) { // soft brushed snare/rim on 2 & 4
      var c = G.ctx, n = noiseSrc(G, t, .3), bp = c.createBiquadFilter(), g = c.createGain(); bp.type = 'bandpass'; bp.frequency.value = 2200; bp.Q.value = .8;
      env(g, t, .003, .12 * p.v, .16); n.connect(bp); bp.connect(g); g.connect(B.s); g.connect(B.rv);
    },
    shaker: function (G, B, t, p) {
      var c = G.ctx, n = c.createBufferSource(), hp = c.createBiquadFilter(), g = c.createGain(); hp.type = 'bandpass'; hp.frequency.value = 7000; hp.Q.value = 1.2;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.075 * p.v, t + .012); g.gain.linearRampToValueAtTime(.02 * p.v, t + .04); g.gain.linearRampToValueAtTime(0, t + .11);
      n.buffer = G.shk[Math.round(t * 3) % 4]; n.start(t); n.stop(t + .13);
      n.connect(hp); hp.connect(g); g.connect(B.s);
    },
    cym: function (G, B, t, p) { // soft cymbal bloom
      var c = G.ctx, n = noiseSrc(G, t, 4.4), hp = c.createBiquadFilter(), g = c.createGain(); hp.type = 'highpass'; hp.frequency.value = 4500;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.05 * p.v, t + .03); g.gain.setTargetAtTime(0, t + .03 + .0007, .7);
      n.connect(hp); hp.connect(g); g.connect(B.s); g.connect(B.rv);
    },
    swell: function (G, B, t, p) { // reverse-cymbal style swell (lowpassed noise, slow rise)
      var c = G.ctx, n = noiseSrc(G, t, p.d), lp = c.createBiquadFilter(), g = c.createGain(); lp.type = 'lowpass';
      lp.frequency.setValueAtTime(600, t); lp.frequency.exponentialRampToValueAtTime(6000, t + p.d);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.06 * p.v, t + p.d * .98); g.gain.linearRampToValueAtTime(0, t + p.d + .03);
      n.connect(lp); lp.connect(g); g.connect(B.s); g.connect(B.rv);
    },
    air: function (G, B, t, p) { // very light breath into a cut
      var c = G.ctx, n = noiseSrc(G, t, p.d + .2), bp = c.createBiquadFilter(), g = c.createGain(); bp.type = 'bandpass'; bp.Q.value = .7;
      bp.frequency.setValueAtTime(500, t); bp.frequency.exponentialRampToValueAtTime(2200, t + p.d);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.02 * p.v, t + p.d); g.gain.setTargetAtTime(0, t + p.d + .0007, .06);
      n.connect(bp); bp.connect(g); g.connect(B.s); g.connect(B.rv);
    },
    dong: function (G, B, t, p) { // low piano octave on a scene downbeat
      V.piano(G, B, t, { n: p.n, v: .9 * p.v, d: 2.4 }); V.piano(G, B, t, { n: p.n - 12, v: .7 * p.v, d: 2.4 });
    },
    ping: function (G, B, t, p) { // glockenspiel-like ping on number reveals
      var c = G.ctx, f = hz(p.n), g = c.createGain(), stop = t + 1.6;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.05 * p.v, t + .004); g.gain.setTargetAtTime(0, t + .004 + .0007, .3);
      [[1, 1], [2.76, .25], [5.4, .08]].forEach(function (x) { var o = osc(c, 'sine', f * x[0], t, stop), og = c.createGain(); og.gain.value = x[1]; o.connect(og); og.connect(g); });
      g.connect(B.s); g.connect(B.rv); g.connect(B.dl);
    }
  };
  function play(G, B, e, at) { var f = V[e.k], sr = G.ctx.sampleRate; if (f) f(G, B, Math.round(at * sr) / sr, e.p); } // sample-aligned start times (avoids sub-sample start artefacts)

  // ---------- offline render (for the MP4) and WAV encoding
  // rendered in 12 s chunks (6 s pre-roll so tails, reverb, delay and compressor are warmed up) and stitched
  // sample-exactly: a bounded graph per chunk keeps rendering fast; the score is deterministic so seams are inaudible.
  function renderOffline(events, dur, sr) {
    sr = sr || 44100;
    var OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext, CHK = 12, PRE = 6, total = Math.ceil(sr * dur);
    var outBuf = new OAC(2, total, sr).createBuffer(2, total, sr), jobs = [];
    for (var c0 = 0; c0 < dur; c0 += CHK) (function (c0) {
      var s0 = Math.max(0, c0 - PRE), len = Math.min(dur, c0 + CHK) - s0, ctx = new OAC(2, Math.ceil(sr * len), sr), G = graph(ctx, ctx.destination), Bu = bus(G);
      var g0 = levelAt(events, s0); G.out.gain.value = MG * g0;
      events.forEach(function (e) { if (e.t >= s0 && e.t < s0 + len) play(G, Bu, e, e.t - s0); });
      jobs.push(ctx.startRendering().then(function (buf) {
        var from = Math.round((c0 - s0) * sr), at = Math.round(c0 * sr), n = Math.min(buf.length - from, total - at);
        for (var ch = 0; ch < 2; ch++) outBuf.getChannelData(ch).set(buf.getChannelData(ch).subarray(from, from + n), at);
      }));
    })(c0);
    return jobs.reduce(function (p, j) { return p.then(function () { return j; }); }, Promise.resolve()).then(function () {
      // final 30 ms ramp to exact silence (no click at the very end)
      var n = Math.round(sr * .03); for (var ch = 0; ch < 2; ch++) { var d = outBuf.getChannelData(ch); for (var i = 0; i < n; i++) d[total - n + i] *= 1 - i / n; }
      return outBuf;
    });
  }
  function levelAt(events, t) { var g = 1; for (var j = 0; j < events.length && events[j].t <= t; j++) if (events[j].k === 'lvl') g = events[j].p.g; return g; }
  function wav(buf) {
    var ch = buf.numberOfChannels, n = buf.length, out = new DataView(new ArrayBuffer(44 + n * ch * 2)), o = 0;
    function s(str) { for (var i = 0; i < str.length; i++) out.setUint8(o++, str.charCodeAt(i)); }
    function u32(v) { out.setUint32(o, v, true); o += 4; } function u16(v) { out.setUint16(o, v, true); o += 2; }
    s('RIFF'); u32(36 + n * ch * 2); s('WAVE'); s('fmt '); u32(16); u16(1); u16(ch); u32(buf.sampleRate); u32(buf.sampleRate * ch * 2); u16(ch * 2); u16(16); s('data'); u32(n * ch * 2);
    var data = []; for (var c = 0; c < ch; c++) data.push(buf.getChannelData(c));
    for (var i = 0; i < n; i++) for (c = 0; c < ch; c++) { var v = Math.max(-1, Math.min(1, data[c][i])); out.setInt16(o, v < 0 ? v * 0x8000 : v * 0x7fff, true); o += 2; }
    return out.buffer;
  }

  // ---------- live engine: follows the timeline clock (play / pause / seek)
  function Live(events) {
    var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
    var ctx = new AC({ latencyHint: 'interactive' }), an = ctx.createAnalyser(); an.fftSize = 256; an.smoothingTimeConstant = .85;
    var mg = ctx.createGain(); mg.connect(an); an.connect(ctx.destination);
    var G = graph(ctx, mg), B = null, idx = 0, anchorCtx = 0, anchorT = 0, running = false, timer = 0, busT = 0;
    function find(t) { var lo = 0, hi = events.length; while (lo < hi) { var m = (lo + hi) >> 1; if (events[m].t < t) lo = m + 1; else hi = m; } return lo; }
    function tick() {
      if (!running) return;
      var nowT = anchorT + (ctx.currentTime - anchorCtx), horizon = nowT + .3;
      // rotate the session bus every 16 s; the old one is disconnected once its tails have rung out (keeps the graph small)
      if (nowT - busT > 16) { var old = B; B = bus(G); busT = nowT; setTimeout(function () { try { old.s.disconnect(); old.rv.disconnect(); old.dl.disconnect(); } catch (e) {} }, 7000); }
      while (idx < events.length && events[idx].t < horizon) { var e = events[idx++]; var at = anchorCtx + (e.t - anchorT); if (at >= ctx.currentTime - .01) play(G, B, e, Math.max(at, ctx.currentTime)); }
    }
    function kill() { if (B) { var old = B; old.s.gain.setTargetAtTime(0, ctx.currentTime, .05); old.rv.gain.setTargetAtTime(0, ctx.currentTime, .05); setTimeout(function () { try { old.s.disconnect(); old.rv.disconnect(); old.dl.disconnect(); } catch (e) {} }, 500); B = null; } }
    return {
      ctx: ctx, analyser: an,
      start: function (T) { // (re)start from timeline position T
        kill(); if (ctx.state === 'suspended') ctx.resume();
        B = bus(G); busT = T; anchorCtx = ctx.currentTime + .05; anchorT = T; idx = find(T - .02);
        G.out.gain.cancelScheduledValues(ctx.currentTime); G.out.gain.setValueAtTime(MG * levelAt(events, T), ctx.currentTime);
        running = true; clearInterval(timer); timer = setInterval(tick, 40); tick();
      },
      stop: function () { running = false; clearInterval(timer); kill(); },
      timeNow: function () { return anchorT + (ctx.currentTime - anchorCtx); },
      resume: function () { return ctx.resume(); }
    };
  }
  window.ClipAudio = { BPM: BPM, SPB: SPB, BAR: BAR, score: score, renderOffline: renderOffline, wav: wav, Live: Live, PROG3: PROG3, PROG4: PROG4, PROG2: PROG2 };
})();
