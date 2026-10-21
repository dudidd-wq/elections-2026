/* Clip soundtrack – fully generated with the Web Audio API (no recorded or copyrighted audio).
   A deterministic score is built from the clip timeline (sections, scene cuts, number reveals), then either
   scheduled live (window.ClipAudio.Live) or rendered offline (ClipAudio.renderOffline) for the MP4. 120 BPM, A minor. */
(function () {
  'use strict';
  var BPM = 120, SPB = 60 / BPM, MG = .7; // MG: master gain after the limiter (leaves >= 1 dB true-peak headroom after AAC encoding)
  // A minor: Am – F – C – G (one bar each)
  var PROG = [{ r: 45, t: [57, 60, 64, 69] }, { r: 41, t: [53, 57, 60, 65] }, { r: 48, t: [55, 60, 64, 67] }, { r: 43, t: [55, 59, 62, 67] }];
  var LEAD = [0, 2, 1, 3, 2, 1, 0, 1]; // chord-tone indices, 8ths
  var LVL = { intro: 1, g1: .62, g2: .76, g2arp: .82, drop: 1.13, lists: .9, breakdown: .6, outro: 1, tail: 1 };
  function hz(m) { return 440 * Math.pow(2, (m - 69) / 12); }

  // ---------- score: sections [{b0,b1,mode}], cuts [{b,kind}], hits [{t,kind}] -> sorted events {t,k,p}
  function score(cfg) {
    var ev = [], end = cfg.beats;
    function add(t, k, p) { ev.push({ t: t, k: k, p: p || {} }); }
    function modeAt(b) { for (var i = 0; i < cfg.sections.length; i++) { var s = cfg.sections[i]; if (b >= s.b0 && b < s.b1) return s; } return null; }
    for (var q = 0; q < end * 4; q++) {            // 16th-note grid
      var b = q / 4, t = b * SPB, s = modeAt(b); if (!s) continue;
      var m = s.mode, sixteenth = q % 4, beatInBar = Math.floor(b) % 4, bar = Math.floor(b / 4), ch = PROG[bar % 4];
      var rel = b - s.b0, len = s.b1 - s.b0;
      var drums = m !== 'intro' && m !== 'tail', full = m === 'drop' || m === 'lists' || m === 'g2' || m === 'g2arp' || m === 'build' || m === 'outro';
      // kick: four on the floor (breakdown: bar downbeats only; build: drops out in the last beat)
      if (sixteenth === 0) {
        if (m === 'breakdown') { if (beatInBar === 0) add(t, 'kick', { v: .7 }); }
        else if (drums && !(m === 'build' && rel >= len - 1)) add(t, 'kick', { v: m === 'drop' ? 1.2 : m === 'g1' ? .85 : 1 });
      }
      // clap on 2 & 4
      if (sixteenth === 0 && (beatInBar === 1 || beatInBar === 3) && full && m !== 'build') add(t, 'clap', { v: m === 'drop' ? 1 : .85 });
      // snare roll in the build: 8ths, then 16ths, rising
      if (m === 'build' && rel < len - 1) { var dens = rel < len - 5 ? 2 : 1; if (q % dens === 0) add(t, 'clap', { v: .35 + .6 * rel / len, roll: 1 }); }
      // hats
      if (drums && m !== 'breakdown') {
        if (sixteenth === 2) add(t, 'hat', { open: 1, v: .8 });
        else if (full && m !== 'build') add(t, 'hat', { v: sixteenth === 0 ? .35 : .55 });
      } else if (m === 'breakdown' && sixteenth === 2) add(t, 'hat', { v: .3 });
      // bass: driving 8ths (offbeat octave), long notes in the breakdown
      if (m !== 'intro' && m !== 'tail') {
        if (m === 'breakdown') { if (q % 16 === 0) add(t, 'bass', { n: ch.r, d: SPB * 3.6, cut: 500, v: .55 }); }
        else if (sixteenth % 2 === 0 && !(m === 'build' && rel >= len - 1)) add(t, 'bass', { n: ch.r + (sixteenth === 2 ? 12 : 0), d: SPB * .45, cut: m === 'build' ? 300 + 2600 * rel / len : (m === 'drop' ? 1500 : 900), v: m === 'drop' ? 1.35 : m === 'g1' ? .7 : .85 });
      }
      // pad: every bar (sidechained)
      if (q % 16 === 0 && m !== 'tail') add(t, 'pad', { n: ch.t, d: SPB * 4, v: m === 'breakdown' || m === 'intro' ? 1 : .7 });
      // arp 16ths
      if ((m === 'g2arp' || m === 'drop' || m === 'lists' || m === 'outro' || m === 'build') ) add(t, 'arp', { n: ch.t[(q * 3 + (q >> 2)) % 4] + 12, v: m === 'drop' ? 1 : .7 });
      // lead on the drop: 8ths melody
      if (m === 'drop' && sixteenth % 2 === 0) add(t, 'lead', { n: ch.t[LEAD[(q / 2) % 8]] + 12, d: SPB * .48 });
      if ((m === 'lists' || m === 'outro') && sixteenth % 2 === 0 && bar % 4 >= 2) add(t, 'lead', { n: ch.t[LEAD[(q / 2) % 8]] + 12, d: SPB * .4, v: .55 });
      // shaker 16ths for top-end drive in the full sections
      if ((m === 'drop' || m === 'lists' || m === 'outro' || m === 'g2arp') && sixteenth % 2 === 1) add(t, 'shk', { v: m === 'drop' ? 1 : .8 });
      // master level per bar: dynamics across the piece (quiet intro groove -> rising build -> loud drop -> lists -> soft breakdown -> outro)
      if (q % 16 === 0) add(t, 'lvl', { g: m === 'build' ? .8 + .3 * rel / len : (LVL[m] || 1) });
      // crash on the first downbeat of drop / lists / outro sections
      if (q % 16 === 0 && (rel === 0 || (m === 'drop' && rel % 16 === 0)) && (m === 'drop' || m === 'outro' || m === 'g1')) add(t, 'crash', { v: m === 'drop' ? 1.3 : 1 });
    }
    // build riser + intro riser + breakdown riser
    cfg.sections.forEach(function (s) {
      if (s.mode === 'build') add(s.b0 * SPB, 'riser', { d: (s.b1 - s.b0) * SPB, v: 1 });
      if (s.mode === 'intro') add(s.b0 * SPB, 'riser', { d: (s.b1 - s.b0) * SPB, v: .9 });
      if (s.mode === 'breakdown') add((s.b1 - 4) * SPB, 'riser', { d: 4 * SPB, v: .7 });
    });
    // transitions: whoosh into every cut + impact on it (list cuts: identical lighter version for every list)
    cfg.cuts.forEach(function (c) {
      var t = c.b * SPB;
      if (c.kind === 'list') { add(t - .42, 'whoosh', { d: .42, v: .55 }); add(t, 'impact', { v: .45 }); add(t, 'crash', { v: .7 }); }
      else { add(t - .5, 'whoosh', { d: .5, v: .9 }); add(t, 'impact', { v: c.kind === 'drop' ? 1.25 : .9 }); }
    });
    cfg.hits.forEach(function (h) { add(h.t, h.kind, { v: h.v || 1, n: h.n }); });
    add(end * SPB - SPB * 2, 'impact', { v: 1.3, big: 1 });
    add(end * SPB - .7, 'fade', { tc: .16 });   // master fade so the last sample lands on silence (no click at the end)
    ev.sort(function (a, b) { return a.t - b.t; });
    return ev;
  }

  // ---------- deterministic noise + impulse
  function rng(seed) { var s = seed >>> 0; return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  function noiseBuf(ctx) { var r = rng(7), n = ctx.sampleRate * 2, b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0); for (var i = 0; i < n; i++) d[i] = r() * 2 - 1; return b; }
  function impulse(ctx) { var r = rng(11), sec = 2.6, n = Math.floor(ctx.sampleRate * sec), b = ctx.createBuffer(2, n, ctx.sampleRate); for (var c = 0; c < 2; c++) { var d = b.getChannelData(c); for (var i = 0; i < n; i++) d[i] = (r() * 2 - 1) * Math.pow(1 - i / n, 3.2); } return b; }

  // ---------- mixing graph: drums + music (sidechained) -> master compressor; sends to reverb and dotted-8th delay
  function graph(ctx, dest) {
    var G = { ctx: ctx, noise: noiseBuf(ctx) };
    var comp = ctx.createDynamicsCompressor(); comp.threshold.value = -16; comp.knee.value = 10; comp.ratio.value = 3; comp.attack.value = .006; comp.release.value = .2;
    var lim = ctx.createDynamicsCompressor(); lim.threshold.value = -4; lim.knee.value = 0; lim.ratio.value = 20; lim.attack.value = .001; lim.release.value = .08;
    var out = ctx.createGain(); out.gain.value = MG; comp.connect(lim); lim.connect(out); out.connect(dest);
    var rev = ctx.createConvolver(); rev.buffer = impulse(ctx); var revG = ctx.createGain(); revG.gain.value = .32; rev.connect(revG); revG.connect(comp);
    var del = ctx.createDelay(1); del.delayTime.value = SPB * .75; var fb = ctx.createGain(); fb.gain.value = .34; var dlp = ctx.createBiquadFilter(); dlp.type = 'lowpass'; dlp.frequency.value = 3200;
    del.connect(dlp); dlp.connect(fb); fb.connect(del); var delG = ctx.createGain(); delG.gain.value = .3; dlp.connect(delG); delG.connect(comp);
    G.comp = comp; G.out = out; G.rev = rev; G.del = del;
    return G;
  }
  function bus(G) { // one "session" (live: recreated on every seek so stale notes can be silenced)
    var ctx = G.ctx, s = ctx.createGain(); s.connect(G.comp);
    var drums = ctx.createGain(); drums.gain.value = .95; drums.connect(s);
    var mus = ctx.createGain(); mus.connect(s);
    // sidechain: one duck node per bar keeps every AudioParam timeline short (long timelines get slow)
    var ducks = {}; function duckAt(t) { var k = Math.floor(t / (SPB * 4) + 1e-6); if (!ducks[k]) { var g = ctx.createGain(); g.connect(mus); ducks[k] = g; delete ducks[k - 3]; } return ducks[k]; }
    var rv = ctx.createGain(); rv.connect(G.rev); var dl = ctx.createGain(); dl.connect(G.del);
    var sr = ctx.createGain(); sr.connect(s); sr.connect(rv); // fx bus
    return { s: s, drums: drums, duckAt: duckAt, rv: rv, dl: dl, fx: sr };
  }
  function env(g, t, a, peak, d, floor) { g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(floor || 0.0001, t + a + d); }
  function noiseSrc(G, t, dur) { var n = G.ctx.createBufferSource(); n.buffer = G.noise; n.loop = true; n.start(t, (t * 7.31) % 1.5); n.stop(t + dur + .05); return n; }
  var V = {
    lvl: function (G, B, t, p) { G.out.gain.setTargetAtTime(MG * p.g, t, .12); },
    fade: function (G, B, t, p) { G.out.gain.setTargetAtTime(0, t, p.tc); },
    shk: function (G, B, t, p) {
      var c = G.ctx, n = noiseSrc(G, t, .08), hp = c.createBiquadFilter(), g = c.createGain(); hp.type = 'highpass'; hp.frequency.value = 6500;
      env(g, t, .004, .16 * p.v, .05); n.connect(hp); hp.connect(g); g.connect(B.drums);
    },
    kick: function (G, B, t, p) {
      var c = G.ctx, o = c.createOscillator(), g = c.createGain(); o.type = 'sine';
      o.frequency.setValueAtTime(170, t); o.frequency.exponentialRampToValueAtTime(46, t + .12);
      env(g, t, .002, 1.35 * p.v, .42); o.connect(g); g.connect(B.drums); o.start(t); o.stop(t + .5);
      var n = noiseSrc(G, t, .02), hp = c.createBiquadFilter(), ng = c.createGain(); hp.type = 'highpass'; hp.frequency.value = 3000; env(ng, t, .001, .35 * p.v, .015); n.connect(hp); hp.connect(ng); ng.connect(B.drums);
      // sidechain pump on the music bus
      var dk = B.duckAt(t).gain; dk.setValueAtTime(1, Math.max(0, t - .005)); dk.linearRampToValueAtTime(.3, t + .004); dk.linearRampToValueAtTime(1, t + .24);
    },
    clap: function (G, B, t, p) {
      var c = G.ctx, n = noiseSrc(G, t, .3), bp = c.createBiquadFilter(), g = c.createGain(); bp.type = 'bandpass'; bp.frequency.value = p.roll ? 2400 : 1700; bp.Q.value = .9;
      g.gain.setValueAtTime(0.0001, t);
      if (!p.roll) { [0, .011, .022].forEach(function (o) { g.gain.linearRampToValueAtTime(1.1 * p.v, t + o + .001); g.gain.linearRampToValueAtTime(.25 * p.v, t + o + .009); }); g.gain.linearRampToValueAtTime(.9 * p.v, t + .034); g.gain.exponentialRampToValueAtTime(.0001, t + .26); }
      else { g.gain.linearRampToValueAtTime(.55 * p.v, t + .002); g.gain.exponentialRampToValueAtTime(.0001, t + .11); }
      n.connect(bp); bp.connect(g); g.connect(B.drums); g.connect(B.rv);
      var o = c.createOscillator(), og = c.createGain(); o.type = 'triangle'; o.frequency.setValueAtTime(220, t); o.frequency.exponentialRampToValueAtTime(150, t + .08); env(og, t, .001, .3 * p.v, .09); o.connect(og); og.connect(B.drums); o.start(t); o.stop(t + .15);
    },
    hat: function (G, B, t, p) {
      var c = G.ctx, n = noiseSrc(G, t, .25), hp = c.createBiquadFilter(), g = c.createGain(); hp.type = 'highpass'; hp.frequency.value = p.open ? 7000 : 9000;
      env(g, t, .001, (p.open ? .36 : .28) * p.v, p.open ? .16 : .035); n.connect(hp); hp.connect(g); g.connect(B.drums);
    },
    bass: function (G, B, t, p) {
      var c = G.ctx, f = hz(p.n), lp = c.createBiquadFilter(), g = c.createGain(); lp.type = 'lowpass'; lp.Q.value = 5;
      lp.frequency.setValueAtTime(p.cut * 2.4, t); lp.frequency.exponentialRampToValueAtTime(Math.max(120, p.cut * .45), t + Math.min(.2, p.d));
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(.1 * p.v, t + .006); g.gain.setValueAtTime(.1 * p.v, t + p.d * .7); g.gain.exponentialRampToValueAtTime(.0001, t + p.d);
      [['sawtooth', f, -6], ['sawtooth', f, 7], ['sine', f / 2, 0]].forEach(function (x) { var o = c.createOscillator(); o.type = x[0]; o.frequency.value = x[1]; o.detune.value = x[2]; o.connect(lp); o.start(t); o.stop(t + p.d + .02); });
      lp.connect(g); g.connect(B.duckAt(t));
    },
    pad: function (G, B, t, p) {
      var c = G.ctx, lp = c.createBiquadFilter(), g = c.createGain(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(900, t); lp.frequency.linearRampToValueAtTime(2600, t + p.d * .6); lp.frequency.linearRampToValueAtTime(1200, t + p.d);
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(.02 * p.v, t + .25); g.gain.setValueAtTime(.02 * p.v, t + p.d - .2); g.gain.linearRampToValueAtTime(0.0001, t + p.d + .15);
      p.n.slice(0, 3).forEach(function (m) { [-9, 9].forEach(function (d) { var o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = hz(m); o.detune.value = d; o.connect(lp); o.start(t); o.stop(t + p.d + .2); }); });
      lp.connect(g); g.connect(B.duckAt(t)); g.connect(B.rv);
    },
    arp: function (G, B, t, p) {
      var c = G.ctx, o = c.createOscillator(), lp = c.createBiquadFilter(), g = c.createGain(); o.type = 'square'; o.frequency.value = hz(p.n); lp.type = 'lowpass'; lp.frequency.value = 4200; lp.Q.value = 3;
      env(g, t, .003, .075 * p.v, .11); o.connect(lp); lp.connect(g); g.connect(B.duckAt(t)); g.connect(B.dl); o.start(t); o.stop(t + .16);
    },
    lead: function (G, B, t, p) {
      var c = G.ctx, lp = c.createBiquadFilter(), g = c.createGain(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(5200, t); lp.frequency.exponentialRampToValueAtTime(1600, t + p.d); lp.Q.value = 4;
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(.1 * (p.v || 1), t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + p.d);
      [-12, 12].forEach(function (d) { var o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = hz(p.n); o.detune.value = d; o.connect(lp); o.start(t); o.stop(t + p.d + .02); });
      lp.connect(g); g.connect(B.duckAt(t)); g.connect(B.dl); g.connect(B.rv);
    },
    crash: function (G, B, t, p) {
      var c = G.ctx, n = noiseSrc(G, t, 2), hp = c.createBiquadFilter(), g = c.createGain(); hp.type = 'highpass'; hp.frequency.value = 5000;
      env(g, t, .002, .22 * p.v, 1.7); n.connect(hp); hp.connect(g); g.connect(B.drums); g.connect(B.rv);
    },
    riser: function (G, B, t, p) {
      var c = G.ctx, n = noiseSrc(G, t, p.d), bp = c.createBiquadFilter(), g = c.createGain(); bp.type = 'bandpass'; bp.Q.value = 2.5;
      bp.frequency.setValueAtTime(250, t); bp.frequency.exponentialRampToValueAtTime(7500, t + p.d);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(.32 * p.v, t + p.d * .97); g.gain.linearRampToValueAtTime(0.0001, t + p.d + .02);
      n.connect(bp); bp.connect(g); g.connect(B.fx);
      var o = c.createOscillator(), og = c.createGain(), lp = c.createBiquadFilter(); o.type = 'sawtooth'; o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(880, t + p.d); lp.type = 'lowpass'; lp.frequency.setValueAtTime(400, t); lp.frequency.exponentialRampToValueAtTime(6000, t + p.d);
      og.gain.setValueAtTime(0.0001, t); og.gain.exponentialRampToValueAtTime(.06 * p.v, t + p.d * .97); og.gain.linearRampToValueAtTime(0.0001, t + p.d + .02);
      o.connect(lp); lp.connect(og); og.connect(B.fx); o.start(t); o.stop(t + p.d + .05);
    },
    whoosh: function (G, B, t, p) {
      var c = G.ctx, n = noiseSrc(G, t, p.d + .3), bp = c.createBiquadFilter(), g = c.createGain(), pn = c.createStereoPanner ? c.createStereoPanner() : null; bp.type = 'bandpass'; bp.Q.value = 1.4;
      bp.frequency.setValueAtTime(400, t); bp.frequency.exponentialRampToValueAtTime(5200, t + p.d); bp.frequency.exponentialRampToValueAtTime(900, t + p.d + .25);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(.45 * p.v, t + p.d); g.gain.exponentialRampToValueAtTime(.0001, t + p.d + .28);
      n.connect(bp); bp.connect(g);
      if (pn) { pn.pan.setValueAtTime(.8, t); pn.pan.linearRampToValueAtTime(-.8, t + p.d + .25); g.connect(pn); pn.connect(B.fx); } else g.connect(B.fx);
    },
    impact: function (G, B, t, p) {
      var c = G.ctx, o = c.createOscillator(), g = c.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(95, t); o.frequency.exponentialRampToValueAtTime(30, t + (p.big ? 1.8 : .9));
      env(g, t, .003, .95 * p.v, p.big ? 2.6 : 1.1); o.connect(g); g.connect(B.fx); o.start(t); o.stop(t + 2.8);
      var n = noiseSrc(G, t, 1), lp = c.createBiquadFilter(), ng = c.createGain(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(5000, t); lp.frequency.exponentialRampToValueAtTime(300, t + .6);
      env(ng, t, .002, .4 * p.v, p.big ? 1.6 : .6); n.connect(lp); lp.connect(ng); ng.connect(B.fx); ng.connect(B.rv);
    },
    blip: function (G, B, t, p) {
      var c = G.ctx; [0, 12].forEach(function (d, i) { var o = c.createOscillator(), g = c.createGain(); o.type = i ? 'sine' : 'triangle'; o.frequency.value = hz((p.n || 81) + d); env(g, t + i * .03, .002, .09 * p.v, .16); o.connect(g); g.connect(B.fx); g.connect(B.dl); o.start(t); o.stop(t + .3); });
    },
    hit: function (G, B, t, p) {
      V.blip(G, B, t, { n: 88, v: p.v });
      var c = G.ctx, n = noiseSrc(G, t, .3), bp = c.createBiquadFilter(), g = c.createGain(); bp.type = 'bandpass'; bp.frequency.value = 3500; env(g, t, .001, .3 * p.v, .2); n.connect(bp); bp.connect(g); g.connect(B.fx); g.connect(B.rv);
      var o = c.createOscillator(), og = c.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(50, t + .25); env(og, t, .002, .5 * p.v, .3); o.connect(og); og.connect(B.fx); o.start(t); o.stop(t + .4);
    }
  };
  function play(G, B, e, at) { var f = V[e.k]; if (f) f(G, B, at, e.p); }


  // ---------- offline render (for the MP4) and WAV encoding
  // rendered in 12 s chunks (5 s pre-roll so tails, reverb, delay and compressor are warmed up) and stitched
  // sample-exactly: a bounded graph per chunk keeps rendering fast; the score is deterministic so seams are inaudible.
  function renderOffline(events, dur, sr) {
    sr = sr || 44100;
    var OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext, CH = 12, PRE = 5, total = Math.ceil(sr * dur);
    var outBuf = new OAC(2, total, sr).createBuffer(2, total, sr), jobs = [];
    for (var c0 = 0; c0 < dur; c0 += CH) (function (c0) {
      var s0 = Math.max(0, c0 - PRE), len = Math.min(dur, c0 + CH) - s0, ctx = new OAC(2, Math.ceil(sr * len), sr), G = graph(ctx, ctx.destination), Bu = bus(G);
      events.forEach(function (e) { if (e.t >= s0 && e.t < s0 + len) play(G, Bu, e, e.t - s0); });
      jobs.push(ctx.startRendering().then(function (buf) {
        var from = Math.round((c0 - s0) * sr), at = Math.round(c0 * sr), n = Math.min(buf.length - from, total - at);
        for (var ch = 0; ch < 2; ch++) outBuf.getChannelData(ch).set(buf.getChannelData(ch).subarray(from, from + n), at);
      }));
    })(c0);
    return jobs.reduce(function (p, j) { return p.then(function () { return j; }); }, Promise.resolve()).then(function () { return outBuf; });
  }
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
    var ctx = new AC({ latencyHint: 'interactive' }), an = ctx.createAnalyser(); an.fftSize = 256; an.smoothingTimeConstant = .7;
    var mg = ctx.createGain(); mg.connect(an); an.connect(ctx.destination);
    var G = graph(ctx, mg), B = null, idx = 0, anchorCtx = 0, anchorT = 0, running = false, timer = 0, busT = 0;
    function find(t) { var lo = 0, hi = events.length; while (lo < hi) { var m = (lo + hi) >> 1; if (events[m].t < t) lo = m + 1; else hi = m; } return lo; }
    function tick() {
      if (!running) return;
      var nowT = anchorT + (ctx.currentTime - anchorCtx), horizon = nowT + .3;
      // rotate the session bus every 16 s; the old one is disconnected once its tails have rung out (keeps the graph small)
      if (nowT - busT > 16) { var old = B; B = bus(G); busT = nowT; setTimeout(function () { try { old.s.disconnect(); } catch (e) {} }, 6000); }
      while (idx < events.length && events[idx].t < horizon) { var e = events[idx++]; var at = anchorCtx + (e.t - anchorT); if (at >= ctx.currentTime - .01) play(G, B, e, Math.max(at, ctx.currentTime)); }
    }
    function kill() { if (B) { var old = B; old.s.gain.setTargetAtTime(0, ctx.currentTime, .03); setTimeout(function () { try { old.s.disconnect(); } catch (e) {} }, 400); B = null; } }
    return {
      ctx: ctx, analyser: an,
      start: function (T) { // (re)start from timeline position T
        kill(); if (ctx.state === 'suspended') ctx.resume();
        B = bus(G); busT = T; anchorCtx = ctx.currentTime + .05; anchorT = T; idx = find(T - .02);
        for (var j = Math.min(idx, events.length) - 1, g0 = 1; j >= 0; j--) if (events[j].k === 'lvl') { g0 = events[j].p.g; break; }
        G.out.gain.cancelScheduledValues(ctx.currentTime); G.out.gain.setValueAtTime(MG * g0, ctx.currentTime);
        // a whoosh/riser that started before T is skipped; the groove resumes on the next 16th
        running = true; clearInterval(timer); timer = setInterval(tick, 40); tick();
      },
      stop: function () { running = false; clearInterval(timer); kill(); },
      timeNow: function () { return anchorT + (ctx.currentTime - anchorCtx); },
      resume: function () { return ctx.resume(); }
    };
  }
  window.ClipAudio = { BPM: BPM, SPB: SPB, score: score, renderOffline: renderOffline, wav: wav, Live: Live };
})();
