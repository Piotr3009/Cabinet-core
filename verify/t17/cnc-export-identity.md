# CNC export identity — turn 17

CLAUDE.md, rule 0: *"CNC EXPORT: this turn has **FOUR named deltas**, and nothing
outside them. Fingerprint before/after and publish every one in
`verify/t17/cnc-export-identity.md`, in these words … Anything else moving in the
fingerprints is a REGRESSION, not a delta."*

This is that publication. Baseline: `34b00ec` — main after the turn-16 merge plus
the two chat packages. Branch: `claude/claude-md-turn-17-8gq35u`.

Evidence in this folder:

| file | what it is |
|---|---|
| `fingerprints-turn16-baseline.txt` | `scripts/cnc-fingerprint.mjs` run on `34b00ec` |
| `fingerprints-turn17.txt` | the same script run on this branch |
| `fingerprints-diff.txt` | the raw diff of the two |
| `delta-evidence.txt` | the same two checkouts probed ENTITY BY ENTITY — geometry, census, text — which is what turns "everything changed" into "one thing changed, on everything" |

`fingerprints-diff.txt` is total: every line differs. That is expected and it is
delta 1, because delta 1 is a change to a label that **every part carries**. A
hash cannot tell you *what* moved, so the entity-level probe is the document that
matters, and it answers three questions:

```
1. PER-PANEL GEOMETRY   every poly and circle of every existing file
     changed: 0        added (the two NEW kits): 14
2. SHEET CENSUS         every entity of every preset sheet, by type and layer
     changed: 0        added (the two NEW kits): 8
3. PER-PANEL TEXT       the one label each file carries
     changed: 128 of 128
```

Not one coordinate of any part that existed before this turn has moved in a
per-panel file, and not one entity has been added to or removed from any file.
What changed is the label, and where a SHEET is concerned, which way up a shelf
is put down.

---

## 1 · Every part carries its cabinet's number, inside the part

`engine/cnc/partLabel.js` is the one formatter, and both the sheet and the DXF
writer call it — CLAUDE.md F1.1 asks for exactly that, "so the two cannot word it
differently".

```
was: UNIT_NUMBER | 01-BUL          | 40 | 280,1075
now: UNIT_NUMBER | 01 BUL 560x2150 | 40 | 280,1075

was: UNIT_NUMBER | 01-01-F         | 40 | 298.5,1073.5
now: UNIT_NUMBER | 01 F 597x2147   | 40 | 298.5,1073.5
```

Three things to note.

* The LAYER is unchanged (`UNIT_NUMBER`, F1.4) and the POSITION is unchanged —
  the centre of the part's own nominal rectangle, which is what "inside the part,
  not beside it" (F1.2) has always been in the file.
* The second pair is a bug this fixes on the way past: a front's engine id is
  already `01-F`, so the old label printed the cabinet number **twice**.
  `partCode()` strips the prefix, exactly as `dxfFileName` has since turn 3.
* The size is spelled with an ASCII `x`. The sheet used to draw `560 × 2150` and
  now draws `560x2150`: this string goes into a DXF R12 file, which is the
  dialect VCarve on Piotr's machine parses, and R12 predates any agreement about
  what a byte above 127 means. The sheet takes the export's spelling rather than
  the other way round, because a label read off the BOARD and a label read off
  the SCREEN have to be the same label.

**The label FITS.** F1.3: "it never spills over the outline". The height was
capped at a share of the part's short side and never looked at its width, which
was harmless while the string was six characters. It now shrinks to the width as
well, and on a board too narrow for the whole string at the readable floor — a
30 mm scribe filler — it TRUNCATES (`01 FIL~`) rather than hanging over both
edges. The tail is an ASCII `~` for the same reason as the `x`.
`test/cnc-export-identity.test.js` asserts the fit on every part of every file.

