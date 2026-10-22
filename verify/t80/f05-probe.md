# T80 F5 PROBE: where computeCabinet lays out the front boards (lay-on, today)

Read-only probe, taken on branch `claude/t80-in-frame-xjudwo` at HEAD
`992cd94`, 22.10.2026. Nothing in `src/` was edited by this probe. Every number
in the tables below is engine output from `computeCabinet()` (the node script
at the end), not a reading of the code. Line numbers are `src/engine/cabinet.js`
unless another file is named, and every line number is AT HEAD `992cd94`.
While this probe ran, parallel T80 agents edited the working tree (not this
probe): `profile.js` gained 37 lines after line 2812 and `projectStore.js` 12
lines after 1081 and 3 after 1124, so in the working tree `paramsForEngine` is
at 1094 and `addWorktop` at 9862. `cabinet.js` was untouched.

## 1. Where each thing is decided

| What | File:line | Notes |
| - | - | - |
| `computeCabinet` begins | cabinet.js:1757 | `P = profile`, `cfg = normalizeParams(params, P)` at 1760 |
| cfg destructured (W, H, D, G, GB, frontT, type, unitNum) | cabinet.js:1843 | |
| Front thickness: `front_t` param, else `profile.front.thickness` | cabinet.js:751 | in `normalizeParams` (747) |
| Front thickness slots `front1` / `front2` (T24 caliper slots) | cabinet.js:775-776 | `thickness_slots.front1` wins over `front_t` |
| `frontBoardT = thicknesses.front1` | cabinet.js:784 | published as `cfg.frontT` at 1054 |
| Profile default front thickness | profile.js:55 | `front.thickness: 25` (not 18, not 22) |
| `defaultParamsFor` stamps `front_t` | types.js:1752 | `front_t: profile.front.thickness` |
| Store: project front thickness into params | projectStore.js:534 | `front_t: projectFrontThickness(design, profile, materials)` (engine/projectSettings.js:134); slots at projectStore.js:1289 |
| Door COUNT decided | cabinet.js:933-945 | in `normalizeParams`; `doorCountFor` at 385 |
| `doorCountFor(width)` | cabinet.js:385-388 | `(W - doors.widthDeduction) <= doors.singleDoorMaxWidth ? 1 : 2` (4, 700) |
| Blind kit forces one leaf | cabinet.js:988 | not in T80 scope |
| Door datum Y (`doorY`) | cabinet.js:2323 | `-doorExtend + hoodAperture + overlayBase` (0 for BUD, WUD) |
| Door height (`frontH`) | cabinet.js:2324 | `H - topDemandMm(params, P) + doorExtend - hoodAperture - overlayBase`; `topDemandMm` is doors.js:188 (3 on a bare BUD) |
| Leaf width (`frontW`) | cabinet.js:2328-2330 | pair `(W - doors.doubleTotalGap) / 2`; single `W - doors.gap` |
| Single leaf x (`singleLeafX`) | cabinet.js:2331 | `doors.gap / 2` (1.5) |
| Pair leaf x | cabinet.js:8196-8197 | FL at `gap / 2`, FR at `W - gap / 2 - frontW` |
| Door Z plane (`doorZ`) | cabinet.js:7551 | `D + P.doors.gap` (carcass front + 3) |
| The face leaf builder (`faceLeaf`) | cabinet.js:7915-7935 | writes `w, h, thickness: frontT, box {x: leafX, y: doorY, z: doorZ, w, h, d: frontT}, cnc: rectGeometry(w, h), meta {hinge, frontType}` |
| Single door pushed | cabinet.js:8081 | `faceLeaf('<n>-F', singleLeafX, cfg.hinge)` |
| Pair pushed | cabinet.js:8195-8198 | `doorCount === 2` |
| Bay leaves (doors on partitions) | cabinet.js:7936-7966 | same z, y, h; own x / w |
| Drop-forward face (D/W) | cabinet.js:7986-8000 | out of T80 scope |
| Lift leaves | cabinet.js:8044-8076 | out of T80 scope |
| Split doors pass (replaces a leaf by two segments) | cabinet.js:8226-8419 | segments keep `leaf.box.x/z/w`, own y/h, own `meta.cupY` and `meta.plateY` |
| Split divider shelves pushed | cabinet.js:8420-8442 | |
| Leaf plan for hinged sides (before any leaf exists) | cabinet.js:2364-2386 | `faceLeafPlan` reuses `frontW`, `singleLeafX`, `gap/2`; feeds `hingedSides` (drawer standoff) |
| Door gap profile keys | profile.js:380-433 | `doors.gap 3`, `doors.doubleTotalGap 6`, `doors.widthDeduction 4`, `doors.singleDoorMaxWidth 700`, `doors.clearance.*` (front 1.5, endPanel 3, ...), `doors.minLeafWidth 200` |
| Drawer front profile keys | profile.js:1979, 2044-2045, 2076-2078 | `baseDrawerUnit.gap 3`, `frontWidthDeduction 3`, `frontScrewFromSide 50`, `frontScrewExtra 3.5`, `frontScrewFromBottom 96.5` |

