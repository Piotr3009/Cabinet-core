# CNC export identity — turn 16

CLAUDE.md rule 0, this turn:

> CNC EXPORT: byte-identical EXCEPT one named delta this turn — **SHEET
> GROUPING moves from sprayed/non-sprayed to ASSIGNED MATERIAL (F2)**. Part
> GEOMETRY does not change; which sheet a part lands on may. Fingerprint
> before/after, publish in `verify/t16/cnc-export-identity.md`, and name the
> delta in those words.

## The delta, in those words

**SHEET GROUPING MOVES FROM SPRAYED / NON-SPRAYED TO ASSIGNED MATERIAL.**

Same part set. Same geometry. New sheet membership.

Three things changed, and all three are on the SHEET rather than in a file:

1. **The sprayed / non-sprayed toggle is gone from the CNC view.** The two
   preset buttons that selected parts by whether they meet a spray gun are no
   longer offered (`VIEW_PRESETS` in `src/engine/cnc/groups.js`, rendered by
   `components/CncTree.jsx`). What is left is the two selections that are about
   the PARTS: the whole unit, and the fronts.
2. **The by-material view groups by the PROJECT'S OWN ASSIGNMENT.** It used to
   ask the purchasing table (the assignment store, one board per BOM role for
   the whole project). It now asks `engine/materials.js resolvePanelMaterial` —
   the carcass type's board, the front type's board, the run-piece switches, and
   an element override where there is one. Same resolution the BOM prints, the
   3D view paints and the check-out gate reads (F1.5).
3. **Identity is `material_id`.** One board is one section, whatever it is
   sprayed and whatever thickness a part happens to be cut at. Three materials
   in the project are three groups.

## The fingerprints

`scripts/cnc-fingerprint.mjs` writes one line per unit type per case per file —
a 32-bit FNV-1a of the actual DXF text the browser path would write, taken from
the pure generator (`engine/cnc/dxf.js`).

```
git worktree add /tmp/t16-base 1ffc880          # the turn-16 baseline
node scripts/cnc-fingerprint.mjs > head.txt
(cd /tmp/t16-base && node scripts/cnc-fingerprint.mjs > base.txt)
diff base.txt head.txt
```

```
2050 lines compared
0 lines differ
```

**The exported bytes did not move at all.** Every per-panel DXF, every one-file
sheet, every preset, on every unit type and every case the script builds — the
plinth run, the bottom mask, the mitred infill corner, the partition on a fixed
shelf — is the file it was on the baseline.

`test/cnc-export-identity.test.js` holds the same claim in the suite and is
unchanged and green: the per-panel fingerprint (`2165ad2e`), the whole-unit
sheet (`5692ffcb`), each preset's sheet, the layer census, and the two
assertions that the VIEW cannot reach the export.

## Why the export did not move, given that the grouping did

Because the grouping that moved is a VIEW, and turn 15 built it that way on
purpose (`src/engine/cnc/views.js`: "Nothing here is imported by
engine/cnc/dxf.js, engine/cnc/layout.js or lib/cncExport.js; it is read by the
SCREEN"). Turn 16 changes what the sections are made of and leaves that boundary
where it is:

- `EXPORT_PRESETS` still contains `sprayed` and `non-sprayed`. They are removed
  from the SHEET, not from the module — `sheetDxfFileName` names a file after the
  preset a selection happens to be (`01-cnc-non-sprayed.dxf`), and deleting them
  would rename files in a workshop's folder.
- The one export-path change in the turn is a file NAME, and it is a no-op for
  every project that has not renamed a cabinet: the per-unit ZIP is now
  `fileSafeName(unitNum)` (`engine/naming.js`), because F6 makes a cabinet's name
  the owner's and a name may contain a space or a slash. `01` → `01`, `WU05` →
  `WU05`; `Kitchen island / left` → `Kitchen-island-left` instead of a path the
  machine cannot open. The DXF names inside the ZIP have been sanitised the same
  way since turn 3.

## Sheet membership, before and after

The delta a workshop will actually see, on the example the walk builds
(`verify/t16/4a-cnc-by-material.png`): carcasses on MFC White W980, doors on the
MDF shaker blank, a second front type on melamine, and the plinths taken off
"Same as fronts" onto birch ply.

| | before (turn 15) | after (turn 16) |
|---|---|---|
| sections come from | assignment store, by BOM role | the project's own assignment |
| a door on Front 2 | the `front` role's board — one board for every door in the job | Front 2's own board |
| a plinth | the `plinth` role's board, or "Unassigned" | front 1's board, or its own if the switch is off |
| two boards, same colour | two sections | two sections |
| one board, two colours | one section | one section |
| one board, two thicknesses | **two** sections | **one** section |
| the sprayed/non-sprayed buttons | on the sheet | gone |
