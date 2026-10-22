# T80 F3 PROBE: the run, its ends and its end panel, before the frame

22.10.2026. Read-only probe for TURN 80 PART C F3 (the in-frame frame is a RUN's
board, built after the cabinets, on the SAME grouping the plinth run uses). It
drives the real store in node (`src/stores/projectStore.js`, as the tests do),
rebuilds the mockup's scene of `scripts/chatfix-2110-mockup-inframe-final.mjs`
lines 45-61 in the same order (BUD 600 one door hinge L at x 1000, BUD 800 pair
at x 1600, BUDR2 500 at x 2400, WUD 600 one door at x 1000, end panel L and
plinth on the first BUD, then front type f1 Spray, F&B Card Room Green, sheen
30) in the default room of `newProject` (4000 x 3000 x 2500, the same call the
mockup harness makes, `scripts/t74-harness.mjs:118`), and records where the
units really stand, what `buildRuns` groups, what the plinth run computes, what
`state.runElements` holds, where the code decides a run's ends, and what the end
panel reports. Nothing in `src/` was changed. Three scenes: **A** the mockup's
order (units first, Spray after), **B** Spray chosen before the units are added,
**C** scene A with DR01 moved 4 mm to the right.

## 1. The units as they stand (scene A, after every step)

| Unit | Type | wall | x_mm | W | H | D | unitBase | unitTop | params.front_t | plinth | end_panels (side, t, height) | paddedSpan |
| - | - | - | - | - | - | - | - | - | - | - | - | - |
| 01 | BUD | 0 | 1000 | 600 | 770 | 558 | 100 | 870 | 25 | true | L, 25, floor | 975 .. 1600 |
| 02 | BUD | 0 | 1600 | 800 | 770 | 558 | 100 | 870 | 25 | true | none | 1600 .. 2400 |
| DR01 | BUDR2 | 0 | 2400 | 500 | 770 | 558 | 100 | 870 | 25 | true | none | 2400 .. 2900 |
| WU01 | WUD | 0 | 1000 | 600 | 720 | 400 | 1500 (mount_height) | 2220 | 25 | false | none | 1000 .. 1600 |

Carcass board t = 18 on every unit (BUL/BUR `thickness` 18, TOP 564 = 600 - 2 x 18).
`plinth` is already true at birth on every base unit (a bare `addUnit('BUD')`
reports `plinth: true`), so `addPlinth(a)` changed no value here.

| Neighbours (floor) | carcass gap (x_q - x_p - W_p) | paddedSpan gap |
| - | - | - |
| 01 / 02 | 0 | 0 |
| 02 / DR01 | 0 | 0 |

**The units are butted (gap 0).** Every asked x was kept exactly; no unit was
moved by snap or clamp. The steps as the store answered them:

| Step | Store answer | x after the step |
| - | - | - |
| addUnit(BUD, wall 0, x 1000) | id, error null, wall 0 | 01 at 1000 (W 600) |
| addUnit(BUD, wall 0, x 1600) | id, error null, wall 0 | 02 at 1600 (W 600 at birth) |
| addUnit(BUDR2, wall 0, x 2400) | id, error null, wall 0 | DR01 at 2400 (W 600 at birth) |
| addUnit(WUD, wall 0, x 1000) | id, error null, wall 0 | WU01 at 1000 |
| updateUnitParams width 600 / 800 / 500 / 600 | applied, no notices | 01 1000, 02 1600, DR01 2400, WU01 1000 (left edge kept, width grows right) |
| setDoors a {1, L}, b {2, L}, w {1, L} | (no return) | unchanged |
| addEndPanel(a, L) | id, error null | 01 stays at 1000 (room on its left) |
| addPlinth(a) | true | unchanged |
| setFrontType f1 Spray, setFrontColour, setDesign sheen 30 | (no return) | unchanged; `params.front_t` stays 25 on every unit |

### Which store action positions a unit

