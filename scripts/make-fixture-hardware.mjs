#!/usr/bin/env node
// ─── R8: THE SILENT SHOWROOM (turn 23, CLAUDE.md rule R8) ───────────────────
//
// "The cloud sandbox cannot fetch the bucket (403), so GLB-dependent phases can
// never again end `blocked`."
//
// Turns 18–22 all ended the same way: a hardware phase that could only be
// verified by looking at a downloaded Blum model, in a container whose egress
// policy answers `403 CONNECT` to the storage host. Three turns of hinge work
// were therefore proved by reading code and by the owner's screen, which is how
// a hinge hung closed on the carcass for two turns while every walk was green.
//
// So this script BUILDS A SHOWROOM the sandbox can reach: synthetic GLBs, made
// here, dimensioned like the real 71B family and the 173L plate, plus a
// manifest in the very shape the bucket serves. The app is pointed at them with
// one documented knob (`localStorage['cc.hardwareBase']`, see
// lib/storageBase.js) and everything downstream — the catalogue resolution, the
// URL composition, the loader, the cache, the clone, the pose, the mirror, the
// swing and the finish — runs exactly as it runs against Blum's own files.
//
//     node scripts/make-fixture-hardware.mjs
//     → test/fixtures/hardware-local/hardware/hinges/blum/{manifest.json,*.glb}
//     → test/fixtures/hardware-local/hardware/runners/blum/movento/{…}
//
// ─── WHAT IT IS NOT ─────────────────────────────────────────────────────────
//
// NO BLUM BYTES ENTER THIS REPOSITORY. Every vertex below is written by this
// file from numbers in this file, so the licence question (BLOCKERS #75) stays
// exactly where it was. These are stand-in solids that happen to occupy the
// same box as the real thing — which is the whole point, because the POSE is
// the thing under test and a pose is a relationship between a bounding box and
// a drilled point.
//
// THE REAL MODELS REMAIN PROVEN BY R2 (the manifest and a HEAD on a real file,
// over the URLs the app itself composes — `scripts/bucket-live.mjs`) and by the
// owner's own screen. This proves the RENDERING; that proves the FILES.
//
// ─── THE DIMENSIONS ARE NOT INVENTED ────────────────────────────────────────
//
// They are the ones measured off the owner's real 71B3550 in the chat hotfix
// and written into `profile.js` beside `modelOrigin`:
//
//   bbox   x −26.5 … 11      (37.5 wide)
//   y ±28.5             (57 across the door's height)
//   z −29.48 … 51.3     (80.78 front to back)
//   cup slab  37.5 × 57 × 16 at z 35.3 … 51.3
//
// and for the 173L6100 plate: 8.5 × 53 × 41.5 with its base at x −8.5. Because
// the synthetic bodies fill the same box, `hardware.hinge.cliptop.modelOrigin`
// and `.plateOrigin` — which were derived FROM those numbers — land the cup in
// its bore and the plate on the panel face without a single fixture-only
// constant anywhere in the app.
//
// UNITS ARE METRES, like every GLB this app loads: `3d/glbSource.js` measures
// with `mm(1)` (= 0.001), so a hinge 80.78 mm long is 0.08078 in the file.
//
// Zero dependencies: a GLB is a 12-byte header, a JSON chunk and a BIN chunk,
// and glTF 2.0 needs nothing but positions, normals, indices and a material.

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', 'test', 'fixtures', 'hardware-local');

/** mm → the file's own units. */
const M = (v) => Number(v) / 1000;

// ─── glTF 2.0, written by hand ──────────────────────────────────────────────

/**
 * A box, as 24 vertices with face normals.
 *
 * Six separate quads rather than eight shared corners: a shared vertex cannot
 * carry two normals, and a cube with averaged corner normals reads as a
 * pillow rather than as a piece of ironmongery.
 */
