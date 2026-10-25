# verify/t26 — the sheet against the scene (R10)

> *"cut CNC musi być twoją drogą do wizualizacji, nie na odwrót."* — the owner

R10: **the sheet is the truth and the scene follows it.** Every drilling,
pocket and cut on a panel's CNC record must be visible on that panel in 3-D.
Hardware may ADD to the picture — a sleeve inside a hole, a hinge in its bore
— it may never replace or omit the hole.

This file is GENERATED (`node scripts/t26-sheet-vs-scene.mjs`) from
`src/engine/machining.js` and from real `computeCabinet` runs, and
`test/turn26-f3-sheet-vs-scene.test.js` asserts that every class and every
reason below is the one in the code. It cannot drift.

## 1 — the policy, class by class

`draw` — is this class bored out of the board's own solid in 3-D?
`depth` — how deep, where the RECORD does not state one. The record always
wins; the table is only the default, and it is the workshop's own
(`profile.editor.drillDefaults`), the same numbers the hand editor stamps.

| layer | drawn | default depth | why |
| --- | --- | --- | --- |
| `OUTLINE` | no | — | the outline IS the board — it is the polygon every panel is extruded from (3d/panelSolid.js), not a feature cut into one. |
| `CARCASE` | no | — | the elevation views’ own outline layer; same answer as OUTLINE. |
| `PUZZLE_SOCKET` | no | — | cut by the OUTLINE since turn 11 — a socket is a notch in the board’s own polygon, and boring it a second time would punch a hole through a notch. |
| `PUZZLE_DOG_BONES` | **yes** | through | the relief the cutter leaves in the corner of a socket; it goes through the board with the socket. |
| `PUZZLE_HOLES_7_5MM` | **yes** | through | the puzzle joint’s through-dowel — it passes into the neighbouring board, so it really is through. |
| `SCREWS_3MM` | **yes** | through | a through screw by definition: it passes through the board it is drilled in and into the edge of the one behind it. |
| `BISCUIT_4MM` | no | — | a MARK is an open path the cutter runs in and out of, not a closed removal — it is drawn as a line on the face by 3d/JointLines.jsx and 3d/PartMachining.jsx, which is what a set-out transfer looks like on the bench. |
| `CORNER_4MM` | no | none | a MARK, as the biscuit line is: two open two-point paths at a re-entrant corner of an L outline, along the two edges that meet there, on which the owner runs his own 4 mm program to square the fillet the 8 mm cutter leaves (17.10.2026: "nie, nie dodawaj wiercenia ... nazwij to corner 4 mm, wtedy ja wytne ten korner"). Nothing is removed by it, so the solid shows the outline's sharp corner and no bore; the line is drawn on the face by the CNC view and the part drawing. |
| `SHAKER_PANEL_POCKET` | no | — | drawn by the TRAY solid (3d/shakerSolid.js), which is the door’s own geometry — boring it again here would stand two coplanar surfaces a hundredth of a millimetre apart, which is z-fighting by construction. |
| `HANDLES_5MM` | **yes** | through | a handle bolt goes through the front and takes a nut on the back — through is the truth. |
| `HINGES_5MM` | **yes** | 12 mm | the knock-in plate’s two ⌀5 dowels. BLIND: a dowel that broke through the outer face of a side panel would be visible in the room. |
| `DOWEL_8MM` | **yes** | through | the face half of a dowel joint. BLIND, to the depth its own record states (12 into an 18 board), so the outer face of a side is never pierced. |
| `DOWEL_EDGE_8MM` | no | n/a | the edge half of a dowel joint is a HORIZONTAL bore into the board's edge, centred in its thickness; boring it through the face would draw a hole that is not there. Its record says face edge, which edge and how deep, and the joiner bores it with a jig. |
| `CABINEO_POCKET_15MM` | **yes** | through | Lamello Option 1: three overlapping dia 15 holes that make the connector pocket, BLIND to the depth the record states (13 under the flush cover cap, from the OUTSIDE face of the top, the bottom or a fixed shelf); the record says face outside. |
| `CABINEO_POCKET_10MM` | **yes** | through | Lamello Option 2: the three-lobe connector pocket milled with a cutter of at least dia 10, BLIND to the depth the record states, cut from the OUTSIDE face of the horizontal board (the record says so); the channel runs out of the board end. |
| `CABINEO_POCKET_12MM` | **yes** | through | Lamello Option 3: the three lobes joined by a straight 12 channel, milled with a dia 12 cutter, BLIND to the depth the record states (13 under the flush cover cap), cut from the OUTSIDE face of the horizontal board; the channel runs out of the board end. |
| `CABINEO_RECESS` | **yes** | through | the cover cap recess around a Cabineo pocket (2.1 deep and 18.8 wide under the flush cover cap mounting), a second, shallower pocket from the same OUTSIDE face, cut to the depth its own record states. |
| `CABINEO_HOLE_5MM` | no | n/a | the dia 5 counterpart hole in the side for the Cabineo screw: the sheet prints no depth for it, and boring it through would pierce the side's outer face, which the real screw (X = 8 or 12 beyond the board end) never does; it is drawn as a circle on the face by 3d/PartMachining.jsx until the owner names the depth. |
| `SHELVES_7_5MM` | **yes** | 12 mm | the shelf-pin ladder — bored EMPTY ones too, so the full set of levels reads at a glance exactly as it does on the sheet (F3.1). BLIND: a pin hole through a side panel would show daylight. |
| `RUNNERS_3MM` | **yes** | through | the runner’s fixing screws, drawn to whatever the workshop’s own drillDefaults row says — which today is THROUGH. Nobody has given a pilot depth for a MOVENTO screw and this turn does not invent one; BLOCKERS carries the question. |
| `FRONT_HINGES_35MM` | **yes** | 11 mm | the ⌀35 cup. BLIND to the owner’s measured 11 mm — and the RECORD states it (engine/cabinet.js), so this default is never the number actually used. |
| `FRONT_HINGES_3MM` | **yes** | 11 mm | the cup’s own two fixing screws. BLIND: turn 21’s "pilot dots on his door faces" were exactly these, read as through holes. |
| `HAWA_3MM` | **yes** | through | the HAWA pocket panels' screw pilots (the tracks, the catch bracket, the connector, its brackets and pads), dia 3, BLIND to the 10 their record states (PROPOSED, CLAUDE.md T82 F5): the 4.5 x 16 and 4.5 x 20 screws go into the panel's pocket face, never through to its outer face. |
| `FRONT_HINGES_5MM` | **yes** | through | the HAWA hinge's two dia 5 fixing holes, 26 above and below each cup and 9 further in (160704), BLIND to the 13 their record states, from the door's back face. |
| `FRONT_HINGES_8MM` | **yes** | through | the HAWA door's dia 8 sleeve holes, on the cup axis 22 from each end and along the III/35 steel profile's rows (160704 section C - C), BLIND to the 13 their record states, from the door's back face. |
| `HAWA_FOOT_35MM` | **yes** | through | the adjustable foot's dia 35 hole in the HAWA pocket's bottom board, centred in the pocket, S + 21 behind its front edge (169313): THROUGH, the foot stands in it. |
| `HAWA_GROOVE_12MM` | **yes** | through | the III/35 steel stiffening profile's groove in the HAWA door's back face, 12 wide, cut to the 12 its record states (PROPOSED, KIT_HAWA.lsp D11), running out of the hinge edge. |
| `DRAWER_RUNNER_POCKET` | **yes** | through | a groove in the box side, cut to the depth its own record states. |
| `DRAWER_BOTTOM_POCKET` | **yes** | through | a groove in the box side, cut to the depth its own record states. |
| `HANGER_HOLE` | **yes** | through | the wall bracket’s cut-out in the back panel — the bracket passes through it. |
| `RECESS_WINDOW` | **yes** | through | the window through the BACK into a recess extension (KIT_RECESS.lsp D9); its record states the board’s own depth, so it is cut right through and the scene looks into the extension. |
| `SHOE_GROOVE_6MM` | **yes** | through | the sloped bottom’s seat, 6 mm deep in all four walls of the box — a groove cut to the depth its own record states, exactly as the drawer box’s two grooves are, and the board that sits in it is 6 mm into every wall. |
| `SHOE_RUNNER_5MM` | **yes** | through | the side runner’s euro fixings in the carcass side, on the owner’s own 16.08 sheet. BLIND: a ⌀5 broken through the outer face of a wardrobe side would show in the room, exactly as the hinge plate’s dowels would. |
| `UNIT_NUMBER` | no | — | text, not machining — the label is engraved or printed and is drawn as type by the CNC preview. |

