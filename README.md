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

1. **Room setup** — main wall height and width (the project anchor).
2. **Library** — drop a Wardrobe or a Base unit at the wall; drag it along the
   wall, snapped to 0.5 / 1 / 32 mm, magnetically butting against neighbours.
3. **Select a unit** — the right panel holds the carcass parameters.
4. **+ Add items** — drawers (stacked from the bottom, the partition above them
   is automatic), shelves, hanger rail.
5. **Shelves** — `[+]` / `[×]`, type a position, or drag one vertically in 3D
   with a live dimension to its neighbours.
5b. **Drawer heights** — every drawer carries its own front height (default
   200 mm); the box parts, runner rows, partition and BOM follow it live.
6. **Doors last** — "Add doors — finish unit" closes the panel.
7. **CNC view** — the **3D | CNC** switch in the top bar lays every cut part of
   the selected unit out flat, drawn from the engine's own CNC geometry: puzzle
   outlines, dog-bone and socket pockets, every hole, one colour per layer with
   a legend you can toggle. Zoom, pan, read only — the workshop's visual check
   before the machine.
8. **BOM** — parts list, material assignment per role with a yield coefficient,
   and a **Hardware** section (hinges, runner pairs, legs, rail, shelf pins)
   counted from the geometry and assigned to your own hardware list. Always
   computed live; shown on demand.
9. **Export** — cutting-list CSV (exactly the LISP format, cut parts only), a
   project PDF with the 3D view, materials and hardware, and **one DXF per cut
   part** zipped as `{unitNum}-dxf.zip` from the CNC view.

### Collisions

Moves **stop at the boundary** — never a warning after an overlap. A shelf
dragged at its neighbour, the top panel or the drawer partition stops at the
minimum clearance; a unit thrown along the wall butts flush against the next
unit or the wall end. The rules are pure functions in `src/engine/collision.js`,
called from the store setters, so dragging and typing a number cannot reach
different states. Clearances live in `profile.editor`.

---

## Layout of the repo

```
src/engine/      pure calculation — no React, no stores, no bare numbers
  profile.js       every workshop constant as an editable default
  cabinet.js       computeCabinet(params, profile) -> panels/drills/totals/csv
  puzzle.js        Skylon puzzle joint geometry, 1:1 from SKYLON_COMMON.lsp
  bom.js           aggregation across units, material + hardware demand
  collision.js     hard clamps: shelf/shelf, shelf/zone, unit/unit, unit/wall
  types.js         per-unit-type config (WARDROBE, BUD)
  format.js        AutoLISP-compatible rounding
  cnc/layers.js    CNC layer names + colours — a contract with the machine
  cnc/dxf.js       DXF R12 writer + the parser the tests read it back with
  cnc/layout.js    flat sheet layout behind the CNC view
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
stays visible. See `BLOCKERS.md` #1 for the one open case.

---

## Status

`BUILD-LOG.md` has a verdict per phase and per turn-2 task; `BLOCKERS.md` has
the open questions. CI runs `npm ci && npm test && npm run build` on Node 22 for
every push and pull request to main.

DXF is written as **R12 (AC1009)**, following the writer that is in production
at the workshop today — R12 has no LWPOLYLINE, so a closed polyline is
`POLYLINE` + `VERTEX` + `SEQEND` with the closed flag. The reasoning, and what
to do if VCarve disagrees, is `BLOCKERS.md` #8.

Deliberately **not** in this build: inset drawer fronts (no deductions yet),
side walls, nesting, and the JoineryCore integration — `jc_uuid` is in the
schema and stays unused.
