/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T82 F9, the fragment of two slices merged by INT: B5 (the chest) and B2 (the vanity kits); B4's Bathroom rows
// and D1's trap in the room are outside this contract (library.js is licensed below; src/3d is not asked).
// T82 F9 (slice B5, THE CHEST) · THE CHEST OF DRAWERS TAKES THE VANITY'S TWO RULES. CLAUDE.md T82 F9: *"The chest of
// drawers of the wardrobe family (WARDROBE_CHEST2/3/4, T75 F16) takes the same two rules (*"7 - tak"*): equal overlay
// drawers by default and `columns: 2`; no basin, no void, no rails: its back stays"*, *"its goldens held at columns 1"*.
// LISP FIRST: reference/lisp/KIT_VANITY.lsp D8 (equal fronts), D10 to D12 and section 5(c2) THE TWO COLUMNS, D20 (the
// chest takes D8 and 5(c2) whole). The engine reads both rules off the TYPE's key `drawerColumns` and the unit's params,
// never a kit's id (cabinet.js drawerColumnsOf, drawerSplitOf, drawerColumnsPlan, drawerColumnsDivider; VANITY2/3/4
// reuse them). THE GATES: `params.columns === 2` and `params.drawer_split === 'equal'` on a chest. Neither key is in any
// golden (golden-wardrobe-chest.json names neither; defaultParamsFor writes neither: the equal split is written where a
// chest is BORN, projectStore newUnit, T48 F3's law), so the six, T75's, T78's and every later golden hold by
// construction. Three NEW goldens, never re-pinned, under verify/t82/goldens/ (CLAUDE.md T82 FROZEN 1): the three chests
// at their defaults, columns 2, equal. INT: merge with B2's draft of the same F into scripts/t78-classify.d/f43-t82-f09.mjs.
// T82 F9 (slice B2) · THE VANITY KITS. CLAUDE.md T82 F9: *"`VANITY2`, `VANITY3`, `VANITY4` (bathroom family ...),
// defaults from `profile.vanity.defaults` ... `engine/cabinet.js` mirrors KIT_VANITY.lsp byte for byte; a bare
// `computeCabinet('VANITY3')` is the LISP"*. Three NEW kits (FROZEN 1: new kits add, they never edit a fossil): the
// drawer base (KIT_BUDR_FULL) with its back cut out to RAIL-BOTTOM and RAIL-TOP, equal fronts, the trap's U in the
// top drawer's box and Check #39, the service void in the unit's `wall_gap`. Every line is guarded by a key no kit
// written before tonight carries (`type.vanity`, `type.equalDrawers`, `carcass.back === 'cut'`), so the gate
// `vanity` is opened by the vanity kits only. Their goldens are NEW (verify/t82/goldens, never re-pinned).
// Draft for INT: drop into scripts/t78-classify.d/ as f43-t82-f09.mjs (or merge with B5's F9 fragment).

import { computeCabinet } from '../../src/engine/cabinet.js';
import { defaultParamsFor } from '../../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../../src/engine/profile.js';

const OWNER_B5 = 'The owner, 25.10.2026: (12:57) *"vanity unit (podobna zasada bedzie do chest drawers) ... pamietaj ze w vanity '
  + 'default to sa rowne, do tego prosze external drawers ale wybor 2 rows, patrz szafa"*; (13:03) *"7 - tak"*.';

const CHESTS = ['WARDROBE_CHEST2', 'WARDROBE_CHEST3', 'WARDROBE_CHEST4'];
const isChest = (id) => CHESTS.includes(id);
const chestOf = (p, id) => (isChest(id) ? id : (isChest(p?.type) ? p.type : null));
const chestParams = (id) => ({ ...defaultParamsFor(id, P), unit_num: '01', columns: 2, drawer_split: 'equal' });

