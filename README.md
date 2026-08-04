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
6. **Doors last** — "Add doors — finish unit" closes the panel.
7. **BOM** — parts list and material assignment per role with a yield
   coefficient. Always computed live; shown on demand.
8. **Export** — cutting-list CSV (exactly the LISP format) and a project PDF
   with the 3D view.

---

## Layout of the repo

```
src/engine/      pure calculation — no React, no stores, no bare numbers
  profile.js       every workshop constant as an editable default
  cabinet.js       computeCabinet(params, profile) -> panels/drills/totals/csv
  puzzle.js        Skylon puzzle joint geometry, 1:1 from SKYLON_COMMON.lsp
  bom.js           aggregation across units, material demand with yield
  types.js         per-unit-type config (WARDROBE, BUD)
  format.js        AutoLISP-compatible rounding
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

### The fixtures rule

`fixtures/golden-*.json` are computed from the production AutoLISP and are
**never edited to make a test pass**. If the engine disagrees with a fixture,
the engine is wrong — or the disagreement goes in `BLOCKERS.md` and the test
stays visible. See `BLOCKERS.md` #1 for the one open case.

---

## Status

`BUILD-LOG.md` has a verdict per phase; `BLOCKERS.md` has the open questions.
Deliberately **not** in this build: DXF output (the engine already carries the
full CNC geometry — outlines, dog-bones, holes, layer names — so the generator
is additive), inset drawer fronts, side walls, and the JoineryCore integration.
