// ─── TURN 43, F1: /1 IS FRONTS, AND NOTHING THAT HIDES BEHIND THEM ──────────
//
// The owner, 20.08.2026, on the first real print of the wall set: *"pdf do dupy
// — nadal pokazuje fronty z carcasami, nie pokazuje jak ja chciałem, czyli
// fronty same bez kresek."*
//
// THE FAULT, measured before a line was written: `buildFrontElevation` draws
// every `isDrawn` panel, and `panelStyle` sends every piece that does not reach
// one of the four edges to SHELVES as a dashed hidden line. On the T43 proof
// kitchen that is three shelves, a drawer stack's worth of carcass and eight
// leg blocks on a sheet whose whole job is to show a client the doors.
//
// Every assertion below is on the ENTITY LIST or on the SVG's own numbers —
// iron rule 7, *"prove the thing, not the field"*.

import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { buildFrontElevation, isFrontsSheetPanel } from '../src/engine/drawings/frontElevation.js';
import { wallDrawingSheets } from '../src/engine/drawings/wallSheets.js';
import { buildWallElevation, wallGroups } from '../src/engine/drawings/wallElevation.js';
import { resolveUnitDesign } from '../src/engine/design.js';
import { sheetToSvg } from '../src/engine/drawings/svg.js';
import {
  T43_DESIGN, T43_PROJECT, T43_ROOM, t43Entries,
} from './fixtures/t43-kitchen.js';

/** The whole set of the proof kitchen, as the modal and the PDF both build it. */
const setOf = (extra = {}) => wallDrawingSheets({
  entries: t43Entries(P),
  project: T43_PROJECT,
  room: T43_ROOM,
  design: T43_DESIGN,
  frontTypeOf: (u) => resolveUnitDesign(u, T43_DESIGN).frontType,
  profile: P,
  date: '20/08/2026',
  ...extra,
});

const sheetOf = (s) => s.sheet || s;
const frontsSheets = () => setOf().filter((s) => s.variant === 'fronts');

// The sheet's own furniture — a frame, a title block, its rules. Those are not
// "geometry layers" and the dash census below says so by name rather than by
// hoping none of them is dashed.
const SHEET_LAYERS = new Set(['FRAME', 'FRAME_LIGHT']);

test('F1 — the /1 sheets of a real kitchen carry ZERO hidden geometry', () => {
  const sheets = frontsSheets();
  assert.equal(sheets.length, 2, 'the proof kitchen has two walls with cabinets on them');
  for (const s of sheets) {
    const ents = sheetOf(s).entities;
    assert.equal(ents.filter((e) => e.hidden).length, 0, `${s.name}: not one hidden entity`);
    assert.equal(ents.filter((e) => e.layer === 'SHELVES').length, 0, `${s.name}: nothing on SHELVES`);
    assert.equal(ents.filter((e) => e.layer === 'LEG_BLOCK').length, 0, `${s.name}: not one leg block`);
  }
});

test('F1 — …and the SVG has no stroke-dasharray on any geometry layer', () => {
  for (const s of frontsSheets()) {
    const svg = sheetToSvg(sheetOf(s), { kind: 'wall-elevation' });
    // Every element that names a dash, with the layer it is on — so a dashed
    // TITLE BLOCK rule (there is none today) could be excluded by NAME rather
    // than by the assertion quietly not looking.
    const dashed = [...svg.matchAll(/<[a-z]+[^>]*stroke-dasharray[^>]*>/g)]
      .map((m) => (m[0].match(/data-layer="([^"]+)"/) || [])[1] || '(none)')
      .filter((layer) => !SHEET_LAYERS.has(layer));
    assert.deepEqual(dashed, [], `${s.name}: the fronts sheet draws no dashes`);
  }
});

test('F1 — every FRONT and DRAWER-FRONT is on the sheet, where the engine cut it', () => {
  // Asked of the WALL ELEVATION rather than of the laid-out sheet, so the
  // numbers are true millimetres: a front is looked for at exactly the place
  // the engine cut it, moved by the cabinet's own place on the wall.
  const entries = t43Entries(P);
  const group = wallGroups(entries, P).find((g) => g.wall === 0);
  const drawing = buildWallElevation(group, {
    withFronts: true, room: T43_ROOM, profile: P,
    frontTypeOf: (u) => resolveUnitDesign(u, T43_DESIGN).frontType,
  });
  const rects = drawing.entities.filter((e) => e.kind === 'rect' && e.layer === 'DOORS');
  let wanted = 0;
  for (const m of group.members) {
    for (const p of m.result.panels.filter((q) => q.part === 'FRONT' || q.part === 'DRAWER-FRONT')) {
      wanted += 1;
      const hit = rects.some((r) => Math.abs(r.x - (m.x + p.box.x)) < 1e-6
        && Math.abs(r.y - (m.base + p.box.y)) < 1e-6
        && Math.abs(r.w - p.box.w) < 1e-6
        && Math.abs(r.h - p.box.h) < 1e-6);
      assert.ok(hit, `${m.unit.params.unit_num} ${p.id} is drawn at ${m.x + p.box.x},${m.base + p.box.y}`);
    }
  }
  assert.equal(wanted, 5, 'the proof kitchen puts five fronts on wall A');
});

test('F1 — the whitelist is the four CLAUDE.md names, and nothing else', () => {
  const result = computeCabinet({ ...defaultParamsFor('BUDR', P), unit_num: '01', plinth: true }, P);
  const kept = result.panels.filter(isFrontsSheetPanel).map((p) => p.part);
  assert.ok(kept.includes('DRAWER-FRONT'), 'a drawer front is a front');
  assert.ok(kept.includes('PLINTH'), 'the plinth line stays — it is what the client sees');
  for (const part of ['BUL', 'BUR', 'TOP', 'BOTTOM', 'BACK', 'DRAWER-SIDE', 'DRAWER-BOTTOM']) {
    assert.ok(!kept.includes(part), `${part} is behind a front and is not on /1`);
  }
});

test('F1 — the OPTION defaults off, so the unit card is untouched by it', () => {
  const result = computeCabinet({ ...defaultParamsFor('WARDROBE', P), unit_num: '01', shelves: 3 }, P);
  const plain = buildFrontElevation(result, { unitNum: '01', frontType: 'S', profile: P });
  assert.ok(plain.entities.some((e) => e.hidden), 'the card still draws its hidden lines');
  const clean = buildFrontElevation(result, { unitNum: '01', frontType: 'S', profile: P, frontsOnly: true });
  assert.equal(clean.entities.filter((e) => e.hidden).length, 0, 'and the fronts sheet draws none');
  // The silhouette is what the eye reads first, and it stays on both.
  const outline = (d) => d.entities.filter((e) => e.kind === 'rect' && e.layer === 'CARCASE'
    && e.x === 0 && e.y === 0 && e.w === result.params.width && e.h === result.params.height);
  assert.equal(outline(clean).length, 1, 'the unit silhouette stays on /1');
});
