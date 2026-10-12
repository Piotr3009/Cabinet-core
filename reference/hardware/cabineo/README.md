# Cabineo: the data is here

CLAUDE.md T78 F20 (11.10.2026): *"THE DATA IS IN THE REPO:
`reference/hardware/cabineo/Operating_instructions_Cabineo.pdf` (Lamello's
own sheet, 2 pages; page 2 is the machining drawing). No fetching. Read it
with a PDF reader and write `reference/hardware/cabineo/cabineo.json`."*

This folder now holds two files of Lamello's and one of ours:

- `Operating_instructions_Cabineo.pdf`: Lamello's operating instructions for
  Cabineo 8, Cabineo 12 and Cabineo 8 M6, DE/EN, Lamello Art.No. 986320VS,
  edition 02/24 (the owner dropped it in, 11.10.2026). Page 1: the product,
  the machines, assembly, technical information, applications (minimum panel
  thicknesses), the strength table. Page 2: machining, four mountings, three
  machining options each.
- `cabineo.json`: every number of the sheet, as printed, with the page and
  the drawing it comes from beside each group, `"status": "owner to
  confirm"`. Nothing in it is fetched from the web or taken from memory. A
  value that is `null` is NOT on the sheet, and the sentence beside it says
  what is missing.
- this README.

The system ids `cabineo8` and `cabineo12` are chosen in the company's default
settings (`joints.system`); the engine's refusal of T75 (*"Cabineo is
reserved: its data is not in the repo yet"*) lifts only when the LISP and the
engine of F20 land, reading their numbers from `cabineo.json` and from
nowhere else. Until then this file and the JSON are data, and no code reads
them.

## What is in `cabineo.json`

Shape: `system`, `units`, `status`, `source`, then the data, like
`reference/hardware/aventos.json` and `cliptop-hinges.json`. Every group
carries `pageOf` (1 or 2) and `drawing` (which table or drawing of that page
prints it, with the printed strings). Three kinds of value:

- a printed number: as the sheet prints it;
- `null`: the sheet is silent; the `...Note` beside it says so;
- `derived`: arithmetic on printed numbers, with `how` saying which.

Keys, in order:

- `source`: the file, the publisher, the document number (986320VS), what
  each page holds, how it was read (pdftotext and the pages rendered at 400
  dpi), and the caveat above.
- `connector`: the overall size 33.8 x 16.5 x 10.8 (page 1, Technical
  information; the isometric prints 10 for the body below the collar), the
  cutter limit (<= dia 12), the housing material, the installation tolerance
  (longitudinal +/- 0.1), the screwing torque (ca. 2.5 Nm, speed 1, Assembly
  panel 4), the sheet's four claims ("no edge drilling" among them) and the
  five machine types it names.
- `variants`: `8`, `12`, `8M6`. Per variant: the screw reach `X` beyond the
  board's end (8 / 12 / 8, page 2 captions), the screw's finish, the colours
  pictured, the minimum panel thicknesses of page 1 for a corner joint (the
  panel that takes the screw >= 9 / 13 / 14, the board that carries the
  connector >= 12) and for a centre wall (>= 16 / >= 24 / 14 to 16), the
  strength table (F1 tensile, F2 and F3 shear, 19 mm beech, MDF and particle
  board, in N, every value with the sheet's asterisk), and `article: null`.
  `8M6` also carries its insert (with insert 12.3 mm).
- `spacing`: `edgeMinMm` 20 and `maxMm` 300 (page 1, Assembly panel 1). The
  profile's set-out (end offset 50, pitch 250, T78 proposed) must sit inside
  these; the profile holds those two, not this file.
- `counterpartHole`: dia 5 in the FACE of the panel that takes the screw, on
  the joint line, one per pocket, its axis 5 mm from the collar seat. Its
  depth is not printed (`null`): the sheet gives the screw's projection `X`
  and the minimum thickness of that panel instead. `D-5` on the sheet is not
  this depth; see the notes.
- `mountings`: `surface`, `flush`, `flushCap`, `hpl` (page 2, the four
  bands). Per mounting: the pocket depth (11 / 11.5 / 13 / 11), the axis
  from the collar seat (5 in every band), the axis to the far face as the
  sheet prints it (`D-5`, `D-5.8`, `D-7.1`, `D-5`), the collar or cap recess
  (none / 0.8 / 2.1 / none), the uncaptioned dimension printed at the pocket
  floor (none / 0.7 / 0.95 / 1), the derived axis from the surface (5 / 5.8 /
  7.1 / 5), and the recess outline where the band draws one (`flush`: 16.7
  wide, its length not printed; `flushCap`: 18.8 wide, end radius 9.4, its
  centre 0.25 beyond the third lobe at 26.25, length 35.65). `hpl` is
  captioned for Cabineo 8 M6 only.
- `machining`: `drill15`, `cutter10`, `cutter12` (page 2, Options 1 to 3 of
  every band), each with a `standard` set (the three standard bands print the
  same numbers) and an `hpl` set (the HPL band prints its own). The frame is
  the sheet's: x from the board's END along the board, y across it with the
  screw axis at y = 0, the pocket open at x = 0.
  - `drill15`: three dia 15 holes, the first centre 3.6 from the end, pitch
    11.2 (HPL: dia 15.2, 3.5, 11.2).
  - `cutter10`: three dia 15 lobes at 3.6 / 14.8 / 26, the waists at 9.2 and
    20.4, half-height 5 at a waist and 6.6 where the outline meets the end
    (HPL: dia 15.2, 3.5 / 14.7 / 25.9, 9.1 / 20.3, 5.2, 6.6).
  - `cutter12`: the same lobes joined by a straight 12 mm channel (half
    6), the two straight sections starting at 8.1 and 19.3, each 2.2 long,
    and the sheet's footnote F3 shear strength -13 % (HPL: 6.8 at the end,
    8.2 and 19.3, each 1.8).
  - `consistency`: a check that the printed numbers agree with three dia 15
    circles at those centres (they do).
