# T80 F8 PROBE: where the PDF section draws the carcass top, the worktop, the door and the plinth

Read-only probe, taken on branch `claude/t80-in-frame-xjudwo` at HEAD
`992cd94`, 22.10.2026. Nothing in `src/` was edited by this probe. Numbers
below are engine and drawing output from the node scripts at the end. Every
line number is AT HEAD `992cd94`. While this probe ran, parallel T80 agents
edited the working tree (not this probe): `profile.js` gained 37 lines after
line 2812 (so `drawings.set.hatchPitch`, 4858 at HEAD, is 4895 in the working
tree) and `projectStore.js` 12 lines after 1081 and 3 after 1124 (so
`addWorktop` 9847 at HEAD is 9862, `worktopsOf` 9950 is 9965). The drawing
files, `worktop.js`, `cornice.js`, `cabinet.js` and `Scene.jsx` were untouched.

## 1. Which code draws the PDF section today

The section a client gets in the PDF is the wall set's sheet `Wall X ·
Sections A-A` (and B-B, C-C). Its road:

| Step | File:line | What it does |
| - | - | - |
| PRO drawing window, PDF button | components/DrawingModal.jsx:160, 254-270 | `wallDrawingSheets(...)`, then `exportWallDrawingsPdf` |
| Configurator page (same set) | pages/ConfiguratorPage.jsx:548-552 | passes `worktops: worktopsOf()` |
| The set | engine/drawings/wallSheets.js:127 | `wallDrawingSheets({entries, project, room, worktops, design, profile, ...})` |
| Worktops resolved when the caller passes none | wallSheets.js:142-148 | `worktopsFor({records: design.worktops, units, profile})`, then `.geometry` |
| The sections sheet | wallSheets.js:193-201 | `sectionStations(group, {chosenId})`, `stationSet(group, stations, {room, worktops: onWall, profile})` |
| Where the knife goes | engine/drawings/setSection.js:34-52 | A-A through the first DRAWER unit of the floor band, else the first floor unit; B-B the sink; C-C the chosen unit |
| One station drawn | setSection.js:71-151 | `buildStation`: `cutCabinet` per member, legs, worktop, wall band, floor, ceiling, unit numbers, chains, caption |
| The grammar per cabinet | engine/drawings/section.js:101-185 | `cutCabinet(member, profile)` |
| Sheet layout and scale | engine/drawings/setSheet.js:82-96, 173 | `drawingContext(scale)` (`ctx.mm(paper)` = paper mm to drawing mm), `layoutSetSheet` |
| Preview SVG | engine/drawings/svg.js:33-108 | `sheetToSvg` |
| PDF bytes | lib/drawingExport.js:287 (`exportWallDrawingsPdf`); entity writer 154-180 | rect with `fill` at 155-164, poly with `fill` at 165-180 |

Not on this road: `section.js buildUnitSection` (283) and `buildWallSection`
(263) are the T43 builders; nothing in `src/` calls them today (only
`test/turn43-f5-the-sections.test.js`, `test/turn46-f6-...` and the
`scripts/t43|t71|t72-classify.mjs`). `wallSheets.js` imports only
`sectionableUnits` from section.js (line 23). The unit card (`card.js`,
`unitCard.js`) has no section view at all.

## 2. Where each piece is drawn

| Piece | File:line | Function | Primitive, layer, pen | Source of the numbers |
| - | - | - | - | - |
| Carcass profile (outline of the sides) | section.js:119-128 | `cutCabinet` | `entRect('CARCASE')`, pen CUT | min/max of every `role 'side'` box: z..z+d, base+y..base+y+h |
| Carcass TOP (and BOTTOM) | section.js:133 | `cutCabinet` via `bar()` (110-113) | `entRect('CARCASE')`, pen CUT, `solid: true` | the TOP panel box: x = box.z, y = base + box.y, w = box.d, h = box.h |
| BACK | section.js:134 | `cutCabinet` | same | BACK box |
| PLINTH | section.js:138 | `cutCabinet` | same | the cabinet's own `role 'plinth'` panel (cut when `params.plinth`); BUD 600: z 490..508, y 0..100 (set back 50 from the carcass front) |
| Shelves | section.js:140 | `cutCabinet` | `entRect('SHELVES')`, CUT | shelf boxes |
| Door / drawer front | section.js:142 | `cutCabinet` | `entRect('DOORS')`, pen CUT, solid | any `part 'FRONT'` or `'DRAWER-FRONT'` box (so an inset front whose box F5 moves is drawn where F5 puts it, with no change here) |
| Drawer boxes and runners | section.js:152-166 | `cutCabinet` | `entRect('SHELVES')` VISIBLE + `entLine('RUNNERS')` THIN | DRAWER-SIDE boxes; runner length from `runnerAskFor` |
| Legs (grammar) | section.js:168-182 | `cutCabinet` | `entLine('LEG_BLOCK')` | FILTERED OUT on the set sheet (setSection.js:88) |
| Legs (set sheet) | setSection.js:90-95 | `buildStation` -> `legHardware` (setElevation.js) | `entRect('LEG_BLOCK')` THIN | `assemblies.legs`, `assemblies.carcass.legHeight` |
| WORKTOP | setSection.js:97-101 | `buildStation` | `entRect('CARCASE', 0, w.y, w.d, w.h)`, pen CUT, `fill '#d9d9d9'`, solid | the slab geometry handed in (`worktops`); drawn from x = 0 (the wall) and only when the station x lies within `w.x .. w.x + w.w` |
| Wall band, HATCHED | setSection.js:54-65 | `wallBand` | `entRect('BUILDING')` CUT, then 45 degree `entLine('BUILDING')` pen FINE every `ctx.mm(profile.drawings.set.hatchPitch)` (2.2 paper mm, profile.js:4856-4858) | the only hatch in `src/engine/drawings` today |
| Floor and ceiling | setSection.js:104-105 | `buildStation` | `entLine('BUILDING')` VISIBLE | 0 and `room.height` |
| Unit numbers | setSection.js:107-112 | `buildStation` | `entText('UNIT_NUMBER', gap + 0.55 D, base + 0.12 H, num, ctx.unitNumberHeight)` + `paperHeight`, `mask: true`, `weight: 'bold'` | |
| Height chain | setSection.js:115-121 | `chainV` (setChains.js) | DIMENSIONS | 0, top, each member's base and top, worktop y and y + h (118) |
| Depth chains | setSection.js:122-140 | `chainH` | DIMENSIONS | `[0, clearance, clearance + D, clearance + D + doors.gap + front_t]` + worktop d; same for the hung unit |
| Caption | setSection.js:143-148 | `buildStation` | `entText('VIEW_TITLE', deepest / 2, -ctx.mm(19.5), caption, ctx.mm(2.8))` bold; `entText('SHEET_MUTED', ..., ctx.mm(1.9))` | |
| `deepest` (sheet extent) | setSection.js:102 | `buildStation` | | `gap + D + doors.gap + front_t`, or the worktop's d |

## 3. Coordinate convention

| Item | Convention |
| - | - |
| Units | drawing millimetres (1:1 model mm); the sheet scales them later (`setSheet.js placeEntity`) |
| Projection | ZY: drawing x = the cabinet's box z (depth, 0 at the cabinet's back), drawing y = height above the FLOOR |
| Origin | x 0 = the cabinet's back plane in `cutCabinet`; `buildStation` then moves every cabinet by its wall clearance (`wallGapOf`, setSection.js:81, 87-89: +10 on the default project), so on the set sheet x 0 is the WALL face. The worktop is drawn from x 0 (the wall) without that shift |
| y | `base + box.y`, with `base = unitBase(unit)` (runs.js:98): the leg height for a floor unit (100 by default), `mount_height` for a wall unit |
| Y direction | UP in the entities (primitives.js:18-19); `svg.js` flips once (`flip(y) = height - y`, svg.js:37); the PDF writer flips the same way |
| Text size | `height` in drawing mm, made from paper mm by `ctx.mm(paper)`; `paperHeight` keeps it at the paper size after scaling |
| `cutCabinet` has no `ctx` | it is scale-free; anything that must be a fixed paper size (a hatch pitch, a label) can only be built where `ctx` exists, i.e. in `buildStation` |

## 4. Primitives and what the writers honour

| Primitive | primitives.js | Fields |
| - | - | - |
| `entLine(layer, x1, y1, x2, y2)` | 24 | |
| `entRect(layer, x, y, w, h)` | 27-29 | lower-left corner + size (abs) |
| `entText(layer, x, y, value, height, align = 'centre')` | 32-34 | |
| `entCircle(layer, cx, cy, r)` | 37 | |
| `entPoly(layer, pts, {fill, open})` | 55-57 | closed run of points, optional fill |
| `moveEntities(entities, dx, dy)` | 43-52 | |
| `boundsOf(entities)` | 60-76 | |

Extra keys the SVG writer reads (svg.js:40-98): `pen` (weight via
`penWidth`, layers.js:159; `PEN` table layers.js:132-148: CUT 0.70, VISIBLE
0.35, HIDDEN 0.25, THIN 0.18, FINE 0.13), `solid` (no dash; it does NOT fill),
`hidden`, `fill` (rect and poly; `'white'` = the paper), `noStroke`, `mask`,
`weight`, `rotate`, `tracking`, `meta` (written as `data-cc`). Layers live in
`DRAWING_LAYERS`, layers.js:23-86 (CARCASE 25, DOORS 27, SHELVES 30 dashed,
LEG_BLOCK 34, UNIT_NUMBER 36, DIMENSIONS 41, VIEW_TITLE 52, BUILDING 70 red,
SHEET_MUTED 81). There is no timber or filler layer today.

## 5. The worktop: thickness, height, depth, for the section and for the 3D

| What | File:line | Value / rule |
| - | - | - |
| Thickness default | profile.js:2552-2557 | `autoParts.worktop.thickness 38`, `frontOverhang 20`, `sideOverhang 10`, `minUnits 2` |
| Spec reader | worktop.js:68-85 | `worktopSpec(profile)` |
| A record's own thickness wins | worktop.js:100-103 | `slabThickness(record, spec)` (desk 25) |
| Straight slab geometry | worktop.js:191-245 | `worktopGeometry({units, record, profile})` |
| The slab's Y | worktop.js:221, 228 | `top = unitBase(list[0], profile) + list[0].params.height`; `y: top` (870 on a BUD 770 with 100 legs) |
| The slab's H | worktop.js:223, 229 | `h: thick` |
| The slab's depth | worktop.js:211-217 | `depth + doors.gap + front_t` of the deepest unit `+ frontOverhang + extendFront` (606 lay-on with 25 fronts; 603 with 22 fronts, which is also the in-frame frame face 583 + 20) |
| L slab Y | worktop.js:458, 498 | same rule (corner kits: no frame this turn) |
| Island slab Y | worktop.js:708, 714 | max of the cabinets' tops (islands: no frame this turn) |
| One height rule | worktop.js:157 | `worktopEligible` compares the units' tops |
| Side trim at a butting neighbour | worktop.js:333-372 | `endMeets` / `sideTrim` read `geometry.y .. y + h` |
| The record (no geometry stored) | projectStore.js:9847-9900 | `addWorktop` writes `{id, unitIds, decor, extendLeft/Right/Front, kind}` into `design.worktops` |
| Resolution for UI and drawings | projectStore.js:9950-9959 | `worktopsOf()` -> `worktopsFor({records, units, profile, walls})` |
| 3D slab | 3d/Scene.jsx:900-947 | `Worktops`: `setY(mm(g.y + g.h / 2))` (924), `boxGeometry(g.w, g.h, g.d)` |
| 3D cut-outs, L outline | Scene.jsx:961, 991 | `g.y + g.h + 0.6`, `g.y + g.h` |
| 3D source | Scene.jsx:1772-1775, 2249-2256 | `worktopsOf()` from the store |

Every reader of a slab's y, so a change at worktop.js:221 reaches all of them:
the section (setSection.js:97-101, 118), the run elevation
(setElevation.js:66, 246, 303), the plans (setPlan.js:152, 273), the
perspective (setPerspective.js:75), the 3D (Scene.jsx above), the hood
clearance (hoodClearance.js:72, uses `y + h`), BOM (bom.js:207), Check
(checks.js:1244), MultiUnitPanel.jsx:81.

Observation for F8: `worktopsFor` and `worktopGeometry` take `(records, units,
profile, walls)` and never the design, so `design.inframe` has no way in
today. Its callers are six: projectStore.js:9950, wallSheets.js:147 (the
fallback), bom.js:207, checks.js:1244, hoodClearance.js:72 (and through the
store, Scene.jsx, DrawingModal.jsx:165, ConfiguratorPage.jsx:552,
MultiUnitPanel.jsx:81). One path for the +19 is an option on `worktopsFor`
that reaches `worktopGeometry` line 221, handed by every caller, or a value
carried on the units' params by `paramsForEngine`. Scene.jsx needs no line
either way (and FROZEN 5 protects its Environment).

## 6. `corniceStackTop` (cornice.js:90-95)

```js
export function corniceStackTop({ unitTop: top = 0, infillHeight = 0, height = 0 }) {
  return (Number(top) || 0) + Math.max(
    Math.max(0, Number(infillHeight) || 0),
    Math.max(0, Number(height) || 0),
  );
}
```

It returns a HEIGHT above the floor: the unit's top plus the taller of the top
infill and the cornice. It places nothing.

| Caller | File:line | Use |
| - | - | - |
| `corniceCeilingNotice` | cornice.js:114 | the "finishes N mm above the ceiling" warning; called from projectStore.js:3180 |
| `runCorniceParams` | cornice.js:572 | each segment's `top`, for meeting neighbours (`unitTop(first, profile)`); called from projectStore.js:3152 |
| retail `ceilingGapMm` | retail/design/adapter.js:1087 | the gap left to the ceiling; read by retail/design/Options.jsx:1132 and reasons.js:394 |

Where the cornice is actually PLACED: `assemblies.cornice.carcassTop: H` and
`doorPlane: D + doors.gap + frontT` (cabinet.js:11677-11678), read by
3d/Cornice.jsx:70-74 into `corniceSolids` (cornice.js:679, `y0 = carcassTop`).
So "the cornice stands on the frame's top edge" (PROPOSED) touches two places:
the height bookkeeping (the three `corniceStackTop` callers, `unitTop + 19`)
and the geometry (cabinet.js:11677-11678 behind `params.inframe`: `H + 19`, `D +
25`).

## 7. Readings for the F8 writer (not decided here)

1. A knife at a cabinet's centreline passes through the frame's OPENING, so
   it cuts the two RAILS only: bottom rail z D..D+25, y `base - 19 .. base + t
   + lip` (38); top rail `base + H - t - lip .. base + H + 19` (38). The stile
   beyond is SEEN, not cut: a 25 x 808 outline (VISIBLE) behind them. The
   brief's "frame's section (25 x 808)" reads naturally as rails cut plus
   stile seen.
2. The timber filler: `base + H .. base + H + 19`, from the TOP's box z (18 on
   a BUD) to D (558), behind the top rail; hatched with the `wallBand` idiom
   (setSection.js:55-65), which needs `ctx`: so the hatch belongs in
   `buildStation`, not in `cutCabinet`.
3. The frame is a RUN part (not in `result.panels`), so `cutCabinet` cannot
   see it unless the run builder publishes it on the member's result; the
   other way is to hand the run frames to `buildStation` as the worktops are
   handed today (setSection.js:97).
4. The inset door is drawn by section.js:142 from its box with no change once
   F5 moves the box (z 561, d 22, y 22, h 726 on a BUD 770).
5. Any change in `buildStation` or `cutCabinet` must be gated on in-frame:
   the set sheets are pinned by the T71/T72 classifiers.

## 8. Results (lay-on today)

Run of BUD 600 (01) + BUD 600 (02), plinth, worktop over both, WUD 600 (03) at
1500; room 2400.

| Measure | Value |
| - | - |
| member 01 base / top | 100 / 870 |
| `cutCabinet(BUD 600)` entities | 12: 5 `rect:CARCASE` (profile, top, bottom, back, plinth), 1 `rect:DOORS`, 6 `line:LEG_BLOCK` |
| TOP bar | x 18, y 852, w 540, h 18 |
| Door bar | x 561, y 100, w 25, h 767 |
| Plinth bar | x 490, y 0, w 18, h 100 |
| `buildUnitSection` (T43) entities, bounds | 39; x -305, y -371.5, w 1141, h 2771.5 |
| Worktop geometry | x -10, y 870, w 1220, h 38, d 606 |
| Station A-A (`buildStation`, ctx 1:1) | 1178 entities: 10 `rect:CARCASE` (incl. the worktop rect, fill `#d9d9d9`, x 0, y 870, w 606, h 38), 2 `rect:DOORS`, 6 `rect:LEG_BLOCK`, 1 `rect:BUILDING`, 1093 `line:BUILDING` (1091 of them the wall-band hatch), 2 `text:UNIT_NUMBER`, 20 `line` + 28 `poly` + 14 `text` DIMENSIONS, 1 VIEW_TITLE, 1 SHEET_MUTED |
| Sheet `Wall A · Sections A-A` as SVG | 45 268 bytes, 420 x 297 mm (A3) |
| SVG elements | 123 `<line>`, 30 `<rect>`, 29 `<path>`, 79 `<text>`, 0 `<circle>` (the whole sheet: frame, title block, legend column included) |
| SVG by tag and layer | rect:CARCASE 10, rect:DOORS 2, rect:LEG_BLOCK 6, rect:BUILDING 1, line:BUILDING 80, rect:UNIT_NUMBER 2 (masks), text:UNIT_NUMBER 3, line:DIMENSIONS 27, path:DIMENSIONS 28, text:DIMENSIONS 14, text:VIEW_TITLE 1, text:SHEET_MUTED 31, rect:FRAME 5, line:FRAME_LIGHT 3, line:FRAME 8, text:FRAME 30, line:SHEET_MUTED 2, rect:SHEET_MUTED 2, path:DOORS 1, line:DOORS 1, line:CARCASE 1, line:SHELVES 1, rect:HINGES 1 |

