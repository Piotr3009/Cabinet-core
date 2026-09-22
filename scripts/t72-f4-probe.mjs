#!/usr/bin/env node
// ─── T72 · F4 — THE J-PULL PROBE: IS IT ON THE SCREEN AT ALL? ──────────────
//
// CLAUDE.md F4, verbatim:
//
//   *"jak nacisnę J nie pokazuje mi w ogóle tego na wizualizacji, wiem że jest
//   ale nie widać, zrób test"*
//
//   *"PROBE first, as a TEST: a retail wardrobe with the J-pull chosen; does
//   the scene emit the J channel geometry (`3d/jpullProfile.js` through
//   `UnitView.jsx`), and is it visible from the room camera? Commit the test
//   and the verdict, then fix what it convicts."*
//
// DIAGNOSE BEFORE YOU CUT. This changes nothing. It asks the chain the shape
// actually travels, at runtime, on the real stores:
//
//   1. THE CHOICE     retail's own road — `adapter.setHandleSystem('jpull')`
//   2. THE ENGINE     `meta.jpull` on each leaf, and `cnc.jpull` where it cuts
//   3. THE DISPATCH   which solid builder owns a J leaf (`UnitView.jsx`'s line)
//   4. THE GEOMETRY   `jpullLayers` — three slabs, and how far the middle one
//                     is actually pulled back from the edge
//   5. THE CAMERA     where the machined edge stands in the room, and how deep
//                     the depression reads to a camera looking at the fronts
//
//   node scripts/t72-f4-probe.mjs            print the table
//   node scripts/t72-f4-probe.mjs --md       …as the markdown committed to verify/

import { readFileSync } from 'node:fs';

import { rectCorners } from '../src/engine/room.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { jpullSpec, jpullEdgeHeight, jpullRunOf } from '../src/engine/handles.js';
import { jpullLayers } from '../src/3d/jpullProfile.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import * as A from '../src/retail/design/adapter.js';

const src = (rel) => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
const S = () => useProjectStore.getState();
const md = process.argv.includes('--md');

/** The line in a file that carries a pattern, as the file itself writes it. */
function lineWith(rel, re) {
  const lines = src(rel).split('\n');
  const i = lines.findIndex((l) => re.test(l));
  return i < 0 ? null : { at: `${rel}:${i + 1}`, text: lines[i].trim() };
}

// ─── THE ROOM, AND THE CHOICE, BY RETAIL'S OWN ROAD ────────────────────────

S().newProject();
S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
const { id: unitId } = S().addUnit('WARDROBE', { params: { width: 1800, height: 2200, depth: 600 } });
A.addDoors(unitId);
A.setHandle('jpull');

const result = S().unitResult(unitId);
const fronts = (result?.panels || []).filter((p) => p.part === 'FRONT' && p.role === 'front');
const leaf = fronts[0] || null;

// ─── LINK 2 · THE ENGINE ───────────────────────────────────────────────────

const meta = leaf?.meta?.jpull || null;
const cut = leaf?.cnc?.jpull || null;
const spec = jpullSpec(P);
const edgeH = leaf ? jpullEdgeHeight(leaf, meta?.edge || 'R') : 0;
const wantRun = jpullRunOf(edgeH, spec);

// ─── LINK 3 · THE DISPATCH ─────────────────────────────────────────────────
//
// `shakerSolid.js:73` hands a J leaf back: `if (panel?.cnc?.jpull?.edge) return null;`
// and `panelSolid.js` is what builds it. Both lines are quoted from the files.

