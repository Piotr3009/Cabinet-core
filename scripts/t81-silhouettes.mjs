/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */
// T81 F7 . THE HARDWARE AS THE GLB IS: SILHOUETTES TRACED FROM THE ROOM'S MODELS
//
// The owner, 22.10.2026 (22:56), of the hardware on the sections: *"7 zrob
// wedlug glb"*. CLAUDE.md T81 F7: for every hardware family the room draws,
// load the GLB the registry names (the same file the room loads), project its
// triangles onto the three planes in the model's own millimetres, rasterise at
// 0.5 mm, trace the outer contour and the holes larger than 2 mm into closed
// polylines, and write `reference/hardware/silhouettes.json`. A family the
// room draws procedurally, or whose GLB cannot be read, gets
// `fallback: "symbol"` and its reason, and the sheet draws today's symbol.
//
//     node scripts/t81-silhouettes.mjs                     # the live bucket
//     node scripts/t81-silhouettes.mjs --base <dir|url>    # a mirror of it
//     node scripts/t81-silhouettes.mjs --out <file> --json
//
// WHICH FILE. Never a list of this script's own: the app's answer, by the
// app's functions. The catalogues are resolved as the app resolves them
// (`lib/hardwareSource.js resolveHardwareCatalogue`: the bucket's manifest,
// else the in-repo catalogue of record for the hinges and nothing for the
// runners); the hinge and the plate are the leading file of every family the
// room can draw (`engine/hinges.js hingeFamilies`, the enabled plates only,
// as `resolveHingePlate` allows); a runner is `engine/runners.js runnerEntry`
// on every rung of the owner's ladder for every variant the workshop offers;
// the URL is `hingeModelSrc` / `runnerModelSrc` / `3d/coneroModels.js
// coneroSrc` over the storage base `scripts/bucket-live.mjs
// derivedStorageBase` derives. A model the room would refuse (`hingeModelFits`,
// `runnerModelFits`) is refused here too: the room draws nothing there.
//
// HOW IT IS READ. Zero new dependencies: `scripts/glb-meshes.mjs parseGlb`
// splits the GLB, every node transform is applied in full (translation,
// rotation, scale or a matrix, as GLTFLoader applies them) and the file's
// metres become millimetres (3d/constants.js `mm`). The room's own measure of
// the file (`3d/glbSource.js`: `Box3.setFromObject`, each primitive's box
// carried through its node) is recorded as `bounds`, because that box is what
// the room seats a runner and a plate by.
//
// WHERE THE ROOM PUTS IT. The views stay in the file's own millimetres. The
// room's placement of each family is SNAPSHOTTED beside them (`room`: the cup
// datum and the file's hand, the plate's origin, half turn and bite, the
// runner's origin and hands), so `src/engine/drawings/silhouettes.js` sets the
// silhouette down exactly where 3d/Hardware.jsx sets the model, without an
// engine module reading a placement number the cut must never see (T37's
// sweep). The hinge is traced as the room assembles it with the door shut:
// the rig's arm slide (3d/hingeModels.js offsetArmNode) on member B
// (memberOfNode), member A as cast. The CONERO pull-down is traced per part
// (the rod, the two arms) because the room composes it per opening
// (3d/coneroModels.js coneroClone). When a profile placement number moves,
// this script runs again; test/turn81-f07-silhouettes.test.js says so.
//
// IDEMPOTENT. Same files, same bytes out: entries sorted, coordinates on the
// raster's half cells, no clock; `generated` carries the hash of the entries.

import { createHash } from 'node:crypto';
import {
  existsSync, mkdirSync, readFileSync, statSync, writeFileSync,
} from 'node:fs';
import {
  dirname, isAbsolute, join, relative, resolve,
} from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { PropertyBinding } from 'three';

import { getCabinetProfile } from '../src/engine/profile.js';
import { clearHingeCatalogue, hingeFamilies, hingeModelSrc } from '../src/engine/hinges.js';
import {
  clearRunnerCatalogue, runnerEntry, runnerLadder, runnerModelSrc,
} from '../src/engine/runners.js';
import {
  hardwareFamilySpec, manifestUrl, resolveHardwareCatalogue,
} from '../src/lib/hardwareSource.js';
import { KIT_MODEL_SLOTS } from '../src/3d/hardwareRegistry.js';
import { memberOfNode } from '../src/3d/hingeModels.js';
import { coneroSrc } from '../src/3d/coneroModels.js';
import { parseGlb } from './glb-meshes.mjs';
import { derivedStorageBase } from './bucket-live.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');

/** The committed file. */
export const DEFAULT_OUT = join(ROOT, 'reference', 'hardware', 'silhouettes.json');

/**
 * The raster. CLAUDE.md F7: 0.5 mm, holes larger than 2 mm (the raster step
 * is T81 PROPOSED). The contour runs through the midpoints of the cell edges
 * and its steps are then simplified by less than half a cell
 * (Douglas-Peucker, square corners held), so no point leaves the raster's own
 * error and two sides of a one-cell gap never meet.
 */
export const RASTER = Object.freeze({ cellMm: 0.5, holeMinMm: 2, simplifyMm: 0.24 });

/** The file's metres, in millimetres (3d/constants.js `mm(1)` = 0.001). */
const MM_PER_UNIT = 1000;

/** A blocked host answers once; a hung one is let go after this. */
const TIMEOUT_MS = 15000;

// === MATRICES (column-major, as glTF and three store them) ================