function box({
  x0, x1, y0, y1, z0, z1,
}) {
  const positions = [];
  const normals = [];
  const indices = [];
  const quad = (pts, n) => {
    const base = positions.length / 3;
    for (const p of pts) {
      positions.push(M(p[0]), M(p[1]), M(p[2]));
      normals.push(n[0], n[1], n[2]);
    }
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  };
  quad([[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], [0, 0, 1]);
  quad([[x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]], [0, 0, -1]);
  quad([[x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]], [1, 0, 0]);
  quad([[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]], [-1, 0, 0]);
  quad([[x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]], [0, 1, 0]);
  quad([[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]], [0, -1, 0]);
  return { positions, normals, indices };
}

/**
 * A cylinder along the DEPTH axis (z) — which is how a cup is bored, so the
 * fixture matches the real file's authored axes rather than needing a rotation
 * the app would have to know about.
 */
function cylinderZ({
  cx, cy, r, z0, z1, segments = 24,
}) {
  const positions = [];
  const normals = [];
  const indices = [];
  const push = (p, n) => {
    positions.push(M(p[0]), M(p[1]), M(p[2]));
    normals.push(n[0], n[1], n[2]);
    return positions.length / 3 - 1;
  };
  for (let i = 0; i < segments; i += 1) {
    const a0 = (i / segments) * Math.PI * 2;
    const a1 = ((i + 1) / segments) * Math.PI * 2;
    const p0 = [cx + Math.cos(a0) * r, cy + Math.sin(a0) * r];
    const p1 = [cx + Math.cos(a1) * r, cy + Math.sin(a1) * r];
    const n0 = [Math.cos(a0), Math.sin(a0), 0];
    const n1 = [Math.cos(a1), Math.sin(a1), 0];
    const a = push([p0[0], p0[1], z0], n0);
    const b = push([p1[0], p1[1], z0], n1);
    const c = push([p1[0], p1[1], z1], n1);
    const d = push([p0[0], p0[1], z1], n0);
    indices.push(a, b, c, a, c, d);
  }
  for (const [z, n, wind] of [[z1, [0, 0, 1], true], [z0, [0, 0, -1], false]]) {
    const centre = push([cx, cy, z], n);
    const ring = [];
    for (let i = 0; i < segments; i += 1) {
      const a = (i / segments) * Math.PI * 2;
      ring.push(push([cx + Math.cos(a) * r, cy + Math.sin(a) * r, z], n));
    }
    for (let i = 0; i < segments; i += 1) {
      const p = ring[i];
      const q = ring[(i + 1) % segments];
      if (wind) indices.push(centre, p, q);
      else indices.push(centre, q, p);
    }
  }
  return { positions, normals, indices };
}

/** Pad a byte length to the 4-byte boundary glTF requires. */
const pad4 = (n) => (n + 3) & ~3;

/**
 * One GLB from a list of named parts.
 *
 * @param {object[]} parts  [{ name, material, geometry }]
 * @param {object[]} materials  [{ name, colour:[r,g,b], metallic, roughness }]
 */
function glb(parts, materials, generator) {
  const chunks = [];
  let offset = 0;
  const bufferViews = [];
  const accessors = [];
  const meshes = [];
  const nodes = [];

  const view = (buf, target) => {
    const at = offset;
    chunks.push(buf);
    offset += buf.byteLength;
    const padding = pad4(offset) - offset;
    if (padding) { chunks.push(Buffer.alloc(padding)); offset += padding; }
    bufferViews.push({
      buffer: 0, byteOffset: at, byteLength: buf.byteLength, ...(target ? { target } : {}),
    });
    return bufferViews.length - 1;
  };

  for (const part of parts) {
    const g = part.geometry;
    const pos = Float32Array.from(g.positions);
    const nor = Float32Array.from(g.normals);
    const idx = Uint16Array.from(g.indices);

    const min = [Infinity, Infinity, Infinity];
    const max = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < pos.length; i += 3) {
      for (let k = 0; k < 3; k += 1) {
        min[k] = Math.min(min[k], pos[i + k]);
        max[k] = Math.max(max[k], pos[i + k]);
      }
    }

    const posView = view(Buffer.from(pos.buffer, pos.byteOffset, pos.byteLength), 34962);
    const norView = view(Buffer.from(nor.buffer, nor.byteOffset, nor.byteLength), 34962);
    const idxView = view(Buffer.from(idx.buffer, idx.byteOffset, idx.byteLength), 34963);

    accessors.push({
      bufferView: posView, componentType: 5126, count: pos.length / 3, type: 'VEC3', min, max,
    });
    accessors.push({
      bufferView: norView, componentType: 5126, count: nor.length / 3, type: 'VEC3',
    });
    accessors.push({
      bufferView: idxView, componentType: 5123, count: idx.length, type: 'SCALAR',
    });
    const a = accessors.length - 3;

    meshes.push({
      name: part.name,
      primitives: [{
        attributes: { POSITION: a, NORMAL: a + 1 },
        indices: a + 2,
        material: materials.findIndex((m) => m.name === part.material),
      }],
    });
    nodes.push({ name: part.name, mesh: meshes.length - 1 });
  }

  const json = {
    asset: { version: '2.0', generator },
    scene: 0,
    scenes: [{ nodes: nodes.map((_, i) => i) }],
    nodes,
    meshes,
    materials: materials.map((m) => ({
      name: m.name,
      pbrMetallicRoughness: {
        baseColorFactor: [...m.colour, 1],
        metallicFactor: m.metallic,
        roughnessFactor: m.roughness,
      },
    })),
    accessors,
    bufferViews,
    buffers: [{ byteLength: offset }],
  };

  const bin = Buffer.concat(chunks);
  let jsonBuf = Buffer.from(JSON.stringify(json), 'utf8');
  if (jsonBuf.byteLength % 4) {
    jsonBuf = Buffer.concat([jsonBuf, Buffer.alloc(pad4(jsonBuf.byteLength) - jsonBuf.byteLength, 0x20)]);
  }

  const header = Buffer.alloc(12);
  header.write('glTF', 0, 'ascii');
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(12 + 8 + jsonBuf.byteLength + 8 + bin.byteLength, 8);

  const jsonHeader = Buffer.alloc(8);
  jsonHeader.writeUInt32LE(jsonBuf.byteLength, 0);
  jsonHeader.write('JSON', 4, 'ascii');

  const binHeader = Buffer.alloc(8);
  binHeader.writeUInt32LE(bin.byteLength, 0);
  binHeader.write('BIN\0', 4, 'ascii');

  return Buffer.concat([header, jsonHeader, jsonBuf, binHeader, bin]);
}

