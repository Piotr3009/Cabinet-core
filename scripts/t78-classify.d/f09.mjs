// T78 F9 · the carousel: a bought mechanism on the L, a line and a body, never a hole.
import { computeCabinet } from '../../src/engine/cabinet.js';
import { defaultParamsFor } from '../../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../../src/engine/profile.js';

export const GATES = {
  carousel: {
    what: 'a carousel asked on an L (`params.carousel === true` on a `type.corner` kit)',
    opens: (params, typeId) => Boolean(params?.carousel === true && typeId && String(typeId).startsWith('CORNER_L')),
  },
};

export const LICENSED = {
  'src/engine/cabinet.js': {
    why: 'T78 F9: behind `params.carousel` on an L: the adjustable SHELF-L boards step aside, one body in the inner-corner '
      + 'square (`assemblies.cornerKits`), one BOM line (role carousel), zero holes; a fixed shelf refuses in words '
      + '(CAROUSEL_REFUSED). `CORNER_KIT_KINDS` exported for the store',
    gates: ['carousel'],
  },
  'src/engine/profile.js': {
    why: 'T78 F9: `corner.carousel`, the placeholder\'s numbers (T78 proposed); read only behind `params.carousel`',
    gates: ['carousel'],
  },
  'src/engine/hardware3d.js': {
    why: 'T78 F9: `cornerKitInstances` reads `assemblies.cornerKits` into the scene\'s kit list; a picture, not a cut',
    gates: ['carousel'],
  },
  'src/engine/partRegistry.js': {
    why: 'T78 F9: the `kit_carousel` row and the `carousel` role map, so the BOM files the line; a list, not a cut',
    gates: ['carousel'],
  },
};

export const LIVENESS = {
  carousel: () => {
    const base = { ...defaultParamsFor('CORNER_L_BASE', P), unit_num: 'CL01', doors: true, shelves: 1 };
    const plain = computeCabinet(base, P);
    const r = computeCabinet({ ...base, carousel: true }, P);
    const line = r.hardware.find((h) => h.role === 'carousel');
    return {
      live: Boolean(line) && r.assemblies.cornerKits?.length === 1 && r.panels.filter((p) => p.part === 'SHELF').length === 0
        && JSON.stringify(r.drills) === JSON.stringify(plain.drills) && !plain.assemblies.cornerKits,
      said: `an L with a carousel: ${line ? '1 BOM line' : 'no line'}, ${r.assemblies.cornerKits?.length || 0} body, `
        + `${r.panels.filter((p) => p.part === 'SHELF').length} shelf boards (plain ${plain.panels.filter((p) => p.part === 'SHELF').length}), drills unchanged `
        + `${JSON.stringify(r.drills) === JSON.stringify(plain.drills)}`,
    };
  },
};
