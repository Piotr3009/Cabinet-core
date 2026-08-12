// ─── TURN 26 · F5 — THE DISHWASHER JOINS THE FAMILY ─────────────────────────
//
// Four faults, one appliance, and every one of them is the same mistake made
// four times: the D/W panel was written as a SPECIAL CASE, so it missed each
// law a front was given afterwards.
//
//   F5.1  its front sat 3 mm high — `box.y = H − dwH` glued the leaf to the TOP
//         and put the whole door gap UNDERNEATH it, while every other front in
//         the run starts from the bottom;
//   F5.2  it opened SIDEWAYS, because the scene has one way for a front to open
//         and a D/W panel is a front. It drops FORWARD about its bottom edge;
//   F5.3  …and it must take no cup hinges and no cup drilling, because it
//         screws to the appliance's own door;
//   F5.4  the plinth in front of it is the run's, passing through;
//   F5.5  a D/W front is a FRONT: the shaker applies to it, and so do handles.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor, getUnitType } from '../src/engine/types.js';
import { isShakerFront } from '../src/engine/shaker.js';
import { handleClassOf } from '../src/engine/handles.js';
import { doorHingeDatum } from '../src/engine/doors.js';
import { hardwareInstances } from '../src/engine/hardware3d.js';
import { impliedLegHeight } from '../src/engine/runs.js';

const dw = (extra = {}) => computeCabinet({ ...defaultParamsFor('DW_PANEL', P), unit_num: '01', ...extra }, P);
const base = (extra = {}) => computeCabinet({ ...defaultParamsFor('BUD', P), unit_num: '02', ...extra }, P);
const frontOf = (r) => r.panels.find((p) => p.part === 'FRONT');

// ─── F5.1 — IT LINES UP WITH ITS NEIGHBOURS ─────────────────────────────────

test('F5.1 — the front starts from the BOTTOM, and the gap is at the top', () => {
  const a = frontOf(dw());
  const b = frontOf(base());
  assert.equal(a.box.y, b.box.y, 'a D/W front stands on the same line as the door beside it');
  assert.equal(a.box.y + 0, 0, 'which on a base unit is the carcass floor');
  assert.equal(a.h, b.h, 'and it is the same height');

  // The gap is at the TOP, where every other front in the run leaves it — and
  // it is the whole gap, not half of one at each end.
  const H = defaultParamsFor('DW_PANEL', P).height;
  assert.equal(H - (a.box.y + a.h), P.doors.gap, 'the gap belongs at the top');
  assert.equal(a.box.y + 0, 0, '…and there is none underneath');
});

test('F5.1 — three millimetres, which is what the owner measured', () => {
  // The fault, stated as the number he saw: the old datum put the front's
  // bottom edge `gap` above the floor, so it stood proud of its neighbours by
  // exactly the door gap down a whole run.
  const a = frontOf(dw());
  const wrong = defaultParamsFor('DW_PANEL', P).height - a.h;
  assert.equal(wrong, P.doors.gap);
  assert.equal(wrong, 3, 'three millimetres high');
  assert.notEqual(a.box.y, wrong, 'and it is not there any more');
});

// ─── F5.2 — IT DROPS ────────────────────────────────────────────────────────

test('F5.2 — the panel says HOW it opens, and it is not a swing', () => {
  const face = frontOf(dw());
  assert.equal(face.meta.opening, 'drop-front');
  assert.equal(face.meta.openAngleDeg, P.dwPanel.openAngleDeg);
  assert.equal(P.dwPanel.openAngleDeg, 90, 'about 90°, and not a degree past square');
  // An ordinary door says nothing of the kind, so the scene's default is
  // unchanged and there is no branch anywhere on "is this a dishwasher".
  assert.equal(frontOf(base()).meta.opening, undefined);
});

