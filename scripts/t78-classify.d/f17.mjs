// T78 F17 . the hood: canopy or short, with the clearance proposed (the owner, 11.10.2026:
// "szafka na hood tradycyjna czyli wysunieta pod skosem albo normalna szafka tylko mniejsza
// zeby bylo 650 do 750 minimum nad blatem, nad hobem"; "pozostaw to dla klienta, tylko proponuj").
import { computeCabinet } from '../../src/engine/cabinet.js';
import { defaultParamsFor } from '../../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../../src/engine/profile.js';
import { canopyGeometry } from '../../src/engine/hoodCanopy.js';

export const GATES = {
  hoodCanopy: {
    what: 'the canopy hood kit (`type.canopy`, WUD_HOOD_CANOPY only): the WUD carcass made a canopy by '
      + '`engine/hoodCanopy.js applyCanopy` (trapezoid sides, the bottom deeper by `hoodCanopy.defaults.bottomProjectionMm`, '
      + 'the sloped front of the front material). No kit written before T78 F17 carries the flag.',
    opens: (params, typeId) => typeId === 'WUD_HOOD_CANOPY',
  },
  hoodShort: {
    what: 'the short hood kit (WUD_HOOD_SHORT): WUD_HOOD to the letter at `hoodShort.defaults` (660 high, hung at 1560); '
      + 'no engine line of its own, the kit and its defaults only.',
    opens: (params, typeId) => typeId === 'WUD_HOOD_SHORT',
  },
};

export const LICENSED = {
  'src/engine/hoodCanopy.js': {
    why: 'T78 F17: the mirror of KIT_WUD_HOOD_CANOPY.lsp (`canopySpec`, `canopyGeometry`, `canopySidePoints`, `applyCanopy`): the trapezoid sides, the deeper bottom, the sloped front, run by computeCabinet only under `type.canopy`.',
    gates: ['hoodCanopy'],
  },
  'src/engine/hoodClearance.js': {
    why: "T78 F17: the ONE measure of the hood's clearance over the hob (Check #34 and the store's proposal read it); a reader of results, it cuts nothing and no golden reaches it.",
    gates: [],
  },
  'src/engine/cabinet.js': {
    why: 'T78 F17: the import of `applyCanopy` and one block guarded by `type.canopy` before the grain and the totals '
      + '(the sides, the bottom and the new front), plus `derived.canopy` (and BUL\'s hanger summary moved with its frame) '
      + 'under the same guard. Nothing runs for a kit without the flag.',
    gates: ['hoodCanopy'],
  },
  'src/engine/types.js': {
    why: 'T78 F17: two new kits beside WUD_HOOD (WUD_HOOD_CANOPY with `canopy: true`, `supports.doors: false`, its own LISP; '
      + 'WUD_HOOD_SHORT, WUD_HOOD\'s fields with `hoodShort.defaults`), both `heightGroup: null` and `topLine: \'wall\'`; '
      + 'two ids in UNIT_TYPE_ORDER after WUD_HOOD, two HD prefixes. A kit written before tonight reads none of it.',
    gates: ['hoodCanopy', 'hoodShort'],
  },
  'src/engine/profile.js': {
    why: 'T78 F17: `hoodCanopy.defaults`, `hoodShort.defaults` and `hood.clearance` (650 / 750), each `// T78 proposed, '
      + 'owner to confirm`, with their migrate lines; read only by the two kits and the clearance Check.',
    gates: ['hoodCanopy', 'hoodShort'],
  },
  'src/engine/library.js': {
    why: 'T78 F17: two rows in the Kitchen wall-units group beside the hood unit; a list.',
    gates: ['hoodCanopy', 'hoodShort'],
  },
  'src/engine/checks.js': {
    why: 'T78 F17: Check #34 (the hood\'s clearance over the hob, yellow, one click), read off `engine/hoodClearance.js`; '
      + 'it adds a finding only where a hood stands over a hob, which no golden (one cabinet, no room) can.',
    gates: ['hoodCanopy', 'hoodShort'],
  },
  'src/stores/projectStore.js': {
    why: 'T78 F17: `proposeHoodClearance` (the yellow with a button, T78 F6\'s grammar, at the end of `refreshAutoParts`), '
      + '`raiseHoodToClearance` (the click: `mount_height`), and the `topLine: \'wall\'` mount rule in `projectHeightParams` '
      + 'and `setProjectHeights`, read only by a kit that declares it.',
    gates: ['hoodCanopy', 'hoodShort'],
  },
  'src/lib/checkFindings.js': {
    why: 'T78 F17: `useGoToSubject` runs a finding\'s `subject.store` action before the flight (Check #34\'s button); '
      + 'a subject without one flies exactly as before.',
    gates: ['hoodCanopy', 'hoodShort'],
  },
  'src/components/RightPanel.jsx': {
    why: 'T78 F17: the Hob select (induction | gas) on a hob unit, written as `params.hob_kind` through `updateUnitParams`; '
      + 'PRO, the EXEMPT licence and the hash are the integrator\'s.',
    gates: ['hoodCanopy', 'hoodShort'],
  },
};

