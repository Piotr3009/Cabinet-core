/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T80 F11 · GOLDENS AND THE CLASSIFIER. CLAUDE.md T80 F11: *"golden-inframe-run.json and golden-inframe-wud.json (F3),
// pinned through scripts/t78-goldens.mjs with the owner's words of 21.10 in their meta; the DXF fingerprint of the frame
// in each; the six base goldens IDENTICAL ...; REPINNED empty in every f40-t80-f* fragment."*  Two NEW goldens for a
// new cut geometry (FROZEN 1: in-frame is a new style, never a change to the lay-on fronts). Each is a scene, as
// T78's L worktop is: the units as the store hands them to the engine (runFrameParams, the flag, the run element),
// each unit's T75 summary, and the frame board by board with the FNV-1a fingerprint of its DXF (the
// scripts/cnc-fingerprint.mjs hash). Their params carry `inframe: true`, so the classifier sees them open the
// `inframe` gate (f40-t80-f03.mjs) and holds them by their bytes. Written once, here; nothing re-pinned.

import { computeCabinet } from '../../src/engine/cabinet.js';
import { defaultParamsFor } from '../../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../../src/engine/profile.js';
import { runFrameParams } from '../../src/engine/inframe.js';
import { buildUnitDxfFiles } from '../../src/engine/cnc/dxf.js';
import { goldenSummary } from '../t75-golden.mjs';

const OWNER = 'The owner, 21.10.2026: *"raczej plyta, malo kiedy bedzie jeden ciag dluzszy jak 2800, a jak bedzie to '
  + 'bedziemy laczyc"*; *"najlepiej jakbysmy zrobili wszedzie ramke 38 mm ... 1 mm bedzie w srodku wystawac"*; *"ramka 25, '
  + 'drzwi 22 i jest idealnie, 3 mm gap pomiedzy carcasem a drzwiami"*; *"jak podwojne drzwi to miedzy drzwiami nie ma '
  + 'ramki"*; *"3 mm zawsze"*; (22:14) *"jezeli chodzi o dol to zdecydowanie wariant C"*, *"gora ... tak samo jak dol"*; '
  + '(22:40) *"1 tak"*, *"2 na styk"*, *"5 tak"*.';

/** 32-bit FNV-1a, scripts/cnc-fingerprint.mjs's own. */
function fingerprint(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0');
}

/** The units of a scene: [id, type, x, width, end panels], 22 fronts, numbered in order. */
function unitsOf(rows) {
  return rows.map(([id, type, x, width, ends, num]) => ({
    id, type, position: { wall: 0, x_mm: x, rotation_deg: 0 },
    params: { ...defaultParamsFor(type, P), unit_num: num, width, end_panels: ends, front_t: 22 },
  }));
}

/** Each unit's params as the store hands them to computeCabinet under in-frame. */
function paramsOf(units) {
  const els = runFrameParams(units, P);
  return units.map((u) => ({ ...u.params, type: u.type, inframe: true, run_frame: els.get(u.id) }));
}

/** The golden's body: every unit's summary, and the frame board by board with its DXF's fingerprint. */
function sceneOf(rows) {
  const params = paramsOf(unitsOf(rows));
  const results = params.map((p) => computeCabinet(p, P));
  const owner = results[0];
  const files = buildUnitDxfFiles(owner, P);
  return {
    units: results.map((r, i) => ({ type: params[i].type, width: params[i].width, summary: goldenSummary(r) })),
    frame: owner.panels.filter((p) => p.role === 'frame').map((f) => {
      const file = files.find((x) => x.panelId === f.id);
      return {
        id: f.id,
        w: f.w,
        h: f.h,
        thickness: f.thickness,
        box: f.box,
        openings: f.meta.inframe.openings,
        stiles: f.meta.inframe.stiles,
        cutouts: f.cnc.pockets.map((k) => [k.x1, k.y1, k.x2, k.y2]),
        dxf: { name: file?.name || null, fingerprint: file ? fingerprint(file.dxf) : null },
      };
    }),
  };
}

const RUN = [
  ['a', 'BUD', 0, 600, [{ id: 'ep', side: 'L', height: 'floor', thickness: 18 }], '01'],
  ['b', 'BUD', 600, 800, [], '02'],
  ['c', 'BUDR2', 1400, 500, [], 'DR01'],
];
const WUD = [['w', 'WUD', 0, 600, [], 'W01']];

/** The mockup's run (verify/t80/mockup-inframe-final-sheet.png): END-L 18, BUD 600 one door, BUD 800 a pair, BUDR2 500. */
function inframeRunScene() { return sceneOf(RUN); }
/** The mockup's wall unit: WUD 600, one door, open at both ends. */
function inframeWudScene() { return sceneOf(WUD); }

export const GATES = {};

export const LICENSED = {};

export const LIVENESS = {};

export const GOLDENS = [
  {
    file: 'golden-inframe-run.json',
    F: 'F40',
    source: `T80 F11 (the golden F3 names). KIT_INFRAME.lsp (a), (b), (c) on the mockup's run: END-L 18, BUD 600 (one door), `
      + `BUD 800 (a pair), BUDR2 500, design.inframe true, fronts 22: the frame 1920 x 808 at (-19, -19), the openings `
      + `562 x 732, 762 x 732, 462 x 732, the doors 556 x 726 and 376.5 x 726, the drawer fronts 456 x 360 / 363, the `
      + `hinge plates at 20.5, the end panel D + 25 and H + 19. ${OWNER}`,
    make: inframeRunScene,
    params: () => ({ scene: 'inframeRunScene: END-L 18, BUD 600, BUD 800, BUDR2 500 butted on wall 0', inframe: true, units: paramsOf(unitsOf(RUN)) }),
  },
  {
    file: 'golden-inframe-wud.json',
    F: 'F40',
    source: `T80 F11 (the golden F3 names). KIT_INFRAME.lsp (a) and (c) on a WUD 600 with one door, open at both ends, `
      + `design.inframe true, fronts 22: the frame 602 x 758 (lip 1 past each open side, 19 above and below), the `
      + `opening 562 x 682, the door 556 x 676. ${OWNER}`,
    make: inframeWudScene,
    params: () => ({ scene: 'inframeWudScene: WUD 600, one door, on wall 0', inframe: true, units: paramsOf(unitsOf(WUD)) }),
  },
];

export const REPINNED = [];
