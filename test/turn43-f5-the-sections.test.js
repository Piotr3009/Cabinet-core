// ─── TURN 43, F5: THE VERTICAL SECTIONS. BOTH. ──────────────────────────────
//
// The owner, 20.08.2026: *"Nie widzę przekroju w pionie ani w poziomie."* And
// on the sections, twice now: BOTH — a section sheet per wall AND an A-A
// through a chosen cabinet.
//
// ─── WHAT WAS MEASURED ──────────────────────────────────────────────────────
//
// The HORIZONTAL section exists and renders — it is the set's last sheet
// (`buildHorizontalSection`, turn 40), and the first assertion below checks it
// on HIS kind of project rather than on a bare wall. The VERTICAL one did not
// exist at all: no builder anywhere under `src/engine/drawings/`. It was never
// written; it was not regressed.

import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { PEN, penWidth } from '../src/engine/drawings/layers.js';
import { wallGroups } from '../src/engine/drawings/wallElevation.js';
import {
  wallDrawingSheets, wallSectionUnits,
} from '../src/engine/drawings/wallSheets.js';
import {
  buildUnitSection, buildWallSection, cutCabinet, cutMembers, sectionStation,
} from '../src/engine/drawings/section.js';
import { sheetToDxf } from '../src/engine/drawings/dxf.js';
import { sheetToSvg } from '../src/engine/drawings/svg.js';
import { assertPdfBytes, bookletDoc, pdfBytes } from '../src/lib/drawingExport.js';
import { resolveUnitDesign } from '../src/engine/design.js';
import { slug } from '../src/engine/render.js';
import {
  T43_DESIGN, T43_PROJECT, T43_ROOM, t43Entries,
} from './fixtures/t43-kitchen.js';

const setOf = (extra = {}) => wallDrawingSheets({
  entries: t43Entries(P),
  project: T43_PROJECT,
  room: T43_ROOM,
  design: T43_DESIGN,
  frontTypeOf: (u) => resolveUnitDesign(u, T43_DESIGN).frontType,
  profile: P,
  format: 'A3',
  date: '20/08/2026',
  ...extra,
});

const groups = () => wallGroups(t43Entries(P), P);

// ═══ THE SHEET LIST ════════════════════════════════════════════════════════

test('F5 — the set is exactly the seven sheets CLAUDE.md names', () => {
  assert.deepEqual(setOf().map((s) => s.name), [
    'Wall A /1', 'Wall A /2', 'Wall A /3',
    'Wall B /1', 'Wall B /2', 'Wall B /3',
    'Horizontal section',
  ]);
});

test('F5 — …and the horizontal section really does render on HIS kind of project', () => {
  // T42's own census note: the sheet exists, but nobody had looked at it on a
  // project with shelves, drawers and a turned cabinet on it.
  const plan = setOf().find((s) => s.variant === 'section');
  assert.ok(plan, 'the sheet is in the set');
  const svg = sheetToSvg(plan.sheet, { kind: 'plan' });
  assert.match(svg, /data-cc-drawing="plan"/);
  // Every cabinet in the job, TURNED ONES INCLUDED, is on the plan — which is
  // the whole reason the elevations are allowed to leave one off.
  for (const e of t43Entries(P)) {
    assert.ok(svg.includes(`>${e.unit.params.unit_num}<`), `unit ${e.unit.params.unit_num} is on the plan`);
  }
});

// ═══ F5a — THE WALL'S OWN SECTION ══════════════════════════════════════════

test('F5a — the station is the centreline of the LEFTMOST FLOOR-BAND member', () => {
  const wallA = groups().find((g) => g.wall === 0);
  const at = sectionStation(wallA);
  // Done in the test, from the fixture's own numbers: BUD 01 is 600 wide at 0.
  assert.equal(at.x, 300);
  assert.equal(at.member.unit.params.unit_num, '01');
});

test('F5a — every member whose x-range contains the station is cut, and no other', () => {
  for (const group of groups()) {
    const at = sectionStation(group);
    const cut = cutMembers(group, at.x);
    // THE X-TEST, done here rather than taken on trust.
    const expected = group.members
      .filter((m) => at.x >= m.x - 0.5 && at.x <= m.x + m.width + 0.5)
      .map((m) => m.unit.params.unit_num)
      .sort();
    assert.deepEqual(cut.map((m) => m.unit.params.unit_num).sort(), expected);
    // A section is not a collage: a member that does not reach the station is
    // NOT on the sheet.
    for (const m of group.members) {
      const reaches = at.x >= m.x - 0.5 && at.x <= m.x + m.width + 0.5;
      if (reaches) continue;
      assert.ok(!cut.includes(m), `${m.unit.params.unit_num} does not reach ${at.x} and is omitted`);
    }
  }
  // On the proof kitchen that is a real omission and not a vacuous one: the
  // BUDR at 600 is left off wall A's section.
  const wallA = groups().find((g) => g.wall === 0);
  const names = cutMembers(wallA, sectionStation(wallA).x).map((m) => m.unit.params.unit_num);
  assert.deepEqual(names.sort(), ['01', '03']);
});

