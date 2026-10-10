# T76 F8 · THE FREEZE AND THE PROOF

Measured on the branch at the F7 commit (`8d15152`), against the base of the turn, `b810560` (origin/main with T75 merged). Each line below names the command and its answer; the captured outputs stand beside this file.

| What | How | Answer |
| - | - | - |
| The suite at the start | `npm test` on `b810560` (never `--silent`) | 6211 tests, 6211 pass, 0 fail |
| The suite at the end | `npm test` on `8d15152` | **6325 tests, 6325 pass, 0 fail**, 0 skipped, 0 cancelled |
| The PRO freeze | `test/turn59-f1-the-switch.test.js` | 67 files frozen, every hash read off disk and equal; 23 EXEMPT entries. Every PRO file this turn edited (through GPT's patch or after it) carries its licence and is re-frozen at its final hash: AssignMaterialsModal, BomPanel, CncTree, CncView, FrontDecorationControls (new), PartDetailModal, RightPanel, SettingsPanel, WizardSettings, ConfiguratorPage |
| The engine deltas | `node scripts/t76-classify.mjs` (`f08-classify.txt`) | exit 0. 21 engine and lib files changed or added, every one named (GPT's own reasons on GPT's files, a fragment per F under `scripts/t76-classify.d/`); 0 reachable by a golden; no read-only file touched; every gate live (a recipe on the unit, applied strips, a recipe on the L) |
| The six goldens | `scripts/t64-classify.mjs dump()` against `verify/t70/goldens-base.json` | WARDROBE, BUD, WUD, BUDR, BUDR4, PANTRY: IDENTICAL |
| T75's goldens | `T75_GOLDENS` re-made by `goldenOf` | 16 of 16 byte-identical (CLAUDE.md says nine; the repo lists 16, all checked) |
| The tenth golden file | `fixtures/golden-decorative-fronts.json`, re-pinned in F4 | 6 of 6: G 6 V grooves, GF the recess and 6, A 1, AH 1, FL 25 flutes, AM 4 strips; the styles the file pins equal the styles the engine has a recipe for |
| The LISP | `node scripts/t72-paren-balance.mjs --against b810560` (`f08-parens.txt`) | 17 of 17 at 0/0; `reference/lisp/` against `b810560`: nothing at all. (The script exits 1 on its own T72 shelf count, 14, against 17 kits.) |
| The FRONTS BOUNDARY | `git diff --stat b810560 -- src/engine/{doors,hinges,hingeLadder,handles,splitDoors,shaker,frontDimensions,frontGapClash}.js` | empty: untouched |
| The lighting | `git diff --stat b810560 -- src/engine/{ledStrips,lighting,lightRig}.js src/components/LightingPanel.jsx` | empty: untouched |
| `engine/drawings/**` | `git log b810560..HEAD -- src/engine/drawings` | one commit, `26ba367` (GPT's patch): only GPT's own hunks (`frontDecorationDrawing.js` new, `frontElevation.js`, `partDetail.js`) |
| Retail | `node scripts/t76-copy.mjs --check` (`copy.txt`) | CLEAN: the two named copies are byte for byte what the t63 machine makes from PRO; the other retail files moved are named retail edits (FrontThumb, Options, adapter: GPT's and T76 F6/F7's; reasons: T76 F7) |
| The walk | `scripts/t76-walk.mjs` (`walk.txt`) | 186 ok, 0 FAIL, 47 notes; 76 frames |
| Dashes | every line this turn added, by code point U+2013 and U+2014 | none |

The last commit of the turn deletes `patches/gpt-decorative-fronts.patch` (CLAUDE.md T76 F1: the patch is packaging, not code).
