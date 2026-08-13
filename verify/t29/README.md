# verify/t29 — the proofs of turn 29

**Baseline: `13978f8`, main after the PR #28 merge. Suite at that commit:
2 276 tests, 2 276 pass. Suite at the end of this turn: 2 325 tests, 2 325 pass,
from `rm -rf node_modules && npm install`.**

Five phases: the two the owner's eye caught, the two laws he asked for while
walking, and the hinge fold whose axis was measured overnight.

| | | |
| --- | --- | --- |
| **F1** | shelf grain in 3-D, on the shelf the eye sees | CRITICAL |
| **F2** | the dimension language, the two halves that did not land | CRITICAL |
| **F3** | the D/W's front and plinth join the standard controls | HIGH |
| **F4** | dimension typography: a third bigger, half the weight | HIGH |
| **F5** | the hinge folds about its measured axis | HIGH |

---

## THE CNC EXPORT DID NOT MOVE

CLAUDE.md predicted it and it is proved rather than asserted: **every phase this
turn is scene or UI, and the export is byte-identical.**

| file | |
| --- | --- |
| `fingerprints-turn28-baseline.txt` → `fingerprints-turn29.txt` | 4 719 rows either side. **`fingerprints-diff.txt` is EMPTY.** |
| `probe-turn28-baseline.txt` → `probe-turn29.txt` | 7 848 rows either side — GEOM / SHAPE / TEXT / CENSUS. **`probe-diff.txt` is EMPTY.** |

Both were produced by running the very same scripts in a worktree at the
baseline commit and on this branch. Zero changed rows, zero added, zero
removed — on any kit, any preset, any layer.

That is not free. F3 changes what a D/W is MADE OF by default and how it is
switched on, and it comes out at zero because the composition it arrives with is
turn 28's own: the same three pieces, reached through the ordinary door control
instead of through a wire. The one drilling that DID move is six ⌀5 plate holes
addressed to a `BUL` a D/W does not cut — they never reached a DXF, because a
hole in a board that is not exported is not in the export, and they are gone.

---

## THE WALK

`walk.json` — **23 ok · 0 failed · 1 blocked.** Run against a real Chromium
through CDP (`scripts/e2e-turn29.mjs`), on the production build served by
`vite preview`.

* **R1** every pointer move and keystroke is `Input.dispatchMouseEvent` /
  `dispatchKeyEvent`. The ban on synthetic DOM events is enforced by a guard at
  the top of the walk that reads its own source and refuses to run. F3 is the
  phase this matters most for and it presses the app's own two buttons — "Remove
  doors", "Remove", "Add plinth", "Add doors" — with a real mouse.
* **R2** `bucket-live.json` — the live bucket, asked first and before any
  picture of hardware. **BLOCKED**: this session's egress policy answers 403 for
  the storage host, and the proxy's own answer is recorded verbatim. Same
  blocker as turns 22–28. It is not incidental to F1 — see below.
* **R4** nothing below is inferred from a pixel. **F1 measures the MOUNTED
  SURFACE**: the texture the material is really carrying is drawn into a canvas
  and its anisotropy measured, its own UV matrix is inverted, and the geometry's
  own uvs and world positions turn the result into a direction in the room. F2
  and F4 read the sprites the one dimension component mounted — the strings they
  draw and the height they draw them at. F3 reads the record, the CSV and the
  scene after each click. F5 reads both hinge members' world positions off the
  scene graph at three angles on both hands.
* **R5 + R6** `console.txt` — every message the app printed across the whole
  walk. **Zero uncaught exceptions, zero React error-boundary reports** — either
  would have failed the step it appeared in. The storage host's own 403 is
  filtered, with the reason written beside the filter: it is R2's blocker,
  recorded above, and it is the condition F1 is about.
* **R7** no `data-*` on an R3F object. The scene is found by `userData` —
  `ccPanelId`, `ccDimensionChain`, `ccDimensionText`, `ccHingeMember`.
* **R8** the silent showroom (`test/fixtures/hardware-local/`), pointed at
  through the documented `localStorage['cc.hardwareBase']` knob — and its hinge
  now carries a KNUCKLE at the measured pin, so the rig math is asserted on real
  geometry rather than on an assertion about geometry.
* **R9** F3 asserts the SCENE stops drawing a piece the moment it is switched
  off, and starts again when it is switched back on.
* **R11** every dimension in the scene is still found by traversing for
  `ccDimensionChain` — one component, one type, one plate.

---

## THE PICTURES

**The walk's own**, in its order:

| | |
| --- | --- |
| `1a-the-grain-runs-front-to-back-on-every-shelf.png` | the owner's own arrangement re-built: two OPEN carcasses, wood decor, and the figure running front-to-back on all four shelves |
| `1b-one-shelf-from-above-front-to-back.png` | one shelf, with the cabinet's front edge in frame — which is what makes "front to back" a direction and not a word |
| `2a-a-run-of-three-dimensions-once-100-and-770.png` | three identical base units: ONE 600 on the floor, ONE 100 and ONE 770 stacked on one vertical line at the run's outer end |
| `2b-a-different-cabinet-breaks-the-run.png` | 600 · 900 · 600 — three chains, three widths |
| `3a-the-dishwasher-with-its-front-removed.png` | after a real click on "Remove doors" |
| `3b-both-off-the-rail-is-the-only-fixed-piece.png` | and on "Remove": one board left, and the panel reading "not fitted" / "NONE YET" beside it |
| `3c-and-back-again-with-the-same-buttons.png` | "Add plinth", "Add doors" — piece for piece, area for area |
| `4a-the-dimension-type-a-third-bigger-half-the-weight.png` | |
| `5a-a-door-mid-swing-with-the-hinge-folded.png` | both leaves at 60°, three hinges on each: the arm lying along the carcass side rather than standing square off the door |
| `5b-the-hinge-row-close-cup-on-the-leaf-arm-at-the-plate.png` | the same row, close |