### Hinges (cups on the door, plate drilling on the side)

| What | File:line | Notes |
| - | - | - |
| Hinge rule chosen | cabinet.js:2396 | `P.hinges.rules[type.hingeRule]` (BUD/WUD: `base`) |
| Hinge rows (carcass frame) | cabinet.js:2403-2422 | `hingeRows({height: shortDoor ? frontH : H, rule, standard, own, doorHeight: frontH, twoBelowMm})` (defined 340) over `hingeCentres` (224) |
| Base rule | cabinet.js:228-229 | `[endOffset, H - secondFromTop, H - endOffset]` = `[100, H - 300, H - 100]`: always THREE rows |
| Rows lifted for short doors | cabinet.js:2423-2425 | `centres` |
| Cup Y on the door (door frame) | cabinet.js:2449 | `cupY = centres - ladderBase + doorExtend`; it assumes the door's bottom is at carcass y = `doorY` |
| Side plate pilot diameter and layer | cabinet.js:8945-8946 | `hingePlatePilotD` (308), `hingePlateLayer` (cnc/layers.js) |
| Side plate hole pairs | cabinet.js:8948 | `centres +/- hinges.holePairOffset (16)` |
| Which board takes the plates | cabinet.js:8994, 9012-9015 | `plateBearerOf` (doors.js:483) via `hingedSidesOf` (doors.js:551) over the REAL leaves |
| Plate holes drilled on BUL / BUR | cabinet.js:9016-9025 | `x = hinges.xFromFrontEdge (37)` on BUL, `sideW - 37` on BUR (profile.js:723) |
| Split-segment plate rows | cabinet.js:8995-9001 | `platedRowsFor` reads `meta.plateY`, only for `meta.split` leaves |
| Plate on a partition | cabinet.js:9043-9080 | bay leaves only |
| Cups and cup screws drilled | cabinet.js:9375-9402 | every `part === 'FRONT'` not appliance / lift; `cupX = w - 21.5` (L) or `21.5` (R); Y from `pnl.meta.cupY` else the cabinet's `cupY`; cup bore from `cupBoreOf` (doors.js:685) |
| Hinge family and open angle per leaf | cabinet.js:10830-10868 | `resolveDoorHinge` (hinges.js) with `pnl.thickness` |
| Hinge ORDER groups (BOM) | cabinet.js:10870+ | `resolveDoorHinge({frontThickness: frontT, ...})` |
| Published rows | cabinet.js:11328-11346 | `hinge_centers`, `hinge_rows_by_panel` (panels with `meta.plateY`), `side_hinge_holes_y/x` (x = 37), `hinged_sides`, `front_cup_y` (= the cabinet `cupY`), `front_cup_x_from_hinge_edge` |
| `engine/hingeLadder.js` | not imported by cabinet.js | it is a READER of the computed result (projectStore, shelfHingeClash, cnc/drillGuard, main.jsx). `isHingedFront` at hingeLadder.js top: `part FRONT, role front, not appliance` |
| 3D hinge instances | hardware3d.js:296-322, 333-428 | rows = `drillSummary.hinge_centers` (or `hinge_rows_by_panel[id]`); bearer = `plateBearerOf` (381); `plateZ = depth - hinges.xFromFrontEdge` (422); cup at `panel.box.x (+/-) 21.5`, z at `doorHingeDatum(panel).innerZ` |

