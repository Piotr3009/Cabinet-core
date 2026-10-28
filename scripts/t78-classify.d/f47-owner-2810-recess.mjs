/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// After T84 . the owner's chat fix of 28.10.2026, the evening (19:29 to 19:47), named here so the strict run says why.
// His words: *"szafa ma 1000 mm a wneka 800, to po prawej i po lewej szafa jest o 100 mm plytka a reszta gleboka, i co
// ja potrzebuje to ustawic szuflady tylko w tej wnece i odsunac diverted po lewej i po prawej rowno z wneka, zeby
// zamontowac szuflady"*; the mockups, *"dokladnie tak"* and *"dokladnie o to mi chodzi"*; *"plecy ... w zwiazku ze to
// jest w ksztalcie U to ja nie moge puscic tego na edge bander ... musimy pomniejszyc o 1 mm plecy"*; *"dokladnie,
// mozesz zakodowac prosze"*, *"szuflady tez prosze"*. LISP first (KIT_RECESS.lsp D22 to D25, section I; KIT_NOTCH.lsp's
// table carries recess.handEdge). Five laws, one fragment:
//   THE DRAWERS IN THE RECESS (D22): a column of drawers between two dividers standing on the band's edges goes INTO the
//     recess: the dividers grow to the EXT-BACK and stop under ONE board over the drawers (BUL to BUR, its bump end to
//     end, its corners marked), the drawers take the depth plus ed, the RETURNs stand on that board through the BACK's
//     plane, the BOTTOM grows between the band's outer faces, the slots are closed by fillers on the DP's lines; any
//     other column the band reaches keeps the carcass's depth and the Check says why (#49, yellow);
//   THE HAND EDGE (D23): a cut inside the BACK (a U, a window, an L) is cut 1 bigger on its own edges;
//   THE BOARD OVER THE DRAWERS 10 (D24): wardrobe.drawers.capSetbackMm 20 -> 10 (the project's number);
//   THE BACK'S HOLES FOLLOW ITS PIECES (D25): a hole the drilling pass puts into a recess-cut BACK lands on the piece it
//     falls on (BACK, BACK-2), none in the window;
//   THE DIVIDER'S RUNNER ROW (the probe of the same evening): measured from the divider's own front edge, its left face
//     as BUL, its right face turned over as BUR (T82 F9's law); until then mirrored front to back.
// The fossil kits untouched; the six hold byte for byte; one golden re-pinned with his words, one new golden.

import { computeCabinet } from '../../src/engine/cabinet.js';
import { defaultParamsFor } from '../../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../../src/engine/profile.js';
import { recessBackCut, recessBackPieces, recessWindow } from '../../src/engine/extension.js';

const OWNER_DRAWERS = '*"szafa ma 1000 mm a wneka 800, to po prawej i po lewej szafa jest o 100 mm plytka a reszta '
  + 'gleboka, i co ja potrzebuje to ustawic szuflady tylko w tej wnece i odsunac diverted po lewej i po prawej rowno z '
  + 'wneka, zeby zamontowac szuflady"*; *"dokladnie o to mi chodzi"*; *"szuflady tez prosze"* (28.10.2026)';
const OWNER_EDGE = '*"w zwiazku ze to jest w ksztalcie U to ja nie moge puscic tego na edge bander, wiec nie zrobie '
  + 'scribe na edging, wiec w tym miejscu musimy pomniejszyc o 1 mm plecy"*; *"dokladnie, mozesz zakodowac prosze"* '
  + '(28.10.2026)';
const OWNER_CAP = '*"wszystkie polki teraz sa 10 mm, to polke nad szufladami tez zrob 10 mm jak reszta"* (28.10.2026)';

