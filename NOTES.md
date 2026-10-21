# NOTES – elections-2026-site
Started 2026-10-20 22:45 (Asia/Jerusalem).
Source: /workspace/elections-2026/platforms.md (canonical). Repo: dudidd-wq/elections-2026, Pages from main root.

## Checkpoints
- [x] parse md -> data/*.json (tools/build_data.py) 22:55
- [x] poll verification + new polls (65 polls 9.9–20.10 from israelielections.com; md 77/77 values match; spot checks vs i24/kipa/walla/ice/wikipedia) 23:05
- [x] site (index.html, css, js) 23:30
- [x] repo + pages: https://github.com/dudidd-wq/elections-2026 -> https://dudidd-wq.github.io/elections-2026/
- [x] audit (/workspace/elections-2026-audit/AUDIT.md): all >=9 (10,10,10,10,10,10,9,9,9,10). SW VERSION v4.
- [x] 20.10 late: Ra'am added (source/additions.json), Joint List verified, full visual redesign (Heebo, dark mode, hemicycle, heatmap, SVG charts). SW VERSION v6-2026-10-21b. Screenshots: /workspace/elections-2026-audit/shots/.

- [x] 21.10 00:13 perf fixes (collator cache, no forced layout, content-visibility) v7; 00:21 mobile nav 4x2 grid v8 (8b59d75). Live tests: smoke/axe 0, content 120/120, raam 10/10, extra OK (offline 130), LH ≥95 (polls mobile noisy under box load).
- [x] AUDIT.md updated (Ra'am/Joint, design critique 3 rounds → 9/9/9/9).
- [x] 21.10 07:15 Dudi: "רע"ם ככל המפלגות" → removed ALL Ra'am-specific notes and the ‡ marker/legend (home banner, profile note, cell/dialog badges, analysis note/tags/cards, rank note, consensus meta note, codes-matrix note, about "מה נוסף באתר" section, Ra'am gap entry, asOf "תוספות האתר", polls addedBySite). Ra'am analysis text now merged INTO the regular items (consensus texts replaced, camps/crossAxis appended, overlaps appended, headings 10–12 מתוך 13, intro 13 lists). '*' kept. SW v9-2026-10-21e. Check: /workspace/elections-2026-audit/noraamnotes.mjs.
- [x] 21.10 08:45 new section "פודקאסטים וראיונות" (#/podcasts, #/podcasts/<list>?issue=<id>): 36 appearances of the 13 list heads, 21.9–21.10.2026, 34 verified quotes. SW v10-2026-10-21a. Audits: smoke/axe 0 errors mobile+desktop, podsmoke.mjs (alphabetical, links, labels, no party colors, Ra'am same structure, overflow 0), content/raam/noraamnotes OK. Critic review (design/neutrality/accuracy/usability) 9/9.5/9/9 after fixes (bidi RLM after Latin runs, neutral audience labels, list index chips + back links, method box affordance, quotes for Bennett/Hendel).
- [x] 21.10 09:10 external audit of podcasts section (/workspace/elections-2026-audit/PODCASTS_AUDIT.md): +11 missed appearances (47 total, 39 quotes), 3 headline-only quotes replaced by verbatim body quotes, blocked aggregator links -> Apple Podcasts, bidi fix (one RLM per Latin phrase; per-word RLM reversed "yt-dlp"), Ra'am-specific gap note + leader-ranking/headline findings removed, stage finding computed from audience labels. SW v11-2026-10-21a.

## Podcasts section (data/podcasts.json)
- Built ONLY by /workspace/podcasts-2026/build.py from /workspace/podcasts-2026/items.py (+ analysis.py). Validate: python3 tools/check_podcasts.py -> "ok: lists 13 items N".
- NOT touched by the twice-daily routine (build_data.py / update_polls.py never read or write it). Routine: leave it alone.
- To update: edit items.py (quotes need verified_by + a source_url / local transcript; run python3 check.py), python3 build.py, report.py, pdf.py, then check_podcasts.py + podsmoke.mjs, bump sw.js VERSION, commit, push.
- Rules: lists alphabetical by name (Intl.Collator he), no ranking, no party colors, every item linked, paraphrase labeled "פרפרזה", quotes labeled with method, Ra'am identical structure, no list-specific notes. Latin runs in Hebrew text get a U+200F after them (build.py _bidi).
- Audit: node /workspace/elections-2026-audit/podsmoke.mjs [BASE] -> errors [] axe {} ; screenshots shots-podcasts/.

- md poll baseline (7 outlets 13–19.10) matches IIE 77/77 + added lists 14/14; Wikipedia matches 5 of 7 (IH 15.10 & i24 13.10 not on WP).
- md omitted Maariv 15.10, Ch16 13.10, Walla 19.10 from the 7-outlet window. Site uses all outlets, 7-day window.
- New since md: Ch14 20.10, i24 20.10, Ch16 20.10 (and Walla 19.10, i24 18.10, Ch14 18.10).
- Ra'am is not profiled in md -> lives in source/additions.json, merged like every other list (NO ‡ / no special notes, per Dudi 21.10; positions * as statement-based). Site = 13 lists x 10 issues = 130 cells.
- Joint List verified (ynet s100kfzesze, inn 707577, israelielections joint-list): Hadash+Ta'al+Balad, letters ודם, Balad stayed after Abu Shehadeh withdrew (2.10); Awawdeh #4. One column in all polls. No polls fix needed.
- Walla 19.10: fieldwork 19.10, published 20.10. Dates = tracker dates (mostly fieldwork).

## Update procedure (short) – twice-daily routine, 13 lists
- Polls: python3 tools/update_polls.py import-iie --html <saved page> (or add ...). Party ids incl. raam & joint (Joint = one column; do NOT split Balad). Check seats sum 120.
- Ra'am: edit source/additions.json only (positions need summary, code, full, sourceType, url; star defaults true – set "star": false on a position if a written platform appears). analysis section: consensusBroad/Partial = full replacement text matched by md label; camps/crossAxis appended; overlaps appended; headings/intro replacements. NEVER add ‡ / "תוספת" / Ra'am-specific disclaimers. Then python3 tools/build_data.py -> must print lists 13 / cells 130 and no WARNING lines (a WARNING = md label changed; fix the label in additions.json).
- If the md gets a new version that itself covers Ra'am: remove raam from additions.json (lists/positions/aliases/analysis/mainSplits), rebuild.
- After any change: node /workspace/elections-2026-audit/content.mjs (120 md cells must match) + smoke.mjs + raam.mjs + noraamnotes.mjs (hits must be {}); bump sw.js VERSION.
- New poll: python3 tools/update_polls.py add ... | import-iie ; bump sw.js VERSION ; commit with git -c user.name=Dudi -c user.email=dudidd@gmail.com ; push.
- Content: copy md to source/platforms.md ; python3 tools/build_data.py ; bump VERSION ; push.
- Audit scripts: /workspace/elections-2026-audit/*.mjs (node_modules symlink -> /tmp/pw/node_modules).
- Local preview server used: port 8937 (8811 is taken by another app on the box).
