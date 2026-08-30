import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { watchDrawerFixedHeight } from '../src/engine/watchDrawer.js';
import { sheetLay } from '../src/engine/cnc/layout.js';

// ─── T55 · F6 — INSERT GRAIN: HORIZONTAL, BORN THAT WAY ─────────────────────
//
// The owner, verbatim (now a Petros iron rule): *"wszystkie przegródki muszą
// być w poziomie słoje nie w pionie"* and *"jak mamy oklejać to musi być
// wzdłuż słojów nigdy w poprzek — to jest święta zasada w sheet goods."*
//
// Watch-insert parts were born with NO grain field at all. Now every insert
// board — dividers, frame rails, base — is drawn STANDING (its length up the
// sheet, the drawer-box convention) and states `grain: 'h'` at birth. The
// single-source rule stands: the cut decides the grain, the 3-D renders what
// was cut. No per-role visual overrides.

const H = watchDrawerFixedHeight(P);

const job = () => computeCabinet({
  ...defaultParamsFor('WARDROBE', P),
  unit_num: 'W01',
  width: 900,
  sections: [{
    width_mm: 900,
    items: [
      { id: 'd1', kind: 'drawer', index: 1, height_mm: 200 },
      {
        id: 'd2', kind: 'drawer', index: 2, height_mm: H, watch_insert: true,
      },
    ],
  }],
}, P);

const insertParts = (r) => r.panels.filter((p) => p.role === 'watch_insert');

test('F6 — every insert part carries grain, and it is \'h\'', () => {
  const parts = insertParts(job());
  assert.ok(parts.length >= 8, 'the insert is cut');
  for (const p of parts) {
    assert.equal(p.cnc.grain, 'h', `${p.id} (${p.part}) is born with grain 'h'`);
  }
});

test('F6 — the cut lays every board with its LENGTH along the grain — horizontal as fitted', () => {
  for (const p of insertParts(job())) {
    const lay = sheetLay(p);
    assert.equal(lay.turn, 0, `${p.id}: drawn standing already — no turn needed`);
    // `upMm` is the length along the grain; the piece's own long run is its
    // panel `w` — the horizontal run as fitted, on every rail and divider.
    assert.equal(lay.upMm, p.w, `${p.id}: the grain runs the piece's length`);
    assert.equal(lay.axis, 'w', `${p.id}: …which is the panel's own width axis`);
  }
});

test('F6 — the drawn frame is a RIGID turn: the housings still land under their dividers', () => {
  const r = job();
  const front = insertParts(r).find((p) => p.part === 'WATCH-RAIL-FRONT');
  const dividers = insertParts(r).filter((p) => p.part === 'WATCH-DIVIDER'
    && p.meta.divider === 'pocket');
  assert.ok(front && dividers.length >= 1);
  const slots = (front.cnc.pockets || []);
  assert.equal(slots.length, dividers.length, 'one housing per pocket divider');
  // In the STANDING frame the length runs up `y`; a divider standing at
  // room-x maps to a housing at the same distance along the rail.
  for (const d of dividers) {
    const along = d.box.x - front.box.x;
    assert.ok(slots.some((k) => Math.abs(k.y1 - along) < 0.01),
      `${d.id} at ${along} mm along the rail has its housing there`);
  }
});

test('F6 — no per-role visual override: the LISP states the law and nothing else paints it', () => {
  const lisp = readFileSync(new URL('../reference/lisp/KIT_WATCH_DRAWER.lsp', import.meta.url), 'utf8');
  assert.match(lisp, /THE INSERT GRAIN, BORN HORIZONTAL/);
  assert.match(lisp, /\(defun SKY:watchGrain \(\)/);
  const decors = readFileSync(new URL('../src/engine/decors.js', import.meta.url), 'utf8');
  assert.doesNotMatch(decors, /watch_insert/, 'the 3-D reader has no watch-insert special case');
});
