/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T82 F22 · THE PROBE: NO HANDLE ON THE SHEETS
//
// The owner, 24.10.2026, 19:34: *"nie widac wogole zeby bylo jakiekolwiek
// handles nic"*. CLAUDE.md T82 F22: "PROBE: the T81 projector draws a handle
// only when the project has chosen one (knob or bar; none chosen = none drawn,
// 0 on every sheet). The owner's DXF draws knobs as circles of 30 and bars as
// rectangles."
//
// The stage is the T81 walk's kitchen (scripts/t81-kitchen.mjs) with the
// project's knob left out (`knob: false`, no handle chosen), in-frame on and
// off, then with the knob and with a bar chosen. Every sheet of the set is
// built as the window builds it (wallSheets.js wallDrawingSheets) and its
// HANDLES entities are counted.
//
// Read only: nothing is saved.
//
//   node scripts/t82-probe-f22.mjs            (prints the table)
//   node scripts/t82-probe-f22.mjs --write    (and writes verify/t82/f22-probe.md)

import { S, t81Kitchen, setArgs } from './t81-kitchen.mjs';
import { getCabinetProfile } from '../src/engine/profile.js';
import { wallDrawingSheets } from '../src/engine/drawings/wallSheets.js';
import { wallGroups } from '../src/engine/drawings/wallElevation.js';
import { buildRunElevation, worktopsOnWall } from '../src/engine/drawings/setElevation.js';
import { drawingContext } from '../src/engine/drawings/setSheet.js';
import { resolveHandle } from '../src/engine/handles.js';
import { normaliseHandle } from '../src/engine/design.js';
import {
  lineOf, at, table, emit, mm, sourceCommit, textAt,
} from './t82-probe-lib.mjs';

const P = getCabinetProfile();
const PJ = 'src/engine/drawings/projector.js';
const STORE = 'src/stores/projectStore.js';
const CAB = 'src/engine/cabinet.js';
const HD = 'src/engine/handles.js';
const DS = 'src/engine/design.js';
const PR = 'src/engine/profile.js';

// ─── THE LINES, AS THEY STAND ───────────────────────────────────────────────
const L = {};
L.marks = lineOf(PJ, 'function handleMarks(m, profile) {');
L.marksRead = lineOf(PJ, 'for (const h of r.drillSummary?.handles || []) {', L.marks);
L.draw = lineOf(PJ, "} else if (mk.kind === 'handle') {");
L.noFronts = lineOf(PJ, "if (mode === 'no-fronts' || mk.standing) continue;", L.draw);
L.knobD = lineOf(PJ, 'const knobD = Number(profile.drawings?.knobDiameter) || 30;', L.draw);
L.circle = lineOf(PJ, "entities.push({ kind: 'circle', layer: 'HANDLES', cx: c[0], cy: c[1], r, pen: 'VISIBLE', src: mk.host, handle: 'knob' });", L.knobD);
L.barLine = lineOf(PJ, "entities.push(line(a, b, { layer: 'HANDLES', pen: 'VISIBLE', src: mk.host, handle: 'bar' }));", L.circle);
L.fixing = lineOf(PJ, "handle: 'fixing' });", L.barLine);
L.pfe = lineOf(STORE, 'project_handle: design?.fronts?.handle');
L.cfg = lineOf(CAB, "handle: p.project_handle && typeof p.project_handle === 'object' ? p.project_handle : null,");
L.loop = lineOf(CAB, 'const handlePlacements = [];');
L.resolve = lineOf(CAB, 'const resolved = resolveHandle({', L.loop);
L.skip = lineOf(CAB, 'if (!resolved) continue;', L.resolve);
L.meta = lineOf(CAB, 'pnl.meta.handle = {', L.skip);
L.push = lineOf(CAB, 'handlePlacements.push({ panel: pnl.id, ...pnl.meta.handle });', L.meta);
L.gate = lineOf(HD, 'if (!chosen || !chosen.type) return null;');
L.norm = lineOf(DS, 'export function normaliseHandle(raw) {');
L.normType = lineOf(DS, "const type = raw.type === 'knob' ? 'knob' : (raw.type === 'bar' ? 'bar' : null);", L.norm);
L.designNull = lineOf(DS, 'handle: null,');
L.knobDia = lineOf(PR, 'knob: { diameter: 30, standoff: 22, stemDiameter: 8 },');
L.drawKnob = lineOf(PR, 'knobDiameter: 30,');

