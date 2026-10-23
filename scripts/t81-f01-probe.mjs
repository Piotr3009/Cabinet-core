/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T81 F1 · THE PROBE: WHAT THE ROOM DRAWS, BEFORE A LINE OF THE PROJECTOR
//
// CLAUDE.md T81 F1: "PROBE first, committed as verify/t81/f01-probe.md: for
// the T80 walk's kitchen ..., in-frame on and off, the census of what the
// room draws: every board by role with its placement (engine/joinery.js
// panelPlacement, the seat 3d/panelSolid.js panelSolids extrudes, with the
// cut-outs that make an in-frame frame's openings), every hardware instance by
// family (engine/hardware3d.js hardwareInstances ...; doorHingeInstances for
// the cups and plates; result.drillSummary.handles for the handles), the run
// parts ... The probe table is the contract the projector is tested against."
//
// Read only: the store builds the stage, the engine answers, nothing is
// written but the probe file. The room's own filters are quoted from
// 3d/UnitView.jsx and 3d/Hardware.jsx by line, so a reader can check them.
//
//   node scripts/t81-f01-probe.mjs            (writes verify/t81/f01-probe.md)

import { writeFileSync } from 'node:fs';
import { S, t81Kitchen, setArgs } from './t81-kitchen.mjs';
import { getCabinetProfile } from '../src/engine/profile.js';
import { panelPlacement } from '../src/engine/joinery.js';
import { hardwareInstances, doorHingeInstances } from '../src/engine/hardware3d.js';
import { sceneBoard } from '../src/engine/siteTrim.js';
import { wallDrawingSheets } from '../src/engine/drawings/wallSheets.js';
import { buildUnitCard } from '../src/engine/drawings/unitCard.js';

const P = getCabinetProfile();
const OUT = new URL('../verify/t81/f01-probe.md', import.meta.url).pathname;
const r1 = (v) => (Number.isFinite(Number(v)) ? Math.round(Number(v) * 10) / 10 : v);
const vec = (v) => (Array.isArray(v) ? `[${v.map(r1).join(',')}]` : '-');
const lines = [];
const say = (s = '') => lines.push(s);

/** The room's own filter for the board loop (3d/UnitView.jsx, the MovingPanel map). */
function roomDraws(p) {
  if (!p.box) return 'no box: not drawn';
  if (p.meta?.frontDecorationParent) return 'decoration: drawn by its front (frontDecorationSolid)';
  if (p.meta?.lift?.parent || p.meta?.bifold?.parent) return 'drawn inside its carrier leaf';
  return 'MovingPanel';
}

