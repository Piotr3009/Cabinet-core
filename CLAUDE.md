# CLAUDE.md — TURN 38 · THE CNC EDITOR ("mini AutoCAD") + three eye-test fixes

Owner's verdict, 17.08.2026, after the T37 eye-test: *"daj wszystko w 38,
zmieścimy"* — the full editor in one night. The order of execution below is
the insurance: foundation first, precision tools last, so a skip cuts from
the bottom, never from under the floor.

## Iron rules (unchanged, re-asserted)

1. **Zero-stop overnight run.** Never halt, never wait for an answer.
   Skip-and-note rather than stop. The PR opens before morning regardless.
   Sacrifice from the LOWEST-priority feature upward, whole features at a
   time, each skip named in the PR body.
2. **Engine purity — this turn's contract is BYTE-IDENTITY.** Sibling
   `scripts/t38-classify.mjs` (copy `t37-classify.mjs`, retitle): NO named
   buckets. Every change here is UI-side, overrides-side, checks-side, or
   touches units absent from the six configs (top box). Any delta in the
   bare `computeCabinet()` answer for the six = UNNAMED = exit 1.
3. **Sanctity.** No function is deleted. This turn licenses ZERO removals.
   `SettingsPanel.jsx` stays in the tree, untouched, as before.
4. **LISP untouched.** No file under `reference/lisp/` changes this turn.
   The editor writes DXF entities on layers; it does not change the law.
5. **No new dependencies.** The editor is hand-rolled geometry on the
   existing stack (React + Zustand + SVG/canvas as the current
   PartDetailModal already does). No paper.js, no maker.js, nothing.
6. **PROOFS ARE NOT OPTIONAL.** Every feature with a visible surface ships
   a `verify/t38/` screenshot with a named subject from real pointer input,
   or it is not done. F-numbers in filenames.
7. **DXF carries NO text styles, ever** (VCarve parser crash, confirmed
   02.08.2026). Measurement is screen-only and never exported. Repeat: no
   TEXT, no MTEXT, no STYLE table entries in any export this turn.
8. Tests: `node:test` for every new geometry function BEFORE wiring it to
   UI. Golden fixtures untouchable. Suite never runs `--silent`.

## Where the editor lives today (read this before writing anything)

- `src/components/PartDetailModal.jsx` (~1388 lines) — the current part
  editor: Select / Drill / Line / Dowel line tools, layer question asked
  once (T26-F12.1), manual ops via `addOp`, reset-to-engine, snap toggles.
- `src/engine/partSnap.js` — the snap engine: 8 snap kinds with priority,
  `snapAt()`, `placeByNumber()` (numeric placement already works),
  `segmentIntersection()`, `footOfPerpendicular()`,
  `drawingDimensionRows()`.
- `src/stores/partSnapStore.js` — snap toggle state.
- Manual edits persist in `unit.params.element_overrides[panelId]`
  (projectStore ~3452, turn 9 F4) and are applied in a thin step AFTER the
  engine ("the engine stays pure and ignorant", ~5220). All new object
  types live in the SAME structure. Ops already carry `op`, `layer`, and
  coordinates; extend, do not replace.
- Layer list comes from `CNC_LAYERS` in `src/engine/cnc/layers.js`.

## F1 [CRITICAL] — three eye-test fixes from T37

**F1a — stale hinge positions in the check layer.** Owner: adding a top
box recalculates the host's hinges correctly, but a Check rule still
reads the OLD hinge positions and reports a collision where no hinge is
any more. A full page reload clears it — so the stale data lives in an
in-memory cache/selector, not in the saved design. Find the check that
consumes hinge positions (rule #12 "Shoe box × hinge collision" is the
prime suspect — but verify, do not assume), find what it memoises on, and
make it recompute when the hinge layout recomputes. Prove with a test:
add a top box, assert the check re-reads the NEW positions without a
reload.

