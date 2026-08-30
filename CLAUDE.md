# CLAUDE.md — TURN 57 · TWO DEBTS PAID, THEN J-PULL HANDLELESS

Run autonomously. Zero questions, zero stops. Skip-and-note; sacrifice F5,
then F4 — NEVER F0a/F0b/F1/F2. PR before morning. Branch `t57`.

**BASE: `origin/main` WITH t56 MERGED. Do not run in parallel — this turn
consumes the pattern registry and the handle chain. If t56 is not merged,
stop and say so in the PR description.**

## STANDING LAW (unchanged, enforced)

- **LISP IS LAW.** New geometry is written in `reference/lisp/` FIRST; the
  engine follows. Paren census grows to **14/14 at 0/0** (13 kits today +
  `KIT_FRONT_JPULL.lsp`) — extend `scripts/t50-paren-balance.mjs` and name
  the change.
- **BYTE-IDENTITY.** Goldens (flat, untrimmed) byte-identical.
  `t57-classify.mjs`, `UNNAMED=0`. NAMED deltas allowed only on: (a) fronts
  the tests dress in jpull; (b) slope-cut leaves carrying a
  `front_edge_trim` (F0a's whole point is that their output changes).
- **Sanctity — licensed this turn, and nothing else:** (1) the `jpull`
  reservation comment line in `frontPatterns.js`; (2) on a jpull-system
  front only: handle/knob hardware and its drilling suppressed at the
  source — never born, never gated.
- **One path per job.** Report the counts: slope-outline-after-trim law = 1;
  jpull edge/run law = 1.
- New feature = visible UI entry, same package, screenshot-proven.
- Full suite, never `--silent`. No new npm dependencies. Owner quotes are
  law; code and UI copy in English.

---

## F0a [CRITICAL] · BUGFIX — A TRIM MUST NOT FLATTEN A SLOPE-CUT LEAF

Diagnosed 30.08, numeric proof on main 87f3d1d. The owner's live symptom:
the shaker "phantom sheet" appears the exact moment the wall-clearance
message fires.

THE CAUSE (one): `src/engine/cabinet.js` ~6257, the `front_edge_trim`
applier runs on every front:

    pnl.cnc = { ...pnl.cnc, ...rectGeometry(w, pnl.h) };

`rectGeometry` overwrites the outline with a FULL RECTANGLE — on a
slope-cut leaf too, whose outline was the cut polygon. `cnc.slopeCut`
survives, so `3d/shakerSolid.js` reads "cut" + a rectangular outline and
builds a full-height tray with a diagonal pocket inside it — the phantom.
The chain that pulls the trigger: front edge enters `neighbourReachMm`
(200) of a wall → clearance engine wakes → yellow message AND the store's
auto-heal applies a micro-trim in the same recompute ("gaps should fix
themselves", T32). 1.5 mm is enough.

REPRODUCTION (write the RED test from this first):

    WARDROBE, W1000 H2200 D600, front_type 'S', door_count 2,
    slope_cut { pts:[{x:0,y:1300},{x:520,y:2200},{x:1000,y:2200}], infill:40 },
    front_edge_trim { '01-FL': { left:0, right:1.5 } }

On main: `01-FL` outline collapses to a rectangle (every top y = 2079.8328).
Without the trim: a true cut polygon.

THE LAW: after trimming, a leaf that carries `slopeCut` recomputes its
outline FROM ITS OWN CEILING LINE at its NEW span — `frontSlopeAt(newX,
newW)` already exists in the same `computeCabinet` scope (search-first: the
working law is taken, the source named in the report; no second sampler).
The refreshed outline, pts, leaf height and `meta.slopeCut` land on the
piece; the shaker pocket pass runs AFTER the trim applier and follows the
new outline with no extra work. A trimmed leaf whose new span leaves the
cut inactive (`slopeCutActive` false) is cut plain and says so via the
existing channels. FLAT leaves keep `rectGeometry` byte-for-byte as today.

Tests (node:test, red-first): the reproduction above → outline is NOT a
rectangle, its diagonal is parallel to the ceiling line over the trimmed
span to < 0.01 mm, the shaker pocket holds the true 60 mm frame
PERPENDICULAR to the diagonal, hinge cups stay on the tall edge; the flat
twin (same trim, no slope) byte-identical to main; both-edges trim; trim on
the knee fixture. Rig frame: shaker wardrobe standing < 200 mm from a wall,
message visible, door CLEAN — `verify/t57/f0a-trim-slope.png`.

## F0b [CRITICAL] · BUGFIX — THE WATCH PANE IS GLASS, NOT A BOARD

Owner, live: the pane exists but *"nie przezroczysta i nie widać szuflady w
środku przez szybę — szkoda."*

THE LAW: the pane renders as GLASS — transparent with a faint tint and a
specular sheen; the drawer, the pockets and the watches beneath are VISIBLE
through it; the LED ring reads through the pane. 3-D material only: no
engine byte moves (the pane's cut, rebate and BOM line are T53/T55 law and
stay). Respect render order/depth so the interior draws behind the pane
correctly in 3D, contour and X-ray; the fixed lighting-rig rule stands.
Scope: the mesh/material where the pane is built (name the one home in the
report; ≤ the 3-D layer).

Proof: `verify/t57/f0b-glass.png` — camera above the open drawer zone,
insert visible THROUGH the pane, LED on.

---

## THE DOCTRINE, CORRECTED IN THE OPEN

Two axes, never merged: FACE PATTERN (slab, shaker, grooved…) × HANDLE
SYSTEM (handle, knob, none — and now J-PULL). A grooved door with a J edge
must be possible, so **J-pull lives on the HANDLE axis**, not in the pattern
registry. T56 reserved a `jpull` id in `frontPatterns.js`'s comments — that
reservation was wrong; this turn deletes that one line (licensed) and says
why in its place: *"jpull is a handle system — see engine/handles.js."*

## THE PROFILE IS THE OWNER'S DRAWING, NOT A GUESS

Measured from the owner's `J_hand.dxf` (18 mm board, section at the edge) —
these numbers ARE the law and go into the LISP verbatim:

- front lip (the visible hook of the J): **4.212 mm** thick, standing
  **30 mm** proud of the relieved back;
- finger slot: **10 mm** wide, **40 mm** deep from the edge, bottom rounded
  **r5** (45 mm to the arc's tangent);
- rear leg: **3.788 mm**; rear relief: back face cut down **30 mm** from
  the edge — the finger clearance;
- 4.212 + 10 + 3.788 = 18.000 — the drawing closes and the LISP must too.

## F1 [CRITICAL] · THE LAW, IN LISP

New file `reference/lisp/KIT_FRONT_JPULL.lsp` (paren census → 14), in the
house style of the existing kits:

1. A J-pull is the profile above, machined along an edge of a leaf or
   drawer front. It is a SHAPER/FORM-TOOL PASS — the DXF carries the edge
   line (or the stopped run's span) and a `J-PULL <EDGE>` note exactly the
   way a slope carries its `CUT β°` note; nobody draws fake profile curves
   into the cut path.
2. WHICH edge — the owner's corrected table, verbatim law:
   - kitchen BASE unit doors and ALL drawer fronts: TOP edge, full width;
   - kitchen WALL unit doors: **NO J AT ALL.** Owner: *"na szafkach
     wiszących nie rób J"* — gripped from below and *"to już robi
     program"*: existing front geometry stands, zero machining, zero new
     extension logic invented;
   - TALL doors (fridge housings, wardrobes): the VERTICAL edge on the
     OPENING side — opposite the hinge, the edge `meta.hinge` already
     names. Under a slope the forced hand (T46/T55 law) flips the J with it
     for free: one source, no second decision;
   - NEVER on a diagonal (slope) edge.
3. TALL doors take a STOPPED RUN, not the full edge. Owner: *"500 mm,
   zaczyna się od dołu frontu około 700 mm"* — run `jpull.runMm` (default
   **500**), starting `jpull.fromBottomMm` (default **700**) up from the
   leaf's own bottom edge. Both are profile parameters. **The ends ramp in
   and out ON AN ARC** — the router's own lead-in, owner: *"wjazd po łuku,
   nie ostre, łukowate"* — never a square stop; ramp radius is a named
   profile parameter with a placeholder the owner will tune later
   (*"routerowanie będziemy robić później"*).

## F2 [CRITICAL] · THE ENGINE — A HANDLE SYSTEM CALLED JPULL

1. The handle chain (`src/engine/handles.js` and its consumers) gains
   system `jpull`. Selecting it:
   - resolves edge + run per the F1 table — ONE function, one answer (wall
     doors resolve to NONE);
   - emits the edge machining record on the front's `cnc` (edge id, run
     span for tall doors, profile params, the `J-PULL <EDGE>` sheet label —
     mirrored correctly into the sheet frame; the inside-mirror law of
     `engine/joinery.js` applies, T28-F2b is the scar to reread);
   - suppresses handle/knob hardware AND its drilling at birth on EVERY
     front of the system — wall doors included: no machining and no handle
     either (licensed);
   - profile block `jpull: { runMm: 500, fromBottomMm: 700, rampR }` plus
     the five profile constants from the owner's drawing join
     `companyDefaults` / the cabinet profile, read the way `doors.gap` is.
2. Split doors, bay doors, slope-cut leaves: the SAME law per leaf. A tall
   leaf shorter than `fromBottomMm + runMm` clamps the run and says so in a
   Check line; an edge that cannot take the run refuses with a warning,
   never guesses. A leaf that is BOTH trimmed and slope-cut takes F0a's
   refreshed outline first — order in the file guarantees it.
3. BOM: a jpull front carries no handle purchase line; the machining
   appears the way other edge work appears today. No invented cost rows.

Tests: edge/run resolution table (base, drawer, wall→none, tall L/R hinge,
forced-hinge-under-slope flip, short-leaf clamp); drilling absent on jpull
fronts, present and byte-identical on non-jpull; sheet note text; profile
params reach the record; the stopped run lands at 700–1200 on a standard
tall leaf.

## F3 [HIGH] · THE PICTURE — A RECESS WITH A SHADOW

Owner, verbatim: *"nie zapomnij o cieniowaniu po routerowaniu, żeby było
widać cień."* The J renders as GEOMETRY, the shaker school: a real
depression with explicit normals so it reads at a grazing angle — not a
painted stripe. On tall doors the stopped run shows its CURVED ramp ends.
Scope the mesh work to the leaf edge (extend `panelSolid`'s machined path
or the tray builder — whichever the code says is the ONE home; name the
choice). Handle meshes do not mount on jpull fronts — they were never born.
Works on wardrobe verticals, kitchen horizontals, and beside a slope-cut
leaf.

Screenshots: `verify/t57/f3-jpull-wardrobe.png` (stopped run, curved ends,
shadow visible), `f3-jpull-kitchen.png` (base + drawer top edges; wall door
clean).

## F4 [HIGH] · THE UI ENTRY

1. Wherever the handle system is chosen today, `J-pull handleless` appears —
   the EXISTING selector learns one option; no new modal.
2. Settings surface `runMm`, `fromBottomMm` and the profile constants
   beside the other millimetre fields, labelled in English, editable,
   engine reads them live.
3. Click-path proof: `verify/t57/f4-ui.png` — "where I click → the J
   appears on the cabinet".

## F5 [MEDIUM] · THE CHECKS SAY WHY

Check lines for the refusals and clamps F2 defined, worded in the house
voice, with the unit and leaf named. No silent skips.

---

## ORDER, PROOF, REPORT

**F0a → F0b → F1 → F2 → F3 → F4 → F5.** The bugfixes land FIRST and each
is a separate commit, red test before green.

Proof: full suite green; classifier named-deltas only (jpull fixtures +
trimmed slope-cut leaves); paren 14/14; screenshots listed above.

Morning report, numbered: per feature done/skipped; the two law path
counts; licensed deletions confirmed; `+X/−Y`; test totals; classifier
verdict; the ramp-radius placeholder called out for the owner to tune.