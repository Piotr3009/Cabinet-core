# CLAUDE.md — TURN 25: the sheet gets a guard, the door gets a face

An edge drawn twice in a polyline is not a wasted minute — VCarve
offsets the two paths in opposite directions, cuts the panel from
outside AND inside, and the board goes in the skip. The owner found it
in his own LISP and fixed it there; this turn puts a permanent guard on
OUR exporter so no future turn can ship it. Behind the guard: the
shaker door finally looks like a shaker, handles arrive as real models
with real drillings, doors on partitions get the full toolkit, the
adjustable shelf shows its brass, and the export tree learns four
groups.

Read the whole file first. Full autonomy, zero questions. Clean or not
at all; the turn shrinks from the BOTTOM (F20 upward — F1, F2, F3 and
F4 never shrink).

Baseline: main after the turn-24 merge. Do NOT hard-code the baseline
test count — read it from the merge commit and state it in BUILD-LOG.
CNC fingerprints: `verify/t24/fingerprints-turn24.txt`.

## 0. IRON RULES

Everything standing from turns 1–24 applies: R1 real CDP input, R2
live bucket, R3 verbatim manifests as fixtures, R4 URLs proven by
asking the app, R5 the walk reads the console, R6 a React exception
fails the step, R7 no DOM attributes on R3F objects, R8 hardware
visuals proven on the silent showroom. Plus:

R9. **NO FEATURE WITHOUT ITS PART.** The owner's law, verbatim
    intent: no shelf, no shelf drilling; no hinges and no door, no
    hinge holes. Every drilling class exists ONLY while the part it
    serves exists. Removing a part removes its preparation from the
    same recompute; adding it back brings the preparation back. This
    is general — doors, shelves, partitions, runners, handles — not a
    door special case. A test asserts it per class.

## F1 — The duplicate-edge guard [CRITICAL] — never shrinks

1. A new exporter check, run on EVERY panel in EVERY probe scenario
   and in the golden set: for each panel's outline, assert that no
   segment appears twice — same trace in either direction, same
   layer — and that the outline is ONE closed polyline with no
   dangling ends and no overlapping runs. Coordinates compare at
   0.01 mm tolerance.
2. **Winding**: the outer outline runs one consistent direction
   (anticlockwise, matching the owner's corrected LISP); interior
   cut-outs run the opposite way. Assert both — this is the signal
   VCarve reads to know which side the material is on.
3. A red result FAILS THE SUITE and stops the turn. Wire it into the
   standard test run, not a separate script, so every future turn
   inherits it.
4. The engine builds outlines procedurally and is expected to pass
   today. If it does NOT, fix the generator — never the test.
5. `verify/t25/edge-guard.md`: panels checked, tolerance, and the
   winding convention, with the LISP post-mortem in two sentences so
   the next reader knows why this test exists.

## F2 — The shallow cabinet gets ONE centred joint [HIGH]

From the owner's corrected `panel_joints.lsp`: sockets are 51 mm
wide, dog bones 60 mm, and both sit 95 mm in from each end — so on a
narrow panel they collide (panels under 241 mm, dog bones under 250).

1. Cabinet depth ≤ **300 mm** ⇒ ONE joint centred on the panel;
   above 300 ⇒ today's pair at **95** exactly as now. One resolved
   inset per unit, shared by every mating panel so joints still line
   up. Both numbers in `profile.js`.
2. Sockets, ⌀7.5 puzzle holes and dog bones all follow the resolved
   positions — same features, fewer of them; no new entity classes.
3. CNC: golden defaults are deep cabinets ⇒ **fingerprint delta ZERO**.
   A shallow probe (200 mm deep unit) shows the single-joint pattern
   — named in `cnc-export-identity.md`.

## F3 — The shaker door looks like a shaker [HIGH]

Today a shaker renders as a flat slab; only the 25 mm thickness says
otherwise.

1. **Geometry**: a recess **6 mm** deep in the door's face, leaving a
   frame of width `shakerFrame` — **equal on all four sides** (the
   owner: "shaker zawsze równy"), settable **10…200 mm**, default
   70. Panel face therefore sits at 25 − 6 = 19 mm.
2. **Validation**: 2 × frame + a minimum panel width must fit the
   leaf; a 200 mm frame on a 300 mm door is refused with a plain
   message, never silently clamped.
3. **Material**: the recessed panel carries the SAME finish as the
   frame; the inner edges must read as a real rebate — correct
   normals, no z-fighting, visible corner shadow at grazing angles.
   That shadow is what sells it; screenshot proves it.
4. **CNC**: the panel pocket is a NAMED class on the front's sheet
   (today the front DXF is outline only). Appears only on shaker
   fronts.
5. **Hinge rule**: the angle law reads the FULL 25 mm, never the
   19 mm floor. A test pins this — it is exactly the kind of thing
   that silently picks the wrong article.

## F4 — Handles: real models, real holes, one line across the kitchen
##      [HIGH]

New in the door/front modal: **Add handle**, asking two things — type
(**bar** or **knob**) and, for a bar, the **screw centres** (96, 128,
160, 192, 224 or typed).

1. **Reference point, the owner's law:**
   * base unit doors: **50 from the TOP** of the front, 50 in from
     the opening edge,
   * wall unit doors: **50 from the BOTTOM**, 50 in from the opening
     edge,
   * tall unit doors: **mid height** of the door, 50 in — movable,
   * drawer fronts and D/W panels: **horizontal**, centred on width,
     **50 from the top** of the front,
   * SHAKER fronts: centred on the frame's width (vertical frame for
     doors, bottom/top frame for horizontals) — UNLESS the frame is
     **under 30 mm**, in which case fall back to the 50 × 50 rule.
