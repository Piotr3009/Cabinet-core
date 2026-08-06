# Cabinet Core

Parametric cabinet and fitted-furniture configurator for joinery workshops.
Part of the "Core" family (JoineryCore = ERP, Production Core = window planner).

**You do not draw — you configure.** Panels, CNC drilling and materials are
calculated from the production maths, not sketched.

---

## Run it

```bash
npm install
npm run dev          # http://localhost:5173
```

That is the whole setup. **No `.env` is required** — without Supabase keys the
app runs in **Mock data mode** (yellow badge in the top bar): every feature
works, projects live in the browser instead of the cloud.

```bash
npm test             # engine + BOM tests against the golden fixtures
npm run build        # production bundle into dist/
npm run preview      # serve the built bundle
```

### Optional: cloud projects

```bash
cp .env.example .env
# fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
#   (Supabase dashboard -> Project Settings -> API)
```

Then run **`sql/001_init.sql`** by hand in the Supabase SQL editor. It is never
executed automatically — the header says so, and the app degrades gracefully if
the tables are not there yet.

---

## The flow

1. **Room setup** — a room is a list of walls, drawn as a top-view plan you can
   edit: rectangle or L-shape, per-wall lengths, ceiling height, windows and
   doors. A DXF floor plan can be imported (LINE / LWPOLYLINE, parsed in-house).
   Walls facing away from the camera hide themselves, so looking down at the
   room IS the plan view. Shrinking a room below the units standing in it is
   refused, with the reason.
2. **Library** — eight unit types: Wardrobe, Base unit, Base unit with 3 drawers
   (BUDR), Wall unit (WUD), Tall unit, Low cabinet, Sink base and Fridge
   housing. Drop one at the wall; drag it along the wall, snapped to
   0.5 / 1 / 32 mm, magnetically butting against neighbours. A full wall sends
   the unit round the room to one with space, and a full room declines it.
3. **Select a unit** — the right panel holds the carcass parameters, the wall it
   stands on, its rotation, and its door style.
4. **+ Add items** — drawers (stacked from the bottom, the partition above them
   is automatic), shelves, hanger rail.
5. **Shelves** — `[+]` / `[×]`, type a position, or drag one vertically in 3D
   with a live dimension to its neighbours.
5b. **Drawer heights** — every drawer carries its own front height (default
   200 mm); the box parts, runner rows, partition and BOM follow it live.
6. **Doors last** — "Add doors — finish unit" closes the panel.
6b. **Design Settings** — project-level: one to three carcass materials, the
   standard front type, your own door-style library, and the front colour from
   the RAL / Farrow & Ball lists or a hex of your own. The colour shows on the
   fronts in 3D. The scribe-infill width is set here and used by the automatics.
6c. **Automatics** — a unit placed in the room arrives with its plinth, its
   scribe fillers at the wall and a 40 mm top infill already worked out. Grab
   the infill and drag it up to the ceiling, or double-click it to send it
   there. All three are real cut parts in the BOM and on the CNC sheet.
7. **CNC view** — the **3D | CNC** switch on the canvas toolbar lays every cut
   part of the selected unit out flat, drawn from the engine's own CNC geometry: puzzle
   outlines, dog-bone and socket pockets, every hole, one colour per layer with
   a legend you can toggle. Zoom, pan, read only — the workshop's visual check
   before the machine.
8. **BOM** — parts list, material assignment per role with a yield coefficient,
   and a **Hardware** section (hinges, runner pairs, legs, rail, shelf pins)
   counted from the geometry and assigned to your own hardware list. Always
   computed live; shown on demand.
9. **Export** — cutting-list CSV (exactly the LISP format, cut parts only), a
   project PDF with the 3D view, materials and hardware, and two DXF routes from
   the CNC view: **one file with the parts you selected**, laid out exactly as
   the preview shows them (`{unitNum}-cnc-{preset}.dxf`), or **one DXF per cut
   part** zipped as `{unitNum}-dxf.zip` for re-cutting a single damaged panel.
   Parts are grouped Carcass / Shelves / Drawers / Fronts & doors with presets
   for All, Carcass only, All without drawers, and Fronts & doors only.

### Working in 3D

Click and hold a unit to slide it along its wall — the camera does not move;
the orbit only starts from a wall or the background. Double-click a part to fly
the camera to it, or a front to open it: drawers slide out, doors swing on the
hinge the engine gave them. Right-click a unit for Center shelves, Rotate 90°
and Delete. The canvas toolbar carries Show/Hide dimensions, the BOM and the
3D | CNC switch; with dimensions on, arrows measure every gap between units and
from each unit to the wall, live while you drag.