test('F5a — every CUT entity resolves to PEN.CUT, and the section is the only sheet with them', () => {
  for (const s of setOf()) {
    const cuts = s.sheet.entities.filter((e) => e.pen === 'CUT');
    for (const e of cuts) assert.equal(penWidth(e), PEN.CUT, `${s.name}: a cut is 0.70`);
    if (s.variant === 'section-v') assert.ok(cuts.length >= 4, `${s.name}: real cut geometry, not one line`);
    if (s.variant === 'fronts' || s.variant === 'carcass') {
      assert.equal(cuts.length, 0, `${s.name}: an elevation cuts nothing`);
    }
  }
});

test('F5a — the sheet says WHERE the knife went', () => {
  const three = setOf().find((s) => s.name === 'Wall A /3');
  const svg = sheetToSvg(three.sheet, { kind: 'section' });
  assert.match(svg, /section at unit 01/, 'the station, under the title');
  assert.match(svg, /Wall A \/3/, 'and the title block names the sheet');
});

test('F5a — the section is drawn from PUBLISHED panel boxes, in the ZY frame', () => {
  const wallA = groups().find((g) => g.wall === 0);
  const drawing = buildWallSection(wallA, { room: T43_ROOM, profile: P });
  const rects = drawing.entities.filter((e) => e.kind === 'rect');
  for (const m of cutMembers(wallA, sectionStation(wallA).x)) {
    for (const p of m.result.panels) {
      if (!p.box) continue;
      if (!['top', 'bottom', 'back', 'plinth', 'shelf'].includes(p.role)
        && p.part !== 'FRONT' && p.part !== 'DRAWER-FRONT') continue;
      const hit = rects.some((r) => Math.abs(r.x - p.box.z) < 1e-6
        && Math.abs(r.y - (m.base + p.box.y)) < 1e-6
        && Math.abs(r.w - p.box.d) < 1e-6
        && Math.abs(r.h - p.box.h) < 1e-6);
      assert.ok(hit, `${m.unit.params.unit_num} ${p.id} is on the section at z=${p.box.z}`);
    }
  }
  // The plinth RECESS, which is what a fitter reads off a section: the plinth
  // stands on the floor and is set back from the front by the engine's own
  // number, and the drawing says so rather than a comment saying so.
  const bud = cutMembers(wallA, 300).find((m) => m.unit.type === 'BUD');
  const plinth = bud.result.panels.find((p) => p.role === 'plinth');
  assert.ok(plinth, 'the proof kitchen\'s base units carry a plinth');
  const recess = bud.result.params.depth - (plinth.box.z + plinth.box.d);
  assert.ok(recess > 0, `there is a real recess to draw: ${recess} mm`);
  assert.ok(rects.some((r) => Math.abs(r.x - plinth.box.z) < 1e-6 && Math.abs(r.y - 0) < 1e-6),
    'and the plinth is drawn standing on the floor, at its own setback');
});

test('F5a — ONE cabinet, cut: the grammar both sheets are written in', () => {
  // `cutCabinet` is the shared body, and it is asked directly so the two sheets
  // cannot drift into two grammars. Everything it draws sits at the member's
  // own height above the floor and in the ZY frame.
  const wallA = groups().find((g) => g.wall === 0);
  const bud = cutMembers(wallA, sectionStation(wallA).x).find((m) => m.unit.type === 'BUD');
  const ents = cutCabinet(bud, P);
  assert.ok(ents.length > 0, 'a cabinet cut is a drawing');
  const carcase = ents.find((e) => e.kind === 'rect' && e.layer === 'CARCASE' && e.pen === 'CUT');
  assert.ok(carcase, 'the carcass profile is the heaviest line on it');
  const side = bud.result.panels.find((p) => p.role === 'side');
  assert.equal(carcase.x, side.box.z, 'x is the DEPTH axis, 0 at the wall');
  assert.equal(carcase.y, bud.base + side.box.y, 'and y is height above the FLOOR');
  assert.equal(carcase.w, side.box.d);
  assert.equal(carcase.h, side.box.h);
  // Nothing here invents a coordinate: every rect is some published box.
  for (const e of ents.filter((x) => x.kind === 'rect')) {
    assert.ok(Number.isFinite(e.x) && Number.isFinite(e.y) && e.w > 0 && e.h > 0);
  }
});

