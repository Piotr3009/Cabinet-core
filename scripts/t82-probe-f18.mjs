/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T82 F18 · THE PROBE: THE THICKNESS DOES NOT SHOW
//
// The owner, 25.10.2026, 13:36: *"nie moge wizualnie zwiekszyc tez grubosci
// tego panela"*. CLAUDE.md T82 F18: "PROBED on 25.10 (verify/t82/f18-probe.md):
// updateUnitParams(id, { board_t: 36 }) writes board_t 36 and a box depth 36,
// but the engine's FP board stays t 18, box.d 18". Every row re-run here on the
// branch: the store's own actions, the engine's own computeCabinet with and
// without the slots, the lines read from the source as they stand.
//
// Read only: the store builds the stage in memory, nothing is saved.
//
//   node scripts/t82-probe-f18.mjs            (prints the table)
//   node scripts/t82-probe-f18.mjs --write    (and writes verify/t82/f18-probe.md)

import { useProjectStore } from '../src/stores/projectStore.js';
import { rectCorners } from '../src/engine/room.js';
import { getCabinetProfile } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { freePanelOf } from '../src/engine/freePanel.js';
import { projectThicknesses } from '../src/engine/thickness.js';
import { cutRows } from '../src/engine/drawings/setPaper.js';
import {
  lineOf, linesOf, at, table, emit, mm, sourceCommit, textAt,
} from './t82-probe-lib.mjs';

const S = () => useProjectStore.getState();
const P = getCabinetProfile();
const unit = (id) => S().units.find((u) => u.id === id);
const resultOf = (id) => S().allResults().find((e) => e.unit.id === id)?.result;
const fpOf = (result) => result.panels.find((p) => p.id === 'FP');
const CAB = 'src/engine/cabinet.js';
const STORE = 'src/stores/projectStore.js';
const VIEW = 'src/3d/UnitView.jsx';
const EP = 'src/components/ElementProperties.jsx';

// ─── THE LINES, AS THEY STAND ───────────────────────────────────────────────
const L = {};
L.free = lineOf(CAB, "if (type.carcass.top === 'free') {");
L.fpT = lineOf(CAB, 'const fpT = G;', L.free);
L.fpOf = lineOf(CAB, 'const fp = freePanelOf({ ...params, width: W, height: H, depth: D, board_t: fpT }, P);', L.fpT);
L.fpThk = lineOf(CAB, 'w: fp.length, h: fp.width, thickness: fpT,', L.fpOf);
L.slotT = lineOf(CAB, "carcass1: slotT('carcass1', G),");
L.carcassG = lineOf(CAB, 'const carcassG = thicknesses.carcass1;', L.slotT);
L.cfgG = lineOf(CAB, 'G: carcassG,', L.carcassG);
L.slots = lineOf(STORE, 'thickness_slots: design');
L.slotsEnd = lineOf(STORE, ': null,', L.slots);
L.box = lineOf(VIEW, ': <boxGeometry args={[mm(p.box.w), mm(p.box.h), mm(p.box.d)]} />)}');
L.field = lineOf(EP, 'data-free-panel-thickness="1"');
L.fieldValue = lineOf(EP, 'value={board.thickness}', L.field);
L.fieldBoard = lineOf(EP, 'const board = freePanelOf(unit.params, profile);', L.field - 40);
L.cutT = lineOf('src/engine/drawings/setPaper.js', 't: p.thickness');

const rows = [];
const row = (r) => rows.push(r);

function room() {
  S().newProject();
  S().setRoom({ corners: rectCorners(5000, 3000), height: 2500 });
}

// ─── 1 · ALONG, UPRIGHT ─────────────────────────────────────────────────────
{
  room();
  const id = S().addUnit('FREE_PANEL', { wall: 0, x: 1000 }).id;
  const r = S().updateUnitParams(id, { board_t: 36 });
  const u = unit(id);
  const fp = fpOf(resultOf(id));
  row({
    what: 'a FREE_PANEL along the wall, upright (800 x 400 x 18): updateUnitParams(id, { board_t: 36 })',
    where: at(STORE, lineOf(STORE, 'updateUnitParams: (unitId, asked) => runBatch(')),
    measured: `writes board_t ${u.params.board_t}, box ${mm(u.params.width)} x ${mm(u.params.height)} x ${mm(u.params.depth)} (notices: ${r.notices.length}); the engine's FP: thickness ${mm(fp.thickness)}, box.d ${mm(fp.box.d)}`,
    said: 'writes board_t 36 and a box depth 36, but the engine\'s FP board stays t 18, box.d 18',
    verdict: fp.thickness === 18 && fp.box.d === 18 && u.params.depth === 36 ? 'CONFIRMED (the part\'s field is `thickness`)' : 'DIFFERS',
  });
}

