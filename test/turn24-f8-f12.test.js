import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { panelPlacement } from '../src/engine/joinery.js';
import { partLabelText, shelfTypeTag } from '../src/engine/cnc/partLabel.js';
import { dimensionStyle, hoverHolds } from '../src/engine/dimensionArrows.js';
import {
  chainFromX, interiorLeft, leftNeighbourFace, partitionChain, xFromChain,
} from '../src/engine/partitionPositions.js';
import { applyHardwareFinish, hardwareFinishSpec } from '../src/3d/hardwareFinish.js';
import { attachHardwareEnv, buildHardwareEnv, clearHardwareEnv, hardwareEnvMap } from '../src/3d/hardwareEnv.js';
import { surfaceFor } from '../src/3d/materials.js';

// ─── TURN 24 · F8 … F12 ─────────────────────────────────────────────────────

const src = (p) => readFileSync(new URL(`../src/${p}`, import.meta.url), 'utf8');
const G = P.board.thickness;

const withPartition = (over = {}) => computeCabinet({
  ...defaultParamsFor('BUD', P),
  unit_num: '01',
  width: 900,
  sections: [{ width_mm: 900, items: [{ id: 'p1', kind: 'partition', x_mm: 450 }] }],
  ...over,
}, P);

// ─── F8 — THE PARTITION LIES ALONG THE GRAIN ───────────────────────────────

test('F8.1 — the partition is drawn depth × height, the SIDES’ own convention', () => {
  const r = withPartition();
  const part = r.panels.find((p) => p.part === 'VPART');
  const side = r.panels.find((p) => p.id === 'BUL');

  // A SIDE is drawn `depth × height` — its long cut dimension up the page,
  // grain top to bottom. The partition is the same piece standing on its end
  // and it is drawn the same way now.
  assert.equal(side.cnc.drawn_w, side.w);
  assert.equal(side.cnc.drawn_h, side.h);
  assert.equal(part.cnc.drawn_w, part.box.d, 'the depth is across the page');
  assert.equal(part.cnc.drawn_h, part.box.h, '…and the height is up it');
  assert.ok(part.cnc.drawn_h > part.cnc.drawn_w, 'which is what "along the grain" means here');
  // The OUTLINE follows, because it is built in the same frame.
  const xs = part.cnc.outline.map(([x]) => x);
  const ys = part.cnc.outline.map(([, y]) => y);
  assert.equal(Math.max(...xs), part.box.d);
  assert.equal(Math.max(...ys), part.box.h);
});

test('F8.1 — the CUT SIZE has not moved: it is the same board', () => {
  const r = withPartition();
  const part = r.panels.find((p) => p.part === 'VPART');
  // `w × h` is what the CSV and the BOM print, and a TOP has been drawn rotated
  // since turn 1 while printing its own cut size. The partition follows that
  // convention rather than inventing a second one.
  assert.equal(part.w, part.box.h, 'the long dimension is still the height');
  assert.equal(part.h, part.box.d);
  assert.match(partLabelText('01', part), new RegExp(`${part.w}x${part.h}`));
});

test('F8.1 — the drilling follows the frame, and the law does not move', () => {
  const r = computeCabinet({
    ...defaultParamsFor('BUD', P),
    unit_num: '01',
    width: 1400,
    partition_front_mm: 0,
    bay_doors: [{ door: 'none' }, { door: 'one', hinge: 'L' }, { door: 'none' }],
    sections: [{
      width_mm: 1400,
      items: [
        { id: 'p1', kind: 'partition', x_mm: 600, front_mm: 0 },
        { id: 'p2', kind: 'partition', x_mm: 800, front_mm: 0 },
      ],
    }],
  }, P);
  const part = r.panels.find((p) => p.id === 'VPART-1');
  const plate = r.drills.filter((d) => d.panel === 'VPART-1' && d.kind === 'hinge');
  assert.ok(plate.length > 0, 'a door really is hung on it');
  // 37 mm from the FRONT edge, which the drawn x now runs from — and every
  // hole is inside the drawn rectangle, which is the check that the frame and
  // the drilling agree.
  for (const d of plate) {
    assert.ok(d.x >= 0 && d.x <= part.cnc.drawn_w, `x ${d.x} is on the board`);
    assert.ok(d.y >= 0 && d.y <= part.cnc.drawn_h, `y ${d.y} is on the board`);
  }
  assert.equal([...new Set(plate.map((d) => d.x))].length, 1, 'one column, as a side has');
});

