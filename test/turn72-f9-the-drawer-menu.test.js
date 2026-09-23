// ─── TURN 72 · F9 — THE DRAWER MENU, AND THE ACCESSORIES DRAWER ──────────
//
// The owner, 22.09.2026, on his screenshot:
//
//   *"top drawers insert nie powinien tak wyglądać: powinien być ADD
//   ACCESSORIES DRAWER i powinno wziąć nas do menu i podświetlić Add
//   accessories drawer, i po 2kliku powinno się otworzyć menu, które już jest,
//   ale w nim powinien być przycisk GLASS ON TOP (zmniejsz moc światła o
//   połowę, powinno tylko tam świecić), powinien mieć wysokość szuflady
//   zaproponowaną, ten co jest default; FRONTS OR BARE BOXES usuń; WHAT THE
//   BOXES CARRY też usuń; usuń Veneer, dodaj materiałowe dno zamiast Veneer:
//   ciemnozielone, czerwone, brązowe, czarne, tylko te 4 kolory filcu."*

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { rectCorners } from '../src/engine/room.js';
import { DEFAULT_CABINET_PROFILE as P } from '../src/engine/profile.js';
import {
  WATCH_FELT_COLOURS, WATCH_FINISHES, watchFeltOf, watchFinishOf,
} from '../src/engine/watchDrawer.js';
import { useProjectStore } from '../src/stores/projectStore.js';
import { useUiStore } from '../src/stores/uiStore.js';
import * as A from '../src/retail/design/adapter.js';

const ROOT = new URL('../', import.meta.url).pathname;
const read = (rel) => readFileSync(`${ROOT}${rel}`, 'utf8');
const uncomment = (t) => t.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
const S = () => useProjectStore.getState();
const U = () => useUiStore.getState();

function aWardrobeWithDrawers(n = 3) {
  S().newProject();
  S().setRoom({ corners: rectCorners(4000, 3000), height: 2500 });
  const { id } = S().addUnit('WARDROBE', { params: { width: 1200, height: 2200, depth: 600 } });
  S().addDrawers(id, n);
  U().clearSelection();
  return id;
}

const itemsOf = (unitId) => S().units.find((u) => u.id === unitId)?.params?.sections?.[0]?.items || [];
const trayOf = (unitId) => itemsOf(unitId)
  .find((i) => i?.watch_insert === true || String(i?.variant || '') === 'watch') || null;

// ═══ 1 · THE DRAWERS MENU LOSES FOUR SECTIONS ═════════════════════════════

test('F9 · the four sections are gone from the client\'s drawer menu', () => {
  const dock = uncomment(read('src/retail/design/detail/ReHomed.jsx'));
  for (const gone of ['drawers-insert', 'drawers-glass', 'drawers-mount', 'drawers-variant',
    'drawers-stack-law']) {
    assert.ok(!dock.includes(gone), `${gone} is still on the client's screen`);
  }
  // …and each removal is ARGUED where it happened.
  const withComments = read('src/retail/design/detail/ReHomed.jsx');
  assert.match(withComments, /T72 F9 · ONE BUTTON WHERE FOUR SECTIONS STOOD/);
  assert.match(withComments, /T72 F9 · LICENSED REMOVALS: THE SPECIFICATION/);
});

test('F9 · …and HOW MANY stays, with the front heights and the inner-box line', () => {
  const dock = uncomment(read('src/retail/design/detail/ReHomed.jsx'));
  for (const kept of ['drawers-count', 'drawers-front-height', 'dock-inner-heights', 'dock-drawer-list']) {
    assert.ok(dock.includes(kept), `${kept} was taken with them`);
  }
});