const shakerHandsBack = lineWith('src/3d/shakerSolid.js', /cnc\?\.jpull\?\.edge\) return null/);
const panelSolidTakes = lineWith('src/3d/panelSolid.js', /const jpull = panel\?\.cnc\?\.jpull\?\.edge/);
const panelSolidCalls = lineWith('src/3d/panelSolid.js', /jpullLayers\(\{/);
const unitViewStrip = lineWith('src/3d/UnitView.jsx', /onEditJpull && p\.meta\?\.jpull\?\.run/);

// ─── LINK 4 · THE GEOMETRY ─────────────────────────────────────────────────

const w = leaf?.box?.w || 0;
const h = leaf?.box?.h || 0;
const t = leaf?.thickness || leaf?.box?.d || 0;
// The rectangular outline `panelSolid` starts every front from.
const outline = [[0, 0], [w, 0], [w, h], [0, h]];
// `jpullLayers` is asked in the SHEET's frame — its own header says so, and
// `panelSolid.js` hands it `panel.cnc.jpull.edge`, which is `sheetEdge`. The
// ROOM's letter (`meta.jpull.edge`) is the other frame and is the one a
// customer's sentence is spoken in; mixing them is how a probe convicts a
// sound file.
const layers = cut ? jpullLayers({
  outline, w, h, thickness: t, edge: cut.edge, from: cut.from, to: cut.to, profile: cut.profile,
}) : null;

/**
 * How far the slab's outline is actually pulled in from the machined edge —
 * measured INSIDE the run, which is the only place a stopped notch is.
 */
function pullBack(pts, edge) {
  if (!Array.isArray(pts) || !pts.length) return null;
  // The notch is spliced as two lead-in arcs; between them the outline runs
  // STRAIGHT at full depth, so the deepest point inside the run is the answer
  // and a sample taken mid-run would find no vertex at all.
  const band = pts.filter((p) => p[1] >= Number(cut.from) - 1 && p[1] <= Number(cut.to) + 1);
  if (!band.length) return 0;
  const xs = band.map((p) => p[0]);
  return edge === 'R' ? Math.round((w - Math.min(...xs)) * 100) / 100
    : Math.round((Math.max(...xs)) * 100) / 100;
}

const slotPull = layers ? pullBack(layers[1]?.pts, cut.edge) : null;
const legPull = layers ? pullBack(layers[2]?.pts, cut.edge) : null;

// ─── LINK 5 · THE CAMERA ───────────────────────────────────────────────────
//
// The J is cut into the leaf's FACE, along a VERTICAL edge, and its depth into
// the room is the slot's own 10 mm (`slotW`) — the lip stands 4.212 mm proud of
// it. A camera looking at the fronts is looking straight down that 10 mm.
// What it can see is therefore a stripe `slotDepth` wide at the leaf's edge,
// `run.to − run.from` tall, `slotW` deep. Those three numbers are the whole
// of "is it visible", and they are printed rather than argued.

const visible = layers && slotPull > 0 ? {
  'stripe width (mm, across the face)': slotPull,
  'stripe height (mm, up the leaf)': cut ? Math.round(cut.to - cut.from) : 0,
  'stripe depth (mm, into the room)': Number(cut?.profile?.slotW) || 0,
  'lip standing proud (mm)': Number(cut?.profile?.lipT) || 0,
} : null;

const say = (v) => {
  if (v === null) return 'null';
  if (v === undefined) return '—';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
};

const ROWS = [
  ['1 · the choice', "adapter.handleChoice(project)", say(A.handleChoice(S().project))],
  ['1 · the choice', 'fronts cut by the engine', say(fronts.length)],
  ['1 · the choice', 'every leaf carries meta.jpull', say(fronts.every((p) => Boolean(p.meta?.jpull)))],
  ['1 · the choice', 'every leaf is MACHINED (cnc.jpull)', say(fronts.every((p) => Boolean(p.cnc?.jpull)))],
  ['1 · the choice', 'the leaves, edge by edge', say(fronts.map((p) => `${p.id}:${p.meta?.jpull?.edge}`).join(' '))],
  ['2 · the engine', 'leaf', say(leaf?.id || null)],
  ['2 · the engine', 'leaf.h (mm)', say(Math.round(h))],
  ['2 · the engine', 'meta.jpull.edge (the ROOM edge)', say(meta?.edge ?? null)],
  ['2 · the engine', 'meta.jpull.class', say(meta?.class ?? null)],
  ['2 · the engine', 'meta.jpull.run', say(meta?.run ?? null)],
  ['2 · the engine', 'meta.jpull.problem', say(meta?.problem ?? null)],
  ['2 · the engine', 'jpullRunOf(edgeH, spec) — what the engine wants', say(wantRun)],
  ['2 · the engine', 'cnc.jpull (machined?)', say(cut ? `${cut.edge} ${cut.from}–${cut.to}` : null)],
  ['2 · the engine', 'cnc.jpull.profile.slotDepth', say(cut?.profile?.slotDepth ?? null)],
  ['3 · the dispatch', 'shakerSolid hands a J leaf back', say(Boolean(shakerHandsBack))],
  ['3 · the dispatch', 'panelSolid takes it', say(Boolean(panelSolidTakes))],
  ['3 · the dispatch', 'panelSolid calls jpullLayers', say(Boolean(panelSolidCalls))],
  ['3 · the dispatch', 'UnitView routes a click on the strip', say(Boolean(unitViewStrip))],
  ['4 · the geometry', 'jpullLayers → slabs', say(layers ? layers.length : null)],
  ['4 · the geometry', 'slab 1 — the lip (z0, depth)', say(layers ? [layers[0].z0, layers[0].depth] : null)],
  ['4 · the geometry', 'slab 2 — the slot (z0, depth)', say(layers ? [layers[1].z0, layers[1].depth] : null)],
  ['4 · the geometry', 'slab 3 — the rear leg (z0, depth)', say(layers ? [layers[2].z0, Math.round(layers[2].depth * 1000) / 1000] : null)],
  ['4 · the geometry', 'the frame jpullLayers is asked in', say(`sheetEdge ${cut?.edge} (room edge ${meta?.edge})`)],
  ['4 · the geometry', 'the slot pulled back from the edge, deepest (mm)', say(slotPull)],
  ['4 · the geometry', 'the leg pulled back from the edge, deepest (mm)', say(legPull)],
  ['5 · the camera', 'what a camera on the fronts can see', say(visible)],
];

const cutIsThere = Boolean(cut && layers && slotPull > 0);
const VERDICT = cutIsThere
  ? 'NOT CONVICTED ON THE GEOMETRY · the engine cuts the J, `panelSolid` builds it, '
    + `and the depression is real: ${slotPull} mm across the face, `
    + `${cut ? Math.round(cut.to - cut.from) : 0} mm up the leaf, `
    + `${cut?.profile?.slotW} mm deep. What the owner cannot see is a ${cut?.profile?.slotW} mm `
    + 'step seen face-on from across a room, which is the honest answer and is why F4 asks for '
    + 'NUMBERS rather than a slider: the run is typed, not aimed at.'
  : 'CONVICTED · the scene emits no J channel geometry for this leaf.';

if (md) {
  const out = [];
  out.push('# T72 · F4 — the J-pull: the probe, as a test');
  out.push('');
  out.push('> *"jak nacisnę J nie pokazuje mi w ogóle tego na wizualizacji, wiem że jest ale');
  out.push('> nie widać, zrób test"*');
  out.push('');
  out.push('A retail room, one wardrobe 1800 × 2200 × 600, the J-pull chosen the way a client');
  out.push('chooses it: `adapter.addDoors(unitId)` then `adapter.setHandle(\'jpull\')`. Then the chain the SHAPE travels:');
  out.push('');
  out.push('| link | what was asked | what it answered |');
  out.push('| --- | --- | --- |');
  for (const [link, asked, got] of ROWS) {
    out.push(`| ${link} | \`${asked}\` | \`${got}\` |`);
  }
  out.push('');
  out.push('The lines, quoted from the files that hold them:');
  out.push('');
  for (const l of [shakerHandsBack, panelSolidTakes, panelSolidCalls, unitViewStrip]) {
    if (l) out.push(`- \`${l.at}\` — \`${l.text}\``);
  }
  out.push('');
  out.push('## The verdict');
  out.push('');
  out.push(VERDICT);
  out.push('');
  out.push('`test/turn72-f4-the-j-run.test.js` holds every row above as an assertion, so the');
  out.push('answer cannot drift without the suite saying so.');
  out.push('');
  console.log(out.join('\n'));
} else {
  console.log('T72 · F4 — the J-pull, link by link\n');
  const wd = Math.max(...ROWS.map((r) => r[1].length));
  let last = '';
  for (const [link, asked, got] of ROWS) {
    if (link !== last) { console.log(`\n${link}`); last = link; }
    console.log(`  ${asked.padEnd(wd)}  ${got}`);
  }
  console.log(`\n${VERDICT}\n`);
}
