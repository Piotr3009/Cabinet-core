// ─── TURN 21 F3 / F4 / F5 — three verdicts the owner handed down ────────────
//
// F3  The 3-D wound-carving retires behind a flag. "The CNC sheet is the
//     document; the 3-D carving is not worth its problems."
// F4  Modals clear the object by 240 px. He used 140 for a day and asked for
//     more. Same law, one number.
// F5  The context guard stops shooting corpses: `forceContextLoss` on an
//     already-lost context is an INVALID_OPERATION, ten of them in his console.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { computeCabinet } from '../src/engine/cabinet.js';
import { joineryLayers } from '../src/engine/joinery.js';
import { panelRecesses } from '../src/engine/recesses.js';
import {
  DEFAULT_CABINET_PROFILE as P, getCabinetProfile, migrateCabinetProfile,
} from '../src/engine/profile.js';

const read = (rel) => readFileSync(new URL(`../src/${rel}`, import.meta.url), 'utf8');

// ─── F3 — retired, and retired by DEFAULT ──────────────────────────────────

test('F3.1 — `appearance.cuts.enabled` exists and is FALSE', () => {
  assert.equal(P.appearance.cuts.enabled, false, 'the owner’s call: retired');
  assert.equal(getCabinetProfile().appearance.cuts.enabled, false, '…and in the running profile');
  // A profile SAVED before this turn has no `cuts` at all and must read as the
  // default rather than as undefined — which would be falsy by luck, not by
  // rule, and would break the first time somebody stored `{}` there.
  const stored = { ...P, appearance: { ...P.appearance, cutFace: '#123456' } };
  delete stored.appearance.cuts;
  const old = migrateCabinetProfile(stored);
  assert.equal(old.appearance.cuts.enabled, false);
  assert.equal(old.appearance.cutFace, '#123456', 'and it keeps what it did say');
  // Flipping it is one line and nothing else.
  const on = migrateCabinetProfile({ ...P, appearance: { ...P.appearance, cuts: { enabled: true } } });
  assert.equal(on.appearance.cuts.enabled, true);
});

test('F3.1 — with the flag off, a drilled panel is a plain box again', async () => {
  const { clearPanelSolidCache, panelSolids } = await import('../src/3d/panelSolid.js');
  clearPanelSolidCache();
  const L = joineryLayers(P);
  const r = computeCabinet({
    type: 'BUDR', width: 600, height: 770, depth: 558, board_t: 18, front_t: 25, unit_num: '01',
  }, P);

  // A drawer side: two grooves and nothing else. Turn 20 carved them; with the
  // flag off it is the plain board turn 19 drew.
  const side = r.panels.find((p) => p.part === 'DRAWER-SIDE');
  const off = panelSolids(side, L, P, r.drills);
  assert.equal(off.solid, null, 'no carved solid — the caller falls back to a boxGeometry');
  assert.equal(off.cuts, null, 'and no cut-face buffer to fight with it in the depth buffer');

  // …and the machinery is retired, not deleted: one profile line brings it all
  // back, which is what F3.1 asks for.
  const on = panelSolids(side, L, { ...P, appearance: { ...P.appearance, cuts: { enabled: true } } }, r.drills);
  assert.ok(on.solid && on.cuts, 'the flag is a flag and not a tombstone');
  clearPanelSolidCache();
});

test('F3.2 — what was there BEFORE turn 20 is NOT behind the flag', async () => {
  const { clearPanelSolidCache, panelSolids } = await import('../src/3d/panelSolid.js');
  clearPanelSolidCache();
  const L = joineryLayers(P);
  const r = computeCabinet({
    type: 'WARDROBE',
    width: 600,
    height: 2150,
    depth: 578,
    board_t: 18,
    front_t: 25,
    front_type: 'S',
    hinge: 'L',
    unit_num: '01',
    shelves: 2,
    doors: true,
  }, P);

  // A carcass side carries the puzzle SOCKETS and the TABS — turn 11 and turn
  // 12, the board's own outline — plus a great many drillings. With the flag
  // off it still gets a real machined solid, because the sockets and tabs are
  // the shape of the board and were never turn 20's.
  const bul = r.panels.find((p) => p.id === 'BUL');
  const built = panelSolids(bul, L, P, r.drills);
  assert.ok(built.solid, 'the dog-boned, tabbed side is still a machined solid');
  assert.equal(built.cuts, null, 'but nothing is carved into its faces');
  // The drillings ARE still in the record — the CNC sheet is the document and
  // it has lost nothing. Only the 3-D carving of them is retired.
  const drilled = r.drills.filter((d) => d.panel === 'BUL');
  assert.ok(drilled.length > 10, `${drilled.length} drillings, still exported`);
  assert.ok(panelRecesses(bul, drilled, { thickness: 18, skipLayers: [L.socket] }).length > 10,
    'and the arithmetic that would carve them is intact, waiting on the flag');
  clearPanelSolidCache();
});