### Handles, styles, drawer fronts

| What | File:line | Notes |
| - | - | - |
| Front edge trim pass (store's clearance healer, `front_edge_trim`) | cabinet.js:8444-8631 | one pass over every `role === 'front'`; rewrites `w`, `box.x/w`, `edgeLen`, `cnc`; runs BEFORE drilling so cups and handles follow the edge (comment 8465-8479) |
| Shaker recess pass | cabinet.js:8633-8718 | `isShakerFront` (shaker.js:223), `shakerCutPocket` (shaker.js:323) from `pnl.w, pnl.h`; writes `cnc.pockets` and `meta.shaker {frame, depth, panelFloor}` |
| Glass aperture pass (WUD_GLASS) | cabinet.js:8720-8775 | `glassAperture` from `pnl.w, pnl.h, pnl.thickness` |
| Drill list starts; panel's own `cnc.holes` copied into drills | cabinet.js:8862, 8879, 8906-8909 | this is where BUDR `front_screw` holes reach the drill list |
| Handle holes | cabinet.js:9404-9506 | `resolveHandle({panel, ...})` (handles.js) on every `role === 'front'`, reads `w`, `h`, `meta.hinge`, `meta.shaker.frame`; writes `meta.handle` |
| Front decoration (A, AH, ornate, mouldings) | cabinet.js:10426-10474 | `buildFrontDecoration` (frontDecoration.js), which asks `frontBoard.js` (skin rule: `board - depth >= front.decorationMinSkinMm`); reads `pnl.box`, `pnl.thickness`, `drills`; appends FRONT-MOULDING parts via `appliedFrontParts` (1682) |
| Grain axis | cabinet.js:10488 | `applyGrainAxis(panels)` |
| BUDR drawer front heights (kit) | cabinet.js:548-559 | `budrFrontHeights(H, profile, ratio, exact)`: `(H - n x gap)` shared by the ratio |
| BUDR heights with own overrides | cabinet.js:596; called at 913-916 | `cfg.drawerHeights` |
| BUDR stack object (`budr`) | cabinet.js:2706-2958 | `frontWidth = W - frontWidthDeduction` (2718), `frontY` (2728-2730: front 1 at 0, each next at `+h + gap`), `runnerBottomY` (2754) |
| BUDR drawer box block | cabinet.js:5802 onward | `boxLeftX = G + boxWidthClearance / 2` (5805), `boxZFront = D - frontT` (5806): the BOX's Z depends on the front thickness param |
| BUDR drawer front loop | cabinet.js:5975-6072 | front i: `w budr.frontWidth`, `h fh`, `box {x: frontWidthDeduction / 2, y: budr.frontY[bottom - 1], z: D + doors.gap, ...}` (6052-6054) |
| Front fixed to the box: front screw holes | cabinet.js:6043-6050 | `screwY = frontScrewFromBottom + (i === 1 ? G : 0) + drop`; `screwX = frontScrewFromSide + G + GB + frontScrewExtra`; stored in the FRONT's own `cnc.holes` (kind `front_screw`) |
| Box front pilots | BUDR box block, `D<i>-BF` | `cnc.holes` kind `screw` at (50, 50) and (50, 368) in the box front's own drawn frame (the second number runs along its 418 length) |
| Published drawer numbers | cabinet.js:11294-11304, 11398-11402, 11641-11652 | `front_heights`, `drawer_front_w`, `drawer_front_y`; `drawer_front_screw_x / _y_per_drawer` (from the LISP's `2 x G`, not from the panels); `assemblies.drawerFronts` |
| Wardrobe drawer fronts (DF) | cabinet.js:5460-5462, 5559-5569 | `z: D - DR.setback - frontT` (behind the doors), out of F5 scope |
| `panel()` record | cabinet.js:1662-1679 | `w, h` rounded; `edging {code, len_m}`; `area_m2 = areaM2(w, h)`; `material_role` from `wearsFrontMaterial(role)` |

## 2. Engine output today (bare compute, lay-on)

Params: `defaultParamsFor(type, P)` + `unit_num '01'` + `width`. Defaults: BUD
and BUDR2 H 770 D 558, WUD H 720 D 400, `board_t 18`, `front_t 25` (the
profile's), front type `S` (shaker 60). Box = `{x, y, z, w, h, d}` in the
cabinet's frame: x from the left outer face, y from the carcass bottom, z from
the carcass back (the carcass front is z = D).

### Fronts

| Kit | id | part | role | w | h | t | box x, y, z, w, h, d | edging | drills on it | meta keys |
| - | - | - | - | - | - | - | - | - | - | - |
| BUD 600 | 01-F | FRONT | front | 597 | 767 | 25 | 1.5, 0, 561, 597, 767, 25 | `<>^v` 2.728 m | 3 cup (d35, depth 11) at x 575.5, y 100 / 470 / 670; 6 cup_screw (d3) at x 566, y +/-23 | hinge L, frontType S, shaker {frame 60, depth 6, panelFloor 19} |
| BUD 800 | 01-FL | FRONT | front | 397 | 767 | 25 | 1.5, 0, 561, 397, 767, 25 | `<>^v` 2.328 m | 3 cup at x 375.5, y 100 / 470 / 670; 6 cup_screw at x 366 | hinge L, frontType S, shaker |
| BUD 800 | 01-FR | FRONT | front | 397 | 767 | 25 | 401.5, 0, 561, 397, 767, 25 | `<>^v` 2.328 m | 3 cup at x 21.5, y 100 / 470 / 670; 6 cup_screw at x 31 | hinge R, frontType S, shaker |
| BUDR2 500 | 01-F1 | DRAWER-FRONT | front | 497 | 382 | 25 | 1.5, 0, 561, 497, 382, 25 | `<>^v` 1.758 m | 2 front_screw (d3, FRONT_HINGES_3MM) at (89.5, 114.5), (407.5, 114.5) | drawer 1, frontType S, shaker |
| BUDR2 500 | 01-F2 | DRAWER-FRONT | front | 497 | 382 | 25 | 1.5, 385, 561, 497, 382, 25 | `<>^v` 1.758 m | 2 front_screw at (89.5, 96.5), (407.5, 96.5) | drawer 2, frontType S, shaker |
| BUDR2 500 | D1-BF | DRAWER-BOX-FRONT | drawer_box | 418 | 233 | 18 | 41, 64.5, 515, 418, 233, 18 | none | 2 screw (d3) at (50, 50), (50, 368) | drawer 1 (FROZEN 6) |
| BUDR2 500 | D2-BF | DRAWER-BOX-FRONT | drawer_box | 418 | 233 | 18 | 41, 431.5, 515, 418, 233, 18 | none | 2 screw at (50, 50), (50, 368) | drawer 2 (FROZEN 6) |
| WUD 600 | 01-F | FRONT | front | 597 | 717 | 25 | 1.5, 0, 403, 597, 717, 25 | `<>^v` 2.628 m | 3 cup at x 575.5, y 100 / 420 / 620; 6 cup_screw | hinge L, frontType S, shaker |

Every front's `cnc` keys: `outline, pockets, holes, layer` (BUDR fronts add
`grain`); the shaker pocket is `SHAKER_PANEL_POCKET` (60, 60) to (w - 60, h - 60),
depth 6, `cutout: true`. `material_role 'front'`, `finish_exposed true`.

Check of the screw chain (lay-on): F1's screw at front x 89.5 + box.x 1.5 = 91 =
D1-BF x 41 + 50; y 114.5 = D1-BF y 64.5 + 50. F2's at 385 + 96.5 = 481.5 = 431.5
+ 50. The front screws point at the box pilots through the FRONT's own box.

### Carcass boards

| Kit | id | part | role | w | h | t | box x, y, z, w, h, d | hinge plate holes (x / y, side frame) |
| - | - | - | - | - | - | - | - | - |
| BUD 600 | BUL | BUL | side | 540 | 770 | 18 | 0, 0, 18, 18, 770, 540 | 6: x 37, y 84 / 116 / 454 / 486 / 654 / 686 |
| BUD 600 | BUR | BUR | side | 540 | 770 | 18 | 582, 0, 18, 18, 770, 540 | 0 |
| BUD 600 | TOP | TOP | top | 564 | 540 | 18 | 18, 752, 18, 564, 18, 540 | |
| BUD 600 | BOTTOM | BOTTOM | bottom | 564 | 540 | 18 | 18, 0, 18, 564, 18, 540 | |
| BUD 800 | BUL | BUL | side | 540 | 770 | 18 | 0, 0, 18, 18, 770, 540 | 6: x 37, same rows |
| BUD 800 | BUR | BUR | side | 540 | 770 | 18 | 782, 0, 18, 18, 770, 540 | 6: x 503 (= 540 - 37), same rows |
| BUD 800 | TOP | TOP | top | 764 | 540 | 18 | 18, 752, 18, 764, 18, 540 | |
| BUD 800 | BOTTOM | BOTTOM | bottom | 764 | 540 | 18 | 18, 0, 18, 764, 18, 540 | |
| BUDR2 500 | BUL | BUL | side | 540 | 770 | 18 | 0, 0, 18, 18, 770, 540 | 0 |
| BUDR2 500 | BUR | BUR | side | 540 | 770 | 18 | 482, 0, 18, 18, 770, 540 | 0 |
| BUDR2 500 | TOP | TOP | top | 464 | 540 | 18 | 18, 752, 18, 464, 18, 540 | |
| BUDR2 500 | BOTTOM | BOTTOM | bottom | 464 | 540 | 18 | 18, 0, 18, 464, 18, 540 | |
| WUD 600 | BUL | BUL | side | 382 | 720 | 18 | 0, 0, 18, 18, 720, 382 | 6: x 37, y 84 / 116 / 404 / 436 / 604 / 636 |
| WUD 600 | BUR | BUR | side | 382 | 720 | 18 | 582, 0, 18, 18, 720, 382 | 0 |
| WUD 600 | TOP | TOP | top | 564 | 382 | 18 | 18, 702, 18, 564, 18, 382 | |
| WUD 600 | BOTTOM | BOTTOM | bottom | 564 | 382 | 18 | 18, 0, 18, 564, 18, 382 | |

`drillSummary`: BUD 600 `hinge_centers [100, 470, 670]`, `hinged_sides
["BUL"]`; BUD 800 the same rows, `["BUL", "BUR"]`; BUDR2 `[]`, `[]`; WUD 600
`[100, 420, 620]`, `["BUL"]`. `derived`: BUD 800 `door_width 397`; BUDR2
`front_heights [382, 382]`, `drawer_front_w 497`, `drawer_front_y [0, 385]`.

## 3. What LISP (c) gives for the same kits (arithmetic for the F5 writer, NOT engine output)

t 18, lip `(38 - 18 - 18) / 2 = 1`, frontT 22, frameT 25, gap 3 to the frame,
1.5 to a neighbour. Opening = `t + lip .. W - t - lip` by `t + lip .. H - t -
lip` in the cabinet frame.

| Kit | Opening (x, y, w, h) | Inset front(s) box x, y, z, w, h, d | Face plane |
| - | - | - | - |
| BUD 600 | 19, 19, 562, 732 | 22, 22, 561, 556, 726, 22 | 583 = D + 25 |
| BUD 800 pair | 19, 19, 762, 732 | FL 22, 22, 561, 376.5, 726, 22; FR 401.5, 22, 561, 376.5, 726, 22 (lay-on midline 400 kept) | 583 |
| BUDR2 500 | 19, 19, 462, 732 | F1 22, 22, 561, 456, 360, 22; F2 22, 385, 561, 456, 363, 22 (literal reading: lay-on midline 383.5 kept; the lay-on stack has 3 at the top and 0 at the bottom, so the two come out 360 / 363, not 361.5 / 361.5: a reading for F1's LISP to settle) | 583 |
| WUD 600 | 19, 19, 562, 682 | 22, 22, 403, 556, 676, 22 | 425 = D + 25 |

Note the z: `doorZ = D + doors.gap` = D + 3 is already the in-frame back plane
(25 - 22 = 3), by coincidence of two 3s. The inset pass should write `D +
(frameT - frontT)` from `profile.inframe`, not lean on `doors.gap`.

## 4. The best insertion point for an in-frame inset pass

**cabinet.js line 8443**: the blank line between the end of the split-divider
push (`splitDividers.forEach`, 8420-8442) and the T31 asymmetry pass comment
(8444, the `front_edge_trim` applier at 8561).

Why there:

1. Every `role: 'front'` board of the T80 kits already exists: BUDR drawer
   fronts (6052), wardrobe drawer fronts (5460, 5559), face leaves (8081,
   8196-8197 via `faceLeaf` 7915), bay leaves (7936), split segments (8337).
   No front panel is created after this line except the decoration mouldings
   (`appliedFrontParts`, 10471), which are derived from the front afterwards.
2. Nothing has yet READ a front's `w`, `h`, `box` or `thickness` for
   machining: the shaker pocket (8633), glass aperture (8720), the drill list
   (8862, copying `cnc.holes` at 8906), plate holes (8994-9025), cups
   (9375-9402), handles (9404), decoration (10426), hinge family (10830), hinge
   order (10870), grain (10488), `derived` (11236), `drillSummary` (11327),
   `assemblies` (11497) all run after it.
3. It is the same shape as the T31 trim pass right below it, which the file
   already defends as "a pass over `pnl.w` at this point in the file" so that
   cups and handles follow the edge by construction. One pass over the
   fronts, gated on `params.inframe`, keeps "a bare computeCabinet() is
   today" true: with the flag absent the pass never runs.

There is no existing single function every front passes through after
creation: `panel()` (1662) is a record constructor called at every site, and
`faceLeaf` (7915) covers only face doors. The T31 pass (8444-8631) is the
closest thing to "one pass over every front", and the inset pass belongs
immediately before it.

### What the inset pass must rewrite on each front (or downstream goes stale)

| Field | Why |
| - | - |
| `w`, `h`, `thickness` (22), `box` {x, y, z, w, h, d} | read by every pass below and by the 3D, drawings, section, BOM |
| `area_m2`, `edging.len_m` | `panel()` computed them from the lay-on size (1671-1673) |
| `cnc` outline: `rectGeometry(w, h)` | the DXF outline; the shaker pocket is cut later from `pnl.w/h`, so it follows by itself |
| `cnc.holes` of a BUDR drawer front (`front_screw`) | stored in the FRONT's frame at creation (6043-6050); shift by (old box.x - new box.x, old box.y - new box.y) or they miss the box pilots. BUDR2 F1: (89.5, 114.5) becomes (69, 92.5); F2: (89.5, 96.5) becomes (69, 96.5) |
| `meta.cupY` on each hinged leaf | the cup loop (9389) uses `meta.cupY` else the cabinet's `cupY` (2449), which assumes the door bottom at `doorY`. An inset door at y 22 needs `cupY = centres - 22` (78 / 448 / 648 on a BUD 770) or the cups miss the plates |
| `meta.hingeOn` ('BUL' / 'BUR') | `plateBearerOf` (doors.js:483) finds the board under the hinge LINE with 0.51 tolerance (doors.js:455-462). An inset leaf's hinge line is x 22 (L) or W - 22 (R), off BUL [0, 18] and BUR [W - 18, W]: it answers null, so `hingedSidesOf` returns [], NO plate holes are drilled (9012-9025), `drillSummary.hinged_sides` is [], and hardware3d draws NO hinge (381-382). `meta.hingeOn` short-circuits it (doors.js:489). Check readers of `hingeOn`: checks.js:1141 (only VPART), hingeLadder.js:160, hardware3d.js:425 |

### Downstream readers an inset pass must run BEFORE (or update)

| Reader | File:line | Reads |
| - | - | - |
| Front edge trim (store healer) | cabinet.js:8561-8631; store `frontClearances` / `healingPlan` projectStore.js:3699-3710, 9993, 10136-10196 | `pnl.w`, `box.x`; the store computes lay-on clearances: under in-frame it should hand no trims, or the inset fronts are narrowed again |
| Shaker pocket | cabinet.js:8646-8718 | `w`, `h`, `thickness` (panelFloor) |
| Glass aperture | cabinet.js:8738-8775 | `w`, `h`, `thickness` |
| Drill list from `cnc.holes` | cabinet.js:8906-8909 | BUDR `front_screw` |
| Side plate holes | cabinet.js:8994-9025 | `plateBearerOf` over real leaves; x = `hinges.xFromFrontEdge` 37 (F6 wants 20.5 under in-frame) |
| Cups | cabinet.js:9375-9402 | `w` (cupX), `meta.hinge`, `meta.cupY`, `cupBoreOf` (box.z / thickness) |
| Handles | cabinet.js:9404-9506 | `w`, `h`, `meta.shaker.frame` |
| Front decoration + skin rule | cabinet.js:10426-10474; frontBoard.js | `box`, `thickness`, `drills` |
| Hinge family / angle / order | cabinet.js:10830-10900 | `pnl.thickness`, `frontT` (cfg) |
| `derived` | cabinet.js:11264, 11294-11304 | `door_width: frontW`, `front_heights`, `drawer_front_w`, `drawer_front_y`: local variables, not panels: stale unless updated |
| `drillSummary` | cabinet.js:11328-11346, 11398-11402 | `hinge_centers` (carcass rows: still right), `side_hinge_holes_x` 37, `front_cup_y` (the cabinet `cupY`: stale), `drawer_front_screw_x / _y_per_drawer` (stale) |
| `assemblies.drawerFronts` | cabinet.js:11641-11652 | `budr.frontY`, `budr.heights`, `budr.frontWidth`: stale |
| `assemblies.cornice.doorPlane` | cabinet.js:11678 | `D + doors.gap + frontT` |
| 3D hinges | hardware3d.js:296-428 | `hinge_centers`, `plateBearerOf`, `plateZ = depth - 37` |
| 3D, drawings | unitCard.js:272, wallElevation.js:561 (`box.z >= depth`: 561 still passes), frontElevation.js, views.js:274, frontDimensions.js:31 / 373, section.js:142, bom.js:150, spray.js:123 | `box`, `w`, `h`, `material_role` |

### Observations for the F5 / F6 writers

1. `profile.front.thickness` is 25 (profile.js:55) and `defaultParamsFor`
   stamps it: every bare golden is cut with 25 mm fronts. Check #40 must read
   the PROJECT's front thickness (`projectFrontThickness`, projectSettings.js:134,
   and the `front1` slot), never the profile default.
2. The BUDR box Z is `boxZFront = D - frontT` (5806): a project whose fronts
   change from 25 to 22 moves every BUDR box 3 forward. That is today's law
   reacting to `front_t`, not in-frame; FROZEN 6 holds only if the inset pass
   does not change `cfg.frontT` before 5806 (it runs at 8443, after).
3. CLAUDE.md F6 says a BUD 770 inset door of 726 "keeps two" hinges. Today's
   `base` rule gives THREE rows on a 770 carcass whatever the door height
   ([100, 470, 670], cabinet.js:228-229 and the table above); two only under
   the project's hinge standard 2 (`hingeStandard`, 283) or `twoBelowMm` above
   726. The F6 writer should probe that sentence before pinning a test on it.
4. `doorZ = D + doors.gap` (7551) equals the in-frame back plane only because
   both numbers are 3.

## 5. The probe script

Saved under `verify/t80/` and run from the repo root (`node
verify/t80/f05-probe.mjs`), the relative imports resolve. It edits nothing.

```js
// T80 F5 probe: the front boards of BUD 600, BUD 800 pair, BUDR2 500, WUD 600 (lay-on, today).
import { computeCabinet } from '../../src/engine/cabinet.js';
import { defaultParamsFor } from '../../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../../src/engine/profile.js';

const kits = [['BUD', 600], ['BUD', 800], ['BUDR2', 500], ['WUD', 600]];
const fmt = (b) => b ? `${b.x}, ${b.y}, ${b.z}, ${b.w}, ${b.h}, ${b.d}` : '-';
console.log('profile: doors', JSON.stringify(P.doors));
console.log('profile: front.thickness', P.front.thickness, 'board.thickness', P.board.thickness);
console.log('profile: baseDrawerUnit', JSON.stringify({ gap: P.baseDrawerUnit.gap, ratio: P.baseDrawerUnit.ratio, frontWidthDeduction: P.baseDrawerUnit.frontWidthDeduction }));
console.log('profile: hinges', JSON.stringify({ xFromFrontEdge: P.hinges.xFromFrontEdge, holePairOffset: P.hinges.holePairOffset, endOffset: P.hinges.endOffset, cups: P.hinges.cups, rules: P.hinges.rules }));
for (const [type, width] of kits) {
  const params = { ...defaultParamsFor(type, P), unit_num: '01', width };
  const r = computeCabinet(params, P);
  console.log(`\n## ${type} ${width}: H ${params.height} D ${params.depth} front_t ${params.front_t} board_t ${params.board_t} doors ${JSON.stringify(params.doors)}`);
  const drills = r.drills || r.cnc?.drills || [];
  const fronts = r.panels.filter((p) => p.role === 'front' || /FRONT/.test(p.part));
  for (const p of fronts) {
    const own = drills.filter((d) => d.panel === p.id);
    const kinds = {};
    for (const d of own) kinds[d.kind] = (kinds[d.kind] || 0) + 1;
    const cnch = (p.cnc?.holes || []).length;
    console.log(`FRONT | ${p.id} | ${p.part} | ${p.role} | ${p.w} | ${p.h} | ${p.thickness} | ${fmt(p.box)} | ${p.edging?.code} ${p.edging?.len_m} | ${JSON.stringify(kinds)} cnc.holes ${cnch} | ${Object.keys(p.meta || {}).join(',')} | ${JSON.stringify(p.meta)}`);
    const cupYs = own.filter((d) => d.kind === 'cup').map((d) => `${d.x}/${d.y}`);
    if (cupYs.length) console.log(`   cups x/y: ${cupYs.join(' ')}`);
  }
  for (const id of ['BUL', 'BUR', 'TOP', 'BOTTOM']) {
    const p = r.panels.find((q) => q.id === id || q.part === id);
    if (!p) { console.log(`CARC | ${id} | not cut`); continue; }
    const hinge = drills.filter((d) => d.panel === p.id && d.kind === 'hinge').map((d) => `${d.x}/${d.y}`);
    console.log(`CARC | ${p.id} | ${p.part} | ${p.role} | ${p.w} | ${p.h} | ${p.thickness} | ${fmt(p.box)} | hinge plate holes ${hinge.length}: ${hinge.join(' ')}`);
  }
  console.log('drillSummary.hinge_centers', JSON.stringify(r.drillSummary?.hinge_centers), 'hinged_sides', JSON.stringify(r.drillSummary?.hinged_sides));
  console.log('result keys', Object.keys(r).join(','));
}
```
