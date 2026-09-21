# CLAUDE.md, TURN 71 · THE SET: ONE VIEW PER SHEET, THE SAME LAW ON EVERY SHEET

Run autonomously. Skip-and-note. Full suite, never `--silent`. Frames under
`verify/t71/`. Nothing lands in Petros and nothing is pushed without the
owner's own "tak".

## THE ORDER
The owner, 21.09.2026, with Skylon Joinery's AutoCAD set for 3-7 Herbal Hill
(Rev A, six A3 sheets) on the table:

*"zobacz jak wyglądają plany pdf, przeanalizuj dokładnie i pokaż mockupy jak
proponujesz zrobić w CC, bo nasze w CC teraz się nakładają, a tutaj jest
wszystko osobno; chciałbym mega profesjonalnie; pokaż też PDF z perspektywy
oraz wizualizację; nie zapomnij zostawić w stopce miejsca na firmę, daty,
nazwy."* Then, on the mock-up: *"zajebiste, ale żeby tylko odzwierciedlało
rzeczywistość, nóżki żeby były takie jak wszędzie."* Then: *"chodziło mi o
kształt nóżek jak na wizualizacji, i całą resztę dokładnie przeanalizowaną,
weź zakoduj i zobaczymy co się dało z tym zrobić."*

## LAWS
**The engine draws only what it published.** Every box on every sheet is a
`computeCabinet` panel, a `drillSummary` hole, an `assemblies` leg, a design
layer worktop, a room wall. Nothing is typed onto a sheet. **The sheet is a
law:** A3 landscape, frame at 10, one title strip of seven cells across the
whole width, a column of key plan, legend and notes down the right, and an
object area with a 26 mm dimension band on every side. Nothing enters another
zone, which is why nothing overlaps. **Every dimension once, in its home:**
wall run above, floor run and scribes below, the overall on the second line,
heights on the right, bases and the ceiling on the left; a figure that does
not fit its segment is lifted on a leader, alternating. **The scale is a rung
of the ladder and is printed** ("1:20 @ A3"); a picture is NTS. **1:1 = COPY**
and **LISP IS LAW** stand; neither is touched tonight, because no cut geometry
is.

## FROZEN
1. Goldens x6 byte-identical. The set is DRAWING code: it reads the published
   result and writes nothing back. `scripts/t71-classify.mjs` names every
   engine file touched and proves no delta is on `computeCabinet`'s graph.
2. The unit card and the booklet are untouched (iron rule 4): `sheet.js`,
   `unitCard.js`, `card.js`, `frontElevation.js`, `wallElevation.js`,
   `section.js` read-only; the T43 golden of the card compared byte for byte.
3. `cabinet.js`, `doors.js`, `room.js`, `worktop.js` read-only.
4. PRO freeze: two files licensed in `test/turn59-f1-the-switch.test.js`
   `EXEMPT`, each with the owner's words and re-frozen at its new hash:
   `DrawingModal.jsx` (the window binds the set: worktops, render, title
   block, numbered sheets) and `ConfiguratorPage.jsx` (`rig={renderRig}`, the
   menu path). Overturnable with one word; without them the set still binds
   from the engine, with no render and no company name.
5. No em or en dash in anything written tonight.

## F1 · THE SHEET LAW (`engine/drawings/setSheet.js`, `profile.js drawings.set`)
`setZones`, `chooseSetScale` (ladder 10/15/20/25/50, fill 0.96, else NTS),
`drawingContext` (paper sizes in drawing mm, so every figure prints at one
height whatever the scale), `layoutSetSheet` (a drawing is `measure + build`,
or built once at 1:1 to measure and again at the chosen scale, or laid in
paper mm), `titleStrip` (STATUS A/B/C ticked, COMPANY with logo box, name,
tagline and lines, CLIENT / SITE ADDRESS / PROPERTY OF, PROJECT / DRAWING /
DRAWING No, DRAWN / CHECKED / DATE, JOB No / SCALE / PAPER, REV / SHEET n of
N), `keyPlan`, legend, notes, `fitEntities` (the cover's picture).

## F2 · THE CHAINS (`setChains.js`)
`chainH`, `chainV` with extension lines, filled arrowheads, figures at paper
height; the collision rule (lifted with a leader, alternating);
`figureCollisions` is the invariant every sheet is tested against.

## F3 · THE WALL, TWICE (`setElevation.js`, `views.js` one guard)
Front view: the engine's fronts with the shaker frame the project quoted,
handles where drilled, the design layer's worktop, wall ends and ceiling,
appliance spaces named by TYPE ("D/W behind", "FRIDGE behind"). Internal
layout: fronts off; shelves, drawer boxes on their runners, the hinge plates
the side is drilled for (`side_hinge_holes_y`, three per 770 door), the
scene's leg (plate, stem, foot from `profile.hardware.leg`, at
`assemblies.legs.positions`, one per x in elevation), unit numbers on white in
the clear band.

