# T75 PROBE, PART B: the island F9 to F11

What was probed: everything on main (branch `claude/t75-the-big-turn`, head
`f60d18f`) that an island would touch: the room record and its migration, the
wall records `roomWalls` hands out, every consumer of `roomWalls`,
`wallsInScope`, `wallIndicesInScope`, `wallWidth` and `wallNeighbours`, the
placement path (`addUnit`, the plus points, the library insert, the Wall
dropdown), collision, runs, auto parts, the auto end panel, the plinth, the
worktop, the room's plan and 3D drawing, the lighting rig's reading of walls,
and the golden import graph. How: every claim below was read at the cited
line, and every "measured" claim was run, not deduced, by three scratch
scripts under the session scratchpad (`p03/measure.mjs`, `p03/naive.mjs`,
`p03/graph.mjs`). They build four island FACES by hand in exactly the frame
`roomWalls` gives a real wall, append them after the real walls, and hand them
to the existing engine functions; `naive.mjs` runs a scratch copy of
`room.js` whose `roomWalls` appends faces with no other change, to show which
readers break. No file under `src/`, `test/` or `scripts/` was edited. Other T75 writers were editing the working tree while this ran, so every line number is HEAD's and every measurement was run a second time against a clean `git archive HEAD` export: all 38 measured values and the naive-face output came back identical.

The measured fixture: room 4000 x 3000 (`rectCorners`), island `{ id: 'is1',
cx: 2000, cy: 1500, w: 1800, d: 900, rotation: 0 }`, so the island rectangle
is x 1100..2900, y 1050..1950. Faces, ring order A, E1, B, E2, each with
`inward` pointing away from the island centre:

| face | index | start -> end | along | inward | angle |
| - | - | - | - | - | - |
| A (faces wall 0) | 4 | (2900,1050) -> (1100,1050) | (-1,0) | (0,-1) | -3.1416 |
| E1 (faces wall 3) | 5 | (1100,1050) -> (1100,1950) | (0,1) | (-1,0) | -1.5708 |
| B (faces wall 2) | 6 | (1100,1950) -> (2900,1950) | (1,0) | (0,1) | 0 |
| E2 (faces wall 1) | 7 | (2900,1950) -> (2900,1050) | (0,-1) | (1,0) | 1.5708 |

## 1. THE PROBE TABLE