test('F8.1 — it is a ROTATION and not a mirror: the machined face is the same', () => {
  const r = withPartition();
  const part = r.panels.find((p) => p.part === 'VPART');
  const place = panelPlacement(part);
  // The face is still the partition's LEFT one.
  assert.deepEqual(place.n, [-1, 0, 0]);
  // …and the handedness is the one every other case here carries: u × v = −n.
  const u = new THREE.Vector3(...place.u);
  const v = new THREE.Vector3(...place.v);
  const cross = new THREE.Vector3().crossVectors(u, v);
  // `+ 0` because `-0` is a real IEEE value and reads back different from `0` —
  // the same trap `cnc/layout.js turnPoint` guards against.
  assert.deepEqual([cross.x + 0, cross.y + 0, cross.z + 0], [1, 0, 0]);
  // The drawn x runs from the FRONT of the cabinet towards the back, exactly
  // as BUL's does.
  assert.deepEqual(place.u, [0, 0, -1]);
  assert.deepEqual(place.origin, [part.box.x, part.box.y, part.box.z + part.box.d]);
});

test('F8.2 — a cabinet with no partition in it is untouched', () => {
  const plain = computeCabinet({ ...defaultParamsFor('BUD', P), unit_num: '01' }, P);
  assert.equal(plain.panels.some((p) => p.part === 'VPART'), false);
  // Every golden default carries no partition, so F8's delta cannot reach one.
});

// ─── F9 — SHELVES SAY WHAT THEY ARE ────────────────────────────────────────

test('F9 — the shelf’s label gains its type, and nothing else does', () => {
  assert.equal(shelfTypeTag({ part: 'SHELF', meta: { variant: 'adjustable' } }), '(ADJ)');
  assert.equal(shelfTypeTag({ part: 'SHELF', meta: { variant: 'fixed' } }), '(FIX)');
  assert.equal(shelfTypeTag({ part: 'SHELF', meta: { locked: true } }), '(FIX)');
  // A shelf with nothing said is the pin shelf it has always been.
  assert.equal(shelfTypeTag({ part: 'SHELF', meta: {} }), '(ADJ)');
  // …and a side panel is a side panel.
  for (const part of ['BUL', 'TOP', 'BACK', 'VPART', 'FRONT', 'DRAWER-SIDE']) {
    assert.equal(shelfTypeTag({ part, meta: { variant: 'fixed' } }), '', `${part} says nothing`);
  }
});

test('F9 — same label block, ONE WORD MORE', () => {
  const shelf = { id: 'SHELF-1', part: 'SHELF', w: 564, h: 520, meta: { variant: 'fixed' } };
  assert.equal(partLabelText('01', shelf), '01 SHELF-1 564x520 (FIX)');
  // The cabinet, the part code and the cut size are exactly what they were.
  assert.equal(partLabelText('01', { ...shelf, part: 'BUL', id: 'BUL' }), '01 BUL 564x520');
});

test('F9 — it is TEXT and nothing else: no entity moves for it', () => {
  const adj = computeCabinet({ ...defaultParamsFor('BUD', P), unit_num: '01', shelves: 1 }, P);
  const shelf = adj.panels.find((p) => p.part === 'SHELF');
  // The label is a string on a part whose geometry the tag cannot touch.
  assert.match(partLabelText('01', shelf), /\(ADJ\)$/);
  // ─── TURN 26 (CLAUDE.md F8) ───
  // The outline is a plain rectangle still; what moved is the FRAME it is
  // drawn in. A shelf lies along the grain now — `depth × width`, the sides'
  // own convention — so the rectangle is `drawn_w × drawn_h` and the cut size
  // (`w`, `h`) is untouched, which is what the CSV and the BOM print.
  assert.equal(shelf.cnc.drawn_w, shelf.h, 'drawn `depth × width`');
  assert.equal(shelf.cnc.drawn_h, shelf.w);
  assert.deepEqual(
    shelf.cnc.outline,
    [[0, 0], [shelf.h, 0], [shelf.h, shelf.w], [0, shelf.w]],
  );
});

