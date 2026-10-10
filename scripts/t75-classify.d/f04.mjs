// ─── T75 · F4 · THE TRUE L CARCASS: ITS GATE, ITS LICENCES, ITS GOLDENS ─────
//
// CLAUDE.md T75 F4: *"KIT_CORNER_L.lsp ... the engine's L builder
// (`cabinet.js`, replacing T30's block) mirrors the LISP ... Goldens:
// `golden-corner-l-base.json`, `golden-corner-l-wall.json`,
// `golden-corner-l-wardrobe.json`."*  Merged by `scripts/t75-classify.mjs` and
// `scripts/t75-goldens.mjs` (see README.md beside this file).

import { computeCabinet } from '../../src/engine/cabinet.js';
import { defaultParamsFor, UNIT_TYPES } from '../../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../../src/engine/profile.js';

const kit = (type, extra = {}) => ({ ...defaultParamsFor(type, P), unit_num: '01', ...extra });

export const GATES = {
  cornerL: {
    what: 'a true L corner kit (CORNER_L_BASE, CORNER_L_WALL, CORNER_L_WARDROBE: `type.corner`, F4)',
    opens: (p, id) => Boolean(UNIT_TYPES[id]?.corner || UNIT_TYPES[p.type]?.corner),
  },
};

export const LICENSED = {
  'src/engine/cabinet.js': {
    why: 'F4 · KASACJA of T30\'s L block; the true L builder (KIT_CORNER_L.lsp boards, a virtual parent per '
      + 'arm for its side, shelf rows and door, the two corner trims, six legs, two plinth boards, the doors '
      + 'merged after the box\'s passes) and `normalizeParams` `cornerL`, all behind `type.corner`',
    gates: ['cornerL'],
  },
  'src/engine/cornerL.js': {
    why: 'F4 · NEW: KIT_CORNER_L.lsp mirrored line for line (CL:lOutline, CL:lTopJoints, CL:tabWalk, '
      + 'CL:backB*, CL:legPositions, CL:hanger*): the boards in their own frames. On the cut path only '
      + 'through the L builder in cabinet.js, behind `type.corner`',
    gates: ['cornerL'],
  },
  'src/engine/types.js': {
    why: 'F4 · KASACJA of L_SHAPE; CORNER_L_BASE / _WALL / _WARDROBE, their prefixes and order, both old '
      + 'names aliased forever, `isCornerLKit`, and `arm_mm` / `corner_side` spread into their defaults alone',
    gates: ['cornerL'],
  },
  'src/engine/profile.js': {
    why: 'F4 · KASACJA of `cornerUnit`; `cornerBase`, `cornerWall`, `cornerWardrobe` defaults (T75 proposed) '
      + 'and their migrate lines. The six read none',
    gates: ['cornerL'],
  },
  'src/engine/library.js': {
    why: 'F4 · KASACJA of T30\'s row and the two held-open L rows; "Corner L" and "Corner L wall". The '
      + 'library, not a cut',
    gates: [],
  },
  'src/engine/frontClearance.js': {
    why: 'F4 · FRONTS BOUNDARY licence 1: the two L kinds CORNER_COVERED (0) and CORNER_OVERLAP (front_t + '
      + 'rule 7): the enum, the matrix, their labels, `frontsInRoom` copying `meta.cornerEdge`, `neighbourOn` '
      + 'answering it. Room-level, not a cut',
    gates: [],
  },
  'src/engine/corners.js': {
    why: 'F4 · `lClearanceView`: each L arm handed to the clearance rulebook as a unit on its own wall',
    gates: [],
  },
  'src/engine/checks.js': {
    why: 'F4 · Check #2 measures an L\'s two leaves through `lClearanceView`. Reads a room; cuts nothing',
    gates: [],
  },
  'src/engine/joinery.js': {
    why: 'F4 · `panelPlacement` reads `meta.lBoard`: SIDE-A as a BUL or BUR by its hand, SIDE-B, BACK-B, the '
      + 'L boards and door B where they stand. The VIEW\'s frame (3d/panelSolid.js, the X-ray); the DXF never '
      + 'asks it, and no other kit carries the key',
    gates: [],
  },
};

export const LIVENESS = {
  cornerL: () => {
    const r = computeCabinet({ ...defaultParamsFor('CORNER_L_BASE', P), unit_num: 'CL01', doors: true }, P);
    const top = r.panels.find((p) => p.id === 'TOP-L');
    const doors = r.panels.filter((p) => p.part === 'FRONT');
    return {
      live: Boolean(top) && top.cnc.outline.length === 86 && doors.length === 2
        && doors.some((d) => d.meta?.opensFirst),
      said: `CORNER_L_BASE cuts ${top ? `TOP-L as one L of ${top.cnc.outline.length} points` : 'no TOP-L'} and `
        + `${doors.length} leaves (${doors.map((d) => `${d.meta?.arm} ${d.w}`).join(', ')})`,
    };
  },
};

export const GOLDENS = [
  {
    file: 'golden-corner-l-base.json',
    F: 'F4',
    source: 'KIT_CORNER_L.lsp (the L boards, the legs) + KIT_BUD_FULL.lsp (sides, BACK-A, doors and plates through the parent)',
    params: () => kit('CORNER_L_BASE', { doors: true, shelves: 1, plinth: true }),
  },
  {
    file: 'golden-corner-l-wall.json',
    F: 'F4',
    source: 'KIT_CORNER_L.lsp (the L boards, the hangers) + KIT_WUD_FULL.lsp (sides, BACK-A, doors and plates through the parent)',
    params: () => kit('CORNER_L_WALL', { doors: true, shelves: 1 }),
  },
  {
    file: 'golden-corner-l-wardrobe.json',
    F: 'F4',
    source: 'KIT_CORNER_L.lsp (the L boards, the legs) + KIT_WARDROBE_FULL.lsp (sides, BACK-A, doors, plates and rails through the parent)',
    params: () => kit('CORNER_L_WARDROBE', { doors: true, rail: true }),
  },
];
