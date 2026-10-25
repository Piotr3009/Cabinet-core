# T82 F23 . PROBE: why the sheets did not change with the traced file

The owner, 24.10.2026 (19:34): *"narysowane zawiasy to jakas karykatura, dalem ci przeciez dxf z dokladnymi rysunkami"*.
CLAUDE.md T82 F23 (b): on 25.10 the nine pages of the T81 kitchen were pixel-identical with the traced file in place;
probe the match of `hingeMark` and the projector's `sil` reaching the entity, before any fix.

Reproduce (read only, about 35 s, seven child runs):

    node scripts/t82-probe-f23.mjs           # the rows below
    node scripts/t82-probe-f23.mjs --json    # the same, every instance and sheet

Each run is its own node process with a resolve hook pointing the reader's one import
(`src/engine/drawings/silhouettes.js:82`, `reference/hardware/silhouettes.json`) at the document under test, builds the
T81 kitchen through the store (`scripts/t81-kitchen.mjs`), the nine sheets (`wallDrawingSheets`), and asks the reader
per instance exactly what the projector asks. "Headless" is the engine as a node script finds it (the hinge catalogue
never handed over); "app catalogue" is the engine as the app has it from its first line (`src/App.jsx:25`
`loadHardwareCatalogues()`, `src/lib/hardwareCatalogue.js`). The sheet hash is of what the sheet prints (every entity,
the units' random ids blanked, sorted), so two runs of one input give one hash.

| Run | File | Traced | Hinge catalogue |
| - | - | - | - |
| R1 | T81's committed file (git `d0f84ebe`) | 0 of 45 | not loaded (headless) |
| R2 | the tracer's live output of 25.10 (`verify/t82/silhouettes-live.json`) | 24 of 45: hinge 6, plate 2, runner 15, kit 1 | not loaded (headless) |
| R3 | T81's committed file | 0 of 45 | loaded, 19 rows (the app) |
| R4 | the live output | 24 of 45 | loaded, 19 rows (the app) |
| R5 | the live output, a section C-C chosen through 02 (BUD 800) | 24 of 45 | loaded |
| R6 | the live output, the BUDR2 at depth 460 (the control) | 24 of 45 | not loaded |
| R7 | the committed file after this F (the live output, byte for byte) | 24 of 45 | loaded |

## The table

| # | What | Where (file:line) | Measured | Verdict |
| - | - | - | - | - |
| 1 | The 25.10 observation, reproduced | `scripts/t82-probe-f23.mjs`, R1 against R2 | All nine pages print the same hash with T81's file and with the traced file: 01 3D, 02 Fronts, 03 Without fronts, 04 X-ray, 05 Plan base, 06 Plan wall, 07 Sections A-A, 08 Visualisation, 09 Cut list | Reproduced headless: the pixel-identical pages are a node render |
| 2 | The same two files in the app | R3 against R4 | 01, 02, 07, 08, 09 the same; 03 (311 to 779 entities: 504 plate silhouette lines), 04 (714 to 2226: 576 plate, 1224 hinge), 05 (257 to 581: 39 plate, 303 hinge), 06 (179 to 287: 13 plate, 101 hinge) change | With the catalogue the app hands over, the traced file reaches four pages |
| 3 | `hingeMark`: the door's file, headless | `src/engine/drawings/silhouettes.js:155` `modelBasename(h.spec?.file \|\| resolveDoorHinge(...)?.file)`; `src/engine/hinges.js:253` `hingeAngleFor` `if (!cat) return null`, `:279` `hingeFamilies` `if (!cat) return []`; `silhouettes.js:160` `if (!file) return null` | 12 hinges (01 x3, 02 x6, WU01 x3) and their 12 plates: angle null, file '' (none), no entry matched, mark null | The match never runs: no catalogue, no file. The engine's own law (`engine/hinges.js`: "With no catalogue the answers are null all the way down"), the room's too (no file, no hinge model) |
| 4 | `hingeMark`: the door's file, in the app | the same lines, R4 | thickness 22, angle 155 (the catalogue's rung to 24), file `71B7550_45588965.glb` equals the traced entry `71B7550` (nickel, 155); plate `174E6100.01_42378433.glb` equals the traced `174E6100.01`; 12 of 12 hinge marks and 12 of 12 plate marks are functions | The match is right: the basename of the catalogue's `file` is the entry's `file` |
| 5 | The projector's `sil` reaching the entity | `src/engine/drawings/projector.js:744`, `:755`, `:764` (`sil: silhouetteMark(...)`), `:1042` (`s.sil(view)`), `:1214` (the line with `silhouette: true`) | R4: the lines carry `silhouette: true` and `family` on 03 to 06; R5: the section through the pair carries 123 hinge and 72 plate silhouette lines (700 entities; the same C-C headless: 526, the symbols); the PDF strokes every line (`src/lib/drawingExport.js:214`) | Reaches the entity and the paper |
| 6 | The runner of the section A-A | `src/engine/hardware3d.js:476` (the runner's `length` is the box's `d`); `src/engine/runners.js` `runnerAskFor` (+10), `ladderRungFor`; `silhouettes.js:220` to `:224` | BUDR2 depth 558: box 490, ask 500, rung 500, variant T (`profile.js:4568` `defaultVariant 'T'`, ladder `:4632` 250 to 700); the entry NL500-T is the tracer's fallback "no NL500 T article in the runner manifest: the room draws no runner on this rung (T43 F7) and the BOM prints the named spec"; mark null for all four runners, in every run | No link to fix: the rung the BOM orders has no GLB. The shop's list (`reference/hardware/movento.json`, 40 rows) and the bucket's manifest (40 rows) stop at NL450, and NL450 is S only |
| 7 | The room at that rung | `src/3d/Hardware.jsx:972` to `:981` (`runnerEntry` with the ladder), `:1001` `if (!w.url) return null` | NL500 T: no entry, no URL, no model: the room draws no runner in the BUDR2 | The section's symbol is the BOM's runner (T81 decision 26); a traced NL450 in its place would be a shorter article the workshop never orders: nothing invented |
| 8 | The control: a rung the bucket has | R6, the BUDR2 at depth 460 | box 390, ask 400, rung 400 T, entry `760H4000T_43049000.glb` traced, 4 of 4 marks functions; A-A carries 92 runner silhouette lines (316 to 403 entities); 03 carries 302, 04 312, 05 74 | The runner road works end to end: the section draws the MOVENTO's side silhouette under each drawer |
| 9 | The depths between | the same road: `node scripts/t82-probe-f23.mjs --one --file verify/t82/silhouettes-live.json --depth 500` (and 480, 520) | box 440, ask 450, rung 450 T: the entry NL450-T is the fallback "no NL450 T article in the runner manifest"; mark null | The same data gap one rung down: the shop stocks NL450 in S only |
| 10 | The fronts sheet | `projector.js:934` to `:945` (the bar marks), R1 to R7 | 02: 13 HINGE_MARK rects in every run (12 bars, one per hinge, 6 x 70, and the legend's swatch), no hinge or plate silhouette line in any run | Holds T81's bar (*"2 zawiasy na elewacji wedlug silnika i podobnie jak na moim dxf"*): the traced cups stand behind the leaves and the hidden-line pass hides them |
| 11 | The headless renderers | `scripts/t71-render.mjs`, `scripts/t81-f01-probe.mjs` (no `loadHardwareCatalogues`); `src/App.jsx:25` and `src/retail/main-retail.jsx:216` (both call it) | A node render shows the symbols for every hinge and plate whatever file is committed | A probe or a frame made in node must hand the engine the catalogue first, as the app does |
| 12 | The committed file | `reference/hardware/silhouettes.json` at `d0f84ebe` | 45 entries, 0 traced (T81: the bucket did not resolve that night); the app imports it at build (`silhouettes.js:82`) | The one link that kept every build on the symbols: the traced output of 25.10 was never committed. F23 commits it |

## Verdict

Two causes, neither in the reader's matching or in the projector's wiring:

1. HINGES AND PLATES. The traced file reached no sheet of 25.10 because the pages were rendered where the engine's
   hinge catalogue is never handed over (a node script; the app hands it over at `App.jsx:25`). There `resolveDoorHinge`
   answers no file and `hingeMark` returns null by the engine's law, exactly as the room mounts no hinge model with no
   catalogue. With the catalogue, the match is exact (row 4) and the traced shapes reach the no-fronts sheet, the X-ray,
   both plans and a section through a door unit (rows 2 and 5). The fix is the file itself: committed now (row 12), the
   app's plans and sections draw the traced hinge and plate; the fronts sheet keeps the bar (row 10).
2. THE RUNNER OF A-A. The section A-A cuts the BUDR2, whose 490 box orders the NL500 T; no GLB of that article exists in
   the bucket or in the shop's list, so the tracer named it a fallback and the room draws no runner there. Not a link: a
   model the bucket lacks. The owner's road, no code: upload the MOVENTO NL500 T (760H5000T) and its manifest row, run
   `node scripts/t81-silhouettes.mjs`, commit the file. Row 8 proves the section then draws it with no code change.

## The probe's own output (on this branch, the T81 file read from git)

```
R1 t81 file, headless: git d0f84ebe:reference/hardware/silhouettes.json, traced 0 of 45 {}, hinge catalogue not loaded
R2 live file, headless: verify/t82/silhouettes-live.json, traced 24 of 45 {"hinge":6,"plate":2,"runner":15,"kit":1}, hinge catalogue not loaded
R3 t81 file, app catalogue: git d0f84ebe:reference/hardware/silhouettes.json, traced 0 of 45 {}, hinge catalogue loaded (19 rows)
R4 live file, app catalogue: verify/t82/silhouettes-live.json, traced 24 of 45 {"hinge":6,"plate":2,"runner":15,"kit":1}, hinge catalogue loaded (19 rows)
R5 live file, app catalogue, C-C through 02: verify/t82/silhouettes-live.json, traced 24 of 45 {"hinge":6,"plate":2,"runner":15,"kit":1}, hinge catalogue loaded (19 rows)
R6 live file, headless, BUDR2 depth 460: verify/t82/silhouettes-live.json, traced 24 of 45 {"hinge":6,"plate":2,"runner":15,"kit":1}, hinge catalogue not loaded
R7 committed file, app catalogue: reference/hardware/silhouettes.json, traced 24 of 45 {"hinge":6,"plate":2,"runner":15,"kit":1}, hinge catalogue loaded (19 rows)
ladder 250 270 300 320 350 380 400 450 500 550 600 650 700
instances, R2 live file, headless:
  01 BUD hinge t 22 angle null file (none) entry no entry mark null; plate (none) entry no entry mark null (x3)
  02 BUD hinge t 22 angle null file (none) entry no entry mark null; plate (none) entry no entry mark null (x6)
  DR01 BUDR2 depth 558 runner box 490 ask 500 rung 500 T entry fallback: no NL500 T article in the runner manifest: the room draws no mark null (x4)
  WU01 WUD hinge t 22 angle null file (none) entry no entry mark null; plate (none) entry no entry mark null (x3)
instances, R4 live file, app catalogue:
  01 BUD hinge t 22 angle 155 file 71B7550_45588965.glb entry traced mark function; plate 174E6100.01_42378433.glb entry traced mark function (x3)
  02 BUD hinge t 22 angle 155 file 71B7550_45588965.glb entry traced mark function; plate 174E6100.01_42378433.glb entry traced mark function (x6)
  DR01 BUDR2 depth 558 runner box 490 ask 500 rung 500 T entry fallback: no NL500 T article in the runner manifest: the room draws no mark null (x4)
  WU01 WUD hinge t 22 angle 155 file 71B7550_45588965.glb entry traced mark function; plate 174E6100.01_42378433.glb entry traced mark function (x3)
instances, R6 live file, headless, BUDR2 depth 460:
  01 BUD hinge t 22 angle null file (none) entry no entry mark null; plate (none) entry no entry mark null (x3)
  02 BUD hinge t 22 angle null file (none) entry no entry mark null; plate (none) entry no entry mark null (x6)
  DR01 BUDR2 depth 460 runner box 390 ask 400 rung 400 T entry traced 760H4000T_43049000.glb mark function (x4)
  WU01 WUD hinge t 22 angle null file (none) entry no entry mark null; plate (none) entry no entry mark null (x3)
sheets: entities / printed hash / silhouette lines by family / HINGE_MARK rects / HINGES / RUNNERS
  01 3D
     R1 372 428b7d63defd sil {} bars 0 HINGES 0 RUNNERS 0
     R2 372 428b7d63defd sil {} bars 0 HINGES 0 RUNNERS 0
     R3 372 428b7d63defd sil {} bars 0 HINGES 0 RUNNERS 0
     R4 372 428b7d63defd sil {} bars 0 HINGES 0 RUNNERS 0
     R5 372 d46193086434 sil {} bars 0 HINGES 0 RUNNERS 0
     R6 372 cb85d97e0ee4 sil {} bars 0 HINGES 0 RUNNERS 0
     R7 372 428b7d63defd sil {} bars 0 HINGES 0 RUNNERS 0
  02 Wall A · Fronts
     R1 296 672b7e295c99 sil {} bars 13 HINGES 1 RUNNERS 0
     R2 296 672b7e295c99 sil {} bars 13 HINGES 1 RUNNERS 0
     R3 296 672b7e295c99 sil {} bars 13 HINGES 1 RUNNERS 0
     R4 296 672b7e295c99 sil {} bars 13 HINGES 1 RUNNERS 0
     R5 296 672b7e295c99 sil {} bars 13 HINGES 1 RUNNERS 0
     R6 299 675c9c417519 sil {} bars 13 HINGES 1 RUNNERS 0
     R7 296 672b7e295c99 sil {} bars 13 HINGES 1 RUNNERS 0
  03 Wall A · Without fronts
     R1 311 1266ad82b10c sil {} bars 1 HINGES 37 RUNNERS 7
     R2 311 1266ad82b10c sil {} bars 1 HINGES 37 RUNNERS 7
     R3 311 1266ad82b10c sil {} bars 1 HINGES 37 RUNNERS 7
     R4 779 b864164afc99 sil {"plate":504} bars 1 HINGES 505 RUNNERS 7
     R5 779 b864164afc99 sil {"plate":504} bars 1 HINGES 505 RUNNERS 7
     R6 612 f158f63d90b0 sil {"runner":302} bars 1 HINGES 37 RUNNERS 305
     R7 779 b864164afc99 sil {"plate":504} bars 1 HINGES 505 RUNNERS 7
  04 Wall A · X-ray
     R1 714 e97a636132f3 sil {} bars 1 HINGES 289 RUNNERS 24
     R2 714 e97a636132f3 sil {} bars 1 HINGES 289 RUNNERS 24
     R3 714 e97a636132f3 sil {} bars 1 HINGES 289 RUNNERS 24
     R4 2226 cefaf332ee68 sil {"plate":576,"hinge":1224} bars 1 HINGES 1801 RUNNERS 24
     R5 2226 cefaf332ee68 sil {"plate":576,"hinge":1224} bars 1 HINGES 1801 RUNNERS 24
     R6 1013 3d8173916f3e sil {"runner":312} bars 1 HINGES 289 RUNNERS 320
     R7 2226 cefaf332ee68 sil {"plate":576,"hinge":1224} bars 1 HINGES 1801 RUNNERS 24
  05 Plan · base units
     R1 257 407f4cdf5128 sil {} bars 1 HINGES 19 RUNNERS 6
     R2 257 407f4cdf5128 sil {} bars 1 HINGES 19 RUNNERS 6
     R3 257 407f4cdf5128 sil {} bars 1 HINGES 19 RUNNERS 6
     R4 581 ce377016da94 sil {"plate":39,"hinge":303} bars 1 HINGES 343 RUNNERS 6
     R5 581 ce377016da94 sil {"plate":39,"hinge":303} bars 1 HINGES 343 RUNNERS 6
     R6 327 c31e7c29a29c sil {"runner":74} bars 1 HINGES 19 RUNNERS 74
     R7 581 ce377016da94 sil {"plate":39,"hinge":303} bars 1 HINGES 343 RUNNERS 6
  06 Plan · wall units
     R1 179 ab9de5d25a3d sil {} bars 1 HINGES 7 RUNNERS 0
     R2 179 ab9de5d25a3d sil {} bars 1 HINGES 7 RUNNERS 0
     R3 179 ab9de5d25a3d sil {} bars 1 HINGES 7 RUNNERS 0
     R4 287 6faae281e7ec sil {"plate":13,"hinge":101} bars 1 HINGES 115 RUNNERS 0
     R5 287 6faae281e7ec sil {"plate":13,"hinge":101} bars 1 HINGES 115 RUNNERS 0
     R6 179 ab9de5d25a3d sil {} bars 1 HINGES 7 RUNNERS 0
     R7 287 6faae281e7ec sil {"plate":13,"hinge":101} bars 1 HINGES 115 RUNNERS 0
  07 Wall A · Sections A-A
     R1 316 dbd1513a6444 sil {} bars 1 HINGES 1 RUNNERS 3
     R2 316 dbd1513a6444 sil {} bars 1 HINGES 1 RUNNERS 3
     R3 316 dbd1513a6444 sil {} bars 1 HINGES 1 RUNNERS 3
     R4 316 dbd1513a6444 sil {} bars 1 HINGES 1 RUNNERS 3
     R5 (Wall A · Sections A-A and B-B) 700 aa6ef4436a0e sil {"plate":72,"hinge":123} bars 1 HINGES 196 RUNNERS 3
     R6 403 eb4a2899ba53 sil {"runner":92} bars 1 HINGES 1 RUNNERS 92
     R7 316 dbd1513a6444 sil {} bars 1 HINGES 1 RUNNERS 3
  08 Visualisation
     R1 86 1652bbaa5338 sil {} bars 0 HINGES 0 RUNNERS 0
     R2 86 1652bbaa5338 sil {} bars 0 HINGES 0 RUNNERS 0
     R3 86 1652bbaa5338 sil {} bars 0 HINGES 0 RUNNERS 0
     R4 86 1652bbaa5338 sil {} bars 0 HINGES 0 RUNNERS 0
     R5 86 1652bbaa5338 sil {} bars 0 HINGES 0 RUNNERS 0
     R6 86 1652bbaa5338 sil {} bars 0 HINGES 0 RUNNERS 0
     R7 86 1652bbaa5338 sil {} bars 0 HINGES 0 RUNNERS 0
  09 Cut list and materials
     R1 295 4aa2ebab2b6d sil {} bars 0 HINGES 0 RUNNERS 0
     R2 295 4aa2ebab2b6d sil {} bars 0 HINGES 0 RUNNERS 0
     R3 295 4aa2ebab2b6d sil {} bars 0 HINGES 0 RUNNERS 0
     R4 295 4aa2ebab2b6d sil {} bars 0 HINGES 0 RUNNERS 0
     R5 295 4aa2ebab2b6d sil {} bars 0 HINGES 0 RUNNERS 0
     R6 300 fa163ed309e5 sil {} bars 0 HINGES 0 RUNNERS 0
     R7 295 4aa2ebab2b6d sil {} bars 0 HINGES 0 RUNNERS 0
identical R1 vs R2 (t81 file vs live file, headless): 01 02 03 04 05 06 07 08 09
identical R3 vs R4 (t81 file vs live file, app catalogue): 01 02 07 08 09
```