test('F3.3 — the always-on path is gone, not commented out', () => {
  const src = read('3d/panelSolid.js');
  // The gate is a real branch on the profile flag, and it is the ONLY place
  // recesses are computed.
  assert.equal((src.match(/panelRecesses\(/g) || []).length, 1, 'one call site, guarded');
  assert.match(src, /profile\?\.appearance\?\.cuts\?\.enabled/);
  // No dead always-on copy left lying about in a comment.
  assert.ok(!/^\s*\/\/\s*const recesses = panelRecesses/m.test(src));
  const view = read('3d/UnitView.jsx');
  // The view needs no flag of its own: `panelSolids` answers null and the cut
  // mesh is already conditional on it. One decision, one place.
  assert.ok(!view.includes('cuts.enabled'), 'the flag is read in exactly one file');
  assert.match(view, /cuts && !contour/);
});

// ─── F4 — 240, and read from the profile everywhere ────────────────────────

test('F4.1 — the offset is 240 across and still level with the click', () => {
  assert.deepEqual(P.ui.modal.anchorOffset, { x: 240, y: 0 });
  // Same law: right first, left where the right lacks room. One number moved.
  assert.deepEqual(migrateCabinetProfile({ ...P }).ui.modal.anchorOffset, { x: 240, y: 0 });
  // A workshop that stored 140 keeps 140 — the number is a preference and the
  // migration is not allowed to overwrite one somebody set.
  assert.deepEqual(
    migrateCabinetProfile({
      ...P, ui: { ...P.ui, modal: { ...P.ui.modal, anchorOffset: { x: 140 } } },
    }).ui.modal.anchorOffset,
    { x: 140, y: 0 },
  );
});

test('F4.2 — nothing hard-codes the number: every reader asks the profile', () => {
  for (const rel of ['components/Modal.jsx', 'lib/menuPlacement.js', 'lib/modalAnchor.js']) {
    const src = read(rel);
    assert.ok(!/\b140\b/.test(src.replace(/\/\/[^\n]*/g, '')), `${rel} carries no literal offset`);
    assert.ok(!/\b240\b/.test(src.replace(/\/\/[^\n]*/g, '')), `${rel} carries no literal offset`);
  }
  // …and the shell reads it from where rule 2 says it lives.
  assert.match(read('components/Modal.jsx'), /anchorOffset/);
});

// ─── F5 — the guard stops shooting corpses ─────────────────────────────────

test('F5.1 — a context is only forced while it is LIVE', () => {
  const src = read('3d/contextGuard.jsx');
  // The state is tracked, by all three routes a context can go away.
  assert.match(src, /function stillLive\(handle\)/);
  assert.match(src, /handle\.gone/);
  assert.match(src, /isContextLost\?\.\(\)/);
  // …and the force is guarded by it, while dispose is not — they are two acts.
  assert.match(src, /if \(live\) handle\.gl\.forceContextLoss\?\.\(\);/);
  assert.match(src, /handle\.gl\.dispose\?\.\(\);/);
  assert.match(src, /\} else if \(live\) \{\n\s*loseContextOf\(handle\.canvas\);/);
  // The renderer-less fallback asks the context itself, which is the authority.
  assert.match(src, /if \(!ctx \|\| ctx\.isContextLost\?\.\(\)\) return;/);
});

test('F5.1 — released exactly once per canvas lifetime, and marked gone', () => {
  const src = read('3d/contextGuard.jsx');
  // Turn 20's idempotence is untouched — "have I already done this" — and turn
  // 21 adds "is there anything to do". Two different questions, both asked.
  assert.match(src, /if \(!handle \|\| handle\.releasing\) return;/);
  assert.match(src, /handle\.releasing = true;/);
  assert.match(src, /\/\/ Whatever happened above, this canvas's context is not ours any more\.\n\s*handle\.gone = true;/);
  // A loss that arrives from anywhere marks the handle before anything else
  // can return early out of the listener.
  assert.match(src, /handle\.onLost = \(e\) => \{[\s\S]{0,220}handle\.gone = true;/);
  // A restored context is live again.
  assert.match(src, /handle\.onRestored = \(\) => \{[\s\S]{0,260}handle\.gone = false;/);
});

test('F5.2 — the ≤ 2 live contexts law and the counter the walk reads still stand', () => {
  const src = read('3d/contextGuard.jsx');
  for (const field of ['created', 'released', 'lost', 'restored', 'events']) {
    assert.ok(src.includes(field), `window.__cc.diag.${field}`);
  }
  assert.match(src, /liveContexts/);
  // Three surfaces mount a canvas; each guards its own, so a room plus one
  // open window is two and there is never a third.
  for (const [rel, name] of [
    ['3d/Scene.jsx', 'room'],
    ['components/CabinetEditorModal.jsx', 'editor'],
    ['components/PartDetailModal.jsx', 'part-detail'],
  ]) {
    assert.ok(read(rel).includes(`useContextGuard('${name}')`), `${rel} guards its canvas`);
  }
});
