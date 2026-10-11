// ─── T78 · F12 · THE GLASS IS IN THE DOOR; SMOKE BY DEFAULT, WITH A CHOICE ───
//
// The owner, 11.10.2026: *"szyba powinna byc smoke, i powinna byc na
// drzwiczkach a nie gdzies na scianie"*; *"domyslnie smoke ale z wyborem."*
// The probe (verify/t78/f12-probe.md): the pane backed only the pivot out of
// the swing group with nothing of the leaf's box in it, so it stood at the
// unit's origin, in the wall plane, and turned about the hinge into the
// carcass. Fix: the pane takes the mirror's formula (the leaf's own centre
// backed out of the pivot) and swings with the leaf. The kind is a CHOICE
// per door (the Doors section), the BOM line names it, the scene tints it;
// retail chooses it in the FRONTS step for the GL style.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { migrateDesign } from '../src/engine/design.js';
import { rectCorners } from '../src/engine/room.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import * as A from '../src/retail/design/adapter.js';

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(`${ROOT}${rel}`, 'utf8');
const S = () => useProjectStore.getState();
const leafOf = (r) => r.panels.find((p) => p.part === 'FRONT' && p.meta?.glass);

test('F12 · the numbers: three kinds, smoke the owner\'s default, the pane 4 mm proposed; all in the profile', () => {
  assert.deepEqual(P.front.glass.kinds, ['clear', 'smoke', 'reeded']);
  assert.equal(P.front.glass.default, 'smoke');
  assert.equal(P.front.glass.paneMm, 4);
  assert.match(read('src/engine/profile.js'), /default: 'smoke',\s*\/\/ owner 11\.10\.2026, decided/);
  assert.match(read('src/engine/profile.js'), /paneMm: 4,\s*\/\/ T78 proposed, owner to confirm/);
});

