import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import * as THREE from 'three';

import { DEFAULT_CABINET_PROFILE as P, migrateCabinetProfile } from '../src/engine/profile.js';
import {
  applyHardwareFinish, hardwareFinishSpec, isPlasticMaterial,
} from '../src/3d/hardwareFinish.js';
import { clearHardwareRegistry, hardwareRows, reportHardware } from '../src/3d/hardwareRegistry.js';

// ─── TURN 23 · F2 (the hinge swings), F3 (the black cylinder), F4 (the finish),
//     and R7 (no DOM attributes on R3F objects) ───────────────────────────────

const src = (p) => readFileSync(new URL(`../src/${p}`, import.meta.url), 'utf8');

/**
 * The body of one function or component, for a claim about WHERE code sits.
 *
 * Cut at the next TOP-LEVEL declaration rather than by brace counting: the
 * first `{` of `function DoorHinges({ items, … })` is a destructuring pattern,
 * and a counter starting there closes after the parameter list.
 */
function block(text, marker) {
  const at = text.indexOf(marker);
  assert.notEqual(at, -1, `expected to find ${marker}`);
  const rest = text.slice(at + marker.length);
  const next = rest.search(/\n(?:export )?function |\n\/\*\*\n|\n\/\/ ─── /);
  return rest.slice(0, next < 0 ? rest.length : next);
}

// ─── F2 — the hinge swings with its door ───────────────────────────────────

