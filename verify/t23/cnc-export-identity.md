# CNC export identity — turn 23

> **Rule 7 / rule 0.** The DXF a machine cuts is the contract. A turn either
> moves nothing, or it names exactly what it moves and why.

Turn 23 moves **two classes, both on the vertical partition, and nothing else**.

* **F5 — a SUBTRACTION.** The partition loses the biscuit set turn 13 gave it.
* **F6 — an ADDITION.** The BACK gains one screw line per partition.

Everything else in the app this turn — the navigation stack (F1), the hinge
parenting (F2), the black cylinder (F3), the finishes (F4), the detail zoom
(F7), the hover dimensions (F8), the per-part overrides (F9) and the partition
position field (F10) — writes **zero** CNC delta, and that is proved below
rather than promised.

---

## The evidence, and how to reproduce it

| file | what it is |
| --- | --- |
| `fingerprints-turn22-baseline.txt` | `node scripts/cnc-fingerprint.mjs` on the turn-22 baseline. **Byte-identical to `verify/t22/fingerprints-turn22.txt`** — which is itself the check that F1–F4 moved nothing. |
| `fingerprints-turn23.txt` | the same script on this branch |
| `fingerprints-diff.txt` | the diff of the two |
| `probe-turn22-baseline.txt` | `node scripts/cnc-delta-probe.mjs` on the baseline — every entity of every per-panel file and every preset sheet, by type and layer |
| `probe-turn23.txt` | the same on this branch |
| `probe-diff.txt` | the diff — the entity-level evidence, which is what a fingerprint cannot give |

```
git worktree add /tmp/base <turn-22 commit>
node scripts/cnc-fingerprint.mjs > /tmp/head.txt
(cd /tmp/base && node scripts/cnc-fingerprint.mjs > /tmp/base.txt)
diff /tmp/base.txt /tmp/head.txt
```

`scripts/cnc-delta-probe.mjs` gained three **partition probe** cases this turn
(`+partition`, `+partition-on-shelf`, `+partitions-2`). It had none, and a probe
that only ever builds an undivided box would have reported "no change" for a
subtraction and an addition. The baseline was re-run with the same probe file so
the two runs ask the same questions.

---

## The headline numbers

```
fingerprint rows total                     2766
fingerprint rows changed                    217
cases changed                                36   ← every one of them a partition case
NON-partition cases changed                   0   ← the golden defaults: ZERO
```

Every distinct entity class that moved, across the whole probe:

```
130  circle/SCREWS_3MM     ← F5 removes some, F6 adds others
 72  poly/BISCUIT_4MM      ← F5 removes ALL of them
```

Two classes. No third.

---

## F5 — the partition loses the borrowed biscuits

### The LISP line that justifies it

```lisp
(defun drawWDR_PARTITION_PANEL (x0 y0 szerW wysW unitNum / midX midY)
  (setq midX (+ x0 (/ szerW 2.0)) midY (+ y0 (/ wysW 2.0)))
  (drawRect "OUTLINE" x0 y0 (+ x0 szerW) (+ y0 wysW))
  (drawText "UNIT_NUMBER" midX midY 40.0 (strcat unitNum "-PARTITION PANEL")))
```
`reference/lisp/KIT_WARDROBE_FULL.lsp` **L254-257**

An outline and a label. No biscuits, no end drilling. And a sweep of the whole
of `reference/lisp/` finds **no kit that names a `BISCUIT_4MM` layer at all** —
the set is entirely an invention of turn 13, made in good faith as the answer to
BLOCKERS #59 and applied to a part the LISP never gave one.

### What is removed

Both halves of the joint, because the joint is not made this way:

| where | entity | class |
| --- | --- | --- |
| `TOP` / `BOTTOM` / a carrying `SHELF` | 2 or 4 × ⌀3 through-screws per joint | `circle/SCREWS_3MM` |
| the same | the 70 mm biscuit mark between each pair | `poly/BISCUIT_4MM` |
| `VPART-n` | the set-out mark transferred onto its own end | `poly/BISCUIT_4MM` |

`poly/BISCUIT_4MM` therefore falls to **zero everywhere**, and it is the only
class in the app that does.

### What is NOT removed

* `engine/biscuits.js`, `profile.biscuits` and the `BISCUIT_4MM` row in
  `cnc/layers.js` all stand. The pattern is the workshop's recorded standard for
  a butt joint — the owner's own answer to BLOCKERS #59 — and the layer name is
  matched by his VCarve tool mapping. What it has today is **no consumer**, and
  `engine/biscuits.js` says so at the top of the file.