/** The HANDLES entities of every sheet: `[{ no, name, count, by }]`. */
function census() {
  const sheets = wallDrawingSheets(setArgs());
  return sheets.map((sh) => {
    const ents = (sh.sheet?.entities || []).filter((e) => e.layer === 'HANDLES');
    const by = {};
    for (const e of ents) {
      const k = e.handle || e.kind;
      by[k] = (by[k] || 0) + 1;
    }
    return { no: sh.no, name: sh.name, count: ents.length, by };
  });
}
const say = (c) => c.map((s) => `${s.no} ${s.name}: ${s.count}${s.count ? ` (${Object.entries(s.by).map(([k, v]) => `${v} ${k}`).join(', ')})` : ''}`).join('; ');
const drills = () => setArgs().entries.map((e) => `${e.unit.type} ${e.unit.params.width}: ${(e.result.drillSummary?.handles || []).length}`).join(', ');

const rows = [];
const row = (r) => rows.push(r);

// ─── 1 · NONE CHOSEN ────────────────────────────────────────────────────────
for (const inframe of [true, false]) {
  t81Kitchen({ knob: false, inframe });
  const c = census();
  const total = c.reduce((n, s) => n + s.count, 0);
  row({
    what: `in-frame ${inframe ? 'on' : 'off'}, no handle chosen (design.fronts.handle ${JSON.stringify(S().project.design.fronts.handle)}): HANDLES entities on every sheet of the set`,
    where: `${at(PJ, L.marks, L.marksRead)}; ${at(PJ, L.draw, L.fixing)}`,
    measured: `${say(c)}. Total ${total}. drillSummary.handles per unit: ${drills()}`,
    said: 'none chosen = none drawn, 0 on every sheet',
    verdict: total === 0 ? 'CONFIRMED' : 'DIFFERS',
  });
}

// ─── 2 · WHY: THE ENGINE RESOLVES NOTHING TO DRAW ───────────────────────────
row({
  what: 'why nothing is drawn: the projector reads the engine\'s drill summary, which carries a handle only when one is chosen',
  where: `${at(PJ, L.marksRead)}; ${at(STORE, L.pfe)}; ${at(CAB, L.cfg)}; ${at(CAB, L.resolve, L.skip)}; ${at(HD, L.gate)}`,
  measured: `handleMarks walks r.drillSummary?.handles (${L.marksRead}); paramsForEngine passes project_handle only when design.fronts.handle is set (${L.pfe}); cabinet.js resolves each front through resolveHandle and skips a null (${L.skip}); resolveHandle returns null when no type is chosen: "${textAt(HD, L.gate)}" (${L.gate}). The design's default is handle: null (${at(DS, L.designNull)})`,
  said: 'the T81 projector draws a handle only when the project has chosen one (knob or bar)',
  verdict: 'CONFIRMED (the gate is the engine\'s R9, "no handle, no drilling", so the drawing has no position to draw at)',
});

