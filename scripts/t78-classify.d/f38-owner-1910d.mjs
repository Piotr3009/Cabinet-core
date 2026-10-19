/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// After T79 · the owner's eye-test of 19.10.2026, the afternoon (15:16 to 15:19), named here so the strict run says
// why. His words: *"sprawdz dokladnie ale wiem ze czasami cnc rysuje items jak 3 mm drills czy cos takiego czy litery
// poza elementami, czy mozesz sie upewnic na milion procent ze wszystkie elementy sa zamkniete?"*; *"side panele
// powinny byc wieksze o 20 mm, to samo z plinth, panele 20mm gora + dol + bok (nie przod, 0 to zawsze powinno byc
// ok)"*; *"analiza i koduj"*. Three laws, one fragment:
//   THE OFF-BOARD GUARD (src/engine/cnc/offBoardGuard.js, labelAnchor.js, Check #9 in the export gate): every entity of
//     every DXF asked whether it is on the board; what the probe found is fixed where it was wrong: the HOOD's hinge
//     ladder (cups off a 367 door), the labels on a cut-out or a window (anchors read off the outline), the BACK's side
//     column through a recess bite (KIT_RECESS.lsp recess-side-row amended);
//   THE SITE-TRIM ALLOWANCE (reference/lisp/KIT_SITE_TRIM.lsp, a NEW file; src/engine/siteTrim.js): an END panel and a
//     PLINTH are CUT 20 bigger on the edges a joiner scribes on site, the nominal kept beside the cut, the room
//     drawing the nominal;
//   THE EDGE NOTCH'S CLOSING BOARDS (KIT_NOTCH.lsp D22 amended): the corner notch's box law run the whole width, the
//     EDGE-STEP at a back edge, the EDGE-LID over a bottom edge, the EDGE-FLOOR under a top edge, no RETURN; the END
//     panel covers the STEP's end (edge-notch-end-cut, sb + ed);
//   THE CHANGES LIST CLOSES ITSELF (ui.messages.historyOpenMs, PRO only).
// The fossil kits untouched; the six hold byte for byte; four goldens re-pinned with his words.

import { computeCabinet } from '../../src/engine/cabinet.js';
import { defaultParamsFor } from '../../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../../src/engine/profile.js';
import { buildUnitDxfFiles } from '../../src/engine/cnc/dxf.js';
import { offBoardFindings } from '../../src/engine/cnc/offBoardGuard.js';
import { unitFindings } from '../../src/engine/cnc/exportGate.js';

const OWNER_TRIM = '*"side panele powinny byc wieksze o 20 mm, to samo z plinth, panele 20mm gora + dol + bok (nie przod, '
  + '0 to zawsze powinno byc ok)"* (19.10.2026)';
const OWNER_OFF = '*"czasami cnc rysuje items jak 3 mm drills czy cos takiego czy litery poza elementami, czy mozesz sie '
  + 'upewnic na milion procent ze wszystkie elementy sa zamkniete?"* (19.10.2026)';
const OWNER_EDGE = '*"2 cut dziala ale nie rozumiem dlaczego nie ma paneli plyt, w sensie jak tniemy pionowe to wszystko jest '
  + 'a jak poziome to nie ma, dlaczego?"*; *"tak, bez mockupu, identycznie jak pionowe"* (19.10.2026)';

const hasEnds = (p) => Array.isArray(p?.end_panels) && p.end_panels.length > 0;
const hasPlinth = (p) => p?.plinth === true;
const ext = (p) => p?.extension || null;
const biteOnSide = (p) => {
  const e = ext(p);
  if (!e) return false;
  const W = Number(p.width) || 0;
  const H = Number(p.height) || 0;
  const touchesSide = Number(e.x0) <= 0 || Number(e.x1) >= W;
  const fullHeight = Number(e.z0) <= 0 && Number(e.z1) >= H;
  return touchesSide && !fullHeight;
};