(The SVG has 80 BUILDING lines against 1093 in the 1:1 station because the
hatch pitch is `ctx.mm(2.2)`: at the sheet's scale there are fewer lines.)

## 9. The probe scripts

Saved under `verify/t80/` and run from the repo root, the relative imports
resolve. They edit nothing.

```js
// T80 F8 probe: the vertical section of a BUD 600 (lay-on, today), as entities and as SVG.
import { computeCabinet } from '../../src/engine/cabinet.js';
import { defaultParamsFor } from '../../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../../src/engine/profile.js';
import { cutCabinet, buildUnitSection } from '../../src/engine/drawings/section.js';
import { wallDrawingSheets } from '../../src/engine/drawings/wallSheets.js';
import { wallGroups } from '../../src/engine/drawings/wallElevation.js';
import { sheetToSvg } from '../../src/engine/drawings/svg.js';
import { worktopsFor } from '../../src/engine/worktop.js';
import { unitBase, unitTop } from '../../src/engine/runs.js';

const mk = (id, type, over, pos) => ({
  id, type,
  params: { ...defaultParamsFor(type, P), ...over },
  position: { wall: 0, x_mm: 0, rotation_deg: 0, ...pos },
});
const units = [
  mk('a1', 'BUD', { unit_num: '01', width: 600, plinth: true }, { x_mm: 0 }),
  mk('a2', 'BUD', { unit_num: '02', width: 600, plinth: true }, { x_mm: 600 }),
  mk('w1', 'WUD', { unit_num: '03', width: 600, mount_height: 1500 }, { x_mm: 0 }),
];
const entries = units.map((unit) => ({ unit, result: computeCabinet({ ...unit.params }, P) }));
const design = { fronts: { style: 'S' }, worktops: [{ id: 'wt1', unitIds: ['a1', 'a2'], decor: null, extendLeft: 0, extendRight: 0, extendFront: 0 }] };
const room = { height: 2400, corners: [{ x: 0, y: 0 }, { x: 5000, y: 0 }, { x: 5000, y: 3000 }, { x: 0, y: 3000 }] };

// 1. the grammar alone: cutCabinet on BUD 600 (member 01)
const g = wallGroups(entries, P)[0];
const m = g.members.find((x) => x.unit.id === 'a1');
console.log('member 01: base', m.base, 'top', m.top, 'unitBase', unitBase(m.unit, P), 'unitTop', unitTop(m.unit, P));
const ents = cutCabinet(m, P);
const tally = (list) => list.reduce((o, e) => { const k = `${e.kind}:${e.layer}`; o[k] = (o[k] || 0) + 1; return o; }, {});
console.log('cutCabinet(BUD 600) entities', ents.length, JSON.stringify(tally(ents)));
for (const e of ents) console.log('  ', JSON.stringify(e));
const unitSec = buildUnitSection(m, { room, profile: P });
console.log('buildUnitSection entities', unitSec.entities.length, 'bounds', JSON.stringify(unitSec.bounds));

// 2. the worktop the section draws
const slabs = worktopsFor({ records: design.worktops, units, profile: P });
console.log('worktop geometry', JSON.stringify(slabs.map((s) => ({ x: s.geometry.x, y: s.geometry.y, w: s.geometry.w, h: s.geometry.h, d: s.geometry.d }))));

// 3. the real PDF sheet: Wall A, Sections A-A, rendered to SVG
const sheets = wallDrawingSheets({ entries, project: { name: 'T80 probe', design, room }, room, design, profile: P, date: '22/10/2026' });
console.log('sheet names', JSON.stringify(sheets.map((s) => s.name)));
const sec = sheets.find((s) => s.variant === 'sections');
const svg = sheetToSvg(sec.sheet, { kind: 'section' });
const count = (re) => (svg.match(re) || []).length;
console.log('SVG bytes', svg.length, 'sheet', sec.sheet.width, 'x', sec.sheet.height, 'mm');
console.log('elements: line', count(/<line /g), 'rect', count(/<rect /g), 'path', count(/<path /g), 'text', count(/<text /g), 'circle', count(/<circle /g));
const byLayer = {};
for (const mm of svg.matchAll(/<(\w+) [^>]*data-layer="([A-Z_]+)"/g)) { const k = `${mm[1]}:${mm[2]}`; byLayer[k] = (byLayer[k] || 0) + 1; }
console.log('by tag:layer', JSON.stringify(byLayer));
console.log('worktop rect (fill #d9d9d9) present', /fill="#d9d9d9"/.test(svg));
```

```js
// T80 F8 probe, part 2: the A-A station's own entities at 1:1 (no sheet frame).
import { computeCabinet } from '../../src/engine/cabinet.js';
import { defaultParamsFor } from '../../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../../src/engine/profile.js';
import { wallGroups } from '../../src/engine/drawings/wallElevation.js';
import { sectionStations, buildStation } from '../../src/engine/drawings/setSection.js';
import { drawingContext } from '../../src/engine/drawings/setSheet.js';
import { worktopsFor } from '../../src/engine/worktop.js';
const mk = (id, type, over, pos) => ({ id, type, params: { ...defaultParamsFor(type, P), ...over }, position: { wall: 0, x_mm: 0, rotation_deg: 0, ...pos } });
const units = [
  mk('a1', 'BUD', { unit_num: '01', width: 600, plinth: true }, { x_mm: 0 }),
  mk('a2', 'BUD', { unit_num: '02', width: 600, plinth: true }, { x_mm: 600 }),
  mk('w1', 'WUD', { unit_num: '03', width: 600, mount_height: 1500 }, { x_mm: 0 }),
];
const entries = units.map((unit) => ({ unit, result: computeCabinet({ ...unit.params }, P) }));
const slabs = worktopsFor({ records: [{ id: 'wt1', unitIds: ['a1', 'a2'] }], units, profile: P }).map((w) => w.geometry);
const g = wallGroups(entries, P)[0];
const st = sectionStations(g)[0];
const one = buildStation(g, st, { room: { height: 2400 }, worktops: slabs, profile: P, ctx: drawingContext(1, P) });
const t = {};
for (const e of one.entities) { const k = `${e.kind}:${e.layer}`; t[k] = (t[k] || 0) + 1; }
console.log('station', st.letter, 'x', st.x, 'entities', one.entities.length, JSON.stringify(t));
for (const e of one.entities.filter((e) => e.layer !== 'DIMENSIONS' && !(e.layer === 'BUILDING' && e.kind === 'line' && e.pen === 'FINE'))) console.log(JSON.stringify(e));
```
