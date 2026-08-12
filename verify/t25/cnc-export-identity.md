# Turn 25 — what moved in the CNC export, and why

**Baseline: the turn-24 merge, `b6fc5c3`.** Every number below is a diff of two
runs of the same scripts against the two checkouts.

---

## The short answer

Four named deltas, and nothing else.

| | delta | what moves |
| --- | --- | --- |
| **F1** | the doubled edge, traced once | `TOP` and `BOTTOM`, and the D/W panel's `PLINTH`. **A re-order: not one point set, not one area, not one entity count.** |
| **F3** | the shaker panel pocket | the FRONTS, one new closed polyline apiece on one new layer |
| **F2** | the shallow cabinet's single joint | **nothing on any default** — every cabinet in the app is 400 mm deep or more. Visible only in the new probes. |
| **F4** | the handle holes | **nothing on any default** — a handle is an input in the design layer and a bare kit call passes none. Visible only in the new probes. |
| **F8** | the drawer box's ceiling | **nothing on any default** — a 770 mm base unit's top box finishes 22 mm below the top panel. Visible only in the new probe. |
| **F9** | the short runners | only the SHALLOW drawer probes, which are the cabinets it exists for |

`fingerprints-turn24-baseline.txt` (3 155 rows) → `fingerprints-turn25.txt`
(4 072 rows): **1 163 changed, 917 added, 0 removed.** Every added row is one of
the five new probe scenarios.

---

## F1 — the doubled edge, and what it cost

`scripts/cnc-delta-probe.mjs` grew an **order-blind** section this turn, and the
whole of F1's claim rests on the difference between its two:

* **GEOM** hashes a part's polys and circles **in order**. It catches a moved
  coordinate, and it cannot tell a re-order from a different board.
* **SHAPE** hashes the sorted point **set** and the enclosed **area** of each
  loop. Both are blind to where a traversal starts and which way it runs, and
  both move the instant a real coordinate does.

Against `b6fc5c3`:

```
GEOM    277 lines moved
          160  TOP and BOTTOM   ← F1's re-order
          117  the FRONTS       ← F3's pocket

SHAPE   117 lines moved
          117  the FRONTS       ← F3's pocket
            0  TOP or BOTTOM    ← F1 moved NOTHING

CENSUS  216 lines, every one an ADDITION of  poly/SHAKER_PANEL_POCKET
            0  on any other layer, and no count on any existing one changed

TEXT      0 lines
```

**Zero SHAPE lines on a carcass board is the proof.** Every `TOP` and every
`BOTTOM` in the probe changed its GEOM hash and did not change its point set or
its enclosed area by a millionth — which is what "the same points, traced once
instead of twice" means as a measurement rather than as a sentence.

`test/turn25-f1-edge-guard.test.js` says the same thing from the other end: it
reconstructs the turn-24 traversal from the same tab helpers, asserts the point
sets and areas match, asserts exactly **one** vertex has gone (the origin, which
the old path visited twice), and asserts the old traversal really was red.

### …and the notched plinth

