# CLAUDE.md — Cabinet Core, TURN 15

A polish-and-structure turn from a long owner session on turn 14 + the
chat-delivered Step-5 batch. Read the whole file first. Full autonomy, zero
questions. Clean or not at all; the turn shrinks from the BOTTOM.

Baseline: main after the turn-14 merge PLUS the chat batch (SettingsPanel
red Save/fold, Generic boards, spray/veneer/laminate/wood sources, 7 door
shapes, Modal ResizeObserver). Tests at baseline: 1252.

## 0. IRON RULES

All standing rules apply (turns 1–14): engine purity; profile.js the only
home of numbers; existing fixtures inviolable; no new deps; mock mode;
0.5 mm + formatMm; English; full npm reinstalls; Actions red; PR no merge;
physical light units; library defaults read in source; band-limit
procedural detail; no `a?.x === b?.x`; one rig; spray colour sacred; THE
MODAL RULE (shared shell, draggable, beside the object; editor window =
the maximised exception); browser walk standard.

CNC EXPORT: byte-identical EXCEPT one named delta this turn — the side
infill gains its 45° mitre where it meets a top infill (F6). Fingerprint
both sides, publish in `verify/t15/cnc-export-identity.md`. The two new
CNC VIEWS (F9) are views: they read, they never write.

## F0 — Baseline

1. Full install → tests green (record the count; expect 1252) → build.
2. Verify the chat batch is on main: `SettingsPanel.jsx` has the red
   Save/fold, `materialAssignmentStore.js` has the Generic boards,
   `design.js` has the 7 FRONT_STYLE_OPTIONS. If any is missing, STOP and
   write BLOCKERS — do not re-implement blind.

## F1 — Small UI verdicts (the owner's screenshots)

1. **Save turns green.** The red Save on Carcasses/Fronts: after the
   click it shows GREEN with a ✓ ("saved" state); expanding/editing the
   section returns it to red. Colours from the app palette (status
   green), not new hex scattered in JSX.
