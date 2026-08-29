// ─── TURN 22 F1 — the cornice: 70 and 100 on an infill of 40 ────────────────
//
// The phase turn 21 dropped by protocol, built. What is proved here is the
// whole of CLAUDE.md F1, as pure maths wherever it can be:
//
//   F1.1  the per-unit option, and the kits it is offered on;
//   F1.2  the shape, the two heights and the two projections;
//   F1.3  continuity — one run, the STOP at a wall/panel/infill, the 45° and
//         the return at an OPEN end;
//   F1.4  the BOM's linear metres, and the iron rule under them: the cornice
//         is bought moulding and produces NO CUT PIECE, so the CNC export,
//         the cut list and every fixture are byte-for-byte what they were;
//   F1.5  ceiling honesty — a 2400 wardrobe under a 2400 ceiling WARNS.

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  corniceCeilingNotice, corniceOption, corniceOrder, corniceProjection, corniceRise,
  corniceSection, corniceSegments, corniceSolids, corniceStackTop, runCorniceParams,
  segmentCornice, takesCornice,
} from '../src/engine/cornice.js';
import { buildRuns } from '../src/engine/runs.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { migrateRoom, rectCorners } from '../src/engine/room.js';

const store = () => useProjectStore.getState();
const unitOf = (id) => store().units.find((u) => u.id === id);

function project(height = 2700, width = 6000) {
  store().loadProject({
    id: null,
    name: 't22-f1',
    room: migrateRoom({ height, corners: rectCorners(width, 3000) }),
    design: {},
  }, []);
}

/** A unit record the pure run functions can be given without a store. */
const wardrobe = (id, x, cornice, extra = {}) => ({
  id,
  type: 'WARDROBE',
  position: { wall: 0, x_mm: x, rotation_deg: 0 },
  params: {
    width: 600, height: 2150, depth: 578, front_t: 25, top_infill_mm: 40, cornice, ...extra,
  },
});

// ─── F1.1 — the option, and where it is offered ─────────────────────────────

test('F1.1 the option is none | 70 | 100, and nothing else', () => {
  assert.deepEqual(P.autoParts.cornice.heights, [70, 100]);
  assert.equal(corniceOption(0, P), 0);
  assert.equal(corniceOption(null, P), 0);
  assert.equal(corniceOption('none', P), 0);
  assert.equal(corniceOption(false, P), 0);
  assert.equal(corniceOption(70, P), 70);
  assert.equal(corniceOption('100', P), 100);
  // A project hand-edited to a moulding this workshop does not buy reads as
  // "none" rather than as itself: quietly cutting the 100 for it would be the
  // app inventing an order line.
  assert.equal(corniceOption(85, P), 0);
  assert.equal(corniceOption(120, P), 0);
});

test('F1.1 — the kits that finish in the air take one; the ones under a worktop do not', () => {
  // ─── TURN 26 (CLAUDE.md F9.2): THE WALL UNIT JOINS THEM ──────────────────
  // "A cornice run continues across ANY adjacent cornice-bearing unit whose
  // top edges meet — tall and wall alike, not just floor-standing." Turn 22
  // offered the moulding on wardrobes and tall units because those are what
  // stand up to the ceiling; a run of wall units finishes at the same height
  // and takes the same moulding, and leaving it off was the app deciding a
  // joinery question by unit type.
  for (const id of ['WARDROBE', 'BUDTALL', 'FRIDGE', 'WUD']) {
    assert.equal(takesCornice(id), true, `${id} finishes in the air`);
  }
  // A base unit finishes under a worktop and a D/W panel under the same one:
  // there is nothing up there to put a moulding on.
  for (const id of ['BUD', 'BUDR', 'BUDR2', 'BUDR4', 'SINK', 'DW_PANEL', 'OVEN_BASE', 'LOW_CABINET']) {
    assert.equal(takesCornice(id), false, `${id} is not a cornice-bearing kit`);
  }
});

// ─── F1.2 — the shape, the heights, the projections ─────────────────────────

test('F1.2 the projections are the owner’s numbers: 48 for the 70, 65 for the 100', () => {
  assert.equal(corniceProjection(70, P), 48);
  assert.equal(corniceProjection(100, P), 65);
  assert.equal(corniceProjection(0, P), 0);
});

