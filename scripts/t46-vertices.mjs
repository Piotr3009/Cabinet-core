#!/usr/bin/env node
// ─── THE VERTEX PROBE (turn 46, CLAUDE.md F3/F4) ────────────────────────────
//
// *"Proofs: `f3-cut-carcass-panels.png` + `verify/t46/f3-vertices.txt`."*
//
// A screenshot of a cut cabinet proves it looks cut. It does not prove the
// CORNERS are where the LISP puts them, and the corners are the deliverable —
// they are what the machine cuts to. So this prints them, from the engine
// itself, for a fixture the morning audit can re-run:
//
//     node scripts/t46-vertices.mjs > verify/t46/f3-vertices.txt
//
// Everything below is read off `computeCabinet()`. Nothing is restated.

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { ceilingAt, slopeCutLine, slopeStation } from '../src/lib/slopeLine.js';

const w = (t) => process.stdout.write(t);
const n = (v) => (v == null ? '—' : String(Math.round(Number(v) * 1e4) / 1e4));
const pts = (o) => (o || []).map(([x, y]) => `(${n(x)}, ${n(y)})`).join(' → ');

// ─── THE FIXTURE, stated once ───────────────────────────────────────────────
// A 4000 × 2500 wall whose ceiling comes down over its last 900 mm to 300, a
// 40 mm project infill, and a standard wardrobe parked at the last station the
// arrival law allows (F2). Every number below falls out of those five.
const WALL = { wallWidth: 4000, wallHeight: 2500 };
const SLOPES = [{ side: 'R', startHeight: 300, run: 900 }];
const INFILL = 40;
const PARAMS = { ...defaultParamsFor('WARDROBE', P), unit_num: '01' };
const FLOOR_Y = Number(PARAMS.leg_height) || P.wardrobe.legHeight;

const station = slopeStation({
  slopes: SLOPES, ...WALL, width: PARAMS.width, infill: INFILL, floorY: FLOOR_Y, minimum: 400,
});
const cut = slopeCutLine({
  slopes: SLOPES, ...WALL, x: station.max, width: PARAMS.width, infill: INFILL, floorY: FLOOR_Y,
});

const plain = computeCabinet({ ...PARAMS }, P);
const sloped = computeCabinet({ ...PARAMS, slope_cut: cut }, P);
const of = (r, id) => r.panels.find((p) => p.id === id) || null;

w('T46 · F3/F4 — THE VERTICES OF A CUT WARDROBE\n');
w('════════════════════════════════════════════════════════════════════════\n\n');
w('THE FIXTURE\n');
w(`  wall              ${WALL.wallWidth} × ${WALL.wallHeight} mm\n`);
w(`  slope             side ${SLOPES[0].side}, startHeight ${SLOPES[0].startHeight}, run ${SLOPES[0].run}\n`);
w(`  scribe gap        ${INFILL} mm  (the project's infill — owner, 24.08)\n`);
w(`  unit              WARDROBE ${PARAMS.width} × ${PARAMS.height} × ${PARAMS.depth}, board ${PARAMS.board_t}\n`);
w(`  legs              ${FLOOR_Y} mm\n\n`);

w('F2 — THE ARRIVAL LAW\n');
w(`  station           x ∈ [${n(station.min)}, ${n(station.max)}]\n`);
w(`  far edge          ${n(station.max + PARAMS.width)} mm along the wall\n`);
w(`  ceiling there     ${n(ceilingAt(station.max + PARAMS.width, SLOPES, WALL))} mm\n`);
w(`  clear carcass     ${n(ceilingAt(station.max + PARAMS.width, SLOPES, WALL) - INFILL - FLOOR_Y)} mm`
  + '   ← the owner\'s 400, exactly\n\n');

w('THE CUT, IN UNIT-LOCAL x (already minus the infill and the legs)\n');
w(`  y at x=0          ${n(cut.y0)} mm\n`);
w(`  y at x=${String(PARAMS.width).padEnd(3)}        ${n(cut.y1)} mm\n`);
w(`  low end           ${cut.low}\n\n`);

w('F3 — THE PANELS\n');
w('────────────────────────────────────────────────────────────────────────\n');
for (const id of ['BUL', 'BUR', 'TOP', 'BOTTOM', 'BACK']) {
  const a = of(plain, id);
  const b = of(sloped, id);
  if (!b) continue;
  w(`\n${id}\n`);
  w(`  cut size          ${n(a.cnc?.drawn_w ?? a.w)} × ${n(a.cnc?.drawn_h ?? a.h)}`
    + `   →   ${n(b.cnc?.drawn_w ?? b.w)} × ${n(b.cnc?.drawn_h ?? b.h)}\n`);
  w(`  sits at y         ${n(a.box?.y)}   →   ${n(b.box?.y)}\n`);
  w(`  corners           ${a.cnc?.outline?.length ?? 0}   →   ${b.cnc?.outline?.length ?? 0}\n`);
  if ((b.cnc?.outline?.length ?? 0) <= 8) w(`  vertices          ${pts(b.cnc?.outline)}\n`);
  w(`  fingerprint       ${b.meta?.slopeCut ? JSON.stringify(b.meta.slopeCut) : '(not cut — stamped with nothing)'}\n`);
}

w('\n\nF4 — THE FRONT\n');
w('────────────────────────────────────────────────────────────────────────\n');
for (const b of sloped.panels.filter((p) => p.role === 'front')) {
  const a = plain.panels.find((p) => p.id === b.id);
  w(`\n${b.id}\n`);
  w(`  cut size          ${n(a?.cnc?.drawn_w ?? a?.w)} × ${n(a?.cnc?.drawn_h ?? a?.h)}`
    + `   →   ${n(b.cnc?.drawn_w ?? b.w)} × ${n(b.cnc?.drawn_h ?? b.h)}\n`);
  w(`  corners           ${a?.cnc?.outline?.length ?? 0}   →   ${b.cnc?.outline?.length ?? 0}\n`);
  if ((b.cnc?.outline?.length ?? 0) <= 8) w(`  vertices          ${pts(b.cnc?.outline)}\n`);
  w(`  hinge             ${a?.meta?.hinge ?? '—'}   →   ${b.meta?.hinge ?? '—'}`
    + `${b.meta?.hingeForced ? '   (FORCED — "brak wyboru otwierania, musi byc od skosu")' : ''}\n`);
  const cups = sloped.drills.filter((d) => d.panel === b.id && d.kind === 'cup');
  w(`  cups              ${cups.length ? cups.map((d) => `y ${n(d.y)}`).join(', ') : '(none)'}\n`);
}

w('\n\nTHE GATE\n');
w('────────────────────────────────────────────────────────────────────────\n');
const drillTops = new Map(sloped.panels.map((p) => [p.id, Number(p.cnc?.drawn_h) || p.h]));
const orphans = sloped.drills.filter((d) => drillTops.has(d.panel) && d.y > drillTops.get(d.panel) + 1e-6);
w(`  holes left in air   ${orphans.length}\n`);
w(`  panels stamped cut  ${sloped.panels.filter((p) => p.meta?.slopeCut).map((p) => p.id).join(', ')}\n`);
w(`  warnings            ${sloped.warnings.length ? sloped.warnings.map((x) => x.code).join(', ') : '(none)'}\n`);
w('\n  …and with NO slope_cut the same call is byte-identical to today:\n');
w(`  run  node scripts/t46-classify.mjs --dump  on the base and on this branch.\n`);
