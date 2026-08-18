# CLAUDE.md — TURN 39 · ASSIGN MATERIALS → BOM

Owner's verdict, 18.08.2026: *"musi być Assign materials i później BOM."*
The architecture is NOT invented here — it is lifted from the owner's own
Production Core (`Piotr3009/Sash-Planner-Web`), where it has been in
production use. Read those files before writing anything:

- `src/stores/materialAssignmentStore.js` — the part registry and the
  schema-2 assignment store (base + per-variant overrides, inheritance)
- `src/engine/bom.js` — `ELEMENT_TO_PART_ID`, `mergeWindowMaterials`,
  `effectiveAssignment`, the `_assigned` flag
- `src/engine/partRegistry.js` — `normalizeAssignments`,
  `expandAssignments`, `legacyToCanonical`
- `src/components/MaterialPicker.jsx` — the picker UI

Cabinet Core's equivalents get the same SHAPE with cabinet nouns. Where
this spec and Production Core disagree, this spec wins; where this spec
is silent, copy Production Core's answer rather than inventing one.

## Iron rules (binding)

1. **Zero-stop overnight run.** Never halt, never ask. Skip-and-note,
   sacrifice whole features from the LOWEST priority upward. PR opens
   before morning regardless.
2. **Engine contract: BYTE-IDENTITY.** `scripts/t39-classify.mjs`
   (sibling of t38's), no named buckets, UNNAMED=0. Materials and BOM
   are a READ-ONLY consumer of the engine's answer — assignment must not
   move a single byte of `computeCabinet()`. If a feature here seems to
   need an engine change, it does not: it needs a better read.
3. **Sanctity.** Zero licensed removals. Delete no function.
4. **LISP untouched.** `reference/lisp/**` does not change.
5. **No new dependencies.**
6. **SQL:** any new table ships as a numbered migration in `sql/`, with
   RLS on, labelled **"SQL PRZED push"** in the PR body. Code must
   DEGRADE GRACEFULLY when the migration has not been applied — the app
   still opens, BOM shows an empty-state, no crash.
7. **Proofs**: `verify/t39/` screenshot per visible feature, real pointer
   input, named subject asserted.
8. Tests first for every pure function (`node:test`), fixtures untouched,
   suite never `--silent`. One commit per feature, F-number in message.

## The problem, in the owner's words

> *"teraz mam osobno wszystkie BUL BUR — a po co? Jak powinny być carcase
> materials (jeśli ten sam wszędzie to połączyć w jedno)?"*

Cabinet Core has no layer between the engine's part names and the things
a joiner BUYS. Production Core does: `'JAMB LEFT': 'jambs'` and
`'JAMB RIGHT': 'jambs'` collapse two engine elements into one assignable
part. That mapping is what F1 builds.

Two collapses, not one — this is the heart of the turn:

- **Collapse 1 (registry):** many engine elements → one assignable PART.
  BUL and BUR are both `carcase_side`. You assign a board once.
- **Collapse 2 (BOM):** many parts → one PURCHASE LINE, keyed by the
  assigned material id (`mat:{id}`, exactly Production Core's `bump()`).
  If sides, top, bottom, partitions and shelves all point at the same
  Egger board, the BOM shows ONE line with the summed area. That is the
  owner's "jeśli ten sam wszędzie to połączyć w jedno" — and it needs no
  special case, it falls out of keying on material id.

## F1 [CRITICAL] — the part registry (`src/engine/partRegistry.js`)

A hardcoded, exported registry: the list of things a cabinet is made of,
grouped, each with `{ id, name, group, unit, materialType }`, plus
`ELEMENT_TO_PART_ID` mapping engine part names onto it.

**Proposed grouping — the owner may veto any row; if the pushed spec
strikes a row, follow the pushed spec.**

```
BOARD (unit m², materialType 'board')
  carcase_side        ← BUL, BUR
  carcase_horizontal  ← TOP, BOTTOM
  partition           ← PARTITION
  shelf               ← SHELF                 (fixed and adjustable alike)
  back                ← BACK                  (SEPARATE — usually 6 mm, not 18)
  plinth              ← PLINTH
  top_box_carcase     ← top box sides/top/bottom/back
  shoe_box_carcase    ← shoe box body parts

FRONT (unit m², materialType 'front')
  door                ← DOOR, split door leaves
  drawer_front        ← drawer fronts, shoe box fronts
  false_front         ← FIX fronts

DRAWER BOX (unit m², materialType 'board')
  drawer_box_side     ← drawer box sides/back/front
  drawer_bottom       ← drawer bottoms        (SEPARATE — thin board)

EDGING (unit m, materialType 'edging')
  edge_carcase, edge_front, edge_shelf

HARDWARE (unit pcs, materialType 'hardware')
  hinge, hinge_plate, runner, leg, rail_tube, rail_support,
  handle, shelf_pin, top_box_connector

LIGHTING (unit m / pcs, materialType 'lighting')
  led_strip (m), led_driver (pcs), led_profile (m)

CONSUMABLE (unit pcs / L, materialType 'consumable')
  screw_confirmat, dowel, glue, puzzle_screw
```

Rules the registry must obey:
- Separate ids where the MATERIAL genuinely differs (back, drawer bottom
  — thinner board; fronts — sprayed/veneered, not the carcase board).
  Merged ids where it does not (left/right, top/bottom).
- Every engine part name that reaches the cut list MUST appear in
  `ELEMENT_TO_PART_ID`. Anything missing is silently dropped from every
  BOM — Production Core carries a comment about exactly that bug
  ("the casement drop bug"). Ship a test that walks a full wardrobe +
  kitchen cabinet cut list and asserts ZERO unmapped part names.
- `ALL_PARTS` flat export for lookups, as Production Core has it.

Tests: mapping completeness (above), no duplicate ids, every part has a
unit.

## F2 [CRITICAL] — the assignment store + table

`src/stores/materialAssignmentStore.js`, schema-2 shape copied from
Production Core:

```
{ schema: 1, base: { [partId]: { material_id, yield, category, subcategory } },
             overrides: { [partId]: { [variantKey]: {...} } } }
```

- `base` = the project default for that part. `overrides` = per-variant
  (variant key for Cabinet Core = **cabinet family**: wardrobe / base /
  wall / tall / pantry). Overrides win, base inherits — same
  `assignmentFor()` semantics.
- **`yield`** (waste coefficient, default 1.0) per assignment, as
  Production Core has it. Board offcuts are real; the BOM must be able
  to add 10 % without lying about the geometry.
- Assignments live **per project** (owner: *"każdy jeden projekt powinien
  mieć Assign materials"*), persisted in Supabase alongside the design.
- **Profile defaults** (`profile.materials.defaults`) seed a NEW
  project's `base` — the Egger boards already chosen elsewhere. A project
  that has never been assigned opens with the defaults already in place,
  not empty.
- Migration: `sql/00X_material_assignments.sql`, RLS on, graceful
  degradation per iron rule 6.

Tests: base/override inheritance, defaults seeding, yield arithmetic,
round-trip through save/load.

## F3 [CRITICAL] — the Assign Materials modal

New entry in the project menu: **Assign materials**. Reachable from the
project, always, not only at creation.

Layout (follow the T38 editor's discipline — no wasted chrome):
- Left: the registry groups (BOARD / FRONT / DRAWER BOX / EDGING /
  HARDWARE / LIGHTING / CONSUMABLE) as a list; counts of unassigned per
  group beside each.
- Right: the parts of the selected group, one row each:
  `part name · assigned material (picker) · yield · [override per family]`
- Picker reads `cc_materials` (Supabase), filtered by `materialType`, with
  category/subcategory filters as Production Core's `MaterialPicker`.
- **UNASSIGNED PARTS ARE MARKED** — owner: *"podkreślone nowe materiały
  nieprzypisane"*. An unassigned row is visually distinct (underline +
  colour + a dot in the group list). A part that becomes unassigned
  because the design gained something new (first drawer, first LED strip)
  shows as **NEW** until touched.
- A running counter in the header: `N parts unassigned`.
- The modal is draggable and opens beside, not on top of, per the
  permanent UI rule.

Proof: `f3-assign-materials-unassigned-marked.png`.

## F4 [HIGH] — the automatic assignments

Owner: *"zawiasy automatycznie po wyborze koloru, nóżki też automatycznie
w zależności od wysokości."* Rule-driven auto-assignment, applied when
the part is untouched by hand; a manual assignment always wins and is
never overwritten.

- **hinge / hinge_plate** — resolved from the chosen hardware finish
  (the existing internal-metal colour choice) + the hinge type already in
  the profile. Choosing the finish assigns every hinge part at once.
- **leg** — resolved from plinth height: a height→product table in the
  profile (`profile.materials.legRules`), nearest-fitting product, with
  the adjustment range respected. Out of range → leaves it unassigned and
  says why.
- **runner** — from drawer depth and the runner family already chosen
  (MOVENTO/TANDEM), reusing the existing runner selection law. Do NOT
  re-derive lengths here; read what the engine already decided.
- **led_strip / led_profile** — length in metres from the strips the
  design actually carries.
- Every auto-assignment is marked as such in the UI (small `auto` tag)
  and can be overridden by hand, which clears the tag for that part.

Tests: each rule with in-range, out-of-range and boundary inputs; manual
assignment survives a rule re-run.

## F5 [CRITICAL] — the BOM engine (`src/engine/bom.js`)

Pure functions, no UI, no store reads — arguments in, list out. Shape and
naming follow Production Core's `bom.js`:

- `buildCabinetPartQtys(computed, unit, settings)` →
  `{ [partId]: { m2?, m?, pcs?, unit } }`. Areas from the panels the
  engine already computed; edging length from the perimeter of edged
  sides (read the existing edging decision, do not invent one); hardware
  counts from the engine's own hinge/runner/pin lists.
- `mergeUnitMaterials(units, { assignments, materials, ALL_PARTS })` →
  the flat purchase list, accumulating with Production Core's `bump()`:
  - assigned → key `mat:{material_id}`, `_assigned: true`, cost from
    `cc_materials.cost_per_unit`
  - unassigned → key `part:{partId}`, `_assigned: false`, cost 0, so the
    user sees exactly what is missing
  - yield applied per assignment before summing
- **Sheet estimate** for board lines: `ceil(area × yield ÷ sheet area)`
  using the per-family sheet size that T35-F15 already stores. Label it
  plainly as an ESTIMATE — real nesting is parked and this is not it.
- Project BOM = simple sum over units, so one cabinet's BOM and the
  project BOM can never disagree.

Tests: two parts on one material merge to one line with summed qty; yield
arithmetic; unassigned parts appear as `part:` lines with zero cost;
sheet estimate rounds up; a two-cabinet project equals the sum of its
two single-cabinet BOMs.

## F6 [HIGH] — the BOM view

New tab/panel: **BOM**. Two levels, switchable: **this cabinet** /
**whole project**.

Columns: material name · qty · unit · sheets (board lines only) · unit
cost · line cost · source group. Grouped by registry group, group
subtotals, project total at the bottom.

- Unassigned lines sit at the TOP, marked, with a button that opens
  Assign Materials on that exact part.
- Costs show only where a cost exists; a BOM with unassigned lines shows
  its total as **incomplete**, never as a confident number.
- Export: CSV (and the existing PDF path if one exists — reuse, do not
  build a second).

Proof: `f6-bom-project-with-unassigned-on-top.png`.

## F7 [MEDIUM] — the gate

The existing hard gate ("Save blocked without a Stock board assigned for
spray/veneer sources") folds into this system rather than living beside
it: the gate now asks the assignment store. Nothing is loosened — a
missing board still blocks. Add: **Export CNC warns** (warns, not blocks)
when the project has unassigned parts, because a cut file for a board
nobody has chosen is a cut file for the wrong board.

Tests: gate still blocks the original case; warning fires and does not
block.

## F8 [LOW] — user-defined consumables

Production Core's `customParts`: the user adds a line ("dowels 8×40",
qty per cabinet, unit), assigns a material, and it flows into the BOM
like any registry part. Same shape, same merge path.

## Execution order

F1 → F2 → F5 → F3 → F6 → F4 → F7 → F8.

The registry and the pure BOM engine come first because everything else
reads them; the UI follows; the automatic rules and the extras go last,
so a short night cuts F8, then F7, then F4 — each skip named in the PR.

## What this turn does NOT touch

The CNC editor (T38 is done). `reference/lisp/**`. `SettingsPanel.jsx`.
Engine output for the six configs. Golden fixtures. Real nesting,
Cabineo and other joinery systems, the pattern library, pull-down rail,
L-shape — all parked. Kitchens and kitchen patterns — parked pending the
owner's inventory pass.

## Morning audit will run

Fresh clone → branch → clean-room install → full suite (never --silent)
→ vite build → t39-classify borrowed onto main → BYTE-IDENTITY,
UNNAMED=0 → sanctity diff-audit (zero removals) → `reference/lisp/`
untouched → SQL migration present and labelled → graceful degradation
verified with the migration NOT applied → verify/t39 complete → verdict
→ the owner's numbered eye-test list.