### Collisions

Moves **stop at the boundary** — never a warning after an overlap. A shelf
dragged at its neighbour, the top panel or the drawer partition stops at the
minimum clearance; a unit thrown along the wall butts flush against the next
unit or the wall end. Widening or deepening a unit is the same rule with the
far edge moving, and a unit meeting another around a CORNER is measured in this
wall's frame, so the two-dimensional case reduces to the same one-dimensional
clamp. Adding a unit, moving one to another wall and reshaping the room all go
through it too — the app never creates an overlap it then reports. The rules
are pure functions in `src/engine/collision.js`, called from the store setters,
so dragging and typing a number cannot reach different states. Clearances live
in `profile.editor`.

---

## Layout of the repo

```
src/engine/      pure calculation — no React, no stores, no bare numbers
  profile.js       every workshop constant as an editable default
  cabinet.js       computeCabinet(params, profile) -> panels/drills/totals/csv
  puzzle.js        Skylon puzzle joint geometry, 1:1 from SKYLON_COMMON.lsp
  bom.js           aggregation across units, material + hardware demand
  collision.js     hard clamps: shelf/shelf, shelf/zone, unit/unit, unit/wall,
                   resize, footprints and corners
  types.js         per-unit-type config — eight kits as diffs from one core
  legs.js          leg layout: four corners, a fifth over the width threshold
  room.js          rooms as a list of walls; rectangle and L; openings; guard
  dxfImport.js     in-house DXF reader for an imported floor plan
  design.js        project design settings: materials, fronts, colours, styles
  autoparts.js     plinth, side infill and top infill as real cut parts
  dimensions.js    the distances the canvas draws: unit-to-unit, unit-to-wall
  format.js        AutoLISP-compatible rounding
  cnc/layers.js    CNC layer names + colours — a contract with the machine
  cnc/dxf.js       DXF R12 writer + the parser the tests read it back with
  cnc/layout.js    flat sheet layout behind the CNC view
  cnc/groups.js    part groups and the export presets
src/stores/      Zustand: project, ui, workshop profile, material assignments
src/3d/          R3F scene, room, unit rendering, billboarded labels
src/components/  shell UI, panels, modals
src/pages/       the configurator page
src/lib/         Supabase client (mock-mode aware), cloud sync, exporters
sql/             schema + RLS — run by hand
test/            node:test against fixtures/golden-*.json
fixtures/        golden values from production LISP — READ ONLY
reference/       source LISP + Production Core patterns
```

### The engine rule

`src/engine/` is plain JavaScript with **zero React imports**. Every number the
maths uses lives in `profile.js`, so a different workshop changes NUMBERS, never
formulas. The engine's single read point is `getCabinetProfile()`.

### The layer-name rule

CNC layer names (`OUTLINE`, `PUZZLE_SOCKET`, `SCREWS_3MM`, `HINGES_5MM`, …) come
straight from `SKYLON_COMMON.lsp` and are a hard contract: VCarve maps tools by
layer name, so renaming one breaks a real machine. They live in one place,
`src/engine/cnc/layers.js`, together with the AutoCAD colour each gets.

### The fixtures rule

`fixtures/golden-*.json` are computed from the production AutoLISP and are
**never edited to make a test pass**. If the engine disagrees with a fixture,
the engine is wrong — or the disagreement goes in `BLOCKERS.md` and the test
stays visible. A NEW type gets its fixture derived from the LISP line by line
FIRST, saved, and only then is the engine written to it. The six fixtures added
for turn 3 carry `status: PENDING_PIOTR_VERIFICATION` and a `verify_with_piotr`
section: derived from the code is not the same as confirmed on a real cabinet
(`BLOCKERS.md` #15).

---

## Status

`BUILD-LOG.md` has a verdict per phase of every turn; `BLOCKERS.md` has the open
questions. CI runs `npm ci && npm test && npm run build` on Node 22 for every
push and pull request to main. **357 tests, 0 failing.**

DXF is written as **R12 (AC1009)**, following the writer that is in production
at the workshop today — R12 has no LWPOLYLINE, so a closed polyline is
`POLYLINE` + `VERTEX` + `SEQEND` with the closed flag. The reasoning, and what
to do if VCarve disagrees, is `BLOCKERS.md` #8.

Deliberately **not** in this build: inset drawer fronts (no deductions yet),
handles, a technical DXF/SVG drawing of the room, nesting, a project-wide
export, and the JoineryCore integration — `jc_uuid` is in the schema and stays
unused. Windows and doors in walls are visual only; they do not yet take part
in collision.
