# T75 PROBE, PART A (second half): corners F4 to F8

What was probed: everything on main (branch `claude/t75-the-big-turn`, head
`f60d18f`) that F4 (the true L carcass replacing T30's `L_SHAPE`), F5 (the
worktop turning the corner, the cut-outs, the upstand), F6 (plinth and cornice
at the corner), F7 (the corner notch) and F8 (reversibility) will touch. How:
every claim was read at the cited line, and every "measured" value was run,
not deduced, by scratch scripts under the session scratchpad (`p02/bud.mjs`,
`p02/notch.mjs`, `p02/notch2.mjs`, `p02/notchw.mjs`, `p02/lshape.mjs`,
`p02/wt.mjs`, `p02/pl.mjs`, `p02/solid.mjs`). Other T75 writers were editing
the working tree while this ran (cabinet.js, types.js, library.js,
frontClearance.js, runs.js, profile.js, projectStore.js, partRegistry.js,
collision.js, checks.js and some tests are modified, `corners.js` and
`scripts/t75-*.mjs` are new), so EVERY LINE NUMBER BELOW IS HEAD's
(`git show HEAD:path`), and the measurements that matter were run against a
clean `git archive HEAD` export (`p02/sim`, binaries excluded). One extra
experiment: the T30 kasacja was SIMULATED in that export (L_SHAPE type, its
library row and its builder block deleted, `CORNER`/`L_SHAPE` aliased to a
stand-in) and the full suite was run before and after, so the list of tests
the kasacja breaks is measured, not guessed. No file under `src/`, `test/` or
`scripts/` was edited.

Baselines measured:
- Goldens: `scripts/t64-classify.mjs dump()` equals `verify/t70/goldens-base.json` byte for byte at HEAD.
- Suite on the clean HEAD export: 5915 tests, 5893 pass, 22 fail, and all 22 are the tests that read the binaries the export left out (png, glb). Main is green.
- Suite on the live working tree at the time of the first run: 2 failures, both from the then untracked `src/engine/corners.js` (`test/imports.test.js:147` "uses labelOf without importing it"; `test/turn31-f12-sweep.test.js:116` six exports nothing imports). Every new T75 module is held to those two sweeps.
- Suite on the export with the T30 kasacja simulated: 46 fail, 24 of them new (listed under F4, section 2).

## 1. THE PROBE TABLE

