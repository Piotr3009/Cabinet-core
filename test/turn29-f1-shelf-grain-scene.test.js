// ─── TURN 29 F1 — the shelf's grain, on the shelf the eye sees ──────────────
//
// The owner, walking turn 28's F7, with a screenshot: open carcasses, wood
// decor on the shelves, and the figure running LEFT–RIGHT across every one of
// them. *"na wizualizacji nie działa, na CNC było ok."*
//
// ─── WHAT TURN 28'S TEST ACTUALLY ASSERTED ──────────────────────────────────
//
// `test/turn28-f7-shelf-grain.test.js`, in its own words: *"the SCENE lays the
// scan front-to-back"* — and then `assert.equal(map.rotate, false)`. `rotate`
// is not a direction in the room; it is whether the IMAGE takes a quarter turn
// on its way to the face, and turn 8 decided that in a function that has never
// been shown an image.
//
// ─── THE APP PAINTS TWO FAMILIES OF WOOD, 90° APART ─────────────────────────
//
// Measured below, on the assets this repository ships:
//
//   the MANUFACTURER'S SCAN   EGGER's full-board photograph. Portrait, 3 685 ×
//                             7 937 px for a 1 310 × 2 800 mm sheet, and its
//                             figure runs DOWN the image — 2.5× smoother along
//                             V than across U on the shipped thumbnails.
//   OUR PROCEDURAL GRAIN      `scripts/gen-textures.mjs`, the fallback a decor
//                             with no scan and a machine with no network get.
//                             Its figure runs ALONG the image — 6.6× smoother
//                             along U than across it.
//
// Turn 8 wrote one mapping and it fits the SCANS. So every panel wearing the
// FALLBACK — which is every panel in the app whenever the bucket cannot be
// reached, and this sandbox's bucket answers 403 — had its figure exactly 90°
// out. On a shelf that is left-to-right across the board: the owner's picture.
//
// ─── AND IT EXPLAINS BOTH REPORTS, FOUR TURNS APART ─────────────────────────
//
//   turn 13  *"słoje na wieńcach biegną front-tył zamiast lewo-prawo"*
//   turn 29  the shelves run left-right instead of front-to-back
//
// A wieniec wants its grain along its face's U and a shelf along its V, so one
// mapping applied to the wrong family gets the two wrong in OPPOSITE
// directions. Turn 13 chased it into `applyBoxUVs` and fixed a real second
// fault there (the nesting reaching the texture) without touching this one,
// which is why it came back.
//
// ─── AND THIS TEST ASSERTS THE SURFACE ──────────────────────────────────────
//
// Not a flag. It builds the geometry the scene builds, lays the texture on it
// through `3d/materials.js applyDecorTransform` — the one function the mounted
// material's map goes through — inverts the resulting UV matrix, and asks which
// way the IMAGE's own grain axis points IN THE ROOM. That is the surface, in
// millimetres of cabinet, and it is the same read `scripts/e2e-turn29.mjs`
// performs on the mounted mesh in a live WebGL scene.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import * as THREE from 'three';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import {
  DECOR_GRAIN_TEXTURE, SCAN_GRAIN_AXIS, TILE_GRAIN_AXIS, decorMapping, grainRun, imageGrainAxis,
} from '../src/engine/decors.js';
import { applyDecorTransform, decorPlacement } from '../src/3d/materials.js';
import { joineryLayers } from '../src/engine/joinery.js';
import { panelSolids } from '../src/3d/panelSolid.js';
import { mm } from '../src/3d/constants.js';

const unit = (type, extra = {}) => computeCabinet({
  ...defaultParamsFor(type, P), unit_num: '01', ...extra,
}, P);

// The two finishes a decor panel can wear: the manufacturer's board scan, and
// the procedural grain a machine with no network falls back to (rule 7). They
// run 90° apart, which is the whole of F1 — so every claim below is made about
// BOTH, and a fix that served one of them would be a red test.
const SCAN = { texture: 'oak.jpg', scanAlongGrainMm: 1200 };
const TILE = { texture: DECOR_GRAIN_TEXTURE, repeatMm: 900 };

