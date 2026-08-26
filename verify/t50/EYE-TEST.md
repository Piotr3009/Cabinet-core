# T50 — the numbered eye test

Twelve frames, in the order the owner meets them. Every one was LOOKED AT
before this list was written; what is under each number is what I saw in it,
including the two things I would not have chosen.

Run it yourself with:

```
npm run build
npx vite preview --port 4173 &
node scripts/e2e-turn50.mjs            # → verify/t50/*.png + walk.log + verdict.json
```

---

## 1 · `f1-wall-editor-mid-draw.png` — **the frame CLAUDE.md asks for**

The wall editor mid-draw. One wall down, `3600` typed into its field, the
angle field carrying **90** to be overtyped, and the plan showing the gold
segment running off the start point. The hint under the plan reads *"Point the
way and click — the turn is 90° unless you change it. Then type the length.
Undo takes back ONE segment."*

**Look at:** the draft is drawn OVER the room it will replace. That is
deliberate — the plan holds both — but on a room the same size as the outline
being drawn the two lines sit close together. Nothing is wrong; it is worth
knowing before you draw over a 4 × 3.

## 2 · `f1-wall-editor-overtyped-angle.png`

Three walls: `3600` at 0°, `2400` at 90° (the turn taken by default), and
`2079.5` at **135°** — the angle field overtyped to 45 and the turn following
it. The app is saying *"4417.6 mm from the start. Come back within 150 mm to
close it, or finish it open."*

## 3 · `f1-open-chain-is-an-L.png`

The third wall undone — **one** segment, not the wall — and two left. Nothing
snapped shut. Applying this makes a three-corner room whose third edge nobody
typed; the plan draws that one dashed and grey, with no number on it, which is
the same grammar turn 14's stubs use.

## 4 · `f2-run-before.png` — **the frame CLAUDE.md asks for**

Six 600 mm cabinets on a 3900 mm wall, 260 mm left over, and the bar standing
in the gap:

> **260 mm left over ·** `Share it out equally · 643 mm each`  `…or 7 cabinets at 551 mm`

That is CLAUDE.md's own worked example for decision 2, appearing on its own.

**Look at:** the bar is ANCHORED in the gap but is wider than the gap is on
screen, so it reads across the last two cabinets. A 600-pixel strip cannot fit
in a 260 mm gap at this zoom; the alternative is a strip too small to read.

## 5 · `f2-run-after.png` — **the frame CLAUDE.md asks for**

One click later: 636 / 636 / 636 / 636 / 636 / 640, wall to wall, with the two
40 mm scribes left at the ends. No "Width limited by 02" anywhere — the plan
and the placement agree to the millimetre. Ctrl+Z takes the whole run back in
one step (checked in the walk, not pictured).

## 6 · `f4-the-panel-grows-itself.png`

A base unit added beside a tall one. Between them is a 25 mm board running the
tall cabinet's full height — the dimension names it — and in the middle of the
screen:

> T01: the app added a finishing end panel where this meets the cabinet beside
> it — right-click it and Remove if you do not want it.

**Look at:** it is a GREY, so it lives three seconds and goes. The walk takes
this frame within 150 ms of the add for that reason; if you walk it by hand,
do not blink.

## 7 · `f5-end-panel-cut.png` — **the frame CLAUDE.md asks for**

`W01 · End panel — right — END-R  606 × 1202.3 · 25 mm`. Under a flat ceiling
that board is 2250 tall; here it stops at the slope.

**Look at:** the CUT ANGLE is not printed in this window. This is the hand-edit
bench, not the drawing — the angle is on the piece (`meta.slopeCut.angles`,
33.0° in this fixture) and `cnc/partLabel.js slopeNoteText` prints it as
`CUT 33.0°` on the part drawing and the DXF, which is where F5 asks for it.

## 8 · `f6-shaker-cut-with-its-door.png`

A shaker leaf under the slope: the door is a pentagon and **the recess is
there**, its top edge following the cut. That is T46's named debt paid.

## 9 · `f9-wardrobe-menu-no-kitchen-fittings.png`

Add items on a WARDROBE. No Cargo pull-out, no Waste bins — absent, not
greyed. Also in this frame: `Add doors` as a button in this modal, which is one
of the three places F10's action still lives.

## 10 · `f9-kitchen-menu-has-them.png`

The same list on a KITCHEN base unit: `Cargo pull-out [SOON]` and
`Waste bins [SOON]` are there, and the wardrobe-only rows say *a wardrobe
thing*. Available where the family makes sense; absent where it does not.

## 11 · `f10-context-menu-two-entries-gone.png`

The right-click menu on a real right click: Edit cabinet…, Rename, Plinth, the
three end panels, Scribe fillers, the two pinned infills, Colour…, Save as
template, Center shelves, Rotate 90°, Back to wall, Side to wall, Delete.

No **Add doors**. No **Show all dimensions**. Delete is last.

## 12 · `f14-the-studio-a-quarter-darker.png`

The room at its shipped brightness — the slider at its default, times
`baseGain 0.75`. Nothing is blown out and nothing is muddy. The pillars are at
11 × 0.75 = 8.25 of what they ran at, which is 37.5 % of the 22 they were on
25.08 before the owner said *"za jasno świecą, ściemnij o połowę."*

---

## What the walk asserts that has no picture

`verify/t50/walk.log` carries all 27 checks. The ones with no frame of their
own are the refusals and the arithmetic:

* F3 — `01: the room is 2500 mm and this stands 100 mm off the floor — 2600 mm
  will not fit. 2400 mm is what is left.`
* F3 — `The room is 2300 mm and this stands 2250 mm off the floor — there is
  only 50 mm left, and a top box needs 200.` (the owner's own case, blocked)
* F7 — the cut door's `hinges: { was: 6, now: 5 }`
* F13 — `projectHeights.tall` and `wardrobe.defaults.height` both 2150
* F14 — `baseGain 0.75`, `pillars.intensity 11`