**F1b — top box door hinge COUNT.** A top box door 500 mm tall gets 5
hinges because it inherits the count from the host instead of running the
standard hinge-count law on ITS OWN door height. A 500 mm door takes 2.
The top box is a unit of its own type: its doors go through the same
`hingeHoleYList` law as any door of that height. Test: top box door at
500 → 2 hinges; at 900 → whatever the standard law says for 900 —
assert against the law's own output, not a hand-typed constant.

**F1c — top box BACK panel orientation.** The back is laid HORIZONTAL;
it must be VERTICAL (grain and drawn orientation both), consistent with
how T36-F5/T37-F7 state grain for backs elsewhere. Fix the stated grain
for the top box back and let the two readers (sheet + 3D) do their jobs.
Test in the cross-frame style of T37-F7.

These three are engine-adjacent but touch only top-box units and the
check layer — none of the six configs contains a top box, so BYTE-IDENTITY
holds. If any fix would move a byte of the six, STOP that fix, note it,
and leave it for the owner.

## F2 [CRITICAL] — the editor shell: full screen, docked chrome, canvas first

Replace PartDetailModal's layout (the component may keep its name and
file; this is a redesign of its body, not a deletion):

- **Full-screen.** The editor covers the whole viewport. No page chrome
  visible behind it. Esc asks nothing and closes only when no tool is
  armed (see F11).
- **Top bar** (one row, slim): part title (`W03 · Right side — BUR`),
  size (`560 × 2460 · 18 mm`), close ×.
- **Toolbar** (second row, small icons with tooltips, AutoCAD-style
  groups):
  - draw: Line, Polyline, Circle, Rect, Arc
  - modify: Move, Copy, Rotate, Mirror, Offset, Trim, Fillet, Array
  - measure: Measure (F6)
  - right-aligned: `layers ▾` and `snap ▾` dropdowns (F3, F4)
- **Canvas takes everything else.** The drawing area is the rest of the
  viewport. Wheel zoom, drag pan, double-click fit — keep the existing
  behaviours.
- **Status bar** (bottom, one slim row): live cursor x/y in mm, active
  snap kind, active layer, current tool hint.
- The old bottom SNAP checkbox row and the old right-hand layer legend
  are REPLACED by F3/F4 below. (Replaced = their JSX goes; the underlying
  stores and layer data live on. No function deleted.)

Proof: `f2-fullscreen-shell-canvas-maximised.png`.

## F3 [HIGH] — layers: collapsible overlay + user layers

- Layer panel is a small collapsible overlay in the canvas's top-right
  corner (over the canvas, taking NO width from it), plus the `layers ▾`
  dropdown in the toolbar showing the same list. Each row: colour chip,
  name, entity count, visibility toggle.
- **Add layer**: a `+ new layer` row opens name + colour picker. User
  layers persist per PROJECT (store them alongside the design so they
  survive save/load), appear in the layer question when placing ops, and
  export to DXF under their given name and colour. Layer names sanitised
  to DXF-safe charset (A–Z, 0–9, underscore; uppercase them).