// ─── the proof behind IMAGE_GRAIN_AXIS ──────────────────────────────────────

/** An 8-bit PNG, decoded far enough to read luminance. No dependency. */
function decodePng(buf) {
  let at = 8;
  let w = 0;
  let h = 0;
  let colour = 0;
  const idat = [];
  while (at < buf.length) {
    const len = buf.readUInt32BE(at);
    const type = buf.toString('ascii', at + 4, at + 8);
    const data = buf.subarray(at + 8, at + 8 + len);
    if (type === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); colour = data[9]; }
    else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    at += len + 12;
  }
  const raw = inflateSync(Buffer.concat(idat));
  const channels = colour === 2 ? 3 : (colour === 6 ? 4 : 1);
  const stride = w * channels;
  const out = Buffer.alloc(stride * h);
  let p = 0;
  for (let y = 0; y < h; y += 1) {
    const filter = raw[p];
    p += 1;
    for (let i = 0; i < stride; i += 1) {
      const x = raw[p + i];
      const a = i >= channels ? out[y * stride + i - channels] : 0;
      const b = y > 0 ? out[(y - 1) * stride + i] : 0;
      const c = (y > 0 && i >= channels) ? out[(y - 1) * stride + i - channels] : 0;
      let v;
      if (filter === 0) v = x;
      else if (filter === 1) v = x + a;
      else if (filter === 2) v = x + b;
      else if (filter === 3) v = x + ((a + b) >> 1);
      else {
        const pa = Math.abs(b - c);
        const pb = Math.abs(a - c);
        const pc = Math.abs(a + b - 2 * c);
        v = x + ((pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c));
      }
      out[y * stride + i] = v & 0xFF;
    }
    p += stride;
  }
  return { w, h, channels, data: out };
}

/** How anisotropic an image is: the mean neighbour difference on each axis. */
function anisotropy(img) {
  const lum = (x, y) => img.data[(y * img.w + x) * img.channels];
  let du = 0;
  let dv = 0;
  for (let y = 1; y < img.h; y += 1) {
    for (let x = 1; x < img.w; x += 1) {
      du += Math.abs(lum(x, y) - lum(x - 1, y));
      dv += Math.abs(lum(x, y) - lum(x, y - 1));
    }
  }
  const n = (img.h - 1) * (img.w - 1);
  return { du: du / n, dv: dv / n };
}

test('F1 OUR grain runs along the image’s WIDTH — measured, not assumed', () => {
  // Wood is smooth ALONG the grain and busy across it: growth rings, pores and
  // the ray fleck all cut ACROSS. So the quiet axis is the grain's.
  for (const file of ['grain-neutral.png', 'dark-walnut.png', 'light-oak.png']) {
    const { du, dv } = anisotropy(decodePng(readFileSync(new URL(`../public/textures/${file}`, import.meta.url))));
    assert.ok(dv > du * 3, `${file}: the figure is stretched along U — ${du.toFixed(3)} vs ${dv.toFixed(3)}`);
  }
  assert.equal(TILE_GRAIN_AXIS, 'u', 'and the constant says what the pixels say');
  // …and it is ours and deliberate: the generator stretches the noise along x
  // and stacks the rings up v, which is the same sentence in source form.
  const gen = readFileSync(new URL('../scripts/gen-textures.mjs', import.meta.url), 'utf8');
  assert.match(gen, /Long, stretched features ALONG the grain \(x\)/);
  // Every tile texture in the app comes out of that one generator — there is no
  // second family hiding in the profile.
  const profileSrc = readFileSync(new URL('../src/engine/profile.js', import.meta.url), 'utf8');
  for (const m of profileSrc.matchAll(/texture: '([^']+)'/g)) {
    assert.match(m[1], /^textures\//, `${m[1]} is not one of ours`);
  }
});