const IDENTITY = Object.freeze([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);

function mul(a, b) {
  const o = new Array(16);
  for (let c = 0; c < 4; c += 1) {
    for (let r = 0; r < 4; r += 1) {
      let s = 0;
      for (let k = 0; k < 4; k += 1) s += a[k * 4 + r] * b[c * 4 + k];
      o[c * 4 + r] = s;
    }
  }
  return o;
}

/** three's Matrix4.compose: translation, quaternion, scale. */
function compose(t = [0, 0, 0], q = [0, 0, 0, 1], s = [1, 1, 1]) {
  const [x, y, z, w] = q;
  const x2 = x + x; const y2 = y + y; const z2 = z + z;
  const xx = x * x2; const xy = x * y2; const xz = x * z2;
  const yy = y * y2; const yz = y * z2; const zz = z * z2;
  const wx = w * x2; const wy = w * y2; const wz = w * z2;
  return [
    (1 - (yy + zz)) * s[0], (xy + wz) * s[0], (xz - wy) * s[0], 0,
    (xy - wz) * s[1], (1 - (xx + zz)) * s[1], (yz + wx) * s[1], 0,
    (xz + wy) * s[2], (yz - wx) * s[2], (1 - (xx + yy)) * s[2], 0,
    t[0], t[1], t[2], 1,
  ];
}

const apply = (m, x, y, z) => [
  m[0] * x + m[4] * y + m[8] * z + m[12],
  m[1] * x + m[5] * y + m[9] * z + m[13],
  m[2] * x + m[6] * y + m[10] * z + m[14],
];

// === THE GLB, READ AS GLTFLoader READS IT ==================================

const COMPONENTS = {
  SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT2: 4, MAT3: 9, MAT4: 16,
};
const BYTES = {
  5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4,
};
/** GLTFLoader getNormalizedComponentScale. */
const NORMAL_SCALE = {
  5120: 1 / 127, 5121: 1 / 255, 5122: 1 / 32767, 5123: 1 / 65535,
};

function component(dv, at, type) {
  switch (type) {
    case 5120: return dv.getInt8(at);
    case 5121: return dv.getUint8(at);
    case 5122: return dv.getInt16(at, true);
    case 5123: return dv.getUint16(at, true);
    case 5125: return dv.getUint32(at, true);
    default: return dv.getFloat32(at, true);
  }
}

/** three's BufferAttribute denormalize, for a normalized accessor. */
function denormal(v, type) {
  if (type === 5120) return Math.max(v / 127, -1);
  if (type === 5122) return Math.max(v / 32767, -1);
  if (type === 5121 || type === 5123) return v * NORMAL_SCALE[type];
  return v;
}

function bufferBytes(glb, index) {
  const def = glb.json.buffers?.[index];
  if (index === 0 && glb.bin && (!def || def.uri == null)) return glb.bin;
  const hit = String(def?.uri || '').match(/^data:[^;,]*;base64,(.*)$/);
  if (hit) return Buffer.from(hit[1], 'base64');
  throw new Error(`buffer ${index} is not inside the GLB`);
}

function viewValues(glb, viewIndex, count, n, type, extraOffset = 0) {
  const view = glb.json.bufferViews?.[viewIndex];
  if (!view) throw new Error(`bufferView ${viewIndex} is missing`);
  const bytes = bufferBytes(glb, view.buffer ?? 0);
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const size = BYTES[type];
  const stride = view.byteStride || n * size;
  const start = (view.byteOffset || 0) + extraOffset;
  const out = new Float64Array(count * n);
  for (let i = 0; i < count; i += 1) {
    for (let c = 0; c < n; c += 1) out[i * n + c] = component(dv, start + i * stride + c * size, type);
  }
  return out;
}

/** One accessor as plain numbers: denormalized where it is normalized, sparse applied. */
function readAccessor(glb, index) {
  const acc = glb.json.accessors?.[index];
  if (!acc) throw new Error(`accessor ${index} is missing`);
  const n = COMPONENTS[acc.type];
  if (!n || !BYTES[acc.componentType]) throw new Error(`accessor ${index} has a type this reader does not know`);
  let values = acc.bufferView != null
    ? viewValues(glb, acc.bufferView, acc.count, n, acc.componentType, acc.byteOffset || 0)
    : new Float64Array(acc.count * n);
  if (acc.sparse) {
    const s = acc.sparse;
    const at = viewValues(glb, s.indices.bufferView, s.count, 1, s.indices.componentType, s.indices.byteOffset || 0);
    const vs = viewValues(glb, s.values.bufferView, s.count, n, acc.componentType, s.values.byteOffset || 0);
    values = Float64Array.from(values);
    for (let k = 0; k < s.count; k += 1) {
      for (let c = 0; c < n; c += 1) values[at[k] * n + c] = vs[k * n + c];
    }
  }
  if (acc.normalized) for (let i = 0; i < values.length; i += 1) values[i] = denormal(values[i], acc.componentType);
  return { acc, n, values };
}

/** The triangles of one primitive, as vertex indices (points and lines have no area). */
function triangleIndices(glb, prim, vertexCount) {
  const mode = prim.mode ?? 4;
  if (mode !== 4 && mode !== 5 && mode !== 6) return new Uint32Array(0);
  const idx = prim.indices != null
    ? readAccessor(glb, prim.indices).values
    : Float64Array.from({ length: vertexCount }, (_, i) => i);
  const out = [];
  if (mode === 4) {
    for (let i = 0; i + 2 < idx.length; i += 3) out.push(idx[i], idx[i + 1], idx[i + 2]);
  } else if (mode === 5) {
    for (let i = 0; i + 2 < idx.length; i += 1) out.push(idx[i], idx[i + 1], idx[i + 2]);
  } else {
    for (let i = 1; i + 1 < idx.length; i += 1) out.push(idx[0], idx[i], idx[i + 1]);
  }
  return Uint32Array.from(out);
}

const sanitise = (name) => PropertyBinding.sanitizeNodeName(String(name || ''));

/**
 * The model as the room's scene graph holds it: one object per node (and one
 * per primitive of a node whose mesh has several, as GLTFLoader builds them),
 * named as GLTFLoader names them, in the order `traverse` visits them, and
 * every primitive with its triangles and its own box.
 *
 * @returns {{objects:Array, prims:Array}}
 */
export function readModel(bytes) {
  const glb = parseGlb(bytes);
  const { json } = glb;
  const nodes = json.nodes || [];
  const sceneDef = json.scenes?.[json.scene ?? 0] || null;
  const childOf = new Set(nodes.flatMap((n) => n.children || []));
  const roots = sceneDef?.nodes || nodes.map((_, i) => i).filter((i) => !childOf.has(i));

  const objects = [{
    name: sanitise(sceneDef?.name), parent: null, local: IDENTITY, depth: 0,
  }];
  const prims = [];
  const seen = new Set();
  const walk = (index, parent) => {
    const node = nodes[index];
    if (!node || seen.has(index)) return;
    seen.add(index);
    const local = Array.isArray(node.matrix) && node.matrix.length === 16
      ? node.matrix.slice()
      : compose(node.translation, node.rotation, node.scale);
    const mesh = node.mesh != null ? json.meshes?.[node.mesh] : null;
    const primitives = mesh?.primitives || [];
    const single = primitives.length === 1;
    const meshName = mesh ? sanitise(mesh.name || `mesh_${node.mesh}`) : '';
    const me = {
      name: sanitise(node.name) || (single ? meshName : ''), parent, local, depth: parent.depth + 1,
    };
    objects.push(me);
    primitives.forEach((prim, k) => {
      let holder = me;
      if (!single) {
        holder = {
          name: meshName, parent: me, local: IDENTITY, depth: me.depth + 1,
        };
        objects.push(holder);
      }
      const position = prim.attributes?.POSITION;
      if (position == null) return;
      const { acc, values } = readAccessor(glb, position);
      const tris = triangleIndices(glb, prim, acc.count);
      // The primitive's own box, as GLTFLoader computeBounds gives it: the
      // accessor's min and max (scaled when normalized), else the vertices.
      let lo = null; let hi = null;
      if (Array.isArray(acc.min) && Array.isArray(acc.max)) {
        const k3 = acc.normalized ? (NORMAL_SCALE[acc.componentType] || 1) : 1;
        lo = acc.min.slice(0, 3).map((v) => v * k3);
        hi = acc.max.slice(0, 3).map((v) => v * k3);
      } else {
        lo = [Infinity, Infinity, Infinity]; hi = [-Infinity, -Infinity, -Infinity];
        for (let i = 0; i < acc.count; i += 1) {
          for (let c = 0; c < 3; c += 1) {
            lo[c] = Math.min(lo[c], values[i * 3 + c]);
            hi[c] = Math.max(hi[c], values[i * 3 + c]);
          }
        }
      }
      prims.push({
        object: holder, positions: values, tris, lo, hi, index: prims.length, primitive: k,
      });
    });
    for (const c of node.children || []) walk(c, me);
  };
  for (const r of roots) walk(r, objects[0]);
  return { objects, prims };
}

/** The world matrix of an object, with an optional slide written on one name (offsetArmNode's rule). */
function worldOf(object, slide = null, memo = new Map()) {
  if (!object.parent) return object.local;
  if (memo.has(object)) return memo.get(object);
  const above = worldOf(object.parent, slide, memo);
  let local = object.local;
  // The slide goes on the named object, unless its parent already carries the
  // name: 3d/hingeModels.js offsetArmNode, to the letter.
  if (slide && object.name.startsWith(slide.node) && !String(object.parent.name || '').startsWith(slide.node)) {
    local = mul(compose([slide.x, slide.y, slide.z]), local);
  }
  const world = mul(above, local);
  memo.set(object, world);
  return world;
}

/** The room's own box of a set of primitives (Box3.setFromObject, not precise), in mm. */
function roomBox(prims, mmPerUnit) {
  const lo = [Infinity, Infinity, Infinity];
  const hi = [-Infinity, -Infinity, -Infinity];
  const memo = new Map();
  for (const p of prims) {
    const m = worldOf(p.object, null, memo);
    for (const x of [p.lo[0], p.hi[0]]) {
      for (const y of [p.lo[1], p.hi[1]]) {
        for (const z of [p.lo[2], p.hi[2]]) {
          const q = apply(m, x, y, z);
          for (let c = 0; c < 3; c += 1) { lo[c] = Math.min(lo[c], q[c]); hi[c] = Math.max(hi[c], q[c]); }
        }
      }
    }
  }
  if (!Number.isFinite(lo[0])) return null;
  const r = (v) => round3(v * mmPerUnit);
  return { min: lo.map(r), max: hi.map(r) };
}

const round3 = (v) => {
  const out = Math.round(v * 1000) / 1000;
  return Object.is(out, -0) ? 0 : out;
};

/** The triangles of a set of primitives in millimetres, each through its own world matrix. */
function trianglesOf(prims, mmPerUnit, worldFor) {
  let count = 0;
  for (const p of prims) count += p.tris.length;
  const out = new Float64Array(count * 3);
  let at = 0;
  for (const p of prims) {
    const m = worldFor(p);
    for (let i = 0; i < p.tris.length; i += 1) {
      const v = p.tris[i] * 3;
      const q = apply(m, p.positions[v], p.positions[v + 1], p.positions[v + 2]);
      out[at] = q[0] * mmPerUnit; out[at + 1] = q[1] * mmPerUnit; out[at + 2] = q[2] * mmPerUnit;
      at += 3;
    }
  }
  return out;
}

// === THE RASTER AND THE CONTOUR ============================================

/**
 * A centre this close to a triangle's edge is ON it, in cells. The files are
 * float32 metres, so a vertex written at 20.75 mm reads back a few
 * ten-thousandths off; without this a box edge that falls exactly on a cell
 * centre would land inside or outside by the float's own noise.
 */
const ON_EDGE = 1e-4;

/** Fill the cells whose centres a triangle covers (closed: a centre on an edge is in). */
function fillTriangle(grid, W, H, x0, y0, cell, ax, ay, bx, by, cx, cy) {
  const area = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
  if (Math.abs(area) < 1e-12) return;
  const eps = ON_EDGE;
  const epsMm = ON_EDGE * cell;
  const vmin = Math.min(ay, by, cy);
  const vmax = Math.max(ay, by, cy);
  const j0 = Math.max(0, Math.ceil((vmin - y0) / cell - 0.5 - eps));
  const j1 = Math.min(H - 1, Math.floor((vmax - y0) / cell - 0.5 + eps));
  const edges = [[ax, ay, bx, by], [bx, by, cx, cy], [cx, cy, ax, ay]];
  for (let j = j0; j <= j1; j += 1) {
    const yc = y0 + (j + 0.5) * cell;
    let xl = Infinity; let xr = -Infinity;
    for (const [px, py, qx, qy] of edges) {
      const lo = Math.min(py, qy); const hi = Math.max(py, qy);
      if (yc < lo - epsMm || yc > hi + epsMm) continue;
      if (Math.abs(qy - py) < 1e-12) {
        xl = Math.min(xl, px, qx); xr = Math.max(xr, px, qx);
      } else {
        const x = px + ((yc - py) * (qx - px)) / (qy - py);
        xl = Math.min(xl, x); xr = Math.max(xr, x);
      }
    }
    if (!(xr >= xl)) continue;
    const i0 = Math.max(0, Math.ceil((xl - x0) / cell - 0.5 - eps));
    const i1 = Math.min(W - 1, Math.floor((xr - x0) / cell - 0.5 + eps));
    const row = j * W;
    for (let i = i0; i <= i1; i += 1) grid[row + i] = 1;
  }
}

const DX = [1, 0, -1, 0];
const DY = [0, 1, 0, -1];

/**
 * The boundaries of the filled cells. The walk runs along the cell edges with
 * the filled side on its left (an outer contour counter-clockwise, a hole
 * clockwise) and turns right where two cells touch only at a corner, so they
 * stay one contour. The contour is drawn through the MIDPOINTS of those edges:
 * a straight edge at any slope comes back within a quarter cell of itself
 * instead of as a staircase half a cell deep, a square corner is cut by a
 * quarter cell, and two cells that touch at a corner meet through a neck,
 * never at a point. The midpoints beside such a corner are held through the
 * simplification, so the neck cannot close.
 *
 * @returns {Array<{pts:number[][], locked:boolean[]}>} in cells
 */
function crackLoops(grid, W, H) {
  const CW = W + 1;
  const corners = CW * (H + 1);
  const o1 = new Int8Array(corners).fill(-1);
  const o2 = new Int8Array(corners).fill(-1);
  const add = (c, d) => { if (o1[c] < 0) o1[c] = d; else o2[c] = d; };
  const filled = (i, j) => i >= 0 && j >= 0 && i < W && j < H && grid[j * W + i] === 1;
  for (let j = 0; j < H; j += 1) {
    for (let i = 0; i < W; i += 1) {
      if (grid[j * W + i] !== 1) continue;
      if (!filled(i, j - 1)) add(j * CW + i, 0);
      if (!filled(i + 1, j)) add(j * CW + i + 1, 1);
      if (!filled(i, j + 1)) add((j + 1) * CW + i + 1, 2);
      if (!filled(i - 1, j)) add((j + 1) * CW + i, 3);
    }
  }
  const used = new Uint8Array(corners * 4);
  const loops = [];
  for (let c0 = 0; c0 < corners; c0 += 1) {
    if (o1[c0] < 0) continue;
    for (let slot = 0; slot < 2; slot += 1) {
      const d0 = slot === 0 ? o1[c0] : o2[c0];
      if (d0 < 0 || used[c0 * 4 + d0]) continue;
      const cs = []; const ds = [];
      let c = c0; let d = d0;
      do {
        used[c * 4 + d] = 1;
        cs.push(c); ds.push(d);
        const next = c + DX[d] + DY[d] * CW;
        const a = o1[next]; const b = o2[next];
        let nd = a;
        if (b >= 0) {
          const right = (d + 3) % 4;
          nd = a === right || b === right ? right : a;
        }
        c = next; d = nd;
      } while (!(c === c0 && d === d0) && d >= 0);
      const n = cs.length;
      const mids = new Array(n);
      const held = new Array(n);
      for (let k = 0; k < n; k += 1) {
        mids[k] = [(cs[k] % CW) + DX[ds[k]] / 2, Math.floor(cs[k] / CW) + DY[ds[k]] / 2];
        // An edge that leaves or reaches a corner two cells share.
        held[k] = o2[cs[k]] >= 0 || o2[cs[k] + DX[ds[k]] + DY[ds[k]] * CW] >= 0;
      }
      // A run of equal steps is one side: a midpoint stays where the step turns.
      const pts = []; const locked = [];
      for (let k = 0; k < n; k += 1) {
        const p = mids[(k - 1 + n) % n]; const q = mids[k]; const r = mids[(k + 1) % n];
        const straight = q[0] - p[0] === r[0] - q[0] && q[1] - p[1] === r[1] - q[1];
        if (straight && !held[k]) continue;
        pts.push(q);
        locked.push(held[k]);
      }
      // A square corner stays square: the ends of a straight run along an
      // axis, two cells or longer, are held, so the simplification smooths the
      // raster's own steps and nothing else.
      const longRun = (a, b) => (a[0] === b[0] || a[1] === b[1]) && Math.abs(b[0] - a[0]) + Math.abs(b[1] - a[1]) >= 2;
      for (let k = 0; k < pts.length; k += 1) {
        const a = pts[(k - 1 + pts.length) % pts.length]; const c = pts[(k + 1) % pts.length];
        if (longRun(a, pts[k]) || longRun(pts[k], c)) locked[k] = true;
      }
      if (pts.length >= 3) loops.push({ pts, locked });
    }
  }
  return loops;
}

function shoelace(pts) {
  let s = 0;
  for (let i = 0; i < pts.length; i += 1) {
    const a = pts[i]; const b = pts[(i + 1) % pts.length];
    s += a[0] * b[1] - b[0] * a[1];
  }
  return s / 2;
}

function lineDistance(p, a, b) {
  const dx = b[0] - a[0]; const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy);
  if (len < 1e-12) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  return Math.abs((p[0] - a[0]) * dy - (p[1] - a[1]) * dx) / len;
}