export const LIVENESS = {
  hoodCanopy: () => {
    const r = computeCabinet({ ...defaultParamsFor('WUD_HOOD_CANOPY', P), unit_num: 'HD01' }, P);
    const bul = r.panels.find((p) => p.id === 'BUL');
    const bottom = r.panels.find((p) => p.id === 'BOTTOM');
    const front = r.panels.find((p) => p.id === 'CANOPY-FRONT');
    const g = canopyGeometry({ H: 500, P: 150, frontT: 25 });
    const doors = r.panels.filter((p) => p.part === 'FRONT').length;
    const live = Boolean(bul && bottom && front) && bul.w === 532 && bottom.h === 532 && front.h === g.blankLen
      && front.role === 'false_front' && doors === 0 && r.derived.canopy?.slopeDeg === g.slopeDeg
      && r.hardware.some((h) => h.role === 'extractor');
    return {
      live,
      said: `WUD_HOOD_CANOPY cuts BUL ${bul?.w} x ${bul?.h} (trapezoid), BOTTOM ${bottom?.w} x ${bottom?.h}, `
        + `CANOPY-FRONT ${front?.w} x ${front?.h} of the front material at ${r.derived.canopy?.slopeDeg} degrees, ${doors} doors`,
    };
  },
  hoodShort: () => {
    const r = computeCabinet({ ...defaultParamsFor('WUD_HOOD_SHORT', P), unit_num: 'HD01', doors: { count: 1 } }, P);
    const front = r.panels.find((p) => p.part === 'FRONT');
    const live = r.params.height === 660 && r.params.mount_height === 1560 && !r.panels.some((p) => p.part === 'BOTTOM')
      && front && front.h === 660 - P.hoodWallUnit.defaults.aperture - 3;
    return {
      live,
      said: `WUD_HOOD_SHORT is ${r.params.height} high at ${r.params.mount_height}, its door ${front?.h} over the open aperture`,
    };
  },
};

export const GOLDENS = [
  {
    file: 'golden-hood-canopy.json',
    F: 'F17',
    source: 'KIT_WUD_HOOD_CANOPY.lsp sections 3 and 4: trapezoid sides (the parent\'s joints from the back, the slant closing), '
      + 'the bottom 150 deeper at the front, the sloped front W x Lblank of the front material, no door, the extractor a line',
    params: () => ({ ...defaultParamsFor('WUD_HOOD_CANOPY', P), unit_num: '01' }),
  },
  {
    file: 'golden-hood-short.json',
    F: 'F17',
    source: 'KIT_WUD_FULL.lsp as KIT_WUD_HOOD reads it: the hood at hoodShort.defaults (660 high, hung at 1560), open underneath, '
      + 'one door above the 350 aperture',
    params: () => ({ ...defaultParamsFor('WUD_HOOD_SHORT', P), unit_num: '01', doors: { count: 1 } }),
  },
];