test('F1 the MANUFACTURER’S scan runs down the image’s HEIGHT — also measured', () => {
  // "The thumbnail is the entire board scan reduced" (the EGGER licence note in
  // engine/decors.js), so the thumbnails carry the full scan's own proportions
  // and its own direction. They are 256 × 551 for a 3 685 × 7 937 scan.
  const raw = JSON.parse(readFileSync(new URL('../public/decors/egger/egger-decors.json', import.meta.url), 'utf8'));
  const rows = Array.isArray(raw) ? raw : raw.decors;
  const wood = rows.filter((d) => d.category === 'woodgrain' && d.dims);
  assert.ok(wood.length >= 1, `the pack carries scan dimensions (${wood.length} rows)`);
  for (const d of wood) {
    const [w, h] = d.dims.split('x').map(Number);
    assert.ok(h > w, `${d.id} is ${d.dims} — a board scan is PORTRAIT, taken along the board`);
  }
  // 2 800 mm down 7 937 px and 1 310 mm across 3 685 px is 2.83 px/mm both
  // ways: the scan is a 2 800 × 1 310 sheet, photographed along its length.
  const [pw, ph] = wood[0].dims.split('x').map(Number);
  assert.ok(Math.abs((ph / 2800) - (pw / 1310)) < 0.03,
    `${wood[0].dims}: ${(ph / 2800).toFixed(3)} px/mm down against ${(pw / 1310).toFixed(3)} across`);
  assert.equal(SCAN_GRAIN_AXIS, 'v');
  // …and `scanAlongGrainMm` is that height in millimetres of board, which is
  // the same fact already written down as a number.
  assert.equal(P.appearance.decor.scanHeightMm, 2800);
  // The pixel measurement itself needs a JPEG decoder and lives in the walk,
  // which has a browser: `scripts/e2e-turn29.mjs` reads a thumbnail into a
  // canvas and reports the two axes in `measurements.json`.
});

test('F1 the two families are told apart by how they are PLACED, with no new field', () => {
  assert.equal(imageGrainAxis(SCAN), 'v');
  assert.equal(imageGrainAxis(TILE), 'u');
  assert.equal(imageGrainAxis({ texture: 'x.png' }), 'u', 'no physical size means our own tile');
  // A mapping decides the BOARD and says nothing about any picture.
  const map = decorMapping({ w: 560, h: 18, d: 520 }, 520);
  assert.equal(map.rotate, undefined);
  assert.equal(map.grainAxis, 'v');
});

// ─── reading the SURFACE ────────────────────────────────────────────────────

/** The geometry the scene mounts for this panel — machined solid or plain box. */
function sceneGeometry(panel, result) {
  const layers = joineryLayers(P);
  const drills = (result.drills || []).filter((d) => d.panel === panel.id);
  const solid = panelSolids(panel, layers, P, drills).solid;
  return solid || new THREE.BoxGeometry(mm(panel.box.w), mm(panel.box.h), mm(panel.box.d));
}

/**
 * Which way the FIGURE runs on this panel's big face, as a direction in the
 * room — read off the geometry's own UVs and the texture's own matrix.
 *
 * @returns {{axis:'x'|'y'|'z', vector:number[]}}
 */