// ─── The pieces ─────────────────────────────────────────────────────────────
//
// Material NAMES are part of the fixture, not decoration: F4.2 says the plastic
// sub-meshes keep a plastic look through a material-name ALLOWLIST, so the
// showroom has to contain one of each kind or the allowlist is untested.

const MATERIALS = [
  {
    name: 'metal_nickel_raw', colour: [0.86, 0.86, 0.86], metallic: 0.1, roughness: 0.8,
  },
  {
    name: 'plastic_black', colour: [0.1, 0.1, 0.1], metallic: 0, roughness: 0.6,
  },
];

/**
 * The hinge: a cup, its flange, the clip cap, the link cover, the arm with the
 * rear body, and a plastic lever.
 *
 * ─── TURN 24 (CLAUDE.md F1.5): IT IS A TWO-MEMBER FIXTURE NOW ──────────────
 *
 * The NODE NAMES are the real export's — `bau…` — and the z ranges are the ones
 * CLAUDE.md's table measured off the owner's own STEP-derived file. That is not
 * decoration: F1.3 splits the model BY NODE NAME, so a showroom whose nodes are
 * called `HINGE_CUP` would exercise the z-threshold FALLBACK and never the rule.
 * With these names the walk proves the shipped `rig.memberA` / `rig.memberB`
 * lists, on the very strings a real file carries.
 *
 * `bau0015088251` is the node that makes the point: it spans −28 … 46.2, right
 * across the 30 mm threshold, and it is member B. A split done by geometry
 * alone would cut the arm in half; a split done by name puts the whole of it on
 * the carcass, which is where it is bolted.
 */