const OWNER_B2 = 'The owner, 25.10.2026 (12:57): *"vanity unit potrzebuje z szufladami nawierzchniowymi, wybor jak zawsze '
  + '2 3 i 4 ale pamietaj ze w vanity default to sa rowne ... musimy miec tez wyciecie na trap, w razie czego jak nie '
  + 'bedzie miejsca to zostawimy informacje prosze uzyc shallow trap ... nie ma plecow na vanity unit tylko sa poziome '
  + 'poprzeczki na dole i na gorze, plecy sa jakby wyciete"*; (13:03) *"2 wyciecie u dookola zeby sie szuflada '
  + 'otwierala, 3 - 80, 4 - 100 na material carcasa grubosc"*; (13:46) *"6 - tak"*.';

const VANITY = /^VANITY[234]$/;
const kit = (type, extra = {}) => ({ ...defaultParamsFor(type, P), unit_num: '01', ...extra });

const OWNER_B2_FIX = 'The owner, 25.10.2026 (12:57): *"dodanie 1 sink or 2 sink? dodajesz tylko do widoku, musimy miec tez '
  + 'wyciecie na trap, w razie czego jak nie bedzie miejsca to zostawimy informacje prosze uzyc shallow trap"*; '
  + '(13:03) *"2 wyciecie u dookola zeby sie szuflada otwierala"*.';

export const GATES = {
  chest_columns: {
    what: 'a chest of drawers (WARDROBE_CHEST2 / 3 / 4) asking for two drawer columns (params.columns 2): the DIVIDER '
      + 'mid-width, the same stack in each column, a runner pair and a rod per box. The store writes columns 1 at birth; '
      + 'no existing golden carries the key',
    opens: (p, id) => Boolean(chestOf(p, id)) && Math.trunc(Number(p?.columns)) === 2,
  },
  chest_split: {
    what: 'a chest of drawers with params.drawer_split equal (written where a chest is born in a project): n equal '
      + 'fronts, the top one taking the rounding. A bare chest, its golden and every saved project carry no key',
    opens: (p, id) => Boolean(chestOf(p, id)) && p?.drawer_split === 'equal',
  },
  vanity: {
    what: 'the vanity kits (`type.vanity`, VANITY2 / VANITY3 / VANITY4): KIT_VANITY.lsp on its parent KIT_BUDR_FULL, '
      + 'the equal split (`type.equalDrawers` in `drawerSplitFor`), the back `cut` (no BACK, the sides\' back tabs off, '
      + 'RAIL-BOTTOM and RAIL-TOP from `engine/vanity.js vanityRailGeometry`), the trap\'s U and #39 '
      + '(`applyVanityTrap`), `derived.vanity`. No kit written before T82 F9 carries any of the three keys.',
    opens: (params, typeId) => VANITY.test(String(typeId || params?.type || '')),
  },
};

