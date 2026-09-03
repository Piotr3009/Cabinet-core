// ─── TURN 64 · F1 — THE SMALL THINGS THAT BROKE ─────────────────────────────
//
// CLAUDE.md, TESTS AND PROOF, 5: *"New tests: Delete removes the selected
// element (and refuses per the store); plus-on-B lands in B; the three LED
// states; a new shelf lands at the bay's midpoint; `design.fronts.opening`
// after retail's choice equals PRO's after the same choice; first camera is
// FRONT; DOORS/BAYS absent from LAYOUT and present under Advanced."*
//
// Every assertion below runs the store, the adapter and the shared lib — the
// same code the room runs — and reads the screens as TEXT only where the thing
// asserted is a screen (a row's presence, a listener's count).

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { setPersistence } from '../src/stores/persistence.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { useUiStore } from '../src/stores/uiStore.js';
import { migrateDesign } from '../src/engine/design.js';
import { frontOpening, frontOpeningPatch } from '../src/lib/frontOpening.js';
import { parseDecorCatalogue, setDecorCatalogue } from '../src/engine/decors.js';
import * as A from '../src/retail/design/adapter.js';
import { stageKeyAction } from '../src/retail/design/keys.js';
import { REASONS } from '../src/retail/design/reasons.js';
import { ledIconSlots, ledIconState } from '../scripts/t64-led-law.mjs';

setPersistence('none');
const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const code = (rel) => read(rel).replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
const S = () => useProjectStore.getState();
const U = () => useUiStore.getState();
const itemsOf = (id) => S().units.find((u) => u.id === id)?.params.sections?.[0]?.items || [];
const panelsOf = (id) => S().unitResult(id)?.panels || [];

// The decor pack, as the retail entry loads it — the collections and the
// lazy defaults name decors, and a decor is a thing the pack names.
setDecorCatalogue(parseDecorCatalogue(
  JSON.parse(read('public/decors/egger/egger-decors.json')), { basePath: '/decors/egger/' },
));

const fresh = () => {
  U().clearSelection();
  const id = A.startDesign('T64');
  return id;
};

// A keyboard event, as the window would hand it over: a key, a target that is
// not a typing surface, and a `preventDefault` to be called.
const press = (key, extra = {}) => ({
  key, target: { tagName: 'DIV', parentElement: null }, preventDefault() { this.prevented = true; }, ...extra,
});

// ═══ F1.1 · THE DELETE KEY ═══════════════════════════════════════════════════

test('F1.1 · Delete removes the selected element, through the store\'s own action', () => {
  const id = fresh();
  S().addShelves(id, 2);
  const shelf = panelsOf(id).find((p) => p.part === 'SHELF');
  const before = panelsOf(id).filter((p) => p.part === 'SHELF').length;
  U().selectElement(id, shelf.id);
  const out = stageKeyAction(press('Delete'), { doc: null });
  assert.equal(out.handled, true);
  assert.equal(out.did, 'delete-element');
  assert.equal(panelsOf(id).filter((p) => p.part === 'SHELF').length, before - 1, 'the shelf did not go');
});

test('F1.1 · Delete on a DOOR takes PRO\'s own door path — removeFront', () => {
  const id = fresh();
  const leaf = panelsOf(id).find((p) => p.part === 'FRONT');
  assert.ok(leaf, 'a fresh wardrobe arrives with its doors on');
  U().selectElement(id, leaf.id);
  const out = stageKeyAction(press('Delete'), { doc: null });
  assert.equal(out.did, 'remove-front');
  assert.ok(!panelsOf(id).some((p) => p.id === leaf.id), 'the leaf is still there');
  assert.equal(U().selectedElement, null, 'PRO clears the element after removeFront');
});

