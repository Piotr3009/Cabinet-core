// ─── Turn 14, F2: the FRIDGE's backs sit ON the dog bones ───────────────────
//
// A fridge housing has no full back. Three pieces close it — RAIL1 at the
// bottom, RAIL2 across the fridge zone and BACK above the fixed panel — and the
// sides are the ORDINARY drawBUL/drawBUR, so they carry the ordinary three back
// tenons with their dog-bone reliefs at 95 / H/2 / H−95 (SKYLON_COMMON.lsp
// L699, L737-739).
//
// Three pieces, three tenons, and every one of the pieces carries exactly ONE
// socket on each short edge, 95 mm in (KIT_FRIDGE.lsp L340-346, L366-372,
// L381-387). So the geometry is not a matter of taste: each piece stands where
// its own socket meets the tenon it is for. That is what these tests assert,
// and they assert it BY CLOSING THE JOINT rather than by repeating a constant.

import test from 'node:test';
import assert from 'node:assert/strict';

import { computeCabinet } from '../src/engine/cabinet.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { defaultParamsFor } from '../src/engine/types.js';
import { tabCentres } from '../src/engine/puzzle.js';
import { panelPlacement } from '../src/engine/joinery.js';

const fridge = (over = {}) => computeCabinet(
  { ...defaultParamsFor('FRIDGE', P), unit_num: 'F01', ...over },
  P,
);

const panelOf = (r, id) => r.panels.find((p) => p.id === id);
const G = P.board.thickness;
const E = P.puzzle.tabCentresFromEnd;

/** Where a socket pocket on one of a back piece's SHORT edges sits, in cabinet mm. */
function shortEdgeSocketY(panel) {
  const rows = (panel.cnc.pockets || [])
    .filter((p) => p.layer === P.puzzle.layers.socket)
    // A short-edge socket spans the panel's x, not its y: its pocket is wider
    // across the drawn x than it is deep.
    .filter((p) => Math.abs(p.x2 - p.x1) > Math.abs(p.y2 - p.y1));
  assert.ok(rows.length >= 1, `${panel.id} has no socket on a short edge`);
  const centres = [...new Set(rows.map((p) => Math.round(((p.x1 + p.x2) / 2) * 10) / 10))];
  assert.equal(centres.length, 1, `${panel.id}: one row, at one height (${centres})`);
  // The drawn x runs UP the cabinet from the panel's own bottom edge.
  return panel.box.y + centres[0];
}

test('F2 — the side panels still carry the ordinary three tenons', () => {
  const r = fridge();
  const H = r.derived.height ?? 2100;
  const rows = tabCentres(H, P.puzzle);
  assert.equal(rows.length, 3, 'a fridge is never short enough to drop the middle one');
  assert.deepEqual(rows.map((v) => Math.round(v)), [E, Math.round(H / 2), Math.round(H - E)]);
});

test('F2 — RAIL1 is FLUSH WITH THE BOTTOM, and its socket is on the lowest tenon', () => {
  const r = fridge();
  const rail = panelOf(r, 'RAIL1');
  // "the bottom back sits above instead of ON": it stood on the BOTTOM panel at
  // y = 18, which put its socket at 113 and left the tenon at 95 unmet.
  assert.equal(rail.box.y, 0, 'flush with the bottom of the carcass, like the ordinary BACK');
  assert.equal(shortEdgeSocketY(rail), E, 'and the socket lands exactly on the tenon');
});

test('F2 — RAIL1 still reaches the BOTTOM panel it is socketed to', () => {
  // Its left edge receives the bottom panel's own back tenons (KIT_FRIDGE.lsp
  // L351-358), and that joint only exists if the rail starts at y = 0.
  const rail = panelOf(fridge(), 'RAIL1');
  const sideSockets = (rail.cnc.pockets || [])
    .filter((p) => p.layer === P.puzzle.layers.socket)
    .filter((p) => Math.abs(p.y2 - p.y1) > Math.abs(p.x2 - p.x1));
  assert.equal(sideSockets.length, 2, 'two, one per bottom-panel tenon');
  assert.equal(rail.box.y, 0);
});

test('F2 — RAIL2 hangs on the MIDDLE tenon, not on the middle of the fridge', () => {
  const r = fridge();
  const H = 2100;
  const rail = panelOf(r, 'RAIL2');
  // "the small back panels sit BELOW the dog-bone row". It was centred on the
  // fridge zone — G + fridgeH/2 − railH/2 = 811 — which is 144 mm under the
  // tenon at 1050.
  assert.equal(shortEdgeSocketY(rail), H / 2, 'exactly ON the middle tenon');
  assert.equal(rail.box.y, H / 2 - E);
  assert.notEqual(rail.box.y, G + 1786 / 2 - P.fridgeUnit.railHeight / 2);
});

