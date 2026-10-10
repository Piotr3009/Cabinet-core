// ─── T75 · F15 · THE PELMET, PLAIN ─────────────────────────────────────────
//
// CLAUDE.md T75 F15: *"The held-open row `cornice-pelmet` opens as a PLAIN
// pelmet: a flat strip under a run of wall units, `profile.pelmet = {
// heightMm: 50, thicknessMm: front_t } // T75 proposed`, front material, the
// cornice's run, segment and mitre arithmetic reused (`corniceSegments`,
// `corniceCorner`) on the bottom edge instead of the top, BOM role `pelmet`,
// cut list line. It hides the LED strip and changes nothing about the light
// (FROZEN 2)."*
//
// The cut hangs on ONE gate: the store handed the unit a run element that
// makes it the strip's owner (`params.run_pelmet.role === 'owner'`). No
// default carries one; a bare call cuts what it always did.

import { computeCabinet } from '../../src/engine/cabinet.js';
import { defaultParamsFor } from '../../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../../src/engine/profile.js';

/** A run of one wall unit against a wall on the left, open on the right. */
const RUN = {
  role: 'owner',
  height: 50,
  offset: 0,
  length: 600,
  ends: { left: 'wall', right: 'open' },
  mitres: { left: false, right: true },
  returns: { left: null, right: 438 },
  corners: { left: null, right: null },
  bottom: 1447,
  unitIds: ['u'],
};
const kit = (type, extra = {}) => ({ ...defaultParamsFor(type, P), unit_num: '01', ...extra });

export const GATES = {
  pelmet: {
    what: 'a pelmet run element handed to its owner unit (`params.run_pelmet.role === \'owner\'`, F15)',
    opens: (p) => p.run_pelmet?.role === 'owner',
  },
};

export const LICENSED = {
  'src/engine/pelmet.js': {
    why: 'F15 · NEW: the pelmet\'s run element, `runPelmetParams`: the cornice\'s segments (`corniceSegments` '
      + 'asked through its `heightOf`), `runEnd`\'s ends in the strip\'s band, a square stop at an end panel or at '
      + 'another unit standing in the band, a return to the wall at an open end, `corniceCorner` between two '
      + 'strips; and the two refusals in words. Read by the store; computeCabinet never imports it',
    gates: [],
  },
  'src/engine/cornice.js': {
    why: 'F15 · `corniceSegments` takes `heightOf` and `corniceCorner` takes `option`, so the pelmet asks the '
      + 'cornice\'s own questions with its own height; left out, each answers as it did',
    gates: [],
  },
  'src/engine/cabinet.js': {
    why: 'F15 · the owner of a pelmet run cuts PELMET (and PELMET-L / -R returns) in the door plane, one door gap '
      + 'under the door, front material, outline only; `pelmet` joins the front-material and finish-exposed roles',
    gates: ['pelmet'],
  },
  'src/engine/profile.js': {
    why: 'F15 · `pelmet` (heightMm 50; thicknessMm null = front_t), proposed, and its migrate line',
    gates: ['pelmet'],
  },
  'src/engine/partRegistry.js': {
    why: 'F15 · the `pelmet` part (front material) and PELMET mapped to it. No fixture cuts one',
    gates: ['pelmet'],
  },
  'src/engine/elements.js': {
    why: 'F15 · the `pelmet` kind: its label, its row and its lock. What a piece is called, not what it is cut',
    gates: [],
  },
  'src/engine/cnc/groups.js': {
    why: 'F15 · the pelmet goes with the fronts on the CNC sheet. Which sheet, not the cut',
    gates: [],
  },
  'src/engine/bom.js': {
    why: 'F15 · `pelmet` on the fronts board (FRONT_SHEET_PARTS) and in the comment. Which board, not the cut',
    gates: [],
  },
  'src/engine/library.js': {
    why: 'F15 · the Extras row "Pelmet" opens as an ACTION row, and `resolveEntry` learns the kind. The library, '
      + 'not a cut',
    gates: [],
  },
};

export const LIVENESS = {
  pelmet: () => {
    const r = computeCabinet(kit('WUD', { pelmet: true, run_pelmet: RUN }), P);
    const strip = r.panels.find((p) => p.id === 'PELMET');
    const back = r.panels.find((p) => p.id === 'PELMET-R');
    return {
      live: Boolean(strip) && Boolean(back) && strip.material_role === 'front',
      said: `WUD owning a pelmet cuts ${strip ? `PELMET ${strip.w} x ${strip.h}` : 'no strip'}`
        + `${back ? ` and its return ${back.w} x ${back.h}` : ''}`,
    };
  },
};

export const GOLDENS = [
  {
    file: 'golden-pelmet.json',
    F: 'F15',
    source: 'No LISP: a plain strip and its return, rectangles; the 45 degree ends are a saw cut',
    params: () => kit('WUD', { pelmet: true, run_pelmet: RUN }),
  },
];