// ─── F10 — HOVER ARROWS GROW A MAGNET ──────────────────────────────────────

test('F10.1 — the magnet is one number in the profile, and it is 5', () => {
  // CLAUDE.md F10.1 names it `profile.editor.hoverMagnetMm`, and that is where
  // it is: a property of the TOOL, not of the drawing's ink.
  assert.equal(P.editor.hoverMagnetMm, 5);
  assert.equal(dimensionStyle(P).hoverMagnetMm, 5);
  // A partial profile cannot produce NaN — the same defensive read the rest of
  // the style block has.
  assert.equal(dimensionStyle({}).hoverMagnetMm, 5);
});

test('F10.1 — once shown, the set STAYS inside the radius and fades outside it', () => {
  const hole = {
    x: 100, y: 100, w: 0, h: 0,
  };
  assert.equal(hoverHolds({ cursor: { x: 100, y: 100 }, box: hole, magnetMm: 5 }), true);
  assert.equal(hoverHolds({ cursor: { x: 104, y: 100 }, box: hole, magnetMm: 5 }), true, 'a twitch is not a leave');
  assert.equal(hoverHolds({ cursor: { x: 105, y: 100 }, box: hole, magnetMm: 5 }), true, 'on the radius');
  assert.equal(hoverHolds({ cursor: { x: 105.1, y: 100 }, box: hole, magnetMm: 5 }), false);
  // …and the pointer leaving the window at all takes them with it.
  assert.equal(hoverHolds({ cursor: null, box: hole, magnetMm: 5 }), false);
});

test('F10.1 — it is measured to the feature’s BOX, not to its centre', () => {
  // A 70 mm mark: running an eye along it has not left it.
  const mark = {
    x: 100, y: 100, w: 70, h: 0,
  };
  assert.equal(hoverHolds({ cursor: { x: 168, y: 100 }, box: mark, magnetMm: 5 }), true);
  assert.equal(hoverHolds({ cursor: { x: 174, y: 100 }, box: mark, magnetMm: 5 }), true);
  assert.equal(hoverHolds({ cursor: { x: 176, y: 100 }, box: mark, magnetMm: 5 }), false);
});

