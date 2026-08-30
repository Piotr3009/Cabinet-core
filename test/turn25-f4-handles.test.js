// ─── F4 — HANDLES (turn 25) ─────────────────────────────────────────────────
//
// Real models, real holes, one line across the kitchen.
//
// The owner's reference law reads differently for four kinds of front, and the
// whole of F4 rests on getting those four right: a handle 50 mm from the wrong
// end is a handle a joiner has to fill and re-drill.

import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import {
  BAR_CENTRES, HANDLE_CLASSES, HANDLE_TYPES, handleClassCount, handleClassOf, handleHoles,
  handleReference, handleSpec, resolveHandle,
} from '../src/engine/handles.js';
import { defaultParamsFor, UNIT_TYPES } from '../src/engine/types.js';
import { cncLayer } from '../src/engine/cnc/layers.js';
import { buildUnitDxfFiles, parseDxf } from '../src/engine/cnc/dxf.js';

const spec = handleSpec(P);
const BAR = { type: 'bar', centres: 160 };
const unit = (type, extra) => computeCabinet({
  ...defaultParamsFor(type, P), unit_num: '01', ...extra,
}, P);
const handleOn = (r, id) => r.panels.find((p) => p.id === id)?.meta?.handle || null;
const holesOn = (r, id) => r.drills.filter((d) => d.panel === id && d.layer === P.handles.layer);

// ─── F4.1 — the reference point, per class ──────────────────────────────────

test('F4.1 — the four classes, decided on the piece and its cabinet', () => {
  assert.deepEqual(HANDLE_CLASSES, ['base-door', 'wall-door', 'tall-door', 'horizontal']);
  const door = { role: 'front', part: 'FRONT', meta: {} };
  const drawer = { role: 'front', part: 'DRAWER-FRONT', meta: {} };
  // Turn 27 (CLAUDE.md F2.2): the class is read off the GESTURE — a front
  // that falls forward about its bottom edge is gripped from above, like a
  // drawer front — and not off `meta.appliance`, which was an `if (dwPanel)`
  // sitting in the middle of the handle law.
  const dw = { role: 'front', part: 'FRONT', meta: { appliance: 'dw', opening: 'drop' } };
  assert.equal(handleClassOf(door, UNIT_TYPES.BUD), 'base-door');
  assert.equal(handleClassOf(door, UNIT_TYPES.WUD), 'wall-door');
  assert.equal(handleClassOf(door, UNIT_TYPES.WARDROBE), 'tall-door');
  assert.equal(handleClassOf(door, UNIT_TYPES.BUDTALL), 'tall-door');
  assert.equal(handleClassOf(drawer, UNIT_TYPES.BUDR), 'horizontal');
  assert.equal(handleClassOf(dw, UNIT_TYPES.DW_PANEL), 'horizontal');
  // Not a front, not a handle.
  assert.equal(handleClassOf({ role: 'side', part: 'BUL' }, UNIT_TYPES.BUD), null);
});

// ─── TURN 28 (CLAUDE.md F2b): THE X IS IN THE SHEET'S OWN MIRROR ────────────
//
// `handleReference` answers in the FRONT's CUT frame, and a front's cut frame
// is the INSIDE MIRROR — origin at the leaf's bottom-RIGHT corner, x running
// LEFT (`engine/joinery.js panelPlacement`), because the workshop bores a door
// from the back. Turn 25 wrote the ROOM's left into that frame, so the knob
// printed on the CUP stile for BOTH hands (the owner's sheet `03-F`).
//
// The INTENT of every line below is unchanged and so is every `y`: what moves
// is the x, to the other stile, because that is where "the opening edge" is in
// the frame this number is written in. Read it as: hinge L → the hinge is at
// sheet-`w`, so the handle is at sheet-`inset`.

test('F4.1 — a BASE unit door: 50 from the TOP, 50 in from the opening edge', () => {
  const panel = { w: 600, h: 800 };
  // Hinged LEFT ⇒ the hinge edge is sheet-RIGHT ⇒ the handle is at sheet-LEFT,
  // which IS the opening edge of the door in the room.
  const left = handleReference({ panel, handleClass: 'base-door', hinge: 'L' }, P);
  assert.equal(left.x, 50);
  assert.equal(left.y, 800 - 50);
  assert.equal(left.rule, 'top-inset');
  // …and hinged RIGHT it mirrors, which is the whole point of "the OPENING edge".
  const right = handleReference({ panel, handleClass: 'base-door', hinge: 'R' }, P);
  assert.equal(right.x, 600 - 50);
  assert.equal(right.y, 800 - 50);
  // The CUPS are the check on the convention: they have honoured the mirror
  // since turn 1, and a handle that is right stands at the opposite end of the
  // sheet from them for the same hand.
  const cupX = 600 - P.hinges.cups.xFromHingeEdge;      // an L leaf's cup, drawn
  assert.ok(Math.abs(cupX - left.x) > 400, 'cups on one stile, the knob on the other');
});