const ext = (p) => (p?.extension && typeof p.extension === 'object' ? p.extension : null);
const itemsOf = (p) => [
  ...(Array.isArray(p?.items) ? p.items : []),
  ...(Array.isArray(p?.sections?.[0]?.items) ? p.sections[0].items : []),
];
const zonedDrawers = (p) => itemsOf(p).some((i) => i?.kind === 'drawer' && i.zone != null && Number.isFinite(Number(i.zone)));
const dividers = (p) => itemsOf(p).filter((i) => i?.kind === 'partition');
const kit = (type, extra = {}) => ({ ...defaultParamsFor(type, P), unit_num: '01', ...extra });
const PROJECT = { shelf_front_mm: 10, interior_setback_mm: 10, drawer_cap_setback_mm: 10 };
const drawer = (index) => ({ id: `d${index + 1}`, kind: 'drawer', zone: 1, index, height_mm: 200, mount: 'internal' });
const CASE_E = (z1 = 2150, xs = [110, 872]) => kit('WARDROBE', {
  width: 1000,
  ...PROJECT,
  extension: { x0: 110, x1: 890, z0: 0, z1, d: 150 },
  items: [{ id: 'p1', kind: 'partition', x_mm: xs[0] }, { id: 'p2', kind: 'partition', x_mm: xs[1] }, drawer(0), drawer(1), drawer(2)],
});

export const GATES = {
  recessDrawersColumn: {
    what: 'a recess extension on a unit with a column of drawers (drawer items in a zone): the recess column plan runs '
      + '(KIT_RECESS.lsp D22): between two dividers on the band\'s edges the column goes into the recess; any other '
      + 'column the band reaches gets #49 in words. A unit with no extension or no zoned drawer reaches no changed line',
    opens: (p) => Boolean(ext(p)) && zonedDrawers(p),
  },
  recessHandEdge: {
    what: 'a recess extension whose BACK keeps a cut inside a piece (a window, a bite, a corner): the cut is 1 bigger on '
      + 'its own edges (KIT_RECESS.lsp D23). A band that cuts the BACK into whole pieces (two strips, a shorter back) '
      + 'reaches no changed line',
    opens: (p) => {
      const e = ext(p);
      if (!e) return false;
      const W = Number(p.width) || 0;
      const H = Number(p.height) || 0;
      const G = Number(p.board_t) || 18;
      const window = recessWindow(W, H, G, Number(e.x0), Number(e.x1), Number(e.z0), Number(e.z1));
      return recessBackPieces(W, H, G, Number(e.x0), Number(e.x1), Number(e.z0), Number(e.z1))
        .some((piece) => recessBackCut(piece, window) != null);
    },
  },
  recessBackHoles: {
    what: 'a recess extension on a unit whose drilling pass may put a hole into the BACK (shelves, drawers or dividers): '
      + 'the hole lands on the piece it falls on, none in the window (KIT_RECESS.lsp D25). A unit with no extension, or '
      + 'one whose pass drills nothing into the BACK, reaches no changed line',
    opens: (p) => Boolean(ext(p)) && (Number(p.shelves) > 0 || Number(p.drawers) > 0
      || itemsOf(p).some((i) => ['shelf', 'drawer', 'partition'].includes(i?.kind))),
  },
  dividerRunnerRow: {
    what: 'a column of drawers walled by a divider (a zoned drawer and a partition item): the divider\'s runner row is '
      + 'measured from its own front edge, its left face as BUL, its right face turned over as BUR (T82 F9). A unit with '
      + 'no zoned drawer beside a divider reaches no changed line',
    opens: (p) => zonedDrawers(p) && dividers(p).length > 0,
  },
};