| Action | file:line | What it does to x |
| - | - | - |
| `addUnit(type, { wall, x })` | `src/stores/projectStore.js:5356`; the asked-x branch `5637-5639`; written at `5680` | With a wall AND an x asked, `slotTakes` (`src/engine/collision.js:941`) tests the slot at exactly that x and returns `Math.round(x)`, or the add is REFUSED in words (`5666-5678`). No snap, no clamp, no magnet on this road. Without an x, `freeSlotOnWall` picks the slot. |
| `moveUnit(id, x, snapStep, { magnet })` | `src/stores/projectStore.js:7067`; footprint pads `7099`; clamp `7111-7124` | Snaps to `profile.editor.mmStep` (0.5) and clamps with `clampUnitX` (`src/engine/collision.js:698`), which magnetises to a neighbour within `profile.editor.unitMagnet` (40) and keeps `profile.editor.minUnitGap` (0). The footprint includes the end panels (`footprintPads`, `collision.js:317`, via `endPanelPads` `collision.js:243`). |
| `addEndPanel(id, { side })` | `src/stores/projectStore.js:4360`; resettle `4452` | After writing the panel it calls `moveUnit(id, x_mm, 0)`, "settle it legally where it stands". Here x stayed 1000. |
| `updateUnitParams(id, { width })` | `src/stores/projectStore.js:6640` | Width grows to the right from the kept x (observed). |

## 2. What `buildRuns(units, profile)` groups (`src/engine/runs.js:253`)

| Run | wall | mount | level key `wall\|mount\|top` | units, in order | run.left | run.right | run.top |
| - | - | - | - | - | - | - | - |
| 1 | 0 | floor | `0\|floor\|870` | 01, 02, DR01 | 975 | 2900 | 870 |
| 2 | 0 | wall | `0\|wall\|2220` | WU01 | 1000 | 1600 | 2220 |

`run.left` / `run.right` are `paddedSpan` of the first and last unit, end panels
included (`makeRun`, `runs.js:316-325`), so run 1 starts at the END-L's outer face
(975 in scene A, 982 in scene B).

## 3. The plinth run: `plinthSegments`, `segmentPlinth`, `runPlinthParams`

| Function | file:line | Result (scene A) |
| - | - | - |
| `plinthSegments(run 1)` | `runs.js:1229` | one segment: [01, 02, DR01] |
| `plinthSegments(run 2)` | `runs.js:1229` | [] (WU01 has no plinth) |
| `segmentPlinth([01, 02, DR01])` | `runs.js:1264` | role owner, offset 0, length 1900, unitIds [01, 02, DR01], spans [01 600, 02 800, DR01 500] |
| `runPlinthParams` 01 | `runs.js:1440` | the owner element above |
| `runPlinthParams` 02 | `runs.js:1440` | { role: member, ownerId: 01 } |
| `runPlinthParams` DR01 | `runs.js:1440` | { role: member, ownerId: 01 } |
| `runPlinthParams` WU01 | `runs.js:1440` | null |

The plinth is measured on the CARCASSES (`segmentPlinth`, `runs.js:1268-1270`:
first x to last x + W = 1000 .. 2900), never on the padded span, so END-L does
not lengthen it. The engine's PLINTH board on 01: nominal 1900 x 100, cut 1940 x
140 (site trim 20 on every edge), t 18, box x 0, y -100, z 490, d 18 (its face at
z 508 = 558 less the 50 setback, `profile.autoParts.plinth.setback`).

## 4. `state.runElements` after the settle pass

| Unit | top_infill | plinth | mask | cornice | upstand / pelmet |
| - | - | - | - | - | - |
| 01 | null | owner, offset 0, length 1900, unitIds [01, 02, DR01], spans 600 / 800 / 500 | null | null | absent |
| 02 | null | member of 01 | null | null | absent |
| DR01 | null | member of 01 | null | null | absent |
| WU01 | (no entry: every element null, so the unit is skipped) | | | | |

The settle pass is `refreshAutoParts` (`projectStore.js:2759`): `runPlinthParams`
at `3136-3138`, the `runElements` map built at `3203-3237` and stored at `3247`
(byte-equal elements keep their reference). `paramsForEngine`
(`projectStore.js:1082`) reads it at `1105` and hands it to the engine as
`run_top_infill / run_plinth / run_mask / run_cornice / run_upstand / run_pelmet`
at `1114-1121`. There is no frame key today; a run element added for the frame
would enter at `3209-3217` like the upstand and the pelmet do.