| F | thing asked | file:line (HEAD) | function | behaviour on main today (measured where possible) |
| - | - | - | - | - |
| F4 | the T30 type | `src/engine/types.js:486-540` (`L_SHAPE` at 512) | `UNIT_TYPES.L_SHAPE` | `lisp: null`, `legs: false`, `carcass` all four `'none'`, `supports.doors: false`, `corner: true` (531), `ownDepth: true` (534), `defaultsKey: 'cornerUnit.defaults'` (536). `defaultParamsFor('L_SHAPE')` measured: width 1000, height 770, depth 1000, no arm key. |
| F4 | the alias table | `src/engine/types.js:1059-1061`, `:1064-1067` | `TYPE_ALIASES`, `resolveTypeId` | `{ CORNER: 'L_SHAPE' }`, frozen. `resolveTypeId('CORNER')` = `L_SHAPE` (measured). |
| F4 | every reader's resolver | `src/engine/types.js:1144-1151` | `getUnitType` | `UNIT_TYPES[id] \|\| UNIT_TYPES[TYPE_ALIASES[id]] \|\| UNIT_TYPES.WARDROBE`: an id that is neither a type nor an alias SILENTLY becomes a WARDROBE (measured in the kasacja export: an `L_SHAPE` unit with the type deleted and no alias computes a 77 hole wardrobe-shaped BUD stand-in; with no alias at all it would be a wardrobe). |
| F4 | order and prefix | `src/engine/types.js:1069`, `:1233-1241` | `UNIT_TYPE_ORDER`, `UNIT_NUM_PREFIX` | `'L_SHAPE'` sits between `'TWIN'` and `'WUD_GLASS'`; prefix `L_SHAPE: 'CR'` (1240). |
| F4 | the arm input | `src/engine/cabinet.js:997` | `normalizeParams` | `cornerArm = params.corner_arm_mm > 0 ? it : profile.cornerUnit.armMm` (600). The ONLY reader of `corner_arm_mm` in `src/` (grep); no UI writes it, no fixture or script carries it except `test/t39-part-registry.test.js:126` and `scripts/e2e-turn30.mjs:2059` (historic walk, not in the suite). |
| F4 | the profile block | `src/engine/profile.js:1816-1828`, migration `:5214` | `cornerUnit` | `{ defaults: { width: 1000, height: 770, depth: 1000 }, armMm: 600 }`; `armMm` is the ARM DEPTH (the `d` of CLAUDE.md F4), not a width. |
| F4 | the T30 builder | `src/engine/cabinet.js:3376-3436` (gate `if (type.corner && W > 0 && D > 0)` at 3408) | inside `computeCabinet` | Measured at defaults: 8 boards, ALL `role: 'side'`, all `rectGeometry`, 0 drills, 0 hardware, 0 fronts, no plinth even with `plinth: true`, no front even with `doors: true`: `01-BACK-A` 1000 x 770 box x0 z0; `01-BACK-B` 982 x 770 box x0 z18 d982; `01-SIDE-A` 600 x 770 box x982 z0 d600; `01-SIDE-B` 582 x 770 box x18 z982; `01-BOTTOM-A`/`01-TOP-A` 964 x 582 (z18..600); `01-BOTTOM-B`/`01-TOP-B` 564 x 382 (z600..982). `meta.corner` = wallA, wallB, endA, endB, armA, armB. FRAME: back A on `z = 0` (the unit's own wall), back B on `x = 0`, so the adjacent wall is on the unit's LEFT: the T30 L only fits the corner at the START (`x_mm` 0 end) of its wall. There is no mirror for the right-hand corner. |
| F4 | the part helper | `src/engine/cabinet.js:3410-3413` | local `board(id, part, ...)` | The only producer of part name `SIDE` in the engine; `test/t39-part-registry.test.js:275` uses it as the `board()` scan canary and `src/engine/partRegistry.js:409-410` maps `SIDE: 'carcase_side'`. |
| F4 | the library rows | `src/engine/library.js:87`, `:88-90`, `:193-195` | `KITCHEN_LIBRARY` | `l-shape-unit` (kind type, `typeId: 'L_SHAPE'`, hint "no LISP defines its drilling"); held-open `l-shape` ("L-shape joints", `soon`); held-open `l-shape-wall` ("L-shape wall", `soon`). |
| F4 | load and migrate | `src/stores/projectStore.js:1022-1026`, `:1140-1144`, `:1498` | `migrateUnitType`, `migrateUnits`, `loadProject` | `migrateUnitType` rewrites `unit.type` and `params.type` through `resolveTypeId`; it is the first link of the `migrateUnits` chain. Nothing migrates `corner_arm_mm` or any other param of the L. |
| F4 | own depth | `src/stores/projectStore.js:475` | project height params | `type.mount === 'wall' \|\| type.ownDepth` keeps the kit's own depth when the project depth is pushed. |
| F4 | rule 7 type test | `src/engine/frontClearance.js:252-259`, `:272-274`, matrix `:75` | `neighbourOn`, `isCornerType` | `isCornerType` is a STRING compare, `typeId === 'L_SHAPE' \|\| typeId === 'CORNER'`; a migrated unit stored as a new id (for example `CORNER_L_BASE`) answers false, so rule 7 never sees the new L. Matrix value `null` (parked). |
| F4 | non-rectangular CNC outline | `src/engine/puzzle.js:507` (`rectGeometry`), `:535` (`chamferedRectGeometry`), `:1171` (`trimGeometryOnSlope`); `src/engine/cabinet.js:1159-1184` (`notchedPlinth`), `:3044-3060` (slope back) | geometry producers | `cnc.outline` is a free polygon (list of `[x, y]`). Precedents: `notchedPlinth` already cuts L outlines (D/W plinth measured `[[0,80],[600,80],[600,100],[0,100]]`), the slope cut makes 5 to 7 corner backs. |
| F4 | the DXF and the guard | `src/engine/cnc/dxf.js:360`; `src/engine/cnc/edgeGuard.js:44`, `:290` | writer, `panelFindings` | The writer emits `cnc.outline` verbatim. The guard wants one closed CCW loop: an L 900 x 900 with a 300 x 300 bite, written CCW, measured `[]` findings. |
| F4 | the part sheet | `src/engine/drawings/partDetail.js:182` | `detailOutline` | Draws `cnc.outline` as is: an L board would print as an L on the T71 parts card. |
| F4 | the 3D board | `src/3d/panelSolid.js:75-100`, `:151`, `:161`, `:425-451`; `src/engine/socketFace.js:51-74`, `:96`, `:214` | `panelSolids`, `socketNotches`, `notchedOutline`, `tabOutlines` | The solid is built from the RECTANGLE (`cncRect`) plus socket pockets that touch exactly ONE edge plus outline points OUTSIDE the rectangle plus the slope line. Anything cut INTO the rectangle by the outline alone is ignored. Measured: an L outline TOP returns `solid: null` (plain box, bite filled); the D/W's notched plinth also renders as a plain box. The `meta.corners` branch (75) takes exactly 4 corners and triangulates them as a convex quad. |
| F4 | the plan view of a unit | `src/engine/drawings/views.js:243`, `:283` | `buildTopView` | Every panel's box in plan, then a `W x D` rectangle OUTLINE over everything: the L prints as a full rectangle (drawings are read-only, FROZEN 2). |
| F4 | the panel record | `src/engine/cabinet.js:1378-1395` | `panel()` | `area_m2 = w x h`: an L blank's area is its bounding rectangle. |
| F4 | legs | `src/engine/legs.js:7-11`, `:20-40`; `src/engine/profile.js:1408-1415` | `legLayout` | Rectangular only: 4 corners (inset 18 side, 50 front, 50 back, leg 78) plus a centre leg over 1000 wide. NO leg plate drilling anywhere (legs.js:7-11; BUD measured 0 BOTTOM drills): "the leg plate drilling is KIT_BUD's" means zero holes. |
| F4 | wall hangers | `src/engine/cabinet.js:3108-3115` (back cut-outs), `:7672` (side holes) | `computeCabinet` | Two 30 x 58 cut-outs at the back's top corners plus side holes `fromBackEdge [21, 53]` at 53 from the top. |
| F4 | the dog-bone radius | `src/engine/profile.js:477-614`, `:481-486`, `:4279`; `src/3d/panelSolid.js:161`; `src/engine/cnc/rollover.js:137` | `profile.puzzle`, `profile.cnc.toolDiameter` | There is NO cutter radius in `profile.puzzle`: dog bones are rectangular relief pockets (`dogboneHalfHeight` 30 x G). The only cutter number is `cnc.toolDiameter: 8` (radius 4), used by the 3D fillets and the rollover; the `shoulderDepth` comment says the workshop runs a 1/2 inch (12.7, radius 6.35) cutter. CONFLICT for "radius = the puzzle cutter radius". |
| F4 | the LISP set | `reference/lisp/` (14 files); `test/turn35-lisp-parens.test.js:65-68` | paren test | Reads every `*.lsp` in the folder (asserts at least 12): a new file is checked the moment it lands. No corner LISP exists; `KIT_BUD_FULL.lsp` draws `drawBUL`/`drawTOP_ROT90`/`drawBACK` from `SKYLON_COMMON.lsp:696`, `:886`, `:942`. |
| F5 | who takes a worktop | `src/engine/worktop.js:55-58` | `takesWorktop` | `mount === 'floor' && supports.topInfill === false`. Measured: BUD, BUDR2, BUDR, BUDR4, LOW_CABINET, BIN, WINE, TWIN, L_SHAPE, SINK, DW_PANEL, OVEN_BASE. |
| F5 | the gate | `src/engine/worktop.js:84-109` | `worktopEligible` | Measured: two runs on adjacent walls `{ ok: false, why: "These cabinets are on different walls ... one slab cannot turn a corner yet." }` (95); one unit `{ ok: false, why: "A worktop covers a run: select 2 or more base cabinets." }` (`minUnits: 2`, `profile.js:1929`). An L kit alone cannot take a worktop. |
| F5 | the slab | `src/engine/worktop.js:120-167` | `worktopGeometry` | ONE box per record in ONE wall's frame (`wall` = first unit's wall): `x/w` along the wall from `paddedSpan` with 10 side overhang, `z: 0`, `d` = deepest carcass + door gap + front + 20, `y` = carcass top, `h` 38. Measured for two BUD on wall 0: `{ x: 0, w: 1220, y: 870, h: 38, d: 606 }`. No outline, no joint, no cut-out, no per-worktop thickness. |
| F5 | resolution | `src/engine/worktop.js:176-186` | `worktopsFor` | Drops a record with fewer than `minUnits` live units (measured: a one-unit record resolves to 0 slabs). Does not re-ask `worktopEligible`. |
| F5 | the stored record | `src/engine/design.js:164`, `:448-457` | `DEFAULT_DESIGN.worktops`, `migrateDesign` | A WHITELIST: `{ id, unitIds, decor, extendLeft, extendRight, extendFront }`, and `unitIds.length >= 2`. Measured: `joint`, `cutouts`, `thickness` are stripped on every load; a one-unit record is dropped. |
| F5 | store actions | `src/stores/projectStore.js:7880-7899`, `:7902`, `:7912`, `:7921` | `addWorktop`, `removeWorktop`, `extendWorktop`, `worktopsOf` | `addWorktop` runs the gate, REPLACES any record sharing a unit, stores the whitelist shape. `worktopsOf` = `worktopsFor` over `migrateDesign(design).worktops`. |
| F5 | the button | `src/components/MultiUnitPanel.jsx:79-84`, `:351`, `:363` | multi-selection panel | PRO frozen surface (`test/turn59-f1-the-switch.test.js`). |
| F5 | the 3D slab | `src/3d/Scene.jsx:886-921` (box at 916), `:1527-1528`, `:1975-1980` | `Worktops` | One `boxGeometry(w, h, d)` per record, placed on `walls[g.wall]`. |
| F5 | the T71 set | `src/engine/drawings/setPlan.js:149-156`; `setElevation.js:242-247`, `:327`; `setSection.js:97`, `:118`, `:129`; `setPerspective.js:58-75`; `wallSheets.js:131-136`; `setSheet.js:486` | plan, elevation, section, perspective | Every reader takes the slab as `x/w/d` (a quad on the plan, a rect on the elevation, a box in perspective). There is NO worktop sheet in the set (sheet list `wallSheets.js:146-251`), and the set's note says "Appliances and worktop are shown for position only, supplied by others unless stated." |
| F5 | BOM and cut list | `src/engine/bom.js:54` | `buildBom` | Consumes `{ unit, result }` entries and `result.panels`: the worktop reaches NO BOM line, no cut list line, no hardware line today (grep `worktop` in `bom.js`, `bomInvoice.js`, `BomPanel.jsx`: none). |
| F5 | the engine must not read it | `test/turn30-f8-worktop.test.js:237-248` | test | Asserts `cabinet.js` neither imports `./worktop.js` nor matches `/worktopGeometry\|worktopsFor\|worktopEligible\|params\.worktop/`, and `worktop.js` contains no `addDrill\|drills\|cnc.`. |
| F5 | cut-outs | none | none | No cut-out record exists anywhere. The SINK's carcass is `{ top: 'holders', back: 'inset' }` (`types.js:796`, numbers `profile.js:1736`): the "carcass opening" an inset is measured from is not a defined quantity yet. |
| F5 | upstand | none | none | Zero hits for `upstand` in `src/`. The per-run decision grammar it should copy is the plinth's: `params.plinth === true` (`runs.js:1034`), auto parts (`autoparts.js`), run element (`runs.js:1242`). |
| F5 | worktop numbers' home | `src/engine/profile.js:1924-1930`, `:3264` | `profile.autoParts.worktop`, `appearance.worktop` | Existing numbers live in `profile.autoParts.worktop` (thickness 38, front 20, side 10, minUnits 2); `profile.worktop` does not exist (measured `undefined`); the only worktop "material" is a grey colour for the 3D. |
| F6 | plinth segments | `src/engine/runs.js:1034-1062`, `:1079-1103`, `:1242-1253` | `wantsPlinth`, `plinthSegments`, `segmentPlinth`, `runPlinthParams` | Per RUN (`buildRuns`, one wall at a time), measured on CARCASSES. Measured two BUD runs meeting at corner 1 (wall 0 ends at 3000, wall 1 run starts at 650): `a1 { role: owner, offset: 0, length: 1200 }`, `b1 { role: owner, offset: 0, length: 1200 }`: two independent plinths, nothing reaches into the corner, nothing butts. |
| F6 | plinth emission | `src/engine/cabinet.js:4811-4960` (`runPlinth` 4863, strips 4889-4928, single 4929-4959) | `computeCabinet` | Box `x = offset`, `z = D - setback(50) - t`, `y = -plinthH`; `rectGeometry`, or `notchedPlinth` only for a DROP front (4955). The offset may already be any number, so a lengthened owner plinth is expressible without a new field. |
| F6 | the end of a run | `src/engine/runs.js:469-483` (same-wall filter 472), `:556-680` | `nearestVertical`, `runEnd` | Four kinds only: wall, infill, end-panel, open. Verticals are SAME WALL only. Measured: the wall 1 run standing 650 off corner 1 reads `left: { kind: 'open', x: 650 }`, so a top infill or cornice there TURNS and RETURNS to the wall into the corner zone (cornice measured `returns.left: 438` on a WUD). |
| F6 | the cornice corner | `src/engine/cornice.js:256`, `:287-395`, `:420-466`, `:475-486`, `:494-580` (same-wall filter 545), `:587-606`, `:630-670` | `corniceSegments`, `segmentCornice`, `corniceCorner`, `corniceRefusals`, `runCorniceParams`, `corniceOrder`, `corniceSolids` | A "corner" is two segments on the SAME wall finishing flush (wall unit beside a tall unit). Unequal depth beyond `cornerToleranceMm` 2 (`profile.js:2158`) REFUSES with a sentence naming BLOCKERS #92 (461), `mitre: false`, left square. Across two walls nothing is detected: measured WUD at the end of wall 0 and WUD at the start of wall 1: `ends right 'wall'` / `ends left 'wall'`, `corners: null` both, two square stops. `corniceSolids` knows ONE mitre geometry: the front ring slides OUTWARD by the section depth (an external long point, 640-650), plus open-end returns to `backZ`; no internal mitre, no step return piece. `corniceOrder` adds one `mitreAllowance` (100) per mitred end. |
| F6 | the refusal surfaced | `src/stores/projectStore.js:2143-2153` | `refreshAutoParts` | Every `corniceRefusals` sentence becomes a notice. |
| F6 | the profile home | `src/engine/profile.js:2068-2160` | `profile.autoParts.cornice` | `cornerToleranceMm` 2, `mitreAllowance` 100, `minReturn` 60. `profile.cornice` does not exist (measured `undefined`). |
| F6 | the owner's open question | `BLOCKERS.md:1888-1912` (#92), `:650-655` (#33, "Plinth w kształcie L nie został zrobiony", carried to BACKLOG #40), `:1206-1222` (#63) | text | #92 offers "step" and "carry the deeper line and return"; F6 decides `'step'` as a proposed number. |
| F6 | mitres that exist | `src/engine/mitre.js:259-349`; `src/engine/runs.js:531-540` | `infillMitre`, `infillCornerMitre` | `infillMitre`: a 45 degree chamfer at an OPEN end and on returns only (external). `infillCornerMitre`: the side infill meeting the top infill in ONE plane (a frame corner), not a plan corner. No internal plan mitre exists anywhere (needed for the L's top infill and cornice at its inner corner). |
| F7 | anything called a notch | grep `src/` | none | Only `notchedPlinth`, `socketNotches`, `notchedOutline` (unrelated). No `params.notch`, no `CUT CORNER`, no `engine/notch.js`. |
| F7 | the pass order inside `computeCabinet` | `src/engine/cabinet.js:1433` onward | `computeCabinet` | carcass numbers 1464-1471 (`sideW = D - G` 1467), joint inset 1771, side edge flags 2721, BUL/BUR 2742-2840, TOP (roof or level) 2844-2998, D/W rail 2999-3005, free panel 3007-3034, BOTTOM 3035-3042, BACK 3044-3137, oven 3139-3232, sink back 3233-3279, fridge 3280-3375, T30 L 3376-3436, lattice 3438-3492, zones and shelves 3494-3756, partitions 3757-4155, column drawers 4156-4547, bought mechanisms 4548-4804, plinth 4805-4960, mask 4962-5000, top infill 5002-5478, cornice 5479-5521, end panels 5523-5689, vertical infills 5690-5953, fronts 5954-6965 ("Door fronts, always last"), DRILLING PASS STARTS AT 6966 (the `Drills` banner), `const drills = []` at 6967, first loop 7011-7013 copies every panel's own `cnc.holes` into `drills`, later loops ADD computed holes that never read the outline (hinge plates from 7016, shelf holes 7169, the hangers' side holes 7672, partitions 7812, ...), grain 8390, bought inserts and hardware lines from 8511, derived 8915, part edits 8916, final slope filter `cutDrills` 9449-9464, return 9466. |
| F7 | side socket planning | `src/engine/puzzle.js:277-362` (sockets 351-354, screws 357-360, back tab reach 300-302) | `sidePanelGeometry` | Sockets at `socketCentres(w, pz, jointInset)` from the FRONT edge (local x 0 = front); screws at `[50, w/2, w - 50]`; back tabs at `tabCentres(h)`, dropped above `backTabsBelow` (the oven precedent: a reach from the BOTTOM, no "above" twin). |
| F7 | top/bottom planning | `src/engine/puzzle.js:396-435` (centres 403-404) | `topPanelGeometry` | ONE `alongDepth = socketCentres(drawnW)` list used for BOTH long edges, and `alongWidth = socketCentres(drawnH)` for the back edge: symmetric by construction; no per-edge centres can be passed. |
| F7 | back planning | `src/engine/puzzle.js:454-505` (across 461) | `backPanelGeometry` | Sockets on ALL FOUR edges always (no edge flags); across centres `socketCentres(w - 2G) + G`, which assumes a side board at both ends. |
| F7 | the inset rule | `src/engine/puzzle.js:151-163`, `:180-185` | `socketCentres`, `resolvedJointInset` | Inset 95 from each end; one centred socket under `singleSocketBelow` 264.5 or when the CABINET depth is at most 300 (`singleJointMaxDepth`). |
| F7 | panel frames | `src/engine/joinery.js:65` (BUL 69, TOP/BOTTOM 84, BACK 173) | `panelPlacement` | BUL local x 0 = front (unit z = D - x); TOP/BOTTOM local x 0 = back (unit z = 18 + x), local y 0 = left (unit x = 18 + y); BACK local = unit x, y. Used for the socket table below. |
| F7 | a corner notch in 3D | `src/engine/socketFace.js:51-74` | `socketNotches` | A pocket must open onto exactly one edge to become a notch; a corner notch opens onto two and is skipped. |
| F7 | UI precedents | `src/3d/Scene.jsx:1285`, `:1861`; `src/retail/design/Editors.jsx:93`; `src/retail/design/Stage.jsx:120` | T74 F1 side ask | The click on a side reported with its point, and the small anchored modal beside the pointer. |
| F8 | derived run elements | `src/stores/projectStore.js:2003` (`refreshAutoParts`), `:2160-2185` (`runElements`), `:700-722` (`paramsForEngine`, fossils destructured 705-708) | T55 law | `top_infill`, `plinth`, `mask`, `cornice` are recomputed on every sweep, stored in `state.runElements`, never in `params`, merged into the engine params here. Anything derived here is reversible by construction. |
| F8 | stored automat with a record | `src/stores/projectStore.js:2315`, `:2338-2449`, `:2460-2520` | `settleSlopeDoorPartitions`, `undoSlopeDoorFlip` | T74 F11: the automat writes `params.slope_door_auto` (doors, hinge, bay doors as they were, the partition it added, what it wrote); once the cause is gone it undoes ONLY what is still as it wrote it, then drops the record. |
| F8 | the vanishing panel | `src/engine/endPanelAuto.js:115`, `:414-419`, `:434-479`, `:493-495` | `askedSides`, `autoEndPanelJunctions`, `autoEndPanelStrays`, `isAutoEndPanel` | An automat piece carries `auto_added`; strays (no junction any more) are removed; a side the client ASKED for is never taken. |
| F8 | the corner rulebook | none on HEAD | none | `src/engine/corners.js` does not exist on main (it is untracked work in progress in the tree). |

