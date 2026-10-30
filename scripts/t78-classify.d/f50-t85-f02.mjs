/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T85 F2 . THE ENGINE MIRRORS KIT_RECESS.lsp D29 AND D30 (engine/extension.js section I3, engine/cabinet.js
// recessColumn, engine/checks.js #50). The owner, 30.10.2026 (20:17 to 20:48), over the plan-view mockup:
//   THE COLUMN FOLLOWS THE RECESS (D29): the column's walls are the band's edges wherever the carcass stands
//     (recessColWalls): a DIVIDER on an edge inside by recess.minColumnSide (30), the carcass SIDE (grown) where the
//     edge is outside the carcass, the full-height RETURN where it is inside by less; one divider or two; the box runs
//     wall to wall (recessColBoxSpan); the board over the drawers and the BOTTOM an L each on the walls' edges; the
//     fillers only beside a DIVIDER; the dead pocket beside a RETURN wall a NOTE (#50, never red); recessColRefusal
//     amended (the band reaching a side no longer refuses; the dividers asked only where they stand).
//   THE RETURNS ARE ON CABINEO (D30): a recess column's RETURN whose bottom end stands on a board joins it with the
//     connector in its own end, pockets on its outside face, the dia 5 holes in the board (the board over the drawers,
//     or the BOTTOM under a full-height RETURN); the unit's Cabineo 8 or 12, else 12; a cut part (Check #30 silent);
//     the connectors and caps an order line; the skin check on the RETURN after the drilling pass.
// The fossil kits untouched; the six hold byte for byte; ONE golden re-pinned with his words (the 28.10 recess column,
// its RETURNs gain pockets and holes), five new goldens (the five cases of the mockup).

import { computeCabinet } from '../../src/engine/cabinet.js';
import { defaultParamsFor } from '../../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../../src/engine/profile.js';

const OWNER_MOVE = '*"jak przesuwam i mam recess lub komin to mi sie ladnie zmienia ksztalt elementow, to dziala '
  + 'super, ale jak mamy szuflady w recess to juz sie tak nie przesuwa, tylko przy przesunieciu calej szafy szuflady '
  + 'znikaja a zostaja dividery ktore sie robia do samej gory, nie powinno tak byc"*; *"2 - jesli wneka wychodzi poza '
  + 'szafe to zostaje jeden divider ... szuflady sa mniej glebokie do plytszej szafy a polka zostaje w ksztalcie litery '
  + 'L, proste prawda?"*; *"2 - nie, tutaj musi byc minimum 30 mm"*; *"3 - znikaja z szufladami, bo to sa dividery do '
  + 'szuflad"* (30.10.2026)';
const OWNER_CABINEO = '*"dlaczego niektore elementy z recess nie sa machined?"*; *"1 - cabineo"* (the owner, '
  + '30.10.2026, 20:38)';

const ext = (p) => (p?.extension && typeof p.extension === 'object' ? p.extension : null);
const itemsOf = (p) => [
  ...(Array.isArray(p?.items) ? p.items : []),
  ...(Array.isArray(p?.sections?.[0]?.items) ? p.sections[0].items : []),
];
const zonedDrawers = (p) => itemsOf(p).some((i) => i?.kind === 'drawer' && i.zone != null && Number.isFinite(Number(i.zone)));
const kit = (type, extra = {}) => ({ ...defaultParamsFor(type, P), unit_num: '01', ...extra });
const PROJECT = { shelf_front_mm: 10, interior_setback_mm: 10, drawer_cap_setback_mm: 10 };
// The store's road (D28, T85 F3): the dividers it made at the face and the drawers it put between them, marked.
const MARK = { meta: { recessColumn: true } };
const divider = (k, x) => ({ id: `p${k}`, kind: 'partition', x_mm: x, front_mm: 0, ...MARK });
const drawers = (zone) => [0, 1, 2].map((index) => ({
  id: `d${index + 1}`, kind: 'drawer', zone, index, height_mm: 200, mount: 'internal', ...MARK,
}));
// THE OWNER'S WARDROBE of KIT_RECESS.lsp CASE F (1200 x 2150 x 300) before his recess 800 x 300 (ed 290), floor to
// ceiling, dragged along its wall: I4's CASE G, the band in the carcass frame as the room hands it.
export const CASES = {
  a: () => kit('WARDROBE', {
    width: 1200, depth: 300, ...PROJECT, extension: { x0: 210, x1: 990, z0: 0, z1: 2150, d: 290 },
    items: [divider(1, 210), divider(2, 972), ...drawers(1)],
  }),
  b: () => kit('WARDROBE', {
    width: 1200, depth: 300, ...PROJECT, extension: { x0: 0, x1: 690, z0: 0, z1: 2150, d: 290 },
    items: [divider(1, 672), ...drawers(0)],
  }),
  c: () => kit('WARDROBE', {
    width: 1200, depth: 300, ...PROJECT, extension: { x0: 25, x1: 805, z0: 0, z1: 2150, d: 290 },
    items: [divider(1, 787), ...drawers(0)],
  }),
  d: () => kit('WARDROBE', { width: 1200, depth: 300, ...PROJECT, items: [] }),
  e: () => kit('WARDROBE', {
    width: 1200, depth: 558, ...PROJECT, items: [divider(1, 210), divider(2, 972), ...drawers(1)],
  }),
};

export const GATES = {
  recessColumnWalls: {
    what: 'a recess extension on a unit with a column of drawers (drawer items in a zone): the column\'s walls are read '
      + 'off the band (KIT_RECESS.lsp D29, recessColWalls): one divider or two, the SIDE or the full-height RETURN at an '
      + 'edge outside or within 30 of a side, the box wall to wall, the L boards on the walls\' edges, the fillers beside '
      + 'a DIVIDER only, #50 at a RETURN wall. A unit with no extension or no zoned drawer reaches no changed line',
    opens: (p) => Boolean(ext(p)) && zonedDrawers(p),
  },
  recessReturnCabineo: {
    what: 'a recess column taken (the same unit as recessColumnWalls, the column accepted): its RETURNs on the board '
      + 'they stand on are joined on Cabineo (KIT_RECESS.lsp D30): pockets on the RETURN\'s outside face, dia 5 holes in '
      + 'the board, a cut part, an order line. A recess without drawers (every RETURN beside a bump) reaches no changed '
      + 'line: its RETURNs stay D11\'s outlines',
    opens: (p) => Boolean(ext(p)) && zonedDrawers(p),
  },
};

export const LICENSED = {
  'src/engine/extension.js': {
    why: 'T85 F2 (KIT_RECESS.lsp D29, D30, section I3): recessColWall, recessColWalls, recessColWallP, '
      + 'recessColDividerCount, recessColZone, recessColBoxSpan, recessColBottomEdges, recessColCapEdges, '
      + 'recessColBottomOutlineWalls, recessColCapOutlineWalls, recessColTopJointsWalls, recessColReturnFull, '
      + 'recessColReturnFullPlace, recessColBoxPlacesWalls, recessColWallFillers, recessColDeadPockets, '
      + 'recessReturnCabineo (each its LISP routine), the engine\'s half of D30 (recessReturnCabineoSystem, '
      + 'recessReturnCabineoPlan, recessReturnHardwareLines, recessReturnSkinFindings, engine/cabineo.js read as a '
      + 'library); recessColRefusal AMENDED (no side refusal, the dividers asked only where a DIVIDER wall stands); '
      + 'extensionCarcass cuts a recess column on its walls (the L BOTTOM and board, the RETURNs by wall, the TOP\'s '
      + 'and BOTTOM\'s joints of a grown side) and joins its RETURNs on Cabineo (readiness cut); extensionSummary names '
      + `the walls, the RETURNs' joints and the dead pockets. recessColPairX and recessColDividerX unchanged. `
      + `${OWNER_MOVE} ${OWNER_CABINEO}`,
    gates: ['recessColumnWalls', 'recessReturnCabineo'],
  },
  'src/engine/cabinet.js': {
    why: 'T85 F2: recessColumn reads the walls (recessColWalls on profile.recess.minColumnSideMm 30): the unit\'s '
      + 'dividers must be the DIVIDER walls (two or one) and the column the bay between the walls, the sentence when not '
      + '(RECESS_DRAWERS_SHALLOW, its words for one divider); the box runs wall to wall (set.from, the light of the span, '
      + 'no DP in a recess column); the fillers beside a DIVIDER only; a RETURN wall is the runner\'s bound and keeps '
      + 'the holes that fall on it; the RETURNs\' Cabineo drills and order lines; the skin check on the RETURN '
      + '(RECESS_RETURN_SKIN) and the dead pocket\'s NOTE (RECESS_DEAD_POCKET) after the drilling pass. '
      + `${OWNER_MOVE} ${OWNER_CABINEO}`,
    gates: ['recessColumnWalls', 'recessReturnCabineo'],
  },
  'src/engine/checks.js': {
    why: `T85 F2 (KIT_RECESS.lsp D29 b): #50, a NOTE (never red, never a gate), the dead pocket beside a recess `
      + `column's RETURN wall, read off the engine's own RECESS_DEAD_POCKET. Findings only; no cut moves. ${OWNER_MOVE}`,
    gates: ['recessColumnWalls'],
  },
};

const box = (r, id) => { const p = r.panels.find((x) => x.id === id); return p ? `${p.w}x${p.h}` : 'none'; };

export const LIVENESS = {
  // I4 CASE G (b) and (c): one divider; the SIDE grown to 572 beside the box 18..672; the full-height RETURN 290 x 2132
  // the box's wall at 43, #50 said.
  recessColumnWalls: () => {
    const b = computeCabinet(CASES.b(), P);
    const c = computeCabinet(CASES.c(), P);
    const sl = (r) => r.panels.find((p) => p.id === 'Z1D1-SL');
    const live = box(b, 'BUL') === '572x2150' && box(b, 'VPART-1') === '611x572' && sl(b)?.w === 440
      && box(c, 'RETURN-L') === '290x2132' && sl(c)?.box?.x === 48 && c.warnings.some((w) => w.code === 'RECESS_DEAD_POCKET')
      && b.warnings.length === 0;
    return {
      live,
      said: `b: BUL ${box(b, 'BUL')}, VPART-1 ${box(b, 'VPART-1')}, drawers ${sl(b)?.w}; c: RETURN-L ${box(c, 'RETURN-L')}, `
        + `the box from ${sl(c)?.box?.x}, ${c.warnings.map((w) => w.code).join(' ') || 'silent'}`,
    };
  },
  // I4 CASE G (a): four connectors, the RETURNs cut, the holes in the board over the drawers at 197.5 and 966.5.
  recessReturnCabineo: () => {
    const r = computeCabinet(CASES.a(), P);
    const holes = r.drills.filter((d) => d.panel === 'PARTITION' && d.kind === 'cabineo_hole').map((d) => `${d.x}/${d.y}`);
    const conn = (r.hardware || []).find((h) => h.role === 'cabineo_connector');
    const ready = ['RETURN-L', 'RETURN-R'].map((id) => r.panels.find((p) => p.id === id)?.meta?.readiness);
    const live = holes.join(' ') === '197.5/240 197.5/50 966.5/240 966.5/50' && conn?.qty === 4
      && ready.every((s) => s === 'cut');
    return { live, said: `the board's holes ${holes.join(' ')}, ${conn?.qty} connectors, RETURNs ${ready.join(' ')}` };
  },
};

const SRC = 'KIT_RECESS.lsp I4 (D29, D30) on KIT_WARDROBE_FULL: the owner\'s wardrobe of CASE F (1200 x 2150 x 300, '
  + 'the doors 25, the project\'s setbacks 10) before his recess 800 x 300 (ed 290), floor to ceiling, three internal '
  + 'drawers 200';

export const GOLDENS = [
  {
    file: 'golden-t85-a-both-in.json',
    F: 'T85 F2 (KIT_RECESS.lsp D29 a, D30)',
    source: `${SRC}; CASE G (a), both edges in: the band 210..990, the dividers 210 and 972, the drawers 440, the board `
      + `over them 1164 x 562 (its bump 192..972), RETURN-L and RETURN-R 290 x 1503 on it, two Cabineo 12 each (the `
      + `holes at x 197.5 and 966.5 of the board, y 240 and 50). ${OWNER_MOVE} ${OWNER_CABINEO}`,
    params: CASES.a,
  },
  {
    file: 'golden-t85-b-left-out.json',
    F: 'T85 F2 (KIT_RECESS.lsp D29 b, the SIDE)',
    source: `${SRC}; CASE G (b), the left edge 100 outside: the band 0..690, ONE divider at 672, BUL grown to 572 the `
      + `column's wall, the box 18..672, the L boards from BUL to 690, RETURN-R on the board, the fillers R1 R2 492 wide. `
      + OWNER_MOVE,
    params: CASES.b,
  },
  {
    file: 'golden-t85-c-left-15.json',
    F: 'T85 F2 (KIT_RECESS.lsp D29 b, the RETURN)',
    source: `${SRC}; CASE G (c), the left edge 15 inside: the band 25..805, the slot 7 under 30: the full-height `
      + `RETURN-L 290 x 2132 on the BOTTOM the column's wall, ONE divider at 787, the box 43..787, the dead pocket 18..25 `
      + `(#50), RETURN-L on Cabineo into the BOTTOM, RETURN-R into the board. ${OWNER_MOVE} ${OWNER_CABINEO}`,
    params: CASES.c,
  },
  {
    file: 'golden-t85-d-out.json',
    F: 'T85 F2 (KIT_RECESS.lsp D29 c, as the store leaves it)',
    source: `${SRC}; CASE G (d), out of the band: no extension; the store removed the three drawers and the two dividers `
      + `it made for them (the carcass's 187 under the ladder's 240): the bare wardrobe. ${OWNER_MOVE}`,
    params: CASES.d,
  },
  {
    file: 'golden-t85-e-558-out.json',
    F: 'T85 F2 (KIT_RECESS.lsp D29 c, held by the ladder)',
    source: `KIT_RECESS.lsp I4 CASE G (e): a wardrobe 1200 x 2150 x 558 whose recess column (the dividers 210 and 972, `
      + `three drawers 200) left the band: usable 445, the ladder's 440 in the carcass alone (D27), a plain column stack, `
      + `the dividers full height 540 x 2114, its own board Z2-PART 744 x 530. ${OWNER_MOVE}`,
    params: CASES.e,
  },
];

// Re-pinned knowingly, with his words: the 28.10 recess column's RETURNs gain their Cabineo pockets and holes.
export const REPINNED = [
  {
    file: 'fixtures/golden-recess-drawers.json',
    why: '30.10.2026 (T85 F2, KIT_RECESS.lsp D30, the RETURNs on Cabineo): *"1 - cabineo"* (the owner, 30.10.2026, '
      + '20:38). RETURN-L and RETURN-R (150 x 1503 on the board over the drawers) carry two Cabineo 12 each in their '
      + 'bottom end on the outside face (x 50 and 100 of their depth from the front end: the drill15 lobes and the '
      + 'flush recess), the board over the drawers the four dia 5 holes (x 97.5 and 866.5, y 100 and 50 of its frame), '
      + 'the RETURNs cut parts; the connectors and caps an order line; every other board, hole and row as it was. '
      + OWNER_CABINEO,
  },
];