function hingeParts() {
  return [
    // MEMBER A ─ the ⌀35 cup, bored along the depth, its centre at the x the
    // real file puts it at (−7.75) — which is what makes `modelOrigin` land it
    // in its bore without a fixture-only number anywhere. 35.3 … 51.3.
    {
      name: 'bau0015089612',
      material: 'metal_nickel_raw',
      geometry: cylinderZ({
        cx: -7.75, cy: 0, r: 17.5, z0: 35.3, z1: 51.3,
      }),
    },
    // MEMBER A ─ the CLIP cap, 39.4 … 50.1, and the pressed flange that gives
    // the cup slab its 37.5 × 57 footprint.
    {
      name: 'bau0015088783',
      material: 'metal_nickel_raw',
      geometry: box({
        x0: -26.5, x1: 11, y0: -28.5, y1: 28.5, z0: 39.4, z1: 50.1,
      }),
    },
    // MEMBER A ─ the link cover, 31.1 … 44.9.
    {
      name: 'bau0015088853',
      material: 'metal_nickel_raw',
      geometry: box({
        x0: -22, x1: 6, y0: -14, y1: 14, z0: 31.1, z1: 44.9,
      }),
    },
    // MEMBER B ─ the arm and the rear body, −28 … 46.2. It CROSSES the 30 mm
    // threshold, which is the whole reason the split is by name.
    {
      name: 'bau0015088251',
      material: 'metal_nickel_raw',
      geometry: box({
        x0: -20, x1: 4, y0: -11, y1: 11, z0: -28, z1: 46.2,
      }),
    },
    // MEMBER B ─ the CLIP release lever, −29.48 … 22.5. The one piece of a real
    // CLIP top that is not metal, and the reason F4.2's allowlist exists; it is
    // also what keeps the file's overall box at the measured −29.48.
    {
      name: 'bau0019416036',
      material: 'plastic_black',
      geometry: box({
        x0: -16, x1: 0, y0: -6, y1: 6, z0: -29.48, z1: 22.5,
      }),
    },
  ];
}

/** The mounting plate: 8.5 × 53 × 41.5, base at x −8.5, plus its cam. */
function plateParts() {
  return [
    {
      name: 'PLATE_BODY',
      material: 'metal_nickel_raw',
      geometry: box({
        x0: -8.5, x1: 0, y0: -26.5, y1: 26.5, z0: -20.75, z1: 20.75,
      }),
    },
    {
      name: 'PLATE_CAM',
      material: 'plastic_black',
      // Inside the plate's own 8.5 mm, so the file's overall box stays the
      // measured 8.5 × 53 × 41.5 and `plateOrigin` needs no adjustment.
      geometry: cylinderZ({
        cx: -4.25, cy: 0, r: 4, z0: -8, z1: -2,
      }),
    },
  ];
}

/** A runner: one L-profile at its nominal length, along the depth. */
function runnerParts(nl) {
  return [
    {
      name: 'RUNNER_FACE',
      material: 'metal_nickel_raw',
      geometry: box({
        x0: 0, x1: 12.5, y0: 0, y1: 45, z0: 0, z1: nl,
      }),
    },
    {
      name: 'RUNNER_FLANGE',
      material: 'metal_nickel_raw',
      geometry: box({
        x0: 0, x1: 6, y0: -6, y1: 0, z0: 0, z1: nl,
      }),
    },
  ];
}

// ─── The manifests ──────────────────────────────────────────────────────────
//
// R3 says a manifest fixture is the LIVE file copied verbatim. This one is a
// different animal and says so: it is the manifest of a showroom that does not
// exist in the bucket, in the shape the parsers read (`engine/hinges.js`
// `parseHingeCatalogue`, `engine/runners.js` `parseRunnerManifest`), naming the
// files this script writes beside it. Its JOB is to be structurally identical
// to the bucket's so that nothing in the app takes a different path.

