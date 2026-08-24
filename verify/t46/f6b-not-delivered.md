# F6b — the A-A proof shot: NOT DELIVERED, and why

CLAUDE.md, iron rule 1: *"Sacrifice, first to fall: F6b (the A-A drawing proof
of a cut unit — the drawings already draw panels, this is only its
screenshot)."*

It is the first to fall, and it fell. What follows is not an apology, it is the
finding — because the sentence that made F6b look free turns out to rest on a
premise that is not true, and the next turn should know that before it budgets
an hour for a screenshot.

## What was expected

*"nothing new to build — T43's sheets draw panels; the proof is one A-A through
a cut wardrobe showing the pentagon."*

## What is actually there

Two things, and either one on its own is enough.

**1. A vertical section is the ZY projection. The diagonal runs in X.**

`engine/drawings/section.js` is explicit about its own frame (its header, and
`cutCabinet` L101): *"A vertical section is the ZY projection: x runs along the
cabinet's DEPTH with 0 at the wall and +x toward the room, y is height above the
FLOOR."*

Tonight's cut is a line across the cabinet's **WIDTH** — that is what a slope
belonging to a WALL does to a cabinet standing against it, and it is what F2's
"ceilingAt(far edge)", F4's "hinges on the full-height edge" and F5's "the x
where the line meets the rail's y" all describe from three directions. A cut
that runs in X is invisible in a projection that has thrown X away. An A-A
through a cut wardrobe shows the LOWERED TOP and the SHORTER of the two sides —
both real consequences of the cut, both worth seeing — but it cannot show the
pentagon, because the pentagon is not in that plane.

The drawing that *would* show it is the FRONT ELEVATION (the XY projection).
Which brings the second thing.

**2. The sheets draw panel BOXES, not panel OUTLINES.**

`engine/drawings/frontElevation.js` L343:

```js
...rect(style.layer, p.box.x, p.box.y, p.box.w, p.box.h),
```

Every piece on an elevation is a RECTANGLE assembled from the panel's box. The
outline — the thing that carries the five corners this turn cuts — is never
read. So even in the right projection, a cut door would print as its bounding
rectangle. Teaching the elevation to trace `p.cnc.outline` is a real change to
the drawings system, and CLAUDE.md's own "What this turn does NOT touch" list
names *the drawings system's code*.

## So what IS proved tonight

The cut is in the panels, and it is asserted to the vertex:

* `verify/t46/f3-vertices.txt` — the corners of every cut board, from
  `computeCabinet()` itself, at two stations (a trapezium one and a pentagon
  one).
* `verify/t46/f3-cut-carcass-panels.png` and `f4-cut-door-3d.png` — the 3-D,
  which renders the pentagon because F6a taught `3d/panelSolid.js` to clip with
  the ENGINE's own line (`panel.cnc.slopeCut`) rather than with a diagonal of
  its own.
* `test/turn46-f3-the-engine-cuts.test.js` and
  `test/turn46-f4-option-a-the-front-is-cut.test.js` — the vertices, in the
  suite.

## What the next turn needs

One sentence, and it is small: **the elevation traces the panel's outline where
it has one, and its bounding rectangle where it does not.** One `if` in
`frontElevation.js`, one in `partDetail.js`, and the pentagon is on paper — in
the projection that can hold it. It is a drawings turn, and it is an hour, not
a screenshot.
