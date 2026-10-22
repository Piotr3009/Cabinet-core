/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T80 F3 · THE RUN GETS ITS FRAME. The owner, 21.10.2026: *"raczej plyta, malo kiedy bedzie jeden ciag dluzszy jak
// 2800, a jak bedzie to bedziemy laczyc"*; *"wszedzie ramke 38 mm"*; *"1 mm bedzie w srodku wystawac ... veneer ma 19
// mm x 2 bedzie idealnie"*; *"wariant C"*; *"cnc blum in frame"*. KIT_INFRAME.lsp (a) and (b), mirrored routine for
// routine in src/engine/inframe.js; the run is buildRuns's (the plinth's grouping), cut into frame segments at a unit
// the frame stops at; the owner of a segment cuts the FRAME board (FRAME-1 .. FRAME-n when joined), MDF 25, front
// material, its openings cut-out pockets on the back window's layer. THE GATE: `params.inframe === true`, which only
// paramsForEngine hands, and only for an in-frame project; no golden opens it (every golden is a bare kit), so the six,
// T75's, T78's and T79's goldens hold by construction. The T80 goldens are written in F11, when the fronts and the
// hinge have landed, so no T80 golden is ever re-pinned.

import { computeCabinet } from '../../src/engine/cabinet.js';
import { defaultParamsFor } from '../../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../../src/engine/profile.js';
import { runFrameParams } from '../../src/engine/inframe.js';

const OWNER = '*"raczej plyta, malo kiedy bedzie jeden ciag dluzszy jak 2800, a jak bedzie to bedziemy laczyc"*; '
  + '*"wszedzie ramke 38 mm"*; *"wariant C"* (21.10.2026)';

export const GATES = {
  inframe: {
    what: 'a unit of an IN-FRAME project (params.inframe true, handed only by paramsForEngine when design.inframe is '
      + 'true and the unit stands in a frame segment): the owner of a segment cuts the FRAME board(s) from its run_frame '
      + 'element. A lay-on project, a bare kit and every golden reach no changed line',
    opens: (p) => p?.inframe === true,
  },
};

export const LICENSED = {
  'src/engine/cabinet.js': {
    why: `T80 F3: the owner of a frame segment (params.inframe and run_frame.role owner) cuts FRAME (or FRAME-1 .. n), `
      + `MDF frameT, role frame (front material, finish exposed), no banding, no grain, its openings cut-out pockets `
      + `(RECESS_WINDOW, clockwise, through). ${OWNER}`,
    gates: ['inframe'],
  },
  'src/engine/inframe.js': {
    why: `T80 F3: NEW, KIT_INFRAME.lsp's mirror routine for routine (lipOf, outsideOf, openingOf, endReach, frameOf, `
      + `stilesOf, railsOf, gapsOf, cutoutOf, joinCandidates, joinFrom, joinOf, piecesOf, pieceNames, insetFront, `
      + `insetFronts, plateSetback, cupClear, endPanelDepth, endPanelGrow, worktopLift, fillerOf) and the run: `
      + `frameSegments over buildRuns, segmentFrame, runFrameParams. Asked only by an in-frame project. ${OWNER}`,
    gates: ['inframe'],
  },
  'src/engine/partRegistry.js': {
    why: `T80 F3: FRAME -> 'frame', a front-group part of its own (In-frame frames, m2, front material; its edging row edge_front, never spent: the frame is not banded): `
      + `the frame is 25 and the doors in it 22, so it is not bought as a door. A registry row; no cut reads it. ${OWNER}`,
    gates: [],
  },
};

export const LIVENESS = {
  // The mockup's run (KIT_INFRAME.lsp section 5): END-L 18, BUD 600 + 800 + BUDR2 500 butted, the right end open: the
  // owner cuts FRAME 1920 x 808 with three cut-outs, 562 / 762 / 462 x 732.
  inframe: () => {
    const units = [['a', 'BUD', 0, 600, [{ id: 'ep', side: 'L', height: 'floor', thickness: 18 }]], ['b', 'BUD', 600, 800, []],
      ['c', 'BUDR2', 1400, 500, []]].map(([id, type, x, width, ends]) => ({
      id, type, position: { wall: 0, x_mm: x, rotation_deg: 0 },
      params: { ...defaultParamsFor(type, P), unit_num: id, width, end_panels: ends },
    }));
    const el = runFrameParams(units, P).get('a');
    const r = computeCabinet({ ...units[0].params, type: 'BUD', inframe: true, run_frame: el }, P);
    const f = r.panels.find((p) => p.id === 'FRAME');
    const live = f && f.w === 1920 && f.h === 808 && f.thickness === 25 && f.cnc.pockets.length === 3
      && f.cnc.pockets.every((q) => q.cutout === true) && f.meta.inframe.openings.map((o) => o.w).join(' ') === '562 762 462';
    return { live: Boolean(live), said: `FRAME ${f?.w} x ${f?.h} x ${f?.thickness}, ${f?.cnc?.pockets?.length} cut-outs` };
  },
};

export const GOLDENS = [];

export const REPINNED = [];