// ─── 3 · WITH ONE CHOSEN ────────────────────────────────────────────────────
{
  t81Kitchen({ knob: true, inframe: true });
  const c = census();
  const a = setArgs();
  const group = wallGroups(a.entries, P)[0];
  const sheets = wallDrawingSheets(a);
  const fr = sheets.find((s) => s.variant === 'fronts' && s.wall === 0);
  const built = buildRunElevation(group, {
    mode: 'fronts', room: a.room, worktops: worktopsOnWall(a.worktops, 0), frontTypeOf: a.frontTypeOf, profile: P, ctx: drawingContext(fr.sheet.scale, P),
  });
  const knobs = built.entities.filter((e) => e.layer === 'HANDLES' && e.handle === 'knob');
  const leaves = a.entries.flatMap((e) => e.result.panels.filter((p) => p.box && (p.part === 'FRONT' || p.part === 'DRAWER-FRONT')));
  row({
    what: 'the same kitchen in-frame with the project\'s knob chosen (setProjectHandle({ type: \'knob\' }))',
    where: `${at(PJ, L.knobD, L.circle)}; ${at(PR, L.drawKnob)}`,
    measured: `${say(c)}. On the fronts sheet (drawing mm): ${knobs.length} circles of r ${[...new Set(knobs.map((k) => mm(k.r)))].join(', ')} (diameter ${[...new Set(knobs.map((k) => mm(2 * k.r)))].join(', ')}), one per front (${leaves.length} fronts); drillSummary.handles per unit: ${drills()}`,
    said: 'the owner\'s DXF draws knobs as circles of 30',
    verdict: knobs.length === leaves.length && knobs.every((k) => k.r === 15) ? 'CONFIRMED: a chosen knob is a circle of 30 on every front (profile.drawings.knobDiameter 30)' : 'DIFFERS',
  });
}
{
  t81Kitchen({ knob: false, inframe: true });
  S().setProjectHandle({ type: 'bar', centres: 128 });
  const a = setArgs();
  const group = wallGroups(a.entries, P)[0];
  const fr = wallDrawingSheets(a).find((s) => s.variant === 'fronts' && s.wall === 0);
  const built = buildRunElevation(group, {
    mode: 'fronts', room: a.room, worktops: worktopsOnWall(a.worktops, 0), frontTypeOf: a.frontTypeOf, profile: P, ctx: drawingContext(fr.sheet.scale, P),
  });
  const h = built.entities.filter((e) => e.layer === 'HANDLES');
  const by = {};
  for (const e of h) by[`${e.kind} ${e.handle}`] = (by[`${e.kind} ${e.handle}`] || 0) + 1;
  const rects = h.filter((e) => e.kind === 'rect').length;
  row({
    what: 'the same kitchen with a bar of 128 centres chosen: how the fronts sheet draws it',
    where: at(PJ, L.barLine, L.fixing),
    measured: `${Object.entries(by).map(([k, v]) => `${v} ${k}`).join(', ')}; ${rects} rectangles`,
    said: 'the owner\'s DXF draws bars as rectangles',
    verdict: rects === 0 ? 'NEW ROW: today a bar is a LINE of its length plus two fixing circles (THIN), not a rectangle' : 'a rectangle is drawn',
  });
}

// ─── 4 · THE DEFAULT, AND 'none' ────────────────────────────────────────────
row({
  what: 'a default handle in the profile, and a "none" choice in the design',
  where: `${at(PR, L.knobDia)}; ${at(PR, L.drawKnob)}; ${at(DS, L.norm, L.normType)}`,
  measured: `profile.handles.default: ${JSON.stringify(P.handles?.default ?? null)}; profile.handles.knob.diameter ${P.handles?.knob?.diameter}; profile.drawings.knobDiameter ${P.drawings?.knobDiameter}; normaliseHandle({ type: 'none' }) gives ${JSON.stringify(normaliseHandle({ type: 'none' }))} (the same null as no choice)`,
  said: 'the profile\'s handles.default, a knob of 30; handles: \'none\' is a choice, not an absence, and draws nothing',
  verdict: 'CONFIRMED as work to do: neither exists today; "none" cannot be said apart from "not chosen"',
});

