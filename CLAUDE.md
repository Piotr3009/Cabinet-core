# CLAUDE.md — TURN 21: the holes are the judge

The owner put a drawer in the exploded editor and read the truth off two
pilot holes that did not meet. That observation unwound to a single wrong
anchor in the engine — the box hangs off the SCREW ROW, 38 mm above the
runner it should ride. This turn re-anchors the box and installs a gate no
future turn can argue with: the holes themselves. Around it: the hinge
models finally arrive from the bucket (a URL was built without its host),
the 3-D wound-carving of turn 20 is retired behind a flag at the owner's
call, modals move to 240 px, the context guard stops shooting corpses,
and the wardrobe interior grows up — shelf types, partition law, one
height truth, a magnet, doors on partitions, and a cornice.

Read the whole file first. Full autonomy, zero questions. Clean or not at
all; the turn shrinks from the BOTTOM (F13, then F11, then F7's pull-out
half).

Baseline: main after the turn-20 merge (`3c2ee36`). Tests at baseline:
1555. CNC fingerprints at baseline: `verify/t20/fingerprints-turn20.txt`.

## 0. IRON RULES

Everything standing from turns 1–20 applies: engine purity; `profile.js`
the only home of numbers; "different numbers, never different patterns";
graceful degradation everywhere; golden fixtures move only where this
file names the move; CNC fingerprint deltas only where named; zero new
dependencies; every phase proven in `verify/t21/`; R1 — every pointer
gesture in the walk through REAL CDP input, `dispatchEvent` banned; R2 —
bucket claims proven against the live bucket; R3 — the live manifests
verbatim as parser fixtures.

NEW RULES, from this turn's post-mortems — permanent:

R4. **A URL is proven by asking the APP for it.** Turn 20's audit
    fetched hinge models over URLs the VERIFY SCRIPT built for itself —
    correctly — while the app built its own without host or bucket and
    404'd on the owner's machine. From now on the walk takes the exact
    URL string out of the app's own registry/state and fetches THAT.
    A verification that reconstructs the thing it verifies proves
    nothing.

R5. **The walk reads the console.** The owner's console told us in one
    paste what three audits missed. Every walk now captures browser
    console output; any `Failed to load resource` on a hardware path,
    any WebGL `INVALID_OPERATION`, any uncaught error = the step fails.
    The clean console is an assertion, not a hope.

## F1 — The box takes its truth from the runner's BOTTOM, and the
##      pilot holes are the gate [CRITICAL]

The owner's clue, verbatim intent: the drillings in the drawer front are
not at the same height as the drillings in the box — and THAT is how the
box height must be set.

Diagnosis, already done in the LISP and the engine — write it into the
code comments so it is never re-litigated:

* KIT_BUDR_FULL: façade pilots sit **96.5** above the façade's bottom
  edge (`+ G` on drawer 1, whose front runs G lower to cover the carcass
  floor). Box-front pilots sit **50** above the box front's bottom edge.
  `runnerY2 = frontY2` — the runner's BOTTOM is FLUSH with the façade's
  bottom edge for drawers 2+, and sits at `G` (on the carcass floor) for
  drawer 1. Chain the pieces — box front standing on the bottom board,
  bottom board 15 up its groove, side 13.5 over the runner — and the two
  pilot patterns meet EXACTLY: `frontBottom + 96.5` on both sides. The
  LISP is perfectly self-consistent.
* The engine anchors the box to `runnerRows` — which in this codebase is
  the SCREW ROW: runner bottom + 38 (`firstRowFromBottom`, the Movento
  drilling offset). Correct for carcass drilling; wrong as a box anchor.
  Every box therefore hangs 38 mm high, and the pilots miss by 38.

The fix:

1. Introduce the runner BOTTOM as its own named quantity per drawer:
   `runnerBottomY[i] = (i === 0 ? G : frontY[i])` — drawer indices
   bottom-up as today. `runnerRows` (screw centres, +38) stays exactly
   what it is and keeps feeding the carcass drilling and the runner hole
   pattern. Two names, two meanings, no reuse.