## 5. Where a run's ends are decided (code)

| Decision | file:line | Rule / value |
| - | - | - |
| A turned unit is in no run | `runs.js:188-189` (`levelGroups`) | rotation != 0 is skipped |
| A free panel is in no run | `runs.js:190-193` | `type.freePanel` is skipped |
| The level key | `runs.js:197-198` | `` `${wall}\|${type.mount}\|${top}` ``, top = `unitTop` rounded to 0.1 (`unitTop` `runs.js:81`, `unitBase` `runs.js:98`) |
| Sort order inside a level | `runs.js:260` | by `paddedSpan(u).left` |
| The GAP break | `runs.js:256`, `263-264` | `gap = paddedSpan(next).left - paddedSpan(last).right`; same run while `gap <= tolerance` |
| The tolerance | `src/engine/profile.js:2591` | `profile.autoParts.topInfill.runGap` = **1** (mm). "The clamp lands them edge to edge, so this only absorbs the 0.5 mm grid." |
| The padded span (end panels count) | `runs.js:160-168` (`endPanelSpread`), `runs.js:171-176` (`paddedSpan`) | left = x - pad.left, right = x + W + pad.right; pad = the end panel's thickness, falling back to `params.front_t` when the panel has none |
| A run's own ends | `runs.js:316-325` (`makeRun`) | left = paddedSpan(first).left, right = paddedSpan(last).right |
| Plinth segment ends inside a run | `runs.js:1229-1248` (`plinthSegments`) | a unit with no plinth closes the segment (`wantsPlinth`, `runs.js:1219-1221`); an end panel on EITHER facing side closes it (`runs.js:1240-1242`) |
| Plinth length | `runs.js:1264-1270` (`segmentPlinth`) | carcass to carcass, end panels excluded |
| The wall's own share-out scope (not used by the plinth) | `runs.js:233` (`buildWallRuns`) | one run per wall per level, gap rule dropped |
| Which type takes a plinth at all | `src/engine/autoparts.js:43-46` (`takesPlinth`) | `profile.autoParts.plinth.enabled` and `type.plinth ?? type.legs` and mount floor |

## 6. What the end panel reports at each end

| Run end | What stands there | Thickness | Where the number came from |
| - | - | - | - |
| run 1, left (x 1000) | END-L on 01, height `floor` | 25 in scene A, 18 in scene B | written by `addEndPanel` (see the chain below) |
| run 1, right (x 2900) | nothing: DR01's own side is the end (no auto panel in PRO: `setWardrobeEndPanelAuto` is retail only, `src/engine/endPanelAuto.js:61-67`) | none | |
| run 2, both ends (1000, 1600) | nothing | none | |

The thickness chain, in order:

| Reader | file:line | Rule |
| - | - | - |
| Store, when the panel is added | `projectStore.js:4401-4412` | explicit `thickness` arg, else `design.endPanel.thickness` (> 0), else `unit.params.front_t`, else `profile.front.thickness`. The value is WRITTEN on the panel record. |
| Store, the project default it leaves behind | `projectStore.js:4447-4449` | unless `applyToAll === false`, the add writes `design.endPanel = { height, thickness, applyToAll: true }`: after scene A `design.endPanel` is `{ height: floor, thickness: 25, applyToAll: true }`, so every later panel in the project is 25 too |
| Engine, a panel with no thickness | `src/engine/cabinet.js:7133` | `ep.thickness`, else `profile.autoParts.endPanel.thickness` (null, `profile.js:2638`), else `frontT` = the front1 thickness slot (`cabinet.js:1054`, `1843`) |
| Runs and placement, a panel with no thickness | `runs.js:163`, `collision.js:243-247` | `ep.thickness`, else `params.front_t` |
| `params.front_t` at birth | `projectStore.js:534` (`projectFrontThickness`, `src/engine/projectSettings.js:134-142`) | front type 1's board, else its source's thickness, else `profile.front.thickness` = **25** (`profile.js:55`) |

