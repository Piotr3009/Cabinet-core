# CLAUDE.md — TURN 27: four things, and none of them cosmetic

A SHORT turn, deliberately. Turn 26 carried twelve phases and the owner
watched it lose track of its own work; this one carries four, and three
of them are faults that reach the workshop. The fourth is a colour the
assistant changed without being asked.

Read the whole file first. Full autonomy, zero questions. Clean or not
at all; the turn shrinks from the BOTTOM (F4, then F3 — F1 and F2 never
shrink).

Baseline: main after the turn-26 merge. A chat fix (`3d/DrillRings.jsx`
+ `3d/UnitView.jsx` — drilled recesses replaced by decals in the room)
may or may not be on main when this runs; if it is, leave it alone —
nothing here touches it.

## 0. IRON RULES

Turns 1–26 stand: R1 real CDP input, R2 live bucket, R3 verbatim
manifests, R4 URLs from the app, R5 console captured, R6 a React
exception fails the step, R7 no DOM attributes on R3F objects, R8 the
silent showroom, R9 no feature without its part, R10 the sheet is the
truth, R11 one dimension component. New:

R12. **EXTEND MEANS EXTEND.** When the owner asks for a behaviour to
     reach further — the same dimensions on shelves as on partitions,
     the same handle rule on another unit — the LOOK does not change.
     Turn 26 unified four dimension dialects (right) and repainted them
     on the way (wrong, and nobody asked). If an appearance seems to
     need improving, it is a separate proposal for the owner, never a
     silent rider on someone else's request.

## F1 — A shelf drills the two boards that carry it [CRITICAL]

The owner, from the eye test: a shelf running from BUR to a partition
gets its ⌀7.5 holes bored in **BUL** — a board that shelf never
touches. And its dimension chain measures the whole cabinet instead of
the bay it sits in.

