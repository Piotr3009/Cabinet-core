# CLAUDE.md — TURN 24: the hinge learns to bend, the pencil learns to draw

Turn 23 shipped eleven phases and the owner's eye test sent back a
sharper list. Two headline acts: the hinge model splits into two members
and folds with the door, and the one-off part editor gets the
interaction it should have had — AutoCAD grammar, mouse and snaps, a
number only as an in-flight override. Behind them: board thickness
becomes a per-slot, MEASURED truth with a hard gate; every screw axis
returns to G/2; doors hinged on partitions finally show their hardware;
the fix shelf gets the owner's joint; and the hardware materials get
something to reflect.

Read the whole file first. Full autonomy, zero questions. Clean or not
at all; the turn shrinks from the BOTTOM (F11, then F10, then F9 — F1,
F2 and F3 never shrink).

Baseline: main after the turn-23 merge, INCLUDING the chat-delivered
hinge-pose fix, the ruler fix, and the STEP-derived hinge model already
living in the bucket. Tests at baseline: 1792. CNC fingerprints:
`verify/t23/fingerprints-turn23.txt`.

## 0. IRON RULES

Everything standing from turns 1–23 applies: R1 real CDP input, R2 live
bucket, R3 verbatim manifests as fixtures, R4 URLs proven by asking the
app, R5 the walk reads the console, R6 a React exception fails the
step, R7 no DOM attributes on R3F objects, R8 hardware visuals proven
on the silent showroom. Plus, for this turn:

* **The mock is the law for F2.** The owner vetoed turn 23's F9
  interaction outright; the replacement was drawn for him and approved
  before this file was written. F2 below TRANSCRIBES that mock —
  toolbar, snap markers, live blue dimensions, in-flight numeric
  override, checkbox snap panel. Build THAT. Do not invent an
  alternative interaction, however reasonable it seems.
* **The measured thickness is sacred.** Where F3 lands, a screw axis
  is `measured G / 2` — 18.5 means 9.25 — and NOTHING may round,
  nudge or "correct" it. The owner's words.

## F1 — The hinge splits in two and folds with the door [CRITICAL]

Turn 23 made the whole model ride the leaf; the owner's verdict: it
must BREAK in the middle — cup side with the door, body side with the
plate — or, failing that, disappear when open. A better file will not
fix this (a GLB is a rigid cast); a rig will.

1. The current standard model (STEP-derived, in the bucket) carries
   FIVE named components. Measured per-node, z in file mm:

   | node             | z range        | tris | member |
   |------------------|----------------|------|--------|
   | bau0015089612    | 35.3 .. 51.3   | 5216 | A cup  |
   | bau0015088783    | 39.4 .. 50.1   |  332 | A cup  |
   | bau0015088853    | 31.1 .. 44.9   |  416 | A cup  |
   | bau0015088251    | −28.0 .. 46.2  | 2634 | B body |
   | bau0019416036    | −29.4 .. 22.5  |  364 | B body |

   Member A (cup, flange, clip cap, link cover) parents to the DOOR
   and keeps riding the leaf exactly as turn 23 left it. Member B
   (arm + rear body with the lever) parents to the CARCASS beside the
   plate and stays.