// ─── 2 · THE ONE LINE ───────────────────────────────────────────────────────
row({
  what: 'the FP part\'s thickness in the engine',
  where: at(CAB, L.fpT, L.fpThk),
  measured: `${textAt(CAB, L.fpT)} then freePanelOf({ ...params, board_t: fpT }) at ${L.fpOf}, thickness: fpT at ${L.fpThk}: the panel's own params.board_t is overwritten by G before it is read`,
  said: 'engine/cabinet.js 3581 const fpT = G',
  verdict: `CONFIRMED (${L.fpT})`,
});
row({
  what: 'where G comes from',
  where: `${at(CAB, L.slotT)}; ${at(CAB, L.carcassG)}; ${at(CAB, L.cfgG)}`,
  measured: `${textAt(CAB, L.slotT)} (${L.slotT}); ${textAt(CAB, L.carcassG)} (${L.carcassG}); ${textAt(CAB, L.cfgG)} (${L.cfgG})`,
  said: 'G is cfg.G = carcassG (1062, 792) = thicknesses.carcass1 = slotT(\'carcass1\', G) (781)',
  verdict: `CONFIRMED (${L.cfgG}, ${L.carcassG}, ${L.slotT})`,
});
{
  room();
  const slots = projectThicknesses({ design: S().project.design, profile: P });
  row({
    what: 'paramsForEngine always fills the slots from the project',
    where: at(STORE, L.slots, L.slotsEnd),
    measured: `${textAt(STORE, L.slots)} ? projectThicknesses(...) : null; the default project gives carcass1 ${slots.carcass1}`,
    said: 'paramsForEngine always fills from the project\'s thickness slots (projectStore.js 1317 to 1319), so the project\'s carcass 18 overrides the panel\'s own board_t',
    verdict: `CONFIRMED (${L.slots} to ${L.slotsEnd})`,
  });
}

// ─── 3 · BARE ───────────────────────────────────────────────────────────────
{
  room();
  const id = S().addUnit('FREE_PANEL', { wall: 0, x: 1000 }).id;
  S().updateUnitParams(id, { board_t: 36 });
  const params = { ...unit(id).params };
  delete params.thickness_slots;
  const bare = fpOf(computeCabinet(params));
  const slotted = fpOf(computeCabinet({ ...params, thickness_slots: { carcass1: 18 } }));
  row({
    what: 'a bare computeCabinet of that panel\'s params (board_t 36), with no slots and with { carcass1: 18 }',
    where: at(CAB, lineOf(CAB, 'export function computeCabinet(params, profileOverride) {')),
    measured: `no slots: thickness ${mm(bare.thickness)}, box.d ${mm(bare.box.d)}; { carcass1: 18 }: thickness ${mm(slotted.thickness)}, box.d ${mm(slotted.box.d)}`,
    said: 'a bare computeCabinet with no slots gives t 36, with { carcass1: 18 } gives 18',
    verdict: bare.thickness === 36 && slotted.thickness === 18 ? 'CONFIRMED' : 'DIFFERS',
  });
}

// ─── 4 · THE ROOM, THE CUT LIST, THE FIELD ──────────────────────────────────
{
  room();
  const id = S().addUnit('FREE_PANEL', { wall: 0, x: 1000 }).id;
  S().updateUnitParams(id, { board_t: 36 });
  const u = unit(id);
  const result = resultOf(id);
  const fp = fpOf(result);
  const cut = [...cutRows(result).carcass, ...cutRows(result).fronts].find((c) => c.id === 'FP');
  const field = freePanelOf(u.params, P).thickness;
  row({
    what: 'what each reader shows for that panel',
    where: `${at(VIEW, L.box)}; ${at('src/engine/drawings/setPaper.js', L.cutT)}; ${at(EP, L.fieldBoard)}, ${at(EP, L.fieldValue)}`,
    measured: `the room draws the FP from p.box: ${mm(fp.box.w)} x ${mm(fp.box.h)} x ${mm(fp.box.d)} inside a unit box ${mm(u.params.depth)} deep; the cut list row FP ${mm(cut.w)} x ${mm(cut.h)} t${mm(cut.t)}; the CSV line "${result.csvLines.find((l) => /,FP,/.test(l))}" (no thickness column); the Thickness field (freePanelOf(unit.params).thickness) reads ${mm(field)}`,
    said: 'the room (UnitView.jsx 1317, boxGeometry from p.box) and the cut list follow the engine',
    verdict: fp.box.d === 18 && cut.t === 18 && field === 36 ? `CONFIRMED (${L.box}); the field says 36 while the board is 18` : 'DIFFERS',
  });
}