2. The box hangs off the bottom: `side.box.y = runnerBottomY + 13.5`;
   bottom board bottom face `= runnerBottomY + 28.5`; box front/back on
   the bottom board as turn 20 left them. Side HEIGHTS, front sizes and
   positions, groove and pockets: untouched (the 0.70 side law stays).
3. The runner GLB: verify where the model is mounted. If it is mounted
   on the screw ROW it renders 38 high like the box did — the model's
   bottom belongs at `runnerBottomY`, and the +38 screw centres must
   then land in the model's holes. Fix if wrong; state the finding in
   `verify/t21/hole-alignment.md` either way.
4. **THE GATE.** A test per kit family (BUDR, BUDR2, BUDR4, wardrobe
   with drawers, OVEN base) computes, for EVERY drawer, the world-space
   Y of the façade pilots (LISP law: front bottom + 96.5 (+G on drawer
   1)) and of the box-front pilots (box front bottom + 50) and asserts
   `|Δ| = 0`. The walk repeats it live on a seeded BUDR and screenshots
   the exploded drawer with both hole rows level. If the gate and any
   other law disagree, the GATE wins and the turn stops for the audit.
5. CNC: every drilling already encodes the correct law (carcass rows at
   +38, façade at 96.5, box front at 50) ⇒ **fingerprint delta ZERO**.
   Fixtures: turn 20 proved the golden files carry no panel Y ⇒ **zero
   fixture moves**. If either shows otherwise — stop.

## F2 — The hinge models arrive: the URL gets its host back [CRITICAL]

The owner's console, the whole diagnosis in one line:

    /hinges/blum/71B3550_42542984.glb  →  404

No Supabase host, no `hardware` bucket — the app asked its OWN domain
for the file. The runner URL builder composes `storageBase + bucket +
path + file`; the hinge side of `engine/hardwareUrl.js` (or wherever the
hinge model URL is composed) ships the in-bucket path bare.

1. Hinge model URLs compose exactly like runner URLs: host + bucket +
   manifest folder + basename. One shared helper if that is what it
   takes to make a third copy impossible.
2. R4 applies, and this is its first outing: the walk pulls the URL
   STRING from the app's hinge registry, fetches it (200, > 10 KB), and
   only then screenshots. R5 applies: the console capture must contain
   no failed `blum` resource.
3. Assert the scene: with a door present, the mounted hinge is the GLB
   mesh, not the stand-in — registry flag + screenshot in the main
   scene. The offline stand-in path is separately proven against an
   unreachable host, as with runners.
4. Display only — CNC delta ZERO, fixtures ZERO.

## F3 — The 3-D wound-carving retires behind a flag [HIGH]

The owner, after seeing pilot dots on his door faces and stray dashes
inside carcasses: the CNC sheet is the document; the 3-D carving is not
worth its problems. His call, and the right one.

1. `profile.appearance.cuts.enabled`, default **false**. The turn-20
   feature-carving (drills, pockets, grooves as recesses) renders only
   when true. No UI toggle — a profile flag for a future change of
   heart, one line.
2. What was there BEFORE turn 20 stays exactly as it was and does NOT
   sit behind the flag: dog bones, and the construction pockets the
   scene always showed. The pre-turn-20 look is the reference; a
   screenshot pair (flag off vs. turn-19 baseline) proves it.
3. Dead code from the always-on path is removed, not commented out.
   The z-fighting seen by the owner disappears with the default; do not
   spend this turn fixing the carving itself — it is retired, not
   debugged.
4. CNC delta ZERO, fixtures ZERO.

## F4 — Modals clear the object by 240 px [HIGH]

The owner used 140 for a day and asked for more: **240**, same law.

1. `profile.ui.modal.anchorOffset`: `{ x: 240, y: 0 }`. Top level with
   the click, right first, left when the right lacks room, clamp, drag —
   all as turn 20 wrote it. One number moves.
