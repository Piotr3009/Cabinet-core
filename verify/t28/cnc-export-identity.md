# verify/t28 — every delta in the CNC export, named

**Baseline: `8b6ece6`, main after the 12.08 chat fix — the commit CLAUDE.md
names.** Fingerprints: `fingerprints-turn27-baseline.txt` →
`fingerprints-turn28.txt`. Probe: `probe-turn27-baseline.txt` →
`probe-turn28.txt`. Both scripts are the repository's own
(`scripts/cnc-fingerprint.mjs`, `scripts/cnc-delta-probe.mjs`) and both are
runnable against any checkout, so every number below can be re-derived.

There are **TWO** deltas and no third thing.

| | delta | where it shows |
| --- | --- | --- |
| **F1** | a D/W panel is a FRONT, a RAIL and a PLINTH | `DW_PANEL` files only |
| **F2b** | a door handle's x moves to the opposite stile | any DXF carrying a door handle |

Everything else this turn changes the PICTURE and not the file: F3 (the ladder's
anchor), F4 (the shader), F5 and F6 (the metals), F7 (the grain), F8 (the
dimension language), F10 and F11 (two controls) move **zero** CNC entities. F9's
end-panel depth is a real cut-list change and it is discussed at the bottom: it
moves nothing in the probe set because no scenario in it stands a cabinet off
the wall, and it can only ever be reached from a project that asks for it.

---

## The fingerprint diff, counted

```
rows: 4 794 → 4 719     changed 149     added 21     removed 96
```

Every one of the 96 removed and 21 added rows is `DW_PANEL`. Of the 149 changed
rows, **93 are `DW_PANEL`** and the remaining **56 are the `+handles-bar` and
`+handles-knob` scenarios** of seven kits — four rows apiece (`01-F.dxf` and the
three sheets that contain it).

```
CHANGED, not DW_PANEL:
  BUD+handles-bar 4      BUD+handles-knob 4
  BUDTALL+handles-bar 4  BUDTALL+handles-knob 4
  FRIDGE+handles-bar 4   FRIDGE+handles-knob 4
  LOW_CABINET+…-bar 4    LOW_CABINET+…-knob 4
  SINK+handles-bar 4     SINK+handles-knob 4
  WARDROBE+…-bar 4       WARDROBE+…-knob 4
  WUD+handles-bar 4      WUD+handles-knob 4
```

**Not one kit without a handle moved a hundredth.** Every scenario in
`scripts/cnc-scenarios.mjs` that is neither a `DW_PANEL` nor a `+handles-*` case
carries the same fingerprint it carried on the baseline.

## The probe diff, counted

`probe-diff.txt`: 8 020 → 7 848 rows, **388 changed lines across GEOM, SHAPE,
TEXT and CENSUS — and every single one is on a `DW_PANEL` scenario.** The probe
set does not build a handled door, which is why F2b does not appear in it;
`handle-move-diff.txt` below is that delta's own entity-level evidence.

---

## F1 — the D/W panel

The owner, verbatim: *"nie ma całego korpusu oprócz górnego panela, który ma 600
mm bez żadnych dog bonów — tak jak było, tylko chciałem żeby to było podciągnięte
pod logikę szafki."*

Turn 27 read "treat it like a cabinet" as "cut it a carcass" and put BUL, BUR,
TOP, BOTTOM and BACK around a machine that stands on the floor. What leaves the
export is exactly those boards.

**Per-panel files, before and after:**

```
BASELINE (turn 27)                    HEAD (turn 28)
DW_PANEL  file  01-BACK.dxf   4aec2425      (gone)
DW_PANEL  file  01-BOTTOM.dxf 1c23480c      (gone)
DW_PANEL  file  01-BUL.dxf    633fa705      (gone)
DW_PANEL  file  01-BUR.dxf    c012b7f8      (gone)
DW_PANEL  file  01-F.dxf      567e4aea  →   567e4aea   ← byte-identical
DW_PANEL  file  01-TOP.dxf    2bed7165  →   2255e6e5
                                            01-PLINTH.dxf  5013de8a  (new)
```

Three facts in that table, and each is a claim CLAUDE.md makes:

1. **The FRONT does not move.** `01-F.dxf` is `567e4aea` on the baseline and
   `567e4aea` on this branch — and it was `567e4aea` at the turn-26 merge
   (`bd7cec4`) too. F1 says "unchanged from turn 27" and the file says so to the
   byte.
2. **The RAIL is turn 26's own piece.** `01-TOP.dxf` is `2255e6e5` here, and
   `2255e6e5` at `bd7cec4`. F1 says *"the turn-26 engine (`bd7cec4`) emitted
   exactly this piece — match it"* — it is matched to the byte, not to the
   millimetre. (Turn 27's `2bed7165` was the jointed `W − 2G` top it cut when it
   built a carcass.)
3. **The PLINTH is new to the DEFAULT scenario** because `defaultParamsFor
   ('DW_PANEL')` now brings the toe kick with it (F1.3). It is the same notched
   piece turn 26 and turn 27 both cut when a plinth was asked for — the
   `DW_PANEL+plinth` scenario's `01-PLINTH.dxf` is unchanged between the
   baseline and this branch, which is why that scenario shows 3 changed rows
   rather than 4.

