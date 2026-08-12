// ─── TURN 26 · F9 — THE CORNICE GROWS CORNERS ───────────────────────────────
//
// F9.1  Diagnose the toggle that does nothing. It was not the menu item, not
//       the store write and not the resolver: the WIRE between the first two
//       was missing, and `store.setCornice?.()` on `undefined` is a silent
//       no-op by design. `verify/t26/cornice-toggle.md` is the post-mortem;
//       the test below closes the CLASS of fault rather than the instance.
// F9.2  Wall units join the run.
// F9.3  The fourth end case: a CORNER, mitred internally at 45°.
// F9.4  …and the refusal when the two runs are different depths (BLOCKERS #92).

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import {
  corniceCorner, corniceOption, corniceRefusals, corniceSegments, runCorniceParams,
  segmentCornice, takesCornice,
} from '../src/engine/cornice.js';
import { menuActions } from '../src/lib/contextActions.js';
import { getUnitType, defaultParamsFor } from '../src/engine/types.js';
import { unitTop } from '../src/engine/runs.js';

const read = (rel) => readFileSync(new URL(`../src/${rel}`, import.meta.url), 'utf8');

// ─── F9.1 — THE WIRE ────────────────────────────────────────────────────────

test('F9.1 — the toggle is wired: `setCornice` reaches the menu at last', () => {
  const src = read('components/ContextMenu.jsx');
  assert.match(src, /const setCornice = useProjectStore\(\(s\) => s\.setCornice\);/, 'the selector');
  assert.match(src, /setCornice: \(unitId, height\) => \{/, 'the entry in the store object');
  // …and the notices the store returns are SHOWN. The ceiling check is the
  // whole of F1.5 and dropping it would be half a wire.
  assert.match(src, /for \(const notice of notices \|\| \[\]\) notify\(notice, 'warn'\);/);
});

test('F9.1 — EVERY action the menu can produce has the function it calls', () => {
  // The real repair. The specific missing line is one commit; the CLASS of
  // fault — an optional call on a function nobody supplied — is what this
  // closes, and it would have failed on the day turn 25 shipped the entry.
  //
  // `menuActions` is handed a plain object of the functions its entries may
  // call, and every call site uses `?.` so a caller that has never heard of an
  // entry is inert. That is what makes the list safe to grow, and it is exactly
  // what made a missing line invisible.
  const menu = read('lib/contextActions.js');
  const called = new Set([...menu.matchAll(/store\.([A-Za-z0-9_]+)\?\.\(/g)].map((m) => m[1]));
  assert.ok(called.size > 15, `${called.size} store functions are called by the menu`);
  assert.ok(called.has('setCornice'), 'the entry this test was written for');

  const wired = read('components/ContextMenu.jsx');
  // The object literal handed to `menuActions` — everything between `store: {`
  // and the close of the call.
  const at = wired.indexOf('store: {');
  assert.ok(at > 0, 'the menu is given a store object');
  const block = wired.slice(at, wired.indexOf('\n    })', at));
  for (const name of [...called].sort()) {
    // Either `name,` (a shorthand) or `name: …` (a wrapper).
    const supplied = new RegExp(`(^|[\\s{,])${name}\\s*[,:]`, 'm').test(block);
    assert.ok(supplied, `\`store.${name}?.()\` is called by the menu and nothing supplies it — `
      + 'the optional call would be a silent no-op, which is exactly the cornice toggle’s fault');
  }
});

// ─── F9.2 — WALL UNITS JOIN THE RUN ─────────────────────────────────────────

test('F9.2 — a wall unit is a cornice-bearing kit, and its menu offers the three', () => {
  assert.equal(takesCornice('WUD'), true);
  assert.equal(getUnitType('WUD').supports.cornice, true);
  const unit = {
    id: 'u1', type: 'WUD', params: { ...defaultParamsFor('WUD', P), unit_num: '01' }, position: { x_mm: 0 },
  };
  const ids = menuActions({ unit, store: {}, profile: P }).map((a) => a.id);
  for (const h of [0, ...P.autoParts.cornice.heights]) {
    assert.ok(ids.includes(`cornice-${h}`), `the ${h} entry is offered on a wall unit`);
  }
  // …and it is a RUN piece, in the same group as the infill it is screwed to.
  const entry = menuActions({ unit, store: {}, profile: P }).find((a) => a.id === 'cornice-70');
  assert.equal(entry.group, 'run-pieces');
});

test('F9.2 — a BASE unit still offers none: there is nothing up there to fix it to', () => {
  const unit = {
    id: 'u1', type: 'BUD', params: { ...defaultParamsFor('BUD', P), unit_num: '01' }, position: { x_mm: 0 },
  };
  const ids = menuActions({ unit, store: {}, profile: P }).map((a) => a.id);
  assert.ok(!ids.some((id) => id.startsWith('cornice-')));
});

// ─── F9.3 / F9.4 — THE CORNER, AND THE REFUSAL ──────────────────────────────

const at = (height, depth, top) => ({ height, depth, top, unitId: 'other' });

test('F9.3 — two runs of the same moulding at the same depth mitre at 45°', () => {
  const corner = corniceCorner({
    mine: { height: 70, depth: 578, top: 2400 },
    theirs: at(70, 578, 2400),
  }, P);
  assert.ok(corner);
  assert.equal(corner.kind, 'corner');
  assert.equal(corner.mitre, true);
  assert.equal(corner.refused, undefined);
  assert.equal(corner.with, 'other');
});

test('F9.3 — nothing there is not a corner, and neither is a moulding at another height', () => {
  assert.equal(corniceCorner({ mine: { height: 70, depth: 578, top: 2400 }, theirs: null }, P), null);
  // A neighbour with NO cornice: this end is whatever `runEnd` said it was.
  assert.equal(corniceCorner({ mine: { height: 70, depth: 578, top: 2400 }, theirs: at(0, 578, 2400) }, P), null);
  // …and one whose TOP is 300 mm below: the run goes over it, not into it.
  assert.equal(corniceCorner({ mine: { height: 70, depth: 578, top: 2400 }, theirs: at(70, 578, 2100) }, P), null);
});

test('F9.4 — a WALL 350 meeting a TALL 578 REFUSES, and says why', () => {
  // CLAUDE.md F9.4's own example. "Ship the mitre for equal depths, refuse
  // (with a plain message) for unequal ones, and ask in BLOCKERS."
  const corner = corniceCorner({
    mine: { height: 70, depth: 350, top: 2400 },
    theirs: at(70, 578, 2400),
  }, P);
  assert.ok(corner);
  assert.equal(corner.kind, 'corner', 'it IS a corner — that is why it can be refused');
  assert.equal(corner.mitre, false, 'and it is left square');
  assert.equal(corner.refused, true);
  // A PLAIN message: the two numbers, what is wrong, and whose decision it is.
  assert.match(corner.message, /350/);
  assert.match(corner.message, /578/);
  assert.match(corner.message, /does not close/);
  assert.match(corner.message, /BLOCKERS #92/);
  assert.ok(!corner.message.includes('_'), 'no identifiers in a sentence a joiner reads');
  assert.ok(corner.message.length > 80, 'it explains rather than announcing');
});

test('F9.4 — two HEIGHTS refuse too: no single 45° joins a 70 to a 100', () => {
  const corner = corniceCorner({
    mine: { height: 70, depth: 578, top: 2400 },
    theirs: at(100, 578, 2400),
  }, P);
  assert.equal(corner.mitre, false);
  assert.equal(corner.refused, true);
  assert.match(corner.message, /70 mm/);
  assert.match(corner.message, /100 mm/);
});

test('F9.4 — a SCRIBE is not a step: the tolerance is a workshop number', () => {
  assert.equal(P.autoParts.cornice.cornerToleranceMm, 2);
  // A run fitted to a bowed wall is not a different depth from its neighbour.
  const close = corniceCorner({
    mine: { height: 70, depth: 578, top: 2400 },
    theirs: at(70, 576.5, 2400),
  }, P);
  assert.equal(close.mitre, true, 'a millimetre and a half is a scribe');
  const far = corniceCorner({
    mine: { height: 70, depth: 578, top: 2400 },
    theirs: at(70, 570, 2400),
  }, P);
  assert.equal(far.mitre, false, 'eight is a step');
});

// ─── the four cases, on one element ─────────────────────────────────────────

const unitAt = (id, type, x, params = {}) => ({
  id,
  type,
  position: { x_mm: x, wall: 0 },
  params: {
    ...defaultParamsFor(type, P), unit_num: id, ...params,
  },
});

const runOf = (units, mount = 'floor') => ({
  wall: 0,
  mount,
  units,
  top: 0,
  left: Number(units[0].position.x_mm) || 0,
  right: (Number(units[units.length - 1].position.x_mm) || 0) + (units[units.length - 1].params.width || 0),
});

test('F9.3 — the FOUR end cases are all reachable, and the corner is the new one', () => {
  const tall = unitAt('t1', 'BUDTALL', 600, { cornice: 70, top_infill_mm: 40 });
  const run = runOf([tall]);
  const [segment] = corniceSegments(run, P);
  assert.ok(segment, 'the tall unit is a segment of one');

  // 1 — a WALL: the run's end is at the wall, so the moulding stops square.
  const atWall = segmentCornice(segment, {
    wall: 0, wallWidth: 600 + tall.params.width, roomHeight: 2700, frontFaceDepth: { left: 0, right: 0 },
  }, P);
  assert.equal(atWall.ends.right, 'wall');
  assert.equal(atWall.mitres.right, false);

  // 2 — OPEN: it turns the corner and returns to the back wall.
  const open = segmentCornice(segment, {
    wall: 0, wallWidth: 4000, roomHeight: 2700, frontFaceDepth: { left: 578, right: 578 },
  }, P);
  assert.equal(open.ends.right, 'open');
  assert.equal(open.mitres.right, true, 'the external 45° this app has cut since turn 22');
  assert.ok(open.returns.right > 0, '…and the return that goes with it');

  // 3 — a CORNER: the same open end, meeting another moulding of the same
  //     height at the same depth and the same top. It mitres, and it does NOT
  //     return — the moulding carries on round instead of stopping at a wall.
  const corner = segmentCornice(segment, {
    wall: 0,
    wallWidth: 4000,
    roomHeight: 2700,
    frontFaceDepth: { left: 578, right: 578 },
    neighbourAt: { left: null, right: at(70, 578, open.top) },
  }, P);
  assert.equal(corner.mitres.right, true);
  assert.equal(corner.corners.right.kind, 'corner');
  assert.equal(corner.corners.right.mitre, true);

  // 4 — a REFUSED corner: the same meeting, at another depth.
  const refused = segmentCornice(segment, {
    wall: 0,
    wallWidth: 4000,
    roomHeight: 2700,
    frontFaceDepth: { left: 578, right: 578 },
    neighbourAt: { left: null, right: at(70, 350, open.top) },
  }, P);
  assert.equal(refused.corners.right.refused, true);
  assert.equal(refused.mitres.right, true, 'the OPEN end’s own external mitre still stands');
  const said = corniceRefusals(refused);
  assert.equal(said.length, 1);
  assert.equal(said[0].side, 'right');
  assert.match(said[0].message, /350/);
});

test('F9.2/F9.3 — the corner is found ACROSS runs, which is why it exists at all', () => {
  // A wall unit and a tall unit are on different MOUNTS, so `buildRuns` puts
  // them in different runs by construction — which is precisely why CLAUDE.md
  // F9.3 speaks of "two runs meeting at an angle". `runCorniceParams` gathers
  // every segment in the room before deciding any of them.
  const tall = unitAt('t1', 'BUDTALL', 0, { cornice: 70, top_infill_mm: 40, height: 2100 });
  // Hung so its TOP is the tall unit's — which is the precondition F9.2 names:
  // "any adjacent cornice-bearing unit whose top edges meet".
  const draft = unitAt('w1', 'WUD', tall.params.width, { cornice: 70, top_infill_mm: 40 });
  const wall = unitAt('w1', 'WUD', tall.params.width, {
    cornice: 70,
    top_infill_mm: 40,
    mount_height: draft.params.mount_height + (unitTop(tall, P) - unitTop(draft, P)),
  });
  assert.equal(unitTop(wall, P), unitTop(tall, P), 'their top edges meet');
  const runs = [runOf([tall], 'floor'), runOf([wall], 'wall')];
  const params = runCorniceParams(runs, {
    walls: [{ width: 4000 }],
    roomHeight: 2700,
    units: [tall, wall],
    frontFaceDepthOf: (u) => (u.params.depth || 0),
  }, P);
  const a = params.get('t1');
  const b = params.get('w1');
  assert.ok(a && b, 'both runs carry a moulding');
  // They meet — the tall unit's right edge is the wall unit's left — and the
  // depths differ (578 against 350), which is the owner's own example.
  assert.ok(a.corners.right || b.corners.left, 'the two runs found each other');
  const refusals = [...corniceRefusals(a), ...corniceRefusals(b)];
  assert.ok(refusals.length > 0, 'and the mismatch is refused out loud');
  assert.match(refusals[0].message, /BLOCKERS #92/);
});

test('F9.4 — the BLOCKER is asked, in BLOCKERS.md, in the owner’s own terms', () => {
  const doc = readFileSync(new URL('../BLOCKERS.md', import.meta.url), 'utf8');
  const at2 = doc.indexOf('Gzyms między elementami o RÓŻNEJ głębokości');
  assert.ok(at2 > 0, 'the question is on the list');
  const entry = doc.slice(at2, at2 + 2000);
  assert.match(entry, /F9\.4/);
  assert.match(entry, /step/i);
  assert.match(entry, /carry the deeper line and return/i);
  assert.match(entry, /350/);
  assert.match(entry, /578/);
  assert.match(entry, /Co Piotr ma zdecydować/);
});

// ─── the toggle, end to end ─────────────────────────────────────────────────

test('F9.1 — and the option itself still resolves the way turn 22 left it', () => {
  assert.equal(corniceOption(0, P), 0);
  assert.equal(corniceOption(70, P), 70);
  assert.equal(corniceOption(100, P), 100);
  assert.equal(corniceOption(85, P), 0, 'a moulding this workshop does not buy is "none"');
});
