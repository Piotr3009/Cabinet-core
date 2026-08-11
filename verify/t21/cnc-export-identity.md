# CNC export identity — turn 21

Baseline: `fingerprints-turn20-baseline.txt` (turn 20's own committed file,
`verify/t20/fingerprints-turn20.txt`, byte-for-byte).
This turn: `fingerprints-turn21.txt` — `node scripts/cnc-fingerprint.mjs`.

## The headline

**`fingerprints-defaults-diff.txt` is ZERO lines.** Every unit type, every
existing scenario, every preset: byte-identical.

That file is the same diff as `fingerprints-diff.txt` with this turn's two NEW
scenarios and the one CHANGED scenario removed, so that "zero on the golden
defaults" is a claim about the 2161 rows that existed before this turn rather
than a claim with a footnote.

## The turn's ONLY new CNC entities

| class | where | when |
| --- | --- | --- |
| `HINGES_5MM` on a `VPART` | the partition's own face | ONLY where a door is hung on a partition (F12) |

Nothing else. Not a new layer, not a new diameter, not a new kind of feature —
the ⌀5 plate pattern the carcass sides have carried since turn 1, on a panel
that never had it because no door was ever hung there.

Measured, on the owner's own case (1400 wide, partitions at 600 and 800):

```
without bay doors: {"PUZZLE_HOLES_7_5MM":36,"SCREWS_3MM":42,"HINGES_5MM":24,
                    "FRONT_HINGES_35MM":12,"FRONT_HINGES_3MM":24}
with bay doors:    {"PUZZLE_HOLES_7_5MM":36,"SCREWS_3MM":42,"HINGES_5MM":36,
                    "FRONT_HINGES_35MM":18,"FRONT_HINGES_3MM":36}
VPART layers without: []
VPART layers with:    ["HINGES_5MM"]
```

Three leaves instead of two is why the cup and cup-screw counts move; the
partition's twelve `HINGES_5MM` are the new class. `test/turn21-f12-partition-doors.test.js`
pins every one of those numbers, and pins that a cabinet with the same
partitions and NO bay doors is drilled for nothing at all.

## F7.2 — the adjustable shelf introduces NO class, and here is why

CLAUDE.md F7.2 says to search the LISP first, and the LISP carries it —
`SKYLON_COMMON.lsp → drawBUL` L755-768, verbatim:

```lisp
      (setq shelfY (+ y0 G (* spacing i)))
      (drawCircle "SHELVES_7_5MM" (+ x0 70.0) (- shelfY 50.0) 3.75)
      (drawCircle "SHELVES_7_5MM" (+ x0 70.0)     shelfY      3.75)
      (drawCircle "SHELVES_7_5MM" (+ x0 70.0) (+ shelfY 50.0) 3.75)
      (drawCircle "SHELVES_7_5MM" (+ x0 szer -70.0) …)
```

Two columns 70 mm in from each edge, three pins per column at ±50 mm about the
shelf's line, **⌀7.5** (radius 3.75), layer `SHELVES_7_5MM`.

**The finding: the diameter is 7.5, not the ⌀5 CLAUDE.md's F7.2 heading says.**
⌀5 is the shelf pin the workshop buys; 7.5 is what the LISP drills, and F7.2's
own instruction is "use it verbatim". It is used verbatim — and it needed no
new entity at all, because `profile.shelfHoles` has carried exactly that
pattern since turn 1 and the engine has drilled it for every shelf nobody
fixed. `adjustable` therefore ships ENABLED with a fingerprint delta of zero,
and the `+adjustable-shelves` probe row exists to say so out loud.

## The one CHANGED scenario, and why it is right

`+partition-on-shelf`, on six unit types: `BUDR`, `BUDR2`, `BUDR4`, `DW_PANEL`,
`FRIDGE`, `OVEN_BASE`.

Those six do not support shelves. The probe hands them a fixed shelf item and a
partition; the engine cuts NO shelf (`type.supports.shelves` is false) and turn
12's `partitionSpan` was nonetheless handed the item and stopped the partition
on it. A partition terminating on a board that is not in the cut list.

F9's law fixes it — SPAN decides, and a shelf that was never cut has no span —
so on those six the partition now runs full height and is screwed to the top,
which moves `01-VPART-1.dxf` and `01-TOP.dxf`. Existing named entities only
(`OUTLINE`, `SCREWS_3MM`, `BISCUIT_4MM`), just placed right, which is what
CLAUDE.md F9.3 calls for in as many words.

The twelve types that DO cut shelves are unchanged in that scenario: their
full-width shelf really does cross the partition, and it really does carry it.

## The two NEW scenarios

`+partition-doors` and `+adjustable-shelves`, on all twelve types. Neither
exists in the turn-20 baseline, so both read as ADDITIONS in
`fingerprints-diff.txt` — which `scripts/cnc-fingerprint.mjs`'s own header calls
the right way to report a new variant.

## Golden fixtures

**Zero moves.** No fixture declares a panel Y, and the three new `drillSummary`
keys this turn adds (`runner_bottoms_carcass_y`, `runner_bottoms_dp_y`, and the
`setback`/`fullHeight`/`run` panel meta) are additions — the fixture comparison
is key-by-key on what the fixture itself declares (`test/engine.test.js`).