- `cap`: drawn on the sheet, no article, colour or size printed: `null`.
- `articles`: all `null`. The sheet prints only its own document number.
  CLAUDE.md expected 186310 for Cabineo 8 "as the sheet's page 1 names it";
  page 1 does not name it (the text layer was searched and both pages read).
  The owner supplies every article from Lamello's price list or the box.
- `owner`: the owner's own point of 11.10.2026, decided and not proposed:
  Cabineo drills NO panel edge; the pocket is milled into the FACE of the
  horizontal board (top, bottom, fixed shelf) at its end, the channel open to
  the end, and it is cut from the OUTSIDE face (the top from above, the
  bottom from below, a fixed shelf from its underside, with the cap); the
  screw passes through the board's end into a 5 mm hole in the FACE of the
  side, drilled from the inside. The consequence for the side's hole (5 / 5.8
  / 7.1 from the board's outside face by the mounting), `machinedFace:
  'outside'`, the DXF reflection `x' = W - x` through T76's one reflection,
  the `OUTSIDE FACE UP` label and the T76 skin check are written out there
  for the LISP and the engine to mirror.
- `profileChoices`: a pointer, no numbers: the mounting (`flushCap`) and the
  machining option (`cutter12`) are chosen in `src/engine/profile.js`
  (`// T78 proposed`, the owner's Biesse mills; he decides), as are the pitch
  250, the end offset 50 and the `confirmed: false` gate on the CNC export.
- `notes`: every place the sheet's printed number differs from what CLAUDE.md
  expected, and every place the sheet is silent.

## What is still not on the sheet (nothing invented)

- Article numbers: the connectors (8, 12, 8 M6), the 8 M6 insert, the cover
  caps. The sheet names none. CLAUDE.md's 186310 is not on it.
- The depth of the 5 mm hole in the panel that takes the screw. The sheet
  gives the screw's projection (8 / 12 / 8) and that panel's minimum
  thickness (9 / 13 / 14 for a corner joint).
- The screw lengths, the cap's size and colours, the full length of the
  flush collar recess, the meaning of the uncaptioned floor dimensions
  (0.7 / 0.95 / 1) and of the 1 mm printed at the 8 M6 insert.
- Lamello's CAD files (the T75 README asked for them). Nothing here comes
  from a CAD file.
- Strength values for any panel other than 19 mm.

## The chain from here

`reference/lisp/SKYLON_JOINTS_CABINEO.lsp` (LISP first) reads these numbers
and draws the pocket (by the chosen machining option), the counterpart hole
and the cap recess, board by board; the engine mirrors it for `cabineo8` and
`cabineo12`; the cap and the connector are BOM lines (articles owner to
supply); the same `confirmed: false` gate as the dowels blocks the CNC export
in words until the owner confirms the numbers; the goldens
`golden-cabineo8-bud.json` and `golden-cabineo12-bud.json` prove the
outside-face reflection (a pocket 3.6 from the end lands 3.6 from the end in
the reflected DXF). None of that is in this folder; this folder is the data.