const GEN = 'cabinet-core scripts/make-fixture-hardware.mjs — synthetic, no Blum bytes';

/** Both finishes of one hinge family, and both of one plate family. */
function hingeManifest() {
  const items = [];
  for (const [family, finish] of [['71B3550', 'nickel'], ['71B3550N', 'onyx']]) {
    // The catalogue lists each family twice under two article numbers and the
    // LEADING (sorted-first) one is what is drawn — the fixture keeps that
    // shape so `hingeFamilies` takes the same branch it takes on the real one.
    for (const article of [`1000${finish === 'nickel' ? '1' : '3'}`, `1000${finish === 'nickel' ? '2' : '4'}`]) {
      items.push({
        file: `hardware/hinges/blum/cliptop/${family}_${article}.glb`,
        family,
        article,
        role: 'hinge',
        angle: 110,
        finish,
      });
    }
  }
  for (const [family, finish] of [['173L6100', 'nickel'], ['173L6130', 'onyx']]) {
    items.push({
      file: `hardware/hinges/blum/cliptop/${family}_2000${finish === 'nickel' ? '1' : '2'}.glb`,
      family,
      article: `2000${finish === 'nickel' ? '1' : '2'}`,
      role: 'plate_knockin5',
      angle: null,
      finish,
    });
  }
  return {
    system: 'cliptop_blumotion',
    units: 'mm',
    generator: GEN,
    rules: {
      hinge_by_front_thickness: [{ max: 25, angle: 110 }, { max: 32, angle: 95 }],
      hinge_wardrobe_inner_drawer: 155,
      plate_default: 'plate_knockin5',
      plate_option: 'plate_screw3',
      layers: {
        cup: 'FRONT_HINGES_35MM',
        cup_screws: 'FRONT_HINGES_3MM',
        plate_knockin5: 'HINGES_5MM',
      },
    },
    items,
  };
}

/** The depth ladder the engine snaps a drawer to, as pair files. */
const RUNNER_LENGTHS = [270, 300, 350, 400, 450, 500, 550, 600, 650];

function runnerManifest() {
  const files = [];
  for (const nl of RUNNER_LENGTHS) {
    for (const variant of ['T', 'S']) {
      files.push({
        file: `hardware/runners/blum/movento/760H${nl}${variant}_3000${nl}.glb`,
        nl,
        variant,
        article: `3000${nl}${variant}`,
      });
    }
  }
  return {
    system: '760H', profile: '760H', generator: GEN, files,
  };
}

// ─── Write it ───────────────────────────────────────────────────────────────

function write(path, data) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, data);
  return `${path.replace(ROOT, 'test/fixtures/hardware-local')}  ${data.byteLength ?? data.length} bytes`;
}

const written = [];
const hingeDir = join(ROOT, 'hardware', 'hinges', 'blum');
const runnerDir = join(ROOT, 'hardware', 'runners', 'blum', 'movento');

const hinges = hingeManifest();
written.push(write(join(hingeDir, 'manifest.json'), `${JSON.stringify(hinges, null, 1)}\n`));
for (const row of hinges.items) {
  const name = row.file.split('/').pop();
  const parts = row.role === 'hinge' ? hingeParts() : plateParts();
  written.push(write(join(hingeDir, name), glb(parts, MATERIALS, GEN)));
}

const runners = runnerManifest();
written.push(write(join(runnerDir, 'manifest.json'), `${JSON.stringify(runners, null, 1)}\n`));
for (const row of runners.files) {
  const name = row.file.split('/').pop();
  // 0.5 mm over nominal, exactly as the owner's own conversion measures
  // (`movento.lengthTolerance` exists for that half-millimetre).
  written.push(write(join(runnerDir, name), glb(runnerParts(row.nl + 0.5), MATERIALS, GEN)));
}

process.stdout.write(`${written.join('\n')}\n${written.length} files\n`);