## 2. INTEGRATOR NOTES

### F4 · the true L carcass

Extend:
- Replace the block `src/engine/cabinet.js:3376-3436` (the builder, gated on `type.corner`) with the L builder that mirrors `KIT_CORNER_L.lsp`. Keep the gate on `type.corner`, so no golden can reach it.
- Types: three new kits next to `L_SHAPE`'s slot in `types.js:486-540` and `UNIT_TYPE_ORDER` (1069), and prefixes in `UNIT_NUM_PREFIX` (1240). `TYPE_ALIASES` (1059-1061) becomes `{ CORNER: 'CORNER_L_BASE', L_SHAPE: 'CORNER_L_BASE' }`. That table is load-bearing: `getUnitType` (1150) turns any unknown id into a WARDROBE without a word.
- Migration: `migrateUnitType` (`projectStore.js:1022`) already renames `type` and `params.type` through `resolveTypeId`; add the `corner_arm_mm` mapping as one more link in `migrateUnits` (1140-1144). A T30 save that never typed an arm has NO `corner_arm_mm`: its arm was the profile's 600 at an outer 1000 x 1000. Under the new defaults (arm = base depth, 558) that same save would change shape on load. Pin the arm the save was drawn with (600 when absent), or say in the PR that the shape moves. Nothing was ever cut from it: 8 undrilled boards.
- Handedness: T30's frame puts the adjacent wall at `x = 0` (left). The L's LISP and builder need a hand (start corner or end corner of its wall), or a mirror, before "the L stands in a room corner" can hold at both ends of a wall.
- Rule 7: `frontClearance.js:272-274` `isCornerType` compares strings and will answer false for the new ids. Changing it is a third edit in a FRONTS BOUNDARY file, outside the two licensed lines. The PR must name it, or rule 7 must reach the L through the neighbour-kind line the licence allows. Tests pinned to that exact text: `test/turn31-f10-l-shape-rename.test.js:149` greps `typeId === 'L_SHAPE' \|\| typeId === 'CORNER'`; `test/turn31-f4-front-gaps.test.js:192-194`.
- 3D: no current path draws an L board. Either generalise the `meta.corners` branch (`panelSolid.js:75-100`, today 4 convex corners) to an N-gon through `THREE.Shape` (which takes concave rings), or add a corner notch kind to `socketFace.js notchedOutline` (96) that `panelSolids` cuts with the fillet radius. F7 needs the same, so do it once. The plan view (`drawings/views.js:283`, read-only) draws the L as a rectangle: licence it in the classifier.
- Outline: write every L outline CCW (the edge guard passes it, measured). Set `area_m2` to the polygon's area, not `w x h` (`cabinet.js:1378-1395`), or the BOM overstates the board.
- Legs: `legs.js legLayout` (20) is rectangular. Six legs need an L layout beside it, and the hardware count (`legCount`, 44) must follow it. No leg holes are drilled for any kit.
- Wall version: the hanger cut-outs are written for ONE back (`cabinet.js:3108-3115`, side holes 7672). BACK-A and BACK-B each need their pair.
- Part names: register every new name (for example `TOP-L`, `BOTTOM-L`, `SHELF-L`, `BACK-A`, `BACK-B`, `SIDE-A`, `SIDE-B`) in `partRegistry.js ELEMENT_TO_PART_ID` (405+); otherwise `test/t39-part-registry.test.js:286` fails. Keep one `board(\`...\`, 'SIDE', ...)` call in `cabinet.js`, or the canary at `:275` and the reverse guard at `:348` fail (both measured in the kasacja run). Feed the new kits to the walk (`:126` pattern), or `:359` (at most one unwalked name) trips.

