/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T82 F15 · THE CLOUD: FLUTED AS CONVEX REEDS. The owner, 25.10.2026, over verify/t82/mockups/chmurka.png: *"fluted
// teraz to sa rowki a ja potrzebuje chmurke"*, *"daj wariant b czyli na styk narazie"*, *"do tego daj ustawienie
// srednicy walkow tez"*. FL carries `fluteProfile: 'groove' | 'reed'`; a reed decoration cuts a row of convex
// half-rounds touching (crests on the face, valleys half the diameter deep, sharp), one CNC operation per valley
// (kind `reed`, tool reedProfile), the side margins FL's `grooveInsetMm`, top and bottom to the edges; a field the
// diameter does not divide is centred and said (Check #46, with the board left under a valley under 10). The FL
// recipe in the profile is T76's, untouched: `defaultFrontDecoration('FL')` (the T76 record the classifier re-makes)
// is the grooves byte for byte, and a saved FL decoration naming no profile normalises to exactly what it did. A
// NEW choice (`newFrontDecoration`, read by `frontStyleSelection` and the Activate button) is born reeds. The gate is
// the profile named on the leaf's own decoration: no golden of the base, T75, T76, T77 or T78 names it.
// Draft for INT: scripts/t78-classify.d/f43-t82-f15.mjs. The golden was written once with this file in place
// (`node scripts/t78-goldens.mjs --write ../verify/t82/goldens/golden-fl-reed.json`); nothing re-pinned.

import { createHash } from 'node:crypto';

import { computeCabinet } from '../../src/engine/cabinet.js';
import { defaultParamsFor } from '../../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../../src/engine/profile.js';
import { newFrontDecoration } from '../../src/engine/frontDecoration.js';
import { buildUnitDxfFiles } from '../../src/engine/cnc/dxf.js';
import { goldenSummary } from '../t75-golden.mjs';

const OWNER = 'The owner, 25.10.2026: *"fluted teraz to sa rowki a ja potrzebuje chmurke"*, *"daj wariant b czyli na '
  + 'styk narazie"*, *"do tego daj ustawienie srednicy walkow tez"*.';

/** 32-bit FNV-1a, scripts/cnc-fingerprint.mjs's own. */
function fingerprint(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0');
}

/** The BUD of the golden: the house BUD, one Fluted leaf born as a new choice is (reeds of 20, inset 50). */
const reedBud = () => ({
  ...defaultParamsFor('BUD', P), unit_num: '01', front_type: 'FL', front_decoration: newFrontDecoration('FL', P),
});

/** The golden's body: the BUD's T75 summary, the leaf's reed record valley by valley, its FRONT DXF fingerprint. */
function flReedScene() {
  const result = computeCabinet(reedBud(), P);
  const leaf = result.panels.find((p) => p.meta?.frontDecoration);
  const d = leaf.meta.frontDecoration;
  const front = buildUnitDxfFiles(result, P).find((f) => f.panelId === leaf.id && /-FRONT\.dxf$/.test(f.name));
  return {
    summary: goldenSummary(result),
    leaf: { id: leaf.id, w: leaf.w, h: leaf.h, thickness: leaf.thickness, status: d.status },
    reeds: d.reeds,
    advisories: d.advisories.map((a) => a.code),
    valleys: d.operations.map((op) => ({
      id: op.id, kind: op.kind, layer: op.layer, depth: op.depth, startDepth: op.startDepth, tool: op.tool,
      centreline: op.centreline, points: op.points, edge: op.crossSection.edge,
      profile: createHash('sha256').update(JSON.stringify(op.crossSection.profile)).digest('hex').slice(0, 16),
      surface: [op.surface.vertices.length, op.surface.triangles.length],
    })),
    dxf: { name: front?.name || null, fingerprint: front ? fingerprint(front.dxf) : null },
  };
}

export const GATES = {
  flReed: {
    what: 'a Fluted decoration that names `fluteProfile: \'reed\'` on its own record (`params.front_decoration`): the '
      + 'reeds are cut (makeReeds), the CNC writes reed valleys, the board rule measures half the diameter, the Check '
      + 'says #46. An FL record that names no profile, or `groove`, is T76\'s grooves byte for byte',
    opens: (params) => params?.front_decoration?.style === 'FL' && params.front_decoration.fluteProfile === 'reed',
  },
};

