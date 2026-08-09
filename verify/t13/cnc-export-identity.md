# CNC EXPORT IDENTITY — turn 13

CLAUDE.md, turn 13, §0: *"CNC identity: byte-identical everywhere EXCEPT the
partition export, which gains drilling/biscuits this turn — a deliberate,
documented delta (it exported nothing there before). Fingerprint both sides,
publish in `verify/t13/cnc-export-identity.md`."*

This is that report.

## How this was produced

`scripts/cnc-fingerprint.mjs` prints a 32-bit FNV-1a of the actual DXF text for
every unit type × case × preset, taken from the pure generator
(`engine/cnc/dxf.js`) — the same code the browser download path calls.

    git worktree add --detach /tmp/t13base 9b69e2c   # the turn-13 baseline
    cp scripts/cnc-fingerprint.mjs /tmp/t13base/scripts/   # the SAME script both sides
    node scripts/cnc-fingerprint.mjs > head.txt
    (cd /tmp/t13base && node scripts/cnc-fingerprint.mjs > base.txt)
    diff base.txt head.txt

Baseline commit: `9b69e2c` — main after the turn-12 merge.
Branch: `claude/claude-md-phase-13-l9u9g8`.

The script gained two cases this turn (`+partition` and `+partition-on-shelf`,
per kit) so that the delta would SHOW rather than hide behind a script that only
ever builds an undivided box. It is copied into the baseline worktree so both
sides run the identical script over identical cases — which is why both files
have exactly **1148** lines and the diff is a pure change set with no additions
or removals at all.

Raw output: [`fingerprints-turn12-baseline.txt`](fingerprints-turn12-baseline.txt)
· [`fingerprints-turn13.txt`](fingerprints-turn13.txt)

## Verdict

| | count |
|---|---|
| lines, baseline | 1148 |
| lines, branch | 1148 |
| lines ADDED | 0 |
| lines REMOVED | 0 |
| fingerprints that CHANGED | **95** |
| …of those, on a case WITHOUT a partition | **0** |

**Every changed fingerprint is a partition case, and nothing else is.** The two
filters below are the actual proof, and both come back empty:

    # a changed fingerprint on a case that has no partition in it
    diff base.txt head.txt | grep '^[<>]' | sed 's/^[<>] //' | grep -v '+partition'
    (empty)

    # a changed FILE that is not one of the four the joint touches
    diff base.txt head.txt | grep '^[<>]' | grep ' file ' | awk '{print $4}' \
      | grep -vE '01-(TOP|BOTTOM|SHELF-1|VPART-1)\.dxf'
    (empty)

## The delta, in full

95 changed fingerprints, and every one of them is one of six things:

| what | count | why |
|---|---|---|
| `01-VPART-1.dxf` | 20 | the partition's own half of the joint — the biscuit marks |
| `01-BOTTOM.dxf` | 20 | the bottom joint: two ⌀3 screws and a 70 mm mark per set |
| `01-TOP.dxf` | 9 | the top joint, on the kits that have a top panel |
| `01-SHELF-1.dxf` | 6 | the no-screw set, where a partition terminates on a fixed shelf |
| `sheet all` | 20 | the sheet contains those files |
| `sheet non-sprayed` | 20 | …and so does that preset |

`sheet sprayed` and `sheet fronts` are **unchanged on every kit**: no front is
part of a partition joint, and the presets prove it.

### What was there before

Nothing. `VPART` landed in turn 11 as a rectangle with no machining at all, and
the engine said so in as many words:

> It is NOT tabbed, and that is a decision rather than an omission… Its DRILLING
> is a later question and is written down as one (BLOCKERS #59).

So this is not a change to what the machine was cutting — it is the answer to a
question that had been left open for two turns. A partition file that used to be
an outline and a label is now an outline, a label and its fixing.

### What the new machining is

The owner's pattern, dictated 09.08.2026 (CLAUDE.md F8, BACKLOG #59):

    screw ⌀3 → 10 mm gap → biscuit mark 70 mm → 10 mm gap → screw ⌀3

starting no closer than 50 mm from the element's edge — never less; two sets up
to 700 mm and three above it. The screws join the existing **`SCREWS_3MM`**
family (turn-8 conventions — same layer, same ⌀3). The 70 mm marks go on a new
layer, **`BISCUIT_4MM`**, matching the owner's dedicated 4 mm VCarve in-and-out
program; the name is exact and is as much a machine contract as every other
layer name in `engine/cnc/layers.js`. Its ACI is 40, which the LISP's own table
never uses, so nothing AutoCAD already draws changes colour.

The mark is written as an **open** two-point polyline (R12 `POLYLINE` with the
closed flag clear) rather than a closed rectangle, because that is what an
in-and-out pass is: plunge, run 70 mm, retract.

Worked out by hand from the rule and pinned in
`fixtures/golden-partition-biscuits.json`; the arithmetic and the placement are
tested in `test/turn13-biscuits.test.js`.

### And the other half of the promise

A cabinet with no vertical partition emits not one entity of any of it. That is
asserted directly, over every kit in the library:

    test('THE OTHER HALF OF THE DELTA: no partition, no biscuit — in any kit')

…which is why every non-partition fingerprint above is identical, and why the
export fingerprint in `test/cnc-export-identity.test.js` — a WARDROBE with
shelves, drawers, a rail and doors, and no partition — did not move.

## What else this turn touched, and did not reach the machine

Three things worth naming, because each of them looks like it should have:

* **F1 — the panel solids and their grain.** The winding fix and the cabinet-space
  UVs are in `3d/panelSolid.js`, which builds three.js geometry for the screen.
  The CNC path reads `panel.cnc` and never that file.
* **F4 — the wall-unit end panel.** It ends with the cabinet now, so a WUD end
  panel is shorter. An end panel is a DESIGN-layer input (`params.end_panels`)
  and no kit emits one, so no fixture and no fingerprint case has one: the
  change shows in the BOM, which is where it was asked for.
* **F3/F5 — the colour hierarchy and the bulk actions.** Finishes and selections.
  A finish is not a dimension and never reaches the cut list.
