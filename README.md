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

0. **Start screen** — the app opens on it: name a new project (and the room it
   is quoted for), open one you saved, or click one of the last five you had
   open. The canvas is only ever reached THROUGH a project. Without Supabase
   keys projects live on the local shelf, which is what makes Mock data mode a
   working app rather than a demo.
0b. **The menu bar** — one bar, one style: **File** (New / Open / Save / Save
   as / Export ▸ CSV · PDF · unit DXF ZIP · BOM / Close project) · **View**
   (Outlines, Dimensions, 3D | CNC sheet, Contour view) · **Library ▸**
   categories · **Settings** (Design settings, Room setup, Snap) · **Database**
   and **Clients**, held open and marked *soon*. Account and Export stay on the
   right.
1. **Room setup** — a room is a list of walls, drawn as a top-view plan you can
   edit: rectangle or L-shape, per-wall lengths, ceiling height, windows and
   doors. A DXF floor plan can be imported (LINE / LWPOLYLINE, parsed in-house).
   Walls facing away from the camera hide themselves, so looking down at the
   room IS the plan view. Shrinking a room below the units standing in it is
   refused, with the reason.
2. **Library** — opened from the menu, **one category at a time**: Base units
   (BUD, BUDR, Sink, Low cabinet), Wall units (WUD), Tall units (Tall, Fridge,
   Wardrobe), plus Saved sets and Media walls held open for later. The panel
   still floats and moves, and now closes with an X or Escape. Drop a unit at
   the wall; drag it along the wall, snapped to 0.5 / 1 / 32 mm, magnetically
   butting against neighbours. A full wall sends the unit round the room to one
   with space, and a full room declines it. A unit **stops one infill width
   short of the wall** rather than reaching it (see Automatics).
3. **Select a unit** — the right panel holds the carcass parameters, the wall it
   stands on, its rotation, and its door style.
4. **Add items** — a list of types whose settings open **inline in the panel**,
   never in a window: drawers (stacked from the bottom, the partition above them
   is automatic, and the doors swing open so you can see them), shelves (filled
   from the top down, never onto one that is already there) and the hanger rail
   (hung as high as the lowest shelf allows, and chosen from your hardware list
   so the BOM names the product). Every section of the panel folds.
5. **Shelves** — add, type a position, press Even to space them out, or drag one
   vertically in 3D with a live dimension to its neighbours.
5b. **Drawer heights** — **Equal heights** is ticked by default: one field for
   the whole stack. Untick it for a field per drawer, listed TOP-DOWN like the
   3D view, each row carrying the engine's own number (D1 is the bottom drawer
   everywhere — on the cut list, on the CNC sheet and at the saw). The box
   parts, runner rows, partition and BOM follow live.
6. **Doors last** — "Add doors — finish unit" closes the panel.
6b. **Design Settings** — project-level: one to three carcass materials, the
   standard front type, your own door-style library, and the front colour from
   the RAL / Farrow & Ball lists or a hex of your own. The colour shows on the
   fronts in 3D. The scribe-infill width is set here and used by the automatics.
6c. **Finish** — the carcass is broken white by default, with light grey and two
   wood decors (dark walnut, light oak) as alternatives. Fronts default to the
   carcass; a decor is chosen per material, and a front COLOUR is paint that
   covers it. The decor images are generated locally by
   `node scripts/gen-textures.mjs` — nothing is downloaded, so no third-party
   artwork licence rides along in the app. Contours are thin and black with an
   **Outlines** switch, and the sheen is a 20 % clearcoat over a matt board.
