// ─── T78 · F8 · THE BI-FOLD CORNER DOOR ──────────────────────────────────────
//
// The owner, 11.10.2026: *"zawiasy podwojne czyli jedne drzwiczki do carcasu a
// pozniej zawiasy od drzwiczek do drzwiczek."*  CLAUDE.md T78 F8: a per-unit
// choice on the L (`corner_doors: 'pair' | 'bifold'`, default pair): in bifold
// leaf A hangs on SIDE-A with the family's hinges, leaf B hangs on leaf A's
// free edge with Blum's bi-fold corner hinge (CLIP top 60 degree); leaf B
// carries no carcass hinge, its cups are bored on its hinge edge toward leaf A
// by the catalogue's cup pattern. T78 law: a bought mechanism is a line and a
// body, never a hole, until its drilling is in reference/hardware with a page.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { bifoldHingeSpec, setBlumHingeFamilies, blumHingeFamilies } from '../src/engine/hinges.js';
import { HARDWARE_TO_PART_ID, PART_REGISTRY } from '../src/engine/partRegistry.js';
import { rectCorners } from '../src/engine/room.js';
import { useProjectStore } from '../src/stores/projectStore.js';

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(`${ROOT}${rel}`, 'utf8');
const S = () => useProjectStore.getState();
const U = (id) => S().units.find((u) => u.id === id);
const L = (extra = {}) => computeCabinet({
  ...defaultParamsFor('CORNER_L_BASE', P), unit_num: 'CL01', doors: true, ...extra,
}, P);
const near = (a, b, tol = 0.01) => Math.abs(a - b) <= tol;
const FILE = JSON.parse(read('reference/hardware/blum-hinges.json'));

test('F8 · the numbers: profile.corner.bifold proposes the fallback; the catalogue file is the word, every value owner to confirm', () => {
  assert.deepEqual(P.corner.bifold, { angleDeg: 60, label: 'CLIP top 60 degree bi-fold corner hinge' });
  setBlumHingeFamilies(null);
  const off = bifoldHingeSpec(P);
  assert.equal(off.loaded, false);
  assert.deepEqual([off.angleDeg, off.article, off.cupFromEdgeMm, off.cupDepthMm], [60, null, null, null]);
  assert.ok(setBlumHingeFamilies(FILE));
  const on = bifoldHingeSpec(P);
  assert.equal(on.loaded, true);
  assert.deepEqual([on.angleDeg, on.article, on.page, on.cupDiameterMm, on.companion], [60, '79T8500', 116, 35, '155 or 170']);
  // Today's file: the p. 117 planning table did not come through, so the cup
  // distance and depth are null, and null is NEVER read as zero.
  assert.equal(FILE.families.bifold.hinge.cup_on_leaf_b.drilling_distance_tb.value, null);
  assert.equal(on.cupFromEdgeMm, null);
  assert.equal(on.cupDepthMm, null);
  assert.equal(on.status, 'owner to confirm');
  assert.match(read('src/lib/hardwareCatalogue.js'), /setBlumHingeFamilies\(blumHinges\)/, 'the app loads the file');
  setBlumHingeFamilies(null);
  assert.equal(blumHingeFamilies(), null);
});

test('F8 · pair is the default and is what it was: A on SIDE-A, B on SIDE-B overlapping at the corner, six hinges', () => {
  const r = L();
  assert.equal(r.derived.corner_l.doors_mode, 'pair');
  const b = r.panels.find((p) => p.id === 'CL01-B-F');
  assert.equal(b.meta.hinge, 'L');
  assert.equal(b.meta.opensFirst, true);
  assert.equal(b.meta.bifold, undefined);
  assert.ok(near(b.box.z, 586) && near(b.w, 312.5));
  assert.equal(r.totals.hinges, 6);
  assert.deepEqual(r.drillSummary.hinged_sides, ['SIDE-A', 'SIDE-B']);
  assert.deepEqual(r.derived.corner_l.doors.map((d) => d.hinged_on), ['SIDE-A', 'SIDE-B']);
  assert.equal(r.hardware.some((h) => h.role === 'bifold_hinges'), false);
  assert.ok(r.warnings.some((w) => w.code === 'CORNER_L_OPENS_FIRST'));
});