/** Douglas-Peucker on an open chain; the two ends always stay. */
function simplifyChain(points, tol) {
  const keep = new Uint8Array(points.length);
  keep[0] = 1; keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [i, j] = stack.pop();
    let best = -1; let at = -1;
    for (let k = i + 1; k < j; k += 1) {
      const dist = lineDistance(points[k], points[i], points[j]);
      if (dist > best) { best = dist; at = k; }
    }
    if (at >= 0 && best > tol) { keep[at] = 1; stack.push([i, at], [at, j]); }
  }
  return points.filter((_, k) => keep[k]);
}

/** A closed ring simplified between its held corners (or two far-apart points). */
function simplifyRing(pts, locked, tol) {
  const n = pts.length;
  if (n <= 4 || !(tol > 0)) return pts;
  let anchors = [];
  for (let k = 0; k < n; k += 1) if (locked[k]) anchors.push(k);
  if (anchors.length < 2) {
    const a = anchors.length ? anchors[0] : 0;
    let far = a; let best = -1;
    for (let k = 0; k < n; k += 1) {
      const dist = Math.hypot(pts[k][0] - pts[a][0], pts[k][1] - pts[a][1]);
      if (dist > best) { best = dist; far = k; }
    }
    anchors = [...new Set([a, far])].sort((p, q) => p - q);
  }
  if (anchors.length < 2) return pts;
  const out = [];
  for (let t = 0; t < anchors.length; t += 1) {
    const a = anchors[t]; const b = anchors[(t + 1) % anchors.length];
    const chain = [];
    for (let k = a; ; k = (k + 1) % n) { chain.push(pts[k]); if (k === b) break; }
    const kept = simplifyChain(chain, tol);
    kept.pop();
    out.push(...kept);
  }
  return out.length >= 3 ? out : pts;
}