export const LICENSED = {
  'src/engine/frontDecoration.js': {
    why: `T82 F15: FLUTE_PROFILES, newFrontDecoration (a new choice; FL born reeds), reedChoices; normalise carries `
      + `fluteProfile and reedDiameterMm for FL only when the record names them; buildFrontDecoration refuses an unknown `
      + `profile in words, cuts makeReeds (one valley per operation, kind reed, FRONT_REED layer) for a reed record, and `
      + `adds the two reed advisories (FRONT_DECORATION_REED_SKIN, _REMAINDER); boardRefusal asks FL what a pick gives. `
      + `Without the gate the code is what T78 F14 cut. ${OWNER}`
      + ' After the review (reeds:0): reedDepthOverDisc measures the reed\'s own depth over a bore\'s disc, so a screw under a crest is not a screw under a valley; one under a valley is still refused in words with the depth and the board left.',
    gates: ['flReed'],
  },
  'src/engine/frontBoard.js': {
    why: `T82 F15: deepestCutMm of a reed recipe is the recess and half the reed's diameter; every other recipe as T77 `
      + `F4 wrote it. ${OWNER}`,
    gates: ['flReed'],
  },
  'src/engine/profile.js': {
    why: `T82 F15: profile.front.flute { profile 'reed', reedDiameterMm 20 (PROPOSED), reedLadderMm [16, 20, 25] `
      + `(PROPOSED), reedNoteUnderValleyMm 10 }, merged key by key; front.decoration.FL is T76's, untouched. Read only `
      + `by a new choice and a reed record. ${OWNER}`,
    gates: ['flReed'],
  },
  'src/engine/checks.js': {
    why: `T82 F15: Check #46 (yellow), the reeds' two advisories in their own words (CLAUDE.md's #41, held by the `
      + `in-frame row: the brief's #46). ${OWNER}`,
    gates: ['flReed'],
  },
  'src/engine/cnc/frontOperations.js': {
    why: `T82 F15: the kind reed (tool reedProfile, crossSection reed) is a centre-line operation like a flute; its `
      + `layer label, its vector meaning and the manifest's reed note, the note only in an export that carries reeds, so `
      + `every manifest before them is what it was. ${OWNER}`,
    gates: ['flReed'],
  },
  'src/engine/design.js': {
    why: `T82 F15: frontStyleSelection gives newFrontDecoration for a NEW choice (FL: reeds); a reselected style keeps `
      + `its own record. A store road, never a computeCabinet input. ${OWNER}`,
    gates: [],
  },
  'src/engine/drawings/frontDecorationDrawing.js': {
    why: `T82 F15: a reed operation draws its valley line, open, on the elevations (the T81 projector and the T71 `
      + `fronts read the same function) and on the part detail; the detail note names the reeds. It draws, it never `
      + `cuts. ${OWNER}`,
    gates: [],
  },
};

export const LIVENESS = {
  flReed: () => {
    const r = computeCabinet(reedBud(), P);
    const d = r.panels.find((p) => p.meta?.frontDecoration)?.meta.frontDecoration;
    const ops = d?.operations || [];
    return {
      live: d?.status === 'ready' && ops.length === (d.reeds?.count || 0) + 1 && ops.every((op) => op.kind === 'reed'),
      said: `BUD with FL reeds: ${d?.reeds?.count} reeds of ${d?.reeds?.diameterMm}, ${ops.length} valleys on `
        + `${ops[0]?.layer}, remainder ${d?.reeds?.remainderMm} centred, status ${d?.status}`,
    };
  },
};

export const GOLDENS = [
  {
    file: '../verify/t82/goldens/golden-fl-reed.json',
    F: 'F43',
    source: `T82 F15, a new cut geometry (FROZEN 1): the house BUD with one Fluted leaf born as a new choice is, reeds of `
      + `20 at the 50 side margins: the 597 x 767 leaf's 497 field takes 24 reeds, 17 over and centred (58.5 a side), 25 `
      + `valleys 10 deep on FRONT_REED_D10_S0_T20, the leaf's T75 summary and its FRONT DXF fingerprint. ${OWNER}`,
    make: flReedScene,
    params: () => reedBud(),
  },
];

export const REPINNED = [];
