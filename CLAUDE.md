# CLAUDE.md — TURN 46 · THE SLOPE BECOMES REAL: WALLS CLOSE, UNITS ARRIVE, AND THE CABINET IS CUT ON THE SLOPE

The owner, 24.08.2026, screenshot in hand: *"sufit się ścina, ale
ściana już nie — nie łączy się. I mebel pozwala się na dojechanie do
skosu. Przecież to nie ma sensu."* And his four decisions, same night,
verbatim law: **option A — "tniemy po skosie"** (the door itself is cut
on the slope, and there is NO hinge-side choice: *"brak wyboru
otwierania, musi być od skosu"*); **minimum 400 mm**; interior rules as
proposed; **scribe gap = the project's infill** (*"jak ustawimy infill
40 to 40"*). One night, the whole thing — his order.

## The slope, in numbers (one definition, used everywhere)

A slope on wall `i`: `{ side: 'L'|'R', startHeight, run }` from
`project.wallSlopes` (T44-F1 schema, normalised by
`lib/wallElements.js`). The ceiling line over the wall's x axis:
full `room.height` until the run begins, then linear down to
`startHeight` at the wall's end. `ceilingAt(x)` is THAT function — write
it ONCE (`lib/slopeLine.js` or beside `wallElements`), and every
consumer below imports it. Two independent lerps in two files is the
two-chain disease and fails the turn.

## Iron rules (binding)

1. **Zero-stop overnight.** PR before morning regardless. Sacrifice,
   first to fall: F6b (the A-A drawing proof of a cut unit — the
   drawings already draw panels, this is only its screenshot), then
   F5-polish (drag ghost line). **F1–F5 core never fall.**
2. **BYTE-IDENTITY.** All engine work is GATED on a `slopeCut` input no
   config carries: `t46-classify` — six IDENTICAL, UNNAMED=0. If one
   moves, the gate leaks: stop, note.
3. **LISP IS LAW — FIRST.** The slope edge cut is born in
   `reference/lisp/`: one shared routine (SKYLON_COMMON) that trims a
   side panel's top corner on a diagonal, called from
   `KIT_WARDROBE_FULL` and `KIT_BUDTALL_FULL`. Other kits untouched —
   say so in the PR. Paren balance 0/0 by script. The application
   follows the LISP, never the reverse.
4. **Sanctity.** Nothing deleted. My own chat-fix error is REPAIRED by
   name: `Room.jsx` gave stubs `slopes=[]` (23.08) — that line changes,
   nothing else about it.
5. **Modals draggable, beside. English copy. No new deps. Suite never
   --silent. One commit per feature. Probes `verify/t46/`, real pointer
   input.**

---

## F1 [CRITICAL] — the wall closes: the stub honours the slope

The return stub at the slope's low end is `startHeight` tall, not
`room.height` — `Room.jsx` passes the wall's slopes to stubs and the
stub's own outline is cut by the SAME `ceilingAt` (a stub is a fragment
of its wall; it inherits the wall's line over its x range). The gap in
the owner's screenshot dies.

Proof: `f1-wall-and-stub-meet.png` (the exact camera of his shot).

## F2 [CRITICAL] — arrival law: clamp + minimum 400

- Dragging a unit along a sloped wall: the unit MAY enter the slope
  zone (that is the point of this turn) **down to the station where
  `ceilingAt(far edge) − infill ≥ 400 + legs`**. Past that: hard stop.
- A unit standing where its FULL height no longer fits is not an
  error — it is a CUT unit (F3). A unit pushed past the 400 floor is
  refused with a red Check: `Unit under slope minimum (400 mm)`.
- The scribe gap to the sloped ceiling is **the project's infill
  value** — one number, the one the owner already sets.

Tests: clamp station computed and asserted for the fixture slope;
the Check fires and clears. Proof: `f2-clamp-and-check.png`.

## F3 [CRITICAL] — the engine cuts the carcass (gated, LISP-shaped)

`paramsForEngine` hands the unit a `slopeCut` — the ceiling line in
UNIT-LOCAL x (two points), already minus infill — only when the unit
stands in a slope zone. In the engine, gated on it:

- **Sides**: the side whose x sits under the diagonal becomes a
  PENTAGON — vertical front edge full? No: vertical edge at the LOW
  end equals the cut height there, the top edge is the diagonal, the
  tall edge keeps full height. Emit the shape the way the CNC editor
  already understands cut paths (the LISP routine of rule 3 is the
  mirror of this cut).
- **Top board**: sits level at the LOW end's height minus nothing —
  the top drops to the height of the lowest cut side, full depth; the
  triangle above it is CLOSED by the sloped edges of the two sides
  and the front (option A) — no extra roof board this turn.
- **Back**: cut on the same diagonal.
- **Fingerprints**: every cut panel's fingerprint carries the cut, so
  T41's suite law keeps holding.

Tests (the thing): a WARDROBE with a fixture `slopeCut` → the panel
list holds pentagon sides with the asserted vertices, a lowered top,
a cut back; WITHOUT `slopeCut` → byte-identical to today (the gate).
Proofs: `f3-cut-carcass-panels.png` + `verify/t46/f3-vertices.txt`.

## F4 [CRITICAL] — option A: the front is cut on the slope

The owner's law, verbatim: *"tniemy po skosie, brak wyboru otwierania,
musi być od skosu."*

- The door over a cut opening is a PENTAGON — cut on the same
  diagonal, minus the standard gaps along every edge including the
  diagonal one.
- **Hinge side is FORCED — no user choice**: hinges live on the
  full-height edge, the door opens from the slope end. The hinge-side
  control disappears for a cut door (grey with the one-line reason).
  Hinge count comes from the tall edge's height through the EXISTING
  chain (T41-F4's column law) — the diagonal edge never carries a
  hinge.
- Shaker on a pentagon: the frame follows all five edges (mitred at
  the diagonal); `shakerFits` decides at the threaded frame as ever —
  too small stays plain.
- Drawer fronts: **forbidden in the slope zone** (interior law, F5) —
  the engine refuses a drawer stack whose top would cross the line,
  red Check names it.

Tests: pentagon front vertices asserted; hinge drills only on the tall
edge; the hinge-side control locked in the UI. Proofs:
`f4-cut-door-3d.png`, `f4-hinge-forced.png`.

## F5 [HIGH] — the interior obeys the line, live

- Shelves exist only where their FULL span sits below the cut line
  (a shelf may not pierce the diagonal). The rail (ALONE or assembly)
  shortens exactly as the bay law already cuts it at partitions —
  here the boundary is the x where the line meets the rail's y; below
  the meeting point the rod ends. Drawers: forbidden in the zone
  (F4).
- **Live**: drag end re-runs the engine (the same pos_mm path every
  drag uses) — the cabinet re-cuts itself as it arrives under the
  slope. During the drag, a ghost line shows the cut-to-be
  (sacrificable polish, rule 1).

Tests: shelf beyond the line refused with the Check; rail length at a
fixture station asserted. Proof: `f5-live-recut.gif-or-png`.

## F6 [HIGH] — the paper and the eyes

- **F6a** 3D: the room already tells the truth (F1); the cut cabinet
  renders from the engine's own panels — no scene-side twin geometry.
- **F6b** Drawings: nothing new to build — T43's sheets draw panels;
  the proof is one A-A through a cut wardrobe showing the pentagon.
  (First to fall, rule 1.)

Proofs: `f6a-room-with-cut-unit.png`, `f6b-section-cut-unit.png`.

---

## Execution order

F1 → F2 → LISP(rule 3) → F3 → F4 → F5 → F6. One night, the whole
thing — the owner's order. Sacrifice only per rule 1.

## What this turn does NOT touch

The six configs' bytes. Kits other than WARDROBE/BUDTALL. The wizard
(T45). The drawings system's code. Runners' catalogue. The rail's T42
model. `cc_*` schema — **no SQL this turn**.

## Morning audit will run

Fresh clone → suite → build → t46-classify (six IDENTICAL) → LISP diff
limited to the shared routine + two kits, paren 0/0 → the gate audit
(no `slopeCut`, no change — byte-proved) → vertex probes re-run → every
screenshot LOOKED AT, the owner's own camera angle first → verdict →
the numbered eye-test list.