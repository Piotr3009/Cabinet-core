import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  DECOR_FAMILIES, DECOR_SPECIES, decorFamily, familiesInCatalogue, filterByFamily,
} from '../src/lib/decorFamilies.js';
import { chosenTile, chosenTileText, decorShortName } from '../src/lib/chosenDecor.js';
import { parseDecorCatalogue, setDecorCatalogue } from '../src/engine/decors.js';
import { MODAL_KINDS, modalNeedsAnchor } from '../src/lib/modalLayer.js';
import { TILE_SWATCH_PX } from '../src/lib/wizardTabs.js';

// ─── TURN 45 · F3 — THE DECOR PICKER BECOMES A MODAL ────────────────────────
//
// The owner, 23.08.2026, on what T44 shipped: *"okno w oknie, roll w dół,
// wkurw na maxa."* The approved mockup, the same day:
//
//   *"The tab shows ONE slot: `Choose decor…`. Click → a SEPARATE modal
//   (backdrop, own single scrolling grid — no scroll-in-scroll, no
//   window-over-window, ever): search on top, a FAMILY filter bar (Oak, Walnut,
//   Ash… — Egger's own taxonomy, supplier-agnostic for the future), large
//   tiles. Click a tile = chosen + modal closes. The tab then shows exactly ONE
//   tile (swatch + code + name + ST) with `Change`. The SAME single tile is
//   what the Summary shows. Spraying: picked from the list, but once picked it
//   renders as the SAME large tile."*
//
// CLAUDE.md's own test, verbatim: *"DOM — after choice the tab contains one
// tile and zero grid; the modal contains the only scrollable region."* The DOM
// half of that is the browser probe's (verify/t45/); the SOURCE half — that
// there is no code path by which the tab could grow a grid — is here, because a
// rule that only a screenshot enforces comes back the next time somebody is in
// a hurry.

const PANEL = readFileSync(new URL('../src/components/MaterialChoicePanel.jsx', import.meta.url), 'utf8');
const MODAL = readFileSync(new URL('../src/components/DecorPickerModal.jsx', import.meta.url), 'utf8');
const TILE = readFileSync(new URL('../src/components/ChosenDecorTile.jsx', import.meta.url), 'utf8');
const WIZ = readFileSync(new URL('../src/components/WizardSettings.jsx', import.meta.url), 'utf8');

const CATALOGUE = JSON.parse(
  readFileSync(new URL('../public/decors/egger/egger-decors.json', import.meta.url), 'utf8'),
);
const { decors: DECORS } = parseDecorCatalogue(CATALOGUE);
// The app loads the pack once, at the top (`App.jsx`). A veneer BORROWS an
// EGGER scan and borrows the credit with it, so the registry has to be standing
// for that half of the licence check to mean anything.
setDecorCatalogue(DECORS);

// ══ the family bar — EGGER's own taxonomy, supplier-agnostic ════════════════

test('F3 — the family bar is the TIMBER, read out of the supplier’s own name', () => {
  assert.ok(DECOR_SPECIES.includes('Oak'));
  assert.ok(DECOR_SPECIES.includes('Walnut'));
  assert.ok(DECOR_SPECIES.includes('Ash'));
  assert.equal(decorFamily({ category: 'woodgrain', name: 'H1180 ST37 Natural Halifax Oak' }), 'oak');
  assert.equal(decorFamily({ category: 'woodgrain', name: 'H1307 ST19 Brown Warmia Walnut' }), 'walnut');
  assert.equal(decorFamily({ category: 'woodgrain', name: 'H3860 ST9 Champagne Hard Maple' }), 'maple');
  // A uni colour is a Uni whatever its name says — a wood filter never
  // surfaces one, and "Cashmere Grey" is not an ash.
  assert.equal(decorFamily({ category: 'uni_colour', name: 'U702 ST9 Cashmere Grey' }), 'uni');
  // WHOLE WORDS only: "Coco Bolo" does not become an oak on three letters.
  assert.equal(decorFamily({ category: 'woodgrain', name: 'H3012 ST22 Coco Bolo' }), 'other');
  // …and a species nobody has classified falls into a PLACE, never a hole.
  assert.equal(decorFamily({ category: 'woodgrain', name: 'X1 ST1 Rare Bubinga' }), 'other');
  assert.equal(decorFamily(null), 'other');
});

test('F3 — every one of the 85 shipped decors is reachable by some family', () => {
  const families = familiesInCatalogue(DECORS);
  const ids = new Set(families.map((f) => f.id));
  const covered = DECORS.filter((d) => ids.has(decorFamily(d)));
  assert.equal(covered.length, DECORS.length, 'a decor no filter can reach is the bug this file prevents');
  // The bar only ever offers a family that has tiles behind it.
  for (const f of families) {
    assert.ok(f.count > 0);
    assert.equal(filterByFamily(DECORS, f.id).length, f.count);
  }
  // Oak is the reason the bar exists at all.
  const oak = families.find((f) => f.id === 'oak');
  assert.ok(oak && oak.count > 20, `oak is ${oak?.count || 0} of ${DECORS.length}`);
  // No family is offered that the pack cannot fill.
  assert.ok(families.length < DECOR_FAMILIES.length);
});

