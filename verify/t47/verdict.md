# T47 — THE LINE BENDS · the verdict, and the numbered eye test

The owner, 24.08.2026, three screenshots in hand. Six features were asked
for and **six were delivered.** F6 was named the first to fall and it did
not fall; nothing was sacrificed.

---

## The audit, run on a fresh clone

| gate | result |
| --- | --- |
| fresh clone → `npm install` → `npm test` (never `--silent`) | **4194 pass, 0 fail** |
| `npm run build` | **passes** |
| `t47-classify` vs the T46 base (`b83b113`) | **six IDENTICAL, UNNAMED 0** |
| `t47-classify --cut` | **6/6 cut** on a BENT fixture |
| `t47-paren-balance --against b83b113` | **13/13 at 0/0**, only the three named LISP files moved |
| the polyline audit (`t47-vertices`) | **exit 0** — blocks 2 and 3 identical character for character |
| the hand audit (`t47-hand-audit`) | **exit 0** — every L, L_MAX, β and footprint re-derived by hand agrees |
| the acceptance walk (`e2e-turn47`) | **12/12**, real pointer input |

Six IDENTICAL is measured against **the engine T46 shipped**, not against
this branch's own first commit. That is the strongest form of the gate:
the turn rewrote what a cut cabinet looks like and moved nothing at all
for a cabinet that is not under a ceiling.

---

## What each feature is, in one line

* **F1 — the line bends.** The cut is a POLYLINE, and it is
  `ceilingPolyline`'s own — one call, knees included. `slopeCutLine`
  returns `{pts}`; `slopeHeightAt` interpolates INSIDE the containing
  segment; `trimOutlineOnSlope` splits each edge at the knees before
  solving and then walks the LINE ITSELF where the boundary runs along
  it. **Nothing assumes five corners.**
* **F2 — the sides run to the point.** `BUL`/`BUR` are the BLANK — the
  peak over their own 18 mm — and the wedge comes off as a bevel whose
  angle the board states, in three places: its own record, the part
  drawing, and the CNC sheet.
* **F3 — the top is a ROOF.** It lies ON the sides, spans the FULL width,
  ends cut vertically, `L = span/cos β`, blank `L_MAX = L + G·tan β`, one
  board per segment, **no dog bones**, 18 mm perpendicular for ever, and
  its vertical footprint `G/cos β` is carried as CLEARANCE and never as
  thickness. T46's flat lid is gone and does not survive behind a flag.
* **F4 — the infill obeys.** The side filler is cut on the same line; the
  top infill stays a PLAIN RECTANGLE mounted along the slope with only
  its ends cut; the two mitres are never confused (the L corner is always
  45, the side × top junction is `(90 ± β)/2`); every infill leaves the
  machine +20 on the edge it is scribed to, with the nominal beside it.
* **F5 — the pentagon reaches paper.** The elevation traces the panel's
  outline where it has one and its box where it does not — and the two
  boards this turn invented state their own elevation profile, because
  neither's cut outline is in this projection.
* **F6 — the ghost line.** The cut-to-be, drawn while the hand is still
  moving, from the same `ceilingAt` as everything else.

---

## THE NUMBERED EYE TEST

Ten things to look at, in the order a joiner would meet them. Everything
named is in this folder.

1. **`walk-1-wall-two-slopes.png`** — the wall, with the ceiling coming
   down at BOTH ends. This is the case he named and no walk had driven.
2. **`walk-2-unit-on-the-flat.png`** — the cabinet before it meets the
   slope. The control: nothing is cut, nothing is stamped.
3. **`walk-3-ghost-line-mid-drag.png`** — **F6.** The gold dashed line
   across the cabinet's front is the cut it is ABOUT to take, drawn with
   the hand still holding it. Look at where it bends.
4. **`walk-4-cut-cabinet.png`** and **`walk-4b-cut-cabinet-close.png`** —
   the same cabinet, cut, from the owner's own angle.
5. **`f5-carcass-two-slopes.png`** — **the picture of the whole turn.**
   It rises, runs flat, and falls; the two outer roof boards are
   parallelograms with vertical ends; the sides are bevelled under them.
   No drawing in this app had ever shown this shape.
6. **`f5-carcass-knee.png`** — the fault he drew, corrected: the bend is
   at 300 of the 900, where the ceiling bends, and not corner to corner.
7. **`f5-elevation-pentagon.png`** — the door, on paper, as a pentagon.
   T46 printed it as its bounding rectangle.
8. **`walk-5-cnc-sheet.png`** — the sheet. `CUT 67.8°` inside `BUR`,
   `BEVEL 67.8° BOTH ENDS · 5-AXIS` stacked inside `TOP-2`, the `BACK`
   drawn as the real board. Every caption is inside the part it names.
9. **`vertices.txt`** — every corner of every board, at five stations,
   from `computeCabinet()` itself. Blocks 2 and 3 are the same line in
   the two spellings and they are identical character for character.
10. **`hand-audit.txt`** — `L`, `L_MAX`, `β` and the footprint, worked out
    by hand from each segment's two vertices and compared with the
    record; then the oversize, edge by edge, with the mitre's long point
    checked where it stands.

---

## What is owed, and it is written down

**BACKLOG 120 [HIGH]** — the 3-D export for five axes. The roof board's
two ends and the sides' tops are BEVELS THROUGH THE THICKNESS, and a flat
R12 DXF cannot carry one. Tonight the file gets the BLANK plus the
degrees, which the owner accepted in his own words — *"narazie zrob 2D
ale zapisz do cabinet core ze to bedzie zalegle."* What is owed is the
3-D representation, the ANGLED DRILLING that follows from the same fact,
and the decision about the blank on the sheet.

**BACKLOG 121 [MEDIUM]** — relief on the TAB instead of a dog bone in the
socket. Geometry, so the LISP first. Discussed the same night, beside the
roof board that may have no dog bones at all.

**Still owed from T46**, and untouched by choice: the shaker recess on a
cut leaf. CLAUDE.md says a cut leaf stays the plain pentagon T46 left it,
and it does.

---

## The one thing looking at the picture found

The first run of the CNC notes drew them at a fixed size, and
`BEVEL 67.8° BOTH ENDS · 5-AXIS` ran clean across the part beside it on
the sheet — straight through turn 16's own lettering rule. No test caught
it, because no test was looking at the neighbour. The picture did.

They go through `labelBlock` now, with the part's own box, exactly as the
part label does; and a note would rather be SMALL than half-said, because
`+20 - TRI~` is worse than nothing.
