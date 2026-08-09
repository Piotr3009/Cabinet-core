# CNC EXPORT IDENTITY — turn 12

Rule 7: *"CNC EXPORT byte-identical for everything that exists today — re-run
the turn-11 fingerprint script and publish the diff (new variants get NEW
fingerprints, listed separately)."*

## How this was produced

`scripts/cnc-fingerprint.mjs` prints a 32-bit FNV-1a of the actual DXF text
for every unit type × case × preset, taken from the pure generator
(`engine/cnc/dxf.js`) — the same code the browser download path calls.

    git worktree add /tmp/base 9db0093          # the turn-11 baseline
    node scripts/cnc-fingerprint.mjs > head.txt
    (cd /tmp/base && node scripts/cnc-fingerprint.mjs > base.txt)
    diff base.txt head.txt

Baseline commit: `9db0093` (main, after the turn-11 merge and the cross-wall
drag hotfix). Branch: `claude/claude-md-phase-12-se2xhi`.

Lines: baseline 543, branch 810.

## Verdict

| | count |
|---|---|
| fingerprints that CHANGED | **35** |
| lines added | 309 |
| lines removed | 42 |
| …of the additions, new drawer variants (BUDR2 / BUDR4) | 274 |

**Every changed fingerprint is a plinth-run case, and nothing else is.** The
three filters below all come back empty, which is the actual proof:

    # a changed fingerprint that is not a plinth-run case
    diff base.txt head.txt | grep '^[<>]' | sed 's/^[<>] //' \
      | grep -v plinth-run | awk '{print $1" "$2" "$3}' | sort | uniq -c | awk '$1==2'
    (empty)

    # an addition that is neither a plinth run nor a new variant
    diff base.txt head.txt | grep '^>' | grep -v plinth-run | grep -vE '^> (BUDR2|BUDR4)'
    (empty)

    # a removal that is not a plinth-run case
    diff base.txt head.txt | grep '^<' | grep -v plinth-run
    (empty)

## 1. The EXPECTED delta — one plinth per run (CLAUDE.md F8)

A deliberate behavioural change, and the only one in this turn. The owner's
rule: *"turning plinths on for adjacent units WITHOUT an end panel between them
produces ONE continuous plinth across 2, 3, N units — not pieces."*

So a plinthed cabinet standing in a run no longer cuts its own short piece:
the first unit of each segment cuts one board for the whole segment, and every
other unit in it cuts none. What changes in the export is therefore exactly two
things, per kit that takes a plinth:

* `+plinth-run-owner` — `01-PLINTH.dxf` is now the SEGMENT's length (1800 mm in
  the report's case) instead of the cabinet's own width. The `all` and
  `sprayed` sheets move with it, because the plinth is on them.
* `+plinth-run-member` — `01-PLINTH.dxf` **is gone**: a member cuts nothing.
  That is what the "removed" lines above are.

Example, BUD:

    < BUD+plinth-run-owner   file  01-PLINTH.dxf  a37eef6f     (turn 11: 600 mm)
    > BUD+plinth-run-owner   file  01-PLINTH.dxf  ec1700da     (turn 12: 1800 mm)
    < BUD+plinth-run-member  file  01-PLINTH.dxf  a37eef6f     (turn 11: a second 600 mm piece)
                                                               (turn 12: no file)

**A SINGLE unit's plinth has not moved a millimetre.** The `+plinth` cases —
one cabinet, plinth on, no run — are byte-identical across every kit, and so is
a bare `computeCabinet(params)`, which is what every golden fixture goes
through. The run element arrives from the store and only from the store.

## 2. NEW fingerprints — the drawer variants (CLAUDE.md F3.2)

`BUDR2` (2 drawers) and `BUDR4` (4 drawers) are new kits, so every line for
them is an addition and none of them can be a change. 274 lines.

They are KIT_BUDR_FULL with a different front split and nothing else; the
existing `BUDR` (3 drawers, 4:3:2) is byte-identical, which is checked directly
in `test/turn12-library.test.js` over four hundred carcass heights.

## 3. Everything else

Byte-identical. That includes every kit's carcass, back, doors, drawer boxes,
shelves, hinge and runner drilling, dog-bone sockets and tabs, the per-panel
files and all four sheet presets.

The dog-bone TABS (F6.2) and the hinge BOSS (F6.1) are additions to the 3D
VIEW only — they are read from CNC data the engine already emitted and neither
writes anything into it, which is why nothing here moved.
