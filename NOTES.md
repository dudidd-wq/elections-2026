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

## Clip (/clip/) – animated summary of the podcasts section
- [x] 21.10 15:45 /clip/index.html (+clip.css, clip.js, clip-data.js, fonts/): self-running 16:9 motion-graphics clip, 177.5 s, Hebrew RTL, pure HTML/CSS/JS (own rAF timeline, deterministic: frame = f(T); ?t=SEC seek, ?paused=1, ?rec=1 hides controls). Controls: play/pause, scrubber with chapter ticks, Space/K, ←/→ ±5 s, F fullscreen, M generated Web-Audio music (OFF by default). Link from #/podcasts header (.pod-clip). SW v12-2026-10-21a (clip files in CORE).
- Content ONLY from data/podcasts.json via tools/build_clip.py -> clip/clip-data.js (asserts every quote verbatim, numbers computed; audience split parsed from the site's computed finding). After any podcasts.json change: python3 tools/build_clip.py, bump SW.
- Neutrality: 13 list scenes, alphabetical (Intl.Collator he), 8 s = 4 bars each since v14 (guard in clip.js; every list starts on a bar downbeat, so its music bed is identical), identical structure, one verified quote each (QUOTE_PICK in build_clip.py), no counts per list, single neutral accent, no faces.
- [x] 21.10 v2 "broadcast promo" upgrade (SW v13-2026-10-21a): clip/audio.js = generated 120 BPM track (kick/clap/hats, pulsing bass + sub, arp, lead on the drop, risers, whooshes+impacts on every cut, blips on number reveals, build-up -> drop at the findings, breakdown on the gaps, outro). One deterministic score (ClipAudio.score) drives live Web Audio, the offline WAV and the visual beat pulses. Live: audio clock is master. Offline: OfflineAudioContext in 12 s chunks with 5 s pre-roll (~8 s for the whole clip). Per-bar master level events give dynamics (I -15 LUFS, peak -1.5 dBFS).
- Sound: ON unless the browser blocks autoplay -> big "הפעל עם סאונד" overlay (clip runs muted behind it; collapses to a pill after 7 s); ?sound=0 disables. M toggles.
- Visuals: navy base + cyan/violet/magenta/amber accents (no colour mapped to any list; every list scene identical), aurora canvas, particles, AnalyserNode waveform, perspective grid, glass cards, kinetic type (char/word/slam/blur/skew/wipe/flip), glitch on cuts, light leak/flash on impacts, 3D tilt, 47-dot hemicycle -> clusters. prefers-reduced-motion / ?calm=1 = calm fallback; adaptive "lite" mode on slow devices.
- MP4: deterministic frame capture (?rec=1, CLIP.seek per frame at 30 fps) + offline WAV, muxed H.264+AAC (/workspace/clipwork/mp4.mjs).
- Tests: /workspace/clipwork/test.mjs (controls, equal time, alphabetical, verbatim quotes, numbers vs data, colours, overflow sweep, axe, 4 viewports). MP4: /workspace/podcasts-2026/clip.mp4 (rec.mjs + ffmpeg). Frames: /workspace/podcasts-2026/clip-frames/.
- [x] 21.10 external audit fixes (SW v14-2026-10-21a): drop/lists/breakdown/outro moved onto bar downbeats (the v13 drop landed mid-bar, so its crash and level change never fired); list scenes 6.5 -> 8 s (quote at rest >= 4.5 s) with an earlier word reveal; title 10->8 s, stage 12->10 s, topics 11->12 s, index 7->8 s, gaps 11->10 s; total 194 s. Music: lead hook + shaker in the list section (identical per list), crash on every list cut, brighter hats/arp, master fade at the end (v13 ended on a non-zero sample = click), live start restores the master level at the seek point. Visuals: giant outlined alphabet initial behind every list (pseudo-element, not read out), kick-pulsed. 'LIVE' badge -> 'סיכום' (the clip is not live). Sound overlay: blur + darker backdrop so its sub-line is legible over the moving clip. Audit: /workspace/elections-2026-audit/CLIP_AUDIT.md