Pattern to copy: the parent-kit "hole for hole" tests of T30 (TWIN, BIN). Use `sidePanelGeometry` for SIDE-A and SIDE-B at depth `d - G`, `backPanelGeometry` for the backs, and `topPanelGeometry` cut to the L outline, with the inner edges plain. Because `topPanelGeometry` cannot take per-edge centres (403), the L top needs explicit centre lists (see F7).

Dog-bone radius: there is no "puzzle cutter radius" field. Choose `profile.cnc.toolDiameter / 2` (4, what the 3D fillets use) or add a proposed `puzzle.cutterRadiusMm` (6.35 for the 1/2 inch the comment at `profile.js:481-486` names). If you add one, mark it `// T75 proposed` and list it in THE NUMBERS PROPOSED; CLAUDE.md's table does not list it.

Arithmetic the owner will see: at the proposed 900 x 900 with an arm depth of 558, each arm's front opening is 900 - 558 = 342 before the overlap rule takes its front_t + clearance.corner (25 + 3 = 28) off door B.

Golden risk: none, as long as the builder stays behind `type.corner` and every new parameter added to `puzzle.js` functions defaults to today's output. `sidePanelGeometry`, `topPanelGeometry` and `backPanelGeometry` build all six goldens. Prove it with `t64-classify dump()`.

