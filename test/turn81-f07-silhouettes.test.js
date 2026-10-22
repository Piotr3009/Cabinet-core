/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T81 F7 . THE HARDWARE AS THE GLB IS: THE SILHOUETTES, TESTED
//
// CLAUDE.md T81 F7: "Tests test/turn81-f07-silhouettes.test.js: the file
// exists, names its sources, every family the registry draws has an entry or a
// fallback; the MOVENTO 500 side silhouette is about 500 long; the leg's front
// silhouette is as tall as the leg; the polylines are closed and in
// millimetres." The owner, 22.10.2026 (22:56): *"7 zrob wedlug glb"*.
//
// WHAT THIS SESSION COULD READ. The hardware bucket's host does not resolve
// here (getaddrinfo ENOTFOUND), so the committed file names every family with
// its reason and traces none. The tracer is proven on the SILENT SHOWROOM
// (test/fixtures/hardware-local: synthetic stand-ins dimensioned like the real
// files, "NO BLUM BYTES"), traced into a temp file that is never committed,
// and its placement is proven against the room's own 3d/* functions on the
// very same bytes.
//
// THE MOVENTO 500. The shop stops at NL450 (reference/hardware/movento.json;
// T43 iron rule 8: no showroom may stock a rung the shop does not). The
// kitchen's BUDR2 box of 490 asks NL500, a rung with no article, and the room
// draws no runner there (T43 F7). So the length law is asserted on every rung
// the shop stocks (the side silhouette is as long as the runner; NL450 the
// longest), and NL500 is asserted to be a named fallback, never an invented
// file.

import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import {
  mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

import { getCabinetProfile } from '../src/engine/profile.js';
import { hardwareInstances } from '../src/engine/hardware3d.js';
import {
  clearHingeCatalogue, hingeFamilies, hingeSpecsFor, resolveDoorHinge, setHingeCatalogue,
} from '../src/engine/hinges.js';
import {
  clearRunnerCatalogue, runnerAskFor, runnerEntry, runnerLadder,
} from '../src/engine/runners.js';
import { resolveHardwareCatalogue } from '../src/lib/hardwareSource.js';
import { wallGroups } from '../src/engine/drawings/wallElevation.js';
import { worktopsOnWall } from '../src/engine/drawings/setElevation.js';
import { projectRun } from '../src/engine/drawings/projector.js';
import {
  silhouetteEntries, silhouetteMark, silhouetteReader, silhouetteSource,
} from '../src/engine/drawings/silhouettes.js';
import { mm } from '../src/3d/constants.js';
import { clearGlbSources, glbSource } from '../src/3d/glbSource.js';
import { runnerModel } from '../src/3d/runnerModels.js';
import { foldMemberB, hingeMembers, hingeModel } from '../src/3d/hingeModels.js';
import { coneroClone } from '../src/3d/coneroModels.js';
import {
  RASTER, makeFetcher, resolveBase, serialise, traceRings,
} from '../scripts/t81-silhouettes.mjs';
import { t81Kitchen, setArgs } from '../scripts/t81-kitchen.mjs';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const SCRIPT = join(ROOT, 'scripts', 't81-silhouettes.mjs');
const SHOWROOM = 'test/fixtures/hardware-local';
const P = () => getCabinetProfile();
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const COMMITTED_TEXT = read('reference/hardware/silhouettes.json');
const COMMITTED = JSON.parse(COMMITTED_TEXT);

/** Every family the projector asks for, and the plinth clip CLAUDE.md names. */
const FAMILIES = ['hinge', 'plate', 'runner', 'rod', 'rail', 'support', 'kit', 'leg', 'knob', 'bar', 'plinth-clip'];
const PROCEDURAL = ['leg', 'rail', 'rod', 'support', 'knob', 'bar', 'plinth-clip'];

/** A silhouette's edge lands within the raster's half cell plus the simplification of the room's own. */
const TOL = RASTER.cellMm / 2 + RASTER.simplifyMm + 0.01;
/** ...and a size, two edges, within a cell plus the simplification. */
const TOL_SIZE = RASTER.cellMm + RASTER.simplifyMm + 0.01;
/** Every point of a contour lies on the raster's half cells. */
const onRaster = (v) => Math.abs(v / (RASTER.cellMm / 2) - Math.round(v / (RASTER.cellMm / 2))) < 1e-9;

const TMP = mkdtempSync(join(tmpdir(), 't81-f07-'));
after(() => rmSync(TMP, { recursive: true, force: true }));

/** The script, as a person runs it. */
function runScript(base, out) {
  const stdout = execFileSync(process.execPath, [SCRIPT, '--base', base, '--out', out, '--json'], { cwd: ROOT, encoding: 'utf8' });
  return { report: JSON.parse(stdout), text: readFileSync(out, 'utf8') };
}

let showroomRun = null;
/** The silent showroom traced once, into the temp folder. */
function showroom() {
  if (!showroomRun) {
    const out = join(TMP, 'showroom.json');
    const { report, text } = runScript(SHOWROOM, out);
    showroomRun = { out, report, text, doc: JSON.parse(text) };
  }
  return showroomRun;
}

const entriesOf = (doc, family) => doc.entries.filter((e) => e.family === family);
const isTraced = (e) => !e.fallback;
const flat = (rings) => rings.flat();
const span = (pts, k) => [Math.min(...pts.map((p) => p[k])), Math.max(...pts.map((p) => p[k]))];
function area(ring) {
  let s = 0;
  for (let i = 0; i + 1 < ring.length; i += 1) s += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1];
  return s / 2;
}
const near = (a, b, tol = TOL) => Math.abs(a - b) <= tol;