### the deliberate omissions, gathered

* **`OUTLINE`** — the outline IS the board — it is the polygon every panel is extruded from (3d/panelSolid.js), not a feature cut into one.
* **`CARCASE`** — the elevation views’ own outline layer; same answer as OUTLINE.
* **`PUZZLE_SOCKET`** — cut by the OUTLINE since turn 11 — a socket is a notch in the board’s own polygon, and boring it a second time would punch a hole through a notch.
* **`BISCUIT_4MM`** — a MARK is an open path the cutter runs in and out of, not a closed removal — it is drawn as a line on the face by 3d/JointLines.jsx and 3d/PartMachining.jsx, which is what a set-out transfer looks like on the bench.
* **`CORNER_4MM`**: a MARK, as the biscuit line is: two open two-point paths at a re-entrant corner of an L outline, along the two edges that meet there, on which the owner runs his own 4 mm program to square the fillet the 8 mm cutter leaves (17.10.2026: "nie, nie dodawaj wiercenia ... nazwij to corner 4 mm, wtedy ja wytne ten korner"). Nothing is removed by it, so the solid shows the outline's sharp corner and no bore; the line is drawn on the face by the CNC view and the part drawing.
* **`SHAKER_PANEL_POCKET`** — drawn by the TRAY solid (3d/shakerSolid.js), which is the door’s own geometry — boring it again here would stand two coplanar surfaces a hundredth of a millimetre apart, which is z-fighting by construction.
* **`DOWEL_EDGE_8MM`**: the edge half of a dowel joint is a HORIZONTAL bore into the board's edge, centred in its thickness; boring it through the face would draw a hole that is not there. Its record says face edge, which edge and how deep, and the joiner bores it with a jig.
* **`CABINEO_HOLE_5MM`**: the dia 5 counterpart hole in the side for the Cabineo screw: the sheet prints no depth for it, and boring it through would pierce the side's outer face, which the real screw (X = 8 or 12 beyond the board end) never does; it is drawn as a circle on the face by 3d/PartMachining.jsx until the owner names the depth.
* **`UNIT_NUMBER`** — text, not machining — the label is engraved or printed and is drawn as type by the CNC preview.