test('F1.2 the section is a closed bead-and-cove of exactly the stated height', () => {
  for (const h of [70, 100]) {
    const pts = corniceSection(h, P);
    const pr = corniceProjection(h, P);
    assert.ok(pts.length >= 8, 'the two curved members are drawn with points, not with a chord');
    // It starts on the back face at the bottom and finishes on it at the top:
    // the polygon closes along the face screwed to the infill.
    assert.deepEqual(pts[0], [0, 0]);
    assert.deepEqual(pts[pts.length - 1], [0, h]);
    // Nothing sticks out past the projection, and nothing rises past the height.
    assert.equal(Math.max(...pts.map((p) => p[0])), pr, 'the full projection is reached exactly once');
    assert.equal(Math.max(...pts.map((p) => p[1])), h, 'and the full height is exactly the height');
    assert.ok(pts.every(([d, y]) => d >= 0 && y >= 0), 'nothing goes behind the infill or below the door top');
    // The BEAD is the small convex member at the bottom: it stands proud
    // before the piece is a fifth of its height up.
    const S = P.autoParts.cornice.section;
    const bead = pts.find(([, y]) => y >= h * S.beadHeight - 1e-6);
    assert.ok(bead[0] > 0 && bead[0] <= pr * S.beadProjection + 1e-6, 'a small bottom bead');
    // The LAND is flat: the top two points before the return share a
    // projection, so the face is vertical over the land's height.
    const top = pts.filter(([d]) => Math.abs(d - pr) < 1e-6);
    assert.ok(top.length >= 1);
    assert.ok(Math.max(...top.map((p) => p[1])) === h, 'the land finishes at the top of the piece');
  }
});

test('F1.2 the shape is the ONLY thing a supplier DXF would replace', () => {
  // Everything downstream consumes points. A profile whose section is a plain
  // rectangle — which is what a stand-in DXF would be — still runs, still
  // mitres and still orders the same metres.
  const square = {
    ...P,
    autoParts: {
      ...P.autoParts,
      cornice: {
        ...P.autoParts.cornice,
        section: {
          beadHeight: 0, beadProjection: 0, landHeight: 0, steps: 1,
        },
      },
    },
  };
  const pts = corniceSection(70, square);
  assert.ok(pts.length >= 3);
  assert.equal(Math.max(...pts.map((p) => p[0])), 48);
  assert.equal(Math.max(...pts.map((p) => p[1])), 70);
});

// ─── F1.3 — continuity, the stop, the mitre and the return ──────────────────

test('F1.3 adjacent cornice-bearing units are ONE run; a gap in the option splits it', () => {
  const units = [
    wardrobe('a', 0, 70), wardrobe('b', 600, 70), wardrobe('c', 1200, 0), wardrobe('d', 1800, 70),
  ];
  const [run] = buildRuns(units, P);
  const segments = corniceSegments(run, P);
  assert.equal(segments.length, 2, 'the unit with no cornice is a hole, not a bridge');
  assert.deepEqual(segments[0].units.map((u) => u.id), ['a', 'b']);
  assert.deepEqual(segments[1].units.map((u) => u.id), ['d']);
});

test('F1.3 70 beside 100 is TWO runs — no single length is both mouldings', () => {
  const units = [wardrobe('a', 0, 70), wardrobe('b', 600, 100), wardrobe('c', 1200, 100)];
  const [run] = buildRuns(units, P);
  const segments = corniceSegments(run, P);
  assert.deepEqual(segments.map((s) => s.height), [70, 100]);
  assert.deepEqual(segments[1].units.map((u) => u.id), ['b', 'c']);
});