const round6 = (v) => {
  const out = Math.round(v * 1e6) / 1e6;
  return Object.is(out, -0) ? 0 : out;
};

/**
 * TRACE ONE VIEW. `tri` is flat 2-D triangles in millimetres
 * ([u0, v0, u1, v1, u2, v2, ...]); the answer is closed rings (the first point
 * repeated last) on the raster's half cells: the outer contours
 * counter-clockwise, the holes clockwise, and only the holes larger than
 * `holeMinMm` across both ways.
 */
export function traceRings(tri, {
  cellMm = RASTER.cellMm, holeMinMm = RASTER.holeMinMm, simplifyMm = RASTER.simplifyMm,
} = {}) {
  if (!tri || tri.length < 6) return [];
  let umin = Infinity; let umax = -Infinity; let vmin = Infinity; let vmax = -Infinity;
  for (let i = 0; i + 1 < tri.length; i += 2) {
    umin = Math.min(umin, tri[i]); umax = Math.max(umax, tri[i]);
    vmin = Math.min(vmin, tri[i + 1]); vmax = Math.max(vmax, tri[i + 1]);
  }
  if (!Number.isFinite(umin) || !Number.isFinite(vmin)) return [];
  const cell = cellMm;
  // The grid sits on the raster's own lines with an empty cell all round, so
  // every coordinate it gives back is a whole number of half cells.
  const x0 = Math.floor(umin / cell) * cell - cell;
  const y0 = Math.floor(vmin / cell) * cell - cell;
  const W = Math.ceil((umax - x0) / cell) + 2;
  const H = Math.ceil((vmax - y0) / cell) + 2;
  const grid = new Uint8Array(W * H);
  for (let i = 0; i + 5 < tri.length; i += 6) {
    fillTriangle(grid, W, H, x0, y0, cell, tri[i], tri[i + 1], tri[i + 2], tri[i + 3], tri[i + 4], tri[i + 5]);
  }
  const rings = [];
  for (const loop of crackLoops(grid, W, H)) {
    const pts = loop.pts.map(([i, j]) => [x0 + i * cell, y0 + j * cell]);
    const hole = shoelace(pts) < 0;
    if (hole) {
      const xs = pts.map((p) => p[0]); const ys = pts.map((p) => p[1]);
      const w = Math.max(...xs) - Math.min(...xs);
      const h = Math.max(...ys) - Math.min(...ys);
      if (!(w > holeMinMm && h > holeMinMm)) continue;
    }
    const kept = simplifyRing(pts, loop.locked, simplifyMm).map(([u, v]) => [round6(u), round6(v)]);
    rings.push([...kept, kept[0]]);
  }
  return rings;
}