test('F4.1 — a WALL unit door: 50 from the BOTTOM', () => {
  const r = handleReference({ panel: { w: 600, h: 720 }, handleClass: 'wall-door', hinge: 'L' }, P);
  assert.equal(r.x, 50);
  assert.equal(r.y, 50);
  assert.equal(r.rule, 'bottom-inset');
  // A base unit is gripped from above and a wall unit from below, which is
  // where the hand is — the two are mirrors and never the same number.
  const base = handleReference({ panel: { w: 600, h: 720 }, handleClass: 'base-door', hinge: 'L' }, P);
  assert.notEqual(base.y, r.y);
});

test('F4.1 — a TALL unit door: MID HEIGHT, 50 in', () => {
  const r = handleReference({ panel: { w: 600, h: 2100 }, handleClass: 'tall-door', hinge: 'L' }, P);
  assert.equal(r.x, 50);
  assert.equal(r.y, 1050);
  assert.equal(r.rule, 'mid-height');
  // "Movable": an offset carries it off the reference and the resolver honours
  // it — which is what a drag writes.
  const moved = resolveHandle({
    panel: { role: 'front', part: 'FRONT', w: 600, h: 2100, meta: {} },
    unitType: UNIT_TYPES.WARDROBE,
    project: { ...BAR, offsets: { 'tall-door': { x: 0, y: -300 } } },
  }, P);
  assert.equal(moved.reference.y, 750);
});

test('F4.1 — drawer fronts and D/W panels: HORIZONTAL, centred, 50 from the top', () => {
  const r = handleReference({ panel: { w: 600, h: 200 }, handleClass: 'horizontal' }, P);
  assert.equal(r.axis, 'horizontal');
  assert.equal(r.x, 300, 'centred on the width');
  assert.equal(r.y, 150, '50 from the top');
});

test('F4.1 — a SHAKER front centres on the FRAME’s width', () => {
  // The vertical frame for a door…
  const door = handleReference({
    panel: { w: 600, h: 800 }, handleClass: 'base-door', hinge: 'L', frame: 70,
  }, P);
  assert.equal(door.x, 35, 'the stile’s own centre line — the OPENING stile (F2b)');
  assert.match(door.rule, /shaker-stile/);
  // …and the top frame for a horizontal.
  const drawer = handleReference({ panel: { w: 600, h: 300 }, handleClass: 'horizontal', frame: 70 }, P);
  assert.equal(drawer.y, 300 - 35);
  assert.equal(drawer.rule, 'shaker-top-frame');
});

test('F4.1 — …UNLESS the frame is under 30, when 50 × 50 answers instead', () => {
  assert.equal(spec.shakerMinFrame, 30);
  const wide = handleReference({
    panel: { w: 600, h: 800 }, handleClass: 'base-door', hinge: 'L', frame: 30,
  }, P);
  assert.equal(wide.x, 15, '30 is INCLUDED — “under 30 mm” falls back');
  const narrow = handleReference({
    panel: { w: 600, h: 800 }, handleClass: 'base-door', hinge: 'L', frame: 29,
  }, P);
  assert.equal(narrow.x, 50, 'a 29 mm frame is too narrow to centre on');
  assert.equal(narrow.rule, 'top-inset');
  // A FLAT front has no frame at all and takes the same fallback.
  const flat = handleReference({
    panel: { w: 600, h: 800 }, handleClass: 'base-door', hinge: 'L', frame: null,
  }, P);
  assert.equal(flat.x, 50);
});

// ─── F4.2 — the drillings ───────────────────────────────────────────────────