test('F1.3 a run between two walls STOPS at both, with no mitre and no return', () => {
  const units = [wardrobe('a', 10, 70), wardrobe('b', 610, 70)];
  const [run] = buildRuns(units, P);
  const [segment] = corniceSegments(run, P);
  const el = segmentCornice(segment, {
    wallWidth: 1220, roomHeight: 2700, frontFaceDepth: { left: 620, right: 620 },
  }, P);
  assert.deepEqual(el.ends, { left: 'wall', right: 'wall' });
  assert.deepEqual(el.mitres, { left: false, right: false });
  assert.deepEqual(el.returns, { left: null, right: null });
  // T55 AMENDED (29.08.2026): `runEnd`'s wall case stops on the CARCASS face
  // now (the owner: *"dlaczego wystaje poza carcass"*), and the cornice —
  // sharing that law — spans carcass to carcass, not plaster to plaster.
  // If the owner rules the CORNICE should still reach the walls, that is his
  // one line and this case splits; until then, one end law for every top
  // piece.
  assert.equal(el.length, 1200, 'carcass face to carcass face (T55)');
  assert.equal(el.offset, 0, 'measured in the owner unit’s own frame');
});

test('F1.3 an OPEN end mitres 45° and returns along the side to the back wall', () => {
  const units = [wardrobe('a', 10, 70), wardrobe('b', 610, 70)];
  const [run] = buildRuns(units, P);
  const [segment] = corniceSegments(run, P);
  const el = segmentCornice(segment, {
    wallWidth: 4000, roomHeight: 2700, frontFaceDepth: { left: 620, right: 620 },
  }, P);
  assert.equal(el.ends.left, 'wall', 'still hard against the left wall');
  assert.equal(el.ends.right, 'open');
  assert.equal(el.mitres.right, true);
  assert.equal(el.mitres.left, false);
  assert.equal(el.returns.right, 620, 'the return runs the end cabinet’s own front-face depth');
  assert.equal(el.returns.left, null);
});

test('F1.3 a return shorter than the profile’s minimum is not made at all', () => {
  const units = [wardrobe('a', 10, 70)];
  const [run] = buildRuns(units, P);
  const [segment] = corniceSegments(run, P);
  const el = segmentCornice(segment, {
    wallWidth: 4000, roomHeight: 2700, frontFaceDepth: { left: 620, right: 20 },
  }, P);
  assert.equal(el.ends.right, 'open');
  assert.equal(el.returns.right, null, 'below minReturn the mitre is longer than the piece');
});

test('F1.3 a side infill taken PAST the cornice stops it; one that ends with the carcass does not', () => {
  // The cornice's own obstacle rule: what is in its way is what reaches ITS
  // top, not what reaches the ceiling. The filler stands to the right of a
  // wardrobe whose top is 2250 and whose cornice finishes at 2320.
  const tall = (above) => [
    wardrobe('a', 400, 70, { side_infill_right_mm: 120, side_infill_right_top_mm: above }),
  ];
  const stops = (above) => {
    const [run] = buildRuns(tall(above), P);
    const [segment] = corniceSegments(run, P);
    return segmentCornice(segment, {
      wallWidth: 4000, roomHeight: 2700, frontFaceDepth: { left: 620, right: 620 },
    }, P);
  };
  // A filler taken 200 mm above the carcass reaches 2450 — past the moulding.
  assert.equal(stops(200).ends.right, 'infill');
  assert.equal(stops(200).mitres.right, false, 'a stop is flush, never mitred');
  // One that finishes with the carcass is a metre below the piece: the
  // moulding runs over it to the wall, exactly as the top infill does.
  const over = stops(0);
  assert.equal(over.ends.right, 'infill');
  assert.equal(over.mitres.right, false);
});

test('F1.3 the run OWNER carries the geometry and everybody else carries a note', () => {
  const units = [wardrobe('a', 0, 70), wardrobe('b', 600, 70), wardrobe('c', 1200, 70)];
  const map = runCorniceParams(buildRuns(units, P), {
    units, walls: [{ width: 4000 }], roomHeight: 2700, frontFaceDepthOf: () => 620,
  }, P);
  assert.equal(map.get('a').role, 'owner');
  assert.deepEqual(map.get('b'), { role: 'member', ownerId: 'a' });
  assert.deepEqual(map.get('c'), { role: 'member', ownerId: 'a' });
  assert.equal(map.get('a').unitIds.length, 3, 'one moulding across the three');
});

// ─── the 45°, as geometry rather than as a promise ──────────────────────────