* The `cnc.marks` channel stands: the writer in `cnc/dxf.js`, the reader in
  `joinery.js` and the layer table are untouched. F9's hand-added lines are
  written into it.
* Turn 13's golden fixture `fixtures/golden-partition-biscuits.json` stands and
  now drives the regression test for the **removal** — every entity it worked
  out by hand is asserted absent, one by one, on the cases that used to carry
  them (`test/turn13-biscuits.test.js`). A fixture that records what a turn
  removed is worth more than a deleted one.

---

## F6 — the back holds every partition

### The LISP line that justifies it

```lisp
(defun drawWardrobeDPHolesBACK (x0 y0 szerBACK G dpLeft dpRight dpInset
                                dpBottomY dpTopY / leftX rightX)
  (setq leftX (+ x0 G dpInset (/ G 2.0)))
  (setq rightX (- (+ x0 szerBACK) G dpInset (/ G 2.0)))
  (if dpLeft
    (progn
      (drawCircle "SCREWS_3MM" leftX (+ y0 dpBottomY 50.0) 1.5)
      (drawCircle "SCREWS_3MM" leftX (+ y0 dpTopY -50.0) 1.5)))
  …)
```
`reference/lisp/KIT_WARDROBE_FULL.lsp` **L389-400**

A drawer-panel partition is screwed **through the back**, on its own axis,
`SCREWS_3MM`, ⌀3 (`1.5` is the radius), **50 mm** off each end. The interactive
vertical partition is the same piece doing the same job, so it takes the same
joint — with the run filled in, because a 2.4 m divider held by two screws bows.

### The spacing, as a derivation

Both numbers are in `profile.partitionBack`, named, with this derivation beside
them:

```
fromEnd   50   the LISP's own number, both ends
maxPitch  400  the owner's cap on what is left in between

a 2400 partition ⇒ span = 2400 − 2×50 = 2300
                 ⇒ gaps = ceil(2300 / 400) = 6
                 ⇒ SEVEN screws at 2300 / 6 = 383.3 mm
```

The ends are **always** at 50 and the intermediates are spread **evenly**: a run
of 400s with a short last gap is what marching a tape from one end gives you,
and it is not what a joiner sets out.

Worked examples from the probe:

| case | partition | span | screws | pitch |
| --- | --- | --- | --- | --- |
| `BUD+partition` (720 high) | 734 | 634 | 3 | 317 |
| `WARDROBE` 2400 high | 2364 | 2264 | 7 | 377.3 |
| CLAUDE.md's own example | 2400 | 2300 | 7 | 383.3 |

### The split-partition case (F6.2)

Turn 21's F9 law: a crossing **fixed** shelf splits one partition, and the
engine cuts each segment as its own `VPART` panel. Each segment is therefore its
own 50 … ≤400 run — it stands between two boards of its own and is screwed on
its own. That falls out of `partitionBackScrews` taking a **list of runs** and
never looking across them; no screw ever lands in the shelf between two
segments.

### What is NOT touched (F6.3)

The two back lines the LISP already draws keep their own law exactly:

* `partition_screw` — three across the back on the horizontal drawer-stack
  partition's centre line;
* `dp_screw` — the drawer panel's own pair, 50 mm off each end;
* `rail_partition_screw` — the rail partitioner's row.

`test/turn23-f5-f6-partition.test.js` asserts each of them, on a cabinet that
carries no vertical partition at all.

---

## The identity promise, restated as facts

* **Golden defaults: ZERO.** No case without a partition changes a single
  fingerprint. `fingerprints-diff.txt` contains 36 case ids and every one of
  them has `partition` in its name.
* **Fixtures: ZERO.** No golden fixture in `fixtures/` carries a vertical
  partition, so none needed regenerating. `fixtures/golden-partition-biscuits
  .json` is the one file about a partition and it was deliberately kept, in its
  original form, as the record of the subtraction.
* **The partition probe shows ONLY the two named classes.** `probe-diff.txt`
  moves `poly/BISCUIT_4MM` (to zero) and `circle/SCREWS_3MM` (count) and nothing
  else — no outline moved, no pocket, no text, no layer that is not one of
  those two.
* **The partition is cut exactly as before.** F5 removes machining, never a
  piece of furniture: the `VPART` panel's size, its edging and the unit's board
  count are unchanged, and the sheet lays it out where it always did.