So `front_t` on these units is 25 (no source was chosen when they were born), and
END-L is 25 in the mockup's own order. Choosing Spray AFTER does not touch
`params.front_t` (still 25) but the engine's front1 slot reads 18 from then on
(every FRONT board is cut 18, `thickness_slots` via `paramsForEngine`). Choosing
Spray BEFORE (scene B) gives `front_t` 18 and END-L 18.

The END-L record from `unitResult` (= `computeCabinet(paramsForEngine(unit,
design))` plus part edits, `projectStore.js:1331-1338`):

| Scene | cut w x h | nominal w x h | t | box (unit frame) | site trim edges |
| - | - | - | - | - | - |
| A before Spray (first probe run) | 616 x 910 | 596 x 870 | 25 | x -25, y -100, z -10, w 25, h 870, d 596 | back, top, bottom (+20) |
| A after Spray | 609 x 910 | 589 x 870 | 25 | x -25, y -100, z -10, w 25, h 870, d 589 | back, top, bottom (+20) |
| B | 609 x 910 | 589 x 870 | 18 | x -18, y -100, z -10, w 18, h 870, d 589 | back, top, bottom (+20) |

Depth today is `endBack + D + doors.gap + frontT` (`cabinet.js:7118-7119`) = 10 +
558 + 3 + front1 slot (25 before Spray, 18 after). Height is H 770 + the leg drop
100 (`floor`) = 870 nominal, plus the site trim.

## 7. The front boards in this scene (context for F5; scene A after Spray)

| Unit | Panel | w x h | t | box x, y, z |
| - | - | - | - | - |
| 01 | 01-F | 595.5 x 770 | 18 | 3, 0, 561 |
| 02 | 02-FL | 397 x 770 | 18 | 1.5, 0, 561 |
| 02 | 02-FR | 397 x 770 | 18 | 401.5, 0, 561 |
| DR01 | DR01-F1 | 497 x 382 | 18 | 1.5, 0, 561 |
| DR01 | DR01-F2 | 497 x 382 | 18 | 1.5, 385, 561 |
| WU01 | WU01-F | 597 x 720 | 18 | 1.5, 0, 403 |

The carcass front edge is z = D (558 base, 400 wall; the sides run z 18 .. 558),
the lay-on front sits 3 in front of it (z 561).

## 8. Scene C: a 4 mm gap between 02 and DR01 (`moveUnit(DR01, 2404, 0, { magnet: false })`)

| What | Result |
| - | - |
| x | 01 1000, 02 1600, DR01 2404, WU01 1000 |
| buildRuns | floor run [01, 02] (975 .. 2400); floor run [DR01] (2404 .. 2904); wall run [WU01] |
| plinth | 01 owner, length 1400 [01, 02]; DR01 owner of its own, length 500 |
| Check #11 (red, `src/engine/frontClearance.js:664-709`, tolerance 0.5, reach 200) | "02 and DR01 stand 4 mm apart: carcasses in a run must touch." (the app's own sentence uses a dash before "carcasses"; written here with a colon) |

## 9. What this means for F3 (facts for the writer, nothing decided here)

1. Scene A and B are butted (gap 0), and `buildRuns` gives the run the frame
   wants: [01, 02, DR01] on the floor, [WU01] on the wall, keyed
   `wall|mount|top`. The frame can ride that grouping unchanged.
2. **The gap term never reaches one run.** `runGap` is 1 mm, so a 4 mm gap makes
   TWO runs (scene C) and two plinths, and Check #11 is already red for it. On
   the same grouping, the CLAUDE.md law `lip + t + gap + t + lip` and Check #41
   only ever see a gap in (0, 1] mm inside one run; a 4 mm gap gives two frames,
   each with an open-end stile at the split. One law one path forbids a second
   grouping, so the PR has to name this.
3. **The end panel in the mockup's own order is 25, not 18.** With a 25 panel,
   `lip + t + panel` = 1 + 18 + 25 = 44 > 38: a 38 stile measured from the
   opening edge (1019) ends at 981, 6 mm INSIDE the panel's outer face (975); a
   frame to the panel's face would be 1926 wide with a 44 stile. With Spray
   chosen first (scene B) the panel is 18 and the CLAUDE.md numbers hold
   exactly (below). The walk must choose the front source before it adds units,
   or set the panel thickness, or its 1920 pin fails.
