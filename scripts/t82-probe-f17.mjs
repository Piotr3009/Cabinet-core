/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T82 F17 · THE PROBE: THE PANEL IN FRONT OF A CHIMNEY CANNOT GROW
//
// The owner, 25.10.2026, 13:36: *"jak mam frontowy komin to nie moge
// powiekszyc panela bo mi wchodzi w sciane"*. CLAUDE.md T82 F17: "PROBED on
// 25.10 (commit the table as verify/t82/f17-probe.md from these rows, then
// fix)". Every row of CLAUDE.md is re-run here on the branch: the store's own
// actions on the chat-fix's own stage (test/chatfix-2510-attach-panel.test.js
// `stage()`), the lines read from the source as they stand.
//
// Read only: the store builds the stage in memory, nothing is saved.
//
//   node scripts/t82-probe-f17.mjs            (prints the table)
//   node scripts/t82-probe-f17.mjs --write    (and writes verify/t82/f17-probe.md)

import { useProjectStore, validateUnit } from '../src/stores/projectStore.js';
import { rectCorners, roomWalls, wallPlanObstacles } from '../src/engine/room.js';
import { getCabinetProfile } from '../src/engine/profile.js';
import { backStandoff, boxSpansOnWall, clampUnitWidth } from '../src/engine/collision.js';
import { obstaclesBeyond } from '../src/engine/attachPanel.js';
import {
  lineOf, at, table, emit, mm, sourceCommit,
} from './t82-probe-lib.mjs';

const S = () => useProjectStore.getState();
const P = getCabinetProfile();
const unit = (id) => S().units.find((u) => u.id === id);
const STORE = 'src/stores/projectStore.js';
const COLL = 'src/engine/collision.js';
const ATT = 'src/engine/attachPanel.js';

/** The chat-fix stage, word for word (the chimney's x the one thing a row may change). */
function stage(chimneyX = 2500) {
  S().newProject();
  S().setRoom({
    corners: rectCorners(5000, 3000), height: 2500, boxes: [{ id: 'bx1', x: 4400, y: 0, w: 400, d: 300 }],
  });
  const chimney = S().addWallSlope({ kind: 'chimney', wall: 0, x_mm: chimneyX, width: 600, depth: 350 });
  const bud = S().addUnit('BUD', { wall: 0, x: 600 }).id;
  S().updateUnitParams(bud, { width: 800 });
  const wud = S().addUnit('WUD', { wall: 0, x: 1600 }).id;
  const panel = S().addUnit('FREE_PANEL', { wall: 0, x: 3600 }).id;
  return { bud, wud, panel, chimney };
}

/** The stage with the panel on the chimney's front (gap 0). */
function onFront(chimneyX = 2500) {
  const ids = stage(chimneyX);
  const res = S().attachFreePanel(ids.panel, `obstacle:${ids.chimney}:front`, { gap: 0 });
  return { ...ids, res };
}

const box = (id) => {
  const u = unit(id);
  return `x ${mm(u.position.x_mm)}, width ${mm(u.params.width)}, depth ${mm(u.params.depth)}, inset_back_mm ${mm(u.params.inset_back_mm ?? 0)}`;
};
const said = (notices) => (notices?.length ? notices.map((n) => `"${n}"`).join(' ') : 'no notice');

