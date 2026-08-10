# CNC export identity — turn 19

CLAUDE.md, rule 0, in the owner's own emphasis:

> **CNC EXPORT: ZERO deltas this turn.** The default hinge IS today's drilling —
> same cup, same screws, same plate holes, same layers (`FRONT_HINGES_35MM`,
> `FRONT_HINGES_3MM`, `HINGES_5MM`). Variant, finish and the catalogue change
> WHAT IS BOUGHT and WHAT IS DRAWN, never what is drilled. Fingerprint
> before/after; any diff beyond the turn-18 baseline is a REGRESSION.

This is that publication, and the verdict is the shortest one this project has
had: **both diffs are empty**.

Baseline: `0448fc2` — main after the turn-18 merge, plus the chat package.
Branch: `claude/claude-md-turn-19-0bo2sg`.

## Evidence in this folder

| file | what it is | result |
|---|---|---|
| `fingerprints-turn18-baseline.txt` | `scripts/cnc-fingerprint.mjs` on the baseline | 2358 lines |
| `fingerprints-turn19.txt` | the same script on this branch | 2358 lines |
| `fingerprints-diff.txt` | the raw diff of the two | **0 lines** |
| `probe-turn18-baseline.txt` | `scripts/cnc-delta-probe.mjs` on the baseline | 1539 lines |
| `probe-turn19.txt` | the same probe on this branch | 1539 lines |
| `probe-diff.txt` | the raw diff of the two | **0 lines** |

The fingerprint script hashes the actual DXF text of every file the browser path
would write — every unit type, every export preset — so an empty diff is not a
summary of the export, it *is* the export, byte for byte.

The delta probe goes further and asks the three questions a hash cannot:

```
1. PER-PANEL GEOMETRY   every poly and circle of every file, hashed WITHOUT text
     changed: 0        added: 0        removed: 0
2. SHEET CENSUS         every entity of every preset sheet, by type and layer
     changed: 0
3. PER-PANEL TEXT       the label each file carries
     changed: 0
```

## Why it is zero, structurally

Not because nothing was tried, but because of where this turn's work sits.

The drilling is computed in `engine/cabinet.js` from `profile.hinges` — the cup
diameter, the ⌀3 cup screws, the ⌀5 plate pair at 32 mm centres, and the three
LISP layer names. **Turn 19 does not touch `profile.hinges` at all.** Everything
it adds lives in `profile.hardware.hinge.cliptop`, which is read by exactly three
things: the settings surface, the BOM's hardware rows, and the 3D model loader.
None of the three is on the path to a hole.

`test/turn19-hinges.test.js` states that as an assertion rather than as a
promise — four cabinets that differ in every hardware answer this turn added
(nickel vs onyx, a system label, one door assigned by hand, both at once) and the
drills, the panels, the cut geometry and the totals of all four are byte-identical:

> `finish, angle and a hand-assigned hinge change NO hole, NO panel, NO layer`

## The one thing that WOULD have moved a hole, and did not ship

The screw-on **⌀3 mounting plate** (Blum 173L) is a different drilling pattern
from the knock-in ⌀5 the LISP knows, and nobody has supplied it. It ships
**visible and disabled**, with the tooltip *"drilling pattern pending"*, and
`resolveHingePlate` refuses to hand it back even to a project that carries it in
its stored design.

An enabled option that silently drilled the ⌀5 pattern under a ⌀3 label would
have kept this report at zero deltas and made the export lie about what is on the
machine. BLOCKERS carries exactly what is needed to enable it.

## How to reproduce

```
git worktree add /tmp/base 0448fc2
node scripts/cnc-fingerprint.mjs > /tmp/head.txt
(cd /tmp/base && node scripts/cnc-fingerprint.mjs > /tmp/base.txt)
diff /tmp/base.txt /tmp/head.txt          # empty
node scripts/cnc-delta-probe.mjs > /tmp/head-probe.txt
(cd /tmp/base && node scripts/cnc-delta-probe.mjs > /tmp/base-probe.txt)
diff /tmp/base-probe.txt /tmp/head-probe.txt   # empty
```
