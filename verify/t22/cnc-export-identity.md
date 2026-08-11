# CNC export identity — turn 22

**Iron rule of this turn: fingerprint delta ZERO on golden defaults, fixtures
ZERO.** Three of the four phases touch things a cabinet is made of, and none of
them may move a single coordinate the machine reads.

## The measurement

`scripts/cnc-fingerprint.mjs` prints one line per unit type per case per file —
a 32-bit FNV-1a of the actual DXF text the browser path would write, taken from
the pure generator (`engine/cnc/dxf.js`). It is run against a worktree of the
turn-21 baseline and against this branch, and the two are diffed.

```
git worktree add /tmp/base 5b2583e            # the turn-21 merge
(cd /tmp/base && node scripts/cnc-fingerprint.mjs) > fingerprints-turn21-baseline.txt
node scripts/cnc-fingerprint.mjs               > fingerprints-turn22.txt
diff fingerprints-turn21-baseline.txt fingerprints-turn22.txt > fingerprints-diff.txt
```

| file | lines |
| --- | --- |
| `fingerprints-turn21-baseline.txt` | 2766 |
| `fingerprints-turn22.txt` | 2766 |
| `fingerprints-diff.txt` | **0 — empty** |

**Zero.** Not one of the 2766 fingerprints moved: every kit, every preset
sheet, every per-panel file, at golden defaults and at every case the script
carries (plinths, plinth runs, shelves, partitions, masks, infills, mitres,
partition doors, adjustable shelves).

## …and zero at the ENTITY level too

A fingerprint answers "did anything change". `scripts/cnc-delta-probe.mjs`
answers "what" — every poly and circle of every per-panel DXF hashed WITHOUT
its text entities, every preset sheet counted by entity type and layer, and
every TEXT entity listed. Run the same way against the same baseline:

```
(cd /tmp/base && node scripts/cnc-delta-probe.mjs) > /tmp/base.txt
node scripts/cnc-delta-probe.mjs                   > /tmp/head.txt
diff /tmp/base.txt /tmp/head.txt                   # → empty
```

**Empty.** No geometry, no entity census and no lettering changed.

## Why each phase is zero, rather than "measured zero"

**F1, the cornice.** It is BOUGHT MOULDING and produces no panel at all. It is
a hardware row in the BOM (`hw('cornice', …, 'm')`) and an entry on
`assemblies.cornice` for the 3D — and `panels`, which is what the CNC sheet,
the cut list and the DXF all read, never hears about it. The piece it is
mounted on is the 40 mm top infill, which is the cut piece it already was, in
the place it already stood (`box.y = H`, in the door plane, since turn 6). The
probe in `probes.txt` shows a wardrobe with a 70 and with a 100 cutting
byte-for-byte what the same wardrobe with only its infill cuts, across all 8 of
its DXF files.

**F4, the D/W panel.** The change is which NUMBER a leg-less plinth type
derives its stand height from — the run's, instead of the profile constant. At
the profile's own 100 that is the same number, which is why the defaults do not
move. `probes.txt` carries the equivalence CLAUDE.md F4.5 asks for: between leg
100 and leg 50 the D/W's cut list changes in exactly one piece, `PLINTH`, and
its legged twin's changes in exactly the same one. The front stays 594 wide at
every leg height.

**F2b, the company row.** The cascade feeds the SAME engine inputs that existed
before it: with no row, `cascade([profile, null, project, element])` evaluates
the ladder those resolvers already were. `probes.txt` shows a BUDR under a
company row cutting identically to the same BUDR with the variant typed into
the project — and identically to golden defaults, because the variant is
hardware and not geometry (turn 18 F6.4). What differs is the ARTICLE ordered:
`490 mm · MOVENTO 760H · T` at defaults, `· S` under the row and `· S` typed in
by hand.

## Fixtures

**Zero.** `fixtures/golden-*.json` are read, never written; nothing in this turn
adds, edits or removes one, and `test/engine.test.js` holds the engine to all
twelve of them unchanged.

## The suite

1618 at baseline → **1679, all green**, of which 61 are new and every one of
them is this turn's.