test('F2 — the top BACK is the right way up: its row is on the TOP tenon', () => {
  const r = fridge();
  const H = 2100;
  const back = panelOf(r, 'BACK');
  // "the top back is UPSIDE-DOWN (bones at the bottom, must be at the top)":
  // the row was cut 95 from the panel's BOTTOM, which is 1899 — no tenon there.
  assert.equal(shortEdgeSocketY(back), H - E, 'on the side panels’ top tenon');
  assert.equal(back.box.y, r.derived.fixed_panel_y, 'the SPAN was always right');
  assert.equal(back.box.y + back.box.h, H, 'fixed panel to the very top');
});

test('F2 — and with the row moved, all FOUR of the top back’s joints close', () => {
  // The check that says "turned", not "mirrored". Every feature on this panel
  // is placed in cabinet millimetres and asked where it landed.
  const r = fridge();
  const H = 2100;
  const back = panelOf(r, 'BACK');
  const pl = panelPlacement(back);
  const yOf = (x) => pl.origin[1] + pl.u[1] * x;

  const S = G / 2;   // turn 24 (CLAUDE.md F4)
  const screws = (back.cnc.holes || []).filter((h) => h.kind === 'screw');
  const screwY = [...new Set(screws.map((h) => Math.round(yOf(h.x))))].sort((a, b) => a - b);

  // The fixed panel is at 1804 and the cabinet's top face at 2100.
  assert.ok(screwY.some((y) => Math.abs(y - Math.round(r.derived.fixed_panel_y + G / 2)) <= 1),
    `the fixed-panel screws are at the fixed panel (${screwY})`);
  assert.ok(screwY.some((y) => Math.abs(y - Math.round(H - S)) <= 1),
    `the top-panel screws are at the top (${screwY})`);

  // The TOP panel's tenons go into the panel's far edge — which is the ceiling.
  const topEdge = (back.cnc.pockets || [])
    .filter((p) => p.layer === P.puzzle.layers.socket)
    .filter((p) => Math.abs(p.y2 - p.y1) > Math.abs(p.x2 - p.x1));
  assert.equal(topEdge.length, 2, 'two, one per top-panel tenon');
  for (const p of topEdge) {
    assert.ok(Math.abs(yOf((p.x1 + p.x2) / 2) - H) <= G, 'and they are at the cabinet’s top');
  }
});

test('F2 — nothing about the CUT SIZES moved: the golden fixture still holds', () => {
  const r = fridge();
  const sizes = Object.fromEntries(r.panels.map((p) => [p.id, [p.w, p.h]]));
  assert.deepEqual(sizes.RAIL1, [600, 200]);
  assert.deepEqual(sizes.RAIL2, [600, 200]);
  assert.deepEqual(sizes.BACK, [600, 296]);
  assert.deepEqual(sizes.SPURS, [556, 260]);
  assert.equal(r.derived.fixed_panel_y, 1804);
});

test('F2 — the three pieces catch three DIFFERENT tenons, and never each other', () => {
  const r = fridge();
  const H = 2100;
  const caught = ['RAIL1', 'RAIL2', 'BACK'].map((id) => shortEdgeSocketY(panelOf(r, id)));
  assert.deepEqual(caught, tabCentres(H, P.puzzle));
  // …and no two pieces overlap in the cabinet.
  const spans = ['RAIL1', 'RAIL2', 'BACK']
    .map((id) => panelOf(r, id))
    .map((p) => [p.box.y, p.box.y + p.box.h])
    .sort((a, b) => a[0] - b[0]);
  for (let i = 1; i < spans.length; i += 1) {
    assert.ok(spans[i][0] >= spans[i - 1][1], `${JSON.stringify(spans)} overlap`);
  }
});

test('F2 — a fridge too short for its housing SAYS SO rather than moving the rail', () => {
  // The middle tenon is at half the CARCASS height and takes no notice of the
  // fridge, so a small fridge in a tall housing puts the fixed panel through
  // the middle rail. That is a number to change, and the engine says which.
  const warned = fridge({ fridge_h: 800 }).warnings.map((w) => w.code);
  assert.ok(warned.includes('FRIDGE_RAIL_MEETS_FIXED_PANEL'), warned.join(', '));
  assert.ok(!fridge().warnings.some((w) => w.code === 'FRIDGE_RAIL_MEETS_FIXED_PANEL'),
    'and the shipped default is silent');
});
