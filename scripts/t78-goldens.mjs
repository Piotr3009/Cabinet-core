#!/usr/bin/env node
// ─── T78 · THE NEW GOLDENS, WRITTEN ONCE, BY NAME ──────────────────────────
//
// CLAUDE.md T78, FROZEN 1: *"New kits and new cut geometries get goldens of
// their own (named per F)."*  T75's shape (`scripts/t75-goldens.mjs`): each
// entry is the F that owns a golden and how it is cut. Two kinds:
//
//   params  the kit's params; the golden is `goldenOf(params)` (T75's summary
//           of computeCabinet: the cut list rows, every board, every hole)
//   make    a function of nothing returning the summary itself, for a golden
//           that is not one cabinet's cut (the L worktop is the design layer's:
//           a room, three cabinets and one record)
//
// A golden is written when its F lands and then held: re-writing one is a
// decision named in the PR, never a way to make a test green. Every F after
// F2 names its goldens in `scripts/t78-classify.d/fNN.mjs` (export GOLDENS,
// the same shape), so no two writers share a line here.
//
//   node scripts/t78-goldens.mjs --write golden-corner-l-mask.json   write one
//   node scripts/t78-goldens.mjs --check                             compare all

import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';

import { defaultParamsFor } from '../src/engine/types.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { rectCorners } from '../src/engine/room.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { goldenOf, goldenFile } from './t75-golden.mjs';

const ROOT = new URL('../', import.meta.url).pathname;
const kit = (type, extra = {}) => ({ ...defaultParamsFor(type, P), unit_num: '01', ...extra });
const r4 = (v) => (Number.isFinite(Number(v)) ? Math.round(Number(v) * 10000) / 10000 : v);

/**
 * T78 F2 · the L slab and the two runs along its arms, as the design layer
 * resolves them: a 4000 x 3000 room, a CORNER_L_BASE in the left corner of
 * wall 0, a BUD at each arm end, one worktop record over the three.
 */
function lWorktopScene() {
  const S = useProjectStore.getState;
  S().newProject();
  S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
  const l = S().addUnit('CORNER_L_BASE').id;
  const a = S().addUnit('BUD', { near: l, side: 'R' }).id;
  const b = S().addUnit('BUD', { near: l, side: 'L' }).id;
  const ok = S().addWorktop([l, a, b]);
  if (!ok.ok) throw new Error(ok.error);
  return S().worktopsOf().map((w) => ({
    slabId: w.slabId.replace(/^worktop_[a-z0-9]+/, 'worktop'),
    wall: w.geometry.wall,
    shape: w.geometry.shape || 'straight',
    x: r4(w.geometry.x),
    w: r4(w.geometry.w),
    y: r4(w.geometry.y),
    h: r4(w.geometry.h),
    d: r4(w.geometry.d),
    outline: Array.isArray(w.geometry.outline) ? w.geometry.outline.map(([x, z]) => [r4(x), r4(z)]) : null,
    overhang: w.geometry.overhang,
    butts: w.geometry.butts || null,
    joint: w.joint ? { kind: w.joint.kind, boltCount: w.joint.boltCount, at: w.joint.at, arm: w.joint.arm || null } : null,
    cutouts: (w.cutouts || []).length,
  }));
}

const BASE_GOLDENS = [
  {
    file: 'golden-corner-l-mask.json',
    F: 'F2',
    source: 'KIT_CORNER_L.lsp (the carcass); the mask is the L plan with the mask depth law on both arms',
    params: () => kit('CORNER_L_WALL', { doors: true, bottom_mask: true }),
  },
  {
    file: 'golden-corner-l-worktop.json',
    F: 'F2',
    source: 'engine/worktop.js lSlabGeometry and lRunSlabs: the L slab flush at both walls, two straight slabs butting its arm ends',
    make: lWorktopScene,
    params: () => ({ scene: 'lWorktopScene: a 4000 x 3000 room, CORNER_L_BASE in the left corner of wall 0, a BUD at each arm end, one record over the three' }),
  },
];

const FRAGMENT_DIR = new URL('./t78-classify.d/', import.meta.url);
const fragmentGoldens = [];
if (existsSync(FRAGMENT_DIR)) {
  for (const name of readdirSync(FRAGMENT_DIR).filter((n) => /^f\d\d[a-z0-9-]*\.mjs$/.test(n)).sort()) {
    // eslint-disable-next-line no-await-in-loop
    const frag = await import(new URL(name, FRAGMENT_DIR));
    fragmentGoldens.push(...(frag.GOLDENS || []));
  }
}
export const T78_GOLDENS = [...BASE_GOLDENS, ...fragmentGoldens];

/** The file body: T75's shape, with `make` goldens carrying their scene as params. */
const RULE = 'GOLDEN FIXTURE. Tests and scripts/t78-classify.mjs hold the engine to it byte for byte. '
  + 'If the engine differs, the ENGINE moved: name why, or put it back.';
function fileOf(g) {
  if (!g.make) {
    const body = goldenFile({ name: g.file, F: g.F, source: g.source, params: g.params() });
    return { ...body, meta: { ...body.meta, turn: 'T78', rule: RULE } };
  }
  const body = goldenFile({ name: g.file, F: g.F, source: g.source, params: kit('BUD') });
  return {
    ...body,
    meta: { ...body.meta, turn: 'T78', computed_by: `scripts/t78-goldens.mjs ${g.make.name}()`, rule: RULE },
    params: g.params(),
    expected: g.make(),
  };
}

const args = process.argv.slice(2);
if (args[0] === '--write') {
  const g = T78_GOLDENS.find((x) => x.file === args[1]);
  if (!g) { console.error(`no golden named ${args[1]}`); process.exit(1); }
  const body = fileOf(g);
  writeFileSync(`${ROOT}fixtures/${g.file}`, `${JSON.stringify(body, null, 2)}\n`);
  console.log(`wrote fixtures/${g.file}`);
} else if (args[0] === '--check') {
  let bad = 0;
  for (const g of T78_GOLDENS) {
    const path = `${ROOT}fixtures/${g.file}`;
    if (!existsSync(path)) { console.log(`MISSING  ${g.file}`); bad += 1; continue; }
    const file = JSON.parse(readFileSync(path, 'utf8'));
    const got = g.make ? g.make() : goldenOf(file.params, P);
    const same = JSON.stringify(got) === JSON.stringify(file.expected);
    if (!same) bad += 1;
    console.log(`${same ? 'ok      ' : 'MOVED   '} ${g.file} (${g.F})`);
  }
  process.exit(bad ? 1 : 0);
}