**The before/after pairs** — `before/` and `after/`, four pictures apiece, one
scene, one camera, two builds of the app (`scripts/t29-before-after.mjs` run
against the baseline's `vite preview` and this branch's, both pointed at the
same silent showroom):

| | before | after |
| --- | --- | --- |
| `f1-shelves.png` | the figure running LEFT–RIGHT across every shelf — the owner's screenshot — and, in the same frame, a single `770` drawn from the floor on every cabinet | front-to-back on every shelf, and the run's numbers once |
| `f2-chain.png` | three identical cabinets, three identical chains, `770` each and no `100` anywhere | one chain, on the outermost, `100` and `770` on one line |
| `f4-type.png` | turn 25's type | a third bigger, half the weight |
| `f5-hinge.png` | the arm swung out with the leaf, its knuckle 25 mm from the cup's | the arm at the carcass's own attitude, jointed to the cup |

---

## THE MEASUREMENTS

`measurements.json` — every number the walk read, in the order it read them.

**F1** is the one worth reading. For the shelf, the wieniec and the side it
records the mounted texture's file, its pixel size, the anisotropy measured on
its own pixels (`imageDu` / `imageDv`), which axis of the IMAGE the grain runs
along, the quarter turn the material is carrying, the repeats, and the resulting
grain direction in the ROOM as a unit vector. The shelf comes out:

```
imageAxis "u"   0.401 along U against 2.661 across it
rotationDeg 90
axis "z"        vector [0, 0, ±1]
```

— the picture's own figure runs along its width, the material turns it a quarter
turn, and what lands on the board runs front to back. The wieniec above it comes
out `x` with no turn at all, and the side `y`. Three pieces, one rule.

**F5** records, per hand and per angle, both members' knuckle in world, the
arm's world quaternion, the leaf's, the fold, and the pin. The knuckle gap is
**0.000 mm** at 0°, 45° and 110° on both hands; the arm's attitude is **0.000°**
from its shut one at every angle; the fold is the leaf's own angle and stops at
110°.

---

## WHAT THIS TURN LEARNT, AND IT IS THE SAME LESSON TWICE

Turn 28's F7 and F8 were green and wrong. Both asserted a FLAG on the way to the
picture instead of the picture, and this turn found that the flag was not even
the fault:

* **F1.** `decorMapping` returned `rotate` — a decision about an IMAGE — from a
  function that has never been shown one. The app paints TWO families of wood
  and they are 90° apart: EGGER's board scan is portrait, 2 800 mm down a 7 937
  px image, its figure running down its own V; our procedural grain runs along
  its U. Turn 8 wrote one rule and it fits the scans. So every panel wearing the
  FALLBACK — which is every panel on any machine that cannot reach the bucket,
  including this one and, on the evidence of his screenshot, the owner's — was
  exactly 90° out. `decorMapping` states the BOARD's axis now and the quarter
  turn is decided where the finish is.
* **…and the fallback did not even arrive.** Found by the walk, on the machine
  rule 7 is written for: when the scan fails, the failure re-renders the panel,
  the panel asks for the fallback's texture, the fallback has only just started
  loading, and NOTHING was listening for it. The board stayed blank until
  something else in the app happened to touch it. Both urls are subscribed now.
* **F2.** Turn 28 taught the run rule and the two-segment chain to
  `fullDimensions` — the RIGHT-CLICK chain. The chain "Show dimensions" draws is
  forty lines further down the same file and had neither correction.

---

## WHAT THIS TURN DID NOT SETTLE

**The one-joint hinge costs something, and the number is written down.** A
single revolute joint cannot hold both ends of the arm: the leaf turns about its
own hinge line, not about the pin, so the knuckle travels on an arc and whatever
is bolted to it travels too. This rig holds the KNUCKLE — the joint a joiner is
looking at — and lets the tail drift. **At 110° the arm's rear stands 54.6 mm
from the plate** (`test/turn29-f5-hinge-fold.test.js` measures it and asserts
it, on both hands). The alternative holds the tail and tears the hinge in half
on screen, which is what turn 24 shipped. The real answer is Blum's four-bar and
nobody here has that geometry.

**The true-file visual check is still owed.** R8's showroom proves the RIG — the
node names, the pin, the mirror, the fold, the cap — on synthetic geometry cut
to the real file's measured box. It cannot prove that `71B3550_42542984.glb`'s
own arm looks right folded about that line, because this session's egress policy
will not fetch it. That check happens in chat, on the owner's screen, after the
merge. Said here rather than pretended.

**BLOCKERS #95 is unchanged** — the nester still lays a shelf down by its drawn
size while the piece states its grain, and turn 29 touched neither.
