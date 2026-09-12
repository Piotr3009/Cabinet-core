# T69 · F3 — THE SLOPE PROBE

_The two buttons in `WallElevationModal.jsx` pass `left` and `right`, read
out of that file. Everything below is what the STORE then holds and what the
ENGINE then draws. `node scripts/t69-f3-probe.mjs`._

## 1 · SLOPE LEFT, THEN SLOPE RIGHT, ON ONE WALL

| press | slopes on the wall | sides STORED | end each one EATS |
| --- | --- | --- | --- |
| `addSlope('left')` | 1 | R | RIGHT |
| `addSlope('right')` | 2 | R + R | RIGHT + RIGHT |

The ceiling the wall then has:

| where | height |
| --- | --- |
| left end (x=0) | 2500 mm |
| middle | 2500 mm |
| right end (x=w) | 1800 mm |

**VERDICT 1 — two buttons, 1 side(s) stored: `R`.** Both presses land on the SAME end of the wall, one on top of the other — exactly what the owner sees. `migrateSlope` reads the side as `raw.side === 'L' ? 'L' : 'R'`, and neither button passes `L`: they pass `left` and `right`, so BOTH normalise to `R`.

## 2 · THE SAME SIDE, PRESSED TWICE

`addSlope('left')` twice leaves **2** slope(s) on the wall (`R`, `R`).

**VERDICT 2 — the store stacks them.** Nothing in the shared core holds a wall to one slope per side, so a second press adds a second triangle over the first and nothing appears to happen.

## 3 · THE EDITOR'S OWN "ALREADY HAS ONE" GUARD

| the button asks | it is told |
| --- | --- |
| `hasSlopeOn('left')` | **no** |
| `hasSlopeOn('right')` | **no** |

**VERDICT 3 — the guard is blind in 2 of 2 cases:** it compares the button's own word (`'left'`) with the side the core STORES (`'L'`/`'R'`), so it can never be true. It lives inside `WallElevationModal.jsx`, which is FROZEN in PRO and a COPY in retail, and no feature tonight licenses either — so the fix goes where the law belongs, in the shared core, and the greyed-out hint stays unreachable. Noted, not silently left.