test('F4.2 — a knob is ONE hole; a bar is the reference and its partner', () => {
  const ref = handleReference({ panel: { w: 600, h: 800 }, handleClass: 'base-door', hinge: 'L' }, P);
  assert.equal(handleHoles({ reference: ref, type: 'knob' }, P).length, 1);
  const bar = handleHoles({ reference: ref, type: 'bar', centres: 160 }, P);
  assert.equal(bar.length, 2);
  // Along the handle's own AXIS, `centres` apart.
  assert.equal(bar[0].x, bar[1].x);
  assert.equal(Math.abs(bar[0].y - bar[1].y), 160);
  // …and the partner goes INTO the door, away from the near edge — the only
  // direction there is room in on a 50-from-the-top reference.
  assert.ok(bar.every((h) => h.y <= 800), 'a hole off the top of the door');
});

test('F4.2 — a horizontal bar’s two screws are side by side', () => {
  const ref = handleReference({ panel: { w: 600, h: 200 }, handleClass: 'horizontal' }, P);
  const bar = handleHoles({ reference: ref, type: 'bar', centres: 128 }, P);
  assert.equal(bar[0].y, bar[1].y);
  assert.equal(Math.abs(bar[0].x - bar[1].x), 128);
  // "Centred on the width" is a statement about the HANDLE, so the pair
  // straddles the centre line rather than starting on it.
  assert.equal((bar[0].x + bar[1].x) / 2, 300);
});

test('F4.2 — a NAMED class on the front’s sheet', () => {
  assert.equal(P.handles.layer, 'HANDLES_5MM');
  assert.equal(cncLayer('HANDLES_5MM').aci, 42);
  assert.equal(cncLayer('HANDLES_5MM').kind, 'hole');
  const r = unit('BUD', { project_handle: BAR });
  const file = buildUnitDxfFiles(r, P).find((f) => f.name === '01-F.dxf');
  const circles = parseDxf(file.dxf).entities.filter((e) => e.type === 'circle' && e.layer === 'HANDLES_5MM');
  assert.equal(circles.length, 2);
  assert.ok(parseDxf(file.dxf).layerTable.some((l) => l.name === 'HANDLES_5MM'));
});

test('F4.2 — the centres a bar comes in, and a typed one', () => {
  assert.deepEqual(BAR_CENTRES, [96, 128, 160, 192, 224]);
  assert.deepEqual(P.handles.barCentres, BAR_CENTRES);
  // A typed number is accepted — the list is what the picker offers, not a set
  // of allowed values.
  const r = unit('WARDROBE', { project_handle: { type: 'bar', centres: 137 } });
  assert.equal(handleOn(r, '01-F').centres, 137);
  assert.equal(Math.abs(holesOn(r, '01-F')[0].y - holesOn(r, '01-F')[1].y), 137);
});

test('F4.2 — a bar that will not fit is REFUSED, and neither hole is drilled', () => {
  // A 224 mm bar on a 169 mm drawer front is two holes off the board.
  const r = unit('BUDR', { project_handle: { type: 'bar', centres: 900 } });
  const said = r.warnings.filter((w) => w.code === 'HANDLE_DOES_NOT_FIT');
  assert.ok(said.length, 'the cabinet must SAY so');
  assert.equal(r.drills.filter((d) => d.layer === 'HANDLES_5MM').length, 0);
});

// ─── R9 — no feature without its part ───────────────────────────────────────

test('R9 — no handle, no holes; add it back and they are identical', () => {
  const without = unit('BUD');
  assert.equal(without.drills.filter((d) => d.layer === 'HANDLES_5MM').length, 0);
  assert.equal(handleOn(without, '01-F'), null);

  const withOne = unit('BUD', { project_handle: BAR });
  const drilled = holesOn(withOne, '01-F');
  assert.equal(drilled.length, 2);

  const again = unit('BUD', { project_handle: BAR });
  assert.deepEqual(
    holesOn(again, '01-F').map((d) => `${d.x},${d.y},${d.d},${d.layer}`),
    drilled.map((d) => `${d.x},${d.y},${d.d},${d.layer}`),
  );
});

test('R9 — no DOOR, no handle holes either', () => {
  // The other half of the law, and the one that catches a handle drilled onto a
  // cabinet that has nothing to drill it into.
  const stripped = unit('BUD', { project_handle: BAR, doors: false });
  assert.equal(stripped.panels.filter((p) => p.part === 'FRONT').length, 0);
  assert.equal(stripped.drills.filter((d) => d.layer === 'HANDLES_5MM').length, 0);
});

// ─── F4.3 — the model’s contract ────────────────────────────────────────────