// ─── 5 · ACROSS, ATTACHED: THE 18 GAP ──────────────────────────────────────
{
  room();
  const bud = S().addUnit('BUD', { wall: 0, x: 600 }).id;
  S().updateUnitParams(bud, { width: 800 });
  const id = S().addUnit('FREE_PANEL', { wall: 0, x: 3600 }).id;
  S().updateUnitParams(id, { board_t: 36 });
  S().attachFreePanel(id, `unit:${bud}:left`, { gap: 0 });
  const u = unit(id);
  const fp = fpOf(resultOf(id));
  const boardRight = u.position.x_mm + fp.box.x + fp.box.w;
  const host = unit(bud).position.x_mm;
  row({
    what: 'an ACROSS panel at board_t 36 attached to a BUD\'s left side (BUD 800 at x 600, gap 0)',
    where: at(CAB, L.fpT, L.fpThk),
    measured: `the unit box x ${mm(u.position.x_mm)}, width ${mm(u.params.width)}; the FP board box.x ${mm(fp.box.x)}, box.w ${mm(fp.box.w)}, thickness ${mm(fp.thickness)}: the board's right face at ${mm(boardRight)}, the BUD at ${mm(host)}, a gap of ${mm(host - boardRight)}`,
    said: 'an across panel at board_t 36 shows a 36 box with an 18 board inside it and an 18 gap against what it was attached to',
    verdict: host - boardRight === 18 ? 'CONFIRMED' : 'DIFFERS',
  });
}

// ─── 6 · THE CABINETS THE LINK MUST NOT MOVE ────────────────────────────────
{
  room();
  const bud = S().addUnit('BUD', { wall: 0, x: 600 }).id;
  const p = unit(bud).params;
  const goldenMentions = ['scripts/t75-fixtures.mjs', 'scripts/t75-golden.mjs', 'scripts/t78-goldens.mjs']
    .reduce((n, f) => n + linesOf(f).filter((l) => l.includes('board_t')).length, 0);
  row({
    what: 'a cabinet carries a board_t of its own too (the default project\'s BUD)',
    where: at(STORE, lineOf(STORE, 'board_t: projectBoardThickness(design, profile),')),
    measured: `BUD params.board_t ${p.board_t}; its side BUL thickness ${mm(resultOf(bud).panels.find((x) => x.id === 'BUL')?.thickness)}; the golden fixture scripts name board_t ${goldenMentions} times (scripts/t75-fixtures.mjs, t75-golden.mjs, t78-goldens.mjs)`,
    said: 'the carcass slot keeps ruling every cabinet (the goldens hold: no fossil has a board_t)',
    verdict: 'CONFIRMED for the link as CLAUDE.md writes it: `params.board_t ?? G` is read in the FP branch ONLY (inside the `top === \'free\'` if), so a cabinet\'s own board_t (every unit is born with one) never reaches it',
  });
}

// ─── 7 · THE FIELD TODAY (read, for the ladder of the fix) ─────────────────
{
  const from = L.field - 3;
  const block = linesOf(EP).slice(from - 1, L.fieldValue + 2).join(' ');
  const ladder = /thicknessOptions|\[18, 22, 25, 30, 36\]/.test(block);
  row({
    what: 'the free panel\'s Thickness field as it stands',
    where: at(EP, from, L.fieldValue + 1),
    measured: `a NumberField (min ${/min=\{1\}/.test(block) ? 1 : '?'}) committing put({ board_t: v }); ${ladder ? 'a ladder is offered' : 'no ladder beside it'}`,
    said: 'a thickness ladder in the field (18, 22, 25, 30, 36, PROPOSED) beside the free number (the fix)',
    verdict: ladder ? 'DIFFERS: a ladder is already there' : 'CONFIRMED: today the free number alone',
  });
}

const md = `# T82 F18 · the probe of the free panel's thickness

The owner, 25.10.2026, 13:36: *"nie moge wizualnie zwiekszyc tez grubosci tego panela"*.

Reproduce: \`node scripts/t82-probe-f18.mjs\` (add \`--write\` to rewrite this file). Measured on the source tree of commit ${sourceCommit()} (this branch); every line number was found in the file by the script, not remembered. The default project and profile, a 5000 x 3000 x 2500 room, built through the store's actions in memory.

${table(rows)}

## The one link the fix must change

CONFIRMED as CLAUDE.md names it: ${at(CAB, L.fpT)}, \`${textAt(CAB, L.fpT)}\` becomes \`const fpT = params.board_t ?? G;\` (the panel's own \`board_t\`, the kit's field since T74, read before the carcass slot). It sits inside the free-panel branch (${at(CAB, L.free)}), so no cabinet reads it. The room (${at(VIEW, L.box)}), the cut list (${at('src/engine/drawings/setPaper.js', L.cutT)}) and the box the store writes already follow; the Thickness field (${at(EP, L.fieldValue)}) already reads \`board_t\`, so after the link all four agree. Row 8: every unit, cabinets included, is born with a \`board_t\` (${at(STORE, lineOf(STORE, 'board_t: projectBoardThickness(design, profile),'))}); the link must stay inside the FP branch, never move up to \`G\`.
`;

emit('f18-probe.md', md);
