# F1 — the duplicate-edge and winding guard

**Turn 25 · CLAUDE.md F1 [CRITICAL] · `src/engine/cnc/edgeGuard.js` ·
`test/turn25-f1-edge-guard.test.js`**

---

## The post-mortem, in two sentences

The owner found an edge drawn **twice** in a polyline in his own AutoLISP:
VCarve does not read a doubled edge as one line seen twice — it offsets the two
coincident paths in **opposite** directions, so the cutter takes the panel from
the outside *and* from the inside on the same run and the board goes in the
skip. He corrected `panel_joints.lsp` at his end; this guard exists so that no
future turn can ship the same fault out of the JavaScript side, which is why it
is wired into `npm test` rather than into a script somebody has to remember to
run.

---

## What is checked

| Check | What it means |
| --- | --- |
| **one closed polyline** | the outline is a single loop, written with the R12 closed flag, that never returns to a point it has already visited |
| **no dangling end** | the first point is not repeated as the last — that repeat is a zero-length closing segment |
| **no zero-length segment** | no two consecutive points are the same point |
| **no segment twice** | no two segments trace the same two points, in **either** direction, on the same layer |
| **no overlapping run** | no two **collinear** segments share more than a point. Half an edge drawn twice cuts the board exactly as badly as a whole one |
| **winding** | the outer outline runs **anticlockwise**; a loop lying wholly inside it — a cut-out — runs **clockwise** |

Two segments that merely **cross at a corner** share exactly one point and are
not a fault: every tab profile in this engine is corners, and a guard that
called a shared *point* an overlap would be red on every side panel in the
project.

### Tolerance

**0.01 mm**, one number (`EDGE_TOLERANCE`), used for every comparison the guard
makes — point identity, collinearity, and the length of a shared run. It is a
hundredth of a millimetre: a tenth of the finest thing the machine holds, and
far below anything the engine rounds to (`roundTo(…, 4)` on every drill).

### The winding convention, and why it is a check and not a preference

Anticlockwise outer, clockwise cut-out — matching the owner's corrected LISP.
This is not a tidiness rule. **It is the signal VCarve reads to know which side
of the line the material is on**: the same closed path with its direction
reversed is the same shape and the opposite cut. An outline that runs the wrong
way is a panel machined to its own outside.

Today the engine cuts **no interior cut-outs at all** — every pocket it emits
(a socket, a dog bone, a runner groove, a hanger hole) deliberately runs *past*
the board's edge so the cutter enters and leaves off the work, which makes it a
piece of the profile rather than a hole. The clockwise half of the rule is
therefore asserted on the guard's own fixtures and stands ready for the first
loop that lies wholly inside a board — which, in this turn, is F3's shaker panel
pocket.

---

## What it found

Two faults, both real, both shipping since the turn they were written.

### 1 · The TOP and the BOTTOM — every cabinet, every turn since turn 3

`engine/puzzle.js → topPanelGeometry` traced the outline like this:

```
[0,0] → [drawnW,0]         the bottom edge, PLAIN, straight across
      → [drawnW,drawnH]    up the right
      → tabs across the top
      → tabs down the back to
[0,0]                      …back at the START, mid-polyline
      → tabs along the bottom edge, LEFT TO RIGHT
      → (closed flag)      and a long run back to [0,0] again
```

The bottom edge was in the file **twice**: once as one straight segment at the
head of the polyline, and once as the tabbed run at its tail. Every `TOP` and
every `BOTTOM` this engine has ever exported carried it — the fault the owner
found in his LISP, in our JavaScript, on the two most common parts in the
project.

**The fix is a re-order and nothing else.** The same points, in one traversal
that goes round once, anticlockwise, with the bottom edge walked *with its tabs
on it* where it always belonged. `test/turn25-f1-edge-guard.test.js` reconstructs
the turn-24 traversal from the same tab helpers and proves three things about
it: the point **set** is unchanged, the enclosed **area** is unchanged, and the
old traversal really was red.

Exactly **one vertex** goes: the origin, which the old path visited twice.

### 2 · The notched plinth — every D/W panel

`engine/cabinet.js → notchedPlinth` (turn 17) built the appliance cut-out by
dropping repeated **vertices** out of a fixed eight-point list. That is the
right instinct aimed at the wrong thing — a repeated point is only the visible
half of the fault. Where the opening reached **both** ends of the board, which
is every D/W panel's own plinth because there the appliance opening *is* the
whole length, de-duplicating the corners left a path that walked the left edge
up to the notch, across, **down** the right edge to the bottom, then back **up**
the right edge to the top, across, and down the left edge again. No two points
were equal, and eighty millimetres of each end was in the file twice.

The shape is now derived from what is actually **left** of the board, and there
are four of those: a strip, two L's, and the ordinary notch-in-the-middle. The
test checks the enclosed area of each against `board − opening` — so the fix cut
the right shape and not merely a legal one.

---

## Panels checked

Every panel with a real outline, in:

* **every probe scenario** — `scripts/cnc-scenarios.mjs`, 192 cabinets across
  every unit type (plain, plinth, plinth-run owner and member, shelves,
  partitions, partition doors, bottom mask, infills, mitred infills, fix
  shelves, fix shelf in a bay, adjustable shelves, and this turn's additions).
  The list was extracted from `scripts/cnc-fingerprint.mjs` into a module this
  turn precisely so that "every scenario" has one definition and the guard and
  the fingerprint report cannot disagree about it.
* **every golden case** — all `fixtures/golden-*.json`, each case's `inputs`
  laid over its type's defaults.

That is **5 700+ outlines** per run. The sweep asserts its own reach
(`panels > 1000`) so a refactor that quietly stopped feeding it geometry fails
instead of passing.

The guard also proves it is wired to the real data: one test takes a real side
panel off a real cabinet, doubles one of its edges, and asserts the sweep goes
red.

---

## What the fix cost, entity by entity

`scripts/cnc-delta-probe.mjs` grew an **order-blind** section this turn.
`GEOM` hashes a part's polys and circles *in order* — it is what catches a moved
coordinate, and it cannot tell a re-order from a different board. `SHAPE` hashes
the sorted point **set** and the enclosed **area** of each loop, which are both
blind to where a traversal starts and which way it runs.

Run against the turn-24 merge (`b6fc5c3`) and diffed
(`verify/t25/probe-diff.txt`):

```
160  GEOM   lines changed   — every TOP and every BOTTOM in the probe
  0  SHAPE  lines changed   — not one point set, not one area
  0  CENSUS lines changed   — not one entity count on any layer
  0  TEXT   lines changed   — not one label
```

The fingerprint report (`verify/t25/fingerprints-diff-f1.txt`) says the same
thing at file level: `TOP`, `BOTTOM`, and the two `PLINTH` files of the D/W
panel; the `all` and `non-sprayed` sheets that carry a carcass; and the
`sprayed` sheet only for the D/W panel, whose plinth is a sprayed part. The
`fronts` sheets do not move at all — a fix that had touched a door would be a
fix that is not what it says it is.

---

## Why it cannot rot

* It is a **test**, in `test/`, picked up by `npm test`. No separate script, no
  step in a checklist.
* Its scenario list is the **same module** the fingerprint report is taken over,
  so adding a probe adds it to both.
* Its thresholds are not knobs: one tolerance, one convention, both asserted by
  name in tests of their own.