export const LICENSED = {
  'src/engine/cabinet.js': {
    why: 'T82 F9 (B5): drawerColumnsOf, drawerSplitOf, drawerColumnsPlan, drawerColumnsDivider (KIT_VANITY.lsp D8, 5(c2)); '
      + 'normalizeParams reads the split through drawerSplitOf; the drawer block cuts `cols` (one column: the very values '
      + 'it always cut with; two: the plan\'s), the DIVIDER (a VPART, 18 x H - 2G x D - G at (W - G) / 2), the boxes, '
      + 'bottoms and fronts per column (tags Z1D{i} / Z2D{i}, fronts {unit}-Z{c}D{i}-F, (W - 6) / 2), the divider\'s '
      + 'runner rows on both faces, a pair and a rod per box, the derived and assembly records, a double row refused in '
      + `words on two columns, a box with no room for its walls refused in words. ${OWNER_B5}`
      + ' . ' + 'T82 F9: the import of engine/vanity.js; `drawerSplitFor` answers `equalDrawers` with the variant\'s count of '
      + 'ones, exact; the sides\' edges `{ backTabs: false }` for a back `cut`; RAIL-BOTTOM and RAIL-TOP emitted where '
      + 'the BACK would be, for a back `cut`; `applyVanityTrap` in one block guarded by `type.vanity` beside the '
      + 'canopy\'s; `derived.vanity` under the same guard. Nothing runs for a kit without the keys.'
      + ' After the review: D24 in the drawer ladder\'s double loop, behind type.vanity.'
      + ' computeCabinet now IMPORTS engine/worktop.js fitBasins (B3\'s, the one source of which basins fit, asked with the unit\'s params alone) for a vanity only; D18 and D26 in the rails block, derived.vanity.basins and top; every line behind type.vanity or carcass.back === \'cut\'.',
    gates: ['chest_columns', 'chest_split', 'vanity'],
  },
  'src/engine/types.js': {
    why: 'T82 F9 (B5): `drawerColumns: true` on WARDROBE_CHEST2 / 3 / 4 (the kit takes KIT_VANITY.lsp D8 and 5(c2), '
      + `D20). defaultParamsFor is untouched: the equal split is a birth answer (projectStore newUnit). ${OWNER_B5}`
      + ' . ' + 'T82 F9: VANITY2 / VANITY3 / VANITY4 after BUDR4 (the drawer units\' fields, `equalDrawers`, `drawerColumns`, '
      + '`vanity`, family bathroom, `carcass.back: \'cut\'`, `vanity.defaults`), three ids in UNIT_TYPE_ORDER, prefix VU, '
      + '`isVanityKit`, and `defaultParamsFor`\'s spread of columns 1, sinks 1, floating false, float_height_mm and '
      + 'wall_gap = clearance + 80 for a vanity only. A kit written before tonight reads none of it.',
    gates: ['chest_columns', 'chest_split', 'vanity'],
  },
  'src/engine/hardware3d.js': {
    why: 'T82 F9 (B5): runnerInstances and rodInstances group the drawer sides by `meta.column` (cut only on two drawer '
      + 'columns): each column\'s pairs on its own box faces, a rod per box. A stack with no column is one group, so '
      + `every unit places what it placed. The room's hardware, never a cut. ${OWNER_B5}`,
    gates: ['chest_columns'],
  },
  'src/engine/vanity.js': {
    why: `T82 F9: new. The mirror of KIT_VANITY.lsp part 5 (vanity-rails, vanity-rail-side-screws, vanity-wall-gap, `
      + `vanity-wastes, vanity-trap-plan, vanity-u-in-bottom, vanity-u-outline, vanity-back-pieces, vanity-trap-verdict), `
      + `run by computeCabinet only under \`type.vanity\` / \`carcass.back === 'cut'\`. ${OWNER_B2}`
      + ' After the review: D23 vanity-u-fits-p with backPieceMinMm 30 (no U leaves a back-wall board under 30, said by #39).'
      + ' D24 vanity-double-refused-p and vanity-double-refusal (no double drawer in the top row or the row under it when a basin is asked).'
      + ' D18 vanity-top-cutouts and vanity-top-cutout-note (applyVanityTop: TOP.meta.vanityBasins), D26 vanity-oval-meets-p, vanity-top-back-features and vanity-top-back-dropped (vanityRailGeometry\'s dropped).',
    gates: ['vanity'],
  },
  'src/engine/checks.js': {
    why: 'T82 F9: Check #39 (yellow, the vanity\'s trap in KIT_VANITY.lsp\'s sentences), read off the engine\'s '
      + '`VANITY_TRAP` warning; it adds a finding only where a vanity\'s trap has no room.',
    gates: ['vanity'],
  },
  'src/engine/joinery.js': {
    why: 'T82 F9: the RAIL-BOTTOM and RAIL-TOP parts take the BACK\'s placement (the back\'s own frame); a reader of '
      + 'the cut for the view, never read by computeCabinet.',
    gates: [],
  },
  'src/engine/partRegistry.js': {
    why: 'T82 F9: RAIL-BOTTOM and RAIL-TOP map to carcase_horizontal (the carcass board, "na material carcasa '
      + 'grubosc"); the registry reads the engine\'s answer, the engine never reads it.',
    gates: [],
  },
  'src/engine/library.js': {
    why: 'T82 F9 (slice B4): the Bathroom group (BATHROOM_GROUP, "Vanity unit, N drawers" for VANITY2 / 3 / 4) in the '
      + 'Kitchen library before Extras and in the wardrobe library after its rows: *"new library group "Bathroom" in the '
      + 'Kitchen library and in the wardrobe library"* (CLAUDE.md T82 F9). A library row; no cut reads it.',
    gates: [],
  },
  'src/engine/readiness.js': {
    why: `T82 F9, after the review: vanityTopNotes, the one row per vanity TOP under a basin (KIT_VANITY.lsp D18: its `
      + `oval is cut on site to the basin's template, never on the CNC), read by notCutParts (Check #30) and the BOM's `
      + `NOTE row; it reads TOP.meta.vanityBasins, which only a vanity carries. A reader; it cuts nothing. ${OWNER_B2_FIX}`,
    gates: ['vanity'],
  },
  'src/engine/worktop.js': {
    why: 'T82 F9, after the review: read by computeCabinet (fitBasins, for a vanity only); B3\'s licence\'s "computeCabinet '
      + 'never reads worktop.js" no longer holds and is amended by this line.',
    gates: ['vanity'],
  },
};