function census(label) {
  const entries = S().allResults();
  say(`## ${label}`);
  say('');
  say('### A. Every board the room draws (result.panels, by unit)');
  say('');
  say('Seat = `engine/joinery.js panelPlacement` (origin; u, v, n), the frame `3d/panelSolid.js panelSolids` extrudes the board\'s nominal outline in (`engine/siteTrim.js sceneBoard`); a board with no seat is drawn as its box. Cut-outs = the CNC pockets marked `cutout: true`: OPENING where the pocket goes through the board (the in-frame frame\'s openings, KIT_INFRAME.lsp D10), a pocket with its depth otherwise (the shaker field, 6 deep, carries the flag for the DXF\'s winding).');
  say('');
  say('| unit | id | part | role | material | box x y z / w h d (unit mm) | seat origin; u v n | cut-outs | room |');
  say('| - | - | - | - | - | - | - | - | - |');
  for (const { unit, result } of entries) {
    for (const p0 of result.panels) {
      const p = sceneBoard(p0);
      const b = p.box;
      const seat = panelPlacement(p);
      // A through opening is a cut-out at least as deep as the board; the shaker
      // field carries `cutout: true` for the DXF's winding (engine/shaker.js) and
      // is a 6 mm pocket, not a hole.
      const thick = Number(p.thickness) || Math.min(b?.w || 0, b?.h || 0, b?.d || 0);
      const cuts = (p.cnc?.pockets || []).filter((q) => q.cutout).map((q) => ({ ...q, through: Number(q.depth) >= thick - 1e-6 }));
      say(`| ${unit.params.unit_num} | ${p.id} | ${p.part} | ${p.role} | ${p.material_role || '-'} | ${b ? `${r1(b.x)} ${r1(b.y)} ${r1(b.z)} / ${r1(b.w)} ${r1(b.h)} ${r1(b.d)}` : '-'} | ${seat ? `${vec(seat.origin)}; ${vec(seat.u)} ${vec(seat.v)} ${vec(seat.n)}` : 'none (box)'} | ${cuts.length ? cuts.map((q) => `${q.through ? 'OPENING' : `pocket d${r1(q.depth)}`} ${r1(q.x1)},${r1(q.y1)}..${r1(q.x2)},${r1(q.y2)}`).join(' ; ') : '-'} | ${roomDraws(p)} |`);
    }
  }
  say('');
  say('### B. Every hardware instance (engine/hardware3d.js hardwareInstances), by family');
  say('');
  say('Unit mm. The room\'s gates (3d/Hardware.jsx): legs, kits, shelf supports and rails always; hinges under X-ray or Show hinges; runners under X-ray, Hide fronts or an open front.');
  say('');
  say('| unit | family | n | where |');
  say('| - | - | - | - |');
  for (const { unit, result } of entries) {
    const hw = hardwareInstances(result, P);
    for (const [family, list] of Object.entries(hw)) {
      if (!list.length) continue;
      let where = '';
      if (family === 'hinges') where = list.map((h) => `${h.panelId} cup x${r1(h.x)} y${r1(h.y)} z${r1(h.z)}, plate x${r1(h.plateX)} z${r1(h.plateZ)}`).join('; ');
      else if (family === 'runners') where = list.map((h) => `D${h.drawer}${h.side} x${r1(h.x)} y${r1(h.y)} z${r1(h.z)} L${r1(h.length)}`).join('; ');
      else if (family === 'rods') where = list.map((h) => `D${h.drawer} x${r1(h.x)} y${r1(h.y)} z${r1(h.z)} L${r1(h.length)}`).join('; ');
      else if (family === 'legs') where = list.map((h) => `x${r1(h.x)} z${r1(h.z)} h${r1(h.height)}`).join('; ');
      else where = list.map((h) => `${h.kind || family} x${r1(h.x)} y${r1(h.y)} z${r1(h.z)}`).join('; ');
      say(`| ${unit.params.unit_num} | ${family} | ${list.length} | ${where} |`);
    }
    // The cups and plates per leaf, through the one exported per-leaf path.
    for (const p of result.panels.filter((q) => q.part === 'FRONT' && q.box)) {
      const cups = doorHingeInstances(p, {
        panels: result.panels,
        centres: result.drillSummary?.hinge_rows_by_panel?.[p.id] || result.drillSummary?.hinge_centers || [],
        profile: P,
        width: result.params.width,
        boardT: result.params.board_t,
        depth: result.params.depth,
      });
      say(`| ${unit.params.unit_num} | doorHingeInstances(${p.id}) | ${cups.length} | hinge ${p.meta?.hinge || '-'}; cup y ${cups.map((h) => r1(h.y)).join(', ') || '-'} |`);
    }
  }
  say('');
  say('### C. The handles (result.drillSummary.handles), and where each is drawn');
  say('');
  say('The holes are in the FRONT\'s cut frame: origin at the leaf\'s bottom-RIGHT corner, x running LEFT (the door seen from the carcass side, `panelPlacement` FRONT). The room mirrors them onto the room face (3d/Hardware.jsx FrontHandle `sheetX = box.x + box.w - x`); today\'s set (`wallElevation.js handleMarks`) adds x to the unit\'s left edge unmirrored.');
  say('');
  say('| unit | front | type | hole (cut frame) | room x (unit mm) | today\'s sheet x (unit mm) | agree |');
  say('| - | - | - | - | - | - | - |');
  for (const { unit, result } of entries) {
    for (const h of result.drillSummary?.handles || []) {
      const p = result.panels.find((q) => q.id === h.panel);
      const [hx, hy] = (h.holes || [])[0] || [h.x, h.y];
      const room = p ? p.box.x + p.box.w - hx : null;
      const today = hx;
      say(`| ${unit.params.unit_num} | ${h.panel} | ${h.type} | ${r1(hx)}, ${r1(hy)} | ${r1(room)} | ${r1(today)} | ${Math.abs(room - today) < 0.5 ? 'yes' : 'NO'} |`);
    }
  }
  say('');
  say('### D. The run parts');
  say('');
  say('| unit | part | what | geometry (unit mm unless named) |');
  say('| - | - | - | - |');
  for (const { unit, result } of entries) {
    for (const p of result.panels.filter((q) => ['frame', 'plinth', 'end_panel', 'infill', 'upstand'].includes(q.role))) {
      const extra = p.role === 'frame'
        ? `; openings ${(p.meta?.inframe?.openings || []).map((o) => `${o.w}x${o.h}`).join(', ')}; stiles ${(p.meta?.inframe?.stiles || []).join(', ')}; run members ${(p.meta?.inframe?.unitNums || []).join(' ')}`
        : (p.meta?.run ? `; run owner of ${(p.meta.unitIds || []).length} units` : '');
      say(`| ${unit.params.unit_num} | ${p.id} | ${p.role} | box ${r1(p.box.x)} ${r1(p.box.y)} ${r1(p.box.z)} / ${r1(p.box.w)} ${r1(p.box.h)} ${r1(p.box.d)}${extra} |`);
    }
    if (result.assemblies?.cornice) say(`| ${unit.params.unit_num} | cornice | bought moulding (assemblies.cornice) | ${JSON.stringify(result.assemblies.cornice)} |`);
  }
  for (const w of S().worktopsOf()) {
    const g = w.geometry || w;
    say(`| run | worktop | engine/worktop.js worktopsFor (the store's worktopsOf) | wall ${g.wall} x ${g.x} w ${g.w}, y ${g.y} h ${g.h}, z ${g.z} d ${g.d}${g.inframe ? `; in-frame lift ${g.inframe.lift}` : ''} (wall frame mm) |`);
  }
  say('');
  say('### E. Today\'s set measured against the room (the audit of 22.10, as numbers)');
  say('');
  const sheets = wallDrawingSheets(setArgs());
  say(`Sheets today: ${sheets.map((s) => `${s.no} ${s.name}`).join(' | ')}`);
  say('');
  const frames = entries.flatMap(({ unit, result }) => result.panels.filter((p) => p.role === 'frame').map((p) => ({ unit, p })));
  const fronts = sheets.find((s) => s.variant === 'fronts');
  const plinth = entries.flatMap(({ result }) => result.panels.filter((p) => p.role === 'plinth'))[0];
  if (fronts) {
    // The frame on the sheet would be a rectangle as wide as the frame at the sheet's scale.
    const sc = fronts.sheet.scale;
    const want = frames.map(({ p }) => r1(p.box.w / sc));
    const rects = fronts.sheet.entities.filter((e) => e.kind === 'rect' && (e.layer === 'DOORS' || e.layer === 'CARCASE'));
    const found = want.filter((w) => rects.some((e) => Math.abs(e.w - w) < 0.05));
    say(`- Front view (${fronts.no}): the room draws ${frames.length} frame board(s) of width ${frames.map(({ p }) => p.box.w).join(', ') || '-'}; rectangles of that width on the sheet: ${found.length} (scale 1:${r1(sc)}).`);
  }
  const card = buildUnitCard(entries[0].result, { profile: P });
  const widest = Math.max(...card.entities.filter((e) => e.kind === 'rect').map((e) => e.w));
  say(`- Unit card of ${entries[0].unit.params.unit_num} (W ${entries[0].result.params.width}): its widest rectangle is ${r1(widest)} mm (the run's plinth ${plinth ? plinth.box.w : '-'}, the run's frame ${frames[0] ? frames[0].p.box.w : '-'}).`);
  const planBase = sheets.find((s) => s.variant === 'plan-base');
  if (planBase && plinth) {
    const solids = planBase.sheet.entities.filter((e) => (e.kind === 'rect' || e.kind === 'poly') && e.layer === 'DOORS' && !e.hidden);
    say(`- Plan, base units (${planBase.no}), cut ${P.drawings.set.planCut.base} above FFL: the plinth stands 0 to ${-plinth.box.y} above FFL (below the cut, under the carcass bottom); solid DOORS outlines on the sheet: ${solids.length} (today's buildTopView draws every front-material board, the plinth and the frame among them, solid magenta).`);
  }
  say('');
}

