# CNC identity — turn 14

`scripts/cnc-fingerprint.mjs` on the turn-13 baseline (`2ebc40a`) and on this
branch, diffed. One line per unit type per preset: a 32-bit FNV-1a of the DXF
text the browser path would write, taken from the pure generator
(`engine/cnc/dxf.js`).

```
git worktree add /tmp/base 2ebc40a
node scripts/cnc-fingerprint.mjs > /tmp/head.txt
(cd /tmp/base && node scripts/cnc-fingerprint.mjs > /tmp/base.txt)
diff /tmp/base.txt /tmp/head.txt
```

Both outputs are committed: `fingerprints-turn13-baseline.txt` and
`fingerprints-turn14.txt`.

## The verdict

**21 lines CHANGED. 335 lines ADDED. Nothing else in the application moved.**

### Changed — the FRIDGE's back panel (F2), and only it

Every one of the 21 is `FRIDGE … 01-BACK.dxf` (7 presets) or a SHEET that
contains that file (`sheet all` and `sheet non-sprayed`, 7 presets each):

```
FRIDGE  file  01-BACK.dxf   a8ce8f6e → d5280e7c
FRIDGE  sheet all           e8d872f7 → 60739bfd
FRIDGE  sheet non-sprayed   93e7ae96 → 2071ff66
        …and the same three for +plinth, +plinth-run-owner,
        +plinth-run-member, +shelves, +partition, +partition-on-shelf
```

The change is ONE ROW OF SOCKETS on ONE panel of ONE kit: the back-top's
BUL/BUR sockets move from 95 mm above the panel's bottom edge to 95 mm below
its top, because the tenon they are cut for is the side panels' TOP one at
H − 95 (KIT_FRIDGE.lsp L381-387 against SKYLON_COMMON.lsp L699). CLAUDE.md F2
calls this a CRITICAL fix and the delta is its unavoidable consequence — the
gate's parenthetical named only the masking panel, and this is the second
deliberate delta of the turn, named here rather than absorbed quietly.

Nothing else about the fridge moved: RAIL1 and RAIL2 changed POSITION IN THE
CABINET (`box.y`), which is 3D and BOM-neutral geometry and carries no DXF at
all — their own fingerprints are unchanged, and so are their cut sizes.

### Added — the bottom masking panel (F5), a new part family

335 lines, all of them on the two NEW presets the script gained this turn
(`+bottom-mask` and `+bottom-mask-run-owner`) — one cabinet's board, and a
run's. They are ADDITIONS on named files rather than changes, which is what
CLAUDE.md means by "new variants get NEW fingerprints, listed separately".

### Everything else

Every other type — BUD, BUDR, BUDR2, BUDR4, BUDTALL, WARDROBE, WUD, SINK,
LOW_CABINET — is byte-identical on every preset, including the presets that
carry a plinth, a run plinth, shelves, a partition and a partition on a shelf.
