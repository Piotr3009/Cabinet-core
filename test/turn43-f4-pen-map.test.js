// ─── TURN 43, F4: THE PEN MAP — A SILHOUETTE IS HEAVY, A PANEL EDGE IS NOT ──
//
// The owner, 20.08.2026: *"Linie nadal są mega grube."*
//
// ─── WHAT WAS MEASURED, AND IT IS NOT THE LADDER ────────────────────────────
//
// T41-F5a built the ISO ladder and the resolver, and both are right. What was
// wrong is WHO ASKS FOR WHICH RUNG: every carcass panel is its own rect on the
// `CARCASE` layer, whose default role is `OUTLINE` (0.50) — so a composed wall
// printed panel-edge on panel-edge on unit-outline, all at the heaviest visible
// weight. At 1:15 on A3 that reads as a marker, not a pen.
//
// The layer table does not change and the ladder does not change. One word per
// entity changes, and the census below is the proof.

import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { DRAWING_LAYERS, PEN, penWidth } from '../src/engine/drawings/layers.js';
import { wallDrawingSheets } from '../src/engine/drawings/wallSheets.js';
import { resolveUnitDesign } from '../src/engine/design.js';
import { sheetToSvg } from '../src/engine/drawings/svg.js';
import {
  T43_DESIGN, T43_PROJECT, T43_ROOM, t43Entries,
} from './fixtures/t43-kitchen.js';

/** The sheet's own furniture, which is not the drawing. */
const SHEET_LAYERS = new Set(['FRAME', 'FRAME_LIGHT']);

/**
 * A SECTION is the one sheet allowed the heaviest ink, and T43-F5 gives the set
 * three kinds of them: the horizontal plan, each wall's own `/3`, and the
 * chosen `Section A-A`. The elevation census below excludes all three by
 * NAME rather than by hoping none of them turns up.
 */
const SECTIONS = new Set(['section', 'section-v', 'section-aa']);

const setOf = () => wallDrawingSheets({
  entries: t43Entries(P),
  project: T43_PROJECT,
  room: T43_ROOM,
  design: T43_DESIGN,
  frontTypeOf: (u) => resolveUnitDesign(u, T43_DESIGN).frontType,
  profile: P,
  format: 'A3',
  date: '20/08/2026',
});

/** Every stroked element of a sheet's SVG, with its layer and its weight. */
export function strokeCensus(svg) {
  const out = [];
  for (const m of svg.matchAll(/<(line|rect|circle)\b[^>]*>/g)) {
    const tag = m[0];
    const width = Number((tag.match(/stroke-width="([\d.]+)"/) || [])[1]);
    const layer = (tag.match(/data-layer="([^"]+)"/) || [])[1] || '(none)';
    if (!Number.isFinite(width)) continue;
    out.push({ kind: m[1], layer, width });
  }
  return out;
}

/** How many cabinets this sheet actually drew — one silhouette each. */
const drawnUnitsOf = (sheet) => t43Entries(P).filter((e) => e.unit.position.wall === sheet.wall
  && e.unit.position.rotation_deg === 0).length;

test('F4 — every weight on every sheet is a rung of the ISO ladder', () => {
  const ladder = new Set(Object.values(PEN));
  for (const s of setOf()) {
    const widths = new Set(strokeCensus(sheetToSvg(s.sheet, { kind: 'wall' })).map((e) => e.width));
    for (const w of widths) assert.ok(ladder.has(w), `${s.name}: ${w} is on the ladder`);
  }
});

test('F4 — the 0.50 GEOMETRY rects on an elevation are the unit silhouettes, and nothing else', () => {
  for (const s of setOf()) {
    if (SECTIONS.has(s.variant)) continue;
    const heavy = strokeCensus(sheetToSvg(s.sheet, { kind: 'wall' }))
      .filter((e) => e.kind === 'rect' && !SHEET_LAYERS.has(e.layer) && e.width === PEN.OUTLINE);
    assert.equal(heavy.length, drawnUnitsOf(s),
      `${s.name}: one outline per cabinet drawn — ${heavy.length} rects at 0.50`);
  }
});

test('F4 — no geometry on an elevation is heavier than an outline', () => {
  for (const s of setOf()) {
    if (SECTIONS.has(s.variant)) continue;
    const over = strokeCensus(sheetToSvg(s.sheet, { kind: 'wall' }))
      .filter((e) => !SHEET_LAYERS.has(e.layer) && e.width > PEN.OUTLINE);
    assert.deepEqual(over, [], `${s.name}: PEN.CUT belongs to a section and to nothing else`);
  }
});

test('F4 — …and the SECTION is the one sheet that carries the cut weight', () => {
  const section = setOf().find((s) => s.variant === 'section');
  assert.ok(section, 'the proof kitchen produces a horizontal section');
  const cuts = strokeCensus(sheetToSvg(section.sheet, { kind: 'plan' }))
    .filter((e) => e.width === PEN.CUT);
  assert.ok(cuts.length >= 4, `a real set of cut lines, not one: ${cuts.length}`);
});

test('F4 — the panel edge stopped being an outline, and the hierarchy is real', () => {
  // The two facts the fault was made of, as arithmetic on the resolver.
  assert.equal(penWidth({ layer: 'CARCASE' }), PEN.OUTLINE, 'the LAYER default is untouched');
  assert.equal(penWidth({ layer: 'CARCASE', pen: 'VISIBLE' }), PEN.VISIBLE, 'a panel edge asks for a lighter pen');
  assert.equal(penWidth({ layer: 'SHELVES', pen: 'HIDDEN' }), PEN.HIDDEN, 'and a hidden line stays hidden');
  // The layer TABLE is not edited by this turn — iron rule 3 says so by name.
  assert.equal(DRAWING_LAYERS.CARCASE.pen, 'OUTLINE');
  assert.equal(DRAWING_LAYERS.CARCASE.width, 0.35, 'the pre-T41 fallback is still recorded, not deleted');
  assert.equal(DRAWING_LAYERS.SHELVES.pen, 'HIDDEN');
  assert.equal(DRAWING_LAYERS.LEG_BLOCK.pen, 'THIN');
});

test('F4 — a real elevation carries a real spread, and most of it is NOT heavy', () => {
  for (const s of setOf()) {
    if (SECTIONS.has(s.variant)) continue;
    const geo = strokeCensus(sheetToSvg(s.sheet, { kind: 'wall' }))
      .filter((e) => !SHEET_LAYERS.has(e.layer));
    const heavy = geo.filter((e) => e.width >= PEN.OUTLINE).length;
    assert.ok(heavy / geo.length < 0.2,
      `${s.name}: ${heavy}/${geo.length} strokes at 0.50 or more — a drawing, not a marker`);
  }
});