test('F3 — no family chosen means the whole list, unfiltered', () => {
  assert.equal(filterByFamily(DECORS, null).length, DECORS.length);
  assert.equal(filterByFamily(null, 'oak').length, 0);
});

// ══ one chosen-decor format across laminate / veneer / spraying ═════════════

test('F3 — ONE tile answers for a laminate, a veneer and a sprayed colour', () => {
  const laminate = chosenTile({ picker: 'decor', value: 'egger:H1180_37', decors: DECORS });
  assert.equal(laminate.kind, 'decor');
  assert.equal(laminate.code, 'H1180');
  assert.equal(laminate.texture, 'ST37', 'swatch + code + name + ST');
  assert.equal(laminate.source, 'EGGER');
  assert.ok(laminate.thumb, 'the picture is the pack’s own');

  const veneer = chosenTile({ picker: 'veneer', value: 'veneer:oak-natural', decors: DECORS });
  assert.equal(veneer.kind, 'veneer');
  assert.match(veneer.name, /veneer/);
  // A veneer BORROWS an EGGER scan, so it borrows the credit with it.
  assert.match(veneer.attribution, /EGGER/);

  const spray = chosenTile({ picker: 'colour', colour: { hex: '#1F3A5F', name: 'Hague Blue', system: 'F&B' } });
  assert.equal(spray.kind, 'spray');
  assert.equal(spray.name, 'Hague Blue');
  assert.equal(String(spray.hex).toLowerCase(), '#1f3a5f');
  assert.equal(spray.thumb, null, 'a lacquer is a code on a tin, not a picture of a board');

  // All three answer the SAME shape — that is what "one format" means.
  for (const t of [laminate, veneer, spray]) {
    assert.deepEqual(
      Object.keys(t).filter((k) => ['kind', 'code', 'name', 'texture', 'hex', 'thumb', 'source'].includes(k)).sort(),
      ['code', 'hex', 'kind', 'name', 'source', 'texture', 'thumb'].sort(),
    );
    assert.ok(chosenTileText(t).length > 0);
  }
});

test('F3 — nothing chosen is NULL, which is what puts the slot on the screen', () => {
  assert.equal(chosenTile({ picker: 'decor', value: null, decors: DECORS }), null);
  assert.equal(chosenTile({ picker: 'veneer', value: null }), null);
  assert.equal(chosenTile({ picker: 'colour', colour: null }), null);
  assert.equal(chosenTile({ picker: 'colour', colour: {} }), null);
  assert.equal(chosenTileText(null), 'nothing chosen yet');
});

test('F3 — an unloaded catalogue still shows a tile, never an empty slot', () => {
  const t = chosenTile({ picker: 'decor', value: 'egger:H1180_37', decors: [] });
  assert.ok(t, 'something WAS chosen, and the screen must not say otherwise');
  assert.equal(t.code, 'H1180_37');
});

test('F3 — the tile’s name drops the code and the surface it already begins with', () => {
  assert.equal(decorShortName({ code: 'H1180', texture: 'ST37', name: 'H1180 ST37 Natural Halifax Oak' }),
    'Natural Halifax Oak');
});

// ══ the tab: ONE slot, ONE tile, ZERO grid ═════════════════════════════════

test('F3 — the tab holds one slot and one tile, and no grid of any kind', () => {
  // The two states of one control, in one component.
  assert.match(TILE, /data-choose-decor=/);
  assert.match(TILE, /data-chosen-tile=/);
  assert.match(TILE, /data-change-decor=/);
  assert.match(TILE, /Choose decor…/);
  assert.match(TILE, /Change/);
  // The tab renders that component and NOTHING that could grow into a list.
  assert.match(PANEL, /<ChosenDecorTile/);
  assert.doesNotMatch(PANEL, /data-egger-tile/, 'no tile grid in the tab');
  assert.doesNotMatch(PANEL, /overflow-y-auto/, 'and no scrolling region in the tab at all');
  assert.doesNotMatch(PANEL, /<select/, 'the lists went with the grid');
  assert.doesNotMatch(PANEL, /filterDecors|filterVeneers|COLOUR_SYSTEMS/, 'the tab filters nothing');
});

// *"The SAME single tile is what the Summary shows"* — the Summary is F4's own
// screen, so that half of F3's sentence is asserted in
// test/turn45-f4-duplicates-die-step6-summary.test.js, beside the thing it is
// about.

// ══ the modal: a window, a backdrop, and the ONE scrolling region ══════════

