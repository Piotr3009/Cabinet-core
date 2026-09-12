# T69 · F1 — THE APPLY PROBE

_The law on disk when this ran: APPLY sends **THE WHOLE SNAPSHOTTED DRAFT**, and the button **CAN BE DRAWN DEAD**._

_Driven, not guessed: `migrateRoom(room)` → the window's own `patch()` →
the window's own `apply()` = `setRoom(draft)`. `node scripts/t69-f1-probe.mjs`._

## What the store receives, edit by edit

| edit | room before | the DRAFT apply sends | store said | room after | landed? | openings kept |
| --- | --- | --- | --- | --- | --- | --- |
| 1 · wall 1 typed 4200 | 3000×3000, h 2500 | 4200×3000, h 2500 | ok | 4200×3000, h 2500 | YES | 0 |
| 2 · height typed 2700 | 3000×3000, h 2500 | 3000×3000, h 2700 | ok | 3000×3000, h 2700 | YES | 0 |
| 3 · preset RECTANGLE pressed | 3000×3000, h 2500 | 3600×3200, h 2500 | ok | 3600×3200, h 2500 | YES | 0 |
| 4 · wall 1 typed 4200, a window added underneath first | 3000×3000, h 2500 | 4200×3000, h 2500 | ok | 4200×3000, h 2500 | YES | 0 |
| 5 · height typed 2700, a window added underneath first | 3000×3000, h 2500 | 3000×3000, h 2700 | ok | 3000×3000, h 2700 | YES | 0 |

**VERDICT — 0 of 5 edits do not reach the store;** **2 of 2 runs with a live write underneath LOSE that write.**

- `4 · wall 1 typed 4200, a window added underneath first` — draft `0,0 4200,0 4200,3000 0,3000` h 2500; store now `0,0 4200,0 4200,3000 0,3000` h 2500; openings 0 (the docked editor had written 1 before APPLY)
- `5 · height typed 2700, a window added underneath first` — draft `0,0 3000,0 3000,3000 0,3000` h 2700; store now `0,0 3000,0 3000,3000 0,3000` h 2700; openings 0 (the docked editor had written 1 before APPLY)

## What the BUTTON does, in the three states a client reaches

| state | the draft | APPLY | what the client is told | did the room move? |
| --- | --- | --- | --- | --- |
| 6 · a 2000 wardrobe stands; the wall is dragged to 1800 | 1800x3000, h 2500 | **DISABLED** | (nothing — the button is dead) | **no** |
| 7 · a 2400-tall wardrobe stands; the ceiling is typed 2200 | 4000x3000, h 2200 | **DISABLED** | (nothing — the button is dead) | **no** |
| 8 · RECTANGLE pressed on a room that already is one | 4000x3000, h 2500 | live | applied | **no** |

**VERDICT 2 — 2 of 3 states leave APPLY dead, and a dead button authors no sentence: `roomChangeGuard`'s message is written and never read.**

**VERDICT 3 — the preset row is the third dead press.** `setPreset('rect')` builds
the rectangle from the room's OWN bounds, so on a room that is already a rectangle —
which is every room retail makes — pressing RECTANGLE proposes what is already there
and APPLY has nothing to apply. There is no 1/2/3-WALL answer in the row at all.