The same fault, found by the same guard, on `notchedPlinth`. Turn 17 built the
appliance cut-out by dropping repeated **vertices** out of a fixed eight-point
list; where the opening reached both ends of the board — every D/W panel's own —
that left eighty millimetres of each end in the file twice with no two points
equal. Two `01-PLINTH.dxf` fingerprints move (the D/W panel's plinth and its
run's), and the shape is now derived from what is left of the board.

### …and a third thing the guard found

F8's new `+drawers-capped` probe put an `OVEN_BASE` 500 mm high through the
guard, and five panels came back **clockwise**. A 500 mm oven base cannot hold a
595 mm oven, so the opening under its shelf is negative and the drawer boards
were **−152 mm tall** — every one of them on the sheet, laid out, and written
into a DXF as a rectangle traced backwards. It predates this turn: the turn-24
baseline produces it too.

The cabinet has said `OVEN_TOO_LOW` since turn 17; nothing downstream believed
it. `rectGeometry` now returns no outline for a piece of non-positive size, so
`exportablePanels`, the layout, the sheet and the file all drop it by the rule
they already had. **Every part with a real size is byte-identical.**

---

## F3 — the shaker panel pocket

`SHAKER_PANEL_POCKET`, ACI 41, on the FRONT's own sheet, and only on shaker
fronts. Until this turn a front's DXF was an outline and its hinge holes.

**216 census additions, all of them this one layer, and not one existing count
on any other layer moves.** The affected files are the door files (`F`, `FL`,
`FR`, the bay leaves `B1`–`B3`) and the drawer fronts (`F1`, `F2`, `DF2`) —
nothing else in the project.

On the pinned wardrobe of `test/cnc-export-identity.test.js` the census gains
`SHAKER_PANEL_POCKET: 3`. **Three, not four**: that cabinet's bottom drawer
front is 197 mm high, three short of the 200 a 70 mm frame needs, so it is
REFUSED and cut plain with the cabinet carrying the message. A census that said
4 would be a census of an app that clamped.

It is also the first loop this engine has ever cut that lies **wholly inside** a
board, and therefore the first subject of F1.2's winding rule: the outline runs
anticlockwise and the cut-out runs the other way. `pocket.cutout` is the one flag
that says so, honoured by the writer and by the guard.

---

## The three that move nothing on a default

### F2 — the shallow cabinet's single joint

Every unit type in the app defaults to **400 mm deep or more** (WUD is the
shallowest at 400; the rest are 558 or 578). `test/turn25-f2-shallow-joint.test.js`
asserts that per type, so the zero is a fact with a test rather than a sentence.
The new `+shallow-200` and `+shallow-301` probes show the pattern and its
boundary — one millimetre either side of the owner's 300.

### F4 — the handle holes

`project_handle` is an input in the design layer, exactly as the hinge standard
and the runner variant are, and a bare `computeCabinet()` passes none. Asserted
over every available unit type: **no cabinet drills a handle nobody asked for.**
The new `+handles-bar` and `+handles-knob` probes carry the class.

### F8 — the drawer box's ceiling

A 770 mm base drawer unit's top box finishes 22 mm below the top panel, so the
5 mm cap cannot bite. The new `+drawers-capped` probe is a 500 mm cabinet with a
full stack: its top box would stand 4.5 mm under the panel and is cut back to
leave exactly 5.

---

## F9 — the short runners

The only rows that move are the **shallow drawer probes** — `BUDR`, `BUDR2`,
`BUDR4` and `OVEN_BASE` at 200 and 301 mm deep. Every deep unit is
byte-identical, and the property that guarantees it is asserted over every
usable depth from 390 to 900: adding shorter rungs cannot change what the
largest-that-fits is for a cabinet that already had one.

---

## Everything else

| feature | CNC |
| --- | --- |
| F5 doors on a partition | **zero** — `leafCount` is `doorCount` for a face cabinet |
| F6 shelf sleeves | **zero** — a reading of the ⌀7.5 already drilled |
| F7 the four groups | **zero**, and one near miss: the `fronts` EXPORT PRESET read `groupOfPanel`, so widening that group would have put a wall unit's masking board into `…-cnc-fronts.dxf`. Caught by the fingerprint diff — two rows on `WUD+bottom-mask` — and fixed by having the preset ask the piece what it IS |
| F10 – F15 | **zero** — warnings, a key, a menu entry, two dimension toggles and a lens |

---

## How to reproduce

```
git worktree add /tmp/base b6fc5c3
cp scripts/cnc-delta-probe.mjs /tmp/base/scripts/     # the SHAPE section is new
node scripts/cnc-fingerprint.mjs   > /tmp/head-fp.txt
node scripts/cnc-delta-probe.mjs   > /tmp/head-probe.txt
(cd /tmp/base && node scripts/cnc-fingerprint.mjs > /tmp/base-fp.txt \
              && node scripts/cnc-delta-probe.mjs > /tmp/base-probe.txt)
diff /tmp/base-fp.txt    /tmp/head-fp.txt
diff /tmp/base-probe.txt /tmp/head-probe.txt
```

The four files in this folder are those runs:
`fingerprints-turn24-baseline.txt`, `fingerprints-turn25.txt`,
`fingerprints-diff.txt`, and `probe-turn24-baseline.txt` /
`probe-turn25.txt` / `probe-diff.txt`.