export const GATES = {
  siteTrim: {
    what: 'a unit that cuts an END panel (end_panels) or a PLINTH (plinth true): the board is cut siteTrim bigger on the '
      + 'edges a joiner scribes on site (KIT_SITE_TRIM.lsp section 1), its nominal kept in meta.oversize.nominal. A unit '
      + 'with neither reaches no changed line',
    opens: (p) => hasEnds(p) || hasPlinth(p),
  },
  hoodLadder: {
    what: 'a unit with a hood aperture (hood_aperture_mm > 0): its door is a SHORT door above the aperture and its hinge '
      + 'ladder is the low rule over the door\'s own height, lifted by the aperture. Every other kit keeps its ladder',
    opens: (p) => Number(p?.hood_aperture_mm) > 0,
  },
  edgeBox: {
    what: 'a unit with an edge notch (params.edgeNotch): its closing boards are cut (the EDGE-STEP at a back edge, the '
      + 'EDGE-LID over a bottom edge, the EDGE-FLOOR under a top edge) and an END panel beside it covers the STEP\'s end. '
      + 'A unit without an edge notch reaches no changed line',
    opens: (p) => Boolean(p?.edgeNotch && p.edgeNotch.edge),
  },
  recessWindow: {
    what: 'a recess extension whose band lies INSIDE the BACK (reaching no side, short of the full height: a window): its '
      + 'RECESS_WINDOW pocket is a cut-out, traced clockwise. A bite, a corner or a band over the whole height reaches no '
      + 'changed line',
    opens: (p) => {
      const e = ext(p);
      if (!e) return false;
      const W = Number(p.width) || 0;
      const H = Number(p.height) || 0;
      return Number(e.x0) > 0 && Number(e.x1) < W && (Number(e.z0) > 0 || Number(e.z1) < H);
    },
  },
  recessBite: {
    what: 'a recess extension whose band reaches a SIDE of the carcass short of the full height (a bite out of the BACK\'s '
      + 'side edge): drawBACK\'s side column on that edge runs on what the window leaves of it. A window inside the BACK, '
      + 'or a band over the whole height, reaches no changed line',
    opens: (p) => biteOnSide(p),
  },
};

