#!/usr/bin/env node
// ─── WHAT IS ACTUALLY IN A HARDWARE MODEL (turn 23, CLAUDE.md F3) ───────────
//
// Owner's screenshot: "a black drum floating beside each hinge."
//
// F3's first line is the rule this file exists for: **diagnose by MESH, not by
// eye.** A render is a picture of an answer; a mesh table is the answer. So
// this parses a GLB and prints every mesh in it with its name, its material,
// its vertex count, its own bounding box IN MILLIMETRES and its offset from the
// file's overall box — which is exactly the set of facts that tells a
// legitimate adjustment cam from a conversion artefact.
//
//     node scripts/glb-meshes.mjs test/fixtures/hardware-local/…/71B3550_10001.glb
//     node scripts/glb-meshes.mjs --json <file|url> [<file|url> …]
//     node scripts/glb-meshes.mjs --md   <file|url> [<file|url> …]
//
// It takes a URL as readily as a path, so the moment anybody runs it on a
// machine that can reach the bucket the real 71B and 173L tables drop straight
// into `verify/t23/hinge-meshes.md` beside the synthetic ones. In THIS session
// the storage host answers `403 CONNECT` at the proxy (see
// `verify/t23/bucket-live.md`), and the report says so rather than guessing.
//
// ZERO DEPENDENCIES, and no three.js: a GLB is a 12-byte header, a JSON chunk
// and a BIN chunk, and every number this asks for is in the accessor min/max
// the spec already requires on POSITION. Reading it directly rather than
// through a loader is also the honest tool for the job — a loader would apply
// the node transforms and hand back a scene, and the question here is what the
// FILE says.

import { readFileSync } from 'node:fs';

/** The two chunks of a GLB, decoded. */
export function parseGlb(bytes) {
  const buf = Buffer.from(bytes);
  if (buf.length < 12 || buf.toString('ascii', 0, 4) !== 'glTF') {
    throw new Error('not a GLB (missing the glTF magic)');
  }
  const version = buf.readUInt32LE(4);
  let at = 12;
  let json = null;
  let bin = null;
  while (at + 8 <= buf.length) {
    const length = buf.readUInt32LE(at);
    const type = buf.toString('ascii', at + 4, at + 8);
    const body = buf.subarray(at + 8, at + 8 + length);
    if (type === 'JSON') json = JSON.parse(body.toString('utf8'));
    if (type.startsWith('BIN')) bin = body;
    at += 8 + length;
  }
  if (!json) throw new Error('no JSON chunk');
  return { version, json, bin, bytes: buf.length };
}

/** The world matrix of a node, walked from the scene root. Translation only
 *  where a file uses TRS, and the full 4×4 where it ships one. */
function nodeTransforms(json) {
  const out = new Map();
  const walk = (index, parent) => {
    const node = json.nodes?.[index];
    if (!node) return;
    const t = node.translation || [0, 0, 0];
    const s = node.scale || [1, 1, 1];
    const here = {
      t: [parent.t[0] + t[0] * parent.s[0], parent.t[1] + t[1] * parent.s[1], parent.t[2] + t[2] * parent.s[2]],
      s: [parent.s[0] * s[0], parent.s[1] * s[1], parent.s[2] * s[2]],
      // A rotation is recorded but deliberately NOT applied: this report is
      // about names, sizes and displaced origins, and a file that rotates a
      // mesh is itself a finding worth printing rather than hiding.
      rotated: Boolean(node.rotation || parent.rotated),
    };
    out.set(index, here);
    for (const child of node.children || []) walk(child, here);
  };
  const roots = json.scenes?.[json.scene ?? 0]?.nodes || json.nodes?.map((_, i) => i) || [];
  for (const r of roots) walk(r, { t: [0, 0, 0], s: [1, 1, 1], rotated: false });
  return out;
}

/**
 * One row per PRIMITIVE — which is what a "mesh" is once a converter has been
 * at it, and the level a stray drum would appear at.
 *
 * @param {object} glb  parseGlb() output
 * @param {number} unitsPerMm  1/1000 for a file authored in metres, which is
 *                             every GLB this app loads (3d/constants.js)
 */
export function meshTable(glb, unitsPerMm = 0.001) {
  const { json } = glb;
  const transforms = nodeTransforms(json);
  const rows = [];
  for (const [nodeIndex, node] of (json.nodes || []).entries()) {
    if (node.mesh == null) continue;
    const mesh = json.meshes?.[node.mesh];
    if (!mesh) continue;
    const world = transforms.get(nodeIndex) || { t: [0, 0, 0], s: [1, 1, 1], rotated: false };
    for (const [i, prim] of (mesh.primitives || []).entries()) {
      const acc = json.accessors?.[prim.attributes?.POSITION];
      if (!acc) continue;
      const min = (acc.min || [0, 0, 0]).map((v, k) => (v * world.s[k] + world.t[k]) / unitsPerMm);
      const max = (acc.max || [0, 0, 0]).map((v, k) => (v * world.s[k] + world.t[k]) / unitsPerMm);
      rows.push({
        mesh: mesh.name || `mesh${node.mesh}`,
        node: node.name || `node${nodeIndex}`,
        primitive: i,
        material: json.materials?.[prim.material]?.name ?? (prim.material == null ? null : `material${prim.material}`),
        vertices: acc.count,
        min: min.map((v) => round(v)),
        max: max.map((v) => round(v)),
        size: max.map((v, k) => round(v - min[k])),
        centre: max.map((v, k) => round((v + min[k]) / 2)),
        rotated: world.rotated,
      });
    }
  }
  return rows;
}