2. **Drillings**: knob = one hole; bar = the reference hole plus its
   partner at the chosen centres, along the handle's axis. A NAMED
   class on the front's sheet. R9 applies — remove the handle, the
   holes go.
3. **Model**: procedural, **gold** for now — a round bar on two
   posts, a hemispherical knob. Catalogue models arrive later by the
   bucket route; the mount point and axis are already the contract.
4. **Moving one moves all — with a warning.** Dragging or typing a
   new position applies to every front of that class in the project
   (a kitchen's handles must line up), behind a confirmation naming
   the count: "this moves handles on 14 fronts". Unticking **apply to
   all** confines it to this front, which then wears a deviation
   badge — same grammar as turn 19's per-hinge overrides.

## F5 — Doors on a partition are just doors [HIGH]

Turn 24 made their hinges visible; this turn makes them equal.

1. Every door capability works on a partition-hung leaf: per-hinge
   override (turn 19), article and angle choice, hinge side, opening
   in the scene with turn 24's rig, selection, the modal, BOM lines,
   the CNC sheet. No "bay door" branch anywhere.
2. **The paired test**: two identical cabinets — one door on a side,
   one on a partition — assert identical behaviour for each
   capability (override count, hinge count, BOM entries, drill
   classes). Any future door feature must satisfy this pair, which
   is the point.

## F6 — The adjustable shelf shows its brass [HIGH]

The owner: he wants to SEE gold or silver sleeves — and they are the
**⌀7.5** we already drill, not a new 5 mm system.

1. In the scene, an adjustable shelf renders **sleeve rings** in the
   ⌀7.5 holes that carry it, plus the pin (spon) the shelf rests on.
   Finish **gold or silver**, chosen in project settings, materials
   in `profile.js` beside the hardware finishes.
2. FIX shelves show nothing — that visual difference is the feature:
   one look tells you which shelf is which.
3. R9 governs: no shelf, no sleeves and no holes.
4. Display only over the existing drilling ⇒ CNC delta ZERO.

## F7 — Export tree: four groups [HIGH]

1. Groups, in order: **Carcasses** (BUL, BUR, TOP, BOTTOM, BACK) ·
   **Shelves** (shelves + VPART) · **Doors, fronts & panels** ·
   **Infills & plinths**. INFILL-* leaves the Carcass group.
2. Quick-select buttons: **All · Carcasses · Shelves · Doors, fronts
   & panels · Infills & plinths** — each ticks its whole group.
   Per-panel ticks behave as today; counters at unit and group level
   update live.
3. The one-file DXF takes the ticked set; the per-panel ZIP still
   ships the WHOLE unit, unchanged — the footnote already says why.

## F8 — Drawer box: a floor and a ceiling [HIGH]

From the owner's LISP, with his correction to the clearance:

1. Side height stays 70% of the front, but is now **floored** at
   `minimum inside + 15 + G + 1` and **capped** so the box top clears
   whatever sits above it — the underside of the top panel, or the
   next runner — by **5 mm** (the owner's number, not the LISP's 3).
2. The cap is what stopped a tall top drawer breaking the top panel;
   the owner has seen it happen. Numbers in `profile.js`, named.
3. CNC: box parts change size only where the cap or floor bites;
   golden defaults must show **ZERO** — if any moves, the scenario is
   one the cap now catches, and it is named in the identity report.

## F9 — Short runners [MEDIUM]

Add NL **250, 270, 300, 320, 350, 380** to the Movento catalogue and
select **from the shortest upward**, so a shallow cabinet gets a short
runner instead of a box longer than the carcass. Models are already in
the bucket. Existing deep units keep today's selection — assert that.

## F10 — SHORT / OVER warnings [MEDIUM]

When the fronts do not fit the opening, or a front is too shallow for
a sane box, the app says so — a **yellow warning** on the unit and in
the drawer modal, naming the number. It does NOT block; the owner
wants to see it in practice first. Silent clamping ends here.

## F11 — Remove door [MEDIUM]

At the BOTTOM of the door's double-click modal, separated by a rule:
**Remove door**. The `Delete` key on a selected leaf does the same.
No confirmation dialog — Undo covers it. R9 does the rest: the hinge
holes leave with the door and return with it.

## F12 — Cornice 100, and cornice in the modal [MEDIUM]

1. **Diagnose first**: option 100 shipped in turn 22 but the owner
   only gets 70. Find whether the profile geometry, the panel option
   or the resolver is at fault; state the finding in
   `verify/t25/cornice-100.md` before fixing.
2. The 100 profile is **richer** than the 70 — larger bottom bead,
   deeper cove, a pronounced top land, projection 65. **BLOCKER**:
   the owner has a reference drawing he sent long ago; if it is not
   in the repo, ship the parametric richer profile and note that the
   drawing supersedes it in a later turn without touching the
   plumbing.
3. **Top cornice** joins the unit's right-click menu (none / 70 /
   100). Top infill is already there.

