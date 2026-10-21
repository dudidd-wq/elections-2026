/* Clip soundtrack v4 – upbeat, rhythmic news/explainer pop groove, fully generated with the Web Audio API
   (no recorded or copyrighted audio). 120 BPM, C major (I-V-vi-IV family): tight kick, clap+snare on 2 & 4,
   16th hi-hats, tambourine, plucky synth chords with sidechain pump, warm bass groove, a short bright hook,
   fills + crash at section changes. Energetic from the first beat (no slow intro).
   A deterministic score is built from the clip timeline (sections in beats, measure patterns, scene cuts,
   number reveals), then scheduled live (ClipAudio.Live) or rendered offline (ClipAudio.renderOffline) for the MP4.
   Shared by /clip/ and /clip-site/. */
(function () {
  'use strict';
  var BPM = 120, SPB = 60 / BPM, BAR = 4 * SPB;
  var MG = .86;                         // master gain after the limiter (tuned for ~-14.5 LUFS integrated)
  // chords: bass root + pluck voicing (around C4-C5, bright but not shrill)
  var CH = {
    C: { r: 36, v: [60, 64, 67, 72] }, G: { r: 43, v: [59, 62, 67, 71] }, Am: { r: 45, v: [60, 64, 69, 72] },
    F: { r: 41, v: [60, 65, 69, 72] }, Dm: { r: 38, v: [62, 65, 69, 74] }, Em: { r: 40, v: [59, 64, 67, 71] }
  };
  // hook per chord: [beat, midi, beats] – short, singable, mostly 8ths
  var HOOK = {
    C: [[0, 76, .5], [.5, 79, .5], [1.5, 79, .5], [2, 81, .75], [3, 79, .5], [3.5, 76, .5]],
    G: [[0, 74, .5], [.5, 76, .5], [1, 74, .5], [2, 71, .75], [3, 67, 1]],
    Am: [[0, 72, .5], [.5, 76, .5], [1.5, 76, .5], [2, 79, .75], [3, 76, .5], [3.5, 72, .5]],
    F: [[0, 77, .5], [.5, 76, .5], [1, 74, .5], [2, 72, .75], [3, 74, 1]],
    Dm: [[0, 74, .5], [.5, 77, .5], [1.5, 77, .5], [2, 81, .75], [3, 77, 1]],
    Em: [[0, 71, .5], [.5, 74, .5], [1.5, 76, .5], [2, 79, .75], [3, 76, 1]]
  };
  var BASS = [[0, 0, .42], [.75, 0, .2], [1.5, 12, .3], [2, 0, .42], [2.75, 0, .2], [3.5, 7, .4]];   // [beat, semitones, beats]
  var LVL = { go: 1, hook: 1.06, list: 1, break: .95, outro: 1.04 };
  function hz(m) { return 440 * Math.pow(2, (m - 69) / 12); }

  // ---------- score. cfg: {beats, sections:[{b0,b1,mode,prog,meas?}], cuts:[{b,kind}], hits:[{t,n,v}]}
  // A section is cut into measures (pattern meas, default [4]); prog gives one chord per measure (cycled).
  function score(cfg) {
    var ev = [], end = cfg.beats;
    function add(t, k, p) { ev.push({ t: t, k: k, p: p || {} }); }
    function drums(t, L, m, last) { // one measure of drums (L = 4 or 2 beats)
      var four = m === 'hook' || m === 'outro', brk = m === 'break';
      if (L === 2) { // turnaround fill (identical wherever it occurs): kick, snare 8ths crescendo, hats
        add(t, 'kick', { v: 1 }); for (var f = 0; f < 4; f++) add(t + f * SPB / 2, 'snare', { v: .45 + f * .17 });
        for (var h2 = 0; h2 < 4; h2++) add(t + h2 * SPB / 2, 'hat', { v: .6, pan: .25 });
        return;
      }
      {
        var ks = brk ? [0, 2.5] : four ? [0, 1, 2, 3] : [0, 2, 2.75]; if (last) ks = ks.filter(function (k) { return k < 3; });
        ks.forEach(function (k) { add(t + k * SPB, 'kick', { v: k === 2.75 ? .62 : 1 }); });
      }
      add(t + SPB, 'clap', { v: brk ? .7 : 1 }); if (!last || brk) add(t + 3 * SPB, 'clap', { v: brk ? .7 : 1 });
      if (four || m === 'list') { add(t + SPB, 'tamb', { v: .8 }); add(t + 3 * SPB, 'tamb', { v: .8 }); }
      var step = brk ? 2 : 4;
      for (var q = 0; q < 4 * step; q++) {
        var b = q / step; if (last && b >= 3) break;
        var open = four && step === 4 && q % 4 === 2;
        add(t + b * SPB, open ? 'ohat' : 'hat', { v: [1, .42, .68, .42][q % 4] * (brk ? .8 : 1), pan: .25 });
      }
      if (last) for (var r = 0; r < 4; r++) add(t + (3 + r / 4) * SPB, 'snare', { v: .35 + r * .2 });   // fill into the next section
    }
    cfg.sections.forEach(function (s, si) {
      var meas = s.meas || [4], prog = s.prog || ['C', 'G', 'Am', 'F'], m = s.mode, mi = 0;
      add(s.b0 * SPB, 'lvl', { g: LVL[m] || 1 });
      if (m !== 'break' || si === 0) add(s.b0 * SPB, 'crash', { v: si === 0 ? 1 : .8 });
      for (var b = s.b0; b < s.b1; mi++) {
        var L = Math.min(meas[mi % meas.length], s.b1 - b), t = b * SPB, ch = CH[prog[mi % prog.length]] || CH.C, ci = prog[mi % prog.length];
        var last = b + L >= s.b1 && L === 4 && si < cfg.sections.length - 1;
        var finalM = si === cfg.sections.length - 1 && b + L >= s.b1;
        if (finalM) { // ending: one big chord hit + crash, let it ring
          add(t, 'kick', { v: 1 }); add(t, 'crash', { v: 1 }); add(t, 'bass', { n: ch.r, d: 1.6, v: 1 });
          ch.v.forEach(function (n) { add(t, 'pluck', { n: n, v: .9, d: 1.4 }); add(t, 'pluck', { n: n + 12, v: .4, d: 1.4 }); });
          add(t, 'lead', { n: 72 + 12, v: .7, d: 1.2 });
          b += L; continue;
        }
        drums(t, L, m, last);
        // bass groove (pumped by the kick)
        if (m === 'break' && b < s.b1 - 4) { add(t, 'bass', { n: ch.r, d: 1.4, v: .9 }); add(t + 2.5 * SPB, 'bass', { n: ch.r, d: .7, v: .8 }); }
        else {
          if (L === 2) add(t, 'bass', { n: ch.r, d: .9, v: 1 });
          else BASS.forEach(function (x) { if (last && x[0] >= 3) return; add(t + x[0] * SPB, 'bass', { n: ch.r + x[1], d: x[2] * SPB, v: x[1] ? .8 : 1 }); });
        }
        // plucky chords: 8ths, offbeats accented (with the sidechain pump this gives the "breathing" groove)
        for (var e = 0; e < L * 2; e++) {
          if (L === 2 && e > 0) break;
          var acc = e % 2 ? 1 : .62;
          ch.v.forEach(function (n, vi) { if (vi === 0 && e % 2 === 0 && e) return; add(t + e * SPB / 2, 'pluck', { n: n, v: acc * (m === 'break' ? .75 : 1), d: L === 2 ? .9 : .22 }); });
        }
        // hook: in hook / list / outro sections (identical per list: first full measure of every list scene)
        var wantHook = (m === 'hook' || m === 'outro') ? true : m === 'list' ? (mi % meas.length === 0) : m === 'go' ? (mi % 4 === 3) : m === 'break' ? (mi % 2 === 1) : false;
        if (wantHook && L === 4) (HOOK[ci] || HOOK.C).forEach(function (x) { if (last && x[0] >= 3) return; add(t + x[0] * SPB, 'lead', { n: x[1], v: m === 'go' ? .75 : 1, d: x[2] * SPB }); });
        if (last) add(t + 2 * SPB, 'riser', { d: 2 * SPB, v: 1 });
        b += L;
      }
    });
    // scene cuts inside a section: a short bright swish into the cut (identical for every list)
    var secStarts = cfg.sections.map(function (s) { return s.b0; });
    cfg.cuts.forEach(function (c) { if (secStarts.indexOf(c.b) < 0) add(c.b * SPB - .22, 'swish', { d: .22, v: c.kind === 'list' ? .8 : 1 }); });
    cfg.hits.forEach(function (h) { add(h.t, 'blip', { v: h.v || 1, n: (h.n || 84) }); });
    add(end * SPB - .9, 'fade', { tc: .28 });
    ev.sort(function (a, b) { return a.t - b.t || (a.k < b.k ? -1 : 1); });
    return ev;
  }

  // ---------- deterministic noise + impulse
  function rng(seed) { var s = seed >>> 0; return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  function noiseBuf(ctx) { var r = rng(7), n = ctx.sampleRate * 2, b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0); for (var i = 0; i < n; i++) d[i] = r() * 2 - 1; return b; }
  function shortNoise(ctx, seed) { var r = rng(seed), n = Math.floor(ctx.sampleRate * .5), b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0); for (var i = 0; i < n; i++) d[i] = r() * 2 - 1; return b; }
  function impulse(ctx) { var r = rng(11), sec = 1.7, n = Math.floor(ctx.sampleRate * sec), b = ctx.createBuffer(2, n, ctx.sampleRate); for (var c = 0; c < 2; c++) { var d = b.getChannelData(c); for (var i = 0; i < n; i++) d[i] = (r() * 2 - 1) * Math.pow(1 - i / n, 5) * (i < 300 ? i / 300 : 1); } return b; }

  // ---------- mixing graph: session bus (with sidechain "pump" sub-bus) -> glue compressor -> EQ -> limiter -> master
  function graph(ctx, dest) {
    var G = { ctx: ctx, noise: noiseBuf(ctx), shk: [1, 2, 3, 4, 5, 6].map(function (k) { return shortNoise(ctx, 20 + k); }) };
    var comp = ctx.createDynamicsCompressor(); comp.threshold.value = -18; comp.knee.value = 8; comp.ratio.value = 3; comp.attack.value = .01; comp.release.value = .15;
    var lim = ctx.createDynamicsCompressor(); lim.threshold.value = -4; lim.knee.value = 0; lim.ratio.value = 20; lim.attack.value = .002; lim.release.value = .08;
    var hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 30; hp.Q.value = .6;
    var ls = ctx.createBiquadFilter(); ls.type = 'lowshelf'; ls.frequency.value = 160; ls.gain.value = -4;
    var pk = ctx.createBiquadFilter(); pk.type = 'peaking'; pk.frequency.value = 3000; pk.Q.value = .8; pk.gain.value = 3;
    var hs = ctx.createBiquadFilter(); hs.type = 'highshelf'; hs.frequency.value = 8000; hs.gain.value = 2.5;
    var out = ctx.createGain(); out.gain.value = MG; comp.connect(hp); hp.connect(ls); ls.connect(pk); pk.connect(hs); hs.connect(lim); lim.connect(out); out.connect(dest);
    var rev = ctx.createConvolver(); rev.buffer = impulse(ctx); var revG = ctx.createGain(); revG.gain.value = .32; rev.connect(revG); revG.connect(comp);
    var del = ctx.createDelay(1.5); del.delayTime.value = SPB * .75; var fb = ctx.createGain(); fb.gain.value = .28; var dlp = ctx.createBiquadFilter(); dlp.type = 'lowpass'; dlp.frequency.value = 6000;
    var dhp = ctx.createBiquadFilter(); dhp.type = 'highpass'; dhp.frequency.value = 400;
    del.connect(dlp); dlp.connect(dhp); dhp.connect(fb); fb.connect(del); var delG = ctx.createGain(); delG.gain.value = .2; dhp.connect(delG); delG.connect(comp);
    G.comp = comp; G.out = out; G.rev = rev; G.del = del;
    return G;
  }
  function bus(G) { // one "session" (live: recreated on every seek so stale notes can be silenced)
    var ctx = G.ctx, s = ctx.createGain(); s.connect(G.comp);
    var p = ctx.createGain(); p.connect(s);                   // sidechain-pumped sub-bus (bass, plucks)
    var rv = ctx.createGain(); rv.connect(G.rev); var dl = ctx.createGain(); dl.connect(G.del);
    return { s: s, p: p, rv: rv, dl: dl };
  }
  function noiseSrc(G, t, dur) { var n = G.ctx.createBufferSource(); n.buffer = G.noise; n.loop = true; n.start(t, (t * 7.31) % 1.5); n.stop(t + dur + .05); return n; }
  function shortSrc(G, t, k, dur) { var n = G.ctx.createBufferSource(); n.buffer = G.shk[k % G.shk.length]; n.start(t); n.stop(t + Math.min(.49, dur)); return n; }
  function osc(c, type, f, t, stop, det) { var o = c.createOscillator(); o.type = type; o.frequency.value = f; if (det) o.detune.value = det; o.start(t); o.stop(stop); return o; }
  function pan(c, x, dst) { if (!c.createStereoPanner) return dst; var p = c.createStereoPanner(); p.pan.value = x; p.connect(dst); return p; }
  // envelope: linear attack to peak, exponential-style decay (setTarget), then a short linear tail to exact 0 before the source stops
  function env(g, t, a, peak, tc, stopAt) { g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.setTargetAtTime(0, t + a + .0007, tc); if (stopAt) { g.gain.setValueAtTime(peak * Math.exp(-(stopAt - .012 - t - a) / tc), stopAt - .012); g.gain.linearRampToValueAtTime(0, stopAt - .002); } }
  function gz(c) { var g = c.createGain(); g.gain.value = 0; return g; } // envelope gains start silent (a source can start one frame before the first automation event)
  var V = {
    lvl: function (G, B, t, p) { G.out.gain.setTargetAtTime(MG * p.g, t, .08); },
    fade: function (G, B, t, p) { G.out.gain.setTargetAtTime(0, t, p.tc); },
    kick: function (G, B, t, p) { // tight kick: pitch-swept sine + short click; ducks the pumped bus
      var c = G.ctx, o = osc(c, 'sine', 160, t, t + .42), g = gz(c);
      o.frequency.setValueAtTime(165, t); o.frequency.exponentialRampToValueAtTime(52, t + .085);
      env(g, t, .002, .68 * p.v, .08, t + .42); o.connect(g); g.connect(B.s);
      var n = shortSrc(G, t, 0, .03), hp = c.createBiquadFilter(), cg = gz(c); hp.type = 'highpass'; hp.frequency.value = 2500;
      env(cg, t, .001, .12 * p.v, .004, t + .03); n.connect(hp); hp.connect(cg); cg.connect(B.s);
      B.p.gain.setTargetAtTime(.38, t, .004); B.p.gain.setTargetAtTime(1, t + .05, .075);
    },
    clap: function (G, B, t, p) { // clap (3 micro-bursts + tail) layered with a snare body
      var c = G.ctx, bp = c.createBiquadFilter(), hp = c.createBiquadFilter(), g = gz(c), n = shortSrc(G, t, 1, .4);
      bp.type = 'bandpass'; bp.frequency.value = 1500; bp.Q.value = .8; hp.type = 'highpass'; hp.frequency.value = 700;
      var a = .44 * p.v; g.gain.setValueAtTime(0, t);
      [0, .011, .022].forEach(function (d, i) { g.gain.linearRampToValueAtTime(a * (i === 2 ? 1 : .8), t + d + .001); g.gain.setTargetAtTime(a * .15, t + d + .0017, .004); });
      g.gain.linearRampToValueAtTime(a * .55, t + .031); g.gain.setTargetAtTime(0, t + .0317, .055);
      g.gain.setValueAtTime(a * .55 * Math.exp(-(.36 - .0317) / .055), t + .36); g.gain.linearRampToValueAtTime(0, t + .385);
      n.connect(hp); hp.connect(bp); bp.connect(g); g.connect(B.s); g.connect(B.rv);
      var o = osc(c, 'triangle', 210, t, t + .2), og = gz(c); o.frequency.setValueAtTime(220, t); o.frequency.exponentialRampToValueAtTime(170, t + .06);
      env(og, t, .002, .16 * p.v, .035, t + .2); o.connect(og); og.connect(B.s);
      var sn = shortSrc(G, t, 2, .25), sh = c.createBiquadFilter(), sg = gz(c); sh.type = 'highpass'; sh.frequency.value = 5000;
      env(sg, t, .001, .07 * p.v, .05, t + .25); sn.connect(sh); sh.connect(sg); sg.connect(B.s);
    },
    snare: function (G, B, t, p) { // fill snare
      var c = G.ctx, n = shortSrc(G, t, 3, .2), bp = c.createBiquadFilter(), g = gz(c); bp.type = 'bandpass'; bp.frequency.value = 2400; bp.Q.value = .6;
      env(g, t, .001, .22 * p.v, .045, t + .2); n.connect(bp); bp.connect(g); g.connect(B.s); g.connect(B.rv);
      var o = osc(c, 'triangle', 190, t, t + .15), og = gz(c); env(og, t, .002, .12 * p.v, .03, t + .15); o.connect(og); og.connect(B.s);
    },
    hat: function (G, B, t, p) { // closed hi-hat
      var c = G.ctx, n = shortSrc(G, t, 4 + Math.round(t * 8) % 2, .09), hp = c.createBiquadFilter(), g = gz(c); hp.type = 'highpass'; hp.frequency.value = 7800;
      env(g, t, .001, .13 * p.v, .018, t + .09); n.connect(hp); hp.connect(g); g.connect(pan(c, p.pan || 0, B.s));
    },
    ohat: function (G, B, t, p) { // open hi-hat on the offbeat
      var c = G.ctx, n = shortSrc(G, t, 5, .32), hp = c.createBiquadFilter(), g = gz(c); hp.type = 'highpass'; hp.frequency.value = 7200;
      env(g, t, .002, .1 * p.v, .08, t + .32); n.connect(hp); hp.connect(g); g.connect(pan(c, p.pan || 0, B.s)); g.connect(B.rv);
    },
    tamb: function (G, B, t, p) { // tambourine on 2 & 4
      var c = G.ctx, n = shortSrc(G, t, 3, .22), bp = c.createBiquadFilter(), g = gz(c); bp.type = 'bandpass'; bp.frequency.value = 9500; bp.Q.value = 1.2;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.13 * p.v, t + .002); g.gain.setTargetAtTime(.03 * p.v, t + .0027, .01); g.gain.linearRampToValueAtTime(.05 * p.v, t + .025); g.gain.setTargetAtTime(0, t + .0257, .04);
      g.gain.setValueAtTime(.05 * p.v * Math.exp(-(.2 - .0257) / .04), t + .2); g.gain.linearRampToValueAtTime(0, t + .215);
      n.connect(bp); bp.connect(g); g.connect(pan(c, -.3, B.s));
    },
    crash: function (G, B, t, p) { // soft bright crash
      var c = G.ctx, n = noiseSrc(G, t, 2.2), hp = c.createBiquadFilter(), lp = c.createBiquadFilter(), g = gz(c); hp.type = 'highpass'; hp.frequency.value = 4800; lp.type = 'lowpass'; lp.frequency.value = 13000;
      env(g, t, .004, .075 * p.v, .45, t + 2.2); n.connect(hp); hp.connect(lp); lp.connect(g); g.connect(B.s); g.connect(B.rv);
    },
    riser: function (G, B, t, p) { // short noise riser into a section change
      var c = G.ctx, n = noiseSrc(G, t, p.d), bp = c.createBiquadFilter(), g = gz(c); bp.type = 'bandpass'; bp.Q.value = 1.1;
      bp.frequency.setValueAtTime(900, t); bp.frequency.exponentialRampToValueAtTime(8000, t + p.d);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.045 * p.v, t + p.d * .97); g.gain.linearRampToValueAtTime(0, t + p.d + .02);
      n.connect(bp); bp.connect(g); g.connect(B.s); g.connect(B.rv);
    },
    swish: function (G, B, t, p) { // very short swish into a cut
      var c = G.ctx, n = noiseSrc(G, t, p.d), bp = c.createBiquadFilter(), g = gz(c); bp.type = 'bandpass'; bp.Q.value = 1.4;
      bp.frequency.setValueAtTime(2500, t); bp.frequency.exponentialRampToValueAtTime(9000, t + p.d);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.028 * p.v, t + p.d * .9); g.gain.linearRampToValueAtTime(0, t + p.d + .015);
      n.connect(bp); bp.connect(g); g.connect(pan(c, .15, B.s));
    },
    bass: function (G, B, t, p) { // warm bass: sine + filtered saw, pumped
      var c = G.ctx, f = hz(p.n), lp = c.createBiquadFilter(), g = gz(c), d = Math.max(.12, p.d), stop = t + d + .2;
      lp.type = 'lowpass'; lp.Q.value = 2; lp.frequency.setValueAtTime(1300, t); lp.frequency.setTargetAtTime(520, t, .06);
      var a = .13 * p.v; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(a, t + .006); g.gain.setTargetAtTime(a * .75, t + .0067, .12);
      g.gain.setTargetAtTime(0, t + d + .0007, .022);
      osc(c, 'sine', f, t, stop).connect(g); var sw = osc(c, 'sawtooth', f, t, stop, 4), sg = gz(c); sg.gain.value = .5; sw.connect(sg); sg.connect(lp); lp.connect(g);
      g.connect(B.p);
    },
    pluck: function (G, B, t, p) { // plucky synth chord voice: 2 detuned saws, fast filter envelope, pumped
      var c = G.ctx, f = hz(p.n), lp = c.createBiquadFilter(), g = gz(c), d = p.d || .22, stop = t + d + .42;
      lp.type = 'lowpass'; lp.Q.value = 1.4; lp.frequency.setValueAtTime(Math.min(9000, f * 14), t); lp.frequency.setTargetAtTime(Math.min(2400, f * 3.2), t, .07);
      var a = .042 * p.v; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(a, t + .003); g.gain.setTargetAtTime(a * .25, t + .0037, d * .5);
      g.gain.setTargetAtTime(0, t + d + .0007, .05);
      [-7, 7].forEach(function (dt) { osc(c, 'sawtooth', f, t, stop, dt).connect(lp); });
      lp.connect(g); g.connect(B.p); g.connect(B.dl); g.connect(B.rv);
    },
    lead: function (G, B, t, p) { // bright hook lead: triangle + soft square + bell partial
      var c = G.ctx, f = hz(p.n), lp = c.createBiquadFilter(), g = gz(c), d = Math.max(.15, p.d), stop = t + d + .5;
      lp.type = 'lowpass'; lp.frequency.value = 7500;
      var a = .075 * p.v; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(a, t + .006); g.gain.setTargetAtTime(a * .6, t + .0067, .12);
      g.gain.setTargetAtTime(0, t + d + .0007, .06);
      osc(c, 'triangle', f, t, stop).connect(lp);
      var sq = osc(c, 'square', f, t, stop, 5), sqg = gz(c); sqg.gain.value = .12; sq.connect(sqg); sqg.connect(lp);
      var be = osc(c, 'sine', f * 4, t, stop), beg = gz(c); env(beg, t, .002, .18, .06, stop - .01); be.connect(beg); beg.connect(lp);
      lp.connect(g); g.connect(pan(c, -.1, B.s)); g.connect(B.dl); g.connect(B.rv);
    },
    blip: function (G, B, t, p) { // bright blip on number reveals
      var c = G.ctx, f = hz(p.n), g = gz(c), stop = t + .5;
      env(g, t, .002, .05 * p.v, .07, stop);
      [[1, 1], [2, .3], [3, .12]].forEach(function (x) { var o = osc(c, x[0] === 1 ? 'triangle' : 'sine', f * x[0], t, stop), og = gz(c); og.gain.value = x[1]; o.connect(og); og.connect(g); });
      g.connect(B.s); g.connect(B.dl);
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
      if (nowT - busT > 16) { var old = B; B = bus(G); busT = nowT; setTimeout(function () { try { old.s.disconnect(); old.p.disconnect(); old.rv.disconnect(); old.dl.disconnect(); } catch (e) {} }, 7000); }
      while (idx < events.length && events[idx].t < horizon) { var e = events[idx++]; var at = anchorCtx + (e.t - anchorT); if (at >= ctx.currentTime - .01) play(G, B, e, Math.max(at, ctx.currentTime)); }
    }
    function kill() { if (B) { var old = B; old.s.gain.setTargetAtTime(0, ctx.currentTime, .05); old.rv.gain.setTargetAtTime(0, ctx.currentTime, .05); setTimeout(function () { try { old.s.disconnect(); old.p.disconnect(); old.rv.disconnect(); old.dl.disconnect(); } catch (e) {} }, 500); B = null; } }
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
  window.ClipAudio = { BPM: BPM, SPB: SPB, BAR: BAR, score: score, renderOffline: renderOffline, wav: wav, Live: Live, CH: CH };
})();