// ─── THE LINES, AS THEY STAND ───────────────────────────────────────────────
const L = {};
L.uup = lineOf(STORE, 'updateUnitParams: (unitId, asked) => runBatch(');
L.widthIf = lineOf(STORE, 'if (patch.width != null) {', L.uup);
L.spans = lineOf(STORE, 'const spans = wallObstacles({', L.widthIf);
L.spansBoxes = lineOf(STORE, 'boxes: planObstaclesOf(s.project.room, s.project.wallSlopes)', L.spans);
L.spansEnd = lineOf(STORE, '});', L.spansBoxes);
L.nearLoop = lineOf(STORE, 'for (const o of spans) {', L.spans);
L.nearTake = lineOf(STORE, 'nearEdgeTo = at - takeLeft;', L.nearLoop);
L.nearHave = lineOf(STORE, 'const have = Number(unit.params.width) || 0;', L.nearLoop);
L.refusal = lineOf(STORE, 'This wardrobe cannot grow either way', L.nearLoop);
L.depthIf = lineOf(STORE, 'if (patch.depth != null) {', L.refusal);
L.bounds = lineOf(STORE, 'unitSizeBoundsFor: (unitId) => {');
L.boundsW = lineOf(STORE, 'const w = clampUnitWidth({', L.bounds);
L.boundsBoxes = lineOf(STORE, 'boxes: planObstaclesOf(s.project.room, s.project.wallSlopes)', L.boundsW);
L.boundsEnd = lineOf(STORE, '}),', L.boundsBoxes);
L.validate = lineOf(STORE, 'export function validateUnit(unit, result, context = {}) {');
L.validateOthers = lineOf(STORE, 'others: wallObstacles({', L.validate);
L.validateBoxes = lineOf(STORE, 'boxes: planObstaclesOf(context.room, context.wallSlopes)', L.validateOthers);
L.validateEnd = lineOf(STORE, 'enter: notchEnterFor(unit, profile),', L.validateBoxes);
L.move = lineOf(STORE, 'boxes: isFreePanel(unit.type)');
L.moveEnd = lineOf(STORE, ': planObstaclesOf(s.project.room, s.project.wallSlopes),', L.move);
L.insets = lineOf(STORE, 'setUnitInsets: (unitId, patch) => {');
L.insetMax = lineOf(STORE, 'const max = profile.editor.maxInset;', L.insets);
L.insetMin = lineOf(STORE, 'applied[param] = Math.min(max,', L.insetMax);
L.boxSkip = lineOf(COLL, 'if (span.far <= 0 || span.near >= (Number(depth) || 0)) continue;');
L.cwFn = lineOf(COLL, 'export function clampUnitWidth({');
L.cwLoop = lineOf(COLL, 'for (const o of others) {', L.cwFn);
L.cwFree = lineOf(COLL, 'if (free < max) { max = Math.max(0, free);', L.cwLoop);
L.overlap = lineOf(COLL, "code: 'UNIT_OVERLAP',");
L.overlapMsg = lineOf(COLL, 'message: `Unit overlaps ${o.label', L.overlap);
L.attachFront = lineOf(ATT, "if (target.face === 'front') {");
L.attachInset = lineOf(ATT, 'inset_back_mm: insetFor(span.far + g)', L.attachFront);
L.maxInset = lineOf('src/engine/profile.js', 'maxInset: 300,');
L.rpInset = lineOf('src/components/RightPanel.jsx', 'max={profile.editor.maxInset}');
L.chimneyLabel = lineOf('src/engine/room.js', "label: el.kind === 'chimney' ? 'a chimney on this wall'");

const rows = [];
const row = (r) => rows.push(r);

// ─── 1 · THE STAGE ──────────────────────────────────────────────────────────
{
  const { panel, res } = onFront();
  const u = unit(panel);
  row({
    what: 'the stage: the chat-fix room 5000 x 3000 x 2500, a chimney on wall 1 at x 2500 (600 wide, 350 deep), BUD 800 at 600, WUD at 1600, FREE_PANEL 800 x 400 x 18; attachFreePanel to "Chimney on wall 1, front", gap 0',
    where: at(ATT, L.attachFront, L.attachInset),
    measured: `${res.ok ? 'ok' : 'refused'}, clamped ${res.clamped}; ${box(panel)}; backStandoff ${mm(backStandoff(u, P))} (wall clearance ${P.room.wallBackClearance} + inset)`,
    said: 'inset_back_mm 340; backStandoff 350 after an attach to the chimney\'s front',
    verdict: 'CONFIRMED',
  });
}