test('F4.3 — the mount point and the axis ARE the contract, and they are published', () => {
  const r = unit('WARDROBE', { project_handle: BAR });
  const h = handleOn(r, '01-F');
  assert.ok(h, 'a wardrobe door with a handle');
  assert.equal(typeof h.x, 'number');
  assert.equal(typeof h.y, 'number');
  assert.equal(h.axis, 'vertical');
  assert.equal(h.type, 'bar');
  assert.deepEqual(r.drillSummary.handles.map((k) => k.panel), ['01-F']);
  // Gold "for now" — one profile word, so a catalogue finish is one line.
  assert.equal(P.handles.finish, 'gold');
  assert.ok(P.appearance.metals.gold.colour);
  assert.ok(P.appearance.metals.silver.colour);
  // T57 AMENDED (30.08.2026): `bar,knob` → `bar,knob,jpull`. T25's claim is
  // about the CONTRACT a model mounts against — the point, the axis and the
  // type word — and that is untouched. What changed is the list of systems a
  // person may pick: a J-pull is a HANDLE SYSTEM (CLAUDE.md T57 F2), and it
  // mounts no model at all, which is why nothing above it moved.
  assert.equal(HANDLE_TYPES.map((t) => t.id).join(','), 'bar,knob,jpull');
});

// ─── F4.4 — moving one moves all ────────────────────────────────────────────

test('F4.4 — the confirmation’s COUNT is the fronts that exist', () => {
  const kitchen = [
    { unitType: UNIT_TYPES.BUD, panels: unit('BUD').panels },
    { unitType: UNIT_TYPES.BUD, panels: unit('BUD', { width: 900 }).panels },
    { unitType: UNIT_TYPES.WUD, panels: unit('WUD').panels },
    { unitType: UNIT_TYPES.BUDR, panels: unit('BUDR').panels },
  ];
  const base = handleClassCount(kitchen, 'base-door');
  // One 600 mm base unit has one door; a 900 mm one has two.
  assert.equal(base.total, 3);
  assert.equal(handleClassCount(kitchen, 'wall-door').total, 1);
  assert.equal(handleClassCount(kitchen, 'horizontal').total, 3, 'the BUDR’s three fronts');
  assert.equal(handleClassCount(kitchen, 'tall-door').total, 0);

  // A front with a handle of its own does NOT move, and is counted separately
  // so the confirmation can say so.
  const withOwn = handleClassCount(kitchen, 'base-door', (entry, panel) => (panel.id === '01-FL' || panel.id === '01-FR' ? {} : null));
  assert.equal(withOwn.total, 3, 'they are all still counted');
  assert.equal(withOwn.deviating, 2, '…and the two that will not move are named');
});

test('F4.4 — an offset is per CLASS: base doors move, wall doors do not', () => {
  const project = { ...BAR, offsets: { 'base-door': { x: 0, y: -40 } } };
  const base = unit('BUD', { project_handle: project });
  const wall = unit('WUD', { project_handle: project });
  const plain = unit('BUD', { project_handle: BAR });
  assert.equal(handleOn(base, '01-F').y, handleOn(plain, '01-F').y - 40);
  assert.equal(handleOn(wall, '01-F').y, handleOn(unit('WUD', { project_handle: BAR }), '01-F').y);
});

test('F4.4 — ONE front may say something else, and wears the badge for saying it', () => {
  const shared = unit('BUD', { project_handle: BAR });
  assert.equal(handleOn(shared, '01-F').deviation, false);

  const own = unit('BUD', {
    project_handle: BAR,
    front_handles: { '01-F': { type: 'knob' } },
  });
  const h = handleOn(own, '01-F');
  assert.equal(h.type, 'knob');
  assert.equal(h.deviation, true, 'the deviation badge’s own fact');
  assert.equal(holesOn(own, '01-F').length, 1, 'a knob is one hole');
});

test('F4 — nothing is drilled until a handle is ASKED for, on any unit type', () => {
  // The reason every golden fixture is byte-identical: `project_handle` is an
  // INPUT in the design layer, and a bare kit call passes none.
  for (const type of Object.keys(UNIT_TYPES).filter((k) => UNIT_TYPES[k].available !== false)) {
    let r;
    try { r = unit(type); } catch { continue; }
    assert.equal(
      r.drills.filter((d) => d.layer === 'HANDLES_5MM').length, 0,
      `${type} drilled a handle nobody asked for`,
    );
  }
});