2. Turn-20's placement tests read the offset from the profile; any
   assertion that hard-codes 140 is rewritten to read the profile too.
   The five-corner walk passes at 240 with the door visible beside the
   panel in every corner.

## F5 — The context guard stops shooting corpses [HIGH]

The owner's console: `WebGL: INVALID_OPERATION: loseContext: context
already lost`, ten times, from `forceContextLoss`.

1. The turn-20 guard releases contexts deliberately — good — but calls
   `forceContextLoss()` on contexts that are ALREADY lost. Track state
   (the `webglcontextlost` event, or `gl.isContextLost()`) and force
   only a live one. Release exactly once per canvas lifetime.
2. The ≤ 2 live contexts law and the 12× editor cycle stay. R5 makes
   the console part of the assert: the cycle must produce ZERO
   `INVALID_OPERATION` lines and zero lost-context warnings.
3. `verify/t21/context-guard.md`: before/after console excerpts.

## F6 — The editors mount the same hardware as the main scene [HIGH]

The owner's exploded drawer showed grey slabs where Movento models
belong: the editor renders hardware through its own path.

1. The cabinet editor and the drawer editor mount runner and hinge GLBs
   through the SAME modules and registries as the main scene — one
   loader, one cache, one degradation story. No parallel stand-in-only
   path anywhere.
2. Exploded view included: the models ride their parts apart.
3. Walk: drawer editor open, explode on, screenshot with GLB runners
   visible; registry assert that the editor's mounted hardware entries
   are model-backed, not stand-ins. (SwiftShader blindness: the
   registry assert carries the proof; the screenshot is best-effort.)

## F7 — The shelf learns its three kinds [HIGH]

Owner: the shelf modal (double-click, turn-20 placement) gains a type:
**fix / adjustable / pull-out** — and pull-out means a flat drawer.

1. `fix` — today's shelf, today's fixing pattern from the LISP.
   Default; existing projects read as fix. Nothing moves.
2. `adjustable` — the shelf rests on pins in ⌀5 rows. FIRST search the
   LISPs (SKYLON_COMMON, KIT_WARDROBE_FULL) for the shelf-pin row law
   (spacing, setback from edges, row pitch). If the LISP carries it,
   use it verbatim and name the new entities. If it does NOT — the row
   pattern is a WORKSHOP NUMBER: the option renders in the modal but
   DISABLED with a tooltip, a BLOCKERS entry asks the owner for the
   pattern, and no number is invented. Either way the shelf itself
   loses its fixed dowels when adjustable.
3. `pull-out` — a flat drawer on Movento: the bay's sides get the same
   runner rows and drilling the drawer machinery already produces; NL
   from depth as ever; the tray rides at the shelf's height. The tray
   side height is a WORKSHOP NUMBER the owner has not given: the
   option ships VISIBLE but DISABLED with a tooltip, and BLOCKERS
   carries the ask. The plumbing behind it (type enum, engine switch,
   modal UI) ships now so the number is a one-line unlock.
4. CNC: `fix` unchanged everywhere ⇒ default projects fingerprint
   delta ZERO. `adjustable` (if LISP-backed) introduces NAMED ⌀5
   entities only in a dedicated probe scenario, never in the golden
   defaults. Fixtures ZERO.

## F8 — The partition setback: a default, not a law [HIGH]

Owner: 20 mm forced today; wrong. Default 20, editable, never imposed.

1. Per-partition field `setback`, 0…(depth-sane max), default from
   `profile` (20). The engine takes the field; the profile only seeds.
2. Setback 0 is load-bearing: it is what makes F12's doors possible.
   The field lives in the partition's own modal/panel row.
3. CNC: the partition's length already follows its setback — this is
   the same number made editable, no new entities. Golden defaults
   unchanged ⇒ delta ZERO.

## F9 — A partition yields only to the shelf that CROSSES it [HIGH]

Owner: a shelf spanning the section over a partition rightly splits it;
a shelf living INSIDE one bay must leave the partition alone — and today
the ORDER of adding decides, which is nonsense.

1. The law: SPAN decides, never order. A shelf whose run crosses the
   partition's plane splits the partition (partition meets the shelf's
   underside, as today). A shelf whose run lies between the partition
   and a side (or between two partitions) touches nothing.
2. Recompute on every edit — adding, deleting, or resizing either
   piece re-evaluates the relation from geometry alone. Save/load
   round-trips to the same result.
3. Tests: both orders of the owner's screenshot case (partition then
   bay-shelf; bay-shelf then partition) end in identical geometry.
   CNC follows the geometry it always followed; the golden defaults
   carry no such scene ⇒ delta ZERO there, and the probe scenario's
   entities are the existing named kinds, just placed right.

## F10 — One truth for shelf heights: the interior datum [HIGH]

Owner's screenshot: the panel says 860, the 3-D chip says 842 — one
measures from the cabinet's outer bottom, the other the clear light.
Nobody thinks in either mix; a joiner thinks in the space between.

1. ONE derivation, two displays: the panel field shows the shelf's
   underside height above the INTERIOR floor (top face of the carcass
   bottom); the 3-D chips show the CLEAR LIGHT between neighbours
   (floor→shelf, shelf→shelf, shelf→top). Both come from the same
   function; they can never disagree again.
2. STORAGE DOES NOT MOVE. Whatever the engine stores today keeps its
   meaning — only the two displays (field mapping in, labels out) are
   re-expressed. An existing project opens with every shelf exactly
   where it was; only the numbers SHOWN change meaning, and the field
   edits round-trip through the new mapping.
3. Tests: mapping both ways; a saved turn-20 project loads to
   identical geometry. CNC delta ZERO, fixtures ZERO.

## F11 — The height magnet [MEDIUM]

Owner: dragging a shelf near the height of a shelf in the next bay — or
the next CABINET — should catch, softly. His words: a proposal, not
force.

1. While dragging a shelf, if its height comes within
   `profile.editor.shelfMagnetMm` (default **10**) of a shelf height in
   an adjacent bay of the same unit OR in a horizontally adjacent unit,
   the drag snaps to equality, a dashed guide line draws across both,
   and the chip shows the shared number.
2. Drag on through and it lets go. The numeric field always writes the
   exact number, magnet or no magnet. Nothing links persistently — the
   magnet exists only during the drag.
3. Walk (R1): a real drag catching the neighbour's height, screenshot
   with the guide line; then a numeric entry 2 mm off, asserting no
   snap. Pure-math tests for the candidate-height gathering.

## F12 — Doors on the partition [HIGH]

Owner: a full-height partition at setback 0 must be able to carry
doors — his case: partitions at 600 and 800, three bays, two proper
doors and one small one in the middle.

1. Preconditions: partition full height AND setback 0. When any bay is
   bounded by such partitions, the DOORS section offers per-bay mode:
   each bay gets its own door (none/one), hinge side chosen per door —
   carcass side or partition.
2. Hinges on a partition drill the SAME patterns the sides carry: cups
   in the door (unchanged law), plate ⌀5 pattern in the partition's
   FACE — the existing plate law on a new panel. These are the turn's
   ONLY new CNC entities, a NAMED class (`HINGES_5MM` on partition
   parts), and they appear ONLY when a door is hinged on a partition —
   never in the golden defaults.
3. Door widths, the owner's law verbatim: the leaf HINGED ON the
   partition reaches the partition's far edge minus 3 mm — same rule
   as at a carcass side. Its neighbour keeps the 3 mm gap, therefore
   starts at the far edge and covers none of the partition — coming
   out slightly narrower, which the owner accepts. Gaps between doors:
   always 3. Heights follow the existing door law for the unit.
4. The hinge count/positions per door follow the existing height law;
   turn 19's per-hinge overrides work on these doors like any others.
5. Tests: the 600/800 three-bay case end-to-end — widths per the law,
   plate pattern on the correct partition faces, fingerprint probe
   showing ONLY the named class in the dedicated scenario and ZERO in
   defaults. Walk: build it live, real double-click one bay door open,
   screenshot.

## F13 — The cornice: 70 and 100 on an infill of 40 [MEDIUM]

Owner's construction, corrected today: doors finish FLUSH with the TOP
of the carcass top panel; the 40 mm infill stands ABOVE the top panel in
the door plane; the cornice mounts on the infill, its bottom edge flush
with the door plane at door-top level.

1. Per-unit option `cornice: none | 70 | 100` (wardrobes/tall). The
   infill 40 is the existing top-infill part, placed per the corrected
   relation; the cornice is a swept profile on top of it.
2. Profile shape: a parametric bead-and-cove approximation of the
   owner's reference (small bottom bead, concave sweep, flat top land),
   heights exactly 70/100, forward projection `profile` numbers —
   **48** for 70 and **65** for 100, the owner's to veto; a supplier
   DXF may replace the shape 1:1 in a later turn without touching the
   plumbing.
3. Continuity: one run across horizontally adjacent cornice-bearing
   units. An end at a wall, a side panel or a side infill STOPS flush
   against it. An OPEN end mitres 45° and returns along the unit's
   side to the back wall. Corners mitre at 45°.
4. BOM: linear metres (front + returns + mitre allowance per corner,
   allowance a profile number). CNC: the infill is already a cut part
   with its drilling — unchanged; the cornice itself is bought/moulded
   stock, NOT a CNC part ⇒ fingerprint delta ZERO.
5. Ceiling honesty: unit height + infill + cornice rise is reported in
   the unit's derived heights so a 2400 wardrobe under a 2400 ceiling
   warns instead of clipping.
6. Walk: two adjacent wardrobes with cornice 70, one open end —
   screenshot showing the run, the stop, and the 45° return.

## OUT OF SCOPE — named so nothing drifts in

* LIFT kits HK/HF: pattern gate still closed (HK position data and HK
  GLB pack outstanding). BLOCKERS carries it.
* Element editing inside the cabinet editor: the owner has not yet
  scoped it. Parked, again.
* Company defaults / data module: its own future turn, SQL-gated.
* Re-enabling the 3-D carving (F3's flag): only on the owner's word.
* The ⌀3 screw-on plate: still disabled, card 173L still pending.

## PROOF — what `verify/t21/` must contain

* `walk.json` — R1 real input throughout, R5 console capture attached,
  R4 hardware URLs taken from the app's own registries.
* `hole-alignment.md` — F1's gate table: per kit, per drawer, façade
  pilot Y vs box-front pilot Y, all deltas 0; plus the runner-GLB
  mounting finding.
* Screenshots: exploded drawer with level hole rows; hinge GLB in the
  main scene AND in the drawer editor; flag-off scene matching the
  turn-19 look; five-corner modal at 240; magnet guide line; the
  three-bay partition doors; the cornice run with its 45° return.
* `fingerprints-turn20-baseline.txt`, `fingerprints-turn21.txt`,
  `fingerprints-diff.txt` — ZERO on the golden defaults; the partition-
  door and adjustable-shelf probes show ONLY their named classes.
* `cnc-export-identity.md` — names the two scenario-only classes,
  confirms zero everywhere else.
* `context-guard.md`, `bucket-live.md` (R4 style).

## TESTS

Baseline 1555 all green. New suites: F1 the pilot gate per kit family;
F2 URL composition (host+bucket+folder+basename) for hinges AND
runners from one helper; F4 offset-from-profile; F9 order-independence
both ways; F10 mapping round-trip + turn-20 project load; F12 the
600/800 widths and plate placement; F13 run/stop/return resolution as
pure geometry. Turn-20 assertions that hard-code 140 are re-pointed at
the profile; nothing else existing is touched. The turn ships at 100%
green or shrinks from the bottom until it does.