Tests the kasacja breaks (measured: the T30 type, row and block deleted, aliases kept; 24 newly failing tests):
- `test/turn30-f19-corner.test.js:57`, `:68`, `:89`, `:101`, `:112`, `:125`, `:150`, `:165`, `:176` (the whole T30 file; `:45` and `:194` survive). Delete the file with the kit.
- `test/turn31-f10-l-shape-rename.test.js:34`, `:45`, `:63`, `:74`, `:85`, `:118`, `:156`, `:176`. `:129` survives (its regex on `frontClearance.js` still matches). Keep the alias half (`:63`, `:74`, `:85` rewritten to `CORNER_L_BASE`), delete the rest.
- `test/turn28-f1-dw-front-rail-plinth.test.js:207` (asserts `getUnitType('L_SHAPE').carcass` all `'none'` at 215; skips `L_SHAPE` by id at 232: the new kits must be added to that skip list or must answer the carcass keys).
- `test/types.test.js:259` (`UNIT_TYPE_ORDER.length === 24`, "three wardrobe kits + 20 kitchen kits + the free panel").
- `test/turn12-library.test.js:33` (base-units ids include `'l-shape-unit', 'l-shape'`; wall-units include `'l-shape-wall'`) and `:66` (the full kitchen type list naming `'L_SHAPE'`, line 75).
- `test/library-categories.test.js:30` (kitchen types list naming `'L_SHAPE'`, line 52).
- `test/t39-part-registry.test.js:259` (the `SIDE` canary, 275) and `:348` (orphan `SIDE` mapping).
Also pinned to the T30 shape, though they did not fail in the simulation: `test/t39-part-registry.test.js:126` (`corner_arm_mm: 900` walk set), the two held-open rows `l-shape` and `l-shape-wall` asserted `soon` at `test/turn12-library.test.js:144`, `:154` and `test/turn30-f19-corner.test.js:191`, and `scripts/e2e-turn30.mjs:2059` (historic, expects `type === 'CORNER'` with 8 parts; not in the suite). No fixture under `fixtures/` names `L_SHAPE`, `CORNER` or `corner_arm_mm` (grep).