/** Every ring of every view of a traced entry (the CONERO's parts too). */
function ringsOf(e) {
  const out = [];
  const take = (views, where) => {
    for (const v of ['front', 'side', 'top']) for (const ring of views?.[v] || []) out.push({ where: `${where} ${v}`, ring });
  };
  take(e.views, e.key);
  for (const [name, part] of Object.entries(e.parts || {})) take(part.views, `${e.key}.${name}`);
  return out;
}

// === 1. THE COMMITTED FILE =================================================

test('F7 . the committed file exists, names its source, and is exactly what the script writes', () => {
  assert.equal(typeof COMMITTED.source, 'string');
  assert.match(COMMITTED.source, /hardware bucket|mirror of the hardware bucket|hardware files at/, 'the source names where the GLB came from');
  assert.equal(COMMITTED.generated?.by, 'scripts/t81-silhouettes.mjs');
  assert.match(String(COMMITTED.generated?.entriesSha256), /^[0-9a-f]{64}$/, 'no clock: the hash of the entries');
  assert.deepEqual(COMMITTED.raster, RASTER, 'the raster it was traced at: 0.5 mm, holes over 2 mm');
  // Byte for byte the serialiser's own answer for these entries: the file is
  // the script's output, never a hand edit.
  assert.equal(serialise(COMMITTED), COMMITTED_TEXT);
  assert.ok(Array.isArray(COMMITTED.entries) && COMMITTED.entries.length > 0);
});