export const LICENSED = {
  'src/engine/cabinet.js': {
    why: `Owner 19.10.2026 (the off-board probe): the HOOD's door is a SHORT door (ladderBase = the aperture where no stack `
      + 'or tower lifts it; the low hinge rule), its cups on the door. KIT_SITE_TRIM.lsp: applySiteTrim runs once after '
      + `endPanelsFollowSides, on END-PANEL and PLINTH panels only. KIT_NOTCH.lsp D22 amended: edgeNotchCarcass is handed `
      + `codes and makePanel for its closing boards. ${OWNER_OFF} ${OWNER_TRIM} ${OWNER_EDGE}`,
    gates: ['hoodLadder', 'siteTrim', 'edgeBox'],
  },
  'src/engine/profile.js': {
    why: `Owner 19.10.2026: autoParts.endPanel.siteTrim 20 and autoParts.plinth.siteTrim 20 (KIT_SITE_TRIM.lsp D1, PROPOSED, `
      + 'owner to confirm); ui.messages.historyOpenMs 10000 (the Changes list closes itself, PROPOSED), read by the PRO '
      + `history bar only. ${OWNER_TRIM}`,
    gates: ['siteTrim'],
  },
  'src/engine/messages.js': {
    why: 'Owner 19.10.2026: *"changes chat can we keep close, nawet jesli uzytkownik otworzy czy mozemy za jakis czas '
      + 'zamknac? bo za bardzo przeszkadza"*: historyOpenMs(profile), a reader of the profile number for the PRO history '
      + 'bar; no cut reads it.',
    gates: [],
  },
  'src/engine/notch.js': {
    why: `Owner 19.10.2026 (KIT_NOTCH.lsp D22 amended): edgeNotchBoxPlaces, edgeNotchStep, edgeNotchLid, edgeNotchFloor `
      + '(notchBoxPlaces run the whole width, no RETURN); edgeNotchCarcass cuts the boards as notchCarcass cuts its box '
      + '(role notch_box, plain rectangles, readiness geometry, fixing manual); edgeNotchEndCut on the STEP\'s back face '
      + `at a back edge (sb + ed, was sb + g + ed); notchVerdict's D8 passes the edge notch's own boards (the edge notch `
      + `is the one refused where the two meet, as D22 says). ${OWNER_EDGE}`,
    gates: ['edgeBox'],
  },
  'src/engine/extension.js': {
    why: `Owner 19.10.2026 (KIT_RECESS.lsp recess-side-row amended): the window's cut on the BACK's side edge is asked `
      + 'wherever the band reaches that side (a bite), notch or no notch; until tonight only on a notch\'s edge, so a '
      + 'plain recess to the right edge drilled drawBACK\'s right column into the bite. KIT_RECESS.lsp D9 amended: the '
      + 'RECESS_WINDOW pocket is a CUT-OUT (cutout true: traced clockwise in the DXF, T25 F1.2); until tonight it ran the '
      + `outline's way and the export gate's Check #9 said so in red on every recess with a window. ${OWNER_OFF}`,
    gates: ['recessBite', 'recessWindow'],
  },
  'src/engine/cnc/dxf.js': {
    why: `Owner 19.10.2026: the caption's and the note's anchors read off the OUTLINE (cnc/labelAnchor.js) and moved onto `
      + 'the board when the rectangle\'s middle is a window or a cut-out; the note sized in the outline\'s own box (a '
      + 'dishwasher plinth\'s strip) and its block lifted onto the board. A rectangle\'s file is byte for byte what it '
      + `was. ${OWNER_OFF}`,
    gates: [],
  },
  'src/engine/cnc/exportGate.js': {
    why: `Owner 19.10.2026: unitFindings asks offBoardGateFindings (Check #9's family, red) of every panel's own DXF `
      + `entities: an outline not closed, a hole, a text or a mark off the board. Findings only; no cut moves. ${OWNER_OFF}`,
    gates: [],
  },
  'src/engine/cnc/partLabel.js': {
    why: `Owner 19.10.2026 (KIT_SITE_TRIM.lsp D4): the OVERSIZE note names its edges (BACK/TOP/BOTTOM, ALL EDGES) and a `
      + `nominal of two sizes (NOM 596 x 870); the filler's one-edge note prints as it did. ${OWNER_TRIM}`,
    gates: ['siteTrim'],
  },
  'src/engine/siteTrim.js': {
    why: `Owner 19.10.2026: NEW, KIT_SITE_TRIM.lsp's mirror routine for routine (growOutline, grownSize, endPanelTrimEdges, `
      + 'plinthTrimEdges, plinthOpenEnds, growNotchRecord, growPanel, applySiteTrim, sceneBoard): the END panel and the '
      + `PLINTH grown by their edges, the nominal kept beside the cut. ${OWNER_TRIM}`,
    gates: ['siteTrim'],
  },
  'src/engine/cnc/offBoardGuard.js': {
    why: `Owner 19.10.2026: NEW, the off-board guard: the DXF writer's own entities asked whether the outline is one `
      + 'closed loop and every hole, text, mark and pocket is on the board (entityFindings, offBoardFindings, '
      + `offBoardGateFindings). Rule 4: it speaks, it never fixes; no cut moves. ${OWNER_OFF}`,
    gates: [],
  },
  'src/engine/cnc/labelAnchor.js': {
    why: `Owner 19.10.2026: NEW, where a label stands: the caption at the OUTLINE's own middle and the note under its top `
      + 'edge, each moved onto the board (inside the outline, out of every through pocket, room for the text) when it '
      + `is not; a rectangle's anchors are what they were, so no existing file moves. ${OWNER_OFF}`,
    gates: [],
  },
  'src/3d/panelSolid.js': {
    why: `Owner 19.10.2026 (KIT_SITE_TRIM.lsp D4): the scene reads the NOMINAL board (sceneBoard) where a site-trim `
      + `allowance grew the cut, so no board stands 20 into the floor or the wall; every other panel as it was. ${OWNER_TRIM}`,
    gates: ['siteTrim'],
  },
};