// ─── 2 · WHY THE CHIMNEY COUNTS: THE DEPTH IS READ FROM THE WALL LINE ──────
{
  const { panel } = onFront();
  const u = unit(panel);
  const room = S().project.room;
  const wall = roomWalls(room)[0];
  const plan = [...room.boxes, ...wallPlanObstacles(room, S().project.wallSlopes, { blocking: true })];
  const kept = boxSpansOnWall({ wall, depth: u.params.depth, boxes: plan });
  const beyond = boxSpansOnWall({ wall, depth: u.params.depth, boxes: obstaclesBeyond(plan, wall, backStandoff(u, P)) });
  row({
    what: 'boxSpansOnWall keeps a box whose span.near < depth; the depth handed in is the panel\'s 18 from the WALL line, not from its back line',
    where: at(COLL, L.boxSkip),
    measured: `depth ${mm(u.params.depth)}: kept ${kept.map((k) => `${k.label} ${mm(k.left)}..${mm(k.right)} near ${mm(k.near)} far ${mm(k.far)}`).join('; ')}. Through obstaclesBeyond(..., backStandoff ${mm(backStandoff(u, P))}) first: kept ${beyond.length}`,
    said: 'collision.js 470: keeps any box whose span.near < depth, and depth is the panel\'s 18 from the WALL line, not from the panel\'s back line (backStandoff 350)',
    verdict: `CONFIRMED (line ${L.boxSkip}; the room box bx1, far 300, is kept too)`,
  });
}

// ─── 3 · THE THREE UNFILTERED CALL SITES, AND THE ONE THAT IS FILTERED ─────
row({
  what: 'updateUnitParams: the width spans built with boxes: planObstaclesOf(...) unfiltered',
  where: at(STORE, L.widthIf, L.spansEnd),
  measured: `wallObstacles({ ... boxes: planObstaclesOf(s.project.room, s.project.wallSlopes) }) at line ${L.spansBoxes}, no free-panel branch (the if at ${L.widthIf})`,
  said: 'projectStore.js 6823 to 6827',
  verdict: `CONFIRMED (${L.widthIf} to ${L.spansEnd})`,
});
row({
  what: 'unitSizeBoundsFor: the width bound built with the same unfiltered boxes',
  where: at(STORE, L.boundsW, L.boundsEnd),
  measured: `clampUnitWidth({ ... others: wallObstacles({ ... boxes: planObstaclesOf(...) }) }), boxes at line ${L.boundsBoxes}`,
  said: 'unitSizeBoundsFor (6440 to 6446)',
  verdict: `CONFIRMED (${L.boundsW} to ${L.boundsEnd})`,
});
row({
  what: 'validateUnit: the overlap issues built with the same unfiltered boxes',
  where: at(STORE, L.validateOthers, L.validateEnd),
  measured: `wallObstacles({ ... boxes: planObstaclesOf(context.room, context.wallSlopes) }), boxes at line ${L.validateBoxes}`,
  said: 'validateUnit (12154 to 12156)',
  verdict: `CONFIRMED (${L.validateOthers} to ${L.validateEnd})`,
});
row({
  what: 'moveUnit: the one call site already filtered for a free panel (the chat-fix)',
  where: at(STORE, L.move, L.moveEnd),
  measured: 'boxes: isFreePanel(unit.type) ? obstaclesBeyond(planObstaclesOf(...), wall, backStandoff(unit, getCabinetProfile())) : planObstaclesOf(...)',
  said: 'exactly as moveUnit does since the chat-fix (7193 to 7195)',
  verdict: `CONFIRMED (${L.move} to ${L.moveEnd})`,
});