/** The three views of a set of 3-D triangles (flat [x, y, z] x 3 per triangle), in mm. */
export function traceViews(tri3) {
  const view = (a, b) => {
    const out = new Float64Array((tri3.length / 3) * 2);
    for (let i = 0, k = 0; i + 2 < tri3.length; i += 3, k += 2) { out[k] = tri3[i + a]; out[k + 1] = tri3[i + b]; }
    return traceRings(out);
  };
  return { front: view(0, 1), side: view(2, 1), top: view(0, 2) };
}

// === WHAT THE ROOM DOES TO A MODEL BEFORE IT IS SEEN ======================

/** The hinge with the door shut: member A as cast, member B with the rig's arm slide. */
function hingeTriangles(model, profile) {
  const rig = profile.hardware.hinge.cliptop.rig || {};
  const off = rig.armOffset;
  const slide = rig.enabled && off?.node
    ? { node: String(off.node), x: (Number(off.xMm) || 0) / MM_PER_UNIT, y: 0, z: (Number(off.zMm) || 0) / MM_PER_UNIT }
    : null;
  const plain = new Map(); const slid = new Map();
  const member = (p) => {
    // keepMember: the mesh's own name, else its parent's; the far edge in
    // FILE millimetres for the z-threshold fallback.
    const name = p.object.name || p.object.parent?.name || '';
    const box = roomBox([p], MM_PER_UNIT);
    return memberOfNode(name, rig, box ? box.max[2] : null);
  };
  return trianglesOf(model.prims, MM_PER_UNIT, (p) => (slide && member(p) === 'B'
    ? worldOf(p.object, slide, slid)
    : worldOf(p.object, null, plain)));
}

/**
 * The CONERO's three parts as 3d/coneroModels.js coneroClone finds them: the
 * arms by their `-re` / `-li` names, the rod the first `3d-` name that is not
 * an arm (else the widest sibling of the arms), everything else as it is.
 */
function coneroParts(model, mmPerUnit) {
  const { objects, prims } = model;
  const arms = objects.filter((o) => /-re$|-li$/.test(o.name));
  let rod = objects.find((o) => /^3d-/.test(o.name) && !arms.includes(o)) || null;
  if (!rod && arms.length) {
    let best = 0;
    for (const o of objects.filter((x) => x.parent === arms[0].parent && !arms.includes(x))) {
      const box = roomBox(prims.filter((p) => isUnder(p.object, o)), mmPerUnit);
      const w = box ? box.max[0] - box.min[0] : 0;
      if (w > best) { best = w; rod = o; }
    }
  }
  const partOf = (p) => {
    for (const arm of arms) if (isUnder(p.object, arm)) return /-li$/.test(arm.name) ? 'left' : 'right';
    if (rod && isUnder(p.object, rod)) return 'rod';
    return 'rest';
  };
  const out = {};
  for (const p of prims) (out[partOf(p)] ||= []).push(p);
  return out;
}

function isUnder(object, ancestor) {
  for (let o = object; o; o = o.parent) if (o === ancestor) return true;
  return false;
}

// === THE SOURCES ===========================================================