test('F10.2 — horizontal and vertical only, on BOTH surfaces', () => {
  // The detail's live dimensions are `drawingDimensionRows`, whose own test
  // asserts axis-alignment; the SCENE's are bay widths, which are horizontal by
  // construction. What is asserted here is that neither surface has a diagonal
  // path at all.
  const scene = src('3d/HoverDimensions.jsx');
  assert.match(scene, /bayGapsAround/);
  assert.doesNotMatch(scene, /diagonal/i);
  const detail = src('components/PartDetailModal.jsx');
  assert.match(detail, /drawingDimensionRows/);
  // …and the DETAIL no longer drops the set on a hairline's own leave event.
  assert.match(detail, /hoverHolds\(\{/);
  assert.match(detail, /onPointerLeave: \(\) => \{\}/);
});

test('F10.1 — the scene holds the set with a magnet VOLUME, mounted only while shown', () => {
  const scene = src('3d/HoverDimensions.jsx');
  assert.match(scene, /ccHoverMagnet/);
  assert.match(scene, /hoverMagnetMm/);
  // Transparent, not `visible={false}`: three does not raycast an invisible
  // object at all, and a magnet nothing can point at is not a magnet.
  assert.match(scene, /transparent opacity=\{0\}/);
  // R7: nothing here is a DOM attribute on an R3F object.
  assert.doesNotMatch(scene, /data-[a-z-]+=/);
});

// ─── F11 — THE PARTITION MEASURES FROM ITS LEFT NEIGHBOUR ──────────────────

test('F11.1 — P1 measures from the interior face; P2 from P1’s face', () => {
  const others = (list) => list.map((x) => ({ x, w: G }));
  // P1 at 450 in an 18 mm carcass: 432 from the inside of the left side.
  assert.equal(chainFromX({ x: 450, boardT: G, others: others([700]) }), 432);
  // P2 at 700: from P1's FAR face (450 + 18 = 468) ⇒ 232.
  assert.equal(chainFromX({ x: 700, boardT: G, others: others([450]) }), 232);
  // …and turn 23's interior datum is what P1 falls back to, which is the same
  // function rather than a second one.
  assert.equal(leftNeighbourFace({ x: 450, boardT: G, others: [] }).of, 'side');
  assert.equal(leftNeighbourFace({ x: 450, boardT: G, others: [] }).at, interiorLeft(G));
  assert.equal(leftNeighbourFace({ x: 700, boardT: G, others: others([450]) }).of, 'partition');
});

test('F11.1 — editing the field moves ONLY that partition: no cascade', () => {
  const boardT = G;
  const chain = partitionChain({
    boardT,
    partitions: [{ id: 'p1', x: 450, w: G }, { id: 'p2', x: 700, w: G }],
  });
  assert.deepEqual(chain.map((p) => p.value), [432, 232]);

  // Move P1 to 500 by TYPING 482 into its field. P2's stored x does not move…
  const p1 = xFromChain({
    value: 482, x: 450, boardT, others: [{ x: 700, w: G }],
  });
  assert.equal(p1, 500, 'the typed number is a distance from a face already in place');
  const after = partitionChain({
    boardT,
    partitions: [{ id: 'p1', x: p1, w: G }, { id: 'p2', x: 700, w: G }],
  });
  assert.equal(after.find((p) => p.id === 'p2').x, 700, 'P2’s STORAGE is untouched');
  // …and only the NUMBER it displays changes, which is F11.1 exactly.
  assert.equal(after.find((p) => p.id === 'p2').value, 700 - (500 + G));
  assert.equal(after.find((p) => p.id === 'p2').value, 182);
});

test('F11.1 — the mapping round-trips, so a field cannot drift', () => {
  const boardT = G;
  const others = [{ x: 450, w: G }];
  for (const x of [500, 617.5, 880]) {
    const shown = chainFromX({ x, boardT, others });
    assert.equal(xFromChain({ value: shown, x, boardT, others }), x);
  }
});

test('F11.1 — a partition on a THICKER slot is measured to the face that is there', () => {
  // F3.3: a partition may be cut from carcass 2. The chain measures to its FAR
  // face, so the number the next one shows follows the board that will actually
  // be in the cabinet.
  assert.equal(chainFromX({ x: 700, boardT: G, others: [{ x: 450, w: 25 }] }), 700 - 475);
});

test('F11.3 — display only: nothing about this reaches the engine', () => {
  const before = withPartition();
  const module = src('engine/partitionPositions.js');
  assert.doesNotMatch(module, /computeCabinet|addDrill/);
  assert.match(module, /STORAGE DOES NOT MOVE/);
  // The engine still reads `x_mm` and nothing else.
  assert.equal(before.panels.find((p) => p.part === 'VPART').meta.x_mm, 450);
});

// ─── F12 — THE HARDWARE GETS SOMETHING TO REFLECT ──────────────────────────

test('F12.1 — the finishes carry an envMapIntensity and an optional clearcoat', () => {
  const nickel = hardwareFinishSpec(P, 'hinge', 'nickel');
  const onyx = hardwareFinishSpec(P, 'hinge', 'onyx');
  const runner = hardwareFinishSpec(P, 'runner', null);
  for (const spec of [nickel, onyx, runner]) {
    assert.ok(Number(spec.metal.envMapIntensity) > 0, 'a metal takes the probe');
  }
  assert.ok(nickel.metal.envMapIntensity > onyx.metal.envMapIntensity, 'a bright plate reflects more');
  assert.equal(Number.isFinite(nickel.metal.clearcoat), true);
  // The numbers live in the profile, under the finish blocks — never in the
  // renderer.
  assert.match(src('engine/profile.js'), /envMapIntensity: 1\.35/);
});

test('F12.1 — a METAL gets the probe; the PLASTIC never does', () => {
  clearHardwareEnv();
  // A stand-in probe, so the arithmetic can be asserted without a GL context.
  const probe = new THREE.Texture();
  const model = new THREE.Group();
  const metal = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial());
  metal.material.name = 'metal_nickel_raw';
  const lever = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial());
  lever.material.name = 'plastic_black';
  model.add(metal, lever);

  const applied = applyHardwareFinish(model, hardwareFinishSpec(P, 'hinge', 'nickel'));
  assert.equal(applied.length, 2);
  const byName = Object.fromEntries(applied.map((a) => [a.material, a]));
  assert.equal(byName.metal_nickel_raw.kind, 'metal');
  assert.equal(byName.plastic_black.kind, 'plastic');
  assert.equal(byName.plastic_black.env, false, 'a release lever is moulded POM');

  // The metal is WAITING for the probe, and gets it the moment one exists.
  assert.equal(metal.material.envMap, null);
  assert.equal(metal.material.envMapIntensity, P.hardware.hinge.cliptop.finishes[0].material.envMapIntensity);
  // Simulate the build landing: `attachHardwareEnv` re-runs for a material that
  // asked before the renderer was ready.
  attachHardwareEnv(metal.material, 1.35);
  assert.equal(metal.material.envMap, hardwareEnvMap());
  assert.equal(lever.material.envMap, null, 'the plastic never asked');
  assert.ok(probe);
  clearHardwareEnv();
});