test('F8 · bifold: leaf B hangs on leaf A\'s free edge, hinged at its inner edge, a gap off A\'s face; no carcass hinge, no plate on SIDE-B', () => {
  setBlumHingeFamilies(null);
  const r = L({ corner_doors: 'bifold' });
  const d = r.derived.corner_l.arm; const gap = P.doors.gap; const ft = P.front.thickness;
  assert.equal(r.derived.corner_l.doors_mode, 'bifold');
  const a = r.panels.find((p) => p.id === 'CL01-A-F');
  const b = r.panels.find((p) => p.id === 'CL01-B-F');
  // A: the covered leaf, to the corner, as in the pair; it carries B.
  assert.ok(near(a.box.x, d) && near(a.w, 340.5));
  assert.equal(a.meta.hinge, 'R');
  assert.deepEqual(a.meta.bifold, { child: 'CL01-B-F', companion: '155 or 170' });
  assert.equal(a.meta.coveredBy, undefined, 'nothing overlaps A in a bifold');
  // B: hinge edge toward A (the inner edge: 'R' in its own frame for the left hand), standing `gap` off A's face.
  assert.equal(b.meta.hinge, 'R');
  assert.ok(near(b.box.z, d + gap + ft + gap), `B's hinge edge at ${b.box.z}, A's face plus a gap is ${d + gap + ft + gap}`);
  assert.ok(near(b.box.z + b.box.d, 900 - gap / 2));
  assert.ok(near(b.w, (900 - gap / 2) - (d + gap + ft + gap)), `B is ${b.w} wide`);
  assert.equal(b.meta.cornerEdge.kind, 'bifold');
  assert.equal(b.meta.opensFirst, undefined);
  assert.deepEqual(b.meta.bifold, {
    parent: 'CL01-A-F', angleDeg: 60, dir: -1, hinge: 'CLIP top 60 degree bi-fold corner hinge',
  });
  assert.deepEqual(b.meta.swingZ, { dir: -1 }, 'the scene still knows B stands along z');
  // Holes: none of the bi-fold's on B while the page is unread; SIDE-B carries no plate; SIDE-A keeps its rows.
  assert.equal(r.drills.filter((x) => x.panel === 'CL01-B-F' && /cup/.test(x.kind)).length, 0);
  assert.equal(r.drills.filter((x) => x.panel === 'SIDE-B' && x.kind === 'hinge').length, 0);
  assert.equal(r.drills.filter((x) => x.panel === 'SIDE-A' && x.kind === 'hinge').length, 6);
  assert.deepEqual(r.drillSummary.hinged_sides, ['SIDE-A']);
  assert.deepEqual(r.derived.corner_l.doors.map((x) => x.hinged_on), ['SIDE-A', 'CL01-A-F']);
  // The BOM: A's three carcass hinges, three bi-fold hinges as a bought line; the parent's line for B is gone.
  assert.equal(r.totals.hinges, 3);
  const carcass = r.hardware.filter((h) => h.role === 'hinges');
  assert.equal(carcass.reduce((n, h) => n + h.qty, 0), 3);
  const bf = r.hardware.find((h) => h.role === 'bifold_hinges');
  assert.equal(bf.qty, 3);
  assert.equal(bf.spec.status, 'owner to confirm');
  assert.equal(bf.spec.cup_from_edge_mm, null);
  assert.match(bf.spec_label, /CLIP top 60 degree bi-fold corner hinge · 60 degrees · article: owner to confirm/);
  // Said once, in words.
  const said = r.warnings.filter((w) => w.code === 'CORNER_L_BIFOLD');
  assert.equal(said.length, 1);
  assert.equal(said[0].level, 'info');
  assert.match(said[0].message, /door B hangs on door A's free edge/);
  assert.match(said[0].message, /A line and a body, no hole: the cup pattern waits for the catalogue page/);
  assert.equal(r.warnings.some((w) => w.code === 'CORNER_L_OPENS_FIRST'), false);
  assert.equal(HARDWARE_TO_PART_ID.bifold_hinges, 'hinge_bifold');
  assert.ok(PART_REGISTRY.hinge_bifold);
});

test('F8 · the day the page is read: a cup distance in the file bores B\'s cups at that distance from its hinge edge, at the file\'s depth', () => {
  const filled = JSON.parse(JSON.stringify(FILE));
  filled.families.bifold.hinge.cup_on_leaf_b.drilling_distance_tb = { value: 22.5, page: 117, status: 'owner to confirm' };
  filled.families.bifold.hinge.cup_on_leaf_b.depth_catalogue = { value: 13, page: 117, status: 'owner to confirm' };
  assert.ok(setBlumHingeFamilies(filled));
  const r = L({ corner_doors: 'bifold' });
  const b = r.panels.find((p) => p.id === 'CL01-B-F');
  const cups = r.drills.filter((x) => x.panel === 'CL01-B-F' && x.kind === 'cup');
  assert.equal(cups.length, 3);
  // The front's drill frame is its back face (T76): a right-hinged leaf's
  // hinge edge is at x = 0 there, so the cup stands at the file's distance.
  assert.equal(b.meta.hinge, 'R');
  for (const c of cups) {
    assert.ok(near(c.x, 22.5), `cup at ${c.x} in the back-face frame: 22.5 from the hinge edge of a ${b.w} leaf`);
    assert.equal(c.depth, 13);
  }
  assert.match(r.warnings.find((w) => w.code === 'CORNER_L_BIFOLD').message, /Cups bored 22\.5 mm from B's hinge edge \(catalogue p\. 116, owner to confirm\)/);
  assert.equal(r.hardware.find((h) => h.role === 'bifold_hinges').spec.cup_from_edge_mm, 22.5);
  setBlumHingeFamilies(null);
});

test('F8 · the right hand is the mirror: B hinges at its inner edge (L), folds the other way', () => {
  setBlumHingeFamilies(null);
  const r = L({ corner_doors: 'bifold', corner_side: 'right' });
  const b = r.panels.find((p) => p.id === 'CL01-B-F');
  const d = r.derived.corner_l.arm; const gap = P.doors.gap; const ft = P.front.thickness;
  assert.equal(b.meta.hinge, 'L');
  assert.ok(near(b.box.x, 900 - d - gap - ft) && near(b.box.z, d + gap + ft + gap));
  assert.equal(b.meta.bifold.dir, 1);
  assert.deepEqual(b.meta.swingZ, { dir: 1 });
  assert.equal(r.drills.filter((x) => x.panel === 'SIDE-B' && x.kind === 'hinge').length, 0);
});

test('F8 · the scene nests leaf B in leaf A\'s swing group; the panel offers the choice; the store writes it', () => {
  const view = read('src/3d/UnitView.jsx');
  assert.match(view, /bifoldChild = null, parentPivot = null, \.\.\.handlers/);
  assert.match(view, /const bifold = front === 'door' && !drops && p\.meta\?\.bifold\?\.parent \? p\.meta\.bifold : null;/);
  assert.match(view, /const pivot = bifold \? \[mm\(p\.box\.x \+ p\.box\.w \/ 2\), mm\(p\.box\.y \+ p\.box\.h \/ 2\), mm\(p\.box\.z\)\]/, 'B hangs on its near end');
  assert.match(view, /&& !p\.meta\?\.bifold\?\.parent\)\.map\(\(p\) => \{/, 'the child is not drawn at top level');
  assert.match(view, /\{bifoldChild && \(\s*<MovingPanel\s*panel=\{bifoldChild\}\s*parentPivot=\{pivot\}/);
  assert.match(view, /const dir = bifold \? \(Number\(bifold\.dir\) \|\| 1\)/);
  const rp = read('src/components/RightPanel.jsx');
  assert.match(rp, /data-corner-doors="1"/);
  assert.match(rp, /corner_doors: e\.target\.value === 'bifold' \? 'bifold' : null/);
  assert.match(rp, /<option value="bifold">Bi-fold \(B hangs on A\)<\/option>/);
  // The store road.
  S().newProject();
  S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
  const l = S().addUnit('CORNER_L_BASE').id;
  S().addDoors(l);
  S().updateUnitParams(l, { corner_doors: 'bifold' });
  assert.equal(U(l).params.corner_doors, 'bifold');
  const r = computeCabinet(U(l).params, P);
  assert.equal(r.derived.corner_l.doors_mode, 'bifold');
  assert.deepEqual(r.derived.corner_l.doors.map((x) => x.hinged_on), ['SIDE-A', `${r.unitNum}-A-F`]);
  S().updateUnitParams(l, { corner_doors: null });
  assert.equal(computeCabinet(U(l).params, P).derived.corner_l.doors_mode, 'pair');
});

test('F8 · LISP IS LAW: KIT_CORNER_L_BIFOLD.lsp came first, balanced, ASCII, zero holes while the pattern is null', () => {
  const lsp = read('reference/lisp/KIT_CORNER_L_BIFOLD.lsp');
  assert.match(lsp, /CORNER_L_BIFOLD/);
  assert.match(lsp, /CLB:bifoldAngle/);
  assert.match(lsp, /CLB:patternReady/);
  assert.match(lsp, /blum-hinges\.json/);
  assert.equal(/[^\x00-\x7f]/.test(lsp), false, 'pure ASCII');
  // Balance: `test/turn35-lisp-parens.test.js` walks every reference/lisp/*.lsp with the house tokenizer.
  assert.ok(lsp.split('(').length > 100 && lsp.split(')').length > 100, 'a kit, not a stub');
});

test('F8 · the golden', () => {
  const golden = JSON.parse(read('fixtures/golden-corner-l-bifold.json'));
  assert.equal(golden.meta.F, 'F8');
  assert.equal(golden.params.corner_doors, 'bifold');
});