2. **Thickness in the folded summary.** A folded Carcass line reads
   `Carcass 1: … · Generic board 18 mm · 18 mm` — the PROJECT thickness
   always visible (owner's red "THICK" box).
3. **Gold frames on sections.** CARCASSES and FRONTS (and the Door style
   block) each sit in a delicate gold-bordered frame — today they melt
   into one. Same gold as the T14 context-menu dividers; one shared class.
4. **Right panel: sections COLLAPSED by default** and framed/highlighted:
   either the same gold frames, or the ACTIVE section's frame lights up —
   the owner must see where one section ends. Persist open/closed per
   session only.
5. **Library scrolls.** The library panel has no scroll today — a long
   list runs off screen. Any list taller than its panel scrolls. Always.

## F2 — Outlines INSIDE the cabinet

Owner: the outer contour is crisp, the interior edges vanish. Cause (the
depth war): an edge line lying exactly ON a neighbouring panel's face
loses the z-fight to that face. Fix the textbook way: `polygonOffset` on
panel FILL materials (factor/units as numbers in
`profile.appearance.outline`), pushing fills a hair back so lines win
everywhere. Verify no bleed-through artefacts at silhouette edges in the
walk close-up; screenshot inside a carcass to `verify/t15/`.

## F3 — Sources that show the RIGHT picker (owner: "mega ważne")

1. **Fronts / Laminate → the DECOR picker** (the 85-EGGER picker the
   carcass uses), not RAL palettes. A laminate front stores a decor,
   renders as one, and the BOM names it.
2. **Fronts / Veneer → a VENEER picker.** Owner decision (a)-minimal:
   seed THREE-FOUR wood decors from the existing 85 (e.g. H1180 Halifax,
   H3325 Gladstone, H1145 Bardolino — pick the most timber-like) flagged
   as veneers, thickness 19 from the source. STRUCTURE FIRST: veneers are
   their OWN extensible collection (data module/profile list referencing
   decor ids), because the owner will drop in his own scanned veneers
   later — adding one must be a data entry, never a code change.
3. **Carcasses gain the Veneer source** — a third button beside
   `EGGER decor | Sprayed`, wired to the same veneer collection, 19 mm
   pinned the same way boards pin thickness (the F-batch gate applies:
   changing effective thickness with units present ASKS first).
4. Spray stays exactly as shipped (colours are right there).

## F4 — Door styles: a GALLERY, built for scale

Owner: there will be MANY kitchen/front styles — never a bare dropdown.
1. An **"Existing styles"** gallery: a tile per shape with a small SVG
   VISUAL of the front (Shaker rails, Flat slab, J-groove lip, Grooved
   lines, Grooved+frame, Arch, Arch handleless) + the name. Click = pick.
2. Scale from day one: grid + scroll, a small name filter/search box, and
   styles as a DATA list (id, label, svg ref) — style number thirty must
   cost one data entry and one svg, zero component work.
3. "+ New style" stays beside the gallery. The little SVGs are the seed
   of the owner's "małe instrukcje" — draw them clean, one file/module,
   reused later.

## F5 — The library: flyouts and the owner's catalogue

1. **Sub-lists fly out to the SIDE** (right of the panel; left if the
   panel is docked right) — never expand downward pushing the list
   (owner's screenshot: the Drawer group shoved everything off screen).
   Flyout follows the shared placement/clamp logic.
2. **The catalogue, restructured to the owner's list.** Entries without a
   kit ship DISABLED-"soon" with the honest one-liner (the pattern-first
   rule; wording as the DW/Corner entries already do). Everything that
   works today stays wired (Base, Sink, Drawer 2×/3×/4×, Tall, Fridge,
   Wall, Low cabinet).
   - **Base units:** Standard · Sink · Corner (L-shelves, left/right) ·
     L-shape · DW · Oven · Bin storage · Wine rack · Small fridge
     (under-counter) · **Twin space** (~200 mm slimline, baskets or not).
   - **Tall units:** Standard · Fridge housing · Basket tall · Pantry ·
     Pantry-on-worktop · **Space tower** (drawer larder) · Oven tall
     (single/double) · **American fridge** (the LSP the owner writes with
     the assistant later).
   - **Wall units:** Standard · **Glass unit** (glass shelves + glass
     front) · L-shape wall.
   - **Extras (new group):** Free-standing panels · **Decorative
     cornice/pelmet strip** — one click adds it along a run
     (run-logic like the plinth), SOON until its pattern lands.
   All of it DATA (the T12 library-data module) — labels, groups, soon
   reasons; no lists in components.

## F6 — The infill corner is a MITRE (#51 activated)

Owner: the side infill still meets the top infill SQUARE. Where a side
infill and a top infill meet, both are cut at 45° — the same mitre maths
the top-infill corners already own (turn 8, "mitra w geometrii NA
PASKACH"); extend it to the vertical member, do not fork it. This changes
the side-infill part outline: the turn's ONE named CNC delta. Engine
tests on the mitred lengths; drawings/BOM follow through the normal
pipeline.

## F7 — A ceiling-height end panel is a WALL for wall units

Owner bug: extend a base/tall end panel to the ceiling — hanging units
drive through it, and the dimension chains ignore it. Fix in the
collision/measure layer (the T14 F7 pattern for talls): a panel whose top
reaches the wall-unit band joins the obstacle set — wall units STOP at
it, and the run dimensions measure to it. Pure engine functions + tests.
While here, PIN the 10 mm truth the owner asked to confirm: a node test
asserting units stand 10 mm off the wall and an end panel is
automatically 10 mm deeper than its unit (the turn-7 construction rule) —
the invariant becomes a test, not a custom.

## F8 — Multi-select: Remove doors

Beside "Add doors" on a multi-selection, **"Remove doors"** strips the
doors from every selected unit in ONE action and ONE undo step (the F5
turn-13 bulk rules). Today the owner walks unit by unit.

## F9 — CNC: two views and a toggle

The CNC EXPORT and today's grouping stay byte-identical — these are
VIEWS.
1. **By MATERIAL TYPE:** the sheet area splits left→right into one
   section per ASSIGNED material type (e.g. `EGGER 18 | MDF 18 |
   veneer 19`) — identity by MATERIAL, never by colour; every part sits
   in its material's section. Section headers name the material as the
   BOM does.
2. **By CABINET:** a square per cabinet holding ALL its parts including
   its panels — and a separate group for the run parts (infills,
   plinths, masking panels), exactly as the owner said: "infille i
   plinthy osobno".
3. A visible TOGGLE between the two; the T11 rule holds (Library and the
   right panel stay open; the checkbox tree keeps working in both views).
4. NO nesting. The nesting simulation is deliberately deferred by the
   owner — do not sketch it, do not scaffold it.

## F10 — Browser walk + docs + GATE

Walk (screenshots to `verify/t15/`, committed): green ✓ Save after
saving; folded line with `· 18 mm`; gold frames on the settings sections
and the right panel; interior outlines visible inside an open carcass;
Laminate front showing the decor picker and a veneer chosen from the
veneer list; carcass Veneer source; the style GALLERY with its SVG tiles
and the filter box; a flyout sub-list; the catalogue with the new groups
and soon-entries; the side↔top infill corner at 45° in Solid and in the
part drawing; a wall unit stopping at a ceiling-height end panel with
dimensions measured to it; Remove doors clearing three units at once;
both CNC views and the toggle.

Docs: BUILD-LOG per phase; BACKLOG (#51 closes; nesting listed as
deferred-by-owner; new catalogue patterns queued); BLOCKERS for anything
reverted. GATE: full reinstall → all green (baseline + new) → clean
build → existing fixtures diff 0 → deps untouched → engine purity → CNC
identity (delta: side-infill mitre only) → `verify/t15/` populated → PR
opened, not merged.