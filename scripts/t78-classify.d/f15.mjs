// T78 F15 · internal drawers get fronts.
import { computeCabinet } from '../../src/engine/cabinet.js';
import { defaultParamsFor } from '../../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../../src/engine/profile.js';

export const GATES = {
  innerFront: {
    what: 'a drawer behind doors (`cfg.internalDrawers`: the wardrobe\'s internal mount, PANTRY\'s and BUD_INT\'s kit-wide '
      + 'internal drawers, a drawer-unit row with `drawer_fronts: false`): it gets an INNER FRONT board. Every overlay '
      + 'drawer and every doorless kit is untouched',
    opens: (params, typeId) => ['PANTRY', 'BUD_INT'].includes(String(typeId || ''))
      || params?.drawer_fronts === false
      || (params?.sections?.[0]?.items || []).some((i) => i?.kind === 'drawer' && i?.mount === 'internal'),
  },
};

export const LICENSED = {
  'src/engine/cabinet.js': {
    why: 'T78 F15: the wardrobe and the drawer-unit machines cut `${unitNum}-IF${i}` (part DRAWER-FRONT, role drawer_front, '
      + 'meta.inner) where they skipped an internal drawer\'s face; the roles `drawer_front` is front material and finish-exposed',
    gates: ['innerFront'],
  },
  'src/engine/profile.js': {
    why: 'T78 F15: `wardrobe.drawers.innerFront` (overhangMm 0, heightMm the box side height), proposed, owner to confirm',
    gates: ['innerFront'],
  },
};

export const LIVENESS = {
  innerFront: () => {
    const r = computeCabinet({ ...defaultParamsFor('BUD_INT', P), unit_num: 'BI01' }, P);
    const inner = r.panels.filter((p) => p.role === 'drawer_front');
    const boxes = r.panels.filter((p) => p.part === 'DRAWER-SIDE' && /SL$/.test(p.id));
    return {
      live: inner.length === boxes.length && inner.every((p) => p.meta.inner === true && p.material_role === 'front'),
      said: `BUD_INT cuts ${inner.length} inner fronts for ${boxes.length} internal drawers (${inner.map((p) => `${p.w} x ${p.h}`).join(', ')})`,
    };
  },
};

// Re-pinned by F15, knowingly: the owner's board on every internal drawer.
export const REPINNED = [
  { file: 'verify/t70/goldens-base.json (PANTRY)', why: 'T78 F15: PANTRY\'s three internal drawers each gain an inner front board (FROZEN 1 broken for the one of the six the owner\'s F15 names)' },
  { file: 'fixtures/golden-bud-int.json', why: 'T78 F15: BUD_INT\'s two internal drawers gain inner fronts' },
];

export const GOLDENS = [];