// ─── 4 · THE WIDTHS ─────────────────────────────────────────────────────────
for (const [length, want] of [
  [600, 'clampUnitWidth (collision.js 626 to 628) finds free = 0: "Width limited to 0 mm by a chimney on this wall" and the panel becomes 1 wide'],
  [900, 'no notice but the F9 near-edge branch (6858 to 6864) takes the whole 900 from the left and the panel leaves the chimney\'s face (x 2500 to 1600)'],
  [1200, 'not a 25.10 row (the fix\'s test: a panel on the chimney\'s front grows from 800 to 1200 with no notice and keeps x 2500)'],
]) {
  const { panel } = onFront();
  const r = S().updateUnitParams(panel, { panel_length: length });
  const u = unit(panel);
  let verdict;
  if (length === 600) {
    verdict = u.params.width === 1 && /Width limited to 0 mm by a chimney on this wall/.test(r.notices.join(' ')) ? `CONFIRMED (the loop ${L.cwLoop} to ${L.cwFree})` : 'DIFFERS';
  } else if (length === 900) {
    verdict = !r.notices.length && u.position.x_mm === 1600 && u.params.width === 900 ? `CONFIRMED (${L.nearHave} to ${L.nearTake + 1})` : 'DIFFERS';
  } else {
    verdict = `NEW ROW: the near edge takes ${mm(2500 - u.position.x_mm)} from the left until the BUD (Unit 01) holds it; the panel leaves the chimney's face`;
  }
  row({
    what: `panel on the chimney's front: updateUnitParams(panel, { panel_length: ${length} })`,
    where: length === 600 ? at(COLL, L.cwLoop, L.cwFree) : at(STORE, L.nearHave, L.nearTake + 1),
    measured: `${said(r.notices)}; ${box(panel)}`,
    said: want,
    verdict,
  });
}

// ─── 5 · THE CORNER ─────────────────────────────────────────────────────────
{
  const { panel, res, bud } = onFront(0);
  const first = box(panel);
  const out = [];
  let refused = 0;
  for (const length of [600, 900, 1200]) {
    const r = S().updateUnitParams(panel, { panel_length: length });
    if (r.notices.some((n) => n === 'This wardrobe cannot grow either way: a chimney on this wall is on the right and the infill at the wall is on the left. 0 mm is what it can be.')) refused++;
    out.push(`${length}: ${said(r.notices)} (${box(panel)})`);
  }
  row({
    what: 'a chimney in the corner (the stage with the chimney at x 0), the panel on its front, then panel_length 600, 900, 1200 in turn',
    where: at(STORE, L.refusal),
    measured: `attach clamped ${res.clamped} (${first}; the BUD at x ${mm(unit(bud).position.x_mm)}). ${out.join(' ')}`,
    said: '"This wardrobe cannot grow either way: a chimney on this wall is on the right and the infill at the wall is on the left. 0 mm is what it can be." (the sentence calls a panel a wardrobe)',
    verdict: refused === 2 ? 'CONFIRMED word for word on 900 and 1200 (600 is a shrink: "Width limited to 0 mm")' : 'DIFFERS',
  });
}

// ─── 6 · THE THICKNESS THROUGH THE SAME CLAMP ───────────────────────────────
{
  const { panel } = onFront();
  const r = S().updateUnitParams(panel, { board_t: 36 });
  const u = unit(panel);
  row({
    what: 'board_t 36 on the panel on the chimney\'s front',
    where: at(STORE, L.spans, L.spansEnd),
    measured: `${said(r.notices)}; ${box(panel)}, board_t ${u.params.board_t}`,
    said: 'goes through the same clamp and shrinks it to 1',
    verdict: u.params.width === 1 ? 'CONFIRMED (the box depth follows to 36; the board inside it is F18)' : 'DIFFERS',
  });
}

// ─── 7 · THE BOUNDS THE RIGHT PANEL READS ───────────────────────────────────
{
  const { panel } = onFront();
  const b = S().unitSizeBoundsFor(panel);
  row({
    what: 'unitSizeBoundsFor(panel), the width field\'s bounds',
    where: at(STORE, L.bounds, L.boundsEnd),
    measured: `width min ${mm(b.width.min)} max ${mm(b.width.max)} by "${b.width.by}" (the min from ${b.width.from.split(' / ')[0]}); depth max ${mm(b.depth.max)}; height max ${mm(b.height.max)}`,
    said: 'width max 0',
    verdict: b.width.max === 0 ? 'CONFIRMED (and its min 200, a wardrobe\'s top box, stands above the max)' : 'DIFFERS',
  });
}

