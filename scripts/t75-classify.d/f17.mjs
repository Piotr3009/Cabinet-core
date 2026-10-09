// ─── T75 F17 · THE FLOATING DESK ───────────────────────────────────────────
//
// CLAUDE.md T75 F17: *"`WARDROBE_DESK`: a wall-hung carcass (WUD's hangers
// and back cut-outs, `mount: 'wall'`), height `wardrobeDesk.defaults.height =
// 160`, depth = wardrobe depth, ONE drawer row ... prefix `WD`. It takes a
// WORKTOP ... the worktop record gets the per-worktop `thickness`."*
//
// The cut-path delta hangs on a NEW TYPE id (none of the six is a desk). The
// worktop and design deltas are the design layer, which `computeCabinet`
// never reads (test/turn30-f8-worktop.test.js), and every new key there is
// absent from every record written before tonight.

import { computeCabinet } from '../../src/engine/cabinet.js';
import { defaultParamsFor } from '../../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../../src/engine/profile.js';

export const GATES = {
  desk: {
    what: 'a floating desk (WARDROBE_DESK: a new type id, `type.desk`, F17)',
    opens: (p, id) => id === 'WARDROBE_DESK' || p?.type === 'WARDROBE_DESK',
  },
};

export const LICENSED = {
  'src/engine/types.js': {
    why: 'F17 · WARDROBE_DESK copied field by field from WUD (its carcass, hangers, back cut-outs), filed with '
      + 'the wardrobes, one drawer through `drawerRatioKey`, `desk: true`, prefix WD, `isDeskKit`',
    gates: ['desk'],
  },
  'src/engine/library.js': {
    why: 'F17 · the Wardrobes row "Floating desk". The library, not a cut',
    gates: [],
  },
  'src/engine/profile.js': {
    why: 'F17 · `wardrobeDesk.defaults` (1000 x 160 x 568, hung at 720, top 25) and `drawerRatio` [1], with '
      + 'their migrate line, marked T75 proposed. Read only by the desk',
    gates: ['desk'],
  },
  'src/engine/worktop.js': {
    why: 'F17 · `takesWorktop` admits a wall kit that declares `desk: true`; one desk is enough for a slab; '
      + '`slabThickness` reads the per-worktop `thickness` (38 the fallback); a desk\'s top butts what stands '
      + 'beside it at its height. The design layer: computeCabinet never reads it',
    gates: [],
  },
  'src/engine/design.js': {
    why: 'F17 · `migrateDesign` keeps a worktop record of one desk (`kind: \'desk\'`) and its `thickness`. '
      + 'The design layer',
    gates: [],
  },
};

const carcass = (r) => JSON.stringify({
  boards: r.panels.filter((x) => ['side', 'top', 'bottom', 'back'].includes(x.role)).map(({ id, box, cnc }) => ({ id, box, cnc })),
  holes: r.drills.filter((d) => ['BUL', 'BUR', 'TOP', 'BOTTOM', 'BACK'].includes(d.panel) && !['runner', 'hinge'].includes(d.kind)),
});

export const LIVENESS = {
  desk: () => {
    const p = { ...defaultParamsFor('WARDROBE_DESK', P), unit_num: '01' };
    const r = computeCabinet(p, P);
    const q = computeCabinet({
      ...defaultParamsFor('WUD', P), width: p.width, height: p.height, depth: p.depth, mount_height: p.mount_height, unit_num: '01',
    }, P);
    const fronts = r.panels.filter((x) => x.role === 'front');
    const same = carcass(r) === carcass(q);
    const hangers = r.hardware.find((h) => h.role === 'hangers')?.qty;
    return {
      live: same && fronts.length === 1 && hangers === 2,
      said: `WARDROBE_DESK cuts ${fronts.length} drawer front ${fronts[0]?.w} x ${fronts[0]?.h}, ${hangers} hangers, `
        + `${same ? 'WUD\'s carcass hole for hole' : 'a carcass that is NOT WUD\'s'}`,
    };
  },
};

export const GOLDENS = [
  {
    file: 'golden-wardrobe-desk.json',
    F: 'F17',
    source: 'KIT_WUD_FULL.lsp (the carcass, hole for hole) and KIT_BUDR_FULL.lsp (one drawer) at 1000 x 160 x 568',
    params: () => ({ ...defaultParamsFor('WARDROBE_DESK', P), unit_num: '01' }),
  },
];
