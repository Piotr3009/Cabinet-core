# TURN 51 — the eye test

*Twelve things to look at, in the order they take least clicking. Each one names
what you should see and what it would mean if you did not.*

---

## 1 · The wall editor is gone, and the four tools are back — BOTH doors

**Settings ▸ Room setup**, then **File ▸ New project → Whole room**.

You should see the same screen twice: `Rectangle`, `L-shape`, `+ Box` and
`Import DXF plan…`, and **no** `Draw walls`.

*If the two doors differ, F1's "same screen" fell.*

## 2 · A box, in a ONE-WALL job — the one that had no button

Start a job with scope **One wall**, then **Settings ▸ Room setup**.

`+ Box` should be on screen. Press it, press Apply, and the pillar should be
standing in the room.

*This is the whole of "nie pokazuje się": before tonight there was no button on
that screen at all.*

## 3 · An alcove and a chimney breast, in the room

**Settings ▸ Wall setup ▸ Top**, `Add recess`, `Add chimney`, Save.

Look at the room. The alcove is a step INTO the wall with its own arris; the
breast stands proud of it. Now drag a cabinet at the breast — it stops dead.
Drag it at the alcove — it goes in.

*Before tonight both were stored, listed and drawn in the modal, and the room
had neither.* — `verify/t51/f1-recess-and-chimney-in-the-room.png`

## 4 · The share-out asks when you DRAG

Put five 600s against the left wall and one more parked at the far end. Now drag
the parked one up to the run.

The bar should appear in the leftover gap the moment it arrives:
`… mm left over · Share it out equally`.

*T50 asked only when a cabinet was ADDED, which is the complaint.*
— `verify/t51/f2-share-out-fired-by-a-drag.png`

## 5 · …and the cabinets actually MOVE

Press `Share it out equally`.

Every cabinet in the run should widen AND shift, the run should finish on the
wall, and **no** "Width limited by …" message should appear.

*A single "limited by" notice means the fillers did not stand down.*
— `verify/t51/f2-run-after.png`

## 6 · The panel follows the hand, both ways

A tall kitchen unit and a low one. Drive the low one up: the finishing panel
appears and the app says so. Drive it away: **the panel goes**.

Now drive it back, delete the panel by hand, and nudge the low unit — it should
**stay** deleted. Take it right away and bring it back: it may return, because
that is a new junction.

— `f3-panel-away.png`, `f3-panel-appears.png`, `f3-panel-vanishes.png`

## 7 · The cup no longer reads through a shaker face

Set the front thickness to **16 mm**, the front style to **shaker**, and the
shaker frame to something under **39 mm** (Settings ▸ Fronts).

Look at a door's inside face: the cup should be blind with real floor under it,
and **Check should carry a red line** naming the door and saying the bore
stopped short.

*At the old rule this bored 11 mm into 10 mm of material — through.*

## 8 · The light panel is a room

**Lighting**. Under `THE ROOM`: Ceiling, Left wall, Right wall, Facing, each
with a switch, a strength and one line saying what it drives. Four presets above
them.

Flip `Ceiling` off — the room should visibly drop. Press `Neutral` — the raking
highlight down the fronts should go flat.

— `verify/t51/f6-the-light-panel.png`

## 9 · …and the export ignores every one of those switches

With the lamps flipped to something extreme, take a **Render**. Then set the
panel back to `Showroom` and take another.

**The two pictures must be the same.**

*That is the promise: a client comparing a render against an Egger sample must
not be shown two different rooms because somebody flipped a lamp.*
— `f6-the-room-as-it-ships.png` vs `f6-the-room-with-the-lamps-flipped.png`

## 10 · The warehouse opens where Materials always was

**Database ▸ Materials**.

Departments down the left with counts, `Others` at the bottom. Press
`+ Material`: the card opens beside the list, draggable, with the picture
enlarged and every field on it. Type a name and a price — the code `0001`
appears on its own, and under the price it says **typed by hand**.

— `verify/t51/f7-a-row-typed.png`, `verify/t51/f7-the-warehouse.png`

## 11 · A JoineryCore import overwrites — it never duplicates

Give that row a `jc_uuid`. Import a CSV carrying the same uuid with a different
name and price.

There must still be **one** row. It keeps its code `0001`, takes the new name
and price, and the panel prints the reprice in amber:
`0001 18mm MDF: 42 → 50`.

*A second row would mean the match key is broken. A silent price change would
mean the record is not saying where the figure came from.*

## 12 · Two exports, two documents

`Export catalogue` and `Export this project`.

```
Cabinet Core - Full catalogue - 2026-08-26 08-48 - materials.csv
Cabinet Core - Anderson Kitchen - 2026-08-26 08-48 - materials.csv
```

Open one in Production Core: the columns should line up.

---

## And one number to check in passing

Start a **One wall** job and open Room setup. **Side returns** should read
**2000**, not 1000. (It was 1000, not the 1500 you remembered — either way it
is 2000 now.) — `verify/t51/f8-side-walls-2000.png`
