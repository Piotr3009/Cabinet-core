# verify/t27 — the proofs of turn 27

**Baseline: the turn-26 merge, `8c0ece5`. Suite at that commit: 2 141 tests,
2 141 pass. Suite at the end of this turn: 2 184 tests, 2 184 pass.**

A SHORT turn, deliberately: four phases, three of them faults that reach the
workshop and one a colour the assistant changed without being asked. None of
them shrank.

| | | |
| --- | --- | --- |
| **F1** | a shelf drills the two boards that carry it | CRITICAL |
| **F2** | the dishwasher stops being a species of its own | HIGH |
| **F3** | the shaker recess has walls | HIGH |
| **F4** | the dimensions go back to black | MEDIUM |

---

## The reports

| file | what it says |
| --- | --- |
| **`cnc-export-identity.md`** | every delta in the export, named, with the entity-level evidence behind each — and the eleven of twelve golden defaults that did not move a hundredth. |
| **`dimensions-colour.md`** | F4.3 — the turn-25 look beside the turn-27 look, same project, same cabinet, same camera, from two builds of the app. |

## The fingerprints

| file | |
| --- | --- |
| `fingerprints-turn26-baseline.txt` → `fingerprints-turn27.txt` | 4 072 → 4 794 rows. **68 changed, 727 added, 5 removed.** Every changed row is `DW_PANEL`. |
| `probe-turn26-baseline.txt` → `probe-turn27.txt` | 7 845 → 8 020 rows, GEOM / SHAPE / TEXT / CENSUS. **Not one line of the diff is on any type but `DW_PANEL`.** |
| `shelf-hole-move-turn26-baseline.txt` → `shelf-hole-move-turn27.txt` | F1's move itself, hole by hole, in five arrangements — the one the fingerprint reports as an ADDITION because turn 26's probe set never built it. |
| `probe-diff.txt`, `shelf-hole-move-diff.txt` | the diffs themselves, committed so the classification can be re-checked without a checkout |

**Two named deltas and no third thing.** F1's ⌀7.5 ladder leaves the board the
shelf never touches and appears in the partition, in the partition's own frame —
**zero on every golden default**, because a cabinet with no partition resolves
both bearers to `BUL` and `BUR` and comes out byte-identical. F2's unification
is confined to `DW_PANEL`. F3 and F4 move no CNC entity at all.
`cnc-export-identity.md` is the argument, and it says in as many words that the
holes which left `BUL` were **wrong to have been there**.

## The walk

`walk.json` — **19 ok · 0 failed · 1 blocked.** Run against a real Chromium
through CDP (`scripts/e2e-turn27.mjs`), on the production build served by
`vite preview`.

* **R1** every pointer move and keystroke is `Input.dispatchMouseEvent` /
  `dispatchKeyEvent`. The ban on synthetic DOM events is enforced by a guard at
  the top of the walk that reads its own source and refuses to run.
* **R2** `bucket-live.json` — the live bucket, asked first and before any
  picture of hardware. **BLOCKED**: this session's egress policy answers 403 for
  the storage host, and the proxy's own answer is recorded verbatim. Same
  blocker as turns 22–26; nothing in this turn depends on it.
* **R4** nothing below is inferred from a pixel. F1 asks
  `window.__ccT27.shelfBearers` — the very resolution the drilling pass and the
  dimension chain both go through — and `hoverRows`, the very rows the scene
  draws. F2 reads the drop front's live rotation off the SCENE GRAPH. F3
  measures the mounted tray's own triangles, in the running WebGL, against the
  normals they carry. F4 reads the palette out of `dimensionStyle`, the call the
  component makes.
* **R5 / R6** `console.txt` — every message of the whole walk. **Zero uncaught
  exceptions and zero React error-boundary reports**; any would have failed the
  step it appeared in.
* **R8** the silent showroom on `127.0.0.1:4174` — synthetic GLBs at the real
  measured dimensions, no Blum bytes.
* **R11** every dimension in the scene is found by traversing for
  `ccDimensionChain`; there is still exactly one component drawing them.
* **R12** F4 restores the pre-turn-26 paint and changes nothing else.

`measurements.json` carries every number the walk read, so a claim can be
re-checked without re-running it.

## The pictures

| file | what it proves |
| --- | --- |
| `1a-a-shelf-between-bur-and-a-partition.png` | F1 — the owner's own cabinet from the eye test: a partition at 450, a shelf in the bay between it and `BUR`. |
| `1b-the-partitions-sheet-has-the-holes.png` | F1 — the partition's own sheet, `SHELVES_7_5MM × 6` in its layer list. |
| `1c-and-buls-sheet-has-none.png` | F1 — `BUL`'s sheet beside it. Its layer list is `OUTLINE`, `PUZZLE_DOG_BONES`, `PUZZLE_SOCKET`, `PUZZLE_HOLES_7_5MM`, `SCREWS_3MM`, `HINGES_5MM` — **there is no `SHELVES_7_5MM` row on it at all.** |
| `2a-a-dw-front-with-a-shaker-and-a-handle.png` | F2.2 — a D/W front wearing everything a front wears. |
| `2b-a-dw-dropped-open-at-45-from-the-side.png` | F2.1 — from the SIDE, which is what proves the sign: the leaf falls FORWARD out of the run, not back into the carcass. |
| `3a-the-shaker-recess-at-a-grazing-angle.png` | F3.3 — the rebate reading as a rebate along a run of doors. |
| `3b-the-shaker-recess-from-behind.png` | F3.3 — the door swung open and seen from behind, which is the one that proves there is no hole. |
| `4a-the-dimension-labels-after-f4.png` | F4 — the restored plate, photographed inside the walk on furniture rather than on a bare box. |
| `4b…-before-f4.png` / `4c…-after-f4.png` | F4.3 — the two builds, same camera. See `dimensions-colour.md`. |

## The scripts

| file | |
| --- | --- |
| `scripts/e2e-turn27.mjs` | the acceptance walk |
| `scripts/t27-dimensions-colour.mjs` | F4's before/after, driving two builds through one script |
| `scripts/t27-shelf-hole-move.mjs` | F1's move, hole by hole; runnable against any checkout |

---

## What this turn did NOT do

CLAUDE.md's OUT OF SCOPE list, untouched and gathered for turn 28: the hinge
fold, shelf grain in 3-D, rings without a collar on ⌀3/⌀5, the sleeve colour
governing rings and pins, a second brightness slider, the layer list on the
editor toolbar, and hinge drilling entering from the wrong side.

One thing F2 raises and does not settle is **BLOCKERS #94**: whether the D/W
carcass has a bottom under a machine that stands on the floor. CLAUDE.md F2.1
names the bottom, so the bottom is cut; the question of whether it should be
there is the owner's and is asked in his own terms.