4. **The open-end stile is 20 in the pins, 19 in the text.** CLAUDE.md F1(a)
   says "the first carcass's outer face plus 1 ... the stile is then 19 = 1 +
   18". Opening edge to carcass face is 19; "plus 1" makes it 20. The mockup
   script (`fx1 = x1 + lip`) and both walk pins (1920, WUD 602) use the 20.
5. **No front source is 22 today.** Spray 18, veneer 19, laminate 18, wood 20,
   raw 18 (`profile.js:1704-1759`); with no source the front is
   `profile.front.thickness` 25, and `profile.front.thicknessOptions` is [18,
   19, 25]. Check #40 as written would be red on every project until a 22 board
   or source exists.
6. Today's end panel depth `endBack + D + doors.gap + frontT` with a front1 slot
   of 22 is `endBack + D + 25`, the frame's face. Observed only (F7).
7. The plinth's face is at z 508 (50 behind the carcass front); a bottom rail
   hanging 81 .. 100 above the floor stands in front of it.

Derived from the probed values by the CLAUDE.md law (arithmetic, not engine
output), scene B (END-L 18), floor datum, x along wall 0:

| Piece | x from .. to | size | y from .. to (above floor) | size |
| - | - | - | - | - |
| Base frame | 981 .. 2901 | 1920 | 81 .. 889 | 808 |
| Opening 01 | 1019 .. 1581 | 562 | 119 .. 851 | 732 |
| Opening 02 | 1619 .. 2381 | 762 | 119 .. 851 | 732 |
| Opening DR01 | 2419 .. 2881 | 462 | 119 .. 851 | 732 |
| Stile, left (over END-L) | 981 .. 1019 | 38 (1 + 18 + 18, 1 past the panel) | | |
| Stile 01 / 02 | 1581 .. 1619 | 38 | | |
| Stile 02 / DR01 | 2381 .. 2419 | 38 | | |
| Stile, right (open end) | 2881 .. 2901 | 20 | | |
| Wall frame | 999 .. 1601 | 602 | 1481 .. 2239 | 758 |
| Opening WU01 | 1019 .. 1581 | 562 | 1519 .. 2201 | 682 |

## The probe script

Saved in the scratchpad, never in the repo. Run from the repo root:
`node --input-type=module < t80-f03-probe.mjs`