test('F2.1 — the hinge BODY is drawn by the DOOR half, the plate by the carcass half', () => {
  const hardware = src('3d/Hardware.jsx');
  const door = block(hardware, 'export function DoorHinges(');
  const carcass = block(hardware, 'function CarcassHinges(');

  // The body — the model, the cup, the boss and the arm — hangs off the leaf.
  for (const piece of ['placeCup', 'placeBoss', 'placeArm', "kind: 'hinge'"]) {
    assert.match(door, new RegExp(piece.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `DoorHinges draws ${piece}`);
  }
  // …and the carcass half has none of them left.
  for (const piece of ['placeCup', 'placeBoss', 'placeArm']) {
    assert.doesNotMatch(carcass, new RegExp(piece), `CarcassHinges no longer draws ${piece}`);
  }
  assert.match(carcass, /kind: 'plate'/);
  assert.match(carcass, /placePlate/);
});

test('F2.1 — the body is placed in the DOOR\'s frame, which is what makes it swing', () => {
  const door = block(src('3d/Hardware.jsx'), 'export function DoorHinges(');
  // Every position in this component is backed out by the door group's pivot.
  assert.match(door, /mm\(items\[i\]\.x\) - pivot\[0\]/);
  assert.match(door, /local\(h\.x, h\.y, h\.z/);
});

test('F2.1 — the ROOM mounts the body inside the door group, with the specs', () => {
  const view = src('3d/UnitView.jsx');
  const mount = view.slice(view.indexOf('<DoorHinges'), view.indexOf('<DoorHinges') + 900);
  assert.match(mount, /specs=\{hingeSpecs\}/, 'the door half resolves the same hinge the plate does');
  assert.match(mount, /storageBase=\{storageBase\}/);
  assert.match(mount, /scope=\{p\.id\}/, 'one mount per leaf, so the registry names the door');
  // …and the pick gesture went with the arm.
  assert.match(mount, /onEditHinge=\{onEditHinge\}/);
});

test('F2.1 — the EDITOR mounts it the same way: one component, not a second path', () => {
  const editor = src('components/CabinetEditorModal.jsx');
  assert.match(editor, /import Hardware, \{ DoorHinges, hingeSpecsFor \}/);
  assert.match(editor, /<DoorHinges/);
  // …and it resolves the hinge through the ROOM's own function, so the editor
  // cannot show a different hinge (or finish) than the BOM orders.
  assert.match(editor, /hingeSpecsFor\(\{/);
  assert.match(editor, /finish: resolveHingeFinish\(storedDesign, profile\)/);
});

test('F2.2 — the knuckle rig is NAMED as future work, not approximated', () => {
  const door = src('3d/Hardware.jsx');
  assert.match(door, /RIG, NOT A TRANSFORM/i, 'the honest scope is written down');
  assert.match(door, /knuckle/i);
});

test('F2.3 — nothing new drives the swing: it is the door\'s own open value', () => {
  const hardware = src('3d/Hardware.jsx');
  const door = block(hardware, 'export function DoorHinges(');
  // No animation, no frame loop, no open/close arithmetic in the hinge half —
  // it is a child of the group that already animates.
  assert.doesNotMatch(door, /useFrame/);
  assert.doesNotMatch(door, /openFronts/);
});

test('F2.4 — the registry names both PARENTS', () => {
  clearHardwareRegistry();
  reportHardware('room', 'hinge', [{ key: 'FRONT', url: 'x.glb', model: true, parent: 'door' }], 'FRONT');
  reportHardware('room', 'plate', [{ key: 'FRONT', url: 'y.glb', model: true, parent: 'carcass' }], '');
  const rows = hardwareRows();
  assert.equal(rows.find((r) => r.family === 'hinge').parent, 'door');
  assert.equal(rows.find((r) => r.family === 'plate').parent, 'carcass');
  clearHardwareRegistry();
});

test('F2.4 — a row that says nothing about its parent is null, never guessed', () => {
  clearHardwareRegistry();
  reportHardware('room', 'runner', [{ key: '1L', url: null, model: false }], '');
  assert.equal(hardwareRows()[0].parent, null);
  clearHardwareRegistry();
});

// ─── F3 — the black cylinder ───────────────────────────────────────────────

test('F3 — the procedural cup and boss are GATED on "is a model drawn"', () => {
  const door = block(src('3d/Hardware.jsx'), 'export function DoorHinges(');
  // Three stand-ins, three gates. Before this turn the cup and the boss had
  // none, so they were drawn straight through the downloaded body — the drum.
  const stands = door.split('<Pieces').slice(1);
  assert.equal(stands.length, 3, 'the cup, the boss and the arm');
  for (const [i, piece] of stands.entries()) {
    const props = piece.slice(0, piece.indexOf('>'));
    assert.match(props, /visible=\{!drawnModel\}/, `stand-in ${i} stands down for a model`);
  }
});

test('F3 — the drum verdict is written into the code beside the fix', () => {
  const hardware = src('3d/Hardware.jsx');
  assert.match(hardware, /black drum/i);
  assert.match(hardware, /hinge-meshes\.md/, 'the code points at the mesh table that rules out the alternative');
});

test('F3 — the mesh-table tool reads a GLB by name, size and offset', async () => {
  const { parseGlb, meshTable, separationOf } = await import('../scripts/glb-meshes.mjs');
  const dir = new URL('./fixtures/hardware-local/hardware/hinges/blum/', import.meta.url);
  const hinge = readdirSync(dir).find((f) => f.startsWith('71B') && f.endsWith('.glb'));
  assert.ok(hinge, 'the silent showroom has a hinge in it');

  const glb = parseGlb(readFileSync(new URL(hinge, dir)));
  const rows = meshTable(glb);
  assert.ok(rows.length >= 4, 'a hinge is more than one mesh');
  for (const row of rows) {
    assert.equal(typeof row.mesh, 'string');
    assert.equal(row.size.length, 3);
  }
  // The whole point of the tool: a mesh clear of the rest of the model is
  // reported as such, and none of the showroom's is.
  rows.forEach((_, i) => assert.ok(separationOf(rows, i) <= 0, 'no orphan in the fixture'));
});

// ─── R8 — the silent showroom is dimensioned like the real family ──────────

test('R8 — the synthetic hinge fills the SAME box as the measured 71B3550', async () => {
  const { parseGlb, meshTable, overallBox } = await import('../scripts/glb-meshes.mjs');
  const dir = new URL('./fixtures/hardware-local/hardware/hinges/blum/', import.meta.url);
  const hinge = readdirSync(dir).find((f) => f.startsWith('71B') && f.endsWith('.glb'));
  const box = overallBox(meshTable(parseGlb(readFileSync(new URL(hinge, dir)))));

  // The numbers in profile.js beside `modelOrigin`, which is what makes the
  // SAME origin land the cup in its bore on the fixture and on the real file.
  assert.deepEqual(box.min, [-26.5, -28.5, -29.48]);
  assert.deepEqual(box.max, [11, 28.5, 51.3]);
  const C = P.hardware.hinge.cliptop;
  assert.equal(Math.round((box.min[0] - C.modelOrigin.x) * 100) / 100, -7.75, 'the cup centre lands on the drilled point');
  assert.equal(Math.round((box.min[2] - C.modelOrigin.z) * 100) / 100, 35.3, 'the flange plane lands on the door face');
  // …and it is small enough to be believed as a CLIP top (turn 19's guard).
  assert.ok(Math.max(...box.size) <= C.maxModelLengthMm);
});

test('R8 — the showroom manifest is the shape the bucket serves', async () => {
  const { parseHingeCatalogue } = await import('../src/engine/hinges.js');
  const raw = JSON.parse(readFileSync(
    new URL('./fixtures/hardware-local/hardware/hinges/blum/manifest.json', import.meta.url),
    'utf8',
  ));
  const cat = parseHingeCatalogue(raw);
  assert.ok(cat, 'the app\'s own parser reads it');
  assert.ok(cat.items.some((i) => i.role === 'hinge' && i.finish === 'nickel'));
  assert.ok(cat.items.some((i) => i.role === 'hinge' && i.finish === 'onyx'));
  assert.ok(cat.items.some((i) => i.role === 'plate_knockin5'));
  // The layers a hinge drills are a hard contract with the machine, and a
  // showroom that named others would be describing a different one.
  assert.equal(cat.rules.layers.cup, 'FRONT_HINGES_35MM');
  assert.equal(cat.rules.layers.plate_knockin5, 'HINGES_5MM');
});

test('R8 — the override base is the TOP slot of the resolution order', () => {
  const source = src('lib/hardwareSource.js');
  const base = src('lib/storageBase.js');
  assert.match(base, /HARDWARE_BASE_KEY = 'cc\.hardwareBase'/);
  assert.match(source, /OVERRIDE BASE\s+→\s+DB ROW\s+→\s+BUCKET MANIFEST\s+→\s+MOCK/);
  // …and it is read BEFORE the database row rather than after it.
  assert.ok(
    source.indexOf('0 — THE OVERRIDE') < source.indexOf('1 — THE DATABASE'),
    'the override outranks the row that would name files it is not serving',
  );
});

test('R8 — no Blum bytes: the showroom is generated, never checked in as a download', () => {
  const gen = readFileSync(new URL('../scripts/make-fixture-hardware.mjs', import.meta.url), 'utf8');
  assert.match(gen, /NO BLUM BYTES ENTER THIS REPOSITORY/);
  // Every vertex comes from this file's own arithmetic.
  assert.match(gen, /function box\(/);
  assert.match(gen, /function cylinderZ\(/);
});

// ─── F4 — the hinge wears its finish ───────────────────────────────────────

test('F4.1 — nickel and onyx are numbers in the profile, not in the renderer', () => {
  const C = P.hardware.hinge.cliptop;
  for (const id of ['nickel', 'onyx']) {
    const row = C.finishes.find((f) => f.id === id);
    assert.ok(row?.material, `${id} carries a material`);
    assert.match(row.material.colour, /^#[0-9a-f]{6}$/i);
    assert.ok(row.material.metalness > 0.5, 'a plated hinge is metal');
    assert.ok(row.material.roughness > 0 && row.material.roughness < 1);
  }
  assert.notEqual(
    C.finishes.find((f) => f.id === 'nickel').material.colour,
    C.finishes.find((f) => f.id === 'onyx').material.colour,
    'two finishes are two colours',
  );
});

test('F4.1 — the spec is picked by the project\'s finish, and falls back to the default', () => {
  assert.equal(hardwareFinishSpec(P, 'hinge', 'onyx').id, 'onyx');
  assert.equal(hardwareFinishSpec(P, 'hinge', 'ONYX').id, 'onyx', 'case is not a different finish');
  assert.equal(hardwareFinishSpec(P, 'hinge', null).id, 'nickel', 'the shop default');
  assert.equal(hardwareFinishSpec(P, 'hinge', 'chartreuse').id, 'nickel', 'a finish nobody stocks is not obeyed');
});

test('F4.2 — THE PLASTIC ALLOWLIST: named materials keep a plastic look', () => {
  const spec = hardwareFinishSpec(P, 'hinge', 'nickel');
  for (const name of ['plastic_black', 'POM.001', 'clip_lever', 'end_cap', 'Nylon']) {
    assert.equal(isPlasticMaterial(name, spec), true, `${name} is plastic`);
  }
  for (const name of ['metal_nickel_raw', 'steel', 'Material.002', '']) {
    assert.equal(isPlasticMaterial(name, spec), false, `${name} is not on the list`);
  }
});

test('F4.2 — it is an ALLOWLIST and not a blanket: metal is the safe default', () => {
  const spec = hardwareFinishSpec(P, 'hinge', 'onyx');
  const root = new THREE.Group();
  const metal = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial({ name: 'metal_nickel_raw' }));
  const lever = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial({ name: 'plastic_black' }));
  const anon = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial({ name: '' }));
  root.add(metal, lever, anon);

  const applied = applyHardwareFinish(root, spec);
  assert.equal(applied.length, 3);
  assert.equal(metal.material.color.getHexString(), '2a2b2e');
  assert.equal(metal.material.metalness, 0.9);
  assert.equal(lever.material.color.getHexString(), '1c1c1e');
  assert.equal(lever.material.metalness, 0.05, 'a chrome release lever is a hinge that does not exist');
  assert.equal(anon.material.color.getHexString(), '2a2b2e', 'an unnamed material takes the metal');
});

test('F4 — the CACHED SOURCE is never repainted: every material is cloned first', () => {
  const spec = hardwareFinishSpec(P, 'hinge', 'onyx');
  const shared = new THREE.MeshStandardMaterial({ name: 'metal_nickel_raw', color: '#ffffff' });
  const a = new THREE.Mesh(new THREE.BoxGeometry(), shared);
  const b = new THREE.Mesh(new THREE.BoxGeometry(), shared);
  applyHardwareFinish(a, spec);

  assert.equal(shared.color.getHexString(), 'ffffff', 'the source is untouched');
  assert.equal(b.material.color.getHexString(), 'ffffff', 'the other clone is untouched');
  assert.equal(a.material.color.getHexString(), '2a2b2e');
  assert.notEqual(a.material, shared);
  assert.equal(a.material.name, 'metal_nickel_raw', 'the name survives, so the allowlist still works downstream');
});

test('F4.3 — ONE override function, TWO families: the runner takes the same helper', () => {
  const spec = hardwareFinishSpec(P, 'runner', null);
  assert.ok(spec?.metal, 'the MOVENTO has one honest neutral metal');
  assert.ok(spec.metal.metalness > 0.5);
  // …and no invented Blum RAL values until the owner supplies them.
  assert.deepEqual(P.hardware.runner.movento.finishes, []);
  assert.match(src('3d/runnerModels.js'), /hardwareFinishSpec\(profile, 'runner'/);
  assert.match(src('3d/hingeModels.js'), /hardwareFinishSpec\(profile, 'hinge'/);
});

test('F4.4 — what was applied is recorded on the clone, for the registry to publish', () => {
  const hinge = src('3d/hingeModels.js');
  assert.match(hinge, /clone\.userData\.ccFinish = spec\?\.id/);
  const hardware = src('3d/Hardware.jsx');
  assert.match(hardware, /finish: models\[i\]\?\.model\?\.userData\?\.ccFinish/);
});

test('F4 — a profile saved before this turn comes back able to paint', () => {
  // A turn-19 profile: the finishes are there, with no `material` on them.
  const stored = migrateCabinetProfile({
    hardware: {
      hinge: {
        cliptop: {
          finishes: [
            { id: 'nickel', label: 'Nickel' },
            { id: 'onyx', label: 'Onyx' },
          ],
        },
      },
    },
  });
  assert.ok(hardwareFinishSpec(stored, 'hinge', 'onyx')?.metal, 'onyx still has numbers');
  assert.ok(hardwareFinishSpec(stored, 'runner', null)?.metal, '…and so does the runner');
  assert.ok(stored.hardware.hinge.cliptop.plasticMaterials.length);
});

// ─── R7 — no DOM attributes on R3F scene objects ───────────────────────────

test('R7 — no `data-*` on any three.js element in the whole tree', () => {
  // The ruler's marker threw on every render for two turns because of exactly
  // this, and the walk stayed green while it did. So it is a TEST, not a habit.
  // Tags that can ONLY be a three.js object — checked in every file.
  const INTRINSICS = [
    'group', 'mesh', 'primitive', 'instancedMesh', 'lineSegments', 'lineLoop',
    'points', 'sprite', 'bufferGeometry', 'boxGeometry', 'planeGeometry',
    'cylinderGeometry', 'sphereGeometry', 'ringGeometry', 'tubeGeometry',
    'circleGeometry', 'extrudeGeometry', 'shapeGeometry', 'edgesGeometry',
    'meshStandardMaterial', 'meshBasicMaterial', 'lineBasicMaterial',
    'lineDashedMaterial', 'spriteMaterial', 'meshPhysicalMaterial', 'shaderMaterial',
    'ambientLight', 'directionalLight', 'pointLight', 'spotLight', 'hemisphereLight',
    'perspectiveCamera', 'orthographicCamera', 'fog', 'canvasTexture',
  ];
  // …and `<line>`, which is an SVG element as often as an R3F one in this app
  // (the CNC sheet and the part drawing are full of them). Checked only where
  // every tag is a scene object.
  const SCENE_ONLY = ['3d'];

  const offences = [];
  const walk = (dirUrl, prefix, tag) => {
    for (const entry of readdirSync(dirUrl, { withFileTypes: true })) {
      if (entry.isDirectory()) { walk(new URL(`${entry.name}/`, dirUrl), `${prefix}${entry.name}/`, tag); continue; }
      if (!/\.jsx?$/.test(entry.name)) continue;
      const text = readFileSync(new URL(entry.name, dirUrl), 'utf8');
      for (const [whole, name] of text.matchAll(tag)) {
        // A mention inside a comment is a note about the rule, not a breach.
        if (/^\s*(\/\/|\*)/m.test(whole) && whole.includes('carried')) continue;
        if (/\bdata-[a-zA-Z]/.test(whole)) {
          offences.push(`${prefix}${entry.name}: <${name} … ${whole.match(/data-[a-zA-Z-]+/)[0]}>`);
        }
      }
    }
  };
  for (const root of ['3d', 'components', 'pages']) {
    const names = SCENE_ONLY.includes(root) ? [...INTRINSICS, 'line'] : INTRINSICS;
    walk(
      new URL(`../src/${root}/`, import.meta.url),
      `src/${root}/`,
      new RegExp(`<(${names.join('|')})\\b[^>]*?>`, 'gs'),
    );
  }
  assert.deepEqual(offences, [], 'anything a walk needs to find goes in userData');
});