test('F12 · the pane sits in the door\'s own frame, like the mirror: the leaf\'s centre backed out of the pivot', () => {
  const view = read('src/3d/UnitView.jsx');
  const at = view.indexOf('{p.meta?.glass && (');
  assert.ok(at > 0);
  const block = view.slice(at, at + 1200);
  assert.match(block, /mm\(p\.box\.x \+ p\.box\.w \/ 2\) - pivot\[0\],\s*mm\(p\.box\.y \+ p\.box\.h \/ 2\) - pivot\[1\],\s*mm\(p\.box\.z \+ p\.box\.d \/ 2\) - pivot\[2\],/);
  assert.equal(/-pivot\[0\] \+ mm\(\(p\.meta\.glass\.frame/.test(view), false, 'the old formula is gone');
  assert.match(block, /mm\(p\.meta\.glass\.paneMm \|\| GLASS_PANE_MM\)/);
  assert.match(block, /paneMaterialFor\(p\.meta\.glass\.kind\)/);
  assert.match(view, /reeded: \{/);
  assert.match(view, /function reededNormalMap\(\)/, 'reeded: a ridge normal map drawn in code, no new dependency');
});

test('F12 · the engine: smoke by default, the door\'s own kind wins over the unit\'s, the BOM line names the kind', () => {
  const r = computeCabinet({ ...defaultParamsFor('WUD_GLASS', P), unit_num: 'WG01', doors: true }, P);
  const leaf = leafOf(r);
  assert.ok(leaf);
  assert.equal(leaf.meta.glass.kind, 'smoke');
  assert.equal(leaf.meta.glass.paneMm, 4);
  const line = r.hardware.filter((h) => h.role === 'glass_pane');
  assert.equal(line.length, 1);
  assert.equal(line[0].label, 'Smoked glass 4 mm');
  assert.deepEqual([line[0].spec.kind, line[0].spec.pane_mm], ['smoke', 4]);
  assert.match(line[0].spec_label, /mm aperture/);
  const unitWide = computeCabinet({ ...defaultParamsFor('WUD_GLASS', P), unit_num: 'WG01', doors: true, glass_kind: 'clear' }, P);
  assert.equal(leafOf(unitWide).meta.glass.kind, 'clear');
  assert.equal(unitWide.hardware.find((h) => h.role === 'glass_pane').label, 'Clear glass 4 mm');
  const perDoor = computeCabinet({
    ...defaultParamsFor('WUD_GLASS', P), unit_num: 'WG01', doors: true, glass_kind: 'clear', door_glass: { [leaf.id]: 'reeded' },
  }, P);
  assert.equal(leafOf(perDoor).meta.glass.kind, 'reeded');
  assert.equal(perDoor.hardware.find((h) => h.role === 'glass_pane').label, 'Reeded glass 4 mm');
  const bad = computeCabinet({ ...defaultParamsFor('WUD_GLASS', P), unit_num: 'WG01', doors: true, glass_kind: 'mirror' }, P);
  assert.equal(leafOf(bad).meta.glass.kind, 'smoke', 'a kind the profile does not know falls to the default');
  // Two leaves of two kinds are two order lines; two of one kind, one line of two.
  const two = computeCabinet({ ...defaultParamsFor('WARDROBE', P), unit_num: 'W01', front_type: 'GL', doors: { count: 2 } }, P);
  const leaves = two.panels.filter((p) => p.part === 'FRONT' && p.meta?.glass);
  assert.equal(leaves.length, 2);
  assert.equal(two.hardware.filter((h) => h.role === 'glass_pane').reduce((n, h) => n + h.qty, 0), 2);
  const mixed = computeCabinet({
    ...defaultParamsFor('WARDROBE', P), unit_num: 'W01', front_type: 'GL', doors: { count: 2 }, door_glass: { [leaves[0].id]: 'clear' },
  }, P);
  assert.deepEqual(mixed.hardware.filter((h) => h.role === 'glass_pane').map((h) => [h.label, h.qty]).sort(), [['Clear glass 4 mm', 1], ['Smoked glass 4 mm', 1]]);
});

test('F12 · PRO: the Doors section offers the kind per leaf (a choice, no number); the store writes door_glass', () => {
  const rp = read('src/components/RightPanel.jsx');
  assert.match(rp, /data-leaf-choices="1"/);
  assert.match(rp, /data-door-glass=\{p\.id\}/);
  assert.match(rp, /door_glass: \{ \.\.\.\(unit\.params\.door_glass \|\| \{\}\), \[p\.id\]: e\.target\.value \}/);
  assert.equal(/type="number"[^>]*glass/i.test(rp), false);
  S().newProject();
  S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
  const g = S().addUnit('WUD_GLASS').id;
  S().addDoors(g);
  const leaf = leafOf(S().unitResult(g));
  S().updateUnitParams(g, { door_glass: { [leaf.id]: 'clear' } });
  assert.equal(leafOf(S().unitResult(g)).meta.glass.kind, 'clear');
});

test('F12 · retail: the FRONTS step chooses the glass for the GL style through the adapter; the design carries it; a unit\'s own wins', () => {
  const options = read('src/retail/design/Options.jsx');
  assert.match(options, /\{style === 'GL' && \(\s*<Field label="GLASS" block>/);
  assert.match(options, /data-testid=\{`fronts-glass-\$\{k\.id\}`\}/);
  assert.match(options, /onClick=\{\(\) => A\.setGlassKind\(k\.id\)\}/);
  assert.deepEqual(A.glassKinds().map((k) => k.id), ['clear', 'smoke', 'reeded']);
  assert.equal(A.glassKinds()[1].label, 'Smoked glass');
  S().newProject();
  S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
  const g = S().addUnit('WUD_GLASS').id;
  S().addDoors(g);
  assert.equal(A.glassKind(), 'smoke', 'nobody has said: smoke');
  assert.equal(A.setGlassKind('clear'), 'clear');
  assert.equal(S().project.design.fronts.glassKind, 'clear');
  assert.equal(migrateDesign(S().project.design).fronts.glassKind, 'clear', 'the design keeps the word through migration');
  assert.equal(leafOf(S().unitResult(g)).meta.glass.kind, 'clear', 'the project\'s choice reaches the leaf');
  assert.equal(S().unitResult(g).hardware.find((h) => h.role === 'glass_pane').label, 'Clear glass 4 mm');
  S().updateUnitParams(g, { glass_kind: 'reeded' });
  assert.equal(leafOf(S().unitResult(g)).meta.glass.kind, 'reeded', 'the unit\'s own wins');
  assert.equal(A.setGlassKind('nothing'), 'smoke', 'an unknown word falls to the default');
});
