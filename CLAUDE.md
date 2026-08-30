# CLAUDE.md — TURN 57 · TWO DEBTS PAID, THEN J-PULL HANDLELESS

Run autonomously. Zero questions, zero stops. Skip-and-note; sacrifice F5,
then F4 — NEVER F0a/F0b/F1/F2. PR before morning. Branch `t57`.

**BASE: `origin/main` (87f3d1d or later). This turn runs BEFORE the
pattern registry (t56): it consumes only the handle chain, which exists
today. Do not run in parallel with any other turn.**

## STANDING LAW (unchanged, enforced)

- **LISP IS LAW.** New geometry is written in `reference/lisp/` FIRST; the
  engine follows. Paren census grows to **14/14 at 0/0** (13 kits today +
  `KIT_FRONT_JPULL.lsp`) — extend `scripts/t50-paren-balance.mjs` and name
  the change.
- **BYTE-IDENTITY.** Goldens (flat, untrimmed) byte-identical.
  `t57-classify.mjs`, `UNNAMED=0`. NAMED deltas allowed only on: (a) fronts
  the tests dress in jpull; (b) slope-cut leaves carrying a
  `front_edge_trim` (F0a's whole point is that their output changes).
- **Sanctity — licensed this turn, and nothing else:** on a jpull-system
  front only, handle/knob hardware and its drilling are suppressed at the
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

### The cause (one)

`src/engine/cabinet.js`, the `front_edge_trim` applier (~6228–6266), runs
on every front and does:

    pnl.cnc = { ...pnl.cnc, ...rectGeometry(w, pnl.h) };

`rectGeometry` overwrites the outline with a FULL RECTANGLE — on a
slope-cut leaf too, whose outline was the cut polygon. `cnc.slopeCut`
survives the spread, so `3d/shakerSolid.js` reads "cut" + a rectangular
outline and builds a full-height tray with a diagonal pocket inside — the
phantom. The trigger chain: front edge enters `neighbourReachMm` (200 mm,
profile) of a wall → clearance engine wakes → yellow message AND the
store's auto-heal applies a micro-trim in the same recompute ("gaps should
fix themselves", T32). 1.5 mm is enough.

### Reproduction — write the RED test from this first

    WARDROBE, W1000 H2200 D600, front_type 'S', door_count 2,
    slope_cut { pts:[{x:0,y:1300},{x:520,y:2200},{x:1000,y:2200}], infill:40 },
    front_edge_trim { '01-FL': { left:0, right:1.5 } }

On main today: `01-FL` outline collapses to a rectangle — every top y =
2079.8328, across the full width. Without the trim: a true cut polygon.

### The law

In the trim applier, a leaf that carries `slopeCut` does NOT take
`rectGeometry`. After `pnl.w`, `pnl.box.x`, `pnl.box.w` move, it re-runs
**its own ceiling cut over its NEW span** — `frontSlopeAt(newRoomX, newW)`,
already defined in the same `computeCabinet` scope (~5693; search-first:
the working law is taken, the source named in the report; no second
sampler). From its answer, refresh EVERY field the original cut set — no
more, no less:

1. `pnl.cnc.outline` (sheet frame — `frontSlopeAt` already answers in the
   inside-mirror frame; do not re-mirror by hand, T28-F2b is the scar);
2. `pnl.cnc.slopeCut` (fresh `pts` for the new span);
3. `pnl.h`, `pnl.box.h` — the tall-edge height CAN change: trimming the
   diagonal-side edge slides the window along the ceiling (in the repro,
   right-trim 1.5 at slope 1.7308 lowers the tall edge by ~2.6 mm). The
   rectangle bug hid this; the fix must not;
4. `pnl.meta.slopeCut` (`h`, `full`, `angles`) and `pnl.meta.cupY` — the
   cup ladder is derived from the leaf's own height (T36-F6 channel); a
   shorter tall edge re-rungs it.
5. `pnl.edgeLen` from the true perimeter of the polygon, not `2w + 2h`.

ORDER IS PART OF THE LAW: verify, and state in the report, that the
cup-DRILLING pass and the shaker-pocket pass both run AFTER the trim
applier in the file, so they consume the refreshed leaf. If any consumer
runs earlier, move the refresh, not the consumer, and say so. If the new
span leaves the cut inactive (`slopeCutActive` false), the leaf is cut
plain through the existing channels and the record says so. FLAT leaves
keep `rectGeometry` byte-for-byte as today.

### Definition of done

- Red-first node:test file `test/turn57-f0a-trim-keeps-the-cut.test.js`:
  (a) repro above → outline NOT a rectangle; diagonal parallel to the
  ceiling over the trimmed span to < 0.01 mm; (b) shaker pocket holds the
  true 60 mm frame PERPENDICULAR to the diagonal (vertical gap =
  60/cos β); (c) `pnl.h` equals the ceiling at the new tall edge minus the
  standing offsets; top cup sits inside the new height; (d) flat twin
  (same trim, no slope) byte-identical to main; (e) both-edges trim; (f)
  the T47 knee fixture trimmed.
- Rig frame `verify/t57/f0a-trim-slope.png`: shaker wardrobe < 200 mm from
  a wall, the yellow message VISIBLE, the door CLEAN.

## F0b [CRITICAL] · BUGFIX — THE WATCH PANE IS GLASS, NOT A BOARD

Owner, live: *"nie przezroczysta i nie widać szuflady w środku przez szybę
— szkoda."*

### The law

The pane renders as GLASS. Find its ONE home first — search the 3-D layer
for where the pane mesh is born (cues: `shelf_glass`, the T53/T55 pane
records) — and name it in the report. Then:

1. Material: transparent glass — `transparent: true`, opacity ≈ 0.22–0.32
   with a faint cool tint and a specular sheen (or physical transmission
   if the renderer path already supports it — whichever the existing
   material system does cheaply; no new npm deps). `depthWrite: false` so
   the interior draws through it; set `renderOrder` so the pane paints
   AFTER the insert beneath; guard against z-fighting with the shelf
   rebate (the pane sits flush by T53 law — keep the geometry, fix the
   paint).
2. The drawer, pockets and watches beneath are VISIBLE through it; the LED
   ring reads through the pane.
3. Contour and X-ray passes keep their own conduct: contour draws the
   pane's outline, X-ray already sees through everything — neither paints
   it solid.
4. ENGINE BYTES DO NOT MOVE: the cut, rebate and BOM line are T53/T55 law
   and stay. The fixed lighting-rig rule stands.

### Definition of done

- `verify/t57/f0b-glass.png`: camera above the open drawer zone, insert
  visible THROUGH the pane, LED on.
- A test where the picture can be tested cheaply (material flags on the
  pane mesh via the existing 3-D unit-test harness if one exists;
  otherwise the frame is the proof and the report says so).

---

## THE DOCTRINE, CORRECTED IN THE OPEN

Two axes, never merged: FACE PATTERN (slab, shaker, grooved…) × HANDLE
SYSTEM (handle, knob, none — and now J-PULL). A grooved door with a J edge
must be possible, so **J-pull lives on the HANDLE axis**. The pattern
registry (a later turn) must NOT list `jpull` among its reserved pattern
ids — its comment points at `engine/handles.js` instead.

## THE PROFILE IS THE OWNER'S DRAWING, NOT A GUESS

Measured from the owner's `J_hand.dxf` (18 mm board, section at the edge) —
these numbers ARE the law, named constants in profile and LISP:

- front lip (the visible hook of the J): **4.212 mm**, standing **30 mm**
  proud of the relieved back;
- finger slot: **10 mm** wide, **40 mm** deep from the edge, bottom
  rounded **r5** (45 mm to the arc's tangent);
- rear leg: **3.788 mm**; rear relief: back face cut down **30 mm** from
  the edge — the finger clearance;
- 4.212 + 10 + 3.788 = 18.000 — the drawing closes and the LISP must too.

## F1 [CRITICAL] · THE LAW, IN LISP

New file `reference/lisp/KIT_FRONT_JPULL.lsp` (paren census → 14), house
style of the existing kits:

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
     names. Under a slope the forced hand (T46/T55 law) flips the J with
     it for free: one source, no second decision;
   - NEVER on a diagonal (slope) edge.
3. TALL doors take a STOPPED RUN, not the full edge. Owner: *"500 mm,
   zaczyna się od dołu frontu około 700 mm"* — run `jpull.runMm` (default
   **500**), starting `jpull.fromBottomMm` (default **700**) up from the
   leaf's OWN bottom edge. Both are profile parameters. **The ends ramp in
   and out ON AN ARC** — the router's own lead-in, owner: *"wjazd po łuku,
   nie ostre, łukowate"* — never a square stop; ramp radius
   `jpull.rampR` is a named profile parameter with a placeholder the owner
   will tune later (*"routerowanie będziemy robić później"*).

## F2 [CRITICAL] · THE ENGINE — A HANDLE SYSTEM CALLED JPULL

1. The handle chain (`src/engine/handles.js` and its consumers) gains
   system `jpull`. Selecting it:
   - resolves edge + run per the F1 table — ONE function, one answer (wall
     doors resolve to NONE);
   - writes ONE machining record on the front, exact shape:

         cnc.jpull = {
           edge: 'top' | 'left' | 'right',      // ROOM frame
           spanFromMm, spanToMm,                 // along the edge; full
                                                 // width ⇒ 0..w
           profile: { lipMm: 4.212, slotWMm: 10, slotDMm: 40,
                      bottomR: 5, reliefMm: 30, legMm: 3.788 },
           rampR,                                // stopped runs only
         }

     plus the part-sheet label — `J-PULL TOP` for a full edge,
     `J-PULL LEFT 700–1200` for a stopped run — translated into the SHEET
     frame at exactly ONE point (the inside-mirror law of
     `engine/joinery.js`; T28-F2b is the scar to reread: left/right flip,
     top does not);
   - suppresses handle/knob hardware AND its drilling at birth on EVERY
     front of the system — wall doors included: no machining and no handle
     either (licensed);
   - profile block `jpull: { runMm: 500, fromBottomMm: 700, rampR, …the
     five constants }` joins `companyDefaults` / the cabinet profile, read
     the way `doors.gap` is.
2. Split doors, bay doors, slope-cut leaves: the SAME law per leaf. A tall
   leaf shorter than `fromBottomMm + runMm` clamps the run and says so in
   a Check line; an edge that cannot take the run refuses with a warning,
   never guesses. A leaf that is BOTH trimmed and slope-cut takes F0a's
   refreshed outline first — order in the file guarantees it, and the
   report states where.
3. BOM: a jpull front carries no handle purchase line; the machining
   appears the way other edge work appears today. No invented cost rows.

### Definition of done

Tests `test/turn57-f2-jpull-law.test.js`: edge/run resolution table (base,
drawer, wall→none, tall L/R hinge, forced-hinge-under-slope flip,
short-leaf clamp lands 700→leafTop); drilling absent on jpull fronts,
present and byte-identical on non-jpull; sheet label text both frames;
profile params reach the record; the stopped run lands at 700–1200 on a
standard tall leaf.

## F3 [HIGH] · THE PICTURE — A RECESS WITH A SHADOW

Owner, verbatim: *"nie zapomnij o cieniowaniu po routerowaniu, żeby było
widać cień."* The J renders as GEOMETRY, the shaker school: a real
depression with explicit normals so it reads at a grazing angle — not a
painted stripe. On tall doors the stopped run shows its CURVED ramp ends.
Scope the mesh work to the leaf edge (extend `panelSolid`'s machined path
or the tray builder — whichever the code says is the ONE home; name the
choice in the report). Handle meshes do not mount on jpull fronts — they
were never born. Works on wardrobe verticals, kitchen horizontals, and
beside a slope-cut leaf.

Screenshots: `verify/t57/f3-jpull-wardrobe.png` (stopped run, curved ends,
shadow visible), `f3-jpull-kitchen.png` (base + drawer top edges; wall
door clean).

## F4 [HIGH] · THE UI ENTRY

1. Wherever the handle system is chosen today, `J-pull handleless`
   appears — the EXISTING selector learns one option; no new modal.
2. Settings surface `runMm`, `fromBottomMm`, `rampR` and the five profile
   constants beside the other millimetre fields, labelled in English,
   editable, engine reads them live.
3. Click-path proof: `verify/t57/f4-ui.png` — "where I click → the J
   appears on the cabinet".

## F5 [MEDIUM] · THE CHECKS SAY WHY

Check lines for the refusals and clamps F2 defined (short leaf, refused
edge), worded in the house voice, with the unit and leaf named. No silent
skips.

---

## ORDER, PROOF, REPORT

**F0a → F0b → F1 → F2 → F3 → F4 → F5.** The bugfixes land FIRST, each a
separate commit, red test before green.

Proof: full suite green; classifier named-deltas only (jpull fixtures +
trimmed slope-cut leaves); paren 14/14; screenshots listed above.

Morning report, numbered: per feature done/skipped; the two law path
counts (each must be 1); the consumer-order statement from F0a; the pane's
one home from F0b; licensed deletions confirmed; `+X/−Y`; test totals;
classifier verdict; the `rampR` placeholder called out for the owner to
tune.