/** `--base`: a directory (served as file:// URLs, laid out as the bucket) or a URL; default the live bucket. */
export function resolveBase(base = null) {
  if (base && !/^https?:\/\//i.test(base)) {
    const dir = isAbsolute(base) ? base : resolve(process.cwd(), base);
    if (!existsSync(dir) || !statSync(dir).isDirectory()) throw new Error(`--base ${base}: no such directory`);
    const rel = relative(ROOT, dir);
    const label = rel && !rel.startsWith('..') && !isAbsolute(rel) ? rel.split('\\').join('/') : dir;
    return {
      url: pathToFileURL(dir).href.replace(/\/+$/, ''),
      label,
      kind: 'mirror',
      source: `a local mirror of the hardware bucket at ${label} (laid out as the bucket is, read as the app reads the bucket)`,
    };
  }
  if (base) {
    const url = base.replace(/\/+$/, '');
    return {
      url, label: url, kind: 'url', source: `the hardware files at ${url} (read as the app reads the bucket)`,
    };
  }
  const url = derivedStorageBase();
  return {
    url,
    label: url,
    kind: 'bucket',
    source: `the hardware bucket at ${url}, the host derived from public/decors/egger/egger-decors.json `
      + 'as scripts/bucket-live.mjs derivedStorageBase derives it: the files the room loads',
  };
}

/** One reader for both: a file:// URL off the disk, an http one over the network, a dead host answered once. */
export function makeFetcher() {
  const dead = new Map();
  async function get(url) {
    if (url.startsWith('file:')) {
      const path = fileURLToPath(url);
      if (!existsSync(path)) return { ok: false, status: 404, error: 'it is not in the mirror' };
      return { ok: true, status: 200, bytes: readFileSync(path) };
    }
    let host = '';
    try { host = new URL(url).host; } catch { return { ok: false, status: null, error: 'not a URL' }; }
    if (dead.has(host)) return { ok: false, status: null, error: dead.get(host) };
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
      if (!res.ok) return { ok: false, status: res.status, error: `the host answered ${res.status}` };
      return { ok: true, status: res.status, bytes: Buffer.from(await res.arrayBuffer()) };
    } catch (e) {
      const error = `the host could not be reached (${e?.cause?.message || e?.message || String(e)})`;
      dead.set(host, error);
      return { ok: false, status: null, error };
    }
  }
  const fetchLike = async (url) => {
    const got = await get(url);
    return {
      ok: got.ok,
      status: got.status ?? '',
      statusText: got.ok ? 'OK' : got.error,
      json: async () => JSON.parse(got.bytes.toString('utf8')),
    };
  };
  return { get, fetchLike };
}

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const pathIn = (base, url) => (url.startsWith(`${base.url}/`) ? url.slice(base.url.length + 1) : url);

// === THE ENTRIES ===========================================================

const fallback = (head, reason) => ({ ...head, fallback: 'symbol', reason });

/** The families the room draws with no model at all: today's symbol, and the reason. */
function proceduralEntries() {
  const row = (family, reason) => fallback({ family, key: 'procedural' }, reason);
  return [
    row('leg', 'the room draws the leg procedurally (3d/Hardware.jsx Legs: a plate, a stem and a foot '
      + 'from profile.hardware.leg); there is no GLB to trace'),
    row('rail', 'the room draws the hanging rail procedurally (3d/Hardware.jsx Rail: a tube of '
      + 'profile.hardware.rail.diameter); there is no GLB to trace'),
    row('rod', 'the room draws the synchronisation rod procedurally (3d/Hardware.jsx Rods: a tube of the '
      + 'MOVENTO rod diameter); there is no GLB to trace'),
    row('support', 'the room draws the shelf support procedurally (3d/Hardware.jsx ShelfSupports: a sleeve '
      + 'and a pin from profile.hardware.shelfPin); there is no GLB to trace'),
    row('knob', 'the room draws the knob procedurally (3d/Hardware.jsx FrontHandle: a stem and a dome from '
      + 'profile.handles.knob); no handle model is in the bucket'),
    row('bar', 'the room draws the bar handle procedurally (3d/Hardware.jsx FrontHandle: two posts and a rod '
      + 'from profile.handles.bar); no handle model is in the bucket'),
    row('plinth-clip', 'bought (one per front leg, engine/legs.js) and drawn by the room nowhere: '
      + 'hardwareInstances has no plinth clip and no model slot names one, so there is nothing to trace and '
      + 'the sheet invents none'),
  ];
}

function kitPlaceholderEntries() {
  const slot = (kind, body) => fallback({ family: 'kit', key: kind }, `the room draws the placeholder (3d/Hardware.jsx ${body}) and mounts no model: `
    + `KIT_MODEL_SLOTS.${kind} is ${KIT_MODEL_SLOTS[kind] ? `${KIT_MODEL_SLOTS[kind]}, which the room does not load` : 'empty'}`);
  return [
    slot('carousel', 'CarouselBody'),
    slot('blind_pullout', 'BlindPulloutBody'),
    fallback({ family: 'kit', key: 'placeholder' }, 'every other kit body (the lift mechanisms, the wardrobe kits '
      + 'but the pull-down rail, the pull-out bins) is the walled placeholder the room draws (3d/Hardware.jsx '
      + 'KitBodies); there is no GLB to trace'),
  ];
}

/** Read and trace one hinge or plate file, or say why not. */
async function hingeEntry(fam, family, { profile, base, net }) {
  const C = profile.hardware.hinge.cliptop;
  const head = {
    family,
    key: fam.family,
    article: fam.article ?? null,
    finish: fam.finish ?? null,
    ...(family === 'hinge' ? { angle: fam.angle ?? null } : { role: fam.role }),
  };
  const url = hingeModelSrc({ file: fam.file }, profile, base.url);
  if (!url) return fallback({ ...head, file: null }, 'the catalogue names no file for this family, so the room mounts no model');
  const path = pathIn(base, url);
  const file = path.split('/').pop();
  const got = await net.get(url);
  if (!got.ok) return fallback({ ...head, file, path }, `the room loads ${path}; it could not be read here: ${got.error}`);
  let model;
  try { model = readModel(got.bytes); } catch (e) {
    return fallback({ ...head, file, path }, `${path} is not a GLB this reader can parse (${e.message}); the room's loader would decide`);
  }
  const bounds = roomBox(model.prims, MM_PER_UNIT);
  if (!bounds) return fallback({ ...head, file, path }, `${path} holds no triangles`);
  const longest = Math.max(...[0, 1, 2].map((k) => bounds.max[k] - bounds.min[k]));
  if (longest > C.maxModelLengthMm) {
    return fallback({ ...head, file, path }, `${path} is ${round3(longest)} mm long, over the ${C.maxModelLengthMm} mm a CLIP top can be: `
      + 'the room draws no model (hingeModelFits)');
  }
  const rig = C.rig || {};
  const room = family === 'hinge'
    ? {
      datumMm: C.fileDatum ? [C.fileDatum.x, C.fileDatum.y, C.fileDatum.z].map(Number) : null,
      originMm: [C.modelOrigin.x, C.modelOrigin.y, C.modelOrigin.z].map(Number),
      fileHand: C.fileHand,
      armSlide: rig.enabled && rig.armOffset?.node
        ? { node: rig.armOffset.node, mm: [Number(rig.armOffset.xMm) || 0, 0, Number(rig.armOffset.zMm) || 0] }
        : null,
    }
    : {
      originMm: [C.plateOrigin.x, C.plateOrigin.y, C.plateOrigin.z].map(Number),
      spinDeg: Number(C.plateSpinDeg) || 0,
      biteMm: Number(profile.hardware.hinge.plateBiteMm) || 0,
    };
  const tri = family === 'hinge'
    ? hingeTriangles(model, profile)
    : trianglesOf(model.prims, MM_PER_UNIT, (p) => worldOf(p.object));
  return {
    ...head, file, path, sha256: sha256(got.bytes), bounds, room, views: traceViews(tri),
  };
}