// ─── 5 · THE ENGINE'S POSITION, WITHOUT DRILLING ────────────────────────────
{
  t81Kitchen({ knob: true, inframe: true });
  const withKnob = setArgs().entries.find((e) => e.unit.type === 'BUD' && e.unit.params.width === 600);
  const drilled = withKnob.result.drillSummary.handles[0];
  t81Kitchen({ knob: false, inframe: true });
  const bare = setArgs().entries.find((e) => e.unit.type === 'BUD' && e.unit.params.width === 600);
  const door = bare.result.panels.find((p) => p.id === drilled.panel);
  const asked = resolveHandle({
    panel: door, unitType: bare.unit.type, project: { type: 'knob' }, hinge: door.meta?.hinge || bare.unit.params.hinge, frame: door.meta?.shaker?.frame ?? null,
  }, P);
  const same = asked && asked.holes[0].x === drilled.holes[0][0] && asked.holes[0].y === drilled.holes[0][1];
  row({
    what: 'where a default knob would stand: resolveHandle asked with { type: \'knob\' } on the un-handled BUD 600\'s door (frame as cabinet.js passes it), against the drilled knob when one is chosen',
    where: `${at(CAB, L.resolve, L.skip)}; ${at(HD, lineOf(HD, 'export function resolveHandle({'))}`,
    measured: `asked: ${asked ? `${asked.type} at x ${mm(asked.holes[0].x)}, y ${mm(asked.holes[0].y)}, rule ${asked.reference.rule}` : 'null'}; drilled with the knob chosen: x ${mm(drilled.holes[0][0])}, y ${mm(drilled.holes[0][1])}, rule ${drilled.rule}; the un-handled door's drillSummary.handles ${bare.result.drillSummary.handles == null ? 'absent' : JSON.stringify(bare.result.drillSummary.handles)}`,
    said: 'the fronts sheet draws the project\'s DEFAULT handle at the engine\'s position, on the HANDLES layer; the drill summary is untouched',
    verdict: same ? 'NEW ROW: the engine\'s own law gives the position without a drill when asked for the drawing alone (one call, the same numbers)' : 'DIFFERS: the asked position is not the drilled one',
  });
}

// ─── 6 · NO-FRONTS DRAWS NO HANDLE BY DESIGN ────────────────────────────────
row({
  what: 'the sheet without fronts',
  where: at(PJ, L.noFronts),
  measured: `${textAt(PJ, L.noFronts)} (no handle on the no-fronts sheet, chosen or not)`,
  said: 'the fronts sheet draws the default handle (the no-fronts sheet is not named)',
  verdict: 'CONFIRMED: the no-fronts sheet skips every handle; CLAUDE.md names the fronts sheet, and a chosen knob is drawn on the 3D and X-ray sheets too (row 4)',
});

const md = `# T82 F22 · the probe of the handles on the sheets

The owner, 24.10.2026, 19:34: *"nie widac wogole zeby bylo jakiekolwiek handles nic"*.

Reproduce: \`node scripts/t82-probe-f22.mjs\` (add \`--write\` to rewrite this file). Measured on the source tree of commit ${sourceCommit()} (this branch); every line number was found in the file by the script, not remembered. The stage is the T81 walk's kitchen (\`scripts/t81-kitchen.mjs\`) with \`knob: false\` (no handle chosen), in-frame on and off, then with the knob and with a bar; every sheet of the set is built as the Drawings window builds it and its HANDLES entities counted.

${table(rows)}

## The one link the fix must change

CONFIRMED as CLAUDE.md names it, and the link sits in the projector, not in the engine. \`handleMarks\` (${at(PJ, L.marks, L.marksRead)}) reads only \`result.drillSummary.handles\`, which the engine fills only for a chosen handle (R9, ${at(HD, L.gate)}), so with none chosen the projector has nothing. The fix: when the project has no handle chosen, \`handleMarks\` asks \`resolveHandle\` for each front with the profile's \`handles.default\` (new, PROPOSED \`{ type: 'knob' }\`, drawn at \`drawings.knobDiameter\` 30), exactly as \`cabinet.js\` asks it (${at(CAB, L.resolve, L.skip)}: the same panel, unit type, hinge and frame), and draws the mark on HANDLES; the drill summary, the CNC and the BOM never see it. Row 7 proves the call gives the drilled knob's own point. Mind the shape: \`resolveHandle\` gives holes as \`{ x, y, d, layer }\` and \`cabinet.js\` turns them into the \`[x, y]\` pairs of \`meta.handle\` (${at(CAB, L.meta, L.push)}); the drawing's default must not write \`meta.handle\` (the room mounts its 3-D handle on it) nor \`addDrill\`. \`'none'\` needs a value of its own: \`normaliseHandle\` (${at(DS, L.norm, L.normType)}) turns it into the same \`null\` as no choice today.
`;

emit('f22-probe.md', md);