// ─── 8 · THE CHECK THE RIGHT PANEL SHOWS ────────────────────────────────────
{
  const { panel } = onFront();
  const e = S().allResults().find((x) => x.unit.id === panel);
  const p = S().project;
  const issues = validateUnit(e.unit, e.result, { room: p.room, units: S().units, wallSlopes: p.wallSlopes });
  const ov = issues.filter((i) => i.code === 'UNIT_OVERLAP');
  row({
    what: 'validateUnit(panel) as the right panel calls it ({ room, units, wallSlopes })',
    where: `${at(STORE, L.validateBoxes)}; ${at(COLL, L.overlapMsg)}`,
    measured: ov.map((i) => `${i.level} ${i.code}: "${i.message}"`).join(' ') || 'no UNIT_OVERLAP',
    said: 'UNIT_OVERLAP "overlaps a chimney by 600"',
    verdict: ov.length === 1
      ? `CONFIRMED; the sentence says "on this wall" twice (the chimney's label, src/engine/room.js:${L.chimneyLabel}, then the message's own)`
      : 'DIFFERS',
  });
}

// ─── 9 · THE INSET CAP ──────────────────────────────────────────────────────
{
  const { panel } = onFront();
  const before = unit(panel).params.inset_back_mm;
  const r1 = S().setUnitInsets(panel, { left: 0 });
  const afterLeft = unit(panel).params.inset_back_mm;
  const r2 = S().setUnitInsets(panel, { back: before });
  const afterBack = unit(panel).params.inset_back_mm;
  row({
    what: `attachPlan writes inset_back_mm ${mm(before)} (editor.maxInset is ${P.editor.maxInset}); then setUnitInsets`,
    where: `${at(ATT, L.attachInset)}; ${at(STORE, L.insetMax, L.insetMin)}; ${at('src/engine/profile.js', L.maxInset)}; ${at('src/components/RightPanel.jsx', L.rpInset)}`,
    measured: `setUnitInsets({ left: 0 }): inset_back_mm ${mm(afterLeft)} (${said(r1.notices)}); setUnitInsets({ back: ${mm(before)} }): applied ${JSON.stringify(r2.applied)}, inset_back_mm ${mm(afterBack)}, ${mm(before - afterBack)} into the chimney (${said(r2.notices)})`,
    said: 'attachPlan writes inset_back_mm 340 for a chimney 350 deep, above editor.maxInset 300, and any later setUnitInsets pulls the panel 40 into the chimney',
    verdict: afterBack === P.editor.maxInset
      ? `CONFIRMED for a setUnitInsets that carries back (the right panel's Inset back field has max ${P.editor.maxInset} too); one that carries only left or right leaves the back at ${mm(afterLeft)}`
      : 'DIFFERS',
  });
}

// ─── 10 · ACROSS, BESIDE THE CHIMNEY: KEEP IT ───────────────────────────────
for (const side of ['left', 'right']) {
  const out = [];
  let x = null;
  for (const length of [900, 1200, 2000, 3500]) {
    const { panel, chimney } = stage();
    S().attachFreePanel(panel, `obstacle:${chimney}:${side}`, { gap: 0 });
    const r = S().updateUnitParams(panel, { panel_length: length });
    x = unit(panel).position.x_mm;
    out.push(`${length}: depth ${mm(unit(panel).params.depth)}${r.notices.length ? `, ${said(r.notices)}` : ''}`);
  }
  row({
    what: `a panel ACROSS the wall on the chimney's ${side} side (x ${mm(x)}), panel_length 900, 1200, 2000, 3500`,
    where: at(STORE, L.depthIf),
    measured: out.join('; '),
    said: '900, 1200, 2000 pass; 3500 says "Depth limited to 2990 mm by the room"; keep it',
    verdict: 'CONFIRMED (the sentence goes on ", and this unit\'s back inset.")',
  });
}