/** Every runner the room can draw: each rung of the ladder, each variant offered, each hand. */
async function runnerEntries({
  profile, base, net, catalogue, error,
}) {
  const M = profile.hardware.runner.movento;
  const ladder = runnerLadder(profile) || [];
  const variants = (M.variants || []).map((v) => String(v.id).toUpperCase());
  const out = [];
  for (const nl of ladder) {
    for (const variant of variants) {
      const head = { family: 'runner', key: `NL${nl}-${variant}`, nl, variant };
      if (!catalogue) {
        out.push(fallback({ ...head, article: null, file: null }, `the runner manifest could not be read (${error || 'no manifest'}): `
          + 'with no catalogue the room draws no runner (3d/Hardware.jsx Runners, T43 F7)'));
        continue;
      }
      const hands = {};
      for (const side of ['L', 'R']) {
        const e = runnerEntry({
          system: M.system, nl, variant, side, ladder,
        });
        if (!e) continue;
        const key = String(e.file);
        (hands[key] ||= { entry: e, sides: {} }).sides[side] = Boolean(e.side == null && side === 'R');
      }
      const files = Object.values(hands);
      if (!files.length) {
        out.push(fallback({ ...head, article: null, file: null }, `no NL${nl} ${variant} article in the runner manifest: the room draws no `
          + 'runner on this rung (T43 F7) and the BOM prints the named spec'));
        continue;
      }
      for (const { entry, sides } of files) {
        const row = {
          ...head,
          ...(files.length > 1 ? { key: `${head.key}-${Object.keys(sides).join('')}` } : {}),
          article: entry.article ?? null,
          hands: sides,
        };
        const url = runnerModelSrc(entry, profile, base.url);
        if (!url) { out.push(fallback({ ...row, file: null }, 'no URL for this runner, so the room mounts no model')); continue; }
        const path = pathIn(base, url);
        const file = path.split('/').pop();
        // eslint-disable-next-line no-await-in-loop
        const got = await net.get(url);
        if (!got.ok) { out.push(fallback({ ...row, file, path }, `the room loads ${path}; it could not be read here: ${got.error}`)); continue; }
        let model;
        try { model = readModel(got.bytes); } catch (e) {
          out.push(fallback({ ...row, file, path }, `${path} is not a GLB this reader can parse (${e.message})`));
          continue;
        }
        const bounds = roomBox(model.prims, MM_PER_UNIT);
        if (!bounds) { out.push(fallback({ ...row, file, path }, `${path} holds no triangles`)); continue; }
        const longest = Math.max(...[0, 1, 2].map((k) => bounds.max[k] - bounds.min[k]));
        if (Math.abs(longest - Number(entry.nl)) > M.lengthTolerance) {
          out.push(fallback({ ...row, file, path }, `${path} is ${round3(longest)} mm long, not NL${entry.nl} within `
            + `${M.lengthTolerance} mm: the room draws no runner (runnerModelFits)`));
          continue;
        }
        out.push({
          ...row,
          file,
          path,
          sha256: sha256(got.bytes),
          bounds,
          room: { originMm: [M.modelOrigin.x, M.modelOrigin.y, M.modelOrigin.z].map(Number) },
          views: traceViews(trianglesOf(model.prims, MM_PER_UNIT, (p) => worldOf(p.object))),
        });
      }
    }
  }
  return out;
}

/** The CONERO pull-down rail: the one kit body the room draws from a GLB. */
async function coneroEntry({ profile, base, net }) {
  const kit = profile.wardrobeAccessories?.kits?.pulldown_rail || {};
  const head = { family: 'kit', key: 'pulldown_rail', article: kit.conero?.article ?? null };
  const url = coneroSrc(profile, base.url);
  if (!url) return fallback({ ...head, file: null }, 'the profile names no CONERO file, so the room draws the placeholder walls');
  const path = pathIn(base, url);
  const file = path.split('/').pop();
  const got = await net.get(url);
  if (!got.ok) return fallback({ ...head, file, path }, `the room loads ${path}; it could not be read here: ${got.error}`);
  let model;
  try { model = readModel(got.bytes); } catch (e) {
    return fallback({ ...head, file, path }, `${path} is not a GLB this reader can parse (${e.message})`);
  }
  // coneroClone's own unit rule: a file under 5 units wide is in metres.
  const raw = roomBox(model.prims, 1);
  if (!raw) return fallback({ ...head, file, path }, `${path} holds no triangles`);
  const u = raw.max[0] - raw.min[0] < 5 ? 1000 : 1;
  const bounds = roomBox(model.prims, u);
  const parts = {};
  for (const [name, prims] of Object.entries(coneroParts(model, u)).sort(([a], [b]) => (a < b ? -1 : 1))) {
    parts[name] = {
      bounds: roomBox(prims, u),
      views: traceViews(trianglesOf(prims, u, (p) => worldOf(p.object))),
    };
  }
  return {
    ...head,
    file,
    path,
    sha256: sha256(got.bytes),
    bounds,
    room: { unitToMm: u, bodyHeightMm: Number(kit.bodyHeight) || 0 },
    views: traceViews(trianglesOf(model.prims, u, (p) => worldOf(p.object))),
    parts,
  };
}

const ORDER = ['hinge', 'plate', 'runner', 'kit', 'leg', 'rail', 'rod', 'support', 'knob', 'bar', 'plinth-clip'];

