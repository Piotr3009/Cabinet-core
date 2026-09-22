# T72 · F4 — the J-pull: the probe, as a test

> *"jak nacisnę J nie pokazuje mi w ogóle tego na wizualizacji, wiem że jest ale
> nie widać, zrób test"*

A retail room, one wardrobe 1800 × 2200 × 600, the J-pull chosen the way a client
chooses it: `adapter.addDoors(unitId)` then `adapter.setHandle('jpull')`. Then the chain the SHAPE travels:

| link | what was asked | what it answered |
| --- | --- | --- |
| 1 · the choice | `adapter.handleChoice(project)` | `jpull` |
| 1 · the choice | `fronts cut by the engine` | `2` |
| 1 · the choice | `every leaf carries meta.jpull` | `true` |
| 1 · the choice | `every leaf is MACHINED (cnc.jpull)` | `true` |
| 1 · the choice | `the leaves, edge by edge` | `W01-FL:R W01-FR:L` |
| 2 · the engine | `leaf` | `W01-FL` |
| 2 · the engine | `leaf.h (mm)` | `2200` |
| 2 · the engine | `meta.jpull.edge (the ROOM edge)` | `R` |
| 2 · the engine | `meta.jpull.class` | `tall-door` |
| 2 · the engine | `meta.jpull.run` | `{"from":700,"to":1200,"clamped":false}` |
| 2 · the engine | `meta.jpull.problem` | `null` |
| 2 · the engine | `jpullRunOf(edgeH, spec) — what the engine wants` | `{"from":700,"to":1200,"clamped":false}` |
| 2 · the engine | `cnc.jpull (machined?)` | `L 700–1200` |
| 2 · the engine | `cnc.jpull.profile.slotDepth` | `40` |
| 3 · the dispatch | `shakerSolid hands a J leaf back` | `true` |
| 3 · the dispatch | `panelSolid takes it` | `true` |
| 3 · the dispatch | `panelSolid calls jpullLayers` | `true` |
| 3 · the dispatch | `UnitView routes a click on the strip` | `true` |
| 4 · the geometry | `jpullLayers → slabs` | `3` |
| 4 · the geometry | `slab 1 — the lip (z0, depth)` | `[0,4.212]` |
| 4 · the geometry | `slab 2 — the slot (z0, depth)` | `[4.212,10]` |
| 4 · the geometry | `slab 3 — the rear leg (z0, depth)` | `[14.212,10.788]` |
| 4 · the geometry | `the frame jpullLayers is asked in` | `sheetEdge L (room edge R)` |
| 4 · the geometry | `the slot pulled back from the edge, deepest (mm)` | `40` |
| 4 · the geometry | `the leg pulled back from the edge, deepest (mm)` | `30` |
| 5 · the camera | `what a camera on the fronts can see` | `{"stripe width (mm, across the face)":40,"stripe height (mm, up the leaf)":500,"stripe depth (mm, into the room)":10,"lip standing proud (mm)":4.212}` |

The lines, quoted from the files that hold them:

- `src/3d/shakerSolid.js:73` — `if (panel?.cnc?.jpull?.edge) return null;`
- `src/3d/panelSolid.js:174` — `const jpull = panel?.cnc?.jpull?.edge ? panel.cnc.jpull : null;`
- `src/3d/panelSolid.js:479` — `? jpullLayers({`
- `src/3d/UnitView.jsx:2143` — `if (onEditJpull && p.meta?.jpull?.run && e.point && e.object) {`

## The verdict

NOT CONVICTED ON THE GEOMETRY · the engine cuts the J, `panelSolid` builds it, and the depression is real: 40 mm across the face, 500 mm up the leaf, 10 mm deep. What the owner cannot see is a 10 mm step seen face-on from across a room, which is the honest answer and is why F4 asks for NUMBERS rather than a slider: the run is typed, not aimed at.

`test/turn72-f4-the-j-run.test.js` holds every row above as an assertion, so the
answer cannot drift without the suite saying so.

