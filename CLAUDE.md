# CLAUDE.md — Cabinet Core, TURN 12: THE TESTING-SESSION VERDICTS

Everything in this file is an OWNER VERDICT from a live testing session on
the merged turn 11. Read the whole file first. Full autonomy, zero
questions. Every phase lands CLEAN or is reverted WHOLE with a BLOCKERS
entry — "clean or not at all". Phases are ordered by daily pain: if the turn
must shrink, it shrinks from the BOTTOM.

Baseline: main after the turn-11 merge plus one chat hotfix (cross-wall
drag removal in `UnitView.jsx` — verify in F0). Tests at baseline: 907.

## 0. IRON RULES (all previous, plus one new — and it is FOREVER)

1. Engine purity: nothing in `src/engine/` imports React or three.
2. `profile.js` is the only home of numbers and behavioural defaults.
3. Golden fixtures inviolable (`git diff --stat fixtures/` = 0). NEW golden
   fixtures for NEW kit variants may be ADDED; existing ones never change.
4. No new dependencies.
5. Mock mode sacred.
6. 0.5 mm precision; `formatMm()`; no `Math.round` on mm in UI.
7. CNC EXPORT byte-identical for everything that exists today — re-run the
   turn-11 fingerprint script and publish the diff (new variants get NEW
   fingerprints, listed separately).
8. English code/comments/UI copy.
9. Full npm reinstalls; Actions red by design; PR, no merge.
10. Physical light units (r0.180). 11. Read library defaults in source.
12. Band-limit procedural detail. 13. Never `a?.x === b?.x`.
14. One rig; spray colour sacred.
15. **NEW, PERMANENT — THE MODAL RULE.** Every modal in this application is
    (a) DRAGGABLE by its header, and (b) opens BESIDE the object it
    concerns — never covering it. Implement ONCE as a shared modal shell
    (component/hook: drag + smart placement clamped to the viewport,
    anchored to the click/element with an offset) and route EVERY existing
    modal through it: Design/Project settings, Render, element edit,
    Room setup, the new ones below. The owner said "na zawsze" — treat any
    future modal not using the shell as a bug.
16. Browser verification is a standard phase (F11); reuse and extend
    `scripts/e2e-*.mjs`.

## F0 — Baseline

Full install → 907/907 → clean build. Verify the cross-wall-drag removal
is on main (`UnitView.jsx` drag handler must NOT re-home walls; the Wall
dropdown remains the only deliberate path). If absent, apply it — the
diagnosis comment exists in the chat hotfix; keep its wording.

## F1 — [CRITICAL] ONE settings surface, one source of truth

Turn 11's Step 5 shipped as a COPY of the old Design-settings modal.
Consequences the owner hit within minutes: the scene ignores what the new
menu sets (colours read from the old store), and Room setup became
unreachable.

1. ONE component, ONE data path. The top-bar Settings entry and the
   New-Project Step 5 open THE SAME component bound to THE SAME design
   store the scene reads. Delete the duplicate. If two stores/slices exist,
   merge them with a migration for cached projects (mock/localStorage).
2. Room setup returns: reachable from the Settings menu (and anywhere it
   lived before) as its own modal — through the F2 shell.
3. Hard test: set a front colour through EACH entry point → the same store
   value changes → a node test on the store, plus the F11 walk proves the
   scene repaints from it.

## F2 — The modal shell (rule 15 made real)

Build the shared shell FIRST, then migrate every modal onto it. Placement:
beside the anchor (element/cabinet/click point), flipped/clamped to stay
fully on-screen (the turn-11 context-menu clamp logic is the seed —
generalise it), draggable by header, remembers its dragged position while
open. No modal may cover the object it edits.

## F3 — Library, restructured (Kitchen)

The owner's exact list, in this order, as DATA (`profile.js` /
library data module — components render, data decides):