export const LIVENESS = {
  // KIT_VANITY.lsp section 6, THE CHEST: WARDROBE_CHEST3 800 x 647 x 568, equal, columns 2: the fronts 213 213 212,
  // 397 wide at x 1.5 and 401.5; the DIVIDER at x 391, 18 x 611 x 550; the openings 373 each.
  chest_columns: () => {
    const r = computeCabinet(chestParams('WARDROBE_CHEST3'), P);
    const dv = r.panels.find((x) => x.id === 'DIVIDER');
    const f = r.panels.filter((x) => x.role === 'front');
    const live = Boolean(dv) && dv.part === 'VPART' && dv.box.x === 391 && dv.h === 550 && dv.w === 611
      && f.length === 6 && f.every((x) => x.w === 397) && f.map((x) => x.box.x).filter((x) => x === 401.5).length === 3
      && r.derived.column_openings.every((o) => o.w === 373);
    return { live, said: `DIVIDER ${dv?.box?.x} ${dv?.w} x ${dv?.h}, ${f.length} fronts ${[...new Set(f.map((x) => x.w))].join(' / ')}` };
  },
  chest_split: () => {
    const r = computeCabinet({ ...defaultParamsFor('WARDROBE_CHEST3', P), unit_num: '01', drawer_split: 'equal' }, P);
    const hs = r.derived.front_heights;
    return { live: hs.join(' ') === '213 213 212', said: `CHEST3 equal: ${hs.join(' / ')} (the kit's own 284 / 213 / 142)` };
  },
  vanity: () => {
    const r = computeCabinet(kit('VANITY3'), P);
    const top = r.panels.find((p) => p.id === 'RAIL-TOP');
    const bottom = r.panels.find((p) => p.id === 'RAIL-BOTTOM');
    const fronts = r.panels.filter((p) => p.part === 'DRAWER-FRONT').map((p) => p.h);
    const pieces = r.panels.filter((p) => /^D3-BB-\d$/.test(p.id)).map((p) => p.w);
    const trap = r.warnings.filter((w) => w.code === 'VANITY_TRAP').length;
    const live = Boolean(top && bottom) && top.h === 100 && bottom.box.y === 0
      && !r.panels.some((p) => p.part === 'BACK')
      && JSON.stringify(fronts) === JSON.stringify([197, 197, 197])
      && JSON.stringify(pieces) === JSON.stringify([329, 329]) && trap === 1;
    return {
      live,
      said: `VANITY3 900 x 600 x 500 cuts RAIL-BOTTOM ${bottom?.w} x ${bottom?.h} and RAIL-TOP ${top?.w} x ${top?.h}, no BACK, `
        + `fronts ${fronts.join(' / ')}, the top box's back wall as ${pieces.join(' + ')}, ${trap} #39 sentence`,
    };
  },
};