export const LIVENESS = {
  // KIT_SITE_TRIM.lsp section 4: KIT_BUD_FULL 600 x 770 with END-L 25 to the floor and a plinth: END-L 596 x 870 ->
  // 616 x 910 (edges R T B), PLINTH 600 x 100 -> 640 x 140 (all four), the boxes the nominal, the labels say so.
  siteTrim: () => {
    const r = computeCabinet({
      ...defaultParamsFor('BUD', P), unit_num: '01', front_t: 25, plinth: true,
      end_panels: [{ id: 'ep-l', side: 'L', height: 'floor', thickness: 25 }],
    }, P);
    const ep = r.panels.find((p) => p.id === 'END-L');
    const pl = r.panels.find((p) => p.id === 'PLINTH');
    const live = ep && pl && ep.w === 616 && ep.h === 910 && ep.box.d === 596 && ep.box.h === 870
      && ep.meta.oversize?.mm === 20 && ep.meta.oversize.frame.join('') === 'RTB' && ep.meta.oversize.nominal.w === 596
      && pl.w === 640 && pl.h === 140 && pl.box.w === 600 && pl.box.h === 100 && pl.meta.oversize?.frame.join('') === 'LRTB';
    return {
      live: Boolean(live),
      said: `END-L ${ep?.w} x ${ep?.h} (box ${ep?.box?.d} x ${ep?.box?.h}, ${JSON.stringify(ep?.meta?.oversize?.frame)}); `
        + `PLINTH ${pl?.w} x ${pl?.h} (box ${pl?.box?.w} x ${pl?.box?.h}, ${JSON.stringify(pl?.meta?.oversize?.frame)})`,
    };
  },
  // WUD_HOOD at its defaults: the 367 door's cups at 100 and 267 on the door (450 and 617 in the carcass), every one of
  // them on the board; before tonight 420 and 620 on a 367 board.
  hoodLadder: () => {
    const r = computeCabinet({ ...defaultParamsFor('WUD_HOOD', P), unit_num: '01' }, P);
    const door = r.panels.find((p) => p.role === 'front');
    const cups = r.drills.filter((d) => d.panel === door?.id && d.kind === 'cup').map((d) => d.y).sort((a, b) => a - b);
    const files = buildUnitDxfFiles(r, P);
    const off = offBoardFindings(files, r);
    const live = door && door.h === 367 && cups.join(' ') === '100 267' && r.drillSummary.hinge_centers.join(' ') === '450 617' && off.length === 0;
    return { live: Boolean(live), said: `WUD_HOOD door ${door?.h}, cups at ${cups.join(' ')}, centres ${r.drillSummary.hinge_centers.join(' ')}, ${off.length} off-board finding(s)` };
  },
  // KIT_NOTCH.lsp I3 case A (BB 20 / 120) and B (TB 50 / 100) on KIT_BUD_FULL: the EDGE-STEP and the EDGE-LID / EDGE-FLOOR
  // where the NUMBERS put them; a front edge (BF) cuts a LID and no STEP; an END beside BB is cut 30 (sb + ed), not 48.
  edgeBox: () => {
    const kit = (extra) => computeCabinet({ ...defaultParamsFor('BUD', P), unit_num: '01', shelves: 1, front_t: 25, hinge: 'L', ...extra }, P);
    const bb = kit({ edgeNotch: { edge: 'BB', d: 20, h: 120 } });
    const tb = kit({ edgeNotch: { edge: 'TB', d: 50, h: 100 } });
    const bf = kit({ edgeNotch: { edge: 'BF', d: 20, h: 120 } });
    const ends = kit({ edgeNotch: { edge: 'BB', d: 20, h: 120 }, end_panels: [{ id: 'ep-l', side: 'L', height: 'floor', thickness: 25 }] });
    const box = (r, id) => { const p = r.panels.find((x) => x.id === id); return p ? `${p.w}x${p.h}@${p.box.x},${p.box.y},${p.box.z}` : 'none'; };
    const said = `BB: STEP ${box(bb, 'EDGE-STEP')} LID ${box(bb, 'EDGE-LID')}; TB: STEP ${box(tb, 'EDGE-STEP')} FLOOR ${box(tb, 'EDGE-FLOOR')}; `
      + `BF: STEP ${box(bf, 'EDGE-STEP')} LID ${box(bf, 'EDGE-LID')}; END-L beside BB: corner ${JSON.stringify(ends.panels.find((x) => x.id === 'END-L')?.meta?.oversize?.nominal?.cnc?.notch)}`;
    const live = box(bb, 'EDGE-STEP') === '600x120@0,0,20' && box(bb, 'EDGE-LID') === '564x20@18,120,18'
      && box(tb, 'EDGE-STEP') === '600x100@0,670,50' && box(tb, 'EDGE-FLOOR') === '564x50@18,652,18'
      && box(bf, 'EDGE-STEP') === 'none' && box(bf, 'EDGE-LID') === '564x20@18,120,538'
      && ends.panels.find((x) => x.id === 'END-L')?.meta?.oversize?.nominal?.cnc?.notch?.nw === 30;
    return { live, said };
  },
  // KIT_RECESS.lsp CASE B (the band 110..490 x 210..590 inside the BACK): the window pocket is a cut-out and the export
  // gate's Check #9 has nothing to say of the BACK (it said "wrong-winding" until tonight).
  recessWindow: () => {
    const r = computeCabinet({
      ...defaultParamsFor('BUD', P), unit_num: '01', shelves: 1, extension: { x0: 110, x1: 490, z0: 210, z1: 590, d: 150 },
    }, P);
    const back = r.panels.find((p) => p.id === 'BACK');
    const win = (back?.cnc?.pockets || []).filter((k) => k.layer === 'RECESS_WINDOW');
    const gate = unitFindings(r, { profile: P }).filter((f) => f.panel === 'BACK');
    const live = win.length === 1 && win[0].cutout === true && gate.length === 0;
    return { live, said: `BACK window ${JSON.stringify(win)}; ${gate.length} gate finding(s) on the BACK` };
  },
  // KIT_BUD_FULL with the band 310..600 x 210..590, 150 deep (a bite out of the BACK's right edge): the right column
  // x 591 is 50, 178 under the bite and 622, 720 over it; before tonight 50, 392.5 (in the bite), 720.
  recessBite: () => {
    const r = computeCabinet({
      ...defaultParamsFor('BUD', P), unit_num: '01', shelves: 1, extension: { x0: 310, x1: 600, z0: 210, z1: 590, d: 150 },
    }, P);
    const col = r.drills.filter((d) => d.panel === 'BACK' && d.layer === 'SCREWS_3MM' && d.x === 591).map((d) => d.y).sort((a, b) => a - b);
    const off = offBoardFindings(buildUnitDxfFiles(r, P), r);
    const live = col.join(' ') === '50 178 622 720' && off.length === 0;
    return { live, said: `BACK x 591: ${col.join(' ')}; ${off.length} off-board finding(s)` };
  },
};