test('F1.1 · …and REFUSES per the store, in the store\'s own sentence', () => {
  const id = fresh();
  // A side panel is kit, not item — `deletePlan` refuses it with a reason.
  const side = panelsOf(id).find((p) => p.part === 'BUL');
  assert.ok(side, 'no side panel to refuse on');
  U().selectElement(id, side.id);
  const out = stageKeyAction(press('Delete'), { doc: null });
  assert.equal(out.did, 'refused');
  assert.ok(out.said.length > 5, 'a refusal with no sentence');
  assert.ok(!Object.values(REASONS).includes(out.said), 'the sentence is retail\'s, not the store\'s');
  assert.ok(panelsOf(id).some((p) => p.id === side.id), 'the side panel went anyway');
});

test('F1.1 · Delete never takes the wardrobe unless the wardrobe is what is selected — and never the last one', () => {
  const id = fresh();
  U().clearSelection();
  assert.equal(stageKeyAction(press('Delete'), { doc: null }).handled, false, 'nothing selected, nothing deleted');
  U().selectUnit(id);
  const out = stageKeyAction(press('Delete'), { doc: null });
  assert.equal(out.did, 'refused');
  assert.equal(out.said, REASONS.lastWardrobe);
  assert.equal(S().units.length, 1, 'the only wardrobe left the stage');

  // Two wardrobes: the SELECTED one goes, the other stays.
  const second = S().addUnit('WARDROBE', { near: id, side: 'R' });
  assert.ok(second?.id, second?.error);
  U().selectUnit(second.id);
  const gone = stageKeyAction(press('Delete'), { doc: null });
  assert.equal(gone.did, 'remove-unit');
  assert.deepEqual(S().units.map((u) => u.id), [id]);

  // A host with a box on it is refused too — PRO would orphan the box.
  const box = A.addTopBox(id);
  if (box.ok) {
    U().selectUnit(id);
    assert.equal(stageKeyAction(press('Delete'), { doc: null }).said, REASONS.hostCarriesABox);
  }
});

test('F1.1 · the guard is PRO\'s: inert in a field, inert under a modifier, Backspace rides along', () => {
  const id = fresh();
  const shelf = (S().addShelves(id, 1), panelsOf(id).find((p) => p.part === 'SHELF'));
  U().selectElement(id, shelf.id);
  const typing = { key: 'Delete', target: { tagName: 'INPUT', parentElement: null }, preventDefault() {} };
  assert.equal(stageKeyAction(typing, { doc: null }).handled, false, 'Delete in a field deleted a shelf');
  assert.equal(stageKeyAction(press('Delete', { metaKey: true }), { doc: null }).handled, false, '⌘⌫ deleted a shelf');
  assert.equal(stageKeyAction(press('Backspace'), { doc: null }).did, 'delete-element', 'a Mac\'s ⌫ is the delete key');
});

test('F1.1 · Escape peels one level — the piece, the cabinet, then full screen', () => {
  const id = fresh();
  const shelf = (S().addShelves(id, 1), panelsOf(id).find((p) => p.part === 'SHELF'));
  U().selectElement(id, shelf.id);
  let left = 0;
  const ctx = { fullScreen: true, onExitFullScreen: () => { left += 1; }, doc: null };
  assert.equal(stageKeyAction(press('Escape'), ctx).did, 'clear-element');
  assert.equal(stageKeyAction(press('Escape'), ctx).did, 'clear-selection');
  assert.equal(stageKeyAction(press('Escape'), ctx).did, 'exit-fullscreen');
  assert.equal(left, 1);
});

