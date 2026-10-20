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

## Findings
- md poll baseline (7 outlets 13–19.10) matches IIE 77/77 + added lists 14/14; Wikipedia matches 5 of 7 (IH 15.10 & i24 13.10 not on WP).
- md omitted Maariv 15.10, Ch16 13.10, Walla 19.10 from the 7-outlet window. Site uses all outlets, 7-day window.
- New since md: Ch14 20.10, i24 20.10, Ch16 20.10 (and Walla 19.10, i24 18.10, Ch14 18.10).
- Ra'am was not profiled in md -> ADDED 20.10 via source/additions.json (marked ‡, all positions *). Site now = 13 lists x 10 issues = 130 cells.
- Joint List verified (ynet s100kfzesze, inn 707577, israelielections joint-list): Hadash+Ta'al+Balad, letters ודם, Balad stayed after Abu Shehadeh withdrew (2.10); Awawdeh #4. One column in all polls. No polls fix needed.
- Walla 19.10: fieldwork 19.10, published 20.10. Dates = tracker dates (mostly fieldwork).

## Update procedure (short) – twice-daily routine, 13 lists
- Polls: python3 tools/update_polls.py import-iie --html <saved page> (or add ...). Party ids incl. raam & joint (Joint = one column; do NOT split Balad). Check seats sum 120.
- Ra'am / site additions: edit source/additions.json only (positions need summary, code, full, sourceType, url; star=true unless a written platform appears; keep "(‡)" labels). Then python3 tools/build_data.py -> must print lists 13 / cells 130.
- If the md gets a new version that itself covers Ra'am: remove raam from additions.json lists/positions, rebuild, and drop the ‡ notes.
- After any change: node /workspace/elections-2026-audit/content.mjs (120 md cells must match) + smoke.mjs; bump sw.js VERSION.
- New poll: python3 tools/update_polls.py add ... | import-iie ; bump sw.js VERSION ; commit with git -c user.name=Dudi -c user.email=dudidd@gmail.com ; push.
- Content: copy md to source/platforms.md ; python3 tools/build_data.py ; bump VERSION ; push.
- Audit scripts: /workspace/elections-2026-audit/*.mjs (node_modules symlink -> /tmp/pw/node_modules).
- Local preview server used: port 8937 (8811 is taken by another app on the box).