test('F1.3 the mitre is a REAL 45°: the outer face runs on by exactly the projection', () => {
  const units = [wardrobe('a', 0, 70)];
  const [run] = buildRuns(units, P);
  const [segment] = corniceSegments(run, P);
  const el = segmentCornice(segment, {
    wallWidth: 4000, roomHeight: 2700, frontFaceDepth: { left: 620, right: 620 },
  }, P);
  assert.equal(el.ends.right, 'open');
  const solids = corniceSolids(el, { carcassTop: 2150, doorPlane: 606, backZ: -10 }, P);
  const front = solids.find((s) => s.id === 'front');
  const ret = solids.find((s) => s.id === 'return-right');
  assert.ok(front && ret, 'a front and one return');
  const section = corniceSection(70, P);
  // Every point of the front's mitred end has slid along by its own
  // projection; the square (wall) end has not moved at all.
  for (let i = 0; i < section.length; i += 1) {
    const [d] = section[i];
    assert.equal(front.a[i][0], 0, 'the wall end is square');
    assert.equal(front.b[i][0], 600 + d, 'the open end runs to its long point');
    // …and the return's corner end mirrors it, in the other axis.
    assert.equal(ret.a[i][2], 606 + d);
    assert.equal(ret.b[i][2], -10, 'and it butts into the back wall');
    assert.equal(ret.a[i][0], 600 + d, 'the return projects OUTWARD from the side');
  }
});

// ─── F1.4 — what is ordered, and what is NOT cut ────────────────────────────

test('F1.4 the BOM counts linear metres: front + returns + an allowance per corner', () => {
  const el = {
    role: 'owner',
    height: 70,
    projection: 48,
    length: 1200,
    returns: { left: null, right: 620 },
    mitres: { left: false, right: true },
  };
  const order = corniceOrder(el, P);
  assert.equal(order.front_mm, 1200);
  assert.equal(order.returns_mm, 620);
  assert.equal(order.corners, 1);
  assert.equal(order.allowance_mm, P.autoParts.cornice.mitreAllowance);
  assert.equal(order.total_mm, 1200 + 620 + P.autoParts.cornice.mitreAllowance);
  assert.equal(order.metres, order.total_mm / 1000);
  // A member orders nothing: the length belongs to the run's owner.
  assert.equal(corniceOrder({ role: 'member', ownerId: 'a' }, P), null);
});

test('F1.4 the cornice is a HARDWARE line — and produces no cut piece at all', () => {
  const base = { ...defaultParamsFor('WARDROBE', P), unit_num: '01' };
  const plain = computeCabinet(base, P);
  const withCornice = computeCabinet({ ...base, cornice: 70, top_infill_mm: 40 }, P);

  // Not one panel more, not one panel changed. This is the whole of "fixtures
  // ZERO, fingerprint delta ZERO": the CNC export, the cut list and the DXF
  // all read `panels`, and `panels` has not moved.
  assert.equal(withCornice.panels.length, plain.panels.length + 2, 'only the infill it mounts on');
  const key = (p) => `${p.id}|${p.w}x${p.h}x${p.thickness}|${p.box?.x},${p.box?.y},${p.box?.z}`;
  const plainKeys = new Set(plain.panels.map(key));
  const extra = withCornice.panels.filter((p) => !plainKeys.has(key(p)));
  assert.deepEqual(extra.map((p) => p.part).sort(), ['INFILL', 'INFILL'],
    'the two pieces of the top infill, which is a cut piece and already was');
  assert.equal(withCornice.panels.filter((p) => /cornice/i.test(p.part)).length, 0);
  assert.equal(withCornice.drills.length, plain.drills.length, 'and nothing new is drilled');

  // It IS ordered, by the metre.
  const row = withCornice.hardware.find((h) => h.role === 'cornice');
  assert.ok(row, 'the moulding reaches the BOM');
  assert.equal(row.unit, 'm');
  assert.equal(row.spec.height_mm, 70);
  assert.equal(row.spec.projection_mm, 48);
  assert.ok(/70 mm/.test(row.spec_label) && /48 mm/.test(row.spec_label));
  assert.equal(plain.hardware.find((h) => h.role === 'cornice'), undefined,
    'and a cabinet with no cornice orders none');
});

test('F1.4 a kit that takes no cornice never grows one, however it was asked', () => {
  const r = computeCabinet({ ...defaultParamsFor('BUD', P), cornice: 100 }, P);
  assert.equal(r.assemblies.cornice, null);
  assert.equal(r.hardware.find((h) => h.role === 'cornice'), undefined);
});