```js
// T80 F3 PROBE (22.10.2026). Read only: drives the real store in node, writes nothing.
// Run from the repo root:  node --input-type=module < t80-f03-probe.mjs
import { useProjectStore } from './src/stores/projectStore.js';
import {
  buildRuns, plinthSegments, segmentPlinth, runPlinthParams, unitBase, unitTop, paddedSpan,
} from './src/engine/runs.js';
import { getCabinetProfile } from './src/engine/profile.js';
import { neighbourReachMm } from './src/engine/frontClearance.js';

const S = () => useProjectStore.getState();
const J = (v) => JSON.stringify(v);
const P = getCabinetProfile();
const num = (u) => u.params.unit_num;

// The mockup's scene, scripts/chatfix-2110-mockup-inframe-final.mjs lines 45-61, same order.
function mockupScene({ sprayFirst = false } = {}) {
  S().newProject('T80 F3 probe');
  if (sprayFirst) S().setFrontType('f1', { source: 'spray' });
  const add = (type, x) => { const r = S().addUnit(type, { wall: 0, x }); console.log('addUnit', type, x, J(r)); return r.id; };
  const a = add('BUD', 1000); const b = add('BUD', 1600); const c = add('BUDR2', 2400); const w = add('WUD', 1000);
  console.log('x after adds', S().units.map((u) => `${num(u)}:${u.position.x_mm}/${u.params.width}`).join(' '));
  S().updateUnitParams(a, { width: 600 }); S().updateUnitParams(b, { width: 800 });
  S().updateUnitParams(c, { width: 500 }); S().updateUnitParams(w, { width: 600 });
  S().setDoors(a, { count: 1, hinge: 'L' }); S().setDoors(b, { count: 2, hinge: 'L' }); S().setDoors(w, { count: 1, hinge: 'L' });
  console.log('addEndPanel', J(S().addEndPanel(a, { side: 'L' })));
  console.log('addPlinth', S().addPlinth(a));
  if (!sprayFirst) S().setFrontType('f1', { source: 'spray' });
  S().setFrontColour({ hex: '#7b8f7a', name: 'F&B Card Room Green', system: 'F&B' }, 'f1');
  S().setDesign({ sheen: 30 });
  return { a, b, c, w };
}

function report(tag) {
  const units = S().units;
  console.log(`== ${tag} ==`);
  for (const u of units) {
    const ps = paddedSpan(u);
    console.log('unit', J({
      num: num(u), type: u.type, wall: u.position.wall, x: u.position.x_mm, W: u.params.width, H: u.params.height, D: u.params.depth,
      base: unitBase(u, P), top: unitTop(u, P), front_t: u.params.front_t, plinth: u.params.plinth,
      end_panels: (u.params.end_panels || []).map((e) => ({ side: e.side, t: e.thickness, height: e.height })),
      padded: [ps.left, ps.right],
    }));
  }
  const floor = units.filter((u) => u.type !== 'WUD').sort((p, q) => p.position.x_mm - q.position.x_mm);
  for (let i = 1; i < floor.length; i += 1) {
    const p = floor[i - 1]; const q = floor[i];
    console.log('gap', `${num(p)}|${num(q)}`, q.position.x_mm - (p.position.x_mm + p.params.width));
  }
  for (const run of buildRuns(units, P)) {
    console.log('run', J({ wall: run.wall, mount: run.mount, top: run.top, left: run.left, right: run.right, units: run.units.map(num),
      segments: plinthSegments(run).map((s) => s.map(num)), plinth: plinthSegments(run).map((s) => segmentPlinth(s)) }));
  }
  for (const [id, v] of runPlinthParams(units, P)) console.log('runPlinthParams', num(units.find((u) => u.id === id)), J(v));
  for (const [id, v] of Object.entries(S().runElements || {})) console.log('runElements', num(units.find((u) => u.id === id)), J(v));
  for (const u of units) {
    for (const p of S().unitResult(u.id).panels.filter((q) => /^(BUL|BUR|TOP|BOTTOM|PLINTH|END-L|END-R)$/.test(q.id) || q.role === 'front')) {
      console.log('panel', num(u), J({ id: p.id, part: p.part, w: p.w, h: p.h, t: p.thickness, box: p.box,
        nominal: p.meta?.oversize?.nominal ? [p.meta.oversize.nominal.w, p.meta.oversize.nominal.h] : null }));
    }
  }
}

console.log('profile', J({ runGap: P.autoParts.topInfill.runGap, frontThickness: P.front.thickness, doorsGap: P.doors.gap,
  minUnitGap: P.editor.minUnitGap, unitMagnet: P.editor.unitMagnet, mmStep: P.editor.mmStep, wallBackClearance: P.room.wallBackClearance,
  epThickness: P.autoParts.endPanel.thickness, neighbourReach: neighbourReachMm(P) }));

mockupScene();
report('A: the mockup order (units first, spray after)');
console.log('design.endPanel', J(S().project.design.endPanel));

mockupScene({ sprayFirst: true });
report('B: spray chosen before the units are added');

const { c } = mockupScene();
S().moveUnit(c, 2404, 0, { magnet: false });
report('C: as A, DR01 moved 4 mm right');
console.log('check #11', J(S().runChecks().filter((f) => f.check === 11).map((f) => f.message)));
```

The "A before Spray" END-L row of section 6 comes from a first run of the same
scene stopped before `setFrontType` (the script above prints scene A after it).
Profile line the script prints: `runGap 1, front.thickness 25, doors.gap 3,
editor.minUnitGap 0, editor.unitMagnet 40, editor.mmStep 0.5,
room.wallBackClearance 10, autoParts.endPanel.thickness null, neighbourReach
200`.
