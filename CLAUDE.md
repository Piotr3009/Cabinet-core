# CLAUDE.md — TURN 47 · THE LINE BENDS: A REAL CEILING, A ROOF-BOARD TOP, AND THE PENTAGON ON PAPER

The owner, 24.08.2026, three screenshots in hand. His rulings, verbatim
law:

* **The line bends where the ceiling bends.** *"jak sie konczy skos to
  powinno sie zalamywac kat tam gdzie sie zalamuje a nei od konca do
  konca szafy... w tym przypadku powinno byc czesc prosta i od momentu
  zalamania skos taki sam jak reszta skosu, nie moze byc od konca do
  konca szafy bo nie mamy ten sam skos i to nie zadziala."*
* **Two slopes are possible.** *"skosy mamy tylko po jednej stronie, a
  moze byc tak ze beda po 2 stronach."*
* **The top board sits ON the sides, not between them.** *"boki sa w
  tym przypadku pod wiencem a nie obok, w tym przypadku jak mamy skosy
  to wieniec jest na gorze."* Ends cut VERTICALLY: *"pionowo lico do
  boku."* And: *"wieniec nie moze grubiec"* — the board is 18 mm,
  measured perpendicular, always.
* **No dog bones on that top board.** *"gorny wieniec w tym przypadku
  nie moze miec dog bonesow."*
* **The sides run up to the point.** *"BUL i BUR przedluzony do czubka
  skosu i ustawione ciecie pod skosem, najlepiej zeby bylo napisane
  jaki kat ciecia, na CNC tez zeby bylo napisane."*
* **The infill is cut on the slope, and it is a plain board.** *"bedzie
  ciety jako prosta linia zwykly infill tylko zamontowany po skosie,
  ale laczenia beda ciete po skosie."* The L-corner keeps its 45:
  *"infill mitra zawsze jest 45."*
* **The infill leaves the machine oversize.** *"wszystkie infille jak
  mamy ustawione na 40 mm to CNC powinien rysowac o 20 mm szerszy
  (docinanie na miejscu przez stolarzy)."*
* **Five-axis waits, and it is written down.** *"narazie zrob 2D ale
  zapisz do cabinet core ze to bedzie zalegle bo napewno musimy do tego
  wrocic, ale tez pokaz kat ile stopni bedzie latwiej rysowac w
  przyszlosci."*

T46 gave the cabinet a cut. It gave it the WRONG cut whenever the
ceiling bends inside the cabinet's own width, and it dropped the top
board flat at the low end instead of laying it on the sides. This turn
fixes the line first, then rebuilds what stands on it.

## The line, in numbers (one definition, still used everywhere)

`ceilingAt(x)` stays exactly as T46 left it — one function,
`lib/slopeLine.js`, imported by every consumer. It ALREADY reads both
`L` and `R` slopes and it ALREADY knows where the knees are
(`slopeBreakXs`, `ceilingPolyline`). Nothing about the ceiling needs
inventing.

What is wrong is one layer up. `slopeCutLine` samples the ceiling at
the unit's two edges and hands the engine `{y0, y1}` — a STRAIGHT line
between them. `cutHeightAt` then lerps along it. Where a knee falls
inside the unit, that straight line is a fiction: it cuts the boards at
an angle the wall does not have. That is the owner's ruling, and it is
a production defect — the CNC gets a bevel that will not meet the
plaster.

**The cut becomes a POLYLINE, in unit-local x, and it is the same
polyline `ceilingPolyline` already returns:**

```
slope_cut = {
  axis: 'width',
  pts: [{x, y}, …],   // ≥2, left→right, a vertex at every knee
  infill: number,     // the project's scribe gap, unchanged
}
```

`pts` is `ceilingPolyline` over the unit's own span, minus the scribe
gap, minus `floorY` — the same three subtractions T46 already makes,
applied to every vertex rather than to two ends. A unit under a single
straight run yields two points and its geometry is **unchanged from
T46**: prove that, it is the safety net for this whole rewrite.

Consequences that must be honoured, not worked around:

* A panel may now carry **more than five corners**. Nothing may assume
  five. `trimOutlineOnSlope` walks the polyline; it does not special-case
  a count.
* **Two slopes in one unit** fall out for free — a wall with an L and an
  R slope gives a polyline that descends, runs flat, and descends again.
  No separate code path. Prove it with a fixture.
* `cutHeightAt(cut, x)` interpolates **within the containing segment**,
  not across the whole span.

## Iron rules (binding)

1. **Zero-stop overnight.** PR before morning regardless. Sacrifice,
   first to fall: **F6** (the drag ghost line — T46's second casualty,
   still owed). Second: the ANGLE ANNOTATIONS of F2/F3 (the cuts
   themselves never fall, only the text that names their degrees).
   **F1–F5 core never fall.**