const GOLDENS_B5 = ['WARDROBE_CHEST2', 'WARDROBE_CHEST3', 'WARDROBE_CHEST4'].map((id) => ({
  file: `../verify/t82/goldens/golden-wardrobe-chest${id.slice(-1)}-columns2.json`,
  F: 'F43',
  source: `T82 F9 (B5). KIT_VANITY.lsp 5(c2) THE TWO COLUMNS and D8 on ${id} (KIT_BUDR_FULL.lsp, the chest of T75 F16) at `
    + '800 x 647 x 568, columns 2, drawer_split equal: the DIVIDER at x 391, 18 x 611 x 550; the openings 373; the fronts '
    + `(W - 6) / 2 = 397 at x 1.5 and 401.5; the boxes 363 at x 23 and 414. ${OWNER_B5}`,
  params: () => chestParams(id),
}));

const SOURCE = 'KIT_VANITY.lsp (the parent KIT_BUDR_FULL): RAIL-BOTTOM and RAIL-TOP W x 100 x G where the back stood (D2 '
  + 'to D4), equal overlay fronts (D8), the box on the runner less ten (D9)';
const GOLDENS_B2 = [
  {
    file: '../verify/t82/goldens/golden-vanity2.json',
    F: 'F43',
    source: `${SOURCE}; VANITY2 900 x 600 x 500, one basin: fronts 297 / 297, the U 370..530 in D2 (D13), #39 the trap 45 beyond the U (D15). ${OWNER_B2}`,
    params: () => kit('VANITY2'),
  },
  {
    file: '../verify/t82/goldens/golden-vanity3.json',
    F: 'F43',
    source: `${SOURCE}; VANITY3 900 x 600 x 500, one basin (the LISP's worked example): fronts 197 x 3, D3-BB-1 and D3-BB-2 329 each, the bottom notched 335.5..495.5 R 20 (D13). ${OWNER_B2}`,
    params: () => kit('VANITY3'),
  },
  {
    file: '../verify/t82/goldens/golden-vanity4.json',
    F: 'F43',
    source: `${SOURCE}; VANITY4 900 x 600 x 500, one basin: fronts 147 x 4, the U in D4, 62 of air under the trap (D16). ${OWNER_B2}`,
    params: () => kit('VANITY4'),
  },
  {
    file: '../verify/t82/goldens/golden-vanity3-sinks0.json',
    F: 'F43',
    source: `${SOURCE}; VANITY3 900 x 600 x 500 with no basin: every box whole, no #39. ${OWNER_B2}`,
    params: () => kit('VANITY3', { sinks: 0 }),
  },
  {
    file: '../verify/t82/goldens/golden-vanity3-sinks2.json',
    F: 'F43',
    source: `${SOURCE}; VANITY3 900 x 600 x 500, two basins on one column (D14): the U's 220..380 and 520..680, the back wall D3-BB-1 179, D3-BB-2 140, D3-BB-3 179. ${OWNER_B2}`,
    params: () => kit('VANITY3', { sinks: 2 }),
  },
  {
    file: '../verify/t82/goldens/golden-vanity3-columns2.json',
    F: 'F43',
    source: `${SOURCE}; VANITY3 900 x 600 x 500, columns 2 and two basins (D10 to D12, D14): the DIVIDER at x 441, 18 x 564 x 482, `
      + `fronts 447 at x 1.5 and 451.5, six boxes 413 wide, the U's 145..305 in Z1D3 and 595..755 in Z2D3, Z1D3's back wall `
      + `(0 104) and (264 377) (the columns cut by drawerColumnsPlan, B5's, once for every drawerColumns kit). ${OWNER_B2}`,
    params: () => kit('VANITY3', { columns: 2, sinks: 2 }),
  },
];

export const GOLDENS = [...GOLDENS_B5, ...GOLDENS_B2];

export const REPINNED = [];