- A layer is a NAME and a colour, nothing more. No cut/mark semantics —
  the CNC operator assigns toolpaths per layer in VCarve, exactly as
  today. (Owner confirmed 17.08: "czy to już nie nasz problem czy to już
  VCarve?" — it is VCarve's.)
- Active layer shown in the status bar; new objects land on the active
  layer.

Proof: `f3-user-layer-created-name-and-colour.png`.

## F4 [HIGH] — snap: dropdown, not a checkbox row

The 8 snap kinds move into the `snap ▾` toolbar dropdown: checkboxes in
the dropdown, `all` / `none` at the bottom, active kinds summarised in
the status bar. Same `partSnapStore` state underneath — this is a
re-housing, not a rewrite.

Proof: `f4-snap-dropdown-open.png`.

## F5 [HIGH] — drawing NEW objects, with drag + TAB dimension entry

New ops in `element_overrides` (same structure, new `op` values):

- `line` (exists), `polyline` (click-click-…-Enter/double-click to end,
  close with C), `circle` (centre + radius), `rect` (two corners),
  `arc` (three points: start, through, end).
- **Drag-draw with dynamic dimensions**: while dragging a rect, ghost
  preview + editable dimension fields follow the cursor; **TAB cycles the
  fields** (width → height), typing a number fixes that dimension, Enter
  commits. Same pattern for circle (radius), line/polyline segment
  (length), arc where sensible. Build this ON `placeByNumber()` — the
  numeric spine already exists; this turn gives it the TAB-cycling UI.
- Every placement snaps through `snapAt()` as today.
- Objects render on their layer's colour, live, on the canvas.

Data note: each object stores plain mm coordinates in the panel's CNC
frame, its layer, and an id. **Store `panelSize: {w, h}` on the override
set the first time a manual op is added** (needed by F9).

Tests first: geometry constructors (arc through 3 points especially) in
`node:test` with degenerate cases (collinear points → no arc, zero
radius, zero-size rect → rejected).

Proofs: `f5a-rect-dragged-with-tab-dimensions.png`,
`f5b-polyline-and-arc-drawn.png`.

## F6 [HIGH] — select, right-click, and the object verbs

- Click selects (hover highlight as today); marquee (drag on empty
  canvas) selects many; Shift-click adds.
- **Right-click on selection** opens a context menu: **Move, Copy,
  Rotate, Group, Delete.** (Owner named these five, 17.08.) Delete also
  on the Del key. Menu opens beside the cursor, never off-screen.
- Move/Copy: click base point → click destination (or type distance —
  `placeByNumber` again). Rotate: base point + angle (drag or typed).
- **Group**: selected objects get a shared `group` id; clicking any
  member selects the whole group; Ungroup in the same menu when a group
  is selected. Groups move/copy/rotate/delete as one.
- Engine-computed geometry (the print itself) is NOT selectable for these
  verbs — only manual objects. The existing delete-a-hole-off-this-print
  flow (Select tool + Delete button) stays as it is.

Proofs: `f6a-context-menu-on-selection.png`,
`f6b-group-moved-as-one.png`.

## F7 [MEDIUM] — measure (screen-only)

Measure tool: click two points → distance (and dx/dy) shown on canvas
and in the status bar; Esc clears. Snaps like everything else. Renders
as an on-screen annotation ONLY — never enters `element_overrides`,
never exports (iron rule 7). Multiple measurements may stack until Esc
or tool change clears them.

Proof: `f7-measure-between-two-holes.png`.

## F8 [MEDIUM] — the 3D thumbnail that grows

The 3D preview becomes a small thumbnail docked bottom-left ON the
canvas (like the layer overlay: over, not beside). **Double-click cycles
its size** small → medium → large → small. It never resizes the drawing
area — it floats above it. Keep the existing 3D content as-is.

Proof: `f8-3d-thumbnail-two-sizes.png` (a composite or two shots).

## F9 [MEDIUM] — the resize rule + two guard checks

- **The rule (owner's word, 17.08): custom geometry DIES with a panel
  resize.** On every recompute, compare the engine's panel w×h with the
  stored `panelSize` on that panel's override set. Same size → overrides
  ride along untouched (recomputes happen constantly — shelf moves, LED
  toggles — and must NOT clear anything). Different size → drop that
  panel's manual objects and surface a dismissible note: "Custom
  geometry dropped — {panel} was resized." List the dropped panel names
  if several.
- **Guard check A**: any manual object extending beyond the panel
  outline → warning in Checks (name the panel and the object).
- **Guard check B**: any manual object on layer `OUTLINE` → warning
  ("OUTLINE is the cut boundary — manual geometry there will be cut as
  the part's edge").
- Both are warnings, not gates. Tests for the rule (same-size recompute
  keeps ops; resized drops them) and both checks.

Proof: `f9-resize-dropped-note-and-outline-warning.png`.

## F10 [HIGH] — DXF export of manual objects

Everything drawn exports: lines, polylines (LWPOLYLINE), circles, arcs,
rects (as closed LWPOLYLINE), dowel-line holes as today, on their layer
(built-in or user layer with its colour). No text entities of any kind.
Grouping is an editor concept only — DXF gets the members, not the
group. Extend the existing DXF writer; add a `node:test` that round-trips
a sample: draw ops → export → parse the DXF text → assert entities,
layers, colours, coordinates. Manual-edit badge on the print (T-badge
behaviour that exists today) stays.

Proof: `f10-dxf-with-user-layer-opened-in-viewer.png` (any DXF text dump
or viewer screenshot naming the user layer).

## F11 [MEDIUM] — Esc and undo (owner may veto — if the pushed spec
strikes this section, skip silently)

- **Esc**: cancels the armed tool / pending points / open measurement;
  with nothing armed, closes the editor.
- **Ctrl+Z / Ctrl+Y**: undo/redo over MANUAL operations on the current
  panel only (add, delete, move, rotate, group, drop-by-resize is NOT
  undoable — it is the rule, not an edit). Implement as a bounded
  snapshot stack (last 50) of that panel's override list in the editor
  session. Nothing else in the app is touched by undo.

Proof: `f11-undo-restores-deleted-circle.png`.

## F12 [LOW] — trim, fillet, offset, array (the precision quartet)

Owner: *"trim i fillet i offset to podstawa."* They are in — LAST in the
execution order, so a short night cuts here first, feature by feature,
in this internal order: Offset → Trim → Fillet → Array.

- **Offset**: selected line/polyline/circle/arc → parallel copy at typed
  distance, side chosen by click. New object on the same layer.
- **Trim**: cutting edge(s) selected → click the segment portion to
  remove; works line-vs-line and line-vs-circle/arc
  (`segmentIntersection` exists; add line-circle intersection with
  tests).
- **Fillet**: two lines + typed radius → corner arc, lines shortened to
  tangent points. Radius 0 = corner join. Reject impossible radii with a
  status-bar message, never a crash.
- **Array**: rectangular (rows × cols × spacing) and along-a-line
  (count + pitch — reuse the dowel-pitch pattern). Typed values, ghost
  preview, Enter commits.
- ALL of these operate on MANUAL objects only. Every function lands with
  `node:test` coverage of the degenerate cases before any UI wiring
  (parallel lines don't intersect; trim with no intersection = no-op with
  a message; fillet on parallel lines rejected).

Proofs: `f12a-offset-and-trim.png`, `f12b-fillet-radius-8.png`,
`f12c-array-4x3.png`.

## Execution order (the insurance)

F1 → F2 → F3 → F4 → F5 → F6 → F10 → F7 → F8 → F9 → F11 → F12.

F10 (DXF) deliberately sits right after F6: a drawn object that exports
is worth more than every remaining tool combined. If the night runs
short, the quartet (F12) goes first, then F11, then F9 — each skip named
in the PR.

## What this turn does NOT touch

Everything not named. `reference/lisp/**`. `SettingsPanel.jsx`. The six
configs' engine output (byte-identity). Golden fixtures. `depthSteps`.
Materials, BOM, Cabineo, pattern library, pull-down rail — all parked.
`plateBiteMm` — parked pending the owner's fresh-project test.

## Morning audit will run

Fresh clone → branch → clean-room install → full suite (never --silent)
→ vite build → t38-classify borrowed onto main → BYTE-IDENTITY, UNNAMED=0
→ sanctity diff-audit (zero licensed removals this turn — ANY vanished
function fails) → `reference/lisp/` untouched → verify/t38 complete →
verdict → the owner's numbered eye-test list.