## F13 — Front dimensions, project-wide [MEDIUM]

A toggle — **Show front dimensions** — in the door modal and in the
View menu, scoped to the **whole project** (the owner's choice), state
remembered. On: every front's width and height, plus the gaps —
between doors, between drawer fronts, to sides, to the top, to the
floor. Off: clean scene. Same arrow style as F14.

## F14 — One dimension language [MEDIUM]

1. The partition chain from turn 24 moves **down** off the centre
   line so it stops hiding behind the add (+) button — offset a
   fraction of the bay height, one number in `profile.js`.
2. The SAME thin blue arrows appear on hover for **shelves** (clear
   gaps to floor, neighbour shelf, top) and for a **side panel**
   (interior depth and interior height, drawn inside the cabinet).
3. Horizontal and vertical only; the 5 mm magnet from turn 24
   applies everywhere. One style block, four consumers.

## F15 — Open / close all doors [MEDIUM]

A toggle button in the top toolbar **between BOM and Measure**: first
press opens every door in the project, second closes them. Works with
turn 24's rig.

## OUT OF SCOPE — named so nothing drifts in

* Drawer numbering D1-from-top: the owner parked it — leave today's
  bottom-up numbering alone.
* Custom layers per tenant; the four-bar hinge linkage; LIFT kits;
  the ⌀3 screw-on plate; pull-out tray height — all still parked.
* `centrelineExtra` 0.5: the LISP carries the same 0.5 in six places,
  so it is NOT a Cabinet Core invention. Nothing in this turn touches
  it; it waits on the owner's bench test.

## PROOF — `verify/t25/`

* `walk.json` — R1 input, R5+R6 console, R4 app URLs, R8 showroom.
* `edge-guard.md`, `cornice-100.md`.
* Screenshots: shaker door at a grazing angle showing the rebate
  shadow; gold bar and knob on base, wall and drawer fronts; a
  partition door with its hinge overrides open; sleeves in an
  adjustable shelf beside a bare fix shelf; the four-group export
  tree; front dimensions on and off; shelf and side-panel hover
  arrows; the shallow-cabinet single joint.
* `fingerprints-turn24-baseline.txt`, `fingerprints-turn25.txt`,
  `fingerprints-diff.txt`, `cnc-export-identity.md` — ZERO on golden
  defaults; named: F2's shallow-joint pattern, F3's shaker pocket,
  F4's handle holes, F8's cap where it bites.

## TESTS

New: the duplicate-edge and winding guard across every scenario;
inset resolution either side of 300; shaker frame validation and the
25 mm hinge rule; handle reference points per unit type and the
under-30 fallback; the F5 paired door test; R9 per drilling class
(remove part → holes gone → add back → holes identical); export
grouping; box floor and cap arithmetic; runner selection shortest-up;
front-dimension gap maths. 100% green or shrink from the bottom.