### F5 · the worktop turns the corner, the cut-outs, the upstand

Extend:
- `worktopEligible` (`worktop.js:84-109`): admit two runs on ADJACENT walls only through `corners.js cornersOf` (one law), and keep the sentence at 95 for walls that do not meet. No test asserts that sentence (grep): it is free to narrow.
- The L kit alone is refused three times over. `minUnits` 2 is asked in the gate (85-87), in `worktopsFor` (182) and in `migrateDesign` (`design.js:457`). An L record of one unit needs an exemption in all three. `test/turn30-f8-worktop.test.js:179-185` asserts `migrateDesign` drops `{ unitIds: ['a'] }`, and `:147-162` asserts the one-unit refusal `/2 or more/`. Amend them with the licence, or let the L's record carry a kind the exemption reads.
- The record whitelist (`design.js:448-457`) strips every new field on load (measured): add `joint`, `cutouts`, `thickness` (F17's 25), `upstand` and the per-face `extend` (F11) there, or nothing F5 stores survives a reload (DONE station 5).
- Geometry: `worktopGeometry` (120-167) returns one box in one wall's frame. The corner gives two slabs (two frames) and one joint record, and the L gives one L outline. Every reader takes `x/w/d`: `Scene.jsx:886-921`, `setPlan.js:149-156`, `setElevation.js:242-247`, `setSection.js:97-129`, `setPerspective.js:58-75`. The four drawing files are read-only and need classifier licences. Keep `geometry.x/w/d` as the bounding box and add `outline`, so a reader that is not upgraded still draws something true.
- BOM and cut list: `buildBom` (`bom.js:54`) reads `{ unit, result }`. `computeCabinet` may not read a worktop (`test/turn30-f8-worktop.test.js:237-248`). So the slab line, the three connector bolts, the cut-out notes and the readiness `manual` lines must enter as an entry built OUTSIDE `computeCabinet` from `worktopsOf()`, or that test must be licensed. The upstand is different: it can be a run element (`params.run_upstand`) that the engine emits like the plinth. That does not match the forbidden regex, it is golden-safe (absent on the six), and it gives the cut list line for free.
- Upstand pattern: the plinth. A per-unit decision (`params.upstand === true`, like `params.plinth`, `runs.js:1034`) feeds `plinthSegments`/`segmentPlinth` (1044, 1079), then the store sweep (`projectStore.js:2102`), then `runElements` (2160-2185), then `paramsForEngine` (700-722), then an emission beside the plinth (`cabinet.js:4929-4959`) with box `z = -wallGap`, `y = H`. The new role `upstand` must be added to `FINISH_EXPOSED_ROLES` (`cabinet.js:1208`), `wearsFrontMaterial` (1240, if appropriate), `partRegistry` and the BOM role list. "Worktop material" does not exist as a material slot: the worktop is only `appearance.worktop.colour` (`profile.js:3264`) and the record's `decor: null`.
- Cut-outs: the SINK's "carcass opening" must be defined first (the sink has holders, not a top, and an inset back, `types.js:796`). `hob: true` arrives with F14.
- Numbers: the existing home is `profile.autoParts.worktop` (1924-1930). CLAUDE.md names `worktop.cutout`, `worktop.upstand`, `worktop.seatingMm`, `worktop.joint`, `worktop.cnc`. Put them in ONE namespace and say which in the PR.

Golden risk: none for the slab, joint, cut-outs and BOM (no `computeCabinet` involvement). For the upstand, none if it is emitted only when the run element is present.

Tests that assert what F5 changes: `test/turn30-f8-worktop.test.js:147-162`, `:179-185`, `:237-248`, `:287-295` (drops unresolvable records; stays true). `:262` (the scene draws from the engine's geometry in the wall's frame) and `:274` (the button is on the multi-selection) need re-reading once the L and the corner are added.

### F6 · plinth and cornice at the corner

Plinth, internal corner:
- Today two independent plinths stop on their own carcasses (measured).
- Arithmetic, in wall B's frame. Run A's plinth front face stands at `wallGap(10) + D_A(558) - setback(50) = 518` from wall B. A run B unit on the corner stop stands at `d_A_face + postMm = 10 + 558 + 3 + 25 + 50 = 646`. So run B's owner plinth lengthens by 646 - 518 = 128 toward the corner, and its box `x` (the offset at `cabinet.js:4867`) goes to -128. Use the corner's own numbers, not these defaults.
- Put the extension into the element `segmentPlinth` returns (`runs.js:1079-1103`), fed by `corners.js`. Mind the strips: `stripsAtCabinetEdges(runPlinth.spans, ...)` (4885) cuts only at cabinet edges, so the lengthened piece needs a span for the corner stretch.
- The L kit's two plinths: arm B's plinth lies in the adjacent wall's frame. The unit can emit both in its own frame (the `notchedPlinth` precedent shows plinth geometry living in the unit), square butt at the inner corner.

Plinth, external (island) corner: 45 degree outline through `chamferedRectGeometry` (`puzzle.js:535`). The 3D draws it through `mitre.js chamferPlane` (53), as the infill already does.

Run ends:
- `runEnd` (`runs.js:556-680`) has no `corner` kind. An end on a corner stop reads `open` and RETURNS to the wall (measured: 438 on a WUD, inside the post's zone).
- One new kind fed by `corners.js` fixes the top infill (`runTopInfill`, `runs.js:809`) and the cornice together. `runEnd` is the single point.

Cornice `step`:
- `corniceCorner` (`cornice.js:420-466`) refuses unequal depths. With the profile's `cornerMode: 'step'` it returns a mitre plus a step `{ deeper, shallower, returnMm: a - b }`, and the refusal stays for a profile that names no mode.
- `corniceSolids` (630-670) needs three new members: the external mitre at the deeper unit's front corner (the existing outward slide), a return along its side for `a - b`, and an INTERNAL mitre where it meets the shallower run. An internal mitre's long point is on the back face, the opposite slide to today's.
- `corniceOrder` (587-606) must count the return's millimetres and two allowances.
- `runCorniceParams.neighbourOf` (545) stays same-wall for #92's case. The L's inner corner and adjacent-wall corners need a cross-wall neighbour fed by `corners.js`, and no internal plan mitre exists for the top infill either (`mitre.js:259-349` handles external corners only).

Namespace: the cornice numbers live in `profile.autoParts.cornice` (2068-2160). CLAUDE.md writes `profile.cornice.cornerMode`.

Golden risk: none. Run elements and the profile mode are absent on a bare `computeCabinet`, and the six configs carry no `run_cornice` or `run_plinth`.

Tests that assert what F6 changes:
- `test/turn26-f9-cornice.test.js:115-133` (350 against 578 REFUSES, message `/BLOCKERS #92/`), `:181-230` (case 4, the refused corner), `:232-263` (`runCorniceParams` must refuse out loud, `/BLOCKERS #92/`).
- `:265-276` reads the #92 entry in `BLOCKERS.md`.
- If the shipped profile carries `'step'`, those first three flip. Keep them by handing them a profile with no mode ("the refusal sentence stays for the case the profile does not name"), and add the step tests beside them.

### F7 · the corner notch

Where it runs: `engine/notch.js` applied inside `computeCabinet` immediately BEFORE the drilling pass (`cabinet.js:6966`), so every board (carcass, shelves, partitions, plinth, infills, end panels, fronts) exists and the first drill loop (7011-7013) copies only the holes the notch left.
- Gate it on `params.notch` (absent on all six goldens, so byte-identical by construction).
- The computed holes added after 7013 (shelf pins 7169+, hangers 7672, hinge plates 7016+) never read the outline. They need a second filter beside `cutDrills` (9460-9463), the T46 "no hole in air" precedent, against the notch box.

Helpers it needs that do not exist:
- `topPanelGeometry` with per-edge centre lists (today ONE symmetric list for both long edges, `puzzle.js:403`).
- `backPanelGeometry` with edge flags (today sockets on all four edges always, 454-505).
- `sidePanelGeometry`'s `backTabsBelow` has no "above" twin for a partial notch (300-302).
- A corner notch kind in the 3D (`socketFace.js:51-74` skips a two-edge pocket).
- An L-shaped leg layout (the back-left leg of a BUD stands inside a 200 x 200 BL notch).

Spec gaps the LISP must close:
1. A boxed full-height notch has TWO open faces: one parallel to the back at `z = d`, `w - G` long, and one parallel to the side at `x = w`, `d - G` long. CLAUDE.md names one `RETURN (d x h)`; with the default 200 x 200 the two are indistinguishable.
2. Where a partial notch sits vertically (a `LID (w x d)` implies the bottom).
3. What an FL or FR notch does to the door and the hinge plates.

Golden risk: none if gated.

Tests: none assert a notch today. New part names (`RETURN`, `LID`) go into `partRegistry` and the walk (`t39-part-registry.test.js:286`, `:359`).

### F8 · reversibility

One function, three existing patterns:
1. Derive it: put it in `refreshAutoParts` and `runElements` (`projectStore.js:2003`, `2160-2185`, `paramsForEngine` 700-722). The post, the plinth butt, the cornice step and return, the worktop joint and the run end kind go here and are reversible by construction.
2. Stored automat with a record: `slope_door_auto` plus `undoSlopeDoorFlip` (2338-2449, 2460-2520), undoing only what is still as written. The hinge flip at a corner is stored in `params.hinge`/`bay_doors`, so it needs this.
3. Automat-marked pieces: `auto_added` plus strays plus `askedSides` (`endPanelAuto.js:115`, `:434-479`, `:493`). This is the "a panel the client added by hand stays" law.

The blank's `blindMm` (F3) should be DERIVED (a run element) with the client's typed override stored as its own param that the automat never writes. That makes "what the client chose by hand stays" true without a record.

Golden risk: none (store-side).

## 3. THE NOTCH SOCKET TABLE (F7)

Measured: `computeCabinet(defaultParamsFor('BUD', P), P)` on HEAD gives W 600, H 770, D 558, G 18, `sideW` 540, `jointInset` 95 (`resolvedJointInset(558)`), `tabCentres(770)` = [95, 385, 675], `socketCentres(540, pz, 95)` = [95, 445], `socketCentres(564)` = [95, 469], and 77 drills: BUL 8 puzzle + 6 screw + 6 hinge, BUR 8 + 6, BACK 20 puzzle + 14 screw, front 3 cups + 6 cup screws.

Notch: back-left, `w` 200 along the back from the left outer face (unit x 0..200), `d` 200 forward from the back outer face (unit z 0..200), full height. Unit frame: x right from the left outer face, z forward from the back outer face, y up. Mapping through `joinery.js panelPlacement`: BUL local x is measured from the FRONT (unit z = 558 - x); TOP/BOTTOM local x is measured from the BACK (unit z = 18 + x) and local y from the LEFT (unit x = 18 + y); BACK local x, y = unit x, y.

| board | feature (CNC layer) | local position | unit position (x, y, z) | inside the notch | fate |
| - | - | - | - | - | - |
| BUL | back-edge tenon + dog bone (PUZZLE_DOG_BONES), tab 1 | x 540..558, y 65..125 | 0, 95, 0..18 | yes | dropped (no back behind it) |
| BUL | tenon + dog bone, tab 2 | x 540..558, y 355..415 | 0, 385, 0..18 | yes | dropped |
| BUL | tenon + dog bone, tab 3 | x 540..558, y 645..705 | 0, 675, 0..18 | yes | dropped |
| BUL | top socket, front (PUZZLE_SOCKET) + holes 70.5 / 119.5 | x 69.5..120.5, y 761..776 | 0, 768.5, 463 (holes z 487.5 / 438.5) | no | stays |
| BUL | bottom socket, front + holes | x 69.5..120.5, y -6..9 | 0, 1.5, 463 | no | stays |
| BUL | top socket, rear + holes 420.5 / 469.5 | x 419.5..470.5, y 761..776 | 0, 768.5, 113 (holes z 137.5 / 88.5) | yes | RE-PLANNED |
| BUL | bottom socket, rear + holes | x 419.5..470.5, y -6..9 | 0, 1.5, 113 | yes | RE-PLANNED |
| BUL | screws (SCREWS_3MM) at x 50 | y 761 and 9 | 0, -, 508 | no | re-planned with the row (see below) |
| BUL | screws at x 270 | y 761 and 9 | 0, -, 288 | no | re-planned with the row |
| BUL | screws at x 490 | y 761 and 9 | 0, -, 68 | yes | re-planned with the row |
| BUL | hinge plate holes (HINGES_5MM) at x 37 | y 84/116/454/486/654/686 | 0, -, 521 | no | stay |
| TOP and BOTTOM | left-edge tenon at x 95 (into BUL) + dog bone 65..125 | x 70..120, y -18..0 | 0..18, 770 or 0, 113 | yes | RE-PLANNED (mirror of the side) |
| TOP and BOTTOM | left-edge tenon at x 445 + dog bone 415..475 | x 420..470, y -18..0 | 0..18, -, 463 | no | stays |
| TOP and BOTTOM | back-edge tenon at y 95 (into BACK) + dog bone 65..125 | x -18..0, y 70..120 | 113, -, 0..18 | yes | RE-PLANNED (with the back) |
| TOP and BOTTOM | back-edge tenon at y 469 + dog bone 439..499 | x -18..0, y 444..494 | 487, -, 0..18 | no | stays |
| TOP and BOTTOM | right-edge tenons at x 95 and 445 (into BUR) | y 564..582 | 582..600, -, 113 / 463 | no | stay |
| BACK | left-edge sockets at y 95 / 385 / 675 + 6 holes at x 8 | x -6..9 | 1.5, 95 / 385 / 675, 0 | yes | dropped (the BUL no longer reaches the back) |
| BACK | top and bottom sockets at x 113 + holes 88.5 / 137.5 | y 761..776 and -6..9 | 113, -, 0 | yes | RE-PLANNED |
| BACK | top and bottom sockets at x 487 + holes | same | 487, -, 0 | no | stay (re-checked by the re-plan) |
| BACK | side screws at x 9, y 50 / 240 / 530 / 720 | x 9 | 9, -, 0 | yes | they become the back screw row into the RETURN (CLAUDE.md: RETURN and LID screwed on the back screw row) |
| BACK | top and bottom screws at x 68 | y 761 and 9 | 68, -, 0 | yes | re-planned |
| BACK | top and bottom screws at x 300 and 532 | y 761 and 9 | 300 / 532, -, 0 | no | re-planned with the row |
| BUR, front | everything | | x 582..600 or z 561+ | no | untouched |
| legs (assembly) | back-left leg, 78 wide | x 18, z 50 | 18..96, -, 50..128 | yes | must move; `legLayout` cannot |
| shelf pins (BUD with 1 shelf) | back column on BUL | x 470 (bare engine, `columnFromEdge` 70), x 490 (app, `ownerPinSetback` 50) | 0, -, 88 / 68 | yes | re-planned to 358 - 70 = 288 (z 270) or 358 - 50 = 308 (z 250) |
| shelf (BUD with 1 shelf) | SHELF-1 box x 20..580, z 18..538 | | | crosses | takes the notch outline |

WARDROBE 600 x 2150 x 568, measured the same way: BUL's three back tenons (y 95 / 1075 / 2055), its rear socket pair (side-local 455, unit z 113) top and bottom with their 4 holes and the screws at z 68; the TOP and BOTTOM tenons at unit (0..18, z 113) and (x 113, 0..18); the BACK's left sockets (y 95 / 1075 / 2055), its socket at x 113 top and bottom, and the screws at x 9 (y 50 / 585 / 1565 / 2100) and x 68 all fall inside the same notch. The back-left leg (18, 50) does too. The wardrobe's rear socket lands at z 113 for the same reason as the BUD's: `D - (D - G - 95) = 113`.

How the side is re-planned, with numbers:
- The side's run becomes `D - d` = 358 (unit z 200..558); it was `D - G` = 540. Local x 0 stays the front, so the side's own frame does not move.
- The inset stays 95: `resolvedJointInset` asks the CABINET depth (558, over 300), and 358 is over `singleSocketBelow` 264.5.
- `socketCentres(358, pz, 95)` = [95, 263]: front socket unchanged (z 463, holes z 487.5 / 438.5); rear socket moves from side-local 445 (z 113) to 263 (z 295), pocket x 237.5..288.5, holes at 238.5 / 287.5 (z 319.5 / 270.5). Generally the re-planned rear socket lands 95 in front of the notch face, at `z = d + 95`.
- Screws `[50, 179, 308]` (z 508 / 379 / 250); they were [50, 270, 490].
- No back tenons: `edges.backTabs = false`, the `KIT_SINK` side's own flag. The rear edge at z 200 meets the box-out board, which CLAUDE.md fixes as screwed.
- Measured with `sidePanelGeometry({ w: 358, h: 770, G: 18, side: 'L', edges: { backTabs: false }, jointInset: 95 })`: pockets [69.5..120.5] and [237.5..288.5] top and bottom, holes 70.5 / 119.5 / 238.5 / 287.5, screws 50 / 179 / 308.

TOP and BOTTOM, mirroring the side:
- A left-edge tenon must sit where the side's socket is: TOP x = 540 - s. So s 95 gives 445 (unchanged), and s 263 gives 277 (was 95).
- The left edge needs centres [277, 445] while the right edge (into the untouched BUR) keeps [95, 445]. `topPanelGeometry` cannot do this (one `alongDepth` list for both edges, `puzzle.js:403`): it needs explicit per-edge centres.

The back's re-plan depends on where the RETURN stands:
- The back becomes `W - w` = 400 wide (unit x 200..600). `backPanelGeometry(400)` plans its across sockets as `socketCentres(400 - 36 = 364) + 18` = [113, 287] local, unit x 313 / 487.
- If the RETURN stands inside the carcass at unit x 200..218 and the TOP stops against it, the TOP's back edge runs from x 218 to 582 (364 long): `socketCentres(364)` = [95, 269], unit x 313 / 487. This MATCHES the back with no new arithmetic.
- If the TOP's back edge instead runs from x 200 (382 long): `socketCentres(382)` = [95, 287], unit x 295 / 487. This does NOT match the back's 313.
- So the LISP must state the RETURN's position. With the RETURN at `x in [w, w + G]`, `backPanelGeometry(W - w)` and the TOP agree.
- Either way the back's left-edge sockets must be dropped, and `backPanelGeometry` has no flag for that.

A partial notch (height `h` from the floor):
- The side's bottom socket row is re-planned for 358 as above; the top row stays [95, 445].
- A back tenon at centre `c` survives only if its dog bone clears the notch, `c - 30 >= h`. At `h` 200, tab 95 (65..125) is dropped and tabs 385 and 675 stay.
- That is `backTabsBelow`'s mirror (`puzzle.js:300-302`), which does not exist yet.

The notch corner on TOP, BOTTOM and every shelf needs its dog-bone relief. As noted under F4, no puzzle cutter radius field exists: decide 4 (`cnc.toolDiameter / 2`) or a proposed `puzzle` number.
