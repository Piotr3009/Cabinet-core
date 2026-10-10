// ─── T75 F16 · THE CHEST OF DRAWERS BETWEEN WARDROBES ──────────────────────
//
// CLAUDE.md T75 F16: *"`WARDROBE_CHEST2 / 3 / 4` copied from `BUDR2 / BUDR /
// BUDR4`, family wardrobe, wardrobe depth and the wardrobe's leg source,
// prefix `WC`, defaults block `wardrobeChest.defaults` ... Hole for hole
// against the BUDR of the same numbers."*
//
// Every engine delta hangs on a NEW TYPE id: none of the six is a chest, so
// none can open the gate. The liveness probe cuts a chest and a BUDR at the
// same numbers and asks that they be the same boards, holes and hardware.

import { computeCabinet } from '../../src/engine/cabinet.js';
import { defaultParamsFor, UNIT_TYPES } from '../../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../../src/engine/profile.js';

const CHESTS = { WARDROBE_CHEST2: 'BUDR2', WARDROBE_CHEST3: 'BUDR', WARDROBE_CHEST4: 'BUDR4' };
const isChest = (id) => Object.prototype.hasOwnProperty.call(CHESTS, id);

export const GATES = {
  chest: {
    what: 'a chest of drawers (WARDROBE_CHEST2 / 3 / 4: a new type id, `type.besideWardrobe`, F16)',
    opens: (p, id) => isChest(id) || isChest(p?.type),
  },
};

export const LICENSED = {
  'src/engine/types.js': {
    why: 'F16 · the three CHEST kits copied field by field from BUDR2, BUDR and BUDR4 (family wardrobe, the '
      + 'wardrobe\'s leg source, `heightGroup: null`, `besideWardrobe: true`), their prefix WC, their order, '
      + '`isBesideWardrobe`, and the Wardrobes category read off `WARDROBE_LIBRARY`',
    gates: ['chest'],
  },
  'src/engine/library.js': {
    why: 'F16 · `WARDROBE_LIBRARY`: the Wardrobes list as data, the chest\'s three counts one group on the '
      + 'drawer unit\'s variants (*"the count by the existing variants control"*). The library, not a cut',
    gates: [],
  },
  'src/engine/profile.js': {
    why: 'F16 · `wardrobeChest.defaults` (800 x 647 x 568: 647 is the wardrobe\'s base-of-drawers law, the '
      + 'partition over three inner drawers) and its migrate line, marked T75 proposed. Read only by the chest',
    gates: ['chest'],
  },
  'src/engine/topBox.js': {
    why: 'F16 · `hostsRidersOf` refuses a host that stands BESIDE a wardrobe (`type.besideWardrobe`): no top '
      + 'box rides a chest. Which cabinet a rider stands on, read by the store; the six are no host of that kind',
    gates: ['chest'],
  },
};

const strip = (r) => JSON.stringify({
  panels: r.panels.map(({ id, box, cnc, w, h, role }) => ({ id, box, cnc, w, h, role })),
  drills: r.drills,
  hardware: r.hardware,
});

export const LIVENESS = {
  chest: () => {
    const said = [];
    let live = true;
    for (const [chest, budr] of Object.entries(CHESTS)) {
      const p = { ...defaultParamsFor(chest, P), unit_num: '01' };
      const r = computeCabinet(p, P);
      const q = computeCabinet({ ...defaultParamsFor(budr, P), width: p.width, height: p.height, depth: p.depth, unit_num: '01' }, P);
      const fronts = r.panels.filter((x) => x.role === 'front').length;
      const same = strip(r) === strip(q);
      live = live && same && fronts === (UNIT_TYPES[chest].drawerVariant === 'x2' ? 2 : UNIT_TYPES[chest].drawerVariant === 'x4' ? 4 : 3);
      said.push(`${chest} ${fronts} fronts, ${same ? 'cuts what' : 'DIFFERS from'} ${budr}`);
    }
    return { live, said: said.join('; ') };
  },
};

export const GOLDENS = [
  {
    file: 'golden-wardrobe-chest.json',
    F: 'F16',
    source: 'KIT_BUDR_FULL.lsp (the BUDR x3 kit, hole for hole) at 800 x 647 x 568',
    params: () => ({ ...defaultParamsFor('WARDROBE_CHEST3', P), unit_num: '01' }),
  },
];