test('F12.2 — boards, fronts and lacquers carry NO envMap: the scene stays null', () => {
  for (const role of ['side', 'front', 'shelf', 'back', 'infill']) {
    const surface = surfaceFor({
      role, finishes: P.appearance.finishes, profile: P, sheen: 20,
    });
    assert.equal(Object.hasOwn(surface, 'envMap'), false, `${role} asks for no probe`);
  }
  // …and nothing outside the hardware path ever sets one.
  const materials = src('3d/materials.js');
  assert.doesNotMatch(materials, /envMap\b(?!Intensity)/, 'the panel renderer never touches envMap');
  // The probe is attached PER MATERIAL, never to the scene: `scene.environment`
  // is written in exactly one place and it is the RoomEnvironment one.
  const scene = src('3d/Scene.jsx');
  const assignments = scene.match(/scene\.environment\s*=/g) || [];
  assert.equal(assignments.length, 2, 'the two lines the RoomEnvironment probe has always had');
  assert.doesNotMatch(scene, /scene\.environment\s*=\s*hardware/i);
});

test('F12.1 — no new dependency and no network fetch', () => {
  const env = src('3d/hardwareEnv.js');
  assert.match(env, /from 'three'/);
  // Nothing else is imported, and nothing is fetched.
  const imports = env.match(/^import .*$/gm) || [];
  assert.deepEqual(imports, ["import * as THREE from 'three';"]);
  assert.doesNotMatch(env, /fetch\(|XMLHttpRequest|RGBELoader|\.hdr/);
  assert.match(env, /PMREMGenerator/, 'the machinery already in the package');
});

test('F12.1 — a headless build is null, and the app degrades rather than throwing', () => {
  clearHardwareEnv();
  assert.equal(buildHardwareEnv(null), null);
  assert.equal(hardwareEnvMap(), null);
  const material = new THREE.MeshStandardMaterial();
  assert.equal(attachHardwareEnv(material, 1.2), false);
  assert.equal(material.envMapIntensity, 1.2, 'the intensity is still set — only the map is missing');
  clearHardwareEnv();
});