test('F5.2 — the scene turns it about its BOTTOM edge, forward', () => {
  const view = readFileSync(new URL('../src/3d/UnitView.jsx', import.meta.url), 'utf8');
  // The piece decides, not the unit type.
  assert.match(view, /const drops = front === 'door' && p\.meta\?\.opening === 'drop-front';/);
  // The pivot is the leaf's own bottom edge…
  assert.match(view, /drops\s*\n\s*\? \[mm\(p\.box\.x \+ p\.box\.w \/ 2\), mm\(p\.box\.y\), mm\(p\.box\.z \+ p\.box\.d \/ 2\)\]/);
  // …the mesh hangs above it…
  assert.match(view, /drops\s*\n\s*\? \[0, mm\(p\.box\.h \/ 2\), 0\]/);
  // …and the turn is about x, negative, which takes the top edge into the room.
  assert.match(view, /group\.current\.rotation\.x = -a \* \(swing \?\? Math\.PI \/ 2\);/);
  // It never uses the hinge swing: `swingFor` answers the appliance's angle.
  assert.match(view, /if \(panel\?\.meta\?\.opening === 'drop-front'\) \{/);
});

// ─── F5.3 — NO CUPS, ANYWHERE ───────────────────────────────────────────────

test('F5.3 — no cup hinges, no cup drilling, no plate pattern, no hinge in the BOM', () => {
  const r = dw();
  const face = frontOf(r);
  assert.equal(r.drills.filter((d) => d.panel === face.id && d.kind === 'cup').length, 0);
  assert.equal(r.drills.filter((d) => d.panel === face.id && d.kind === 'cup_screw').length, 0);
  assert.equal(r.drills.filter((d) => d.layer === P.hinges.layer).length, 0);
  assert.equal(r.totals.hinges, 0);
  assert.equal(r.hardware.filter((h) => h.role === 'hinges').length, 0, 'nothing to buy');

  // R9 and R10 agree, and the way they agree is the DATUM: a piece with no
  // mounting plane takes no cup, and there is one place that says so.
  assert.equal(doorHingeDatum(face), null, 'an appliance front has no hinge datum');
  assert.equal(hardwareInstances(r, P).hinges.length, 0, '…so the scene mounts none');
});

// ─── F5.4 — THE PLINTH PASSES THROUGH ───────────────────────────────────────

test('F5.4 — the toe kick is the RUN’s, at the run’s leg height, in one piece', () => {
  const type = getUnitType('DW_PANEL');
  assert.equal(type.legs, false, 'the machine stands where the legs would be');
  assert.equal(type.plinth, true, '…and the toe kick still runs past it');
  // Turn 22's law: a leg-less, plinth-bearing type takes the RUN's leg height.
  assert.equal(impliedLegHeight({ leg_height: 50 }, type, P), 50);
  assert.equal(impliedLegHeight({}, type, P), P.baseUnit.legHeight);

  const r = dw({ plinth: true, leg_height: 50 });
  const plinth = r.panels.find((p) => p.part === 'PLINTH');
  assert.ok(plinth, 'the unit cuts its own length of it');
  assert.equal(plinth.box.h, 50, 'at the run’s height');
  assert.equal(plinth.box.y, -50, 'on the run’s line');

  // PASSING THROUGH is the least committal reading and it is what is shipped:
  // the toe kick is ONE piece across the opening, relieved for the appliance
  // 20 mm below its top edge and open at the bottom, so the line the eye
  // follows along the run is unbroken.
  const ys = plinth.cnc.outline.map(([, y]) => y);
  assert.ok(ys.includes(plinth.h - P.dwPanel.plinthCutFromTop), 'relieved 20 mm below the top');
  assert.equal(Math.max(...ys), plinth.h, 'and the top edge runs right through');
});

test('F5.4 — the BLOCKER is asked, in BLOCKERS.md, in the owner’s own terms', () => {
  const doc = readFileSync(new URL('../BLOCKERS.md', import.meta.url), 'utf8');
  const at = doc.indexOf('Cokół przed zmywarką');
  assert.ok(at > 0, 'the question is on the list');
  const entry = doc.slice(at, at + 2400);
  assert.match(entry, /F5\.4/);
  assert.match(entry, /fixed/i);
  assert.match(entry, /removable/i);
  assert.match(entry, /passing through/i);
  assert.match(entry, /tura 26/i);
  assert.match(entry, /Co Piotr ma zdecydować/);
});

// ─── F5.5 — IT IS A FRONT ───────────────────────────────────────────────────

test('F5.5 — the shaker reaches it, and a flat job still cuts it flat', () => {
  const s = frontOf(dw({ front_type: 'S' }));
  assert.equal(isShakerFront(s), true);
  assert.equal(s.meta.shaker.frame, P.front.types.S.frameWidth);
  assert.equal((s.cnc.pockets || []).length, 1);
  assert.equal(s.cnc.pockets[0].layer, 'SHAKER_PANEL_POCKET');

  const f = frontOf(dw({ front_type: 'F' }));
  assert.equal(isShakerFront(f), false);
  assert.deepEqual(f.cnc.pockets || [], []);
});

test('F5.5 — and so do handles, on the same rule every other front follows', () => {
  const r = dw({ project_handle: { type: 'bar', centres: 160 } });
  const face = frontOf(r);
  assert.equal(handleClassOf(face, getUnitType('DW_PANEL')), 'horizontal', 'across the top, like a drawer front');
  assert.ok(face.meta.handle, 'the piece carries its handle');
  assert.equal(face.meta.handle.axis, 'horizontal');
  assert.equal(r.drills.filter((d) => d.panel === face.id && d.layer === 'HANDLES_5MM').length, 2);
  // …and R9 still holds: no handle, no holes.
  assert.equal(dw().drills.filter((d) => d.layer === 'HANDLES_5MM').length, 0);
});

test('F5.5 — the special case is GONE from the two places it lived', () => {
  const shaker = readFileSync(new URL('../src/engine/shaker.js', import.meta.url), 'utf8');
  assert.ok(
    !/if \(panel\?\.meta\?\.appliance\) return false;/.test(shaker),
    'isShakerFront no longer excludes an appliance front',
  );
  // What is left is the ONE law that really is about this piece, and it is
  // said where a hinge is decided rather than where a rebate is.
  const doors = readFileSync(new URL('../src/engine/doors.js', import.meta.url), 'utf8');
  assert.match(doors, /if \(panel\.meta\?\.appliance\) return null;/);
});
