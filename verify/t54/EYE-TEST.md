# TURN 54 — the eye test

*Ten things to look at, in the order the owner asked them. It starts with the
trio close-up, as the spec orders the morning to. Each item names what you
should see and what it would mean if you did not. Every picture in this folder
was opened and looked at before this file was written.*

---

## 1 · THE TRIO, EDGE-ON — three boards, three lines, no stack

His audit scene rebuilt to the millimetre: wardrobe, spadek w prawo,
β = 26.5651°, infill 40, W = 600, ceiling 2000 → 1700 over the carcass floor
(room 2100 on a 100 plinth, rake to 1800). Look at the raked corner.

**The roof lies on the CUT line. The strip stands above it, its top on the
ceiling, its bottom on the roof's top — parallel lines a perpendicular 40
apart. The shelf is under the roof, on its underside. Nothing overlaps
anything.**

*Before tonight all three carried the same pivot — the ceiling at the low
end — and lay ON each other: TOP-top→ceiling 0.00 where a −40 band belonged,
TOP∩FACE 18 mm the whole length, SHELF congruent with TOP, FACE-bottom 4.72 mm
short of the cut (40 along the slope is not 40 vertical). That measured table
is committed in the header of `test/turn54-f1-the-trio.test.js` as the
BEFORE.*
— `f1-the-trio-close-up.png`, `f1-the-owners-scene-after.png`

The scene checks itself: the three pivots in the walk read
(600, 1720) · (600, 1675.28) · (600, 1655.15) — the ceiling, the cut line,
the cut line less the roof — three numbers where one used to stand.
The probe (`audit/f1.txt`) rotates the trio through the scene's own transform
and measures every station: **worst residual 0.0006 mm**.

## 2 · The two-knee run

Three 1200 wardrobes under a ceiling that rakes up from BOTH ends: two knees,
both falling inside the end cabinets. The strip follows the rake at each end,
turns at the knee, and runs flat over the middle — every segment on its OWN
two lines. The small pieces at the walls are the run strip's scribed ends,
not patches.
— `f1-the-two-knee-run.png`

## 3 · The PEAK side — BUR cut on the slope exactly like BUL

The rake RISES into the unit's side. The roof runs on the rake **to that
side's OUTER face**; the side's top edge is **bevelled at β meeting the
roof's underside**; the strip rides above the roof to the ceiling. **No third
piece anywhere in the band.** Both hands are shot — his complaint was BUR
("górny skos znowu jakieś małe kawałki"), and BUL proves the symmetry.

*The kawałek's graves, named: a sub-G stub the ceiling cap used to cut off
the raked roof at the peak side (killed in `roofPeakMerge`, its census is now
a permanent test), and a run-strip sliver born where the strip read the
CAPPED roof line instead of the ceiling (died with F1's two-reach law).*
— `f2-the-peak-at-BUR-corner-close-up.png`, `f2-the-peak-at-BUL-corner-close-up.png`

## 4 · The door leaf is CUT on the slope its shaker already knew

Wardrobe under the rake, door on. **The leaf's top edge is one β-cut under
the line; the shaker frame runs PARALLEL inside the cut edge at the flat
inset.** Before tonight the shaker raked while the leaf stood a full
rectangle into the triangle — `doors.js` contained the word "slope" zero
times.
— `f3-the-leaf-cut-on-the-slope.png`

## 5 · The double pair across the knee

A 900 wardrobe, two leaves, the knee falling between them. Each leaf is
clipped by the line over ITS OWN span: the walk measures FL 2057, FR 1937 —
the line tells them apart. Hinges hang on the tall stile; every cup keeps its
edge distances on the CUT outline (the suite holds the cup law).
— `f3-the-double-pair-across-the-knee.png`

## 6 · The road to the watch drawer exists — and 120 is the number

T53 shipped the modal and forgot the handle. Tonight:
**double-click the watch drawer's front in the scene** → `watch-layout`
opens BESIDE the click (house modal law). **The "Watch drawer" row** on a
unit that has one opens the same modal beside the row. And the drawer stands
at the DERIVED 120: `40 + 9 + 2 + 15 + 18 + 36 = 120` — the inside depth
went 60 → 40 in KIT_WATCH_DRAWER.lsp first, with the trade note that a 44–48
chronograph no longer lies flat, and his veto line beside it.
— `f4-the-modal-beside-the-clicked-drawer.png`, `f4-the-menu-road.png`,
`f4-the-120-drawer-in-the-wardrobe.png`

## 7 · The LED icons show while the Lighting panel is open

Six base units, NONE selected, panel open (dragged aside by its own bar —
that drag is the house law, exercised). **L LED / R LED stands on every
unit** — the icons people never found because they only lived on a selected
cabinet. Panel closed = exactly yesterday's scene; the gate is one visibility
condition, no new modal, nothing added to the cabinets.
— `f5-twelve-icons-none-selected.png`

## 8 · The room light lives UNDER the LED controls — and exports ignore it

Scroll the same panel: SCENE LIGHT, one slider, 0.4×–1.5×, saved with the
project. The room behind visibly dims at 0.40×. **The iron rule of 24.08
stands and is measured**: the render was taken at 0.4× and again at 1.5× and
the two files are **byte-identical** (`cmp` returned nothing) — the export
rig never reads the slider.
— `f5-the-scene-light-slider.png`; the pair itself is committed:
`f5-export-low.png` / `f5-export-high.png` — run `cmp` on them.
(`turn51-f6` pins the stamps, `turn54-f5` holds the parameters.)

## 9 · The shoe is a DRAWER

The stack scene: two plain drawers and the shoe face in the SAME front
rhythm — plane, split, gap, oversize, no fixed 120 face. Open the boxes:
**a plain flat drawer at side 80** — puzzle drilling, Blum runner by the same
NL law, setback 50, delta 36. No steps. No battens. No floor slope. The
probe proves it board for board: shoe drawer vs plain drawer of the same
carcass — every board, hole pattern, runner id and DXF outline EQUAL except
the side height and what derives from it.
— `f7-the-shoe-in-the-front-rhythm.png`, `f7-the-box-open-flat-bottom-side-80.png`

## 10 · The old world is buried, and old jobs walk in

A T5x save with `kind:'shoe_box'` loads as a `variant:'shoe'` drawer — same
id, same zone, steps and battens vanished, Check rule 12 (yellow) names the
conversion: "shoe rebuilt as a drawer — review fronts". Fronts hidden in the
picture so the migrated stack itself is visible. The paren census reads
**13 kits** (derived, never typed) — `KIT_SHOE_BOX.lsp` is the grave licence
(2) named.
— `f7-the-migrated-old-project.png`

---

*F6 has no picture by design — the spec gave it no Screens line. Its proof is
fake-timer tests: shows → 30 s idle → hidden via the same toggle the button
uses; an interaction at 29 s defers; manual hide cancels; the timer never
turns dimensions ON (`test/turn54-f6-dimensions-sleep.test.js`).*