| F | thing asked | file:line | function | behaviour on main today |
| - | - | - | - | - |
| F9 | room record shape | `src/engine/room.js:34-39` | `DEFAULT_ROOM` | `{ schema: 2, height, corners, openings }`, plus optional `wall_stub_mm` and `boxes`. No `islands` anywhere in `src/`. |
| F9 | does a stored `islands` survive migration | `src/engine/room.js:89-115` | `migrateRoom` | NO. It rebuilds the room from a whitelist (107-114). Measured: `migrateRoom({ ..., islands: [...] })` returns keys `schema, height, corners, openings`; the island is dropped. `normalizeRoom` (122-126) spreads the room and keeps unknown keys (measured: kept). |
| F9 | every road a room takes through `migrateRoom` | `src/stores/projectStore.js:1240, 1335, 1351, 1515, 1585`; `src/components/RoomModal.jsx:271` | cache restore, `setRoom`, `previewRoom`, `loadProject`, new project, the modal's draft `patch` | Islands are lost on reload (1515), on every Room setup edit (RoomModal draft), and on every `setRoom`. |
| F9 | what pins migration | `test/room.test.js:84` | `migrateRoom` idempotence | `assert.deepEqual(migrateRoom(room), room)`: an island field must be emitted only when present (the `boxes` pattern at `room.js:113`), never as `islands: []`. |
| F9 | wall record shape | `src/engine/room.js:136-164` | `roomWalls` | `{ index, start, end, width, along, inward, angle }`. No `length` field (it is `width`). `index` is the array position (142). `inward` is chosen by the polygon centroid (149-152). |
| F9 | the frame law a face must obey | `src/engine/room.js:150-161`; `src/3d/UnitView.jsx:2482` | `roomWalls`; unit mesh rotation `wall.angle + rotationRad` | Measured on all four real walls: `inward === (-along.y, along.x)` and `angle = atan2(-along.y, along.x)`. The 3D view rotates a unit by `angle` only, so its local +Z (its front) lands on `(-uy, ux)`. A face whose `inward` is not the left normal of its `along` would draw the cabinet facing the island while its collision footprint stands outside. The faces in the table above obey the law (measured: all four point out). |
| F9 | face ring order | `src/engine/corners.js:102, 173-177, 255-280` (F1, in flight in the working tree) | `isRoomWall`, `cornersOf` | F1 already filters faces by `!wall.island` and reads an island's external corners as `fa.end` of consecutive faces. The order A, E1, B, E2 above gives `fa.end === fb.start` at all four corners (measured). |
| F9 | face index stability | `src/engine/room.js:142`; `src/stores/projectStore.js:308` | `roomWalls`; `newUnit` | Units store `position: { wall, x_mm, rotation_deg }`, `wall` a bare index. Measured with naive faces: in the 4-corner room face A is index 4; the same room as an L (`lCorners`, 6 corners) puts face A at 6. Draw room, the split button (`RoomModal.jsx:793`) or an island removed ahead of another would silently re-point every island unit. |
| F9 | silent wall-0 fallbacks | 19 sites (section 2, list D) | `walls[i] \|\| walls[0]` | A unit whose `position.wall` has no record is drawn, clamped and auto-parted on WALL 0 with no message. With islands dropped by `migrateRoom`, a reloaded island kitchen would re-home every island unit to wall 0 silently. `roomChangeGuard` (785-824) does catch it ("its wall would no longer exist", measured) but `loadProject` does not run the guard. |
| F9 | scopes with faces appended | `src/engine/room.js:328-387` | `wallsInScope` | Breaks. Scopes `three`, `two`, `wall` read `walls[walls.length - 1]` (352, 374, 383) and `walls[walls.length - 2]` (354) as the LEFT wall. Measured with naive faces: `wall` = `0, 7:E2 (stub 900), 1 (stub 2000)`; `two` = `0, 1, 7:E2 (stub), 2 (stub)`; `three` = `0, 1, 7:E2, 2 (stub), 6:B (stub 1800)`; `room` returns all eight, so `3d/Room.jsx:391` would draw the faces as plaster. |
| F9 | corner topology with faces appended | `src/engine/room.js:192-204` | `wallNeighbours` | Breaks. Ring by `walls.length` (194, 200). Measured: `wallNeighbours(0).prev = 7` (face E2), `wallNeighbours(3).next = 4` (face A). Read by `RoomModal.jsx:242, 248` for the shared-corner ceiling law. |
| F9 | which wall a floor point is in front of | `src/engine/room.js:864-883` | `wallAtPoint` | Frame-agnostic. Measured: (2000, 700) between wall 0 and the island -> face A (distance 350 against wall 0's 700). No live caller: imported at `UnitView.jsx:160`, cross-wall drag removed (`UnitView.jsx:1683-1689`). |
| F9 | island inside the room polygon | none | none | No point-in-polygon helper exists in `src/engine` or `src/lib` (grep). `validateRoomShape` (827-840) checks corners only; `room.boxes` are never validated against the polygon. |
| F9 | the island as an obstacle for units on real walls | `src/engine/collision.js:464-482`; `src/stores/projectStore.js:9089-9094` | `boxSpansOnWall`; `planObstaclesOf` | One function feeds the plan's obstacles to all eight placement and clamp sites (`projectStore.js:4334, 4832, 5179, 5514, 5655, 5727, 9219, 9604`). Measured with the island rectangle passed as a box: wall 0, depth 560 -> `[]` (the island starts at y 1050); depth 1100 -> span 1100..2900, `box: true`. |
| F9 | how deep a unit may be, faces present | `src/engine/collision.js:533-546` | `maxDepthOnWall` | Rays stop at ANY other wall record. Measured: wall 0 at x 1500, w 600: 3000 without faces, 1050 with them (stops on face A). Face A at x 0: 1050 (wall 0). Face E1: 1100 (wall 3). Read by `roomFit.js:146-160` and `clampUnitDepth` (598-631). |
| F9 | room-change guard | `src/engine/room.js:785-824`; `src/stores/projectStore.js:1332-1346` | `roomChangeGuard`; `setRoom` | Checks that each unit's wall record exists and fits its width, and the ceiling. Nothing about islands. `setRoom(..., { replace: true })` clears `openings`, `boxes` and `wallSlopes` (1335-1343, T74 F4). |
| F9 | Room setup plan | `src/components/RoomModal.jsx:194-199, 403-423, 557-589, 592-735, 779-800` | selection `{ kind: 'wall'\|'box' }`, `applyTyped`, the tool row, the plan SVG, the walls list | Boxes are drawn as rectangles (648-685), each side draggable through `moveBoxSide` (`room.js:703`), double click removes; a typed number while picked moves the picked side (keyboard capture, not a field). The `+ Box` button is tombstoned (445-448). `editable = shown.filter(!stub)` (224) gives every listed wall `+ Window`, `+ Door` and split. `room.js:718 moveBox` moves a whole box and has no caller in the modal today. |
| F9 | the clickable dimension label | `src/3d/SpacingChain.jsx:281-286, 367-398`; `src/components/DrawRoomModal.jsx:229-233` | T73 F3 field | `<Html>` field: focus then `select()`, Enter writes, Escape and blur cancel. DrawRoomModal reuses the focus-and-select pattern for its typed length. |
| F9 | retail copies | `scripts/t63-copies.mjs:26-27`; `scripts/t74-copy.mjs:13-15`; `src/retail/design/adapter.js:268` | manifest; copy script; retail project type | `RoomModal.jsx` and `WallElevationModal.jsx` are manifest copies (class names translated). Retail `DrawRoomModal.jsx` is hand-kept since T69. Retail sets `design.projectType: 'wardrobe'`; `getProjectType(id).category` (`projectTypes.js:84-86`) is the family gate; PRO's default type is `'kitchen'` (`projectTypes.js:82`). |
| F9 | rotation grammar | `src/stores/projectStore.js:5684-5703` | `rotateUnit` | `'step'` +90, `'set'`, `'back'` 0, `'side'` 90, normalised mod 360, then re-clamped through `moveUnit`. Nothing rotates an island. |
| F9 | 3D room | `src/3d/Room.jsx:391, 399, 466-478, 521-540, 542-572` | `wallsInScope`, `fullWalls`, floor, boxes, `<Wall>` | Walls drawn = `wallsInScope`; the floor is the corner polygon; boxes are full-height room-tone blocks with `raycast={null}`; each wall gets openings, plan elements and slopes. |
| F10 | adding a unit to a chosen wall | `src/stores/projectStore.js:4106-4380` | `addUnit(typeId, { params, near, side })` | NO wall argument. The wall is the `near` unit's (4313-4318) or the walls in index order (4319-4340), each tried with `freeSlotOnWall` against SAME-wall units and boxes only (4321-4335); refused in words at 4341. Faces appended after the real walls would be tried only once every real wall is full. |
| F10 | the library's place | `src/stores/uiStore.js:221-225`; `src/components/LibraryPanel.jsx:123-135` | `openLibraryToInsert`, `handleAdd` | The insert record keeps only `{ near, side }` and is dropped when `near` is absent (224). |
| F10 | plus points | `src/engine/runs.js:770-807`; `src/3d/Scene.jsx:935-978, 987-1012, 2014-2035` | `addPlusPoints`, `AddPluses`, `FirstPlus` | Pluses come from UNITS (`buildRuns`), so an empty face has none. Measured, two BUD at x 0 and 600 on face A: one plus, right side, gap 600; the left gap is 0. `FirstPlus` is retail only (`onAddFirst`) and sits on wall 0 only. |
| F10 | the Wall dropdown | `src/components/RightPanel.jsx:109, 354-360` | `setUnitWall` select | Lists every `roomWalls` record as `Wall N · width mm`: a face would read `Wall 5 · 1800 mm`. |
| F10 | a face as a run host | `src/engine/runs.js:168-186, 236-255` | `levelGroups`, `buildRuns` | Keyed `${wall}\|${mount}\|${top}`: a face index is a run with no change. Measured: one run on wall 4, 0..1200. |
| F10 | what a run's end is at the face end | `src/engine/runs.js:556-664` | `runEnd` | Rule 1 "the wall itself" at x = 0 and x = wallWidth (565, 608-610). Measured on face A: left end at 0 -> `{ kind: 'wall', x: 0 }`; right end at 1200 -> `open`. Top infill, cornice and mask would finish at an island end as at plaster. |
| F10 | scribe filler at the face end | `src/engine/autoparts.js:202-237`; `src/stores/projectStore.js:2013-2027` | `sideInfill` via `refreshAutoParts` | The face end is read as a wall. Measured: a unit at x 40 on an 1800 face gets a 40 mm left infill. |
| F10 | the stop at a face end | `src/stores/projectStore.js:9304-9325`; `src/engine/collision.js:657-735` | `wallMarginOf`; `clampUnitX` | The margin is the infill width (40, `profile.autoParts.sideInfill.defaultWidth`) or `wallClearance` (10) at EACH end. Measured on face A: min x 40 with the margin, 0 with margin 0. |
| F10 | back gap off a face | `src/engine/runs.js:57`; `src/engine/collision.js:286, 304`; `src/engine/profile.js:4629` | `wallGapOf`, `wallClearance`, `backStandoff` | Every unit stands `wallBackClearance` = 10 off its wall, a face included. |
| F10 | auto END PANEL at a free end | `src/engine/endPanelAuto.js:64-67, 187-224, 285-412` | `setWardrobeEndPanelAuto`, `sideIsVisible`, `autoEndPanelSites` | Kitchen pass (295-336) = step junctions only (`autoStepMm` 300); the free-end pass (346-406) runs only for wardrobes and only when retail switched it on. Measured: a lone BUD on a face in PRO -> `[]`, NO panel at a kitchen free end today. `sideIsVisible(unit, 'L', null, { atWall: false })` -> visible, "free end"; `{ atWall: true }` -> not visible, "wall". Retail wardrobe on index 4 today: `wallWidth(room, 4) = 0`, so atWall is false and it gets panel R "free end". |
| F10 | the auto panel's store side | `src/stores/projectStore.js:2906, 2992, 3045-3110, 3113` | `settleLayout`, `autoEndPanelStrays`, `autoEndPanelJunctions`, `addEndPanel` | Junctions are computed with `{ room }`; each panel is `addEndPanel(unitId, { side })` on ONE unit. |
| F10 | end panel depth | `src/engine/cabinet.js:5567-5600` | end panel build | Per unit `params.end_panels` `{ side, thickness, height, below_mm, top_mm }`. Depth is COMPUTED: `wallGap + inset_back + D + doors.gap + front_t` (5567-5569). No per-panel depth, so a panel "sized to the whole island depth" has no host on a unit. |
| F10 | a standing board with its own size | `src/engine/types.js:198-223`; `src/engine/freePanel.js:58-73, 80-96` | `FREE_PANEL` | `freePanel: true`, `mount: 'wall'`, own length, width, thickness, facing and tilt; skipped by `levelGroups` (`runs.js:176`). The only host on main for a board that belongs to no carcass. |
| F10 | plinth per face | `src/engine/runs.js:1044-1104, 1242-1253` | `plinthSegments`, `segmentPlinth`, `runPlinthParams` | One plinth per run, carcass span, no mitre field. Measured, two plinthed BUD on face A: owner length 1200, offset 0. |
| F10 | external corner geometry | `src/engine/collision.js:497-526` | `wallObstacles` | Units stand OUTSIDE the island rectangle (measured footprint of a BUD 600 x 560 at x 0 on face A: x 2300..2900, y 490..1050). Units on adjacent faces never meet: from E2's frame, A's corner unit spans u 900..1460, which is past E2's 900 width, so it is skipped (519-520). Every island corner is an empty depth x depth square, so no plinth (or worktop edge) can mitre there unless a face or run reaches past the rectangle. |
| F10 | back to back | `src/engine/collision.js:497-526` | `wallObstacles` | Measured: face A does not see a unit on face B (behind it); a wall 0 unit 560 deep at x 2300..2900 sees the island unit on A (`corner: true`), and at depth 400 does not. Face A sees the wall 0 unit back. The obstacle arithmetic needs no change. |
| F10 | front clearance at a face end | `src/engine/frontClearance.js:262-268, 340-347`; `src/stores/projectStore.js:7970, 8059` | `neighbourOn` | `toWall` is `wallWidth - edge` to the right but plain `edge` to the left: a front within reach of a face START reads `NEIGHBOUR.WALL` whatever `wallWidthOf` returns. The store's `wallWidthOf` returning null for a face fixes the right side only. FRONTS BOUNDARY: the file is licensed for rule 7 and the two L kinds only. |
| F11 | one slab across faces | `src/engine/worktop.js:84-105` | `worktopEligible` | Refuses different walls (95). Measured across face A and face B: "These cabinets are on different walls ... one slab cannot turn a corner yet." One face: ok. |
| F11 | slab geometry | `src/engine/worktop.js:120-167` | `worktopGeometry` | ONE wall frame: `{ wall, x, w, y, h, z: 0, d }`, flush at the wall (no back overhang), sides +10 past `paddedSpan`, front +20 past the door plane. Measured one face: `{ wall: 4, x: -10, w: 1220, y: 870, z: 0, d: 606 }`. |
| F11 | worktop records | `src/engine/design.js:164, 446-450`; `src/stores/projectStore.js:7880-7928` | `design.worktops`, `addWorktop`, `extendWorktop`, `worktopsOf` | Record `{ id, unitIds, decor, extendLeft, extendRight, extendFront }`; `extendFront` is ONE number per slab. |
| F11 | where a slab is drawn | `src/3d/Scene.jsx:886-918`; `src/engine/drawings/setPlan.js:150-157`; `setElevation.js:242-260, 326-330`; `setPerspective.js:75`; `wallSheets.js:136` | `Worktops`, plan, elevation, perspective, set sheets | Every reader places the slab in `walls[g.wall]`'s frame (`Scene.jsx:891`, `setPlan.js:151` with `\|\| walls[0]`). An island slab spanning faces has no frame to be drawn in. |
| F11 | slab in BOM and cut list | `src/engine/bom.js`, `src/engine/cnc/**`, `src/components/BomPanel.jsx` (grep) | none | The worktop is in NO BOM line and NO cut list line on main: a design-layer part drawn in 3D and on the drawing set only. |
| F11 | numbers | `src/engine/worktop.js:61-70`; `src/engine/profile.js:1924` | `worktopSpec` | thickness 38, front 20, side 10, `minUnits` 2. |
| F9-F11 | lighting rig reading walls | `src/engine/lightRig.js`, `src/engine/lighting.js` (grep: no `room`, no `walls`); `src/3d/Scene.jsx:366-390, 451-462, 1199-1210` | `ShadowFit`, bands, pillars | The rig modules read no wall. The scene groups units by `position.wall` into runs (1199-1207), so a face run gets its own band and pillar with no change. Bands and pillars are offset toward +Z / +X whatever the wall's `inward` (380-382, 461-462), as they already are on walls 1 and 2. FROZEN 2: report only. |
| all | golden reach | `scripts/t64-classify.mjs:59-60`; `src/engine/cabinet.js:132-138` | `computeCabinet(defaultParamsFor(type, P), P)` | `defaultParamsFor` carries no `position` and no `wall` for any of the six (measured). Import graph from `cabinet.js` + `types.js` (46 modules on HEAD, measured): `room.js`, `collision.js`, `worktop.js`, `endPanelAuto.js`, `shareOut.js`, `roomFit.js` NOT reached; `runs.js`, `autoparts.js`, `cornice.js` reached, but `cabinet.js` imports only `wallGapOf, impliedLegHeight, maskDepthExtra, standsOnLegHeight`, `endPanelDrop, endPanelHeightDefault`, and `corniceOption, corniceOrder, corniceProjection, corniceRise, takesCornice`. |

## 2. THE roomWalls CONSUMER LIST

Every caller of `roomWalls`, `wallsInScope`, `wallIndicesInScope`,
`wallWidth` (the function, not the many parameters of that name) and
`wallNeighbours` in `src/`, plus the engine functions that receive the `walls`
array from them. TREAT = the face is a place to stand units there. SKIP = the
face is not plaster and that reader must not see it (filter `!w.island`, or
pass a non-wall answer). The recommendation follows CLAUDE.md F9's two lists.

### A. `src/engine/room.js` itself

| file:line | function | what it does with a wall | island face |
| - | - | - | - |
| `room.js:168` | `wallWidth` | `roomWalls()[i].width` | TREAT (a face index answers the face width); its one engine caller below decides wall-ness |
| `room.js:193` | `wallNeighbours` | ring topology, who meets whom | SKIP: real walls only (measured break above) |
| `room.js:329` | `wallsInScope` | the walls DRAWN and OFFERED, stubs cut from `walls[length-1]`, `walls[length-2]`, `walls[2]` | SKIP: compute on real walls, never return a face (measured break above) |
| `room.js:397` | `wallIndicesInScope` | the indices a scope shows | SKIP (follows `wallsInScope`) |
| `room.js:469` | `moveWall` | moves one wall along its normal, corners only | SKIP: an island moves as a box (`moveBox`, 718) |
| `room.js:515` | `setWallLength` | corners only | SKIP |
| `room.js:683` | `wallPlanObstacles` | chimneys and recesses on `walls[el.wall]` | SKIP: no plan elements on a face |
| `room.js:741` | `clampOpening` | windows and doors on a wall | SKIP: no openings on a face |
| `room.js:786` | `roomChangeGuard` | each unit's wall exists and fits | TREAT (a face unit must still find its face); add: island inside the polygon, island removal with units refused |
| `room.js:864` | `wallAtPoint` | nearest wall in front of a floor point | TREAT if a caller ever returns (none today) |

### B. Engine consumers

| file:line | function | what it does with a wall | island face |
| - | - | - | - |
| `endPanelAuto.js:363` | `autoEndPanelSites` wardrobe pass | `wallWidth(room, i)` for `atWall` at the run's right end | SKIP wall-ness: `atWall` false at a face end (a face end is a free end) |
| `roomFit.js:126-138` | width refusal | unit width against `walls[i].width`, message "wall N is" | TREAT (face width); the message names "wall N", needs the face's own name |
| `roomFit.js:146-160` | depth refusal | `maxDepthOnWall` from this wall | TREAT (measured 1050 off face A) |
| `roomFit.js:179-195` | wall gap refusal | `maxDepthOnWall` | TREAT |
| `collision.js:411, 440, 497, 533, 598` | `unitFootprint`, `spanInWallFrame`, `wallObstacles`, `maxDepthOnWall`, `clampUnitDepth` (walls passed in) | frame arithmetic, obstacles in every other wall's frame | TREAT: measured correct for faces with no edit |
| `runs.js:770` | `addPlusPoints` (walls passed in) | gap to the wall end | TREAT (host) |
| `runs.js:682` | `runEndGap` (wallWidth passed in) | gap to the wall ends at 0 and width | TREAT (the face end bounds the plus gap) |
| `runs.js:556` | `runEnd` (wallWidth passed in) | rule 1: end at the wall | SKIP rule 1 on a face (measured `kind: 'wall'` today) |
| `runs.js:963` | `runInfillParams` (walls passed in) | wall width for the run's top infill | TREAT host, SKIP the wall end (via `runEnd`) |
| `shareOut.js:419` | `shareOutRunFor` | `walls[run.wall].width` for wall-to-wall share-out | TREAT: shares a face run out to the island length, with margin 0 |
| `cornice.js:561` | `runCorniceParams` | wall width for each segment's ends | TREAT host (a base island has no cornice) |
| `frontClearance.js:342` | `frontClearances` via `wallWidthOf` | front to wall end clearance | SKIP the wall end (store side); left-edge limit noted in section 1 |
| `dimensions.js:99` | `roomDistances` (Scene's measured rows) | corner to first unit, last unit to far corner, kind `'wall'` | SKIP the two corner arrows on a face ("not dimensioned as walls"); unit to unit arrows TREAT |
| `drawings/setPlan.js:48` | `measurePlan` | plan extent from wall ends | SKIP (the island is inside the room) |
| `drawings/setPlan.js:86` | `roomFabric` | BUILDING cut line plus openings per wall | SKIP: a face is not a cut wall |
| `drawings/setPlan.js:134, 151, 183` | plan units and worktop | `at(wall, u, v)` through each unit's wall frame | TREAT |
| `drawings/setSheet.js:364` | `keyPlan` | key plan extent | SKIP |
| `drawings/setElevation.js:50` | `wallOf` | the wall's width and ends behind a run | TREAT as the group host, SKIP the wall ends |
| `drawings/setPerspective.js:103` | `buildPerspective` | floor, wall ends and ceiling lines | SKIP the building lines |
| `drawings/wallElevation.js:515` | `buildHorizontalSection` | the room's walls in red, cut | SKIP |
| `drawings/wallElevation.js:550` | section units | unit through its wall frame | TREAT |
| `drawings/wallElevation.js:82-113` | `wallGroups` (by `position.wall`) | one elevation sheet per wall with units, labelled `wallLabel(i)` (46-49): index 4 prints "E" | TREAT host, label decision (FROZEN 2: `engine/drawings/**` is read-only unless licensed) |

### C. Store `src/stores/projectStore.js`

| file:line | caller | what it does with a wall | island face |
| - | - | - | - |
| `669`, `687` | `ceilingOverPiece`, `slopeCutFor` | slopes per wall index | SKIP (no slopes on a face; both already answer roomH / null) |
| `2006-2027` | `refreshAutoParts` | wall width into `autoPartsFor` -> `sideInfill` | TREAT host, SKIP the infill (none on a face) |
| `2080-2093` | `runCutOf` in `refreshAutoParts` | slope line of the run's wall | SKIP (no slopes) |
| `4161-4340` | `addUnit` | walls in order, free slot per wall | TREAT only when the face is chosen (a `wall` option); SKIP faces in the go-round-the-room fallback |
| `4822` | `unitSizeBoundsFor` | width and depth clamps on the wall | TREAT |
| `5144` | `updateUnitParams` | clamps on the wall | TREAT |
| `5502` | `moveUnit` | `wallObstacles`, `clampUnitX` with `wallMarginOf` | TREAT, margin 0 on a face |
| `5621` | `moveUnitToWall` | re-home and free slot | TREAT |
| `5715` | `setUnitWall` | re-home and free slot | TREAT |
| `7965-7971` | `frontClearances` | `wallWidthOf` | SKIP the wall end |
| `8052-8059` | `runChecks` | `wallWidthOf` | SKIP the wall end |
| `9211` | `freeBesideUnit` | free room beside a unit, labelled "the wall" | TREAT host, the label must not say wall |
| `9284` | `shareOutSubject` | share-out context | TREAT |
| `9574` | unit issues | room-level issues on the wall | TREAT |
| `9089-9094` | `planObstaclesOf` (no `roomWalls`, but THE obstacle list) | boxes plus blocking plan elements | the island rectangle belongs here, so every real-wall placement refuses it |

### D. UI and 3D

| file:line | caller | what it does with a wall | island face |
| - | - | - | - |
| `components/RightPanel.jsx:109, 358-360` | Wall dropdown | one option per wall | TREAT (option), named for the island face, not "Wall 5" |
| `components/RoomModal.jsx:216, 223, 224, 242, 248, 348` | plan, scope, editable list, corner heights, wall drag | walls drawn, listed, dragged, given windows and doors | SKIP; the island is its own plan object (retail copy: same lines) |
| `components/WallElevationModal.jsx:99-100` | elevation | one wall's elevation | SKIP (no face elevation this turn; retail copy 115-116) |
| `components/DrawRoomModal.jsx:262, 488-490` | "The project's room has N walls today" | count of walls | SKIP (retail hand copy 390) |
| `3d/Scene.jsx:1462` -> `1700, 938-944, 891, 838`, `ShareOutBar.jsx:81` | units, pluses, worktops, clash marks, share-out bar | world placement through the wall frame | TREAT |
| `3d/Scene.jsx:1199-1207` | `ShadowFit` runs for the light bands | groups units by `position.wall` | TREAT (FROZEN lighting, unchanged) |
| `3d/Room.jsx:391, 399` | walls drawn, stub offsets | plaster | SKIP |
| `retail/design/adapter.js:589, 597, 708, 757` | `wallsShown`, `wallWidth` | retail's walls | SKIP (retail never meets an island) |
| `lib/slopeLine.js`, `lib/wallElements.js`, `lib/slopeFlat.js` | take a `wallWidth` number only | slopes, openings, plan elements | SKIP (none on a face) |

The 19 silent wall-0 fallbacks (`walls[i] || walls[0]`): `projectStore.js:2013,
4823, 5146, 5504, 9212, 9576`; `WallElevationModal.jsx:100` (retail 116);
`roomFit.js:127, 147, 180`; `drawings/wallElevation.js:550`;
`drawings/setPlan.js:151, 183`; `3d/Scene.jsx:838, 891, 944, 1700`;
`3d/ShareOutBar.jsx:81`.

## 3. INTEGRATOR NOTES

### F9 · the island entity

1. **Room record.** `migrateRoom` (`room.js:89-115`) must carry islands the
   way it carries boxes: a `migrateIsland` normaliser (id kept or minted, `cx`,
   `cy`, `w`, `d` real and floored like `MIN_BOX_SIZE`, `rotation` snapped to
   0/90/180/270) and `...(islands.length ? { islands } : {})` after line 113,
   so `test/room.test.js:84` still holds and every old project migrates to
   "none". Without it the island is lost on `loadProject` (1515), in the
   Room setup draft (`RoomModal.jsx:271`) and on every `setRoom`.
2. **Faces.** `roomWalls` (136-164) appends, after the real walls, four records
   per island with the same keys plus `island` and `face`. The frame law is
   load-bearing: `inward = (-along.y, along.x)`, `angle = atan2(-along.y,
   along.x)`, which means the island is walked in the OPPOSITE turn to the room
   (A, E1, B, E2 as in the table at the top). That order also satisfies the
   in-flight `corners.js:255-280` (`fa.end === fb.start`). For `rotation` 90 or
   270, `w` and `d` swap in plan; rotate the four corners about `(cx, cy)` and
   build the faces from them, so A is always the long face that started on the
   island's own "front".
3. **Readers that must filter `!w.island` first:** `wallsInScope` (330),
   `wallNeighbours` (193), and from section 2 every SKIP row. One private
   `realWalls(room)` in `room.js` that both `roomWalls` and these two use is
   the smallest change; `wallsInScope` then never returns a face and
   `3d/Room.jsx`, `RoomModal.jsx`, `wallIndicesInScope` and retail follow with
   no edit of their own.
4. **Index stability.** A face index is `n + 4k + f` and moves when the room's
   corner count changes (measured 4 -> 6) or an earlier island is removed.
   Either store a stable reference on the unit (`position.island`,
   `position.face`) and re-derive `position.wall` in `setRoom` (1332), in
   `loadProject` (1515) and on island add or remove, or refuse every room edit
   that changes the corner count while island units exist. Otherwise the 19
   fallbacks above re-home them to wall 0 with no message.
5. **Room refuses first.** No point-in-polygon exists: add one (pure, in
   `room.js`). `roomChangeGuard` should refuse a room edit that leaves an
   island outside the polygon and an island delete while units stand on its
   faces (it already says "its wall would no longer exist" for the second).
   Island footprint against units and boxes: feed the island rectangle through
   `planObstaclesOf` (`projectStore.js:9089`) and every placement and clamp on
   the real walls refuses it by the existing box path (measured); the island's
   own move is checked against `unitFootprint` of every unit and `boxCorners`
   of every box.
6. **UI.** RoomModal's plan selection gains `kind: 'island'` beside `'wall'`
   and `'box'` (194-199); whole-island drag is `moveBox` (`room.js:718`), the
   typed move is `applyTyped` (403-423), the clickable dimension follows
   `SpacingChain.jsx:281-286`. `ADD ISLAND` goes in the tool row (557-589)
   gated by `getProjectType(design.projectType).category === 'kitchen'`
   (retail is `'wardrobe'`, `adapter.js:268`), defaults from
   `profile.island.defaults` (1800 x 900). `RoomModal.jsx` is PRO frozen
   (`test/turn59-f1-the-switch.test.js:151, 231`) and a manifest copy: EXEMPT
   plus `scripts/t75-copy.mjs`. Rotation: `rotateUnit`'s grammar
   (`projectStore.js:5684-5703`) applied to the island record.

### F10 · units on the faces, the ends, the panels

1. **Placement.** `addUnit` needs an explicit target: `addUnit(typeId, {
   wall: faceIndex })`, tried first and alone, the way `side` makes the
   beside-wall the only one tried (4313-4318); `uiStore.openLibraryToInsert`
   (221-225) must keep `{ wall }` when there is no `near`; LibraryPanel
   (123-127) passes it. An empty face needs a plus of its own: `FirstPlus`'s
   arithmetic (`Scene.jsx:987-1012`) per empty face, in PRO.
2. **A face is not plaster, in four places:** `wallMarginOf` (9304) returns 0
   for a face unit (measured stop 40 today); `refreshAutoParts` (2013-2027)
   gives a face unit no side infill (measured 40 today); `runEnd` rule 1
   (`runs.js:608-610`) does not fire on a face (measured `kind: 'wall'` today);
   `wallWidthOf` (7970, 8059) answers "no wall" for a face. The back gap
   (`wallGapOf`, 10) is a decision: on a face it is the space between two
   backs, not a scribe.
3. **Panels.** On main a KITCHEN free end gets no auto panel in PRO (measured
   `[]`); only retail wardrobes get the free-end pass. The island needs its
   own pass in `endPanelAuto.js` with `atWall: false` at every face end,
   answered by `sideIsVisible` (187-224, measured "free end"), PRO included,
   leaving the kitchen pass untouched. A panel "sized to the whole island
   depth" and a BACK PANEL on an empty long face have no host on a unit (end
   panel depth is computed per unit, `cabinet.js:5567-5569`); `FREE_PANEL`
   (`types.js:198`) is the existing board with its own length, width and
   thickness, skipped by runs, so it can carry them without touching
   `cabinet.js`. Material: the law asks for FRONT material; check what a free
   panel is cut from.
4. **Geometry decision, measured.** Units stand OUTSIDE the `w x d`
   rectangle (footprint y 490..1050 on face A). With the 1800 x 900 default
   and BUD 560 deep plus the 10 gap on both long faces, the carcass footprint
   is 900 + 2 x 570 = 2040 deep before fronts. Every island corner is an empty
   depth x depth square (adjacent faces' units never meet, measured), so an
   end unit or an end panel at E1 or E2 is only as long as `d` unless faces
   are extended by the long runs' reach. Decide what `d` measures (the spine
   between the backs, or the overall depth) before F10's end panel and F6's
   45 degree island plinth mitre are built.
5. **Plinth.** One per face run comes free (`runPlinthParams`, measured). The
   45 degree mitre at an external corner does not exist: `segmentPlinth` has
   no mitre field, and the runs do not reach the corner (note 4).

### F11 · one worktop over the whole

1. `worktopEligible` refuses two walls (measured) and `worktopGeometry`
   speaks ONE wall frame with `z: 0` flush at the wall. An island slab is a
   plan rectangle (bounding box of every unit and panel on the island, +20 on
   every face, + per-face extend): a new record kind (for example `{ island:
   id, extend: { A, B, E1, E2 } }`) in `design.worktops` (`design.js:446-450`
   migrates only `unitIds` records today), with geometry in PLAN coordinates.
2. Every slab reader is wall-framed: `Scene.jsx:886-918` (box at
   `rotation={[0, wall.angle, 0]}`), `setPlan.js:150-157`, `setElevation.js`,
   `setPerspective.js:75`, `wallSheets.js:136`. An island slab needs a plan
   branch in each (drawings licensed through the classifier, FROZEN 2).
3. The worktop is in no BOM line and no cut list line on main (grep): F5 and
   F11 both add the first one; one function for both.
4. `seatingMm` 300 is an `extend` on an empty face; `extendFront` is one
   number per slab today (`projectStore.js:7912-7919`).

### Golden risk

Nil by construction if the island lives in `room.js`, `collision.js`,
`worktop.js`, `endPanelAuto.js`, `shareOut.js`, `roomFit.js`, the store and
the UI: none of them is reached from `cabinet.js` or `types.js` (measured).
`runs.js`, `autoparts.js` and `cornice.js` are reached, but only through the
eleven exports `cabinet.js:132-138` names; `runEnd`, `runEndGap`,
`addPlusPoints`, `sideInfill`, `segmentPlinth` and `runPlinthParams` are not
among them, and `defaultParamsFor` gives the six goldens no `position` and no
`wall` (measured), so no face test can reach them. The one shared guard is
`test/room.test.js:84`: emit `islands` only when present.