test('F9 · PRO keeps every row — nothing was cut from the copy or from the store', () => {
  // The chips were RETAIL's own rows in retail's own file. PRO's docked editor
  // and the copied list are untouched, and the store path is what it was.
  const copy = read('src/retail/design/detail/AddItems.jsx');
  assert.equal(copy.split('\n').length, read('src/components/AddItems.jsx').split('\n').length);
  for (const was of ['data-drawer-mount="overlay"', "['belt_tie_glass', 'Belt/tie + glass'"]) {
    assert.ok(copy.includes(was), `the copy lost ${was}`);
  }
  assert.match(read('src/stores/projectStore.js'), /addDrawers: \(/);
});

// ═══ 2 · ONE BUTTON: ADD ACCESSORIES DRAWER ═══════════════════════════════

test('F9 · the button is there, and it presses the INSIDE row\'s own call', () => {
  const dock = read('src/retail/design/detail/ReHomed.jsx');
  assert.match(dock, /data-testid="drawers-add-accessories"/);
  assert.match(dock, />\s*ADD ACCESSORIES DRAWER\s*</);
  // NOT ONE NEW PATH: the adapter finds the row by id and presses ITS add.
  const adapter = read('src/retail/design/adapter.js');
  assert.match(adapter, /const row = INTERIOR_ROWS\.find\(\(r\) => r\.id === 'watch'\);/);
  assert.match(adapter, /row\.add\(S\(\), unitId\);/);
  assert.ok(!/addWatchDrawer/.test(adapter.slice(adapter.indexOf('export function addAccessoriesDrawer'),
    adapter.indexOf('export function accessoriesNote'))), 'the adapter reached past the table');
});

test('F9 · it ADDS the drawer', () => {
  const unitId = aWardrobeWithDrawers();
  assert.equal(trayOf(unitId), null, 'the fixture already has one');
  const res = A.addAccessoriesDrawer(unitId);
  assert.equal(res.ok, true, `the add refused: ${res.said}`);
  assert.ok(trayOf(unitId), 'no accessories drawer was made');
});

test('F9 · …and it LIGHTS the row, through the shared store\'s own flag', () => {
  const unitId = aWardrobeWithDrawers();
  U().setAddItemKind(null);
  A.addAccessoriesDrawer(unitId);
  assert.equal(U().addItemKind, 'watch_drawer', 'the row is not lit');
  // It is the flag PRO's own copied list highlights a row by — one law.
  assert.match(read('src/retail/design/detail/AddItems.jsx'),
    /addItemKind === kind\.id \? 'pbi-re-fill-soft pbi-re-gold' : 'pbi-re-ink-1'/);
  assert.match(read('src/retail/design/detail/AddItems.jsx'), /data-add-kind=\{kind\.id\}/);
});

test('F9 · a wardrobe that already has one is TAKEN to it, not given a second', () => {
  const unitId = aWardrobeWithDrawers();
  A.addAccessoriesDrawer(unitId);
  const first = trayOf(unitId).id;
  const again = A.addAccessoriesDrawer(unitId);
  assert.equal(again.already, true, 'the second press did not say it was already there');
  assert.equal(trayOf(unitId).id, first, 'a second accessories drawer was made');
  assert.equal(U().addItemKind, 'watch_drawer', 'the row is not lit for the client sent to it');
  assert.match(A.accessoriesNote(unitId), /already has one/);
  assert.equal(A.accessoriesNote(aWardrobeWithDrawers()), '', 'a note nobody needs');
});

test('F9 · the STEP is the room\'s, and the room walks to INSIDE', () => {
  const room = read('src/retail/design/DesignRoom.jsx');
  assert.match(room, /onAddAccessories=\{\(id\) => \{/);
  assert.match(room, /A\.addAccessoriesDrawer\(id\)/);
  assert.match(room, /setActive\('inside'\)/);
  // …handed down through the dock, which is the only door between them.
  assert.match(read('src/retail/design/Detail.jsx'), /onAddAccessories=\{props\.onAddAccessories\}/);
  assert.match(read('src/retail/design/detail/ReHomed.jsx'), /onAddAccessories\?\.\(unitId\)/);
});

// ═══ 3 · THE ACCESSORIES DRAWER'S OWN WINDOW ══════════════════════════════

test('F9 · GLASS ON TOP is Off | On, and it writes `setWatchShelfGlass`', () => {
  for (const rel of [
    'src/components/WatchLayoutModal.jsx',
    'src/retail/design/detail/WatchLayoutModal.jsx',
  ]) {
    const w = read(rel);
    assert.match(w, /data-watch-glass-chip=\{id\}/, `${rel} has no chips`);
    assert.match(w, /\[\['off', 'Off', false\], \['on', 'On', true\]\]/, `${rel} offers more than two`);
    assert.match(w, /setWatchShelfGlass\(unit\.id, item\.id, on\)/, `${rel} invented a store path`);
    // F8d's refusal survives, on the ON chip — OFF is always available.
    assert.match(w, /disabled=\{!shelf && on\}/, `${rel} lost the refusal`);
    assert.match(w, /Needs a shelf directly above/);
  }
});

test('F9 · the glass really switches, and the engine cuts the pane', () => {
  const unitId = aWardrobeWithDrawers(3);
  S().addShelves(unitId, 2);
  A.addAccessoriesDrawer(unitId);
  const tray = trayOf(unitId);
  S().setWatchShelfGlass(unitId, tray.id, true);
  const built = (S().unitResult(unitId)?.assemblies?.watchInserts || [])[0];
  assert.ok(built, 'no insert was built');
  if (!built.shelf_glass) return;             // no shelf above — F8d's refusal
  assert.ok(built.shelf_glass.glass_w_mm > 0, 'the pane has no size');
});

test('F9 · with the glass on, that drawer\'s lamp runs at HALF the spec\'s power', () => {
  // ONE NUMBER, and the ENGINE owns it: the strip the glass births carries
  // `power: 0.5` and NO other strip in the app carries a `power` at all.
  const cab = read('src/engine/cabinet.js');
  const at = cab.indexOf(':watch-glass`');
  assert.ok(at > 0, 'the glass no longer births its own strip');
  const block = cab.slice(at, cab.indexOf('watchGlassPanes.push', at));
  assert.match(block, /power: 0\.5,/, 'the strip does not carry the halving');
  assert.equal((cab.match(/^\s*power: 0\.5,$/gm) || []).length, 1, 'a second strip was given a power');
  // …and the 3-D multiplies by it, AFTER T67 F10's standing cap.
  const led = read('src/3d/LedStrips.jsx');
  assert.match(led, /\* \(Number\(s\.power\) > 0 \? Number\(s\.power\) : 1\);/);
  assert.match(led, /const ACCESSORY_LED_MAX_GAIN = 0\.25;/, 'T67\'s cap was taken away');
  assert.match(led, /Math\.min\(\s*\n?\s*ACCESSORY_LED_MAX_GAIN,/);
});

test('F9 · …and it lights that drawer alone — the strip IS the aperture', () => {
  const unitId = aWardrobeWithDrawers(3);
  S().addShelves(unitId, 2);
  A.addAccessoriesDrawer(unitId);
  const tray = trayOf(unitId);
  S().setWatchShelfGlass(unitId, tray.id, true);
  const pane = (S().unitResult(unitId)?.assemblies?.watchGlass || [])[0];
  if (!pane) return;                          // no shelf above — F8d's refusal
  // The strip's run is the APERTURE's, not the cabinet's — it starts and ends
  // inside the pane — and it is hung UNDER the shelf, firing down through it
  // (T58b). So what it lights is that drawer and the watches in it.
  const unit = S().units.find((u) => u.id === unitId);
  assert.ok(pane.strip.box.w <= unit.params.width, 'the strip is wider than the cabinet');
  assert.ok(pane.strip.box.x >= pane.box.x - 1
    && pane.strip.box.x + pane.strip.box.w <= pane.box.x + pane.box.w + 1,
  'the strip runs outside the aperture it is meant to light');
  assert.ok(pane.strip.box.y <= pane.box.y, 'the strip is not under the shelf');
  assert.equal(pane.strip.power, 0.5);
});

test('F9 · DRAWER HEIGHT is a field plus one "Proposed NNN" chip', () => {
  for (const rel of [
    'src/components/WatchLayoutModal.jsx',
    'src/retail/design/detail/WatchLayoutModal.jsx',
  ]) {
    const w = read(rel);
    assert.match(w, /data-watch-height="1"/, `${rel} has no field`);
    assert.match(w, /data-watch-height-proposed=\{proposed\}/, `${rel} has no chip`);
    assert.match(w, /Proposed \{proposed\}/, `${rel}'s chip does not carry the number`);
    // ONE STORE PATH, and it is PRO's own — the clamp travels with it.
    assert.equal((w.match(/setDrawerHeight\(unit\.id, item\.id,/g) || []).length, 2,
      `${rel}: the chip and the field must press one setter`);
    // The PROPOSAL is the drawer's own current height, never a second number.
    assert.match(w, /Number\(item\.height_mm\) > 0/);
  }
});

test('F9 · the proposal IS the drawer\'s height, and typing over it writes', () => {
  const unitId = aWardrobeWithDrawers();
  A.addAccessoriesDrawer(unitId);
  const tray = trayOf(unitId);
  const before = Number(itemsOf(unitId).find((i) => i.id === tray.id)?.height_mm) || 0;
  assert.ok(before > 0, 'the drawer has no height of its own');
  S().setDrawerHeight(unitId, tray.id, before + 40);
  const after = Number(itemsOf(unitId).find((i) => i.id === tray.id)?.height_mm) || 0;
  assert.equal(after, before + 40, 'the typed height did not reach the item');
  // …and the engine's own clamp still has the last word.
  S().setDrawerHeight(unitId, tray.id, 9000);
  const clamped = Number(itemsOf(unitId).find((i) => i.id === tray.id)?.height_mm) || 0;
  assert.equal(clamped, P.wardrobe.drawers.maxFrontHeight, 'the clamp was bypassed');
});

// ═══ 4 · FELT, IN FOUR COLOURS ════════════════════════════════════════════

test('F9 · FINISH is Project | Sprayed | Felt base — and Veneer never existed', () => {
  assert.deepEqual(WATCH_FINISHES.map((f) => f.id), ['spray', 'felt']);
  assert.deepEqual(A.watchFinishes().map((f) => f.id), ['project', 'spray', 'felt']);
  assert.deepEqual(A.watchFinishes().map((f) => f.label), ['PROJECT', 'SPRAYED', 'FELT BASE']);
  // The CODE carries no veneer; the owner's own sentence naming it is prose,
  // and this repository records what was asked for beside what was done.
  const engine = read('src/engine/watchDrawer.js')
    .replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
  assert.ok(!/[Vv]eneer/.test(engine), 'Veneer is in the engine');
  const window = read('src/components/WatchLayoutModal.jsx')
    .replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
  assert.ok(!/[Vv]eneer/.test(window), 'Veneer is in the window');
});

test('F9 · FOUR colours and no fifth, and the store refuses anything else', () => {
  assert.deepEqual(WATCH_FELT_COLOURS.map((c) => c.id), ['dark-green', 'red', 'brown', 'black']);
  // AMENDED BY T74 F2 · *"red raczej zrób kolor wine red, nie krzykliwa
  // czerwień."*  The id stays `red`; the label is the owner's wine.
  assert.deepEqual(WATCH_FELT_COLOURS.map((c) => c.label), ['Dark green', 'Wine red', 'Brown', 'Black']);
  for (const c of WATCH_FELT_COLOURS) assert.match(c.hex, /^#[0-9a-f]{6}$/i, `${c.id} has no hex`);

  const unitId = aWardrobeWithDrawers();
  A.addAccessoriesDrawer(unitId);
  const tray = trayOf(unitId);
  S().setWatchFinish(unitId, tray.id, 'felt');
  assert.equal(S().setWatchFelt(unitId, tray.id, 'red'), 'red');
  assert.equal(S().setWatchFelt(unitId, tray.id, 'tartan'), null, 'a colour nobody buys was stored');
});

test('F9 · a colour on a tray that is NOT felted buys nothing', () => {
  assert.equal(watchFeltOf({ watch_finish: 'felt' }), 'dark-green', 'the first is the default');
  assert.equal(watchFeltOf({ watch_finish: 'felt', watch_felt: 'black' }), 'black');
  assert.equal(watchFeltOf({ watch_finish: 'spray', watch_felt: 'black' }), null);
  assert.equal(watchFeltOf({ watch_felt: 'black' }), null, 'the project decor carries no felt');
  assert.equal(watchFinishOf({ watch_finish: 'felt' }), 'felt');
});

test('F9 · THE BOM NAMES THE FELT', () => {
  const unitId = aWardrobeWithDrawers();
  A.addAccessoriesDrawer(unitId);
  const tray = trayOf(unitId);
  S().setWatchFinish(unitId, tray.id, 'felt');
  S().setWatchFelt(unitId, tray.id, 'brown');
  const line = (S().unitResult(unitId)?.hardware || []).find((h) => h.role === 'watch_insert');
  assert.ok(line, 'the insert has no BOM line');
  assert.equal(line.spec.felt, 'brown', 'the line does not carry the colour');
  assert.match(line.spec_label, /Brown felt base/, 'a joiner cannot read which roll to cut');

  // …and a sprayed tray names none.
  S().setWatchFinish(unitId, tray.id, 'spray');
  const sprayed = (S().unitResult(unitId)?.hardware || []).find((h) => h.role === 'watch_insert');
  assert.equal(sprayed.spec.felt, undefined, 'a sprayed tray bought a roll of felt');
  assert.ok(!/felt base/i.test(sprayed.spec_label));
});

test('F9 · the colour row shows only with FELT BASE chosen', () => {
  for (const rel of [
    'src/components/WatchLayoutModal.jsx',
    'src/retail/design/detail/WatchLayoutModal.jsx',
  ]) {
    const w = read(rel);
    assert.match(w, /\{finish === 'felt' \? \(/, `${rel} draws the colours over a sprayed tray`);
    assert.match(w, /data-watch-felt=\{c\.id\}/);
    assert.match(w, /data-watch-felt-swatch=\{c\.id\}/);
    assert.match(w, /setWatchFelt\(unit\.id, item\.id, c\.id\)/, `${rel} invented a store path`);
  }
});

test('F9 · PRO and the copy are the same window, to the line', () => {
  const pro = read('src/components/WatchLayoutModal.jsx');
  const copy = read('src/retail/design/detail/WatchLayoutModal.jsx');
  assert.equal(pro.split('\n').length, copy.split('\n').length,
    'the copy is not line-for-line PRO\'s — run scripts/t72-copy.mjs');
  assert.match(read('scripts/t72-copy.mjs'), /src\/components\/WatchLayoutModal\.jsx/);
});