say('# T81 F1 · THE PROBE: what the room draws (verify/t81/f01-probe.md)');
say('');
say('Generated by `node scripts/t81-f01-probe.mjs` on the T81 kitchen (`scripts/t81-kitchen.mjs`: the T80 walk\'s stage, BUD 600 one door, BUD 800 a pair, BUDR2 500, WUD 600 one door over the BUD 600, END-L 18, plinth, worktop, f1 sprayed generic-22 F&B Card Room Green sheen 30, plus the project\'s knob, DECISIONS 4). Room 6000 x 3000, height 2500. Read only.');
say('');
say('## X. The room\'s X-ray (3d/UnitView.jsx)');
say('');
say(`- Line 1098: \`const X = profile.appearance.xray; const faded = contour ? surface.opacity : (xray ? (front ? X.front : X.carcass) : 1);\` with \`profile.appearance.xray\` = ${JSON.stringify(P.appearance.xray)}.`);
say('- `front` is `frontKind(p)` (line 225): FRONT is a door, DRAWER-FRONT a drawer; every other board (carcass, frame, plinth, end panel, drawer box, shelf) is faded as carcass.');
say('- Hardware under X-ray (3d/Hardware.jsx): the hinges (`xray || hinges`) and the runners (`xray || runners`) come out; legs, kits, shelf supports and rails are always drawn.');
say('- The drawing\'s X-ray mirrors it: fronts on XRAY_FRONT (#9A9A9A, the 0.42 fade over white), carcass boards on XRAY_CARCASE (#C9C9C9, the 0.2 fade), nothing filled, the internals (drawer boxes, shelves, hardware) in their own inks (CLAUDE.md F5).');
say('');
t81Kitchen({ inframe: true });
census('IN-FRAME ON');
t81Kitchen({ inframe: false });
census('IN-FRAME OFF (lay-on)');
writeFileSync(OUT, `${lines.join('\n')}\n`);
process.stdout.write(`wrote ${OUT} (${lines.length} lines)\n`);