function grainInTheRoom(panel, result, surface) {
  const geometry = sceneGeometry(panel, result);
  const placement = decorPlacement(surface, panel, P);
  assert.ok(placement, 'a decor panel has a placement');
  // The very transform the mounted material's map carries.
  const tex = applyDecorTransform(new THREE.Texture(), placement);
  const inv = new THREE.Matrix3().copy(tex.matrix).invert().elements;
  // The image's own grain axis, as a DIRECTION in the geometry's uv space. A
  // direction ignores the matrix's translation column — and WHICH axis it is
  // depends on the finish, because the two families run 90° apart.
  const e = imageGrainAxis(surface) === 'u' ? [1, 0] : [0, 1];
  const guv = [inv[0] * e[0] + inv[3] * e[1], inv[1] * e[0] + inv[4] * e[1]];

  // The big face is the one the board's own normal points out of: the axis the
  // box is thinnest on.
  const extents = [panel.box.w, panel.box.h, panel.box.d];
  const thin = extents.indexOf(Math.min(...extents));
  const want = [0, 0, 0];
  want[thin] = 1;

  const pos = geometry.attributes.position;
  const uv = geometry.attributes.uv;
  const nrm = geometry.attributes.normal;
  const index = geometry.getIndex();
  const vertex = (t, k) => (index ? index.getX(t * 3 + k) : t * 3 + k);
  const triangles = (index ? index.count : pos.count) / 3;
  for (let t = 0; t < triangles; t += 1) {
    const a = vertex(t, 0);
    const b = vertex(t, 1);
    const c = vertex(t, 2);
    const n = [nrm.getX(a), nrm.getY(a), nrm.getZ(a)];
    if (Math.abs(n[thin] - want[thin]) > 1e-3) continue;
    const u0 = [uv.getX(a), uv.getY(a)];
    const d1 = [uv.getX(b) - u0[0], uv.getY(b) - u0[1]];
    const d2 = [uv.getX(c) - u0[0], uv.getY(c) - u0[1]];
    const det = d1[0] * d2[1] - d1[1] * d2[0];
    if (Math.abs(det) < 1e-12) continue;
    const p0 = [pos.getX(a), pos.getY(a), pos.getZ(a)];
    const p1 = [pos.getX(b) - p0[0], pos.getY(b) - p0[1], pos.getZ(b) - p0[2]];
    const p2 = [pos.getX(c) - p0[0], pos.getY(c) - p0[1], pos.getZ(c) - p0[2]];
    // The two world vectors one unit of u and one unit of v carry you along.
    const A = p1.map((v, i) => (d2[1] * v - d1[1] * p2[i]) / det);
    const B = p1.map((v, i) => (-d2[0] * v + d1[0] * p2[i]) / det);
    const dir = A.map((v, i) => v * guv[0] + B[i] * guv[1]);
    const len = Math.hypot(...dir);
    if (!(len > 1e-9)) continue;
    const unitDir = dir.map((v) => v / len);
    const big = unitDir.map(Math.abs);
    const axis = ['x', 'y', 'z'][big.indexOf(Math.max(...big))];
    return { axis, vector: unitDir };
  }
  throw new Error(`no ${['x', 'y', 'z'][thin]}-facing triangle on ${panel.id}`);
}

test('F1 THE LAW — a decor shelf’s grain runs FRONT-TO-BACK, on the mounted surface', () => {
  const r = unit('BUD', { shelves: 1 });
  const shelf = r.panels.find((p) => p.part === 'SHELF');
  for (const [what, surface] of [['scan', SCAN], ['fallback grain', TILE]]) {
    const { axis, vector } = grainInTheRoom(shelf, r, surface);
    assert.equal(axis, 'z', `${what}: front to back, along the cabinet's depth`);
    // …and it is FLAT on the board, not a diagonal that happens to lean that way.
    assert.ok(Math.abs(vector[0]) < 1e-6, `${what}: nothing of it runs across the shelf`);
  }
});