One further omission is a DRAWING rule rather than a class, and it is named
here for the same reason: a hole whose rim comes within
`engine/recesses.js EDGE_KEEP` (0.2 mm) of the board's outline is left out of
the picture. The machine drills it; a polygon whose hole touches its own
boundary is a shape a triangulator is entitled to refuse. The DXF carries it
unchanged.

## 2 — parity, part class by part class

Counted on real cabinets. `sheet` is what `computeCabinet` puts on the CNC
record for that part class; `scene` is what `engine/recesses.js panelRecesses`
— the exact list `3d/panelSolid.js` punches out of the board and
`3d/shakerSolid.js` bores into a shaker tray — cuts. Positions are compared to
**0.01 mm** by the test.

### base, 2 shelves, doors

| part class | parts | sheet | scene | at the edge |
| --- | --- | --- | --- | --- |
| BUL/BUR | 2 | 58 | 58 | 0 |
| BACK | 1 | 34 | 34 | 0 |
| fronts | 1 | 9 | 9 | 0 |

### base, partition, bay doors

| part class | parts | sheet | scene | at the edge |
| --- | --- | --- | --- | --- |
| BUL/BUR | 2 | 28 | 28 | 0 |
| BACK | 1 | 37 | 37 | 0 |
| partitions | 1 | 12 | 12 | 0 |
| fronts | 2 | 18 | 18 | 0 |

### base, shaker fronts

| part class | parts | sheet | scene | at the edge |
| --- | --- | --- | --- | --- |
| BUL/BUR | 2 | 34 | 34 | 0 |
| BACK | 1 | 34 | 34 | 0 |
| fronts | 1 | 9 | 9 | 0 |

### base with drawers

| part class | parts | sheet | scene | at the edge |
| --- | --- | --- | --- | --- |
| BUL/BUR | 2 | 46 | 46 | 0 |
| BACK | 1 | 34 | 34 | 0 |
| fronts | 3 | 6 | 6 | 0 |
| drawer box | 15 | 18 | 18 | 0 |

### wardrobe, doors + shelves

| part class | parts | sheet | scene | at the edge |
| --- | --- | --- | --- | --- |
| BUL/BUR | 2 | 64 | 64 | 0 |
| BACK | 1 | 34 | 34 | 0 |
| fronts | 1 | 18 | 18 | 0 |

## 3 — the hardware ADDS, it does not replace

On `BUL` of the base unit the sheet drills **12** ⌀7.5 pin holes —
3 to a level, which is the owner's "three in a row" — and the scene bores
**12** of them. **4** carry a shelf and take a brass sleeve;
the rest are empty and are drawn empty, which is the whole of F3.1 — the full
ladder of levels reads at a glance, exactly as it does on the sheet.

The sleeve is the hardware's and the hole is the panel's: the collar's barrel
is scaled to the drilling's own ⌀7.5 and clamped to the bore's own
12 mm, so a fitting can never be a different size from the hole it
is knocked into.

## 4 — the cup, which is where R10 was first applied

The ⌀35 cup on `01-F` states its own depth on the record: **11 mm**, the
owner's measured number. Before this turn it stated none, and
`engine/recesses.js` read a hole with no depth as a hole that goes THROUGH —
so a ⌀35 cup was bored clean through a 25 mm door. That is the pierce he
photographed, and R10 is what decided the cure: the sheet gains the number and
the scene reads the sheet.

The DXF is unchanged either way — a circle carries a diameter and a layer and
never a depth (`engine/cnc/dxf.js`) — so the fingerprint does not move.