## F4 · THE PLANS AND THE SECTIONS (`setPlan.js`, `setSection.js`)
Two plans, cut at `set.planCut` (400 through the base run, 1700 through the
wall run), measured on the room's walls (4420 x 3200 lands on 1:20), the door
leaf and arc, section marks A and B, unit numbers, chains of every cut member
per wall with the wall ends, the depth chain. Sections: A-A through the first
drawer unit, B-B through the sink, a chosen cabinet as one more station, side
by side at one scale, each with the wall band, floor, ceiling, worktop slab,
legs and its own chains.

## F5 · THE SET, BOUND (`wallSheets.js`, the window, the menu)
00 cover (index with every sheet's number, name and scale; revisions;
conventions; general notes; the first wall's perspective fitted), 01 and 02
the plans, then per wall the front view, the internal layout and the
sections, then per wall the perspective, the visualisation, the cut list
(paged down four columns, the totals on the last). Numbered `NN / of`, drawing
number `job-NN`. `titleFor` reads `project.titleBlock` (company, address,
drawnBy, checkedBy, status, rev, date, revisions); the store's
`setTitleBlock` writes it and remembers the company on this computer. The
worktops resolve from the design's records when the caller passes none. No
cabinet against a wall: no set. The window walks the numbered sheets, carries
the title block's fields, captures the render through the Output ▸ Render rig
(three-quarter left, at the picture's aspect), hides the paper choice; the
menu says "Drawing set (PDF)" and "Drawing set (DXF)".

## F6 · THE PERSPECTIVE (`setPerspective.js`)
A pinhole camera at eye height in the room; the engine's boxes (units with
fronts, plinths, end panels, worktops) painted farthest first, white-filled,
so a nearer box covers what stands behind it; handles and numbers; NTS.
Stated simplification: painter's order, not a hidden-line pass, which is exact
for boxes in a row along one wall.

## F7 · THE PAPER SHEETS (`setPaper.js`)
The cover, the cut list (every panel per unit, fronts in magenta, the engine's
own counts and areas), the visualisation (the render in a frame at its own
aspect, the finishes beside it, or the sentence saying what it waits for).

## F8 · THE ENTITY MODEL (`primitives.js`, `svg.js`, `dxf.js`, `lib/drawingExport.js`, `layers.js`)
`poly` (closed or open, filled or not) and `image`; text learns right
alignment, a white mask, bold, a colour, a fixed paper height. Three layers
added. The four older kinds and every older layer untouched.

## TESTS AND PROOF
`test/turn71-the-set.test.js` (the zones, the scale, nothing leaves its zone,
the strip, the key plan, appliances by type, the chains and the collision
rule, each dimension once per home, the legs from the engine's shape, the
plates from the drilling, the worktop resolved, the plans, the sections, the
perspective, the order and numbering, the cut list's pagination, the
visualisation's frame, the renderers, the window, the store, the card golden).
The T40, T41, T42, T43 set tests re-pinned to the set with the reason beside
each. Full suite; goldens x6; the classifier; the T59 freeze with the two
licensed files. Frames `verify/t71/NN-*.png` per sheet, from
`scripts/t71-render.mjs` on the Herbal Hill fixture.

## KNOWN GAPS, STATED SO THEY ARE NOT LOST
The company logo (a data URL on `titleBlock.company.logo`, drawn by the strip
when there is one; no upload yet) · the visualisation without a scene behind
the window (headless, tests) carries its frame and sentence · the section
stations are the set's law (drawer unit, sink) plus one chosen cabinet, not a
free list · hidden lines in the perspective are painted, not computed · the
retail app does not bind the set (workshop tool) · the eight questions from
the mock-up (scale label, statuses, chains, plans, sections, rig, unit cards,
turns) still open for the owner.
