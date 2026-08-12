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

// ─── F3 — RETIRED IN TURN 21, REINSTATED IN TURN 26 ────────────────────────
//
// Turn 21's verdict was the owner's and it stands as a record of what he saw:
// pilot dots on his door faces and stray dashes inside his carcasses. Turn 26
// R10 is his newer and higher law — "cut CNC musi być twoją drogą do
// wizualizacji, nie na odwrót" — and it reverses the retirement, because the
// example that forced it is a side panel with three ⌀7.5 holes per level on
// the sheet and NO holes at all in the scene.
//
// What was actually wrong was never the carving: no drilling stated a DEPTH,
// so every one of them read as a hole straight through the board. Those pilot
// dots ARE that fault. The flag ships TRUE now, the cup states its own 11 mm,
// and WHICH classes are bored is a named policy (engine/machining.js).
//
// The tests below keep their turn-21 shape so the reversal is legible: the
// same three questions, the opposite answers, and the MIGRATION unchanged.

test('F3.1 — `appearance.cuts.enabled` exists and is TRUE (turn 26, R10)', () => {
  assert.equal(P.appearance.cuts.enabled, true, 'the owner’s newer call: the scene renders the record');
  assert.equal(getCabinetProfile().appearance.cuts.enabled, true, '…and in the running profile');
  // A profile SAVED before turn 21 has no `cuts` at all and must read as the
  // default rather than as undefined — which would be falsy by luck, not by
  // rule, and would break the first time somebody stored `{}` there.
  const stored = { ...P, appearance: { ...P.appearance, cutFace: '#123456' } };
  delete stored.appearance.cuts;
  const old = migrateCabinetProfile(stored);
  assert.equal(old.appearance.cuts.enabled, true);
  assert.equal(old.appearance.cutFace, '#123456', 'and it keeps what it did say');
  // …and a workshop that has deliberately turned it OFF keeps it off: it is a
  // flag, in both directions.
  const off = migrateCabinetProfile({ ...P, appearance: { ...P.appearance, cuts: { enabled: false } } });
  assert.equal(off.appearance.cuts.enabled, false);
});

test('F3.1 — with the flag ON, a drilled panel is carved; OFF, it is a plain box', async () => {
  const { clearPanelSolidCache, panelSolids } = await import('../src/3d/panelSolid.js');
  clearPanelSolidCache();
  const L = joineryLayers(P);
  const r = computeCabinet({
    type: 'BUDR', width: 600, height: 770, depth: 558, board_t: 18, front_t: 25, unit_num: '01',
  }, P);

  // A drawer side: two grooves and nothing else.
  const side = r.panels.find((p) => p.part === 'DRAWER-SIDE');
  const on = panelSolids(side, L, P, r.drills);
  assert.ok(on.solid && on.cuts, 'the grooves are a real absence with real walls');

  const off = panelSolids(side, L, { ...P, appearance: { ...P.appearance, cuts: { enabled: false } } }, r.drills);
  assert.equal(off.solid, null, 'flag off — the caller falls back to a boxGeometry');
  assert.equal(off.cuts, null, 'and no cut-face buffer to fight with it in the depth buffer');
  clearPanelSolidCache();
});

test('F3.2 — what was there BEFORE turn 20 does not depend on the flag either way', async () => {
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
  // OFF it still gets a real machined solid, because the sockets and tabs are
  // the shape of the board and were never turn 20's.
  const bul = r.panels.find((p) => p.id === 'BUL');
  const off = { ...P, appearance: { ...P.appearance, cuts: { enabled: false } } };
  const bare = panelSolids(bul, L, off, r.drills);
  assert.ok(bare.solid, 'the dog-boned, tabbed side is still a machined solid');
  assert.equal(bare.cuts, null, 'but nothing is carved into its faces');
  clearPanelSolidCache();
  // …and with the flag on — the shipped default — the drillings are THERE.
  const built = panelSolids(bul, L, P, r.drills);
  assert.ok(built.solid && built.cuts, 'R10: what the sheet drills, the scene bores');
  const drilled = r.drills.filter((d) => d.panel === 'BUL');
  assert.ok(drilled.length > 10, `${drilled.length} drillings, still exported`);
  assert.ok(panelRecesses(bul, drilled, { thickness: 18, skipLayers: [L.socket], profile: P }).length > 10,
    'and every one of them is a recess the view can cut');
  clearPanelSolidCache();
});

test('F3.3 — the recess pass has ONE call site, and it is guarded', () => {
  const src = read('3d/panelSolid.js');
  // The gate is a real branch on the profile flag, and it is the ONLY place a
  // carcass board's recesses are computed.
  assert.equal((src.match(/panelRecesses\(/g) || []).length, 1, 'one call site, guarded');
  assert.match(src, /profile\?\.appearance\?\.cuts\?\.enabled/);
  // No dead always-on copy left lying about in a comment.
  assert.ok(!/^\s*\/\/\s*const recesses = panelRecesses/m.test(src));
  const view = read('3d/UnitView.jsx');
  // ─── TURN 26 (CLAUDE.md F3.3) ───
  // The view now reads the flag ONCE, for the one panel class that never went
  // through `panelSolids` at all: a SHAKER leaf, whose tray is its own solid
  // (3d/shakerSolid.js) and which therefore has to bore its own cups or be the
  // single FRONT class the scene does not show. It is named, not incidental.
  assert.equal((view.match(/cuts\?\.enabled/g) || []).length, 1, 'exactly one reader in the view, and it is the shaker tray');
  assert.match(view, /shakerFrontGeometry\(p, panelRecesses\(/);
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