test('F3 — the picker is a WINDOW now, and the shell knows its name', () => {
  assert.match(MODAL, /import Modal from '\.\/Modal\.jsx'/);
  assert.match(MODAL, /name="decor-picker"/);
  assert.ok(MODAL_KINDS['decor-picker'], 'registered in lib/modalLayer.js');
  assert.equal(modalNeedsAnchor('decor-picker'), true, 'it opens BESIDE the slot that asked for it');
  assert.match(MODAL, /anchor=\{anchor\}/);
  assert.match(MODAL, /\n      dim\n/, 'a backdrop, by name');
  // Rule 15: the shell is what makes it draggable, and it is the shell's.
  assert.doesNotMatch(MODAL, /createPortal|position: 'fixed'/);
});

test('F3 — the modal carries the ONLY scrollable region, and there is exactly one per body', () => {
  const bodies = [
    MODAL.slice(MODAL.indexOf('function DecorGrid'), MODAL.indexOf('function VeneerBody')),
    MODAL.slice(MODAL.indexOf('function VeneerBody'), MODAL.indexOf('function SprayBody')),
    MODAL.slice(MODAL.indexOf('function SprayBody')),
  ];
  for (const body of bodies) {
    assert.equal(
      (body.match(/overflow-y-auto/g) || []).length, 1,
      'one scroller per body — no scroll-in-scroll, ever',
    );
    assert.match(body, /data-only-scroller="1"/);
  }
  // The window sizes itself, so the shell's own body never becomes a second
  // scrollbar behind the first.
  assert.match(MODAL, /className="h-\[620px\] max-h-\[86vh\]"/);
  assert.match(MODAL, /flex flex-col h-full min-h-0/);
});

test('F3 — search on top, family bar under it, large tiles below', () => {
  assert.match(MODAL, /data-decor-search="1"/);
  assert.match(MODAL, /onChange=\{\(e\) => setQuery\(e\.target\.value\)\}/, 'it filters AS YOU TYPE');
  assert.match(MODAL, /data-decor-families="1"/);
  assert.match(MODAL, /data-decor-family=\{f\.id\}/);
  assert.match(MODAL, /data-decor-family="all"/);
  assert.match(MODAL, /data-decor-grid="1"/);
  assert.match(MODAL, /data-egger-tile=\{decor\.id\}/);
  assert.equal(TILE_SWATCH_PX, 96);
  assert.match(MODAL, /style=\{\{ height: TILE_SWATCH_PX \}\}/);
  assert.match(MODAL, /filterByFamily\(filterDecors\(state\.decors, \{ category: null, query \}\), family\)/);
});

test('F3 — one click chooses AND closes; there is no second way out', () => {
  // The tile calls the caller's onPick, and the caller — the tab — is what
  // closes the window, in the same handler that writes the choice.
  assert.match(MODAL, /onClick=\{\(\) => onPick\?\.\(id, decor\)\}/);
  assert.match(PANEL, /if \(picker === 'veneer'\) onVeneer\?\.\(id\); else onDecor\?\.\(id\);\s*\n\s*setOpen\(null\);/);
  assert.match(PANEL, /onColour=\{\(c\) => \{ onColour\?\.\(c\); setOpen\(null\); \}\}/);
});

test('F3 — SPRAY is still a list and still draws zero tiles', () => {
  const spray = MODAL.slice(MODAL.indexOf('function SprayBody'));
  assert.match(spray, /data-spray-list="1"/);
  assert.match(spray, /data-spray-option=/);
  assert.doesNotMatch(spray, /<img/, 'no picture');
  assert.doesNotMatch(spray, /data-egger-tile/, 'no tile');
  assert.doesNotMatch(spray, /grid /, 'no swatch grid at all');
});

test('F3 — VENEER is a list too (no tile assets exist), with the borrowed credit', () => {
  const ven = MODAL.slice(MODAL.indexOf('function VeneerBody'), MODAL.indexOf('function SprayBody'));
  assert.match(ven, /data-veneer-list="1"/);
  assert.match(ven, /data-veneer-option=\{v\.id\}/);
  assert.doesNotMatch(ven, /<img/);
  assert.match(ven, /veneerLabel\(v\)/, 'the EGGER credit the scan is borrowed under');
});

test('F3 — the EGGER licence travels with every picture, in both surfaces', () => {
  const gridTile = MODAL.slice(MODAL.indexOf('data-egger-tile'), MODAL.indexOf('</button>', MODAL.indexOf('data-egger-tile')));
  assert.match(gridTile, /EGGER/, 'attribution inside the same control as the image');
  assert.match(gridTile, /object-cover/, 'the whole scan reduced — never a crop');
  assert.match(MODAL, /DECOR_DISCLAIMER/);
  // …and in the chosen tile, which is the picture the tab and the summary show.
  const chosen = TILE.slice(TILE.indexOf('tile.thumb ?'), TILE.indexOf('data-change-decor'));
  assert.match(chosen, /object-cover/);
  assert.match(chosen, /data-tile-source="1"/);
  assert.match(TILE, /tile\.attribution \|\|/, 'a borrowed scan shows the credit it was borrowed under');
});
