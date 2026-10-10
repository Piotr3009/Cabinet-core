# T77 F1 PROBE: THE BASE, THE PATCH CHECK, THE COUNT

Written BEFORE the patch was applied (CLAUDE.md T77 F1: *"Commit `verify/t77/f01-probe.md` first: the base SHA, the result of `git apply --check`, the 36 files, and the suite count on the base."*).

## THE BASE

| What | Answer |
| - | - |
| Branch | `claude/t77-ornate-a`, cut from `origin/main` |
| `origin/main` | `405b98c3a681638ee2aa8e0b4abf9d6a28af4ac3` ("1233", the owner's commit of 10.10.2026 22:48: CLAUDE.md T77, CZYTAJ-T77.txt, `patches/gpt-ornate-a.patch`) |
| Its parent | `2766045116637e0b0cc37894d4333290abe0e894` (Merge pull request #75, T76), the patch's own base |
| Code between the two | none: `git diff --stat 2766045 405b98c` names only `CLAUDE.md`, `CZYTAJ-T77.txt` and `patches/gpt-ornate-a.patch` |
| Main moved past the patch's base? | No, in code. The plain `git apply` is the road (no `--3way` needed) |
| The patch file | `patches/gpt-ornate-a.patch`, 2998 lines, sha256 `16adf5d63bf5867b28e36cc5a2ea5a4fc7ba80d6bc1cee7931b049cb8494d772` |

## `git apply --check patches/gpt-ornate-a.patch`

Exit 0, no output: CLEAN on `405b98c`. Nothing was written by the check.

## THE SUITE ON THE BASE, BEFORE ANYTHING WAS TOUCHED

`npm ci`, then `npm test` (`node --test "test/**/*.test.js"`, never `--silent`) on `405b98c`:

| tests | pass | fail | cancelled | skipped | todo | duration |
| - | - | - | - | - | - | - |
| 6325 | 6325 | 0 | 0 | 0 | 0 | 136.6 s |

GPT recorded 6325 on this base; the count agrees.

## THE FILES THE PATCH TOUCHES (36: 14 new, 22 modified)

`git apply --numstat` and `--summary`:

| # | file | kind | lines added | lines removed |
| - | - | - | - | - |
| 1 | `docs/ornate-a-handoff-PL.md` | new | 115 | 0 |
| 2 | `scripts/ornate-classify.mjs` | new | 180 | 0 |
| 3 | `scripts/ornate-export-examples.mjs` | new | 38 | 0 |
| 4 | `scripts/ornate-preview.html` | new | 37 | 0 |
| 5 | `scripts/ornate-render.mjs` | new | 46 | 0 |
| 6 | `scripts/ornate-walk.mjs` | new | 180 | 0 |
| 7 | `src/3d/frontDecorationSolid.js` | modified | 52 | 14 |
| 8 | `src/components/CncView.jsx` | modified | 20 | 10 |
| 9 | `src/components/FrontDecorationControls.jsx` | modified | 15 | 1 |
| 10 | `src/engine/cnc/frontOperations.js` | modified | 67 | 6 |
| 11 | `src/engine/cnc/ornateExport.js` | new | 183 | 0 |
| 12 | `src/engine/design.js` | modified | 4 | 0 |
| 13 | `src/engine/drawings/frontDecorationDrawing.js` | modified | 48 | 24 |
| 14 | `src/engine/frontDecoration.js` | modified | 19 | 3 |
| 15 | `src/engine/frontDecorationBom.js` | modified | 3 | 1 |
| 16 | `src/engine/frontStyleArt.js` | modified | 3 | 0 |
| 17 | `src/engine/ornateFront.js` | new | 350 | 0 |
| 18 | `src/engine/ornateFrontArt.js` | new | 36 | 0 |
| 19 | `src/engine/ornateFrontProfile.js` | new | 33 | 0 |
| 20 | `src/engine/profile.js` | modified | 5 | 0 |
| 21 | `src/lib/cncExport.js` | modified | 59 | 33 |
| 22 | `src/retail/design/Options.jsx` | modified | 1 | 1 |
| 23 | `src/retail/design/adapter.js` | modified | 1 | 1 |
| 24 | `src/retail/design/material/FrontDecorationControls.jsx` | modified | 15 | 1 |
| 25 | `test/design.test.js` | modified | 1 | 1 |
| 26 | `test/ornate-front-cnc.test.js` | new | 243 | 0 |
| 27 | `test/ornate-front-geometry.test.js` | new | 111 | 0 |
| 28 | `test/ornate-front-integration.test.js` | new | 100 | 0 |
| 29 | `test/ornate-front-solid.test.js` | new | 202 | 0 |
| 30 | `test/turn35-f9-project-wide-export.test.js` | modified | 4 | 1 |
| 31 | `test/turn59-f1-the-switch.test.js` | modified | 4 | 4 |
| 32 | `test/turn59-f4-the-options.test.js` | modified | 2 | 1 |
| 33 | `test/turn66-f2-f11-the-steps-and-the-column.test.js` | modified | 2 | 1 |
| 34 | `test/turn68-f6-f8-hinges-and-one-road.test.js` | modified | 3 | 2 |
| 35 | `test/turn76-f4-the-recipes-in-the-profile.test.js` | modified | 1 | 1 |
| 36 | `test/turn76-f6-pro-and-retail.test.js` | modified | 1 | 1 |
| | **total** | | **2184** | **107** |

## WHAT THE PATCH CARRIES THAT THIS TURN MUST CORRECT (read off the patch, before applying)

| CLAUDE.md T77 | What the patch has |
| - | - |
| F3 | `src/engine/ornateFront.js` holds `RELIEF_SAMPLE_MM = 1.0`, `SURFACE_CHORD_MM = 2.0`, `CHORD_ERROR_MM = 0.06` as constants; `ornateSurfaceStl` in `src/engine/cnc/ornateExport.js` writes ASCII STL |
| F4 | `buildOrnateFront` refuses a board thinner than the deepest step plus the skin with its own code `ORNATE_SKIN` and sentence; `boardRefusal` in `src/engine/frontDecoration.js` gets a second branch for the ornate styles |
| F5 | a copyright line naming "Skylon Development Ltd." sits in the head of every one of the 14 files the patch adds: 4 under `src/` (`ornateFront.js`, `ornateFrontProfile.js`, `ornateFrontArt.js`, `cnc/ornateExport.js`), 5 under `scripts/` (`ornate-classify.mjs`, whose header is a 7 line "proprietary and confidential" notice, `ornate-export-examples.mjs`, `ornate-render.mjs`, `ornate-walk.mjs`, `ornate-preview.html`), the 4 `test/ornate-front-*.test.js`, and `docs/ornate-a-handoff-PL.md` |
| F6 | the ornament is `floralMotif()` inside `src/engine/ornateFront.js`, procedural, no slot for a model |

No added line of the patch holds U+2013 or U+2014 (checked code point by code point over every `+` line).