test('F1 …and the same rule puts every other board where the owner has already said it goes', () => {
  const r = unit('BUD', { shelves: 1, doors: { count: 1, hinge: 'L' } });
  const rd = unit('BUDR');
  const expected = [
    ['SHELF', 'z', 'turn 29: front to back, with the sheet'],
    ['TOP', 'x', 'turn 13: lewo-prawo, not front-tył'],
    ['BOTTOM', 'x', 'the same board the other way up'],
    ['BUL', 'y', 'turn 8: up the panel, not lying on its side'],
    ['BUR', 'y', 'and its twin'],
    ['FRONT', 'y', 'a door runs its figure up the door'],
  ];
  for (const [part, axis, why] of expected) {
    const panel = r.panels.find((p) => p.part === part);
    assert.ok(panel, `${part} is in the cabinet`);
    assert.equal(grainInTheRoom(panel, r, SCAN).axis, axis, `${part}: ${why}`);
    assert.equal(grainInTheRoom(panel, r, TILE).axis, axis, `${part}: ${why} (fallback)`);
  }
  // ─── TURN 36 (CLAUDE.md F5): AND THE DRAWER FRONT IS ANSWERED AT LAST ────
  //
  // This line asserted 'x': a drawer front is WIDE and short, so the SAW's own
  // rule laid its grain across the kitchen and nothing on the piece said
  // otherwise. The owner overruled that, verbatim: *"szuflady w pionie, wzdłuż
  // słojów; fronty szuflad też; plinth też."* A drawer front runs its figure
  // UP the front — the same sentence the door two rows above has carried since
  // turn 29 — and it says so on the piece (`engine/grain.js`), which
  // `engine/decors.js grainRun` names as "the only statement that could ever
  // beat the saw". The assertion flips rather than disappearing, so the record
  // of what the saw used to answer stays beside the law that overruled it.
  const df = rd.panels.find((p) => p.part === 'DRAWER-FRONT');
  assert.equal(grainInTheRoom(df, rd, SCAN).axis, 'y', 'a drawer front runs its figure up the front');
  assert.equal(grainInTheRoom(df, rd, TILE).axis, 'y', '…on the fallback image too');
});

test('F1 the shelf and the wieniec above it disagree, and that is the whole point', () => {
  const r = unit('BUD', { shelves: 1 });
  const shelf = r.panels.find((p) => p.part === 'SHELF');
  const top = r.panels.find((p) => p.part === 'TOP');
  // Two horizontal boards, both lying on their ±Y face, both mapped by the same
  // function — and the figure runs at right angles on them, because the SHEET
  // says so about one of them and the saw says so about the other.
  for (const surface of [SCAN, TILE]) {
    assert.equal(grainInTheRoom(shelf, r, surface).axis, 'z');
    assert.equal(grainInTheRoom(top, r, surface).axis, 'x');
  }
  // The BOARD's own statement is the same for both, and it is opposite on the
  // two pieces; the PICTURE's quarter turn is opposite between the two
  // families. Two independent facts, meeting once.
  assert.equal(decorMapping(shelf.box, grainRun(shelf).lengthMm).grainAxis, 'v');
  assert.equal(decorMapping(top.box, grainRun(top).lengthMm).grainAxis, 'u');
  assert.equal(decorPlacement(TILE, shelf, P).rotate, true);
  assert.equal(decorPlacement(SCAN, shelf, P).rotate, false);
});

test('F1 the banded edge is still the long FRONT one, and the grain still crosses it', () => {
  const r = unit('BUD', { shelves: 1 });
  const shelf = r.panels.find((p) => p.part === 'SHELF');
  assert.equal(shelf.edging.code, P.csv.codes.right, 'one long edge');
  assert.ok(Math.abs(shelf.edging.len_m - shelf.w / 1000) < 1e-9, 'and it is the width');
  assert.equal(grainRun(shelf).acrossMm, shelf.w, 'which the grain runs across');
});