function sortEntries(entries) {
  const rank = (f) => { const i = ORDER.indexOf(f); return i < 0 ? ORDER.length : i; };
  return [...entries].sort((a, b) => rank(a.family) - rank(b.family)
    || (Number(a.nl) || 0) - (Number(b.nl) || 0)
    || (a.key < b.key ? -1 : (a.key > b.key ? 1 : 0)));
}

/**
 * EVERY FAMILY THE ROOM DRAWS, traced or named.
 *
 * @param {object} args  { base: --base, profile }
 * @returns {Promise<{source:string, entries:Array, catalogues:object}>}
 */
export async function buildSilhouettes({ base: baseArg = null, profile = getCabinetProfile() } = {}) {
  const base = resolveBase(baseArg);
  const net = makeFetcher();
  // The engine's catalogues are module state: start from none, as the app does.
  clearHingeCatalogue();
  clearRunnerCatalogue();
  const ask = (family) => resolveHardwareCatalogue({
    family, profile, readRow: async () => null, fetchImpl: net.fetchLike, storageBase: base.url, overrideBase: '',
  });
  const hinges = await ask('hinges');
  const runners = await ask('runners');

  const entries = [];
  const hingeFams = hingeFamilies({ role: 'hinge' });
  if (!hingeFams.length) entries.push(fallback({ family: 'hinge', key: 'none' }, 'no hinge catalogue could be read, so the room mounts no hinge model'));
  for (const fam of hingeFams) {
    // eslint-disable-next-line no-await-in-loop
    entries.push(await hingeEntry(fam, 'hinge', { profile, base, net }));
  }
  const plateRoles = profile.hardware.hinge.cliptop.plates.filter((p) => p.enabled).map((p) => p.id);
  const plateFams = plateRoles.flatMap((role) => hingeFamilies({ role }));
  if (!plateFams.length) entries.push(fallback({ family: 'plate', key: 'none' }, 'no plate in the catalogue, so the room mounts no plate model'));
  for (const fam of plateFams) {
    // eslint-disable-next-line no-await-in-loop
    entries.push(await hingeEntry(fam, 'plate', { profile, base, net }));
  }
  entries.push(...await runnerEntries({
    profile, base, net, catalogue: runners.catalogue || null, error: runners.error || null,
  }));
  entries.push(await coneroEntry({ profile, base, net }));
  entries.push(...kitPlaceholderEntries());
  entries.push(...proceduralEntries());
  // Which catalogue answered, in lib/hardwareSource.js's own words: `bucket`
  // (the manifest beside the models was read) or `mock` (the in-repo catalogue
  // of record for the hinges; nothing at all for the runners).
  const said = (family, answer) => ({
    manifest: pathIn(base, manifestUrl(hardwareFamilySpec(family, profile), base.url) || ''),
    source: answer.source,
    rows: answer.rows,
    error: answer.error || null,
  });
  return {
    source: base.source,
    catalogues: { hinges: said('hinges', hinges), runners: said('runners', runners) },
    entries: sortEntries(entries),
  };
}

/** The file, one entry per line, the same bytes for the same entries. */
export function serialise({ source, catalogues = null, entries }) {
  const rows = entries.map((e) => `  ${JSON.stringify(e)}`);
  const generated = { by: 'scripts/t81-silhouettes.mjs', entriesSha256: sha256(rows.join('\n')) };
  return `{\n "source": ${JSON.stringify(source)},\n "generated": ${JSON.stringify(generated)},\n`
    + ` "raster": ${JSON.stringify(RASTER)},\n`
    + `${catalogues ? ` "catalogues": ${JSON.stringify(catalogues)},\n` : ''}`
    + ` "entries": [\n${rows.join(',\n')}\n ]\n}\n`;
}

function parseArgs(argv) {
  const args = {
    base: null, out: DEFAULT_OUT, json: false, help: false,
  };
  const value = (i, flag) => {
    if (i >= argv.length || String(argv[i]).startsWith('--')) throw new Error(`${flag} takes a value`);
    return argv[i];
  };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    const [flag, inline] = a.startsWith('--') && a.includes('=') ? [a.slice(0, a.indexOf('=')), a.slice(a.indexOf('=') + 1)] : [a, null];
    if (flag === '--base') {
      args.base = inline ?? value(i += 1, flag);
    } else if (flag === '--out') {
      args.out = inline ?? value(i += 1, flag);
    } else if (flag === '--json') {
      args.json = true;
    } else if (flag === '--help' || flag === '-h') {
      args.help = true;
    } else {
      throw new Error(`unknown argument ${a}`);
    }
  }
  return args;
}

async function main(argv) {
  const args = parseArgs(argv);
  if (args.help) {
    process.stdout.write('node scripts/t81-silhouettes.mjs [--base <dir|url>] [--out <file>] [--json]\n');
    return;
  }
  const built = await buildSilhouettes({ base: args.base });
  const out = isAbsolute(args.out) ? args.out : resolve(process.cwd(), args.out);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, serialise(built));
  const traced = built.entries.filter((e) => !e.fallback);
  if (args.json) {
    process.stdout.write(`${JSON.stringify({
      out,
      source: built.source,
      catalogues: built.catalogues,
      traced: traced.map((e) => ({ family: e.family, key: e.key, file: e.file })),
      fallbacks: built.entries.filter((e) => e.fallback).map((e) => ({ family: e.family, key: e.key, reason: e.reason })),
    }, null, 1)}\n`);
    return;
  }
  const lines = [
    `silhouettes  ${relative(process.cwd(), out) || out}`,
    `source       ${built.source}`,
    `hinges       catalogue ${built.catalogues.hinges.source}${built.catalogues.hinges.error ? ` (${built.catalogues.hinges.error})` : ''}`,
    `runners      catalogue ${built.catalogues.runners.source}${built.catalogues.runners.error ? ` (${built.catalogues.runners.error})` : ''}`,
    `traced       ${traced.length} of ${built.entries.length}`,
  ];
  for (const e of built.entries) {
    const what = e.fallback
      ? `symbol  ${e.reason}`
      : `traced  ${e.file}  front ${e.views.front.length}, side ${e.views.side.length}, top ${e.views.top.length} rings`;
    lines.push(`  ${e.family.padEnd(11)} ${String(e.key).padEnd(14)} ${what}`);
  }
  process.stdout.write(`${lines.join('\n')}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main(process.argv.slice(2)).catch((e) => {
    process.stderr.write(`t81-silhouettes: ${e?.stack || e}\n`);
    process.exit(1);
  });
}