**The four boards that left were wrong to have been there.** They are the
carcass of a cabinet with a dishwasher standing inside it: a bottom on the leg
line that an ~820 mm appliance cannot be lifted over, two sides where the
neighbours' own sides already are, and a back behind a machine that needs its
services. That was BLOCKERS #94's question and the owner has answered it — the
entry is closed in his own words.

The RAIL's own numbers, off the engine: **600 × 540 × 18**, outline
`[[0,0],[540,0],[540,600],[0,600]]`, `pockets: []`, `holes: []`. Full unit width
rather than the internal width, because it has no sides to sit between; the
run's own internal depth, so a worktop lies flat across it and its neighbours
(the walk measures that: `D/W 752/18/540 vs BUD 752/18/540`).

**And the whole kit is undrilled.** `drills.length === 0`, `hardware.length ===
0` on every width and height the walk and the suite try. There is nothing to
bore because there is nothing to join.

---

## F2b — the handle's x, on the sheet

A FRONT's cut frame is the **inside mirror**: `engine/joinery.js panelPlacement`
puts its origin at the leaf's bottom-RIGHT corner with `u = [−1, 0, 0]`, because
the workshop bores a door from the back. The CUP law has honoured that since
turn 1. `engine/handles.js` did not: it resolved "the opening edge" in ROOM
terms and wrote the answer into the mirrored frame, so on the sheet the handle
printed on the CUP stile for both hands — the owner's `03-F`.

`scripts/t28-handle-move.mjs` prints every ⌀35 cup and every handle hole of six
kits × two handle types, in the SHEET's frame and mapped back into the ROOM.
`handle-move-diff.txt` is the two runs diffed:

```
69 rows before, 69 rows after, 18 changed.
Every changed row is HANDLES_5MM. Not one cup moved.
```

The move itself, on a 600 mm base unit hinged LEFT:

```
before   HANDLES_5MM  SHEET x=562.00  ROOM left+35.00  right+562.00
after    HANDLES_5MM  SHEET x=35.00   ROOM left+562.00 right+35.00
```

and its mirror, hinged RIGHT:

```
before   HANDLES_5MM  SHEET x=35.00   ROOM left+562.00 right+35.00
after    HANDLES_5MM  SHEET x=562.00  ROOM left+35.00  right+562.00
```

The leaf is 597 wide and its cups sit 21.5 mm from the hinge edge in the room,
unchanged in both columns. **Before, the handle was on the hinge stile beside
them; after, it is on the free one.** That is the delta, and it is the whole of
it: `BUDR`'s drawer fronts do not appear in the diff at all, because a
horizontal handle is centred on the width and `w/2` mirrors to itself.

**The 3-D model does not move, and that is not luck any more.** Turn 27's scene
read `meta.handle.x` as if the frame's origin were bottom-LEFT, which inverted
the engine's inverted answer and drew the handle on the free stile — right
picture, wrong file. Both readings are corrected, so the two now agree by
construction: `verify/t28/before/f2-sheet.png` and `after/f2-sheet.png` are the
same door from the same camera, and only the two yellow handle dots have crossed
the leaf.

---

## What did NOT move, and why it is worth saying

* **F7 — the shelf's grain.** The piece states its grain (`cnc.grain: 'h'`) and
  `engine/decors.js grainRun` is the only reader of that field in the app. The
  DXF is written from the outline, the pockets, the holes and the drawn size, so
  a shelf's file is byte-identical: no `SHELF` row appears anywhere in either
  diff. The nesting question this raises is asked as **BLOCKERS #95** rather
  than answered by turning a part on the sheet.
* **F3, F4, F5, F6, F8, F10, F11.** A dimension anchor, a fragment normal, two
  material colours, a decal's collar, four label placements and two controls.
  None of them is a number the machine reads.
* **F9 — the end panel.** `endPanelDepth` gains the deliberate back inset
  (turn 8 left it out on purpose; the owner overrules that here), and it IS a
  cut-list change: a project with a 40 mm back inset on it cuts an end panel
  40 mm deeper than it did yesterday, and the walk measures both the cut size
  and the drawn one (`596 → 636 mm cut, 636 mm drawn`). It moves **zero rows**
  in either report because no scenario in `scripts/cnc-scenarios.mjs` or in the
  probe set stands a cabinet off the wall — `inset_back_mm` is a project
  decision and a bare kit call never carries one. That is a limit of the probe
  set and it is named here rather than read as innocence.

---

## The files in this folder

| file | |
| --- | --- |
| `fingerprints-turn27-baseline.txt` → `fingerprints-turn28.txt` | the two runs |
| `fingerprints-diff.txt` | …and the diff, committed so the classification can be re-checked without a checkout |
| `probe-turn27-baseline.txt` → `probe-turn28.txt`, `probe-diff.txt` | GEOM / SHAPE / TEXT / CENSUS, entity by entity |
| `handle-move-turn27-baseline.txt` → `handle-move-turn28.txt`, `handle-move-diff.txt` | F2b's own delta, hole by hole, on the sheet and in the room |