1. **Bearers, not sides.** A shelf resolves the TWO pieces that
   actually carry it — side/side, side/partition or partition/
   partition — and its pin holes (adjustable) and its joint (fix, per
   turn 24's F7) are drilled in THOSE, nowhere else. Today's law
   assumes BUL+BUR and that assumption ends here.
2. **Each bearer in its own frame.** A partition stands INSIDE the
   carcass, so it is shorter than a side and its CNC origin is its
   own bottom edge, not the cabinet floor. Convert the shelf's world
   height into each bearer's own coordinates separately — a partition
   whose holes are measured from the cabinet floor is out by the
   thickness of the bottom board, on every hole.
3. **Dimensions follow the bay.** The shelf's chain measures its own
   clear bay — bearer face to bearer face — not the full internal
   width. Same component, same look (R11, R12); only the endpoints
   change.
4. CNC: this is a CORRECTION, not a new class. Cabinets with no
   partition are unaffected ⇒ **fingerprint delta ZERO on golden
   defaults**. The partition+shelf probes move: holes leave BUL and
   appear in the partition. Name it, and state in
   `cnc-export-identity.md` that the leaving holes were wrong.
5. Tests: shelf between BUR and a partition — assert no entity of
   any shelf class lands on BUL; assert the partition's hole heights
   equal the shelf height minus the partition's own base; both
   two-partition cases (shelf in the middle bay, shelf in an end
   bay); a plain cabinet is byte-identical.

## F2 — The dishwasher stops being a species of its own [HIGH]

The owner: *"dlaczego zmywarki nie traktujesz jak szafki?"* He is
right, and the record proves it — legs ignored the run (turn 22),
the front sat 3 mm high (turn 26), no shaker, no handle, no plinth,
and it opens the wrong way. That is not six faults; it is one fault
six times, and the cause is `dwPanel`: a parallel path that has to be
remembered every time anything is added.

1. A D/W unit becomes an ORDINARY unit with two properties:
   * `interiorOccupied: true` — the carcass has no shelves, no back
     furniture, nothing inside; the appliance is there. It keeps
     sides, top, bottom, back and plinth exactly like its neighbours,
     to the run's own laws.
   * `frontOpens: 'drop'` — its front falls FORWARD about its BOTTOM
     edge, to **45°** (enough to read; the owner's number), and it
     answers "Open all" with every other front. Turn 26 dropped it
     INWARD — the axis is inverted; fix the sign, and prove it with
     a screenshot from the side.
2. Everything a front has, it has: shaker (turn 25's F3), handle
   (turn 25's F4, drawer-front rule — horizontal, centred, 50 from
   the top), the project's material, the 3 mm gaps, the dimension
   chain. No `if (dwPanel)` in any of it.
3. It carries NO cup hinges and NO cup drilling — it screws to the
   appliance door (R9 and R10 agree).
4. The plinth in front of it is the run's plinth passing through,
   as turn 26 shipped; the BLOCKER about fixed vs removable stays
   open and nothing here settles it.
5. Delete `dwPanel`'s dead geometry once nothing reads it. Keep the
   594 front width and any other MEASURED number — move them into
   the unit type, do not lose them.
6. CNC: the D/W's own parts are already what they are; where the
   unified path changes an entity, name it. Assert a D/W beside a BUD
   of the same width shares carcass laws exactly.

## F3 — The shaker recess has walls [HIGH]

The owner: the 6 mm recess works, but it has no side walls at all —
the panel reads as a hole straight through the door.

1. The recessed panel is a CLOSED solid: floor at 6 mm depth, four
   inner walls rising back to the frame face, correct outward
   normals, no gaps at the corners.
2. Same material as the frame (turn 26's F6 rule stands); the only
   difference the eye sees is shadow.
3. Screenshot from a grazing angle AND from behind the door — the
   second one is what proves there is no hole.

## F4 — The dimensions go back to black [MEDIUM]

R12's first debt. Turn 26 was asked to give shelves, sides and fronts
the partition chain's BEHAVIOUR; it also repainted every label. The
owner did not ask for that and does not want it.

1. Restore the pre-turn-26 dimension appearance — the dark label
   background and the palette that went with it — as the single
   style, now used by every surface.
2. The unification stays: one component, one geometry, 0.5 mm
   precision, floor-lying chains. Only the paint returns.
3. `verify/t27/dimensions-colour.md`: the turn-25 look beside the
   turn-27 look, same camera, so the owner can see the debt paid.

## OUT OF SCOPE

* The hinge fold: the assistant is deriving the open pose from the
  STEP model himself and will show the owner a render before any of
  it becomes a turn. Nothing about the rig changes here.
* Everything else from the eye test — shelf grain in 3-D, rings
  without a collar on ⌀3/⌀5, the sleeve colour governing rings and
  pins, a second brightness slider on the toolbar, the layer list
  still on the editor toolbar, and hinge drilling entering from the
  WRONG SIDE (the owner: everything is machined from inside the
  cabinet) — all gathered, all going into turn 28. Do not start
  them here.

## PROOF — `verify/t27/`

* `walk.json` — R1/R4/R5/R6/R8 as ever.
* Screenshots: a shelf between BUR and a partition, with the
  partition's sheet beside it showing the holes and BUL's sheet
  showing none; a D/W dropped open at 45° seen from the side, and a
  D/W front with a shaker and a handle; the shaker recess from
  behind; the dimension labels before and after F4.
* `fingerprints-*`, `cnc-export-identity.md` — ZERO on golden
  defaults; named: F1's hole move (with the note that the old
  position was a fault), F2's unification wherever it touches an
  entity.

## TESTS

New: bearer resolution for every shelf/partition arrangement;
per-bearer coordinate conversion; the shelf's bay dimension
endpoints; D/W parity against a BUD of the same width; the drop axis
and its 45° limit; shaker solid closure (no open boundary edges);
the restored dimension palette read from the profile. 100 % green or
shrink from the bottom.