test('F1 the SCAN path is turn 8’s arithmetic, unmoved — a working bucket sees no change', () => {
  // The scans were never the fault, and a fix that moved them would have broken
  // the picture the owner sees when the bucket answers. Both branches below are
  // the ones turn 8 shipped, asserted as numbers.
  const r = unit('BUD', { shelves: 1 });
  const shelf = r.panels.find((p) => p.part === 'SHELF');
  const placed = decorPlacement(SCAN, shelf, P);
  assert.equal(placed.rotate, false, 'a scan already runs down its own V, and so does the shelf');
  // No decoded image in node, so the aspect is 1 and along/across are equal;
  // what is asserted is WHICH face extent each repeat divides.
  assert.ok(Math.abs(placed.repeatX - shelf.box.w / SCAN.scanAlongGrainMm) < 1e-9,
    'repeat.x spans the face’s U — the WIDTH, across the grain');
  assert.ok(Math.abs(placed.repeatY - shelf.box.d / SCAN.scanAlongGrainMm) < 1e-9,
    '…and repeat.y its V — the DEPTH, along the grain');

  // A wieniec is the piece a scan HAS to be turned for, and that is turn 8's
  // own branch too.
  const top = r.panels.find((p) => p.part === 'TOP');
  const flat = decorPlacement(SCAN, top, P);
  assert.equal(flat.rotate, true);
  assert.ok(Math.abs(flat.repeatX - top.box.d / SCAN.scanAlongGrainMm) < 1e-9);
  assert.ok(Math.abs(flat.repeatY - top.box.w / SCAN.scanAlongGrainMm) < 1e-9);
});

test('F1 the TILE path is the one that moves, and a turned tile keeps its proportions', () => {
  // The fallback is what was wrong, and it is wrong in two ways at once: the
  // quarter turn was decided against the other family's convention, and the
  // repeats were divided the unturned way in both branches — which does not
  // turn the figure but STRETCHES it on any face that is not square.
  const r = unit('BUD', { shelves: 1 });
  const shelf = r.panels.find((p) => p.part === 'SHELF');
  const placed = decorPlacement(TILE, shelf, P);
  assert.equal(placed.rotate, true, 'our grain runs the other way and has to be turned');
  assert.ok(Math.abs(placed.repeatX - shelf.box.d / TILE.repeatMm) < 1e-9);
  assert.ok(Math.abs(placed.repeatY - shelf.box.w / TILE.repeatMm) < 1e-9);
  // One tile is the same number of millimetres in both directions on the board.
  const alongMm = shelf.box.d / placed.repeatX;
  const acrossMm = shelf.box.w / placed.repeatY;
  assert.ok(Math.abs(alongMm - acrossMm) < 1e-9, 'square on the board, as it is square in the file');
  // …and a wieniec takes our tile UNTURNED, which is the opposite of what it
  // does with a scan — two families, two answers, one rule.
  const top = r.panels.find((p) => p.part === 'TOP');
  assert.equal(decorPlacement(TILE, top, P).rotate, false);
  assert.equal(decorPlacement(SCAN, top, P).rotate, true);
});

test('F1 not one number of the CNC moved — this phase is a picture', () => {
  const r = unit('BUD', { shelves: 1 });
  const shelf = r.panels.find((p) => p.part === 'SHELF');
  // The frame turn 26 F8 set, the size the CSV prints, and the empty geometry.
  assert.equal(shelf.cnc.rotated, true);
  assert.equal(shelf.cnc.drawn_w, shelf.h);
  assert.equal(shelf.cnc.drawn_h, shelf.w);
  assert.equal(shelf.cnc.grain, 'h');
  assert.equal(shelf.w, 560);
  assert.equal(shelf.h, 520);
  assert.deepEqual(shelf.cnc.pockets, []);
  assert.deepEqual(shelf.cnc.holes, []);
  // …and the fix is where the SCENE reads it, not a second flag on the piece:
  // the engine's decor module and the view's materials, and nothing in the
  // export pipeline mentions the mapping at all.
  const layout = readFileSync(new URL('../src/engine/cnc/layout.js', import.meta.url), 'utf8');
  const dxf = readFileSync(new URL('../src/engine/cnc/dxf.js', import.meta.url), 'utf8');
  for (const src of [layout, dxf]) {
    assert.doesNotMatch(src, /decorMapping|IMAGE_GRAIN_AXIS|decorPlacement/);
  }
});
