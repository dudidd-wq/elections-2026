/* ui.js – app-shell behaviour for the v2 "dev dashboard" design. Presentation only: no data is changed here.
   - drawer (sidebar on tablets/phones), command palette (Ctrl/Cmd+K, "/"), keyboard shortcuts + "?" help,
   - page status bar (status / last-updated / source chips + copy link + JSON links), from window.EL26X.meta(),
   - table tools: sortable columns (3rd click restores the original, alphabetical, order) + CSV download.
   NEUTRALITY: the palette lists pages first, then lists/issues/localities alphabetically; no ranking, no colours. */
(function () {
  'use strict';
  var d = document, html = d.documentElement, X = function () { return window.EL26X || null; };

  // ---------- mono font: registered after load so it stays off the critical path (fallback: Heebo / ui-monospace)
  function monoFont() {
    try { if (!window.FontFace || !d.fonts) return; var f = new FontFace('JB Mono', 'url(fonts/jbmono.woff2) format("woff2")', { weight: '100 800', display: 'swap', unicodeRange: 'U+0020-007E,U+00A0,U+00B1,U+00B7,U+00D7,U+2013-2014,U+2018-201D,U+2022,U+2026,U+2190-2193,U+21B5,U+2212,U+2318,U+25B2,U+25BC' }); d.fonts.add(f); f.load().catch(function () {}); } catch (e) {}
  }
  var mf = function () { setTimeout(function () { (window.requestIdleCallback || setTimeout)(monoFont, { timeout: 900 }); }, 400); }; if (d.readyState === 'complete') mf(); else window.addEventListener('load', mf, { once: true });
  var COLL = new Intl.Collator('he', { sensitivity: 'base', numeric: true });
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function isTyping(t) { t = t || d.activeElement; return !!t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable); }
  var isMac = /Mac|iPhone|iPad/.test(navigator.platform || '');
  var toastT;
  function toast(msg) {
    var t = d.getElementById('ux-toast');
    if (!t) { t = d.createElement('div'); t.id = 'ux-toast'; t.className = 'ux-toast'; t.setAttribute('role', 'status'); d.body.appendChild(t); }
    t.textContent = msg; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove('on'); }, 1800);
  }
  function copy(text, ok) {
    var done = function () { toast(ok || 'הועתק'); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, function () { fallback(); });
    else fallback();
    function fallback() { var ta = d.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0'; d.body.appendChild(ta); ta.select(); try { d.execCommand('copy'); done(); } catch (e) { toast('ההעתקה נכשלה'); } ta.remove(); }
  }

  // ---------- drawer
  var side = d.getElementById('side'), scrim = d.getElementById('scrim'), lastFocus = null;
  function drawerOpen() { return html.classList.contains('nav-open'); }
  function setDrawer(open) {
    if (open === drawerOpen()) return;
    html.classList.toggle('nav-open', open);
    d.querySelectorAll('.menu-open').forEach(function (b) { b.setAttribute('aria-expanded', open ? 'true' : 'false'); });
    if (open) { lastFocus = d.activeElement; var a = side.querySelector('[aria-current=page]') || side.querySelector('a'); setTimeout(function () { (d.getElementById('side-x') || a).focus(); }, 30); }
    else if (lastFocus && lastFocus.focus) { try { lastFocus.focus(); } catch (e) {} }
  }
  d.querySelectorAll('.menu-open').forEach(function (b) { b.addEventListener('click', function () { setDrawer(!drawerOpen()); }); });
  if (scrim) scrim.addEventListener('click', function () { setDrawer(false); });
  var sx = d.getElementById('side-x'); if (sx) sx.addEventListener('click', function () { setDrawer(false); });
  if (side) side.addEventListener('click', function (e) { if (e.target.closest('a')) { lastFocus = null; setDrawer(false); } });
  if (side) side.addEventListener('keydown', function (e) { // focus trap while the drawer is a modal overlay
    if (e.key !== 'Tab' || !drawerOpen() || window.matchMedia('(min-width:1100px)').matches) return;
    var f = side.querySelectorAll('a,button'), first = f[0], last = f[f.length - 1];
    if (e.shiftKey && d.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && d.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  // ---------- generic modal dialog (palette + help)
  function modal(id, label, inner) {
    var m = d.getElementById(id);
    if (m) return m;
    m = d.createElement('div'); m.id = id; m.className = 'ux-modal'; m.hidden = true;
    m.innerHTML = '<div class="ux-bk" data-x></div><div class="ux-box" role="dialog" aria-modal="true" aria-label="' + esc(label) + '">' + inner + '</div>';
    m.addEventListener('click', function (e) { if (e.target.closest('[data-x]')) closeModal(m); });
    m.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.preventDefault(); closeModal(m); return; }
      if (e.key === 'Tab') { var f = m.querySelectorAll('input,button,a[href]'), a = f[0], z = f[f.length - 1]; if (e.shiftKey && d.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && d.activeElement === z) { e.preventDefault(); a.focus(); } }
    });
    d.body.appendChild(m); return m;
  }
  var modalFrom = null;
  function openModal(m, focusEl) { closeAll(); modalFrom = d.activeElement; m.hidden = false; html.classList.add('ux-lock'); setTimeout(function () { (focusEl || m.querySelector('button,input')).focus(); }, 10); }
  function closeModal(m) { if (m.hidden) return; m.hidden = true; html.classList.remove('ux-lock'); if (modalFrom && modalFrom.focus && d.contains(modalFrom)) { try { modalFrom.focus(); } catch (e) {} } modalFrom = null; }
  function closeAll() { d.querySelectorAll('.ux-modal').forEach(function (m) { if (!m.hidden) { m.hidden = true; html.classList.remove('ux-lock'); } }); }

  // ---------- command palette
  var LOC = null, LOCp = null;
  function loadLoc() {
    if (LOC || LOCp) return LOCp;
    LOCp = fetch('data/geo/index.json').then(function (r) { return r.json(); }).then(function (ix) {
      var env = ix.envelopesCode; LOC = ix.localities.filter(function (l) { return l[0] !== env; }).map(function (l) { return { code: l[0], name: l[1], k: norm(l[1]) }; });
      return fetch('data/cities/k26.json').then(function (r) { return r.json(); }).then(function (k26) { // localities that exist only in 2026
        Object.keys(k26.names || {}).forEach(function (c) { if (!LOC.some(function (l) { return l.code === +c; })) LOC.push({ code: +c, name: k26.names[c], k: norm(k26.names[c]) }); });
      }, function () {});
    }).then(function () {
      LOC.sort(function (a, b) { return COLL.compare(a.name, b.name); });
      if (pal && !pal.hidden) palRender();
    }).catch(function () { LOCp = null; });
    return LOCp;
  }
  function norm(s) { return String(s).toLowerCase().replace(/[\u0591-\u05C7]/g, '').replace(/["'״׳`\-–—()!.,]/g, ' ').replace(/\s+/g, ' ').trim(); }
  function pagesIdx() {
    return Array.prototype.map.call(d.querySelectorAll('.nav a[data-nav]'), function (a) {
      var t = a.firstChild && a.firstChild.nodeType === 3 ? a.firstChild.nodeValue.trim() : a.textContent.trim(), nk = a.querySelector('.nk');
      return { g: 'עמודים', t: t, href: a.getAttribute('href'), hint: nk ? nk.textContent : '' };
    });
  }
  var pal = null, palItems = [], palSel = 0;
  function palOpen() {
    pal = modal('ux-pal', 'חיפוש מהיר', '<div class="kp-in"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M16 16l4.5 4.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>' +
      '<input id="kp-q" type="search" role="combobox" aria-autocomplete="list" aria-expanded="true" aria-controls="kp-list" autocomplete="off" spellcheck="false" placeholder="עמוד, רשימה, סוגיה או יישוב…" aria-label="חיפוש עמוד, רשימה, סוגיה או יישוב">' +
      '<button type="button" class="ibtn kp-x" data-x aria-label="סגירה"><kbd>Esc</kbd></button></div><ul id="kp-list" role="listbox" aria-label="תוצאות"></ul>' +
      '<p class="kp-foot"><span><kbd>↑</kbd><kbd>↓</kbd> בחירה</span><span><kbd>↵</kbd> מעבר</span><span><kbd>Esc</kbd> סגירה</span><span class="kp-neutral">סדר אלפביתי בכל קבוצה</span></p>');
    var q = pal.querySelector('#kp-q');
    if (!pal._w) {
      pal._w = 1;
      q.addEventListener('input', function () { palSel = 0; palRender(); if (q.value.trim()) loadLoc(); });
      q.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); if (!palItems.length) return; palSel = (palSel + (e.key === 'ArrowDown' ? 1 : -1) + palItems.length) % palItems.length; palMark(); }
        else if (e.key === 'Enter') { e.preventDefault(); palGo(palItems[palSel]); }
      });
      pal.querySelector('#kp-list').addEventListener('click', function (e) { var li = e.target.closest('[data-i]'); if (li) palGo(palItems[+li.getAttribute('data-i')]); });
      pal.querySelector('#kp-list').addEventListener('mousemove', function (e) { var li = e.target.closest('[data-i]'); if (li && +li.getAttribute('data-i') !== palSel) { palSel = +li.getAttribute('data-i'); palMark(true); } });
    }
    q.value = ''; palSel = 0; palRender(); openModal(pal, q);
  }
  function palRender() {
    var q = norm(pal.querySelector('#kp-q').value), x = X(), out = [];
    var has = function (s) { return !q || norm(s).indexOf(q) >= 0; };
    pagesIdx().forEach(function (p) { if (has(p.t)) out.push(p); });
    [{ t: 'השוואת יישובים (2019–2026)', href: '#/cities/vs' }, { t: 'ניתוח לפי רשימה ויישוב (2019–2026)', href: '#/cities/list' }].forEach(function (p) { if (has(p.t)) out.push({ g: 'עמודים', t: p.t, href: p.href }); });
    if (x) {
      x.lists().forEach(function (l) { if (has(l.name)) out.push({ g: 'רשימות', t: l.name, href: '#/list/' + l.id }); });
      x.issues().forEach(function (i) { if (has(i.name) || (q && has(i.title))) out.push({ g: 'סוגיות', t: i.name, href: '#/issue/' + i.id, hint: String(i.n) }); });
    }
    if (q) {
      if (LOC) {
        var n = 0, hit = [];
        LOC.forEach(function (l) { if (n < 12 && l.k.indexOf(q) >= 0) { n++; hit.push(l); out.push({ g: 'יישובים', t: l.name, href: '#/cities/' + l.code, hint: 'יישוב' }); } });
        hit.slice(0, 3).forEach(function (l) { out.push({ g: 'השוואת יישובים', t: l.name + ' מול התוצאה הארצית, 2019–2026', href: '#/cities/vs?a=' + l.code + '&b=nat', hint: 'השוואה' }); });
      }
      else out.push({ g: 'יישובים', t: 'טוען רשימת יישובים…', off: 1 });
    }
    var acts = [{ g: 'פעולות', t: 'החלפת מצב כהה/בהיר', act: 'theme', hint: 'T' }, { g: 'פעולות', t: 'העתקת קישור לעמוד הזה', act: 'copy' }, { g: 'פעולות', t: 'קיצורי מקלדת', act: 'help', hint: '?' }];
    acts.forEach(function (a) { if (has(a.t)) out.push(a); });
    palItems = out.filter(function (o) { return !o.off; });
    var h = '', g = '', i = 0;
    out.forEach(function (o) {
      if (o.g !== g) { g = o.g; h += '<li class="kp-g" role="presentation">' + esc(g) + '</li>'; }
      if (o.off) { h += '<li class="kp-o off" role="presentation">' + esc(o.t) + '</li>'; return; }
      h += '<li class="kp-o" role="option" id="kp-o' + i + '" data-i="' + i + '" aria-selected="false"><span>' + esc(o.t) + '</span>' + (o.hint ? '<kbd>' + esc(o.hint) + '</kbd>' : '') + '</li>'; i++;
    });
    if (!out.length) h = '<li class="kp-o off" role="presentation">לא נמצאו תוצאות</li>';
    pal.querySelector('#kp-list').innerHTML = h; palMark();
  }
  function palMark(noScroll) {
    var q = pal.querySelector('#kp-q'), cur = null;
    pal.querySelectorAll('.kp-o[role=option]').forEach(function (li) { var on = +li.getAttribute('data-i') === palSel; li.setAttribute('aria-selected', on ? 'true' : 'false'); if (on) cur = li; });
    if (cur) { q.setAttribute('aria-activedescendant', cur.id); if (!noScroll) cur.scrollIntoView({ block: 'nearest' }); } else q.removeAttribute('aria-activedescendant');
  }
  function palGo(o) {
    if (!o) return;
    closeModal(pal);
    if (o.act === 'theme') { var t = d.getElementById('theme'); if (t) t.click(); }
    else if (o.act === 'copy') copy(location.href, 'הקישור הועתק');
    else if (o.act === 'help') helpOpen();
    else if (o.href) { if (location.hash === o.href) window.scrollTo(0, 0); else location.hash = o.href; }
  }

  // ---------- help overlay
  function helpOpen() {
    var rows = pagesIdx().filter(function (p) { return p.hint; }).map(function (p) { return '<li><span>' + esc(p.t) + '</span><span class="ks">' + p.hint.split(' ').map(function (k) { return '<kbd>' + esc(k) + '</kbd>'; }).join(' ') + '</span></li>'; }).join('');
    var m = modal('ux-help', 'קיצורי מקלדת', '<div class="hp-h"><h2>קיצורי מקלדת</h2><button type="button" class="ibtn" data-x aria-label="סגירה">✕</button></div>' +
      '<div class="hp-c"><ul class="hp-l"><li><span>חיפוש מהיר</span><span class="ks"><kbd>' + (isMac ? '⌘' : 'Ctrl') + '</kbd> <kbd>K</kbd> או <kbd>/</kbd></span></li><li><span>מצב כהה/בהיר</span><span class="ks"><kbd>T</kbd></span></li><li><span>הקיצורים האלה</span><span class="ks"><kbd>?</kbd></span></li><li><span>סגירת חלון</span><span class="ks"><kbd>Esc</kbd></span></li></ul>' +
      '<h3>מעבר לעמוד: <kbd>G</kbd> ואחריו אות</h3><ul class="hp-l">' + rows + '</ul></div>');
    openModal(m);
  }

  // ---------- keyboard
  var gWait = 0;
  d.addEventListener('keydown', function (e) {
    var k = e.key;
    if ((e.ctrlKey || e.metaKey) && !e.altKey && (k === 'k' || k === 'K' || k === 'ל')) { e.preventDefault(); if (pal && !pal.hidden) closeModal(pal); else palOpen(); return; }
    if (k === 'Escape' && drawerOpen()) { setDrawer(false); return; }
    if (e.ctrlKey || e.metaKey || e.altKey || isTyping(e.target) || d.querySelector('.ux-modal:not([hidden])')) return;
    var dlg = d.getElementById('dlg'); if (dlg && dlg.open) return;
    if (gWait && Date.now() - gWait < 1500) {
      gWait = 0; var key = k.toLowerCase();
      var a = Array.prototype.filter.call(d.querySelectorAll('.nav a[data-nav]'), function (a) { var nk = a.querySelector('.nk'); return nk && nk.textContent.split(' ')[1] === key; })[0];
      if (a) { e.preventDefault(); location.hash = a.getAttribute('href'); }
      return;
    }
    if (k === '/') { e.preventDefault(); palOpen(); }
    else if (k === '?') { e.preventDefault(); helpOpen(); }
    else if (k === 't' || k === 'T') { var t = d.getElementById('theme'); if (t) t.click(); }
    else if (k === 'g' || k === 'G') gWait = Date.now();
  });
  var ko = d.getElementById('k-open'); if (ko) { ko.addEventListener('click', palOpen); if (isMac) { var kb = ko.querySelector('kbd'); if (kb) kb.textContent = '⌘K'; } }
  var ho = d.getElementById('help-open'); if (ho) ho.addEventListener('click', helpOpen);

  // ---------- page status bar
  var main = d.getElementById('main');
  function bar() {
    var x = X(), ph = main && main.querySelector('.page-head');
    var old = main && main.querySelector('.pbar');
    if (!x || !ph) { return; }
    var m = x.meta(); if (!m) return;
    var sig = location.hash + '|' + JSON.stringify(m);
    if (old && old.getAttribute('data-sig') === sig && old.previousElementSibling === ph) return;
    if (old) old.remove();
    if (!m.chips.length && !m.json.length) return;
    var el = d.createElement('div'); el.className = 'pbar'; el.setAttribute('data-sig', sig);
    el.innerHTML = '<ul class="chips-s" aria-label="מצב הנתונים">' + m.chips.map(function (c) { return '<li class="chip' + (c.w ? ' warn' : '') + '"><span class="ck">' + bidi(c.k) + '</span> ' + bidi(c.v) + '</li>'; }).join('') + '</ul>' +
      '<div class="pbar-a"><button type="button" class="ibtn sm" data-copy-link><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg><span>העתקת קישור</span></button>' +
      (m.json.length ? '<details class="dl-m"><summary class="ibtn sm"><span class="mono">JSON</span> קובצי הנתונים</summary><ul>' + m.json.map(function (u) { return '<li><a href="' + esc(u) + '" download><span class="ltr mono">' + esc(u) + '</span></a></li>'; }).join('') + '</ul></details>' : '') + '</div>';
    ph.insertAdjacentElement('afterend', el);
  }
  // digits + dashes/dots only (e.g. "2019–2022") must be isolated LTR, or RTL reordering flips the range
  function bidi(s) {
    s = String(s);
    if (/^[\d\s.,:()–\-]+$/.test(s)) return '<span class="ltr">' + esc(s) + '</span>';
    var m = s.match(/^(\d[\d.]*\s+\d{1,2}:\d{2})(.*)$/); // "29.10.2026 18:04 (…)" keep date-then-time order
    return m ? '<span class="ltr">' + esc(m[1]) + '</span>' + esc(m[2]) : esc(s);
  }
  d.addEventListener('click', function (e) { var dm = d.querySelector('.dl-m[open]'); if (dm && !dm.contains(e.target)) dm.open = false; });
  d.addEventListener('click', function (e) { var b = e.target.closest('[data-copy-link]'); if (b) copy(location.href, 'הקישור הועתק'); });

  // ---------- tables: sort + CSV
  function cellText(c) { return (c.textContent || '').replace(/\s+/g, ' ').trim(); }
  function num(s) {
    var t = s.replace(/[\u2212]/g, '-').replace(/,/g, ''), m = t.match(/[-+]?\d+(\.\d+)?/);
    return m && /^\s*[-+]?[\d.,]+\s*(%|‰)?/.test(t) ? parseFloat(m[0]) : null;
  }
  function tables() {
    if (!main) return;
    main.querySelectorAll('table').forEach(function (tb) {
      if (tb.getAttribute('data-ux')) return;
      tb.setAttribute('data-ux', '1');
      var thead = tb.tHead, body = tb.tBodies[0];
      if (!thead || !body || tb.tBodies.length > 1 || thead.rows.length !== 1 || tb.classList.contains('mx')) return;
      if (tb.querySelector('[rowspan],[colspan],.geo-sort,[aria-sort],button,input,select')) return;
      var rows = Array.prototype.slice.call(body.rows); if (rows.length < 4) return;
      if (tb.hasAttribute('data-nosort')) { csvBar(tb, rows.length, 'שורות'); return; } // grouped rows: CSV only, no re-ordering
      var ncol = thead.rows[0].cells.length; if (rows.some(function (r) { return r.cells.length !== ncol; })) return;
      if (rows.length > 18) tb.classList.add('tall');
      rows.forEach(function (r, i) { r._o = i; });
      Array.prototype.forEach.call(thead.rows[0].cells, function (th, ci) {
        var lab = th.innerHTML; th.setAttribute('aria-sort', 'none');
        th.innerHTML = '<button type="button" class="th-s">' + lab + '<span class="si" aria-hidden="true"></span></button>';
        th.firstChild.addEventListener('click', function () { sortBy(tb, ci, th); });
      });
      csvBar(tb, rows.length, 'שורות · מיון בלחיצה על כותרת');
    });
  }
  function csvBar(tb, nr, txt) {
    var wrap = tb.closest('.tbl-wrap') || tb, tl = d.createElement('div'); tl.className = 'tbar';
    tl.innerHTML = '<span class="meta mono">' + nr + ' ' + txt + '</span><button type="button" class="ibtn sm" data-csv><span class="mono">CSV</span> הורדה</button>';
    tl.querySelector('[data-csv]').addEventListener('click', function () { csv(tb); });
    wrap.insertAdjacentElement('afterend', tl);
  }
  function sortBy(tb, ci, th) {
    var body = tb.tBodies[0], rows = Array.prototype.slice.call(body.rows);
    var cur = th.getAttribute('aria-sort'), next = cur === 'none' ? 'ascending' : cur === 'ascending' ? 'descending' : 'none';
    Array.prototype.forEach.call(tb.tHead.rows[0].cells, function (c) { c.setAttribute('aria-sort', 'none'); });
    th.setAttribute('aria-sort', next);
    var fixed = rows.filter(function (r) { return /sum|total|foot/.test(r.className); }), mv = rows.filter(function (r) { return fixed.indexOf(r) < 0; });
    if (next === 'none') mv.sort(function (a, b) { return a._o - b._o; });
    else {
      var allNum = mv.every(function (r) { var t = cellText(r.cells[ci]); return num(t) != null || /^[–\-—]?$/.test(t); });
      mv.sort(function (a, b) {
        var x = cellText(a.cells[ci]), y = cellText(b.cells[ci]), r;
        if (allNum) { var nx = num(x), ny = num(y); if (nx == null && ny == null) r = 0; else if (nx == null) return 1; else if (ny == null) return -1; else r = nx - ny; }
        else r = COLL.compare(x, y);
        return (next === 'ascending' ? r : -r) || a._o - b._o;
      });
    }
    mv.concat(fixed).forEach(function (r) { body.appendChild(r); });
    toast(next === 'none' ? 'הסדר המקורי (אלפביתי) הוחזר' : 'ממוין ' + (next === 'ascending' ? 'בסדר עולה' : 'בסדר יורד'));
  }
  function csv(tb) {
    var q = function (s) { return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    var lines = Array.prototype.map.call(tb.rows, function (r) { return Array.prototype.map.call(r.cells, function (c) { var cl = c.cloneNode(true); cl.querySelectorAll('.sr,.si').forEach(function (s) { s.remove(); }); return q(cellText(cl)); }).join(','); });
    var blob = new Blob(['\ufeff' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }), a = d.createElement('a');
    var name = (location.hash.replace(/^#\/?/, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'home') + '-' + (Array.prototype.indexOf.call(main.querySelectorAll('table'), tb) + 1) + '.csv';
    a.href = URL.createObjectURL(blob); a.download = 'elections-2026-' + name; d.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500); toast('קובץ CSV ירד');
  }

  // ---------- wire up: after every route render + after async content (cities/geo/podcasts) lands in <main>
  var pend = 0;
  function enhance() { pend = 0; try { bar(); tables(); } catch (e) { if (window.console) console.warn(e); } }
  function soon() { if (!pend) pend = requestAnimationFrame(enhance); }
  d.addEventListener('el26:render', function () { setDrawer(false); closeAll(); soon(); });
  if (main && window.MutationObserver) new MutationObserver(soon).observe(main, { childList: true, subtree: true });
  soon();
})();