2. **BYTE-IDENTITY.** Every engine change stays gated on `slope_cut`,
   which no golden config carries. `t47-classify` (copy
   `t46-classify.mjs`, keep it runnable from inside `scripts/` with its
   relative imports intact): six IDENTICAL, UNNAMED=0. If one moves,
   the gate leaks — stop that cut and note it.
3. **LISP IS LAW — FIRST.** `SKY:slopeCutPts` in `SKYLON_COMMON.lsp`
   learns the polyline; the roof-board top and the angled side tops are
   stated there before any JS. Callers stay
   `KIT_WARDROBE_FULL` + `KIT_BUDTALL_FULL` — **no other kit is
   touched**, and the PR says so. Paren balance 0/0 by script, all 13
   kits.
4. **Sanctity, with two NAMED licences.** Nothing else is deleted or
   rewritten. The two licences, both by the owner's ruling above:
   * `slopeCutLine`'s `{y0, y1}` return **becomes** `{pts}`. Every
     reader moves with it in the same commit. `cutEnds` keeps working
     (it reads the first and last vertex).
   * `cabinet.js`'s `topY = min(cutAt(0), cutAt(W))` — T46's flat top
     board dropped to the low end — **is replaced** by the roof board of
     F3. The old behaviour does not survive behind a flag; the owner
     rejected it by name (*"jak chcesz zeby szafa wygladala z wiencem
     poziomym jak jest skos?"*).
5. **Modals draggable and beside. English copy. Zero new deps. No SQL
   this turn. Suite never `--silent`. One commit per feature. Every
   screenshot LOOKED AT. Probes committed under `verify/t47/`, real
   pointer input.**

---

## F1 [CRITICAL] — the line bends

**LISP first.** `SKY:slopeCutPts` takes a list of points instead of two
heights and returns the trimmed outline for any board under it. The
routine is written once in `SKYLON_COMMON.lsp` and the two kits call it
unchanged in shape. Paren 0/0.

Then, in this order:

1. `lib/slopeLine.js` — `slopeCutLine` returns `{axis, pts, infill}`
   built from `ceilingPolyline` over `[x, x+width]`, every vertex minus
   `infill` minus `floorY`. `cutHeightAt` finds the segment containing
   `x` and interpolates inside it. `cutEnds` unchanged in meaning.
2. `engine/puzzle.js` — `slopeHeightAt`, `trimOutlineOnSlope`,
   `trimGeometryOnSlope`, `slopeCutActive` all take the polyline. No
   corner count is assumed anywhere.
3. `engine/cabinet.js` — `normaliseSlopeCut` accepts `pts`, rejects
   anything with fewer than two finite vertices, and returns `null`
   (no cut) rather than guessing.

**Prove it, in the suite:**

* a unit under one straight run — outline **identical** to T46, vertex
  for vertex,
* a unit straddling a knee — the vertex is IN the panel's outline at the
  knee's own x, and the two segments carry the two different angles,
* a unit under an L slope and an R slope at once — descends, runs flat,
  descends,
* a unit under a flat ceiling — `slope_cut` absent, engine byte-identical.

## F2 [HIGH] — the sides run to the point

`BUL` and `BUR` stop at the ceiling line, not at the low end's height.
Each side's top edge is **cut at the angle of the segment it sits
under**; a side that spans a knee carries two angles and the vertex
between them.

The angle is stated where a joiner reads it: on the panel's own record
(`meta.slopeCut.angles: [{from, to, deg}]`), on the part drawing, and on
the CNC sheet as text beside the edge — `CUT 47.7°`, one decimal.

## F3 [HIGH] — the top board is a roof, not a lid

The owner's correction, and it changes the board's whole identity: the
top board **lies ON the two sides**, spanning the FULL width `W`, not
the `W − 2G` between them.

```
β    = the segment's angle from horizontal = atan(Δy / span)
L    = W / cos β                  // the lower face, side face to side face
L_MAX= L + G · tan β              // the blank: lowest corner to highest corner
```

Both faces measure `L` — the ends are cut VERTICALLY (owner: *"pionowo
lico do boku"*), so the section is a parallelogram and the two faces are
equal. `L_MAX` is what the sheet must give up, and it is the number
that goes on the cut list.

Rules on this board:

* **Thickness is 18 mm, perpendicular, always.** It does not thicken.
  Its VERTICAL footprint at the edge is `G / cos β`, and that is a
  clearance fact, not a board fact — carry it as
  `meta.verticalFootprint` for the 3-D and the elevation, never as
  thickness.
* **No dog bones on it.** Owner's ruling. It carries no joint relief at
  all this turn.
* **One board per segment.** A board does not bend at a knee. Where the
  polyline has an interior vertex, the top becomes one panel per
  segment, each with its own `β`, `L` and `L_MAX`, ids suffixed
  `TOP-1`, `TOP-2`, … in left-to-right order.
* **The blank is a rectangle**, `L_MAX × depth`, and the bevel is an
  ANNOTATION: `BEVEL 47.7° BOTH ENDS · 5-AXIS`. A three-axis machine
  cannot cut it and the sheet must not pretend otherwise.

The sides' joints move with it: the top's sockets sit where the roof
board lands, on the angled edge. Layout stays T46's — set out square on
the full carcass, then cut with it.

## F4 [HIGH] — the infill obeys the slope, and leaves oversize

**Cut.** The side infill is trimmed on the ceiling line like any other
board — same polyline, same angle. Today it runs full height and the
room lies (owner's screenshot 1).

**Shape.** The top infill stays a PLAIN rectangle, mounted along the
slope. It is not a trapezium. Only its ENDS are cut, at the angle the
slope gives.

**Two different mitres, and they must not be confused:**

* the **L corner** of one infill piece — `face × arm`, always 90°,
  therefore **always mitre 45°**. Unchanged, untouched, owner's ruling.
* the **side infill × top infill** junction — the angle between a
  vertical piece and a sloped one, so the mitre is half of THAT angle.
  `mitre_45` must carry a computed number here instead of the constant.
  Keep the field name (nothing downstream is renamed); carry the degrees
  in `meta.mitre.deg`.

**Oversize.** `fillerOversize: 20` joins `frontOversize` and
`bottomOversize` in `engine/profile.js` — the house idiom, not a new
mechanism. Every infill leaves the machine **20 mm over on the WALL
edge only**. The mitre is a JOINT, not an allowance: it keeps its long
point exactly as computed, and the 20 goes on the opposite edge. The
CNC sheet stamps `OVERSIZE +20 — TRIM ON SITE`, and the cut list shows
the nominal beside it so nobody prices the extra.

## F5 [HIGH] — the pentagon reaches paper

T46-F6b's own finding, and its own one-sentence fix: **the elevation
traces the panel's outline where it has one, and its bounding rectangle
where it does not.**

* `engine/drawings/frontElevation.js` L343 — `rect(…p.box…)` becomes a
  polyline over `p.cnc.outline` when that outline has more than four
  points, `rect` otherwise.
* `engine/drawings/partDetail.js` — the same `if`, so the part sheet
  shows the real board.

Nothing else in the drawings system changes. No new sheets, no new
dimension chains, no title-block work.

## F6 [LOW] — the ghost line

During a drag into a slope zone, a ghost line shows the cut-to-be. It
reads `ceilingAt` — the same one, no second chain. **First to fall.**

## The backlog gets two entries

`BACKLOG.md` continues its numbering (last is 119). Add, in the file's
own voice and language:

* **120. [HIGH] Eksport 3-D dla 5-osi.** The roof board and the angled
  side tops are BEVELS through the thickness. A three-axis DXF cannot
  carry them, so T47 ships the blank plus a degrees annotation and the
  owner accepted that as interim (*"narazie zrob 2D"*). What is owed: a
  3-D representation the five-axis can read, and angled drilling for the
  same reason. Owner: *"napewno musimy do tego wrocic."*
* **121. [MEDIUM] Relief na wypuscie zamiast dog bone w gniezdzie.**
  For fixed shelves, the corner relief a router radius demands should
  live on the TAB (two corners chamfered ~3×3 for a ⌀6 cutter), not as
  dog-bone circles in the mortise, which surface on a visible face. The
  tab then seats fully — a shallower dog bone leaves a gap and puts the
  joint on glue. Geometry, therefore `reference/lisp/panel_joints.lsp`
  first. Discussed 24.08.2026; not decided, not started.

## Execution order

`F1` → `F2` → `F3` → `F4` → `F5` → `F6`. F1 is the foundation: F2 and
F3 read angles OFF the polyline, and computing them from a fictional
straight line would ship a correct-looking board with the wrong bevel.
Do not reorder.

One commit per feature. The suite runs, in full, at every one.

## What this turn does NOT touch

The six golden configs' bytes. Kits other than WARDROBE/BUDTALL. The
wizard. The runners' catalogue. The rail. The `cc_*` schema — **no SQL
this turn**. The drawings system beyond F5's two `if`s. Shaker geometry
(a cut leaf stays the plain pentagon T46 left it — its recess is still
owed and still named).

## Morning audit will run

Fresh clone → install → suite (never `--silent`) → build →
`t47-classify` (six IDENTICAL, UNNAMED=0) → paren balance 13/13 0/0 with
no kit but the two named touched → the polyline audit (single-run unit
byte-identical to T46; knee unit carries the vertex; two-slope fixture
descends-flat-descends) → `L`, `L_MAX` and `β` re-derived by hand
against the panel record → the oversize audit (+20 on the wall edge,
mitre long point untouched) → both drawings rasterised and LOOKED AT →
every screenshot looked at, the owner's own camera angle first →
verdict → the numbered eye-test list.