// ─── TURN 65 · F5 — THE SHELF THAT CAPS AN OVERLAY STACK, SETBACK 0 ─────────
//
// The owner: *"półka nad overlay drawers nie powinna mieć setback, powinna być
// na 0"* — only that shelf, not every shelf — and the reason, which is why
// this is not cosmetic: *"jak dodasz szuflady to jest dziura i to wygląda
// okropnie."* A 20 mm slot above a drawer stack, seen from the front.
//
// CLAUDE.md F5, PROOF: *"a unit test asserting the capping shelf's depth
// equals D − boards·G (no clearance) while a plain shelf keeps the 20; the
// goldens unmoved."*

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const G = P.board.thickness;
const CLEAR = P.carcass.shelfDepthClearance;
const BOARDS = P.carcass.shelfDepthBoards;

const wardrobe = (over = {}) => computeCabinet({
  ...defaultParamsFor('WARDROBE', P), unit_num: '01', width: 900, height: 2150, ...over,
}, P);

const overlayStack = (n = 3, over = {}) => wardrobe({
  sections: [{
    items: Array.from({ length: n }, (_, i) => ({ id: `o${i + 1}`, kind: 'overlay_drawer', index: i + 1 })),
  }],
  ...over,
});

const plainShelves = (n = 2) => wardrobe({
  sections: [{ items: Array.from({ length: n }, (_, i) => ({ id: `s${i + 1}`, kind: 'shelf', index: i + 1 })) }],
});

// ═══ 1 · THE TWO DEPTHS, SIDE BY SIDE ══════════════════════════════════════

test('F5 · the capping shelf is D − boards·G, with NO clearance in it', () => {
  const r = overlayStack(3);
  const D = r.params.depth;
  const cap = r.panels.find((p) => p.id === 'OVERLAY-FIX');
  assert.ok(cap, 'the stack lost its fixed shelf');
  assert.equal(cap.meta.overlayStack, true, 'it no longer says which stack it caps');
  assert.equal(cap.h, D - BOARDS * G, `capping shelf depth ${cap.h} is not D − ${BOARDS}×G`);
  assert.equal(cap.meta.front_mm, 0, 'the setback is still on it');
  // …and it is FLUSH with the carcass face: front edge at z = D, no slot.
  assert.equal(cap.box.z + cap.box.d, D, 'a gap is left in front of the capping shelf');
});

test('F5 · …and a plain shelf still keeps its 20', () => {
  const r = plainShelves(2);
  const D = r.params.depth;
  const shelves = r.panels.filter((p) => p.part === 'SHELF' && p.meta?.variant !== 'fixed');
  assert.ok(shelves.length >= 1, 'no plain shelf was cut');
  assert.equal(CLEAR, 20, 'the profile clearance moved — F5 was told not to touch it');
  for (const s of shelves) {
    assert.equal(s.h, D - BOARDS * G - CLEAR, `a plain shelf lost its clearance: ${s.h}`);
    assert.equal(s.meta.front_mm, CLEAR, 'a plain shelf lost its setback');
  }
});

test('F5 · the two are exactly the clearance apart — one change, one board', () => {
  const cap = overlayStack(3).panels.find((p) => p.id === 'OVERLAY-FIX');
  const plain = plainShelves(1).panels.find((p) => p.part === 'SHELF' && p.meta?.variant !== 'fixed');
  assert.equal(cap.h - plain.h, CLEAR, 'the capping shelf is not exactly the clearance deeper');
});

test('F5 · the stack\'s own shelf is the ONLY board that takes the exception', () => {
  const r = overlayStack(3);
  const exempt = r.panels.filter((p) => p.part === 'SHELF' && p.meta?.front_mm === 0);
  assert.equal(exempt.length, 1, `${exempt.length} boards take the exception, not 1`);
  assert.equal(exempt[0].id, 'OVERLAY-FIX');
});

// ═══ 2 · LISP IS LAW, AND THE LAW ALREADY SAID IT ══════════════════════════

test('F5 · the engine now matches the kit: wysPART has no 20.0, wysSHELF has', () => {
  const kit = read('reference/lisp/KIT_WARDROBE_FULL.lsp');
  // The capping board — the PARTITION PANEL — is cut depth − one board.
  assert.match(kit, /\(setq wysPART \(- glSzafki gruboscPlyty\)\)/,
    'the kit no longer cuts the partition panel at full depth');
  // The plain shelf takes the clearance, in the same kit, twenty lines apart.
  assert.match(kit, /wysSHELF \(- glSzafki gruboscPlyty 20\.0\)/,
    'the kit no longer cuts a plain shelf with its clearance');
  // …and the engine says which of the two it is following, by name.
  const eng = read('src/engine/cabinet.js');
  assert.match(eng, /const OVERLAY_CAP_CLEARANCE = 0;/, 'the exception is not named');
  assert.match(eng, /setbackOf\(null, OVERLAY_CAP_CLEARANCE\)/, 'the capping shelf does not use it');
});

test('F5 · NARROW: every other shelf site still reads the profile clearance', () => {
  const eng = read('src/engine/cabinet.js');
  // The profile key is untouched and still read by the other sites.
  assert.equal(P.carcass.shelfDepthClearance, 20);
  const reads = [...eng.matchAll(/setbackOf\([^)]*C\.shelfDepthClearance\)/g)].length;
  assert.ok(reads >= 4, `only ${reads} sites still read the profile clearance — the change was not narrow`);
  // …and exactly ONE site takes the exception.
  assert.equal([...eng.matchAll(/OVERLAY_CAP_CLEARANCE\)/g)].length, 1,
    'the exception is used at more than one site');
});

// ═══ 3 · THE GATE ══════════════════════════════════════════════════════════

test('F5 · no golden can reach this code path — none of the six carries a stack', async () => {
  const { overlayDrawerItems } = await import('../src/engine/overlayDrawers.js');
  for (const id of ['WARDROBE', 'BUD', 'WUD', 'BUDR', 'BUDR4', 'PANTRY']) {
    const items = defaultParamsFor(id, P)?.sections?.[0]?.items || [];
    assert.equal(overlayDrawerItems(items).length, 0, `${id} carries an overlay stack — F5 would move it`);
  }
});