6d. **Automatic vs asked-for** — the **side infill** is automatic because it
   describes a fact: a unit stops one infill width from the wall (the width from
   Design Settings), so parking it there produces the filler that closes the gap
   and driving away removes it again. The **plinth**, the **top infill** and
   **end panels** are decisions: they are added from the Construction section or
   the right-click menu, and until then they do not exist — not in 3D, not in
   the BOM, not in the DXF. An end panel is a cut piece outside a carcass side
   (to the floor or to the unit height, front thickness by default, "apply to
   all" so the next one matches); it is part of the unit's footprint, and one
   that does not fit is refused with the gap and the culprit named.
6e. **Contour view** — View ▸ Contour view fades the material out and leaves the
   outlines, for a render or a printed screen. It changes nothing in the BOM.
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
hinge the engine gave them. Right-click a unit for the end panels, the plinth,
the top infill, Center shelves, Rotate 90° and Delete; what is already fitted is
offered as "remove", and what will not fit says so. The canvas toolbar carries
Show/Hide dimensions, **Outlines**, the BOM and the 3D | CNC switch; with
dimensions on, arrows measure every gap between units and from each unit to the
wall, live while you drag.

Every numeric field in the app holds TEXT while you type it and commits on Enter
or blur, with Escape putting the stored value back. Nothing is parsed, rounded or
clamped mid-word — which is what made drawer heights untypeable before turn 4.

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
  items.js         the ONE written-down order of interior items, and where a
                   new one is placed so it cannot collide
  puzzle.js        Skylon puzzle joint geometry, 1:1 from SKYLON_COMMON.lsp
  bom.js           aggregation across units, material + hardware demand
  collision.js     hard clamps: shelf/shelf, shelf/zone, unit/unit, unit/wall,
                   resize, footprints and corners
  types.js         per-unit-type config — eight kits as diffs from one core
  legs.js          leg layout: four corners, a fifth over the width threshold
  room.js          rooms as a list of walls; rectangle and L; openings; guard
  dxfImport.js     in-house DXF reader for an imported floor plan
  design.js        project design settings: materials, fronts, colours, styles,
                   finishes (which decor a piece wears) and end-panel defaults
  autoparts.js     the side infill (automatic, from the room) and the plinth /
                   top infill (manual — carried, never invented)
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
src/lib/         Supabase client (mock-mode aware), cloud sync, exporters,
                 the local project shelf, saving, and the numeric-field rule
scripts/         gen-textures.mjs — the wood decors, generated (own PNG encoder,
                 zero dependencies, deterministic output)
public/textures/ the generated decor images
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
push and pull request to main. **471 tests, 0 failing** (`npm test`), plus an
end-to-end run in Chromium at the end of every turn.

Every millimetre on screen goes through one function, `formatMm()` in
`src/engine/format.js` — whole numbers whole, halves halved, anything else to a
tenth. There is no `Math.round` on a millimetre outside the engine, and numeric
fields commit on the half-millimetre grid, so 196.5 can be typed, seen and cut
(`BACKLOG.md` #33).

DXF is written as **R12 (AC1009)**, following the writer that is in production
at the workshop today — R12 has no LWPOLYLINE, so a closed polyline is
`POLYLINE` + `VERTEX` + `SEQEND` with the closed flag. The reasoning, and what
to do if VCarve disagrees, is `BLOCKERS.md` #8.

Manufacturer decors arrived in turn 5: the EGGER pack (85 decors) is in
`public/decors/`, and `src/engine/decors.js` carries the licence in code rather
than in a comment — a decor image is shown whole and always beside its
attribution, and **never** on 3D geometry. In 3D a uni colour is its flat hex and
a woodgrain is our own procedural grain tinted with the decor's colour, which is
what the terms allow until there is written consent (`BACKLOG.md` #19).

Deliberately **not** in this build: inset drawer fronts (no deductions yet),
handles, a pull-down rail, media walls (held open in the Library menu), decor
packs from other manufacturers and per-workshop decor import, spray finishing
(a place in the menu, nothing behind it), a technical DXF/SVG drawing
of the room, nesting, a project-wide export, and the JoineryCore integration —
`jc_uuid` is in the schema, and Database / Clients are places in the menu with
nothing behind them yet. Windows and doors in walls are visual only; they do not
yet take part in collision.
