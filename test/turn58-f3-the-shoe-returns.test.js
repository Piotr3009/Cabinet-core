import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import { computeCabinet } from '../src/engine/cabinet.js';
import { defaultParamsFor } from '../src/engine/types.js';
import {
  elementFields, elementKind, elementLabel, isSelectableElement,
} from '../src/engine/elements.js';
import { ELEMENT_TO_PART_ID, partIdForElement } from '../src/engine/partRegistry.js';
import { lispConstant, T58_PROFILE } from '../scripts/t58-paren-balance.mjs';

// ─── TURN 58 · F3 — THE SHOE RETURNS ────────────────────────────────────────
//
// T54-F7 buried the shoe BOX and everything in its world — the licence names
// the graves, `reference/lisp/KIT_SHOE_BOX.lsp` among them — and said of what
// it was NOT killing: *"The tilted shoe SHELF (15°, T33) is a DIFFERENT entity
// and is NOT touched."* True of the geometry. Not true of the law: the shelf's
// own kit went into the same grave, and since that night its 15° and its stop
// rail have lived in JavaScript alone. Iron rule 1 broken by accident.
//
// And the rail was worse off than homeless. `SHOE-RAIL` is CUT, it is in the
// BOM, `partRegistry` gives it a material slot, the scene DRAWS it — and
// `elementKind` fell through to `null`, so it was the one cut board in this app
// nobody could click, name or open. T54 wrote that down as a fact about the
// board ("was never selectable") rather than as the omission it was.
//
// SO THE SHOE RETURNS, twice: its law comes home to KIT_WARDROBE_FULL.lsp as
// added LINES (the shelf is not a product — it is a wardrobe shelf set at an
// angle — so it gets no kit of its own and the census stays 14), and its rail
// becomes a piece a joiner can point at.
//
// NOTHING IS RE-CUT. The blank is the same rectangle, the tilt is the same 15°,
// the rail is the same 18 × 60, and it still ships UNDRILLED. This turn moves
// the LAW, not the board.

const shoeWardrobe = (over = {}) => {
  const items = [{ id: 's1', kind: 'shelf', variant: 'shoe', pos_mm: 800 }];
  return computeCabinet({
    ...defaultParamsFor('WARDROBE', P),
    unit_num: 'W01',
    width: 900,
    items,
    sections: [{ items }],
    ...over,
  }, P);
};

const shelfOf = (r) => r.panels.find((p) => p.part === 'SHELF');
const railOf = (r) => r.panels.find((p) => p.part === 'SHOE-RAIL');

// ═══ 1. LISP IS LAW — AND THE ENGINE'S NUMBERS ARE THE KIT'S ════════════════

test('F3 · the shoe shelf\'s numbers are STATED in the kit, one line each', () => {
  for (const name of T58_PROFILE) {
    assert.equal(typeof lispConstant(name), 'number', `${name} is stated in the kit`);
  }
  // Read OFF the file, never restated in this test — which is what makes it a
  // check and not a second copy of the law.
  assert.equal(lispConstant('shoeTiltDeg'), 15, "the owner's number, 15.08.2026");
  assert.equal(lispConstant('shoeRailH'), 60);
  assert.equal(lispConstant('shoeRailT'), 18);
});

test('F3 · and the engine cuts exactly what the kit says', () => {
  const SS = P.wardrobeAccessories.shoeShelf;
  assert.equal(SS.tiltDeg, lispConstant('shoeTiltDeg'), 'the tilt is the kit\'s');
  assert.equal(SS.stopRail.height, lispConstant('shoeRailH'), 'the rail\'s height is the kit\'s');
  assert.equal(SS.stopRail.thickness, lispConstant('shoeRailT'), 'and its thickness');

  const r = shoeWardrobe();
  const rail = railOf(r);
  assert.ok(rail, 'the rail is cut with the board');
  assert.equal(rail.h, lispConstant('shoeRailH'));
  assert.equal(rail.thickness, lispConstant('shoeRailT'));
  assert.equal(shelfOf(r).meta.tilt_deg, lispConstant('shoeTiltDeg'));
});

// ═══ 2. THE RAIL IS A PIECE YOU CAN POINT AT ════════════════════════════════

test('F3 · SHOE-RAIL is an element, with a joiner\'s name for it', () => {
  const rail = railOf(shoeWardrobe());
  assert.equal(elementKind(rail), 'shoe-rail', 'it fell through to null until tonight');
  assert.equal(elementLabel(rail), 'Shoe shelf rail');
  assert.equal(isSelectableElement(rail), true, 'so it can be picked and opened');
});

test('F3 · …and it offers the one field it honestly has', () => {
  const rail = railOf(shoeWardrobe());
  // Its length is the shelf's width, its section is the profile's law and it
  // carries no fixing — so MATERIAL is the only decision there is to make.
  assert.deepEqual(elementFields(rail), ['material']);
});

test('F3 · it was already in the BOM and the material tree — now it agrees with them', () => {
  // The board has had a registry slot since T39; what it lacked was an
  // identity in the editor. Both readings must name the same piece.
  assert.equal(ELEMENT_TO_PART_ID['SHOE-RAIL'], 'shelf');
  assert.equal(partIdForElement('SHOE-RAIL', { typeId: 'WARDROBE' }).length > 0, true);
  assert.equal(elementKind(railOf(shoeWardrobe())), 'shoe-rail');
});

// ═══ 3. NOTHING IS RE-CUT ═══════════════════════════════════════════════════

test('F3 · the blank is still a plain rectangle — a board that leans is cut square', () => {
  const r = shoeWardrobe();
  const shelf = shelfOf(r);
  const rail = railOf(r);
  // Four corners, two distinct x, two distinct y: a rectangle and nothing else.
  for (const [what, panel] of [['shelf', shelf], ['rail', rail]]) {
    const outline = panel.cnc.outline;
    assert.equal(outline.length, 4, `the ${what} blank has four corners`);
    assert.equal(new Set(outline.map((q) => q[0])).size, 2, `the ${what} is square in x`);
    assert.equal(new Set(outline.map((q) => q[1])).size, 2, `the ${what} is square in y`);
  }
  // The angle is set by the pins the board rests on, so no cut carries it.
  assert.equal(shelf.cnc.slopeCut, undefined, 'no cut on this sheet claims the tilt');
});

test('F3 · the rail ships UNDRILLED — no line in the kit fixes a listwa', () => {
  const r = shoeWardrobe();
  assert.equal(r.drills.filter((d) => /^SHOE-RAIL/.test(d.panel)).length, 0);
});

test('F3 · the rail is the shelf\'s own width — there is no second arithmetic', () => {
  const r = shoeWardrobe();
  assert.equal(railOf(r).w, shelfOf(r).w);
});

test('F3 · a wardrobe with no shoe shelf cuts no rail at all', () => {
  const bare = computeCabinet({ ...defaultParamsFor('WARDROBE', P), unit_num: '01' }, P);
  assert.equal(bare.panels.filter((p) => p.part === 'SHOE-RAIL').length, 0);
});
