/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// ─── CHAT FIX 19.10.2026 · THE PROBE: WHAT A DXF DRAWS OFF ITS BOARD ─────────
//
// The owner, 19.10.2026: *"czasami cnc rysuje items jak 3 mm drills czy cos
// takiego czy litery poza elementami, czy mozesz sie upewnic na milion procent
// ze wszystkie elementy sa zamkniete?"*  Diagnose before you cut: every kit at
// its defaults and the cut geometries of T75 to T79 (notch, edge notch,
// recess, both, end panels, plinth, drawers, doors) go through the real DXF
// writer, and every entity of every file is asked: is the OUTLINE closed; is
// every circle (a hole) wholly inside the outline and out of every through
// pocket; is every TEXT's insertion point on the board; is every open
// polyline (a mark, the EDGE arrow) on the board. The rows are the finding.
//
//   node scripts/chatfix-1910-offboard-probe.mjs
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor, UNIT_TYPE_ORDER } from '../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { buildUnitDxfFiles } from '../src/engine/cnc/dxf.js';
import { offBoardFindings } from '../src/engine/cnc/offBoardGuard.js';

const kit = (type, extra = {}) => ({ ...defaultParamsFor(type, P), unit_num: '01', ...extra });
const types = UNIT_TYPE_ORDER;
const cases = [];
for (const t of types) cases.push([t, kit(t)]);
const BUD = kit('BUD', { shelves: 1, front_t: 25, hinge: 'L' });
cases.push(['BUD notch BL full', { ...BUD, notch: { corner: 'BL', w: 200, d: 200, h: 0 } }]);
cases.push(['BUD notch BL 300', { ...BUD, notch: { corner: 'BL', w: 200, d: 200, h: 300 } }]);
cases.push(['BUD notch BL -300', { ...BUD, notch: { corner: 'BL', w: 200, d: 200, h: -300 } }]);
cases.push(['BUD notch FR 300', { ...BUD, notch: { corner: 'FR', w: 200, d: 200, h: 300 } }]);
for (const edge of ['TB', 'BB', 'TF', 'BF']) cases.push([`BUD edge ${edge}`, { ...BUD, edgeNotch: { edge, d: 20, h: 120 } }]);
cases.push(['BUD recess A', { ...BUD, extension: { x0: 310, x1: 600, z0: 0, z1: 770, d: 150 } }]);
cases.push(['BUD recess B', { ...BUD, extension: { x0: 110, x1: 490, z0: 210, z1: 590, d: 150 } }]);
cases.push(['BUD notch + recess', { ...BUD, notch: { corner: 'BL', w: 200, d: 200, h: 0 }, extension: { x0: 310, x1: 600, z0: 0, z1: 770, d: 150 } }]);
cases.push(['BUD end panels', { ...BUD, end_panels: [{ side: 'L', height: 'floor' }, { side: 'R', height: 'floor' }] }]);
cases.push(['BUD end panels + notch', { ...BUD, notch: { corner: 'BL', w: 200, d: 200, h: 300 }, end_panels: [{ side: 'L', height: 'floor' }] }]);
cases.push(['BUD end panels + edge BB', { ...BUD, edgeNotch: { edge: 'BB', d: 20, h: 120 }, end_panels: [{ side: 'L', height: 'floor' }, { side: 'R', height: 'floor' }] }]);
cases.push(['WARDROBE shelves + drawers', kit('WARDROBE', { sections: [{ width_mm: 600, items: [{ id: 's1', kind: 'shelf', pos_mm: 1200 }, { id: 'd1', kind: 'drawer', height_mm: 200, mount: 'overlay' }, { id: 'd2', kind: 'drawer', height_mm: 200, mount: 'overlay' }, { id: 'h1', kind: 'hanger', pos_mm: 1400, datum: 'bottom', mount: 'alone' }] }] })]);
cases.push(['WARDROBE 1200 divider', kit('WARDROBE', { width: 1200, sections: [{ width_mm: 1200, items: [{ id: 'p1', kind: 'partition', x_mm: 600 }, { id: 's1', kind: 'shelf', pos_mm: 900, zone: 0 }] }] })]);
cases.push(['BUDR', kit('BUDR')]);
cases.push(['WUD', kit('WUD')]);

const rows = [];
let files = 0;
for (const [name, params] of cases) {
  let r;
  try { r = computeCabinet(params, P); } catch (e) { rows.push([name, '*', 'THROWS', String(e.message).slice(0, 80)]); continue; }
  let dxf;
  try { dxf = buildUnitDxfFiles(r, P); } catch (e) { rows.push([name, '*', 'DXF THROWS', String(e.message).slice(0, 80)]); continue; }
  files += dxf.length;
  for (const f of offBoardFindings(dxf, r, { profile: P })) rows.push([name, f.panel, f.code, f.message]);
}
console.log(`${cases.length} cabinets, ${files} DXF files, ${rows.length} finding(s)\n`);
const byCode = {};
for (const [, , code] of rows) byCode[code] = (byCode[code] || 0) + 1;
console.log(JSON.stringify(byCode));
for (const row of rows) console.log(row.join(' | '));