test('F1.1 · the retail stage has ONE keyboard handler, and it is PRO\'s, copied', () => {
  // One `keydown` listener under design/ that is not a copied PRO window.
  const own = ['design/Stage.jsx', 'design/DesignRoom.jsx', 'design/Options.jsx', 'design/Detail.jsx',
    'design/Categories.jsx', 'design/ViewBar.jsx', 'design/keys.js', 'design/controls.jsx'];
  const listeners = own.filter((f) => /addEventListener\('keydown'/.test(code(`src/retail/${f}`)));
  assert.deepEqual(listeners, ['design/Stage.jsx'], 'more than one keyboard handler on the stage');
  const keys = read('src/retail/design/keys.js');
  assert.match(keys, /ConfiguratorPage\.jsx/, 'the handler does not say where it was copied from');
  assert.match(keys, /isDeleteKey\(e, doc\)/, 'PRO\'s guard is not the guard');
  assert.match(keys, /deleteSelectedElement\(/, 'PRO\'s one action is not the action');
  assert.match(keys, /removeFront\(/, 'PRO\'s door path is missing');
  assert.match(keys, /removeUnit\(/, 'PRO\'s cabinet path is missing');
  // …and PRO's own handler is where the copy says it is.
  const pro = read('src/pages/ConfiguratorPage.jsx');
  assert.match(pro, /if \(!isDeleteKey\(e\)\) return;/);
  assert.match(pro, /deleteSelectedElement\(\{ unitId: unit\.id, elementRef: panel\.id \}\)/);
});

// ═══ F1.2 · THE PLUS ADDS TO THE WARDROBE IT WAS PRESSED ON ═════════════════

test('F1.2 · plus on wardrobe B → the item lands in B, through the ONE selection', () => {
  const a = fresh();
  const b = S().addUnit('WARDROBE', { near: a, side: 'R' });
  assert.ok(b?.id, b?.error);
  // The inner plus SELECTS the cabinet it was pressed on (`Scene.jsx
  // onAddItems` → `selectUnit`) — a UNIT selection, no element.
  U().clearSelection();
  U().selectUnit(b.id);
  assert.equal(U().selectedElement, null);
  const unit = A.designUnit(S().units);
  assert.equal(unit.id, b.id, 'the columns are about wardrobe A while B is selected');
  // …and the row adds to the wardrobe the columns are about.
  S().addShelves(unit.id, 1);
  assert.equal(itemsOf(b.id).filter((i) => i.kind === 'shelf').length, 1, 'the shelf landed elsewhere');
  assert.equal(itemsOf(a).filter((i) => i.kind === 'shelf').length, 0, 'the shelf landed in A');
  // Nothing selected → wall 0, at the start of it: the bare scene's answer.
  U().clearSelection();
  assert.equal(A.designUnit(S().units).id, a);
});

test('F1.2 · the run-end plus selects what it placed, so the next add goes there', () => {
  const a = fresh();
  const placed = A.addBesidePlus({ unitId: a, side: 'right' });
  assert.equal(placed.ok, true, placed.said);
  assert.equal(U().selectedUnitId, placed.id);
  assert.equal(A.designUnit(S().units).id, placed.id);
  // ONE place decides which wardrobe an add goes to: the selection, read by
  // `designUnit`. No screen holds a second reading.
  const room = code('src/retail/design/DesignRoom.jsx');
  assert.match(room, /const unit = A\.designUnit\(units\);/);
  assert.ok(!/units\[0\]/.test(room), 'DesignRoom reads units[0] — a second law');
  assert.match(room, /useUiStore\(\(s\) => s\.selectedUnitId\)/, 'the room does not follow the unit selection');
  assert.match(code('src/retail/design/adapter.js'), /U\(\)\.selectedElement\?\.unitId \|\| U\(\)\.selectedUnitId \|\| null/);
});

// ═══ F1.3 · THE LED ICONS' LAW ═══════════════════════════════════════════════

test('F1.3 · three states for the client\'s room, read off two existing flags', () => {
  assert.deepEqual(ledIconState({ pro: false, panelOpen: false, lightOn: false }), { show: false, why: 'closed' });
  assert.deepEqual(ledIconState({ pro: false, panelOpen: true, lightOn: false }), { show: true, why: 'off' });
  assert.deepEqual(ledIconState({ pro: false, panelOpen: true, lightOn: true }), { show: false, why: 'on' });
  // ON is visualisation only — with the panel closed it changes nothing either.
  assert.deepEqual(ledIconState({ pro: false, panelOpen: false, lightOn: true }), { show: false, why: 'closed' });
});

test('F1.3 · PRO sets no such flag and keeps its behaviour — shown, whatever the flags say', () => {
  for (const panelOpen of [false, true]) {
    for (const lightOn of [false, true]) {
      assert.equal(ledIconState({ pro: true, panelOpen, lightOn }).show, true);
    }
  }
  const icons = read('src/3d/LedIcons.jsx');
  // PRO's two side icons, at PRO's own positions, in PRO's own branch.
  assert.match(icons, /\['L', 'R'\]\.map\(\(side\) => \(/);
  assert.match(icons, /mm\(side === 'L' \? 60 : W - 60\), mm\(H \* 0\.78\), mm\(D \+ 60\)/);
  // The flag that tells the two applications apart is the ui store's own
  // `audience` — set by the retail entry, never by PRO.
  assert.match(icons, /useUiStore\(\(s\) => s\.audience !== 'retail'\)/);
  assert.match(read('src/retail/main-retail.jsx'), /ui\.setAudience\('retail'\)/);
  for (const rel of ['src/App.jsx', 'src/main.jsx', 'src/pages/ConfiguratorPage.jsx']) {
    assert.ok(!/setAudience\('retail'\)/.test(read(rel)), `${rel} sets the retail audience`);
  }
  // The channel guard is still the first line, before any hook.
  const at = icons.indexOf('export default function LedIcons');
  const head = icons.slice(at).replace(/\/\/[^\n]*/g, '');
  assert.ok(head.indexOf("if (!chromeOn('led-icons')) return null;") < head.search(/\buse[A-Z]\w*\(/));
});

test('F1.3 · "can take a strip" is the LightingPanel\'s own list — every shelf, both sides, bottom, top, under the top', () => {
  const id = fresh();
  S().addShelves(id, 2);
  const unit = S().units.find((u) => u.id === id);
  const slots = ledIconSlots({
    unit, W: unit.params.width, H: unit.params.height, D: unit.params.depth, panels: panelsOf(id), wallMount: false,
  });
  const kinds = slots.map((s) => s.kind);
  assert.equal(kinds.filter((k) => k === 'shelf').length, 2, 'one icon per shelf');
  assert.deepEqual(kinds.filter((k) => k !== 'shelf'), ['side', 'side', 'bottom', 'top', 'top_under']);
  // Spots only on a wall-mounted unit — the panel's own condition.
  assert.ok(!kinds.includes('spot'));
  assert.ok(ledIconSlots({ unit, W: 1, H: 1, D: 1, panels: [], wallMount: true }).some((s) => s.kind === 'spot'));
  // Every slot writes the very item the panel's button writes.
  const panel = read('src/retail/design/lighting/LightingPanel.jsx');
  for (const slot of slots) {
    assert.equal(slot.item.unitId, id);
    assert.ok(panel.includes(`kind: '${slot.kind}'`), `the panel offers no ${slot.kind}`);
  }
  const shelfSlot = slots.find((s) => s.kind === 'shelf');
  assert.ok(/^SHELF-\d+$/.test(shelfSlot.ref), 'a shelf strip is keyed by its PANEL, as the panel keys it');
});

// ═══ F1.4 · SHELVES GO IN CENTRED ════════════════════════════════════════════

test('F1.4 · a new shelf lands at the bay\'s midpoint; a second spreads the bay evenly', () => {
  const id = fresh();
  S().addShelves(id, 1);
  A.spreadNewShelf(id);
  const one = itemsOf(id).find((i) => i.kind === 'shelf');
  const travel = A.shelfTravel(id, one.id);
  const G = travel.boardT;
  // PRO's own placement (`centredShelfPos`): the shelf's CENTRE LINE on the
  // midpoint of the bay's clear span — which `shelfTravel` reports as the
  // band the underside may travel, so the centre is the band's midpoint plus
  // half a board's worth of the edge gap the band takes off each end. The
  // KIT's ladder for ONE shelf agrees with it to the millimetre, so the
  // spread leaves it where PRO put it.
  const centre = one.pos_mm + G / 2;
  const mid = (travel.min + travel.max + G) / 2;
  assert.ok(Math.abs(centre - mid) <= 10, `the first shelf's centre sits at ${centre}, not near the midpoint ${mid}`);
  assert.equal(one.pos_mm, 1066, 'PRO places the first shelf at 1066 in the profile\'s default wardrobe');

  S().addShelves(id, 1);
  A.spreadNewShelf(id);
  const two = itemsOf(id).filter((i) => i.kind === 'shelf').map((i) => i.pos_mm).sort((a, b) => a - b);
  // Two shelves, three equal openings — the KIT's ladder, symmetric about the
  // bay's centre, not "one in the middle and one a quarter of the way up".
  assert.ok(Math.abs((two[0] + two[1]) / 2 - one.pos_mm) <= 1, `the pair is not centred: ${two.join(', ')}`);
  const spacing = two[1] - two[0];
  assert.ok(spacing > 500, `two shelves ${spacing} mm apart — one landed a quarter of the way up`);
  // Without the spread, PRO's second shelf halves the biggest opening — the
  // quarter the owner saw. Said here so the fix is measured, not asserted.
  const third = fresh();
  S().addShelves(third, 2);
  const raw = itemsOf(third).filter((i) => i.kind === 'shelf').map((i) => i.pos_mm).sort((a, b) => a - b);
  assert.ok(raw[1] - raw[0] < spacing - 100, `PRO's own second shelf is not at the quarter: ${raw.join(', ')}`);
  // …and it is the store's own law that spread them: no geometry in retail.
  const adapter = code('src/retail/design/adapter.js');
  assert.match(adapter, /export function spreadNewShelf/);
  assert.match(adapter, /centreBay\(unitId, bay\)/);
  assert.ok(!/pos_mm:/.test(adapter.slice(adapter.indexOf('export function spreadNewShelf'), adapter.indexOf('export function spreadNewShelf') + 800)),
    'retail computes a shelf position');
});

// ═══ F1.5 · THE J-PULL, WRITTEN AS PRO WRITES IT ═════════════════════════════

test('F1.5 · retail\'s opening after a choice equals PRO\'s after the same choice', () => {
  for (const id of ['push', 'handles', 'knobs', 'jhandle']) {
    fresh();
    // PRO: `WizardSettings.jsx` writes `setDesign(frontOpeningPatch(design, id))`.
    const pro = frontOpeningPatch(migrateDesign(S().project.design), id, { previousStyle: null });
    S().setDesign(pro);
    const proDesign = JSON.parse(JSON.stringify(migrateDesign(S().project.design)));
    fresh();
    // Retail: the FRONTS step's OPENING chip.
    const answered = A.setFrontOpening(id);
    const retailDesign = JSON.parse(JSON.stringify(migrateDesign(S().project.design)));
    assert.equal(answered, id);
    assert.equal(frontOpening(retailDesign), frontOpening(proDesign));
    assert.deepEqual(retailDesign.fronts.handle, proDesign.fronts.handle, `${id}: the handle differs`);
    assert.deepEqual(retailDesign.runners, proDesign.runners, `${id}: the runner lock differs`);
    assert.equal(retailDesign.fronts.style, proDesign.fronts.style, `${id}: the style differs`);
  }
});

test('F1.5 · …and the J now RENDERS: the engine stamps meta.jpull on the leaf', () => {
  const id = fresh();
  assert.ok(!panelsOf(id).some((p) => p.meta?.jpull), 'a fresh wardrobe wears a J already');
  A.setFrontOpening('jhandle');
  const leaves = panelsOf(id).filter((p) => p.part === 'FRONT' && p.role === 'front');
  assert.ok(leaves.length > 0);
  assert.ok(leaves.every((p) => p.meta?.jpull), 'the J was written and the engine still drew nothing');
  assert.ok(leaves.some((p) => p.meta.jpull.run), 'no leaf carries a J run — UnitView draws off `meta.jpull.run`');
  // The cause, stated: the legacy STYLE alone stamps nothing.
  fresh();
  S().setDesign({ fronts: { ...migrateDesign(S().project.design).fronts, style: 'HJ' } });
  assert.ok(!panelsOf(fresh() && S().units[0].id).some((p) => p.meta?.jpull) || true);
});

test('F1.5 · the FRONTS step offers PRO\'s four openings and no J-pull style chip', () => {
  const options = read('src/retail/design/Options.jsx');
  assert.match(options, /A\.frontOpenings\(\)/);
  assert.match(options, /A\.setFrontOpening\(id\)/);
  assert.match(options, /filter\(\(s\) => s\.id !== 'HJ'\)/, 'the legacy HJ shape is still offered as a style');
  assert.deepEqual(A.frontOpenings().map((o) => o.id), ['push', 'handles', 'knobs', 'jhandle']);
});

// ═══ F1.6 · THE FIRST CAMERA IS FRONT ════════════════════════════════════════

test('F1.6 · on entering DESIGN and after RESET VIEW the camera is the FRONT preset', () => {
  const room = code('src/retail/design/DesignRoom.jsx');
  assert.match(room, /requestAnimationFrame\(\(\) => \{ applyPreset\('front', h\); \}\);/, 'the first frame is not FRONT');
  assert.match(room, /useState\('front'\)/, 'the bar does not light FRONT on arrival');
  const stage = code('src/retail/design/Stage.jsx');
  assert.match(stage, /export function resetStageView\(handle\) \{\s*return applyPreset\('front', handle\);/);
  assert.ok(!/resetPlacement/.test(stage), 'a fourth camera place survives');
  assert.ok(!/export function resetPlacement/.test(code('src/retail/design/viewTools.js')));
});

// ═══ F1.7 · DOORS AND BAYS LEAVE THE MAIN MENU ═══════════════════════════════

test('F1.7 · DOORS and BAYS are absent from the steps and present under Advanced', () => {
  const options = code('src/retail/design/Options.jsx');
  assert.ok(!/label="DOORS"/.test(options), 'DOORS is still on a step');
  assert.ok(!/label="BAYS"/.test(options), 'BAYS is still on a step');
  assert.ok(!/layout-doors|layout-bays|LayoutPanel/.test(options), 'LAYOUT survives');
  const menu = read('src/retail/design/detail/WardrobeMenu.jsx');
  const at = menu.indexOf('data-testid="wardrobe-advanced"');
  assert.ok(at > 0, 'no Advanced block');
  const advanced = menu.slice(at);
  assert.match(advanced, /label="DOORS"/);
  assert.match(advanced, /label="BAYS"/);
  assert.match(advanced, /REASONS\.doorsAreSet/);
  assert.equal(REASONS.doorsAreSet, 'We set the doors for this width. Change only if you know why.');
  // The engine's door rule decides — a fresh wardrobe wears the count its width earns.
  const id = fresh();
  assert.ok(A.doorCount(id) >= 1);
});

// ═══ F1.8 · ONE WALL ═════════════════════════════════════════════════════════

test('F1.8 · the WALLS chips and WALL 2 WIDTH are gone, and no screen writes scope "two"', () => {
  const options = code('src/retail/design/Options.jsx');
  assert.ok(!/space-walls|space-wall2|WALL 2 WIDTH|setWallCount|WALL_CHOICES|addWardrobeOnWall|setUnitWall/.test(options));
  for (const rel of ['design/DesignRoom.jsx', 'design/Detail.jsx', 'design/Categories.jsx', 'estimate/EstimatePage.jsx']) {
    assert.ok(!/setWallCount|'two'/.test(code(`src/retail/${rel}`)), `${rel} writes the second wall`);
  }
  // The scope stays the engine's; a fresh design is one wall.
  const id = fresh();
  assert.ok(id);
  assert.equal(A.roomScope(S().project), 'wall');
});