const round = (v) => Math.round(v * 100) / 100;

/** The file's own overall box, from the rows. */
export function overallBox(rows) {
  if (!rows.length) return null;
  const min = [0, 1, 2].map((k) => Math.min(...rows.map((r) => r.min[k])));
  const max = [0, 1, 2].map((k) => Math.max(...rows.map((r) => r.max[k])));
  return { min, max, size: max.map((v, k) => round(v - min[k])) };
}

/**
 * How far this mesh's own box sits OUTSIDE the bulk of the model.
 *
 * The drum test, stated as arithmetic: a legitimate sub-assembly overlaps the
 * rest of the model; a conversion orphan sits clear of it. `separation` is the
 * largest gap on any axis between this mesh's box and the union of every other
 * mesh's — zero or less where they touch or overlap.
 */
export function separationOf(rows, index) {
  const mine = rows[index];
  const others = rows.filter((_, i) => i !== index);
  if (!others.length) return 0;
  const min = [0, 1, 2].map((k) => Math.min(...others.map((r) => r.min[k])));
  const max = [0, 1, 2].map((k) => Math.max(...others.map((r) => r.max[k])));
  return round(Math.max(...[0, 1, 2].map((k) => Math.max(min[k] - mine.max[k], mine.min[k] - max[k]))));
}

async function bytesOf(source) {
  if (/^https?:\/\//i.test(source)) {
    const res = await fetch(source);
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return Buffer.from(await res.arrayBuffer());
  }
  return readFileSync(source);
}

function markdown(source, glb, rows) {
  const box = overallBox(rows);
  const out = [];
  out.push(`### \`${source.split('/').pop()}\``);
  out.push('');
  out.push(`${glb.bytes} bytes · glTF ${glb.version} · ${rows.length} mesh primitives`
    + `${box ? ` · overall ${box.size.join(' × ')} mm` : ''}`);
  out.push('');
  out.push('| mesh | material | verts | size (mm) | min (mm) | max (mm) | clear of the rest |');
  out.push('| --- | --- | --- | --- | --- | --- | --- |');
  rows.forEach((r, i) => {
    const gap = separationOf(rows, i);
    out.push(`| \`${r.mesh}\` | \`${r.material ?? '—'}\` | ${r.vertices} | ${r.size.join(' × ')} `
      + `| ${r.min.join(', ')} | ${r.max.join(', ')} | ${gap > 0 ? `**${gap} mm**` : 'touching'} |`);
  });
  out.push('');
  return out.join('\n');
}

function human(source, glb, rows) {
  const box = overallBox(rows);
  const out = [`${source}`, `  ${glb.bytes} bytes, glTF ${glb.version}, ${rows.length} primitives`];
  if (box) out.push(`  overall  ${box.size.join(' × ')} mm   min ${box.min.join(', ')}   max ${box.max.join(', ')}`);
  rows.forEach((r, i) => {
    const gap = separationOf(rows, i);
    out.push(`  ${r.mesh.padEnd(20)} ${String(r.material ?? '—').padEnd(20)} `
      + `${String(r.vertices).padStart(5)}v  ${r.size.join(' × ').padEnd(24)} `
      + `${gap > 0 ? `CLEAR OF THE REST BY ${gap} mm` : ''}`);
  });
  return out.join('\n');
}

// ─── The command ────────────────────────────────────────────────────────────

const argv = process.argv.slice(2);
const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop());
if (isMain && argv.length) {
  const mode = argv.find((a) => a.startsWith('--'))?.slice(2) || 'text';
  const sources = argv.filter((a) => !a.startsWith('--'));
  const reports = [];
  for (const source of sources) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const glb = parseGlb(await bytesOf(source));
      const rows = meshTable(glb);
      reports.push({ source, glb, rows });
    } catch (e) {
      reports.push({ source, error: e.message });
    }
  }
  if (mode === 'json') {
    process.stdout.write(`${JSON.stringify(reports.map((r) => ({
      source: r.source,
      error: r.error ?? null,
      bytes: r.glb?.bytes ?? null,
      overall: r.rows ? overallBox(r.rows) : null,
      meshes: r.rows ? r.rows.map((row, i) => ({ ...row, separation: separationOf(r.rows, i) })) : null,
    })), null, 1)}\n`);
  } else {
    const render = mode === 'md' ? markdown : human;
    process.stdout.write(`${reports
      .map((r) => (r.error ? `${r.source}\n  COULD NOT BE READ — ${r.error}` : render(r.source, r.glb, r.rows)))
      .join('\n\n')}\n`);
  }
}