1. **Door base unit** (today's BUD).
2. **Drawer unit** — expandable group: **1×** (drawerline: one drawer over
   a door), **2×** (two equal deep drawers), **3×** (today's BUDR), **4×**
   (four equal). Derive 1/2/4 from the EXISTING BUD/BUDR mathematics —
   the drawer-box maths, runner drilling and front splits the kits already
   define, parameterised by count/heights; NO new joint formulas. Each new
   variant gets its own NEW golden fixtures and BOM/DXF coverage. If any
   variant needs geometry the kits do not define, ship it DISABLED with a
   BLOCKERS entry instead of inventing.
   The hidden cutlery drawer is NOT a library entry — it arrives via
   editing (owner agreed).
3. **Tall unit** (one entry — BUDTALL; the rest via editing).
4. **Fridge unit**. 5. **DW unit** (dishwasher housing — front + gap per
   the appliance pattern the kits/SPEC define; if no pattern exists, entry
   DISABLED-"soon" + BLOCKERS, pattern-first rule).
6. **Corner unit** and **L-shape unit** — entries PRESENT but
   DISABLED-"soon": no kit/LISP defines them yet; the owner writes the
   pattern with the assistant first (same rule as partition drilling #59).
7. **Wall units** last (WUD).
8. EVERY unit type opens its edit modal on DOUBLE-CLICK (F2 shell).
   Categories beyond Kitchen stay as today (rework is a separate,
   still-to-be-discussed item — do not touch).

## F4 — The cabinet editor window (the "bomb")

Right-click a unit → **"Edit cabinet"** → a NEW modal (F2 shell) hosting
its OWN small 3D canvas with THAT unit only (same materials/profile, same
engine result — render the existing computed panels, no re-derivation).

1. An **Explode** button: the parts animate APART — each panel slides out
   along its face normal (distance factor in profile), like the cabinet
   was unscrewed. Toggle back to assembled.
2. In exploded state, each part is selectable and can be ROTATED freely
   for inspection (per-part orbit on the selected piece); selecting a part
   shows its existing element properties (the T9/T11 editing panel —
   reuse, do not fork) so edits made here are the same overrides.
3. This window is a viewer+editor over existing data — the working scene,
   engine and BOM are untouched by its existence. Cost: canvas mounts only
   while the modal is open.

## F5 — Interior logic: zones, partition, the golden plus

1. **Golden "+" opens a MODAL** (F2 shell, beside the unit): the unit's
   edit + "what to add" menu (context-filtered items, Show-all — the F4.4
   turn-11 data). The right panel keeps mirroring; the modal is primary.
2. **Partition**: add a **"Centre"** button (like the shelves' Even) and a
   DELETE path (× in panel/modal + Delete key on selection) — both missing
   today.
3. **Partition ↔ shelf rules** (owner-specified, exactly):
   - a partition may terminate ON a shelf only if that shelf is **FIXED**;
   - if that shelf has a depth setback, the partition's max depth FOLLOWS
     the shelf's — shrink the shelf, the partition shrinks with it
     (coupled, automatic);
   - if the shelf is adjustable, the partition does NOT attach — show the
     existing collision treatment instead;
   - with a partition present, adding a shelf first asks WHICH SIDE: the
     zones left/right of the partition highlight, the user clicks one, the
     shelf lands and centres in THAT zone. This introduces an explicit
     ZONE model in the interior maths — build it in the engine as pure
     functions (it is the foundation the 2×/4× drawer stacks and future
     interior work will stand on), tested.

## F6 — Hardware you can see

1. **Hinges invisible in Solid** — find why (default off? not rendering?)
   and fix. Then make them LOOK like the kit drawings: a procedural
   low-poly hinge — ⌀35 cup, arm, mounting plate — proportioned and
   positioned from the SAME numbers the LISP drawings and the engine's
   drilling already use. Instanced, a few dozen triangles each. NO
   imported CAD models (owner agreed: Blum meshes are hundreds of edges
   and a licensing question — out).
2. **Dog bones, the other half**: sockets look right; the mating TABS with
   their round reliefs on the carcass panel EDGES are not visible. Model
   them from the same `panel.cnc` data so a joint reads as a joint in
   Solid and X-ray. Close-up screenshot to `verify/t12/`.

## F7 — Wall units must SEE tall units

Bug, owner-verified twice: a hanging unit ignores tall units completely —
it drives straight through them and no alignment happens. Tall standing
units (BUDTALL, FRIDGE, tall WARDROBE — anything whose height reaches the
wall-unit band) join the obstacle set for wall-unit placement/drag: a
hanging unit STOPS at a tall unit (or an end panel) exactly as at a wall.
Engine collision layer (`engine/collision.js` family), pure + tested; the
turn-8 "hangs align to Tall" promise becomes real behaviour.

## F8 — Plinth per RUN (the top-infill pattern)

Owner-specified:
- no plinth = no plinth (unchanged);
- turning plinths on for adjacent units WITHOUT an end panel between them
  produces **ONE continuous plinth** across 2, 3, N units — not pieces;
- a unit pushed against a plinthed run joins it AUTOMATICALLY (the plinth
  extends);
- an end panel or a gap is a boundary — a new segment starts.
Reuse the top-infill run logic (one element per run, T8) rather than a
parallel implementation. BOM/CNC: one part per segment, summed length,
front material as turn 11 established. New tests; fingerprints for the
changed plinth exports listed in the F0/F12 identity report as an
EXPECTED, explained delta (this is a deliberate behavioural change —
document it; everything else stays byte-identical).

## F9 — Undo / Redo

Ctrl+Z (+ a toolbar button) and Ctrl+Y / Ctrl+Shift+Z. Project-store
history: snapshot on every mutating action (add/remove/move/edit/settings
change), bounded depth (profile number, e.g. 50), survives nothing (no
persistence — session only). Zustand snapshot pattern; selection state
sensibly restored. Tests on the store: do → undo → redo → deep-equal.

## F10 — [BUG] The back panel that turned 90°

TALL/FRIDGE back panels render rotated 90° vs before (owner: "poprzednio
było dobrze"). Chat triage already established the ENGINE geometry for
those kits is untouched by turn 11 — the suspicion is the VISUAL layer
(grain/orientation mapping for back panels, possibly aspect-dependent).
Diagnose FIRST (compare kits, find the differentiator), fix at the guilty
layer, and add a regression guard (a node test on whatever orientation
data the fix pins, or an e2e pixel check if it is purely visual).

## F11 — Browser verification (standard)

Extend the e2e walk; screenshots to `verify/t12/`, committed:
1. Settings via top bar AND via Step 5 → same colour lands in the scene.
2. Any modal: opens beside its object, dragged by header, stays on-screen.
3. Library: new order; 2× drawer unit placed; Corner shows disabled-soon.
4. Edit-cabinet window: explode animation mid-state + one part rotated.
5. Partition: Centre button; delete; attach to FIXED shelf and shrink the
   shelf → partition follows; zone highlight when adding a shelf.
6. Wall unit dragged into a tall unit → stops flush.
7. One plinth across three units; fourth unit docks → plinth extends.
8. Ctrl+Z after a delete → the cabinet is back.
9. Hinges visible in Solid close-up; dog-bone tab close-up.
10. TALL back panel grain correct again.

## F12 — Docs + FINAL GATE

1. BUILD-LOG per phase; SPEC gains the #58 closure line: "board thickness
   is per CARCASS (one G per kit, front thickness separate) — the kits'
   own boundary, owner-confirmed 08.08".
2. BACKLOG: #59 stays open awaiting the owner's partition-drilling
   pattern; corner/L-shape/DW patterns listed as pattern-first items.
3. BLOCKERS for anything reverted or disabled.
4. Gate: full reinstall → all tests green (907 + new) → clean build →
   fixtures diff 0 (additions listed) → deps untouched → engine purity →
   CNC identity report (byte-identical except the documented plinth
   delta) → `verify/t12/` populated → PR opened, not merged.