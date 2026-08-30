import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { migrateDesign, resolveFinishes } from '../src/engine/design.js';
import { panelFinish, resolvePanelMaterial } from '../src/engine/materials.js';
import { WATCH_FINISHES, watchDrawerFixedHeight, watchFinishOf } from '../src/engine/watchDrawer.js';

// ─── T55 · F5 — WATCH FINISH: TWO CHOICES, WIRED FOR REAL ───────────────────
//
// The owner: *"usuń po prostu … zrobimy sprayed (color frontów) albo
// carcass"* and *"zostaw project jako carcass — teraźniejsze ustawienie."*
//
// 1. OAK and WALNUT are deleted from `WATCH_FINISHES` and every reference —
//    a licensed T55 deletion.
// 2. The value is WIRED THROUGH: it used to die in `born.finish`
//    (cabinet.js) and reach neither the 3-D nor the BOM. Now every insert
//    part carries it on its record at birth (`meta.watch_finish`), and the
//    ONE material resolution (`resolvePanelMaterial`) — the same call the
//    3-D (`panelFinish`), the BOM and the sheet already read — honours it.

const H = watchDrawerFixedHeight(P);

const job = (finish) => computeCabinet({
  ...defaultParamsFor('WARDROBE', P),
  unit_num: 'W01',
  width: 900,
  sections: [{
    width_mm: 900,
    items: [
      { id: 'd1', kind: 'drawer', index: 1, height_mm: 200 },
      {
        id: 'd2',
        kind: 'drawer',
        index: 2,
        height_mm: H,
        watch_insert: true,
        ...(finish ? { watch_finish: finish } : {}),
      },
    ],
  }],
}, P);

/** A design whose fronts are SPRAYED wine red — the colour the choice buys. */
function sprayedFrontDesign(hex) {
  const d = migrateDesign({});
  d.fronts.types[0] = { ...d.fronts.types[0], source: 'spray', finish_id: null };
  d.colour.front = { system: 'custom', hex, name: hex };
  return d;
}

const UNIT = { params: {} };

test('F5 — the graves: oak and walnut are gone from the control and fall back to Project', () => {
  assert.deepEqual(WATCH_FINISHES.map((f) => f.id), ['spray'], 'one surviving choice beside Project');
  assert.equal(WATCH_FINISHES[0].label, 'Sprayed');
  assert.equal(watchFinishOf({ watch_finish: 'oak' }), null, 'a stored oak reads as Project now');
  assert.equal(watchFinishOf({ watch_finish: 'walnut' }), null, '…and a stored walnut');
  // Physical deletion: no reference survives in the module.
  const src = readFileSync(new URL('../src/engine/watchDrawer.js', import.meta.url), 'utf8');
  assert.doesNotMatch(src, /'oak'|'walnut'/, 'no oak, no walnut — deleted, not gated');
});

test('F5 — Sprayed: every insert part carries the record and resolves to the front spray', () => {
  const r = job('spray');
  const parts = r.panels.filter((p) => p.role === 'watch_insert');
  assert.ok(parts.length >= 8, 'the insert is cut');
  for (const p of parts) {
    assert.equal(p.meta.watch_finish, 'spray', `${p.id} carries the finish on its record`);
  }
  const design = sprayedFrontDesign('#7a1f2b');
  const finishes = resolveFinishes(UNIT, design, P);
  for (const p of parts) {
    const m = resolvePanelMaterial(p, UNIT, design, P, []);
    assert.deepEqual(m.finish, finishes.front, `${p.id} resolves to the FRONT finish`);
    assert.equal(m.finish.kind, 'spray');
    assert.equal(m.finish.hex, '#7a1f2b', 'the fronts\' own spray colour');
    // …and the 3-D reads the very same seam.
    const own = panelFinish(p, UNIT, design, P);
    assert.equal(own.finish.hex, '#7a1f2b', 'the picture is handed the spray');
    assert.equal(own.colour?.hex, '#7a1f2b', 'as paint, the way every sprayed piece is');
  }
});

test('F5 — Project: no record, todays carcass resolution, byte-identical to before the turn', () => {
  const r = job(null);
  const parts = r.panels.filter((p) => p.role === 'watch_insert');
  for (const p of parts) {
    assert.equal(p.meta.watch_finish, undefined, `${p.id}: Project leaves the record clean`);
  }
  const design = sprayedFrontDesign('#7a1f2b');
  const finishes = resolveFinishes(UNIT, design, P);
  const m = resolvePanelMaterial(parts[0], UNIT, design, P, []);
  assert.equal(m.kind, 'carcass', 'the carcass slot — exactly today\'s default');
  assert.deepEqual(m.finish, finishes.carcass, 'the project\'s own decor, reading as the carcass');
});

test('F5 — the BOM assembly line still says which finish the insert wears', () => {
  const sprayed = job('spray');
  const line = (sprayed.hardware || []).find((h) => h.role === 'watch_insert');
  assert.equal(line.spec.finish, 'spray');
  assert.match(line.spec_label, /spray/);
  const project = job(null);
  const quiet = (project.hardware || []).find((h) => h.role === 'watch_insert');
  assert.equal(quiet.spec.finish, undefined, 'Project says nothing — the default has no badge');
});