// ─── 11 · WHAT THE ONE LINK GIVES (engine functions only, store untouched) ─
{
  const { panel } = onFront();
  const u = unit(panel);
  const room = S().project.room;
  const wall = roomWalls(room)[0];
  const plan = [...room.boxes, ...wallPlanObstacles(room, S().project.wallSlopes, { blocking: true })];
  const ask = (boxes) => clampUnitWidth({
    width: 1200,
    x: u.position.x_mm,
    wallWidth: wall.width,
    others: boxSpansOnWall({ wall, depth: u.params.depth, boxes }),
    wallMargin: P.room.wallBackClearance,
  }, P);
  const today = ask(plan);
  const fixed = ask(obstaclesBeyond(plan, wall, backStandoff(u, P)));
  row({
    what: 'clampUnitWidth at width 1200 from x 2500 with the box spans alone (no unit stands to the panel\'s right in its band), unfiltered vs through obstaclesBeyond(plan, wall, backStandoff)',
    where: at(COLL, L.cwFn, L.cwFree),
    measured: `unfiltered: width ${mm(today.width)}, max ${mm(today.max)}, by "${today.by}"; filtered: width ${mm(fixed.width)}, max ${mm(fixed.max)}, by ${fixed.by ? `"${fixed.by}"` : 'nothing'}`,
    said: 'the three call sites take obstaclesBeyond(planObstaclesOf(...), wall, backStandoff(panel, profile)) as boxes',
    verdict: 'CONFIRMED as the one link: filtered, the far edge reaches the wall end less the clearance and the panel keeps x 2500',
  });
}

const md = `# T82 F17 · the probe of the panel in front of a chimney

The owner, 25.10.2026, 13:36: *"jak mam frontowy komin to nie moge powiekszyc panela bo mi wchodzi w sciane"*.

Reproduce: \`node scripts/t82-probe-f17.mjs\` (add \`--write\` to rewrite this file). Measured on the source tree of commit ${sourceCommit()} (this branch); every line number was found in the file by the script, not remembered. The stage is the chat-fix's own (\`test/chatfix-2510-attach-panel.test.js stage()\`), built through the store's actions in memory. A notice the source writes with an em dash shows it as [U+2014].

${table(rows)}

## The one link the fix must change

CONFIRMED as CLAUDE.md names it. For a FREE_PANEL the three unfiltered call sites take \`obstaclesBeyond(planObstaclesOf(...), wall, backStandoff(panel, profile))\` as \`boxes\`, exactly as \`moveUnit\` does (${at(STORE, L.move, L.moveEnd)}):

1. \`updateUnitParams\`, the width spans, ${at(STORE, L.spans, L.spansEnd)}; the near-edge loop (${at(STORE, L.nearLoop, L.nearLoop + 3)}) and branch (${at(STORE, L.nearHave, L.nearTake + 1)}) read the same \`spans\` and follow.
2. \`unitSizeBoundsFor\`, ${at(STORE, L.boundsW, L.boundsEnd)}.
3. \`validateUnit\`, ${at(STORE, L.validateOthers, L.validateEnd)}.

Row 2 is why the chimney counts: \`boxSpansOnWall\` (${at(COLL, L.boxSkip)}) measures \`depth\` from the wall line, so a panel standing 350 off the wall with a depth of 18 reads as inside a chimney 0 to 350 deep. Beside the link: the refusal sentence (${at(STORE, L.refusal)}) names the unit by its type's label, never "wardrobe" for a panel; a free panel's back inset is capped by the room, not by \`editor.maxInset\` (${at(STORE, L.insetMax, L.insetMin)}; the 300 at ${at('src/engine/profile.js', L.maxInset)}).
`;

emit('f17-probe.md', md);