test('F5a — the drawer box is a SIDE PROFILE, and its runner is the ladder\'s nominal', () => {
  // The BUDR is not on wall A's /3 (it does not reach the station), so this is
  // asked of a section taken through the BUDR itself — which is F5b's job and
  // the same grammar.
  const budr = wallSectionUnits({ entries: t43Entries(P), profile: P }).find((u) => u.unitNum === '02');
  const member = groups().flatMap((g) => g.members).find((m) => m.unit.id === budr.id);
  const drawing = buildUnitSection(member, { room: T43_ROOM, profile: P });
  const sides = member.result.panels.filter((p) => p.part === 'DRAWER-SIDE' && p.box);
  const boxes = new Map();
  for (const p of sides) if (!boxes.has(p.meta?.drawer)) boxes.set(p.meta?.drawer, p);
  assert.equal(boxes.size, 3, 'three boxes to draw');
  for (const p of boxes.values()) {
    assert.ok(drawing.entities.some((e) => e.kind === 'rect' && e.layer === 'SHELVES'
      && Math.abs(e.x - p.box.z) < 1e-6 && Math.abs(e.w - p.box.d) < 1e-6
      && Math.abs(e.y - (member.base + p.box.y)) < 1e-6 && Math.abs(e.h - p.box.h) < 1e-6),
    `box ${p.meta.drawer} is drawn at the engine's own geometry`);
    // …and the runner under it reaches the NOMINAL, which is 490 + 10.
    assert.ok(drawing.entities.some((e) => e.kind === 'line' && e.layer === 'RUNNERS'
      && Math.abs(e.x2 - e.x1 - 500) < 1e-6), 'the runner reaches NL500, asked of runnerAskFor');
  }
});

// ═══ F5b — SECTION A-A ═════════════════════════════════════════════════════

test('F5b — the dropdown offers every drawable cabinet, and only those', () => {
  const offered = wallSectionUnits({ entries: t43Entries(P), profile: P });
  assert.deepEqual(offered.map((u) => u.unitNum), ['01', '02', '03', '04']);
  // Unit 05 is turned away: no elevation can draw it and no section can be
  // taken through it, so it is not offered.
  assert.ok(!offered.some((u) => u.unitNum === '05'), 'the turned cabinet is not on the menu');
});

test('F5b — choosing one APPENDS a sheet to the set, named for the cabinet', () => {
  const chosen = wallSectionUnits({ entries: t43Entries(P), profile: P }).find((u) => u.unitNum === '02');
  const names = setOf({ sectionUnitId: chosen.id }).map((s) => s.name);
  assert.deepEqual(names, [
    'Wall A /1', 'Wall A /2', 'Wall A /3',
    'Wall B /1', 'Wall B /2', 'Wall B /3',
    'Horizontal section',
    'Section A-A — unit 02',
  ]);
  // …and it is NOT there when nothing is picked.
  assert.ok(!setOf().some((s) => s.name.startsWith('Section A-A')));
  // A cabinet that is not in the census produces no sheet and no crash.
  assert.deepEqual(setOf({ sectionUnitId: 'no-such-unit' }).map((s) => s.name), names.slice(0, 7));
});

test('F5b — the A-A sheet carries the cabinet\'s OWN height and depth pair', () => {
  const chosen = wallSectionUnits({ entries: t43Entries(P), profile: P }).find((u) => u.unitNum === '02');
  const member = groups().flatMap((g) => g.members).find((m) => m.unit.id === chosen.id);
  const drawing = buildUnitSection(member, { room: T43_ROOM, profile: P });
  const captions = drawing.entities.filter((e) => e.kind === 'text').map((e) => e.text);
  assert.ok(captions.includes(String(member.result.params.height)),
    `the height ${member.result.params.height} is dimensioned`);
  assert.ok(captions.includes(String(member.result.params.depth)),
    `and the depth ${member.result.params.depth} is`);
  assert.ok(captions.some((c) => /Section A-A at unit 02/.test(c)), 'and the sheet says where it was cut');
});

// ═══ THE FILES ═════════════════════════════════════════════════════════════

test('F5 — the A-A sheet is in the PDF page count when picked, and nowhere when not', () => {
  const without = setOf();
  const chosen = wallSectionUnits({ entries: t43Entries(P), profile: P }).find((u) => u.unitNum === '02');
  const with$ = setOf({ sectionUnitId: chosen.id });

  for (const [label, sheets] of [['without', without], ['with', with$]]) {
    const doc = bookletDoc(sheets.map((s) => s.sheet));
    const measured = assertPdfBytes(pdfBytes(doc), {
      pages: doc.getNumberOfPages(), sheets: sheets.length, what: `The T43 wall PDF (${label} A-A)`,
    });
    assert.equal(measured.pages, sheets.length, `${label}: a page per sheet`);
  }
  assert.equal(bookletDoc(with$.map((s) => s.sheet)).getNumberOfPages(),
    bookletDoc(without.map((s) => s.sheet)).getNumberOfPages() + 1,
    'picking a cabinet adds exactly one page');
});

test('F5 — …and one DXF per sheet, the A-A among them', () => {
  const chosen = wallSectionUnits({ entries: t43Entries(P), profile: P }).find((u) => u.unitNum === '02');
  const sheets = setOf({ sectionUnitId: chosen.id });
  // The names the zip writer composes, and the bytes each file would carry.
  const names = sheets.map((s) => `${slug(s.name, 'sheet')}-autocad-only.dxf`);
  assert.equal(new Set(names).size, sheets.length, 'one file per sheet, no two the same');
  assert.ok(names.some((n) => /section-a-a/.test(n)), 'the A-A is one of them');
  for (const s of sheets) {
    const dxf = sheetToDxf(s.sheet);
    assert.match(dxf, /^\s*0\r?\nSECTION/, `${s.name}: a real DXF`);
    assert.ok(dxf.includes('AutoCAD only'), `${s.name}: carries the warning ON the drawing`);
  }
});