export const GOLDENS = [];

// Re-pinned knowingly, with his words: three goldens move under the site-trim law, one under the hood's ladder.
export const REPINNED = [
  {
    file: 'fixtures/golden-hood-short.json',
    why: `19.10.2026 (the off-board probe): the HOOD's door is a SHORT door above its aperture, its ladder the low rule over `
      + 'its own height lifted by the aperture; the cups stood off the 367 door (420, 620). FRONT_HINGES_35MM|01-F 3 -> 2, '
      + `FRONT_HINGES_3MM 6 -> 4, hinges 3 -> 2. ${OWNER_OFF}`,
  },
  {
    file: 'fixtures/golden-notch-end-panel.json',
    why: `19.10.2026 (KIT_SITE_TRIM.lsp): END-L CUT 20 bigger on its top, bottom and back (596 x 870 -> 616 x 910, the `
      + `corner 230 x 420 from the new edges, edging 2.93 -> 3.05, area 0.435 -> 0.464); the nominal kept beside it. ${OWNER_TRIM}`,
  },
  {
    file: 'fixtures/golden-recess-end-panel.json',
    why: `19.10.2026: END-R CUT 20 bigger on its top, bottom and back (746 x 870 -> 766 x 910, edging 3.23 -> 3.35, area `
      + `0.576 -> 0.607), ${OWNER_TRIM}; and KIT_RECESS.lsp recess-side-row amended: the BACK's right column keeps off the `
      + `bite (x 591: 50, 392.5, 720 -> 50, 178, 622, 720; SCREWS_3MM|BACK 13 -> 14), ${OWNER_OFF}`,
  },
  {
    file: 'fixtures/golden-edge-notch-bb.json',
    why: `19.10.2026 (KIT_NOTCH.lsp D22 amended): two closing boards added, EDGE-STEP 600 x 120 (plan y 520..538, z 0..120) `
      + `and EDGE-LID 564 x 20 (z 120..138); no joint, no hole; every other board untouched. ${OWNER_EDGE}`,
  },
  {
    file: 'fixtures/golden-edge-notch-tb.json',
    why: `19.10.2026 (KIT_NOTCH.lsp D22 amended): two closing boards added, EDGE-STEP 600 x 100 (plan y 490..508, z `
      + `670..770) and EDGE-FLOOR 564 x 50 (z 652..670); every other board untouched. ${OWNER_EDGE}`,
  },
  {
    file: 'fixtures/golden-corner-l-base.json',
    why: `19.10.2026 (KIT_SITE_TRIM.lsp D3): the L's two plinths CUT 20 bigger on the far end, the top and the bottom (the `
      + `butt at the inner corner square): PLINTH-A 410 x 100 -> 430 x 140, PLINTH-B 392 x 100 -> 412 x 140. ${OWNER_TRIM}`,
  },
];

export const LISP = {
  'reference/lisp/KIT_NOTCH.lsp': `Owner 19.10.2026: D22 AMENDED (the closing boards: STEP at a back edge, LID over a bottom `
    + 'edge, FLOOR under a top edge, no RETURN, no screw), D23 (the END covers the EDGE-STEP\'s end, sb + ed), H2 gains '
    + 'edge-notch-box-places, edge-notch-step, edge-notch-lid, edge-notch-floor, edge-notch-end-cut amended, NUMBERS I3 '
    + `carries the boards and I4 cases F, G, H the END's new numbers (30 and 60 for 48 and 78). ${OWNER_EDGE}`,
  'reference/lisp/KIT_RECESS.lsp': `Owner 19.10.2026: recess-side-row AMENDED. ${OWNER_OFF} The window's cut on a piece's `
    + 'side edge is asked wherever the band reaches that side (bandSide), notch or no notch; (and onSide bandSide) was '
    + 'the 18.10 reading and it drilled drawBACK\'s right column into a bite (golden-recess-end-panel, x 591, z 392.5). '
    + 'D9 AMENDED: the window is a cut-out, its polyline CLOCKWISE (the drawing routine turned round). Nothing else in '
    + 'the file moves.',
};