export const LICENSED = {
  'src/engine/extension.js': {
    why: `Owner 28.10.2026 (KIT_RECESS.lsp D22, D23, D25, section I): recessWindowPieces (the law of the pieces for any `
      + 'window), recessBackJoints\' runs end at the WINDOW\'s edges (ix0 and ix1 for every band before tonight), the '
      + 'recess column\'s routines (recessColRefusal, recessColWindow, recessColBackPieces, recessColPlanBump, '
      + 'recessColBottomOutline, recessColTopJoints, recessColBoxPlaces, recessColReturn, recessColDivider, '
      + 'recessColCapBump, recessColCapOutline, recessColDrawerDepth, recessColFillers), recessHandCut, recessPieceAt; '
      + 'extensionCarcass takes `column` and cuts the back\'s cut 1 bigger on its own edges, records its pieces for D25; '
      + `extensionSummary names the column. ${OWNER_DRAWERS} ${OWNER_EDGE}`,
    gates: ['recessDrawersColumn', 'recessHandEdge', 'recessBackHoles'],
  },
  'src/engine/cabinet.js': {
    why: `Owner 28.10.2026: the recess column planned before the dividers (recessColumn: the column's drawers on the `
      + 'ladder plus ed, the columns\' one board over it, the dividers stopping under it; RECESS_DRAWERS_SHALLOW in words '
      + 'otherwise), the slots\' fillers (recessColFillers), `column` handed to extensionCarcass; every hole the drilling '
      + 'pass puts into the BACK through backHole (D25: exactly the old call with no recess cut); a divider\'s runner row '
      + `from its own front edge (T82 F9's law), mirrored front to back until tonight. ${OWNER_DRAWERS}`,
    gates: ['recessDrawersColumn', 'recessBackHoles', 'dividerRunnerRow'],
  },
  'src/engine/notch.js': {
    why: `Owner 28.10.2026 (KIT_RECESS.lsp D23): notchProfile carries 'recess.handEdge' (profile.recess.handEdgeMm, 1), `
      + `as KIT_NOTCH.lsp's notch-profile does. ${OWNER_EDGE}`,
    gates: ['recessHandEdge'],
  },
  'src/engine/profile.js': {
    why: `Owner 28.10.2026: recess.handEdgeMm 1 (D23, ${OWNER_EDGE}); wardrobe.drawers.capSetbackMm 20 -> 10 and rebuilt `
      + `from code on migration (D24, ${OWNER_CAP}): a project number (paramsForEngine), a bare kit call reads none of it.`,
    gates: ['recessHandEdge'],
  },
  'src/engine/checks.js': {
    why: `Owner 28.10.2026 (KIT_RECESS.lsp D22): #49, yellow, the drawers in front of a recess that keep the carcass's `
      + `depth, read off the engine's own RECESS_DRAWERS_SHALLOW. Findings only; no cut moves. ${OWNER_DRAWERS}`,
    gates: ['recessDrawersColumn'],
  },
};

export const LIVENESS = {
  // KIT_RECESS.lsp CASE E: the dividers 690 deep under the board over the drawers (964 x 690 at y 629), the drawers 590,
  // four fillers 92 x 611, RETURN-L 150 x 1503 on the board; the dividers 10 off the edges: #49's sentence, 440.
  recessDrawersColumn: () => {
    const r = computeCabinet(CASE_E(), P);
    const off = computeCabinet(CASE_E(2150, [100, 880]), P);
    const box = (res, id) => { const p = res.panels.find((x) => x.id === id); return p ? `${p.w}x${p.h}` : 'none'; };
    const fillers = r.panels.filter((p) => p.part === 'FILLER' && p.meta?.slot).length;
    const dl = (res) => res.panels.find((p) => p.id === 'Z2D1-SL')?.w;
    const warned = off.warnings.some((w) => w.code === 'RECESS_DRAWERS_SHALLOW');
    const live = box(r, 'VPART-1') === '611x690' && box(r, 'PARTITION') === '964x690' && dl(r) === 590 && fillers === 4
      && box(r, 'RETURN-L') === '150x1503' && r.warnings.length === 0 && warned && dl(off) === 440;
    return {
      live,
      said: `VPART-1 ${box(r, 'VPART-1')}, the board ${box(r, 'PARTITION')}, drawers ${dl(r)}, ${fillers} fillers, RETURN-L `
        + `${box(r, 'RETURN-L')}; off the edges: ${warned ? '#49' : 'silent'}, drawers ${dl(off)}`,
    };
  },
  // KIT_RECESS.lsp CASE B: the window cut 127..473 x 227..573 (128..472 x 228..572 until tonight).
  recessHandEdge: () => {
    const r = computeCabinet(kit('BUD', { shelves: 1, extension: { x0: 110, x1: 490, z0: 210, z1: 590, d: 150 } }), P);
    const win = (r.panels.find((p) => p.id === 'BACK')?.cnc?.pockets || []).filter((k) => k.layer === 'RECESS_WINDOW');
    const live = win.length === 1 && win[0].x1 === 127 && win[0].y1 === 227 && win[0].x2 === 473 && win[0].y2 === 573;
    return { live, said: `BACK window ${JSON.stringify(win)}` };
  },
  // A full-width stack in front of a band floor to ceiling (WARDROBE 1000, band 100..900): the board's three into the
  // BACK at 68 (BACK), 500 (the window: none) and 932 (BACK-2 at 50); until tonight 68, 500, 932 all on BACK (118 wide).
  recessBackHoles: () => {
    const r = computeCabinet(kit('WARDROBE', {
      width: 1000, ...PROJECT, extension: { x0: 100, x1: 900, z0: 0, z1: 2150, d: 150 },
      items: [{ id: 'd1', kind: 'drawer', index: 0, mount: 'internal' }, { id: 'd2', kind: 'drawer', index: 1, mount: 'internal' }],
    }), P);
    const holes = r.drills.filter((d) => d.kind === 'partition_screw' && /^BACK/.test(d.panel)).map((d) => `${d.panel}:${d.x}`);
    const live = holes.join(' ') === 'BACK:68 BACK-2:50';
    return { live, said: `the board's back holes: ${holes.join(' ')}` };
  },
  // Column 1 beside VPART-1 at the face (WARDROBE 1200): VPART-1's left face carries 112 144 368 (the runner's own 37
  // 69 293 behind the box setback 75); until tonight 408 376 152.
  dividerRunnerRow: () => {
    const r = computeCabinet(kit('WARDROBE', {
      width: 1200, depth: 558, ...PROJECT,
      items: [{ id: 'p1', kind: 'partition', x_mm: 591, front_mm: 0 },
        { id: 'd1', kind: 'drawer', zone: 0, index: 0, height_mm: 200, mount: 'internal' }],
    }), P);
    const xs = [...new Set(r.drills.filter((d) => d.panel === 'VPART-1' && d.kind === 'runner').map((d) => d.x))];
    const live = xs.join(' ') === '112 144 368';
    return { live, said: `VPART-1 runner x ${xs.join(' ')}` };
  },
};