**Size on screen** (F1.3): the in-part caption is now set at the yellow section
heading's own type scale — `profile.cnc.annotation.partLabelMm` equals
`sectionLabelMm`, held equal by a test — and shrinks to fit the part. Screens:
`1a-part-label-near-zoom.png`, `1b-part-label-far-zoom.png`.

Fingerprints (the walk's own unit — WARDROBE 600 × 2150 × 578, 2 shelves,
3 drawers, rail, doors):

| what | was | now |
|---|---|---|
| `01-BUL.dxf` | `2165ad2e` | `216a6f6c` |
| sheet, all parts | `5692ffcb` | `4b3d4bb8` |
| sheet, non-sprayed | `74ccd107` | `d69ce32d` |
| sheet, sprayed | `a467790b` | `9c45132b` |
| sheet, fronts | `a467790b` | `9c45132b` |

`01-BUL.dxf` is delta 1 alone — a side panel is not a shelf, so delta 3 does not
reach it. The two sheets that contain shelves carry delta 3 as well.

## 2 · Everything that is NOT that in-part label leaves the exported DXF

Owner: *"żadnych innych liter bo to nam zaśmieca program w CNC."*

The honest report: **nothing had to be removed, because nothing else was ever
written.** `panelEntities` emits exactly one TEXT entity per part and there is no
other code path in `engine/cnc/dxf.js` that can emit one. What this turn does is
make that a RULE instead of an accident, and it does it at the moment it would
first have been tempting to break:

* **The new by-material export could have carried the sheet's headings and does
  not.** F2.1 gives the owner a board picker — one material, one file, across
  every ticked cabinet, laid out by the same `layoutPanels` the preview draws
  with. The preview draws a yellow header over each section and a cabinet name
  over each block. `materialSheetEntities` composes `sheetEntities` and nothing
  else, so there is no path from either of them into a file.
* **It is pinned.** `test/cnc-export-identity.test.js` → *"DELTA 2: the exported
  DXF carries the labels and NO other lettering"* asserts, on BOTH export paths,
  that the number of TEXT entities equals the number of parts and that every one
  of them is a part label.

The census above is the other half of the proof: `text:UNIT_NUMBER` is exactly
the part count on every preset of every kit, before and after.

Screens: `2a-export-by-material-picker.png`.

## 3 · Shelves are laid out rotated 90°

Owner: *"odwróć wszystkie półki o 90 stopni w CNC — zobacz, w 3D orientacja jest
dobra ale nie współgra z CNC."*

Written down, the disagreement is this. Every board in this app is nested with
its GRAIN RUNNING UP THE DRAWING — a side is drawn 560 × 2150, a back
600 × 2150, a door 597 × 2147, and a TOP is drawn TURNED for exactly this reason
(`drawTOP_ROT90`: 560 × 564, the internal width up the page). One family is not:
a SHELF is drawn `width × depth`, so on the sheet the shelf and the top of the
same carcass lie at 90° to each other while in the 3D view they are parallel
boards with parallel figure.

**It is the PLACEMENT that turns, not the part.** CLAUDE.md's own word, and it is
the right one: the shelf's own CNC frame does not move a millimetre, so
`fixtures/golden-partition-biscuits.json` — which pins a shelf's biscuit marks in
that frame — is untouched, the per-panel DXF is untouched, and
`engine/joinery.js`'s mapping back into the cabinet is untouched. What moves is
`engine/cnc/layout.js`: `sheetTurn()` says which parts are put down turned and
`turnPoint()` turns them, and the DXF writer applies the same transform the
preview does. **Turn 0 is the exact identity**, which is why a sheet with no
shelves on it is byte-for-byte the sheet it was.

The scope is CLAUDE.md's — the horizontal boards a joiner calls a shelf
(`SHELF`, `PARTITION`, `RAIL-PART`, `FIXED`) — and inside it the question is
asked of the DRAWING rather than of the part's name: a shelf board already nested
grain-up is left where it is. That matters on the fridge's and the oven's FIXED
panel, which the kit draws `depth × width` like a TOP; turning it by name would
have laid it across its own grain, which is the very complaint this answers.