test('F1.4 a run MEMBER cuts and orders nothing — the length is next door', () => {
  const base = { ...defaultParamsFor('WARDROBE', P), unit_num: '02', cornice: 70 };
  const member = computeCabinet({ ...base, run_cornice: { role: 'member', ownerId: 'a' } }, P);
  assert.equal(member.assemblies.cornice, null);
  assert.equal(member.hardware.find((h) => h.role === 'cornice'), undefined);
});

// ─── F1.5 — ceiling honesty ─────────────────────────────────────────────────

test('F1.5 the stack is unit + infill + cornice rise, and the taller of the two wins', () => {
  assert.equal(corniceRise(70, 40), 30);
  assert.equal(corniceRise(100, 40), 60);
  assert.equal(corniceRise(70, 300), 0, 'an infill dragged past the moulding is the taller piece');
  assert.equal(corniceStackTop({ unitTop: 2250, infillHeight: 40, height: 70 }), 2320);
  assert.equal(corniceStackTop({ unitTop: 2250, infillHeight: 300, height: 70 }), 2550);
});

test('F1.5 a 2400 wardrobe under a 2400 ceiling WARNS instead of clipping', () => {
  const notice = corniceCeilingNotice({
    unitTop: 2400, infillHeight: 40, height: 70, roomHeight: 2400, label: 'W01',
  }, P);
  assert.ok(notice, 'it is said out loud');
  assert.ok(notice.includes('70 mm cornice'));
  assert.ok(notice.includes('2400'));
  assert.ok(notice.startsWith('W01:'));
  // …and it does not fire where it fits.
  assert.equal(corniceCeilingNotice({
    unitTop: 2250, infillHeight: 40, height: 70, roomHeight: 2700,
  }, P), null);
  // …nor where there is no cornice at all.
  assert.equal(corniceCeilingNotice({
    unitTop: 2400, infillHeight: 40, height: 0, roomHeight: 2400,
  }, P), null);
});

// ─── the store: the option, the infill under it, and the run ────────────────

test('F1 setting a cornice asks for the infill it is fixed to, and builds ONE run', () => {
  project(2700, 6000);
  const a = store().addUnit('WARDROBE');
  const b = store().addUnit('WARDROBE', { near: a.id, side: 'right' });
  store().setCornice(a.id, 70);
  store().setCornice(b.id, 70);

  assert.equal(unitOf(a.id).params.cornice, 70);
  assert.ok(Number(unitOf(a.id).params.top_infill_mm) >= P.autoParts.cornice.infillHeight,
    'the 40 mm infill it mounts on is there');

  const owner = unitOf(a.id).params.run_cornice;
  assert.equal(owner.role, 'owner');
  assert.equal(owner.height, 70);
  assert.equal(unitOf(b.id).params.run_cornice.role, 'member');
  assert.equal(owner.unitIds.length, 2, 'one moulding over the two of them');

  // …and the BOM carries the metres exactly once.
  const rows = store().allResults()
    .flatMap((e) => e.result.hardware)
    .filter((h) => h.role === 'cornice');
  assert.equal(rows.length, 1, 'the owner orders; the member does not');
});

test('F1 the option flips back to none and takes the moulding with it', () => {
  project(2700, 6000);
  const a = store().addUnit('WARDROBE');
  store().setCornice(a.id, 100);
  assert.equal(unitOf(a.id).params.run_cornice.height, 100);
  store().setCornice(a.id, 0);
  assert.equal(unitOf(a.id).params.cornice, 0);
  assert.equal(unitOf(a.id).params.run_cornice, null);
  assert.equal(store().unitResult(a.id).assemblies.cornice, null);
});

test('F1.5 the store says so when the moulding will not fit under the ceiling', () => {
  project(2400, 6000);
  const a = store().addUnit('WARDROBE');
  store().updateUnitParams(a.id, { height: 2280 });
  const { notices } = store().setCornice(a.id, 100);
  assert.ok(notices.some((n) => /cornice/.test(n) && /ceiling/.test(n)),
    `a warning was expected, got ${JSON.stringify(notices)}`);
});