// KIT_RECESS.lsp CASE E, cut through computeCabinet: the golden of the recess column.
export const GOLDENS = [
  {
    file: 'golden-recess-drawers.json',
    F: 'chat fix 28.10.2026 (KIT_RECESS.lsp D22)',
    source: 'KIT_RECESS.lsp CASE E (section I2) on KIT_WARDROBE_FULL 1000 wide: the owner\'s recess 800 (the band '
      + '110..890 floor to ceiling, 150 deep, clearance 10), dividers at 110 and 872, three internal drawers 200 in the '
      + 'column between them, the project\'s setbacks 10. VPART-1 and VPART-2 690 x 611 to the EXT-BACK, the board over '
      + 'the drawers 964 x 690 (its bump 92..872), the drawers 590, RETURN-L and RETURN-R 150 x 1503 on the board, the '
      + `BOTTOM's bump 92..872, BACK and BACK-2 110 wide, four fillers 92 x 611. ${OWNER_DRAWERS}`,
    params: () => CASE_E(),
  },
];

// Re-pinned knowingly, with his words: CASE B's window, cut 1 bigger on its four edges.
export const REPINNED = [
  {
    file: 'fixtures/golden-recess-band.json',
    why: '28.10.2026 (KIT_RECESS.lsp D23, the hand edge): the BACK\'s window is CUT 1 bigger on each of its four edges '
      + '(127..473 x 227..573; 128..472 x 228..572 until that evening), the BACK\'s area 0.344 -> 0.342; every other '
      + `board, hole and row as it was. ${OWNER_EDGE}`,
  },
];

export const LISP = {
  'reference/lisp/KIT_RECESS.lsp': `Owner 28.10.2026: D22 THE DRAWERS IN THE RECESS, D23 THE HAND EDGE, D24 THE BOARD `
    + 'OVER THE DRAWERS STANDS BACK 10, D25 THE BACK\'S HOLES FOLLOW ITS PIECES; section I (recess-col-refusal to '
    + 'recess-piece-at) and its NUMBERS I2 (CASE E, E2, E3, a corner); recess-window-pieces (the law of the pieces for '
    + 'any window); recess-back-joints\' runs end at the window\'s edges; CASE B\'s and F2 CASE D\'s back cut 1 bigger; '
    + `RECESS_FULL draws the cut as the cutter takes it. ${OWNER_DRAWERS} ${OWNER_EDGE}`,
  'reference/lisp/KIT_NOTCH.lsp': `Owner 28.10.2026 (KIT_RECESS.lsp D23): notch-profile carries "recess.handEdge" 1.0, `
    + `the table KIT_RECESS.lsp reads. ${OWNER_EDGE}`,
};
