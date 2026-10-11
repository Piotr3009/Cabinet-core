# T77 F8 · THE FREEZE AND THE PROOF

Measured on the branch at the F8 commit (the F7 walk commit `64f1874` plus F8's own files), against the base of the turn, `405b98c` (origin/main as the turn found it; its code equals `2766045`, the base of GPT's patch). Each line names the command and its answer; the captured outputs stand beside this file.

| What | How | Answer |
| - | - | - |
| The suite at the start | `npm test` on `405b98c` (never `--silent`) | 6325 tests, 6325 pass, 0 fail |
| After F1 (GPT's patch as it came) | `npm test` on `8ff45c6` | 6355 tests, 6355 pass, 0 fail: nothing red, nothing in GPT's code changed for it |
| The suite at the end | `npm test` on the F8 tree | **6378 tests, 6378 pass, 0 fail**, 0 skipped, 0 cancelled |
| The PRO freeze | `test/turn59-f1-the-switch.test.js` | 67 files frozen, every hash read off disk and equal; 23 EXEMPT entries. Every PRO file edited this turn carries its licence with the owner's words and is re-frozen at its final hash in the commit that edits it: `CncView.jsx` (GPT's entry stays; T77 F7 added), `FrontDecorationControls.jsx` (GPT's entry stays), `CncTree.jsx` (T77 F3), `ConfiguratorPage.jsx` (T77 F3) |
| The engine deltas | `node scripts/t77-classify.mjs` (`f08-classify.txt`) | exit 0. 14 engine and lib files changed or added, every one named (GPT's own reasons word for word on GPT's files, a fragment per F under `scripts/t77-classify.d/`), each licence held to its own commit; 0 reachable by a golden; no read-only file touched; every gate live (`frontDecoration`, `appliedStrips`, `decoratedL`, `ornateRecipe`) |
| The six goldens | `scripts/t64-classify.mjs dump()` against `verify/t70/goldens-base.json` | WARDROBE, BUD, WUD, BUDR, BUDR4, PANTRY: IDENTICAL |
| T75's goldens | `T75_GOLDENS` re-made by `goldenOf` | 16 of 16 byte-identical (CLAUDE.md says nine; the repo lists 16, all checked) |
| T76's decoration file | `fixtures/golden-decorative-fronts.json`, re-made record by record | 6 of 6 (G, GF, A, AH, FL, AM); the four Ornate styles named as proposals, not pinned (THE ORDER 2); the styles agree |
| No old project moves | the six and T75's goldens asked gate by gate | none opens a gate; none carries an `ORNATE_A_*` style |
| The LISP | `node scripts/t72-paren-balance.mjs --against 405b98c` (`f08-parens.txt`) | 17 of 17 at 0/0; `reference/lisp/` against `405b98c`: nothing at all. No LISP was asked for. (The script exits 1 on its own T72 shelf count, 14, against 17 kits, as it did in T76.) |
| The FRONTS BOUNDARY | `git diff --stat 405b98c -- src/engine/{doors,hinges,hingeLadder,handles,splitDoors,shaker,frontDimensions,frontGapClash}.js` | empty: untouched. `test/turn68-f6-f8-hinges-and-one-road.test.js` changes only its two style ORDER lists (F8 took back the header line GPT had added) |
| The lighting | `git diff --stat 405b98c -- src/engine/{ledStrips,lighting,lightRig}.js src/components/LightingPanel.jsx` | empty: untouched |
| `engine/drawings/**` | `git log 405b98c..HEAD -- src/engine/drawings` | one commit, `8ff45c6` (GPT's patch): only GPT's own hunks in `frontDecorationDrawing.js` |
| Retail | `node scripts/t77-copy.mjs --check` (`copy.txt`) | CLEAN: the one named copy (`FrontDecorationControls`) is byte for byte what the T63 machine makes from PRO, re-run after F3 to F6; the other retail files moved are named retail edits with their hunks pinned (`Options.jsx`: GPT's order list, T77 F7's `STYLE_LINES`; `adapter.js`: GPT's `LIVE_STYLES`) |
| The walk | `scripts/t77-walk.mjs` (`walk.txt`), at `c1429c9` | 215 ok, 2 FAIL, 46 notes; 71 frames. The 2 FAILs are F3's target on ORNATE_A_2 (7.12 MB on the base unit's leaf, 6.97 MB on the wardrobe's), said on purpose |
| The reference file sizes | `test/turn77-f3-the-reference-files-shrink.test.js`, the walk's `walk-sizes.json` | A_1 3404575, A_2 7137548, A_3 2816597, A_4 1496217 bytes a 600 x 800 x 18 leaf at the default level (before: 21615843, 38005061, 16713687, 13393108) |
| The copyright lines | `test/turn77-f5-no-copyright-line.test.js` | no file under `src/` or `scripts/` opens with a copyright line; the company line is gone from the 14 files the patch added it to and from the doc; nothing in its place |
| Dashes | every line this turn added, by code point U+2013 and U+2014 | none |

The last commit of the turn deletes `patches/gpt-ornate-a.patch` (CLAUDE.md T77 F1: the patch is packaging, not code; the T71 and T76 precedent).