2. The joint: member B additionally rotates about a HORIZONTAL axis
   (parallel to the hinge row, i.e. the file's Y) positioned at the
   arm's front pivot — starting numbers `z = 33.5`, `x = −7.75` in
   file mm, both in `profile.js` under the cliptop pose block — by an
   angle equal to the door's opening angle, so the arm visually
   follows the cup into the opening while its rear stays at the
   plate. This is a ONE-JOINT approximation of Blum's seven-hinge
   linkage: name it as such in a comment; do NOT attempt the real
   four-bar geometry.
3. Split by NODE NAME from the table; unknown node names in future
   files fall back to the z-threshold `z > 30 ⇒ member A`. Mirroring
   per hand wraps BOTH members as today.
4. Degradation, the owner's explicit fallback: if the folded pose
   cannot be made to look right on the showroom AND the real model,
   flip `profile.hardware.hinge.rig.enabled = false` — with the flag
   OFF an opening door HIDES the hinge model beyond ~15° and shows
   the plate only. The flag ships; the owner decides after his eye
   test.
5. Walk (R8): synthetic two-member fixture; screenshots closed, 45°,
   90° — member A on the leaf, member B folded at the axis, plate
   still. Real-model screenshot only if the environment can fetch
   (R2 honesty).

## F2 — The pencil learns to draw: part editor v2 [CRITICAL]

Turn 23's mechanics SURVIVE UNTOUCHED: `partEdits` storage on the
project, the engine blind by construction, the badge, "Back to
computed", the recompute prompt, exports carrying the edits, stock
neighbours. What dies is the interaction. The approved mock is the
specification:

1. Toolbar in the part detail: **Select · Drill · Line · Dowel line**,
   plus a LAYER picker (existing layers only — custom layers are
   parked by the owner). Esc returns to Select; the F1-turn-23 Back
   stack is unaffected.
2. **Select**: click highlights a feature (its outline, a subtle ring),
   `Delete` removes it from this print. Exactly turn 23's delete, on a
   real pick instead of a list.
3. **Drill / Line / Dowel line draw with the MOUSE.** The cursor
   carries osnap markers — AutoCAD's language, the ruler already
   speaks it: square END, triangle MID, circle CEN, small circle
   Node (feature insertion points), diamond Quadrant, X INT,
   right-angle PER, hourglass NEA. Enabled set, each with its marker:
   END, MID, CEN, Node, Quadrant, INT, PER, NEA — priority on
   conflict `CEN/END > MID > INT > PER > NEA`, magnet radius ONE
   number in `profile.js` (sheet-space equivalent of ~5 mm). A
   checkbox panel under the sheet (as in the mock) toggles each,
   persisted per user. Extension, Tangent, Parallel, Apparent
   Intersection, Insertion, Geometric Center: NOT in this turn.
4. **Live dimensions while drawing**: thin blue arrows from the
   cursor to the nearest edges/features — HORIZONTAL and VERTICAL
   ONLY, never diagonal — same profile style block as turn 23's F8
   arrows. They are the read-out; there is no form.
5. **The number is an in-flight override**: with a tool armed, typing
   digits opens a small floating input at the cursor (the mock's
   `37`); Enter places the point AT that distance along the currently
   snapped axis from the reference edge. SketchUp's grammar. Tab or
   a second number may refine the other axis; Esc cancels the entry,
   not the tool.
6. Drill asks ⌀ and depth ONCE per session in a compact popover on
   first placement (defaults from the picked layer's convention),
   then stamps repeatedly. Line = two clicks. Dowel line = two
   clicks + pitch (typed or defaulted from profile), rendered as
   Node points on the line.
7. Orientation law from turn 23 stands: the sheet lies along the
   grain, no rotation for editing.
8. CNC: unchanged from turn 23's F9 contract — stock projects
   fingerprint ZERO; the dedicated override test extends to one
   drawn line and one dowel line via real synthetic pointer input in
   the walk (R1).

## F3 — Thickness becomes a per-slot, measured truth [CRITICAL]

The owner's law, verbatim intent: the manufacturer never tells you the
board is really 18.5 — the CALIPER does, and the engine must compute
from the caliper. And the box gets a hard gate.

1. Project setup grows SIX slots: **Carcass 1–3, Front 1–2, Drawer
   box** — each: material assignment (as today) + **measured
   thickness** (nominal from the material as the seed, editable) +
   a confirmation CHECKBOX. The drawer-box slot is a HARD GATE:
   while its thickness is unconfirmed, adding any drawer-bearing
   unit (or drawers to a unit) is blocked with a plain message. No
   thickness, no drawers — the owner's words.
2. **G becomes a property of the PART.** Every panel resolves its
   thickness from its slot assignment; every law that mixes two
   parts takes the RIGHT side's number: a groove in the side sized
   by the BOTTOM's G, a pocket's depth by the SIDE's G, the drawer
   box maths by the BOX slot, front-derived laws (hinge angle rule)
   by the FRONT slot. Audit every `G` in the engine and name its
   side; a helper `thicknessOf(part)` is the only door.
3. The **partition** gets a slot picker (Carcass 1–3, default
   Carcass 1) — the owner: "grubość przegrody się nie zmienia" —
   its 3-D, its CNC and the bay lights all flow from the slot.
4. The turn-16 material-identity gate STAYS and extends: changing a
   confirmed thickness with units present = the same explicit
   warning + full recompute, never silent.
5. CNC: defaults remain 18 everywhere ⇒ **fingerprint delta ZERO on
   golden defaults**. A probe scenario at Carcass=18.5 asserts the
   derived numbers (axis 9.25, groove, box) — uniform, engine-wide,
   nothing hand-patched. Fixtures: zero.

## F4 — Every screw axis returns to G/2 [HIGH] — CNC, GLOBAL, named

`profile.js:223 centrelineExtra: 0.5` puts every screw axis at
G/2 + 0.5. The owner: he does not remember it, it is wrong, it skews
the whole calculation. It goes.

1. Remove `centrelineExtra`; every screw/socket centreline law reads
   `thicknessOf(part) / 2` (F3's helper). 18 → 9.00, 18.5 → 9.25.
2. **This is a GLOBAL named delta**: every DXF containing a screw
   axis shifts that axis by −0.5. Golden fixtures and fingerprints
   REGENERATE — allowed here and only here, under this name. The
   proof of innocence: the per-entity probe diff between baseline
   and turn must classify as EXACTLY `axis coordinate −0.5` on screw
   classes and NOTHING else — no count changes, no other layers, no
   geometry. `cnc-export-identity.md` prints the classifier's
   summary.

## F5 — Doors on partitions show their hinges [HIGH]

Turn 21 taught the ENGINE `hingeOn`/`hingeFace`; the view never
learned it — bay doors drill correctly and render bare (diagnosed:
`Hardware.jsx` builds instances from the L/R sides only).

1. `hardwareInstances` reads the panel's `hingeOn` + `hingeFace`:
   the plate lands on the PARTITION's face (correct side), the body
   beside it, the cup in the door as ever; mirroring per hand
   unchanged; F1's rig applies to these doors identically.
2. Test: the 600/800 three-bay case — mounted hinge instances ==
   `hinge_centers` for EVERY leaf; walk screenshot on the showroom.
3. Display only ⇒ CNC delta ZERO, fixtures ZERO.

## F6 — Shelf width follows its type [HIGH]

The owner's rule, now law: **fix = the full clear light** (600-wide
carcass ⇒ 564, wall to wall), **adjustable = clear − 4** (⇒ 560, 2 mm
a side so it slides). Today's engine shelf is `W − 2G − 4` — ALREADY
the adjustable number ⇒ every existing shelf and every golden default
maps to adjustable with ZERO delta. Fix widths appear only where a
shelf is switched to fix. Both laws scale from the light, never from
constants; per-bay lights (partitions) respected as today.

## F7 — The fix shelf gets the owner's joint [HIGH] — CNC, named

The owner: "jak fix, to nie ma 3 poziomów 7,5 — to się wyklucza."

1. A FIX shelf carries: **biscuits on both bearing faces**; **through
   ⌀3 screws ONLY from carcass sides** (a side may be drilled
   through); from a PARTITION side, **biscuits only** — a partition
   serves two bays and a through screw would surface in the
   neighbour's face (write that sentence in the code comment).
2. ONE world height for the whole joint, derived from a single
   number — the side's law — with the partition's pattern expressed
   as that same height minus whatever the partition stands above;
   a test computes both faces' joint heights in world space and
   asserts equality to zero.
3. **Zero ⌀7.5 on fix** — a red test: any `SHELVES_7_5MM` entity on
   a fix shelf or its bearers fails the suite. Adjustable keeps the
   LISP ⌀7.5 law untouched.
4. CNC: new named entities (fix-shelf biscuits + side through
   screws) appear ONLY in the fix-shelf probe scenario; golden
   defaults (all adjustable by F6's mapping) ⇒ delta ZERO.

## F8 — The partition lies along the grain [MEDIUM] — CNC, named

The LISP draws the partition "rotated 90"; the owner's production law
wins: **grain runs top-to-bottom like the sides**, so the partition
lays on the sheet in the SAME convention as BUL/BUR.

1. Re-orient the partition part on the CNC sheet and in the DXF
   (outline, label, and F6-turn-23's back-screw references follow
   consistently). The detail view already shows the sheet's truth.
2. Named delta, partition scenarios only, justified in
   `cnc-export-identity.md` as the documented exception where the
   owner's production law overrides the LISP's drawing convenience.
   Golden defaults carry no partitions ⇒ ZERO there.

## F9 — Shelves say what they are [MEDIUM]

The shelf's CNC label gains its type: `… SHELF (FIX)` / `… SHELF
(ADJ)` — same label block, one word more. TEXT-class delta in shelf
sheets; goldens regenerate under this name only if the default label
changes (it does: default shelves read ADJ) — name it, show it is
text-only in the probe.

## F10 — Hover arrows grow a magnet [MEDIUM]

Turn 23's arrows vanish at a pixel's twitch. The owner's fix:

1. Once shown, the arrow set STAYS while the cursor remains within
   `profile.editor.hoverMagnetMm` (default **5**, sheet-space) of
   the feature — leave the radius, they fade.
2. Horizontal and vertical only — both surfaces (detail + scene) —
   diagonals never draw. (F2's live dimensions share the style and
   the rule.)

## F11 — The partition measures from its left neighbour [MEDIUM]

The owner's request, with the trap he and the assistant agreed to
avoid: **display chains, storage stays absolute.**

1. The panel field for partition N shows the clear distance from its
   LEFT neighbour's face — the interior face of the left side for
   P1, P1's face for P2. Editing the field moves ONLY that
   partition; the stored positions remain absolute, so moving P1
   changes the NUMBER P2 displays and nothing else — no cascades.
2. The scene chips and F10 arrows already show bay lights; the
   "Centre" action re-labels accordingly. Turn 23's interior-datum
   law is subsumed, not duplicated — one mapping function.
3. Tests: edit P1, assert P2's geometry unmoved and its display
   re-derived; save/load round-trip. Display only ⇒ CNC ZERO.

## F12 — The hardware gets something to reflect [HIGH]

The owner compared the STEP-grade model to the catalogue photo: still
far. Diagnosis: nickel without an environment is grey paint. The
no-HDRI philosophy exists FOR THE LACQUERS and stays for them; the
hardware breaks out:

1. A small neutral environment map (a procedural studio gradient or
   a tiny embedded HDR — no new runtime dependency, no network
   fetch) applied ONLY to hardware materials: the metal allowlist
   (`NickelPlated` and the F4-turn-23 finish overrides) on hinges,
   plates and runners. `envMapIntensity`, roughness per finish, and
   optional clearcoat live in `profile.js` under the finish blocks.
2. Boards, fronts, lacquers: UNTOUCHED — `scene.environment` stays
   null; the map attaches per-material, never to the scene. A test
   asserts panel materials carry no envMap; a walk screenshot pair
   (sprayed door before/after the turn) goes into verify for the
   owner's eye.
3. Showroom screenshots both finishes; real-model shot if the
   environment allows (R2 honesty).

## OUT OF SCOPE — named so nothing drifts in

* Custom layers per tenant — parked by the owner; three questions on
  file.
* Remaining hinge families as STEP: the conversion pipeline lives
  with the assistant, models arrive in the bucket as the owner
  exports them; no conversion code enters the repo.
* The true four-bar hinge linkage; F1 names the approximation.
* LIFT kits, the ⌀3 plate card, the pull-out tray height, element
  editing beyond F2's tools — all parked as before.

## PROOF — `verify/t24/`

* `walk.json` — R1 input, R5+R6 console, R4 app URLs, R8 showroom
  base; F2's drawing steps on REAL pointer input with typed
  overrides.
* Screenshots: rig closed/45°/90°; the editor mid-draw with markers,
  arrows and the floating number; partition-door hinges; fix-shelf
  probe sheet; partition sheet along the grain; the before/after
  sprayed-door pair for F12; both hardware finishes reflecting.
* `fingerprints-turn23-baseline.txt`, `fingerprints-turn24.txt`,
  `fingerprints-diff.txt`, and `cnc-export-identity.md` naming: the
  F4 GLOBAL −0.5 axis shift (classifier summary proving uniformity),
  F7's fix-shelf classes (probe only), F8's partition orientation
  (probe only), F9's label text. Everything else ZERO.
* `rig-members.md` — the bau table above re-verified against the
  live file, plus the axis numbers as shipped.

## TESTS

Baseline 1792 all green. New: rig member assignment and angle
mapping; F2 osnap resolution priorities and the numeric-override
placement as pure math; F3 `thicknessOf` per law with the 18.5 probe;
F4 the uniformity classifier itself; F5 instance count == centres;
F6 both width laws from the light; F7 the joint-level equality and
the ⌀7.5 red test; F8 orientation; F11 the no-cascade edit. 100%
green or shrink from the bottom.