test('F7 . every family the room draws has an entry: a traced model or a named fallback', () => {
  for (const family of FAMILIES) {
    assert.ok(entriesOf(COMMITTED, family).length > 0, `${family} has an entry`);
  }
  for (const e of COMMITTED.entries) {
    assert.ok(FAMILIES.includes(e.family), `${e.family} is a family the projector asks for`);
    assert.equal(typeof e.key, 'string');
    if (e.fallback) {
      assert.equal(e.fallback, 'symbol', `${e.family} ${e.key}`);
      assert.ok(typeof e.reason === 'string' && e.reason.length > 20, `${e.family} ${e.key} says why`);
      assert.equal(e.views, undefined, 'a fallback carries no geometry');
    } else {
      assert.match(e.file, /\.glb$/i, `${e.family} ${e.key} names its GLB`);
      assert.ok(String(e.path).endsWith(e.file), 'and where in the bucket it is');
      assert.match(e.sha256, /^[0-9a-f]{64}$/);
      for (const v of ['front', 'side', 'top']) assert.ok(Array.isArray(e.views?.[v]) && e.views[v].length > 0, `${e.key} ${v}`);
    }
  }
  // The procedural families say so in the room's own terms.
  for (const family of PROCEDURAL) {
    for (const e of entriesOf(COMMITTED, family)) {
      assert.equal(e.fallback, 'symbol', `${family} has no GLB`);
      assert.match(e.reason, family === 'plinth-clip' ? /drawn by the room nowhere/ : /procedurally \(3d\/Hardware\.jsx/);
    }
  }
  // The hinges and plates the room can draw, by the catalogue the file was made from.
  const cat = COMMITTED.catalogues?.hinges;
  assert.ok(cat, 'the file records which hinge catalogue it read');
  if (cat.source === 'mock') {
    // The bucket's manifest was silent: the in-repo catalogue of record answered, as it does in the app.
    setHingeCatalogue(JSON.parse(read('reference/hardware/cliptop-hinges.json')));
    const want = hingeFamilies({ role: 'hinge' }).map((f) => f.family).sort();
    assert.deepEqual(entriesOf(COMMITTED, 'hinge').map((e) => e.key).sort(), want, 'every hinge family the room can draw');
    const plates = P().hardware.hinge.cliptop.plates.filter((p) => p.enabled)
      .flatMap((p) => hingeFamilies({ role: p.id }).map((f) => f.family)).sort();
    assert.deepEqual(entriesOf(COMMITTED, 'plate').map((e) => e.key).sort(), plates, 'every plate the room can draw');
    clearHingeCatalogue();
  }
  // Every rung of the owner's ladder, in every variant the workshop offers.
  for (const nl of runnerLadder(P())) {
    for (const v of P().hardware.runner.movento.variants.map((x) => x.id)) {
      assert.ok(entriesOf(COMMITTED, 'runner').some((e) => e.nl === nl && e.variant === v), `NL${nl} ${v}`);
    }
  }
  for (const key of ['pulldown_rail', 'carousel', 'blind_pullout', 'placeholder']) {
    assert.ok(entriesOf(COMMITTED, 'kit').some((e) => e.key === key), `kit ${key}`);
  }
});

/** A traced entry's `room` numbers are the profile's own: a moved number means the script runs again. */
function assertRoomIsProfile(e) {
  const H = P().hardware.hinge;
  const C = H.cliptop;
  const M = P().hardware.runner.movento;
  if (e.family === 'hinge') {
    assert.deepEqual(e.room.datumMm, [C.fileDatum.x, C.fileDatum.y, C.fileDatum.z], `${e.key} datum`);
    assert.equal(e.room.fileHand, C.fileHand);
    assert.deepEqual(e.room.armSlide, C.rig.enabled
      ? { node: C.rig.armOffset.node, mm: [C.rig.armOffset.xMm, 0, C.rig.armOffset.zMm] } : null);
  } else if (e.family === 'plate') {
    assert.deepEqual(e.room.originMm, [C.plateOrigin.x, C.plateOrigin.y, C.plateOrigin.z], `${e.key} origin`);
    assert.equal(e.room.spinDeg, C.plateSpinDeg);
    assert.equal(e.room.biteMm, H.plateBiteMm);
  } else if (e.family === 'runner') {
    assert.deepEqual(e.room.originMm, [M.modelOrigin.x, M.modelOrigin.y, M.modelOrigin.z], `${e.key} origin`);
  } else if (e.family === 'kit') {
    assert.equal(e.room.bodyHeightMm, P().wardrobeAccessories.kits.pulldown_rail.bodyHeight);
  }
}

test('F7 . a traced model carries the room\'s placement numbers, and they are the profile\'s own', () => {
  for (const e of COMMITTED.entries.filter(isTraced)) assertRoomIsProfile(e);
  // Non-vacuous where this session can trace: the silent showroom.
  const traced = showroom().doc.entries.filter(isTraced);
  assert.ok(traced.length > 0);
  for (const e of traced) assertRoomIsProfile(e);
});

test('F7 . the reader reads the committed file: a family with no traced model answers null, every instance', () => {
  assert.equal(silhouetteSource(), COMMITTED.source);
  assert.deepEqual(silhouetteEntries(), COMMITTED.entries);
  const tracedFamilies = new Set(COMMITTED.entries.filter(isTraced).map((e) => e.family));
  const ids = t81Kitchen({ inframe: true });
  const a = setArgs();
  let asked = 0;
  for (const { unit, result } of a.entries) {
    const hw = hardwareInstances(result, P());
    const ask = [
      ...hw.legs.map((x) => ['leg', x]),
      ...hw.hinges.flatMap((x) => [['hinge', x], ['plate', x]]),
      ...hw.runners.map((x) => ['runner', { ...x, nominal: runnerAskFor(x.length, P()) ?? x.length }]),
      ...hw.rods.map((x) => ['rod', x]),
      ...hw.rails.map((x) => ['rail', x]),
      ...hw.shelfSupports.map((x) => ['support', x]),
      ...hw.kits.map((x) => ['kit', x]),
      ...(result.drillSummary?.handles || []).map((x) => [x.type === 'knob' ? 'knob' : 'bar', x]),
    ];
    for (const [family, inst] of ask) {
      const got = silhouetteMark(family, inst);
      if (!tracedFamilies.has(family)) assert.equal(got, null, `${unit.params.unit_num} ${family}: today's symbol`);
      else assert.ok(got === null || typeof got === 'function');
      asked += 1;
    }
  }
  assert.ok(asked > 20, 'the kitchen asked for its hardware');
  void ids;
});

// === 2. THE TRACER =========================================================

/** Rectangles as triangles: the cells of a grid of cuts, less the holes. */
function plateWithHoles(cutsX, cutsY, holes) {
  const tri = [];
  for (let i = 0; i + 1 < cutsX.length; i += 1) {
    for (let j = 0; j + 1 < cutsY.length; j += 1) {
      const [x0, x1, y0, y1] = [cutsX[i], cutsX[i + 1], cutsY[j], cutsY[j + 1]];
      const cx = (x0 + x1) / 2; const cy = (y0 + y1) / 2;
      if (holes.some(([a, b, c, d]) => cx > a && cx < b && cy > c && cy < d)) continue;
      tri.push(x0, y0, x1, y0, x1, y1, x0, y0, x1, y1, x0, y1);
    }
  }
  return tri;
}

test('F7 . the tracer: the outer contour counter-clockwise, the holes over 2 mm kept clockwise, the smaller gone', () => {
  // A 20 x 20 plate with a 6 mm hole, a 3 mm hole and a 1.5 mm hole.
  const holes = [[3, 9, 3, 9], [12, 15, 12, 15], [16, 17.5, 3, 4.5]];
  const tri = plateWithHoles([0, 3, 9, 12, 15, 16, 17.5, 20], [0, 3, 4.5, 9, 12, 15, 20], holes);
  const rings = traceRings(tri);
  const outer = rings.filter((r) => area(r) > 0);
  const inner = rings.filter((r) => area(r) < 0);
  assert.equal(outer.length, 1, 'one outer contour');
  assert.deepEqual([span(outer[0], 0), span(outer[0], 1)], [[0, 20], [0, 20]]);
  assert.ok(near(area(outer[0]), 400, 0.2), `the plate itself, to the raster (${area(outer[0])})`);
  assert.equal(inner.length, 2, 'the 6 and the 3 stay, the 1.5 goes');
  const boxes = inner.map((r) => [span(r, 0), span(r, 1)]).sort((p, q) => p[0][0] - q[0][0]);
  assert.deepEqual(boxes, [[[3, 9], [3, 9]], [[12, 15], [12, 15]]]);
  for (const r of rings) {
    assert.deepEqual(r[0], r[r.length - 1], 'closed: the first point again at the end');
    // Four sides and four quarter-cell cuts: a collinear run is one side.
    assert.ok(r.length <= 9, `a rectangle in ${r.length - 1} points`);
    assert.ok(r.every((p) => onRaster(p[0]) && onRaster(p[1])));
  }
});

test('F7 . the tracer: two cells touching at a corner are one contour; a slope is a few points, not a staircase', () => {
  // Two squares meeting at one corner (the contour walk's saddle).
  const tri = [...plateWithHoles([0, 2], [0, 2], []), ...plateWithHoles([2, 4], [2, 4], [])];
  const rings = traceRings(tri);
  assert.equal(rings.length, 1, 'one contour through the shared corner');
  assert.deepEqual([span(rings[0], 0), span(rings[0], 1)], [[0, 4], [0, 4]]);
  // The two cells meet through a neck a quarter cell either side of the corner, held as traced.
  for (const [x, y] of [[2, 1.75], [2.25, 2], [2, 2.25], [1.75, 2]]) {
    assert.ok(rings[0].some((p) => p[0] === x && p[1] === y), `the neck passes (${x}, ${y})`);
  }
  assert.ok(near(area(rings[0]), 8, 0.2), `two squares of 4 (${area(rings[0])})`);
  // A right triangle: the raster's staircase, simplified within half a cell.
  const slope = traceRings([0, 0, 20, 0, 0, 20]);
  assert.equal(slope.length, 1);
  assert.ok(slope[0].length <= 10, `a slope of ${slope[0].length - 1} points, not a staircase of eighty`);
  for (const [x, y] of slope[0]) {
    const off = Math.min(Math.abs(x), Math.abs(y), Math.abs(x + y - 20) / Math.SQRT2);
    assert.ok(off <= RASTER.cellMm, `(${x}, ${y}) lies on the triangle, within the raster`);
  }
});

// === 3. THE SILENT SHOWROOM, TRACED ========================================

test('F7 . the showroom traced: every runner as long as its rung; NL500 is a named fallback, never a file', () => {
  const { doc, report } = showroom();
  assert.match(doc.source, /test\/fixtures\/hardware-local/, 'the source names the mirror it read');
  assert.equal(report.catalogues.runners.source, 'bucket', 'the mirror\'s own manifest answered');
  const M = P().hardware.runner.movento;
  const runners = entriesOf(doc, 'runner');
  const traced = runners.filter(isTraced);
  assert.ok(traced.length >= 10, 'the stocked rungs are traced');
  for (const e of traced) {
    const side = flat(e.views.side);
    const [z0, z1] = span(side, 0);
    // The room's own fit (runnerModelFits) and the showroom's stand-in, which
    // is half a millimetre over the rung (scripts/make-fixture-hardware.mjs).
    assert.ok(Math.abs((z1 - z0) - e.nl) <= M.lengthTolerance, `${e.key}: ${z1 - z0} long`);
    assert.ok(near(z1 - z0, e.nl + 0.5, TOL_SIZE), `${e.key}: ${z1 - z0} for ${e.nl + 0.5}`);
    assert.deepEqual(e.hands, { L: false, R: true }, 'a pair file: the right hand is the left mirrored');
  }
  const longest = traced.reduce((a, b) => (b.nl > a.nl ? b : a));
  assert.equal(longest.key, 'NL450-S', 'the shop stops at NL450');
  const [z0, z1] = span(flat(longest.views.side), 0);
  assert.ok(near(z1 - z0, 450.5, TOL_SIZE), `the NL450 side silhouette is ${z1 - z0} long`);
  // THE MOVENTO 500: no article in the shop, so no file, so no silhouette.
  assert.ok(!JSON.parse(read('reference/hardware/movento.json')).items.some((r) => Number(r.nl) === 500));
  for (const v of ['T', 'S']) {
    const e = runners.find((x) => x.nl === 500 && x.variant === v);
    assert.equal(e?.fallback, 'symbol', `NL500 ${v}`);
    assert.match(e.reason, /no NL500 . article in the runner manifest/);
  }
  // The kitchen's BUDR2 asks NL500: the room draws no runner, the reader no silhouette.
  const reader = silhouetteReader(doc, { profile: P() });
  const ids = t81Kitchen({ inframe: true });
  const budr2 = setArgs().entries.find((x) => x.unit.id === ids.c);
  for (const rn of hardwareInstances(budr2.result, P()).runners) {
    const nominal = runnerAskFor(rn.length, P());
    assert.equal(nominal, 500, 'a 490 box asks NL500');
    assert.equal(reader.mark('runner', { ...rn, nominal }), null);
  }
});

test('F7 . the showroom traced: closed polylines on the 0.5 mm raster, in millimetres, holes over 2 mm only', () => {
  const { doc } = showroom();
  const traced = doc.entries.filter(isTraced);
  for (const e of traced) {
    for (const { where, ring } of ringsOf(e)) {
      assert.ok(ring.length >= 4, `${where}: a ring`);
      assert.deepEqual(ring[0], ring[ring.length - 1], `${where}: closed`);
      for (const p of ring) {
        assert.equal(p.length, 2);
        for (const v of p) {
          assert.ok(Number.isFinite(v), `${where}: a number`);
          assert.ok(onRaster(v), `${where}: ${v} is on the raster's half cells`);
        }
      }
      if (area(ring) < 0) {
        const pts = ring;
        assert.ok(span(pts, 0)[1] - span(pts, 0)[0] > RASTER.holeMinMm && span(pts, 1)[1] - span(pts, 1)[0] > RASTER.holeMinMm,
          `${where}: a hole over 2 mm`);
      }
    }
  }
  // Millimetres, not the file's metres: the 173L plate is 8.5 x 53 x 41.5.
  const plate = entriesOf(doc, 'plate').find((e) => e.key === '173L6100');
  assert.ok(plate && isTraced(plate));
  const size = (rings, k) => span(flat(rings), k)[1] - span(flat(rings), k)[0];
  const sized = (rings, a, b) => near(size(rings, 0), a, TOL_SIZE) && near(size(rings, 1), b, TOL_SIZE);
  assert.ok(sized(plate.views.front, 8.5, 53), 'front 8.5 x 53');
  assert.ok(sized(plate.views.side, 41.5, 53), 'side 41.5 x 53');
  assert.ok(sized(plate.views.top, 8.5, 41.5), 'top 8.5 x 41.5');
  assert.deepEqual(plate.bounds, { min: [-8.5, -26.5, -20.75], max: [0, 26.5, 20.75] }, 'the room\'s own box of the file');
});

test('F7 . re-runnable: the same mirror gives the same bytes', () => {
  const { text } = showroom();
  const again = runScript(SHOWROOM, join(TMP, 'showroom-again.json')).text;
  assert.equal(again, text);
  assert.equal(serialise(JSON.parse(text)), text);
});

// === 4. THE PLACEMENT IS THE ROOM'S OWN ===================================

/** A GLB's scene, as the room's loader builds it. */
function sceneOf(bytes) {
  const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  return new Promise((ok, fail) => new GLTFLoader().parse(ab, '', (gltf) => ok(gltf.scene), fail));
}

/** 3d/glbSource.js's own entry, filled as its loader fills it (the conero-rod-centre seeding). */
function seed(url, scene) {
  const box = new THREE.Box3().setFromObject(scene);
  const entry = glbSource(url);
  entry.scene = scene;
  entry.size = box.getSize(new THREE.Vector3());
  entry.centre = box.getCenter(new THREE.Vector3());
  entry.min = box.min.clone();
  entry.loaded = true;
  entry.failed = false;
}

/** The precise world box of a placed object, in millimetres. */
function boxMm(object) {
  object.updateMatrixWorld(true);
  const b = new THREE.Box3().setFromObject(object, true);
  return { min: [b.min.x, b.min.y, b.min.z].map((v) => v / mm(1)), max: [b.max.x, b.max.y, b.max.z].map((v) => v / mm(1)) };
}

/** The silhouette's rings against the room's box: every view's extents and its plane. */
function assertSameAsRoom(fn, room, label, { planes = true } = {}) {
  assert.equal(typeof fn, 'function', `${label}: a silhouette`);
  const front = flat(fn('front'));
  const plan = flat(fn('plan'));
  const section = flat(fn('section'));
  assert.deepEqual(fn('top-of-card'), fn('plan'));
  assert.equal(fn('perspective'), null);
  const check = (got, k, view) => {
    const [lo, hi] = span(got, k);
    assert.ok(near(lo, room.min[k]) && near(hi, room.max[k]),
      `${label} ${view} axis ${'xyz'[k]}: [${lo}, ${hi}] vs the room's [${room.min[k].toFixed(2)}, ${room.max[k].toFixed(2)}]`);
  };
  check(front, 0, 'front'); check(front, 1, 'front');
  check(plan, 0, 'plan'); check(plan, 2, 'plan');
  check(section, 2, 'section'); check(section, 1, 'section');
  if (!planes) return;
  // Each view's rings lie on the model's nearest face to that viewer.
  assert.ok(front.every((p) => near(p[2], room.max[2])), `${label}: the front rings at the model's front`);
  assert.ok(plan.every((p) => near(p[1], room.max[1])), `${label}: the plan rings at the model's top`);
  assert.ok(section.every((p) => near(p[0], room.min[0])), `${label}: the section rings at the model's near side`);
}

/** The engine's catalogues, read from the mirror exactly as the app reads the bucket. */
async function catalogues(base) {
  clearHingeCatalogue();
  clearRunnerCatalogue();
  const B = resolveBase(base);
  const { fetchLike } = makeFetcher();
  for (const family of ['hinges', 'runners']) {
    // eslint-disable-next-line no-await-in-loop
    await resolveHardwareCatalogue({
      family, profile: P(), readRow: async () => null, fetchImpl: fetchLike, storageBase: B.url, overrideBase: '',
    });
  }
  return B;
}

test('F7 . the hinge, the plate and the runner are set down where the room sets their models', async () => {
  const { doc } = showroom();
  const B = await catalogues(SHOWROOM);
  const reader = silhouetteReader(doc, { profile: P() });
  const prof = P();
  const C = prof.hardware.hinge.cliptop;
  const M = prof.hardware.runner.movento;
  const ids = t81Kitchen({ inframe: true });
  const entries = setArgs().entries;
  const of = (id) => entries.find((x) => x.unit.id === id);
  const fileBytes = (file, dir) => readFileSync(join(fileURLToPath(B.url), 'hardware', dir, file));
  const base = (f) => String(f || '').split('/').pop();

  // THE CASES: the BUD 600's left door, the BUD 800's right door, the same
  // left door on a 25 mm front (the 110 file and the rig's arm slide), two
  // runners of the BUDR2 on stocked rungs (the left, the right mirrored, a
  // 455 ask snapping to the NL450 S).
  const cases = [];
  for (const [id, side] of [[ids.a, 'L'], [ids.b, 'R']]) {
    const e = of(id);
    const h = hardwareInstances(e.result, prof).hinges.find((x) => x.side === side);
    const spec = hingeSpecsFor({
      result: e.result, unit: e.unit, finish: C.defaultFinish, plate: C.defaultPlate,
    })[h.panelId];
    cases.push({ kind: 'hinge', label: `hinge ${side}`, inst: h, file: base(spec.file) });
    cases.push({ kind: 'plate', label: `plate ${side}`, inst: h, file: base(spec.plateFile) });
  }
  const h25 = { ...hardwareInstances(of(ids.a).result, prof).hinges[0], thickness: 25 };
  cases.push({
    kind: 'hinge', label: 'hinge L, 25 mm front', inst: h25, file: base(resolveDoorHinge({ frontThickness: 25, finish: C.defaultFinish }).file),
  });
  const rns = hardwareInstances(of(ids.c).result, prof).runners;
  for (const [rn, nominal, variant] of [[rns.find((r) => r.side === 'L'), 400, null], [rns.find((r) => r.side === 'R'), 400, null], [rns.find((r) => r.side === 'R'), 455, 'S']]) {
    const v = variant || M.defaultVariant;
    const got = runnerEntry({
      system: M.system, nl: nominal, variant: v, side: rn.side, ladder: runnerLadder(prof),
    });
    cases.push({
      kind: 'runner', label: `runner ${rn.side} ask ${nominal} ${v}`, inst: { ...rn, nominal, ...(variant ? { variant } : {}) }, file: base(got.file), entry: got,
    });
  }
  assert.ok(cases.find((c) => c.label === 'hinge L, 25 mm front').file !== cases[0].file, 'the 25 mm front wears the other family');

  // The scenes first (the loader is asynchronous), then one synchronous block:
  // seeded, cloned and measured in the same tick (test/conero-rod-centre).
  const scenes = new Map();
  for (const c of cases) {
    const dir = c.kind === 'runner' ? join('runners', 'blum', 'movento') : join('hinges', 'blum');
    // eslint-disable-next-line no-await-in-loop
    if (!scenes.has(c.file)) scenes.set(c.file, await sceneOf(fileBytes(c.file, dir)));
  }
  clearGlbSources();
  for (const c of cases) {
    const url = `mem://t81-f07/${c.label}/${c.file}`;
    // A fresh decode per case: the room's clones never share a scene with another url.
    seed(url, scenes.get(c.file).clone(true));
    let placedRoom;
    if (c.kind === 'hinge') {
      // DoorHinges: member A and member B on the drilled cup at the seat, the door shut.
      const h = c.inst;
      const { cup, body } = hingeMembers(url, {
        profile: prof, plate: false, mirror: h.side !== C.fileHand, finish: null,
      });
      foldMemberB(body, prof, 0);
      placedRoom = new THREE.Group();
      const seat = Number.isFinite(Number(h.seatZ)) ? h.seatZ : h.z;
      for (const o of [cup, body]) {
        if (!o) continue;
        o.position.set(mm(h.x), mm(h.y), mm(seat));
        placedRoom.add(o);
      }
    } else if (c.kind === 'plate') {
      // CarcassHinges: the plate on the bearer's face, bitten into the side.
      const h = c.inst;
      placedRoom = hingeModel(url, {
        profile: prof, plate: true, mirror: h.dir === -1, finish: null,
      });
      placedRoom.position.set(mm(h.plateX - h.dir * prof.hardware.hinge.plateBiteMm), mm(h.y), mm(h.plateZ));
    } else {
      // Runners: the box corner on the instance point, the pair file mirrored for the right hand.
      const r = c.inst;
      placedRoom = runnerModel(url, { mirror: Boolean(c.entry.side == null && r.side === 'R'), profile: prof, finish: null });
      placedRoom.position.set(mm(r.x), mm(r.y), mm(r.z));
    }
    const room = boxMm(placedRoom);
    assertSameAsRoom(reader.mark(c.kind, c.inst), room, c.label);
  }
  clearGlbSources();
  clearHingeCatalogue();
  clearRunnerCatalogue();
});

// === 5. THE CONERO: THE ONE KIT BODY DRAWN FROM A GLB =====================

/** A GLB of named boxes (metres), one node and one mesh each: positions and indices only. */
function glbOfBoxes(boxes) {
  const chunks = [];
  let offset = 0;
  const bufferViews = []; const accessors = []; const meshes = []; const nodes = [];
  const push = (buf, target) => {
    const at = offset;
    chunks.push(buf); offset += buf.length;
    const pad = (4 - (offset % 4)) % 4;
    if (pad) { chunks.push(Buffer.alloc(pad)); offset += pad; }
    bufferViews.push({
      buffer: 0, byteOffset: at, byteLength: buf.length, target,
    });
    return bufferViews.length - 1;
  };
  for (const b of boxes) {
    const [x0, y0, z0] = b.min.map(Math.fround);
    const [x1, y1, z1] = b.max.map(Math.fround);
    const pos = new Float32Array([x0, y0, z0, x1, y0, z0, x1, y1, z0, x0, y1, z0, x0, y0, z1, x1, y0, z1, x1, y1, z1, x0, y1, z1]);
    const idx = new Uint16Array([0, 2, 1, 0, 3, 2, 4, 5, 6, 4, 6, 7, 0, 1, 5, 0, 5, 4, 3, 7, 6, 3, 6, 2, 0, 4, 7, 0, 7, 3, 1, 2, 6, 1, 6, 5]);
    const pv = push(Buffer.from(pos.buffer), 34962);
    const iv = push(Buffer.from(idx.buffer), 34963);
    accessors.push({
      bufferView: pv, componentType: 5126, count: 8, type: 'VEC3', min: [x0, y0, z0], max: [x1, y1, z1],
    });
    accessors.push({
      bufferView: iv, componentType: 5123, count: 36, type: 'SCALAR',
    });
    meshes.push({ name: b.name, primitives: [{ attributes: { POSITION: accessors.length - 2 }, indices: accessors.length - 1 }] });
    nodes.push({ name: b.name, mesh: meshes.length - 1 });
  }
  const json = {
    asset: { version: '2.0', generator: 'test/turn81-f07-silhouettes.test.js, a stand-in from measured extents' },
    scene: 0,
    scenes: [{ nodes: nodes.map((_, i) => i) }],
    nodes,
    meshes,
    accessors,
    bufferViews,
    buffers: [{ byteLength: offset }],
  };
  let text = Buffer.from(JSON.stringify(json), 'utf8');
  if (text.length % 4) text = Buffer.concat([text, Buffer.alloc(4 - (text.length % 4), 0x20)]);
  const bin = Buffer.concat(chunks);
  const head = Buffer.alloc(12);
  head.write('glTF', 0, 'ascii'); head.writeUInt32LE(2, 4); head.writeUInt32LE(12 + 8 + text.length + 8 + bin.length, 8);
  const jh = Buffer.alloc(8); jh.writeUInt32LE(text.length, 0); jh.write('JSON', 4, 'ascii');
  const bh = Buffer.alloc(8); bh.writeUInt32LE(bin.length, 0); bh.write('BIN\0', 4, 'ascii');
  return Buffer.concat([head, jh, text, bh, bin]);
}

// The CONERO's three named objects, at the extents the owner's file measured
// (30.08; test/conero-rod-centre.test.js: "these extents are its bytes, not
// an invention"), as boxes. A stand-in for the tracer, in a temp mirror only.
const CONERO = [
  { name: '3d-674367-674569-730mm', min: [-0.3650, -0.0106, -0.1498], max: [0.3650, 0.6873, -0.1081] },
  { name: '3d-238278-re', min: [0.2179, -0.0138, -0.2107], max: [0.4289, 0.6907, 0.0016] },
  { name: '3d-238278-li', min: [-0.4289, -0.0138, -0.2107], max: [-0.2179, 0.6907, 0.0016] },
];

test('F7 . the CONERO pull-down: coneroClone\'s three laws, per opening, where ConeroPulldown sets it', async () => {
  const prof = P();
  const kit = prof.wardrobeAccessories.kits.pulldown_rail;
  const mirror = join(TMP, 'conero-mirror');
  const bytes = glbOfBoxes(CONERO);
  mkdirSync(join(mirror, kit.conero.bucket, kit.conero.path), { recursive: true });
  writeFileSync(join(mirror, kit.conero.bucket, kit.conero.path, kit.conero.file), bytes);
  const doc = JSON.parse(runScript(mirror, join(TMP, 'conero.json')).text);
  const entry = doc.entries.find((e) => e.family === 'kit' && e.key === 'pulldown_rail');
  assert.ok(entry && isTraced(entry), 'the CONERO is traced from its file');
  assert.deepEqual(Object.keys(entry.parts).sort(), ['left', 'right', 'rod']);
  assert.equal(entry.room.unitToMm, 1000, 'coneroClone\'s own rule: under 5 units wide is metres');
  for (const { ring } of ringsOf(entry)) assert.deepEqual(ring[0], ring[ring.length - 1]);

  const scene = await sceneOf(bytes);
  for (const w of [560, 858, 900]) {
    const k = {
      body: 'pulldown_rail', x: 18, y: 1250, z: 20, w, h: 900, d: 540,
    };
    // ConeroPulldown, line for line: the clone, its fit, the inner group, the outer.
    clearGlbSources();
    const url = `mem://t81-f07/conero/${w}`;
    seed(url, scene.clone(true));
    const model = coneroClone(url, k.w, kit.bodyHeight);
    const u = model.userData.ccUnitToMm || 1;
    const fitBox = new THREE.Box3().setFromObject(model);
    const hMm = (fitBox.max.y - fitBox.min.y) * u;
    const dMm = (fitBox.max.z - fitBox.min.z) * u;
    const inner = new THREE.Group();
    inner.position.set(0, mm(k.h - hMm), mm(k.d / 2 - dMm / 2));
    inner.scale.set(mm(u), mm(u), mm(u));
    inner.add(model);
    const outer = new THREE.Group();
    outer.position.set(mm(k.x), mm(k.y), mm(k.z));
    outer.add(inner);
    // The whole body, then each part on its own: the rod stretched and centred, the arms on the sides.
    assertSameAsRoom(silhouetteReader(doc).mark('kit', k), boxMm(outer), `CONERO ${w}`);
    for (const [part, name] of [['rod', CONERO[0].name], ['right', CONERO[1].name], ['left', CONERO[2].name]]) {
      const only = { ...doc, entries: [{ ...entry, parts: { [part]: entry.parts[part] } }] };
      const node = outer.getObjectByName(name);
      assertSameAsRoom(silhouetteReader(only).mark('kit', k), boxMm(node), `CONERO ${w} ${part}`, { planes: false });
    }
  }
  clearGlbSources();
  // Any other kit body is the room's placeholder: no silhouette.
  assert.equal(silhouetteReader(doc).mark('kit', { body: 'carousel', x: 0, y: 0, z: 0, w: 400, h: 600, d: 400 }), null);
});

// === 6. THE LEG ============================================================

const lines = (r, pred) => r.entities.filter((e) => e.kind === 'line' && pred(e));

test('F7 . the leg has no model to trace, and its front silhouette is as tall as the leg', () => {
  for (const inframe of [true, false]) {
    t81Kitchen({ inframe });
    const a = setArgs();
    const group = wallGroups(a.entries, P())[0];
    const worktops = worktopsOnWall(a.worktops, 0);
    const views = [['xray', projectRun(group, {
      view: 'front', mode: 'xray', profile: P(), worktops,
    })]];
    // Without fronts and without the plinth that stands in front of them; under
    // in-frame the frame's bottom rail covers the top of a leg as it does in the room.
    if (!inframe) {
      views.push(['no-fronts', projectRun(group, {
        view: 'front', mode: 'no-fronts', profile: P(), worktops, skipSolid: (s) => s.role === 'plinth',
      })]);
    }
    let legsSeen = 0;
    let based = 0;
    for (const m of group.members) {
      const legH = Number(m.result.assemblies?.carcass?.legHeight) || 0;
      const legs = hardwareInstances(m.result, P()).legs;
      for (const leg of legs) assert.equal(silhouetteMark('leg', leg), null, 'the room draws the leg procedurally: today\'s symbol');
      if (!(legH > 0)) continue;
      based += 1;
      for (const [mode, r] of views) {
        const mine = lines(r, (e) => e.layer === 'LEG_BLOCK' && String(e.src).startsWith(`${m.unit.id}:hw:leg:`));
        const bySrc = new Map();
        for (const e of mine) bySrc.set(e.src, [...(bySrc.get(e.src) || []), e]);
        // The X-ray draws a line once: a back leg stands exactly behind a front
        // one, so the legs show as one per place along the run.
        const places = new Set(legs.map((l) => Math.round(l.x * 1000))).size;
        if (mode === 'xray') assert.equal(bySrc.size, places, `${m.unit.params.unit_num}: every leg shows through`);
        assert.ok(bySrc.size > 0, `${m.unit.params.unit_num} ${mode}: the legs are drawn`);
        for (const [src, es] of bySrc) {
          const ys = es.flatMap((e) => [e.y1, e.y2]);
          // From the floor to the carcass underside: the leg's own height.
          assert.ok(Math.abs(Math.min(...ys) - (m.base - legH)) < 1e-6, `${src} ${mode}: on the floor`);
          assert.ok(Math.abs(Math.max(...ys) - m.base) < 1e-6, `${src} ${mode}: under the carcass`);
          assert.ok(Math.abs((Math.max(...ys) - Math.min(...ys)) - legH) < 1e-6, `${src} ${mode}: ${legH} tall`);
          legsSeen += 1;
        }
      }
    }
    assert.equal(based, 3, 'the three base units stand on legs');
    assert.ok(legsSeen >= based * views.length * 2, `every base unit, every view (${legsSeen})`);
  }
});

// === 7. THE LETTER OF THE LAWS =============================================

test('F7 . the four files: ASCII, no em or en dash, the owner\'s header on the code', () => {
  const files = [
    'scripts/t81-silhouettes.mjs',
    'src/engine/drawings/silhouettes.js',
    'test/turn81-f07-silhouettes.test.js',
    'reference/hardware/silhouettes.json',
  ];
  for (const rel of files) {
    const text = read(rel);
    assert.doesNotMatch(text, /[\u2013\u2014]/, `${rel}: no em or en dash`);
    assert.doesNotMatch(text, /[^\x00-\x7f]/, `${rel}: ASCII`);
    if (!rel.endsWith('.json')) assert.ok(text.startsWith('/*\n * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.\n'), `${rel}: the header`);
  }
  // T37's sweep: the bite is the picture's, and no engine module names it.
  assert.doesNotMatch(read('src/engine/drawings/silhouettes.js'), /plateBiteMm/);
  // The reader is pure: it imports no React, no three.js, no store and nothing of the room's.
  const imports = read('src/engine/drawings/silhouettes.js').split('\n').filter((l) => /^import\b/.test(l));
  assert.ok(imports.length > 0);
  for (const l of imports) assert.doesNotMatch(l, /'(react|three)['/]|\/stores\/|\/3d\//, l);
});