Pinned by `test/turn17-phases.test.js` in CLAUDE.md's own terms — *"for every kit
that has shelves, the part's grain axis in the export matches the panel's grain
axis in the cabinet frame"* — and by the same assertion over the TOP, the BOTTOM,
the side and the back, because the shelf is joining a rule the rest already obey.

Screens: `3a-shelf-grain-3d.png`, `3b-shelf-grain-sheet.png`.

## 4 · Dog bones that the export already cuts become visible on the part

Owner, on drawers: *"jak je edytuję to nie mają żadnych wcięć, nie widzę
dziurek."* On a fridge back: *"na CNC są dog bones a na elemencie nie ma."*

**It is the VIEW that moves, and the census proves it.** `PUZZLE_DOG_BONES` is
cut exactly as often as it was — 18 polys on the walk's wardrobe sheet, before
and after — and so is every other layer. Not one entity was added to a file.

What changed is that the cabinet editor and the detail window now DRAW them.
`engine/joinery.js machiningLines()` reads `panel.cnc` and `result.drills` — the
same two records `engine/cnc/dxf.js` writes a file from — and `3d/PartMachining.jsx`
puts them on the piece in the CNC preview's own layer colours. There is no second
drawing of a dog bone in this app and there must not be one: where the two ever
disagree the export is the truth and the view is the bug.

The cause of the owner's two complaints was one switch. `panelPlacement` answers
"where does this part's CNC frame sit in the cabinet", and for a drawer side, a
drawer front, a door and the fridge's back RAILS it answered `null` — a part with
no frame has nowhere to put its own drilling. Those cases are now written, each
checked the way the BUL/BUR pair has always been checked: against the DRILLING.
`test/turn17-phases.test.js` walks every kit and asserts that no part carrying a
pocket, a mark or a hole is left without a frame.

`test/cnc-export-identity.test.js` → *"DELTA 4 is a VIEW change: the layer census
cannot notice it"* holds the dog-bone count. **If that count ever FALLS, the
opposite bug has happened and it is a BLOCKER, not a delta** — CLAUDE.md says so
and the test says so.

Screens: `4a-drawer-pockets-in-the-editor.png`, `4b-drawer-detail-both-pockets.png`,
`5a-fridge-back-dog-bones.png`.

---

## What else is in the diff, and why it is not a fifth delta

`fingerprints-turn17.txt` has 296 lines that the baseline does not. Every one of
them belongs to `DW_PANEL` or `OVEN_BASE` — the two kits CLAUDE.md F9 and F10 ask
for. A kit that did not exist has no fingerprint to change; these are additions,
listed separately, exactly as turn 12 listed its new drawer variants.

Two smaller things travelled inside the four, and both are named here so that
neither is discovered later as a surprise:

* **The fridge's `FIXED` panel gained `rotated: true` and its `drawn_w`/`drawn_h`.**
  It has always been drawn `internalDepth × internalWidth` and never said so, and
  nothing asked until the label went INSIDE the part: `cncRect` fell back to the
  CUT dimensions, which are the other way round, so the caption was set out in a
  564-wide frame on a board that is 540 wide and stood outside its own outline.
  Its geometry is unchanged (`FILE-GEOM` for the fridge does not appear in the
  diff); only the label's position moved, which is delta 1's own business.
* **The hinge CUPS are now `centre + doorExtend` instead of three per-kit offset
  tables.** The three tables were three ways of writing "a cup is at the height
  of its hinge" and they all come out the same to the millimetre — the whole test
  suite, `test/slots-and-hinge.test.js` included, passes unchanged, and no
  fingerprint moved because of it. It is here because it is what makes F7 work:
  a door that loses its middle hinge has to lose its middle cup, and a hinge
  moved by hand has to take its cup with it.
